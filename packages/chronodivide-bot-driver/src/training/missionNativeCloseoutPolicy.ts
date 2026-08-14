import { createHash } from "node:crypto";

export const MISSION_NATIVE_CLOSEOUT_POLICY_SCHEMA_VERSION = 1 as const;

export type MissionNativeCloseoutPolicy = {
    schemaVersion: typeof MISSION_NATIVE_CLOSEOUT_POLICY_SCHEMA_VERSION;
    enabled: boolean;
    mechanism: "mission_native_low_building_focus";
    informationInterface: "public_complete_state";
    activationMode: "lowBuilding";
    maxEnemyBuildings: 5;
    minTick: 2_700;
    minCombatants: 1;
    reserveCombatants: 0;
    orderIntervalTicks: 3;
    maxTargetGroups: 1;
    targetPriority: "nearest";
    observationMode: "publicApi";
    directVisibleAttack: true;
    preemptExistingAttacks: true;
    sweepWhenNoTargets: false;
    capabilityAwareAttackers: true;
    reachabilityAwareTargets: true;
    stallTicks: 600;
    reassignStalledTargets: false;
};

const exactKeys: Array<keyof MissionNativeCloseoutPolicy> = [
    "schemaVersion", "enabled", "mechanism", "informationInterface",
    "activationMode", "maxEnemyBuildings", "minTick", "minCombatants",
    "reserveCombatants", "orderIntervalTicks", "maxTargetGroups", "targetPriority",
    "observationMode", "directVisibleAttack", "preemptExistingAttacks",
    "sweepWhenNoTargets", "capabilityAwareAttackers", "reachabilityAwareTargets",
    "stallTicks", "reassignStalledTargets",
];

const frozenRepresentation: Omit<MissionNativeCloseoutPolicy, "enabled"> = {
    schemaVersion: MISSION_NATIVE_CLOSEOUT_POLICY_SCHEMA_VERSION,
    mechanism: "mission_native_low_building_focus",
    informationInterface: "public_complete_state",
    activationMode: "lowBuilding",
    maxEnemyBuildings: 5,
    minTick: 2_700,
    minCombatants: 1,
    reserveCombatants: 0,
    orderIntervalTicks: 3,
    maxTargetGroups: 1,
    targetPriority: "nearest",
    observationMode: "publicApi",
    directVisibleAttack: true,
    preemptExistingAttacks: true,
    sweepWhenNoTargets: false,
    capabilityAwareAttackers: true,
    reachabilityAwareTargets: true,
    stallTicks: 600,
    reassignStalledTargets: false,
};

export const validateMissionNativeCloseoutPolicy = (
    policy: MissionNativeCloseoutPolicy,
): MissionNativeCloseoutPolicy => {
    const actual = Object.keys(policy).sort();
    const expected = exactKeys.slice().sort();
    if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
        throw new Error("Mission-native closeout policy has an invalid exact schema");
    }
    if (typeof policy.enabled !== "boolean") {
        throw new Error("Mission-native closeout policy enabled must be boolean");
    }
    for (const [key, value] of Object.entries(frozenRepresentation)) {
        if (policy[key as keyof MissionNativeCloseoutPolicy] !== value) {
            throw new Error(`Mission-native closeout policy frozen field ${key} drifted`);
        }
    }
    return { ...policy };
};

export const buildMissionNativeCloseoutPolicy = (
    enabled = true,
): MissionNativeCloseoutPolicy => validateMissionNativeCloseoutPolicy({
    ...frozenRepresentation,
    enabled,
});

const canonical = (value: MissionNativeCloseoutPolicy): string => JSON.stringify(
    Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right))),
);

export const missionNativeCloseoutPolicySha256 = (
    policy: MissionNativeCloseoutPolicy,
): string => createHash("sha256")
    .update(canonical(validateMissionNativeCloseoutPolicy(policy)))
    .digest("hex");
