from __future__ import annotations

import re
import unittest
from collections import Counter
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
AUDIT = ROOT / "research" / "SUBSTANTIVE_CITATION_AUDIT.md"
BIBLIOGRAPHY = ROOT / "paper" / "references.bib"
SECTIONS = (
    "introduction",
    "related_work",
    "environment",
    "protocol",
    "results",
    "diagnostics",
    "reproducibility",
    "conclusion",
)


class SubstantiveCitationAuditTest(unittest.TestCase):
    def test_audit_covers_every_bibliography_key_once(self) -> None:
        audit = AUDIT.read_text(encoding="utf-8")
        bibliography = BIBLIOGRAPHY.read_text(encoding="utf-8")
        keys = re.findall(r"@\w+\s*\{\s*([^,\s]+)", bibliography)
        rows = re.findall(r"^\| \x60([^\x60]+)\x60 \|", audit, flags=re.MULTILINE)

        self.assertEqual(30, len(keys))
        self.assertEqual(set(keys), set(rows))
        self.assertEqual({key: 1 for key in keys}, dict(Counter(rows)))

    def test_audit_is_bound_to_current_candidate_and_human_boundary(self) -> None:
        audit = AUDIT.read_text(encoding="utf-8")
        for digest in (
            "6388f1a4243801f6b79d780844327c831a4290f4",
            "b832744aa64b790044c706f3c64c797f6674b4e5549b48dc88dd49858de0cb77",
        ):
            self.assertIn(digest, audit)

        self.assertIn("**does not replace human verification**", " ".join(audit.split()))
        self.assertIn("No empirical result", audit)
        self.assertNotRegex(audit, r"\|\s*unresolved\s*\|")

    def test_final_sections_cite_every_bibliography_key(self) -> None:
        bibliography = BIBLIOGRAPHY.read_text(encoding="utf-8")
        expected = set(re.findall(r"@\w+\s*\{\s*([^,\s]+)", bibliography))
        cited: list[str] = []
        for stem in SECTIONS:
            text = (
                ROOT / "paper" / "sections" / f"{stem}.tex"
            ).read_text(encoding="utf-8")
            for group in re.findall(r"\\cite\w*\{([^}]+)\}", text):
                normalized = group.replace("%", "")
                cited.extend(
                    key.strip() for key in normalized.split(",") if key.strip()
                )

        self.assertEqual(expected, set(cited))
        self.assertEqual(34, len(cited))


if __name__ == "__main__":
    unittest.main()
