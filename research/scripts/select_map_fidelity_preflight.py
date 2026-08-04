#!/usr/bin/env python3
"""Generate the outcome-free expanded map-compatibility preflight plan."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
from typing import Any


SCHEMA_VERSION = 1
ARTIFACT_KIND = "role_blind_expanded_map_compatibility_preflight_plan"

# These anchors are explicit rather than disguised as random draws. They were
# chosen without policy outcomes to make the infrastructure preflight exercise
# one distinct representative for every observed theater and start count. The
# full screen still covers all 127 families, so these identities have no
# inclusion or exclusion effect on the scientific population.
TECHNICAL_ANCHORS: tuple[tuple[str, str | int, str], ...] = (
    ("theater", "DESERT", "mf_redvalley"),
    ("theater", "SNOW", "mf_mp12s4"),
    ("theater", "TEMPERATE", "mf_mp24du"),
    ("theater", "URBAN", "mf_potomac"),
    ("start_count", 2, "mf_mp06mw"),
    ("start_count", 3, "mf_killer"),
    ("start_count", 4, "mf_parksidegardens"),
    ("start_count", 6, "mf_isleland"),
    ("start_count", 8, "mf_powdrkeg"),
)


def canonical_sha256(value: Any) -> str:
    payload = json.dumps(
        value,
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=True,
    ).encode("utf-8")
    return hashlib.sha256(payload).hexdigest()


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def load_object(path: Path) -> dict[str, Any]:
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise ValueError(f"Expected a JSON object in {path}")
    return value


def _strict_target_records(targets: dict[str, Any]) -> list[dict[str, Any]]:
    if (
        targets.get("outcomeBlind") is not True
        or targets.get("roleBlind") is not True
        or targets.get("isSplit") is not False
        or targets.get("finalSplit") is not False
    ):
        raise ValueError("Target population is not the frozen outcome/role-blind non-split")
    records = targets.get("targets")
    if not isinstance(records, list) or targets.get("targetCount") != len(records):
        raise ValueError("Target population count/list is invalid")
    seen: set[str] = set()
    for index, record in enumerate(records):
        if not isinstance(record, dict) or set(record) != {"familyId", "representative"}:
            raise ValueError(f"Target {index} schema is invalid")
        family_id = record["familyId"]
        representative = record["representative"]
        if (
            not isinstance(family_id, str)
            or not family_id
            or family_id in seen
            or not isinstance(representative, dict)
            or set(representative) != {"path", "sha256"}
            or not isinstance(representative["path"], str)
            or not isinstance(representative["sha256"], str)
        ):
            raise ValueError(f"Target {index} identity/representative is invalid")
        seen.add(family_id)
    if targets.get("populationCommitmentSha256") != canonical_sha256(records):
        raise ValueError("Target population commitment is invalid")
    return records


def _representative_rows(
    catalog: dict[str, Any], target_records: list[dict[str, Any]]
) -> dict[str, dict[str, Any]]:
    if catalog.get("outcomeBlind") is not True or int(catalog.get("schemaVersion", 0)) < 2:
        raise ValueError("Catalog is not outcome-blind schema 2+")
    maps = catalog.get("maps")
    if not isinstance(maps, list):
        raise ValueError("Catalog maps list is absent")
    maps_by_path = {
        row.get("path"): row
        for row in maps
        if isinstance(row, dict) and isinstance(row.get("path"), str)
    }
    rows: dict[str, dict[str, Any]] = {}
    for target in target_records:
        family_id = target["familyId"]
        representative = target["representative"]
        row = maps_by_path.get(representative["path"])
        if (
            not isinstance(row, dict)
            or row.get("familyId") != family_id
            or row.get("sha256") != representative["sha256"]
        ):
            raise ValueError(f"Catalog/target representative mismatch for {family_id}")
        descriptors = row.get("descriptors")
        size = descriptors.get("size") if isinstance(descriptors, dict) else None
        theater = descriptors.get("theater") if isinstance(descriptors, dict) else None
        start_count = descriptors.get("startCount") if isinstance(descriptors, dict) else None
        width = size.get("width") if isinstance(size, dict) else None
        height = size.get("height") if isinstance(size, dict) else None
        byte_count = row.get("bytes")
        numeric = (start_count, width, height, byte_count)
        if (
            not isinstance(theater, str)
            or any(isinstance(value, bool) or not isinstance(value, int) or value <= 0 for value in numeric)
        ):
            raise ValueError(f"Required safe descriptors are invalid for {family_id}")
        rows[family_id] = {
            "familyId": family_id,
            "representative": dict(representative),
            "theater": theater,
            "startCount": start_count,
            "mapArea": width * height,
            "bytes": byte_count,
        }
    return rows


def _anchor_trace(rows: dict[str, dict[str, Any]]) -> list[dict[str, Any]]:
    trace: list[dict[str, Any]] = []
    for axis, value, family_id in TECHNICAL_ANCHORS:
        row = rows.get(family_id)
        if row is None:
            raise ValueError(f"Technical anchor is outside the target population: {family_id}")
        observed = row["theater"] if axis == "theater" else row["startCount"]
        if observed != value:
            raise ValueError(
                f"Technical anchor drift for {axis}={value}: {family_id} has {observed}"
            )
        trace.append({
            "axis": axis,
            "value": value,
            "familyId": family_id,
            "selectionMethod": "explicit_outcome_free_technical_anchor",
        })
    return trace


def _extrema_trace(rows: dict[str, dict[str, Any]]) -> list[dict[str, Any]]:
    ordered = list(rows.values())
    minimum_area = min(ordered, key=lambda row: (row["mapArea"], row["familyId"]))
    minimum_bytes = min(ordered, key=lambda row: (row["bytes"], row["familyId"]))
    maximum_area = min(ordered, key=lambda row: (-row["mapArea"], row["familyId"]))
    maximum_bytes = min(ordered, key=lambda row: (-row["bytes"], row["familyId"]))
    if minimum_area["familyId"] != minimum_bytes["familyId"]:
        raise ValueError("Current minimum-area and minimum-byte families no longer coincide")
    if maximum_area["familyId"] != maximum_bytes["familyId"]:
        raise ValueError("Current maximum-area and maximum-byte families no longer coincide")
    return [
        {
            "axis": "global_extrema",
            "value": ["minimum_map_area", "minimum_representative_bytes"],
            "familyId": minimum_area["familyId"],
            "selectionMethod": "deterministic_extremum_then_family_id_ascending",
        },
        {
            "axis": "global_extrema",
            "value": ["maximum_map_area", "maximum_representative_bytes"],
            "familyId": maximum_area["familyId"],
            "selectionMethod": "deterministic_extremum_then_family_id_ascending",
        },
    ]


def build_plan(
    catalog: dict[str, Any],
    targets: dict[str, Any],
    *,
    catalog_sha256: str,
    target_manifest_sha256: str,
) -> dict[str, Any]:
    target_records = _strict_target_records(targets)
    if targets.get("catalogSha256") != catalog_sha256:
        raise ValueError("Target population does not bind the supplied catalog")
    rows = _representative_rows(catalog, target_records)
    trace = [*_anchor_trace(rows), *_extrema_trace(rows)]
    family_ids = [record["familyId"] for record in trace]
    if len(family_ids) != 11 or len(set(family_ids)) != len(family_ids):
        raise ValueError("Expanded preflight must resolve to exactly 11 distinct families")

    selected = []
    for ordinal, record in enumerate(trace):
        row = rows[record["familyId"]]
        selected.append({
            "preflightOrdinal": ordinal,
            "familyId": row["familyId"],
            "representative": row["representative"],
            "coverage": {"axis": record["axis"], "value": record["value"]},
            "safeDescriptors": {
                "theater": row["theater"],
                "startCount": row["startCount"],
                "mapArea": row["mapArea"],
                "bytes": row["bytes"],
            },
        })

    selection_policy = {
        "version": "expanded-map-compatibility-preflight-v2",
        "axisOrder": ["theater", "start_count", "global_extrema"],
        "anchorPolicy": (
            "Explicit distinct outcome-free technical anchors exercise each observed "
            "theater and start count; identities do not alter the full 127-family population."
        ),
        "extremaPolicy": (
            "Across the immutable target representatives, select global minimum and "
            "maximum map area and byte count, tie-breaking by familyId ascending."
        ),
        "trace": trace,
    }
    selected_commitment = [
        {"familyId": record["familyId"], "representative": record["representative"]}
        for record in selected
    ]
    return {
        "schemaVersion": SCHEMA_VERSION,
        "artifactKind": ARTIFACT_KIND,
        "status": "FROZEN_ROLE_BLIND_TECHNICAL_PREFLIGHT_NOT_CLEARANCE",
        "outcomeBlind": True,
        "roleBlind": True,
        "isSplit": False,
        "notPolicyEvidence": True,
        "catalogSha256": catalog_sha256,
        "targetManifestSha256": target_manifest_sha256,
        "targetPopulationCommitmentSha256": targets["populationCommitmentSha256"],
        "targetPopulationFamilyCount": len(target_records),
        "selectionPolicy": selection_policy,
        "selectionPolicySha256": canonical_sha256(selection_policy),
        "selectedFamilyCount": len(selected),
        "selectedCommitmentSha256": canonical_sha256(selected_commitment),
        "selected": selected,
        "interpretation": (
            "This plan selects outcome-free infrastructure stress cases only. A family "
            "pass, review, or fail is not a StrongBot result, a split assignment, or "
            "clearance for unscreened families."
        ),
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--catalog", type=Path, required=True)
    parser.add_argument("--targets", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    catalog = load_object(args.catalog)
    targets = load_object(args.targets)
    plan = build_plan(
        catalog,
        targets,
        catalog_sha256=sha256_file(args.catalog),
        target_manifest_sha256=sha256_file(args.targets),
    )
    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open("x", encoding="utf-8") as handle:
        json.dump(plan, handle, indent=2, sort_keys=True)
        handle.write("\n")
    print(json.dumps({
        "artifact": str(args.output),
        "selectedFamilyCount": plan["selectedFamilyCount"],
        "selectedCommitmentSha256": plan["selectedCommitmentSha256"],
    }, sort_keys=True))


if __name__ == "__main__":
    main()
