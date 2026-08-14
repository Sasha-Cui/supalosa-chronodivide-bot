import { createHash } from "node:crypto";
import {
    MissionNativeCloseoutPolicyV2,
    buildMissionNativeCloseoutPolicyV2,
} from "./missionNativeCloseoutPolicyV2.js";

export const MISSION_NATIVE_CLOSEOUT_POLICY_V3_SCHEMA_VERSION = 3 as const;

export type MissionNativeCloseoutPolicyV3 = Omit<MissionNativeCloseoutPolicyV2, "schemaVersion"> & {
    schemaVersion: typeof MISSION_NATIVE_CLOSEOUT_POLICY_V3_SCHEMA_VERSION;
    engagementAllocationMode: "boundedScreen";
};

const exactKeys: Array<keyof MissionNativeCloseoutPolicyV3> = [
    "schemaVersion", "enabled", "mechanism", "informationInterface",
    "activationMode", "maxEnemyBuildings", "minTick", "minCombatants",
    "reserveCombatants", "orderIntervalTicks", "maxTargetGroups", "targetPriority",
    "observationMode", "directVisibleAttack", "preemptExistingAttacks",
    "sweepWhenNoTargets", "capabilityAwareAttackers", "reachabilityAwareTargets",
    "stallTicks", "reassignStalledTargets", "engagementMode", "routeCorridorRadius",
    "engagementAllocationMode",
];

export const validateMissionNativeCloseoutPolicyV3 = (
    policy: MissionNativeCloseoutPolicyV3,
): MissionNativeCloseoutPolicyV3 => {
    const actual = Object.keys(policy).sort();
    const expected = exactKeys.slice().sort();
    if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
        throw new Error("Mission-native closeout policy v3 has an invalid exact schema");
    }
    const {
        schemaVersion: _schemaVersion,
        engagementAllocationMode,
        ...v2Fields
    } = policy;
    const expectedV2 = buildMissionNativeCloseoutPolicyV2(policy.enabled);
    for (const [key, value] of Object.entries(expectedV2)) {
        if (key === "schemaVersion") continue;
        if (v2Fields[key as keyof typeof v2Fields] !== value) {
            throw new Error(`Mission-native closeout policy v3 inherited field ${key} drifted`);
        }
    }
    if (policy.schemaVersion !== MISSION_NATIVE_CLOSEOUT_POLICY_V3_SCHEMA_VERSION) {
        throw new Error("Mission-native closeout policy v3 schema version drifted");
    }
    if (engagementAllocationMode !== "boundedScreen") {
        throw new Error("Mission-native closeout policy v3 allocation representation drifted");
    }
    return { ...policy };
};

export const buildMissionNativeCloseoutPolicyV3 = (
    enabled = true,
): MissionNativeCloseoutPolicyV3 => {
    const { schemaVersion: _schemaVersion, ...v2 } = buildMissionNativeCloseoutPolicyV2(enabled);
    return validateMissionNativeCloseoutPolicyV3({
        ...v2,
        schemaVersion: MISSION_NATIVE_CLOSEOUT_POLICY_V3_SCHEMA_VERSION,
        engagementAllocationMode: "boundedScreen",
    });
};

const canonical = (value: MissionNativeCloseoutPolicyV3): string => JSON.stringify(
    Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right))),
);

export const missionNativeCloseoutPolicyV3Sha256 = (
    policy: MissionNativeCloseoutPolicyV3,
): string => createHash("sha256")
    .update(canonical(validateMissionNativeCloseoutPolicyV3(policy)))
    .digest("hex");
