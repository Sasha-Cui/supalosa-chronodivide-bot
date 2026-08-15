import { describe, expect, it } from "vitest";
import {
    PROGRESS_CERTIFIED_V5_ARM_ORDER,
    buildProgressCertifiedV5Arms,
    progressCertifiedV5LegacyFieldsEqual,
} from "../training/progressCertifiedV5ExperimentPolicy.js";

describe("progress-certified V5 causal arms", () => {
    it("freezes exact control, V4 predecessor, and V5 repair in declared order", () => {
        const arms = buildProgressCertifiedV5Arms();
        expect(arms.map(({ armId }) => armId)).toEqual(PROGRESS_CERTIFIED_V5_ARM_ORDER);
        expect(new Set(arms.map(({ policyId }) => policyId)).size).toBe(3);
        expect(arms.every(({ policy }) => policy.candidateCore === "external_supalosa")).toBe(true);
        expect(arms[0].policy.objectivePolicy.enabled).toBe(false);
        expect(arms[1].policy.objectivePolicy.schemaVersion).toBe(4);
        expect(arms[2].policy.objectivePolicy.schemaVersion).toBe(5);
    });

    it("isolates only visibility-aware unseen-target ordering between V4 and V5", () => {
        const arms = buildProgressCertifiedV5Arms();
        const legacy = arms[1].policy.objectivePolicy;
        const visibilityAware = arms[2].policy.objectivePolicy;
        if (legacy.schemaVersion !== 4 || visibilityAware.schemaVersion !== 5) {
            throw new Error("Frozen V4/V5 causal arms have the wrong schemas");
        }
        expect(progressCertifiedV5LegacyFieldsEqual(legacy, visibilityAware)).toBe(true);
        expect(visibilityAware.unseenExactBuildingOrderMode).toBe("attack_move_then_visible_attack");
    });

    it("keeps both interventions final-building-only with the same hybrid blocker logic", () => {
        const [, legacy, visibilityAware] = buildProgressCertifiedV5Arms();
        for (const { policy } of [legacy, visibilityAware]) {
            expect(policy.objectivePolicy.enabled).toBe(true);
            expect(policy.objectivePolicy.conversionScope).toBe("final_building_only");
            expect(policy.objectivePolicy.activationBuildingCount).toBe(1);
            expect(policy.objectivePolicy.terminalForceMode).toBe("progress_certified_hybrid");
            expect(policy.objectivePolicy.terminalReserveCombatants).toBe(0);
        }
    });
});
