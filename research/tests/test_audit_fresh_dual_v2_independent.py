import importlib.util
import math
from pathlib import Path
import tempfile
import unittest


SCRIPT = Path(__file__).parents[1] / "scripts" / "audit_fresh_dual_v2_independent.py"
SPEC = importlib.util.spec_from_file_location("fresh_dual_audit", SCRIPT)
audit = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
SPEC.loader.exec_module(audit)


class FreshDualIndependentAuditTests(unittest.TestCase):
    def test_quantiles_use_linear_order_statistic_interpolation(self):
        values = [1.0, 2.0, 3.0, 4.0]
        self.assertEqual(audit.quantile(values, 0.25), 1.75)
        self.assertEqual(audit.median(values), 2.5)
        self.assertEqual(audit.quantile(values, 0.75), 3.25)

    def test_wilson_reproduces_fresh_central_value(self):
        self.assertTrue(
            math.isclose(
                audit.wilson_lower(642, 720),
                0.8711275416952556,
                rel_tol=0,
                abs_tol=1e-15,
            )
        )

    def test_action_metrics_materialize_rates_and_zero_denominators(self):
        methods = {method: 0 for method in audit.ACTION_METHODS}
        value = audit.action_metrics(methods, 0, 900)
        self.assertEqual(value["totalCalls"], 0)
        self.assertEqual(value["callsPer900"], 0)
        self.assertEqual(value["orderShare"], 0)
        self.assertEqual(value["corpseTargetsPerOrder"], 0)

        methods["orderUnits"] = 9
        methods["queueForProduction"] = 1
        value = audit.action_metrics(methods, 2, 1800)
        self.assertEqual(value["totalCalls"], 10)
        self.assertEqual(value["callsPer900"], 5)
        self.assertEqual(value["orderShare"], 0.9)
        self.assertEqual(value["corpseTargetsPerOrder"], 2 / 9)

    def test_map_families_do_not_count_revisions_as_new_families(self):
        expected = {
            "hfo-le": "hfo",
            "hfo-corners-b-golden": "hfo",
            "peak": "peak",
            "tour-of-egypt": "tour-of-egypt",
            "south-pacific": "south-pacific",
            "south-pacific-2": "south-pacific",
            "pacific-heights": "pacific-heights",
        }
        self.assertEqual({key: audit.map_family(key) for key in expected}, expected)
        with self.assertRaises(audit.AuditFailure):
            audit.map_family("unknown-map")

    def test_nested_comparison_is_float_tolerant_but_key_strict(self):
        audit.compare_nested({"x": 1.0 + 1e-14}, {"x": 1.0})
        with self.assertRaises(audit.AuditFailure):
            audit.compare_nested({"x": 1.0, "extra": 2}, {"x": 1.0})

    def test_tree_hash_includes_relative_paths_content_and_symlink_target(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "a").write_bytes(b"alpha")
            (root / "sub").mkdir()
            (root / "sub" / "b").write_bytes(b"beta")
            (root / "link").symlink_to("a")
            first = audit.hash_tree(root)
            second = audit.hash_tree(root)
            self.assertEqual(first, second)
            self.assertEqual(first["files"], 3)
            self.assertEqual(first["bytes"], 5 + 4 + 1)
            (root / "a").write_bytes(b"changed")
            self.assertNotEqual(audit.hash_tree(root)["sha256"], first["sha256"])

    def test_bootstrap_is_deterministic_and_preserves_three_weightings(self):
        observations = [
            {
                "mapId": "hfo-le",
                "country": "Americans",
                "candidateStart": "a",
                "difference": 1.0,
            },
            {
                "mapId": "hfo-le",
                "country": "Americans",
                "candidateStart": "a",
                "difference": 0.0,
            },
            {
                "mapId": "peak",
                "country": "Russians",
                "candidateStart": "b",
                "difference": -1.0,
            },
        ]
        first = audit.bootstrap_intervals(
            observations, "difference", audit.BOOTSTRAP_SEED,
        )
        second = audit.bootstrap_intervals(
            observations, "difference", audit.BOOTSTRAP_SEED,
        )
        self.assertEqual(first, second)
        self.assertTrue(math.isclose(first["gameMean"], 0.0))
        self.assertTrue(math.isclose(first["equalClusterMean"], -0.25))
        self.assertTrue(math.isclose(first["equalFamilyMean"], -0.25))

    def test_unknown_endpoint_cluster_count_fails_closed(self):
        rows = []
        for index in range(2):
            rows.append({
                "cohort": "synthetic",
                "arm": "candidate",
                "mapId": "peak",
                "country": f"country-{index}",
                "candidateStart": "a",
                "v5": {"winner": "draw", "status": "tick_cap_draw", "tick": 10},
                "v6": {"winner": "draw", "status": "tick_cap_draw", "tick": 10},
            })
        with self.assertRaisesRegex(audit.AuditFailure, "unsupported endpoint-effect cluster count"):
            audit.independent_endpoint_effects(rows)


if __name__ == "__main__":
    unittest.main()
