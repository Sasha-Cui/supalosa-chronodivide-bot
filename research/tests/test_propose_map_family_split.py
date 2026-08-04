#!/usr/bin/env python3
"""Tests for role-blind fidelity targets and compromised capacity checks."""

from __future__ import annotations

import hashlib
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path


MODULE_PATH = (
    Path(__file__).resolve().parents[1]
    / "scripts/propose_map_family_split.py"
)
SPEC = importlib.util.spec_from_file_location(
    "propose_map_family_split", MODULE_PATH
)
assert SPEC is not None and SPEC.loader is not None
SPLIT = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(SPLIT)


SEED = "unit-test-committed-seed"


def build_catalog(size: int) -> dict[str, object]:
    maps = []
    families = []
    for index in range(size):
        family_id = f"fixture_family_{index:03d}"
        path = f"data/fixture_{index:03d}.map"
        content_hash = hashlib.sha256(path.encode()).hexdigest()
        maps.append({
            "path": path,
            "sha256": content_hash,
            "descriptors": {
                "size": {
                    "width": 80 + index % 17,
                    "height": 80 + index % 13,
                }
            },
            "loadVerification": [{"ok": True}],
        })
        families.append({
            "familyId": family_id,
            "familyKey": family_id,
            "displayNames": [family_id],
            "mapPaths": [path],
            "mapCount": 1,
            "contentHashes": [content_hash],
            "contentHashCount": 1,
            "revisionKeys": [family_id],
            "startCounts": [2 if index % 2 == 0 else 4],
            "theaters": ["TEMPERATE" if index % 3 else "URBAN"],
            "strictDevelopmentEligibility": {
                "eligible": True,
                "reasons": [],
            },
            "evidenceBasedDevelopmentEligibility": {
                "eligible": True,
                "reasons": [],
            },
            "loadVerificationSummary": {
                "records": 1,
                "passed": 1,
                "failed": 0,
                "unknown": 0,
            },
            "historicalExperimentEvidence": [],
            "textualReferenceEvidence": [],
        })
    return {
        "schemaVersion": 2,
        "outcomeBlind": True,
        "maps": maps,
        "families": families,
    }


def build_config() -> dict[str, object]:
    return {
        "schemaVersion": 2,
        "status": "DRAFT_NOT_FROZEN",
        "purpose": "COMPROMISED_CAPACITY_DRY_RUN_ONLY",
        "finalReuseProhibited": True,
        "capacityDryRunSeedCommitmentSha256": hashlib.sha256(
            SEED.encode()
        ).hexdigest(),
        "capacityDryRunSeedFile": "/private/test.seed",
        "capacityDryRunAssignmentOutput": "/private/test.capacity.json",
        "roleBlindFidelityTargetOutput": (
            "research/artifacts/test.fidelity.json"
        ),
        "targetCounts": {
            SPLIT.ROLE_TRAIN: 16,
            SPLIT.ROLE_VALIDATION: 8,
            SPLIT.ROLE_TEST: 26,
        },
        "reserveRole": SPLIT.ROLE_RESERVE,
        "capacityIdentityBurnPolicy": (
            "SELECTED_16_8_26_ONLY_RESERVES_NOT_RECORDED"
        ),
        "minimumUnexposedEligibleFamiliesForFinalSplit": 50,
        "requirePassedLoadMetadataForDryRun": True,
        "requireFullMapFidelityBeforeFreeze": True,
        "futureFinalSplitSeedPolicy": (
            "NEW_PROSPECTIVE_SEED_COMMITMENT_AFTER_FIDELITY_"
            "ADJUDICATION_AND_POLICY_SOURCE_METHOD_PROTOCOL_FREEZE"
        ),
        "familyAdjudications": {},
    }


class ExactAllocationTests(unittest.TestCase):
    def test_exact_counts_no_overlap_reserve_and_hidden_public_ids(self) -> None:
        public, capacity, fidelity = SPLIT.build_manifests(
            build_catalog(110),
            build_config(),
            SEED,
            "catalog-hash",
            "config-hash",
        )
        counts = public["summary"]["capacityRoleCounts"]
        self.assertEqual(counts[SPLIT.ROLE_TEST], 26)
        self.assertEqual(counts[SPLIT.ROLE_VALIDATION], 8)
        self.assertEqual(counts[SPLIT.ROLE_TRAIN], 16)
        self.assertEqual(counts[SPLIT.ROLE_RESERVE], 60)

        assignments = capacity["capacityAssignments"]
        self.assertEqual(len(assignments), 50)
        family_ids = [record["familyId"] for record in assignments]
        self.assertEqual(len(family_ids), len(set(family_ids)))
        selected = [
            record
            for record in assignments
            if record["selectedForCapacityCheck"]
        ]
        self.assertEqual(len(selected), 50)
        self.assertNotIn(
            SPLIT.ROLE_RESERVE,
            {record["capacityDryRunRole"] for record in assignments},
        )
        self.assertEqual(
            {record["capacityDryRunRole"] for record in selected},
            {
                SPLIT.ROLE_TRAIN,
                SPLIT.ROLE_VALIDATION,
                SPLIT.ROLE_TEST,
            },
        )
        for record in assignments:
            expected = SPLIT.stable_hash(
                SEED,
                record["structuralStratum"]["key"],
                record["familyId"],
            )
            self.assertEqual(record["selectionRankSha256"], expected)

        rendered_public = json.dumps(public, sort_keys=True)
        self.assertNotIn("fixture_family_", rendered_public)
        self.assertNotIn(".map", rendered_public)
        self.assertFalse(public["containsCandidateFamilyIdsOrPaths"])
        self.assertFalse(public["canBeUsedAsSealedTestSplit"])
        self.assertNotIn("capacityStratumRoleCounts", public)
        self.assertTrue(public["finalReuseProhibited"])
        self.assertEqual(
            public["finalReuseProhibitionScope"],
            "selected_capacity_identities_only",
        )
        self.assertTrue(capacity["finalReuseProhibited"])
        self.assertEqual(capacity["excludedIdentityCount"], 50)
        self.assertFalse(capacity["reserveIdentitiesRecorded"])
        self.assertEqual(public["summary"]["capacityBurnedIdentityFamilies"], 50)
        self.assertEqual(
            public["summary"]["unexposedEligibleFamiliesRemaining"],
            60,
        )
        self.assertGreaterEqual(
            public["summary"]["unexposedEligibleFamiliesRemaining"],
            public["summary"]["minimumFamiliesRequiredForFinalSplit"],
        )
        self.assertTrue(
            public["summary"][
                "remainingEligiblePoolSufficientForFinalSplit"
            ]
        )
        self.assertEqual(capacity["status"], SPLIT.CAPACITY_PRIVATE_STATUS)
        self.assertEqual(fidelity["status"], SPLIT.FIDELITY_TARGET_STATUS)
        self.assertTrue(fidelity["roleBlind"])
        self.assertFalse(fidelity["finalSplit"])
        self.assertFalse(fidelity["isSplit"])
        self.assertEqual(fidelity["targetCount"], 110)
        self.assertEqual(fidelity["schemaVersion"], 3)
        self.assertNotIn("configSha256", fidelity)
        self.assertEqual(
            fidelity["populationCommitmentSha256"],
            SPLIT.canonical_sha256(fidelity["targets"]),
        )
        self.assertTrue(all(
            set(target) == {"familyId", "representative"}
            and set(target["representative"]) == {"path", "sha256"}
            for target in fidelity["targets"]
        ))

    def test_role_blind_targets_ignore_capacity_gate_and_have_no_roles(self) -> None:
        catalog = build_catalog(110)
        catalog["families"][0]["loadVerificationSummary"] = {
            "records": 1,
            "passed": 0,
            "failed": 1,
            "unknown": 0,
        }
        public, capacity, fidelity = SPLIT.build_manifests(
            catalog,
            build_config(),
            SEED,
            "catalog-hash",
            "config-hash",
        )
        self.assertEqual(len(capacity["capacityAssignments"]), 50)
        self.assertEqual(
            public["summary"]["unexposedEligibleFamiliesRemaining"],
            59,
        )
        self.assertEqual(public["summary"]["roleBlindFidelityTargetFamilies"], 110)
        self.assertEqual(fidelity["targetCount"], 110)
        for target in fidelity["targets"]:
            rendered_keys = " ".join(
                [*target, *target["representative"]]
            ).lower()
            self.assertNotIn("role", rendered_keys)
            self.assertNotIn("rank", rendered_keys)
            self.assertNotIn("selection", rendered_keys)

    def test_config_requires_future_new_seed_and_no_final_reuse(self) -> None:
        config = build_config()
        config["finalReuseProhibited"] = False
        with self.assertRaisesRegex(ValueError, "finalReuseProhibited"):
            SPLIT.validate_config(config)

    def test_exact_boundary_leaves_50_unexposed_for_final_split(self) -> None:
        public, capacity, _ = SPLIT.build_manifests(
            build_catalog(100),
            build_config(),
            SEED,
            "catalog-hash",
            "config-hash",
        )
        self.assertEqual(capacity["excludedIdentityCount"], 50)
        self.assertEqual(len(capacity["capacityAssignments"]), 50)
        self.assertEqual(
            public["summary"]["unexposedEligibleFamiliesRemaining"],
            50,
        )
        self.assertTrue(
            public["summary"][
                "remainingEligiblePoolSufficientForFinalSplit"
            ]
        )

    def test_pool_that_cannot_leave_final_50_fails_closed(self) -> None:
        with self.assertRaisesRegex(ValueError, "unexposed eligible"):
            SPLIT.build_manifests(
                build_catalog(99),
                build_config(),
                SEED,
                "catalog-hash",
                "config-hash",
            )

    def test_cross_family_content_overlap_fails_closed(self) -> None:
        catalog = build_catalog(100)
        catalog["families"][1]["contentHashes"] = list(
            catalog["families"][0]["contentHashes"]
        )
        with self.assertRaisesRegex(ValueError, "cross-family content hash"):
            SPLIT.build_manifests(
                catalog,
                build_config(),
                SEED,
                "catalog-hash",
                "config-hash",
            )


class FidelityBindingTests(unittest.TestCase):
    FAMILY_ID = "fixture_family"
    JOB_ID = "123456"
    SOURCE_SHA = "b" * 64
    RUNTIME_SHA = "c" * 64
    CATALOG_SHA = "f" * 64
    TARGET_POPULATION_SHA = "9" * 64

    def gate_summary(self, representative: dict[str, str]) -> dict[str, object]:
        return {
            "schemaVersion": 1,
            "gate": SPLIT.FIDELITY_GATE,
            "outcomeFree": True,
            "artifactKind": (
                "infrastructure_fidelity_full_summary_not_policy_evaluation"
            ),
            "notSealedTestEvidence": True,
            "scope": "full",
            "populationFamilyCount": 1,
            "runFamilyCount": 1,
            "fullCoverage": True,
            "screenComplete": True,
            "eligibleForFidelityClearance": True,
            "verdict": "PASS",
            "technicalChecksPassed": True,
            "passed": True,
            "scheduler": {
                "source": "scontrol",
                "account": "pi_jss233",
                "jobId": self.JOB_ID,
                "partition": "day",
                "qos": "normal",
            },
            "manifestPath": "/scratch/input-manifest.json",
            "manifestSha256": "1" * 64,
            "resultPath": "/scratch/probe-results.json",
            "resultSha256": "2" * 64,
            "provenance": {
                "sourceCommit": "a" * 40,
                "targetManifestSha256": "e" * 64,
                "targetPopulationCommitmentSha256": self.TARGET_POPULATION_SHA,
                "catalogSha256": self.CATALOG_SHA,
                "sourceFiles": [{
                    "path": "/repo/source.ts", "bytes": 1, "sha256": "6" * 64,
                }],
                "compiledRuntime": [{
                    "path": "/repo/runtime.js", "bytes": 1, "sha256": "7" * 64,
                }],
                "nodeRuntime": {
                    "path": "/runtime/node", "bytes": 1, "sha256": "8" * 64,
                },
                "pythonRuntime": {
                    "path": "/runtime/python", "bytes": 1, "sha256": "a" * 64,
                },
                "scontrolRuntime": {
                    "path": "/runtime/scontrol", "bytes": 1, "sha256": "b" * 64,
                },
                "gameApiRuntime": {
                    "path": "/repo/game-api.js", "bytes": 1, "sha256": "c" * 64,
                },
                "gameApiRuntimeTreeSha256": "3" * 64,
                "runtimeDependencyTreeSha256": "4" * 64,
                "mixTreeSha256": "5" * 64,
                "sourceBundleSha256": self.SOURCE_SHA,
                "runtimeBundleSha256": self.RUNTIME_SHA,
                "logging": {"debugLogging": "1", "source": "sbatch_pinned"},
            },
            "familyCounts": {
                "requested": 1,
                "run": 1,
                "pass": 1,
                "review": 0,
                "fail": 0,
            },
            "warningCategoryCounts": {},
            "globalFailures": [],
            "globalReviews": [],
            "families": [{
                "familyId": self.FAMILY_ID,
                "representativeMapPath": representative["path"],
                "mapName": "fixture.map",
                "mapSha256": representative["sha256"],
                "slurmJobId": self.JOB_ID,
                "status": "pass",
                "failures": [],
                "reviews": [],
                "warningCategoryCounts": {},
            }],
            "interpretation": "fixture",
        }

    def decision_for(
        self,
        artifact_path: Path,
        summary: dict[str, object],
        representative: dict[str, str],
    ) -> dict[str, object]:
        artifact_path.write_text(
            json.dumps(summary, indent=2) + "\n",
            encoding="utf-8",
        )
        return {
            "fullMapFidelityStatus": "pass",
            "fidelityEvidence": {
                "representativeMapPath": representative["path"],
                "representativeMapSha256": representative["sha256"],
                "slurmJobId": self.JOB_ID,
                "resultArtifactPath": str(artifact_path),
                "resultArtifactSha256": hashlib.sha256(
                    artifact_path.read_bytes()
                ).hexdigest(),
                "sourceSha256": self.SOURCE_SHA,
                "runtimeSha256": self.RUNTIME_SHA,
            },
        }

    def test_bare_fidelity_pass_is_rejected(self) -> None:
        representative = {
            "path": "data/fixture.map",
            "sha256": "a" * 64,
        }
        with self.assertRaisesRegex(ValueError, "requires representative"):
            SPLIT.validate_fidelity_pass(
                {"fullMapFidelityStatus": "pass"},
                representative,
                self.FAMILY_ID,
                self.CATALOG_SHA,
                {self.FAMILY_ID},
                self.TARGET_POPULATION_SHA,
            )

    def test_valid_full_gate_summary_is_accepted(self) -> None:
        representative = {"path": "data/fixture.map", "sha256": "d" * 64}
        with tempfile.TemporaryDirectory() as directory:
            artifact = Path(directory) / "gate-summary.json"
            decision = self.decision_for(
                artifact,
                self.gate_summary(representative),
                representative,
            )
            validated = SPLIT.validate_fidelity_pass(
                decision,
                representative,
                self.FAMILY_ID,
                self.CATALOG_SHA,
                {self.FAMILY_ID},
                self.TARGET_POPULATION_SHA,
            )
        self.assertIsNotNone(validated)
        self.assertEqual(validated["sourceSha256"], self.SOURCE_SHA)
        self.assertEqual(validated["runtimeSha256"], self.RUNTIME_SHA)

    def test_complete_mixed_screen_clears_only_passing_family(self) -> None:
        representative = {"path": "data/fixture.map", "sha256": "d" * 64}
        summary = self.gate_summary(representative)
        summary["populationFamilyCount"] = 2
        summary["runFamilyCount"] = 2
        summary["verdict"] = "FAIL"
        summary["passed"] = False
        summary["eligibleForFidelityClearance"] = False
        summary["familyCounts"] = {
            "requested": 2,
            "run": 2,
            "pass": 1,
            "review": 0,
            "fail": 1,
        }
        summary["families"].append({
            "familyId": "incompatible_family",
            "representativeMapPath": "data/incompatible.map",
            "mapName": "incompatible.map",
            "mapSha256": "0" * 64,
            "slurmJobId": self.JOB_ID,
            "status": "fail",
            "failures": ["parse_warning"],
            "reviews": [],
            "warningCategoryCounts": {"parse_warning": 1},
        })
        with tempfile.TemporaryDirectory() as directory:
            artifact = Path(directory) / "mixed-screen.json"
            decision = self.decision_for(artifact, summary, representative)
            validated = SPLIT.validate_fidelity_pass(
                decision,
                representative,
                self.FAMILY_ID,
                self.CATALOG_SHA,
                {self.FAMILY_ID, "incompatible_family"},
                self.TARGET_POPULATION_SHA,
            )
        self.assertIsNotNone(validated)

    def test_gate_summary_contract_fails_closed(self) -> None:
        representative = {"path": "data/fixture.map", "sha256": "d" * 64}
        cases = [
            ("scope", ("scope",), "preflight"),
            ("coverage", ("fullCoverage",), False),
            ("screen-complete", ("screenComplete",), False),
            ("clearance", ("eligibleForFidelityClearance",), False),
            ("verdict", ("verdict",), "REVIEW"),
            ("technical-pass", ("technicalChecksPassed",), False),
            ("passed", ("passed",), False),
            ("population", ("populationFamilyCount",), 2),
            ("scheduler-job", ("scheduler", "jobId"), "999999"),
            ("source-commit", ("provenance", "sourceCommit"), "dirty"),
            (
                "target-population",
                ("provenance", "targetPopulationCommitmentSha256"),
                "0" * 64,
            ),
            ("catalog", ("provenance", "catalogSha256"), "0" * 64),
            (
                "source-bundle",
                ("provenance", "sourceBundleSha256"),
                "e" * 64,
            ),
            (
                "runtime-bundle",
                ("provenance", "runtimeBundleSha256"),
                "f" * 64,
            ),
            ("family-id", ("families", 0, "familyId"), "wrong_family"),
            (
                "family-path",
                ("families", 0, "representativeMapPath"),
                "data/wrong.map",
            ),
            ("family-sha", ("families", 0, "mapSha256"), "e" * 64),
            ("family-job", ("families", 0, "slurmJobId"), "999999"),
            ("family-status", ("families", 0, "status"), "review"),
            ("family-failures", ("families", 0, "failures"), ["fixture"]),
            ("family-reviews", ("families", 0, "reviews"), ["fixture"]),
        ]
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            for index, (label, key_path, replacement) in enumerate(cases):
                with self.subTest(label=label):
                    summary = json.loads(json.dumps(
                        self.gate_summary(representative)
                    ))
                    cursor = summary
                    for key in key_path[:-1]:
                        cursor = cursor[key]
                    cursor[key_path[-1]] = replacement
                    artifact = root / f"gate-summary-{index}.json"
                    decision = self.decision_for(
                        artifact,
                        summary,
                        representative,
                    )
                    with self.assertRaises(ValueError):
                        SPLIT.validate_fidelity_pass(
                            decision,
                            representative,
                            self.FAMILY_ID,
                            self.CATALOG_SHA,
                            {self.FAMILY_ID},
                            self.TARGET_POPULATION_SHA,
                        )

    def test_gate_summary_rejects_extra_outcome_and_role_fields(self) -> None:
        representative = {"path": "data/fixture.map", "sha256": "d" * 64}
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            for index, mutate in enumerate((
                lambda summary: summary.__setitem__("winner", "alpha"),
                lambda summary: summary["families"][0].__setitem__("role", "test"),
                lambda summary: summary["provenance"]["sourceFiles"][0].__setitem__("score", 1),
            )):
                with self.subTest(index=index):
                    summary = self.gate_summary(representative)
                    mutate(summary)
                    artifact = root / f"contaminated-{index}.json"
                    decision = self.decision_for(artifact, summary, representative)
                    with self.assertRaises(ValueError):
                        SPLIT.validate_fidelity_pass(
                            decision,
                            representative,
                            self.FAMILY_ID,
                            self.CATALOG_SHA,
                            {self.FAMILY_ID},
                            self.TARGET_POPULATION_SHA,
                        )

    def test_representative_prefers_passed_load_metadata(self) -> None:
        family = {"familyId": "fixture", "mapPaths": ["raw.map", "compat.map"]}
        maps = {
            "raw.map": {
                "path": "raw.map",
                "sha256": "a" * 64,
                "loadVerification": [],
            },
            "compat.map": {
                "path": "compat.map",
                "sha256": "b" * 64,
                "loadVerification": [{"ok": True}],
            },
        }
        representative = SPLIT.representative_map(family, maps)
        self.assertEqual(representative["path"], "compat.map")
        self.assertEqual(representative["sha256"], "b" * 64)


if __name__ == "__main__":
    unittest.main()
