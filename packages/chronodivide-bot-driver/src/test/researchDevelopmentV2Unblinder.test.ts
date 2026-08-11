import { describe, expect, test } from "vitest";
import {
    analyzeDevelopmentV2Phase3,
    DevelopmentV2Phase3Block,
    RESEARCH_DEVELOPMENT_V2_T_CRITICAL,
} from "../training/researchDevelopmentV2Unblinder.js";

const positiveBlocks = (): DevelopmentV2Phase3Block[] => {
    const blocks: DevelopmentV2Phase3Block[] = [];
    for (let family = 0; family < 10; family++) {
        for (let seed = 0; seed < 8; seed++) {
            const championScores: [number, number] = family < 8
                ? [1, 1]
                : family === 8
                    ? [0.5, 0.5]
                    : [0, 0];
            blocks.push({
                familyId: `mf_${family}`,
                seedBlockIndex: 2_000 + family * 8 + seed,
                defaultScores: [0, 0],
                championScores,
                defaultWallTimeMs: [10, 11],
                championWallTimeMs: [12, 13],
            });
        }
    }
    return blocks;
};

describe("single method-v2 development unblinding", () => {
    test("requires both frozen lower bounds to be positive", () => {
        const analysis = analyzeDevelopmentV2Phase3(positiveBlocks());
        expect(RESEARCH_DEVELOPMENT_V2_T_CRITICAL).toBeCloseTo(0.883403859685, 12);
        expect(analysis.improvement.estimate).toBeCloseTo(0.85, 12);
        expect(analysis.improvement.oneSidedLowerBound).toBeGreaterThan(0);
        expect(analysis.championAbsolute.championScore).toBeCloseTo(0.85, 12);
        expect(analysis.championAbsolute.oneSidedLowerBound).toBeGreaterThan(0);
        expect(analysis.status).toBe("PASSED_DEVELOPMENT_SIGNAL_GATE");
        expect(analysis.methods.champion).toEqual({
            score: 0.85,
            candidateWins: 128,
            draws: 16,
            baselineWins: 16,
        });
        expect(analysis.timingDiagnostics.available).toBe(true);
    });

    test("fails closed when either family-cluster variance is non-positive", () => {
        const blocks = positiveBlocks().map((block) => ({
            ...block,
            championScores: [1, 1] as [number, number],
        }));
        const analysis = analyzeDevelopmentV2Phase3(blocks);
        expect(analysis.improvement.varianceValid).toBe(false);
        expect(analysis.championAbsolute.varianceValid).toBe(false);
        expect(analysis.status).toBe("FAILED_DEVELOPMENT_SIGNAL_GATE");
    });

    test("rejects incomplete, duplicate, and invalid-score blocks", () => {
        expect(() => analyzeDevelopmentV2Phase3(positiveBlocks().slice(1))).toThrow(/exactly 80/);
        const duplicate = positiveBlocks();
        duplicate[1] = { ...duplicate[0] };
        expect(() => analyzeDevelopmentV2Phase3(duplicate)).toThrow(/Duplicate/);
        const invalid = positiveBlocks();
        invalid[0].championScores[0] = 0.25;
        expect(() => analyzeDevelopmentV2Phase3(invalid)).toThrow(/must be one of/);
    });
});
