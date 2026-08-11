#!/usr/bin/env python3
"""Validate frozen campaigns and describe their terminal game states.

This is a post-outcome, descriptive analysis. It operates only on completed
``episode_complete`` records and cannot recover within-game trajectories or
establish a causal mechanism from terminal snapshots.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any, Iterable


OUTCOMES = ("candidate", "draw", "baseline")
TERMINAL_METRICS = (
    "credits",
    "units",
    "buildings",
    "combatants",
    "harvesters",
    "factories",
    "refineries",
    "conyards",
)
PAIR_KEY_FIELDS = (
    "familyId",
    "seedBlockIndex",
    "requestedEngineSeed",
    "candidateSlot",
)
EPISODE_IDENTITY_FIELDS = (
    "episodeId",
    "familyId",
    "methodId",
    "policyId",
    "seedBlockIndex",
    "requestedEngineSeed",
    "candidateSlot",
)
EQUIVALENCE_FIELDS = (
    "mapName",
    "mapSha256",
    "requestedEngineSeed",
    "botRandomSeed",
    "candidateBotRandomSeed",
    "baselineBotRandomSeed",
    "engineSeedEpochMs",
    "candidateSlot",
    "candidateStart",
    "baselineStart",
    "maxTicks",
    "ticks",
    "finished",
    "winner",
    "candidateScore",
    "candidateDefeated",
    "baselineDefeated",
    "candidate",
    "baseline",
)


def canonical_sha256(value: Any) -> str:
    rendered = json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=True)
    return hashlib.sha256(rendered.encode("utf-8")).hexdigest()


def mean(values: Iterable[float]) -> float | None:
    rows = list(values)
    return sum(rows) / len(rows) if rows else None


def pair_key(row: dict[str, Any]) -> tuple[Any, ...]:
    return tuple(row[field] for field in PAIR_KEY_FIELDS)


def score(row: dict[str, Any]) -> float:
    expected = {"candidate": 1.0, "draw": 0.5, "baseline": 0.0}[row["winner"]]
    observed = float(row["candidateScore"])
    if observed != expected:
        raise ValueError(
            f"candidateScore {observed} disagrees with winner {row['winner']}"
        )
    return observed


def validate_endpoint(row: dict[str, Any]) -> None:
    missing = [field for field in EPISODE_IDENTITY_FIELDS if field not in row]
    if missing:
        raise ValueError(f"completion is missing identity fields: {missing}")
    if row.get("winner") not in OUTCOMES:
        raise ValueError(f"invalid winner for {row.get('episodeId')}: {row.get('winner')}")
    score(row)
    finished = bool(row.get("finished"))
    if not finished and (
        row["winner"] != "draw" or int(row.get("ticks", -1)) != int(row.get("maxTicks", -2))
    ):
        raise ValueError(
            f"unfinished completion is not a tick-cap draw: {row.get('episodeId')}"
        )
    for side in ("candidate", "baseline"):
        state = row.get(side)
        if not isinstance(state, dict):
            raise ValueError(f"missing {side} terminal state: {row.get('episodeId')}")
        missing_metrics = [metric for metric in TERMINAL_METRICS if metric not in state]
        if missing_metrics:
            raise ValueError(
                f"{side} terminal state is missing {missing_metrics}: {row.get('episodeId')}"
            )


def load_json(path: Path) -> dict[str, Any]:
    value = json.loads(path.read_text())
    if not isinstance(value, dict):
        raise ValueError(f"expected a JSON object: {path}")
    return value


def load_campaign(
    root: Path,
    *,
    expected_purpose: str,
    expected_source_commit: str,
    expected_games: int,
) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    if not root.is_dir():
        raise FileNotFoundError(root)
    shard_dirs = sorted(path for path in root.iterdir() if path.is_dir())
    if not shard_dirs:
        raise ValueError(f"campaign has no result shards: {root}")

    all_results: list[dict[str, Any]] = []
    shard_records: list[dict[str, Any]] = []
    purposes: set[str] = set()
    source_commits: set[str] = set()
    plan_hashes: set[str] = set()

    for shard in shard_dirs:
        manifest_path = shard / "manifest.json"
        summary_path = shard / "summary.json"
        events_path = shard / "events.jsonl"
        for required in (manifest_path, summary_path, events_path):
            if not required.is_file():
                raise ValueError(f"missing campaign evidence file: {required}")

        manifest = load_json(manifest_path)
        summary = load_json(summary_path)
        plan = manifest.get("plan")
        if not isinstance(plan, dict) or not isinstance(plan.get("episodes"), list):
            raise ValueError(f"invalid plan in {manifest_path}")
        purposes.add(str(plan.get("purpose")))
        source_commits.add(str(plan.get("sourceGitCommit")))
        plan_hash = str(manifest.get("planBytesSha256"))
        plan_hashes.add(plan_hash)
        if summary.get("planBytesSha256") != plan_hash:
            raise ValueError(f"summary/manifest plan hash mismatch: {shard}")
        if not summary.get("complete") or not summary.get("technicallyClean"):
            raise ValueError(f"campaign shard is not complete and technically clean: {shard}")
        requested = int(summary.get("requestedLaunches", -1))
        if any(
            int(summary.get(field, -2)) != requested
            for field in ("accountedLaunches", "completed")
        ) or int(summary.get("technicalFailures", -1)) != 0:
            raise ValueError(f"inconsistent launch accounting: {shard}")
        if requested != len(plan["episodes"]):
            raise ValueError(f"plan/summary episode-count mismatch: {shard}")

        events = [json.loads(line) for line in events_path.read_text().splitlines() if line]
        launch_counted = [event for event in events if event.get("event") == "launch_counted"]
        completions = [
            event.get("result")
            for event in events
            if event.get("event") == "episode_complete"
        ]
        if len(launch_counted) != requested or len(completions) != requested:
            raise ValueError(f"event accounting mismatch: {shard}")
        if any(not isinstance(row, dict) for row in completions):
            raise ValueError(f"malformed completion record: {shard}")

        planned_by_id = {episode.get("episodeId"): episode for episode in plan["episodes"]}
        if len(planned_by_id) != requested:
            raise ValueError(f"duplicate planned episode ID: {shard}")
        seen_episode_ids: set[str] = set()
        for completion in completions:
            assert isinstance(completion, dict)
            validate_endpoint(completion)
            episode_id = str(completion["episodeId"])
            if episode_id in seen_episode_ids or episode_id not in planned_by_id:
                raise ValueError(f"unexpected or duplicate completion {episode_id}: {shard}")
            seen_episode_ids.add(episode_id)
            planned = planned_by_id[episode_id]
            for field in EPISODE_IDENTITY_FIELDS:
                if completion[field] != planned[field]:
                    raise ValueError(
                        f"plan/completion mismatch for {episode_id} field {field}: {shard}"
                    )
            all_results.append(completion)

        shard_records.append(
            {
                "runId": plan.get("runId"),
                "planBytesSha256": plan_hash,
                "requestedLaunches": requested,
                "completedLaunches": len(completions),
            }
        )

    if purposes != {expected_purpose}:
        raise ValueError(f"unexpected campaign purpose(s): {sorted(purposes)}")
    if source_commits != {expected_source_commit}:
        raise ValueError(f"unexpected source commit(s): {sorted(source_commits)}")
    if len(plan_hashes) != len(shard_dirs):
        raise ValueError("planBytesSha256 is not unique across shards")
    if len(all_results) != expected_games:
        raise ValueError(f"expected {expected_games} games, found {len(all_results)}")

    identities = [tuple(row[field] for field in EPISODE_IDENTITY_FIELDS) for row in all_results]
    if len(set(identities)) != len(identities):
        raise ValueError("duplicate completion identity across shards")

    sorted_results = sorted(
        all_results,
        key=lambda row: (
            str(row["familyId"]),
            int(row["seedBlockIndex"]),
            int(row["requestedEngineSeed"]),
            str(row["methodId"]),
            int(row["candidateSlot"]),
        ),
    )
    integrity = {
        "purpose": expected_purpose,
        "sourceGitCommit": expected_source_commit,
        "shards": len(shard_dirs),
        "games": len(sorted_results),
        "families": len({row["familyId"] for row in sorted_results}),
        "methods": sorted({row["methodId"] for row in sorted_results}),
        "allShardsCompleteAndTechnicallyClean": True,
        "rawCompletionCommitmentSha256": canonical_sha256(sorted_results),
        "shardPlansCommitmentSha256": canonical_sha256(shard_records),
    }
    return sorted_results, integrity


def terminal_summary(rows: list[dict[str, Any]]) -> dict[str, Any]:
    return {
        "candidateMean": {
            metric: mean(float(row["candidate"][metric]) for row in rows)
            for metric in TERMINAL_METRICS
        },
        "baselineMean": {
            metric: mean(float(row["baseline"][metric]) for row in rows)
            for metric in TERMINAL_METRICS
        },
        "candidateMinusBaselineMean": {
            metric: mean(
                float(row["candidate"][metric]) - float(row["baseline"][metric])
                for row in rows
            )
            for metric in TERMINAL_METRICS
        },
    }


def method_summary(rows: list[dict[str, Any]]) -> dict[str, Any]:
    outcomes = Counter(str(row["winner"]) for row in rows)
    finished = sum(bool(row["finished"]) for row in rows)
    tick_cap_draws = sum(not bool(row["finished"]) for row in rows)
    return {
        "games": len(rows),
        "wins": outcomes["candidate"],
        "draws": outcomes["draw"],
        "losses": outcomes["baseline"],
        "score": mean(score(row) for row in rows),
        "finishedGames": finished,
        "tickCapDraws": tick_cap_draws,
        "meanTicks": mean(float(row["ticks"]) for row in rows),
        "terminal": terminal_summary(rows),
        "byOutcome": {
            outcome: {
                "games": len(bucket),
                "finishedGames": sum(bool(row["finished"]) for row in bucket),
                "meanTicks": mean(float(row["ticks"]) for row in bucket),
                "terminal": terminal_summary(bucket),
            }
            for outcome in OUTCOMES
            if (bucket := [row for row in rows if row["winner"] == outcome])
        },
    }


def group_by_method(rows: list[dict[str, Any]]) -> dict[str, list[dict[str, Any]]]:
    grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in rows:
        grouped[str(row["methodId"])].append(row)
    return dict(sorted(grouped.items()))


def paired_comparison(
    candidate_rows: list[dict[str, Any]],
    reference_rows: list[dict[str, Any]],
    *,
    include_families: bool = True,
    include_transition_details: bool = True,
) -> dict[str, Any]:
    candidate = {pair_key(row): row for row in candidate_rows}
    reference = {pair_key(row): row for row in reference_rows}
    if len(candidate) != len(candidate_rows) or len(reference) != len(reference_rows):
        raise ValueError("duplicate method row within a common-seed pairing cell")
    if candidate.keys() != reference.keys():
        raise ValueError("method pairing cells do not match")

    transitions: dict[str, Counter[str]] = {outcome: Counter() for outcome in OUTCOMES}
    transition_keys: dict[tuple[str, str], list[tuple[Any, ...]]] = defaultdict(list)
    paired_score_differences: Counter[str] = Counter()
    for key in sorted(candidate):
        left = candidate[key]
        right = reference[key]
        transitions[str(right["winner"])][str(left["winner"])] += 1
        transition_keys[(str(right["winner"]), str(left["winner"]))].append(key)
        difference = score(left) - score(right)
        paired_score_differences[f"{difference:g}"] += 1

    left_summary = method_summary(candidate_rows)
    right_summary = method_summary(reference_rows)
    output: dict[str, Any] = {
        "pairedGames": len(candidate),
        "scoreDifference": float(left_summary["score"]) - float(right_summary["score"]),
        "winCountDifference": int(left_summary["wins"]) - int(right_summary["wins"]),
        "drawCountDifference": int(left_summary["draws"]) - int(right_summary["draws"]),
        "lossCountDifference": int(left_summary["losses"]) - int(right_summary["losses"]),
        "tickCapDrawCountDifference": int(left_summary["tickCapDraws"])
        - int(right_summary["tickCapDraws"]),
        "outcomeTransitionCounts": {
            reference_outcome: {
                candidate_outcome: transitions[reference_outcome][candidate_outcome]
                for candidate_outcome in OUTCOMES
            }
            for reference_outcome in OUTCOMES
        },
        "pairedScoreDifferenceCounts": dict(sorted(paired_score_differences.items())),
        "terminalCandidateMinusBaselineDifference": {
            metric: mean(
                (
                    float(candidate[key]["candidate"][metric])
                    - float(candidate[key]["baseline"][metric])
                )
                - (
                    float(reference[key]["candidate"][metric])
                    - float(reference[key]["baseline"][metric])
                )
                for key in candidate
            )
            for metric in TERMINAL_METRICS
        },
    }
    if include_transition_details:
        output["outcomeTransitionDetails"] = {
            f"{reference_outcome}To{candidate_outcome.capitalize()}": {
                "games": len(keys),
                "meanScoreDifference": mean(
                    score(candidate[key]) - score(reference[key]) for key in keys
                ),
                "meanTickDifference": mean(
                    float(candidate[key]["ticks"]) - float(reference[key]["ticks"])
                    for key in keys
                ),
                "terminalCandidateMinusBaselineDifference": {
                    metric: mean(
                        (
                            float(candidate[key]["candidate"][metric])
                            - float(candidate[key]["baseline"][metric])
                        )
                        - (
                            float(reference[key]["candidate"][metric])
                            - float(reference[key]["baseline"][metric])
                        )
                        for key in keys
                    )
                    for metric in TERMINAL_METRICS
                },
            }
            for reference_outcome in OUTCOMES
            for candidate_outcome in OUTCOMES
            if (keys := transition_keys.get((reference_outcome, candidate_outcome)))
        }
    if include_families:
        family_ids = sorted({str(row["familyId"]) for row in candidate_rows})
        output["byFamily"] = {
            family_id: paired_comparison(
                [row for row in candidate_rows if row["familyId"] == family_id],
                [row for row in reference_rows if row["familyId"] == family_id],
                include_families=False,
                include_transition_details=False,
            )
            for family_id in family_ids
        }
    return output


def exact_equivalence(
    left_rows: list[dict[str, Any]], right_rows: list[dict[str, Any]]
) -> dict[str, Any]:
    left = {pair_key(row): row for row in left_rows}
    right = {pair_key(row): row for row in right_rows}
    if len(left) != len(left_rows) or len(right) != len(right_rows):
        raise ValueError("duplicate row in equivalence pairing")
    if left.keys() != right.keys():
        raise ValueError("equivalence pairing cells do not match")
    mismatch_counts: Counter[str] = Counter()
    exactly_equal = 0
    for key in sorted(left):
        mismatches = [field for field in EQUIVALENCE_FIELDS if left[key].get(field) != right[key].get(field)]
        if mismatches:
            mismatch_counts.update(mismatches)
        else:
            exactly_equal += 1
    return {
        "pairedGames": len(left),
        "exactlyEquivalentGames": exactly_equal,
        "allPairedGamesExactlyEquivalent": exactly_equal == len(left),
        "comparedFields": list(EQUIVALENCE_FIELDS),
        "fieldMismatchCounts": {
            field: mismatch_counts[field]
            for field in EQUIVALENCE_FIELDS
            if mismatch_counts[field]
        },
        "interpretationBoundary": (
            "Endpoint equivalence does not prove identical within-game behavior; "
            "the preserved records contain no action or trajectory telemetry."
        ),
    }


def summarize_campaign(rows: list[dict[str, Any]]) -> dict[str, Any]:
    return {
        method_id: method_summary(method_rows)
        for method_id, method_rows in group_by_method(rows).items()
    }


def analyze(
    confirmatory_rows: list[dict[str, Any]],
    mechanism_rows: list[dict[str, Any]],
    component_rows: list[dict[str, Any]],
    integrity: dict[str, Any],
    analysis_source_commit: str,
) -> dict[str, Any]:
    confirmatory_methods = group_by_method(confirmatory_rows)
    mechanism_methods = group_by_method(mechanism_rows)
    component_methods = group_by_method(component_rows)
    required_confirmatory = {"champion", "default"}
    required_component = {
        "champion",
        "revertDefenseGrowth",
        "revertEmergencyDefense",
        "revertForceAttack",
        "revertScouting",
        "revertStrategy",
    }
    if set(confirmatory_methods) != required_confirmatory:
        raise ValueError(f"unexpected confirmatory methods: {sorted(confirmatory_methods)}")
    if set(component_methods) != required_component:
        raise ValueError(f"unexpected component methods: {sorted(component_methods)}")
    local_method_ids = sorted(method for method in mechanism_methods if method != "champion")
    if len(local_method_ids) != 5:
        raise ValueError(f"expected five local optimizer methods, found {local_method_ids}")

    mechanism_comparisons = {
        method: paired_comparison(
            mechanism_methods["champion"], mechanism_methods[method], include_families=False
        )
        for method in local_method_ids
    }
    component_key_comparisons = {
        method: paired_comparison(
            component_methods["champion"], component_methods[method], include_families=False
        )
        for method in ("revertStrategy", "revertScouting")
    }

    return {
        "schemaVersion": 1,
        "analysisType": "post-outcome descriptive terminal-state decomposition",
        "analysisSourceGitCommit": analysis_source_commit,
        "campaignIntegrity": integrity,
        "confirmatory": {
            "methods": summarize_campaign(confirmatory_rows),
            "championMinusDefaultPaired": paired_comparison(
                confirmatory_methods["champion"], confirmatory_methods["default"]
            ),
        },
        "mechanism": {
            "methods": summarize_campaign(mechanism_rows),
            "championMinusEachLocalOptimizer": mechanism_comparisons,
        },
        "component": {
            "methods": summarize_campaign(component_rows),
            "championMinusKeyReverts": component_key_comparisons,
            "championVersusRevertScoutingExactEndpointEquivalence": exact_equivalence(
                component_methods["champion"], component_methods["revertScouting"]
            ),
        },
        "interpretationBoundary": [
            "This analysis was designed after outcomes were available and is descriptive only.",
            "Terminal snapshots do not identify trajectories, actions, timing, or a causal mechanism.",
            "A tick-cap draw can contain a large terminal material advantage; the frozen endpoint still scores it as 0.5.",
            "No new game was launched and no policy, family, seed, or endpoint was selected using this analysis.",
            "The frozen confirmatory and multiplicity-controlled component conclusions remain unchanged.",
        ],
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--confirmatory-results", required=True, type=Path)
    parser.add_argument("--mechanism-results", required=True, type=Path)
    parser.add_argument("--component-results", required=True, type=Path)
    parser.add_argument("--analysis-source-commit", required=True)
    parser.add_argument("--output", type=Path)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    confirmatory, confirmatory_integrity = load_campaign(
        args.confirmatory_results,
        expected_purpose="confirmatory-evaluation",
        expected_source_commit="698dc7601b61a80e091ce7b8ac2b9e681685bc69",
        expected_games=512,
    )
    mechanism, mechanism_integrity = load_campaign(
        args.mechanism_results,
        expected_purpose="mechanism-ablation",
        expected_source_commit="29ced1d76c39acf63f73ba6951c6d537e4335a9f",
        expected_games=480,
    )
    component, component_integrity = load_campaign(
        args.component_results,
        expected_purpose="component-ablation",
        expected_source_commit="4ada6ed1d260e77df5948226631630695022266e",
        expected_games=480,
    )
    output = analyze(
        confirmatory,
        mechanism,
        component,
        {
            "confirmatory": confirmatory_integrity,
            "mechanism": mechanism_integrity,
            "component": component_integrity,
        },
        args.analysis_source_commit,
    )
    rendered = json.dumps(output, indent=2, sort_keys=True) + "\n"
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(rendered)
    else:
        print(rendered, end="")


if __name__ == "__main__":
    main()
