#!/usr/bin/env python3
"""Audit successive-halving survivor dependence on terminal-material utility.

This is a training-only post-confirmatory diagnostic. It launches no games and
does not reconstruct counterfactual later-stage outcomes for policies that were
eliminated by the original path.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
from typing import Any


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def rank_outcome_only(ranking: list[dict[str, Any]]) -> list[dict[str, Any]]:
    def key(row: dict[str, Any]) -> tuple[float, float, str]:
        family_scores = row.get("familyScores")
        if not isinstance(family_scores, list) or not family_scores:
            raise ValueError("ranking row lacks familyScores")
        outcomes = [entry.get("outcomeScore") for entry in family_scores]
        if any(not isinstance(value, (int, float)) or not 0 <= value <= 1 for value in outcomes):
            raise ValueError("ranking row has invalid family outcome score")
        macro = row.get("macroOutcomeScore")
        policy_id = row.get("policyId")
        if not isinstance(macro, (int, float)) or not 0 <= macro <= 1:
            raise ValueError("ranking row has invalid macro outcome score")
        if not isinstance(policy_id, str) or len(policy_id) != 64:
            raise ValueError("ranking row has invalid policy ID")
        return (-float(macro), -float(min(outcomes)), policy_id)

    return sorted(ranking, key=key)


def audit_reduction(value: dict[str, Any]) -> dict[str, Any]:
    run = value.get("optimizerRunIndex")
    stage = value.get("completedStage")
    expected_selected = {0: 12, 1: 6}
    expected_ranking = {0: 32, 1: 12}
    if not isinstance(run, int) or not 0 <= run < 5 or stage not in expected_selected:
        raise ValueError("reduction run or stage is outside the frozen optimizer")
    ranking = value.get("ranking")
    selected = value.get("selectedPolicies")
    if (
        value.get("schemaVersion") != 1
        or value.get("selectedCount") != expected_selected[stage]
        or not isinstance(ranking, list)
        or len(ranking) != expected_ranking[stage]
        or not isinstance(selected, list)
        or len(selected) != expected_selected[stage]
        or value.get("technicalFailureCount") != 0
        or value.get("launchedGameCount") != value.get("completedGameCount")
    ):
        raise ValueError("reduction does not match a complete frozen stage")
    original_ids = [entry.get("policyId") for entry in selected]
    if len(set(original_ids)) != len(original_ids) or any(not isinstance(policy_id, str) for policy_id in original_ids):
        raise ValueError("original survivor identities are invalid")
    outcome_ranking = rank_outcome_only(ranking)
    outcome_ids = [row["policyId"] for row in outcome_ranking[: expected_selected[stage]]]
    overlap = set(original_ids) & set(outcome_ids)
    ranks = {row["policyId"]: index + 1 for index, row in enumerate(outcome_ranking)}
    return {
        "optimizerRunIndex": run,
        "stage": stage,
        "selectedCount": expected_selected[stage],
        "overlapCount": len(overlap),
        "changedCount": expected_selected[stage] - len(overlap),
        "originalSelectedOutcomeRankMin": min(ranks[policy_id] for policy_id in original_ids),
        "originalSelectedOutcomeRankMax": max(ranks[policy_id] for policy_id in original_ids),
        "selectionTopIsOutcomeTop": ranking[0].get("policyId") == outcome_ranking[0]["policyId"],
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--reductions-root", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    if args.output.exists():
        raise FileExistsError(f"refusing to overwrite {args.output}")
    rows: list[dict[str, Any]] = []
    inputs: list[dict[str, str]] = []
    for run in range(5):
        for stage in range(2):
            path = args.reductions_root / f"run-{run}-stage{stage}-survivors.json"
            if not path.is_file():
                raise FileNotFoundError(path)
            value = json.loads(path.read_text())
            row = audit_reduction(value)
            if row["optimizerRunIndex"] != run or row["stage"] != stage:
                raise ValueError(f"reduction identity drifted in {path}")
            rows.append(row)
            inputs.append({"file": path.name, "sha256": sha256_file(path)})
    output = {
        "schemaVersion": 1,
        "status": "COMPLETE_TRAINING_ONLY_OUTCOME_ONLY_AUDIT",
        "interpretation": (
            "Post-confirmatory diagnostic of survivor dependence on the bounded terminal-material tie term; "
            "not a counterfactual optimizer run and not confirmatory evidence."
        ),
        "rankingRule": (
            "descending macro outcome score, descending worst-family outcome score, ascending policy SHA-256"
        ),
        "inputArtifacts": inputs,
        "stages": rows,
        "summary": {
            "runCount": 5,
            "stageCount": 10,
            "totalSelectedSlots": sum(row["selectedCount"] for row in rows),
            "totalChangedSlots": sum(row["changedCount"] for row in rows),
            "stage0ChangedSlots": sum(row["changedCount"] for row in rows if row["stage"] == 0),
            "stage1ChangedSlots": sum(row["changedCount"] for row in rows if row["stage"] == 1),
            "selectionTopMatchesOutcomeTopCount": sum(row["selectionTopIsOutcomeTop"] for row in rows),
        },
        "limitation": (
            "Policies removed by the original utility were not evaluated in later stages, so later counterfactual "
            "survivors cannot be reconstructed without a new optimizer campaign."
        ),
    }
    args.output.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    args.output.write_text(json.dumps(output, indent=2) + "\n")
    args.output.chmod(0o600)
    print(json.dumps({"output": str(args.output), **output["summary"]}, sort_keys=True))


if __name__ == "__main__":
    main()
