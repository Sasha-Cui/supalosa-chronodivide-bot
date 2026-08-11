from __future__ import annotations

import importlib.util
from pathlib import Path
import tempfile
import unittest


ROOT = Path(__file__).parents[2]
SCRIPT = ROOT / "artifact" / "scripts" / "verify_frozen_archive.py"
SPEC = importlib.util.spec_from_file_location("verify_frozen_archive", SCRIPT)
assert SPEC is not None and SPEC.loader is not None
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class VerifyFrozenArchiveTest(unittest.TestCase):
    def test_source_rebuild_matches_identity_and_stale_archive_fails(self) -> None:
        identity = MODULE.load_identity(ROOT)
        self.assertEqual(
            identity["reviewedManuscriptSourceGitCommit"],
            "4c2d011cacb4a3c98bf203153dd300e2075f142c",
        )
        summary = MODULE.verify_current_source(ROOT, identity)
        self.assertEqual(
            summary["sha256"],
            "39356f3a38ac3ffbb789a7298e23a77f51c949d16d207acd74530133882d4117",
        )
        self.assertEqual(summary["sizeBytes"], 102706)
        self.assertEqual(summary["immutableFileCount"], 60)

        with tempfile.TemporaryDirectory() as directory:
            stale = Path(directory) / identity["archive"]["filename"]
            stale.write_bytes(b"not the frozen review artifact")
            with self.assertRaisesRegex(ValueError, "frozen archive mismatch"):
                MODULE.inspect_archive(stale, identity)


if __name__ == "__main__":
    unittest.main()
