from __future__ import annotations

import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
TEMPLATE = ROOT / "research" / "EXTERNAL_REVIEW_RESPONSE_TEMPLATE.md"


class ExternalReviewResponseTemplateTest(unittest.TestCase):
    def test_template_is_blank_identity_bound_and_decision_complete(self) -> None:
        template = TEMPLATE.read_text(encoding="utf-8")
        self.assertIn("no review has been requested or received", " ".join(template.split()))
        self.assertNotIn("[x]", template.lower())

        for digest in (
            "75cdf7a68763007e45c737ee1773aad1cc71ded1",
            "628482e622a19700d56de5516e2f91ea1b74c48705a879a78d6b3c77ea91f7fc",
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


if __name__ == "__main__":
    unittest.main()
