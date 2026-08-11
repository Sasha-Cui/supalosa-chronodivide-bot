import importlib.util
import json
import tempfile
import unittest
from pathlib import Path


SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "analyze_terminal_states.py"
SPEC = importlib.util.spec_from_file_location("analyze_terminal_states", SCRIPT)
assert SPEC and SPEC.loader
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


def result(method: str, winner: str, slot: int, *, finished: bool = True) -> dict:
    score = {"candidate": 1.0, "draw": 0.5, "baseline": 0.0}[winner]
    candidate = {
        "credits": 10 + slot,
        "units": 8,
        "buildings": 4,
        "combatants": 5,
        "harvesters": 1,
        "factories": 1,
        "refineries": 1,
        "conyards": 0,
        "byName": {"E2": 5},
    }
    baseline = {
        "credits": 2,
        "units": 4,
        "buildings": 3,
        "combatants": 2,
        "harvesters": 1,
        "factories": 0,
        "refineries": 1,
        "conyards": 0,
        "byName": {"E2": 2},
    }
    return {
        "schemaVersion": 1,
        "episodeId": f"{method}-b0-s{slot}",
        "familyId": "family-a",
        "mapName": "map-a",
        "mapSha256": "a" * 64,
        "methodId": method,
        "policyId": ("a" if method == "left" else "b") * 64,
        "seedBlockIndex": 0,
        "requestedEngineSeed": 100,
        "botRandomSeed": 1,
        "candidateBotRandomSeed": 2,
        "baselineBotRandomSeed": 3,
        "engineSeedEpochMs": 100000,
        "candidateSlot": slot,
        "candidateStart": {"x": slot, "y": 1},
        "baselineStart": {"x": 1 - slot, "y": 1},
        "maxTicks": 1000,
        "ticks": 500 if finished else 1000,
        "finished": finished,
        "winner": winner,
        "candidateScore": score,
        "candidateDefeated": winner == "baseline",
        "baselineDefeated": winner == "candidate",
        "candidate": candidate,
        "baseline": baseline,
    }


class TerminalStateAnalysisTests(unittest.TestCase):
    def test_method_summary_counts_tick_cap_draws(self):
        rows = [result("left", "candidate", 0), result("left", "draw", 1, finished=False)]
        summary = MODULE.method_summary(rows)
        self.assertEqual(summary["wins"], 1)
        self.assertEqual(summary["draws"], 1)
        self.assertEqual(summary["tickCapDraws"], 1)
        self.assertEqual(summary["score"], 0.75)
        self.assertEqual(summary["terminal"]["candidateMinusBaselineMean"]["combatants"], 3.0)

    def test_paired_comparison_reports_transitions_and_terminal_difference(self):
        left = [result("left", "candidate", 0), result("left", "draw", 1, finished=False)]
        right = [result("right", "draw", 0, finished=False), result("right", "baseline", 1)]
        comparison = MODULE.paired_comparison(left, right)
        self.assertEqual(comparison["scoreDifference"], 0.5)
        self.assertEqual(comparison["outcomeTransitionCounts"]["draw"]["candidate"], 1)
        self.assertEqual(comparison["outcomeTransitionCounts"]["baseline"]["draw"], 1)
        self.assertEqual(comparison["pairedScoreDifferenceCounts"], {"0.5": 2})
        self.assertEqual(
            comparison["terminalCandidateMinusBaselineDifference"]["combatants"], 0.0
        )

    def test_exact_equivalence_includes_full_terminal_state(self):
        left = [result("left", "draw", 0, finished=False)]
        right = [result("right", "draw", 0, finished=False)]
        equivalent = MODULE.exact_equivalence(left, right)
        self.assertTrue(equivalent["allPairedGamesExactlyEquivalent"])
        right[0]["candidate"]["credits"] += 1
        changed = MODULE.exact_equivalence(left, right)
        self.assertFalse(changed["allPairedGamesExactlyEquivalent"])
        self.assertEqual(changed["fieldMismatchCounts"], {"candidate": 1})

    def test_load_campaign_rejects_event_count_mismatch(self):
        row = result("left", "candidate", 0)
        episode = {field: row[field] for field in MODULE.EPISODE_IDENTITY_FIELDS}
        plan = {
            "runId": "run-1",
            "purpose": "test-purpose",
            "sourceGitCommit": "source",
            "episodes": [episode],
        }
        with tempfile.TemporaryDirectory() as raw:
            root = Path(raw)
            shard = root / "1_0"
            shard.mkdir()
            (shard / "manifest.json").write_text(
                json.dumps({"planBytesSha256": "plan-hash", "plan": plan})
            )
            (shard / "summary.json").write_text(
                json.dumps(
                    {
                        "planBytesSha256": "plan-hash",
                        "requestedLaunches": 1,
                        "accountedLaunches": 1,
                        "completed": 1,
                        "technicalFailures": 0,
                        "complete": True,
                        "technicallyClean": True,
                    }
                )
            )
            (shard / "events.jsonl").write_text(
                json.dumps({"event": "episode_complete", "result": row}) + "\n"
            )
            with self.assertRaisesRegex(ValueError, "event accounting mismatch"):
                MODULE.load_campaign(
                    root,
                    expected_purpose="test-purpose",
                    expected_source_commit="source",
                    expected_games=1,
                )

    def test_validate_endpoint_rejects_unfinished_non_draw(self):
        row = result("left", "candidate", 0, finished=False)
        with self.assertRaisesRegex(ValueError, "tick-cap draw"):
            MODULE.validate_endpoint(row)


if __name__ == "__main__":
    unittest.main()
