from __future__ import annotations

import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SCREEN = ROOT / "research" / "ORIGINALITY_AND_NOVELTY_SCREEN.md"


class OriginalityAndNoveltyScreenTest(unittest.TestCase):
    def test_screen_is_bound_to_current_candidate_and_honest_limits(self) -> None:
        screen = SCREEN.read_text(encoding="utf-8")
        for identity in (
            "e365e37b52dfcea24c3c26f5130b7ac37a9366ac",
            "7303ab1c2c1f8ea0abfb2abe4d4c56b3111d4b3ccd7e55e714836d6c0ce33f92",
            "42f5cdb1b08ea8fff04fdefc4898dd336c8556c6cafb57f07e1d2139ed0daf28",
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
