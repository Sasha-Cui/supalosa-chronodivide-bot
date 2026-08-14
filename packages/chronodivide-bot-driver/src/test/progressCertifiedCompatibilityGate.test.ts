import { describe, expect, it } from "vitest";
import { Countries } from "@supalosa/chronodivide-bot/dist/bot/logic/common/utils.js";
import {
    PROGRESS_CERTIFIED_COMPATIBILITY_ENGINE_SEED_BASE,
    PROGRESS_CERTIFIED_COMPATIBILITY_MAX_TICKS,
    PROGRESS_CERTIFIED_COMPATIBILITY_RUNS_PER_COUNTRY_SLOT,
    validateProgressCertifiedCompatibilityExposure,
} from "../training/progressCertifiedCompatibilityGate.js";

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
});
