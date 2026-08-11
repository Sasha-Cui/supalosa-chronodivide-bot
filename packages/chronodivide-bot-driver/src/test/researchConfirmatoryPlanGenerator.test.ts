import { describe, expect, test } from "vitest";
import {
    buildConfirmatoryDesign,
    ConfirmatoryTarget,
    RESEARCH_CONFIRMATORY_BLOCKS_PER_FAMILY,
    RESEARCH_CONFIRMATORY_FAMILY_COUNT,
    RESEARCH_CONFIRMATORY_SHARD_COUNT,
} from "../training/researchConfirmatoryPlanGenerator.js";

const targets = (): ConfirmatoryTarget[] => Array.from(
    { length: RESEARCH_CONFIRMATORY_FAMILY_COUNT },
    (_, index) => ({
        familyId: `test_family_${String(index).padStart(2, "0")}`,
        representative: { path: `map-${index}.map`, sha256: index.toString(16).padStart(64, "0") },
        descriptors: {},
    }),
);

describe("frozen confirmatory design", () => {
    test("allocates all families to eight unique blocks without identity-dependent selection", () => {
        const design = buildConfirmatoryDesign(targets().reverse());
        expect(design).toHaveLength(RESEARCH_CONFIRMATORY_SHARD_COUNT);
        expect(new Set(design.map(({ familyId }) => familyId)).size).toBe(RESEARCH_CONFIRMATORY_FAMILY_COUNT);
        expect(new Set(design.map(({ seedBlockIndex }) => seedBlockIndex)).size).toBe(RESEARCH_CONFIRMATORY_SHARD_COUNT);
        expect(new Set(design.map(({ familyRank }) => familyRank))).toEqual(
            new Set(Array.from({ length: RESEARCH_CONFIRMATORY_FAMILY_COUNT }, (_, index) => index)),
        );
        for (const familyId of new Set(design.map(({ familyId }) => familyId))) {
            const family = design.filter((row) => row.familyId === familyId);
            expect(family).toHaveLength(RESEARCH_CONFIRMATORY_BLOCKS_PER_FAMILY);
            expect(new Set(family.map(({ seedOrdinal }) => seedOrdinal))).toEqual(new Set([0, 1, 2, 3, 4, 5, 6, 7]));
        }
    });

    test("is invariant to private-manifest ordering", () => {
        expect(buildConfirmatoryDesign(targets().reverse())).toEqual(buildConfirmatoryDesign(targets()));
    });

    test("fails closed unless all sixteen family identities are unique", () => {
        expect(() => buildConfirmatoryDesign(targets().slice(1))).toThrow(/exactly sixteen unique/);
        const duplicated = targets();
        duplicated[15] = { ...duplicated[0] };
        expect(() => buildConfirmatoryDesign(duplicated)).toThrow(/exactly sixteen unique/);
    });
});
