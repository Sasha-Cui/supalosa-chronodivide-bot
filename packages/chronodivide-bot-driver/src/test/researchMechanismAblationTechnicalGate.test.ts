import { describe, expect, test } from "vitest";
import { validateMechanismCampaignStructure } from "../training/researchMechanismAblationTechnicalGate.js";

const campaign = (): Record<string, unknown> => {
    const selectedFamilies = Array.from({ length: 10 }, (_, index) => ({
        familyId: `family_${String(index).padStart(2, "0")}`,
        representativeSha256: index.toString(16).padStart(64, "0"),
    }));
    const methodIds = ["champion", "local0", "local1", "local2", "local3", "local4"];
    const methods = methodIds.map((methodId, index) => ({
        methodId,
        policyId: index.toString(16).padStart(64, "0"),
        optimizerRunIndex: index === 0 ? null : index - 1,
        artifactPath: `/artifact-${index}.json`,
        artifactSha256: (index + 10).toString(16).padStart(64, "0"),
    }));
    return {
        schemaVersion: 1,
        kind: "method-v2-mechanism-ablation",
        status: "POST_CONFIRMATORY_DIAGNOSTIC_NOT_CLAIM_RESCUE",
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
            runId: `mechanism-${index}`,
            familyId: selectedFamilies[Math.floor(index / 4)].familyId,
            seedOrdinal: index % 4,
            seedBlockIndex: index,
            launchedGameCount: 12,
        })),
    };
};

describe("mechanism technical campaign boundary", () => {
    test("accepts the exact balanced schedule", () => {
        expect(validateMechanismCampaignStructure(campaign()).shards).toHaveLength(40);
    });

    test("rejects reordered families and seed drift", () => {
        const reordered = campaign();
        const families = reordered.selectedFamilies as Array<Record<string, unknown>>;
        [families[0], families[1]] = [families[1], families[0]];
        expect(() => validateMechanismCampaignStructure(reordered)).toThrow(/frozen allocation/);
        const drifted = campaign();
        (drifted.shards as Array<Record<string, unknown>>)[3].seedBlockIndex = 99;
        expect(() => validateMechanismCampaignStructure(drifted)).toThrow(/frozen allocation/);
    });
});
