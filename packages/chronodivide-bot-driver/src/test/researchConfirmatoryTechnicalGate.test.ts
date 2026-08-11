import crypto from "node:crypto";
import { describe, expect, test } from "vitest";
import {
    RESEARCH_CONFIRMATORY_CHAMPION_POLICY_ID,
    RESEARCH_CONFIRMATORY_DEFAULT_POLICY_ID,
    ResearchConfirmatoryCampaign,
} from "../training/researchConfirmatoryPlanGenerator.js";
import { validateConfirmatoryCampaignStructure } from "../training/researchConfirmatoryTechnicalGate.js";

const campaign = (): ResearchConfirmatoryCampaign => {
    const selectedFamilies = Array.from({ length: 16 }, (_, index) => ({
        familyId: `placeholder_${index}`,
        representativeSha256: index.toString(16).padStart(64, "0"),
        rankSha256: "0".repeat(64),
    })).sort((left, right) => {
        const rank = (familyId: string) => crypto.createHash("sha256")
            .update(`chrono-divide-confirmatory-v1\0${familyId}`).digest("hex");
        return rank(left.familyId).localeCompare(rank(right.familyId));
    });
    const rank = (familyId: string) => crypto.createHash("sha256")
        .update(`chrono-divide-confirmatory-v1\0${familyId}`).digest("hex");
    selectedFamilies.forEach((row) => { row.rankSha256 = rank(row.familyId); });
    return {
        schemaVersion: 1,
        kind: "method-v2-confirmatory",
        sourceGitCommit: "0".repeat(40),
        generatedAt: "2026-08-11T00:00:00.000Z",
        outcomeAccess: "sealed-private-events",
        designPath: "/design.json",
        designSha256: "1".repeat(64),
        developmentUnblindingPath: "/development.json",
        developmentUnblindingSha256: "2d07f8d0bec8befb470342081e4753d0e910d7aa211873f8ea11aed3ecd0202d",
        sourceRuntimeSha256: "2".repeat(64),
        baselineGitCommit: "3".repeat(40),
        baselineRuntimeSha256: "4".repeat(64),
        gameApiRuntimeSha256: "5".repeat(64),
        packageLockSha256: "6".repeat(64),
        roleManifestSha256: "63c22710de11e3490260fb78ed9246456eaf0bca9dec6bffdf266b7e5cf4e8b2",
        roleCommitmentSha256: "2f6dcce3c9021f050bc84eae69ea12b9fd094af8b78bf0567724ac4a156f4716",
        splitCommitmentSha256: "7".repeat(64),
        sourcePopulationCommitmentSha256: "8".repeat(64),
        championArtifactPath: "/champion.json",
        championArtifactSha256: "40a53c142fa30725ea5d22032d4b6dfcda4f358e15e1b8d36ac6a102b76e9ee1",
        championPolicyId: RESEARCH_CONFIRMATORY_CHAMPION_POLICY_ID,
        defaultPolicyId: RESEARCH_CONFIRMATORY_DEFAULT_POLICY_ID,
        engineSeedBase: 60_000_000,
        maxTicks: 18_000,
        familyCount: 16,
        blocksPerFamily: 8,
        shardCount: 128,
        launchedGameCount: 512,
        selectedFamilies,
        policies: [
            { policyId: RESEARCH_CONFIRMATORY_DEFAULT_POLICY_ID, policy: {} as never },
            { policyId: RESEARCH_CONFIRMATORY_CHAMPION_POLICY_ID, policy: {} as never },
        ],
        shards: Array.from({ length: 128 }, (_, index) => ({
            shardIndex: index,
            planFile: `/plans/${index}.json`,
            planSha256: index.toString(16).padStart(64, "0"),
            runId: `shard-${index}`,
            familyId: selectedFamilies[Math.floor(index / 8)].familyId,
            familyRank: Math.floor(index / 8),
            seedOrdinal: index % 8,
            seedBlockIndex: index,
            launchedGameCount: 4 as const,
        })),
    };
};

describe("confirmatory technical campaign boundary", () => {
    test("accepts only the exact all-family schedule", () => {
        expect(validateConfirmatoryCampaignStructure(campaign()).shards).toHaveLength(128);
        const drifted = campaign();
        drifted.shards[8].seedBlockIndex = 99;
        expect(() => validateConfirmatoryCampaignStructure(drifted)).toThrow(/frozen all-family allocation/);
    });

    test("rejects duplicate plans and reordered family ranks", () => {
        const duplicate = campaign();
        duplicate.shards[1].planFile = duplicate.shards[0].planFile;
        expect(() => validateConfirmatoryCampaignStructure(duplicate)).toThrow(/frozen all-family allocation/);
        const reordered = campaign();
        [reordered.selectedFamilies[0], reordered.selectedFamilies[1]] = [reordered.selectedFamilies[1], reordered.selectedFamilies[0]];
        expect(() => validateConfirmatoryCampaignStructure(reordered)).toThrow(/frozen all-family allocation/);
    });
});
