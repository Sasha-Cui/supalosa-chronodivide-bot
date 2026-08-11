from __future__ import annotations

import hashlib
import importlib.util
import json
import os
from pathlib import Path
import shutil
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
            override = os.environ.get("CHRONO_PAPER_ARTIFACT_HASH_MANIFEST")
            expected_hashes = MODULE.load_hash_manifest(Path(override)) if override else None
            manifest = MODULE.generate_all(REPO, Path(directory), expected_hashes)
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
            self.assertIn(r"\newcommand{\AcceptedAllocationCount}{562}", metrics)
            self.assertIn(r"\newcommand{\AcceptedCoreHours}{288.72}", metrics)
            self.assertIn(r"\newcommand{\AcceptedPeakRSSGiB}{1.63}", metrics)
            family_plot = (Path(directory) / "family_effects_plot.tex").read_text(encoding="utf-8")
            self.assertEqual(family_plot.count("mark=*"), 1)
            self.assertIn("(0.84375000,16)", family_plot)

    def test_close_check_rejects_drift(self) -> None:
        with self.assertRaisesRegex(ValueError, "synthetic mismatch"):
            MODULE.expect_close(0.1, 0.2, "synthetic")

    def test_latex_escape_handles_family_ids(self) -> None:
        self.assertEqual(MODULE.latex_escape("mf_a_b"), r"mf\_a\_b")

    def test_custom_hash_manifest_supports_sanitized_artifacts(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            artifact_dir = root / "research" / "artifacts"
            artifact_dir.mkdir(parents=True)
            hashes = {}
            for filename in MODULE.EXPECTED_ARTIFACT_HASHES:
                source = REPO / "research" / "artifacts" / filename
                target = artifact_dir / filename
                if filename == "method_v2_confirmatory_result_v1.json":
                    payload = json.loads(source.read_text(encoding="utf-8"))
                    payload["scheduler"]["account"] = "REDACTED_FOR_DOUBLE_BLIND"
                    target.write_text(
                        json.dumps(payload, indent=2, sort_keys=True) + "\n",
                        encoding="utf-8",
                    )
                else:
                    shutil.copyfile(source, target)
                hashes[filename] = hashlib.sha256(target.read_bytes()).hexdigest()

            manifest = MODULE.generate_all(root, root / "generated", hashes)
            self.assertEqual(
                manifest["inputs"]["research/artifacts/method_v2_confirmatory_result_v1.json"],
                hashes["method_v2_confirmatory_result_v1.json"],
            )

    def test_hash_manifest_rejects_missing_name(self) -> None:
        incomplete = dict(MODULE.EXPECTED_ARTIFACT_HASHES)
        incomplete.pop(next(iter(incomplete)))
        with self.assertRaisesRegex(ValueError, "manifest names differ"):
            MODULE.validate_expected_hashes(incomplete)


if __name__ == "__main__":
    unittest.main()
