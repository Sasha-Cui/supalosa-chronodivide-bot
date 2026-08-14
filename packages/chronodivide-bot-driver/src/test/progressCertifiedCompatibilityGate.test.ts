import { describe, expect, it } from "vitest";
import { Countries } from "@supalosa/chronodivide-bot/dist/bot/logic/common/utils.js";
import {
    PROGRESS_CERTIFIED_COMPATIBILITY_ENGINE_SEED_BASE,
    PROGRESS_CERTIFIED_COMPATIBILITY_MAX_TICKS,
    PROGRESS_CERTIFIED_COMPATIBILITY_RUNS_PER_COUNTRY_SLOT,
    validateProgressCertifiedCompatibilityExposure,
} from "../training/progressCertifiedCompatibilityGate.js";
import { TerminalObjectiveTelemetry } from "../training/terminalObjectiveStrategy.js";

describe("progress-certified compatibility gate", () => {
    it("freezes an outcome-blind all-country equivalence, repeatability, and exposure budget", () => {
        expect(PROGRESS_CERTIFIED_COMPATIBILITY_MAX_TICKS).toBe(5_400);
        expect(PROGRESS_CERTIFIED_COMPATIBILITY_ENGINE_SEED_BASE).toBe(4_210_000_000);
        expect(PROGRESS_CERTIFIED_COMPATIBILITY_RUNS_PER_COUNTRY_SLOT).toBe(4);
        expect(9 * 2 * PROGRESS_CERTIFIED_COMPATIBILITY_RUNS_PER_COUNTRY_SLOT).toBe(72);
    });

    it("accepts progress-certified objective telemetry with a dynamic ordinary reserve", () => {
        expect(() => validateProgressCertifiedCompatibilityExposure([{
            schemaVersion: 3,
            event: "decision",
            informationBoundary: "public_complete_state",
            tick: 1_000,
            mechanism: "progress_certified_terminal_conversion",
            decisionKind: "building_strike",
            selectedAttackerIds: [3, 4],
            eligibleAttackerCount: 4,
            reservedCombatantCount: 2,
            reservedCombatantIds: [1, 2],
            exactEnemyBuildingCount: 4,
            lastPhysicalProgressTick: 900,
            physicalNoProgressTicks: 100,
            progressDeadlineExpired: null,
            terminalReserveReleased: false,
        }], Countries.USA, 0)).not.toThrow();
    });

    it("rejects a nonzero reserve in an exact final-building race", () => {
        expect(() => validateProgressCertifiedCompatibilityExposure([{
            schemaVersion: 3,
            event: "decision",
            informationBoundary: "public_complete_state",
            tick: 1_000,
            mechanism: "progress_certified_terminal_conversion",
            decisionKind: "terminal_candidate_strike",
            selectedAttackerIds: [2],
            eligibleAttackerCount: 2,
            reservedCombatantCount: 1,
            reservedCombatantIds: [1],
            exactEnemyBuildingCount: 1,
            lastPhysicalProgressTick: 900,
            physicalNoProgressTicks: 100,
            progressDeadlineExpired: null,
            terminalReserveReleased: true,
        }], Countries.USA, 0)).toThrow("Dynamic reserve size drifted");
    });

    it("requires an exact final-building count on reserve-release telemetry", () => {
        const fallback: TerminalObjectiveTelemetry = {
            schemaVersion: 3,
            event: "decision",
            informationBoundary: "public_complete_state",
            tick: 1_000,
            mechanism: "progress_certified_terminal_conversion",
            decisionKind: "predecessor_fallback",
            decisionReason: "physical_progress_deadline",
            selectedBuildingId: 10,
            selectedAttackerIds: [2],
            lastPhysicalProgressTick: 600,
            physicalNoProgressTicks: 400,
            progressDeadlineExpired: "blocker",
            terminalReserveReleased: true,
        };
        const action: TerminalObjectiveTelemetry = {
            ...fallback,
            decisionKind: "building_strike",
            decisionReason: "direct_building_is_fastest_survivable_mission",
            exactEnemyBuildingCount: 2,
            eligibleAttackerCount: 1,
            reservedCombatantCount: 1,
            reservedCombatantIds: [3],
            progressDeadlineExpired: null,
            terminalReserveReleased: false,
        };
        expect(() => validateProgressCertifiedCompatibilityExposure([action, {
            ...fallback,
            exactEnemyBuildingCount: 1,
        }], Countries.USA, 0)).not.toThrow();
        expect(() => validateProgressCertifiedCompatibilityExposure([action, fallback], Countries.USA, 0))
            .toThrow("lacks exact final-building provenance");
    });
});
