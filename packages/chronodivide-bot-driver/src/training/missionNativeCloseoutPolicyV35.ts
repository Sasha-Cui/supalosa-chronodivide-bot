import { createHash } from "node:crypto";
import {
    MISSION_NATIVE_CLOSEOUT_POLICY_V34_SCHEMA_VERSION,
    MissionNativeCloseoutPolicyV34,
    buildMissionNativeCloseoutPolicyV34,
} from "./missionNativeCloseoutPolicyV34.js";

export const MISSION_NATIVE_CLOSEOUT_POLICY_V35_SCHEMA_VERSION = 35 as const;

export type MissionNativeCloseoutPolicyV35 = Omit<MissionNativeCloseoutPolicyV34, "schemaVersion"> & {
    schemaVersion: typeof MISSION_NATIVE_CLOSEOUT_POLICY_V35_SCHEMA_VERSION;
    physicalProgressDeadlineFallback: true;
    buildingNoProgressDeadlineTicks: 300;
    blockerNoProgressDeadlineTicks: 240;
    predecessorFallbackTicks: 180;
};

const exactKeys: Array<keyof MissionNativeCloseoutPolicyV35> = [
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
];

const v34TemplateCache = new Map<boolean, MissionNativeCloseoutPolicyV34>();
const v34Template = (enabled: boolean): MissionNativeCloseoutPolicyV34 => {
    const cached = v34TemplateCache.get(enabled);
    if (cached) return cached;
    const built = buildMissionNativeCloseoutPolicyV34(enabled);
    v34TemplateCache.set(enabled, built);
    return built;
};

export const validateMissionNativeCloseoutPolicyV35 = (
    policy: MissionNativeCloseoutPolicyV35,
): MissionNativeCloseoutPolicyV35 => {
    const actual = Object.keys(policy).sort();
    const expected = exactKeys.slice().sort();
    if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
        throw new Error("Mission-native closeout policy v35 has an invalid exact schema");
    }
    const {
        schemaVersion: _schemaVersion,
        physicalProgressDeadlineFallback,
        buildingNoProgressDeadlineTicks,
        blockerNoProgressDeadlineTicks,
        predecessorFallbackTicks,
        ...v34Fields
    } = policy;
    const { schemaVersion: expectedSchemaVersion, ...expectedV34Fields } = v34Template(policy.enabled);
    for (const [key, value] of Object.entries(expectedV34Fields)) {
        if (v34Fields[key as keyof typeof v34Fields] !== value) {
            throw new Error(`Mission-native closeout policy v35 inherited field ${key} drifted`);
        }
    }
    if (
        expectedSchemaVersion !== MISSION_NATIVE_CLOSEOUT_POLICY_V34_SCHEMA_VERSION ||
        expectedV34Fields.engagementAllocationMode !== "boundedScreen" ||
        expectedV34Fields.terminalBuildingPriority !== true
    ) throw new Error("Mission-native closeout policy v35 V34 template drifted");
    if (policy.schemaVersion !== MISSION_NATIVE_CLOSEOUT_POLICY_V35_SCHEMA_VERSION) {
        throw new Error("Mission-native closeout policy v35 schema version drifted");
    }
    if (
        physicalProgressDeadlineFallback !== true || buildingNoProgressDeadlineTicks !== 300 ||
        blockerNoProgressDeadlineTicks !== 240 || predecessorFallbackTicks !== 180
    ) throw new Error("Mission-native closeout policy v35 liveness representation drifted");
    return { ...policy };
};

export const buildMissionNativeCloseoutPolicyV35 = (enabled = true): MissionNativeCloseoutPolicyV35 => {
    const { schemaVersion: _schemaVersion, ...v34 } = v34Template(enabled);
    return validateMissionNativeCloseoutPolicyV35({
        ...v34,
        schemaVersion: MISSION_NATIVE_CLOSEOUT_POLICY_V35_SCHEMA_VERSION,
        physicalProgressDeadlineFallback: true,
        buildingNoProgressDeadlineTicks: 300,
        blockerNoProgressDeadlineTicks: 240,
        predecessorFallbackTicks: 180,
    });
};

const canonical = (value: MissionNativeCloseoutPolicyV35): string => JSON.stringify(
    Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right))),
);

export const missionNativeCloseoutPolicyV35Sha256 = (policy: MissionNativeCloseoutPolicyV35): string =>
    createHash("sha256").update(canonical(validateMissionNativeCloseoutPolicyV35(policy))).digest("hex");
