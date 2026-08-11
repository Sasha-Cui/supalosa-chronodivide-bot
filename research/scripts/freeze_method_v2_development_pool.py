#!/usr/bin/env python3
"""Freeze the outcome-blind method-v2 development pool and public commitment."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
from typing import Any


SCHEMA_VERSION = 1
RANK_DOMAIN = "chrono-divide-method-v2-development-v1"
EXPECTED_INPUT_SHA256 = {
    "role_blind_targets": "8780e809aef0554e2d90474a97caa7b4efdef54f3433722890de902d1fa7d6d2",
    "gate_summary": "cff2659efbab44c757f9e41ad985c126c4db9053c24698cbfd4ab0078355f668",
    "probe_results": "7679cd5c87a8925693b937c0c12056a83a68ccfdcdbc689b90f312e6f1d133c2",
    "catalog": "8f378ee52a2d8a6d45e5d23a1e521aa6b2e08e9ab174adc8066cce8a1824bd54",
    "original_public_roles": "e7a4f4df4325c75107eb3708d5b105f43dd1436c78cbd210b0695076fc47d65d",
}
ALLOWED_REVIEW_CATEGORIES = {"invalid_object", "invalid_terrain", "other_warning"}
ORIGINAL_ROLES = ("train", "development", "reserve", "test")


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
        raise ValueError(f"Expected a JSON object in {path}")
    return value


def rank_family_ids(family_ids: list[str]) -> list[str]:
    if len(set(family_ids)) != len(family_ids):
        raise ValueError("Cannot rank duplicate family IDs")
    return sorted(
        family_ids,
        key=lambda family_id: hashlib.sha256(
            f"{RANK_DOMAIN}\0{family_id}".encode("utf-8")
        ).hexdigest(),
    )


def _require_probe_side(side: dict[str, Any], label: str) -> None:
    required_true = ("loaded", "progressedBeyondTickOne", "reachedTargetTick")
    if any(side.get(key) is not True for key in required_true):
        raise ValueError(f"Review family {label} did not pass all {label} progress checks")
    if side.get("error") is not None or side.get("warningCaptureTruncated") is not False:
        raise ValueError(f"Review family {label} has an error or truncated warnings")


def adjudicate_review_row(summary_row: dict[str, Any], probe_row: dict[str, Any]) -> dict[str, Any]:
    family_id = summary_row.get("familyId")
    if not isinstance(family_id, str) or probe_row.get("familyId") != family_id:
        raise ValueError("Review summary/probe identity mismatch")
    if summary_row.get("status") != "review" or probe_row.get("fidelityStatus") != "review":
        raise ValueError(f"Family {family_id} is not review-only in both artifacts")
    if summary_row.get("mapSha256") != probe_row.get("mapSha256"):
        raise ValueError(f"Family {family_id} map hash differs between gate artifacts")
    if summary_row.get("failures") != [] or probe_row.get("failureCategories") != []:
        raise ValueError(f"Review family {family_id} has a failure category")
    _require_probe_side(probe_row.get("forward", {}), "forward")
    _require_probe_side(probe_row.get("reverse", {}), "reverse")
    reciprocal = probe_row.get("reciprocalStartCheck")
    if not isinstance(reciprocal, dict):
        raise ValueError(f"Review family {family_id} lacks reciprocal-start evidence")
    reciprocal_true = (
        "allObservedStartsDeclared",
        "declaredStartCountValid",
        "forwardStartsDistinct",
        "reciprocalPhysicalSlots",
        "reverseStartsDistinct",
    )
    if any(reciprocal.get(key) is not True for key in reciprocal_true) or reciprocal.get("failures") != []:
        raise ValueError(f"Review family {family_id} failed reciprocal-start checks")
    warning_counts = summary_row.get("warningCategoryCounts")
    if not isinstance(warning_counts, dict) or not warning_counts:
        raise ValueError(f"Review family {family_id} lacks classified review warnings")
    categories = set(warning_counts)
    if not categories <= ALLOWED_REVIEW_CATEGORIES or any(
        not isinstance(count, int) or count <= 0 for count in warning_counts.values()
    ):
        raise ValueError(f"Review family {family_id} has a non-admissible warning category")
    observed_categories = {warning.get("category") for warning in probe_row.get("warnings", [])}
    if observed_categories != categories:
        raise ValueError(f"Review family {family_id} warning categories do not reconcile")
    return {
        "familyId": family_id,
        "mapSha256": summary_row["mapSha256"],
        "warningCategoryCounts": {key: warning_counts[key] for key in sorted(warning_counts)},
        "forwardReachedTargetTick": True,
        "reverseReachedTargetTick": True,
        "reciprocalStartChecksPassed": True,
        "failureCount": 0,
    }


def _validate_file(path: Path, label: str) -> None:
    actual = sha256_file(path)
    expected = EXPECTED_INPUT_SHA256[label]
    if actual != expected:
        raise ValueError(f"{label} SHA-256 differs: expected {expected}, got {actual}")


def freeze_pool(args: argparse.Namespace) -> tuple[dict[str, Any], dict[str, Any]]:
    paths = {
        "role_blind_targets": args.role_blind_targets,
        "gate_summary": args.gate_summary,
        "probe_results": args.probe_results,
        "catalog": args.catalog,
        "original_public_roles": args.original_public_roles,
    }
    for label, artifact_path in paths.items():
        _validate_file(artifact_path, label)

    targets_artifact = read_json(args.role_blind_targets)
    gate_summary = read_json(args.gate_summary)
    probe_results = read_json(args.probe_results)
    catalog = read_json(args.catalog)
    public_roles = read_json(args.original_public_roles)
    if (
        targets_artifact.get("status") != "ROLE_BLIND_FIDELITY_SCREEN_TARGETS_NOT_A_SPLIT"
        or targets_artifact.get("roleBlind") is not True
        or targets_artifact.get("outcomeBlind") is not True
        or targets_artifact.get("targetCount") != 67
        or len(targets_artifact.get("targets", [])) != 67
    ):
        raise ValueError("Role-blind TEMPERATE target artifact is not the frozen 67-family population")
    if (
        gate_summary.get("outcomeFree") is not True
        or gate_summary.get("notSealedTestEvidence") is not True
        or gate_summary.get("screenComplete") is not True
        or gate_summary.get("fullCoverage") is not True
        or gate_summary.get("technicalChecksPassed") is not True
        or gate_summary.get("runFamilyCount") != 67
        or probe_results.get("outcomeFree") is not True
        or probe_results.get("runFamilyCount") != 67
        or gate_summary.get("resultSha256") != sha256_file(args.probe_results)
        or gate_summary.get("scheduler", {}).get("account") != "pi_jss233"
        or gate_summary.get("scheduler", {}).get("jobId") != "21608882"
    ):
        raise ValueError("Fidelity screen is not the exact complete outcome-free job 21608882")

    summary_rows = gate_summary.get("families", [])
    probe_rows = probe_results.get("families", [])
    if len(summary_rows) != 67 or len(probe_rows) != 67:
        raise ValueError("Fidelity artifacts do not each contain 67 family rows")
    summary_by_id = {row["familyId"]: row for row in summary_rows}
    probe_by_id = {row["familyId"]: row for row in probe_rows}
    if len(summary_by_id) != 67 or set(summary_by_id) != set(probe_by_id):
        raise ValueError("Fidelity family identities are duplicated or disagree across artifacts")
    status_counts = {
        status: sum(row.get("status") == status for row in summary_rows)
        for status in ("pass", "review", "fail")
    }
    if status_counts != {"pass": 54, "review": 7, "fail": 6}:
        raise ValueError(f"Unexpected fidelity disposition counts: {status_counts}")

    if public_roles.get("status") != "FROZEN_FAMILY_ROLE_COMMITMENTS_IDENTITIES_PRIVATE":
        raise ValueError("Original public role commitment has the wrong status")
    original_ids: set[str] = set()
    private_artifacts = public_roles.get("privateArtifacts", {})
    role_commitments = public_roles.get("roleCommitments", {})
    reserve_manifest: dict[str, Any] | None = None
    for role in ORIGINAL_ROLES:
        descriptor = private_artifacts.get(role)
        if not isinstance(descriptor, dict):
            raise ValueError(f"Original public commitment lacks role {role}")
        private_path = args.original_private_role_root / descriptor["file"]
        if sha256_file(private_path) != descriptor.get("sha256"):
            raise ValueError(f"Original private role {role} differs from its public hash")
        private = read_json(private_path)
        if (
            private.get("status") != "PRIVATE_FAMILY_ROLE_MANIFEST_NO_POLICY_OUTCOMES"
            or private.get("role") != role
            or private.get("roleCommitmentSha256") != role_commitments.get(role)
            or len(private.get("targets", [])) != private.get("targetCount")
        ):
            raise ValueError(f"Original private role {role} has inconsistent metadata")
        ids = {target["familyId"] for target in private["targets"]}
        if original_ids & ids:
            raise ValueError("Original private roles overlap")
        original_ids |= ids
        if role == "reserve":
            reserve_manifest = private
    if len(original_ids) != 54 or any(summary_by_id[family_id].get("status") != "pass" for family_id in original_ids):
        raise ValueError("The 54 original-role families are not exactly fidelity-pass families")
    if reserve_manifest is None or reserve_manifest.get("targetCount") != 4:
        raise ValueError("Original reserve role is not the frozen four-family manifest")

    review_ids = sorted(family_id for family_id, row in summary_by_id.items() if row.get("status") == "review")
    if len(review_ids) != 7 or original_ids & set(review_ids):
        raise ValueError("Review families overlap an original private role or do not number seven")
    adjudications = [adjudicate_review_row(summary_by_id[family_id], probe_by_id[family_id]) for family_id in review_ids]

    target_by_id = {target["familyId"]: target for target in targets_artifact["targets"]}
    catalog_maps = catalog.get("maps", [])
    catalog_by_key = {
        (row["familyId"], row["path"], row["sha256"]): row
        for row in catalog_maps
    }
    combined: dict[str, dict[str, Any]] = {}
    for target in reserve_manifest["targets"]:
        combined[target["familyId"]] = {
            "familyId": target["familyId"],
            "representative": target["representative"],
            "descriptors": target["descriptors"],
            "poolSource": "original-reserve",
        }
    for family_id in review_ids:
        source_target = target_by_id.get(family_id)
        if not isinstance(source_target, dict) or not isinstance(source_target.get("representative"), dict):
            raise ValueError(f"Review family {family_id} is absent from the role-blind target artifact")
        representative = source_target["representative"]
        key = (family_id, representative.get("path"), representative.get("sha256"))
        catalog_row = catalog_by_key.get(key)
        if catalog_row is None or not isinstance(catalog_row.get("descriptors"), dict):
            raise ValueError(f"Review family {family_id} representative is absent from the frozen catalog")
        combined[family_id] = {
            "familyId": family_id,
            "representative": representative,
            "descriptors": catalog_row["descriptors"],
            "poolSource": "fidelity-review",
        }
    if len(combined) != 11:
        raise ValueError("Method-v2 development pool is not exactly eleven unique families")
    for target in combined.values():
        map_path = args.repo_root / target["representative"]["path"]
        if sha256_file(map_path) != target["representative"]["sha256"]:
            raise ValueError(f"Committed representative bytes differ for {target['familyId']}")

    ordered_ids = rank_family_ids(list(combined))
    private_targets: list[dict[str, Any]] = []
    for index, family_id in enumerate(ordered_ids):
        target = combined[family_id]
        private_targets.append({
            **target,
            "diagnosticRole": "primary" if index < 10 else "substitute",
            "substituteOrder": None if index < 10 else 1,
            "rankSha256": hashlib.sha256(f"{RANK_DOMAIN}\0{family_id}".encode("utf-8")).hexdigest(),
        })
    identity_commitment_rows = [{
        "familyId": row["familyId"],
        "representativeSha256": row["representative"]["sha256"],
        "diagnosticRole": row["diagnosticRole"],
        "substituteOrder": row["substituteOrder"],
    } for row in private_targets]
    role_commitment = canonical_sha256({"role": "development", "targets": identity_commitment_rows})
    split_commitment = canonical_sha256({
        "methodVersion": 2,
        "rankDomain": RANK_DOMAIN,
        "assignments": identity_commitment_rows,
    })
    pool_commitment = canonical_sha256([{
        "familyId": row["familyId"],
        "representativeSha256": row["representative"]["sha256"],
        "poolSource": row["poolSource"],
    } for row in private_targets])
    adjudication_commitment = canonical_sha256(adjudications)
    source_population_commitment = targets_artifact["populationCommitmentSha256"]
    private_output = {
        "schemaVersion": SCHEMA_VERSION,
        "status": "PRIVATE_FAMILY_ROLE_MANIFEST_NO_POLICY_OUTCOMES",
        "methodVersion": 2,
        "role": "development",
        "outcomeBlind": True,
        "roleCommitmentSha256": role_commitment,
        "splitCommitmentSha256": split_commitment,
        "sourcePopulationCommitmentSha256": source_population_commitment,
        "poolCommitmentSha256": pool_commitment,
        "adjudicationCommitmentSha256": adjudication_commitment,
        "rankDomain": RANK_DOMAIN,
        "targetCount": 11,
        "primaryCount": 10,
        "substituteCount": 1,
        "targets": private_targets,
    }
    private_file_bytes = (json.dumps(private_output, indent=2) + "\n").encode("utf-8")
    private_file_sha256 = hashlib.sha256(private_file_bytes).hexdigest()
    public_output = {
        "schemaVersion": SCHEMA_VERSION,
        "status": "FROZEN_FAMILY_ROLE_COMMITMENTS_IDENTITIES_PRIVATE",
        "methodVersion": 2,
        "identitiesPrivate": True,
        "outcomeBlind": True,
        "interpretation": "Fresh method-v2 development role; identities remain in a separate private manifest and sealed-test identities are not emitted.",
        "privateArtifacts": {
            "development": {"file": "development-families.json", "sha256": private_file_sha256},
        },
        "roleCommitments": {"development": role_commitment},
        "splitCommitmentSha256": split_commitment,
        "sourcePopulationCommitmentSha256": source_population_commitment,
        "poolCommitmentSha256": pool_commitment,
        "adjudicationCommitmentSha256": adjudication_commitment,
        "roleCounts": {"development": 11},
        "developmentDiagnosticCounts": {"primary": 10, "substitute": 1},
        "poolSourceCounts": {"originalReserve": 4, "fidelityReview": 7},
        "fidelityDispositionCounts": status_counts,
        "allowedReviewWarningCategories": sorted(ALLOWED_REVIEW_CATEGORIES),
        "fidelityScheduler": {"jobId": "21608882", "account": "pi_jss233"},
        "rankDomain": RANK_DOMAIN,
        "inputArtifacts": {
            label: {"sha256": EXPECTED_INPUT_SHA256[label]}
            for label in sorted(EXPECTED_INPUT_SHA256)
        },
    }
    return private_output, public_output


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo-root", type=Path, required=True)
    parser.add_argument("--role-blind-targets", type=Path, required=True)
    parser.add_argument("--gate-summary", type=Path, required=True)
    parser.add_argument("--probe-results", type=Path, required=True)
    parser.add_argument("--catalog", type=Path, required=True)
    parser.add_argument("--original-public-roles", type=Path, required=True)
    parser.add_argument("--original-private-role-root", type=Path, required=True)
    parser.add_argument("--private-output", type=Path, required=True)
    parser.add_argument("--public-output", type=Path, required=True)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    for output in (args.private_output, args.public_output):
        if output.exists():
            raise FileExistsError(f"Refusing to overwrite {output}")
        output.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    private_output, public_output = freeze_pool(args)
    args.private_output.write_text(json.dumps(private_output, indent=2) + "\n", encoding="utf-8")
    args.public_output.write_text(json.dumps(public_output, indent=2) + "\n", encoding="utf-8")
    args.private_output.chmod(0o600)
    args.public_output.chmod(0o600)
    # Do not emit private identities.
    print(json.dumps({
        "privateOutput": str(args.private_output),
        "privateSha256": sha256_file(args.private_output),
        "publicOutput": str(args.public_output),
        "publicSha256": sha256_file(args.public_output),
        "targetCount": private_output["targetCount"],
        "primaryCount": private_output["primaryCount"],
        "substituteCount": private_output["substituteCount"],
        "poolSourceCounts": public_output["poolSourceCounts"],
        "sealedTestIdentitiesEmitted": 0,
    }, sort_keys=True))


if __name__ == "__main__":
    main()
