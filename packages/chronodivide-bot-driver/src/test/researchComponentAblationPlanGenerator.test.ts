import { describe, expect, test } from "vitest";
import {
    buildComponentAblationDesign,
    buildComponentMethods,
    RESEARCH_COMPONENT_CHAMPION_ARTIFACT_SHA256,
    RESEARCH_COMPONENT_CHAMPION_POLICY_ID,
    RESEARCH_COMPONENT_EXPECTED_POLICY_IDS,
    RESEARCH_COMPONENT_METHOD_IDS,
    RESEARCH_COMPONENT_SHARD_COUNT,
} from "../training/researchComponentAblationPlanGenerator.js";
import {
    DEFAULT_RESEARCH_POLICY,
    ResearchPolicyConfig,
    researchPolicySha256,
} from "../training/researchPolicy.js";

const families = () => Array.from({ length: 10 }, (_, index) => `family_${String(index).padStart(2, "0")}`);

describe("post-confirmatory component design", () => {
    test("exhaustively reverts the champion-versus-default difference in five fixed groups", () => {
        const champion: ResearchPolicyConfig = {
            ...DEFAULT_RESEARCH_POLICY,
            attackCompositionPolicy: "infantry",
            strategicPlan: "rush",
            defenceRadiusIncreasePerTick: 0.0001,
            scoutCooldownTicks: 45,
            forceAttackEnabled: false,
            forceAttackMinCombatants: 4,
            emergencyDefenseRadius: 64,
        };
        expect(researchPolicySha256(champion)).toBe(RESEARCH_COMPONENT_CHAMPION_POLICY_ID);
        const built = buildComponentMethods(
            { policyId: RESEARCH_COMPONENT_CHAMPION_POLICY_ID, policy: champion },
            "/frozen/champion.json",
        );
        expect(built.methods.map(({ methodId }) => methodId)).toEqual(RESEARCH_COMPONENT_METHOD_IDS);
        expect(built.methods.map(({ policyId }) => policyId)).toEqual(
            RESEARCH_COMPONENT_METHOD_IDS.map((methodId) => RESEARCH_COMPONENT_EXPECTED_POLICY_IDS[methodId]),
        );
        const expectedChanges: Record<string, string[]> = {
            champion: [],
            revertDefenseGrowth: ["defenceRadiusIncreasePerTick"],
            revertEmergencyDefense: ["emergencyDefenseRadius"],
            revertForceAttack: ["forceAttackEnabled", "forceAttackMinCombatants"],
            revertScouting: ["scoutCooldownTicks"],
            revertStrategy: ["attackCompositionPolicy", "strategicPlan"],
        };
        for (const method of built.methods) {
            expect(method.parentPolicyId).toBe(RESEARCH_COMPONENT_CHAMPION_POLICY_ID);
            expect(method.parentArtifactSha256).toBe(RESEARCH_COMPONENT_CHAMPION_ARTIFACT_SHA256);
            expect(method.revertedParameters).toEqual(expectedChanges[method.methodId]);
            const policy = built.policies.find(({ policyId }) => policyId === method.policyId)?.policy;
            expect(policy).toBeDefined();
            const actualChanges = (Object.keys(champion) as Array<keyof ResearchPolicyConfig>)
                .filter((key) => policy?.[key] !== champion[key])
                .sort();
            expect(actualChanges).toEqual([...expectedChanges[method.methodId]].sort());
        }
    });

    test("allocates four fresh blocks to every development family", () => {
        const design = buildComponentAblationDesign(families().reverse());
        expect(design).toHaveLength(RESEARCH_COMPONENT_SHARD_COUNT);
        expect(new Set(design.map(({ seedBlockIndex }) => seedBlockIndex)).size).toBe(40);
        expect(design.map(({ familyId }) => familyId)).toEqual([...design.map(({ familyId }) => familyId)].sort());
        for (const familyId of families()) {
            const rows = design.filter((row) => row.familyId === familyId);
            expect(rows).toHaveLength(4);
            expect(new Set(rows.map(({ seedOrdinal }) => seedOrdinal))).toEqual(new Set([0, 1, 2, 3]));
        }
    });

    test("fails closed without ten unique families", () => {
        expect(() => buildComponentAblationDesign(families().slice(1))).toThrow(/exactly ten unique/);
        const duplicate = families();
        duplicate[9] = duplicate[0];
        expect(() => buildComponentAblationDesign(duplicate)).toThrow(/exactly ten unique/);
    });
});
