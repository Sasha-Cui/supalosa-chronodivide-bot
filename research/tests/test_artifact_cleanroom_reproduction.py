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
            "6388f1a4243801f6b79d780844327c831a4290f4",
            "acbff70447321a43e753fab57f33858fa9797d4105970d627918aa69f08eb6e3",
            "b832744aa64b790044c706f3c64c797f6674b4e5549b48dc88dd49858de0cb77",
            "ec0c2877d3921978e4d460c41ada94fe2a774d60d5a22ad8946eea728bb3fd8d",
            "1,319,412 bytes",
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
