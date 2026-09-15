import { describe, expect, it } from "vitest";
import {
    buildUnifiedIntentV2Gate2Plan,
    selectUnifiedIntentV2Gate2Duplicates,
    UNIFIED_INTENT_V2_GATE2_SEED_BASE,
    validateUnifiedIntentV2Gate2Plan,
} from "../training/unifiedIntentV2Gate2Plan.js";
import { UnifiedIntentGate3Map } from "../training/unifiedIntentGate3Plan.js";

const maps = (): UnifiedIntentGate3Map[] => Array.from({ length: 15 }, (_, index) => ({
    id: "map-" + index, label: "Map " + index, fileName: "map-" + index + ".map",
    absolutePath: "/maps/map-" + index + ".map",
    sha256: index.toString(16).padStart(64, "0"), starts: [index + ",1", index + ",2"],
    advancedEligible: index < 10,
}));

describe("unified intent V2 Gate 2 plan", () => {
    it("builds 900 fresh cases and 925 one-arm tasks over 25 families", () => {
        const plan = buildUnifiedIntentV2Gate2Plan(maps());
        expect(plan.counts).toEqual({
            maps: 15, advancedMaps: 10, families: 25, supalosaCases: 540,
            advancedCases: 360, cases: 900, duplicateTasks: 25, tasks: 925,
            episodes: 925, distinctSeeds: 900,
        });
        expect(plan.arm).toEqual({
            id: "separated_lanes_v2", enabled: true,
            budgetMode: "separated_lanes_v2", commandCeiling: 115,
        });
    });

    it("uses the exact seed range and full stratum crossing", () => {
        const plan = buildUnifiedIntentV2Gate2Plan(maps());
        expect(plan.cases[0].requestedEngineSeed).toBe(UNIFIED_INTENT_V2_GATE2_SEED_BASE);
        expect(plan.cases[899].requestedEngineSeed).toBe(UNIFIED_INTENT_V2_GATE2_SEED_BASE + 899);
        expect(new Set(plan.cases.map((value) => [
            value.opponent, value.mapId, value.directionOrdinal,
            value.country, value.candidateSlot,
        ].join("|"))).size).toBe(900);
    });

    it("selects exactly 25 domain-separated duplicates", () => {
        const plan = buildUnifiedIntentV2Gate2Plan(maps());
        expect(plan.duplicateBaseCaseIndices)
            .toEqual(selectUnifiedIntentV2Gate2Duplicates(plan.cases));
        expect(new Set(plan.duplicateBaseCaseIndices).size).toBe(25);
    });

    it("fails closed on task drift", () => {
        const plan = buildUnifiedIntentV2Gate2Plan(maps());
        plan.tasks[900].requestedEngineSeed += 1;
        expect(() => validateUnifiedIntentV2Gate2Plan(plan)).toThrow(/task/);
    });
});
