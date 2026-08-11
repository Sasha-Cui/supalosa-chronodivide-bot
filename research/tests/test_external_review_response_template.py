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
            "853e2ffb3693287ee0572b7b8c659befa5f9763d",
            "3b6ce71b2c569aecd8f18ccc40370f5c7ec9dc3bc2f5b1f88ca24ede37dfccd4",
            "d81d64cff4a3e7dc5c3ad7ac49a2f44c2d9f78cd3695c318ca395b6a4dd08413",
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
