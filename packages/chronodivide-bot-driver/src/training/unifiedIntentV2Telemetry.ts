import crypto from "node:crypto";
import {
    UnifiedIntentUpdateTelemetry,
    UNIFIED_INTENT_ROLLING_UPDATES,
    UNIFIED_INTENT_SEPARATED_COMMAND_CEILING,
    UNIFIED_INTENT_SEPARATED_LANE_MODE,
} from "@supalosa/chronodivide-bot/dist/bot/logic/intent/unifiedIntentArbiter.js";

export type UnifiedIntentV2TelemetrySummary = {
    complete: true;
    updates: number;
    budgetMode: typeof UNIFIED_INTENT_SEPARATED_LANE_MODE;
    commandCeiling: typeof UNIFIED_INTENT_SEPARATED_COMMAND_CEILING;
    rollingUpdates: typeof UNIFIED_INTENT_ROLLING_UPDATES;
    telemetrySha256: string;
    essentialCalls: number;
    productionBatches: number;
    proposedCalls: number;
    forwardedOrderCalls: number;
    sameUnitConflicts: number;
    duplicateSuppressions: number;
    deferredUnitIds: number;
    updatesWithDeferral: number;
    maxRollingCommandCalls: number;
    maxForwardedChunkSize: number;
    commandCeilingOverflowUpdates: number;
    oneForwardViolationUpdates: number;
    forwardedValidationViolationUpdates: number;
    partialProductionBatchViolationUpdates: number;
};

const nonnegative = (value: number): boolean => Number.isSafeInteger(value) && value >= 0;

export class UnifiedIntentV2TelemetryCollector {
    private readonly digest = crypto.createHash("sha256");
    private updates = 0;
    private essentialCalls = 0;
    private productionBatches = 0;
    private proposedCalls = 0;
    private forwardedOrderCalls = 0;
    private sameUnitConflicts = 0;
    private duplicateSuppressions = 0;
    private deferredUnitIds = 0;
    private updatesWithDeferral = 0;
    private maxRollingCommandCalls = 0;
    private maxForwardedChunkSize = 0;
    private commandCeilingOverflowUpdates = 0;
    private oneForwardViolationUpdates = 0;
    private forwardedValidationViolationUpdates = 0;
    private partialProductionBatchViolationUpdates = 0;
    private finished = false;

    observe(value: UnifiedIntentUpdateTelemetry): void {
        if (this.finished || value.tick !== this.updates + 1) {
            throw new Error("Unified intent V2 telemetry clock drifted");
        }
        if (
            value.budgetMode !== UNIFIED_INTENT_SEPARATED_LANE_MODE ||
            value.commandCeiling !== UNIFIED_INTENT_SEPARATED_COMMAND_CEILING ||
            !/^[0-9a-f]{64}$/.test(value.forwardedActionSha256) ||
            ![
                value.gameplayNonorderCalls, value.productionBatches, value.proposedCalls,
                value.forwardedOrderCalls, value.sameUnitConflicts,
                value.duplicateSuppressions, value.deferredUnitIds,
                value.rollingCommandCalls, value.maxForwardedChunkSize,
                value.multipleForwardedUnitViolations,
                value.forwardedValidationViolations,
                value.partialProductionBatchViolations,
            ].every(nonnegative)
        ) throw new Error("Unified intent V2 telemetry schema drifted");
        this.updates += 1;
        this.digest.update(JSON.stringify(value) + "\n");
        this.essentialCalls += value.gameplayNonorderCalls;
        this.productionBatches += value.productionBatches;
        this.proposedCalls += value.proposedCalls;
        this.forwardedOrderCalls += value.forwardedOrderCalls;
        this.sameUnitConflicts += value.sameUnitConflicts;
        this.duplicateSuppressions += value.duplicateSuppressions;
        this.deferredUnitIds += value.deferredUnitIds;
        if (value.deferredUnitIds > 0) this.updatesWithDeferral += 1;
        this.maxRollingCommandCalls = Math.max(
            this.maxRollingCommandCalls,
            value.rollingCommandCalls,
        );
        this.maxForwardedChunkSize = Math.max(
            this.maxForwardedChunkSize,
            value.maxForwardedChunkSize,
        );
        if (value.commandCeilingOverflow) this.commandCeilingOverflowUpdates += 1;
        if (value.multipleForwardedUnitViolations > 0) this.oneForwardViolationUpdates += 1;
        if (value.forwardedValidationViolations > 0) {
            this.forwardedValidationViolationUpdates += 1;
        }
        if (value.partialProductionBatchViolations > 0) {
            this.partialProductionBatchViolationUpdates += 1;
        }
    }

    finish(expectedUpdates: number): UnifiedIntentV2TelemetrySummary {
        if (this.finished || !Number.isSafeInteger(expectedUpdates) || expectedUpdates < 1 ||
            this.updates !== expectedUpdates) {
            throw new Error("Unified intent V2 telemetry is incomplete");
        }
        this.finished = true;
        const value: UnifiedIntentV2TelemetrySummary = {
            complete: true,
            updates: this.updates,
            budgetMode: UNIFIED_INTENT_SEPARATED_LANE_MODE,
            commandCeiling: UNIFIED_INTENT_SEPARATED_COMMAND_CEILING,
            rollingUpdates: UNIFIED_INTENT_ROLLING_UPDATES,
            telemetrySha256: this.digest.digest("hex"),
            essentialCalls: this.essentialCalls,
            productionBatches: this.productionBatches,
            proposedCalls: this.proposedCalls,
            forwardedOrderCalls: this.forwardedOrderCalls,
            sameUnitConflicts: this.sameUnitConflicts,
            duplicateSuppressions: this.duplicateSuppressions,
            deferredUnitIds: this.deferredUnitIds,
            updatesWithDeferral: this.updatesWithDeferral,
            maxRollingCommandCalls: this.maxRollingCommandCalls,
            maxForwardedChunkSize: this.maxForwardedChunkSize,
            commandCeilingOverflowUpdates: this.commandCeilingOverflowUpdates,
            oneForwardViolationUpdates: this.oneForwardViolationUpdates,
            forwardedValidationViolationUpdates: this.forwardedValidationViolationUpdates,
            partialProductionBatchViolationUpdates: this.partialProductionBatchViolationUpdates,
        };
        validateUnifiedIntentV2Telemetry(value);
        return value;
    }
}

export const validateUnifiedIntentV2Telemetry = (
    value: UnifiedIntentV2TelemetrySummary,
): void => {
    if (
        !value.complete || value.updates < 1 ||
        value.budgetMode !== UNIFIED_INTENT_SEPARATED_LANE_MODE ||
        value.commandCeiling !== 115 || value.rollingUpdates !== 900 ||
        !/^[0-9a-f]{64}$/.test(value.telemetrySha256) ||
        value.commandCeilingOverflowUpdates !== 0 ||
        value.oneForwardViolationUpdates !== 0 ||
        value.forwardedValidationViolationUpdates !== 0 ||
        value.partialProductionBatchViolationUpdates !== 0 ||
        value.maxRollingCommandCalls > 115 || value.maxForwardedChunkSize > 128 ||
        Object.values(value).some((entry) =>
            typeof entry === "number" && !nonnegative(entry))
    ) throw new Error("Unified intent V2 telemetry invariant failed");
};
