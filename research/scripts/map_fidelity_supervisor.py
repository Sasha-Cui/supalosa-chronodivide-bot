#!/usr/bin/env python3
"""Outcome-free, per-family process supervisor for the map-fidelity gate.

This module is deliberately independent of the game engine.  It launches an
allowlisted worker command once per manifest family, records append-only
attempt evidence, and resumes only from exact completion checkpoints.  The
current TypeScript worker and Slurm entrypoint do not use it yet.
"""

from __future__ import annotations

import argparse
import fcntl
import hashlib
import json
import os
import re
import signal
import stat
import subprocess
import sys
import threading
import time
from pathlib import Path
from typing import Any, BinaryIO, Iterable, Sequence


GATE = "map-fidelity-gate-v1"
SCHEMA_VERSION = 1
MAX_TECHNICAL_ATTEMPTS = 2
DEFAULT_TIMEOUT_SECONDS = 120.0
DEFAULT_TERMINATION_GRACE_SECONDS = 5.0
DEFAULT_MAX_STREAM_BYTES = 1024 * 1024
HEX_SHA256 = re.compile(r"^[0-9a-f]{64}$")

ALLOWED_WORKER_ENV_KEYS = (
    "PATH",
    "LD_LIBRARY_PATH",
    "TZ",
    "LC_ALL",
    "PYTHONHASHSEED",
    "DEBUG_LOGGING",
    "SCONTROL",
    "SLURM_JOB_ID",
    "SLURM_JOB_NAME",
    "SLURM_JOB_PARTITION",
    "SLURM_JOB_QOS",
    "SLURM_CPUS_PER_TASK",
    "SLURM_MEM_PER_NODE",
    "SLURM_RESTART_COUNT",
    "SLURM_ARRAY_JOB_ID",
    "SLURM_ARRAY_TASK_ID",
    "SLURMD_NODENAME",
)

FORBIDDEN_OUTCOME_KEYS = {
    "winner",
    "loser",
    "defeated",
    "credits",
    "candidatewins",
    "baselinewins",
    "winrate",
    "scorerate",
    "score",
    "draws",
    "combatants",
    "units",
    "buildings",
    "playerstats",
    "isfinished",
    "finished",
    "outcome",
}
FORBIDDEN_ROLE_KEYS = {
    "role",
    "dryrunrole",
    "mvprole",
    "splitrole",
    "selectedformvp",
    "assignment",
}

SCHEDULER_KEYS = {"jobId", "account", "partition", "qos", "source"}
FILE_BINDING_KEYS = {"path", "sha256"}
FAMILY_BINDING_KEYS = {
    "manifestOrdinal",
    "familyIndex",
    "familyIdSha256",
    "familyEntrySha256",
}
INTENT_KEYS = {
    "schemaVersion",
    "gate",
    "artifactKind",
    "outcomeFree",
    "manifest",
    "attestation",
    "family",
    "attemptNumber",
    "executionPolicy",
    "scheduler",
    "environment",
    "worker",
}
ENVIRONMENT_KEYS = {"allowedKeys", "values", "sha256"}
EXECUTION_POLICY_KEYS = {
    "timeoutSeconds",
    "terminationGraceSeconds",
    "maxTechnicalAttempts",
    "maxStreamBytes",
}
WORKER_KEYS = {
    "argumentProtocol",
    "commandSha256",
    "shardPath",
}
SHARD_KEYS = {
    "schemaVersion",
    "gate",
    "artifactKind",
    "outcomeFree",
    "manifestSha256",
    "attestationSha256",
    "family",
    "attemptNumber",
    "intentSha256",
    "scheduler",
    "payload",
}
TERMINAL_KEYS = {
    "schemaVersion",
    "gate",
    "artifactKind",
    "outcomeFree",
    "manifestSha256",
    "attestationSha256",
    "family",
    "attemptNumber",
    "intentSha256",
    "scheduler",
    "timing",
    "process",
    "streams",
    "shard",
    "technicalDisposition",
}
TIMING_KEYS = {"wallTimeMs"}
PROCESS_KEYS = {
    "exitCode",
    "termSignal",
    "timedOut",
    "termSent",
    "killSent",
}
STREAMS_KEYS = {"stdout", "stderr"}
STREAM_KEYS = {"bytes", "sha256", "truncated"}
SHARD_BINDING_KEYS = {"path", "bytes", "sha256"}
DISPOSITION_KEYS = {"status", "categories"}
CHECKPOINT_KEYS = {
    "schemaVersion",
    "gate",
    "artifactKind",
    "outcomeFree",
    "manifestSha256",
    "attestationSha256",
    "family",
    "scheduler",
    "accepted",
}
ACCEPTED_KEYS = {
    "attemptNumber",
    "intentSha256",
    "terminalSha256",
    "shard",
}
ATTESTATION_KEYS = {
    "schemaVersion",
    "gate",
    "artifactKind",
    "outcomeFree",
    "manifest",
    "scheduler",
    "runtimeHashes",
}


class SupervisorError(RuntimeError):
    """Base error for supervisor failures."""


class ValidationError(SupervisorError):
    """An evidence artifact failed a strict or cryptographic check."""


class CampaignBusyError(SupervisorError):
    """Another process owns the campaign lock."""


def canonical_bytes(value: Any) -> bytes:
    return json.dumps(
        value,
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=True,
    ).encode("utf-8")


def canonical_sha256(value: Any) -> str:
    return hashlib.sha256(canonical_bytes(value)).hexdigest()


def reject_symlink_components(path: Path, label: str) -> None:
    absolute = path.absolute()
    current = Path(absolute.anchor)
    for part in absolute.parts[1:]:
        current /= part
        if os.path.lexists(current) and stat.S_ISLNK(current.lstat().st_mode):
            raise ValidationError(f"{label} contains a symbolic-link component: {current}")


def sha256_file(path: Path) -> str:
    reject_symlink_components(path, "Hashed artifact path")
    descriptor = path.lstat()
    if not stat.S_ISREG(descriptor.st_mode):
        raise ValidationError(f"Hashed artifact is not a regular file: {path}")
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def load_json(path: Path) -> dict[str, Any]:
    try:
        reject_symlink_components(path, "Strict JSON artifact path")
        descriptor = path.lstat()
        if not stat.S_ISREG(descriptor.st_mode):
            raise ValidationError(f"Strict JSON artifact is not a regular file: {path}")
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, UnicodeError, json.JSONDecodeError) as error:
        raise ValidationError(f"Cannot read strict JSON artifact {path}: {error}") from error
    if not isinstance(value, dict):
        raise ValidationError(f"Strict JSON artifact is not an object: {path}")
    return value


def require_exact_keys(value: Any, expected: set[str], label: str) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise ValidationError(f"{label} must be an object")
    actual = set(value)
    if actual != expected:
        raise ValidationError(
            f"{label} keys must be exactly {sorted(expected)}, got {sorted(actual)}"
        )
    return value


def require_sha256(value: Any, label: str) -> str:
    if not isinstance(value, str) or not HEX_SHA256.fullmatch(value):
        raise ValidationError(f"{label} must be a lowercase SHA-256")
    return value


def require_nonnegative_integer(value: Any, label: str) -> int:
    if isinstance(value, bool) or not isinstance(value, int) or value < 0:
        raise ValidationError(f"{label} must be a nonnegative integer")
    return value


def normalized_key(value: str) -> str:
    return re.sub(r"[^a-z0-9]", "", value.lower())


def forbidden_key_paths(value: Any, path: str = "$") -> list[str]:
    findings: list[str] = []
    if isinstance(value, dict):
        for key, nested in value.items():
            rendered = str(key)
            normalized = normalized_key(rendered)
            if normalized in FORBIDDEN_OUTCOME_KEYS or normalized in FORBIDDEN_ROLE_KEYS:
                findings.append(f"{path}.{rendered}")
            findings.extend(forbidden_key_paths(nested, f"{path}.{rendered}"))
    elif isinstance(value, list):
        for index, nested in enumerate(value):
            findings.extend(forbidden_key_paths(nested, f"{path}[{index}]"))
    return findings


def reject_forbidden_keys(value: Any, label: str) -> None:
    findings = forbidden_key_paths(value)
    if findings:
        raise ValidationError(
            f"{label} contains forbidden outcome/role keys: {', '.join(findings[:20])}"
        )


def validate_scheduler(value: Any, label: str = "scheduler") -> dict[str, Any]:
    scheduler = require_exact_keys(value, SCHEDULER_KEYS, label)
    if (
        not isinstance(scheduler["jobId"], str)
        or not scheduler["jobId"]
        or scheduler["account"] != "pi_jss233"
        or scheduler["source"] != "scontrol"
    ):
        raise ValidationError(f"{label} is not authoritative pi_jss233 provenance")
    for key in ("partition", "qos"):
        if scheduler[key] is not None and not isinstance(scheduler[key], str):
            raise ValidationError(f"{label}.{key} must be a string or null")
    return scheduler


def validate_file_binding(value: Any, label: str) -> dict[str, Any]:
    binding = require_exact_keys(value, FILE_BINDING_KEYS, label)
    if not isinstance(binding["path"], str) or not Path(binding["path"]).is_absolute():
        raise ValidationError(f"{label}.path must be absolute")
    require_sha256(binding["sha256"], f"{label}.sha256")
    return binding


def validate_family_binding(value: Any, label: str = "family") -> dict[str, Any]:
    binding = require_exact_keys(value, FAMILY_BINDING_KEYS, label)
    require_nonnegative_integer(binding["manifestOrdinal"], f"{label}.manifestOrdinal")
    require_nonnegative_integer(binding["familyIndex"], f"{label}.familyIndex")
    require_sha256(binding["familyIdSha256"], f"{label}.familyIdSha256")
    require_sha256(binding["familyEntrySha256"], f"{label}.familyEntrySha256")
    return binding


def ensure_private_directory(path: Path) -> None:
    reject_symlink_components(path, "Private directory path")
    missing: list[Path] = []
    cursor = path
    while not os.path.lexists(cursor):
        missing.append(cursor)
        parent = cursor.parent
        if parent == cursor:
            break
        cursor = parent
    for directory in reversed(missing):
        directory.mkdir(mode=0o700)
        os.chmod(directory, 0o700)
    descriptor = path.lstat()
    if stat.S_ISLNK(descriptor.st_mode):
        raise SupervisorError(f"Private directory cannot be a symbolic link: {path}")
    if not stat.S_ISDIR(descriptor.st_mode):
        raise SupervisorError(f"Required private path is not a directory: {path}")
    if descriptor.st_mode & 0o077:
        raise SupervisorError(f"Private directory is accessible to group/other: {path}")


def fsync_directory(path: Path) -> None:
    flags = os.O_RDONLY | getattr(os, "O_DIRECTORY", 0)
    descriptor = os.open(path, flags)
    try:
        os.fsync(descriptor)
    finally:
        os.close(descriptor)


def atomic_write_json(path: Path, value: dict[str, Any]) -> None:
    """Write one private JSON artifact without overwrite."""

    ensure_private_directory(path.parent)
    if os.path.lexists(path):
        raise SupervisorError(f"Refusing to overwrite evidence artifact: {path}")
    reject_forbidden_keys(value, str(path))
    payload = json.dumps(value, indent=2, sort_keys=True).encode("utf-8") + b"\n"
    temporary = path.parent / f".{path.name}.tmp-{os.getpid()}-{time.monotonic_ns()}"
    descriptor: int | None = None
    try:
        descriptor = os.open(
            temporary,
            os.O_WRONLY | os.O_CREAT | os.O_EXCL,
            0o600,
        )
        with os.fdopen(descriptor, "wb", closefd=True) as handle:
            descriptor = None
            handle.write(payload)
            handle.flush()
            os.fsync(handle.fileno())
        if os.path.lexists(path):
            raise SupervisorError(f"Evidence artifact appeared concurrently: {path}")
        os.rename(temporary, path)
        fsync_directory(path.parent)
    finally:
        if descriptor is not None:
            os.close(descriptor)
        if temporary.exists():
            temporary.unlink()


def private_exact_file(path: Path) -> dict[str, Any]:
    if path.is_symlink():
        raise ValidationError(f"Artifact cannot be a symbolic link: {path}")
    resolved = path.resolve(strict=True)
    descriptor = resolved.stat()
    if not stat.S_ISREG(descriptor.st_mode):
        raise ValidationError(f"Artifact is not a regular file: {resolved}")
    if descriptor.st_mode & 0o077:
        raise ValidationError(f"Artifact is accessible to group/other: {resolved}")
    return {
        "path": str(resolved),
        "bytes": descriptor.st_size,
        "sha256": sha256_file(resolved),
    }


class CampaignLock:
    def __init__(self, path: Path):
        self.path = path
        self._descriptor: int | None = None

    def __enter__(self) -> "CampaignLock":
        ensure_private_directory(self.path.parent)
        if os.path.lexists(self.path) and stat.S_ISLNK(self.path.lstat().st_mode):
            raise ValidationError(f"Campaign lock cannot be a symbolic link: {self.path}")
        self._descriptor = os.open(
            self.path,
            os.O_RDWR | os.O_CREAT | getattr(os, "O_NOFOLLOW", 0),
            0o600,
        )
        os.fchmod(self._descriptor, 0o600)
        try:
            fcntl.flock(self._descriptor, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError as error:
            os.close(self._descriptor)
            self._descriptor = None
            raise CampaignBusyError(
                f"Another supervisor owns campaign lock {self.path}"
            ) from error
        return self

    def __exit__(self, *_: object) -> None:
        if self._descriptor is not None:
            fcntl.flock(self._descriptor, fcntl.LOCK_UN)
            os.close(self._descriptor)
            self._descriptor = None


class BoundedStreamCollector(threading.Thread):
    """Drain and hash a pipe without retaining raw worker output."""

    def __init__(self, pipe: BinaryIO, max_bytes: int):
        super().__init__(daemon=True)
        self.pipe = pipe
        self.max_bytes = max_bytes
        self.total_bytes = 0
        self.digest = hashlib.sha256()
        self.error: BaseException | None = None

    def run(self) -> None:
        try:
            while True:
                block = self.pipe.read(64 * 1024)
                if not block:
                    break
                self.total_bytes += len(block)
                self.digest.update(block)
        except BaseException as error:  # captured and converted to evidence
            self.error = error
        finally:
            self.pipe.close()

    def record(self) -> dict[str, Any]:
        return {
            "bytes": self.total_bytes,
            "sha256": self.digest.hexdigest(),
            "truncated": self.total_bytes > self.max_bytes,
        }



def validate_environment_binding(value: Any, label: str) -> dict[str, Any]:
    binding = require_exact_keys(value, ENVIRONMENT_KEYS, label)
    if binding["allowedKeys"] != list(ALLOWED_WORKER_ENV_KEYS):
        raise ValidationError(f"{label}.allowedKeys does not match the fixed allowlist")
    values = binding["values"]
    if not isinstance(values, dict):
        raise ValidationError(f"{label}.values must be an object")
    if any(key not in ALLOWED_WORKER_ENV_KEYS for key in values):
        raise ValidationError(f"{label}.values contains a non-allowlisted key")
    if any(not isinstance(key, str) or not isinstance(item, str) for key, item in values.items()):
        raise ValidationError(f"{label}.values must contain only string pairs")
    reject_forbidden_keys(values, f"{label}.values")
    require_sha256(binding["sha256"], f"{label}.sha256")
    if binding["sha256"] != canonical_sha256(values):
        raise ValidationError(f"{label}.sha256 does not bind the environment values")
    return binding
def validate_attempt_intent(
    value: Any,
    *,
    expected: dict[str, Any] | None = None,
) -> dict[str, Any]:
    intent = require_exact_keys(value, INTENT_KEYS, "attempt intent")
    reject_forbidden_keys(intent, "attempt intent")
    if (
        intent["schemaVersion"] != SCHEMA_VERSION
        or intent["gate"] != GATE
        or intent["artifactKind"] != "map_fidelity_family_attempt_intent"
        or intent["outcomeFree"] is not True
    ):
        raise ValidationError("Attempt intent identity markers are invalid")
    validate_file_binding(intent["manifest"], "attempt intent.manifest")
    validate_file_binding(intent["attestation"], "attempt intent.attestation")
    validate_family_binding(intent["family"], "attempt intent.family")
    attempt_number = require_nonnegative_integer(
        intent["attemptNumber"], "attempt intent.attemptNumber"
    )
    if not 1 <= attempt_number <= MAX_TECHNICAL_ATTEMPTS:
        raise ValidationError("Attempt number is outside the fixed technical budget")
    policy = require_exact_keys(
        intent["executionPolicy"], EXECUTION_POLICY_KEYS, "attempt intent.executionPolicy"
    )
    for key in ("timeoutSeconds", "terminationGraceSeconds"):
        if (
            isinstance(policy[key], bool)
            or not isinstance(policy[key], (int, float))
            or policy[key] <= 0
        ):
            raise ValidationError(f"attempt intent.executionPolicy.{key} must be positive")
    if policy["maxTechnicalAttempts"] not in (1, 2):
        raise ValidationError("maxTechnicalAttempts must be one or two")
    if (
        isinstance(policy["maxStreamBytes"], bool)
        or not isinstance(policy["maxStreamBytes"], int)
        or policy["maxStreamBytes"] <= 0
    ):
        raise ValidationError("maxStreamBytes must be a positive integer")
    validate_scheduler(intent["scheduler"], "attempt intent.scheduler")
    validate_environment_binding(intent["environment"], "attempt intent.environment")
    worker = require_exact_keys(intent["worker"], WORKER_KEYS, "attempt intent.worker")
    if worker["argumentProtocol"] != "map-fidelity-family-worker-v1":
        raise ValidationError("Worker argument protocol is invalid")
    require_sha256(worker["commandSha256"], "attempt intent.worker.commandSha256")
    if not isinstance(worker["shardPath"], str) or not Path(worker["shardPath"]).is_absolute():
        raise ValidationError("attempt intent.worker.shardPath must be absolute")
    if expected is not None and intent != expected:
        raise ValidationError("Attempt intent does not exactly match deterministic expectation")
    return intent


def validate_family_shard(
    value: Any,
    *,
    manifest_sha256: str,
    attestation_sha256: str,
    family_binding: dict[str, Any],
    attempt_number: int,
    intent_sha256: str,
    scheduler: dict[str, Any],
) -> dict[str, Any]:
    shard = require_exact_keys(value, SHARD_KEYS, "family shard")
    reject_forbidden_keys(shard, "family shard")
    if (
        shard["schemaVersion"] != SCHEMA_VERSION
        or shard["gate"] != GATE
        or shard["artifactKind"] != "map_fidelity_family_worker_shard"
        or shard["outcomeFree"] is not True
        or shard["manifestSha256"] != manifest_sha256
        or shard["attestationSha256"] != attestation_sha256
        or shard["family"] != family_binding
        or shard["attemptNumber"] != attempt_number
        or shard["intentSha256"] != intent_sha256
        or shard["scheduler"] != scheduler
    ):
        raise ValidationError("Family shard binding is invalid")
    validate_family_binding(shard["family"], "family shard.family")
    validate_scheduler(shard["scheduler"], "family shard.scheduler")
    if not isinstance(shard["payload"], dict):
        raise ValidationError("Family shard payload must be an object")
    return shard


def validate_terminal(
    value: Any,
    *,
    manifest_sha256: str,
    attestation_sha256: str,
    family_binding: dict[str, Any],
    attempt_number: int,
    intent_sha256: str,
    scheduler: dict[str, Any],
) -> dict[str, Any]:
    terminal = require_exact_keys(value, TERMINAL_KEYS, "attempt terminal")
    reject_forbidden_keys(terminal, "attempt terminal")
    if (
        terminal["schemaVersion"] != SCHEMA_VERSION
        or terminal["gate"] != GATE
        or terminal["artifactKind"] != "map_fidelity_family_attempt_terminal"
        or terminal["outcomeFree"] is not True
        or terminal["manifestSha256"] != manifest_sha256
        or terminal["attestationSha256"] != attestation_sha256
        or terminal["family"] != family_binding
        or terminal["attemptNumber"] != attempt_number
        or terminal["intentSha256"] != intent_sha256
        or terminal["scheduler"] != scheduler
    ):
        raise ValidationError("Attempt terminal binding is invalid")
    validate_family_binding(terminal["family"], "attempt terminal.family")
    validate_scheduler(terminal["scheduler"], "attempt terminal.scheduler")
    timing = require_exact_keys(terminal["timing"], TIMING_KEYS, "attempt terminal.timing")
    require_nonnegative_integer(timing["wallTimeMs"], "attempt terminal.timing.wallTimeMs")
    process = require_exact_keys(terminal["process"], PROCESS_KEYS, "attempt terminal.process")
    for key in ("exitCode", "termSignal"):
        if process[key] is not None:
            require_nonnegative_integer(process[key], f"attempt terminal.process.{key}")
    for key in ("timedOut", "termSent", "killSent"):
        if not isinstance(process[key], bool):
            raise ValidationError(f"attempt terminal.process.{key} must be boolean")
    streams = require_exact_keys(terminal["streams"], STREAMS_KEYS, "attempt terminal.streams")
    for name in ("stdout", "stderr"):
        stream = require_exact_keys(
            streams[name], STREAM_KEYS, f"attempt terminal.streams.{name}"
        )
        require_nonnegative_integer(stream["bytes"], f"attempt terminal.streams.{name}.bytes")
        require_sha256(stream["sha256"], f"attempt terminal.streams.{name}.sha256")
        if not isinstance(stream["truncated"], bool):
            raise ValidationError(f"attempt terminal.streams.{name}.truncated must be boolean")
    if terminal["shard"] is not None:
        shard = require_exact_keys(
            terminal["shard"], SHARD_BINDING_KEYS, "attempt terminal.shard"
        )
        if not isinstance(shard["path"], str) or not Path(shard["path"]).is_absolute():
            raise ValidationError("attempt terminal.shard.path must be absolute")
        require_nonnegative_integer(shard["bytes"], "attempt terminal.shard.bytes")
        require_sha256(shard["sha256"], "attempt terminal.shard.sha256")
    disposition = require_exact_keys(
        terminal["technicalDisposition"], DISPOSITION_KEYS, "attempt terminal.technicalDisposition"
    )
    if disposition["status"] not in {"complete", "retryable_failure"}:
        raise ValidationError("Technical disposition status is invalid")
    if (
        not isinstance(disposition["categories"], list)
        or any(not isinstance(item, str) or not item for item in disposition["categories"])
    ):
        raise ValidationError("Technical disposition categories must be strings")
    if disposition["status"] == "complete" and disposition["categories"]:
        raise ValidationError("Complete technical disposition cannot have failure categories")
    if disposition["status"] == "retryable_failure" and not disposition["categories"]:
        raise ValidationError("Retryable disposition must have a category")
    return terminal


def validate_completion_checkpoint(
    value: Any,
    *,
    manifest_sha256: str,
    attestation_sha256: str,
    family_binding: dict[str, Any],
    scheduler: dict[str, Any],
) -> dict[str, Any]:
    checkpoint = require_exact_keys(value, CHECKPOINT_KEYS, "completion checkpoint")
    reject_forbidden_keys(checkpoint, "completion checkpoint")
    if (
        checkpoint["schemaVersion"] != SCHEMA_VERSION
        or checkpoint["gate"] != GATE
        or checkpoint["artifactKind"] != "map_fidelity_family_completion_checkpoint"
        or checkpoint["outcomeFree"] is not True
        or checkpoint["manifestSha256"] != manifest_sha256
        or checkpoint["attestationSha256"] != attestation_sha256
        or checkpoint["family"] != family_binding
        or checkpoint["scheduler"] != scheduler
    ):
        raise ValidationError("Completion checkpoint binding is invalid")
    validate_family_binding(checkpoint["family"], "completion checkpoint.family")
    validate_scheduler(checkpoint["scheduler"], "completion checkpoint.scheduler")
    accepted = require_exact_keys(
        checkpoint["accepted"], ACCEPTED_KEYS, "completion checkpoint.accepted"
    )
    attempt_number = require_nonnegative_integer(
        accepted["attemptNumber"], "completion checkpoint.accepted.attemptNumber"
    )
    if not 1 <= attempt_number <= MAX_TECHNICAL_ATTEMPTS:
        raise ValidationError("Checkpoint attempt number is outside the fixed budget")
    require_sha256(accepted["intentSha256"], "completion checkpoint.accepted.intentSha256")
    require_sha256(accepted["terminalSha256"], "completion checkpoint.accepted.terminalSha256")
    shard = require_exact_keys(
        accepted["shard"], SHARD_BINDING_KEYS, "completion checkpoint.accepted.shard"
    )
    if not isinstance(shard["path"], str) or not Path(shard["path"]).is_absolute():
        raise ValidationError("completion checkpoint.accepted.shard.path must be absolute")
    require_nonnegative_integer(shard["bytes"], "completion checkpoint.accepted.shard.bytes")
    require_sha256(shard["sha256"], "completion checkpoint.accepted.shard.sha256")
    return checkpoint


class MapFidelitySupervisor:
    def __init__(
        self,
        *,
        manifest_path: Path,
        attestation_path: Path,
        run_root: Path,
        worker_command_prefix: Sequence[str],
        scheduler: dict[str, Any],
        worker_environment: dict[str, str] | None = None,
        timeout_seconds: float = DEFAULT_TIMEOUT_SECONDS,
        termination_grace_seconds: float = DEFAULT_TERMINATION_GRACE_SECONDS,
        max_stream_bytes: int = DEFAULT_MAX_STREAM_BYTES,
        max_attempts: int = MAX_TECHNICAL_ATTEMPTS,
    ):
        self.manifest_path = manifest_path.absolute()
        self.attestation_path = attestation_path.absolute()
        self.run_root = run_root.absolute()
        self.worker_command_prefix = [str(item) for item in worker_command_prefix]
        if not self.worker_command_prefix:
            raise ValidationError("Worker command prefix cannot be empty")
        self.scheduler = validate_scheduler(dict(scheduler))
        source_environment = os.environ if worker_environment is None else worker_environment
        self.worker_environment = {
            key: str(source_environment[key])
            for key in ALLOWED_WORKER_ENV_KEYS
            if key in source_environment
        }
        if max_attempts not in (1, 2):
            raise ValidationError("Technical attempt budget must be one or two")
        if timeout_seconds <= 0 or termination_grace_seconds <= 0:
            raise ValidationError("Timeout and termination grace must be positive")
        if max_stream_bytes <= 0:
            raise ValidationError("max_stream_bytes must be positive")
        self.timeout_seconds = float(timeout_seconds)
        self.termination_grace_seconds = float(termination_grace_seconds)
        self.max_stream_bytes = int(max_stream_bytes)
        self.max_attempts = max_attempts

        self.manifest = load_json(self.manifest_path)
        self.manifest_sha256 = sha256_file(self.manifest_path)
        self._validate_manifest()
        self.attestation = load_json(self.attestation_path)
        self.attestation_sha256 = sha256_file(self.attestation_path)
        self._validate_attestation()
        ensure_private_directory(self.run_root)
        ensure_private_directory(self.run_root / "families")

    def _validate_manifest(self) -> None:
        reject_forbidden_keys(self.manifest, "input manifest")
        if (
            self.manifest.get("schemaVersion") != SCHEMA_VERSION
            or self.manifest.get("gate") != GATE
            or self.manifest.get("outcomeFree") is not True
        ):
            raise ValidationError("Input manifest identity markers are invalid")
        if self.manifest.get("scheduler") != self.scheduler:
            raise ValidationError("Manifest scheduler does not match authoritative scheduler")
        validate_scheduler(self.manifest.get("scheduler"), "manifest.scheduler")
        families = self.manifest.get("families")
        if not isinstance(families, list) or not families:
            raise ValidationError("Input manifest must contain families")
        previous_index = -1
        seen_ids: set[str] = set()
        for ordinal, family in enumerate(families):
            if not isinstance(family, dict):
                raise ValidationError(f"manifest.families[{ordinal}] is not an object")
            index = require_nonnegative_integer(
                family.get("index"), f"manifest.families[{ordinal}].index"
            )
            family_id = family.get("familyId")
            if not isinstance(family_id, str) or not family_id:
                raise ValidationError(f"manifest.families[{ordinal}].familyId is invalid")
            if index <= previous_index:
                raise ValidationError("Manifest family indices must be strictly increasing")
            if family_id in seen_ids:
                raise ValidationError("Manifest family IDs must be unique")
            previous_index = index
            seen_ids.add(family_id)

    def _validate_attestation(self) -> None:
        attestation = require_exact_keys(
            self.attestation, ATTESTATION_KEYS, "job attestation"
        )
        reject_forbidden_keys(attestation, "job attestation")
        if (
            attestation["schemaVersion"] != SCHEMA_VERSION
            or attestation["gate"] != GATE
            or attestation["artifactKind"] != "map_fidelity_job_attestation"
            or attestation["outcomeFree"] is not True
        ):
            raise ValidationError("Job attestation identity markers are invalid")
        manifest_binding = validate_file_binding(
            attestation["manifest"], "job attestation.manifest"
        )
        if (
            Path(manifest_binding["path"]).absolute() != self.manifest_path
            or manifest_binding["sha256"] != self.manifest_sha256
        ):
            raise ValidationError("Job attestation does not bind the exact manifest")
        if attestation["scheduler"] != self.scheduler:
            raise ValidationError("Job attestation scheduler does not match")
        validate_scheduler(attestation["scheduler"], "job attestation.scheduler")
        runtime_hashes = attestation["runtimeHashes"]
        if not isinstance(runtime_hashes, dict) or not runtime_hashes:
            raise ValidationError("Job attestation runtimeHashes must be nonempty")
        for key, value in runtime_hashes.items():
            if not isinstance(key, str) or not key:
                raise ValidationError("Runtime-hash names must be nonempty strings")
            require_sha256(value, f"job attestation.runtimeHashes.{key}")

    @property
    def families(self) -> list[dict[str, Any]]:
        return self.manifest["families"]

    def family_binding(self, ordinal: int) -> dict[str, Any]:
        family = self.families[ordinal]
        return {
            "manifestOrdinal": ordinal,
            "familyIndex": family["index"],
            "familyIdSha256": hashlib.sha256(
                family["familyId"].encode("utf-8")
            ).hexdigest(),
            "familyEntrySha256": canonical_sha256(family),
        }

    def family_directory(self, ordinal: int) -> Path:
        binding = self.family_binding(ordinal)
        return self.run_root / "families" / (
            f"{ordinal:04d}-{binding['familyIdSha256'][:16]}"
        )

    def _attempt_directory(self, ordinal: int, attempt_number: int) -> Path:
        return self.family_directory(ordinal) / "attempts" / f"{attempt_number:02d}"

    def _worker_command(
        self,
        ordinal: int,
        intent_path: Path,
        shard_path: Path,
    ) -> list[str]:
        return [
            *self.worker_command_prefix,
            "--manifest",
            str(self.manifest_path),
            "--attestation",
            str(self.attestation_path),
            "--family-ordinal",
            str(ordinal),
            "--intent",
            str(intent_path),
            "--output",
            str(shard_path),
        ]

    def _expected_intent(
        self,
        ordinal: int,
        attempt_number: int,
        intent_path: Path,
        shard_path: Path,
    ) -> dict[str, Any]:
        command = self._worker_command(ordinal, intent_path, shard_path)
        return {
            "schemaVersion": SCHEMA_VERSION,
            "gate": GATE,
            "artifactKind": "map_fidelity_family_attempt_intent",
            "outcomeFree": True,
            "manifest": {
                "path": str(self.manifest_path),
                "sha256": self.manifest_sha256,
            },
            "attestation": {
                "path": str(self.attestation_path),
                "sha256": self.attestation_sha256,
            },
            "family": self.family_binding(ordinal),
            "attemptNumber": attempt_number,
            "executionPolicy": {
                "timeoutSeconds": self.timeout_seconds,
                "terminationGraceSeconds": self.termination_grace_seconds,
                "maxTechnicalAttempts": self.max_attempts,
                "maxStreamBytes": self.max_stream_bytes,
            },
            "scheduler": self.scheduler,
            "environment": {
                "allowedKeys": list(ALLOWED_WORKER_ENV_KEYS),
                "values": self.worker_environment,
                "sha256": canonical_sha256(self.worker_environment),
            },
            "worker": {
                "argumentProtocol": "map-fidelity-family-worker-v1",
                "commandSha256": canonical_sha256(command),
                "shardPath": str(shard_path),
            },
        }

    def _validate_shard_path(
        self,
        path: Path,
        *,
        ordinal: int,
        attempt_number: int,
        intent_sha256: str,
    ) -> dict[str, Any]:
        shard = load_json(path)
        return validate_family_shard(
            shard,
            manifest_sha256=self.manifest_sha256,
            attestation_sha256=self.attestation_sha256,
            family_binding=self.family_binding(ordinal),
            attempt_number=attempt_number,
            intent_sha256=intent_sha256,
            scheduler=self.scheduler,
        )

    def _terminal_record(
        self,
        *,
        ordinal: int,
        attempt_number: int,
        intent_sha256: str,
        wall_time_ms: int,
        return_code: int | None,
        timed_out: bool,
        term_sent: bool,
        kill_sent: bool,
        stdout: dict[str, Any],
        stderr: dict[str, Any],
        shard: dict[str, Any] | None,
        categories: Iterable[str],
    ) -> dict[str, Any]:
        category_list = sorted(set(categories))
        term_signal = -return_code if return_code is not None and return_code < 0 else None
        exit_code = return_code if return_code is not None and return_code >= 0 else None
        return {
            "schemaVersion": SCHEMA_VERSION,
            "gate": GATE,
            "artifactKind": "map_fidelity_family_attempt_terminal",
            "outcomeFree": True,
            "manifestSha256": self.manifest_sha256,
            "attestationSha256": self.attestation_sha256,
            "family": self.family_binding(ordinal),
            "attemptNumber": attempt_number,
            "intentSha256": intent_sha256,
            "scheduler": self.scheduler,
            "timing": {"wallTimeMs": max(0, wall_time_ms)},
            "process": {
                "exitCode": exit_code,
                "termSignal": term_signal,
                "timedOut": timed_out,
                "termSent": term_sent,
                "killSent": kill_sent,
            },
            "streams": {
                "stdout": stdout,
                "stderr": stderr,
            },
            "shard": shard,
            "technicalDisposition": {
                "status": "retryable_failure" if category_list else "complete",
                "categories": category_list,
            },
        }

    def _run_attempt(self, ordinal: int, attempt_number: int) -> dict[str, Any]:
        attempt_dir = self._attempt_directory(ordinal, attempt_number)
        ensure_private_directory(attempt_dir)
        intent_path = attempt_dir / "attempt-intent.json"
        terminal_path = attempt_dir / "attempt-terminal.json"
        shard_path = attempt_dir / "family-shard.json"
        intent = self._expected_intent(
            ordinal, attempt_number, intent_path, shard_path
        )
        validate_attempt_intent(intent, expected=intent)
        atomic_write_json(intent_path, intent)
        intent_sha256 = sha256_file(intent_path)
        command = self._worker_command(ordinal, intent_path, shard_path)

        started_at = time.monotonic()
        try:
            process = subprocess.Popen(
                command,
                stdin=subprocess.DEVNULL,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                start_new_session=True,
                env=self.worker_environment,
                close_fds=True,
            )
        except OSError:
            empty_stream = {
                "bytes": 0,
                "sha256": hashlib.sha256(b"").hexdigest(),
                "truncated": False,
            }
            terminal = self._terminal_record(
                ordinal=ordinal,
                attempt_number=attempt_number,
                intent_sha256=intent_sha256,
                wall_time_ms=int(round((time.monotonic() - started_at) * 1000)),
                return_code=None,
                timed_out=False,
                term_sent=False,
                kill_sent=False,
                stdout=empty_stream,
                stderr=empty_stream,
                shard=None,
                categories=["worker_spawn_failed", "shard_missing"],
            )
            validate_terminal(
                terminal,
                manifest_sha256=self.manifest_sha256,
                attestation_sha256=self.attestation_sha256,
                family_binding=self.family_binding(ordinal),
                attempt_number=attempt_number,
                intent_sha256=intent_sha256,
                scheduler=self.scheduler,
            )
            atomic_write_json(terminal_path, terminal)
            return terminal
        assert process.stdout is not None and process.stderr is not None
        stdout_collector = BoundedStreamCollector(
            process.stdout, self.max_stream_bytes
        )
        stderr_collector = BoundedStreamCollector(
            process.stderr, self.max_stream_bytes
        )
        stdout_collector.start()
        stderr_collector.start()
        timed_out = False
        term_sent = False
        kill_sent = False
        try:
            process.wait(timeout=self.timeout_seconds)
        except subprocess.TimeoutExpired:
            timed_out = True
            try:
                os.killpg(process.pid, signal.SIGTERM)
                term_sent = True
            except ProcessLookupError:
                pass
            try:
                process.wait(timeout=self.termination_grace_seconds)
            except subprocess.TimeoutExpired:
                try:
                    os.killpg(process.pid, signal.SIGKILL)
                    kill_sent = True
                except ProcessLookupError:
                    pass
                process.wait()
        stream_drain_timed_out = False
        stdout_collector.join(timeout=self.termination_grace_seconds)
        stderr_collector.join(timeout=self.termination_grace_seconds)
        if stdout_collector.is_alive() or stderr_collector.is_alive():
            stream_drain_timed_out = True
            try:
                os.killpg(process.pid, signal.SIGTERM)
                term_sent = True
            except ProcessLookupError:
                pass
            stdout_collector.join(timeout=self.termination_grace_seconds)
            stderr_collector.join(timeout=self.termination_grace_seconds)
        if stdout_collector.is_alive() or stderr_collector.is_alive():
            try:
                os.killpg(process.pid, signal.SIGKILL)
                kill_sent = True
            except ProcessLookupError:
                pass
            stdout_collector.join(timeout=self.termination_grace_seconds)
            stderr_collector.join(timeout=self.termination_grace_seconds)
        if stdout_collector.is_alive() or stderr_collector.is_alive():
            raise SupervisorError("Worker stream collectors did not terminate")
        elapsed_ms = int(round((time.monotonic() - started_at) * 1000))

        categories: list[str] = []
        if stream_drain_timed_out:
            categories.append("descendant_stream_timeout")
        if timed_out:
            categories.append("worker_timeout")
        if process.returncode is None:
            categories.append("worker_not_reaped")
        elif process.returncode != 0:
            categories.append("worker_exit_nonzero")
        if stdout_collector.error is not None or stderr_collector.error is not None:
            categories.append("stream_capture_error")
        stdout_record = stdout_collector.record()
        stderr_record = stderr_collector.record()
        if stdout_record["bytes"] or stderr_record["bytes"]:
            categories.append("unexpected_worker_output")
        if stdout_record["truncated"] or stderr_record["truncated"]:
            categories.append("stream_limit_exceeded")

        shard_binding: dict[str, Any] | None = None
        if shard_path.exists():
            try:
                shard_binding = private_exact_file(shard_path)
                self._validate_shard_path(
                    shard_path,
                    ordinal=ordinal,
                    attempt_number=attempt_number,
                    intent_sha256=intent_sha256,
                )
            except (OSError, ValidationError):
                categories.append("shard_malformed_or_binding_invalid")
        else:
            categories.append("shard_missing")

        terminal = self._terminal_record(
            ordinal=ordinal,
            attempt_number=attempt_number,
            intent_sha256=intent_sha256,
            wall_time_ms=elapsed_ms,
            return_code=process.returncode,
            timed_out=timed_out,
            term_sent=term_sent,
            kill_sent=kill_sent,
            stdout=stdout_record,
            stderr=stderr_record,
            shard=shard_binding,
            categories=categories,
        )
        validate_terminal(
            terminal,
            manifest_sha256=self.manifest_sha256,
            attestation_sha256=self.attestation_sha256,
            family_binding=self.family_binding(ordinal),
            attempt_number=attempt_number,
            intent_sha256=intent_sha256,
            scheduler=self.scheduler,
        )
        atomic_write_json(terminal_path, terminal)
        return terminal

    def _write_checkpoint(
        self,
        ordinal: int,
        attempt_number: int,
        intent_path: Path,
        terminal_path: Path,
        terminal: dict[str, Any],
    ) -> dict[str, Any]:
        shard_binding = terminal["shard"]
        if (
            terminal["technicalDisposition"]["status"] != "complete"
            or not isinstance(shard_binding, dict)
        ):
            raise ValidationError("Cannot checkpoint a technically incomplete attempt")
        checkpoint = {
            "schemaVersion": SCHEMA_VERSION,
            "gate": GATE,
            "artifactKind": "map_fidelity_family_completion_checkpoint",
            "outcomeFree": True,
            "manifestSha256": self.manifest_sha256,
            "attestationSha256": self.attestation_sha256,
            "family": self.family_binding(ordinal),
            "scheduler": self.scheduler,
            "accepted": {
                "attemptNumber": attempt_number,
                "intentSha256": sha256_file(intent_path),
                "terminalSha256": sha256_file(terminal_path),
                "shard": shard_binding,
            },
        }
        validate_completion_checkpoint(
            checkpoint,
            manifest_sha256=self.manifest_sha256,
            attestation_sha256=self.attestation_sha256,
            family_binding=self.family_binding(ordinal),
            scheduler=self.scheduler,
        )
        atomic_write_json(
            self.family_directory(ordinal) / "completion-checkpoint.json",
            checkpoint,
        )
        return checkpoint

    def _validate_existing_checkpoint(self, ordinal: int) -> dict[str, Any] | None:
        checkpoint_path = self.family_directory(ordinal) / "completion-checkpoint.json"
        if not checkpoint_path.exists():
            return None
        checkpoint = validate_completion_checkpoint(
            load_json(checkpoint_path),
            manifest_sha256=self.manifest_sha256,
            attestation_sha256=self.attestation_sha256,
            family_binding=self.family_binding(ordinal),
            scheduler=self.scheduler,
        )
        accepted = checkpoint["accepted"]
        attempt_number = accepted["attemptNumber"]
        attempt_dir = self._attempt_directory(ordinal, attempt_number)
        intent_path = attempt_dir / "attempt-intent.json"
        terminal_path = attempt_dir / "attempt-terminal.json"
        shard_path = Path(accepted["shard"]["path"])
        expected_intent = self._expected_intent(
            ordinal, attempt_number, intent_path, shard_path
        )
        validate_attempt_intent(load_json(intent_path), expected=expected_intent)
        if sha256_file(intent_path) != accepted["intentSha256"]:
            raise ValidationError("Checkpoint intent hash mismatch")
        terminal = validate_terminal(
            load_json(terminal_path),
            manifest_sha256=self.manifest_sha256,
            attestation_sha256=self.attestation_sha256,
            family_binding=self.family_binding(ordinal),
            attempt_number=attempt_number,
            intent_sha256=accepted["intentSha256"],
            scheduler=self.scheduler,
        )
        if terminal["technicalDisposition"]["status"] != "complete":
            raise ValidationError("Checkpoint references a technically incomplete attempt")
        if sha256_file(terminal_path) != accepted["terminalSha256"]:
            raise ValidationError("Checkpoint terminal hash mismatch")
        actual_shard = private_exact_file(shard_path)
        if actual_shard != accepted["shard"] or terminal["shard"] != accepted["shard"]:
            raise ValidationError("Checkpoint shard descriptor mismatch")
        self._validate_shard_path(
            shard_path,
            ordinal=ordinal,
            attempt_number=attempt_number,
            intent_sha256=accepted["intentSha256"],
        )
        return checkpoint

    def _recover_existing_attempts(self, ordinal: int) -> int:
        """Validate append-only attempts and recover a checkpoint after a clean terminal."""

        attempts_root = self.family_directory(ordinal) / "attempts"
        if not attempts_root.exists():
            return 0
        entries = sorted(path for path in attempts_root.iterdir() if path.is_dir())
        expected_names = [f"{index:02d}" for index in range(1, len(entries) + 1)]
        if [path.name for path in entries] != expected_names:
            raise ValidationError("Attempt directories are not contiguous from 01")
        if len(entries) > self.max_attempts:
            raise ValidationError("Attempt directory count exceeds fixed technical budget")
        for attempt_number, attempt_dir in enumerate(entries, 1):
            intent_path = attempt_dir / "attempt-intent.json"
            terminal_path = attempt_dir / "attempt-terminal.json"
            shard_path = attempt_dir / "family-shard.json"
            expected_intent = self._expected_intent(
                ordinal, attempt_number, intent_path, shard_path
            )
            validate_attempt_intent(load_json(intent_path), expected=expected_intent)
            intent_sha256 = sha256_file(intent_path)
            if not terminal_path.exists():
                empty = {
                    "bytes": 0,
                    "sha256": hashlib.sha256(b"").hexdigest(),
                    "truncated": False,
                }
                terminal = self._terminal_record(
                    ordinal=ordinal,
                    attempt_number=attempt_number,
                    intent_sha256=intent_sha256,
                    wall_time_ms=0,
                    return_code=None,
                    timed_out=False,
                    term_sent=False,
                    kill_sent=False,
                    stdout=empty,
                    stderr=empty,
                    shard=private_exact_file(shard_path) if shard_path.exists() else None,
                    categories=["orphaned_attempt"],
                )
                atomic_write_json(terminal_path, terminal)
            terminal = validate_terminal(
                load_json(terminal_path),
                manifest_sha256=self.manifest_sha256,
                attestation_sha256=self.attestation_sha256,
                family_binding=self.family_binding(ordinal),
                attempt_number=attempt_number,
                intent_sha256=intent_sha256,
                scheduler=self.scheduler,
            )
            if terminal["technicalDisposition"]["status"] == "complete":
                shard_binding = terminal["shard"]
                if not isinstance(shard_binding, dict):
                    raise ValidationError("Complete terminal lacks a shard binding")
                if private_exact_file(shard_path) != shard_binding:
                    raise ValidationError("Recovered terminal shard hash mismatch")
                self._validate_shard_path(
                    shard_path,
                    ordinal=ordinal,
                    attempt_number=attempt_number,
                    intent_sha256=intent_sha256,
                )
                self._write_checkpoint(
                    ordinal, attempt_number, intent_path, terminal_path, terminal
                )
                return attempt_number
        return len(entries)

    def run(self) -> dict[str, Any]:
        completed = 0
        resumed = 0
        launched = 0
        pending_ordinals: list[int] = []
        with CampaignLock(self.run_root / "campaign.lock"):
            for ordinal in range(len(self.families)):
                checkpoint = self._validate_existing_checkpoint(ordinal)
                if checkpoint is not None:
                    completed += 1
                    resumed += 1
                    continue
                used_attempts = self._recover_existing_attempts(ordinal)
                checkpoint = self._validate_existing_checkpoint(ordinal)
                if checkpoint is not None:
                    completed += 1
                    resumed += 1
                    continue
                for attempt_number in range(used_attempts + 1, self.max_attempts + 1):
                    launched += 1
                    terminal = self._run_attempt(ordinal, attempt_number)
                    if terminal["technicalDisposition"]["status"] != "complete":
                        continue
                    attempt_dir = self._attempt_directory(ordinal, attempt_number)
                    self._write_checkpoint(
                        ordinal,
                        attempt_number,
                        attempt_dir / "attempt-intent.json",
                        attempt_dir / "attempt-terminal.json",
                        terminal,
                    )
                    completed += 1
                    break
                else:
                    pending_ordinals.append(ordinal)
        return {
            "familyCount": len(self.families),
            "completedCount": completed,
            "pendingCount": len(pending_ordinals),
            "resumedCount": resumed,
            "launchedAttemptCount": launched,
            "pendingManifestOrdinals": pending_ordinals,
        }


def parse_scontrol_line(line: str, job_id: str) -> dict[str, Any]:
    def field(name: str) -> str | None:
        match = re.search(rf"(?:^|\s){re.escape(name)}=([^\s]+)", line)
        return match.group(1) if match else None

    scheduler = {
        "jobId": job_id,
        "account": field("Account"),
        "partition": field("Partition"),
        "qos": field("QOS"),
        "source": "scontrol",
    }
    return validate_scheduler(scheduler)


def authoritative_scheduler() -> dict[str, Any]:
    job_id = os.environ.get("SLURM_JOB_ID")
    if not job_id:
        raise SupervisorError("Supervisor is Slurm-only; SLURM_JOB_ID is absent")
    scontrol = os.environ.get("SCONTROL", "/opt/slurm/current/bin/scontrol")
    completed = subprocess.run(
        [scontrol, "show", "job", "-o", job_id],
        check=True,
        capture_output=True,
        text=True,
    )
    return parse_scontrol_line(completed.stdout.strip(), job_id)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifest", type=Path, required=True)
    parser.add_argument("--attestation", type=Path, required=True)
    parser.add_argument("--run-root", type=Path, required=True)
    parser.add_argument("--timeout-seconds", type=float, default=DEFAULT_TIMEOUT_SECONDS)
    parser.add_argument(
        "--termination-grace-seconds",
        type=float,
        default=DEFAULT_TERMINATION_GRACE_SECONDS,
    )
    parser.add_argument(
        "--max-stream-bytes", type=int, default=DEFAULT_MAX_STREAM_BYTES
    )
    parser.add_argument("--max-attempts", type=int, choices=(1, 2), default=2)
    parser.add_argument(
        "worker_command",
        nargs=argparse.REMAINDER,
        help="Worker command prefix after --",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    command = list(args.worker_command)
    if command and command[0] == "--":
        command = command[1:]
    supervisor = MapFidelitySupervisor(
        manifest_path=args.manifest,
        attestation_path=args.attestation,
        run_root=args.run_root,
        worker_command_prefix=command,
        scheduler=authoritative_scheduler(),
        timeout_seconds=args.timeout_seconds,
        termination_grace_seconds=args.termination_grace_seconds,
        max_stream_bytes=args.max_stream_bytes,
        max_attempts=args.max_attempts,
    )
    summary = supervisor.run()
    print(json.dumps(summary, sort_keys=True))
    return 0 if summary["pendingCount"] == 0 else 20


if __name__ == "__main__":
    raise SystemExit(main())
