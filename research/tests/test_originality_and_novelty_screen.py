from __future__ import annotations

import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SCREEN = ROOT / "research" / "ORIGINALITY_AND_NOVELTY_SCREEN.md"


class OriginalityAndNoveltyScreenTest(unittest.TestCase):
    def test_screen_is_bound_to_current_candidate_and_honest_limits(self) -> None:
        screen = SCREEN.read_text(encoding="utf-8")
        for identity in (
            "4e2ba4eb599ffd37fec5d0f5da620c20dca80fa5",
            "4b6a2d17bf20c77c46ab4f6c0f010648edcb226862008dbc386fc69a18b62e9b",
        ):
            self.assertIn(identity, screen)

        for boundary in (
            "cannot establish the absence of unattributed overlap",
            "proprietary",
            "Human source",
            "not a universal literature-gap claim",
            "does not claim a new environment",
        ):
            self.assertIn(boundary, screen)

    def test_screen_records_current_closest_work_and_phrase_queries(self) -> None:
        screen = SCREEN.read_text(encoding="utf-8")
        bibliography = (ROOT / "paper" / "references.bib").read_text(
            encoding="utf-8"
        )
        related = (ROOT / "paper" / "sections" / "related_work.tex").read_text(
            encoding="utf-8"
        )

        for key in (
            "fernandezAres2012map",
            "moraes2023opponents",
            "moraes2024semantic",
            "ouessai2022evolving",
            "bhatia2023generally",
        ):
            self.assertIn(f"{{{key},", bibliography)
            self.assertIn(key, related)

        for phrase in (
            "progress-gated building retarget",
            "map-profiled RTS strength",
            "Planet Wars RTS",
            "no external exact-phrase match",
        ):
            self.assertIn(phrase, screen)


if __name__ == "__main__":
    unittest.main()
