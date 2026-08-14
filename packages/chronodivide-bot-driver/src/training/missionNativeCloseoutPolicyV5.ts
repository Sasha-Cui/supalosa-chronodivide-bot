import { createHash } from "node:crypto";
import {
    MissionNativeCloseoutPolicyV4,
    buildMissionNativeCloseoutPolicyV4,
} from "./missionNativeCloseoutPolicyV4.js";

export const MISSION_NATIVE_CLOSEOUT_POLICY_V5_SCHEMA_VERSION = 5 as const;

export type MissionNativeCloseoutPolicyV5 = Omit<
    MissionNativeCloseoutPolicyV4,
    "schemaVersion" | "engagementAllocationMode"
> & {
    schemaVersion: typeof MISSION_NATIVE_CLOSEOUT_POLICY_V5_SCHEMA_VERSION;
    engagementAllocationMode: "singleScreen";
};

const exactKeys: Array<keyof MissionNativeCloseoutPolicyV5> = [
    "schemaVersion", "enabled", "mechanism", "informationInterface",
    "activationMode", "maxEnemyBuildings", "minTick", "minCombatants",
    "reserveCombatants", "orderIntervalTicks", "maxTargetGroups", "targetPriority",
    "observationMode", "directVisibleAttack", "preemptExistingAttacks",
    "sweepWhenNoTargets", "capabilityAwareAttackers", "reachabilityAwareTargets",
    "stallTicks", "reassignStalledTargets", "engagementMode", "routeCorridorRadius",
    "engagementAllocationMode", "retargetStalledBuildings",
];

export const validateMissionNativeCloseoutPolicyV5 = (
    policy: MissionNativeCloseoutPolicyV5,
): MissionNativeCloseoutPolicyV5 => {
    const actual = Object.keys(policy).sort();
    const expected = exactKeys.slice().sort();
    if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
        throw new Error("Mission-native closeout policy v5 has an invalid exact schema");
    }
    const {
        schemaVersion: _schemaVersion,
        engagementAllocationMode,
        ...v4Fields
    } = policy;
    const expectedV4 = buildMissionNativeCloseoutPolicyV4(policy.enabled);
    for (const [key, value] of Object.entries(expectedV4)) {
        if (key === "schemaVersion" || key === "engagementAllocationMode") continue;
        if (v4Fields[key as keyof typeof v4Fields] !== value) {
            throw new Error(`Mission-native closeout policy v5 inherited field ${key} drifted`);
        }
    }
    if (policy.schemaVersion !== MISSION_NATIVE_CLOSEOUT_POLICY_V5_SCHEMA_VERSION) {
        throw new Error("Mission-native closeout policy v5 schema version drifted");
    }
    if (engagementAllocationMode !== "singleScreen") {
        throw new Error("Mission-native closeout policy v5 allocation representation drifted");
    }
    return { ...policy };
};

export const buildMissionNativeCloseoutPolicyV5 = (
    enabled = true,
): MissionNativeCloseoutPolicyV5 => {
    const {
        schemaVersion: _schemaVersion,
        engagementAllocationMode: _engagementAllocationMode,
        ...v4
    } = buildMissionNativeCloseoutPolicyV4(enabled);
    return validateMissionNativeCloseoutPolicyV5({
        ...v4,
        schemaVersion: MISSION_NATIVE_CLOSEOUT_POLICY_V5_SCHEMA_VERSION,
        engagementAllocationMode: "singleScreen",
    });
};

const canonical = (value: MissionNativeCloseoutPolicyV5): string => JSON.stringify(
    Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right))),
);

export const missionNativeCloseoutPolicyV5Sha256 = (
    policy: MissionNativeCloseoutPolicyV5,
): string => createHash("sha256")
    .update(canonical(validateMissionNativeCloseoutPolicyV5(policy)))
    .digest("hex");
