import { describe, expect, it } from "vitest";
import {
    ACTION_BURST_COUNTRIES,
    ACTION_BURST_SELECTED_INTERVAL,
    buildActionBurstDiagnosticPlan,
    validateActionBurstDiagnosticPlan,
} from "../training/actionBurstDiagnosticPlan.js";

const counts = [4, 2, 8, 6, 4, 4, 4, 2, 2, 2, 2, 6, 4, 2, 4];
const ids = [
    "hfo-le", "peak", "hfo-original", "hfo-golden", "hfo-corners",
    "hfo-corners-b", "hfo-corners-b-golden", "hfo-bvb", "hfo-lvl",
    "hfo-rvr", "hfo-tvt", "tour-of-egypt", "south-pacific",
    "south-pacific-2", "pacific-heights",
];
const maps = ids.map((id, index) => ({
    id,
    label: id,
    fileName: id + ".map",
    absolutePath: "/maps/" + id + ".map",
    sha256: String(index).padStart(64, "0"),
    startCount: counts[index],
    family: id.startsWith("hfo-") ? "hfo" : id,
    starts: Array.from({ length: counts[index] }, (_, start) => index + "," + start),
}));

describe("action-burst diagnostic plan", () => {
    it("builds the complete frozen population and seed multiplicities", () => {
        const plan = buildActionBurstDiagnosticPlan(maps);
        expect(validateActionBurstDiagnosticPlan(plan)).toBe(true);
        expect(plan.traces).toHaveLength(1_717);
        expect(plan.traces.filter((trace) => trace.executionReplicateOrdinal === 0))
            .toHaveLength(1_692);
        expect(plan.traces.filter((trace) => trace.executionReplicateOrdinal === 1))
            .toHaveLength(25);
        expect(new Set(plan.traces.map((trace) => trace.requestedEngineSeed)).size).toBe(846);
        expect(plan.selectedInterval).toEqual([...ACTION_BURST_SELECTED_INTERVAL]);
    });

    it("covers every map, country, start, and reciprocal slot", () => {
        const plan = buildActionBurstDiagnosticPlan(maps);
        const base = plan.traces.filter((trace) => trace.executionReplicateOrdinal === 0);
        for (const map of maps) {
            const rows = base.filter((trace) =>
                trace.opponent === "pinned_supalosa" && trace.mapId === map.id
            );
            expect(rows).toHaveLength(9 * map.startCount * 2);
            expect(new Set(rows.map((trace) => trace.country))).toEqual(
                new Set(ACTION_BURST_COUNTRIES),
            );
            expect(new Set(rows.map((trace) => trace.candidateStartOrdinal)).size)
                .toBe(map.startCount);
            expect(new Set(rows.map((trace) => trace.candidateSlot))).toEqual(new Set([0, 1]));
        }
    });

    it("duplicates exact base seeds and configurations", () => {
        const plan = buildActionBurstDiagnosticPlan(maps);
        for (const duplicate of plan.traces.filter(
            (trace) => trace.executionReplicateOrdinal === 1,
        )) {
            const base = plan.traces[duplicate.duplicateOfTaskIndex!];
            expect({
                opponent: duplicate.opponent,
                mapId: duplicate.mapId,
                country: duplicate.country,
                candidateStart: duplicate.candidateStart,
                opponentStart: duplicate.opponentStart,
                candidateSlot: duplicate.candidateSlot,
                requestedEngineSeed: duplicate.requestedEngineSeed,
            }).toEqual({
                opponent: base.opponent,
                mapId: base.mapId,
                country: base.country,
                candidateStart: base.candidateStart,
                opponentStart: base.opponentStart,
                candidateSlot: base.candidateSlot,
                requestedEngineSeed: base.requestedEngineSeed,
            });
        }
    });

    it("rejects a changed seed, count, or scientific field", () => {
        const changedSeed = buildActionBurstDiagnosticPlan(maps);
        changedSeed.traces[0].requestedEngineSeed += 1;
        expect(() => validateActionBurstDiagnosticPlan(changedSeed)).toThrow(/seed multiplicity|trace map\/seed|duplicate/);

        const changedCount = buildActionBurstDiagnosticPlan(maps);
        changedCount.traces.pop();
        expect(() => validateActionBurstDiagnosticPlan(changedCount)).toThrow(/header/);

        const changedInterval = buildActionBurstDiagnosticPlan(maps);
        changedInterval.selectedInterval[0] += 1;
        expect(() => validateActionBurstDiagnosticPlan(changedInterval)).toThrow(/header/);

        const prohibited: any = buildActionBurstDiagnosticPlan(maps);
        prohibited.winner = "candidate";
        expect(() => validateActionBurstDiagnosticPlan(prohibited)).toThrow(/Prohibited/);
    });
});
