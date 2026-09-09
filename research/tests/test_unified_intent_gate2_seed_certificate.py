#!/usr/bin/env python3

from __future__ import annotations

import hashlib
import json
from pathlib import Path
import sys
import tempfile
import unittest


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
import unified_intent_gate2_seed_audit as audit
import unified_intent_gate2_seed_certificate as certificate


class UnifiedIntentGate2SeedCertificateTest(unittest.TestCase):
    def test_streams_all_files_and_validates_first_clean_selection(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            records = []
            for index in range(certificate.SAMPLE_SIZE):
                path = root / ("file-%04d.txt" % index)
                path.write_text(str(index))
                payload = path.read_bytes()
                records.append({
                    "path": str(path),
                    "bytes": len(payload),
                    "sha256": hashlib.sha256(payload).hexdigest(),
                    "gzipDecompressedBytes": None,
                })
            candidates = []
            for index, base in enumerate(certificate.CANDIDATE_BASES):
                collisions = 1 if index < 2 else 0
                candidates.append({
                    "base": base,
                    "collisionPaths": [] if collisions == 0 else ["/collision"],
                    "collisionRecords": collisions,
                    "interval": [base, base + 1_000_000],
                    "passed": collisions == 0,
                    "selected": index == 2,
                    "signedInt32EquivalentInterval": [
                        base - 2**32,
                        base + 1_000_000 - 2**32,
                    ],
                })
            totals = {
                "files": len(records),
                "bytes": sum(value["bytes"] for value in records),
                "gzipFiles": 0,
                "gzipDecompressedBytes": 0,
                "errors": 0,
                "collisionRecords": 2,
                "declaredRanges": 0,
            }
            artifact = {
                "amendmentA1Sha256": certificate.A1_SHA256,
                "amendmentA2Sha256": certificate.A2_SHA256,
                "candidateAssessments": candidates,
                "collisions": [],
                "complete": True,
                "competitiveFieldsAbsent": True,
                "declaredRanges": [],
                "errors": [],
                "kind": "unified-intent-gate2-seed-audit-v1-a2",
                "passed": True,
                "programSha256": certificate.AUDIT_PROGRAM_SHA256,
                "protocolSha256": certificate.GATE2_SHA256,
                "roots": ["/evidence"],
                "scheduler": {
                    "account": "pi_jss233",
                    "jobId": certificate.AUDIT_JOB_ID,
                    "partition": "day",
                },
                "selectedBase": certificate.SELECTED_BASE,
                "selectedInterval": [
                    certificate.SELECTED_BASE,
                    certificate.SELECTED_BASE + 1_000_000,
                ],
                "sourceCommit": certificate.AUDIT_SOURCE,
                "technicalOnly": True,
                "totals": totals,
            }
            records = records[1_024:] + records[:1_024]
            ledger = root / "files.partial.jsonl"
            ledger.write_text("".join(
                json.dumps(value, sort_keys=True) + "\n" for value in records
            ))
            full = root / "audit.json"
            audit.write_streamed_artifact(full, artifact, ledger, len(records))

            uniqueness = root / "path-uniqueness.sqlite3"
            parsed = certificate.stream_audit(full, uniqueness)
            certificate.validate(parsed)
            self.assertTrue(uniqueness.exists())
            uniqueness.unlink()

            self.assertEqual(parsed["totals"], totals)
            self.assertEqual(parsed["sampleSize"], certificate.SAMPLE_SIZE)
            self.assertTrue(certificate.SHA256.fullmatch(parsed["sampleSha256"]))

            self.assertEqual(
                parsed["pathUniquenessMode"], "sqlite_full_path_primary_key")
    def test_canonical_sample_hash_is_order_sensitive(self) -> None:
        left = [{"path": "/a"}, {"path": "/b"}]
        right = list(reversed(left))
        self.assertNotEqual(
            certificate.canonical_hash(left),
            certificate.canonical_hash(right),
        )


if __name__ == "__main__":
    unittest.main()
