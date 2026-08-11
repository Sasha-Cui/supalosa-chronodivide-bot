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
            "5ed5dad47e9b2902385f4ee873da5c3fb9683bbd",
            "617f5e3e8b0b7c209e4c7c92aaa4db432e72b1f407d8e09aea08b4cd8834a82d",
            "4bd0048eedb7c8ddeeb1d42b0552d402ea18ec9cfe702e9bd82c01fb0c673463",
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
