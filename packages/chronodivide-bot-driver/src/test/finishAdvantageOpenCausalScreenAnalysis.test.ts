import { Countries } from "@supalosa/chronodivide-bot/dist/bot/logic/common/utils.js";
import { describe, expect, it } from "vitest";
import {
    FINISH_ADVANTAGE_OPEN_CAUSAL_SCREEN_COUNTRIES,
    FinishAdvantageOpenArm,
    FinishAdvantageOpenArmId,
    FinishAdvantageOpenOutcome,
    FinishAdvantageOpenOutcomeRow,
    buildFinishAdvantageOpenArms,
    compareFinishAdvantageOpenArms,
    deriveFinishAdvantageOpenSeed,
    evaluateFinishAdvantageOpenCandidate,
    selectFinishAdvantageOpenCandidate,
    summarizeFinishAdvantageOpenAbsoluteRates,
} from "../training/finishAdvantageOpenCausalScreenAnalysis.js";

const families = Array.from({ length: 10 }, (_, index) => `family-${index}`);
const rows = (
    armId: FinishAdvantageOpenArmId,
    outcome: (family: number, country: Countries, slot: 0 | 1) => FinishAdvantageOpenOutcome,
    nonterminalDraw: (family: number, country: Countries, slot: 0 | 1) => boolean = () => false,
): FinishAdvantageOpenOutcomeRow[] => families.flatMap((familyId, family) =>
    FINISH_ADVANTAGE_OPEN_CAUSAL_SCREEN_COUNTRIES.flatMap((country) =>
        ([0, 1] as const).map((candidateSlot) => ({
            armId,
            familyId,
            country,
            candidateSlot,
            outcome: outcome(family, country, candidateSlot),
            nonterminalDraw: nonterminalDraw(family, country, candidateSlot),
        })),
    ),
);

const irreversible: FinishAdvantageOpenArm = {
    armId: "termination_aware_plus_irreversible_finish",
    kind: "irreversible",
    margin: null,
    terminalBaseRaceMode: "strict_literal_endpoint_base_race",
};

describe("finish-advantage complete open causal-screen analysis", () => {
    it("derives the frozen same-seed family-country blocks", () => {
        expect(deriveFinishAdvantageOpenSeed(0, 0)).toBe(4_227_100_000);
        expect(deriveFinishAdvantageOpenSeed(9, 8)).toBe(4_227_100_089);
        expect(deriveFinishAdvantageOpenSeed(3, 4)).toBe(deriveFinishAdvantageOpenSeed(3, 4));
        expect(() => deriveFinishAdvantageOpenSeed(-1, 0)).toThrow("family ordinal");
        expect(() => deriveFinishAdvantageOpenSeed(0, 9)).toThrow("country ordinal");
    });

    it("constructs the exact canonical four- through six-arm screen", () => {
        const fourArms = buildFinishAdvantageOpenArms([]);
        expect(fourArms.map(({ armId }) => armId)).toEqual([
            "external_supalosa_control",
            "visibility_aware_final_building_v5",
            "v5_plus_terminal_base_race_guard",
            "termination_aware_plus_irreversible_finish",
        ]);
        expect(fourArms.length * 180).toBe(720);
        expect(buildFinishAdvantageOpenArms([8, 2]).map(({ armId }) => armId)).toEqual([
            "external_supalosa_control",
            "visibility_aware_final_building_v5",
            "v5_plus_terminal_base_race_guard",
            "termination_aware_plus_irreversible_finish",
            "termination_aware_plus_surplus_m2",
            "termination_aware_plus_surplus_m8",
        ]);
    });

    it("computes the frozen family-macro paired effect and lower bound", () => {
        const candidate = rows(irreversible.armId, () => "win");
        const control = rows("external_supalosa_control", () => "draw");
        const comparison = compareFinishAdvantageOpenArms(
            candidate, control, "external_supalosa_control",
        );
        expect(comparison.effect).toBe(0.5);
        expect(comparison.familyClusterSd).toBe(0);
        expect(comparison.oneSided80Lower).toBe(0.5);
        expect(comparison.minimumLeaveOneFamilyOutEffect).toBe(0.5);
        expect(comparison.positiveCountryCount).toBe(9);
        expect(comparison.positiveFamilyCount).toBe(10);
        expect(comparison.slotEffects).toEqual({ "0": 0.5, "1": 0.5 });
        expect(comparison.transitions.drawToWin).toBe(180);
        expect(() => compareFinishAdvantageOpenArms(
            candidate,
            control.map((row) => ({ ...row, armId: "visibility_aware_final_building_v5" })),
            "external_supalosa_control",
        )).toThrow("arm identity mismatch");
    });

    it("uses family clusters rather than treating 180 cells as independent", () => {
        const candidate = rows(irreversible.armId, (family) => family === 0 ? "draw" : "win");
        const control = rows("external_supalosa_control", () => "draw");
        const comparison = compareFinishAdvantageOpenArms(
            candidate, control, "external_supalosa_control",
        );
        expect(comparison.effect).toBeCloseTo(0.45, 12);
        expect(comparison.familyClusterSd).toBeCloseTo(0.158113883008419, 12);
        expect(comparison.familyClusterSe).toBeCloseTo(0.05, 12);
        expect(comparison.oneSided80Lower).toBeCloseTo(0.405829807015724, 12);
    });

    it("advances only literal-win, draw-reducing, broad, non-regressing candidates", () => {
        const supalosa = rows("external_supalosa_control", () => "draw");
        const v5 = rows("visibility_aware_final_building_v5", () => "draw");
        const candidate = rows(irreversible.armId, () => "win");
        const evaluation = evaluateFinishAdvantageOpenCandidate(
            irreversible, candidate, supalosa, v5, [],
        );
        expect(evaluation.eligible).toBe(true);
        expect(evaluation.eligibilityFailures).toEqual([]);
        expect(evaluation.absolute.oneSided80LiteralWinLower).toBe(1);
        expect(evaluation.absolute.oneSided80DrawUpper).toBe(0);
    });

    it("rejects a relatively improved arm that still draws most games", () => {
        const supalosa = rows("external_supalosa_control", () => "draw");
        const v5 = rows("visibility_aware_final_building_v5", () => "draw");
        const candidate = rows(irreversible.armId, (family) => family < 6 ? "win" : "draw");
        const evaluation = evaluateFinishAdvantageOpenCandidate(
            irreversible, candidate, supalosa, v5, [],
        );
        expect(evaluation.versusSupalosa.oneSided80Lower).toBeGreaterThan(0);
        expect(evaluation.versusSupalosa.positiveFamilyCount).toBe(6);
        expect(evaluation.versusSupalosa.positiveCountryCount).toBe(9);
        expect(evaluation.absolute.literalWinRate).toBe(0.6);
        expect(evaluation.absolute.drawRate).toBe(0.4);
        expect(evaluation.eligible).toBe(false);
        expect(evaluation.eligibilityFailures).toContain(
            "Absolute family-clustered literal-win lower bound is not above 0.50",
        );
        expect(evaluation.eligibilityFailures).toContain(
            "Absolute family-clustered draw upper bound is not below 0.25",
        );
    });

    it("treats equality at the absolute gates as failure", () => {
        const candidate = rows(irreversible.armId, (_family, _country, slot) =>
            slot === 0 ? "win" : "loss",
        );
        const absolute = summarizeFinishAdvantageOpenAbsoluteRates(candidate);
        expect(absolute.literalWinRate).toBe(0.5);
        expect(absolute.oneSided80LiteralWinLower).toBe(0.5);
        const supalosa = rows("external_supalosa_control", () => "loss");
        const v5 = rows("visibility_aware_final_building_v5", () => "loss");
        const evaluation = evaluateFinishAdvantageOpenCandidate(
            irreversible, candidate, supalosa, v5, [],
        );
        expect(evaluation.eligible).toBe(false);
        expect(evaluation.eligibilityFailures).toContain(
            "Absolute family-clustered literal-win lower bound is not above 0.50",
        );
    });

    it("rejects a nonterminal-draw rate at the strict 0.10 boundary", () => {
        const candidate = rows(
            irreversible.armId,
            (family) => family === 0 ? "draw" : "win",
            (family) => family === 0,
        );
        const supalosa = rows("external_supalosa_control", () => "draw");
        const v5 = rows("visibility_aware_final_building_v5", () => "draw");
        const evaluation = evaluateFinishAdvantageOpenCandidate(
            irreversible, candidate, supalosa, v5, [],
        );
        expect(evaluation.absolute.nonterminalDrawRate).toBe(0.1);
        expect(evaluation.eligible).toBe(false);
        expect(evaluation.eligibilityFailures).toContain(
            "Nonterminal draw rate is not below 0.10",
        );
    });

    it("rejects even one V5 win converted to a draw", () => {
        const supalosa = rows("external_supalosa_control", () => "draw");
        const v5 = rows("visibility_aware_final_building_v5", (family, country, slot) =>
            family === 0 && country === Countries.USA && slot === 0 ? "win" : "draw",
        );
        const candidate = rows(irreversible.armId, (family, country, slot) =>
            family === 0 && country === Countries.USA && slot === 0 ? "draw" : "win",
        );
        const evaluation = evaluateFinishAdvantageOpenCandidate(
            irreversible, candidate, supalosa, v5, [],
        );
        expect(evaluation.eligible).toBe(false);
        expect(evaluation.eligibilityFailures).toContain("V5 win-to-nonwin regression occurred");
        expect(evaluation.versusV5.transitions.winToDraw).toBe(1);
    });

    it("fails closed on mechanism violations", () => {
        const supalosa = rows("external_supalosa_control", () => "draw");
        const v5 = rows("visibility_aware_final_building_v5", () => "draw");
        const candidate = rows(irreversible.armId, () => "win");
        const evaluation = evaluateFinishAdvantageOpenCandidate(
            irreversible, candidate, supalosa, v5, ["protected unit was leased"],
        );
        expect(evaluation.eligible).toBe(false);
        expect(evaluation.eligibilityFailures).toContain("Mechanism validation failed");
    });

    it("selects only among eligible arms using the frozen ranking", () => {
        const supalosa = rows("external_supalosa_control", () => "draw");
        const v5 = rows("visibility_aware_final_building_v5", () => "draw");
        const strong = evaluateFinishAdvantageOpenCandidate(
            irreversible,
            rows(irreversible.armId, () => "win"),
            supalosa,
            v5,
            [],
        );
        const surplus: FinishAdvantageOpenArm = {
            armId: "termination_aware_plus_surplus_m2",
            kind: "surplus",
            margin: 2,
            terminalBaseRaceMode: "strict_literal_endpoint_base_race",
        };
        const weaker = evaluateFinishAdvantageOpenCandidate(
            surplus,
            rows(surplus.armId, (family) => family === 0 ? "draw" : "win"),
            supalosa,
            v5,
            [],
        );
        expect(weaker.eligible).toBe(true);
        expect(selectFinishAdvantageOpenCandidate([weaker, strong])?.arm.armId)
            .toBe("termination_aware_plus_irreversible_finish");
        expect(selectFinishAdvantageOpenCandidate([{ ...strong, eligible: false }])).toBeNull();
    });
});
