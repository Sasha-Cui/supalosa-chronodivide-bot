import fs from "node:fs";
import path from "node:path";
import { CreateOfflineOpts, GameApi, ObjectType, Vector2, cdapi } from "@chronodivide/game-api";
import { SupalosaBot } from "@supalosa/chronodivide-bot/dist/bot/bot.js";
import { DefaultStrategy } from "@supalosa/chronodivide-bot/dist/bot/strategy/defaultStrategy.js";
import { StrongStrategy, StrongStrategyOptions } from "@supalosa/chronodivide-bot/dist/bot/strategy/strongStrategy.js";
import { StrongBot, StrongBotOptions } from "@supalosa/chronodivide-bot/dist/bot/strongBot.js";
import { Countries } from "@supalosa/chronodivide-bot/dist/bot/logic/common/utils.js";

type Winner = "candidate" | "baseline" | "draw";

type MatchResult = {
    episode: number;
    generation: number;
    candidateId: string;
    mapName: string;
    candidateCountry: Countries;
    baselineCountry: Countries;
    candidateSlot: number;
    candidateStart: { x: number; y: number };
    baselineStart: { x: number; y: number };
    ticks: number;
    finished: boolean;
    winner: Winner;
    reward: number;
    candidateCredits: number;
    baselineCredits: number;
    candidateUnits: number;
    baselineUnits: number;
    candidateBuildings: number;
    baselineBuildings: number;
    candidateCombatants: number;
    baselineCombatants: number;
};

type AttackCompositionPolicy =
    | "random"
    | "infantry"
    | "assault"
    | "tanks"
    | "air"
    | "heavy"
    | "artillery"
    | "desolator"
    | "hfo";
type StrategicPlanPolicy =
    | "off"
    | "macro"
    | "macroSiege"
    | "macroLateSiege"
    | "hfoBottom"
    | "rush"
    | "tankBoom"
    | "otmqAntiInfantry"
    | "tech"
    | "siege"
    | "westSiege"
    | "islandTech"
    | "adaptive"
    | "hfo";

type SearchMode = "full" | "safe_gate" | "strong_tactics" | "broad";

type PolicyConfig = {
    candidateCountry: Countries;
    attackCompositionPolicy: AttackCompositionPolicy;
    attackGateEnabled: boolean;
    attackGateMinTick: number;
    attackGateMinCombatants: number;
    attackGateHfoBottomMinCombatants: number;
    attackGateCombatantAdvantage: number;
    attackGateMaxEnemyCombatants: number;
    attackSuppressionEnabled?: boolean;
    attackSuppressionRadius?: number;
    strategicPlan: StrategicPlanPolicy;
    rushSellTick: number;
    rushSellMinCombatants: number;
    strategicDogTargetCount: number;
    hfoBottomDogTargetCount: number;
    antiInfantryDogTargetCount: number;
    attackAllowDefenceSteal: boolean;
    defenceCheckTicks: number;
    defenceStartingRadius: number;
    defenceRadiusIncreasePerTick: number;
    defenceDefendProduction: boolean;
    defenceMissionPriority: number;
    defenceActivePriority: number;
    scoutCooldownTicks: number;
    scoutMaxConcurrentMissions: number;
    scoutMissionPriority: number;
    engineerKnownTechEnabled: boolean;
    engineerTechMaxTargets: number;
    engineerTechMaxDistanceFromStart: number;
    engineerTechPriority: number;
    engineerTechEscortLevel: number;
    macroBoostEnabled: boolean;
    staticDefenseEnabled: boolean;
    staticDefenseStartTick: number;
    staticDefenseTargetCount: number;
    staticDefensePriority: number;
    allInEnabled: boolean;
    allInMinTick: number;
    allInMinCombatants: number;
    allInCombatantAdvantage: number;
    allInDisbandExistingAttacks: boolean;
    allInDirectVisibleAttack: boolean;
    harassEnabled: boolean;
    harassMinTick: number;
    harassMinCombatants: number;
    harassMaxUnits: number;
    harassCombatantAdvantage: number;
    harassMaxEnemyCombatants: number;
    harassOrderIntervalTicks: number;
    harassDirectAttackKnownTargets: boolean;
    forceAttackEnabled: boolean;
    forceAttackMinTick: number;
    forceAttackMinCombatants: number;
    forceAttackCombatantAdvantage: number;
    forceAttackMaxEnemyCombatants: number;
    forceAttackOrderIntervalTicks: number;
    forceAttackDirectAttackKnownTargets: boolean;
    forceAttackMaxTargets: number;
    forceAttackHfoWestVsEastOnly: boolean;
    routeAttackEnabled: boolean;
    routeAttackMinTick: number;
    routeAttackMinCombatants: number;
    routeAttackOrderIntervalTicks: number;
    routeAttackAdvanceIntervalTicks: number;
    routeAttackWaypoints: string;
    routeAttackDirectAttackKnownTargets: boolean;
    hfoCloseoutEnabled: boolean;
    hfoCloseoutMinTick: number;
    hfoCloseoutMinUnits: number;
    hfoCloseoutMaxEnemyBuildings: number;
    hfoCloseoutMaxEnemyCombatants: number;
    hfoCloseoutOrderIntervalTicks: number;
    hfoCloseoutIncludeHarvesters: boolean;
    hfoWestSweepEnabled: boolean;
    hfoWestSweepMinTick: number;
    hfoWestSweepMinCombatants: number;
    hfoWestSweepCombatantAdvantage: number;
    hfoWestSweepMaxEnemyCombatants: number;
    hfoWestSweepOrderIntervalTicks: number;
    hfoWestSweepAdvanceIntervalTicks: number;
    hfoWestSweepWaypoints: string;
    hfoWestSweepDirectAttackKnownTargets: boolean;
    hfoWestSweepMaxTargets: number;
    emergencyDefenseEnabled: boolean;
    emergencyDefenseRadius: number;
    emergencyDefenseMinCombatants: number;
    emergencyDefenseMaxDefenders: number;
    emergencyDefenseOrderIntervalTicks: number;
    emergencyDefenseDirectAttackKnownTargets: boolean;
    emergencyDefenseHfoWestVsEastOnly: boolean;
};

type BaseDefenseTuningKey =
    | "strategicPlan"
    | "rushSellTick"
    | "rushSellMinCombatants"
    | "strategicDogTargetCount"
    | "hfoBottomDogTargetCount"
    | "antiInfantryDogTargetCount"
    | "attackGateHfoBottomMinCombatants"
    | "attackAllowDefenceSteal"
    | "defenceCheckTicks"
    | "defenceStartingRadius"
    | "defenceRadiusIncreasePerTick"
    | "defenceDefendProduction"
    | "defenceMissionPriority"
    | "defenceActivePriority"
    | "scoutCooldownTicks"
    | "scoutMaxConcurrentMissions"
    | "scoutMissionPriority"
    | "engineerKnownTechEnabled"
    | "engineerTechMaxTargets"
    | "engineerTechMaxDistanceFromStart"
    | "engineerTechPriority"
    | "engineerTechEscortLevel"
    | "routeAttackEnabled"
    | "forceAttackHfoWestVsEastOnly"
    | "emergencyDefenseHfoWestVsEastOnly"
    | "routeAttackMinTick"
    | "routeAttackMinCombatants"
    | "routeAttackOrderIntervalTicks"
    | "routeAttackAdvanceIntervalTicks"
    | "routeAttackWaypoints"
    | "routeAttackDirectAttackKnownTargets"
    | "hfoCloseoutEnabled"
    | "hfoCloseoutMinTick"
    | "hfoCloseoutMinUnits"
    | "hfoCloseoutMaxEnemyBuildings"
    | "hfoCloseoutMaxEnemyCombatants"
    | "hfoCloseoutOrderIntervalTicks"
    | "hfoCloseoutIncludeHarvesters"
    | "hfoWestSweepEnabled"
    | "hfoWestSweepMinTick"
    | "hfoWestSweepMinCombatants"
    | "hfoWestSweepCombatantAdvantage"
    | "hfoWestSweepMaxEnemyCombatants"
    | "hfoWestSweepOrderIntervalTicks"
    | "hfoWestSweepAdvanceIntervalTicks"
    | "hfoWestSweepWaypoints"
    | "hfoWestSweepDirectAttackKnownTargets"
    | "hfoWestSweepMaxTargets";

type SeedPolicyConfig = Omit<PolicyConfig, BaseDefenseTuningKey> & Partial<Pick<PolicyConfig, BaseDefenseTuningKey>>;

type EvaluationSummary = {
    matches: number;
    wins: number;
    losses: number;
    draws: number;
    winRate: number;
    lossRate: number;
    score: number;
    meanReward: number;
    minReward: number;
    avgTicks: number;
};

type Evaluation = {
    generation: number;
    candidateId: string;
    config: PolicyConfig;
    summary: EvaluationSummary;
    results: MatchResult[];
};

type TrainerSettings = {
    seed: number;
    generations: number;
    populationSize: number;
    eliteCount: number;
    repeats: number;
    maxTicks: number;
    maps: string[];
    candidateCountries: Countries[];
    baselineCountries: Countries[];
    candidateStarts?: string[];
    baselineStarts?: string[];
    startFilterMaxAttempts: number;
    outDir: string;
    runTag: string;
    searchMode: SearchMode;
};

class InspectableSupalosaBot extends SupalosaBot {
    public lastGameApi: GameApi | null = null;

    override onGameStart(game: GameApi): void {
        this.lastGameApi = game;
        super.onGameStart(game);
    }

    override onGameTick(game: GameApi): void {
        this.lastGameApi = game;
        super.onGameTick(game);
    }
}

class Random {
    private state: number;

    constructor(seed: number) {
        this.state = seed >>> 0;
        if (this.state === 0) {
            this.state = 0x9e3779b9;
        }
    }

    next(): number {
        this.state = (1664525 * this.state + 1013904223) >>> 0;
        return this.state / 0x100000000;
    }

    bool(probability = 0.5): boolean {
        return this.next() < probability;
    }

    int(minInclusive: number, maxInclusive: number): number {
        return Math.floor(this.next() * (maxInclusive - minInclusive + 1)) + minInclusive;
    }

    choice<T>(values: readonly T[]): T {
        if (values.length === 0) {
            throw new Error("Cannot choose from an empty list");
        }
        return values[this.int(0, values.length - 1)];
    }
}

const MIN_TICK_VALUES = [3600, 5400, 7200, 9000, 10800, 12600, 14400, 16200];
const MIN_COMBATANT_VALUES = [2, 3, 4, 5, 6, 8, 10, 12];
const ADVANTAGE_VALUES = [-10, -6, -3, 0, 3, 6, 10, 14];
const MAX_ENEMY_COMBATANT_VALUES = [0, 1, 2, 3, 4, 6, 10, 999];
const ORDER_INTERVAL_VALUES = [15, 24, 30, 45, 60, 90];
const EMERGENCY_RADIUS_VALUES = [10, 12, 15, 18, 21, 24, 27, 30, 36, 48, 64];
const EMERGENCY_MAX_DEFENDER_VALUES = [8, 12, 16, 24, 32, 999];
const EMERGENCY_ORDER_INTERVAL_VALUES = [3, 6, 8, 12, 15, 24, 30, 45, 60];
const ATTACK_SUPPRESSION_RADIUS_VALUES = [12, 15, 18, 21, 24, 27, 30, 36];
const DEFENCE_CHECK_TICK_VALUES = [15, 24, 30, 45, 60];
const DEFENCE_STARTING_RADIUS_VALUES = [6, 12, 18, 20, 24, 28, 32, 36];
const DEFENCE_RADIUS_INCREASE_VALUES = [0.0001, 0.0002, 0.0003, 0.00045, 0.0006];
const DEFENCE_MISSION_PRIORITY_VALUES = [10, 40, 50, 60, 70, 80];
const DEFENCE_ACTIVE_PRIORITY_VALUES = [80, 100, 120, 140, 160];
const STATIC_DEFENSE_START_TICK_VALUES = [1800, 2400, 3600, 4800, 5400, 6000, 6600, 7200];
const STATIC_DEFENSE_TARGET_COUNT_VALUES = [2, 3, 4, 5, 6, 8, 10];
const STATIC_DEFENSE_PRIORITY_VALUES = [18, 24, 28, 36, 48, 84, 126, 132, 160, 180, 200];
const ATTACK_COMPOSITION_POLICIES: AttackCompositionPolicy[] = [
    "random",
    "hfo",
    "infantry",
    "assault",
    "tanks",
    "air",
    "heavy",
    "artillery",
    "desolator",
];
const ROUTE_ATTACK_WAYPOINT_VALUES = [
    "74,95;103,116;128,122;151,119",
    "78,104;111,121;139,124;151,119",
    "62,86;95,102;121,114;151,119",
    "82,86;110,104;138,112;151,119",
    "74,95;103,116;128,122;151,119;151,128",
];
const ROUTE_ATTACK_ADVANCE_INTERVAL_VALUES = [600, 900, 1200, 1500, 1800];
const HFO_CLOSEOUT_MAX_BUILDING_VALUES = [1, 2, 3, 5, 8, 999];
const HFO_WEST_SWEEP_WAYPOINT_VALUES = [
    "76,95;103,116;127,122;147,121;151,119;151,129;140,134",
    "74,95;103,116;128,122;151,119;151,128;140,134",
    "78,104;111,121;139,124;151,119;151,130",
    "62,86;95,102;121,114;145,119;151,119;151,129",
    "82,86;110,104;138,112;151,119;151,128;142,134",
];
const STRATEGIC_PLAN_POLICIES: StrategicPlanPolicy[] = [
    "off",
    "hfo",
    "hfoBottom",
    "macro",
    "macroSiege",
    "macroLateSiege",
    "rush",
    "tankBoom",
    "otmqAntiInfantry",
    "tech",
    "siege",
    "westSiege",
    "islandTech",
    "adaptive",
];
const RUSH_SELL_TICK_VALUES = [5400, 6600, 7200, 8400, 9000, 10800];
const RUSH_SELL_MIN_COMBATANT_VALUES = [6, 8, 10, 12, 16, 20];
const DOG_TARGET_COUNT_VALUES = [0, 1, 2, 3, 4, 5, 6, 7];
const SCOUT_COOLDOWN_TICK_VALUES = [45, 90, 120, 180, 240, 360];
const SCOUT_MAX_CONCURRENT_VALUES = [1, 2, 3, 4, 5];
const SCOUT_MISSION_PRIORITY_VALUES = [6, 10, 18, 30, 50];

const parseWaypointString = (waypoints: string): Vector2[] =>
    waypoints
        .split(";")
        .map((pair) => {
            const [xRaw, yRaw] = pair.split(",");
            const x = Number.parseInt(xRaw, 10);
            const y = Number.parseInt(yRaw, 10);
            if (!Number.isFinite(x) || !Number.isFinite(y)) {
                throw new Error(`Invalid route waypoint ${pair}`);
            }
            return new Vector2(x, y);
        });

const countVisible = (game: GameApi | null, playerName: string, filter: "units" | "buildings" | "combatants"): number => {
    if (!game) {
        return 0;
    }
    switch (filter) {
        case "units":
            return game.getVisibleUnits(playerName, "self").length;
        case "buildings":
            return game.getVisibleUnits(playerName, "self", (rules) => rules.type === ObjectType.Building).length;
        case "combatants":
            return game.getVisibleUnits(playerName, "self", (rules) => rules.isSelectableCombatant).length;
    }
};

const parseIntEnv = (name: string, defaultValue: number): number => {
    const raw = process.env[name];
    if (!raw) {
        return defaultValue;
    }
    const parsed = Number.parseInt(raw, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        throw new Error(`${name} must be a positive integer, got ${raw}`);
    }
    return parsed;
};

const parseNonNegativeIntEnv = (name: string, defaultValue: number): number => {
    const raw = process.env[name];
    if (!raw) {
        return defaultValue;
    }
    const parsed = Number.parseInt(raw, 10);
    if (!Number.isFinite(parsed) || parsed < 0) {
        throw new Error(`${name} must be a non-negative integer, got ${raw}`);
    }
    return parsed;
};

const parseMaps = (): string[] => {
    return (process.env.TRAIN_MAPS || process.env.MAPS || "simple-1v1-no-preview.map")
        .split(",")
        .map((mapName) => mapName.trim())
        .filter((mapName) => mapName.length > 0);
};

const parseStartFilters = (name: string): string[] | undefined => {
    const raw = process.env[name];
    if (!raw) {
        return undefined;
    }
    const starts = raw
        .split(";")
        .map((start) => start.trim())
        .filter((start) => start.length > 0);
    for (const start of starts) {
        if (!/^\d+,\d+$/.test(start)) {
            throw new Error(`${name} contains invalid start coordinate ${start}; use x,y or x,y;x,y`);
        }
    }
    return starts;
};

const parseCountries = (name: string, defaultValue: Countries[]): Countries[] => {
    const raw = process.env[name];
    if (!raw) {
        return defaultValue;
    }
    const values = new Set(Object.values(Countries));
    return raw.split(",").map((country) => {
        const trimmed = country.trim();
        if (!values.has(trimmed as Countries)) {
            throw new Error(`${name} contains unknown country ${trimmed}`);
        }
        return trimmed as Countries;
    });
};

const sanitizeTag = (value: string): string => value.replace(/[^a-zA-Z0-9_.-]/g, "_");

const parseSearchMode = (): SearchMode => {
    const raw = process.env.TRAIN_SEARCH_MODE || "full";
    if (raw === "full" || raw === "safe_gate" || raw === "strong_tactics" || raw === "broad") {
        return raw;
    }
    if (raw === "safe") {
        return "safe_gate";
    }
    throw new Error(`TRAIN_SEARCH_MODE must be full, safe_gate, strong_tactics, or broad, got ${raw}`);
};

const parseSettings = (): TrainerSettings => {
    const arrayTaskId = parseNonNegativeIntEnv("SLURM_ARRAY_TASK_ID", 0);
    const seed = parseIntEnv("TRAIN_SEED", 7331 + arrayTaskId);
    const populationSize = parseIntEnv("TRAIN_POPULATION", 24);
    const eliteCount = Math.min(parseIntEnv("TRAIN_ELITES", Math.max(2, Math.ceil(populationSize / 5))), populationSize);
    const runTag = sanitizeTag(process.env.RUN_TAG || `seed-${seed}-${Date.now()}`);
    return {
        seed,
        generations: parseIntEnv("TRAIN_GENERATIONS", 8),
        populationSize,
        eliteCount,
        repeats: parseIntEnv("TRAIN_REPEATS", 1),
        maxTicks: parseIntEnv("TRAIN_MAX_TICKS", 18000),
        maps: parseMaps(),
        candidateCountries: parseCountries("TRAIN_CANDIDATE_COUNTRIES", [Countries.IRAQ, Countries.FRANCE, Countries.RUSSIA]),
        baselineCountries: parseCountries("BASELINE_COUNTRIES", [Countries.IRAQ, Countries.FRANCE, Countries.RUSSIA]),
        candidateStarts: parseStartFilters("TRAIN_CANDIDATE_STARTS"),
        baselineStarts: parseStartFilters("TRAIN_BASELINE_STARTS"),
        startFilterMaxAttempts: parseIntEnv("TRAIN_START_FILTER_MAX_ATTEMPTS", 40),
        outDir: process.env.OUT_DIR || path.join("benchmark-results", "training", runTag),
        runTag,
        searchMode: parseSearchMode(),
    };
};

const buildStrongStrategyOptions = (config: PolicyConfig): StrongStrategyOptions => ({
    base: {
        attackCompositionPolicy: config.attackCompositionPolicy,
        attackGate: {
            enabled: config.attackGateEnabled,
            minTick: config.attackGateMinTick,
            minCombatants: config.attackGateMinCombatants,
            hfoBottomMinCombatants: config.attackGateHfoBottomMinCombatants,
            combatantAdvantage: config.attackGateCombatantAdvantage,
            maxEnemyCombatants: config.attackGateMaxEnemyCombatants,
        },
        attackSuppression: {
            enabled: config.attackSuppressionEnabled,
            radius: config.attackSuppressionRadius,
        },
        attackMission: {
            allowDefenceSteal: config.attackAllowDefenceSteal,
        },
        defence: {
            checkTicks: config.defenceCheckTicks,
            startingRadius: config.defenceStartingRadius,
            radiusIncreasePerTick: config.defenceRadiusIncreasePerTick,
            defendProduction: config.defenceDefendProduction,
            missionPriority: config.defenceMissionPriority,
            activePriority: config.defenceActivePriority,
        },
        scouting: {
            cooldownTicks: config.scoutCooldownTicks,
            maxConcurrentMissions: config.scoutMaxConcurrentMissions,
            missionPriority: config.scoutMissionPriority,
        },
        engineer: {
            useKnownTechBuildings: config.engineerKnownTechEnabled,
            techMaxTargets: config.engineerTechMaxTargets,
            techMaxDistanceFromStart: config.engineerTechMaxDistanceFromStart,
            techPriority: config.engineerTechPriority,
            techEscortLevel: config.engineerTechEscortLevel,
        },
    },
    macroBoost: {
        enabled: config.macroBoostEnabled,
    },
    strategicPlan: {
        enabled: config.strategicPlan !== "off",
        plan: config.strategicPlan,
        rushSellTick: config.rushSellTick,
        rushSellMinCombatants: config.rushSellMinCombatants,
        dogTargetCount: config.strategicDogTargetCount,
        hfoBottomDogTargetCount: config.hfoBottomDogTargetCount,
        antiInfantryDogTargetCount: config.antiInfantryDogTargetCount,
    },
    staticDefenseBoost: {
        enabled: config.staticDefenseEnabled,
        startTick: config.staticDefenseStartTick,
        targetCount: config.staticDefenseTargetCount,
        priority: config.staticDefensePriority,
    },
    allIn: {
        enabled: config.allInEnabled,
        minTick: config.allInMinTick,
        minCombatants: config.allInMinCombatants,
        combatantAdvantage: config.allInCombatantAdvantage,
        disbandExistingAttacks: config.allInDisbandExistingAttacks,
        directVisibleAttack: config.allInDirectVisibleAttack,
    },
});

const buildStrongBotOptions = (config: PolicyConfig): StrongBotOptions => ({
    harass: {
        enabled: config.harassEnabled,
        minTick: config.harassMinTick,
        minCombatants: config.harassMinCombatants,
        maxUnits: config.harassMaxUnits,
        combatantAdvantage: config.harassCombatantAdvantage,
        maxEnemyCombatants: config.harassMaxEnemyCombatants,
        orderIntervalTicks: config.harassOrderIntervalTicks,
        directAttackKnownTargets: config.harassDirectAttackKnownTargets,
    },
    forceAttack: {
        enabled: config.forceAttackEnabled,
        minTick: config.forceAttackMinTick,
        minCombatants: config.forceAttackMinCombatants,
        combatantAdvantage: config.forceAttackCombatantAdvantage,
        maxEnemyCombatants: config.forceAttackMaxEnemyCombatants,
        orderIntervalTicks: config.forceAttackOrderIntervalTicks,
        directAttackKnownTargets: config.forceAttackDirectAttackKnownTargets,
        maxTargets: config.forceAttackMaxTargets,
        hfoWestVsEastOnly: config.forceAttackHfoWestVsEastOnly,
    },
    routeAttack: {
        enabled: config.routeAttackEnabled,
        minTick: config.routeAttackMinTick,
        minCombatants: config.routeAttackMinCombatants,
        orderIntervalTicks: config.routeAttackOrderIntervalTicks,
        advanceIntervalTicks: config.routeAttackAdvanceIntervalTicks,
        waypoints: parseWaypointString(config.routeAttackWaypoints),
        directAttackKnownTargets: config.routeAttackDirectAttackKnownTargets,
    },
    hfoCloseout: {
        enabled: config.hfoCloseoutEnabled,
        minTick: config.hfoCloseoutMinTick,
        minUnits: config.hfoCloseoutMinUnits,
        maxEnemyBuildings: config.hfoCloseoutMaxEnemyBuildings,
        maxEnemyCombatants: config.hfoCloseoutMaxEnemyCombatants,
        orderIntervalTicks: config.hfoCloseoutOrderIntervalTicks,
        includeHarvesters: config.hfoCloseoutIncludeHarvesters,
    },
    hfoWestSweep: {
        enabled: config.hfoWestSweepEnabled,
        minTick: config.hfoWestSweepMinTick,
        minCombatants: config.hfoWestSweepMinCombatants,
        combatantAdvantage: config.hfoWestSweepCombatantAdvantage,
        maxEnemyCombatants: config.hfoWestSweepMaxEnemyCombatants,
        orderIntervalTicks: config.hfoWestSweepOrderIntervalTicks,
        advanceIntervalTicks: config.hfoWestSweepAdvanceIntervalTicks,
        waypoints: parseWaypointString(config.hfoWestSweepWaypoints),
        directAttackKnownTargets: config.hfoWestSweepDirectAttackKnownTargets,
        maxTargets: config.hfoWestSweepMaxTargets,
    },
    emergencyDefense: {
        enabled: config.emergencyDefenseEnabled,
        radius: config.emergencyDefenseRadius,
        minCombatants: config.emergencyDefenseMinCombatants,
        maxDefenders: config.emergencyDefenseMaxDefenders,
        orderIntervalTicks: config.emergencyDefenseOrderIntervalTicks,
        directAttackKnownTargets: config.emergencyDefenseDirectAttackKnownTargets,
        mapSignatures: config.emergencyDefenseEnabled ? [] : undefined,
        hfoWestVsEastOnly: config.emergencyDefenseHfoWestVsEastOnly,
    },
});

const getWinner = (candidateDefeated: boolean, baselineDefeated: boolean): Winner => {
    if (candidateDefeated && !baselineDefeated) {
        return "baseline";
    }
    if (baselineDefeated && !candidateDefeated) {
        return "candidate";
    }
    return "draw";
};

const buildGameSettings = (
    mapName: string,
    candidate: SupalosaBot,
    baseline: SupalosaBot,
    candidateSlot: number,
): CreateOfflineOpts => {
    const agents = candidateSlot === 0 ? [candidate, baseline] : [baseline, candidate];
    return {
        buildOffAlly: false,
        cratesAppear: false,
        credits: 10000,
        gameMode: cdapi.getAvailableGameModes(mapName)[0],
        gameSpeed: 6,
        mapName,
        mcvRepacks: true,
        shortGame: true,
        superWeapons: false,
        unitCount: 0,
        online: false,
        agents,
    };
};

const getStartKey = (point: { x: number; y: number }): string => `${point.x},${point.y}`;

const isAllowedStart = (allowedStarts: string[] | undefined, point: { x: number; y: number }): boolean =>
    !allowedStarts || allowedStarts.includes(getStartKey(point));

const materialReward = (result: Omit<MatchResult, "reward">): number => {
    const buildingDelta = result.candidateBuildings - result.baselineBuildings;
    const combatantDelta = result.candidateCombatants - result.baselineCombatants;
    const unitDelta = result.candidateUnits - result.baselineUnits;
    const creditDelta = Math.max(-200, Math.min(200, (result.candidateCredits - result.baselineCredits) / 50));
    return buildingDelta * 28 + combatantDelta * 34 + unitDelta * 5 + creditDelta;
};

const scoreMatch = (result: Omit<MatchResult, "reward">, maxTicks: number): number => {
    const material = materialReward(result);
    const speed = Math.max(0, maxTicks - result.ticks) / Math.max(1, maxTicks);
    switch (result.winner) {
        case "candidate":
            return 1000 + speed * 220 + Math.max(-120, Math.min(220, material * 0.15));
        case "baseline":
            return -1100 - speed * 180 + Math.max(-220, Math.min(120, material * 0.15));
        case "draw":
            return Math.max(-320, Math.min(320, material)) - 25;
    }
};

const runEpisode = async (
    episode: number,
    generation: number,
    candidateId: string,
    config: PolicyConfig,
    mapName: string,
    baselineCountry: Countries,
    candidateSlot: number,
    maxTicks: number,
    candidateStarts: string[] | undefined,
    baselineStarts: string[] | undefined,
): Promise<MatchResult | null> => {
    const candidateName = `TrainerStrong_${generation}_${candidateId}_${episode}`;
    const baselineName = `TrainerSupalosa_${generation}_${candidateId}_${episode}`;
    const candidate = new StrongBot(
        candidateName,
        config.candidateCountry,
        [],
        false,
        new StrongStrategy(buildStrongStrategyOptions(config)),
        buildStrongBotOptions(config),
    );
    const baseline = new InspectableSupalosaBot(baselineName, baselineCountry, [], false, new DefaultStrategy());
    const game = await cdapi.createGame(buildGameSettings(mapName, candidate, baseline, candidateSlot));

    let ticks = 0;
    await game.update();
    ticks++;
    const candidateStart = candidate.lastGameApi?.getPlayerData(candidateName).startLocation;
    const baselineStart = baseline.lastGameApi?.getPlayerData(baselineName).startLocation;
    if (!candidateStart || !baselineStart) {
        game.dispose();
        throw new Error(`Missing start locations for episode ${episode}`);
    }
    if (!isAllowedStart(candidateStarts, candidateStart) || !isAllowedStart(baselineStarts, baselineStart)) {
        game.dispose();
        return null;
    }

    while (!game.isFinished() && ticks < maxTicks) {
        await game.update();
        ticks++;
    }

    const stats = game.getPlayerStats();
    const candidateStats = stats.find((stat) => stat.name === candidateName);
    const baselineStats = stats.find((stat) => stat.name === baselineName);
    if (!candidateStats || !baselineStats) {
        game.dispose();
        throw new Error(`Missing player stats for episode ${episode}`);
    }

    const withoutReward: Omit<MatchResult, "reward"> = {
        episode,
        generation,
        candidateId,
        mapName,
        candidateCountry: config.candidateCountry,
        baselineCountry,
        candidateSlot,
        candidateStart: { x: candidateStart.x, y: candidateStart.y },
        baselineStart: { x: baselineStart.x, y: baselineStart.y },
        ticks,
        finished: game.isFinished(),
        winner: getWinner(candidateStats.defeated, baselineStats.defeated),
        candidateCredits: candidateStats.credits,
        baselineCredits: baselineStats.credits,
        candidateUnits: countVisible(candidate.lastGameApi, candidateName, "units"),
        baselineUnits: countVisible(baseline.lastGameApi, baselineName, "units"),
        candidateBuildings: countVisible(candidate.lastGameApi, candidateName, "buildings"),
        baselineBuildings: countVisible(baseline.lastGameApi, baselineName, "buildings"),
        candidateCombatants: countVisible(candidate.lastGameApi, candidateName, "combatants"),
        baselineCombatants: countVisible(baseline.lastGameApi, baselineName, "combatants"),
    };
    const reward = scoreMatch(withoutReward, maxTicks);
    game.dispose();
    return { ...withoutReward, reward };
};

const summarize = (results: MatchResult[]): EvaluationSummary => {
    const wins = results.filter((result) => result.winner === "candidate").length;
    const losses = results.filter((result) => result.winner === "baseline").length;
    const draws = results.filter((result) => result.winner === "draw").length;
    const score = results.reduce((total, result) => total + result.reward, 0);
    const ticks = results.reduce((total, result) => total + result.ticks, 0);
    return {
        matches: results.length,
        wins,
        losses,
        draws,
        winRate: results.length > 0 ? wins / results.length : 0,
        lossRate: results.length > 0 ? losses / results.length : 0,
        score,
        meanReward: results.length > 0 ? score / results.length : 0,
        minReward: results.reduce((min, result) => Math.min(min, result.reward), Number.POSITIVE_INFINITY),
        avgTicks: results.length > 0 ? ticks / results.length : 0,
    };
};

const evaluatePolicy = async (
    generation: number,
    candidateId: string,
    config: PolicyConfig,
    settings: TrainerSettings,
    nextEpisode: () => number,
): Promise<Evaluation> => {
    const results: MatchResult[] = [];
    for (const mapName of settings.maps) {
        for (const baselineCountry of settings.baselineCountries) {
            for (let repeat = 0; repeat < settings.repeats; repeat++) {
                for (const candidateSlot of [0, 1]) {
                    let accepted: MatchResult | null = null;
                    for (let attempt = 0; attempt < settings.startFilterMaxAttempts && !accepted; attempt++) {
                        accepted = await runEpisode(
                            nextEpisode(),
                            generation,
                            candidateId,
                            config,
                            mapName,
                            baselineCountry,
                            candidateSlot,
                            settings.maxTicks,
                            settings.candidateStarts,
                            settings.baselineStarts,
                        );
                    }
                    if (!accepted) {
                        throw new Error(
                            `Unable to satisfy start filters candidate=${settings.candidateStarts?.join(";") ?? "any"} ` +
                                `baseline=${settings.baselineStarts?.join(";") ?? "any"} after ` +
                                `${settings.startFilterMaxAttempts} attempts`,
                        );
                    }
                    results.push(accepted);
                }
            }
        }
    }
    return {
        generation,
        candidateId,
        config,
        summary: summarize(results),
        results,
    };
};

const compareEvaluations = (left: Evaluation, right: Evaluation): number => {
    if (left.summary.losses !== right.summary.losses) {
        return left.summary.losses - right.summary.losses;
    }
    if (left.summary.wins !== right.summary.wins) {
        return right.summary.wins - left.summary.wins;
    }
    return right.summary.score - left.summary.score;
};

const applySearchMode = (config: PolicyConfig, settings: TrainerSettings): PolicyConfig => {
    if (settings.searchMode === "full") {
        return config;
    }

    if (settings.searchMode === "broad") {
        return {
            ...config,
            routeAttackEnabled: false,
            routeAttackDirectAttackKnownTargets: false,
            hfoCloseoutEnabled: false,
            hfoCloseoutIncludeHarvesters: false,
            hfoWestSweepEnabled: false,
            hfoWestSweepDirectAttackKnownTargets: false,
            forceAttackHfoWestVsEastOnly: false,
            emergencyDefenseHfoWestVsEastOnly: false,
        };
    }

    if (settings.searchMode === "safe_gate") {
        return {
            ...config,
            macroBoostEnabled: false,
            staticDefenseEnabled: false,
            harassEnabled: false,
            allInEnabled: false,
            allInDisbandExistingAttacks: false,
            allInDirectVisibleAttack: false,
            forceAttackEnabled: false,
            forceAttackDirectAttackKnownTargets: false,
            forceAttackMaxTargets: 1,
            forceAttackHfoWestVsEastOnly: false,
            routeAttackEnabled: false,
            routeAttackDirectAttackKnownTargets: false,
            hfoCloseoutEnabled: false,
            hfoCloseoutIncludeHarvesters: false,
            hfoWestSweepEnabled: false,
            hfoWestSweepDirectAttackKnownTargets: false,
            emergencyDefenseEnabled: false,
            emergencyDefenseDirectAttackKnownTargets: false,
            emergencyDefenseHfoWestVsEastOnly: false,
        };
    }

    return {
        ...config,
        attackGateEnabled: false,
        attackGateMinTick: 0,
        attackGateMinCombatants: 0,
        attackGateHfoBottomMinCombatants: 45,
        attackGateCombatantAdvantage: 0,
        attackGateMaxEnemyCombatants: 999,
        macroBoostEnabled: false,
        staticDefenseEnabled: false,
        harassEnabled: false,
        allInEnabled: false,
        allInDisbandExistingAttacks: false,
        allInDirectVisibleAttack: false,
    };
};

const withDefaultBaseTuning = (policy: SeedPolicyConfig): PolicyConfig => ({
    strategicPlan: "off",
    rushSellTick: 7200,
    rushSellMinCombatants: 12,
    strategicDogTargetCount: 2,
    hfoBottomDogTargetCount: 3,
    antiInfantryDogTargetCount: 5,
    attackGateHfoBottomMinCombatants: 45,
    attackAllowDefenceSteal: false,
    defenceCheckTicks: 30,
    defenceStartingRadius: 24,
    defenceRadiusIncreasePerTick: 0.0003,
    defenceDefendProduction: true,
    defenceMissionPriority: 60,
    defenceActivePriority: 120,
    scoutCooldownTicks: 180,
    scoutMaxConcurrentMissions: 3,
    scoutMissionPriority: 10,
    engineerKnownTechEnabled: true,
    engineerTechMaxTargets: 1,
    engineerTechMaxDistanceFromStart: 38,
    engineerTechPriority: 96,
    engineerTechEscortLevel: 2,
    routeAttackEnabled: false,
    routeAttackMinTick: 9000,
    routeAttackMinCombatants: 10,
    routeAttackOrderIntervalTicks: 60,
    routeAttackAdvanceIntervalTicks: 1200,
    routeAttackWaypoints: ROUTE_ATTACK_WAYPOINT_VALUES[0],
    routeAttackDirectAttackKnownTargets: true,
    hfoCloseoutEnabled: false,
    hfoCloseoutMinTick: 9000,
    hfoCloseoutMinUnits: 6,
    hfoCloseoutMaxEnemyBuildings: 3,
    hfoCloseoutMaxEnemyCombatants: 2,
    hfoCloseoutOrderIntervalTicks: 15,
    hfoCloseoutIncludeHarvesters: false,
    hfoWestSweepEnabled: false,
    hfoWestSweepMinTick: 16200,
    hfoWestSweepMinCombatants: 12,
    hfoWestSweepCombatantAdvantage: 6,
    hfoWestSweepMaxEnemyCombatants: 4,
    hfoWestSweepOrderIntervalTicks: 45,
    hfoWestSweepAdvanceIntervalTicks: 900,
    hfoWestSweepWaypoints: HFO_WEST_SWEEP_WAYPOINT_VALUES[0],
    hfoWestSweepDirectAttackKnownTargets: false,
    hfoWestSweepMaxTargets: 1,
    forceAttackHfoWestVsEastOnly: false,
    emergencyDefenseHfoWestVsEastOnly: false,
    ...policy,
});

const randomPolicy = (rng: Random, candidateCountries: Countries[]): PolicyConfig => ({
    candidateCountry: rng.choice(candidateCountries),
    attackCompositionPolicy: rng.choice(ATTACK_COMPOSITION_POLICIES),
    attackGateEnabled: rng.bool(0.55),
    attackGateMinTick: rng.choice([0, 1800, 3600, 5400, 7200, 9000]),
    attackGateMinCombatants: rng.choice([0, 4, 6, 8, 10, 12, 16]),
    attackGateHfoBottomMinCombatants: rng.choice([24, 28, 32, 36, 40, 45, 50]),
    attackGateCombatantAdvantage: rng.choice([-6, -3, 0, 3, 6, 10, 14]),
    attackGateMaxEnemyCombatants: rng.choice([0, 2, 4, 6, 8, 10, 14, 999]),
    attackSuppressionEnabled: rng.bool(0.45),
    attackSuppressionRadius: rng.choice(ATTACK_SUPPRESSION_RADIUS_VALUES),
    strategicPlan: rng.choice(STRATEGIC_PLAN_POLICIES),
    rushSellTick: rng.choice(RUSH_SELL_TICK_VALUES),
    rushSellMinCombatants: rng.choice(RUSH_SELL_MIN_COMBATANT_VALUES),
    strategicDogTargetCount: rng.choice(DOG_TARGET_COUNT_VALUES),
    hfoBottomDogTargetCount: rng.choice(DOG_TARGET_COUNT_VALUES),
    antiInfantryDogTargetCount: rng.choice(DOG_TARGET_COUNT_VALUES),
    attackAllowDefenceSteal: rng.bool(0.12),
    defenceCheckTicks: rng.choice(DEFENCE_CHECK_TICK_VALUES),
    defenceStartingRadius: rng.choice(DEFENCE_STARTING_RADIUS_VALUES),
    defenceRadiusIncreasePerTick: rng.choice(DEFENCE_RADIUS_INCREASE_VALUES),
    defenceDefendProduction: rng.bool(0.85),
    defenceMissionPriority: rng.choice(DEFENCE_MISSION_PRIORITY_VALUES),
    defenceActivePriority: rng.choice(DEFENCE_ACTIVE_PRIORITY_VALUES),
    scoutCooldownTicks: rng.choice(SCOUT_COOLDOWN_TICK_VALUES),
    scoutMaxConcurrentMissions: rng.choice(SCOUT_MAX_CONCURRENT_VALUES),
    scoutMissionPriority: rng.choice(SCOUT_MISSION_PRIORITY_VALUES),
    engineerKnownTechEnabled: rng.bool(0.7),
    engineerTechMaxTargets: rng.choice([0, 1, 2]),
    engineerTechMaxDistanceFromStart: rng.choice([30, 38, 48, 60, 999]),
    engineerTechPriority: rng.choice([72, 84, 96, 108]),
    engineerTechEscortLevel: rng.choice([1, 2, 3]),
    macroBoostEnabled: rng.bool(0.2),
    staticDefenseEnabled: rng.bool(0.45),
    staticDefenseStartTick: rng.choice(STATIC_DEFENSE_START_TICK_VALUES),
    staticDefenseTargetCount: rng.choice(STATIC_DEFENSE_TARGET_COUNT_VALUES),
    staticDefensePriority: rng.choice(STATIC_DEFENSE_PRIORITY_VALUES),
    harassEnabled: rng.bool(0.65),
    harassMinTick: rng.choice(MIN_TICK_VALUES),
    harassMinCombatants: rng.choice([2, 3, 4, 5, 6, 8]),
    harassMaxUnits: rng.choice([2, 3, 4, 5, 6, 8]),
    harassCombatantAdvantage: rng.choice(ADVANTAGE_VALUES),
    harassMaxEnemyCombatants: rng.choice(MAX_ENEMY_COMBATANT_VALUES),
    harassOrderIntervalTicks: rng.choice([60, 90, 120, 180, 240]),
    harassDirectAttackKnownTargets: rng.bool(0.8),
    allInEnabled: rng.bool(0.35),
    allInMinTick: rng.choice(MIN_TICK_VALUES),
    allInMinCombatants: rng.choice(MIN_COMBATANT_VALUES),
    allInCombatantAdvantage: rng.choice(ADVANTAGE_VALUES),
    allInDisbandExistingAttacks: rng.bool(0.25),
    allInDirectVisibleAttack: rng.bool(0.5),
    forceAttackEnabled: rng.bool(0.75),
    forceAttackMinTick: rng.choice(MIN_TICK_VALUES),
    forceAttackMinCombatants: rng.choice(MIN_COMBATANT_VALUES),
    forceAttackCombatantAdvantage: rng.choice(ADVANTAGE_VALUES),
    forceAttackMaxEnemyCombatants: rng.choice(MAX_ENEMY_COMBATANT_VALUES),
    forceAttackOrderIntervalTicks: rng.choice(ORDER_INTERVAL_VALUES),
    forceAttackDirectAttackKnownTargets: rng.bool(0.5),
    forceAttackMaxTargets: rng.choice([1, 2, 3, 4]),
    forceAttackHfoWestVsEastOnly: rng.bool(0.35),
    routeAttackEnabled: rng.bool(0.65),
    routeAttackMinTick: rng.choice([5400, 7200, 9000, 10800, 12600, 14400]),
    routeAttackMinCombatants: rng.choice([4, 6, 8, 10, 12, 16, 20]),
    routeAttackOrderIntervalTicks: rng.choice(ORDER_INTERVAL_VALUES),
    routeAttackAdvanceIntervalTicks: rng.choice(ROUTE_ATTACK_ADVANCE_INTERVAL_VALUES),
    routeAttackWaypoints: rng.choice(ROUTE_ATTACK_WAYPOINT_VALUES),
    routeAttackDirectAttackKnownTargets: rng.bool(0.8),
    hfoCloseoutEnabled: rng.bool(0.6),
    hfoCloseoutMinTick: rng.choice([5400, 7200, 9000, 10800, 12600, 14400]),
    hfoCloseoutMinUnits: rng.choice([4, 6, 8, 10, 12, 16, 20]),
    hfoCloseoutMaxEnemyBuildings: rng.choice(HFO_CLOSEOUT_MAX_BUILDING_VALUES),
    hfoCloseoutMaxEnemyCombatants: rng.choice(MAX_ENEMY_COMBATANT_VALUES),
    hfoCloseoutOrderIntervalTicks: rng.choice([15, 24, 30, 45, 60]),
    hfoCloseoutIncludeHarvesters: rng.bool(0.12),
    hfoWestSweepEnabled: rng.bool(0.75),
    hfoWestSweepMinTick: rng.choice([7200, 9000, 10800, 12600, 14400, 16200]),
    hfoWestSweepMinCombatants: rng.choice([4, 6, 8, 10, 12, 16, 20]),
    hfoWestSweepCombatantAdvantage: rng.choice(ADVANTAGE_VALUES),
    hfoWestSweepMaxEnemyCombatants: rng.choice(MAX_ENEMY_COMBATANT_VALUES),
    hfoWestSweepOrderIntervalTicks: rng.choice([24, 30, 45, 60, 90]),
    hfoWestSweepAdvanceIntervalTicks: rng.choice([600, 900, 1200, 1500]),
    hfoWestSweepWaypoints: rng.choice(HFO_WEST_SWEEP_WAYPOINT_VALUES),
    hfoWestSweepDirectAttackKnownTargets: rng.bool(0.3),
    hfoWestSweepMaxTargets: rng.choice([1, 2, 3]),
    emergencyDefenseEnabled: rng.bool(0.8),
    emergencyDefenseRadius: rng.choice(EMERGENCY_RADIUS_VALUES),
    emergencyDefenseMinCombatants: rng.choice([1, 2, 3, 4, 6]),
    emergencyDefenseMaxDefenders: rng.choice(EMERGENCY_MAX_DEFENDER_VALUES),
    emergencyDefenseOrderIntervalTicks: rng.choice(EMERGENCY_ORDER_INTERVAL_VALUES),
    emergencyDefenseDirectAttackKnownTargets: rng.bool(0.85),
    emergencyDefenseHfoWestVsEastOnly: rng.bool(0.35),
});

const seedPolicies = (rng: Random, settings: TrainerSettings): PolicyConfig[] => {
    const primaryCountry = settings.candidateCountries[0] ?? Countries.IRAQ;
    const seeds: SeedPolicyConfig[] = [
        {
            candidateCountry: primaryCountry,
            attackGateEnabled: false,
            attackGateMinTick: 0,
            attackGateMinCombatants: 0,
            attackGateCombatantAdvantage: 0,
            attackGateMaxEnemyCombatants: 999,
            attackSuppressionEnabled: false,
            attackSuppressionRadius: 24,
            attackCompositionPolicy: "infantry",
            macroBoostEnabled: false,
            staticDefenseEnabled: false,
            staticDefenseStartTick: 3600,
            staticDefenseTargetCount: 4,
            staticDefensePriority: 28,
            harassEnabled: false,
            harassMinTick: 5400,
            harassMinCombatants: 4,
            harassMaxUnits: 4,
            harassCombatantAdvantage: -4,
            harassMaxEnemyCombatants: 8,
            harassOrderIntervalTicks: 120,
            harassDirectAttackKnownTargets: true,
            allInEnabled: false,
            allInMinTick: 10800,
            allInMinCombatants: 4,
            allInCombatantAdvantage: -3,
            allInDisbandExistingAttacks: false,
            allInDirectVisibleAttack: false,
            forceAttackEnabled: false,
            forceAttackMinTick: 16200,
            forceAttackMinCombatants: 12,
            forceAttackCombatantAdvantage: 6,
            forceAttackMaxEnemyCombatants: 4,
            forceAttackOrderIntervalTicks: 60,
            forceAttackDirectAttackKnownTargets: true,
            forceAttackMaxTargets: 1,
            emergencyDefenseEnabled: false,
            emergencyDefenseRadius: 24,
            emergencyDefenseMinCombatants: 1,
            emergencyDefenseMaxDefenders: 999,
            emergencyDefenseOrderIntervalTicks: 30,
            emergencyDefenseDirectAttackKnownTargets: true,
        },
        {
            candidateCountry: primaryCountry,
            attackGateEnabled: false,
            attackGateMinTick: 0,
            attackGateMinCombatants: 0,
            attackGateCombatantAdvantage: 0,
            attackGateMaxEnemyCombatants: 999,
            attackCompositionPolicy: "random",
            macroBoostEnabled: false,
            staticDefenseEnabled: false,
            staticDefenseStartTick: 3600,
            staticDefenseTargetCount: 4,
            staticDefensePriority: 28,
            harassEnabled: false,
            harassMinTick: 5400,
            harassMinCombatants: 4,
            harassMaxUnits: 4,
            harassCombatantAdvantage: -4,
            harassMaxEnemyCombatants: 8,
            harassOrderIntervalTicks: 120,
            harassDirectAttackKnownTargets: true,
            allInEnabled: false,
            allInMinTick: 10000,
            allInMinCombatants: 6,
            allInCombatantAdvantage: 0,
            allInDisbandExistingAttacks: false,
            allInDirectVisibleAttack: false,
            forceAttackEnabled: false,
            forceAttackMinTick: 10000,
            forceAttackMinCombatants: 6,
            forceAttackCombatantAdvantage: 0,
            forceAttackMaxEnemyCombatants: 999,
            forceAttackOrderIntervalTicks: 30,
            forceAttackDirectAttackKnownTargets: false,
            forceAttackMaxTargets: 1,
            emergencyDefenseEnabled: false,
            emergencyDefenseRadius: 24,
            emergencyDefenseMinCombatants: 1,
            emergencyDefenseMaxDefenders: 999,
            emergencyDefenseOrderIntervalTicks: 30,
            emergencyDefenseDirectAttackKnownTargets: true,
        },
        {
            candidateCountry: primaryCountry,
            attackGateEnabled: false,
            attackGateMinTick: 0,
            attackGateMinCombatants: 0,
            attackGateCombatantAdvantage: 0,
            attackGateMaxEnemyCombatants: 999,
            attackCompositionPolicy: "tanks",
            macroBoostEnabled: false,
            staticDefenseEnabled: false,
            staticDefenseStartTick: 3600,
            staticDefenseTargetCount: 4,
            staticDefensePriority: 28,
            harassEnabled: true,
            harassMinTick: 5400,
            harassMinCombatants: 4,
            harassMaxUnits: 4,
            harassCombatantAdvantage: -4,
            harassMaxEnemyCombatants: 8,
            harassOrderIntervalTicks: 120,
            harassDirectAttackKnownTargets: true,
            allInEnabled: false,
            allInMinTick: 10000,
            allInMinCombatants: 6,
            allInCombatantAdvantage: 0,
            allInDisbandExistingAttacks: false,
            allInDirectVisibleAttack: false,
            forceAttackEnabled: true,
            forceAttackMinTick: 7200,
            forceAttackMinCombatants: 4,
            forceAttackCombatantAdvantage: -3,
            forceAttackMaxEnemyCombatants: 4,
            forceAttackOrderIntervalTicks: 30,
            forceAttackDirectAttackKnownTargets: false,
            forceAttackMaxTargets: 1,
            emergencyDefenseEnabled: false,
            emergencyDefenseRadius: 24,
            emergencyDefenseMinCombatants: 1,
            emergencyDefenseMaxDefenders: 999,
            emergencyDefenseOrderIntervalTicks: 30,
            emergencyDefenseDirectAttackKnownTargets: true,
        },
        {
            candidateCountry: primaryCountry,
            attackGateEnabled: false,
            attackGateMinTick: 0,
            attackGateMinCombatants: 0,
            attackGateCombatantAdvantage: 0,
            attackGateMaxEnemyCombatants: 999,
            attackCompositionPolicy: "heavy",
            macroBoostEnabled: false,
            staticDefenseEnabled: false,
            staticDefenseStartTick: 3600,
            staticDefenseTargetCount: 4,
            staticDefensePriority: 28,
            harassEnabled: true,
            harassMinTick: 7200,
            harassMinCombatants: 4,
            harassMaxUnits: 3,
            harassCombatantAdvantage: -6,
            harassMaxEnemyCombatants: 6,
            harassOrderIntervalTicks: 180,
            harassDirectAttackKnownTargets: true,
            allInEnabled: true,
            allInMinTick: 9000,
            allInMinCombatants: 6,
            allInCombatantAdvantage: 0,
            allInDisbandExistingAttacks: true,
            allInDirectVisibleAttack: false,
            forceAttackEnabled: true,
            forceAttackMinTick: 9000,
            forceAttackMinCombatants: 6,
            forceAttackCombatantAdvantage: 0,
            forceAttackMaxEnemyCombatants: 999,
            forceAttackOrderIntervalTicks: 45,
            forceAttackDirectAttackKnownTargets: true,
            forceAttackMaxTargets: 1,
            emergencyDefenseEnabled: false,
            emergencyDefenseRadius: 24,
            emergencyDefenseMinCombatants: 1,
            emergencyDefenseMaxDefenders: 999,
            emergencyDefenseOrderIntervalTicks: 30,
            emergencyDefenseDirectAttackKnownTargets: true,
        },
        {
            candidateCountry: primaryCountry,
            attackGateEnabled: false,
            attackGateMinTick: 0,
            attackGateMinCombatants: 0,
            attackGateCombatantAdvantage: 0,
            attackGateMaxEnemyCombatants: 999,
            attackCompositionPolicy: "infantry",
            macroBoostEnabled: false,
            staticDefenseEnabled: false,
            staticDefenseStartTick: 3600,
            staticDefenseTargetCount: 4,
            staticDefensePriority: 28,
            harassEnabled: false,
            harassMinTick: 5400,
            harassMinCombatants: 4,
            harassMaxUnits: 4,
            harassCombatantAdvantage: -4,
            harassMaxEnemyCombatants: 8,
            harassOrderIntervalTicks: 120,
            harassDirectAttackKnownTargets: true,
            allInEnabled: true,
            allInMinTick: 10800,
            allInMinCombatants: 4,
            allInCombatantAdvantage: -3,
            allInDisbandExistingAttacks: false,
            allInDirectVisibleAttack: false,
            forceAttackEnabled: true,
            forceAttackMinTick: 12600,
            forceAttackMinCombatants: 10,
            forceAttackCombatantAdvantage: -6,
            forceAttackMaxEnemyCombatants: 10,
            forceAttackOrderIntervalTicks: 45,
            forceAttackDirectAttackKnownTargets: true,
            forceAttackMaxTargets: 1,
            emergencyDefenseEnabled: false,
            emergencyDefenseRadius: 24,
            emergencyDefenseMinCombatants: 1,
            emergencyDefenseMaxDefenders: 999,
            emergencyDefenseOrderIntervalTicks: 30,
            emergencyDefenseDirectAttackKnownTargets: true,
        },
        {
            candidateCountry: primaryCountry,
            attackGateEnabled: false,
            attackGateMinTick: 0,
            attackGateMinCombatants: 0,
            attackGateCombatantAdvantage: 0,
            attackGateMaxEnemyCombatants: 999,
            attackCompositionPolicy: "infantry",
            macroBoostEnabled: false,
            staticDefenseEnabled: false,
            staticDefenseStartTick: 3600,
            staticDefenseTargetCount: 4,
            staticDefensePriority: 28,
            harassEnabled: false,
            harassMinTick: 5400,
            harassMinCombatants: 4,
            harassMaxUnits: 4,
            harassCombatantAdvantage: -4,
            harassMaxEnemyCombatants: 8,
            harassOrderIntervalTicks: 120,
            harassDirectAttackKnownTargets: true,
            allInEnabled: true,
            allInMinTick: 12600,
            allInMinCombatants: 8,
            allInCombatantAdvantage: 4,
            allInDisbandExistingAttacks: false,
            allInDirectVisibleAttack: false,
            forceAttackEnabled: true,
            forceAttackMinTick: 16200,
            forceAttackMinCombatants: 12,
            forceAttackCombatantAdvantage: 6,
            forceAttackMaxEnemyCombatants: 4,
            forceAttackOrderIntervalTicks: 60,
            forceAttackDirectAttackKnownTargets: true,
            forceAttackMaxTargets: 1,
            emergencyDefenseEnabled: false,
            emergencyDefenseRadius: 24,
            emergencyDefenseMinCombatants: 1,
            emergencyDefenseMaxDefenders: 999,
            emergencyDefenseOrderIntervalTicks: 30,
            emergencyDefenseDirectAttackKnownTargets: true,
        },
        {
            candidateCountry: primaryCountry,
            attackGateEnabled: false,
            attackGateMinTick: 0,
            attackGateMinCombatants: 0,
            attackGateCombatantAdvantage: 0,
            attackGateMaxEnemyCombatants: 999,
            attackCompositionPolicy: "infantry",
            macroBoostEnabled: false,
            staticDefenseEnabled: true,
            staticDefenseStartTick: 2400,
            staticDefenseTargetCount: 4,
            staticDefensePriority: 36,
            harassEnabled: false,
            harassMinTick: 5400,
            harassMinCombatants: 4,
            harassMaxUnits: 4,
            harassCombatantAdvantage: -4,
            harassMaxEnemyCombatants: 8,
            harassOrderIntervalTicks: 120,
            harassDirectAttackKnownTargets: true,
            allInEnabled: false,
            allInMinTick: 10800,
            allInMinCombatants: 4,
            allInCombatantAdvantage: -3,
            allInDisbandExistingAttacks: false,
            allInDirectVisibleAttack: false,
            forceAttackEnabled: false,
            forceAttackMinTick: 12600,
            forceAttackMinCombatants: 10,
            forceAttackCombatantAdvantage: -6,
            forceAttackMaxEnemyCombatants: 10,
            forceAttackOrderIntervalTicks: 45,
            forceAttackDirectAttackKnownTargets: true,
            forceAttackMaxTargets: 1,
            emergencyDefenseEnabled: false,
            emergencyDefenseRadius: 24,
            emergencyDefenseMinCombatants: 1,
            emergencyDefenseMaxDefenders: 999,
            emergencyDefenseOrderIntervalTicks: 30,
            emergencyDefenseDirectAttackKnownTargets: true,
        },
        {
            candidateCountry: primaryCountry,
            attackGateEnabled: false,
            attackGateMinTick: 0,
            attackGateMinCombatants: 0,
            attackGateCombatantAdvantage: 0,
            attackGateMaxEnemyCombatants: 999,
            attackCompositionPolicy: "infantry",
            macroBoostEnabled: false,
            staticDefenseEnabled: false,
            staticDefenseStartTick: 3600,
            staticDefenseTargetCount: 4,
            staticDefensePriority: 28,
            harassEnabled: false,
            harassMinTick: 5400,
            harassMinCombatants: 4,
            harassMaxUnits: 4,
            harassCombatantAdvantage: -4,
            harassMaxEnemyCombatants: 8,
            harassOrderIntervalTicks: 120,
            harassDirectAttackKnownTargets: true,
            allInEnabled: false,
            allInMinTick: 10800,
            allInMinCombatants: 4,
            allInCombatantAdvantage: -3,
            allInDisbandExistingAttacks: false,
            allInDirectVisibleAttack: false,
            forceAttackEnabled: true,
            forceAttackMinTick: 12600,
            forceAttackMinCombatants: 16,
            forceAttackCombatantAdvantage: 8,
            forceAttackMaxEnemyCombatants: 999,
            forceAttackOrderIntervalTicks: 90,
            forceAttackDirectAttackKnownTargets: true,
            forceAttackMaxTargets: 1,
            emergencyDefenseEnabled: true,
            emergencyDefenseRadius: 24,
            emergencyDefenseMinCombatants: 1,
            emergencyDefenseMaxDefenders: 999,
            emergencyDefenseOrderIntervalTicks: 30,
            emergencyDefenseDirectAttackKnownTargets: true,
        },
        {
            candidateCountry: primaryCountry,
            attackGateEnabled: false,
            attackGateMinTick: 0,
            attackGateMinCombatants: 0,
            attackGateCombatantAdvantage: 0,
            attackGateMaxEnemyCombatants: 999,
            attackCompositionPolicy: "infantry",
            macroBoostEnabled: false,
            staticDefenseEnabled: false,
            staticDefenseStartTick: 3600,
            staticDefenseTargetCount: 4,
            staticDefensePriority: 28,
            harassEnabled: false,
            harassMinTick: 5400,
            harassMinCombatants: 4,
            harassMaxUnits: 4,
            harassCombatantAdvantage: -4,
            harassMaxEnemyCombatants: 8,
            harassOrderIntervalTicks: 120,
            harassDirectAttackKnownTargets: true,
            allInEnabled: false,
            allInMinTick: 10800,
            allInMinCombatants: 4,
            allInCombatantAdvantage: -3,
            allInDisbandExistingAttacks: false,
            allInDirectVisibleAttack: false,
            forceAttackEnabled: true,
            forceAttackMinTick: 14400,
            forceAttackMinCombatants: 18,
            forceAttackCombatantAdvantage: 10,
            forceAttackMaxEnemyCombatants: 999,
            forceAttackOrderIntervalTicks: 90,
            forceAttackDirectAttackKnownTargets: true,
            forceAttackMaxTargets: 1,
            emergencyDefenseEnabled: true,
            emergencyDefenseRadius: 30,
            emergencyDefenseMinCombatants: 1,
            emergencyDefenseMaxDefenders: 999,
            emergencyDefenseOrderIntervalTicks: 30,
            emergencyDefenseDirectAttackKnownTargets: true,
        },
        {
            candidateCountry: primaryCountry,
            attackGateEnabled: true,
            attackGateMinTick: 3600,
            attackGateMinCombatants: 12,
            attackGateCombatantAdvantage: 6,
            attackGateMaxEnemyCombatants: 10,
            attackCompositionPolicy: "infantry",
            macroBoostEnabled: false,
            staticDefenseEnabled: false,
            staticDefenseStartTick: 3600,
            staticDefenseTargetCount: 4,
            staticDefensePriority: 28,
            harassEnabled: false,
            harassMinTick: 5400,
            harassMinCombatants: 4,
            harassMaxUnits: 4,
            harassCombatantAdvantage: -4,
            harassMaxEnemyCombatants: 8,
            harassOrderIntervalTicks: 120,
            harassDirectAttackKnownTargets: true,
            allInEnabled: false,
            allInMinTick: 10800,
            allInMinCombatants: 4,
            allInCombatantAdvantage: -3,
            allInDisbandExistingAttacks: false,
            allInDirectVisibleAttack: false,
            forceAttackEnabled: false,
            forceAttackMinTick: 12600,
            forceAttackMinCombatants: 10,
            forceAttackCombatantAdvantage: -6,
            forceAttackMaxEnemyCombatants: 10,
            forceAttackOrderIntervalTicks: 45,
            forceAttackDirectAttackKnownTargets: true,
            forceAttackMaxTargets: 1,
            emergencyDefenseEnabled: false,
            emergencyDefenseRadius: 24,
            emergencyDefenseMinCombatants: 1,
            emergencyDefenseMaxDefenders: 999,
            emergencyDefenseOrderIntervalTicks: 30,
            emergencyDefenseDirectAttackKnownTargets: true,
        },
    ];
    seeds.push(
        { ...seeds[0], strategicPlan: "hfo", attackCompositionPolicy: "hfo" },
        { ...seeds[0], strategicPlan: "hfoBottom", attackCompositionPolicy: "hfo" },
        { ...seeds[0], strategicPlan: "otmqAntiInfantry", attackCompositionPolicy: "assault" },
        { ...seeds[0], strategicPlan: "macroSiege", attackCompositionPolicy: "artillery" },
        { ...seeds[0], strategicPlan: "macroLateSiege", attackCompositionPolicy: "artillery" },
        { ...seeds[0], strategicPlan: "macro" },
        { ...seeds[0], strategicPlan: "rush", rushSellTick: 7200, rushSellMinCombatants: 12 },
        { ...seeds[0], strategicPlan: "rush", rushSellTick: 5400, rushSellMinCombatants: 8 },
        { ...seeds[0], strategicPlan: "tankBoom" },
        { ...seeds[0], strategicPlan: "tech" },
        { ...seeds[0], strategicPlan: "islandTech", attackCompositionPolicy: "artillery" },
        { ...seeds[0], strategicPlan: "adaptive" },
        {
            ...seeds[0],
            forceAttackEnabled: true,
            forceAttackMinTick: 12600,
            forceAttackMinCombatants: 10,
            forceAttackCombatantAdvantage: -6,
            forceAttackMaxEnemyCombatants: 10,
            forceAttackOrderIntervalTicks: 45,
            routeAttackEnabled: true,
            routeAttackMinTick: 7200,
            routeAttackMinCombatants: 6,
            routeAttackOrderIntervalTicks: 30,
            routeAttackAdvanceIntervalTicks: 900,
            routeAttackWaypoints: ROUTE_ATTACK_WAYPOINT_VALUES[0],
            routeAttackDirectAttackKnownTargets: true,
        },
        {
            ...seeds[0],
            attackCompositionPolicy: "desolator",
            strategicPlan: "tech",
            forceAttackEnabled: true,
            forceAttackMinTick: 12600,
            forceAttackMinCombatants: 8,
            forceAttackCombatantAdvantage: -6,
            forceAttackMaxEnemyCombatants: 10,
            forceAttackOrderIntervalTicks: 45,
            routeAttackEnabled: true,
            routeAttackMinTick: 9000,
            routeAttackMinCombatants: 6,
            routeAttackOrderIntervalTicks: 30,
            routeAttackAdvanceIntervalTicks: 900,
            routeAttackWaypoints: ROUTE_ATTACK_WAYPOINT_VALUES[3],
            routeAttackDirectAttackKnownTargets: true,
        },
        {
            ...seeds[0],
            forceAttackEnabled: true,
            forceAttackMinTick: 10800,
            forceAttackMinCombatants: 8,
            forceAttackCombatantAdvantage: -10,
            forceAttackMaxEnemyCombatants: 999,
            routeAttackEnabled: true,
            routeAttackMinTick: 5400,
            routeAttackMinCombatants: 4,
            routeAttackOrderIntervalTicks: 24,
            routeAttackAdvanceIntervalTicks: 600,
            routeAttackWaypoints: ROUTE_ATTACK_WAYPOINT_VALUES[1],
            hfoCloseoutEnabled: true,
            hfoCloseoutMinTick: 9000,
            hfoCloseoutMinUnits: 6,
            hfoCloseoutMaxEnemyBuildings: 999,
            hfoCloseoutMaxEnemyCombatants: 999,
            hfoCloseoutOrderIntervalTicks: 15,
        },
        {
            ...seeds[0],
            strategicPlan: "rush",
            rushSellTick: 5400,
            rushSellMinCombatants: 8,
            routeAttackEnabled: true,
            routeAttackMinTick: 6600,
            routeAttackMinCombatants: 4,
            routeAttackOrderIntervalTicks: 30,
            routeAttackAdvanceIntervalTicks: 900,
            routeAttackWaypoints: ROUTE_ATTACK_WAYPOINT_VALUES[2],
            hfoCloseoutEnabled: true,
            hfoCloseoutMinTick: 7200,
            hfoCloseoutMinUnits: 4,
            hfoCloseoutMaxEnemyBuildings: 999,
            hfoCloseoutMaxEnemyCombatants: 999,
            hfoCloseoutOrderIntervalTicks: 15,
        },
        {
            ...seeds[0],
            allInEnabled: true,
            allInMinTick: 12600,
            allInMinCombatants: 8,
            allInCombatantAdvantage: 4,
            allInDisbandExistingAttacks: false,
            allInDirectVisibleAttack: false,
            forceAttackEnabled: true,
            forceAttackMinTick: 16200,
            forceAttackMinCombatants: 12,
            forceAttackCombatantAdvantage: 6,
            forceAttackMaxEnemyCombatants: 4,
            forceAttackOrderIntervalTicks: 60,
            forceAttackDirectAttackKnownTargets: true,
            forceAttackMaxTargets: 1,
            hfoWestSweepEnabled: true,
            hfoWestSweepMinTick: 16200,
            hfoWestSweepMinCombatants: 12,
            hfoWestSweepCombatantAdvantage: 6,
            hfoWestSweepMaxEnemyCombatants: 4,
            hfoWestSweepOrderIntervalTicks: 45,
            hfoWestSweepAdvanceIntervalTicks: 600,
            hfoWestSweepWaypoints: HFO_WEST_SWEEP_WAYPOINT_VALUES[0],
            hfoWestSweepDirectAttackKnownTargets: true,
            hfoWestSweepMaxTargets: 2,
        },
        {
            ...seeds[0],
            allInEnabled: true,
            allInMinTick: 12600,
            allInMinCombatants: 8,
            allInCombatantAdvantage: 4,
            allInDisbandExistingAttacks: false,
            allInDirectVisibleAttack: false,
            forceAttackEnabled: true,
            forceAttackMinTick: 16200,
            forceAttackMinCombatants: 12,
            forceAttackCombatantAdvantage: 6,
            forceAttackMaxEnemyCombatants: 4,
            forceAttackOrderIntervalTicks: 60,
            forceAttackDirectAttackKnownTargets: true,
            forceAttackMaxTargets: 1,
            hfoWestSweepEnabled: true,
            hfoWestSweepMinTick: 14400,
            hfoWestSweepMinCombatants: 12,
            hfoWestSweepCombatantAdvantage: 6,
            hfoWestSweepMaxEnemyCombatants: 4,
            hfoWestSweepOrderIntervalTicks: 45,
            hfoWestSweepAdvanceIntervalTicks: 600,
            hfoWestSweepWaypoints: HFO_WEST_SWEEP_WAYPOINT_VALUES[0],
            hfoWestSweepDirectAttackKnownTargets: true,
            hfoWestSweepMaxTargets: 2,
        },
        {
            ...seeds[0],
            allInEnabled: true,
            allInMinTick: 12600,
            allInMinCombatants: 8,
            allInCombatantAdvantage: 4,
            allInDisbandExistingAttacks: false,
            allInDirectVisibleAttack: false,
            forceAttackEnabled: true,
            forceAttackMinTick: 16200,
            forceAttackMinCombatants: 12,
            forceAttackCombatantAdvantage: 6,
            forceAttackMaxEnemyCombatants: 4,
            forceAttackOrderIntervalTicks: 60,
            forceAttackDirectAttackKnownTargets: true,
            forceAttackMaxTargets: 1,
            hfoWestSweepEnabled: true,
            hfoWestSweepMinTick: 16200,
            hfoWestSweepMinCombatants: 12,
            hfoWestSweepCombatantAdvantage: 6,
            hfoWestSweepMaxEnemyCombatants: 4,
            hfoWestSweepOrderIntervalTicks: 45,
            hfoWestSweepAdvanceIntervalTicks: 900,
            hfoWestSweepWaypoints: HFO_WEST_SWEEP_WAYPOINT_VALUES[0],
            hfoWestSweepDirectAttackKnownTargets: true,
            hfoWestSweepMaxTargets: 2,
        },
        {
            ...seeds[0],
            allInEnabled: true,
            allInMinTick: 12600,
            allInMinCombatants: 8,
            allInCombatantAdvantage: 4,
            allInDisbandExistingAttacks: false,
            allInDirectVisibleAttack: false,
            forceAttackEnabled: true,
            forceAttackMinTick: 16200,
            forceAttackMinCombatants: 12,
            forceAttackCombatantAdvantage: 6,
            forceAttackMaxEnemyCombatants: 4,
            forceAttackOrderIntervalTicks: 60,
            forceAttackDirectAttackKnownTargets: true,
            forceAttackMaxTargets: 1,
            hfoWestSweepEnabled: true,
            hfoWestSweepMinTick: 18000,
            hfoWestSweepMinCombatants: 12,
            hfoWestSweepCombatantAdvantage: 10,
            hfoWestSweepMaxEnemyCombatants: 1,
            hfoWestSweepOrderIntervalTicks: 45,
            hfoWestSweepAdvanceIntervalTicks: 600,
            hfoWestSweepWaypoints: HFO_WEST_SWEEP_WAYPOINT_VALUES[0],
            hfoWestSweepDirectAttackKnownTargets: true,
            hfoWestSweepMaxTargets: 2,
        },
    );
    const routeSeedCount = 4;
    const routeSeedStart = Math.max(0, seeds.length - routeSeedCount);
    const routeSeeds = seeds.splice(routeSeedStart, routeSeedCount);
    seeds.unshift(...routeSeeds);
    while (seeds.length < settings.populationSize) {
        seeds.push(applySearchMode(randomPolicy(rng, settings.candidateCountries), settings));
    }
    return seeds.map((policy) => applySearchMode(withDefaultBaseTuning(policy), settings)).slice(0, settings.populationSize);
};

const mutateChoice = <T>(rng: Random, current: T, values: readonly T[], rate: number): T => {
    return rng.bool(rate) ? rng.choice(values) : current;
};

const mutatePolicy = (rng: Random, parent: PolicyConfig, settings: TrainerSettings): PolicyConfig => applySearchMode({
    candidateCountry: mutateChoice(rng, parent.candidateCountry, settings.candidateCountries, 0.2),
    attackCompositionPolicy: mutateChoice(rng, parent.attackCompositionPolicy, ATTACK_COMPOSITION_POLICIES, 0.35),
    attackGateEnabled: rng.bool(0.22) ? !parent.attackGateEnabled : parent.attackGateEnabled,
    attackGateMinTick: mutateChoice(rng, parent.attackGateMinTick, [0, 1800, 3600, 5400, 7200, 9000], 0.35),
    attackGateMinCombatants: mutateChoice(rng, parent.attackGateMinCombatants, [0, 4, 6, 8, 10, 12, 16], 0.35),
    attackGateHfoBottomMinCombatants: mutateChoice(
        rng,
        parent.attackGateHfoBottomMinCombatants,
        [24, 28, 32, 36, 40, 45, 50],
        0.35,
    ),
    attackGateCombatantAdvantage: mutateChoice(rng, parent.attackGateCombatantAdvantage, [-6, -3, 0, 3, 6, 10, 14], 0.35),
    attackGateMaxEnemyCombatants: mutateChoice(rng, parent.attackGateMaxEnemyCombatants, [0, 2, 4, 6, 8, 10, 14, 999], 0.35),
    attackSuppressionEnabled: rng.bool(0.18)
        ? !(parent.attackSuppressionEnabled ?? false)
        : parent.attackSuppressionEnabled ?? false,
    attackSuppressionRadius: mutateChoice(
        rng,
        parent.attackSuppressionRadius ?? 24,
        ATTACK_SUPPRESSION_RADIUS_VALUES,
        0.3,
    ),
    strategicPlan: mutateChoice(rng, parent.strategicPlan ?? "off", STRATEGIC_PLAN_POLICIES, 0.28),
    rushSellTick: mutateChoice(rng, parent.rushSellTick ?? 7200, RUSH_SELL_TICK_VALUES, 0.24),
    rushSellMinCombatants: mutateChoice(
        rng,
        parent.rushSellMinCombatants ?? 12,
        RUSH_SELL_MIN_COMBATANT_VALUES,
        0.24,
    ),
    strategicDogTargetCount: mutateChoice(
        rng,
        parent.strategicDogTargetCount ?? 2,
        DOG_TARGET_COUNT_VALUES,
        0.22,
    ),
    hfoBottomDogTargetCount: mutateChoice(
        rng,
        parent.hfoBottomDogTargetCount ?? 3,
        DOG_TARGET_COUNT_VALUES,
        0.28,
    ),
    antiInfantryDogTargetCount: mutateChoice(
        rng,
        parent.antiInfantryDogTargetCount ?? 5,
        DOG_TARGET_COUNT_VALUES,
        0.28,
    ),
    attackAllowDefenceSteal: rng.bool(0.08) ? !parent.attackAllowDefenceSteal : parent.attackAllowDefenceSteal,
    defenceCheckTicks: mutateChoice(rng, parent.defenceCheckTicks, DEFENCE_CHECK_TICK_VALUES, 0.22),
    defenceStartingRadius: mutateChoice(rng, parent.defenceStartingRadius, DEFENCE_STARTING_RADIUS_VALUES, 0.28),
    defenceRadiusIncreasePerTick: mutateChoice(
        rng,
        parent.defenceRadiusIncreasePerTick,
        DEFENCE_RADIUS_INCREASE_VALUES,
        0.24,
    ),
    defenceDefendProduction: rng.bool(0.08) ? !parent.defenceDefendProduction : parent.defenceDefendProduction,
    defenceMissionPriority: mutateChoice(
        rng,
        parent.defenceMissionPriority,
        DEFENCE_MISSION_PRIORITY_VALUES,
        0.24,
    ),
    defenceActivePriority: mutateChoice(rng, parent.defenceActivePriority, DEFENCE_ACTIVE_PRIORITY_VALUES, 0.24),
    scoutCooldownTicks: mutateChoice(rng, parent.scoutCooldownTicks ?? 180, SCOUT_COOLDOWN_TICK_VALUES, 0.28),
    scoutMaxConcurrentMissions: mutateChoice(
        rng,
        parent.scoutMaxConcurrentMissions ?? 3,
        SCOUT_MAX_CONCURRENT_VALUES,
        0.3,
    ),
    scoutMissionPriority: mutateChoice(rng, parent.scoutMissionPriority ?? 10, SCOUT_MISSION_PRIORITY_VALUES, 0.24),
    engineerKnownTechEnabled: rng.bool(0.18)
        ? !(parent.engineerKnownTechEnabled ?? true)
        : parent.engineerKnownTechEnabled ?? true,
    engineerTechMaxTargets: mutateChoice(rng, parent.engineerTechMaxTargets ?? 1, [0, 1, 2], 0.24),
    engineerTechMaxDistanceFromStart: mutateChoice(
        rng,
        parent.engineerTechMaxDistanceFromStart ?? 38,
        [30, 38, 48, 60, 999],
        0.24,
    ),
    engineerTechPriority: mutateChoice(rng, parent.engineerTechPriority ?? 96, [72, 84, 96, 108], 0.2),
    engineerTechEscortLevel: mutateChoice(rng, parent.engineerTechEscortLevel ?? 2, [1, 2, 3], 0.2),
    macroBoostEnabled: rng.bool(0.18) ? !parent.macroBoostEnabled : parent.macroBoostEnabled,
    staticDefenseEnabled: rng.bool(0.22) ? !parent.staticDefenseEnabled : parent.staticDefenseEnabled,
    staticDefenseStartTick: mutateChoice(rng, parent.staticDefenseStartTick, STATIC_DEFENSE_START_TICK_VALUES, 0.35),
    staticDefenseTargetCount: mutateChoice(rng, parent.staticDefenseTargetCount, STATIC_DEFENSE_TARGET_COUNT_VALUES, 0.35),
    staticDefensePriority: mutateChoice(rng, parent.staticDefensePriority, STATIC_DEFENSE_PRIORITY_VALUES, 0.35),
    harassEnabled: rng.bool(0.22) ? !parent.harassEnabled : parent.harassEnabled,
    harassMinTick: mutateChoice(rng, parent.harassMinTick, MIN_TICK_VALUES, 0.35),
    harassMinCombatants: mutateChoice(rng, parent.harassMinCombatants, [2, 3, 4, 5, 6, 8], 0.35),
    harassMaxUnits: mutateChoice(rng, parent.harassMaxUnits, [2, 3, 4, 5, 6, 8], 0.35),
    harassCombatantAdvantage: mutateChoice(rng, parent.harassCombatantAdvantage, ADVANTAGE_VALUES, 0.35),
    harassMaxEnemyCombatants: mutateChoice(rng, parent.harassMaxEnemyCombatants, MAX_ENEMY_COMBATANT_VALUES, 0.35),
    harassOrderIntervalTicks: mutateChoice(rng, parent.harassOrderIntervalTicks, [60, 90, 120, 180, 240], 0.35),
    harassDirectAttackKnownTargets: rng.bool(0.18)
        ? !parent.harassDirectAttackKnownTargets
        : parent.harassDirectAttackKnownTargets,
    allInEnabled: rng.bool(0.22) ? !parent.allInEnabled : parent.allInEnabled,
    allInMinTick: mutateChoice(rng, parent.allInMinTick, MIN_TICK_VALUES, 0.35),
    allInMinCombatants: mutateChoice(rng, parent.allInMinCombatants, MIN_COMBATANT_VALUES, 0.35),
    allInCombatantAdvantage: mutateChoice(rng, parent.allInCombatantAdvantage, ADVANTAGE_VALUES, 0.35),
    allInDisbandExistingAttacks: rng.bool(0.15) ? !parent.allInDisbandExistingAttacks : parent.allInDisbandExistingAttacks,
    allInDirectVisibleAttack: rng.bool(0.18) ? !parent.allInDirectVisibleAttack : parent.allInDirectVisibleAttack,
    forceAttackEnabled: rng.bool(0.16) ? !parent.forceAttackEnabled : parent.forceAttackEnabled,
    forceAttackMinTick: mutateChoice(rng, parent.forceAttackMinTick, MIN_TICK_VALUES, 0.35),
    forceAttackMinCombatants: mutateChoice(rng, parent.forceAttackMinCombatants, MIN_COMBATANT_VALUES, 0.35),
    forceAttackCombatantAdvantage: mutateChoice(rng, parent.forceAttackCombatantAdvantage, ADVANTAGE_VALUES, 0.35),
    forceAttackMaxEnemyCombatants: mutateChoice(
        rng,
        parent.forceAttackMaxEnemyCombatants,
        MAX_ENEMY_COMBATANT_VALUES,
        0.35,
    ),
    forceAttackOrderIntervalTicks: mutateChoice(
        rng,
        parent.forceAttackOrderIntervalTicks,
        ORDER_INTERVAL_VALUES,
        0.35,
    ),
    forceAttackDirectAttackKnownTargets: rng.bool(0.18)
        ? !parent.forceAttackDirectAttackKnownTargets
        : parent.forceAttackDirectAttackKnownTargets,
    forceAttackMaxTargets: mutateChoice(rng, parent.forceAttackMaxTargets ?? 1, [1, 2, 3, 4], 0.28),
    forceAttackHfoWestVsEastOnly: rng.bool(0.12)
        ? !parent.forceAttackHfoWestVsEastOnly
        : parent.forceAttackHfoWestVsEastOnly,
    routeAttackEnabled: rng.bool(0.22) ? !parent.routeAttackEnabled : parent.routeAttackEnabled,
    routeAttackMinTick: mutateChoice(
        rng,
        parent.routeAttackMinTick,
        [5400, 6600, 7200, 9000, 10800, 12600, 14400],
        0.35,
    ),
    routeAttackMinCombatants: mutateChoice(
        rng,
        parent.routeAttackMinCombatants,
        [4, 6, 8, 10, 12, 16, 20],
        0.35,
    ),
    routeAttackOrderIntervalTicks: mutateChoice(
        rng,
        parent.routeAttackOrderIntervalTicks,
        ORDER_INTERVAL_VALUES,
        0.35,
    ),
    routeAttackAdvanceIntervalTicks: mutateChoice(
        rng,
        parent.routeAttackAdvanceIntervalTicks,
        ROUTE_ATTACK_ADVANCE_INTERVAL_VALUES,
        0.35,
    ),
    routeAttackWaypoints: mutateChoice(rng, parent.routeAttackWaypoints, ROUTE_ATTACK_WAYPOINT_VALUES, 0.35),
    routeAttackDirectAttackKnownTargets: rng.bool(0.18)
        ? !parent.routeAttackDirectAttackKnownTargets
        : parent.routeAttackDirectAttackKnownTargets,
    hfoCloseoutEnabled: rng.bool(0.2) ? !parent.hfoCloseoutEnabled : parent.hfoCloseoutEnabled,
    hfoCloseoutMinTick: mutateChoice(
        rng,
        parent.hfoCloseoutMinTick,
        [5400, 7200, 9000, 10800, 12600, 14400],
        0.35,
    ),
    hfoCloseoutMinUnits: mutateChoice(rng, parent.hfoCloseoutMinUnits, [4, 6, 8, 10, 12, 16, 20], 0.35),
    hfoCloseoutMaxEnemyBuildings: mutateChoice(
        rng,
        parent.hfoCloseoutMaxEnemyBuildings,
        HFO_CLOSEOUT_MAX_BUILDING_VALUES,
        0.35,
    ),
    hfoCloseoutMaxEnemyCombatants: mutateChoice(
        rng,
        parent.hfoCloseoutMaxEnemyCombatants,
        MAX_ENEMY_COMBATANT_VALUES,
        0.35,
    ),
    hfoCloseoutOrderIntervalTicks: mutateChoice(
        rng,
        parent.hfoCloseoutOrderIntervalTicks,
        EMERGENCY_ORDER_INTERVAL_VALUES,
        0.35,
    ),
    hfoCloseoutIncludeHarvesters: rng.bool(0.08)
        ? !parent.hfoCloseoutIncludeHarvesters
        : parent.hfoCloseoutIncludeHarvesters,
    hfoWestSweepEnabled: rng.bool(0.22) ? !parent.hfoWestSweepEnabled : parent.hfoWestSweepEnabled,
    hfoWestSweepMinTick: mutateChoice(
        rng,
        parent.hfoWestSweepMinTick,
        [7200, 9000, 10800, 12600, 14400, 16200],
        0.35,
    ),
    hfoWestSweepMinCombatants: mutateChoice(
        rng,
        parent.hfoWestSweepMinCombatants,
        [4, 6, 8, 10, 12, 16, 20],
        0.35,
    ),
    hfoWestSweepCombatantAdvantage: mutateChoice(
        rng,
        parent.hfoWestSweepCombatantAdvantage,
        ADVANTAGE_VALUES,
        0.35,
    ),
    hfoWestSweepMaxEnemyCombatants: mutateChoice(
        rng,
        parent.hfoWestSweepMaxEnemyCombatants,
        MAX_ENEMY_COMBATANT_VALUES,
        0.35,
    ),
    hfoWestSweepOrderIntervalTicks: mutateChoice(
        rng,
        parent.hfoWestSweepOrderIntervalTicks,
        [24, 30, 45, 60, 90],
        0.35,
    ),
    hfoWestSweepAdvanceIntervalTicks: mutateChoice(
        rng,
        parent.hfoWestSweepAdvanceIntervalTicks,
        [600, 900, 1200, 1500],
        0.35,
    ),
    hfoWestSweepWaypoints: mutateChoice(
        rng,
        parent.hfoWestSweepWaypoints,
        HFO_WEST_SWEEP_WAYPOINT_VALUES,
        0.35,
    ),
    hfoWestSweepDirectAttackKnownTargets: rng.bool(0.18)
        ? !parent.hfoWestSweepDirectAttackKnownTargets
        : parent.hfoWestSweepDirectAttackKnownTargets,
    hfoWestSweepMaxTargets: mutateChoice(rng, parent.hfoWestSweepMaxTargets, [1, 2, 3], 0.28),
    emergencyDefenseEnabled: rng.bool(0.14) ? !parent.emergencyDefenseEnabled : parent.emergencyDefenseEnabled,
    emergencyDefenseRadius: mutateChoice(rng, parent.emergencyDefenseRadius, EMERGENCY_RADIUS_VALUES, 0.35),
    emergencyDefenseMinCombatants: mutateChoice(rng, parent.emergencyDefenseMinCombatants, [1, 2, 3, 4, 6], 0.28),
    emergencyDefenseMaxDefenders: mutateChoice(
        rng,
        parent.emergencyDefenseMaxDefenders,
        EMERGENCY_MAX_DEFENDER_VALUES,
        0.28,
    ),
    emergencyDefenseOrderIntervalTicks: mutateChoice(
        rng,
        parent.emergencyDefenseOrderIntervalTicks,
        [15, 24, 30, 45, 60],
        0.28,
    ),
    emergencyDefenseDirectAttackKnownTargets: rng.bool(0.12)
        ? !parent.emergencyDefenseDirectAttackKnownTargets
        : parent.emergencyDefenseDirectAttackKnownTargets,
    emergencyDefenseHfoWestVsEastOnly: rng.bool(0.12)
        ? !parent.emergencyDefenseHfoWestVsEastOnly
        : parent.emergencyDefenseHfoWestVsEastOnly,
}, settings);

const writeJson = (filePath: string, value: unknown): void => {
    fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
};

const appendJsonl = (filePath: string, value: unknown): void => {
    fs.appendFileSync(filePath, `${JSON.stringify(value)}\n`);
};

const makeCandidateId = (generation: number, index: number): string => {
    return `g${generation.toString().padStart(2, "0")}_p${index.toString().padStart(3, "0")}`;
};

const main = async () => {
    const settings = parseSettings();
    const rng = new Random(settings.seed);
    let episode = 1;

    fs.mkdirSync(settings.outDir, { recursive: true });
    const evaluationsPath = path.join(settings.outDir, "evaluations.jsonl");
    const episodesPath = path.join(settings.outDir, "episodes.jsonl");
    const checkpointPath = path.join(settings.outDir, "checkpoint.json");
    writeJson(path.join(settings.outDir, "settings.json"), settings);

    await cdapi.init(process.env.MIX_DIR || "./data");

    let population = seedPolicies(rng, settings);
    const bestEvaluations: Evaluation[] = [];
    console.log(
        `training run=${settings.runTag} seed=${settings.seed} generations=${settings.generations} ` +
            `population=${settings.populationSize} repeats=${settings.repeats} out=${settings.outDir}`,
    );

    for (let generation = 0; generation < settings.generations; generation++) {
        const evaluations: Evaluation[] = [];
        for (let index = 0; index < population.length; index++) {
            const candidateId = makeCandidateId(generation, index);
            const evaluation = await evaluatePolicy(
                generation,
                candidateId,
                population[index],
                settings,
                () => episode++,
            );
            evaluations.push(evaluation);
            appendJsonl(evaluationsPath, {
                generation: evaluation.generation,
                candidateId: evaluation.candidateId,
                config: evaluation.config,
                summary: evaluation.summary,
            });
            for (const result of evaluation.results) {
                appendJsonl(episodesPath, result);
            }
            console.log(
                JSON.stringify({
                    generation,
                    candidateId,
                    score: Number(evaluation.summary.score.toFixed(2)),
                    wins: evaluation.summary.wins,
                    losses: evaluation.summary.losses,
                    draws: evaluation.summary.draws,
                    winRate: Number(evaluation.summary.winRate.toFixed(3)),
                    config: evaluation.config,
                }),
            );
        }

        evaluations.sort(compareEvaluations);
        bestEvaluations.push(evaluations[0]);
        bestEvaluations.sort(compareEvaluations);
        const elites = evaluations.slice(0, settings.eliteCount);
        writeJson(checkpointPath, {
            generatedAt: new Date().toISOString(),
            settings,
            generation,
            bestOverall: bestEvaluations[0],
            generationBest: evaluations[0],
            elites: elites.map((evaluation) => ({
                candidateId: evaluation.candidateId,
                config: evaluation.config,
                summary: evaluation.summary,
            })),
        });
        console.log(
            `generation ${generation} best=${evaluations[0].candidateId} ` +
                `w-l-d=${evaluations[0].summary.wins}-${evaluations[0].summary.losses}-${evaluations[0].summary.draws} ` +
                `score=${evaluations[0].summary.score.toFixed(1)}`,
        );

        const nextPopulation = elites.map((evaluation) => evaluation.config);
        while (nextPopulation.length < settings.populationSize) {
            const parent = rng.choice(elites).config;
            nextPopulation.push(mutatePolicy(rng, parent, settings));
        }
        population = nextPopulation;
    }

    console.log(`checkpoint=${checkpointPath}`);
    console.log(
        `best=${bestEvaluations[0].candidateId} ` +
            `w-l-d=${bestEvaluations[0].summary.wins}-${bestEvaluations[0].summary.losses}-${bestEvaluations[0].summary.draws} ` +
            `score=${bestEvaluations[0].summary.score.toFixed(1)}`,
    );
};

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
