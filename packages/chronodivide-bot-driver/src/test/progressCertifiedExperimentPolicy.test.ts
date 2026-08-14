import { describe, expect, it } from "vitest";
import {
    PROGRESS_CERTIFIED_ARM_ORDER,
    buildProgressCertifiedArms,
    progressCertifiedExperimentPolicySha256,
} from "../training/progressCertifiedExperimentPolicy.js";

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
});
