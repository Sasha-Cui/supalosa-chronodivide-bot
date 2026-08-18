import { Countries } from "@supalosa/chronodivide-bot/dist/bot/logic/common/utils.js";
import {
    FINISH_ADVANTAGE_MARGINS,
    FinishAdvantageMargin,
    finishAdvantageDirectStrikeIsSafe,
} from "./finishAdvantageControl.js";
import {
    FinishAdvantagePolicy,
    buildFinishAdvantageIrreversiblePolicy,
    buildFinishAdvantageSurplusPolicy,
} from "./finishAdvantagePolicy.js";
import { FinishAdvantageTelemetry } from "./finishAdvantageStrategy.js";
import { TerminalObjectiveTelemetry } from "./terminalObjectiveStrategy.js";
import {
    TerminalBaseRaceMode,
    applyTerminalBaseRaceGuard,
} from "./terminalBaseRaceGuard.js";

export const FINISH_ADVANTAGE_COMPOSITE_COMPATIBILITY_PROTOCOL_SHA256 =
    "95abce7405006a8e73dc3c8dad0aed5745c483b9591332bc1bc72e7951c4f24e" as const;
export const FINISH_ADVANTAGE_COMPOSITE_COMPATIBILITY_AMENDMENT_SHA256 =
    "31a6f44d6fbd175c4901220f095185bb293e0b6e14f0684702334edb4a259362" as const;
export const FINISH_ADVANTAGE_COMPOSITE_COMPATIBILITY_AMENDMENT_2_SHA256 =
    "df12eb53db5bd75a4fdecb93fae785d2100aafed326e4b29714a69b629542d5b" as const;
export const FINISH_ADVANTAGE_COMPOSITE_COMPATIBILITY_AMENDMENT_3_SHA256 =
    "d814a699ff4abc41401a199b95c38193ce96c920eb831357b971cc9720d17e9f" as const;
export const FINISH_ADVANTAGE_COMPOSITE_COMPATIBILITY_AMENDMENT_4_SHA256 =
    "17dd858768cd5ae3030176574d74575281fa5b2ad5fad65a79db9a32394ea72a" as const;
export const FINISH_ADVANTAGE_COMPOSITE_COMPATIBILITY_AMENDMENT_5_SHA256 =
    "b61568ce5551b4a71fd0dfb99383b0039293a2d4f4a335641a82d6804b7cf940" as const;
export const FINISH_ADVANTAGE_COMPOSITE_COMPATIBILITY_MAP_NAME =
    "cd_chrono_offensedefense.map" as const;
export const FINISH_ADVANTAGE_COMPOSITE_COMPATIBILITY_MAP_SHA256 =
    "94043927a79a30df9394ac6d6195e0d2926863fdad9c412556d0cc7af409f11a" as const;
export const FINISH_ADVANTAGE_COMPOSITE_COMPATIBILITY_MAX_TICKS = 5_400 as const;
export const FINISH_ADVANTAGE_COMPOSITE_COMPATIBILITY_SEED_BASE = 4_226_300_000 as const;
export const FINISH_ADVANTAGE_COMPOSITE_COMPATIBILITY_RUNS_PER_CELL = 4 as const;
export const FINISH_ADVANTAGE_COMPOSITE_COMPATIBILITY_COUNTRIES = [
    Countries.USA,
    Countries.KOREA,
    Countries.FRANCE,
    Countries.GERMANY,
    Countries.GREAT_BRITAIN,
    Countries.LIBYA,
    Countries.IRAQ,
    Countries.CUBA,
    Countries.RUSSIA,
] as const;
export const FINISH_ADVANTAGE_COMPOSITE_COMPATIBILITY_CELL_COUNT =
    FINISH_ADVANTAGE_COMPOSITE_COMPATIBILITY_COUNTRIES.length * 2;

type RecordValue = Record<string, unknown>;
const isRecord = (value: unknown): value is RecordValue =>
    !!value && typeof value === "object" && !Array.isArray(value);
const finiteNonnegativeOrNull = (value: unknown): value is number | null =>
    value === null || typeof value === "number" && Number.isFinite(value) && value >= 0;
const nonnegativeInteger = (value: unknown): value is number =>
    typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
const integerIds = (value: unknown): value is number[] =>
    Array.isArray(value) && value.every((id) => Number.isSafeInteger(id) && id >= 0) &&
    new Set(value).size === value.length;
const overlap = (left: readonly number[], right: readonly number[]): number[] => {
    const rightSet = new Set(right);
    return left.filter((id) => rightSet.has(id));
};
const containsForbiddenOutcomeKey = (value: unknown): boolean => {
    if (Array.isArray(value)) return value.some(containsForbiddenOutcomeKey);
    if (!isRecord(value)) return false;
    return Object.entries(value).some(([key, child]) =>
        ["winner", "score", "outcome", "terminalBuildingCounts", "endpointOrientation"].includes(key) ||
        containsForbiddenOutcomeKey(child),
    );
};

export type FinishAdvantageTechnicalGatePolicySelection = {
    stateAuditSha256: string;
    selectedMargins: FinishAdvantageMargin[];
    selectedMode: "irreversible_only" | "surplus_cover";
    selectedMargin: FinishAdvantageMargin;
    policy: FinishAdvantagePolicy;
};

export const selectFinishAdvantageTechnicalGatePolicy = (
    stateAudit: unknown,
    stateAuditSha256: string,
): FinishAdvantageTechnicalGatePolicySelection => {
    if (!/^[0-9a-f]{64}$/.test(stateAuditSha256)) throw new Error("State-audit SHA-256 is invalid");
    if (
        !isRecord(stateAudit) || stateAudit.schemaVersion !== 1 ||
        stateAudit.kind !== "finish-advantage-outcome-blind-state-audit-finalizer" ||
        stateAudit.status !== "PASS_OUTCOME_BLIND_STATE_AUDIT" || stateAudit.passed !== true ||
        stateAudit.outcomeFree !== true || !Array.isArray(stateAudit.selectedMargins) ||
        containsForbiddenOutcomeKey(stateAudit)
    ) throw new Error("Finish-advantage state-audit gate is invalid or did not pass");
    const selectedMargins = stateAudit.selectedMargins as unknown[];
    if (
        selectedMargins.some((margin) => !FINISH_ADVANTAGE_MARGINS.includes(margin as FinishAdvantageMargin)) ||
        new Set(selectedMargins).size !== selectedMargins.length || selectedMargins.length > 2
    ) throw new Error("State-audit selected margins are invalid");
    const canonical = (selectedMargins as FinishAdvantageMargin[]).slice().sort((left, right) => left - right);
    const selectedMargin = canonical[0] ?? 0;
    const selectedMode = canonical.length === 0 ? "irreversible_only" : "surplus_cover";
    return {
        stateAuditSha256,
        selectedMargins: canonical,
        selectedMode,
        selectedMargin,
        policy: selectedMode === "surplus_cover"
            ? buildFinishAdvantageSurplusPolicy(selectedMargin)
            : buildFinishAdvantageIrreversiblePolicy(),
    };
};

export const validateFinishAdvantageCompatibilityTelemetry = (
    event: FinishAdvantageTelemetry,
    policy: FinishAdvantagePolicy,
): string[] => {
    const errors: string[] = [];
    if (
        event.schemaVersion !== 4 || event.event !== "finish_advantage_decision" ||
        event.informationInterface !== "public_complete_state" || event.mode !== policy.multiBuildingMode
    ) errors.push("finish-advantage telemetry identity drifted");
    if (
        !nonnegativeInteger(event.tick) || !nonnegativeInteger(event.enemyBuildingCount) ||
        !nonnegativeInteger(event.enemyMobileSelectableCombatantCount) ||
        !nonnegativeInteger(event.nominalEligibleCount) || !nonnegativeInteger(event.protectedEligibleCount) ||
        event.protectedEligibleCount > event.nominalEligibleCount
    ) errors.push("finish-advantage telemetry count is malformed");
    if (!Array.isArray(event.forbiddenFieldsEmitted) || event.forbiddenFieldsEmitted.length !== 0) {
        errors.push("finish-advantage telemetry emitted a forbidden field");
    }
    for (const [label, ids] of [
        ["protected", event.protectedEligibleIds],
        ["additional reserve", event.additionalReserveIds],
        ["strike pool", event.strikePoolIds],
        ["selected attacker", event.selectedAttackerIds],
    ] as const) if (!integerIds(ids)) errors.push(`${label} IDs are malformed or duplicated`);
    if (event.protectedEligibleIds.length !== event.protectedEligibleCount) {
        errors.push("protected unit count does not match protected IDs");
    }
    if (overlap(event.selectedAttackerIds, event.protectedEligibleIds).length > 0) {
        errors.push("selected attackers overlap protected mission units");
    }
    if (overlap(event.selectedAttackerIds, event.additionalReserveIds).length > 0) {
        errors.push("selected attackers overlap additional reserve units");
    }
    if (event.selectedAttackerIds.some((id) => !event.strikePoolIds.includes(id))) {
        errors.push("selected attacker is outside the certified strike pool");
    }
    if (
        !finiteNonnegativeOrNull(event.buildingCompletionTicks) ||
        !finiteNonnegativeOrNull(event.earliestInterceptTicks) ||
        !finiteNonnegativeOrNull(event.earliestOwnBuildingLossTicks) ||
        !finiteNonnegativeOrNull(event.blockerRemovalTicks) ||
        !finiteNonnegativeOrNull(event.blockerHitPoints) ||
        !finiteNonnegativeOrNull(event.objectiveDistanceTiles) ||
        !finiteNonnegativeOrNull(event.ticksSinceObjectiveProgress)
    ) errors.push("finish-advantage race estimate is malformed");
    if (![
        "new_commitment", "building_damage", "approach", "blocker_damage", "blocker_removed", "none",
    ].includes(event.objectiveProgress)) errors.push("finish-advantage progress witness is malformed");
    if (typeof event.irreversibleCertificateRevoked !== "boolean") {
        errors.push("finish-advantage certificate-revocation witness is malformed");
    }
    if (event.irreversibleCertificateRevoked === true && event.irreversibleCertificate === true) {
        errors.push("finish-advantage certificate revocation contradicts the current certificate");
    }
    if (
        event.stalledTargetId !== null &&
        (!nonnegativeInteger(event.stalledTargetId) || event.stalledTargetId === 0)
    ) {
        errors.push("finish-advantage stalled-target witness is malformed");
    }
    const actionBearing = event.issuedOrder !== "none";
    if (
        actionBearing && event.stalledTargetId !== null &&
        event.targetBuildingId === event.stalledTargetId
    ) errors.push("finish-advantage stall recovery reselected the stalled target");
    if (actionBearing && event.enemyBuildingCount <= 1) {
        errors.push("multi-building overlay acted at or below the final-building boundary");
    }
    if (event.enemyBuildingCount <= 1 && (event.phase !== "inactive" || actionBearing)) {
        errors.push("final-building state was not an inactive action-free handoff");
    }
    if (!actionBearing && event.selectedAttackerIds.length !== 0) {
        errors.push("action-free telemetry lists selected attackers");
    }
    if (actionBearing && event.selectedAttackerIds.length === 0) {
        errors.push("issued overlay order has no selected attacker");
    }
    if (event.issuedOrder === "attack_visible_building" || event.issuedOrder === "approach_exact_unseen_building") {
        if (
            event.phase !== "building_strike" || event.targetBuildingId === null ||
            event.targetBuildingCoordinates === null || event.targetBuildingHitPoints === null ||
            event.buildingCompletionTicks === null ||
            event.targetBuildingVisible !== (event.issuedOrder === "attack_visible_building")
        ) errors.push("building order lacks a complete matching telemetry witness");
        if (!finishAdvantageDirectStrikeIsSafe({
            buildingCompletionTicks: event.buildingCompletionTicks,
            earliestInterceptTicks: event.earliestInterceptTicks,
            earliestOwnBuildingLossTicks: event.earliestOwnBuildingLossTicks,
            safetyMarginTicks: policy.safetyMarginTicks,
        })) errors.push("building order is not certified to win its causal race");
    }
    if (event.issuedOrder === "attack_visible_blocker" || event.issuedOrder === "approach_exact_unseen_blocker") {
        if (
            event.phase !== "blocker_clear" || event.targetBuildingId === null || event.blockerId === null ||
            event.blockerCoordinates === null || event.blockerVisible === null ||
            event.blockerHitPoints === null ||
            event.earliestInterceptTicks === null || event.blockerRemovalTicks === null ||
            event.blockerVisible !== (event.issuedOrder === "attack_visible_blocker")
        ) errors.push("blocker order lacks a complete causal witness");
    }
    if (event.phase === "base_defense" && actionBearing) {
        errors.push("multi-building base-race decision issued an overlay action");
    }
    if (actionBearing && event.irreversibleCertificate) {
        if (
            event.additionalReserveIds.length !== 0 ||
            event.strikePoolIds.length !== event.nominalEligibleCount - event.protectedEligibleCount
        ) errors.push("irreversible certificate did not release every unprotected compatible unit");
    }
    if (actionBearing && !event.irreversibleCertificate && policy.multiBuildingMode === "irreversible_only") {
        errors.push("irreversible-only policy acted without its certificate");
    }
    if (actionBearing && !event.irreversibleCertificate && policy.multiBuildingMode === "surplus_cover") {
        const desiredCover = Math.min(
            event.nominalEligibleCount,
            Math.max(policy.ordinaryBaseReserve, event.enemyMobileSelectableCombatantCount + policy.surplusMargin),
        );
        const expectedAdditional = Math.min(
            Math.max(0, desiredCover - event.protectedEligibleCount),
            event.nominalEligibleCount - event.protectedEligibleCount,
        );
        if (
            event.additionalReserveIds.length !== expectedAdditional ||
            event.additionalReserveIds.length + event.strikePoolIds.length !==
                event.nominalEligibleCount - event.protectedEligibleCount
        ) errors.push("surplus-cover partition does not match the frozen arithmetic");
    }
    return errors;
};

export const validateTerminalBaseRaceCompatibilityTelemetry = (
    events: readonly TerminalObjectiveTelemetry[],
    mode: TerminalBaseRaceMode,
    safetyMarginTicks: number,
): string[] => {
    const errors: string[] = [];
    if (mode !== "strict_literal_endpoint_base_race") {
        errors.push("intervention composite lacks the strict terminal base-race mode");
        return errors;
    }
    for (const [index, event] of events.entries()) {
        if (event.event !== "decision" || event.exactEnemyBuildingCount !== 1) continue;
        const guardRelevant = event.decisionKind === "terminal_candidate_strike" ||
            event.decisionKind === "building_strike" || event.decisionKind === "blocker_clear" ||
            event.decisionKind === "base_defense" ||
            event.decisionKind === "predecessor_fallback" &&
                event.terminalBaseRaceGuardIntervened === true;
        if (!guardRelevant) continue;
        if (
            event.terminalBaseRaceMode !== mode ||
            typeof event.terminalBaseRaceGuardIntervened !== "boolean" ||
            !finiteNonnegativeOrNull(event.terminalBaseRaceObjectiveCompletionTicks)
        ) {
            errors.push(`terminal base-race telemetry ${index} lacks its frozen guard witness`);
            continue;
        }
        if (
            event.decisionKind === "terminal_candidate_strike" ||
            event.decisionKind === "building_strike" ||
            event.decisionKind === "blocker_clear"
        ) {
            if (
                event.terminalBaseRaceGuardIntervened ||
                event.terminalBaseRaceObjectiveCompletionTicks === null ||
                !finiteNonnegativeOrNull(event.earliestBaseDestructionTick) ||
                event.earliestBaseDestructionTick !== null &&
                    event.terminalBaseRaceObjectiveCompletionTicks + safetyMarginTicks >=
                        event.earliestBaseDestructionTick
            ) errors.push(`terminal base-race telemetry ${index} contains an unsafe building strike`);
        }
        if (event.decisionKind === "base_defense") {
            if (
                !event.terminalBaseRaceGuardIntervened ||
                !integerIds(event.threatIds) || event.threatIds!.length === 0 ||
                !finiteNonnegativeOrNull(event.earliestBaseDestructionTick) ||
                event.earliestBaseDestructionTick === null ||
                event.terminalBaseRaceObjectiveCompletionTicks !== null &&
                    event.earliestBaseDestructionTick >
                        event.terminalBaseRaceObjectiveCompletionTicks + safetyMarginTicks
            ) errors.push(`terminal base-race telemetry ${index} lacks a causal defense witness`);
        } else if (event.decisionKind === "predecessor_fallback") {
            if (
                !event.terminalBaseRaceGuardIntervened ||
                event.decisionReason !== "uncalibrated_relevant_threat" &&
                    event.decisionReason !== "analysis_horizon_exceeded" ||
                !integerIds(event.threatIds) ||
                event.decisionReason === "uncalibrated_relevant_threat" && event.threatIds!.length === 0
            ) errors.push(`terminal base-race telemetry ${index} lacks an uncertainty witness`);
        } else if (event.terminalBaseRaceGuardIntervened) {
            errors.push(`terminal base-race telemetry ${index} records an intervention without base defense`);
        }
    }
    return errors;
};

export const deterministicTerminalBaseRaceCases = () => {
    const terminalEvidence = {
        remainingKnownBuildingCount: 1,
        allPreviouslyKnownAlternativesInvalidated: true,
        searchCoverageFraction: 1,
        requiredSearchCoverageFraction: 0.9,
    };
    const strike = {
        kind: "terminal_candidate_strike" as const,
        buildingId: 2,
        predictedCompletionTicks: 20,
        reason: "sole_known_building_before_intercept" as const,
    };
    const run = (
        earliestBaseDestructionTick: number | null,
        existentialBaseThreatIds: number[],
        decision = strike as Parameters<typeof applyTerminalBaseRaceGuard>[0]["decision"],
    ) => applyTerminalBaseRaceGuard({
        mode: "strict_literal_endpoint_base_race",
        decision,
        terminalEvidence,
        classification: {
            earliestBaseDestructionTick,
            existentialBaseThreatIds,
            baseSafetyCertificateComplete: true,
            baseSafetyCertificateFailureReason: null,
            uncalibratedBaseThreatIds: [],
        },
        safetyMarginTicks: 2,
    });
    const safeStrike = run(40, [100]);
    const baseDefense = run(21, [100]);
    const dualPurposeDefense = run(21, [100], {
        kind: "blocker_clear",
        buildingId: 2,
        blockerIds: [100],
        predictedCompletionTicks: 30,
        reason: "direct_strike_not_survivable",
    });
    const refocus = run(null, []);
    const deadlineTieDefense = run(22, [100]);
    const errors: string[] = [];
    if (safeStrike.kind !== "terminal_candidate_strike") errors.push("safe final strike was preempted");
    if (baseDefense.kind !== "base_defense" || baseDefense.threatIds.join(",") !== "100") {
        errors.push("earlier base zeroing did not select its causal threat");
    }
    if (dualPurposeDefense.kind !== "base_defense" || dualPurposeDefense.threatIds.join(",") !== "100") {
        errors.push("dual-purpose route/base blocker produced the wrong mission");
    }
    if (refocus.kind !== "terminal_candidate_strike") errors.push("removed base threat did not refocus building");
    if (deadlineTieDefense.kind !== "base_defense") errors.push("safety-margin deadline was ignored");
    return {
        caseCount: 5,
        passed: errors.length === 0,
        errors,
        decisions: { safeStrike, baseDefense, dualPurposeDefense, refocus, deadlineTieDefense },
    };
};

export type FinishAdvantageCompositeCompatibilityCell = {
    country: Countries;
    candidateSlot: 0 | 1;
    disabledEquivalent: boolean;
    deterministic: boolean;
    validationErrors: string[];
    finishBuildingOrderWitness: boolean;
    irreversibleOrderWitness: boolean;
    surplusOrderWitness: boolean;
    protectedSeparationWitness: boolean;
    exactUnseenApproachWitness: boolean;
    visibleHandoffWitness: boolean;
    terminalBaseRaceMode: TerminalBaseRaceMode;
};

const ALLIED = new Set<Countries>([
    Countries.USA,
    Countries.KOREA,
    Countries.FRANCE,
    Countries.GERMANY,
    Countries.GREAT_BRITAIN,
]);

export const summarizeFinishAdvantageCompositeCompatibility = (
    rows: readonly FinishAdvantageCompositeCompatibilityCell[],
    selectedMode: FinishAdvantagePolicy["multiBuildingMode"],
    stateAuditIrreversibleExposedCellCount: number,
) => {
    const validationErrors = rows.flatMap(({ country, candidateSlot, validationErrors: errors }) =>
        errors.map((error) => `${country} slot ${candidateSlot}: ${error}`),
    );
    const unique = new Set(rows.map(({ country, candidateSlot }) => `${country}|${candidateSlot}`));
    if (rows.length !== FINISH_ADVANTAGE_COMPOSITE_COMPATIBILITY_CELL_COUNT || unique.size !== rows.length) {
        validationErrors.push("composite population lacks 18 unique country-slot cells");
    }
    if (rows.some(({ disabledEquivalent }) => !disabledEquivalent)) {
        validationErrors.push("a disabled composite differs from exact Supalosa");
    }
    if (rows.some(({ deterministic }) => !deterministic)) {
        validationErrors.push("an enabled same-seed composite trace is nondeterministic");
    }
    if (rows.some(({ terminalBaseRaceMode }) =>
        terminalBaseRaceMode !== "strict_literal_endpoint_base_race")) {
        validationErrors.push("an enabled composite lacks the strict terminal base-race mode");
    }
    const baseRaceCases = deterministicTerminalBaseRaceCases();
    validationErrors.push(...baseRaceCases.errors.map((error) => `terminal base-race case: ${error}`));
    const buildingRows = rows.filter(({ finishBuildingOrderWitness }) => finishBuildingOrderWitness);
    const countries = new Set(buildingRows.map(({ country }) => country));
    const factions = new Set(buildingRows.map(({ country }) => ALLIED.has(country) ? "Allied" : "Soviet"));
    const slots = new Set(buildingRows.map(({ candidateSlot }) => candidateSlot));
    if (countries.size < 4 || factions.size !== 2 || slots.size !== 2) {
        validationErrors.push("finish-advantage building-order exposure is too narrow");
    }
    if (
        stateAuditIrreversibleExposedCellCount > 0 &&
        !rows.some(({ irreversibleOrderWitness }) => irreversibleOrderWitness)
    ) validationErrors.push("state audit exposed irreversible states but the live gate has no irreversible order");
    if (
        selectedMode === "surplus_cover" &&
        !rows.some(({ surplusOrderWitness }) => surplusOrderWitness)
    ) validationErrors.push("selected surplus mode has no live surplus order");
    if (!rows.some(({ protectedSeparationWitness }) => protectedSeparationWitness)) {
        validationErrors.push("live gate lacks a nonempty protected/reserve separation witness");
    }
    if (!rows.some(({ exactUnseenApproachWitness }) => exactUnseenApproachWitness)) {
        validationErrors.push("composite population lacks an exact-unseen coordinate approach");
    }
    if (!rows.some(({ visibleHandoffWitness }) => visibleHandoffWitness)) {
        validationErrors.push("composite population lacks an unseen-to-visible direct-attack handoff");
    }
    return {
        passed: validationErrors.length === 0,
        cellCount: rows.length,
        finishBuildingOrderCellCount: buildingRows.length,
        finishBuildingOrderCountryCount: countries.size,
        finishBuildingOrderFactions: [...factions].sort(),
        finishBuildingOrderSlots: [...slots].sort(),
        validationErrors,
        baseRaceCases,
    };
};
