import { describe, expect, test } from "vitest";
import { Countries } from "@supalosa/chronodivide-bot/dist/bot/logic/common/utils.js";
import { ResearchEpisodeResult } from "../training/researchEpisode.js";
import { rankMethodV3Stage2Policies } from "../training/methodV3Stage2Reducer.js";
import { projectMethodV3PolicyToStage2, METHOD_V3_STARTING_POLICY, researchPolicySha256 } from "../training/researchPolicy.js";

const makeResult = (
    policyId: string,
    familyId: string,
    country: Countries,
    slot: 0 | 1,
    winner: "candidate" | "baseline" | "draw",
    baselineBuildings: number,
    ticks = 18_000,
): ResearchEpisodeResult => ({
    schemaVersion: 1,
    episodeId: `${policyId.slice(0, 4)}-${familyId}-${country}-${slot}`,
    familyId,
    mapName: "test.map",
    mapSha256: "a".repeat(64),
    methodId: policyId,
    policyId,
    policySha256: policyId,
    seedBlockIndex: 1,
    requestedEngineSeed: 1,
    botRandomSeed: 1,
    candidateBotRandomSeed: 2,
    baselineBotRandomSeed: 3,
    engineSeedEpochMs: 1_000,
    candidateSlot: slot,
    candidateCountry: country,
    baselineCountry: country,
    candidateStart: { x: 1, y: 1 },
    baselineStart: { x: 2, y: 2 },
    maxTicks: 18_000,
    ticks,
    wallTimeMs: 1,
    finished: winner !== "draw",
    winner,
    candidateScore: winner === "candidate" ? 1 : winner === "baseline" ? 0 : 0.5,
    outcomeEndpoint: "candidate-win=1,finished-or-tick-cap-draw=0.5,baseline-win=0",
    candidateDefeated: winner === "baseline",
    baselineDefeated: winner === "candidate",
    candidate: { credits: 0, units: 1, buildings: winner === "baseline" ? 0 : 1, combatants: 1, harvesters: 0, factories: 0, refineries: 0, conyards: 0, byName: {} },
    baseline: { credits: 0, units: baselineBuildings, buildings: baselineBuildings, combatants: 0, harvesters: 0, factories: 0, refineries: 0, conyards: 0, byName: {} },
});

describe("method-v3 Stage-2 reduction", () => {
    test("ranks actual wins ahead of a more favorable collection of draws", () => {
        const base = projectMethodV3PolicyToStage2(METHOD_V3_STARTING_POLICY);
        const winPolicy = { ...base, buildingEliminationMinTick: 8_400 };
        const drawPolicy = { ...base, buildingEliminationMinTick: 10_800 };
        const policies = [winPolicy, drawPolicy].map((policy) => ({ policy, policyId: researchPolicySha256(policy) }));
        const results = [
            makeResult(policies[0].policyId, "f1", Countries.IRAQ, 0, "candidate", 0, 12_000),
            makeResult(policies[0].policyId, "f1", Countries.IRAQ, 1, "draw", 10),
            makeResult(policies[1].policyId, "f1", Countries.IRAQ, 0, "draw", 0),
            makeResult(policies[1].policyId, "f1", Countries.IRAQ, 1, "draw", 0),
        ];
        const ranking = rankMethodV3Stage2Policies(policies, results);
        expect(ranking[0].policyId).toBe(policies[0].policyId);
        expect(ranking[0]).toMatchObject({ wins: 1, draws: 1, actualWinProbability: 0.5 });
        expect(ranking[1]).toMatchObject({ wins: 0, draws: 2, drawConversion: 1 });
    });

    test("uses surviving-building conversion only after decisive statistics tie", () => {
        const base = projectMethodV3PolicyToStage2(METHOD_V3_STARTING_POLICY);
        const one = { ...base, buildingEliminationReserveCombatants: 2 };
        const two = { ...base, buildingEliminationReserveCombatants: 6 };
        const policies = [one, two].map((policy) => ({ policy, policyId: researchPolicySha256(policy) }));
        const results = policies.flatMap(({ policyId }, index) => [
            makeResult(policyId, "f1", Countries.FRANCE, 0, "draw", index === 0 ? 1 : 8),
            makeResult(policyId, "f1", Countries.FRANCE, 1, "draw", index === 0 ? 1 : 8),
        ]);
        const ranking = rankMethodV3Stage2Policies(policies, results);
        expect(ranking[0].policyId).toBe(policies[0].policyId);
        expect(ranking[0].drawConversion).toBe(0.5);
    });

    test("refuses partial reciprocal evidence", () => {
        const policy = projectMethodV3PolicyToStage2(METHOD_V3_STARTING_POLICY);
        const policyId = researchPolicySha256(policy);
        expect(() => rankMethodV3Stage2Policies(
            [{ policy, policyId }],
            [makeResult(policyId, "f1", Countries.USA, 0, "draw", 1)],
        )).toThrow(/reciprocal pair/);
    });
});
