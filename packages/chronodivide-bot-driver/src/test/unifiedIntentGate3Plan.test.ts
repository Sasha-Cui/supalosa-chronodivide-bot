import { describe, expect, it } from "vitest";
import {
    buildUnifiedIntentGate3Plan,
    selectUnifiedIntentGate3Duplicates,
    UNIFIED_INTENT_GATE3_ARMS,
    UNIFIED_INTENT_GATE3_SEED_BASE,
    UnifiedIntentGate3Map,
    validateUnifiedIntentGate3Plan,
} from "../training/unifiedIntentGate3Plan.js";

const maps = (): UnifiedIntentGate3Map[] => Array.from(
    { length: 15 },
    (_, index) => ({
        id: "map-" + index,
        label: "Map " + index,
        fileName: "map-" + index + ".map",
        absolutePath: "/maps/map-" + index + ".map",
        sha256: index.toString(16).padStart(64, "0"),
        starts: [index + ",1", index + ",2"],
        advancedEligible: index < 10,
    }),
);

describe("unified intent Gate 3 plan", () => {
    it("builds 900 cases, 925 tasks, and 3,700 traces", () => {
        const plan = buildUnifiedIntentGate3Plan(maps());
        expect(plan.counts).toEqual({
            maps: 15,
            advancedMaps: 10,
            supalosaCases: 540,
            advancedCases: 360,
            cases: 900,
            duplicateTasks: 25,
            tasks: 925,
            arms: 4,
            traces: 3700,
            distinctSeeds: 900,
        });
        expect(plan.arms).toEqual(UNIFIED_INTENT_GATE3_ARMS);
        expect(plan.tasks.map((value) => value.taskIndex))
            .toEqual(Array.from({ length: 925 }, (_, index) => index));
    });

    it("uses disjoint sequential base seeds and shares them across four arms", () => {
        const plan = buildUnifiedIntentGate3Plan(maps());
        expect(plan.cases[0].requestedEngineSeed).toBe(UNIFIED_INTENT_GATE3_SEED_BASE);
        expect(plan.cases[899].requestedEngineSeed).toBe(UNIFIED_INTENT_GATE3_SEED_BASE + 899);
        expect(new Set(plan.cases.map((value) => value.requestedEngineSeed)).size).toBe(900);
        expect(plan.tasks.every((value) =>
            value.arms.map((arm) => arm.id).join("|") ===
                "disabled|ceiling_75|ceiling_150|ceiling_300")).toBe(true);
    });

    it("covers opponent, map, direction, country, and slot strata exactly", () => {
        const plan = buildUnifiedIntentGate3Plan(maps());
        const supalosa = plan.cases.filter((value) => value.opponent === "pinned_supalosa");
        const advanced = plan.cases.filter((value) => value.opponent === "ra2web_advanced");
        expect(supalosa).toHaveLength(540);
        expect(advanced).toHaveLength(360);
        for (const map of plan.maps) {
            expect(supalosa.filter((value) => value.mapId === map.id)).toHaveLength(36);
            expect(advanced.filter((value) => value.mapId === map.id))
                .toHaveLength(map.advancedEligible ? 36 : 0);
        }
        expect(new Set(plan.cases.map((value) => [
            value.opponent,
            value.mapId,
            value.directionOrdinal,
            value.country,
            value.candidateSlot,
        ].join("|"))).size).toBe(900);
    });

    it("selects exactly the frozen deterministic duplicate tasks", () => {
        const plan = buildUnifiedIntentGate3Plan(maps());
        expect(plan.duplicateBaseCaseIndices)
            .toEqual(selectUnifiedIntentGate3Duplicates(plan.cases));
        expect(new Set(plan.duplicateBaseCaseIndices).size).toBe(25);
        for (const task of plan.tasks.slice(900)) {
            expect(task.executionReplicateOrdinal).toBe(1);
            expect(task.duplicateOfTaskIndex).toBe(task.caseIndex);
            expect(task.requestedEngineSeed)
                .toBe(plan.cases[task.caseIndex].requestedEngineSeed);
        }
    });

    it("fails closed on duplicate or arm drift", () => {
        const plan = buildUnifiedIntentGate3Plan(maps());
        plan.tasks[900].requestedEngineSeed += 1;
        expect(() => validateUnifiedIntentGate3Plan(plan)).toThrow(/task identity/);
    });
});
