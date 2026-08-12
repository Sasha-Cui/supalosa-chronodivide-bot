import argparse
import hashlib
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path


SCRIPT_PATH = Path(__file__).resolve().parents[1] / "scripts" / "freeze_method_v3_family_roles.py"
SPEC = importlib.util.spec_from_file_location("freeze_method_v3_family_roles", SCRIPT_PATH)
assert SPEC and SPEC.loader
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


def write_json(path: Path, value: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2) + "\n", encoding="utf-8")


def make_old_roles(root: Path, public_path: Path, assignments: dict[str, list[str]]) -> None:
    descriptors = {}
    commitments = {}
    for role, family_ids in assignments.items():
        commitment = MODULE.canonical_sha256({"role": role, "targets": family_ids})
        private = {
            "schemaVersion": 1,
            "status": MODULE.OLD_PRIVATE_STATUS,
            "role": role,
            "outcomeBlind": True,
            "roleCommitmentSha256": commitment,
            "targetCount": len(family_ids),
            "targets": [{"familyId": family_id} for family_id in family_ids],
        }
        private_path = root / f"{role}-families.json"
        write_json(private_path, private)
        descriptors[role] = {"file": private_path.name, "sha256": MODULE.sha256_file(private_path)}
        commitments[role] = commitment
    write_json(public_path, {
        "outcomeBlind": True,
        "privateArtifacts": descriptors,
        "roleCommitments": commitments,
    })


class FreezeMethodV3FamilyRolesTest(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.repo = self.root / "repo"
        self.repo.mkdir()
        original_ids = [f"mf_{index:03d}" for index in range(54)]
        original_assignments = {
            "train": original_ids[:14],
            "development": original_ids[14:28],
            "reserve": original_ids[28:41],
            "test": original_ids[41:],
        }
        method_v2_ids = original_assignments["reserve"][:4] + [f"mf_{index:03d}" for index in range(54, 61)]
        self.original_root = self.root / "original-private"
        self.original_public = self.root / "original-public.json"
        self.v2_root = self.root / "v2-private"
        self.v2_public = self.root / "v2-public.json"
        make_old_roles(self.original_root, self.original_public, original_assignments)
        make_old_roles(self.v2_root, self.v2_public, {"development": method_v2_ids})

        family_ids = [f"mf_{index:03d}" for index in range(106)]
        target_rows = []
        catalog_rows = []
        gate_rows = []
        for family_id in family_ids:
            map_path = self.repo / "maps" / f"{family_id}.map"
            map_path.parent.mkdir(exist_ok=True)
            map_path.write_bytes(family_id.encode("ascii"))
            digest = hashlib.sha256(map_path.read_bytes()).hexdigest()
            relative = str(map_path.relative_to(self.repo))
            representative = {"path": relative, "sha256": digest}
            target_rows.append({"familyId": family_id, "representative": representative})
            catalog_rows.append({
                "familyId": family_id,
                "path": relative,
                "sha256": digest,
                "descriptors": {"startCount": 2, "theater": "SNOW"},
            })
            gate_rows.append({"familyId": family_id, "status": "pass"})
        self.catalog = self.root / "catalog.json"
        write_json(self.catalog, {"maps": catalog_rows})
        self.targets = self.root / "targets.json"
        write_json(self.targets, {
            "status": "ROLE_BLIND_FIDELITY_SCREEN_TARGETS_NOT_A_SPLIT",
            "roleBlind": True,
            "outcomeBlind": True,
            "targetCount": len(target_rows),
            "catalogSha256": MODULE.sha256_file(self.catalog),
            "populationCommitmentSha256": "population-commitment",
            "targets": target_rows,
        })
        self.probe = self.root / "probe.json"
        write_json(self.probe, {"outcomeFree": True, "families": []})
        self.gate = self.root / "gate.json"
        write_json(self.gate, {
            "outcomeFree": True,
            "notSealedTestEvidence": True,
            "screenComplete": True,
            "fullCoverage": True,
            "technicalChecksPassed": True,
            "scope": "full",
            "runFamilyCount": len(gate_rows),
            "populationFamilyCount": len(gate_rows),
            "resultSha256": MODULE.sha256_file(self.probe),
            "scheduler": {"account": "pi_jss233", "jobId": "12345"},
            "evidencePipeline": {"technicallyComplete": True, "acceptedCheckpointCount": len(gate_rows)},
            "families": gate_rows,
        })

    def tearDown(self) -> None:
        self.temp.cleanup()

    def args(self) -> argparse.Namespace:
        return argparse.Namespace(
            repo_root=self.repo,
            targets=self.targets,
            catalog=self.catalog,
            gate_summary=self.gate,
            probe_results=self.probe,
            expected_job_id="12345",
            expected_population_count=106,
            original_public_roles=self.original_public,
            original_private_role_root=self.original_root,
            method_v2_public_roles=self.v2_public,
            method_v2_private_role_root=self.v2_root,
        )

    def test_assigns_exact_fresh_roles_by_frozen_hash_rank(self) -> None:
        private, public = MODULE.freeze_roles(self.args())
        self.assertEqual(public["roleCounts"], {
            "train": 16,
            "development_a": 4,
            "development_b": 4,
            "confirmatory": 16,
            "substitute": 5,
        })
        assigned = [row["familyId"] for role in private.values() for row in role["targets"]]
        self.assertEqual(len(assigned), len(set(assigned)))
        self.assertTrue(all(int(family_id.split("_")[1]) >= 61 for family_id in assigned))
        expected = sorted(
            [f"mf_{index:03d}" for index in range(61, 106)],
            key=lambda family_id: (MODULE.rank_sha256(family_id), family_id),
        )
        observed = [
            row["familyId"]
            for role in (*MODULE.ROLE_SLICES, "substitute")
            for row in private[role]["targets"]
        ]
        self.assertEqual(observed, expected)

    def test_fails_closed_when_fresh_pass_capacity_is_below_forty(self) -> None:
        gate = json.loads(self.gate.read_text(encoding="utf-8"))
        for row in gate["families"][-6:]:
            row["status"] = "review"
        write_json(self.gate, gate)
        with self.assertRaisesRegex(ValueError, "requires at least 40"):
            MODULE.freeze_roles(self.args())

    def test_rejects_gate_from_wrong_scheduler_job(self) -> None:
        args = self.args()
        args.expected_job_id = "99999"
        with self.assertRaisesRegex(ValueError, "wrong scheduler job"):
            MODULE.freeze_roles(args)


if __name__ == "__main__":
    unittest.main()
