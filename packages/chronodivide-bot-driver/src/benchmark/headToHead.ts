import fs from "node:fs";
import path from "node:path";
import { CreateOfflineOpts, GameApi, ObjectType, cdapi } from "@chronodivide/game-api";
import { SupalosaBot } from "@supalosa/chronodivide-bot/dist/bot/bot.js";
import { DefaultStrategy } from "@supalosa/chronodivide-bot/dist/bot/strategy/defaultStrategy.js";
import { StrongStrategy, StrongStrategyOptions } from "@supalosa/chronodivide-bot/dist/bot/strategy/strongStrategy.js";
import { StrongBot, StrongBotOptions } from "@supalosa/chronodivide-bot/dist/bot/strongBot.js";
import { Countries } from "@supalosa/chronodivide-bot/dist/bot/logic/common/utils.js";

type MatchResult = {
    match: number;
    mapName: string;
    candidateCountry: Countries;
    baselineCountry: Countries;
    candidateSlot: number;
    candidateStart: { x: number; y: number };
    baselineStart: { x: number; y: number };
    ticks: number;
    finished: boolean;
    winner: "candidate" | "baseline" | "draw";
    candidateDefeated: boolean;
    baselineDefeated: boolean;
    candidateCredits: number;
    baselineCredits: number;
    candidateUnits: number;
    baselineUnits: number;
    candidateBuildings: number;
    baselineBuildings: number;
    candidateCombatants: number;
    baselineCombatants: number;
};

type BenchmarkSummary = {
    generatedAt: string;
    maps: string[];
    matchesPerPair: number;
    maxTicks: number;
    results: MatchResult[];
    candidateWins: number;
    baselineWins: number;
    draws: number;
    candidateWinRate: number;
};

type PlayerSnapshot = {
    credits: number;
    units: number;
    buildings: number;
    combatants: number;
    harvesters: number;
    factories: number;
    refineries: number;
    conyards: number;
    byName: Record<string, number>;
    samplesByName: Record<string, Array<{ x: number; y: number; stance: string }>>;
};

type MatchTraceSnapshot = {
    trace: true;
    match: number;
    tick: number;
    candidateStart: { x: number; y: number };
    baselineStart: { x: number; y: number };
    candidate: PlayerSnapshot;
    baseline: PlayerSnapshot;
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

const getPlayerSnapshot = (game: GameApi | null, playerName: string): PlayerSnapshot => {
    if (!game) {
        return {
            credits: 0,
            units: 0,
            buildings: 0,
            combatants: 0,
            harvesters: 0,
            factories: 0,
            refineries: 0,
            conyards: 0,
            byName: {},
            samplesByName: {},
        };
    }
    const units = game
        .getVisibleUnits(playerName, "self")
        .map((id) => game.getUnitData(id))
        .filter((unit): unit is NonNullable<ReturnType<GameApi["getUnitData"]>> => !!unit);
    const byName: Record<string, number> = {};
    const samplesByName: Record<string, Array<{ x: number; y: number; stance: string }>> = {};
    for (const unit of units) {
        byName[unit.rules.name] = (byName[unit.rules.name] ?? 0) + 1;
        const samples = (samplesByName[unit.rules.name] ??= []);
        if (samples.length < 12) {
            samples.push({ x: unit.tile.rx, y: unit.tile.ry, stance: String(unit.stance) });
        }
    }
    return {
        credits: game.getPlayerData(playerName).credits,
        units: units.length,
        buildings: units.filter((unit) => unit.rules.type === ObjectType.Building).length,
        combatants: units.filter((unit) => unit.rules.isSelectableCombatant).length,
        harvesters: units.filter((unit) => unit.rules.harvester).length,
        factories: units.filter((unit) => unit.rules.weaponsFactory).length,
        refineries: units.filter((unit) => unit.rules.refinery).length,
        conyards: units.filter((unit) => unit.rules.constructionYard).length,
        byName,
        samplesByName,
    };
};

const emitTraceSnapshot = (snapshot: MatchTraceSnapshot): void => {
    console.log(`trace=${JSON.stringify(snapshot)}`);
};

const parseOptionalIntEnv = (name: string): number | undefined => {
    const raw = process.env[name];
    if (!raw) {
        return undefined;
    }
    const parsed = Number.parseInt(raw, 10);
    if (!Number.isFinite(parsed)) {
        throw new Error(`${name} must be an integer, got ${raw}`);
    }
    return parsed;
};

const parseOptionalFloatEnv = (name: string): number | undefined => {
    const raw = process.env[name];
    if (!raw) {
        return undefined;
    }
    const parsed = Number.parseFloat(raw);
    if (!Number.isFinite(parsed)) {
        throw new Error(`${name} must be a number, got ${raw}`);
    }
    return parsed;
};

const parseBoolValue = (name: string, raw: string): boolean => {
    if (["1", "true", "yes", "on"].includes(raw.toLowerCase())) {
        return true;
    }
    if (["0", "false", "no", "off"].includes(raw.toLowerCase())) {
        return false;
    }
    throw new Error(`${name} must be boolean-like, got ${raw}`);
};

const parseBoolEnv = (name: string, defaultValue: boolean): boolean => {
    const raw = process.env[name];
    return raw ? parseBoolValue(name, raw) : defaultValue;
};

const parseOptionalBoolEnv = (name: string): boolean | undefined => {
    const raw = process.env[name];
    return raw ? parseBoolValue(name, raw) : undefined;
};

const parseAttackTargetPriority = (): StrongStrategyOptions["base"] extends { attackMission?: infer T } ? T extends { targetPriority?: infer U } ? U | undefined : undefined : undefined => {
    const raw = process.env.ATTACK_TARGET_PRIORITY;
    if (!raw) {
        return undefined;
    }
    const priorities = new Set(["distance", "strategic"]);
    if (!priorities.has(raw)) {
        throw new Error(`ATTACK_TARGET_PRIORITY must be distance or strategic, got ${raw}`);
    }
    return raw as any;
};

const parseAttackCompositionPolicy = (): StrongStrategyOptions["base"] => {
    const raw = process.env.ATTACK_COMPOSITION_POLICY;
    const policies = new Set([
        "random",
        "infantry",
        "assault",
        "tanks",
        "air",
        "heavy",
        "artillery",
        "desolator",
        "naval",
        "hfo",
    ]);
    if (raw && !policies.has(raw)) {
        throw new Error(`ATTACK_COMPOSITION_POLICY contains unknown policy ${raw}`);
    }
    return {
        attackCompositionPolicy: raw ? raw as any : undefined,
        attackGate: {
            enabled: parseOptionalBoolEnv("ATTACK_GATE_ENABLED"),
            hfoOnly: parseOptionalBoolEnv("ATTACK_GATE_HFO_ONLY"),
            minTick: parseOptionalIntEnv("ATTACK_GATE_MIN_TICK"),
            hfoBottomMinTick: parseOptionalIntEnv("ATTACK_GATE_HFO_BOTTOM_MIN_TICK"),
            minCombatants: parseOptionalIntEnv("ATTACK_GATE_MIN_COMBATANTS"),
            hfoBottomMinCombatants: parseOptionalIntEnv("ATTACK_GATE_HFO_BOTTOM_MIN_COMBATANTS"),
            combatantAdvantage: parseOptionalIntEnv("ATTACK_GATE_COMBATANT_ADVANTAGE"),
            maxEnemyCombatants: parseOptionalIntEnv("ATTACK_GATE_MAX_ENEMY_COMBATANTS"),
        },
        attackSuppression: {
            enabled: parseOptionalBoolEnv("ATTACK_SUPPRESSION_ENABLED"),
            radius: parseOptionalIntEnv("ATTACK_SUPPRESSION_RADIUS"),
            hfoBottomOnly: parseOptionalBoolEnv("ATTACK_SUPPRESSION_HFO_BOTTOM_ONLY"),
        },
        attackMission: {
            allowDefenceSteal: parseOptionalBoolEnv("ATTACK_ALLOW_DEFENCE_STEAL"),
            targetPriority: parseAttackTargetPriority(),
        },
        defence: {
            checkTicks: parseOptionalIntEnv("DEFENCE_CHECK_TICKS"),
            startingRadius: parseOptionalIntEnv("DEFENCE_STARTING_RADIUS"),
            radiusIncreasePerTick: parseOptionalFloatEnv("DEFENCE_RADIUS_INCREASE_PER_TICK"),
            defendProduction: parseOptionalBoolEnv("DEFENCE_DEFEND_PRODUCTION"),
            missionPriority: parseOptionalIntEnv("DEFENCE_MISSION_PRIORITY"),
            activePriority: parseOptionalIntEnv("DEFENCE_ACTIVE_PRIORITY"),
        },
        scouting: {
            cooldownTicks: parseOptionalIntEnv("SCOUT_COOLDOWN_TICKS"),
            maxConcurrentMissions: parseOptionalIntEnv("SCOUT_MAX_CONCURRENT"),
            missionPriority: parseOptionalIntEnv("SCOUT_MISSION_PRIORITY"),
        },
        engineer: {
            useKnownTechBuildings: parseOptionalBoolEnv("ENGINEER_KNOWN_TECH_ENABLED"),
            captureEnemyBuildings: parseOptionalBoolEnv("ENGINEER_ENEMY_CAPTURE_ENABLED"),
            enemyStartTick: parseOptionalIntEnv("ENGINEER_ENEMY_START_TICK"),
            enemyMaxCombatants: parseOptionalIntEnv("ENGINEER_ENEMY_MAX_COMBATANTS"),
            enemyMaxBuildings: parseOptionalIntEnv("ENGINEER_ENEMY_MAX_BUILDINGS"),
            techPriority: parseOptionalIntEnv("ENGINEER_TECH_PRIORITY"),
            techMaxTargets: parseOptionalIntEnv("ENGINEER_TECH_MAX_TARGETS"),
            techMaxDistanceFromStart: parseOptionalIntEnv("ENGINEER_TECH_MAX_DISTANCE"),
            enemyPriority: parseOptionalIntEnv("ENGINEER_ENEMY_PRIORITY"),
            techEscortLevel: parseOptionalIntEnv("ENGINEER_TECH_ESCORT_LEVEL"),
            enemyEscortLevel: parseOptionalIntEnv("ENGINEER_ENEMY_ESCORT_LEVEL"),
            enemyMaxTargets: parseOptionalIntEnv("ENGINEER_ENEMY_MAX_TARGETS"),
        },
    };
};

const parseStrategicPlan = (): StrongStrategyOptions["strategicPlan"] => {
    const raw = process.env.STRATEGIC_PLAN;
    if (!raw) {
        return undefined;
    }
    const plans = new Set([
        "off",
        "macro",
        "macroSiege",
        "macroLateSiege",
        "hfoBottom",
        "hfoWestRush",
        "rush",
        "tankBoom",
        "otmqAntiInfantry",
        "otmqTankSiege",
        "tech",
        "siege",
        "westSiege",
        "islandTech",
        "adaptive",
        "hfo",
    ]);
    if (!plans.has(raw)) {
        throw new Error(
            `STRATEGIC_PLAN must be off, macro, macroSiege, macroLateSiege, hfoBottom, hfoWestRush, rush, tankBoom, otmqAntiInfantry, otmqTankSiege, tech, siege, westSiege, islandTech, adaptive, or hfo, got ${raw}`,
        );
    }
    return {
        enabled: raw !== "off",
        plan: raw as any,
        rushSellTick: parseOptionalIntEnv("RUSH_SELL_TICK"),
        rushSellMinCombatants: parseOptionalIntEnv("RUSH_SELL_MIN_COMBATANTS"),
        dogTargetCount: parseOptionalIntEnv("STRATEGIC_DOG_TARGET_COUNT"),
        hfoBottomDogTargetCount: parseOptionalIntEnv("HFO_BOTTOM_DOG_TARGET_COUNT"),
        antiInfantryDogTargetCount: parseOptionalIntEnv("ANTI_INFANTRY_DOG_TARGET_COUNT"),
    };
};

const parseStrongStrategyOptions = (): StrongStrategyOptions => ({
    base: parseAttackCompositionPolicy(),
    allIn: parseAllInOptions(),
    macroBoost: {
        enabled: parseBoolEnv("MACRO_BOOST_ENABLED", false),
    },
    staticDefenseBoost: {
        enabled: parseOptionalBoolEnv("STATIC_DEFENSE_ENABLED"),
        hfoBottomOnly: parseOptionalBoolEnv("STATIC_DEFENSE_HFO_BOTTOM_ONLY"),
        startTick: parseOptionalIntEnv("STATIC_DEFENSE_START_TICK"),
        targetCount: parseOptionalIntEnv("STATIC_DEFENSE_TARGET_COUNT"),
        priority: parseOptionalIntEnv("STATIC_DEFENSE_PRIORITY"),
    },
    strategicPlan: parseStrategicPlan(),
});

const parseAllInOptions = (): StrongStrategyOptions["allIn"] => {
    if (!Object.keys(process.env).some((name) => name.startsWith("ALL_IN_"))) {
        return undefined;
    }
    return {
        enabled: parseBoolEnv("ALL_IN_ENABLED", false),
        minTick: parseOptionalIntEnv("ALL_IN_MIN_TICK"),
        minCombatants: parseOptionalIntEnv("ALL_IN_MIN_COMBATANTS"),
        combatantAdvantage: parseOptionalIntEnv("ALL_IN_COMBATANT_ADVANTAGE"),
        disbandExistingAttacks: parseBoolEnv("ALL_IN_DISBAND", false),
        directVisibleAttack: parseBoolEnv("ALL_IN_DIRECT", true),
    };
};

const parseStrongBotOptions = (): StrongBotOptions => ({
    defaultMapProfiles: parseOptionalBoolEnv("DEFAULT_MAP_PROFILES_ENABLED"),
    harass: {
        enabled: parseOptionalBoolEnv("HARASS_ENABLED"),
        minTick: parseOptionalIntEnv("HARASS_MIN_TICK"),
        minCombatants: parseOptionalIntEnv("HARASS_MIN_COMBATANTS"),
        maxUnits: parseOptionalIntEnv("HARASS_MAX_UNITS"),
        combatantAdvantage: parseOptionalIntEnv("HARASS_COMBATANT_ADVANTAGE"),
        maxEnemyCombatants: parseOptionalIntEnv("HARASS_MAX_ENEMY_COMBATANTS"),
        orderIntervalTicks: parseOptionalIntEnv("HARASS_ORDER_INTERVAL"),
        directAttackKnownTargets: parseOptionalBoolEnv("HARASS_DIRECT"),
    },
    forceAttack: {
        enabled: parseOptionalBoolEnv("FORCE_ATTACK_ENABLED"),
        minTick: parseOptionalIntEnv("FORCE_ATTACK_MIN_TICK"),
        minCombatants: parseOptionalIntEnv("FORCE_ATTACK_MIN_COMBATANTS"),
        combatantAdvantage: parseOptionalIntEnv("FORCE_ATTACK_COMBATANT_ADVANTAGE"),
        maxEnemyCombatants: parseOptionalIntEnv("FORCE_ATTACK_MAX_ENEMY_COMBATANTS"),
        orderIntervalTicks: parseOptionalIntEnv("FORCE_ATTACK_ORDER_INTERVAL"),
        directAttackKnownTargets: parseOptionalBoolEnv("FORCE_ATTACK_DIRECT"),
        maxTargets: parseOptionalIntEnv("FORCE_ATTACK_MAX_TARGETS"),
        hfoWestVsEastOnly: parseOptionalBoolEnv("FORCE_ATTACK_HFO_WEST_ONLY"),
    },
    emergencyDefense: {
        enabled: parseOptionalBoolEnv("EMERGENCY_DEFENSE_ENABLED"),
        radius: parseOptionalIntEnv("EMERGENCY_DEFENSE_RADIUS"),
        minCombatants: parseOptionalIntEnv("EMERGENCY_DEFENSE_MIN_COMBATANTS"),
        maxDefenders: parseOptionalIntEnv("EMERGENCY_DEFENSE_MAX_DEFENDERS"),
        orderIntervalTicks: parseOptionalIntEnv("EMERGENCY_DEFENSE_ORDER_INTERVAL"),
        directAttackKnownTargets: parseOptionalBoolEnv("EMERGENCY_DEFENSE_DIRECT"),
        mapSignatures: parseStringListEnv("EMERGENCY_DEFENSE_MAP_SIGNATURES"),
        hfoWestVsEastOnly: parseOptionalBoolEnv("EMERGENCY_DEFENSE_HFO_WEST_ONLY"),
        hfoBottomOnly: parseOptionalBoolEnv("EMERGENCY_DEFENSE_HFO_BOTTOM_ONLY"),
    },
    harvesterHarass: {
        enabled: parseOptionalBoolEnv("HARVESTER_HARASS_ENABLED"),
        minTick: parseOptionalIntEnv("HARVESTER_HARASS_MIN_TICK"),
        minHarvesters: parseOptionalIntEnv("HARVESTER_HARASS_MIN_HARVESTERS"),
        maxHarvesters: parseOptionalIntEnv("HARVESTER_HARASS_MAX_HARVESTERS"),
        orderIntervalTicks: parseOptionalIntEnv("HARVESTER_HARASS_ORDER_INTERVAL"),
        directAttackKnownTargets: parseOptionalBoolEnv("HARVESTER_HARASS_DIRECT"),
    },
    routeAttack: {
        enabled: parseOptionalBoolEnv("ROUTE_ATTACK_ENABLED"),
        minTick: parseOptionalIntEnv("ROUTE_ATTACK_MIN_TICK"),
        minCombatants: parseOptionalIntEnv("ROUTE_ATTACK_MIN_COMBATANTS"),
        orderIntervalTicks: parseOptionalIntEnv("ROUTE_ATTACK_ORDER_INTERVAL"),
        advanceIntervalTicks: parseOptionalIntEnv("ROUTE_ATTACK_ADVANCE_INTERVAL"),
        waypoints: parseWaypointListEnv("ROUTE_ATTACK_WAYPOINTS"),
        directAttackKnownTargets: parseOptionalBoolEnv("ROUTE_ATTACK_DIRECT"),
        hfoWestVsEastOnly: parseOptionalBoolEnv("ROUTE_ATTACK_HFO_WEST_ONLY"),
    },
    hfoCloseout: {
        enabled: parseOptionalBoolEnv("HFO_CLOSEOUT_ENABLED"),
        minTick: parseOptionalIntEnv("HFO_CLOSEOUT_MIN_TICK"),
        minUnits: parseOptionalIntEnv("HFO_CLOSEOUT_MIN_UNITS"),
        maxEnemyBuildings: parseOptionalIntEnv("HFO_CLOSEOUT_MAX_ENEMY_BUILDINGS"),
        maxEnemyCombatants: parseOptionalIntEnv("HFO_CLOSEOUT_MAX_ENEMY_COMBATANTS"),
        orderIntervalTicks: parseOptionalIntEnv("HFO_CLOSEOUT_ORDER_INTERVAL"),
        includeHarvesters: parseOptionalBoolEnv("HFO_CLOSEOUT_INCLUDE_HARVESTERS"),
    },
    hfoWestSweep: {
        enabled: parseOptionalBoolEnv("HFO_WEST_SWEEP_ENABLED"),
        minTick: parseOptionalIntEnv("HFO_WEST_SWEEP_MIN_TICK"),
        minCombatants: parseOptionalIntEnv("HFO_WEST_SWEEP_MIN_COMBATANTS"),
        combatantAdvantage: parseOptionalIntEnv("HFO_WEST_SWEEP_COMBATANT_ADVANTAGE"),
        maxEnemyCombatants: parseOptionalIntEnv("HFO_WEST_SWEEP_MAX_ENEMY_COMBATANTS"),
        orderIntervalTicks: parseOptionalIntEnv("HFO_WEST_SWEEP_ORDER_INTERVAL"),
        advanceIntervalTicks: parseOptionalIntEnv("HFO_WEST_SWEEP_ADVANCE_INTERVAL"),
        waypoints: parseWaypointListEnv("HFO_WEST_SWEEP_WAYPOINTS"),
        directAttackKnownTargets: parseOptionalBoolEnv("HFO_WEST_SWEEP_DIRECT"),
        maxTargets: parseOptionalIntEnv("HFO_WEST_SWEEP_MAX_TARGETS"),
    },
    hfoEastSweep: {
        enabled: parseOptionalBoolEnv("HFO_EAST_SWEEP_ENABLED"),
        minTick: parseOptionalIntEnv("HFO_EAST_SWEEP_MIN_TICK"),
        minCombatants: parseOptionalIntEnv("HFO_EAST_SWEEP_MIN_COMBATANTS"),
        combatantAdvantage: parseOptionalIntEnv("HFO_EAST_SWEEP_COMBATANT_ADVANTAGE"),
        maxEnemyCombatants: parseOptionalIntEnv("HFO_EAST_SWEEP_MAX_ENEMY_COMBATANTS"),
        orderIntervalTicks: parseOptionalIntEnv("HFO_EAST_SWEEP_ORDER_INTERVAL"),
        advanceIntervalTicks: parseOptionalIntEnv("HFO_EAST_SWEEP_ADVANCE_INTERVAL"),
        waypoints: parseWaypointListEnv("HFO_EAST_SWEEP_WAYPOINTS"),
        directAttackKnownTargets: parseOptionalBoolEnv("HFO_EAST_SWEEP_DIRECT"),
        maxTargets: parseOptionalIntEnv("HFO_EAST_SWEEP_MAX_TARGETS"),
    },
    hfoBottomSweep: {
        enabled: parseOptionalBoolEnv("HFO_BOTTOM_SWEEP_ENABLED"),
        minTick: parseOptionalIntEnv("HFO_BOTTOM_SWEEP_MIN_TICK"),
        minCombatants: parseOptionalIntEnv("HFO_BOTTOM_SWEEP_MIN_COMBATANTS"),
        combatantAdvantage: parseOptionalIntEnv("HFO_BOTTOM_SWEEP_COMBATANT_ADVANTAGE"),
        maxEnemyCombatants: parseOptionalIntEnv("HFO_BOTTOM_SWEEP_MAX_ENEMY_COMBATANTS"),
        orderIntervalTicks: parseOptionalIntEnv("HFO_BOTTOM_SWEEP_ORDER_INTERVAL"),
        advanceIntervalTicks: parseOptionalIntEnv("HFO_BOTTOM_SWEEP_ADVANCE_INTERVAL"),
        waypoints: parseWaypointListEnv("HFO_BOTTOM_SWEEP_WAYPOINTS"),
        directAttackKnownTargets: parseOptionalBoolEnv("HFO_BOTTOM_SWEEP_DIRECT"),
        maxTargets: parseOptionalIntEnv("HFO_BOTTOM_SWEEP_MAX_TARGETS"),
    },
    hfoBottomPincer: {
        enabled: parseOptionalBoolEnv("HFO_BOTTOM_PINCER_ENABLED"),
        minTick: parseOptionalIntEnv("HFO_BOTTOM_PINCER_MIN_TICK"),
        minCombatants: parseOptionalIntEnv("HFO_BOTTOM_PINCER_MIN_COMBATANTS"),
        combatantAdvantage: parseOptionalIntEnv("HFO_BOTTOM_PINCER_COMBATANT_ADVANTAGE"),
        maxEnemyCombatants: parseOptionalIntEnv("HFO_BOTTOM_PINCER_MAX_ENEMY_COMBATANTS"),
        maxEnemyBuildings: parseOptionalIntEnv("HFO_BOTTOM_PINCER_MAX_ENEMY_BUILDINGS"),
        orderIntervalTicks: parseOptionalIntEnv("HFO_BOTTOM_PINCER_ORDER_INTERVAL"),
        advanceIntervalTicks: parseOptionalIntEnv("HFO_BOTTOM_PINCER_ADVANCE_INTERVAL"),
        westWaypoints: parseWaypointListEnv("HFO_BOTTOM_PINCER_WEST_WAYPOINTS"),
        eastWaypoints: parseWaypointListEnv("HFO_BOTTOM_PINCER_EAST_WAYPOINTS"),
        directAttackKnownTargets: parseOptionalBoolEnv("HFO_BOTTOM_PINCER_DIRECT"),
        maxTargets: parseOptionalIntEnv("HFO_BOTTOM_PINCER_MAX_TARGETS"),
    },
    hfoBottomCloseout: {
        enabled: parseOptionalBoolEnv("HFO_BOTTOM_CLOSEOUT_ENABLED"),
        minTick: parseOptionalIntEnv("HFO_BOTTOM_CLOSEOUT_MIN_TICK"),
        minCombatants: parseOptionalIntEnv("HFO_BOTTOM_CLOSEOUT_MIN_COMBATANTS"),
        combatantAdvantage: parseOptionalIntEnv("HFO_BOTTOM_CLOSEOUT_COMBATANT_ADVANTAGE"),
        maxEnemyCombatants: parseOptionalIntEnv("HFO_BOTTOM_CLOSEOUT_MAX_ENEMY_COMBATANTS"),
        maxEnemyBuildings: parseOptionalIntEnv("HFO_BOTTOM_CLOSEOUT_MAX_ENEMY_BUILDINGS"),
        orderIntervalTicks: parseOptionalIntEnv("HFO_BOTTOM_CLOSEOUT_ORDER_INTERVAL"),
        directAttackKnownTargets: parseOptionalBoolEnv("HFO_BOTTOM_CLOSEOUT_DIRECT"),
        maxTargets: parseOptionalIntEnv("HFO_BOTTOM_CLOSEOUT_MAX_TARGETS"),
        includeHarvesters: parseOptionalBoolEnv("HFO_BOTTOM_CLOSEOUT_INCLUDE_HARVESTERS"),
    },
    hfoBottomDemolition: {
        enabled: parseOptionalBoolEnv("HFO_BOTTOM_DEMOLITION_ENABLED"),
        minTick: parseOptionalIntEnv("HFO_BOTTOM_DEMOLITION_MIN_TICK"),
        minUnits: parseOptionalIntEnv("HFO_BOTTOM_DEMOLITION_MIN_UNITS"),
        maxUnits: parseOptionalIntEnv("HFO_BOTTOM_DEMOLITION_MAX_UNITS"),
        minCombatants: parseOptionalIntEnv("HFO_BOTTOM_DEMOLITION_MIN_COMBATANTS"),
        combatantAdvantage: parseOptionalIntEnv("HFO_BOTTOM_DEMOLITION_COMBATANT_ADVANTAGE"),
        maxEnemyCombatants: parseOptionalIntEnv("HFO_BOTTOM_DEMOLITION_MAX_ENEMY_COMBATANTS"),
        maxEnemyBuildings: parseOptionalIntEnv("HFO_BOTTOM_DEMOLITION_MAX_ENEMY_BUILDINGS"),
        orderIntervalTicks: parseOptionalIntEnv("HFO_BOTTOM_DEMOLITION_ORDER_INTERVAL"),
        routeEnabled: parseOptionalBoolEnv("HFO_BOTTOM_DEMOLITION_ROUTE_ENABLED"),
        routeAdvanceIntervalTicks: parseOptionalIntEnv("HFO_BOTTOM_DEMOLITION_ROUTE_ADVANCE_INTERVAL"),
        directAttackKnownTargets: parseOptionalBoolEnv("HFO_BOTTOM_DEMOLITION_DIRECT"),
        maxTargets: parseOptionalIntEnv("HFO_BOTTOM_DEMOLITION_MAX_TARGETS"),
    },
    hfoBottomHomeGuard: {
        enabled: parseOptionalBoolEnv("HFO_BOTTOM_HOME_GUARD_ENABLED"),
        untilTick: parseOptionalIntEnv("HFO_BOTTOM_HOME_GUARD_UNTIL_TICK"),
        radius: parseOptionalIntEnv("HFO_BOTTOM_HOME_GUARD_RADIUS"),
        orderIntervalTicks: parseOptionalIntEnv("HFO_BOTTOM_HOME_GUARD_ORDER_INTERVAL"),
    },
});

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

const parseStringListEnv = (name: string): string[] | undefined => {
    const raw = process.env[name];
    if (!raw) {
        return undefined;
    }
    if (raw.trim().toLowerCase() === "all") {
        return [];
    }
    return raw
        .split(",")
        .map((value) => value.trim())
        .filter((value) => value.length > 0);
};

const parseWaypointListEnv = (name: string): StrongBotOptions["routeAttack"] extends { waypoints?: infer T } ? T | undefined : undefined => {
    const raw = process.env[name];
    if (!raw) {
        return undefined;
    }
    return raw.split(";").map((pair) => {
        const [xRaw, yRaw] = pair.split(",");
        const x = Number.parseInt(xRaw, 10);
        const y = Number.parseInt(yRaw, 10);
        if (!Number.isFinite(x) || !Number.isFinite(y)) {
            throw new Error(`${name} contains invalid waypoint ${pair}`);
        }
        return { x, y } as any;
    }) as any;
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

const parseMaps = (): string[] => {
    return (process.env.MAPS || "simple-1v1-no-preview.map")
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

const parseCandidateSlots = (): number[] => {
    const raw = process.env.CANDIDATE_SLOTS;
    if (!raw) {
        return [0, 1];
    }
    const slots = raw
        .split(",")
        .map((slot) => Number.parseInt(slot.trim(), 10))
        .filter((slot) => Number.isFinite(slot));
    const uniqueSlots = [...new Set(slots)];
    if (uniqueSlots.length === 0 || uniqueSlots.some((slot) => slot !== 0 && slot !== 1)) {
        throw new Error(`CANDIDATE_SLOTS must be 0, 1, or 0,1; got ${raw}`);
    }
    return uniqueSlots;
};

const getStartKey = (point: { x: number; y: number }): string => `${point.x},${point.y}`;

const isAllowedStart = (allowedStarts: string[] | undefined, point: { x: number; y: number }): boolean =>
    !allowedStarts || allowedStarts.includes(getStartKey(point));

const getWinner = (candidateDefeated: boolean, baselineDefeated: boolean): MatchResult["winner"] => {
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
        superWeapons: parseBoolEnv("SUPERWEAPONS", false),
        unitCount: 0,
        online: false,
        agents,
    };
};

const runMatch = async (
    match: number,
    mapName: string,
    candidateCountry: Countries,
    baselineCountry: Countries,
    candidateSlot: number,
    maxTicks: number,
    strongStrategyOptions: StrongStrategyOptions,
    strongBotOptions: StrongBotOptions,
    candidateStarts: string[] | undefined,
    baselineStarts: string[] | undefined,
    traceIntervalTicks: number,
): Promise<MatchResult | null> => {
    const candidateName = `Strong_${match}_${candidateSlot}`;
    const baselineName = `Supalosa_${match}_${candidateSlot}`;
    const candidate = new StrongBot(candidateName, candidateCountry, [], false, new StrongStrategy(strongStrategyOptions), strongBotOptions);
    const baseline = new InspectableSupalosaBot(baselineName, baselineCountry, [], false, new DefaultStrategy());
    const game = await cdapi.createGame(buildGameSettings(mapName, candidate, baseline, candidateSlot));

    let ticks = 0;
    await game.update();
    ticks++;
    const candidateStart = candidate.lastGameApi?.getPlayerData(candidateName).startLocation;
    const baselineStart = baseline.lastGameApi?.getPlayerData(baselineName).startLocation;
    if (!candidateStart || !baselineStart) {
        game.dispose();
        throw new Error(`Missing start locations for match ${match}`);
    }
    if (!isAllowedStart(candidateStarts, candidateStart) || !isAllowedStart(baselineStarts, baselineStart)) {
        game.dispose();
        return null;
    }

    while (!game.isFinished() && ticks < maxTicks) {
        await game.update();
        ticks++;
        if (traceIntervalTicks > 0 && ticks % traceIntervalTicks === 0) {
            emitTraceSnapshot({
                trace: true,
                match,
                tick: ticks,
                candidateStart: { x: candidateStart.x, y: candidateStart.y },
                baselineStart: { x: baselineStart.x, y: baselineStart.y },
                candidate: getPlayerSnapshot(candidate.lastGameApi, candidateName),
                baseline: getPlayerSnapshot(baseline.lastGameApi, baselineName),
            });
        }
    }

    const stats = game.getPlayerStats();
    const candidateStats = stats.find((stat) => stat.name === candidateName);
    const baselineStats = stats.find((stat) => stat.name === baselineName);
    if (!candidateStats || !baselineStats) {
        game.dispose();
        throw new Error(`Missing player stats for match ${match}`);
    }

    const candidateDefeated = candidateStats.defeated;
    const baselineDefeated = baselineStats.defeated;
    const result: MatchResult = {
        match,
        mapName,
        candidateCountry,
        baselineCountry,
        candidateSlot,
        candidateStart: {
            x: candidateStart.x,
            y: candidateStart.y,
        },
        baselineStart: {
            x: baselineStart.x,
            y: baselineStart.y,
        },
        ticks,
        finished: game.isFinished(),
        winner: getWinner(candidateDefeated, baselineDefeated),
        candidateDefeated,
        baselineDefeated,
        candidateCredits: candidateStats.credits,
        baselineCredits: baselineStats.credits,
        candidateUnits: countVisible(candidate.lastGameApi, candidateName, "units"),
        baselineUnits: countVisible(baseline.lastGameApi, baselineName, "units"),
        candidateBuildings: countVisible(candidate.lastGameApi, candidateName, "buildings"),
        baselineBuildings: countVisible(baseline.lastGameApi, baselineName, "buildings"),
        candidateCombatants: countVisible(candidate.lastGameApi, candidateName, "combatants"),
        baselineCombatants: countVisible(baseline.lastGameApi, baselineName, "combatants"),
    };
    game.dispose();
    return result;
};

const summarize = (results: MatchResult[], maps: string[], matchesPerPair: number, maxTicks: number): BenchmarkSummary => {
    const candidateWins = results.filter((result) => result.winner === "candidate").length;
    const baselineWins = results.filter((result) => result.winner === "baseline").length;
    const draws = results.filter((result) => result.winner === "draw").length;
    return {
        generatedAt: new Date().toISOString(),
        maps,
        matchesPerPair,
        maxTicks,
        results,
        candidateWins,
        baselineWins,
        draws,
        candidateWinRate: results.length > 0 ? candidateWins / results.length : 0,
    };
};

const main = async () => {
    const maps = parseMaps();
    const matchesPerPair = parseIntEnv("MATCHES_PER_PAIR", 2);
    const maxTicks = parseIntEnv("MAX_TICKS", 12000);
    const candidateCountries = parseCountries("CANDIDATE_COUNTRIES", [Countries.IRAQ, Countries.FRANCE]);
    const baselineCountries = parseCountries("BASELINE_COUNTRIES", [Countries.IRAQ, Countries.FRANCE]);
    const candidateStarts = parseStartFilters("CANDIDATE_STARTS");
    const baselineStarts = parseStartFilters("BASELINE_STARTS");
    const startFilterMaxAttempts = parseIntEnv("START_FILTER_MAX_ATTEMPTS", 40);
    const outDir = process.env.OUT_DIR || "benchmark-results";
    const traceIntervalTicks = parseIntEnv("TRACE_INTERVAL_TICKS", 0);
    const matchStartOffset = parseOptionalIntEnv("MATCH_START_OFFSET") ?? 0;
    const candidateSlots = parseCandidateSlots();
    const strongStrategyOptions = parseStrongStrategyOptions();
    const strongBotOptions = parseStrongBotOptions();

    await cdapi.init(process.env.MIX_DIR || "./data");

    const results: MatchResult[] = [];
    let match = matchStartOffset + 1;
    for (const mapName of maps) {
        for (const candidateCountry of candidateCountries) {
            for (const baselineCountry of baselineCountries) {
                for (let repeat = 0; repeat < matchesPerPair; repeat++) {
                    for (const candidateSlot of candidateSlots) {
                        let result: MatchResult | null = null;
                        for (let attempt = 0; attempt < startFilterMaxAttempts && !result; attempt++) {
                            result = await runMatch(
                                match++,
                                mapName,
                                candidateCountry,
                                baselineCountry,
                                candidateSlot,
                                maxTicks,
                                strongStrategyOptions,
                                strongBotOptions,
                                candidateStarts,
                                baselineStarts,
                                traceIntervalTicks,
                            );
                        }
                        if (!result) {
                            throw new Error(
                                `Unable to satisfy start filters candidate=${candidateStarts?.join(";") ?? "any"} ` +
                                    `baseline=${baselineStarts?.join(";") ?? "any"} after ` +
                                    `${startFilterMaxAttempts} attempts`,
                            );
                        }
                        results.push(result);
                        console.log(JSON.stringify(result));
                    }
                }
            }
        }
    }

    const summary = summarize(results, maps, matchesPerPair, maxTicks);
    fs.mkdirSync(outDir, { recursive: true });
    const outPath = path.join(outDir, `head-to-head-${Date.now()}.json`);
    fs.writeFileSync(outPath, JSON.stringify(summary, null, 2));
    console.log(`summary=${outPath}`);
    console.log(
        `candidate ${summary.candidateWins}-${summary.baselineWins}-${summary.draws} ` +
            `winRate=${(summary.candidateWinRate * 100).toFixed(1)}%`,
    );
};

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
