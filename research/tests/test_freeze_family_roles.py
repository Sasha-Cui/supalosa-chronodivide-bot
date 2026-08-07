import hashlib
import importlib.util
import json
import tempfile
import unittest
from collections import Counter
from pathlib import Path


SCRIPT = Path(__file__).parents[1] / "scripts" / "freeze_family_roles.py"
SPEC = importlib.util.spec_from_file_location("freeze_family_roles", SCRIPT)
assert SPEC and SPEC.loader
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class FreezeFamilyRolesTest(unittest.TestCase):
    QUOTAS = {
        2: {"train": 1, "development": 1, "test": 1, "reserve": 1},
        4: {"train": 1, "development": 1, "test": 1, "reserve": 1},
    }

    def make_fixture(self, root: Path, remove_one: bool = False):
        maps = []
        targets = []
        for start_count in (2, 4):
            for index in range(4):
                family_id = f"mf_{start_count}_{index}"
                path = f"maps/{family_id}.map"
                digest = hashlib.sha256(path.encode()).hexdigest()
                targets.append({"familyId": family_id, "representative": {"path": path, "sha256": digest}})
                maps.append({
                    "path": path,
                    "sha256": digest,
                    "familyId": family_id,
                    "descriptors": {
                        "theater": "TEMPERATE",
                        "startCount": start_count,
                        "size": {"width": 50 + index * 7, "height": 60 + index * 3},
                        "localSize": {"width": 45 + index * 7, "height": 55 + index * 3},
                    },
                })
        if remove_one:
            targets.pop()
        population = {
            "status": "SUPPORTED_TEMPERATE_POPULATION_NOT_A_SPLIT",
            "outcomeBlind": True,
            "roleBlind": True,
            "isSplit": False,
            "targetCount": len(targets),
            "catalogSha256": "placeholder",
            "targets": targets,
        }
        population["populationCommitmentSha256"] = MODULE.canonical_sha256(targets)
        catalog = {"outcomeBlind": True, "maps": maps}
        catalog_path = root / "catalog.json"
        catalog_path.write_text(json.dumps(catalog), encoding="utf-8")
        population["catalogSha256"] = MODULE.sha256_file(catalog_path)
        population_path = root / "population.json"
        population_path.write_text(json.dumps(population), encoding="utf-8")
        return population_path, catalog_path

    def build_fixture_artifacts(self, root: Path):
        population_path, catalog_path = self.make_fixture(root)
        public, private, salt_text = MODULE.build_artifacts(
            population_path,
            catalog_path,
            b"s" * 32,
            quotas=self.QUOTAS,
            candidate_count=32,
            substitute_start_counts=(2, 4),
        )
        return population_path, catalog_path, public, private, salt_text

    def test_fixed_roles_partition_population_without_public_identities(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            _, _, public, private, _ = self.build_fixture_artifacts(root)
            self.assertEqual(public["roleCounts"], {role: 2 for role in MODULE.ROLE_ORDER})
            self.assertNotIn("targets", public)
            identities = [row["familyId"] for payload in private.values() for row in payload["targets"]]
            self.assertEqual(len(identities), len(set(identities)))
            self.assertEqual(len(identities), 8)
            self.assertEqual(
                Counter(row["diagnosticRole"] for row in private["development"]["targets"]),
                {"substitute": 2},
            )

    def test_assignment_is_reproducible_for_same_salt(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            population, catalog, public, private, _ = self.build_fixture_artifacts(root)
            second_public, second_private, _ = MODULE.build_artifacts(
                population,
                catalog,
                b"s" * 32,
                quotas=self.QUOTAS,
                candidate_count=32,
                substitute_start_counts=(2, 4),
            )
            self.assertEqual(public, second_public)
            self.assertEqual(private, second_private)

    def test_rejects_start_count_quota_mismatch(self):
        records = [
            {"familyId": "a", "descriptors": {"startCount": 2}},
            {"familyId": "b", "descriptors": {"startCount": 2}},
        ]
        with self.assertRaisesRegex(ValueError, "sums to"):
            MODULE.validate_quotas(records, {2: {"train": 1, "development": 0, "test": 0, "reserve": 0}})

    def test_private_and_public_artifacts_round_trip(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            _, _, public, private, salt_text = self.build_fixture_artifacts(root)
            public_path = root / "public.json"
            private_root = root / "private"
            final = MODULE.write_new_artifacts(public_path, private_root, public, private, salt_text)
            verified = MODULE.verify_existing(public_path, private_root, public, private, salt_text)
            self.assertEqual(final, verified)
            self.assertEqual(private_root.stat().st_mode & 0o077, 0)
            self.assertTrue(all(path.stat().st_mode & 0o077 == 0 for path in private_root.iterdir()))


if __name__ == "__main__":
    unittest.main()
