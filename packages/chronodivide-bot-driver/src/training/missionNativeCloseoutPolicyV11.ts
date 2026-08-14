import { createHash } from "node:crypto";
import {
    MissionNativeCloseoutPolicyV10,
    buildMissionNativeCloseoutPolicyV10,
} from "./missionNativeCloseoutPolicyV10.js";

export const MISSION_NATIVE_CLOSEOUT_POLICY_V11_SCHEMA_VERSION = 11 as const;

export type MissionNativeCloseoutPolicyV11 = Omit<
    MissionNativeCloseoutPolicyV10,
    "schemaVersion" | "activationMode"
> & {
    schemaVersion: typeof MISSION_NATIVE_CLOSEOUT_POLICY_V11_SCHEMA_VERSION;
    activationMode: "objectiveRouteClearance";
};

const exactKeys: Array<keyof MissionNativeCloseoutPolicyV11> = [
    "schemaVersion", "enabled", "mechanism", "informationInterface",
    "activationMode", "maxEnemyBuildings", "minTick", "minCombatants",
    "reserveCombatants", "orderIntervalTicks", "maxTargetGroups", "targetPriority",
    "observationMode", "directVisibleAttack", "preemptExistingAttacks",
    "sweepWhenNoTargets", "capabilityAwareAttackers", "reachabilityAwareTargets",
    "stallTicks", "reassignStalledTargets", "engagementMode", "routeCorridorRadius",
    "engagementAllocationMode", "retargetStalledBuildings", "commitRouteBlocker",
    "readinessReserve",
];

export const validateMissionNativeCloseoutPolicyV11 = (
    policy: MissionNativeCloseoutPolicyV11,
): MissionNativeCloseoutPolicyV11 => {
    const actual = Object.keys(policy).sort();
    const expected = exactKeys.slice().sort();
    if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
        throw new Error("Mission-native closeout policy v11 has an invalid exact schema");
    }
    const { schemaVersion: _schemaVersion, activationMode, ...v10Fields } = policy;
    const expectedV10 = buildMissionNativeCloseoutPolicyV10(policy.enabled);
    for (const [key, value] of Object.entries(expectedV10)) {
        if (key === "schemaVersion" || key === "activationMode") continue;
        if (v10Fields[key as keyof typeof v10Fields] !== value) {
            throw new Error(`Mission-native closeout policy v11 inherited field ${key} drifted`);
        }
    }
    if (policy.schemaVersion !== MISSION_NATIVE_CLOSEOUT_POLICY_V11_SCHEMA_VERSION) {
        throw new Error("Mission-native closeout policy v11 schema version drifted");
    }
    if (activationMode !== "objectiveRouteClearance") {
        throw new Error("Mission-native closeout policy v11 activation representation drifted");
    }
    return { ...policy };
};

export const buildMissionNativeCloseoutPolicyV11 = (
    enabled = true,
): MissionNativeCloseoutPolicyV11 => {
    const { schemaVersion: _schemaVersion, activationMode: _activationMode, ...v10 } =
        buildMissionNativeCloseoutPolicyV10(enabled);
    return validateMissionNativeCloseoutPolicyV11({
        ...v10,
        schemaVersion: MISSION_NATIVE_CLOSEOUT_POLICY_V11_SCHEMA_VERSION,
        activationMode: "objectiveRouteClearance",
    });
};

const canonical = (value: MissionNativeCloseoutPolicyV11): string => JSON.stringify(
    Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right))),
);

export const missionNativeCloseoutPolicyV11Sha256 = (
    policy: MissionNativeCloseoutPolicyV11,
): string => createHash("sha256")
    .update(canonical(validateMissionNativeCloseoutPolicyV11(policy)))
    .digest("hex");
