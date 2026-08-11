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
            "4c2d011cacb4a3c98bf203153dd300e2075f142c",
            "39356f3a38ac3ffbb789a7298e23a77f51c949d16d207acd74530133882d4117",
            "0b0a5c55a9cbbc123693524597e520922ce927fcc21001cb5dd79b9004914bf6",
            "7674eb4190f422d66da9b7a9e50d464abc0c33894fbbedf85da6cb7a5d302d56",
            "5a7450582b7452a9c568a08247e39cc9e9f0f5e0e1afcc9e9986ec9ef8ca5f21",
            "102,706 bytes",
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
