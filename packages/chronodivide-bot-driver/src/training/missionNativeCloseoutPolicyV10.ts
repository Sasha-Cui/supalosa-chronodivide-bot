import { createHash } from "node:crypto";
import {
    MissionNativeCloseoutPolicyV9,
    buildMissionNativeCloseoutPolicyV9,
} from "./missionNativeCloseoutPolicyV9.js";

export const MISSION_NATIVE_CLOSEOUT_POLICY_V10_SCHEMA_VERSION = 10 as const;

export type MissionNativeCloseoutPolicyV10 = Omit<
    MissionNativeCloseoutPolicyV9,
    "schemaVersion" | "activationMode"
> & {
    schemaVersion: typeof MISSION_NATIVE_CLOSEOUT_POLICY_V10_SCHEMA_VERSION;
    activationMode: "objectiveClearance";
};

const exactKeys: Array<keyof MissionNativeCloseoutPolicyV10> = [
    "schemaVersion", "enabled", "mechanism", "informationInterface",
    "activationMode", "maxEnemyBuildings", "minTick", "minCombatants",
    "reserveCombatants", "orderIntervalTicks", "maxTargetGroups", "targetPriority",
    "observationMode", "directVisibleAttack", "preemptExistingAttacks",
    "sweepWhenNoTargets", "capabilityAwareAttackers", "reachabilityAwareTargets",
    "stallTicks", "reassignStalledTargets", "engagementMode", "routeCorridorRadius",
    "engagementAllocationMode", "retargetStalledBuildings", "commitRouteBlocker",
    "readinessReserve",
];

export const validateMissionNativeCloseoutPolicyV10 = (
    policy: MissionNativeCloseoutPolicyV10,
): MissionNativeCloseoutPolicyV10 => {
    const actual = Object.keys(policy).sort();
    const expected = exactKeys.slice().sort();
    if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
        throw new Error("Mission-native closeout policy v10 has an invalid exact schema");
    }
    const { schemaVersion: _schemaVersion, activationMode, ...v9Fields } = policy;
    const expectedV9 = buildMissionNativeCloseoutPolicyV9(policy.enabled);
    for (const [key, value] of Object.entries(expectedV9)) {
        if (key === "schemaVersion" || key === "activationMode") continue;
        if (v9Fields[key as keyof typeof v9Fields] !== value) {
            throw new Error(`Mission-native closeout policy v10 inherited field ${key} drifted`);
        }
    }
    if (policy.schemaVersion !== MISSION_NATIVE_CLOSEOUT_POLICY_V10_SCHEMA_VERSION) {
        throw new Error("Mission-native closeout policy v10 schema version drifted");
    }
    if (activationMode !== "objectiveClearance") {
        throw new Error("Mission-native closeout policy v10 activation representation drifted");
    }
    return { ...policy };
};

export const buildMissionNativeCloseoutPolicyV10 = (
    enabled = true,
): MissionNativeCloseoutPolicyV10 => {
    const { schemaVersion: _schemaVersion, activationMode: _activationMode, ...v9 } =
        buildMissionNativeCloseoutPolicyV9(enabled);
    return validateMissionNativeCloseoutPolicyV10({
        ...v9,
        schemaVersion: MISSION_NATIVE_CLOSEOUT_POLICY_V10_SCHEMA_VERSION,
        activationMode: "objectiveClearance",
    });
};

const canonical = (value: MissionNativeCloseoutPolicyV10): string => JSON.stringify(
    Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right))),
);

export const missionNativeCloseoutPolicyV10Sha256 = (
    policy: MissionNativeCloseoutPolicyV10,
): string => createHash("sha256")
    .update(canonical(validateMissionNativeCloseoutPolicyV10(policy)))
    .digest("hex");
