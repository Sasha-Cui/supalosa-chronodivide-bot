import { createHash } from "node:crypto";
import {
    MISSION_NATIVE_CLOSEOUT_POLICY_V36_SCHEMA_VERSION,
    MissionNativeCloseoutPolicyV36,
    buildMissionNativeCloseoutPolicyV36,
} from "./missionNativeCloseoutPolicyV36.js";

export const MISSION_NATIVE_CLOSEOUT_POLICY_V37_SCHEMA_VERSION = 37 as const;

export type MissionNativeCloseoutPolicyV37 = Omit<MissionNativeCloseoutPolicyV36, "schemaVersion"> & {
    schemaVersion: typeof MISSION_NATIVE_CLOSEOUT_POLICY_V37_SCHEMA_VERSION;
    recoverAfterPredecessorOwnershipLoss: true;
};

const exactKeys: Array<keyof MissionNativeCloseoutPolicyV37> = [
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
    "recoverAfterPredecessorOwnershipLoss",
];

const v36TemplateCache = new Map<boolean, MissionNativeCloseoutPolicyV36>();
const v36Template = (enabled: boolean): MissionNativeCloseoutPolicyV36 => {
    const cached = v36TemplateCache.get(enabled);
    if (cached) return cached;
    const built = buildMissionNativeCloseoutPolicyV36(enabled);
    v36TemplateCache.set(enabled, built);
    return built;
};

export const validateMissionNativeCloseoutPolicyV37 = (
    policy: MissionNativeCloseoutPolicyV37,
): MissionNativeCloseoutPolicyV37 => {
    const actual = Object.keys(policy).sort();
    const expected = exactKeys.slice().sort();
    if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
        throw new Error("Mission-native closeout policy v37 has an invalid exact schema");
    }
    const {
        schemaVersion: _schemaVersion,
        recoverAfterPredecessorOwnershipLoss,
        ...v36Fields
    } = policy;
    const { schemaVersion: expectedSchemaVersion, ...expectedV36Fields } = v36Template(policy.enabled);
    for (const [key, value] of Object.entries(expectedV36Fields)) {
        if (v36Fields[key as keyof typeof v36Fields] !== value) {
            throw new Error(`Mission-native closeout policy v37 inherited field ${key} drifted`);
        }
    }
    if (
        expectedSchemaVersion !== MISSION_NATIVE_CLOSEOUT_POLICY_V36_SCHEMA_VERSION ||
        expectedV36Fields.noOwnerFallbackRecovery !== true ||
        expectedV36Fields.predecessorOwnershipGraceTicks !== 120
    ) throw new Error("Mission-native closeout policy v37 V36 template drifted");
    if (policy.schemaVersion !== MISSION_NATIVE_CLOSEOUT_POLICY_V37_SCHEMA_VERSION) {
        throw new Error("Mission-native closeout policy v37 schema version drifted");
    }
    if (recoverAfterPredecessorOwnershipLoss !== true) {
        throw new Error("Mission-native closeout policy v37 ownership-loss recovery representation drifted");
    }
    return { ...policy };
};

export const buildMissionNativeCloseoutPolicyV37 = (enabled = true): MissionNativeCloseoutPolicyV37 => {
    const { schemaVersion: _schemaVersion, ...v36 } = v36Template(enabled);
    return validateMissionNativeCloseoutPolicyV37({
        ...v36,
        schemaVersion: MISSION_NATIVE_CLOSEOUT_POLICY_V37_SCHEMA_VERSION,
        recoverAfterPredecessorOwnershipLoss: true,
    });
};

const canonical = (value: MissionNativeCloseoutPolicyV37): string => JSON.stringify(
    Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right))),
);

export const missionNativeCloseoutPolicyV37Sha256 = (policy: MissionNativeCloseoutPolicyV37): string =>
    createHash("sha256").update(canonical(validateMissionNativeCloseoutPolicyV37(policy))).digest("hex");
