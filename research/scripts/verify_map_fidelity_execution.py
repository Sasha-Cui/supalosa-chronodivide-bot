#!/usr/bin/env python3
"""Independently revalidate a completed durable map-compatibility Slurm run."""

from __future__ import annotations

import argparse
import hashlib
import importlib.util
import json
import os
import re
import socket
import stat
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


SCRIPT_PATH = Path(__file__).resolve()
REPO_ROOT = SCRIPT_PATH.parents[2]
GATE_MODULE_PATH = SCRIPT_PATH.with_name("map_fidelity_gate.py")
SPEC = importlib.util.spec_from_file_location(
    "map_fidelity_gate_for_execution_verifier", GATE_MODULE_PATH
)
if SPEC is None or SPEC.loader is None:
    raise RuntimeError("Unable to load map_fidelity_gate.py")
GATE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(GATE)

SCHEMA_VERSION = 1
ARTIFACT_KIND = "independent_map_fidelity_execution_verification"
DURABLE_GATE_ROOT = (
    GATE.DURABLE_EVIDENCE_ROOT / "map-compatibility-gate-v2"
)
DEFAULT_SACCT = Path("/opt/slurm/25.11.6/bin/sacct")
JOB_ID_PATTERN = re.compile(r"^[1-9][0-9]*$")
SACCT_FIELDS = (
    "JobIDRaw",
    "JobName",
    "Account",
    "Partition",
    "QOS",
    "State",
    "ExitCode",
    "ElapsedRaw",
    "TimelimitRaw",
    "AllocCPUS",
    "ReqMem",
    "MaxRSS",
    "NodeList",
)
REQUIRED_COMPLETE_FILES = (
    "input-manifest.json",
    "job-pre-attestation.json",
    "campaign-terminal.json",
    "job-post-attestation.json",
    "probe-results.json",
    "gate-summary.json",
    "supervisor.exit-code",
    "job.stdout.log",
    "job.stderr.log",
)


class VerificationError(RuntimeError):
    """The durable execution cannot be independently verified."""


def sha256_bytes(payload: bytes) -> str:
    return hashlib.sha256(payload).hexdigest()


def strict_job_id(value: str) -> str:
    if JOB_ID_PATTERN.fullmatch(value) is None:
        raise VerificationError("job ID must be a positive decimal integer")
    return value


def parse_sacct_output(output: str, job_id: str) -> list[dict[str, str]]:
    strict_job_id(job_id)
    rows: list[dict[str, str]] = []
    for line_number, line in enumerate(output.splitlines(), start=1):
        if not line.strip():
            continue
        values = line.split("|")
        if len(values) != len(SACCT_FIELDS):
            raise VerificationError(
                f"sacct line {line_number} has {len(values)} fields; "
                f"expected {len(SACCT_FIELDS)}"
            )
        row = dict(zip(SACCT_FIELDS, values))
        row_id = row["JobIDRaw"]
        if row_id != job_id and not row_id.startswith(f"{job_id}."):
            raise VerificationError(
                f"sacct returned an unrelated row: {row_id}"
            )
        rows.append(row)
    root_rows = [row for row in rows if row["JobIDRaw"] == job_id]
    if len(root_rows) != 1:
        raise VerificationError(
            f"sacct must return exactly one root row for {job_id}"
        )
    if not any(row["JobIDRaw"] == f"{job_id}.batch" for row in rows):
        raise VerificationError("sacct output is missing the batch step")
    return rows


def validate_accounting(
    rows: list[dict[str, str]], scheduler: dict[str, Any]
) -> dict[str, Any]:
    root = next(
        row for row in rows if row["JobIDRaw"] == scheduler.get("jobId")
    )
    expected = {
        "JobName": "chrono-map-fidelity",
        "Account": "pi_jss233",
        "Partition": scheduler.get("partition"),
        "QOS": scheduler.get("qos"),
        "AllocCPUS": "1",
        "ReqMem": "4G",
    }
    mismatches = {
        key: {"expected": value, "observed": root.get(key)}
        for key, value in expected.items()
        if not isinstance(value, str) or root.get(key) != value
    }
    if scheduler.get("account") != "pi_jss233":
        mismatches["manifestAccount"] = {
            "expected": "pi_jss233",
            "observed": scheduler.get("account"),
        }
    if scheduler.get("source") != "scontrol":
        mismatches["manifestSchedulerSource"] = {
            "expected": "scontrol",
            "observed": scheduler.get("source"),
        }
    if mismatches:
        raise VerificationError(
            "Slurm accounting does not match the committed execution contract: "
            + json.dumps(mismatches, sort_keys=True)
        )
    incomplete = [
        {
            "JobIDRaw": row["JobIDRaw"],
            "State": row["State"],
            "ExitCode": row["ExitCode"],
        }
        for row in rows
        if row["State"] != "COMPLETED" or row["ExitCode"] != "0:0"
    ]
    if incomplete:
        raise VerificationError(
            "Slurm job or step did not complete successfully: "
            + json.dumps(incomplete, sort_keys=True)
        )
    for key in ("ElapsedRaw", "TimelimitRaw"):
        if not root[key].isdigit():
            raise VerificationError(f"sacct root {key} is not an integer")
    if int(root["ElapsedRaw"]) > int(root["TimelimitRaw"]) * 60:
        raise VerificationError("sacct elapsed time exceeds the recorded limit")
    return {
        "root": root,
        "steps": [row for row in rows if row["JobIDRaw"] != root["JobIDRaw"]],
        "successful": True,
    }


def validate_run_root(run_root: Path, scope: str, job_id: str) -> Path:
    strict_job_id(job_id)
    if scope not in {"preflight", "full"}:
        raise VerificationError("scope must be preflight or full")
    expected = DURABLE_GATE_ROOT / scope / job_id
    GATE.reject_symlink_components(expected, "durable execution root")
    try:
        resolved = run_root.resolve(strict=True)
        expected_resolved = expected.resolve(strict=True)
    except OSError as error:
        raise VerificationError(f"durable execution root is unavailable: {error}") from error
    if resolved != expected_resolved or run_root.absolute() != expected.absolute():
        raise VerificationError(
            f"run root must be the canonical path {expected}"
        )
    mode = resolved.stat().st_mode
    if not stat.S_ISDIR(mode) or mode & 0o077:
        raise VerificationError("durable execution root is not a private directory")
    return resolved


def inventory_private_tree(
    root: Path, *, excluded_relative_paths: set[str] | None = None
) -> list[dict[str, Any]]:
    excluded = excluded_relative_paths or set()
    records: list[dict[str, Any]] = []
    for directory, directory_names, file_names in os.walk(root, topdown=True):
        directory_names.sort()
        file_names.sort()
        directory_path = Path(directory)
        directory_mode = directory_path.lstat().st_mode
        if not stat.S_ISDIR(directory_mode) or directory_mode & 0o077:
            raise VerificationError(
                f"evidence directory is not private and regular: {directory_path}"
            )
        for name in directory_names:
            child = directory_path / name
            child_mode = child.lstat().st_mode
            if stat.S_ISLNK(child_mode) or not stat.S_ISDIR(child_mode):
                raise VerificationError(f"unexpected evidence directory entry: {child}")
        for name in file_names:
            path = directory_path / name
            relative = path.relative_to(root).as_posix()
            if relative in excluded:
                continue
            mode = path.lstat().st_mode
            if stat.S_ISLNK(mode) or not stat.S_ISREG(mode):
                raise VerificationError(f"unexpected evidence file entry: {path}")
            if mode & 0o077:
                raise VerificationError(f"evidence file is not private: {path}")
            records.append({
                "path": relative,
                "bytes": path.stat().st_size,
                "sha256": GATE.sha256_file(path),
            })
    return records


def committed_verifier_descriptor() -> dict[str, Any]:
    relative = SCRIPT_PATH.relative_to(REPO_ROOT).as_posix()
    status = subprocess.run(
        [
            "git", "-C", str(REPO_ROOT), "status", "--porcelain=v1",
            "--untracked-files=all", "--", relative,
        ],
        check=True, capture_output=True, text=True,
    ).stdout
    if status:
        raise VerificationError("execution verifier is not clean and committed")
    commit = subprocess.run(
        ["git", "-C", str(REPO_ROOT), "rev-parse", "HEAD"],
        check=True, capture_output=True, text=True,
    ).stdout.strip()
    blob = subprocess.run(
        ["git", "-C", str(REPO_ROOT), "show", f"{commit}:{relative}"],
        check=True, capture_output=True,
    ).stdout
    descriptor = GATE.exact_file(SCRIPT_PATH)
    if sha256_bytes(blob) != descriptor["sha256"]:
        raise VerificationError("execution verifier bytes do not match HEAD")
    return {
        "sourceCommit": commit,
        "gitPath": relative,
        "file": descriptor,
    }


def run_sacct(sacct: Path, job_id: str) -> tuple[str, list[dict[str, str]]]:
    if not sacct.is_absolute() or not sacct.is_file() or not os.access(sacct, os.X_OK):
        raise VerificationError("sacct must be an absolute executable file")
    completed = subprocess.run(
        [
            str(sacct), "-j", job_id, "-n", "-P",
            "-o", ",".join(SACCT_FIELDS),
        ],
        check=True, capture_output=True, text=True,
    )
    return completed.stdout, parse_sacct_output(completed.stdout, job_id)


def independently_verify(
    *, job_id: str, scope: str, run_root: Path, output: Path, sacct: Path
) -> dict[str, Any]:
    job_id = strict_job_id(job_id)
    root = validate_run_root(run_root, scope, job_id)
    output_absolute = output.absolute()
    expected_output = root / "execution-verification.json"
    if output_absolute != expected_output:
        raise VerificationError(f"output must be {expected_output}")
    if os.path.lexists(output_absolute):
        raise VerificationError("refusing to overwrite execution verification")

    for relative in REQUIRED_COMPLETE_FILES:
        path = root / relative
        if not path.is_file() or path.is_symlink():
            raise VerificationError(f"complete evidence file is missing: {relative}")
        GATE.private_evidence_file(path, durable_root=GATE.DURABLE_EVIDENCE_ROOT)
    if (root / "supervisor.exit-code").read_bytes() != b"0\n":
        raise VerificationError("supervisor did not record an exact zero exit code")

    manifest_path = root / "input-manifest.json"
    pre_path = root / "job-pre-attestation.json"
    post_path = root / "job-post-attestation.json"
    result_path = root / "probe-results.json"
    summary_path = root / "gate-summary.json"
    manifest = GATE.load_json(manifest_path)
    scheduler = manifest.get("scheduler")
    if not isinstance(scheduler, dict) or scheduler.get("jobId") != job_id:
        raise VerificationError("manifest scheduler/job binding is invalid")
    if manifest.get("selection", {}).get("scope") != scope:
        raise VerificationError("manifest scope does not match the durable path")

    raw_sacct, sacct_rows = run_sacct(sacct, job_id)
    accounting = validate_accounting(sacct_rows, scheduler)
    stored_summary = GATE.load_json(summary_path)
    recomputed_summary = GATE.aggregate_supervisor_evidence(
        manifest_path,
        pre_path,
        post_path,
        root,
        result_path,
        scheduler,
        durable_root=GATE.DURABLE_EVIDENCE_ROOT,
        verify_runtime_inputs=True,
    )
    if GATE.canonical_sha256(stored_summary) != GATE.canonical_sha256(recomputed_summary):
        raise VerificationError("stored gate summary differs from independent recomputation")
    pipeline = stored_summary.get("evidencePipeline")
    if not isinstance(pipeline, dict) or pipeline.get("technicallyComplete") is not True:
        raise VerificationError("gate summary does not claim technical completeness")

    files = inventory_private_tree(root)
    file_paths = {record["path"] for record in files}
    missing = sorted(set(REQUIRED_COMPLETE_FILES) - file_paths)
    if missing:
        raise VerificationError(f"private evidence inventory is incomplete: {missing}")
    verifier = committed_verifier_descriptor()
    verified_at = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    record = {
        "schemaVersion": SCHEMA_VERSION,
        "artifactKind": ARTIFACT_KIND,
        "outcomeFree": True,
        "verifiedAt": verified_at,
        "scope": scope,
        "jobId": job_id,
        "runRoot": str(root),
        "verifier": {
            **verifier,
            "host": socket.gethostname(),
            "hostDiffersFromJobNode": socket.gethostname() != accounting["root"]["NodeList"],
        },
        "accounting": {
            "sacctExecutable": GATE.exact_file(sacct),
            "fields": list(SACCT_FIELDS),
            "rawOutputSha256": sha256_bytes(raw_sacct.encode("utf-8")),
            "root": accounting["root"],
            "steps": accounting["steps"],
            "successful": True,
        },
        "evidence": {
            "completeBundleRevalidated": True,
            "manifest": GATE.exact_file(manifest_path),
            "storedGateSummary": GATE.exact_file(summary_path),
            "recomputedGateSummaryCanonicalSha256": GATE.canonical_sha256(
                recomputed_summary
            ),
            "preVerificationFileCount": len(files),
            "preVerificationBytes": sum(record["bytes"] for record in files),
            "preVerificationTreeCommitmentSha256": GATE.canonical_sha256(files),
            "files": files,
        },
        "result": {
            "verdict": stored_summary.get("verdict"),
            "familyCounts": stored_summary.get("familyCounts"),
            "technicalChecksPassed": stored_summary.get("technicalChecksPassed"),
            "notPolicyEvidence": True,
        },
        "interpretation": (
            "This record independently confirms scheduler success and exact durable "
            "infrastructure evidence. It is not a StrongBot gameplay result."
        ),
    }
    GATE.write_exclusive(output_absolute, record)
    return record


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--job-id", required=True)
    parser.add_argument("--scope", choices=("preflight", "full"), required=True)
    parser.add_argument("--run-root", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--sacct", type=Path, default=DEFAULT_SACCT)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    record = independently_verify(
        job_id=args.job_id,
        scope=args.scope,
        run_root=args.run_root,
        output=args.output,
        sacct=args.sacct,
    )
    print(json.dumps({
        "artifact": str(args.output.absolute()),
        "jobId": record["jobId"],
        "scope": record["scope"],
        "verdict": record["result"]["verdict"],
        "familyCounts": record["result"]["familyCounts"],
        "treeCommitmentSha256": record["evidence"][
            "preVerificationTreeCommitmentSha256"
        ],
    }, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
