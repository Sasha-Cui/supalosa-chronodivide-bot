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

        self.assertEqual(32, len(keys))
        self.assertEqual(set(keys), set(rows))
        self.assertEqual({key: 1 for key in keys}, dict(Counter(rows)))

    def test_audit_is_bound_to_current_candidate_and_human_boundary(self) -> None:
        audit = AUDIT.read_text(encoding="utf-8")
        for digest in (
            "5ed5dad47e9b2902385f4ee873da5c3fb9683bbd",
            "617f5e3e8b0b7c209e4c7c92aaa4db432e72b1f407d8e09aea08b4cd8834a82d",
            "4bd0048eedb7c8ddeeb1d42b0552d402ea18ec9cfe702e9bd82c01fb0c673463",
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
        self.assertEqual(40, len(cited))


if __name__ == "__main__":
    unittest.main()
