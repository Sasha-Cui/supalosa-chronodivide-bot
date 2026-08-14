import { createHash } from "node:crypto";
import {
    MissionNativeCloseoutPolicyV7,
    buildMissionNativeCloseoutPolicyV7,
} from "./missionNativeCloseoutPolicyV7.js";

export const MISSION_NATIVE_CLOSEOUT_POLICY_V8_SCHEMA_VERSION = 8 as const;

export type MissionNativeCloseoutPolicyV8 = Omit<
    MissionNativeCloseoutPolicyV7,
    "schemaVersion" | "activationMode"
> & {
    schemaVersion: typeof MISSION_NATIVE_CLOSEOUT_POLICY_V8_SCHEMA_VERSION;
    activationMode: "objectiveRace";
};

const exactKeys: Array<keyof MissionNativeCloseoutPolicyV8> = [
    "schemaVersion", "enabled", "mechanism", "informationInterface",
    "activationMode", "maxEnemyBuildings", "minTick", "minCombatants",
    "reserveCombatants", "orderIntervalTicks", "maxTargetGroups", "targetPriority",
    "observationMode", "directVisibleAttack", "preemptExistingAttacks",
    "sweepWhenNoTargets", "capabilityAwareAttackers", "reachabilityAwareTargets",
    "stallTicks", "reassignStalledTargets", "engagementMode", "routeCorridorRadius",
    "engagementAllocationMode", "retargetStalledBuildings", "commitRouteBlocker",
];

export const validateMissionNativeCloseoutPolicyV8 = (
    policy: MissionNativeCloseoutPolicyV8,
): MissionNativeCloseoutPolicyV8 => {
    const actual = Object.keys(policy).sort();
    const expected = exactKeys.slice().sort();
    if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
        throw new Error("Mission-native closeout policy v8 has an invalid exact schema");
    }
    const { schemaVersion: _schemaVersion, activationMode, ...v7Fields } = policy;
    const expectedV7 = buildMissionNativeCloseoutPolicyV7(policy.enabled);
    for (const [key, value] of Object.entries(expectedV7)) {
        if (key === "schemaVersion" || key === "activationMode") continue;
        if (v7Fields[key as keyof typeof v7Fields] !== value) {
            throw new Error(`Mission-native closeout policy v8 inherited field ${key} drifted`);
        }
    }
    if (policy.schemaVersion !== MISSION_NATIVE_CLOSEOUT_POLICY_V8_SCHEMA_VERSION) {
        throw new Error("Mission-native closeout policy v8 schema version drifted");
    }
    if (activationMode !== "objectiveRace") {
        throw new Error("Mission-native closeout policy v8 activation representation drifted");
    }
    return { ...policy };
};

export const buildMissionNativeCloseoutPolicyV8 = (
    enabled = true,
): MissionNativeCloseoutPolicyV8 => {
    const { schemaVersion: _schemaVersion, activationMode: _activationMode, ...v7 } =
        buildMissionNativeCloseoutPolicyV7(enabled);
    return validateMissionNativeCloseoutPolicyV8({
        ...v7,
        schemaVersion: MISSION_NATIVE_CLOSEOUT_POLICY_V8_SCHEMA_VERSION,
        activationMode: "objectiveRace",
    });
};

const canonical = (value: MissionNativeCloseoutPolicyV8): string => JSON.stringify(
    Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right))),
);

export const missionNativeCloseoutPolicyV8Sha256 = (
    policy: MissionNativeCloseoutPolicyV8,
): string => createHash("sha256")
    .update(canonical(validateMissionNativeCloseoutPolicyV8(policy)))
    .digest("hex");
