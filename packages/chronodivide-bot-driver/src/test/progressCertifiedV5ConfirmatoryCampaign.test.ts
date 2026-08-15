import path from "node:path";
import { describe, expect, it } from "vitest";
import {
    PROGRESS_CERTIFIED_V5_CONFIRMATORY_COUNTRIES,
    PROGRESS_CERTIFIED_V5_CONFIRMATORY_ENGINE_SEED_BASE,
    PROGRESS_CERTIFIED_V5_CONFIRMATORY_FAMILY_COUNT,
    PROGRESS_CERTIFIED_V5_CONFIRMATORY_LAUNCH_COUNT,
    PROGRESS_CERTIFIED_V5_CONFIRMATORY_MAX_TICKS,
    PROGRESS_CERTIFIED_V5_CONFIRMATORY_ONE_SIDED_95_T_CRITICAL_DF55,
    PROGRESS_CERTIFIED_V5_CONFIRMATORY_PROTOCOL_SHA256,
    PROGRESS_CERTIFIED_V5_CONFIRMATORY_SHARD_COUNT,
    PROGRESS_CERTIFIED_V5_CONFIRMATORY_SUCCESS_RULE,
    PROGRESS_CERTIFIED_V5_FIDELITY_JOB_ID,
    PROGRESS_CERTIFIED_V5_FIDELITY_SOURCE_COMMIT,
    PROGRESS_CERTIFIED_V5_FRESH_CATALOG_SHA256,
    PROGRESS_CERTIFIED_V5_FRESH_TARGETS_SHA256,
    loadProgressCertifiedV5ConfirmatoryFamilies,
    validateProgressCertifiedV5FidelityGate,
} from "../training/progressCertifiedV5ConfirmatoryCampaign.js";

const targetsPath = path.resolve(
    process.cwd(),
    "..",
    "..",
    "research",
    "artifacts",
    "method_v5_role_blind_fidelity_targets_v1.json",
);

describe("progress-certified V5 sealed confirmatory campaign freeze", () => {
    it("uses every technically passed fresh family across all countries and slots", () => {
        const families = loadProgressCertifiedV5ConfirmatoryFamilies(targetsPath);
        expect(families).toHaveLength(56);
        expect(new Set(families.map(({ familyId }) => familyId)).size).toBe(56);
        expect(new Set(families.map(({ mapSha256 }) => mapSha256)).size).toBe(56);
        expect(PROGRESS_CERTIFIED_V5_CONFIRMATORY_FAMILY_COUNT).toBe(56);
        expect(PROGRESS_CERTIFIED_V5_CONFIRMATORY_COUNTRIES).toHaveLength(9);
        expect(PROGRESS_CERTIFIED_V5_CONFIRMATORY_SHARD_COUNT).toBe(504);
        expect(PROGRESS_CERTIFIED_V5_CONFIRMATORY_LAUNCH_COUNT).toBe(3_024);
        expect(PROGRESS_CERTIFIED_V5_CONFIRMATORY_ENGINE_SEED_BASE).toBe(4_216_000_000);
        expect(PROGRESS_CERTIFIED_V5_CONFIRMATORY_MAX_TICKS).toBe(24_000);
    });

    it("freezes the co-primary 95% success rule and design commitments", () => {
        expect(PROGRESS_CERTIFIED_V5_CONFIRMATORY_SUCCESS_RULE).toHaveLength(3);
        expect(PROGRESS_CERTIFIED_V5_CONFIRMATORY_SUCCESS_RULE[1]).toContain("V5-minus-external");
        expect(PROGRESS_CERTIFIED_V5_CONFIRMATORY_SUCCESS_RULE[2]).toContain("minus 0.5");
        expect(PROGRESS_CERTIFIED_V5_CONFIRMATORY_ONE_SIDED_95_T_CRITICAL_DF55)
            .toBeCloseTo(1.6730339652899118, 15);
        expect(PROGRESS_CERTIFIED_V5_CONFIRMATORY_PROTOCOL_SHA256).toMatch(/^[0-9a-f]{64}$/);
        expect(PROGRESS_CERTIFIED_V5_FRESH_CATALOG_SHA256).toMatch(/^[0-9a-f]{64}$/);
        expect(PROGRESS_CERTIFIED_V5_FRESH_TARGETS_SHA256).toMatch(/^[0-9a-f]{64}$/);
    });

    it("accepts only a complete outcome-free 56-family fidelity gate", () => {
        const families = loadProgressCertifiedV5ConfirmatoryFamilies(targetsPath);
        const gate = {
            schemaVersion: 2,
            gate: "map-fidelity-gate-v1",
            artifactKind: "infrastructure_fidelity_full_summary_not_policy_evaluation",
            eligibleForFidelityClearance: true,
            fullCoverage: true,
            outcomeFree: true,
            notSealedTestEvidence: true,
            passed: true,
            screenComplete: true,
            technicalChecksPassed: true,
            verdict: "PASS",
            populationFamilyCount: 56,
            runFamilyCount: 56,
            familyCounts: { requested: 56, run: 56, pass: 56, review: 0, fail: 0 },
            scheduler: { account: "pi_jss233", jobId: PROGRESS_CERTIFIED_V5_FIDELITY_JOB_ID },
            provenance: {
                sourceCommit: PROGRESS_CERTIFIED_V5_FIDELITY_SOURCE_COMMIT,
                catalogSha256: PROGRESS_CERTIFIED_V5_FRESH_CATALOG_SHA256,
                targetManifestSha256: PROGRESS_CERTIFIED_V5_FRESH_TARGETS_SHA256,
            },
            globalFailures: [],
            globalReviews: [],
            warningCategoryCounts: {},
            families: families.map((family) => ({
                familyId: family.familyId,
                mapName: family.mapName,
                mapSha256: family.mapSha256,
                status: "pass",
                slurmJobId: PROGRESS_CERTIFIED_V5_FIDELITY_JOB_ID,
                failures: [],
                reviews: [],
                warningCategoryCounts: {},
            })),
        };
        expect(() => validateProgressCertifiedV5FidelityGate(gate, families)).not.toThrow();
        expect(() => validateProgressCertifiedV5FidelityGate({
            ...gate,
            outcomeFree: false,
        }, families)).toThrow("does not authorize");
    });
});
