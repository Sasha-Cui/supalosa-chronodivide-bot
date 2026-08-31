from __future__ import annotations

import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
TEMPLATE = ROOT / "research" / "ICAART_RULING_RESPONSE_TEMPLATE.md"


class IcaartRulingResponseTemplateTest(unittest.TestCase):
    def test_template_remains_blank_and_decision_complete(self) -> None:
        template = TEMPLATE.read_text(encoding="utf-8")
        self.assertIn(
            "no inquiry has been sent and no ruling has been received",
            " ".join(template.split()),
        )
        self.assertNotIn("[x]", template.lower())

        for heading in (
            "Exceptional remote presentation",
            "Previously public named repository",
            "Generative-AI disclosure",
            "Reviewer artifact",
            "Overall venue decision",
            "Minimal follow-up for an incomplete reply",
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
            "4e2ba4eb599ffd37fec5d0f5da620c20dca80fa5",
            "4b6a2d17bf20c77c46ab4f6c0f010648edcb226862008dbc386fc69a18b62e9b",
            "c72719f869e3d26183b3615398dd4e82412a02aff2c16893083c60dec368e741",
            "cc8f656f8ccca9fab1a614d40a80368e0bec08bcfd6fc5dee07b69edb475d127",
        ):
            self.assertIn(digest, template)

        contacts = (ROOT / "research" / "CONTACT_TEMPLATES.md").read_text(
            encoding="utf-8"
        )
        self.assertIn("Proposed review-version disclosure", contacts)
        self.assertIn("registration", contacts.lower())
        self.assertIn("Proposed review-version wording approved", template)


if __name__ == "__main__":
    unittest.main()
