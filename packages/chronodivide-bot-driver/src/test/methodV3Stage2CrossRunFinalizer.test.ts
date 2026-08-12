import { describe, expect, test } from "vitest";
import {
    methodV3Stage2RankingRowsEquivalent,
    selectMethodV3DevelopmentFinalists,
} from "../training/methodV3Stage2CrossRunFinalizer.js";
import { rankMethodV3Stage2OutcomeRecords } from "../training/methodV3Stage2Reducer.js";
import { projectMethodV3PolicyToStage2, METHOD_V3_STARTING_POLICY, researchPolicySha256 } from "../training/researchPolicy.js";

const policyFor = (index: number) => {
    const policy = {
        ...projectMethodV3PolicyToStage2(METHOD_V3_STARTING_POLICY),
        buildingEliminationMinTick: 7_200 + index * 600,
    };
    return { policy, policyId: researchPolicySha256(policy) };
};

const resultsFor = (
    finalists: ReturnType<typeof policyFor>[],
    runIndex: number,
) => finalists.flatMap(({ policyId }, policyRank) =>
    Array.from({ length: 22 }, (_, familyIndex) =>
        Array.from({ length: 9 }, (_, countryIndex) =>
            ([0, 1] as const).map((candidateSlot) => ({
                policyId,
                familyId: `family-${familyIndex}`,
                candidateCountry: `country-${countryIndex}`,
                candidateSlot,
                winner: (policyRank === 0
                    ? "candidate"
                    : policyRank === 1 && candidateSlot === 0
                        ? "candidate"
                        : "draw") as "candidate" | "baseline" | "draw",
                ticks: 12_000 + runIndex,
                baselineBuildings: policyRank,
            })),
        ).flat(),
    ).flat(),
);

describe("method-v3 Stage-2 cross-run finalist selection", () => {
    test("accepts only rounding-scale drift in recomputed ranking metrics", () => {
        const finalists = [policyFor(0), policyFor(1), policyFor(2)];
        const ranking = rankMethodV3Stage2OutcomeRecords(finalists, resultsFor(finalists, 0));
        const roundingOnly = ranking.map((row, index) => ({
            ...row,
            drawConversion: row.drawConversion + (index + 1) * Number.EPSILON,
        }));
        expect(methodV3Stage2RankingRowsEquivalent(roundingOnly, ranking)).toBe(true);
        expect(methodV3Stage2RankingRowsEquivalent(
            ranking.map((row, index) => index === 0 ? { ...row, drawConversion: row.drawConversion + 1e-6 } : row),
            ranking,
        )).toBe(false);
        expect(methodV3Stage2RankingRowsEquivalent(
            ranking.map((row, index) => index === 0 ? { ...row, wins: row.wins + 1 } : row),
            ranking,
        )).toBe(false);
        expect(methodV3Stage2RankingRowsEquivalent([ranking[1], ranking[0], ranking[2]], ranking)).toBe(false);
    });

    test("includes each distinct run winner and fills to five by the same ranking", () => {
        const policies = Array.from({ length: 8 }, (_, index) => policyFor(index));
        const runs = Array.from({ length: 5 }, (_, runIndex) => {
            const finalists = [policies[runIndex], policies[(runIndex + 1) % policies.length], policies[7]];
            const finalistResults = resultsFor(finalists, runIndex);
            return {
                optimizerRunIndex: runIndex,
                sourcePath: `/private/run-${runIndex}.json`,
                sourceSha256: "a".repeat(64),
                finalists,
                ranking: rankMethodV3Stage2OutcomeRecords(finalists, finalistResults),
                finalistResults,
            };
        });
        const selected = selectMethodV3DevelopmentFinalists(runs);
        expect(selected).toHaveLength(5);
        for (let runIndex = 0; runIndex < 5; runIndex++) {
            expect(selected.map(({ policyId }) => policyId)).toContain(policies[runIndex].policyId);
        }
    });

    test("deduplicates a common winner and fills from remaining complete finalists", () => {
        const policies = Array.from({ length: 5 }, (_, index) => policyFor(index));
        const runs = Array.from({ length: 5 }, (_, runIndex) => {
            const finalists = [policies[0], policies[(runIndex % 4) + 1], policies[((runIndex + 1) % 4) + 1]];
            const finalistResults = resultsFor(finalists, runIndex);
            return {
                optimizerRunIndex: runIndex,
                sourcePath: `/private/run-${runIndex}.json`,
                sourceSha256: "a".repeat(64),
                finalists,
                ranking: rankMethodV3Stage2OutcomeRecords(finalists, finalistResults),
                finalistResults,
            };
        });
        const selected = selectMethodV3DevelopmentFinalists(runs);
        expect(new Set(selected.map(({ policyId }) => policyId)).size).toBe(5);
        expect(selected[0].policyId).toBe(policies[0].policyId);
    });
});
