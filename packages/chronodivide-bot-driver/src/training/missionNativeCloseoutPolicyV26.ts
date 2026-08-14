import { createHash } from "node:crypto";
import {
    MISSION_NATIVE_CLOSEOUT_POLICY_V25_SCHEMA_VERSION,
    MissionNativeCloseoutPolicyV25,
    buildMissionNativeCloseoutPolicyV25,
    validateMissionNativeCloseoutPolicyV25,
} from "./missionNativeCloseoutPolicyV25.js";

export const MISSION_NATIVE_CLOSEOUT_POLICY_V26_SCHEMA_VERSION = 26 as const;
export type MissionNativeCloseoutPolicyV26 = Omit<MissionNativeCloseoutPolicyV25, "schemaVersion"> & {
    schemaVersion: typeof MISSION_NATIVE_CLOSEOUT_POLICY_V26_SCHEMA_VERSION;
    queueAwareGroundAssaultTargets: true;
    positiveProgressBlockerLaunch: true;
};

const exactKeys: Array<keyof MissionNativeCloseoutPolicyV26> = [
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
    "requireGroundAssaultCapabilityForActivation", "queueAwareGroundAssaultTargets",
    "positiveProgressBlockerLaunch",
];

export const validateMissionNativeCloseoutPolicyV26 = (
    policy: MissionNativeCloseoutPolicyV26,
): MissionNativeCloseoutPolicyV26 => {
    const actual = Object.keys(policy).sort();
    const expected = exactKeys.slice().sort();
    if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
        throw new Error("Mission-native closeout policy v26 has an invalid exact schema");
    }
    const {
        schemaVersion: _schemaVersion,
        queueAwareGroundAssaultTargets,
        positiveProgressBlockerLaunch,
        ...v25Fields
    } = policy;
    validateMissionNativeCloseoutPolicyV25({
        ...v25Fields,
        schemaVersion: MISSION_NATIVE_CLOSEOUT_POLICY_V25_SCHEMA_VERSION,
    });
    if (policy.schemaVersion !== 26) {
        throw new Error("Mission-native closeout policy v26 schema version drifted");
    }
    if (queueAwareGroundAssaultTargets !== true) {
        throw new Error("Mission-native closeout policy v26 queue-aware targets drifted");
    }
    if (positiveProgressBlockerLaunch !== true) {
        throw new Error("Mission-native closeout policy v26 positive-progress launch drifted");
    }
    return { ...policy };
};

export const buildMissionNativeCloseoutPolicyV26 = (enabled = true): MissionNativeCloseoutPolicyV26 => {
    const { schemaVersion: _schemaVersion, ...v25 } = buildMissionNativeCloseoutPolicyV25(enabled);
    return validateMissionNativeCloseoutPolicyV26({
        ...v25,
        schemaVersion: MISSION_NATIVE_CLOSEOUT_POLICY_V26_SCHEMA_VERSION,
        queueAwareGroundAssaultTargets: true,
        positiveProgressBlockerLaunch: true,
    });
};

const canonical = (value: MissionNativeCloseoutPolicyV26): string => JSON.stringify(
    Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right))),
);

export const missionNativeCloseoutPolicyV26Sha256 = (policy: MissionNativeCloseoutPolicyV26): string =>
    createHash("sha256").update(canonical(validateMissionNativeCloseoutPolicyV26(policy))).digest("hex");
