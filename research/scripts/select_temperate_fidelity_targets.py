#!/usr/bin/env python3
"""Freeze an outcome-blind Temperate subset of an existing fidelity target."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
from pathlib import Path
from typing import Any


STATUS = "ROLE_BLIND_FIDELITY_SCREEN_TARGETS_NOT_A_SPLIT"
SELECTION_POLICY = (
    "Retain every ordered source-target record whose exact representative map "
    "declares Theater=TEMPERATE in its [Map] section; do not inspect simulator "
    "compatibility, dataset role, policy identity, or gameplay outcome."
)
SHA256 = re.compile(r"^[0-9a-f]{64}$")


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


def representative_theater(path: Path) -> str:
    section: str | None = None
    values: list[str] = []
    for raw_line in path.read_bytes().decode("latin-1").splitlines():
        line = raw_line.strip()
        if not line or line.startswith(";"):
            continue
        section_match = re.fullmatch(r"\[([^]]+)\]", line)
        if section_match:
            section = section_match.group(1).strip().casefold()
            continue
        if section != "map" or "=" not in line:
            continue
        key, raw_value = line.split("=", 1)
        if key.strip().casefold() == "theater":
            values.append(raw_value.split(";", 1)[0].strip().upper())
    if len(values) != 1 or not values[0]:
        raise ValueError(f"Representative must declare exactly one nonempty [Map] Theater: {path}")
    return values[0]


def build_artifact(repo_root: Path, source_path: Path, expected_count: int) -> dict[str, Any]:
    source = json.loads(source_path.read_text(encoding="utf-8"))
    if (
        source.get("status") != STATUS
        or source.get("outcomeBlind") is not True
        or source.get("roleBlind") is not True
        or source.get("finalSplit") is not False
        or source.get("isSplit") is not False
    ):
        raise ValueError("Source target is not the required role/outcome-blind unsplit artifact")
    records = source.get("targets")
    if not isinstance(records, list) or source.get("targetCount") != len(records):
        raise ValueError("Source target count is inconsistent")
    if source.get("populationCommitmentSha256") != canonical_sha256(records):
        raise ValueError("Source target population commitment is invalid")

    selected: list[dict[str, Any]] = []
    seen_ids: set[str] = set()
    for index, record in enumerate(records):
        if not isinstance(record, dict) or set(record) != {"familyId", "representative"}:
            raise ValueError(f"Source target {index} has an invalid schema")
        family_id = record["familyId"]
        representative = record["representative"]
        if (
            not isinstance(family_id, str)
            or not family_id
            or family_id in seen_ids
            or not isinstance(representative, dict)
            or set(representative) != {"path", "sha256"}
            or not isinstance(representative["path"], str)
            or not SHA256.fullmatch(str(representative["sha256"]))
        ):
            raise ValueError(f"Source target {index} has invalid identity or representative fields")
        seen_ids.add(family_id)
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
        if representative_theater(map_path) == "TEMPERATE":
            selected.append(record)

    if len(selected) != expected_count:
        raise ValueError(f"Selected {len(selected)} Temperate targets, expected {expected_count}")
    return {
        "schemaVersion": 3,
        "status": STATUS,
        "outcomeBlind": True,
        "roleBlind": True,
        "finalSplit": False,
        "isSplit": False,
        "catalogSha256": source["catalogSha256"],
        "sourceTargetManifestSha256": sha256_file(source_path),
        "sourceTargetPopulationCommitmentSha256": source["populationCommitmentSha256"],
        "selectionTheater": "TEMPERATE",
        "selectionPolicy": SELECTION_POLICY,
        "selectionPolicySha256": hashlib.sha256(SELECTION_POLICY.encode("utf-8")).hexdigest(),
        "inclusionPolicy": SELECTION_POLICY,
        "representativeFidelityPolicy": source["representativeFidelityPolicy"],
        "populationCommitmentRule": source["populationCommitmentRule"],
        "populationCommitmentSha256": canonical_sha256(selected),
        "targetCount": len(selected),
        "targets": selected,
    }


def write_exclusive(path: Path, value: dict[str, Any]) -> None:
    payload = json.dumps(value, sort_keys=True, indent=2, ensure_ascii=True) + "\n"
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("x", encoding="utf-8") as handle:
        handle.write(payload)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo-root", type=Path, required=True)
    parser.add_argument("--source-targets", type=Path, required=True)
    parser.add_argument("--expected-count", type=int, default=67)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    repo_root = args.repo_root.resolve()
    source_path = args.source_targets.resolve()
    artifact = build_artifact(repo_root, source_path, args.expected_count)
    write_exclusive(args.output.resolve(), artifact)
    print(json.dumps({
        "artifact": str(args.output.resolve()),
        "populationCommitmentSha256": artifact["populationCommitmentSha256"],
        "targetCount": artifact["targetCount"],
    }, sort_keys=True, indent=2))


if __name__ == "__main__":
    main()
