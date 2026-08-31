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

        for document in (reconciliation, strategy):
            self.assertIn("2026-09-15", document)
            self.assertIn("2027-02-23 through 2027-02-25", document)
            self.assertIn("remot", document.lower())

        self.assertIn("1,319,395-byte", reconciliation)
        self.assertIn("no updates are accepted after that", reconciliation)
        self.assertIn("public generative-AI", reconciliation)
        self.assertIn("under review", reconciliation)
        self.assertIn("11--15 September", roadmap)
        self.assertIn("remote", checklist.lower())
        self.assertIn("generative-AI disclosure", checklist)


if __name__ == "__main__":
    unittest.main()
