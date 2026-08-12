import { describe, expect, test } from "vitest";
import {
    buildMethodV4LifecycleEpisodes,
    METHOD_V4_COUNTRIES,
    METHOD_V4_LIFECYCLE_ENGINE_SEED_BASE,
    METHOD_V4_LIFECYCLE_FAMILY_COUNT,
    METHOD_V4_LIFECYCLE_LAUNCH_COUNT,
    validateMethodV4EquivalenceGate,
} from "../training/methodV4LifecyclePlanGenerator.js";
import { buildMethodV4LifecycleArms } from "../training/methodV4LifecyclePolicies.js";

describe("method-v4 lifecycle plan generator", () => {
    const commitment = {
        sourceGitCommit: "a".repeat(40),
        baselineGitCommit: "b".repeat(40),
        baselineRuntimeSha256: "c".repeat(64),
        policyId: "d".repeat(64),
    };
    const equivalenceGate = {
        schemaVersion: 1,
        status: "PASS_OUTCOME_FREE_METHOD_V4_EXTERNAL_BASELINE_IDENTITY_GATE",
        passed: true,
        outcomeFree: true,
        sourceGitCommit: commitment.sourceGitCommit,
        policyId: commitment.policyId,
        countryCount: 9,
        reciprocalSlotCount: 2,
        gameCount: 36,
        maxTicks: 1_200,
        scheduler: { account: "pi_jss233", jobId: "22046445" },
        externalBaseline: {
            kind: "external-package",
            gitCommit: commitment.baselineGitCommit,
            runtimeTree: { sha256: commitment.baselineRuntimeSha256 },
        },
        rows: Array.from({ length: 18 }, () => ({ equal: true })),
    };

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

    test("binds an exact-source, all-country outcome-free equivalence gate", () => {
        expect(validateMethodV4EquivalenceGate(equivalenceGate, commitment)).toEqual({
            schedulerJobId: "22046445",
        });
        expect(() => validateMethodV4EquivalenceGate({
            ...equivalenceGate,
            sourceGitCommit: "e".repeat(40),
        }, commitment)).toThrow();
        expect(() => validateMethodV4EquivalenceGate({
            ...equivalenceGate,
            rows: equivalenceGate.rows.map((row, index) => index === 0 ? { equal: false } : row),
        }, commitment)).toThrow();
    });
});
