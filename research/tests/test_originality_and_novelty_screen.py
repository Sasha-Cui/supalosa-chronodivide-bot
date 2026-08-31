from __future__ import annotations

import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SCREEN = ROOT / "research" / "ORIGINALITY_AND_NOVELTY_SCREEN.md"


class OriginalityAndNoveltyScreenTest(unittest.TestCase):
    def test_screen_is_bound_to_current_candidate_and_honest_limits(self) -> None:
        screen = SCREEN.read_text(encoding="utf-8")
        for identity in (
            "75cdf7a68763007e45c737ee1773aad1cc71ded1",
            "628482e622a19700d56de5516e2f91ea1b74c48705a879a78d6b3c77ea91f7fc",
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
