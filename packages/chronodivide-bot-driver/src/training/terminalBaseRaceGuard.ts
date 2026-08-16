import {
    ObjectiveMissionDecision,
    ObjectiveThreatClassification,
    TerminalEvidence,
    isObjectiveTerminalEvidenceSufficient,
} from "@supalosa/chronodivide-bot/dist/bot/logic/objective/terminalObjectiveDecisionCore.js";

export const TERMINAL_BASE_RACE_MODES = [
    "legacy_v5_ignore_own_base_loss",
    "strict_literal_endpoint_base_race",
] as const;

export type TerminalBaseRaceMode = typeof TERMINAL_BASE_RACE_MODES[number];

export type TerminalBaseRaceGuardInput = {
    mode: TerminalBaseRaceMode;
    decision: ObjectiveMissionDecision;
    terminalEvidence: TerminalEvidence;
    classification: Pick<
        ObjectiveThreatClassification,
        | "earliestBaseDestructionTick"
        | "existentialBaseThreatIds"
        | "baseSafetyCertificateComplete"
        | "baseSafetyCertificateFailureReason"
        | "uncalibratedBaseThreatIds"
    >;
    safetyMarginTicks: number;
};

export type TerminalBaseRaceGuardResult = {
    decision: ObjectiveMissionDecision;
    objectiveCompletionTicks: number | null | undefined;
    intervened: boolean;
};

const completionTicks = (decision: ObjectiveMissionDecision): number | null | undefined => {
    if (
        decision.kind === "terminal_candidate_strike" ||
        decision.kind === "building_strike" ||
        decision.kind === "blocker_clear"
    ) return decision.predictedCompletionTicks;
    return undefined;
};

/**
 * Preserve frozen V5 exactly in legacy mode. In strict mode, a physically
 * established enemy win at our zero-building transition is a real deadline:
 * the terminal strike proceeds only when its complete mission beats it.
 */
export const evaluateTerminalBaseRaceGuard = (
    input: TerminalBaseRaceGuardInput,
): TerminalBaseRaceGuardResult => {
    if (!TERMINAL_BASE_RACE_MODES.includes(input.mode)) {
        throw new Error("Terminal base-race mode is invalid");
    }
    if (!Number.isSafeInteger(input.safetyMarginTicks) || input.safetyMarginTicks < 0) {
        throw new Error("Terminal base-race safety margin is invalid");
    }
    const objectiveCompletionTicks = completionTicks(input.decision);
    const unchanged = (): TerminalBaseRaceGuardResult => ({
        decision: input.decision,
        objectiveCompletionTicks,
        intervened: false,
    });
    if (input.mode === "legacy_v5_ignore_own_base_loss") return unchanged();
    if (!isObjectiveTerminalEvidenceSufficient(input.terminalEvidence)) return unchanged();

    if (objectiveCompletionTicks === undefined) return unchanged();
    if (
        objectiveCompletionTicks !== null &&
        (!Number.isFinite(objectiveCompletionTicks) || objectiveCompletionTicks < 0)
    ) {
        throw new Error("Terminal objective completion time is invalid");
    }
    const uncalibratedBaseThreatIds = input.classification.uncalibratedBaseThreatIds;
    if (
        new Set(uncalibratedBaseThreatIds).size !== uncalibratedBaseThreatIds.length ||
        uncalibratedBaseThreatIds.some((id) => !Number.isSafeInteger(id) || id < 0)
    ) throw new Error("Terminal uncalibrated base-threat identifiers are invalid");
    if (!input.classification.baseSafetyCertificateComplete) {
        const reason = input.classification.baseSafetyCertificateFailureReason;
        if (
            reason === null ||
            reason === "uncalibrated_relevant_threat" && uncalibratedBaseThreatIds.length === 0
        ) throw new Error("Terminal base-safety failure lacks its causal witness");
        return {
            decision: {
                kind: "predecessor_fallback",
                threatIds: uncalibratedBaseThreatIds.slice().sort((left, right) => left - right),
                reason,
            },
            objectiveCompletionTicks,
            intervened: true,
        };
    }
    if (
        input.classification.baseSafetyCertificateFailureReason !== null ||
        uncalibratedBaseThreatIds.length !== 0
    ) throw new Error("Terminal base-safety certificate is inconsistent");

    const ownZero = input.classification.earliestBaseDestructionTick;
    const threats = input.classification.existentialBaseThreatIds;
    if (ownZero === null) {
        if (threats.length !== 0) {
            throw new Error("Terminal base-race threats lack a destruction deadline");
        }
        return unchanged();
    }
    if (!Number.isFinite(ownZero) || ownZero < 0 || threats.length === 0) {
        throw new Error("Terminal base-race destruction evidence is inconsistent");
    }
    if (
        new Set(threats).size !== threats.length ||
        threats.some((id) => !Number.isSafeInteger(id) || id < 0)
    ) throw new Error("Terminal base-race threat identifiers are invalid");

    if (
        objectiveCompletionTicks === null ||
        ownZero <= objectiveCompletionTicks + input.safetyMarginTicks
    ) return {
        decision: {
            kind: "base_defense",
            threatIds: threats.slice().sort((left, right) => left - right),
            reason: "base_falls_before_objective",
        },
        objectiveCompletionTicks,
        intervened: true,
    };
    return unchanged();
};

export const applyTerminalBaseRaceGuard = (
    input: TerminalBaseRaceGuardInput,
): ObjectiveMissionDecision => evaluateTerminalBaseRaceGuard(input).decision;
