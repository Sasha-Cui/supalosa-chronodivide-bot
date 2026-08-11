from __future__ import annotations

import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]


class IcaartPolicyReconciliationTest(unittest.TestCase):
    def test_current_public_contract_is_consistent_across_handoff_docs(self) -> None:
        reconciliation = (
            ROOT / "research" / "ICAART_POLICY_RECONCILIATION.md"
        ).read_text(encoding="utf-8")
        strategy = (ROOT / "research" / "VENUE_STRATEGY.md").read_text(
            encoding="utf-8"
        )
        roadmap = (ROOT / "research" / "SUBMISSION_ROADMAP.md").read_text(
            encoding="utf-8"
        )
        checklist = (ROOT / "research" / "SUBMISSION_CHECKLIST.md").read_text(
            encoding="utf-8"
        )
        authorship = (ROOT / "research" / "AUTHORSHIP_AND_AI_POLICY.md").read_text(
            encoding="utf-8"
        )

        self.assertIn("2027-02-23 through 2027-02-25", reconciliation)
        self.assertIn("2027-02-23 through 2027-02-25", strategy)
        self.assertNotIn("2027-02-23 through 2027-02-26", strategy)
        self.assertIn("103,324-byte", reconciliation)
        self.assertNotIn("100,837-byte", reconciliation)
        self.assertIn("visually validated at 11\npages", roadmap)

        for document in (reconciliation, strategy, checklist, authorship):
            self.assertIn("under-review", document.lower())
            self.assertIn("public", document.lower())
            self.assertIn("generative-ai", document.lower())


if __name__ == "__main__":
    unittest.main()
