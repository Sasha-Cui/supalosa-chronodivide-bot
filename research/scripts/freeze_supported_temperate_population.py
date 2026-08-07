#!/usr/bin/env python3
"""Freeze the reproducible pass-only Temperate compatibility population."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
from collections import Counter
from pathlib import Path
from typing import Any


STATUS = "SUPPORTED_TEMPERATE_POPULATION_NOT_A_SPLIT"
ELIGIBILITY_POLICY = (
    "Retain a role-blind Temperate representative if and only if two independently "
    "verified, outcome-free full-population compatibility screens assign it status=pass "
    "with identical normalized family evidence. Review and fail families remain explicit "
    "exclusions. Compatibility concerns parser/load/early-progress behavior only."
)
FAMILY_KEYS = {
    "failures",
    "familyId",
    "mapName",
    "mapSha256",
    "representativeMapPath",
    "reviews",
    "slurmJobId",
    "status",
    "warningCategoryCounts",
}
SHA256 = re.compile(r"^[0-9a-f]{64}$")
GIT_SHA1 = re.compile(r"^[0-9a-f]{40}$")


def canonical_json(value: Any) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=True)


def canonical_sha256(value: Any) -> str:
    return hashlib.sha256(canonical_json(value).encode("utf-8")).hexdigest()


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def load_json(path: Path) -> dict[str, Any]:
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise ValueError(f"Expected a JSON object: {path}")
    return value


def validate_targets(repo_root: Path, target_path: Path) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    repo_root = repo_root.resolve()
    source = load_json(target_path)
    if (
        source.get("status") != "ROLE_BLIND_FIDELITY_SCREEN_TARGETS_NOT_A_SPLIT"
        or source.get("outcomeBlind") is not True
        or source.get("roleBlind") is not True
        or source.get("finalSplit") is not False
        or source.get("isSplit") is not False
        or source.get("selectionTheater") != "TEMPERATE"
    ):
        raise ValueError("Source is not the required role/outcome-blind unsplit Temperate target artifact")
    targets = source.get("targets")
    if not isinstance(targets, list) or source.get("targetCount") != len(targets):
        raise ValueError("Source target count is inconsistent")
    if source.get("populationCommitmentSha256") != canonical_sha256(targets):
        raise ValueError("Source target population commitment is invalid")

    seen: set[str] = set()
    for index, target in enumerate(targets):
        if not isinstance(target, dict) or set(target) != {"familyId", "representative"}:
            raise ValueError(f"Source target {index} has an invalid schema")
        family_id = target.get("familyId")
        representative = target.get("representative")
        if (
            not isinstance(family_id, str)
            or not family_id
            or family_id in seen
            or not isinstance(representative, dict)
            or set(representative) != {"path", "sha256"}
            or not isinstance(representative.get("path"), str)
            or not SHA256.fullmatch(str(representative.get("sha256")))
        ):
            raise ValueError(f"Source target {index} has invalid identity or representative fields")
        seen.add(family_id)
        relative = Path(representative["path"])
        if relative.is_absolute() or ".." in relative.parts:
            raise ValueError(f"Representative path escapes the repository: {relative}")
        map_path = (repo_root / relative).resolve()
        try:
            map_path.relative_to(repo_root)
        except ValueError as error:
            raise ValueError(f"Representative path escapes the repository: {relative}") from error
        if not map_path.is_file() or sha256_file(map_path) != representative["sha256"]:
            raise ValueError(f"Representative bytes do not match the source binding: {relative}")
    return source, targets


def normalize_family(value: Any, expected_job_id: str) -> dict[str, Any]:
    if not isinstance(value, dict) or set(value) != FAMILY_KEYS:
        raise ValueError("Compatibility family row has an invalid schema")
    if value.get("slurmJobId") != expected_job_id:
        raise ValueError("Compatibility family row has a mismatched Slurm job ID")
    if value.get("status") not in {"pass", "review", "fail"}:
        raise ValueError("Compatibility family row has an invalid status")
    if not SHA256.fullmatch(str(value.get("mapSha256"))):
        raise ValueError("Compatibility family row has an invalid map SHA-256")
    for key in ("failures", "reviews"):
        rows = value.get(key)
        if not isinstance(rows, list) or not all(isinstance(row, str) for row in rows):
            raise ValueError(f"Compatibility family row has invalid {key}")
    warning_counts = value.get("warningCategoryCounts")
    if (
        not isinstance(warning_counts, dict)
        or not all(isinstance(key, str) and isinstance(count, int) and count >= 0 for key, count in warning_counts.items())
    ):
        raise ValueError("Compatibility family row has invalid warning counts")
    return {key: value[key] for key in sorted(FAMILY_KEYS - {"slurmJobId"})}


def validate_execution(
    target_path: Path,
    source: dict[str, Any],
    targets: list[dict[str, Any]],
    gate_path: Path,
    verification_path: Path,
    expected_counts: dict[str, int],
) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    gate = load_json(gate_path)
    verification = load_json(verification_path)
    job_id = str(gate.get("scheduler", {}).get("jobId", ""))
    required_gate = {
        "schemaVersion": 2,
        "artifactKind": "infrastructure_fidelity_full_summary_not_policy_evaluation",
        "outcomeFree": True,
        "notSealedTestEvidence": True,
        "scope": "full",
        "fullCoverage": True,
        "screenComplete": True,
        "technicalChecksPassed": True,
        "populationFamilyCount": len(targets),
        "runFamilyCount": len(targets),
    }
    for key, expected in required_gate.items():
        if gate.get(key) != expected:
            raise ValueError(f"Gate {gate_path} has invalid {key}: {gate.get(key)!r}")
    if not job_id or gate.get("scheduler", {}).get("account") != "pi_jss233":
        raise ValueError(f"Gate {gate_path} lacks the required pi_jss233 scheduler identity")
    provenance = gate.get("provenance")
    if not isinstance(provenance, dict):
        raise ValueError(f"Gate {gate_path} lacks provenance")
    if provenance.get("targetManifestSha256") != sha256_file(target_path):
        raise ValueError(f"Gate {gate_path} does not bind the source target artifact")
    if provenance.get("targetPopulationCommitmentSha256") != source.get("populationCommitmentSha256"):
        raise ValueError(f"Gate {gate_path} does not bind the target population commitment")
    if provenance.get("catalogSha256") != source.get("catalogSha256"):
        raise ValueError(f"Gate {gate_path} does not bind the source catalog")
    if not GIT_SHA1.fullmatch(str(provenance.get("sourceCommit"))):
        raise ValueError(f"Gate {gate_path} has an invalid source commit")

    families = gate.get("families")
    if not isinstance(families, list) or len(families) != len(targets):
        raise ValueError(f"Gate {gate_path} has an inconsistent family list")
    normalized = [normalize_family(row, job_id) for row in families]
    target_by_id = {target["familyId"]: target for target in targets}
    if [row["familyId"] for row in normalized] != [target["familyId"] for target in targets]:
        raise ValueError(f"Gate {gate_path} family sequence differs from the target artifact")
    for row in normalized:
        representative = target_by_id[row["familyId"]]["representative"]
        if (
            row["representativeMapPath"] != representative["path"]
            or row["mapSha256"] != representative["sha256"]
            or row["mapName"] != Path(representative["path"]).name
        ):
            raise ValueError(f"Gate {gate_path} representative binding differs for {row['familyId']}")
    actual_counts = Counter(row["status"] for row in normalized)
    calculated_counts = {
        "requested": len(targets),
        "run": len(targets),
        "pass": actual_counts["pass"],
        "review": actual_counts["review"],
        "fail": actual_counts["fail"],
    }
    if calculated_counts != expected_counts or gate.get("familyCounts") != expected_counts:
        raise ValueError(f"Gate {gate_path} family counts differ: {calculated_counts}")

    if (
        verification.get("schemaVersion") != 1
        or verification.get("artifactKind") != "independent_map_fidelity_execution_verification"
        or verification.get("jobId") != job_id
        or verification.get("outcomeFree") is not True
        or verification.get("scope") != "full"
        or verification.get("profile") != "temperate"
        or verification.get("result", {}).get("familyCounts") != expected_counts
        or verification.get("result", {}).get("notPolicyEvidence") is not True
        or verification.get("result", {}).get("technicalChecksPassed") is not True
        or not SHA256.fullmatch(str(verification.get("evidence", {}).get("preVerificationTreeCommitmentSha256")))
    ):
        raise ValueError(f"Execution verification is invalid or does not bind job {job_id}")
    descriptor = {
        "jobId": job_id,
        "sourceCommit": provenance["sourceCommit"],
        "sourceBundleSha256": provenance["sourceBundleSha256"],
        "runtimeBundleSha256": provenance["runtimeBundleSha256"],
        "gateSummarySha256": sha256_file(gate_path),
        "executionVerificationSha256": sha256_file(verification_path),
        "evidenceTreeCommitmentSha256": verification["evidence"]["preVerificationTreeCommitmentSha256"],
        "familyCounts": expected_counts,
    }
    return normalized, descriptor


def build_artifact(
    repo_root: Path,
    target_path: Path,
    execution_paths: list[tuple[Path, Path]],
    expected_counts: dict[str, int],
) -> dict[str, Any]:
    if len(execution_paths) != 2:
        raise ValueError("Exactly two independent compatibility executions are required")
    source, targets = validate_targets(repo_root, target_path)
    if expected_counts["requested"] != len(targets) or expected_counts["run"] != len(targets):
        raise ValueError("Expected execution counts do not match the source population")

    executions = [
        validate_execution(target_path, source, targets, gate, verification, expected_counts)
        for gate, verification in execution_paths
    ]
    first_families, first_descriptor = executions[0]
    second_families, second_descriptor = executions[1]
    if first_descriptor["jobId"] == second_descriptor["jobId"]:
        raise ValueError("The compatibility executions must have different Slurm job IDs")
    if first_families != second_families:
        raise ValueError("The compatibility executions do not reproduce identical normalized family evidence")

    source_by_id = {target["familyId"]: target for target in targets}
    eligible = [source_by_id[row["familyId"]] for row in first_families if row["status"] == "pass"]
    exclusions = [
        {
            "familyId": row["familyId"],
            "representative": source_by_id[row["familyId"]]["representative"],
            "status": row["status"],
            "failures": row["failures"],
            "reviews": row["reviews"],
            "warningCategoryCounts": row["warningCategoryCounts"],
        }
        for row in first_families
        if row["status"] != "pass"
    ]
    if len(eligible) != expected_counts["pass"] or len(exclusions) != expected_counts["review"] + expected_counts["fail"]:
        raise ValueError("Derived inclusion/exclusion counts are inconsistent")
    return {
        "schemaVersion": 1,
        "status": STATUS,
        "outcomeBlind": True,
        "roleBlind": True,
        "compatibilityDerived": True,
        "finalSplit": False,
        "isSplit": False,
        "selectionTheater": "TEMPERATE",
        "sourceTargetManifestSha256": sha256_file(target_path),
        "sourceTargetPopulationCommitmentSha256": source["populationCommitmentSha256"],
        "catalogSha256": source["catalogSha256"],
        "eligibilityPolicy": ELIGIBILITY_POLICY,
        "eligibilityPolicySha256": hashlib.sha256(ELIGIBILITY_POLICY.encode("utf-8")).hexdigest(),
        "compatibilityExecutions": [first_descriptor, second_descriptor],
        "populationCommitmentRule": source["populationCommitmentRule"],
        "populationCommitmentSha256": canonical_sha256(eligible),
        "targetCount": len(eligible),
        "targets": eligible,
        "exclusionCommitmentSha256": canonical_sha256(exclusions),
        "exclusionCount": len(exclusions),
        "exclusionCounts": {
            "review": expected_counts["review"],
            "fail": expected_counts["fail"],
        },
        "exclusions": exclusions,
        "interpretation": (
            "These families reproduced pass classifications for exact parser/load/early-progress probes. "
            "This artifact is not a train/development/test split and contains no policy outcome."
        ),
    }


def write_exclusive(path: Path, value: dict[str, Any]) -> None:
    payload = json.dumps(value, sort_keys=True, indent=2, ensure_ascii=True) + "\n"
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("x", encoding="utf-8") as handle:
        handle.write(payload)


def verify_existing(path: Path, expected: dict[str, Any]) -> None:
    actual = load_json(path)
    if actual != expected:
        raise ValueError(f"Existing supported population does not reproduce exactly: {path}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo-root", type=Path, required=True)
    parser.add_argument("--source-targets", type=Path, required=True)
    parser.add_argument("--screen-gate", type=Path, required=True)
    parser.add_argument("--screen-verification", type=Path, required=True)
    parser.add_argument("--confirmation-gate", type=Path, required=True)
    parser.add_argument("--confirmation-verification", type=Path, required=True)
    parser.add_argument("--expected-pass", type=int, default=54)
    parser.add_argument("--expected-review", type=int, default=7)
    parser.add_argument("--expected-fail", type=int, default=6)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--verify-existing", action="store_true")
    args = parser.parse_args()
    expected_counts = {
        "requested": args.expected_pass + args.expected_review + args.expected_fail,
        "run": args.expected_pass + args.expected_review + args.expected_fail,
        "pass": args.expected_pass,
        "review": args.expected_review,
        "fail": args.expected_fail,
    }
    artifact = build_artifact(
        args.repo_root.resolve(),
        args.source_targets.resolve(),
        [
            (args.screen_gate.resolve(), args.screen_verification.resolve()),
            (args.confirmation_gate.resolve(), args.confirmation_verification.resolve()),
        ],
        expected_counts,
    )
    output = args.output.resolve()
    if args.verify_existing:
        verify_existing(output, artifact)
    else:
        write_exclusive(output, artifact)
    print(json.dumps({
        "artifact": str(output),
        "populationCommitmentSha256": artifact["populationCommitmentSha256"],
        "targetCount": artifact["targetCount"],
        "exclusionCommitmentSha256": artifact["exclusionCommitmentSha256"],
        "exclusionCount": artifact["exclusionCount"],
        "screenJobIds": [row["jobId"] for row in artifact["compatibilityExecutions"]],
        "verifiedExisting": args.verify_existing,
    }, sort_keys=True, indent=2))


if __name__ == "__main__":
    main()
