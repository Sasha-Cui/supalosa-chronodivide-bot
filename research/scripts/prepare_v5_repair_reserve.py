#!/usr/bin/env python3
"""Freeze, retrieve, and byte-screen the outcome-blind V5 repair reserve."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import subprocess
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any


SCHEMA_VERSION = 1
EXPECTED_TAIL_RECORDS = 71
EXPECTED_RESERVE_FAMILIES = 70
EXPECTED_INPUT_SHA256 = {
    "snapshot.json": "23cbe12b612229b35133e1b7ac429514faa476cc739673e395402405451f222e",
    "selection.json": "c5c7371621f5d3b5fbc0cbe128096fc4d1af895fe0bb68fab1d86a6da8af2cca",
    "selection-block-b.json": "619b70a6205dbad6551a9b20a60d2e8893bed779cdf1a060ba91f3014f877bd9",
    "selection-block-c.json": "19f3eb83479b27eb7b56026d305a7e59e0a9f2307ad28ff5adc6d1b0f6eb7dbd",
    "selection-block-d.json": "a6402b1c28071d6bd9dcb67912042a6b86192d83c6c7ea6cd95de4f6d9483326",
}
EXPECTED_RULES_INI_SHA256 = "fd1e95cea0306ea78049dc81c8cd816e18c28c496872a1ff02edd50bd082062f"

SCRIPT_SECTIONS = {
    "triggers", "tags", "events", "actions", "celltags", "teamtypes",
    "taskforces", "scripttypes", "aitriggertypes", "ai",
}
CORE_SECTIONS = {
    "basic", "header", "map", "waypoints", "preview", "previewpack",
    "isomappack5", "overlaydatapack", "overlaypack", "terrain", "smudge",
    "structures", "units", "infantry", "aircraft", "aircrafttypes",
    "vehicletypes", "smudgetypes", "terraintypes", "specialflags", "lighting",
    "digest", "ranking", "houses", "neutral", "special", "aitriggertypesenable",
}
HOUSE_SECTIONS = {
    "africans", "alliance", "americans", "arabs", "british", "confederation",
    "french", "germans", "russians", "gdi", "nod", "yuricountry",
}
ALLOWED_OBJECT_OWNERS = {"neutral", "neutral house"}
STANDARD_SPECIAL_FLAGS = {
    "inert": "no", "fogofwar": "no", "ionstorms": "no", "mcvdeploy": "no",
    "meteorites": "no", "visceroids": "yes", "fixedalliance": "no",
    "tiberiumgrows": "yes", "initialveteran": "no", "harvesterimmune": "no",
    "tiberiumspreads": "yes", "tiberiumexplosive": "no", "destroyablebridges": "yes",
}
HOUSE_KEYS = {
    "iq", "edge", "color", "allies", "country", "credits", "nodecount",
    "techlevel", "percentbuilt", "playercontrol", "side",
}
LAMP_NAME = re.compile(
    r"(?i)^(?:in(?:yelw|purp|blu|red|grn)l(?:amp|mp)|ingalite|neglamp|galite|tem(?:day|mor|nit)lamp)$",
)


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def canonical_sha256(value: Any) -> str:
    payload = json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=True)
    return hashlib.sha256(payload.encode()).hexdigest()


def load_json(path: Path) -> dict[str, Any]:
    value = json.loads(path.read_text())
    if not isinstance(value, dict):
        raise RuntimeError(f"JSON artifact must be an object: {path}")
    return value


def write_exclusive_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("x", encoding="utf-8") as handle:
        json.dump(value, handle, indent=2, sort_keys=True)
        handle.write("\n")


def validate_source_root(source_root: Path) -> None:
    for name, expected in EXPECTED_INPUT_SHA256.items():
        path = source_root / name
        observed = sha256_file(path)
        if observed != expected:
            raise RuntimeError(f"Frozen reserve source drifted for {name}: {observed}")


def build_reserve_selection(source_root: Path) -> dict[str, Any]:
    validate_source_root(source_root)
    source = load_json(source_root / "selection.json")
    block_d = load_json(source_root / "selection-block-d.json")
    audit_rows = source.get("audit")
    trace_rows = block_d.get("trace")
    if not isinstance(audit_rows, list) or not isinstance(trace_rows, list):
        raise RuntimeError("Frozen source selection lacks audit or Block-D trace rows")
    audit_by_sha1 = {
        row.get("sha1"): row
        for row in audit_rows
        if isinstance(row, dict) and isinstance(row.get("sha1"), str)
    }
    tail = [
        row for row in trace_rows
        if isinstance(row, dict) and row.get("decision") == "below_frozen_block_d_rank_cutoff"
    ]
    if len(tail) != EXPECTED_TAIL_RECORDS:
        raise RuntimeError(f"Expected {EXPECTED_TAIL_RECORDS} frozen tail records, observed {len(tail)}")
    joined: list[dict[str, Any]] = []
    for trace in tail:
        source_row = audit_by_sha1.get(trace.get("sha1"))
        if (
            not isinstance(source_row, dict) or source_row.get("sourceEligible") is not True or
            source_row.get("revisionNameKey") != trace.get("revisionNameKey") or
            not isinstance(source_row.get("rankSha256"), str)
        ):
            raise RuntimeError(f"Tail row is absent or ineligible: {trace!r}")
        joined.append({
            "sourceSha1": source_row["sha1"],
            "rankSha256": source_row["rankSha256"],
            "sourceName": source_row["name"],
            "revisionNameKey": source_row["revisionNameKey"],
        })
    joined.sort(key=lambda row: (row["rankSha256"], row["sourceSha1"]))
    selected: list[dict[str, Any]] = []
    seen_families: set[str] = set()
    duplicate_tail_records: list[dict[str, Any]] = []
    for row in joined:
        family = row["revisionNameKey"]
        if family in seen_families:
            duplicate_tail_records.append({**row, "reason": "later_normalized_family_revision"})
            continue
        seen_families.add(family)
        selected.append({
            "reserveOrdinal": len(selected),
            "familyId": f"mf_repair_{row['sourceSha1'][:16]}",
            **row,
        })
    if len(selected) != EXPECTED_RESERVE_FAMILIES or len(duplicate_tail_records) != 1:
        raise RuntimeError(
            f"Expected {EXPECTED_RESERVE_FAMILIES} reserve families and one duplicate tail record; "
            f"observed {len(selected)} and {len(duplicate_tail_records)}",
        )
    commitment = [
        {
            "reserveOrdinal": row["reserveOrdinal"],
            "familyId": row["familyId"],
            "sourceSha1": row["sourceSha1"],
            "rankSha256": row["rankSha256"],
            "revisionNameKey": row["revisionNameKey"],
        }
        for row in selected
    ]
    return {
        "schemaVersion": SCHEMA_VERSION,
        "kind": "progress-certified-v5-technical-repair-reserve-selection",
        "status": "FROZEN_OUTCOME_BLIND_V5_REPAIR_RESERVE_BEFORE_BYTE_RETRIEVAL",
        "outcomeBlind": True,
        "notPolicyEvidence": True,
        "sourceRoot": str(source_root.resolve()),
        "sourceInputSha256": EXPECTED_INPUT_SHA256,
        "selectionRule": (
            "Take every Block-D trace record marked below_frozen_block_d_rank_cutoff, join to the "
            "frozen source audit, order by rankSha256 then sourceSha1, and retain only the first "
            "record for each normalized revisionNameKey."
        ),
        "tailRecordCount": len(tail),
        "reserveFamilyCount": len(selected),
        "duplicateTailRecords": duplicate_tail_records,
        "populationCommitmentSha256": canonical_sha256(commitment),
        "selected": selected,
    }


def freeze(args: argparse.Namespace) -> None:
    output = build_reserve_selection(args.source_root)
    write_exclusive_json(args.output, output)
    print(json.dumps({
        "output": str(args.output.resolve()),
        "sha256": sha256_file(args.output),
        "reserveFamilyCount": output["reserveFamilyCount"],
        "populationCommitmentSha256": output["populationCommitmentSha256"],
    }, sort_keys=True))


def validate_selection(value: dict[str, Any]) -> list[dict[str, Any]]:
    selected = value.get("selected")
    if (
        value.get("schemaVersion") != SCHEMA_VERSION or
        value.get("kind") != "progress-certified-v5-technical-repair-reserve-selection" or
        value.get("status") != "FROZEN_OUTCOME_BLIND_V5_REPAIR_RESERVE_BEFORE_BYTE_RETRIEVAL" or
        value.get("outcomeBlind") is not True or value.get("notPolicyEvidence") is not True or
        value.get("tailRecordCount") != EXPECTED_TAIL_RECORDS or
        value.get("reserveFamilyCount") != EXPECTED_RESERVE_FAMILIES or
        not isinstance(selected, list) or len(selected) != EXPECTED_RESERVE_FAMILIES
    ):
        raise RuntimeError("Reserve selection has an invalid frozen schema")
    commitment = []
    for ordinal, row in enumerate(selected):
        if (
            not isinstance(row, dict) or row.get("reserveOrdinal") != ordinal or
            not isinstance(row.get("sourceSha1"), str) or
            re.fullmatch(r"[0-9a-f]{40}", row["sourceSha1"]) is None or
            not isinstance(row.get("rankSha256"), str) or
            re.fullmatch(r"[0-9a-f]{64}", row["rankSha256"]) is None or
            row.get("familyId") != f"mf_repair_{row['sourceSha1'][:16]}" or
            not isinstance(row.get("revisionNameKey"), str)
        ):
            raise RuntimeError(f"Reserve selection row {ordinal} is malformed")
        commitment.append({
            "reserveOrdinal": ordinal,
            "familyId": row["familyId"],
            "sourceSha1": row["sourceSha1"],
            "rankSha256": row["rankSha256"],
            "revisionNameKey": row["revisionNameKey"],
        })
    if canonical_sha256(commitment) != value.get("populationCommitmentSha256"):
        raise RuntimeError("Reserve selection population commitment drifted")
    return selected


def download(args: argparse.Namespace) -> None:
    selection = load_json(args.selection)
    selected = validate_selection(selection)
    args.map_root.mkdir(parents=True, exist_ok=True)
    rows = []
    for row in selected:
        sha1 = row["sourceSha1"]
        output = args.map_root / f"{sha1}.map"
        temporary = args.map_root / f".{sha1}.download"
        if not output.exists():
            if temporary.exists():
                temporary.unlink()
            curl_command = [
                args.curl, "-L", "--fail", "--silent", "--show-error", "--max-time", "60",
                "--retry", "3",
            ]
            if args.curl_resolve is not None:
                curl_command.extend(["--resolve", args.curl_resolve])
            curl_command.extend([
                f"https://cncmaparchive.org/download/YR/{sha1}", "-o", str(temporary),
            ])
            subprocess.run(curl_command, check=True)
            if hashlib.sha1(temporary.read_bytes()).hexdigest() != sha1:
                raise RuntimeError(f"Downloaded reserve bytes do not match source SHA-1 {sha1}")
            temporary.replace(output)
        raw = output.read_bytes()
        if hashlib.sha1(raw).hexdigest() != sha1:
            raise RuntimeError(f"Existing reserve bytes do not match source SHA-1 {sha1}")
        rows.append({
            "reserveOrdinal": row["reserveOrdinal"],
            "familyId": row["familyId"],
            "sourceSha1": sha1,
            "path": str(output.resolve()),
            "bytes": len(raw),
            "sha256": hashlib.sha256(raw).hexdigest(),
        })
    manifest = {
        "schemaVersion": SCHEMA_VERSION,
        "kind": "progress-certified-v5-technical-repair-reserve-download",
        "status": "COMPLETE_OUTCOME_BLIND_V5_REPAIR_RESERVE_DOWNLOAD",
        "outcomeBlind": True,
        "notPolicyEvidence": True,
        "selectionPath": str(args.selection.resolve()),
        "selectionSha256": sha256_file(args.selection),
        "selectionPopulationCommitmentSha256": selection["populationCommitmentSha256"],
        "transport": {
            "urlHost": "cncmaparchive.org",
            "curlResolve": args.curl_resolve,
            "note": (
                "A curl DNS override affects transport only; every retrieved object is still "
                "authenticated against its prospectively frozen source SHA-1."
            ),
        },
        "mapCount": len(rows),
        "mapCommitmentSha256": canonical_sha256(rows),
        "maps": rows,
    }
    write_exclusive_json(args.output, manifest)
    print(json.dumps({
        "output": str(args.output.resolve()),
        "sha256": sha256_file(args.output),
        "mapCount": len(rows),
        "mapCommitmentSha256": manifest["mapCommitmentSha256"],
    }, sort_keys=True))


def parse_sections(path: Path) -> tuple[dict[str, list[tuple[str, str]]], list[str]]:
    sections: dict[str, list[tuple[str, str]]] = defaultdict(list)
    original_names: list[str] = []
    current = ""
    for raw in path.read_text(encoding="latin1", errors="strict").splitlines():
        line = raw.strip()
        match = re.fullmatch(r"\[([^]]+)]", line)
        if match:
            original = match.group(1).strip()
            current = original.lower()
            original_names.append(original)
        elif current and line and not line.startswith((";", "#")) and "=" in line:
            key, value = line.split("=", 1)
            sections[current].append((key.strip(), value.strip()))
    return sections, original_names


def values(entries: list[tuple[str, str]]) -> dict[str, str]:
    return {key.lower(): value for key, value in entries}


def int_value(value: str | None) -> int | None:
    try:
        return int(str(value).strip())
    except (TypeError, ValueError):
        return None


def load_ra2_object_names(rules_ini: Path) -> dict[str, set[str]]:
    if sha256_file(rules_ini) != EXPECTED_RULES_INI_SHA256:
        raise RuntimeError("Pinned RA2 rules.ini drifted")
    sections, _ = parse_sections(rules_ini)
    type_sections = {
        "structures": "buildingtypes", "units": "vehicletypes",
        "infantry": "infantrytypes", "aircraft": "aircrafttypes", "terrain": "terraintypes",
    }
    result = {}
    for map_section, type_section in type_sections.items():
        names = {value.split(",", 1)[0].strip().upper() for _, value in sections.get(type_section, [])}
        if not names:
            raise RuntimeError(f"Pinned RA2 rules.ini lacks [{type_section}]")
        result[map_section] = names
    return result


def screen_map(path: Path, source_sha1: str, ra2_names: dict[str, set[str]]) -> dict[str, Any]:
    raw = path.read_bytes()
    reasons: list[str] = []
    if hashlib.sha1(raw).hexdigest() != source_sha1:
        reasons.append("source_sha1_mismatch")
    sections, original_names = parse_sections(path)
    basic = values(sections.get("basic", []))
    header = values(sections.get("header", []))
    map_values = values(sections.get("map", []))
    waypoints = values(sections.get("waypoints", []))
    special_flags = values(sections.get("specialflags", []))
    start_evidence = {
        "basicMinPlayer": int_value(basic.get("minplayer")),
        "basicMaxPlayer": int_value(basic.get("maxplayer")),
        "headerNumberStartingPoints": int_value(header.get("numberstartingpoints")),
        "indexedWaypoint0": waypoints.get("0"),
        "indexedWaypoint1": waypoints.get("1"),
        "extraIndexedStartWaypoints": sorted(
            key for key, value in waypoints.items()
            if key in {str(index) for index in range(2, 8)} and value not in {"", "0", "0,0"}
        ),
    }
    if (
        start_evidence["basicMinPlayer"] != 2 or start_evidence["basicMaxPlayer"] != 2 or
        start_evidence["headerNumberStartingPoints"] != 2 or
        not start_evidence["indexedWaypoint0"] or not start_evidence["indexedWaypoint1"] or
        start_evidence["extraIndexedStartWaypoints"]
    ):
        reasons.append("raw_two_start_invariant_failed")
    if str(map_values.get("theater", "")).upper() != "TEMPERATE":
        reasons.append("raw_theater_not_temperate")
    if special_flags != STANDARD_SPECIAL_FLAGS:
        reasons.append("nonstandard_special_flags")
    nonempty_scripts = sorted(name for name in SCRIPT_SECTIONS if sections.get(name))
    if nonempty_scripts:
        reasons.append("nonempty_script_or_ai_sections")
    custom_sections = []
    for original in original_names:
        name = original.lower()
        if not sections.get(name):
            continue
        if name in CORE_SECTIONS or name in HOUSE_SECTIONS or name in SCRIPT_SECTIONS:
            continue
        if name.endswith(" house") and name.removesuffix(" house") in HOUSE_SECTIONS | {"neutral", "special"}:
            continue
        if LAMP_NAME.fullmatch(original):
            continue
        custom_sections.append(original)
    if custom_sections:
        reasons.append("custom_rule_or_type_sections")
    invalid_house_keys = []
    for name in HOUSE_SECTIONS | {"neutral", "special"}:
        extras = sorted(key for key, _ in sections.get(name, []) if key.lower() not in HOUSE_KEYS)
        if extras:
            invalid_house_keys.append({"section": name, "keys": extras})
    if invalid_house_keys:
        reasons.append("house_rule_overrides")
    nonneutral_owners = []
    unknown_ra2_objects = []
    for section in ("structures", "units", "infantry", "aircraft"):
        for key, value in sections.get(section, []):
            parts = [part.strip() for part in value.split(",")]
            owner = parts[0] if parts else ""
            name = parts[1].upper() if len(parts) > 1 else ""
            if owner.lower() not in ALLOWED_OBJECT_OWNERS:
                nonneutral_owners.append({"section": section, "key": key, "owner": owner})
            if name not in ra2_names[section]:
                unknown_ra2_objects.append({"section": section, "key": key, "name": name})
    for key, value in sections.get("terrain", []):
        name = value.split(",", 1)[0].strip().upper()
        if name not in ra2_names["terrain"]:
            unknown_ra2_objects.append({"section": "terrain", "key": key, "name": name})
    if nonneutral_owners:
        reasons.append("preplaced_playable_or_special_faction_assets")
    if unknown_ra2_objects:
        reasons.append("preplaced_object_absent_from_pinned_ra2_rules")
    return {
        "bytes": len(raw),
        "sha256": hashlib.sha256(raw).hexdigest(),
        "byteScreenPass": len(reasons) == 0,
        "exclusionReasons": sorted(set(reasons)),
        "startEvidence": start_evidence,
        "mapTheater": map_values.get("theater"),
        "nonemptyScriptOrAiSections": nonempty_scripts,
        "customSections": sorted(set(custom_sections)),
        "invalidHouseKeys": invalid_house_keys,
        "nonneutralOwnerRecordCount": len(nonneutral_owners),
        "unknownRa2ObjectRecordCount": len(unknown_ra2_objects),
        "unknownRa2Objects": unknown_ra2_objects,
    }


def screen(args: argparse.Namespace) -> None:
    selection = load_json(args.selection)
    selected = validate_selection(selection)
    download_manifest = load_json(args.download_manifest)
    if (
        download_manifest.get("kind") != "progress-certified-v5-technical-repair-reserve-download" or
        download_manifest.get("selectionSha256") != sha256_file(args.selection) or
        not isinstance(download_manifest.get("maps"), list) or
        len(download_manifest["maps"]) != EXPECTED_RESERVE_FAMILIES
    ):
        raise RuntimeError("Reserve download manifest is malformed or drifted")
    downloaded = {row["sourceSha1"]: row for row in download_manifest["maps"]}
    ra2_names = load_ra2_object_names(args.rules_ini)
    rows = []
    reason_counts: Counter[str] = Counter()
    for selected_row in selected:
        source_sha1 = selected_row["sourceSha1"]
        download_row = downloaded.get(source_sha1)
        if not isinstance(download_row, dict):
            raise RuntimeError(f"Reserve map is absent from download manifest: {source_sha1}")
        path = Path(download_row["path"])
        screened = screen_map(path, source_sha1, ra2_names)
        if screened["sha256"] != download_row["sha256"] or screened["bytes"] != download_row["bytes"]:
            raise RuntimeError(f"Reserve map bytes drifted after download: {source_sha1}")
        reason_counts.update(screened["exclusionReasons"])
        rows.append({
            **selected_row,
            "mapPath": str(path.resolve()),
            **screened,
        })
    passing = [row for row in rows if row["byteScreenPass"]]
    pass_commitment = [
        {
            "reserveOrdinal": row["reserveOrdinal"],
            "familyId": row["familyId"],
            "sourceSha1": row["sourceSha1"],
            "mapSha256": row["sha256"],
            "bytes": row["bytes"],
        }
        for row in passing
    ]
    output = {
        "schemaVersion": SCHEMA_VERSION,
        "kind": "progress-certified-v5-technical-repair-reserve-byte-screen",
        "status": "COMPLETE_OUTCOME_BLIND_STRICT_RA2_ORDINARY_SKIRMISH_BYTE_SCREEN",
        "outcomeBlind": True,
        "notPolicyEvidence": True,
        "selectionPath": str(args.selection.resolve()),
        "selectionSha256": sha256_file(args.selection),
        "downloadManifestPath": str(args.download_manifest.resolve()),
        "downloadManifestSha256": sha256_file(args.download_manifest),
        "rulesIniPath": str(args.rules_ini.resolve()),
        "rulesIniSha256": EXPECTED_RULES_INI_SHA256,
        "screenScriptSha256": sha256_file(Path(__file__)),
        "rules": {
            "requiredRawStructure": "exactly two consistent indexed starts and TEMPERATE theater",
            "scriptPolicy": "reject nonempty script or AI sections",
            "ruleOverridePolicy": "reject custom rules, house overrides, and nonstandard SpecialFlags",
            "placedObjectPolicy": (
                "allow only Neutral ownership and require every preplaced structure, unit, infantry, "
                "aircraft, and terrain type in pinned RA2 rules.ini"
            ),
            "replacementPolicy": "none; byte-screen exclusions are not backfilled beyond the frozen tail",
        },
        "selectedCount": len(rows),
        "passCount": len(passing),
        "excludedCount": len(rows) - len(passing),
        "exclusionReasonCounts": dict(sorted(reason_counts.items())),
        "passPopulationCommitmentSha256": canonical_sha256(pass_commitment),
        "rows": rows,
    }
    write_exclusive_json(args.output, output)
    print(json.dumps({
        "output": str(args.output.resolve()),
        "sha256": sha256_file(args.output),
        "passCount": len(passing),
        "excludedCount": len(rows) - len(passing),
        "passPopulationCommitmentSha256": output["passPopulationCommitmentSha256"],
    }, sort_keys=True))


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    subparsers = parser.add_subparsers(dest="command", required=True)
    freeze_parser = subparsers.add_parser("freeze")
    freeze_parser.add_argument("--source-root", type=Path, required=True)
    freeze_parser.add_argument("--output", type=Path, required=True)
    freeze_parser.set_defaults(func=freeze)
    download_parser = subparsers.add_parser("download")
    download_parser.add_argument("--selection", type=Path, required=True)
    download_parser.add_argument("--map-root", type=Path, required=True)
    download_parser.add_argument("--output", type=Path, required=True)
    download_parser.add_argument("--curl", default="curl")
    download_parser.add_argument(
        "--curl-resolve",
        help="Optional curl --resolve value, for example cncmaparchive.org:443:84.247.130.58",
    )
    download_parser.set_defaults(func=download)
    screen_parser = subparsers.add_parser("screen")
    screen_parser.add_argument("--selection", type=Path, required=True)
    screen_parser.add_argument("--download-manifest", type=Path, required=True)
    screen_parser.add_argument("--rules-ini", type=Path, required=True)
    screen_parser.add_argument("--output", type=Path, required=True)
    screen_parser.set_defaults(func=screen)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
