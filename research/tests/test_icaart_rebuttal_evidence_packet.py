from __future__ import annotations

from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[2]
PACKET = ROOT / "research" / "ICAART_REBUTTAL_EVIDENCE_PACKET.md"
RESEARCH = ROOT / "research"


class IcaartRebuttalEvidencePacketTest(unittest.TestCase):
    def test_packet_is_bound_complete_and_claim_safe(self) -> None:
        text = PACKET.read_text(encoding="utf-8")

        for identity in (
            "ccc0c101de207a7100fd553e15efc4fa18108a35",
            "98500e11d7ccaa6d1c0f88f2e741b499737124cdac1565190379029bc82c4c07",
            "285af4e101ea36d6e5190a3c0ceb5d4a52ded5e56f96210b1295360bb077e4ca",
            "39f761b1cb0b9fe587b197be9151e63f0ee1368b883cbf541f2bb86c33ea5437",
        ):
            self.assertIn(identity, text)

        for fact in (
            "8,704 policy games",
            "512 games",
            "16 sealed map",
            "0.336",
            "[0.215, 0.457]",
            "-0.021",
            "does **not** establish that StrongBot reliably beats",
            "not** the map-profile-enabled deployed StrongBot default",
            "no new outcome-bearing",
        ):
            self.assertIn(fact, text)

        for objection in range(1, 13):
            self.assertIn(f"### {objection}.", text)

        for aggregate in (
            "supported_temperate_families_v1.json",
            "family_role_commitments_v1.json",
            "method_v2_confirmatory_result_v1.json",
            "accepted_compute_accounting_v1.json",
        ):
            self.assertIn(aggregate, text)

        self.assertIn("do not provide reviews, rebuttal text", text)
        self.assertIn("New empirical analysis performed: none", text)
        self.assertNotIn("StrongBot reliably beats Supalosa.", text.replace(
            "does **not** establish that StrongBot reliably beats Supalosa.", ""
        ))

        for control in (
            "AUTHORSHIP_AND_AI_POLICY.md",
            "SUBMISSION_ROADMAP.md",
            "SUBMISSION_CHECKLIST.md",
            "STATUS.md",
        ):
            control_text = (RESEARCH / control).read_text(encoding="utf-8")
            self.assertIn("ICAART_REBUTTAL_EVIDENCE_PACKET.md", control_text)


if __name__ == "__main__":
    unittest.main()
