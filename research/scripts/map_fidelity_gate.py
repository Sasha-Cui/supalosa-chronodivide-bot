#!/usr/bin/env python3
"""Prepare and check the Slurm-only, outcome-free map fidelity gate."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import shutil
import stat
import subprocess
import sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable


GATE = "map-fidelity-gate-v1"
MANIFEST_SCHEMA_VERSION = 2
INTERNAL_EVIDENCE_SCHEMA_VERSION = 1
SUMMARY_SCHEMA_VERSION = 2
MAP_LOAD_ATTESTATION_PROTOCOL = "unique-rfs-alias-adapter-snapshot-v1"
DURABLE_EVIDENCE_ROOT = Path(
    "/nfs/roberts/project/pi_jss233/zc362/chrono_divide/research-evidence"
)
HEX_SHA256 = re.compile(r"^[0-9a-f]{64}$")
# @supalosa/chronodivide-bot Countries.IRAQ and the pinned game API use this
# internal country identifier; "Iraq" is only a display label.
PARTICIPANT_COUNTRY = "Arabs"
EXPECTED_EVIDENCE_FAMILIES = 127
LEGACY_TOOL_SOURCE_PATHS = (
    "packages/chronodivide-bot-driver/src/benchmark/mapFidelityProbe.ts",
    "packages/chronodivide-bot-driver/src/benchmark/mapFidelityProtocol.ts",
    "packages/chronodivide-bot-driver/src/benchmark/seededOfflineGame.ts",
    "research/scripts/map_fidelity_gate.py",
    "research/slurm/map_fidelity_gate_v1.sbatch",
)
TOOL_SOURCE_PATHS = (
    "packages/chronodivide-bot-driver/src/benchmark/mapFidelityProbe.ts",
    "packages/chronodivide-bot-driver/src/benchmark/mapFidelityProtocol.ts",
    "packages/chronodivide-bot-driver/src/benchmark/mapLoadAttestation.ts",
    "packages/chronodivide-bot-driver/src/benchmark/seededOfflineGame.ts",
    "research/scripts/map_fidelity_gate.py",
    "research/scripts/map_fidelity_supervisor.py",
    "research/scripts/select_map_fidelity_preflight.py",
    "research/slurm/map_fidelity_gate_v1.sbatch",
)
PREFLIGHT_PLAN_RELATIVE_PATH = (
    "research/artifacts/map_fidelity_expanded_preflight_v2.json"
)
EXPANDED_PREFLIGHT_FAMILY_COUNT = 11
EXPANDED_PREFLIGHT_RULE = (
    "committed role-blind expanded-map-compatibility-preflight-v2 plan; "
    "execute its 11 selected families in full-population order while retaining "
    "full-population indices and engine seeds"
)
COMPILED_RUNTIME_NAMES = (
    "mapFidelityProbe.js",
    "mapFidelityProtocol.js",
    "mapLoadAttestation.js",
    "seededOfflineGame.js",
)
RUNTIME_HASH_BINDINGS = (
    ("packageLockSha256", "file", "packageLock"),
    ("nodeRuntimeSha256", "file", "nodeRuntime"),
    ("pythonRuntimeSha256", "file", "pythonRuntime"),
    ("scontrolRuntimeSha256", "file", "scontrolRuntime"),
    ("gameApiPackageSha256", "file", "gameApiPackage"),
    ("gameApiRuntimeSha256", "file", "gameApiRuntime"),
    ("gameApiRuntimeTreeSha256", "tree", "gameApiRuntimeTree"),
    ("runtimeDependencyTreeSha256", "tree", "runtimeDependencyTree"),
    ("mixTreeSha256", "tree", "mixTree"),
    ("compiledProbeSha256", "compiled", "mapFidelityProbe.js"),
    ("compiledProtocolSha256", "compiled", "mapFidelityProtocol.js"),
    ("compiledMapLoadAttestationSha256", "compiled", "mapLoadAttestation.js"),
    ("compiledSeededGameSha256", "compiled", "seededOfflineGame.js"),
    ("sourceBundleSha256", "bundle", "sourceBundle"),
    ("runtimeBundleSha256", "bundle", "runtimeBundle"),
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
    PREFLIGHT_PLAN_RELATIVE_PATH,
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
    reject_symlink_components(path, "Hashed input")
    try:
        if not stat.S_ISREG(path.lstat().st_mode):
            raise RuntimeError(f"Hashed input is not a regular file: {path}")
    except OSError as error:
        raise RuntimeError(f"Hashed input is missing: {path}") from error
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


def reject_symlink_components(path: Path, label: str) -> None:
    """Reject symlinks in every existing component without following them."""

    absolute = path.absolute()
    current = Path(absolute.anchor)
    for component in absolute.parts[1:]:
        current /= component
        if os.path.lexists(current) and stat.S_ISLNK(current.lstat().st_mode):
            raise RuntimeError(f"{label} contains a symbolic-link component: {current}")


def exact_file(path: Path) -> dict[str, Any]:
    candidate = path.absolute()
    reject_symlink_components(candidate, "Required exact input")
    try:
        descriptor = candidate.lstat()
    except OSError as error:
        raise RuntimeError(f"Required exact input is missing: {candidate}") from error
    if not stat.S_ISREG(descriptor.st_mode):
        raise RuntimeError(f"Required exact input is not a regular file: {candidate}")
    resolved = candidate.resolve(strict=True)
    return {
        "path": str(resolved),
        "bytes": descriptor.st_size,
        "sha256": sha256_file(resolved),
    }


def resolved_executable(path: Path, label: str) -> Path:
    """Resolve an allowed executable symlink once, then attest the regular target."""

    try:
        resolved = path.resolve(strict=True)
    except OSError as error:
        raise RuntimeError(f"{label} executable is missing: {path}") from error
    exact_file(resolved)
    if not os.access(resolved, os.X_OK):
        raise RuntimeError(f"{label} target is not executable: {resolved}")
    return resolved


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


def required_git_bytes(repo_root: Path, arguments: list[str]) -> bytes:
    try:
        completed = subprocess.run(
            ["git", *arguments],
            cwd=repo_root,
            check=True,
            capture_output=True,
        )
    except (OSError, subprocess.CalledProcessError) as error:
        raise RuntimeError(
            "Required Git provenance query failed: git " + " ".join(arguments)
        ) from error
    return completed.stdout


def git_blob_descriptor(
    repo_root: Path, commit: str, relative_path: str
) -> dict[str, Any]:
    if not relative_path or Path(relative_path).is_absolute() or ".." in Path(
        relative_path
    ).parts:
        raise RuntimeError(f"Invalid Git-relative input path: {relative_path!r}")
    object_id = required_git(
        repo_root, ["rev-parse", f"{commit}:{relative_path}"]
    )
    if not re.fullmatch(r"[0-9a-f]{40}|[0-9a-f]{64}", object_id):
        raise RuntimeError(f"Invalid Git object ID for {relative_path}")
    if required_git(repo_root, ["cat-file", "-t", object_id]) != "blob":
        raise RuntimeError(f"Committed input is not a blob: {relative_path}")
    payload = required_git_bytes(repo_root, ["cat-file", "blob", object_id])
    return {
        "gitPath": relative_path,
        "objectId": object_id,
        "bytes": len(payload),
        "sha256": hashlib.sha256(payload).hexdigest(),
    }


def validate_git_blob_descriptor(
    repo_root: Path,
    commit: str,
    record: Any,
    *,
    verify_worktree: bool,
) -> list[str]:
    if not isinstance(record, dict) or set(record) != {
        "gitPath", "objectId", "bytes", "sha256"
    }:
        return ["git_blob_schema_invalid"]
    relative = record.get("gitPath")
    if not isinstance(relative, str):
        return ["git_blob_path_invalid"]
    try:
        current = git_blob_descriptor(repo_root, commit, relative)
    except RuntimeError:
        return [f"git_blob_unavailable:{relative}"]
    failures = []
    if current != record:
        failures.append(f"git_blob_binding_mismatch:{relative}")
    if verify_worktree:
        try:
            working = exact_file(safe_repo_path(repo_root, relative))
        except RuntimeError:
            failures.append(f"git_blob_worktree_missing:{relative}")
        else:
            if working["bytes"] != record.get("bytes") or working["sha256"] != record.get("sha256"):
                failures.append(f"git_blob_worktree_drift:{relative}")
    return failures


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
    candidate = root.absolute()
    reject_symlink_components(candidate, "Runtime tree")
    try:
        root_stat = candidate.lstat()
    except OSError as error:
        raise RuntimeError(f"Runtime tree is missing: {candidate}") from error
    if not stat.S_ISDIR(root_stat.st_mode):
        raise RuntimeError(f"Runtime tree is not a regular directory: {candidate}")
    resolved = candidate.resolve(strict=True)
    entries: list[dict[str, Any]] = []

    def visit(directory: Path) -> None:
        try:
            children = sorted(os.scandir(directory), key=lambda entry: entry.name)
        except OSError as error:
            raise RuntimeError(f"Cannot enumerate runtime tree: {directory}") from error
        for child in children:
            child_path = Path(child.path)
            descriptor = child.stat(follow_symlinks=False)
            relative = child_path.relative_to(resolved).as_posix()
            if "\0" in relative or "\n" in relative:
                raise RuntimeError(f"Runtime tree path is ambiguous: {relative!r}")
            if stat.S_ISLNK(descriptor.st_mode):
                target = os.readlink(child_path)
                encoded_target = target.encode("utf-8")
                entries.append({
                    "path": relative,
                    "kind": "symbolic_link",
                    "bytes": len(encoded_target),
                    "sha256": hashlib.sha256(encoded_target).hexdigest(),
                    "target": target,
                })
            elif stat.S_ISDIR(descriptor.st_mode):
                visit(child_path)
            elif stat.S_ISREG(descriptor.st_mode):
                entries.append({
                    "path": relative,
                    "kind": "regular_file",
                    "bytes": descriptor.st_size,
                    "sha256": sha256_file(child_path),
                    "target": None,
                })
            else:
                raise RuntimeError(f"Runtime tree contains a special file: {child_path}")

    visit(resolved)
    entries.sort(key=lambda entry: str(entry["path"]))
    digest = hashlib.sha256()
    for entry in entries:
        digest.update(str(entry["path"]).encode("utf-8"))
        digest.update(b"\0")
        digest.update(str(entry["kind"]).encode("ascii"))
        digest.update(b"\0")
        digest.update(str(entry["bytes"]).encode("ascii"))
        digest.update(b"\0")
        digest.update(str(entry["sha256"]).encode("ascii"))
        digest.update(b"\0")
        digest.update(str(entry["target"] or "").encode("utf-8"))
        digest.update(b"\0")
    return {
        "root": str(resolved),
        "fileCount": len(entries),
        "bytes": sum(int(entry["bytes"]) for entry in entries),
        "symlinkCount": sum(entry["kind"] == "symbolic_link" for entry in entries),
        "sha256": digest.hexdigest(),
        "hashAlgorithm": (
            "sha256(relative_path NUL kind NUL bytes NUL "
            "content_or_target_sha256 NUL target_or_empty NUL)"
        ),
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
    exact_file(path)
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


def validate_expanded_preflight_plan(
    plan: dict[str, Any],
    *,
    catalog: dict[str, Any],
    target_records: list[dict[str, Any]],
    catalog_sha256: str,
    target_manifest_sha256: str,
    target_population_commitment_sha256: str,
) -> list[str]:
    expected_keys = {
        "schemaVersion", "artifactKind", "status", "outcomeBlind",
        "roleBlind", "isSplit", "notPolicyEvidence", "catalogSha256",
        "targetManifestSha256", "targetPopulationCommitmentSha256",
        "targetPopulationFamilyCount", "selectionPolicy",
        "selectionPolicySha256", "selectedFamilyCount",
        "selectedCommitmentSha256", "selected", "interpretation",
    }
    if set(plan) != expected_keys:
        raise RuntimeError("Expanded preflight plan schema is invalid")
    if (
        plan["schemaVersion"] != 1
        or plan["artifactKind"]
        != "role_blind_expanded_map_compatibility_preflight_plan"
        or plan["status"]
        != "FROZEN_ROLE_BLIND_TECHNICAL_PREFLIGHT_NOT_CLEARANCE"
        or plan["outcomeBlind"] is not True
        or plan["roleBlind"] is not True
        or plan["isSplit"] is not False
        or plan["notPolicyEvidence"] is not True
    ):
        raise RuntimeError("Expanded preflight plan identity/safety markers are invalid")
    if (
        plan["catalogSha256"] != catalog_sha256
        or plan["targetManifestSha256"] != target_manifest_sha256
        or plan["targetPopulationCommitmentSha256"]
        != target_population_commitment_sha256
        or plan["targetPopulationFamilyCount"] != len(target_records)
    ):
        raise RuntimeError("Expanded preflight plan does not bind the supplied population")
    if plan["selectionPolicySha256"] != canonical_sha256(plan["selectionPolicy"]):
        raise RuntimeError("Expanded preflight selection-policy commitment is invalid")
    policy = plan["selectionPolicy"]
    if (
        not isinstance(policy, dict)
        or policy.get("version") != "expanded-map-compatibility-preflight-v2"
        or policy.get("axisOrder") != ["theater", "start_count", "global_extrema"]
        or not isinstance(policy.get("trace"), list)
    ):
        raise RuntimeError("Expanded preflight selection policy is not the frozen v2 policy")
    selected = plan["selected"]
    if (
        not isinstance(selected, list)
        or plan["selectedFamilyCount"] != len(selected)
        or len(selected) != EXPANDED_PREFLIGHT_FAMILY_COUNT
    ):
        raise RuntimeError("Expanded preflight must contain exactly 11 selected families")
    if forbidden_key_paths(plan):
        raise RuntimeError("Outcome fields are forbidden in the expanded preflight plan")
    if forbidden_role_key_paths(plan, "preflightPlan"):
        raise RuntimeError("Dataset-role fields are forbidden in the expanded preflight plan")

    target_by_id = {str(record["familyId"]): record for record in target_records}
    maps_by_path = {
        str(record.get("path")): record
        for record in catalog.get("maps", [])
        if isinstance(record, dict) and isinstance(record.get("path"), str)
    }
    selected_ids: list[str] = []
    selected_commitment: list[dict[str, Any]] = []
    for ordinal, raw in enumerate(selected):
        if not isinstance(raw, dict) or set(raw) != {
            "preflightOrdinal", "familyId", "representative", "coverage",
            "safeDescriptors",
        }:
            raise RuntimeError(
                f"Expanded preflight selected[{ordinal}] schema is invalid"
            )
        family_id = raw["familyId"]
        representative = raw["representative"]
        if (
            raw["preflightOrdinal"] != ordinal
            or not isinstance(family_id, str)
            or family_id in selected_ids
            or not isinstance(representative, dict)
            or set(representative) != {"path", "sha256"}
            or target_by_id.get(family_id, {}).get("representative")
            != representative
        ):
            raise RuntimeError(
                f"Expanded preflight selected[{ordinal}] identity is invalid"
            )
        map_row = maps_by_path.get(str(representative["path"]))
        descriptors = (
            map_row.get("descriptors") if isinstance(map_row, dict) else None
        )
        size = descriptors.get("size") if isinstance(descriptors, dict) else None
        expected_safe = {
            "theater": (
                descriptors.get("theater")
                if isinstance(descriptors, dict)
                else None
            ),
            "startCount": (
                descriptors.get("startCount")
                if isinstance(descriptors, dict)
                else None
            ),
            "mapArea": (
                size.get("width") * size.get("height")
                if isinstance(size, dict)
                and isinstance(size.get("width"), int)
                and not isinstance(size.get("width"), bool)
                and isinstance(size.get("height"), int)
                and not isinstance(size.get("height"), bool)
                else None
            ),
            "bytes": map_row.get("bytes") if isinstance(map_row, dict) else None,
        }
        if (
            not isinstance(map_row, dict)
            or map_row.get("familyId") != family_id
            or map_row.get("sha256") != representative["sha256"]
            or raw["safeDescriptors"] != expected_safe
            or not isinstance(raw["coverage"], dict)
            or set(raw["coverage"]) != {"axis", "value"}
        ):
            raise RuntimeError(
                f"Expanded preflight selected[{ordinal}] catalog binding is invalid"
            )
        selected_ids.append(family_id)
        selected_commitment.append({
            "familyId": family_id,
            "representative": representative,
        })
    if plan["selectedCommitmentSha256"] != canonical_sha256(selected_commitment):
        raise RuntimeError("Expanded preflight selected-family commitment is invalid")
    trace = policy["trace"]
    if len(trace) != len(selected) or any(
        not isinstance(item, dict)
        or item.get("familyId") != selected[index]["familyId"]
        or item.get("axis") != selected[index]["coverage"]["axis"]
        or item.get("value") != selected[index]["coverage"]["value"]
        for index, item in enumerate(trace)
    ):
        raise RuntimeError("Expanded preflight trace does not match selected families")
    return selected_ids


def select_run_population(
    selected: list[dict[str, Any]], preflight_family_ids: list[str] | None
) -> tuple[list[tuple[int, dict[str, Any]]], str]:
    population = sorted(selected, key=lambda item: str(item.get("familyId")))
    indexed_population = list(enumerate(population))
    if preflight_family_ids is None:
        return indexed_population, "full"
    if (
        len(preflight_family_ids) != EXPANDED_PREFLIGHT_FAMILY_COUNT
        or len(set(preflight_family_ids)) != len(preflight_family_ids)
    ):
        raise RuntimeError(
            "Expanded preflight family list must contain exactly 11 unique IDs"
        )
    selected_ids = set(preflight_family_ids)
    run_population = [
        item for item in indexed_population
        if str(item[1].get("familyId")) in selected_ids
    ]
    if len(run_population) != len(preflight_family_ids):
        raise RuntimeError(
            "Expanded preflight contains a family outside the target population"
        )
    return run_population, "preflight"


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
    preflight_plan_path: Path | None = None,
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
    if (
        isinstance(engine_seed_base, bool)
        or not isinstance(engine_seed_base, int)
        or not 0 <= engine_seed_base <= 2 ** 32 - 1
    ):
        raise RuntimeError("engine_seed_base must be uint32")
    preflight_plan: dict[str, Any] | None = None
    preflight_family_ids: list[str] | None = None
    if preflight_plan_path is not None:
        preflight_plan_path = preflight_plan_path.resolve()
        expected_plan_path = (repo_root / PREFLIGHT_PLAN_RELATIVE_PATH).resolve()
        if preflight_plan_path != expected_plan_path:
            raise RuntimeError(
                "Expanded preflight plan must use the committed canonical "
                "repository path"
            )
        preflight_plan = load_json(preflight_plan_path)
        preflight_family_ids = validate_expanded_preflight_plan(
            preflight_plan,
            catalog=catalog,
            target_records=target_records,
            catalog_sha256=sha256_file(catalog_path),
            target_manifest_sha256=sha256_file(targets_path),
            target_population_commitment_sha256=target_population_commitment,
        )
    pinned_debug_logging = (
        debug_logging if debug_logging is not None else os.environ.get("DEBUG_LOGGING")
    )
    if pinned_debug_logging != "1":
        raise RuntimeError(
            "DEBUG_LOGGING must be explicitly pinned to '1' so game-api warnings "
            "are visible to the fidelity capture"
        )

    source_state = git_descriptor(repo_root)
    required_committed_paths = [
        repo_root / relative_path for relative_path in TOOL_SOURCE_PATHS
    ] + [targets_path, catalog_path] + (
        [preflight_plan_path] if preflight_plan_path is not None else []
    )
    if require_clean_source:
        tracked_inputs = assert_clean_committed_source(
            repo_root, source_state, required_committed_paths
        )
    else:
        tracked_inputs = [
            path.resolve().relative_to(repo_root).as_posix()
            for path in required_committed_paths
        ]

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
    run_population, scope = select_run_population(selected, preflight_family_ids)

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
    resolved_node_binary = resolved_executable(resolved_node_binary, "node")
    resolved_python_binary = resolved_executable(
        python_binary or Path(sys.executable), "python"
    )
    resolved_scontrol_binary = resolved_executable(scontrol_binary or Path(
        os.environ.get("SCONTROL", "/opt/slurm/current/bin/scontrol")
    ), "scontrol")
    compiled_inputs = [
        exact_file(driver_dist / name)
        for name in COMPILED_RUNTIME_NAMES
    ]
    source_inputs = [
        exact_file(repo_root / relative_path)
        for relative_path in TOOL_SOURCE_PATHS
    ]
    target_input = exact_file(targets_path)
    catalog_input = exact_file(catalog_path)
    preflight_plan_input = (
        exact_file(preflight_plan_path) if preflight_plan_path is not None else None
    )
    package_lock = exact_file(repo_root / "package-lock.json")
    node_runtime = exact_file(resolved_node_binary)
    python_runtime = exact_file(resolved_python_binary)
    scontrol_runtime = exact_file(resolved_scontrol_binary)
    game_api_package = exact_file(game_api_root / "package.json")
    game_api_runtime = exact_file(game_api_root / "dist/index.js")
    game_api_runtime_tree = tree_descriptor(game_api_root)
    runtime_dependency_tree = tree_descriptor(repo_root / "node_modules")
    mix_tree = tree_descriptor(mix_dir)
    committed_paths = [
        *TOOL_SOURCE_PATHS,
        targets_path.relative_to(repo_root).as_posix(),
        catalog_path.relative_to(repo_root).as_posix(),
        *(
            [preflight_plan_path.relative_to(repo_root).as_posix()]
            if preflight_plan_path is not None
            else []
        ),
    ]
    ordered_committed_paths = list(dict.fromkeys(committed_paths))
    git_blobs = [
        git_blob_descriptor(repo_root, str(source_state["commit"]), relative)
        for relative in ordered_committed_paths
    ]
    source_bundle = bundle_descriptor([
        ("gitCommit", str(source_state["commit"])),
        *[(
            f"gitBlob:{record['gitPath']}",
            f"{record['objectId']}:{record['sha256']}",
        ) for record in git_blobs],
        *[(
            f"mapAsset:{family['index']}:{family['representativeMapPath']}",
            f"{family['bytes']}:{family['sha256']}",
        ) for family in families],
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
    compiled_by_name = {
        Path(str(record["path"])).name: record for record in compiled_inputs
    }
    temporary_inputs = {
        "packageLock": package_lock,
        "nodeRuntime": node_runtime,
        "pythonRuntime": python_runtime,
        "scontrolRuntime": scontrol_runtime,
        "gameApiPackage": game_api_package,
        "gameApiRuntime": game_api_runtime,
        "gameApiRuntimeTree": game_api_runtime_tree,
        "runtimeDependencyTree": runtime_dependency_tree,
        "mixTree": mix_tree,
        "sourceBundle": source_bundle,
        "runtimeBundle": runtime_bundle,
    }
    runtime_hashes = {
        output_key: str(
            compiled_by_name[lookup]["sha256"]
            if kind == "compiled"
            else temporary_inputs[lookup]["sha256"]
        )
        for output_key, kind, lookup in RUNTIME_HASH_BINDINGS
    }
    family_sequence_sha256 = canonical_sha256(families)
    return {
        "schemaVersion": MANIFEST_SCHEMA_VERSION,
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
            "participantCountry": PARTICIPANT_COUNTRY,
            "initialTickRequired": 0,
            "tickUpdateArithmetic": "updates === finalTick - initialTick",
            "mapLoadAttestation": {
                "protocol": MAP_LOAD_ATTESTATION_PROTOCOL,
                "aliasTemplate": "cdfid-{familyIndex:06d}-{mapSha256}.map",
                "expectedReadsByPhase": {
                    "initialization": 1,
                    "forward_create": 2,
                    "reverse_create": 2,
                },
                "totalExpectedReads": 5,
            },
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
            "gitBlobs": git_blobs,
            "sourceFiles": source_inputs,
            "targetManifest": target_input,
            "targetPopulationCommitmentSha256": target_population_commitment,
            "catalog": catalog_input,
            "preflightPlan": preflight_plan_input,
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
            "familySequenceSha256": family_sequence_sha256,
        },
        "runtimeHashes": runtime_hashes,
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
                EXPANDED_PREFLIGHT_RULE if scope == "preflight" else None
            ),
            "preflightPlanSha256": (
                preflight_plan_input["sha256"]
                if preflight_plan_input is not None
                else None
            ),
            "preflightSelectedCommitmentSha256": (
                preflight_plan["selectedCommitmentSha256"]
                if preflight_plan is not None
                else None
            ),
        },
        "families": families,
    }


MANIFEST_TOP_LEVEL_KEYS = {
    "schemaVersion", "gate", "outcomeFree", "status", "createdAt",
    "scheduler", "protocol", "inputs", "runtimeHashes", "selection", "families",
}
MANIFEST_INPUT_KEYS = {
    "repoRoot", "git", "trackedCommittedInputs", "gitBlobs", "sourceFiles",
    "targetManifest", "targetPopulationCommitmentSha256", "catalog",
    "preflightPlan", "mixDir", "mixTree", "packageLock", "nodeRuntime",
    "pythonRuntime", "scontrolRuntime",
    "gameApiPackage", "gameApiRuntime", "gameApiRuntimeTree",
    "runtimeDependencyTree", "compiledProbe", "compiledRuntime", "logging",
    "sourceBundle", "runtimeBundle", "familySequenceSha256",
}
MANIFEST_PROTOCOL_KEYS = {
    "targetTick", "engineSeedBase", "participantCountry", "initialTickRequired",
    "tickUpdateArithmetic", "mapLoadAttestation", "reciprocalOrders",
    "dynamicStartCoverageClaim", "requiredSections", "requiredKeys",
    "warningCategorySeverity", "consoleErrorAlwaysFails", "forbiddenOutcomeKeys",
    "noPolicyBots", "noGameCompletionQuery", "logging",
}
MANIFEST_FAMILY_KEYS = {
    "index", "familyId", "representativeMapPath", "representativeSelectionRule",
    "mapName", "bytes", "sha256", "sections", "requiredSections",
    "requiredKeys", "payloadEntryCounts", "declaredStartLocations", "staticChecks",
}
EXACT_FILE_KEYS = {"path", "bytes", "sha256"}
TREE_KEYS_V2 = {
    "root", "fileCount", "bytes", "symlinkCount", "sha256", "hashAlgorithm", "entries",
}
TREE_ENTRY_KEYS_V2 = {"path", "kind", "bytes", "sha256", "target"}
TREE_HASH_ALGORITHM_V2 = (
    "sha256(relative_path NUL kind NUL bytes NUL content_or_target_sha256 "
    "NUL target_or_empty NUL)"
)


def strict_object(value: Any, expected_keys: set[str], label: str) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise RuntimeError(f"{label} must be an object")
    if set(value) != expected_keys:
        raise RuntimeError(
            f"{label} keys must be exactly {sorted(expected_keys)}, got {sorted(value)}"
        )
    return value


def strict_nonnegative_integer(value: Any, label: str) -> int:
    if isinstance(value, bool) or not isinstance(value, int) or value < 0:
        raise RuntimeError(f"{label} must be a nonnegative integer")
    return value


def strict_sha256(value: Any, label: str) -> str:
    if not isinstance(value, str) or not HEX_SHA256.fullmatch(value):
        raise RuntimeError(f"{label} must be a lowercase SHA-256")
    return value


def strict_exact_file_record(value: Any, label: str) -> dict[str, Any]:
    record = strict_object(value, EXACT_FILE_KEYS, label)
    if not isinstance(record["path"], str) or not Path(record["path"]).is_absolute():
        raise RuntimeError(f"{label}.path must be absolute")
    strict_nonnegative_integer(record["bytes"], f"{label}.bytes")
    strict_sha256(record["sha256"], f"{label}.sha256")
    return record


def strict_tree_record(value: Any, label: str) -> dict[str, Any]:
    record = strict_object(value, TREE_KEYS_V2, label)
    if not isinstance(record["root"], str) or not Path(record["root"]).is_absolute():
        raise RuntimeError(f"{label}.root must be absolute")
    for key in ("fileCount", "bytes", "symlinkCount"):
        strict_nonnegative_integer(record[key], f"{label}.{key}")
    strict_sha256(record["sha256"], f"{label}.sha256")
    if record["hashAlgorithm"] != TREE_HASH_ALGORITHM_V2:
        raise RuntimeError(f"{label}.hashAlgorithm is not the v2 symlink-aware algorithm")
    entries = record["entries"]
    if not isinstance(entries, list):
        raise RuntimeError(f"{label}.entries must be an array")
    previous = None
    digest = hashlib.sha256()
    total_bytes = 0
    symlink_count = 0
    for index, raw_entry in enumerate(entries):
        entry = strict_object(raw_entry, TREE_ENTRY_KEYS_V2, f"{label}.entries[{index}]")
        relative = entry["path"]
        if (
            not isinstance(relative, str)
            or not relative
            or Path(relative).is_absolute()
            or ".." in Path(relative).parts
            or "\0" in relative
            or "\n" in relative
            or (previous is not None and relative <= previous)
        ):
            raise RuntimeError(f"{label}.entries[{index}].path/order is invalid")
        previous = relative
        kind = entry["kind"]
        target = entry["target"]
        if kind == "regular_file":
            if target is not None:
                raise RuntimeError(f"{label}.entries[{index}].target must be null")
        elif kind == "symbolic_link":
            if not isinstance(target, str):
                raise RuntimeError(f"{label}.entries[{index}].target must be a string")
            encoded_target = target.encode("utf-8")
            if entry["bytes"] != len(encoded_target) or entry["sha256"] != hashlib.sha256(encoded_target).hexdigest():
                raise RuntimeError(f"{label}.entries[{index}] does not bind its symlink target")
            symlink_count += 1
        else:
            raise RuntimeError(f"{label}.entries[{index}].kind is invalid")
        size = strict_nonnegative_integer(entry["bytes"], f"{label}.entries[{index}].bytes")
        strict_sha256(entry["sha256"], f"{label}.entries[{index}].sha256")
        total_bytes += size
        for component in (
            relative,
            kind,
            str(size),
            str(entry["sha256"]),
            str(target or ""),
        ):
            digest.update(component.encode("utf-8"))
            digest.update(b"\0")
    if (
        record["fileCount"] != len(entries)
        or record["bytes"] != total_bytes
        or record["symlinkCount"] != symlink_count
        or record["sha256"] != digest.hexdigest()
    ):
        raise RuntimeError(f"{label} aggregate commitment is inconsistent")
    return record


def strict_bundle_record(value: Any, label: str) -> dict[str, Any]:
    record = strict_object(value, {"hashAlgorithm", "members", "sha256"}, label)
    failures = verify_bundle(record, label)
    if failures:
        raise RuntimeError(f"{label} is invalid: {', '.join(failures)}")
    return record


def runtime_hashes_from_manifest_inputs(inputs: dict[str, Any]) -> dict[str, str]:
    compiled = inputs.get("compiledRuntime")
    if not isinstance(compiled, list):
        raise RuntimeError("manifest.inputs.compiledRuntime must be an array")
    compiled_by_name: dict[str, dict[str, Any]] = {}
    for index, raw_record in enumerate(compiled):
        record = strict_exact_file_record(raw_record, f"manifest.inputs.compiledRuntime[{index}]")
        name = Path(record["path"]).name
        if name in compiled_by_name:
            raise RuntimeError(f"Duplicate compiled runtime basename: {name}")
        compiled_by_name[name] = record
    values: dict[str, str] = {}
    for output_key, kind, lookup in RUNTIME_HASH_BINDINGS:
        if kind == "compiled":
            if lookup not in compiled_by_name:
                raise RuntimeError(f"Missing compiled runtime binding: {lookup}")
            values[output_key] = str(compiled_by_name[lookup]["sha256"])
        else:
            record = inputs.get(lookup)
            if not isinstance(record, dict):
                raise RuntimeError(f"Missing manifest input binding: {lookup}")
            values[output_key] = strict_sha256(
                record.get("sha256"), f"manifest.inputs.{lookup}.sha256"
            )
    return values


def manifest_attestation_bindings(manifest: dict[str, Any]) -> dict[str, str]:
    inputs = manifest["inputs"]
    return {
        "sourceCommit": str(inputs["git"]["commit"]),
        "targetPopulationCommitmentSha256": str(inputs["targetPopulationCommitmentSha256"]),
        "familySequenceSha256": str(inputs["familySequenceSha256"]),
        "sourceBundleSha256": str(inputs["sourceBundle"]["sha256"]),
        "runtimeBundleSha256": str(inputs["runtimeBundle"]["sha256"]),
    }


def validate_manifest_v2(
    manifest: dict[str, Any],
    *,
    scheduler: dict[str, Any] | None = None,
    verify_runtime_inputs: bool = True,
) -> dict[str, Any]:
    strict_object(manifest, MANIFEST_TOP_LEVEL_KEYS, "manifest")
    if (
        manifest["schemaVersion"] != MANIFEST_SCHEMA_VERSION
        or manifest["gate"] != GATE
        or manifest["outcomeFree"] is not True
    ):
        raise RuntimeError("Manifest v2 identity markers are invalid")
    if forbidden_key_paths(manifest):
        raise RuntimeError("Manifest v2 contains forbidden outcome keys")
    if forbidden_role_key_paths(manifest):
        raise RuntimeError("Manifest v2 contains forbidden role keys")
    manifest_scheduler = strict_object(
        manifest["scheduler"], {"jobId", "account", "partition", "qos", "source"},
        "manifest.scheduler",
    )
    if (
        not isinstance(manifest_scheduler["jobId"], str)
        or not manifest_scheduler["jobId"]
        or manifest_scheduler["account"] != "pi_jss233"
        or manifest_scheduler["source"] != "scontrol"
    ):
        raise RuntimeError("Manifest scheduler provenance is invalid")
    for key in ("partition", "qos"):
        if manifest_scheduler[key] is not None and not isinstance(manifest_scheduler[key], str):
            raise RuntimeError(f"manifest.scheduler.{key} must be a string or null")
    if scheduler is not None and manifest_scheduler != scheduler:
        raise RuntimeError("Manifest scheduler does not equal authoritative scheduler")
    if not isinstance(manifest["createdAt"], str):
        raise RuntimeError("manifest.createdAt must be a string")

    protocol = strict_object(manifest["protocol"], MANIFEST_PROTOCOL_KEYS, "manifest.protocol")
    target_tick = strict_nonnegative_integer(protocol["targetTick"], "manifest.protocol.targetTick")
    if target_tick <= 1:
        raise RuntimeError("manifest.protocol.targetTick must exceed one")
    engine_seed_base = strict_nonnegative_integer(
        protocol["engineSeedBase"], "manifest.protocol.engineSeedBase"
    )
    if engine_seed_base > 2 ** 32 - 1:
        raise RuntimeError("manifest.protocol.engineSeedBase must be uint32")
    expected_map_load = {
        "protocol": MAP_LOAD_ATTESTATION_PROTOCOL,
        "aliasTemplate": "cdfid-{familyIndex:06d}-{mapSha256}.map",
        "expectedReadsByPhase": {"initialization": 1, "forward_create": 2, "reverse_create": 2},
        "totalExpectedReads": 5,
    }
    expected_protocol_literals = {
        "participantCountry": PARTICIPANT_COUNTRY,
        "initialTickRequired": 0,
        "tickUpdateArithmetic": "updates === finalTick - initialTick",
        "mapLoadAttestation": expected_map_load,
        "reciprocalOrders": [["alpha", "beta"], ["beta", "alpha"]],
        "dynamicStartCoverageClaim": (
            "One deterministic reciprocal pair per map; all declared starts "
            "are statically enumerated, not all dynamically exercised."
        ),
        "requiredSections": list(REQUIRED_SECTIONS),
        "requiredKeys": {section: list(keys) for section, keys in REQUIRED_KEYS.items()},
        "warningCategorySeverity": WARNING_POLICY,
        "consoleErrorAlwaysFails": True,
        "forbiddenOutcomeKeys": list(FORBIDDEN_OUTCOME_KEYS),
        "noPolicyBots": True,
        "noGameCompletionQuery": True,
        "logging": {"debugLogging": "1", "source": "sbatch_pinned"},
    }
    for key, expected in expected_protocol_literals.items():
        if protocol[key] != expected:
            raise RuntimeError(f"manifest.protocol.{key} is not the frozen v2 value")

    inputs = strict_object(manifest["inputs"], MANIFEST_INPUT_KEYS, "manifest.inputs")
    repo_root_value = inputs["repoRoot"]
    if not isinstance(repo_root_value, str) or not Path(repo_root_value).is_absolute():
        raise RuntimeError("manifest.inputs.repoRoot must be absolute")
    repo_root = Path(repo_root_value)
    if verify_runtime_inputs:
        reject_symlink_components(repo_root, "manifest repository root")
        if not repo_root.is_dir():
            raise RuntimeError("manifest repository root is missing")
    git_state = strict_object(inputs["git"], {
        "commit", "branch", "status", "criticalStatus", "criticalPaths",
        "trackedDiffBytes", "trackedDiffSha256",
    }, "manifest.inputs.git")
    commit = git_state["commit"]
    if not isinstance(commit, str) or not re.fullmatch(r"[0-9a-f]{40}|[0-9a-f]{64}", commit):
        raise RuntimeError("manifest.inputs.git.commit is invalid")
    if (
        git_state["status"] != []
        or git_state["criticalStatus"] != []
        or git_state["criticalPaths"] != list(CRITICAL_GIT_PATHS)
        or git_state["trackedDiffBytes"] != 0
        or git_state["trackedDiffSha256"] != hashlib.sha256(b"").hexdigest()
    ):
        raise RuntimeError("Manifest source state is not clean and committed")
    if git_state["branch"] is not None and not isinstance(git_state["branch"], str):
        raise RuntimeError("manifest.inputs.git.branch must be a string or null")

    file_input_names = (
        "targetManifest", "catalog", "packageLock", "nodeRuntime", "pythonRuntime",
        "scontrolRuntime", "gameApiPackage", "gameApiRuntime", "compiledProbe",
    )
    for name in file_input_names:
        strict_exact_file_record(inputs[name], f"manifest.inputs.{name}")
    preflight_plan_record = inputs["preflightPlan"]
    if preflight_plan_record is not None:
        strict_exact_file_record(preflight_plan_record, "manifest.inputs.preflightPlan")
    source_files = inputs["sourceFiles"]
    if not isinstance(source_files, list) or len(source_files) != len(TOOL_SOURCE_PATHS):
        raise RuntimeError("manifest.inputs.sourceFiles has the wrong length")
    for index, (record, relative) in enumerate(zip(source_files, TOOL_SOURCE_PATHS)):
        strict_exact_file_record(record, f"manifest.inputs.sourceFiles[{index}]")
        if Path(record["path"]).absolute() != (repo_root / relative).absolute():
            raise RuntimeError("manifest.inputs.sourceFiles order/path mismatch")
    compiled_runtime = inputs["compiledRuntime"]
    if not isinstance(compiled_runtime, list) or [
        Path(str(record.get("path", ""))).name if isinstance(record, dict) else None
        for record in compiled_runtime
    ] != list(COMPILED_RUNTIME_NAMES):
        raise RuntimeError("manifest.inputs.compiledRuntime order/basenames mismatch")
    for index, record in enumerate(compiled_runtime):
        strict_exact_file_record(record, f"manifest.inputs.compiledRuntime[{index}]")
    if inputs["compiledProbe"] != compiled_runtime[0]:
        raise RuntimeError("manifest.inputs.compiledProbe must alias the first compiled runtime")
    if inputs["logging"] != {"debugLogging": "1", "source": "sbatch_pinned"}:
        raise RuntimeError("manifest.inputs.logging is invalid")
    for name in ("mixTree", "gameApiRuntimeTree", "runtimeDependencyTree"):
        strict_tree_record(inputs[name], f"manifest.inputs.{name}")
    strict_bundle_record(inputs["sourceBundle"], "manifest.inputs.sourceBundle")
    strict_bundle_record(inputs["runtimeBundle"], "manifest.inputs.runtimeBundle")
    strict_sha256(inputs["targetPopulationCommitmentSha256"], "target population commitment")
    strict_sha256(inputs["familySequenceSha256"], "family sequence commitment")

    selection = strict_object(manifest["selection"], {
        "criterion", "forbiddenCriterion", "roleBlind", "scope",
        "populationFamilyCount", "familyCount", "representativeField",
        "preflightRule", "preflightPlanSha256",
        "preflightSelectedCommitmentSha256",
    }, "manifest.selection")
    if selection["roleBlind"] is not True or selection["scope"] not in {"full", "preflight"}:
        raise RuntimeError("manifest.selection is not role-blind full/preflight")
    expected_preflight_rule = (
        EXPANDED_PREFLIGHT_RULE
        if selection["scope"] == "preflight" else None
    )
    expected_selection_literals = {
        "criterion": "all records in committed role-blind target manifest",
        "forbiddenCriterion": "any train/validation/test role or dry-run assignment",
        "representativeField": "representativeMapPath",
        "preflightRule": expected_preflight_rule,
    }
    for key, expected in expected_selection_literals.items():
        if selection[key] != expected:
            raise RuntimeError(f"manifest.selection.{key} is not the frozen value")
    population_count = strict_nonnegative_integer(
        selection["populationFamilyCount"], "manifest.selection.populationFamilyCount"
    )
    run_count = strict_nonnegative_integer(selection["familyCount"], "manifest.selection.familyCount")
    if selection["scope"] == "full":
        if (
            preflight_plan_record is not None
            or selection["preflightPlanSha256"] is not None
            or selection["preflightSelectedCommitmentSha256"] is not None
        ):
            raise RuntimeError(
                "Full manifest must not bind a preflight selection plan"
            )
    else:
        if preflight_plan_record is None:
            raise RuntimeError("Preflight manifest lacks its committed plan")
        plan_sha256 = strict_sha256(
            selection["preflightPlanSha256"],
            "manifest.selection.preflightPlanSha256",
        )
        strict_sha256(
            selection["preflightSelectedCommitmentSha256"],
            "manifest.selection.preflightSelectedCommitmentSha256",
        )
        if (
            run_count != EXPANDED_PREFLIGHT_FAMILY_COUNT
            or plan_sha256 != preflight_plan_record["sha256"]
            or Path(preflight_plan_record["path"]).absolute()
            != (repo_root / PREFLIGHT_PLAN_RELATIVE_PATH).absolute()
        ):
            raise RuntimeError("Preflight manifest plan/count binding is invalid")
    expected_status = (
        "SLURM_MAP_FIDELITY_FULL_NOT_A_PAPER_RESULT"
        if selection["scope"] == "full"
        else "SLURM_MAP_FIDELITY_PREFLIGHT_NOT_CLEARANCE"
    )
    if manifest["status"] != expected_status:
        raise RuntimeError("Manifest status and selection scope disagree")

    families = manifest["families"]
    if not isinstance(families, list) or len(families) != run_count or not families:
        raise RuntimeError("Manifest family count is invalid")
    if selection["scope"] == "full" and population_count != run_count:
        raise RuntimeError("Full manifest does not cover its population")
    seen_ids: set[str] = set()
    seen_indices: set[int] = set()
    previous_index = -1
    representative_paths: list[str] = []
    for ordinal, raw_family in enumerate(families):
        family = strict_object(raw_family, MANIFEST_FAMILY_KEYS, f"manifest.families[{ordinal}]")
        index = strict_nonnegative_integer(family["index"], f"manifest.families[{ordinal}].index")
        family_id = family["familyId"]
        if (
            not isinstance(family_id, str)
            or not family_id
            or family_id in seen_ids
            or index in seen_indices
            or index <= previous_index
        ):
            raise RuntimeError("Manifest family identity/order is invalid")
        seen_ids.add(family_id)
        seen_indices.add(index)
        previous_index = index
        representative = family["representativeMapPath"]
        if not isinstance(representative, str):
            raise RuntimeError("Manifest representative path is invalid")
        representative_paths.append(representative)
        if family["mapName"] != Path(representative).name:
            raise RuntimeError("Manifest map basename is inconsistent")
        strict_nonnegative_integer(family["bytes"], "manifest family bytes")
        strict_sha256(family["sha256"], "manifest family sha256")
        expected_static = parse_map(safe_repo_path(repo_root, representative)) if verify_runtime_inputs else None
        if expected_static is not None:
            current = exact_file(safe_repo_path(repo_root, representative))
            if current["bytes"] != family["bytes"] or current["sha256"] != family["sha256"]:
                raise RuntimeError(f"Representative file drift: {representative}")
            for key in (
                "sections", "requiredSections", "requiredKeys", "payloadEntryCounts",
                "declaredStartLocations", "staticChecks",
            ):
                if family[key] != expected_static[key]:
                    raise RuntimeError(f"Manifest family static parsing drift: {representative}:{key}")
    if canonical_sha256(families) != inputs["familySequenceSha256"]:
        raise RuntimeError("Manifest family sequence commitment mismatch")

    target_path = Path(inputs["targetManifest"]["path"])
    catalog_path = Path(inputs["catalog"]["path"])
    try:
        target_relative = target_path.absolute().relative_to(repo_root.absolute()).as_posix()
        catalog_relative = catalog_path.absolute().relative_to(repo_root.absolute()).as_posix()
        preflight_relative = (
            Path(preflight_plan_record["path"]).absolute()
            .relative_to(repo_root.absolute()).as_posix()
            if preflight_plan_record is not None else None
        )
    except ValueError as error:
        raise RuntimeError("Target/catalog path is outside the recorded repository") from error
    expected_tracked = [
        *TOOL_SOURCE_PATHS,
        target_relative,
        catalog_relative,
        *([preflight_relative] if preflight_relative is not None else []),
    ]
    if inputs["trackedCommittedInputs"] != expected_tracked:
        raise RuntimeError("manifest.inputs.trackedCommittedInputs is not the frozen order")
    expected_git_paths = list(dict.fromkeys([
        *TOOL_SOURCE_PATHS, target_relative, catalog_relative,
        *([preflight_relative] if preflight_relative is not None else []),
    ]))
    git_blobs = inputs["gitBlobs"]
    if not isinstance(git_blobs, list) or [
        record.get("gitPath") if isinstance(record, dict) else None for record in git_blobs
    ] != expected_git_paths:
        raise RuntimeError("manifest.inputs.gitBlobs path/order mismatch")
    for record in git_blobs:
        failures = validate_git_blob_descriptor(
            repo_root, commit, record, verify_worktree=verify_runtime_inputs
        )
        if failures:
            raise RuntimeError("Git/blob drift: " + ", ".join(failures))
    expected_source_bundle = bundle_descriptor([
        ("gitCommit", commit),
        *[(
            f"gitBlob:{record['gitPath']}",
            f"{record['objectId']}:{record['sha256']}",
        ) for record in git_blobs],
        *[(
            f"mapAsset:{family['index']}:{family['representativeMapPath']}",
            f"{family['bytes']}:{family['sha256']}",
        ) for family in families],
    ])
    if inputs["sourceBundle"] != expected_source_bundle:
        raise RuntimeError("Manifest source bundle binding mismatch")
    expected_runtime_bundle = bundle_descriptor([
        ("packageLock", str(inputs["packageLock"]["sha256"])),
        ("nodeRuntime", str(inputs["nodeRuntime"]["sha256"])),
        ("pythonRuntime", str(inputs["pythonRuntime"]["sha256"])),
        ("scontrolRuntime", str(inputs["scontrolRuntime"]["sha256"])),
        ("gameApiPackage", str(inputs["gameApiPackage"]["sha256"])),
        ("gameApiRuntime", str(inputs["gameApiRuntime"]["sha256"])),
        ("gameApiRuntimeTree", str(inputs["gameApiRuntimeTree"]["sha256"])),
        ("runtimeDependencyTree", str(inputs["runtimeDependencyTree"]["sha256"])),
        *[(
            f"compiledRuntime:{Path(str(record['path'])).name}", str(record["sha256"])
        ) for record in compiled_runtime],
        ("mixTree", str(inputs["mixTree"]["sha256"])),
    ])
    if inputs["runtimeBundle"] != expected_runtime_bundle:
        raise RuntimeError("Manifest runtime bundle binding mismatch")
    expected_runtime_hashes = runtime_hashes_from_manifest_inputs(inputs)
    if manifest["runtimeHashes"] != expected_runtime_hashes:
        raise RuntimeError("Manifest fixed runtime-hash binding mismatch")

    if verify_runtime_inputs:
        for record in [
            *source_files, *compiled_runtime,
            *(inputs[name] for name in file_input_names),
            *([preflight_plan_record] if preflight_plan_record is not None else []),
        ]:
            failure = verify_exact_file(record)
            if failure:
                raise RuntimeError(failure)
        for name in ("mixTree", "gameApiRuntimeTree", "runtimeDependencyTree"):
            current_tree = tree_descriptor(Path(str(inputs[name]["root"])))
            if current_tree != inputs[name]:
                raise RuntimeError(f"Manifest runtime tree drift: {name}")
        targets = load_json(target_path)
        target_records = targets.get("targets")
        if not isinstance(target_records, list):
            raise RuntimeError("Committed target manifest lacks targets")
        commitment = canonical_sha256(target_records)
        if (
            commitment != inputs["targetPopulationCommitmentSha256"]
            or targets.get("populationCommitmentSha256") != commitment
            or targets.get("catalogSha256") != inputs["catalog"]["sha256"]
        ):
            raise RuntimeError("Immutable target population commitment drift")
        target_by_id = {
            str(record.get("familyId")): record for record in target_records
            if isinstance(record, dict)
        }
        for family in families:
            target = target_by_id.get(str(family["familyId"]))
            if not isinstance(target, dict) or target.get("representative") != {
                "path": family["representativeMapPath"], "sha256": family["sha256"]
            }:
                raise RuntimeError("Manifest family does not match immutable target record")
        if selection["scope"] == "preflight":
            if preflight_plan_record is None:
                raise RuntimeError("Preflight plan disappeared during verification")
            plan = load_json(Path(preflight_plan_record["path"]))
            selected_ids = validate_expanded_preflight_plan(
                plan,
                catalog=load_json(catalog_path),
                target_records=target_records,
                catalog_sha256=inputs["catalog"]["sha256"],
                target_manifest_sha256=inputs["targetManifest"]["sha256"],
                target_population_commitment_sha256=commitment,
            )
            if (
                set(selected_ids) != seen_ids
                or plan["selectedCommitmentSha256"]
                != selection["preflightSelectedCommitmentSha256"]
            ):
                raise RuntimeError(
                    "Manifest families do not equal the committed expanded "
                    "preflight selection"
                )
    return manifest


WARNING_KEYS_V2 = {"phase", "level", "category", "severity", "diagnosticSha256"}
ERROR_KEYS_V2 = {"category", "name", "messageSha256"}
PROBE_KEYS_V2 = {
    "order", "loaded", "initialTick", "finalTick", "updates", "initialTickIsZero",
    "tickUpdateArithmeticConsistent", "progressedBeyondTickOne", "reachedTargetTick",
    "starts", "wallTimeMs", "warningCaptureTruncated", "error",
}
FAMILY_RESULT_KEYS_V2 = {
    "familyIndex", "familyId", "representativeMapPath", "mapName", "executedMapAlias",
    "mapBytes", "mapSha256", "slurmJobId", "requestedEngineSeed", "targetTick",
    "declaredStartLocations", "forward", "reverse", "reciprocalStartCheck", "warnings",
    "failureCategories", "reviewCategories", "fidelityStatus",
}
MAP_LOAD_ATTESTATION_KEYS_V2 = {
    "protocol", "alias", "aliasPath", "expectedBytes", "expectedSha256",
    "phases", "reads", "complete",
}


def map_load_alias(family_index: int, map_sha256: str) -> str:
    if not 0 <= family_index <= 999_999:
        raise RuntimeError("Family index is outside the attested alias range")
    strict_sha256(map_sha256, "map alias SHA-256")
    return f"cdfid-{family_index:06d}-{map_sha256}.map"


def strict_serialized_error(value: Any, label: str) -> dict[str, Any]:
    record = strict_object(value, ERROR_KEYS_V2, label)
    if record["category"] not in WARNING_POLICY or record["name"] != "captured_error":
        raise RuntimeError(f"{label} category/name is invalid")
    strict_sha256(record["messageSha256"], f"{label}.messageSha256")
    return record


def strict_warning(value: Any, label: str) -> dict[str, Any]:
    record = strict_object(value, WARNING_KEYS_V2, label)
    if not isinstance(record["phase"], str) or not record["phase"]:
        raise RuntimeError(f"{label}.phase is invalid")
    if record["level"] not in {"debug", "info", "log", "warn", "error"}:
        raise RuntimeError(f"{label}.level is invalid")
    category = record["category"]
    if category not in WARNING_POLICY:
        raise RuntimeError(f"{label}.category is invalid")
    expected_severity = "fail" if record["level"] == "error" else WARNING_POLICY[category]
    if record["severity"] != expected_severity:
        raise RuntimeError(f"{label}.severity is inconsistent")
    strict_sha256(record["diagnosticSha256"], f"{label}.diagnosticSha256")
    return record


def strict_warning_array(value: Any, label: str) -> list[dict[str, Any]]:
    if not isinstance(value, list):
        raise RuntimeError(f"{label} must be an array")
    return [strict_warning(item, f"{label}[{index}]") for index, item in enumerate(value)]


def validate_probe_run_v2(
    value: Any,
    *,
    label: str,
    expected_order: list[str],
    target_tick: int,
) -> tuple[dict[str, Any], list[str]]:
    probe = strict_object(value, PROBE_KEYS_V2, label)
    if probe["order"] != expected_order:
        raise RuntimeError(f"{label}.order is invalid")
    initial_tick = probe["initialTick"]
    final_tick = probe["finalTick"]
    if initial_tick is not None:
        strict_nonnegative_integer(initial_tick, f"{label}.initialTick")
    if final_tick is not None:
        strict_nonnegative_integer(final_tick, f"{label}.finalTick")
    updates = strict_nonnegative_integer(probe["updates"], f"{label}.updates")
    derived_initial_zero = initial_tick == 0
    derived_arithmetic = (
        isinstance(initial_tick, int)
        and not isinstance(initial_tick, bool)
        and isinstance(final_tick, int)
        and not isinstance(final_tick, bool)
        and updates == final_tick - initial_tick
    )
    expected_markers = {
        "loaded": isinstance(initial_tick, int) and not isinstance(initial_tick, bool),
        "initialTickIsZero": derived_initial_zero,
        "tickUpdateArithmeticConsistent": derived_arithmetic,
        "progressedBeyondTickOne": isinstance(final_tick, int) and not isinstance(final_tick, bool) and final_tick > 1,
        "reachedTargetTick": isinstance(final_tick, int) and not isinstance(final_tick, bool) and final_tick >= target_tick,
    }
    for key, expected in expected_markers.items():
        if probe[key] is not expected:
            raise RuntimeError(f"{label}.{key} is inconsistent")
    starts = strict_object(probe["starts"], {"alpha", "beta"}, f"{label}.starts")
    for identity in ("alpha", "beta"):
        if coordinate(starts[identity]) is None:
            raise RuntimeError(f"{label}.starts.{identity} is invalid")
    strict_nonnegative_integer(probe["wallTimeMs"], f"{label}.wallTimeMs")
    failures: list[str] = []
    error = probe["error"]
    if error is not None:
        strict_serialized_error(error, f"{label}.error")
        failures.append(f"{label}_{error['category']}")
    if not expected_markers["loaded"]:
        failures.append(f"{label}_load_failed")
    if not expected_markers["initialTickIsZero"]:
        failures.append(f"{label}_initial_tick_not_zero")
    if not expected_markers["tickUpdateArithmeticConsistent"]:
        failures.append(f"{label}_tick_update_arithmetic_mismatch")
    if not expected_markers["progressedBeyondTickOne"]:
        failures.append(f"{label}_no_progress_beyond_tick_1")
    if not expected_markers["reachedTargetTick"]:
        failures.append(f"{label}_target_tick_not_reached")
    if not isinstance(probe["warningCaptureTruncated"], bool):
        raise RuntimeError(f"{label}.warningCaptureTruncated must be boolean")
    if probe["warningCaptureTruncated"]:
        failures.append(f"{label}_warning_capture_truncated")
    return probe, failures


def validate_map_load_attestation_v2(
    value: Any,
    *,
    expected_family: dict[str, Any],
) -> dict[str, Any]:
    evidence = strict_object(
        value, MAP_LOAD_ATTESTATION_KEYS_V2, "shard.payload.mapLoadAttestation"
    )
    expected_alias = map_load_alias(
        int(expected_family["index"]), str(expected_family["sha256"])
    )
    if (
        evidence["protocol"] != MAP_LOAD_ATTESTATION_PROTOCOL
        or evidence["alias"] != expected_alias
        or evidence["expectedBytes"] != expected_family["bytes"]
        or evidence["expectedSha256"] != expected_family["sha256"]
        or evidence["complete"] is not True
    ):
        raise RuntimeError("Map-load attestation identity/complete binding is invalid")
    alias_path = evidence["aliasPath"]
    if (
        not isinstance(alias_path, str)
        or not Path(alias_path).is_absolute()
        or Path(alias_path).name != expected_alias
    ):
        raise RuntimeError("Map-load attestation aliasPath is invalid")
    phases = evidence["phases"]
    expected_phase_counts = [
        ("initialization", 1), ("forward_create", 2), ("reverse_create", 2)
    ]
    if not isinstance(phases, list) or len(phases) != len(expected_phase_counts):
        raise RuntimeError("Map-load attestation phases are incomplete")
    for index, ((phase_name, count), raw_phase) in enumerate(zip(expected_phase_counts, phases)):
        phase = strict_object(
            raw_phase, {"phase", "expectedReads", "observedReads"},
            f"shard.payload.mapLoadAttestation.phases[{index}]",
        )
        if phase != {"phase": phase_name, "expectedReads": count, "observedReads": count}:
            raise RuntimeError("Map-load attestation phase count/order was tampered")
    expected_read_sequence = [
        ("initialization", 1),
        ("forward_create", 1), ("forward_create", 2),
        ("reverse_create", 1), ("reverse_create", 2),
    ]
    reads = evidence["reads"]
    if not isinstance(reads, list) or len(reads) != len(expected_read_sequence):
        raise RuntimeError("Map-load attestation does not contain exactly five reads")
    for index, ((phase_name, ordinal), raw_read) in enumerate(zip(expected_read_sequence, reads)):
        read = strict_object(raw_read, {
            "phase", "ordinal", "alias", "resolvedPath", "bytes", "sha256",
            "adapter", "inMemorySnapshot",
        }, f"shard.payload.mapLoadAttestation.reads[{index}]")
        if (
            read["phase"] != phase_name
            or read["ordinal"] != ordinal
            or read["alias"] != expected_alias
            or read["resolvedPath"] != alias_path
            or read["bytes"] != expected_family["bytes"]
            or read["sha256"] != expected_family["sha256"]
            or read["adapter"] != "file-system-access/node.FileHandle.getFile"
            or read["inMemorySnapshot"] is not True
        ):
            raise RuntimeError("Map-load read evidence binding/order was tampered")
    return evidence


def validate_shard_payload_v2(
    value: Any,
    *,
    manifest: dict[str, Any],
    expected_family: dict[str, Any],
    scheduler: dict[str, Any],
) -> dict[str, Any]:
    payload = strict_object(
        value, {"engineInitialization", "familyResult", "mapLoadAttestation"},
        "shard.payload",
    )
    initialization = strict_object(payload["engineInitialization"], {
        "succeeded", "warnings", "warningCaptureTruncated", "error",
    }, "shard.payload.engineInitialization")
    initialization_warnings = strict_warning_array(
        initialization["warnings"], "shard.payload.engineInitialization.warnings"
    )
    initialization_failures: list[str] = []
    initialization_error = initialization["error"]
    if initialization_error is not None:
        strict_serialized_error(
            initialization_error, "shard.payload.engineInitialization.error"
        )
        initialization_failures.append(f"initialization_{initialization_error['category']}")
    if not isinstance(initialization["succeeded"], bool) or (
        initialization["succeeded"] is not (initialization_error is None)
    ):
        raise RuntimeError("engineInitialization succeeded/error markers are inconsistent")
    if not isinstance(initialization["warningCaptureTruncated"], bool):
        raise RuntimeError("engineInitialization.warningCaptureTruncated must be boolean")
    if initialization["warningCaptureTruncated"]:
        initialization_failures.append("initialization_warning_capture_truncated")

    result = strict_object(
        payload["familyResult"], FAMILY_RESULT_KEYS_V2, "shard.payload.familyResult"
    )
    expected_alias = map_load_alias(
        int(expected_family["index"]), str(expected_family["sha256"])
    )
    expected_identity = {
        "familyIndex": expected_family["index"],
        "familyId": expected_family["familyId"],
        "representativeMapPath": expected_family["representativeMapPath"],
        "mapName": expected_family["mapName"],
        "executedMapAlias": expected_alias,
        "mapBytes": expected_family["bytes"],
        "mapSha256": expected_family["sha256"],
        "slurmJobId": scheduler["jobId"],
        "requestedEngineSeed": (
            int(manifest["protocol"]["engineSeedBase"]) + int(expected_family["index"])
        ) % (2 ** 32),
        "targetTick": manifest["protocol"]["targetTick"],
        "declaredStartLocations": expected_family["declaredStartLocations"],
    }
    for key, expected in expected_identity.items():
        if result[key] != expected:
            raise RuntimeError(f"shard.payload.familyResult.{key} binding mismatch")
    target_tick = int(manifest["protocol"]["targetTick"])
    forward, forward_failures = validate_probe_run_v2(
        result["forward"], label="forward",
        expected_order=["alpha", "beta"], target_tick=target_tick,
    )
    reverse, reverse_failures = validate_probe_run_v2(
        result["reverse"], label="reverse",
        expected_order=["beta", "alpha"], target_tick=target_tick,
    )
    recomputed_reciprocal = recompute_reciprocal_check(
        forward, reverse, list(expected_family["declaredStartLocations"])
    )
    if result["reciprocalStartCheck"] != recomputed_reciprocal:
        raise RuntimeError("familyResult reciprocal-start record is not independently reproducible")
    warnings = strict_warning_array(result["warnings"], "shard.payload.familyResult.warnings")
    if warnings[:len(initialization_warnings)] != initialization_warnings:
        raise RuntimeError("Family warnings do not preserve initialization warnings as an exact prefix")
    failures = [
        *list(expected_family["staticChecks"]["failures"]),
        *initialization_failures,
        *forward_failures,
        *reverse_failures,
        *list(recomputed_reciprocal["failures"]),
        *(f"warning_{warning['category']}" for warning in warnings if warning["severity"] == "fail"),
    ]
    reviews = [
        f"warning_{warning['category']}" for warning in warnings
        if warning["severity"] == "review"
    ]
    unique_failures = sorted(set(failures))
    unique_reviews = sorted(set(reviews))
    expected_status = "fail" if unique_failures else "review" if unique_reviews else "pass"
    if result["failureCategories"] != unique_failures:
        raise RuntimeError("familyResult failureCategories are not independently reproducible")
    if result["reviewCategories"] != unique_reviews:
        raise RuntimeError("familyResult reviewCategories are not independently reproducible")
    if result["fidelityStatus"] != expected_status:
        raise RuntimeError("familyResult fidelityStatus is not independently reproducible")
    validate_map_load_attestation_v2(
        payload["mapLoadAttestation"], expected_family=expected_family
    )
    return payload


ATTESTATION_KEYS = {
    "schemaVersion", "gate", "artifactKind", "outcomeFree", "phase", "manifest",
    "scheduler", "runtimeHashes", "bindings", "preAttestation", "checkpointLedger",
}
ATTESTATION_BINDING_KEYS = {
    "sourceCommit", "targetPopulationCommitmentSha256", "familySequenceSha256",
    "sourceBundleSha256", "runtimeBundleSha256",
}
FAMILY_BINDING_KEYS = {
    "manifestOrdinal", "familyIndex", "familyIdSha256", "familyEntrySha256",
}
SUPERVISOR_FILE_BINDING_KEYS = {"path", "sha256"}
CHECKPOINT_KEYS = {
    "schemaVersion", "gate", "artifactKind", "outcomeFree", "manifestSha256",
    "attestationSha256", "family", "scheduler", "accepted",
}
SHARD_ENVELOPE_KEYS = {
    "schemaVersion", "gate", "artifactKind", "outcomeFree", "manifestSha256",
    "attestationSha256", "family", "attemptNumber", "intentSha256", "scheduler", "payload",
}
ATTEMPT_INTENT_KEYS = {
    "schemaVersion", "gate", "artifactKind", "outcomeFree", "manifest", "attestation",
    "family", "attemptNumber", "executionPolicy", "scheduler", "environment", "worker",
}
ATTEMPT_TERMINAL_KEYS = {
    "schemaVersion", "gate", "artifactKind", "outcomeFree", "manifestSha256",
    "attestationSha256", "family", "attemptNumber", "intentSha256", "scheduler",
    "timing", "process", "streams", "shard", "technicalDisposition",
}
CAMPAIGN_TERMINAL_KEYS = {
    "schemaVersion", "gate", "artifactKind", "outcomeFree", "manifestSha256",
    "attestationSha256", "scheduler", "configuration", "familyCount",
    "completedCount", "pendingCount", "technicalAttemptCount",
    "pendingManifestOrdinals", "checkpoints", "attempts",
}
CAMPAIGN_CONFIGURATION_KEYS = {
    "executionPolicy", "environmentSha256", "workerCommandPrefixSha256", "workerExecutable",
}
ALLOWED_WORKER_ENV_KEYS = (
    "PATH", "LD_LIBRARY_PATH", "TZ", "LC_ALL", "PYTHONHASHSEED", "DEBUG_LOGGING",
    "SCONTROL", "SLURM_JOB_ID", "SLURM_JOB_NAME", "SLURM_JOB_PARTITION",
    "SLURM_JOB_QOS", "SLURM_CPUS_PER_TASK", "SLURM_MEM_PER_NODE",
    "SLURM_RESTART_COUNT", "SLURM_ARRAY_JOB_ID", "SLURM_ARRAY_TASK_ID", "SLURMD_NODENAME",
)


def require_durable_path(path: Path, *, durable_root: Path = DURABLE_EVIDENCE_ROOT) -> Path:
    candidate = path.absolute()
    root = durable_root.absolute()
    reject_symlink_components(root, "Durable evidence root")
    reject_symlink_components(candidate, "Durable evidence path")
    try:
        candidate.relative_to(root)
    except ValueError as error:
        raise RuntimeError(
            f"Evidence path is outside the required durable project root {root}: {candidate}"
        ) from error
    return candidate


def private_evidence_file(path: Path, *, durable_root: Path) -> dict[str, Any]:
    candidate = require_durable_path(path, durable_root=durable_root)
    record = exact_file(candidate)
    if candidate.lstat().st_mode & 0o077:
        raise RuntimeError(f"Evidence artifact is accessible to group/other: {candidate}")
    return record


def supervisor_file_binding(value: Any, label: str) -> dict[str, Any]:
    record = strict_object(value, SUPERVISOR_FILE_BINDING_KEYS, label)
    if not isinstance(record["path"], str) or not Path(record["path"]).is_absolute():
        raise RuntimeError(f"{label}.path must be absolute")
    strict_sha256(record["sha256"], f"{label}.sha256")
    return record


def family_binding(manifest: dict[str, Any], ordinal: int) -> dict[str, Any]:
    family = manifest["families"][ordinal]
    return {
        "manifestOrdinal": ordinal,
        "familyIndex": family["index"],
        "familyIdSha256": hashlib.sha256(family["familyId"].encode("utf-8")).hexdigest(),
        "familyEntrySha256": canonical_sha256(family),
    }


def validate_family_binding(
    value: Any, *, manifest: dict[str, Any], ordinal: int, label: str
) -> dict[str, Any]:
    record = strict_object(value, FAMILY_BINDING_KEYS, label)
    for key in ("manifestOrdinal", "familyIndex"):
        strict_nonnegative_integer(record[key], f"{label}.{key}")
    strict_sha256(record["familyIdSha256"], f"{label}.familyIdSha256")
    strict_sha256(record["familyEntrySha256"], f"{label}.familyEntrySha256")
    if record != family_binding(manifest, ordinal):
        raise RuntimeError(f"{label} does not bind the immutable manifest family")
    return record


def validate_job_attestation(
    value: Any,
    *,
    phase: str,
    manifest: dict[str, Any],
    manifest_path: Path,
    scheduler: dict[str, Any],
    pre_attestation_path: Path | None = None,
    checkpoint_ledger: dict[str, Any] | None = None,
    durable_root: Path = DURABLE_EVIDENCE_ROOT,
) -> dict[str, Any]:
    record = strict_object(value, ATTESTATION_KEYS, f"{phase} job attestation")
    if (
        record["schemaVersion"] != INTERNAL_EVIDENCE_SCHEMA_VERSION
        or record["gate"] != GATE
        or record["artifactKind"] != "map_fidelity_job_attestation"
        or record["outcomeFree"] is not True
        or record["phase"] != phase
    ):
        raise RuntimeError(f"{phase} job attestation identity markers are invalid")
    if forbidden_key_paths(record) or forbidden_role_key_paths(record):
        raise RuntimeError(f"{phase} job attestation contains forbidden fields")
    expected_manifest = private_evidence_file(manifest_path, durable_root=durable_root)
    if strict_exact_file_record(record["manifest"], "attestation.manifest") != expected_manifest:
        raise RuntimeError(f"{phase} job attestation does not bind the exact manifest")
    if record["scheduler"] != scheduler or manifest["scheduler"] != scheduler:
        raise RuntimeError(f"{phase} job attestation scheduler mismatch")
    if record["runtimeHashes"] != manifest["runtimeHashes"]:
        raise RuntimeError(f"{phase} job attestation runtime-hash mismatch")
    strict_object(record["runtimeHashes"], {key for key, _, _ in RUNTIME_HASH_BINDINGS}, "attestation.runtimeHashes")
    bindings = strict_object(record["bindings"], ATTESTATION_BINDING_KEYS, "attestation.bindings")
    if bindings != manifest_attestation_bindings(manifest):
        raise RuntimeError(f"{phase} job attestation source binding mismatch")
    if phase == "pre_workers":
        if record["preAttestation"] is not None or record["checkpointLedger"] is not None:
            raise RuntimeError("Pre-worker attestation must have null post-worker bindings")
    elif phase == "post_workers":
        if pre_attestation_path is None or checkpoint_ledger is None:
            raise RuntimeError("Post-worker attestation validation requires pre/ledger bindings")
        expected_pre = private_evidence_file(pre_attestation_path, durable_root=durable_root)
        if strict_exact_file_record(record["preAttestation"], "post.preAttestation") != expected_pre:
            raise RuntimeError("Post-worker attestation does not bind the exact pre attestation")
        if record["checkpointLedger"] != checkpoint_ledger:
            raise RuntimeError("Post-worker checkpoint ledger mismatch")
    else:
        raise RuntimeError(f"Unknown job-attestation phase: {phase}")
    return record


def build_job_attestation(
    manifest_path: Path,
    scheduler: dict[str, Any],
    *,
    phase: str,
    pre_attestation_path: Path | None = None,
    run_root: Path | None = None,
    durable_root: Path = DURABLE_EVIDENCE_ROOT,
    verify_runtime_inputs: bool = True,
) -> dict[str, Any]:
    require_durable_path(manifest_path, durable_root=durable_root)
    manifest = load_json(manifest_path)
    validate_manifest_v2(
        manifest, scheduler=scheduler, verify_runtime_inputs=verify_runtime_inputs
    )
    checkpoint_ledger = None
    pre_record = None
    if phase == "post_workers":
        if pre_attestation_path is None or run_root is None:
            raise RuntimeError("Post-worker attestation requires pre_attestation_path and run_root")
        checkpoint_ledger, _ = collect_supervisor_evidence(
            manifest_path,
            pre_attestation_path,
            run_root,
            scheduler,
            durable_root=durable_root,
            verify_runtime_inputs=verify_runtime_inputs,
        )
        pre_record = private_evidence_file(pre_attestation_path, durable_root=durable_root)
    elif phase != "pre_workers":
        raise RuntimeError(f"Unknown job-attestation phase: {phase}")
    attestation = {
        "schemaVersion": INTERNAL_EVIDENCE_SCHEMA_VERSION,
        "gate": GATE,
        "artifactKind": "map_fidelity_job_attestation",
        "outcomeFree": True,
        "phase": phase,
        "manifest": private_evidence_file(manifest_path, durable_root=durable_root),
        "scheduler": scheduler,
        "runtimeHashes": manifest["runtimeHashes"],
        "bindings": manifest_attestation_bindings(manifest),
        "preAttestation": pre_record,
        "checkpointLedger": checkpoint_ledger,
    }
    return validate_job_attestation(
        attestation,
        phase=phase,
        manifest=manifest,
        manifest_path=manifest_path,
        scheduler=scheduler,
        pre_attestation_path=pre_attestation_path,
        checkpoint_ledger=checkpoint_ledger,
        durable_root=durable_root,
    )


def validate_supervisor_scheduler(value: Any, scheduler: dict[str, Any], label: str) -> None:
    if strict_object(value, {"jobId", "account", "partition", "qos", "source"}, label) != scheduler:
        raise RuntimeError(f"{label} does not equal authoritative scheduler")


def validate_checkpoint_ledger_entries(
    manifest: dict[str, Any], entries: Any
) -> list[dict[str, Any]]:
    if not isinstance(entries, list) or len(entries) != len(manifest.get("families", [])):
        raise RuntimeError("Checkpoint ledger is missing or has extra family entries")
    seen_shards: set[str] = set()
    for ordinal, raw_entry in enumerate(entries):
        entry = strict_object(
            raw_entry, {"family", "checkpoint", "intent", "terminal", "shard"},
            f"checkpointLedger.entries[{ordinal}]",
        )
        validate_family_binding(
            entry["family"], manifest=manifest, ordinal=ordinal,
            label=f"checkpointLedger.entries[{ordinal}].family",
        )
        for label in ("checkpoint", "intent", "terminal", "shard"):
            strict_exact_file_record(
                entry[label], f"checkpointLedger.entries[{ordinal}].{label}"
            )
        shard_path = str(entry["shard"]["path"])
        if shard_path in seen_shards:
            raise RuntimeError("Checkpoint ledger contains a duplicate accepted shard")
        seen_shards.add(shard_path)
    return entries


def collect_supervisor_evidence(
    manifest_path: Path,
    pre_attestation_path: Path,
    run_root: Path,
    scheduler: dict[str, Any],
    *,
    durable_root: Path = DURABLE_EVIDENCE_ROOT,
    verify_runtime_inputs: bool = True,
) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    manifest_path = require_durable_path(manifest_path, durable_root=durable_root)
    pre_attestation_path = require_durable_path(pre_attestation_path, durable_root=durable_root)
    run_root = require_durable_path(run_root, durable_root=durable_root)
    if not run_root.is_dir():
        raise RuntimeError("Supervisor run root is missing")
    manifest = load_json(manifest_path)
    validate_manifest_v2(
        manifest, scheduler=scheduler, verify_runtime_inputs=verify_runtime_inputs
    )
    manifest_sha = sha256_file(manifest_path)
    pre_attestation = load_json(pre_attestation_path)
    validate_job_attestation(
        pre_attestation,
        phase="pre_workers",
        manifest=manifest,
        manifest_path=manifest_path,
        scheduler=scheduler,
        durable_root=durable_root,
    )
    pre_sha = sha256_file(pre_attestation_path)
    families_root = run_root / "families"
    if not families_root.is_dir():
        raise RuntimeError("Supervisor families directory is missing")
    reject_symlink_components(families_root, "Supervisor families directory")
    campaign_path = run_root / "campaign-terminal.json"
    campaign = strict_object(
        load_json(campaign_path), CAMPAIGN_TERMINAL_KEYS, "campaign terminal"
    )
    if (
        campaign["schemaVersion"] != INTERNAL_EVIDENCE_SCHEMA_VERSION
        or campaign["gate"] != GATE
        or campaign["artifactKind"] != "map_fidelity_campaign_terminal"
        or campaign["outcomeFree"] is not True
        or campaign["manifestSha256"] != manifest_sha
        or campaign["attestationSha256"] != pre_sha
    ):
        raise RuntimeError("Campaign terminal identity binding is invalid")
    validate_supervisor_scheduler(campaign["scheduler"], scheduler, "campaign.scheduler")
    campaign_configuration = strict_object(
        campaign["configuration"], CAMPAIGN_CONFIGURATION_KEYS,
        "campaign.configuration",
    )
    campaign_policy = strict_object(campaign_configuration["executionPolicy"], {
        "timeoutSeconds", "terminationGraceSeconds", "maxTechnicalAttempts", "maxStreamBytes",
    }, "campaign.configuration.executionPolicy")
    for key in ("timeoutSeconds", "terminationGraceSeconds"):
        if isinstance(campaign_policy[key], bool) or not isinstance(campaign_policy[key], (int, float)) or campaign_policy[key] <= 0:
            raise RuntimeError(f"campaign execution policy {key} is invalid")
    if campaign_policy["maxTechnicalAttempts"] not in {1, 2}:
        raise RuntimeError("Campaign technical-attempt budget is invalid")
    if strict_nonnegative_integer(campaign_policy["maxStreamBytes"], "campaign maxStreamBytes") <= 0:
        raise RuntimeError("Campaign maxStreamBytes must be positive")
    strict_sha256(campaign_configuration["environmentSha256"], "campaign environment SHA")
    strict_sha256(campaign_configuration["workerCommandPrefixSha256"], "campaign command-prefix SHA")
    campaign_executable = campaign_configuration["workerExecutable"]
    if campaign_executable is None:
        raise RuntimeError("Campaign worker executable must resolve on the pinned cluster runtime")
    strict_exact_file_record(campaign_executable, "campaign worker executable")
    if campaign_executable != manifest["inputs"]["nodeRuntime"]:
        raise RuntimeError("Campaign worker executable is not the pinned manifest node runtime")
    if verify_runtime_inputs:
        failure = verify_exact_file(campaign_executable)
        if failure:
            raise RuntimeError(failure)
    expected_directory_names = [
        f"{ordinal:04d}-{family_binding(manifest, ordinal)['familyIdSha256'][:16]}"
        for ordinal in range(len(manifest["families"]))
    ]
    family_entries = list(os.scandir(families_root))
    if any(
        entry.is_symlink() or not entry.is_dir(follow_symlinks=False)
        for entry in family_entries
    ):
        raise RuntimeError("Supervisor families directory contains a non-directory entry")
    observed_directory_names = sorted(entry.name for entry in family_entries)
    if observed_directory_names != sorted(expected_directory_names):
        raise RuntimeError("Supervisor family directories are missing, duplicated, or unexpected")
    ledger_entries: list[dict[str, Any]] = []
    payloads: list[dict[str, Any]] = []
    seen_shard_paths: set[Path] = set()
    campaign_checkpoint_records: list[dict[str, Any]] = []
    campaign_attempt_records: list[dict[str, Any]] = []
    technical_attempt_count = 0
    for ordinal, (family, directory_name) in enumerate(
        zip(manifest["families"], expected_directory_names)
    ):
        family_dir = families_root / directory_name
        checkpoint_path = family_dir / "completion-checkpoint.json"
        checkpoint = load_json(checkpoint_path)
        strict_object(checkpoint, CHECKPOINT_KEYS, f"checkpoint[{ordinal}]")
        expected_binding = family_binding(manifest, ordinal)
        if (
            checkpoint["schemaVersion"] != INTERNAL_EVIDENCE_SCHEMA_VERSION
            or checkpoint["gate"] != GATE
            or checkpoint["artifactKind"] != "map_fidelity_family_completion_checkpoint"
            or checkpoint["outcomeFree"] is not True
            or checkpoint["manifestSha256"] != manifest_sha
            or checkpoint["attestationSha256"] != pre_sha
        ):
            raise RuntimeError(f"Checkpoint {ordinal} identity binding is invalid")
        validate_family_binding(
            checkpoint["family"], manifest=manifest, ordinal=ordinal,
            label=f"checkpoint[{ordinal}].family",
        )
        validate_supervisor_scheduler(checkpoint["scheduler"], scheduler, f"checkpoint[{ordinal}].scheduler")
        accepted = strict_object(checkpoint["accepted"], {
            "attemptNumber", "intentSha256", "terminalSha256", "shard",
        }, f"checkpoint[{ordinal}].accepted")
        attempt_number = strict_nonnegative_integer(
            accepted["attemptNumber"], f"checkpoint[{ordinal}].accepted.attemptNumber"
        )
        if attempt_number not in {1, 2}:
            raise RuntimeError("Accepted attempt exceeds the fixed two-attempt technical budget")
        attempts_root = family_dir / "attempts"
        reject_symlink_components(attempts_root, "Supervisor attempt directory")
        attempt_names = sorted(
            entry.name for entry in os.scandir(attempts_root)
            if entry.is_dir(follow_symlinks=False)
        )
        expected_attempt_names = [
            f"{number:02d}" for number in range(1, len(attempt_names) + 1)
        ]
        if (
            attempt_names != expected_attempt_names
            or len(attempt_names) > 2
            or attempt_number != len(attempt_names)
        ):
            raise RuntimeError("Supervisor attempts are noncontiguous or checkpoint is not terminal")
        technical_attempt_count += len(attempt_names)
        for recorded_attempt in range(1, len(attempt_names) + 1):
            recorded_attempt_dir = attempts_root / f"{recorded_attempt:02d}"
            recorded_shard_path = recorded_attempt_dir / "family-shard.json"
            campaign_attempt_records.append({
                "family": expected_binding,
                "attemptNumber": recorded_attempt,
                "intent": private_evidence_file(
                    recorded_attempt_dir / "attempt-intent.json", durable_root=durable_root
                ),
                "terminal": private_evidence_file(
                    recorded_attempt_dir / "attempt-terminal.json", durable_root=durable_root
                ),
                "shard": (
                    private_evidence_file(recorded_shard_path, durable_root=durable_root)
                    if recorded_shard_path.exists() else None
                ),
            })
        intent_sha = strict_sha256(accepted["intentSha256"], "checkpoint intent SHA")
        terminal_sha = strict_sha256(accepted["terminalSha256"], "checkpoint terminal SHA")
        attempt_dir = family_dir / "attempts" / f"{attempt_number:02d}"
        intent_path = attempt_dir / "attempt-intent.json"
        terminal_path = attempt_dir / "attempt-terminal.json"
        shard_path = attempt_dir / "family-shard.json"
        accepted_shard = strict_exact_file_record(accepted["shard"], "checkpoint accepted shard")
        expected_shard_record = private_evidence_file(shard_path, durable_root=durable_root)
        if accepted_shard != expected_shard_record:
            raise RuntimeError("Checkpoint accepted shard descriptor/path mismatch")
        canonical_shard_path = shard_path.resolve(strict=True)
        if canonical_shard_path in seen_shard_paths:
            raise RuntimeError("Duplicate accepted shard path")
        seen_shard_paths.add(canonical_shard_path)
        intent_record = private_evidence_file(intent_path, durable_root=durable_root)
        terminal_record = private_evidence_file(terminal_path, durable_root=durable_root)
        if intent_record["sha256"] != intent_sha or terminal_record["sha256"] != terminal_sha:
            raise RuntimeError("Checkpoint intent/terminal hash mismatch")

        intent = strict_object(load_json(intent_path), ATTEMPT_INTENT_KEYS, f"intent[{ordinal}]")
        if (
            intent["schemaVersion"] != INTERNAL_EVIDENCE_SCHEMA_VERSION
            or intent["gate"] != GATE
            or intent["artifactKind"] != "map_fidelity_family_attempt_intent"
            or intent["outcomeFree"] is not True
            or intent["attemptNumber"] != attempt_number
        ):
            raise RuntimeError("Attempt intent identity binding is invalid")
        if supervisor_file_binding(intent["manifest"], "intent.manifest") != {
            "path": str(manifest_path), "sha256": manifest_sha
        }:
            raise RuntimeError("Attempt intent manifest binding mismatch")
        if supervisor_file_binding(intent["attestation"], "intent.attestation") != {
            "path": str(pre_attestation_path), "sha256": pre_sha
        }:
            raise RuntimeError("Attempt intent attestation binding mismatch")
        validate_family_binding(intent["family"], manifest=manifest, ordinal=ordinal, label="intent.family")
        validate_supervisor_scheduler(intent["scheduler"], scheduler, "intent.scheduler")
        policy = strict_object(intent["executionPolicy"], {
            "timeoutSeconds", "terminationGraceSeconds", "maxTechnicalAttempts", "maxStreamBytes",
        }, "intent.executionPolicy")
        for key in ("timeoutSeconds", "terminationGraceSeconds"):
            if isinstance(policy[key], bool) or not isinstance(policy[key], (int, float)) or policy[key] <= 0:
                raise RuntimeError(f"intent.executionPolicy.{key} is invalid")
        if policy["maxTechnicalAttempts"] not in {1, 2}:
            raise RuntimeError("Intent technical attempt budget is invalid")
        if strict_nonnegative_integer(policy["maxStreamBytes"], "intent.maxStreamBytes") <= 0:
            raise RuntimeError("Intent maxStreamBytes must be positive")
        environment = strict_object(intent["environment"], {"allowedKeys", "values", "sha256"}, "intent.environment")
        if environment["allowedKeys"] != list(ALLOWED_WORKER_ENV_KEYS) or not isinstance(environment["values"], dict):
            raise RuntimeError("Intent environment allowlist is invalid")
        if any(key not in ALLOWED_WORKER_ENV_KEYS or not isinstance(value, str) for key, value in environment["values"].items()):
            raise RuntimeError("Intent environment contains a non-allowlisted value")
        if environment["sha256"] != canonical_sha256(environment["values"]):
            raise RuntimeError("Intent environment hash mismatch")
        worker = strict_object(intent["worker"], {
            "argumentProtocol", "commandPrefixSha256", "commandSha256",
            "executable", "shardPath",
        }, "intent.worker")
        if (
            worker["argumentProtocol"] != "map-fidelity-family-worker-v1"
            or worker["shardPath"] != str(shard_path)
        ):
            raise RuntimeError("Intent worker binding is invalid")
        strict_sha256(worker["commandPrefixSha256"], "intent.worker.commandPrefixSha256")
        strict_sha256(worker["commandSha256"], "intent.worker.commandSha256")
        if worker["commandPrefixSha256"] != campaign_configuration["workerCommandPrefixSha256"]:
            raise RuntimeError("Intent/campaign command-prefix binding mismatch")
        if worker["executable"] != campaign_executable:
            raise RuntimeError("Intent/campaign executable binding mismatch")
        if environment["sha256"] != campaign_configuration["environmentSha256"]:
            raise RuntimeError("Intent/campaign environment binding mismatch")
        if policy != campaign_policy:
            raise RuntimeError("Intent/campaign execution-policy binding mismatch")

        terminal = strict_object(load_json(terminal_path), ATTEMPT_TERMINAL_KEYS, f"terminal[{ordinal}]")
        if (
            terminal["schemaVersion"] != INTERNAL_EVIDENCE_SCHEMA_VERSION
            or terminal["gate"] != GATE
            or terminal["artifactKind"] != "map_fidelity_family_attempt_terminal"
            or terminal["outcomeFree"] is not True
            or terminal["manifestSha256"] != manifest_sha
            or terminal["attestationSha256"] != pre_sha
            or terminal["attemptNumber"] != attempt_number
            or terminal["intentSha256"] != intent_sha
        ):
            raise RuntimeError("Attempt terminal identity binding is invalid")
        validate_family_binding(terminal["family"], manifest=manifest, ordinal=ordinal, label="terminal.family")
        validate_supervisor_scheduler(terminal["scheduler"], scheduler, "terminal.scheduler")
        timing = strict_object(terminal["timing"], {"wallTimeMs"}, "terminal.timing")
        strict_nonnegative_integer(timing["wallTimeMs"], "terminal.timing.wallTimeMs")
        process = strict_object(terminal["process"], {
            "exitCode", "termSignal", "timedOut", "termSent", "killSent",
        }, "terminal.process")
        if process != {"exitCode": 0, "termSignal": None, "timedOut": False, "termSent": False, "killSent": False}:
            raise RuntimeError("Accepted terminal process was not a clean zero exit")
        streams = strict_object(terminal["streams"], {"stdout", "stderr"}, "terminal.streams")
        empty_sha = hashlib.sha256(b"").hexdigest()
        for stream_name in ("stdout", "stderr"):
            stream = strict_object(streams[stream_name], {"bytes", "sha256", "truncated"}, f"terminal.streams.{stream_name}")
            if stream != {"bytes": 0, "sha256": empty_sha, "truncated": False}:
                raise RuntimeError("Accepted terminal contains worker stream output")
        if terminal["shard"] != accepted_shard:
            raise RuntimeError("Terminal shard descriptor differs from checkpoint")
        disposition = strict_object(terminal["technicalDisposition"], {"status", "categories"}, "terminal.technicalDisposition")
        if disposition != {"status": "complete", "categories": []}:
            raise RuntimeError("Checkpoint references a technically incomplete terminal")

        shard = strict_object(load_json(shard_path), SHARD_ENVELOPE_KEYS, f"shard[{ordinal}]")
        if (
            shard["schemaVersion"] != INTERNAL_EVIDENCE_SCHEMA_VERSION
            or shard["gate"] != GATE
            or shard["artifactKind"] != "map_fidelity_family_worker_shard"
            or shard["outcomeFree"] is not True
            or shard["manifestSha256"] != manifest_sha
            or shard["attestationSha256"] != pre_sha
            or shard["attemptNumber"] != attempt_number
            or shard["intentSha256"] != intent_sha
        ):
            raise RuntimeError("Family shard envelope binding is invalid")
        validate_family_binding(shard["family"], manifest=manifest, ordinal=ordinal, label="shard.family")
        validate_supervisor_scheduler(shard["scheduler"], scheduler, "shard.scheduler")
        validate_shard_payload_v2(
            shard["payload"], manifest=manifest, expected_family=family, scheduler=scheduler
        )
        payloads.append(shard["payload"])
        checkpoint_record = private_evidence_file(
            checkpoint_path, durable_root=durable_root
        )
        ledger_entries.append({
            "family": expected_binding,
            "checkpoint": checkpoint_record,
            "intent": intent_record,
            "terminal": terminal_record,
            "shard": expected_shard_record,
        })
        campaign_checkpoint_records.append({
            "manifestOrdinal": ordinal,
            **checkpoint_record,
        })
    family_count = len(manifest["families"])
    for key in (
        "familyCount", "completedCount", "pendingCount", "technicalAttemptCount"
    ):
        strict_nonnegative_integer(campaign[key], f"campaign.{key}")
    if (
        not isinstance(campaign["pendingManifestOrdinals"], list)
        or any(
            isinstance(value, bool) or not isinstance(value, int) or value < 0
            for value in campaign["pendingManifestOrdinals"]
        )
    ):
        raise RuntimeError("Campaign pending ordinals are invalid")
    for key, expected in (
        ("familyCount", family_count),
        ("completedCount", family_count),
        ("pendingCount", 0),
        ("technicalAttemptCount", technical_attempt_count),
    ):
        if campaign[key] != expected:
            raise RuntimeError(f"Campaign terminal {key} is inconsistent")
    if campaign["pendingManifestOrdinals"] != []:
        raise RuntimeError("Complete campaign terminal has pending ordinals")
    if campaign["checkpoints"] != campaign_checkpoint_records:
        raise RuntimeError("Campaign terminal checkpoint ledger/order mismatch")
    if campaign["attempts"] != campaign_attempt_records:
        raise RuntimeError("Campaign terminal attempt ledger/order mismatch")
    validate_checkpoint_ledger_entries(manifest, ledger_entries)
    campaign_record = private_evidence_file(campaign_path, durable_root=durable_root)
    ledger_body = {
        "familyCount": len(ledger_entries),
        "entries": ledger_entries,
        "campaignTerminal": campaign_record,
    }
    ledger = {
        **ledger_body,
        "sha256": canonical_sha256(ledger_body),
    }
    return ledger, payloads


def legacy_probe_aggregate(
    manifest: dict[str, Any],
    manifest_path: Path,
    payloads: list[dict[str, Any]],
    scheduler: dict[str, Any],
) -> dict[str, Any]:
    scope = manifest["selection"]["scope"]
    legacy_families = []
    for payload in payloads:
        result = dict(payload["familyResult"])
        result.pop("executedMapAlias")
        for probe_name in ("forward", "reverse"):
            probe = dict(result[probe_name])
            probe.pop("initialTickIsZero")
            probe.pop("tickUpdateArithmeticConsistent")
            result[probe_name] = probe
        legacy_families.append(result)
    hashes = manifest["runtimeHashes"]
    runtime_hashes = {
        "packageLockSha256": hashes["packageLockSha256"],
        "gameApiPackageSha256": hashes["gameApiPackageSha256"],
        "gameApiRuntimeSha256": hashes["gameApiRuntimeSha256"],
        "compiledProbeSha256": hashes["compiledProbeSha256"],
        "gameApiRuntimeTreeSha256": hashes["gameApiRuntimeTreeSha256"],
        "runtimeDependencyTreeSha256": hashes["runtimeDependencyTreeSha256"],
        "mixTreeSha256": hashes["mixTreeSha256"],
        "sourceBundleSha256": hashes["sourceBundleSha256"],
        "runtimeBundleSha256": hashes["runtimeBundleSha256"],
    }
    population_count = manifest["selection"]["populationFamilyCount"]
    full_coverage = scope == "full" and len(legacy_families) == population_count
    return {
        "schemaVersion": 1,
        "gate": GATE,
        "outcomeFree": True,
        "artifactKind": (
            "infrastructure_fidelity_full_probe_not_policy_evaluation"
            if scope == "full" else "infrastructure_fidelity_preflight_probe_not_clearance"
        ),
        "scheduler": scheduler,
        "manifestPath": str(manifest_path.absolute()),
        "manifestSha256": sha256_file(manifest_path),
        "logging": manifest["inputs"]["logging"],
        "runtimeHashes": runtime_hashes,
        "scope": scope,
        "populationFamilyCount": population_count,
        "runFamilyCount": len(legacy_families),
        "fullCoverage": full_coverage,
        "eligibleForFidelityClearance": False,
        "initialization": {
            "succeeded": True, "warnings": [],
            "warningCaptureTruncated": False, "error": None,
        },
        "familyCountRequested": len(manifest["families"]),
        "familyCountRun": len(legacy_families),
        "families": legacy_families,
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
    try:
        current = exact_file(path)
    except RuntimeError:
        return f"missing_or_unsafe_exact_input:{path}"
    if current["bytes"] != record.get("bytes"):
        return f"exact_input_size_mismatch:{path}"
    if current["sha256"] != record.get("sha256"):
        return f"exact_input_hash_mismatch:{path}"
    return None


def verify_tree(record: dict[str, Any], label: str) -> list[str]:
    root = Path(str(record.get("root", "")))
    failures = []
    try:
        current = tree_descriptor(root)
    except RuntimeError:
        return [f"{label}_tree_missing"]
    keys = ["sha256", "fileCount", "bytes", "hashAlgorithm", "entries"]
    if "symlinkCount" in record:
        keys.append("symlinkCount")
    for key in keys:
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
    manifest_schema = manifest.get("schemaVersion")
    if manifest_schema == MANIFEST_SCHEMA_VERSION:
        validate_manifest_v2(
            manifest,
            scheduler=scheduler,
            verify_runtime_inputs=verify_runtime_inputs,
        )
    elif manifest_schema != 1:
        raise RuntimeError("Unsupported map-fidelity manifest schema")
    failures = [
        f"unexpected_result_key:{path}"
        for path in result_schema_failures(result)
    ]
    reviews = []
    if result.get("schemaVersion") != 1:
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
    if manifest_schema == MANIFEST_SCHEMA_VERSION:
        expected_source_bundle = bundle_descriptor([
            ("gitCommit", str(inputs.get("git", {}).get("commit"))),
            *[(
                f"gitBlob:{record.get('gitPath')}",
                f"{record.get('objectId')}:{record.get('sha256')}",
            ) for record in inputs.get("gitBlobs", [])],
            *[(
                f"mapAsset:{family.get('index')}:{family.get('representativeMapPath')}",
                f"{family.get('bytes')}:{family.get('sha256')}",
            ) for family in manifest.get("families", [])],
        ])
        expected_source_count = len(TOOL_SOURCE_PATHS)
    else:
        expected_source_bundle = bundle_descriptor([
            ("gitCommit", str(inputs.get("git", {}).get("commit"))),
            *[(f"source:{relative_path}", str(record.get("sha256"))) for relative_path, record in zip(LEGACY_TOOL_SOURCE_PATHS, source_records)],
            ("targetManifest", str(inputs.get("targetManifest", {}).get("sha256"))),
            ("catalog", str(inputs.get("catalog", {}).get("sha256"))),
        ])
        expected_source_count = len(LEGACY_TOOL_SOURCE_PATHS)
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
    if len(source_records) != expected_source_count or inputs.get("sourceBundle") != expected_source_bundle:
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
        "schemaVersion": SUMMARY_SCHEMA_VERSION if manifest_schema == MANIFEST_SCHEMA_VERSION else 1,
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


def aggregate_supervisor_evidence(
    manifest_path: Path,
    pre_attestation_path: Path,
    post_attestation_path: Path,
    run_root: Path,
    legacy_result_path: Path,
    scheduler: dict[str, Any],
    *,
    durable_root: Path = DURABLE_EVIDENCE_ROOT,
    verify_runtime_inputs: bool = True,
) -> dict[str, Any]:
    for path in (
        manifest_path, pre_attestation_path, post_attestation_path,
        run_root, legacy_result_path,
    ):
        require_durable_path(path, durable_root=durable_root)
    manifest = load_json(manifest_path)
    validate_manifest_v2(
        manifest, scheduler=scheduler, verify_runtime_inputs=verify_runtime_inputs
    )
    ledger, payloads = collect_supervisor_evidence(
        manifest_path,
        pre_attestation_path,
        run_root,
        scheduler,
        durable_root=durable_root,
        verify_runtime_inputs=verify_runtime_inputs,
    )
    post_attestation = load_json(post_attestation_path)
    validate_job_attestation(
        post_attestation,
        phase="post_workers",
        manifest=manifest,
        manifest_path=manifest_path,
        scheduler=scheduler,
        pre_attestation_path=pre_attestation_path,
        checkpoint_ledger=ledger,
        durable_root=durable_root,
    )
    legacy = legacy_probe_aggregate(manifest, manifest_path, payloads, scheduler)
    write_exclusive(legacy_result_path, legacy)
    summary = check_gate(
        manifest_path,
        legacy_result_path,
        scheduler,
        verify_runtime_inputs=verify_runtime_inputs,
    )
    summary["schemaVersion"] = SUMMARY_SCHEMA_VERSION
    summary["evidencePipeline"] = {
        "manifest": private_evidence_file(manifest_path, durable_root=durable_root),
        "preAttestation": private_evidence_file(
            pre_attestation_path, durable_root=durable_root
        ),
        "postAttestation": private_evidence_file(
            post_attestation_path, durable_root=durable_root
        ),
        "checkpointLedgerSha256": ledger["sha256"],
        "acceptedCheckpointCount": ledger["familyCount"],
        "technicallyComplete": True,
        "compatibilityVerdict": summary["verdict"],
        "familyOrder": "immutable_manifest_order",
        "legacyProbeAggregate": private_evidence_file(
            legacy_result_path, durable_root=durable_root
        ),
    }
    return summary


def write_exclusive(path: Path, value: dict[str, Any]) -> None:
    candidate = path.absolute()
    reject_symlink_components(candidate.parent, "Evidence output directory")
    candidate.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    if candidate.parent.lstat().st_mode & 0o077:
        raise RuntimeError(f"Evidence output directory is not private: {candidate.parent}")
    if os.path.lexists(candidate):
        raise RuntimeError(f"Refusing to overwrite evidence artifact: {candidate}")
    payload = json.dumps(value, indent=2, sort_keys=True).encode("utf-8") + b"\n"
    temporary = candidate.parent / f".{candidate.name}.tmp-{os.getpid()}"
    descriptor = os.open(
        temporary,
        os.O_WRONLY | os.O_CREAT | os.O_EXCL | getattr(os, "O_NOFOLLOW", 0),
        0o600,
    )
    try:
        with os.fdopen(descriptor, "wb", closefd=True) as handle:
            descriptor = -1
            handle.write(payload)
            handle.flush()
            os.fsync(handle.fileno())
        os.link(temporary, candidate)
        temporary.unlink()
        directory_descriptor = os.open(
            candidate.parent, os.O_RDONLY | getattr(os, "O_DIRECTORY", 0)
        )
        try:
            os.fsync(directory_descriptor)
        finally:
            os.close(directory_descriptor)
    finally:
        if descriptor >= 0:
            os.close(descriptor)
        if temporary.exists():
            temporary.unlink()


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
        "--preflight-plan",
        type=Path,
        help="Committed expanded role-blind preflight plan (full run if omitted)",
    )
    check = subparsers.add_parser("check")
    check.add_argument("--manifest", type=Path, required=True)
    check.add_argument("--result", type=Path, required=True)
    check.add_argument("--output", type=Path, required=True)
    attest = subparsers.add_parser("attest")
    attest.add_argument("--manifest", type=Path, required=True)
    attest.add_argument("--phase", choices=("pre_workers", "post_workers"), required=True)
    attest.add_argument("--pre-attestation", type=Path)
    attest.add_argument("--run-root", type=Path)
    attest.add_argument("--output", type=Path, required=True)
    aggregate = subparsers.add_parser("aggregate")
    aggregate.add_argument("--manifest", type=Path, required=True)
    aggregate.add_argument("--pre-attestation", type=Path, required=True)
    aggregate.add_argument("--post-attestation", type=Path, required=True)
    aggregate.add_argument("--run-root", type=Path, required=True)
    aggregate.add_argument("--legacy-result", type=Path, required=True)
    aggregate.add_argument("--output", type=Path, required=True)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    scheduler = authoritative_scheduler()
    if args.command == "prepare":
        require_durable_path(args.output)
        manifest = build_manifest(
            args.repo_root,
            args.targets,
            args.catalog,
            args.mix_dir,
            scheduler,
            target_tick=args.target_tick,
            engine_seed_base=args.engine_seed_base,
            expected_families=args.expected_families,
            preflight_plan_path=args.preflight_plan,
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

    if args.command == "attest":
        require_durable_path(args.output)
        attestation = build_job_attestation(
            args.manifest,
            scheduler,
            phase=args.phase,
            pre_attestation_path=args.pre_attestation,
            run_root=args.run_root,
        )
        write_exclusive(args.output, attestation)
        print(json.dumps({
            "gate": GATE,
            "artifact": str(args.output.absolute()),
            "sha256": sha256_file(args.output),
            "phase": args.phase,
            "scheduler": scheduler,
        }, indent=2, sort_keys=True))
        return

    if args.command == "aggregate":
        require_durable_path(args.output)
        summary = aggregate_supervisor_evidence(
            args.manifest,
            args.pre_attestation,
            args.post_attestation,
            args.run_root,
            args.legacy_result,
            scheduler,
        )
        write_exclusive(args.output, summary)
        print(json.dumps({
            "gate": GATE,
            "artifact": str(args.output.absolute()),
            "sha256": sha256_file(args.output),
            "verdict": summary["verdict"],
            "familyCounts": summary["familyCounts"],
            "checkpointLedgerSha256": summary["evidencePipeline"]["checkpointLedgerSha256"],
            "scheduler": scheduler,
        }, indent=2, sort_keys=True))
        return

    if load_json(args.manifest).get("schemaVersion") == MANIFEST_SCHEMA_VERSION:
        require_durable_path(args.output)
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
    if summary["schemaVersion"] == 1 and summary["verdict"] != "PASS":
        raise SystemExit(1)


if __name__ == "__main__":
    main()
