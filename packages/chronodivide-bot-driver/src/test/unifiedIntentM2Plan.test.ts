import { describe, expect, it } from "vitest";
import {
    buildUnifiedIntentM2Plan,
    UNIFIED_INTENT_M2_SEED_BASE,
    validateUnifiedIntentM2Plan,
} from "../training/unifiedIntentM2Plan.js";
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

describe("unified intent M2 plan", () => {
    it("builds 900 paired cases and 1,800 games over 25 families", () => {
        const plan = buildUnifiedIntentM2Plan(maps());
        expect(plan.counts).toEqual({
            maps: 15, advancedMaps: 10, families: 25, supalosaCases: 540,
            advancedCases: 360, cases: 900, tasks: 900, arms: 2, games: 1800,
            distinctSeeds: 900,
        });
        expect(new Set(plan.cases.map((value) => value.familyId)).size).toBe(25);
    });

    it("uses fresh paired seeds and only disabled versus ceiling 150", () => {
        const plan = buildUnifiedIntentM2Plan(maps());
        expect(plan.cases[0].requestedEngineSeed).toBe(UNIFIED_INTENT_M2_SEED_BASE);
        expect(plan.cases[899].requestedEngineSeed).toBe(UNIFIED_INTENT_M2_SEED_BASE + 899);
        expect(plan.cases.every((value) =>
            value.arms.map((arm) => arm.id).join("|") === "disabled|ceiling_150")).toBe(true);
    });

    it("covers every opponent-map-country-direction-slot stratum", () => {
        const plan = buildUnifiedIntentM2Plan(maps());
        expect(plan.cases.filter((value) => value.opponent === "pinned_supalosa"))
            .toHaveLength(540);
        expect(plan.cases.filter((value) => value.opponent === "ra2web_advanced"))
            .toHaveLength(360);
        expect(new Set(plan.cases.map((value) => [
            value.opponent, value.mapId, value.directionOrdinal,
            value.country, value.candidateSlot,
        ].join("|"))).size).toBe(900);
    });

    it("fails closed on case drift", () => {
        const plan = buildUnifiedIntentM2Plan(maps());
        plan.cases[0].maxUpdates -= 1;
        expect(() => validateUnifiedIntentM2Plan(plan)).toThrow(/case/);
    });
});
