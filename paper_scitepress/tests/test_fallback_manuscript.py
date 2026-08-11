from __future__ import annotations

import hashlib
import json
import re
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
FALLBACK = ROOT / "paper_scitepress"


class FallbackManuscriptTest(unittest.TestCase):
    def test_reuses_every_authoritative_main_section(self) -> None:
        source = (FALLBACK / "main.tex").read_text()
        expected = [
            "introduction",
            "related_work",
            "environment",
            "protocol",
            "results",
            "diagnostics",
            "reproducibility",
            "conclusion",
        ]
        for stem in expected:
            self.assertIn(rf"\input{{../paper/sections/{stem}}}", source)
        self.assertNotIn(r"\input{../paper/sections/abstract}", source)

    def test_main_paper_has_no_dangling_supplement_reference(self) -> None:
        section_root = ROOT / "paper" / "sections"
        sections = (
            "introduction",
            "related_work",
            "environment",
            "protocol",
            "results",
            "diagnostics",
            "reproducibility",
            "conclusion",
        )
        source = "\n".join(
            (section_root / f"{stem}.tex").read_text() for stem in sections
        )
        self.assertNotIn("supplement", source.lower())

    def test_abstract_is_within_official_word_bounds(self) -> None:
        source = (FALLBACK / "abstract.tex").read_text()
        completed = subprocess.run(
            [
                sys.executable,
                str(FALLBACK / "scripts" / "export_submission_metadata.py"),
            ],
            check=True,
            capture_output=True,
            text=True,
        )
        word_count = json.loads(completed.stdout)["abstractWordCount"]
        self.assertGreaterEqual(word_count, 70)
        self.assertLessEqual(word_count, 200)
        self.assertIn("joint", source.lower())
        self.assertIn("fails", source.lower())

    def test_submission_metadata_is_plain_and_deterministic(self) -> None:
        script = FALLBACK / "scripts" / "export_submission_metadata.py"
        with tempfile.TemporaryDirectory() as directory:
            first = Path(directory) / "first.json"
            second = Path(directory) / "second.json"
            for output in (first, second):
                subprocess.run(
                    [sys.executable, str(script), "--output", str(output)],
                    check=True,
                )
            self.assertEqual(first.read_bytes(), second.read_bytes())
            metadata = json.loads(first.read_text(encoding="utf-8"))

        self.assertEqual(metadata["paperClass"], "Regular paper")
        self.assertEqual(metadata["area"], "Agents")
        self.assertEqual(
            metadata["topics"],
            [
                "Agent Models and Architectures",
                "Simulation",
                "Task Planning and Execution",
            ],
        )
        self.assertEqual(
            metadata["title"],
            "Configuring a Scripted RTS Agent: Held-Out Evaluation in Chrono Divide",
        )
        self.assertEqual(metadata["abstractWordCount"], 195)
        self.assertIn("0.336", metadata["abstract"])
        self.assertIn("-0.021", metadata["abstract"])
        self.assertNotRegex(metadata["abstract"], r"[\\{}]")
        self.assertEqual(
            metadata["keywords"],
            [
                "Game Artificial Intelligence",
                "Real-time Strategy Games",
                "Scripted Agents",
                "Algorithm Configuration",
                "Reproducible Evaluation",
            ],
        )
        self.assertEqual(len(metadata["sourceSha256"]), 3)
        for digest in metadata["sourceSha256"].values():
            self.assertRegex(digest, r"^[0-9a-f]{64}$")

    def test_review_sources_are_anonymous(self) -> None:
        paths = [
            FALLBACK / "main.tex",
            FALLBACK / "abstract.tex",
            FALLBACK / "README.md",
        ]
        text = "\n".join(path.read_text() for path in paths).lower()
        forbidden = (
            "sasha",
            "cui",
            "yale",
            "".join(("zc", "362")),
            "".join(("pi_", "jss233")),
            "/nfs/",
            "github.com/sasha-cui",
        )
        for token in forbidden:
            self.assertNotIn(token, text)

    def test_headline_values_are_generated_not_duplicated(self) -> None:
        text = (FALLBACK / "main.tex").read_text() + (FALLBACK / "abstract.tex").read_text()
        for literal in ("0.535", "0.199", "0.336", "0.215", "0.457", "8,704"):
            self.assertNotIn(literal, text)
        self.assertIn(r"\ImprovementEstimate{}", text)
        self.assertIn(r"\ChampionAbsoluteLower{}", text)

    def test_keywords_target_game_agent_reviewers(self) -> None:
        source = (FALLBACK / "main.tex").read_text()
        match = re.search(r"\\keywords\{([^}]*)\}", source, re.DOTALL)
        self.assertIsNotNone(match)
        keywords = " ".join(match.group(1).split()).lower()
        for required in (
            "game artificial intelligence",
            "real-time strategy games",
            "scripted agents",
            "algorithm configuration",
            "reproducible evaluation",
        ):
            self.assertIn(required, keywords)
        self.assertNotIn("distribution shift", keywords)

    def test_vendor_files_match_the_official_archive(self) -> None:
        manifest = [
            line
            for line in (FALLBACK / "VENDOR_SHA256SUMS").read_text().splitlines()
            if line.strip()
        ]
        self.assertEqual(len(manifest), 4)
        for line in manifest:
            expected, name = line.split(None, 1)
            data = (FALLBACK / "vendor" / name).read_bytes()
            self.assertEqual(hashlib.sha256(data).hexdigest(), expected)

    def test_build_checker_rejects_unsettled_cross_references(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            log = root / "main.log"
            blg = root / "main.blg"
            pdf = root / "main.pdf"
            log.write_text(
                "Output written on build/main.pdf (10 pages, 100 bytes).\n"
                "LaTeX Warning: Label(s) may have changed. Rerun to get "
                "cross-references right.\n",
                encoding="utf-8",
            )
            blg.write_text("", encoding="utf-8")
            pdf.write_bytes(b"%PDF-1.5\n")
            completed = subprocess.run(
                [
                    sys.executable,
                    str(FALLBACK / "scripts" / "check_build.py"),
                    str(log),
                    str(blg),
                    str(pdf),
                ],
                check=False,
                capture_output=True,
                text=True,
            )
            self.assertNotEqual(completed.returncode, 0)
            self.assertIn("Label", completed.stderr)


if __name__ == "__main__":
    unittest.main()
