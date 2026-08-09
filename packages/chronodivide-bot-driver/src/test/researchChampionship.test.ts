import { describe, expect, test } from "vitest";
import { Countries } from "@supalosa/chronodivide-bot/dist/bot/logic/common/utils.js";
import { ResearchEpisodeResult, RESEARCH_OUTCOME_ENDPOINT } from "../training/researchEpisode.js";
import {
    buildChampionshipShardDesign,
    RESEARCH_CHAMPIONSHIP_FAMILY_COUNT,
} from "../training/researchChampionshipPlanGenerator.js";
import { rankChampionshipPolicies } from "../training/researchChampionshipReducer.js";
import { RoleTarget } from "../training/researchPlanRunner.js";
import { DEFAULT_RESEARCH_POLICY, ResearchPolicyConfig, researchPolicySha256 } from "../training/researchPolicy.js";

const target = (familyId: string): RoleTarget => ({
    familyId,
    representative: { path: `${familyId}.map`, sha256: "0".repeat(64) },
    descriptors: { startCount: 2 },
});

const player = (value: number) => ({
    credits: value * 1000,
    units: value,
    buildings: value,
    combatants: value,
    harvesters: value,
    factories: value,
    refineries: value,
    conyards: value,
    byName: {},
});

const result = (args: {
    episodeId: string;
    familyId: string;
    policyId: string;
    seedBlockIndex: number;
    slot: 0 | 1;
    score: 0 | 0.5 | 1;
    material?: number;
}): ResearchEpisodeResult => ({
    schemaVersion: 1,
    episodeId: args.episodeId,
    familyId: args.familyId,
    mapName: "alpha.map",
    mapSha256: "0".repeat(64),
    methodId: args.policyId,
    policyId: args.policyId,
    policySha256: args.policyId,
    seedBlockIndex: args.seedBlockIndex,
    requestedEngineSeed: args.seedBlockIndex + 1,
    botRandomSeed: 2,
    candidateBotRandomSeed: 3,
    baselineBotRandomSeed: 4,
    engineSeedEpochMs: 1000,
    candidateSlot: args.slot,
    candidateCountry: Countries.IRAQ,
    baselineCountry: Countries.IRAQ,
    candidateStart: { x: 1, y: 1 },
    baselineStart: { x: 2, y: 2 },
    maxTicks: 18000,
    ticks: 100,
    wallTimeMs: 10,
    finished: true,
    winner: args.score === 1 ? "candidate" : args.score === 0 ? "baseline" : "draw",
    candidateScore: args.score,
    outcomeEndpoint: RESEARCH_OUTCOME_ENDPOINT,
    candidateDefeated: args.score === 0,
    baselineDefeated: args.score === 1,
    candidate: player(args.material ?? 1),
    baseline: player(args.material === undefined ? 1 : 100 - args.material),
});

describe("method-v2 fixed-policy championship", () => {
    test("builds exact, deterministic, disjoint stage schedules", () => {
        const targets = Array.from(
            { length: RESEARCH_CHAMPIONSHIP_FAMILY_COUNT },
            (_, index) => target(`mf_${String(RESEARCH_CHAMPIONSHIP_FAMILY_COUNT - index).padStart(2, "0")}`),
        );
        const stageA = buildChampionshipShardDesign("stage-a", targets);
        const stageB = buildChampionshipShardDesign("stage-b", targets);
        expect(stageA).toHaveLength(22);
        expect(stageB).toHaveLength(22);
        expect(stageA.map(({ familyId }) => familyId)).toEqual([...stageA.map(({ familyId }) => familyId)].sort());
        expect(stageA.flatMap(({ seedBlockIndices }) => seedBlockIndices)).toEqual(
            Array.from({ length: 22 }, (_, index) => index),
        );
        expect(stageB[0].seedBlockIndices).toEqual([1000, 1001, 1002]);
        expect(stageB[21].seedBlockIndices).toEqual([1063, 1064, 1065]);
        expect(new Set([
            ...stageA.flatMap(({ seedBlockIndices }) => seedBlockIndices),
            ...stageB.flatMap(({ seedBlockIndices }) => seedBlockIndices),
        ]).size).toBe(88);
    });

    test("ranks only by family-weighted outcomes, lower-tail score, and policy hash", () => {
        const policyA = DEFAULT_RESEARCH_POLICY;
        const policyB: ResearchPolicyConfig = { ...DEFAULT_RESEARCH_POLICY, attackGateMinTick: 5400 };
        const idA = researchPolicySha256(policyA);
        const idB = researchPolicySha256(policyB);
        const policies = [{ policyId: idA, policy: policyA }, { policyId: idB, policy: policyB }];
        const familyIds = ["f1", "f2", "f3", "f4", "f5"];
        const scoresA: Array<0 | 0.5 | 1> = [0, 0.5, 0.5, 0.5, 1];
        const scoresB: Array<0 | 0.5 | 1> = [0.5, 0.5, 0.5, 0.5, 0.5];
        const results = familyIds.flatMap((familyId, familyIndex) => ([0, 1] as const).flatMap((slot) => [
            result({
                episodeId: `a-${familyId}-${slot}`,
                familyId,
                policyId: idA,
                seedBlockIndex: familyIndex,
                slot,
                score: scoresA[familyIndex],
                material: 99,
            }),
            result({
                episodeId: `b-${familyId}-${slot}`,
                familyId,
                policyId: idB,
                seedBlockIndex: familyIndex,
                slot,
                score: scoresB[familyIndex],
                material: 1,
            }),
        ]));
        const ranking = rankChampionshipPolicies(policies, familyIds, results, 1);
        expect(ranking[0].policyId).toBe(idB);
        expect(ranking[0].macroOutcomeScore).toBe(0.5);
        expect(ranking[1].macroOutcomeScore).toBe(0.5);
        expect(ranking[1].lower20FamilyCvar).toBe(0);
        expect(ranking.every(({ gameCount }) => gameCount === 10)).toBe(true);
    });

    test("fails closed on a missing reciprocal component or unequal policy seed schedule", () => {
        const policyA = DEFAULT_RESEARCH_POLICY;
        const policyB: ResearchPolicyConfig = { ...DEFAULT_RESEARCH_POLICY, attackGateMinTick: 5400 };
        const idA = researchPolicySha256(policyA);
        const idB = researchPolicySha256(policyB);
        const policies = [{ policyId: idA, policy: policyA }, { policyId: idB, policy: policyB }];
        const incomplete = [
            result({ episodeId: "a0", familyId: "f1", policyId: idA, seedBlockIndex: 1, slot: 0, score: 1 }),
            result({ episodeId: "a1", familyId: "f1", policyId: idA, seedBlockIndex: 1, slot: 1, score: 0 }),
            result({ episodeId: "b0", familyId: "f1", policyId: idB, seedBlockIndex: 2, slot: 0, score: 1 }),
        ];
        expect(() => rankChampionshipPolicies(policies, ["f1"], incomplete, 1)).toThrow(/complete championship schedule/);
        incomplete.push(result({
            episodeId: "b1",
            familyId: "f1",
            policyId: idB,
            seedBlockIndex: 2,
            slot: 1,
            score: 0,
        }));
        expect(() => rankChampionshipPolicies(policies, ["f1"], incomplete, 1)).toThrow(/same seed\/slot schedule/);
    });
});
