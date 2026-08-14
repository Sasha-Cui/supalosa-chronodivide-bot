import { createHash } from "node:crypto";
import {
    MissionNativeCloseoutPolicyV16,
    buildMissionNativeCloseoutPolicyV16,
} from "./missionNativeCloseoutPolicyV16.js";

export const MISSION_NATIVE_CLOSEOUT_POLICY_V17_SCHEMA_VERSION = 17 as const;

export type MissionNativeCloseoutPolicyV17 = Omit<
    MissionNativeCloseoutPolicyV16,
    "schemaVersion"
> & {
    schemaVersion: typeof MISSION_NATIVE_CLOSEOUT_POLICY_V17_SCHEMA_VERSION;
    adaptiveGroundAssaultInfrastructure: true;
};

const exactKeys: Array<keyof MissionNativeCloseoutPolicyV17> = [
    "schemaVersion", "enabled", "mechanism", "informationInterface",
    "activationMode", "maxEnemyBuildings", "minTick", "minCombatants",
    "reserveCombatants", "orderIntervalTicks", "maxTargetGroups", "targetPriority",
    "observationMode", "directVisibleAttack", "preemptExistingAttacks",
    "sweepWhenNoTargets", "capabilityAwareAttackers", "reachabilityAwareTargets",
    "stallTicks", "reassignStalledTargets", "engagementMode", "routeCorridorRadius",
    "engagementAllocationMode", "retargetStalledBuildings", "commitRouteBlocker",
    "readinessReserve", "readinessReserveScope", "adaptiveGroundAssaultTargetCount",
    "adaptiveGroundAssaultInfrastructure",
];

export const validateMissionNativeCloseoutPolicyV17 = (
    policy: MissionNativeCloseoutPolicyV17,
): MissionNativeCloseoutPolicyV17 => {
    const actual = Object.keys(policy).sort();
    const expected = exactKeys.slice().sort();
    if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
        throw new Error("Mission-native closeout policy v17 has an invalid exact schema");
    }
    const {
        schemaVersion: _schemaVersion,
        adaptiveGroundAssaultInfrastructure,
        ...v16Fields
    } = policy;
    const expectedV16 = buildMissionNativeCloseoutPolicyV16(policy.enabled);
    for (const [key, value] of Object.entries(expectedV16)) {
        if (key === "schemaVersion") continue;
        if (v16Fields[key as keyof typeof v16Fields] !== value) {
            throw new Error(`Mission-native closeout policy v17 inherited field ${key} drifted`);
        }
    }
    if (policy.schemaVersion !== MISSION_NATIVE_CLOSEOUT_POLICY_V17_SCHEMA_VERSION) {
        throw new Error("Mission-native closeout policy v17 schema version drifted");
    }
    if (adaptiveGroundAssaultInfrastructure !== true) {
        throw new Error("Mission-native closeout policy v17 assault-infrastructure representation drifted");
    }
    return { ...policy };
};

export const buildMissionNativeCloseoutPolicyV17 = (
    enabled = true,
): MissionNativeCloseoutPolicyV17 => {
    const {
        schemaVersion: _schemaVersion,
        ...v16
    } = buildMissionNativeCloseoutPolicyV16(enabled);
    return validateMissionNativeCloseoutPolicyV17({
        ...v16,
        schemaVersion: MISSION_NATIVE_CLOSEOUT_POLICY_V17_SCHEMA_VERSION,
        adaptiveGroundAssaultInfrastructure: true,
    });
};

const canonical = (value: MissionNativeCloseoutPolicyV17): string => JSON.stringify(
    Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right))),
);

export const missionNativeCloseoutPolicyV17Sha256 = (
    policy: MissionNativeCloseoutPolicyV17,
): string => createHash("sha256")
    .update(canonical(validateMissionNativeCloseoutPolicyV17(policy)))
    .digest("hex");
