import copy
import importlib.util
from pathlib import Path
import unittest


SCRIPT = Path(__file__).parents[1] / "scripts" / "action_burst_seed_certificate_v1.py"
SPEC = importlib.util.spec_from_file_location("seed_certificate", SCRIPT)
certificate = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
SPEC.loader.exec_module(certificate)


def valid_audit():
    assessments = []
    for index, base in enumerate(certificate.CANDIDATE_BASES):
        collisions = 0 if index in {0, 6} else 1
        assessments.append({
            "base": base,
            "interval": [base, base + 1_000_000],
            "signedInt32EquivalentInterval": [
                base - 2**32, base + 1_000_000 - 2**32,
            ],
            "collisionRecords": collisions,
            "collisionPaths": [] if collisions == 0 else ["/prior"],
            "passed": collisions == 0,
            "selected": index == 0,
        })
    return {
        "kind": "action-burst-seed-reservation-audit-v1-a2",
        "complete": True,
        "passed": True,
        "outcomeFree": True,
        "sourceCommit": certificate.AUDIT_SOURCE,
        "programSha256": certificate.AUDIT_PROGRAM,
        "amendmentA2Sha256": certificate.AUDIT_A2,
        "scheduler": {
            "jobId": "24946861", "account": "pi_jss233", "partition": "day",
        },
        "scannedFileCount": certificate.AUDIT_FILES,
        "scannedBytes": certificate.AUDIT_SCANNED_BYTES,
        "errors": [],
        "orderedCandidateIntervals": assessments,
        "selectedInterval": certificate.SELECTED,
        "selectedSignedInt32EquivalentInterval": [
            certificate.SELECTED[0] - 2**32,
            certificate.SELECTED[1] - 2**32,
        ],
    }


class SeedCertificateTests(unittest.TestCase):
    def test_projects_only_compact_selection_evidence(self):
        value = certificate.project_audit(valid_audit())
        self.assertTrue(value["complete"])
        self.assertEqual(value["selectedInterval"], certificate.SELECTED)
        self.assertEqual(len(value["candidateAssessments"]), 26)
        self.assertNotIn("scannedFiles", value)
        self.assertNotIn("collisions", value)

    def test_rejects_nonfirst_selection(self):
        value = valid_audit()
        value["orderedCandidateIntervals"][0]["selected"] = False
        value["orderedCandidateIntervals"][6]["selected"] = True
        with self.assertRaises(certificate.CertificateError):
            certificate.project_audit(value)

    def test_rejects_collision_flag_or_coverage_drift(self):
        value = valid_audit()
        value["orderedCandidateIntervals"][0]["collisionRecords"] = 1
        with self.assertRaises(certificate.CertificateError):
            certificate.project_audit(value)
        value = valid_audit()
        value["scannedFileCount"] -= 1
        with self.assertRaises(certificate.CertificateError):
            certificate.project_audit(value)

    def test_rejects_prohibited_keys(self):
        with self.assertRaisesRegex(certificate.CertificateError, "prohibited"):
            certificate.reject_prohibited({"safe": [{"winner": "x"}]})


if __name__ == "__main__":
    unittest.main()
