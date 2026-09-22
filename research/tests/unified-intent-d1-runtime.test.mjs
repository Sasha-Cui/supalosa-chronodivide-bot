import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { parseSchedulerRows, technicalOnly, recordLaunch, parseLaunchMarker, publish, readPublished,
    buildD1RegistrationAudit, buildD1PreparationEnvelope } from "../runtime/unified-intent-d1-io.mjs";
import { validateD1BudgetDiagnostics, validateD1EpisodeTechnical, projectD1Canary, projectD1Smoke } from "../runtime/unified-intent-d1-validation.mjs";
import { D1_ARMS } from "../../packages/chronodivide-bot-driver/dist/training/unifiedIntentD1Plan.js";
import { UnifiedIntentD1TelemetryCollector } from "../../packages/chronodivide-bot-driver/dist/training/unifiedIntentD1Telemetry.js";
import { UnifiedIntentV2TelemetryCollector } from "../../packages/chronodivide-bot-driver/dist/training/unifiedIntentV2Telemetry.js";
import { UnifiedIntentArbiter } from "../../packages/chronodivide-bot/dist/bot/logic/intent/unifiedIntentArbiter.js";
const cell = { requestedEngineSeed: 3350111000, candidateStart: "1,2", opponentStart: "3,4", maxUpdates: 3600 };
const canary = (arm, mode) => {
    let telemetry = null, budgetDiagnostics = null;
    if (arm.enabled) {
        const core = new UnifiedIntentArbiter({ budgetMode: arm.budgetMode, commandCeiling: arm.commandCeiling });
        core.beginUpdate(1); const update = core.flush({}, "synthetic", () => {});
        const d = new UnifiedIntentD1TelemetryCollector(arm.budgetMode); d.observe(update);
        budgetDiagnostics = { ...d.finish(1), updates: 3600 };
        if (arm.id === "separated_lanes_v2") {
            const legacy = new UnifiedIntentV2TelemetryCollector(); legacy.observe(update);
            telemetry = { ...legacy.finish(1), updates: 3600 };
        } else telemetry = structuredClone(budgetDiagnostics);
    }
    return { kind: "unified-intent-d1-canary-v1", complete: true, technicalPass: true, mode,
        snapshotMode: "every_update", arm: arm.id, updates: 3600, requestedEngineSeed: cell.requestedEngineSeed,
        observedStarts: { candidate: "1,2", opponent: "3,4" },
        quitSuppression: { mode: "symmetric_no_forwarding", attempts: { candidate: 0, baseline: 0 },
            forwarded: { candidate: 0, baseline: 0 } },
        publicCall: { sha256: "a".repeat(64), bySideAndMethod: {} },
        publicState: { sha256: "b".repeat(64), snapshots: 3601 }, telemetry, budgetDiagnostics };
};
const results = () => D1_ARMS.flatMap(a => ["canary_v5_reference", "canary_dual"].map(m => canary(a, m)));
test("D1 validates all three strict telemetry modes and retains the capped legacy summary", () => {
    for (const arm of D1_ARMS) validateD1EpisodeTechnical(canary(arm, "canary_dual"), cell, arm, true);
    const value = canary(D1_ARMS[1], "canary_dual");
    assert.equal("budgetDeniedUnitIdOccurrences" in value.telemetry, false);
    assert.equal("budgetDeniedUnitIdOccurrences" in value.budgetDiagnostics, true);
    value.telemetry.essentialCalls++;
    assert.throws(() => validateD1EpisodeTechnical(value, cell, D1_ARMS[1], true));
});
test("D1 explicit-null diagnostics reject nonfinite ceilings, false enforcement and hidden counters", () => {
    const original = canary(D1_ARMS[2], "canary_dual").budgetDiagnostics;
    for (const mutation of [
        d => d.commandCeiling = Infinity, d => d.commandCeiling = NaN, d => delete d.commandCeiling,
        d => d.commandCeilingEnforced = true, d => d.counters.winner = 1,
        d => d.budgetDeniedDebugCalls = 1, d => d.maxPendingUnitIds = 1,
        d => d.maxRollingCommandCalls = 116,
    ]) { const d = structuredClone(original); mutation(d); assert.throws(() => validateD1BudgetDiagnostics(d, D1_ARMS[2], 3600)); }
    const valid = structuredClone(original); valid.maxRollingCommandCalls = 116; valid.referenceExceededUpdates = 1;
    validateD1BudgetDiagnostics(valid, D1_ARMS[2], 3600);
    assert.throws(() => validateD1BudgetDiagnostics(valid, D1_ARMS[1], 3600));
});
test("D1 complete six-episode canary compares instrumentation only within each arm", () => {
    const value = projectD1Canary(results(), cell, D1_ARMS);
    assert.equal(value.length, 3); technicalOnly(value);
    assert(value.every(row => row.actionEquivalent && row.stateEquivalent && row.telemetryEquivalent));
    const changed = results(); changed[5].publicCall.sha256 = "f".repeat(64);
    assert.throws(() => projectD1Canary(changed, cell, D1_ARMS), /noninterference/);
    assert.throws(() => projectD1Canary(changed.slice(1), cell, D1_ARMS), /six episodes/);
});
test("D1 canary rejects outcomes, swapped observers, missing diagnostics and unexpected engine horizons", () => {
    for (const mutate of [
        r => r[0].winner = "candidate", r => r[5].budgetDiagnostics.counters.terminalTick = 1,
        r => r[0].updates = 3599, r => delete r[2].budgetDiagnostics,
        r => [r[0], r[1]] = [r[1], r[0]],
    ]) { const value = results(); mutate(value); assert.throws(() => projectD1Canary(value, cell, D1_ARMS)); }
});
test("D1 smoke rejects incomplete three-arm and oversized projections before ledger parsing", async () => {
    await assert.rejects(projectD1Smoke([], cell, D1_ARMS), /size\/population/);
    await assert.rejects(projectD1Smoke([{ data: "x".repeat(32 * 1024 * 1024) }, {}, {}], cell, D1_ARMS), /size\/population/);
});
test("D1 scheduler requires every successful no-restart pi_jss233/day CPU task", () => {
    const row = i => "123_" + i + "|" + (200 + i) + "|COMPLETED|0:0|pi_jss233|day|1|0|30";
    const raw = row(1) + "\n" + row(0);
    assert.deepEqual(parseSchedulerRows(raw, "123", 2).map(r => r.jobId), ["200", "201"]);
    for (const bad of [row(0), row(0) + "\n" + row(0), raw.replace("COMPLETED", "RUNNING"),
        raw.replace("pi_jss233", "pi_btk22"), raw.replace("|1|0|", "|1|1|"), raw.replace("0:0", "1:0")]) {
        assert.throws(() => parseSchedulerRows(bad, "123", 2));
    }
});
test("D1 namespace and immutable publication distinguish attempts from complete records", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "d1-publication-"));
    try {
        recordLaunch(dir, { caseIndex: 0, role: "synthetic" });
        const text = fs.readFileSync(path.join(dir, "COMPLETE"), "utf8");
        assert(text.startsWith("LAUNCH_D1_V1 "));
        assert.throws(() => parseLaunchMarker(text, "COMPLETE_D1_V1 missing 1"));
        assert.throws(() => parseLaunchMarker(text.replace("D1_V1", "OD1_V1")));
        const data = { complete: true, launches: [{ caseIndex: 0, role: "synthetic" }] };
        const published = publish(dir, data);
        assert.deepEqual(readPublished(dir, published.sha256).value, data);
        assert.throws(() => publish(dir, data));
        assert.throws(() => recordLaunch(dir, { caseIndex: 1 }));
        assert.throws(() => readPublished(dir, "0".repeat(64)));
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
const registration = () => ({
    certificate: { sha256: "a".repeat(64) }, registrationRoot: "/project", registrationAfterUtc: "2026-09-09T06:35:54Z",
    records: [{ path: "/old/manifest", collisions: 0 }], supportingMetadata: [],
    proposedSeeds: [...Array.from({ length: 200 }, (_, i) => 3350110000 + i),
        3350111000, 3350111001, 3350111002, 3350111003, 3350111100],
    abandonedSelector: { zeroUpdateInitializations: 905, advancingEpisodes: 0 },
    od1A1: { zeroUpdateInitializations: 905, advancingEpisodes: 1818 },
});
test("D1 prospective registration requires exact fresh identities and both consumed OD1 histories", () => {
    const input = registration(), audit = buildD1RegistrationAudit(input);
    assert.equal(audit.newSeeds.count, 205); technicalOnly(audit);
    for (const mutate of [r => r.proposedSeeds[0]++, r => r.records[0].collisions++,
        r => r.od1A1.advancingEpisodes = 0, r => r.abandonedSelector.zeroUpdateInitializations = 0]) {
        const bad = registration(); mutate(bad); assert.throws(() => buildD1RegistrationAudit(bad));
    }
});
test("D1 complete metadata envelope rejects prohibited fields before initialization", () => {
    const seedAudit = buildD1RegistrationAudit(registration());
    const value = buildD1PreparationEnvelope({ seedAudit, plan: { counts: { zeroUpdateDefinitions: 205 } } });
    technicalOnly(value); assert.deepEqual(value.observations, []);
    for (const key of ["inventoryRoot", "inventoryAfterUtc", "winner", "endpoint", "score"]) {
        let initialized = false;
        assert.throws(() => { buildD1PreparationEnvelope({ seedAudit, nested: [{ [key]: 1 }] }); initialized = true; });
        assert.equal(initialized, false);
    }
});

import { validateD1RegistrationScan, registeredD1Seeds } from "../runtime/unified-intent-d1-io.mjs";
test("D1 rejects unknown registrations within any study directory and requires all known paths", () => {
    validateD1RegistrationScan(["/old/manifest", "/a1/manifest"], ["/old/manifest", "/a1/manifest"], ["/old/manifest", "/a1/manifest"]);
    assert.throws(() => validateD1RegistrationScan(["/d1/unreviewed-plan.json"], [], []));
    assert.throws(() => validateD1RegistrationScan(["/od1/unreviewed-plan.json"], [], []));
    assert.throws(() => validateD1RegistrationScan([], ["/known"], ["/known"]));
});
test("D1 collision checks include canaries, smoke, and task registrations, not only competitive cases", () => {
    const metadata = { complete: true, passed: true, plan: { cases: [{ requestedEngineSeed: 3350108000 }],
        canaries: [{ requestedEngineSeed: 3350109000 }], smoke: { requestedEngineSeed: 3350109100 } } };
    assert.deepEqual(registeredD1Seeds(metadata, [3350110000]), [3350108000, 3350109000, 3350109100]);
    for (const seed of [3350108000, 3350109000, 3350109100]) assert.throws(() => registeredD1Seeds(metadata, [seed]));
    metadata.plan.tasks = [{ requestedEngineSeed: 3350110000 }];
    assert.throws(() => registeredD1Seeds(metadata, [3350110001]));
});
