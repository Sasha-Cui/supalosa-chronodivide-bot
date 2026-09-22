import { SHA, exact, hash, MAX_PAIR_BYTES, technicalOnly } from "./unified-intent-d1-io.mjs";
import { validateUnifiedIntentV2Telemetry } from
    "../../packages/chronodivide-bot-driver/dist/training/unifiedIntentV2Telemetry.js";
import { verifyEmbeddedFreshDualLedger } from
    "../../packages/chronodivide-bot-driver/dist/training/embeddedFreshDualLedger.js";
const nonnegative = (n) => Number.isSafeInteger(n) && n >= 0;
const diagnosticCounters = [
    "gameplayNonorderCalls", "productionBatches", "proposedCalls", "proposedUnitIds",
    "forwardedOrderCalls", "forwardedUnitIds", "sameUnitConflicts", "duplicateSuppressions",
    "invalidUnitIds", "invalidTargets", "invalidTiles", "supersededPending", "expiredPending",
    "revokedPending", "deferredUnitIds", "pendingUnitIds", "debugProposals", "debugCoalesced",
    "debugForwarded", "debugDropped",
];
export const validateD1BudgetDiagnostics = (d, arm, updates) => {
    const fields = ["kind", "complete", "updates", "budgetMode", "commandCeiling", "commandCeilingEnforced",
        "rollingUpdates", "referenceCommandCeiling", "referenceExceededUpdates", "budgetDenialUpdates",
        "budgetDeniedUnitIdOccurrences", "budgetDeniedDebugCalls", "maxRollingCommandCalls", "maxPendingUnitIds",
        "maxForwardedChunkSize", "counters", "telemetrySha256"];
    exact(Object.keys(d ?? {}).sort(), fields.sort(), "D1 diagnostic fields");
    exact(Object.keys(d.counters ?? {}).sort(), diagnosticCounters.slice().sort(), "D1 diagnostic counters");
    const capped = arm.id === "separated_lanes_v2";
    if (!arm.enabled || !["separated_lanes_v2", "separated_lanes_unbounded_d1"].includes(arm.id) ||
        arm.budgetMode !== arm.id || arm.commandCeiling !== (capped ? 115 : null) ||
        d.kind !== "unified-intent-d1-telemetry-v1" || d.complete !== true ||
        d.updates !== updates || !nonnegative(updates) || updates < 1 ||
        d.budgetMode !== arm.id || d.commandCeiling !== (capped ? 115 : null) ||
        d.commandCeilingEnforced !== capped || d.rollingUpdates !== 900 || d.referenceCommandCeiling !== 115 ||
        !SHA.test(d.telemetrySha256) || fields.filter(k => !["kind", "complete", "budgetMode", "commandCeiling",
            "commandCeilingEnforced", "counters", "telemetrySha256"].includes(k)).some(k => !nonnegative(d[k])) ||
        diagnosticCounters.some(k => !nonnegative(d.counters[k])) ||
        d.maxForwardedChunkSize > 128 || d.referenceExceededUpdates > updates || d.budgetDenialUpdates > updates ||
        (d.referenceExceededUpdates > 0) !== (d.maxRollingCommandCalls > 115) ||
        d.budgetDeniedUnitIdOccurrences !== d.counters.deferredUnitIds ||
        d.budgetDeniedDebugCalls !== d.counters.debugDropped ||
        d.counters.debugForwarded + d.counters.debugDropped !== d.counters.debugProposals - d.counters.debugCoalesced ||
        (capped && d.maxRollingCommandCalls > 115) ||
        (!capped && (d.budgetDeniedUnitIdOccurrences !== 0 || d.budgetDeniedDebugCalls !== 0 ||
            d.budgetDenialUpdates !== 0 || d.counters.pendingUnitIds !== 0 || d.maxPendingUnitIds !== 0))) {
        throw new Error("D1 diagnostics invariant invalid");
    }
};
const essentialMethods = [
    "placeBuilding", "sellObject", "sellBuilding", "toggleRepairWrench", "toggleAlliance",
    "pauseProduction", "resumeProduction", "queueForProduction", "unqueueFromProduction",
    "activateSuperWeapon", "quitGame",
];
const methods = [...essentialMethods, "orderUnits", "sayAll", "setGlobalDebugText", "setUnitDebugText"];
const statuses = {
    candidate_win: "candidate", baseline_win: "baseline", simultaneous_draw: "draw",
    engine_nonliteral_termination_draw: "draw", tick_cap_draw: "draw",
};
export const validateD1EpisodeTechnical = (value, cell, arm, canary = false) => {
    const commonKeys = ["kind", "snapshotMode", "complete", "technicalPass", "arm", "updates",
        "requestedEngineSeed", "observedStarts", "quitSuppression", "publicCall", "publicState", "telemetry", "budgetDiagnostics"];
    exact(Object.keys(value ?? {}).sort(),
        [...commonKeys, ...(canary ? ["mode"] : ["stopReason", "dualState", "actionAudit", "ledger"])].sort(),
        "D1 prohibited or unrecognized episode field");
    if (!value || value.complete !== true || value.technicalPass !== true || value.arm !== arm.id ||
        value.requestedEngineSeed !== cell.requestedEngineSeed || !nonnegative(value.updates) ||
        value.updates < 1 || value.updates > cell.maxUpdates ||
        !SHA.test(value.publicCall?.sha256) || !SHA.test(value.publicState?.sha256)) {
        throw new Error("D1 episode identity or technical summary invalid");
    }
    exact(value.observedStarts, { candidate: cell.candidateStart, opponent: cell.opponentStart }, "D1 observed starts");
    const quit = value.quitSuppression;
    if (quit?.mode !== "symmetric_no_forwarding" || quit.forwarded?.candidate !== 0 ||
        quit.forwarded?.baseline !== 0 || !nonnegative(quit.attempts?.candidate) ||
        !nonnegative(quit.attempts?.baseline)) throw new Error("D1 resignation audit invalid");
    for (const [key, count] of Object.entries(value.publicCall.bySideAndMethod)) {
        const [side, method, extra] = key.split(".");
        if (!["candidate", "baseline"].includes(side) || !methods.includes(method) ||
            extra !== undefined || !nonnegative(count)) throw new Error("D1 public-call schema invalid");
    }
    if (arm.id === "separated_lanes_v2") {
        const fields = ["complete", "updates", "budgetMode", "commandCeiling", "rollingUpdates", "telemetrySha256",
            "essentialCalls", "productionBatches", "proposedCalls", "forwardedOrderCalls", "sameUnitConflicts",
            "duplicateSuppressions", "deferredUnitIds", "updatesWithDeferral", "maxRollingCommandCalls",
            "maxForwardedChunkSize", "commandCeilingOverflowUpdates", "oneForwardViolationUpdates",
            "forwardedValidationViolationUpdates", "partialProductionBatchViolationUpdates"];
        exact(Object.keys(value.telemetry ?? {}).sort(), fields.sort(), "D1 telemetry field inventory");
        if (value.telemetry.complete !== true || fields.filter((k) =>
            !["complete", "budgetMode", "telemetrySha256"].includes(k)).some((k) =>
            !nonnegative(value.telemetry[k]))) throw new Error("D1 telemetry numeric schema invalid");
        validateUnifiedIntentV2Telemetry(value.telemetry);
        if (value.telemetry.updates !== value.updates || value.telemetry.essentialCalls !==
            essentialMethods.reduce((n, m) => n + (value.publicCall.bySideAndMethod["candidate." + m] ?? 0), 0)) {
            throw new Error("D1 telemetry forwarding reconciliation failed");
        }
    } else if (arm.id === "separated_lanes_unbounded_d1") {
        validateD1BudgetDiagnostics(value.telemetry, arm, value.updates);
        exact(value.telemetry, value.budgetDiagnostics, "D1 unbounded telemetry/diagnostic equality");
    } else if (arm.id !== "disabled" || arm.enabled !== false || value.telemetry !== null ||
        value.budgetDiagnostics !== null) throw new Error("D1 disabled telemetry invalid");
    if (arm.enabled) {
        validateD1BudgetDiagnostics(value.budgetDiagnostics, arm, value.updates);
        const d = value.budgetDiagnostics;
        if (d.counters.gameplayNonorderCalls !== essentialMethods.reduce((n, m) =>
            n + (value.publicCall.bySideAndMethod["candidate." + m] ?? 0), 0)) {
            throw new Error("D1 diagnostic essential forwarding reconciliation failed");
        }
        if (arm.id === "separated_lanes_v2") {
            const t = value.telemetry;
            if (t.telemetrySha256 !== d.telemetrySha256 || t.essentialCalls !== d.counters.gameplayNonorderCalls ||
                t.maxRollingCommandCalls !== d.maxRollingCommandCalls || t.maxForwardedChunkSize !== d.maxForwardedChunkSize ||
                ["productionBatches", "proposedCalls", "forwardedOrderCalls", "sameUnitConflicts",
                    "duplicateSuppressions", "deferredUnitIds"].some(k => t[k] !== d.counters[k])) {
                throw new Error("D1 legacy capped telemetry changed");
            }
        }
    }
    if (canary) {
        if (value.kind !== "unified-intent-d1-canary-v1" ||
            !["canary_v5_reference", "canary_dual"].includes(value.mode) ||
            value.updates !== 3600 || value.publicState.snapshots !== 3601 ||
            value.snapshotMode !== "every_update") throw new Error("D1 canary horizon/schema invalid");
        technicalOnly(value);
    } else if (value.kind !== "unified-intent-d1-competitive-v1" ||
        value.snapshotMode !== "initial_every_6000_final" ||
        value.publicState.snapshots !== 1 + Math.floor(value.updates / 6000) + Number(value.updates % 6000 !== 0)) {
        throw new Error("D1 competitive snapshot schema invalid");
    }
};
export const validateD1Competitive = async (value, cell, arm) => {
    validateD1EpisodeTechnical(value, cell, arm);
    if (!value.dualState?.complete || value.dualState.failed ||
        !["dual_complete", "tick_cap"].includes(value.stopReason)) throw new Error("D1 endpoint completion invalid");
    const replay = await verifyEmbeddedFreshDualLedger(value.ledger);
    if (!replay.complete || replay.aborted || !replay.final || replay.updates !== value.updates) {
        throw new Error("D1 ledger replay incomplete");
    }
    exact(replay.final, { stopReason: value.stopReason, updates: value.updates,
        dualState: value.dualState, actionAudit: value.actionAudit,
        quitSuppression: value.quitSuppression }, "D1 replay result");
    exact({ sha256: value.actionAudit.sha256, bySideAndMethod: value.actionAudit.bySideAndMethod },
        value.publicCall, "D1 public action summary");
    const flat = {};
    for (const [key, version] of [["v5", 5], ["v6", 6]]) {
        const metric = value.dualState[key], e = metric.firstResult;
        if (metric.technicalFailure !== null || !e || e.endpointVersion !== version ||
            !SHA.test(e.endpointSha256) || !Object.hasOwn(statuses, e.status) || statuses[e.status] !== e.winner ||
            !Number.isSafeInteger(e.tick) || e.tick < 1 || e.tick > value.updates ||
            (e.status === "tick_cap_draw" && e.tick !== 24000)) throw new Error("D1 metric is not an admissible first result");
        flat[key] = { status: e.status, tick: e.tick, winner: e.winner };
    }
    return flat;
};
export const projectD1Canary = (results, cell, arms) => {
    if (arms.length !== 3 || results.length !== 6) throw new Error("D1 canary requires six episodes");
    const comparisons = arms.map((arm, index) => {
        const [reference, dual] = results.slice(index * 2, index * 2 + 2);
        validateD1EpisodeTechnical(reference, cell, arm, true);
        validateD1EpisodeTechnical(dual, cell, arm, true);
        if (reference.mode !== "canary_v5_reference" || dual.mode !== "canary_dual") throw new Error("D1 canary mode order invalid");
        exact(reference.publicCall, dual.publicCall, "D1 canary action noninterference");
        exact(reference.publicState, dual.publicState, "D1 canary state noninterference");
        exact(reference.telemetry, dual.telemetry, "D1 canary arbiter noninterference");
        exact(reference.budgetDiagnostics, dual.budgetDiagnostics, "D1 diagnostic noninterference");
        exact(reference.quitSuppression, dual.quitSuppression, "D1 canary resignation noninterference");
        return { arm: arm.id, updates: 3600, snapshots: 3601,
            actionEquivalent: true, stateEquivalent: true, telemetryEquivalent: true,
            resignationEquivalent: true, technicalPass: true,
            publicCallSha256: dual.publicCall.sha256, publicStateSha256: dual.publicState.sha256,
            telemetrySha256: dual.telemetry?.telemetrySha256 ?? null,
            referenceSha256: hash(JSON.stringify(reference)), dualSha256: hash(JSON.stringify(dual)) };
    });
    technicalOnly(comparisons);
    return comparisons;
};
export const projectD1Smoke = async (results, cell, arms) => {
    if (arms.length !== 3 || results.length !== 3 || Buffer.byteLength(JSON.stringify(results)) > MAX_PAIR_BYTES) {
        throw new Error("D1 smoke pair size/population invalid");
    }
    const projected = [];
    for (const [index, arm] of arms.entries()) {
        const value = results[index];
        await validateD1Competitive(value, cell, arm);
        projected.push({ arm: arm.id, technicalPass: true, replayPass: true,
            publicCallSha256: value.publicCall.sha256, publicStateSha256: value.publicState.sha256,
            ledgerGzipSha256: value.ledger.gzipSha256, ledgerPlainSha256: value.ledger.plainSha256,
            ledgerGzipBytes: value.ledger.gzipBytes, ledgerPlainBytes: value.ledger.plainBytes,
            telemetrySha256: value.telemetry?.telemetrySha256 ?? null,
            resignationSuppressed: true, payloadDiscarded: true });
    }
    technicalOnly(projected);
    return projected;
};
