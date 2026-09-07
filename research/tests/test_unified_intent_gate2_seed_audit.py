#!/usr/bin/env python3

from __future__ import annotations

import gzip
from pathlib import Path
import sys
import tempfile
import unittest


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
import unified_intent_gate2_seed_audit as audit


class UnifiedIntentGate2SeedAuditTest(unittest.TestCase):
    def test_unsigned_and_signed_tokens_bind_the_same_candidate(self) -> None:
        found, ranges = audit.inspect_bytes(
            b"seed=3330000001 signed=-964967295 unrelated=3070000001",
        )
        self.assertEqual(ranges, [])
        self.assertEqual(
            [(value["unsignedValue"], value["candidateBase"]) for value in found],
            [(3_330_000_001, 3_330_000_000), (3_330_000_001, 3_330_000_000)],
        )

    def test_declared_ranges_are_conservative(self) -> None:
        found, ranges = audit.inspect_bytes(
            b'{"seedRange":[3340000000,3341000000]}',
        )
        self.assertEqual(
            {value["candidateBase"] for value in found},
            {3_340_000_000},
        )
        self.assertEqual(len(ranges), 1)
        self.assertEqual(ranges[0]["candidateBase"], 3_340_000_000)
        self.assertTrue(ranges[0]["overlap"])

    def test_gzip_stream_scans_across_chunk_boundaries(self) -> None:
        previous_chunk = audit.STREAM_CHUNK
        previous_overlap = audit.STREAM_OVERLAP
        audit.STREAM_CHUNK = 8
        audit.STREAM_OVERLAP = 64
        try:
            with tempfile.TemporaryDirectory() as directory:
                path = Path(directory) / "trace.jsonl.gz"
                payload = b"prefix 3330000002 suffix"
                with gzip.open(path, "wb") as handle:
                    handle.write(payload)
                found, ranges, decompressed = audit.inspect_gzip(path)
                self.assertEqual(ranges, [])
                self.assertEqual(decompressed, len(payload))
                self.assertEqual(len(found), 1)
                self.assertEqual(found[0]["unsignedValue"], 3_330_000_002)
                self.assertEqual(found[0]["byteOffset"], 7)
        finally:
            audit.STREAM_CHUNK = previous_chunk
            audit.STREAM_OVERLAP = previous_overlap

    def test_assessment_selects_first_clean_candidate_after_complete_scan(self) -> None:
        collisions = [{
            "path": "/evidence/used.json",
            "tokens": [{
                "candidateBase": 3_330_000_000,
                "unsignedValue": 3_330_000_001,
                "signedInt32Equivalent": -964_967_295,
                "byteOffset": 0,
            }],
        }]
        values = audit.candidate_assessments(collisions)
        self.assertEqual(len(values), 20)
        self.assertFalse(values[0]["passed"])
        self.assertFalse(values[0]["selected"])
        self.assertTrue(values[1]["passed"])
        self.assertTrue(values[1]["selected"])
        self.assertTrue(all(value["base"] in audit.CANDIDATE_BASES for value in values))


if __name__ == "__main__":
    unittest.main()
