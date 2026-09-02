import unittest
from multimap_v2_seed_reservation_audit import collisions_in

class AuditTests(unittest.TestCase):
    def test_unsigned_underscores_signed_and_boundaries(self):
        data = b'3001999999 3_002_000_000 3003299999 3003300000 -1292967296'
        self.assertEqual([x["unsignedValue"] for x in collisions_in(data)],
                         [3002000000, 3003299999, 3002000000])
    def test_no_outcome_parsing_and_no_partial_numeric_identifier(self):
        self.assertEqual(collisions_in(b'abc3002000000def 12300300000000 42 -1'), [])
        self.assertEqual(len(collisions_in(b'{"arbitraryMetadata":3002000001}')), 1)

if __name__ == "__main__":
    unittest.main()
