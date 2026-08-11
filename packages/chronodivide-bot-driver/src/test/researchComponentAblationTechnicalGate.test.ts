import { describe, expect, test } from "vitest";
import {
    RESEARCH_COMPONENT_CHAMPION_ARTIFACT_SHA256,
    RESEARCH_COMPONENT_CHAMPION_POLICY_ID,
    RESEARCH_COMPONENT_EXPECTED_POLICY_IDS,
    RESEARCH_COMPONENT_METHOD_IDS,
} from "../training/researchComponentAblationPlanGenerator.js";
import { validateComponentCampaignStructure } from "../training/researchComponentAblationTechnicalGate.js";

const campaign = (): Record<string, unknown> => {
    const selectedFamilies = Array.from({ length: 10 }, (_, index) => ({
        familyId: `family_${String(index).padStart(2, "0")}`,
        representativeSha256: index.toString(16).padStart(64, "0"),
    }));
    const revertedParameters: Record<string, string[]> = {
        champion: [],
        revertDefenseGrowth: ["defenceRadiusIncreasePerTick"],
        revertEmergencyDefense: ["emergencyDefenseRadius"],
        revertForceAttack: ["forceAttackEnabled", "forceAttackMinCombatants"],
        revertScouting: ["scoutCooldownTicks"],
        revertStrategy: ["attackCompositionPolicy", "strategicPlan"],
    };
    const methods = RESEARCH_COMPONENT_METHOD_IDS.map((methodId) => ({
        methodId,
        policyId: RESEARCH_COMPONENT_EXPECTED_POLICY_IDS[methodId],
        parentPolicyId: RESEARCH_COMPONENT_CHAMPION_POLICY_ID,
        parentArtifactPath: "/frozen/champion.json",
        parentArtifactSha256: RESEARCH_COMPONENT_CHAMPION_ARTIFACT_SHA256,
        revertedParameters: revertedParameters[methodId],
    }));
    return {
        schemaVersion: 1,
        kind: "method-v2-component-ablation",
        status: "POST_CONFIRMATORY_COMPONENT_DIAGNOSTIC_NOT_CLAIM_RESCUE",
        outcomeAccess: "sealed-private-events",
        familyCount: 10,
        blocksPerFamily: 4,
        shardCount: 40,
        launchedGameCount: 480,
        selectedFamilies,
        methods,
        policies: methods.map(({ policyId }) => ({ policyId, policy: {} })),
        shards: Array.from({ length: 40 }, (_, index) => ({
            shardIndex: index,
            planFile: `/plan-${index}.json`,
            planSha256: (index + 100).toString(16).padStart(64, "0"),
            runId: `component-${index}`,
            familyId: selectedFamilies[Math.floor(index / 4)].familyId,
            seedOrdinal: index % 4,
            seedBlockIndex: index,
            launchedGameCount: 12,
        })),
    };
};

describe("component technical campaign boundary", () => {
    test("accepts the exact balanced schedule", () => {
        expect(validateComponentCampaignStructure(campaign()).shards).toHaveLength(40);
    });

    test("rejects reordered families and seed drift", () => {
        const reordered = campaign();
        const families = reordered.selectedFamilies as Array<Record<string, unknown>>;
        [families[0], families[1]] = [families[1], families[0]];
        expect(() => validateComponentCampaignStructure(reordered)).toThrow(/frozen allocation/);
        const drifted = campaign();
        (drifted.shards as Array<Record<string, unknown>>)[3].seedBlockIndex = 99;
        expect(() => validateComponentCampaignStructure(drifted)).toThrow(/frozen allocation/);
    });

    test("rejects a changed component definition", () => {
        const drifted = campaign();
        (drifted.methods as Array<Record<string, unknown>>)[1].revertedParameters = [];
        expect(() => validateComponentCampaignStructure(drifted)).toThrow(/frozen allocation/);
    });
});
