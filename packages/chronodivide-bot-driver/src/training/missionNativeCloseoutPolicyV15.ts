import { createHash } from "node:crypto";
import {
    MissionNativeCloseoutPolicyV14,
    buildMissionNativeCloseoutPolicyV14,
} from "./missionNativeCloseoutPolicyV14.js";

export const MISSION_NATIVE_CLOSEOUT_POLICY_V15_SCHEMA_VERSION = 15 as const;

export type MissionNativeCloseoutPolicyV15 = Omit<
    MissionNativeCloseoutPolicyV14,
    "schemaVersion"
> & {
    schemaVersion: typeof MISSION_NATIVE_CLOSEOUT_POLICY_V15_SCHEMA_VERSION;
    contactOnlyBlockerClearance: true;
};

const exactKeys: Array<keyof MissionNativeCloseoutPolicyV15> = [
    "schemaVersion", "enabled", "mechanism", "informationInterface",
    "activationMode", "maxEnemyBuildings", "minTick", "minCombatants",
    "reserveCombatants", "orderIntervalTicks", "maxTargetGroups", "targetPriority",
    "observationMode", "directVisibleAttack", "preemptExistingAttacks",
    "sweepWhenNoTargets", "capabilityAwareAttackers", "reachabilityAwareTargets",
    "stallTicks", "reassignStalledTargets", "engagementMode", "routeCorridorRadius",
    "engagementAllocationMode", "retargetStalledBuildings", "commitRouteBlocker",
    "readinessReserve", "readinessReserveScope", "contactOnlyBlockerClearance",
];

export const validateMissionNativeCloseoutPolicyV15 = (
    policy: MissionNativeCloseoutPolicyV15,
): MissionNativeCloseoutPolicyV15 => {
    const actual = Object.keys(policy).sort();
    const expected = exactKeys.slice().sort();
    if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
        throw new Error("Mission-native closeout policy v15 has an invalid exact schema");
    }
    const { schemaVersion: _schemaVersion, contactOnlyBlockerClearance, ...v14Fields } = policy;
    const expectedV14 = buildMissionNativeCloseoutPolicyV14(policy.enabled);
    for (const [key, value] of Object.entries(expectedV14)) {
        if (key === "schemaVersion") continue;
        if (v14Fields[key as keyof typeof v14Fields] !== value) {
            throw new Error(`Mission-native closeout policy v15 inherited field ${key} drifted`);
        }
    }
    if (policy.schemaVersion !== MISSION_NATIVE_CLOSEOUT_POLICY_V15_SCHEMA_VERSION) {
        throw new Error("Mission-native closeout policy v15 schema version drifted");
    }
    if (contactOnlyBlockerClearance !== true) {
        throw new Error("Mission-native closeout policy v15 contact-clearance representation drifted");
    }
    return { ...policy };
};

export const buildMissionNativeCloseoutPolicyV15 = (
    enabled = true,
): MissionNativeCloseoutPolicyV15 => {
    const { schemaVersion: _schemaVersion, ...v14 } = buildMissionNativeCloseoutPolicyV14(enabled);
    return validateMissionNativeCloseoutPolicyV15({
        ...v14,
        schemaVersion: MISSION_NATIVE_CLOSEOUT_POLICY_V15_SCHEMA_VERSION,
        contactOnlyBlockerClearance: true,
    });
};

const canonical = (value: MissionNativeCloseoutPolicyV15): string => JSON.stringify(
    Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right))),
);

export const missionNativeCloseoutPolicyV15Sha256 = (
    policy: MissionNativeCloseoutPolicyV15,
): string => createHash("sha256")
    .update(canonical(validateMissionNativeCloseoutPolicyV15(policy)))
    .digest("hex");
