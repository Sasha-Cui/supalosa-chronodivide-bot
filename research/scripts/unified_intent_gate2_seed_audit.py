#!/usr/bin/env python3
"""Complete outcome-blind seed reservation audit for unified-intent Gate 2."""

from __future__ import annotations

import gzip
import hashlib
import json
import mmap
import os
from pathlib import Path
import subprocess

import action_burst_seed_reservation_audit_v1 as lexical


PROJECT = Path("/nfs/roberts/project/pi_jss233/zc362/chrono_divide")
REPO = PROJECT / "strong-chronodivide-bot"
STUDY = PROJECT / "research-evidence/unified-intent-arbiter-v1/gate-2"
CANDIDATE_BASES = (
    3_330_000_000, 3_340_000_000, 3_350_000_000, 3_360_000_000,
    3_370_000_000, 3_380_000_000, 3_390_000_000, 3_410_000_000,
    3_420_000_000, 3_430_000_000, 3_440_000_000, 3_450_000_000,
    3_460_000_000, 3_470_000_000, 3_480_000_000, 3_490_000_000,
    3_510_000_000, 3_520_000_000, 3_530_000_000, 3_540_000_000,
)
INTERVAL_SIZE = 1_000_000
ROOTS = (PROJECT / "research-evidence", REPO)
PROTOCOL = REPO / "research/protocols/method/2026-09-07-unified-intent-arbiter-v1-gate-2.md"
AMENDMENT = REPO / (
    "research/protocols/method/"
    "2026-09-07-unified-intent-arbiter-v1-gate-2-amendment-a1.md"
)
PROGRAM = Path(__file__).resolve()
TEST = REPO / "research/tests/test_unified_intent_gate2_seed_audit.py"
SLURM = REPO / "research/slurm/unified_intent_gate2_seed_audit.sbatch"
CURRENT = {PROTOCOL, AMENDMENT, PROGRAM, TEST, SLURM}
SKIP_DIRS = {
    ".git", "node_modules", "__pycache__", ".cache", "cache", "assets",
    "private-assets", "data", "dist", ".venv", "venv",
}
TEXT_SUFFIXES = set(lexical.TEXT_SUFFIXES)
GZIP_INNER_SUFFIXES = TEXT_SUFFIXES | {".ndjson", ".jsonl"}
STREAM_CHUNK = 4 * 1024 * 1024
STREAM_OVERLAP = 2_048

lexical.CANDIDATE_BASES = CANDIDATE_BASES
lexical.INTERVAL_SIZE = INTERVAL_SIZE


class Gate2SeedAuditFailure(RuntimeError):
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


def inspect_bytes(data: bytes | mmap.mmap) -> tuple[list[dict], list[dict]]:
    return lexical.inspect_numbers(data)


def inspect_gzip(path: Path) -> tuple[list[dict], list[dict], int]:
    tokens: dict[tuple[int, int, int], dict] = {}
    ranges: dict[tuple[int, str, int, int, int], dict] = {}
    tail = b""
    consumed = 0
    with gzip.open(path, "rb") as handle:
        while True:
            chunk = handle.read(STREAM_CHUNK)
            if not chunk:
                break
            data = tail + chunk
            origin = consumed - len(tail)
            found, declared = inspect_bytes(data)
            for value in found:
                adjusted = {**value, "byteOffset": origin + value["byteOffset"]}
                key = (
                    adjusted["byteOffset"],
                    adjusted["unsignedValue"],
                    adjusted["candidateBase"],
                )
                tokens[key] = adjusted
            for value in declared:
                adjusted = {**value, "byteOffset": origin + value["byteOffset"]}
                key = (
                    adjusted["byteOffset"],
                    adjusted["key"],
                    adjusted["low"],
                    adjusted["high"],
                    adjusted["candidateBase"],
                )
                ranges[key] = adjusted
            consumed += len(chunk)
            tail = data[-STREAM_OVERLAP:]
    return (
        [tokens[key] for key in sorted(tokens)],
        [ranges[key] for key in sorted(ranges)],
        consumed,
    )


def is_gzip_text(path: Path) -> bool:
    return path.suffix.lower() == ".gz" and path.with_suffix("").suffix.lower() in GZIP_INNER_SUFFIXES


def inspect_path_tokens(path: Path) -> tuple[list[dict], list[dict]]:
    return inspect_bytes(str(path).encode())


def candidate_assessments(collisions: list[dict]) -> list[dict]:
    by_base = {base: [] for base in CANDIDATE_BASES}
    for collision in collisions:
        bases = {
            token["candidateBase"]
            for token in collision.get("tokens", [])
        }
        bases.update(
            token["candidateBase"]
            for token in collision.get("pathTokens", [])
        )
        if "range" in collision:
            bases.add(collision["range"]["candidateBase"])
        if "pathRange" in collision:
            bases.add(collision["pathRange"]["candidateBase"])
        for base in bases:
            by_base[base].append(collision)
    first = next((base for base in CANDIDATE_BASES if not by_base[base]), None)
    return [{
        "base": base,
        "interval": [base, base + INTERVAL_SIZE],
        "signedInt32EquivalentInterval": [
            base - 2**32,
            base + INTERVAL_SIZE - 2**32,
        ],
        "collisionRecords": len(by_base[base]),
        "collisionPaths": sorted({
            value["path"] for value in by_base[base]
        }),
        "passed": not by_base[base],
        "selected": base == first,
    } for base in CANDIDATE_BASES]


def main() -> None:
    if os.environ.get("SLURM_JOB_ACCOUNT") != "pi_jss233":
        raise Gate2SeedAuditFailure("pi_jss233 required")
    if os.environ.get("SLURM_JOB_PARTITION") != "day":
        raise Gate2SeedAuditFailure("day partition required")
    if os.environ.get("SLURM_JOB_GPUS") or os.environ.get("SLURM_GPUS"):
        raise Gate2SeedAuditFailure("GPU allocation prohibited")
    source = git("rev-parse", "HEAD")
    if (
        source != os.environ["SOURCE_COMMIT"]
        or git("branch", "--show-current") != "main"
        or git("rev-parse", "fork/main") != source
        or git("status", "--porcelain=v1")
    ):
        raise Gate2SeedAuditFailure("clean synchronized source required")
    for path, environment in [
        (PROGRAM, "PROGRAM_SHA256"),
        (PROTOCOL, "PROTOCOL_SHA256"),
        (AMENDMENT, "AMENDMENT_SHA256"),
    ]:
        if digest(path) != os.environ[environment]:
            raise Gate2SeedAuditFailure(environment + " mismatch")

    output = Path(os.environ["OUT_PATH"])
    if output.parent != STUDY / "seed-audit-v1" or output.exists() or not output.parent.is_dir():
        raise Gate2SeedAuditFailure("fresh Gate 2 audit output required")

    files: list[dict] = []
    collisions: list[dict] = []
    declared_ranges: list[dict] = []
    skipped_extensions: dict[str, int] = {}
    skipped_paths: list[dict] = []
    skipped_symlinks: list[str] = []
    errors: list[dict] = []
    seen: set[Path] = set()

    def walk_error(error: OSError) -> None:
        errors.append({
            "path": str(error.filename),
            "reason": type(error).__name__ + ": " + str(error),
        })

    for root in ROOTS:
        if not root.is_dir() or root.is_symlink():
            errors.append({"path": str(root), "reason": "root missing or symlink"})
            continue
        for parent, directories, names in os.walk(
            root,
            followlinks=False,
            onerror=walk_error,
        ):
            keep = []
            for name in sorted(directories):
                path = Path(parent) / name
                if path == STUDY / "seed-audit-v1" or name in SKIP_DIRS or "node_modules" in name:
                    skipped_paths.append({"path": str(path), "reason": "output-or-bulk-tree"})
                elif path.is_symlink():
                    skipped_symlinks.append(str(path))
                else:
                    keep.append(name)
            directories[:] = keep
            for name in sorted(names):
                path = Path(parent) / name
                if path in CURRENT:
                    skipped_paths.append({"path": str(path), "reason": "current-self-declaration"})
                    continue
                if path in seen:
                    skipped_paths.append({"path": str(path), "reason": "duplicate-path"})
                    continue
                seen.add(path)
                if path.is_symlink():
                    skipped_symlinks.append(str(path))
                    continue
                if (
                    lexical.CREDENTIAL_NAME.search(path.name)
                    or path.name.startswith(".env")
                    or path.name in {".npmrc", ".netrc"}
                ):
                    skipped_paths.append({"path": str(path), "reason": "credential-name"})
                    continue
                plain = path.suffix.lower() in TEXT_SUFFIXES
                compressed = is_gzip_text(path)
                if not plain and not compressed:
                    key = path.suffix.lower() or "(no extension)"
                    skipped_extensions[key] = skipped_extensions.get(key, 0) + 1
                    continue
                try:
                    before = path.stat()
                    if compressed:
                        found, ranges, decompressed_bytes = inspect_gzip(path)
                    else:
                        with path.open("rb") as handle:
                            if before.st_size:
                                with mmap.mmap(handle.fileno(), 0, access=mmap.ACCESS_READ) as data:
                                    found, ranges = inspect_bytes(data)
                            else:
                                found, ranges = [], []
                        decompressed_bytes = None
                    path_found, path_ranges = inspect_path_tokens(path)
                    file_hash = digest(path)
                    after = path.stat()
                    if (
                        before.st_ino,
                        before.st_size,
                        before.st_mtime_ns,
                    ) != (
                        after.st_ino,
                        after.st_size,
                        after.st_mtime_ns,
                    ):
                        raise Gate2SeedAuditFailure("input changed while scanning")
                    files.append({
                        "path": str(path),
                        "bytes": before.st_size,
                        "sha256": file_hash,
                        "gzipDecompressedBytes": decompressed_bytes,
                    })
                    value: dict = {"path": str(path)}
                    if found:
                        value["tokens"] = found
                    if path_found:
                        value["pathTokens"] = path_found
                    if found or path_found:
                        collisions.append(value)
                    for item in ranges:
                        declared_ranges.append({"path": str(path), **item})
                        if item["overlap"]:
                            collisions.append({"path": str(path), "range": item})
                    for item in path_ranges:
                        if item["overlap"]:
                            collisions.append({"path": str(path), "pathRange": item})
                except Exception as error:
                    errors.append({
                        "path": str(path),
                        "reason": type(error).__name__ + ": " + str(error),
                    })

    files.sort(key=lambda value: value["path"])
    collisions.sort(key=lambda value: (value["path"], json.dumps(value, sort_keys=True)))
    assessments = candidate_assessments(collisions)
    selected = next((value for value in assessments if value["selected"]), None)
    passed = bool(files) and not errors and selected is not None
    artifact = {
        "kind": "unified-intent-gate2-seed-audit-v1",
        "complete": True,
        "passed": passed,
        "technicalOnly": True,
        "competitiveFieldsAbsent": True,
        "sourceCommit": source,
        "programSha256": digest(PROGRAM),
        "protocolSha256": digest(PROTOCOL),
        "amendmentSha256": digest(AMENDMENT),
        "scheduler": {
            "jobId": os.environ.get("SLURM_JOB_ID"),
            "account": os.environ.get("SLURM_JOB_ACCOUNT"),
            "partition": os.environ.get("SLURM_JOB_PARTITION"),
        },
        "roots": [str(value) for value in ROOTS],
        "candidateAssessments": assessments,
        "selectedBase": selected["base"] if selected else None,
        "selectedInterval": selected["interval"] if selected else None,
        "totals": {
            "files": len(files),
            "bytes": sum(value["bytes"] for value in files),
            "gzipFiles": sum(value["gzipDecompressedBytes"] is not None for value in files),
            "gzipDecompressedBytes": sum(
                value["gzipDecompressedBytes"] or 0 for value in files
            ),
            "errors": len(errors),
            "collisionRecords": len(collisions),
            "declaredRanges": len(declared_ranges),
        },
        "files": files,
        "collisions": collisions,
        "declaredRanges": declared_ranges,
        "errors": errors,
        "skippedExtensions": dict(sorted(skipped_extensions.items())),
        "skippedPaths": sorted(skipped_paths, key=lambda value: value["path"]),
        "skippedSymlinks": sorted(skipped_symlinks),
    }
    output.write_text(json.dumps(artifact, indent=2, sort_keys=True) + "\n")
    print(json.dumps({
        "complete": True,
        "passed": passed,
        "files": artifact["totals"]["files"],
        "bytes": artifact["totals"]["bytes"],
        "gzipFiles": artifact["totals"]["gzipFiles"],
        "errors": artifact["totals"]["errors"],
        "selectedBase": artifact["selectedBase"],
    }))
    if not passed:
        raise Gate2SeedAuditFailure("no collision-free Gate 2 seed interval")


if __name__ == "__main__":
    main()
