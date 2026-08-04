#!/usr/bin/env python3
"""Tests for the prospective Chrono Divide design-power simulator."""

from __future__ import annotations

import importlib.util
import json
import random
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "design_power.py"
SPEC = importlib.util.spec_from_file_location("design_power", SCRIPT)
assert SPEC is not None and SPEC.loader is not None
design_power = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = design_power
SPEC.loader.exec_module(design_power)


class DesignPowerTests(unittest.TestCase):
    def small_config(self, **overrides):
        values = dict(
            families=8,
            optimizer_runs=5,
            paired_blocks=6,
            reciprocal_starts_per_block=2,
            variance_family=0.0025,
            variance_optimizer_run=0.0009,
            variance_family_optimizer=0.0016,
            variance_game=0.16,
            alpha=0.05,
            alternative="two-sided",
            null_replicates=1_500,
            simulations=1_500,
            seed=12345,
        )
        values.update(overrides)
        return design_power.DesignConfig(**values)

    def test_rejects_designs_without_both_cluster_dimensions(self):
        with self.assertRaisesRegex(ValueError, "families must be at least 2"):
            self.small_config(families=1).validate()
        with self.assertRaisesRegex(ValueError, "optimizer_runs must be at least 2"):
            self.small_config(optimizer_runs=1).validate()
        with self.assertRaisesRegex(
            ValueError, "reciprocal_starts_per_block must be at least 1"
        ):
            self.small_config(reciprocal_starts_per_block=0).validate()

    def test_statistic_is_invariant_to_constant_effect_in_its_standard_error(self):
        config = self.small_config()
        null_draw = design_power.draw_cluster_statistic(
            random.Random(77), config, effect_size=0.0
        )
        shifted_draw = design_power.draw_cluster_statistic(
            random.Random(77), config, effect_size=0.12
        )
        self.assertAlmostEqual(shifted_draw[0] - null_draw[0], 0.12, places=12)
        self.assertAlmostEqual(shifted_draw[1], null_draw[1], places=12)

    def test_report_is_reproducible_and_explicitly_prospective(self):
        config = self.small_config(null_replicates=700, simulations=700)
        first = design_power.build_report(config, [0.0, 0.12])
        second = design_power.build_report(config, [0.0, 0.12])
        self.assertEqual(first, second)
        self.assertTrue(first["prospective"])
        self.assertFalse(first["source_data_used"])
        self.assertFalse(first["observed_or_test_outcomes_used"])
        self.assertIn("ASSUMPTION-BASED", first["label"])
        self.assertEqual(first["planned_sample_units"]["paired_score_contrasts"], 240)
        self.assertEqual(
            first["planned_sample_units"]["start_level_paired_method_contrasts"],
            480,
        )
        self.assertEqual(
            first["planned_sample_units"]["component_game_outcomes"], 960
        )

    def test_larger_design_effect_has_higher_simulated_power(self):
        report = design_power.build_report(self.small_config(), [0.0, 0.20])
        null_power = report["scenarios"][0]["simulated_power_unconditional"]
        shifted_power = report["scenarios"][1]["simulated_power_unconditional"]
        self.assertLess(null_power, 0.10)
        self.assertGreater(shifted_power, null_power + 0.35)

    def test_cli_writes_valid_json_without_external_dependencies(self):
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / "power.json"
            completed = subprocess.run(
                [
                    sys.executable,
                    str(SCRIPT),
                    "--families",
                    "6",
                    "--optimizer-runs",
                    "4",
                    "--paired-blocks",
                    "3",
                    "--effect-size",
                    "0.10",
                    "--null-replicates",
                    "300",
                    "--simulations",
                    "300",
                    "--seed",
                    "9",
                    "--output",
                    str(output),
                ],
                check=True,
                capture_output=True,
                text=True,
            )
            from_file = json.loads(output.read_text(encoding="utf-8"))
            from_stdout = json.loads(completed.stdout)
            self.assertEqual(from_file, from_stdout)
            self.assertEqual(from_file["design"]["seed"], 9)


if __name__ == "__main__":
    unittest.main()
