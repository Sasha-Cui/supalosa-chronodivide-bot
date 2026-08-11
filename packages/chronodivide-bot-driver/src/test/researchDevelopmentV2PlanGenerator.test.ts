import { describe, expect, test } from "vitest";
import {
    buildDevelopmentV2Design,
    DevelopmentV2Target,
} from "../training/researchDevelopmentV2PlanGenerator.js";

const targets = (): DevelopmentV2Target[] => Array.from({ length: 11 }, (_, index) => ({
    familyId: `mf_${String(index).padStart(2, "0")}`,
    representative: { path: `map-${index}.map`, sha256: String(index).padStart(64, "0") },
    descriptors: {},
    poolSource: index < 4 ? "original-reserve" : "fidelity-review",
    diagnosticRole: index < 10 ? "primary" : "substitute",
    substituteOrder: index < 10 ? null : 1,
    rankSha256: String(index).padStart(64, "0"),
}));

describe("frozen method-v2 development design", () => {
    test("allocates the exact phase dimensions and fresh-process repeats", () => {
        const phase1 = buildDevelopmentV2Design("development-v2-phase1", targets());
        const phase2 = buildDevelopmentV2Design("development-v2-phase2", targets());
        const phase3 = buildDevelopmentV2Design(
            "development-v2-phase3",
            targets(),
            targets().slice(0, 10).map(({ familyId }) => familyId),
        );
        expect(phase1).toHaveLength(8);
        expect(new Set(phase1.map(({ familyId }) => familyId)).size).toBe(4);
        expect(new Set(phase1.map(({ freshProcessRepeat }) => freshProcessRepeat))).toEqual(new Set([0, 1]));
        expect(phase2).toHaveLength(22);
        expect(new Set(phase2.map(({ familyId }) => familyId)).size).toBe(11);
        expect(phase3).toHaveLength(80);
        expect(new Set(phase3.map(({ familyId }) => familyId)).size).toBe(10);
    });

    test("keeps phase seed blocks disjoint", () => {
        const active = targets().slice(0, 10).map(({ familyId }) => familyId);
        const blockSets = [
            buildDevelopmentV2Design("development-v2-phase1", targets()),
            buildDevelopmentV2Design("development-v2-phase2", targets()),
            buildDevelopmentV2Design("development-v2-phase3", targets(), active),
        ].map((rows) => new Set(rows.map(({ seedBlockIndex }) => seedBlockIndex)));
        expect([...blockSets[0]].every((value) => !blockSets[1].has(value) && !blockSets[2].has(value))).toBe(true);
        expect([...blockSets[1]].every((value) => !blockSets[2].has(value))).toBe(true);
    });

    test("fails closed without ten unique active phase-3 families", () => {
        expect(() => buildDevelopmentV2Design("development-v2-phase3", targets(), ["mf_00"])).toThrow(
            /exactly ten active/,
        );
        expect(() => buildDevelopmentV2Design(
            "development-v2-phase3",
            targets(),
            Array(10).fill("mf_00"),
        )).toThrow(/exactly ten active/);
    });
});
