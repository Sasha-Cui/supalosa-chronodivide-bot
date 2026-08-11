from __future__ import annotations

import importlib.util
from pathlib import Path
import tempfile
import unittest


REPO = Path(__file__).parents[2]
SCRIPT = REPO / "paper" / "scripts" / "generate_assets.py"
SPEC = importlib.util.spec_from_file_location("generate_assets", SCRIPT)
assert SPEC is not None and SPEC.loader is not None
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class GeneratePaperAssetsTest(unittest.TestCase):
    def test_generates_expected_outputs_from_frozen_artifacts(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            manifest = MODULE.generate_all(REPO, Path(directory))
            expected = {
                "metrics.tex",
                "family_effects_plot.tex",
                "family_effects_table.tex",
                "outcome_transitions.tex",
                "component_effects_plot.tex",
                "study_flow.tex",
            }
            self.assertEqual(set(manifest["outputs"]), expected)
            metrics = (Path(directory) / "metrics.tex").read_text(encoding="utf-8")
            self.assertIn(r"\newcommand{\ImprovementEstimate}{0.336}", metrics)
            self.assertIn(r"\newcommand{\ChampionAbsoluteLower}{-0.021}", metrics)
            family_plot = (Path(directory) / "family_effects_plot.tex").read_text(encoding="utf-8")
            self.assertEqual(family_plot.count("mark=*"), 1)
            self.assertIn("(0.84375000,16)", family_plot)

    def test_close_check_rejects_drift(self) -> None:
        with self.assertRaisesRegex(ValueError, "synthetic mismatch"):
            MODULE.expect_close(0.1, 0.2, "synthetic")

    def test_latex_escape_handles_family_ids(self) -> None:
        self.assertEqual(MODULE.latex_escape("mf_a_b"), r"mf\_a\_b")


if __name__ == "__main__":
    unittest.main()
