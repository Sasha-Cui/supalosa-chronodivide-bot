import { describe, expect, it } from "vitest";
import {
    parseContinuousOffenseSacct,
    validateContinuousOffenseTelemetry,
} from "../training/continuousOffenseTechnicalGate.js";
import { CONTINUOUS_OFFENSE_SHARD_COUNT } from "../training/continuousOffenseCampaign.js";

describe("continuous-offense technical gate", () => {
    it("accepts exactly 90 clean pi_jss233 scheduler tasks", () => {
        const rows = Array.from({ length: CONTINUOUS_OFFENSE_SHARD_COUNT }, (_, index) =>
            `123_${index}|${9000 + index}|COMPLETED|0:0|pi_jss233`,
        ).join("\n");
        expect(parseContinuousOffenseSacct(rows, "123").size).toBe(CONTINUOUS_OFFENSE_SHARD_COUNT);
        expect(() => parseContinuousOffenseSacct(rows.replace("pi_jss233", "other"), "123")).toThrow();
        expect(() => parseContinuousOffenseSacct(rows.split("\n").slice(1).join("\n"), "123")).toThrow();
    });

    it("allows reserve-aware scheduler telemetry and rejects outcome fields", () => {
        expect(validateContinuousOffenseTelemetry({
            schemaVersion: 2,
            event: "decision",
            informationBoundary: "public_complete_state",
            tick: 12_600,
            mechanism: "continuous_objective_offense",
            decisionKind: "blocker_clear",
            decisionReason: "route_blockers_delay_terminal_building",
            selectedBuildingId: 10,
            selectedBuildingVisible: true,
            selectedBuildingObservedBy: "public_complete_state",
            selectedAttackerIds: [3, 4],
            blockerIds: [20],
            activationReason: "fixed_tick",
            exactEnemyBuildingCount: 3,
            eligibleAttackerCount: 4,
            reservedCombatantCount: 2,
            reservedCombatantIds: [1, 2],
            reservedActionCounts: { idle: 1, moving: 1, attacking: 0, other: 0 },
            certifiedAttackerCount: 2,
            selectedAttackerRulesNames: ["HTNK", "HTNK"],
            delegatedActionCounts: { idle: 0, moving: 1, attacking: 1, other: 0 },
            assignedCombatantFraction: 1,
        }).mechanism).toBe("continuous_objective_offense");
        expect(() => validateContinuousOffenseTelemetry({
            schemaVersion: 2,
            event: "decision",
            informationBoundary: "public_complete_state",
            tick: 12_600,
            mechanism: "continuous_objective_offense",
            endpointWinner: "candidate",
        })).toThrow("non-allowlisted");
        expect(() => validateContinuousOffenseTelemetry({
            schemaVersion: 2,
            event: "decision",
            informationBoundary: "public_complete_state",
            tick: 12_600,
            mechanism: "continuous_objective_offense",
            selectedAttackerIds: [1],
            reservedCombatantIds: [1],
        })).toThrow("overlap");
    });
});
