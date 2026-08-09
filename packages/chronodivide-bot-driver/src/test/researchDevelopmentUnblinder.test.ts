import { describe, expect, test } from "vitest";
import {
    analyzeDevelopmentPhase3,
    DevelopmentPhase3Block,
    RESEARCH_DEVELOPMENT_T_CRITICAL,
} from "../training/researchDevelopmentUnblinder.js";

const balancedBlocks = (): DevelopmentPhase3Block[] => {
    const blocks: DevelopmentPhase3Block[] = [];
    for (let family = 0; family < 10; family++) {
        for (let run = 0; run < 5; run++) {
            for (let seed = 0; seed < 4; seed++) {
                blocks.push({
                    familyId: `mf_${family}`,
                    optimizerRunIndex: run,
                    seedBlockIndex: 3_000 + family * 4 + seed,
                    globalScores: [0, 0],
                    conditionedScores: family < 8 ? [1, 1] : [0.5, 0.5],
                    globalWallTimeMs: [10, 11],
                    conditionedWallTimeMs: [12, 13],
                });
            }
        }
    }
    return blocks;
};

describe("single phase-3 development unblinding analysis", () => {
    test("computes the frozen family/run clustered lower bound", () => {
        const analysis = analyzeDevelopmentPhase3(balancedBlocks());
        expect(RESEARCH_DEVELOPMENT_T_CRITICAL).toBeCloseTo(0.9409645772351825, 14);
        expect(analysis.primary.estimate).toBeCloseTo(0.9, 12);
        expect(analysis.primary.varianceValid).toBe(true);
        expect(analysis.primary.oneSidedLowerBound).toBeGreaterThan(0);
        expect(analysis.primary.passed).toBe(true);
        expect(analysis.status).toBe("PASSED_DEVELOPMENT_SIGNAL_GATE");
        expect(analysis.methods.conditioned).toEqual({
            score: 0.9,
            candidateWins: 320,
            draws: 80,
            baselineWins: 0,
        });
        expect(analysis.timingDiagnostics.available).toBe(true);
    });

    test("fails closed when the two-way sandwich variance is non-positive", () => {
        const blocks = balancedBlocks().map((block) => ({
            ...block,
            conditionedScores: [1, 1] as [number, number],
        }));
        const analysis = analyzeDevelopmentPhase3(blocks);
        expect(analysis.primary.varianceValid).toBe(false);
        expect(analysis.primary.standardError).toBeNull();
        expect(analysis.primary.oneSidedLowerBound).toBeNull();
        expect(analysis.primary.passed).toBe(false);
    });

    test("rejects incomplete, duplicate, and invalid-score designs", () => {
        expect(() => analyzeDevelopmentPhase3(balancedBlocks().slice(1))).toThrow(/exactly 200/);
        const duplicate = balancedBlocks();
        duplicate[1] = { ...duplicate[0] };
        expect(() => analyzeDevelopmentPhase3(duplicate)).toThrow(/Duplicate phase-3 block/);
        const invalid = balancedBlocks();
        invalid[0].globalScores[0] = 0.25;
        expect(() => analyzeDevelopmentPhase3(invalid)).toThrow(/must be one of/);
    });
});
