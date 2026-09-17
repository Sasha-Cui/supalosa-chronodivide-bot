import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import {
    OD1RandomIndices, OD1_BOOTSTRAP_DOMAIN, od1ClusterBootstrap, od1WilsonLower,
    evaluateOD1Gates, analyzeUnifiedIntentV2OD1,
} from "../runtime/unified-intent-v2-od1-analysis.mjs";
import { parseSchedulerRows, technicalOnly } from "../runtime/unified-intent-v2-od1-io.mjs";
import { buildUnifiedIntentV2OD1Plan, OD1_MAP_IDS } from
    "../../packages/chronodivide-bot-driver/dist/training/unifiedIntentV2OD1Plan.js";
const hash = (b) => crypto.createHash("sha256").update(b).digest("hex");
const reference = (name) => {
    let words = [], counter = 0n;
    return (n) => {
        const limit = 2 ** 32 - ((2 ** 32) % n);
        for (;;) {
            if (!words.length) {
                const b = Buffer.alloc(8); b.writeBigUInt64BE(counter++);
                const block = crypto.createHash("sha256").update(OD1_BOOTSTRAP_DOMAIN + "\0" + name + "\0")
                    .update(b).digest();
                words = Array.from({ length: 8 }, (_, i) => block.readUInt32BE(i * 4));
            }
            const v = words.shift();
            if (v < limit) return v % n;
        }
    };
};
test("OD1 named streams match independent SHA counter/rejection reference", () => {
    const rng = new OD1RandomIndices("test/a"), other = reference("test/a");
    assert.deepEqual(Array.from({ length: 100 }, () => rng.next(25)),
        Array.from({ length: 100 }, () => other(25)));
    const large = new OD1RandomIndices("test/rejection"), ref = reference("test/rejection");
    assert.deepEqual(Array.from({ length: 100 }, () => large.next(2147483649)),
        Array.from({ length: 100 }, () => ref(2147483649)));
    assert.throws(() => rng.next(0)); assert.throws(() => new OD1RandomIndices(""));
    assert.notDeepEqual(Array.from({ length: 16 }, () => new OD1RandomIndices("x").next(25)),
        Array.from({ length: 16 }, () => new OD1RandomIndices("y").next(25)));
});
test("OD1 weighted cluster bootstrap matches brute reference and reports ordered digests", () => {
    const groups = [{ id: "a", weight: 2, scoreSum: 2, winSum: 1 }, { id: "b", weight: 8, scoreSum: -4, winSum: -2 }];
    const value = od1ClusterBootstrap(groups.slice().reverse(), "small", 100);
    const rng = reference("small"), expected = [], digest = crypto.createHash("sha256");
    for (let r = 0; r < 100; r++) {
        const sample = [groups[rng(2)], groups[rng(2)]];
        const mean = sample.reduce((s, g) => s + g.scoreSum, 0) / sample.reduce((s, g) => s + g.weight, 0);
        expected.push(mean); const b = Buffer.alloc(8); b.writeDoubleBE(mean); digest.update(b);
    }
    assert.equal(value.score.mean, -0.2);
    assert.equal(value.score.lower90, expected.sort((a, b) => a - b)[10]);
    assert.equal(value.score.orderedReplicatesSha256, digest.digest("hex"));
    assert.deepEqual(value, od1ClusterBootstrap(groups, "small", 100));
    assert.throws(() => od1ClusterBootstrap([], "bad"));
});
test("OD1 Wilson bound uses literal wins, with draws retained in denominator", () => {
    assert.ok(Math.abs(od1WilsonLower(50, 100) - 0.4364419) < 0.00001);
    assert.ok(od1WilsonLower(100, 100) < 1);
    assert.ok(Math.abs(od1WilsonLower(0, 100)) < 1e-12);
    assert.throws(() => od1WilsonLower(2, 1));
});
const gateInput = () => {
    const arm = { W: 60, D: 20, L: 20, pooledWilsonWinLower90: 0.53 };
    const population = { arms: { disabled: { W: 50 }, separated_lanes_v2: { ...arm } } };
    return {
        overall: { transitions: { "W->L": 2, "L->W": 1, "D->W": 1 } },
        advanced: structuredClone(population), supalosa: structuredClone(population),
        bounds: { overall: { score: { lower90: 0.01 }, literalWin: { lower90: 0.01 } },
            advanced: { score: { lower90: 0.01 } }, advancedCountryDirection: { score: { lower90: 0.01 } },
            supalosa: { score: { lower90: -0.02 } } },
        strata: [], factions: [{ id: "Allied", pairedScore: 0 }, { id: "Soviet", pairedScore: 0 }],
        slots: [{ id: "0", pairedScore: 0 }, { id: "1", pairedScore: 0 }],
    };
};
test("OD1 gates retain strict positive bounds and exact noninferiority/map safety thresholds", () => {
    const a = gateInput();
    assert.equal(evaluateOD1Gates(a).broadPositiveDevelopmentSignal, true);
    a.bounds.overall.score.lower90 = 0;
    assert.equal(evaluateOD1Gates(a).broadPositiveDevelopmentSignal, false);
    const b = gateInput(); b.bounds.supalosa.score.lower90 = -0.0200001;
    assert.equal(evaluateOD1Gates(b).checks.supalosaNoninferiority, false);
    b.strata = Array.from({ length: 3 }, () => ({ opponent: "pinned_supalosa", pairedScore: -0.10 }));
    assert.equal(evaluateOD1Gates(b).checks.supalosaMapSafety, true);
    b.strata.forEach((s) => s.pairedScore = -0.100001);
    assert.equal(evaluateOD1Gates(b).checks.supalosaMapSafety, false);
});
test("OD1 relative improvement does not substitute for absolute Advanced superiority", () => {
    const a = gateInput(); a.advanced.arms.separated_lanes_v2.pooledWilsonWinLower90 = 0.5;
    const r = evaluateOD1Gates(a);
    assert.equal(r.broadPositiveDevelopmentSignal, true);
    assert.equal(r.absoluteAdvancedDevelopmentEligible, false);
    assert.equal(r.confirmation, false); assert.equal(r.deploymentAuthorized, false);
    a.bounds.advancedCountryDirection.score.lower90 = 0;
    assert.equal(evaluateOD1Gates(a).broadPositiveDevelopmentSignal, false);
    const b = gateInput(); b.overall.transitions["W->L"] = 3;
    assert.equal(evaluateOD1Gates(b).checks.catastrophicTransitionSafety, false);
    b.factions[0].pairedScore = -0.000001; b.slots[1].pairedScore = -0.000001;
    assert.equal(evaluateOD1Gates(b).checks.alliedNonnegative, false);
    assert.equal(evaluateOD1Gates(b).checks.slot1Nonnegative, false);
});
test("OD1 scheduler reconciliation requires every exact successful CPU-only task", () => {
    const row = (i) => "123_" + i + "|" + (200 + i) + "|COMPLETED|0:0|pi_jss233|day|1|0|30";
    const raw = row(1) + "\n" + row(0);
    assert.deepEqual(parseSchedulerRows(raw, "123", 2).map((r) => r.label), ["123_0", "123_1"]);
    assert.throws(() => parseSchedulerRows(row(0), "123", 2));
    assert.throws(() => parseSchedulerRows(raw.replace("pi_jss233", "pi_btk22"), "123", 2));
    assert.throws(() => parseSchedulerRows(raw.replace("|1|0|", "|1|1|"), "123", 2));
    assert.throws(() => parseSchedulerRows(raw.replace("COMPLETED", "RUNNING"), "123", 2));
    assert.throws(() => parseSchedulerRows(row(0) + "\n" + row(0), "123", 2));
});
test("OD1 technical projection rejects nested competitive fields", () => {
    technicalOnly({ technicalOnly: true, observations: [{ sha256: "a".repeat(64), updates: 3600 }] });
    assert.throws(() => technicalOnly({ nested: [{ winner: "candidate" }] }));
    assert.throws(() => technicalOnly({ terminalUpdate: 1200 }));
});
test("complete synthetic OD1 ties reject advancement without subset selection", () => {
    const maps = OD1_MAP_IDS.map((id, i) => ({ id, label: id, fileName: id + ".map",
        absolutePath: "/maps/" + id + ".map", sha256: i.toString(16).padStart(64, "0"),
        starts: ["1,2", "3,4"], advancedEligible: id.startsWith("hfo-") }));
    const plan = buildUnifiedIntentV2OD1Plan(maps);
    const endpoint = { winner: "draw", status: "tick_cap_draw", tick: 24000 };
    const rows = plan.cases.map((assignment) => ({ assignment, arms: {
        disabled: { v5: { ...endpoint }, v6: { ...endpoint } },
        separated_lanes_v2: { v5: { ...endpoint }, v6: { ...endpoint } },
    } }));
    assert.throws(() => analyzeUnifiedIntentV2OD1(rows.slice(1), plan));
    const result = analyzeUnifiedIntentV2OD1(rows.slice().reverse(), plan);
    assert.equal(result.v6.populations.overall.arms.disabled.D, 900);
    assert.equal(result.bounds.overall.replicates, 200000);
    assert.equal(result.bounds.topology.clusters, 5);
    assert.equal(result.bounds.advanced.clusters, 10);
    assert.equal(result.bounds.advancedCountryDirection.clusters, 18);
    assert.equal(result.bounds.overall.score.lower90, 0);
    assert.equal(result.decision.broadPositiveDevelopmentSignal, false);
    assert.equal(result.decision.absoluteAdvancedDevelopmentEligible, false);
    assert.equal(result.v6.strata.length, 25);
    assert.equal(result.measurement.disabled.length, 25);
    assert.equal(result.leaveOneTopologyOut.length, 5);
    assert.equal(result.inputSha256, hash(JSON.stringify(rows)));
});

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
    validateOD1EpisodeTechnical, projectOD1Canary, projectOD1Smoke,
} from "../runtime/unified-intent-v2-od1-validation.mjs";
import { recordLaunch, parseLaunchMarker, publish, readPublished } from "../runtime/unified-intent-v2-od1-io.mjs";
const syntheticCell = { requestedEngineSeed: 3350107000, candidateStart: "1,2", opponentStart: "3,4", maxUpdates: 3600 };
const syntheticArms = [{ id: "disabled", enabled: false },
    { id: "separated_lanes_v2", enabled: true, budgetMode: "separated_lanes_v2", commandCeiling: 115 }];
const syntheticCanary = (arm, mode) => ({
    kind: "unified-intent-v2-od1-canary-v1", complete: true, technicalPass: true, mode,
    snapshotMode: "every_update", arm: arm.id, updates: 3600, requestedEngineSeed: 3350107000,
    observedStarts: { candidate: "1,2", opponent: "3,4" },
    quitSuppression: { mode: "symmetric_no_forwarding", attempts: { candidate: 0, baseline: 0 },
        forwarded: { candidate: 0, baseline: 0 } },
    publicCall: { sha256: "a".repeat(64), bySideAndMethod: {} },
    publicState: { sha256: "b".repeat(64), snapshots: 3601 },
    telemetry: arm.enabled ? { complete: true, updates: 3600, budgetMode: "separated_lanes_v2",
        commandCeiling: 115, rollingUpdates: 900, telemetrySha256: "c".repeat(64),
        essentialCalls: 0, productionBatches: 0, proposedCalls: 0, forwardedOrderCalls: 0, sameUnitConflicts: 0,
        duplicateSuppressions: 0, deferredUnitIds: 0, updatesWithDeferral: 0, commandCeilingOverflowUpdates: 0, oneForwardViolationUpdates: 0,
        forwardedValidationViolationUpdates: 0, partialProductionBatchViolationUpdates: 0,
        maxRollingCommandCalls: 115, maxForwardedChunkSize: 128 } : null,
});
const canaryResults = () => syntheticArms.flatMap((a) =>
    ["canary_v5_reference", "canary_dual"].map((m) => syntheticCanary(a, m)));
test("OD1 episode validation checks seed/start/horizon and both telemetry modes", () => {
    const v = syntheticCanary(syntheticArms[0], "canary_dual");
    validateOD1EpisodeTechnical(v, syntheticCell, syntheticArms[0], true);
    assert.throws(() => validateOD1EpisodeTechnical({ ...v, requestedEngineSeed: 3350107001 }, syntheticCell, syntheticArms[0], true));
    assert.throws(() => validateOD1EpisodeTechnical({ ...v, updates: 3599 }, syntheticCell, syntheticArms[0], true));
    assert.throws(() => validateOD1EpisodeTechnical({ ...v, telemetry: {} }, syntheticCell, syntheticArms[0], true));
    const enabled = syntheticCanary(syntheticArms[1], "canary_dual");
    enabled.telemetry.essentialCalls = 1;
    assert.throws(() => validateOD1EpisodeTechnical(enabled, syntheticCell, syntheticArms[1], true));
});
test("OD1 noninterference compares observer modes within each arm and fails a changed action hash", () => {
    const r = canaryResults();
    const projected = projectOD1Canary(r, syntheticCell, syntheticArms);
    assert.equal(projected.length, 2); technicalOnly(projected);
    assert.equal(projected[0].actionEquivalent, true);
    r[1].publicCall.sha256 = "d".repeat(64);
    assert.throws(() => projectOD1Canary(r, syntheticCell, syntheticArms), /noninterference/);
});
test("OD1 canary rejects injected outcome payloads and reversed observer assignments", () => {
    const r = canaryResults(); r[0].winner = "candidate";
    assert.throws(() => projectOD1Canary(r, syntheticCell, syntheticArms), /prohibited/);
    const reversed = canaryResults(); [reversed[0], reversed[1]] = [reversed[1], reversed[0]];
    assert.throws(() => projectOD1Canary(reversed, syntheticCell, syntheticArms), /mode order/);
});
test("OD1 smoke refuses incomplete pairs and oversized payloads before projection", async () => {
    await assert.rejects(projectOD1Smoke([], syntheticCell, syntheticArms), /size\/population/);
    await assert.rejects(projectOD1Smoke([{ data: "x".repeat(32 * 1024 * 1024) }, {}], syntheticCell, syntheticArms),
        /size\/population/);
});
test("OD1 launch journals distinguish incomplete launches from a valid completion", () => {
    const line = 'LAUNCH_OD1_V1 {"caseIndex":0}\n';
    assert.deepEqual(parseLaunchMarker(line), [{ caseIndex: 0 }]);
    assert.throws(() => parseLaunchMarker(line, "COMPLETE_OD1_V1 abc 1"));
    assert.throws(() => parseLaunchMarker(line + "not-a-launch\n"));
    assert.throws(() => parseLaunchMarker(line.trimEnd()));
});
test("OD1 publisher preserves two-file launch journal and rejects overwrites or damaged checksums", () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "od1-publication-"));
    try {
        const launched = { caseIndex: 0, mode: "synthetic" };
        recordLaunch(directory, launched);
        const value = { complete: true, launches: [launched] };
        const descriptor = publish(directory, value);
        assert.deepEqual(fs.readdirSync(directory).sort(), ["COMPLETE", "record.json"]);
        assert.deepEqual(readPublished(directory, descriptor.sha256).value, value);
        assert.throws(() => recordLaunch(directory, launched), /after completion/);
        assert.throws(() => publish(directory, value));
        assert.throws(() => readPublished(directory, "0".repeat(64)), /checksum/);
    } finally { fs.rmSync(directory, { recursive: true, force: true }); }
});
