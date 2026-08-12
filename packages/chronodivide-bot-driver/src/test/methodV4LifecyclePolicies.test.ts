import { describe, expect, test } from "vitest";
import { buildResearchBotOptions, buildResearchStrategyOptions, researchPolicySha256 } from "../training/researchPolicy.js";
import {
    buildMethodV4LifecycleArms,
    METHOD_V4_LIFECYCLE_ARM_ORDER,
    METHOD_V4_REFERENCE_V3_POLICY_ID,
} from "../training/methodV4LifecyclePolicies.js";

describe("method-v4 lifecycle arms", () => {
    test("freezes twelve unique schema-v4 policies in declared order", () => {
        const arms = buildMethodV4LifecycleArms();
        expect(arms.map(({ armId }) => armId)).toEqual(METHOD_V4_LIFECYCLE_ARM_ORDER);
        expect(new Set(arms.map(({ policyId }) => policyId)).size).toBe(12);
        for (const arm of arms) {
            expect(arm.policy.schemaVersion).toBe(4);
            expect(arm.policyId).toBe(researchPolicySha256(arm.policy));
            expect(buildResearchStrategyOptions(arm.policy).defaultMapProfiles).toBe(false);
            expect(buildResearchBotOptions(arm.policy).exactMapTactics).toBe(false);
        }
    });

    test("keeps the Method-v3 reference distinct from the baseline-preserving lifecycle arms", () => {
        const arms = new Map(buildMethodV4LifecycleArms().map((arm) => [arm.armId, arm]));
        const reference = arms.get("v3_reference")!;
        const control = arms.get("baseline_control")!;
        const balanced = arms.get("baseline_balanced")!;
        expect(reference.policy.preserveBaselineCore).toBe(false);
        expect(reference.policy.buildingEliminationEnabled).toBe(true);
        expect(METHOD_V4_REFERENCE_V3_POLICY_ID).toMatch(/^[0-9a-f]{64}$/);
        expect(control.policy).toMatchObject({
            preserveBaselineCore: true,
            buildingEliminationEnabled: false,
            strategicPlan: "off",
            allInEnabled: false,
            forceAttackEnabled: false,
        });
        expect(balanced.policy).toMatchObject({
            preserveBaselineCore: true,
            buildingEliminationEnabled: true,
            buildingEliminationMinTick: 7200,
            buildingEliminationReserveCombatants: 4,
            buildingEliminationCapabilityAwareAttackers: true,
            buildingEliminationReachabilityAwareTargets: true,
            buildingEliminationReassignStalledTargets: true,
            buildingEliminationAdaptiveAirTargetCount: 0,
            buildingEliminationAdaptiveNavalTargetCount: 0,
        });
    });

    test("isolates one lifecycle decision per non-reference arm", () => {
        const policies = new Map(buildMethodV4LifecycleArms().map((arm) => [arm.armId, arm.policy]));
        expect(policies.get("baseline_early")).toMatchObject({
            buildingEliminationMinTick: 5400,
            buildingEliminationReserveCombatants: 6,
        });
        expect(policies.get("baseline_late")?.buildingEliminationMinTick).toBe(10800);
        expect(policies.get("baseline_homeguard")?.buildingEliminationReserveCombatants).toBe(8);
        expect(policies.get("baseline_minimal_reserve")?.buildingEliminationReserveCombatants).toBe(2);
        expect(policies.get("baseline_rapid_orders")?.buildingEliminationOrderIntervalTicks).toBe(3);
        expect(policies.get("baseline_nearest")?.buildingEliminationTargetPriority).toBe("nearest");
        expect(policies.get("baseline_defense")?.buildingEliminationTargetPriority).toBe("defense");
        expect(policies.get("baseline_focus")?.buildingEliminationMaxTargetGroups).toBe(1);
        expect(policies.get("baseline_parallel")?.buildingEliminationMaxTargetGroups).toBe(8);
    });
});
