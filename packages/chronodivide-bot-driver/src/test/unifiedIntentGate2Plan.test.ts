import { describe, expect, it } from "vitest";
import {
    buildUnifiedIntentGate2Plan,
    UNIFIED_INTENT_GATE2_COUNTRIES,
    UNIFIED_INTENT_GATE2_SELECTED_BASE,
    UnifiedIntentGate2Map,
    validateUnifiedIntentGate2Plan,
} from "../training/unifiedIntentGate2Plan.js";

const maps = (): UnifiedIntentGate2Map[] => Array.from(
    { length: 5 },
    (_, index) => ({
        id: "map-" + index,
        label: "Map " + index,
        fileName: "map-" + index + ".map",
        absolutePath: "/maps/map-" + index + ".map",
        sha256: String(index).repeat(64),
        startA: index + ",1",
        startB: index + ",2",
        startAOrdinal: 0,
        startBOrdinal: 1,
    }),
);

describe("unified intent Gate 2 plan", () => {
    it("builds exactly 180 paired cases and 360 tasks", () => {
        const plan = buildUnifiedIntentGate2Plan(maps());
        expect(plan.counts).toEqual({
            maps: 5,
            directionsPerMap: 2,
            countries: 9,
            slots: 2,
            arms: 2,
            cases: 180,
            tasks: 360,
            distinctSeeds: 180,
        });
        expect(plan.countries).toEqual(UNIFIED_INTENT_GATE2_COUNTRIES);
        expect(plan.tasks.map((value) => value.taskIndex))
            .toEqual(Array.from({ length: 360 }, (_, index) => index));
        expect(new Set(plan.cases.map((value) => value.requestedEngineSeed)).size)
            .toBe(180);
    });

    it("shares one frozen seed only within each two-arm pair", () => {
        const plan = buildUnifiedIntentGate2Plan(maps());
        for (const value of plan.cases) {
            const pair = plan.tasks.filter((task) => task.caseIndex === value.caseIndex);
            expect(pair.map((task) => task.arm)).toEqual(["unwrapped", "disabled"]);
            expect(pair[0].requestedEngineSeed).toBe(pair[1].requestedEngineSeed);
            expect(pair[0].taskIndex).toBe(value.caseIndex * 2);
            expect(pair[1].taskIndex).toBe(value.caseIndex * 2 + 1);
        }
        expect(plan.cases[0]).toMatchObject({
            candidateStart: "0,1",
            opponentStart: "0,2",
            requestedEngineSeed: UNIFIED_INTENT_GATE2_SELECTED_BASE,
        });
        expect(plan.cases[18]).toMatchObject({
            directionOrdinal: 1,
            candidateStart: "0,2",
            opponentStart: "0,1",
            requestedEngineSeed: UNIFIED_INTENT_GATE2_SELECTED_BASE + 18,
        });
        expect(plan.cases[plan.cases.length - 1].requestedEngineSeed)
            .toBe(UNIFIED_INTENT_GATE2_SELECTED_BASE + 179);
    });

    it("covers every map, direction, country, and slot exactly once", () => {
        const plan = buildUnifiedIntentGate2Plan(maps());
        const strata = new Set(plan.cases.map((value) => [
            value.mapId,
            value.directionOrdinal,
            value.country,
            value.candidateSlot,
        ].join("|")));
        expect(strata.size).toBe(5 * 2 * 9 * 2);
        expect(new Set(plan.cases.map((value) => value.country)))
            .toEqual(new Set(UNIFIED_INTENT_GATE2_COUNTRIES));
    });

    it("fails closed on task or seed drift", () => {
        const plan = buildUnifiedIntentGate2Plan(maps());
        const task = plan.tasks[7];
        task.requestedEngineSeed += 1;
        expect(() => validateUnifiedIntentGate2Plan(plan)).toThrow(/pair drifted/);
    });
});
