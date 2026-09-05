#!/usr/bin/env python3
"""Validate the append-only Chrono Divide experiment ledger V2."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
import re
import sys
from typing import Any, Sequence


TOP_KEYS = {
    "schemaVersion", "entryId", "recordedAt", "studyId", "componentId",
    "method", "purpose", "executionState", "integrityState",
    "scientificDecision", "outcomeAccessClass", "claimClass",
    "claimEligible", "source", "comparators", "population", "scheduler",
    "artifacts", "results", "relationships", "advancement", "limitations",
}
SOURCE_KEYS = {
    "gitCommit", "runtimeSha256", "analysisGitCommit", "analysisProgramSha256",
}
COMPARATOR_KEYS = {"id", "ancestry", "gitCommit", "runtimeSha256"}
POPULATION_KEYS = {
    "expectedLaunches", "accountedLaunches", "unit", "manifestSha256",
    "maps", "countries", "notes",
}
SCHEDULER_KEYS = {"account", "partition", "jobs"}
JOB_KEYS = {
    "jobId", "role", "state", "exitCode", "expectedTasks", "accountedTasks",
}
ARTIFACT_KEYS = {"path", "sha256", "bytes", "kind"}
RELATIONSHIP_KEYS = {"supersedes", "derivedFrom"}
ADVANCEMENT_KEYS = {"decision", "nextMilestone"}
EXECUTION_STATES = {"planned", "running", "completed", "failed", "cancelled", "superseded"}
INTEGRITY_STATES = {"unverified", "passed", "failed", "not-applicable"}
SCIENTIFIC_DECISIONS = {
    "not-evaluated", "positive", "negative", "mixed", "descriptive-only",
    "technical-pass", "technical-failure",
}
ACCESS_CLASSES = {
    "outcome-blind", "permanently-open-technical", "open-development",
    "sealed-development", "sealed-confirmatory", "mixed-complete-population",
    "legacy-unknown",
}
CLAIM_CLASSES = {
    "none", "technical", "development", "descriptive",
    "within-map-reliable", "confirmatory-negative",
}
HASH = re.compile(r"^[0-9a-f]{64}$")
COMMIT = re.compile(r"^[0-9a-f]{40}$")
TIMESTAMP = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$")


class LedgerError(RuntimeError):
    pass


def require(condition: bool, message: str) -> None:
    if not condition:
        raise LedgerError(message)


def canonical(value: Any) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def exact_keys(value: Any, keys: set[str], label: str) -> None:
    require(isinstance(value, dict), f"{label} must be an object")
    require(set(value) == keys, f"{label} keys differ: {set(value) ^ keys}")


def nullable_hash(value: Any, pattern: re.Pattern[str], label: str) -> None:
    require(value is None or (isinstance(value, str) and pattern.fullmatch(value)),
            f"{label} is not null or a valid hash")


def nonnegative_nullable_integer(value: Any, label: str) -> None:
    require(
        value is None or (
            isinstance(value, int) and not isinstance(value, bool) and value >= 0
        ),
        f"{label} must be a nonnegative integer or null",
    )


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def validate_entry(entry: dict[str, Any], verify_artifacts: bool) -> None:
    exact_keys(entry, TOP_KEYS, "entry")
    require(entry["schemaVersion"] == 2, "schemaVersion must be 2")
    for key in ("entryId", "studyId", "componentId", "method", "purpose"):
        require(isinstance(entry[key], str) and entry[key], f"{key} must be nonempty")
    require(isinstance(entry["recordedAt"], str) and TIMESTAMP.fullmatch(entry["recordedAt"]),
            "recordedAt must be a UTC second timestamp")
    require(entry["executionState"] in EXECUTION_STATES, "invalid executionState")
    require(entry["integrityState"] in INTEGRITY_STATES, "invalid integrityState")
    require(entry["scientificDecision"] in SCIENTIFIC_DECISIONS, "invalid scientificDecision")
    require(entry["outcomeAccessClass"] in ACCESS_CLASSES, "invalid outcomeAccessClass")
    require(entry["claimClass"] in CLAIM_CLASSES, "invalid claimClass")
    require(isinstance(entry["claimEligible"], bool), "claimEligible must be boolean")

    exact_keys(entry["source"], SOURCE_KEYS, "source")
    nullable_hash(entry["source"]["gitCommit"], COMMIT, "source.gitCommit")
    nullable_hash(entry["source"]["runtimeSha256"], HASH, "source.runtimeSha256")
    nullable_hash(entry["source"]["analysisGitCommit"], COMMIT, "source.analysisGitCommit")
    nullable_hash(entry["source"]["analysisProgramSha256"], HASH, "source.analysisProgramSha256")

    require(isinstance(entry["comparators"], list), "comparators must be a list")
    comparator_ids = set()
    for index, comparator in enumerate(entry["comparators"]):
        exact_keys(comparator, COMPARATOR_KEYS, f"comparators[{index}]")
        require(isinstance(comparator["id"], str) and comparator["id"], "comparator id missing")
        require(isinstance(comparator["ancestry"], str) and comparator["ancestry"], "ancestry missing")
        require(comparator["id"] not in comparator_ids, "duplicate comparator id")
        comparator_ids.add(comparator["id"])
        nullable_hash(comparator["gitCommit"], COMMIT, "comparator.gitCommit")
        nullable_hash(comparator["runtimeSha256"], HASH, "comparator.runtimeSha256")

    exact_keys(entry["population"], POPULATION_KEYS, "population")
    for key in ("expectedLaunches", "accountedLaunches"):
        nonnegative_nullable_integer(entry["population"][key], f"population.{key}")
    nullable_hash(entry["population"]["manifestSha256"], HASH, "population.manifestSha256")
    require(isinstance(entry["population"]["unit"], str) and entry["population"]["unit"],
            "population.unit missing")
    for key in ("maps", "countries", "notes"):
        require(
            isinstance(entry["population"][key], list)
            and all(isinstance(value, str) for value in entry["population"][key]),
            f"population.{key} must be a string list",
        )

    exact_keys(entry["scheduler"], SCHEDULER_KEYS, "scheduler")
    for key in ("account", "partition"):
        require(
            entry["scheduler"][key] is None or isinstance(entry["scheduler"][key], str),
            f"scheduler.{key} must be a string or null",
        )
    require(isinstance(entry["scheduler"]["jobs"], list), "scheduler.jobs must be a list")
    job_ids = set()
    for index, job in enumerate(entry["scheduler"]["jobs"]):
        exact_keys(job, JOB_KEYS, f"scheduler.jobs[{index}]")
        require(isinstance(job["jobId"], str) and job["jobId"], "jobId missing")
        require(job["jobId"] not in job_ids, "duplicate scheduler job")
        job_ids.add(job["jobId"])
        for key in ("role", "state"):
            require(isinstance(job[key], str) and job[key], f"job.{key} missing")
        require(job["exitCode"] is None or isinstance(job["exitCode"], str),
                "job.exitCode must be string or null")
        for key in ("expectedTasks", "accountedTasks"):
            nonnegative_nullable_integer(job[key], f"job.{key}")

    require(isinstance(entry["artifacts"], list), "artifacts must be a list")
    artifact_paths = set()
    for index, artifact in enumerate(entry["artifacts"]):
        exact_keys(artifact, ARTIFACT_KEYS, f"artifacts[{index}]")
        path = Path(artifact["path"])
        require(path.is_absolute(), "artifact path must be absolute")
        require(str(path) not in artifact_paths, "duplicate artifact path")
        artifact_paths.add(str(path))
        nullable_hash(artifact["sha256"], HASH, "artifact.sha256")
        require(artifact["sha256"] is not None, "artifact hash may not be null")
        nonnegative_nullable_integer(artifact["bytes"], "artifact.bytes")
        require(artifact["bytes"] is not None, "artifact bytes may not be null")
        require(isinstance(artifact["kind"], str) and artifact["kind"], "artifact kind missing")
        if verify_artifacts:
            require(path.is_file(), f"artifact missing: {path}")
            require(path.stat().st_size == artifact["bytes"], f"artifact size mismatch: {path}")
            require(sha256_file(path) == artifact["sha256"], f"artifact hash mismatch: {path}")

    require(isinstance(entry["results"], dict), "results must be an object")
    exact_keys(entry["relationships"], RELATIONSHIP_KEYS, "relationships")
    for key in RELATIONSHIP_KEYS:
        require(
            isinstance(entry["relationships"][key], list)
            and all(isinstance(value, str) and value for value in entry["relationships"][key]),
            f"relationships.{key} must be a nonempty-string list",
        )
    exact_keys(entry["advancement"], ADVANCEMENT_KEYS, "advancement")
    require(isinstance(entry["advancement"]["decision"], str) and entry["advancement"]["decision"],
            "advancement.decision missing")
    require(
        entry["advancement"]["nextMilestone"] is None
        or isinstance(entry["advancement"]["nextMilestone"], str),
        "advancement.nextMilestone must be a string or null",
    )
    require(
        isinstance(entry["limitations"], list)
        and all(isinstance(value, str) and value for value in entry["limitations"]),
        "limitations must be a nonempty-string list",
    )

    if entry["outcomeAccessClass"] == "outcome-blind":
        require(entry["results"] == {}, "outcome-blind entries cannot serialize results")
    if entry["claimEligible"]:
        require(entry["executionState"] == "completed", "claim requires completed execution")
        require(entry["integrityState"] == "passed", "claim requires passed integrity")
        require(entry["claimClass"] != "none", "claim requires a non-none class")
        require(entry["scientificDecision"] not in {"not-evaluated", "technical-failure"},
                "claim requires an evaluated non-failure decision")
    if entry["executionState"] in {"failed", "cancelled", "superseded"}:
        require(not entry["claimEligible"], "failed/cancelled/superseded row cannot support a claim")
    if entry["integrityState"] != "passed":
        require(not entry["claimEligible"], "non-passing integrity cannot support a claim")
    expected = entry["population"]["expectedLaunches"]
    accounted = entry["population"]["accountedLaunches"]
    if entry["executionState"] == "completed" and entry["integrityState"] == "passed":
        if expected is not None and accounted is not None:
            require(expected == accounted, "completed passing population launch mismatch")


def validate(path: Path, verify_artifacts: bool) -> dict[str, Any]:
    require(path.is_file(), f"ledger missing: {path}")
    entries = []
    ids = set()
    with path.open() as handle:
        for line_number, raw in enumerate(handle, 1):
            require(raw.endswith("\n"), f"line {line_number} lacks newline")
            stripped = raw.rstrip("\n")
            require(stripped and not stripped.isspace(), f"line {line_number} is empty")
            entry = json.loads(stripped)
            require(canonical(entry) == stripped, f"line {line_number} is not canonical JSON")
            validate_entry(entry, verify_artifacts)
            require(entry["entryId"] not in ids, f"duplicate entryId {entry['entryId']}")
            ids.add(entry["entryId"])
            entries.append(entry)
    require(entries, "ledger is empty")
    return {
        "complete": True,
        "passed": True,
        "schemaVersion": 2,
        "entries": len(entries),
        "claimEligible": sum(entry["claimEligible"] for entry in entries),
        "executionStates": dict(sorted(
            __import__("collections").Counter(entry["executionState"] for entry in entries).items()
        )),
        "integrityStates": dict(sorted(
            __import__("collections").Counter(entry["integrityState"] for entry in entries).items()
        )),
        "ledgerSha256": sha256_file(path),
        "artifactVerification": verify_artifacts,
    }


def parse_args(argv: Sequence[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("ledger", type=Path)
    parser.add_argument("--verify-artifacts", action="store_true")
    return parser.parse_args(argv)


def main(argv: Sequence[str] | None = None) -> int:
    args = parse_args(sys.argv[1:] if argv is None else argv)
    try:
        result = validate(args.ledger, args.verify_artifacts)
    except Exception as error:
        print(json.dumps({
            "complete": False,
            "passed": False,
            "error": str(error),
            "type": type(error).__name__,
        }, sort_keys=True), file=sys.stderr)
        return 1
    print(json.dumps(result, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
