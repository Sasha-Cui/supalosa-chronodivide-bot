#!/usr/bin/env python3
import hashlib
import json
import sys
from pathlib import Path


EXPECTED_SAME_SEED = 424242
EXPECTED_DIFFERENT_SEED = 424243
BOT_SEED_XOR = 0x9E3779B9


def fnv1a32(value):
    result = 0x811C9DC5
    for byte in value.encode("utf-8"):
        result ^= byte
        result = (result * 0x01000193) & 0xFFFFFFFF
    return result


def load_task(root, task_id):
    task_dir = root / ("task-%d" % task_id)
    event_paths = list(task_dir.glob("events-*.jsonl"))
    manifest_paths = list(task_dir.glob("manifest-*.json"))
    if len(event_paths) != 1 or len(manifest_paths) != 1:
        raise RuntimeError(
            "task %d expected exactly one event log and manifest; found %d and %d"
            % (task_id, len(event_paths), len(manifest_paths))
        )

    normalized = []
    match_result = None
    with event_paths[0].open("r", encoding="utf-8") as handle:
        for line_number, line in enumerate(handle, 1):
            record = json.loads(line)
            if record.get("event") == "trace_snapshot":
                normalized.append({"event": "trace_snapshot", "snapshot": record["snapshot"]})
            elif record.get("event") == "match_complete":
                match_result = dict(record["result"])
                match_result.pop("wallTimeMs", None)
                normalized.append({"event": "match_complete", "result": match_result})

    if match_result is None:
        raise RuntimeError("task %d has no match_complete event" % task_id)
    if not any(record["event"] == "trace_snapshot" for record in normalized):
        raise RuntimeError("task %d has no normalized trace snapshots" % task_id)

    manifest = json.loads(manifest_paths[0].read_text(encoding="utf-8"))
    scheduler = manifest.get("scheduler", {})
    if scheduler.get("account") != "pi_jss233" or scheduler.get("source") != "scontrol":
        raise RuntimeError(
            "task %d scheduler provenance is not authoritative pi_jss233: %r" % (task_id, scheduler)
        )

    payload = json.dumps(normalized, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return {
        "task": task_id,
        "sha256": hashlib.sha256(payload).hexdigest(),
        "records": len(normalized),
        "seedBlockIndex": match_result.get("seedBlockIndex"),
        "pairedSeedBlock": match_result.get("pairedSeedBlock"),
        "requestedEngineSeed": match_result.get("requestedEngineSeed"),
        "botRandomSeed": match_result.get("botRandomSeed"),
        "candidateBotRandomSeed": match_result.get("candidateBotRandomSeed"),
        "baselineBotRandomSeed": match_result.get("baselineBotRandomSeed"),
        "engineSeedEpochMs": match_result.get("engineSeedEpochMs"),
        "winner": match_result.get("winner"),
        "ticks": match_result.get("ticks"),
    }


def validate_seed_fields(result, expected_seed):
    expected_bot_seed = (expected_seed ^ BOT_SEED_XOR) & 0xFFFFFFFF
    return (
        result["seedBlockIndex"] == 0
        and result["pairedSeedBlock"] is False
        and result["requestedEngineSeed"] == expected_seed
        and result["botRandomSeed"] == expected_bot_seed
        and result["candidateBotRandomSeed"] == (expected_bot_seed ^ fnv1a32("candidate")) & 0xFFFFFFFF
        and result["baselineBotRandomSeed"] == (expected_bot_seed ^ fnv1a32("baseline")) & 0xFFFFFFFF
        and result["engineSeedEpochMs"] == expected_seed * 1000
    )


def main():
    if len(sys.argv) != 2:
        raise SystemExit("Usage: check_seed_replay_gate.py RESULT_ROOT")
    root = Path(sys.argv[1]).resolve()
    results = [load_task(root, task_id) for task_id in range(11)]
    same = results[:10]
    different = results[10]

    same_seed_fields = all(validate_seed_fields(result, EXPECTED_SAME_SEED) for result in same)
    different_seed_fields = validate_seed_fields(different, EXPECTED_DIFFERENT_SEED)
    same_trace_identity = len({result["sha256"] for result in same}) == 1
    different_seed_diverges = different["sha256"] != same[0]["sha256"]
    passed = same_seed_fields and different_seed_fields and same_trace_identity and different_seed_diverges

    summary = {
        "schemaVersion": 1,
        "gate": "seed-replay-gate-v1",
        "resultRoot": str(root),
        "sameSeedProcesses": 10,
        "sameSeed": EXPECTED_SAME_SEED,
        "differentSeed": EXPECTED_DIFFERENT_SEED,
        "checks": {
            "sameSeedFieldsValid": same_seed_fields,
            "differentSeedFieldsValid": different_seed_fields,
            "sameSeedTraceIdentity10of10": same_trace_identity,
            "differentSeedTraceDiverges": different_seed_diverges,
        },
        "passed": passed,
        "tasks": results,
    }
    output_path = root / "gate-summary.json"
    output_path.write_text(json.dumps(summary, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(json.dumps(summary, indent=2, sort_keys=True))
    if not passed:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
