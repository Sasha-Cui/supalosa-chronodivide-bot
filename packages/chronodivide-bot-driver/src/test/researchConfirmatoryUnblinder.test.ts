import { describe, expect, test } from "vitest";
import {
    analyzeConfirmatoryBlocks,
    ConfirmatoryBlock,
    RESEARCH_CONFIRMATORY_ONE_SIDED_CRITICAL,
    RESEARCH_CONFIRMATORY_TWO_SIDED_CRITICAL,
} from "../training/researchConfirmatoryUnblinder.js";

const positiveBlocks = (): ConfirmatoryBlock[] => {
    const blocks: ConfirmatoryBlock[] = [];
    for (let family = 0; family < 16; family++) {
        for (let seed = 0; seed < 8; seed++) {
            const championScores: [number, number] = family < 13
                ? [1, 1]
                : family === 13
                    ? [0.5, 0.5]
                    : [0, 0];
            blocks.push({
                familyId: `mf_${family}`,
                seedBlockIndex: family * 8 + seed,
                defaultScores: [0, 0],
                championScores,
                defaultWallTimeMs: [10, 11],
                championWallTimeMs: [12, 13],
            });
        }
    }
    return blocks;
};

describe("single confirmatory unblinding", () => {
    test("requires both prespecified 95% lower bounds to be positive", () => {
        const analysis = analyzeConfirmatoryBlocks(positiveBlocks());
        expect(RESEARCH_CONFIRMATORY_TWO_SIDED_CRITICAL).toBeCloseTo(2.131449545559323, 14);
        expect(RESEARCH_CONFIRMATORY_ONE_SIDED_CRITICAL).toBeCloseTo(1.7530503556925547, 14);
        expect(analysis.improvement.estimate).toBeCloseTo(0.84375, 12);
        expect(analysis.improvement.confidenceInterval.lower).toBeGreaterThan(0);
        expect(analysis.championAbsolute.championScore).toBeCloseTo(0.84375, 12);
        expect(analysis.championAbsolute.oneSidedLowerBound).toBeGreaterThan(0);
        expect(analysis.status).toBe("PASSED_CONFIRMATORY_SUCCESS_GATE");
        expect(analysis.methods.champion).toEqual({
            score: 0.84375,
            candidateWins: 208,
            draws: 16,
            baselineWins: 32,
        });
        expect(analysis.timingDiagnostics.available).toBe(true);
    });

    test("fails closed when either family-cluster variance is non-positive", () => {
        const blocks = positiveBlocks().map((block) => ({
            ...block,
            championScores: [1, 1] as [number, number],
        }));
        const analysis = analyzeConfirmatoryBlocks(blocks);
        expect(analysis.improvement.varianceValid).toBe(false);
        expect(analysis.championAbsolute.varianceValid).toBe(false);
        expect(analysis.status).toBe("FAILED_CONFIRMATORY_SUCCESS_GATE");
    });

    test("rejects incomplete, duplicate, imbalanced, and invalid-score blocks", () => {
        expect(() => analyzeConfirmatoryBlocks(positiveBlocks().slice(1))).toThrow(/exactly 128/);
        const duplicate = positiveBlocks();
        duplicate[1] = { ...duplicate[0] };
        expect(() => analyzeConfirmatoryBlocks(duplicate)).toThrow(/Duplicate/);
        const imbalanced = positiveBlocks();
        imbalanced[0] = { ...imbalanced[0], familyId: "mf_1" };
        expect(() => analyzeConfirmatoryBlocks(imbalanced)).toThrow(/eight unique/);
        const invalid = positiveBlocks();
        invalid[0].championScores[0] = 0.25;
        expect(() => analyzeConfirmatoryBlocks(invalid)).toThrow(/must be 0, 0.5, or 1/);
    });
});
