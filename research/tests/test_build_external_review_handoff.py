from __future__ import annotations

import hashlib
from pathlib import Path
import tempfile
import unittest
from zipfile import ZipFile

from research.scripts.build_external_review_handoff import (
    ARCHIVE_MEMBERS,
    CANDIDATES,
    FORBIDDEN_PROMPT_CUES,
    PROMPT,
    build_handoff,
    validate_prompt,
)


ROOT = Path(__file__).resolve().parents[2]


class ExternalReviewHandoffTest(unittest.TestCase):
    def test_tracked_prompt_is_neutral(self) -> None:
        prompt = PROMPT.read_text(encoding="utf-8")
        validate_prompt(prompt)
        lowered = prompt.lower()
        for cue in FORBIDDEN_PROMPT_CUES:
            self.assertNotIn(cue, lowered)

    def test_candidate_identity_matches_final_controls(self) -> None:
        self.assertEqual(set(CANDIDATES), {"icaart"})
        candidate = CANDIDATES["icaart"]
        self.assertEqual(
            candidate.source_commit,
            "4e2ba4eb599ffd37fec5d0f5da620c20dca80fa5",
        )
        self.assertEqual(
            candidate.pdf_sha256,
            "4b6a2d17bf20c77c46ab4f6c0f010648edcb226862008dbc386fc69a18b62e9b",
        )
        controls = "\n".join(
            (ROOT / "research" / name).read_text(encoding="utf-8")
            for name in (
                "EXTERNAL_REVIEW_PACKET.md",
                "EXTERNAL_REVIEW_RESPONSE_TEMPLATE.md",
            )
        )
        self.assertIn(candidate.source_commit, controls)
        self.assertIn(candidate.pdf_sha256, controls)

    def test_builder_is_deterministic_minimal_and_fail_closed(self) -> None:
        pdf_payload = b"%PDF-1.4\nminimal identity fixture\n%%EOF\n"
        pdf_sha256 = hashlib.sha256(pdf_payload).hexdigest()
        prompt = (
            "Relevance, originality, technical quality, significance, and "
            "presentation. Give acceptance and rejection arguments and vote "
            "accept, borderline, or reject.\n"
        )

        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            pdf = root / "paper.pdf"
            prompt_path = root / "prompt.txt"
            first = root / "first.zip"
            second = root / "second.zip"
            pdf.write_bytes(pdf_payload)
            prompt_path.write_text(prompt, encoding="utf-8")

            first_record = build_handoff(
                pdf_path=pdf,
                expected_pdf_sha256=pdf_sha256,
                prompt_path=prompt_path,
                output_path=first,
            )
            second_record = build_handoff(
                pdf_path=pdf,
                expected_pdf_sha256=pdf_sha256,
                prompt_path=prompt_path,
                output_path=second,
            )
            self.assertEqual(first.read_bytes(), second.read_bytes())
            self.assertEqual(
                first_record["archiveSha256"], second_record["archiveSha256"]
            )
            with ZipFile(first) as archive:
                self.assertEqual(tuple(archive.namelist()), ARCHIVE_MEMBERS)
                self.assertEqual(archive.read(ARCHIVE_MEMBERS[0]), pdf_payload)
                self.assertEqual(
                    archive.read(ARCHIVE_MEMBERS[1]), prompt.encode("utf-8")
                )
                for info in archive.infolist():
                    self.assertEqual(info.date_time, (1980, 1, 1, 0, 0, 0))
                    self.assertEqual((info.external_attr >> 16) & 0o777, 0o644)

            with self.assertRaises(ValueError):
                build_handoff(
                    pdf_path=pdf,
                    expected_pdf_sha256="0" * 64,
                    prompt_path=prompt_path,
                    output_path=root / "mismatch.zip",
                )
            self.assertFalse((root / "mismatch.zip").exists())

            with self.assertRaises(FileExistsError):
                build_handoff(
                    pdf_path=pdf,
                    expected_pdf_sha256=pdf_sha256,
                    prompt_path=prompt_path,
                    output_path=first,
                )


if __name__ == "__main__":
    unittest.main()
