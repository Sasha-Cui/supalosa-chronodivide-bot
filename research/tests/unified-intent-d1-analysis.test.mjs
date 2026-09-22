import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { D1RandomIndices, D1_BOOTSTRAP_DOMAIN, d1ClusterBootstrap, d1WilsonLower,
    evaluateD1Gates, validateD1AnalysisPopulation, analyzeUnifiedIntentD1, D1_CONTRASTS } from "../runtime/unified-intent-d1-analysis.mjs";
import { buildUnifiedIntentD1Plan } from "../../packages/chronodivide-bot-driver/dist/training/unifiedIntentD1Plan.js";
import { OD1_MAP_IDS } from "../../packages/chronodivide-bot-driver/dist/training/unifiedIntentV2OD1Plan.js";
const hash = data => createHash("sha256").update(data).digest("hex");
const reference = name => {
    let words = [], counter = 0n;
    return n => {
        const limit = 2 ** 32 - 2 ** 32 % n;
        for (;;) {
            if (!words.length) {
                const c = Buffer.alloc(8); c.writeBigUInt64BE(counter++);
                const block = createHash("sha256").update("unified-intent-budget-diagnostic-d1-bootstrap-v1\0" + name + "\0").update(c).digest();
                words = Array.from({ length: 8 }, (_, i) => block.readUInt32BE(i * 4));
            }
            const word = words.shift(); if (word < limit) return word % n;
        }
    };
};
test("D1 RNG uses its fresh domain and independent unbiased counter/rejection stream", () => {
    assert.equal(D1_BOOTSTRAP_DOMAIN, "unified-intent-budget-diagnostic-d1-bootstrap-v1");
    for (const size of [1, 25, 2147483649, 4294967295]) {
        const rng = new D1RandomIndices("reference/" + size), ref = reference("reference/" + size);
        for (let i = 0; i < 200; i++) assert.equal(rng.next(size), ref(size));
    }
    assert.throws(() => new D1RandomIndices("bad\0name"));
    assert.throws(() => new D1RandomIndices("x").next(0));
    assert.throws(() => new D1RandomIndices("x").next(2 ** 32));
});
test("D1 full 200000-replicate weighted bootstrap matches an independent implementation and all digests", () => {
    const input = [{ id: "a", weight: 2, scoreSum: 1, winSum: 1 },
        { id: "b", weight: 8, scoreSum: -4, winSum: -2 }, { id: "c", weight: 1, scoreSum: 1, winSum: 1 }];
    const actual = d1ClusterBootstrap(input.slice().reverse(), "independent/full");
    const rng = reference("independent/full"), scores = [], wins = [];
    const sh = createHash("sha256"), wh = createHash("sha256"), ih = createHash("sha256");
    for (let r = 0; r < 200000; r++) {
        const sample = Array.from({ length: 3 }, () => { const index = rng(3);
            const b = Buffer.alloc(4); b.writeUInt32BE(index); ih.update(b); return input[index]; });
        const n = sample.reduce((n, g) => n + g.weight, 0);
        const score = sample.reduce((n, g) => n + g.scoreSum, 0) / n;
        const win = sample.reduce((n, g) => n + g.winSum, 0) / n;
        scores.push(score); wins.push(win);
        const sb = Buffer.alloc(8), wb = Buffer.alloc(8); sb.writeDoubleBE(score); wb.writeDoubleBE(win);
        sh.update(sb); wh.update(wb);
    }
    assert.equal(actual.replicates, 200000); assert.equal(actual.sortedIndex, 20000);
    assert.equal(actual.score.lower90, scores.sort((a, b) => a - b)[20000]);
    assert.equal(actual.literalWin.lower90, wins.sort((a, b) => a - b)[20000]);
    assert.equal(actual.score.orderedReplicatesSha256, sh.digest("hex"));
    assert.equal(actual.literalWin.orderedReplicatesSha256, wh.digest("hex"));
    assert.equal(actual.sampledIndicesSha256, ih.digest("hex"));
    assert.equal(actual.score.mean, -2 / 11);
    assert.notEqual(d1ClusterBootstrap(input, "different", 20).sampledIndicesSha256,
        d1ClusterBootstrap(input, "independent/full", 20).sampledIndicesSha256);
    assert.throws(() => d1ClusterBootstrap([], "x"));
    assert.throws(() => d1ClusterBootstrap([{ id: "a", weight: 1, scoreSum: NaN, winSum: 0 }], "x"));
});
test("D1 Wilson lower uses literal wins with draws in the denominator", () => {
    assert(Math.abs(d1WilsonLower(50, 100) - 0.4364419) < 1e-5);
    assert(Math.abs(d1WilsonLower(0, 100)) < 1e-12);
    assert(d1WilsonLower(100, 100) < 1);
    assert.throws(() => d1WilsonLower(2, 1));
});
const gateInput = () => {
    const u = { W: 60, D: 20, L: 20, pooledWilsonWinLower90: 0.53 };
    const population = { arms: { disabled: { W: 50 }, separated_lanes_unbounded_d1: u } };
    const value = {
        v6: { populations: { overall: { transitions: { "W->L": 2, "L->W": 1, "D->W": 1 } },
            advanced: structuredClone(population), supalosa: structuredClone(population) },
            strata: [], countries: ["Americans", "Africans"].map(id => ({ id, pairedScore: 0 })),
            slots: ["0", "1"].map(id => ({ id, pairedScore: 0 })) },
        bounds: { overall: { score: { lower90: 0.01 }, literalWin: { lower90: 0.01 } },
            advanced: { score: { lower90: 0.01 } }, supalosa: { score: { lower90: 0.01 } } },
    };
    return { unbounded_minus_v2: structuredClone(value), unbounded_minus_disabled: structuredClone(value) };
};
test("D1 mechanism improvement alone cannot authorize policy improvement or deployment", () => {
    const data = gateInput();
    data.unbounded_minus_disabled.bounds.overall.literalWin.lower90 = 0;
    const result = evaluateD1Gates(data);
    assert.equal(result.budgetRemovalDiagnosticPositive, true);
    assert.equal(result.improvementOverDisabled, false);
    assert.equal(result.stopArbitrationPrimaryDirection, true);
    assert.equal(result.deploymentAuthorized, false); assert.equal(result.confirmation, false);
    data.unbounded_minus_disabled.v6.populations.advanced.arms.separated_lanes_unbounded_d1.pooledWilsonWinLower90 = 0.5;
    assert.equal(evaluateD1Gates(data).absoluteAdvancedEligible, false);
});
test("D1 exact positive/noninferiority/map/transition/country/slot thresholds cannot be weakened", () => {
    const data = gateInput(), s = data.unbounded_minus_disabled;
    assert.equal(evaluateD1Gates(data).jointDevelopmentSignal, true);
    s.bounds.supalosa.score.lower90 = -0.02;
    assert.equal(evaluateD1Gates(data).improvementOverDisabled, true);
    s.bounds.supalosa.score.lower90 = -0.020001;
    assert.equal(evaluateD1Gates(data).policyImprovement.supalosaNoninferiority, false);
    s.v6.strata = Array.from({ length: 3 }, () => ({ opponent: "pinned_supalosa", pairedScore: -0.10 }));
    assert.equal(evaluateD1Gates(data).policyImprovement.supalosaMapSafety, true);
    s.v6.strata.forEach(r => r.pairedScore = -0.100001);
    assert.equal(evaluateD1Gates(data).policyImprovement.supalosaMapSafety, false);
    s.v6.populations.overall.transitions["W->L"] = 3;
    s.v6.countries[1].pairedScore = -0.001; s.v6.slots[0].pairedScore = -0.001;
    assert.equal(evaluateD1Gates(data).policyImprovement.catastrophicTransitionSafety, false);
    assert.equal(evaluateD1Gates(data).policyImprovement.africansNonnegative, false);
    assert.equal(evaluateD1Gates(data).policyImprovement.slot0Nonnegative, false);
    for (const pop of ["overall", "supalosa", "advanced"]) {
        const input = gateInput(); input.unbounded_minus_v2.bounds[pop].score.lower90 = 0;
        assert.equal(evaluateD1Gates(input).budgetRemovalDiagnosticPositive, false);
    }
});
const plan = () => buildUnifiedIntentD1Plan(OD1_MAP_IDS.map((id, i) => ({
    id, label: id, fileName: id + ".map", absolutePath: "/maps/" + id + ".map",
    sha256: i.toString(16).padStart(64, "0"), starts: ["1,2", "3,4"], advancedEligible: id.startsWith("hfo-"),
})));
const endpoints = [
    { winner: "candidate", status: "candidate_win", tick: 100 },
    { winner: "draw", status: "tick_cap_draw", tick: 24000 },
    { winner: "baseline", status: "baseline_win", tick: 300 },
];
const rowsOf = p => p.cases.map((assignment, i) => ({ assignment, arms: Object.fromEntries(
    p.arms.map((a, j) => [a.id, { v6: { ...endpoints[(i + j) % 3] }, v5: { ...endpoints[(i + j + 1) % 3] } }])) }));
test("D1 analysis refuses partial blocks, duplicates, missing arms, endpoint/schema or assignment drift", () => {
    const p = plan(), rows = rowsOf(p);
    assert.throws(() => validateD1AnalysisPopulation(rows.slice(1), p));
    for (const mutate of [
        r => r[1] = r[0], r => delete r[0].arms.disabled,
        r => r[0].arms.disabled.v6.tick = NaN,
        r => r[0].arms.disabled.v6.winner = "draw", r => r[0].arms.disabled.v6.extra = 1,
        r => r[0].assignment.candidateSlot = 5,
    ]) { const copy = structuredClone(rows); mutate(copy); assert.throws(() => validateD1AnalysisPopulation(copy, p)); }
});
test("complete synthetic D1 analysis retains all contrasts, versions, strata and independent groupings", () => {
    const p = plan(), rows = rowsOf(p), result = analyzeUnifiedIntentD1(rows.slice().reverse(), p);
    assert.equal(result.blocks, 200); assert.equal(result.episodes, 600);
    assert.equal(result.inputSha256, hash(JSON.stringify(rows)));
    const point = { candidate: 1, draw: 0.5, baseline: 0 };
    for (const contrast of D1_CONTRASTS) {
        const r = result.contrasts[contrast.id];
        for (const version of ["v5", "v6"]) {
            const total = r[version].populations.overall;
            const expected = rows.reduce((s, row) => s + point[row.arms[contrast.treatment][version].winner] -
                point[row.arms[contrast.reference][version].winner], 0) / 200;
            assert.equal(total.pairedScore, expected);
            assert.equal(Object.values(total.transitions).reduce((a, b) => a + b), 200);
            assert.equal(r[version].strata.length, 25);
            assert(r[version].strata.every(row => row.cases === 8));
            for (const arm of [contrast.reference, contrast.treatment]) {
                assert.equal(total.arms[arm].W, rows.filter(row => row.arms[arm][version].winner === "candidate").length);
                assert.equal(total.arms[arm].D, rows.filter(row => row.arms[arm][version].winner === "draw").length);
            }
        }
        for (const [name, count] of Object.entries({ overall: 25, supalosa: 15, advanced: 10, topology: 5,
            supalosaCountryDirection: 4, advancedCountryDirection: 4 })) {
            assert.equal(r.bounds[name].clusters, count);
            assert.equal(r.bounds[name].replicates, 200000);
            assert.equal(r.bounds[name].sortedIndex, 20000);
            assert(r.bounds[name].stream.includes(contrast.id));
        }
        assert.match(r.bounds.advancedCountryDirection.inference, /very few/);
        assert.equal(r.leaveOneTopologyOut.length, 5);
    }
    assert.equal(Object.keys(result.measurement).length, 3);
    assert(Object.values(result.measurement).every(rows => rows.length === 25));
    assert.equal(result.decision.deploymentAuthorized, false);
});

import { summarizeD1Actions } from "../runtime/unified-intent-d1-analysis.mjs";
import { UnifiedIntentArbiter } from "../../packages/chronodivide-bot/dist/bot/logic/intent/unifiedIntentArbiter.js";
import { UnifiedIntentD1TelemetryCollector } from "../../packages/chronodivide-bot-driver/dist/training/unifiedIntentD1Telemetry.js";
test("D1 full action rates use observed updates and keep disabled diagnostic absence distinct from zero", () => {
    const p = plan();
    const diagnostics = Object.fromEntries(p.arms.map(arm => {
        if (!arm.enabled) return [arm.id, null];
        const core = new UnifiedIntentArbiter({ budgetMode: arm.budgetMode, commandCeiling: arm.commandCeiling });
        core.beginUpdate(1); const t = core.flush({}, "synthetic", () => {});
        const collector = new UnifiedIntentD1TelemetryCollector(arm.budgetMode); collector.observe(t);
        return [arm.id, { ...collector.finish(1), updates: 10 }];
    }));
    const input = p.cases.flatMap(c => p.arms.map(a => ({ caseIndex: c.caseIndex, arm: a.id, updates: 10,
        publicCall: { sha256: "a".repeat(64), bySideAndMethod: { "candidate.orderUnits": 1 } },
        budgetDiagnostics: diagnostics[a.id] })));
    const value = summarizeD1Actions(input.slice().reverse(), p);
    assert.equal(value.overall.disabled.observedUpdates, 2000);
    assert.equal(value.overall.disabled.publicCallsPerObservedUpdate["candidate.orderUnits"], 0.1);
    assert.equal(value.overall.disabled.budgetDiagnostics, null);
    assert.equal(value.overall.separated_lanes_v2.budgetDiagnostics.budgetDeniedDebugCalls, 0);
    assert.equal(value.strata.length, 25);
    assert.equal(value.countries.length, 2);
    assert.equal(value.opponents.length, 2);
    assert.throws(() => summarizeD1Actions(input.slice(1), p));
    const duplicate = structuredClone(input); duplicate[1] = duplicate[0];
    assert.throws(() => summarizeD1Actions(duplicate, p));
});
