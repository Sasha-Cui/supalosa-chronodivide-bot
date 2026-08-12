import hashlib
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path


SCRIPT = (
    Path(__file__).resolve().parents[1]
    / "scripts"
    / "freeze_method_v3_fresh_fidelity_population.py"
)
SPEC = importlib.util.spec_from_file_location(
    "freeze_method_v3_fresh_fidelity_population",
    SCRIPT,
)
assert SPEC and SPEC.loader
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


def write_json(path: Path, value: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2) + "\n", encoding="utf-8")


class FreezeMethodV3FreshFidelityPopulationTest(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary.name)
        self.repo = self.root / "repo"
        self.repo.mkdir()
        self.source_rows = []
        self.family_rows = []
        for family_id, payload in (("mf_zulu", b"zulu-map"), ("mf_alpha", b"alpha-map")):
            sha1 = hashlib.sha1(payload).hexdigest()
            source_relative = f"tmp/source/fresh_{sha1}.map"
            source_path = self.repo / source_relative
            source_path.parent.mkdir(parents=True, exist_ok=True)
            source_path.write_bytes(payload)
            self.source_rows.append({
                "basename": source_path.name,
                "bytes": len(payload),
                "descriptors": {"startCount": 2, "theater": "TEMPERATE"},
                "familyId": family_id,
                "path": source_relative,
                "sha256": hashlib.sha256(payload).hexdigest(),
            })
            self.family_rows.append({
                "contentHashCount": 1,
                "contentHashes": [hashlib.sha256(payload).hexdigest()],
                "evidenceBasedDevelopmentEligibility": {"eligible": True},
                "familyId": family_id,
                "mapCount": 1,
                "mapPaths": [source_relative],
            })
        self.source_catalog = self.root / "source-catalog.json"
        write_json(self.source_catalog, {
            "schemaVersion": 2,
            "outcomeBlind": True,
            "families": self.family_rows,
            "maps": self.source_rows,
        })

    def tearDown(self) -> None:
        self.temporary.cleanup()

    def build(self, *, materialize: bool = False):
        return MODULE.build_artifacts(
            self.repo,
            self.source_catalog,
            expected_count=2,
            expected_source_sha256=MODULE.sha256_file(self.source_catalog),
            materialize=materialize,
        )

    def test_builds_role_blind_population_and_materializes_exact_bytes(self) -> None:
        catalog, targets = self.build(materialize=True)
        self.assertEqual(targets["status"], MODULE.STATUS)
        self.assertTrue(targets["outcomeBlind"])
        self.assertTrue(targets["roleBlind"])
        self.assertFalse(targets["isSplit"])
        self.assertFalse(targets["finalSplit"])
        self.assertEqual(targets["targetCount"], 2)
        self.assertEqual(
            [row["familyId"] for row in targets["targets"]],
            ["mf_alpha", "mf_zulu"],
        )
        self.assertEqual(
            targets["populationCommitmentSha256"],
            MODULE.canonical_sha256(targets["targets"]),
        )
        self.assertEqual(
            targets["catalogSha256"],
            hashlib.sha256(MODULE.render_json(catalog)).hexdigest(),
        )
        self.assertEqual(
            catalog["methodV3FreshPopulationProvenance"]["roleAssignment"],
            "none",
        )
        for row in catalog["maps"]:
            path = self.repo / row["path"]
            self.assertTrue(path.is_file())
            self.assertEqual(path.stat().st_size, row["bytes"])
            self.assertEqual(MODULE.sha256_file(path), row["sha256"])

    def test_rejects_source_content_drift(self) -> None:
        source_path = self.repo / self.source_rows[0]["path"]
        source_path.write_bytes(b"different")
        with self.assertRaisesRegex(ValueError, "bytes differ"):
            self.build()

    def test_rejects_duplicate_family_identity(self) -> None:
        source = json.loads(self.source_catalog.read_text(encoding="utf-8"))
        source["families"][1]["familyId"] = source["families"][0]["familyId"]
        write_json(self.source_catalog, source)
        with self.assertRaisesRegex(ValueError, "unique eligible family"):
            self.build()

    def test_refuses_to_replace_different_materialized_bytes(self) -> None:
        catalog, _ = self.build()
        target = self.repo / catalog["maps"][0]["path"]
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(b"wrong")
        with self.assertRaisesRegex(FileExistsError, "different destination"):
            self.build(materialize=True)


if __name__ == "__main__":
    unittest.main()
