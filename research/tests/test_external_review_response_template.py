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
            "9f37a9e15f6676d94d121716c151b8f637c69fb5",
            "93ae48646ea7ac1417a716efc12cda9d69f5b809bdbf2790499b176909ad8c88",
            "c756fa0fab503967df04b594ce8f18cd22429ef2ab8eb2cf1ec648f1c3608060",
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
