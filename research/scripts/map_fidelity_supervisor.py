#!/usr/bin/env python3
"""Outcome-free, per-family process supervisor for the map-fidelity gate.

This module is deliberately independent of the game engine.  It launches an
allowlisted worker command once per manifest family, records append-only
attempt evidence, and resumes only from exact completion checkpoints.  The
CLI contract is integration-ready for the compiled TypeScript family worker
and can be invoked by the Slurm entrypoint after pre-worker attestation.
"""

from __future__ import annotations

import argparse
import fcntl
import hashlib
import json
import math
import os
import re
import shutil
import signal
import stat
import subprocess
import sys
import threading
import time
from pathlib import Path
from typing import Any, BinaryIO, Iterable, Sequence


GATE = "map-fidelity-gate-v1"
MANIFEST_SCHEMA_VERSION = 2
INTERNAL_EVIDENCE_SCHEMA_VERSION = 1
LEGACY_AGGREGATE_SCHEMA_VERSION = 1
MAX_TECHNICAL_ATTEMPTS = 2
DEFAULT_TIMEOUT_SECONDS = 120.0
DEFAULT_TERMINATION_GRACE_SECONDS = 5.0
DEFAULT_MAX_STREAM_BYTES = 1024 * 1024
WORKER_TECHNICAL_DIAGNOSTIC_MAX_BYTES = 4096
WORKER_TECHNICAL_STAGES = {
    "parse_arguments",
    "scheduler_validate",
    "manifest_read",
    "manifest_validate",
    "family_select",
    "pre_attestation_read",
    "pre_attestation_validate",
    "intent_read",
    "intent_validate",
    "output_parent_validate",
    "source_validate",
    "sandbox_create",
    "alias_materialize",
    "engine_initialize",
    "engine_attestation_enter",
    "engine_map_initialize",
    "engine_forward",
    "engine_reverse",
    "engine_attestation_finalize",
    "engine_result_finalize",
    "alias_cleanup",
    "shard_validate",
    "shard_write",
}
WORKER_TECHNICAL_DIAGNOSTIC_KEYS = {
    "schemaVersion",
    "gate",
    "artifactKind",
    "outcomeFree",
    "stage",
    "errorNameSha256",
    "errorMessageSha256",
    "errorStackSha256",
}
HEX_SHA256 = re.compile(r"^[0-9a-f]{64}$")

MAX_SAFE_INTEGER = 2**53 - 1
# The pre-execution attestation is an exact projection of manifest-v2 runtime
# inputs. An arbitrary non-empty bag of hashes is not provenance.
RUNTIME_HASH_KEYS = {
    "packageLockSha256",
    "nodeRuntimeSha256",
    "pythonRuntimeSha256",
    "scontrolRuntimeSha256",
    "gameApiPackageSha256",
    "gameApiRuntimeSha256",
    "gameApiRuntimeTreeSha256",
    "runtimeDependencyTreeSha256",
    "mixTreeSha256",
    "compiledProbeSha256",
    "compiledProtocolSha256",
    "compiledMapLoadAttestationSha256",
    "compiledSeededGameSha256",
    "sourceBundleSha256",
    "runtimeBundleSha256",
}

WARNING_CATEGORY_SEVERITY = {
    "missing_asset": "fail",
    "unsupported_theater": "fail",
    "invalid_terrain": "review",
    "invalid_object": "review",
    "invalid_rules": "review",
    "invalid_trigger_event": "review",
    "invalid_waypoint": "fail",
    "parse_warning": "fail",
    "unknown_reference": "review",
    "other_warning": "review",
    "engine_error": "fail",
}
CONSOLE_LEVELS = {"debug", "info", "log", "warn", "error"}
MAP_LOAD_PROTOCOL = "unique-rfs-alias-adapter-snapshot-v1"
MAP_LOAD_ADAPTER = "file-system-access/node.FileHandle.getFile"
MAP_LOAD_PHASES = (
    ("initialization", 1),
    ("forward_create", 2),
    ("reverse_create", 2),
)

ALLOWED_WORKER_ENV_KEYS = (
    "PATH",
    "LD_LIBRARY_PATH",
    "TZ",
    "LC_ALL",
    "PYTHONHASHSEED",
    "DEBUG_LOGGING",
    "SCONTROL",
    "MAP_FIDELITY_PRIVATE_DIAGNOSTICS_ROOT",
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
EXACT_FILE_BINDING_KEYS = {"path", "bytes", "sha256"}
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
    "commandPrefixSha256",
    "commandSha256",
    "executable",
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
DISPOSITION_KEYS = {"status", "categories", "workerDiagnostic"}
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
    "phase",
    "manifest",
    "scheduler",
    "runtimeHashes",
    "bindings",
    "preAttestation",
    "checkpointLedger",
}
ATTESTATION_BINDING_KEYS = {
    "sourceCommit",
    "targetPopulationCommitmentSha256",
    "familySequenceSha256",
    "sourceBundleSha256",
    "runtimeBundleSha256",
}
SHARD_PAYLOAD_KEYS = {
    "engineInitialization",
    "familyResult",
    "mapLoadAttestation",
}
ENGINE_INITIALIZATION_KEYS = {
    "succeeded",
    "warnings",
    "warningCaptureTruncated",
    "error",
}
SERIALIZED_WARNING_KEYS = {
    "phase",
    "level",
    "category",
    "severity",
    "diagnosticSha256",
}
SERIALIZED_ERROR_KEYS = {"category", "name", "messageSha256"}
FAMILY_RESULT_KEYS = {
    "familyIndex",
    "familyId",
    "representativeMapPath",
    "mapName",
    "executedMapAlias",
    "mapBytes",
    "mapSha256",
    "slurmJobId",
    "requestedEngineSeed",
    "targetTick",
    "declaredStartLocations",
    "forward",
    "reverse",
    "reciprocalStartCheck",
    "warnings",
    "failureCategories",
    "reviewCategories",
    "fidelityStatus",
}
PROBE_RUN_KEYS = {
    "order",
    "loaded",
    "initialTick",
    "finalTick",
    "updates",
    "initialTickIsZero",
    "tickUpdateArithmeticConsistent",
    "progressedBeyondTickOne",
    "reachedTargetTick",
    "starts",
    "wallTimeMs",
    "warningCaptureTruncated",
    "error",
}
STARTS_KEYS = {"alpha", "beta"}
POINT_KEYS = {"x", "y"}
DECLARED_START_KEYS = {"x", "y", "waypoint", "encoded"}
RECIPROCAL_KEYS = {
    "declaredStartCountValid",
    "forwardStartsDistinct",
    "reverseStartsDistinct",
    "allObservedStartsDeclared",
    "reciprocalPhysicalSlots",
    "failures",
}
MAP_LOAD_ATTESTATION_KEYS = {
    "protocol",
    "alias",
    "aliasPath",
    "expectedBytes",
    "expectedSha256",
    "phases",
    "reads",
    "complete",
}
MAP_LOAD_PHASE_KEYS = {"phase", "expectedReads", "observedReads"}
MAP_LOAD_READ_KEYS = {
    "phase",
    "ordinal",
    "alias",
    "resolvedPath",
    "bytes",
    "sha256",
    "adapter",
    "inMemorySnapshot",
}
CAMPAIGN_TERMINAL_KEYS = {
    "schemaVersion",
    "gate",
    "artifactKind",
    "outcomeFree",
    "manifestSha256",
    "attestationSha256",
    "scheduler",
    "configuration",
    "familyCount",
    "completedCount",
    "pendingCount",
    "technicalAttemptCount",
    "pendingManifestOrdinals",
    "attempts",
    "checkpoints",
}
CAMPAIGN_CONFIGURATION_KEYS = {
    "executionPolicy",
    "environmentSha256",
    "workerCommandPrefixSha256",
    "workerExecutable",
}
CAMPAIGN_CHECKPOINT_KEYS = {"manifestOrdinal", "path", "bytes", "sha256"}
CAMPAIGN_ATTEMPT_KEYS = {"family", "attemptNumber", "intent", "terminal", "shard"}


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
        allow_nan=False,
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


def reject_json_constant(constant: str) -> None:
    raise ValueError(f"nonstandard numeric constant {constant}")


def load_json(path: Path) -> dict[str, Any]:
    try:
        reject_symlink_components(path, "Strict JSON artifact path")
        descriptor = path.lstat()
        if not stat.S_ISREG(descriptor.st_mode):
            raise ValidationError(f"Strict JSON artifact is not a regular file: {path}")
        value = json.loads(
            path.read_text(encoding="utf-8"),
            parse_constant=reject_json_constant,
        )
    except (OSError, UnicodeError, ValueError) as error:
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
    if (
        isinstance(value, bool)
        or not isinstance(value, int)
        or value < 0
        or value > MAX_SAFE_INTEGER
    ):
        raise ValidationError(f"{label} must be a nonnegative safe integer")
    return value


def require_boolean(value: Any, label: str) -> bool:
    if not isinstance(value, bool):
        raise ValidationError(f"{label} must be boolean")
    return value


def require_positive_finite_number(value: Any, label: str) -> int | float:
    if (
        isinstance(value, bool)
        or not isinstance(value, (int, float))
        or not math.isfinite(value)
        or value <= 0
    ):
        raise ValidationError(f"{label} must be a positive finite number")
    return value


def require_nonempty_string(value: Any, label: str) -> str:
    if not isinstance(value, str) or not value:
        raise ValidationError(f"{label} must be a nonempty string")
    return value


def require_string_list(
    value: Any,
    label: str,
    *,
    sorted_unique: bool = False,
) -> list[str]:
    if (
        not isinstance(value, list)
        or any(not isinstance(item, str) or not item for item in value)
    ):
        raise ValidationError(f"{label} must be an array of nonempty strings")
    if sorted_unique and value != sorted(set(value)):
        raise ValidationError(f"{label} must be sorted and unique")
    return value


def require_absolute_path(value: Any, label: str) -> Path:
    if not isinstance(value, str) or not Path(value).is_absolute():
        raise ValidationError(f"{label} must be an absolute path")
    return Path(value)


def require_nullable_nonnegative_integer(value: Any, label: str) -> int | None:
    if value is None:
        return None
    return require_nonnegative_integer(value, label)


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


def validate_exact_file_binding(value: Any, label: str) -> dict[str, Any]:
    binding = require_exact_keys(value, EXACT_FILE_BINDING_KEYS, label)
    require_absolute_path(binding["path"], f"{label}.path")
    require_nonnegative_integer(binding["bytes"], f"{label}.bytes")
    require_sha256(binding["sha256"], f"{label}.sha256")
    return binding


def exact_file_binding(path: Path) -> dict[str, Any]:
    resolved = path.resolve(strict=True)
    reject_symlink_components(resolved, "Exact file binding path")
    descriptor = resolved.stat()
    if not stat.S_ISREG(descriptor.st_mode):
        raise ValidationError(f"Exact file binding is not a regular file: {resolved}")
    return {
        "path": str(resolved),
        "bytes": descriptor.st_size,
        "sha256": sha256_file(resolved),
    }


def verify_exact_file_binding(value: Any, label: str) -> dict[str, Any]:
    binding = validate_exact_file_binding(value, label)
    if exact_file_binding(Path(binding["path"])) != binding:
        raise ValidationError(f"{label} does not match the exact file on disk")
    return binding


def resolve_worker_executable(
    command_token: str,
    environment: dict[str, str],
) -> dict[str, Any] | None:
    if os.sep in command_token:
        candidate = Path(command_token)
        if not candidate.is_absolute():
            candidate = Path.cwd() / candidate
        if not candidate.exists():
            return None
        return exact_file_binding(candidate)
    resolved = shutil.which(command_token, path=environment.get("PATH"))
    if resolved is None:
        return None
    return exact_file_binding(Path(resolved))


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
    payload = (
        json.dumps(value, indent=2, sort_keys=True, allow_nan=False).encode(
            "utf-8"
        )
        + b"\n"
    )
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
        try:
            os.link(temporary, path, follow_symlinks=False)
        except FileExistsError as error:
            raise SupervisorError(
                f"Evidence artifact appeared concurrently: {path}"
            ) from error
        temporary.unlink()
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
        self.diagnostic_prefix = bytearray()
        self.error: BaseException | None = None

    def run(self) -> None:
        try:
            while True:
                block = self.pipe.read(64 * 1024)
                if not block:
                    break
                self.total_bytes += len(block)
                self.digest.update(block)
                remaining = (
                    WORKER_TECHNICAL_DIAGNOSTIC_MAX_BYTES
                    - len(self.diagnostic_prefix)
                )
                if remaining > 0:
                    self.diagnostic_prefix.extend(block[:remaining])
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

    def diagnostic_candidate(self) -> bytes | None:
        if (
            self.error is not None
            or self.total_bytes == 0
            or self.total_bytes > WORKER_TECHNICAL_DIAGNOSTIC_MAX_BYTES
        ):
            return None
        return bytes(self.diagnostic_prefix)


def validate_worker_technical_diagnostic(
    value: Any, label: str = "worker technical diagnostic"
) -> dict[str, Any]:
    diagnostic = require_exact_keys(
        value, WORKER_TECHNICAL_DIAGNOSTIC_KEYS, label
    )
    if (
        diagnostic["schemaVersion"] != 1
        or diagnostic["gate"] != GATE
        or diagnostic["artifactKind"]
        != "map_fidelity_worker_technical_diagnostic"
        or diagnostic["outcomeFree"] is not True
        or diagnostic["stage"] not in WORKER_TECHNICAL_STAGES
    ):
        raise ValidationError(f"{label} identity or stage is invalid")
    require_sha256(diagnostic["errorNameSha256"], f"{label}.errorNameSha256")
    require_sha256(
        diagnostic["errorMessageSha256"], f"{label}.errorMessageSha256"
    )
    if diagnostic["errorStackSha256"] is not None:
        require_sha256(
            diagnostic["errorStackSha256"], f"{label}.errorStackSha256"
        )
    return diagnostic


def parse_worker_technical_diagnostic(payload: bytes) -> dict[str, Any]:
    if (
        not payload.endswith(b"\n")
        or len(payload) > WORKER_TECHNICAL_DIAGNOSTIC_MAX_BYTES
        or b"\x00" in payload
    ):
        raise ValidationError("Worker technical diagnostic framing is invalid")

    def reject_duplicate_keys(
        pairs: list[tuple[str, Any]],
    ) -> dict[str, Any]:
        result: dict[str, Any] = {}
        for key, value in pairs:
            if key in result:
                raise ValidationError(
                    "Worker technical diagnostic contains a duplicate key"
                )
            result[key] = value
        return result

    try:
        value = json.loads(
            payload.decode("ascii"),
            object_pairs_hook=reject_duplicate_keys,
        )
    except (UnicodeDecodeError, json.JSONDecodeError) as error:
        raise ValidationError(
            "Worker technical diagnostic is not strict ASCII JSON"
        ) from error
    diagnostic = validate_worker_technical_diagnostic(value)
    if canonical_bytes(diagnostic) + b"\n" != payload:
        raise ValidationError("Worker technical diagnostic is not canonical")
    return diagnostic


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
        intent["schemaVersion"] != INTERNAL_EVIDENCE_SCHEMA_VERSION
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
        require_positive_finite_number(policy[key], f"attempt intent.executionPolicy.{key}")
    if (
        isinstance(policy["maxTechnicalAttempts"], bool)
        or policy["maxTechnicalAttempts"] not in (1, 2)
    ):
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
    require_sha256(
        worker["commandPrefixSha256"],
        "attempt intent.worker.commandPrefixSha256",
    )
    require_sha256(worker["commandSha256"], "attempt intent.worker.commandSha256")
    if worker["executable"] is not None:
        validate_exact_file_binding(worker["executable"], "attempt intent.worker.executable")
    require_absolute_path(worker["shardPath"], "attempt intent.worker.shardPath")
    if expected is not None and canonical_bytes(intent) != canonical_bytes(expected):
        raise ValidationError("Attempt intent does not exactly match deterministic expectation")
    return intent


def validate_serialized_warning(value: Any, label: str) -> dict[str, Any]:
    warning = require_exact_keys(value, SERIALIZED_WARNING_KEYS, label)
    require_nonempty_string(warning["phase"], f"{label}.phase")
    if warning["level"] not in CONSOLE_LEVELS:
        raise ValidationError(f"{label}.level is invalid")
    category = warning["category"]
    if category not in WARNING_CATEGORY_SEVERITY:
        raise ValidationError(f"{label}.category is invalid")
    expected_severity = (
        "fail" if warning["level"] == "error" else WARNING_CATEGORY_SEVERITY[category]
    )
    if warning["severity"] != expected_severity:
        raise ValidationError(f"{label}.severity is inconsistent with level/category")
    require_sha256(warning["diagnosticSha256"], f"{label}.diagnosticSha256")
    return warning


def validate_serialized_error(value: Any, label: str) -> dict[str, Any] | None:
    if value is None:
        return None
    error = require_exact_keys(value, SERIALIZED_ERROR_KEYS, label)
    if error["category"] not in WARNING_CATEGORY_SEVERITY:
        raise ValidationError(f"{label}.category is invalid")
    if error["name"] != "captured_error":
        raise ValidationError(f"{label}.name is invalid")
    require_sha256(error["messageSha256"], f"{label}.messageSha256")
    return error


def validate_engine_initialization(value: Any, label: str) -> dict[str, Any]:
    initialization = require_exact_keys(value, ENGINE_INITIALIZATION_KEYS, label)
    succeeded = require_boolean(initialization["succeeded"], f"{label}.succeeded")
    require_boolean(
        initialization["warningCaptureTruncated"],
        f"{label}.warningCaptureTruncated",
    )
    if not isinstance(initialization["warnings"], list):
        raise ValidationError(f"{label}.warnings must be an array")
    for index, warning in enumerate(initialization["warnings"]):
        validate_serialized_warning(warning, f"{label}.warnings[{index}]")
    error = validate_serialized_error(initialization["error"], f"{label}.error")
    if succeeded != (error is None):
        raise ValidationError(f"{label}.succeeded is inconsistent with error")
    return initialization


def validate_point(
    value: Any,
    label: str,
    *,
    declared: bool,
    nullable: bool = False,
) -> dict[str, Any] | None:
    if value is None and nullable:
        return None
    keys = DECLARED_START_KEYS if declared else POINT_KEYS
    point = require_exact_keys(value, keys, label)
    for key in keys:
        require_nonnegative_integer(point[key], f"{label}.{key}")
    return point


def validate_probe_run(
    value: Any,
    label: str,
    *,
    expected_order: list[str],
    target_tick: int,
) -> dict[str, Any]:
    run = require_exact_keys(value, PROBE_RUN_KEYS, label)
    if run["order"] != expected_order:
        raise ValidationError(f"{label}.order is not the committed reciprocal order")
    for key in (
        "loaded",
        "initialTickIsZero",
        "tickUpdateArithmeticConsistent",
        "progressedBeyondTickOne",
        "reachedTargetTick",
        "warningCaptureTruncated",
    ):
        require_boolean(run[key], f"{label}.{key}")
    initial_tick = require_nullable_nonnegative_integer(
        run["initialTick"], f"{label}.initialTick"
    )
    final_tick = require_nullable_nonnegative_integer(
        run["finalTick"], f"{label}.finalTick"
    )
    updates = require_nonnegative_integer(run["updates"], f"{label}.updates")
    require_nonnegative_integer(run["wallTimeMs"], f"{label}.wallTimeMs")
    starts = require_exact_keys(run["starts"], STARTS_KEYS, f"{label}.starts")
    validate_point(starts["alpha"], f"{label}.starts.alpha", declared=False, nullable=True)
    validate_point(starts["beta"], f"{label}.starts.beta", declared=False, nullable=True)
    validate_serialized_error(run["error"], f"{label}.error")

    loaded_expected = initial_tick is not None and final_tick is not None
    initial_zero_expected = initial_tick == 0
    arithmetic_expected = (
        initial_tick is not None
        and final_tick is not None
        and final_tick >= initial_tick
        and final_tick - initial_tick == updates
    )
    progressed_expected = final_tick is not None and final_tick > 1
    target_expected = final_tick is not None and final_tick >= target_tick
    if run["loaded"] != loaded_expected:
        raise ValidationError(f"{label}.loaded is inconsistent with initialTick")
    if run["initialTickIsZero"] != initial_zero_expected:
        raise ValidationError(f"{label} did not attest initialTick == 0")
    if run["tickUpdateArithmeticConsistent"] != arithmetic_expected:
        raise ValidationError(f"{label} tick/update arithmetic is inconsistent")
    if run["progressedBeyondTickOne"] != progressed_expected:
        raise ValidationError(f"{label}.progressedBeyondTickOne is inconsistent")
    if run["reachedTargetTick"] != target_expected:
        raise ValidationError(f"{label}.reachedTargetTick is inconsistent")
    return run


def _point_key(value: dict[str, Any] | None) -> tuple[int, int] | None:
    if value is None:
        return None
    return (value["x"], value["y"])


def validate_reciprocal_start_check(
    value: Any,
    label: str,
    *,
    declared_starts: list[dict[str, Any]],
    forward: dict[str, Any],
    reverse: dict[str, Any],
) -> dict[str, Any]:
    check = require_exact_keys(value, RECIPROCAL_KEYS, label)
    for key in RECIPROCAL_KEYS - {"failures"}:
        require_boolean(check[key], f"{label}.{key}")
    failures = require_string_list(check["failures"], f"{label}.failures")
    if len(failures) != len(set(failures)):
        raise ValidationError(f"{label}.failures must be unique")

    declared_points = [_point_key(point) for point in declared_starts]
    declared = set(declared_points)
    forward_alpha = _point_key(forward["starts"]["alpha"])
    forward_beta = _point_key(forward["starts"]["beta"])
    reverse_alpha = _point_key(reverse["starts"]["alpha"])
    reverse_beta = _point_key(reverse["starts"]["beta"])
    observed = [forward_alpha, forward_beta, reverse_alpha, reverse_beta]
    expected = {
        "declaredStartCountValid": len(declared) >= 2
        and len(declared) == len(declared_points),
        "forwardStartsDistinct": forward_alpha is not None
        and forward_beta is not None
        and forward_alpha != forward_beta,
        "reverseStartsDistinct": reverse_alpha is not None
        and reverse_beta is not None
        and reverse_alpha != reverse_beta,
        "allObservedStartsDeclared": all(
            point is not None and point in declared for point in observed
        ),
        "reciprocalPhysicalSlots": forward_alpha is not None
        and forward_beta is not None
        and reverse_alpha is not None
        and reverse_beta is not None
        and forward_alpha == reverse_beta
        and forward_beta == reverse_alpha,
    }
    expected_failures: list[str] = []
    failure_names = {
        "declaredStartCountValid": "declared_start_enumeration_invalid",
        "forwardStartsDistinct": "forward_duplicate_or_missing_start",
        "reverseStartsDistinct": "reverse_duplicate_or_missing_start",
        "allObservedStartsDeclared": "observed_start_not_declared",
        "reciprocalPhysicalSlots": "reciprocal_physical_slot_mismatch",
    }
    for key, expected_value in expected.items():
        if check[key] != expected_value:
            raise ValidationError(f"{label}.{key} is inconsistent with observed starts")
        if not expected_value:
            expected_failures.append(failure_names[key])
    if failures != sorted(expected_failures):
        raise ValidationError(f"{label}.failures is inconsistent with boolean checks")
    return check


def validate_map_load_attestation(
    value: Any,
    label: str,
    *,
    family_index: int,
    expected_bytes: int,
    expected_sha256: str,
) -> dict[str, Any]:
    attestation = require_exact_keys(value, MAP_LOAD_ATTESTATION_KEYS, label)
    if attestation["protocol"] != MAP_LOAD_PROTOCOL or attestation["complete"] is not True:
        raise ValidationError(f"{label} protocol/completion marker is invalid")
    alias = require_nonempty_string(attestation["alias"], f"{label}.alias")
    alias_path = require_absolute_path(attestation["aliasPath"], f"{label}.aliasPath")
    require_nonnegative_integer(attestation["expectedBytes"], f"{label}.expectedBytes")
    require_sha256(attestation["expectedSha256"], f"{label}.expectedSha256")
    if family_index > 999_999:
        raise ValidationError(f"{label} family index exceeds alias protocol")
    expected_alias = f"cdfid-{family_index:06d}-{expected_sha256}.map"
    if alias != expected_alias or alias_path.name != expected_alias:
        raise ValidationError(f"{label} alias does not bind family/map identity")
    if (
        attestation["expectedBytes"] != expected_bytes
        or attestation["expectedSha256"] != expected_sha256
    ):
        raise ValidationError(f"{label} expected map descriptor is inconsistent")

    phases = attestation["phases"]
    if not isinstance(phases, list) or len(phases) != len(MAP_LOAD_PHASES):
        raise ValidationError(f"{label}.phases must contain exactly three phases")
    for index, (phase_name, expected_reads) in enumerate(MAP_LOAD_PHASES):
        phase = require_exact_keys(
            phases[index], MAP_LOAD_PHASE_KEYS, f"{label}.phases[{index}]"
        )
        require_nonnegative_integer(
            phase["expectedReads"], f"{label}.phases[{index}].expectedReads"
        )
        require_nonnegative_integer(
            phase["observedReads"], f"{label}.phases[{index}].observedReads"
        )
        if phase != {
            "phase": phase_name,
            "expectedReads": expected_reads,
            "observedReads": expected_reads,
        }:
            raise ValidationError(f"{label}.phases[{index}] is inconsistent")

    expected_read_sequence = [
        (phase_name, ordinal)
        for phase_name, expected_reads in MAP_LOAD_PHASES
        for ordinal in range(1, expected_reads + 1)
    ]
    reads = attestation["reads"]
    if not isinstance(reads, list) or len(reads) != len(expected_read_sequence):
        raise ValidationError(f"{label}.reads must contain exact 1+2+2 evidence")
    for index, (phase_name, ordinal) in enumerate(expected_read_sequence):
        read = require_exact_keys(
            reads[index], MAP_LOAD_READ_KEYS, f"{label}.reads[{index}]"
        )
        resolved_path = require_absolute_path(
            read["resolvedPath"], f"{label}.reads[{index}].resolvedPath"
        )
        require_nonnegative_integer(read["ordinal"], f"{label}.reads[{index}].ordinal")
        require_nonnegative_integer(read["bytes"], f"{label}.reads[{index}].bytes")
        require_sha256(read["sha256"], f"{label}.reads[{index}].sha256")
        if (
            read["phase"] != phase_name
            or read["ordinal"] != ordinal
            or read["alias"] != alias
            or resolved_path != alias_path
            or read["bytes"] != expected_bytes
            or read["sha256"] != expected_sha256
            or read["adapter"] != MAP_LOAD_ADAPTER
            or read["inMemorySnapshot"] is not True
        ):
            raise ValidationError(f"{label}.reads[{index}] is inconsistent")
    return attestation


def validate_family_result(
    value: Any,
    label: str,
    *,
    manifest_family: dict[str, Any],
    manifest_protocol: dict[str, Any],
    scheduler: dict[str, Any],
    initialization: dict[str, Any],
    map_load_attestation: dict[str, Any],
) -> dict[str, Any]:
    result = require_exact_keys(value, FAMILY_RESULT_KEYS, label)
    family_index = require_nonnegative_integer(result["familyIndex"], f"{label}.familyIndex")
    map_bytes = require_nonnegative_integer(result["mapBytes"], f"{label}.mapBytes")
    map_sha256 = require_sha256(result["mapSha256"], f"{label}.mapSha256")
    target_tick = require_nonnegative_integer(result["targetTick"], f"{label}.targetTick")
    requested_seed = require_nonnegative_integer(
        result["requestedEngineSeed"], f"{label}.requestedEngineSeed"
    )
    for key in ("familyId", "representativeMapPath", "mapName", "executedMapAlias", "slurmJobId"):
        require_nonempty_string(result[key], f"{label}.{key}")

    expected_seed = (manifest_protocol["engineSeedBase"] + family_index) % (2**32)
    expected_scalar_fields = {
        "familyIndex": manifest_family["index"],
        "familyId": manifest_family["familyId"],
        "representativeMapPath": manifest_family["representativeMapPath"],
        "mapName": manifest_family["mapName"],
        "mapBytes": manifest_family["bytes"],
        "mapSha256": manifest_family["sha256"],
        "slurmJobId": scheduler["jobId"],
        "requestedEngineSeed": expected_seed,
        "targetTick": manifest_protocol["targetTick"],
    }
    if any(result[key] != expected for key, expected in expected_scalar_fields.items()):
        raise ValidationError(f"{label} does not bind the exact manifest family/protocol")
    if (
        map_bytes != map_load_attestation["expectedBytes"]
        or map_sha256 != map_load_attestation["expectedSha256"]
    ):
        raise ValidationError(f"{label} map descriptor does not bind map-load evidence")
    if result["executedMapAlias"] != map_load_attestation["alias"]:
        raise ValidationError(f"{label}.executedMapAlias does not bind map-load evidence")
    if requested_seed > 0xFFFF_FFFF or target_tick <= 1:
        raise ValidationError(f"{label} seed/tick range is invalid")

    declared = result["declaredStartLocations"]
    if not isinstance(declared, list) or len(declared) < 2:
        raise ValidationError(
            f"{label}.declaredStartLocations must contain at least two points"
        )
    for index, point in enumerate(declared):
        validate_point(point, f"{label}.declaredStartLocations[{index}]", declared=True)
    if declared != manifest_family["declaredStartLocations"]:
        raise ValidationError(f"{label}.declaredStartLocations does not match manifest")

    forward = validate_probe_run(
        result["forward"],
        f"{label}.forward",
        expected_order=["alpha", "beta"],
        target_tick=target_tick,
    )
    reverse = validate_probe_run(
        result["reverse"],
        f"{label}.reverse",
        expected_order=["beta", "alpha"],
        target_tick=target_tick,
    )
    reciprocal = validate_reciprocal_start_check(
        result["reciprocalStartCheck"],
        f"{label}.reciprocalStartCheck",
        declared_starts=declared,
        forward=forward,
        reverse=reverse,
    )

    warnings = result["warnings"]
    if not isinstance(warnings, list):
        raise ValidationError(f"{label}.warnings must be an array")
    for index, warning in enumerate(warnings):
        validate_serialized_warning(warning, f"{label}.warnings[{index}]")
    initialization_warnings = initialization["warnings"]
    if warnings[: len(initialization_warnings)] != initialization_warnings:
        raise ValidationError(f"{label}.warnings does not preserve initialization warnings")
    failure_categories = require_string_list(
        result["failureCategories"], f"{label}.failureCategories", sorted_unique=True
    )
    review_categories = require_string_list(
        result["reviewCategories"], f"{label}.reviewCategories", sorted_unique=True
    )

    expected_failures = list(manifest_family["staticChecks"]["failures"])
    expected_reviews: list[str] = []
    if not initialization["succeeded"]:
        error = initialization["error"]
        if not isinstance(error, dict):
            raise ValidationError(f"{label} failed initialization lacks an error")
        expected_failures.append(f"initialization_{error['category']}")
    if initialization["warningCaptureTruncated"]:
        expected_failures.append("initialization_warning_capture_truncated")
    for run_label, run in (("forward", forward), ("reverse", reverse)):
        error = run["error"]
        if isinstance(error, dict):
            expected_failures.append(f"{run_label}_{error['category']}")
        if not run["loaded"]:
            expected_failures.append(f"{run_label}_load_failed")
        if not run["initialTickIsZero"]:
            expected_failures.append(f"{run_label}_initial_tick_not_zero")
        if not run["tickUpdateArithmeticConsistent"]:
            expected_failures.append(f"{run_label}_tick_update_arithmetic_mismatch")
        if not run["progressedBeyondTickOne"]:
            expected_failures.append(f"{run_label}_no_progress_beyond_tick_1")
        if not run["reachedTargetTick"]:
            expected_failures.append(f"{run_label}_target_tick_not_reached")
        if run["warningCaptureTruncated"]:
            expected_failures.append(f"{run_label}_warning_capture_truncated")
    expected_failures.extend(reciprocal["failures"])
    for warning in warnings:
        category = f"warning_{warning['category']}"
        if warning["severity"] == "fail":
            expected_failures.append(category)
        else:
            expected_reviews.append(category)
    if failure_categories != sorted(set(expected_failures)):
        raise ValidationError(f"{label}.failureCategories is not exactly derived")
    if review_categories != sorted(set(expected_reviews)):
        raise ValidationError(f"{label}.reviewCategories is not exactly derived")
    expected_status = (
        "fail"
        if failure_categories
        else "review"
        if review_categories
        else "pass"
    )
    if result["fidelityStatus"] != expected_status:
        raise ValidationError(f"{label}.fidelityStatus is inconsistent with categories")
    return result


def validate_shard_payload(
    value: Any,
    *,
    manifest_family: dict[str, Any],
    manifest_protocol: dict[str, Any],
    scheduler: dict[str, Any],
) -> dict[str, Any]:
    payload = require_exact_keys(value, SHARD_PAYLOAD_KEYS, "family shard.payload")
    initialization = validate_engine_initialization(
        payload["engineInitialization"], "family shard.payload.engineInitialization"
    )
    family_index = manifest_family["index"]
    map_attestation = validate_map_load_attestation(
        payload["mapLoadAttestation"],
        "family shard.payload.mapLoadAttestation",
        family_index=family_index,
        expected_bytes=manifest_family["bytes"],
        expected_sha256=manifest_family["sha256"],
    )
    validate_family_result(
        payload["familyResult"],
        "family shard.payload.familyResult",
        manifest_family=manifest_family,
        manifest_protocol=manifest_protocol,
        scheduler=scheduler,
        initialization=initialization,
        map_load_attestation=map_attestation,
    )
    return payload


def validate_family_shard(
    value: Any,
    *,
    manifest_sha256: str,
    attestation_sha256: str,
    family_binding: dict[str, Any],
    attempt_number: int,
    intent_sha256: str,
    scheduler: dict[str, Any],
    manifest_family: dict[str, Any],
    manifest_protocol: dict[str, Any],
) -> dict[str, Any]:
    shard = require_exact_keys(value, SHARD_KEYS, "family shard")
    reject_forbidden_keys(shard, "family shard")
    if (
        shard["schemaVersion"] != INTERNAL_EVIDENCE_SCHEMA_VERSION
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
    validate_shard_payload(
        shard["payload"],
        manifest_family=manifest_family,
        manifest_protocol=manifest_protocol,
        scheduler=scheduler,
    )
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
        terminal["schemaVersion"] != INTERNAL_EVIDENCE_SCHEMA_VERSION
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
    worker_diagnostic = disposition["workerDiagnostic"]
    if worker_diagnostic is not None:
        validate_worker_technical_diagnostic(
            worker_diagnostic,
            "attempt terminal.technicalDisposition.workerDiagnostic",
        )
        expected_diagnostic_stream = canonical_bytes(worker_diagnostic) + b"\n"
        if (
            process["exitCode"] != 2
            or streams["stdout"]["bytes"] != 0
            or streams["stdout"]["sha256"] != hashlib.sha256(b"").hexdigest()
            or streams["stdout"]["truncated"] is not False
            or streams["stderr"]["bytes"] != len(expected_diagnostic_stream)
            or streams["stderr"]["sha256"]
            != hashlib.sha256(expected_diagnostic_stream).hexdigest()
            or streams["stderr"]["truncated"] is not False
        ):
            raise ValidationError(
                "Worker diagnostic does not bind the exact stderr stream"
            )
    if disposition["status"] not in {"complete", "retryable_failure"}:
        raise ValidationError("Technical disposition status is invalid")
    if (
        not isinstance(disposition["categories"], list)
        or any(not isinstance(item, str) or not item for item in disposition["categories"])
        or disposition["categories"] != sorted(set(disposition["categories"]))
    ):
        raise ValidationError(
            "Technical disposition categories must be sorted unique strings"
        )
    if disposition["status"] == "complete" and (
        disposition["categories"] or worker_diagnostic is not None
    ):
        raise ValidationError(
            "Complete technical disposition cannot have failures or diagnostics"
        )
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
        checkpoint["schemaVersion"] != INTERNAL_EVIDENCE_SCHEMA_VERSION
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
        self.worker_command_prefix_sha256 = canonical_sha256(
            self.worker_command_prefix
        )
        self.worker_executable = resolve_worker_executable(
            self.worker_command_prefix[0],
            self.worker_environment,
        )
        if isinstance(max_attempts, bool) or max_attempts not in (1, 2):
            raise ValidationError("Technical attempt budget must be one or two")
        require_positive_finite_number(timeout_seconds, "timeout_seconds")
        require_positive_finite_number(
            termination_grace_seconds,
            "termination_grace_seconds",
        )
        if (
            isinstance(max_stream_bytes, bool)
            or not isinstance(max_stream_bytes, int)
            or max_stream_bytes <= 0
        ):
            raise ValidationError("max_stream_bytes must be a positive integer")
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
            self.manifest.get("schemaVersion") != MANIFEST_SCHEMA_VERSION
            or self.manifest.get("gate") != GATE
            or self.manifest.get("outcomeFree") is not True
        ):
            raise ValidationError("Input manifest identity markers are invalid")
        if self.manifest.get("scheduler") != self.scheduler:
            raise ValidationError("Manifest scheduler does not match authoritative scheduler")
        validate_scheduler(self.manifest.get("scheduler"), "manifest.scheduler")
        runtime_hashes = require_exact_keys(
            self.manifest.get("runtimeHashes"),
            RUNTIME_HASH_KEYS,
            "manifest.runtimeHashes",
        )
        for key, value in runtime_hashes.items():
            require_sha256(value, f"manifest.runtimeHashes.{key}")
        protocol = self.manifest.get("protocol")
        if not isinstance(protocol, dict):
            raise ValidationError("manifest.protocol must be an object")
        target_tick = require_nonnegative_integer(
            protocol.get("targetTick"), "manifest.protocol.targetTick"
        )
        engine_seed_base = require_nonnegative_integer(
            protocol.get("engineSeedBase"), "manifest.protocol.engineSeedBase"
        )
        if target_tick <= 1 or engine_seed_base > 0xFFFF_FFFF:
            raise ValidationError("Manifest target tick/engine seed range is invalid")
        self._manifest_attestation_bindings()
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
            if index > 999_999:
                raise ValidationError("Manifest family index exceeds alias protocol")
            for key in ("representativeMapPath", "mapName"):
                require_nonempty_string(
                    family.get(key), f"manifest.families[{ordinal}].{key}"
                )
            representative = Path(family["representativeMapPath"])
            if representative.is_absolute() or ".." in representative.parts:
                raise ValidationError(
                    f"manifest.families[{ordinal}].representativeMapPath "
                    "must be a safe relative path"
                )
            require_nonnegative_integer(
                family.get("bytes"), f"manifest.families[{ordinal}].bytes"
            )
            require_sha256(
                family.get("sha256"), f"manifest.families[{ordinal}].sha256"
            )
            starts = family.get("declaredStartLocations")
            if not isinstance(starts, list) or len(starts) < 2:
                raise ValidationError(
                    f"manifest.families[{ordinal}].declaredStartLocations "
                    "must contain at least two points"
                )
            for start_index, point in enumerate(starts):
                validate_point(
                    point,
                    f"manifest.families[{ordinal}].declaredStartLocations[{start_index}]",
                    declared=True,
                )
            static_checks = family.get("staticChecks")
            if not isinstance(static_checks, dict):
                raise ValidationError(
                    f"manifest.families[{ordinal}].staticChecks must be an object"
                )
            require_string_list(
                static_checks.get("failures"),
                f"manifest.families[{ordinal}].staticChecks.failures",
            )
            if index <= previous_index:
                raise ValidationError("Manifest family indices must be strictly increasing")
            if family_id in seen_ids:
                raise ValidationError("Manifest family IDs must be unique")
            previous_index = index
            seen_ids.add(family_id)

    def _manifest_attestation_bindings(self) -> dict[str, Any]:
        inputs = self.manifest.get("inputs")
        if not isinstance(inputs, dict):
            raise ValidationError("manifest.inputs must be an object")
        git = inputs.get("git")
        source_bundle = inputs.get("sourceBundle")
        runtime_bundle = inputs.get("runtimeBundle")
        if not isinstance(git, dict):
            raise ValidationError("manifest.inputs.git must be an object")
        if not isinstance(source_bundle, dict) or not isinstance(runtime_bundle, dict):
            raise ValidationError("Manifest source/runtime bundles must be objects")
        source_commit = require_nonempty_string(
            git.get("commit"), "manifest.inputs.git.commit"
        )
        if re.fullmatch(r"[0-9a-f]{40,64}", source_commit) is None:
            raise ValidationError("manifest.inputs.git.commit must be a lowercase commit hash")
        bindings = {
            "sourceCommit": source_commit,
            "targetPopulationCommitmentSha256": require_sha256(
                inputs.get("targetPopulationCommitmentSha256"),
                "manifest.inputs.targetPopulationCommitmentSha256",
            ),
            "familySequenceSha256": require_sha256(
                inputs.get("familySequenceSha256"),
                "manifest.inputs.familySequenceSha256",
            ),
            "sourceBundleSha256": require_sha256(
                source_bundle.get("sha256"), "manifest.inputs.sourceBundle.sha256"
            ),
            "runtimeBundleSha256": require_sha256(
                runtime_bundle.get("sha256"), "manifest.inputs.runtimeBundle.sha256"
            ),
        }
        if (
            bindings["sourceBundleSha256"]
            != self.manifest["runtimeHashes"]["sourceBundleSha256"]
            or bindings["runtimeBundleSha256"]
            != self.manifest["runtimeHashes"]["runtimeBundleSha256"]
        ):
            raise ValidationError("Manifest bundle bindings disagree with runtimeHashes")
        return bindings

    def _validate_attestation(self) -> None:
        attestation = require_exact_keys(
            self.attestation, ATTESTATION_KEYS, "job attestation"
        )
        reject_forbidden_keys(attestation, "job attestation")
        if (
            attestation["schemaVersion"] != INTERNAL_EVIDENCE_SCHEMA_VERSION
            or attestation["gate"] != GATE
            or attestation["artifactKind"] != "map_fidelity_job_attestation"
            or attestation["outcomeFree"] is not True
            or attestation["phase"] != "pre_workers"
            or attestation["preAttestation"] is not None
            or attestation["checkpointLedger"] is not None
        ):
            raise ValidationError("Job attestation identity markers are invalid")
        manifest_binding = verify_exact_file_binding(
            attestation["manifest"], "job attestation.manifest"
        )
        if (
            Path(manifest_binding["path"]) != self.manifest_path.resolve(strict=True)
            or manifest_binding != exact_file_binding(self.manifest_path)
        ):
            raise ValidationError("Job attestation does not bind the exact manifest")
        if attestation["scheduler"] != self.scheduler:
            raise ValidationError("Job attestation scheduler does not match")
        validate_scheduler(attestation["scheduler"], "job attestation.scheduler")
        runtime_hashes = require_exact_keys(
            attestation["runtimeHashes"],
            RUNTIME_HASH_KEYS,
            "job attestation.runtimeHashes",
        )
        for key, value in runtime_hashes.items():
            require_sha256(value, f"job attestation.runtimeHashes.{key}")
        if runtime_hashes != self.manifest["runtimeHashes"]:
            raise ValidationError(
                "Job attestation runtimeHashes do not match manifest-v2"
            )
        bindings = require_exact_keys(
            attestation["bindings"],
            ATTESTATION_BINDING_KEYS,
            "job attestation.bindings",
        )
        if bindings != self._manifest_attestation_bindings():
            raise ValidationError("Job attestation bindings do not match manifest-v2")

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
            "schemaVersion": INTERNAL_EVIDENCE_SCHEMA_VERSION,
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
                "commandPrefixSha256": self.worker_command_prefix_sha256,
                "commandSha256": canonical_sha256(command),
                "executable": (
                    verify_exact_file_binding(self.worker_executable, "worker executable")
                    if self.worker_executable is not None
                    else None
                ),
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
            manifest_family=self.families[ordinal],
            manifest_protocol=self.manifest["protocol"],
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
        worker_diagnostic: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        category_list = sorted(set(categories))
        term_signal = -return_code if return_code is not None and return_code < 0 else None
        exit_code = return_code if return_code is not None and return_code >= 0 else None
        return {
            "schemaVersion": INTERNAL_EVIDENCE_SCHEMA_VERSION,
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
                "workerDiagnostic": worker_diagnostic,
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
        worker_diagnostic: dict[str, Any] | None = None
        if (
            process.returncode not in {None, 0}
            and stdout_record["bytes"] == 0
            and stderr_collector.diagnostic_candidate() is not None
        ):
            try:
                worker_diagnostic = parse_worker_technical_diagnostic(
                    stderr_collector.diagnostic_candidate() or b""
                )
            except ValidationError:
                categories.append("worker_diagnostic_invalid")
        if (
            stdout_record["bytes"]
            or (stderr_record["bytes"] and worker_diagnostic is None)
        ):
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
            worker_diagnostic=worker_diagnostic,
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
            "schemaVersion": INTERNAL_EVIDENCE_SCHEMA_VERSION,
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
        attempts_root = self.family_directory(ordinal) / "attempts"
        attempt_directories = sorted(
            path for path in attempts_root.iterdir() if path.is_dir()
        )
        expected_attempt_names = [
            f"{index:02d}" for index in range(1, attempt_number + 1)
        ]
        if [path.name for path in attempt_directories] != expected_attempt_names:
            raise ValidationError(
                "Checkpoint family has missing or post-completion attempt directories"
            )
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

    def _campaign_configuration(self) -> dict[str, Any]:
        executable = (
            verify_exact_file_binding(self.worker_executable, "worker executable")
            if self.worker_executable is not None
            else None
        )
        return {
            "executionPolicy": {
                "timeoutSeconds": self.timeout_seconds,
                "terminationGraceSeconds": self.termination_grace_seconds,
                "maxTechnicalAttempts": self.max_attempts,
                "maxStreamBytes": self.max_stream_bytes,
            },
            "environmentSha256": canonical_sha256(self.worker_environment),
            "workerCommandPrefixSha256": self.worker_command_prefix_sha256,
            "workerExecutable": executable,
        }

    def _campaign_attempt_ledger(self) -> list[dict[str, Any]]:
        attempts: list[dict[str, Any]] = []
        for ordinal in range(len(self.families)):
            attempts_root = self.family_directory(ordinal) / "attempts"
            if not os.path.lexists(attempts_root):
                continue
            reject_symlink_components(
                attempts_root,
                f"family {ordinal} attempt ledger root",
            )
            if not attempts_root.is_dir():
                raise ValidationError("Attempt ledger root is not a directory")
            entries = sorted(attempts_root.iterdir(), key=lambda path: path.name)
            if any(not path.is_dir() for path in entries):
                raise ValidationError(
                    "Attempt ledger root contains a non-directory entry"
                )
            expected_names = [
                f"{index:02d}" for index in range(1, len(entries) + 1)
            ]
            if [path.name for path in entries] != expected_names:
                raise ValidationError("Attempt directories are not contiguous from 01")
            if len(entries) > self.max_attempts:
                raise ValidationError(
                    "Attempt directory count exceeds fixed technical budget"
                )

            for attempt_number, attempt_dir in enumerate(entries, 1):
                reject_symlink_components(
                    attempt_dir,
                    f"family {ordinal} attempt {attempt_number} directory",
                )
                intent_path = attempt_dir / "attempt-intent.json"
                terminal_path = attempt_dir / "attempt-terminal.json"
                shard_path = attempt_dir / "family-shard.json"
                expected_intent = self._expected_intent(
                    ordinal,
                    attempt_number,
                    intent_path,
                    shard_path,
                )
                validate_attempt_intent(
                    load_json(intent_path),
                    expected=expected_intent,
                )
                intent = private_exact_file(intent_path)
                terminal_value = validate_terminal(
                    load_json(terminal_path),
                    manifest_sha256=self.manifest_sha256,
                    attestation_sha256=self.attestation_sha256,
                    family_binding=self.family_binding(ordinal),
                    attempt_number=attempt_number,
                    intent_sha256=intent["sha256"],
                    scheduler=self.scheduler,
                )
                terminal = private_exact_file(terminal_path)

                shard: dict[str, Any] | None = None
                if os.path.lexists(shard_path):
                    reject_symlink_components(
                        shard_path,
                        f"family {ordinal} attempt {attempt_number} shard",
                    )
                    shard = exact_file_binding(shard_path)
                    if Path(shard["path"]) != shard_path:
                        raise ValidationError(
                            "Attempt shard descriptor path is not canonical"
                        )
                terminal_shard = terminal_value["shard"]
                if terminal_shard is not None and terminal_shard != shard:
                    raise ValidationError(
                        "Attempt terminal shard binding disagrees with ledger"
                    )
                if (
                    terminal_value["technicalDisposition"]["status"] == "complete"
                    and (shard is None or terminal_shard != shard)
                ):
                    raise ValidationError(
                        "Complete attempt does not bind its exact shard"
                    )
                attempts.append(
                    {
                        "family": self.family_binding(ordinal),
                        "attemptNumber": attempt_number,
                        "intent": intent,
                        "terminal": terminal,
                        "shard": shard,
                    }
                )
        return attempts

    def _validate_exhausted_pending_family(self, ordinal: int) -> None:
        if self._validate_existing_checkpoint(ordinal) is not None:
            raise ValidationError("Pending family unexpectedly has a checkpoint")
        attempts_root = self.family_directory(ordinal) / "attempts"
        if not attempts_root.is_dir():
            raise ValidationError("Pending family has no attempt directory")
        entries = sorted(path for path in attempts_root.iterdir() if path.is_dir())
        expected_names = [
            f"{index:02d}" for index in range(1, self.max_attempts + 1)
        ]
        if [path.name for path in entries] != expected_names:
            raise ValidationError("Pending family did not exhaust the fixed retry budget")
        for attempt_number, attempt_dir in enumerate(entries, 1):
            intent_path = attempt_dir / "attempt-intent.json"
            terminal_path = attempt_dir / "attempt-terminal.json"
            shard_path = attempt_dir / "family-shard.json"
            expected_intent = self._expected_intent(
                ordinal,
                attempt_number,
                intent_path,
                shard_path,
            )
            validate_attempt_intent(load_json(intent_path), expected=expected_intent)
            intent_sha256 = sha256_file(intent_path)
            terminal = validate_terminal(
                load_json(terminal_path),
                manifest_sha256=self.manifest_sha256,
                attestation_sha256=self.attestation_sha256,
                family_binding=self.family_binding(ordinal),
                attempt_number=attempt_number,
                intent_sha256=intent_sha256,
                scheduler=self.scheduler,
            )
            if terminal["technicalDisposition"]["status"] != "retryable_failure":
                raise ValidationError(
                    "Pending family contains a technically complete attempt"
                )

    def _campaign_terminal_record(
        self,
        pending_ordinals: list[int],
    ) -> dict[str, Any]:
        pending = set(pending_ordinals)
        checkpoints: list[dict[str, Any]] = []
        for ordinal in range(len(self.families)):
            if ordinal in pending:
                self._validate_exhausted_pending_family(ordinal)
                continue
            checkpoint_path = (
                self.family_directory(ordinal) / "completion-checkpoint.json"
            )
            if self._validate_existing_checkpoint(ordinal) is None:
                raise ValidationError("Completed family lacks a valid checkpoint")
            binding = private_exact_file(checkpoint_path)
            checkpoints.append({"manifestOrdinal": ordinal, **binding})
        attempts = self._campaign_attempt_ledger()
        return {
            "schemaVersion": INTERNAL_EVIDENCE_SCHEMA_VERSION,
            "gate": GATE,
            "artifactKind": "map_fidelity_campaign_terminal",
            "outcomeFree": True,
            "manifestSha256": self.manifest_sha256,
            "attestationSha256": self.attestation_sha256,
            "scheduler": self.scheduler,
            "configuration": self._campaign_configuration(),
            "familyCount": len(self.families),
            "completedCount": len(checkpoints),
            "pendingCount": len(pending_ordinals),
            "technicalAttemptCount": len(attempts),
            "pendingManifestOrdinals": pending_ordinals,
            "attempts": attempts,
            "checkpoints": checkpoints,
        }

    def _validate_campaign_terminal(self, value: Any) -> dict[str, Any]:
        terminal = require_exact_keys(
            value, CAMPAIGN_TERMINAL_KEYS, "campaign terminal"
        )
        reject_forbidden_keys(terminal, "campaign terminal")
        if (
            terminal["schemaVersion"] != INTERNAL_EVIDENCE_SCHEMA_VERSION
            or terminal["gate"] != GATE
            or terminal["artifactKind"] != "map_fidelity_campaign_terminal"
            or terminal["outcomeFree"] is not True
            or terminal["manifestSha256"] != self.manifest_sha256
            or terminal["attestationSha256"] != self.attestation_sha256
            or terminal["scheduler"] != self.scheduler
        ):
            raise ValidationError("Campaign terminal binding is invalid")
        validate_scheduler(terminal["scheduler"], "campaign terminal.scheduler")
        configuration = require_exact_keys(
            terminal["configuration"],
            CAMPAIGN_CONFIGURATION_KEYS,
            "campaign terminal.configuration",
        )
        policy = require_exact_keys(
            configuration["executionPolicy"],
            EXECUTION_POLICY_KEYS,
            "campaign terminal.configuration.executionPolicy",
        )
        for key in ("timeoutSeconds", "terminationGraceSeconds"):
            require_positive_finite_number(
                policy[key], f"campaign terminal.configuration.executionPolicy.{key}"
            )
        max_stream_bytes = require_nonnegative_integer(
            policy["maxStreamBytes"],
            "campaign terminal.configuration.executionPolicy.maxStreamBytes",
        )
        if max_stream_bytes == 0:
            raise ValidationError("Campaign terminal maxStreamBytes must be positive")
        if (
            isinstance(policy["maxTechnicalAttempts"], bool)
            or policy["maxTechnicalAttempts"] not in (1, 2)
        ):
            raise ValidationError("Campaign terminal technical attempt budget is invalid")
        require_sha256(
            configuration["environmentSha256"],
            "campaign terminal.configuration.environmentSha256",
        )
        require_sha256(
            configuration["workerCommandPrefixSha256"],
            "campaign terminal.configuration.workerCommandPrefixSha256",
        )
        if configuration["workerExecutable"] is not None:
            verify_exact_file_binding(
                configuration["workerExecutable"],
                "campaign terminal.configuration.workerExecutable",
            )
        if canonical_bytes(configuration) != canonical_bytes(self._campaign_configuration()):
            raise ValidationError("Campaign terminal configuration does not match")

        family_count = require_nonnegative_integer(
            terminal["familyCount"], "campaign terminal.familyCount"
        )
        completed_count = require_nonnegative_integer(
            terminal["completedCount"], "campaign terminal.completedCount"
        )
        pending_count = require_nonnegative_integer(
            terminal["pendingCount"], "campaign terminal.pendingCount"
        )
        technical_attempt_count = require_nonnegative_integer(
            terminal["technicalAttemptCount"],
            "campaign terminal.technicalAttemptCount",
        )
        pending_ordinals = terminal["pendingManifestOrdinals"]
        if (
            not isinstance(pending_ordinals, list)
            or any(
                isinstance(ordinal, bool) or not isinstance(ordinal, int)
                for ordinal in pending_ordinals
            )
            or pending_ordinals != sorted(set(pending_ordinals))
            or any(ordinal < 0 or ordinal >= family_count for ordinal in pending_ordinals)
        ):
            raise ValidationError("Campaign terminal pending ordinals are invalid")

        attempts = terminal["attempts"]
        if not isinstance(attempts, list):
            raise ValidationError("campaign terminal.attempts must be an array")
        attempt_order: list[tuple[int, int]] = []
        for index, attempt_value in enumerate(attempts):
            attempt = require_exact_keys(
                attempt_value,
                CAMPAIGN_ATTEMPT_KEYS,
                f"campaign terminal.attempts[{index}]",
            )
            family = validate_family_binding(
                attempt["family"],
                f"campaign terminal.attempts[{index}].family",
            )
            attempt_number = require_nonnegative_integer(
                attempt["attemptNumber"],
                f"campaign terminal.attempts[{index}].attemptNumber",
            )
            if not 1 <= attempt_number <= self.max_attempts:
                raise ValidationError(
                    "Campaign terminal attempt number exceeds the fixed budget"
                )
            for descriptor_name in ("intent", "terminal"):
                validate_exact_file_binding(
                    attempt[descriptor_name],
                    (
                        f"campaign terminal.attempts[{index}]."
                        f"{descriptor_name}"
                    ),
                )
            if attempt["shard"] is not None:
                validate_exact_file_binding(
                    attempt["shard"],
                    f"campaign terminal.attempts[{index}].shard",
                )
            attempt_order.append(
                (family["manifestOrdinal"], attempt_number)
            )
        if attempt_order != sorted(set(attempt_order)):
            raise ValidationError(
                "Campaign terminal attempts are not ordered/unique"
            )
        expected_attempts = self._campaign_attempt_ledger()
        if canonical_bytes(attempts) != canonical_bytes(expected_attempts):
            raise ValidationError(
                "Campaign terminal attempt ledger does not match exact artifacts"
            )

        checkpoints = terminal["checkpoints"]
        if not isinstance(checkpoints, list):
            raise ValidationError("campaign terminal.checkpoints must be an array")
        checkpoint_ordinals: list[int] = []
        for index, value_binding in enumerate(checkpoints):
            binding = require_exact_keys(
                value_binding,
                CAMPAIGN_CHECKPOINT_KEYS,
                f"campaign terminal.checkpoints[{index}]",
            )
            ordinal = require_nonnegative_integer(
                binding["manifestOrdinal"],
                f"campaign terminal.checkpoints[{index}].manifestOrdinal",
            )
            if ordinal >= len(self.families):
                raise ValidationError(
                    "Campaign terminal checkpoint ordinal is out of range"
                )
            file_binding = {
                key: binding[key] for key in ("path", "bytes", "sha256")
            }
            validate_exact_file_binding(
                file_binding, f"campaign terminal.checkpoints[{index}]"
            )
            expected_path = (
                self.family_directory(ordinal) / "completion-checkpoint.json"
            )
            if (
                Path(binding["path"]) != expected_path
                or private_exact_file(expected_path) != file_binding
                or self._validate_existing_checkpoint(ordinal) is None
            ):
                raise ValidationError("Campaign terminal checkpoint binding is invalid")
            checkpoint_ordinals.append(ordinal)
        if checkpoint_ordinals != sorted(set(checkpoint_ordinals)):
            raise ValidationError("Campaign terminal checkpoints are not ordered/unique")
        expected_checkpoint_ordinals = [
            ordinal for ordinal in range(family_count) if ordinal not in pending_ordinals
        ]
        if (
            family_count != len(self.families)
            or completed_count != len(checkpoints)
            or pending_count != len(pending_ordinals)
            or completed_count + pending_count != family_count
            or checkpoint_ordinals != expected_checkpoint_ordinals
            or technical_attempt_count != len(attempts)
        ):
            raise ValidationError("Campaign terminal counts/bindings are inconsistent")
        for ordinal in pending_ordinals:
            self._validate_exhausted_pending_family(ordinal)
        return terminal

    def _summary_from_campaign_terminal(
        self,
        terminal: dict[str, Any],
        *,
        resumed_count: int,
        launched_count: int,
    ) -> dict[str, Any]:
        terminal_path = self.run_root / "campaign-terminal.json"
        return {
            "familyCount": terminal["familyCount"],
            "completedCount": terminal["completedCount"],
            "pendingCount": terminal["pendingCount"],
            "resumedCount": resumed_count,
            "launchedAttemptCount": launched_count,
            "pendingManifestOrdinals": terminal["pendingManifestOrdinals"],
            "campaignTerminal": private_exact_file(terminal_path),
        }

    def run(self) -> dict[str, Any]:
        completed = 0
        resumed = 0
        launched = 0
        pending_ordinals: list[int] = []
        with CampaignLock(self.run_root / "campaign.lock"):
            campaign_terminal_path = self.run_root / "campaign-terminal.json"
            if campaign_terminal_path.exists():
                campaign_terminal = self._validate_campaign_terminal(
                    load_json(campaign_terminal_path)
                )
                return self._summary_from_campaign_terminal(
                    campaign_terminal,
                    resumed_count=campaign_terminal["completedCount"],
                    launched_count=0,
                )
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
            campaign_terminal = self._campaign_terminal_record(pending_ordinals)
            self._validate_campaign_terminal(campaign_terminal)
            atomic_write_json(campaign_terminal_path, campaign_terminal)
            return self._summary_from_campaign_terminal(
                campaign_terminal,
                resumed_count=resumed,
                launched_count=launched,
            )


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
