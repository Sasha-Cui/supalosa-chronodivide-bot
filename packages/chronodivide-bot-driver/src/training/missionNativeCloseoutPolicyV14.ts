import { createHash } from "node:crypto";
import {
    MissionNativeCloseoutPolicyV13,
    buildMissionNativeCloseoutPolicyV13,
} from "./missionNativeCloseoutPolicyV13.js";

export const MISSION_NATIVE_CLOSEOUT_POLICY_V14_SCHEMA_VERSION = 14 as const;

export type MissionNativeCloseoutPolicyV14 = Omit<
    MissionNativeCloseoutPolicyV13,
    "schemaVersion" | "activationMode"
> & {
    schemaVersion: typeof MISSION_NATIVE_CLOSEOUT_POLICY_V14_SCHEMA_VERSION;
    activationMode: "objectiveStagedBlockerClearance";
};

const exactKeys: Array<keyof MissionNativeCloseoutPolicyV14> = [
    "schemaVersion", "enabled", "mechanism", "informationInterface",
    "activationMode", "maxEnemyBuildings", "minTick", "minCombatants",
    "reserveCombatants", "orderIntervalTicks", "maxTargetGroups", "targetPriority",
    "observationMode", "directVisibleAttack", "preemptExistingAttacks",
    "sweepWhenNoTargets", "capabilityAwareAttackers", "reachabilityAwareTargets",
    "stallTicks", "reassignStalledTargets", "engagementMode", "routeCorridorRadius",
    "engagementAllocationMode", "retargetStalledBuildings", "commitRouteBlocker",
    "readinessReserve", "readinessReserveScope",
];

export const validateMissionNativeCloseoutPolicyV14 = (
    policy: MissionNativeCloseoutPolicyV14,
): MissionNativeCloseoutPolicyV14 => {
    const actual = Object.keys(policy).sort();
    const expected = exactKeys.slice().sort();
    if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
        throw new Error("Mission-native closeout policy v14 has an invalid exact schema");
    }
    const { schemaVersion: _schemaVersion, activationMode, ...v13Fields } = policy;
    const expectedV13 = buildMissionNativeCloseoutPolicyV13(policy.enabled);
    for (const [key, value] of Object.entries(expectedV13)) {
        if (key === "schemaVersion" || key === "activationMode") continue;
        if (v13Fields[key as keyof typeof v13Fields] !== value) {
            throw new Error(`Mission-native closeout policy v14 inherited field ${key} drifted`);
        }
    }
    if (policy.schemaVersion !== MISSION_NATIVE_CLOSEOUT_POLICY_V14_SCHEMA_VERSION) {
        throw new Error("Mission-native closeout policy v14 schema version drifted");
    }
    if (activationMode !== "objectiveStagedBlockerClearance") {
        throw new Error("Mission-native closeout policy v14 activation representation drifted");
    }
    return { ...policy };
};

export const buildMissionNativeCloseoutPolicyV14 = (
    enabled = true,
): MissionNativeCloseoutPolicyV14 => {
    const { schemaVersion: _schemaVersion, activationMode: _activationMode, ...v13 } =
        buildMissionNativeCloseoutPolicyV13(enabled);
    return validateMissionNativeCloseoutPolicyV14({
        ...v13,
        schemaVersion: MISSION_NATIVE_CLOSEOUT_POLICY_V14_SCHEMA_VERSION,
        activationMode: "objectiveStagedBlockerClearance",
    });
};

const canonical = (value: MissionNativeCloseoutPolicyV14): string => JSON.stringify(
    Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right))),
);

export const missionNativeCloseoutPolicyV14Sha256 = (
    policy: MissionNativeCloseoutPolicyV14,
): string => createHash("sha256")
    .update(canonical(validateMissionNativeCloseoutPolicyV14(policy)))
    .digest("hex");
