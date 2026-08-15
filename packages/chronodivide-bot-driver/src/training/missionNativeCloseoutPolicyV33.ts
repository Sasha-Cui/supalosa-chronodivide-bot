import { createHash } from "node:crypto";
import {
    MISSION_NATIVE_CLOSEOUT_POLICY_V32_SCHEMA_VERSION,
    MissionNativeCloseoutPolicyV32,
    buildMissionNativeCloseoutPolicyV32,
} from "./missionNativeCloseoutPolicyV32.js";

export const MISSION_NATIVE_CLOSEOUT_POLICY_V33_SCHEMA_VERSION = 33 as const;

export type MissionNativeCloseoutPolicyV33 = Omit<MissionNativeCloseoutPolicyV32, "schemaVersion"> & {
    schemaVersion: typeof MISSION_NATIVE_CLOSEOUT_POLICY_V33_SCHEMA_VERSION;
    externalQueueControllerExclusiveFocusAdapter: true;
};

const exactKeys: Array<keyof MissionNativeCloseoutPolicyV33> = [
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
];

const v32TemplateCache = new Map<boolean, MissionNativeCloseoutPolicyV32>();
const v32Template = (enabled: boolean): MissionNativeCloseoutPolicyV32 => {
    const cached = v32TemplateCache.get(enabled);
    if (cached) return cached;
    const built = buildMissionNativeCloseoutPolicyV32(enabled);
    v32TemplateCache.set(enabled, built);
    return built;
};

export const validateMissionNativeCloseoutPolicyV33 = (
    policy: MissionNativeCloseoutPolicyV33,
): MissionNativeCloseoutPolicyV33 => {
    const actual = Object.keys(policy).sort();
    const expected = exactKeys.slice().sort();
    if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
        throw new Error("Mission-native closeout policy v33 has an invalid exact schema");
    }
    const {
        schemaVersion: _schemaVersion,
        externalQueueControllerExclusiveFocusAdapter,
        ...v32Fields
    } = policy;
    const {
        schemaVersion: _expectedSchemaVersion,
        ...expectedV32Fields
    } = v32Template(policy.enabled);
    for (const [key, value] of Object.entries(expectedV32Fields)) {
        if (v32Fields[key as keyof typeof v32Fields] !== value) {
            throw new Error(`Mission-native closeout policy v33 inherited field ${key} drifted`);
        }
    }
    if (
        _expectedSchemaVersion !== MISSION_NATIVE_CLOSEOUT_POLICY_V32_SCHEMA_VERSION ||
        expectedV32Fields.adaptiveGroundAssaultQueuedProductionFocusPriority !== 10_000 ||
        expectedV32Fields.adaptiveGroundAssaultProductionReservation !== false ||
        expectedV32Fields.adaptiveGroundAssaultScreenInfrastructure !== true
    ) throw new Error("Mission-native closeout policy v33 V32 template drifted");
    if (policy.schemaVersion !== MISSION_NATIVE_CLOSEOUT_POLICY_V33_SCHEMA_VERSION) {
        throw new Error("Mission-native closeout policy v33 schema version drifted");
    }
    if (externalQueueControllerExclusiveFocusAdapter !== true) {
        throw new Error("Mission-native closeout policy v33 external queue-controller adapter drifted");
    }
    return { ...policy };
};

export const buildMissionNativeCloseoutPolicyV33 = (enabled = true): MissionNativeCloseoutPolicyV33 => {
    const { schemaVersion: _schemaVersion, ...v32 } = v32Template(enabled);
    return validateMissionNativeCloseoutPolicyV33({
        ...v32,
        schemaVersion: MISSION_NATIVE_CLOSEOUT_POLICY_V33_SCHEMA_VERSION,
        externalQueueControllerExclusiveFocusAdapter: true,
    });
};

const canonical = (value: MissionNativeCloseoutPolicyV33): string => JSON.stringify(
    Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right))),
);

export const missionNativeCloseoutPolicyV33Sha256 = (policy: MissionNativeCloseoutPolicyV33): string =>
    createHash("sha256").update(canonical(validateMissionNativeCloseoutPolicyV33(policy))).digest("hex");
