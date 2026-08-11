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

        self.assertEqual(30, len(keys))
        self.assertEqual(set(keys), set(rows))
        self.assertEqual({key: 1 for key in keys}, dict(Counter(rows)))

    def test_audit_is_bound_to_current_candidate_and_human_boundary(self) -> None:
        audit = AUDIT.read_text(encoding="utf-8")
        for digest in (
            "bc0e6096ed89c7640bcbab5f3a4e7444e82f3b89",
            "666695c812fe504507aae7f3e7d813698ec64df3f74ad973a19ec73f2ee98d64",
            "271363cdad2e6128588b34e5a64f7ddb38487cf3669067406516118b80797c71",
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
        self.assertEqual(38, len(cited))


if __name__ == "__main__":
    unittest.main()
