import importlib.util
import unittest
from pathlib import Path


SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "analyze_method_v3_stage2_failures.py"
SPEC = importlib.util.spec_from_file_location("analyze_method_v3_stage2_failures", SCRIPT)
assert SPEC and SPEC.loader
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


def result(winner: str, *, candidate_buildings: int, baseline_buildings: int) -> dict:
    finished = winner != "draw"
    return {
        "episodeId": winner,
        "familyId": "family-a",
        "policyId": "a" * 64,
        "candidateCountry": "Americans",
        "candidateSlot": 0,
        "winner": winner,
        "finished": finished,
        "ticks": 500 if finished else 1_000,
        "maxTicks": 1_000,
        "candidateDefeated": winner == "baseline",
        "baselineDefeated": winner == "candidate",
        "candidate": {"buildings": candidate_buildings, "combatants": 2},
        "baseline": {"buildings": baseline_buildings, "combatants": 1},
    }


class FailureAuditTests(unittest.TestCase):
    def test_literal_candidate_win_requires_clean_engine_endpoint(self):
        MODULE.validate_result(result("candidate", candidate_buildings=1, baseline_buildings=0), Path("x"))
        invalid = result("candidate", candidate_buildings=1, baseline_buildings=1)
        with self.assertRaisesRegex(ValueError, "candidate-win invariant"):
            MODULE.validate_result(invalid, Path("x"))

    def test_mutual_elimination_tick_cap_remains_draw(self):
        row = result("draw", candidate_buildings=0, baseline_buildings=0)
        MODULE.validate_result(row, Path("x"))
        summary = MODULE.summarize_policy([{"runIndex": 0, "result": row, "events": []}])
        self.assertEqual(summary["draws"], 1)
        self.assertEqual(summary["drawEndpoint"]["mutualZeroBuildings"], 1)
        self.assertEqual(summary["wins"], 0)

    def test_summarizer_distinguishes_pre_closeout_loss(self):
        rows = [
            {"runIndex": 0, "result": result("baseline", candidate_buildings=0, baseline_buildings=4), "events": []},
            {
                "runIndex": 0,
                "result": {**result("draw", candidate_buildings=2, baseline_buildings=1), "episodeId": "draw-2"},
                "events": [{"event": "activated"}, {"event": "target_stalled"}],
            },
        ]
        summary = MODULE.summarize_policy(rows)
        self.assertEqual(summary["lossesBeforeBuildingElimination"], 1)
        self.assertEqual(summary["drawEndpoint"]["supalosaAtMostTwoBuildings"], 1)
        self.assertEqual(
            summary["byOutcomeLifecycle"]["draw"]["episodePolicyEventIncidence"]["target_stalled"],
            1,
        )

    def test_validate_result_rejects_finished_draw(self):
        row = result("draw", candidate_buildings=1, baseline_buildings=1)
        row["finished"] = True
        with self.assertRaisesRegex(ValueError, "tick-cap endpoint"):
            MODULE.validate_result(row, Path("x"))


if __name__ == "__main__":
    unittest.main()
