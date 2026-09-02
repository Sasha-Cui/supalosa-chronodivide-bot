#!/usr/bin/env python3
"""Outcome-blind integer-token audit of retained historical text metadata."""
import hashlib
import json
import mmap
import os
from pathlib import Path
import re
import subprocess

ROOT = Path("/nfs/roberts/project/pi_jss233/zc362/chrono_divide")
REPO = ROOT / "strong-chronodivide-bot"
NEW_ROOT = ROOT / "research-evidence/multimap-v2/explicit-census-amendment-2"
ROOTS = [ROOT / "research-evidence", REPO / "research/artifacts",
         REPO / "benchmark-results", REPO / "packages/chronodivide-bot-driver/benchmark-results"]
LOW, HIGH = 3002000000, 3003300000
TEXT_SUFFIXES = {".json", ".jsonl", ".ndjson", ".csv", ".tsv", ".yaml", ".yml",
                 ".toml", ".txt", ".log", ".manifest", ".sha256"}
TOKEN = re.compile(rb"(?<![A-Za-z0-9_])-?[0-9][0-9_]*(?![A-Za-z0-9_])")

def collisions_in(data):
    result = []
    for match in TOKEN.finditer(data):
        raw = match.group().replace(b"_", b"")
        if len(raw) > 12:
            continue
        value = int(raw)
        unsigned = value + 2**32 if value < 0 else value
        if LOW <= unsigned < HIGH:
            result.append({"byteOffset": match.start(), "unsignedValue": unsigned})
    return result

def digest(file):
    h = hashlib.sha256()
    with file.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024*1024), b""):
            h.update(chunk)
    return h.hexdigest()

def git(*args):
    return subprocess.check_output(["git", *args], cwd=str(REPO)).decode().strip()

def main():
    if os.environ.get("SLURM_JOB_ACCOUNT") != "pi_jss233":
        raise RuntimeError("pi_jss233 required")
    commit = git("rev-parse", "HEAD")
    if git("branch", "--show-current") != "main" or git("status", "--porcelain") or git("rev-parse", "fork/main") != commit:
        raise RuntimeError("Clean synchronized main required")
    if commit != os.environ["SOURCE_COMMIT"]:
        raise RuntimeError("Source binding mismatch")
    own = Path(__file__).resolve()
    if digest(own) != os.environ["AUDIT_PROGRAM_SHA256"]:
        raise RuntimeError("Audit program mismatch")
    amendment = REPO / "research/protocols/maps/2026-09-02-multimap-explicit-census-amendment-2.md"
    if digest(amendment) != os.environ["CENSUS_AMENDMENT_SHA256"]:
        raise RuntimeError("Census amendment mismatch")
    out = Path(os.environ["OUT_PATH"])
    if out.exists() or not str(out).startswith(str(NEW_ROOT) + "/"):
        raise RuntimeError("Fresh in-scope output required")
    files, links, skipped, errors, matches = [], [], {}, [], []
    for root in ROOTS:
        if not root.is_dir():
            errors.append({"path": str(root), "reason": "missing historical root"})
            continue
        for parent, directories, names in os.walk(str(root), followlinks=False):
            directories.sort()
            keep = []
            for name in directories:
                p = Path(parent) / name
                if p == NEW_ROOT or name in {".git", "node_modules"}:
                    continue
                if p.is_symlink():
                    links.append(str(p))
                else:
                    keep.append(name)
            directories[:] = keep
            for name in sorted(names):
                p = Path(parent) / name
                if p.is_symlink():
                    links.append(str(p))
                    continue
                suffix = p.suffix.lower()
                if suffix not in TEXT_SUFFIXES:
                    skipped[suffix or "(no extension)"] = skipped.get(suffix or "(no extension)", 0) + 1
                    continue
                try:
                    before = p.stat()
                    with p.open("rb") as handle:
                        if before.st_size:
                            with mmap.mmap(handle.fileno(), 0, access=mmap.ACCESS_READ) as data:
                                found = collisions_in(data)
                        else:
                            found = []
                    sha = digest(p)
                    after = p.stat()
                    if (before.st_ino, before.st_size, before.st_mtime_ns) != (after.st_ino, after.st_size, after.st_mtime_ns):
                        raise RuntimeError("file changed during scan")
                    files.append({"path": str(p), "bytes": before.st_size, "sha256": sha})
                    if found:
                        matches.append({"path": str(p), "tokens": found})
                except Exception as error:
                    errors.append({"path": str(p), "reason": type(error).__name__ + ": " + str(error)})
    passed = not errors and not matches and len(files) > 0
    artifact = {"kind": "multimap-v2-seed-reservation-audit", "complete": True, "passed": passed,
                "outcomeFree": True, "sourceCommit": commit, "programSha256": digest(own),
                "censusAmendmentSha256": digest(amendment), "schedulerAccount": "pi_jss233",
                "schedulerJobId": os.environ["SLURM_JOB_ID"], "reservedInterval": [LOW, HIGH],
                "coverageRoots": [str(p) for p in ROOTS], "excludedNewRoot": str(NEW_ROOT),
                "scannedFileCount": len(files), "scannedBytes": sum(f["bytes"] for f in files),
                "scannedFiles": files, "skippedSymlinks": sorted(set(links)),
                "skippedExtensions": skipped, "errors": errors, "collisions": matches}
    with out.open("x") as handle:
        json.dump(artifact, handle, indent=2)
        handle.write("\n")
    print(json.dumps({"complete": True, "passed": passed, "scannedFiles": len(files),
                      "errors": len(errors), "collisions": len(matches)}))
    if not passed:
        raise SystemExit(2)

if __name__ == "__main__":
    main()
