import hashlib
import json
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
ARTIFACT = ROOT / "research" / "artifacts" / "final_paper_evidence_v1.json"
EXPECTED_SHA256 = "0670bdeefab47ca68fb5fc584be6a299e777ee0d69f04cd45de7caebf32c31e3"


def walk(value):
    if isinstance(value, dict):
        for key, child in value.items():
            yield key, child
            yield from walk(child)
    elif isinstance(value, list):
        for child in value:
            yield from walk(child)


class FinalPaperEvidenceTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.payload = json.loads(ARTIFACT.read_text(encoding="utf-8"))

    def test_frozen_identity_and_primary_results(self):
        self.assertEqual(hashlib.sha256(ARTIFACT.read_bytes()).hexdigest(), EXPECTED_SHA256)
        self.assertEqual(self.payload["status"], "PASS_FINAL_PAPER_EVIDENCE")
        self.assertTrue(self.payload["complete"])
        self.assertEqual(len(self.payload["inputs"]), 11)

        hfo = self.payload["hfoConfirmation"]
        self.assertEqual(
            (hfo["overall"]["wins"], hfo["overall"]["draws"], hfo["overall"]["losses"]),
            (633, 24, 63),
        )
        self.assertGreater(hfo["overall"]["oneSided95WilsonLower"], 0.85)
        self.assertGreater(hfo["clustered"]["oneSided95Lower"], 0.84)

        peak = self.payload["peakStudy"]["replication"]
        self.assertEqual(
            (peak["control"]["wins"], peak["control"]["draws"], peak["control"]["losses"]),
            (92, 16, 72),
        )
        self.assertEqual(
            (
                peak["candidate"]["overall"]["wins"],
                peak["candidate"]["overall"]["draws"],
                peak["candidate"]["overall"]["losses"],
            ),
            (134, 14, 32),
        )
        self.assertGreater(peak["candidate"]["paired"]["oneSidedLower"], 0.16)
        self.assertGreater(peak["candidate"]["clustered"]["oneSided95Lower"], 0.63)
        self.assertEqual(peak["candidate"]["weakExactCount"], 90)

    def test_mechanisms_and_negative_transfer(self):
        expected = {
            "alliedWestRushGuard": ((1, 11, 38), (47, 2, 1), 0.76, (5, 31)),
            "sovietWestRushGuard": ((47, 43, 30), (98, 9, 13), 0.21, (4, 32)),
            "bottomProgressRetarget": ((123, 98, 49), (198, 23, 49), 0.11, (9, 27)),
        }
        for name, (control_wdl, winner_wdl, lower, isolation_counts) in expected.items():
            row = self.payload["mechanisms"][name]
            control = row["replication"]["control"]
            winner = row["replication"]["winner"]
            self.assertEqual((control["wins"], control["draws"], control["losses"]), control_wdl)
            self.assertEqual((winner["wins"], winner["draws"], winner["losses"]), winner_wdl)
            self.assertGreater(row["replication"]["paired"]["oneSidedLower"], lower)
            self.assertEqual(
                (row["isolation"]["activeCaseCount"], row["isolation"]["inactiveCaseCount"]),
                isolation_counts,
            )
            self.assertTrue(row["isolation"]["outcomeFree"])

        transfer = self.payload["advancedTransfer"]
        self.assertEqual(transfer["status"], "FAIL_HFO_RA2WEB_ADVANCED_CROSSPLAY")
        self.assertEqual(
            (
                transfer["candidate"]["overall"]["wins"],
                transfer["candidate"]["overall"]["draws"],
                transfer["candidate"]["overall"]["losses"],
            ),
            (79, 19, 262),
        )
        self.assertLess(transfer["paired"]["meanScoreDifference"], -0.29)

    def test_frames_are_present_and_hash_bound(self):
        frames = self.payload["frameEvidence"]
        self.assertEqual(frames["frameCount"], 15)
        self.assertEqual(frames["replayCount"], 9)
        self.assertEqual(frames["peakDivergenceUpdate"], 900)
        self.assertEqual(frames["forceClearance"]["eventUpdate"], 18_900)
        self.assertTrue(frames["forceClearance"]["retained"])

        for frame in frames["frames"]:
            path = ROOT / frame["file"]
            self.assertTrue(path.is_file(), frame["file"])
            self.assertEqual(path.stat().st_size, frame["bytes"])
            self.assertEqual(hashlib.sha256(path.read_bytes()).hexdigest(), frame["pngSha256"])

    def test_public_artifact_contains_no_raw_rows_or_cluster_paths(self):
        for key, value in walk(self.payload):
            self.assertNotIn(key, {"rows", "pairs", "schedulerJobIds"})
            if isinstance(value, str):
                self.assertNotIn("/nfs/", value)
                self.assertNotIn("/home/zc362", value)


if __name__ == "__main__":
    unittest.main()
