#!/usr/bin/env python3
"""Tests for the expanded outcome-free map-compatibility preflight plan."""

from __future__ import annotations

import copy
import importlib.util
import json
import unittest
from pathlib import Path


RESEARCH_ROOT = Path(__file__).resolve().parents[1]
MODULE_PATH = RESEARCH_ROOT / "scripts/select_map_fidelity_preflight.py"
SPEC = importlib.util.spec_from_file_location("select_map_fidelity_preflight", MODULE_PATH)
assert SPEC is not None and SPEC.loader is not None
SELECTOR = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(SELECTOR)


class ExpandedPreflightSelectionTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.catalog_path = RESEARCH_ROOT / "artifacts/map_family_catalog.json"
        cls.targets_path = RESEARCH_ROOT / "artifacts/role_blind_fidelity_targets_v1.json"
        cls.catalog = json.loads(cls.catalog_path.read_text(encoding="utf-8"))
        cls.targets = json.loads(cls.targets_path.read_text(encoding="utf-8"))

    def build(self, catalog: dict | None = None) -> dict:
        return SELECTOR.build_plan(
            self.catalog if catalog is None else catalog,
            self.targets,
            catalog_sha256=SELECTOR.sha256_file(self.catalog_path),
            target_manifest_sha256=SELECTOR.sha256_file(self.targets_path),
        )

    def test_exact_order_covers_all_axes_with_distinct_families(self) -> None:
        plan = self.build()
        self.assertEqual(plan["selectedFamilyCount"], 11)
        self.assertEqual(
            [record["familyId"] for record in plan["selected"]],
            [
                "mf_redvalley",
                "mf_mp12s4",
                "mf_mp24du",
                "mf_potomac",
                "mf_mp06mw",
                "mf_killer",
                "mf_parksidegardens",
                "mf_isleland",
                "mf_powdrkeg",
                "mf_ore2",
                "mf_mp20t6",
            ],
        )
        axes = [record["coverage"]["axis"] for record in plan["selected"]]
        self.assertEqual(axes.count("theater"), 4)
        self.assertEqual(axes.count("start_count"), 5)
        self.assertEqual(axes.count("global_extrema"), 2)
        self.assertEqual(len({record["familyId"] for record in plan["selected"]}), 11)

    def test_plan_is_deterministic_and_bound_to_target_population(self) -> None:
        first = self.build()
        second = self.build()
        self.assertEqual(first, second)
        self.assertEqual(
            first["targetPopulationCommitmentSha256"],
            self.targets["populationCommitmentSha256"],
        )
        self.assertEqual(
            first["selectionPolicySha256"],
            SELECTOR.canonical_sha256(first["selectionPolicy"]),
        )

    def test_anchor_descriptor_drift_fails_closed(self) -> None:
        catalog = copy.deepcopy(self.catalog)
        target = next(
            record for record in self.targets["targets"]
            if record["familyId"] == "mf_mp12s4"
        )
        representative = next(
            record for record in catalog["maps"]
            if record["path"] == target["representative"]["path"]
        )
        representative["descriptors"]["theater"] = "TEMPERATE"
        with self.assertRaisesRegex(ValueError, "Technical anchor drift"):
            self.build(catalog)

    def test_target_commitment_tampering_fails_closed(self) -> None:
        targets = copy.deepcopy(self.targets)
        targets["populationCommitmentSha256"] = "0" * 64
        with self.assertRaisesRegex(ValueError, "population commitment"):
            SELECTOR.build_plan(
                self.catalog,
                targets,
                catalog_sha256=SELECTOR.sha256_file(self.catalog_path),
                target_manifest_sha256=SELECTOR.sha256_file(self.targets_path),
            )


if __name__ == "__main__":
    unittest.main()
