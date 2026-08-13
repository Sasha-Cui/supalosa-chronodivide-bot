import { describe, expect, it } from "vitest";
import {
    parseTerminalRaceSacct,
    validateTerminalRaceTelemetry,
} from "../training/terminalRaceTechnicalGate.js";
import { TERMINAL_RACE_SHARD_COUNT } from "../training/terminalRaceCampaign.js";

describe("terminal-race technical gate", () => {
    it("accepts exactly 90 clean pi_jss233 scheduler tasks", () => {
        const rows = Array.from({ length: TERMINAL_RACE_SHARD_COUNT }, (_, index) =>
            `123_${index}|${9000 + index}|COMPLETED|0:0|pi_jss233`,
        ).join("\n");
        expect(parseTerminalRaceSacct(rows, "123").size).toBe(TERMINAL_RACE_SHARD_COUNT);
        expect(() => parseTerminalRaceSacct(rows.replace("pi_jss233", "other"), "123")).toThrow();
        expect(() => parseTerminalRaceSacct(rows.split("\n").slice(1).join("\n"), "123")).toThrow();
    });

    it("allows declared terminal-race telemetry and rejects undeclared fields", () => {
        expect(validateTerminalRaceTelemetry({
            schemaVersion: 2,
            event: "decision",
            informationBoundary: "public_complete_state",
            tick: 4_000,
            mechanism: "terminal_race",
            decisionKind: "terminal_candidate_strike",
            decisionReason: "sole_known_building_before_intercept",
            selectedBuildingId: 10,
            selectedBuildingVisible: false,
            selectedBuildingObservedBy: "public_complete_state",
            selectedAttackerIds: [1, 2],
            blockerIds: [],
            directCompletionTicks: 50,
            earliestLethalInterceptTick: null,
            activationReason: "guarded_building_count",
            exactEnemyBuildingCount: 1,
            eligibleAttackerCount: 5,
            certifiedAttackerCount: 3,
            rejectedAttackerCountsByReason: { unreachable_firing_perimeter: 2 },
            selectedAttackerRulesNames: ["HTNK", "HTNK"],
            delegatedActionCounts: { idle: 0, moving: 1, attacking: 2, other: 0 },
            assignedCombatantFraction: 0.4,
        }).mechanism).toBe("terminal_race");
        expect(() => validateTerminalRaceTelemetry({
            schemaVersion: 2,
            event: "decision",
            informationBoundary: "public_complete_state",
            tick: 4_000,
            mechanism: "terminal_race",
            endpointWinner: "candidate",
        })).toThrow("non-allowlisted");
    });
});
