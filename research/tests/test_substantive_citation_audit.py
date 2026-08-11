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

        self.assertEqual(27, len(keys))
        self.assertEqual(set(keys), set(rows))
        self.assertEqual({key: 1 for key in keys}, dict(Counter(rows)))

    def test_audit_is_bound_to_current_candidate_and_human_boundary(self) -> None:
        audit = AUDIT.read_text(encoding="utf-8")
        for digest in (
            "91f9978ae6df7d400e751712c07a8e8816fc9c07",
            "d5ea2c2893f4452b3889489101b74c9151f1d41a5f51b316acd3e25fbe29755e",
            "6f605941b8a0bee2b14d875bc973166f2710981746ffb245f563a74618926093",
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
        self.assertEqual(35, len(cited))


if __name__ == "__main__":
    unittest.main()
