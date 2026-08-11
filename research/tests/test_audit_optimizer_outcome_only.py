import importlib.util
import unittest
from pathlib import Path


SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "audit_optimizer_outcome_only.py"
SPEC = importlib.util.spec_from_file_location("audit_optimizer_outcome_only", SCRIPT)
assert SPEC and SPEC.loader
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


def reduction() -> dict:
    ranking = []
    for index in range(32):
        outcome = 1 - index / 64
        utility_order = (index + 7) % 32
        ranking.append({
            "rank": utility_order + 1,
            "policyId": f"{index:064x}",
            "macroOutcomeScore": outcome,
            "macroSelectionUtility": 1 - utility_order / 64,
            "familyScores": [{"outcomeScore": outcome} for _ in range(6)],
        })
    ranking.sort(key=lambda row: row["rank"])
    return {
        "schemaVersion": 1,
        "optimizerRunIndex": 0,
        "completedStage": 0,
        "selectedCount": 12,
        "ranking": ranking,
        "selectedPolicies": [{"policyId": row["policyId"]} for row in ranking[:12]],
        "technicalFailureCount": 0,
        "launchedGameCount": 384,
        "completedGameCount": 384,
    }


class OutcomeOnlyAuditTests(unittest.TestCase):
    def test_ranks_by_macro_worst_and_hash(self):
        rows = [
            {"policyId": "b" * 64, "macroOutcomeScore": 0.5, "familyScores": [{"outcomeScore": 0.25}]},
            {"policyId": "a" * 64, "macroOutcomeScore": 0.5, "familyScores": [{"outcomeScore": 0.5}]},
            {"policyId": "c" * 64, "macroOutcomeScore": 0.75, "familyScores": [{"outcomeScore": 0.0}]},
        ]
        self.assertEqual([row["policyId"] for row in MODULE.rank_outcome_only(rows)], ["c" * 64, "a" * 64, "b" * 64])

    def test_audits_survivor_overlap(self):
        result = MODULE.audit_reduction(reduction())
        self.assertEqual(result["selectedCount"], 12)
        self.assertLess(result["overlapCount"], 12)
        self.assertEqual(result["changedCount"], 12 - result["overlapCount"])

    def test_rejects_incomplete_stage(self):
        value = reduction()
        value["completedGameCount"] = 383
        with self.assertRaisesRegex(ValueError, "complete frozen stage"):
            MODULE.audit_reduction(value)


if __name__ == "__main__":
    unittest.main()
