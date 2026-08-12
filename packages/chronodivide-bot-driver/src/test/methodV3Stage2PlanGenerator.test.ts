import { describe, expect, test } from "vitest";
import { Countries } from "@supalosa/chronodivide-bot/dist/bot/logic/common/utils.js";
import { buildMethodV3MechanismArms } from "../training/methodV3MechanismPolicies.js";
import { buildMethodV3Stage2Episodes } from "../training/methodV3Stage2PlanGenerator.js";
import { generateMethodV3Stage2Policies } from "../training/methodV3Stage2Policies.js";
import { METHOD_V3_STAGE2_POLICY_COUNTS } from "../training/methodV3Stage2Schedule.js";

describe("method-v3 Stage-2 plan generator", () => {
    test("allocates an indivisible reciprocal pair to every policy", () => {
        const selected = buildMethodV3MechanismArms()[0].policy;
        const policies = generateMethodV3Stage2Policies(0, selected);
        const episodes = buildMethodV3Stage2Episodes("family", policies, 7, 3_300_000_007);
        expect(episodes).toHaveLength(METHOD_V3_STAGE2_POLICY_COUNTS[0] * 2);
        for (const { policyId } of policies) {
            expect(episodes.filter((episode) => episode.policyId === policyId).map(({ candidateSlot }) => candidateSlot)).toEqual([0, 1]);
        }
        expect(new Set(episodes.map(({ requestedEngineSeed }) => requestedEngineSeed))).toEqual(new Set([3_300_000_007]));
        expect(new Set(episodes.map(({ familyId }) => familyId))).toEqual(new Set(["family"]));
    });

    test("matches the frozen per-run launched-game budgets", () => {
        const expected = [864, 1_152, 1_188];
        for (const stage of [0, 1, 2] as const) {
            const policies = Array.from({ length: METHOD_V3_STAGE2_POLICY_COUNTS[stage] }, (_, index) => ({
                policyId: `${index}`.padStart(64, "0"),
            }));
            const familyCount = [6, 12, 22][stage];
            const countryCount = [3, 6, 9][stage];
            const games = familyCount * countryCount * buildMethodV3Stage2Episodes(
                "family",
                policies,
                0,
                0,
            ).length;
            expect(games).toBe(expected[stage]);
        }
        expect(Object.values(Countries)).toContain(Countries.IRAQ);
    });
});
