import { Strategy } from "./strategy.js";
import { AllInAttackMissionFactory, AllInAttackMissionFactoryOptions } from "../logic/mission/missions/allInAttackMission.js";
import { MacroBoostMissionFactory } from "../logic/mission/missions/macroBoostMission.js";
import { StaticDefenseBoostMissionFactory, StaticDefenseBoostOptions } from "../logic/mission/missions/staticDefenseBoostMission.js";
import { StrategicPlanMissionFactory, StrategicPlanOptions } from "../logic/mission/missions/strategicPlanMission.js";
import { NavalAssaultMissionFactory } from "../logic/mission/missions/navalAssaultMission.js";
import {
    BuildingEliminationMissionFactory,
    BuildingEliminationOptions,
    BuildingEliminationTelemetrySink,
} from "../logic/mission/missions/buildingEliminationMission.js";
import { SupabotContext } from "../logic/common/context.js";
import { MissionController } from "../logic/mission/missionController.js";
import { Countries, DebugLogger } from "../logic/common/utils.js";
import { DefaultStrategy, DefaultStrategyOptions } from "./defaultStrategy.js";

export type StrongStrategyOptions = {
    defaultMapProfiles?: boolean;
    hfoAlliedWestProfile?: boolean;
    preserveBaselineCore?: boolean;
    base?: DefaultStrategyOptions;
    allIn?: AllInAttackMissionFactoryOptions;
    macroBoost?: {
        enabled?: boolean;
    };
    staticDefenseBoost?: StaticDefenseBoostOptions;
    strategicPlan?: StrategicPlanOptions;
    buildingElimination?: BuildingEliminationOptions;
};

const DEFAULT_HFO_WEST_ALL_IN_OPTIONS: AllInAttackMissionFactoryOptions = {
    enabled: true,
    minTick: 9600,
    minCombatants: 9,
    combatantAdvantage: -10,
    disbandExistingAttacks: true,
    directVisibleAttack: true,
    hfoWestVsEastOnly: true,
};

const RIVER_RAMPAGE_STARTS = new Set(["98,125", "128,89"]);
const RIVER_RAMPAGE_LOWER_START = "98,125";
const YIN_YANG_STARTS = new Set(["41,102", "107,50"]);
const YIN_YANG_UPPER_START = "107,50";
const PEAK_OF_PERFECTION_STARTS = new Set(["37,73", "118,73"]);
const PEAK_OF_PERFECTION_WEAK_START = "37,73";
const OTMQ_STARTS = new Set(["48,123", "134,56"]);
const OTMQ_SOUTHWEST_START = "48,123";
const PINCH_POINT_STARTS = new Set(["51,97", "96,51"]);
const PINCH_POINT_UPPER_START = "96,51";
const DRY_HEAT_STARTS = new Set(["47,46", "86,85"]);
const DRY_HEAT_EAST_START = "86,85";
const SOUTH_PACIFIC_STARTS = new Set(["57,98", "152,96"]);
const TIKAL_STARTS = new Set(["50,119", "92,22"]);
const SIMPLE_1V1_STARTS = new Set(["37,63", "62,39"]);
const TIKAL_LOWER_START = "50,119";
const HFO_STARTS = new Set(["39,82", "88,34", "88,157", "151,119"]);
const HFO_WEST_START = "39,82";
const ALLIED_COUNTRIES = new Set<string>([
    Countries.USA,
    Countries.KOREA,
    Countries.FRANCE,
    Countries.GERMANY,
    Countries.GREAT_BRITAIN,
]);

const HFO_ALLIED_WEST_WINNER_PROFILE: StrongStrategyOptions = {
    base: { attackCompositionPolicy: "hfo" },
    strategicPlan: { enabled: true, plan: "rush" },
    hfoAlliedWestProfile: false,
};

const NAVAL_PROFILE: StrongStrategyOptions = {
    base: {
        attackCompositionPolicy: "naval",
        attackGate: {
            enabled: true,
            hfoOnly: false,
            minTick: 7200,
            minCombatants: 3,
            combatantAdvantage: -10,
            maxEnemyCombatants: 999,
        },
        attackMission: {
            allowDefenceSteal: false,
            targetPriority: "strategic",
        },
        scouting: {
            cooldownTicks: 210,
            maxConcurrentMissions: 2,
            missionPriority: 12,
        },
        defence: {
            checkTicks: 18,
            startingRadius: 34,
            radiusIncreasePerTick: 0.0003,
            defendProduction: true,
            missionPriority: 84,
            activePriority: 150,
        },
        engineer: {
            useKnownTechBuildings: true,
            techMaxTargets: 1,
            techMaxDistanceFromStart: 45,
            techPriority: 72,
            techEscortLevel: 1,
        },
    },
    strategicPlan: {
        enabled: true,
        plan: "islandTech",
        dogTargetCount: 1,
        hfoBottomDogTargetCount: 1,
        antiInfantryDogTargetCount: 1,
    },
    staticDefenseBoost: {
        enabled: true,
        hfoBottomOnly: false,
        startTick: 5400,
        targetCount: 3,
        priority: 72,
    },
    allIn: {
        enabled: false,
    },
    macroBoost: {
        enabled: false,
    },
};

const SIMPLE_INFANTRY_PROFILE: StrongStrategyOptions = {
    base: {
        attackCompositionPolicy: "infantry",
        attackGate: {
            enabled: false,
            minTick: 0,
            minCombatants: 10,
            hfoBottomMinCombatants: 45,
            combatantAdvantage: 0,
            maxEnemyCombatants: 999,
        },
        attackSuppression: {
            enabled: false,
            radius: 24,
        },
        attackMission: {
            allowDefenceSteal: false,
        },
        defence: {
            checkTicks: 30,
            startingRadius: 24,
            radiusIncreasePerTick: 0.0003,
            defendProduction: true,
            missionPriority: 60,
            activePriority: 120,
        },
        scouting: {
            cooldownTicks: 180,
            maxConcurrentMissions: 1,
            missionPriority: 10,
        },
        engineer: {
            useKnownTechBuildings: true,
            techMaxTargets: 1,
            techMaxDistanceFromStart: 30,
            techPriority: 96,
            techEscortLevel: 3,
        },
    },
    strategicPlan: {
        enabled: false,
        plan: "off",
        rushSellTick: 7200,
        rushSellMinCombatants: 12,
        dogTargetCount: 2,
        hfoBottomDogTargetCount: 3,
        antiInfantryDogTargetCount: 5,
    },
    staticDefenseBoost: {
        enabled: false,
        startTick: 1800,
        targetCount: 4,
        priority: 28,
    },
    allIn: {
        enabled: true,
        minTick: 12600,
        minCombatants: 8,
        combatantAdvantage: 4,
        disbandExistingAttacks: false,
        directVisibleAttack: true,
    },
    macroBoost: {
        enabled: false,
    },
};

const RIVER_RAMPAGE_LOWER_PROFILE: StrongStrategyOptions = {
    base: {
        attackCompositionPolicy: "assault",
        attackGate: {
            enabled: false,
            minTick: 0,
            minCombatants: 6,
            hfoBottomMinCombatants: 32,
            combatantAdvantage: 8,
            maxEnemyCombatants: 999,
        },
        attackSuppression: {
            enabled: false,
            radius: 24,
        },
        attackMission: {
            allowDefenceSteal: false,
        },
        defence: {
            checkTicks: 30,
            startingRadius: 24,
            radiusIncreasePerTick: 0.0002,
            defendProduction: true,
            missionPriority: 60,
            activePriority: 120,
        },
        scouting: {
            cooldownTicks: 180,
            maxConcurrentMissions: 2,
            missionPriority: 30,
        },
        engineer: {
            useKnownTechBuildings: true,
            techMaxTargets: 1,
            techMaxDistanceFromStart: 38,
            techPriority: 96,
            techEscortLevel: 2,
        },
    },
    strategicPlan: {
        enabled: false,
        plan: "off",
        rushSellTick: 6600,
        rushSellMinCombatants: 12,
        dogTargetCount: 2,
        hfoBottomDogTargetCount: 3,
        antiInfantryDogTargetCount: 5,
    },
    staticDefenseBoost: {
        enabled: true,
        hfoBottomOnly: false,
        startTick: 5400,
        targetCount: 4,
        priority: 36,
    },
    allIn: {
        enabled: false,
        minTick: 10800,
        minCombatants: 4,
        combatantAdvantage: -3,
        disbandExistingAttacks: false,
        directVisibleAttack: false,
    },
    macroBoost: {
        enabled: false,
    },
};

const YIN_YANG_UPPER_PROFILE: StrongStrategyOptions = {
    base: {
        attackCompositionPolicy: "hfo",
        attackGate: {
            enabled: false,
            minTick: 0,
            minCombatants: 0,
            hfoBottomMinCombatants: 32,
            combatantAdvantage: 0,
            maxEnemyCombatants: 4,
        },
        attackMission: {
            allowDefenceSteal: false,
        },
        defence: {
            checkTicks: 60,
            startingRadius: 20,
            radiusIncreasePerTick: 0.0003,
            defendProduction: true,
            missionPriority: 60,
            activePriority: 120,
        },
        scouting: {
            cooldownTicks: 180,
            maxConcurrentMissions: 2,
            missionPriority: 10,
        },
        engineer: {
            useKnownTechBuildings: true,
            techMaxTargets: 0,
            techMaxDistanceFromStart: 999,
            techPriority: 96,
            techEscortLevel: 2,
        },
    },
    strategicPlan: {
        enabled: true,
        plan: "hfoBottom",
        rushSellTick: 7200,
        rushSellMinCombatants: 8,
        dogTargetCount: 6,
        hfoBottomDogTargetCount: 3,
        antiInfantryDogTargetCount: 5,
    },
    staticDefenseBoost: {
        enabled: true,
        startTick: 3600,
        targetCount: 10,
        priority: 126,
    },
    allIn: {
        enabled: false,
        minTick: 12600,
        minCombatants: 8,
        combatantAdvantage: -3,
        disbandExistingAttacks: true,
        directVisibleAttack: false,
    },
    macroBoost: {
        enabled: true,
    },
};


const PEAK_OF_PERFECTION_WEAK_PROFILE: StrongStrategyOptions = {
    base: {
        attackCompositionPolicy: "infantry",
        attackGate: {
            enabled: false,
            minTick: 0,
            minCombatants: 0,
            hfoBottomMinCombatants: 45,
            combatantAdvantage: 0,
            maxEnemyCombatants: 999,
        },
        attackMission: {
            allowDefenceSteal: false,
        },
        defence: {
            checkTicks: 15,
            startingRadius: 24,
            radiusIncreasePerTick: 0.00045,
            defendProduction: false,
            missionPriority: 60,
            activePriority: 120,
        },
        scouting: {
            cooldownTicks: 180,
            maxConcurrentMissions: 3,
            missionPriority: 10,
        },
        engineer: {
            useKnownTechBuildings: false,
            techMaxTargets: 1,
            techMaxDistanceFromStart: 38,
            techPriority: 84,
            techEscortLevel: 2,
        },
    },
    strategicPlan: {
        enabled: false,
        plan: "off",
        rushSellTick: 7200,
        rushSellMinCombatants: 12,
        dogTargetCount: 2,
        hfoBottomDogTargetCount: 3,
        antiInfantryDogTargetCount: 5,
    },
    staticDefenseBoost: {
        enabled: false,
        startTick: 6600,
        targetCount: 5,
        priority: 28,
    },
    allIn: {
        enabled: false,
        minTick: 9000,
        minCombatants: 4,
        combatantAdvantage: -3,
        disbandExistingAttacks: false,
        directVisibleAttack: false,
    },
    macroBoost: {
        enabled: false,
    },
};



const TIKAL_LOWER_PROFILE: StrongStrategyOptions = {
    base: {
        attackCompositionPolicy: "tanks",
        attackGate: {
            enabled: true,
            hfoOnly: false,
            minTick: 9600,
            minCombatants: 6,
            combatantAdvantage: -4,
            maxEnemyCombatants: 999,
        },
        attackMission: {
            allowDefenceSteal: true,
        },
        defence: {
            checkTicks: 12,
            startingRadius: 44,
            radiusIncreasePerTick: 0.00025,
            defendProduction: true,
            missionPriority: 92,
            activePriority: 160,
        },
        scouting: {
            cooldownTicks: 999999,
            maxConcurrentMissions: 0,
            missionPriority: 4,
        },
    },
    strategicPlan: {
        enabled: true,
        plan: "rush",
        rushSellTick: 7200,
        rushSellMinCombatants: 12,
        dogTargetCount: 2,
        hfoBottomDogTargetCount: 3,
        antiInfantryDogTargetCount: 5,
    },
    staticDefenseBoost: {
        enabled: true,
        hfoBottomOnly: false,
        startTick: 3300,
        targetCount: 2,
        priority: 150,
        placementAnchors: [{ x: 56, y: 111 }, { x: 56, y: 116 }],
    },
    allIn: {
        enabled: true,
        minTick: 9000,
        minCombatants: 20,
        combatantAdvantage: 8,
        disbandExistingAttacks: true,
        directVisibleAttack: false,
    },
    macroBoost: {
        enabled: false,
    },
};

const SOUTH_PACIFIC_PROFILE: StrongStrategyOptions = {
    base: {
        attackCompositionPolicy: "tanks",
        attackGate: {
            enabled: true,
            hfoOnly: false,
            minTick: 30000,
            hfoBottomMinTick: 30000,
            minCombatants: 40,
            hfoBottomMinCombatants: 54,
            combatantAdvantage: 8,
            maxEnemyCombatants: 20,
        },
        attackMission: {
            allowDefenceSteal: false,
        },
        defence: {
            checkTicks: 12,
            startingRadius: 30,
            radiusIncreasePerTick: 0.0002,
            defendProduction: true,
            missionPriority: 90,
            activePriority: 150,
        },
        scouting: {
            cooldownTicks: 240,
            maxConcurrentMissions: 1,
            missionPriority: 8,
        },
        engineer: {
            useKnownTechBuildings: false,
            techMaxTargets: 0,
            techMaxDistanceFromStart: 38,
            techPriority: 84,
            techEscortLevel: 2,
        },
    },
    strategicPlan: {
        enabled: true,
        plan: "hfoBottom",
        rushSellTick: 72000,
        rushSellMinCombatants: 0,
        dogTargetCount: 3,
        hfoBottomDogTargetCount: 3,
        antiInfantryDogTargetCount: 5,
    },
    staticDefenseBoost: {
        enabled: true,
        hfoBottomOnly: false,
        startTick: 4200,
        targetCount: 4,
        priority: 120,
    },
    allIn: {
        enabled: false,
        minTick: 14400,
        minCombatants: 6,
        combatantAdvantage: -3,
        disbandExistingAttacks: false,
        directVisibleAttack: false,
    },
    macroBoost: {
        enabled: false,
    },
};

const PINCH_POINT_UPPER_PROFILE: StrongStrategyOptions = {
    base: {
        expansion: {
            packConyard: false,
        },
        attackCompositionPolicy: "tanks",
        attackGate: {
            enabled: true,
            hfoOnly: false,
            minTick: 24000,
            hfoBottomMinTick: 24000,
            minCombatants: 24,
            hfoBottomMinCombatants: 50,
            combatantAdvantage: 6,
            maxEnemyCombatants: 24,
        },
        attackMission: {
            allowDefenceSteal: false,
        },
        defence: {
            checkTicks: 12,
            startingRadius: 42,
            radiusIncreasePerTick: 0.0004,
            defendProduction: true,
            missionPriority: 90,
            activePriority: 160,
        },
        scouting: {
            cooldownTicks: 240,
            maxConcurrentMissions: 1,
            missionPriority: 8,
        },
        engineer: {
            useKnownTechBuildings: true,
            techMaxTargets: 1,
            techMaxDistanceFromStart: 38,
            techPriority: 84,
            techEscortLevel: 2,
        },
    },
    strategicPlan: {
        enabled: true,
        plan: "pinchFortressBreak",
        rushSellTick: 42000,
        rushSellMinCombatants: 4,
        dogTargetCount: 2,
        hfoBottomDogTargetCount: 3,
        antiInfantryDogTargetCount: 3,
    },
    staticDefenseBoost: {
        enabled: true,
        hfoBottomOnly: false,
        startTick: 3000,
        targetCount: 4,
        priority: 160,
        placementAnchors: [
            { x: 94, y: 55 },
            { x: 97, y: 55 },
            { x: 93, y: 58 },
            { x: 100, y: 58 },
        ],
    },
    allIn: {
        enabled: false,
        minTick: 14400,
        minCombatants: 6,
        combatantAdvantage: -3,
        disbandExistingAttacks: false,
        directVisibleAttack: false,
    },
    macroBoost: {
        enabled: false,
    },
};

const DRY_HEAT_EAST_ALLIED_PROFILE: StrongStrategyOptions = {
    base: {
        expansion: {
            packConyard: false,
        },
        attackCompositionPolicy: "tanks",
        attackGate: {
            enabled: true,
            hfoOnly: false,
            minTick: 18000,
            minCombatants: 24,
            hfoBottomMinCombatants: 50,
            combatantAdvantage: 6,
            maxEnemyCombatants: 18,
        },
        attackMission: {
            allowDefenceSteal: false,
        },
        defence: {
            checkTicks: 15,
            startingRadius: 30,
            radiusIncreasePerTick: 0.00035,
            defendProduction: true,
            missionPriority: 84,
            activePriority: 150,
        },
        scouting: {
            cooldownTicks: 240,
            maxConcurrentMissions: 1,
            missionPriority: 8,
        },
        engineer: {
            useKnownTechBuildings: true,
            techMaxTargets: 1,
            techMaxDistanceFromStart: 38,
            techPriority: 84,
            techEscortLevel: 2,
        },
    },
    strategicPlan: {
        enabled: true,
        plan: "hfoBottom",
        rushSellTick: 42000,
        rushSellMinCombatants: 4,
        dogTargetCount: 1,
        hfoBottomDogTargetCount: 3,
        antiInfantryDogTargetCount: 5,
    },
    staticDefenseBoost: {
        enabled: true,
        hfoBottomOnly: false,
        startTick: 1200,
        targetCount: 8,
        priority: 260,
        placementAnchors: [
            { x: 82, y: 80 },
            { x: 84, y: 80 },
            { x: 86, y: 81 },
            { x: 80, y: 82 },
            { x: 88, y: 82 },
            { x: 82, y: 84 },
            { x: 86, y: 84 },
            { x: 78, y: 84 },
        ],
    },
    allIn: {
        enabled: false,
        minTick: 10800,
        minCombatants: 4,
        combatantAdvantage: -3,
        disbandExistingAttacks: false,
        directVisibleAttack: false,
    },
    macroBoost: {
        enabled: false,
    },
};

const OTMQ_SOUTHWEST_PROFILE: StrongStrategyOptions = {
    base: {
        attackCompositionPolicy: "assault",
        attackGate: {
            enabled: true,
            hfoOnly: false,
            minTick: 39000,
            minCombatants: 50,
            hfoBottomMinCombatants: 60,
            combatantAdvantage: 12,
            maxEnemyCombatants: 18,
        },
        attackMission: {
            allowDefenceSteal: true,
        },
        defence: {
            checkTicks: 30,
            startingRadius: 24,
            radiusIncreasePerTick: 0.0003,
            defendProduction: true,
            missionPriority: 60,
            activePriority: 80,
        },
        scouting: {
            cooldownTicks: 240,
            maxConcurrentMissions: 1,
            missionPriority: 6,
        },
        engineer: {
            useKnownTechBuildings: false,
            techMaxTargets: 1,
            techMaxDistanceFromStart: 60,
            techPriority: 96,
            techEscortLevel: 2,
        },
    },
    strategicPlan: {
        enabled: true,
        plan: "otmqTankSiege",
        rushSellTick: 72000,
        rushSellMinCombatants: 0,
        dogTargetCount: 6,
        hfoBottomDogTargetCount: 3,
        antiInfantryDogTargetCount: 5,
    },
    staticDefenseBoost: {
        enabled: true,
        hfoBottomOnly: false,
        startTick: 4200,
        targetCount: 3,
        priority: 104,
    },
    allIn: {
        enabled: false,
        minTick: 14400,
        minCombatants: 6,
        combatantAdvantage: -3,
        disbandExistingAttacks: false,
        directVisibleAttack: false,
    },
    macroBoost: {
        enabled: false,
    },
};

const hasDefinedOption = (options: object | undefined): boolean =>
    !!options && Object.values(options).some((value) => value !== undefined);

const hasExplicitProfileOptions = (options: StrongStrategyOptions): boolean =>
    options.preserveBaselineCore !== undefined ||
    options.strategicPlan?.plan !== undefined ||
    options.base?.attackCompositionPolicy !== undefined ||
    options.base?.attackGate?.enabled !== undefined ||
    options.staticDefenseBoost?.enabled !== undefined ||
    options.allIn?.enabled !== undefined ||
    options.buildingElimination?.enabled !== undefined;

/**
 * A deterministic ladder-oriented strategy tuned to beat the stock Supalosa bot.
 *
 * This keeps Supalosa's proven opening/midgame and adds a late hunter mission
 * that uses full game-state knowledge to close games the stock bot tends to draw.
 */
export class StrongStrategy implements Strategy {
    private baseStrategy: Strategy;
    private macroBoostFactory = new MacroBoostMissionFactory();
    private staticDefenseBoostFactory: StaticDefenseBoostMissionFactory;
    private strategicPlanFactory: StrategicPlanMissionFactory;
    private allInAttackFactory: AllInAttackMissionFactory;
    private buildingEliminationFactory: BuildingEliminationMissionFactory;
    private navalAssaultFactory = new NavalAssaultMissionFactory();

    constructor(
        private options: StrongStrategyOptions = {},
        private buildingEliminationTelemetrySink: BuildingEliminationTelemetrySink = () => undefined,
    ) {
        const strategicPlan = options.strategicPlan ?? { enabled: true, plan: "hfo" as const };
        const isIslandTechPlan = strategicPlan.plan === "islandTech";
        const baseDefence = options.base?.defence ?? {};
        const baseEngineer = options.base?.engineer ?? {};
        const baseScouting = options.base?.scouting ?? {};
        const baseAttackGate = options.base?.attackGate ?? {};
        const baseAttackSuppression = options.base?.attackSuppression ?? {};
        this.baseStrategy = options.preserveBaselineCore ? new DefaultStrategy() : new DefaultStrategy({
            ...options.base,
            expansion: {
                ...options.base?.expansion,
                packConyard: options.base?.expansion?.packConyard ?? !isIslandTechPlan,
            },
            scouting: {
                ...baseScouting,
                cooldownTicks: baseScouting.cooldownTicks ?? 90,
                maxConcurrentMissions: baseScouting.maxConcurrentMissions ?? 3,
                missionPriority: baseScouting.missionPriority ?? 18,
            },
            attackCompositionPolicy: options.base?.attackCompositionPolicy ?? "hfo",
            attackGate: {
                ...baseAttackGate,
                enabled: baseAttackGate.enabled ?? true,
                hfoOnly: baseAttackGate.hfoOnly ?? true,
                minTick: baseAttackGate.minTick ?? 7200,
                hfoBottomMinTick: baseAttackGate.hfoBottomMinTick ?? 21000,
                minCombatants: baseAttackGate.minCombatants ?? 10,
                hfoBottomMinCombatants: baseAttackGate.hfoBottomMinCombatants ?? 48,
                combatantAdvantage: baseAttackGate.combatantAdvantage ?? 0,
                maxEnemyCombatants: baseAttackGate.maxEnemyCombatants ?? 999,
            },
            attackSuppression: {
                ...baseAttackSuppression,
                enabled: baseAttackSuppression.enabled ?? false,
                radius: baseAttackSuppression.radius ?? 36,
                hfoBottomOnly: baseAttackSuppression.hfoBottomOnly ?? true,
            },
            defence: {
                ...baseDefence,
                checkTicks: baseDefence.checkTicks ?? 18,
                startingRadius: baseDefence.startingRadius ?? 36,
                radiusIncreasePerTick: baseDefence.radiusIncreasePerTick ?? 0.00045,
                defendProduction: baseDefence.defendProduction ?? true,
                missionPriority: baseDefence.missionPriority ?? 84,
                activePriority: baseDefence.activePriority ?? 150,
            },
            engineer: {
                ...baseEngineer,
                useKnownTechBuildings: baseEngineer.useKnownTechBuildings ?? true,
                techMaxTargets: baseEngineer.techMaxTargets ?? 1,
                techMaxDistanceFromStart: baseEngineer.techMaxDistanceFromStart ?? 38,
                techPriority: baseEngineer.techPriority ?? 96,
                techEscortLevel: baseEngineer.techEscortLevel ?? 2,
            },
        });
        const staticDefenseBoost = options.staticDefenseBoost ?? {};
        this.staticDefenseBoostFactory = new StaticDefenseBoostMissionFactory({
            ...staticDefenseBoost,
            enabled: staticDefenseBoost.enabled ?? false,
            hfoBottomOnly: staticDefenseBoost.hfoBottomOnly ?? true,
            startTick: staticDefenseBoost.startTick ?? 6600,
            targetCount: staticDefenseBoost.targetCount ?? 1,
            priority: staticDefenseBoost.priority ?? 132,
        });
        this.strategicPlanFactory = new StrategicPlanMissionFactory(strategicPlan);
        this.allInAttackFactory = new AllInAttackMissionFactory(
            hasDefinedOption(options.allIn) ? options.allIn : DEFAULT_HFO_WEST_ALL_IN_OPTIONS,
        );
        this.buildingEliminationFactory = new BuildingEliminationMissionFactory(
            options.buildingElimination,
            this.buildingEliminationTelemetrySink,
        );
    }

    onAiUpdate(context: SupabotContext, missionController: MissionController, logger: DebugLogger): Strategy {
        if ((this.options.defaultMapProfiles ?? true) &&
            (this.options.hfoAlliedWestProfile ?? true) &&
            this.isHfoAlliedWestStart(context)) {
            logger("Strong strategy profile: hfoAlliedWestWinner");
            return new StrongStrategy(
                HFO_ALLIED_WEST_WINNER_PROFILE,
                this.buildingEliminationTelemetrySink,
            ).onAiUpdate(context, missionController, logger);
        }
        if ((this.options.defaultMapProfiles ?? true) && !hasExplicitProfileOptions(this.options)) {
            if (this.isSimple1v1Map(context)) {
                logger("Strong strategy profile: simpleInfantry");
                return new StrongStrategy(SIMPLE_INFANTRY_PROFILE, this.buildingEliminationTelemetrySink).onAiUpdate(
                    context,
                    missionController,
                    logger,
                );
            }
            if (context.matchAwareness.isNavalMap()) {
                logger("Strong strategy profile: naval");
                return new StrongStrategy(NAVAL_PROFILE, this.buildingEliminationTelemetrySink).onAiUpdate(
                    context,
                    missionController,
                    logger,
                );
            }
            if (this.isRiverRampageLowerStart(context)) {
                logger("Strong strategy profile: riverRampageLower");
                return new StrongStrategy(
                    RIVER_RAMPAGE_LOWER_PROFILE,
                    this.buildingEliminationTelemetrySink,
                ).onAiUpdate(context, missionController, logger);
            }
            if (this.isYinYangUpperStart(context)) {
                logger("Strong strategy profile: yinYangUpper");
                return new StrongStrategy(YIN_YANG_UPPER_PROFILE, this.buildingEliminationTelemetrySink).onAiUpdate(
                    context,
                    missionController,
                    logger,
                );
            }
            if (this.isPeakOfPerfectionWeakStart(context)) {
                logger("Strong strategy profile: peakOfPerfectionWeak");
                return new StrongStrategy(
                    PEAK_OF_PERFECTION_WEAK_PROFILE,
                    this.buildingEliminationTelemetrySink,
                ).onAiUpdate(context, missionController, logger);
            }
            if (this.isOtmqSouthwestStart(context)) {
                logger("Strong strategy profile: otmqSouthwest");
                return new StrongStrategy(OTMQ_SOUTHWEST_PROFILE, this.buildingEliminationTelemetrySink).onAiUpdate(
                    context,
                    missionController,
                    logger,
                );
            }
            if (this.isPinchPointUpperStart(context)) {
                logger("Strong strategy profile: pinchPointUpper");
                return new StrongStrategy(PINCH_POINT_UPPER_PROFILE, this.buildingEliminationTelemetrySink).onAiUpdate(
                    context,
                    missionController,
                    logger,
                );
            }
            if (this.isTikalLowerStart(context)) {
                logger("Strong strategy profile: tikalLowerRush");
                return new StrongStrategy(TIKAL_LOWER_PROFILE, this.buildingEliminationTelemetrySink).onAiUpdate(
                    context,
                    missionController,
                    logger,
                );
            }
            if (this.isSouthPacificMap(context)) {
                logger("Strong strategy profile: southPacificHfoBottom");
                return new StrongStrategy(SOUTH_PACIFIC_PROFILE, this.buildingEliminationTelemetrySink).onAiUpdate(
                    context,
                    missionController,
                    logger,
                );
            }
            if (this.isDryHeatEastVsAlliedStart(context)) {
                logger("Strong strategy profile: dryHeatEastAllied");
                return new StrongStrategy(
                    DRY_HEAT_EAST_ALLIED_PROFILE,
                    this.buildingEliminationTelemetrySink,
                ).onAiUpdate(context, missionController, logger);
            }
        }
        if (!this.options.preserveBaselineCore) {
            if (this.options.macroBoost?.enabled) {
                this.macroBoostFactory.maybeCreateMissions(context, missionController, logger);
            }
            this.staticDefenseBoostFactory.maybeCreateMissions(context, missionController, logger);
            this.strategicPlanFactory.maybeCreateMissions(context, missionController, logger);
            this.navalAssaultFactory.maybeCreateMissions(context, missionController, logger);
        }
        this.baseStrategy = this.baseStrategy.onAiUpdate(context, missionController, logger);
        if (!this.options.preserveBaselineCore) {
            this.allInAttackFactory.maybeCreateMissions(context, missionController, logger);
        }
        this.buildingEliminationFactory.maybeCreateMissions(context, missionController, logger);
        return this;
    }

    private isHfoAlliedWestStart(context: SupabotContext): boolean {
        const countryName = (context.game.getPlayerData(context.player.name).country as { name?: string } | undefined)?.name;
        return countryName !== undefined && ALLIED_COUNTRIES.has(countryName) &&
            this.isKnownStartProfile(context, HFO_STARTS, HFO_WEST_START);
    }

    private isRiverRampageLowerStart(context: SupabotContext): boolean {
        return this.isKnownStartProfile(context, RIVER_RAMPAGE_STARTS, RIVER_RAMPAGE_LOWER_START);
    }

    private isYinYangUpperStart(context: SupabotContext): boolean {
        return this.isKnownStartProfile(context, YIN_YANG_STARTS, YIN_YANG_UPPER_START);
    }

    private isSimple1v1Map(context: SupabotContext): boolean {
        const playerData = context.game.getPlayerData(context.player.name);
        const countryName = (playerData.country as { name?: string } | undefined)?.name;
        return countryName === Countries.IRAQ && this.isKnownMapProfile(context, SIMPLE_1V1_STARTS);
    }

    private isPeakOfPerfectionWeakStart(context: SupabotContext): boolean {
        return this.isKnownStartProfile(context, PEAK_OF_PERFECTION_STARTS, PEAK_OF_PERFECTION_WEAK_START);
    }

    private isOtmqSouthwestStart(context: SupabotContext): boolean {
        return this.isKnownStartProfile(context, OTMQ_STARTS, OTMQ_SOUTHWEST_START);
    }

    private isPinchPointUpperStart(context: SupabotContext): boolean {
        return this.isKnownStartProfile(context, PINCH_POINT_STARTS, PINCH_POINT_UPPER_START);
    }

    private isSouthPacificMap(context: SupabotContext): boolean {
        return this.isKnownMapProfile(context, SOUTH_PACIFIC_STARTS);
    }

    private isTikalLowerStart(context: SupabotContext): boolean {
        return this.isKnownStartProfile(context, TIKAL_STARTS, TIKAL_LOWER_START);
    }

    private isDryHeatEastVsAlliedStart(context: SupabotContext): boolean {
        return this.isKnownStartProfile(context, DRY_HEAT_STARTS, DRY_HEAT_EAST_START) &&
            this.isPrimaryEnemyAlliedCountry(context);
    }

    private isPrimaryEnemyAlliedCountry(context: SupabotContext): boolean {
        const playerData = context.game.getPlayerData(context.player.name);
        const enemyPlayer = context.game
            .getPlayers()
            .map((name) => context.game.getPlayerData(name))
            .find(
                (otherPlayer) =>
                    otherPlayer.name !== playerData.name &&
                    !context.game.areAlliedPlayers(playerData.name, otherPlayer.name) &&
                    otherPlayer.isCombatant,
            );
        const countryName = (enemyPlayer?.country as { name?: string } | undefined)?.name;
        return countryName !== undefined && ALLIED_COUNTRIES.has(countryName);
    }

    private isKnownStartProfile(context: SupabotContext, expectedStarts: Set<string>, expectedOwnStart: string): boolean {
        const starts = context.game.mapApi
            .getStartingLocations()
            .map((start) => `${start.x},${start.y}`)
            .sort();
        if (starts.length !== expectedStarts.size || !starts.every((start) => expectedStarts.has(start))) {
            return false;
        }
        const ownStart = context.game.getPlayerData(context.player.name).startLocation;
        return `${ownStart.x},${ownStart.y}` === expectedOwnStart;
    }

    private isKnownMapProfile(context: SupabotContext, expectedStarts: Set<string>): boolean {
        const starts = context.game.mapApi
            .getStartingLocations()
            .map((start) => `${start.x},${start.y}`)
            .sort();
        return starts.length === expectedStarts.size && starts.every((start) => expectedStarts.has(start));
    }
}
