import { describe, expect, it } from "vitest";
import {
    buildUnifiedIntentM2C1Plan,
    UNIFIED_INTENT_M2_C1_SEED_BASE,
    validateUnifiedIntentM2C1Plan,
} from "../training/unifiedIntentM2C1Plan.js";
import { UnifiedIntentGate3Map } from "../training/unifiedIntentGate3Plan.js";

const maps = (): UnifiedIntentGate3Map[] => Array.from({ length: 15 }, (_, index) => ({
    id: "map-" + index, label: "Map " + index, fileName: "map-" + index + ".map",
    absolutePath: "/maps/map-" + index + ".map",
    sha256: index.toString(16).padStart(64, "0"),
    starts: [index + ",1", index + ",2"], advancedEligible: index < 10,
}));

describe("unified intent M2 C1 plan", () => {
    it("builds 900 fresh ceiling-150 diagnostic cases over 25 families", () => {
        const plan = buildUnifiedIntentM2C1Plan(maps());
        expect(plan.counts).toEqual({
            maps: 15, advancedMaps: 10, families: 25, supalosaCases: 540,
            advancedCases: 360, cases: 900, tasks: 900, games: 900,
            distinctSeeds: 900,
        });
        expect(new Set(plan.cases.map((value) => value.familyId)).size).toBe(25);
        expect(plan.cases.every((value) => value.arm.id === "ceiling_150")).toBe(true);
    });

    it("uses the exact fresh seed interval and full stratum crossing", () => {
        const plan = buildUnifiedIntentM2C1Plan(maps());
        expect(plan.cases[0].requestedEngineSeed).toBe(UNIFIED_INTENT_M2_C1_SEED_BASE);
        expect(plan.cases[899].requestedEngineSeed).toBe(UNIFIED_INTENT_M2_C1_SEED_BASE + 899);
        expect(new Set(plan.cases.map((value) => [
            value.opponent, value.mapId, value.directionOrdinal,
            value.country, value.candidateSlot,
        ].join("|"))).size).toBe(900);
    });

    it("fails closed on case drift", () => {
        const plan = buildUnifiedIntentM2C1Plan(maps());
        plan.cases[4].requestedEngineSeed += 1;
        expect(() => validateUnifiedIntentM2C1Plan(plan)).toThrow(/coverage|case/);
    });
});
