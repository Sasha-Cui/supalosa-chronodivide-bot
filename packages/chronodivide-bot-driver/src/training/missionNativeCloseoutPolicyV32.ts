import { createHash } from "node:crypto";
import {
    MISSION_NATIVE_CLOSEOUT_POLICY_V31_SCHEMA_VERSION,
    MissionNativeCloseoutPolicyV31,
    buildMissionNativeCloseoutPolicyV31,
} from "./missionNativeCloseoutPolicyV31.js";

export const MISSION_NATIVE_CLOSEOUT_POLICY_V32_SCHEMA_VERSION = 32 as const;

export type MissionNativeCloseoutPolicyV32 = Omit<
    MissionNativeCloseoutPolicyV31,
    "schemaVersion" | "adaptiveGroundAssaultQueuedProductionFocusPriority"
> & {
    schemaVersion: typeof MISSION_NATIVE_CLOSEOUT_POLICY_V32_SCHEMA_VERSION;
    adaptiveGroundAssaultQueuedProductionFocusPriority: 10_000;
};

const exactKeys: Array<keyof MissionNativeCloseoutPolicyV32> = [
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

const v31TemplateCache = new Map<boolean, MissionNativeCloseoutPolicyV31>();
const v31Template = (enabled: boolean): MissionNativeCloseoutPolicyV31 => {
    const cached = v31TemplateCache.get(enabled);
    if (cached) return cached;
    const built = buildMissionNativeCloseoutPolicyV31(enabled);
    v31TemplateCache.set(enabled, built);
    return built;
};

export const validateMissionNativeCloseoutPolicyV32 = (
    policy: MissionNativeCloseoutPolicyV32,
): MissionNativeCloseoutPolicyV32 => {
    const actual = Object.keys(policy).sort();
    const expected = exactKeys.slice().sort();
    if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
        throw new Error("Mission-native closeout policy v32 has an invalid exact schema");
    }
    const {
        schemaVersion: _schemaVersion,
        adaptiveGroundAssaultQueuedProductionFocusPriority,
        ...v31Fields
    } = policy;
    const {
        schemaVersion: _expectedSchemaVersion,
        adaptiveGroundAssaultQueuedProductionFocusPriority: expectedFocusPriority,
        ...expectedV31Fields
    } = v31Template(policy.enabled);
    for (const [key, value] of Object.entries(expectedV31Fields)) {
        if (v31Fields[key as keyof typeof v31Fields] !== value) {
            throw new Error(`Mission-native closeout policy v32 inherited field ${key} drifted`);
        }
    }
    if (
        _expectedSchemaVersion !== MISSION_NATIVE_CLOSEOUT_POLICY_V31_SCHEMA_VERSION ||
        expectedFocusPriority !== 1_000 ||
        expectedV31Fields.adaptiveGroundAssaultProductionReservation !== false ||
        expectedV31Fields.adaptiveGroundAssaultScreenInfrastructure !== true
    ) throw new Error("Mission-native closeout policy v32 V31 template drifted");
    if (policy.schemaVersion !== MISSION_NATIVE_CLOSEOUT_POLICY_V32_SCHEMA_VERSION) {
        throw new Error("Mission-native closeout policy v32 schema version drifted");
    }
    if (adaptiveGroundAssaultQueuedProductionFocusPriority !== 10_000) {
        throw new Error("Mission-native closeout policy v32 exclusive queue-safe production focus drifted");
    }
    return { ...policy };
};

export const buildMissionNativeCloseoutPolicyV32 = (enabled = true): MissionNativeCloseoutPolicyV32 => {
    const {
        schemaVersion: _schemaVersion,
        adaptiveGroundAssaultQueuedProductionFocusPriority: _focusPriority,
        ...v31
    } = v31Template(enabled);
    return validateMissionNativeCloseoutPolicyV32({
        ...v31,
        schemaVersion: MISSION_NATIVE_CLOSEOUT_POLICY_V32_SCHEMA_VERSION,
        adaptiveGroundAssaultQueuedProductionFocusPriority: 10_000,
    });
};

const canonical = (value: MissionNativeCloseoutPolicyV32): string => JSON.stringify(
    Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right))),
);

export const missionNativeCloseoutPolicyV32Sha256 = (policy: MissionNativeCloseoutPolicyV32): string =>
    createHash("sha256").update(canonical(validateMissionNativeCloseoutPolicyV32(policy))).digest("hex");
