import { createHash } from "node:crypto";
import {
    MissionNativeCloseoutPolicy,
    buildMissionNativeCloseoutPolicy,
} from "./missionNativeCloseoutPolicy.js";

export const MISSION_NATIVE_CLOSEOUT_POLICY_V2_SCHEMA_VERSION = 2 as const;

export type MissionNativeCloseoutPolicyV2 = Omit<MissionNativeCloseoutPolicy, "schemaVersion"> & {
    schemaVersion: typeof MISSION_NATIVE_CLOSEOUT_POLICY_V2_SCHEMA_VERSION;
    engagementMode: "completionRace";
    routeCorridorRadius: 8;
};

const exactKeys: Array<keyof MissionNativeCloseoutPolicyV2> = [
    "schemaVersion", "enabled", "mechanism", "informationInterface",
    "activationMode", "maxEnemyBuildings", "minTick", "minCombatants",
    "reserveCombatants", "orderIntervalTicks", "maxTargetGroups", "targetPriority",
    "observationMode", "directVisibleAttack", "preemptExistingAttacks",
    "sweepWhenNoTargets", "capabilityAwareAttackers", "reachabilityAwareTargets",
    "stallTicks", "reassignStalledTargets", "engagementMode", "routeCorridorRadius",
];

export const validateMissionNativeCloseoutPolicyV2 = (
    policy: MissionNativeCloseoutPolicyV2,
): MissionNativeCloseoutPolicyV2 => {
    const actual = Object.keys(policy).sort();
    const expected = exactKeys.slice().sort();
    if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
        throw new Error("Mission-native closeout policy v2 has an invalid exact schema");
    }
    const { schemaVersion: _schemaVersion, engagementMode, routeCorridorRadius, ...v1Fields } = policy;
    const expectedV1 = buildMissionNativeCloseoutPolicy(policy.enabled);
    for (const [key, value] of Object.entries(expectedV1)) {
        if (key === "schemaVersion") continue;
        if (v1Fields[key as keyof typeof v1Fields] !== value) {
            throw new Error(`Mission-native closeout policy v2 inherited field ${key} drifted`);
        }
    }
    if (policy.schemaVersion !== MISSION_NATIVE_CLOSEOUT_POLICY_V2_SCHEMA_VERSION) {
        throw new Error("Mission-native closeout policy v2 schema version drifted");
    }
    if (engagementMode !== "completionRace" || routeCorridorRadius !== 8) {
        throw new Error("Mission-native closeout policy v2 engagement representation drifted");
    }
    return { ...policy };
};

export const buildMissionNativeCloseoutPolicyV2 = (
    enabled = true,
): MissionNativeCloseoutPolicyV2 => {
    const { schemaVersion: _schemaVersion, ...v1 } = buildMissionNativeCloseoutPolicy(enabled);
    return validateMissionNativeCloseoutPolicyV2({
        ...v1,
        schemaVersion: MISSION_NATIVE_CLOSEOUT_POLICY_V2_SCHEMA_VERSION,
        engagementMode: "completionRace",
        routeCorridorRadius: 8,
    });
};

const canonical = (value: MissionNativeCloseoutPolicyV2): string => JSON.stringify(
    Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right))),
);

export const missionNativeCloseoutPolicyV2Sha256 = (
    policy: MissionNativeCloseoutPolicyV2,
): string => createHash("sha256")
    .update(canonical(validateMissionNativeCloseoutPolicyV2(policy)))
    .digest("hex");
