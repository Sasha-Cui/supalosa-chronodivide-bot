#!/usr/bin/env python3
"""Freeze outcome-blind family roles while keeping test identities private."""

from __future__ import annotations

import argparse
import hashlib
import hmac
import json
import math
import os
import secrets
from collections import Counter, defaultdict
from pathlib import Path
from statistics import fmean
from typing import Any


PUBLIC_STATUS = "FROZEN_FAMILY_ROLE_COMMITMENTS_IDENTITIES_PRIVATE"
PRIVATE_STATUS = "PRIVATE_FAMILY_ROLE_MANIFEST_NO_POLICY_OUTCOMES"
ROLE_ORDER = ("train", "development", "test", "reserve")
ROLE_START_QUOTAS: dict[int, dict[str, int]] = {
    2: {"train": 6, "development": 4, "test": 5, "reserve": 1},
    3: {"train": 2, "development": 1, "test": 1, "reserve": 0},
    4: {"train": 8, "development": 4, "test": 6, "reserve": 2},
    6: {"train": 4, "development": 2, "test": 2, "reserve": 1},
    8: {"train": 2, "development": 1, "test": 2, "reserve": 0},
}
DEVELOPMENT_SUBSTITUTE_START_COUNTS = (2, 4)
DEFAULT_CANDIDATE_ASSIGNMENTS = 4096
SPLIT_POLICY = (
    "Within exact start-count strata, evaluate a fixed number of HMAC-SHA256 permutations "
    "keyed by a private 256-bit salt and select the lowest predeclared structural-balance "
    "score over log map area and absolute log aspect ratio. Enforce fixed role/start quotas. "
    "Designate one two-start and one four-start development family as ordered technical "
    "substitutes using a separate HMAC domain. Do not inspect compatibility details beyond "
    "the frozen pass-only population, policy identity, gameplay outcome, or dataset role history."
)


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


def load_object(path: Path) -> dict[str, Any]:
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise ValueError(f"Expected a JSON object: {path}")
    return value


def descriptor_for(target: dict[str, Any], map_row: dict[str, Any]) -> dict[str, int | str]:
    representative = target["representative"]
    if map_row.get("familyId") != target["familyId"] or map_row.get("sha256") != representative["sha256"]:
        raise ValueError(f"Catalog identity/hash mismatch for {target['familyId']}")
    descriptors = map_row.get("descriptors")
    if not isinstance(descriptors, dict) or descriptors.get("theater") != "TEMPERATE":
        raise ValueError(f"Missing Temperate descriptors for {target['familyId']}")
    size = descriptors.get("size")
    local_size = descriptors.get("localSize")
    start_count = descriptors.get("startCount")
    if (
        not isinstance(start_count, int)
        or start_count <= 0
        or not isinstance(size, dict)
        or not isinstance(local_size, dict)
        or not all(isinstance(size.get(key), int) and size[key] > 0 for key in ("width", "height"))
        or not all(isinstance(local_size.get(key), int) and local_size[key] > 0 for key in ("width", "height"))
    ):
        raise ValueError(f"Invalid size/start descriptors for {target['familyId']}")
    return {
        "theater": "TEMPERATE",
        "startCount": start_count,
        "width": size["width"],
        "height": size["height"],
        "area": size["width"] * size["height"],
        "localWidth": local_size["width"],
        "localHeight": local_size["height"],
        "localArea": local_size["width"] * local_size["height"],
    }


def load_population(
    population_path: Path,
    catalog_path: Path,
    expected_count: int,
) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    population = load_object(population_path)
    catalog = load_object(catalog_path)
    targets = population.get("targets")
    if (
        population.get("status") != "SUPPORTED_TEMPERATE_POPULATION_NOT_A_SPLIT"
        or population.get("outcomeBlind") is not True
        or population.get("roleBlind") is not True
        or population.get("isSplit") is not False
        or population.get("targetCount") != expected_count
        or not isinstance(targets, list)
        or len(targets) != expected_count
        or population.get("populationCommitmentSha256") != canonical_sha256(targets)
    ):
        raise ValueError("Input is not the required 54-family outcome/role-blind supported population")
    if (
        catalog.get("outcomeBlind") is not True
        or population.get("catalogSha256") != sha256_file(catalog_path)
    ):
        raise ValueError("Catalog is not the outcome-blind catalog bound by the supported population")
    maps = catalog.get("maps")
    if not isinstance(maps, list):
        raise ValueError("Catalog maps are missing")
    by_path = {row.get("path"): row for row in maps if isinstance(row, dict) and isinstance(row.get("path"), str)}
    records: list[dict[str, Any]] = []
    seen: set[str] = set()
    for index, target in enumerate(targets):
        if not isinstance(target, dict) or set(target) != {"familyId", "representative"}:
            raise ValueError(f"Population target {index} has an invalid schema")
        family_id = target.get("familyId")
        representative = target.get("representative")
        if (
            not isinstance(family_id, str)
            or family_id in seen
            or not isinstance(representative, dict)
            or not isinstance(representative.get("path"), str)
            or not isinstance(representative.get("sha256"), str)
            or representative["path"] not in by_path
        ):
            raise ValueError(f"Population target {index} has invalid or duplicate identity")
        seen.add(family_id)
        records.append({
            "familyId": family_id,
            "representative": representative,
            "descriptors": descriptor_for(target, by_path[representative["path"]]),
        })
    return population, records


def validate_quotas(records: list[dict[str, Any]], quotas: dict[int, dict[str, int]]) -> None:
    observed = Counter(int(row["descriptors"]["startCount"]) for row in records)
    if set(observed) != set(quotas):
        raise ValueError(f"Start-count strata differ from the frozen quota policy: {dict(observed)}")
    for start_count, role_counts in quotas.items():
        if set(role_counts) != set(ROLE_ORDER) or any(not isinstance(count, int) or count < 0 for count in role_counts.values()):
            raise ValueError(f"Invalid role quota for start count {start_count}")
        if sum(role_counts.values()) != observed[start_count]:
            raise ValueError(
                f"Role quota for start count {start_count} sums to {sum(role_counts.values())}, expected {observed[start_count]}"
            )


def hmac_key(salt: bytes, domain: str, value: str) -> bytes:
    return hmac.new(salt, f"{domain}\0{value}".encode("utf-8"), hashlib.sha256).digest()


def feature_values(record: dict[str, Any]) -> tuple[float, float]:
    descriptors = record["descriptors"]
    width = int(descriptors["width"])
    height = int(descriptors["height"])
    return math.log(int(descriptors["area"])), abs(math.log(width / height))


def standardized_feature_rows(records: list[dict[str, Any]]) -> dict[str, tuple[float, float]]:
    raw = {row["familyId"]: feature_values(row) for row in records}
    result: dict[str, list[float]] = {family_id: [] for family_id in raw}
    for feature_index in range(2):
        values = [features[feature_index] for features in raw.values()]
        mean = fmean(values)
        variance = fmean((value - mean) ** 2 for value in values)
        scale = math.sqrt(variance) if variance > 0 else 1.0
        for family_id, features in raw.items():
            result[family_id].append((features[feature_index] - mean) / scale)
    return {family_id: (values[0], values[1]) for family_id, values in result.items()}


def balance_score(
    assignment: dict[str, str],
    records: list[dict[str, Any]],
    standardized: dict[str, tuple[float, float]],
) -> float:
    by_role: dict[str, list[str]] = defaultdict(list)
    by_start_role: dict[tuple[int, str], list[str]] = defaultdict(list)
    for record in records:
        family_id = record["familyId"]
        role = assignment[family_id]
        start_count = int(record["descriptors"]["startCount"])
        by_role[role].append(family_id)
        by_start_role[(start_count, role)].append(family_id)

    score = 0.0
    for role in ROLE_ORDER:
        ids = by_role[role]
        for feature_index in range(2):
            mean = fmean(standardized[family_id][feature_index] for family_id in ids)
            score += len(ids) * mean * mean
    for (start_count, role), ids in by_start_role.items():
        stratum = [
            row["familyId"]
            for row in records
            if int(row["descriptors"]["startCount"]) == start_count
        ]
        for feature_index in range(2):
            stratum_mean = fmean(standardized[family_id][feature_index] for family_id in stratum)
            role_mean = fmean(standardized[family_id][feature_index] for family_id in ids)
            score += len(ids) * (role_mean - stratum_mean) ** 2
    return score


def select_assignment(
    records: list[dict[str, Any]],
    quotas: dict[int, dict[str, int]],
    salt: bytes,
    candidate_count: int,
) -> tuple[dict[str, str], int, float]:
    if len(salt) != 32:
        raise ValueError("Split salt must contain exactly 32 bytes")
    if not isinstance(candidate_count, int) or candidate_count <= 0:
        raise ValueError("Candidate assignment count must be positive")
    validate_quotas(records, quotas)
    standardized = standardized_feature_rows(records)
    by_start: dict[int, list[dict[str, Any]]] = defaultdict(list)
    for record in records:
        by_start[int(record["descriptors"]["startCount"])].append(record)

    best: tuple[float, int, dict[str, str]] | None = None
    for iteration in range(candidate_count):
        assignment: dict[str, str] = {}
        for start_count in sorted(by_start):
            ordered = sorted(
                by_start[start_count],
                key=lambda row: hmac_key(
                    salt,
                    f"family-role-v1:{start_count}:{iteration}",
                    row["familyId"],
                ),
            )
            role_slots = [
                role
                for role in ROLE_ORDER
                for _ in range(quotas[start_count][role])
            ]
            for record, role in zip(ordered, role_slots):
                assignment[record["familyId"]] = role
        score = balance_score(assignment, records, standardized)
        candidate = (score, iteration, assignment)
        if best is None or (candidate[0], candidate[1]) < (best[0], best[1]):
            best = candidate
    assert best is not None
    return best[2], best[1], best[0]


def role_summary(rows: list[dict[str, Any]]) -> dict[str, Any]:
    areas = [int(row["descriptors"]["area"]) for row in rows]
    local_areas = [int(row["descriptors"]["localArea"]) for row in rows]
    return {
        "count": len(rows),
        "startCounts": dict(sorted(Counter(str(row["descriptors"]["startCount"]) for row in rows).items())),
        "area": {"min": min(areas), "max": max(areas), "mean": round(fmean(areas), 6)},
        "localArea": {"min": min(local_areas), "max": max(local_areas), "mean": round(fmean(local_areas), 6)},
    }


def build_artifacts(
    population_path: Path,
    catalog_path: Path,
    salt: bytes,
    quotas: dict[int, dict[str, int]] = ROLE_START_QUOTAS,
    candidate_count: int = DEFAULT_CANDIDATE_ASSIGNMENTS,
    substitute_start_counts: tuple[int, ...] = DEVELOPMENT_SUBSTITUTE_START_COUNTS,
) -> tuple[dict[str, Any], dict[str, dict[str, Any]], str]:
    expected_count = sum(sum(role_counts.values()) for role_counts in quotas.values())
    population, records = load_population(population_path, catalog_path, expected_count)
    assignment, selected_iteration, score = select_assignment(records, quotas, salt, candidate_count)
    by_role = {
        role: [dict(record) for record in records if assignment[record["familyId"]] == role]
        for role in ROLE_ORDER
    }

    substitutes: list[dict[str, Any]] = []
    for start_count in substitute_start_counts:
        candidates = [
            row for row in by_role["development"]
            if int(row["descriptors"]["startCount"]) == start_count
        ]
        if not candidates:
            raise ValueError(f"No development family is available for substitute start count {start_count}")
        substitutes.append(min(candidates, key=lambda row: hmac_key(salt, f"development-substitute-v1:{start_count}", row["familyId"])))
    substitutes.sort(key=lambda row: hmac_key(salt, "development-substitute-order-v1", row["familyId"]))
    substitute_order = {row["familyId"]: index + 1 for index, row in enumerate(substitutes)}
    for row in by_role["development"]:
        if row["familyId"] in substitute_order:
            row["diagnosticRole"] = "substitute"
            row["substituteOrder"] = substitute_order[row["familyId"]]
        else:
            row["diagnosticRole"] = "primary"
            row["substituteOrder"] = None
    development_count = len(by_role["development"])
    diagnostic_counts = {
        "primary": development_count - len(substitute_start_counts),
        "substitute": len(substitute_start_counts),
    }
    observed_diagnostic_counts = Counter(row["diagnosticRole"] for row in by_role["development"])
    if any(observed_diagnostic_counts[key] != count for key, count in diagnostic_counts.items()):
        raise ValueError("Development primary/substitute allocation is inconsistent")

    role_commitments = {
        role: canonical_sha256([
            {
                "familyId": row["familyId"],
                "representative": row["representative"],
                **({"diagnosticRole": row["diagnosticRole"], "substituteOrder": row["substituteOrder"]} if role == "development" else {}),
            }
            for row in by_role[role]
        ])
        for role in ROLE_ORDER
    }
    split_commitment = canonical_sha256({
        role: [row["familyId"] for row in by_role[role]]
        for role in ROLE_ORDER
    })
    private_payloads = {
        role: {
            "schemaVersion": 1,
            "status": PRIVATE_STATUS,
            "outcomeBlind": True,
            "role": role,
            "sourcePopulationCommitmentSha256": population["populationCommitmentSha256"],
            "splitCommitmentSha256": split_commitment,
            "roleCommitmentSha256": role_commitments[role],
            "targetCount": len(by_role[role]),
            "targets": by_role[role],
        }
        for role in ROLE_ORDER
    }
    public = {
        "schemaVersion": 1,
        "status": PUBLIC_STATUS,
        "outcomeBlind": True,
        "identitiesPrivate": True,
        "sourcePopulationArtifactSha256": sha256_file(population_path),
        "sourcePopulationCommitmentSha256": population["populationCommitmentSha256"],
        "catalogSha256": sha256_file(catalog_path),
        "splitPolicy": SPLIT_POLICY,
        "splitPolicySha256": hashlib.sha256(SPLIT_POLICY.encode("utf-8")).hexdigest(),
        "saltSha256": hashlib.sha256(salt).hexdigest(),
        "candidateAssignmentCount": candidate_count,
        "selectedAssignmentIndex": selected_iteration,
        "structuralBalanceScore": round(score, 12),
        "roleOrder": list(ROLE_ORDER),
        "roleCounts": {role: len(by_role[role]) for role in ROLE_ORDER},
        "roleStartQuotas": {str(start): quotas[start] for start in sorted(quotas)},
        "developmentDiagnosticCounts": diagnostic_counts,
        "developmentSubstituteStartCounts": list(substitute_start_counts),
        "roleCommitments": role_commitments,
        "splitCommitmentSha256": split_commitment,
        "descriptorSummaries": {role: role_summary(by_role[role]) for role in ROLE_ORDER},
        "privateArtifacts": {},
        "interpretation": (
            "This is an outcome-blind role commitment. Family identities remain in separate private manifests. "
            "Training and development commands must never read the test or reserve manifest."
        ),
    }
    return public, private_payloads, f"{salt.hex()}\n"


def json_bytes(value: dict[str, Any]) -> bytes:
    return (json.dumps(value, sort_keys=True, indent=2, ensure_ascii=True) + "\n").encode("utf-8")


def write_private_exclusive(path: Path, payload: bytes) -> None:
    descriptor = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(descriptor, "wb") as handle:
        handle.write(payload)
        handle.flush()
        os.fsync(handle.fileno())


def write_new_artifacts(
    public_path: Path,
    private_root: Path,
    public: dict[str, Any],
    private_payloads: dict[str, dict[str, Any]],
    salt_text: str,
) -> dict[str, Any]:
    private_root.mkdir(parents=True, mode=0o700, exist_ok=False)
    os.chmod(private_root, 0o700)
    salt_path = private_root / "split-salt.hex"
    write_private_exclusive(salt_path, salt_text.encode("ascii"))
    private_descriptors: dict[str, Any] = {
        "salt": {"file": salt_path.name, "bytes": salt_path.stat().st_size, "sha256": sha256_file(salt_path)},
    }
    for role in ROLE_ORDER:
        path = private_root / f"{role}-families.json"
        write_private_exclusive(path, json_bytes(private_payloads[role]))
        private_descriptors[role] = {"file": path.name, "bytes": path.stat().st_size, "sha256": sha256_file(path)}
    final_public = dict(public)
    final_public["privateArtifacts"] = private_descriptors
    public_path.parent.mkdir(parents=True, exist_ok=True)
    with public_path.open("x", encoding="utf-8") as handle:
        handle.write(json.dumps(final_public, sort_keys=True, indent=2, ensure_ascii=True) + "\n")
    return final_public


def verify_existing(
    public_path: Path,
    private_root: Path,
    public: dict[str, Any],
    private_payloads: dict[str, dict[str, Any]],
    salt_text: str,
) -> dict[str, Any]:
    expected_descriptors: dict[str, Any] = {}
    expected_files = {"salt": (private_root / "split-salt.hex", salt_text.encode("ascii"))}
    expected_files.update({role: (private_root / f"{role}-families.json", json_bytes(private_payloads[role])) for role in ROLE_ORDER})
    for label, (path, expected_bytes) in expected_files.items():
        if path.read_bytes() != expected_bytes:
            raise ValueError(f"Private split artifact does not reproduce exactly: {path}")
        if path.stat().st_mode & 0o077:
            raise ValueError(f"Private split artifact permissions are too broad: {path}")
        expected_descriptors[label] = {"file": path.name, "bytes": len(expected_bytes), "sha256": sha256_file(path)}
    expected_public = dict(public)
    expected_public["privateArtifacts"] = expected_descriptors
    if load_object(public_path) != expected_public:
        raise ValueError(f"Public family-role commitment does not reproduce exactly: {public_path}")
    return expected_public


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--supported-population", type=Path, required=True)
    parser.add_argument("--catalog", type=Path, required=True)
    parser.add_argument("--public-output", type=Path, required=True)
    parser.add_argument("--private-root", type=Path, required=True)
    parser.add_argument("--candidate-assignments", type=int, default=DEFAULT_CANDIDATE_ASSIGNMENTS)
    parser.add_argument("--verify-existing", action="store_true")
    args = parser.parse_args()
    private_root = args.private_root.resolve()
    if args.verify_existing:
        salt_path = private_root / "split-salt.hex"
        salt_text = salt_path.read_text(encoding="ascii")
        try:
            salt = bytes.fromhex(salt_text.strip())
        except ValueError as error:
            raise ValueError("Existing split salt is not valid hexadecimal") from error
    else:
        salt = secrets.token_bytes(32)
        salt_text = f"{salt.hex()}\n"
    public, private_payloads, expected_salt_text = build_artifacts(
        args.supported_population.resolve(),
        args.catalog.resolve(),
        salt,
        candidate_count=args.candidate_assignments,
    )
    if salt_text != expected_salt_text:
        raise ValueError("Split salt serialization is not canonical")
    if args.verify_existing:
        final_public = verify_existing(args.public_output.resolve(), private_root, public, private_payloads, salt_text)
    else:
        final_public = write_new_artifacts(args.public_output.resolve(), private_root, public, private_payloads, salt_text)
    print(json.dumps({
        "publicArtifact": str(args.public_output.resolve()),
        "sourcePopulationCommitmentSha256": final_public["sourcePopulationCommitmentSha256"],
        "splitCommitmentSha256": final_public["splitCommitmentSha256"],
        "roleCounts": final_public["roleCounts"],
        "identitiesPrivate": True,
        "verifiedExisting": args.verify_existing,
    }, sort_keys=True, indent=2))


if __name__ == "__main__":
    main()
