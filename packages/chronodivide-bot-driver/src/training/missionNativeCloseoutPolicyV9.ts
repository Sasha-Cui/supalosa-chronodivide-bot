import { createHash } from "node:crypto";
import {
    MissionNativeCloseoutPolicyV8,
    buildMissionNativeCloseoutPolicyV8,
} from "./missionNativeCloseoutPolicyV8.js";

export const MISSION_NATIVE_CLOSEOUT_POLICY_V9_SCHEMA_VERSION = 9 as const;

export type MissionNativeCloseoutPolicyV9 = Omit<
    MissionNativeCloseoutPolicyV8,
    "schemaVersion"
> & {
    schemaVersion: typeof MISSION_NATIVE_CLOSEOUT_POLICY_V9_SCHEMA_VERSION;
    readinessReserve: true;
};

const exactKeys: Array<keyof MissionNativeCloseoutPolicyV9> = [
    "schemaVersion", "enabled", "mechanism", "informationInterface",
    "activationMode", "maxEnemyBuildings", "minTick", "minCombatants",
    "reserveCombatants", "orderIntervalTicks", "maxTargetGroups", "targetPriority",
    "observationMode", "directVisibleAttack", "preemptExistingAttacks",
    "sweepWhenNoTargets", "capabilityAwareAttackers", "reachabilityAwareTargets",
    "stallTicks", "reassignStalledTargets", "engagementMode", "routeCorridorRadius",
    "engagementAllocationMode", "retargetStalledBuildings", "commitRouteBlocker",
    "readinessReserve",
];

export const validateMissionNativeCloseoutPolicyV9 = (
    policy: MissionNativeCloseoutPolicyV9,
): MissionNativeCloseoutPolicyV9 => {
    const actual = Object.keys(policy).sort();
    const expected = exactKeys.slice().sort();
    if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
        throw new Error("Mission-native closeout policy v9 has an invalid exact schema");
    }
    const { schemaVersion: _schemaVersion, readinessReserve, ...v8Fields } = policy;
    const expectedV8 = buildMissionNativeCloseoutPolicyV8(policy.enabled);
    for (const [key, value] of Object.entries(expectedV8)) {
        if (key === "schemaVersion") continue;
        if (v8Fields[key as keyof typeof v8Fields] !== value) {
            throw new Error(`Mission-native closeout policy v9 inherited field ${key} drifted`);
        }
    }
    if (policy.schemaVersion !== MISSION_NATIVE_CLOSEOUT_POLICY_V9_SCHEMA_VERSION) {
        throw new Error("Mission-native closeout policy v9 schema version drifted");
    }
    if (readinessReserve !== true) {
        throw new Error("Mission-native closeout policy v9 reserve representation drifted");
    }
    return { ...policy };
};

export const buildMissionNativeCloseoutPolicyV9 = (
    enabled = true,
): MissionNativeCloseoutPolicyV9 => {
    const { schemaVersion: _schemaVersion, ...v8 } = buildMissionNativeCloseoutPolicyV8(enabled);
    return validateMissionNativeCloseoutPolicyV9({
        ...v8,
        schemaVersion: MISSION_NATIVE_CLOSEOUT_POLICY_V9_SCHEMA_VERSION,
        readinessReserve: true,
    });
};

const canonical = (value: MissionNativeCloseoutPolicyV9): string => JSON.stringify(
    Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right))),
);

export const missionNativeCloseoutPolicyV9Sha256 = (
    policy: MissionNativeCloseoutPolicyV9,
): string => createHash("sha256")
    .update(canonical(validateMissionNativeCloseoutPolicyV9(policy)))
    .digest("hex");
