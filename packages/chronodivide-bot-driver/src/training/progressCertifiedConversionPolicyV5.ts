import { createHash } from "node:crypto";
import {
    PROGRESS_CERTIFIED_CONVERSION_POLICY_SCHEMA_VERSION,
    ProgressCertifiedConversionPolicy,
    buildProgressCertifiedConversionPolicy,
    validateProgressCertifiedConversionPolicy,
} from "./progressCertifiedConversionPolicy.js";

export const PROGRESS_CERTIFIED_CONVERSION_POLICY_V5_SCHEMA_VERSION = 5 as const;

export const PROGRESS_CERTIFIED_UNSEEN_EXACT_BUILDING_ORDER_MODES = [
    "attack_move_then_visible_attack",
] as const;

export type ProgressCertifiedUnseenExactBuildingOrderMode =
    typeof PROGRESS_CERTIFIED_UNSEEN_EXACT_BUILDING_ORDER_MODES[number];

/**
 * A narrow successor to the frozen schema-v4 policy. Schema v5 changes only
 * how an exact public-state building is approached while it is outside current
 * vision; every activation, force-selection, reserve, and deadline field is
 * inherited unchanged from v4.
 */
export type ProgressCertifiedConversionPolicyV5 =
    Omit<ProgressCertifiedConversionPolicy, "schemaVersion"> & {
        schemaVersion: typeof PROGRESS_CERTIFIED_CONVERSION_POLICY_V5_SCHEMA_VERSION;
        unseenExactBuildingOrderMode: ProgressCertifiedUnseenExactBuildingOrderMode;
    };

const exactKeys: Array<keyof ProgressCertifiedConversionPolicyV5> = [
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
    "blockerReassessmentTicks", "unseenExactBuildingOrderMode",
];

export const validateProgressCertifiedConversionPolicyV5 = (
    policy: ProgressCertifiedConversionPolicyV5,
): ProgressCertifiedConversionPolicyV5 => {
    const actual = Object.keys(policy).sort();
    const expected = exactKeys.slice().sort();
    if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
        throw new Error("Progress-certified conversion policy v5 has an invalid exact schema");
    }
    if (policy.schemaVersion !== PROGRESS_CERTIFIED_CONVERSION_POLICY_V5_SCHEMA_VERSION) {
        throw new Error(
            `Progress-certified conversion v5 schemaVersion must be ${PROGRESS_CERTIFIED_CONVERSION_POLICY_V5_SCHEMA_VERSION}`,
        );
    }
    if (!PROGRESS_CERTIFIED_UNSEEN_EXACT_BUILDING_ORDER_MODES.includes(
        policy.unseenExactBuildingOrderMode,
    )) {
        throw new Error("Progress-certified conversion v5 unseen exact-building order mode is invalid");
    }
    const {
        schemaVersion: ignoredSchemaVersion,
        unseenExactBuildingOrderMode: ignoredUnseenExactBuildingOrderMode,
        ...legacyFields
    } = policy;
    void ignoredSchemaVersion;
    void ignoredUnseenExactBuildingOrderMode;
    validateProgressCertifiedConversionPolicy({
        ...legacyFields,
        schemaVersion: PROGRESS_CERTIFIED_CONVERSION_POLICY_SCHEMA_VERSION,
    });
    return { ...policy };
};

const canonical = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(canonical);
    if (value && typeof value === "object") {
        return Object.fromEntries(Object.entries(value as Record<string, unknown>)
            .sort(([left], [right]) => left.localeCompare(right))
            .map(([key, item]) => [key, canonical(item)]));
    }
    return value;
};

export const progressCertifiedConversionPolicyV5Sha256 = (
    policy: ProgressCertifiedConversionPolicyV5,
): string => createHash("sha256")
    .update(JSON.stringify(canonical(validateProgressCertifiedConversionPolicyV5(policy))))
    .digest("hex");

export const buildProgressCertifiedConversionPolicyV5 = (
    overrides: Partial<ProgressCertifiedConversionPolicyV5> = {},
): ProgressCertifiedConversionPolicyV5 => {
    const {
        schemaVersion: ignoredSchemaVersion,
        unseenExactBuildingOrderMode = "attack_move_then_visible_attack",
        ...legacyOverrides
    } = overrides;
    if (
        ignoredSchemaVersion !== undefined &&
        ignoredSchemaVersion !== PROGRESS_CERTIFIED_CONVERSION_POLICY_V5_SCHEMA_VERSION
    ) {
        throw new Error(
            `Progress-certified conversion v5 schemaVersion must be ${PROGRESS_CERTIFIED_CONVERSION_POLICY_V5_SCHEMA_VERSION}`,
        );
    }
    const legacy = buildProgressCertifiedConversionPolicy(
        legacyOverrides as Partial<ProgressCertifiedConversionPolicy>,
    );
    return validateProgressCertifiedConversionPolicyV5({
        ...legacy,
        schemaVersion: PROGRESS_CERTIFIED_CONVERSION_POLICY_V5_SCHEMA_VERSION,
        unseenExactBuildingOrderMode,
    });
};
