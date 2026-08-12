import { describe, expect, test } from "vitest";
import {
    buildMethodV4LifecycleEpisodes,
    METHOD_V4_COUNTRIES,
    METHOD_V4_LIFECYCLE_ENGINE_SEED_BASE,
    METHOD_V4_LIFECYCLE_FAMILY_COUNT,
    METHOD_V4_LIFECYCLE_LAUNCH_COUNT,
} from "../training/methodV4LifecyclePlanGenerator.js";
import { buildMethodV4LifecycleArms } from "../training/methodV4LifecyclePolicies.js";

describe("method-v4 lifecycle plan generator", () => {
    test("freezes the full all-country reciprocal launch budget", () => {
        expect(METHOD_V4_COUNTRIES).toHaveLength(9);
        expect(new Set(METHOD_V4_COUNTRIES).size).toBe(9);
        expect(METHOD_V4_LIFECYCLE_FAMILY_COUNT * METHOD_V4_COUNTRIES.length * 2 * 12).toBe(4752);
        expect(METHOD_V4_LIFECYCLE_LAUNCH_COUNT).toBe(4752);
        expect(METHOD_V4_LIFECYCLE_ENGINE_SEED_BASE).toBeLessThanOrEqual(0xffff_ffff);
    });

    test("builds one indivisible reciprocal block for every frozen arm", () => {
        const arms = buildMethodV4LifecycleArms();
        const episodes = buildMethodV4LifecycleEpisodes("mf_alpha", 7, 3_500_000_007);
        expect(episodes).toHaveLength(24);
        expect(episodes.every((episode) => !("methodId" in episode))).toBe(true);
        for (const arm of arms) {
            const rows = episodes.filter(({ policyId }) => policyId === arm.policyId);
            expect(rows.map(({ candidateSlot }) => candidateSlot).sort()).toEqual([0, 1]);
            expect(new Set(rows.map(({ seedBlockIndex }) => seedBlockIndex))).toEqual(new Set([7]));
            expect(new Set(rows.map(({ requestedEngineSeed }) => requestedEngineSeed))).toEqual(
                new Set([3_500_000_007]),
            );
        }
    });
});
