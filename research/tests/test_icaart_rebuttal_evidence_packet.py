from __future__ import annotations

from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[2]
PACKET = ROOT / "research" / "ICAART_REBUTTAL_EVIDENCE_PACKET.md"


class IcaartRebuttalEvidencePacketTest(unittest.TestCase):
    def test_packet_is_bound_complete_and_claim_safe(self) -> None:
        text = PACKET.read_text(encoding="utf-8")

        for identity in (
            "75cdf7a68763007e45c737ee1773aad1cc71ded1",
            "628482e622a19700d56de5516e2f91ea1b74c48705a879a78d6b3c77ea91f7fc",
            "cc8f656f8ccca9fab1a614d40a80368e0bec08bcfd6fc5dee07b69edb475d127",
            "d0e49b55bc76d5d5c103378b23cbc374a9a93353e1380e0283b54421e7d249c4",
        ):
            self.assertIn(identity, text)

        for fact in (
            "3,166 claim-bearing games",
            "633/24/63",
            "85.78%",
            "134/14/32",
            "92/16/72",
            "+0.167",
            "79/19/262",
            "15 deterministic frames",
            "does not claim universal superiority",
            "No new outcome-bearing",
        ):
            self.assertIn(fact, text)

        for objection in range(1, 11):
            self.assertIn(f"### {objection}.", text)

        self.assertEqual(text.count("final_paper_evidence_v1.json"), 1)
        self.assertIn("do not provide confidential reviews or rebuttal text", text)
        self.assertIn("New empirical analysis performed: none", text)


if __name__ == "__main__":
    unittest.main()
