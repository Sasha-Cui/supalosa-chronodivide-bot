from __future__ import annotations

import hashlib
import importlib.util
import json
import re
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
FALLBACK = ROOT / "paper_scitepress"


def contains_sha256_window(text: str, length: int, digest: str) -> bool:
    folded = text.casefold()
    return any(
        hashlib.sha256(folded[index : index + length].encode()).hexdigest()
        == digest
        for index in range(max(0, len(folded) - length + 1))
    )


def load_submission_checker():
    path = FALLBACK / "scripts" / "check_submission.py"
    spec = importlib.util.spec_from_file_location("check_submission", path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"cannot import {path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


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
            "Leakage-Resistant Evaluation of Scripted RTS Agent Configuration in "
            "Chrono Divide",
        )
        self.assertEqual(metadata["abstractWordCount"], 193)
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
        text = "\n".join(path.read_text() for path in paths)
        forbidden = (
            (5, "297581d6cd198a6e6df740f13288cb13a1e76cebe3f0ebc3fe259977addfd646"),
            (3, "75650d98e971a3fc702475924eb86f3cd8fdb4968487e8381634940ae47d1466"),
            (4, "63866302165d1f77ebe4a18e27d0181869e682d375f4d5c864d92cfc17c71f81"),
            (7, "c72778ae004e950e51ed73084f7a31a50bd246a12498fdf894ea7c974c7d104f"),
            (5, "308d8ecab5e130335dbf084e25a599c16416ef921c6392a078c6f3c5f19a94c2"),
            (9, "25fa2524993e224aa7924a65faeff7b96f166601879957cf43f785d7c87c0642"),
            (5, "0d175bdceb7b4e699947060c34ffd27a5d3397a6e110c65b71752ff9821142a1"),
            (20, "65c747204c8cba071ae66fa55aa2799e7d76d987b4ff7bbce81d8e1ac720a125"),
        )
        for length, digest in forbidden:
            self.assertFalse(contains_sha256_window(text, length, digest))

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

    def test_bibliography_fit_does_not_shrink_reference_text(self) -> None:
        source = (FALLBACK / "main.tex").read_text()
        self.assertIn(
            r"\renewcommand{\thebibliography}[1]",
            source,
        )
        bibliography_hook = source.split(
            r"\renewcommand{\thebibliography}[1]", maxsplit=1
        )[1].split(r"\begin{document}", maxsplit=1)[0]
        self.assertIn(r"\setlength{\itemsep}{0pt}", bibliography_hook)
        self.assertNotIn(r"\footnotesize", bibliography_hook)
        self.assertNotIn(r"\scriptsize", bibliography_hook)

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

    def test_submission_checker_validates_pdf_structure_and_fonts(self) -> None:
        checker = load_submission_checker()
        fields = {
            "Title": "",
            "Subject": "",
            "Keywords": "",
            "Author": "",
            "Encrypted": "no",
            "Form": "none",
            "JavaScript": "no",
            "Page rot": "0",
            "Suspects": "no",
            "Pages": "10",
            "Page size": "595.276 x 841.89 pts (A4)",
        }
        checker.validate_pdfinfo(fields, expected_pages=10)
        font_output = (
            "name type encoding emb sub uni object ID\n"
            "---- ---- -------- --- --- --- ------ --\n"
            "ABC+Font Type1 Custom yes yes yes 12 0\n"
        )
        self.assertEqual(checker.validate_fonts(font_output), 1)

        invalid = dict(fields, Author="Identifying Author")
        with self.assertRaisesRegex(ValueError, "Author"):
            checker.validate_pdfinfo(invalid, expected_pages=10)
        with self.assertRaisesRegex(ValueError, "font"):
            checker.validate_fonts(font_output.replace("yes yes yes", "no no no"))

    def test_submission_checker_binds_metadata_and_exact_character_count(self) -> None:
        checker = load_submission_checker()
        metadata = json.loads(
            subprocess.run(
                [
                    sys.executable,
                    str(FALLBACK / "scripts" / "export_submission_metadata.py"),
                ],
                check=True,
                capture_output=True,
                text=True,
            ).stdout
        )
        pdf_text = "\n".join(
            [
                "Anonymous Author(s)",
                metadata["title"],
                metadata["abstract"],
                " ".join(metadata["keywords"]),
            ]
        )
        checker.validate_metadata_binding(metadata, pdf_text)
        count = sum(not character.isspace() for character in pdf_text)
        self.assertEqual(
            checker.validate_text(
                pdf_text,
                minimum_characters=count,
                maximum_characters=count,
                expected_characters=count,
                forbidden_tokens=[],
            ),
            count,
        )
        with self.assertRaisesRegex(ValueError, "frozen candidate"):
            checker.validate_text(
                pdf_text,
                minimum_characters=1,
                maximum_characters=50_000,
                expected_characters=count + 1,
                forbidden_tokens=[],
            )


if __name__ == "__main__":
    unittest.main()
