import { createHash } from "node:crypto";

export const OD1_BOOTSTRAP_REPLICATES = 200000;
export const OD1_BOOTSTRAP_DOMAIN = "unified-intent-v2-od1-bootstrap-v1";
export const OD1_WILSON_Z = 1.2815515655446004;
const hash = (value) => createHash("sha256").update(value).digest("hex");
const compare = (a, b) => a < b ? -1 : a > b ? 1 : 0;
const keyOrder = (a, b) => compare(a.id, b.id);
const integer = (n) => Number.isSafeInteger(n) && n >= 0;
const winnerValue = Object.freeze({ candidate: 1, draw: 0.5, baseline: 0 });
const labels = Object.freeze({ candidate: "W", draw: "D", baseline: "L" });
const statusWinner = Object.freeze({
    candidate_win: "candidate", baseline_win: "baseline", simultaneous_draw: "draw",
    engine_nonliteral_termination_draw: "draw", tick_cap_draw: "draw",
});
const faction = (country) => ["Americans", "Alliance", "French", "Germans", "British"].includes(country)
    ? "Allied" : "Soviet";

/** SHA256(domain NUL named-stream NUL uint64BE-counter); rejection prevents modulo bias. */
export class OD1RandomIndices {
    constructor(name) {
        if (typeof name !== "string" || !name.length || name.includes("\0")) throw new Error("Invalid OD1 stream");
        this.prefix = Buffer.from(OD1_BOOTSTRAP_DOMAIN + "\0" + name + "\0");
        this.counter = 0n; this.block = Buffer.alloc(0); this.offset = 0;
    }
    next(size) {
        if (!Number.isSafeInteger(size) || size < 1 || size > 0xffffffff) throw new Error("Invalid OD1 cluster count");
        const limit = Math.floor(0x100000000 / size) * size;
        for (;;) {
            if (this.offset === this.block.length) {
                const counter = Buffer.alloc(8); counter.writeBigUInt64BE(this.counter++);
                this.block = createHash("sha256").update(this.prefix).update(counter).digest();
                this.offset = 0;
            }
            const word = this.block.readUInt32BE(this.offset); this.offset += 4;
            if (word < limit) return word % size;
        }
    }
}
export const od1WilsonLower = (wins, n) => {
    if (!integer(wins) || !integer(n) || n < 1 || wins > n) throw new Error("Invalid Wilson population");
    const z = OD1_WILSON_Z, p = wins / n, z2 = z * z;
    return (p + z2 / (2 * n) - z * Math.sqrt(p * (1 - p) / n + z2 / (4 * n * n))) / (1 + z2 / n);
};

/** Resample complete clusters; unequal topology sizes retain original within-group weights. */
export const od1ClusterBootstrap = (input, name, replicates = OD1_BOOTSTRAP_REPLICATES) => {
    if (!integer(replicates) || replicates < 10 || !Array.isArray(input) || input.length < 1 ||
        new Set(input.map((g) => g.id)).size !== input.length) throw new Error("Invalid OD1 bootstrap input");
    const groups = input.map((g) => ({ ...g })).sort(keyOrder);
    if (groups.some((g) => typeof g.id !== "string" || !g.id ||
        !integer(g.weight) || g.weight < 1 || !Number.isFinite(g.scoreSum) || !Number.isFinite(g.winSum) ||
        Math.abs(g.scoreSum) > g.weight || Math.abs(g.winSum) > g.weight)) throw new Error("Invalid OD1 cluster");
    const rng = new OD1RandomIndices(name);
    const scores = new Float64Array(replicates), wins = new Float64Array(replicates);
    const scoreHash = createHash("sha256"), winHash = createHash("sha256"), indexHash = createHash("sha256");
    const raw = Buffer.alloc(8), indexRaw = Buffer.alloc(4);
    for (let r = 0; r < replicates; r++) {
        let score = 0, win = 0, weight = 0;
        for (let i = 0; i < groups.length; i++) {
            const index = rng.next(groups.length), g = groups[index];
            indexRaw.writeUInt32BE(index); indexHash.update(indexRaw);
            score += g.scoreSum; win += g.winSum; weight += g.weight;
        }
        scores[r] = score / weight; wins[r] = win / weight;
        raw.writeDoubleBE(scores[r]); scoreHash.update(raw);
        raw.writeDoubleBE(wins[r]); winHash.update(raw);
    }
    const total = groups.reduce((s, g) => ({ score: s.score + g.scoreSum, win: s.win + g.winSum, n: s.n + g.weight }),
        { score: 0, win: 0, n: 0 });
    const scoreSha256 = scoreHash.digest("hex"), winSha256 = winHash.digest("hex");
    scores.sort(); wins.sort();
    const index = Math.floor(0.1 * replicates);
    return {
        stream: name, domain: OD1_BOOTSTRAP_DOMAIN, replicates, lowerQuantile: 0.1, sortedIndex: index,
        clusters: groups.length, cases: total.n, groupOrder: groups.map((g) => ({ id: g.id, cases: g.weight })),
        score: { mean: total.score / total.n, lower90: scores[index], orderedReplicatesSha256: scoreSha256 },
        literalWin: { mean: total.win / total.n, lower90: wins[index], orderedReplicatesSha256: winSha256 },
        sampledIndicesSha256: indexHash.digest("hex"),
        inference: "Development filter; report cluster count and topology dependence.",
    };
};
const endpointOf = (row, arm, version) => row.arms[arm][version];
const summarize = (rows, version) => {
    const counts = {};
    for (const arm of ["disabled", "separated_lanes_v2"]) {
        const endpoints = rows.map((r) => endpointOf(r, arm, version));
        const wdl = { W: 0, D: 0, L: 0 }, statuses = {};
        for (const e of endpoints) { wdl[labels[e.winner]]++; statuses[e.status] = (statuses[e.status] ?? 0) + 1; }
        const time = (items) => {
            const ticks = items.map((e) => e.tick).sort((a, b) => a - b);
            return ticks.length ? { n: ticks.length, min: ticks[0], median: ticks[Math.floor(ticks.length / 2)],
                p90: ticks[Math.min(ticks.length - 1, Math.floor(ticks.length * 0.9))],
                max: ticks[ticks.length - 1], mean: ticks.reduce((s, n) => s + n, 0) / ticks.length } : null;
        };
        counts[arm] = { n: rows.length, ...wdl, score: (wdl.W + 0.5 * wdl.D) / rows.length,
            literalWinRate: wdl.W / rows.length, pooledWilsonWinLower90: od1WilsonLower(wdl.W, rows.length),
            statuses: Object.fromEntries(Object.entries(statuses).sort(([a], [b]) => compare(a, b))),
            ticks: { all: time(endpoints), W: time(endpoints.filter((e) => e.winner === "candidate")),
                D: time(endpoints.filter((e) => e.winner === "draw")),
                L: time(endpoints.filter((e) => e.winner === "baseline")) } };
    }
    const transitions = Object.fromEntries(["W", "D", "L"].flatMap((a) => ["W", "D", "L"].map((b) => [a + "->" + b, 0])));
    let scoreSum = 0, winSum = 0;
    for (const r of rows) {
        const a = endpointOf(r, "disabled", version), b = endpointOf(r, "separated_lanes_v2", version);
        transitions[labels[a.winner] + "->" + labels[b.winner]]++;
        scoreSum += winnerValue[b.winner] - winnerValue[a.winner];
        winSum += Number(b.winner === "candidate") - Number(a.winner === "candidate");
    }
    return { cases: rows.length, arms: counts, pairedScore: scoreSum / rows.length,
        pairedLiteralWin: winSum / rows.length, transitions };
};
const groupRows = (rows, key) => {
    const groups = new Map();
    for (const r of rows) { const k = key(r); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(r); }
    return [...groups.entries()].sort(([a], [b]) => compare(a, b));
};
const clusterInput = (rows, key) => groupRows(rows, key).map(([id, items]) => {
    const s = summarize(items, "v6");
    // Half-integer scores and integer win counts are exact before division.
    return { id, weight: items.length,
        scoreSum: items.reduce((n, r) => n + winnerValue[r.arms.separated_lanes_v2.v6.winner] -
            winnerValue[r.arms.disabled.v6.winner], 0),
        winSum: s.arms.separated_lanes_v2.W - s.arms.disabled.W };
});
export const evaluateOD1Gates = ({ overall, supalosa, advanced, bounds, strata, factions, slots }) => {
    const checks = {
        overallPairedScore: bounds.overall.score.lower90 > 0,
        overallPairedLiteralWin: bounds.overall.literalWin.lower90 > 0,
        advancedPairedScore: bounds.advanced.score.lower90 > 0,
        advancedMoreLiteralWins: advanced.arms.separated_lanes_v2.W > advanced.arms.disabled.W,
        advancedCountryDirectionScore: bounds.advancedCountryDirection.score.lower90 > 0,
        supalosaNoninferiority: bounds.supalosa.score.lower90 >= -0.02,
        supalosaPositiveRecord: supalosa.arms.separated_lanes_v2.W > supalosa.arms.separated_lanes_v2.L,
        supalosaMapSafety: strata.filter((s) => s.opponent === "pinned_supalosa" && s.pairedScore < -0.10).length <= 2,
        alliedNonnegative: factions.find((s) => s.id === "Allied")?.pairedScore >= 0,
        sovietNonnegative: factions.find((s) => s.id === "Soviet")?.pairedScore >= 0,
        slot0Nonnegative: slots.find((s) => s.id === "0")?.pairedScore >= 0,
        slot1Nonnegative: slots.find((s) => s.id === "1")?.pairedScore >= 0,
        catastrophicTransitionSafety: overall.transitions["W->L"] <=
            overall.transitions["L->W"] + overall.transitions["D->W"],
    };
    const absoluteAdvanced = {
        positiveRecord: advanced.arms.separated_lanes_v2.W > advanced.arms.separated_lanes_v2.L,
        pooledWilsonWinAboveHalf: advanced.arms.separated_lanes_v2.pooledWilsonWinLower90 > 0.5,
    };
    return { checks, broadPositiveDevelopmentSignal: Object.values(checks).every((v) => v === true),
        absoluteAdvanced, absoluteAdvancedDevelopmentEligible: Object.values(absoluteAdvanced).every((v) => v === true),
        confirmation: false, deploymentAuthorized: false };
};

export const analyzeUnifiedIntentV2OD1 = (rows, plan) => {
    if (!Array.isArray(rows) || rows.length !== 900 || plan.cases.length !== 900) throw new Error("OD1 complete population required");
    const sorted = rows.slice().sort((a, b) => a.assignment.caseIndex - b.assignment.caseIndex);
    for (const [index, row] of sorted.entries()) {
        if (JSON.stringify(row.assignment) !== JSON.stringify(plan.cases[index]) ||
            JSON.stringify(Object.keys(row).sort()) !== JSON.stringify(["arms", "assignment"]) ||
            JSON.stringify(Object.keys(row.arms).sort()) !== JSON.stringify(["disabled", "separated_lanes_v2"])) {
            throw new Error("OD1 analysis assignment/schema drifted");
        }
        for (const arm of ["disabled", "separated_lanes_v2"]) {
            const versions = row.arms[arm];
            if (JSON.stringify(Object.keys(versions).sort()) !== JSON.stringify(["v5", "v6"])) throw new Error("OD1 metric versions drifted");
            for (const version of ["v5", "v6"]) {
                const e = versions[version];
                if (JSON.stringify(Object.keys(e).sort()) !== JSON.stringify(["status", "tick", "winner"]) ||
                    !Object.hasOwn(statusWinner, e.status) || statusWinner[e.status] !== e.winner ||
                    !integer(e.tick) || e.tick < 1 || e.tick > 24000 ||
                    (e.status === "tick_cap_draw" && e.tick !== 24000)) throw new Error("OD1 endpoint invalid");
            }
        }
    }
    const populations = {
        overall: sorted, supalosa: sorted.filter((r) => r.assignment.opponent === "pinned_supalosa"),
        advanced: sorted.filter((r) => r.assignment.opponent === "ra2web_advanced"),
    };
    if (populations.supalosa.length !== 540 || populations.advanced.length !== 360) throw new Error("OD1 opponent counts drifted");
    const tables = (version) => {
        const by = (key) => groupRows(sorted, key).map(([id, items]) => ({ id, ...summarize(items, version) }));
        return {
            populations: Object.fromEntries(Object.entries(populations).map(([id, items]) => [id, summarize(items, version)])),
            strata: groupRows(sorted, (r) => r.assignment.stratumId).map(([id, items]) =>
                ({ id, opponent: items[0].assignment.opponent, mapId: items[0].assignment.mapId, ...summarize(items, version) })),
            maps: by((r) => r.assignment.mapId),
            countries: by((r) => r.assignment.country),
            factions: by((r) => faction(r.assignment.country)),
            directions: by((r) => String(r.assignment.directionOrdinal)),
            slots: by((r) => String(r.assignment.candidateSlot)),
            countryDirection: by((r) => r.assignment.country + "/" + r.assignment.directionOrdinal),
            opponentCountry: by((r) => r.assignment.opponent + "/" + r.assignment.country),
            opponentFaction: by((r) => r.assignment.opponent + "/" + faction(r.assignment.country)),
            opponentDirection: by((r) => r.assignment.opponent + "/" + r.assignment.directionOrdinal),
            opponentSlot: by((r) => r.assignment.opponent + "/" + r.assignment.candidateSlot),
            opponentCountryDirection: by((r) => r.assignment.opponent + "/" + r.assignment.country + "/" + r.assignment.directionOrdinal),
        };
    };
    const v6 = tables("v6"), v5 = tables("v5");
    const bounds = {};
    for (const [id, items] of Object.entries(populations)) bounds[id] = od1ClusterBootstrap(
        clusterInput(items, (r) => r.assignment.stratumId), "v6/benchmark/" + id);
    bounds.topology = od1ClusterBootstrap(clusterInput(sorted, (r) => r.assignment.topologyId), "v6/topology/overall");
    for (const id of ["supalosa", "advanced"]) bounds[id + "CountryDirection"] = od1ClusterBootstrap(
        clusterInput(populations[id], (r) => r.assignment.country + "/" + r.assignment.directionOrdinal),
        "v6/country-direction/" + id);
    const leaveOneTopologyOut = [...new Set(sorted.map((r) => r.assignment.topologyId))].sort(compare)
        .map((excluded) => ({ excluded, ...summarize(sorted.filter((r) => r.assignment.topologyId !== excluded), "v6") }));
    const measurement = {};
    for (const arm of ["disabled", "separated_lanes_v2"]) {
        measurement[arm] = groupRows(sorted, (r) => r.assignment.stratumId).map(([stratumId, items]) => {
            const transitions = Object.fromEntries(["W", "D", "L"].flatMap((a) =>
                ["W", "D", "L"].map((b) => [a + "->" + b, 0]))), statusTransitions = {};
            for (const r of items) {
                const a = r.arms[arm].v5, b = r.arms[arm].v6;
                const key = labels[a.winner] + "->" + labels[b.winner];
                transitions[key] = (transitions[key] ?? 0) + 1;
                const status = a.status + "->" + b.status;
                statusTransitions[status] = (statusTransitions[status] ?? 0) + 1;
            }
            return { stratumId, cases: items.length, transitions, statusTransitions,
                changedFirstTick: items.filter((r) => r.arms[arm].v5.tick !== r.arms[arm].v6.tick).length };
        });
    }
    return {
        kind: "unified-intent-v2-od1-analysis-v1", complete: true, primary: "v6", secondary: "v5",
        pairs: 900, episodes: 1800, inputSha256: hash(JSON.stringify(sorted)),
        v6, v5, bounds, leaveOneTopologyOut, measurement,
        decision: evaluateOD1Gates({ ...v6.populations, bounds, strata: v6.strata, factions: v6.factions, slots: v6.slots }),
        limitations: [
            "Open development; no confirmation or deployment authorized.",
            "25 opponent-map strata are not 25 independent topologies.",
            "Five topology groups are few; report full bounds and leave-one-group sensitivity.",
            "Advanced covers ten related HFO variants, one topology; unseen-topology inference is unavailable.",
            "Only first-two-start reciprocal configurations; 24000 updates, not the historical 90000.",
        ],
    };
};
