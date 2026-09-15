import { describe, expect, it } from "vitest";
import { UnifiedIntentUpdateTelemetry } from
    "@supalosa/chronodivide-bot/dist/bot/logic/intent/unifiedIntentArbiter.js";
import {
    UnifiedIntentV2TelemetryCollector,
    validateUnifiedIntentV2Telemetry,
} from "../training/unifiedIntentV2Telemetry.js";

const scopes = () => ({
    terminal_objective: 0, emergency_defense: 0, home_guard: 0,
    objective_closeout: 0, tactical_assault: 0, route_sweep: 0,
    harassment: 0, baseline_core: 1,
});
const row = (tick: number, overrides: Partial<UnifiedIntentUpdateTelemetry> = {}):
UnifiedIntentUpdateTelemetry => ({
    tick, budgetMode: "separated_lanes_v2", commandCeiling: 115,
    totalCeiling: 150, gameplayReserve: 35, proposedCalls: 2, proposedUnitIds: 2,
    sameUnitConflicts: 1, invalidUnitIds: 0, invalidTargets: 0, invalidTiles: 0,
    duplicateSuppressions: 1, supersededPending: 0, expiredPending: 0,
    revokedPending: 0, deferredUnitIds: tick === 2 ? 3 : 0, pendingUnitIds: 0,
    productionBatches: 1, debugProposals: 0, debugCoalesced: 0,
    debugForwarded: 0, debugDropped: 0, forwardedGroups: 1,
    forwardedChunks: 1, forwardedOrderCalls: 1, forwardedUnitIds: 2,
    maxForwardedChunkSize: 2, multipleForwardedUnitViolations: 0,
    forwardedValidationViolations: 0, partialProductionBatchViolations: 0,
    rollingTotalCalls: 200 + tick, gameplayNonorderCalls: 100,
    rollingOrderCalls: tick, rollingGameplayNonorderCalls: 200,
    rollingDebugCalls: 0, rollingCommandCalls: tick,
    commandCeilingOverflow: false, gameplayReserveOverflow: false,
    totalCeilingOverflow: false, proposalsByScope: scopes(),
    winningUnitsByScope: scopes(), forwardedUnitsByScope: scopes(),
    forwardedActionSha256: tick.toString(16).padStart(64, "0"),
    ...overrides,
});

describe("unified intent V2 telemetry", () => {
    it("reduces essential and command lanes independently", () => {
        const collector = new UnifiedIntentV2TelemetryCollector();
        collector.observe(row(1));
        collector.observe(row(2));
        const value = collector.finish(2);
        expect(value).toMatchObject({
            budgetMode: "separated_lanes_v2", commandCeiling: 115,
            rollingUpdates: 900, essentialCalls: 200, productionBatches: 2,
            proposedCalls: 4, forwardedOrderCalls: 2, sameUnitConflicts: 2,
            duplicateSuppressions: 2, deferredUnitIds: 3,
            updatesWithDeferral: 1, maxRollingCommandCalls: 2,
            maxForwardedChunkSize: 2,
        });
    });

    it("rejects mode, clock, command overflow, and incomplete summaries", () => {
        expect(() => new UnifiedIntentV2TelemetryCollector().observe(
            row(1, { budgetMode: "hard_total_v1" }),
        )).toThrow(/schema/);
        expect(() => new UnifiedIntentV2TelemetryCollector().observe(row(2))).toThrow(/clock/);
        const overflow = new UnifiedIntentV2TelemetryCollector();
        overflow.observe(row(1, { commandCeilingOverflow: true }));
        expect(() => overflow.finish(1)).toThrow(/invariant/);
        const incomplete = new UnifiedIntentV2TelemetryCollector();
        incomplete.observe(row(1));
        expect(() => incomplete.finish(2)).toThrow(/incomplete/);
    });

    it("fails validation above the exact command cap", () => {
        const collector = new UnifiedIntentV2TelemetryCollector();
        collector.observe(row(1));
        const value = collector.finish(1);
        expect(() => validateUnifiedIntentV2Telemetry({
            ...value,
            maxRollingCommandCalls: 116,
        })).toThrow(/invariant/);
    });
});
