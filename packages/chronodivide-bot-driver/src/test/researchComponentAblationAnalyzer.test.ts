import { describe, expect, test } from "vitest";
import {
    analyzeComponentBlocks,
    ComponentBlock,
    RESEARCH_COMPONENT_T_CRITICAL_95,
    RESEARCH_COMPONENT_T_CRITICAL_BONFERRONI_95,
} from "../training/researchComponentAblationAnalyzer.js";
import {
    ComponentMethodId,
    RESEARCH_COMPONENT_METHOD_IDS,
} from "../training/researchComponentAblationPlanGenerator.js";

const blocks = (): ComponentBlock[] => {
    const result: ComponentBlock[] = [];
    for (let family = 0; family < 10; family++) {
        for (let seed = 0; seed < 4; seed++) {
            const champion: [number, number] = family < 8 ? [1, 1] : family === 8 ? [0.5, 0.5] : [0, 0];
            const scores = Object.fromEntries(RESEARCH_COMPONENT_METHOD_IDS.map((methodId) => [
                methodId,
                methodId === "champion" ? champion : [0, 0],
            ])) as Record<ComponentMethodId, [number, number]>;
            result.push({ familyId: `family_${family}`, seedBlockIndex: family * 4 + seed, scores });
        }
    }
    return result;
};

describe("post-confirmatory component analysis", () => {
    test("compares the champion with the equal average of five single-group reverts", () => {
        const analysis = analyzeComponentBlocks(blocks());
        expect(RESEARCH_COMPONENT_T_CRITICAL_95).toBeCloseTo(2.2621571627409915, 14);
        expect(RESEARCH_COMPONENT_T_CRITICAL_BONFERRONI_95).toBeCloseTo(3.2498355440153697, 14);
        expect(analysis.componentContrast.estimate).toBeCloseTo(0.85, 12);
        expect(analysis.componentContrast.confidenceInterval.lower).toBeGreaterThan(0);
        expect(analysis.methods.champion).toEqual({ score: 0.85, candidateWins: 64, draws: 8, baselineWins: 8 });
        expect(analysis.pairwiseChampionMinusAblation).toHaveLength(5);
        for (const contrast of analysis.pairwiseChampionMinusAblation) {
            expect(contrast.bonferroniFamilywise95.confidenceInterval.lower).toBeLessThanOrEqual(
                contrast.unadjusted95.confidenceInterval.lower as number,
            );
            expect(contrast.bonferroniFamilywise95.confidenceInterval.upper).toBeGreaterThanOrEqual(
                contrast.unadjusted95.confidenceInterval.upper as number,
            );
        }
        expect(analysis.status).toBe("COMPLETE_POST_CONFIRMATORY_COMPONENT_DIAGNOSTIC_NO_SELECTION");
    });

    test("marks constant cluster contrasts as invalid rather than manufacturing precision", () => {
        const constant = blocks().map((block) => ({
            ...block,
            scores: Object.fromEntries(RESEARCH_COMPONENT_METHOD_IDS.map((methodId) => [
                methodId,
                methodId === "champion" ? [1, 1] : [0, 0],
            ])) as Record<ComponentMethodId, [number, number]>,
        }));
        const analysis = analyzeComponentBlocks(constant);
        expect(analysis.componentContrast.varianceValid).toBe(false);
        expect(analysis.componentContrast.confidenceInterval).toEqual({ lower: null, upper: null });
    });

    test("rejects incomplete, duplicate, and invalid-score schedules", () => {
        expect(() => analyzeComponentBlocks(blocks().slice(1))).toThrow(/exactly forty/);
        const duplicate = blocks();
        duplicate[1] = { ...duplicate[0] };
        expect(() => analyzeComponentBlocks(duplicate)).toThrow(/Duplicate/);
        const invalid = blocks();
        invalid[0].scores.champion[0] = 0.25;
        expect(() => analyzeComponentBlocks(invalid)).toThrow(/must be 0, 0.5, or 1/);
    });
});
