import { createHash } from "node:crypto";
import {
    MissionNativeCloseoutPolicyV19,
    buildMissionNativeCloseoutPolicyV19,
} from "./missionNativeCloseoutPolicyV19.js";

export const MISSION_NATIVE_CLOSEOUT_POLICY_V20_SCHEMA_VERSION = 20 as const;

export type MissionNativeCloseoutPolicyV20 = Omit<
    MissionNativeCloseoutPolicyV19,
    "schemaVersion"
> & {
    schemaVersion: typeof MISSION_NATIVE_CLOSEOUT_POLICY_V20_SCHEMA_VERSION;
    adaptiveGroundAssaultProductionScopeLatch: true;
};

const exactKeys: Array<keyof MissionNativeCloseoutPolicyV20> = [
    "schemaVersion", "enabled", "mechanism", "informationInterface",
    "activationMode", "maxEnemyBuildings", "minTick", "minCombatants",
    "reserveCombatants", "orderIntervalTicks", "maxTargetGroups", "targetPriority",
    "observationMode", "directVisibleAttack", "preemptExistingAttacks",
    "sweepWhenNoTargets", "capabilityAwareAttackers", "reachabilityAwareTargets",
    "stallTicks", "reassignStalledTargets", "engagementMode", "routeCorridorRadius",
    "engagementAllocationMode", "retargetStalledBuildings", "commitRouteBlocker",
    "readinessReserve", "readinessReserveScope", "adaptiveGroundAssaultTargetCount",
    "adaptiveGroundAssaultInfrastructure", "adaptiveGroundAssaultInfrastructurePriority",
    "adaptiveGroundAssaultProductionReservation", "adaptiveGroundAssaultProductionScopeLatch",
];

export const validateMissionNativeCloseoutPolicyV20 = (
    policy: MissionNativeCloseoutPolicyV20,
): MissionNativeCloseoutPolicyV20 => {
    const actual = Object.keys(policy).sort();
    const expected = exactKeys.slice().sort();
    if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
        throw new Error("Mission-native closeout policy v20 has an invalid exact schema");
    }
    const {
        schemaVersion: _schemaVersion,
        adaptiveGroundAssaultProductionScopeLatch,
        ...v19Fields
    } = policy;
    const expectedV19 = buildMissionNativeCloseoutPolicyV19(policy.enabled);
    for (const [key, value] of Object.entries(expectedV19)) {
        if (key === "schemaVersion") continue;
        if (v19Fields[key as keyof typeof v19Fields] !== value) {
            throw new Error(`Mission-native closeout policy v20 inherited field ${key} drifted`);
        }
    }
    if (policy.schemaVersion !== MISSION_NATIVE_CLOSEOUT_POLICY_V20_SCHEMA_VERSION) {
        throw new Error("Mission-native closeout policy v20 schema version drifted");
    }
    if (adaptiveGroundAssaultProductionScopeLatch !== true) {
        throw new Error("Mission-native closeout policy v20 production-scope latch drifted");
    }
    return { ...policy };
};

export const buildMissionNativeCloseoutPolicyV20 = (
    enabled = true,
): MissionNativeCloseoutPolicyV20 => {
    const {
        schemaVersion: _schemaVersion,
        ...v19
    } = buildMissionNativeCloseoutPolicyV19(enabled);
    return validateMissionNativeCloseoutPolicyV20({
        ...v19,
        schemaVersion: MISSION_NATIVE_CLOSEOUT_POLICY_V20_SCHEMA_VERSION,
        adaptiveGroundAssaultProductionScopeLatch: true,
    });
};

const canonical = (value: MissionNativeCloseoutPolicyV20): string => JSON.stringify(
    Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right))),
);

export const missionNativeCloseoutPolicyV20Sha256 = (
    policy: MissionNativeCloseoutPolicyV20,
): string => createHash("sha256")
    .update(canonical(validateMissionNativeCloseoutPolicyV20(policy)))
    .digest("hex");
