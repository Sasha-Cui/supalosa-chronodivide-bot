import { describe, expect, it } from "vitest";
import { Countries } from "@supalosa/chronodivide-bot/dist/bot/logic/common/utils.js";
import {
    CONTINUOUS_OFFENSE_PLAN_KIND,
    CONTINUOUS_OFFENSE_PLAN_SCHEMA_VERSION,
    parseContinuousOffenseRunPlan,
    serializeContinuousOffenseRunPlan,
} from "../training/continuousOffensePlanRunner.js";
import { buildContinuousOffenseArms } from "../training/continuousOffenseExperimentPolicy.js";
import {
    LITERAL_BUILDING_ELIMINATION_ENDPOINT_SHA256,
    LITERAL_BUILDING_ELIMINATION_ENDPOINT_VERSION,
} from "../training/literalBuildingEliminationEndpoint.js";
import { derivePairedEngineSeed } from "../benchmark/seededOfflineGame.js";

const base = () => {
    const arms = buildContinuousOffenseArms();
    const engineSeedBase = 4_190_000_000;
    const seedBlockIndex = 7;
    return {
        schemaVersion: CONTINUOUS_OFFENSE_PLAN_SCHEMA_VERSION,
        kind: CONTINUOUS_OFFENSE_PLAN_KIND,
        runId: "continuous-v2-f0-c0",
        sourceGitCommit: "a".repeat(40),
        sourceRuntimeSha256: "b".repeat(64),
        baselineGitCommit: "c".repeat(40),
        baselineRuntimeSha256: "d".repeat(64),
        gameApiRuntimeSha256: "e".repeat(64),
        packageLockSha256: "f".repeat(64),
        sourcePopulationCommitmentSha256: "1".repeat(64),
        endpointVersion: LITERAL_BUILDING_ELIMINATION_ENDPOINT_VERSION,
        endpointSha256: LITERAL_BUILDING_ELIMINATION_ENDPOINT_SHA256,
        family: { familyId: "mf_example", mapName: "example.map", mapSha256: "2".repeat(64) },
        country: Countries.USA,
        engineSeedBase,
        seedBlockIndex,
        requestedEngineSeed: derivePairedEngineSeed(engineSeedBase, seedBlockIndex),
        maxTicks: 24_000,
        arms,
        episodes: arms.flatMap((arm, index) => ([0, 1] as const).map((candidateSlot) => ({
            episodeId: `a${index}-s${candidateSlot}`,
            armId: arm.armId,
            policyId: arm.policyId,
            candidateSlot,
        }))),
    };
};

describe("continuous-offense plan runner", () => {
    it("round-trips one exact reciprocal six-arm plan", () => {
        const plan = parseContinuousOffenseRunPlan(base());
        expect(plan.arms).toHaveLength(6);
        expect(plan.episodes).toHaveLength(12);
        expect(JSON.parse(serializeContinuousOffenseRunPlan(plan))).toEqual(plan);
    });

    it("rejects seed and policy drift", () => {
        expect(() => parseContinuousOffenseRunPlan({ ...base(), requestedEngineSeed: 1 }))
            .toThrow("paired derivation");
        const value = base();
        value.arms[0] = { ...value.arms[0], policyId: "3".repeat(64) };
        expect(() => parseContinuousOffenseRunPlan(value)).toThrow("policy hash drifted");
    });
});
