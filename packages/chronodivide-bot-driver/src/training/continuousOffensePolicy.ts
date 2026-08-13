import { createHash } from "node:crypto";
import {
    TerminalRaceFriendlyCalibrationMode,
    TerminalRaceInformationInterface,
} from "./terminalRacePolicy.js";

export const CONTINUOUS_OFFENSE_POLICY_SCHEMA_VERSION = 3 as const;

export const CONTINUOUS_OFFENSE_STRIKE_GROUP_MODES = [
    "full_compatible_force",
    "minimum_sufficient_force",
] as const;

export const CONTINUOUS_OFFENSE_FORCE_ENGAGEMENT_MODES = [
    "all_observed_forces_first",
    "route_blockers_only",
    "buildings_only",
] as const;

export type ContinuousOffenseStrikeGroupMode =
    typeof CONTINUOUS_OFFENSE_STRIKE_GROUP_MODES[number];

export type ContinuousOffenseForceEngagementMode =
    typeof CONTINUOUS_OFFENSE_FORCE_ENGAGEMENT_MODES[number];

export type ContinuousOffensePolicy = {
    schemaVersion: typeof CONTINUOUS_OFFENSE_POLICY_SCHEMA_VERSION;
    enabled: boolean;
    mechanism: "continuous_objective_offense";
    informationInterface: TerminalRaceInformationInterface;
    friendlyCalibrationMode: TerminalRaceFriendlyCalibrationMode;
    activationBuildingCount: number;
    activationMinTick: number;
    requireObservedCountAboveThreshold: boolean;
    minTick: number;
    orderIntervalTicks: number;
    reserveCombatants: number;
    strikeGroupMode: ContinuousOffenseStrikeGroupMode;
    forceEngagementMode: ContinuousOffenseForceEngagementMode;
    searchCellSize: number;
    searchRevisitTicks: number;
    maxSearchGroups: number;
    routeCorridorRadius: number;
    interceptHorizonTicks: number;
    baseDefenseHorizonTicks: number;
    blockerLethalDamageFraction: number;
    directCompletionSafetyMarginTicks: number;
    missionLivenessTicks: number;
    requiredSearchCoverageFraction: number;
    blockerReassessmentTicks: number;
};

const exactKeys: Array<keyof ContinuousOffensePolicy> = [
    "schemaVersion", "enabled", "mechanism", "informationInterface",
    "friendlyCalibrationMode", "activationBuildingCount", "activationMinTick",
    "requireObservedCountAboveThreshold", "minTick", "orderIntervalTicks",
    "reserveCombatants", "strikeGroupMode", "forceEngagementMode",
    "searchCellSize", "searchRevisitTicks",
    "maxSearchGroups", "routeCorridorRadius", "interceptHorizonTicks",
    "baseDefenseHorizonTicks", "blockerLethalDamageFraction",
    "directCompletionSafetyMarginTicks", "missionLivenessTicks",
    "requiredSearchCoverageFraction", "blockerReassessmentTicks",
];

const integer = (name: string, value: number, minimum: number, maximum: number): void => {
    if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
        throw new Error(`${name} must be an integer in [${minimum}, ${maximum}], got ${value}`);
    }
};

export const validateContinuousOffensePolicy = (
    policy: ContinuousOffensePolicy,
): ContinuousOffensePolicy => {
    const actual = Object.keys(policy).sort();
    const expected = exactKeys.slice().sort();
    if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
        throw new Error("Continuous-offense policy has an invalid exact schema");
    }
    if (policy.schemaVersion !== CONTINUOUS_OFFENSE_POLICY_SCHEMA_VERSION) {
        throw new Error(`Continuous-offense schemaVersion must be ${CONTINUOUS_OFFENSE_POLICY_SCHEMA_VERSION}`);
    }
    if (policy.mechanism !== "continuous_objective_offense") {
        throw new Error("Continuous-offense mechanism must be continuous_objective_offense");
    }
    if (policy.informationInterface !== "visible_memory" && policy.informationInterface !== "public_complete_state") {
        throw new Error("Continuous-offense information interface is invalid");
    }
    if (
        policy.friendlyCalibrationMode !== "all_specials_fail_closed" &&
        policy.friendlyCalibrationMode !== "ordinary_weapon_role_specific"
    ) throw new Error("Continuous-offense friendly calibration is invalid");
    if (!CONTINUOUS_OFFENSE_STRIKE_GROUP_MODES.includes(policy.strikeGroupMode)) {
        throw new Error("Continuous-offense strike-group mode is invalid");
    }
    if (!CONTINUOUS_OFFENSE_FORCE_ENGAGEMENT_MODES.includes(policy.forceEngagementMode)) {
        throw new Error("Continuous-offense force-engagement mode is invalid");
    }
    if (typeof policy.enabled !== "boolean" || typeof policy.requireObservedCountAboveThreshold !== "boolean") {
        throw new Error("Continuous-offense boolean field is invalid");
    }
    integer("activationBuildingCount", policy.activationBuildingCount, 1, 100);
    integer("activationMinTick", policy.activationMinTick, 0, 100_000);
    integer("minTick", policy.minTick, 0, 100_000);
    integer("orderIntervalTicks", policy.orderIntervalTicks, 1, 10_000);
    integer("reserveCombatants", policy.reserveCombatants, 0, 1_000);
    integer("searchCellSize", policy.searchCellSize, 4, 64);
    integer("searchRevisitTicks", policy.searchRevisitTicks, 0, 100_000);
    integer("maxSearchGroups", policy.maxSearchGroups, 1, 32);
    integer("routeCorridorRadius", policy.routeCorridorRadius, 0, 64);
    integer("interceptHorizonTicks", policy.interceptHorizonTicks, 1, 100_000);
    integer("baseDefenseHorizonTicks", policy.baseDefenseHorizonTicks, 1, 100_000);
    integer("directCompletionSafetyMarginTicks", policy.directCompletionSafetyMarginTicks, 0, 10_000);
    integer("missionLivenessTicks", policy.missionLivenessTicks, 1, 100_000);
    integer("blockerReassessmentTicks", policy.blockerReassessmentTicks, 0, 10_000);
    if (
        !Number.isFinite(policy.blockerLethalDamageFraction) ||
        policy.blockerLethalDamageFraction <= 0 || policy.blockerLethalDamageFraction > 1
    ) throw new Error("blockerLethalDamageFraction must be in (0, 1]");
    if (
        !Number.isFinite(policy.requiredSearchCoverageFraction) ||
        policy.requiredSearchCoverageFraction < 0 || policy.requiredSearchCoverageFraction > 1
    ) throw new Error("requiredSearchCoverageFraction must be in [0, 1]");
    if (policy.activationMinTick > policy.minTick) {
        throw new Error("Continuous-offense activationMinTick cannot exceed minTick");
    }
    return { ...policy };
};

const canonical = (value: unknown): string => JSON.stringify(
    Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([left], [right]) =>
        left.localeCompare(right),
    )),
);

export const continuousOffensePolicySha256 = (policy: ContinuousOffensePolicy): string =>
    createHash("sha256").update(canonical(validateContinuousOffensePolicy(policy))).digest("hex");

export const buildContinuousOffensePolicy = (
    overrides: Partial<ContinuousOffensePolicy> = {},
): ContinuousOffensePolicy => validateContinuousOffensePolicy({
    schemaVersion: CONTINUOUS_OFFENSE_POLICY_SCHEMA_VERSION,
    enabled: true,
    mechanism: "continuous_objective_offense",
    informationInterface: "public_complete_state",
    friendlyCalibrationMode: "ordinary_weapon_role_specific",
    activationBuildingCount: 5,
    activationMinTick: 7_200,
    requireObservedCountAboveThreshold: true,
    minTick: 12_600,
    orderIntervalTicks: 12,
    reserveCombatants: 2,
    strikeGroupMode: "full_compatible_force",
    forceEngagementMode: "route_blockers_only",
    searchCellSize: 12,
    searchRevisitTicks: 600,
    maxSearchGroups: 4,
    routeCorridorRadius: 2,
    interceptHorizonTicks: 2_400,
    baseDefenseHorizonTicks: 2_400,
    blockerLethalDamageFraction: 0.5,
    directCompletionSafetyMarginTicks: 12,
    missionLivenessTicks: 600,
    requiredSearchCoverageFraction: 0.9,
    blockerReassessmentTicks: 12,
    ...overrides,
});
