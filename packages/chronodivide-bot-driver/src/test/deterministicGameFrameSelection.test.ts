import crypto from "node:crypto";
import { describe, expect, it } from "vitest";

import { selectDeterministicFrameCases } from "../training/deterministicGameFrameSelection.js";

const HFO_SOURCE = "f8d5a9961a6e1dd2746cd5c03b6b0793ba73ba02";
const PEAK_SOURCE = "8c73a32a18e04500dc7c52a83264460c01a13f66";
const BASELINE = "165b77a71d0cf5ebd27c65b19d0486bcbae78d0f";

const digest = (value: string): string => crypto.createHash("sha256").update(value).digest("hex");

const hfoAggregate = () => {
    const rows = Array.from({ length: 720 }, (_, taskIndex) => {
        const win = taskIndex < 633;
        const tickCap = taskIndex >= 633 && taskIndex < 637;
        return {
            taskIndex,
            caseIndex: taskIndex,
            country: `Country${taskIndex % 9}`,
            candidateStart: ["39,82", "151,119", "88,34", "88,157"][taskIndex % 4],
            candidateSlot: taskIndex % 2,
            requestedEngineSeed: 4_260_000_000 + taskIndex,
            winner: win ? "candidate" : tickCap ? "draw" : "baseline",
            status: win ? "candidate_win" : tickCap ? "tick_cap_draw" : "baseline_win",
            ticks: tickCap ? 90_000 : 20_000 + taskIndex,
            terminalBuildingCounts: { candidate: win ? 4 : 0, baseline: win ? 0 : 4 },
        };
    });
    return {
        kind: "hfo-deployed-confirmatory-finalizer",
        complete: true,
        passed: true,
        sourceCommit: HFO_SOURCE,
        baselineCommit: BASELINE,
        launchedGameCount: 720,
        overall: { wins: 633, draws: 24, losses: 63 },
        rows,
        schedulerJobIds: rows.map((row) => String(10_000 + row.taskIndex)),
    };
};

const peakAggregate = () => {
    const controls = Array.from({ length: 180 }, (_, populationCaseIndex) => ({
        taskIndex: populationCaseIndex,
        populationCaseIndex,
        armId: "deployed",
        country: `Country${populationCaseIndex % 9}`,
        candidateStart: populationCaseIndex < 90 ? "118,73" : "37,73",
        candidateSlot: populationCaseIndex % 2,
        requestedEngineSeed: 4_282_000_000 + populationCaseIndex,
        winner: populationCaseIndex % 3 === 0 ? "first" : "opponent",
    }));
    const candidates = controls.map((control) => ({
        ...control,
        taskIndex: control.taskIndex + 180,
        armId: "strategy_both",
        winner: control.populationCaseIndex % 5 === 0 ? "opponent" : "first",
    }));
    const rows = [...controls, ...candidates];
    return {
        kind: "peak-profile-scope-stage",
        stageIndex: 1,
        complete: true,
        passed: true,
        sourceCommit: PEAK_SOURCE,
        baselineCommit: BASELINE,
        launchedGameCount: 360,
        candidates: [{ id: "strategy_both", eligible: true,
            overall: { wins: 134, draws: 14, losses: 32 } }],
        rows,
        schedulerJobIds: rows.map((row) => String(20_000 + row.taskIndex)),
    };
};

describe("deterministic game-frame selection", () => {
    it("selects the lexicographically smallest registered hashes", () => {
        const hfo = hfoAggregate();
        const peak = peakAggregate();
        const selections = selectDeterministicFrameCases(
            hfo,
            peak,
            "/evidence/hfo/finalizer/hfo.json",
            "/evidence/peak/finalizer/peak.json",
        );
        expect(selections.map((row) => row.category)).toEqual([
            "peak_reciprocal", "hfo_final_building", "hfo_force_clearance", "hfo_tick_cap",
        ]);

        const reciprocal = peak.rows.filter((row: any) =>
            row.armId === "strategy_both" && row.candidateStart === "118,73").map((row: any) => {
            const paired = peak.rows[row.populationCaseIndex];
            const input = ["peak-reciprocal", row.country, row.candidateStart, row.candidateSlot,
                row.requestedEngineSeed, peak.schedulerJobIds[paired.taskIndex],
                peak.schedulerJobIds[row.taskIndex]].join("|");
            return { taskIndex: row.taskIndex, hash: digest(input) };
        }).sort((left, right) => left.hash.localeCompare(right.hash))[0];
        expect(selections[0].taskIndex).toBe(reciprocal.taskIndex);
        expect(selections[0].selectionSha256).toBe(reciprocal.hash);

        const wins = hfo.rows.filter((row: any) => row.winner === "candidate").map((row: any) => {
            const input = ["hfo-final-building", row.country, row.candidateStart, row.candidateSlot,
                row.requestedEngineSeed, hfo.schedulerJobIds[row.taskIndex]].join("|");
            return { taskIndex: row.taskIndex, hash: digest(input) };
        }).sort((left, right) => left.hash.localeCompare(right.hash))[0];
        expect(selections[1].taskIndex).toBe(wins.taskIndex);
        expect(selections[2].taskIndex).toBe(wins.taskIndex);
        expect(selections[2].status).toBe("same_case_pending_event");
    });

    it("does not use Peak outcome when selecting the reciprocal case", () => {
        const hfo = hfoAggregate();
        const peak = peakAggregate();
        const first = selectDeterministicFrameCases(hfo, peak, "/h/finalizer/a.json", "/p/finalizer/b.json");
        for (const row of peak.rows) row.winner = row.winner === "first" ? "opponent" : "first";
        const second = selectDeterministicFrameCases(hfo, peak, "/h/finalizer/a.json", "/p/finalizer/b.json");
        expect(second[0].selectionSha256).toBe(first[0].selectionSha256);
        expect(second[0].taskIndex).toBe(first[0].taskIndex);
    });

    it("fails closed when a frozen population count drifts", () => {
        const hfo = hfoAggregate();
        const peak = peakAggregate();
        peak.rows = peak.rows.slice(1);
        expect(() => selectDeterministicFrameCases(hfo, peak, "/h/finalizer/a.json", "/p/finalizer/b.json"))
            .toThrow("Peak frame aggregate is ineligible");
    });
});
