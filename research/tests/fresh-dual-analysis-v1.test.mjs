import test from "node:test";
import assert from "node:assert/strict";
import {
    analyzeFreshDualRows,
    freshDualFaction,
    freshDualScore,
    freshDualTLower,
    freshDualWilsonLower,
    summarizeFreshDualOutcomes,
} from "../runtime/fresh-dual-analysis-v1.mjs";

const countries = [
    "Americans", "Alliance", "French", "Germans", "British",
    "Africans", "Arabs", "Confederation", "Russians",
];
const hfoStarts = ["39,82", "88,34", "151,119", "88,157"];
const peakStarts = ["37,73", "118,73"];
const hex = (character) => character.repeat(64);
const endpoint = (winner) => ({
    winner,
    status: winner === "candidate" ? "candidate_win" : winner === "baseline" ? "baseline_win" : "tick_cap_draw",
    tick: 1200,
});

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
            add({
                caseIndex: caseIndex++,
                cohort: "central",
                mapId: "hfo-le",
                arm: "deployed",
                country,
                candidateStart,
                candidateSlot,
                winner: "candidate",
            });
        }
    }
    const peakBase = caseIndex;
    const peakCases = [];
    for (const country of countries) for (const candidateStart of peakStarts) {
        for (let repeat = 0; repeat < 5; repeat += 1) for (const candidateSlot of [0, 1]) {
            peakCases.push({
                caseIndex: caseIndex++,
                country,
                candidateStart,
                candidateSlot,
                weak: candidateStart === "37,73",
            });
        }
    }
    assert.equal(peakBase, 720);
    assert.equal(peakCases.length, 180);
    for (const value of peakCases) {
        add({
            ...value,
            cohort: "peak",
            mapId: "peak",
            arm: "deployed",
            winner: value.weak ? "candidate" : "baseline",
            actionSha256: value.weak ? hex("c") : hex("d"),
            ledgerPlainSha256: value.weak ? hex("e") : hex("f"),
        });
    }
    for (const value of peakCases) {
        add({
            ...value,
            cohort: "peak",
            mapId: "peak",
            arm: "strategy_both",
            winner: "candidate",
            actionSha256: value.weak ? hex("c") : hex("1"),
            ledgerPlainSha256: value.weak ? hex("e") : hex("2"),
        });
    }
    for (let index = 0; index < 900; index += 1) {
        add({
            caseIndex: caseIndex++,
            cohort: "transfer",
            mapId: `transfer-${index % 13}`,
            arm: "deployed",
            country: countries[index % countries.length],
            candidateStart: String(index % 8),
            candidateSlot: index % 2,
            winner: "candidate",
        });
    }
    const advancedCases = [];
    for (const country of countries) for (const candidateStart of hfoStarts) {
        for (let repeat = 0; repeat < 5; repeat += 1) for (const candidateSlot of [0, 1]) {
            advancedCases.push({ caseIndex: caseIndex++, country, candidateStart, candidateSlot });
        }
    }
    assert.equal(advancedCases.length, 360);
    for (const value of advancedCases) {
        add({
            ...value,
            cohort: "advanced",
            mapId: "hfo-le",
            arm: "deployed",
            winner: "candidate",
            actionSha256: hex("3"),
            ledgerPlainSha256: hex("4"),
        });
    }
    for (const value of advancedCases) {
        add({
            ...value,
            cohort: "advanced",
            mapId: "hfo-le",
            arm: "supalosa_reference",
            winner: "baseline",
            actionSha256: hex("5"),
            ledgerPlainSha256: hex("6"),
        });
    }
    assert.equal(rows.length, 2700);
    assert.equal(gameIndex, 2700);
    return rows;
};

test("statistical helpers implement frozen score and lower bounds", () => {
    assert.equal(freshDualScore("candidate"), 1);
    assert.equal(freshDualScore("draw"), 0.5);
    assert.equal(freshDualScore("baseline"), 0);
    assert.equal(freshDualFaction("Americans"), "Allied");
    assert.equal(freshDualFaction("Russians"), "Soviet");
    assert.ok(freshDualWilsonLower(10, 10) > 0.5);
    assert.equal(freshDualTLower([1, 1, 1], 1.7), 1);
    const summary = summarizeFreshDualOutcomes([
        { v6: endpoint("candidate") },
        { v6: endpoint("draw") },
        { v6: endpoint("baseline") },
    ], "v6");
    assert.deepEqual([summary.wins, summary.draws, summary.losses], [1, 1, 1]);
    assert.equal(summary.scoreMean, 0.5);
});

test("complete synthetic evidence exercises every frozen positive gate", () => {
    const analysis = analyzeFreshDualRows(buildPassingRows());
    assert.equal(analysis.complete, true);
    assert.equal(analysis.rows, 2700);
    assert.equal(analysis.gates.central.superiorityPassed, true);
    assert.equal(analysis.gates.central.dominancePassed, true);
    assert.equal(analysis.gates.peak.passed, true);
    assert.equal(analysis.gates.peak.weakStartPairs, 90);
    assert.equal(analysis.gates.advanced.superiorityPassed, true);
    assert.equal(analysis.gates.advanced.dominancePassed, true);
    const slotRows = analysis.outcomes.filter((row) =>
        row.endpoint === "v6" && row.level === "map_arm_slot" &&
        row.cohort === "central" && row.mapId === "hfo-le" && row.arm === "deployed");
    assert.deepEqual(slotRows.map((row) => row.slot), [0, 1]);
    assert.ok(analysis.transitions.every((row) => row.v5Winner === row.v6Winner));
    assert.ok(analysis.endpointEffects.every((row) => row.meanScoreDifference === 0));
});

test("weak-start action divergence fails the Peak invariance gate", () => {
    const rows = buildPassingRows();
    const target = rows.find((row) =>
        row.cohort === "peak" && row.arm === "strategy_both" && row.candidateStart === "37,73");
    target.actionSha256 = hex("7");
    const analysis = analyzeFreshDualRows(rows);
    assert.equal(analysis.gates.peak.checks.weakStartExact, false);
    assert.equal(analysis.gates.peak.passed, false);
});
