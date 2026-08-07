#!/usr/bin/env python3
"""Static and mock-only tests for the outcome-free map fidelity gate."""

from __future__ import annotations

import importlib.util
import json
import os
import re
import subprocess
import tempfile
import unittest
from copy import deepcopy
from pathlib import Path


MODULE_PATH = Path(__file__).resolve().parents[1] / "scripts/map_fidelity_gate.py"
SPEC = importlib.util.spec_from_file_location("map_fidelity_gate", MODULE_PATH)
assert SPEC is not None and SPEC.loader is not None
GATE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(GATE)

SUPERVISOR_MODULE_PATH = (
    Path(__file__).resolve().parents[1] / "scripts/map_fidelity_supervisor.py"
)
SUPERVISOR_SPEC = importlib.util.spec_from_file_location(
    "map_fidelity_supervisor_contract", SUPERVISOR_MODULE_PATH
)
assert SUPERVISOR_SPEC is not None and SUPERVISOR_SPEC.loader is not None
SUPERVISOR = importlib.util.module_from_spec(SUPERVISOR_SPEC)
SUPERVISOR_SPEC.loader.exec_module(SUPERVISOR)


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
    def test_engine_asset_directory_rejects_missing_files(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            with self.assertRaisesRegex(RuntimeError, "Engine asset directory is incomplete"):
                GATE.validate_engine_asset_directory(Path(temporary))

    def test_engine_asset_directory_accepts_exact_nonempty_files(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            for name in GATE.REQUIRED_ENGINE_ASSET_FILES:
                (root / name).write_bytes(b"fixture")
            GATE.validate_engine_asset_directory(root)

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

    def test_expanded_preflight_retains_full_population_indices(self) -> None:
        records = [
            {"familyId": f"mf_{index}", "dryRunRole": role}
            for index, role in enumerate(["test", "train", "validation"] * 5)
        ]
        preflight_ids = [
            f"mf_{index}" for index in (13, 2, 11, 0, 9, 4, 14, 6, 12, 1, 8)
        ]
        first, scope = GATE.select_run_population(records, preflight_ids)
        second, _ = GATE.select_run_population(
            [{**record, "dryRunRole": "changed"} for record in records],
            list(reversed(preflight_ids)),
        )
        self.assertEqual(scope, "preflight")
        self.assertEqual(
            [(index, record["familyId"]) for index, record in first],
            [(index, record["familyId"]) for index, record in second],
        )
        self.assertEqual(len(first), 11)
        self.assertEqual(
            [index for index, _ in first],
            sorted(index for index, _ in first),
        )

    def test_committed_expanded_plan_is_independently_validated(self) -> None:
        repo = MODULE_PATH.parents[2]
        catalog_path = repo / "research/artifacts/map_family_catalog.json"
        targets_path = (
            repo / "research/artifacts/role_blind_fidelity_targets_v1.json"
        )
        plan_path = (
            repo / "research/artifacts/map_fidelity_expanded_preflight_v2.json"
        )
        catalog = GATE.load_json(catalog_path)
        targets = GATE.load_json(targets_path)
        plan = GATE.load_json(plan_path)
        selected_ids = GATE.validate_expanded_preflight_plan(
            plan,
            catalog=catalog,
            target_records=targets["targets"],
            catalog_sha256=GATE.sha256_file(catalog_path),
            target_manifest_sha256=GATE.sha256_file(targets_path),
            target_population_commitment_sha256=targets[
                "populationCommitmentSha256"
            ],
        )
        self.assertEqual(len(selected_ids), 11)
        tampered = deepcopy(plan)
        tampered["selected"][0]["safeDescriptors"]["bytes"] += 1
        with self.assertRaisesRegex(RuntimeError, "catalog binding"):
            GATE.validate_expanded_preflight_plan(
                tampered,
                catalog=catalog,
                target_records=targets["targets"],
                catalog_sha256=GATE.sha256_file(catalog_path),
                target_manifest_sha256=GATE.sha256_file(targets_path),
                target_population_commitment_sha256=targets[
                    "populationCommitmentSha256"
                ],
            )

    def test_python_typescript_manifest_contracts_match(self) -> None:
        repo = MODULE_PATH.parents[2]
        probe_source = (
            repo
            / "packages/chronodivide-bot-driver/src/benchmark/mapFidelityProbe.ts"
        ).read_text(encoding="utf-8")
        protocol_source = (
            repo
            / "packages/chronodivide-bot-driver/src/benchmark/mapFidelityProtocol.ts"
        ).read_text(encoding="utf-8")

        source_match = re.search(
            r"const WORKER_SOURCE_PATHS = \[(.*?)\] as const;",
            probe_source,
            flags=re.DOTALL,
        )
        self.assertIsNotNone(source_match)
        worker_sources = tuple(re.findall(r'"([^"]+)"', source_match.group(1)))
        self.assertEqual(worker_sources, GATE.TOOL_SOURCE_PATHS)

        runtime_match = re.search(
            r"const RUNTIME_HASH_KEYS = \[(.*?)\] as const;",
            probe_source,
            flags=re.DOTALL,
        )
        self.assertIsNotNone(runtime_match)
        worker_runtime_keys = set(
            re.findall(r'"([^"]+)"', runtime_match.group(1))
        )
        self.assertEqual(
            worker_runtime_keys,
            {key for key, _kind, _lookup in GATE.RUNTIME_HASH_BINDINGS},
        )

        count_match = re.search(
            r"EXPANDED_PREFLIGHT_FAMILY_COUNT = (\d+);", protocol_source
        )
        self.assertIsNotNone(count_match)
        self.assertEqual(
            int(count_match.group(1)), GATE.EXPANDED_PREFLIGHT_FAMILY_COUNT
        )
        rule_match = re.search(
            r"export const EXPANDED_PREFLIGHT_RULE =\s*(.*?)\n\nexport type FidelityScope",
            protocol_source,
            flags=re.DOTALL,
        )
        self.assertIsNotNone(rule_match)
        worker_rule = "".join(re.findall(r'"([^"]*)"', rule_match.group(1)))
        self.assertEqual(worker_rule, GATE.EXPANDED_PREFLIGHT_RULE)

        stage_match = re.search(
            r"export const WORKER_TECHNICAL_STAGES = \[(.*?)\] as const;",
            probe_source,
            flags=re.DOTALL,
        )
        self.assertIsNotNone(stage_match)
        worker_stages = set(re.findall(r'"([^"]+)"', stage_match.group(1)))
        self.assertEqual(worker_stages, GATE.WORKER_TECHNICAL_STAGES)
        self.assertEqual(worker_stages, SUPERVISOR.WORKER_TECHNICAL_STAGES)
        self.assertEqual(
            GATE.WORKER_TECHNICAL_DIAGNOSTIC_KEYS,
            SUPERVISOR.WORKER_TECHNICAL_DIAGNOSTIC_KEYS,
        )

    def test_tracked_dirty_source_fails_closed(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            with self.assertRaisesRegex(
                RuntimeError, "dirty or untracked critical source"
            ):
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
        for name in GATE.REQUIRED_ENGINE_ASSET_FILES:
            (self.mix / name).write_bytes(b"fixture-assets")
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
        for name in GATE.COMPILED_RUNTIME_NAMES:
            (driver_dist / name).write_text(f"// {name}\n", encoding="utf-8")
        for relative_path in GATE.TOOL_SOURCE_PATHS:
            source = self.repo / relative_path
            source.parent.mkdir(parents=True, exist_ok=True)
            source.write_text(f"// {relative_path}\n", encoding="utf-8")
        self.node = self.root / "node"
        self.node.write_bytes(b"fixture-node")
        os.chmod(self.node, 0o700)
        self.python = self.root / "python"
        self.python.write_bytes(b"fixture-python")
        os.chmod(self.python, 0o700)
        self.scontrol = self.root / "scontrol"
        self.scontrol.write_bytes(b"fixture-scontrol")
        os.chmod(self.scontrol, 0o700)

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
        subprocess.run(["git", "init", "-q"], cwd=self.repo, check=True)
        subprocess.run(
            ["git", "config", "user.email", "fixture@example.invalid"],
            cwd=self.repo,
            check=True,
        )
        subprocess.run(
            ["git", "config", "user.name", "Map Fidelity Fixture"],
            cwd=self.repo,
            check=True,
        )
        tracked = [
            "package-lock.json",
            "catalog.json",
            "targets.json",
            *GATE.TOOL_SOURCE_PATHS,
        ]
        subprocess.run(["git", "add", "--", *tracked], cwd=self.repo, check=True)
        subprocess.run(["git", "commit", "-qm", "fixture"], cwd=self.repo, check=True)
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
        self.durable_root = self.root / "durable"
        self.run_root = self.durable_root / "run"
        self.run_root.mkdir(parents=True, mode=0o700)
        self.manifest_path = self.run_root / "input-manifest.json"
        self.manifest_path.write_text(
            json.dumps(self.manifest, indent=2) + "\n", encoding="utf-8"
        )
        os.chmod(self.manifest_path, 0o600)

    def tearDown(self) -> None:
        self.temporary.cleanup()

    def test_manifest_uses_pinned_game_api_country_identifier(self) -> None:
        self.assertEqual(GATE.PARTICIPANT_COUNTRY, "Arabs")
        self.assertEqual(
            self.manifest["protocol"]["participantCountry"], "Arabs"
        )

    def test_private_alias_does_not_require_shared_mix_basename_copy(self) -> None:
        self.assertFalse((self.mix / "cd_fixture.map").exists())
        self.assertEqual(
            self.manifest["families"][0]["mapName"], "cd_fixture.map"
        )

    def test_full_runtime_validation_accepts_private_alias_source_only(self) -> None:
        self.assertFalse((self.mix / "cd_fixture.map").exists())
        validated = GATE.validate_manifest_v2(
            self.manifest,
            scheduler=SCHEDULER,
            verify_runtime_inputs=True,
        )
        self.assertIs(validated, self.manifest)

    def test_hashed_worker_diagnostic_stream_is_independently_bound(self) -> None:
        diagnostic = {
            "schemaVersion": 1,
            "gate": GATE.GATE,
            "artifactKind": "map_fidelity_worker_technical_diagnostic",
            "outcomeFree": True,
            "stage": "manifest_validate",
            "errorNameSha256": "a" * 64,
            "errorMessageSha256": "b" * 64,
            "errorStackSha256": None,
        }
        stream = GATE.canonical_diagnostic_stream(diagnostic)
        self.assertEqual(
            GATE.validate_worker_technical_diagnostic(
                diagnostic, "fixture diagnostic"
            ),
            diagnostic,
        )
        self.assertNotIn(b"winner", stream)
        tampered = deepcopy(diagnostic)
        tampered["stage"] = "unbounded_stage"
        with self.assertRaisesRegex(RuntimeError, "identity or stage"):
            GATE.validate_worker_technical_diagnostic(
                tampered, "fixture diagnostic"
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

    def pipeline_payload(self, attempt_dir: Path) -> dict[str, object]:
        family = self.manifest["families"][0]
        result = deepcopy(self.result()["families"][0])
        alias = GATE.map_load_alias(family["index"], family["sha256"])
        result["executedMapAlias"] = alias
        for probe_name in ("forward", "reverse"):
            result[probe_name]["initialTickIsZero"] = True
            result[probe_name]["tickUpdateArithmeticConsistent"] = True
        alias_path = str((attempt_dir / "sandbox" / alias).absolute())
        phase_counts = [
            ("initialization", 1),
            ("forward_create", 2),
            ("reverse_create", 2),
        ]
        read_sequence = [
            ("initialization", 1),
            ("forward_create", 1),
            ("forward_create", 2),
            ("reverse_create", 1),
            ("reverse_create", 2),
        ]
        return {
            "engineInitialization": {
                "succeeded": True,
                "warnings": [],
                "warningCaptureTruncated": False,
                "error": None,
            },
            "familyResult": result,
            "mapLoadAttestation": {
                "protocol": GATE.MAP_LOAD_ATTESTATION_PROTOCOL,
                "alias": alias,
                "aliasPath": alias_path,
                "expectedBytes": family["bytes"],
                "expectedSha256": family["sha256"],
                "phases": [
                    {"phase": phase, "expectedReads": count, "observedReads": count}
                    for phase, count in phase_counts
                ],
                "reads": [{
                    "phase": phase,
                    "ordinal": ordinal,
                    "alias": alias,
                    "resolvedPath": alias_path,
                    "bytes": family["bytes"],
                    "sha256": family["sha256"],
                    "adapter": "file-system-access/node.FileHandle.getFile",
                    "inMemorySnapshot": True,
                } for phase, ordinal in read_sequence],
                "complete": True,
            },
        }

    def create_pipeline_evidence(self) -> dict[str, Path | dict[str, object]]:
        pre_path = self.run_root / "job-pre-attestation.json"
        pre = GATE.build_job_attestation(
            self.manifest_path,
            SCHEDULER,
            phase="pre_workers",
            durable_root=self.durable_root,
            verify_runtime_inputs=False,
        )
        GATE.write_exclusive(pre_path, pre)
        manifest_sha = GATE.sha256_file(self.manifest_path)
        pre_sha = GATE.sha256_file(pre_path)
        binding = GATE.family_binding(self.manifest, 0)
        families_root = self.run_root / "families"
        families_root.mkdir(mode=0o700)
        family_dir = families_root / f"0000-{binding['familyIdSha256'][:16]}"
        family_dir.mkdir(mode=0o700)
        attempts_root = family_dir / "attempts"
        attempts_root.mkdir(mode=0o700)
        attempt_dir = attempts_root / "01"
        attempt_dir.mkdir(mode=0o700)
        intent_path = attempt_dir / "attempt-intent.json"
        terminal_path = attempt_dir / "attempt-terminal.json"
        shard_path = attempt_dir / "family-shard.json"
        environment_values = {
            "PATH": "/bin",
            "DEBUG_LOGGING": "1",
            "SLURM_JOB_ID": SCHEDULER["jobId"],
        }
        policy = {
            "timeoutSeconds": 120.0,
            "terminationGraceSeconds": 5.0,
            "maxTechnicalAttempts": 2,
            "maxStreamBytes": 1024,
        }
        command_prefix = [
            self.manifest["inputs"]["nodeRuntime"]["path"],
            self.manifest["inputs"]["compiledProbe"]["path"],
        ]
        command = [
            *command_prefix,
            "--manifest", str(self.manifest_path),
            "--attestation", str(pre_path),
            "--family-ordinal", "0",
            "--intent", str(intent_path),
            "--output", str(shard_path),
        ]
        prefix_sha = GATE.canonical_sha256(command_prefix)
        intent = {
            "schemaVersion": 1,
            "gate": GATE.GATE,
            "artifactKind": "map_fidelity_family_attempt_intent",
            "outcomeFree": True,
            "manifest": {"path": str(self.manifest_path), "sha256": manifest_sha},
            "attestation": {"path": str(pre_path), "sha256": pre_sha},
            "family": binding,
            "attemptNumber": 1,
            "executionPolicy": policy,
            "scheduler": SCHEDULER,
            "environment": {
                "allowedKeys": list(GATE.ALLOWED_WORKER_ENV_KEYS),
                "values": environment_values,
                "sha256": GATE.canonical_sha256(environment_values),
            },
            "worker": {
                "argumentProtocol": "map-fidelity-family-worker-v1",
                "commandPrefixSha256": prefix_sha,
                "commandSha256": GATE.canonical_sha256(command),
                "executable": self.manifest["inputs"]["nodeRuntime"],
                "shardPath": str(shard_path),
            },
        }
        GATE.write_exclusive(intent_path, intent)
        intent_sha = GATE.sha256_file(intent_path)
        payload = self.pipeline_payload(attempt_dir)
        shard = {
            "schemaVersion": 1,
            "gate": GATE.GATE,
            "artifactKind": "map_fidelity_family_worker_shard",
            "outcomeFree": True,
            "manifestSha256": manifest_sha,
            "attestationSha256": pre_sha,
            "family": binding,
            "attemptNumber": 1,
            "intentSha256": intent_sha,
            "scheduler": SCHEDULER,
            "payload": payload,
        }
        GATE.write_exclusive(shard_path, shard)
        shard_record = GATE.private_evidence_file(
            shard_path, durable_root=self.durable_root
        )
        empty_stream = {
            "bytes": 0,
            "sha256": GATE.hashlib.sha256(b"").hexdigest(),
            "truncated": False,
        }
        terminal = {
            "schemaVersion": 1,
            "gate": GATE.GATE,
            "artifactKind": "map_fidelity_family_attempt_terminal",
            "outcomeFree": True,
            "manifestSha256": manifest_sha,
            "attestationSha256": pre_sha,
            "family": binding,
            "attemptNumber": 1,
            "intentSha256": intent_sha,
            "scheduler": SCHEDULER,
            "timing": {"wallTimeMs": 10},
            "process": {
                "exitCode": 0,
                "termSignal": None,
                "timedOut": False,
                "termSent": False,
                "killSent": False,
            },
            "streams": {"stdout": empty_stream, "stderr": empty_stream},
            "shard": shard_record,
            "technicalDisposition": {
                "status": "complete",
                "categories": [],
                "workerDiagnostic": None,
            },
        }
        GATE.write_exclusive(terminal_path, terminal)
        checkpoint_path = family_dir / "completion-checkpoint.json"
        checkpoint = {
            "schemaVersion": 1,
            "gate": GATE.GATE,
            "artifactKind": "map_fidelity_family_completion_checkpoint",
            "outcomeFree": True,
            "manifestSha256": manifest_sha,
            "attestationSha256": pre_sha,
            "family": binding,
            "scheduler": SCHEDULER,
            "accepted": {
                "attemptNumber": 1,
                "intentSha256": intent_sha,
                "terminalSha256": GATE.sha256_file(terminal_path),
                "shard": shard_record,
            },
        }
        GATE.write_exclusive(checkpoint_path, checkpoint)
        intent_record = GATE.private_evidence_file(intent_path, durable_root=self.durable_root)
        terminal_record = GATE.private_evidence_file(terminal_path, durable_root=self.durable_root)
        checkpoint_record = GATE.private_evidence_file(checkpoint_path, durable_root=self.durable_root)
        campaign_path = self.run_root / "campaign-terminal.json"
        campaign = {
            "schemaVersion": 1,
            "gate": GATE.GATE,
            "artifactKind": "map_fidelity_campaign_terminal",
            "outcomeFree": True,
            "manifestSha256": manifest_sha,
            "attestationSha256": pre_sha,
            "scheduler": SCHEDULER,
            "configuration": {
                "executionPolicy": policy,
                "environmentSha256": GATE.canonical_sha256(environment_values),
                "workerCommandPrefixSha256": prefix_sha,
                "workerExecutable": self.manifest["inputs"]["nodeRuntime"],
            },
            "familyCount": 1,
            "completedCount": 1,
            "pendingCount": 0,
            "technicalAttemptCount": 1,
            "pendingManifestOrdinals": [],
            "checkpoints": [{"manifestOrdinal": 0, **checkpoint_record}],
            "attempts": [{
                "family": binding,
                "attemptNumber": 1,
                "intent": intent_record,
                "terminal": terminal_record,
                "shard": shard_record,
            }],
        }
        GATE.write_exclusive(campaign_path, campaign)
        post_path = self.run_root / "job-post-attestation.json"
        post = GATE.build_job_attestation(
            self.manifest_path,
            SCHEDULER,
            phase="post_workers",
            pre_attestation_path=pre_path,
            run_root=self.run_root,
            durable_root=self.durable_root,
            verify_runtime_inputs=False,
        )
        GATE.write_exclusive(post_path, post)
        return {
            "pre": pre_path,
            "post": post_path,
            "campaign": campaign_path,
            "checkpoint": checkpoint_path,
            "intent": intent_path,
            "terminal": terminal_path,
            "shard": shard_path,
            "payload": payload,
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

    def test_unbound_preflight_mutation_fails_closed(self) -> None:
        self.manifest["selection"]["scope"] = "preflight"
        self.manifest["selection"]["preflightRule"] = (
            GATE.EXPANDED_PREFLIGHT_RULE
        )
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
        with self.assertRaisesRegex(RuntimeError, "lacks its committed plan"):
            self.check(result)

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
