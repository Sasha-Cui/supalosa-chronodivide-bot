#!/usr/bin/env python3
"""Unit tests for the outcome-blind map-family catalog."""

from __future__ import annotations

import importlib.util
import tempfile
import unittest
from pathlib import Path


MODULE_PATH = (
    Path(__file__).resolve().parents[1]
    / "scripts/catalog_map_families.py"
)
SPEC = importlib.util.spec_from_file_location(
    "catalog_map_families", MODULE_PATH
)
assert SPEC is not None and SPEC.loader is not None
CATALOG = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(CATALOG)


class NameNormalizationTests(unittest.TestCase):
    def test_compatibility_player_and_revision_markers_share_a_key(self) -> None:
        values = (
            "cd_chrono_4_alpha_valley_le_v2.map",
            "cd_4_alpha_valley_le.map",
            "[4] Alpha Valley",
            "alphavalleyfixed.map",
        )
        keys = {
            CATALOG.name_key(value, strip_revision=True)
            for value in values
        }
        self.assertEqual(keys, {"alphavalley"})

    def test_distinct_mp_variants_are_not_merged_by_filename(self) -> None:
        left = CATALOG.name_key(
            "cd_chrono_mp99du.map", strip_revision=True
        )
        right = CATALOG.name_key(
            "cd_chrono_mp99t4.map", strip_revision=True
        )
        self.assertNotEqual(left, right)


class ReferenceClassificationTests(unittest.TestCase):
    def test_upstream_inventory_is_administrative(self) -> None:
        classification = CATALOG.classify_reference_source(
            "packages/chronodivide-bot-driver/src/index.ts"
        )
        self.assertFalse(classification["adaptiveDevelopment"])
        self.assertEqual(
            classification["category"],
            "upstream_driver_map_inventory",
        )

    def test_behavior_and_unknown_sources_default_to_adaptive(self) -> None:
        behavior = CATALOG.classify_reference_source(
            "packages/chronodivide-bot/src/bot/strongBot.ts"
        )
        unknown = CATALOG.classify_reference_source("notes/custom-map.txt")
        self.assertTrue(behavior["adaptiveDevelopment"])
        self.assertTrue(unknown["adaptiveDevelopment"])

    def test_python_tooling_is_in_reference_corpus(self) -> None:
        self.assertIn(".py", CATALOG.TEXT_EXTENSIONS)


class PartitionValidationTests(unittest.TestCase):
    def test_cross_family_hash_overlap_fails_closed(self) -> None:
        families = [
            {
                "familyId": "one",
                "mapPaths": ["one.map"],
                "contentHashes": ["a" * 64],
                "revisionKeys": ["one"],
            },
            {
                "familyId": "two",
                "mapPaths": ["two.map"],
                "contentHashes": ["a" * 64],
                "revisionKeys": ["two"],
            },
        ]
        maps = [{"path": "one.map"}, {"path": "two.map"}]
        with self.assertRaisesRegex(ValueError, "content hash"):
            CATALOG.validate_family_partition(families, maps)


class IniDescriptorTests(unittest.TestCase):
    def test_extracts_safe_descriptors_without_game_imports(self) -> None:
        contents = """
[Basic]
Name=[4] Fixture Valley LE
Author=Fixture Author
MaxPlayer=4

[Map]
Size=0,0,90,110
LocalSize=2,4,86,102
Theater=TEMPERATE

[Header]
NumberStartingPoints=4
Waypoint1=10,20
Waypoint2=30,40
Waypoint3=50,60
Waypoint4=70,80

[Waypoints]
0=10020
1=30040
"""
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "fixture.map"
            path.write_text(contents, encoding="latin-1")
            descriptors = CATALOG.read_ini_descriptors(path)
        self.assertEqual(descriptors["startCount"], 4)
        self.assertEqual(
            descriptors["startCountMethod"],
            "header.NumberStartingPoints",
        )
        self.assertEqual(descriptors["size"]["width"], 90)
        self.assertEqual(descriptors["theater"], "TEMPERATE")
        self.assertEqual(
            len(descriptors["headerStartWaypoints"]), 4
        )
        self.assertEqual(
            len(descriptors["indexedStartWaypoints"]), 2
        )


if __name__ == "__main__":
    unittest.main()
