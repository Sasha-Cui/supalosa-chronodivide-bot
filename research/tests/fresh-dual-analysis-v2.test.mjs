import test from "node:test";
import assert from "node:assert/strict";

import { analyzeFreshDualRows } from "../runtime/fresh-dual-analysis-v1.mjs";
import {
    FRESH_DUAL_ANALYSIS_V2,
    FRESH_DUAL_T95_BY_CLUSTER_COUNT,
    analyzeFreshDualRowsV2,
    correctedFreshDualEndpointEffects,
    freshDualT95ForClusterCount,
} from "../runtime/fresh-dual-analysis-v2.mjs";

const countries = [
    "Americans", "Alliance", "French", "Germans", "British",
    "Africans", "Arabs", "Confederation", "Russians",
];
const hfoStarts = ["39,82", "88,34", "151,119", "88,157"];
const peakStarts = ["37,73", "118,73"];
const hex = (character) => character.repeat(64);
const endpoint = (winner) => ({
    winner,
    status: winner === "candidate" ? "candidate_win" :
        winner === "baseline" ? "baseline_win" : "tick_cap_draw",
    tick: 1200,
});

const effectRow = ({ cohort, mapId, arm, country, candidateStart, favorable = true }) => ({
    cohort,
    mapId,
    arm,
    country,
    candidateStart,
    v5: endpoint("draw"),
    v6: endpoint(favorable ? "candidate" : "baseline"),
});

const clusterRows = (count, cohort, arm, mapPrefix = "map") =>
    Array.from({ length: count }, (_, index) => effectRow({
        cohort,
        mapId: `${mapPrefix}-${Math.floor(index / 18)}`,
        arm,
        country: countries[index % countries.length],
        candidateStart: `start-${Math.floor(index / countries.length) % 2}`,
        favorable: index % 3 !== 0,
    }));

const buildPassingRows = () => {
    const rows = [];
    let gameIndex = 0;
    const add = (value) => rows.push({
        gameIndex: gameIndex++,
        requestedEngineSeed: 3_800_000_000 + value.caseIndex,
        actionSha256: value.actionSha256 ?? hex("a"),
        ledgerPlainSha256: value.ledgerPlainSha256 ?? hex("b"),
        v5: endpoint(value.winner),
        v6: endpoint(value.winner),
        ...value,
    });
    let caseIndex = 0;
    for (const country of countries) for (const candidateStart of hfoStarts) {
        for (let repeat = 0; repeat < 10; repeat += 1) for (const candidateSlot of [0, 1]) {
            add({ caseIndex: caseIndex++, cohort: "central", mapId: "hfo-le", arm: "deployed",
                country, candidateStart, candidateSlot, winner: "candidate" });
        }
    }
    const peakCases = [];
    for (const country of countries) for (const candidateStart of peakStarts) {
        for (let repeat = 0; repeat < 5; repeat += 1) for (const candidateSlot of [0, 1]) {
            peakCases.push({ caseIndex: caseIndex++, country, candidateStart, candidateSlot,
                weak: candidateStart === "37,73" });
        }
    }
    for (const value of peakCases) {
        add({ ...value, cohort: "peak", mapId: "peak", arm: "deployed",
            winner: value.weak ? "candidate" : "baseline",
            actionSha256: value.weak ? hex("c") : hex("d"),
            ledgerPlainSha256: value.weak ? hex("e") : hex("f") });
    }
    for (const value of peakCases) {
        add({ ...value, cohort: "peak", mapId: "peak", arm: "strategy_both", winner: "candidate",
            actionSha256: value.weak ? hex("c") : hex("1"),
            ledgerPlainSha256: value.weak ? hex("e") : hex("2") });
    }
    const transferStarts = [8, 6, 4, 4, 4, 2, 2, 2, 2, 6, 4, 2, 4];
    for (const [mapIndex, starts] of transferStarts.entries()) {
        for (const country of countries) for (let start = 0; start < starts; start += 1) {
            for (const candidateSlot of [0, 1]) {
                add({ caseIndex: caseIndex++, cohort: "transfer", mapId: `transfer-${mapIndex}`,
                    arm: "deployed", country, candidateStart: `map-${mapIndex}-start-${start}`,
                    candidateSlot, winner: "candidate" });
            }
        }
    }
    const advancedCases = [];
    for (const country of countries) for (const candidateStart of hfoStarts) {
        for (let repeat = 0; repeat < 5; repeat += 1) for (const candidateSlot of [0, 1]) {
            advancedCases.push({ caseIndex: caseIndex++, country, candidateStart, candidateSlot });
        }
    }
    for (const value of advancedCases) {
        add({ ...value, cohort: "advanced", mapId: "hfo-le", arm: "deployed", winner: "candidate",
            actionSha256: hex("3"), ledgerPlainSha256: hex("4") });
    }
    for (const value of advancedCases) {
        add({ ...value, cohort: "advanced", mapId: "hfo-le", arm: "supalosa_reference",
            winner: "baseline", actionSha256: hex("5"), ledgerPlainSha256: hex("6") });
    }
    assert.equal(rows.length, 2700);
    return rows;
};

test("uses the exact frozen critical value for every supported cluster count", () => {
    assert.deepEqual(FRESH_DUAL_T95_BY_CLUSTER_COUNT, {
        18: 1.7396067260750672,
        36: 1.6895724577802655,
        54: 1.674116236703115,
        72: 1.6665996583285084,
        450: 1.6482543776503167,
    });
    for (const [count, expected] of Object.entries(FRESH_DUAL_T95_BY_CLUSTER_COUNT)) {
        assert.equal(freshDualT95ForClusterCount(Number(count)), expected);
    }
    assert.throws(() => freshDualT95ForClusterCount(17), /Unsupported/);
});

test("keeps coordinate-identical clusters distinct across maps", () => {
    const rows = [
        ...clusterRows(18, "collision", "deployed", "left"),
        ...clusterRows(18, "collision", "deployed", "right"),
    ];
    const summary = correctedFreshDualEndpointEffects(rows);
    const cohort = summary.find((row) =>
        row.level === "cohort_arm" && row.cohort === "collision" && row.arm === "deployed");
    assert.equal(cohort.countryStartClusters, 36);
    assert.equal(cohort.tCritical95, FRESH_DUAL_T95_BY_CLUSTER_COUNT[36]);
    assert.equal(summary.filter((row) => row.level === "map_arm").length, 2);
});

test("supports every realized V2 map and cohort cluster count", () => {
    const rows = [
        ...clusterRows(18, "c18", "a18"),
        ...clusterRows(36, "c36", "a36"),
        ...clusterRows(54, "c54", "a54"),
        ...clusterRows(72, "c72", "a72"),
        ...clusterRows(450, "c450", "a450"),
    ];
    const effects = correctedFreshDualEndpointEffects(rows);
    for (const count of [18, 36, 54, 72, 450]) {
        const row = effects.find((value) => value.level === "cohort_arm" && value.cohort === `c${count}`);
        assert.equal(row.countryStartClusters, count);
        assert.equal(row.tCritical95, FRESH_DUAL_T95_BY_CLUSTER_COUNT[count]);
        assert.ok(Number.isFinite(row.countryStartLower95));
    }
    const overall = effects.find((row) => row.level === "overall");
    assert.equal(overall.countryStartClusters, null);
    assert.equal(overall.countryStartLower95, null);
    assert.equal(overall.inferenceStatus, "omitted-heterogeneous-all-row-mixture");
});

test("fails closed on an unsupported realized cluster count", () => {
    assert.throws(() => correctedFreshDualEndpointEffects(clusterRows(17, "c17", "a17")),
        /Unsupported endpoint-effect cluster count 17/);
});

test("replaces only endpoint effects and preserves every frozen gate", () => {
    const rows = buildPassingRows();
    const frozen = analyzeFreshDualRows(rows);
    const corrected = analyzeFreshDualRowsV2(rows);
    assert.equal(corrected.analysisRevision, FRESH_DUAL_ANALYSIS_V2);
    assert.deepEqual(corrected.gates, frozen.gates);
    assert.deepEqual(corrected.outcomes, frozen.outcomes);
    assert.deepEqual(corrected.transitions, frozen.transitions);
    assert.notDeepEqual(corrected.endpointEffects, frozen.endpointEffects);
    assert.equal(corrected.heterogeneousOverallEndpointEffectInference, "omitted");
});
