#!/usr/bin/env python3
"""Streaming certificate for the complete unified-intent Gate 2 seed audit."""

from __future__ import annotations

import hashlib
import heapq
import json
import os
from pathlib import Path
import re
import sqlite3
import subprocess


PROJECT = Path("/nfs/roberts/project/pi_jss233/zc362/chrono_divide")
REPO = PROJECT / "strong-chronodivide-bot"
STUDY = PROJECT / "research-evidence/unified-intent-arbiter-v1/gate-2"
AUDIT_ROOT = STUDY / "seed-audit-v1-a2"
AUDIT = AUDIT_ROOT / "seed-audit.json"
AUDIT_SHA256 = "6e83a8d51597236dbf1fe80d22262b40bfc737dc6234c68a94853af5ddfaf52a"
AUDIT_BYTES = 585_357_862
AUDIT_JOB_ID = "25480245"
AUDIT_SOURCE = "bc7c61ea443880484b18f35ec52a43c2cb6dcd69"
AUDIT_PROGRAM_SHA256 = "fc4e4f017463b871876c43dc4b63f19644097c788182bd57caf3857c8706e061"
GATE2_SHA256 = "e673fde0577cb82b18be98a5ffbc102621a67db56918dec3d656c1477314786e"
A1_SHA256 = "74ccb56177a45a5937cd61688f7297d54eed63214e187e080d422bdabc825ac1"
A2_SHA256 = "eee3f0bb1b36b6df4dbfa6b3e4ddbd5cb1e38d8ec6cdd1223573af0e92520e8e"
A3 = REPO / (
    "research/protocols/method/"
    "2026-09-09-unified-intent-arbiter-v1-gate-2-amendment-a3.md"
)
A4 = REPO / (
    "research/protocols/method/"
    "2026-09-09-unified-intent-arbiter-v1-gate-2-amendment-a4.md"
)
CANDIDATE_BASES = (
    3_330_000_000, 3_340_000_000, 3_350_000_000, 3_360_000_000,
    3_370_000_000, 3_380_000_000, 3_390_000_000, 3_410_000_000,
    3_420_000_000, 3_430_000_000, 3_440_000_000, 3_450_000_000,
    3_460_000_000, 3_470_000_000, 3_480_000_000, 3_490_000_000,
    3_510_000_000, 3_520_000_000, 3_530_000_000, 3_540_000_000,
)
SELECTED_BASE = 3_350_000_000
SAMPLE_SIZE = 2_048
SHA256 = re.compile(r"^[0-9a-f]{64}$")
TOP_SIMPLE = re.compile(r'^  "([^"]+)": (.+?)(?:,)?$')


class Gate2CertificateFailure(RuntimeError):
    pass


def digest(path: Path) -> str:
    value = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            value.update(chunk)
    return value.hexdigest()


def git(*arguments: str) -> str:
    return subprocess.run(
        ["git", *arguments],
        cwd=REPO,
        check=True,
        text=True,
        capture_output=True,
    ).stdout.strip()


def canonical_hash(values: list[dict]) -> str:
    stream = "".join(
        json.dumps(value, sort_keys=True, separators=(",", ":")) + "\n"
        for value in values
    )
    return hashlib.sha256(stream.encode()).hexdigest()


def scheduler_record() -> dict:
    output = subprocess.run([
        "/opt/slurm/current/bin/sacct",
        "-X",
        "-j",
        AUDIT_JOB_ID,
        "--noheader",
        "--parsable2",
        "--format=JobIDRaw,State,ExitCode,Account,Partition,AllocCPUS,Restarts,ElapsedRaw",
    ], check=True, text=True, capture_output=True).stdout
    rows = [line.split("|") for line in output.splitlines() if line.strip()]
    rows = [row for row in rows if row[0] == AUDIT_JOB_ID]
    if len(rows) != 1 or len(rows[0]) != 8:
        raise Gate2CertificateFailure("audit scheduler row is not unique")
    row = rows[0]
    value = {
        "jobId": row[0],
        "state": row[1],
        "exitCode": row[2],
        "account": row[3],
        "partition": row[4],
        "cpus": int(row[5]),
        "restarts": int(row[6]),
        "elapsedSeconds": int(row[7]),
    }
    if value != {
        "jobId": AUDIT_JOB_ID,
        "state": "COMPLETED",
        "exitCode": "0:0",
        "account": "pi_jss233",
        "partition": "day",
        "cpus": 1,
        "restarts": 0,
        "elapsedSeconds": 22_675,
    }:
        raise Gate2CertificateFailure("audit scheduler identity drifted")
    return value


def parse_block(lines: list[str], label: str) -> object:
    try:
        return json.loads("".join(lines))
    except json.JSONDecodeError as error:
        raise Gate2CertificateFailure(label + " block is malformed") from error


def stream_audit(path: Path, uniqueness_db: Path) -> dict:
    top: dict[str, object] = {}
    candidates: list[dict] | None = None
    scheduler: dict | None = None
    selected_interval: list[int] | None = None
    totals: dict | None = None
    block_name: str | None = None
    block_lines: list[str] = []
    in_files = False
    files_closed = False
    file_count = 0
    byte_count = 0
    gzip_count = 0
    gzip_bytes = 0
    heap: list[tuple[int, str, dict]] = []
    if uniqueness_db.exists():
        raise Gate2CertificateFailure("path uniqueness index already exists")
    connection = sqlite3.connect(str(uniqueness_db))
    connection.execute("PRAGMA journal_mode=OFF")
    connection.execute("PRAGMA synchronous=OFF")
    connection.execute("PRAGMA temp_store=FILE")
    connection.execute(
        "CREATE TABLE paths(path TEXT PRIMARY KEY) WITHOUT ROWID",
    )
    path_batch: list[tuple[str]] = []

    def flush_paths() -> None:
        if not path_batch:
            return
        try:
            connection.executemany(
                "INSERT INTO paths(path) VALUES (?)",
                path_batch,
            )
        except sqlite3.IntegrityError as error:
            raise Gate2CertificateFailure("duplicate file ledger path") from error
        path_batch.clear()


    def close_block() -> None:
        nonlocal candidates, scheduler, selected_interval, totals
        value = parse_block(block_lines, block_name or "unknown")
        if block_name == "candidateAssessments":
            candidates = value
        elif block_name == "scheduler":
            scheduler = value
        elif block_name == "selectedInterval":
            selected_interval = value
        elif block_name == "totals":
            totals = value
        else:
            raise Gate2CertificateFailure("unexpected parsed block")

    with path.open() as handle:
        for line in handle:
            if in_files:
                if line == "  ]\n":
                    in_files = False
                    files_closed = True
                    continue
                raw = line.strip()
                if raw.endswith(","):
                    raw = raw[:-1]
                record = json.loads(raw)
                if sorted(record) != [
                    "bytes", "gzipDecompressedBytes", "path", "sha256",
                ]:
                    raise Gate2CertificateFailure("file ledger schema drifted")
                file_path = record["path"]
                if (
                    not isinstance(file_path, str)
                    or not file_path.startswith("/")
                    or not isinstance(record["bytes"], int)
                    or record["bytes"] < 0
                    or not isinstance(record["sha256"], str)
                    or not SHA256.fullmatch(record["sha256"])
                    or not (
                        record["gzipDecompressedBytes"] is None
                        or isinstance(record["gzipDecompressedBytes"], int)
                        and record["gzipDecompressedBytes"] >= 0
                    )
                ):
                    raise Gate2CertificateFailure("file ledger value drifted")
                path_batch.append((file_path,))
                if len(path_batch) >= 10_000:
                    flush_paths()
                file_count += 1
                byte_count += record["bytes"]
                if record["gzipDecompressedBytes"] is not None:
                    gzip_count += 1
                    gzip_bytes += record["gzipDecompressedBytes"]
                sample_score = int(hashlib.sha256(
                    (AUDIT_SHA256 + "\0" + file_path).encode(),
                ).hexdigest(), 16)
                item = (-sample_score, file_path, record)
                if len(heap) < SAMPLE_SIZE:
                    heapq.heappush(heap, item)
                elif item > heap[0]:
                    heapq.heapreplace(heap, item)
                continue

            if block_name is not None:
                if (
                    block_name in {"candidateAssessments", "selectedInterval"}
                    and line == "  ],\n"
                ):
                    block_lines.append("]\n")
                    close_block()
                    block_name = None
                    block_lines = []
                elif (
                    block_name in {"scheduler", "totals"}
                    and line in {"  },\n", "  }\n"}
                ):
                    block_lines.append("}\n")
                    close_block()
                    block_name = None
                    block_lines = []
                else:
                    block_lines.append(line)
                continue

            if line == '  "candidateAssessments": [\n':
                block_name = "candidateAssessments"
                block_lines = ["[\n"]
            elif line == '  "scheduler": {\n':
                block_name = "scheduler"
                block_lines = ["{\n"]
            elif line == '  "selectedInterval": [\n':
                block_name = "selectedInterval"
                block_lines = ["[\n"]
            elif line == '  "totals": {\n':
                block_name = "totals"
                block_lines = ["{\n"]
            elif line == '  "files": [\n':
                if files_closed:
                    raise Gate2CertificateFailure("duplicate files array")
                in_files = True
            else:
                match = TOP_SIMPLE.match(line.rstrip("\n"))
                if match:
                    try:
                        top[match.group(1)] = json.loads(match.group(2))
                    except json.JSONDecodeError:
                        pass

    flush_paths()
    connection.commit()
    unique_paths = connection.execute("SELECT COUNT(*) FROM paths").fetchone()[0]
    connection.close()
    if unique_paths != file_count:
        raise Gate2CertificateFailure("path uniqueness count drifted")

    if in_files or block_name is not None or not files_closed:
        raise Gate2CertificateFailure("audit stream ended incompletely")
    if candidates is None or scheduler is None or selected_interval is None or totals is None:
        raise Gate2CertificateFailure("audit header blocks are missing")
    expected_totals = {
        "files": file_count,
        "bytes": byte_count,
        "gzipFiles": gzip_count,
        "gzipDecompressedBytes": gzip_bytes,
        "errors": 0,
        "collisionRecords": totals["collisionRecords"],
        "declaredRanges": totals["declaredRanges"],
    }
    if totals != expected_totals:
        raise Gate2CertificateFailure("audit totals do not match streamed files")

    selected_sample = sorted(
        [item[2] for item in heap],
        key=lambda value: (
            hashlib.sha256((AUDIT_SHA256 + "\0" + value["path"]).encode()).hexdigest(),
            value["path"],
        ),
    )
    if len(selected_sample) != SAMPLE_SIZE:
        raise Gate2CertificateFailure("deterministic sample is incomplete")
    for record in selected_sample:
        current = Path(record["path"])
        if not current.is_file() or current.stat().st_size != record["bytes"]:
            raise Gate2CertificateFailure("sampled file path or size drifted")
        if digest(current) != record["sha256"]:
            raise Gate2CertificateFailure("sampled file hash drifted")

    return {
        "top": top,
        "candidateAssessments": candidates,
        "scheduler": scheduler,
        "selectedInterval": selected_interval,
        "totals": totals,
        "sampleSize": len(selected_sample),
        "sampleSha256": canonical_hash(selected_sample),
        "pathUniquenessMode": "sqlite_full_path_primary_key",
    }

def validate(value: dict) -> None:
    top = value["top"]
    expected_top = {
        "amendmentA1Sha256": A1_SHA256,
        "amendmentA2Sha256": A2_SHA256,
        "complete": True,
        "competitiveFieldsAbsent": True,
        "kind": "unified-intent-gate2-seed-audit-v1-a2",
        "passed": True,
        "programSha256": AUDIT_PROGRAM_SHA256,
        "protocolSha256": GATE2_SHA256,
        "selectedBase": SELECTED_BASE,
        "sourceCommit": AUDIT_SOURCE,
        "technicalOnly": True,
    }
    for key, expected in expected_top.items():
        if top.get(key) != expected:
            raise Gate2CertificateFailure("audit top-level identity drifted: " + key)
    if top.get("errors") != []:
        raise Gate2CertificateFailure("audit contains errors")
    assessments = value["candidateAssessments"]
    if len(assessments) != len(CANDIDATE_BASES):
        raise Gate2CertificateFailure("candidate assessment count drifted")
    for index, (record, base) in enumerate(zip(assessments, CANDIDATE_BASES)):
        if (
            record["base"] != base
            or record["interval"] != [base, base + 1_000_000]
            or record["signedInt32EquivalentInterval"] != [
                base - 2**32,
                base + 1_000_000 - 2**32,
            ]
            or record["passed"] != (record["collisionRecords"] == 0)
            or record["selected"] != (index == 2)
        ):
            raise Gate2CertificateFailure("candidate assessment drifted")
    first = next(record for record in assessments if record["passed"])
    if first["base"] != SELECTED_BASE or value["selectedInterval"] != [
        SELECTED_BASE,
        SELECTED_BASE + 1_000_000,
    ]:
        raise Gate2CertificateFailure("first-clean selection drifted")
    if value["scheduler"] != {
        "account": "pi_jss233",
        "jobId": AUDIT_JOB_ID,
        "partition": "day",
    }:
        raise Gate2CertificateFailure("embedded scheduler identity drifted")


def main() -> None:
    if os.environ.get("SLURM_JOB_ACCOUNT") != "pi_jss233":
        raise Gate2CertificateFailure("pi_jss233 required")
    if os.environ.get("SLURM_JOB_PARTITION") != "day":
        raise Gate2CertificateFailure("day partition required")
    if os.environ.get("SLURM_JOB_GPUS") or os.environ.get("SLURM_GPUS"):
        raise Gate2CertificateFailure("GPU prohibited")
    source = git("rev-parse", "HEAD")
    program = Path(__file__).resolve()
    if (
        source != os.environ["SOURCE_COMMIT"]
        or git("branch", "--show-current") != "main"
        or git("rev-parse", "fork/main") != source
        or git("status", "--porcelain=v1")
        or digest(program) != os.environ["PROGRAM_SHA256"]
        or digest(A3) != os.environ["AMENDMENT_A3_SHA256"]
        or digest(A4) != os.environ["AMENDMENT_A4_SHA256"]
    ):
        raise Gate2CertificateFailure("certificate source identity drifted")
    if (
        not AUDIT.is_file()
        or AUDIT.stat().st_size != AUDIT_BYTES
        or digest(AUDIT) != AUDIT_SHA256
        or AUDIT_ROOT.joinpath("COMPLETE").read_text().strip() !=
            "COMPLETE_UNIFIED_INTENT_GATE2_SEED_AUDIT_V1_A2"
        or AUDIT_ROOT.joinpath("seed-audit.sha256").read_text().split()[0] != AUDIT_SHA256
    ):
        raise Gate2CertificateFailure("complete audit binding drifted")
    output = Path(os.environ["OUT_PATH"])
    uniqueness_db = output.parent / "path-uniqueness.tmp.sqlite3"
    if output.exists() or output.parent != STUDY / "seed-certificate-v1-a4":
        raise Gate2CertificateFailure("fresh certificate output required")
    parsed = stream_audit(AUDIT, uniqueness_db)
    validate(parsed)
    scheduler = scheduler_record()
    uniqueness_db.unlink()
    certificate = {
        "kind": "unified-intent-gate2-seed-certificate-v1-a4",
        "complete": True,
        "passed": True,
        "technicalOnly": True,
        "competitiveFieldsAbsent": True,
        "sourceCommit": source,
        "programSha256": digest(program),
        "amendmentA3Sha256": digest(A3),
        "amendmentA4Sha256": digest(A4),
        "audit": {
            "path": str(AUDIT),
            "sha256": AUDIT_SHA256,
            "bytes": AUDIT_BYTES,
            "job": scheduler,
            "sourceCommit": AUDIT_SOURCE,
            "programSha256": AUDIT_PROGRAM_SHA256,
            "protocolSha256": GATE2_SHA256,
            "amendmentA1Sha256": A1_SHA256,
            "amendmentA2Sha256": A2_SHA256,
        },
        "candidateAssessments": [{
            key: record[key]
            for key in ("base", "collisionRecords", "passed", "selected")
        } for record in parsed["candidateAssessments"]],
        "selectedBase": SELECTED_BASE,
        "selectedInterval": [SELECTED_BASE, SELECTED_BASE + 1_000_000],
        "signedInt32EquivalentInterval": [
            SELECTED_BASE - 2**32,
            SELECTED_BASE + 1_000_000 - 2**32,
        ],
        "totals": parsed["totals"],
        "sampleSize": parsed["sampleSize"],
        "sampleSha256": parsed["sampleSha256"],
        "pathUniquenessMode": parsed["pathUniquenessMode"],
        "certificateScheduler": {
            "jobId": os.environ.get("SLURM_JOB_ID"),
            "account": os.environ.get("SLURM_JOB_ACCOUNT"),
            "partition": os.environ.get("SLURM_JOB_PARTITION"),
        },
    }
    with output.open("x") as handle:
        handle.write(json.dumps(certificate, indent=2, sort_keys=True) + "\n")
    print(json.dumps({
        "complete": True,
        "passed": True,
        "selectedBase": SELECTED_BASE,
        "files": parsed["totals"]["files"],
        "sampleSize": parsed["sampleSize"],
        "certificateSha256": digest(output),
    }))


if __name__ == "__main__":
    main()
