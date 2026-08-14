import { createHash } from "node:crypto";
import {
    MISSION_NATIVE_CLOSEOUT_POLICY_V28_SCHEMA_VERSION,
    MissionNativeCloseoutPolicyV28,
    buildMissionNativeCloseoutPolicyV28,
    validateMissionNativeCloseoutPolicyV28,
} from "./missionNativeCloseoutPolicyV28.js";

export const MISSION_NATIVE_CLOSEOUT_POLICY_V29_SCHEMA_VERSION = 29 as const;
export type MissionNativeCloseoutPolicyV29 = Omit<MissionNativeCloseoutPolicyV28, "schemaVersion"> & {
    schemaVersion: typeof MISSION_NATIVE_CLOSEOUT_POLICY_V29_SCHEMA_VERSION;
    preterminalObjectiveFeasibilityRequiresTransferredCapability: true;
};

const exactKeys: Array<keyof MissionNativeCloseoutPolicyV29> = [
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
    "objectiveFeasibilityOverridesGroundAssaultCapability",
    "preterminalRequiresRouteFeasibleLaunch",
    "preterminalObjectiveFeasibilityRequiresTransferredCapability",
];

export const validateMissionNativeCloseoutPolicyV29 = (
    policy: MissionNativeCloseoutPolicyV29,
): MissionNativeCloseoutPolicyV29 => {
    const actual = Object.keys(policy).sort();
    const expected = exactKeys.slice().sort();
    if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
        throw new Error("Mission-native closeout policy v29 has an invalid exact schema");
    }
    const {
        schemaVersion: _schemaVersion,
        preterminalObjectiveFeasibilityRequiresTransferredCapability,
        ...v28Fields
    } = policy;
    validateMissionNativeCloseoutPolicyV28({
        ...v28Fields,
        schemaVersion: MISSION_NATIVE_CLOSEOUT_POLICY_V28_SCHEMA_VERSION,
    });
    if (policy.schemaVersion !== MISSION_NATIVE_CLOSEOUT_POLICY_V29_SCHEMA_VERSION) {
        throw new Error("Mission-native closeout policy v29 schema version drifted");
    }
    if (preterminalObjectiveFeasibilityRequiresTransferredCapability !== true) {
        throw new Error("Mission-native closeout policy v29 preterminal force certification drifted");
    }
    return { ...policy };
};

export const buildMissionNativeCloseoutPolicyV29 = (enabled = true): MissionNativeCloseoutPolicyV29 => {
    const { schemaVersion: _schemaVersion, ...v28 } = buildMissionNativeCloseoutPolicyV28(enabled);
    return validateMissionNativeCloseoutPolicyV29({
        ...v28,
        schemaVersion: MISSION_NATIVE_CLOSEOUT_POLICY_V29_SCHEMA_VERSION,
        preterminalObjectiveFeasibilityRequiresTransferredCapability: true,
    });
};

const canonical = (value: MissionNativeCloseoutPolicyV29): string => JSON.stringify(
    Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right))),
);

export const missionNativeCloseoutPolicyV29Sha256 = (policy: MissionNativeCloseoutPolicyV29): string =>
    createHash("sha256").update(canonical(validateMissionNativeCloseoutPolicyV29(policy))).digest("hex");
