from __future__ import annotations

from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[2]
PACKET = ROOT / "research" / "ICAART_REBUTTAL_EVIDENCE_PACKET.md"


class IcaartRebuttalEvidencePacketTest(unittest.TestCase):
    def test_packet_is_bound_complete_and_claim_safe(self) -> None:
        text = PACKET.read_text(encoding="utf-8")

        for identity in (
            "6388f1a4243801f6b79d780844327c831a4290f4",
            "b832744aa64b790044c706f3c64c797f6674b4e5549b48dc88dd49858de0cb77",
            "ec0c2877d3921978e4d460c41ada94fe2a774d60d5a22ad8946eea728bb3fd8d",
            "acbff70447321a43e753fab57f33858fa9797d4105970d627918aa69f08eb6e3",
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
