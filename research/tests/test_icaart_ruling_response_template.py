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
            "ccc0c101de207a7100fd553e15efc4fa18108a35",
            "98500e11d7ccaa6d1c0f88f2e741b499737124cdac1565190379029bc82c4c07",
            "74c038f20daf4cae2c95c1fc930ebc862304eda52442afda724a2f83f1fa7fb0",
            "285af4e101ea36d6e5190a3c0ceb5d4a52ded5e56f96210b1295360bb077e4ca",
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
