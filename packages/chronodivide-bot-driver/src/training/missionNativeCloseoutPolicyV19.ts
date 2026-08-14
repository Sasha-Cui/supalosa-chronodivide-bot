import { createHash } from "node:crypto";
import {
    MissionNativeCloseoutPolicyV18,
    buildMissionNativeCloseoutPolicyV18,
} from "./missionNativeCloseoutPolicyV18.js";

export const MISSION_NATIVE_CLOSEOUT_POLICY_V19_SCHEMA_VERSION = 19 as const;

export type MissionNativeCloseoutPolicyV19 = Omit<
    MissionNativeCloseoutPolicyV18,
    "schemaVersion"
> & {
    schemaVersion: typeof MISSION_NATIVE_CLOSEOUT_POLICY_V19_SCHEMA_VERSION;
    adaptiveGroundAssaultProductionReservation: true;
};

const exactKeys: Array<keyof MissionNativeCloseoutPolicyV19> = [
    "schemaVersion", "enabled", "mechanism", "informationInterface",
    "activationMode", "maxEnemyBuildings", "minTick", "minCombatants",
    "reserveCombatants", "orderIntervalTicks", "maxTargetGroups", "targetPriority",
    "observationMode", "directVisibleAttack", "preemptExistingAttacks",
    "sweepWhenNoTargets", "capabilityAwareAttackers", "reachabilityAwareTargets",
    "stallTicks", "reassignStalledTargets", "engagementMode", "routeCorridorRadius",
    "engagementAllocationMode", "retargetStalledBuildings", "commitRouteBlocker",
    "readinessReserve", "readinessReserveScope", "adaptiveGroundAssaultTargetCount",
    "adaptiveGroundAssaultInfrastructure", "adaptiveGroundAssaultInfrastructurePriority",
    "adaptiveGroundAssaultProductionReservation",
];

export const validateMissionNativeCloseoutPolicyV19 = (
    policy: MissionNativeCloseoutPolicyV19,
): MissionNativeCloseoutPolicyV19 => {
    const actual = Object.keys(policy).sort();
    const expected = exactKeys.slice().sort();
    if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
        throw new Error("Mission-native closeout policy v19 has an invalid exact schema");
    }
    const {
        schemaVersion: _schemaVersion,
        adaptiveGroundAssaultProductionReservation,
        ...v18Fields
    } = policy;
    const expectedV18 = buildMissionNativeCloseoutPolicyV18(policy.enabled);
    for (const [key, value] of Object.entries(expectedV18)) {
        if (key === "schemaVersion") continue;
        if (v18Fields[key as keyof typeof v18Fields] !== value) {
            throw new Error(`Mission-native closeout policy v19 inherited field ${key} drifted`);
        }
    }
    if (policy.schemaVersion !== MISSION_NATIVE_CLOSEOUT_POLICY_V19_SCHEMA_VERSION) {
        throw new Error("Mission-native closeout policy v19 schema version drifted");
    }
    if (adaptiveGroundAssaultProductionReservation !== true) {
        throw new Error("Mission-native closeout policy v19 production reservation drifted");
    }
    return { ...policy };
};

export const buildMissionNativeCloseoutPolicyV19 = (
    enabled = true,
): MissionNativeCloseoutPolicyV19 => {
    const {
        schemaVersion: _schemaVersion,
        ...v18
    } = buildMissionNativeCloseoutPolicyV18(enabled);
    return validateMissionNativeCloseoutPolicyV19({
        ...v18,
        schemaVersion: MISSION_NATIVE_CLOSEOUT_POLICY_V19_SCHEMA_VERSION,
        adaptiveGroundAssaultProductionReservation: true,
    });
};

const canonical = (value: MissionNativeCloseoutPolicyV19): string => JSON.stringify(
    Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right))),
);

export const missionNativeCloseoutPolicyV19Sha256 = (
    policy: MissionNativeCloseoutPolicyV19,
): string => createHash("sha256")
    .update(canonical(validateMissionNativeCloseoutPolicyV19(policy)))
    .digest("hex");
