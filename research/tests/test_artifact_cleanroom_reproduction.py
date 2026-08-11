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
            "fb1a59429634b62adb8ca494a7a7f7fb05a1002e",
            "8ede1a73f07bd06dcd8fa5a9c647984a55ecc9101cd715f6bf71171a2fb5b9d1",
            "617f5e3e8b0b7c209e4c7c92aaa4db432e72b1f407d8e09aea08b4cd8834a82d",
            "7674eb4190f422d66da9b7a9e50d464abc0c33894fbbedf85da6cb7a5d302d56",
            "4bd0048eedb7c8ddeeb1d42b0552d402ea18ec9cfe702e9bd82c01fb0c673463",
            "101,884 bytes",
            "tar -xzf",
            "Python: 3.12.3",
            "TeX Live 2024",
            "60 immutable files",
            "22 packaged manuscript tests",
            "no Git tree",
            "does not reproduce\nsimulations",
        ):
            self.assertIn(expected, audit)

        self.assertIn(".tar.gz", builder)
        self.assertNotIn("unzip", audit.lower())
        self.assertNotIn("zip file", audit.lower())


if __name__ == "__main__":
    unittest.main()
