import { describe, expect, test } from "vitest";
import {
    METHOD_V3_COUNTRIES,
    METHOD_V3_STAGE1_ENGINE_SEED_BASE,
    METHOD_V3_STAGE1_LAUNCH_COUNT,
    METHOD_V3_STAGE1_MAX_TICKS,
    MethodV3MechanismCampaign,
} from "../training/methodV3MechanismPlanGenerator.js";
import { buildMethodV3MechanismArms } from "../training/methodV3MechanismPolicies.js";
import {
    validateMethodV3ActualWin,
    validateMethodV3MechanismCampaign,
} from "../training/methodV3MechanismTechnicalGate.js";


const SHA = "a".repeat(64);
const COMMIT = "a".repeat(40);

const campaign = (): MethodV3MechanismCampaign => {
    const selectedFamilies = Array.from({ length: 14 }, (_, index) => ({
        familyId: `mf_${index}`,
        representativeSha256: `${index}`.padStart(64, "0"),
        descriptors: { startCount: 2 },
    }));
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
                requestedEngineSeed: 1000 + shardIndex,
                launchedGameCount: 18,
            };
        }),
    );
    return {
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
        familyCount: 14,
        countryCount: 9,
        reciprocalSlotCount: 2,
        policyCount: 9,
        seedBlockCount: 126,
        launchedGameCount: METHOD_V3_STAGE1_LAUNCH_COUNT,
        engineSeedBase: METHOD_V3_STAGE1_ENGINE_SEED_BASE,
        maxTicks: METHOD_V3_STAGE1_MAX_TICKS,
        countries: METHOD_V3_COUNTRIES,
        rankingRule: ["one", "two", "three", "four", "five", "six"],
        arms: buildMethodV3MechanismArms(),
        selectedFamilies,
        shards,
    };
};

describe("method-v3 mechanism technical gate", () => {
    test("accepts only the frozen 126-block, 2,268-game schedule", () => {
        const value = campaign();
        expect(validateMethodV3MechanismCampaign(value)).toBe(value);
        const drifted = structuredClone(value);
        drifted.shards[9].country = METHOD_V3_COUNTRIES[1];
        expect(() => validateMethodV3MechanismCampaign(drifted)).toThrow(/schedule differs/);
    });

    test("enforces zero enemy buildings for every actual win", () => {
        expect(() => validateMethodV3ActualWin({
            winner: "candidate",
            finished: true,
            candidateDefeated: false,
            baselineDefeated: true,
            candidate: { buildings: 2 },
            baseline: { buildings: 0 },
        }, "valid")).not.toThrow();
        expect(() => validateMethodV3ActualWin({
            winner: "candidate",
            finished: true,
            candidateDefeated: false,
            baselineDefeated: true,
            candidate: { buildings: 2 },
            baseline: { buildings: 1 },
        }, "invalid")).toThrow(/actual building-elimination win invariant/);
    });
});
