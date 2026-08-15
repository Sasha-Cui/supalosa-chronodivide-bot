#!/usr/bin/env python3
"""Freeze and finalize the outcome-blind V5 map-deployability repair gate."""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import os
import re
import stat
import subprocess
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from statistics import NormalDist
from typing import Any


ORIGINAL_TARGETS_SHA256 = "6b9ec4b0704db15b7b01bd05839228da005abb192aeda9953f88841aa59f2766"
RESERVE_SCREEN_SHA256 = "d33e9e9537041ac26db5e14eca8b03d2488360220276a5bba52ce206a41a7b75"
BASELINE_COMMIT = "165b77a71d0cf5ebd27c65b19d0486bcbae78d0f"
ENGINE_SEED_BASE = 4_231_000_000
TARGET_TICK = 600
COUNTRIES = [
    "Americans", "Alliance", "French", "Germans", "British",
    "Africans", "Arabs", "Confederation", "Russians",
]
DEVELOPMENT_MEAN_EFFECT = 0.01388888888888889
DEVELOPMENT_FAMILY_EFFECT_SAMPLE_SD = 0.035258208823444021
FORBIDDEN_KEY = re.compile(
    r"(^|_)(winner|loser|loss|draw|score|credit|resource|surviving|"
    r"policy_action|terminal_orientation|literal_outcome)($|_)",
    re.IGNORECASE,
)


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def canonical_sha256(value: Any) -> str:
    payload = json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
    return hashlib.sha256(payload.encode()).hexdigest()


def load_json(path: Path) -> Any:
    return json.loads(path.read_text())


def write_exclusive_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    flags = os.O_WRONLY | os.O_CREAT | os.O_EXCL
    descriptor = os.open(path, flags, 0o600)
    with os.fdopen(descriptor, "w") as handle:
        json.dump(value, handle, indent=2, sort_keys=True)
        handle.write("\n")


def git(repo: Path, *args: str) -> str:
    return subprocess.check_output(["git", "-C", str(repo), *args], text=True).strip()


def parse_ini(path: Path) -> dict[str, dict[str, str]]:
    sections: dict[str, dict[str, str]] = {}
    current: dict[str, str] | None = None
    for raw in path.read_text(encoding="latin1").lstrip("\ufeff").splitlines():
        line = raw.strip()
        if not line or line.startswith((";", "#")):
            continue
        match = re.fullmatch(r"\[([^]]+)]", line)
        if match:
            current = sections.setdefault(match.group(1).strip().lower(), {})
            continue
        if current is None or "=" not in line:
            continue
        key, value = line.split("=", 1)
        current.setdefault(key.strip().lower(), value.split(";", 1)[0].strip())
    return sections


def map_descriptor(
    path: Path,
    family_id: str,
    source_tier: str,
    source_ordinal: int,
    source_name: str,
    rank_sha256: str | None = None,
    source_sha1: str | None = None,
) -> dict[str, Any]:
    resolved = path.resolve(strict=True)
    file_stat = resolved.lstat()
    if not stat.S_ISREG(file_stat.st_mode) or resolved.is_symlink():
        raise RuntimeError(f"Map is not a regular non-symlink file: {resolved}")
    ini = parse_ini(resolved)
    theater = ini.get("map", {}).get("theater", "").upper()
    waypoints = ini.get("waypoints", {})
    starts = []
    for waypoint in range(8):
        raw = waypoints.get(str(waypoint))
        if raw in (None, "", "-1", "0", "0,0"):
            continue
        if not re.fullmatch(r"\d+", raw):
            raise RuntimeError(f"Invalid start waypoint {waypoint} in {resolved}")
        encoded = int(raw)
        starts.append({
            "waypoint": waypoint,
            "encoded": encoded,
            "x": encoded % 1000,
            "y": encoded // 1000,
        })
    if theater != "TEMPERATE" or [row["waypoint"] for row in starts] != [0, 1]:
        raise RuntimeError(f"Map lacks the frozen two-start TEMPERATE invariant: {resolved}")
    if len({(row["x"], row["y"]) for row in starts}) != 2:
        raise RuntimeError(f"Map start locations are not distinct: {resolved}")
    return {
        "familyId": family_id,
        "sourceTier": source_tier,
        "sourceOrdinal": source_ordinal,
        "sourceName": source_name,
        "rankSha256": rank_sha256,
        "sourceSha1": source_sha1,
        "mapPath": str(resolved),
        "mapName": resolved.name,
        "mapBytes": file_stat.st_size,
        "mapSha256": sha256_file(resolved),
        "theater": theater,
        "declaredStartLocations": starts,
    }


def validate_generation_sources(original_path: Path, reserve_path: Path) -> tuple[Any, Any]:
    if sha256_file(original_path) != ORIGINAL_TARGETS_SHA256:
        raise RuntimeError("Original V5 target manifest bytes drifted")
    if sha256_file(reserve_path) != RESERVE_SCREEN_SHA256:
        raise RuntimeError("Reserve byte-screen bytes drifted")
    original = load_json(original_path)
    reserve = load_json(reserve_path)
    if not (
        isinstance(original, dict)
        and original.get("schemaVersion") == 1
        and original.get("status") == "ROLE_BLIND_FIDELITY_SCREEN_TARGETS_NOT_A_SPLIT"
        and original.get("outcomeBlind") is True
        and original.get("notPolicyEvidence") is True
        and original.get("targetCount") == 56
        and isinstance(original.get("targets"), list)
        and len(original["targets"]) == 56
    ):
        raise RuntimeError("Original V5 target manifest schema is invalid")
    if not (
        isinstance(reserve, dict)
        and reserve.get("schemaVersion") == 1
        and reserve.get("kind") == "progress-certified-v5-technical-repair-reserve-byte-screen"
        and reserve.get("outcomeBlind") is True
        and reserve.get("notPolicyEvidence") is True
        and reserve.get("selectedCount") == 70
        and reserve.get("passCount") == 4
        and isinstance(reserve.get("rows"), list)
        and len(reserve["rows"]) == 70
    ):
        raise RuntimeError("Reserve byte-screen schema is invalid")
    return original, reserve


def generate(args: argparse.Namespace) -> None:
    repo = args.repo.resolve(strict=True)
    baseline_repo = args.baseline_repo.resolve(strict=True)
    if git(repo, "branch", "--show-current") != "main":
        raise RuntimeError("Deployability freeze requires main")
    if git(repo, "status", "--short", "--untracked-files=no"):
        raise RuntimeError("Deployability freeze requires a clean tracked tree")
    source_commit = git(repo, "rev-parse", "HEAD")
    if source_commit != git(repo, "rev-parse", "fork/main"):
        raise RuntimeError("Deployability freeze requires pushed fork/main")
    if git(baseline_repo, "rev-parse", "HEAD") != BASELINE_COMMIT:
        raise RuntimeError("External Supalosa commit drifted")
    if git(baseline_repo, "status", "--short", "--untracked-files=no"):
        raise RuntimeError("External Supalosa tracked tree is dirty")
    original, reserve = validate_generation_sources(args.original_targets, args.reserve_screen)

    families = []
    for ordinal, raw in enumerate(original["targets"]):
        if not isinstance(raw, dict) or not isinstance(raw.get("representative"), dict):
            raise RuntimeError(f"Original family {ordinal} is malformed")
        representative = raw["representative"]
        descriptor = map_descriptor(
            repo / representative["path"], raw["familyId"], "original", ordinal,
            Path(representative["path"]).stem,
        )
        if descriptor["mapSha256"] != representative["sha256"]:
            raise RuntimeError(f"Original family {ordinal} map bytes drifted")
        families.append(descriptor)

    passing = [row for row in reserve["rows"] if row.get("byteScreenPass") is True]
    passing.sort(key=lambda row: (row["rankSha256"], row["sourceSha1"]))
    for ordinal, raw in enumerate(passing):
        descriptor = map_descriptor(
            Path(raw["mapPath"]), raw["familyId"], "reserve", ordinal,
            raw["sourceName"], raw["rankSha256"], raw["sourceSha1"],
        )
        if descriptor["mapBytes"] != raw["bytes"] or descriptor["mapSha256"] != raw["sha256"]:
            raise RuntimeError(f"Reserve family {raw['familyId']} map bytes drifted")
        families.append(descriptor)

    if len(families) != 60 or len({row["familyId"] for row in families}) != 60:
        raise RuntimeError("Deployability candidate population is not exactly 60 unique families")
    for ordinal, family in enumerate(families):
        family["candidateOrdinal"] = ordinal
    campaign = {
        "schemaVersion": 1,
        "kind": "progress-certified-v5-outcome-blind-map-deployability-repair",
        "status": "FROZEN_BEFORE_ANY_DEPLOYABILITY_ENGINE_EXECUTION",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "outcomeBlind": True,
        "notPolicyEvidence": True,
        "sourceGitCommit": source_commit,
        "baselineGitCommit": BASELINE_COMMIT,
        "schedulerAccount": "pi_jss233",
        "engineSeedBase": ENGINE_SEED_BASE,
        "targetTick": TARGET_TICK,
        "countries": COUNTRIES,
        "gameSettings": {
            "shortGame": False, "credits": 10_000, "gameSpeed": 6,
            "mcvRepacks": True, "cratesAppear": False, "superWeapons": False,
            "unitCount": 0, "buildOffAlly": False, "online": False,
        },
        "reciprocalOrders": [["alpha", "beta"], ["beta", "alpha"]],
        "familyCount": 60,
        "countryCount": 9,
        "ordersPerCell": 2,
        "cellTaskCount": 540,
        "launchedGameCount": 1080,
        "selectionRule": (
            "retain passing original families in frozen order; append passing reserve families "
            "by (rankSha256,sourceSha1); stop at 56"
        ),
        "sourceArtifacts": {
            "originalTargetsPath": str(args.original_targets.resolve()),
            "originalTargetsSha256": ORIGINAL_TARGETS_SHA256,
            "reserveScreenPath": str(args.reserve_screen.resolve()),
            "reserveScreenSha256": RESERVE_SCREEN_SHA256,
        },
        "populationSha256": canonical_sha256(families),
        "candidateFamilies": families,
    }
    write_exclusive_json(args.output, campaign)
    print(json.dumps({
        "campaign": str(args.output.resolve()),
        "campaignSha256": sha256_file(args.output),
        "populationSha256": campaign["populationSha256"],
        "familyCount": 60,
        "cellTaskCount": 540,
        "launchedGameCount": 1080,
    }, sort_keys=True))


def find_forbidden_key(value: Any) -> str | None:
    stack = [value]
    while stack:
        item = stack.pop()
        if isinstance(item, dict):
            for key, child in item.items():
                if FORBIDDEN_KEY.search(key):
                    return key
                stack.append(child)
        elif isinstance(item, list):
            stack.extend(item)
    return None


def scheduler_tasks(array_job_id: str, expected_count: int) -> dict[int, str]:
    raw = subprocess.check_output([
        "/opt/slurm/current/bin/sacct", "-j", array_job_id, "-n", "-P", "-X",
        "--format=JobID,JobIDRaw,State,ExitCode,Account",
    ], text=True)
    tasks: dict[int, str] = {}
    pattern = re.compile(rf"^{re.escape(array_job_id)}_(\d+)$")
    for line in raw.splitlines():
        if not line:
            continue
        fields = line.split("|")
        if len(fields) != 5:
            raise RuntimeError("Malformed sacct row")
        logical, raw_id, state, exit_code, account = fields
        match = pattern.fullmatch(logical)
        if not match:
            continue
        index = int(match.group(1))
        if (
            index in tasks or index < 0 or index >= expected_count or not raw_id.isdigit()
            or state != "COMPLETED" or exit_code != "0:0" or account != "pi_jss233"
        ):
            raise RuntimeError(f"Failed, duplicate, or unauthorized scheduler row: {line}")
        tasks[index] = raw_id
    if len(tasks) != expected_count:
        raise RuntimeError(f"Scheduler has {len(tasks)}/{expected_count} clean array tasks")
    return tasks


def validate_campaign(campaign: Any, campaign_path: Path) -> dict[str, Any]:
    if not (
        isinstance(campaign, dict)
        and campaign.get("schemaVersion") == 1
        and campaign.get("kind") == "progress-certified-v5-outcome-blind-map-deployability-repair"
        and campaign.get("status") == "FROZEN_BEFORE_ANY_DEPLOYABILITY_ENGINE_EXECUTION"
        and campaign.get("outcomeBlind") is True
        and campaign.get("notPolicyEvidence") is True
        and campaign.get("baselineGitCommit") == BASELINE_COMMIT
        and campaign.get("schedulerAccount") == "pi_jss233"
        and campaign.get("engineSeedBase") == ENGINE_SEED_BASE
        and campaign.get("targetTick") == TARGET_TICK
        and campaign.get("countries") == COUNTRIES
        and campaign.get("familyCount") == 60
        and campaign.get("cellTaskCount") == 540
        and campaign.get("launchedGameCount") == 1080
        and isinstance(campaign.get("candidateFamilies"), list)
        and len(campaign["candidateFamilies"]) == 60
        and campaign.get("populationSha256") == canonical_sha256(campaign["candidateFamilies"])
    ):
        raise RuntimeError(f"Invalid deployability campaign: {campaign_path}")
    return campaign


def validate_cell(
    value: Any,
    task_index: int,
    scheduler_id: str,
    array_job_id: str,
    campaign: dict[str, Any],
) -> list[str]:
    forbidden = find_forbidden_key(value)
    if forbidden:
        raise RuntimeError(f"Task {task_index} emits forbidden outcome field {forbidden}")
    family_ordinal = task_index // 9
    country_ordinal = task_index % 9
    family = campaign["candidateFamilies"][family_ordinal]
    country = COUNTRIES[country_ordinal]
    expected_seed = ENGINE_SEED_BASE + task_index
    errors = []
    if not (
        isinstance(value, dict)
        and value.get("schemaVersion") == 1
        and value.get("kind") == "progress-certified-v5-outcome-blind-map-deployability-cell"
        and value.get("outcomeBlind") is True
        and value.get("notPolicyEvidence") is True
        and value.get("taskIndex") == task_index
        and value.get("familyOrdinal") == family_ordinal
        and value.get("familyId") == family["familyId"]
        and value.get("mapSha256") == family["mapSha256"]
        and value.get("countryOrdinal") == country_ordinal
        and value.get("country") == country
        and value.get("requestedEngineSeed") == expected_seed
        and value.get("targetTick") == TARGET_TICK
        and value.get("populationSha256") == campaign["populationSha256"]
        and value.get("sourceGitCommit") == campaign["sourceGitCommit"]
        and value.get("baselineGitCommit") == BASELINE_COMMIT
        and all(
            re.fullmatch(r"[0-9a-f]{64}", str(value.get(key, "")))
            for key in (
                "sourceRuntimeSha256", "baselineRuntimeSha256",
                "gameApiRuntimeSha256", "packageLockSha256",
            )
        )
        and isinstance(value.get("scheduler"), dict)
        and str(value["scheduler"].get("arrayJobId")) == array_job_id
        and str(value["scheduler"].get("arrayTaskId")) == str(task_index)
        and str(value["scheduler"].get("jobId")) == scheduler_id
        and value["scheduler"].get("account") == "pi_jss233"
        and isinstance(value.get("mapLoadAttestation"), dict)
        and value["mapLoadAttestation"].get("complete") is True
        and value["mapLoadAttestation"].get("expectedBytes") == family["mapBytes"]
        and value["mapLoadAttestation"].get("expectedSha256") == family["mapSha256"]
        and value["mapLoadAttestation"].get("phases") == [
            {"phase": "initialization", "expectedReads": 1, "observedReads": 1},
            {"phase": "forward_create", "expectedReads": 2, "observedReads": 2},
            {"phase": "reverse_create", "expectedReads": 2, "observedReads": 2},
        ]
        and isinstance(value.get("orders"), list)
        and len(value["orders"]) == 2
        and isinstance(value.get("validationErrors"), list)
        and all(isinstance(item, str) for item in value["validationErrors"])
    ):
        raise RuntimeError(f"Task {task_index} failed structural/provenance validation")
    errors.extend(value["validationErrors"])
    technical_pass = value.get("reciprocalStartSwap") is True
    for index, order in enumerate(value["orders"]):
        expected_order = ["alpha", "beta"] if index == 0 else ["beta", "alpha"]
        order_pass = (
            isinstance(order, dict)
            and order.get("order") == expected_order
            and order.get("requestedEngineSeed") == expected_seed
            and isinstance(order.get("initialTick"), int)
            and isinstance(order.get("finalTick"), int)
            and isinstance(order.get("updateCount"), int)
            and order.get("tickArithmeticConsistent") is True
            and order.get("distinctStarts") is True
            and order.get("startsDeclared") is True
            and order.get("alphaEstablished") is True
            and order.get("betaEstablished") is True
            and isinstance(order.get("alphaFirstBuildingTick"), int)
            and isinstance(order.get("betaFirstBuildingTick"), int)
            and 0 <= order["alphaFirstBuildingTick"] <= TARGET_TICK
            and 0 <= order["betaFirstBuildingTick"] <= TARGET_TICK
            and order.get("error") is None
            and order.get("warningCaptureTruncated") is False
            and order.get("failureCategories") == []
        )
        technical_pass = technical_pass and order_pass
    passed = len(errors) == 0 and technical_pass
    if not technical_pass and not errors:
        raise RuntimeError(f"Task {task_index} hides a technical failure behind an empty error list")
    if value.get("passed") is not passed or value.get("status") != (
        "PASS_DEPLOYABILITY_CELL" if passed else "FAIL_DEPLOYABILITY_CELL"
    ):
        raise RuntimeError(f"Task {task_index} pass flag is inconsistent")
    private = value.get("privateDiagnostics")
    if not (
        isinstance(private, dict)
        and isinstance(private.get("path"), str)
        and re.fullmatch(r"[0-9a-f]{64}", str(private.get("sha256", "")))
        and Path(private["path"]).is_file()
        and sha256_file(Path(private["path"])) == private["sha256"]
    ):
        raise RuntimeError(f"Task {task_index} private diagnostics drifted")
    return errors


def finalize(args: argparse.Namespace) -> None:
    if os.environ.get("SLURM_JOB_ACCOUNT") != "pi_jss233":
        raise RuntimeError("Deployability finalizer must run under Slurm account pi_jss233")
    campaign = validate_campaign(load_json(args.campaign), args.campaign)
    if sha256_file(args.campaign) != args.campaign_sha256:
        raise RuntimeError("Deployability campaign SHA-256 drifted")
    repo = args.repo.resolve(strict=True)
    if git(repo, "branch", "--show-current") != "main" or git(repo, "status", "--short", "--untracked-files=no"):
        raise RuntimeError("Deployability finalizer requires clean tracked main")
    if git(repo, "rev-parse", "HEAD") != campaign["sourceGitCommit"]:
        raise RuntimeError("Deployability finalizer source commit drifted")
    tasks = scheduler_tasks(args.array_job_id, campaign["cellTaskCount"])
    failures: Counter[str] = Counter()
    family_passes = [True] * campaign["familyCount"]
    cells = []
    for task_index in range(campaign["cellTaskCount"]):
        path = args.results_root / f"task-{task_index:03d}" / "cell.json"
        value = load_json(path)
        errors = validate_cell(value, task_index, tasks[task_index], args.array_job_id, campaign)
        family_ordinal = task_index // 9
        if errors:
            family_passes[family_ordinal] = False
            failures.update(errors)
        cells.append({
            "taskIndex": task_index,
            "familyOrdinal": family_ordinal,
            "country": COUNTRIES[task_index % 9],
            "passed": not errors,
            "validationErrors": errors,
            "artifactPath": str(path.resolve()),
            "artifactSha256": sha256_file(path),
            "schedulerJobId": tasks[task_index],
        })

    eligible = [
        family for family, passed in zip(campaign["candidateFamilies"], family_passes) if passed
    ]
    original = [row for row in eligible if row["sourceTier"] == "original"]
    reserve = sorted(
        (row for row in eligible if row["sourceTier"] == "reserve"),
        key=lambda row: (row["rankSha256"], row["sourceSha1"]),
    )
    selected = (original + reserve)[:56]
    n = len(selected)
    z_critical = NormalDist().inv_cdf(0.95)
    noncentrality = DEVELOPMENT_MEAN_EFFECT * math.sqrt(n) / DEVELOPMENT_FAMILY_EFFECT_SAMPLE_SD
    approximate_power = NormalDist().cdf(noncentrality - z_critical)
    output = {
        "schemaVersion": 1,
        "kind": "progress-certified-v5-outcome-blind-map-deployability-summary",
        "status": "COMPLETE_TECHNICAL_SELECTION_NOT_POLICY_EVIDENCE",
        "outcomeBlind": True,
        "notPolicyEvidence": True,
        "campaignPath": str(args.campaign.resolve()),
        "campaignSha256": args.campaign_sha256,
        "arrayJobId": args.array_job_id,
        "schedulerAccount": "pi_jss233",
        "cellTaskCount": 540,
        "launchedGameCount": 1080,
        "candidateFamilyCount": 60,
        "eligibleOriginalFamilyCount": len(original),
        "eligibleReserveFamilyCount": len(reserve),
        "selectedFamilyCount": n,
        "failureCounts": dict(sorted(failures.items())),
        "selectedPopulationSha256": canonical_sha256(selected),
        "powerRecalculation": {
            "unit": "family",
            "familyCount": n,
            "developmentMeanEffect": DEVELOPMENT_MEAN_EFFECT,
            "developmentFamilyEffectSampleSd": DEVELOPMENT_FAMILY_EFFECT_SAMPLE_SD,
            "alpha": 0.05,
            "sidedness": "one-sided",
            "method": "normal approximation at the frozen development effect and sample SD",
            "criticalZ": z_critical,
            "noncentrality": noncentrality,
            "approximatePower": approximate_power,
        },
        "selectedFamilies": selected,
        "familyTechnicalPass": [
            {"familyOrdinal": index, "familyId": family["familyId"], "passed": family_passes[index]}
            for index, family in enumerate(campaign["candidateFamilies"])
        ],
        "cells": cells,
    }
    write_exclusive_json(args.output, output)
    print(json.dumps({
        "output": str(args.output.resolve()),
        "sha256": sha256_file(args.output),
        "eligibleOriginalFamilyCount": len(original),
        "eligibleReserveFamilyCount": len(reserve),
        "selectedFamilyCount": n,
        "approximatePower": approximate_power,
    }, sort_keys=True))


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    freeze = commands.add_parser("freeze")
    freeze.add_argument("--repo", type=Path, required=True)
    freeze.add_argument("--baseline-repo", type=Path, required=True)
    freeze.add_argument("--original-targets", type=Path, required=True)
    freeze.add_argument("--reserve-screen", type=Path, required=True)
    freeze.add_argument("--output", type=Path, required=True)
    freeze.set_defaults(func=generate)
    final = commands.add_parser("finalize")
    final.add_argument("--repo", type=Path, required=True)
    final.add_argument("--campaign", type=Path, required=True)
    final.add_argument("--campaign-sha256", required=True)
    final.add_argument("--results-root", type=Path, required=True)
    final.add_argument("--array-job-id", required=True)
    final.add_argument("--output", type=Path, required=True)
    final.set_defaults(func=finalize)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
