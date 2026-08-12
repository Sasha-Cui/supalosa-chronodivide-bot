#!/usr/bin/env python3
"""Audit the gated method-v3 Stage-2 open-training lifecycle evidence.

This analysis is descriptive and outcome-open.  It validates every immutable
run-finalizer and technical-gate hash before reading the corresponding policy
events.  It never reads fresh-development or sealed-test artifacts.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from collections import Counter, defaultdict
from pathlib import Path
from statistics import median
from typing import Any, Iterable


FINALIZER_STATUS = "FINALIZED_METHOD_V3_STAGE2_OPEN_TRAINING_RUN_NOT_A_PAPER_CLAIM"
CROSS_RUN_STATUS = "FROZEN_METHOD_V3_DEVELOPMENT_FINALISTS_FROM_OPEN_TRAINING"
EXPECTED_RUNS = tuple(range(5))
EXPECTED_GAMES_PER_RUN = 1_188
EXPECTED_POLICIES_PER_RUN = 3
EXPECTED_GAMES_PER_POLICY_RUN = 396
SIDE_BY_COUNTRY = {
    "Americans": "Allied",
    "Alliance": "Allied",
    "French": "Allied",
    "Germans": "Allied",
    "British": "Allied",
    "Africans": "Soviet",
    "Arabs": "Soviet",
    "Confederation": "Soviet",
    "Russians": "Soviet",
}
REQUIRED_RESULT_FIELDS = (
    "episodeId",
    "familyId",
    "policyId",
    "candidateCountry",
    "candidateSlot",
    "winner",
    "finished",
    "ticks",
    "maxTicks",
    "candidateDefeated",
    "baselineDefeated",
    "candidate",
    "baseline",
)


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def canonical_sha256(value: Any) -> str:
    rendered = json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=True)
    return hashlib.sha256(rendered.encode()).hexdigest()


def load_object(path: Path) -> dict[str, Any]:
    value = json.loads(path.read_text())
    if not isinstance(value, dict):
        raise ValueError(f"expected JSON object: {path}")
    return value


def outcome(result: dict[str, Any]) -> str:
    return {"candidate": "win", "draw": "draw", "baseline": "loss"}[result["winner"]]


def counter_dict(values: Iterable[Any]) -> dict[str, int]:
    return {str(key): count for key, count in sorted(Counter(values).items(), key=lambda row: str(row[0]))}


def quantiles(values: Iterable[int]) -> dict[str, int] | None:
    ordered = sorted(values)
    if not ordered:
        return None

    def at(probability: float) -> int:
        return ordered[round(probability * (len(ordered) - 1))]

    return {
        "minimum": ordered[0],
        "p25": at(0.25),
        "median": int(median(ordered)),
        "p75": at(0.75),
        "maximum": ordered[-1],
    }


def validate_result(result: dict[str, Any], path: Path) -> None:
    missing = [field for field in REQUIRED_RESULT_FIELDS if field not in result]
    if missing:
        raise ValueError(f"completion missing {missing}: {path}")
    if result["winner"] not in {"candidate", "draw", "baseline"}:
        raise ValueError(f"invalid winner: {path}:{result.get('episodeId')}")
    for side in ("candidate", "baseline"):
        state = result[side]
        if not isinstance(state, dict) or not isinstance(state.get("buildings"), int):
            raise ValueError(f"invalid {side} terminal state: {path}:{result['episodeId']}")
        if state["buildings"] < 0 or not isinstance(state.get("combatants"), int):
            raise ValueError(f"invalid {side} counts: {path}:{result['episodeId']}")
    winner = result["winner"]
    if winner == "candidate" and not (
        result["finished"]
        and result["baselineDefeated"]
        and not result["candidateDefeated"]
        and result["baseline"]["buildings"] == 0
    ):
        raise ValueError(f"candidate-win invariant violation: {path}:{result['episodeId']}")
    if winner == "baseline" and not (
        result["finished"]
        and result["candidateDefeated"]
        and not result["baselineDefeated"]
        and result["candidate"]["buildings"] == 0
    ):
        raise ValueError(f"baseline-win invariant violation: {path}:{result['episodeId']}")
    if winner == "draw" and (
        result["finished"] or result["ticks"] != result["maxTicks"]
    ):
        raise ValueError(f"draw is not an unfinished tick-cap endpoint: {path}:{result['episodeId']}")


def validate_finalizer(
    finalizer_path: Path,
    expected_sha256: str,
) -> tuple[dict[str, Any], dict[str, Any], Path]:
    if sha256_file(finalizer_path) != expected_sha256:
        raise ValueError(f"run-finalizer hash mismatch: {finalizer_path}")
    finalizer = load_object(finalizer_path)
    if (
        finalizer.get("schemaVersion") != 1
        or finalizer.get("status") != FINALIZER_STATUS
        or finalizer.get("schedulerAccount") != "pi_jss233"
        or finalizer.get("launchedGameCount") != EXPECTED_GAMES_PER_RUN
        or finalizer.get("completedGameCount") != EXPECTED_GAMES_PER_RUN
        or finalizer.get("technicalFailureCount") != 0
        or len(finalizer.get("finalists", [])) != EXPECTED_POLICIES_PER_RUN
        or len(finalizer.get("finalistResults", [])) != EXPECTED_GAMES_PER_RUN
    ):
        raise ValueError(f"malformed or incomplete run-finalizer: {finalizer_path}")
    gate_path = Path(finalizer["technicalGatePath"]).resolve()
    if sha256_file(gate_path) != finalizer["technicalGateSha256"]:
        raise ValueError(f"technical-gate hash mismatch: {gate_path}")
    gate = load_object(gate_path)
    if (
        gate.get("schedulerAccount") != "pi_jss233"
        or str(gate.get("arrayJobId")) != str(finalizer["arrayJobId"])
        or gate.get("completedLaunches") != EXPECTED_GAMES_PER_RUN
        or gate.get("technicalFailures") != 0
        or gate.get("actualWinInvariantViolations") != 0
        or gate.get("resultsRoot") != finalizer["sourceResultsRoot"]
    ):
        raise ValueError(f"technical gate does not bind the finalizer: {gate_path}")
    scheduler = gate.get("schedulerAccounting")
    if not isinstance(scheduler, list) or not scheduler:
        raise ValueError(f"missing scheduler accounting: {gate_path}")
    if any(
        row.get("account") != "pi_jss233"
        or row.get("state") != "COMPLETED"
        or row.get("exitCode") != "0:0"
        for row in scheduler
    ):
        raise ValueError(f"non-clean scheduler task: {gate_path}")
    return finalizer, gate, Path(finalizer["sourceResultsRoot"]).resolve()


def load_run_events(
    results_root: Path,
    policy_ids: set[str],
) -> tuple[dict[str, dict[str, Any]], list[dict[str, Any]], list[dict[str, Any]]]:
    completions: dict[str, dict[str, Any]] = {}
    events: list[dict[str, Any]] = []
    evidence_files: list[dict[str, Any]] = []
    paths = sorted(results_root.glob("*/run/events.jsonl"))
    if not paths:
        raise ValueError(f"no event shards: {results_root}")
    for path in paths:
        evidence_files.append({
            "path": str(path),
            "sha256": sha256_file(path),
            "bytes": path.stat().st_size,
        })
        for line_number, line in enumerate(path.read_text().splitlines(), start=1):
            value = json.loads(line)
            event = value.get("event")
            if event == "candidate_policy_event" and value.get("policyId") in policy_ids:
                policy_event = value.get("policyEvent")
                if not isinstance(policy_event, dict) or not isinstance(policy_event.get("event"), str):
                    raise ValueError(f"malformed policy event: {path}:{line_number}")
                events.append({
                    "episodeId": value["episodeId"],
                    "policyId": value["policyId"],
                    "policyEvent": policy_event,
                })
            elif event == "episode_complete":
                result = value.get("result")
                if not isinstance(result, dict):
                    raise ValueError(f"malformed completion: {path}:{line_number}")
                validate_result(result, path)
                episode_id = result["episodeId"]
                if episode_id in completions:
                    raise ValueError(f"duplicate episode: {episode_id}")
                completions[episode_id] = result
    if len(completions) != EXPECTED_GAMES_PER_RUN:
        raise ValueError(f"expected 1,188 run completions, found {len(completions)}: {results_root}")
    return completions, events, evidence_files


def summarize_stratum(rows: list[dict[str, Any]]) -> dict[str, Any]:
    counts = Counter(outcome(row["result"]) for row in rows)
    games = len(rows)
    return {
        "games": games,
        "wins": counts["win"],
        "draws": counts["draw"],
        "losses": counts["loss"],
        "winProbability": counts["win"] / games if games else None,
        "drawProbability": counts["draw"] / games if games else None,
        "winMinusLossProbability": (counts["win"] - counts["loss"]) / games if games else None,
    }


def summarize_policy(rows: list[dict[str, Any]]) -> dict[str, Any]:
    rows = sorted(rows, key=lambda row: (row["runIndex"], row["result"]["episodeId"]))
    event_types = sorted({
        event["event"]
        for row in rows
        for event in row["events"]
    })
    overall = summarize_stratum(rows)
    by_outcome: dict[str, Any] = {}
    for label in ("win", "draw", "loss"):
        selected = [row for row in rows if outcome(row["result"]) == label]
        activated = [row for row in selected if any(event["event"] == "activated" for event in row["events"])]
        by_outcome[label] = {
            "games": len(selected),
            "buildingEliminationActivatedGames": len(activated),
            "buildingEliminationNeverActivatedGames": len(selected) - len(activated),
            "tickSummary": quantiles(row["result"]["ticks"] for row in selected),
            "candidateTerminalBuildings": counter_dict(row["result"]["candidate"]["buildings"] for row in selected),
            "supalosaTerminalBuildings": counter_dict(row["result"]["baseline"]["buildings"] for row in selected),
            "episodePolicyEventIncidence": {
                event_type: sum(
                    any(event["event"] == event_type for event in row["events"])
                    for row in selected
                )
                for event_type in event_types
            },
        }
    draws = [row for row in rows if outcome(row["result"]) == "draw"]
    losses = [row for row in rows if outcome(row["result"]) == "loss"]
    block_reasons = Counter(
        (outcome(row["result"]), event.get("reason", "missing"))
        for row in rows
        for event in row["events"]
        if event["event"] == "activation_blocked"
    )
    return {
        **overall,
        "runIndices": sorted({row["runIndex"] for row in rows}),
        "byOutcomeLifecycle": by_outcome,
        "lossesBeforeBuildingElimination": sum(
            not any(event["event"] == "activated" for event in row["events"])
            for row in losses
        ),
        "drawEndpoint": {
            "candidateZeroBuildings": sum(row["result"]["candidate"]["buildings"] == 0 for row in draws),
            "supalosaZeroBuildings": sum(row["result"]["baseline"]["buildings"] == 0 for row in draws),
            "mutualZeroBuildings": sum(
                row["result"]["candidate"]["buildings"] == 0
                and row["result"]["baseline"]["buildings"] == 0
                for row in draws
            ),
            "bothSidesRetainBuildings": sum(
                row["result"]["candidate"]["buildings"] > 0
                and row["result"]["baseline"]["buildings"] > 0
                for row in draws
            ),
            "supalosaAtMostTwoBuildings": sum(row["result"]["baseline"]["buildings"] <= 2 for row in draws),
            "supalosaAtMostFiveBuildings": sum(row["result"]["baseline"]["buildings"] <= 5 for row in draws),
            "candidateCombatantLead": sum(
                row["result"]["candidate"]["combatants"] > row["result"]["baseline"]["combatants"]
                for row in draws
            ),
        },
        "activationBlockedEventCounts": {
            f"{label}:{reason}": count
            for (label, reason), count in sorted(block_reasons.items())
        },
        "byCountry": {
            country: summarize_stratum([row for row in rows if row["result"]["candidateCountry"] == country])
            for country in SIDE_BY_COUNTRY
        },
        "bySide": {
            side: summarize_stratum([
                row for row in rows if SIDE_BY_COUNTRY[row["result"]["candidateCountry"]] == side
            ])
            for side in ("Allied", "Soviet")
        },
        "byCandidateSlot": {
            str(slot): summarize_stratum([row for row in rows if row["result"]["candidateSlot"] == slot])
            for slot in (0, 1)
        },
        "byFamily": {
            family: summarize_stratum([row for row in rows if row["result"]["familyId"] == family])
            for family in sorted({row["result"]["familyId"] for row in rows})
        },
    }


def analyze(cross_run_path: Path) -> dict[str, Any]:
    cross_run = load_object(cross_run_path)
    if (
        cross_run.get("schemaVersion") != 1
        or cross_run.get("status") != CROSS_RUN_STATUS
        or cross_run.get("outcomeAccess") != "open-training-only-no-paper-claim"
        or len(cross_run.get("sourceRunFinalizers", [])) != len(EXPECTED_RUNS)
    ):
        raise ValueError(f"invalid cross-run finalizer: {cross_run_path}")
    selected_ids = [row["policyId"] for row in cross_run["developmentFinalists"]]
    if len(selected_ids) != 5 or len(set(selected_ids)) != 5:
        raise ValueError("cross-run artifact must identify five unique development finalists")
    expected_ranking = {
        row["policyId"]: row
        for row in cross_run["aggregateRanking"]
        if row["policyId"] in set(selected_ids)
    }
    if set(expected_ranking) != set(selected_ids):
        raise ValueError("selected finalists are missing aggregate-ranking rows")

    all_rows: dict[str, list[dict[str, Any]]] = defaultdict(list)
    run_records: list[dict[str, Any]] = []
    evidence_files: list[dict[str, Any]] = []
    seen_runs: set[int] = set()
    for source in sorted(cross_run["sourceRunFinalizers"], key=lambda row: row["optimizerRunIndex"]):
        run_index = source["optimizerRunIndex"]
        if run_index in seen_runs:
            raise ValueError(f"duplicate optimizer run {run_index}")
        seen_runs.add(run_index)
        finalizer_path = Path(source["sourcePath"]).resolve()
        finalizer, gate, results_root = validate_finalizer(finalizer_path, source["sourceSha256"])
        if finalizer["optimizerRunIndex"] != run_index or gate["optimizerRunIndex"] != run_index:
            raise ValueError(f"optimizer-run mismatch: {finalizer_path}")
        finalist_ids = {row["policyId"] for row in finalizer["finalists"]}
        completions, events, run_files = load_run_events(results_root, finalist_ids)
        events_by_episode: dict[str, list[dict[str, Any]]] = defaultdict(list)
        for event in events:
            if event["episodeId"] not in completions:
                raise ValueError(f"policy event lacks completion: {event['episodeId']}")
            if completions[event["episodeId"]]["policyId"] != event["policyId"]:
                raise ValueError(f"policy-event identity mismatch: {event['episodeId']}")
            events_by_episode[event["episodeId"]].append(event["policyEvent"])
        finalist_completions = [row for row in completions.values() if row["policyId"] in finalist_ids]
        if len(finalist_completions) != EXPECTED_GAMES_PER_RUN:
            raise ValueError(f"run does not contain exactly 1,188 finalist completions: {results_root}")
        for policy_id in finalist_ids:
            policy_results = [row for row in finalist_completions if row["policyId"] == policy_id]
            if len(policy_results) != EXPECTED_GAMES_PER_POLICY_RUN:
                raise ValueError(f"policy {policy_id} does not have 396 complete games in run {run_index}")
            if policy_id in selected_ids:
                for result in policy_results:
                    all_rows[policy_id].append({
                        "runIndex": run_index,
                        "result": result,
                        "events": events_by_episode.get(result["episodeId"], []),
                    })
        evidence_files.extend(run_files)
        run_records.append({
            "optimizerRunIndex": run_index,
            "arrayJobId": str(finalizer["arrayJobId"]),
            "runFinalizerPath": str(finalizer_path),
            "runFinalizerSha256": source["sourceSha256"],
            "technicalGatePath": str(Path(finalizer["technicalGatePath"]).resolve()),
            "technicalGateSha256": finalizer["technicalGateSha256"],
            "resultsRoot": str(results_root),
            "resultArtifactCommitmentSha256": gate["resultArtifactCommitmentSha256"],
            "schedulerTaskCount": len(gate["schedulerAccounting"]),
            "schedulerJobIds": [str(row["schedulerJobId"]) for row in gate["schedulerAccounting"]],
        })
    if seen_runs != set(EXPECTED_RUNS):
        raise ValueError(f"expected optimizer runs 0..4, got {sorted(seen_runs)}")

    policy_summaries = {policy_id: summarize_policy(all_rows[policy_id]) for policy_id in selected_ids}
    for policy_id, summary in policy_summaries.items():
        ranking = expected_ranking[policy_id]
        if (
            summary["games"] != ranking["gameCount"]
            or summary["wins"] != ranking["wins"]
            or summary["draws"] != ranking["draws"]
            or summary["losses"] != ranking["losses"]
        ):
            raise ValueError(f"raw lifecycle counts do not reproduce aggregate ranking: {policy_id}")
    best_policy_id = min(
        selected_ids,
        key=lambda policy_id: next(
            row["rank"] for row in cross_run["aggregateRanking"] if row["policyId"] == policy_id
        ),
    )
    best = policy_summaries[best_policy_id]
    evidence_files = sorted(evidence_files, key=lambda row: row["path"])
    return {
        "schemaVersion": 1,
        "status": "DESCRIPTIVE_METHOD_V3_STAGE2_OPEN_TRAINING_FAILURE_AUDIT_NOT_A_PAPER_CLAIM",
        "generatedAt": None,
        "outcomeAccess": "open-training-only",
        "freshDevelopmentAccessed": False,
        "sealedTestAccessed": False,
        "sourceCrossRunFinalizer": {
            "path": str(cross_run_path.resolve()),
            "sha256": sha256_file(cross_run_path),
        },
        "sourceRuns": run_records,
        "evidenceFileCount": len(evidence_files),
        "evidenceFileManifestSha256": canonical_sha256(evidence_files),
        "selectedPolicyIds": selected_ids,
        "bestOpenTrainingPolicyId": best_policy_id,
        "bestOpenTrainingPolicySummary": best,
        "selectedPolicySummaries": policy_summaries,
        "actionableDiagnosis": {
            "bestPolicyLossesBeforeBuildingElimination": best["lossesBeforeBuildingElimination"],
            "bestPolicyTotalLosses": best["losses"],
            "bestPolicyDrawsRetainingSupalosaBuildings": (
                best["draws"] - best["drawEndpoint"]["supalosaZeroBuildings"]
            ),
            "bestPolicyTotalDraws": best["draws"],
            "bestPolicyDrawsWithMutualZeroBuildings": best["drawEndpoint"]["mutualZeroBuildings"],
            "requiredProspectiveMechanisms": [
                "improve pre-closeout survival and combat strength for both factions",
                "retain at least one candidate building during literal enemy-building elimination",
                "sweep unobserved map sectors when no valid building target is available",
                "reassign stalled or incompatible closeout attackers and maintain required production",
            ],
        },
        "claimBoundary": (
            "This opened training audit may motivate a new prospective training-only revision; "
            "it cannot establish generalization, confirm reliable superiority, or support a paper result."
        ),
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--cross-run-finalizer", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if args.output.exists():
        raise FileExistsError(f"refusing to overwrite {args.output}")
    output = analyze(args.cross_run_finalizer.resolve())
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(output, indent=2) + "\n")
    print(json.dumps({
        "output": str(args.output.resolve()),
        "sha256": sha256_file(args.output),
        "bestOpenTrainingPolicyId": output["bestOpenTrainingPolicyId"],
        "diagnosis": output["actionableDiagnosis"],
    }))


if __name__ == "__main__":
    main()
