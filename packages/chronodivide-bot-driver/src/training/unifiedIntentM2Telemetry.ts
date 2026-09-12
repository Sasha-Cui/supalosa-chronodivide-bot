import {
    UnifiedIntentUpdateTelemetry,
    UNIFIED_INTENT_GAMEPLAY_RESERVE,
} from "@supalosa/chronodivide-bot/dist/bot/logic/intent/unifiedIntentArbiter.js";

export type UnifiedIntentM2TelemetrySummary = {
    complete: true;
    updates: number;
    totalCeiling: 150;
    gameplayReserve: 35;
    orderCap: 115;
    proposedCalls: number;
    forwardedOrderCalls: number;
    sameUnitConflicts: number;
    duplicateSuppressions: number;
    deferredUnitIds: number;
    updatesWithDeferral: number;
    maxRollingTotalCalls: number;
    maxRollingOrderCalls: number;
    maxForwardedChunkSize: number;
    gameplayReserveOverflowUpdates: number;
    totalCeilingOverflowUpdates: number;
    oneForwardViolationUpdates: number;
    forwardedValidationViolationUpdates: number;
    partialProductionBatchViolationUpdates: number;
};

const finiteInteger = (value: number): boolean =>
    Number.isSafeInteger(value) && value >= 0;

export class UnifiedIntentM2TelemetryCollector {
    private updates = 0;
    private proposedCalls = 0;
    private forwardedOrderCalls = 0;
    private sameUnitConflicts = 0;
    private duplicateSuppressions = 0;
    private deferredUnitIds = 0;
    private updatesWithDeferral = 0;
    private maxRollingTotalCalls = 0;
    private maxRollingOrderCalls = 0;
    private maxForwardedChunkSize = 0;
    private gameplayReserveOverflowUpdates = 0;
    private totalCeilingOverflowUpdates = 0;
    private oneForwardViolationUpdates = 0;
    private forwardedValidationViolationUpdates = 0;
    private partialProductionBatchViolationUpdates = 0;
    private finished = false;

    observe(value: UnifiedIntentUpdateTelemetry): void {
        if (this.finished || value.tick !== this.updates + 1) {
            throw new Error("Unified intent M2 telemetry clock drifted");
        }
        if (
            value.totalCeiling !== 150 ||
            value.gameplayReserve !== UNIFIED_INTENT_GAMEPLAY_RESERVE ||
            ![
                value.proposedCalls,
                value.forwardedOrderCalls,
                value.sameUnitConflicts,
                value.duplicateSuppressions,
                value.deferredUnitIds,
                value.rollingTotalCalls,
                value.rollingOrderCalls,
                value.maxForwardedChunkSize,
                value.multipleForwardedUnitViolations,
                value.forwardedValidationViolations,
                value.partialProductionBatchViolations,
            ].every(finiteInteger)
        ) throw new Error("Unified intent M2 telemetry schema drifted");
        this.updates += 1;
        this.proposedCalls += value.proposedCalls;
        this.forwardedOrderCalls += value.forwardedOrderCalls;
        this.sameUnitConflicts += value.sameUnitConflicts;
        this.duplicateSuppressions += value.duplicateSuppressions;
        this.deferredUnitIds += value.deferredUnitIds;
        if (value.deferredUnitIds > 0) this.updatesWithDeferral += 1;
        this.maxRollingTotalCalls = Math.max(this.maxRollingTotalCalls, value.rollingTotalCalls);
        this.maxRollingOrderCalls = Math.max(this.maxRollingOrderCalls, value.rollingOrderCalls);
        this.maxForwardedChunkSize = Math.max(
            this.maxForwardedChunkSize,
            value.maxForwardedChunkSize,
        );
        if (value.gameplayReserveOverflow) this.gameplayReserveOverflowUpdates += 1;
        if (value.totalCeilingOverflow) this.totalCeilingOverflowUpdates += 1;
        if (value.multipleForwardedUnitViolations > 0) this.oneForwardViolationUpdates += 1;
        if (value.forwardedValidationViolations > 0) {
            this.forwardedValidationViolationUpdates += 1;
        }
        if (value.partialProductionBatchViolations > 0) {
            this.partialProductionBatchViolationUpdates += 1;
        }
    }

    finish(expectedUpdates: number): UnifiedIntentM2TelemetrySummary {
        if (
            this.finished || !Number.isSafeInteger(expectedUpdates) || expectedUpdates < 1 ||
            this.updates !== expectedUpdates
        ) throw new Error("Unified intent M2 telemetry is incomplete");
        this.finished = true;
        const value: UnifiedIntentM2TelemetrySummary = {
            complete: true,
            updates: this.updates,
            totalCeiling: 150,
            gameplayReserve: 35,
            orderCap: 115,
            proposedCalls: this.proposedCalls,
            forwardedOrderCalls: this.forwardedOrderCalls,
            sameUnitConflicts: this.sameUnitConflicts,
            duplicateSuppressions: this.duplicateSuppressions,
            deferredUnitIds: this.deferredUnitIds,
            updatesWithDeferral: this.updatesWithDeferral,
            maxRollingTotalCalls: this.maxRollingTotalCalls,
            maxRollingOrderCalls: this.maxRollingOrderCalls,
            maxForwardedChunkSize: this.maxForwardedChunkSize,
            gameplayReserveOverflowUpdates: this.gameplayReserveOverflowUpdates,
            totalCeilingOverflowUpdates: this.totalCeilingOverflowUpdates,
            oneForwardViolationUpdates: this.oneForwardViolationUpdates,
            forwardedValidationViolationUpdates: this.forwardedValidationViolationUpdates,
            partialProductionBatchViolationUpdates: this.partialProductionBatchViolationUpdates,
        };
        validateUnifiedIntentM2Telemetry(value);
        return value;
    }
}

export const validateUnifiedIntentM2Telemetry = (
    value: UnifiedIntentM2TelemetrySummary,
): void => {
    if (
        !value.complete || value.updates < 1 || value.totalCeiling !== 150 ||
        value.gameplayReserve !== 35 || value.orderCap !== 115 ||
        value.gameplayReserveOverflowUpdates !== 0 ||
        value.totalCeilingOverflowUpdates !== 0 ||
        value.oneForwardViolationUpdates !== 0 ||
        value.forwardedValidationViolationUpdates !== 0 ||
        value.partialProductionBatchViolationUpdates !== 0 ||
        value.maxRollingTotalCalls > 150 || value.maxRollingOrderCalls > 115 ||
        value.maxForwardedChunkSize > 128 ||
        Object.values(value).some((entry) =>
            typeof entry === "number" && !finiteInteger(entry))
    ) throw new Error("Unified intent M2 telemetry invariant failed");
};
