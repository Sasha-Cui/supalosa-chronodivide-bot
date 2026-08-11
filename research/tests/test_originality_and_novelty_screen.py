from __future__ import annotations

import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SCREEN = ROOT / "research" / "ORIGINALITY_AND_NOVELTY_SCREEN.md"


class OriginalityAndNoveltyScreenTest(unittest.TestCase):
    def test_screen_is_bound_to_current_candidate_and_honest_limits(self) -> None:
        screen = SCREEN.read_text(encoding="utf-8")
        for identity in (
            "4c2d011cacb4a3c98bf203153dd300e2075f142c",
            "0b0a5c55a9cbbc123693524597e520922ce927fcc21001cb5dd79b9004914bf6",
            "5a7450582b7452a9c568a08247e39cc9e9f0f5e0e1afcc9e9986ec9ef8ca5f21",
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
