import { createHash } from "node:crypto";
import {
    MissionNativeCloseoutPolicyV3,
    buildMissionNativeCloseoutPolicyV3,
} from "./missionNativeCloseoutPolicyV3.js";

export const MISSION_NATIVE_CLOSEOUT_POLICY_V4_SCHEMA_VERSION = 4 as const;

export type MissionNativeCloseoutPolicyV4 = Omit<MissionNativeCloseoutPolicyV3, "schemaVersion"> & {
    schemaVersion: typeof MISSION_NATIVE_CLOSEOUT_POLICY_V4_SCHEMA_VERSION;
    retargetStalledBuildings: true;
};

const exactKeys: Array<keyof MissionNativeCloseoutPolicyV4> = [
    "schemaVersion", "enabled", "mechanism", "informationInterface",
    "activationMode", "maxEnemyBuildings", "minTick", "minCombatants",
    "reserveCombatants", "orderIntervalTicks", "maxTargetGroups", "targetPriority",
    "observationMode", "directVisibleAttack", "preemptExistingAttacks",
    "sweepWhenNoTargets", "capabilityAwareAttackers", "reachabilityAwareTargets",
    "stallTicks", "reassignStalledTargets", "engagementMode", "routeCorridorRadius",
    "engagementAllocationMode", "retargetStalledBuildings",
];

export const validateMissionNativeCloseoutPolicyV4 = (
    policy: MissionNativeCloseoutPolicyV4,
): MissionNativeCloseoutPolicyV4 => {
    const actual = Object.keys(policy).sort();
    const expected = exactKeys.slice().sort();
    if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
        throw new Error("Mission-native closeout policy v4 has an invalid exact schema");
    }
    const { schemaVersion: _schemaVersion, retargetStalledBuildings, ...v3Fields } = policy;
    const expectedV3 = buildMissionNativeCloseoutPolicyV3(policy.enabled);
    for (const [key, value] of Object.entries(expectedV3)) {
        if (key === "schemaVersion") continue;
        if (v3Fields[key as keyof typeof v3Fields] !== value) {
            throw new Error(`Mission-native closeout policy v4 inherited field ${key} drifted`);
        }
    }
    if (policy.schemaVersion !== MISSION_NATIVE_CLOSEOUT_POLICY_V4_SCHEMA_VERSION) {
        throw new Error("Mission-native closeout policy v4 schema version drifted");
    }
    if (retargetStalledBuildings !== true) {
        throw new Error("Mission-native closeout policy v4 retargeting representation drifted");
    }
    return { ...policy };
};

export const buildMissionNativeCloseoutPolicyV4 = (
    enabled = true,
): MissionNativeCloseoutPolicyV4 => {
    const { schemaVersion: _schemaVersion, ...v3 } = buildMissionNativeCloseoutPolicyV3(enabled);
    return validateMissionNativeCloseoutPolicyV4({
        ...v3,
        schemaVersion: MISSION_NATIVE_CLOSEOUT_POLICY_V4_SCHEMA_VERSION,
        retargetStalledBuildings: true,
    });
};

const canonical = (value: MissionNativeCloseoutPolicyV4): string => JSON.stringify(
    Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right))),
);

export const missionNativeCloseoutPolicyV4Sha256 = (
    policy: MissionNativeCloseoutPolicyV4,
): string => createHash("sha256")
    .update(canonical(validateMissionNativeCloseoutPolicyV4(policy)))
    .digest("hex");
