import { createHash } from "node:crypto";
import { MissionNativeCloseoutPolicyV21, buildMissionNativeCloseoutPolicyV21 } from
    "./missionNativeCloseoutPolicyV21.js";

export const MISSION_NATIVE_CLOSEOUT_POLICY_V22_SCHEMA_VERSION = 22 as const;
export type MissionNativeCloseoutPolicyV22 = Omit<MissionNativeCloseoutPolicyV21, "schemaVersion"> & {
    schemaVersion: typeof MISSION_NATIVE_CLOSEOUT_POLICY_V22_SCHEMA_VERSION;
    adaptiveGroundAssaultScreenTargetCount: 4;
};
const exactKeys: Array<keyof MissionNativeCloseoutPolicyV22> = [
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
    "adaptiveGroundAssaultScreenTargetCount",
];
export const validateMissionNativeCloseoutPolicyV22 = (
    policy: MissionNativeCloseoutPolicyV22,
): MissionNativeCloseoutPolicyV22 => {
    const actual = Object.keys(policy).sort();
    const expected = exactKeys.slice().sort();
    if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
        throw new Error("Mission-native closeout policy v22 has an invalid exact schema");
    }
    const { schemaVersion: _schemaVersion, adaptiveGroundAssaultScreenTargetCount, ...v21Fields } = policy;
    const expectedV21 = buildMissionNativeCloseoutPolicyV21(policy.enabled);
    for (const [key, value] of Object.entries(expectedV21)) {
        if (key === "schemaVersion") continue;
        if (v21Fields[key as keyof typeof v21Fields] !== value) {
            throw new Error(`Mission-native closeout policy v22 inherited field ${key} drifted`);
        }
    }
    if (policy.schemaVersion !== 22) throw new Error("Mission-native closeout policy v22 schema version drifted");
    if (adaptiveGroundAssaultScreenTargetCount !== 4) {
        throw new Error("Mission-native closeout policy v22 screen target drifted");
    }
    return { ...policy };
};
export const buildMissionNativeCloseoutPolicyV22 = (enabled = true): MissionNativeCloseoutPolicyV22 => {
    const { schemaVersion: _schemaVersion, ...v21 } = buildMissionNativeCloseoutPolicyV21(enabled);
    return validateMissionNativeCloseoutPolicyV22({
        ...v21,
        schemaVersion: MISSION_NATIVE_CLOSEOUT_POLICY_V22_SCHEMA_VERSION,
        adaptiveGroundAssaultScreenTargetCount: 4,
    });
};
const canonical = (value: MissionNativeCloseoutPolicyV22): string => JSON.stringify(
    Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right))),
);
export const missionNativeCloseoutPolicyV22Sha256 = (policy: MissionNativeCloseoutPolicyV22): string =>
    createHash("sha256").update(canonical(validateMissionNativeCloseoutPolicyV22(policy))).digest("hex");
