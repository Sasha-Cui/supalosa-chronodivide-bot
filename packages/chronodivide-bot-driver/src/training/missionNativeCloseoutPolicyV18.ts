import { createHash } from "node:crypto";
import {
    MissionNativeCloseoutPolicyV17,
    buildMissionNativeCloseoutPolicyV17,
} from "./missionNativeCloseoutPolicyV17.js";

export const MISSION_NATIVE_CLOSEOUT_POLICY_V18_SCHEMA_VERSION = 18 as const;

export type MissionNativeCloseoutPolicyV18 = Omit<
    MissionNativeCloseoutPolicyV17,
    "schemaVersion"
> & {
    schemaVersion: typeof MISSION_NATIVE_CLOSEOUT_POLICY_V18_SCHEMA_VERSION;
    adaptiveGroundAssaultInfrastructurePriority: 300;
};

const exactKeys: Array<keyof MissionNativeCloseoutPolicyV18> = [
    "schemaVersion", "enabled", "mechanism", "informationInterface",
    "activationMode", "maxEnemyBuildings", "minTick", "minCombatants",
    "reserveCombatants", "orderIntervalTicks", "maxTargetGroups", "targetPriority",
    "observationMode", "directVisibleAttack", "preemptExistingAttacks",
    "sweepWhenNoTargets", "capabilityAwareAttackers", "reachabilityAwareTargets",
    "stallTicks", "reassignStalledTargets", "engagementMode", "routeCorridorRadius",
    "engagementAllocationMode", "retargetStalledBuildings", "commitRouteBlocker",
    "readinessReserve", "readinessReserveScope", "adaptiveGroundAssaultTargetCount",
    "adaptiveGroundAssaultInfrastructure", "adaptiveGroundAssaultInfrastructurePriority",
];

export const validateMissionNativeCloseoutPolicyV18 = (
    policy: MissionNativeCloseoutPolicyV18,
): MissionNativeCloseoutPolicyV18 => {
    const actual = Object.keys(policy).sort();
    const expected = exactKeys.slice().sort();
    if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
        throw new Error("Mission-native closeout policy v18 has an invalid exact schema");
    }
    const {
        schemaVersion: _schemaVersion,
        adaptiveGroundAssaultInfrastructurePriority,
        ...v17Fields
    } = policy;
    const expectedV17 = buildMissionNativeCloseoutPolicyV17(policy.enabled);
    for (const [key, value] of Object.entries(expectedV17)) {
        if (key === "schemaVersion") continue;
        if (v17Fields[key as keyof typeof v17Fields] !== value) {
            throw new Error(`Mission-native closeout policy v18 inherited field ${key} drifted`);
        }
    }
    if (policy.schemaVersion !== MISSION_NATIVE_CLOSEOUT_POLICY_V18_SCHEMA_VERSION) {
        throw new Error("Mission-native closeout policy v18 schema version drifted");
    }
    if (adaptiveGroundAssaultInfrastructurePriority !== 300) {
        throw new Error("Mission-native closeout policy v18 assault-infrastructure priority drifted");
    }
    return { ...policy };
};

export const buildMissionNativeCloseoutPolicyV18 = (
    enabled = true,
): MissionNativeCloseoutPolicyV18 => {
    const {
        schemaVersion: _schemaVersion,
        ...v17
    } = buildMissionNativeCloseoutPolicyV17(enabled);
    return validateMissionNativeCloseoutPolicyV18({
        ...v17,
        schemaVersion: MISSION_NATIVE_CLOSEOUT_POLICY_V18_SCHEMA_VERSION,
        adaptiveGroundAssaultInfrastructurePriority: 300,
    });
};

const canonical = (value: MissionNativeCloseoutPolicyV18): string => JSON.stringify(
    Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right))),
);

export const missionNativeCloseoutPolicyV18Sha256 = (
    policy: MissionNativeCloseoutPolicyV18,
): string => createHash("sha256")
    .update(canonical(validateMissionNativeCloseoutPolicyV18(policy)))
    .digest("hex");
