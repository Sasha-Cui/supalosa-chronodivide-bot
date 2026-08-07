import crypto from "node:crypto";
import { StrongBotOptions } from "@supalosa/chronodivide-bot/dist/bot/strongBot.js";
import { StrongStrategyOptions } from "@supalosa/chronodivide-bot/dist/bot/strategy/strongStrategy.js";


export const RESEARCH_POLICY_SCHEMA_VERSION = 1 as const;

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

export type ResearchPolicyConfig = {
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

const POLICY_KEYS: Array<keyof ResearchPolicyConfig> = [
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

export const DEFAULT_RESEARCH_POLICY: ResearchPolicyConfig = {
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

export const RESEARCH_POLICY_SEARCH_SPACE: {
    [K in keyof Omit<ResearchPolicyConfig, "schemaVersion">]: readonly ResearchPolicyConfig[K][];
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
    const actualKeys = Object.keys(value).sort();
    const expectedKeys = [...POLICY_KEYS].sort();
    if (actualKeys.length !== expectedKeys.length || actualKeys.some((key, index) => key !== expectedKeys[index])) {
        const unexpected = actualKeys.filter((key) => !expectedKeys.includes(key as keyof ResearchPolicyConfig));
        const missing = expectedKeys.filter((key) => !actualKeys.includes(key));
        throw new Error(
            `Research policy schema mismatch; unexpected=[${unexpected.join(",")}] missing=[${missing.join(",")}]`,
        );
    }
    if (value.schemaVersion !== RESEARCH_POLICY_SCHEMA_VERSION) {
        throw new Error(`Research policy schemaVersion must be ${RESEARCH_POLICY_SCHEMA_VERSION}`);
    }
    return {
        schemaVersion: RESEARCH_POLICY_SCHEMA_VERSION,
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
};

const orderedPolicy = (policy: ResearchPolicyConfig): Record<string, unknown> => {
    const result: Record<string, unknown> = {};
    for (const key of POLICY_KEYS) {
        result[key] = policy[key];
    }
    return result;
};

export const researchPolicySha256 = (value: unknown): string => {
    const policy = parseResearchPolicy(value);
    return crypto.createHash("sha256").update(JSON.stringify(orderedPolicy(policy))).digest("hex");
};

export const buildResearchStrategyOptions = (value: unknown): StrongStrategyOptions => {
    const policy = parseResearchPolicy(value);
    return {
        defaultMapProfiles: false,
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
            disbandExistingAttacks: false,
            directVisibleAttack: true,
            hfoWestVsEastOnly: false,
        },
    };
};

export const buildResearchBotOptions = (value: unknown): StrongBotOptions => {
    const policy = parseResearchPolicy(value);
    return {
        defaultMapProfiles: false,
        exactMapTactics: false,
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
            enabled: true,
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
