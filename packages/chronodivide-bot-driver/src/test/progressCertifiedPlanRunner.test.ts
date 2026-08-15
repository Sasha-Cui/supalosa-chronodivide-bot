import { describe, expect, it } from "vitest";
import { Countries } from "@supalosa/chronodivide-bot/dist/bot/logic/common/utils.js";
import {
    PROGRESS_CERTIFIED_PLAN_KIND,
    PROGRESS_CERTIFIED_PLAN_SCHEMA_VERSION,
    PROGRESS_CERTIFIED_SEALED_PLAN_KIND,
    buildProgressCertifiedRunSummary,
    parseProgressCertifiedRunPlan,
    serializeProgressCertifiedRunPlan,
} from "../training/progressCertifiedPlanRunner.js";
import { buildProgressCertifiedArms } from "../training/progressCertifiedExperimentPolicy.js";
import {
    LITERAL_BUILDING_ELIMINATION_ENDPOINT_SHA256,
    LITERAL_BUILDING_ELIMINATION_ENDPOINT_VERSION,
} from "../training/literalBuildingEliminationEndpoint.js";
import { derivePairedEngineSeed } from "../benchmark/seededOfflineGame.js";

const base = () => {
    const arms = buildProgressCertifiedArms();
    const engineSeedBase = 4_220_000_000;
    const seedBlockIndex = 7;
    return {
        schemaVersion: PROGRESS_CERTIFIED_PLAN_SCHEMA_VERSION,
        kind: PROGRESS_CERTIFIED_PLAN_KIND,
        runId: "progress-v1-f0-c0",
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

describe("progress-certified plan runner", () => {
    it("round-trips one exact reciprocal six-arm plan", () => {
        const plan = parseProgressCertifiedRunPlan(base());
        expect(plan.arms).toHaveLength(6);
        expect(plan.episodes).toHaveLength(12);
        expect(JSON.parse(serializeProgressCertifiedRunPlan(plan))).toEqual(plan);
    });

    it("rejects seed and policy drift", () => {
        expect(() => parseProgressCertifiedRunPlan({ ...base(), requestedEngineSeed: 1 }))
            .toThrow("paired derivation");
        const value = base();
        value.arms[0] = { ...value.arms[0], policyId: "3".repeat(64) };
        expect(() => parseProgressCertifiedRunPlan(value)).toThrow("policy hash drifted");
    });

    it("accepts the sealed confirmatory plan kind", () => {
        expect(parseProgressCertifiedRunPlan({
            ...base(),
            kind: PROGRESS_CERTIFIED_SEALED_PLAN_KIND,
        }).kind).toBe(PROGRESS_CERTIFIED_SEALED_PLAN_KIND);
    });

    it("omits every outcome aggregate from sealed summaries", () => {
        const summary = buildProgressCertifiedRunSummary({
            sealedConfirmatory: true,
            generatedAt: "2026-08-15T00:00:00.000Z",
            runId: "sealed-example",
            planSha256: "a".repeat(64),
            requestedLaunches: 6,
            completed: 6,
            technicalFailures: 0,
            candidateWins: 4,
            baselineWins: 1,
            draws: 1,
        });
        expect(summary).toEqual({
            schemaVersion: 2,
            status: "COMPLETE_PROGRESS_CERTIFIED_SEALED_CONFIRMATORY_SHARD",
            generatedAt: "2026-08-15T00:00:00.000Z",
            runId: "sealed-example",
            planSha256: "a".repeat(64),
            requestedLaunches: 6,
            accountedLaunches: 6,
            completed: 6,
            technicalFailures: 0,
            complete: true,
            technicallyClean: true,
            outcomeAccess: "sealed-private-events",
        });
        expect(JSON.stringify(summary)).not.toMatch(/candidateWins|baselineWins|draws|literalWinRate|winner|score/);
    });
});
