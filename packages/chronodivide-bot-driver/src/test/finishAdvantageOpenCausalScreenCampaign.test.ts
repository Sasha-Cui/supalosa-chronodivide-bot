import { describe, expect, it } from "vitest";
import {
    FINISH_ADVANTAGE_OPEN_CAUSAL_SCREEN_AMENDMENT_2_SHA256,
    FINISH_ADVANTAGE_OPEN_CAUSAL_SCREEN_AMENDMENT_3_SHA256,
    FINISH_ADVANTAGE_OPEN_CAUSAL_SCREEN_AMENDMENT_4_SHA256,
    FINISH_ADVANTAGE_OPEN_CAUSAL_SCREEN_AMENDMENT_SHA256,
    FINISH_ADVANTAGE_OPEN_CAUSAL_SCREEN_COUNTRIES,
    FINISH_ADVANTAGE_OPEN_CAUSAL_SCREEN_MAX_TICKS,
    FINISH_ADVANTAGE_OPEN_CAUSAL_SCREEN_PROTOCOL_SHA256,
} from "../training/finishAdvantageOpenCausalScreenAnalysis.js";
import {
    FINISH_ADVANTAGE_OPEN_BASELINE_COMMIT,
    FINISH_ADVANTAGE_OPEN_CAMPAIGN_KIND,
    FINISH_ADVANTAGE_OPEN_CAMPAIGN_SCHEMA_VERSION,
    FinishAdvantageOpenCampaign,
    buildFinishAdvantageOpenCampaignArms,
    buildFinishAdvantageOpenCampaignShards,
    validateFinishAdvantageOpenCampaign,
} from "../training/finishAdvantageOpenCausalScreenCampaign.js";
import {
    LITERAL_BUILDING_ELIMINATION_ENDPOINT_SHA256,
    LITERAL_BUILDING_ELIMINATION_ENDPOINT_VERSION,
} from "../training/literalBuildingEliminationEndpoint.js";
import { PROGRESS_CERTIFIED_V5_OPEN_DEVELOPMENT_FAMILIES } from
    "../training/progressCertifiedV5OpenDevelopmentCampaign.js";
import crypto from "node:crypto";

const sha = (value: unknown) => crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
const hash = "a".repeat(64);
const evidence = { path: "/evidence.json", sha256: hash };
const campaign = (selectedMargins: number[] = [2, 8]): FinishAdvantageOpenCampaign => {
    const arms = buildFinishAdvantageOpenCampaignArms(selectedMargins);
    return {
        schemaVersion: FINISH_ADVANTAGE_OPEN_CAMPAIGN_SCHEMA_VERSION,
        kind: FINISH_ADVANTAGE_OPEN_CAMPAIGN_KIND,
        status: "FROZEN_FINISH_ADVANTAGE_COMPLETE_OPEN_CAUSAL_SCREEN_V2",
        generatedAt: "2026-08-15T00:00:00.000Z",
        outcomeAccess: "permanently-open-development-only-no-paper-claim",
        sourceGitCommit: "b".repeat(40),
        sourceRuntimeSha256: hash,
        externalBaselineGitCommit: FINISH_ADVANTAGE_OPEN_BASELINE_COMMIT,
        externalBaselineRuntimeSha256: hash,
        gameApiRuntimeSha256: hash,
        packageLockSha256: hash,
        populationSha256: sha(PROGRESS_CERTIFIED_V5_OPEN_DEVELOPMENT_FAMILIES),
        endpointVersion: LITERAL_BUILDING_ELIMINATION_ENDPOINT_VERSION,
        endpointSha256: LITERAL_BUILDING_ELIMINATION_ENDPOINT_SHA256,
        protocol: { path: evidence.path, sha256: FINISH_ADVANTAGE_OPEN_CAUSAL_SCREEN_PROTOCOL_SHA256 },
        amendment1: { path: evidence.path, sha256: FINISH_ADVANTAGE_OPEN_CAUSAL_SCREEN_AMENDMENT_SHA256 },
        amendment2: { path: evidence.path, sha256: FINISH_ADVANTAGE_OPEN_CAUSAL_SCREEN_AMENDMENT_2_SHA256 },
        amendment3: { path: evidence.path, sha256: FINISH_ADVANTAGE_OPEN_CAUSAL_SCREEN_AMENDMENT_3_SHA256 },
        amendment4: { path: evidence.path, sha256: FINISH_ADVANTAGE_OPEN_CAUSAL_SCREEN_AMENDMENT_4_SHA256 },
        stateAudit: evidence,
        officialMapGate: evidence,
        compositeGate: evidence,
        programs: {
            cellPath: "/cell.js", cellSha256: hash,
            finalizerPath: "/finalizer.js", finalizerSha256: hash,
            shardScriptPath: "/shard.sbatch", shardScriptSha256: hash,
            controllerScriptPath: "/controller.sbatch", controllerScriptSha256: hash,
        },
        familyCount: 10,
        countryCount: 9,
        reciprocalSlotCount: 2,
        armCount: arms.length,
        shardCount: 90,
        launchedGameCount: arms.length * 180,
        maxTicks: FINISH_ADVANTAGE_OPEN_CAUSAL_SCREEN_MAX_TICKS,
        countries: FINISH_ADVANTAGE_OPEN_CAUSAL_SCREEN_COUNTRIES,
        selectedMargins,
        arms,
        selectedFamilies: PROGRESS_CERTIFIED_V5_OPEN_DEVELOPMENT_FAMILIES,
        shards: buildFinishAdvantageOpenCampaignShards(arms),
    };
};

describe("finish-advantage complete open causal-screen campaign", () => {
    it("builds the corrected four-, five-, and six-arm populations", () => {
        expect(buildFinishAdvantageOpenCampaignArms([])).toHaveLength(4);
        expect(buildFinishAdvantageOpenCampaignArms([4])).toHaveLength(5);
        expect(buildFinishAdvantageOpenCampaignArms([8, 2])).toHaveLength(6);
    });

    it("freezes 90 complete family-country shards with reciprocal arms inside each shard", () => {
        const value = campaign();
        expect(value.shards).toHaveLength(90);
        expect(value.shards[0]).toMatchObject({
            taskIndex: 0,
            familyOrdinal: 0,
            countryOrdinal: 0,
            requestedEngineSeed: 4_227_000_000,
            launchedGameCount: 12,
        });
        expect(value.shards[89]).toMatchObject({
            taskIndex: 89,
            familyOrdinal: 9,
            countryOrdinal: 8,
            requestedEngineSeed: 4_227_000_089,
        });
        expect(value.launchedGameCount).toBe(1_080);
    });

    it("accepts only an exact internally consistent campaign", () => {
        const value = campaign([2]);
        expect(validateFinishAdvantageOpenCampaign(value)).toEqual(value);
        expect(() => validateFinishAdvantageOpenCampaign({
            ...value,
            launchedGameCount: value.launchedGameCount - 1,
        })).toThrow("commitments drifted");
    });

    it("rejects arm, seed, and protocol drift", () => {
        const value = campaign();
        expect(() => validateFinishAdvantageOpenCampaign({
            ...value,
            arms: value.arms.slice().reverse(),
        })).toThrow("commitments drifted");
        expect(() => validateFinishAdvantageOpenCampaign({
            ...value,
            shards: value.shards.map((shard, index) => index === 0
                ? { ...shard, requestedEngineSeed: shard.requestedEngineSeed + 1 }
                : shard),
        })).toThrow("commitments drifted");
        expect(() => validateFinishAdvantageOpenCampaign({
            ...value,
            protocol: { ...value.protocol, sha256: hash },
        })).toThrow("commitments drifted");
        expect(() => validateFinishAdvantageOpenCampaign({
            ...value,
            amendment3: { ...value.amendment3, sha256: hash },
        })).toThrow("commitments drifted");
        expect(() => validateFinishAdvantageOpenCampaign({
            ...value,
            amendment4: { ...value.amendment4, sha256: hash },
        })).toThrow("commitments drifted");
    });
});
