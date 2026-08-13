import { describe, expect, test } from "vitest";
import {
    METHOD_V5_CLOSEOUT_ARM_ORDER,
    buildMethodV5CloseoutArms,
} from "../training/methodV5CloseoutPolicies.js";
import { methodV5CloseoutPolicySha256 } from "../training/methodV5Closeout.js";

describe("Method-v5 prospective closeout arms", () => {
    test("binds eight unique policies in the frozen order", () => {
        const arms = buildMethodV5CloseoutArms();
        expect(arms.map(({ armId }) => armId)).toEqual(METHOD_V5_CLOSEOUT_ARM_ORDER);
        expect(new Set(arms.map(({ policyId }) => policyId)).size).toBe(arms.length);
        for (const { policyId, policy } of arms) {
            expect(methodV5CloseoutPolicySha256(policy)).toBe(policyId);
        }
    });

    test("uses an exact baseline control and all-country mobility variants", () => {
        const byId = new Map(buildMethodV5CloseoutArms().map((row) => [row.armId, row]));
        expect(byId.get("baseline_control")?.policy.enabled).toBe(false);
        expect(byId.get("distributed_global_pause")?.policy.adaptiveProductionEnabled).toBe(false);
        expect(byId.get("focused_global_pause")?.policy.targetAssignmentMode).toBe("focused");
        expect(byId.get("distributed_bounded_reserve")?.policy.threatResponseMode).toBe("bounded_reserve");
        expect(byId.get("focused_bounded_reserve")?.policy).toMatchObject({
            targetAssignmentMode: "focused",
            threatResponseMode: "bounded_reserve",
            adaptiveProductionEnabled: false,
        });
        expect(byId.get("focused_bounded_air4")?.policy.adaptiveAirTargetCount).toBe(4);
        expect(byId.get("focused_bounded_early_air4")?.policy.minTick).toBeLessThan(
            byId.get("focused_bounded_air4")?.policy.minTick ?? 0,
        );
        expect(byId.get("focused_bounded_aggressive_air4")?.policy).toMatchObject({
            minTick: 5400,
            minCombatants: 6,
            reserveCombatants: 2,
            maxThreatReserveCombatants: 3,
            orderIntervalTicks: 3,
            adaptiveAirTargetCount: 4,
            adaptiveProductionPriority: 240,
        });
    });
});
