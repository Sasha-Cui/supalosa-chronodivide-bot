import crypto from "node:crypto";
import {
    UnifiedIntentScope,
    UnifiedIntentUpdateTelemetry,
    UNIFIED_INTENT_GAMEPLAY_RESERVE,
    UNIFIED_INTENT_SCOPES,
} from "@supalosa/chronodivide-bot/dist/bot/logic/intent/unifiedIntentArbiter.js";

const SUM_FIELDS = [
    "proposedCalls",
    "proposedUnitIds",
    "sameUnitConflicts",
    "invalidUnitIds",
    "invalidTargets",
    "invalidTiles",
    "duplicateSuppressions",
    "supersededPending",
    "expiredPending",
    "revokedPending",
    "deferredUnitIds",
    "productionBatches",
    "debugProposals",
    "debugCoalesced",
    "debugForwarded",
    "debugDropped",
    "forwardedGroups",
    "forwardedChunks",
    "forwardedOrderCalls",
    "forwardedUnitIds",
    "multipleForwardedUnitViolations",
    "forwardedValidationViolations",
    "partialProductionBatchViolations",
] as const;

const MAX_FIELDS = [
    "pendingUnitIds",
    "maxForwardedChunkSize",
    "rollingTotalCalls",
    "rollingOrderCalls",
    "rollingGameplayNonorderCalls",
    "rollingDebugCalls",
] as const;

type SumField = typeof SUM_FIELDS[number];
type MaxField = typeof MAX_FIELDS[number];

export type UnifiedIntentGate3TelemetrySummary = {
    complete: true;
    updates: number;
    totalCeiling: 75 | 150 | 300;
    gameplayReserve: 35;
    orderCap: number;
    telemetrySha256: string;
    sums: Record<SumField, number>;
    maxima: Record<MaxField, number>;
    proposalsByScope: Record<UnifiedIntentScope, number>;
    winningUnitsByScope: Record<UnifiedIntentScope, number>;
    forwardedUnitsByScope: Record<UnifiedIntentScope, number>;
    gameplayReserveOverflowUpdates: number;
    totalCeilingOverflowUpdates: number;
    oneUnitMultipleForwardUpdates: number;
    forwardedValidationViolationUpdates: number;
    partialProductionBatchViolationUpdates: number;
    updatesWithDeferral: number;
};

const emptyScopes = (): Record<UnifiedIntentScope, number> => ({
    terminal_objective: 0,
    emergency_defense: 0,
    home_guard: 0,
    objective_closeout: 0,
    tactical_assault: 0,
    route_sweep: 0,
    harassment: 0,
    baseline_core: 0,
});

const numericRecord = <T extends readonly string[]>(
    keys: T,
): Record<T[number], number> => Object.fromEntries(
    keys.map((key) => [key, 0]),
) as Record<T[number], number>;

const validateScopes = (
    value: Record<UnifiedIntentScope, number>,
): void => {
    if (
        JSON.stringify(Object.keys(value).sort()) !==
            JSON.stringify([...UNIFIED_INTENT_SCOPES].sort()) ||
        Object.values(value).some((count) =>
            !Number.isSafeInteger(count) || count < 0)
    ) throw new Error("Unified intent Gate 3 scope telemetry drifted");
};

export class UnifiedIntentGate3TelemetryCollector {
    private readonly digest = crypto.createHash("sha256");
    private readonly sums = numericRecord(SUM_FIELDS);
    private readonly maxima = numericRecord(MAX_FIELDS);
    private readonly proposalsByScope = emptyScopes();
    private readonly winningUnitsByScope = emptyScopes();
    private readonly forwardedUnitsByScope = emptyScopes();
    private updates = 0;
    private gameplayReserveOverflowUpdates = 0;
    private totalCeilingOverflowUpdates = 0;
    private oneUnitMultipleForwardUpdates = 0;
    private forwardedValidationViolationUpdates = 0;
    private partialProductionBatchViolationUpdates = 0;
    private updatesWithDeferral = 0;
    private finished = false;

    constructor(
        private readonly totalCeiling: 75 | 150 | 300,
        private readonly expectedUpdates = 3_600,
    ) {
        if (
            ![75, 150, 300].includes(totalCeiling) ||
            !Number.isSafeInteger(expectedUpdates) ||
            expectedUpdates < 1
        ) throw new Error("Unified intent Gate 3 telemetry configuration drifted");
    }

    observe(value: UnifiedIntentUpdateTelemetry): void {
        if (this.finished || value.tick !== this.updates + 1) {
            throw new Error("Unified intent Gate 3 telemetry clock drifted");
        }
        if (
            value.totalCeiling !== this.totalCeiling ||
            value.gameplayReserve !== UNIFIED_INTENT_GAMEPLAY_RESERVE ||
            !/^[0-9a-f]{64}$/.test(value.forwardedActionSha256)
        ) throw new Error("Unified intent Gate 3 telemetry identity drifted");
        validateScopes(value.proposalsByScope);
        validateScopes(value.winningUnitsByScope);
        validateScopes(value.forwardedUnitsByScope);
        for (const field of [...SUM_FIELDS, ...MAX_FIELDS]) {
            const number = value[field];
            if (!Number.isFinite(number) || number < 0 || !Number.isSafeInteger(number)) {
                throw new Error("Unified intent Gate 3 numeric telemetry drifted: " + field);
            }
        }
        this.updates += 1;
        this.digest.update(JSON.stringify(value) + "\n");
        for (const field of SUM_FIELDS) this.sums[field] += value[field];
        for (const field of MAX_FIELDS) {
            this.maxima[field] = Math.max(this.maxima[field], value[field]);
        }
        for (const scope of UNIFIED_INTENT_SCOPES) {
            this.proposalsByScope[scope] += value.proposalsByScope[scope];
            this.winningUnitsByScope[scope] += value.winningUnitsByScope[scope];
            this.forwardedUnitsByScope[scope] += value.forwardedUnitsByScope[scope];
        }
        if (value.gameplayReserveOverflow) this.gameplayReserveOverflowUpdates += 1;
        if (value.totalCeilingOverflow) this.totalCeilingOverflowUpdates += 1;
        if (value.multipleForwardedUnitViolations > 0) this.oneUnitMultipleForwardUpdates += 1;
        if (value.forwardedValidationViolations > 0) {
            this.forwardedValidationViolationUpdates += 1;
        }
        if (value.partialProductionBatchViolations > 0) {
            this.partialProductionBatchViolationUpdates += 1;
        }
        if (value.deferredUnitIds > 0) this.updatesWithDeferral += 1;
    }

    finish(): UnifiedIntentGate3TelemetrySummary {
        if (this.finished || this.updates !== this.expectedUpdates) {
            throw new Error("Unified intent Gate 3 telemetry is incomplete");
        }
        this.finished = true;
        return {
            complete: true,
            updates: this.updates,
            totalCeiling: this.totalCeiling,
            gameplayReserve: UNIFIED_INTENT_GAMEPLAY_RESERVE,
            orderCap: this.totalCeiling - UNIFIED_INTENT_GAMEPLAY_RESERVE,
            telemetrySha256: this.digest.digest("hex"),
            sums: structuredClone(this.sums),
            maxima: structuredClone(this.maxima),
            proposalsByScope: structuredClone(this.proposalsByScope),
            winningUnitsByScope: structuredClone(this.winningUnitsByScope),
            forwardedUnitsByScope: structuredClone(this.forwardedUnitsByScope),
            gameplayReserveOverflowUpdates: this.gameplayReserveOverflowUpdates,
            totalCeilingOverflowUpdates: this.totalCeilingOverflowUpdates,
            oneUnitMultipleForwardUpdates: this.oneUnitMultipleForwardUpdates,
            forwardedValidationViolationUpdates: this.forwardedValidationViolationUpdates,
            partialProductionBatchViolationUpdates: this.partialProductionBatchViolationUpdates,
            updatesWithDeferral: this.updatesWithDeferral,
        };
    }
}
