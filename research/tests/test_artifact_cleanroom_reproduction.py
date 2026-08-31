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
            "4e2ba4eb599ffd37fec5d0f5da620c20dca80fa5",
            "c72719f869e3d26183b3615398dd4e82412a02aff2c16893083c60dec368e741",
            "4b6a2d17bf20c77c46ab4f6c0f010648edcb226862008dbc386fc69a18b62e9b",
            "cc8f656f8ccca9fab1a614d40a80368e0bec08bcfd6fc5dee07b69edb475d127",
            "1,319,395 bytes",
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
