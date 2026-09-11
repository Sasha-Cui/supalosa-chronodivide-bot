import { describe, expect, it } from "vitest";
import {
    buildUnifiedIntentGate3B1Plan,
    selectUnifiedIntentGate3B1Duplicates,
    UNIFIED_INTENT_GATE3_B1_ARMS,
    UNIFIED_INTENT_GATE3_B1_SEED_BASE,
    validateUnifiedIntentGate3B1Plan,
} from "../training/unifiedIntentGate3B1Plan.js";
import { UnifiedIntentGate3Map } from "../training/unifiedIntentGate3Plan.js";

const maps = (): UnifiedIntentGate3Map[] => Array.from({ length: 15 }, (_, index) => ({
    id: "map-" + index,
    label: "Map " + index,
    fileName: "map-" + index + ".map",
    absolutePath: "/maps/map-" + index + ".map",
    sha256: index.toString(16).padStart(64, "0"),
    starts: [index + ",1", index + ",2"],
    advancedEligible: index < 10,
}));

describe("unified intent Gate 3 B1 plan", () => {
    it("builds 900 cases, 925 tasks, and 1,850 traces", () => {
        const plan = buildUnifiedIntentGate3B1Plan(maps());
        expect(plan.counts).toEqual({
            maps: 15, advancedMaps: 10, supalosaCases: 540, advancedCases: 360,
            cases: 900, duplicateTasks: 25, tasks: 925, arms: 2, traces: 1850,
            distinctSeeds: 900,
        });
        expect(plan.arms).toEqual(UNIFIED_INTENT_GATE3_B1_ARMS);
    });

    it("uses fresh sequential seeds shared by disabled and ceiling 150", () => {
        const plan = buildUnifiedIntentGate3B1Plan(maps());
        expect(plan.cases[0].requestedEngineSeed).toBe(UNIFIED_INTENT_GATE3_B1_SEED_BASE);
        expect(plan.cases[899].requestedEngineSeed).toBe(UNIFIED_INTENT_GATE3_B1_SEED_BASE + 899);
        expect(plan.tasks.every((value) =>
            value.arms.map((arm) => arm.id).join("|") === "disabled|ceiling_150")).toBe(true);
    });

    it("covers both opponents and every frozen stratum", () => {
        const plan = buildUnifiedIntentGate3B1Plan(maps());
        expect(plan.cases.filter((value) => value.opponent === "pinned_supalosa"))
            .toHaveLength(540);
        expect(plan.cases.filter((value) => value.opponent === "ra2web_advanced"))
            .toHaveLength(360);
        expect(new Set(plan.cases.map((value) => [
            value.opponent, value.mapId, value.directionOrdinal,
            value.country, value.candidateSlot,
        ].join("|"))).size).toBe(900);
    });

    it("selects exactly 25 domain-separated deterministic duplicates", () => {
        const plan = buildUnifiedIntentGate3B1Plan(maps());
        expect(plan.duplicateBaseCaseIndices)
            .toEqual(selectUnifiedIntentGate3B1Duplicates(plan.cases));
        expect(new Set(plan.duplicateBaseCaseIndices).size).toBe(25);
    });

    it("fails closed on task drift", () => {
        const plan = buildUnifiedIntentGate3B1Plan(maps());
        plan.tasks[900].requestedEngineSeed += 1;
        expect(() => validateUnifiedIntentGate3B1Plan(plan)).toThrow(/task/);
    });
});
