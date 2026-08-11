from __future__ import annotations

import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
TEMPLATE = ROOT / "research" / "EXTERNAL_REVIEW_RESPONSE_TEMPLATE.md"


class ExternalReviewResponseTemplateTest(unittest.TestCase):
    def test_template_is_blank_identity_bound_and_decision_complete(self) -> None:
        template = TEMPLATE.read_text(encoding="utf-8")
        self.assertIn(
            "no review has been requested or\nreceived",
            template,
        )
        self.assertNotIn("[x]", template.lower())

        for digest in (
            "e365e37b52dfcea24c3c26f5130b7ac37a9366ac",
            "7303ab1c2c1f8ea0abfb2abe4d4c56b3111d4b3ccd7e55e714836d6c0ce33f92",
            "42f5cdb1b08ea8fff04fdefc4898dd336c8556c6cafb57f07e1d2139ed0daf28",
        ):
            self.assertIn(digest, template)

        for heading in (
            "Phase A: locked unprimed review",
            "Phase B: targeted comprehension answers",
            "Boundary scoring",
            "Separate visual pass",
            "Revision and disposition log",
        ):
            self.assertIn(heading, template)

        for status in (
            "unprompted",
            "phase_b_only",
            "missing_or_wrong",
            "COLD_READ_PASS",
            "CLAIM_BOUNDARY_REVISION_REQUIRED",
            "PRESENTATION_REVISION_REQUIRED",
            "SCIENTIFIC_OBJECTION_RECORDED_NO_POSTHOC_REPAIR",
            "REVIEW_INCOMPLETE_OR_PRIMED",
        ):
            self.assertIn(status, template)

        packet = (ROOT / "research" / "EXTERNAL_REVIEW_PACKET.md").read_text(
            encoding="utf-8"
        )
        roadmap = (ROOT / "research" / "SUBMISSION_ROADMAP.md").read_text(
            encoding="utf-8"
        )
        readme = (ROOT / "research" / "README.md").read_text(encoding="utf-8")
        for source in (packet, roadmap, readme):
            self.assertIn("EXTERNAL_REVIEW_RESPONSE_TEMPLATE.md", source)


if __name__ == "__main__":
    unittest.main()
