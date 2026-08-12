#!/usr/bin/env python3
"""Freeze fresh method-v3 family roles without emitting sealed identities."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
from typing import Any


SCHEMA_VERSION = 1
RANK_DOMAIN = "chrono-divide-method-v3-role-v1"
PUBLIC_STATUS = "FROZEN_METHOD_V3_FAMILY_ROLE_COMMITMENTS_IDENTITIES_PRIVATE"
PRIVATE_STATUS = "PRIVATE_METHOD_V3_FAMILY_ROLE_MANIFEST_NO_POLICY_OUTCOMES"
OLD_PRIVATE_STATUS = "PRIVATE_FAMILY_ROLE_MANIFEST_NO_POLICY_OUTCOMES"
ROLE_SLICES = {
    "train": (0, 16),
    "development_a": (16, 20),
    "development_b": (20, 24),
    "confirmatory": (24, 40),
}
OLD_ROLES = ("train", "development", "reserve", "test")


def canonical_json(value: Any) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=True)


def canonical_sha256(value: Any) -> str:
    return hashlib.sha256(canonical_json(value).encode("utf-8")).hexdigest()


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def read_json(path: Path) -> dict[str, Any]:
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise ValueError(f"Expected JSON object in {path}")
    return value


def rank_sha256(family_id: str) -> str:
    return hashlib.sha256(f"{RANK_DOMAIN}\0{family_id}".encode("utf-8")).hexdigest()


def load_bound_private_roles(
    public_path: Path,
    private_root: Path,
    roles: tuple[str, ...],
) -> set[str]:
    public = read_json(public_path)
    if public.get("outcomeBlind") is not True:
        raise ValueError(f"Public role commitment is not outcome-blind: {public_path}")
    descriptors = public.get("privateArtifacts")
    commitments = public.get("roleCommitments")
    if not isinstance(descriptors, dict) or not isinstance(commitments, dict):
        raise ValueError(f"Public role commitment is malformed: {public_path}")
    family_ids: set[str] = set()
    for role in roles:
        descriptor = descriptors.get(role)
        if not isinstance(descriptor, dict) or not isinstance(descriptor.get("file"), str):
            raise ValueError(f"Missing private descriptor for {role}")
        private_path = (private_root / descriptor["file"]).resolve()
        if private_root.resolve() not in private_path.parents:
            raise ValueError("Private role path escapes its root")
        if sha256_file(private_path) != descriptor.get("sha256"):
            raise ValueError(f"Private role hash differs for {role}")
        private = read_json(private_path)
        if (
            private.get("status") != OLD_PRIVATE_STATUS
            or private.get("role") != role
            or private.get("outcomeBlind") is not True
            or private.get("roleCommitmentSha256") != commitments.get(role)
            or private.get("targetCount") != len(private.get("targets", []))
        ):
            raise ValueError(f"Private role metadata differs for {role}")
        ids = {row.get("familyId") for row in private["targets"]}
        if None in ids or len(ids) != len(private["targets"]) or family_ids & ids:
            raise ValueError("Old private roles contain missing, duplicate, or overlapping identities")
        family_ids |= ids
    return family_ids


def validate_gate(
    gate: dict[str, Any],
    probe_path: Path,
    target_count: int,
    expected_job_id: str,
) -> dict[str, dict[str, Any]]:
    required_true = (
        "outcomeFree",
        "notSealedTestEvidence",
        "screenComplete",
        "fullCoverage",
        "technicalChecksPassed",
    )
    if (
        any(gate.get(key) is not True for key in required_true)
        or gate.get("scope") != "full"
        or gate.get("runFamilyCount") != target_count
        or gate.get("populationFamilyCount") != target_count
        or gate.get("resultSha256") != sha256_file(probe_path)
        or gate.get("scheduler", {}).get("account") != "pi_jss233"
        or str(gate.get("scheduler", {}).get("jobId")) != expected_job_id
        or gate.get("evidencePipeline", {}).get("technicallyComplete") is not True
        or gate.get("evidencePipeline", {}).get("acceptedCheckpointCount") != target_count
    ):
        raise ValueError("Method-v3 fidelity gate is incomplete, outcome-bearing, or from the wrong scheduler job")
    rows = gate.get("families")
    if not isinstance(rows, list) or len(rows) != target_count:
        raise ValueError("Fidelity gate has the wrong family row count")
    by_id = {row.get("familyId"): row for row in rows if isinstance(row, dict)}
    if None in by_id or len(by_id) != target_count:
        raise ValueError("Fidelity gate family identities are missing or duplicated")
    return by_id


def freeze_roles(args: argparse.Namespace) -> tuple[dict[str, dict[str, Any]], dict[str, Any]]:
    targets_artifact = read_json(args.targets)
    catalog = read_json(args.catalog)
    gate = read_json(args.gate_summary)
    if (
        targets_artifact.get("status") != "ROLE_BLIND_FIDELITY_SCREEN_TARGETS_NOT_A_SPLIT"
        or targets_artifact.get("roleBlind") is not True
        or targets_artifact.get("outcomeBlind") is not True
        or targets_artifact.get("targetCount") != args.expected_population_count
        or len(targets_artifact.get("targets", [])) != args.expected_population_count
        or targets_artifact.get("catalogSha256") != sha256_file(args.catalog)
    ):
        raise ValueError("Source targets are not the exact outcome-blind catalog population")
    gate_by_id = validate_gate(
        gate,
        args.probe_results,
        args.expected_population_count,
        args.expected_job_id,
    )
    target_by_id = {row.get("familyId"): row for row in targets_artifact["targets"]}
    if None in target_by_id or len(target_by_id) != args.expected_population_count or set(target_by_id) != set(gate_by_id):
        raise ValueError("Target and fidelity populations disagree")

    original_ids = load_bound_private_roles(
        args.original_public_roles,
        args.original_private_role_root,
        OLD_ROLES,
    )
    method_v2_ids = load_bound_private_roles(
        args.method_v2_public_roles,
        args.method_v2_private_role_root,
        ("development",),
    )
    excluded_ids = original_ids | method_v2_ids
    if len(original_ids) != 54 or len(method_v2_ids) != 11 or len(excluded_ids) != 61:
        raise ValueError("Historical role exclusion does not reconcile to 54 original and 11 method-v2 families")

    catalog_maps = catalog.get("maps")
    if not isinstance(catalog_maps, list):
        raise ValueError("Catalog lacks map records")
    catalog_by_key = {
        (row.get("familyId"), row.get("path"), row.get("sha256")): row
        for row in catalog_maps
        if isinstance(row, dict)
    }
    eligible: list[dict[str, Any]] = []
    for family_id, target in target_by_id.items():
        if family_id in excluded_ids or gate_by_id[family_id].get("status") != "pass":
            continue
        representative = target.get("representative")
        if not isinstance(representative, dict):
            raise ValueError(f"Family {family_id} lacks a representative")
        key = (family_id, representative.get("path"), representative.get("sha256"))
        catalog_row = catalog_by_key.get(key)
        if catalog_row is None or not isinstance(catalog_row.get("descriptors"), dict):
            raise ValueError(f"Family {family_id} representative is absent from the catalog")
        map_path = args.repo_root / str(representative.get("path"))
        if sha256_file(map_path) != representative.get("sha256"):
            raise ValueError(f"Family {family_id} representative bytes changed")
        eligible.append({
            "familyId": family_id,
            "representative": representative,
            "descriptors": catalog_row["descriptors"],
            "rankSha256": rank_sha256(family_id),
        })
    eligible.sort(key=lambda row: (row["rankSha256"], row["familyId"]))
    if len(eligible) < 40:
        raise ValueError(f"Only {len(eligible)} fresh fidelity-pass families remain; method v3 requires at least 40")

    assignments: dict[str, list[dict[str, Any]]] = {
        role: eligible[start:end] for role, (start, end) in ROLE_SLICES.items()
    }
    assignments["substitute"] = eligible[40:]
    split_rows = [
        {
            "role": role,
            "familyId": row["familyId"],
            "representativeSha256": row["representative"]["sha256"],
            "rankSha256": row["rankSha256"],
        }
        for role in (*ROLE_SLICES, "substitute")
        for row in assignments[role]
    ]
    split_commitment = canonical_sha256({
        "methodVersion": 3,
        "rankDomain": RANK_DOMAIN,
        "assignments": split_rows,
    })
    private_outputs: dict[str, dict[str, Any]] = {}
    public_descriptors: dict[str, dict[str, Any]] = {}
    role_commitments: dict[str, str] = {}
    for role, rows in assignments.items():
        identity_rows = [
            {
                "familyId": row["familyId"],
                "representativeSha256": row["representative"]["sha256"],
                "rankSha256": row["rankSha256"],
            }
            for row in rows
        ]
        role_commitment = canonical_sha256({"role": role, "targets": identity_rows})
        role_commitments[role] = role_commitment
        private = {
            "schemaVersion": SCHEMA_VERSION,
            "status": PRIVATE_STATUS,
            "methodVersion": 3,
            "role": role,
            "outcomeBlind": True,
            "rankDomain": RANK_DOMAIN,
            "roleCommitmentSha256": role_commitment,
            "splitCommitmentSha256": split_commitment,
            "sourcePopulationCommitmentSha256": targets_artifact["populationCommitmentSha256"],
            "targetCount": len(rows),
            "targets": rows,
        }
        private_outputs[role] = private
        private_bytes = (json.dumps(private, indent=2) + "\n").encode("utf-8")
        public_descriptors[role] = {
            "file": f"{role}-families.json",
            "bytes": len(private_bytes),
            "sha256": hashlib.sha256(private_bytes).hexdigest(),
        }
    public = {
        "schemaVersion": SCHEMA_VERSION,
        "status": PUBLIC_STATUS,
        "methodVersion": 3,
        "identitiesPrivate": True,
        "outcomeBlind": True,
        "interpretation": "Fresh method-v3 roles exclude every method-v2 assigned family; development and confirmatory identities remain private.",
        "rankDomain": RANK_DOMAIN,
        "rankingRule": 'SHA-256("chrono-divide-method-v3-role-v1\\0" + family_id), ascending',
        "privateArtifacts": public_descriptors,
        "roleCommitments": role_commitments,
        "roleCounts": {role: len(rows) for role, rows in assignments.items()},
        "eligibleFreshPassCount": len(eligible),
        "excludedHistoricalFamilyCount": len(excluded_ids),
        "splitCommitmentSha256": split_commitment,
        "sourcePopulationCommitmentSha256": targets_artifact["populationCommitmentSha256"],
        "fidelityScheduler": {"jobId": args.expected_job_id, "account": "pi_jss233"},
        "inputArtifacts": {
            "targets": {"sha256": sha256_file(args.targets)},
            "catalog": {"sha256": sha256_file(args.catalog)},
            "gateSummary": {"sha256": sha256_file(args.gate_summary)},
            "probeResults": {"sha256": sha256_file(args.probe_results)},
            "originalPublicRoles": {"sha256": sha256_file(args.original_public_roles)},
            "methodV2PublicRoles": {"sha256": sha256_file(args.method_v2_public_roles)},
        },
    }
    return private_outputs, public


def write_exclusive(path: Path, payload: bytes, mode: int) -> None:
    path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    descriptor = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, mode)
    try:
        with os.fdopen(descriptor, "wb") as handle:
            handle.write(payload)
            handle.flush()
            os.fsync(handle.fileno())
    except Exception:
        path.unlink(missing_ok=True)
        raise


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo-root", type=Path, required=True)
    parser.add_argument("--targets", type=Path, required=True)
    parser.add_argument("--catalog", type=Path, required=True)
    parser.add_argument("--gate-summary", type=Path, required=True)
    parser.add_argument("--probe-results", type=Path, required=True)
    parser.add_argument("--expected-job-id", required=True)
    parser.add_argument("--expected-population-count", type=int, default=127)
    parser.add_argument("--original-public-roles", type=Path, required=True)
    parser.add_argument("--original-private-role-root", type=Path, required=True)
    parser.add_argument("--method-v2-public-roles", type=Path, required=True)
    parser.add_argument("--method-v2-private-role-root", type=Path, required=True)
    parser.add_argument("--private-output-root", type=Path, required=True)
    parser.add_argument("--public-output", type=Path, required=True)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if args.public_output.exists() or args.private_output_root.exists():
        raise FileExistsError("Refusing to overwrite an existing method-v3 role freeze")
    private_outputs, public = freeze_roles(args)
    for role, payload in private_outputs.items():
        write_exclusive(
            args.private_output_root / f"{role}-families.json",
            (json.dumps(payload, indent=2) + "\n").encode("utf-8"),
            0o600,
        )
    write_exclusive(
        args.public_output,
        (json.dumps(public, indent=2) + "\n").encode("utf-8"),
        0o644,
    )
    print(json.dumps({
        "status": public["status"],
        "publicOutput": str(args.public_output),
        "publicSha256": sha256_file(args.public_output),
        "roleCounts": public["roleCounts"],
        "eligibleFreshPassCount": public["eligibleFreshPassCount"],
        "sealedIdentitiesEmitted": 0,
    }, sort_keys=True))


if __name__ == "__main__":
    main()
