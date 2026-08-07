import { describe, expect, test } from "vitest";
import {
    generateStage0Policies,
    RESEARCH_STAGE0_FAMILY_COUNT,
    RESEARCH_STAGE0_POLICY_COUNT,
    selectStage0Families,
} from "../training/researchPlanGenerator.js";
import { RoleTarget } from "../training/researchPlanRunner.js";
import { DEFAULT_RESEARCH_POLICY, parseResearchPolicy, researchPolicySha256 } from "../training/researchPolicy.js";

const target = (familyId: string, startCount: number): RoleTarget => ({
    familyId,
    representative: { path: `private/${familyId}.map`, sha256: familyId.padEnd(64, "0").slice(0, 64) },
    descriptors: { startCount },
});

describe("prospective research plan generation", () => {
    test("generates a deterministic unique candidate population with a fixed default anchor", () => {
        const first = generateStage0Policies(3);
        const replay = generateStage0Policies(3);
        const otherRun = generateStage0Policies(4);
        expect(first).toEqual(replay);
        expect(first).toHaveLength(RESEARCH_STAGE0_POLICY_COUNT);
        expect(new Set(first.map(({ policyId }) => policyId)).size).toBe(RESEARCH_STAGE0_POLICY_COUNT);
        expect(first[0]).toEqual({
            policyId: researchPolicySha256(DEFAULT_RESEARCH_POLICY),
            policy: parseResearchPolicy(DEFAULT_RESEARCH_POLICY),
        });
        expect(otherRun[0]).toEqual(first[0]);
        expect(otherRun.slice(1)).not.toEqual(first.slice(1));
        for (const candidate of first) {
            expect(parseResearchPolicy(candidate.policy)).toEqual(candidate.policy);
            expect(researchPolicySha256(candidate.policy)).toBe(candidate.policyId);
        }
    });

    test("selects a deterministic family subset spanning every available start-count stratum", () => {
        const targets = [
            target("mf_a", 2),
            target("mf_b", 2),
            target("mf_c", 3),
            target("mf_d", 4),
            target("mf_e", 4),
            target("mf_f", 6),
            target("mf_g", 8),
            target("mf_h", 8),
        ];
        const selected = selectStage0Families(targets, 2);
        expect(selected).toEqual(selectStage0Families(targets, 2));
        expect(selected).toHaveLength(RESEARCH_STAGE0_FAMILY_COUNT);
        expect(new Set(selected.map(({ descriptors }) => descriptors.startCount))).toEqual(new Set([2, 3, 4, 6, 8]));
        expect(new Set(selected.map(({ familyId }) => familyId)).size).toBe(RESEARCH_STAGE0_FAMILY_COUNT);
    });

    test("rejects invalid optimizer indexes and undersized family populations", () => {
        expect(() => generateStage0Policies(-1)).toThrow(/optimizerRunIndex/);
        expect(() => selectStage0Families([target("mf_a", 2)], 0)).toThrow(/requires at least/);
    });
});
