from __future__ import annotations

import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SCREEN = ROOT / "research" / "ORIGINALITY_AND_NOVELTY_SCREEN.md"


class OriginalityAndNoveltyScreenTest(unittest.TestCase):
    def test_screen_is_bound_to_current_candidate_and_honest_limits(self) -> None:
        screen = SCREEN.read_text(encoding="utf-8")
        for identity in (
            "ccc0c101de207a7100fd553e15efc4fa18108a35",
            "efcc9856799493fdb93b29f58ad895abee7b0822d075297433f273507a25aaa3",
            "98500e11d7ccaa6d1c0f88f2e741b499737124cdac1565190379029bc82c4c07",
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
