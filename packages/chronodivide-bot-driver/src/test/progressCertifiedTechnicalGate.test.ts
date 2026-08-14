import { describe, expect, it } from "vitest";
import {
    parseProgressCertifiedSacct,
    validateProgressCertifiedTelemetry,
} from "../training/progressCertifiedTechnicalGate.js";
import { PROGRESS_CERTIFIED_SHARD_COUNT } from "../training/progressCertifiedCampaign.js";

describe("progress-certified technical gate", () => {
    it("accepts exactly 90 clean pi_jss233 scheduler tasks", () => {
        const rows = Array.from({ length: PROGRESS_CERTIFIED_SHARD_COUNT }, (_, index) =>
            `123_${index}|${9000 + index}|COMPLETED|0:0|pi_jss233`,
        ).join("\n");
        expect(parseProgressCertifiedSacct(rows, "123").size).toBe(PROGRESS_CERTIFIED_SHARD_COUNT);
        expect(() => parseProgressCertifiedSacct(rows.replace("pi_jss233", "other"), "123")).toThrow();
        expect(() => parseProgressCertifiedSacct(rows.split("\n").slice(1).join("\n"), "123")).toThrow();
    });

    it("accepts physical-progress evidence and final-building reserve release", () => {
        const event = validateProgressCertifiedTelemetry({
            schemaVersion: 3,
            event: "decision",
            informationBoundary: "public_complete_state",
            tick: 12_600,
            mechanism: "progress_certified_terminal_conversion",
            decisionKind: "blocker_clear",
            decisionReason: "route_blockers_delay_terminal_building",
            selectedBuildingId: 10,
            selectedBuildingVisible: true,
            selectedBuildingObservedBy: "public_complete_state",
            selectedAttackerIds: [3, 4],
            blockerIds: [20],
            activationReason: "guarded_building_count",
            exactEnemyBuildingCount: 1,
            eligibleAttackerCount: 4,
            reservedCombatantCount: 0,
            reservedCombatantIds: [],
            reservedActionCounts: { idle: 0, moving: 0, attacking: 0, other: 0 },
            certifiedAttackerCount: 4,
            selectedAttackerRulesNames: ["HTNK", "HTNK", "HTNK", "HTNK"],
            delegatedActionCounts: { idle: 0, moving: 2, attacking: 2, other: 0 },
            assignedCombatantFraction: 1,
            lastPhysicalProgressTick: 12_500,
            physicalNoProgressTicks: 100,
            missionStartedTick: 12_300,
            progressDeadlineExpired: "blocker",
            terminalReserveReleased: true,
            completeMissionCostTicks: 420,
        });
        expect(event.mechanism).toBe("progress_certified_terminal_conversion");
        expect(event.terminalReserveReleased).toBe(true);
    });

    it("rejects outcome fields, future clocks, and premature reserve release", () => {
        const base = {
            schemaVersion: 3,
            event: "decision",
            informationBoundary: "public_complete_state",
            tick: 7_200,
            mechanism: "progress_certified_terminal_conversion",
        } as const;
        expect(() => validateProgressCertifiedTelemetry({ ...base, endpointWinner: "candidate" }))
            .toThrow("non-allowlisted");
        expect(() => validateProgressCertifiedTelemetry({ ...base, lastPhysicalProgressTick: 7_201 }))
            .toThrow("future");
        expect(() => validateProgressCertifiedTelemetry({
            ...base,
            exactEnemyBuildingCount: 2,
            terminalReserveReleased: true,
        })).toThrow("outside the final-building state");
    });
});
