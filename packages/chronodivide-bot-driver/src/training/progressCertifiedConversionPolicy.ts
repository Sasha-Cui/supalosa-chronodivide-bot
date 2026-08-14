import { createHash } from "node:crypto";
import {
    TerminalRaceFriendlyCalibrationMode,
    TerminalRaceInformationInterface,
} from "./terminalRacePolicy.js";

export const PROGRESS_CERTIFIED_CONVERSION_POLICY_SCHEMA_VERSION = 4 as const;

export const PROGRESS_CERTIFIED_CONVERSION_SCOPES = [
    "final_building_only",
    "guarded_low_building_count",
] as const;

export const PROGRESS_CERTIFIED_TERMINAL_FORCE_MODES = [
    "direct_building",
    "route_blockers",
    "progress_certified_hybrid",
] as const;

export type ProgressCertifiedConversionScope =
    typeof PROGRESS_CERTIFIED_CONVERSION_SCOPES[number];

export type ProgressCertifiedTerminalForceMode =
    typeof PROGRESS_CERTIFIED_TERMINAL_FORCE_MODES[number];

export type ProgressCertifiedConversionPolicy = {
    schemaVersion: typeof PROGRESS_CERTIFIED_CONVERSION_POLICY_SCHEMA_VERSION;
    enabled: boolean;
    mechanism: "progress_certified_terminal_conversion";
    informationInterface: TerminalRaceInformationInterface;
    friendlyCalibrationMode: TerminalRaceFriendlyCalibrationMode;
    conversionScope: ProgressCertifiedConversionScope;
    terminalForceMode: ProgressCertifiedTerminalForceMode;
    activationBuildingCount: number;
    activationMinTick: number;
    requireObservedCountAboveThreshold: boolean;
    minTick: number;
    orderIntervalTicks: number;
    ordinaryReserveCombatants: number;
    terminalReserveCombatants: number;
    searchCellSize: number;
    searchRevisitTicks: number;
    maxSearchGroups: number;
    routeCorridorRadius: number;
    interceptHorizonTicks: number;
    baseDefenseHorizonTicks: number;
    blockerLethalDamageFraction: number;
    directCompletionSafetyMarginTicks: number;
    blockerNoDamageDeadlineTicks: number;
    buildingNoDamageDeadlineTicks: number;
    missionSwitchPenaltyTicks: number;
    requiredSearchCoverageFraction: number;
    blockerReassessmentTicks: number;
};

const exactKeys: Array<keyof ProgressCertifiedConversionPolicy> = [
    "schemaVersion", "enabled", "mechanism", "informationInterface",
    "friendlyCalibrationMode", "conversionScope", "terminalForceMode",
    "activationBuildingCount", "activationMinTick",
    "requireObservedCountAboveThreshold", "minTick", "orderIntervalTicks",
    "ordinaryReserveCombatants", "terminalReserveCombatants", "searchCellSize",
    "searchRevisitTicks", "maxSearchGroups", "routeCorridorRadius",
    "interceptHorizonTicks", "baseDefenseHorizonTicks",
    "blockerLethalDamageFraction", "directCompletionSafetyMarginTicks",
    "blockerNoDamageDeadlineTicks", "buildingNoDamageDeadlineTicks",
    "missionSwitchPenaltyTicks", "requiredSearchCoverageFraction",
    "blockerReassessmentTicks",
];

const integer = (name: string, value: number, minimum: number, maximum: number): void => {
    if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
        throw new Error(`${name} must be an integer in [${minimum}, ${maximum}], got ${value}`);
    }
};

export const validateProgressCertifiedConversionPolicy = (
    policy: ProgressCertifiedConversionPolicy,
): ProgressCertifiedConversionPolicy => {
    const actual = Object.keys(policy).sort();
    const expected = exactKeys.slice().sort();
    if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
        throw new Error("Progress-certified conversion policy has an invalid exact schema");
    }
    if (policy.schemaVersion !== PROGRESS_CERTIFIED_CONVERSION_POLICY_SCHEMA_VERSION) {
        throw new Error(
            `Progress-certified conversion schemaVersion must be ${PROGRESS_CERTIFIED_CONVERSION_POLICY_SCHEMA_VERSION}`,
        );
    }
    if (policy.mechanism !== "progress_certified_terminal_conversion") {
        throw new Error("Progress-certified conversion mechanism is invalid");
    }
    if (policy.informationInterface !== "public_complete_state") {
        throw new Error("Progress-certified conversion requires the declared public complete-state interface");
    }
    if (
        policy.friendlyCalibrationMode !== "all_specials_fail_closed" &&
        policy.friendlyCalibrationMode !== "ordinary_weapon_role_specific"
    ) throw new Error("Progress-certified friendly calibration is invalid");
    if (!PROGRESS_CERTIFIED_CONVERSION_SCOPES.includes(policy.conversionScope)) {
        throw new Error("Progress-certified conversion scope is invalid");
    }
    if (!PROGRESS_CERTIFIED_TERMINAL_FORCE_MODES.includes(policy.terminalForceMode)) {
        throw new Error("Progress-certified terminal force mode is invalid");
    }
    if (typeof policy.enabled !== "boolean" || typeof policy.requireObservedCountAboveThreshold !== "boolean") {
        throw new Error("Progress-certified conversion boolean field is invalid");
    }
    integer("activationBuildingCount", policy.activationBuildingCount, 1, 100);
    integer("activationMinTick", policy.activationMinTick, 0, 100_000);
    integer("minTick", policy.minTick, 0, 100_000);
    integer("orderIntervalTicks", policy.orderIntervalTicks, 1, 10_000);
    integer("ordinaryReserveCombatants", policy.ordinaryReserveCombatants, 0, 1_000);
    integer("terminalReserveCombatants", policy.terminalReserveCombatants, 0, 1_000);
    integer("searchCellSize", policy.searchCellSize, 4, 64);
    integer("searchRevisitTicks", policy.searchRevisitTicks, 0, 100_000);
    integer("maxSearchGroups", policy.maxSearchGroups, 1, 32);
    integer("routeCorridorRadius", policy.routeCorridorRadius, 0, 64);
    integer("interceptHorizonTicks", policy.interceptHorizonTicks, 1, 100_000);
    integer("baseDefenseHorizonTicks", policy.baseDefenseHorizonTicks, 1, 100_000);
    integer("directCompletionSafetyMarginTicks", policy.directCompletionSafetyMarginTicks, 0, 10_000);
    integer("blockerNoDamageDeadlineTicks", policy.blockerNoDamageDeadlineTicks, 1, 100_000);
    integer("buildingNoDamageDeadlineTicks", policy.buildingNoDamageDeadlineTicks, 1, 100_000);
    integer("missionSwitchPenaltyTicks", policy.missionSwitchPenaltyTicks, 0, 100_000);
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
        throw new Error("Progress-certified activationMinTick cannot exceed minTick");
    }
    if (policy.terminalReserveCombatants > policy.ordinaryReserveCombatants) {
        throw new Error("Terminal reserve cannot exceed the ordinary reserve");
    }
    if (policy.conversionScope === "final_building_only" && policy.activationBuildingCount !== 1) {
        throw new Error("Final-building-only conversion requires activationBuildingCount=1");
    }
    return { ...policy };
};

const canonical = (value: unknown): string => JSON.stringify(
    Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([left], [right]) =>
        left.localeCompare(right),
    )),
);

export const progressCertifiedConversionPolicySha256 = (
    policy: ProgressCertifiedConversionPolicy,
): string => createHash("sha256")
    .update(canonical(validateProgressCertifiedConversionPolicy(policy)))
    .digest("hex");

export const buildProgressCertifiedConversionPolicy = (
    overrides: Partial<ProgressCertifiedConversionPolicy> = {},
): ProgressCertifiedConversionPolicy => validateProgressCertifiedConversionPolicy({
    schemaVersion: PROGRESS_CERTIFIED_CONVERSION_POLICY_SCHEMA_VERSION,
    enabled: true,
    mechanism: "progress_certified_terminal_conversion",
    informationInterface: "public_complete_state",
    friendlyCalibrationMode: "ordinary_weapon_role_specific",
    conversionScope: "final_building_only",
    terminalForceMode: "progress_certified_hybrid",
    activationBuildingCount: 1,
    activationMinTick: 3_600,
    requireObservedCountAboveThreshold: false,
    minTick: 7_200,
    orderIntervalTicks: 12,
    ordinaryReserveCombatants: 2,
    terminalReserveCombatants: 0,
    searchCellSize: 12,
    searchRevisitTicks: 600,
    maxSearchGroups: 4,
    routeCorridorRadius: 2,
    interceptHorizonTicks: 2_400,
    baseDefenseHorizonTicks: 2_400,
    blockerLethalDamageFraction: 0.5,
    directCompletionSafetyMarginTicks: 12,
    blockerNoDamageDeadlineTicks: 360,
    buildingNoDamageDeadlineTicks: 600,
    missionSwitchPenaltyTicks: 120,
    requiredSearchCoverageFraction: 1,
    blockerReassessmentTicks: 12,
    ...overrides,
});
