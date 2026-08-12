import { describe, expect, test } from "vitest";
import {
    buildMethodV3MechanismEpisodes,
    METHOD_V3_COUNTRIES,
    METHOD_V3_STAGE1_ENGINE_SEED_BASE,
    METHOD_V3_STAGE1_FAMILY_COUNT,
} from "../training/methodV3MechanismPlanGenerator.js";
import { buildMethodV3MechanismArms } from "../training/methodV3MechanismPolicies.js";


describe("method-v3 mechanism plan generator", () => {
    test("freezes the all-country reciprocal launch budget", () => {
        expect(METHOD_V3_COUNTRIES).toHaveLength(9);
        expect(new Set(METHOD_V3_COUNTRIES).size).toBe(9);
        expect(METHOD_V3_STAGE1_FAMILY_COUNT * METHOD_V3_COUNTRIES.length * 2 * 9).toBe(2268);
        expect(METHOD_V3_STAGE1_ENGINE_SEED_BASE).toBeLessThanOrEqual(0xffff_ffff);
    });

    test("builds one indivisible reciprocal block for every frozen arm", () => {
        const arms = buildMethodV3MechanismArms();
        const episodes = buildMethodV3MechanismEpisodes("mf_alpha", 7, 123456);
        expect(episodes).toHaveLength(18);
        for (const arm of arms) {
            const rows = episodes.filter(({ policyId }) => policyId === arm.policyId);
            expect(rows.map(({ candidateSlot }) => candidateSlot).sort()).toEqual([0, 1]);
            expect(new Set(rows.map(({ seedBlockIndex }) => seedBlockIndex))).toEqual(new Set([7]));
            expect(new Set(rows.map(({ requestedEngineSeed }) => requestedEngineSeed))).toEqual(new Set([123456]));
        }
    });
});
