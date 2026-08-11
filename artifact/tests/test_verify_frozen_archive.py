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
            "5ed5dad47e9b2902385f4ee873da5c3fb9683bbd",
        )
        summary = MODULE.verify_current_source(ROOT, identity)
        self.assertEqual(
            summary["sha256"],
            "8ede1a73f07bd06dcd8fa5a9c647984a55ecc9101cd715f6bf71171a2fb5b9d1",
        )
        self.assertEqual(summary["sizeBytes"], 101884)
        self.assertEqual(summary["immutableFileCount"], 60)

        with tempfile.TemporaryDirectory() as directory:
            stale = Path(directory) / identity["archive"]["filename"]
            stale.write_bytes(b"not the frozen review artifact")
            with self.assertRaisesRegex(ValueError, "frozen archive mismatch"):
                MODULE.inspect_archive(stale, identity)


if __name__ == "__main__":
    unittest.main()
