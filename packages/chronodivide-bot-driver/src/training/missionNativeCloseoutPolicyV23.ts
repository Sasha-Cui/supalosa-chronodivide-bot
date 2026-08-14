import { createHash } from "node:crypto";
import {
    MISSION_NATIVE_CLOSEOUT_POLICY_V22_SCHEMA_VERSION,
    MissionNativeCloseoutPolicyV22,
    buildMissionNativeCloseoutPolicyV22,
    validateMissionNativeCloseoutPolicyV22,
} from "./missionNativeCloseoutPolicyV22.js";

export const MISSION_NATIVE_CLOSEOUT_POLICY_V23_SCHEMA_VERSION = 23 as const;
export type MissionNativeCloseoutPolicyV23 = Omit<MissionNativeCloseoutPolicyV22, "schemaVersion"> & {
    schemaVersion: typeof MISSION_NATIVE_CLOSEOUT_POLICY_V23_SCHEMA_VERSION;
    adaptiveGroundAssaultScreenFactoryTrigger: true;
};

const exactKeys: Array<keyof MissionNativeCloseoutPolicyV23> = [
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
];

export const validateMissionNativeCloseoutPolicyV23 = (
    policy: MissionNativeCloseoutPolicyV23,
): MissionNativeCloseoutPolicyV23 => {
    const actual = Object.keys(policy).sort();
    const expected = exactKeys.slice().sort();
    if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
        throw new Error("Mission-native closeout policy v23 has an invalid exact schema");
    }
    const {
        schemaVersion: _schemaVersion,
        adaptiveGroundAssaultScreenFactoryTrigger,
        ...v22Fields
    } = policy;
    validateMissionNativeCloseoutPolicyV22({
        ...v22Fields,
        schemaVersion: MISSION_NATIVE_CLOSEOUT_POLICY_V22_SCHEMA_VERSION,
    });
    if (policy.schemaVersion !== 23) {
        throw new Error("Mission-native closeout policy v23 schema version drifted");
    }
    if (adaptiveGroundAssaultScreenFactoryTrigger !== true) {
        throw new Error("Mission-native closeout policy v23 factory trigger drifted");
    }
    return { ...policy };
};

export const buildMissionNativeCloseoutPolicyV23 = (enabled = true): MissionNativeCloseoutPolicyV23 => {
    const { schemaVersion: _schemaVersion, ...v22 } = buildMissionNativeCloseoutPolicyV22(enabled);
    return validateMissionNativeCloseoutPolicyV23({
        ...v22,
        schemaVersion: MISSION_NATIVE_CLOSEOUT_POLICY_V23_SCHEMA_VERSION,
        adaptiveGroundAssaultScreenFactoryTrigger: true,
    });
};

const canonical = (value: MissionNativeCloseoutPolicyV23): string => JSON.stringify(
    Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right))),
);

export const missionNativeCloseoutPolicyV23Sha256 = (policy: MissionNativeCloseoutPolicyV23): string =>
    createHash("sha256").update(canonical(validateMissionNativeCloseoutPolicyV23(policy))).digest("hex");
