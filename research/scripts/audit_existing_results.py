#!/usr/bin/env python3
"""Recompute W/D/L metrics from preserved Chrono Divide summary JSON files.

This intentionally does not infer scientific independence. It reports both
game-level descriptive intervals and a map-cluster bootstrap, and labels both
as retrospective diagnostics rather than confirmatory inference.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import random
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any, Iterable


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def discover(inputs: Iterable[str]) -> list[Path]:
    paths: list[Path] = []
    for raw in inputs:
        path = Path(raw)
        if path.is_dir():
            paths.extend(sorted(path.rglob("*.json")))
        elif path.is_file():
            paths.append(path)
        else:
            raise FileNotFoundError(path)
    return sorted(set(item.resolve() for item in paths))


def wilson(successes: int, total: int, z: float = 1.959963984540054) -> list[float] | None:
    if total == 0:
        return None
    p = successes / total
    denominator = 1 + z * z / total
    center = (p + z * z / (2 * total)) / denominator
    half = z * math.sqrt((p * (1 - p) + z * z / (4 * total)) / total) / denominator
    return [max(0.0, center - half), min(1.0, center + half)]


def percentile(values: list[float], probability: float) -> float:
    ordered = sorted(values)
    index = (len(ordered) - 1) * probability
    lower = math.floor(index)
    upper = math.ceil(index)
    if lower == upper:
        return ordered[lower]
    weight = index - lower
    return ordered[lower] * (1 - weight) + ordered[upper] * weight


def score(result: dict[str, Any]) -> float:
    return {"candidate": 1.0, "draw": 0.5, "baseline": 0.0}[result["winner"]]


def summarize_results(results: list[dict[str, Any]]) -> dict[str, Any]:
    outcomes = Counter(result["winner"] for result in results)
    total = len(results)
    return {
        "n": total,
        "candidateWins": outcomes["candidate"],
        "baselineWins": outcomes["baseline"],
        "draws": outcomes["draw"],
        "candidateWinRate": outcomes["candidate"] / total if total else None,
        "candidateScoreRate": sum(score(result) for result in results) / total if total else None,
        "unfinished": sum(not bool(result.get("finished", False)) for result in results),
        "naiveGameLevelWilson95ForWinIndicator": wilson(outcomes["candidate"], total),
    }


def grouped(results: list[dict[str, Any]], key) -> dict[str, Any]:
    buckets: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for result in results:
        buckets[str(key(result))].append(result)
    return {name: summarize_results(rows) for name, rows in sorted(buckets.items())}


def map_cluster_bootstrap(
    results: list[dict[str, Any]], repetitions: int, seed: int
) -> dict[str, Any] | None:
    buckets: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for result in results:
        buckets[str(result["mapName"])].append(result)
    maps = sorted(buckets)
    if len(maps) < 2:
        return None
    generator = random.Random(seed)
    samples: list[float] = []
    for _ in range(repetitions):
        selected = [generator.choice(maps) for _ in maps]
        values = [score(row) for map_name in selected for row in buckets[map_name]]
        samples.append(sum(values) / len(values))
    return {
        "unit": "map name (not deduplicated map family)",
        "clusters": len(maps),
        "repetitions": repetitions,
        "seed": seed,
        "scoreRatePercentile95": [percentile(samples, 0.025), percentile(samples, 0.975)],
    }


def load_summaries(paths: list[Path]) -> tuple[list[dict[str, Any]], list[dict[str, Any]], list[str]]:
    files: list[dict[str, Any]] = []
    results: list[dict[str, Any]] = []
    ignored: list[str] = []
    for path in paths:
        try:
            payload = json.loads(path.read_text())
        except (json.JSONDecodeError, UnicodeDecodeError):
            ignored.append(str(path))
            continue
        if not isinstance(payload, dict) or not isinstance(payload.get("results"), list):
            ignored.append(str(path))
            continue
        raw = payload["results"]
        if any(
            not isinstance(row, dict) or row.get("winner") not in {"candidate", "baseline", "draw"}
            for row in raw
        ):
            ignored.append(str(path))
            continue
        recomputed = summarize_results(raw)
        claimed = {
            key: payload.get(key)
            for key in ("candidateWins", "baselineWins", "draws", "candidateWinRate")
        }
        discrepancies: dict[str, Any] = {}
        for key in ("candidateWins", "baselineWins", "draws", "candidateWinRate"):
            expected = recomputed[key]
            observed = claimed[key]
            if observed is not None and not math.isclose(
                float(observed), float(expected), rel_tol=0, abs_tol=1e-12
            ):
                discrepancies[key] = {"stored": observed, "recomputed": expected}
        files.append(
            {
                "path": str(path),
                "sha256": sha256(path),
                "generatedAt": payload.get("generatedAt"),
                "schemaVersion": payload.get("schemaVersion", 1),
                "results": len(raw),
                "storedCounts": claimed,
                "discrepancies": discrepancies,
            }
        )
        results.extend(raw)
    return files, results, ignored


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("inputs", nargs="+", help="summary JSON file(s) or narrowly scoped directories")
    parser.add_argument("--output", type=Path)
    parser.add_argument("--bootstrap-repetitions", type=int, default=10_000)
    parser.add_argument("--bootstrap-seed", type=int, default=20260802)
    args = parser.parse_args()

    paths = discover(args.inputs)
    files, results, ignored = load_summaries(paths)
    if not files:
        raise SystemExit("No result-summary JSON files found")

    signatures = Counter(
        (
            row.get("match"),
            row.get("mapName"),
            row.get("candidateCountry"),
            row.get("baselineCountry"),
            row.get("candidateSlot"),
            json.dumps(row.get("candidateStart"), sort_keys=True),
            json.dumps(row.get("baselineStart"), sort_keys=True),
        )
        for row in results
    )
    repeated_signatures = sum(count - 1 for count in signatures.values() if count > 1)
    map_rows = grouped(results, lambda row: row["mapName"])
    macro_map_score = (
        sum(row["candidateScoreRate"] for row in map_rows.values()) / len(map_rows)
        if map_rows
        else None
    )
    output = {
        "schemaVersion": 1,
        "purpose": "retrospective reconstruction, not confirmatory inference",
        "sourceFiles": files,
        "ignoredJsonFiles": ignored,
        "aggregate": summarize_results(results),
        "macroAverageMapScoreRate": macro_map_score,
        "byMap": map_rows,
        "byCandidateSlot": grouped(results, lambda row: row.get("candidateSlot")),
        "byCandidateStart": grouped(
            results,
            lambda row: f'{row.get("candidateStart", {}).get("x")},{row.get("candidateStart", {}).get("y")}',
        ),
        "repeatedCompositeSignatures": repeated_signatures,
        "mapClusterBootstrap": map_cluster_bootstrap(
            results, args.bootstrap_repetitions, args.bootstrap_seed
        ),
        "cautions": [
            "The game-level Wilson interval assumes independent Bernoulli observations and treats draws as non-wins.",
            "The bootstrap clusters by map filename, not deduplicated map family; clones can leak across groups.",
            "Historical summaries lack a source revision, game RNG seed, clean-baseline identity, and rejection logs.",
            "Use these intervals only as descriptive sensitivity checks for preserved artifacts.",
        ],
    }
    rendered = json.dumps(output, indent=2, sort_keys=True) + "\n"
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(rendered)
    else:
        print(rendered, end="")


if __name__ == "__main__":
    main()
