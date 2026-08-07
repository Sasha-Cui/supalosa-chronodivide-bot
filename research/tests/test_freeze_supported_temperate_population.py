import hashlib
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path


SCRIPT = Path(__file__).parents[1] / "scripts" / "freeze_supported_temperate_population.py"
SPEC = importlib.util.spec_from_file_location("freeze_supported_temperate_population", SCRIPT)
assert SPEC and SPEC.loader
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class FreezeSupportedTemperatePopulationTest(unittest.TestCase):
    def make_fixture(self, root: Path, drift_confirmation: bool = False):
        maps = root / "maps"
        maps.mkdir()
        targets = []
        for family_id in ("mf_pass", "mf_review"):
            path = maps / f"{family_id}.map"
            path.write_text("[Map]\nTheater=TEMPERATE\n", encoding="latin-1")
            targets.append({
                "familyId": family_id,
                "representative": {
                    "path": path.relative_to(root).as_posix(),
                    "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
                },
            })
        source = {
            "schemaVersion": 3,
            "status": "ROLE_BLIND_FIDELITY_SCREEN_TARGETS_NOT_A_SPLIT",
            "outcomeBlind": True,
            "roleBlind": True,
            "finalSplit": False,
            "isSplit": False,
            "selectionTheater": "TEMPERATE",
            "catalogSha256": "a" * 64,
            "populationCommitmentRule": "canonical target list",
            "populationCommitmentSha256": MODULE.canonical_sha256(targets),
            "targetCount": len(targets),
            "targets": targets,
        }
        source_path = root / "targets.json"
        source_path.write_text(json.dumps(source), encoding="utf-8")
        expected_counts = {"requested": 2, "run": 2, "pass": 1, "review": 1, "fail": 0}
        execution_paths = []
        for job_id in ("100", "101"):
            families = []
            for index, target in enumerate(targets):
                status = "pass" if index == 0 else "review"
                reviews = [] if status == "pass" else ["runner:warning_invalid_object"]
                if drift_confirmation and job_id == "101" and index == 0:
                    reviews = ["unexpected_drift"]
                families.append({
                    "familyId": target["familyId"],
                    "mapName": Path(target["representative"]["path"]).name,
                    "mapSha256": target["representative"]["sha256"],
                    "representativeMapPath": target["representative"]["path"],
                    "status": status,
                    "failures": [],
                    "reviews": reviews,
                    "warningCategoryCounts": {} if status == "pass" else {"invalid_object": 1},
                    "slurmJobId": job_id,
                })
            gate = {
                "schemaVersion": 2,
                "artifactKind": "infrastructure_fidelity_full_summary_not_policy_evaluation",
                "outcomeFree": True,
                "notSealedTestEvidence": True,
                "scope": "full",
                "fullCoverage": True,
                "screenComplete": True,
                "technicalChecksPassed": True,
                "populationFamilyCount": 2,
                "runFamilyCount": 2,
                "familyCounts": expected_counts,
                "scheduler": {"jobId": job_id, "account": "pi_jss233"},
                "provenance": {
                    "targetManifestSha256": MODULE.sha256_file(source_path),
                    "targetPopulationCommitmentSha256": source["populationCommitmentSha256"],
                    "catalogSha256": source["catalogSha256"],
                    "sourceCommit": hashlib.sha1(job_id.encode()).hexdigest(),
                    "sourceBundleSha256": "b" * 64,
                    "runtimeBundleSha256": "c" * 64,
                },
                "families": families,
            }
            gate_path = root / f"gate-{job_id}.json"
            gate_path.write_text(json.dumps(gate), encoding="utf-8")
            verification = {
                "schemaVersion": 1,
                "artifactKind": "independent_map_fidelity_execution_verification",
                "jobId": job_id,
                "outcomeFree": True,
                "scope": "full",
                "profile": "temperate",
                "result": {
                    "familyCounts": expected_counts,
                    "notPolicyEvidence": True,
                    "technicalChecksPassed": True,
                },
                "evidence": {"preVerificationTreeCommitmentSha256": hashlib.sha256(f"tree-{job_id}".encode()).hexdigest()},
            }
            verification_path = root / f"verification-{job_id}.json"
            verification_path.write_text(json.dumps(verification), encoding="utf-8")
            execution_paths.append((gate_path, verification_path))
        return source_path, execution_paths, expected_counts

    def test_freezes_only_reproduced_pass_families(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source, executions, counts = self.make_fixture(root)
            artifact = MODULE.build_artifact(root, source, executions, counts)
            self.assertEqual(artifact["targetCount"], 1)
            self.assertEqual(artifact["targets"][0]["familyId"], "mf_pass")
            self.assertEqual(artifact["exclusionCount"], 1)
            self.assertEqual(artifact["exclusions"][0]["familyId"], "mf_review")
            self.assertFalse(artifact["isSplit"])

    def test_rejects_cross_execution_family_drift(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source, executions, counts = self.make_fixture(root, drift_confirmation=True)
            with self.assertRaisesRegex(ValueError, "do not reproduce identical"):
                MODULE.build_artifact(root, source, executions, counts)

    def test_rejects_non_outcome_free_gate(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source, executions, counts = self.make_fixture(root)
            gate = json.loads(executions[0][0].read_text(encoding="utf-8"))
            gate["outcomeFree"] = False
            executions[0][0].write_text(json.dumps(gate), encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "invalid outcomeFree"):
                MODULE.build_artifact(root, source, executions, counts)

    def test_verifies_only_exact_existing_artifact(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source, executions, counts = self.make_fixture(root)
            artifact = MODULE.build_artifact(root, source, executions, counts)
            output = root / "supported.json"
            output.write_text(json.dumps(artifact), encoding="utf-8")
            MODULE.verify_existing(output, artifact)
            artifact["targetCount"] = 2
            with self.assertRaisesRegex(ValueError, "does not reproduce exactly"):
                MODULE.verify_existing(output, artifact)


if __name__ == "__main__":
    unittest.main()
