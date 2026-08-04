#!/usr/bin/env python3
"""Prepare and check the Slurm-only, outcome-free map fidelity gate."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable


GATE = "map-fidelity-gate-v1"
EXPECTED_EVIDENCE_FAMILIES = 127
TOOL_SOURCE_PATHS = (
    "packages/chronodivide-bot-driver/src/benchmark/mapFidelityProbe.ts",
    "packages/chronodivide-bot-driver/src/benchmark/mapFidelityProtocol.ts",
    "packages/chronodivide-bot-driver/src/benchmark/seededOfflineGame.ts",
    "research/scripts/map_fidelity_gate.py",
    "research/slurm/map_fidelity_gate_v1.sbatch",
)
CRITICAL_GIT_PATHS = (
    "package-lock.json",
    "packages/chronodivide-bot-driver/package.json",
    "packages/chronodivide-bot-driver/tsconfig.json",
    "packages/chronodivide-bot-driver/src",
    "research/scripts",
    "research/slurm",
    "research/configs",
    "research/artifacts/map_family_catalog.json",
    "research/artifacts/role_blind_fidelity_targets_v1.json",
)
REQUIRED_SECTIONS = (
    "basic",
    "map",
    "waypoints",
    "isomappack5",
    "overlaypack",
    "overlaydatapack",
)
REQUIRED_KEYS = {
    "basic": ("gamemode",),
    "map": ("size", "localsize", "theater"),
}
PAYLOAD_SECTIONS = ("isomappack5", "overlaypack", "overlaydatapack")
FORBIDDEN_OUTCOME_KEYS = (
    "winner",
    "loser",
    "defeated",
    "credits",
    "candidateWins",
    "baselineWins",
    "winRate",
    "scoreRate",
    "score",
    "draws",
    "combatants",
    "units",
    "buildings",
    "playerStats",
    "isFinished",
    "finished",
    "outcome",
)
FORBIDDEN_ROLE_KEYS = (
    "role",
    "dryRunRole",
    "mvpRole",
    "splitRole",
    "selectedForMvp",
    "assignment",
)
WARNING_POLICY = {
    "missing_asset": "fail",
    "unsupported_theater": "fail",
    "invalid_terrain": "review",
    "invalid_object": "review",
    "invalid_rules": "review",
    "invalid_trigger_event": "review",
    "invalid_waypoint": "fail",
    "parse_warning": "fail",
    "unknown_reference": "review",
    "other_warning": "review",
    "engine_error": "fail",
}
OUTCOME_DIAGNOSTIC = re.compile(
    r"\b(?:winner|loser|victor(?:y|ious)?|defeat(?:ed)?|credits?|"
    r"win rate|score rate|score)\b",
    re.IGNORECASE,
)


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def canonical_sha256(value: Any) -> str:
    rendered = json.dumps(
        value,
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=True,
    ).encode("utf-8")
    return hashlib.sha256(rendered).hexdigest()


def exact_file(path: Path) -> dict[str, Any]:
    resolved = path.resolve()
    if not resolved.is_file():
        raise RuntimeError(f"Required exact input is missing: {resolved}")
    return {
        "path": str(resolved),
        "bytes": resolved.stat().st_size,
        "sha256": sha256_file(resolved),
    }


def required_git(repo_root: Path, arguments: list[str]) -> str:
    try:
        completed = subprocess.run(
            ["git", *arguments],
            cwd=repo_root,
            check=True,
            capture_output=True,
            text=True,
        )
    except (OSError, subprocess.CalledProcessError) as error:
        raise RuntimeError(
            "Required Git provenance query failed: git " + " ".join(arguments)
        ) from error
    return completed.stdout.rstrip("\n")


def git_descriptor(repo_root: Path) -> dict[str, Any]:
    status = required_git(
        repo_root, ["status", "--porcelain=v1", "--untracked-files=no"]
    )
    critical_status = required_git(
        repo_root,
        [
            "status",
            "--porcelain=v1",
            "--untracked-files=all",
            "--",
            *CRITICAL_GIT_PATHS,
        ],
    )
    diff = required_git(repo_root, ["diff", "--binary", "--no-ext-diff", "HEAD"])
    return {
        "commit": required_git(repo_root, ["rev-parse", "HEAD"]),
        "branch": required_git(repo_root, ["branch", "--show-current"]),
        "status": status.splitlines() if status else [],
        "criticalStatus": critical_status.splitlines() if critical_status else [],
        "criticalPaths": list(CRITICAL_GIT_PATHS),
        "trackedDiffBytes": len(diff.encode("utf-8")),
        "trackedDiffSha256": hashlib.sha256(diff.encode("utf-8")).hexdigest(),
    }


def assert_clean_committed_source(
    repo_root: Path,
    descriptor: dict[str, Any],
    required_paths: Iterable[Path],
) -> list[str]:
    if not descriptor.get("commit"):
        raise RuntimeError("Cannot establish a source commit for the fidelity gate")
    if descriptor.get("status") or descriptor.get("criticalStatus"):
        raise RuntimeError(
            "Refusing fidelity execution with dirty or untracked critical source: "
            + "; ".join(
                str(line)
                for line in (
                    list(descriptor.get("status", []))
                    + list(descriptor.get("criticalStatus", []))
                )[:20]
            )
        )
    tracked = []
    for path in required_paths:
        resolved = path.resolve()
        try:
            relative = resolved.relative_to(repo_root.resolve()).as_posix()
        except ValueError as error:
            raise RuntimeError(
                f"Required committed input is outside the repository: {resolved}"
            ) from error
        try:
            required_git(
                repo_root, ["ls-files", "--error-unmatch", "--", relative]
            )
        except RuntimeError as error:
            raise RuntimeError(
                f"Required fidelity source/input is not committed: {relative}"
            ) from error
        tracked.append(relative)
    return tracked


def tree_descriptor(root: Path) -> dict[str, Any]:
    resolved = root.resolve()
    if not resolved.is_dir():
        raise RuntimeError(f"Runtime tree is missing: {resolved}")
    entries = []
    for path in sorted(
        (candidate for candidate in resolved.rglob("*") if candidate.is_file()),
        key=lambda candidate: candidate.relative_to(resolved).as_posix(),
    ):
        entries.append({
            "path": path.relative_to(resolved).as_posix(),
            "bytes": path.stat().st_size,
            "sha256": sha256_file(path),
        })
    digest = hashlib.sha256()
    for entry in entries:
        digest.update(str(entry["path"]).encode("utf-8"))
        digest.update(b"\0")
        digest.update(str(entry["bytes"]).encode("ascii"))
        digest.update(b"\0")
        digest.update(str(entry["sha256"]).encode("ascii"))
        digest.update(b"\0")
    return {
        "root": str(resolved),
        "fileCount": len(entries),
        "bytes": sum(int(entry["bytes"]) for entry in entries),
        "sha256": digest.hexdigest(),
        "hashAlgorithm": "sha256(relative_path NUL bytes NUL file_sha256 NUL)",
        "entries": entries,
    }


def bundle_descriptor(members: list[tuple[str, str]]) -> dict[str, Any]:
    digest = hashlib.sha256()
    rendered_members = []
    for label, value in members:
        digest.update(label.encode("utf-8"))
        digest.update(b"\0")
        digest.update(value.encode("utf-8"))
        digest.update(b"\0")
        rendered_members.append({"label": label, "value": value})
    return {
        "hashAlgorithm": "sha256(label NUL value NUL), ordered as recorded",
        "members": rendered_members,
        "sha256": digest.hexdigest(),
    }


def parse_scontrol_line(line: str, job_id: str) -> dict[str, Any]:
    def field(name: str) -> str | None:
        match = re.search(rf"(?:^|\s){re.escape(name)}=([^\s]+)", line)
        return match.group(1) if match else None

    account = field("Account")
    if account != "pi_jss233":
        raise RuntimeError(
            f"Authoritative Slurm account is {account!r}, expected 'pi_jss233'"
        )
    return {
        "jobId": job_id,
        "account": account,
        "partition": field("Partition"),
        "qos": field("QOS"),
        "source": "scontrol",
    }


def authoritative_scheduler() -> dict[str, Any]:
    job_id = os.environ.get("SLURM_JOB_ID")
    if not job_id:
        raise RuntimeError(
            "Map fidelity preparation/checking is Slurm-only; SLURM_JOB_ID is absent"
        )
    scontrol = os.environ.get("SCONTROL", "/opt/slurm/current/bin/scontrol")
    completed = subprocess.run(
        [scontrol, "show", "job", "-o", job_id],
        check=True,
        capture_output=True,
        text=True,
    )
    return parse_scontrol_line(completed.stdout.strip(), job_id)


def parse_map(path: Path) -> dict[str, Any]:
    sections: dict[str, dict[str, str]] = {}
    current = ""
    with path.open("r", encoding="latin-1", errors="replace", newline="") as handle:
        for raw_line in handle:
            line = raw_line.strip()
            if not line or line.startswith((";", "#")):
                continue
            if line.startswith("[") and "]" in line:
                current = line[1:line.index("]")].strip().lower()
                sections.setdefault(current, {})
                continue
            if not current or "=" not in line:
                continue
            key, value = line.split("=", 1)
            sections.setdefault(current, {}).setdefault(
                key.strip().lower(), value.split(";", 1)[0].strip()
            )

    failures = []
    for section in REQUIRED_SECTIONS:
        if section not in sections:
            failures.append(f"missing_required_section:{section}")
    for section, keys in REQUIRED_KEYS.items():
        for key in keys:
            if not sections.get(section, {}).get(key):
                failures.append(f"missing_required_key:{section}.{key}")
    for section in PAYLOAD_SECTIONS:
        if not sections.get(section):
            failures.append(f"empty_payload_section:{section}")

    starts = []
    for key, value in sections.get("waypoints", {}).items():
        if not key.isdigit() or not 0 <= int(key) <= 7:
            continue
        if value in {"", "-1", "0", "0,0"}:
            continue
        try:
            encoded = int(value)
        except ValueError:
            failures.append(f"invalid_waypoint_value:{key}")
            continue
        if encoded <= 0:
            failures.append(f"invalid_waypoint_value:{key}")
            continue
        starts.append({
            "waypoint": int(key),
            "encoded": encoded,
            "x": encoded % 1000,
            "y": encoded // 1000,
        })
    starts.sort(key=lambda record: int(record["waypoint"]))
    start_keys = {(int(record["x"]), int(record["y"])) for record in starts}
    if len(starts) < 2:
        failures.append("fewer_than_two_start_locations")
    if len(start_keys) != len(starts):
        failures.append("duplicate_start_locations")

    return {
        "sections": sorted(sections),
        "requiredSections": {
            section: section in sections for section in REQUIRED_SECTIONS
        },
        "requiredKeys": {
            f"{section}.{key}": bool(sections.get(section, {}).get(key))
            for section, keys in REQUIRED_KEYS.items()
            for key in keys
        },
        "payloadEntryCounts": {
            section: len(sections.get(section, {}))
            for section in PAYLOAD_SECTIONS
        },
        "declaredStartLocations": starts,
        "staticChecks": {
            "requiredSectionsPresent": all(
                section in sections for section in REQUIRED_SECTIONS
            ),
            "requiredKeysPresent": all(
                sections.get(section, {}).get(key)
                for section, keys in REQUIRED_KEYS.items()
                for key in keys
            ),
            "payloadSectionsNonempty": all(
                bool(sections.get(section)) for section in PAYLOAD_SECTIONS
            ),
            "startEnumerationValid": len(starts) >= 2
            and len(start_keys) == len(starts),
            "failures": sorted(set(failures)),
        },
    }


def load_json(path: Path) -> dict[str, Any]:
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise RuntimeError(f"Expected a JSON object in {path}")
    return value


def safe_repo_path(repo_root: Path, relative_path: str) -> Path:
    candidate = (repo_root / relative_path).resolve()
    try:
        candidate.relative_to(repo_root.resolve())
    except ValueError as error:
        raise RuntimeError(f"Path escapes repository: {relative_path}") from error
    return candidate


def select_run_population(
    selected: list[dict[str, Any]], family_limit: int | None
) -> tuple[list[tuple[int, dict[str, Any]]], str]:
    population = sorted(selected, key=lambda item: str(item.get("familyId")))
    indexed_population = list(enumerate(population))
    if family_limit is None:
        return indexed_population, "full"
    if family_limit <= 0 or family_limit > len(indexed_population):
        raise RuntimeError(
            f"Invalid family_limit {family_limit} for population {len(indexed_population)}"
        )
    ranked = sorted(
        indexed_population,
        key=lambda item: hashlib.sha256(
            (
                "map-fidelity-preflight-v1|"
                + str(item[1].get("familyId"))
            ).encode("utf-8")
        ).hexdigest(),
    )
    return sorted(ranked[:family_limit], key=lambda item: item[0]), "preflight"


def representative_map_binding(
    family: dict[str, Any], maps_by_path: dict[str, dict[str, Any]]
) -> dict[str, str]:
    candidates = []
    for raw_path in family.get("mapPaths", []):
        map_path = str(raw_path)
        row = maps_by_path.get(map_path)
        if row is None:
            continue
        checks = row.get("loadVerification", [])
        passed = any(check.get("ok") is True for check in checks)
        failed = any(check.get("ok") is False for check in checks)
        verification_rank = 0 if passed and not failed else 1 if failed else 2
        candidates.append((
            verification_rank,
            map_path.count("/"),
            len(map_path),
            map_path,
            str(row.get("sha256")),
        ))
    if not candidates:
        raise RuntimeError(
            f"Family {family.get('familyId')!r} has no cataloged representative"
        )
    chosen = min(candidates)
    return {
        "path": chosen[3],
        "sha256": chosen[4],
        "selectionRule": (
            "Prefer passed-load content, then failed-load content, then "
            "unverified content; tie-break by path depth, length, and lexical order."
        ),
    }


def build_manifest(
    repo_root: Path,
    targets_path: Path,
    catalog_path: Path,
    mix_dir: Path,
    scheduler: dict[str, Any],
    *,
    target_tick: int = 250,
    engine_seed_base: int = 0x4D465600,
    expected_families: int = EXPECTED_EVIDENCE_FAMILIES,
    node_binary: Path | None = None,
    python_binary: Path | None = None,
    scontrol_binary: Path | None = None,
    family_limit: int | None = None,
    require_clean_source: bool = True,
    debug_logging: str | None = None,
) -> dict[str, Any]:
    repo_root = repo_root.resolve()
    targets_path = targets_path.resolve()
    catalog_path = catalog_path.resolve()
    mix_dir = mix_dir.resolve()
    targets_manifest = load_json(targets_path)
    catalog = load_json(catalog_path)
    if (
        targets_manifest.get("outcomeBlind") is not True
        or targets_manifest.get("roleBlind") is not True
        or targets_manifest.get("finalSplit") is not False
        or targets_manifest.get("isSplit") is not False
    ):
        raise RuntimeError(
            "Fidelity target manifest must declare outcomeBlind=true, "
            "roleBlind=true, finalSplit=false, and isSplit=false"
        )
    if targets_manifest.get("status") != "ROLE_BLIND_FIDELITY_SCREEN_TARGETS_NOT_A_SPLIT":
        raise RuntimeError("Unexpected role-blind fidelity target status")
    target_records = targets_manifest.get("targets")
    if not isinstance(target_records, list):
        raise RuntimeError("Fidelity target manifest has no targets list")
    if targets_manifest.get("targetCount") != len(target_records):
        raise RuntimeError("Fidelity targetCount does not match targets list")
    prohibited_target_fields = []
    for index, target in enumerate(target_records):
        if not isinstance(target, dict):
            raise RuntimeError(f"Fidelity target {index} is not an object")
        if set(target) != {"familyId", "representative"}:
            raise RuntimeError(
                f"Fidelity target {index} must contain only familyId and representative"
            )
        representative_record = target.get("representative")
        if not isinstance(representative_record, dict) or set(
            representative_record
        ) != {"path", "sha256"}:
            raise RuntimeError(
                f"Fidelity target {index} representative schema is invalid"
            )
        prohibited_target_fields.extend(
            prohibited_target_assignment_paths(target, f"targets[{index}]")
        )
    if prohibited_target_fields:
        raise RuntimeError(
            "Role/rank/selection fields are forbidden in fidelity targets: "
            + ", ".join(prohibited_target_fields[:20])
        )
    if catalog.get("outcomeBlind") is not True or int(
        catalog.get("schemaVersion", 0)
    ) < 2:
        raise RuntimeError("Outcome-blind map-family catalog schemaVersion 2+ required")
    if targets_manifest.get("catalogSha256") != sha256_file(catalog_path):
        raise RuntimeError("Role-blind target manifest is not bound to this catalog SHA-256")
    target_population_commitment = canonical_sha256(target_records)
    if (
        targets_manifest.get("populationCommitmentSha256")
        != target_population_commitment
    ):
        raise RuntimeError(
            "Role-blind target population commitment does not match immutable targets"
        )
    leaked_outcomes = forbidden_key_paths(target_records)
    if leaked_outcomes:
        raise RuntimeError(
            "Outcome fields are forbidden in fidelity targets: "
            + ", ".join(leaked_outcomes[:20])
        )
    if target_tick <= 1:
        raise RuntimeError("target_tick must exceed tick 1")
    if family_limit is not None and family_limit <= 0:
        raise RuntimeError("family_limit must be positive when provided")
    pinned_debug_logging = (
        debug_logging if debug_logging is not None else os.environ.get("DEBUG_LOGGING")
    )
    if pinned_debug_logging != "1":
        raise RuntimeError(
            "DEBUG_LOGGING must be explicitly pinned to '1' so game-api warnings "
            "are visible to the fidelity capture"
        )

    source_state = (
        git_descriptor(repo_root)
        if require_clean_source
        else {
            "commit": "STATIC_TEST_FIXTURE",
            "branch": None,
            "status": [],
            "criticalStatus": [],
            "criticalPaths": list(CRITICAL_GIT_PATHS),
            "trackedDiffBytes": 0,
            "trackedDiffSha256": hashlib.sha256(b"").hexdigest(),
        }
    )
    required_committed_paths = [
        repo_root / relative_path for relative_path in TOOL_SOURCE_PATHS
    ] + [targets_path, catalog_path]
    tracked_inputs = (
        assert_clean_committed_source(
            repo_root, source_state, required_committed_paths
        )
        if require_clean_source
        else []
    )

    catalog_eligible = [
        record for record in catalog.get("families", [])
        if isinstance(record, dict)
        and isinstance(record.get("evidenceBasedDevelopmentEligibility"), dict)
        and record["evidenceBasedDevelopmentEligibility"].get("eligible") is True
    ]
    if len(catalog_eligible) != expected_families:
        raise RuntimeError(
            f"Expected {expected_families} evidence-based catalog families, "
            f"found {len(catalog_eligible)}"
        )
    if len(target_records) != expected_families:
        raise RuntimeError(
            f"Expected {expected_families} role-blind targets, found {len(target_records)}"
        )
    eligible_ids = {str(record.get("familyId")) for record in catalog_eligible}
    target_ids = [str(record.get("familyId")) for record in target_records]
    if len(set(target_ids)) != len(target_ids) or set(target_ids) != eligible_ids:
        raise RuntimeError(
            "Role-blind target families do not exactly equal the evidence-based catalog set"
        )
    selected = target_records
    population = sorted(selected, key=lambda item: str(item.get("familyId")))
    run_population, scope = select_run_population(selected, family_limit)

    catalog_maps = {
        str(record.get("path")): record
        for record in catalog.get("maps", [])
        if isinstance(record, dict) and isinstance(record.get("path"), str)
    }
    catalog_families = {
        str(record.get("familyId")): record
        for record in catalog_eligible
    }
    families = []
    seen_ids: set[str] = set()
    seen_names: set[str] = set()
    for population_index, record in run_population:
        family_id = str(record.get("familyId"))
        family_catalog = catalog_families.get(family_id)
        representative_record = record.get("representative")
        if not family_catalog or not isinstance(representative_record, dict):
            raise RuntimeError(f"Invalid target binding for family {family_id!r}")
        representative = str(representative_record.get("path"))
        representative_sha256 = str(representative_record.get("sha256"))
        representative_binding = representative_map_binding(
            family_catalog, catalog_maps
        )
        if family_id in seen_ids or not family_id:
            raise RuntimeError(f"Invalid or duplicate selected family: {family_id!r}")
        seen_ids.add(family_id)
        map_catalog = catalog_maps.get(representative)
        if representative not in family_catalog.get("mapPaths", []):
            raise RuntimeError(
                f"Representative {representative!r} is not cataloged in {family_id}"
            )
        if not map_catalog or map_catalog.get("familyId") != family_id:
            raise RuntimeError(
                f"Catalog map-family mismatch for {family_id}: {representative}"
            )

        source_path = safe_repo_path(repo_root, representative)
        source_exact = exact_file(source_path)
        if source_exact["sha256"] != map_catalog.get("sha256"):
            raise RuntimeError(f"Catalog hash drift for {representative}")
        if source_exact["sha256"] != representative_binding["sha256"]:
            raise RuntimeError(f"Representative binding hash drift for {representative}")
        if source_exact["sha256"] != representative_sha256:
            raise RuntimeError(f"Target manifest hash drift for {representative}")
        if representative != representative_binding["path"]:
            raise RuntimeError(
                f"Target representative does not match committed role-blind rule for {family_id}"
            )
        map_name = source_path.name
        if map_name in seen_names:
            raise RuntimeError(f"Duplicate representative basename: {map_name}")
        seen_names.add(map_name)
        runtime_path = mix_dir / map_name
        runtime_exact = exact_file(runtime_path)
        if runtime_exact["sha256"] != source_exact["sha256"]:
            raise RuntimeError(
                f"MIX_DIR copy does not match representative: {map_name}"
            )
        parsed = parse_map(source_path)
        families.append({
            "index": population_index,
            "familyId": family_id,
            "representativeMapPath": representative,
            "representativeSelectionRule": representative_binding[
                "selectionRule"
            ],
            "mapName": map_name,
            "bytes": source_exact["bytes"],
            "sha256": source_exact["sha256"],
            "sections": parsed["sections"],
            "requiredSections": parsed["requiredSections"],
            "requiredKeys": parsed["requiredKeys"],
            "payloadEntryCounts": parsed["payloadEntryCounts"],
            "declaredStartLocations": parsed["declaredStartLocations"],
            "staticChecks": parsed["staticChecks"],
        })

    game_api_root = repo_root / "node_modules/@chronodivide/game-api"
    driver_dist = repo_root / "packages/chronodivide-bot-driver/dist/benchmark"
    resolved_node_binary = node_binary or (
        Path(shutil.which("node")) if shutil.which("node") else None
    )
    if not resolved_node_binary:
        raise RuntimeError("node is unavailable on PATH")
    resolved_python_binary = python_binary or Path(sys.executable)
    resolved_scontrol_binary = scontrol_binary or Path(
        os.environ.get("SCONTROL", "/opt/slurm/current/bin/scontrol")
    )
    compiled_inputs = [
        exact_file(driver_dist / name)
        for name in (
            "mapFidelityProbe.js",
            "mapFidelityProtocol.js",
            "seededOfflineGame.js",
        )
    ]
    source_inputs = [
        exact_file(repo_root / relative_path)
        for relative_path in TOOL_SOURCE_PATHS
    ]
    target_input = exact_file(targets_path)
    catalog_input = exact_file(catalog_path)
    package_lock = exact_file(repo_root / "package-lock.json")
    node_runtime = exact_file(resolved_node_binary)
    python_runtime = exact_file(resolved_python_binary)
    scontrol_runtime = exact_file(resolved_scontrol_binary)
    game_api_package = exact_file(game_api_root / "package.json")
    game_api_runtime = exact_file(game_api_root / "dist/index.js")
    game_api_runtime_tree = tree_descriptor(game_api_root)
    runtime_dependency_tree = tree_descriptor(repo_root / "node_modules")
    mix_tree = tree_descriptor(mix_dir)
    source_bundle = bundle_descriptor([
        ("gitCommit", str(source_state["commit"])),
        *[
            (f"source:{relative_path}", str(record["sha256"]))
            for relative_path, record in zip(TOOL_SOURCE_PATHS, source_inputs)
        ],
        ("targetManifest", str(target_input["sha256"])),
        ("catalog", str(catalog_input["sha256"])),
    ])
    runtime_bundle = bundle_descriptor([
        ("packageLock", str(package_lock["sha256"])),
        ("nodeRuntime", str(node_runtime["sha256"])),
        ("pythonRuntime", str(python_runtime["sha256"])),
        ("scontrolRuntime", str(scontrol_runtime["sha256"])),
        ("gameApiPackage", str(game_api_package["sha256"])),
        ("gameApiRuntime", str(game_api_runtime["sha256"])),
        ("gameApiRuntimeTree", str(game_api_runtime_tree["sha256"])),
        ("runtimeDependencyTree", str(runtime_dependency_tree["sha256"])),
        *[
            (f"compiledRuntime:{Path(str(record['path'])).name}", str(record["sha256"]))
            for record in compiled_inputs
        ],
        ("mixTree", str(mix_tree["sha256"])),
    ])
    return {
        "schemaVersion": 1,
        "gate": GATE,
        "outcomeFree": True,
        "status": (
            "SLURM_MAP_FIDELITY_FULL_NOT_A_PAPER_RESULT"
            if scope == "full"
            else "SLURM_MAP_FIDELITY_PREFLIGHT_NOT_CLEARANCE"
        ),
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "scheduler": scheduler,
        "protocol": {
            "targetTick": target_tick,
            "engineSeedBase": engine_seed_base,
            "participantCountry": "Iraq",
            "reciprocalOrders": [["alpha", "beta"], ["beta", "alpha"]],
            "dynamicStartCoverageClaim": (
                "One deterministic reciprocal pair per map; all declared starts "
                "are statically enumerated, not all dynamically exercised."
            ),
            "requiredSections": list(REQUIRED_SECTIONS),
            "requiredKeys": {
                section: list(keys) for section, keys in REQUIRED_KEYS.items()
            },
            "warningCategorySeverity": WARNING_POLICY,
            "consoleErrorAlwaysFails": True,
            "forbiddenOutcomeKeys": list(FORBIDDEN_OUTCOME_KEYS),
            "noPolicyBots": True,
            "noGameCompletionQuery": True,
            "logging": {
                "debugLogging": pinned_debug_logging,
                "source": "sbatch_pinned",
            },
        },
        "inputs": {
            "repoRoot": str(repo_root),
            "git": source_state,
            "trackedCommittedInputs": tracked_inputs,
            "sourceFiles": source_inputs,
            "targetManifest": target_input,
            "targetPopulationCommitmentSha256": target_population_commitment,
            "catalog": catalog_input,
            "mixDir": str(mix_dir),
            "mixTree": mix_tree,
            "packageLock": package_lock,
            "nodeRuntime": node_runtime,
            "pythonRuntime": python_runtime,
            "scontrolRuntime": scontrol_runtime,
            "gameApiPackage": game_api_package,
            "gameApiRuntime": game_api_runtime,
            "gameApiRuntimeTree": game_api_runtime_tree,
            "runtimeDependencyTree": runtime_dependency_tree,
            "compiledProbe": compiled_inputs[0],
            "compiledRuntime": compiled_inputs,
            "logging": {
                "debugLogging": pinned_debug_logging,
                "source": "sbatch_pinned",
            },
            "sourceBundle": source_bundle,
            "runtimeBundle": runtime_bundle,
        },
        "selection": {
            "criterion": "all records in committed role-blind target manifest",
            "forbiddenCriterion": (
                "any train/validation/test role or dry-run assignment"
            ),
            "roleBlind": True,
            "scope": scope,
            "populationFamilyCount": len(population),
            "familyCount": len(families),
            "representativeField": "representativeMapPath",
            "preflightRule": (
                "lowest sha256('map-fidelity-preflight-v1|' + familyId), "
                "while retaining the full-run population index and engine seed"
                if scope == "preflight"
                else None
            ),
        },
        "families": families,
    }


def normalized_key(value: str) -> str:
    return re.sub(r"[^a-z0-9]", "", value.lower())


def forbidden_key_paths(value: Any, path: str = "$") -> list[str]:
    forbidden = {normalized_key(key) for key in FORBIDDEN_OUTCOME_KEYS}
    found = []
    if isinstance(value, dict):
        for key, child in value.items():
            child_path = f"{path}.{key}"
            if normalized_key(str(key)) in forbidden:
                found.append(child_path)
            found.extend(forbidden_key_paths(child, child_path))
    elif isinstance(value, list):
        for index, child in enumerate(value):
            found.extend(forbidden_key_paths(child, f"{path}[{index}]"))
    return found


def forbidden_role_key_paths(value: Any, path: str = "$") -> list[str]:
    forbidden = {normalized_key(key) for key in FORBIDDEN_ROLE_KEYS}
    found = []
    if isinstance(value, dict):
        for key, child in value.items():
            child_path = f"{path}.{key}"
            if normalized_key(str(key)) in forbidden:
                found.append(child_path)
            found.extend(forbidden_role_key_paths(child, child_path))
    elif isinstance(value, list):
        for index, child in enumerate(value):
            found.extend(forbidden_role_key_paths(child, f"{path}[{index}]"))
    return found


def prohibited_target_assignment_paths(value: Any, path: str = "$") -> list[str]:
    found = []
    if isinstance(value, dict):
        for key, child in value.items():
            child_path = f"{path}.{key}"
            normalized = normalized_key(str(key))
            if any(
                token in normalized
                for token in ("role", "rank", "selection", "split", "assignment")
            ):
                found.append(child_path)
            found.extend(prohibited_target_assignment_paths(child, child_path))
    elif isinstance(value, list):
        for index, child in enumerate(value):
            found.extend(
                prohibited_target_assignment_paths(child, f"{path}[{index}]")
            )
    return found


def forbidden_diagnostic_paths(value: Any, path: str = "$") -> list[str]:
    found = []
    if isinstance(value, dict):
        for key, child in value.items():
            child_path = f"{path}.{key}"
            if (
                normalized_key(str(key)) in {"text", "message"}
                and isinstance(child, str)
                and OUTCOME_DIAGNOSTIC.search(child)
            ):
                found.append(child_path)
            found.extend(forbidden_diagnostic_paths(child, child_path))
    elif isinstance(value, list):
        for index, child in enumerate(value):
            found.extend(
                forbidden_diagnostic_paths(child, f"{path}[{index}]")
            )
    return found


def verify_exact_file(record: dict[str, Any]) -> str | None:
    path = Path(str(record.get("path", "")))
    if not path.is_file():
        return f"missing_exact_input:{path}"
    if path.stat().st_size != record.get("bytes"):
        return f"exact_input_size_mismatch:{path}"
    if sha256_file(path) != record.get("sha256"):
        return f"exact_input_hash_mismatch:{path}"
    return None


def verify_tree(record: dict[str, Any], label: str) -> list[str]:
    root = Path(str(record.get("root", "")))
    failures = []
    try:
        current = tree_descriptor(root)
    except RuntimeError:
        return [f"{label}_tree_missing"]
    for key in ("sha256", "fileCount", "bytes", "hashAlgorithm", "entries"):
        if current.get(key) != record.get(key):
            failures.append(f"{label}_tree_{key}_mismatch")
    return failures


def verify_bundle(record: dict[str, Any], label: str) -> list[str]:
    failures = []
    members = record.get("members")
    if record.get("hashAlgorithm") != "sha256(label NUL value NUL), ordered as recorded":
        failures.append(f"{label}_bundle_algorithm_mismatch")
    if not isinstance(members, list) or not all(
        isinstance(member, dict) and set(member) == {"label", "value"}
        and isinstance(member["label"], str) and isinstance(member["value"], str)
        for member in members
    ):
        return failures + [f"{label}_bundle_members_invalid"]
    labels = [str(member["label"]) for member in members]
    if len(labels) != len(set(labels)):
        failures.append(f"{label}_bundle_duplicate_label")
    recomputed = bundle_descriptor([
        (str(member["label"]), str(member["value"])) for member in members
    ])
    if recomputed["sha256"] != record.get("sha256"):
        failures.append(f"{label}_bundle_hash_mismatch")
    return failures


def unexpected_keys(value: Any, allowed: set[str], path: str) -> list[str]:
    if not isinstance(value, dict):
        return [f"{path}:not_an_object"]
    return [f"{path}.{key}" for key in value if key not in allowed]


def result_schema_failures(result: dict[str, Any]) -> list[str]:
    failures = unexpected_keys(result, {
        "schemaVersion", "gate", "outcomeFree", "artifactKind", "scheduler",
        "manifestPath", "manifestSha256", "runtimeHashes", "logging", "scope",
        "populationFamilyCount", "runFamilyCount", "fullCoverage",
        "eligibleForFidelityClearance", "initialization", "familyCountRequested",
        "familyCountRun", "families",
    }, "$result")
    failures += unexpected_keys(result.get("scheduler"), {
        "jobId", "account", "partition", "qos", "source",
    }, "$result.scheduler")
    failures += unexpected_keys(result.get("runtimeHashes"), {
        "packageLockSha256", "gameApiPackageSha256", "gameApiRuntimeSha256",
        "compiledProbeSha256", "gameApiRuntimeTreeSha256",
        "runtimeDependencyTreeSha256", "mixTreeSha256", "sourceBundleSha256",
        "runtimeBundleSha256",
    }, "$result.runtimeHashes")
    failures += unexpected_keys(result.get("logging"), {
        "debugLogging", "source",
    }, "$result.logging")
    initialization = result.get("initialization")
    failures += unexpected_keys(initialization, {
        "succeeded", "warnings", "warningCaptureTruncated", "error",
    }, "$result.initialization")
    warning_groups = []
    if isinstance(initialization, dict):
        warning_groups.append((initialization.get("warnings"), "$result.initialization.warnings"))
        if initialization.get("error") is not None:
            initialization_error = initialization.get("error")
            failures += unexpected_keys(initialization_error, {
                "category", "name", "messageSha256",
            }, "$result.initialization.error")
            if not isinstance(initialization_error, dict) or not re.fullmatch(
                r"[0-9a-f]{64}", str(initialization_error.get("messageSha256"))
            ):
                failures.append("$result.initialization.error.messageSha256:invalid")
    families = result.get("families")
    if not isinstance(families, list):
        failures.append("$result.families:not_an_array")
        return failures
    for index, family in enumerate(families):
        base = f"$result.families[{index}]"
        failures += unexpected_keys(family, {
            "familyIndex", "familyId", "representativeMapPath", "mapName",
            "mapBytes", "mapSha256", "slurmJobId", "requestedEngineSeed",
            "targetTick", "declaredStartLocations", "forward", "reverse",
            "reciprocalStartCheck", "warnings", "failureCategories",
            "reviewCategories", "fidelityStatus",
        }, base)
        if not isinstance(family, dict):
            continue
        warning_groups.append((family.get("warnings"), f"{base}.warnings"))
        starts = family.get("declaredStartLocations")
        if not isinstance(starts, list):
            failures.append(f"{base}.declaredStartLocations:not_an_array")
        else:
            for start_index, start in enumerate(starts):
                failures += unexpected_keys(start, {"waypoint", "encoded", "x", "y"}, f"{base}.declaredStartLocations[{start_index}]")
        for probe_name in ("forward", "reverse"):
            probe = family.get(probe_name)
            if probe is None:
                continue
            probe_path = f"{base}.{probe_name}"
            failures += unexpected_keys(probe, {
                "order", "loaded", "initialTick", "finalTick", "updates",
                "progressedBeyondTickOne", "reachedTargetTick", "starts",
                "wallTimeMs", "warningCaptureTruncated", "error",
            }, probe_path)
            if isinstance(probe, dict):
                failures += unexpected_keys(probe.get("starts"), {"alpha", "beta"}, f"{probe_path}.starts")
                if isinstance(probe.get("starts"), dict):
                    for identity in ("alpha", "beta"):
                        start = probe["starts"].get(identity)
                        if start is not None:
                            failures += unexpected_keys(start, {"x", "y"}, f"{probe_path}.starts.{identity}")
                if probe.get("error") is not None:
                    probe_error = probe.get("error")
                    failures += unexpected_keys(probe_error, {"category", "name", "messageSha256"}, f"{probe_path}.error")
                    if not isinstance(probe_error, dict) or not re.fullmatch(
                        r"[0-9a-f]{64}", str(probe_error.get("messageSha256"))
                    ):
                        failures.append(f"{probe_path}.error.messageSha256:invalid")
        reciprocal = family.get("reciprocalStartCheck")
        if reciprocal is not None:
            failures += unexpected_keys(reciprocal, {
                "declaredStartCountValid", "forwardStartsDistinct",
                "reverseStartsDistinct", "allObservedStartsDeclared",
                "reciprocalPhysicalSlots", "failures",
            }, f"{base}.reciprocalStartCheck")
    for warnings, path in warning_groups:
        if not isinstance(warnings, list):
            failures.append(f"{path}:not_an_array")
            continue
        for warning_index, warning in enumerate(warnings):
            warning_path = f"{path}[{warning_index}]"
            failures += unexpected_keys(warning, {
                "phase", "level", "category", "severity", "diagnosticSha256",
            }, warning_path)
            if not isinstance(warning, dict) or not re.fullmatch(
                r"[0-9a-f]{64}", str(warning.get("diagnosticSha256"))
            ):
                failures.append(f"{warning_path}.diagnosticSha256:invalid")
    return failures


def coordinate(value: Any) -> tuple[int, int] | None:
    if not isinstance(value, dict) or set(value) != {"x", "y"}:
        return None
    x, y = value.get("x"), value.get("y")
    if isinstance(x, bool) or isinstance(y, bool) or not isinstance(x, int) or not isinstance(y, int):
        return None
    return x, y


def recompute_reciprocal_check(
    forward: dict[str, Any], reverse: dict[str, Any], declared: list[Any]
) -> dict[str, Any]:
    declared_points = [
        coordinate({"x": record.get("x"), "y": record.get("y")})
        if isinstance(record, dict) else None
        for record in declared
    ]
    declared_valid = (
        len(declared_points) >= 2
        and all(point is not None for point in declared_points)
        and len(set(declared_points)) == len(declared_points)
    )
    forward_starts = forward.get("starts") if isinstance(forward, dict) else None
    reverse_starts = reverse.get("starts") if isinstance(reverse, dict) else None
    fa = coordinate(forward_starts.get("alpha")) if isinstance(forward_starts, dict) else None
    fb = coordinate(forward_starts.get("beta")) if isinstance(forward_starts, dict) else None
    ra = coordinate(reverse_starts.get("alpha")) if isinstance(reverse_starts, dict) else None
    rb = coordinate(reverse_starts.get("beta")) if isinstance(reverse_starts, dict) else None
    declared_set = set(point for point in declared_points if point is not None)
    failures = []
    if not declared_valid:
        failures.append("declared_start_enumeration_invalid")
    if fa is None or fb is None or fa == fb:
        failures.append("forward_duplicate_or_missing_start")
    if ra is None or rb is None or ra == rb:
        failures.append("reverse_duplicate_or_missing_start")
    if any(point is None or point not in declared_set for point in (fa, fb, ra, rb)):
        failures.append("observed_start_not_declared")
    reciprocal_physical_slots = (
        fa is not None and fb is not None and ra is not None and rb is not None
        and fa == rb and fb == ra
    )
    if not reciprocal_physical_slots:
        failures.append("reciprocal_physical_slot_mismatch")
    return {
        "declaredStartCountValid": declared_valid,
        "forwardStartsDistinct": fa is not None and fb is not None and fa != fb,
        "reverseStartsDistinct": ra is not None and rb is not None and ra != rb,
        "allObservedStartsDeclared": all(
            point is not None and point in declared_set
            for point in (fa, fb, ra, rb)
        ),
        "reciprocalPhysicalSlots": reciprocal_physical_slots,
        "failures": failures,
    }


def derived_probe_failures(
    probe: dict[str, Any], label: str, expected_order: list[str], target_tick: int
) -> list[str]:
    failures = []
    if probe.get("order") != expected_order:
        failures.append(f"{label}_participant_order_mismatch")
    initial_tick = probe.get("initialTick")
    final_tick = probe.get("finalTick")
    updates = probe.get("updates")
    initial_valid = isinstance(initial_tick, int) and not isinstance(initial_tick, bool) and initial_tick >= 0
    final_valid = isinstance(final_tick, int) and not isinstance(final_tick, bool) and final_tick >= 0
    updates_valid = isinstance(updates, int) and not isinstance(updates, bool) and updates >= 0
    derived_loaded = initial_valid
    derived_progressed = final_valid and final_tick > 1
    derived_reached = final_valid and final_tick >= target_tick
    for key, derived in (
        ("loaded", derived_loaded),
        ("progressedBeyondTickOne", derived_progressed),
        ("reachedTargetTick", derived_reached),
    ):
        if probe.get(key) is not derived:
            failures.append(f"{label}_{key}_inconsistent")
        if not derived:
            failures.append(f"{label}_{key}_false")
    if not updates_valid or updates == 0:
        failures.append(f"{label}_updates_invalid")
    if initial_valid and final_valid and final_tick < initial_tick:
        failures.append(f"{label}_tick_regression")
    if probe.get("warningCaptureTruncated") is not False:
        failures.append(f"{label}_warning_capture_truncated")
    wall_time = probe.get("wallTimeMs")
    if not isinstance(wall_time, int) or isinstance(wall_time, bool) or wall_time < 0:
        failures.append(f"{label}_wall_time_invalid")
    return failures


def warning_findings(
    warnings: Iterable[dict[str, Any]], prefix: str
) -> tuple[list[str], list[str], Counter[str]]:
    failures = []
    reviews = []
    categories: Counter[str] = Counter()
    for warning in warnings:
        category = str(warning.get("category"))
        severity = str(warning.get("severity"))
        categories[category] += 1
        expected = WARNING_POLICY.get(category)
        level = str(warning.get("level"))
        if expected is None:
            failures.append(f"{prefix}:unknown_warning_category:{category}")
        elif severity != ("fail" if level == "error" else expected):
            failures.append(f"{prefix}:warning_severity_mismatch:{category}")
        elif severity == "fail":
            failures.append(f"{prefix}:warning:{category}")
        else:
            reviews.append(f"{prefix}:warning:{category}")
    return failures, reviews, categories


def check_gate(
    manifest_path: Path,
    result_path: Path,
    scheduler: dict[str, Any],
    *,
    verify_runtime_inputs: bool = True,
) -> dict[str, Any]:
    manifest = load_json(manifest_path)
    result = load_json(result_path)
    failures = [
        f"unexpected_result_key:{path}"
        for path in result_schema_failures(result)
    ]
    reviews = []
    if manifest.get("schemaVersion") != 1 or result.get("schemaVersion") != 1:
        failures.append("schema_version_mismatch")
    if manifest.get("gate") != GATE or result.get("gate") != GATE:
        failures.append("gate_schema_mismatch")
    if manifest.get("outcomeFree") is not True or result.get("outcomeFree") is not True:
        failures.append("outcome_free_marker_missing")
    leaked_roles = forbidden_role_key_paths(manifest) + forbidden_role_key_paths(result)
    if leaked_roles:
        failures.extend(f"forbidden_role_key:{path}" for path in leaked_roles)
    forbidden = forbidden_key_paths(result)
    if forbidden:
        failures.extend(f"forbidden_outcome_key:{path}" for path in forbidden)
    forbidden_diagnostics = forbidden_diagnostic_paths(result)
    if forbidden_diagnostics:
        failures.extend(
            f"unredacted_outcome_diagnostic:{path}"
            for path in forbidden_diagnostics
        )

    for label, record in (
        ("manifest", manifest.get("scheduler", {})),
        ("result", result.get("scheduler", {})),
    ):
        if (
            record.get("source") != "scontrol"
            or record.get("account") != "pi_jss233"
            or record.get("jobId") != scheduler.get("jobId")
        ):
            failures.append(f"{label}_scheduler_provenance_invalid")
    selection = manifest.get("selection", {})
    scope = selection.get("scope")
    if selection.get("roleBlind") is not True:
        failures.append("manifest_selection_not_role_blind")
    population_family_count = selection.get("populationFamilyCount")
    expected_families = manifest.get("families", [])
    expected_run_count = len(expected_families) if isinstance(expected_families, list) else 0
    expected_full_coverage = (
        scope == "full"
        and isinstance(population_family_count, int)
        and population_family_count == expected_run_count
        and result.get("runFamilyCount") == population_family_count
        and result.get("familyCountRun") == population_family_count
    )
    expected_artifact_kind = (
        "infrastructure_fidelity_full_probe_not_policy_evaluation"
        if scope == "full"
        else "infrastructure_fidelity_preflight_probe_not_clearance"
    )
    expected_manifest_status = (
        "SLURM_MAP_FIDELITY_FULL_NOT_A_PAPER_RESULT"
        if scope == "full"
        else "SLURM_MAP_FIDELITY_PREFLIGHT_NOT_CLEARANCE"
    )
    if scope not in {"full", "preflight"}:
        failures.append("selection_scope_invalid")
    if manifest.get("status") != expected_manifest_status:
        failures.append("manifest_status_scope_mismatch")
    try:
        result_manifest_path = Path(str(result.get("manifestPath"))).resolve()
    except (OSError, RuntimeError):
        result_manifest_path = None
    if result_manifest_path != manifest_path.resolve():
        failures.append("result_manifest_path_mismatch")
    if result.get("artifactKind") != expected_artifact_kind:
        failures.append("result_artifact_kind_scope_mismatch")
    for key, expected_value in (
        ("scope", scope),
        ("populationFamilyCount", population_family_count),
        ("runFamilyCount", expected_run_count),
        ("fullCoverage", expected_full_coverage),
        ("eligibleForFidelityClearance", False),
    ):
        if result.get(key) != expected_value:
            failures.append(f"result_scope_binding_mismatch:{key}")
    logging = manifest.get("inputs", {}).get("logging", {})
    if logging != {"debugLogging": "1", "source": "sbatch_pinned"}:
        failures.append("manifest_logging_mode_invalid")
    if result.get("logging") != logging:
        failures.append("result_logging_mode_mismatch")
    if os.environ.get("DEBUG_LOGGING") != "1" and verify_runtime_inputs:
        failures.append("checker_logging_environment_not_pinned")

    actual_manifest_sha = sha256_file(manifest_path)
    if result.get("manifestSha256") != actual_manifest_sha:
        failures.append("result_manifest_hash_mismatch")

    inputs = manifest.get("inputs", {})
    runtime_hashes = result.get("runtimeHashes", {})
    for name, result_key in (
        ("packageLock", "packageLockSha256"),
        ("gameApiPackage", "gameApiPackageSha256"),
        ("gameApiRuntime", "gameApiRuntimeSha256"),
        ("compiledProbe", "compiledProbeSha256"),
    ):
        record = inputs.get(name, {})
        if runtime_hashes.get(result_key) != record.get("sha256"):
            failures.append(f"runtime_hash_mismatch:{name}")
        if verify_runtime_inputs:
            failure = verify_exact_file(record)
            if failure:
                failures.append(failure)
    if verify_runtime_inputs:
        for record in inputs.get("compiledRuntime", []):
            failure = verify_exact_file(record)
            if failure:
                failures.append(failure)
        for record in inputs.get("sourceFiles", []):
            failure = verify_exact_file(record)
            if failure:
                failures.append(failure)
        for name in (
            "targetManifest",
            "catalog",
            "nodeRuntime",
            "pythonRuntime",
            "scontrolRuntime",
        ):
            failure = verify_exact_file(inputs.get(name, {}))
            if failure:
                failures.append(failure)
        for tree_name in (
            "mixTree",
            "gameApiRuntimeTree",
            "runtimeDependencyTree",
        ):
            failures.extend(
                verify_tree(inputs.get(tree_name, {}), tree_name)
            )

    for tree_name, result_key in (
        ("mixTree", "mixTreeSha256"),
        ("gameApiRuntimeTree", "gameApiRuntimeTreeSha256"),
        ("runtimeDependencyTree", "runtimeDependencyTreeSha256"),
    ):
        if runtime_hashes.get(result_key) != inputs.get(tree_name, {}).get("sha256"):
            failures.append(f"runtime_tree_hash_mismatch:{tree_name}")
    for bundle_name, result_key in (
        ("sourceBundle", "sourceBundleSha256"),
        ("runtimeBundle", "runtimeBundleSha256"),
    ):
        bundle = inputs.get(bundle_name, {})
        failures.extend(verify_bundle(bundle, bundle_name))
        if runtime_hashes.get(result_key) != bundle.get("sha256"):
            failures.append(f"runtime_bundle_hash_mismatch:{bundle_name}")
    source_records = inputs.get("sourceFiles", [])
    expected_source_bundle = bundle_descriptor([
        ("gitCommit", str(inputs.get("git", {}).get("commit"))),
        *[
            (f"source:{relative_path}", str(record.get("sha256")))
            for relative_path, record in zip(TOOL_SOURCE_PATHS, source_records)
        ],
        ("targetManifest", str(inputs.get("targetManifest", {}).get("sha256"))),
        ("catalog", str(inputs.get("catalog", {}).get("sha256"))),
    ])
    compiled_records = inputs.get("compiledRuntime", [])
    expected_runtime_bundle = bundle_descriptor([
        ("packageLock", str(inputs.get("packageLock", {}).get("sha256"))),
        ("nodeRuntime", str(inputs.get("nodeRuntime", {}).get("sha256"))),
        ("pythonRuntime", str(inputs.get("pythonRuntime", {}).get("sha256"))),
        ("scontrolRuntime", str(inputs.get("scontrolRuntime", {}).get("sha256"))),
        ("gameApiPackage", str(inputs.get("gameApiPackage", {}).get("sha256"))),
        ("gameApiRuntime", str(inputs.get("gameApiRuntime", {}).get("sha256"))),
        ("gameApiRuntimeTree", str(inputs.get("gameApiRuntimeTree", {}).get("sha256"))),
        ("runtimeDependencyTree", str(inputs.get("runtimeDependencyTree", {}).get("sha256"))),
        *[
            (f"compiledRuntime:{Path(str(record.get('path'))).name}", str(record.get("sha256")))
            for record in compiled_records
        ],
        ("mixTree", str(inputs.get("mixTree", {}).get("sha256"))),
    ])
    if len(source_records) != len(TOOL_SOURCE_PATHS) or inputs.get("sourceBundle") != expected_source_bundle:
        failures.append("source_bundle_binding_mismatch")
    if inputs.get("runtimeBundle") != expected_runtime_bundle:
        failures.append("runtime_bundle_binding_mismatch")

    initialization = result.get("initialization", {})
    init_failures, init_reviews, init_categories = warning_findings(
        initialization.get("warnings", []), "initialization"
    )
    failures.extend(init_failures)
    reviews.extend(init_reviews)
    if initialization.get("succeeded") is not True:
        failures.append(
            "initialization_failed:"
            + str((initialization.get("error") or {}).get("category", "unknown"))
        )
    if initialization.get("warningCaptureTruncated") is True:
        failures.append("initialization_warning_capture_truncated")

    expected_families = manifest.get("families", [])
    observed_families = result.get("families", [])
    if result.get("familyCountRequested") != len(expected_families):
        failures.append("requested_family_count_mismatch")
    if result.get("familyCountRun") != len(observed_families):
        failures.append("run_family_count_mismatch")
    expected_by_id = {
        str(record.get("familyId")): record for record in expected_families
    }
    observed_by_id = {
        str(record.get("familyId")): record for record in observed_families
    }
    if len(observed_by_id) != len(observed_families):
        failures.append("duplicate_observed_family_id")
    if set(expected_by_id) != set(observed_by_id):
        failures.append("observed_family_set_mismatch")

    family_summaries = []
    all_warning_categories = Counter(init_categories)
    for family_id, expected in expected_by_id.items():
        family_failures = list(expected.get("staticChecks", {}).get("failures", []))
        family_reviews: list[str] = []
        category_counts: Counter[str] = Counter()
        observed = observed_by_id.get(family_id)
        if not observed:
            family_failures.append("family_not_run")
        else:
            if observed.get("familyIndex") != expected.get("index"):
                family_failures.append("family_population_index_mismatch")
            if observed.get("representativeMapPath") != expected.get(
                "representativeMapPath"
            ):
                family_failures.append("representative_map_path_mismatch")
            if observed.get("mapName") != expected.get("mapName"):
                family_failures.append("map_name_mismatch")
            if observed.get("mapBytes") != expected.get("bytes"):
                family_failures.append("map_size_mismatch")
            if observed.get("mapSha256") != expected.get("sha256"):
                family_failures.append("map_hash_mismatch")
            if observed.get("slurmJobId") != scheduler.get("jobId"):
                family_failures.append("map_job_binding_mismatch")
            protocol = manifest.get("protocol", {})
            target_tick = protocol.get("targetTick")
            if observed.get("targetTick") != target_tick:
                family_failures.append("target_tick_mismatch")
            expected_seed = (
                int(protocol.get("engineSeedBase", -1)) + int(expected.get("index", -1))
            ) % (2 ** 32)
            if observed.get("requestedEngineSeed") != expected_seed:
                family_failures.append("requested_engine_seed_mismatch")
            if observed.get("declaredStartLocations") != expected.get("declaredStartLocations"):
                family_failures.append("declared_start_enumeration_mismatch")
            forward = observed.get("forward")
            reverse = observed.get("reverse")
            for label, probe, order in (
                ("forward", forward, ["alpha", "beta"]),
                ("reverse", reverse, ["beta", "alpha"]),
            ):
                if not isinstance(probe, dict):
                    family_failures.append(f"{label}_probe_missing")
                    continue
                error = probe.get("error")
                if error is not None:
                    category = error.get("category", "unknown") if isinstance(error, dict) else "malformed"
                    family_failures.append(f"{label}_error:{category}")
                family_failures.extend(
                    derived_probe_failures(probe, label, order, int(target_tick))
                )
            reciprocal = observed.get("reciprocalStartCheck")
            if not isinstance(forward, dict) or not isinstance(reverse, dict):
                recomputed_reciprocal = ["reciprocal_probe_missing"]
            else:
                recomputed_check = recompute_reciprocal_check(
                    forward,
                    reverse,
                    list(expected.get("declaredStartLocations", [])),
                )
                recomputed_reciprocal = recomputed_check["failures"]
            family_failures.extend(
                f"reciprocal:{failure}" for failure in recomputed_reciprocal
            )
            if not isinstance(reciprocal, dict):
                family_failures.append("reciprocal_start_check_missing")
            elif not isinstance(forward, dict) or not isinstance(reverse, dict):
                family_failures.append("runner_reciprocal_check_unverifiable")
            elif reciprocal != recomputed_check:
                family_failures.append("runner_reciprocal_check_mismatch")
            warning_failures, warning_reviews, category_counts = warning_findings(
                observed.get("warnings", []), family_id
            )
            family_failures.extend(warning_failures)
            family_reviews.extend(warning_reviews)
            family_failures.extend(
                f"runner:{failure}"
                for failure in observed.get("failureCategories", [])
            )
            family_reviews.extend(
                f"runner:{review}"
                for review in observed.get("reviewCategories", [])
            )
        all_warning_categories.update(category_counts)
        family_failures = sorted(set(family_failures))
        family_reviews = sorted(set(family_reviews))
        status = (
            "fail" if family_failures
            else "review" if family_reviews
            else "pass"
        )
        if observed and observed.get("fidelityStatus") != status:
            family_failures.append("runner_fidelity_status_mismatch")
            family_failures = sorted(set(family_failures))
            status = "fail"
        family_summaries.append({
            "familyId": family_id,
            "representativeMapPath": expected.get("representativeMapPath"),
            "mapName": expected.get("mapName"),
            "mapSha256": expected.get("sha256"),
            "slurmJobId": scheduler.get("jobId"),
            "status": status,
            "failures": family_failures,
            "reviews": family_reviews,
            "warningCategoryCounts": dict(sorted(category_counts.items())),
        })

    status_counts = Counter(record["status"] for record in family_summaries)
    failures = sorted(set(failures))
    reviews = sorted(set(reviews))
    if failures or status_counts["fail"]:
        verdict = "FAIL"
    elif reviews or status_counts["review"]:
        verdict = "REVIEW"
    else:
        verdict = "PASS"
    full_coverage = (
        expected_full_coverage
        and len(observed_families) == population_family_count
        and set(expected_by_id) == set(observed_by_id)
    )
    technical_checks_passed = not failures and not reviews
    screen_complete = (
        full_coverage
        and technical_checks_passed
        and sum(status_counts.values()) == population_family_count
    )
    eligible_for_clearance = (
        screen_complete and status_counts["pass"] == population_family_count
    )
    return {
        "schemaVersion": 1,
        "gate": GATE,
        "outcomeFree": True,
        "artifactKind": (
            "infrastructure_fidelity_full_summary_not_policy_evaluation"
            if scope == "full"
            else "infrastructure_fidelity_preflight_summary_not_clearance"
        ),
        "scope": scope,
        "populationFamilyCount": population_family_count,
        "runFamilyCount": len(observed_families),
        "fullCoverage": full_coverage,
        "screenComplete": screen_complete,
        "eligibleForFidelityClearance": eligible_for_clearance,
        "verdict": verdict,
        "technicalChecksPassed": technical_checks_passed,
        "passed": eligible_for_clearance,
        "notSealedTestEvidence": True,
        "scheduler": scheduler,
        "manifestPath": str(manifest_path.resolve()),
        "manifestSha256": actual_manifest_sha,
        "resultPath": str(result_path.resolve()),
        "resultSha256": sha256_file(result_path),
        "provenance": {
            "sourceCommit": inputs.get("git", {}).get("commit"),
            "targetManifestSha256": inputs.get("targetManifest", {}).get("sha256"),
            "targetPopulationCommitmentSha256": inputs.get(
                "targetPopulationCommitmentSha256"
            ),
            "catalogSha256": inputs.get("catalog", {}).get("sha256"),
            "sourceFiles": inputs.get("sourceFiles", []),
            "compiledRuntime": inputs.get("compiledRuntime", []),
            "nodeRuntime": inputs.get("nodeRuntime"),
            "pythonRuntime": inputs.get("pythonRuntime"),
            "scontrolRuntime": inputs.get("scontrolRuntime"),
            "gameApiRuntime": inputs.get("gameApiRuntime"),
            "gameApiRuntimeTreeSha256": inputs.get("gameApiRuntimeTree", {}).get("sha256"),
            "runtimeDependencyTreeSha256": inputs.get("runtimeDependencyTree", {}).get("sha256"),
            "mixTreeSha256": inputs.get("mixTree", {}).get("sha256"),
            "sourceBundleSha256": inputs.get("sourceBundle", {}).get("sha256"),
            "runtimeBundleSha256": inputs.get("runtimeBundle", {}).get("sha256"),
            "logging": logging,
        },
        "familyCounts": {
            "requested": len(expected_families),
            "run": len(observed_families),
            "pass": status_counts["pass"],
            "review": status_counts["review"],
            "fail": status_counts["fail"],
        },
        "warningCategoryCounts": dict(sorted(all_warning_categories.items())),
        "globalFailures": failures,
        "globalReviews": reviews,
        "families": family_summaries,
        "interpretation": (
            "PASS establishes internal parser/load/progress and one reciprocal "
            "spawn pair under the pinned simulator only. It does not establish "
            "Red Alert 2 behavioral fidelity, strategic suitability, policy "
            "strength, or sealed-test validity."
        ),
    }


def write_exclusive(path: Path, value: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("x", encoding="utf-8") as handle:
        json.dump(value, handle, indent=2, sort_keys=True)
        handle.write("\n")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    subparsers = parser.add_subparsers(dest="command", required=True)
    prepare = subparsers.add_parser("prepare")
    prepare.add_argument("--repo-root", type=Path, required=True)
    prepare.add_argument("--targets", type=Path, required=True)
    prepare.add_argument("--catalog", type=Path, required=True)
    prepare.add_argument("--mix-dir", type=Path, required=True)
    prepare.add_argument("--output", type=Path, required=True)
    prepare.add_argument("--target-tick", type=int, default=250)
    prepare.add_argument("--engine-seed-base", type=int, default=0x4D465600)
    prepare.add_argument(
        "--expected-families", type=int, default=EXPECTED_EVIDENCE_FAMILIES
    )
    prepare.add_argument(
        "--family-limit",
        type=int,
        help="Role-blind deterministic preflight subset size (full run if omitted)",
    )
    check = subparsers.add_parser("check")
    check.add_argument("--manifest", type=Path, required=True)
    check.add_argument("--result", type=Path, required=True)
    check.add_argument("--output", type=Path, required=True)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    scheduler = authoritative_scheduler()
    if args.command == "prepare":
        manifest = build_manifest(
            args.repo_root,
            args.targets,
            args.catalog,
            args.mix_dir,
            scheduler,
            target_tick=args.target_tick,
            engine_seed_base=args.engine_seed_base,
            expected_families=args.expected_families,
            family_limit=args.family_limit,
        )
        write_exclusive(args.output, manifest)
        print(json.dumps({
            "gate": GATE,
            "artifact": str(args.output.resolve()),
            "sha256": sha256_file(args.output),
            "families": len(manifest["families"]),
            "scheduler": scheduler,
        }, indent=2, sort_keys=True))
        return

    summary = check_gate(args.manifest, args.result, scheduler)
    write_exclusive(args.output, summary)
    print(json.dumps({
        "gate": GATE,
        "artifact": str(args.output.resolve()),
        "sha256": sha256_file(args.output),
        "verdict": summary["verdict"],
        "familyCounts": summary["familyCounts"],
        "warningCategoryCounts": summary["warningCategoryCounts"],
        "globalFailureCount": len(summary["globalFailures"]),
        "globalReviewCount": len(summary["globalReviews"]),
        "scheduler": scheduler,
    }, indent=2, sort_keys=True))
    if summary["verdict"] != "PASS":
        raise SystemExit(1)


if __name__ == "__main__":
    main()
