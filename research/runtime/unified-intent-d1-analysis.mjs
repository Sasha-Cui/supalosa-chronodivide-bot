import { validateD1BudgetDiagnostics } from "./unified-intent-d1-validation.mjs";
// D1 complete-population analysis. No gameplay, file reads, selection, retries or tuning.
import { createHash } from "node:crypto";
import { validateUnifiedIntentD1Plan } from "../../packages/chronodivide-bot-driver/dist/training/unifiedIntentD1Plan.js";
export const D1_BOOTSTRAP_REPLICATES = 200000;
export const D1_BOOTSTRAP_DOMAIN = "unified-intent-budget-diagnostic-d1-bootstrap-v1";
export const D1_WILSON_Z = 1.2815515655446004;
export const D1_CONTRASTS = [
    { id: "unbounded_minus_v2", reference: "separated_lanes_v2", treatment: "separated_lanes_unbounded_d1" },
    { id: "unbounded_minus_disabled", reference: "disabled", treatment: "separated_lanes_unbounded_d1" },
    { id: "v2_minus_disabled", reference: "disabled", treatment: "separated_lanes_v2" },
];
const ARMS = ["disabled", "separated_lanes_v2", "separated_lanes_unbounded_d1"];
const hash = data => createHash("sha256").update(data).digest("hex");
const cmp = (a, b) => a < b ? -1 : a > b ? 1 : 0;
const integer = n => Number.isSafeInteger(n) && n >= 0;
const points = { candidate: 1, draw: 0.5, baseline: 0 };
const label = { candidate: "W", draw: "D", baseline: "L" };
const statusWinner = { candidate_win: "candidate", baseline_win: "baseline",
    simultaneous_draw: "draw", engine_nonliteral_termination_draw: "draw", tick_cap_draw: "draw" };
const keys = (value, expected) => {
    if (!value || typeof value !== "object" || JSON.stringify(Object.keys(value).sort()) !==
        JSON.stringify([...expected].sort())) throw new Error("D1 exact schema invalid");
};
const groups = (rows, key) => {
    const map = new Map();
    for (const row of rows) { const id = key(row); if (!map.has(id)) map.set(id, []); map.get(id).push(row); }
    return [...map.entries()].sort(([a], [b]) => cmp(a, b));
};
const matrix = () => Object.fromEntries(["W", "D", "L"].flatMap(a => ["W", "D", "L"].map(b => [a + "->" + b, 0])));
const faction = country => country === "Americans" ? "Allied" : "Soviet";
const groupings = {
    strata: r => r.assignment.stratumId, maps: r => r.assignment.mapId,
    countries: r => r.assignment.country, factions: r => faction(r.assignment.country),
    slots: r => String(r.assignment.candidateSlot), directions: r => String(r.assignment.directionOrdinal),
    countryDirection: r => r.assignment.country + "/" + r.assignment.directionOrdinal,
    opponentCountry: r => r.assignment.opponent + "/" + r.assignment.country,
    opponentFaction: r => r.assignment.opponent + "/" + faction(r.assignment.country),
    opponentSlot: r => r.assignment.opponent + "/" + r.assignment.candidateSlot,
    opponentDirection: r => r.assignment.opponent + "/" + r.assignment.directionOrdinal,
    opponentCountryDirection: r => r.assignment.opponent + "/" + r.assignment.country + "/" + r.assignment.directionOrdinal,
};
export const d1WilsonLower = (wins, n) => {
    if (!integer(wins) || !integer(n) || n < 1 || wins > n) throw new Error("D1 Wilson population invalid");
    const p = wins / n, z = D1_WILSON_Z, z2 = z * z;
    return (p + z2 / (2 * n) - z * Math.sqrt(p * (1 - p) / n + z2 / (4 * n * n))) / (1 + z2 / n);
};
/** SHA256(domain NUL stream NUL uint64BE counter), uint32BE draws with rejection. */
export class D1RandomIndices {
    constructor(name) {
        if (typeof name !== "string" || !name || name.includes("\0")) throw new Error("D1 stream invalid");
        this.prefix = Buffer.from(D1_BOOTSTRAP_DOMAIN + "\0" + name + "\0");
        this.counter = 0n; this.block = Buffer.alloc(0); this.offset = 0;
    }
    next(size) {
        if (!integer(size) || size < 1 || size > 0xffffffff) throw new Error("D1 sample size invalid");
        const limit = Math.floor(0x100000000 / size) * size;
        for (;;) {
            if (this.offset === this.block.length) {
                const counter = Buffer.alloc(8); counter.writeBigUInt64BE(this.counter++);
                this.block = createHash("sha256").update(this.prefix).update(counter).digest(); this.offset = 0;
            }
            const word = this.block.readUInt32BE(this.offset); this.offset += 4;
            if (word < limit) return word % size;
        }
    }
}
export const d1ClusterBootstrap = (input, name, replicates = D1_BOOTSTRAP_REPLICATES) => {
    if (!integer(replicates) || replicates < 10 || !Array.isArray(input) || !input.length ||
        new Set(input.map(g => g.id)).size !== input.length) throw new Error("D1 bootstrap population invalid");
    const ordered = input.map(g => ({ ...g })).sort((a, b) => cmp(a.id, b.id));
    if (ordered.some(g => typeof g.id !== "string" || !g.id || !integer(g.weight) || g.weight < 1 ||
        !Number.isFinite(g.scoreSum) || !Number.isFinite(g.winSum) ||
        Math.abs(g.scoreSum) > g.weight || Math.abs(g.winSum) > g.weight)) throw new Error("D1 cluster invalid");
    const rng = new D1RandomIndices(name), scores = new Float64Array(replicates), wins = new Float64Array(replicates);
    const digests = { score: createHash("sha256"), win: createHash("sha256"), indices: createHash("sha256") };
    const raw = Buffer.alloc(8), iraw = Buffer.alloc(4);
    for (let r = 0; r < replicates; r++) {
        let score = 0, win = 0, n = 0;
        for (let i = 0; i < ordered.length; i++) {
            const index = rng.next(ordered.length), g = ordered[index];
            iraw.writeUInt32BE(index); digests.indices.update(iraw);
            score += g.scoreSum; win += g.winSum; n += g.weight;
        }
        scores[r] = score / n; wins[r] = win / n;
        raw.writeDoubleBE(scores[r]); digests.score.update(raw);
        raw.writeDoubleBE(wins[r]); digests.win.update(raw);
    }
    const total = ordered.reduce((a, g) => ({ n: a.n + g.weight, score: a.score + g.scoreSum, win: a.win + g.winSum }),
        { n: 0, score: 0, win: 0 });
    scores.sort(); wins.sort();
    const index = Math.floor(0.1 * replicates);
    return { stream: name, domain: D1_BOOTSTRAP_DOMAIN, replicates, lowerQuantile: 0.1, sortedIndex: index,
        clusters: ordered.length, cases: total.n, groupOrder: ordered.map(g => ({ id: g.id, cases: g.weight })),
        score: { mean: total.score / total.n, lower90: scores[index], orderedReplicatesSha256: digests.score.digest("hex") },
        literalWin: { mean: total.win / total.n, lower90: wins[index], orderedReplicatesSha256: digests.win.digest("hex") },
        sampledIndicesSha256: digests.indices.digest("hex"),
        inference: ordered.length === 4 ? "Four clusters: very few; sensitivity description, not reliable population-wide uncertainty."
            : "Open-development filter; retain topology dependence and cluster counts." };
};
const time = endpoints => {
    const ticks = endpoints.map(e => e.tick).sort((a, b) => a - b);
    return ticks.length ? { n: ticks.length, min: ticks[0], median: ticks[Math.floor(ticks.length / 2)],
        p90: ticks[Math.min(ticks.length - 1, Math.floor(ticks.length * 0.9))], max: ticks.at(-1),
        mean: ticks.reduce((a, b) => a + b, 0) / ticks.length } : null;
};
const summarize = (rows, version, contrast) => {
    const arms = {};
    for (const arm of [contrast.reference, contrast.treatment]) {
        const endpoints = rows.map(r => r.arms[arm][version]), wdl = { W: 0, D: 0, L: 0 }, statuses = {};
        for (const e of endpoints) { wdl[label[e.winner]]++; statuses[e.status] = (statuses[e.status] ?? 0) + 1; }
        arms[arm] = { n: rows.length, ...wdl, score: (wdl.W + wdl.D / 2) / rows.length,
            literalWinRate: wdl.W / rows.length, pooledWilsonWinLower90: d1WilsonLower(wdl.W, rows.length),
            statuses: Object.fromEntries(Object.entries(statuses).sort(([a], [b]) => cmp(a, b))),
            ticks: { all: time(endpoints), ...Object.fromEntries(["candidate", "draw", "baseline"].map(w =>
                [label[w], time(endpoints.filter(e => e.winner === w))])) } };
    }
    const transitions = matrix();
    let score = 0, win = 0;
    for (const r of rows) {
        const a = r.arms[contrast.reference][version], b = r.arms[contrast.treatment][version];
        transitions[label[a.winner] + "->" + label[b.winner]]++;
        score += points[b.winner] - points[a.winner];
        win += Number(b.winner === "candidate") - Number(a.winner === "candidate");
    }
    return { cases: rows.length, arms, pairedScore: score / rows.length, pairedLiteralWin: win / rows.length, transitions };
};
const populationsOf = rows => ({ overall: rows, supalosa: rows.filter(r => r.assignment.opponent === "pinned_supalosa"),
    advanced: rows.filter(r => r.assignment.opponent === "ra2web_advanced") });
const tables = (rows, version, contrast) => ({
    populations: Object.fromEntries(Object.entries(populationsOf(rows)).map(([id, items]) => [id, summarize(items, version, contrast)])),
    ...Object.fromEntries(Object.entries(groupings).map(([name, key]) => [name, groups(rows, key).map(([id, items]) => ({
        id, ...(name === "strata" ? { opponent: items[0].assignment.opponent, mapId: items[0].assignment.mapId } : {}),
        ...summarize(items, version, contrast),
    }))])),
});
const clusterInput = (rows, key, contrast) => groups(rows, key).map(([id, items]) => ({
    id, weight: items.length,
    scoreSum: items.reduce((s, r) => s + points[r.arms[contrast.treatment].v6.winner] - points[r.arms[contrast.reference].v6.winner], 0),
    winSum: items.reduce((s, r) => s + Number(r.arms[contrast.treatment].v6.winner === "candidate") -
        Number(r.arms[contrast.reference].v6.winner === "candidate"), 0),
}));
const pointChecks = value => ({
    americansNonnegative: value.v6.countries.find(r => r.id === "Americans")?.pairedScore >= 0,
    africansNonnegative: value.v6.countries.find(r => r.id === "Africans")?.pairedScore >= 0,
    slot0Nonnegative: value.v6.slots.find(r => r.id === "0")?.pairedScore >= 0,
    slot1Nonnegative: value.v6.slots.find(r => r.id === "1")?.pairedScore >= 0,
});
export const evaluateD1Gates = contrasts => {
    const primary = contrasts.unbounded_minus_v2, secondary = contrasts.unbounded_minus_disabled;
    const unbounded = "separated_lanes_unbounded_d1";
    const { overall, supalosa, advanced } = secondary.v6.populations;
    const mechanism = {
        overallScore: primary.bounds.overall.score.lower90 > 0,
        overallLiteralWin: primary.bounds.overall.literalWin.lower90 > 0,
        supalosaScore: primary.bounds.supalosa.score.lower90 > 0,
        advancedScore: primary.bounds.advanced.score.lower90 > 0, ...pointChecks(primary),
    };
    const policyImprovement = {
        overallScore: secondary.bounds.overall.score.lower90 > 0,
        overallLiteralWin: secondary.bounds.overall.literalWin.lower90 > 0,
        advancedScore: secondary.bounds.advanced.score.lower90 > 0,
        advancedMoreLiteralWins: advanced.arms[unbounded].W > advanced.arms.disabled.W,
        supalosaNoninferiority: secondary.bounds.supalosa.score.lower90 >= -0.02,
        supalosaPositiveRecord: supalosa.arms[unbounded].W > supalosa.arms[unbounded].L,
        supalosaMapSafety: secondary.v6.strata.filter(r => r.opponent === "pinned_supalosa" && r.pairedScore < -0.10).length <= 2,
        ...pointChecks(secondary),
        catastrophicTransitionSafety: overall.transitions["W->L"] <= overall.transitions["L->W"] + overall.transitions["D->W"],
    };
    const absoluteAdvanced = { positiveRecord: advanced.arms[unbounded].W > advanced.arms[unbounded].L,
        pooledWilsonWinAboveHalf: advanced.arms[unbounded].pooledWilsonWinLower90 > 0.5 };
    const all = checks => Object.values(checks).every(v => v === true);
    return { mechanism, policyImprovement, absoluteAdvanced, budgetRemovalDiagnosticPositive: all(mechanism),
        improvementOverDisabled: all(policyImprovement), absoluteAdvancedEligible: all(absoluteAdvanced),
        jointDevelopmentSignal: all(mechanism) && all(policyImprovement),
        stopArbitrationPrimaryDirection: !all(policyImprovement), confirmation: false, deploymentAuthorized: false };
};
export const validateD1AnalysisPopulation = (rows, plan) => {
    validateUnifiedIntentD1Plan(plan, plan.maps);
    if (!Array.isArray(rows) || rows.length !== 200) throw new Error("D1 complete 200-block population required");
    const sorted = rows.slice().sort((a, b) => a.assignment.caseIndex - b.assignment.caseIndex);
    for (const [i, r] of sorted.entries()) {
        keys(r, ["assignment", "arms"]); keys(r.arms, ARMS);
        if (JSON.stringify(r.assignment) !== JSON.stringify(plan.cases[i])) throw new Error("D1 assignment drifted");
        for (const arm of ARMS) {
            keys(r.arms[arm], ["v5", "v6"]);
            for (const e of Object.values(r.arms[arm])) {
                keys(e, ["status", "tick", "winner"]);
                if (!Object.hasOwn(statusWinner, e.status) || statusWinner[e.status] !== e.winner ||
                    !integer(e.tick) || e.tick < 1 || e.tick > 24000 ||
                    (e.status === "tick_cap_draw" && e.tick !== 24000)) throw new Error("D1 endpoint invalid");
            }
        }
    }
    return sorted;
};
export const analyzeUnifiedIntentD1 = (rows, plan) => {
    const sorted = validateD1AnalysisPopulation(rows, plan), populations = populationsOf(sorted), contrasts = {};
    for (const contrast of D1_CONTRASTS) {
        const bounds = {}, prefix = "v6/" + contrast.id + "/";
        for (const [id, items] of Object.entries(populations)) bounds[id] = d1ClusterBootstrap(
            clusterInput(items, groupings.strata, contrast), prefix + "benchmark/" + id);
        bounds.topology = d1ClusterBootstrap(clusterInput(sorted, r => r.assignment.topologyId, contrast), prefix + "topology/overall");
        for (const id of ["supalosa", "advanced"]) bounds[id + "CountryDirection"] = d1ClusterBootstrap(
            clusterInput(populations[id], groupings.countryDirection, contrast), prefix + "country-direction/" + id);
        contrasts[contrast.id] = { ...contrast, v6: tables(sorted, "v6", contrast), v5: tables(sorted, "v5", contrast), bounds,
            leaveOneTopologyOut: [...new Set(sorted.map(r => r.assignment.topologyId))].sort(cmp).map(excluded => ({
                excluded, ...summarize(sorted.filter(r => r.assignment.topologyId !== excluded), "v6", contrast),
            })) };
    }
    const measurement = Object.fromEntries(ARMS.map(arm => [arm, groups(sorted, groupings.strata).map(([stratumId, items]) => {
        const transitions = matrix(), statusTransitions = {};
        for (const r of items) {
            const a = r.arms[arm].v5, b = r.arms[arm].v6;
            transitions[label[a.winner] + "->" + label[b.winner]]++;
            const key = a.status + "->" + b.status; statusTransitions[key] = (statusTransitions[key] ?? 0) + 1;
        }
        return { stratumId, cases: items.length, transitions, statusTransitions,
            changedFirstTick: items.filter(r => r.arms[arm].v5.tick !== r.arms[arm].v6.tick).length };
    })]));
    return { kind: "unified-intent-d1-analysis-v1", complete: true, primary: "v6", secondary: "v5",
        primaryContrast: D1_CONTRASTS[0].id, secondaryContrast: D1_CONTRASTS[1].id, blocks: 200, episodes: 600,
        inputSha256: hash(JSON.stringify(sorted)), contrasts, measurement, decision: evaluateD1Gates(contrasts),
        limitations: ["Open development informed by the complete negative OD1 study; not confirmation or deployment.",
            "25 opponent-map strata are not 25 independent topologies; five topology groups are few.",
            "Advanced covers one HFO topology. Four country/direction clusters are very few: sensitivity only.",
            "Americans/Africans only; fresh nine-country validation and replication are required.",
            "First-two reciprocal starts and 24000 updates are not the historical 90000-update population.",
            "The intervention removes shared order/debug admission, not arbitration or duplicate suppression.",
            "No favorable-subset rescue, horizon extension, ceiling search, or selective reruns."] };
};

/** Complete descriptive action accounting; absent disabled arbiter telemetry is never measured zero. */
export const summarizeD1Actions = (input, plan) => {
    validateUnifiedIntentD1Plan(plan, plan.maps);
    if (!Array.isArray(input) || input.length !== 600) throw new Error("D1 complete action population required");
    const rows = input.slice().sort((a, b) => a.caseIndex - b.caseIndex || ARMS.indexOf(a.arm) - ARMS.indexOf(b.arm));
    for (const [index, row] of rows.entries()) {
        keys(row, ["caseIndex", "arm", "updates", "publicCall", "budgetDiagnostics"]);
        if (row.caseIndex !== Math.floor(index / 3) || row.arm !== ARMS[index % 3] ||
            !integer(row.updates) || row.updates < 1 || row.updates > 24000) throw new Error("D1 action identity invalid");
        keys(row.publicCall, ["sha256", "bySideAndMethod"]);
        if (!/^[0-9a-f]{64}$/.test(row.publicCall.sha256) || !row.publicCall.bySideAndMethod ||
            typeof row.publicCall.bySideAndMethod !== "object" || Array.isArray(row.publicCall.bySideAndMethod) ||
            Object.entries(row.publicCall.bySideAndMethod).some(([k, v]) =>
                !/^(candidate|baseline)\.[a-zA-Z]+$/.test(k) || !integer(v))) throw new Error("D1 action counters invalid");
        if (row.arm === "disabled") {
            if (row.budgetDiagnostics !== null) throw new Error("D1 disabled diagnostic absence invalid");
        } else validateD1BudgetDiagnostics(row.budgetDiagnostics, plan.arms[index % 3], row.updates);
    }
    const enriched = rows.map(row => ({ ...row, assignment: plan.cases[row.caseIndex] }));
    const summarizeActions = items => Object.fromEntries(ARMS.map(arm => {
        const armRows = items.filter(r => r.arm === arm), publicCalls = {};
        const updates = armRows.reduce((s, r) => s + r.updates, 0);
        for (const r of armRows) for (const [method, n] of Object.entries(r.publicCall.bySideAndMethod)) {
            publicCalls[method] = (publicCalls[method] ?? 0) + n;
        }
        const ordered = Object.fromEntries(Object.entries(publicCalls).sort(([a], [b]) => cmp(a, b)));
        let budgetDiagnostics = null;
        if (arm !== "disabled") {
            const counterNames = Object.keys(armRows[0].budgetDiagnostics.counters).sort();
            const counters = Object.fromEntries(counterNames.map(k => [k,
                armRows.reduce((s, r) => s + r.budgetDiagnostics.counters[k], 0)]));
            budgetDiagnostics = { counters,
                countersPerObservedUpdate: Object.fromEntries(counterNames.map(k => [k, counters[k] / updates])),
                referenceExceededUpdates: armRows.reduce((s, r) => s + r.budgetDiagnostics.referenceExceededUpdates, 0),
                budgetDenialUpdates: armRows.reduce((s, r) => s + r.budgetDiagnostics.budgetDenialUpdates, 0),
                budgetDeniedUnitIdOccurrences: counters.deferredUnitIds,
                budgetDeniedDebugCalls: counters.debugDropped,
                maxRollingCommandCalls: Math.max(...armRows.map(r => r.budgetDiagnostics.maxRollingCommandCalls)),
                maxPendingUnitIds: Math.max(...armRows.map(r => r.budgetDiagnostics.maxPendingUnitIds)),
            };
        }
        return [arm, { episodes: armRows.length, observedUpdates: updates, publicCalls: ordered,
            publicCallsPerObservedUpdate: Object.fromEntries(Object.entries(ordered).map(([k, n]) => [k, n / updates])),
            budgetDiagnostics }];
    }));
    return { kind: "unified-intent-d1-actions-v1", complete: true, episodes: 600, blocks: 200,
        inputSha256: hash(JSON.stringify(rows)), overall: summarizeActions(enriched),
        opponents: groups(enriched, r => r.assignment.opponent).map(([id, items]) => ({ id, arms: summarizeActions(items) })),
        ...Object.fromEntries(Object.entries(groupings).map(([name, key]) => [name,
            groups(enriched, key).map(([id, items]) => ({ id, arms: summarizeActions(items) }))])),
        interpretation: "Descriptive API calls per actual observed update; not a causal combat explanation. Disabled arbiter diagnostics are absent, not zero. Pending/denied IDs count occurrences." };
};
