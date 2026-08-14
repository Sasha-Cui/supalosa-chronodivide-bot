import { createHash } from "node:crypto";
import {
    MISSION_NATIVE_CLOSEOUT_POLICY_V23_SCHEMA_VERSION,
    MissionNativeCloseoutPolicyV23,
    buildMissionNativeCloseoutPolicyV23,
    validateMissionNativeCloseoutPolicyV23,
} from "./missionNativeCloseoutPolicyV23.js";

export const MISSION_NATIVE_CLOSEOUT_POLICY_V24_SCHEMA_VERSION = 24 as const;
export type MissionNativeCloseoutPolicyV24 = Omit<MissionNativeCloseoutPolicyV23, "schemaVersion"> & {
    schemaVersion: typeof MISSION_NATIVE_CLOSEOUT_POLICY_V24_SCHEMA_VERSION;
    adaptiveGroundAssaultReadinessForceOwnership: true;
    progressiveRouteBlockerLaunch: true;
};

const exactKeys: Array<keyof MissionNativeCloseoutPolicyV24> = [
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
];

export const validateMissionNativeCloseoutPolicyV24 = (
    policy: MissionNativeCloseoutPolicyV24,
): MissionNativeCloseoutPolicyV24 => {
    const actual = Object.keys(policy).sort();
    const expected = exactKeys.slice().sort();
    if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
        throw new Error("Mission-native closeout policy v24 has an invalid exact schema");
    }
    const {
        schemaVersion: _schemaVersion,
        adaptiveGroundAssaultReadinessForceOwnership,
        progressiveRouteBlockerLaunch,
        ...v23Fields
    } = policy;
    validateMissionNativeCloseoutPolicyV23({
        ...v23Fields,
        schemaVersion: MISSION_NATIVE_CLOSEOUT_POLICY_V23_SCHEMA_VERSION,
    });
    if (policy.schemaVersion !== 24) {
        throw new Error("Mission-native closeout policy v24 schema version drifted");
    }
    if (adaptiveGroundAssaultReadinessForceOwnership !== true) {
        throw new Error("Mission-native closeout policy v24 readiness-force ownership drifted");
    }
    if (progressiveRouteBlockerLaunch !== true) {
        throw new Error("Mission-native closeout policy v24 progressive-blocker launch drifted");
    }
    return { ...policy };
};

export const buildMissionNativeCloseoutPolicyV24 = (enabled = true): MissionNativeCloseoutPolicyV24 => {
    const { schemaVersion: _schemaVersion, ...v23 } = buildMissionNativeCloseoutPolicyV23(enabled);
    return validateMissionNativeCloseoutPolicyV24({
        ...v23,
        schemaVersion: MISSION_NATIVE_CLOSEOUT_POLICY_V24_SCHEMA_VERSION,
        adaptiveGroundAssaultReadinessForceOwnership: true,
        progressiveRouteBlockerLaunch: true,
    });
};

const canonical = (value: MissionNativeCloseoutPolicyV24): string => JSON.stringify(
    Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right))),
);

export const missionNativeCloseoutPolicyV24Sha256 = (policy: MissionNativeCloseoutPolicyV24): string =>
    createHash("sha256").update(canonical(validateMissionNativeCloseoutPolicyV24(policy))).digest("hex");
