import { createHash } from "node:crypto";
import {
    MISSION_NATIVE_CLOSEOUT_POLICY_V35_SCHEMA_VERSION,
    MissionNativeCloseoutPolicyV35,
    buildMissionNativeCloseoutPolicyV35,
} from "./missionNativeCloseoutPolicyV35.js";

export const MISSION_NATIVE_CLOSEOUT_POLICY_V36_SCHEMA_VERSION = 36 as const;

export type MissionNativeCloseoutPolicyV36 = Omit<MissionNativeCloseoutPolicyV35, "schemaVersion"> & {
    schemaVersion: typeof MISSION_NATIVE_CLOSEOUT_POLICY_V36_SCHEMA_VERSION;
    noOwnerFallbackRecovery: true;
    predecessorOwnershipGraceTicks: 120;
};

const exactKeys: Array<keyof MissionNativeCloseoutPolicyV36> = [
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
    "externalQueueControllerExclusiveFocusAdapter", "terminalBuildingPriority",
    "physicalProgressDeadlineFallback", "buildingNoProgressDeadlineTicks",
    "blockerNoProgressDeadlineTicks", "predecessorFallbackTicks",
    "noOwnerFallbackRecovery", "predecessorOwnershipGraceTicks",
];

const v35TemplateCache = new Map<boolean, MissionNativeCloseoutPolicyV35>();
const v35Template = (enabled: boolean): MissionNativeCloseoutPolicyV35 => {
    const cached = v35TemplateCache.get(enabled);
    if (cached) return cached;
    const built = buildMissionNativeCloseoutPolicyV35(enabled);
    v35TemplateCache.set(enabled, built);
    return built;
};

export const validateMissionNativeCloseoutPolicyV36 = (
    policy: MissionNativeCloseoutPolicyV36,
): MissionNativeCloseoutPolicyV36 => {
    const actual = Object.keys(policy).sort();
    const expected = exactKeys.slice().sort();
    if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
        throw new Error("Mission-native closeout policy v36 has an invalid exact schema");
    }
    const {
        schemaVersion: _schemaVersion,
        noOwnerFallbackRecovery,
        predecessorOwnershipGraceTicks,
        ...v35Fields
    } = policy;
    const { schemaVersion: expectedSchemaVersion, ...expectedV35Fields } = v35Template(policy.enabled);
    for (const [key, value] of Object.entries(expectedV35Fields)) {
        if (v35Fields[key as keyof typeof v35Fields] !== value) {
            throw new Error(`Mission-native closeout policy v36 inherited field ${key} drifted`);
        }
    }
    if (
        expectedSchemaVersion !== MISSION_NATIVE_CLOSEOUT_POLICY_V35_SCHEMA_VERSION ||
        expectedV35Fields.physicalProgressDeadlineFallback !== true ||
        expectedV35Fields.predecessorFallbackTicks !== 180
    ) throw new Error("Mission-native closeout policy v36 V35 template drifted");
    if (policy.schemaVersion !== MISSION_NATIVE_CLOSEOUT_POLICY_V36_SCHEMA_VERSION) {
        throw new Error("Mission-native closeout policy v36 schema version drifted");
    }
    if (noOwnerFallbackRecovery !== true || predecessorOwnershipGraceTicks !== 120) {
        throw new Error("Mission-native closeout policy v36 no-owner recovery representation drifted");
    }
    return { ...policy };
};

export const buildMissionNativeCloseoutPolicyV36 = (enabled = true): MissionNativeCloseoutPolicyV36 => {
    const { schemaVersion: _schemaVersion, ...v35 } = v35Template(enabled);
    return validateMissionNativeCloseoutPolicyV36({
        ...v35,
        schemaVersion: MISSION_NATIVE_CLOSEOUT_POLICY_V36_SCHEMA_VERSION,
        noOwnerFallbackRecovery: true,
        predecessorOwnershipGraceTicks: 120,
    });
};

const canonical = (value: MissionNativeCloseoutPolicyV36): string => JSON.stringify(
    Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right))),
);

export const missionNativeCloseoutPolicyV36Sha256 = (policy: MissionNativeCloseoutPolicyV36): string =>
    createHash("sha256").update(canonical(validateMissionNativeCloseoutPolicyV36(policy))).digest("hex");
