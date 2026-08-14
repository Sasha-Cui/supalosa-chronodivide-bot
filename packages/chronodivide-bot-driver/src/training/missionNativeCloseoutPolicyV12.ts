import { createHash } from "node:crypto";
import {
    MissionNativeCloseoutPolicyV11,
    buildMissionNativeCloseoutPolicyV11,
} from "./missionNativeCloseoutPolicyV11.js";

export const MISSION_NATIVE_CLOSEOUT_POLICY_V12_SCHEMA_VERSION = 12 as const;

export type MissionNativeCloseoutPolicyV12 = Omit<
    MissionNativeCloseoutPolicyV11,
    "schemaVersion" | "activationMode"
> & {
    schemaVersion: typeof MISSION_NATIVE_CLOSEOUT_POLICY_V12_SCHEMA_VERSION;
    activationMode: "objectiveTransferableRouteClearance";
};

const exactKeys: Array<keyof MissionNativeCloseoutPolicyV12> = [
    "schemaVersion", "enabled", "mechanism", "informationInterface",
    "activationMode", "maxEnemyBuildings", "minTick", "minCombatants",
    "reserveCombatants", "orderIntervalTicks", "maxTargetGroups", "targetPriority",
    "observationMode", "directVisibleAttack", "preemptExistingAttacks",
    "sweepWhenNoTargets", "capabilityAwareAttackers", "reachabilityAwareTargets",
    "stallTicks", "reassignStalledTargets", "engagementMode", "routeCorridorRadius",
    "engagementAllocationMode", "retargetStalledBuildings", "commitRouteBlocker",
    "readinessReserve",
];

export const validateMissionNativeCloseoutPolicyV12 = (
    policy: MissionNativeCloseoutPolicyV12,
): MissionNativeCloseoutPolicyV12 => {
    const actual = Object.keys(policy).sort();
    const expected = exactKeys.slice().sort();
    if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
        throw new Error("Mission-native closeout policy v12 has an invalid exact schema");
    }
    const { schemaVersion: _schemaVersion, activationMode, ...v11Fields } = policy;
    const expectedV11 = buildMissionNativeCloseoutPolicyV11(policy.enabled);
    for (const [key, value] of Object.entries(expectedV11)) {
        if (key === "schemaVersion" || key === "activationMode") continue;
        if (v11Fields[key as keyof typeof v11Fields] !== value) {
            throw new Error(`Mission-native closeout policy v12 inherited field ${key} drifted`);
        }
    }
    if (policy.schemaVersion !== MISSION_NATIVE_CLOSEOUT_POLICY_V12_SCHEMA_VERSION) {
        throw new Error("Mission-native closeout policy v12 schema version drifted");
    }
    if (activationMode !== "objectiveTransferableRouteClearance") {
        throw new Error("Mission-native closeout policy v12 activation representation drifted");
    }
    return { ...policy };
};

export const buildMissionNativeCloseoutPolicyV12 = (
    enabled = true,
): MissionNativeCloseoutPolicyV12 => {
    const { schemaVersion: _schemaVersion, activationMode: _activationMode, ...v11 } =
        buildMissionNativeCloseoutPolicyV11(enabled);
    return validateMissionNativeCloseoutPolicyV12({
        ...v11,
        schemaVersion: MISSION_NATIVE_CLOSEOUT_POLICY_V12_SCHEMA_VERSION,
        activationMode: "objectiveTransferableRouteClearance",
    });
};

const canonical = (value: MissionNativeCloseoutPolicyV12): string => JSON.stringify(
    Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right))),
);

export const missionNativeCloseoutPolicyV12Sha256 = (
    policy: MissionNativeCloseoutPolicyV12,
): string => createHash("sha256")
    .update(canonical(validateMissionNativeCloseoutPolicyV12(policy)))
    .digest("hex");
