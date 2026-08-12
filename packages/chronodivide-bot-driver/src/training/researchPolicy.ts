import crypto from "node:crypto";
import { StrongBotOptions } from "@supalosa/chronodivide-bot/dist/bot/strongBot.js";
import { StrongStrategyOptions } from "@supalosa/chronodivide-bot/dist/bot/strategy/strongStrategy.js";


export const RESEARCH_POLICY_SCHEMA_VERSION = 1 as const;
export const METHOD_V3_POLICY_SCHEMA_VERSION = 2 as const;
export const METHOD_V3_STAGE2_POLICY_SCHEMA_VERSION = 3 as const;
export const METHOD_V4_POLICY_SCHEMA_VERSION = 4 as const;

export const RESEARCH_ATTACK_COMPOSITIONS = [
    "random",
    "infantry",
    "assault",
    "tanks",
    "heavy",
    "artillery",
    "desolator",
    "naval",
    "aiIni",
] as const;

export const RESEARCH_STRATEGIC_PLANS = [
    "off",
    "macro",
    "macroSiege",
    "macroLateSiege",
    "ecoBoom",
    "rush",
    "tankBoom",
    "tech",
    "siege",
    "adaptive",
] as const;

export type ResearchAttackComposition = typeof RESEARCH_ATTACK_COMPOSITIONS[number];
export type ResearchStrategicPlan = typeof RESEARCH_STRATEGIC_PLANS[number];

export type ResearchPolicyConfigV1 = {
    schemaVersion: typeof RESEARCH_POLICY_SCHEMA_VERSION;
    attackCompositionPolicy: ResearchAttackComposition;
    strategicPlan: ResearchStrategicPlan;
    attackGateEnabled: boolean;
    attackGateMinTick: number;
    attackGateMinCombatants: number;
    attackGateCombatantAdvantage: number;
    attackGateMaxEnemyCombatants: number;
    defenceCheckTicks: number;
    defenceStartingRadius: number;
    defenceRadiusIncreasePerTick: number;
    scoutCooldownTicks: number;
    scoutMaxConcurrentMissions: number;
    engineerTechMaxTargets: number;
    engineerTechMaxDistanceFromStart: number;
    staticDefenseEnabled: boolean;
    staticDefenseStartTick: number;
    staticDefenseTargetCount: number;
    allInEnabled: boolean;
    allInMinTick: number;
    allInMinCombatants: number;
    allInCombatantAdvantage: number;
    forceAttackEnabled: boolean;
    forceAttackMinTick: number;
    forceAttackMinCombatants: number;
    forceAttackCombatantAdvantage: number;
    forceAttackMaxEnemyCombatants: number;
    emergencyDefenseRadius: number;
    emergencyDefenseMaxDefenders: number;
};

export const METHOD_V3_BUILDING_TARGET_PRIORITIES = ["production", "defense", "nearest"] as const;
export const METHOD_V3_OBSERVATION_MODES = ["publicApi", "visibleOnly"] as const;

export type MethodV3PolicyConfig = Omit<ResearchPolicyConfigV1, "schemaVersion"> & {
    schemaVersion: typeof METHOD_V3_POLICY_SCHEMA_VERSION;
    allInDisbandExistingAttacks: boolean;
    rushSellEnabled: boolean;
    finisherArtilleryTargetCount: number;
    finisherArtilleryStartTick: number;
    finisherArtilleryPriority: number;
    finisherArtilleryTechLeadTicks: number;
    finisherArtilleryTechPriority: number;
    buildingEliminationEnabled: boolean;
    buildingEliminationMinTick: number;
    buildingEliminationMinCombatants: number;
    buildingEliminationCombatantAdvantage: number;
    buildingEliminationMaxEnemyCombatants: number;
    buildingEliminationReserveCombatants: number;
    buildingEliminationOrderIntervalTicks: number;
    buildingEliminationMaxTargetGroups: number;
    buildingEliminationTargetPriority: typeof METHOD_V3_BUILDING_TARGET_PRIORITIES[number];
    buildingEliminationObservationMode: typeof METHOD_V3_OBSERVATION_MODES[number];
    buildingEliminationDirectVisibleAttack: boolean;
    buildingEliminationPreemptExistingAttacks: boolean;
    buildingEliminationSweepWhenNoTargets: boolean;
    buildingEliminationSweepRevisitTicks: number;
};

export type MethodV3Stage2PolicyConfig = Omit<MethodV3PolicyConfig, "schemaVersion"> & {
    schemaVersion: typeof METHOD_V3_STAGE2_POLICY_SCHEMA_VERSION;
    buildingEliminationCapabilityAwareAttackers: boolean;
    buildingEliminationReachabilityAwareTargets: boolean;
    buildingEliminationStallTicks: number;
    buildingEliminationReassignStalledTargets: boolean;
    buildingEliminationAdaptiveAirTargetCount: number;
    buildingEliminationAdaptiveNavalTargetCount: number;
};

export type MethodV4PolicyConfig = Omit<MethodV3Stage2PolicyConfig, "schemaVersion"> & {
    schemaVersion: typeof METHOD_V4_POLICY_SCHEMA_VERSION;
    preserveBaselineCore: boolean;
};

export type ResearchPolicyConfig =
    | ResearchPolicyConfigV1
    | MethodV3PolicyConfig
    | MethodV3Stage2PolicyConfig
    | MethodV4PolicyConfig;

const POLICY_KEYS_V1: Array<keyof ResearchPolicyConfigV1> = [
    "schemaVersion",
    "attackCompositionPolicy",
    "strategicPlan",
    "attackGateEnabled",
    "attackGateMinTick",
    "attackGateMinCombatants",
    "attackGateCombatantAdvantage",
    "attackGateMaxEnemyCombatants",
    "defenceCheckTicks",
    "defenceStartingRadius",
    "defenceRadiusIncreasePerTick",
    "scoutCooldownTicks",
    "scoutMaxConcurrentMissions",
    "engineerTechMaxTargets",
    "engineerTechMaxDistanceFromStart",
    "staticDefenseEnabled",
    "staticDefenseStartTick",
    "staticDefenseTargetCount",
    "allInEnabled",
    "allInMinTick",
    "allInMinCombatants",
    "allInCombatantAdvantage",
    "forceAttackEnabled",
    "forceAttackMinTick",
    "forceAttackMinCombatants",
    "forceAttackCombatantAdvantage",
    "forceAttackMaxEnemyCombatants",
    "emergencyDefenseRadius",
    "emergencyDefenseMaxDefenders",
];

const POLICY_KEYS_V2: Array<keyof MethodV3PolicyConfig> = [
    ...(POLICY_KEYS_V1.filter((key) => key !== "schemaVersion") as Array<keyof MethodV3PolicyConfig>),
    "schemaVersion",
    "allInDisbandExistingAttacks",
    "rushSellEnabled",
    "finisherArtilleryTargetCount",
    "finisherArtilleryStartTick",
    "finisherArtilleryPriority",
    "finisherArtilleryTechLeadTicks",
    "finisherArtilleryTechPriority",
    "buildingEliminationEnabled",
    "buildingEliminationMinTick",
    "buildingEliminationMinCombatants",
    "buildingEliminationCombatantAdvantage",
    "buildingEliminationMaxEnemyCombatants",
    "buildingEliminationReserveCombatants",
    "buildingEliminationOrderIntervalTicks",
    "buildingEliminationMaxTargetGroups",
    "buildingEliminationTargetPriority",
    "buildingEliminationObservationMode",
    "buildingEliminationDirectVisibleAttack",
    "buildingEliminationPreemptExistingAttacks",
    "buildingEliminationSweepWhenNoTargets",
    "buildingEliminationSweepRevisitTicks",
];

const POLICY_KEYS_V3: Array<keyof MethodV3Stage2PolicyConfig> = [
    ...(POLICY_KEYS_V2.filter((key) => key !== "schemaVersion") as Array<keyof MethodV3Stage2PolicyConfig>),
    "schemaVersion",
    "buildingEliminationCapabilityAwareAttackers",
    "buildingEliminationReachabilityAwareTargets",
    "buildingEliminationStallTicks",
    "buildingEliminationReassignStalledTargets",
    "buildingEliminationAdaptiveAirTargetCount",
    "buildingEliminationAdaptiveNavalTargetCount",
];

const POLICY_KEYS_V4: Array<keyof MethodV4PolicyConfig> = [
    ...(POLICY_KEYS_V3.filter((key) => key !== "schemaVersion") as Array<keyof MethodV4PolicyConfig>),
    "schemaVersion",
    "preserveBaselineCore",
];

export const DEFAULT_RESEARCH_POLICY: ResearchPolicyConfigV1 = {
    schemaVersion: RESEARCH_POLICY_SCHEMA_VERSION,
    attackCompositionPolicy: "assault",
    strategicPlan: "macro",
    attackGateEnabled: true,
    attackGateMinTick: 7200,
    attackGateMinCombatants: 10,
    attackGateCombatantAdvantage: 0,
    attackGateMaxEnemyCombatants: 999,
    defenceCheckTicks: 24,
    defenceStartingRadius: 36,
    defenceRadiusIncreasePerTick: 0.00045,
    scoutCooldownTicks: 120,
    scoutMaxConcurrentMissions: 2,
    engineerTechMaxTargets: 1,
    engineerTechMaxDistanceFromStart: 38,
    staticDefenseEnabled: false,
    staticDefenseStartTick: 5400,
    staticDefenseTargetCount: 3,
    allInEnabled: true,
    allInMinTick: 12600,
    allInMinCombatants: 10,
    allInCombatantAdvantage: 0,
    forceAttackEnabled: true,
    forceAttackMinTick: 10800,
    forceAttackMinCombatants: 10,
    forceAttackCombatantAdvantage: -6,
    forceAttackMaxEnemyCombatants: 999,
    emergencyDefenseRadius: 48,
    emergencyDefenseMaxDefenders: 24,
};

export const METHOD_V3_STARTING_POLICY: MethodV3PolicyConfig = {
    ...DEFAULT_RESEARCH_POLICY,
    schemaVersion: METHOD_V3_POLICY_SCHEMA_VERSION,
    attackCompositionPolicy: "infantry",
    strategicPlan: "rush",
    defenceRadiusIncreasePerTick: 0.0001,
    scoutCooldownTicks: 45,
    forceAttackEnabled: false,
    forceAttackMinCombatants: 4,
    emergencyDefenseRadius: 64,
    allInDisbandExistingAttacks: false,
    rushSellEnabled: true,
    finisherArtilleryTargetCount: 0,
    finisherArtilleryStartTick: 12_600,
    finisherArtilleryPriority: 120,
    finisherArtilleryTechLeadTicks: 3_600,
    finisherArtilleryTechPriority: 112,
    buildingEliminationEnabled: false,
    buildingEliminationMinTick: 9_000,
    buildingEliminationMinCombatants: 12,
    buildingEliminationCombatantAdvantage: 0,
    buildingEliminationMaxEnemyCombatants: 999,
    buildingEliminationReserveCombatants: 4,
    buildingEliminationOrderIntervalTicks: 15,
    buildingEliminationMaxTargetGroups: 3,
    buildingEliminationTargetPriority: "production",
    buildingEliminationObservationMode: "publicApi",
    buildingEliminationDirectVisibleAttack: true,
    buildingEliminationPreemptExistingAttacks: true,
    buildingEliminationSweepWhenNoTargets: true,
    buildingEliminationSweepRevisitTicks: 900,
};

export const projectMethodV3PolicyToStage2 = (
    policy: MethodV3PolicyConfig,
): MethodV3Stage2PolicyConfig => ({
    ...policy,
    schemaVersion: METHOD_V3_STAGE2_POLICY_SCHEMA_VERSION,
    buildingEliminationCapabilityAwareAttackers: false,
    buildingEliminationReachabilityAwareTargets: false,
    buildingEliminationStallTicks: 900,
    buildingEliminationReassignStalledTargets: false,
    buildingEliminationAdaptiveAirTargetCount: 0,
    buildingEliminationAdaptiveNavalTargetCount: 0,
});

export const projectMethodV3Stage2PolicyToV4 = (
    policy: MethodV3Stage2PolicyConfig,
    preserveBaselineCore: boolean,
): MethodV4PolicyConfig => ({
    ...policy,
    schemaVersion: METHOD_V4_POLICY_SCHEMA_VERSION,
    preserveBaselineCore,
});

export const RESEARCH_POLICY_SEARCH_SPACE: {
    [K in keyof Omit<ResearchPolicyConfigV1, "schemaVersion">]: readonly ResearchPolicyConfigV1[K][];
} = {
    attackCompositionPolicy: RESEARCH_ATTACK_COMPOSITIONS,
    strategicPlan: RESEARCH_STRATEGIC_PLANS,
    attackGateEnabled: [false, true],
    attackGateMinTick: [3600, 5400, 7200, 9000, 10800, 12600],
    attackGateMinCombatants: [4, 6, 8, 10, 12, 16, 20],
    attackGateCombatantAdvantage: [-10, -6, -3, 0, 3, 6, 10],
    attackGateMaxEnemyCombatants: [2, 4, 6, 10, 999],
    defenceCheckTicks: [12, 18, 24, 30, 45, 60],
    defenceStartingRadius: [18, 24, 30, 36, 48, 64],
    defenceRadiusIncreasePerTick: [0.0001, 0.0002, 0.0003, 0.00045, 0.0006],
    scoutCooldownTicks: [45, 90, 120, 180, 240, 360],
    scoutMaxConcurrentMissions: [1, 2, 3, 4],
    engineerTechMaxTargets: [0, 1, 2],
    engineerTechMaxDistanceFromStart: [24, 30, 38, 48, 64],
    staticDefenseEnabled: [false, true],
    staticDefenseStartTick: [2400, 3600, 4800, 5400, 6600, 7200],
    staticDefenseTargetCount: [1, 2, 3, 4, 6],
    allInEnabled: [false, true],
    allInMinTick: [7200, 9000, 10800, 12600, 14400, 16200],
    allInMinCombatants: [4, 6, 8, 10, 12, 16],
    allInCombatantAdvantage: [-10, -6, -3, 0, 3, 6, 10],
    forceAttackEnabled: [false, true],
    forceAttackMinTick: [5400, 7200, 9000, 10800, 12600, 14400],
    forceAttackMinCombatants: [4, 6, 8, 10, 12, 16],
    forceAttackCombatantAdvantage: [-12, -8, -4, 0, 4, 8],
    forceAttackMaxEnemyCombatants: [2, 4, 6, 10, 999],
    emergencyDefenseRadius: [18, 24, 30, 36, 48, 64],
    emergencyDefenseMaxDefenders: [8, 12, 16, 24, 32, 999],
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null && !Array.isArray(value);

const expectBoolean = (record: Record<string, unknown>, key: string): boolean => {
    const value = record[key];
    if (typeof value !== "boolean") {
        throw new Error(`Research policy ${key} must be boolean`);
    }
    return value;
};

const expectNumber = (
    record: Record<string, unknown>,
    key: string,
    minimum: number,
    maximum: number,
    integer = true,
): number => {
    const value = record[key];
    if (
        typeof value !== "number" ||
        !Number.isFinite(value) ||
        value < minimum ||
        value > maximum ||
        (integer && !Number.isInteger(value))
    ) {
        throw new Error(
            `Research policy ${key} must be ${integer ? "an integer" : "a number"} in [${minimum}, ${maximum}]`,
        );
    }
    return value;
};

const expectChoice = <T extends string>(
    record: Record<string, unknown>,
    key: string,
    choices: readonly T[],
): T => {
    const value = record[key];
    if (typeof value !== "string" || !choices.includes(value as T)) {
        throw new Error(`Research policy ${key} must be one of ${choices.join(", ")}`);
    }
    return value as T;
};

export const parseResearchPolicy = (value: unknown): ResearchPolicyConfig => {
    if (!isRecord(value)) {
        throw new Error("Research policy must be an object");
    }
    const schemaVersion = value.schemaVersion;
    if (
        schemaVersion !== RESEARCH_POLICY_SCHEMA_VERSION &&
        schemaVersion !== METHOD_V3_POLICY_SCHEMA_VERSION &&
        schemaVersion !== METHOD_V3_STAGE2_POLICY_SCHEMA_VERSION &&
        schemaVersion !== METHOD_V4_POLICY_SCHEMA_VERSION
    ) {
        throw new Error(
            `Research policy schemaVersion must be ${RESEARCH_POLICY_SCHEMA_VERSION}, ${METHOD_V3_POLICY_SCHEMA_VERSION}, ${METHOD_V3_STAGE2_POLICY_SCHEMA_VERSION}, or ${METHOD_V4_POLICY_SCHEMA_VERSION}`,
        );
    }
    const policyKeys =
        schemaVersion === RESEARCH_POLICY_SCHEMA_VERSION
            ? POLICY_KEYS_V1
            : schemaVersion === METHOD_V3_POLICY_SCHEMA_VERSION
              ? POLICY_KEYS_V2
              : schemaVersion === METHOD_V3_STAGE2_POLICY_SCHEMA_VERSION
                ? POLICY_KEYS_V3
                : POLICY_KEYS_V4;
    const actualKeys = Object.keys(value).sort();
    const expectedKeys = [...policyKeys].sort();
    if (actualKeys.length !== expectedKeys.length || actualKeys.some((key, index) => key !== expectedKeys[index])) {
        const unexpected = actualKeys.filter((key) => !expectedKeys.includes(key as never));
        const missing = expectedKeys.filter((key) => !actualKeys.includes(key));
        throw new Error(
            `Research policy schema mismatch; unexpected=[${unexpected.join(",")}] missing=[${missing.join(",")}]`,
        );
    }
    const common = {
        attackCompositionPolicy: expectChoice(value, "attackCompositionPolicy", RESEARCH_ATTACK_COMPOSITIONS),
        strategicPlan: expectChoice(value, "strategicPlan", RESEARCH_STRATEGIC_PLANS),
        attackGateEnabled: expectBoolean(value, "attackGateEnabled"),
        attackGateMinTick: expectNumber(value, "attackGateMinTick", 0, 100_000),
        attackGateMinCombatants: expectNumber(value, "attackGateMinCombatants", 0, 999),
        attackGateCombatantAdvantage: expectNumber(value, "attackGateCombatantAdvantage", -999, 999),
        attackGateMaxEnemyCombatants: expectNumber(value, "attackGateMaxEnemyCombatants", 0, 999),
        defenceCheckTicks: expectNumber(value, "defenceCheckTicks", 1, 10_000),
        defenceStartingRadius: expectNumber(value, "defenceStartingRadius", 1, 999),
        defenceRadiusIncreasePerTick: expectNumber(value, "defenceRadiusIncreasePerTick", 0, 1, false),
        scoutCooldownTicks: expectNumber(value, "scoutCooldownTicks", 1, 100_000),
        scoutMaxConcurrentMissions: expectNumber(value, "scoutMaxConcurrentMissions", 1, 100),
        engineerTechMaxTargets: expectNumber(value, "engineerTechMaxTargets", 0, 100),
        engineerTechMaxDistanceFromStart: expectNumber(value, "engineerTechMaxDistanceFromStart", 0, 999),
        staticDefenseEnabled: expectBoolean(value, "staticDefenseEnabled"),
        staticDefenseStartTick: expectNumber(value, "staticDefenseStartTick", 0, 100_000),
        staticDefenseTargetCount: expectNumber(value, "staticDefenseTargetCount", 0, 100),
        allInEnabled: expectBoolean(value, "allInEnabled"),
        allInMinTick: expectNumber(value, "allInMinTick", 0, 100_000),
        allInMinCombatants: expectNumber(value, "allInMinCombatants", 0, 999),
        allInCombatantAdvantage: expectNumber(value, "allInCombatantAdvantage", -999, 999),
        forceAttackEnabled: expectBoolean(value, "forceAttackEnabled"),
        forceAttackMinTick: expectNumber(value, "forceAttackMinTick", 0, 100_000),
        forceAttackMinCombatants: expectNumber(value, "forceAttackMinCombatants", 0, 999),
        forceAttackCombatantAdvantage: expectNumber(value, "forceAttackCombatantAdvantage", -999, 999),
        forceAttackMaxEnemyCombatants: expectNumber(value, "forceAttackMaxEnemyCombatants", 0, 999),
        emergencyDefenseRadius: expectNumber(value, "emergencyDefenseRadius", 1, 999),
        emergencyDefenseMaxDefenders: expectNumber(value, "emergencyDefenseMaxDefenders", 1, 999),
    };
    if (schemaVersion === RESEARCH_POLICY_SCHEMA_VERSION) {
        return { schemaVersion: RESEARCH_POLICY_SCHEMA_VERSION, ...common };
    }
    const methodV3 = {
        schemaVersion: METHOD_V3_POLICY_SCHEMA_VERSION,
        ...common,
        allInDisbandExistingAttacks: expectBoolean(value, "allInDisbandExistingAttacks"),
        rushSellEnabled: expectBoolean(value, "rushSellEnabled"),
        finisherArtilleryTargetCount: expectNumber(value, "finisherArtilleryTargetCount", 0, 100),
        finisherArtilleryStartTick: expectNumber(value, "finisherArtilleryStartTick", 0, 100_000),
        finisherArtilleryPriority: expectNumber(value, "finisherArtilleryPriority", 1, 1_000),
        finisherArtilleryTechLeadTicks: expectNumber(value, "finisherArtilleryTechLeadTicks", 0, 100_000),
        finisherArtilleryTechPriority: expectNumber(value, "finisherArtilleryTechPriority", 1, 1_000),
        buildingEliminationEnabled: expectBoolean(value, "buildingEliminationEnabled"),
        buildingEliminationMinTick: expectNumber(value, "buildingEliminationMinTick", 0, 100_000),
        buildingEliminationMinCombatants: expectNumber(value, "buildingEliminationMinCombatants", 0, 1_000),
        buildingEliminationCombatantAdvantage: expectNumber(
            value,
            "buildingEliminationCombatantAdvantage",
            -1_000,
            1_000,
        ),
        buildingEliminationMaxEnemyCombatants: expectNumber(
            value,
            "buildingEliminationMaxEnemyCombatants",
            0,
            1_000,
        ),
        buildingEliminationReserveCombatants: expectNumber(
            value,
            "buildingEliminationReserveCombatants",
            0,
            1_000,
        ),
        buildingEliminationOrderIntervalTicks: expectNumber(
            value,
            "buildingEliminationOrderIntervalTicks",
            1,
            10_000,
        ),
        buildingEliminationMaxTargetGroups: expectNumber(value, "buildingEliminationMaxTargetGroups", 1, 64),
        buildingEliminationTargetPriority: expectChoice(
            value,
            "buildingEliminationTargetPriority",
            METHOD_V3_BUILDING_TARGET_PRIORITIES,
        ),
        buildingEliminationObservationMode: expectChoice(
            value,
            "buildingEliminationObservationMode",
            METHOD_V3_OBSERVATION_MODES,
        ),
        buildingEliminationDirectVisibleAttack: expectBoolean(value, "buildingEliminationDirectVisibleAttack"),
        buildingEliminationPreemptExistingAttacks: expectBoolean(
            value,
            "buildingEliminationPreemptExistingAttacks",
        ),
        buildingEliminationSweepWhenNoTargets: expectBoolean(value, "buildingEliminationSweepWhenNoTargets"),
        buildingEliminationSweepRevisitTicks: expectNumber(
            value,
            "buildingEliminationSweepRevisitTicks",
            0,
            100_000,
        ),
    };
    if (schemaVersion === METHOD_V3_POLICY_SCHEMA_VERSION) {
        return methodV3;
    }
    const stage2 = {
        ...methodV3,
        schemaVersion: METHOD_V3_STAGE2_POLICY_SCHEMA_VERSION,
        buildingEliminationCapabilityAwareAttackers: expectBoolean(
            value,
            "buildingEliminationCapabilityAwareAttackers",
        ),
        buildingEliminationReachabilityAwareTargets: expectBoolean(
            value,
            "buildingEliminationReachabilityAwareTargets",
        ),
        buildingEliminationStallTicks: expectNumber(value, "buildingEliminationStallTicks", 1, 100_000),
        buildingEliminationReassignStalledTargets: expectBoolean(
            value,
            "buildingEliminationReassignStalledTargets",
        ),
        buildingEliminationAdaptiveAirTargetCount: expectNumber(
            value,
            "buildingEliminationAdaptiveAirTargetCount",
            0,
            100,
        ),
        buildingEliminationAdaptiveNavalTargetCount: expectNumber(
            value,
            "buildingEliminationAdaptiveNavalTargetCount",
            0,
            100,
        ),
    };
    if (schemaVersion === METHOD_V3_STAGE2_POLICY_SCHEMA_VERSION) {
        return stage2;
    }
    return {
        ...stage2,
        schemaVersion: METHOD_V4_POLICY_SCHEMA_VERSION,
        preserveBaselineCore: expectBoolean(value, "preserveBaselineCore"),
    };
};

const orderedPolicy = (policy: ResearchPolicyConfig): Record<string, unknown> => {
    const result: Record<string, unknown> = {};
    const keys =
        policy.schemaVersion === RESEARCH_POLICY_SCHEMA_VERSION
            ? POLICY_KEYS_V1
            : policy.schemaVersion === METHOD_V3_POLICY_SCHEMA_VERSION
              ? POLICY_KEYS_V2
              : policy.schemaVersion === METHOD_V3_STAGE2_POLICY_SCHEMA_VERSION
                ? POLICY_KEYS_V3
                : POLICY_KEYS_V4;
    const record = policy as unknown as Record<string, unknown>;
    for (const key of keys) {
        result[key] = record[key];
    }
    return result;
};

export const researchPolicySha256 = (value: unknown): string => {
    const policy = parseResearchPolicy(value);
    return crypto.createHash("sha256").update(JSON.stringify(orderedPolicy(policy))).digest("hex");
};

export const buildResearchStrategyOptions = (value: unknown): StrongStrategyOptions => {
    const policy = parseResearchPolicy(value);
    const methodV3 = policy.schemaVersion === RESEARCH_POLICY_SCHEMA_VERSION ? null : policy;
    const stage2 =
        policy.schemaVersion === METHOD_V3_STAGE2_POLICY_SCHEMA_VERSION ||
        policy.schemaVersion === METHOD_V4_POLICY_SCHEMA_VERSION
            ? policy
            : null;
    const methodV4 = policy.schemaVersion === METHOD_V4_POLICY_SCHEMA_VERSION ? policy : null;
    return {
        defaultMapProfiles: false,
        preserveBaselineCore: methodV4?.preserveBaselineCore ?? false,
        base: {
            attackCompositionPolicy: policy.attackCompositionPolicy,
            attackGate: {
                enabled: policy.attackGateEnabled,
                hfoOnly: false,
                minTick: policy.attackGateMinTick,
                hfoBottomMinTick: policy.attackGateMinTick,
                minCombatants: policy.attackGateMinCombatants,
                hfoBottomMinCombatants: policy.attackGateMinCombatants,
                combatantAdvantage: policy.attackGateCombatantAdvantage,
                maxEnemyCombatants: policy.attackGateMaxEnemyCombatants,
            },
            attackSuppression: { enabled: false, radius: 24, hfoBottomOnly: false },
            attackMission: { allowDefenceSteal: false, targetPriority: "strategic" },
            defence: {
                checkTicks: policy.defenceCheckTicks,
                startingRadius: policy.defenceStartingRadius,
                radiusIncreasePerTick: policy.defenceRadiusIncreasePerTick,
                defendProduction: true,
                missionPriority: 84,
                activePriority: 150,
            },
            scouting: {
                cooldownTicks: policy.scoutCooldownTicks,
                maxConcurrentMissions: policy.scoutMaxConcurrentMissions,
                missionPriority: 18,
            },
            engineer: {
                useKnownTechBuildings: policy.engineerTechMaxTargets > 0,
                techMaxTargets: policy.engineerTechMaxTargets,
                techMaxDistanceFromStart: policy.engineerTechMaxDistanceFromStart,
                techPriority: 96,
                techEscortLevel: 2,
            },
        },
        macroBoost: { enabled: false },
        strategicPlan: {
            enabled: policy.strategicPlan !== "off",
            plan: policy.strategicPlan,
            rushSellTick: 7200,
            rushSellMinCombatants: 12,
            rushSellEnabled: methodV3?.rushSellEnabled ?? true,
            finisherArtilleryTargetCount: methodV3?.finisherArtilleryTargetCount ?? 0,
            finisherArtilleryStartTick: methodV3?.finisherArtilleryStartTick ?? 12_600,
            finisherArtilleryPriority: methodV3?.finisherArtilleryPriority ?? 120,
            finisherArtilleryTechLeadTicks: methodV3?.finisherArtilleryTechLeadTicks ?? 3_600,
            finisherArtilleryTechPriority: methodV3?.finisherArtilleryTechPriority ?? 112,
            dogTargetCount: 2,
            hfoBottomDogTargetCount: 2,
            antiInfantryDogTargetCount: 2,
        },
        staticDefenseBoost: {
            enabled: policy.staticDefenseEnabled,
            hfoBottomOnly: false,
            startTick: policy.staticDefenseStartTick,
            targetCount: policy.staticDefenseTargetCount,
            priority: 84,
            placementAnchors: [],
        },
        allIn: {
            enabled: policy.allInEnabled,
            minTick: policy.allInMinTick,
            minCombatants: policy.allInMinCombatants,
            combatantAdvantage: policy.allInCombatantAdvantage,
            disbandExistingAttacks: methodV3?.allInDisbandExistingAttacks ?? false,
            directVisibleAttack: true,
            hfoWestVsEastOnly: false,
        },
        buildingElimination: methodV3
            ? {
                enabled: methodV3.buildingEliminationEnabled,
                minTick: methodV3.buildingEliminationMinTick,
                minCombatants: methodV3.buildingEliminationMinCombatants,
                combatantAdvantage: methodV3.buildingEliminationCombatantAdvantage,
                maxEnemyCombatants: methodV3.buildingEliminationMaxEnemyCombatants,
                reserveCombatants: methodV3.buildingEliminationReserveCombatants,
                orderIntervalTicks: methodV3.buildingEliminationOrderIntervalTicks,
                maxTargetGroups: methodV3.buildingEliminationMaxTargetGroups,
                targetPriority: methodV3.buildingEliminationTargetPriority,
                observationMode: methodV3.buildingEliminationObservationMode,
                directVisibleAttack: methodV3.buildingEliminationDirectVisibleAttack,
                preemptExistingAttacks: methodV3.buildingEliminationPreemptExistingAttacks,
                sweepWhenNoTargets: methodV3.buildingEliminationSweepWhenNoTargets,
                sweepRevisitTicks: methodV3.buildingEliminationSweepRevisitTicks,
                capabilityAwareAttackers: stage2?.buildingEliminationCapabilityAwareAttackers ?? false,
                reachabilityAwareTargets: stage2?.buildingEliminationReachabilityAwareTargets ?? false,
                stallTicks: stage2?.buildingEliminationStallTicks ?? 900,
                reassignStalledTargets: stage2?.buildingEliminationReassignStalledTargets ?? false,
                adaptiveAirTargetCount: stage2?.buildingEliminationAdaptiveAirTargetCount ?? 0,
                adaptiveNavalTargetCount: stage2?.buildingEliminationAdaptiveNavalTargetCount ?? 0,
                adaptiveProductionPriority: methodV3.finisherArtilleryPriority,
                adaptiveTechPriority: methodV3.finisherArtilleryTechPriority,
            }
            : undefined,
    };
};

export const buildResearchBotOptions = (value: unknown): StrongBotOptions => {
    const policy = parseResearchPolicy(value);
    const preserveBaselineCore =
        policy.schemaVersion === METHOD_V4_POLICY_SCHEMA_VERSION && policy.preserveBaselineCore;
    return {
        defaultMapProfiles: false,
        exactMapTactics: false,
        preserveBaselineCore,
        forceAttack: {
            enabled: policy.forceAttackEnabled,
            minTick: policy.forceAttackMinTick,
            minCombatants: policy.forceAttackMinCombatants,
            combatantAdvantage: policy.forceAttackCombatantAdvantage,
            maxEnemyCombatants: policy.forceAttackMaxEnemyCombatants,
            orderIntervalTicks: 24,
            directAttackKnownTargets: true,
            maxTargets: 8,
            hfoWestVsEastOnly: false,
        },
        harass: { enabled: false },
        emergencyDefense: {
            enabled: !preserveBaselineCore,
            radius: policy.emergencyDefenseRadius,
            minCombatants: 1,
            maxDefenders: policy.emergencyDefenseMaxDefenders,
            orderIntervalTicks: 6,
            directAttackKnownTargets: true,
            mapSignatures: [],
            hfoWestVsEastOnly: false,
            hfoBottomOnly: false,
        },
        harvesterHarass: { enabled: false },
        routeAttack: {
            enabled: false,
            waypoints: [],
            directAttackKnownTargets: false,
            hfoWestVsEastOnly: false,
        },
        hfoCloseout: { enabled: false },
        hfoWestSweep: { enabled: false, waypoints: [] },
        hfoEastSweep: { enabled: false, waypoints: [] },
        hfoBottomSweep: { enabled: false, waypoints: [] },
        hfoBottomPincer: { enabled: false, westWaypoints: [], eastWaypoints: [] },
        hfoBottomCloseout: { enabled: false },
        hfoBottomDemolition: { enabled: false },
        hfoBottomHomeGuard: { enabled: false },
    };
};
