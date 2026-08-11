import importlib.util
import unittest
from pathlib import Path


SCRIPT = Path(__file__).parents[1] / "scripts" / "freeze_method_v2_development_pool.py"
SPEC = importlib.util.spec_from_file_location("freeze_method_v2_development_pool", SCRIPT)
assert SPEC and SPEC.loader
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class FreezeMethodV2DevelopmentPoolTest(unittest.TestCase):
    def review_rows(self):
        summary = {
            "familyId": "mf_review",
            "status": "review",
            "mapSha256": "a" * 64,
            "failures": [],
            "warningCategoryCounts": {"invalid_object": 3},
        }
        side = {
            "loaded": True,
            "progressedBeyondTickOne": True,
            "reachedTargetTick": True,
            "error": None,
            "warningCaptureTruncated": False,
        }
        probe = {
            "familyId": "mf_review",
            "fidelityStatus": "review",
            "mapSha256": "a" * 64,
            "failureCategories": [],
            "forward": dict(side),
            "reverse": dict(side),
            "reciprocalStartCheck": {
                "allObservedStartsDeclared": True,
                "declaredStartCountValid": True,
                "forwardStartsDistinct": True,
                "reciprocalPhysicalSlots": True,
                "reverseStartsDistinct": True,
                "failures": [],
            },
            "warnings": [{"category": "invalid_object"} for _ in range(3)],
        }
        return summary, probe

    def test_rank_is_deterministic_unique_and_domain_separated(self):
        families = ["zeta", "eta", "theta", "iota"]
        ranked = MODULE.rank_family_ids(families)
        self.assertEqual(ranked, MODULE.rank_family_ids(list(reversed(families))))
        self.assertEqual(set(ranked), set(families))
        self.assertEqual(len(ranked), 4)
        self.assertNotEqual(ranked, sorted(families))

    def test_adjudicates_only_complete_classified_outcome_free_reviews(self):
        summary, probe = self.review_rows()
        result = MODULE.adjudicate_review_row(summary, probe)
        self.assertEqual(result["failureCount"], 0)
        self.assertTrue(result["reciprocalStartChecksPassed"])
        self.assertEqual(result["warningCategoryCounts"], {"invalid_object": 3})

        probe["forward"]["reachedTargetTick"] = False
        with self.assertRaisesRegex(ValueError, "progress checks"):
            MODULE.adjudicate_review_row(summary, probe)

    def test_rejects_unclassified_warning_or_forged_reciprocal_start(self):
        summary, probe = self.review_rows()
        summary["warningCategoryCounts"] = {"unknown_warning": 1}
        probe["warnings"] = [{"category": "unknown_warning"}]
        with self.assertRaisesRegex(ValueError, "non-admissible"):
            MODULE.adjudicate_review_row(summary, probe)

        summary, probe = self.review_rows()
        probe["reciprocalStartCheck"]["reciprocalPhysicalSlots"] = False
        with self.assertRaisesRegex(ValueError, "reciprocal-start"):
            MODULE.adjudicate_review_row(summary, probe)


if __name__ == "__main__":
    unittest.main()
