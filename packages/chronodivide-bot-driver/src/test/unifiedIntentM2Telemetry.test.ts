import { describe, expect, it } from "vitest";
import { UnifiedIntentUpdateTelemetry } from
    "@supalosa/chronodivide-bot/dist/bot/logic/intent/unifiedIntentArbiter.js";
import {
    UnifiedIntentM2TelemetryCollector,
    validateUnifiedIntentM2Telemetry,
} from "../training/unifiedIntentM2Telemetry.js";

const scopes = () => ({
    terminal_objective: 0, emergency_defense: 0, home_guard: 0,
    objective_closeout: 0, tactical_assault: 0, route_sweep: 0,
    harassment: 0, baseline_core: 1,
});
const row = (tick: number, overrides: Partial<UnifiedIntentUpdateTelemetry> = {}):
UnifiedIntentUpdateTelemetry => ({
    tick, totalCeiling: 150, gameplayReserve: 35, proposedCalls: 2,
    proposedUnitIds: 2, sameUnitConflicts: 1, invalidUnitIds: 0,
    invalidTargets: 0, invalidTiles: 0, duplicateSuppressions: 1,
    supersededPending: 0, expiredPending: 0, revokedPending: 0,
    deferredUnitIds: tick === 2 ? 3 : 0, pendingUnitIds: 0,
    productionBatches: 0, debugProposals: 0, debugCoalesced: 0,
    debugForwarded: 0, debugDropped: 0, forwardedGroups: 1,
    forwardedChunks: 1, forwardedOrderCalls: 1, forwardedUnitIds: 2,
    maxForwardedChunkSize: 2, multipleForwardedUnitViolations: 0,
    forwardedValidationViolations: 0, partialProductionBatchViolations: 0,
    rollingTotalCalls: tick, rollingOrderCalls: tick,
    rollingGameplayNonorderCalls: 0, rollingDebugCalls: 0,
    gameplayReserveOverflow: false, totalCeilingOverflow: false,
    proposalsByScope: scopes(), winningUnitsByScope: scopes(),
    forwardedUnitsByScope: scopes(),
    forwardedActionSha256: tick.toString(16).padStart(64, "0"),
    ...overrides,
});

describe("unified intent M2 telemetry", () => {
    it("reduces a variable-length clean outcome episode", () => {
        const collector = new UnifiedIntentM2TelemetryCollector();
        collector.observe(row(1));
        collector.observe(row(2));
        const value = collector.finish(2);
        expect(value).toMatchObject({
            updates: 2, proposedCalls: 4, forwardedOrderCalls: 2,
            sameUnitConflicts: 2, duplicateSuppressions: 2,
            deferredUnitIds: 3, updatesWithDeferral: 1,
            maxRollingTotalCalls: 2, maxRollingOrderCalls: 2,
        });
    });

    it("fails closed on clock, ceiling, incomplete, or overflow drift", () => {
        expect(() => new UnifiedIntentM2TelemetryCollector().observe(row(2))).toThrow(/clock/);
        expect(() => new UnifiedIntentM2TelemetryCollector().observe(
            row(1, { totalCeiling: 75 }),
        )).toThrow(/schema/);
        const incomplete = new UnifiedIntentM2TelemetryCollector();
        incomplete.observe(row(1));
        expect(() => incomplete.finish(2)).toThrow(/incomplete/);
        expect(() => validateUnifiedIntentM2Telemetry({
            ...new UnifiedIntentM2TelemetryCollectorWithOne().value,
            totalCeilingOverflowUpdates: 1,
        })).toThrow(/invariant/);
    });

    it("exposes invariant booleans only through the explicit diagnostic finish", () => {
        const collector = new UnifiedIntentM2TelemetryCollector();
        collector.observe(row(1, { gameplayReserveOverflow: true }));
        const value = collector.finishDiagnostic(1);
        expect(value.gameplayReserveOverflowUpdates).toBe(1);
        expect(() => validateUnifiedIntentM2Telemetry(value)).toThrow(/invariant/);
    });
});

class UnifiedIntentM2TelemetryCollectorWithOne {
    readonly value;
    constructor() {
        const collector = new UnifiedIntentM2TelemetryCollector();
        collector.observe(row(1));
        this.value = collector.finish(1);
    }
}
