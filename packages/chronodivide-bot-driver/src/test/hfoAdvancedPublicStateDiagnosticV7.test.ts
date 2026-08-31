import { describe, expect, it } from "vitest";
import { HFO_ADVANCED_V7_ARMS, HFO_ADVANCED_V7_COUNTRIES, HFO_ADVANCED_V7_SPEC,
    V7_LEGACY_SELECTION_SHA256, actionableWindow, assertOutcomeFreeSelection, classificationAnalysis,
    extractV7DevelopmentCases } from "../training/hfoAdvancedPublicStateDiagnosticV7.js";

const legacySelection = () => {
    const cases: any[] = []; let populationCaseIndex = 0;
    for (const [countryOrdinal, country] of HFO_ADVANCED_V7_COUNTRIES.entries())
        for (const candidateSlot of [0, 1] as const) for (let repeatIndex = 0; repeatIndex < 2; repeatIndex += 1)
            cases.push({ globalCaseIndex: cases.length, populationId: "development", populationCaseIndex: populationCaseIndex++,
                countryOrdinal, country, startOrdinal: 0, desiredStart: "39,82", desiredOppositeStart: "151,119",
                candidateSlot, repeatIndex, seedOffset: repeatIndex, requestedEngineSeed:
                    4_278_000_000 + countryOrdinal * 10_000 + candidateSlot * 100 + repeatIndex,
                candidateStart: "39,82", opponentStart: "151,119" });
    for (let index = 0; index < 432; index += 1) cases.push({ populationId: "validation", index });
    return { kind: "hfo-advanced-v6-competitive-selection", complete: true, passed: true,
        outcomeFree: true, updateCount: 0, forbiddenOutcomeFields: [], cases };
};

const diagnosticRow = (viable: boolean, index: number) => ({ winner: "opponent", armId: "external_supalosa",
    country: HFO_ADVANCED_V7_COUNTRIES[index % 9], candidateSlot: index % 2, publicSnapshots: [{ update: 3_600,
        candidateCredits: viable ? 500 : 0, own: { buildings: viable ? 4 : 0, combatants: viable ? 3 : 0,
            byRole: viable ? { war_factory: 1 } : {} } }] });

describe("HFO Advanced V7 public-state diagnostic design", () => {
    it("freezes the exact arms, counts, horizons, and legacy identity", () => {
        expect(HFO_ADVANCED_V7_ARMS).toEqual(["external_supalosa", "deployed_strongbot"]);
        expect(HFO_ADVANCED_V7_COUNTRIES).toHaveLength(9);
        expect(HFO_ADVANCED_V7_SPEC).toEqual({ caseCount: 36, armCount: 2, taskCount: 72,
            snapshotInterval: 300, snapshotHorizon: 30_000, maxUpdates: 90_000 });
        expect(V7_LEGACY_SELECTION_SHA256).toBe(
            "9e2945997fe49d8f8677acc8287b416408f19e2a4175bd7ff2a53e86fc5b8402");
    });

    it("extracts only the balanced consumed development cases", () => {
        const cases = extractV7DevelopmentCases(legacySelection());
        expect(cases).toHaveLength(36);
        expect(new Set(cases.map((row) => row.populationCaseIndex)).size).toBe(36);
        for (const country of HFO_ADVANCED_V7_COUNTRIES) for (const slot of [0, 1] as const)
            expect(cases.filter((row) => row.country === country && row.candidateSlot === slot)).toHaveLength(2);
        expect(cases.every((row) => row.populationId === "development" && row.candidateStart === "39,82" &&
            row.opponentStart === "151,119")).toBe(true);
    });

    it("rejects outcome-bearing selection content recursively", () => {
        expect(() => assertOutcomeFreeSelection({ cases: [{ nested: { winner: "candidate" } }] }))
            .toThrow("prohibited selection key");
        expect(() => extractV7DevelopmentCases({ ...legacySelection(), score: 1 })).toThrow("prohibited selection key");
    });

    it("requires a broadly viable pre-collapse action window", () => {
        const viable = Array.from({ length: 24 }, (_, index) => diagnosticRow(true, index)) as any,
            collapsed = Array.from({ length: 24 }, (_, index) => diagnosticRow(false, index)) as any;
        expect(actionableWindow(viable).selected?.tick).toBe(3_600);
        expect(actionableWindow(viable).passed).toBe(true);
        expect(actionableWindow(collapsed).passed).toBe(false);
    });

    it("fits deterministic grouped public-feature stumps only after labels are joined", () => {
        const rows = Array.from({ length: 36 }, (_, index) => {
            const winner = index % 2 === 0 ? "candidate" : "opponent",
                candidateCredits = winner === "candidate" ? 9_000 : 1_000;
            return { winner, country: HFO_ADVANCED_V7_COUNTRIES[index % 9], candidateSlot: Math.floor(index / 2) % 2,
                publicSnapshots: [{ update: 1_200, candidateCredits, opponentCreditsPublic: 5_000,
                    own: { combatants: 8, buildings: 6, byRole: { war_factory: 1, barracks: 1, harvester: 2 } },
                    visibleEnemy: { combatants: 4 }, visibleThreatsNearProduction: { "16": 1 },
                    ownCombatantRegions: { home: 4, midfield: 2, opponentBase: 2 } }] };
        }) as any;
        const result = classificationAnalysis(rows);
        expect(result.treeDepth).toBe(1);
        expect(result.outcomeJoinedOnlyAfterCompleteAggregate).toBe(true);
        expect(result.byTick[0].leaveCountryOut.rows).toBe(36);
        expect(result.byTick[0].leaveCountryOut.balancedAccuracy).toBe(1);
        expect(result.byTick[0].leaveSlotOut.balancedAccuracy).toBe(1);
        expect(result.earliestPredictiveTick).toBe(1_200);
    });
});
