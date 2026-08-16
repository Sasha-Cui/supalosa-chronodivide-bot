import { describe, expect, it } from "vitest";
import {
    ObjectiveMissionDecision,
    TerminalEvidence,
} from "@supalosa/chronodivide-bot/dist/bot/logic/objective/terminalObjectiveDecisionCore.js";
import {
    TerminalBaseRaceMode,
    applyTerminalBaseRaceGuard,
    evaluateTerminalBaseRaceGuard,
} from "../training/terminalBaseRaceGuard.js";

const terminal: TerminalEvidence = {
    remainingKnownBuildingCount: 1,
    allPreviouslyKnownAlternativesInvalidated: true,
    searchCoverageFraction: 1,
    requiredSearchCoverageFraction: 0.9,
};

const strike: ObjectiveMissionDecision = {
    kind: "terminal_candidate_strike",
    buildingId: 2,
    predictedCompletionTicks: 20,
    reason: "sole_known_building_before_intercept",
};

const guard = (overrides: Partial<{
    mode: TerminalBaseRaceMode;
    decision: ObjectiveMissionDecision;
    terminalEvidence: TerminalEvidence;
    earliestBaseDestructionTick: number | null;
    existentialBaseThreatIds: number[];
    safetyMarginTicks: number;
}> = {}) => {
    const {
        earliestBaseDestructionTick,
        existentialBaseThreatIds,
        ...rest
    } = overrides;
    return applyTerminalBaseRaceGuard({
        mode: "strict_literal_endpoint_base_race",
        decision: strike,
        terminalEvidence: terminal,
        safetyMarginTicks: 2,
        ...rest,
        classification: {
            earliestBaseDestructionTick: earliestBaseDestructionTick === undefined
                ? 40
                : earliestBaseDestructionTick,
            existentialBaseThreatIds: existentialBaseThreatIds ?? [100],
            baseSafetyCertificateComplete: true,
            baseSafetyCertificateFailureReason: null,
            uncalibratedBaseThreatIds: [],
        },
    });
};

describe("strict literal-endpoint terminal base-race guard", () => {
    it("attacks the final building before a remote army can zero our base", () => {
        expect(guard()).toEqual(strike);
    });

    it("attacks the final building before 100 off-route tanks can win the base race", () => {
        const tankIds = Array.from({ length: 100 }, (_, index) => 100 + index).reverse();
        expect(guard({
            earliestBaseDestructionTick: 40,
            existentialBaseThreatIds: tankIds,
        })).toEqual(strike);
    });

    it("defends every credited threat when 100 off-route tanks win the base race", () => {
        const tankIds = Array.from({ length: 100 }, (_, index) => 100 + index);
        expect(guard({
            earliestBaseDestructionTick: 21,
            existentialBaseThreatIds: tankIds.slice().reverse(),
        })).toEqual({
            kind: "base_defense",
            threatIds: tankIds,
            reason: "base_falls_before_objective",
        });
    });

    it("treats exact same-update objective and base destruction as draw risk", () => {
        expect(guard({ earliestBaseDestructionTick: 20 })).toEqual({
            kind: "base_defense",
            threatIds: [100],
            reason: "base_falls_before_objective",
        });
    });

    it("interrupts the minimum identified threat when our base reaches zero first", () => {
        expect(guard({ earliestBaseDestructionTick: 21 })).toEqual({
            kind: "base_defense",
            threatIds: [100],
            reason: "base_falls_before_objective",
        });
        expect(evaluateTerminalBaseRaceGuard({
            mode: "strict_literal_endpoint_base_race",
            decision: strike,
            terminalEvidence: terminal,
            safetyMarginTicks: 2,
            classification: {
                earliestBaseDestructionTick: 21,
                existentialBaseThreatIds: [100],
                baseSafetyCertificateComplete: true,
                baseSafetyCertificateFailureReason: null,
                uncalibratedBaseThreatIds: [],
            },
        })).toMatchObject({ objectiveCompletionTicks: 20, intervened: true });
    });

    it("returns to the final building as soon as the base-race threat is gone", () => {
        expect(guard({
            earliestBaseDestructionTick: null,
            existentialBaseThreatIds: [],
        })).toEqual(strike);
    });

    it("uses one base-defense mission when the same unit is also the route blocker", () => {
        expect(guard({
            decision: {
                kind: "blocker_clear",
                buildingId: 2,
                blockerIds: [100],
                predictedCompletionTicks: 30,
                reason: "direct_strike_not_survivable",
            },
            earliestBaseDestructionTick: 25,
        })).toEqual({
            kind: "base_defense",
            threatIds: [100],
            reason: "base_falls_before_objective",
        });
    });

    it("treats an unknown blocker-then-building completion as losing the base race", () => {
        expect(guard({
            decision: {
                kind: "blocker_clear",
                buildingId: 2,
                blockerIds: [100],
                predictedCompletionTicks: null,
                reason: "direct_strike_not_survivable",
            },
            earliestBaseDestructionTick: 50,
        })).toMatchObject({ kind: "base_defense", threatIds: [100] });
    });

    it("leaves a nonterminal multi-building decision unchanged", () => {
        expect(guard({
            terminalEvidence: { ...terminal, remainingKnownBuildingCount: 2 },
            earliestBaseDestructionTick: 1,
        })).toEqual(strike);
    });

    it("preserves frozen V5 behavior only under the explicit legacy mode", () => {
        expect(guard({
            mode: "legacy_v5_ignore_own_base_loss",
            earliestBaseDestructionTick: 1,
        })).toEqual(strike);
    });

    it("preserves the legacy V5 comparator under the 100-tank early-loss fixture", () => {
        expect(guard({
            mode: "legacy_v5_ignore_own_base_loss",
            earliestBaseDestructionTick: 1,
            existentialBaseThreatIds: Array.from({ length: 100 }, (_, index) => 100 + index),
        })).toEqual(strike);
    });

    it("fails closed when a special unit makes the literal own-base race uncertified", () => {
        expect(applyTerminalBaseRaceGuard({
            mode: "strict_literal_endpoint_base_race",
            decision: strike,
            terminalEvidence: terminal,
            safetyMarginTicks: 2,
            classification: {
                earliestBaseDestructionTick: null,
                existentialBaseThreatIds: [],
                baseSafetyCertificateComplete: false,
                baseSafetyCertificateFailureReason: "uncalibrated_relevant_threat",
                uncalibratedBaseThreatIds: [900],
            },
        })).toEqual({
            kind: "predecessor_fallback",
            threatIds: [900],
            reason: "uncalibrated_relevant_threat",
        });
    });

    it("fails closed on inconsistent or malformed base-loss evidence", () => {
        expect(() => guard({
            earliestBaseDestructionTick: 1,
            existentialBaseThreatIds: [],
        })).toThrow(/inconsistent/);
        expect(() => guard({
            earliestBaseDestructionTick: null,
            existentialBaseThreatIds: [100],
        })).toThrow(/lack a destruction deadline/);
    });
});
