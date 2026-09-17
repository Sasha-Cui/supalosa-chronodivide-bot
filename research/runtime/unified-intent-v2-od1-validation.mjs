import { SHA, exact, hash, MAX_PAIR_BYTES, technicalOnly } from "./unified-intent-v2-od1-io.mjs";
import { validateUnifiedIntentV2Telemetry } from
    "../../packages/chronodivide-bot-driver/dist/training/unifiedIntentV2Telemetry.js";
import { verifyEmbeddedFreshDualLedger } from
    "../../packages/chronodivide-bot-driver/dist/training/embeddedFreshDualLedger.js";
const nonnegative = (n) => Number.isSafeInteger(n) && n >= 0;
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
export const validateOD1EpisodeTechnical = (value, cell, arm, canary = false) => {
    const commonKeys = ["kind", "snapshotMode", "complete", "technicalPass", "arm", "updates",
        "requestedEngineSeed", "observedStarts", "quitSuppression", "publicCall", "publicState", "telemetry"];
    exact(Object.keys(value ?? {}).sort(),
        [...commonKeys, ...(canary ? ["mode"] : ["stopReason", "dualState", "actionAudit", "ledger"])].sort(),
        "OD1 prohibited or unrecognized episode field");
    if (!value || value.complete !== true || value.technicalPass !== true || value.arm !== arm.id ||
        value.requestedEngineSeed !== cell.requestedEngineSeed || !nonnegative(value.updates) ||
        value.updates < 1 || value.updates > cell.maxUpdates ||
        !SHA.test(value.publicCall?.sha256) || !SHA.test(value.publicState?.sha256)) {
        throw new Error("OD1 episode identity or technical summary invalid");
    }
    exact(value.observedStarts, { candidate: cell.candidateStart, opponent: cell.opponentStart }, "OD1 observed starts");
    const quit = value.quitSuppression;
    if (quit?.mode !== "symmetric_no_forwarding" || quit.forwarded?.candidate !== 0 ||
        quit.forwarded?.baseline !== 0 || !nonnegative(quit.attempts?.candidate) ||
        !nonnegative(quit.attempts?.baseline)) throw new Error("OD1 resignation audit invalid");
    for (const [key, count] of Object.entries(value.publicCall.bySideAndMethod)) {
        const [side, method, extra] = key.split(".");
        if (!["candidate", "baseline"].includes(side) || !methods.includes(method) ||
            extra !== undefined || !nonnegative(count)) throw new Error("OD1 public-call schema invalid");
    }
    if (arm.enabled) {
        const fields = ["complete", "updates", "budgetMode", "commandCeiling", "rollingUpdates", "telemetrySha256",
            "essentialCalls", "productionBatches", "proposedCalls", "forwardedOrderCalls", "sameUnitConflicts",
            "duplicateSuppressions", "deferredUnitIds", "updatesWithDeferral", "maxRollingCommandCalls",
            "maxForwardedChunkSize", "commandCeilingOverflowUpdates", "oneForwardViolationUpdates",
            "forwardedValidationViolationUpdates", "partialProductionBatchViolationUpdates"];
        exact(Object.keys(value.telemetry ?? {}).sort(), fields.sort(), "OD1 telemetry field inventory");
        if (value.telemetry.complete !== true || fields.filter((k) =>
            !["complete", "budgetMode", "telemetrySha256"].includes(k)).some((k) =>
            !nonnegative(value.telemetry[k]))) throw new Error("OD1 telemetry numeric schema invalid");
        validateUnifiedIntentV2Telemetry(value.telemetry);
        if (value.telemetry.updates !== value.updates || value.telemetry.essentialCalls !==
            essentialMethods.reduce((n, m) => n + (value.publicCall.bySideAndMethod["candidate." + m] ?? 0), 0)) {
            throw new Error("OD1 telemetry forwarding reconciliation failed");
        }
    } else if (value.telemetry !== null) throw new Error("OD1 disabled telemetry invalid");
    if (canary) {
        if (value.kind !== "unified-intent-v2-od1-canary-v1" ||
            !["canary_v5_reference", "canary_dual"].includes(value.mode) ||
            value.updates !== 3600 || value.publicState.snapshots !== 3601 ||
            value.snapshotMode !== "every_update") throw new Error("OD1 canary horizon/schema invalid");
        technicalOnly(value);
    } else if (value.kind !== "unified-intent-v2-od1-competitive-v1" ||
        value.snapshotMode !== "initial_every_6000_final" ||
        value.publicState.snapshots !== 1 + Math.floor(value.updates / 6000) + Number(value.updates % 6000 !== 0)) {
        throw new Error("OD1 competitive snapshot schema invalid");
    }
};
export const validateOD1Competitive = async (value, cell, arm) => {
    validateOD1EpisodeTechnical(value, cell, arm);
    if (!value.dualState?.complete || value.dualState.failed ||
        !["dual_complete", "tick_cap"].includes(value.stopReason)) throw new Error("OD1 endpoint completion invalid");
    const replay = await verifyEmbeddedFreshDualLedger(value.ledger);
    if (!replay.complete || replay.aborted || !replay.final || replay.updates !== value.updates) {
        throw new Error("OD1 ledger replay incomplete");
    }
    exact(replay.final, { stopReason: value.stopReason, updates: value.updates,
        dualState: value.dualState, actionAudit: value.actionAudit,
        quitSuppression: value.quitSuppression }, "OD1 replay result");
    exact({ sha256: value.actionAudit.sha256, bySideAndMethod: value.actionAudit.bySideAndMethod },
        value.publicCall, "OD1 public action summary");
    const flat = {};
    for (const [key, version] of [["v5", 5], ["v6", 6]]) {
        const metric = value.dualState[key], e = metric.firstResult;
        if (metric.technicalFailure !== null || !e || e.endpointVersion !== version ||
            !SHA.test(e.endpointSha256) || !Object.hasOwn(statuses, e.status) || statuses[e.status] !== e.winner ||
            !Number.isSafeInteger(e.tick) || e.tick < 1 || e.tick > value.updates ||
            (e.status === "tick_cap_draw" && e.tick !== 24000)) throw new Error("OD1 metric is not an admissible first result");
        flat[key] = { status: e.status, tick: e.tick, winner: e.winner };
    }
    return flat;
};
export const projectOD1Canary = (results, cell, arms) => {
    if (results.length !== 4) throw new Error("OD1 canary requires four episodes");
    const comparisons = arms.map((arm, index) => {
        const [reference, dual] = results.slice(index * 2, index * 2 + 2);
        validateOD1EpisodeTechnical(reference, cell, arm, true);
        validateOD1EpisodeTechnical(dual, cell, arm, true);
        if (reference.mode !== "canary_v5_reference" || dual.mode !== "canary_dual") throw new Error("OD1 canary mode order invalid");
        exact(reference.publicCall, dual.publicCall, "OD1 canary action noninterference");
        exact(reference.publicState, dual.publicState, "OD1 canary state noninterference");
        exact(reference.telemetry, dual.telemetry, "OD1 canary arbiter noninterference");
        exact(reference.quitSuppression, dual.quitSuppression, "OD1 canary resignation noninterference");
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
export const projectOD1Smoke = async (results, cell, arms) => {
    if (results.length !== 2 || Buffer.byteLength(JSON.stringify(results)) > MAX_PAIR_BYTES) {
        throw new Error("OD1 smoke pair size/population invalid");
    }
    const projected = [];
    for (const [index, arm] of arms.entries()) {
        const value = results[index];
        await validateOD1Competitive(value, cell, arm);
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
