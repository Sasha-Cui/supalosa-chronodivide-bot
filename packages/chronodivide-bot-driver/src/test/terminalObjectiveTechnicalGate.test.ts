import { describe, expect, test } from "vitest";
import { TERMINAL_OBJECTIVE_SHARD_COUNT } from "../training/terminalObjectiveCampaign.js";
import {
    parseTerminalObjectiveSacct,
    validateTerminalObjectiveTelemetry,
} from "../training/terminalObjectiveTechnicalGate.js";
import { TERMINAL_OBJECTIVE_INFORMATION_BOUNDARY } from "../training/terminalObjectivePolicy.js";

describe("terminal-objective fail-closed technical gate", () => {
    const complete = Array.from({ length: TERMINAL_OBJECTIVE_SHARD_COUNT }, (_, index) =>
        `123_${index}|${900000 + index}|COMPLETED|0:0|pi_jss233`,
    ).join("\n");

    test("accepts exactly one clean row for each of 180 shards", () => {
        const tasks = parseTerminalObjectiveSacct(complete, "123");
        expect(tasks.size).toBe(TERMINAL_OBJECTIVE_SHARD_COUNT);
        expect(tasks.get(TERMINAL_OBJECTIVE_SHARD_COUNT - 1)?.schedulerJobId)
            .toBe(String(900000 + TERMINAL_OBJECTIVE_SHARD_COUNT - 1));
    });

    test("rejects partial, failed, duplicated, or wrong-account scheduler evidence", () => {
        expect(() => parseTerminalObjectiveSacct(complete.split("\n").slice(0, -1).join("\n"), "123"))
            .toThrow(new RegExp(`${TERMINAL_OBJECTIVE_SHARD_COUNT - 1}\\/${TERMINAL_OBJECTIVE_SHARD_COUNT}`));
        expect(() => parseTerminalObjectiveSacct(complete.replace("COMPLETED|0:0", "FAILED|1:0"), "123")).toThrow();
        expect(() => parseTerminalObjectiveSacct(complete.replace("pi_jss233", "other"), "123")).toThrow();
        expect(() => parseTerminalObjectiveSacct(`${complete}\n${complete.split("\n")[0]}`, "123")).toThrow();
    });

    test("accepts only allowlisted, legal-observation terminal telemetry", () => {
        expect(validateTerminalObjectiveTelemetry({
            schemaVersion: 1,
            event: "decision",
            informationBoundary: TERMINAL_OBJECTIVE_INFORMATION_BOUNDARY,
            tick: 7200,
            mechanism: "full_sufficient_strike",
            decisionKind: "terminal_candidate_strike",
            decisionReason: "terminal_building_before_intercept",
            selectedBuildingId: 42,
            selectedBuildingVisible: true,
            selectedAttackerIds: [7, 8],
            blockerIds: [],
            predictedCompletionTicks: 36,
            directCompletionTicks: 36,
            earliestLethalInterceptTick: 48,
            earliestBaseDestructionTick: 20,
            noProgressTicks: 0,
            searchCoverageFraction: 0.5,
        }).event).toBe("decision");
        expect(() => validateTerminalObjectiveTelemetry({
            schemaVersion: 1,
            event: "decision",
            informationBoundary: "complete-state",
            tick: 7200,
            mechanism: "full_sufficient_strike",
        })).toThrow(/malformed/);
        expect(() => validateTerminalObjectiveTelemetry({
            schemaVersion: 1,
            event: "search_orders",
            informationBoundary: TERMINAL_OBJECTIVE_INFORMATION_BOUNDARY,
            tick: 7200,
            mechanism: "persistent_liveness",
            selectedAttackerIds: [1, -2],
        })).toThrow(/nonnegative integer ids/);
        expect(() => validateTerminalObjectiveTelemetry({
            schemaVersion: 1,
            event: "decision",
            informationBoundary: TERMINAL_OBJECTIVE_INFORMATION_BOUNDARY,
            tick: 7200,
            mechanism: "full_sufficient_strike",
            enemyAllUnits: 100,
        })).toThrow(/non-allowlisted/);
    });
});
