import hashlib
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path


SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "retrieve_method_v3_fresh_maps.py"
SPEC = importlib.util.spec_from_file_location("retrieve_method_v3_fresh_maps", SCRIPT)
assert SPEC and SPEC.loader
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class RetrieveMethodV3FreshMapsTest(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary.name)
        self.repo = self.root / "repo"
        self.repo.mkdir()
        self.payload = b"fresh-map"
        self.sha1 = hashlib.sha1(self.payload).hexdigest()
        self.relative = f"maps/method_v3_fresh_{self.sha1}.map"
        self.catalog = self.root / "catalog.json"
        self.catalog.write_text(json.dumps({
            "outcomeBlind": True,
            "maps": [{
                "path": self.relative,
                "bytes": len(self.payload),
                "sha256": hashlib.sha256(self.payload).hexdigest(),
            }],
        }), encoding="utf-8")

    def tearDown(self) -> None:
        self.temporary.cleanup()

    def test_verifies_existing_exact_bytes_without_network(self) -> None:
        target = self.repo / self.relative
        target.parent.mkdir(parents=True)
        target.write_bytes(self.payload)
        summary = MODULE.retrieve(
            self.repo,
            self.catalog,
            MODULE.DEFAULT_BASE_URL,
            True,
        )
        self.assertEqual(summary, {"requested": 1, "downloaded": 0, "verified": 1})

    def test_downloads_from_content_addressed_endpoint(self) -> None:
        source = self.root / "downloads"
        source.mkdir()
        (source / self.sha1).write_bytes(self.payload)
        summary = MODULE.retrieve(
            self.repo,
            self.catalog,
            source.as_uri(),
            False,
        )
        self.assertEqual(summary, {"requested": 1, "downloaded": 1, "verified": 0})
        self.assertEqual((self.repo / self.relative).read_bytes(), self.payload)

    def test_rejects_existing_byte_drift(self) -> None:
        target = self.repo / self.relative
        target.parent.mkdir(parents=True)
        target.write_bytes(b"wrong")
        with self.assertRaisesRegex(ValueError, "differs from the catalog"):
            MODULE.retrieve(self.repo, self.catalog, MODULE.DEFAULT_BASE_URL, True)

    def test_missing_file_fails_in_verification_mode(self) -> None:
        with self.assertRaisesRegex(FileNotFoundError, "absent in verification mode"):
            MODULE.retrieve(self.repo, self.catalog, MODULE.DEFAULT_BASE_URL, True)


if __name__ == "__main__":
    unittest.main()
