import { createHash } from "node:crypto";
import { MissionNativeCloseoutPolicyV20, buildMissionNativeCloseoutPolicyV20 } from
    "./missionNativeCloseoutPolicyV20.js";

export const MISSION_NATIVE_CLOSEOUT_POLICY_V21_SCHEMA_VERSION = 21 as const;
export type MissionNativeCloseoutPolicyV21 = Omit<MissionNativeCloseoutPolicyV20, "schemaVersion"> & {
    schemaVersion: typeof MISSION_NATIVE_CLOSEOUT_POLICY_V21_SCHEMA_VERSION;
    readinessReserveDefenseRadius: 12;
};
const exactKeys: Array<keyof MissionNativeCloseoutPolicyV21> = [
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
];
export const validateMissionNativeCloseoutPolicyV21 = (
    policy: MissionNativeCloseoutPolicyV21,
): MissionNativeCloseoutPolicyV21 => {
    const actual = Object.keys(policy).sort();
    const expected = exactKeys.slice().sort();
    if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
        throw new Error("Mission-native closeout policy v21 has an invalid exact schema");
    }
    const { schemaVersion: _schemaVersion, readinessReserveDefenseRadius, ...v20Fields } = policy;
    const expectedV20 = buildMissionNativeCloseoutPolicyV20(policy.enabled);
    for (const [key, value] of Object.entries(expectedV20)) {
        if (key === "schemaVersion") continue;
        if (v20Fields[key as keyof typeof v20Fields] !== value) {
            throw new Error(`Mission-native closeout policy v21 inherited field ${key} drifted`);
        }
    }
    if (policy.schemaVersion !== 21) throw new Error("Mission-native closeout policy v21 schema version drifted");
    if (readinessReserveDefenseRadius !== 12) throw new Error("Mission-native closeout policy v21 defense radius drifted");
    return { ...policy };
};
export const buildMissionNativeCloseoutPolicyV21 = (enabled = true): MissionNativeCloseoutPolicyV21 => {
    const { schemaVersion: _schemaVersion, ...v20 } = buildMissionNativeCloseoutPolicyV20(enabled);
    return validateMissionNativeCloseoutPolicyV21({
        ...v20,
        schemaVersion: MISSION_NATIVE_CLOSEOUT_POLICY_V21_SCHEMA_VERSION,
        readinessReserveDefenseRadius: 12,
    });
};
const canonical = (value: MissionNativeCloseoutPolicyV21): string => JSON.stringify(
    Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right))),
);
export const missionNativeCloseoutPolicyV21Sha256 = (policy: MissionNativeCloseoutPolicyV21): string =>
    createHash("sha256").update(canonical(validateMissionNativeCloseoutPolicyV21(policy))).digest("hex");
