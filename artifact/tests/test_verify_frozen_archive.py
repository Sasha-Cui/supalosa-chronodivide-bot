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
            "75cdf7a68763007e45c737ee1773aad1cc71ded1",
        )
        summary = MODULE.verify_current_source(ROOT, identity)
        self.assertEqual(
            summary["sha256"],
            "d0e49b55bc76d5d5c103378b23cbc374a9a93353e1380e0283b54421e7d249c4",
        )
        self.assertEqual(summary["sizeBytes"], 1_319_409)
        self.assertEqual(summary["immutableFileCount"], 60)

        with tempfile.TemporaryDirectory() as directory:
            stale = Path(directory) / identity["archive"]["filename"]
            stale.write_bytes(b"not the frozen review artifact")
            with self.assertRaisesRegex(ValueError, "frozen archive mismatch"):
                MODULE.inspect_archive(stale, identity)


if __name__ == "__main__":
    unittest.main()
