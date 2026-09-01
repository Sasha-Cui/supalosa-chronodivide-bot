import { describe, expect, it } from "vitest";
import { V8_SEARCH_SEEDS, generateV8InitialPolicies } from
    "../training/hfoAdvancedStateConditionedV8Core.js";
import { V8_G2_ARM_COUNT, V8_G2_CANDIDATE_COUNT, V8_G2_CASE_COUNT, V8_G2_RUN_COUNT,
    V8_G2_TASK_COUNT, V8_G2_TASKS_PER_RUN, v8G2Arms, v8G2Assignment, v8G2Eligibility } from
    "../training/hfoAdvancedStateConditionedV8Generation2.js";

const previous = () => ({
    kind: "hfo-advanced-v8-generation-1",
    complete: true,
    passed: true,
    runs: V8_SEARCH_SEEDS.map((seed, runIndex) => ({ runIndex,
        candidates: generateV8InitialPolicies(seed).slice(0, 16).map((row) => ({ policySha256: row.sha256 })),
        generation2: generateV8InitialPolicies(seed).slice(0, 8).map((row) => ({ sha256: row.sha256,
            canonicalJson: row.canonicalJson, complexity: row.complexity })) })),
});

describe("HFO Advanced V8 Generation 2", () => {
    it("maps exactly three runs, ten arms, and 72 balanced cases", () => {
        expect(V8_G2_RUN_COUNT).toBe(3);
        expect(V8_G2_CASE_COUNT).toBe(72);
        expect(V8_G2_CANDIDATE_COUNT).toBe(8);
        expect(V8_G2_ARM_COUNT).toBe(10);
        expect(V8_G2_TASKS_PER_RUN).toBe(720);
        expect(V8_G2_TASK_COUNT).toBe(2_160);
        expect(v8G2Assignment(0)).toEqual({ runIndex: 0, armIndex: 0, caseIndex: 0 });
        expect(v8G2Assignment(71)).toEqual({ runIndex: 0, armIndex: 0, caseIndex: 71 });
        expect(v8G2Assignment(72)).toEqual({ runIndex: 0, armIndex: 1, caseIndex: 0 });
        expect(v8G2Assignment(719)).toEqual({ runIndex: 0, armIndex: 9, caseIndex: 71 });
        expect(v8G2Assignment(720)).toEqual({ runIndex: 1, armIndex: 0, caseIndex: 0 });
        expect(v8G2Assignment(2_159)).toEqual({ runIndex: 2, armIndex: 9, caseIndex: 71 });
        expect(() => v8G2Assignment(2_160)).toThrow("task invalid");
    });

    it("loads two controls plus eight unique immutable policies per run", () => {
        const frozen = previous();
        for (let runIndex = 0; runIndex < 3; runIndex += 1) {
            const arms = v8G2Arms(frozen as any, runIndex);
            expect(arms).toHaveLength(10);
            expect(arms.slice(0, 2).map((arm) => arm.id)).toEqual(["deployed_strongbot", "external_supalosa"]);
            expect(new Set(arms.slice(2).map((arm) => arm.policy?.sha256)).size).toBe(8);
        }
    });

    it("requires every frozen run-winner gate without tolerance weakening", () => {
        const faction = { Allied: 0, Soviet: 0.01 }, slot = { "0": 0, "1": 0.01 },
            start = { West: 0, East: 0, North: 0.01, South: 0.01 },
            countries = Object.fromEntries(Array.from({ length: 9 }, (_, index) => [String(index), index === 8 ? -0.01 : 0]));
        expect(v8G2Eligibility({ wins: 37, losses: 35 }, 0.001, faction, slot, start, countries))
            .toMatchObject({ eligible: true, noninferiorCountryCount: 8 });
        expect(v8G2Eligibility({ wins: 37, losses: 35 }, 0, faction, slot, start, countries).eligible).toBe(false);
        expect(v8G2Eligibility({ wins: 36, losses: 36 }, 0.001, faction, slot, start, countries).eligible).toBe(false);
        expect(v8G2Eligibility({ wins: 37, losses: 35 }, 0.001, faction, slot,
            { ...start, West: -0.001 }, countries).eligible).toBe(false);
        expect(v8G2Eligibility({ wins: 37, losses: 35 }, 0.001, faction, slot, start,
            { ...countries, "7": -0.01 }).eligible).toBe(false);
    });
});
