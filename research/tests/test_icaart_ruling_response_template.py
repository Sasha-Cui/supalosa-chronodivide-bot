from __future__ import annotations

import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
TEMPLATE = ROOT / "research" / "ICAART_RULING_RESPONSE_TEMPLATE.md"


class IcaartRulingResponseTemplateTest(unittest.TestCase):
    def test_template_remains_blank_and_decision_complete(self) -> None:
        template = TEMPLATE.read_text(encoding="utf-8")
        self.assertIn(
            "no inquiry has been sent and no ruling\nhas been received",
            template,
        )
        self.assertNotIn("[x]", template.lower())

        for heading in (
            "Exceptional remote presentation",
            "Previously public named repository",
            "Generative-AI disclosure",
            "Reviewer artifact",
            "Overall venue decision",
            "Minimal follow-up for an incomplete reply",
            "Optional SPIKE special-session fallback",
        ):
            self.assertIn(heading, template)

        for status in (
            "ICAART_FIRST_ROUND_WORKABLE",
            "FOLLOW_UP_REQUIRED",
            "ICAART_INELIGIBLE",
            "NO_RESPONSE_BY_INTERNAL_DEADLINE",
        ):
            self.assertIn(status, template)

        for digest in (
            "91f9978ae6df7d400e751712c07a8e8816fc9c07",
            "6f605941b8a0bee2b14d875bc973166f2710981746ffb245f563a74618926093",
            "57307d0ace24191719b8ccaf3a5ddc463e0c43f4e581d835890c1397dc516f03",
            "b6c79cacfc78289ccface7d0793d46c6c6317451e3f9cdc0b0984731fba2ea47",
        ):
            self.assertIn(digest, template)

        contacts = (ROOT / "research" / "CONTACT_TEMPLATES.md").read_text(
            encoding="utf-8"
        )
        self.assertIn("Optional ICAART SPIKE fallback inquiry", contacts)
        self.assertIn("no simultaneous", contacts)

        strategy = (ROOT / "research" / "VENUE_STRATEGY.md").read_text(
            encoding="utf-8"
        )
        self.assertIn("scope unresolved", strategy)
        self.assertIn(
            "https://icaart.scitevents.org/SPIKE.aspx?y=2027", strategy
        )


if __name__ == "__main__":
    unittest.main()
