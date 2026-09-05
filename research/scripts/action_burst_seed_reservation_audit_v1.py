#!/usr/bin/env python3
"""Outcome-blind lexical seed reservation audit for action-burst V1."""

from __future__ import annotations

import bisect
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
CANDIDATE_BASES = (
    3_010_000_000, 3_020_000_000, 3_030_000_000, 3_040_000_000,
    3_050_000_000, 3_060_000_000, 3_070_000_000, 3_080_000_000,
    3_090_000_000, 3_120_000_000, 3_130_000_000, 3_140_000_000,
    3_150_000_000, 3_160_000_000, 3_170_000_000, 3_180_000_000,
    3_190_000_000, 3_210_000_000, 3_220_000_000, 3_230_000_000,
    3_240_000_000, 3_250_000_000, 3_260_000_000, 3_270_000_000,
    3_280_000_000, 3_290_000_000,
)
INTERVAL_SIZE = 1_000_000
LOW, HIGH = CANDIDATE_BASES[0], CANDIDATE_BASES[0] + INTERVAL_SIZE
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
    REPO / "research/protocols/method/2026-09-05-outcome-blind-action-burst-diagnostic-v1-amendment-a1.md",
    REPO / "research/protocols/method/2026-09-05-outcome-blind-action-burst-diagnostic-v1-amendment-a2.md",
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


def overlap(
    low: int | None,
    high: int | None,
    candidate_low: int = LOW,
    candidate_high: int = HIGH,
) -> bool:
    if low is None or high is None:
        return False
    if low <= high:
        return low < candidate_high and high > candidate_low
    return low < candidate_high or high > candidate_low


def candidate_for(value: int | None) -> int | None:
    if value is None:
        return None
    index = bisect.bisect_right(CANDIDATE_BASES, value) - 1
    if index >= 0 and value < CANDIDATE_BASES[index] + INTERVAL_SIZE:
        return CANDIDATE_BASES[index]
    return None


def inspect_numbers(data: bytes | mmap.mmap) -> tuple[list[dict], list[dict]]:
    matches, ranges = [], []
    for token in TOKEN.finditer(data):
        value = unsigned(integer(token.group(1)))
        base = candidate_for(value)
        if base is not None:
            matches.append({
                "byteOffset": token.start(1),
                "unsignedValue": value,
                "signedInt32Equivalent": value - 2**32,
                "candidateBase": base,
            })
    raw_ranges = []
    for match in ARRAY_RANGE.finditer(data):
        raw_ranges.append({
            "byteOffset": match.start(),
            "key": match.group(1).decode(),
            "low": unsigned(integer(match.group(2))),
            "high": unsigned(integer(match.group(3))),
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
            raw_ranges.append({
                "byteOffset": match.start(),
                "key": match.group(1).decode(),
                "low": low,
                "high": high,
                "interpretation": "explicit-range-object",
            })
    for value in raw_ranges:
        for base in CANDIDATE_BASES:
            if overlap(value["low"], value["high"], base, base + INTERVAL_SIZE):
                ranges.append({
                    **value,
                    "overlap": True,
                    "candidateBase": base,
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
    amendment = next(path for path in CURRENT if path.name.endswith("amendment-a1.md"))
    amendment_a2 = next(path for path in CURRENT if path.name.endswith("amendment-a2.md"))
    if source != os.environ["SOURCE_COMMIT"]:
        raise AuditFailure("source commit mismatch")
    if digest(own) != os.environ["PROGRAM_SHA256"]:
        raise AuditFailure("program hash mismatch")
    if digest(protocol) != os.environ["PROTOCOL_SHA256"]:
        raise AuditFailure("protocol hash mismatch")
    if digest(amendment) != os.environ["AMENDMENT_SHA256"]:
        raise AuditFailure("amendment hash mismatch")
    if digest(amendment_a2) != os.environ["AMENDMENT_A2_SHA256"]:
        raise AuditFailure("amendment A2 hash mismatch")

    output = Path(os.environ["OUT_PATH"])
    if output.exists() or output.parent != STUDY / "seed-audit-v1-a2" or not output.parent.is_dir():
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
    collision_by_base = {base: [] for base in CANDIDATE_BASES}
    for collision in collisions:
        bases = {
            token["candidateBase"] for token in collision.get("tokens", [])
        }
        if "range" in collision:
            bases.add(collision["range"]["candidateBase"])
        for base in bases:
            collision_by_base[base].append(collision)
    selected_base = next(
        (base for base in CANDIDATE_BASES if not collision_by_base[base]),
        None,
    )
    passed = bool(files) and not errors and selected_base is not None
    candidate_assessments = [{
        "base": base,
        "interval": [base, base + INTERVAL_SIZE],
        "signedInt32EquivalentInterval": [
            base - 2**32, base + INTERVAL_SIZE - 2**32,
        ],
        "collisionRecords": len(collision_by_base[base]),
        "collisionPaths": sorted({
            collision["path"] for collision in collision_by_base[base]
        }),
        "passed": not collision_by_base[base],
        "selected": base == selected_base,
    } for base in CANDIDATE_BASES]
    artifact = {
        "kind": "action-burst-seed-reservation-audit-v1-a2",
        "complete": True,
        "passed": passed,
        "outcomeFree": True,
        "sourceCommit": source,
        "programSha256": digest(own),
        "protocolSha256": digest(protocol),
        "amendmentSha256": digest(amendment),
        "amendmentA2Sha256": digest(amendment_a2),
        "scheduler": {
            "jobId": os.environ["SLURM_JOB_ID"],
            "account": os.environ["SLURM_JOB_ACCOUNT"],
            "partition": os.environ["SLURM_JOB_PARTITION"],
        },
        "orderedCandidateIntervals": candidate_assessments,
        "selectedInterval": (
            [selected_base, selected_base + INTERVAL_SIZE]
            if selected_base is not None else None
        ),
        "selectedSignedInt32EquivalentInterval": (
            [selected_base - 2**32, selected_base + INTERVAL_SIZE - 2**32]
            if selected_base is not None else None
        ),
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
        "selectionRule": "first-zero-collision-candidate-in-frozen-order",
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
        "collisionRecords": len(collisions),
        "selectedInterval": artifact["selectedInterval"],
    }, sort_keys=True))
    if not passed:
        raise SystemExit(2)


if __name__ == "__main__":
    main()
