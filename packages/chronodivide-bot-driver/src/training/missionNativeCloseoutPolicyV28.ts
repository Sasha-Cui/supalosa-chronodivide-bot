import { createHash } from "node:crypto";
import {
    MISSION_NATIVE_CLOSEOUT_POLICY_V27_SCHEMA_VERSION,
    MissionNativeCloseoutPolicyV27,
    buildMissionNativeCloseoutPolicyV27,
    validateMissionNativeCloseoutPolicyV27,
} from "./missionNativeCloseoutPolicyV27.js";

export const MISSION_NATIVE_CLOSEOUT_POLICY_V28_SCHEMA_VERSION = 28 as const;
export type MissionNativeCloseoutPolicyV28 = Omit<MissionNativeCloseoutPolicyV27, "schemaVersion"> & {
    schemaVersion: typeof MISSION_NATIVE_CLOSEOUT_POLICY_V28_SCHEMA_VERSION;
    objectiveFeasibilityOverridesGroundAssaultCapability: true;
    preterminalRequiresRouteFeasibleLaunch: true;
};

const exactKeys: Array<keyof MissionNativeCloseoutPolicyV28> = [
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
];

export const validateMissionNativeCloseoutPolicyV28 = (
    policy: MissionNativeCloseoutPolicyV28,
): MissionNativeCloseoutPolicyV28 => {
    const actual = Object.keys(policy).sort();
    const expected = exactKeys.slice().sort();
    if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
        throw new Error("Mission-native closeout policy v28 has an invalid exact schema");
    }
    const {
        schemaVersion: _schemaVersion,
        objectiveFeasibilityOverridesGroundAssaultCapability,
        preterminalRequiresRouteFeasibleLaunch,
        ...v27Fields
    } = policy;
    validateMissionNativeCloseoutPolicyV27({
        ...v27Fields,
        schemaVersion: MISSION_NATIVE_CLOSEOUT_POLICY_V27_SCHEMA_VERSION,
    });
    if (policy.schemaVersion !== MISSION_NATIVE_CLOSEOUT_POLICY_V28_SCHEMA_VERSION) {
        throw new Error("Mission-native closeout policy v28 schema version drifted");
    }
    if (objectiveFeasibilityOverridesGroundAssaultCapability !== true) {
        throw new Error("Mission-native closeout policy v28 objective-feasibility override drifted");
    }
    if (preterminalRequiresRouteFeasibleLaunch !== true) {
        throw new Error("Mission-native closeout policy v28 preterminal route-feasibility drifted");
    }
    return { ...policy };
};

export const buildMissionNativeCloseoutPolicyV28 = (enabled = true): MissionNativeCloseoutPolicyV28 => {
    const { schemaVersion: _schemaVersion, ...v27 } = buildMissionNativeCloseoutPolicyV27(enabled);
    return validateMissionNativeCloseoutPolicyV28({
        ...v27,
        schemaVersion: MISSION_NATIVE_CLOSEOUT_POLICY_V28_SCHEMA_VERSION,
        objectiveFeasibilityOverridesGroundAssaultCapability: true,
        preterminalRequiresRouteFeasibleLaunch: true,
    });
};

const canonical = (value: MissionNativeCloseoutPolicyV28): string => JSON.stringify(
    Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right))),
);

export const missionNativeCloseoutPolicyV28Sha256 = (policy: MissionNativeCloseoutPolicyV28): string =>
    createHash("sha256").update(canonical(validateMissionNativeCloseoutPolicyV28(policy))).digest("hex");
