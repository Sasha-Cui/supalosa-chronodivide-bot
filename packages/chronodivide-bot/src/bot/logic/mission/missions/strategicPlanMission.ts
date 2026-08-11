import { ObjectType, QueueType, SideType, TechnoRules } from "@chronodivide/game-api";
import { BUILDING_NAME_TO_RULES, getDefaultPlacementLocation } from "../../building/buildingRules.js";
import { DebugLogger } from "../../common/utils.js";
import { buildStructureAtLocation, disbandMission, Mission, MissionAction, noop, requestUnits } from "../mission.js";
import { MissionController } from "../missionController.js";
import { MissionContext, SupabotContext } from "../../common/context.js";

export type StrategicPlanName =
    | "off"
    | "macro"
    | "macroSiege"
    | "macroLateSiege"
    | "ecoBoom"
    | "hfoBottom"
    | "hfoWestRush"
    | "rush"
    | "tankBoom"
    | "otmqAntiInfantry"
    | "otmqTankSiege"
    | "pinchFortressBreak"
    | "tech"
    | "siege"
    | "westSiege"
    | "islandTech"
    | "adaptive"
    | "hfo";

type ConcreteStrategicPlanName = Exclude<StrategicPlanName, "off" | "adaptive" | "hfo">;

export type StructurePlanItem = {
    name: string;
    targetCount: number;
    priority: number;
    startTick?: number;
    requireCredits?: number;
};

export type UnitPlanItem = {
    name: string;
    targetCount: number;
    priority: number;
    startTick?: number;
};

type SellYardPlan = {
    enabled: boolean;
    tick: number;
    minCombatants: number;
    maxFactories?: number;
};

type ConcreteStrategicPlan = {
    name: ConcreteStrategicPlanName;
    structures: Record<SideType.Nod | SideType.GDI, StructurePlanItem[]>;
    units: Record<SideType.Nod | SideType.GDI, UnitPlanItem[]>;
    sellYard?: SellYardPlan;
};

export type StrategicPlanOptions = {
    enabled?: boolean;
    plan?: StrategicPlanName;
    rushSellTick?: number;
    rushSellMinCombatants?: number;
    rushSellEnabled?: boolean;
    finisherArtilleryTargetCount?: number;
    finisherArtilleryStartTick?: number;
    finisherArtilleryPriority?: number;
    finisherArtilleryTechLeadTicks?: number;
    finisherArtilleryTechPriority?: number;
    dogTargetCount?: number;
    hfoBottomDogTargetCount?: number;
    antiInfantryDogTargetCount?: number;
};

export type StrategicFinisherOptions = {
    rushSellEnabled: boolean;
    artilleryTargetCount: number;
    artilleryStartTick: number;
    artilleryPriority: number;
    artilleryTechLeadTicks: number;
    artilleryTechPriority: number;
};

const requireFinisherInteger = (name: string, value: number, minimum: number, maximum: number): void => {
    if (!Number.isInteger(value) || value < minimum || value > maximum) {
        throw new Error(`${name} must be an integer in [${minimum}, ${maximum}], got ${value}`);
    }
};

export const resolveStrategicFinisherOptions = (options: StrategicPlanOptions = {}): StrategicFinisherOptions => {
    const resolved: StrategicFinisherOptions = {
        rushSellEnabled: options.rushSellEnabled ?? true,
        artilleryTargetCount: options.finisherArtilleryTargetCount ?? 0,
        artilleryStartTick: options.finisherArtilleryStartTick ?? 12_600,
        artilleryPriority: options.finisherArtilleryPriority ?? 120,
        artilleryTechLeadTicks: options.finisherArtilleryTechLeadTicks ?? 3_600,
        artilleryTechPriority: options.finisherArtilleryTechPriority ?? 112,
    };
    requireFinisherInteger("finisherArtilleryTargetCount", resolved.artilleryTargetCount, 0, 100);
    requireFinisherInteger("finisherArtilleryStartTick", resolved.artilleryStartTick, 0, 100_000);
    requireFinisherInteger("finisherArtilleryPriority", resolved.artilleryPriority, 1, 1_000);
    requireFinisherInteger("finisherArtilleryTechLeadTicks", resolved.artilleryTechLeadTicks, 0, 100_000);
    requireFinisherInteger("finisherArtilleryTechPriority", resolved.artilleryTechPriority, 1, 1_000);
    return resolved;
};

export const getFinisherArtilleryPlanItem = (
    side: SideType.Nod | SideType.GDI,
    options: StrategicFinisherOptions,
): UnitPlanItem | null =>
    options.artilleryTargetCount > 0
        ? {
              name: side === SideType.Nod ? "V3" : "SREF",
              targetCount: options.artilleryTargetCount,
              priority: options.artilleryPriority,
              startTick: options.artilleryStartTick,
          }
        : null;

export const getFinisherArtilleryStructurePlanItems = (
    side: SideType.Nod | SideType.GDI,
    options: StrategicFinisherOptions,
): StructurePlanItem[] => {
    if (options.artilleryTargetCount <= 0) {
        return [];
    }
    const startTick = Math.max(0, options.artilleryStartTick - options.artilleryTechLeadTicks);
    if (side === SideType.Nod) {
        return [
            {
                name: "NARADR",
                targetCount: 1,
                priority: options.artilleryTechPriority,
                startTick,
                requireCredits: 800,
            },
        ];
    }
    return [
        {
            name: "GAAIRC",
            targetCount: 1,
            priority: options.artilleryTechPriority,
            startTick,
            requireCredits: 800,
        },
        {
            name: "GATECH",
            targetCount: 1,
            priority: options.artilleryTechPriority,
            startTick,
            requireCredits: 1_800,
        },
    ];
};

const STRATEGIC_BUILD_MISSION_NAME = "strategicPlanBuild";
const STRATEGIC_UNIT_MISSION_NAME = "strategicPlanUnits";
const STRATEGIC_SELL_MISSION_NAME = "strategicPlanSell";

const sovietMacroStructures: StructurePlanItem[] = [
    { name: "NAPOWR", targetCount: 8, priority: 38 },
    { name: "NAREFN", targetCount: 5, priority: 58 },
    { name: "NAHAND", targetCount: 1, priority: 24 },
    { name: "NAWEAP", targetCount: 6, priority: 76 },
    { name: "NARADR", targetCount: 1, priority: 18, requireCredits: 1500 },
];

const alliedMacroStructures: StructurePlanItem[] = [
    { name: "GAPOWR", targetCount: 8, priority: 38 },
    { name: "GAREFN", targetCount: 5, priority: 58 },
    { name: "GAPILE", targetCount: 1, priority: 24 },
    { name: "GAWEAP", targetCount: 6, priority: 76 },
    { name: "GAAIRC", targetCount: 1, priority: 18, requireCredits: 1500 },
];

const sovietMacroSiegeStructures: StructurePlanItem[] = [
    { name: "NAPOWR", targetCount: 8, priority: 38 },
    { name: "NAREFN", targetCount: 5, priority: 58 },
    { name: "NAHAND", targetCount: 1, priority: 24 },
    { name: "NAWEAP", targetCount: 6, priority: 76 },
    { name: "NARADR", targetCount: 1, priority: 82, startTick: 7200, requireCredits: 800 },
];

const alliedMacroSiegeStructures: StructurePlanItem[] = [
    { name: "GAPOWR", targetCount: 8, priority: 38 },
    { name: "GAREFN", targetCount: 5, priority: 58 },
    { name: "GAPILE", targetCount: 1, priority: 24 },
    { name: "GAWEAP", targetCount: 6, priority: 76 },
    { name: "GAAIRC", targetCount: 1, priority: 82, startTick: 7200, requireCredits: 800 },
];

const sovietMacroLateSiegeStructures: StructurePlanItem[] = [
    { name: "NAPOWR", targetCount: 8, priority: 38 },
    { name: "NAREFN", targetCount: 5, priority: 58 },
    { name: "NAHAND", targetCount: 1, priority: 24 },
    { name: "NAWEAP", targetCount: 6, priority: 76 },
    { name: "NARADR", targetCount: 1, priority: 90, startTick: 15000, requireCredits: 1200 },
];

const alliedMacroLateSiegeStructures: StructurePlanItem[] = [
    { name: "GAPOWR", targetCount: 8, priority: 38 },
    { name: "GAREFN", targetCount: 5, priority: 58 },
    { name: "GAPILE", targetCount: 1, priority: 24 },
    { name: "GAWEAP", targetCount: 6, priority: 76 },
    { name: "GAAIRC", targetCount: 1, priority: 90, startTick: 15000, requireCredits: 1200 },
];

const sovietEcoBoomStructures: StructurePlanItem[] = [
    { name: "NAPOWR", targetCount: 1, priority: 92 },
    { name: "NAREFN", targetCount: 1, priority: 138 },
    { name: "NAHAND", targetCount: 1, priority: 70 },
    { name: "NAWEAP", targetCount: 1, priority: 144 },
    { name: "NAPOWR", targetCount: 2, priority: 86 },
    { name: "NAWEAP", targetCount: 2, priority: 140, startTick: 3600 },
    { name: "NAREFN", targetCount: 2, priority: 116, startTick: 4800 },
    { name: "NAPOWR", targetCount: 4, priority: 86, startTick: 6000 },
    { name: "NAWEAP", targetCount: 3, priority: 128, startTick: 7200 },
    { name: "NAREFN", targetCount: 3, priority: 94, startTick: 9000 },
    { name: "NAWEAP", targetCount: 4, priority: 112, startTick: 13200, requireCredits: 700 },
    { name: "NAPOWR", targetCount: 7, priority: 58, startTick: 15000 },
    { name: "NAREFN", targetCount: 4, priority: 72, startTick: 15000 },
    { name: "NARADR", targetCount: 1, priority: 54, startTick: 15000, requireCredits: 1200 },
    { name: "NAWEAP", targetCount: 5, priority: 94, startTick: 19200, requireCredits: 1000 },
    { name: "NAREFN", targetCount: 5, priority: 56, startTick: 21000, requireCredits: 1500 },
];

const alliedEcoBoomStructures: StructurePlanItem[] = [
    { name: "GAPOWR", targetCount: 1, priority: 92 },
    { name: "GAREFN", targetCount: 1, priority: 138 },
    { name: "GAPILE", targetCount: 1, priority: 70 },
    { name: "GAWEAP", targetCount: 1, priority: 144 },
    { name: "GAPOWR", targetCount: 2, priority: 86 },
    { name: "GAWEAP", targetCount: 2, priority: 140, startTick: 3600 },
    { name: "GAREFN", targetCount: 2, priority: 116, startTick: 4800 },
    { name: "GAPOWR", targetCount: 4, priority: 86, startTick: 6000 },
    { name: "GAWEAP", targetCount: 3, priority: 128, startTick: 7200 },
    { name: "GAREFN", targetCount: 3, priority: 94, startTick: 9000 },
    { name: "GAWEAP", targetCount: 4, priority: 112, startTick: 13200, requireCredits: 700 },
    { name: "GAPOWR", targetCount: 7, priority: 58, startTick: 15000 },
    { name: "GAREFN", targetCount: 4, priority: 72, startTick: 15000 },
    { name: "GAAIRC", targetCount: 1, priority: 54, startTick: 15000, requireCredits: 1200 },
    { name: "GAWEAP", targetCount: 5, priority: 94, startTick: 19200, requireCredits: 1000 },
    { name: "GAREFN", targetCount: 5, priority: 56, startTick: 21000, requireCredits: 1500 },
];

const sovietHfoBottomStructures: StructurePlanItem[] = [
    { name: "NAPOWR", targetCount: 2, priority: 78 },
    { name: "NAREFN", targetCount: 1, priority: 122 },
    { name: "NAHAND", targetCount: 1, priority: 70 },
    { name: "NAWEAP", targetCount: 1, priority: 145 },
    { name: "NAWEAP", targetCount: 2, priority: 142 },
    { name: "NAPOWR", targetCount: 3, priority: 92 },
    { name: "NAREFN", targetCount: 2, priority: 136, startTick: 6000 },
    { name: "NAWEAP", targetCount: 3, priority: 126, startTick: 7200 },
    { name: "NAPOWR", targetCount: 5, priority: 60, startTick: 9000 },
    { name: "NARADR", targetCount: 1, priority: 112, startTick: 9000, requireCredits: 800 },
    { name: "NAWEAP", targetCount: 4, priority: 108, startTick: 13800 },
    { name: "NAREFN", targetCount: 3, priority: 64, startTick: 15000 },
    { name: "NAPOWR", targetCount: 8, priority: 42, startTick: 15000 },
    { name: "NAREFN", targetCount: 5, priority: 54, startTick: 19200 },
    { name: "NAWEAP", targetCount: 6, priority: 96, startTick: 19200 },
    { name: "NATECH", targetCount: 1, priority: 46, startTick: 21600, requireCredits: 2500 },
    { name: "NANRCT", targetCount: 1, priority: 30, startTick: 25200, requireCredits: 2200 },
];

const alliedHfoBottomStructures: StructurePlanItem[] = [
    { name: "GAPOWR", targetCount: 2, priority: 78 },
    { name: "GAREFN", targetCount: 1, priority: 122 },
    { name: "GAPILE", targetCount: 1, priority: 70 },
    { name: "GAWEAP", targetCount: 1, priority: 145 },
    { name: "GAWEAP", targetCount: 2, priority: 142 },
    { name: "GAPOWR", targetCount: 3, priority: 92 },
    { name: "GAREFN", targetCount: 2, priority: 136, startTick: 6000 },
    { name: "GAWEAP", targetCount: 3, priority: 126, startTick: 7200 },
    { name: "GAPOWR", targetCount: 5, priority: 60, startTick: 9000 },
    { name: "GAAIRC", targetCount: 1, priority: 112, startTick: 9000, requireCredits: 800 },
    { name: "GAWEAP", targetCount: 4, priority: 108, startTick: 13800 },
    { name: "GAREFN", targetCount: 3, priority: 64, startTick: 15000 },
    { name: "GAPOWR", targetCount: 8, priority: 42, startTick: 15000 },
    { name: "GAREFN", targetCount: 5, priority: 54, startTick: 19200 },
    { name: "GAWEAP", targetCount: 6, priority: 96, startTick: 19200 },
    { name: "GATECH", targetCount: 1, priority: 46, startTick: 21600, requireCredits: 2500 },
];

const sovietOtmqTankSiegeStructures: StructurePlanItem[] = [
    { name: "NAPOWR", targetCount: 1, priority: 96 },
    { name: "NAHAND", targetCount: 1, priority: 138 },
    { name: "NAREFN", targetCount: 1, priority: 132 },
    { name: "NAPOWR", targetCount: 2, priority: 92 },
    { name: "NAWEAP", targetCount: 1, priority: 144 },
    { name: "NAHAND", targetCount: 2, priority: 96, startTick: 7200 },
    { name: "NAWEAP", targetCount: 2, priority: 148 },
    { name: "NAPOWR", targetCount: 3, priority: 86 },
    { name: "NAREFN", targetCount: 2, priority: 96, startTick: 9000 },
    { name: "NAWEAP", targetCount: 3, priority: 142, startTick: 6000 },
    { name: "NARADR", targetCount: 1, priority: 116, startTick: 13200 },
    { name: "NAPOWR", targetCount: 5, priority: 70, startTick: 9000 },
    { name: "NAWEAP", targetCount: 4, priority: 126, startTick: 10800 },
    { name: "NAREFN", targetCount: 3, priority: 66, startTick: 15000 },
    { name: "NAPOWR", targetCount: 8, priority: 42, startTick: 15000 },
    { name: "NAREFN", targetCount: 5, priority: 54, startTick: 19200 },
    { name: "NAWEAP", targetCount: 6, priority: 96, startTick: 19200 },
    { name: "NATECH", targetCount: 1, priority: 46, startTick: 24000, requireCredits: 2500 },
];

const alliedOtmqTankSiegeStructures: StructurePlanItem[] = [
    { name: "GAPOWR", targetCount: 1, priority: 96 },
    { name: "GAPILE", targetCount: 1, priority: 138 },
    { name: "GAREFN", targetCount: 1, priority: 132 },
    { name: "GAPOWR", targetCount: 2, priority: 92 },
    { name: "GAWEAP", targetCount: 1, priority: 144 },
    { name: "GAPILE", targetCount: 2, priority: 96, startTick: 7200 },
    { name: "GAWEAP", targetCount: 2, priority: 148 },
    { name: "GAPOWR", targetCount: 3, priority: 86 },
    { name: "GAREFN", targetCount: 2, priority: 96, startTick: 9000 },
    { name: "GAWEAP", targetCount: 3, priority: 142, startTick: 6000 },
    { name: "GAAIRC", targetCount: 1, priority: 116, startTick: 13200 },
    { name: "GAPOWR", targetCount: 5, priority: 70, startTick: 9000 },
    { name: "GAWEAP", targetCount: 4, priority: 126, startTick: 10800 },
    { name: "GAREFN", targetCount: 3, priority: 66, startTick: 15000 },
    { name: "GAPOWR", targetCount: 8, priority: 42, startTick: 15000 },
    { name: "GAREFN", targetCount: 5, priority: 54, startTick: 19200 },
    { name: "GAWEAP", targetCount: 6, priority: 96, startTick: 19200 },
    { name: "GATECH", targetCount: 1, priority: 46, startTick: 24000, requireCredits: 2500 },
];

const sovietOtmqAntiInfantryStructures: StructurePlanItem[] = [
    { name: "NAPOWR", targetCount: 2, priority: 84 },
    { name: "NAREFN", targetCount: 1, priority: 126 },
    { name: "NAHAND", targetCount: 1, priority: 74 },
    { name: "NAWEAP", targetCount: 1, priority: 132, startTick: 1800 },
    { name: "NAPOWR", targetCount: 3, priority: 82, startTick: 4800 },
    { name: "NAWEAP", targetCount: 2, priority: 126, startTick: 5400 },
    { name: "NALASR", targetCount: 1, priority: 126, startTick: 6600 },
    { name: "NAREFN", targetCount: 2, priority: 64, startTick: 9000 },
    { name: "NARADR", targetCount: 1, priority: 88, startTick: 12600, requireCredits: 900 },
];

const alliedOtmqAntiInfantryStructures: StructurePlanItem[] = [
    { name: "GAPOWR", targetCount: 2, priority: 84 },
    { name: "GAREFN", targetCount: 1, priority: 126 },
    { name: "GAPILE", targetCount: 1, priority: 74 },
    { name: "GAWEAP", targetCount: 1, priority: 132, startTick: 1800 },
    { name: "GAPOWR", targetCount: 3, priority: 82, startTick: 4800 },
    { name: "GAWEAP", targetCount: 2, priority: 126, startTick: 5400 },
    { name: "GAPILL", targetCount: 1, priority: 126, startTick: 6600 },
    { name: "GAREFN", targetCount: 2, priority: 64, startTick: 9000 },
    { name: "GAAIRC", targetCount: 1, priority: 88, startTick: 12600, requireCredits: 900 },
];

const sovietRushStructures: StructurePlanItem[] = [
    { name: "NAPOWR", targetCount: 1, priority: 88 },
    { name: "NAREFN", targetCount: 1, priority: 128 },
    { name: "NAHAND", targetCount: 1, priority: 72 },
    { name: "NAWEAP", targetCount: 1, priority: 146 },
    { name: "NAPOWR", targetCount: 2, priority: 82 },
    { name: "NAWEAP", targetCount: 2, priority: 134, startTick: 3600 },
    { name: "NAREFN", targetCount: 2, priority: 96, startTick: 4800 },
    { name: "NAPOWR", targetCount: 3, priority: 72, startTick: 6000 },
    { name: "NAWEAP", targetCount: 3, priority: 116, startTick: 7200 },
    { name: "NARADR", targetCount: 1, priority: 54, startTick: 12000, requireCredits: 900 },
    { name: "NAREFN", targetCount: 3, priority: 62, startTick: 15000 },
    { name: "NAPOWR", targetCount: 5, priority: 42, startTick: 15000 },
];

const alliedRushStructures: StructurePlanItem[] = [
    { name: "GAPOWR", targetCount: 1, priority: 88 },
    { name: "GAREFN", targetCount: 1, priority: 128 },
    { name: "GAPILE", targetCount: 1, priority: 72 },
    { name: "GAWEAP", targetCount: 1, priority: 146 },
    { name: "GAPOWR", targetCount: 2, priority: 82 },
    { name: "GAWEAP", targetCount: 2, priority: 134, startTick: 3600 },
    { name: "GAREFN", targetCount: 2, priority: 96, startTick: 4800 },
    { name: "GAPOWR", targetCount: 3, priority: 72, startTick: 6000 },
    { name: "GAWEAP", targetCount: 3, priority: 116, startTick: 7200 },
    { name: "GAAIRC", targetCount: 1, priority: 54, startTick: 12000, requireCredits: 900 },
    { name: "GAREFN", targetCount: 3, priority: 62, startTick: 15000 },
    { name: "GAPOWR", targetCount: 5, priority: 42, startTick: 15000 },
];

const sovietTankBoomStructures: StructurePlanItem[] = [
    { name: "NAPOWR", targetCount: 6, priority: 42 },
    { name: "NAREFN", targetCount: 3, priority: 66 },
    { name: "NAHAND", targetCount: 1, priority: 24 },
    { name: "NAWEAP", targetCount: 5, priority: 92 },
];

const alliedTankBoomStructures: StructurePlanItem[] = [
    { name: "GAPOWR", targetCount: 6, priority: 42 },
    { name: "GAREFN", targetCount: 3, priority: 66 },
    { name: "GAPILE", targetCount: 1, priority: 24 },
    { name: "GAWEAP", targetCount: 5, priority: 92 },
];

const sovietSiegeStructures: StructurePlanItem[] = [
    { name: "NAPOWR", targetCount: 6, priority: 42 },
    { name: "NAREFN", targetCount: 3, priority: 64 },
    { name: "NAHAND", targetCount: 1, priority: 20 },
    { name: "NAWEAP", targetCount: 4, priority: 76 },
    { name: "NARADR", targetCount: 1, priority: 92, requireCredits: 800 },
];

const alliedSiegeStructures: StructurePlanItem[] = [
    { name: "GAPOWR", targetCount: 6, priority: 42 },
    { name: "GAREFN", targetCount: 3, priority: 64 },
    { name: "GAPILE", targetCount: 1, priority: 20 },
    { name: "GAWEAP", targetCount: 4, priority: 76 },
    { name: "GAAIRC", targetCount: 1, priority: 92, requireCredits: 800 },
];

const sovietWestSiegeStructures: StructurePlanItem[] = [
    { name: "NAWEAP", targetCount: 2, priority: 68 },
    { name: "NARADR", targetCount: 1, priority: 58, startTick: 9000, requireCredits: 800 },
    { name: "NAPOWR", targetCount: 6, priority: 28, startTick: 9600 },
];

const alliedWestSiegeStructures: StructurePlanItem[] = [
    { name: "GAWEAP", targetCount: 2, priority: 68 },
    { name: "GAAIRC", targetCount: 1, priority: 58, startTick: 9000, requireCredits: 800 },
    { name: "GAPOWR", targetCount: 6, priority: 28, startTick: 9600 },
];

const sovietTechStructures: StructurePlanItem[] = [
    { name: "NAPOWR", targetCount: 8, priority: 42 },
    { name: "NAREFN", targetCount: 4, priority: 56 },
    { name: "NAHAND", targetCount: 1, priority: 24 },
    { name: "NAWEAP", targetCount: 4, priority: 66 },
    { name: "NARADR", targetCount: 1, priority: 72 },
    { name: "NATECH", targetCount: 1, priority: 88, requireCredits: 1800 },
    { name: "NANRCT", targetCount: 1, priority: 46, requireCredits: 1200 },
    { name: "NAIRON", targetCount: 1, priority: 32, startTick: 30000, requireCredits: 3500 },
    { name: "NAMISL", targetCount: 1, priority: 44, startTick: 42000, requireCredits: 5000 },
];

const alliedTechStructures: StructurePlanItem[] = [
    { name: "GAPOWR", targetCount: 8, priority: 42 },
    { name: "GAREFN", targetCount: 4, priority: 56 },
    { name: "GAPILE", targetCount: 1, priority: 24 },
    { name: "GAWEAP", targetCount: 4, priority: 66 },
    { name: "GAAIRC", targetCount: 1, priority: 72 },
    { name: "GATECH", targetCount: 1, priority: 88, requireCredits: 1800 },
    { name: "GACSPH", targetCount: 1, priority: 32, startTick: 30000, requireCredits: 3500 },
    { name: "GAWEAT", targetCount: 1, priority: 44, startTick: 42000, requireCredits: 5000 },
];

const sovietIslandTechStructures: StructurePlanItem[] = [
    { name: "NAPOWR", targetCount: 2, priority: 82 },
    { name: "NAREFN", targetCount: 1, priority: 112 },
    { name: "NAHAND", targetCount: 1, priority: 54 },
    { name: "NAYARD", targetCount: 1, priority: 180, startTick: 2700, requireCredits: 500 },
    { name: "NAREFN", targetCount: 2, priority: 74, startTick: 4800 },
    { name: "NAWEAP", targetCount: 1, priority: 78, startTick: 5400 },
    { name: "NARADR", targetCount: 1, priority: 132, startTick: 6600, requireCredits: 800 },
    { name: "NATECH", targetCount: 1, priority: 150, startTick: 9000, requireCredits: 1200 },
    { name: "NAPOWR", targetCount: 5, priority: 62, startTick: 9600 },
];

const alliedIslandTechStructures: StructurePlanItem[] = [
    { name: "GAPOWR", targetCount: 2, priority: 82 },
    { name: "GAREFN", targetCount: 1, priority: 112 },
    { name: "GAPILE", targetCount: 1, priority: 54 },
    { name: "GAYARD", targetCount: 1, priority: 180, startTick: 2700, requireCredits: 500 },
    { name: "GAREFN", targetCount: 2, priority: 74, startTick: 4800 },
    { name: "GAWEAP", targetCount: 1, priority: 78, startTick: 5400 },
    { name: "GAAIRC", targetCount: 1, priority: 132, startTick: 6600, requireCredits: 800 },
    { name: "GATECH", targetCount: 1, priority: 150, startTick: 9000, requireCredits: 1200 },
    { name: "GAPOWR", targetCount: 5, priority: 62, startTick: 9600 },
];

const PLANS: Record<ConcreteStrategicPlanName, ConcreteStrategicPlan> = {
    macro: {
        name: "macro",
        structures: {
            [SideType.Nod]: sovietMacroStructures,
            [SideType.GDI]: alliedMacroStructures,
        },
        units: {
            [SideType.Nod]: [
                { name: "DOG", targetCount: 2, priority: 110, startTick: 600 },
                { name: "HARV", targetCount: 10, priority: 86 },
                { name: "HTNK", targetCount: 80, priority: 64, startTick: 1200 },
                { name: "HTK", targetCount: 8, priority: 24, startTick: 4200 },
            ],
            [SideType.GDI]: [
                { name: "ADOG", targetCount: 2, priority: 110, startTick: 600 },
                { name: "CMIN", targetCount: 10, priority: 86 },
                { name: "MTNK", targetCount: 70, priority: 64, startTick: 1200 },
                { name: "FV", targetCount: 10, priority: 24, startTick: 4200 },
            ],
        },
    },
    macroSiege: {
        name: "macroSiege",
        structures: {
            [SideType.Nod]: sovietMacroSiegeStructures,
            [SideType.GDI]: alliedMacroSiegeStructures,
        },
        units: {
            [SideType.Nod]: [
                { name: "DOG", targetCount: 2, priority: 110, startTick: 600 },
                { name: "HARV", targetCount: 10, priority: 82 },
                { name: "HTNK", targetCount: 72, priority: 66, startTick: 900 },
                { name: "V3", targetCount: 14, priority: 104, startTick: 12600 },
                { name: "HTK", targetCount: 8, priority: 24, startTick: 4200 },
            ],
            [SideType.GDI]: [
                { name: "ADOG", targetCount: 2, priority: 110, startTick: 600 },
                { name: "CMIN", targetCount: 10, priority: 82 },
                { name: "MTNK", targetCount: 64, priority: 66, startTick: 900 },
                { name: "SREF", targetCount: 14, priority: 104, startTick: 12600 },
                { name: "FV", targetCount: 10, priority: 24, startTick: 4200 },
            ],
        },
    },
    macroLateSiege: {
        name: "macroLateSiege",
        structures: {
            [SideType.Nod]: sovietMacroLateSiegeStructures,
            [SideType.GDI]: alliedMacroLateSiegeStructures,
        },
        units: {
            [SideType.Nod]: [
                { name: "DOG", targetCount: 2, priority: 110, startTick: 600 },
                { name: "HARV", targetCount: 10, priority: 86 },
                { name: "HTNK", targetCount: 80, priority: 64, startTick: 900 },
                { name: "V3", targetCount: 8, priority: 118, startTick: 18000 },
                { name: "HTK", targetCount: 8, priority: 24, startTick: 4200 },
            ],
            [SideType.GDI]: [
                { name: "ADOG", targetCount: 2, priority: 110, startTick: 600 },
                { name: "CMIN", targetCount: 10, priority: 86 },
                { name: "MTNK", targetCount: 70, priority: 64, startTick: 900 },
                { name: "SREF", targetCount: 8, priority: 118, startTick: 18000 },
                { name: "FV", targetCount: 10, priority: 24, startTick: 4200 },
            ],
        },
    },
    ecoBoom: {
        name: "ecoBoom",
        structures: {
            [SideType.Nod]: sovietEcoBoomStructures,
            [SideType.GDI]: alliedEcoBoomStructures,
        },
        units: {
            [SideType.Nod]: [
                { name: "DOG", targetCount: 2, priority: 108, startTick: 600 },
                { name: "HARV", targetCount: 2, priority: 132 },
                { name: "HTNK", targetCount: 36, priority: 126, startTick: 900 },
                { name: "HTK", targetCount: 6, priority: 36, startTick: 4200 },
                { name: "HARV", targetCount: 4, priority: 84, startTick: 7200 },
                { name: "HTNK", targetCount: 96, priority: 132, startTick: 7200 },
                { name: "HARV", targetCount: 7, priority: 52, startTick: 15000 },
                { name: "V3", targetCount: 8, priority: 76, startTick: 16800 },
            ],
            [SideType.GDI]: [
                { name: "ADOG", targetCount: 2, priority: 108, startTick: 600 },
                { name: "CMIN", targetCount: 2, priority: 132 },
                { name: "MTNK", targetCount: 34, priority: 126, startTick: 900 },
                { name: "FV", targetCount: 8, priority: 36, startTick: 4200 },
                { name: "CMIN", targetCount: 4, priority: 84, startTick: 7200 },
                { name: "MTNK", targetCount: 88, priority: 132, startTick: 7200 },
                { name: "CMIN", targetCount: 7, priority: 52, startTick: 15000 },
                { name: "SREF", targetCount: 8, priority: 76, startTick: 16800 },
            ],
        },
    },
    hfoBottom: {
        name: "hfoBottom",
        structures: {
            [SideType.Nod]: sovietHfoBottomStructures,
            [SideType.GDI]: alliedHfoBottomStructures,
        },
        sellYard: { enabled: false, tick: 42000, minCombatants: 4 },
        units: {
            [SideType.Nod]: [
                { name: "HARV", targetCount: 2, priority: 145 },
                { name: "DOG", targetCount: 3, priority: 104, startTick: 600 },
                { name: "E2", targetCount: 16, priority: 62 },
                { name: "HTNK", targetCount: 140, priority: 144, startTick: 900 },
                { name: "HTK", targetCount: 4, priority: 34, startTick: 4200 },
                { name: "HARV", targetCount: 4, priority: 72, startTick: 9000 },
                { name: "E2", targetCount: 24, priority: 44, startTick: 7800 },
                { name: "HARV", targetCount: 6, priority: 50, startTick: 18000 },
                { name: "V3", targetCount: 14, priority: 164, startTick: 9000 },
                { name: "DESO", targetCount: 8, priority: 104, startTick: 21600 },
                { name: "APOC", targetCount: 12, priority: 82, startTick: 25200 },
            ],
            [SideType.GDI]: [
                { name: "CMIN", targetCount: 2, priority: 145 },
                { name: "ADOG", targetCount: 3, priority: 104, startTick: 600 },
                { name: "E1", targetCount: 16, priority: 62 },
                { name: "MTNK", targetCount: 130, priority: 144, startTick: 900 },
                { name: "FV", targetCount: 4, priority: 34, startTick: 4200 },
                { name: "CMIN", targetCount: 4, priority: 72, startTick: 9000 },
                { name: "E1", targetCount: 24, priority: 44, startTick: 7800 },
                { name: "CMIN", targetCount: 6, priority: 50, startTick: 18000 },
                { name: "SREF", targetCount: 14, priority: 164, startTick: 9000 },
                { name: "MGTK", targetCount: 10, priority: 82, startTick: 25200 },
            ],
        },
    },
    otmqTankSiege: {
        name: "otmqTankSiege",
        structures: {
            [SideType.Nod]: sovietOtmqTankSiegeStructures,
            [SideType.GDI]: alliedOtmqTankSiegeStructures,
        },
        sellYard: { enabled: true, tick: 72000, minCombatants: 0 },
        units: {
            [SideType.Nod]: [
                { name: "HARV", targetCount: 2, priority: 142 },
                { name: "DOG", targetCount: 5, priority: 110, startTick: 600 },
                { name: "E2", targetCount: 24, priority: 70 },
                { name: "HTNK", targetCount: 104, priority: 152, startTick: 900 },
                { name: "HTK", targetCount: 4, priority: 36, startTick: 4200 },
                { name: "HARV", targetCount: 4, priority: 64, startTick: 12000 },
                { name: "E2", targetCount: 30, priority: 52, startTick: 7800 },
                { name: "V3", targetCount: 8, priority: 168, startTick: 12000 },
                { name: "V3", targetCount: 16, priority: 160, startTick: 16800 },
                { name: "HARV", targetCount: 6, priority: 50, startTick: 18000 },
                { name: "DESO", targetCount: 8, priority: 104, startTick: 21600 },
                { name: "APOC", targetCount: 10, priority: 82, startTick: 25200 },
                { name: "HTNK", targetCount: 32, priority: 172, startTick: 30000 },
                { name: "HTNK", targetCount: 72, priority: 150, startTick: 48000 },
                { name: "E2", targetCount: 16, priority: 166, startTick: 60000 },
            ],
            [SideType.GDI]: [
                { name: "CMIN", targetCount: 2, priority: 142 },
                { name: "ADOG", targetCount: 5, priority: 110, startTick: 600 },
                { name: "E1", targetCount: 24, priority: 70 },
                { name: "MTNK", targetCount: 100, priority: 152, startTick: 900 },
                { name: "FV", targetCount: 4, priority: 36, startTick: 4200 },
                { name: "CMIN", targetCount: 4, priority: 64, startTick: 12000 },
                { name: "E1", targetCount: 30, priority: 52, startTick: 7800 },
                { name: "SREF", targetCount: 8, priority: 168, startTick: 12000 },
                { name: "SREF", targetCount: 16, priority: 160, startTick: 16800 },
                { name: "CMIN", targetCount: 6, priority: 50, startTick: 18000 },
                { name: "MGTK", targetCount: 10, priority: 82, startTick: 25200 },
                { name: "MTNK", targetCount: 30, priority: 172, startTick: 30000 },
                { name: "MTNK", targetCount: 68, priority: 150, startTick: 48000 },
                { name: "E1", targetCount: 16, priority: 166, startTick: 60000 },
            ],
        },
    },
    pinchFortressBreak: {
        name: "pinchFortressBreak",
        structures: {
            [SideType.Nod]: [
                ...sovietOtmqAntiInfantryStructures,
                { name: "NAWEAP", targetCount: 3, priority: 118, startTick: 12000 },
                { name: "NAPOWR", targetCount: 5, priority: 92, startTick: 13200 },
                { name: "NAREFN", targetCount: 3, priority: 58, startTick: 16000 },
                { name: "NATECH", targetCount: 1, priority: 90, startTick: 36000, requireCredits: 2200 },
                { name: "NANRCT", targetCount: 1, priority: 36, startTick: 42000, requireCredits: 2400 },
            ],
            [SideType.GDI]: [
                ...alliedOtmqAntiInfantryStructures,
                { name: "GAWEAP", targetCount: 3, priority: 118, startTick: 12000 },
                { name: "GAPOWR", targetCount: 5, priority: 92, startTick: 13200 },
                { name: "GAREFN", targetCount: 3, priority: 58, startTick: 16000 },
                { name: "GATECH", targetCount: 1, priority: 90, startTick: 36000, requireCredits: 2200 },
            ],
        },
        units: {
            [SideType.Nod]: [
                { name: "DOG", targetCount: 3, priority: 132, startTick: 600 },
                { name: "E2", targetCount: 14, priority: 118 },
                { name: "HTNK", targetCount: 72, priority: 158, startTick: 2400 },
                { name: "HARV", targetCount: 2, priority: 74, startTick: 7200 },
                { name: "HTK", targetCount: 6, priority: 62, startTick: 7200 },
                { name: "E2", targetCount: 24, priority: 58, startTick: 9000 },
                { name: "DESO", targetCount: 6, priority: 104, startTick: 15000 },
                { name: "E2", targetCount: 40, priority: 96, startTick: 18000 },
                { name: "V3", targetCount: 4, priority: 112, startTick: 18000 },
                { name: "HARV", targetCount: 4, priority: 56, startTick: 18000 },
                { name: "APOC", targetCount: 12, priority: 150, startTick: 24000 },
                { name: "ZEP", targetCount: 4, priority: 128, startTick: 36000 },
            ],
            [SideType.GDI]: [
                { name: "ADOG", targetCount: 3, priority: 132, startTick: 600 },
                { name: "E1", targetCount: 14, priority: 118 },
                { name: "MTNK", targetCount: 66, priority: 158, startTick: 2400 },
                { name: "CMIN", targetCount: 2, priority: 74, startTick: 7200 },
                { name: "FV", targetCount: 8, priority: 62, startTick: 7200 },
                { name: "E1", targetCount: 24, priority: 58, startTick: 9000 },
                { name: "E1", targetCount: 40, priority: 96, startTick: 18000 },
                { name: "SREF", targetCount: 4, priority: 112, startTick: 18000 },
                { name: "CMIN", targetCount: 4, priority: 56, startTick: 18000 },
                { name: "MGTK", targetCount: 12, priority: 150, startTick: 24000 },
                { name: "SREF", targetCount: 8, priority: 126, startTick: 30000 },
            ],
        },
    },
    otmqAntiInfantry: {
        name: "otmqAntiInfantry",
        structures: {
            [SideType.Nod]: sovietOtmqAntiInfantryStructures,
            [SideType.GDI]: alliedOtmqAntiInfantryStructures,
        },
        units: {
            [SideType.Nod]: [
                { name: "DOG", targetCount: 3, priority: 132, startTick: 600 },
                { name: "E2", targetCount: 14, priority: 118 },
                { name: "HTNK", targetCount: 54, priority: 156, startTick: 2400 },
                { name: "HARV", targetCount: 2, priority: 74, startTick: 7200 },
                { name: "HTK", targetCount: 6, priority: 62, startTick: 7200 },
                { name: "E2", targetCount: 24, priority: 58, startTick: 9000 },
                { name: "DESO", targetCount: 6, priority: 116, startTick: 15000 },
                { name: "V3", targetCount: 12, priority: 132, startTick: 16800 },
            ],
            [SideType.GDI]: [
                { name: "ADOG", targetCount: 3, priority: 132, startTick: 600 },
                { name: "E1", targetCount: 14, priority: 118 },
                { name: "MTNK", targetCount: 50, priority: 156, startTick: 2400 },
                { name: "CMIN", targetCount: 2, priority: 74, startTick: 7200 },
                { name: "FV", targetCount: 8, priority: 62, startTick: 7200 },
                { name: "E1", targetCount: 24, priority: 58, startTick: 9000 },
                { name: "SREF", targetCount: 10, priority: 132, startTick: 16800 },
            ],
        },
    },
    rush: {
        name: "rush",
        structures: {
            [SideType.Nod]: sovietRushStructures,
            [SideType.GDI]: alliedRushStructures,
        },
        units: {
            [SideType.Nod]: [
                { name: "DOG", targetCount: 2, priority: 108, startTick: 600 },
                { name: "E2", targetCount: 16, priority: 132, startTick: 900 },
                { name: "HARV", targetCount: 4, priority: 48 },
                { name: "HTNK", targetCount: 42, priority: 96, startTick: 900 },
                { name: "HTK", targetCount: 4, priority: 36, startTick: 5400 },
                { name: "E2", targetCount: 24, priority: 52, startTick: 7200 },
            ],
            [SideType.GDI]: [
                { name: "ADOG", targetCount: 2, priority: 108, startTick: 600 },
                { name: "E1", targetCount: 16, priority: 132, startTick: 900 },
                { name: "CMIN", targetCount: 4, priority: 48 },
                { name: "MTNK", targetCount: 42, priority: 96, startTick: 900 },
                { name: "FV", targetCount: 4, priority: 36, startTick: 5400 },
                { name: "E1", targetCount: 24, priority: 52, startTick: 7200 },
            ],
        },
        sellYard: { enabled: true, tick: 7200, minCombatants: 12, maxFactories: 3 },
    },
    hfoWestRush: {
        name: "hfoWestRush",
        structures: {
            [SideType.Nod]: sovietRushStructures,
            [SideType.GDI]: alliedRushStructures,
        },
        units: {
            [SideType.Nod]: [
                { name: "DOG", targetCount: 2, priority: 108, startTick: 600 },
                { name: "HARV", targetCount: 4, priority: 48 },
                { name: "HTNK", targetCount: 42, priority: 96, startTick: 900 },
            ],
            [SideType.GDI]: [
                { name: "ADOG", targetCount: 2, priority: 108, startTick: 600 },
                { name: "CMIN", targetCount: 4, priority: 48 },
                { name: "MTNK", targetCount: 42, priority: 96, startTick: 900 },
            ],
        },
        sellYard: { enabled: true, tick: 5400, minCombatants: 8, maxFactories: 3 },
    },
    tankBoom: {
        name: "tankBoom",
        structures: {
            [SideType.Nod]: sovietTankBoomStructures,
            [SideType.GDI]: alliedTankBoomStructures,
        },
        units: {
            [SideType.Nod]: [
                { name: "DOG", targetCount: 2, priority: 110, startTick: 600 },
                { name: "HARV", targetCount: 6, priority: 68 },
                { name: "HTNK", targetCount: 96, priority: 104, startTick: 900 },
                { name: "HTK", targetCount: 4, priority: 18, startTick: 5400 },
            ],
            [SideType.GDI]: [
                { name: "ADOG", targetCount: 2, priority: 110, startTick: 600 },
                { name: "CMIN", targetCount: 6, priority: 68 },
                { name: "MTNK", targetCount: 88, priority: 104, startTick: 900 },
                { name: "FV", targetCount: 6, priority: 18, startTick: 5400 },
            ],
        },
    },
    siege: {
        name: "siege",
        structures: {
            [SideType.Nod]: sovietSiegeStructures,
            [SideType.GDI]: alliedSiegeStructures,
        },
        units: {
            [SideType.Nod]: [
                { name: "DOG", targetCount: 2, priority: 110, startTick: 600 },
                { name: "HARV", targetCount: 6, priority: 66 },
                { name: "HTNK", targetCount: 36, priority: 58, startTick: 900 },
                { name: "V3", targetCount: 18, priority: 108, startTick: 4200 },
                { name: "HTK", targetCount: 6, priority: 24, startTick: 5400 },
            ],
            [SideType.GDI]: [
                { name: "ADOG", targetCount: 2, priority: 110, startTick: 600 },
                { name: "CMIN", targetCount: 6, priority: 66 },
                { name: "MTNK", targetCount: 32, priority: 58, startTick: 900 },
                { name: "SREF", targetCount: 18, priority: 108, startTick: 4200 },
                { name: "FV", targetCount: 6, priority: 24, startTick: 5400 },
            ],
        },
    },
    westSiege: {
        name: "westSiege",
        structures: {
            [SideType.Nod]: sovietWestSiegeStructures,
            [SideType.GDI]: alliedWestSiegeStructures,
        },
        units: {
            [SideType.Nod]: [
                { name: "V3", targetCount: 12, priority: 96, startTick: 12600 },
                { name: "HTNK", targetCount: 24, priority: 34, startTick: 12600 },
            ],
            [SideType.GDI]: [
                { name: "SREF", targetCount: 12, priority: 96, startTick: 12600 },
                { name: "MTNK", targetCount: 24, priority: 34, startTick: 12600 },
            ],
        },
    },
    tech: {
        name: "tech",
        structures: {
            [SideType.Nod]: sovietTechStructures,
            [SideType.GDI]: alliedTechStructures,
        },
        units: {
            [SideType.Nod]: [
                { name: "DOG", targetCount: 2, priority: 108, startTick: 600 },
                { name: "HARV", targetCount: 8, priority: 72 },
                { name: "HTNK", targetCount: 36, priority: 48, startTick: 900 },
                { name: "APOC", targetCount: 24, priority: 96, startTick: 7200 },
                { name: "V3", targetCount: 10, priority: 58, startTick: 8400 },
                { name: "ZEP", targetCount: 3, priority: 34, startTick: 10200 },
            ],
            [SideType.GDI]: [
                { name: "ADOG", targetCount: 2, priority: 108, startTick: 600 },
                { name: "CMIN", targetCount: 8, priority: 72 },
                { name: "MTNK", targetCount: 32, priority: 48, startTick: 900 },
                { name: "MGTK", targetCount: 24, priority: 96, startTick: 7200 },
                { name: "SREF", targetCount: 12, priority: 58, startTick: 8400 },
            ],
        },
    },
    islandTech: {
        name: "islandTech",
        structures: {
            [SideType.Nod]: sovietIslandTechStructures,
            [SideType.GDI]: alliedIslandTechStructures,
        },
        units: {
            [SideType.Nod]: [
                { name: "HARV", targetCount: 4, priority: 72 },
                { name: "HTNK", targetCount: 4, priority: 24, startTick: 900 },
                { name: "SUB", targetCount: 16, priority: 140, startTick: 3600 },
                { name: "HYD", targetCount: 10, priority: 84, startTick: 5400 },
                { name: "SAPC", targetCount: 2, priority: 36, startTick: 7200 },
                { name: "DRED", targetCount: 10, priority: 170, startTick: 9000 },
                { name: "ZEP", targetCount: 4, priority: 96, startTick: 12000 },
                { name: "SQD", targetCount: 4, priority: 60, startTick: 12600 },
            ],
            [SideType.GDI]: [
                { name: "CMIN", targetCount: 4, priority: 72 },
                { name: "MTNK", targetCount: 4, priority: 24, startTick: 900 },
                { name: "DEST", targetCount: 16, priority: 140, startTick: 3600 },
                { name: "AEGIS", targetCount: 8, priority: 78, startTick: 5400 },
                { name: "LCRF", targetCount: 2, priority: 36, startTick: 7200 },
                { name: "CARRIER", targetCount: 8, priority: 166, startTick: 9000 },
                { name: "SREF", targetCount: 4, priority: 86, startTick: 12000 },
                { name: "DLPH", targetCount: 4, priority: 58, startTick: 12600 },
            ],
        },
    },
};

const enabled = (options: StrategicPlanOptions): boolean => options.enabled ?? options.plan !== undefined;

const HFO_STARTS = new Set(["39,82", "88,34", "151,119", "88,157"]);
const TSUNAMI_STARTS = new Set(["56,99", "100,58", "106,141", "134,98"]);
const TIGER_BAY_STARTS = new Set(["31,101", "127,128"]);
const OTMQ_STARTS = new Set(["48,123", "134,56"]);
const PEAK_OF_PERFECTION_STARTS = new Set(["37,73", "118,73"]);
const PINCH_POINT_STARTS = new Set(["51,97", "96,51"]);
const TIKAL_STARTS = new Set(["50,119", "92,22"]);
const WATERING_HOLE_STARTS = new Set(["83,27", "107,161"]);
const MALIBU_CLIFFS_STARTS = new Set(["96,64", "111,178"]);
const DRY_HEAT_STARTS = new Set(["47,46", "86,85"]);

const getStartKey = (point: { x: number; y: number }): string => `${point.x},${point.y}`;

const isHeckFreezesOver = (context: SupabotContext): boolean => {
    const starts = context.game.mapApi.getStartingLocations().map(getStartKey).sort();
    return starts.length === HFO_STARTS.size && starts.every((start) => HFO_STARTS.has(start));
};

const isTsunami = (context: SupabotContext): boolean => {
    const starts = context.game.mapApi.getStartingLocations().map(getStartKey).sort();
    return starts.length === TSUNAMI_STARTS.size && starts.every((start) => TSUNAMI_STARTS.has(start));
};

const isTigerBay = (context: SupabotContext): boolean => {
    const starts = context.game.mapApi.getStartingLocations().map(getStartKey).sort();
    return starts.length === TIGER_BAY_STARTS.size && starts.every((start) => TIGER_BAY_STARTS.has(start));
};

const isOtmq = (context: SupabotContext): boolean => {
    const starts = context.game.mapApi.getStartingLocations().map(getStartKey).sort();
    return starts.length === OTMQ_STARTS.size && starts.every((start) => OTMQ_STARTS.has(start));
};

const isPeakOfPerfection = (context: SupabotContext): boolean => {
    const starts = context.game.mapApi.getStartingLocations().map(getStartKey).sort();
    return starts.length === PEAK_OF_PERFECTION_STARTS.size && starts.every((start) => PEAK_OF_PERFECTION_STARTS.has(start));
};

const isPinchPoint = (context: SupabotContext): boolean => {
    const starts = context.game.mapApi.getStartingLocations().map(getStartKey).sort();
    return starts.length === PINCH_POINT_STARTS.size && starts.every((start) => PINCH_POINT_STARTS.has(start));
};

const isTikal = (context: SupabotContext): boolean => {
    const starts = context.game.mapApi.getStartingLocations().map(getStartKey).sort();
    return starts.length === TIKAL_STARTS.size && starts.every((start) => TIKAL_STARTS.has(start));
};

const isWateringHole = (context: SupabotContext): boolean => {
    const starts = context.game.mapApi.getStartingLocations().map(getStartKey).sort();
    return starts.length === WATERING_HOLE_STARTS.size && starts.every((start) => WATERING_HOLE_STARTS.has(start));
};

const isMalibuCliffs = (context: SupabotContext): boolean => {
    const starts = context.game.mapApi.getStartingLocations().map(getStartKey).sort();
    return starts.length === MALIBU_CLIFFS_STARTS.size && starts.every((start) => MALIBU_CLIFFS_STARTS.has(start));
};

const isDryHeat = (context: SupabotContext): boolean => {
    const starts = context.game.mapApi.getStartingLocations().map(getStartKey).sort();
    return starts.length === DRY_HEAT_STARTS.size && starts.every((start) => DRY_HEAT_STARTS.has(start));
};

const getPrimaryEnemySide = (context: SupabotContext): SideType | null => {
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
    return enemyPlayer?.country?.side ?? null;
};

const resolveHfoPlanName = (context: SupabotContext): ConcreteStrategicPlanName | null => {
    if (isTsunami(context) || context.matchAwareness.isNavalMap()) {
        return "islandTech";
    }
    const start = getStartKey(context.game.getPlayerData(context.player.name).startLocation);
    if (isTigerBay(context)) {
        if (start === "31,101") {
            return "tankBoom";
        }
    }
    if (isOtmq(context) && start === "48,123") {
        return "otmqAntiInfantry";
    }
    if (isPeakOfPerfection(context) && start === "37,73") {
        return "otmqAntiInfantry";
    }
    if (isWateringHole(context) && start === "107,161") {
        return "tankBoom";
    }
    if (isPinchPoint(context) && start === "96,51" && getPrimaryEnemySide(context) === SideType.Nod) {
        return "otmqAntiInfantry";
    }
    if (isDryHeat(context) && start === "86,85") {
        return "hfoBottom";
    }
    if (!isHeckFreezesOver(context)) {
        return null;
    }
    if (start === "39,82") {
        return "hfoWestRush";
    }
    if (start === "151,119") {
        return "rush";
    }
    if (start === "88,157") {
        return "hfoBottom";
    }
    return null;
};

const resolveAdaptivePlanName = (context: SupabotContext): ConcreteStrategicPlanName => {
    const roll = context.game.generateRandomInt(0, 99);
    if (roll < 35) {
        return "tankBoom";
    }
    if (roll < 55) {
        return "macro";
    }
    if (roll < 75) {
        return "rush";
    }
    if (roll < 90) {
        return "siege";
    }
    return "tech";
};

const resolvePlanName = (context: SupabotContext, options: StrategicPlanOptions): ConcreteStrategicPlanName | null => {
    const plan = options.plan ?? "off";
    if (plan === "off") {
        return null;
    }
    if (plan === "hfo") {
        return resolveHfoPlanName(context);
    }
    if (plan !== "adaptive") {
        return plan;
    }

    return resolveAdaptivePlanName(context);
};

const visibleCount = (context: MissionContext, name: string): number =>
    context.game.getVisibleUnits(context.player.name, "self", (rules) => rules.name === name).length;

const getPlanSide = (context: MissionContext): SideType.Nod | SideType.GDI | null => {
    const side = context.game.getPlayerData(context.player.name).country?.side;
    return side === SideType.Nod || side === SideType.GDI ? side : null;
};

class StrategicBuildMission extends Mission {
    constructor(
        private plan: ConcreteStrategicPlan,
        private finisherOptions: StrategicFinisherOptions,
        logger: DebugLogger,
    ) {
        super(`${STRATEGIC_BUILD_MISSION_NAME}.${plan.name}`, logger);
    }

    _onAiUpdate(context: MissionContext): MissionAction {
        const side = getPlanSide(context);
        if (side == null) {
            return noop();
        }
        const playerData = context.game.getPlayerData(context.player.name);
        const availableObjects = [
            ...context.player.production.getAvailableObjects(QueueType.Structures),
            ...context.player.production.getAvailableObjects(QueueType.Armory),
        ];
        const availableByName = new Map(availableObjects.map((rules) => [rules.name, rules]));

        const planItems = [
            ...getFinisherArtilleryStructurePlanItems(side, this.finisherOptions),
            ...this.plan.structures[side],
        ];
        for (const item of planItems) {
            if (context.game.getCurrentTick() < (item.startTick ?? 0)) {
                continue;
            }
            if (item.requireCredits !== undefined && playerData.credits < item.requireCredits) {
                continue;
            }
            if (visibleCount(context, item.name) >= item.targetCount) {
                continue;
            }
            const rules = availableByName.get(item.name);
            if (!rules) {
                continue;
            }
            const location = this.getPlacementLocation(context, rules);
            if (!location) {
                continue;
            }
            return buildStructureAtLocation(item.name, item.priority, location.rx, location.ry);
        }
        return noop();
    }

    getGlobalDebugText(): string | undefined {
        return `${this.plan.name} build`;
    }

    getPriority(): number {
        return 0;
    }

    private getPlacementLocation(context: MissionContext, rules: TechnoRules): { rx: number; ry: number } | undefined {
        const playerData = context.game.getPlayerData(context.player.name);
        const customRules = BUILDING_NAME_TO_RULES.get(rules.name);
        return (
            customRules?.getPlacementLocation(context.game, playerData, rules) ??
            getDefaultPlacementLocation(context.game, playerData, playerData.startLocation, rules)
        );
    }
}

class StrategicUnitMission extends Mission {
    constructor(
        private plan: ConcreteStrategicPlan,
        private options: StrategicPlanOptions,
        private finisherOptions: StrategicFinisherOptions,
        logger: DebugLogger,
    ) {
        super(`${STRATEGIC_UNIT_MISSION_NAME}.${plan.name}`, logger);
    }

    _onAiUpdate(context: MissionContext): MissionAction {
        const side = getPlanSide(context);
        if (side == null) {
            return noop();
        }
        const requests: Record<string, number> = {};
        const finisherArtillery = getFinisherArtilleryPlanItem(side, this.finisherOptions);
        const planItems = finisherArtillery ? [...this.plan.units[side], finisherArtillery] : this.plan.units[side];
        for (const item of planItems) {
            if (context.game.getCurrentTick() < (item.startTick ?? 0)) {
                continue;
            }
            if (visibleCount(context, item.name) >= this.getTargetCount(item)) {
                continue;
            }
            requests[item.name] = item.priority;
        }
        return Object.keys(requests).length > 0 ? requestUnits(requests) : noop();
    }

    getGlobalDebugText(): string | undefined {
        return `${this.plan.name} units`;
    }

    getPriority(): number {
        return 0;
    }

    isUnitsLocked(): boolean {
        return false;
    }

    private getTargetCount(item: UnitPlanItem): number {
        if (item.name !== "DOG" && item.name !== "ADOG") {
            return item.targetCount;
        }
        const override =
            this.plan.name === "hfoBottom"
                ? this.options.hfoBottomDogTargetCount
                : this.plan.name === "otmqAntiInfantry"
                  ? this.options.antiInfantryDogTargetCount
                  : undefined;
        return Math.max(0, override ?? this.options.dogTargetCount ?? item.targetCount);
    }
}

class StrategicSellMission extends Mission {
    private sold = false;

    constructor(
        private plan: ConcreteStrategicPlan,
        private options: StrategicPlanOptions,
        logger: DebugLogger,
    ) {
        super(`${STRATEGIC_SELL_MISSION_NAME}.${plan.name}`, logger);
    }

    _onAiUpdate(context: MissionContext): MissionAction {
        const sellPlan = this.plan.sellYard;
        if (this.sold || !sellPlan?.enabled || this.options.rushSellEnabled === false) {
            return disbandMission("done");
        }
        const tick = this.options.rushSellTick ?? sellPlan.tick;
        const minCombatants = this.options.rushSellMinCombatants ?? sellPlan.minCombatants;
        if (context.game.getCurrentTick() < tick) {
            return noop();
        }
        const combatants = context.game.getVisibleUnits(
            context.player.name,
            "self",
            (rules) => rules.isSelectableCombatant && rules.type !== ObjectType.Building,
        ).length;
        if (combatants < minCombatants) {
            return noop();
        }
        if (sellPlan.maxFactories !== undefined) {
            const factories = context.game.getVisibleUnits(context.player.name, "self", (rules) => rules.weaponsFactory).length;
            if (factories > sellPlan.maxFactories) {
                return noop();
            }
        }
        const conyards = context.game.getVisibleUnits(context.player.name, "self", (rules) => rules.constructionYard);
        for (const conyard of conyards) {
            context.player.actions.sellObject(conyard);
        }
        this.sold = true;
        return disbandMission("sold-yard");
    }

    getGlobalDebugText(): string | undefined {
        return `${this.plan.name} sell`;
    }

    getPriority(): number {
        return 0;
    }
}

export class StrategicPlanMissionFactory {
    private resolvedPlan: ConcreteStrategicPlan | null | undefined;
    private finisherOptions: StrategicFinisherOptions;

    constructor(private options: StrategicPlanOptions = {}) {
        this.finisherOptions = resolveStrategicFinisherOptions(options);
    }

    maybeCreateMissions(context: SupabotContext, missionController: MissionController, logger: DebugLogger): void {
        if (!enabled(this.options)) {
            return;
        }
        if (this.resolvedPlan === undefined) {
            const planName = resolvePlanName(context, this.options);
            this.resolvedPlan = planName ? PLANS[planName] : null;
            if (this.resolvedPlan) {
                logger(`Strategic plan selected: ${this.resolvedPlan.name}`);
            }
        }
        if (!this.resolvedPlan) {
            return;
        }
        missionController.addMission(new StrategicBuildMission(this.resolvedPlan, this.finisherOptions, logger));
        missionController.addMission(
            new StrategicUnitMission(this.resolvedPlan, this.options, this.finisherOptions, logger),
        );
        if (this.resolvedPlan.sellYard?.enabled) {
            missionController.addMission(new StrategicSellMission(this.resolvedPlan, this.options, logger));
        }
    }
}
