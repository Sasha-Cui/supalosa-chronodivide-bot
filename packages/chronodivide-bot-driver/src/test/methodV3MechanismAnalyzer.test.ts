import { describe, expect, test } from "vitest";
import { rankMethodV3MechanismArms } from "../training/methodV3MechanismAnalyzer.js";
import {
    METHOD_V3_COUNTRIES,
    METHOD_V3_STAGE1_ENGINE_SEED_BASE,
    METHOD_V3_STAGE1_LAUNCH_COUNT,
    METHOD_V3_STAGE1_MAX_TICKS,
    MethodV3MechanismCampaign,
} from "../training/methodV3MechanismPlanGenerator.js";
import { buildMethodV3MechanismArms } from "../training/methodV3MechanismPolicies.js";


const SHA = "b".repeat(64);
const COMMIT = "b".repeat(40);

const fixture = (): { campaign: MethodV3MechanismCampaign; results: Array<Record<string, unknown>> } => {
    const selectedFamilies = Array.from({ length: 22 }, (_, index) => ({
        familyId: `mf_${index}`,
        representativeSha256: `${index}`.padStart(64, "0"),
        descriptors: { startCount: 2 },
    }));
    const arms = buildMethodV3MechanismArms();
    const shards = selectedFamilies.flatMap(({ familyId }, familyIndex) =>
        METHOD_V3_COUNTRIES.map((country, countryIndex) => {
            const shardIndex = familyIndex * METHOD_V3_COUNTRIES.length + countryIndex;
            return {
                shardIndex,
                planFile: `/private/plans/shard-${shardIndex}.json`,
                planSha256: `${shardIndex + 1}`.padStart(64, "0"),
                runId: `run-${shardIndex}`,
                familyId,
                country,
                seedBlockIndex: shardIndex,
                requestedEngineSeed: 10_000 + shardIndex,
                launchedGameCount: 18,
            };
        }),
    );
    const campaign: MethodV3MechanismCampaign = {
        schemaVersion: 1,
        kind: "method-v3-stage1-mechanism-screen",
        status: "FROZEN_OPEN_TRAINING_MECHANISM_SCREEN",
        generatedAt: "2026-08-11T00:00:00.000Z",
        sourceGitCommit: COMMIT,
        sourceRuntimeSha256: SHA,
        baselineGitCommit: COMMIT,
        baselineRuntimeSha256: SHA,
        gameApiRuntimeSha256: SHA,
        packageLockSha256: SHA,
        roleManifestSha256: SHA,
        roleCommitmentSha256: SHA,
        splitCommitmentSha256: SHA,
        sourcePopulationCommitmentSha256: SHA,
        outcomeAccess: "open-training-only-no-paper-claim",
        actualWinInvariant: "shortGame engine defeat and zero terminal enemy buildings",
        mapProfilesEnabled: false,
        exactMapTacticsEnabled: false,
        familyCount: 22,
        countryCount: 9,
        reciprocalSlotCount: 2,
        policyCount: 9,
        seedBlockCount: 198,
        launchedGameCount: METHOD_V3_STAGE1_LAUNCH_COUNT,
        engineSeedBase: METHOD_V3_STAGE1_ENGINE_SEED_BASE,
        maxTicks: METHOD_V3_STAGE1_MAX_TICKS,
        countries: METHOD_V3_COUNTRIES,
        rankingRule: ["one", "two", "three", "four", "five", "six"],
        arms,
        selectedFamilies,
        shards,
    };
    const results = shards.flatMap((shard) => arms.flatMap((arm) => ([0, 1] as const).map((candidateSlot) => {
        const candidateWin = arm.armId === "siege_finisher" ||
            (arm.armId === "retain_yard" && candidateSlot === 0);
        return {
            episodeId: `${shard.shardIndex}-${arm.armId}-${candidateSlot}`,
            familyId: shard.familyId,
            policyId: arm.policyId,
            methodId: arm.policyId,
            seedBlockIndex: shard.seedBlockIndex,
            requestedEngineSeed: shard.requestedEngineSeed,
            candidateSlot,
            candidateCountry: shard.country,
            baselineCountry: shard.country,
            winner: candidateWin ? "candidate" : "draw",
            ticks: candidateWin ? 10_000 + candidateSlot : 18_000,
            finished: candidateWin,
            candidateDefeated: false,
            baselineDefeated: candidateWin,
            candidate: { buildings: 3 },
            baseline: { buildings: candidateWin ? 0 : 2 },
        };
    })));
    return { campaign, results };
};

describe("method-v3 mechanism analyzer", () => {
    test("applies the frozen actual-win-first ranking across complete country cells", () => {
        const { campaign, results } = fixture();
        const ranking = rankMethodV3MechanismArms(campaign, results);
        expect(ranking).toHaveLength(9);
        expect(ranking[0]).toMatchObject({
            armId: "siege_finisher",
            gameCount: 396,
            wins: 396,
            draws: 0,
            losses: 0,
            equalFamilyCountryWinProbability: 1,
            equalFamilyCountryDrawProbability: 0,
        });
        expect(ranking[0].countryBreakdown).toHaveLength(9);
        expect(ranking[0].countryBreakdown.every(({ games, wins }) => games === 44 && wins === 44)).toBe(true);
        expect(ranking[1].armId).toBe("retain_yard");
    });

    test("refuses partial or duplicate launch evidence", () => {
        const { campaign, results } = fixture();
        expect(() => rankMethodV3MechanismArms(campaign, results.slice(1))).toThrow(/complete frozen launch population/);
        const duplicate = [...results];
        duplicate[0] = duplicate[1];
        expect(() => rankMethodV3MechanismArms(campaign, duplicate)).toThrow(/identity or seed/);
    });
});
