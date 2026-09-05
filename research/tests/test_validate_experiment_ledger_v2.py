import copy
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest


SCRIPT = Path(__file__).parents[1] / "scripts" / "validate_experiment_ledger_v2.py"
SPEC = importlib.util.spec_from_file_location("ledger_v2", SCRIPT)
ledger = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
SPEC.loader.exec_module(ledger)


def valid_entry():
    return {
        "schemaVersion": 2,
        "entryId": "test-entry",
        "recordedAt": "2026-09-05T10:58:04Z",
        "studyId": "test-study",
        "componentId": "test-component",
        "method": "test method",
        "purpose": "test purpose",
        "executionState": "completed",
        "integrityState": "passed",
        "scientificDecision": "technical-pass",
        "outcomeAccessClass": "permanently-open-technical",
        "claimClass": "technical",
        "claimEligible": True,
        "source": {
            "gitCommit": "a" * 40,
            "runtimeSha256": "b" * 64,
            "analysisGitCommit": "c" * 40,
            "analysisProgramSha256": "d" * 64,
        },
        "comparators": [{
            "id": "baseline",
            "ancestry": "known",
            "gitCommit": "e" * 40,
            "runtimeSha256": "f" * 64,
        }],
        "population": {
            "expectedLaunches": 1,
            "accountedLaunches": 1,
            "unit": "game",
            "manifestSha256": "1" * 64,
            "maps": ["map"],
            "countries": ["country"],
            "notes": [],
        },
        "scheduler": {
            "account": "pi_jss233",
            "partition": "day",
            "jobs": [{
                "jobId": "1",
                "role": "audit",
                "state": "COMPLETED",
                "exitCode": "0:0",
                "expectedTasks": 1,
                "accountedTasks": 1,
            }],
        },
        "artifacts": [],
        "results": {"technical": "pass"},
        "relationships": {"supersedes": [], "derivedFrom": []},
        "advancement": {"decision": "advance", "nextMilestone": "M1"},
        "limitations": [],
    }


class LedgerV2Tests(unittest.TestCase):
    def test_valid_entry(self):
        ledger.validate_entry(valid_entry(), False)

    def test_rejects_unknown_keys(self):
        value = valid_entry()
        value["mystery"] = True
        with self.assertRaises(ledger.LedgerError):
            ledger.validate_entry(value, False)

    def test_outcome_blind_result_is_forbidden(self):
        value = valid_entry()
        value["outcomeAccessClass"] = "outcome-blind"
        with self.assertRaisesRegex(ledger.LedgerError, "cannot serialize results"):
            ledger.validate_entry(value, False)

    def test_failed_integrity_cannot_be_claim_eligible(self):
        value = valid_entry()
        value["integrityState"] = "failed"
        with self.assertRaisesRegex(ledger.LedgerError, "claim requires passed integrity"):
            ledger.validate_entry(value, False)

    def test_completed_population_counts_must_reconcile(self):
        value = valid_entry()
        value["population"]["accountedLaunches"] = 0
        with self.assertRaisesRegex(ledger.LedgerError, "launch mismatch"):
            ledger.validate_entry(value, False)

    def test_artifact_verification_checks_size_and_hash(self):
        value = valid_entry()
        with tempfile.TemporaryDirectory() as directory:
            artifact = Path(directory) / "artifact.txt"
            artifact.write_text("evidence\n")
            value["artifacts"] = [{
                "path": str(artifact),
                "sha256": ledger.sha256_file(artifact),
                "bytes": artifact.stat().st_size,
                "kind": "test",
            }]
            ledger.validate_entry(value, True)
            artifact.write_text("changed\n")
            with self.assertRaisesRegex(ledger.LedgerError, "artifact .* mismatch"):
                ledger.validate_entry(value, True)

    def test_file_requires_canonical_json_and_unique_ids(self):
        value = valid_entry()
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "ledger.jsonl"
            path.write_text(ledger.canonical(value) + "\n")
            result = ledger.validate(path, False)
            self.assertEqual(result["entries"], 1)
            path.write_text(ledger.canonical(value) + "\n" + ledger.canonical(value) + "\n")
            with self.assertRaisesRegex(ledger.LedgerError, "duplicate entryId"):
                ledger.validate(path, False)

    def test_unverified_legacy_row_is_retained_but_not_claim_eligible(self):
        value = valid_entry()
        value.update({
            "executionState": "completed",
            "integrityState": "unverified",
            "scientificDecision": "not-evaluated",
            "outcomeAccessClass": "legacy-unknown",
            "claimClass": "none",
            "claimEligible": False,
            "results": {},
        })
        ledger.validate_entry(value, False)


if __name__ == "__main__":
    unittest.main()
