import { describe, expect, it } from "vitest";
import { V8_SEARCH_SEEDS, generateV8InitialPolicies } from
    "../training/hfoAdvancedStateConditionedV8Core.js";
import { V8_G0_ARM_COUNT, V8_G0_CANDIDATE_COUNT, V8_G0_CASE_COUNT, V8_G0_RUN_COUNT,
    V8_G0_TASK_COUNT, V8_G0_TASKS_PER_RUN, deriveV8Generation1, v8G0Arms,
    v8G0Assignment } from "../training/hfoAdvancedStateConditionedV8Generation0.js";

const selection = () => ({
    cases: [],
    initialPolicies: Object.fromEntries(V8_SEARCH_SEEDS.map((seed) => [String(seed),
        generateV8InitialPolicies(seed).map((row) => ({ sha256: row.sha256,
            canonicalJson: row.canonicalJson, complexity: row.complexity }))])),
});

describe("HFO Advanced V8 Generation 0", () => {
    it("maps exactly three runs, 34 arms, and 18 cases", () => {
        expect(V8_G0_RUN_COUNT).toBe(3);
        expect(V8_G0_CASE_COUNT).toBe(18);
        expect(V8_G0_CANDIDATE_COUNT).toBe(32);
        expect(V8_G0_ARM_COUNT).toBe(34);
        expect(V8_G0_TASKS_PER_RUN).toBe(612);
        expect(V8_G0_TASK_COUNT).toBe(1_836);
        expect(v8G0Assignment(0)).toEqual({ runIndex: 0, armIndex: 0, caseIndex: 0 });
        expect(v8G0Assignment(17)).toEqual({ runIndex: 0, armIndex: 0, caseIndex: 17 });
        expect(v8G0Assignment(18)).toEqual({ runIndex: 0, armIndex: 1, caseIndex: 0 });
        expect(v8G0Assignment(611)).toEqual({ runIndex: 0, armIndex: 33, caseIndex: 17 });
        expect(v8G0Assignment(612)).toEqual({ runIndex: 1, armIndex: 0, caseIndex: 0 });
        expect(v8G0Assignment(1_835)).toEqual({ runIndex: 2, armIndex: 33, caseIndex: 17 });
        expect(() => v8G0Assignment(1_836)).toThrow("task invalid");
    });

    it("loads two controls plus 32 unique frozen policies per run", () => {
        const frozen = selection();
        for (let runIndex = 0; runIndex < 3; runIndex += 1) {
            const arms = v8G0Arms(frozen as any, runIndex);
            expect(arms).toHaveLength(34);
            expect(arms.slice(0, 2).map((arm) => arm.id)).toEqual(["deployed_strongbot", "external_supalosa"]);
            expect(new Set(arms.slice(2).map((arm) => arm.policy?.sha256)).size).toBe(32);
        }
    });

    it("derives the frozen deterministic 4+8+4 Generation-1 population", () => {
        const policies = generateV8InitialPolicies(V8_SEARCH_SEEDS[0]), survivors = policies.slice(0, 8)
            .map((policy) => ({ policy })), prior = new Set(policies.map((policy) => policy.sha256)),
            first = deriveV8Generation1(survivors, 0, prior), second = deriveV8Generation1(survivors, 0, prior);
        expect(first).toHaveLength(16);
        expect(first.slice(0, 4).map((row) => row.sha256)).toEqual(policies.slice(0, 4).map((row) => row.sha256));
        expect(first.map((row) => row.sha256)).toEqual(second.map((row) => row.sha256));
        expect(new Set(first.map((row) => row.sha256)).size).toBe(16);
        expect(first.slice(4).every((row) => !prior.has(row.sha256))).toBe(true);
    });
});
