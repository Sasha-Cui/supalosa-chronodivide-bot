import { describe, expect, it } from "vitest";
import { UnifiedIntentUpdateTelemetry } from
    "@supalosa/chronodivide-bot/dist/bot/logic/intent/unifiedIntentArbiter.js";
import { UnifiedIntentGate3TelemetryCollector } from
    "../training/unifiedIntentGate3Telemetry.js";

const scopes = (baseline = 0) => ({
    terminal_objective: 0,
    emergency_defense: 0,
    home_guard: 0,
    objective_closeout: 0,
    tactical_assault: 0,
    route_sweep: 0,
    harassment: 0,
    baseline_core: baseline,
});

const telemetry = (
    tick: number,
    overrides: Partial<UnifiedIntentUpdateTelemetry> = {},
): UnifiedIntentUpdateTelemetry => ({
    tick,
    totalCeiling: 75,
    gameplayReserve: 35,
    proposedCalls: 1,
    proposedUnitIds: 2,
    sameUnitConflicts: 0,
    invalidUnitIds: 0,
    invalidTargets: 0,
    invalidTiles: 0,
    duplicateSuppressions: 0,
    supersededPending: 0,
    expiredPending: 0,
    revokedPending: 0,
    deferredUnitIds: 0,
    pendingUnitIds: 0,
    productionBatches: 1,
    debugProposals: 0,
    debugCoalesced: 0,
    debugForwarded: 0,
    debugDropped: 0,
    forwardedGroups: 1,
    forwardedChunks: 1,
    forwardedOrderCalls: 1,
    forwardedUnitIds: 2,
    maxForwardedChunkSize: 2,
    multipleForwardedUnitViolations: 0,
    forwardedValidationViolations: 0,
    partialProductionBatchViolations: 0,
    rollingTotalCalls: tick,
    rollingOrderCalls: tick,
    rollingGameplayNonorderCalls: 0,
    rollingDebugCalls: 0,
    gameplayReserveOverflow: false,
    totalCeilingOverflow: false,
    proposalsByScope: scopes(1),
    winningUnitsByScope: scopes(2),
    forwardedUnitsByScope: scopes(2),
    forwardedActionSha256: tick.toString(16).padStart(64, "0"),
    ...overrides,
});

describe("unified intent Gate 3 telemetry", () => {
    it("reduces exact sums, maxima, scopes, and invariant updates", () => {
        const collector = new UnifiedIntentGate3TelemetryCollector(75, 3);
        collector.observe(telemetry(1));
        collector.observe(telemetry(2, {
            sameUnitConflicts: 3,
            duplicateSuppressions: 4,
            deferredUnitIds: 5,
            pendingUnitIds: 6,
            maxForwardedChunkSize: 7,
            gameplayReserveOverflow: true,
            multipleForwardedUnitViolations: 1,
        }));
        collector.observe(telemetry(3, {
            totalCeilingOverflow: true,
            forwardedValidationViolations: 2,
            partialProductionBatchViolations: 1,
        }));
        const value = collector.finish();
        expect(value).toMatchObject({
            complete: true,
            updates: 3,
            totalCeiling: 75,
            gameplayReserve: 35,
            orderCap: 40,
            gameplayReserveOverflowUpdates: 1,
            totalCeilingOverflowUpdates: 1,
            oneUnitMultipleForwardUpdates: 1,
            forwardedValidationViolationUpdates: 1,
            partialProductionBatchViolationUpdates: 1,
            updatesWithDeferral: 1,
        });
        expect(value.sums).toMatchObject({
            proposedCalls: 3,
            proposedUnitIds: 6,
            sameUnitConflicts: 3,
            duplicateSuppressions: 4,
            deferredUnitIds: 5,
        });
        expect(value.maxima).toMatchObject({
            pendingUnitIds: 6,
            maxForwardedChunkSize: 7,
            rollingTotalCalls: 3,
        });
        expect(value.proposalsByScope.baseline_core).toBe(3);
        expect(value.winningUnitsByScope.baseline_core).toBe(6);
        expect(value.forwardedUnitsByScope.baseline_core).toBe(6);
        expect(value.telemetrySha256).toMatch(/^[0-9a-f]{64}$/);
    });

    it("rejects clock, ceiling, negative, and scope drift", () => {
        expect(() => {
            const collector = new UnifiedIntentGate3TelemetryCollector(75, 1);
            collector.observe(telemetry(2));
        }).toThrow(/clock/);
        expect(() => {
            const collector = new UnifiedIntentGate3TelemetryCollector(75, 1);
            collector.observe(telemetry(1, { totalCeiling: 150 }));
        }).toThrow(/identity/);
        expect(() => {
            const collector = new UnifiedIntentGate3TelemetryCollector(75, 1);
            collector.observe(telemetry(1, { proposedCalls: -1 }));
        }).toThrow(/numeric/);
        expect(() => {
            const collector = new UnifiedIntentGate3TelemetryCollector(75, 1);
            collector.observe(telemetry(1, {
                proposalsByScope: { ...scopes(), unknown: 1 } as any,
            }));
        }).toThrow(/scope/);
    });

    it("requires the complete fixed update count", () => {
        const collector = new UnifiedIntentGate3TelemetryCollector(300, 2);
        collector.observe(telemetry(1, { totalCeiling: 300 }));
        expect(() => collector.finish()).toThrow(/incomplete/);
    });
});
