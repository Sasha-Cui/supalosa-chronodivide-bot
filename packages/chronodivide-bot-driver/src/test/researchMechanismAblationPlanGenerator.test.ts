import { describe, expect, test } from "vitest";
import {
    buildMechanismAblationDesign,
    RESEARCH_MECHANISM_SHARD_COUNT,
} from "../training/researchMechanismAblationPlanGenerator.js";

const families = () => Array.from({ length: 10 }, (_, index) => `family_${String(index).padStart(2, "0")}`);

describe("post-confirmatory mechanism design", () => {
    test("allocates four fresh blocks to every development family", () => {
        const design = buildMechanismAblationDesign(families().reverse());
        expect(design).toHaveLength(RESEARCH_MECHANISM_SHARD_COUNT);
        expect(new Set(design.map(({ seedBlockIndex }) => seedBlockIndex)).size).toBe(40);
        expect(design.map(({ familyId }) => familyId)).toEqual([...design.map(({ familyId }) => familyId)].sort());
        for (const familyId of families()) {
            const rows = design.filter((row) => row.familyId === familyId);
            expect(rows).toHaveLength(4);
            expect(new Set(rows.map(({ seedOrdinal }) => seedOrdinal))).toEqual(new Set([0, 1, 2, 3]));
        }
    });

    test("fails closed without ten unique families", () => {
        expect(() => buildMechanismAblationDesign(families().slice(1))).toThrow(/exactly ten unique/);
        const duplicate = families();
        duplicate[9] = duplicate[0];
        expect(() => buildMechanismAblationDesign(duplicate)).toThrow(/exactly ten unique/);
    });
});
