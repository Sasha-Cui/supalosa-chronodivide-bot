#!/usr/bin/env python3
"""Mock-only tests for the per-family map-fidelity supervisor."""

from __future__ import annotations

import copy
import importlib.util
import json
import os
import signal
import sys
import tempfile
import time
import unittest
from pathlib import Path


MODULE_PATH = Path(__file__).resolve().parents[1] / "scripts/map_fidelity_supervisor.py"
SPEC = importlib.util.spec_from_file_location("map_fidelity_supervisor", MODULE_PATH)
assert SPEC is not None and SPEC.loader is not None
SUPERVISOR = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(SUPERVISOR)


SCHEDULER = {
    "jobId": "12345",
    "account": "pi_jss233",
    "partition": "day",
    "qos": "normal",
    "source": "scontrol",
}


MOCK_WORKER = r"""
import argparse
import hashlib
import json
import os
import signal
import subprocess
import sys
import time
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument("--mode", required=True)
parser.add_argument("--state-file", type=Path)
parser.add_argument("--invocations", type=Path)
parser.add_argument("--statuses", type=Path)
parser.add_argument("--descendant-pid", type=Path)
parser.add_argument("--manifest", type=Path, required=True)
parser.add_argument("--attestation", type=Path, required=True)
parser.add_argument("--family-ordinal", type=int, required=True)
parser.add_argument("--intent", type=Path, required=True)
parser.add_argument("--output", type=Path, required=True)
args = parser.parse_args()

if args.invocations:
    with args.invocations.open("a", encoding="utf-8") as handle:
        handle.write(f"{args.family_ordinal}\n")

if args.mode == "diagnostic":
    message = "winner beta at /private/path"
    diagnostic = {
        "schemaVersion": 1,
        "gate": "map-fidelity-gate-v1",
        "artifactKind": "map_fidelity_worker_technical_diagnostic",
        "outcomeFree": True,
        "stage": "manifest_validate",
        "errorNameSha256": hashlib.sha256(b"Error").hexdigest(),
        "errorMessageSha256": hashlib.sha256(message.encode("utf-8")).hexdigest(),
        "errorStackSha256": None,
    }
    sys.stderr.write(json.dumps(
        diagnostic, sort_keys=True, separators=(",", ":")
    ) + "\n")
    sys.stderr.flush()
    raise SystemExit(2)

if args.mode == "crash":
    raise SystemExit(7)

if args.mode == "retry":
    count = int(args.state_file.read_text()) if args.state_file.exists() else 0
    args.state_file.write_text(str(count + 1))
    if count == 0:
        raise SystemExit(9)

if args.mode == "timeout":
    child_code = (
        "import os,signal,time,pathlib;"
        f"pathlib.Path({str(args.descendant_pid)!r}).write_text(str(os.getpid()));"
        "signal.signal(signal.SIGTERM,signal.SIG_IGN);"
        "time.sleep(60)"
    )
    subprocess.Popen([sys.executable, "-c", child_code])
    signal.signal(signal.SIGTERM, signal.SIG_IGN)
    deadline = time.time() + 2
    while not args.descendant_pid.exists() and time.time() < deadline:
        time.sleep(0.01)
    time.sleep(60)

if args.mode == "orphan-pipe":
    child_code = (
        "import os,signal,time,pathlib;"
        f"pathlib.Path({str(args.descendant_pid)!r}).write_text(str(os.getpid()));"
        "signal.signal(signal.SIGTERM,signal.SIG_IGN);"
        "time.sleep(60)"
    )
    subprocess.Popen([sys.executable, "-c", child_code])
    deadline = time.time() + 2
    while not args.descendant_pid.exists() and time.time() < deadline:
        time.sleep(0.01)

if args.mode == "env-leak":
    if "WINNER" in os.environ or "DRY_RUN_ROLE" in os.environ:
        raise SystemExit(12)

if args.mode == "noisy":
    sys.stdout.write("x" * 4096)
    sys.stdout.flush()

if args.mode == "malformed":
    args.output.write_text("{", encoding="utf-8")
    os.chmod(args.output, 0o600)
    raise SystemExit(0)

if args.mode == "partial":
    partial = args.output.with_name(args.output.name + ".tmp")
    partial.write_text('{"partial":true}', encoding="utf-8")
    os.chmod(partial, 0o600)
    raise SystemExit(0)

intent_bytes = args.intent.read_bytes()
intent = json.loads(intent_bytes)
attestation_bytes = args.attestation.read_bytes()
manifest_bytes = args.manifest.read_bytes()
manifest = json.loads(manifest_bytes)
family = manifest["families"][args.family_ordinal]
target_tick = manifest["protocol"]["targetTick"]
status = "pass"
if args.statuses:
    statuses = json.loads(args.statuses.read_text(encoding="utf-8"))
    status = statuses[str(args.family_ordinal)]

warning = None
failure_categories = []
review_categories = []
if status == "review":
    warning = {
        "phase": f"{family['familyId']}:forward",
        "level": "warn",
        "category": "invalid_terrain",
        "severity": "review",
        "diagnosticSha256": "d" * 64,
    }
    review_categories = ["warning_invalid_terrain"]
elif status == "fail":
    warning = {
        "phase": f"{family['familyId']}:forward",
        "level": "warn",
        "category": "missing_asset",
        "severity": "fail",
        "diagnosticSha256": "e" * 64,
    }
    failure_categories = ["warning_missing_asset"]

declared = family["declaredStartLocations"]
alpha_start = {"x": declared[0]["x"], "y": declared[0]["y"]}
beta_start = {"x": declared[1]["x"], "y": declared[1]["y"]}

def probe(order, alpha, beta):
    return {
        "order": order,
        "loaded": True,
        "initialTick": 0,
        "finalTick": target_tick,
        "updates": target_tick,
        "initialTickIsZero": True,
        "tickUpdateArithmeticConsistent": True,
        "progressedBeyondTickOne": target_tick > 1,
        "reachedTargetTick": True,
        "starts": {"alpha": alpha, "beta": beta},
        "wallTimeMs": 1,
        "warningCaptureTruncated": False,
        "error": None,
    }

alias = f"cdfid-{family['index']:06d}-{family['sha256']}.map"
alias_path = str((args.output.parent / "sandbox" / alias).resolve())
read_sequence = [
    ("initialization", 1),
    ("forward_create", 1),
    ("forward_create", 2),
    ("reverse_create", 1),
    ("reverse_create", 2),
]
map_load_attestation = {
    "protocol": "unique-rfs-alias-adapter-snapshot-v1",
    "alias": alias,
    "aliasPath": alias_path,
    "expectedBytes": family["bytes"],
    "expectedSha256": family["sha256"],
    "phases": [
        {"phase": "initialization", "expectedReads": 1, "observedReads": 1},
        {"phase": "forward_create", "expectedReads": 2, "observedReads": 2},
        {"phase": "reverse_create", "expectedReads": 2, "observedReads": 2},
    ],
    "reads": [
        {
            "phase": phase,
            "ordinal": ordinal,
            "alias": alias,
            "resolvedPath": alias_path,
            "bytes": family["bytes"],
            "sha256": family["sha256"],
            "adapter": "file-system-access/node.FileHandle.getFile",
            "inMemorySnapshot": True,
        }
        for phase, ordinal in read_sequence
    ],
    "complete": True,
}
family_result = {
    "familyIndex": family["index"],
    "familyId": family["familyId"],
    "representativeMapPath": family["representativeMapPath"],
    "mapName": family["mapName"],
    "executedMapAlias": alias,
    "mapBytes": family["bytes"],
    "mapSha256": family["sha256"],
    "slurmJobId": intent["scheduler"]["jobId"],
    "requestedEngineSeed": (
        manifest["protocol"]["engineSeedBase"] + family["index"]
    ) % (2**32),
    "targetTick": target_tick,
    "declaredStartLocations": declared,
    "forward": probe(["alpha", "beta"], alpha_start, beta_start),
    "reverse": probe(["beta", "alpha"], beta_start, alpha_start),
    "reciprocalStartCheck": {
        "declaredStartCountValid": True,
        "forwardStartsDistinct": True,
        "reverseStartsDistinct": True,
        "allObservedStartsDeclared": True,
        "reciprocalPhysicalSlots": True,
        "failures": [],
    },
    "warnings": [] if warning is None else [warning],
    "failureCategories": failure_categories,
    "reviewCategories": review_categories,
    "fidelityStatus": status,
}
payload = {
    "engineInitialization": {
        "succeeded": True,
        "warnings": [],
        "warningCaptureTruncated": False,
        "error": None,
    },
    "familyResult": family_result,
    "mapLoadAttestation": map_load_attestation,
}
if args.mode == "outcome-key":
    payload["familyResult"]["winner"] = "alpha"
if args.mode == "role-key":
    payload["mapLoadAttestation"]["dryRunRole"] = "test"
if args.mode == "malformed-nested":
    payload["mapLoadAttestation"]["reads"][-1]["sha256"] = "not-a-sha256"
shard = {
    "schemaVersion": 1,
    "gate": "map-fidelity-gate-v1",
    "artifactKind": "map_fidelity_family_worker_shard",
    "outcomeFree": True,
    "manifestSha256": __import__("hashlib").sha256(manifest_bytes).hexdigest(),
    "attestationSha256": __import__("hashlib").sha256(attestation_bytes).hexdigest(),
    "family": intent["family"],
    "attemptNumber": intent["attemptNumber"],
    "intentSha256": __import__("hashlib").sha256(intent_bytes).hexdigest(),
    "scheduler": intent["scheduler"],
    "payload": payload,
}
args.output.write_text(json.dumps(shard) + "\n", encoding="utf-8")
os.chmod(args.output, 0o600)
"""


def process_is_gone(pid: int) -> bool:
    try:
        os.kill(pid, 0)
    except ProcessLookupError:
        return True
    stat_path = Path(f"/proc/{pid}/stat")
    if stat_path.exists():
        fields = stat_path.read_text(encoding="utf-8").split()
        if len(fields) > 2 and fields[2] == "Z":
            return True
    return False


class SupervisorFixture(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary.name)
        os.chmod(self.root, 0o700)
        self.manifest_path = self.root / "manifest.json"
        runtime_hashes = {
            key: f"{index + 10:064x}"
            for index, key in enumerate(sorted(SUPERVISOR.RUNTIME_HASH_KEYS))
        }
        self.manifest = {
            "schemaVersion": 2,
            "gate": "map-fidelity-gate-v1",
            "outcomeFree": True,
            "scheduler": SCHEDULER,
            "protocol": {"targetTick": 250, "engineSeedBase": 10_000},
            "runtimeHashes": runtime_hashes,
            "inputs": {
                "git": {"commit": "1" * 40},
                "targetPopulationCommitmentSha256": "2" * 64,
                "familySequenceSha256": "3" * 64,
                "sourceBundle": {
                    "sha256": runtime_hashes["sourceBundleSha256"]
                },
                "runtimeBundle": {
                    "sha256": runtime_hashes["runtimeBundleSha256"]
                },
            },
            "families": [
                {
                    "index": index * 3,
                    "familyId": f"mf_{index}",
                    "representativeMapPath": f"maps/map_{index}.map",
                    "mapName": f"map_{index}.map",
                    "bytes": 10_000 + index,
                    "sha256": f"{index + 1:064x}",
                    "declaredStartLocations": [
                        {
                            "x": index * 100 + 10,
                            "y": index * 100 + 20,
                            "waypoint": 0,
                            "encoded": 20_000 + index,
                        },
                        {
                            "x": index * 100 + 30,
                            "y": index * 100 + 40,
                            "waypoint": 1,
                            "encoded": 40_000 + index,
                        },
                    ],
                    "staticChecks": {"failures": []},
                }
                for index in range(3)
            ],
        }
        self._write_json(self.manifest_path, self.manifest)
        self.attestation_path = self.root / "attestation.json"
        self.attestation = {
            "schemaVersion": 1,
            "gate": "map-fidelity-gate-v1",
            "artifactKind": "map_fidelity_job_attestation",
            "outcomeFree": True,
            "phase": "pre_workers",
            "manifest": SUPERVISOR.exact_file_binding(self.manifest_path),
            "scheduler": SCHEDULER,
            "runtimeHashes": runtime_hashes,
            "bindings": {
                "sourceCommit": self.manifest["inputs"]["git"]["commit"],
                "targetPopulationCommitmentSha256": self.manifest["inputs"][
                    "targetPopulationCommitmentSha256"
                ],
                "familySequenceSha256": self.manifest["inputs"][
                    "familySequenceSha256"
                ],
                "sourceBundleSha256": runtime_hashes["sourceBundleSha256"],
                "runtimeBundleSha256": runtime_hashes["runtimeBundleSha256"],
            },
            "preAttestation": None,
            "checkpointLedger": None,
        }
        self._write_json(self.attestation_path, self.attestation)
        self.worker_path = self.root / "mock_worker.py"
        self.worker_path.write_text(MOCK_WORKER, encoding="utf-8")
        os.chmod(self.worker_path, 0o700)
        self.invocations = self.root / "invocations.txt"

    def tearDown(self) -> None:
        self.temporary.cleanup()

    @staticmethod
    def _write_json(path: Path, value: dict[str, object]) -> None:
        path.write_text(json.dumps(value, indent=2) + "\n", encoding="utf-8")
        os.chmod(path, 0o600)

    def _refresh_attestation_manifest_binding(self) -> None:
        self.attestation["manifest"] = SUPERVISOR.exact_file_binding(
            self.manifest_path
        )
        self._write_json(self.attestation_path, self.attestation)

    def command(
        self,
        mode: str,
        *,
        state_file: Path | None = None,
        statuses: Path | None = None,
        descendant_pid: Path | None = None,
    ) -> list[str]:
        command = [
            sys.executable,
            str(self.worker_path),
            "--mode",
            mode,
            "--invocations",
            str(self.invocations),
        ]
        if state_file is not None:
            command.extend(["--state-file", str(state_file)])
        if statuses is not None:
            command.extend(["--statuses", str(statuses)])
        if descendant_pid is not None:
            command.extend(["--descendant-pid", str(descendant_pid)])
        return command

    def supervisor(
        self,
        run_name: str,
        command: list[str],
        *,
        max_attempts: int = 2,
        timeout: float = 1.0,
        grace: float = 0.1,
        stream_bytes: int = 1024,
    ) -> object:
        return SUPERVISOR.MapFidelitySupervisor(
            manifest_path=self.manifest_path,
            attestation_path=self.attestation_path,
            run_root=self.root / run_name,
            worker_command_prefix=command,
            scheduler=SCHEDULER,
            timeout_seconds=timeout,
            termination_grace_seconds=grace,
            max_stream_bytes=stream_bytes,
            max_attempts=max_attempts,
        )

    def invocation_ordinals(self) -> list[int]:
        if not self.invocations.exists():
            return []
        return [
            int(line)
            for line in self.invocations.read_text(encoding="utf-8").splitlines()
        ]

    def test_schema_domains_are_explicit(self) -> None:
        self.assertEqual(SUPERVISOR.MANIFEST_SCHEMA_VERSION, 2)
        self.assertEqual(SUPERVISOR.INTERNAL_EVIDENCE_SCHEMA_VERSION, 1)
        self.assertEqual(SUPERVISOR.LEGACY_AGGREGATE_SCHEMA_VERSION, 1)
        self.assertEqual(self.manifest["schemaVersion"], 2)
        self.assertEqual(
            set(self.attestation["runtimeHashes"]),
            SUPERVISOR.RUNTIME_HASH_KEYS,
        )
        self.assertEqual(
            self.attestation["runtimeHashes"], self.manifest["runtimeHashes"]
        )

    def test_success_is_checkpointed_in_manifest_order_with_private_files(self) -> None:
        supervisor = self.supervisor("success", self.command("success"))
        summary = supervisor.run()
        self.assertEqual(summary["completedCount"], 3)
        self.assertEqual(summary["pendingCount"], 0)
        self.assertEqual(self.invocation_ordinals(), [0, 1, 2])
        for ordinal in range(3):
            family_dir = supervisor.family_directory(ordinal)
            checkpoint = family_dir / "completion-checkpoint.json"
            terminal = family_dir / "attempts/01/attempt-terminal.json"
            for path in (checkpoint, terminal):
                self.assertTrue(path.is_file())
                self.assertEqual(path.stat().st_mode & 0o077, 0)
            checkpoint_value = json.loads(checkpoint.read_text(encoding="utf-8"))
            self.assertNotIn("fidelityStatus", json.dumps(checkpoint_value))

        campaign_path = supervisor.run_root / "campaign-terminal.json"
        self.assertEqual(
            summary["campaignTerminal"],
            SUPERVISOR.private_exact_file(campaign_path),
        )
        self.assertEqual(campaign_path.stat().st_mode & 0o077, 0)
        campaign = json.loads(campaign_path.read_text(encoding="utf-8"))
        self.assertEqual(campaign["manifestSha256"], supervisor.manifest_sha256)
        self.assertEqual(campaign["attestationSha256"], supervisor.attestation_sha256)
        self.assertEqual(
            [entry["manifestOrdinal"] for entry in campaign["checkpoints"]],
            [0, 1, 2],
        )
        self.assertEqual(campaign["technicalAttemptCount"], 3)
        self.assertEqual(
            [
                (
                    entry["family"]["manifestOrdinal"],
                    entry["attemptNumber"],
                )
                for entry in campaign["attempts"]
            ],
            [(0, 1), (1, 1), (2, 1)],
        )
        for ordinal, entry in enumerate(campaign["attempts"]):
            attempt_dir = supervisor.family_directory(ordinal) / "attempts/01"
            self.assertEqual(
                entry["intent"],
                SUPERVISOR.private_exact_file(
                    attempt_dir / "attempt-intent.json"
                ),
            )
            self.assertEqual(
                entry["terminal"],
                SUPERVISOR.private_exact_file(
                    attempt_dir / "attempt-terminal.json"
                ),
            )
            self.assertEqual(
                entry["shard"],
                SUPERVISOR.exact_file_binding(
                    attempt_dir / "family-shard.json"
                ),
            )
        self.assertNotIn("fidelityStatus", json.dumps(campaign))
        tampered = copy.deepcopy(campaign)
        tampered["attempts"][0]["terminal"]["sha256"] = "f" * 64
        with self.assertRaises(SUPERVISOR.ValidationError):
            supervisor._validate_campaign_terminal(tampered)

    def test_timeout_kills_process_group_and_descendant(self) -> None:
        self.manifest["families"] = self.manifest["families"][:1]
        self._write_json(self.manifest_path, self.manifest)
        self._refresh_attestation_manifest_binding()
        descendant_pid_path = self.root / "descendant.pid"
        supervisor = self.supervisor(
            "timeout",
            self.command("timeout", descendant_pid=descendant_pid_path),
            max_attempts=1,
            timeout=0.25,
            grace=0.1,
        )
        summary = supervisor.run()
        self.assertEqual(summary["pendingCount"], 1)
        terminal_path = (
            supervisor.family_directory(0)
            / "attempts/01/attempt-terminal.json"
        )
        terminal = json.loads(terminal_path.read_text(encoding="utf-8"))
        self.assertTrue(terminal["process"]["timedOut"])
        self.assertTrue(terminal["process"]["termSent"])
        self.assertTrue(terminal["process"]["killSent"])
        self.assertIn(
            "worker_timeout",
            terminal["technicalDisposition"]["categories"],
        )
        pid = int(descendant_pid_path.read_text(encoding="utf-8"))
        deadline = time.time() + 2
        while time.time() < deadline and not process_is_gone(pid):
            time.sleep(0.02)
        self.assertTrue(process_is_gone(pid), f"descendant {pid} survived group kill")

    def test_hashed_worker_diagnostic_is_bound_without_raw_text(self) -> None:
        self.manifest["families"] = self.manifest["families"][:1]
        self._write_json(self.manifest_path, self.manifest)
        self._refresh_attestation_manifest_binding()
        supervisor = self.supervisor(
            "diagnostic",
            self.command("diagnostic"),
            max_attempts=1,
        )
        summary = supervisor.run()
        self.assertEqual(summary["pendingCount"], 1)
        terminal_path = (
            supervisor.family_directory(0)
            / "attempts/01/attempt-terminal.json"
        )
        terminal = json.loads(terminal_path.read_text(encoding="utf-8"))
        disposition = terminal["technicalDisposition"]
        self.assertEqual(
            disposition["workerDiagnostic"]["stage"], "manifest_validate"
        )
        self.assertNotIn("unexpected_worker_output", disposition["categories"])
        self.assertNotIn("winner beta", json.dumps(terminal))
        self.assertGreater(terminal["streams"]["stderr"]["bytes"], 0)
        tampered = copy.deepcopy(terminal)
        tampered["technicalDisposition"]["workerDiagnostic"][
            "errorMessageSha256"
        ] = "f" * 64
        with self.assertRaisesRegex(
            SUPERVISOR.ValidationError, "exact stderr stream"
        ):
            SUPERVISOR.validate_terminal(
                tampered,
                manifest_sha256=supervisor.manifest_sha256,
                attestation_sha256=supervisor.attestation_sha256,
                family_binding=supervisor.family_binding(0),
                attempt_number=1,
                intent_sha256=terminal["intentSha256"],
                scheduler=SCHEDULER,
            )

    def test_crash_retries_once_then_accepts_second_attempt(self) -> None:
        self.manifest["families"] = self.manifest["families"][:1]
        self._write_json(self.manifest_path, self.manifest)
        self._refresh_attestation_manifest_binding()
        state_file = self.root / "retry-count.txt"
        supervisor = self.supervisor(
            "retry", self.command("retry", state_file=state_file)
        )
        summary = supervisor.run()
        self.assertEqual(summary["completedCount"], 1)
        self.assertEqual(summary["launchedAttemptCount"], 2)
        checkpoint = json.loads(
            (
                supervisor.family_directory(0) / "completion-checkpoint.json"
            ).read_text(encoding="utf-8")
        )
        self.assertEqual(checkpoint["accepted"]["attemptNumber"], 2)
        first_terminal = json.loads(
            (
                supervisor.family_directory(0)
                / "attempts/01/attempt-terminal.json"
            ).read_text(encoding="utf-8")
        )
        self.assertEqual(
            first_terminal["technicalDisposition"]["status"],
            "retryable_failure",
        )
        campaign = json.loads(
            Path(summary["campaignTerminal"]["path"]).read_text(
                encoding="utf-8"
            )
        )
        self.assertEqual(campaign["technicalAttemptCount"], 2)
        self.assertEqual(
            [
                (
                    entry["family"]["manifestOrdinal"],
                    entry["attemptNumber"],
                )
                for entry in campaign["attempts"]
            ],
            [(0, 1), (0, 2)],
        )
        accepted_attempt = campaign["attempts"][1]
        self.assertEqual(
            accepted_attempt["intent"]["sha256"],
            checkpoint["accepted"]["intentSha256"],
        )
        self.assertEqual(
            accepted_attempt["terminal"]["sha256"],
            checkpoint["accepted"]["terminalSha256"],
        )
        self.assertEqual(accepted_attempt["shard"], checkpoint["accepted"]["shard"])

    def test_malformed_and_partial_shards_are_never_checkpointed(self) -> None:
        for mode in ("malformed", "partial", "malformed-nested"):
            with self.subTest(mode=mode):
                if self.invocations.exists():
                    self.invocations.unlink()
                supervisor = self.supervisor(
                    f"bad-{mode}", self.command(mode), max_attempts=1
                )
                summary = supervisor.run()
                self.assertEqual(summary["completedCount"], 0)
                self.assertEqual(summary["pendingCount"], 3)
                for ordinal in range(3):
                    self.assertFalse(
                        (
                            supervisor.family_directory(ordinal)
                            / "completion-checkpoint.json"
                        ).exists()
                    )

    def test_fixed_retry_budget_is_not_reset_by_resume(self) -> None:
        supervisor = self.supervisor("crash", self.command("crash"))
        first = supervisor.run()
        self.assertEqual(first["launchedAttemptCount"], 6)
        before = self.invocation_ordinals()
        second = self.supervisor("crash", self.command("crash")).run()
        self.assertEqual(second["launchedAttemptCount"], 0)
        self.assertEqual(second["pendingCount"], 3)
        self.assertEqual(self.invocation_ordinals(), before)

    def test_resume_is_status_blind_and_launches_no_completed_family(self) -> None:
        statuses = self.root / "statuses.json"
        self._write_json(
            statuses,
            {"0": "pass", "1": "review", "2": "fail"},
        )
        command = self.command("success", statuses=statuses)
        first_supervisor = self.supervisor("resume", command)
        first = first_supervisor.run()
        self.assertEqual(first["launchedAttemptCount"], 3)
        for ordinal, expected_status in enumerate(("pass", "review", "fail")):
            family_dir = first_supervisor.family_directory(ordinal)
            attempt_names = sorted(
                path.name for path in (family_dir / "attempts").iterdir()
            )
            self.assertEqual(attempt_names, ["01"])
            checkpoint = json.loads(
                (family_dir / "completion-checkpoint.json").read_text(encoding="utf-8")
            )
            self.assertEqual(checkpoint["accepted"]["attemptNumber"], 1)
            shard = json.loads(
                (family_dir / "attempts/01/family-shard.json").read_text(
                    encoding="utf-8"
                )
            )
            self.assertEqual(
                shard["payload"]["familyResult"]["fidelityStatus"],
                expected_status,
            )
        self.assertEqual(first["completedCount"], 3)
        self.invocations.write_text("", encoding="utf-8")
        second = self.supervisor("resume", command).run()
        self.assertEqual(second["resumedCount"], 3)
        self.assertEqual(second["launchedAttemptCount"], 0)
        self.assertEqual(self.invocation_ordinals(), [])

    def test_tampered_checkpoint_fails_closed(self) -> None:
        command = self.command("success")
        supervisor = self.supervisor("tamper", command)
        supervisor.run()
        checkpoint_path = (
            supervisor.family_directory(0) / "completion-checkpoint.json"
        )
        checkpoint = json.loads(checkpoint_path.read_text(encoding="utf-8"))
        checkpoint["winner"] = "alpha"
        self._write_json(checkpoint_path, checkpoint)
        with self.assertRaises(SUPERVISOR.ValidationError):
            self.supervisor("tamper", command).run()

    def test_manifest_or_attestation_tampering_invalidates_resume(self) -> None:
        command = self.command("success")
        supervisor = self.supervisor("binding", command)
        supervisor.run()
        changed = copy.deepcopy(self.attestation)
        changed["runtimeHashes"]["runtimeBundleSha256"] = "b" * 64
        self._write_json(self.attestation_path, changed)
        with self.assertRaises(SUPERVISOR.ValidationError):
            self.supervisor("binding", command).run()

    def test_outcome_and_role_keys_in_shard_are_rejected(self) -> None:
        for mode in ("outcome-key", "role-key"):
            with self.subTest(mode=mode):
                if self.invocations.exists():
                    self.invocations.unlink()
                supervisor = self.supervisor(
                    f"forbidden-{mode}", self.command(mode), max_attempts=1
                )
                summary = supervisor.run()
                self.assertEqual(summary["completedCount"], 0)
                terminal = json.loads(
                    (
                        supervisor.family_directory(0)
                        / "attempts/01/attempt-terminal.json"
                    ).read_text(encoding="utf-8")
                )
                self.assertIn(
                    "shard_malformed_or_binding_invalid",
                    terminal["technicalDisposition"]["categories"],
                )

    def test_unknown_intent_terminal_and_checkpoint_keys_are_rejected(self) -> None:
        command = self.command("success")
        supervisor = self.supervisor("strict", command)
        supervisor.run()
        family_dir = supervisor.family_directory(0)
        cases = [
            (
                family_dir / "attempts/01/attempt-intent.json",
                SUPERVISOR.validate_attempt_intent,
            ),
            (
                family_dir / "attempts/01/attempt-terminal.json",
                None,
            ),
            (
                family_dir / "completion-checkpoint.json",
                None,
            ),
        ]
        for path, validator in cases:
            value = json.loads(path.read_text(encoding="utf-8"))
            value["unknownField"] = True
            if validator is not None:
                with self.assertRaises(SUPERVISOR.ValidationError):
                    validator(value)
            else:
                SUPERVISOR.reject_forbidden_keys(value, "fixture")
                expected_keys = (
                    SUPERVISOR.TERMINAL_KEYS
                    if "terminal" in path.name
                    else SUPERVISOR.CHECKPOINT_KEYS
                )
                with self.assertRaises(SUPERVISOR.ValidationError):
                    SUPERVISOR.require_exact_keys(value, expected_keys, "fixture")

    def test_spawn_failure_is_retryable_and_bounded(self) -> None:
        command = [str(self.root / "missing-worker")]
        supervisor = self.supervisor("spawn-failure", command)
        summary = supervisor.run()
        self.assertEqual(summary["pendingCount"], 3)
        self.assertEqual(summary["launchedAttemptCount"], 6)
        terminal = json.loads(
            (
                supervisor.family_directory(0)
                / "attempts/01/attempt-terminal.json"
            ).read_text(encoding="utf-8")
        )
        self.assertIn(
            "worker_spawn_failed",
            terminal["technicalDisposition"]["categories"],
        )

    def test_residual_descendant_pipe_is_killed_without_unbounded_join(self) -> None:
        descendant_pid = self.root / "orphan-descendant.pid"
        supervisor = self.supervisor(
            "orphan-pipe",
            self.command("orphan-pipe", descendant_pid=descendant_pid),
            max_attempts=1,
            grace=0.1,
        )
        started = time.monotonic()
        summary = supervisor.run()
        self.assertLess(time.monotonic() - started, 5)
        self.assertEqual(summary["pendingCount"], 3)
        terminal = json.loads(
            (
                supervisor.family_directory(0)
                / "attempts/01/attempt-terminal.json"
            ).read_text(encoding="utf-8")
        )
        self.assertIn(
            "descendant_stream_timeout",
            terminal["technicalDisposition"]["categories"],
        )
        pid = int(descendant_pid.read_text(encoding="utf-8"))
        deadline = time.time() + 2
        while time.time() < deadline and not process_is_gone(pid):
            time.sleep(0.02)
        self.assertTrue(process_is_gone(pid))

    def test_worker_output_is_hash_only_and_never_accepted(self) -> None:
        supervisor = self.supervisor(
            "noisy",
            self.command("noisy"),
            max_attempts=1,
            stream_bytes=64,
        )
        summary = supervisor.run()
        self.assertEqual(summary["pendingCount"], 3)
        attempt_dir = supervisor.family_directory(0) / "attempts/01"
        terminal = json.loads(
            (attempt_dir / "attempt-terminal.json").read_text(encoding="utf-8")
        )
        self.assertEqual(terminal["streams"]["stdout"]["bytes"], 4096)
        self.assertEqual(
            terminal["streams"]["stdout"]["sha256"],
            __import__("hashlib").sha256(b"x" * 4096).hexdigest(),
        )
        self.assertIn(
            "unexpected_worker_output",
            terminal["technicalDisposition"]["categories"],
        )
        self.assertFalse((attempt_dir / "worker.stdout.log").exists())
        self.assertFalse((attempt_dir / "worker.stderr.log").exists())

    def test_worker_environment_is_allowlisted_and_bound(self) -> None:
        command = self.command("env-leak")
        source_environment = {
            "PATH": os.environ.get("PATH", ""),
            "TZ": "UTC",
            "WINNER": "alpha",
            "DRY_RUN_ROLE": "test",
        }
        supervisor = SUPERVISOR.MapFidelitySupervisor(
            manifest_path=self.manifest_path,
            attestation_path=self.attestation_path,
            run_root=self.root / "environment",
            worker_command_prefix=command,
            scheduler=SCHEDULER,
            worker_environment=source_environment,
            # This test checks environment filtering, not timeout behavior.
            # Leave enough headroom for a loaded shared login node.
            timeout_seconds=20,
            termination_grace_seconds=0.1,
            max_stream_bytes=1024,
            max_attempts=1,
        )
        summary = supervisor.run()
        self.assertEqual(summary["completedCount"], 3)
        intent = json.loads(
            (
                supervisor.family_directory(0)
                / "attempts/01/attempt-intent.json"
            ).read_text(encoding="utf-8")
        )
        self.assertEqual(
            intent["environment"]["values"],
            {"PATH": source_environment["PATH"], "TZ": "UTC"},
        )
        self.assertEqual(
            intent["environment"]["sha256"],
            SUPERVISOR.canonical_sha256(intent["environment"]["values"]),
        )
        self.assertEqual(
            intent["worker"]["commandPrefixSha256"],
            SUPERVISOR.canonical_sha256(command),
        )
        self.assertEqual(
            intent["worker"]["executable"],
            SUPERVISOR.exact_file_binding(Path(sys.executable)),
        )

    def test_manifest_forbidden_key_and_symlinked_run_root_fail_closed(self) -> None:
        manifest = copy.deepcopy(self.manifest)
        manifest["families"][0]["splitRole"] = "test"
        self._write_json(self.manifest_path, manifest)
        self._refresh_attestation_manifest_binding()
        with self.assertRaises(SUPERVISOR.ValidationError):
            self.supervisor("forbidden-manifest", self.command("success"))

        self._write_json(self.manifest_path, self.manifest)
        self._refresh_attestation_manifest_binding()
        target = self.root / "real-run-root"
        target.mkdir(mode=0o700)
        symlink = self.root / "symlink-run-root"
        symlink.symlink_to(target, target_is_directory=True)
        with self.assertRaises(SUPERVISOR.ValidationError):
            SUPERVISOR.MapFidelitySupervisor(
                manifest_path=self.manifest_path,
                attestation_path=self.attestation_path,
                run_root=symlink,
                worker_command_prefix=self.command("success"),
                scheduler=SCHEDULER,
            )

    def test_campaign_lock_is_exclusive(self) -> None:
        supervisor = self.supervisor("locked", self.command("success"))
        with SUPERVISOR.CampaignLock(supervisor.run_root / "campaign.lock"):
            with self.assertRaises(SUPERVISOR.CampaignBusyError):
                supervisor.run()


if __name__ == "__main__":
    unittest.main()
