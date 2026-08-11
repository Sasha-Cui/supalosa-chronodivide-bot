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
            "e365e37b52dfcea24c3c26f5130b7ac37a9366ac",
            "42f5cdb1b08ea8fff04fdefc4898dd336c8556c6cafb57f07e1d2139ed0daf28",
            "53e0aed782f6a1c42329c33bac849bc2cad3225982184dc6db7f8ea7d0ca9e3e",
            "6eb561c409fad9bb24b362ec9634d8fb00cc4a9ad7a6983ddb82a0cd7033e498",
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
