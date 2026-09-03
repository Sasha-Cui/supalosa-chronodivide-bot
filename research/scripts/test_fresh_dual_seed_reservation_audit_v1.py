import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location("audit", Path(__file__).with_name("fresh_dual_seed_reservation_audit_v1.py"))
audit = importlib.util.module_from_spec(spec)
spec.loader.exec_module(audit)

class AuditTests(unittest.TestCase):
    def test_metadata_only_names(self):
        for name in ["manifest.json", "selected-cases.json", "run-plan.json", "seed-reservations.jsonl", "legacy.seed"]:
            self.assertIsNone(audit.metadata_reason(Path(name)), name)
        for name in ["cell.json", "case-000.json", "result.json", "events.jsonl", "trace.jsonl.gz", ".env", "manifest.env", "seed-results.json", "auth-config.json", "secrets.yaml", "config.token.json"]:
            self.assertIsNotNone(audit.metadata_reason(Path(name)), name)

    def test_unsigned_signed_grouped_and_hex(self):
        values = b'3765000000 -529967296 3_765_000_000 3,765,000,000 0xe0682300'
        hits, _ = audit.inspect_numbers(values, {3765000000})
        self.assertGreaterEqual(len(hits), 4)
        self.assertTrue(all(h["unsignedValue"] >= audit.LOW for h in hits))

    def test_json_adjacent_numbers_and_hash_boundaries(self):
        hits, _ = audit.inspect_numbers(b'[3765000000,3765000001] abc3765000000def 1.3765000000', {3765000000})
        self.assertEqual([h["unsignedValue"] for h in hits], [3765000000, 3765000001])
        self.assertEqual([h["exactPlannedSeed"] for h in hits], [True, False])

    def test_reserved_interval_crossing_without_inside_endpoints(self):
        _, ranges = audit.inspect_numbers(b'{"reservedInterval": [3740000000, 3780000000]}', set())
        self.assertTrue(ranges[0]["overlap"])
        _, outside = audit.inspect_numbers(b'{"seedRange":{"minimum":3770000000,"maximumExclusive":3780000000}}', set())
        self.assertFalse(outside[0]["overlap"])

    def test_range_objects_and_exclusive_boundary(self):
        _, ranges = audit.inspect_numbers(b'{"seedRange":{"minimum":3764999999,"maximum":3765000000}}', set())
        self.assertTrue(ranges[0]["overlap"])
        hits, _ = audit.inspect_numbers(b'3764999999 3770000000 -524967296', set())
        self.assertEqual(hits, [])

if __name__ == "__main__":
    unittest.main()
