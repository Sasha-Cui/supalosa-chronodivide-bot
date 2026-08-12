import { describe, expect, test } from "vitest";
import {
    buildMethodV3MechanismArms,
    METHOD_V3_MECHANISM_ARM_ORDER,
} from "../training/methodV3MechanismPolicies.js";
import { buildResearchStrategyOptions, researchPolicySha256 } from "../training/researchPolicy.js";


describe("method-v3 mechanism arms", () => {
    test("freezes nine unique coordinate-free policies in the declared order", () => {
        const arms = buildMethodV3MechanismArms();
        expect(arms.map(({ armId }) => armId)).toEqual(METHOD_V3_MECHANISM_ARM_ORDER);
        expect(new Set(arms.map(({ policyId }) => policyId)).size).toBe(9);
        for (const arm of arms) {
            expect(arm.policyId).toBe(researchPolicySha256(arm.policy));
            expect(buildResearchStrategyOptions(arm.policy).defaultMapProfiles).toBe(false);
        }
    });

    test("isolates the intended preemption, target, sweep, yard, and siege changes", () => {
        const arms = new Map(buildMethodV3MechanismArms().map((arm) => [arm.armId, arm.policy]));
        expect(arms.get("v2_start")?.buildingEliminationEnabled).toBe(false);
        expect(arms.get("all_in_preempt")?.allInDisbandExistingAttacks).toBe(true);
        expect(arms.get("closeout_production")).toMatchObject({
            buildingEliminationEnabled: true,
            buildingEliminationTargetPriority: "production",
            buildingEliminationPreemptExistingAttacks: false,
            buildingEliminationSweepWhenNoTargets: false,
        });
        expect(arms.get("closeout_preempt")?.buildingEliminationPreemptExistingAttacks).toBe(true);
        expect(arms.get("closeout_defense")?.buildingEliminationTargetPriority).toBe("defense");
        expect(arms.get("closeout_nearest")?.buildingEliminationTargetPriority).toBe("nearest");
        expect(arms.get("closeout_sweep")?.buildingEliminationSweepWhenNoTargets).toBe(true);
        expect(arms.get("retain_yard")?.rushSellEnabled).toBe(false);
        expect(arms.get("retain_yard")?.finisherArtilleryTargetCount).toBe(0);
        expect(arms.get("siege_finisher")).toMatchObject({
            rushSellEnabled: false,
            finisherArtilleryTargetCount: 6,
            finisherArtilleryStartTick: 10_800,
        });
    });
});
