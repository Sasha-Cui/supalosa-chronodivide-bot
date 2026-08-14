import { createHash } from "node:crypto";
import {
    MissionNativeCloseoutPolicyV12,
    buildMissionNativeCloseoutPolicyV12,
} from "./missionNativeCloseoutPolicyV12.js";

export const MISSION_NATIVE_CLOSEOUT_POLICY_V13_SCHEMA_VERSION = 13 as const;

export type MissionNativeCloseoutPolicyV13 = Omit<
    MissionNativeCloseoutPolicyV12,
    "schemaVersion" | "activationMode"
> & {
    schemaVersion: typeof MISSION_NATIVE_CLOSEOUT_POLICY_V13_SCHEMA_VERSION;
    activationMode: "objectiveStagedRouteClearance";
    readinessReserveScope: "fullForce";
};

const exactKeys: Array<keyof MissionNativeCloseoutPolicyV13> = [
    "schemaVersion", "enabled", "mechanism", "informationInterface",
    "activationMode", "maxEnemyBuildings", "minTick", "minCombatants",
    "reserveCombatants", "orderIntervalTicks", "maxTargetGroups", "targetPriority",
    "observationMode", "directVisibleAttack", "preemptExistingAttacks",
    "sweepWhenNoTargets", "capabilityAwareAttackers", "reachabilityAwareTargets",
    "stallTicks", "reassignStalledTargets", "engagementMode", "routeCorridorRadius",
    "engagementAllocationMode", "retargetStalledBuildings", "commitRouteBlocker",
    "readinessReserve", "readinessReserveScope",
];

export const validateMissionNativeCloseoutPolicyV13 = (
    policy: MissionNativeCloseoutPolicyV13,
): MissionNativeCloseoutPolicyV13 => {
    const actual = Object.keys(policy).sort();
    const expected = exactKeys.slice().sort();
    if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
        throw new Error("Mission-native closeout policy v13 has an invalid exact schema");
    }
    const {
        schemaVersion: _schemaVersion,
        activationMode,
        readinessReserveScope,
        ...v12Fields
    } = policy;
    const expectedV12 = buildMissionNativeCloseoutPolicyV12(policy.enabled);
    for (const [key, value] of Object.entries(expectedV12)) {
        if (key === "schemaVersion" || key === "activationMode") continue;
        if (v12Fields[key as keyof typeof v12Fields] !== value) {
            throw new Error(`Mission-native closeout policy v13 inherited field ${key} drifted`);
        }
    }
    if (policy.schemaVersion !== MISSION_NATIVE_CLOSEOUT_POLICY_V13_SCHEMA_VERSION) {
        throw new Error("Mission-native closeout policy v13 schema version drifted");
    }
    if (activationMode !== "objectiveStagedRouteClearance") {
        throw new Error("Mission-native closeout policy v13 activation representation drifted");
    }
    if (readinessReserveScope !== "fullForce") {
        throw new Error("Mission-native closeout policy v13 staging representation drifted");
    }
    return { ...policy };
};

export const buildMissionNativeCloseoutPolicyV13 = (
    enabled = true,
): MissionNativeCloseoutPolicyV13 => {
    const { schemaVersion: _schemaVersion, activationMode: _activationMode, ...v12 } =
        buildMissionNativeCloseoutPolicyV12(enabled);
    return validateMissionNativeCloseoutPolicyV13({
        ...v12,
        schemaVersion: MISSION_NATIVE_CLOSEOUT_POLICY_V13_SCHEMA_VERSION,
        activationMode: "objectiveStagedRouteClearance",
        readinessReserveScope: "fullForce",
    });
};

const canonical = (value: MissionNativeCloseoutPolicyV13): string => JSON.stringify(
    Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right))),
);

export const missionNativeCloseoutPolicyV13Sha256 = (
    policy: MissionNativeCloseoutPolicyV13,
): string => createHash("sha256")
    .update(canonical(validateMissionNativeCloseoutPolicyV13(policy)))
    .digest("hex");
