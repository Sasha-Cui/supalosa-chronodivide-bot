import { describe, expect, test } from "vitest";
import { Countries } from "@supalosa/chronodivide-bot/dist/bot/logic/common/utils.js";
import { ResearchEpisodeResult, RESEARCH_OUTCOME_ENDPOINT } from "../training/researchEpisode.js";
import { rankStagePolicies, terminalMaterialAdvantage, trainingSelectionUtility } from "../training/researchStageReducer.js";
import { DEFAULT_RESEARCH_POLICY, ResearchPolicyConfig, researchPolicySha256 } from "../training/researchPolicy.js";

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
    slot: 0 | 1;
    score: 0 | 0.5 | 1;
    candidateMaterial: number;
    baselineMaterial: number;
}): ResearchEpisodeResult => ({
    schemaVersion: 1,
    episodeId: args.episodeId,
    familyId: args.familyId,
    mapName: "alpha.map",
    mapSha256: "0".repeat(64),
    policyId: args.policyId,
    policySha256: args.policyId,
    seedBlockIndex: 0,
    requestedEngineSeed: 1,
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
    candidate: player(args.candidateMaterial),
    baseline: player(args.baselineMaterial),
});

describe("prospective optimizer stage reduction", () => {
    test("uses a bounded material term that cannot reverse loss/draw/win ordering", () => {
        const policyId = researchPolicySha256(DEFAULT_RESEARCH_POLICY);
        const lossAhead = result({
            episodeId: "loss",
            familyId: "f",
            policyId,
            slot: 0,
            score: 0,
            candidateMaterial: 100,
            baselineMaterial: 0,
        });
        const drawBehind = result({
            episodeId: "draw",
            familyId: "f",
            policyId,
            slot: 0,
            score: 0.5,
            candidateMaterial: 0,
            baselineMaterial: 100,
        });
        const winBehind = { ...drawBehind, episodeId: "win", winner: "candidate" as const, candidateScore: 1 as const };
        expect(terminalMaterialAdvantage(lossAhead)).toBeGreaterThan(0);
        expect(terminalMaterialAdvantage(drawBehind)).toBeLessThan(0);
        expect(trainingSelectionUtility(lossAhead)).toBeLessThan(trainingSelectionUtility(drawBehind));
        expect(trainingSelectionUtility(drawBehind)).toBeLessThan(trainingSelectionUtility(winBehind));
    });

    test("ranks equal-family reciprocal policy results deterministically", () => {
        const policyA = DEFAULT_RESEARCH_POLICY;
        const policyB: ResearchPolicyConfig = { ...DEFAULT_RESEARCH_POLICY, attackGateMinTick: 5400 };
        const idA = researchPolicySha256(policyA);
        const idB = researchPolicySha256(policyB);
        const policies = [{ policyId: idA, policy: policyA }, { policyId: idB, policy: policyB }];
        const results = [
            result({ episodeId: "a-f1-0", familyId: "f1", policyId: idA, slot: 0, score: 1, candidateMaterial: 2, baselineMaterial: 1 }),
            result({ episodeId: "a-f1-1", familyId: "f1", policyId: idA, slot: 1, score: 0, candidateMaterial: 0, baselineMaterial: 2 }),
            result({ episodeId: "a-f2-0", familyId: "f2", policyId: idA, slot: 0, score: 0.5, candidateMaterial: 2, baselineMaterial: 1 }),
            result({ episodeId: "a-f2-1", familyId: "f2", policyId: idA, slot: 1, score: 0.5, candidateMaterial: 2, baselineMaterial: 1 }),
            result({ episodeId: "b-f1-0", familyId: "f1", policyId: idB, slot: 0, score: 1, candidateMaterial: 3, baselineMaterial: 1 }),
            result({ episodeId: "b-f1-1", familyId: "f1", policyId: idB, slot: 1, score: 1, candidateMaterial: 3, baselineMaterial: 1 }),
            result({ episodeId: "b-f2-0", familyId: "f2", policyId: idB, slot: 0, score: 0, candidateMaterial: 0, baselineMaterial: 3 }),
            result({ episodeId: "b-f2-1", familyId: "f2", policyId: idB, slot: 1, score: 0.5, candidateMaterial: 1, baselineMaterial: 1 }),
        ];
        const ranking = rankStagePolicies(policies, ["f1", "f2"], results);
        expect(ranking.map(({ policyId }) => policyId)).toEqual([idB, idA]);
        expect(ranking.map(({ rank }) => rank)).toEqual([1, 2]);
        expect(ranking.every(({ familyCount, gameCount }) => familyCount === 2 && gameCount === 4)).toBe(true);
    });

    test("fails on a missing reciprocal component", () => {
        const policyId = researchPolicySha256(DEFAULT_RESEARCH_POLICY);
        expect(() => rankStagePolicies(
            [{ policyId, policy: DEFAULT_RESEARCH_POLICY }],
            ["f1"],
            [result({ episodeId: "only", familyId: "f1", policyId, slot: 0, score: 1, candidateMaterial: 1, baselineMaterial: 0 })],
        )).toThrow(/complete reciprocal game pair/);
    });
});
