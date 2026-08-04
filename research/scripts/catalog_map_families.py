#!/usr/bin/env python3
"""Build an outcome-blind map-family catalog and provisional split eligibility.

This script reads only map bytes/INI descriptors, provenance and load-check
metadata, experiment settings, and textual source/config references. It never
reads episode, evaluation, checkpoint, or match-result payloads and never starts
the game engine.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
from collections import Counter, defaultdict
from pathlib import Path
from typing import Iterable, Sequence


MAP_EXTENSIONS = {".map", ".mpr"}
TEXT_EXTENSIONS = {
    ".cjs", ".env", ".js", ".json", ".json5", ".md", ".mjs", ".sbatch",
    ".sh", ".toml", ".ts", ".tsx", ".yaml", ".yml",
}
PREFIXES = ("cd_chrono_", "cd_")
REVISION_TOKENS = {
    "b", "fixed", "golden", "le", "port", "precap", "ra2", "remake",
    "startfixed", "yr",
}
ATTACHED_REVISION_SUFFIXES = (
    "startfixed", "precap", "remake", "golden", "fixed",
)
GENERIC_NAME_KEYS = {"map", "noname", "test", "unknown"}
FILENAME_PATTERN = re.compile(
    r"(?i)(?<![A-Za-z0-9_])([A-Za-z0-9_./-]+\.(?:map|mpr))(?![A-Za-z0-9_])"
)


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def stable_digest(values: Iterable[str]) -> str:
    digest = hashlib.sha256()
    for value in sorted(set(values)):
        digest.update(value.encode("utf-8", errors="surrogateescape"))
        digest.update(b"\0")
    return digest.hexdigest()


def clean_value(value: str, limit: int = 500) -> str:
    return "".join(
        character if character >= " " else " " for character in value
    ).strip()[:limit]


def name_tokens(value: str, strip_revision: bool = False) -> tuple[str, ...]:
    """Return conservative tokens for family linking."""

    name = Path(value.replace("\\", "/")).name.lower()
    for extension in MAP_EXTENSIONS:
        if name.endswith(extension):
            name = name[: -len(extension)]
            break
    name = re.sub(r"^\s*\[\s*\d+\s*\]\s*", "", name)
    for prefix in PREFIXES:
        if name.startswith(prefix):
            name = name[len(prefix):]
            break
    tokens = [token for token in re.split(r"[^a-z0-9]+", name) if token]
    if tokens and re.fullmatch(r"[1-8]", tokens[0]):
        tokens.pop(0)
    if not strip_revision:
        return tuple(tokens)

    while tokens:
        tail = tokens[-1]
        if (
            tail in REVISION_TOKENS
            or re.fullmatch(r"v\d+(?:\.\d+)*", tail)
            or re.fullmatch(r"[1-4]v[1-4]", tail)
        ):
            tokens.pop()
            continue
        changed = False
        for suffix in ATTACHED_REVISION_SUFFIXES:
            if tail.endswith(suffix) and len(tail) - len(suffix) >= 4:
                tokens[-1] = tail[:-len(suffix)]
                changed = True
                break
        if changed:
            continue
        break
    return tuple(tokens)


def name_key(value: str, strip_revision: bool = False) -> str:
    return "".join(name_tokens(value, strip_revision=strip_revision))


def parse_int(value: str | None) -> int | None:
    if value is None:
        return None
    try:
        return int(value.strip())
    except ValueError:
        return None


def parse_rect(value: str | None) -> dict[str, int] | None:
    if value is None:
        return None
    parts = [parse_int(part) for part in value.split(",")]
    if len(parts) != 4 or any(part is None for part in parts):
        return None
    x, y, width, height = (int(part) for part in parts)
    return {"x": x, "y": y, "width": width, "height": height}


def read_ini_descriptors(path: Path) -> dict[str, object]:
    """Extract descriptors without importing or evaluating game code."""

    wanted_sections = {"basic", "header", "map", "waypoints"}
    values: dict[str, dict[str, str]] = defaultdict(dict)
    section = ""
    with path.open("r", encoding="latin-1", errors="replace", newline="") as handle:
        for raw_line in handle:
            line = raw_line.strip()
            if not line or line.startswith((";", "#")):
                continue
            if line.startswith("[") and "]" in line:
                section = line[1:line.index("]")].strip().lower()
                continue
            if section not in wanted_sections or "=" not in line:
                continue
            key, value = line.split("=", 1)
            key = key.strip().lower()
            if key not in values[section]:
                values[section][key] = clean_value(value)

    basic_keys = ("name", "author", "gamemode", "minplayer", "maxplayer")
    map_keys = ("size", "localsize", "theater")
    header_keys = (
        "width", "height", "startx", "starty", "numberstartingpoints",
        "numcoophumanstartspots",
    )
    basic = {
        key: values["basic"][key] for key in basic_keys
        if key in values["basic"]
    }
    map_values = {
        key: values["map"][key] for key in map_keys if key in values["map"]
    }
    header = {
        key: values["header"][key] for key in header_keys
        if key in values["header"]
    }

    header_waypoints = {
        key: value
        for key, value in sorted(values["header"].items())
        if re.fullmatch(r"waypoint[1-8]", key)
        and value not in {"", "0,0", "-1"}
    }
    indexed_waypoints = {
        key: value
        for key, value in sorted(
            values["waypoints"].items(),
            key=lambda item: int(item[0]) if item[0].isdigit() else 999,
        )
        if key.isdigit()
        and 0 <= int(key) <= 7
        and value not in {"", "0,0", "-1"}
    }

    sources: list[tuple[str, int]] = []
    for label, value in (
        (
            "header.NumberStartingPoints",
            parse_int(values["header"].get("numberstartingpoints")),
        ),
        ("basic.MaxPlayer", parse_int(values["basic"].get("maxplayer"))),
        ("header.Waypoint1-8", len(header_waypoints) or None),
        ("waypoints.0-7", len(indexed_waypoints) or None),
    ):
        if value is not None and 1 <= value <= 8:
            sources.append((label, value))
    start_count_method, start_count = sources[0] if sources else (None, None)

    size = parse_rect(values["map"].get("size"))
    if size is None:
        width = parse_int(values["header"].get("width"))
        height = parse_int(values["header"].get("height"))
        if width is not None and height is not None:
            size = {
                "x": parse_int(values["header"].get("startx")) or 0,
                "y": parse_int(values["header"].get("starty")) or 0,
                "width": width,
                "height": height,
            }

    return {
        "basic": basic,
        "map": map_values,
        "header": header,
        "size": size,
        "localSize": parse_rect(values["map"].get("localsize")),
        "theater": values["map"].get("theater"),
        "startCount": start_count,
        "startCountMethod": start_count_method,
        "startCountEvidence": [
            {"source": label, "count": count} for label, count in sources
        ],
        "headerStartWaypoints": header_waypoints,
        "indexedStartWaypoints": indexed_waypoints,
    }


class DisjointSet:
    def __init__(self, size: int) -> None:
        self.parent = list(range(size))

    def find(self, value: int) -> int:
        while self.parent[value] != value:
            self.parent[value] = self.parent[self.parent[value]]
            value = self.parent[value]
        return value

    def union(self, left: int, right: int) -> None:
        left_root = self.find(left)
        right_root = self.find(right)
        if left_root != right_root:
            self.parent[right_root] = left_root


def union_groups(disjoint: DisjointSet, groups: dict[str, list[int]]) -> None:
    for indices in groups.values():
        if len(indices) > 1:
            first = indices[0]
            for index in indices[1:]:
                disjoint.union(first, index)


def load_json(path: Path) -> object:
    return json.loads(path.read_text(encoding="utf-8"))


def relative(path: Path, root: Path) -> str:
    try:
        return path.resolve().relative_to(root.resolve()).as_posix()
    except ValueError:
        return path.resolve().as_posix()


def metadata_inputs(
    repo_root: Path,
    source_path: Path,
    verification_paths: Sequence[Path],
) -> tuple[
    dict[str, list[dict[str, object]]],
    list[tuple[str, str]],
    dict[str, list[dict[str, object]]],
    dict[str, list[str]],
]:
    source_by_alias: dict[str, list[dict[str, object]]] = defaultdict(list)
    source_alias_pairs: list[tuple[str, str]] = []
    verification_by_alias: dict[str, list[dict[str, object]]] = defaultdict(list)
    display_names_by_alias: dict[str, list[str]] = defaultdict(list)

    if source_path.exists():
        payload = load_json(source_path)
        if isinstance(payload, dict):
            for record in payload.get("results", []):
                if not isinstance(record, dict):
                    continue
                name = clean_value(str(record.get("name", "")))
                compat_name = clean_value(str(record.get("compatMapName", "")))
                rendered = {
                    key: record[key]
                    for key in (
                        "name", "compatMapName", "url", "status", "bytes",
                        "sha256", "error",
                    )
                    if key in record
                }
                rendered["metadataFile"] = relative(source_path, repo_root)
                for alias in (name, compat_name):
                    if alias:
                        source_by_alias[Path(alias).name.lower()].append(rendered)
                if name and compat_name:
                    source_alias_pairs.append(
                        (Path(name).name.lower(), Path(compat_name).name.lower())
                    )

    for verification_path in verification_paths:
        if not verification_path.exists():
            continue
        payload = load_json(verification_path)
        if not isinstance(payload, dict):
            continue
        source_label = payload.get("source")
        for record in payload.get("results", []):
            if not isinstance(record, dict):
                continue
            map_name = clean_value(str(record.get("mapName", "")))
            if not map_name:
                continue
            rendered = {
                key: record[key]
                for key in ("mapName", "ok", "modes", "tick", "error")
                if key in record
            }
            rendered["metadataFile"] = relative(verification_path, repo_root)
            if source_label is not None:
                rendered["source"] = source_label
            alias = Path(map_name).name.lower()
            verification_by_alias[alias].append(rendered)
            display_name = record.get("Name")
            if isinstance(display_name, str) and display_name.strip():
                display_names_by_alias[alias].append(clean_value(display_name))

    return (
        source_by_alias,
        source_alias_pairs,
        verification_by_alias,
        display_names_by_alias,
    )


def discover_reference_files(repo_root: Path) -> list[Path]:
    candidates: set[Path] = set()
    for path in repo_root.iterdir():
        if path.is_file() and (
            path.suffix.lower() in TEXT_EXTENSIONS or path.name == "README.md"
        ):
            candidates.add(path)

    packages = repo_root / "packages"
    if packages.is_dir():
        for package in packages.iterdir():
            if not package.is_dir():
                continue
            for filename in ("package.json", "tsconfig.json", "README.md"):
                path = package / filename
                if path.is_file():
                    candidates.add(path)
            for subdirectory in ("config", "scripts", "src"):
                root = package / subdirectory
                if root.is_dir():
                    candidates.update(
                        path for path in root.rglob("*")
                        if path.is_file()
                        and path.suffix.lower() in TEXT_EXTENSIONS
                    )

    research = repo_root / "research"
    for subdirectory in ("configs", "scripts", "slurm", "tests"):
        root = research / subdirectory
        if root.is_dir():
            candidates.update(
                path for path in root.rglob("*")
                if path.is_file() and path.suffix.lower() in TEXT_EXTENSIONS
            )
    return sorted(candidates, key=lambda path: relative(path, repo_root))


def classify_reference_source(path_relative: str) -> dict[str, object]:
    """Classify references by whether they could reflect adaptive exposure.

    The default is adaptive. Only explicitly enumerated upstream or catalog
    administration sources are allowed to be non-disqualifying in tier B.
    """

    if path_relative == "packages/chronodivide-bot-driver/src/index.ts":
        return {
            "category": "upstream_driver_map_inventory",
            "adaptiveDevelopment": False,
            "rationale": "Pre-existing driver map list, not a StrongBot policy or experiment configuration.",
        }
    if path_relative == "README-CN.md":
        return {
            "category": "upstream_documentation",
            "adaptiveDevelopment": False,
            "rationale": "Upstream translated documentation.",
        }
    if path_relative in {
        "research/scripts/catalog_map_families.py",
        "research/tests/test_catalog_map_families.py",
    }:
        return {
            "category": "administrative_catalog_tooling",
            "adaptiveDevelopment": False,
            "rationale": "Outcome-blind catalog implementation or its synthetic unit tests.",
        }
    if path_relative.startswith("packages/chronodivide-bot/src/bot/"):
        return {
            "category": "strongbot_behavior",
            "adaptiveDevelopment": True,
            "rationale": "Author-behavior source; ambiguous references are conservatively adaptive.",
        }
    if path_relative.startswith("packages/chronodivide-bot-driver/src/training/"):
        return {
            "category": "adaptive_training",
            "adaptiveDevelopment": True,
            "rationale": "Training or training-analysis source.",
        }
    if path_relative.startswith("packages/chronodivide-bot-driver/src/benchmark/"):
        return {
            "category": "adaptive_benchmark_or_regression",
            "adaptiveDevelopment": True,
            "rationale": "Benchmark, regression, or result-configuration source.",
        }
    if path_relative.startswith("packages/chronodivide-bot-driver/src/test/"):
        return {
            "category": "adaptive_test_or_regression",
            "adaptiveDevelopment": True,
            "rationale": "Behavioral or match-regression test source.",
        }
    if path_relative.startswith((
        "research/configs/",
        "research/scripts/",
        "research/slurm/",
    )):
        return {
            "category": "research_configuration_or_job",
            "adaptiveDevelopment": True,
            "rationale": "Research configuration, launcher, or job script.",
        }
    if path_relative == "README.md":
        return {
            "category": "project_results_documentation",
            "adaptiveDevelopment": True,
            "rationale": "Project-specific map observations can encode adaptive exposure.",
        }
    return {
        "category": "ambiguous_project_source",
        "adaptiveDevelopment": True,
        "rationale": "Unclassified project source defaults to adaptive and disqualifying.",
    }


def family_symbol_patterns(
    family_tokens: dict[str, set[tuple[str, ...]]],
) -> dict[str, list[tuple[str, re.Pattern[str]]]]:
    acronym_owners: dict[str, set[str]] = defaultdict(set)
    for family_id, token_sets in family_tokens.items():
        for tokens in token_sets:
            if len(tokens) >= 3:
                acronym = "".join(token[0] for token in tokens).upper()
                if len(acronym) >= 3:
                    acronym_owners[acronym].add(family_id)

    output: dict[str, list[tuple[str, re.Pattern[str]]]] = defaultdict(list)
    for family_id, token_sets in family_tokens.items():
        seen: set[str] = set()
        for tokens in sorted(token_sets):
            if not tokens:
                continue
            symbol = "_".join(tokens).upper()
            if len(tokens) >= 2:
                expression = (
                    r"(?<![A-Za-z0-9])"
                    + r"[\s_-]+".join(re.escape(token) for token in tokens)
                    + r"(?![A-Za-z0-9])"
                )
                key = "phrase:" + expression
                if key not in seen:
                    output[family_id].append(
                        ("name_phrase", re.compile(expression, re.IGNORECASE))
                    )
                    seen.add(key)
            elif len(tokens[0]) >= 5:
                expression = (
                    r"(?<![A-Za-z0-9])"
                    + re.escape(symbol)
                    + r"(?![A-Za-z0-9])"
                )
                key = "symbol:" + expression
                if key not in seen:
                    output[family_id].append(
                        ("uppercase_symbol", re.compile(expression))
                    )
                    seen.add(key)

            if len(tokens) >= 3:
                acronym = "".join(token[0] for token in tokens).upper()
                if (
                    len(acronym) >= 3
                    and acronym_owners[acronym] == {family_id}
                ):
                    expression = (
                        r"(?<![A-Za-z0-9])"
                        + re.escape(acronym)
                        + r"(?![A-Za-z0-9])"
                    )
                    key = "acronym:" + expression
                    if key not in seen:
                        output[family_id].append(
                            ("unique_acronym", re.compile(expression))
                        )
                        seen.add(key)
    return output


def catalog(
    repo_root: Path,
    data_root: Path,
    experiment_inventory: Path,
    source_metadata: Path,
    verification_metadata: Sequence[Path],
) -> dict[str, object]:
    (
        source_by_alias,
        source_alias_pairs,
        verification_by_alias,
        display_names_by_alias,
    ) = metadata_inputs(repo_root, source_metadata, verification_metadata)

    map_paths = sorted(
        (
            path for path in data_root.rglob("*")
            if path.is_file() and path.suffix.lower() in MAP_EXTENSIONS
        ),
        key=lambda path: relative(path, repo_root),
    )
    maps: list[dict[str, object]] = []
    basename_indices: dict[str, list[int]] = defaultdict(list)
    exact_groups: dict[str, list[int]] = defaultdict(list)
    revision_groups: dict[str, list[int]] = defaultdict(list)
    exact_name_groups: dict[str, list[int]] = defaultdict(list)
    row_token_sets: list[set[tuple[str, ...]]] = []

    for index, path in enumerate(map_paths):
        path_relative = relative(path, repo_root)
        basename = path.name.lower()
        descriptors = read_ini_descriptors(path)
        digest = sha256_file(path)
        extra_names = display_names_by_alias.get(basename, [])
        descriptor_name = None
        if isinstance(descriptors.get("basic"), dict):
            descriptor_name = descriptors["basic"].get("name")
        all_names = [path.name]
        if isinstance(descriptor_name, str):
            all_names.append(descriptor_name)
        all_names.extend(extra_names)

        exact_name_keys = sorted({
            key for key in (
                name_key(value, strip_revision=False) for value in all_names
            )
            if len(key) >= 4 and key not in GENERIC_NAME_KEYS
        })
        revision_keys = sorted({
            key for key in (
                name_key(value, strip_revision=True) for value in all_names
            )
            if len(key) >= 4 and key not in GENERIC_NAME_KEYS
        })
        token_sets = {
            tokens for tokens in (
                name_tokens(value, strip_revision=True) for value in all_names
            )
            if tokens and len("".join(tokens)) >= 4
        }
        row_token_sets.append(token_sets)

        row = {
            "path": path_relative,
            "basename": path.name,
            "bytes": path.stat().st_size,
            "sha256": digest,
            "nameKeys": exact_name_keys,
            "revisionKeys": revision_keys,
            "descriptors": descriptors,
            "sourceMetadata": sorted(
                source_by_alias.get(basename, []),
                key=lambda record: json.dumps(record, sort_keys=True),
            ),
            "loadVerification": sorted(
                verification_by_alias.get(basename, []),
                key=lambda record: json.dumps(record, sort_keys=True),
            ),
        }
        maps.append(row)
        basename_indices[basename].append(index)
        exact_groups[digest].append(index)
        for key in exact_name_keys:
            exact_name_groups[key].append(index)
        for key in revision_keys:
            revision_groups[key].append(index)

    disjoint = DisjointSet(len(maps))
    union_groups(disjoint, exact_groups)
    union_groups(disjoint, revision_groups)
    union_groups(disjoint, exact_name_groups)
    for left_alias, right_alias in source_alias_pairs:
        for left in basename_indices.get(left_alias, []):
            for right in basename_indices.get(right_alias, []):
                disjoint.union(left, right)

    components: dict[int, list[int]] = defaultdict(list)
    for index in range(len(maps)):
        components[disjoint.find(index)].append(index)

    family_id_by_index: dict[int, str] = {}
    family_tokens: dict[str, set[tuple[str, ...]]] = {}
    families: list[dict[str, object]] = []
    used_ids: set[str] = set()
    for indices in sorted(
        components.values(),
        key=lambda values: min(str(maps[index]["path"]) for index in values),
    ):
        revision_keys = sorted({
            key for index in indices for key in maps[index]["revisionKeys"]
        })
        exact_name_keys = sorted({
            key for index in indices for key in maps[index]["nameKeys"]
        })
        hashes = sorted({str(maps[index]["sha256"]) for index in indices})
        preferred = (
            revision_keys[0] if revision_keys
            else exact_name_keys[0] if exact_name_keys
            else hashes[0][:16]
        )
        base_id = "mf_" + preferred[:72]
        family_id = base_id
        suffix = 2
        while family_id in used_ids:
            family_id = f"{base_id}_{suffix}"
            suffix += 1
        used_ids.add(family_id)
        for index in indices:
            family_id_by_index[index] = family_id
        tokens = {token for index in indices for token in row_token_sets[index]}
        family_tokens[family_id] = tokens

        family_maps = [maps[index] for index in indices]
        sources = {
            json.dumps(record, sort_keys=True)
            for row in family_maps for record in row["sourceMetadata"]
        }
        verifications = {
            json.dumps(record, sort_keys=True)
            for row in family_maps for record in row["loadVerification"]
        }
        names = sorted({
            str(row["descriptors"]["basic"]["name"])
            for row in family_maps
            if isinstance(row["descriptors"].get("basic"), dict)
            and "name" in row["descriptors"]["basic"]
        })
        theaters = sorted({
            str(row["descriptors"]["theater"])
            for row in family_maps if row["descriptors"].get("theater")
        })
        start_counts = sorted({
            int(row["descriptors"]["startCount"])
            for row in family_maps
            if isinstance(row["descriptors"].get("startCount"), int)
        })
        verification_records = [
            json.loads(record) for record in sorted(verifications)
        ]
        families.append({
            "familyId": family_id,
            "familyKey": preferred,
            "mapIndices": indices,
            "mapPaths": [str(maps[index]["path"]) for index in indices],
            "mapCount": len(indices),
            "contentHashes": hashes,
            "contentHashCount": len(hashes),
            "nameKeys": exact_name_keys,
            "revisionKeys": revision_keys,
            "displayNames": names,
            "theaters": theaters,
            "startCounts": start_counts,
            "sourceMetadata": [
                json.loads(record) for record in sorted(sources)
            ],
            "loadVerification": verification_records,
            "loadVerificationSummary": {
                "records": len(verification_records),
                "passed": sum(
                    record.get("ok") is True for record in verification_records
                ),
                "failed": sum(
                    record.get("ok") is False for record in verification_records
                ),
                "unknown": sum(
                    "ok" not in record for record in verification_records
                ),
            },
            "historicalExperimentEvidence": [],
            "textualReferenceEvidence": [],
        })

    family_by_id = {
        str(family["familyId"]): family for family in families
    }
    alias_to_families: dict[str, set[str]] = defaultdict(set)
    revision_to_families: dict[str, set[str]] = defaultdict(set)
    for index, row in enumerate(maps):
        family_id = family_id_by_index[index]
        alias_to_families[str(row["basename"]).lower()].add(family_id)
        for key in row["nameKeys"]:
            alias_to_families[str(key)].add(family_id)
        for key in row["revisionKeys"]:
            revision_to_families[str(key)].add(family_id)
        row["familyId"] = family_id

    historical_aggregates: dict[str, dict[str, object]] = {}
    inventory_rows = 0
    if experiment_inventory.exists():
        with experiment_inventory.open("r", encoding="utf-8") as handle:
            for line in handle:
                if not line.strip():
                    continue
                record = json.loads(line)
                inventory_rows += 1
                settings = record.get("settings")
                if (
                    not isinstance(settings, dict)
                    or not isinstance(settings.get("maps"), list)
                ):
                    continue
                for map_reference in settings["maps"]:
                    if (
                        not isinstance(map_reference, str)
                        or not map_reference.strip()
                    ):
                        continue
                    token = map_reference.strip()
                    aggregate = historical_aggregates.setdefault(token, {
                        "mapReference": token,
                        "settingsRows": 0,
                        "collections": Counter(),
                        "evidenceValues": [],
                        "exampleRunPaths": [],
                    })
                    aggregate["settingsRows"] = (
                        int(aggregate["settingsRows"]) + 1
                    )
                    aggregate["collections"][
                        str(record.get("collection", "unknown"))
                    ] += 1
                    evidence_value = "|".join((
                        str(record.get("collection", "")),
                        str(record.get("relativePath", "")),
                        str(record.get("runName", "")),
                    ))
                    aggregate["evidenceValues"].append(evidence_value)
                    if len(aggregate["exampleRunPaths"]) < 10:
                        aggregate["exampleRunPaths"].append(
                            str(record.get("relativePath", ""))
                        )

    unresolved_historical: list[dict[str, object]] = []
    for token, aggregate in sorted(historical_aggregates.items()):
        basename = Path(token.replace("\\", "/")).name.lower()
        matched = set(alias_to_families.get(basename, set()))
        if not matched:
            matched.update(revision_to_families.get(
                name_key(token, strip_revision=True), set()
            ))
        evidence = {
            "mapReference": token,
            "settingsRows": aggregate["settingsRows"],
            "collections": dict(sorted(aggregate["collections"].items())),
            "evidenceDigest": stable_digest(aggregate["evidenceValues"]),
            "exampleRunPaths": sorted(set(aggregate["exampleRunPaths"])),
        }
        if not matched:
            unresolved_historical.append(evidence)
            continue
        for family_id in sorted(matched):
            family_by_id[family_id][
                "historicalExperimentEvidence"
            ].append(evidence)

    reference_files = discover_reference_files(repo_root)
    reference_file_metadata = []
    for path in reference_files:
        path_relative = relative(path, repo_root)
        reference_file_metadata.append({
            "path": path_relative,
            **classify_reference_source(path_relative),
        })
    reference_classification_by_path = {
        str(record["path"]): record for record in reference_file_metadata
    }
    source_corpus_values = [
        relative(path, repo_root) + ":" + sha256_file(path)
        for path in reference_files
    ]
    symbol_patterns = family_symbol_patterns(family_tokens)
    textual_evidence_sets: dict[str, set[str]] = defaultdict(set)
    unresolved_filename_references: set[str] = set()
    for path in reference_files:
        path_relative = relative(path, repo_root)
        with path.open("r", encoding="utf-8", errors="replace") as handle:
            for line_number, line in enumerate(handle, start=1):
                exact_matched_families: set[str] = set()
                for match in FILENAME_PATTERN.finditer(line):
                    token = match.group(1)
                    basename = Path(token).name.lower()
                    matched = set(alias_to_families.get(basename, set()))
                    if not matched:
                        matched.update(revision_to_families.get(
                            name_key(token, strip_revision=True), set()
                        ))
                    if not matched:
                        unresolved_filename_references.add(
                            f"{path_relative}:{line_number}:{token}"
                        )
                    for family_id in matched:
                        exact_matched_families.add(family_id)
                        textual_evidence_sets[family_id].add(
                            f"filename|{path_relative}|{line_number}|{token}"
                        )
                for family_id, patterns in symbol_patterns.items():
                    if family_id in exact_matched_families:
                        continue
                    for kind, pattern in patterns:
                        match = pattern.search(line)
                        if match:
                            textual_evidence_sets[family_id].add(
                                f"{kind}|{path_relative}|{line_number}|"
                                + match.group(0)
                            )
                            break

    for family_id, evidence_values in textual_evidence_sets.items():
        evidence = []
        for rendered in sorted(evidence_values):
            kind, path, line_number, token = rendered.split("|", 3)
            source_classification = reference_classification_by_path[path]
            evidence.append({
                "kind": kind,
                "path": path,
                "line": int(line_number),
                "token": token,
                "sourceCategory": source_classification["category"],
                "adaptiveDevelopment": source_classification["adaptiveDevelopment"],
                "classificationRationale": source_classification["rationale"],
            })
        family_by_id[family_id]["textualReferenceEvidence"] = evidence

    for family in families:
        adaptive_textual_evidence = [
            evidence
            for evidence in family["textualReferenceEvidence"]
            if evidence["adaptiveDevelopment"]
        ]
        administrative_textual_evidence = [
            evidence
            for evidence in family["textualReferenceEvidence"]
            if not evidence["adaptiveDevelopment"]
        ]
        strict_reasons = []
        evidence_reasons = []
        if family["historicalExperimentEvidence"]:
            strict_reasons.append("historical_experiment_settings")
            evidence_reasons.append("historical_experiment_settings")
        if family["textualReferenceEvidence"]:
            strict_reasons.append("any_textual_source_or_config_reference")
        if adaptive_textual_evidence:
            evidence_reasons.append("adaptive_development_text_reference")

        strict_eligibility = {
            "eligible": not strict_reasons,
            "status": "provisional_only" if not strict_reasons else "ineligible",
            "reasons": strict_reasons,
            "sealedTestCaveat": (
                "Strict provisional only: requires author-history adjudication, "
                "a frozen split, and no policy changes after test-map inspection."
                if not strict_reasons
                else "Strict tier excludes any family with any textual reference."
            ),
        }
        evidence_eligibility = {
            "eligible": not evidence_reasons,
            "status": "provisional_only" if not evidence_reasons else "ineligible",
            "reasons": evidence_reasons,
            "sealedTestCaveat": (
                "Evidence-based provisional only: administrative references were "
                "non-adaptive, but author-history and manual family review remain required."
                if not evidence_reasons
                else "Adaptive-development evidence disqualifies this family."
            ),
        }
        family["textualReferenceEvidenceSummary"] = {
            "adaptiveEvidenceCount": len(adaptive_textual_evidence),
            "administrativeEvidenceCount": len(administrative_textual_evidence),
            "adaptiveSourceCategories": sorted({
                evidence["sourceCategory"]
                for evidence in adaptive_textual_evidence
            }),
            "administrativeSourceCategories": sorted({
                evidence["sourceCategory"]
                for evidence in administrative_textual_evidence
            }),
        }
        family["developmentEligibility"] = strict_eligibility
        family["strictDevelopmentEligibility"] = strict_eligibility
        family["evidenceBasedDevelopmentEligibility"] = evidence_eligibility

    families.sort(key=lambda family: str(family["familyId"]))
    maps.sort(key=lambda row: str(row["path"]))
    strict_ineligible = [
        family for family in families
        if not family["strictDevelopmentEligibility"]["eligible"]
    ]
    strict_provisional = [
        family for family in families
        if family["strictDevelopmentEligibility"]["eligible"]
    ]
    evidence_ineligible = [
        family for family in families
        if not family["evidenceBasedDevelopmentEligibility"]["eligible"]
    ]
    evidence_provisional = [
        family for family in families
        if family["evidenceBasedDevelopmentEligibility"]["eligible"]
    ]
    strict_passed_provisional = [
        family for family in strict_provisional
        if family["loadVerificationSummary"]["passed"] > 0
    ]
    evidence_passed_provisional = [
        family for family in evidence_provisional
        if family["loadVerificationSummary"]["passed"] > 0
    ]
    strict_reason_counts = Counter(
        reason
        for family in families
        for reason in family["strictDevelopmentEligibility"]["reasons"]
    )
    strict_combination_counts = Counter(
        "+".join(family["strictDevelopmentEligibility"]["reasons"])
        or "provisional"
        for family in families
    )
    evidence_reason_counts = Counter(
        reason
        for family in families
        for reason in family["evidenceBasedDevelopmentEligibility"]["reasons"]
    )
    evidence_combination_counts = Counter(
        "+".join(family["evidenceBasedDevelopmentEligibility"]["reasons"])
        or "provisional"
        for family in families
    )
    administrative_only_families = [
        family for family in strict_ineligible
        if family["evidenceBasedDevelopmentEligibility"]["eligible"]
    ]
    adaptive_text_reference_families = [
        family for family in families
        if family["textualReferenceEvidenceSummary"]["adaptiveEvidenceCount"] > 0
    ]

    category_accumulators: dict[str, dict[str, object]] = {}
    for family in families:
        for evidence in family["textualReferenceEvidence"]:
            category = str(evidence["sourceCategory"])
            accumulator = category_accumulators.setdefault(category, {
                "category": category,
                "adaptiveDevelopment": bool(evidence["adaptiveDevelopment"]),
                "rationale": str(evidence["classificationRationale"]),
                "evidenceCount": 0,
                "familyIds": set(),
                "files": set(),
            })
            accumulator["evidenceCount"] = int(accumulator["evidenceCount"]) + 1
            accumulator["familyIds"].add(str(family["familyId"]))
            accumulator["files"].add(str(evidence["path"]))
    reference_source_categories = []
    for category in sorted(category_accumulators):
        accumulator = category_accumulators[category]
        reference_source_categories.append({
            "category": category,
            "adaptiveDevelopment": accumulator["adaptiveDevelopment"],
            "rationale": accumulator["rationale"],
            "evidenceCount": accumulator["evidenceCount"],
            "familyCount": len(accumulator["familyIds"]),
            "files": sorted(accumulator["files"]),
        })

    # Backward-compatible names retain the strict ceiling semantics.
    ineligible = strict_ineligible
    provisional = strict_provisional
    passed_provisional = strict_passed_provisional
    reason_counts = strict_reason_counts
    combination_counts = strict_combination_counts
    inputs = []
    for path in (
        source_metadata, *verification_metadata, experiment_inventory,
    ):
        if path.exists():
            inputs.append({
                "path": relative(path, repo_root),
                "bytes": path.stat().st_size,
                "sha256": sha256_file(path),
            })

    return {
        "schemaVersion": 2,
        "outcomeBlind": True,
        "scope": {
            "mapRoot": relative(data_root, repo_root),
            "mapExtensions": sorted(MAP_EXTENSIONS),
            "experimentEvidencePolicy": (
                "Read settings.maps only from experiment_inventory.jsonl; "
                "episode, evaluation, checkpoint, and match-result files are "
                "not opened."
            ),
            "textReferenceCorpusPolicy": (
                "Root configuration/README files, package config and src "
                "trees, and research configs/scripts/slurm/tests; data, "
                "research reports/artifacts, benchmark-results, node_modules, "
                "and build outputs are excluded."
            ),
            "familyPolicy": (
                "Connected components over exact SHA-256, normalized names, "
                "normalized known-revision names, and explicit provenance "
                "raw/compatibility aliases."
            ),
            "strictEligibilityPolicy": (
                "Any historical settings use or any textual source/config "
                "reference makes the entire connected family ineligible."
            ),
            "evidenceBasedEligibilityPolicy": (
                "Historical settings or adaptive-development references make "
                "the family ineligible. Explicit upstream inventory, upstream "
                "documentation, and outcome-blind catalog references are recorded "
                "but do not alone disqualify."
            ),
            "referenceClassificationDefault": (
                "Any unclassified or ambiguous project source is adaptive and "
                "disqualifying; only enumerated administrative/upstream sources "
                "are non-adaptive."
            ),
        },
        "inputs": inputs,
        "sourceReferenceCorpus": {
            "fileCount": len(reference_files),
            "sha256": stable_digest(source_corpus_values),
            "files": [
                relative(path, repo_root) for path in reference_files
            ],
            "fileClassifications": reference_file_metadata,
        },
        "referenceSourceCategories": reference_source_categories,
        "summary": {
            "mapFiles": len(maps),
            "contentHashes": len({
                str(row["sha256"]) for row in maps
            }),
            "families": len(families),
            "strictDevelopmentIneligibleFamilies": len(strict_ineligible),
            "strictProvisionalFamilies": len(strict_provisional),
            "strictProvisionalFamiliesWithPassedLoadMetadata": len(
                strict_passed_provisional
            ),
            "strictEligibilityReasonCounts": dict(
                sorted(strict_reason_counts.items())
            ),
            "strictEligibilityCombinationCounts": dict(
                sorted(strict_combination_counts.items())
            ),
            "evidenceBasedDevelopmentIneligibleFamilies": len(
                evidence_ineligible
            ),
            "evidenceBasedProvisionalFamilies": len(evidence_provisional),
            "evidenceBasedProvisionalFamiliesWithPassedLoadMetadata": len(
                evidence_passed_provisional
            ),
            "evidenceBasedEligibilityReasonCounts": dict(
                sorted(evidence_reason_counts.items())
            ),
            "evidenceBasedEligibilityCombinationCounts": dict(
                sorted(evidence_combination_counts.items())
            ),
            "administrativeOnlyReferenceFamilies": len(
                administrative_only_families
            ),
            "adaptiveTextReferenceFamilies": len(
                adaptive_text_reference_families
            ),
            "developmentIneligibleFamilies": len(ineligible),
            "provisionalFamilies": len(provisional),
            "eligibilityReasonCounts": dict(sorted(reason_counts.items())),
            "eligibilityCombinationCounts": dict(
                sorted(combination_counts.items())
            ),
            "provisionalFamiliesWithPassedLoadMetadata": len(
                passed_provisional
            ),
            "experimentInventoryRowsRead": inventory_rows,
            "historicalMapReferences": len(historical_aggregates),
            "unresolvedHistoricalMapReferences": len(unresolved_historical),
            "unresolvedTextFilenameReferences": len(
                unresolved_filename_references
            ),
        },
        "unresolvedHistoricalMapReferences": unresolved_historical,
        "unresolvedTextFilenameReferences": sorted(
            unresolved_filename_references
        ),
        "maps": maps,
        "families": families,
        "limitations": [
            "Name and revision grouping is conservative but heuristic; manual family adjudication is required before freezing a split.",
            "Load-verification metadata establishes only the recorded smoke/load check, not full-match fidelity or strategic suitability.",
            "A lack of settings/source references does not prove that the author never viewed, played, or tuned against a map.",
            "Tier B is a path-based evidence classification: only explicitly enumerated upstream/administrative sources are non-adaptive, and all ambiguity defaults to disqualifying.",
            "An administrative-only reference does not prove that a map was unseen by the author.",
            "INI dimensions, theater, and waypoint descriptors are metadata only; no map geometry or gameplay was evaluated.",
            "Only map files under the configured driver data root are cataloged.",
        ],
    }


def report_markdown(payload: dict[str, object]) -> str:
    summary = payload["summary"]
    families = payload["families"]
    ineligible = [
        family for family in families
        if not family["developmentEligibility"]["eligible"]
    ]
    provisional = [
        family for family in families
        if family["developmentEligibility"]["eligible"]
    ]
    historical_ineligible = [
        family for family in ineligible
        if family["historicalExperimentEvidence"]
    ]

    lines = [
        "# Outcome-blind map-family eligibility report",
        "",
        "This report was generated without opening match outcomes, episodes, "
        "evaluations, or checkpoints and without running the game engine.",
        "",
        "## Summary",
        "",
        "| Quantity | Count |",
        "|---|---:|",
        f"| Map files | {summary['mapFiles']} |",
        f"| Exact content hashes | {summary['contentHashes']} |",
        f"| Conservative connected families | {summary['families']} |",
        (
            "| Tier A strict development-ineligible families | "
            f"{summary['strictDevelopmentIneligibleFamilies']} |"
        ),
        (
            "| Tier A strict provisional families | "
            f"{summary['strictProvisionalFamilies']} |"
        ),
        (
            "| Tier B evidence-based development-ineligible families | "
            f"{summary['evidenceBasedDevelopmentIneligibleFamilies']} |"
        ),
        (
            "| Tier B evidence-based provisional families | "
            f"{summary['evidenceBasedProvisionalFamilies']} |"
        ),
        (
            "| Administrative-only reference families | "
            f"{summary['administrativeOnlyReferenceFamilies']} |"
        ),
        (
            "| Families with adaptive textual references | "
            f"{summary['adaptiveTextReferenceFamilies']} |"
        ),
        (
            "| Tier A provisional families with passed load metadata | "
            f"{summary['strictProvisionalFamiliesWithPassedLoadMetadata']} |"
        ),
        (
            "| Tier B provisional families with passed load metadata | "
            f"{summary['evidenceBasedProvisionalFamiliesWithPassedLoadMetadata']} |"
        ),
        "",
        "Tier A preserves the strict ceiling: every textual reference excludes. "
        "Tier B excludes adaptive development evidence but records enumerated "
        "upstream/administrative references without treating them as adaptation. "
        "Neither tier certifies a sealed test set; author-history review, manual "
        "family adjudication, and a frozen split are still required.",
        "",
        "## Tier A strict development-ineligible families",
        "",
        "| Family | Display name or key | Files | Hashes | Exclusion evidence |",
        "|---|---|---:|---:|---|",
    ]
    for family in ineligible:
        name = (
            family["displayNames"][0]
            if family["displayNames"] else family["familyKey"]
        )
        reasons = ", ".join(family["developmentEligibility"]["reasons"])
        lines.append(
            f"| {family['familyId']} | {name} | {family['mapCount']} | "
            f"{family['contentHashCount']} | {reasons} |"
        )

    lines.extend([
        "",
        "## Provisional candidates with passed load metadata",
        "",
        "| Family | Display name or key | Files | Hashes | Theater | "
        "Start counts | Passed/failed load records |",
        "|---|---|---:|---:|---|---|---:|",
    ])
    passed_candidates = [
        family for family in provisional
        if family["loadVerificationSummary"]["passed"] > 0
    ]
    for family in passed_candidates:
        name = (
            family["displayNames"][0]
            if family["displayNames"] else family["familyKey"]
        )
        verification = family["loadVerificationSummary"]
        lines.append(
            f"| {family['familyId']} | {name} | {family['mapCount']} | "
            f"{family['contentHashCount']} | "
            f"{', '.join(family['theaters']) or 'unknown'} | "
            f"{', '.join(str(value) for value in family['startCounts']) or 'unknown'} | "
            f"{verification['passed']}/{verification['failed']} |"
        )
    if not passed_candidates:
        lines.append(
            "| none | none | 0 | 0 | unknown | unknown | 0/0 |"
        )

    lines.extend([
        "",
        "## Reference-source categories",
        "",
        "| Category | Adaptive | Families | Evidence | Files |",
        "|---|---|---:|---:|---|",
    ])
    for source in payload["referenceSourceCategories"]:
        lines.append(
            f"| {source['category']} | "
            f"{'yes' if source['adaptiveDevelopment'] else 'no'} | "
            f"{source['familyCount']} | {source['evidenceCount']} | "
            f"{'<br>'.join(source['files'])} |"
        )

    lines.extend(["", "## Interpretation limits", ""])
    for limitation in payload["limitations"]:
        lines.append(f"- {limitation}")
    lines.extend([
        "",
        "The machine-readable catalog records every file, hash, descriptor, "
        "family link, provenance/load record, settings-use aggregate, and "
        "source/config reference.",
        "",
    ])
    return "\n".join(lines)


def main() -> None:
    default_repo = Path(__file__).resolve().parents[2]
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo-root", type=Path, default=default_repo)
    parser.add_argument(
        "--data-root",
        type=Path,
        default=default_repo / "packages/chronodivide-bot-driver/data",
    )
    parser.add_argument(
        "--experiment-inventory",
        type=Path,
        default=default_repo
        / "research/artifacts/experiment_inventory.jsonl",
    )
    parser.add_argument(
        "--source-metadata",
        type=Path,
        default=default_repo
        / "packages/chronodivide-bot-driver/data/"
        "chronodivide-map-sources.json",
    )
    parser.add_argument(
        "--verification-metadata",
        type=Path,
        action="append",
        default=None,
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=default_repo
        / "research/artifacts/map_family_catalog.json",
    )
    parser.add_argument(
        "--report",
        type=Path,
        default=default_repo / "research/MAP_FAMILY_ELIGIBILITY.md",
    )
    args = parser.parse_args()

    verification_metadata = args.verification_metadata or [
        args.repo_root
        / "packages/chronodivide-bot-driver/data/"
        "verified-realistic-maps.json",
        args.repo_root
        / "packages/chronodivide-bot-driver/data/"
        "chronodivide-map-smoke-full-ra2.json",
    ]
    payload = catalog(
        args.repo_root.resolve(),
        args.data_root.resolve(),
        args.experiment_inventory.resolve(),
        args.source_metadata.resolve(),
        [path.resolve() for path in verification_metadata],
    )
    rendered = json.dumps(payload, indent=2, sort_keys=True) + "\n"
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(rendered, encoding="utf-8")
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(report_markdown(payload), encoding="utf-8")
    print(json.dumps(payload["summary"], indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
