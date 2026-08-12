#!/usr/bin/env python3
"""Validate the outcome-free all-country method-v3 interface diagnostic."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
from collections import Counter
from pathlib import Path
from typing import Any


COUNTRIES = {
    "Americans",
    "Alliance",
    "French",
    "Germans",
    "British",
    "Africans",
    "Arabs",
    "Confederation",
    "Russians",
}


def sha256_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def read_json(path: Path) -> dict[str, Any]:
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise ValueError(f"Expected JSON object in {path}")
    return value


def validate_stage0(run_root: Path, run_id: str, expected_job_id: str) -> dict[str, Any]:
    manifest_path = run_root / f"manifest-{run_id}.json"
    events_path = run_root / f"events-{run_id}.jsonl"
    summary_path = run_root / f"summary-{run_id}.json"
    for path in (manifest_path, events_path, summary_path):
        if not path.is_file() or path.stat().st_size == 0:
            raise ValueError(f"Missing nonempty Stage-0 artifact: {path}")
    manifest = read_json(manifest_path)
    summary = read_json(summary_path)
    if summary.get("manifest") != manifest:
        raise ValueError("Summary and standalone manifests differ")
    scheduler = manifest.get("scheduler", {})
    if (
        str(scheduler.get("jobId")) != expected_job_id
        or scheduler.get("account") != "pi_jss233"
        or scheduler.get("source") != "scontrol"
    ):
        raise ValueError("Stage-0 scheduler provenance is not authoritative pi_jss233")
    source = manifest.get("source", {})
    if source.get("trackedDirty") is not False or source.get("gitBranch") != "main":
        raise ValueError("Stage-0 source was not a clean main checkout")
    config = manifest.get("inputs", {}).get("effectiveConfig", {})
    if (
        config.get("countryPairing") != "mirror"
        or config.get("maxTicks") != 1200
        or config.get("matchesPerPair") != 1
        or config.get("candidateSlots") != [0, 1]
        or set(config.get("candidateCountries", [])) != COUNTRIES
        or set(config.get("baselineCountries", [])) != COUNTRIES
        or len(config.get("countryPairs", [])) != 9
        or any(pair.get("candidateCountry") != pair.get("baselineCountry") for pair in config["countryPairs"])
    ):
        raise ValueError("Stage-0 effective country or tick configuration differs")
    strategy = config.get("strongStrategyOptions", {})
    finisher = strategy.get("buildingElimination", {})
    if (
        strategy.get("defaultMapProfiles") is not False
        or config.get("strongBotOptions", {}).get("exactMapTactics") is not False
        or finisher.get("enabled") is not True
        or finisher.get("observationMode") != "publicApi"
        or finisher.get("preemptExistingAttacks") is not True
        or finisher.get("sweepWhenNoTargets") is not True
        or finisher.get("capabilityAwareAttackers") is not True
        or finisher.get("reachabilityAwareTargets") is not True
        or finisher.get("stallTicks") != 300
        or finisher.get("reassignStalledTargets") is not True
        or finisher.get("adaptiveAirTargetCount") != 2
        or finisher.get("adaptiveNavalTargetCount") != 2
    ):
        raise ValueError("Stage-0 did not exercise the sealed method-v3 interfaces")

    results = summary.get("results")
    if (
        not isinstance(results, list)
        or summary.get("requestedMatches") != 18
        or len(results) != 18
        or summary.get("rejectedStartAttempts") != 0
    ):
        raise ValueError("Stage-0 match accounting differs from 9 countries x 2 slots")
    country_counts = Counter(row.get("candidateCountry") for row in results)
    slot_counts = Counter(row.get("candidateSlot") for row in results)
    if country_counts != Counter({country: 2 for country in COUNTRIES}) or slot_counts != Counter({0: 9, 1: 9}):
        raise ValueError("Stage-0 country or reciprocal-slot coverage differs")
    if any(
        row.get("candidateCountry") != row.get("baselineCountry")
        or row.get("ticks") != 1200
        or row.get("finished") is not False
        or row.get("winner") != "draw"
        or row.get("candidateDefeated") is not False
        or row.get("baselineDefeated") is not False
        for row in results
    ):
        raise ValueError("Stage-0 reached an outcome or failed to stop at its outcome-free tick cap")

    events = [json.loads(line) for line in events_path.read_text(encoding="utf-8").splitlines() if line]
    event_counts = Counter(row.get("event") for row in events)
    activations = [
        row for row in events
        if row.get("event") == "candidate_policy_event" and row.get("policyEvent", {}).get("event") == "activated"
    ]
    capability_events = [
        row for row in events
        if row.get("event") == "candidate_policy_event"
        and row.get("policyEvent", {}).get("event") == "capability_production"
    ]
    result_matches = {row.get("match") for row in results}
    if (
        event_counts["run_start"] != 1
        or event_counts["run_complete"] != 1
        or event_counts["match_complete"] != 18
        or event_counts["trace_snapshot"] != 72
        or len(activations) != 18
        or {row.get("match") for row in activations} != result_matches
    ):
        raise ValueError("Stage-0 structured trace or finisher-activation events are incomplete")
    # Capability production is conditional: a correctly functioning finisher
    # must not request air or naval technology when its current attackers can
    # already damage and reach every surviving building.  Validate the sealed
    # telemetry interface whenever a genuine gap causes it to fire, without
    # manufacturing a tactical gap in this outcome-free diagnostic.
    if any(
        row.get("match") not in result_matches
        or row.get("policyEvent", {}).get("schemaVersion") != 2
        or not isinstance(row.get("policyEvent", {}).get("requestedStructures"), list)
        or not isinstance(row.get("policyEvent", {}).get("requestedUnits"), list)
        for row in capability_events
    ):
        raise ValueError("Stage-0 capability-production telemetry violates the sealed schema")
    return {
        "schemaVersion": 1,
        "status": "PASS_OUTCOME_FREE_METHOD_V3_STAGE0_COUNTRY_INTERFACE",
        "passed": True,
        "outcomeFree": True,
        "scheduler": {"jobId": expected_job_id, "account": "pi_jss233"},
        "sourceGitCommit": source.get("gitCommit"),
        "countries": sorted(COUNTRIES),
        "countryCount": 9,
        "reciprocalSlotCount": 2,
        "matchCount": 18,
        "maxTicks": 1200,
        "traceSnapshotCount": event_counts["trace_snapshot"],
        "finisherActivationCount": len(activations),
        "capabilityProductionEventCount": len(capability_events),
        "artifacts": {
            "manifest": {"path": str(manifest_path), "sha256": sha256_file(manifest_path)},
            "events": {"path": str(events_path), "sha256": sha256_file(events_path)},
            "summary": {"path": str(summary_path), "sha256": sha256_file(summary_path)},
        },
    }


def write_exclusive(path: Path, value: dict[str, Any]) -> None:
    payload = (json.dumps(value, indent=2) + "\n").encode("utf-8")
    descriptor = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(descriptor, "wb") as handle:
        handle.write(payload)
        handle.flush()
        os.fsync(handle.fileno())


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--run-root", type=Path, required=True)
    parser.add_argument("--run-id", required=True)
    parser.add_argument("--expected-job-id", required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    write_exclusive(args.output, validate_stage0(args.run_root, args.run_id, args.expected_job_id))
    print(json.dumps({"output": str(args.output), "sha256": sha256_file(args.output), "passed": True}, sort_keys=True))


if __name__ == "__main__":
    main()
