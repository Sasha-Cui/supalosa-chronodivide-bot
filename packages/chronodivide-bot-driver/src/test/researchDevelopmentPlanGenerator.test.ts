import { describe, expect, test } from "vitest";
import {
    buildDevelopmentShardDesign,
    DevelopmentTarget,
    validatePriorTechnicalGate,
} from "../training/researchDevelopmentPlanGenerator.js";

const target = (
    familyId: string,
    diagnosticRole: "primary" | "substitute",
    substituteOrder: number | null,
): DevelopmentTarget => ({
    familyId,
    representative: {
        path: `private/${familyId}.map`,
        sha256: familyId.padEnd(64, "0").slice(0, 64),
    },
    descriptors: {
        area: 16_384,
        width: 128,
        height: 128,
        startCount: 2,
    },
    diagnosticRole,
    substituteOrder,
});

const targets = (): DevelopmentTarget[] => [
    ...Array.from({ length: 10 }, (_, index) => target(`mf_primary_${index}`, "primary", null)),
    target("mf_substitute_1", "substitute", 1),
    target("mf_substitute_2", "substitute", 2),
];

const optimizerRuns = [0, 1, 2, 3, 4];

describe("frozen development diagnostic design", () => {
    test("allocates phase 1 as sixteen fresh-process four-game shards", () => {
        const design = buildDevelopmentShardDesign("development-phase1", targets(), optimizerRuns);
        expect(design).toHaveLength(16);
        expect(new Set(design.map(({ familyId }) => familyId))).toHaveLength(4);
        expect(new Set(design.map(({ optimizerRunIndex }) => optimizerRunIndex))).toHaveLength(2);
        expect(new Set(design.map(({ freshProcessRepeat }) => freshProcessRepeat))).toEqual(new Set([0, 1]));
        for (const familyId of new Set(design.map((row) => row.familyId))) {
            expect(new Set(
                design.filter((row) => row.familyId === familyId).map(({ seedBlockIndex }) => seedBlockIndex),
            )).toHaveLength(1);
        }
    });

    test("allocates phase 2 across all families with one run and two new seeds", () => {
        const design = buildDevelopmentShardDesign("development-phase2", targets(), optimizerRuns);
        expect(design).toHaveLength(24);
        expect(new Set(design.map(({ familyId }) => familyId))).toHaveLength(12);
        expect(new Set(design.map(({ optimizerRunIndex }) => optimizerRunIndex))).toHaveLength(1);
        expect(design.filter(({ familyId }) => familyId.startsWith("mf_substitute_"))).toHaveLength(4);
        for (const familyId of new Set(design.map((row) => row.familyId))) {
            expect(new Set(
                design.filter((row) => row.familyId === familyId).map(({ seedBlockIndex }) => seedBlockIndex),
            )).toHaveLength(2);
        }
    });

    test("allocates phase 3 across ten primaries, five runs, and four shared seeds", () => {
        const design = buildDevelopmentShardDesign("development-phase3", targets(), optimizerRuns);
        expect(design).toHaveLength(200);
        expect(new Set(design.map(({ familyId }) => familyId))).toHaveLength(10);
        expect(design.some(({ familyId }) => familyId.startsWith("mf_substitute_"))).toBe(false);
        expect(new Set(design.map(({ optimizerRunIndex }) => optimizerRunIndex))).toEqual(new Set(optimizerRuns));
        for (const familyId of new Set(design.map((row) => row.familyId))) {
            const familyRows = design.filter((row) => row.familyId === familyId);
            expect(new Set(familyRows.map(({ seedBlockIndex }) => seedBlockIndex))).toHaveLength(4);
            for (const optimizerRunIndex of optimizerRuns) {
                expect(familyRows.filter((row) => row.optimizerRunIndex === optimizerRunIndex)).toHaveLength(4);
            }
        }
    });

    test("is deterministic and fails closed on role or optimizer-run drift", () => {
        expect(buildDevelopmentShardDesign("development-phase1", targets(), optimizerRuns)).toEqual(
            buildDevelopmentShardDesign("development-phase1", targets(), optimizerRuns),
        );
        expect(() => buildDevelopmentShardDesign(
            "development-phase1",
            targets().slice(1),
            optimizerRuns,
        )).toThrow(/ten primary and two unique substitute/);
        expect(() => buildDevelopmentShardDesign(
            "development-phase1",
            targets(),
            [0, 1, 2, 3, 5],
        )).toThrow(/runs 0,1,2,3,4/);
    });
    test("requires the exact prior technical gate before later phases", () => {
        const gate = {
            schemaVersion: 1,
            status: "PASSED_TECHNICAL_ONLY_NO_OUTCOMES_INSPECTED",
            phase: "development-phase1",
            authorizedNextPhase: "development-phase2",
            schedulerAccount: "pi_jss233",
            requestedLaunches: 64,
            accountedLaunches: 64,
            technicalFailures: 0,
            sealedSummaryViolations: 0,
            repeatIdentityPassed: true,
            outcomeFieldsEmitted: [],
        };
        expect(validatePriorTechnicalGate(
            "development-phase2",
            gate,
            "/private/phase1-technical-gate.json",
            "0".repeat(64),
        )).toMatchObject({
            phase: "development-phase1",
            authorizedNextPhase: "development-phase2",
        });
        expect(() => validatePriorTechnicalGate(
            "development-phase2",
            { ...gate, outcomeFieldsEmitted: ["candidateWins"] },
            "/private/phase1-technical-gate.json",
            "0".repeat(64),
        )).toThrow(/does not authorize/);
        expect(() => validatePriorTechnicalGate(
            "development-phase3",
            gate,
            "/private/phase1-technical-gate.json",
            "0".repeat(64),
        )).toThrow(/does not authorize/);
        expect(() => validatePriorTechnicalGate(
            "development-phase1",
            gate,
            "",
            "",
        )).toThrow(/must not inherit/);
    });
});
