#!/usr/bin/env python3
"""Aggregate the four-cell audit pilot without treating it as paper evidence."""

from __future__ import annotations

import argparse
import json
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any


def summarize(results: list[dict[str, Any]]) -> dict[str, Any]:
    outcomes = Counter(row["winner"] for row in results)
    count = len(results)
    wall_ms = sum(int(row.get("wallTimeMs", 0)) for row in results)
    return {
        "games": count,
        "wins": outcomes["candidate"],
        "draws": outcomes["draw"],
        "losses": outcomes["baseline"],
        "scoreRate": (
            (outcomes["candidate"] + 0.5 * outcomes["draw"]) / count if count else None
        ),
        "unfinished": sum(not bool(row.get("finished", False)) for row in results),
        "gameWallTimeSeconds": wall_ms / 1000,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("root", type=Path)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()

    summaries = sorted(args.root.rglob("summary-*.json"))
    if not summaries:
        raise SystemExit(f"No summaries under {args.root}")

    by_condition: dict[str, list[dict[str, Any]]] = defaultdict(list)
    by_cell: dict[str, list[dict[str, Any]]] = defaultdict(list)
    runs: list[dict[str, Any]] = []
    baseline_commits: set[str] = set()
    candidate_commits: set[str] = set()
    manifest_schemas: set[int] = set()
    candidate_diff_hashes: set[str] = set()
    candidate_runtime_hashes: set[str] = set()
    baseline_runtime_hashes: set[str] = set()
    game_api_runtime_hashes: set[str] = set()
    lockfile_hashes: set[str] = set()
    map_hashes: set[str] = set()
    scheduler_accounts: set[str] = set()
    scheduler_sources: set[str] = set()
    for path in summaries:
        payload = json.loads(path.read_text())
        manifest = payload["manifest"]
        config = manifest["inputs"]["effectiveConfig"]
        profile = config["strongBotOptions"].get("defaultMapProfiles")
        exact = config["strongBotOptions"].get("exactMapTactics")
        strategy_profile = config["strongStrategyOptions"].get("defaultMapProfiles")
        if profile is True and strategy_profile is True and exact is True:
            condition = "profiled"
        elif profile is False and strategy_profile is False and exact is False:
            condition = "generic"
        else:
            condition = "mixed-invalid"
        baseline_commits.add(str(manifest["software"]["baseline"].get("gitCommit")))
        candidate_commits.add(str(manifest["source"].get("gitCommit")))
        manifest_schemas.add(int(manifest.get("schemaVersion", 0)))
        scheduler_accounts.add(str(manifest["scheduler"].get("account")))
        scheduler_sources.add(str(manifest["scheduler"].get("source")))
        candidate_diff_hashes.add(str(manifest["source"].get("trackedDiffSha256")))
        candidate_runtime_hashes.update(
            str(tree.get("sha256")) for tree in manifest["source"].get("runtimeTrees", [])
        )
        baseline_runtime_hashes.add(
            str(manifest["software"]["baseline"].get("runtimeTree", {}).get("sha256"))
        )
        game_api_runtime_hashes.add(
            str(manifest["software"].get("gameApiRuntimeTree", {}).get("sha256"))
        )
        lockfile_hashes.add(str(manifest["software"].get("packageLockSha256")))
        map_hashes.update(
            str(map_input.get("sha256")) for map_input in manifest["inputs"]["maps"]
        )
        results = payload["results"]
        by_condition[condition].extend(results)
        for row in results:
            start = row["candidateStart"]
            by_cell[f'{condition}:{start["x"]},{start["y"]}'].append(row)
        runs.append(
            {
                "runId": payload["runId"],
                "summary": str(path.resolve()),
                "condition": condition,
                "candidateStarts": config["candidateStarts"],
                "baselineStarts": config["baselineStarts"],
                "requestedMatches": payload["requestedMatches"],
                "completedMatches": len(results),
                "rejectedStartAttempts": payload["rejectedStartAttempts"],
                "scheduler": manifest["scheduler"],
                "trackedDirty": manifest["source"]["trackedDirty"],
                "baseline": manifest["software"]["baseline"],
            }
        )

    condition_summary = {
        key: summarize(rows) for key, rows in sorted(by_condition.items())
    }
    profiled_score = condition_summary.get("profiled", {}).get("scoreRate")
    generic_score = condition_summary.get("generic", {}).get("scoreRate")
    difference = (
        profiled_score - generic_score
        if isinstance(profiled_score, float) and isinstance(generic_score, float)
        else None
    )
    uniform_runtime_and_content = (
        len(candidate_diff_hashes) == 1
        and len(candidate_runtime_hashes) == 2
        and len(baseline_runtime_hashes) == 1
        and len(game_api_runtime_hashes) == 1
        and len(lockfile_hashes) == 1
        and len(map_hashes) == 1
        and len(candidate_commits) == 1
        and len(baseline_commits) == 1
    )
    scheduler_accounting_valid = (
        manifest_schemas == {3}
        and scheduler_sources == {"scontrol"}
        and len(scheduler_accounts) == 1
    )
    payload = {
        "schemaVersion": 1,
        "purpose": "infrastructure diagnostic; not paper evidence",
        "runs": runs,
        "candidateCommits": sorted(candidate_commits),
        "baselineCommits": sorted(baseline_commits),
        "provenanceConsistency": {
            "manifestSchemas": sorted(manifest_schemas),
            "candidateTrackedDiffSha256": sorted(candidate_diff_hashes),
            "candidateRuntimeTreeSha256": sorted(candidate_runtime_hashes),
            "baselineRuntimeTreeSha256": sorted(baseline_runtime_hashes),
            "gameApiRuntimeTreeSha256": sorted(game_api_runtime_hashes),
            "lockfileSha256": sorted(lockfile_hashes),
            "mapSha256": sorted(map_hashes),
            "schedulerAccounts": sorted(scheduler_accounts),
            "schedulerSources": sorted(scheduler_sources),
            "uniformRuntimeAndContent": uniform_runtime_and_content,
            "schedulerAccountingValid": scheduler_accounting_valid,
            "uniform": uniform_runtime_and_content and scheduler_accounting_valid,
        },
        "completeDesign": (
            len(summaries) == 4
            and sum(len(rows) for rows in by_condition.values()) == 32
            and set(by_condition) == {"generic", "profiled"}
            and len(by_cell) == 4
        ),
        "aggregate": summarize([row for rows in by_condition.values() for row in rows]),
        "byCondition": condition_summary,
        "byConditionAndPhysicalStart": {
            key: summarize(rows) for key, rows in sorted(by_cell.items())
        },
        "profiledMinusGenericScoreRate": difference,
        "cautions": [
            "One simple map, one country matchup, one opponent policy, and eight accepted games per cell.",
            "Pinned API 0.75.0 exposes no public seed; engine determinism and trial dependence are unresolved.",
            "The candidate is a tracked-dirty research branch; exact runtime trees and tracked diff are fingerprinted, "
            "and this schema-2 rerun has a separately registered source/runtime archive.",
            "This run validates isolation, pairing, logging, and ablation plumbing only.",
        ],
    }
    rendered = json.dumps(payload, indent=2, sort_keys=True) + "\n"
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(rendered)
    else:
        print(rendered, end="")


if __name__ == "__main__":
    main()
