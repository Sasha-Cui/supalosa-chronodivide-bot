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
            "92a4c870b6e697682b51fa41fd0f785c97c6b121",
            "c44c0d5739a33ae4155c18f0eba8c480785f4e3e1b9e2250dc03a43733a6d0a1",
            "7d4c26640a5f4da34783d1a533c8cfeb807d2d7b37a1e52acdc37b8cf6386c07",
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
