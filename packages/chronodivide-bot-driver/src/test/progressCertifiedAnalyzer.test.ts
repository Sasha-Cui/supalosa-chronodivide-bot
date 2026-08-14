import { describe, expect, it } from "vitest";
import {
    ProgressCertifiedAnalysisObservation,
    summarizeProgressCertifiedMechanismDiagnostics,
} from "../training/progressCertifiedAnalyzer.js";

const observation = (
    telemetry: ProgressCertifiedAnalysisObservation["telemetry"],
): ProgressCertifiedAnalysisObservation => ({
    shardIndex: 0,
    familyId: "family",
    country: "Americans",
    faction: "Allied",
    seedBlockIndex: 0,
    candidateSlot: 0,
    armId: "external_low_count_progress_hybrid",
    outcome: "candidate",
    literalWin: 1,
    score: 1,
    ticks: 9_000,
    terminalEnemyBuildingCount: 0,
    telemetry,
});

describe("progress-certified analyzer diagnostics", () => {
    it("summarizes activation, physical progress, deadlines, switching, and reserve release", () => {
        const diagnostics = summarizeProgressCertifiedMechanismDiagnostics([observation([
            {
                schemaVersion: 3,
                event: "decision",
                tick: 7_200,
                activationReason: "fixed_tick",
                decisionKind: "blocker_clear",
                selectedBuildingId: 10,
                lastPhysicalProgressTick: 7_000,
                physicalNoProgressTicks: 200,
                completeMissionCostTicks: 500,
                assignedCombatantFraction: 0.75,
                delegatedActionCounts: { idle: 0, moving: 2, attacking: 4, other: 0 },
            },
            {
                schemaVersion: 3,
                event: "decision",
                tick: 7_560,
                activationReason: "fixed_tick",
                decisionKind: "predecessor_fallback",
                selectedBuildingId: 11,
                lastPhysicalProgressTick: 7_300,
                physicalNoProgressTicks: 260,
                progressDeadlineExpired: "blocker",
                terminalReserveReleased: true,
                assignedCombatantFraction: 1,
                delegatedActionCounts: { idle: 0, moving: 1, attacking: 5, other: 0 },
            },
        ])]);

        expect(diagnostics.exposedEpisodes).toBe(1);
        expect(diagnostics.medianActivationTick).toBe(7_200);
        expect(diagnostics.deadlineExpirationCounts.blocker).toBe(1);
        expect(diagnostics.terminalReserveReleaseEvents).toBe(1);
        expect(diagnostics.selectedBuildingSwitches).toBe(1);
        expect(diagnostics.distinctPhysicalProgressUpdates).toBe(1);
        expect(diagnostics.medianPhysicalProgressIntervalTicks).toBe(300);
        expect(diagnostics.maximumPhysicalNoProgressTicks).toBe(260);
        expect(diagnostics.delegatedActionCounts.attacking).toBe(9);
        expect(diagnostics.medianTerminalEnemyBuildingCount).toBe(0);
    });

    it("reports a clean nonexposure episode without inventing progress", () => {
        const diagnostics = summarizeProgressCertifiedMechanismDiagnostics([observation([])]);
        expect(diagnostics.exposureProbability).toBe(0);
        expect(diagnostics.medianActivationTick).toBeNull();
        expect(diagnostics.medianPhysicalProgressIntervalTicks).toBeNull();
        expect(diagnostics.maximumPhysicalNoProgressTicks).toBeNull();
    });
});
