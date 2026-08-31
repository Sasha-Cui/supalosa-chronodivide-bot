from __future__ import annotations

from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[2]
PACKET = ROOT / "research" / "ICAART_REBUTTAL_EVIDENCE_PACKET.md"


class IcaartRebuttalEvidencePacketTest(unittest.TestCase):
    def test_packet_is_bound_complete_and_claim_safe(self) -> None:
        text = PACKET.read_text(encoding="utf-8")

        for identity in (
            "4e2ba4eb599ffd37fec5d0f5da620c20dca80fa5",
            "4b6a2d17bf20c77c46ab4f6c0f010648edcb226862008dbc386fc69a18b62e9b",
            "cc8f656f8ccca9fab1a614d40a80368e0bec08bcfd6fc5dee07b69edb475d127",
            "c72719f869e3d26183b3615398dd4e82412a02aff2c16893083c60dec368e741",
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
