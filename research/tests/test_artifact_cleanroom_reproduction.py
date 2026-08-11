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
            "92a4c870b6e697682b51fa41fd0f785c97c6b121",
            "10f270f49d38d2a3d2175f598795fca8d8e7ca57c5736f0971e2462d2ee42d0c",
            "c44c0d5739a33ae4155c18f0eba8c480785f4e3e1b9e2250dc03a43733a6d0a1",
            "7674eb4190f422d66da9b7a9e50d464abc0c33894fbbedf85da6cb7a5d302d56",
            "7d4c26640a5f4da34783d1a533c8cfeb807d2d7b37a1e52acdc37b8cf6386c07",
            "102,179 bytes",
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
