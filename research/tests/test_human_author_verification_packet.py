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
            self.assertIn(f"`{key}`", packet, key)

        required_paths = (
            "research/artifacts/method_v2_confirmatory_result_v1.json",
            "research/artifacts/method_v2_confirmatory_family_diagnostics_v1.json",
            "research/artifacts/accepted_compute_accounting_v1.json",
            "research/artifacts/method_v2_mechanism_ablation_result_v1.json",
            "research/artifacts/method_v2_component_ablation_result_v1.json",
            "research/artifacts/method_v2_terminal_state_analysis_v1.json",
            "research/artifacts/family_role_commitments_v1.json",
            "research/RESULT_REGISTRY.tsv",
            "research/EMPIRICAL_COMPLETION_AUDIT.md",
            "research/CONFIRMATORY_PROTOCOL.md",
            "research/METHOD_V2_DEVELOPMENT_AMENDMENT_1.md",
            "research/ANONYMITY_RELEASE_RISK.md",
            "research/AUTHORSHIP_AND_AI_POLICY.md",
            "research/CITATION_INTEGRITY_AUDIT.md",
            "research/SUBSTANTIVE_CITATION_AUDIT.md",
            "research/CONTACT_TEMPLATES.md",
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

        self.assertNotIn("[x]", packet.lower())
        self.assertIn("template only; human verification not yet complete", packet)


if __name__ == "__main__":
    unittest.main()
