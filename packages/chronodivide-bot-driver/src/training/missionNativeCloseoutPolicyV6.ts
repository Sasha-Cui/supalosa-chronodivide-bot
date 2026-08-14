import { createHash } from "node:crypto";
import {
    MissionNativeCloseoutPolicyV5,
    buildMissionNativeCloseoutPolicyV5,
} from "./missionNativeCloseoutPolicyV5.js";

export const MISSION_NATIVE_CLOSEOUT_POLICY_V6_SCHEMA_VERSION = 6 as const;

export type MissionNativeCloseoutPolicyV6 = Omit<
    MissionNativeCloseoutPolicyV5,
    "schemaVersion" | "engagementAllocationMode"
> & {
    schemaVersion: typeof MISSION_NATIVE_CLOSEOUT_POLICY_V6_SCHEMA_VERSION;
    engagementAllocationMode: "allBlocker";
    commitRouteBlocker: true;
};

const exactKeys: Array<keyof MissionNativeCloseoutPolicyV6> = [
    "schemaVersion", "enabled", "mechanism", "informationInterface",
    "activationMode", "maxEnemyBuildings", "minTick", "minCombatants",
    "reserveCombatants", "orderIntervalTicks", "maxTargetGroups", "targetPriority",
    "observationMode", "directVisibleAttack", "preemptExistingAttacks",
    "sweepWhenNoTargets", "capabilityAwareAttackers", "reachabilityAwareTargets",
    "stallTicks", "reassignStalledTargets", "engagementMode", "routeCorridorRadius",
    "engagementAllocationMode", "retargetStalledBuildings", "commitRouteBlocker",
];

export const validateMissionNativeCloseoutPolicyV6 = (
    policy: MissionNativeCloseoutPolicyV6,
): MissionNativeCloseoutPolicyV6 => {
    const actual = Object.keys(policy).sort();
    const expected = exactKeys.slice().sort();
    if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
        throw new Error("Mission-native closeout policy v6 has an invalid exact schema");
    }
    const {
        schemaVersion: _schemaVersion,
        engagementAllocationMode,
        commitRouteBlocker,
        ...v5Fields
    } = policy;
    const expectedV5 = buildMissionNativeCloseoutPolicyV5(policy.enabled);
    for (const [key, value] of Object.entries(expectedV5)) {
        if (key === "schemaVersion" || key === "engagementAllocationMode") continue;
        if (v5Fields[key as keyof typeof v5Fields] !== value) {
            throw new Error(`Mission-native closeout policy v6 inherited field ${key} drifted`);
        }
    }
    if (policy.schemaVersion !== MISSION_NATIVE_CLOSEOUT_POLICY_V6_SCHEMA_VERSION) {
        throw new Error("Mission-native closeout policy v6 schema version drifted");
    }
    if (engagementAllocationMode !== "allBlocker" || commitRouteBlocker !== true) {
        throw new Error("Mission-native closeout policy v6 phase-persistence representation drifted");
    }
    return { ...policy };
};

export const buildMissionNativeCloseoutPolicyV6 = (
    enabled = true,
): MissionNativeCloseoutPolicyV6 => {
    const {
        schemaVersion: _schemaVersion,
        engagementAllocationMode: _engagementAllocationMode,
        ...v5
    } = buildMissionNativeCloseoutPolicyV5(enabled);
    return validateMissionNativeCloseoutPolicyV6({
        ...v5,
        schemaVersion: MISSION_NATIVE_CLOSEOUT_POLICY_V6_SCHEMA_VERSION,
        engagementAllocationMode: "allBlocker",
        commitRouteBlocker: true,
    });
};

const canonical = (value: MissionNativeCloseoutPolicyV6): string => JSON.stringify(
    Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right))),
);

export const missionNativeCloseoutPolicyV6Sha256 = (
    policy: MissionNativeCloseoutPolicyV6,
): string => createHash("sha256")
    .update(canonical(validateMissionNativeCloseoutPolicyV6(policy)))
    .digest("hex");
