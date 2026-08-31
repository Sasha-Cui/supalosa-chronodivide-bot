from __future__ import annotations

import re
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
PACKET = ROOT / "research" / "HUMAN_AUTHOR_VERIFICATION_PACKET.md"


class HumanAuthorVerificationPacketTest(unittest.TestCase):
    def test_packet_covers_every_citation_and_accountability_boundary(self) -> None:
        packet = PACKET.read_text(encoding="utf-8")
        bibliography = (ROOT / "paper" / "references.bib").read_text(
            encoding="utf-8"
        )
        keys = re.findall(r"^@[A-Za-z]+\{([^,]+),", bibliography, re.MULTILINE)
        self.assertEqual(len(keys), 30)
        for key in keys:
            rendered = chr(96) + key + chr(96)
            self.assertIn(rendered, packet, key)

        required_paths = (
            "research/artifacts/final_paper_evidence_v1.json",
            "research/RESULT_REGISTRY.tsv",
            "research/SUBSTANTIVE_CITATION_AUDIT.md",
            "research/ARTIFACT_CLEANROOM_REPRODUCTION.md",
            "research/CONTACT_TEMPLATES.md",
            "research/ICAART_RULING_RESPONSE_TEMPLATE.md",
            "artifact/THIRD_PARTY.md",
        )
        for relative in required_paths:
            self.assertTrue((ROOT / relative).is_file(), relative)
            self.assertIn(relative, packet)

        for heading in (
            "Claim-by-claim manuscript approval",
            "Independent numerical verification",
            "Citation-by-citation source reading",
            "Adaptation, sealing, and scheduler history",
            "Author-owned code review",
            "Confidentiality, rights, and release review",
            "Venue ruling and disclosure approval",
        ):
            self.assertIn(heading, packet)

        for identity in (
            "6388f1a4243801f6b79d780844327c831a4290f4",
            "b832744aa64b790044c706f3c64c797f6674b4e5549b48dc88dd49858de0cb77",
            "acbff70447321a43e753fab57f33858fa9797d4105970d627918aa69f08eb6e3",
        ):
            self.assertIn(identity, packet)

        self.assertNotIn("[x]", packet.lower())
        self.assertIn("template only; human verification not yet complete", packet)


if __name__ == "__main__":
    unittest.main()
