from __future__ import annotations

import re
import unittest
from collections import Counter
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
AUDIT = ROOT / "research" / "SUBSTANTIVE_CITATION_AUDIT.md"
BIBLIOGRAPHY = ROOT / "paper" / "references.bib"


class SubstantiveCitationAuditTest(unittest.TestCase):
    def test_audit_covers_every_bibliography_key_once(self) -> None:
        audit = AUDIT.read_text(encoding="utf-8")
        bibliography = BIBLIOGRAPHY.read_text(encoding="utf-8")
        keys = re.findall(r"@\w+\s*\{\s*([^,\s]+)", bibliography)
        rows = re.findall(r"^\| `([^`]+)` \|", audit, flags=re.MULTILINE)

        self.assertEqual(33, len(keys))
        self.assertEqual(set(keys), set(rows))
        self.assertEqual({key: 1 for key in keys}, dict(Counter(rows)))

    def test_audit_is_bound_to_current_candidate_and_human_boundary(self) -> None:
        audit = AUDIT.read_text(encoding="utf-8")
        for digest in (
            "4c2d011cacb4a3c98bf203153dd300e2075f142c",
            "0b0a5c55a9cbbc123693524597e520922ce927fcc21001cb5dd79b9004914bf6",
            "5a7450582b7452a9c568a08247e39cc9e9f0f5e0e1afcc9e9986ec9ef8ca5f21",
        ):
            self.assertIn(digest, audit)

        self.assertIn("does **not** replace human verification", audit)
        self.assertIn("No empirical result", audit)
        self.assertNotRegex(audit, r"\|\s*unresolved\s*\|")

    def test_shared_sources_have_frozen_coverage_and_placement_count(self) -> None:
        bibliography = BIBLIOGRAPHY.read_text(encoding="utf-8")
        expected = set(
            re.findall(r"@\w+\s*\{\s*([^,\s]+)", bibliography)
        )
        cited: list[str] = []
        for path in sorted((ROOT / "paper").glob("**/*.tex")):
            text = path.read_text(encoding="utf-8")
            for group in re.findall(r"\\cite\w*\{([^}]+)\}", text):
                cited.extend(key.strip() for key in group.split(","))

        self.assertEqual(expected, set(cited))
        self.assertEqual(41, len(cited))


if __name__ == "__main__":
    unittest.main()
