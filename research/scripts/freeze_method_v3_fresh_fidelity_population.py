#!/usr/bin/env python3
"""Freeze the role-blind method-v3 fresh-map fidelity population.

This utility performs no gameplay and assigns no train, development, or test
roles.  It converts the conservatively screened external-source catalog into
the exact repository-relative paths used by Chrono Divide, optionally
materializes the already acquired bytes, and emits the catalog-bound target
manifest consumed by the passive map-fidelity gate.
"""

from __future__ import annotations

import argparse
import copy
import hashlib
import json
import os
import re
from pathlib import Path
from typing import Any


SCHEMA_VERSION = 1
STATUS = "ROLE_BLIND_FIDELITY_SCREEN_TARGETS_NOT_A_SPLIT"
EXPECTED_SOURCE_CATALOG_SHA256 = (
    "4b377c7afb1e0586d415dc911262e405091de468e0bb067ea46a53313a073ece"
)
EXPECTED_RAW_SNAPSHOT_SHA256 = (
    "23cbe12b612229b35133e1b7ac429514faa476cc739673e395402405451f222e"
)
EXPECTED_SOURCE_POPULATION_COMMITMENT_SHA256 = (
    "c1133e73a5815abf3961b4fc7a947f916b987ca4feaae25caa92b3a1c72e4f2d"
)
EXPECTED_CONSERVATIVE_DEDUP_COMMITMENT_SHA256 = (
    "64288ef13cc616f14f9482cb3da35a1b956d57e32e5a3417949e4017f1a0608e"
)
EXPECTED_FAMILY_COUNT = 66
SOURCE_BASENAME = re.compile(r"^fresh_([0-9a-f]{40})\.map$")
DESTINATION_DIRECTORY = "packages/chronodivide-bot-driver/data"


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


def safe_repo_path(repo_root: Path, relative: str) -> Path:
    candidate = Path(relative)
    if candidate.is_absolute() or ".." in candidate.parts:
        raise ValueError(f"Repository-relative path is unsafe: {relative}")
    resolved = (repo_root / candidate).resolve()
    try:
        resolved.relative_to(repo_root.resolve())
    except ValueError as error:
        raise ValueError(f"Repository-relative path escapes the repository: {relative}") from error
    return resolved


def validate_source_catalog(
    repo_root: Path,
    source_catalog_path: Path,
    expected_count: int,
    expected_source_sha256: str,
) -> tuple[dict[str, Any], dict[str, dict[str, Any]], dict[str, dict[str, Any]]]:
    if sha256_file(source_catalog_path) != expected_source_sha256:
        raise ValueError("Fresh source catalog SHA-256 differs from the frozen commitment")
    catalog = read_json(source_catalog_path)
    families = catalog.get("families")
    maps = catalog.get("maps")
    if (
        catalog.get("schemaVersion") != 2
        or catalog.get("outcomeBlind") is not True
        or not isinstance(families, list)
        or not isinstance(maps, list)
        or len(families) != expected_count
        or len(maps) != expected_count
    ):
        raise ValueError("Fresh source catalog identity or population size is invalid")

    family_by_id: dict[str, dict[str, Any]] = {}
    map_by_path: dict[str, dict[str, Any]] = {}
    for index, raw in enumerate(maps):
        if not isinstance(raw, dict):
            raise ValueError(f"Fresh source map {index} is not an object")
        family_id = raw.get("familyId")
        relative = raw.get("path")
        digest = raw.get("sha256")
        if (
            not isinstance(family_id, str)
            or not family_id
            or not isinstance(relative, str)
            or not re.fullmatch(r"[0-9a-f]{64}", str(digest))
            or relative in map_by_path
        ):
            raise ValueError(f"Fresh source map {index} has invalid identity fields")
        source_path = safe_repo_path(repo_root, relative)
        if (
            not source_path.is_file()
            or source_path.stat().st_size != raw.get("bytes")
            or sha256_file(source_path) != digest
        ):
            raise ValueError(f"Fresh source map bytes differ: {relative}")
        match = SOURCE_BASENAME.fullmatch(source_path.name)
        if match is None or hashlib.sha1(source_path.read_bytes()).hexdigest() != match.group(1):
            raise ValueError(f"Fresh source map filename is not bound to its content SHA-1: {relative}")
        map_by_path[relative] = raw

    for index, raw in enumerate(families):
        if not isinstance(raw, dict):
            raise ValueError(f"Fresh source family {index} is not an object")
        family_id = raw.get("familyId")
        paths = raw.get("mapPaths")
        eligibility = raw.get("evidenceBasedDevelopmentEligibility")
        if (
            not isinstance(family_id, str)
            or not family_id
            or family_id in family_by_id
            or not isinstance(paths, list)
            or len(paths) != 1
            or not isinstance(eligibility, dict)
            or eligibility.get("eligible") is not True
        ):
            raise ValueError(f"Fresh source family {index} is not one unique eligible family")
        map_row = map_by_path.get(str(paths[0]))
        if map_row is None or map_row.get("familyId") != family_id:
            raise ValueError(f"Fresh source family-to-map binding differs for {family_id}")
        family_by_id[family_id] = raw

    if len(family_by_id) != expected_count or len({str(row["sha256"]) for row in maps}) != expected_count:
        raise ValueError("Fresh source families or exact map contents are duplicated")
    return catalog, family_by_id, map_by_path


def destination_relative(source_basename: str, destination_directory: str) -> str:
    match = SOURCE_BASENAME.fullmatch(source_basename)
    if match is None:
        raise ValueError(f"Unexpected fresh source basename: {source_basename}")
    return f"{destination_directory}/method_v3_fresh_{match.group(1)}.map"


def build_artifacts(
    repo_root: Path,
    source_catalog_path: Path,
    *,
    expected_count: int = EXPECTED_FAMILY_COUNT,
    expected_source_sha256: str = EXPECTED_SOURCE_CATALOG_SHA256,
    destination_directory: str = DESTINATION_DIRECTORY,
    materialize: bool = False,
) -> tuple[dict[str, Any], dict[str, Any]]:
    source, _, source_maps = validate_source_catalog(
        repo_root,
        source_catalog_path,
        expected_count,
        expected_source_sha256,
    )
    catalog = copy.deepcopy(source)
    path_rewrites: dict[str, str] = {}
    for source_relative in source_maps:
        path_rewrites[source_relative] = destination_relative(
            Path(source_relative).name,
            destination_directory,
        )

    for row in catalog["maps"]:
        source_relative = str(row["path"])
        target_relative = path_rewrites[source_relative]
        row["path"] = target_relative
        row["basename"] = Path(target_relative).name
        if materialize:
            source_path = safe_repo_path(repo_root, source_relative)
            target_path = safe_repo_path(repo_root, target_relative)
            target_path.parent.mkdir(parents=True, exist_ok=True)
            payload = source_path.read_bytes()
            if target_path.exists():
                if not target_path.is_file() or target_path.read_bytes() != payload:
                    raise FileExistsError(f"Refusing to replace different destination bytes: {target_path}")
            else:
                descriptor = os.open(target_path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
                with os.fdopen(descriptor, "wb") as handle:
                    handle.write(payload)
                    handle.flush()
                    os.fsync(handle.fileno())

    for family in catalog["families"]:
        family["mapPaths"] = [path_rewrites[str(item)] for item in family["mapPaths"]]

    catalog["methodV3FreshPopulationProvenance"] = {
        "schemaVersion": SCHEMA_VERSION,
        "status": "FROZEN_OUTCOME_BLIND_EXTERNAL_MAP_POPULATION_BEFORE_COMPATIBILITY",
        "source": "CnC Map Archive public YR download endpoint",
        "sourceCatalogSha256": expected_source_sha256,
        "rawSourceSnapshotSha256": EXPECTED_RAW_SNAPSHOT_SHA256,
        "rawSourcePopulationCommitmentSha256": EXPECTED_SOURCE_POPULATION_COMMITMENT_SHA256,
        "conservativeDeduplicatedContentCommitmentSha256": EXPECTED_CONSERVATIVE_DEDUP_COMMITMENT_SHA256,
        "familyCount": expected_count,
        "materializationRule": (
            "Rewrite fresh_<content-sha1>.map to the committed driver-data path "
            "method_v3_fresh_<content-sha1>.map without changing bytes."
        ),
        "outcomeAccess": "none",
        "roleAssignment": "none",
    }
    catalog_sha256 = hashlib.sha256(
        (json.dumps(catalog, indent=2) + "\n").encode("utf-8")
    ).hexdigest()
    maps_by_family = {str(row["familyId"]): row for row in catalog["maps"]}
    targets = [
        {
            "familyId": family_id,
            "representative": {
                "path": str(maps_by_family[family_id]["path"]),
                "sha256": str(maps_by_family[family_id]["sha256"]),
            },
        }
        for family_id in sorted(maps_by_family)
    ]
    target_artifact = {
        "schemaVersion": 3,
        "status": STATUS,
        "outcomeBlind": True,
        "roleBlind": True,
        "finalSplit": False,
        "isSplit": False,
        "catalogSha256": catalog_sha256,
        "inclusionPolicy": (
            "Include all 66 conservatively screened and title-deduplicated fresh Temperate "
            "families before engine compatibility; do not inspect policy behavior or outcome."
        ),
        "representativeFidelityPolicy": (
            "Screen the sole exact SHA-256-bound map content in each fresh family."
        ),
        "populationCommitmentRule": (
            "SHA-256 of canonical JSON for the ordered target list containing only "
            "familyId and representative path/SHA-256."
        ),
        "populationCommitmentSha256": canonical_sha256(targets),
        "targetCount": len(targets),
        "targets": targets,
    }
    return catalog, target_artifact


def render_json(value: dict[str, Any]) -> bytes:
    return (json.dumps(value, indent=2) + "\n").encode("utf-8")


def write_or_verify(path: Path, value: dict[str, Any], verify_existing: bool) -> None:
    payload = render_json(value)
    if verify_existing:
        if path.read_bytes() != payload:
            raise ValueError(f"Existing artifact does not reproduce exactly: {path}")
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    descriptor = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o644)
    with os.fdopen(descriptor, "wb") as handle:
        handle.write(payload)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo-root", type=Path, required=True)
    parser.add_argument("--source-catalog", type=Path, required=True)
    parser.add_argument("--catalog-output", type=Path, required=True)
    parser.add_argument("--targets-output", type=Path, required=True)
    parser.add_argument("--expected-count", type=int, default=EXPECTED_FAMILY_COUNT)
    parser.add_argument(
        "--expected-source-catalog-sha256",
        default=EXPECTED_SOURCE_CATALOG_SHA256,
    )
    parser.add_argument("--materialize", action="store_true")
    parser.add_argument("--verify-existing", action="store_true")
    args = parser.parse_args()
    repo_root = args.repo_root.resolve()
    catalog, targets = build_artifacts(
        repo_root,
        args.source_catalog.resolve(),
        expected_count=args.expected_count,
        expected_source_sha256=args.expected_source_catalog_sha256,
        materialize=args.materialize,
    )
    write_or_verify(args.catalog_output.resolve(), catalog, args.verify_existing)
    write_or_verify(args.targets_output.resolve(), targets, args.verify_existing)
    print(json.dumps({
        "catalogOutput": str(args.catalog_output.resolve()),
        "catalogSha256": sha256_file(args.catalog_output.resolve()),
        "targetsOutput": str(args.targets_output.resolve()),
        "targetPopulationCommitmentSha256": targets["populationCommitmentSha256"],
        "targetCount": targets["targetCount"],
        "materialized": args.materialize,
        "verifiedExisting": args.verify_existing,
        "rolesAssigned": 0,
        "outcomesAccessed": 0,
    }, sort_keys=True, indent=2))


if __name__ == "__main__":
    main()
