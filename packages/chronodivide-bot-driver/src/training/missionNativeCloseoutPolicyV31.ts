import { createHash } from "node:crypto";
import {
    MISSION_NATIVE_CLOSEOUT_POLICY_V30_SCHEMA_VERSION,
    MissionNativeCloseoutPolicyV30,
    buildMissionNativeCloseoutPolicyV30,
} from "./missionNativeCloseoutPolicyV30.js";

export const MISSION_NATIVE_CLOSEOUT_POLICY_V31_SCHEMA_VERSION = 31 as const;

export type MissionNativeCloseoutPolicyV31 = Omit<
    MissionNativeCloseoutPolicyV30,
    "schemaVersion"
> & {
    schemaVersion: typeof MISSION_NATIVE_CLOSEOUT_POLICY_V31_SCHEMA_VERSION;
    adaptiveGroundAssaultQueuedProductionFocusPriority: 1_000;
};

const exactKeys: Array<keyof MissionNativeCloseoutPolicyV31> = [
    "schemaVersion", "enabled", "mechanism", "informationInterface", "activationMode",
    "maxEnemyBuildings", "minTick", "minCombatants", "reserveCombatants", "orderIntervalTicks",
    "maxTargetGroups", "targetPriority", "observationMode", "directVisibleAttack",
    "preemptExistingAttacks", "sweepWhenNoTargets", "capabilityAwareAttackers",
    "reachabilityAwareTargets", "stallTicks", "reassignStalledTargets", "engagementMode",
    "routeCorridorRadius", "engagementAllocationMode", "retargetStalledBuildings",
    "commitRouteBlocker", "readinessReserve", "readinessReserveScope",
    "adaptiveGroundAssaultTargetCount", "adaptiveGroundAssaultInfrastructure",
    "adaptiveGroundAssaultScreenInfrastructure", "adaptiveGroundAssaultInfrastructurePriority",
    "adaptiveGroundAssaultQueuedProductionFocusPriority",
    "adaptiveGroundAssaultProductionReservation", "adaptiveGroundAssaultProductionScopeLatch",
    "readinessReserveDefenseRadius", "adaptiveGroundAssaultScreenTargetCount",
    "adaptiveGroundAssaultScreenFactoryTrigger", "adaptiveGroundAssaultReadinessForceOwnership",
    "progressiveRouteBlockerLaunch", "requireGroundAssaultCapabilityForActivation",
    "queueAwareGroundAssaultTargets", "positiveProgressBlockerLaunch",
    "persistentCloseoutActivationScope", "requireTransferredGroundAssaultCapabilityForActivation",
    "objectiveFeasibilityOverridesGroundAssaultCapability", "preterminalRequiresRouteFeasibleLaunch",
    "preterminalObjectiveFeasibilityRequiresTransferredCapability",
];

const v30TemplateCache = new Map<boolean, MissionNativeCloseoutPolicyV30>();
const v30Template = (enabled: boolean): MissionNativeCloseoutPolicyV30 => {
    const cached = v30TemplateCache.get(enabled);
    if (cached) return cached;
    const built = buildMissionNativeCloseoutPolicyV30(enabled);
    v30TemplateCache.set(enabled, built);
    return built;
};

export const validateMissionNativeCloseoutPolicyV31 = (
    policy: MissionNativeCloseoutPolicyV31,
): MissionNativeCloseoutPolicyV31 => {
    const actual = Object.keys(policy).sort();
    const expected = exactKeys.slice().sort();
    if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
        throw new Error("Mission-native closeout policy v31 has an invalid exact schema");
    }
    const {
        schemaVersion: _schemaVersion,
        adaptiveGroundAssaultQueuedProductionFocusPriority,
        ...v30Fields
    } = policy;
    const expectedV30 = v30Template(policy.enabled);
    for (const [key, value] of Object.entries(expectedV30)) {
        if (key === "schemaVersion") continue;
        if (v30Fields[key as keyof typeof v30Fields] !== value) {
            throw new Error(`Mission-native closeout policy v31 inherited field ${key} drifted`);
        }
    }
    if (
        expectedV30.schemaVersion !== MISSION_NATIVE_CLOSEOUT_POLICY_V30_SCHEMA_VERSION ||
        expectedV30.adaptiveGroundAssaultProductionReservation !== false ||
        expectedV30.adaptiveGroundAssaultScreenInfrastructure !== true
    ) throw new Error("Mission-native closeout policy v31 V30 template drifted");
    if (policy.schemaVersion !== MISSION_NATIVE_CLOSEOUT_POLICY_V31_SCHEMA_VERSION) {
        throw new Error("Mission-native closeout policy v31 schema version drifted");
    }
    if (adaptiveGroundAssaultQueuedProductionFocusPriority !== 1_000) {
        throw new Error("Mission-native closeout policy v31 queue-safe production focus drifted");
    }
    return { ...policy };
};

export const buildMissionNativeCloseoutPolicyV31 = (enabled = true): MissionNativeCloseoutPolicyV31 => {
    const {
        schemaVersion: _schemaVersion,
        ...v30
    } = v30Template(enabled);
    return validateMissionNativeCloseoutPolicyV31({
        ...v30,
        schemaVersion: MISSION_NATIVE_CLOSEOUT_POLICY_V31_SCHEMA_VERSION,
        adaptiveGroundAssaultQueuedProductionFocusPriority: 1_000,
    });
};

const canonical = (value: MissionNativeCloseoutPolicyV31): string => JSON.stringify(
    Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right))),
);

export const missionNativeCloseoutPolicyV31Sha256 = (policy: MissionNativeCloseoutPolicyV31): string =>
    createHash("sha256").update(canonical(validateMissionNativeCloseoutPolicyV31(policy))).digest("hex");
