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
            "5ed5dad47e9b2902385f4ee873da5c3fb9683bbd",
            "4bd0048eedb7c8ddeeb1d42b0552d402ea18ec9cfe702e9bd82c01fb0c673463",
            "8ede1a73f07bd06dcd8fa5a9c647984a55ecc9101cd715f6bf71171a2fb5b9d1",
            "2581e6ae5e00454919c9ddf6b6cea7721935117234bc675b7d19162a799db834",
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
