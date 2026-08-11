import { describe, expect, test } from "vitest";
import {
    analyzeMechanismBlocks,
    MechanismBlock,
    MechanismMethodId,
    RESEARCH_MECHANISM_METHOD_IDS,
    RESEARCH_MECHANISM_T_CRITICAL,
} from "../training/researchMechanismAblationAnalyzer.js";

const blocks = (): MechanismBlock[] => {
    const result: MechanismBlock[] = [];
    for (let family = 0; family < 10; family++) {
        for (let seed = 0; seed < 4; seed++) {
            const champion: [number, number] = family < 8 ? [1, 1] : family === 8 ? [0.5, 0.5] : [0, 0];
            const scores = Object.fromEntries(RESEARCH_MECHANISM_METHOD_IDS.map((methodId) => [
                methodId,
                methodId === "champion" ? champion : [0, 0],
            ])) as Record<MechanismMethodId, [number, number]>;
            result.push({ familyId: `family_${family}`, seedBlockIndex: family * 4 + seed, scores });
        }
    }
    return result;
};

describe("post-confirmatory mechanism analysis", () => {
    test("compares the champion with the equal average of five local winners", () => {
        const analysis = analyzeMechanismBlocks(blocks());
        expect(RESEARCH_MECHANISM_T_CRITICAL).toBeCloseTo(2.2621571627409915, 14);
        expect(analysis.mechanismContrast.estimate).toBeCloseTo(0.85, 12);
        expect(analysis.mechanismContrast.confidenceInterval.lower).toBeGreaterThan(0);
        expect(analysis.methods.champion).toEqual({ score: 0.85, candidateWins: 64, draws: 8, baselineWins: 8 });
        expect(analysis.pairwiseChampionMinusLocal).toHaveLength(5);
        expect(analysis.status).toBe("COMPLETE_POST_CONFIRMATORY_DIAGNOSTIC_NO_SELECTION");
    });

    test("marks constant cluster contrasts as invalid rather than manufacturing precision", () => {
        const constant = blocks().map((block) => ({
            ...block,
            scores: Object.fromEntries(RESEARCH_MECHANISM_METHOD_IDS.map((methodId) => [
                methodId,
                methodId === "champion" ? [1, 1] : [0, 0],
            ])) as Record<MechanismMethodId, [number, number]>,
        }));
        const analysis = analyzeMechanismBlocks(constant);
        expect(analysis.mechanismContrast.varianceValid).toBe(false);
        expect(analysis.mechanismContrast.confidenceInterval).toEqual({ lower: null, upper: null });
    });

    test("rejects incomplete, duplicate, and invalid-score schedules", () => {
        expect(() => analyzeMechanismBlocks(blocks().slice(1))).toThrow(/exactly forty/);
        const duplicate = blocks();
        duplicate[1] = { ...duplicate[0] };
        expect(() => analyzeMechanismBlocks(duplicate)).toThrow(/Duplicate/);
        const invalid = blocks();
        invalid[0].scores.champion[0] = 0.25;
        expect(() => analyzeMechanismBlocks(invalid)).toThrow(/must be 0, 0.5, or 1/);
    });
});
