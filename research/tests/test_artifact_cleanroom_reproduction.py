from __future__ import annotations

import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
AUDIT = ROOT / "research" / "ARTIFACT_CLEANROOM_REPRODUCTION.md"
BUILDER = ROOT / "artifact" / "scripts" / "build_anonymous_artifact.py"


class ArtifactCleanroomReproductionTest(unittest.TestCase):
    def test_audit_binds_exact_archive_outputs_and_scope(self) -> None:
        audit = AUDIT.read_text(encoding="utf-8")
        builder = BUILDER.read_text(encoding="utf-8")

        for expected in (
            "75cdf7a68763007e45c737ee1773aad1cc71ded1",
            "d0e49b55bc76d5d5c103378b23cbc374a9a93353e1380e0283b54421e7d249c4",
            "628482e622a19700d56de5516e2f91ea1b74c48705a879a78d6b3c77ea91f7fc",
            "cc8f656f8ccca9fab1a614d40a80368e0bec08bcfd6fc5dee07b69edb475d127",
            "1,319,409 bytes",
            "60",
            "14 packaged tests",
            "no Git",
            "does not contain or rerun the game",
        ):
            self.assertIn(expected, audit)

        self.assertIn(".tar.gz", builder)
        self.assertNotIn("unzip", audit.lower())
        self.assertIn("not independent gameplay", audit)


if __name__ == "__main__":
    unittest.main()
