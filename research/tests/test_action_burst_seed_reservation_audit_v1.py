import importlib.util
from pathlib import Path
import unittest


SCRIPT = Path(__file__).parents[1] / "scripts" / "action_burst_seed_reservation_audit_v1.py"
SPEC = importlib.util.spec_from_file_location("action_seed_audit", SCRIPT)
audit = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
SPEC.loader.exec_module(audit)


class ActionBurstSeedAuditTests(unittest.TestCase):
    def test_unsigned_signed_grouped_and_hex_tokens(self):
        signed = audit.LOW - 2**32
        values = (
            f"{audit.LOW} {signed} 4_100_000_000 4,100,000,000 "
            f"{hex(audit.LOW)}"
        ).encode()
        hits, _ = audit.inspect_numbers(values)
        self.assertGreaterEqual(len(hits), 5)
        self.assertTrue(all(hit["unsignedValue"] == audit.LOW for hit in hits))

    def test_boundaries_and_decimal_or_hash_adjacency(self):
        values = (
            f"{audit.LOW - 1} {audit.HIGH} abc{audit.LOW}def "
            f"1.{audit.LOW}"
        ).encode()
        hits, _ = audit.inspect_numbers(values)
        self.assertEqual(hits, [])

    def test_json_adjacent_values_are_found(self):
        hits, _ = audit.inspect_numbers(
            f"[{audit.LOW},{audit.LOW + 1}]".encode()
        )
        self.assertEqual(
            [value["unsignedValue"] for value in hits],
            [audit.LOW, audit.LOW + 1],
        )

    def test_declared_range_overlap_with_outside_endpoints(self):
        _, ranges = audit.inspect_numbers(
            b'{"reservedInterval":[4099000000,4102000000]}'
        )
        self.assertEqual(len(ranges), 1)
        self.assertTrue(ranges[0]["overlap"])

    def test_object_range_inclusive_upper_and_exclusive_boundary(self):
        _, inclusive = audit.inspect_numbers(
            b'{"seedRange":{"minimum":4099999999,"maximum":4100000000}}'
        )
        self.assertTrue(inclusive[0]["overlap"])
        _, outside = audit.inspect_numbers(
            b'{"seedRange":{"minimum":4101000000,"maximumExclusive":4102000000}}'
        )
        self.assertFalse(outside[0]["overlap"])

    def test_wrapped_interval_is_conservatively_checked(self):
        self.assertTrue(audit.overlap(4_100_500_000, 100))


if __name__ == "__main__":
    unittest.main()
