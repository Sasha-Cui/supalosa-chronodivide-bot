import { describe, expect, it } from "vitest";
import {
    actionBurstDistribution,
    deriveActionBurstReserve,
    summarizeActionBurstEvents,
} from "../training/actionBurstTemporalSummary.js";
import { ActionBurstEvent } from "../training/timestampedActionAudit.js";

const event = (
    update: number,
    side: "candidate" | "baseline",
    method: string,
    argumentSha256: string,
    unitCount = 0,
): ActionBurstEvent => ({
    update,
    side,
    method: method as any,
    actionClass: method === "orderUnits" ? "order" : "gameplay_nonorder",
    argumentSha256,
    argumentBytes: 4,
    forwarded: true,
    order: method === "orderUnits" ? {
        unitCount,
        orderType: 3,
        overload: "no_target",
        orderedUnitIdsSha256: "b".repeat(64),
        targetAvailable: true,
    } : null,
});

describe("action-burst temporal summaries", () => {
    it("computes exact quarters, rolling windows, same-update pressure, and duplicates", () => {
        const events = [
            event(0, "candidate", "orderUnits", "a", 2),
            event(1, "candidate", "orderUnits", "a", 3),
            event(899, "candidate", "orderUnits", "a", 5),
            event(900, "candidate", "orderUnits", "a", 7),
            event(900, "candidate", "orderUnits", "a", 11),
            event(1799, "candidate", "queueForProduction", "q"),
            event(2700, "baseline", "queueForProduction", "z"),
        ];
        const rows = summarizeActionBurstEvents(events);
        expect(rows).toHaveLength(40);
        const all = rows.find((row) =>
            row.side === "candidate" && row.dimensionType === "all"
        )!;
        expect(all.calls).toBe(6);
        expect([all.quarter0, all.quarter1, all.quarter2, all.quarter3])
            .toEqual([3, 3, 0, 0]);
        expect(all.maxRolling900).toBe(4);
        expect(all.maxSameUpdate).toBe(2);
        expect(all.multiCallUpdates).toBe(1);
        expect(all.orderUnitIds).toBe(28);
        expect(all.maxRolling900OrderUnitIds).toBe(26);
        expect(all.duplicateSameUpdateFraction).toBe(1 / 6);
        expect(all.duplicateWithin30Fraction).toBe(3 / 6);
    });

    it("materializes zero rows for every method and class on both sides", () => {
        const rows = summarizeActionBurstEvents([]);
        expect(rows).toHaveLength(40);
        expect(rows.every((row) => row.calls === 0 && row.maxRolling900 === 0)).toBe(true);
    });

    it("derives the frozen maximum-plus-four reserve", () => {
        const rows = summarizeActionBurstEvents([
            event(0, "candidate", "queueForProduction", "a"),
            event(1, "candidate", "queueForProduction", "b"),
            event(2, "candidate", "queueForProduction", "c"),
            event(3, "candidate", "queueForProduction", "d"),
            event(4, "candidate", "queueForProduction", "e"),
        ]);
        expect(deriveActionBurstReserve(rows)).toEqual({
            maximumRollingGameplayNonorder: 5,
            protectedReserve: 9,
            smallestCeilingFeasible: true,
        });
    });

    it("uses linear quantiles and rejects invalid event times", () => {
        expect(actionBurstDistribution([1, 2, 3, 4])).toMatchObject({
            median: 2.5,
            q25: 1.75,
            q75: 3.25,
        });
        expect(() => summarizeActionBurstEvents([
            event(3_600, "candidate", "orderUnits", "a"),
        ])).toThrow(/update drifted/);
        expect(() => summarizeActionBurstEvents([
            event(2, "candidate", "orderUnits", "a"),
            event(1, "candidate", "orderUnits", "b"),
        ])).toThrow(/update drifted/);
    });
});
