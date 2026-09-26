import { createHash } from "node:crypto";
import { StrategicS1Plan, S1_POLICY } from "./strategicS1Plan.js";
import { exactFields } from "./strategicS1Validation.js";
import { natural, finite } from "./strategicS1Observation.js";
import { S1_LEDGER_LIMITS, replayS1Ledger } from "./strategicS1Ledger.js";
import { verifyEmbeddedFreshDualLedger, OD1_LEDGER_LIMITS } from "./embeddedFreshDualLedger.js";
import { FRESH_DUAL_ACTION_METHODS } from "./freshDualStudyInstrumentation.js";
import { assertS1ArtifactBytes, S1_MAX_ARTIFACT_BYTES } from "./strategicS1Episode.js";
import { crossCheckS1Ledgers } from "./strategicS1CrossLedger.js";

export type S1Assignment =
    | StrategicS1Plan["cases"][number]
    | StrategicS1Plan["canaries"][number]
    | StrategicS1Plan["smoke"];
export const s1Hash = (x: unknown): string => createHash("sha256").update(JSON.stringify(x)).digest("hex");
export const s1Require = (condition: unknown, message: string): void => {
    if (!condition) throw new Error("S1 result: " + message);
};
export const s1Equal = (a: unknown, b: unknown, message: string): void =>
    s1Require(JSON.stringify(a) === JSON.stringify(b), message);
const sha = (x: unknown) => s1Require(typeof x === "string" && /^[0-9a-f]{64}$/.test(x), "sha256");
const common = (r: any, c: S1Assignment) => {
    s1Require(r.complete === true && r.technicalPass === true, "incomplete/failed episode");
    s1Require(r.caseIndex === c.caseIndex && r.requestedEngineSeed === c.requestedEngineSeed, "assignment identity");
    exactFields(r.policy, "id arbiterEnabled");
    s1Equal(r.policy, S1_POLICY, "unchanged policy");
};
const counts = (x: any, valid: (k: string) => boolean) => {
    s1Require(x && typeof x === "object" && !Array.isArray(x), "count dictionary");
    let total = 0;
    for (const [key, value] of Object.entries(x)) {
        natural(value);
        s1Require(Number(value) > 0 && valid(key), "count key/value");
        total += Number(value);
    }
    return natural(total);
};
const methodKey = (key: string) =>
    /^(candidate|baseline)\./.test(key) && FRESH_DUAL_ACTION_METHODS.includes(key.slice(key.indexOf(".") + 1) as any);
const publicCalls = (x: any) => {
    exactFields(x, "sha256 bySideAndMethod");
    sha(x.sha256);
    return counts(x.bySideAndMethod, methodKey);
};
const quit = (x: any, calls?: any) => {
    exactFields(x, "mode attempts forwarded");
    s1Require(x.mode === "symmetric_no_forwarding", "quit mode");
    for (const k of ["attempts", "forwarded"]) {
        exactFields(x[k], "candidate baseline");
        Object.values(x[k]).forEach(natural);
    }
    s1Require(x.forwarded.candidate === 0 && x.forwarded.baseline === 0, "resignation forwarded");
    if (calls)
        for (const side of ["candidate", "baseline"])
            s1Require(x.attempts[side] === (calls[side + ".quitGame"] ?? 0), "quit call binding");
};
const trajectory = (x: any, snapshots: number) => {
    exactFields(x, "sha256 snapshots");
    sha(x.sha256);
    s1Require(x.snapshots === snapshots, "trajectory count");
};
const storage = (x: any, limits: { gzipBytes: number; plainBytes: number }, minRecords: number) => {
    exactFields(x, "records gzipBytes plainBytes");
    Object.values(x).forEach(natural);
    s1Require(
        x.records >= minRecords &&
            x.gzipBytes > 0 &&
            x.gzipBytes <= limits.gzipBytes &&
            x.plainBytes > 0 &&
            x.plainBytes <= limits.plainBytes,
        "storage limits",
    );
};

/** Strict outcome-free episode projection. Discarded payload replay remains source-bound. */
export function validateS1Canary(
    r: any,
    c: StrategicS1Plan["canaries"][number],
    mode: "canary_endpoint_only" | "canary_strategic",
) {
    exactFields(
        r,
        "kind mode complete technicalPass caseIndex requestedEngineSeed policy updates observedStarts quitSuppression publicCall publicState dualTrace strategic",
    );
    s1Require(r.kind === "strategic-s1-canary-v1" && r.mode === mode && c.role === "canary", "canary kind/mode");
    common(r, c);
    s1Require(r.updates === 3600 && c.maxUpdates === 3600, "canary horizon");
    exactFields(r.observedStarts, "candidate opponent");
    s1Equal(r.observedStarts, { candidate: c.candidateStart, opponent: c.opponentStart }, "starts");
    publicCalls(r.publicCall);
    quit(r.quitSuppression, r.publicCall.bySideAndMethod);
    trajectory(r.publicState, 3601);
    trajectory(r.dualTrace, 3601);
    if (mode === "canary_endpoint_only") s1Require(r.strategic === null, "unobserved canary payload");
    else {
        exactFields(
            r.strategic,
            "samples schemaVerified replayPass windowConservation payloadDiscarded records gzipBytes plainBytes",
        );
        s1Require(r.strategic.samples === 13 && r.strategic.records === 15, "canary strategic count");
        for (const k of ["schemaVerified", "replayPass", "windowConservation", "payloadDiscarded"])
            s1Require(r.strategic[k] === true, k);
        storage(
            { records: r.strategic.records, gzipBytes: r.strategic.gzipBytes, plainBytes: r.strategic.plainBytes },
            S1_LEDGER_LIMITS,
            15,
        );
    }
    assertS1ArtifactBytes(r);
}
export function validateS1CanaryPair(values: any[], c: StrategicS1Plan["canaries"][number]) {
    s1Require(Array.isArray(values) && values.length === 2, "two ordered canary episodes");
    validateS1Canary(values[0], c, "canary_endpoint_only");
    validateS1Canary(values[1], c, "canary_strategic");
    for (const key of ["updates", "observedStarts", "quitSuppression", "publicCall", "publicState", "dualTrace"])
        s1Equal(values[0][key], values[1][key], "canary noninterference " + key);
    return {
        technicalPass: true as const,
        episodes: 2,
        comparisons: 1,
        discardedPayloadReplayIndependent: false as const,
    };
}
export function validateS1Smoke(r: any, c: StrategicS1Plan["smoke"]) {
    exactFields(
        r,
        "kind complete technicalPass caseIndex requestedEngineSeed policy endpointReplayPass strategicReplayPass schemaVerified sampleGridVerified windowConservation payloadDiscarded resignationSuppressed combinedBytes endpointStorage strategicStorage",
    );
    s1Require(r.kind === "strategic-s1-smoke-technical-v1" && c.role === "smoke", "smoke kind");
    common(r, c);
    for (const k of [
        "endpointReplayPass",
        "strategicReplayPass",
        "schemaVerified",
        "sampleGridVerified",
        "windowConservation",
        "payloadDiscarded",
        "resignationSuppressed",
    ])
        s1Require(r[k] === true, k);
    natural(r.combinedBytes);
    s1Require(r.combinedBytes > 0 && r.combinedBytes <= S1_MAX_ARTIFACT_BYTES, "smoke outer bytes");
    storage(r.endpointStorage, OD1_LEDGER_LIMITS, 3);
    storage(r.strategicStorage, S1_LEDGER_LIMITS, 4);
    s1Require(r.strategicStorage.records <= 83 && r.endpointStorage.records <= 24002, "smoke record count");
    const minimumBase64Bytes =
        4 * Math.ceil(r.endpointStorage.gzipBytes / 3) + 4 * Math.ceil(r.strategicStorage.gzipBytes / 3);
    s1Require(r.combinedBytes >= minimumBase64Bytes, "smoke base64 necessary bound");
    assertS1ArtifactBytes(r);
}
const actionAudit = (x: any, calls: any, updates: number) => {
    exactFields(x, "sha256 callCount bySideAndMethod zeroHealthBuildingTargetRequests");
    sha(x.sha256);
    s1Equal({ sha256: x.sha256, bySideAndMethod: x.bySideAndMethod }, calls, "action binding");
    s1Require(x.callCount === publicCalls(calls), "public call count");
    const z = x.zeroHealthBuildingTargetRequests;
    exactFields(z, "count first last bySideAndRulesName");
    natural(z.count);
    const total = counts(z.bySideAndRulesName, (k) => /^(candidate|baseline)\..+$/.test(k));
    s1Require(total === z.count, "zero-health count sum");
    for (const side of ["candidate", "baseline"])
        s1Require(
            Object.entries(z.bySideAndRulesName)
                .filter(([k]) => k.startsWith(side + "."))
                .reduce((n, [, v]) => n + Number(v), 0) <= (x.bySideAndMethod[side + ".orderUnits"] ?? 0),
            "zero-health order bound",
        );
    if (z.count === 0) s1Require(z.first === null && z.last === null, "empty zero-health diagnostics");
    else {
        for (const row of [z.first, z.last]) {
            exactFields(row, "tick side method targetId targetOwner targetRulesName targetType targetHitPoints");
            natural(row.tick);
            natural(row.targetId);
            finite(row.targetHitPoints);
            s1Require(
                row.tick <= updates &&
                    ["candidate", "baseline"].includes(row.side) &&
                    row.method === "orderUnits" &&
                    row.targetType === 2 &&
                    row.targetHitPoints <= 0,
                "zero-health diagnostic identity",
            );
            s1Require(row.targetOwner === null || typeof row.targetOwner === "string", "target owner");
            s1Require(
                typeof row.targetRulesName === "string" &&
                    row.targetRulesName.length > 0 &&
                    z.bySideAndRulesName[row.side + "." + row.targetRulesName] > 0,
                "target rules name",
            );
        }
        s1Require(z.first.tick <= z.last.tick, "diagnostic ordering");
        if (z.count === 1) s1Equal(z.first, z.last, "singleton diagnostic");
    }
};

/** Checks exact episode schema and replays both retained payloads. Not independent auditing. */
export async function validateS1Diagnostic(r: any, c: StrategicS1Plan["cases"][number]) {
    exactFields(
        r,
        "kind complete technicalPass policy caseIndex requestedEngineSeed updates observedStarts quitSuppression publicCall publicState stopReason dualState actionAudit ledger strategicLedger strategicAnalysisSha256",
    );
    s1Require(r.kind === "strategic-s1-diagnostic-v1" && c.role === "diagnostic", "diagnostic kind/role");
    common(r, c);
    natural(r.updates);
    s1Require(r.updates >= 1 && r.updates <= 24000 && c.maxUpdates === 24000, "horizon");
    exactFields(r.observedStarts, "candidate opponent");
    s1Equal(r.observedStarts, { candidate: c.candidateStart, opponent: c.opponentStart }, "starts");
    publicCalls(r.publicCall);
    quit(r.quitSuppression, r.publicCall.bySideAndMethod);
    actionAudit(r.actionAudit, r.publicCall, r.updates);
    trajectory(r.publicState, 1 + Math.floor(r.updates / 6000) + (r.updates % 6000 !== 0 ? 1 : 0));
    s1Require(["dual_complete", "tick_cap"].includes(r.stopReason), "stop reason");
    exactFields(r.dualState, "v5 v6 complete failed");
    s1Require(r.dualState.complete === true && r.dualState.failed === false, "dual completion");
    for (const v of ["v5", "v6"]) {
        exactFields(r.dualState[v], "firstResult technicalFailure");
        s1Require(
            r.dualState[v].firstResult !== null && r.dualState[v].technicalFailure === null,
            "endpoint completion",
        );
    }
    exactFields(r.ledger, "encoding records plainBytes gzipBytes plainSha256 gzipSha256 data");
    assertS1ArtifactBytes(r);
    const endpoint = await verifyEmbeddedFreshDualLedger(r.ledger),
        strategic = replayS1Ledger(r.strategicLedger);
    s1Require(endpoint.complete && !endpoint.aborted, "endpoint replay completeness");
    s1Equal(
        endpoint.final,
        {
            stopReason: r.stopReason,
            updates: r.updates,
            dualState: r.dualState,
            actionAudit: r.actionAudit,
            quitSuppression: r.quitSuppression,
        },
        "endpoint final binding",
    );
    s1Equal(
        strategic.identity,
        { caseIndex: c.caseIndex, requestedEngineSeed: c.requestedEngineSeed, maxUpdates: 24000 },
        "strategic identity",
    );
    s1Require(strategic.final.updates === r.updates, "strategic final clock");
    s1Equal(strategic.final.publicCalls, r.publicCall, "strategic public-call binding");
    sha(r.strategicAnalysisSha256);
    s1Require(s1Hash(strategic.analysis) === r.strategicAnalysisSha256, "strategic analysis digest");
    for (const sample of strategic.samples)
        for (const side of ["candidate", "baseline"] as const)
            s1Require(sample.players[side].country === c.country, "effective sample country");
    const crossLedger = await crossCheckS1Ledgers(r.ledger, strategic.samples);
    return {
        assignment: c,
        episode: r,
        samples: strategic.samples,
        analysis: strategic.analysis,
        crossLedger,
        provenance: {
            episodePayloadSha256: s1Hash(r),
            endpointGzipSha256: r.ledger.gzipSha256,
            strategicGzipSha256: r.strategicLedger.gzipSha256,
            sourceBoundReplay: true as const,
            independentAudit: false as const,
        },
    };
}
