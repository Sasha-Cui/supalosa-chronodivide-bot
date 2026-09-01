import { describe, expect, it } from "vitest";
import { V8_SEARCH_SEEDS, generateV8InitialPolicies } from
    "../training/hfoAdvancedStateConditionedV8Core.js";
import { V8_G1_ARM_COUNT, V8_G1_CANDIDATE_COUNT, V8_G1_CASE_COUNT, V8_G1_RUN_COUNT,
    V8_G1_TASK_COUNT, V8_G1_TASKS_PER_RUN, deriveV8Generation2, v8G1Arms,
    v8G1Assignment } from "../training/hfoAdvancedStateConditionedV8Generation1.js";

const previous = () => ({
    kind: "hfo-advanced-v8-generation-0",
    complete: true,
    passed: true,
    runs: V8_SEARCH_SEEDS.map((seed, runIndex) => ({ runIndex,
        candidates: generateV8InitialPolicies(seed).map((row) => ({ policySha256: row.sha256 })),
        generation1: generateV8InitialPolicies(seed).slice(0, 16).map((row) => ({ sha256: row.sha256,
            canonicalJson: row.canonicalJson, complexity: row.complexity })) })),
});

describe("HFO Advanced V8 Generation 1", () => {
    it("maps exactly three runs, 18 arms, and 36 cases", () => {
        expect(V8_G1_RUN_COUNT).toBe(3);
        expect(V8_G1_CASE_COUNT).toBe(36);
        expect(V8_G1_CANDIDATE_COUNT).toBe(16);
        expect(V8_G1_ARM_COUNT).toBe(18);
        expect(V8_G1_TASKS_PER_RUN).toBe(648);
        expect(V8_G1_TASK_COUNT).toBe(1_944);
        expect(v8G1Assignment(0)).toEqual({ runIndex: 0, armIndex: 0, caseIndex: 0 });
        expect(v8G1Assignment(35)).toEqual({ runIndex: 0, armIndex: 0, caseIndex: 35 });
        expect(v8G1Assignment(36)).toEqual({ runIndex: 0, armIndex: 1, caseIndex: 0 });
        expect(v8G1Assignment(647)).toEqual({ runIndex: 0, armIndex: 17, caseIndex: 35 });
        expect(v8G1Assignment(648)).toEqual({ runIndex: 1, armIndex: 0, caseIndex: 0 });
        expect(v8G1Assignment(1_943)).toEqual({ runIndex: 2, armIndex: 17, caseIndex: 35 });
        expect(() => v8G1Assignment(1_944)).toThrow("task invalid");
    });

    it("loads two controls plus 16 unique immutable policies per run", () => {
        const frozen = previous();
        for (let runIndex = 0; runIndex < 3; runIndex += 1) {
            const arms = v8G1Arms(frozen as any, runIndex);
            expect(arms).toHaveLength(18);
            expect(arms.slice(0, 2).map((arm) => arm.id)).toEqual(["deployed_strongbot", "external_supalosa"]);
            expect(new Set(arms.slice(2).map((arm) => arm.policy?.sha256)).size).toBe(16);
        }
    });

    it("derives the frozen deterministic 2+4+2 Generation-2 population", () => {
        const evaluated = generateV8InitialPolicies(V8_SEARCH_SEEDS[0]), policies = evaluated.slice(0, 16), survivors = policies.slice(0, 4)
            .map((policy) => ({ policy })), prior = new Set(evaluated.map((policy) => policy.sha256)),
            first = deriveV8Generation2(survivors, 0, prior), second = deriveV8Generation2(survivors, 0, prior);
        expect(first).toHaveLength(8);
        expect(first.slice(0, 2).map((row) => row.sha256)).toEqual(policies.slice(0, 2).map((row) => row.sha256));
        expect(first.map((row) => row.sha256)).toEqual(second.map((row) => row.sha256));
        expect(new Set(first.map((row) => row.sha256)).size).toBe(8);
        expect(first.slice(2).every((row) => !prior.has(row.sha256))).toBe(true);
    });
});
