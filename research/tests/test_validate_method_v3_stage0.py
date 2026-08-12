import copy
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path


SCRIPT_PATH = Path(__file__).resolve().parents[1] / "scripts" / "validate_method_v3_stage0.py"
SPEC = importlib.util.spec_from_file_location("validate_method_v3_stage0", SCRIPT_PATH)
assert SPEC and SPEC.loader
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


def write_json(path: Path, value: dict) -> None:
    path.write_text(json.dumps(value, indent=2) + "\n", encoding="utf-8")


class ValidateMethodV3Stage0Test(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.run_id = "method-v3-stage0-12345"
        self.job_id = "12345"
        country_pairs = [
            {"candidateCountry": country, "baselineCountry": country}
            for country in sorted(MODULE.COUNTRIES)
        ]
        self.manifest = {
            "scheduler": {
                "jobId": self.job_id,
                "account": "pi_jss233",
                "source": "scontrol",
            },
            "source": {
                "trackedDirty": False,
                "gitBranch": "main",
                "gitCommit": "a" * 40,
            },
            "inputs": {
                "effectiveConfig": {
                    "countryPairing": "mirror",
                    "maxTicks": 1200,
                    "matchesPerPair": 1,
                    "candidateSlots": [0, 1],
                    "candidateCountries": sorted(MODULE.COUNTRIES),
                    "baselineCountries": sorted(MODULE.COUNTRIES),
                    "countryPairs": country_pairs,
                    "strongBotOptions": {"exactMapTactics": False},
                    "strongStrategyOptions": {
                        "defaultMapProfiles": False,
                        "buildingElimination": {
                            "enabled": True,
                            "observationMode": "publicApi",
                            "preemptExistingAttacks": True,
                            "sweepWhenNoTargets": True,
                            "capabilityAwareAttackers": True,
                            "reachabilityAwareTargets": True,
                            "stallTicks": 300,
                            "reassignStalledTargets": True,
                            "adaptiveAirTargetCount": 2,
                            "adaptiveNavalTargetCount": 2,
                        },
                    },
                }
            },
        }
        results = []
        events = [{"event": "run_start"}]
        match_index = 0
        for country in sorted(MODULE.COUNTRIES):
            for slot in (0, 1):
                match = f"match-{match_index:02d}"
                result = {
                    "match": match,
                    "candidateCountry": country,
                    "baselineCountry": country,
                    "candidateSlot": slot,
                    "ticks": 1200,
                    "finished": False,
                    "winner": "draw",
                    "candidateDefeated": False,
                    "baselineDefeated": False,
                }
                results.append(result)
                events.append({
                    "event": "candidate_policy_event",
                    "match": match,
                    "policyEvent": {"event": "activated"},
                })
                events.append({
                    "event": "candidate_policy_event",
                    "match": match,
                    "policyEvent": {
                        "schemaVersion": 2,
                        "event": "capability_production",
                        "requestedStructures": ["GAAIRC", "AMRADR"],
                        "requestedUnits": ["JUMPJET"],
                    },
                })
                events.extend(
                    {"event": "trace_snapshot", "match": match, "tick": tick}
                    for tick in (300, 600, 900, 1200)
                )
                events.append({"event": "match_complete", "match": match})
                match_index += 1
        events.append({"event": "run_complete"})
        self.summary = {
            "manifest": copy.deepcopy(self.manifest),
            "requestedMatches": 18,
            "rejectedStartAttempts": 0,
            "results": results,
        }
        self.events = events
        self.write_fixture()

    def tearDown(self) -> None:
        self.temp.cleanup()

    def write_fixture(self) -> None:
        write_json(self.root / f"manifest-{self.run_id}.json", self.manifest)
        write_json(self.root / f"summary-{self.run_id}.json", self.summary)
        event_text = "".join(json.dumps(event, sort_keys=True) + "\n" for event in self.events)
        (self.root / f"events-{self.run_id}.jsonl").write_text(event_text, encoding="utf-8")

    def test_accepts_complete_outcome_free_country_interface_run(self) -> None:
        gate = MODULE.validate_stage0(self.root, self.run_id, self.job_id)
        self.assertTrue(gate["passed"])
        self.assertTrue(gate["outcomeFree"])
        self.assertEqual(gate["matchCount"], 18)
        self.assertEqual(gate["traceSnapshotCount"], 72)
        self.assertEqual(gate["finisherActivationCount"], 18)
        self.assertEqual(gate["capabilityProductionEventCount"], 18)

    def test_accepts_no_capability_requests_when_no_gap_is_observed(self) -> None:
        self.events = [
            row for row in self.events
            if row.get("policyEvent", {}).get("event") != "capability_production"
        ]
        self.write_fixture()
        gate = MODULE.validate_stage0(self.root, self.run_id, self.job_id)
        self.assertTrue(gate["passed"])
        self.assertEqual(gate["capabilityProductionEventCount"], 0)

    def test_rejects_malformed_capability_telemetry_when_emitted(self) -> None:
        event = next(
            row for row in self.events
            if row.get("policyEvent", {}).get("event") == "capability_production"
        )
        del event["policyEvent"]["requestedUnits"]
        self.write_fixture()
        with self.assertRaisesRegex(ValueError, "capability-production telemetry"):
            MODULE.validate_stage0(self.root, self.run_id, self.job_id)

    def test_rejects_any_game_that_reaches_an_outcome(self) -> None:
        self.summary["results"][0]["finished"] = True
        self.summary["results"][0]["winner"] = "candidate"
        self.write_fixture()
        with self.assertRaisesRegex(ValueError, "reached an outcome"):
            MODULE.validate_stage0(self.root, self.run_id, self.job_id)

    def test_rejects_incomplete_country_coverage(self) -> None:
        self.summary["results"][0]["candidateCountry"] = "Russians"
        self.write_fixture()
        with self.assertRaisesRegex(ValueError, "country or reciprocal-slot coverage"):
            MODULE.validate_stage0(self.root, self.run_id, self.job_id)


if __name__ == "__main__":
    unittest.main()
