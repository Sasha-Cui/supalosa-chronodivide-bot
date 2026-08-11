from __future__ import annotations

import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SCREEN = ROOT / "research" / "ORIGINALITY_AND_NOVELTY_SCREEN.md"


class OriginalityAndNoveltyScreenTest(unittest.TestCase):
    def test_screen_is_bound_to_current_candidate_and_honest_limits(self) -> None:
        screen = SCREEN.read_text(encoding="utf-8")
        for identity in (
            "92a4c870b6e697682b51fa41fd0f785c97c6b121",
            "c44c0d5739a33ae4155c18f0eba8c480785f4e3e1b9e2250dc03a43733a6d0a1",
            "7d4c26640a5f4da34783d1a533c8cfeb807d2d7b37a1e52acdc37b8cf6386c07",
        ):
            self.assertIn(identity, screen)

        for boundary in (
            "cannot establish the absence of unattributed overlap",
            "proprietary similarity database",
            "Human source reading",
            "not a universal literature-gap claim",
        ):
            self.assertIn(boundary, screen)

    def test_screen_records_closest_work_and_phrase_queries(self) -> None:
        screen = SCREEN.read_text(encoding="utf-8")
        bibliography = (ROOT / "paper" / "references.bib").read_text(
            encoding="utf-8"
        )
        related = (ROOT / "paper" / "sections" / "related_work.tex").read_text(
            encoding="utf-8"
        )

        for key in (
            "moraes2023opponents",
            "moraes2024semantic",
            "ouessai2022evolving",
        ):
            self.assertIn(f"{{{key},", bibliography)
            self.assertIn(key, related)

        self.assertIn(
            "turn an otherwise ambiguous tuning result into bounded, auditable evidence",
            screen,
        )
        self.assertIn("reusable result is the evidence contract", screen)
        self.assertIn("No returned exact-phrase result", screen)


if __name__ == "__main__":
    unittest.main()
