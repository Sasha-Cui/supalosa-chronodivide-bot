import hashlib
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path


SCRIPT = Path(__file__).parents[1] / "scripts" / "select_temperate_fidelity_targets.py"
SPEC = importlib.util.spec_from_file_location("select_temperate_fidelity_targets", SCRIPT)
assert SPEC and SPEC.loader
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class SelectTemperateFidelityTargetsTest(unittest.TestCase):
    def make_fixture(self, root: Path) -> Path:
        maps = root / "maps"
        maps.mkdir()
        targets = []
        for family_id, theater in (("mf_temp", "TEMPERATE"), ("mf_snow", "SNOW")):
            path = maps / f"{family_id}.map"
            path.write_text(f"[Map]\nTheater={theater}\n", encoding="latin-1")
            targets.append({
                "familyId": family_id,
                "representative": {
                    "path": path.relative_to(root).as_posix(),
                    "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
                },
            })
        source = {
            "schemaVersion": 3,
            "status": MODULE.STATUS,
            "outcomeBlind": True,
            "roleBlind": True,
            "finalSplit": False,
            "isSplit": False,
            "catalogSha256": "a" * 64,
            "representativeFidelityPolicy": "fixed representative",
            "populationCommitmentRule": "canonical target list",
            "populationCommitmentSha256": MODULE.canonical_sha256(targets),
            "targetCount": 2,
            "targets": targets,
        }
        source_path = root / "targets.json"
        source_path.write_text(json.dumps(source), encoding="utf-8")
        return source_path

    def test_selects_only_exact_temperate_representatives(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            artifact = MODULE.build_artifact(root, self.make_fixture(root), 1)
            self.assertEqual(artifact["targetCount"], 1)
            self.assertEqual([row["familyId"] for row in artifact["targets"]], ["mf_temp"])
            self.assertEqual(
                artifact["populationCommitmentSha256"],
                MODULE.canonical_sha256(artifact["targets"]),
            )

    def test_rejects_representative_hash_drift(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source_path = self.make_fixture(root)
            (root / "maps" / "mf_temp.map").write_text("[Map]\nTheater=URBAN\n", encoding="latin-1")
            with self.assertRaisesRegex(ValueError, "bytes do not match"):
                MODULE.build_artifact(root, source_path, 1)


if __name__ == "__main__":
    unittest.main()
