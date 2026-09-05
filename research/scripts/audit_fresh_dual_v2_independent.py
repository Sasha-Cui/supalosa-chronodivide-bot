#!/usr/bin/env python3
"""Independent V2 endpoint and complete-population action-resource audit.

This implementation intentionally does not import the JavaScript finalizer or
analysis modules. It validates immutable artifacts, independently recomputes
the endpoint tables and gates, streams every compressed ledger, and emits the
A1-amended descriptive action audit.
"""

from __future__ import annotations

import argparse
import collections
import concurrent.futures
import csv
import gzip
import hashlib
import json
import math
import os
from pathlib import Path
import random
import statistics
import subprocess
import sys
from typing import Any, Callable, Iterable, Mapping, Sequence

EXPECTED_SOURCE = "d97166ec25227c291718b73db6b6ea82a8f4e456"
EXPECTED_MANIFEST_SHA256 = "113dffc0c9a9b4238aa849ce5840538e46ddf80a7787fe1f1a38a6fefe0feed8"
EXPECTED_FINALIZER_HASHES = {
    "aggregate.json": "2016d85685f7ebc3c104fcd164ebbbb922c9d2098f8b59bf461e6a78c8a32dcf",
    "gates.json": "defce89afb068579f591e8b527c649aac7de55622f5456b6588c2199686d0dc4",
    "games.csv": "1bf6562561fcf96ab125fa45098716016a5ed854f911b08da146c08aed2d96bd",
    "outcomes.csv": "2efb13f3c841cfa9d6640d1d69881d59ee3d58d14be52f9f90aac1172000f31a",
    "transitions.csv": "065873831ed3c28daf93a67dd0d16d86729c1d315e15ca6d39cdfc12c676788b",
    "endpoint-effects.csv": "e9b210095e896233fd1fd26d85f06eeae50fc9d57d134488ca2c1ad0d1e02183",
    "scheduler.csv": "d2823deb1c32d5272acd96b02479b53832d35d059c6749307f3d83785c3c4f33",
    "COMPLETE": "c994df35df423197e3e8a781f30c766ceefeb9c3d2b341a2198ae0f5c9f8c9a0",
}
EXPECTED_ARRAY_JOB = "24832312"
EXPECTED_FINALIZER_JOB = "24832313"
EXPECTED_ACTION_DISTINCT = 2520
EXPECTED_ACTION_DUPLICATE_VALUES = 180
EXPECTED_ACTION_MAX_MULTIPLICITY = 2
EXPECTED_PRIORITY_QUEUE = (12, 25836, "1533f9343bc44506b5082a47f5d8dc81420069b9f84e83070c26ebd2cbf57cf7")
EXPECTED_QUADTREE = (98, 717211, "af6f532a321a487d38bf6726858313d296ba90883e5c2bb2df0d290d7f932039")
EXPECTED_EXTERNAL_LOCKFILE_SHA256 = (
    "59ad1d212f1ebe8fba5913ced9c096c97d5840c93abc76bfa863737c6589458d"
)
BOOTSTRAP_SEED = 620_260_905
BOOTSTRAP_REPLICATES = 10_000
WILSON_Z95 = 1.6448536269514722
T_GATE = {"hfo": 1.68957, "peak": 1.73961, "peak_cases": 1.65341}
T_ENDPOINT = {
    18: 1.7396067260750672,
    36: 1.6895724577802655,
    54: 1.674116236703115,
    72: 1.6665996583285084,
    450: 1.6482543776503167,
}
ACTION_METHODS = (
    "placeBuilding", "sellObject", "sellBuilding", "toggleRepairWrench",
    "toggleAlliance", "pauseProduction", "resumeProduction",
    "queueForProduction", "unqueueFromProduction", "activateSuperWeapon",
    "orderUnits", "sayAll", "setGlobalDebugText", "setUnitDebugText",
    "quitGame",
)
SIDES = ("candidate", "baseline")
ENDPOINTS = ("v5", "v6")
ALLIED = {"Americans", "Alliance", "French", "Germans", "British"}
OUTCOME_NUMERIC_INT = {
    "n", "wins", "draws", "losses", "tickCapDraws", "nonliteralDraws",
}
OUTCOME_NUMERIC_FLOAT = {
    "winRate", "scoreMean", "wilsonWinLower95", "meanFirstResultUpdate",
    "medianFirstResultUpdate",
}
DIMENSION_FIELDS = ("cohort", "mapId", "arm", "country", "faction", "start", "slot")


class AuditFailure(RuntimeError):
    pass


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AuditFailure(message)


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def hash_tree(root: Path) -> dict[str, Any]:
    root = root.resolve()
    entries: list[tuple[str, Path, bytes | None, int]] = []

    def visit(directory: Path) -> None:
        with os.scandir(directory) as iterator:
            for entry in iterator:
                absolute = Path(entry.path)
                relative = os.path.relpath(absolute, root)
                if entry.is_symlink():
                    target = os.readlink(absolute).encode()
                    entries.append((relative, absolute, target, len(target)))
                elif entry.is_dir(follow_symlinks=False):
                    visit(absolute)
                elif entry.is_file(follow_symlinks=False):
                    entries.append((relative, absolute, None, entry.stat(follow_symlinks=False).st_size))
                else:
                    raise AuditFailure(f"unsupported tree entry {absolute}")

    visit(root)
    entries.sort(key=lambda value: value[0])
    digest = hashlib.sha256()
    for relative, absolute, target, _ in entries:
        digest.update(relative.encode())
        digest.update(b"\0")
        if target is not None:
            digest.update(target)
        else:
            with absolute.open("rb") as handle:
                for chunk in iter(lambda: handle.read(1024 * 1024), b""):
                    digest.update(chunk)
        digest.update(b"\0")
    return {
        "root": str(root),
        "files": len(entries),
        "bytes": sum(value[3] for value in entries),
        "sha256": digest.hexdigest(),
    }


def git(repo: Path, *arguments: str) -> str:
    return subprocess.run(
        ["git", *arguments], cwd=repo, check=True, text=True, capture_output=True,
    ).stdout.strip()


def verify_runtime_provenance(root: Path, repo: Path) -> dict[str, Any]:
    freeze_dir = root.parent / "execution-v1" / "runtime-freeze"
    freeze_path = freeze_dir / "runtime-freeze.json"
    require(
        sha256_file(freeze_path) == read_sidecar_hash(freeze_dir / "runtime-freeze.sha256"),
        "runtime-freeze sidecar mismatch",
    )
    require(
        (freeze_dir / "COMPLETE").read_text().strip() == "COMPLETE_FRESH_DUAL_RUNTIME_FREEZE_V1",
        "runtime-freeze marker mismatch",
    )
    freeze = json.loads(freeze_path.read_text())
    require(freeze["complete"] is True and freeze["passed"] is True, "runtime freeze not complete/pass")
    frozen = freeze["frozen"]
    candidate = hash_tree(Path(frozen["candidatePolicy"]["runtimeTree"]["root"]))
    external = hash_tree(Path(frozen["externalSupalosa"]["runtimeTree"]["root"]))
    require(candidate == frozen["candidatePolicy"]["runtimeTree"], "candidate runtime tree drift")
    require(external == frozen["externalSupalosa"]["runtimeTree"], "external runtime tree drift")

    external_repo = Path(frozen["externalSupalosa"]["repoRoot"])
    require(git(external_repo, "rev-parse", "HEAD") == frozen["externalSupalosa"]["commit"],
            "external Supalosa commit drift")
    require(git(external_repo, "status", "--porcelain=v1") == "", "external Supalosa tree dirty")
    require(sha256_file(Path(frozen["gameApi"]["path"])) == frozen["gameApi"]["sha256"],
            "game-api drift")
    for entry in frozen["assets"]["entries"]:
        path = Path(frozen["assets"]["root"]) / entry["name"]
        require(sha256_file(path) == entry["sha256"], f"asset drift: {entry['name']}")
    for map_entry in frozen["maps"]:
        require(
            sha256_file(Path(map_entry["absolutePath"])) == map_entry["sha256"],
            f"map drift: {map_entry['id']}",
        )
    advanced = frozen["ra2WebAdvanced"]
    require(sha256_file(Path(advanced["bundlePath"])) == advanced["bundleSha256"],
            "RA2Web Advanced bundle drift")
    require(sha256_file(Path(advanced["manifestPath"])) == advanced["manifestSha256"],
            "RA2Web Advanced manifest drift")
    require(
        sha256_file(root.parent / "selection" / "finalizer" / "selection.json")
        == frozen["selectionSha256"],
        "selection drift",
    )
    require(
        sha256_file(root.parent / "audit" / "seed-audit.json") == frozen["seedAuditSha256"],
        "seed-audit drift",
    )

    dependency_root = external_repo / "node_modules"
    priority = hash_tree(dependency_root / "@datastructures-js" / "priority-queue")
    quadtree = hash_tree(dependency_root / "@timohausmann" / "quadtree-ts")
    require(
        (priority["files"], priority["bytes"], priority["sha256"]) == EXPECTED_PRIORITY_QUEUE,
        "priority-queue transitive tree drift",
    )
    require(
        (quadtree["files"], quadtree["bytes"], quadtree["sha256"]) == EXPECTED_QUADTREE,
        "quadtree transitive tree drift",
    )
    require(
        sha256_file(external_repo / "package-lock.json") == EXPECTED_EXTERNAL_LOCKFILE_SHA256,
        "external package-lock drift",
    )
    return {
        "runtimeFreezeSha256": sha256_file(freeze_path),
        "candidateRuntimeTree": candidate,
        "externalSupalosaRuntimeTree": external,
        "externalSupalosaCommit": frozen["externalSupalosa"]["commit"],
        "gameApiSha256": frozen["gameApi"]["sha256"],
        "assets": len(frozen["assets"]["entries"]),
        "maps": len(frozen["maps"]),
        "ra2WebAdvancedBundleSha256": advanced["bundleSha256"],
        "priorityQueue": priority,
        "quadtree": quadtree,
        "externalLockfileSha256": EXPECTED_EXTERNAL_LOCKFILE_SHA256,
    }


def canonical(value: Any) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def mean(values: Sequence[float]) -> float:
    require(bool(values), "mean requires at least one value")
    return sum(values) / len(values)


def sample_sd(values: Sequence[float]) -> float:
    return statistics.stdev(values) if len(values) > 1 else 0.0


def t_lower(values: Sequence[float], critical: float) -> float:
    return mean(values) - critical * sample_sd(values) / math.sqrt(len(values))


def quantile(values: Sequence[float], probability: float) -> float:
    require(bool(values) and 0 <= probability <= 1, "invalid quantile request")
    ordered = sorted(values)
    position = (len(ordered) - 1) * probability
    lower = math.floor(position)
    upper = math.ceil(position)
    if lower == upper:
        return float(ordered[lower])
    weight = position - lower
    return float(ordered[lower] * (1 - weight) + ordered[upper] * weight)


def median(values: Sequence[float]) -> float:
    return quantile(values, 0.5)


def faction(country: str) -> str:
    return "Allied" if country in ALLIED else "Soviet"


def map_family(map_id: str) -> str:
    if map_id.startswith("hfo-"):
        return "hfo"
    if map_id == "peak":
        return "peak"
    if map_id == "tour-of-egypt":
        return "tour-of-egypt"
    if map_id.startswith("south-pacific"):
        return "south-pacific"
    if map_id == "pacific-heights":
        return "pacific-heights"
    raise AuditFailure(f"unknown map family for {map_id}")


def group_rows(rows: Iterable[dict[str, Any]], fields: Sequence[str]) -> list[tuple[tuple[Any, ...], list[dict[str, Any]]]]:
    grouped: dict[tuple[Any, ...], list[dict[str, Any]]] = collections.defaultdict(list)
    for row in rows:
        values = []
        for field in fields:
            values.append(faction(row["country"]) if field == "faction" else row[field])
        grouped[tuple(values)].append(row)
    return sorted(grouped.items(), key=lambda item: canonical(item[0]))


def winner_score(winner: str) -> float:
    require(winner in {"candidate", "draw", "baseline"}, f"invalid winner {winner}")
    return 1.0 if winner == "candidate" else 0.5 if winner == "draw" else 0.0


def wilson_lower(wins: int, total: int, z: float = WILSON_Z95) -> float:
    require(total > 0 and 0 <= wins <= total, "invalid Wilson inputs")
    p = wins / total
    denominator = 1 + z * z / total
    center = p + z * z / (2 * total)
    radius = z * math.sqrt((p * (1 - p) + z * z / (4 * total)) / total)
    return (center - radius) / denominator


def endpoint_summary(rows: Sequence[dict[str, Any]], endpoint_name: str) -> dict[str, Any]:
    values = [row[endpoint_name] for row in rows]
    wins = sum(value["winner"] == "candidate" for value in values)
    draws = sum(value["winner"] == "draw" for value in values)
    losses = sum(value["winner"] == "baseline" for value in values)
    statuses: dict[str, int] = {}
    for value in values:
        statuses[value["status"]] = statuses.get(value["status"], 0) + 1
    ticks = [value["tick"] for value in values]
    return {
        "n": len(rows),
        "wins": wins,
        "draws": draws,
        "losses": losses,
        "winRate": wins / len(rows),
        "scoreMean": (wins + 0.5 * draws) / len(rows),
        "wilsonWinLower95": wilson_lower(wins, len(rows)),
        "meanFirstResultUpdate": mean(ticks),
        "medianFirstResultUpdate": median(ticks),
        "tickCapDraws": sum(value["status"] == "tick_cap_draw" for value in values),
        "nonliteralDraws": sum(value["status"] == "engine_nonliteral_termination_draw" for value in values),
        "statusCounts": statuses,
    }


def dimensions(fields: Sequence[str], values: Sequence[Any]) -> dict[str, Any]:
    output = {key: "" for key in DIMENSION_FIELDS}
    for field, value in zip(fields, values):
        key = "start" if field == "candidateStart" else "slot" if field == "candidateSlot" else field
        output[key] = value
    return output


def independent_outcomes(rows: Sequence[dict[str, Any]]) -> list[dict[str, Any]]:
    specifications = (
        ("overall", ()),
        ("cohort_arm", ("cohort", "arm")),
        ("map_arm", ("cohort", "mapId", "arm")),
        ("map_arm_country", ("cohort", "mapId", "arm", "country")),
        ("map_arm_faction", ("cohort", "mapId", "arm", "faction")),
        ("map_arm_start", ("cohort", "mapId", "arm", "candidateStart")),
        ("map_arm_slot", ("cohort", "mapId", "arm", "candidateSlot")),
        ("map_arm_country_start", ("cohort", "mapId", "arm", "country", "candidateStart")),
    )
    output: list[dict[str, Any]] = []
    for endpoint_name in ENDPOINTS:
        for level, fields in specifications:
            for values, members in group_rows(rows, fields):
                output.append({
                    "endpoint": endpoint_name,
                    "level": level,
                    **dimensions(fields, values),
                    **endpoint_summary(members, endpoint_name),
                })
    return output


def independent_transitions(rows: Sequence[dict[str, Any]]) -> list[dict[str, Any]]:
    output: list[dict[str, Any]] = []
    for level, fields in (
        ("overall", ()),
        ("cohort_arm", ("cohort", "arm")),
        ("map_arm", ("cohort", "mapId", "arm")),
    ):
        for values, members in group_rows(rows, fields):
            counts: dict[tuple[str, str, str, str], int] = collections.Counter(
                (
                    row["v5"]["winner"], row["v5"]["status"],
                    row["v6"]["winner"], row["v6"]["status"],
                )
                for row in members
            )
            for key, count in sorted(counts.items(), key=lambda item: canonical(item[0])):
                output.append({
                    "level": level,
                    **dimensions(fields, values),
                    "v5Winner": key[0],
                    "v5Status": key[1],
                    "v6Winner": key[2],
                    "v6Status": key[3],
                    "count": count,
                })
    return output


def independent_endpoint_effects(rows: Sequence[dict[str, Any]]) -> list[dict[str, Any]]:
    output: list[dict[str, Any]] = []
    for level, fields in (
        ("overall", ()),
        ("cohort_arm", ("cohort", "arm")),
        ("map_arm", ("cohort", "mapId", "arm")),
    ):
        for values, members in group_rows(rows, fields):
            differences = [
                winner_score(row["v6"]["winner"]) - winner_score(row["v5"]["winner"])
                for row in members
            ]
            common = {
                "level": level,
                **{key: "" for key in ("cohort", "mapId", "arm")},
                **{field: value for field, value in zip(fields, values)},
                "n": len(differences),
                "meanScoreDifference": mean(differences),
                "favorable": sum(value > 0 for value in differences),
                "unchanged": sum(value == 0 for value in differences),
                "unfavorable": sum(value < 0 for value in differences),
            }
            if level == "overall":
                output.append({
                    **common,
                    "countryStartClusters": None,
                    "countryStartMeanDifference": None,
                    "countryStartLower95": None,
                    "tCritical95": None,
                    "inferenceStatus": "omitted-heterogeneous-all-row-mixture",
                })
                continue
            cluster_values = [
                mean([
                    winner_score(row["v6"]["winner"]) - winner_score(row["v5"]["winner"])
                    for row in cluster
                ])
                for _, cluster in group_rows(members, ("mapId", "country", "candidateStart"))
            ]
            critical = T_ENDPOINT.get(len(cluster_values))
            require(critical is not None, f"unsupported endpoint-effect cluster count {len(cluster_values)}")
            output.append({
                **common,
                "countryStartClusters": len(cluster_values),
                "countryStartMeanDifference": mean(cluster_values),
                "countryStartLower95": t_lower(cluster_values, critical),
                "tCritical95": critical,
                "inferenceStatus": "map-country-start-clustered-one-sided-95",
            })
    return output


def hfo_gate(rows: Sequence[dict[str, Any]], endpoint_name: str) -> dict[str, Any]:
    overall = endpoint_summary(rows, endpoint_name)
    countries = [endpoint_summary(group, endpoint_name) for _, group in group_rows(rows, ("country",))]
    starts = [endpoint_summary(group, endpoint_name) for _, group in group_rows(rows, ("candidateStart",))]
    factions = [endpoint_summary(group, endpoint_name) for _, group in group_rows(rows, ("faction",))]
    slots = [endpoint_summary(group, endpoint_name) for _, group in group_rows(rows, ("candidateSlot",))]
    cells = [endpoint_summary(group, endpoint_name) for _, group in group_rows(rows, ("country", "candidateStart"))]
    require(len(cells) == 36, "HFO gate requires 36 country/start cells")
    rates = [cell["winRate"] for cell in cells]
    superiority = {
        "overallWinsExceedLosses": overall["wins"] > overall["losses"],
        "everyCountryWinsExceedLosses": all(value["wins"] > value["losses"] for value in countries),
        "pooledWilsonLowerAboveHalf": overall["wilsonWinLower95"] > 0.5,
        "countryStartLowerAboveHalf": t_lower(rates, T_GATE["hfo"]) > 0.5,
        "everyStartWilsonLowerAboveHalf": all(value["wilsonWinLower95"] > 0.5 for value in starts),
        "everyFactionWilsonLowerAboveHalf": all(value["wilsonWinLower95"] > 0.5 for value in factions),
        "everySlotWilsonLowerAboveHalf": all(value["wilsonWinLower95"] > 0.5 for value in slots),
        "countriesWithWilsonLowerAboveHalf": sum(value["wilsonWinLower95"] > 0.5 for value in countries),
        "strictPositiveCountryStartCells": sum(value["wins"] > value["losses"] for value in cells),
        "nonnegativeRemainingCountryStartCells": all(value["wins"] >= value["losses"] for value in cells),
    }
    superiority_passed = all(
        value >= 7 if key == "countriesWithWilsonLowerAboveHalf"
        else value >= 30 if key == "strictPositiveCountryStartCells"
        else value is True
        for key, value in superiority.items()
    )
    dominance = {
        "pointWinRateAtLeast80": overall["winRate"] >= 0.8,
        "pooledWilsonLowerAbove75": overall["wilsonWinLower95"] > 0.75,
        "allCountryStartCellsStrictlyPositive": all(value["wins"] > value["losses"] for value in cells),
    }
    return {
        "n": len(rows),
        "endpoint": endpoint_name,
        "overall": overall,
        "countryStartWinRateMean": mean(rates),
        "countryStartWinRateLower95": t_lower(rates, T_GATE["hfo"]),
        "superiority": superiority,
        "superiorityPassed": superiority_passed,
        "dominance": dominance,
        "dominancePassed": superiority_passed and all(dominance.values()),
    }


def paired_effect(
    candidate_rows: Sequence[dict[str, Any]],
    control_rows: Sequence[dict[str, Any]],
    endpoint_name: str,
    critical: float,
) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    control = {row["caseIndex"]: row for row in control_rows}
    require(len(control) == len(control_rows), "duplicate paired control case")
    pairs = []
    for row in candidate_rows:
        other = control.get(row["caseIndex"])
        require(other is not None, f"missing paired control {row['caseIndex']}")
        for field in ("requestedEngineSeed", "candidateSlot", "candidateStart"):
            require(row[field] == other[field], f"paired mismatch {field} case {row['caseIndex']}")
        pairs.append({
            "candidate": row,
            "control": other,
            "country": row["country"],
            "candidateStart": row["candidateStart"],
            "difference": winner_score(row[endpoint_name]["winner"]) - winner_score(other[endpoint_name]["winner"]),
        })
    require(len(pairs) == len(control_rows), "paired population mismatch")
    differences = [pair["difference"] for pair in pairs]
    cluster_values = [
        mean([pair["difference"] for pair in group])
        for _, group in group_rows(pairs, ("country", "candidateStart"))
    ]
    by = {}
    for label, fields in (
        ("byStart", ("candidateStart",)),
        ("byFaction", ("faction",)),
        ("bySlot", ("candidateSlot",)),
        ("byCountry", ("country",)),
    ):
        expanded = []
        for pair in pairs:
            row = dict(pair)
            row["candidateSlot"] = pair["candidate"]["candidateSlot"]
            expanded.append(row)
        by[label] = {
            (str(values[0]) if label == "bySlot" else values[0]):
                mean([pair["difference"] for pair in members])
            for values, members in group_rows(expanded, fields)
        }
    summary = {
        "n": len(differences),
        "meanScoreDifference": mean(differences),
        "pairedCaseLower95": t_lower(differences, critical),
        "favorable": sum(value > 0 for value in differences),
        "unchanged": sum(value == 0 for value in differences),
        "unfavorable": sum(value < 0 for value in differences),
        "countryStartClusters": len(cluster_values),
        "countryStartMeanDifference": mean(cluster_values),
        "countryStartLower95": t_lower(
            cluster_values,
            T_GATE["hfo"] if len(cluster_values) == 36 else T_GATE["peak"],
        ),
        **by,
    }
    return summary, pairs


def independent_gates(rows: Sequence[dict[str, Any]]) -> dict[str, Any]:
    central = [row for row in rows if row["cohort"] == "central" and row["arm"] == "deployed"]
    require(len(central) == 720, "central population mismatch")

    peak = [row for row in rows if row["cohort"] == "peak" and row["arm"] == "strategy_both"]
    peak_control = [row for row in rows if row["cohort"] == "peak" and row["arm"] == "deployed"]
    require(len(peak) == len(peak_control) == 180, "Peak population mismatch")
    peak_absolute = endpoint_summary(peak, "v6")
    peak_cells = [endpoint_summary(group, "v6") for _, group in group_rows(peak, ("country", "candidateStart"))]
    peak_starts = [endpoint_summary(group, "v6") for _, group in group_rows(peak, ("candidateStart",))]
    peak_factions = [endpoint_summary(group, "v6") for _, group in group_rows(peak, ("faction",))]
    peak_slots = [endpoint_summary(group, "v6") for _, group in group_rows(peak, ("candidateSlot",))]
    peak_paired, peak_pairs = paired_effect(peak, peak_control, "v6", T_GATE["peak_cases"])
    weak = [pair for pair in peak_pairs if pair["candidate"]["candidateStart"] == "37,73"]
    weak_exact = len(weak) == 90 and all(
        pair["candidate"]["actionSha256"] == pair["control"]["actionSha256"]
        and pair["candidate"]["ledgerPlainSha256"] == pair["control"]["ledgerPlainSha256"]
        and pair["candidate"]["v5"] == pair["control"]["v5"]
        and pair["candidate"]["v6"] == pair["control"]["v6"]
        for pair in weak
    )
    peak_checks = {
        "winsExceedLosses": peak_absolute["wins"] > peak_absolute["losses"],
        "pooledWilsonLowerAboveHalf": peak_absolute["wilsonWinLower95"] > 0.5,
        "pairedMeanPositive": peak_paired["meanScoreDifference"] > 0,
        "pairedCaseLowerPositive": peak_paired["pairedCaseLower95"] > 0,
        "everyStartPositive": all(value["wins"] > value["losses"] for value in peak_starts),
        "everyFactionPositive": all(value["wins"] > value["losses"] for value in peak_factions),
        "everySlotPositive": all(value["wins"] > value["losses"] for value in peak_slots),
        "everyCountryNoninferior": all(value >= 0 for value in peak_paired["byCountry"].values()),
        "positiveCountries": sum(value > 0 for value in peak_paired["byCountry"].values()),
        "countryStartWinRateLowerAboveHalf": t_lower(
            [cell["winRate"] for cell in peak_cells], T_GATE["peak"],
        ) > 0.5,
        "pairedCountryStartLowerPositive": peak_paired["countryStartLower95"] > 0,
        "weakStartExact": weak_exact,
    }
    peak_passed = all(
        value >= 7 if key == "positiveCountries" else value is True
        for key, value in peak_checks.items()
    )

    advanced = [row for row in rows if row["cohort"] == "advanced" and row["arm"] == "deployed"]
    advanced_control = [
        row for row in rows if row["cohort"] == "advanced" and row["arm"] == "supalosa_reference"
    ]
    require(len(advanced) == len(advanced_control) == 360, "Advanced population mismatch")
    advanced_paired, _ = paired_effect(advanced, advanced_control, "v6", T_GATE["hfo"])
    advanced_absolute = hfo_gate(advanced, "v6")
    advanced_control_absolute = hfo_gate(advanced_control, "v6")
    improvement = {
        "pairedMeanPositive": advanced_paired["meanScoreDifference"] > 0,
        "pairedCountryStartLowerPositive": advanced_paired["countryStartLower95"] > 0,
    }
    return {
        "central": hfo_gate(central, "v6"),
        "peak": {
            "absolute": peak_absolute,
            "paired": peak_paired,
            "weakStartPairs": len(weak),
            "checks": peak_checks,
            "passed": peak_passed,
        },
        "advanced": {
            "deployedAbsolute": advanced_absolute,
            "externalSupalosaAbsolute": advanced_control_absolute,
            "paired": advanced_paired,
            "improvement": improvement,
            "superiorityPassed": advanced_absolute["superiorityPassed"] and all(improvement.values()),
            "dominancePassed": advanced_absolute["dominancePassed"] and all(improvement.values()),
        },
        "transferInterpretation": "descriptive-only-no-family-or-general-map-dominance-claim",
    }


def normalize_csv_games(path: Path) -> list[dict[str, Any]]:
    output = []
    with path.open(newline="") as handle:
        for raw in csv.DictReader(handle):
            row: dict[str, Any] = dict(raw)
            for field in (
                "gameIndex", "caseIndex", "countryOrdinal", "candidateStartOrdinal",
                "opponentStartOrdinal", "candidateSlot", "repeatIndex", "pairIndex",
                "requestedEngineSeed", "updates", "actionCalls", "corpseTargetRequests",
                "ledgerRecords", "ledgerPlainBytes", "ledgerGzipBytes",
                "v5Tick", "v6Tick",
            ):
                row[field] = int(row[field])
            row["v5"] = {
                "winner": row.pop("v5Winner"),
                "status": row.pop("v5Status"),
                "tick": row.pop("v5Tick"),
            }
            row["v6"] = {
                "winner": row.pop("v6Winner"),
                "status": row.pop("v6Status"),
                "tick": row.pop("v6Tick"),
            }
            row.pop("v5Score")
            row.pop("v6Score")
            output.append(row)
    return output


def floats_equal(left: float, right: float) -> bool:
    return math.isclose(left, right, rel_tol=1e-12, abs_tol=1e-12)


def compare_nested(actual: Any, expected: Any, path: str = "root") -> None:
    if isinstance(expected, bool) or expected is None or isinstance(expected, str):
        require(actual == expected, f"{path}: {actual!r} != {expected!r}")
    elif isinstance(expected, int):
        require(actual == expected, f"{path}: {actual!r} != {expected!r}")
    elif isinstance(expected, float):
        require(isinstance(actual, (int, float)) and floats_equal(float(actual), expected),
                f"{path}: {actual!r} != {expected!r}")
    elif isinstance(expected, list):
        require(isinstance(actual, list) and len(actual) == len(expected), f"{path}: list mismatch")
        for index, (a_value, e_value) in enumerate(zip(actual, expected)):
            compare_nested(a_value, e_value, f"{path}[{index}]")
    elif isinstance(expected, dict):
        require(isinstance(actual, dict) and set(actual) == set(expected),
                f"{path}: keys {set(actual)} != {set(expected)}")
        for key in expected:
            compare_nested(actual[key], expected[key], f"{path}.{key}")
    else:
        raise AuditFailure(f"{path}: unsupported expected type {type(expected)}")


def parse_expected_outcomes(path: Path) -> list[dict[str, Any]]:
    output = []
    with path.open(newline="") as handle:
        for row in csv.DictReader(handle):
            value: dict[str, Any] = dict(row)
            for field in OUTCOME_NUMERIC_INT:
                value[field] = int(value[field])
            for field in OUTCOME_NUMERIC_FLOAT:
                value[field] = float(value[field])
            value["statusCounts"] = json.loads(value["statusCounts"])
            if value["slot"] != "":
                value["slot"] = int(value["slot"])
            output.append(value)
    return output


def parse_expected_transitions(path: Path) -> list[dict[str, Any]]:
    output = []
    with path.open(newline="") as handle:
        for row in csv.DictReader(handle):
            value = dict(row)
            value["count"] = int(value["count"])
            output.append(value)
    return output


def parse_expected_effects(path: Path) -> list[dict[str, Any]]:
    integer_fields = {"n", "favorable", "unchanged", "unfavorable", "countryStartClusters"}
    float_fields = {"meanScoreDifference", "countryStartMeanDifference", "countryStartLower95", "tCritical95"}
    output = []
    with path.open(newline="") as handle:
        for row in csv.DictReader(handle):
            value: dict[str, Any] = dict(row)
            for field in integer_fields:
                value[field] = None if value[field] == "" else int(value[field])
            for field in float_fields:
                value[field] = None if value[field] == "" else float(value[field])
            output.append(value)
    return output


def compare_table(
    actual: Sequence[dict[str, Any]],
    expected: Sequence[dict[str, Any]],
    key_fields: Sequence[str],
    label: str,
) -> None:
    actual_map = {tuple(row[field] for field in key_fields): row for row in actual}
    expected_map = {tuple(row[field] for field in key_fields): row for row in expected}
    require(len(actual_map) == len(actual), f"{label}: duplicate actual keys")
    require(len(expected_map) == len(expected), f"{label}: duplicate expected keys")
    require(set(actual_map) == set(expected_map), f"{label}: key-set mismatch")
    for key in sorted(actual_map, key=canonical):
        compare_nested(actual_map[key], expected_map[key], f"{label}{key}")


def read_sidecar_hash(path: Path) -> str:
    fields = path.read_text().strip().split()
    require(bool(fields), f"empty sidecar {path}")
    require(len(fields[0]) == 64, f"invalid sidecar {path}")
    return fields[0]


def stream_ledger(path: Path) -> dict[str, Any]:
    gzip_hash = sha256_file(path)
    plain_hash = hashlib.sha256()
    plain_bytes = 0
    records = 0
    last: dict[str, Any] | None = None
    with gzip.open(path, "rb") as handle:
        for line in handle:
            plain_hash.update(line)
            plain_bytes += len(line)
            records += 1
            last = json.loads(line)
    require(last is not None and last.get("kind") == "final", f"missing final record in {path}")
    return {
        "gzipSha256": gzip_hash,
        "gzipBytes": path.stat().st_size,
        "plainSha256": plain_hash.hexdigest(),
        "plainBytes": plain_bytes,
        "records": records,
        "final": last["value"],
    }


def audit_cell(root: Path, row: dict[str, Any], manifest: dict[str, Any]) -> dict[str, Any]:
    index = row["gameIndex"]
    directory = root / "cells" / f"game-{index:04d}"
    require((directory / "COMPLETE").read_text().strip() == "COMPLETE_FRESH_DUAL_COMPETITIVE_CELL_V2",
            f"cell {index}: invalid marker")
    case_path = directory / "case.json"
    case_sha256 = sha256_file(case_path)
    require(case_sha256 == read_sidecar_hash(directory / "case.sha256"),
            f"cell {index}: case sidecar mismatch")
    cell = json.loads(case_path.read_text())
    require(cell["complete"] is True and cell["technicalPass"] is True, f"cell {index}: not technical pass")
    require(cell["sourceCommit"] == EXPECTED_SOURCE, f"cell {index}: source mismatch")
    require(cell["manifestSha256"] == EXPECTED_MANIFEST_SHA256, f"cell {index}: manifest mismatch")
    require(cell["assignment"] == manifest["assignments"][index], f"cell {index}: assignment mismatch")
    require(cell["assignment"]["gameIndex"] == index, f"cell {index}: assignment index mismatch")
    case_fields = {
        "caseIndex": "caseIndex",
        "cohort": "cohort",
        "mapId": "mapId",
        "country": "country",
        "countryOrdinal": "countryOrdinal",
        "candidateStart": "candidateStart",
        "candidateStartOrdinal": "candidateStartOrdinal",
        "opponentStart": "opponentStart",
        "opponentStartOrdinal": "opponentStartOrdinal",
        "candidateSlot": "candidateSlot",
        "repeatIndex": "repeatIndex",
        "pairIndex": "pairIndex",
        "pairId": "pairId",
        "requestedEngineSeed": "requestedEngineSeed",
    }
    for cell_field, row_field in case_fields.items():
        require(cell["case"][cell_field] == row[row_field],
                f"cell {index}: case field mismatch {cell_field}")
    require(cell["selectedCase"]["updates"] == 0, f"cell {index}: selected case is not zero-update")
    require(cell["selectedCase"]["observedCandidateStart"] == row["candidateStart"],
            f"cell {index}: selected candidate start mismatch")
    require(cell["selectedCase"]["observedOpponentStart"] == row["opponentStart"],
            f"cell {index}: selected opponent start mismatch")
    require(cell["map"]["id"] == row["mapId"], f"cell {index}: map identity mismatch")
    require(cell["programSha256"] == manifest["files"]["research/scripts/fresh-dual-competitive-v2.mjs"],
            f"cell {index}: program hash mismatch")
    require(cell["policyFreezeSha256"] == manifest["policyFreezeSha256"],
            f"cell {index}: policy freeze mismatch")
    require(cell["compressedCanaryAggregateSha256"] == manifest["compressedCanaryAggregateSha256"],
            f"cell {index}: compressed canary mismatch")
    require(cell["scheduler"]["arrayJobId"] == EXPECTED_ARRAY_JOB, f"cell {index}: array mismatch")
    require(cell["scheduler"]["jobId"] == str(row["schedulerJobId"]), f"cell {index}: job mismatch")
    require(cell["scheduler"]["account"] == "pi_jss233", f"cell {index}: account mismatch")
    require(cell["scheduler"]["partition"] == "day", f"cell {index}: partition mismatch")
    result = cell["result"]
    require(result["complete"] is True and result["technicalPass"] is True, f"cell {index}: result incomplete")
    require(result["quitSuppression"]["forwarded"] == {"candidate": 0, "baseline": 0},
            f"cell {index}: forwarded resignation")
    audit = result["actionAudit"]
    require(audit["callCount"] == row["actionCalls"], f"cell {index}: action call mismatch")
    require(audit["sha256"] == row["actionSha256"], f"cell {index}: action hash mismatch")
    require(audit["zeroHealthBuildingTargetRequests"]["count"] == row["corpseTargetRequests"],
            f"cell {index}: corpse target mismatch")
    sparse_total = 0
    side_method: dict[str, dict[str, int]] = {
        side: {method: 0 for method in ACTION_METHODS} for side in SIDES
    }
    for key, value in audit["bySideAndMethod"].items():
        require(isinstance(value, int) and not isinstance(value, bool) and value >= 0,
                f"cell {index}: invalid method count {key}")
        parts = key.split(".")
        require(len(parts) == 2 and parts[0] in SIDES and parts[1] in ACTION_METHODS,
                f"cell {index}: unknown action key {key}")
        side_method[parts[0]][parts[1]] = value
        sparse_total += value
    require(sparse_total == audit["callCount"], f"cell {index}: sparse action total mismatch")
    diagnostic = audit["zeroHealthBuildingTargetRequests"]
    require(sum(diagnostic["bySideAndRulesName"].values()) == diagnostic["count"],
            f"cell {index}: diagnostic subtotal mismatch")

    ledger_path = directory / "endpoint-ledger.jsonl.gz"
    ledger = stream_ledger(ledger_path)
    require(ledger["gzipSha256"] == read_sidecar_hash(directory / "endpoint-ledger.sha256"),
            f"cell {index}: ledger sidecar mismatch")
    for field in ("gzipSha256", "gzipBytes", "plainSha256", "plainBytes", "records"):
        require(ledger[field] == result["ledger"][field], f"cell {index}: ledger {field} mismatch")
    final = ledger["final"]
    for field in ("updates", "stopReason", "dualState", "actionAudit", "quitSuppression"):
        require(final[field] == result[field], f"cell {index}: ledger final {field} mismatch")
    require(result["updates"] == row["updates"], f"cell {index}: update mismatch")
    require(result["ledger"]["plainSha256"] == row["ledgerPlainSha256"],
            f"cell {index}: games ledger plain hash mismatch")
    require(result["ledger"]["gzipSha256"] == row["ledgerGzipSha256"],
            f"cell {index}: games ledger gzip hash mismatch")
    for endpoint_name in ENDPOINTS:
        final_endpoint = result["dualState"][endpoint_name]["firstResult"]
        expected = row[endpoint_name]
        require(
            {
                "winner": final_endpoint["winner"],
                "status": final_endpoint["status"],
                "tick": final_endpoint["tick"],
            } == expected,
            f"cell {index}: {endpoint_name} mismatch",
        )
    return {
        "gameIndex": index,
        "caseSha256": case_sha256,
        "cell": cell,
        "action": audit,
        "sideMethod": side_method,
        "ledger": ledger,
    }


def action_metrics(methods: Mapping[str, int], corpse: int, updates: int) -> dict[str, float]:
    total = float(sum(methods.values()))
    order = float(methods["orderUnits"])
    scale = 900.0 / updates
    return {
        "totalCalls": total,
        "callsPer900": total * scale,
        "orderCalls": order,
        "orderCallsPer900": order * scale,
        "orderShare": order / total if total else 0.0,
        "corpseTargets": float(corpse),
        "corpseTargetsPer900": corpse * scale,
        "corpseTargetsPerOrder": corpse / order if order else 0.0,
        "hasCorpseTarget": float(corpse > 0),
        **{f"{method}Calls": float(count) for method, count in methods.items()},
        **{f"{method}Per900": float(count) * scale for method, count in methods.items()},
    }


def distribution(values: Sequence[float]) -> dict[str, Any]:
    return {
        "n": len(values),
        "mean": mean(values),
        "median": median(values),
        "q25": quantile(values, 0.25),
        "q75": quantile(values, 0.75),
        "min": min(values),
        "max": max(values),
    }


def bootstrap_intervals(observations: Sequence[dict[str, Any]], value_field: str, seed: int) -> dict[str, float]:
    clusters: dict[tuple[str, str, str], list[float]] = collections.defaultdict(list)
    for row in observations:
        clusters[(row["mapId"], row["country"], row["candidateStart"])].append(float(row[value_field]))
    keys = sorted(clusters, key=canonical)
    cluster_means = [mean(clusters[key]) for key in keys]
    cluster_sizes = [len(clusters[key]) for key in keys]
    cluster_sums = [sum(clusters[key]) for key in keys]
    families: dict[str, list[int]] = collections.defaultdict(list)
    for index, key in enumerate(keys):
        families[map_family(key[0])].append(index)
    rng = random.Random(seed)
    game_values: list[float] = []
    cluster_values: list[float] = []
    family_values: list[float] = []
    for _ in range(BOOTSTRAP_REPLICATES):
        chosen: list[int] = []
        family_means = []
        for family_name in sorted(families):
            indices = families[family_name]
            sample = [indices[rng.randrange(len(indices))] for _ in indices]
            chosen.extend(sample)
            family_means.append(mean([cluster_means[index] for index in sample]))
        game_values.append(
            sum(cluster_sums[index] for index in chosen) /
            sum(cluster_sizes[index] for index in chosen)
        )
        cluster_values.append(mean([cluster_means[index] for index in chosen]))
        family_values.append(mean(family_means))
    return {
        "gameMean": mean([float(row[value_field]) for row in observations]),
        "equalClusterMean": mean(cluster_means),
        "equalFamilyMean": mean([
            mean([cluster_means[index] for index in indices])
            for _, indices in sorted(families.items())
        ]),
        "gameLower90": quantile(game_values, 0.05),
        "gameUpper90": quantile(game_values, 0.95),
        "gameLower95": quantile(game_values, 0.025),
        "gameUpper95": quantile(game_values, 0.975),
        "clusterLower90": quantile(cluster_values, 0.05),
        "clusterUpper90": quantile(cluster_values, 0.95),
        "clusterLower95": quantile(cluster_values, 0.025),
        "clusterUpper95": quantile(cluster_values, 0.975),
        "familyLower90": quantile(family_values, 0.05),
        "familyUpper90": quantile(family_values, 0.95),
        "familyLower95": quantile(family_values, 0.025),
        "familyUpper95": quantile(family_values, 0.975),
    }


def csv_write(path: Path, rows: Sequence[dict[str, Any]]) -> None:
    require(bool(rows), f"refusing empty CSV {path.name}")
    fields: list[str] = []
    seen = set()
    for row in rows:
        for key in row:
            if key not in seen:
                seen.add(key)
                fields.append(key)
    with path.open("x", newline="") as handle:
        writer = csv.DictWriter(handle, fields, extrasaction="raise", lineterminator="\n")
        writer.writeheader()
        for row in rows:
            writer.writerow({
                key: canonical(value) if isinstance(value, (dict, list)) else value
                for key, value in row.items()
            })


def json_write(path: Path, value: Any) -> None:
    with path.open("x") as handle:
        json.dump(value, handle, indent=2, sort_keys=True)
        handle.write("\n")


def verify_live_scheduler(scheduler_rows: Sequence[dict[str, Any]], sacct: str) -> dict[str, Any]:
    command = [
        sacct, "-X", "-n", "-P", "-j", EXPECTED_ARRAY_JOB,
        "--format=JobID,JobIDRaw,State,ExitCode,Account,Partition,AllocCPUS,Restarts",
    ]
    result = subprocess.run(command, check=True, text=True, capture_output=True)
    live: dict[str, tuple[str, ...]] = {}
    for fields in csv.reader(result.stdout.splitlines(), delimiter="|"):
        if len(fields) < 8 or not fields[0].startswith(EXPECTED_ARRAY_JOB + "_"):
            continue
        live[fields[0]] = tuple(fields[1:8])
    require(len(live) == 2700, f"live scheduler has {len(live)} array rows")
    for row in scheduler_rows:
        label = row["label"]
        require(label in live, f"live scheduler missing {label}")
        raw, state, exit_code, account, partition, cpus, restarts = live[label]
        require(raw == row["jobId"], f"{label}: raw job mismatch")
        require((state, exit_code, account, partition, cpus, restarts) ==
                ("COMPLETED", "0:0", "pi_jss233", "day", "1", "0"),
                f"{label}: live scheduler mismatch")
    final = subprocess.run(
        [
            sacct, "-X", "-n", "-P", "-j", EXPECTED_FINALIZER_JOB,
            "--format=JobIDRaw,State,ExitCode,Account,Partition,AllocCPUS,Restarts",
        ],
        check=True, text=True, capture_output=True,
    ).stdout.strip().split("|")
    require(final[:7] == [EXPECTED_FINALIZER_JOB, "COMPLETED", "0:0", "pi_jss233", "day", "1", "0"],
            "live finalizer scheduler mismatch")
    return {"arrayRows": len(live), "finalizer": final[:7]}


def run(args: argparse.Namespace) -> dict[str, Any]:
    root = args.root.resolve()
    finalizer = root / "finalizer"
    manifest_path = root / "manifest" / "manifest.json"
    repo = Path(__file__).resolve().parents[2]
    program_sha256 = sha256_file(Path(__file__).resolve())
    require(program_sha256 == args.program_sha256, "analysis program hash mismatch")
    current_head = git(repo, "rev-parse", "HEAD")
    require(current_head == args.analysis_source_commit, "analysis source commit mismatch")
    require(git(repo, "rev-parse", "fork/main") == current_head, "fork/main is not synchronized")
    require(
        git(repo, "status", "--porcelain=v1", "--untracked-files=no") == "",
        "tracked analysis source is dirty",
    )
    ancestor = subprocess.run(
        ["git", "merge-base", "--is-ancestor", EXPECTED_SOURCE, current_head],
        cwd=repo,
    )
    require(ancestor.returncode == 0, "frozen V2 source is not an ancestor")
    require(root.exists(), f"missing evidence root {root}")
    require(args.output.resolve() != root and not args.output.exists(), "output must be a new exclusive path")
    runtime_provenance = verify_runtime_provenance(root, repo)
    require(sha256_file(manifest_path) == EXPECTED_MANIFEST_SHA256, "manifest hash mismatch")
    manifest = json.loads(manifest_path.read_text())
    require(manifest["sourceCommit"] == EXPECTED_SOURCE, "manifest source mismatch")
    require(len(manifest["assignments"]) == 2700, "manifest assignment count mismatch")
    for relative, expected in manifest["files"].items():
        require(sha256_file(repo / relative) == expected, f"V2 source file drift: {relative}")
    for name, expected in EXPECTED_FINALIZER_HASHES.items():
        path = finalizer / name
        require(path.exists() and sha256_file(path) == expected, f"finalizer hash mismatch: {name}")
    require((finalizer / "COMPLETE").read_text().strip() ==
            "COMPLETE_FRESH_DUAL_COMPETITIVE_AGGREGATE_V2", "invalid finalizer marker")
    require(read_sidecar_hash(finalizer / "aggregate.sha256") == EXPECTED_FINALIZER_HASHES["aggregate.json"],
            "aggregate sidecar mismatch")
    aggregate = json.loads((finalizer / "aggregate.json").read_text())
    expected_gates = json.loads((finalizer / "gates.json").read_text())
    require(aggregate["complete"] is True and aggregate["passed"] is True, "aggregate not complete/pass")
    require(aggregate["sourceCommit"] == EXPECTED_SOURCE, "aggregate source mismatch")
    require(aggregate["arrayJobId"] == EXPECTED_ARRAY_JOB, "aggregate array mismatch")
    for name, metadata in aggregate["outputs"].items():
        require(name in EXPECTED_FINALIZER_HASHES, f"unknown aggregate output {name}")
        require(metadata["sha256"] == EXPECTED_FINALIZER_HASHES[name],
                f"aggregate output hash mismatch {name}")
        require(metadata["bytes"] == (finalizer / name).stat().st_size,
                f"aggregate output byte mismatch {name}")

    games = normalize_csv_games(finalizer / "games.csv")
    require(len(games) == 2700, "games row count mismatch")
    require(sorted(row["gameIndex"] for row in games) == list(range(2700)), "game indices mismatch")

    scheduler_rows: list[dict[str, Any]] = []
    with (finalizer / "scheduler.csv").open(newline="") as handle:
        for raw in csv.DictReader(handle):
            row = dict(raw)
            for key in ("gameIndex", "restarts", "cpus", "elapsedSeconds"):
                row[key] = int(row[key])
            scheduler_rows.append(row)
    require(len(scheduler_rows) == 2700, "scheduler row count mismatch")
    scheduler_by_index = {row["gameIndex"]: row for row in scheduler_rows}
    require(len(scheduler_by_index) == 2700, "duplicate scheduler index")
    require(len({row["jobId"] for row in scheduler_rows}) == 2700, "duplicate scheduler raw job")
    require(all(
        row["state"] == "COMPLETED" and row["exitCode"] == "0:0"
        and row["account"] == "pi_jss233" and row["partition"] == "day"
        and row["restarts"] == 0 and row["cpus"] == 1
        for row in scheduler_rows
    ), "scheduler integrity mismatch")
    for row in games:
        row["schedulerJobId"] = scheduler_by_index[row["gameIndex"]]["jobId"]
        require(str(aggregate["taskJobIds"][str(row["gameIndex"])]) == row["schedulerJobId"],
                f"aggregate scheduler mismatch {row['gameIndex']}")
    live_scheduler = verify_live_scheduler(scheduler_rows, args.sacct) if args.verify_live_scheduler else None

    outcomes = independent_outcomes(games)
    transitions = independent_transitions(games)
    effects = independent_endpoint_effects(games)
    gates = independent_gates(games)
    compare_table(
        outcomes,
        parse_expected_outcomes(finalizer / "outcomes.csv"),
        ("endpoint", "level", *DIMENSION_FIELDS),
        "outcomes",
    )
    compare_table(
        transitions,
        parse_expected_transitions(finalizer / "transitions.csv"),
        ("level", *DIMENSION_FIELDS, "v5Winner", "v5Status", "v6Winner", "v6Status"),
        "transitions",
    )
    compare_table(
        effects,
        parse_expected_effects(finalizer / "endpoint-effects.csv"),
        ("level", "cohort", "mapId", "arm"),
        "endpoint-effects",
    )
    compare_nested(gates, expected_gates, "gates")

    with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as executor:
        futures = [
            executor.submit(audit_cell, root, row, manifest)
            for row in games
        ]
        cells = [future.result() for future in futures]
    cells.sort(key=lambda value: value["gameIndex"])
    for value in cells:
        require(
            aggregate["caseHashes"][str(value["gameIndex"])] == value["caseSha256"],
            f"aggregate case hash mismatch {value['gameIndex']}",
        )
    require(sum(value["cell"]["result"]["updates"] for value in cells) ==
            aggregate["technical"]["totalUpdates"], "aggregate update total mismatch")
    require(sum(value["ledger"]["records"] for value in cells) ==
            aggregate["technical"]["totalLedgerRecords"], "aggregate record total mismatch")
    require(sum(value["ledger"]["plainBytes"] for value in cells) ==
            aggregate["technical"]["totalPlainBytes"], "aggregate plain-byte total mismatch")
    require(sum(value["ledger"]["gzipBytes"] for value in cells) ==
            aggregate["technical"]["totalGzipBytes"], "aggregate gzip-byte total mismatch")
    require(max(value["ledger"]["gzipBytes"] for value in cells) ==
            aggregate["technical"]["maxGzipBytesPerGame"], "aggregate max gzip mismatch")
    require(aggregate["technical"]["gamesVerified"] == len(cells) ==
            aggregate["technical"]["ledgersStreamVerified"], "aggregate verified count mismatch")

    action_multiplicity: dict[str, list[int]] = collections.defaultdict(list)
    for value in cells:
        action_multiplicity[value["action"]["sha256"]].append(value["gameIndex"])
    duplicates = {key: indices for key, indices in action_multiplicity.items() if len(indices) > 1}
    require(len(action_multiplicity) == EXPECTED_ACTION_DISTINCT, "action distinct-count mismatch")
    require(len(duplicates) == EXPECTED_ACTION_DUPLICATE_VALUES, "action duplicate-value count mismatch")
    require(max(map(len, action_multiplicity.values())) == EXPECTED_ACTION_MAX_MULTIPLICITY,
            "action maximum multiplicity mismatch")
    game_by_index = {row["gameIndex"]: row for row in games}
    for digest, indices in duplicates.items():
        require(len(indices) == 2, f"unexpected action hash multiplicity {digest}")
        left, right = [game_by_index[index] for index in indices]
        require(
            left["cohort"] == right["cohort"] == "peak"
            and {left["arm"], right["arm"]} == {"deployed", "strategy_both"}
            and left["caseIndex"] == right["caseIndex"]
            and left["ledgerPlainSha256"] == right["ledgerPlainSha256"]
            and left["v5"] == right["v5"] and left["v6"] == right["v6"],
            f"unexplained duplicate action hash {digest}",
        )

    action_games: list[dict[str, Any]] = []
    action_methods: list[dict[str, Any]] = []
    corpse_rows: list[dict[str, Any]] = []
    side_rows: list[dict[str, Any]] = []
    global_calls = 0
    global_corpse = 0
    for value in cells:
        row = game_by_index[value["gameIndex"]]
        action = value["action"]
        global_calls += action["callCount"]
        global_corpse += action["zeroHealthBuildingTargetRequests"]["count"]
        common = {
            key: row[key] for key in (
                "gameIndex", "caseIndex", "cohort", "mapId", "arm", "opponent",
                "country", "candidateStart", "opponentStart", "candidateSlot",
                "repeatIndex", "pairIndex", "pairId", "requestedEngineSeed", "updates",
            )
        }
        common["mapFamily"] = map_family(row["mapId"])
        game_output = {
            **common,
            "actionSha256": action["sha256"],
            "actionCalls": action["callCount"],
            "corpseTargetRequests": action["zeroHealthBuildingTargetRequests"]["count"],
        }
        for side in SIDES:
            methods = value["sideMethod"][side]
            side_corpse = sum(
                count for key, count in action["zeroHealthBuildingTargetRequests"]["bySideAndRulesName"].items()
                if key.startswith(side + ".")
            )
            metrics = action_metrics(methods, side_corpse, row["updates"])
            side_row = {**common, "side": side, **metrics}
            side_rows.append(side_row)
            game_output[f"{side}Calls"] = int(metrics["totalCalls"])
            game_output[f"{side}CallsPer900"] = metrics["callsPer900"]
            game_output[f"{side}CorpseTargets"] = int(metrics["corpseTargets"])
            for method in ACTION_METHODS:
                action_methods.append({
                    **common,
                    "side": side,
                    "method": method,
                    "calls": methods[method],
                    "callsPer900": methods[method] * 900.0 / row["updates"],
                })
        action_games.append(game_output)
        for key, count in sorted(action["zeroHealthBuildingTargetRequests"]["bySideAndRulesName"].items()):
            side, rules_name = key.split(".", 1)
            corpse_rows.append({**common, "side": side, "rulesName": rules_name, "count": count})

    require(global_calls == sum(row["actionCalls"] for row in games), "global action-call mismatch")
    require(global_corpse == sum(row["corpseTargetRequests"] for row in games), "global corpse CSV mismatch")
    require(global_corpse == aggregate["technical"]["corpseTargetRequests"], "global corpse aggregate mismatch")

    summary_levels = (
        ("overall", ()),
        ("arm_opponent", ("cohort", "arm", "opponent")),
        ("arm_opponent_map", ("cohort", "arm", "opponent", "mapId")),
        ("arm_opponent_family", ("cohort", "arm", "opponent", "mapFamily")),
        ("arm_opponent_country", ("cohort", "arm", "opponent", "country")),
        ("arm_opponent_candidate_start", ("cohort", "arm", "opponent", "candidateStart")),
        ("arm_opponent_opponent_start", ("cohort", "arm", "opponent", "opponentStart")),
        ("arm_opponent_slot", ("cohort", "arm", "opponent", "candidateSlot")),
        ("map_country_start", ("cohort", "arm", "opponent", "mapId", "country", "candidateStart")),
        (
            "full_stratum",
            ("cohort", "arm", "opponent", "mapId", "country", "candidateStart",
             "opponentStart", "candidateSlot"),
        ),
    )
    metric_names = tuple(key for key in side_rows[0] if key not in {
        "gameIndex", "caseIndex", "cohort", "mapId", "mapFamily", "arm", "opponent",
        "country", "candidateStart", "opponentStart", "candidateSlot", "repeatIndex",
        "pairIndex", "pairId", "requestedEngineSeed", "updates", "side",
    })
    action_summaries: list[dict[str, Any]] = []
    for level, fields in summary_levels:
        for values, members in group_rows(side_rows, (*fields, "side")):
            dims = {field: value for field, value in zip((*fields, "side"), values)}
            for metric in metric_names:
                action_summaries.append({
                    "level": level,
                    **dims,
                    "metric": metric,
                    **distribution([float(row[metric]) for row in members]),
                })

    contrast_observations: list[dict[str, Any]] = []
    side_by_game = {
        (row["gameIndex"], row["side"]): row for row in side_rows
    }
    contrast_metrics = (
        "totalCalls", "callsPer900", "orderCalls", "orderCallsPer900",
        "corpseTargets", "corpseTargetsPer900",
    )
    for row in games:
        candidate = side_by_game[(row["gameIndex"], "candidate")]
        baseline = side_by_game[(row["gameIndex"], "baseline")]
        for metric in contrast_metrics:
            contrast_observations.append({
                **{key: candidate[key] for key in (
                    "cohort", "arm", "opponent", "mapId", "mapFamily", "country",
                    "candidateStart", "candidateSlot", "caseIndex",
                )},
                "contrastType": "within_game_candidate_minus_opponent",
                "controlArm": "opponent_side",
                "metric": metric,
                "difference": float(candidate[metric]) - float(baseline[metric]),
            })
    for cohort, candidate_arm, control_arm in (
        ("peak", "strategy_both", "deployed"),
        ("advanced", "deployed", "supalosa_reference"),
    ):
        controls = {
            row["caseIndex"]: side_by_game[(row["gameIndex"], "candidate")]
            for row in games if row["cohort"] == cohort and row["arm"] == control_arm
        }
        candidates = [
            row for row in games if row["cohort"] == cohort and row["arm"] == candidate_arm
        ]
        require(len(controls) == len(candidates), f"{cohort}: action control mismatch")
        for row in candidates:
            candidate = side_by_game[(row["gameIndex"], "candidate")]
            control = controls[row["caseIndex"]]
            for metric in contrast_metrics:
                contrast_observations.append({
                    **{key: candidate[key] for key in (
                        "cohort", "arm", "opponent", "mapId", "mapFamily", "country",
                        "candidateStart", "candidateSlot", "caseIndex",
                    )},
                    "contrastType": "candidate_arm_minus_control_arm",
                    "controlArm": control_arm,
                    "metric": metric,
                    "difference": float(candidate[metric]) - float(control[metric]),
                })

    contrast_groups: dict[tuple[Any, ...], list[dict[str, Any]]] = collections.defaultdict(list)
    for row in contrast_observations:
        key = (
            row["contrastType"], row["cohort"], row["arm"], row["controlArm"],
            row["opponent"], row["metric"],
        )
        contrast_groups[key].append(row)
        contrast_groups[(*key, "map", row["mapId"])].append(row)
        contrast_groups[(*key, "family", row["mapFamily"])].append(row)

    action_contrasts: list[dict[str, Any]] = []
    for key, members in sorted(contrast_groups.items(), key=lambda item: canonical(item[0])):
        if len(key) == 6:
            base = key
            scope, scope_value = "overall", ""
        else:
            base = key[:6]
            scope, scope_value = key[6], key[7]
        derived_seed = BOOTSTRAP_SEED
        intervals = bootstrap_intervals(members, "difference", derived_seed)
        differences = [float(row["difference"]) for row in members]
        action_contrasts.append({
            "contrastType": base[0],
            "cohort": base[1],
            "arm": base[2],
            "controlArm": base[3],
            "opponent": base[4],
            "metric": base[5],
            "scope": scope,
            "scopeValue": scope_value,
            "n": len(members),
            "positive": sum(value > 0 for value in differences),
            "zero": sum(value == 0 for value in differences),
            "negative": sum(value < 0 for value in differences),
            "bootstrapBaseSeed": BOOTSTRAP_SEED,
            "bootstrapDerivedSeed": derived_seed,
            "bootstrapReplicates": BOOTSTRAP_REPLICATES,
            **intervals,
        })

    output = args.output.resolve()
    output.mkdir(parents=True, exist_ok=False)
    csv_write(output / "action-games.csv", action_games)
    csv_write(output / "action-methods.csv", action_methods)
    csv_write(output / "action-summaries.csv", action_summaries)
    csv_write(output / "action-contrasts.csv", action_contrasts)
    csv_write(output / "corpse-targets.csv", corpse_rows if corpse_rows else [{
        "gameIndex": "", "caseIndex": "", "cohort": "", "mapId": "", "arm": "",
        "opponent": "", "country": "", "candidateStart": "", "opponentStart": "",
        "candidateSlot": "", "repeatIndex": "", "pairIndex": "", "pairId": "",
        "requestedEngineSeed": "", "updates": "", "mapFamily": "", "side": "",
        "rulesName": "", "count": 0,
    }])
    csv_write(output / "independent-outcomes.csv", outcomes)
    csv_write(output / "independent-transitions.csv", transitions)
    csv_write(output / "independent-endpoint-effects.csv", effects)
    json_write(output / "independent-gates.json", gates)

    output_hashes = {}
    for path in sorted(output.iterdir()):
        if path.is_file():
            digest = sha256_file(path)
            output_hashes[path.name] = {"sha256": digest, "bytes": path.stat().st_size}
            (output / f"{path.name}.sha256").write_text(f"{digest}  {path.name}\n")
    audit = {
        "kind": "fresh-dual-v2-independent-action-audit-a1",
        "complete": True,
        "passed": True,
        "sourceCommit": EXPECTED_SOURCE,
        "analysisSourceCommit": args.analysis_source_commit,
        "analysisProgramSha256": program_sha256,
        "runtimeProvenance": runtime_provenance,
        "execution": {
            "jobId": os.environ.get("SLURM_JOB_ID"),
            "jobAccount": os.environ.get("SLURM_JOB_ACCOUNT"),
            "jobPartition": os.environ.get("SLURM_JOB_PARTITION"),
            "cpus": os.environ.get("SLURM_CPUS_PER_TASK"),
            "python": sys.version,
        },
        "evidenceRoot": str(root),
        "manifestSha256": EXPECTED_MANIFEST_SHA256,
        "arrayJobId": EXPECTED_ARRAY_JOB,
        "finalizerJobId": EXPECTED_FINALIZER_JOB,
        "finalizerHashes": EXPECTED_FINALIZER_HASHES,
        "scheduler": {
            "rows": len(scheduler_rows),
            "uniqueRawJobIds": len({row["jobId"] for row in scheduler_rows}),
            "live": live_scheduler,
        },
        "counts": {
            "games": len(games),
            "cells": len(cells),
            "ledgers": len(cells),
            "actionMethodRows": len(action_methods),
            "actionSummaryRows": len(action_summaries),
            "actionContrastRows": len(action_contrasts),
            "distinctActionHashValues": len(action_multiplicity),
            "duplicateActionHashValues": len(duplicates),
            "maximumActionHashMultiplicity": max(map(len, action_multiplicity.values())),
        },
        "global": {
            "actionCalls": global_calls,
            "corpseTargetRequests": global_corpse,
        },
        "independentAgreement": {
            "outcomes": True,
            "transitions": True,
            "mapAwareEndpointEffects": True,
            "gates": True,
        },
        "bootstrap": {
            "baseSeed": BOOTSTRAP_SEED,
            "replicates": BOOTSTRAP_REPLICATES,
            "cluster": ["mapId", "country", "candidateStart"],
            "intervals": ["percentile90", "percentile95"],
        },
        "interpretation": {
            "actionCountsAreWholeGame": True,
            "rollingBurstsAvailable": False,
            "arbiterReserveIdentifiable": False,
            "causalPolicyStrengthClaim": False,
        },
        "outputsBeforeAudit": output_hashes,
    }
    json_write(output / "audit.json", audit)
    audit_hash = sha256_file(output / "audit.json")
    (output / "audit.json.sha256").write_text(f"{audit_hash}  audit.json\n")
    (output / "COMPLETE").write_text("COMPLETE_FRESH_DUAL_V2_INDEPENDENT_ACTION_AUDIT_A1\n")
    return {**audit, "auditSha256": audit_hash, "output": str(output)}


def parse_args(argv: Sequence[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--workers", type=int, default=8)
    parser.add_argument("--sacct", default="/opt/slurm/current/bin/sacct")
    parser.add_argument("--verify-live-scheduler", action="store_true")
    parser.add_argument("--analysis-source-commit", required=True)
    parser.add_argument("--program-sha256", required=True)
    args = parser.parse_args(argv)
    require(1 <= args.workers <= 16, "workers must be in [1,16]")
    return args


def main(argv: Sequence[str] | None = None) -> int:
    args = parse_args(sys.argv[1:] if argv is None else argv)
    try:
        result = run(args)
    except Exception as error:
        print(json.dumps({
            "complete": False,
            "passed": False,
            "error": str(error),
            "type": type(error).__name__,
        }, sort_keys=True), file=sys.stderr)
        return 1
    print(json.dumps({
        "complete": True,
        "passed": True,
        "output": result["output"],
        "auditSha256": result["auditSha256"],
        "games": result["counts"]["games"],
        "actionCalls": result["global"]["actionCalls"],
        "corpseTargetRequests": result["global"]["corpseTargetRequests"],
    }, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
