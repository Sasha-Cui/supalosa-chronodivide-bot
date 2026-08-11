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
            self.assertIn(r"\newcommand{\ChampionAbsoluteSE}{0.032}", metrics)
            self.assertIn(r"\newcommand{\ChampionBootstrapLower}{0.482}", metrics)
            self.assertIn(r"\newcommand{\LossToDrawPairCount}{104}", metrics)
            self.assertIn(r"\newcommand{\TerminalRawRecordCount}{1,472}", metrics)
            self.assertIn(r"\newcommand{\StrategyTerminalCreditReduction}{857.68}", metrics)
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

    def test_critical_result_literals_live_only_in_generated_metrics(self) -> None:
        sources = [REPO / "paper" / "main.tex", REPO / "paper" / "supplement.tex"]
        sources.extend(sorted((REPO / "paper" / "sections").glob("*.tex")))
        manuscript = "\n".join(path.read_text(encoding="utf-8") for path in sources)
        for literal in (
            "0.199",
            "0.535",
            "0.336",
            "0.215",
            "0.457",
            "-0.021",
            "288.72",
            "1.63",
            "8,704",
        ):
            with self.subTest(literal=literal):
                self.assertNotIn(literal, manuscript)

    def test_confirmatory_boundary_repeats_at_reader_entry_points(self) -> None:
        section_dir = REPO / "paper" / "sections"
        entry_points = {
            name: (section_dir / f"{name}.tex").read_text(encoding="utf-8")
            for name in ("abstract", "introduction", "results", "conclusion")
        }
        for name, text in entry_points.items():
            for macro in (
                r"\ImprovementEstimate",
                r"\ImprovementCILower",
                r"\ImprovementCIUpper",
                r"\ChampionAbsoluteLower",
            ):
                with self.subTest(section=name, macro=macro):
                    self.assertIn(macro, text)
        required_failure_language = {
            "abstract": "does not establish absolute superiority",
            "introduction": r"does \emph{not} establish",
            "results": "absolute-strength gate fails",
            "conclusion": "absolute superiority is not established",
        }
        for name, phrase in required_failure_language.items():
            with self.subTest(section=name):
                self.assertIn(phrase, " ".join(entry_points[name].split()))

    def test_review_sources_remain_anonymous(self) -> None:
        main = (REPO / "paper" / "main.tex").read_text(encoding="utf-8")
        supplement = (REPO / "paper" / "supplement.tex").read_text(encoding="utf-8")
        for text in (main, supplement):
            self.assertIn(r"\author{Anonymous Author(s)}", text)
            self.assertIn(r"\institute{Anonymous institution}", text)
        sources = [main, supplement]
        sources.extend(
            path.read_text(encoding="utf-8")
            for path in sorted((REPO / "paper" / "sections").glob("*.tex"))
        )
        manuscript = "\n".join(sources)
        for denied in (
            "Sasha" + " Cui",
            "sasha.z.cui" + "@gmail.com",
            "zc" + "362",
            "pi_" + "jss233",
            "/nfs/" + "roberts",
            "github.com/" + "Sasha" + "-" + "Cui",
            "Yale" + " University",
        ):
            with self.subTest(denied=denied):
                self.assertNotIn(denied, manuscript)


if __name__ == "__main__":
    unittest.main()
