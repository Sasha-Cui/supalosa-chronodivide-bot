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
            "ccc0c101de207a7100fd553e15efc4fa18108a35",
            "74c038f20daf4cae2c95c1fc930ebc862304eda52442afda724a2f83f1fa7fb0",
            "efcc9856799493fdb93b29f58ad895abee7b0822d075297433f273507a25aaa3",
            "7674eb4190f422d66da9b7a9e50d464abc0c33894fbbedf85da6cb7a5d302d56",
            "98500e11d7ccaa6d1c0f88f2e741b499737124cdac1565190379029bc82c4c07",
            "102,615 bytes",
            "tar -xzf",
            "Python: 3.12.3",
            "TeX Live 2024",
            "60 immutable files",
            "23 packaged manuscript tests",
            "no Git tree",
            "does not reproduce\nsimulations",
        ):
            self.assertIn(expected, audit)

        self.assertIn(".tar.gz", builder)
        self.assertNotIn("unzip", audit.lower())
        self.assertNotIn("zip file", audit.lower())


if __name__ == "__main__":
    unittest.main()
