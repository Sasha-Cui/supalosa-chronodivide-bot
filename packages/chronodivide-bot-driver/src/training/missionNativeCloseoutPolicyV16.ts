import { createHash } from "node:crypto";
import {
    MissionNativeCloseoutPolicyV14,
    buildMissionNativeCloseoutPolicyV14,
} from "./missionNativeCloseoutPolicyV14.js";

export const MISSION_NATIVE_CLOSEOUT_POLICY_V16_SCHEMA_VERSION = 16 as const;

export type MissionNativeCloseoutPolicyV16 = Omit<
    MissionNativeCloseoutPolicyV14,
    "schemaVersion" | "activationMode" | "readinessReserveScope"
> & {
    schemaVersion: typeof MISSION_NATIVE_CLOSEOUT_POLICY_V16_SCHEMA_VERSION;
    activationMode: "objectiveVanguardRouteClearance";
    readinessReserveScope: "reinforcements";
    adaptiveGroundAssaultTargetCount: 4;
};

const exactKeys: Array<keyof MissionNativeCloseoutPolicyV16> = [
    "schemaVersion", "enabled", "mechanism", "informationInterface",
    "activationMode", "maxEnemyBuildings", "minTick", "minCombatants",
    "reserveCombatants", "orderIntervalTicks", "maxTargetGroups", "targetPriority",
    "observationMode", "directVisibleAttack", "preemptExistingAttacks",
    "sweepWhenNoTargets", "capabilityAwareAttackers", "reachabilityAwareTargets",
    "stallTicks", "reassignStalledTargets", "engagementMode", "routeCorridorRadius",
    "engagementAllocationMode", "retargetStalledBuildings", "commitRouteBlocker",
    "readinessReserve", "readinessReserveScope", "adaptiveGroundAssaultTargetCount",
];

export const validateMissionNativeCloseoutPolicyV16 = (
    policy: MissionNativeCloseoutPolicyV16,
): MissionNativeCloseoutPolicyV16 => {
    const actual = Object.keys(policy).sort();
    const expected = exactKeys.slice().sort();
    if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
        throw new Error("Mission-native closeout policy v16 has an invalid exact schema");
    }
    const {
        schemaVersion: _schemaVersion,
        activationMode,
        readinessReserveScope,
        adaptiveGroundAssaultTargetCount,
        ...v14Fields
    } = policy;
    const expectedV14 = buildMissionNativeCloseoutPolicyV14(policy.enabled);
    for (const [key, value] of Object.entries(expectedV14)) {
        if (key === "schemaVersion" || key === "activationMode" || key === "readinessReserveScope") continue;
        if (v14Fields[key as keyof typeof v14Fields] !== value) {
            throw new Error(`Mission-native closeout policy v16 inherited field ${key} drifted`);
        }
    }
    if (policy.schemaVersion !== MISSION_NATIVE_CLOSEOUT_POLICY_V16_SCHEMA_VERSION) {
        throw new Error("Mission-native closeout policy v16 schema version drifted");
    }
    if (activationMode !== "objectiveVanguardRouteClearance") {
        throw new Error("Mission-native closeout policy v16 activation representation drifted");
    }
    if (readinessReserveScope !== "reinforcements") {
        throw new Error("Mission-native closeout policy v16 reserve scope drifted");
    }
    if (adaptiveGroundAssaultTargetCount !== 4) {
        throw new Error("Mission-native closeout policy v16 assault-production ceiling drifted");
    }
    return { ...policy };
};

export const buildMissionNativeCloseoutPolicyV16 = (
    enabled = true,
): MissionNativeCloseoutPolicyV16 => {
    const {
        schemaVersion: _schemaVersion,
        activationMode: _activationMode,
        readinessReserveScope: _readinessReserveScope,
        ...v14
    } = buildMissionNativeCloseoutPolicyV14(enabled);
    return validateMissionNativeCloseoutPolicyV16({
        ...v14,
        schemaVersion: MISSION_NATIVE_CLOSEOUT_POLICY_V16_SCHEMA_VERSION,
        activationMode: "objectiveVanguardRouteClearance",
        readinessReserveScope: "reinforcements",
        adaptiveGroundAssaultTargetCount: 4,
    });
};

const canonical = (value: MissionNativeCloseoutPolicyV16): string => JSON.stringify(
    Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right))),
);

export const missionNativeCloseoutPolicyV16Sha256 = (
    policy: MissionNativeCloseoutPolicyV16,
): string => createHash("sha256")
    .update(canonical(validateMissionNativeCloseoutPolicyV16(policy)))
    .digest("hex");
