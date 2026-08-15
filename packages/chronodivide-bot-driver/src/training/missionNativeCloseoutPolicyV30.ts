import { createHash } from "node:crypto";
import {
    MISSION_NATIVE_CLOSEOUT_POLICY_V29_SCHEMA_VERSION,
    MissionNativeCloseoutPolicyV29,
    buildMissionNativeCloseoutPolicyV29,
} from "./missionNativeCloseoutPolicyV29.js";

export const MISSION_NATIVE_CLOSEOUT_POLICY_V30_SCHEMA_VERSION = 30 as const;

export type MissionNativeCloseoutPolicyV30 = Omit<
    MissionNativeCloseoutPolicyV29,
    "schemaVersion" | "adaptiveGroundAssaultProductionReservation"
> & {
    schemaVersion: typeof MISSION_NATIVE_CLOSEOUT_POLICY_V30_SCHEMA_VERSION;
    adaptiveGroundAssaultProductionReservation: false;
    adaptiveGroundAssaultScreenInfrastructure: true;
};

const exactKeys: Array<keyof MissionNativeCloseoutPolicyV30> = [
    "schemaVersion", "enabled", "mechanism", "informationInterface", "activationMode",
    "maxEnemyBuildings", "minTick", "minCombatants", "reserveCombatants", "orderIntervalTicks",
    "maxTargetGroups", "targetPriority", "observationMode", "directVisibleAttack",
    "preemptExistingAttacks", "sweepWhenNoTargets", "capabilityAwareAttackers",
    "reachabilityAwareTargets", "stallTicks", "reassignStalledTargets", "engagementMode",
    "routeCorridorRadius", "engagementAllocationMode", "retargetStalledBuildings",
    "commitRouteBlocker", "readinessReserve", "readinessReserveScope",
    "adaptiveGroundAssaultTargetCount", "adaptiveGroundAssaultInfrastructure",
    "adaptiveGroundAssaultScreenInfrastructure", "adaptiveGroundAssaultInfrastructurePriority",
    "adaptiveGroundAssaultProductionReservation", "adaptiveGroundAssaultProductionScopeLatch",
    "readinessReserveDefenseRadius", "adaptiveGroundAssaultScreenTargetCount",
    "adaptiveGroundAssaultScreenFactoryTrigger", "adaptiveGroundAssaultReadinessForceOwnership",
    "progressiveRouteBlockerLaunch", "requireGroundAssaultCapabilityForActivation",
    "queueAwareGroundAssaultTargets", "positiveProgressBlockerLaunch",
    "persistentCloseoutActivationScope", "requireTransferredGroundAssaultCapabilityForActivation",
    "objectiveFeasibilityOverridesGroundAssaultCapability", "preterminalRequiresRouteFeasibleLaunch",
    "preterminalObjectiveFeasibilityRequiresTransferredCapability",
];

const v29TemplateCache = new Map<boolean, MissionNativeCloseoutPolicyV29>();
const v29Template = (enabled: boolean): MissionNativeCloseoutPolicyV29 => {
    const cached = v29TemplateCache.get(enabled);
    if (cached) return cached;
    const built = buildMissionNativeCloseoutPolicyV29(enabled);
    v29TemplateCache.set(enabled, built);
    return built;
};

export const validateMissionNativeCloseoutPolicyV30 = (
    policy: MissionNativeCloseoutPolicyV30,
): MissionNativeCloseoutPolicyV30 => {
    const actual = Object.keys(policy).sort();
    const expected = exactKeys.slice().sort();
    if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
        throw new Error("Mission-native closeout policy v30 has an invalid exact schema");
    }
    const {
        schemaVersion: _schemaVersion,
        adaptiveGroundAssaultProductionReservation,
        adaptiveGroundAssaultScreenInfrastructure,
        ...v29Fields
    } = policy;
    const expectedV29 = v29Template(policy.enabled);
    for (const [key, value] of Object.entries(expectedV29)) {
        if (key === "schemaVersion" || key === "adaptiveGroundAssaultProductionReservation") continue;
        if (v29Fields[key as keyof typeof v29Fields] !== value) {
            throw new Error(`Mission-native closeout policy v30 inherited field ${key} drifted`);
        }
    }
    if (
        expectedV29.schemaVersion !== MISSION_NATIVE_CLOSEOUT_POLICY_V29_SCHEMA_VERSION ||
        expectedV29.adaptiveGroundAssaultProductionReservation !== true
    ) throw new Error("Mission-native closeout policy v30 V29 template drifted");
    if (policy.schemaVersion !== MISSION_NATIVE_CLOSEOUT_POLICY_V30_SCHEMA_VERSION) {
        throw new Error("Mission-native closeout policy v30 schema version drifted");
    }
    if (adaptiveGroundAssaultProductionReservation !== false) {
        throw new Error("Mission-native closeout policy v30 prelaunch production safety drifted");
    }
    if (adaptiveGroundAssaultScreenInfrastructure !== true) {
        throw new Error("Mission-native closeout policy v30 screen infrastructure drifted");
    }
    return { ...policy };
};

export const buildMissionNativeCloseoutPolicyV30 = (enabled = true): MissionNativeCloseoutPolicyV30 => {
    const {
        schemaVersion: _schemaVersion,
        adaptiveGroundAssaultProductionReservation: _adaptiveGroundAssaultProductionReservation,
        ...v29
    } = v29Template(enabled);
    return validateMissionNativeCloseoutPolicyV30({
        ...v29,
        schemaVersion: MISSION_NATIVE_CLOSEOUT_POLICY_V30_SCHEMA_VERSION,
        adaptiveGroundAssaultProductionReservation: false,
        adaptiveGroundAssaultScreenInfrastructure: true,
    });
};

const canonical = (value: MissionNativeCloseoutPolicyV30): string => JSON.stringify(
    Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right))),
);

export const missionNativeCloseoutPolicyV30Sha256 = (policy: MissionNativeCloseoutPolicyV30): string =>
    createHash("sha256").update(canonical(validateMissionNativeCloseoutPolicyV30(policy))).digest("hex");
