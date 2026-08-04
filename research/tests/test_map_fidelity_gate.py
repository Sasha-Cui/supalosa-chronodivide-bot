#!/usr/bin/env python3
"""Static and mock-only tests for the outcome-free map fidelity gate."""

from __future__ import annotations

import importlib.util
import json
import tempfile
import unittest
from pathlib import Path


MODULE_PATH = Path(__file__).resolve().parents[1] / "scripts/map_fidelity_gate.py"
SPEC = importlib.util.spec_from_file_location("map_fidelity_gate", MODULE_PATH)
assert SPEC is not None and SPEC.loader is not None
GATE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(GATE)


MAP_TEXT = """[Basic]
GameMode=standard

[Map]
Size=0,0,100,100
LocalSize=2,4,96,90
Theater=TEMPERATE

[Waypoints]
0=63037
1=39062

[IsoMapPack5]
1=fixture

[OverlayPack]
1=fixture

[OverlayDataPack]
1=fixture
"""


SCHEDULER = {
    "jobId": "12345",
    "account": "pi_jss233",
    "partition": "day",
    "qos": "normal",
    "source": "scontrol",
}


class MapParseTests(unittest.TestCase):
    def test_required_sections_and_waypoints_are_parsed(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            path = Path(temporary) / "fixture.map"
            path.write_text(MAP_TEXT, encoding="latin-1")
            parsed = GATE.parse_map(path)
        self.assertEqual(parsed["staticChecks"]["failures"], [])
        self.assertEqual(
            parsed["declaredStartLocations"],
            [
                {"waypoint": 0, "encoded": 63037, "x": 37, "y": 63},
                {"waypoint": 1, "encoded": 39062, "x": 62, "y": 39},
            ],
        )

    def test_missing_payload_section_is_a_static_failure(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            path = Path(temporary) / "fixture.map"
            path.write_text(
                MAP_TEXT.replace("[OverlayDataPack]\n1=fixture\n", ""),
                encoding="latin-1",
            )
            parsed = GATE.parse_map(path)
        self.assertIn(
            "missing_required_section:overlaydatapack",
            parsed["staticChecks"]["failures"],
        )

    def test_three_map_preflight_is_deterministic_and_role_blind(self) -> None:
        records = [
            {"familyId": f"mf_{index}", "dryRunRole": role}
            for index, role in enumerate(
                ["test", "train", "validation", "test", "train", "test"]
            )
        ]
        first, scope = GATE.select_run_population(records, 3)
        second, _ = GATE.select_run_population(
            [{**record, "dryRunRole": "changed"} for record in records], 3
        )
        self.assertEqual(scope, "preflight")
        self.assertEqual(
            [(index, record["familyId"]) for index, record in first],
            [(index, record["familyId"]) for index, record in second],
        )
        self.assertEqual(len(first), 3)

    def test_tracked_dirty_source_fails_closed(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            with self.assertRaisesRegex(RuntimeError, "dirty or untracked critical source"):
                GATE.assert_clean_committed_source(
                    Path(temporary),
                    {"commit": "fixture", "status": [" M tracked.ts"]},
                    [],
                )

    def test_representative_binding_prefers_passed_load_content(self) -> None:
        family = {"familyId": "mf_fixture", "mapPaths": ["raw.map", "compat.map"]}
        maps = {
            "raw.map": {
                "sha256": "raw-hash",
                "loadVerification": [],
            },
            "compat.map": {
                "sha256": "compat-hash",
                "loadVerification": [{"ok": True}],
            },
        }
        binding = GATE.representative_map_binding(family, maps)
        self.assertEqual(binding["path"], "compat.map")
        self.assertEqual(binding["sha256"], "compat-hash")


class GateFixture(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary.name)
        self.repo = self.root / "repo"
        self.mix = self.root / "mix"
        self.repo.mkdir()
        self.mix.mkdir()
        representative = (
            self.repo
            / "packages/chronodivide-bot-driver/data/cd_fixture.map"
        )
        representative.parent.mkdir(parents=True)
        representative.write_text(MAP_TEXT, encoding="latin-1")
        (self.mix / representative.name).write_bytes(representative.read_bytes())
        (self.mix / "ra2.mix").write_bytes(b"fixture-assets")
        (self.repo / "package-lock.json").write_text("{}\n", encoding="utf-8")
        game_api = self.repo / "node_modules/@chronodivide/game-api"
        (game_api / "dist").mkdir(parents=True)
        (game_api / "package.json").write_text(
            '{"version":"0.75.0"}\n', encoding="utf-8"
        )
        (game_api / "dist/index.js").write_text(
            "// fixture\n", encoding="utf-8"
        )
        driver_dist = (
            self.repo / "packages/chronodivide-bot-driver/dist/benchmark"
        )
        driver_dist.mkdir(parents=True)
        for name in (
            "mapFidelityProbe.js",
            "mapFidelityProtocol.js",
            "seededOfflineGame.js",
        ):
            (driver_dist / name).write_text(f"// {name}\n", encoding="utf-8")
        for relative_path in (
            "packages/chronodivide-bot-driver/src/benchmark/mapFidelityProbe.ts",
            "packages/chronodivide-bot-driver/src/benchmark/mapFidelityProtocol.ts",
            "packages/chronodivide-bot-driver/src/benchmark/seededOfflineGame.ts",
            "research/scripts/map_fidelity_gate.py",
            "research/slurm/map_fidelity_gate_v1.sbatch",
        ):
            source = self.repo / relative_path
            source.parent.mkdir(parents=True, exist_ok=True)
            source.write_text(f"// {relative_path}\n", encoding="utf-8")
        self.node = self.root / "node"
        self.node.write_bytes(b"fixture-node")
        self.python = self.root / "python"
        self.python.write_bytes(b"fixture-python")
        self.scontrol = self.root / "scontrol"
        self.scontrol.write_bytes(b"fixture-scontrol")

        self.catalog_path = self.repo / "catalog.json"
        map_hash = GATE.sha256_file(representative)
        self.catalog_path.write_text(json.dumps({
            "schemaVersion": 2,
            "outcomeBlind": True,
            "maps": [{
                "path": "packages/chronodivide-bot-driver/data/cd_fixture.map",
                "familyId": "mf_fixture",
                "sha256": map_hash,
            }],
            "families": [{
                "familyId": "mf_fixture",
                "mapPaths": [
                    "packages/chronodivide-bot-driver/data/cd_fixture.map"
                ],
                "evidenceBasedDevelopmentEligibility": {"eligible": True},
            }],
        }), encoding="utf-8")
        self.targets_path = self.repo / "targets.json"
        target_records = [{
            "familyId": "mf_fixture",
            "representative": {
                "path": "packages/chronodivide-bot-driver/data/cd_fixture.map",
                "sha256": map_hash,
            },
        }]
        self.targets_path.write_text(json.dumps({
            "schemaVersion": 3,
            "status": "ROLE_BLIND_FIDELITY_SCREEN_TARGETS_NOT_A_SPLIT",
            "outcomeBlind": True,
            "roleBlind": True,
            "finalSplit": False,
            "isSplit": False,
            "catalogSha256": GATE.sha256_file(self.catalog_path),
            "populationCommitmentSha256": GATE.canonical_sha256(target_records),
            "targetCount": 1,
            "targets": target_records,
        }), encoding="utf-8")
        self.manifest = GATE.build_manifest(
            self.repo,
            self.targets_path,
            self.catalog_path,
            self.mix,
            SCHEDULER,
            target_tick=250,
            expected_families=1,
            node_binary=self.node,
            python_binary=self.python,
            scontrol_binary=self.scontrol,
            require_clean_source=False,
            debug_logging="1",
        )
        self.manifest_path = self.root / "manifest.json"
        self.manifest_path.write_text(
            json.dumps(self.manifest, indent=2) + "\n", encoding="utf-8"
        )

    def tearDown(self) -> None:
        self.temporary.cleanup()

    def test_manifest_uses_pinned_game_api_country_identifier(self) -> None:
        self.assertEqual(GATE.PARTICIPANT_COUNTRY, "Arabs")
        self.assertEqual(
            self.manifest["protocol"]["participantCountry"], "Arabs"
        )

    def result(self) -> dict[str, object]:
        family = self.manifest["families"][0]
        first = {"x": 37, "y": 63}
        second = {"x": 62, "y": 39}
        probe_common = {
            "loaded": True,
            "initialTick": 0,
            "finalTick": 250,
            "updates": 250,
            "progressedBeyondTickOne": True,
            "reachedTargetTick": True,
            "wallTimeMs": 1,
            "warningCaptureTruncated": False,
            "error": None,
        }
        return {
            "schemaVersion": 1,
            "gate": GATE.GATE,
            "outcomeFree": True,
            "artifactKind": "infrastructure_fidelity_full_probe_not_policy_evaluation",
            "scheduler": SCHEDULER,
            "manifestPath": str(self.manifest_path),
            "manifestSha256": GATE.sha256_file(self.manifest_path),
            "logging": self.manifest["inputs"]["logging"],
            "scope": "full",
            "populationFamilyCount": 1,
            "runFamilyCount": 1,
            "fullCoverage": True,
            "eligibleForFidelityClearance": False,
            "runtimeHashes": {
                "packageLockSha256": self.manifest["inputs"]["packageLock"]["sha256"],
                "gameApiPackageSha256": self.manifest["inputs"]["gameApiPackage"]["sha256"],
                "gameApiRuntimeSha256": self.manifest["inputs"]["gameApiRuntime"]["sha256"],
                "compiledProbeSha256": self.manifest["inputs"]["compiledProbe"]["sha256"],
                "gameApiRuntimeTreeSha256": self.manifest["inputs"]["gameApiRuntimeTree"]["sha256"],
                "runtimeDependencyTreeSha256": self.manifest["inputs"]["runtimeDependencyTree"]["sha256"],
                "mixTreeSha256": self.manifest["inputs"]["mixTree"]["sha256"],
                "sourceBundleSha256": self.manifest["inputs"]["sourceBundle"]["sha256"],
                "runtimeBundleSha256": self.manifest["inputs"]["runtimeBundle"]["sha256"],
            },
            "initialization": {
                "succeeded": True,
                "warnings": [],
                "warningCaptureTruncated": False,
                "error": None,
            },
            "familyCountRequested": 1,
            "familyCountRun": 1,
            "families": [{
                "familyIndex": family["index"],
                "familyId": "mf_fixture",
                "representativeMapPath": family["representativeMapPath"],
                "mapName": family["mapName"],
                "mapBytes": family["bytes"],
                "mapSha256": family["sha256"],
                "slurmJobId": SCHEDULER["jobId"],
                "requestedEngineSeed": (
                    self.manifest["protocol"]["engineSeedBase"] + family["index"]
                ) % (2 ** 32),
                "targetTick": 250,
                "declaredStartLocations": family["declaredStartLocations"],
                "forward": {
                    **probe_common,
                    "order": ["alpha", "beta"],
                    "starts": {"alpha": first, "beta": second},
                },
                "reverse": {
                    **probe_common,
                    "order": ["beta", "alpha"],
                    "starts": {"alpha": second, "beta": first},
                },
                "reciprocalStartCheck": {
                    "declaredStartCountValid": True,
                    "forwardStartsDistinct": True,
                    "reverseStartsDistinct": True,
                    "allObservedStartsDeclared": True,
                    "reciprocalPhysicalSlots": True,
                    "failures": [],
                },
                "warnings": [],
                "failureCategories": [],
                "reviewCategories": [],
                "fidelityStatus": "pass",
            }],
        }

    def check(self, result: dict[str, object]) -> dict[str, object]:
        result_path = self.root / "result.json"
        result_path.write_text(
            json.dumps(result, indent=2) + "\n", encoding="utf-8"
        )
        return GATE.check_gate(
            self.manifest_path,
            result_path,
            SCHEDULER,
            verify_runtime_inputs=False,
        )

    def test_clean_mock_probe_passes(self) -> None:
        summary = self.check(self.result())
        self.assertEqual(summary["verdict"], "PASS")
        self.assertTrue(summary["screenComplete"])
        self.assertTrue(summary["eligibleForFidelityClearance"])
        self.assertTrue(summary["passed"])

    def test_reciprocal_failure_fails(self) -> None:
        result = self.result()
        result["families"][0]["reciprocalStartCheck"]["failures"] = [
            "reciprocal_physical_slot_mismatch"
        ]
        summary = self.check(result)
        self.assertEqual(summary["verdict"], "FAIL")

    def test_checker_recomputes_reciprocal_starts_from_raw_records(self) -> None:
        result = self.result()
        result["families"][0]["reverse"]["starts"] = {
            "alpha": {"x": 37, "y": 63},
            "beta": {"x": 62, "y": 39},
        }
        summary = self.check(result)
        self.assertEqual(summary["verdict"], "FAIL")
        self.assertIn(
            "reciprocal:reciprocal_physical_slot_mismatch",
            summary["families"][0]["failures"],
        )

    def test_checker_recomputes_seed_and_tick_progress(self) -> None:
        result = self.result()
        result["families"][0]["requestedEngineSeed"] += 1
        result["families"][0]["forward"]["finalTick"] = 1
        summary = self.check(result)
        self.assertEqual(summary["verdict"], "FAIL")
        failures = summary["families"][0]["failures"]
        self.assertIn("requested_engine_seed_mismatch", failures)
        self.assertIn("forward_reachedTargetTick_inconsistent", failures)

    def test_preflight_pass_is_never_fidelity_clearance(self) -> None:
        self.manifest["selection"]["scope"] = "preflight"
        self.manifest["status"] = "SLURM_MAP_FIDELITY_PREFLIGHT_NOT_CLEARANCE"
        self.manifest_path.write_text(
            json.dumps(self.manifest, indent=2) + "\n", encoding="utf-8"
        )
        result = self.result()
        result["artifactKind"] = (
            "infrastructure_fidelity_preflight_probe_not_clearance"
        )
        result["scope"] = "preflight"
        result["fullCoverage"] = False
        summary = self.check(result)
        self.assertEqual(summary["verdict"], "PASS")
        self.assertTrue(summary["technicalChecksPassed"])
        self.assertFalse(summary["screenComplete"])
        self.assertFalse(summary["passed"])
        self.assertFalse(summary["eligibleForFidelityClearance"])

    def test_review_warning_requires_adjudication(self) -> None:
        result = self.result()
        result["families"][0]["warnings"] = [{
            "phase": "mf_fixture:alpha-beta",
            "level": "warn",
            "category": "invalid_terrain",
            "severity": "review",
            "diagnosticSha256": "1" * 64,
        }]
        result["families"][0]["fidelityStatus"] = "review"
        result["families"][0]["reviewCategories"] = [
            "warning_invalid_terrain"
        ]
        summary = self.check(result)
        self.assertEqual(summary["verdict"], "REVIEW")
        self.assertTrue(summary["screenComplete"])
        self.assertFalse(summary["eligibleForFidelityClearance"])

    def test_unknown_score_like_field_fails_strict_schema(self) -> None:
        result = self.result()
        result["families"][0]["alphaScore"] = 10
        summary = self.check(result)
        self.assertEqual(summary["verdict"], "FAIL")
        self.assertTrue(any(
            failure.startswith("unexpected_result_key:")
            for failure in summary["globalFailures"]
        ))

    def test_forbidden_outcome_field_fails_closed(self) -> None:
        result = self.result()
        result["families"][0]["winner"] = "alpha"
        summary = self.check(result)
        self.assertEqual(summary["verdict"], "FAIL")
        self.assertTrue(any(
            failure.startswith("forbidden_outcome_key:")
            for failure in summary["globalFailures"]
        ))

    def test_unredacted_outcome_diagnostic_fails_closed(self) -> None:
        result = self.result()
        result["families"][0]["warnings"] = [{
            "phase": "mf_fixture:alpha-beta",
            "level": "warn",
            "category": "other_warning",
            "severity": "review",
            "text": "winner alpha with score 1",
        }]
        summary = self.check(result)
        self.assertEqual(summary["verdict"], "FAIL")
        self.assertTrue(any(
            failure.startswith("unredacted_outcome_diagnostic:")
            for failure in summary["globalFailures"]
        ))

    def test_role_field_fails_closed(self) -> None:
        result = self.result()
        result["families"][0]["role"] = "test"
        summary = self.check(result)
        self.assertEqual(summary["verdict"], "FAIL")
        self.assertTrue(any(
            failure.startswith("forbidden_role_key:")
            for failure in summary["globalFailures"]
        ))


if __name__ == "__main__":
    unittest.main()
