import { createHash } from "node:crypto";
import {
    MISSION_NATIVE_CLOSEOUT_POLICY_V26_SCHEMA_VERSION,
    MissionNativeCloseoutPolicyV26,
    buildMissionNativeCloseoutPolicyV26,
    validateMissionNativeCloseoutPolicyV26,
} from "./missionNativeCloseoutPolicyV26.js";

export const MISSION_NATIVE_CLOSEOUT_POLICY_V27_SCHEMA_VERSION = 27 as const;
export type MissionNativeCloseoutPolicyV27 = Omit<MissionNativeCloseoutPolicyV26, "schemaVersion"> & {
    schemaVersion: typeof MISSION_NATIVE_CLOSEOUT_POLICY_V27_SCHEMA_VERSION;
    persistentCloseoutActivationScope: true;
    requireTransferredGroundAssaultCapabilityForActivation: true;
};

const exactKeys: Array<keyof MissionNativeCloseoutPolicyV27> = [
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
    "positiveProgressBlockerLaunch", "persistentCloseoutActivationScope",
    "requireTransferredGroundAssaultCapabilityForActivation",
];

export const validateMissionNativeCloseoutPolicyV27 = (
    policy: MissionNativeCloseoutPolicyV27,
): MissionNativeCloseoutPolicyV27 => {
    const actual = Object.keys(policy).sort();
    const expected = exactKeys.slice().sort();
    if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
        throw new Error("Mission-native closeout policy v27 has an invalid exact schema");
    }
    const {
        schemaVersion: _schemaVersion,
        persistentCloseoutActivationScope,
        requireTransferredGroundAssaultCapabilityForActivation,
        ...v26Fields
    } = policy;
    validateMissionNativeCloseoutPolicyV26({
        ...v26Fields,
        schemaVersion: MISSION_NATIVE_CLOSEOUT_POLICY_V26_SCHEMA_VERSION,
    });
    if (policy.schemaVersion !== MISSION_NATIVE_CLOSEOUT_POLICY_V27_SCHEMA_VERSION) {
        throw new Error("Mission-native closeout policy v27 schema version drifted");
    }
    if (persistentCloseoutActivationScope !== true) {
        throw new Error("Mission-native closeout policy v27 persistent activation scope drifted");
    }
    if (requireTransferredGroundAssaultCapabilityForActivation !== true) {
        throw new Error("Mission-native closeout policy v27 transferred capability drifted");
    }
    return { ...policy };
};

export const buildMissionNativeCloseoutPolicyV27 = (enabled = true): MissionNativeCloseoutPolicyV27 => {
    const { schemaVersion: _schemaVersion, ...v26 } = buildMissionNativeCloseoutPolicyV26(enabled);
    return validateMissionNativeCloseoutPolicyV27({
        ...v26,
        schemaVersion: MISSION_NATIVE_CLOSEOUT_POLICY_V27_SCHEMA_VERSION,
        persistentCloseoutActivationScope: true,
        requireTransferredGroundAssaultCapabilityForActivation: true,
    });
};

const canonical = (value: MissionNativeCloseoutPolicyV27): string => JSON.stringify(
    Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right))),
);

export const missionNativeCloseoutPolicyV27Sha256 = (policy: MissionNativeCloseoutPolicyV27): string =>
    createHash("sha256").update(canonical(validateMissionNativeCloseoutPolicyV27(policy))).digest("hex");
