import { describe, expect, it } from "vitest";
import {
    PROGRESS_CERTIFIED_V5_OPEN_DEVELOPMENT_COUNTRIES,
    PROGRESS_CERTIFIED_V5_OPEN_DEVELOPMENT_FAMILIES,
} from "../training/progressCertifiedV5OpenDevelopmentCampaign.js";
import { PROGRESS_CERTIFIED_V5_ARM_ORDER } from "../training/progressCertifiedV5ExperimentPolicy.js";
import {
    ProgressCertifiedV5Observation,
    evaluateProgressCertifiedV5Advancement,
    parseProgressCertifiedV5Sacct,
    progressCertifiedV5PairedFamilyScoreEffects,
    validateProgressCertifiedV5Telemetry,
} from "../training/progressCertifiedV5OpenDevelopmentAggregate.js";

const outcomeCounts = (wins: number, draws: number, losses: number) => ({
    games: wins + draws + losses,
    wins,
    draws,
    losses,
    literalWinProbability: wins / (wins + draws + losses),
    drawProbability: draws / (wins + draws + losses),
    score: (wins + 0.5 * draws) / (wins + draws + losses),
});

describe("progress-certified V5 open-development aggregate", () => {
    it("requires all 90 clean authorized scheduler tasks", () => {
        const raw = Array.from({ length: 90 }, (_, index) =>
            `123_${index}|${9000 + index}|COMPLETED|0:0|pi_jss233`,
        ).join("\n");
        expect(parseProgressCertifiedV5Sacct(raw, "123").size).toBe(90);
        expect(() => parseProgressCertifiedV5Sacct(
            raw.replace("123_4|9004|COMPLETED|0:0|pi_jss233", "123_4|9004|FAILED|1:0|pi_jss233"),
            "123",
        )).toThrow("failed, duplicate, or unauthorized");
    });

    it("distinguishes frozen V4 telemetry from visibility-aware V5 telemetry", () => {
        const base = {
            event: "decision",
            informationBoundary: "public_complete_state",
            tick: 100,
            mechanism: "progress_certified_terminal_conversion",
            decisionKind: "building_strike",
            selectedBuildingId: 7,
            selectedBuildingVisible: false,
            selectedBuildingObservedBy: "public_complete_state",
            selectedAttackerIds: [1, 2],
        };
        expect(validateProgressCertifiedV5Telemetry({ ...base, schemaVersion: 3 }, 3).schemaVersion).toBe(3);
        expect(validateProgressCertifiedV5Telemetry({
            ...base,
            schemaVersion: 4,
            selectedBuildingCoordinates: { x: 10, y: 20 },
            selectedBuildingOrderMode: "attack_move_exact_unseen_coordinates",
        }, 4).schemaVersion).toBe(4);
        expect(() => validateProgressCertifiedV5Telemetry({
            ...base,
            schemaVersion: 4,
            selectedBuildingCoordinates: { x: 10, y: 20 },
            selectedBuildingOrderMode: "attack_visible_building",
        }, 4)).toThrow("lacks coordinate approach mode");
    });

    it("computes paired family score effects from the complete three-arm population", () => {
        const observations: ProgressCertifiedV5Observation[] = [];
        let shardIndex = 0;
        for (const family of PROGRESS_CERTIFIED_V5_OPEN_DEVELOPMENT_FAMILIES) {
            for (const country of PROGRESS_CERTIFIED_V5_OPEN_DEVELOPMENT_COUNTRIES) {
                for (const candidateSlot of [0, 1] as const) {
                    for (const armId of PROGRESS_CERTIFIED_V5_ARM_ORDER) {
                        const candidate = armId === "visibility_aware_final_building_v5";
                        observations.push({
                            shardIndex,
                            familyId: family.familyId,
                            country,
                            faction: PROGRESS_CERTIFIED_V5_OPEN_DEVELOPMENT_COUNTRIES.indexOf(country) < 5
                                ? "Allied" : "Soviet",
                            candidateSlot,
                            armId,
                            outcome: candidate ? "candidate" : "draw",
                            outcomeStatus: candidate ? "candidate_win" : "tick_cap_draw",
                            score: candidate ? 1 : 0.5,
                            ticks: 1_000,
                            engineFinished: candidate,
                            candidateBuildings: 1,
                            baselineBuildings: candidate ? 0 : 1,
                            candidateQuitAttempts: 0,
                            baselineQuitAttempts: 0,
                            candidateAttributedBuildingDestructionTicks: candidate ? [1_000] : [],
                            baselineAttributedBuildingDestructionTicks: [],
                            telemetry: [],
                        });
                    }
                }
                shardIndex++;
            }
        }
        const effects = progressCertifiedV5PairedFamilyScoreEffects(observations);
        expect(effects).toHaveLength(10);
        expect(effects.every(({ effect }) => effect === 0.5)).toBe(true);
    });

    it("advances only when every reliable-improvement condition passes", () => {
        const v5Counts = outcomeCounts(12, 6, 2);
        const passed = evaluateProgressCertifiedV5Advancement({
            technicalGatePassed: true,
            familyEffects: Array(10).fill(0.1),
            v5: {
                ...v5Counts,
                factionCounts: [outcomeCounts(6, 3, 1), outcomeCounts(6, 3, 1)],
                countryCounts: Array(9).fill(null).map(() => outcomeCounts(2, 1, 0)),
                familyMacroLiteralWinProbability: 0.6,
                familyMacroDrawProbability: 0.3,
            },
            external: { familyMacroLiteralWinProbability: 0.2, familyMacroDrawProbability: 0.65 },
            v4: { familyMacroLiteralWinProbability: 0.25, familyMacroDrawProbability: 0.6 },
        });
        expect(passed.advanced).toBe(true);
        expect(passed.lowerBound).toBeCloseTo(0.1);
        const failed = evaluateProgressCertifiedV5Advancement({
            technicalGatePassed: true,
            familyEffects: [0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, -1],
            v5: {
                ...v5Counts,
                factionCounts: [outcomeCounts(6, 3, 1), outcomeCounts(6, 3, 1)],
                countryCounts: Array(9).fill(null).map(() => outcomeCounts(2, 1, 0)),
                familyMacroLiteralWinProbability: 0.6,
                familyMacroDrawProbability: 0.3,
            },
            external: { familyMacroLiteralWinProbability: 0.2, familyMacroDrawProbability: 0.65 },
            v4: { familyMacroLiteralWinProbability: 0.25, familyMacroDrawProbability: 0.6 },
        });
        expect(failed.advanced).toBe(false);
        expect(failed.checks.pairedFamilyClustered80LowerScoreEffectAboveZero).toBe(false);
    });
});
