#!/usr/bin/env python3
"""Create role-blind fidelity targets and a compromised capacity dry run.

The public artifact contains aggregate counts and cryptographic commitments
only. All evidence-eligible family representatives are written to a committed,
role-free fidelity manifest. A separate deterministic 16/8/26 assignment is a
mode-0600 capacity test whose identities are permanently excluded from final
use. This tool cannot freeze or create the final split.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import os
import re
from collections import Counter, defaultdict
from pathlib import Path
from typing import Iterable


ROLE_TRAIN = "dry_run_train_candidate"
ROLE_VALIDATION = "dry_run_validation_candidate"
ROLE_TEST = "dry_run_test_candidate"
ROLE_RESERVE = "dry_run_unassigned_reserve"
SELECTED_ROLES = (ROLE_TRAIN, ROLE_VALIDATION, ROLE_TEST)
CAPACITY_PRIVATE_STATUS = (
    "PROVISIONAL_COMPROMISED_DRY_RUN_EXCLUDE_FROM_FINAL"
)
FIDELITY_TARGET_STATUS = (
    "ROLE_BLIND_FIDELITY_SCREEN_TARGETS_NOT_A_SPLIT"
)
FIDELITY_GATE = "map-fidelity-gate-v1"
ALLOWED_GROUPING_STATUSES = {"pending", "confirmed", "rejected"}
ALLOWED_FIDELITY_STATUSES = {"not_assessed", "pass", "fail"}
SHA256_PATTERN = re.compile(r"[0-9a-f]{64}")
FIDELITY_SUMMARY_KEYS = {
    "schemaVersion", "gate", "outcomeFree", "artifactKind", "scope",
    "populationFamilyCount", "runFamilyCount", "fullCoverage",
    "screenComplete", "eligibleForFidelityClearance", "verdict",
    "technicalChecksPassed",
    "passed", "notSealedTestEvidence", "scheduler", "manifestPath",
    "manifestSha256", "resultPath", "resultSha256", "provenance",
    "familyCounts", "warningCategoryCounts", "globalFailures",
    "globalReviews", "families", "interpretation",
}
FIDELITY_SCHEDULER_KEYS = {"jobId", "account", "partition", "qos", "source"}
FIDELITY_PROVENANCE_KEYS = {
    "sourceCommit", "targetManifestSha256",
    "targetPopulationCommitmentSha256", "catalogSha256", "sourceFiles",
    "compiledRuntime", "nodeRuntime", "pythonRuntime", "scontrolRuntime",
    "gameApiRuntime", "gameApiRuntimeTreeSha256",
    "runtimeDependencyTreeSha256", "mixTreeSha256", "sourceBundleSha256",
    "runtimeBundleSha256", "logging",
}
FIDELITY_FAMILY_KEYS = {
    "familyId", "representativeMapPath", "mapName", "mapSha256",
    "slurmJobId", "status", "failures", "reviews", "warningCategoryCounts",
}
FIDELITY_FAMILY_COUNT_KEYS = {"requested", "run", "pass", "review", "fail"}
FORBIDDEN_FIDELITY_KEYS = {
    "role", "dryrunrole", "mvprole", "splitrole", "assignment",
    "winner", "loser", "defeated", "credits", "candidatewins",
    "baselinewins", "winrate", "scorerate", "score", "draws",
    "combatants", "units", "buildings", "playerstats", "isfinished",
    "finished", "outcome",
}


def reject_unknown_keys(
    value: object, allowed: set[str], label: str
) -> dict[str, object]:
    if not isinstance(value, dict):
        raise ValueError(f"{label} must be an object")
    unknown = sorted(set(value) - allowed)
    missing = sorted(allowed - set(value))
    if unknown or missing:
        raise ValueError(
            f"{label} schema mismatch; unknown={unknown}, missing={missing}"
        )
    return value


def validate_exact_descriptor(value: object, label: str) -> None:
    record = reject_unknown_keys(value, {"path", "bytes", "sha256"}, label)
    if not isinstance(record["path"], str) or not record["path"]:
        raise ValueError(f"{label} path is invalid")
    if (
        not isinstance(record["bytes"], int)
        or isinstance(record["bytes"], bool)
        or record["bytes"] < 0
    ):
        raise ValueError(f"{label} byte count is invalid")
    if not SHA256_PATTERN.fullmatch(str(record["sha256"])):
        raise ValueError(f"{label} SHA-256 is invalid")


def forbidden_fidelity_key_paths(value: object, path: str = "$") -> list[str]:
    found: list[str] = []
    if isinstance(value, dict):
        for key, child in value.items():
            child_path = f"{path}.{key}"
            normalized = re.sub(r"[^a-z0-9]", "", str(key).lower())
            if normalized in FORBIDDEN_FIDELITY_KEYS:
                found.append(child_path)
            found.extend(forbidden_fidelity_key_paths(child, child_path))
    elif isinstance(value, list):
        for index, child in enumerate(value):
            found.extend(forbidden_fidelity_key_paths(child, f"{path}[{index}]"))
    return found


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def stable_hash(*values: str) -> str:
    digest = hashlib.sha256()
    for value in values:
        digest.update(value.encode("utf-8"))
        digest.update(b"\0")
    return digest.hexdigest()


def canonical_sha256(value: object) -> str:
    rendered = json.dumps(
        value,
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=True,
    ).encode("utf-8")
    return hashlib.sha256(rendered).hexdigest()


def median(values: Iterable[int]) -> float | None:
    ordered = sorted(values)
    if not ordered:
        return None
    middle = len(ordered) // 2
    if len(ordered) % 2:
        return float(ordered[middle])
    return (ordered[middle - 1] + ordered[middle]) / 2.0


def tercile_thresholds(values: Iterable[float]) -> dict[str, float] | None:
    ordered = sorted(set(values))
    if not ordered:
        return None
    return {
        "smallMaxArea": ordered[math.floor((len(ordered) - 1) / 3)],
        "mediumMaxArea": ordered[math.floor(2 * (len(ordered) - 1) / 3)],
    }


def size_bucket(area: float | None, thresholds: dict[str, float] | None) -> str:
    if area is None or thresholds is None:
        return "area_unknown"
    if area <= thresholds["smallMaxArea"]:
        return "area_small_tercile"
    if area <= thresholds["mediumMaxArea"]:
        return "area_medium_tercile"
    return "area_large_tercile"


def player_band(start_counts: list[int]) -> str:
    if not start_counts:
        return "players_unknown"
    if len(start_counts) > 1:
        return "players_mixed"
    if start_counts[0] == 2:
        return "players_2"
    if start_counts[0] <= 4:
        return "players_3_4"
    return "players_5_plus"


def theater_band(theaters: list[str]) -> str:
    if not theaters:
        return "theater_unknown"
    if len(theaters) > 1:
        return "theater_mixed"
    token = re.sub(r"[^a-z0-9]+", "_", theaters[0].lower()).strip("_")
    return "theater_" + token


def map_areas(
    family: dict[str, object],
    maps_by_path: dict[str, dict[str, object]],
) -> list[int]:
    areas: set[int] = set()
    for path in family["mapPaths"]:
        row = maps_by_path.get(str(path))
        if row is None:
            continue
        descriptors = row.get("descriptors", {})
        size = descriptors.get("size") if isinstance(descriptors, dict) else None
        if not isinstance(size, dict):
            continue
        width = size.get("width")
        height = size.get("height")
        if (
            isinstance(width, int)
            and isinstance(height, int)
            and width > 0
            and height > 0
        ):
            areas.add(width * height)
    return sorted(areas)


def representative_map(
    family: dict[str, object],
    maps_by_path: dict[str, dict[str, object]],
) -> dict[str, object]:
    """Choose and bind one exact evaluation content item per family."""

    candidates = []
    for path in family["mapPaths"]:
        path_string = str(path)
        row = maps_by_path.get(path_string)
        if row is None:
            continue
        checks = row.get("loadVerification", [])
        passed = any(check.get("ok") is True for check in checks)
        failed = any(check.get("ok") is False for check in checks)
        verification_rank = 0 if passed and not failed else 1 if failed else 2
        candidates.append((
            verification_rank,
            path_string.count("/"),
            len(path_string),
            path_string,
            str(row["sha256"]),
        ))
    if not candidates:
        raise ValueError(f"family {family['familyId']} has no catalog map path")
    chosen = min(candidates)
    return {
        "path": chosen[3],
        "sha256": chosen[4],
        "selectionRule": (
            "Prefer passed-load content, then failed-load content, then "
            "unverified content; tie-break by path depth, length, and lexical order."
        ),
    }


def ambiguity_flags(
    family: dict[str, object],
    representative_area: float | None,
) -> list[dict[str, object]]:
    flags: list[dict[str, object]] = []
    revision_keys = list(family.get("revisionKeys", []))
    start_counts = list(family.get("startCounts", []))
    theaters = list(family.get("theaters", []))
    family_key = str(family.get("familyKey", ""))

    for condition, code, detail in (
        (
            len(revision_keys) > 1,
            "multiple_revision_keys",
            revision_keys,
        ),
        (
            len(start_counts) > 1,
            "conflicting_start_counts",
            start_counts,
        ),
        (
            len(theaters) > 1,
            "conflicting_theaters",
            theaters,
        ),
        (
            bool(re.fullmatch(r"[0-9a-f]{16,}", family_key)),
            "uninformative_hash_like_family_key",
            family_key,
        ),
    ):
        if condition:
            flags.append({"code": code, "blocking": True, "detail": detail})

    if int(family.get("contentHashCount", 0)) > 1:
        flags.append({
            "code": "multiple_content_revisions",
            "blocking": False,
            "detail": int(family["contentHashCount"]),
        })
    if int(family.get("mapCount", 0)) > int(family.get("contentHashCount", 0)):
        flags.append({
            "code": "exact_duplicate_or_compatibility_copies",
            "blocking": False,
            "detail": (
                int(family["mapCount"]) - int(family["contentHashCount"])
            ),
        })
    for missing, code in (
        (not start_counts, "missing_start_count_descriptor"),
        (not theaters, "missing_theater_descriptor"),
        (representative_area is None, "missing_area_descriptor"),
    ):
        if missing:
            flags.append({"code": code, "blocking": False, "detail": None})
    return flags


def validate_catalog_partition(catalog: dict[str, object]) -> dict[str, int]:
    families = catalog["families"]
    maps = catalog["maps"]
    family_ids = [str(family["familyId"]) for family in families]
    if len(family_ids) != len(set(family_ids)):
        raise ValueError("catalog family IDs are not unique")

    def unique_owners(field: str, key: str) -> int:
        owners: dict[str, str] = {}
        for family in families:
            family_id = str(family["familyId"])
            for value in family[key]:
                token = str(value)
                previous = owners.setdefault(token, family_id)
                if previous != family_id:
                    raise ValueError(
                        f"cross-family {field} overlap: {token} is owned by "
                        f"{previous} and {family_id}"
                    )
        return len(owners)

    path_count = unique_owners("map path", "mapPaths")
    hash_count = unique_owners("content hash", "contentHashes")
    revision_count = unique_owners("revision key", "revisionKeys")
    catalog_paths = {str(row["path"]) for row in maps}
    family_paths = {
        str(path) for family in families for path in family["mapPaths"]
    }
    if catalog_paths != family_paths:
        raise ValueError("family map paths do not exactly partition catalog maps")
    return {
        "uniqueFamilyIds": len(family_ids),
        "uniqueMapPaths": path_count,
        "uniqueContentHashes": hash_count,
        "uniqueRevisionKeys": revision_count,
    }


def validate_config(config: dict[str, object]) -> None:
    if int(config.get("schemaVersion", 0)) < 2:
        raise ValueError("config schemaVersion 2 or newer is required")
    if config.get("status") != "DRAFT_NOT_FROZEN":
        raise ValueError("config.status must be DRAFT_NOT_FROZEN")
    if config.get("purpose") != "COMPROMISED_CAPACITY_DRY_RUN_ONLY":
        raise ValueError("config.purpose must mark the capacity-only dry run")
    if config.get("finalReuseProhibited") is not True:
        raise ValueError("config.finalReuseProhibited must be true")
    if config.get("requireFullMapFidelityBeforeFreeze") is not True:
        raise ValueError("full map fidelity must be required before freeze")
    if config.get("futureFinalSplitSeedPolicy") != (
        "NEW_PROSPECTIVE_SEED_COMMITMENT_AFTER_FIDELITY_ADJUDICATION_"
        "AND_POLICY_SOURCE_METHOD_PROTOCOL_FREEZE"
    ):
        raise ValueError("future final split must require a new post-freeze seed")
    commitment = config.get("capacityDryRunSeedCommitmentSha256")
    if not isinstance(commitment, str) or not SHA256_PATTERN.fullmatch(commitment):
        raise ValueError("capacityDryRunSeedCommitmentSha256 must be a SHA-256")
    for key in (
        "capacityDryRunSeedFile",
        "capacityDryRunAssignmentOutput",
        "roleBlindFidelityTargetOutput",
    ):
        if not isinstance(config.get(key), str) or not config[key]:
            raise ValueError(f"{key} must be configured")
    counts = config.get("targetCounts")
    if not isinstance(counts, dict) or set(counts) != set(SELECTED_ROLES):
        raise ValueError("targetCounts must define exactly train/validation/test")
    if any(not isinstance(counts[role], int) or counts[role] < 0 for role in SELECTED_ROLES):
        raise ValueError("targetCounts must be nonnegative integers")
    if config.get("reserveRole") != ROLE_RESERVE:
        raise ValueError(f"reserveRole must be {ROLE_RESERVE}")
    if config.get("capacityIdentityBurnPolicy") != (
        "SELECTED_16_8_26_ONLY_RESERVES_NOT_RECORDED"
    ):
        raise ValueError("capacity identity burn policy must exclude selected only")
    minimum_unexposed = config.get(
        "minimumUnexposedEligibleFamiliesForFinalSplit"
    )
    if (
        not isinstance(minimum_unexposed, int)
        or minimum_unexposed != sum(counts.values())
    ):
        raise ValueError(
            "minimum unexposed eligible families must equal the final split size"
        )
    adjudications = config.get("familyAdjudications")
    if not isinstance(adjudications, dict):
        raise ValueError("familyAdjudications must be an object")
    for family_id, decision in adjudications.items():
        if not isinstance(decision, dict):
            raise ValueError(f"adjudication for {family_id} must be an object")
        if decision.get("groupingStatus", "pending") not in ALLOWED_GROUPING_STATUSES:
            raise ValueError(f"invalid groupingStatus for {family_id}")
        if decision.get("fullMapFidelityStatus", "not_assessed") not in ALLOWED_FIDELITY_STATUSES:
            raise ValueError(f"invalid fullMapFidelityStatus for {family_id}")


def load_committed_seed(config: dict[str, object]) -> str:
    seed_path = Path(str(config["capacityDryRunSeedFile"]))
    mode = seed_path.stat().st_mode & 0o777
    if mode & 0o077:
        raise ValueError(f"seed file must not be group/world accessible: mode {mode:o}")
    seed = seed_path.read_text(encoding="utf-8")
    actual = hashlib.sha256(seed.encode("utf-8")).hexdigest()
    expected = str(config["capacityDryRunSeedCommitmentSha256"])
    if actual != expected:
        raise ValueError("seed does not match public commitment")
    return seed


def validate_fidelity_pass(
    decision: dict[str, object],
    representative: dict[str, object],
    family_id: str,
    catalog_sha256: str,
    expected_family_ids: set[str],
    expected_target_population_commitment: str,
) -> dict[str, object] | None:
    status = decision.get("fullMapFidelityStatus", "not_assessed")
    if status != "pass":
        return None
    evidence = decision.get("fidelityEvidence")
    required = {
        "representativeMapPath",
        "representativeMapSha256",
        "slurmJobId",
        "resultArtifactPath",
        "resultArtifactSha256",
        "sourceSha256",
        "runtimeSha256",
    }
    if not isinstance(evidence, dict) or not required <= set(evidence):
        raise ValueError(
            "a fidelity pass requires representative path/SHA, Slurm job, "
            "result artifact path/SHA, and source/runtime SHA-256 values"
        )
    if evidence["representativeMapPath"] != representative["path"]:
        raise ValueError("fidelity pass is bound to the wrong representative path")
    if evidence["representativeMapSha256"] != representative["sha256"]:
        raise ValueError("fidelity pass is bound to the wrong representative SHA-256")
    if not re.fullmatch(r"\d+(?:_\d+)?", str(evidence["slurmJobId"])):
        raise ValueError("fidelity pass requires a concrete Slurm job ID")
    for key in (
        "representativeMapSha256",
        "resultArtifactSha256",
        "sourceSha256",
        "runtimeSha256",
    ):
        if not SHA256_PATTERN.fullmatch(str(evidence[key])):
            raise ValueError(f"{key} must be a SHA-256")
    artifact_path = Path(str(evidence["resultArtifactPath"]))
    if not artifact_path.is_file():
        raise ValueError("fidelity result artifact does not exist")
    if sha256_file(artifact_path) != evidence["resultArtifactSha256"]:
        raise ValueError("fidelity result artifact hash mismatch")

    try:
        summary = json.loads(artifact_path.read_text(encoding="utf-8"))
    except (OSError, UnicodeDecodeError, json.JSONDecodeError) as error:
        raise ValueError("fidelity result artifact is not valid JSON") from error
    summary = reject_unknown_keys(
        summary, FIDELITY_SUMMARY_KEYS, "fidelity gate summary"
    )
    forbidden_paths = forbidden_fidelity_key_paths(summary)
    if forbidden_paths:
        raise ValueError(
            "fidelity gate summary contains role/outcome fields: "
            + ", ".join(forbidden_paths[:20])
        )
    if (
        summary.get("schemaVersion") != 1
        or summary.get("gate") != FIDELITY_GATE
        or summary.get("outcomeFree") is not True
        or summary.get("artifactKind")
        != "infrastructure_fidelity_full_summary_not_policy_evaluation"
        or summary.get("notSealedTestEvidence") is not True
    ):
        raise ValueError("fidelity result artifact is not a valid gate summary")
    if summary.get("scope") != "full":
        raise ValueError("fidelity pass requires scope=full")
    if summary.get("fullCoverage") is not True:
        raise ValueError("fidelity pass requires fullCoverage=true")
    if summary.get("screenComplete") is not True:
        raise ValueError("fidelity pass requires a complete full-population screen")
    if summary.get("technicalChecksPassed") is not True:
        raise ValueError("fidelity gate infrastructure checks did not pass")

    scheduler = summary.get("scheduler")
    scheduler = reject_unknown_keys(
        scheduler, FIDELITY_SCHEDULER_KEYS, "fidelity gate summary scheduler"
    )
    job_id = str(evidence["slurmJobId"])
    if str(scheduler.get("jobId")) != job_id:
        raise ValueError("fidelity gate summary Slurm job mismatch")
    if (
        scheduler.get("source") != "scontrol"
        or scheduler.get("account") != "pi_jss233"
    ):
        raise ValueError("fidelity gate summary scheduler provenance is invalid")

    provenance = summary.get("provenance")
    provenance = reject_unknown_keys(
        provenance,
        FIDELITY_PROVENANCE_KEYS,
        "fidelity gate summary provenance",
    )
    for key in ("manifestSha256", "resultSha256"):
        if not SHA256_PATTERN.fullmatch(str(summary.get(key))):
            raise ValueError(f"fidelity gate summary {key} is invalid")
    for list_key in ("sourceFiles", "compiledRuntime"):
        descriptors = provenance.get(list_key)
        if not isinstance(descriptors, list) or not descriptors:
            raise ValueError(f"fidelity gate provenance {list_key} is invalid")
        for index, descriptor in enumerate(descriptors):
            validate_exact_descriptor(
                descriptor, f"fidelity gate provenance {list_key}[{index}]"
            )
    for descriptor_key in (
        "nodeRuntime", "pythonRuntime", "scontrolRuntime", "gameApiRuntime"
    ):
        validate_exact_descriptor(
            provenance.get(descriptor_key),
            f"fidelity gate provenance {descriptor_key}",
        )
    if provenance.get("logging") != {
        "debugLogging": "1",
        "source": "sbatch_pinned",
    }:
        raise ValueError("fidelity gate provenance logging mode is invalid")
    for hash_key in (
        "gameApiRuntimeTreeSha256",
        "runtimeDependencyTreeSha256",
        "mixTreeSha256",
    ):
        if not SHA256_PATTERN.fullmatch(str(provenance.get(hash_key))):
            raise ValueError(f"fidelity gate provenance {hash_key} is invalid")
    source_commit = provenance.get("sourceCommit")
    if not isinstance(source_commit, str) or not re.fullmatch(
        r"[0-9a-f]{40,64}", source_commit
    ):
        raise ValueError("fidelity gate summary source commit is invalid")
    target_manifest_sha = provenance.get("targetManifestSha256")
    target_population_commitment = provenance.get(
        "targetPopulationCommitmentSha256"
    )
    summary_catalog_sha = provenance.get("catalogSha256")
    if not SHA256_PATTERN.fullmatch(str(target_manifest_sha)):
        raise ValueError("fidelity gate target-manifest SHA-256 is invalid")
    if target_population_commitment != expected_target_population_commitment:
        raise ValueError("fidelity gate target-population commitment mismatch")
    if summary_catalog_sha != catalog_sha256:
        raise ValueError("fidelity gate summary catalog SHA-256 mismatch")
    source_bundle = provenance.get("sourceBundleSha256")
    runtime_bundle = provenance.get("runtimeBundleSha256")
    if not SHA256_PATTERN.fullmatch(str(source_bundle)):
        raise ValueError("fidelity gate summary source bundle SHA-256 is invalid")
    if not SHA256_PATTERN.fullmatch(str(runtime_bundle)):
        raise ValueError("fidelity gate summary runtime bundle SHA-256 is invalid")
    if source_bundle != evidence["sourceSha256"]:
        raise ValueError("fidelity evidence source provenance mismatch")
    if runtime_bundle != evidence["runtimeSha256"]:
        raise ValueError("fidelity evidence runtime provenance mismatch")

    population_count = summary.get("populationFamilyCount")
    run_count = summary.get("runFamilyCount")
    families = summary.get("families")
    if (
        not isinstance(population_count, int)
        or population_count <= 0
        or not isinstance(run_count, int)
        or run_count != population_count
        or population_count != len(expected_family_ids)
        or not isinstance(families, list)
        or len(families) != run_count
    ):
        raise ValueError("fidelity gate summary does not prove full population coverage")
    families = [
        reject_unknown_keys(
            record,
            FIDELITY_FAMILY_KEYS,
            f"fidelity gate family[{index}]",
        )
        for index, record in enumerate(families)
    ]
    family_ids = [str(record.get("familyId")) for record in families]
    if len(family_ids) != len(set(family_ids)):
        raise ValueError("fidelity gate summary has duplicate family IDs")
    if set(family_ids) != expected_family_ids:
        raise ValueError("fidelity gate summary family set does not match current catalog")
    for record in families:
        status_value = record.get("status")
        family_failures = record.get("failures")
        family_reviews = record.get("reviews")
        consistent = (
            status_value == "pass"
            and family_failures == []
            and family_reviews == []
        ) or (
            status_value == "review"
            and family_failures == []
            and isinstance(family_reviews, list)
            and bool(family_reviews)
        ) or (
            status_value == "fail"
            and isinstance(family_failures, list)
            and bool(family_failures)
            and isinstance(family_reviews, list)
        )
        if not consistent:
            raise ValueError("fidelity gate family status/findings are inconsistent")

    family_counts = reject_unknown_keys(
        summary.get("familyCounts"),
        FIDELITY_FAMILY_COUNT_KEYS,
        "fidelity gate summary familyCounts",
    )
    if (
        family_counts.get("requested") != population_count
        or family_counts.get("run") != run_count
        or any(
            not isinstance(family_counts.get(key), int)
            or isinstance(family_counts.get(key), bool)
            or family_counts.get(key) < 0
            for key in ("pass", "review", "fail")
        )
        or sum(
            family_counts.get(key) for key in ("pass", "review", "fail")
        ) != run_count
    ):
        raise ValueError("fidelity gate summary family counts are inconsistent")
    expected_verdict = (
        "FAIL" if family_counts["fail"] > 0
        else "REVIEW" if family_counts["review"] > 0
        else "PASS"
    )
    expected_global_clearance = expected_verdict == "PASS"
    if (
        summary.get("verdict") != expected_verdict
        or summary.get("passed") is not expected_global_clearance
        or summary.get("eligibleForFidelityClearance")
        is not expected_global_clearance
    ):
        raise ValueError("fidelity gate global verdict/clearance is inconsistent")
    if summary.get("globalFailures") != [] or summary.get("globalReviews") != []:
        raise ValueError("fidelity gate summary contains unresolved findings")

    matches = [
        record for record in families
        if record.get("familyId") == family_id
    ]
    if len(matches) != 1:
        raise ValueError("fidelity gate summary family binding mismatch")
    family_summary = matches[0]
    if family_summary.get("representativeMapPath") != representative["path"]:
        raise ValueError("fidelity gate summary representative path mismatch")
    if family_summary.get("mapSha256") != representative["sha256"]:
        raise ValueError("fidelity gate summary representative SHA-256 mismatch")
    if str(family_summary.get("slurmJobId")) != job_id:
        raise ValueError("fidelity gate summary family Slurm job mismatch")
    if family_summary.get("status") != "pass":
        raise ValueError("fidelity gate summary family status must be pass")
    return {key: evidence[key] for key in sorted(required)}


def select_stratified(
    records: list[dict[str, object]],
    seed: str,
    target_counts: dict[str, int],
) -> dict[str, str]:
    eligible = [record for record in records if record["dryRunEligible"]]
    required = sum(target_counts.values())
    if len(eligible) < required:
        raise ValueError(
            f"fail closed: requested {required} selected families but only "
            f"{len(eligible)} are eligible"
        )

    queues: dict[str, list[dict[str, object]]] = defaultdict(list)
    for record in eligible:
        stratum = str(record["structuralStratum"]["key"])
        record["selectionRankSha256"] = stable_hash(
            seed,
            stratum,
            str(record["familyId"]),
        )
        queues[stratum].append(record)
    for members in queues.values():
        members.sort(
            key=lambda record: (
                str(record["selectionRankSha256"]),
                str(record["familyId"]),
            )
        )

    assignments = {
        str(record["familyId"]): ROLE_RESERVE for record in eligible
    }
    # Test receives first coverage because it is the largest and primary
    # held-out role; each role then round-robins across all nonempty strata.
    for role in (ROLE_TEST, ROLE_VALIDATION, ROLE_TRAIN):
        remaining = target_counts[role]
        stratum_order = sorted(
            queues,
            key=lambda stratum: (
                stable_hash(seed, role, stratum),
                stratum,
            ),
        )
        while remaining:
            progressed = False
            for stratum in stratum_order:
                if remaining == 0:
                    break
                if queues[stratum]:
                    record = queues[stratum].pop(0)
                    family_id = str(record["familyId"])
                    if assignments[family_id] != ROLE_RESERVE:
                        raise AssertionError("family assigned more than once")
                    assignments[family_id] = role
                    remaining -= 1
                    progressed = True
            if not progressed:
                raise ValueError("fail closed: exact stratified allocation is impossible")

    actual = Counter(assignments.values())
    for role in SELECTED_ROLES:
        if actual[role] != target_counts[role]:
            raise AssertionError(f"exact count failed for {role}")
    if len(assignments) != len(set(assignments)):
        raise AssertionError("assignment family IDs overlap")
    return assignments


def build_manifests(
    catalog: dict[str, object],
    config: dict[str, object],
    seed: str,
    catalog_sha256: str,
    config_sha256: str,
) -> tuple[dict[str, object], dict[str, object], dict[str, object]]:
    validate_config(config)
    if catalog.get("outcomeBlind") is not True or int(catalog.get("schemaVersion", 0)) < 2:
        raise ValueError("outcome-blind catalog schemaVersion 2+ is required")
    partition_validation = validate_catalog_partition(catalog)

    expected_seed_hash = str(config["capacityDryRunSeedCommitmentSha256"])
    if hashlib.sha256(seed.encode("utf-8")).hexdigest() != expected_seed_hash:
        raise ValueError("provided seed does not match commitment")

    adjudications = config["familyAdjudications"]
    known_family_ids = {
        str(family["familyId"]) for family in catalog["families"]
    }
    expected_fidelity_family_ids = {
        str(family["familyId"])
        for family in catalog["families"]
        if family["evidenceBasedDevelopmentEligibility"]["eligible"] is True
    }
    unknown = sorted(set(adjudications) - known_family_ids)
    if unknown:
        raise ValueError("unknown adjudication families: " + ", ".join(unknown))

    maps_by_path = {str(row["path"]): row for row in catalog["maps"]}
    expected_role_blind_targets = [
        {
            "familyId": str(family["familyId"]),
            "representative": {
                "path": representative_map(family, maps_by_path)["path"],
                "sha256": representative_map(family, maps_by_path)["sha256"],
            },
        }
        for family in sorted(
            catalog["families"], key=lambda item: str(item["familyId"])
        )
        if family["evidenceBasedDevelopmentEligibility"]["eligible"] is True
    ]
    expected_target_population_commitment = canonical_sha256(
        expected_role_blind_targets
    )
    records: list[dict[str, object]] = []
    for family in catalog["families"]:
        family_id = str(family["familyId"])
        areas = map_areas(family, maps_by_path)
        representative_area = median(areas)
        representative = representative_map(family, maps_by_path)
        flags = ambiguity_flags(family, representative_area)
        blocking_flags = [flag["code"] for flag in flags if flag["blocking"]]
        decision = adjudications.get(family_id, {})
        grouping_status = decision.get(
            "groupingStatus",
            "pending" if blocking_flags else "auto_clear",
        )
        explicit_exclusion = (
            grouping_status == "rejected"
            or bool(decision.get("excludeFromDryRun", False))
        )
        grouping_ready = (
            not blocking_flags or grouping_status == "confirmed"
        )
        evidence_eligible = bool(
            family["evidenceBasedDevelopmentEligibility"]["eligible"]
        )
        verification = family["loadVerificationSummary"]
        load_ready = (
            int(verification["passed"]) > 0
            and int(verification["failed"]) == 0
        )
        if not config["requirePassedLoadMetadataForDryRun"]:
            load_ready = True
        dry_run_eligible = (
            evidence_eligible
            and load_ready
            and grouping_ready
            and not explicit_exclusion
        )
        fidelity_status = decision.get(
            "fullMapFidelityStatus", "not_assessed"
        )
        fidelity_evidence = validate_fidelity_pass(
            decision,
            representative,
            family_id,
            catalog_sha256,
            expected_fidelity_family_ids,
            expected_target_population_commitment,
        )

        records.append({
            "familyId": family_id,
            "familyKey": family["familyKey"],
            "mapPaths": family["mapPaths"],
            "contentHashes": family["contentHashes"],
            "revisionKeys": family["revisionKeys"],
            "representative": representative,
            "ambiguityFlags": flags,
            "blockingAmbiguityFlags": blocking_flags,
            "manualGroupingReviewRequired": bool(blocking_flags),
            "groupingAdjudicationStatus": grouping_status,
            "structuralDescriptors": {
                "theaters": family["theaters"],
                "startCounts": family["startCounts"],
                "uniqueAreas": areas,
                "representativeArea": representative_area,
            },
            "structuralStratum": {
                "playerBand": player_band(family["startCounts"]),
                "theaterBand": theater_band(family["theaters"]),
                "sizeBand": None,
                "key": None,
            },
            "evidenceBasedEligible": evidence_eligible,
            "loadReady": load_ready,
            "dryRunEligible": dry_run_eligible,
            "fullMapFidelityStatus": fidelity_status,
            "fidelityEvidence": fidelity_evidence,
            "selectionRankSha256": None,
        })

    threshold_source = [
        float(record["structuralDescriptors"]["representativeArea"])
        for record in records
        if record["dryRunEligible"]
        and record["structuralDescriptors"]["representativeArea"] is not None
    ]
    thresholds = tercile_thresholds(threshold_source)
    for record in records:
        stratum = record["structuralStratum"]
        stratum["sizeBand"] = size_bucket(
            record["structuralDescriptors"]["representativeArea"],
            thresholds,
        )
        stratum["key"] = "|".join((
            str(stratum["playerBand"]),
            str(stratum["theaterBand"]),
            str(stratum["sizeBand"]),
        ))

    target_counts = {
        role: int(config["targetCounts"][role]) for role in SELECTED_ROLES
    }
    selected_capacity_count = sum(target_counts.values())
    minimum_unexposed = int(
        config["minimumUnexposedEligibleFamiliesForFinalSplit"]
    )
    capacity_eligible_count = sum(
        bool(record["dryRunEligible"]) for record in records
    )
    if capacity_eligible_count - selected_capacity_count < minimum_unexposed:
        raise ValueError(
            "fail closed: capacity dry run would leave only "
            f"{capacity_eligible_count - selected_capacity_count} unexposed "
            f"eligible families; at least {minimum_unexposed} are required "
            "for the final split"
        )
    assignments = select_stratified(records, seed, target_counts)
    capacity_selected_ids = {
        family_id
        for family_id, role in assignments.items()
        if role in SELECTED_ROLES
    }
    if len(capacity_selected_ids) != selected_capacity_count:
        raise AssertionError("capacity-test families are not disjoint/exact")

    capacity_assignments = []
    for record in sorted(records, key=lambda item: str(item["familyId"])):
        if not record["dryRunEligible"]:
            continue
        family_id = str(record["familyId"])
        role = assignments[family_id]
        if role == ROLE_RESERVE:
            continue
        capacity_assignments.append({
            **record,
            "capacityDryRunRole": role,
            "selectedForCapacityCheck": True,
            "burnedByCompromisedCapacityDryRun": True,
            "finalReuseProhibited": True,
        })
    if len(capacity_assignments) != selected_capacity_count:
        raise AssertionError("capacity artifact must record exactly selected families")
    if any(
        assignment["capacityDryRunRole"] == ROLE_RESERVE
        for assignment in capacity_assignments
    ):
        raise AssertionError("capacity artifact must not record reserve identities")

    actual_counts = Counter(assignments.values())
    expected_reserve = capacity_eligible_count - selected_capacity_count
    if actual_counts[ROLE_RESERVE] != expected_reserve:
        raise AssertionError("reserve count mismatch")

    stratum_role_counts: dict[str, Counter[str]] = defaultdict(Counter)
    for record in records:
        if not record["dryRunEligible"]:
            continue
        family_id = str(record["familyId"])
        stratum_role_counts[
            str(record["structuralStratum"]["key"])
        ][assignments[family_id]] += 1

    role_blind_targets = []
    for record in sorted(records, key=lambda item: str(item["familyId"])):
        if not record["evidenceBasedEligible"]:
            continue
        role_blind_targets.append({
            "familyId": record["familyId"],
            "representative": {
                "path": record["representative"]["path"],
                "sha256": record["representative"]["sha256"],
            },
        })
    if role_blind_targets != expected_role_blind_targets:
        raise AssertionError("role-blind target projection drift")
    fidelity_status_counts = Counter(
        str(record["fullMapFidelityStatus"])
        for record in records
        if record["evidenceBasedEligible"]
    )

    ambiguity_accumulators: dict[str, dict[str, object]] = {}
    for record in records:
        for flag in record["ambiguityFlags"]:
            code = str(flag["code"])
            accumulator = ambiguity_accumulators.setdefault(code, {
                "code": code,
                "blocking": bool(flag["blocking"]),
                "familyIds": set(),
            })
            accumulator["familyIds"].add(str(record["familyId"]))
    ambiguity_summary = [
        {
            "code": code,
            "blocking": ambiguity_accumulators[code]["blocking"],
            "familyCount": len(ambiguity_accumulators[code]["familyIds"]),
        }
        for code in sorted(ambiguity_accumulators)
    ]

    capacity_private = {
        "schemaVersion": 2,
        "status": CAPACITY_PRIVATE_STATUS,
        "purpose": "CAPACITY_AND_DETERMINISM_TEST_ONLY",
        "finalReuseProhibited": True,
        "outcomeBlind": True,
        "isFinalSplit": False,
        "seedCommitmentSha256": expected_seed_hash,
        "catalogSha256": catalog_sha256,
        "configSha256": config_sha256,
        "excludedIdentityCount": len(capacity_assignments),
        "unexposedEligibleIdentityCount": expected_reserve,
        "reserveIdentitiesRecorded": False,
        "exclusionPolicy": (
            "Exactly the selected 16/8/26 family identities in this artifact "
            "are permanently excluded from final use. Reserve identities are "
            "not recorded here and remain unexposed to capacity roles."
        ),
        "capacityAssignments": capacity_assignments,
    }
    capacity_commitment = canonical_sha256(capacity_private)

    fidelity_private = {
        "schemaVersion": 3,
        "status": FIDELITY_TARGET_STATUS,
        "outcomeBlind": True,
        "roleBlind": True,
        "finalSplit": False,
        "isSplit": False,
        "catalogSha256": catalog_sha256,
        "populationCommitmentSha256": expected_target_population_commitment,
        "populationCommitmentRule": (
            "SHA-256 of canonical JSON for the ordered target list containing "
            "only familyId and representative path/SHA-256."
        ),
        "inclusionPolicy": (
            "Include every catalog family with evidence-based Tier-B "
            "development eligibility, independent of load metadata, grouping "
            "ambiguity, fidelity result, or capacity-dry-run role."
        ),
        "representativeFidelityPolicy": (
            "Screen exactly the recorded representative path and SHA-256 for "
            "each family. Other revisions enforce family disjointness but are "
            "not substituted evaluation content."
        ),
        "targetCount": len(role_blind_targets),
        "targets": role_blind_targets,
    }
    fidelity_commitment = canonical_sha256(fidelity_private)

    public = {
        "schemaVersion": 2,
        "status": "COMPROMISED_CAPACITY_DRY_RUN_NOT_FROZEN",
        "outcomeBlind": True,
        "canBeUsedAsSealedTestSplit": False,
        "finalReuseProhibited": True,
        "finalReuseProhibitionScope": "selected_capacity_identities_only",
        "containsCandidateFamilyIdsOrPaths": False,
        "capacityDryRunSeed": {
            "revealed": False,
            "commitmentSha256": expected_seed_hash,
            "rankingRule": (
                "SHA-256(seed, structural-stratum key, familyId), ascending"
            ),
            "scope": "compromised capacity/determinism dry run only",
            "eligibleForFinalSplitReuse": False,
        },
        "inputs": {
            "catalogSha256": catalog_sha256,
            "configSha256": config_sha256,
            "catalogSchemaVersion": catalog["schemaVersion"],
            "partitionValidation": partition_validation,
        },
        "policy": {
            "eligibilityTier": "evidence_based",
            "capacityDryRunTargetCounts": target_counts,
            "reserveRole": ROLE_RESERVE,
            "capacityAllocatedFamilyCount": sum(target_counts.values()),
            "capacityIdentityBurnPolicy": config[
                "capacityIdentityBurnPolicy"
            ],
            "minimumUnexposedEligibleFamiliesForFinalSplit": (
                minimum_unexposed
            ),
            "capacityAllocationRule": (
                "Fail-closed exact allocation: test, validation, then train "
                "round-robin across deterministic structural-stratum queues."
            ),
            "capacityAssignmentFinalReuseProhibited": True,
            "roleBlindFidelityTargetPolicy": fidelity_private[
                "inclusionPolicy"
            ],
        },
        "areaTercileThresholds": thresholds,
        "ambiguityFlagSummary": ambiguity_summary,
        "summary": {
            "catalogFamilies": len(records),
            "evidenceBasedEligibleFamilies": sum(
                bool(record["evidenceBasedEligible"]) for record in records
            ),
            "manualGroupingReviewRequiredFamilies": sum(
                bool(record["manualGroupingReviewRequired"])
                for record in records
            ),
            "capacityDryRunEligibleFamilies": capacity_eligible_count,
            "capacityAllocatedFamilies": len(capacity_selected_ids),
            "capacityBurnedIdentityFamilies": len(capacity_assignments),
            "unexposedEligibleFamiliesRemaining": expected_reserve,
            "minimumFamiliesRequiredForFinalSplit": minimum_unexposed,
            "remainingEligiblePoolSufficientForFinalSplit": (
                expected_reserve >= minimum_unexposed
            ),
            "capacityRoleCounts": {
                role: actual_counts[role]
                for role in (*SELECTED_ROLES, ROLE_RESERVE)
            },
            "roleBlindFidelityTargetFamilies": len(role_blind_targets),
            "roleBlindFidelityTargetsWithBoundPass": fidelity_status_counts["pass"],
            "roleBlindFidelityStatusCounts": dict(sorted(
                fidelity_status_counts.items()
            )),
            "capacityStrata": len(stratum_role_counts),
        },
        "capacityDryRunAssignment": {
            "status": CAPACITY_PRIVATE_STATUS,
            "commitmentSha256": capacity_commitment,
            "commitmentRule": (
                "SHA-256 of canonical JSON with sorted keys, compact separators, "
                "ASCII escaping, and no trailing newline."
            ),
            "outputPath": str(config["capacityDryRunAssignmentOutput"]),
            "requiredMode": "0600",
            "candidateIdsAndPathsPublic": False,
            "finalReuseProhibited": True,
            "excludedIdentityCount": len(capacity_assignments),
            "reserveIdentitiesRecorded": False,
        },
        "roleBlindFidelityTargets": {
            "status": FIDELITY_TARGET_STATUS,
            "commitmentSha256": fidelity_commitment,
            "commitmentRule": (
                "SHA-256 of canonical JSON with sorted keys, compact separators, "
                "ASCII escaping, and no trailing newline."
            ),
            "outputPath": str(config["roleBlindFidelityTargetOutput"]),
            "requiredMode": "0644",
            "targetCount": len(role_blind_targets),
            "populationCommitmentSha256": expected_target_population_commitment,
            "familyIdsAndPathsPublic": True,
        },
        "freezeGate": {
            "satisfied": False,
            "toolCanFreeze": False,
            "blockingReasons": [
                "This tool cannot emit a frozen split.",
                "All Tier-B representatives require role-blind full-map fidelity screening before pool freeze.",
                "Grouping and eligibility adjudications must be completed before pool freeze.",
                "Policy, source revision, methods, metrics, baselines, and the evaluation protocol must be frozen before role generation.",
                "A new prospective final-split seed must be committed after freeze and before final role generation.",
                "Exactly the 50 selected capacity identities are excluded from final role reuse; reserve identities are not recorded in the capacity artifact.",
                "Author-history and legal/release review remain external gates.",
            ],
        },
        "futureFinalSplit": {
            "status": "DEFERRED_UNTIL_FIDELITY_ADJUDICATION_AND_POLICY_SOURCE_PROTOCOL_FREEZE",
            "seedCommitmentCreated": False,
            "mustUseNewProspectiveSeed": True,
            "mayReuseCapacityDryRunSeedOrRoles": False,
            "requiredOrder": [
                "complete role-blind fidelity screening for all Tier-B representatives",
                "complete eligibility and grouping adjudication",
                "freeze policy, source revision, methods, and evaluation protocol",
                "create and publish a new prospective seed commitment",
                "generate final train/validation/test roles once",
            ],
        },
        "reviewerFacingLimitations": [
            "The aggregate split artifact hides capacity identities; the separate immutable role-blind fidelity manifest openly records only Tier-B family IDs and representative path/SHA values, without roles or fidelity outcomes.",
            "Fidelity pass/review/fail is an outcome-blind compatibility filter: a complete screen may exclude incompatible families without invalidating other passing families.",
            "Role-by-stratum capacity cells are withheld because sparse cells could indirectly reveal selected identities.",
            "Exactly the 16/8/26 selected identities test feasibility and determinism and are permanently excluded from final use; capacity-reserve identities are not recorded.",
            "At least 50 capacity-role-unexposed eligible families must remain before this dry run can be generated.",
            "The final candidate pool may change after fidelity or family adjudication and therefore requires a new prospective seed commitment.",
            "Structural strata use only INI theater, start count, and rectangular area, not difficulty, topology, resources, water, or symmetry.",
            "Area terciles are corpus-relative.",
            "Name/revision ambiguity flags are heuristic.",
            "A smoke/load pass is not a full-map fidelity pass.",
            "Fidelity binds one exact representative path and content SHA per Tier-B family; it does not validate every revision in the leakage family.",
        ],
    }
    return public, capacity_private, fidelity_private


def report_markdown(public: dict[str, object]) -> str:
    summary = public["summary"]
    lines = [
        "# Compromised capacity dry run — EXCLUDED FROM FINAL USE",
        "",
        "This report contains aggregate counts and commitments only. The current "
        "16/8/26 selected identities and roles are a capacity/determinism test, "
        "are retained only in a mode-0600 audit artifact, and are permanently "
        "excluded from final use. Capacity-reserve identities are not written "
        "to that artifact and remain unexposed to capacity roles. A "
        "separate committed manifest contains all Tier-B representatives without "
        "train, validation, or test roles for role-blind fidelity screening.",
        "",
        "## Gate and commitment",
        "",
        f"- Status: {public['status']}",
        f"- Capacity seed revealed publicly: {public['capacityDryRunSeed']['revealed']}",
        f"- Capacity seed commitment: {public['capacityDryRunSeed']['commitmentSha256']}",
        f"- Compromised assignment commitment: {public['capacityDryRunAssignment']['commitmentSha256']}",
        f"- Role-blind fidelity-target commitment: {public['roleBlindFidelityTargets']['commitmentSha256']}",
        f"- Immutable target-population commitment: {public['roleBlindFidelityTargets']['populationCommitmentSha256']}",
        f"- Freeze gate satisfied: {public['freezeGate']['satisfied']}",
        f"- Final reuse prohibited: {public['finalReuseProhibited']}",
        f"- Reuse-prohibition scope: {public['finalReuseProhibitionScope']}",
        "",
        "## Exact capacity-test counts",
        "",
        "| Role | Count |",
        "|---|---:|",
    ]
    for role in (*SELECTED_ROLES, ROLE_RESERVE):
        lines.append(
            f"| {role} | {summary['capacityRoleCounts'][role]} |"
        )
    lines.extend([
        "",
        f"Capacity-allocated families: {summary['capacityAllocatedFamilies']}. "
        f"Burned identities: {summary['capacityBurnedIdentityFamilies']}. "
        f"Capacity-role-unexposed eligible families remaining: "
        f"{summary['unexposedEligibleFamiliesRemaining']} (minimum required "
        f"for a final split: {summary['minimumFamiliesRequiredForFinalSplit']}).",
        "",
        "## Role-blind fidelity screen",
        "",
        f"Targets: {summary['roleBlindFidelityTargetFamilies']} Tier-B family "
        "representatives. The immutable target projection contains only family "
        "ID and representative path/SHA; it has no role, fidelity status, or "
        "adjudication field.",
        "",
        "",
        "## Family-grouping ambiguity aggregates",
        "",
        "| Flag | Blocking | Families |",
        "|---|---|---:|",
    ])
    for flag in public["ambiguityFlagSummary"]:
        lines.append(
            f"| {flag['code']} | {'yes' if flag['blocking'] else 'no'} | "
            f"{flag['familyCount']} |"
        )
    lines.extend(["", "## Blocking gates", ""])
    for reason in public["freezeGate"]["blockingReasons"]:
        lines.append(f"- {reason}")
    lines.extend(["", "## Reviewer-facing limitations", ""])
    for limitation in public["reviewerFacingLimitations"]:
        lines.append(f"- {limitation}")
    lines.extend([
        "",
        "## Final-split ordering",
        "",
    ])
    for step in public["futureFinalSplit"]["requiredOrder"]:
        lines.append(f"- {step}")
    lines.append("")
    return "\n".join(lines)


def write_private_json(path: Path, value: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    os.chmod(path.parent, 0o700)
    rendered = json.dumps(value, indent=2, sort_keys=True) + "\n"
    temporary = path.with_name(path.name + ".tmp")
    temporary.write_text(rendered, encoding="utf-8")
    os.chmod(temporary, 0o600)
    temporary.replace(path)
    os.chmod(path, 0o600)


def write_release_json(path: Path, value: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    rendered = json.dumps(value, indent=2, sort_keys=True) + "\n"
    temporary = path.with_name(path.name + ".tmp")
    temporary.write_text(rendered, encoding="utf-8")
    temporary.replace(path)
    os.chmod(path, 0o644)


def main() -> None:
    repo_root = Path(__file__).resolve().parents[2]
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--catalog",
        type=Path,
        default=repo_root / "research/artifacts/map_family_catalog.json",
    )
    parser.add_argument(
        "--config",
        type=Path,
        default=repo_root / "research/configs/provisional_family_split_v1.json",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=repo_root
        / "research/artifacts/provisional_family_split_v1.json",
    )
    parser.add_argument(
        "--report",
        type=Path,
        default=repo_root / "research/PROVISIONAL_FAMILY_SPLIT.md",
    )
    args = parser.parse_args()

    catalog = json.loads(args.catalog.read_text(encoding="utf-8"))
    config = json.loads(args.config.read_text(encoding="utf-8"))
    validate_config(config)
    seed = load_committed_seed(config)
    public, capacity_private, fidelity_private = build_manifests(
        catalog,
        config,
        seed,
        sha256_file(args.catalog),
        sha256_file(args.config),
    )

    capacity_path = Path(str(config["capacityDryRunAssignmentOutput"]))
    configured_fidelity_path = Path(
        str(config["roleBlindFidelityTargetOutput"])
    )
    fidelity_path = (
        configured_fidelity_path
        if configured_fidelity_path.is_absolute()
        else repo_root / configured_fidelity_path
    )
    write_private_json(capacity_path, capacity_private)
    write_release_json(fidelity_path, fidelity_private)
    actual_capacity_hash = canonical_sha256(capacity_private)
    if (
        actual_capacity_hash
        != public["capacityDryRunAssignment"]["commitmentSha256"]
    ):
        raise AssertionError("capacity assignment commitment mismatch")
    actual_fidelity_hash = canonical_sha256(fidelity_private)
    if (
        actual_fidelity_hash
        != public["roleBlindFidelityTargets"]["commitmentSha256"]
    ):
        raise AssertionError("fidelity-target commitment mismatch")

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(
        json.dumps(public, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    args.report.write_text(report_markdown(public), encoding="utf-8")
    print(json.dumps(public["summary"], indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
