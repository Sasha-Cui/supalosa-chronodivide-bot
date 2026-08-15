import { describe, expect, it } from "vitest";
import {
    PROGRESS_CERTIFIED_ARM_ORDER,
    buildProgressCertifiedArms,
    progressCertifiedExperimentPolicySha256,
    validateProgressCertifiedExperimentPolicy,
} from "../training/progressCertifiedExperimentPolicy.js";
import { buildProgressCertifiedConversionPolicyV5 } from "../training/progressCertifiedConversionPolicyV5.js";

describe("progress-certified experiment arms", () => {
    it("freezes six unique exact-external causal arms in declared order", () => {
        const arms = buildProgressCertifiedArms();
        expect(arms.map(({ armId }) => armId)).toEqual(PROGRESS_CERTIFIED_ARM_ORDER);
        expect(new Set(arms.map(({ policyId }) => policyId)).size).toBe(arms.length);
        expect(arms.every(({ policy }) => policy.candidateCore === "external_supalosa")).toBe(true);
        expect(arms.every(({ policy, policyId }) =>
            progressCertifiedExperimentPolicySha256(policy) === policyId,
        )).toBe(true);
    });

    it("uses a disabled exact control and enables every intervention arm", () => {
        const arms = buildProgressCertifiedArms();
        expect(arms[0].policy.objectivePolicy.enabled).toBe(false);
        expect(arms.slice(1).every(({ policy }) => policy.objectivePolicy.enabled)).toBe(true);
    });

    it("isolates final-building scope, low-count scope, force routing, and progress deadlines", () => {
        const arms = new Map(buildProgressCertifiedArms().map((arm) => [arm.armId, arm.policy.objectivePolicy]));
        expect(arms.get("external_final_building_direct")?.conversionScope).toBe("final_building_only");
        expect(arms.get("external_final_building_hybrid")?.activationBuildingCount).toBe(1);
        expect(arms.get("external_low_count_direct")?.activationBuildingCount).toBe(5);
        expect(arms.get("external_low_count_direct")?.terminalForceMode).toBe("direct_building");
        expect(arms.get("external_low_count_route_no_deadline")?.blockerNoDamageDeadlineTicks).toBe(100_000);
        expect(arms.get("external_low_count_progress_hybrid")?.blockerNoDamageDeadlineTicks).toBe(360);
        expect(arms.get("external_low_count_progress_hybrid")?.buildingNoDamageDeadlineTicks).toBe(600);
    });

    it("accepts a schema-v5 objective without changing the frozen six-arm builder", () => {
        const policy = validateProgressCertifiedExperimentPolicy({
            schemaVersion: 1,
            candidateCore: "external_supalosa",
            objectivePolicy: buildProgressCertifiedConversionPolicyV5(),
        });
        expect(policy.objectivePolicy.schemaVersion).toBe(5);
        expect(progressCertifiedExperimentPolicySha256(policy)).toMatch(/^[0-9a-f]{64}$/);
        expect(buildProgressCertifiedArms().every(({ policy: armPolicy }) =>
            armPolicy.objectivePolicy.schemaVersion === 4,
        )).toBe(true);
    });
});
