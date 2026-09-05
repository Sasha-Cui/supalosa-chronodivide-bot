#!/usr/bin/env python3
"""Outcome-blind lexical seed reservation audit for action-burst V1."""

from __future__ import annotations

import hashlib
import json
import mmap
import os
from pathlib import Path
import re
import subprocess


PROJECT = Path("/nfs/roberts/project/pi_jss233/zc362/chrono_divide")
REPO = PROJECT / "strong-chronodivide-bot"
STUDY = PROJECT / "research-evidence/action-burst-diagnostic-v1"
LOW, HIGH = 4_100_000_000, 4_101_000_000
ROOTS = [
    PROJECT / "research-evidence",
    REPO,
]
TEXT_SUFFIXES = {
    ".json", ".jsonl", ".ndjson", ".csv", ".tsv", ".yaml", ".yml", ".toml",
    ".txt", ".log", ".out", ".err", ".stdout", ".stderr", ".manifest",
    ".sha256", ".seed", ".md", ".ts", ".mjs", ".js", ".py", ".sh", ".sbatch",
}
SKIP_DIRS = {
    ".git", "node_modules", "__pycache__", ".cache", "cache", "assets",
    "private-assets", "data", "dist", ".venv", "venv",
}
CREDENTIAL_NAME = re.compile(
    r"(^|[-_.])(auth|credentials?|secrets?|tokens?|password|api[_-]?key)([-_.]|$)",
    re.I,
)
CURRENT = {
    REPO / "research/protocols/method/2026-09-05-outcome-blind-action-burst-diagnostic-v1.md",
    REPO / "research/scripts/action_burst_seed_reservation_audit_v1.py",
    REPO / "research/tests/test_action_burst_seed_reservation_audit_v1.py",
    REPO / "research/slurm/action_burst_seed_reservation_audit_v1.sbatch",
}
NUMBER = rb"-?(?:0[xX][0-9a-fA-F_]+|[0-9]{1,3}(?:,[0-9]{3})+|[0-9][0-9_]*)"
TOKEN = re.compile(rb"(?<![A-Za-z0-9_.])(" + NUMBER + rb")(?![A-Za-z0-9_.])")
RANGE_KEY = rb"(?:reservedInterval|reservedRange|reservedSeedRange|seedInterval|seedRange|seedNamespace)"
ARRAY_RANGE = re.compile(
    rb"""["']?(""" + RANGE_KEY + rb""")["']?\s*[:=]\s*[\[(]\s*("""
    + NUMBER + rb""")\s*,\s*(""" + NUMBER + rb""")\s*[\])]""",
    re.I,
)
OBJECT_RANGE = re.compile(
    rb"""["']?(""" + RANGE_KEY + rb""")["']?\s*[:=]\s*\{([^{}]{0,600})\}""",
    re.I,
)
LOW_FIELD = re.compile(
    rb"""["']?(minimum|min|low|lower|start)["']?\s*:\s*(""" + NUMBER + rb")",
    re.I,
)
HIGH_FIELD = re.compile(
    rb"""["']?(maximumExclusive|maxExclusive|endExclusive|upperExclusive|maximum|max|high|upper|end)["']?\s*:\s*("""
    + NUMBER + rb")",
    re.I,
)


class AuditFailure(RuntimeError):
    pass


def integer(raw: bytes) -> int | None:
    text = raw.decode().replace("_", "").replace(",", "")
    if len(text.lstrip("-")) > 12:
        return None
    try:
        return int(text, 16 if "0x" in text.lower() else 10)
    except ValueError:
        return None


def unsigned(value: int | None) -> int | None:
    if value is None:
        return None
    if -(2**31) <= value < 0:
        return value + 2**32
    return value if 0 <= value <= 2**32 else None


def overlap(low: int | None, high: int | None) -> bool:
    if low is None or high is None:
        return False
    if low <= high:
        return low < HIGH and high > LOW
    return low < HIGH or high > LOW


def inspect_numbers(data: bytes | mmap.mmap) -> tuple[list[dict], list[dict]]:
    matches, ranges = [], []
    for token in TOKEN.finditer(data):
        value = unsigned(integer(token.group(1)))
        if value is not None and LOW <= value < HIGH:
            matches.append({
                "byteOffset": token.start(1),
                "unsignedValue": value,
                "signedInt32Equivalent": value - 2**32,
            })
    for match in ARRAY_RANGE.finditer(data):
        low = unsigned(integer(match.group(2)))
        high = unsigned(integer(match.group(3)))
        ranges.append({
            "byteOffset": match.start(),
            "key": match.group(1).decode(),
            "low": low,
            "high": high,
            "overlap": overlap(low, high),
            "interpretation": "half-open-or-conservative-array",
        })
    for match in OBJECT_RANGE.finditer(data):
        low_match = LOW_FIELD.search(match.group(2))
        high_match = HIGH_FIELD.search(match.group(2))
        if low_match and high_match:
            low = unsigned(integer(low_match.group(2)))
            high = unsigned(integer(high_match.group(2)))
            exclusive = b"exclusive" in high_match.group(1).lower()
            if high is not None and not exclusive:
                high += 1
            ranges.append({
                "byteOffset": match.start(),
                "key": match.group(1).decode(),
                "low": low,
                "high": high,
                "overlap": overlap(low, high),
                "interpretation": "explicit-range-object",
            })
    return matches, ranges


def digest(path: Path) -> str:
    value = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            value.update(chunk)
    return value.hexdigest()


def git(*arguments: str) -> str:
    return subprocess.run(
        ["git", *arguments], cwd=REPO, check=True, text=True, capture_output=True,
    ).stdout.strip()


def main() -> None:
    if os.environ.get("SLURM_JOB_ACCOUNT") != "pi_jss233":
        raise AuditFailure("pi_jss233 required")
    if os.environ.get("SLURM_JOB_PARTITION") != "day":
        raise AuditFailure("day partition required")
    if os.environ.get("SLURM_JOB_GPUS") or os.environ.get("SLURM_GPUS"):
        raise AuditFailure("GPU allocation prohibited")

    source = git("rev-parse", "HEAD")
    if (
        git("branch", "--show-current") != "main"
        or git("status", "--porcelain=v1")
        or git("rev-parse", "fork/main") != source
    ):
        raise AuditFailure("clean synchronized main required")
    own = Path(__file__).resolve()
    protocol = next(path for path in CURRENT if path.name.endswith("diagnostic-v1.md"))
    if source != os.environ["SOURCE_COMMIT"]:
        raise AuditFailure("source commit mismatch")
    if digest(own) != os.environ["PROGRAM_SHA256"]:
        raise AuditFailure("program hash mismatch")
    if digest(protocol) != os.environ["PROTOCOL_SHA256"]:
        raise AuditFailure("protocol hash mismatch")

    output = Path(os.environ["OUT_PATH"])
    if output.exists() or output.parent != STUDY / "seed-audit-v1" or not output.parent.is_dir():
        raise AuditFailure("fresh in-scope output required")

    files: list[dict] = []
    skipped_extensions: dict[str, int] = {}
    skipped_paths: list[dict] = []
    skipped_symlinks: list[str] = []
    errors: list[dict] = []
    collisions: list[dict] = []
    declared_ranges: list[dict] = []
    seen: set[Path] = set()

    def skip_extension(path: Path) -> None:
        key = path.suffix.lower() or "(no extension)"
        skipped_extensions[key] = skipped_extensions.get(key, 0) + 1

    def walk_error(error: OSError) -> None:
        errors.append({
            "path": str(error.filename),
            "reason": f"{type(error).__name__}: {error}",
        })

    for root in ROOTS:
        if not root.is_dir() or root.is_symlink():
            errors.append({"path": str(root), "reason": "root missing or symlink"})
            continue
        for parent, directories, names in os.walk(root, followlinks=False, onerror=walk_error):
            keep = []
            for name in sorted(directories):
                path = Path(parent) / name
                if path == STUDY or name in SKIP_DIRS or "node_modules" in name:
                    skipped_paths.append({
                        "path": str(path),
                        "reason": "current-study-or-dependency-asset-tree",
                    })
                elif path.is_symlink():
                    skipped_symlinks.append(str(path))
                else:
                    keep.append(name)
            directories[:] = keep
            for name in sorted(names):
                path = Path(parent) / name
                if path in CURRENT:
                    skipped_paths.append({"path": str(path), "reason": "current-study-source"})
                    continue
                if path in seen:
                    skipped_paths.append({"path": str(path), "reason": "duplicate-path"})
                    continue
                seen.add(path)
                if path.is_symlink():
                    skipped_symlinks.append(str(path))
                    continue
                if CREDENTIAL_NAME.search(path.name) or path.name.startswith(".env") or path.name in {".npmrc", ".netrc"}:
                    skipped_paths.append({"path": str(path), "reason": "credential-name"})
                    continue
                if path.suffix.lower() not in TEXT_SUFFIXES:
                    skip_extension(path)
                    continue
                try:
                    before = path.stat()
                    with path.open("rb") as handle:
                        if before.st_size:
                            with mmap.mmap(handle.fileno(), 0, access=mmap.ACCESS_READ) as data:
                                found, ranges = inspect_numbers(data)
                        else:
                            found, ranges = [], []
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
                        raise AuditFailure("input changed while scanning")
                    files.append({
                        "path": str(path),
                        "bytes": before.st_size,
                        "sha256": file_hash,
                    })
                    if found:
                        collisions.append({"path": str(path), "tokens": found})
                    for value in ranges:
                        declared_ranges.append({"path": str(path), **value})
                        if value["overlap"]:
                            collisions.append({"path": str(path), "range": value})
                except Exception as error:
                    errors.append({
                        "path": str(path),
                        "reason": f"{type(error).__name__}: {error}",
                    })

    files.sort(key=lambda value: value["path"])
    passed = bool(files) and not errors and not collisions
    artifact = {
        "kind": "action-burst-seed-reservation-audit-v1",
        "complete": True,
        "passed": passed,
        "outcomeFree": True,
        "sourceCommit": source,
        "programSha256": digest(own),
        "protocolSha256": digest(protocol),
        "scheduler": {
            "jobId": os.environ["SLURM_JOB_ID"],
            "account": os.environ["SLURM_JOB_ACCOUNT"],
            "partition": os.environ["SLURM_JOB_PARTITION"],
        },
        "reservedInterval": [LOW, HIGH],
        "signedInt32EquivalentInterval": [LOW - 2**32, HIGH - 2**32],
        "coverageRoots": [str(path) for path in ROOTS],
        "currentStudyRootExcluded": str(STUDY),
        "currentStudySourcesExcluded": sorted(str(path) for path in CURRENT),
        "scannedFileCount": len(files),
        "scannedBytes": sum(value["bytes"] for value in files),
        "scannedFiles": files,
        "skippedExtensions": dict(sorted(skipped_extensions.items())),
        "skippedPaths": skipped_paths,
        "skippedSymlinks": sorted(set(skipped_symlinks)),
        "declaredRanges": declared_ranges,
        "errors": errors,
        "collisions": collisions,
        "coverageLimit": (
            "Lexical scan of retained text-like files only. Dependency, asset, binary, "
            "compressed, credential-named, symlink-target, inaccessible, and off-tree "
            "archive bytes are excluded. Numeric tokens are inspected without parsing "
            "or interpreting competitive outcomes."
        ),
    }
    with output.open("x") as handle:
        json.dump(artifact, handle, indent=2, sort_keys=True)
        handle.write("\n")
    print(json.dumps({
        "complete": True,
        "passed": passed,
        "scannedFiles": len(files),
        "scannedBytes": artifact["scannedBytes"],
        "errors": len(errors),
        "collisions": len(collisions),
    }, sort_keys=True))
    if not passed:
        raise SystemExit(2)


if __name__ == "__main__":
    main()
