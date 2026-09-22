import crypto from "node:crypto";
import {
    UnifiedIntentUpdateTelemetry,
    UNIFIED_INTENT_SEPARATED_LANE_MODE,
    UNIFIED_INTENT_UNBOUNDED_D1_MODE,
} from "@supalosa/chronodivide-bot/dist/bot/logic/intent/unifiedIntentArbiter.js";

export type D1BudgetMode = typeof UNIFIED_INTENT_SEPARATED_LANE_MODE | typeof UNIFIED_INTENT_UNBOUNDED_D1_MODE;
const counterFields = [
    "gameplayNonorderCalls", "productionBatches", "proposedCalls", "proposedUnitIds",
    "forwardedOrderCalls", "forwardedUnitIds", "sameUnitConflicts", "duplicateSuppressions",
    "invalidUnitIds", "invalidTargets", "invalidTiles", "supersededPending", "expiredPending",
    "revokedPending", "deferredUnitIds", "pendingUnitIds", "debugProposals", "debugCoalesced",
    "debugForwarded", "debugDropped",
] as const;
type Counter = typeof counterFields[number];
const nonnegative = (value: unknown): value is number => Number.isSafeInteger(value) && Number(value) >= 0;

/**
 * D1-only observer; does not alter the legacy telemetry envelope or action admission.
 * deferredUnitIds is incremented ONLY on failed order-budget admission in the core.
 * It counts unit-ID occurrences, not unique units or denied API calls. All other
 * filtering/pending causes are separately retained, never relabelled "budget denied".
 */
export class UnifiedIntentD1TelemetryCollector {
    private readonly digest = crypto.createHash("sha256");
    private readonly totals = Object.fromEntries(counterFields.map(key => [key, 0])) as Record<Counter, number>;
    private updates = 0;
    private referenceExceededUpdates = 0;
    private budgetDenialUpdates = 0;
    private maxRollingCommandCalls = 0;
    private maxPendingUnitIds = 0;
    private maxForwardedChunkSize = 0;
    private finished = false;

    constructor(private readonly budgetMode: D1BudgetMode) {
        if (![UNIFIED_INTENT_SEPARATED_LANE_MODE, UNIFIED_INTENT_UNBOUNDED_D1_MODE].includes(budgetMode)) {
            throw new Error("D1 telemetry budget mode is not frozen");
        }
    }

    observe(value: UnifiedIntentUpdateTelemetry): void {
        const capped = this.budgetMode === UNIFIED_INTENT_SEPARATED_LANE_MODE;
        if (this.finished || value.tick !== this.updates + 1 ||
            value.budgetMode !== this.budgetMode || value.commandCeiling !== (capped ? 115 : null) ||
            !/^[0-9a-f]{64}$/.test(value.forwardedActionSha256) ||
            !counterFields.every(key => nonnegative(value[key])) ||
            ![value.rollingCommandCalls, value.rollingOrderCalls, value.rollingDebugCalls,
                value.rollingGameplayNonorderCalls, value.rollingTotalCalls, value.maxForwardedChunkSize,
                value.multipleForwardedUnitViolations, value.forwardedValidationViolations,
                value.partialProductionBatchViolations].every(nonnegative) ||
            value.rollingCommandCalls !== value.rollingOrderCalls + value.rollingDebugCalls ||
            value.rollingTotalCalls !== value.rollingCommandCalls + value.rollingGameplayNonorderCalls ||
            value.commandCeilingOverflow !== false || value.gameplayReserveOverflow !== false ||
            value.totalCeilingOverflow !== false || value.multipleForwardedUnitViolations !== 0 ||
            value.forwardedValidationViolations !== 0 || value.partialProductionBatchViolations !== 0 ||
            value.maxForwardedChunkSize > 128 || (capped && value.rollingCommandCalls > 115) ||
            (!capped && (value.deferredUnitIds !== 0 || value.debugDropped !== 0 || value.pendingUnitIds !== 0))) {
            throw new Error("D1 telemetry schema, clock, or mode-specific invariant failed");
        }
        this.digest.update(JSON.stringify(value) + "\n");
        this.updates++;
        for (const key of counterFields) {
            this.totals[key] += value[key];
            if (!nonnegative(this.totals[key])) throw new Error("D1 telemetry counter overflow");
        }
        if (value.rollingCommandCalls > 115) this.referenceExceededUpdates++;
        if (value.deferredUnitIds > 0 || value.debugDropped > 0) this.budgetDenialUpdates++;
        this.maxRollingCommandCalls = Math.max(this.maxRollingCommandCalls, value.rollingCommandCalls);
        this.maxPendingUnitIds = Math.max(this.maxPendingUnitIds, value.pendingUnitIds);
        this.maxForwardedChunkSize = Math.max(this.maxForwardedChunkSize, value.maxForwardedChunkSize);
    }

    finish(expectedUpdates: number) {
        if (this.finished || !Number.isSafeInteger(expectedUpdates) || expectedUpdates < 1 ||
            expectedUpdates !== this.updates) throw new Error("D1 telemetry is incomplete");
        this.finished = true;
        return {
            kind: "unified-intent-d1-telemetry-v1" as const,
            complete: true as const,
            updates: this.updates,
            budgetMode: this.budgetMode,
            commandCeiling: this.budgetMode === UNIFIED_INTENT_SEPARATED_LANE_MODE ? 115 : null,
            commandCeilingEnforced: this.budgetMode === UNIFIED_INTENT_SEPARATED_LANE_MODE,
            rollingUpdates: 900,
            referenceCommandCeiling: 115,
            referenceExceededUpdates: this.referenceExceededUpdates,
            budgetDenialUpdates: this.budgetDenialUpdates,
            budgetDeniedUnitIdOccurrences: this.totals.deferredUnitIds,
            budgetDeniedDebugCalls: this.totals.debugDropped,
            maxRollingCommandCalls: this.maxRollingCommandCalls,
            maxPendingUnitIds: this.maxPendingUnitIds,
            maxForwardedChunkSize: this.maxForwardedChunkSize,
            counters: { ...this.totals },
            telemetrySha256: this.digest.digest("hex"),
        };
    }
}
export type UnifiedIntentD1TelemetrySummary = ReturnType<UnifiedIntentD1TelemetryCollector["finish"]>;
