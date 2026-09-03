#!/usr/bin/env python3
"""Seed-only retained-metadata audit; never opens raw competitive result files."""
import hashlib
import json
import mmap
import os
from pathlib import Path
import re
import subprocess

PROJECT = Path("/nfs/roberts/project/pi_jss233/zc362/chrono_divide")
REPO = PROJECT / "strong-chronodivide-bot"
STUDY = PROJECT / "research-evidence/fresh-dual-endpoint-v1"
LOW, HIGH = 3765000000, 3770000000
METADATA_ROOTS = [PROJECT / "research-evidence", REPO / "research/artifacts",
                  REPO / "benchmark-results", REPO / "packages/chronodivide-bot-driver/benchmark-results"]
SOURCE_ROOTS = [REPO / "research/protocols", REPO / "research/runtime", REPO / "research/scripts",
                REPO / "research/slurm", REPO / "packages/chronodivide-bot-driver/src/training"]
META_SUFFIXES = {".json", ".jsonl", ".ndjson", ".yaml", ".yml", ".toml", ".txt", ".manifest", ".csv", ".tsv", ".seed"}
SOURCE_SUFFIXES = {".md", ".ts", ".mjs", ".js", ".py", ".sh", ".sbatch"}
CREDENTIAL_NAME = re.compile(r"(^|[-_.])(auth|credentials?|secrets?|tokens?|password|api[_-]?key)([-_.]|$)", re.I)
META_NAME = re.compile(r"manifest|select(?:ion|ed)?|reserv(?:ation|ed)|schedule|config|plan|param|seed|campaign|allocation|inventory|registry|population", re.I)
OUTCOME_NAME = re.compile(r"(^|[-_.])(case|cell|trace|result|outcome|aggregate|summary|metric|score|winner)s?([-_.]|$)", re.I)
SKIP_DIRS = {".git", "node_modules", "__pycache__", ".cache", "cache", "assets", "private-assets", "data", "dist", ".venv", "venv"}
CURRENT = [
 "research/protocols/maps/2026-09-03-fresh-dual-endpoint-remeasurement-v1.md",
 "research/protocols/maps/2026-09-03-fresh-dual-endpoint-seed-amendment-a1.md",
 "research/protocols/maps/2026-09-03-fresh-dual-seed-audit-scope-v1.md",
 "research/runtime/fresh-dual-endpoint-plan-v1.mjs", "research/runtime/fresh-dual-inputs-v1.mjs",
 "research/scripts/prepare-fresh-dual-study-v1.mjs", "research/scripts/fresh_dual_seed_reservation_audit_v1.py",
 "research/scripts/test_fresh_dual_seed_reservation_audit_v1.py", "research/scripts/fresh-dual-selector-v1.mjs",
 "research/slurm/fresh_dual_seed_audit_v1.sbatch", "research/slurm/fresh_dual_selector_v1.sbatch",
]
EXCLUDED = {REPO / p for p in CURRENT}
NUMBER = rb"-?(?:0[xX][0-9a-fA-F_]+|[0-9]{1,3}(?:,[0-9]{3})+|[0-9][0-9_]*)"
TOKEN = re.compile(rb"(?<![A-Za-z0-9_.])(" + NUMBER + rb")(?![A-Za-z0-9_.])")
RANGE_KEY = rb"(?:reservedInterval|reservedRange|reservedSeedRange|seedInterval|seedRange|seedNamespace)"
ARRAY_RANGE = re.compile(rb"""["']?(""" + RANGE_KEY + rb""")["']?\s*[:=]\s*[\[(]\s*(""" + NUMBER + rb""")\s*,\s*(""" + NUMBER + rb""")\s*[\])]""", re.I)
OBJECT_RANGE = re.compile(rb"""["']?(""" + RANGE_KEY + rb""")["']?\s*[:=]\s*\{([^{}]{0,600})\}""", re.I)
LOW_FIELD = re.compile(rb"""["']?(minimum|min|low|lower|start)["']?\s*:\s*(""" + NUMBER + rb")", re.I)
HIGH_FIELD = re.compile(rb"""["']?(maximumExclusive|maxExclusive|endExclusive|upperExclusive|maximum|max|high|upper|end)["']?\s*:\s*(""" + NUMBER + rb")", re.I)

def integer(raw):
    text = raw.decode().replace("_", "").replace(",", "")
    if len(text.lstrip("-")) > 12:
        return None
    try:
        return int(text, 16 if "0x" in text.lower() else 10)
    except ValueError:
        return None

def unsigned(value):
    if value is None:
        return None
    if -2**31 <= value < 0:
        return value + 2**32
    return value if 0 <= value <= 2**32 else None

def metadata_reason(path):
    suffix = path.suffix.lower()
    if CREDENTIAL_NAME.search(path.name) or path.name.startswith(".env") or path.name in {".npmrc", ".netrc"}:
        return "credential-name"
    if suffix not in META_SUFFIXES:
        return "extension:" + (suffix or "(none)")
    if suffix == ".seed":
        return None
    if re.match(r"^(?:selected|selection|planned|plan|manifest)[-_]cases\.(?:json|jsonl|ndjson|csv|tsv)$", path.name, re.I):
        return None
    if OUTCOME_NAME.search(path.name):
        return "raw-outcome-name"
    return None if META_NAME.search(path.stem) else "non-metadata-name"

def overlap(low, high):
    if low is None or high is None:
        return False
    if low <= high:
        return low < HIGH and high > LOW
    return low < HIGH or high > LOW  # Wrapped unsigned interval: conservative.

def inspect_numbers(data, exact_seeds):
    matches, ranges = [], []
    for token in TOKEN.finditer(data):
        n = unsigned(integer(token.group(1)))
        if n is not None and LOW <= n < HIGH:
            matches.append({"byteOffset": token.start(1), "unsignedValue": n, "exactPlannedSeed": n in exact_seeds})
    for match in ARRAY_RANGE.finditer(data):
        low, high = unsigned(integer(match.group(2))), unsigned(integer(match.group(3)))
        ranges.append({"byteOffset": match.start(), "key": match.group(1).decode(), "low": low, "high": high,
                       "overlap": overlap(low, high), "interpretation": "half-open-or-conservative-array"})
    for match in OBJECT_RANGE.finditer(data):
        low_match, high_match = LOW_FIELD.search(match.group(2)), HIGH_FIELD.search(match.group(2))
        if low_match and high_match:
            low, high = unsigned(integer(low_match.group(2))), unsigned(integer(high_match.group(2)))
            exclusive = b"exclusive" in high_match.group(1).lower()
            if high is not None and not exclusive:
                high += 1
            ranges.append({"byteOffset": match.start(), "key": match.group(1).decode(), "low": low, "high": high,
                           "overlap": overlap(low, high), "interpretation": "explicit-range-object"})
    return matches, ranges

def digest(path):
    h = hashlib.sha256()
    with path.open("rb") as handle:
        for part in iter(lambda: handle.read(1024 * 1024), b""):
            h.update(part)
    return h.hexdigest()

def git(*args):
    return subprocess.check_output(["git", *args], cwd=str(REPO)).decode().strip()

def main():
    if os.environ.get("SLURM_JOB_ACCOUNT") != "pi_jss233":
        raise RuntimeError("pi_jss233 required")
    source = git("rev-parse", "HEAD")
    if git("branch", "--show-current") != "main" or git("status", "--porcelain") or git("rev-parse", "fork/main") != source:
        raise RuntimeError("Clean synchronized main required")
    own = Path(__file__).resolve()
    if source != os.environ["SOURCE_COMMIT"] or digest(own) != os.environ["AUDIT_PROGRAM_SHA256"]:
        raise RuntimeError("Source/program mismatch")
    scope = REPO / "research/protocols/maps/2026-09-03-fresh-dual-seed-audit-scope-v1.md"
    if digest(scope) != os.environ["AUDIT_SCOPE_SHA256"]:
        raise RuntimeError("Scope mismatch")
    plan_path = STUDY / "plan.json"
    if digest(plan_path) != os.environ["PLAN_FILE_SHA256"]:
        raise RuntimeError("Plan mismatch")
    prepared = json.loads(plan_path.read_text())
    if prepared["sourceCommit"] != source or prepared["plan"]["counts"]["uniqueSeeds"] != 1084:
        raise RuntimeError("Plan identity mismatch")
    exact_seeds = set(prepared["plan"]["uniqueSeeds"])
    if len(exact_seeds) != 1084 or not all(LOW <= s < HIGH for s in exact_seeds):
        raise RuntimeError("Planned seed set invalid")
    out = Path(os.environ["OUT_PATH"])
    if out.exists() or out.parent != STUDY / "audit":
        raise RuntimeError("New in-scope output required")
    files, skipped, links, excluded_paths, errors, collisions, declared_ranges, source_literals = [], {}, [], [], [], [], [], []
    seen = set()
    def skip(reason):
        skipped[reason] = skipped.get(reason, 0) + 1
    for root, source_mode in [(p, False) for p in METADATA_ROOTS] + [(p, True) for p in SOURCE_ROOTS]:
        if not root.is_dir() or root.is_symlink():
            errors.append({"path": str(root), "reason": "root missing or symlink"}); continue
        for parent, directories, names in os.walk(root, followlinks=False):
            keep = []
            for name in sorted(directories):
                p = Path(parent) / name
                if p == STUDY or name in SKIP_DIRS or "node_modules" in name or "environment-snapshot" in name:
                    excluded_paths.append({"path": str(p), "reason": "current-study-or-dependency-asset-tree"}); continue
                if p.is_symlink():
                    links.append(str(p)); continue
                keep.append(name)
            directories[:] = keep
            for name in sorted(names):
                p = Path(parent) / name
                if p in EXCLUDED:
                    excluded_paths.append({"path": str(p), "reason": "current-study-source"}); continue
                if source_mode:
                    reason = None if p.suffix.lower() in SOURCE_SUFFIXES and ".test." not in name and not name.startswith("test_") else "non-declaration-source"
                else:
                    reason = metadata_reason(p)
                if reason:
                    skip(reason); continue
                if p in seen:
                    skip("duplicate-path"); continue
                seen.add(p)
                if p.is_symlink():
                    links.append(str(p)); continue
                try:
                    before = p.stat()
                    with p.open("rb") as handle:
                        if before.st_size:
                            with mmap.mmap(handle.fileno(), 0, access=mmap.ACCESS_READ) as data:
                                found, ranges = inspect_numbers(data, exact_seeds)
                                if source_mode:
                                    for line_no, line in enumerate(bytes(data).splitlines(), 1):
                                        if re.search(rb"seed|namespace|reserv|stride", line, re.I):
                                            values = sorted({v for token in TOKEN.finditer(line) for v in [unsigned(integer(token.group(1)))] if v is not None and v >= 1000000000})
                                            if values:
                                                source_literals.append({"path": str(p), "line": line_no, "values": values})
                        else:
                            found, ranges = [], []
                    sha = digest(p)
                    after = p.stat()
                    if (before.st_ino, before.st_size, before.st_mtime_ns) != (after.st_ino, after.st_size, after.st_mtime_ns):
                        raise RuntimeError("input changed while scanning")
                    files.append({"path": str(p), "bytes": before.st_size, "sha256": sha, "sourceDeclaration": source_mode})
                    if found:
                        collisions.append({"path": str(p), "tokens": found})
                    for r in ranges:
                        declared_ranges.append({"path": str(p), **r})
                        if r["overlap"]:
                            collisions.append({"path": str(p), "range": r})
                except Exception as error:
                    errors.append({"path": str(p), "reason": type(error).__name__ + ": " + str(error)})
    reviewed_names = ["methodV3Stage2Schedule.ts", "methodV6EconomicStartGate.ts", "methodV5Campaign.ts",
                      "terminalObjectiveBaselineEquivalence.ts", "terminalObjectiveAllCountrySmoke.ts", "terminalObjectiveCampaign.ts"]
    reviews = [{"path": str(REPO / "packages/chronodivide-bot-driver/src/training" / n),
                "sha256": digest(REPO / "packages/chronodivide-bot-driver/src/training" / n)} for n in reviewed_names]
    passed = bool(files) and not errors and not collisions
    artifact = {"kind": "fresh-dual-seed-reservation-audit-v1", "complete": True, "passed": passed, "outcomeFree": True,
        "sourceCommit": source, "programSha256": digest(own), "scopeSha256": digest(scope), "planFileSha256": digest(plan_path),
        "planSha256": prepared["planSha256"], "schedulerAccount": "pi_jss233", "schedulerJobId": os.environ["SLURM_JOB_ID"],
        "reservedInterval": [LOW, HIGH], "exactPlannedSeedCount": len(exact_seeds), "exactPlannedSeeds": sorted(exact_seeds),
        "metadataRoots": [str(p) for p in METADATA_ROOTS], "sourceRoots": [str(p) for p in SOURCE_ROOTS],
        "scannedFileCount": len(files), "scannedBytes": sum(f["bytes"] for f in files), "scannedFiles": files,
        "skippedReasons": skipped, "skippedSymlinks": sorted(set(links)), "excludedPaths": excluded_paths,
        "declaredRanges": declared_ranges, "sourceSeedLiteralInventory": source_literals, "reviewedDeclarationSources": reviews,
        "sourceReviewDerivations": {"methodV3Stage2Schedule": "3300M + run[0..4]*10M + stage[0..2]*1M; 3900M recovery namespace is separate",
            "methodV6EconomicStartGate": "3690M plus sequential current family/country/slot index; arbitrary future family counts are not covered",
            "methodV5Campaign": "3730M plus 19*9 finite shard indices", "terminalObjectiveBaselineEquivalence": "3740M plus 9*2 country/slot indices",
            "terminalObjectiveAllCountrySmoke": "3745M plus 9*2 country/slot indices", "terminalObjectiveCampaign": "3770M plus nonnegative indices from ten families, two seed blocks, nine countries"}, "errors": errors, "collisions": collisions,
        "coverageLimit": "Retained metadata filenames and source declarations only; no raw game outcomes, generic event logs, archives, replay streams, credentials or symlink targets were opened. Not a proof across all historical bytes or arbitrary symbolic expressions."}
    with out.open("x") as handle:
        json.dump(artifact, handle, indent=2); handle.write("\n")
    print(json.dumps({"complete": True, "passed": passed, "files": len(files), "bytes": artifact["scannedBytes"],
                      "errors": len(errors), "collisions": len(collisions)}))
    if not passed:
        raise SystemExit(2)

if __name__ == "__main__":
    main()
