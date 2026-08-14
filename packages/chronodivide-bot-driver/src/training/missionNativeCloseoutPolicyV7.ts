import { createHash } from "node:crypto";
import {
    MissionNativeCloseoutPolicyV6,
    buildMissionNativeCloseoutPolicyV6,
} from "./missionNativeCloseoutPolicyV6.js";

export const MISSION_NATIVE_CLOSEOUT_POLICY_V7_SCHEMA_VERSION = 7 as const;

export type MissionNativeCloseoutPolicyV7 = Omit<
    MissionNativeCloseoutPolicyV6,
    "schemaVersion" | "targetPriority"
> & {
    schemaVersion: typeof MISSION_NATIVE_CLOSEOUT_POLICY_V7_SCHEMA_VERSION;
    targetPriority: "reinforcement";
};

const exactKeys: Array<keyof MissionNativeCloseoutPolicyV7> = [
    "schemaVersion", "enabled", "mechanism", "informationInterface",
    "activationMode", "maxEnemyBuildings", "minTick", "minCombatants",
    "reserveCombatants", "orderIntervalTicks", "maxTargetGroups", "targetPriority",
    "observationMode", "directVisibleAttack", "preemptExistingAttacks",
    "sweepWhenNoTargets", "capabilityAwareAttackers", "reachabilityAwareTargets",
    "stallTicks", "reassignStalledTargets", "engagementMode", "routeCorridorRadius",
    "engagementAllocationMode", "retargetStalledBuildings", "commitRouteBlocker",
];

export const validateMissionNativeCloseoutPolicyV7 = (
    policy: MissionNativeCloseoutPolicyV7,
): MissionNativeCloseoutPolicyV7 => {
    const actual = Object.keys(policy).sort();
    const expected = exactKeys.slice().sort();
    if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
        throw new Error("Mission-native closeout policy v7 has an invalid exact schema");
    }
    const { schemaVersion: _schemaVersion, targetPriority, ...v6Fields } = policy;
    const expectedV6 = buildMissionNativeCloseoutPolicyV6(policy.enabled);
    for (const [key, value] of Object.entries(expectedV6)) {
        if (key === "schemaVersion" || key === "targetPriority") continue;
        if (v6Fields[key as keyof typeof v6Fields] !== value) {
            throw new Error(`Mission-native closeout policy v7 inherited field ${key} drifted`);
        }
    }
    if (policy.schemaVersion !== MISSION_NATIVE_CLOSEOUT_POLICY_V7_SCHEMA_VERSION) {
        throw new Error("Mission-native closeout policy v7 schema version drifted");
    }
    if (targetPriority !== "reinforcement") {
        throw new Error("Mission-native closeout policy v7 target-priority representation drifted");
    }
    return { ...policy };
};

export const buildMissionNativeCloseoutPolicyV7 = (
    enabled = true,
): MissionNativeCloseoutPolicyV7 => {
    const { schemaVersion: _schemaVersion, targetPriority: _targetPriority, ...v6 } =
        buildMissionNativeCloseoutPolicyV6(enabled);
    return validateMissionNativeCloseoutPolicyV7({
        ...v6,
        schemaVersion: MISSION_NATIVE_CLOSEOUT_POLICY_V7_SCHEMA_VERSION,
        targetPriority: "reinforcement",
    });
};

const canonical = (value: MissionNativeCloseoutPolicyV7): string => JSON.stringify(
    Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right))),
);

export const missionNativeCloseoutPolicyV7Sha256 = (
    policy: MissionNativeCloseoutPolicyV7,
): string => createHash("sha256")
    .update(canonical(validateMissionNativeCloseoutPolicyV7(policy)))
    .digest("hex");
