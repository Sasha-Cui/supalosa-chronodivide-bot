import { createHash } from "node:crypto";
import {
    MISSION_NATIVE_CLOSEOUT_POLICY_V24_SCHEMA_VERSION,
    MissionNativeCloseoutPolicyV24,
    buildMissionNativeCloseoutPolicyV24,
    validateMissionNativeCloseoutPolicyV24,
} from "./missionNativeCloseoutPolicyV24.js";

export const MISSION_NATIVE_CLOSEOUT_POLICY_V25_SCHEMA_VERSION = 25 as const;
export type MissionNativeCloseoutPolicyV25 = Omit<MissionNativeCloseoutPolicyV24, "schemaVersion"> & {
    schemaVersion: typeof MISSION_NATIVE_CLOSEOUT_POLICY_V25_SCHEMA_VERSION;
    requireGroundAssaultCapabilityForActivation: true;
};

const exactKeys: Array<keyof MissionNativeCloseoutPolicyV25> = [
    "schemaVersion", "enabled", "mechanism", "informationInterface", "activationMode",
    "maxEnemyBuildings", "minTick", "minCombatants", "reserveCombatants", "orderIntervalTicks",
    "maxTargetGroups", "targetPriority", "observationMode", "directVisibleAttack",
    "preemptExistingAttacks", "sweepWhenNoTargets", "capabilityAwareAttackers",
    "reachabilityAwareTargets", "stallTicks", "reassignStalledTargets", "engagementMode",
    "routeCorridorRadius", "engagementAllocationMode", "retargetStalledBuildings",
    "commitRouteBlocker", "readinessReserve", "readinessReserveScope",
    "adaptiveGroundAssaultTargetCount", "adaptiveGroundAssaultInfrastructure",
    "adaptiveGroundAssaultInfrastructurePriority", "adaptiveGroundAssaultProductionReservation",
    "adaptiveGroundAssaultProductionScopeLatch", "readinessReserveDefenseRadius",
    "adaptiveGroundAssaultScreenTargetCount", "adaptiveGroundAssaultScreenFactoryTrigger",
    "adaptiveGroundAssaultReadinessForceOwnership", "progressiveRouteBlockerLaunch",
    "requireGroundAssaultCapabilityForActivation",
];

export const validateMissionNativeCloseoutPolicyV25 = (
    policy: MissionNativeCloseoutPolicyV25,
): MissionNativeCloseoutPolicyV25 => {
    const actual = Object.keys(policy).sort();
    const expected = exactKeys.slice().sort();
    if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
        throw new Error("Mission-native closeout policy v25 has an invalid exact schema");
    }
    const {
        schemaVersion: _schemaVersion,
        requireGroundAssaultCapabilityForActivation,
        ...v24Fields
    } = policy;
    validateMissionNativeCloseoutPolicyV24({
        ...v24Fields,
        schemaVersion: MISSION_NATIVE_CLOSEOUT_POLICY_V24_SCHEMA_VERSION,
    });
    if (policy.schemaVersion !== 25) {
        throw new Error("Mission-native closeout policy v25 schema version drifted");
    }
    if (requireGroundAssaultCapabilityForActivation !== true) {
        throw new Error("Mission-native closeout policy v25 activation capability drifted");
    }
    return { ...policy };
};

export const buildMissionNativeCloseoutPolicyV25 = (enabled = true): MissionNativeCloseoutPolicyV25 => {
    const { schemaVersion: _schemaVersion, ...v24 } = buildMissionNativeCloseoutPolicyV24(enabled);
    return validateMissionNativeCloseoutPolicyV25({
        ...v24,
        schemaVersion: MISSION_NATIVE_CLOSEOUT_POLICY_V25_SCHEMA_VERSION,
        requireGroundAssaultCapabilityForActivation: true,
    });
};

const canonical = (value: MissionNativeCloseoutPolicyV25): string => JSON.stringify(
    Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right))),
);

export const missionNativeCloseoutPolicyV25Sha256 = (policy: MissionNativeCloseoutPolicyV25): string =>
    createHash("sha256").update(canonical(validateMissionNativeCloseoutPolicyV25(policy))).digest("hex");
