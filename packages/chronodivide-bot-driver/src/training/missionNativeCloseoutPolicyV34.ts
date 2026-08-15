import { createHash } from "node:crypto";
import {
    MISSION_NATIVE_CLOSEOUT_POLICY_V33_SCHEMA_VERSION,
    MissionNativeCloseoutPolicyV33,
    buildMissionNativeCloseoutPolicyV33,
} from "./missionNativeCloseoutPolicyV33.js";

export const MISSION_NATIVE_CLOSEOUT_POLICY_V34_SCHEMA_VERSION = 34 as const;

export type MissionNativeCloseoutPolicyV34 = Omit<
    MissionNativeCloseoutPolicyV33,
    "schemaVersion" | "engagementAllocationMode"
> & {
    schemaVersion: typeof MISSION_NATIVE_CLOSEOUT_POLICY_V34_SCHEMA_VERSION;
    engagementAllocationMode: "boundedScreen";
    terminalBuildingPriority: true;
};

const exactKeys: Array<keyof MissionNativeCloseoutPolicyV34> = [
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
    "externalQueueControllerExclusiveFocusAdapter",
    "terminalBuildingPriority",
];

const v33TemplateCache = new Map<boolean, MissionNativeCloseoutPolicyV33>();
const v33Template = (enabled: boolean): MissionNativeCloseoutPolicyV33 => {
    const cached = v33TemplateCache.get(enabled);
    if (cached) return cached;
    const built = buildMissionNativeCloseoutPolicyV33(enabled);
    v33TemplateCache.set(enabled, built);
    return built;
};

export const validateMissionNativeCloseoutPolicyV34 = (
    policy: MissionNativeCloseoutPolicyV34,
): MissionNativeCloseoutPolicyV34 => {
    const actual = Object.keys(policy).sort();
    const expected = exactKeys.slice().sort();
    if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
        throw new Error("Mission-native closeout policy v34 has an invalid exact schema");
    }
    const {
        schemaVersion: _schemaVersion,
        engagementAllocationMode,
        terminalBuildingPriority,
        ...v33Fields
    } = policy;
    const {
        schemaVersion: _expectedSchemaVersion,
        engagementAllocationMode: _expectedAllocationMode,
        ...expectedV33Fields
    } = v33Template(policy.enabled);
    for (const [key, value] of Object.entries(expectedV33Fields)) {
        if (v33Fields[key as keyof typeof v33Fields] !== value) {
            throw new Error(`Mission-native closeout policy v34 inherited field ${key} drifted`);
        }
    }
    if (
        _expectedSchemaVersion !== MISSION_NATIVE_CLOSEOUT_POLICY_V33_SCHEMA_VERSION ||
        _expectedAllocationMode !== "allBlocker" ||
        expectedV33Fields.externalQueueControllerExclusiveFocusAdapter !== true ||
        expectedV33Fields.adaptiveGroundAssaultQueuedProductionFocusPriority !== 10_000
    ) throw new Error("Mission-native closeout policy v34 V33 template drifted");
    if (policy.schemaVersion !== MISSION_NATIVE_CLOSEOUT_POLICY_V34_SCHEMA_VERSION) {
        throw new Error("Mission-native closeout policy v34 schema version drifted");
    }
    if (engagementAllocationMode !== "boundedScreen" || terminalBuildingPriority !== true) {
        throw new Error("Mission-native closeout policy v34 objective-race representation drifted");
    }
    return { ...policy };
};

export const buildMissionNativeCloseoutPolicyV34 = (enabled = true): MissionNativeCloseoutPolicyV34 => {
    const {
        schemaVersion: _schemaVersion,
        engagementAllocationMode: _engagementAllocationMode,
        ...v33
    } = v33Template(enabled);
    return validateMissionNativeCloseoutPolicyV34({
        ...v33,
        schemaVersion: MISSION_NATIVE_CLOSEOUT_POLICY_V34_SCHEMA_VERSION,
        engagementAllocationMode: "boundedScreen",
        terminalBuildingPriority: true,
    });
};

const canonical = (value: MissionNativeCloseoutPolicyV34): string => JSON.stringify(
    Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right))),
);

export const missionNativeCloseoutPolicyV34Sha256 = (policy: MissionNativeCloseoutPolicyV34): string =>
    createHash("sha256").update(canonical(validateMissionNativeCloseoutPolicyV34(policy))).digest("hex");
