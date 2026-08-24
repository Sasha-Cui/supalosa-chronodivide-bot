import {
    ActionsApi,
    GameApi,
    ObjectType,
    OrderType,
    ProductionApi,
    StanceType,
    UnitData,
    Vector2,
} from "@chronodivide/game-api";
import { SupalosaBot } from "./bot.js";
import { Strategy } from "./strategy/strategy.js";
import { StrongStrategy } from "./strategy/strongStrategy.js";
import { Countries, isOwnedByNeutral, maxBy } from "./logic/common/utils.js";

export type ForceAttackOptions = {
    enabled?: boolean;
    minTick?: number;
    minCombatants?: number;
    combatantAdvantage?: number;
    maxEnemyCombatants?: number;
    orderIntervalTicks?: number;
    directAttackKnownTargets?: boolean;
    maxTargets?: number;
    hfoWestVsEastOnly?: boolean;
};

export type HarassOptions = {
    enabled?: boolean;
    minTick?: number;
    minCombatants?: number;
    maxUnits?: number;
    combatantAdvantage?: number;
    maxEnemyCombatants?: number;
    orderIntervalTicks?: number;
    directAttackKnownTargets?: boolean;
};

export type EmergencyDefenseOptions = {
    enabled?: boolean;
    radius?: number;
    minCombatants?: number;
    maxDefenders?: number;
    orderIntervalTicks?: number;
    directAttackKnownTargets?: boolean;
    mapSignatures?: string[];
    hfoWestVsEastOnly?: boolean;
    hfoBottomOnly?: boolean;
};

export type HarvesterHarassOptions = {
    enabled?: boolean;
    minTick?: number;
    minHarvesters?: number;
    maxHarvesters?: number;
    orderIntervalTicks?: number;
    directAttackKnownTargets?: boolean;
};

export type RouteAttackOptions = {
    enabled?: boolean;
    minTick?: number;
    minCombatants?: number;
    orderIntervalTicks?: number;
    advanceIntervalTicks?: number;
    waypoints?: Vector2[];
    directAttackKnownTargets?: boolean;
    hfoWestVsEastOnly?: boolean;
};

export type HfoCloseoutOptions = {
    enabled?: boolean;
    minTick?: number;
    minUnits?: number;
    maxEnemyBuildings?: number;
    maxEnemyCombatants?: number;
    orderIntervalTicks?: number;
    includeHarvesters?: boolean;
};

export type HfoWestSweepOptions = {
    enabled?: boolean;
    minTick?: number;
    minCombatants?: number;
    combatantAdvantage?: number;
    maxEnemyCombatants?: number;
    orderIntervalTicks?: number;
    advanceIntervalTicks?: number;
    waypoints?: Array<{ x: number; y: number }>;
    directAttackKnownTargets?: boolean;
    maxTargets?: number;
};

export type HfoBottomSweepOptions = {
    enabled?: boolean;
    minTick?: number;
    minCombatants?: number;
    combatantAdvantage?: number;
    maxEnemyCombatants?: number;
    orderIntervalTicks?: number;
    advanceIntervalTicks?: number;
    waypoints?: Array<{ x: number; y: number }>;
    directAttackKnownTargets?: boolean;
    maxTargets?: number;
};

export type HfoEastSweepOptions = HfoWestSweepOptions;

export type HfoBottomPincerOptions = {
    enabled?: boolean;
    minTick?: number;
    minCombatants?: number;
    combatantAdvantage?: number;
    maxEnemyCombatants?: number;
    maxEnemyBuildings?: number;
    orderIntervalTicks?: number;
    advanceIntervalTicks?: number;
    westWaypoints?: Array<{ x: number; y: number }>;
    eastWaypoints?: Array<{ x: number; y: number }>;
    directAttackKnownTargets?: boolean;
    maxTargets?: number;
};

export type HfoBottomCloseoutOptions = {
    enabled?: boolean;
    minTick?: number;
    minCombatants?: number;
    combatantAdvantage?: number;
    maxEnemyCombatants?: number;
    maxEnemyBuildings?: number;
    orderIntervalTicks?: number;
    directAttackKnownTargets?: boolean;
    maxTargets?: number;
    includeHarvesters?: boolean;
};

export type HfoBottomDemolitionOptions = {
    enabled?: boolean;
    minTick?: number;
    minUnits?: number;
    maxUnits?: number;
    minCombatants?: number;
    combatantAdvantage?: number;
    maxEnemyCombatants?: number;
    maxEnemyBuildings?: number;
    orderIntervalTicks?: number;
    routeEnabled?: boolean;
    routeAdvanceIntervalTicks?: number;
    directAttackKnownTargets?: boolean;
    maxTargets?: number;
};

export type HfoBottomHomeGuardOptions = {
    enabled?: boolean;
    untilTick?: number;
    radius?: number;
    orderIntervalTicks?: number;
};

export type HfoWestHomeGuardOptions = {
    enabled?: boolean;
    untilTick?: number;
    radius?: number;
    orderIntervalTicks?: number;
    engageMinCombatants?: number;
    engageCombatantAdvantage?: number;
    alliedOnly?: boolean;
};

export type HfoBottomRetargetMode = "stalled_rotate" | "round_robin" | "top_first" | "split";
export type HfoBottomRetargetOptions = {
    enabled?: boolean;
    minTick?: number;
    minAttackers?: number;
    combatantAdvantage?: number;
    activationStallTicks?: number;
    maxEnemyBuildings?: number;
    maxEnemyCombatants?: number;
    orderIntervalTicks?: number;
    rotationTicks?: number;
    stallTicks?: number;
    mode?: HfoBottomRetargetMode;
};

export type StrongBotOptions = {
    preserveBaselineCore?: boolean;
    forceAttack?: ForceAttackOptions;
    harass?: HarassOptions;
    emergencyDefense?: EmergencyDefenseOptions;
    harvesterHarass?: HarvesterHarassOptions;
    routeAttack?: RouteAttackOptions;
    hfoCloseout?: HfoCloseoutOptions;
    hfoWestSweep?: HfoWestSweepOptions;
    hfoEastSweep?: HfoEastSweepOptions;
    hfoBottomSweep?: HfoBottomSweepOptions;
    hfoBottomPincer?: HfoBottomPincerOptions;
    hfoBottomCloseout?: HfoBottomCloseoutOptions;
    hfoBottomDemolition?: HfoBottomDemolitionOptions;
    hfoBottomHomeGuard?: HfoBottomHomeGuardOptions;
    hfoWestHomeGuard?: HfoWestHomeGuardOptions;
    defaultMapProfiles?: boolean;
    hfoBottomRetarget?: HfoBottomRetargetOptions;
    exactMapTactics?: boolean;
};

const DEFAULT_FORCE_ATTACK_OPTIONS: Required<ForceAttackOptions> = {
    enabled: true,
    minTick: 10800,
    minCombatants: 10,
    combatantAdvantage: -12,
    maxEnemyCombatants: 999,
    orderIntervalTicks: 24,
    directAttackKnownTargets: true,
    maxTargets: 8,
    hfoWestVsEastOnly: true,
};

const DEFAULT_HARASS_OPTIONS: Required<HarassOptions> = {
    enabled: false,
    minTick: 5400,
    minCombatants: 4,
    maxUnits: 4,
    combatantAdvantage: -4,
    maxEnemyCombatants: 8,
    orderIntervalTicks: 120,
    directAttackKnownTargets: true,
};

const DEFAULT_EMERGENCY_DEFENSE_OPTIONS: Required<EmergencyDefenseOptions> = {
    enabled: true,
    radius: 64,
    minCombatants: 1,
    maxDefenders: 999,
    orderIntervalTicks: 3,
    directAttackKnownTargets: true,
    mapSignatures: [],
    hfoWestVsEastOnly: false,
    hfoBottomOnly: false,
};

const DEFAULT_HARVESTER_HARASS_OPTIONS: Required<HarvesterHarassOptions> = {
    enabled: false,
    minTick: 5400,
    minHarvesters: 4,
    maxHarvesters: 1,
    orderIntervalTicks: 120,
    directAttackKnownTargets: true,
};

const DEFAULT_ROUTE_ATTACK_OPTIONS: Required<RouteAttackOptions> = {
    enabled: true,
    minTick: 9000,
    minCombatants: 10,
    orderIntervalTicks: 24,
    advanceIntervalTicks: 480,
    waypoints: [
        new Vector2(76, 95),
        new Vector2(103, 116),
        new Vector2(127, 122),
        new Vector2(147, 121),
        new Vector2(151, 119),
        new Vector2(151, 129),
        new Vector2(140, 134),
    ],
    directAttackKnownTargets: false,
    hfoWestVsEastOnly: true,
};

const DEFAULT_HFO_CLOSEOUT_OPTIONS: Required<HfoCloseoutOptions> = {
    enabled: true,
    minTick: 15000,
    minUnits: 8,
    maxEnemyBuildings: 24,
    maxEnemyCombatants: 999,
    orderIntervalTicks: 4,
    includeHarvesters: true,
};

const DEFAULT_HFO_WEST_SWEEP_OPTIONS: Required<HfoWestSweepOptions> = {
    enabled: true,
    minTick: 9600,
    minCombatants: 10,
    combatantAdvantage: -12,
    maxEnemyCombatants: 999,
    orderIntervalTicks: 18,
    advanceIntervalTicks: 300,
    waypoints: [
        { x: 76, y: 95 },
        { x: 103, y: 116 },
        { x: 127, y: 122 },
        { x: 147, y: 121 },
        { x: 151, y: 119 },
        { x: 151, y: 129 },
        { x: 140, y: 134 },
    ],
    directAttackKnownTargets: false,
    maxTargets: 8,
};

const DEFAULT_HFO_EAST_SWEEP_OPTIONS: Required<HfoEastSweepOptions> = {
    enabled: true,
    minTick: 9000,
    minCombatants: 20,
    combatantAdvantage: 0,
    maxEnemyCombatants: 999,
    orderIntervalTicks: 30,
    advanceIntervalTicks: 900,
    waypoints: [
        { x: 128, y: 122 },
        { x: 103, y: 116 },
        { x: 74, y: 95 },
        { x: 39, y: 82 },
        { x: 39, y: 92 },
        { x: 50, y: 96 },
    ],
    directAttackKnownTargets: false,
    maxTargets: 1,
};

const DEFAULT_HFO_BOTTOM_PINCER_OPTIONS: Required<HfoBottomPincerOptions> = {
    enabled: true,
    minTick: 21000,
    minCombatants: 34,
    combatantAdvantage: 8,
    maxEnemyCombatants: 24,
    maxEnemyBuildings: 20,
    orderIntervalTicks: 15,
    advanceIntervalTicks: 360,
    westWaypoints: [
        { x: 71, y: 142 },
        { x: 53, y: 120 },
        { x: 38, y: 101 },
        { x: 41, y: 81 },
        { x: 57, y: 64 },
        { x: 73, y: 47 },
        { x: 94, y: 32 },
        { x: 88, y: 34 },
    ],
    eastWaypoints: [
        { x: 115, y: 158 },
        { x: 133, y: 142 },
        { x: 150, y: 118 },
        { x: 161, y: 105 },
        { x: 151, y: 75 },
        { x: 142, y: 71 },
        { x: 117, y: 42 },
        { x: 94, y: 32 },
        { x: 88, y: 34 },
    ],
    directAttackKnownTargets: true,
    maxTargets: 3,
};

const DEFAULT_HFO_BOTTOM_SWEEP_OPTIONS: Required<HfoBottomSweepOptions> = {
    enabled: true,
    minTick: 21000,
    minCombatants: 16,
    combatantAdvantage: -8,
    maxEnemyCombatants: 999,
    orderIntervalTicks: 12,
    advanceIntervalTicks: 420,
    waypoints: [
        { x: 88, y: 132 },
        { x: 88, y: 108 },
        { x: 88, y: 82 },
        { x: 88, y: 58 },
        { x: 88, y: 34 },
        { x: 98, y: 42 },
        { x: 78, y: 42 },
    ],
    directAttackKnownTargets: false,
    maxTargets: 10,
};

const DEFAULT_HFO_BOTTOM_CLOSEOUT_OPTIONS: Required<HfoBottomCloseoutOptions> = {
    enabled: true,
    minTick: 26000,
    minCombatants: 16,
    combatantAdvantage: -8,
    maxEnemyCombatants: 999,
    maxEnemyBuildings: 40,
    orderIntervalTicks: 1,
    directAttackKnownTargets: true,
    maxTargets: 16,
    includeHarvesters: true,
};

const DEFAULT_HFO_BOTTOM_DEMOLITION_OPTIONS: Required<HfoBottomDemolitionOptions> = {
    enabled: true,
    minTick: 27600,
    minUnits: 6,
    maxUnits: 18,
    minCombatants: 16,
    combatantAdvantage: -8,
    maxEnemyCombatants: 999,
    maxEnemyBuildings: 40,
    orderIntervalTicks: 1,
    routeEnabled: true,
    routeAdvanceIntervalTicks: 600,
    directAttackKnownTargets: true,
    maxTargets: 16,
};

const HFO_STARTS = new Set(["39,82", "88,34", "151,119", "88,157"]);
const TSUNAMI_STARTS = new Set(["56,99", "100,58", "106,141", "134,98"]);
const SIMPLE_1V1_STARTS = new Set(["37,63", "62,39"]);
const PEAK_OF_PERFECTION_STARTS = new Set(["37,73", "118,73"]);
const PEAK_OF_PERFECTION_WEAK_START = "37,73";
const OTMQ_STARTS = new Set(["48,123", "134,56"]);
const OTMQ_SOUTHWEST_START = "48,123";
const OTMQ_FINAL_SWEEP_MIN_TICK = 42000;
const OTMQ_FINAL_SWEEP_ORDER_INTERVAL = 45;
const OTMQ_FINAL_SWEEP_STAGE_TICKS = 180;
const OTMQ_NE_CLEANUP_MIN_TICK = 60000;
const OTMQ_SMALL_CLEANUP_MIN_TICK = 42000;
const OTMQ_NE_CLEANUP_STAGE_TICKS = 240;
const HFO_WEST_START = "39,82";
const HFO_EAST_START = "151,119";
const HFO_TOP_START = "88,34";
const HFO_BOTTOM_START = "88,157";
const HFO_WEST_CLOSEOUT_STAGE_1 = { x: 110, y: 120 };
const HFO_WEST_CLOSEOUT_STAGE_2 = { x: 140, y: 125 };

const HFO_DEFENSE_BUILDINGS = new Set([
    "NALASR",
    "NAFLAK",
    "TESLA",
    "GAPILL",
    "NASAM",
    "ATESLA",
    "GTGCAN",
    "YAGGUN",
    "YAPSYT",
    "YAGNTC",
]);

const POWER_BUILDINGS = new Set(["NAPOWR", "NAAPWR", "GAPOWR", "GAPOWRUP", "YAPOWR"]);

const HFO_BOTTOM_SIEGE_UNIT_NAMES = new Set(["V3", "SREF"]);

const ISLAND_ATTACK_UNIT_WEIGHTS = new Map([
    ["DRED", 120],
    ["CARRIER", 120],
    ["ZEP", 105],
    ["SREF", 100],
    ["V3", 95],
    ["DEST", 80],
    ["SQD", 70],
    ["DLPH", 70],
    ["SUB", 60],
    ["AEGIS", 45],
    ["HYD", 45],
]);

const HFO_DEMOLITION_UNIT_WEIGHTS = new Map([
    ["V3", 100],
    ["SREF", 100],
    ["APOC", 85],
    ["MGTK", 80],
    ["HTNK", 70],
    ["MTNK", 70],
    ["ZEP", 65],
    ["KIROV", 65],
    ["HTK", 40],
    ["FV", 40],
]);

const HFO_BOTTOM_DEMOLITION_ROUTE = [
    { x: 88, y: 132 },
    { x: 88, y: 108 },
    { x: 88, y: 82 },
    { x: 88, y: 58 },
    { x: 92, y: 40 },
];

const HFO_BOTTOM_TOP_BASE_ROUTE = [
    { x: 88, y: 132 },
    { x: 88, y: 108 },
    { x: 88, y: 82 },
    { x: 88, y: 58 },
    { x: 88, y: 34 },
];

const OTMQ_FINAL_SWEEP_POINTS = [
    { x: 132, y: 58 },
    { x: 145, y: 45 },
    { x: 124, y: 48 },
    { x: 142, y: 70 },
    { x: 118, y: 64 },
    { x: 134, y: 56 },
    { x: 146, y: 56 },
    { x: 128, y: 72 },
    { x: 150, y: 80 },
    { x: 110, y: 52 },
    { x: 154, y: 62 },
    { x: 136, y: 84 },
    { x: 116, y: 76 },
    { x: 154, y: 42 },
    { x: 122, y: 38 },
    { x: 96, y: 90 },
    { x: 86, y: 102 },
    { x: 72, y: 92 },
    { x: 78, y: 72 },
    { x: 102, y: 68 },
    { x: 116, y: 88 },
    { x: 132, y: 100 },
    { x: 148, y: 96 },
    { x: 154, y: 116 },
    { x: 126, y: 124 },
    { x: 96, y: 132 },
    { x: 70, y: 136 },
    { x: 52, y: 124 },
    { x: 42, y: 104 },
    { x: 60, y: 82 },
    { x: 88, y: 58 },
    { x: 116, y: 42 },
    { x: 150, y: 36 },
];

const OTMQ_NE_CLEANUP_POINTS = [
    { x: 130, y: 80 },
    { x: 138, y: 52 },
    { x: 131, y: 52 },
    { x: 130, y: 80 },
    { x: 145, y: 45 },
    { x: 119, y: 27 },
    { x: 117, y: 29 },
    { x: 120, y: 31 },
    { x: 134, y: 56 },
    { x: 146, y: 50 },
    { x: 130, y: 80 },
    { x: 138, y: 52 },
    { x: 138, y: 56 },
    { x: 133, y: 60 },
    { x: 130, y: 55 },
    { x: 131, y: 66 },
    { x: 126, y: 62 },
    { x: 124, y: 48 },
    { x: 128, y: 47 },
    { x: 150, y: 80 },
    { x: 116, y: 44 },
];

const HFO_BOTTOM_INTERCEPT_POINTS = [
    { x: 88, y: 132 },
    { x: 64, y: 124 },
    { x: 112, y: 124 },
    { x: 88, y: 116 },
    { x: 70, y: 106 },
    { x: 106, y: 106 },
];
const HFO_BOTTOM_DEFENSIVE_LINE_POINTS = [
    { x: 88, y: 136 },
    { x: 76, y: 134 },
    { x: 100, y: 134 },
    { x: 68, y: 142 },
    { x: 108, y: 142 },
    { x: 88, y: 146 },
];
const HFO_BOTTOM_INTERCEPT_MIN_TICK = 4800;
const HFO_BOTTOM_INTERCEPT_UNTIL_TICK = 33000;
const HFO_BOTTOM_INTERCEPT_RADIUS = 32;
const HFO_BOTTOM_DIRECT_ENGAGE_Y = 116;

const HFO_BOTTOM_HOME_GUARD_POINTS = [
    { x: 88, y: 154 },
    { x: 96, y: 154 },
    { x: 80, y: 152 },
    { x: 104, y: 151 },
    { x: 88, y: 164 },
];
const HFO_BOTTOM_HOME_GUARD_UNTIL_TICK = 30000;
const HFO_BOTTOM_HOME_GUARD_RADIUS = 62;
const HFO_BOTTOM_HOME_GUARD_DOG_RESERVE = 2;
const HFO_BOTTOM_DOG_INTERCEPT_UNTIL_TICK = 30000;

const DEFAULT_HFO_BOTTOM_HOME_GUARD_OPTIONS: Required<HfoBottomHomeGuardOptions> = {
    enabled: true,
    untilTick: HFO_BOTTOM_HOME_GUARD_UNTIL_TICK,
    radius: HFO_BOTTOM_HOME_GUARD_RADIUS,
    orderIntervalTicks: 8,
};

const HFO_WEST_HOME_GUARD_POINTS = [
    { x: 45, y: 88 },
    { x: 50, y: 92 },
    { x: 43, y: 96 },
    { x: 54, y: 97 },
    { x: 47, y: 101 },
    { x: 38, y: 90 },
];

const DEFAULT_HFO_WEST_HOME_GUARD_OPTIONS: Required<HfoWestHomeGuardOptions> = {
    enabled: true,
    untilTick: 9_600,
    radius: 72,
    orderIntervalTicks: 6,
    engageMinCombatants: 4,
    engageCombatantAdvantage: 0,
    alliedOnly: true,
};

const DEFAULT_HFO_BOTTOM_RETARGET_OPTIONS: Required<HfoBottomRetargetOptions> = {
    enabled: true,
    minTick: 42_000,
    minAttackers: 4,
    combatantAdvantage: 0,
    activationStallTicks: 1_200,
    maxEnemyBuildings: 6,
    maxEnemyCombatants: 4,
    orderIntervalTicks: 6,
    rotationTicks: 600,
    stallTicks: 600,
    mode: "stalled_rotate",
};

const RIVER_RAMPAGE_STARTS = new Set(["98,125", "128,89"]);
const RIVER_RAMPAGE_LOWER_START = "98,125";
const YIN_YANG_STARTS = new Set(["41,102", "107,50"]);
const YIN_YANG_UPPER_START = "107,50";
const ALLIED_COUNTRIES = new Set<string>([
    Countries.USA,
    Countries.KOREA,
    Countries.FRANCE,
    Countries.GERMANY,
    Countries.GREAT_BRITAIN,
]);

const hasAnyDefinedOption = (value: unknown): boolean => {
    if (value === undefined) {
        return false;
    }
    if (!value || typeof value !== "object") {
        return true;
    }
    return Object.values(value).some((entry) => hasAnyDefinedOption(entry));
};

type WeakStartTargetProfile = "default" | "economyBreak" | "defenseBreak";

type WeakStartHomeGuard = {
    starts: Set<string>;
    ownStart: string;
    guardPoints: Array<{ x: number; y: number }>;
    untilTick: number;
    radius: number;
    orderIntervalTicks: number;
    closeoutMinTick?: number;
    closeoutMaxEnemyBuildings?: number;
    closeoutMaxEnemyCombatants?: number;
    closeoutCombatantAdvantage?: number;
    closeoutMaxTargets?: number;
    closeoutBeforeHomeGuard?: boolean;
    closeoutDirectAttackKnownTargets?: boolean;
    closeoutDirectAttackAfterTick?: number;
    closeoutUseGenericOrders?: boolean;
    closeoutGenericAfterTick?: number;
    closeoutRouteMinTick?: number;
    closeoutRouteAdvanceIntervalTicks?: number;
    closeoutRouteMaxEnemyBuildings?: number;
    closeoutRouteMaxEnemyCombatants?: number;
    closeoutRouteMinCombatants?: number;
    closeoutRouteWaypoints?: Array<{ x: number; y: number }>;
    closeoutTargetProfile?: WeakStartTargetProfile;
    pressureMinTick?: number;
    pressureMinCombatants?: number;
    pressureCombatantAdvantage?: number;
    pressureMaxEnemyCombatants?: number;
    pressureOrderIntervalTicks?: number;
    pressureDirectAttackKnownTargets?: boolean;
    pressureMaxTargets?: number;
    pressureTargetProfile?: WeakStartTargetProfile;
    proxyAttackMinTick?: number;
    proxyAttackRadius?: number;
    proxyAttackMinCombatants?: number;
    proxyAttackOrderIntervalTicks?: number;
    proxyAttackDirectAttackKnownTargets?: boolean;
    proxyAttackMaxTargets?: number;
    proxyAttackMaxUnits?: number;
    proxyAttackTargetProfile?: "default" | "defenseBreak";
    proxyAttackVehicleOnly?: boolean;
    anchorEnemyDetectionToGuardPoints?: boolean;
    homeGuardHoldPositionUntilTick?: number;
    homeGuardHoldPositionCountries?: Set<string>;
};

const WEAK_START_HOME_GUARDS: WeakStartHomeGuard[] = [
    {
        starts: OTMQ_STARTS,
        ownStart: OTMQ_SOUTHWEST_START,
        guardPoints: [
            { x: 48, y: 123 },
            { x: 55, y: 121 },
            { x: 43, y: 127 },
            { x: 58, y: 116 },
            { x: 52, y: 132 },
            { x: 61, y: 124 },
        ],
        untilTick: 21000,
        radius: 36,
        orderIntervalTicks: 6,
        closeoutMinTick: 30000,
        closeoutMaxEnemyBuildings: 24,
        closeoutMaxEnemyCombatants: 20,
        closeoutCombatantAdvantage: 6,
        closeoutMaxTargets: 12,
        closeoutDirectAttackKnownTargets: false,
        closeoutDirectAttackAfterTick: 90000,
        closeoutTargetProfile: "economyBreak",
        pressureMinTick: 30000,
        pressureMinCombatants: 24,
        pressureCombatantAdvantage: 4,
        pressureMaxEnemyCombatants: 999,
        pressureOrderIntervalTicks: 45,
        pressureDirectAttackKnownTargets: false,
        pressureMaxTargets: 6,
        proxyAttackMinTick: 15000,
        proxyAttackRadius: 18,
        proxyAttackMinCombatants: 3,
        proxyAttackOrderIntervalTicks: 12,
        proxyAttackDirectAttackKnownTargets: true,
        proxyAttackMaxTargets: 1,
        proxyAttackVehicleOnly: true,
    },
    {
        starts: new Set(["27,50", "82,87"]),
        ownStart: "27,50",
        guardPoints: [
            { x: 31, y: 54 },
            { x: 34, y: 56 },
            { x: 28, y: 52 },
            { x: 25, y: 52 },
            { x: 32, y: 50 },
        ],
        untilTick: 18000,
        radius: 30,
        orderIntervalTicks: 6,
        closeoutMinTick: 22000,
        closeoutMaxEnemyBuildings: 24,
        closeoutMaxEnemyCombatants: 16,
        closeoutCombatantAdvantage: 6,
        closeoutMaxTargets: 8,
        closeoutDirectAttackKnownTargets: false,
        closeoutDirectAttackAfterTick: 30000,
        closeoutTargetProfile: "economyBreak",
        pressureMinTick: 12000,
        pressureMinCombatants: 10,
        pressureCombatantAdvantage: 0,
        pressureMaxEnemyCombatants: 999,
        pressureOrderIntervalTicks: 36,
        pressureDirectAttackKnownTargets: false,
        pressureMaxTargets: 4,
        proxyAttackMinTick: 7200,
        proxyAttackRadius: 42,
        proxyAttackMinCombatants: 4,
        proxyAttackOrderIntervalTicks: 8,
        proxyAttackDirectAttackKnownTargets: true,
        proxyAttackMaxTargets: 4,
    },
    {
        starts: new Set(["47,46", "86,85"]),
        ownStart: "47,46",
        guardPoints: [
            { x: 48, y: 49 },
            { x: 50, y: 49 },
            { x: 52, y: 48 },
            { x: 46, y: 49 },
            { x: 54, y: 47 },
            { x: 49, y: 52 },
        ],
        untilTick: 18000,
        radius: 36,
        orderIntervalTicks: 6,
        closeoutMinTick: 18000,
        closeoutMaxEnemyBuildings: 24,
        closeoutMaxEnemyCombatants: 18,
        closeoutCombatantAdvantage: 0,
        closeoutMaxTargets: 12,
        closeoutBeforeHomeGuard: true,
        closeoutDirectAttackKnownTargets: true,
        closeoutDirectAttackAfterTick: 18000,
        closeoutUseGenericOrders: true,
        closeoutTargetProfile: "default",
        pressureMinTick: 8400,
        pressureMinCombatants: 8,
        pressureCombatantAdvantage: -2,
        pressureMaxEnemyCombatants: 999,
        pressureOrderIntervalTicks: 18,
        pressureDirectAttackKnownTargets: true,
        pressureMaxTargets: 6,
        proxyAttackMinTick: 6600,
        proxyAttackRadius: 48,
        proxyAttackMinCombatants: 4,
        proxyAttackOrderIntervalTicks: 8,
        proxyAttackDirectAttackKnownTargets: true,
        proxyAttackMaxTargets: 6,
    },
    {
        starts: new Set(["47,46", "86,85"]),
        ownStart: "86,85",
        guardPoints: [
            { x: 82, y: 82 },
            { x: 86, y: 82 },
            { x: 84, y: 84 },
            { x: 88, y: 84 },
            { x: 80, y: 86 },
            { x: 82, y: 86 },
            { x: 90, y: 86 },
            { x: 86, y: 88 },
        ],
        untilTick: 24000,
        radius: 52,
        orderIntervalTicks: 6,
        closeoutMinTick: 24000,
        closeoutMaxEnemyBuildings: 24,
        closeoutMaxEnemyCombatants: 18,
        closeoutCombatantAdvantage: 8,
        closeoutMaxTargets: 8,
        closeoutDirectAttackKnownTargets: false,
        closeoutDirectAttackAfterTick: 30000,
        closeoutTargetProfile: "economyBreak",
        pressureMinTick: 12000,
        pressureMinCombatants: 12,
        pressureCombatantAdvantage: 0,
        pressureMaxEnemyCombatants: 999,
        pressureOrderIntervalTicks: 36,
        pressureDirectAttackKnownTargets: false,
        pressureMaxTargets: 4,
        proxyAttackMinTick: 9000,
        proxyAttackRadius: 48,
        proxyAttackMinCombatants: 4,
        proxyAttackOrderIntervalTicks: 12,
        proxyAttackDirectAttackKnownTargets: true,
        proxyAttackMaxTargets: 4,
        proxyAttackVehicleOnly: true,
        homeGuardHoldPositionUntilTick: 12000,
        homeGuardHoldPositionCountries: ALLIED_COUNTRIES,
    },
    {
        starts: new Set(["41,102", "107,50"]),
        ownStart: "41,102",
        guardPoints: [
            { x: 43, y: 100 },
            { x: 45, y: 99 },
            { x: 41, y: 103 },
            { x: 39, y: 104 },
            { x: 47, y: 102 },
            { x: 42, y: 107 },
        ],
        untilTick: 18000,
        radius: 36,
        orderIntervalTicks: 6,
        closeoutMinTick: 21000,
        closeoutMaxEnemyBuildings: 24,
        closeoutMaxEnemyCombatants: 18,
        closeoutCombatantAdvantage: 6,
        closeoutMaxTargets: 8,
        closeoutDirectAttackKnownTargets: false,
        closeoutDirectAttackAfterTick: 27000,
        closeoutGenericAfterTick: 24000,
        closeoutTargetProfile: "defenseBreak",
        pressureMinTick: 10800,
        pressureMinCombatants: 10,
        pressureCombatantAdvantage: -2,
        pressureMaxEnemyCombatants: 999,
        pressureOrderIntervalTicks: 36,
        pressureDirectAttackKnownTargets: false,
        pressureMaxTargets: 4,
        proxyAttackMinTick: 7200,
        proxyAttackRadius: 48,
        proxyAttackMinCombatants: 4,
        proxyAttackOrderIntervalTicks: 10,
        proxyAttackDirectAttackKnownTargets: true,
        proxyAttackMaxTargets: 4,
        proxyAttackTargetProfile: "defenseBreak",
    },
    {
        starts: new Set(["41,102", "107,50"]),
        ownStart: "107,50",
        guardPoints: [
            { x: 105, y: 52 },
            { x: 103, y: 54 },
            { x: 107, y: 49 },
            { x: 110, y: 51 },
            { x: 101, y: 57 },
            { x: 111, y: 55 },
        ],
        untilTick: 18000,
        radius: 36,
        orderIntervalTicks: 6,
        closeoutMinTick: 21000,
        closeoutMaxEnemyBuildings: 24,
        closeoutMaxEnemyCombatants: 18,
        closeoutCombatantAdvantage: 6,
        closeoutMaxTargets: 8,
        closeoutDirectAttackKnownTargets: false,
        closeoutDirectAttackAfterTick: 27000,
        closeoutTargetProfile: "economyBreak",
        pressureMinTick: 10800,
        pressureMinCombatants: 10,
        pressureCombatantAdvantage: -2,
        pressureMaxEnemyCombatants: 999,
        pressureOrderIntervalTicks: 36,
        pressureDirectAttackKnownTargets: false,
        pressureMaxTargets: 4,
        proxyAttackMinTick: 7200,
        proxyAttackRadius: 48,
        proxyAttackMinCombatants: 4,
        proxyAttackOrderIntervalTicks: 10,
        proxyAttackDirectAttackKnownTargets: true,
        proxyAttackMaxTargets: 4,
    },
    {
        starts: new Set(["51,97", "96,51"]),
        ownStart: "96,51",
        guardPoints: [
            { x: 94, y: 54 },
            { x: 96, y: 56 },
            { x: 99, y: 55 },
            { x: 92, y: 58 },
            { x: 101, y: 59 },
            { x: 96, y: 51 },
        ],
        untilTick: 24000,
        radius: 48,
        orderIntervalTicks: 6,
        closeoutMinTick: 54000,
        closeoutMaxEnemyBuildings: 16,
        closeoutMaxEnemyCombatants: 10,
        closeoutCombatantAdvantage: 12,
        closeoutMaxTargets: 12,
        closeoutBeforeHomeGuard: true,
        closeoutDirectAttackKnownTargets: false,
        closeoutDirectAttackAfterTick: 54000,
        closeoutGenericAfterTick: 54000,
        closeoutRouteMinTick: 54000,
        closeoutRouteAdvanceIntervalTicks: 900,
        closeoutRouteMaxEnemyBuildings: 16,
        closeoutRouteMaxEnemyCombatants: 10,
        closeoutRouteMinCombatants: 24,
        closeoutRouteWaypoints: [
            { x: 82, y: 84 },
            { x: 66, y: 92 },
            { x: 51, y: 97 },
            { x: 48, y: 80 },
            { x: 45, y: 60 },
            { x: 45, y: 44 },
        ],
        closeoutTargetProfile: "economyBreak",
        pressureMinTick: 36000,
        pressureMinCombatants: 16,
        pressureCombatantAdvantage: 4,
        pressureMaxEnemyCombatants: 999,
        pressureOrderIntervalTicks: 36,
        pressureDirectAttackKnownTargets: false,
        pressureMaxTargets: 8,
        pressureTargetProfile: "economyBreak",
        proxyAttackMinTick: 9600,
        proxyAttackRadius: 54,
        proxyAttackMinCombatants: 4,
        proxyAttackOrderIntervalTicks: 8,
        proxyAttackDirectAttackKnownTargets: true,
        proxyAttackMaxTargets: 5,
        proxyAttackMaxUnits: 18,
        proxyAttackVehicleOnly: false,
        anchorEnemyDetectionToGuardPoints: true,
        homeGuardHoldPositionUntilTick: 24000,
    },
    {
        starts: new Set(["96,64", "111,178"]),
        ownStart: "111,178",
        guardPoints: [
            { x: 111, y: 176 },
            { x: 115, y: 176 },
            { x: 108, y: 178 },
            { x: 113, y: 181 },
            { x: 106, y: 181 },
            { x: 111, y: 178 },
        ],
        untilTick: 24000,
        radius: 54,
        orderIntervalTicks: 6,
        closeoutMinTick: 30000,
        closeoutMaxEnemyBuildings: 24,
        closeoutMaxEnemyCombatants: 18,
        closeoutCombatantAdvantage: 6,
        closeoutMaxTargets: 10,
        closeoutDirectAttackKnownTargets: false,
        closeoutDirectAttackAfterTick: 42000,
        closeoutGenericAfterTick: 54000,
        closeoutTargetProfile: "economyBreak",
        pressureMinTick: 21000,
        pressureMinCombatants: 16,
        pressureCombatantAdvantage: 0,
        pressureMaxEnemyCombatants: 999,
        pressureOrderIntervalTicks: 36,
        pressureDirectAttackKnownTargets: false,
        pressureMaxTargets: 6,
        pressureTargetProfile: "economyBreak",
        proxyAttackMinTick: 8400,
        proxyAttackRadius: 54,
        proxyAttackMinCombatants: 4,
        proxyAttackOrderIntervalTicks: 10,
        proxyAttackDirectAttackKnownTargets: true,
        proxyAttackMaxTargets: 4,
        homeGuardHoldPositionUntilTick: 18000,
    },
    {
        starts: new Set(["50,119", "92,22"]),
        ownStart: "50,119",
        guardPoints: [
            { x: 53, y: 111 },
            { x: 56, y: 109 },
            { x: 56, y: 116 },
            { x: 50, y: 115 },
            { x: 60, y: 97 },
            { x: 62, y: 96 },
            { x: 47, y: 109 },
            { x: 49, y: 118 },
        ],
        untilTick: 12000,
        radius: 58,
        orderIntervalTicks: 6,
        closeoutMinTick: 12000,
        closeoutMaxEnemyBuildings: 20,
        closeoutMaxEnemyCombatants: 12,
        closeoutCombatantAdvantage: 8,
        closeoutMaxTargets: 10,
        closeoutDirectAttackKnownTargets: false,
        closeoutUseGenericOrders: true,
        closeoutTargetProfile: "economyBreak",
        pressureMinTick: 9000,
        pressureMinCombatants: 18,
        pressureCombatantAdvantage: 0,
        pressureMaxEnemyCombatants: 999,
        pressureOrderIntervalTicks: 36,
        pressureDirectAttackKnownTargets: false,
        pressureMaxTargets: 6,
        pressureTargetProfile: "economyBreak",
        proxyAttackMinTick: 6600,
        proxyAttackRadius: 58,
        proxyAttackMinCombatants: 6,
        proxyAttackOrderIntervalTicks: 10,
        proxyAttackDirectAttackKnownTargets: true,
        proxyAttackMaxTargets: 4,
        homeGuardHoldPositionUntilTick: 8400,
    },
    {
        starts: new Set(["50,119", "92,22"]),
        ownStart: "92,22",
        guardPoints: [
            { x: 92, y: 24 },
            { x: 95, y: 24 },
            { x: 90, y: 27 },
            { x: 96, y: 28 },
            { x: 88, y: 31 },
            { x: 92, y: 22 },
        ],
        untilTick: 24000,
        radius: 50,
        orderIntervalTicks: 6,
        closeoutMinTick: 30000,
        closeoutMaxEnemyBuildings: 24,
        closeoutMaxEnemyCombatants: 18,
        closeoutCombatantAdvantage: 6,
        closeoutMaxTargets: 10,
        closeoutDirectAttackKnownTargets: false,
        closeoutDirectAttackAfterTick: 42000,
        closeoutGenericAfterTick: 54000,
        closeoutTargetProfile: "economyBreak",
        pressureMinTick: 24000,
        pressureMinCombatants: 18,
        pressureCombatantAdvantage: 0,
        pressureMaxEnemyCombatants: 999,
        pressureOrderIntervalTicks: 36,
        pressureDirectAttackKnownTargets: false,
        pressureMaxTargets: 6,
        pressureTargetProfile: "economyBreak",
        proxyAttackMinTick: 7200,
        proxyAttackRadius: 50,
        proxyAttackMinCombatants: 4,
        proxyAttackOrderIntervalTicks: 10,
        proxyAttackDirectAttackKnownTargets: true,
        proxyAttackMaxTargets: 4,
        homeGuardHoldPositionUntilTick: 18000,
    },
    {
        starts: new Set(["83,27", "107,161"]),
        ownStart: "107,161",
        guardPoints: [
            { x: 107, y: 158 },
            { x: 111, y: 158 },
            { x: 104, y: 160 },
            { x: 110, y: 162 },
            { x: 103, y: 164 },
            { x: 107, y: 161 },
        ],
        untilTick: 24000,
        radius: 54,
        orderIntervalTicks: 6,
        closeoutMinTick: 27000,
        closeoutMaxEnemyBuildings: 24,
        closeoutMaxEnemyCombatants: 18,
        closeoutCombatantAdvantage: 4,
        closeoutMaxTargets: 10,
        closeoutDirectAttackKnownTargets: false,
        closeoutDirectAttackAfterTick: 42000,
        closeoutGenericAfterTick: 54000,
        closeoutTargetProfile: "economyBreak",
        pressureMinTick: 21000,
        pressureMinCombatants: 16,
        pressureCombatantAdvantage: 0,
        pressureMaxEnemyCombatants: 999,
        pressureOrderIntervalTicks: 36,
        pressureDirectAttackKnownTargets: false,
        pressureMaxTargets: 6,
        pressureTargetProfile: "economyBreak",
        proxyAttackMinTick: 8400,
        proxyAttackRadius: 54,
        proxyAttackMinCombatants: 4,
        proxyAttackOrderIntervalTicks: 10,
        proxyAttackDirectAttackKnownTargets: true,
        proxyAttackMaxTargets: 4,
        homeGuardHoldPositionUntilTick: 18000,
    },
    {
        starts: new Set(["57,98", "152,96"]),
        ownStart: "57,98",
        guardPoints: [
            { x: 57, y: 98 },
            { x: 61, y: 97 },
            { x: 64, y: 103 },
            { x: 52, y: 103 },
        ],
        untilTick: 0,
        radius: 42,
        orderIntervalTicks: 12,
        closeoutMinTick: 36000,
        closeoutMaxEnemyBuildings: 30,
        closeoutMaxEnemyCombatants: 25,
        closeoutCombatantAdvantage: 4,
        closeoutMaxTargets: 12,
        closeoutDirectAttackKnownTargets: false,
        closeoutDirectAttackAfterTick: 54000,
        closeoutTargetProfile: "economyBreak",
        pressureMinTick: 42000,
        pressureMinCombatants: 24,
        pressureCombatantAdvantage: 4,
        pressureMaxEnemyCombatants: 30,
        pressureOrderIntervalTicks: 45,
        pressureDirectAttackKnownTargets: false,
        pressureMaxTargets: 8,
    },
    {
        starts: new Set(["57,98", "152,96"]),
        ownStart: "152,96",
        guardPoints: [
            { x: 152, y: 96 },
            { x: 148, y: 97 },
            { x: 145, y: 103 },
            { x: 157, y: 103 },
        ],
        untilTick: 0,
        radius: 42,
        orderIntervalTicks: 12,
        closeoutMinTick: 36000,
        closeoutMaxEnemyBuildings: 30,
        closeoutMaxEnemyCombatants: 25,
        closeoutCombatantAdvantage: 4,
        closeoutMaxTargets: 12,
        closeoutDirectAttackKnownTargets: false,
        closeoutDirectAttackAfterTick: 54000,
        closeoutTargetProfile: "economyBreak",
        pressureMinTick: 42000,
        pressureMinCombatants: 24,
        pressureCombatantAdvantage: 4,
        pressureMaxEnemyCombatants: 30,
        pressureOrderIntervalTicks: 45,
        pressureDirectAttackKnownTargets: false,
        pressureMaxTargets: 8,
    },
    {
        starts: new Set(["27,92", "82,47", "103,161", "146,122"]),
        ownStart: "103,161",
        guardPoints: [
            { x: 101, y: 158 },
            { x: 101, y: 162 },
            { x: 99, y: 156 },
            { x: 98, y: 162 },
            { x: 104, y: 156 },
            { x: 106, y: 160 },
            { x: 96, y: 151 },
            { x: 103, y: 166 },
        ],
        untilTick: 24000,
        radius: 58,
        orderIntervalTicks: 6,
        closeoutMinTick: 24000,
        closeoutMaxEnemyBuildings: 20,
        closeoutMaxEnemyCombatants: 20,
        closeoutCombatantAdvantage: 8,
        closeoutMaxTargets: 8,
        closeoutDirectAttackKnownTargets: true,
        closeoutTargetProfile: "economyBreak",
    },
    {
        starts: new Set(["31,101", "127,128"]),
        ownStart: "31,101",
        guardPoints: [
            { x: 43, y: 100 },
            { x: 41, y: 101 },
            { x: 45, y: 102 },
            { x: 36, y: 104 },
            { x: 39, y: 105 },
            { x: 39, y: 99 },
            { x: 34, y: 108 },
            { x: 31, y: 105 },
            { x: 42, y: 106 },
        ],
        untilTick: 24000,
        radius: 24,
        orderIntervalTicks: 6,
        closeoutMinTick: 33000,
        closeoutMaxEnemyBuildings: 20,
        closeoutMaxEnemyCombatants: 10,
        closeoutCombatantAdvantage: 16,
        closeoutMaxTargets: 8,
        closeoutDirectAttackKnownTargets: true,
        pressureMinTick: 15000,
        pressureMinCombatants: 12,
        pressureCombatantAdvantage: -2,
        pressureMaxEnemyCombatants: 999,
        pressureOrderIntervalTicks: 45,
        pressureDirectAttackKnownTargets: false,
        pressureMaxTargets: 4,
    },
    {
        starts: new Set(["48,123", "134,56"]),
        ownStart: "48,123",
        guardPoints: [
            { x: 51, y: 118 },
            { x: 53, y: 116 },
            { x: 48, y: 119 },
            { x: 54, y: 121 },
            { x: 56, y: 123 },
            { x: 57, y: 126 },
            { x: 55, y: 121 },
            { x: 51, y: 123 },
        ],
        untilTick: 42000,
        radius: 16,
        orderIntervalTicks: 6,
        closeoutMinTick: 45000,
        closeoutMaxEnemyBuildings: 24,
        closeoutMaxEnemyCombatants: 12,
        closeoutCombatantAdvantage: 12,
        closeoutMaxTargets: 12,
        closeoutDirectAttackKnownTargets: false,
        closeoutDirectAttackAfterTick: 54000,
        closeoutTargetProfile: "economyBreak",
        pressureMinTick: 45000,
        pressureMinCombatants: 40,
        pressureCombatantAdvantage: 10,
        pressureMaxEnemyCombatants: 18,
        pressureOrderIntervalTicks: 45,
        pressureDirectAttackKnownTargets: false,
        pressureMaxTargets: 6,
        proxyAttackMinTick: 15000,
        proxyAttackRadius: 18,
        proxyAttackMinCombatants: 3,
        proxyAttackOrderIntervalTicks: 12,
        proxyAttackDirectAttackKnownTargets: true,
        proxyAttackMaxTargets: 1,
        proxyAttackVehicleOnly: true,
        anchorEnemyDetectionToGuardPoints: true,
    },
];

const definedOptions = <T extends Record<string, unknown>>(options: T | undefined): Partial<T> =>
    Object.fromEntries(Object.entries(options ?? {}).filter(([, value]) => value !== undefined)) as Partial<T>;

export class StrongBot extends SupalosaBot {
    public lastGameApi: GameApi | null = null;
    public lastPlayerActions: ActionsApi | null = null;
    public lastPlayerProduction: ProductionApi | null = null;

    private forceAttackOptions: Required<ForceAttackOptions>;
    private harassOptions: Required<HarassOptions>;
    private emergencyDefenseOptions: Required<EmergencyDefenseOptions>;
    private harvesterHarassOptions: Required<HarvesterHarassOptions>;
    private routeAttackOptions: Required<RouteAttackOptions>;
    private hfoCloseoutOptions: Required<HfoCloseoutOptions>;
    private hfoWestSweepOptions: Required<HfoWestSweepOptions>;
    private hfoEastSweepOptions: Required<HfoEastSweepOptions>;
    private hfoBottomSweepOptions: Required<HfoBottomSweepOptions>;
    private hfoBottomPincerOptions: Required<HfoBottomPincerOptions>;
    private hfoBottomCloseoutOptions: Required<HfoBottomCloseoutOptions>;
    private hfoBottomDemolitionOptions: Required<HfoBottomDemolitionOptions>;
    private hfoBottomHomeGuardOptions: Required<HfoBottomHomeGuardOptions>;
    private hfoWestHomeGuardOptions: Required<HfoWestHomeGuardOptions>;
    private hfoBottomRetargetOptions: Required<HfoBottomRetargetOptions>;
    private lastForceAttackOrderAt = 0;
    private lastHarassOrderAt = 0;
    private lastEmergencyDefenseOrderAt = 0;
    private lastHarvesterHarassOrderAt = 0;
    private lastRouteAttackOrderAt = 0;
    private lastHfoCloseoutOrderAt = 0;
    private lastHfoWestSweepOrderAt = 0;
    private lastHfoEastSweepOrderAt = 0;
    private lastHfoBottomSweepOrderAt = 0;
    private lastHfoBottomPincerOrderAt = 0;
    private lastHfoBottomCloseoutOrderAt = 0;
    private lastHfoBottomDemolitionOrderAt = 0;
    private lastHfoBottomDesperationOrderAt = 0;
    private lastHfoBottomWestExpansionOrderAt = 0;
    private lastHfoBottomTopBaseBreakOrderAt = 0;
    private lastHfoBottomSiegeControlOrderAt = 0;
    private lastHfoBottomChokeInterceptOrderAt = 0;
    private lastHfoLateMopUpOrderAt = 0;
    private lastHfoFinalBuildingOrderAt = 0;
    private lastHfoSideCloseoutOrderAt = 0;
    private lastHfoBottomCriticalCleanupOrderAt = 0;
    private lastHfoBottomHomeGuardOrderAt = 0;
    private lastHfoWestHomeGuardOrderAt = 0;
    private lastHfoBottomRetargetOrderAt = 0;
    private lastHfoBottomRetargetRotationAt = 0;
    private lastHfoBottomRetargetProgressAt = 0;
    private lastHfoBottomRetargetBuildingCount = Number.POSITIVE_INFINITY;
    private lastHfoBottomRetargetHitPoints = Number.POSITIVE_INFINITY;
    private hfoBottomRetargetIndex = 0;
    private hfoBottomRetargetActivated = false;
    private lastWeakStartHomeGuardOrderAt = 0;
    private lastWeakStartCloseoutOrderAt = 0;
    private lastWeakStartPressureOrderAt = 0;
    private lastWeakStartProxyAttackOrderAt = 0;
    private lastIslandTechAttackOrderAt = 0;
    private lastPeakEmergencyDefenseOrderAt = 0;
    private lastPeakCloseoutOrderAt = 0;
    private lastWonGameCloseoutOrderAt = 0;
    private lastOtmqFinalSweepOrderAt = 0;
    private readonly enableDefaultMapProfiles: boolean;
    private readonly enableExactMapTactics: boolean;
    private readonly preserveBaselineCore: boolean;
    private readonly explicitOptionOverrides: StrongBotOptions;

    constructor(
        name: string,
        country: Countries,
        tryAllyWith: string[] = [],
        enableLogging = true,
        strategy: Strategy = new StrongStrategy(),
        options: StrongBotOptions = {},
    ) {
        super(name, country, tryAllyWith, enableLogging, strategy);
        this.explicitOptionOverrides = options;
        this.enableDefaultMapProfiles = options.defaultMapProfiles ?? true;
        this.enableExactMapTactics = options.exactMapTactics ?? true;
        this.preserveBaselineCore = options.preserveBaselineCore ?? false;
        this.forceAttackOptions = { ...DEFAULT_FORCE_ATTACK_OPTIONS, ...definedOptions(options.forceAttack) };
        this.harassOptions = { ...DEFAULT_HARASS_OPTIONS, ...definedOptions(options.harass) };
        const emergencyDefenseOverrides = definedOptions(options.emergencyDefense);
        if (options.emergencyDefense?.enabled !== undefined && emergencyDefenseOverrides.mapSignatures === undefined) {
            emergencyDefenseOverrides.mapSignatures = [];
        }
        this.emergencyDefenseOptions = {
            ...DEFAULT_EMERGENCY_DEFENSE_OPTIONS,
            ...emergencyDefenseOverrides,
        };
        this.harvesterHarassOptions = {
            ...DEFAULT_HARVESTER_HARASS_OPTIONS,
            ...definedOptions(options.harvesterHarass),
        };
        this.routeAttackOptions = {
            ...DEFAULT_ROUTE_ATTACK_OPTIONS,
            ...definedOptions(options.routeAttack),
        };
        this.hfoCloseoutOptions = {
            ...DEFAULT_HFO_CLOSEOUT_OPTIONS,
            ...definedOptions(options.hfoCloseout),
        };
        this.hfoWestSweepOptions = {
            ...DEFAULT_HFO_WEST_SWEEP_OPTIONS,
            ...definedOptions(options.hfoWestSweep),
        };
        this.hfoEastSweepOptions = {
            ...DEFAULT_HFO_EAST_SWEEP_OPTIONS,
            ...definedOptions(options.hfoEastSweep),
        };
        this.hfoBottomSweepOptions = {
            ...DEFAULT_HFO_BOTTOM_SWEEP_OPTIONS,
            ...definedOptions(options.hfoBottomSweep),
        };
        this.hfoBottomPincerOptions = {
            ...DEFAULT_HFO_BOTTOM_PINCER_OPTIONS,
            ...definedOptions(options.hfoBottomPincer),
        };
        this.hfoBottomCloseoutOptions = {
            ...DEFAULT_HFO_BOTTOM_CLOSEOUT_OPTIONS,
            ...definedOptions(options.hfoBottomCloseout),
        };
        this.hfoBottomDemolitionOptions = {
            ...DEFAULT_HFO_BOTTOM_DEMOLITION_OPTIONS,
            ...definedOptions(options.hfoBottomDemolition),
        };
        this.hfoBottomHomeGuardOptions = {
            ...DEFAULT_HFO_BOTTOM_HOME_GUARD_OPTIONS,
            ...definedOptions(options.hfoBottomHomeGuard),
        };
        this.hfoWestHomeGuardOptions = {
            ...DEFAULT_HFO_WEST_HOME_GUARD_OPTIONS,
            ...definedOptions(options.hfoWestHomeGuard),
        };
        this.hfoBottomRetargetOptions = {
            ...DEFAULT_HFO_BOTTOM_RETARGET_OPTIONS,
            ...definedOptions(options.hfoBottomRetarget),
        };
    }

    private applyExplicitOptionOverrides(): void {
        const options = this.explicitOptionOverrides;
        this.forceAttackOptions = { ...this.forceAttackOptions, ...definedOptions(options.forceAttack) };
        this.harassOptions = { ...this.harassOptions, ...definedOptions(options.harass) };
        const emergencyDefenseOverrides = definedOptions(options.emergencyDefense);
        if (options.emergencyDefense?.enabled !== undefined && emergencyDefenseOverrides.mapSignatures === undefined) {
            emergencyDefenseOverrides.mapSignatures = [];
        }
        this.emergencyDefenseOptions = { ...this.emergencyDefenseOptions, ...emergencyDefenseOverrides };
        this.harvesterHarassOptions = { ...this.harvesterHarassOptions, ...definedOptions(options.harvesterHarass) };
        this.routeAttackOptions = { ...this.routeAttackOptions, ...definedOptions(options.routeAttack) };
        this.hfoCloseoutOptions = { ...this.hfoCloseoutOptions, ...definedOptions(options.hfoCloseout) };
        this.hfoWestSweepOptions = { ...this.hfoWestSweepOptions, ...definedOptions(options.hfoWestSweep) };
        this.hfoEastSweepOptions = { ...this.hfoEastSweepOptions, ...definedOptions(options.hfoEastSweep) };
        this.hfoBottomSweepOptions = { ...this.hfoBottomSweepOptions, ...definedOptions(options.hfoBottomSweep) };
        this.hfoBottomPincerOptions = { ...this.hfoBottomPincerOptions, ...definedOptions(options.hfoBottomPincer) };
        this.hfoBottomCloseoutOptions = {
            ...this.hfoBottomCloseoutOptions,
            ...definedOptions(options.hfoBottomCloseout),
        };
        this.hfoBottomDemolitionOptions = {
            ...this.hfoBottomDemolitionOptions,
            ...definedOptions(options.hfoBottomDemolition),
        };
        this.hfoBottomHomeGuardOptions = {
            ...this.hfoBottomHomeGuardOptions,
            ...definedOptions(options.hfoBottomHomeGuard),
        };
        this.hfoWestHomeGuardOptions = {
            ...this.hfoWestHomeGuardOptions,
            ...definedOptions(options.hfoWestHomeGuard),
        };
        this.hfoBottomRetargetOptions = {
            ...this.hfoBottomRetargetOptions,
            ...definedOptions(options.hfoBottomRetarget),
        };
    }

    override onGameStart(game: GameApi): void {
        this.lastGameApi = game;
        this.lastPlayerActions = this.player.actions;
        this.lastPlayerProduction = this.player.production;
        if (this.enableDefaultMapProfiles) {
            if (this.isSimple1v1Map(game)) {
                this.applySimpleInfantryProfile();
            } else if (this.isRiverRampageLowerStart(game)) {
                this.applyRiverRampageLowerProfile();
            } else if (this.isYinYangUpperStart(game)) {
                this.applyYinYangUpperProfile();
            } else if (this.isPeakOfPerfectionWeakStart(game)) {
                this.applyPeakOfPerfectionWeakProfile();
            } else if (this.isOtmqSouthwestStart(game)) {
                this.applyOtmqSouthwestProfile();
            }
        }
        this.applyExplicitOptionOverrides();
        super.onGameStart(game);
    }

    override onGameTick(game: GameApi): void {
        this.lastGameApi = game;
        super.onGameTick(game);
        if (this.enableExactMapTactics && this.maybeHfoBottomRetarget(game)) {
            return;
        }
        if (this.enableExactMapTactics && this.maybeHfoBottomCriticalCleanup(game)) {
            return;
        }
        if (this.enableExactMapTactics && this.maybeHfoBottomHomeGuard(game)) {
            return;
        }
        if (this.enableExactMapTactics && this.maybeOtmqFinalSweep(game)) {
            return;
        }
        if (this.enableExactMapTactics && this.maybeWeakStartCloseout(game, true)) {
            return;
        }
        if (this.enableExactMapTactics && this.maybeWeakStartProxyAttack(game)) {
            return;
        }
        if (this.enableExactMapTactics && this.maybeWeakStartHomeGuard(game)) {
            return;
        }
        if (this.enableExactMapTactics && this.maybeWeakStartCloseout(game)) {
            return;
        }
        if (this.enableExactMapTactics && this.maybePeakCloseout(game)) {
            return;
        }
        if (this.enableExactMapTactics && this.maybeHfoSideCloseout(game)) {
            return;
        }
        if (!this.preserveBaselineCore && this.maybeWonGameCloseout(game)) {
            return;
        }
        if (this.enableExactMapTactics && this.maybePeakEmergencyDefend(game)) {
            return;
        }
        if (this.enableExactMapTactics && this.maybeHfoWestHomeGuard(game)) {
            return;
        }
        if (this.maybeEmergencyDefend(game)) {
            return;
        }
        if (this.enableExactMapTactics && this.maybeHfoBottomChokeIntercept(game)) {
            return;
        }
        if (this.enableExactMapTactics && this.maybeHfoBottomSiegeControl(game)) {
            return;
        }
        if (this.enableExactMapTactics && this.maybeHfoBottomTopBaseBreak(game)) {
            return;
        }
        if (this.enableExactMapTactics && this.maybeHfoBottomLastBuildingCleanup(game)) {
            return;
        }
        if (this.enableExactMapTactics && this.maybeHfoFinalBuildingAttack(game)) {
            return;
        }
        if (this.enableExactMapTactics && this.maybeHfoWestSweep(game)) {
            return;
        }
        if (this.enableExactMapTactics && this.maybeHfoEastSweep(game)) {
            return;
        }
        if (this.enableExactMapTactics && this.maybeHfoBottomDesperationFinish(game)) {
            return;
        }
        if (this.enableExactMapTactics && this.maybeHfoLateMopUp(game)) {
            return;
        }
        if (this.enableExactMapTactics && this.maybeHfoBottomWestExpansionAttack(game)) {
            return;
        }
        if (this.enableExactMapTactics && this.maybeHfoBottomPincer(game)) {
            return;
        }
        if (this.enableExactMapTactics && this.maybeHfoBottomDemolition(game)) {
            return;
        }
        if (this.enableExactMapTactics && this.maybeHfoBottomCloseout(game)) {
            return;
        }
        if (this.enableExactMapTactics && this.maybeHfoBottomSweep(game)) {
            return;
        }
        if (this.enableExactMapTactics && this.maybeHfoCloseout(game)) {
            return;
        }
        if (this.enableExactMapTactics && this.maybeIslandTechAttack(game)) {
            return;
        }
        this.maybeRouteAttack(game);
        this.maybeHarvesterHarass(game);
        this.maybeHarass(game);
        if (this.enableExactMapTactics && this.maybeWeakStartPressure(game)) {
            return;
        }
        this.maybeForceAttack(game);
    }

    private maybeOtmqFinalSweep(game: GameApi): boolean {
        const tick = game.getCurrentTick();
        if (tick < OTMQ_FINAL_SWEEP_MIN_TICK || !this.isOtmqSouthwestStart(game)) {
            return false;
        }

        const enemyCombatants = this.getKnownEnemyCombatUnits(game);
        const enemyBuildings = this.getKnownEnemyBuildings(game);
        const attackers = this.getMobileCombatants(game).filter((unit) => !this.isDogUnit(unit));
        const useSmallCleanup = this.shouldUseOtmqSmallCleanup(tick, attackers, enemyBuildings, enemyCombatants);
        const useLateCleanup = this.shouldUseOtmqLateCleanup(tick, attackers, enemyBuildings, enemyCombatants);
        if (attackers.length < 90 && !useSmallCleanup && !useLateCleanup) {
            return false;
        }
        if (
            !useSmallCleanup &&
            !useLateCleanup &&
            enemyCombatants.length > 0 &&
            attackers.length < enemyCombatants.length + 50
        ) {
            return false;
        }
        if (!useSmallCleanup && !useLateCleanup && enemyBuildings.length > 10 && attackers.length < 110) {
            return false;
        }
        const useFullMapCleanup =
            tick >= 60000 &&
            enemyBuildings.length > 0 &&
            enemyBuildings.length <= 8 &&
            enemyCombatants.length <= 4 &&
            attackers.length >= Math.max(64, enemyCombatants.length + 60);
        const useNeCleanup =
            useSmallCleanup ||
            useLateCleanup ||
            useFullMapCleanup ||
            this.shouldUseOtmqNeCleanup(tick, attackers, enemyBuildings, enemyCombatants);
        if (tick < this.lastOtmqFinalSweepOrderAt + OTMQ_FINAL_SWEEP_ORDER_INTERVAL) {
            return true;
        }

        const preparedAttackers = this.prepareUnitsForAttackMove(attackers);
        if (preparedAttackers.length === 0) {
            return false;
        }

        const canSplitLateTargets =
            useLateCleanup && enemyBuildings.length <= 12 && attackers.length >= enemyCombatants.length + 20;
        const mustClearArmy = enemyCombatants.length >= 8 && !canSplitLateTargets;
        const knownTargets = mustClearArmy
            ? enemyCombatants
            : this.selectWeakStartEconomyBreakTargets([...enemyBuildings, ...enemyCombatants], 16);
        const useDirectSmallCleanup = (useSmallCleanup || canSplitLateTargets) && !mustClearArmy && knownTargets.length > 0;
        const directAttackers = knownTargets.length > 0
            ? preparedAttackers.filter((_, index) => {
                  if (mustClearArmy) {
                      return true;
                  }
                  if (useDirectSmallCleanup) {
                      if (
                          useFullMapCleanup &&
                          enemyCombatants.length === 0 &&
                          enemyBuildings.length > 2 &&
                          enemyBuildings.length <= 8
                      ) {
                          return index % 5 !== 0;
                      }
                      return enemyCombatants.length === 0 && (enemyBuildings.length <= 2 || (tick >= 72000 && enemyBuildings.length <= 8))
                          ? true
                          : index % 4 !== 0;
                  }
                  if (useNeCleanup) {
                      return index % 2 === 0;
                  }
                  return enemyBuildings.length <= 8 ? index % 5 !== 0 : index % 2 === 0;
              })
            : [];
        if (directAttackers.length > 0) {
            this.orderPreparedUnitsToNearestTargets(directAttackers, knownTargets, useDirectSmallCleanup);
        }

        if (useNeCleanup && !mustClearArmy) {
            const cleanupAttackers = directAttackers.length > 0
                ? preparedAttackers.filter((unit) => !directAttackers.includes(unit))
                : preparedAttackers;
            const cleanupUnits = useDirectSmallCleanup
                ? cleanupAttackers
                : cleanupAttackers.length >= 18 ? cleanupAttackers : preparedAttackers;
            if (cleanupUnits.length > 0) {
                if (useFullMapCleanup) {
                    const fullMapUnits = cleanupUnits.length >= 64
                        ? cleanupUnits.filter((_, unitIndex) => unitIndex % 2 === 0)
                        : cleanupUnits;
                    this.orderOtmqFullMapCleanup(game, fullMapUnits, tick);
                } else {
                    this.orderOtmqNeCleanup(game, cleanupUnits, tick);
                }
            }
            this.lastOtmqFinalSweepOrderAt = tick;
            return true;
        }

        const sweepAttackers = mustClearArmy ? [] : preparedAttackers.filter((unit) => !directAttackers.includes(unit));
        const sweepUnits = sweepAttackers.length > 0 ? sweepAttackers : preparedAttackers;
        const groupCount = Math.min(5, Math.max(2, Math.ceil(sweepUnits.length / 14)));
        const stage = Math.floor((tick - OTMQ_FINAL_SWEEP_MIN_TICK) / OTMQ_FINAL_SWEEP_STAGE_TICKS);
        for (let groupIndex = 0; groupIndex < groupCount; groupIndex++) {
            const assignedUnits = sweepUnits
                .filter((_, unitIndex) => unitIndex % groupCount === groupIndex)
                .map((unit) => unit.id);
            if (assignedUnits.length === 0) {
                continue;
            }
            const point = OTMQ_FINAL_SWEEP_POINTS[(stage + groupIndex * 3) % OTMQ_FINAL_SWEEP_POINTS.length];
            if (!game.mapApi.getTile(point.x, point.y)) {
                continue;
            }
            this.player.actions.orderUnits(assignedUnits, OrderType.AttackMove, point.x, point.y);
        }
        this.lastOtmqFinalSweepOrderAt = tick;
        return true;
    }

    private shouldUseOtmqNeCleanup(
        tick: number,
        attackers: UnitData[],
        enemyBuildings: UnitData[],
        enemyCombatants: UnitData[],
    ): boolean {
        if (tick < OTMQ_NE_CLEANUP_MIN_TICK || enemyBuildings.length > 7 || enemyCombatants.length > 12) {
            return false;
        }
        const minAttackers = enemyBuildings.length <= 3 ? 96 : 90;
        if (attackers.length < minAttackers) {
            return false;
        }
        if (enemyCombatants.length > 0 && attackers.length < enemyCombatants.length + 28) {
            return false;
        }
        return true;
    }

    private shouldUseOtmqSmallCleanup(
        tick: number,
        attackers: UnitData[],
        enemyBuildings: UnitData[],
        enemyCombatants: UnitData[],
    ): boolean {
        if (tick < OTMQ_SMALL_CLEANUP_MIN_TICK) {
            return false;
        }
        if (enemyCombatants.length > 8 || enemyBuildings.length > 12) {
            return false;
        }
        if (enemyBuildings.length > 8 && enemyCombatants.length > 2) {
            return false;
        }
        const minAttackers = tick >= 72000 && enemyCombatants.length === 0 && enemyBuildings.length <= 8
            ? 4
            : enemyBuildings.length <= 2 && enemyCombatants.length === 0
              ? 3
              : enemyBuildings.length <= 3 && enemyCombatants.length <= 2
                ? 18
                : enemyBuildings.length <= 12 && enemyCombatants.length <= 2
                  ? 28
                  : enemyBuildings.length <= 8 && enemyCombatants.length <= 6
                    ? Math.max(38, enemyCombatants.length + 34)
                    : 40;
        if (attackers.length < minAttackers) {
            return false;
        }
        if (enemyCombatants.length > 0 && attackers.length < enemyCombatants.length + 24) {
            return false;
        }
        if (enemyBuildings.length > 4 && enemyBuildings.length <= 8) {
            const buildingCleanupMin = enemyCombatants.length === 0 && tick >= 72000
                ? 4
                : enemyCombatants.length <= 6
                  ? Math.max(38, enemyCombatants.length + 34)
                  : 54;
            if (attackers.length < buildingCleanupMin) {
                return false;
            }
        }
        return true;
    }

    private shouldUseOtmqLateCleanup(
        tick: number,
        attackers: UnitData[],
        enemyBuildings: UnitData[],
        enemyCombatants: UnitData[],
    ): boolean {
        if (tick < 66000 || attackers.length < 44 || enemyBuildings.length === 0 || enemyBuildings.length > 12) {
            return false;
        }
        if (enemyCombatants.length > 18) {
            return false;
        }
        if (attackers.length < enemyCombatants.length + 20) {
            return false;
        }
        if (enemyBuildings.length > 8 && attackers.length < 64) {
            return false;
        }
        return true;
    }

    private orderOtmqNeCleanup(game: GameApi, attackers: UnitData[], tick: number): void {
        if (attackers.length === 0) {
            return;
        }
        const validPoints = OTMQ_NE_CLEANUP_POINTS.filter((point) => game.mapApi.getTile(point.x, point.y));
        if (validPoints.length === 0) {
            return;
        }
        const groupCount = attackers.length >= 80 ? 4 : attackers.length >= 50 ? 3 : 2;
        const stage = Math.floor((tick - OTMQ_NE_CLEANUP_MIN_TICK) / OTMQ_NE_CLEANUP_STAGE_TICKS);
        for (let groupIndex = 0; groupIndex < groupCount; groupIndex++) {
            const assignedUnits = attackers
                .filter((_, unitIndex) => unitIndex % groupCount === groupIndex)
                .map((unit) => unit.id);
            if (assignedUnits.length === 0) {
                continue;
            }
            const pointIndex = ((stage + groupIndex) % validPoints.length + validPoints.length) % validPoints.length;
            const point = validPoints[pointIndex];
            this.player.actions.orderUnits(assignedUnits, OrderType.AttackMove, point.x, point.y);
        }
    }

    private orderOtmqFullMapCleanup(game: GameApi, attackers: UnitData[], tick: number): void {
        if (attackers.length === 0) {
            return;
        }
        const validPoints = OTMQ_FINAL_SWEEP_POINTS.filter((point) => game.mapApi.getTile(point.x, point.y));
        if (validPoints.length === 0) {
            return;
        }
        const groupCount = attackers.length >= 100 ? 6 : attackers.length >= 64 ? 5 : 3;
        const stage = Math.floor((tick - OTMQ_FINAL_SWEEP_MIN_TICK) / OTMQ_FINAL_SWEEP_STAGE_TICKS);
        for (let groupIndex = 0; groupIndex < groupCount; groupIndex++) {
            const assignedUnits = attackers
                .filter((_, unitIndex) => unitIndex % groupCount === groupIndex)
                .map((unit) => unit.id);
            if (assignedUnits.length === 0) {
                continue;
            }
            const pointIndex = ((stage + groupIndex * 5) % validPoints.length + validPoints.length) % validPoints.length;
            const point = validPoints[pointIndex];
            this.player.actions.orderUnits(assignedUnits, OrderType.AttackMove, point.x, point.y);
        }
    }

    private maybeHfoBottomChokeIntercept(game: GameApi): boolean {
        const tick = game.getCurrentTick();
        if (
            tick < HFO_BOTTOM_INTERCEPT_MIN_TICK ||
            tick >= HFO_BOTTOM_INTERCEPT_UNTIL_TICK ||
            !this.isHfoBottomVsTop(game)
        ) {
            return false;
        }

        const approachEnemies = this.getKnownEnemyCombatUnits(game)
            .filter((unit) => this.isHfoBottomApproachEnemy(unit))
            .sort(
                (left, right) =>
                    this.getClosestPointDistanceSquared(left, HFO_BOTTOM_INTERCEPT_POINTS) -
                    this.getClosestPointDistanceSquared(right, HFO_BOTTOM_INTERCEPT_POINTS),
            )
            .slice(0, tick < 18000 ? 6 : tick < 26000 ? 10 : 16);
        if (approachEnemies.length === 0) {
            return false;
        }

        if (tick < this.lastHfoBottomChokeInterceptOrderAt + 5) {
            return true;
        }

        const infantryPressure = approachEnemies.some((unit) => this.isInfantryThreat(unit));
        const defenders = this.getMobileCombatants(game)
            .filter((unit) =>
                !this.isDogUnit(unit) || tick < 9000 || (infantryPressure && tick < HFO_BOTTOM_DOG_INTERCEPT_UNTIL_TICK),
            )
            .sort(
                (left, right) =>
                    this.getClosestDistanceSquared(left, approachEnemies) -
                    this.getClosestDistanceSquared(right, approachEnemies),
            );
        const selectedDefenders = tick < 12000 ? defenders.slice(0, 24) : defenders;
        const preparedDefenders = this.prepareUnitsForAttackMove(selectedDefenders);
        const minDefenders = tick < 9000 ? 2 : 4;
        if (preparedDefenders.length < minDefenders) {
            return false;
        }

        const shouldHoldDefensiveLine = tick < 15000 && approachEnemies.every((unit) => unit.tile.ry < 134);
        if (shouldHoldDefensiveLine) {
            preparedDefenders.forEach((unit, index) => {
                const point = HFO_BOTTOM_DEFENSIVE_LINE_POINTS[index % HFO_BOTTOM_DEFENSIVE_LINE_POINTS.length];
                this.player.actions.orderUnits([unit.id], OrderType.Move, point.x, point.y);
            });
        } else if (infantryPressure) {
            const infantryTargets = approachEnemies.filter((unit) => this.isInfantryThreat(unit));
            const dogDefenders = preparedDefenders.filter((unit) => this.isDogUnit(unit));
            const otherDefenders = preparedDefenders.filter((unit) => !this.isDogUnit(unit));
            if (dogDefenders.length > 0 && infantryTargets.length > 0) {
                this.orderPreparedUnitsToNearestTargets(dogDefenders, infantryTargets, true);
            }
            if (otherDefenders.length > 0) {
                this.orderPreparedUnitsToNearestTargets(otherDefenders, approachEnemies, true);
            }
        } else {
            const nonDogDefenders = preparedDefenders.filter((unit) => !this.isDogUnit(unit));
            this.orderPreparedUnitsToNearestTargets(nonDogDefenders, approachEnemies, true);
        }
        this.lastHfoBottomChokeInterceptOrderAt = tick;
        return true;
    }

    private maybeHfoBottomSiegeControl(game: GameApi): boolean {
        const tick = game.getCurrentTick();
        if (tick < 21600 || !this.isHfoBottomVsTop(game)) {
            return false;
        }
        if (tick < this.lastHfoBottomSiegeControlOrderAt + 6) {
            return true;
        }

        const enemyUnits = this.getKnownEnemyUnits(game);
        const enemyBuildings = enemyUnits.filter((unit) => unit.rules.type === ObjectType.Building);
        if (enemyBuildings.length === 0) {
            return false;
        }

        const enemyCombatants = enemyUnits.filter(
            (unit) => !!unit.rules.isSelectableCombatant && !unit.rules.harvester && unit.rules.type !== ObjectType.Building,
        );
        const ownCombatants = this.getMobileCombatants(game);
        const siegeUnits = ownCombatants.filter((unit) => HFO_BOTTOM_SIEGE_UNIT_NAMES.has(unit.rules.name));
        const supportUnits = ownCombatants.filter(
            (unit) => !HFO_BOTTOM_SIEGE_UNIT_NAMES.has(unit.rules.name) && unit.rules.name !== "DOG" && unit.rules.name !== "ADOG",
        );
        const enemyBaseIsSmall = enemyBuildings.length <= 12 || enemyCombatants.length <= 6;
        if (enemyCombatants.length === 0 && (tick >= 30000 || enemyBuildings.length <= 16)) {
            return false;
        }
        const requiredSiegeUnits = tick >= 30000 || enemyBaseIsSmall ? 1 : 2;
        const strongGroundAdvantage = ownCombatants.length >= enemyCombatants.length + (tick >= 30000 ? 4 : 10);
        const canFinishWithoutSiege = enemyBaseIsSmall && ownCombatants.length >= enemyCombatants.length + 12;
        if (siegeUnits.length < requiredSiegeUnits && !canFinishWithoutSiege) {
            return false;
        }
        if (!strongGroundAdvantage && enemyCombatants.length > 12) {
            return false;
        }
        if (enemyCombatants.length > 24 && ownCombatants.length < enemyCombatants.length + 18) {
            return false;
        }

        const siegeTargets = this.selectHfoBottomSiegeTargets(enemyBuildings, tick >= 30000 ? 6 : 4);
        if (siegeTargets.length === 0) {
            return false;
        }

        const useAttackMovePulse = tick % 24 < 12;
        const preparedSiegeUnits = this.prepareUnitsForAttackMove(siegeUnits);
        if (preparedSiegeUnits.length > 0) {
            if (useAttackMovePulse) {
                const anchor = siegeTargets[0];
                this.player.actions.orderUnits(
                    preparedSiegeUnits.map((unit) => unit.id),
                    OrderType.AttackMove,
                    anchor.tile.rx,
                    anchor.tile.ry,
                );
            } else {
                this.orderPreparedUnitsToNearestTargets(preparedSiegeUnits, siegeTargets, true);
            }
        }

        const preparedSupportUnits = this.prepareUnitsForAttackMove(supportUnits);
        if (preparedSupportUnits.length > 0) {
            const enemyTargets = enemyCombatants
                .sort((left, right) => this.getClosestDistanceSquared(left, siegeTargets) - this.getClosestDistanceSquared(right, siegeTargets))
                .slice(0, tick >= 30000 ? 10 : 6);
            if (enemyTargets.length > 0 && (enemyCombatants.length >= 4 || !enemyBaseIsSmall)) {
                this.orderPreparedUnitsToNearestTargets(preparedSupportUnits, enemyTargets, true);
            } else if (enemyBaseIsSmall || tick >= 36000) {
                const anchor = siegeTargets[0];
                this.player.actions.orderUnits(
                    preparedSupportUnits.map((unit) => unit.id),
                    OrderType.AttackMove,
                    anchor.tile.rx,
                    anchor.tile.ry,
                );
            } else {
                const anchor = siegeTargets[0];
                this.player.actions.orderUnits(
                    preparedSupportUnits.map((unit) => unit.id),
                    OrderType.AttackMove,
                    anchor.tile.rx,
                    anchor.tile.ry,
                );
            }
        }

        this.lastHfoBottomSiegeControlOrderAt = tick;
        return preparedSiegeUnits.length > 0 || preparedSupportUnits.length > 0;
    }

    private maybeHfoBottomTopBaseBreak(game: GameApi): boolean {
        const tick = game.getCurrentTick();
        if (tick < 21000 || !this.isHfoBottomVsTop(game)) {
            return false;
        }
        if (tick < this.lastHfoBottomTopBaseBreakOrderAt + 3) {
            return true;
        }

        const enemyUnits = this.getKnownEnemyUnits(game);
        const enemyBuildings = enemyUnits.filter((unit) => unit.rules.type === ObjectType.Building);
        if (enemyBuildings.length === 0) {
            return false;
        }

        const enemyCombatants = this.getKnownEnemyCombatUnits(game);
        const includeHarvesters = tick >= 42000 && enemyCombatants.length === 0 && enemyBuildings.length <= 6;
        const attackers = (includeHarvesters ? this.getHfoCloseoutUnits(game, true) : this.getMobileCombatants(game)).filter(
            (unit) => unit.rules.name !== "DOG" && unit.rules.name !== "ADOG",
        );
        const lateEnemyBaseIsSmall = enemyBuildings.length <= 8 || enemyCombatants.length <= 6;
        const minAttackers = tick >= 30000
            ? lateEnemyBaseIsSmall ? 4 : 22
            : tick >= 24000 ? 14 : 20;
        const requiredAdvantage = tick >= 30000
            ? lateEnemyBaseIsSmall ? -4 : 10
            : tick >= 24000 ? 0 : 4;
        if (attackers.length < minAttackers || attackers.length < enemyCombatants.length + requiredAdvantage) {
            return false;
        }
        if (enemyCombatants.length > 28 && attackers.length < enemyCombatants.length + 18) {
            return false;
        }

        const preparedAttackers = this.prepareUnitsForAttackMove(attackers);
        if (preparedAttackers.length === 0) {
            return true;
        }

        const shouldUseRouteAttack = tick < 24000 || (tick < 30000 && enemyCombatants.length > 8);
        if (shouldUseRouteAttack) {
            const stage = Math.floor((tick - 21000) / 600);
            const waypoint = HFO_BOTTOM_TOP_BASE_ROUTE[Math.min(stage, HFO_BOTTOM_TOP_BASE_ROUTE.length - 1)];
            this.player.actions.orderUnits(
                preparedAttackers.map((unit) => unit.id),
                OrderType.AttackMove,
                waypoint.x,
                waypoint.y,
            );
            this.lastHfoBottomTopBaseBreakOrderAt = tick;
            return true;
        }

        const maxTargets = tick >= 24000 ? 18 : 12;
        const targets = this.selectHfoLateMopUpTargets(enemyUnits, maxTargets);
        this.orderHfoBottomMopUpTargets(game, preparedAttackers, targets, maxTargets);
        this.lastHfoBottomTopBaseBreakOrderAt = tick;
        return true;
    }

    private maybeHfoBottomHomeGuard(game: GameApi): boolean {
        const options = this.hfoBottomHomeGuardOptions;
        if (!options.enabled || !this.isHfoBottomVsTop(game)) {
            return false;
        }

        const importantOwnUnits = this.getImportantOwnUnits(game);
        if (importantOwnUnits.length === 0) {
            return false;
        }

        const radiusSquared = options.radius * options.radius;
        const nearbyEnemies = this.getKnownEnemyCombatUnits(game).filter(
            (unit) => this.getClosestDistanceSquared(unit, importantOwnUnits) <= radiusSquared,
        );
        const tick = game.getCurrentTick();
        if (tick >= options.untilTick && nearbyEnemies.length === 0) {
            return false;
        }

        const allCombatants = this.getMobileCombatants(game);
        const dogUnits = allCombatants
            .filter((unit) => this.isDogUnit(unit))
            .sort((left, right) => {
                const targets = nearbyEnemies.length > 0 ? nearbyEnemies : importantOwnUnits;
                return this.getClosestDistanceSquared(left, targets) - this.getClosestDistanceSquared(right, targets);
            });
        const infantryTargets = nearbyEnemies.filter((unit) => this.isInfantryThreat(unit));
        const reservedDogs = dogUnits.slice(
            0,
            tick < options.untilTick || infantryTargets.length > 0 ? HFO_BOTTOM_HOME_GUARD_DOG_RESERVE : 0,
        );
        const guardUnits = [
            ...allCombatants.filter((unit) => !this.isDogUnit(unit)),
            ...reservedDogs,
        ];
        if (guardUnits.length === 0) {
            return nearbyEnemies.length > 0;
        }

        if (tick < this.lastHfoBottomHomeGuardOrderAt + options.orderIntervalTicks) {
            return true;
        }

        const orderedUnits = this.prepareUnitsForAttackMove(guardUnits);
        if (nearbyEnemies.length > 0) {
            const orderedDogs = orderedUnits.filter((unit) => this.isDogUnit(unit));
            const orderedNonDogs = orderedUnits.filter((unit) => !this.isDogUnit(unit));
            if (orderedDogs.length > 0 && infantryTargets.length > 0) {
                this.orderPreparedUnitsToNearestTargets(orderedDogs, infantryTargets, true);
            } else if (orderedDogs.length > 0) {
                orderedDogs.forEach((unit, index) => {
                    const point = HFO_BOTTOM_HOME_GUARD_POINTS[index % HFO_BOTTOM_HOME_GUARD_POINTS.length];
                    this.player.actions.orderUnits([unit.id], OrderType.Move, point.x, point.y);
                });
            }
            this.orderPreparedUnitsToNearestTargets(orderedNonDogs, nearbyEnemies, true);
        } else {
            orderedUnits.forEach((unit, index) => {
                const point = HFO_BOTTOM_HOME_GUARD_POINTS[index % HFO_BOTTOM_HOME_GUARD_POINTS.length];
                this.player.actions.orderUnits([unit.id], OrderType.Move, point.x, point.y);
            });
        }
        this.lastHfoBottomHomeGuardOrderAt = tick;
        return true;
    }

    private maybeHfoWestHomeGuard(game: GameApi): boolean {
        const options = this.hfoWestHomeGuardOptions;
        if (!options.enabled || !this.isHfoWestVsEast(game)) {
            return false;
        }
        const countryName = (game.getPlayerData(this.name).country as { name?: string } | undefined)?.name;
        if (options.alliedOnly && (countryName === undefined || !ALLIED_COUNTRIES.has(countryName))) {
            return false;
        }

        const importantOwnUnits = this.getImportantOwnUnits(game);
        if (importantOwnUnits.length === 0) {
            return false;
        }
        const radiusSquared = options.radius * options.radius;
        const nearbyEnemies = this.getKnownEnemyCombatUnits(game)
            .filter((unit) => this.getClosestDistanceSquared(unit, importantOwnUnits) <= radiusSquared)
            .sort(
                (left, right) =>
                    this.getClosestDistanceSquared(left, importantOwnUnits) -
                    this.getClosestDistanceSquared(right, importantOwnUnits),
            );
        const tick = game.getCurrentTick();
        if (tick >= options.untilTick && nearbyEnemies.length === 0) {
            return false;
        }

        const guardUnits = this.getMobileCombatants(game);
        if (guardUnits.length === 0) {
            return nearbyEnemies.length > 0 || tick < options.untilTick;
        }
        if (tick < this.lastHfoWestHomeGuardOrderAt + options.orderIntervalTicks) {
            return true;
        }

        const orderedUnits = this.prepareUnitsForAttackMove(guardUnits);
        const canEngage = nearbyEnemies.length > 0 &&
            orderedUnits.length >= options.engageMinCombatants &&
            orderedUnits.length >= nearbyEnemies.length + options.engageCombatantAdvantage;
        if (canEngage) {
            this.orderPreparedUnitsToNearestTargets(orderedUnits, nearbyEnemies, true);
        } else {
            orderedUnits.forEach((unit, index) => {
                const point = HFO_WEST_HOME_GUARD_POINTS[index % HFO_WEST_HOME_GUARD_POINTS.length];
                this.player.actions.orderUnits(
                    [unit.id],
                    OrderType.AttackMove,
                    point.x,
                    point.y,
                );
            });
        }
        this.lastHfoWestHomeGuardOrderAt = tick;
        return true;
    }

    private maybeWeakStartHomeGuard(game: GameApi): boolean {
        const guard = this.getWeakStartHomeGuard(game);
        if (!guard) {
            return false;
        }
        const tick = game.getCurrentTick();
        const importantOwnUnits = [
            ...this.getImportantOwnUnits(game),
            ...game
                .getVisibleUnits(this.name, "self", (rules) => rules.nodBarracks || rules.gdiBarracks)
                .map((id) => game.getUnitData(id))
                .filter((unit): unit is UnitData => !!unit),
        ];
        if (importantOwnUnits.length === 0) {
            return false;
        }
        const radiusSquared = guard.radius * guard.radius;
        const nearbyEnemies = (guard.anchorEnemyDetectionToGuardPoints
            ? this.getKnownEnemyUnits(game).filter((unit) => this.isWeakStartProxyAttackTarget(unit))
            : this.getKnownEnemyCombatUnits(game)
        )
            .filter((unit) =>
                guard.anchorEnemyDetectionToGuardPoints
                    ? this.getClosestPointDistanceSquared(unit, guard.guardPoints) <= radiusSquared
                    : this.getClosestDistanceSquared(unit, importantOwnUnits) <= radiusSquared,
            )
            .sort(
                (left, right) =>
                    this.getWeakStartProxyAttackTargetWeight(right, guard.proxyAttackTargetProfile) -
                    this.getWeakStartProxyAttackTargetWeight(left, guard.proxyAttackTargetProfile),
            )
            .slice(0, guard.anchorEnemyDetectionToGuardPoints ? 8 : Number.POSITIVE_INFINITY);
        if (tick >= guard.untilTick && nearbyEnemies.length === 0) {
            return false;
        }
        const guardUnits = this.getMobileCombatants(game);
        if (guardUnits.length === 0) {
            return nearbyEnemies.length > 0 || tick < guard.untilTick;
        }
        if (tick < this.lastWeakStartHomeGuardOrderAt + guard.orderIntervalTicks) {
            return true;
        }

        this.orderWeakStartHomeGuardUnits(game, guard, guardUnits, nearbyEnemies);
        this.lastWeakStartHomeGuardOrderAt = tick;
        return true;
    }

    private orderWeakStartHomeGuardUnits(
        game: GameApi,
        guard: WeakStartHomeGuard,
        guardUnits: UnitData[],
        nearbyEnemies: UnitData[],
    ): void {
        const tick = game.getCurrentTick();
        const orderedUnits = this.prepareUnitsForAttackMove(guardUnits);
        const holdPositionCountryAllowed = !guard.homeGuardHoldPositionCountries ||
            this.isPrimaryEnemyCountry(game, guard.homeGuardHoldPositionCountries);
        const holdPosition = nearbyEnemies.length > 0 &&
            holdPositionCountryAllowed &&
            guard.homeGuardHoldPositionUntilTick !== undefined &&
            tick < guard.homeGuardHoldPositionUntilTick;
        if (nearbyEnemies.length > 0 && !holdPosition) {
            this.orderPreparedUnitsToNearestTargets(orderedUnits, nearbyEnemies, true);
        } else {
            orderedUnits.forEach((unit, index) => {
                const point = guard.guardPoints[index % guard.guardPoints.length];
                this.player.actions.orderUnits(
                    [unit.id],
                    holdPosition ? OrderType.AttackMove : OrderType.Move,
                    point.x,
                    point.y,
                );
            });
        }
    }

    private maybeWeakStartProxyAttack(game: GameApi): boolean {
        const guard = this.getWeakStartHomeGuard(game);
        if (!guard || guard.proxyAttackMinTick === undefined) {
            return false;
        }

        const tick = game.getCurrentTick();
        if (tick < guard.proxyAttackMinTick) {
            return false;
        }

        const importantOwnUnits = [
            ...this.getImportantOwnUnits(game),
            ...game
                .getVisibleUnits(this.name, "self", (rules) => rules.nodBarracks || rules.gdiBarracks)
                .map((id) => game.getUnitData(id))
                .filter((unit): unit is UnitData => !!unit),
        ];
        const radius = guard.proxyAttackRadius ?? guard.radius;
        const radiusSquared = radius * radius;
        const enemyUnits = this.getKnownEnemyUnits(game);
        const nearbyProxyTargets = enemyUnits
            .filter((unit) => this.isWeakStartProxyAttackTarget(unit))
            .filter((unit) =>
                importantOwnUnits.length > 0
                    ? this.getClosestDistanceSquared(unit, importantOwnUnits) <= radiusSquared
                    : this.getClosestPointDistanceSquared(unit, guard.guardPoints) <= radiusSquared,
            )
            .sort(
                (left, right) =>
                    this.getWeakStartProxyAttackTargetWeight(right, guard.proxyAttackTargetProfile) -
                    this.getWeakStartProxyAttackTargetWeight(left, guard.proxyAttackTargetProfile),
            )
            .slice(0, guard.proxyAttackMaxTargets ?? 4);
        if (nearbyProxyTargets.length === 0) {
            return false;
        }

        const proxyAttackers = this.getMobileCombatants(game)
            .filter((unit) => unit.rules.name !== "DOG" && unit.rules.name !== "ADOG")
            .filter((unit) => !guard.proxyAttackVehicleOnly || unit.rules.name === "HTNK" || unit.rules.name === "MTNK");
        const attackers = guard.proxyAttackMaxUnits === undefined
            ? proxyAttackers
            : proxyAttackers
                .sort(
                    (left, right) =>
                        this.getWeakStartProxyAttackerWeight(left, nearbyProxyTargets) -
                        this.getWeakStartProxyAttackerWeight(right, nearbyProxyTargets),
                )
                .slice(0, guard.proxyAttackMaxUnits);
        if (attackers.length < (guard.proxyAttackMinCombatants ?? 4)) {
            return false;
        }

        const orderIntervalTicks = guard.proxyAttackOrderIntervalTicks ?? 12;
        if (tick < this.lastWeakStartProxyAttackOrderAt + orderIntervalTicks) {
            return true;
        }

        const preparedAttackers = this.prepareUnitsForAttackMove(attackers);
        this.orderPreparedUnitsToNearestTargets(
            preparedAttackers,
            nearbyProxyTargets,
            guard.proxyAttackDirectAttackKnownTargets ?? true,
        );
        if (guard.proxyAttackMaxUnits !== undefined) {
            const proxyAttackerIds = new Set(attackers.map((unit) => unit.id));
            const reserveUnits = this.getMobileCombatants(game).filter((unit) => !proxyAttackerIds.has(unit.id));
            const reserveThreats = this.getKnownEnemyCombatUnits(game).filter((unit) =>
                importantOwnUnits.length > 0
                    ? this.getClosestDistanceSquared(unit, importantOwnUnits) <= guard.radius * guard.radius
                    : this.getClosestPointDistanceSquared(unit, guard.guardPoints) <= guard.radius * guard.radius,
            );
            if (reserveUnits.length > 0 && (reserveThreats.length > 0 || tick < guard.untilTick)) {
                this.orderWeakStartHomeGuardUnits(game, guard, reserveUnits, reserveThreats);
                this.lastWeakStartHomeGuardOrderAt = tick;
            }
        }
        this.lastWeakStartProxyAttackOrderAt = tick;
        return true;
    }

    private maybeWeakStartCloseout(game: GameApi, beforeHomeGuard = false): boolean {
        const guard = this.getWeakStartHomeGuard(game);
        if (!guard) {
            return false;
        }
        if (beforeHomeGuard !== Boolean(guard.closeoutBeforeHomeGuard)) {
            return false;
        }
        const tick = game.getCurrentTick();
        if (tick < (guard.closeoutMinTick ?? 18000)) {
            return false;
        }

        const enemyUnits = this.getKnownEnemyUnits(game);
        const enemyBuildings = enemyUnits.filter((unit) => unit.rules.type === ObjectType.Building);
        if (enemyBuildings.length === 0 || enemyBuildings.length > (guard.closeoutMaxEnemyBuildings ?? 8)) {
            return false;
        }

        const enemyCombatants = enemyUnits.filter(
            (unit) => !!unit.rules.isSelectableCombatant && !unit.rules.harvester && unit.rules.type !== ObjectType.Building,
        );
        if (enemyCombatants.length > (guard.closeoutMaxEnemyCombatants ?? 4)) {
            return false;
        }

        const attackers = this.getMobileCombatants(game).filter(
            (unit) => unit.rules.name !== "DOG" && unit.rules.name !== "ADOG",
        );
        if (attackers.length < Math.max(6, enemyCombatants.length + (guard.closeoutCombatantAdvantage ?? 6))) {
            return false;
        }
        if (tick < this.lastWeakStartCloseoutOrderAt + 15) {
            return true;
        }

        const closeoutTargetProfile = guard.closeoutTargetProfile ?? "default";
        const targets = this.selectWeakStartCloseoutTargets(enemyUnits, guard.closeoutMaxTargets ?? 4, closeoutTargetProfile);
        const preparedAttackers = this.prepareUnitsForAttackMove(attackers);
        const routeWaypoints = guard.closeoutRouteWaypoints ?? [];
        const routeMinTick = guard.closeoutRouteMinTick ?? (guard.closeoutMinTick ?? 18000);
        if (
            routeWaypoints.length > 0 &&
            tick >= routeMinTick &&
            attackers.length >= (guard.closeoutRouteMinCombatants ?? 0) &&
            enemyCombatants.length <= (guard.closeoutRouteMaxEnemyCombatants ?? (guard.closeoutMaxEnemyCombatants ?? 4)) &&
            enemyBuildings.length <= (guard.closeoutRouteMaxEnemyBuildings ?? (guard.closeoutMaxTargets ?? 4))
        ) {
            const stage = Math.floor((tick - routeMinTick) / (guard.closeoutRouteAdvanceIntervalTicks ?? 900));
            if (stage < routeWaypoints.length) {
                const waypoint = routeWaypoints[stage];
                this.player.actions.orderUnits(
                    preparedAttackers.map((unit) => unit.id),
                    OrderType.AttackMove,
                    waypoint.x,
                    waypoint.y,
                );
                this.lastWeakStartCloseoutOrderAt = tick;
                return true;
            }
        }
        if (guard.closeoutUseGenericOrders || (guard.closeoutGenericAfterTick !== undefined && tick >= guard.closeoutGenericAfterTick)) {
            this.orderGenericCloseoutTargets(game, preparedAttackers, targets, guard.closeoutMaxTargets ?? 4, closeoutTargetProfile);
            this.lastWeakStartCloseoutOrderAt = tick;
            return true;
        }
        const directAttack =
            guard.closeoutDirectAttackAfterTick !== undefined && tick >= guard.closeoutDirectAttackAfterTick
                ? true
                : guard.closeoutDirectAttackKnownTargets ?? false;
        if (directAttack && tick % 30 < 10 && targets.length > 0) {
            const target = targets[0];
            this.player.actions.orderUnits(
                preparedAttackers.map((unit) => unit.id),
                OrderType.AttackMove,
                target.tile.rx,
                target.tile.ry,
            );
            this.lastWeakStartCloseoutOrderAt = tick;
            return true;
        }
        this.orderPreparedUnitsToNearestTargets(preparedAttackers, targets, directAttack);
        this.lastWeakStartCloseoutOrderAt = tick;
        return true;
    }

    private maybePeakEmergencyDefend(game: GameApi): boolean {
        if (!this.isPeakOfPerfectionWeakStart(game)) {
            return false;
        }
        const tick = game.getCurrentTick();
        if (tick < this.lastPeakEmergencyDefenseOrderAt + 4) {
            return false;
        }

        const importantOwnUnits = this.getImportantOwnUnits(game);
        if (importantOwnUnits.length === 0) {
            return false;
        }
        const radiusSquared = 54 * 54;
        const nearbyEnemies = this.getKnownEnemyCombatUnits(game)
            .filter((unit) => this.getClosestDistanceSquared(unit, importantOwnUnits) <= radiusSquared)
            .sort(
                (left, right) =>
                    this.getEmergencyDefenseWeight(right, importantOwnUnits) -
                    this.getEmergencyDefenseWeight(left, importantOwnUnits),
            )
            .slice(0, 10);
        if (nearbyEnemies.length === 0) {
            return false;
        }

        const defenders = this.getMobileCombatants(game)
            .filter((unit) => unit.rules.name !== "DOG" && unit.rules.name !== "ADOG")
            .sort((left, right) => this.getClosestDistanceSquared(left, nearbyEnemies) - this.getClosestDistanceSquared(right, nearbyEnemies))
            .slice(0, 40);
        if (defenders.length === 0) {
            return true;
        }

        const preparedDefenders = this.prepareUnitsForAttackMove(defenders);
        this.orderPreparedUnitsToNearestTargets(preparedDefenders, nearbyEnemies, true);
        this.lastPeakEmergencyDefenseOrderAt = tick;
        return true;
    }

    private maybePeakCloseout(game: GameApi): boolean {
        const tick = game.getCurrentTick();
        if (!this.isPeakOfPerfectionWeakStart(game) || tick < 24000) {
            return false;
        }
        const enemyUnits = this.getKnownEnemyUnits(game);
        const enemyBuildings = enemyUnits.filter((unit) => unit.rules.type === ObjectType.Building);
        if (enemyBuildings.length === 0 || enemyBuildings.length > 8) {
            return false;
        }
        const enemyCombatants = enemyUnits.filter(
            (unit) => !!unit.rules.isSelectableCombatant && !unit.rules.harvester && unit.rules.type !== ObjectType.Building,
        );
        if (enemyCombatants.length > 6) {
            return false;
        }

        const attackers = this.getMobileCombatants(game).filter(
            (unit) => unit.rules.name !== "DOG" && unit.rules.name !== "ADOG",
        );
        if (attackers.length < Math.max(8, enemyCombatants.length + 4)) {
            return false;
        }
        if (tick < this.lastPeakCloseoutOrderAt + 12) {
            return true;
        }

        const targets = this.selectWeakStartEconomyBreakTargets(enemyUnits, 8);
        const preparedAttackers = this.prepareUnitsForAttackMove(attackers);
        if (tick >= 30000 && tick % 30 < 10 && targets.length > 0) {
            const target = targets[0];
            this.player.actions.orderUnits(
                preparedAttackers.map((unit) => unit.id),
                OrderType.AttackMove,
                target.tile.rx,
                target.tile.ry,
            );
        } else {
            this.orderPreparedUnitsToNearestTargets(preparedAttackers, targets, tick >= 30000);
        }
        this.lastPeakCloseoutOrderAt = tick;
        return true;
    }

    private maybeWonGameCloseout(game: GameApi): boolean {
        const tick = game.getCurrentTick();
        if (tick < 18000) {
            return false;
        }

        const enemyUnits = this.getKnownEnemyUnits(game);
        const enemyBuildings = enemyUnits.filter((unit) => unit.rules.type === ObjectType.Building);
        if (enemyBuildings.length === 0) {
            return false;
        }
        const enemyCombatants = enemyUnits.filter(
            (unit) => !!unit.rules.isSelectableCombatant && !unit.rules.harvester && unit.rules.type !== ObjectType.Building,
        );
        const includeHarvesters = tick >= 48000 && enemyCombatants.length <= 2 && enemyBuildings.length <= 16;
        const attackers = (includeHarvesters ? this.getHfoCloseoutUnits(game, true) : this.getMobileCombatants(game)).filter(
            (unit) => unit.rules.name !== "DOG" && unit.rules.name !== "ADOG",
        );
        const armyLead = attackers.length - enemyCombatants.length;
        const enemyIsNearlyDead = enemyCombatants.length === 0 || (enemyCombatants.length <= 2 && armyLead >= 18);
        const maxEnemyBuildings = enemyIsNearlyDead
            ? tick >= 60000 ? 36 : tick >= 42000 ? 28 : tick >= 30000 ? 18 : 10
            : tick >= 72000 ? 30 : tick >= 42000 ? 18 : 6;
        if (enemyBuildings.length > maxEnemyBuildings) {
            return false;
        }
        const maxEnemyCombatants = tick >= 60000 ? 10 : tick >= 36000 ? 6 : 2;
        if (enemyCombatants.length > maxEnemyCombatants) {
            return false;
        }

        const minAttackers = enemyIsNearlyDead
            ? tick >= 42000 ? 6 : 10
            : tick >= 60000 ? 4 : tick >= 42000 ? 6 : tick >= 30000 ? 8 : 12;
        const combatantAdvantage = enemyIsNearlyDead ? 4 : tick >= 60000 ? 2 : tick >= 36000 ? 4 : 8;
        if (attackers.length < Math.max(minAttackers, enemyCombatants.length + combatantAdvantage)) {
            return false;
        }
        if (tick < this.lastWonGameCloseoutOrderAt + 8) {
            return true;
        }

        const targetLimit = enemyIsNearlyDead ? 20 : tick >= 60000 ? 16 : tick >= 36000 ? 12 : 8;
        const targets = this.selectWeakStartEconomyBreakTargets(
            [...enemyBuildings, ...enemyCombatants],
            Math.min(targetLimit, enemyBuildings.length + enemyCombatants.length),
        );
        this.orderGenericCloseoutTargets(game, attackers, targets.length > 0 ? targets : enemyBuildings, targetLimit);
        this.lastWonGameCloseoutOrderAt = tick;
        return true;
    }

    private maybeHfoSideCloseout(game: GameApi): boolean {
        const tick = game.getCurrentTick();
        if (tick < 24000 || (!this.isHfoWestVsEast(game) && !this.isHfoEastVsWest(game))) {
            return false;
        }

        const enemyUnits = this.getKnownEnemyUnits(game);
        const enemyBuildings = enemyUnits.filter((unit) => unit.rules.type === ObjectType.Building);
        if (enemyBuildings.length === 0 || enemyBuildings.length > 18) {
            return false;
        }

        const enemyCombatants = enemyUnits.filter(
            (unit) => !!unit.rules.isSelectableCombatant && !unit.rules.harvester && unit.rules.type !== ObjectType.Building,
        );
        if (enemyCombatants.length > 20) {
            return false;
        }

        const attackers = this.getMobileCombatants(game).filter(
            (unit) => unit.rules.name !== "DOG" && unit.rules.name !== "ADOG",
        );
        if (attackers.length < Math.max(16, enemyCombatants.length + 18)) {
            return false;
        }
        if (tick < this.lastHfoSideCloseoutOrderAt + 8) {
            return true;
        }

        const targets = this.selectWeakStartEconomyBreakTargets(enemyUnits, Math.min(12, enemyBuildings.length));
        const primaryTarget = targets[0] ?? enemyBuildings[0];
        if (!primaryTarget) {
            return false;
        }
        const preparedAttackers = this.prepareUnitsForAttackMove(attackers);
        this.player.actions.orderUnits(
            preparedAttackers.map((unit) => unit.id),
            OrderType.Attack,
            primaryTarget.id,
        );
        this.lastHfoSideCloseoutOrderAt = tick;
        return true;
    }

    private maybeWeakStartPressure(game: GameApi): boolean {
        const guard = this.getWeakStartHomeGuard(game);
        if (!guard || guard.pressureMinTick === undefined) {
            return false;
        }

        const tick = game.getCurrentTick();
        if (tick < guard.pressureMinTick) {
            return false;
        }
        const orderIntervalTicks = guard.pressureOrderIntervalTicks ?? 60;
        if (tick < this.lastWeakStartPressureOrderAt + orderIntervalTicks) {
            return true;
        }

        const attackers = this.getMobileCombatants(game).filter(
            (unit) => unit.rules.name !== "DOG" && unit.rules.name !== "ADOG",
        );
        if (attackers.length < (guard.pressureMinCombatants ?? 12)) {
            return false;
        }

        const enemyCombatants = this.getKnownEnemyCombatUnits(game);
        if (enemyCombatants.length > (guard.pressureMaxEnemyCombatants ?? 999)) {
            return false;
        }
        if (attackers.length < enemyCombatants.length + (guard.pressureCombatantAdvantage ?? 0)) {
            return false;
        }

        const targets = this.selectWeakStartPressureTargets(game, guard.pressureMaxTargets ?? 4, guard.pressureTargetProfile ?? "default");
        if (targets.length === 0) {
            return false;
        }

        const orderedAttackers = this.prepareUnitsForAttackMove(attackers);
        this.orderPreparedUnitsToNearestTargets(
            orderedAttackers,
            targets,
            guard.pressureDirectAttackKnownTargets ?? false,
        );
        this.lastWeakStartPressureOrderAt = tick;
        return true;
    }

    private maybeHfoBottomRetarget(game: GameApi): boolean {
        const options = this.hfoBottomRetargetOptions;
        const tick = game.getCurrentTick();
        if (!options.enabled || tick < options.minTick || !this.isHfoBottomVsTop(game)) {
            return false;
        }
        const enemyBuildings = [...this.getKnownEnemyBuildings(game)];
        const enemyCombatants = this.getKnownEnemyCombatUnits(game);
        if (enemyBuildings.length === 0 || enemyBuildings.length > options.maxEnemyBuildings ||
            enemyCombatants.length > options.maxEnemyCombatants) {
            return false;
        }
        const attackers = this.getMobileCombatants(game).filter((unit) =>
            unit.rules.name !== "DOG" && unit.rules.name !== "ADOG");
        if (attackers.length < options.minAttackers ||
            attackers.length < enemyCombatants.length + options.combatantAdvantage) {
            return false;
        }

        const buildingHitPoints = enemyBuildings.reduce((total, unit) => total + unit.hitPoints, 0);
        const established = Number.isFinite(this.lastHfoBottomRetargetBuildingCount);
        const madeProgress = !established ||
            enemyBuildings.length < this.lastHfoBottomRetargetBuildingCount ||
            buildingHitPoints < this.lastHfoBottomRetargetHitPoints;
        if (madeProgress) {
            this.lastHfoBottomRetargetProgressAt = tick;
            if (established && enemyBuildings.length < this.lastHfoBottomRetargetBuildingCount) {
                this.hfoBottomRetargetIndex = 0;
            }
        }
        this.lastHfoBottomRetargetBuildingCount = enemyBuildings.length;
        this.lastHfoBottomRetargetHitPoints = buildingHitPoints;
        if (!this.hfoBottomRetargetActivated) {
            if (tick < this.lastHfoBottomRetargetProgressAt + options.activationStallTicks) {
                return false;
            }
            this.hfoBottomRetargetActivated = true;
        }

        const sortedBuildings = enemyBuildings.sort((left, right) => {
            if (options.mode === "top_first") {
                const topDifference = Number(this.isHfoTopPocketTarget(right)) - Number(this.isHfoTopPocketTarget(left));
                if (topDifference !== 0) return topDifference;
            }
            const weightDifference = this.getHfoLateMopUpTargetWeight(right) - this.getHfoLateMopUpTargetWeight(left);
            if (weightDifference !== 0) return weightDifference;
            return left.id - right.id;
        });

        if (options.mode === "round_robin" &&
            tick >= this.lastHfoBottomRetargetRotationAt + options.rotationTicks) {
            this.hfoBottomRetargetIndex = (this.hfoBottomRetargetIndex + 1) % sortedBuildings.length;
            this.lastHfoBottomRetargetRotationAt = tick;
        } else if ((options.mode === "stalled_rotate" || options.mode === "top_first") &&
            tick >= this.lastHfoBottomRetargetProgressAt + options.stallTicks) {
            this.hfoBottomRetargetIndex = (this.hfoBottomRetargetIndex + 1) % sortedBuildings.length;
            this.lastHfoBottomRetargetRotationAt = tick;
            this.lastHfoBottomRetargetProgressAt = tick;
        }

        if (tick < this.lastHfoBottomRetargetOrderAt + options.orderIntervalTicks) {
            return true;
        }
        const preparedAttackers = this.prepareUnitsForAttackMove(attackers);
        if (preparedAttackers.length === 0) {
            return true;
        }
        if (options.mode === "split") {
            this.orderPreparedUnitsToNearestTargets(preparedAttackers, sortedBuildings, true);
        } else {
            const target = sortedBuildings[this.hfoBottomRetargetIndex % sortedBuildings.length];
            this.player.actions.orderUnits(
                preparedAttackers.map((unit) => unit.id),
                OrderType.Attack,
                target.id,
            );
        }
        this.lastHfoBottomRetargetOrderAt = tick;
        return true;
    }

    private maybeHfoBottomCriticalCleanup(game: GameApi): boolean {
        const tick = game.getCurrentTick();
        if (tick < 36000 || !this.isHfoBottomVsTop(game)) {
            return false;
        }
        if (tick < this.lastHfoBottomCriticalCleanupOrderAt + 1) {
            return true;
        }

        const enemyUnits = this.getKnownEnemyUnits(game);
        const enemyBuildings = enemyUnits.filter((unit) => unit.rules.type === ObjectType.Building);
        if (enemyBuildings.length === 0 || enemyBuildings.length > 4) {
            return false;
        }

        const enemyCombatants = enemyUnits.filter(
            (unit) => !!unit.rules.isSelectableCombatant && !unit.rules.harvester && unit.rules.type !== ObjectType.Building,
        );
        const maxEnemyCombatants = tick >= 48000 ? 6 : 4;
        if (enemyCombatants.length > maxEnemyCombatants) {
            return false;
        }

        const attackers = this.getHfoCloseoutUnits(game, tick >= 42000).filter(
            (unit) => unit.rules.name !== "DOG" && unit.rules.name !== "ADOG",
        );
        const requiredAdvantage = enemyBuildings.length <= 3 ? 4 : 8;
        if (attackers.length < 4 || attackers.length < enemyCombatants.length + requiredAdvantage) {
            return false;
        }

        const maxTargets = Math.min(4, enemyBuildings.length);
        const targets = this.selectHfoLateMopUpTargets(enemyBuildings, maxTargets);
        this.orderHfoBottomMopUpTargets(game, attackers, targets, maxTargets);
        this.lastHfoBottomCriticalCleanupOrderAt = tick;
        return true;
    }

    private maybeHfoBottomLastBuildingCleanup(game: GameApi): boolean {
        const tick = game.getCurrentTick();
        if (tick < 36000 || !this.isHfoBottomVsTop(game)) {
            return false;
        }

        const enemyUnits = this.getKnownEnemyUnits(game);
        const enemyBuildings = enemyUnits.filter((unit) => unit.rules.type === ObjectType.Building);
        if (enemyBuildings.length === 0 || enemyBuildings.length > 12) {
            return false;
        }

        const enemyCombatants = enemyUnits.filter(
            (unit) => !!unit.rules.isSelectableCombatant && !unit.rules.harvester && unit.rules.type !== ObjectType.Building,
        );
        const maxEnemyCombatants = tick >= 42000 ? 4 : 1;
        if (enemyCombatants.length > maxEnemyCombatants) {
            return false;
        }

        const includeHarvesters = enemyCombatants.length === 0 && tick >= 42000;
        const attackers = (includeHarvesters ? this.getHfoCloseoutUnits(game, true) : this.getMobileCombatants(game)).filter(
            (unit) => unit.rules.name !== "DOG" && unit.rules.name !== "ADOG",
        );
        const minAttackers = enemyCombatants.length === 0 ? 1 : 2;
        if (attackers.length < minAttackers) {
            return false;
        }
        if (tick < this.lastHfoFinalBuildingOrderAt + 1) {
            return true;
        }

        const maxTargets = Math.min(12, enemyUnits.length);
        const targets = this.selectHfoLateMopUpTargets(enemyUnits, maxTargets);
        this.orderHfoBottomMopUpTargets(game, attackers, targets, maxTargets);
        this.lastHfoFinalBuildingOrderAt = tick;
        return true;
    }

    private maybeHfoFinalBuildingAttack(game: GameApi): boolean {
        const tick = game.getCurrentTick();
        if (!this.isHeckFreezesOver(game) || tick < 12000) {
            return false;
        }
        if (tick < this.lastHfoFinalBuildingOrderAt + 1) {
            return true;
        }

        const enemyUnits = this.getKnownEnemyUnits(game);
        const enemyBuildings = enemyUnits.filter((unit) => unit.rules.type === ObjectType.Building);
        const enemyCombatants = enemyUnits.filter(
            (unit) => !!unit.rules.isSelectableCombatant && !unit.rules.harvester && unit.rules.type !== ObjectType.Building,
        );
        const attackers = this.getMobileCombatants(game);
        const bottomVsTop = this.isHfoBottomVsTop(game);
        const maxBuildings = bottomVsTop && tick >= 24000 ? 4 : 2;
        const maxCombatants = bottomVsTop && tick >= 27000 ? 6 : 1;
        const minAttackers = bottomVsTop ? (tick >= 30000 && enemyCombatants.length === 0 ? 1 : tick >= 30000 ? 2 : 8) : 10;

        if (enemyBuildings.length === 0 || enemyBuildings.length > maxBuildings) {
            return false;
        }
        if (enemyCombatants.length > maxCombatants && attackers.length < enemyCombatants.length + 20) {
            return false;
        }
        if (attackers.length < minAttackers) {
            return false;
        }
        const buildingAdvantage = bottomVsTop ? (tick >= 30000 ? 4 : 18) : 30;
        if (enemyBuildings.length >= 2 && attackers.length < enemyCombatants.length + buildingAdvantage) {
            return false;
        }

        const maxTargets = bottomVsTop ? Math.min(12, enemyUnits.length) : enemyUnits.length;
        const targets = this.selectHfoLateMopUpTargets(enemyUnits, maxTargets);
        if (bottomVsTop) {
            this.orderHfoBottomMopUpTargets(game, attackers, targets, maxTargets);
        } else {
            this.orderUnitsToNearestTargets(attackers, targets, true);
        }
        this.lastHfoFinalBuildingOrderAt = tick;
        return true;
    }

    private maybeHfoWestSweep(game: GameApi): boolean {
        const options = this.hfoWestSweepOptions;
        if (!options.enabled || game.getCurrentTick() < options.minTick || !this.isHfoWestVsEast(game)) {
            return false;
        }
        if (game.getCurrentTick() < this.lastHfoWestSweepOrderAt + options.orderIntervalTicks) {
            return true;
        }

        return this.executeStagedSweep(game, options, this.lastHfoWestSweepOrderAt, (tick) => {
            this.lastHfoWestSweepOrderAt = tick;
        });
    }

    private maybeHfoEastSweep(game: GameApi): boolean {
        const options = this.hfoEastSweepOptions;
        if (!options.enabled || game.getCurrentTick() < options.minTick || !this.isHfoEastVsWest(game)) {
            return false;
        }
        if (game.getCurrentTick() < this.lastHfoEastSweepOrderAt + options.orderIntervalTicks) {
            return true;
        }
        return this.executeStagedSweep(game, options, this.lastHfoEastSweepOrderAt, (tick) => {
            this.lastHfoEastSweepOrderAt = tick;
        });
    }

    private maybeHfoBottomSweep(game: GameApi): boolean {
        const options = this.hfoBottomSweepOptions;
        if (!options.enabled || game.getCurrentTick() < options.minTick || !this.isHfoBottomVsTop(game)) {
            return false;
        }
        if (game.getCurrentTick() < this.lastHfoBottomSweepOrderAt + options.orderIntervalTicks) {
            return true;
        }
        return this.executeStagedSweep(game, options, this.lastHfoBottomSweepOrderAt, (tick) => {
            this.lastHfoBottomSweepOrderAt = tick;
        });
    }

    private maybeHfoBottomPincer(game: GameApi): boolean {
        const options = this.hfoBottomPincerOptions;
        if (!options.enabled || game.getCurrentTick() < options.minTick || !this.isHfoBottomVsTop(game)) {
            return false;
        }

        const ownCombatants = this.getMobileCombatants(game);
        if (ownCombatants.length < options.minCombatants) {
            return false;
        }

        const enemyCombatants = this.getKnownEnemyCombatUnits(game);
        if (enemyCombatants.length > options.maxEnemyCombatants) {
            return false;
        }
        if (ownCombatants.length < enemyCombatants.length + options.combatantAdvantage) {
            return false;
        }

        const enemyBuildings = this.getKnownEnemyBuildings(game);
        if (enemyBuildings.length === 0 || enemyBuildings.length > options.maxEnemyBuildings) {
            return false;
        }
        if (game.getCurrentTick() < this.lastHfoBottomPincerOrderAt + options.orderIntervalTicks) {
            return true;
        }

        const stage = Math.floor((game.getCurrentTick() - options.minTick) / options.advanceIntervalTicks);
        const maxRouteStages = Math.max(options.westWaypoints.length, options.eastWaypoints.length);
        const { westUnits, eastUnits } = this.splitBottomPincerUnits(ownCombatants);
        if (stage < maxRouteStages) {
            this.orderPincerGroupToWaypoint(game, westUnits, options.westWaypoints, stage);
            this.orderPincerGroupToWaypoint(game, eastUnits, options.eastWaypoints, stage);
            this.lastHfoBottomPincerOrderAt = game.getCurrentTick();
            return true;
        }

        const targets = enemyBuildings
            .sort((left, right) => this.getHfoCloseoutTargetWeight(right) - this.getHfoCloseoutTargetWeight(left))
            .slice(0, Math.max(1, options.maxTargets));
        const attackers = this.prepareUnitsForAttackMove(ownCombatants);
        if (attackers.length === 0) {
            return true;
        }
        targets.forEach((target, index) => {
            const assignedUnits = attackers
                .filter((_, unitIndex) => unitIndex % targets.length === index)
                .map((unit) => unit.id);
            if (assignedUnits.length === 0) {
                return;
            }
            if (options.directAttackKnownTargets) {
                this.player.actions.orderUnits(assignedUnits, OrderType.Attack, target.id);
            } else {
                this.player.actions.orderUnits(assignedUnits, OrderType.AttackMove, target.tile.rx, target.tile.ry);
            }
        });
        this.lastHfoBottomPincerOrderAt = game.getCurrentTick();
        return true;
    }

    private splitBottomPincerUnits(units: UnitData[]): { westUnits: UnitData[]; eastUnits: UnitData[] } {
        let westUnits = units.filter((unit) => unit.tile.rx <= 88);
        let eastUnits = units.filter((unit) => unit.tile.rx > 88);
        if (westUnits.length === 0 || eastUnits.length === 0) {
            westUnits = units.filter((_, index) => index % 2 === 0);
            eastUnits = units.filter((_, index) => index % 2 === 1);
        }
        return { westUnits, eastUnits };
    }

    private orderPincerGroupToWaypoint(
        game: GameApi,
        units: UnitData[],
        waypoints: Array<{ x: number; y: number }>,
        stage: number,
    ): void {
        if (units.length === 0 || waypoints.length === 0) {
            return;
        }
        const waypoint = waypoints[Math.min(stage, waypoints.length - 1)];
        const attackers = this.prepareUnitsForAttackMove(units);
        if (attackers.length === 0) {
            return;
        }
        this.player.actions.orderUnits(
            attackers.map((unit) => unit.id),
            OrderType.AttackMove,
            waypoint.x,
            waypoint.y,
        );
        this.lastHfoBottomPincerOrderAt = game.getCurrentTick();
    }

    private maybeHfoBottomCloseout(game: GameApi): boolean {
        const options = this.hfoBottomCloseoutOptions;
        if (!options.enabled || game.getCurrentTick() < options.minTick || !this.isHfoBottomVsTop(game)) {
            return false;
        }

        const enemyCombatants = this.getKnownEnemyCombatUnits(game);
        if (enemyCombatants.length > options.maxEnemyCombatants) {
            return false;
        }

        const enemyBuildings = this.getKnownEnemyBuildings(game);
        if (enemyBuildings.length === 0 || enemyBuildings.length > options.maxEnemyBuildings) {
            return false;
        }

        const includeHarvesters = options.includeHarvesters &&
            game.getCurrentTick() >= 42000 &&
            enemyCombatants.length === 0 &&
            enemyBuildings.length <= 6;
        const closeoutUnits = this.getHfoCloseoutUnits(game, includeHarvesters);
        if (closeoutUnits.length < options.minCombatants) {
            return false;
        }
        if (closeoutUnits.length < enemyCombatants.length + options.combatantAdvantage) {
            return false;
        }
        if (game.getCurrentTick() < this.lastHfoBottomCloseoutOrderAt + options.orderIntervalTicks) {
            return true;
        }

        const targets = this.selectHfoLateMopUpTargets(this.getKnownEnemyUnits(game), Math.max(1, options.maxTargets));
        this.orderHfoBottomMopUpTargets(game, closeoutUnits, targets, Math.max(1, options.maxTargets));
        this.lastHfoBottomCloseoutOrderAt = game.getCurrentTick();
        return true;
    }

    private maybeHfoBottomDesperationFinish(game: GameApi): boolean {
        const tick = game.getCurrentTick();
        if (tick < 25200 || !this.isHfoBottomVsTop(game)) {
            return false;
        }

        const enemyBuildings = this.getKnownEnemyBuildings(game);
        if (enemyBuildings.length === 0 || enemyBuildings.length > 20) {
            return false;
        }

        const enemyCombatants = this.getKnownEnemyCombatUnits(game);
        const attackers = this.getMobileCombatants(game);
        const lateEnemyBaseIsSmall = enemyBuildings.length <= 8 || enemyCombatants.length <= 6;
        const minAttackers = tick >= 30000
            ? lateEnemyBaseIsSmall ? 4 : 22
            : tick >= 28800 ? 24 : 36;
        const requiredAdvantage = tick >= 30000
            ? lateEnemyBaseIsSmall ? -4 : 10
            : tick >= 28800 ? 8 : 14;
        if (attackers.length < minAttackers || attackers.length < enemyCombatants.length + requiredAdvantage) {
            return false;
        }
        if (enemyCombatants.length > 32 && attackers.length < enemyCombatants.length + 28) {
            return false;
        }
        if (tick < this.lastHfoBottomDesperationOrderAt + 1) {
            return true;
        }

        const maxTargets = tick >= 28800 ? 18 : 12;
        const targets = this.selectHfoLateMopUpTargets(this.getKnownEnemyUnits(game), maxTargets);
        this.orderHfoBottomMopUpTargets(game, attackers, targets, maxTargets);
        this.lastHfoBottomDesperationOrderAt = tick;
        return true;
    }

    private maybeHfoLateMopUp(game: GameApi): boolean {
        const tick = game.getCurrentTick();
        const bottomVsTop = this.isHfoBottomVsTop(game);
        if (!this.isHeckFreezesOver(game) || tick < (bottomVsTop ? 24000 : 25200)) {
            return false;
        }

        const attackers = this.getMobileCombatants(game);
        if (attackers.length < (bottomVsTop && tick >= 30000 ? 4 : 8)) {
            return false;
        }

        const enemyUnits = this.getKnownEnemyUnits(game);
        if (enemyUnits.length === 0) {
            return false;
        }

        const enemyBuildings = enemyUnits.filter((unit) => unit.rules.type === ObjectType.Building);
        const enemyCombatants = enemyUnits.filter(
            (unit) => !!unit.rules.isSelectableCombatant && !unit.rules.harvester && unit.rules.type !== ObjectType.Building,
        );
        const maxEnemyBuildings = bottomVsTop ? (tick >= 27000 ? 14 : 8) : (tick >= 28800 ? 8 : 4);
        const maxEnemyUnits = bottomVsTop ? (tick >= 27000 ? 48 : 28) : (tick >= 28800 ? 28 : 14);
        if (enemyBuildings.length > maxEnemyBuildings && enemyUnits.length > maxEnemyUnits) {
            return false;
        }

        const lateEnemyBaseIsSmall = enemyBuildings.length <= 8 || enemyCombatants.length <= 6;
        const requiredAdvantage = bottomVsTop
            ? tick >= 30000 ? lateEnemyBaseIsSmall ? -4 : 10 : tick >= 27000 ? 2 : 8
            : tick >= 28800 ? 4 : 8;
        if (attackers.length < enemyCombatants.length + requiredAdvantage) {
            return false;
        }
        if (enemyCombatants.length > (tick >= 28800 ? 24 : 14) && attackers.length < enemyCombatants.length + 20) {
            return false;
        }
        if (tick < this.lastHfoLateMopUpOrderAt + 1) {
            return true;
        }

        const maxTargets = bottomVsTop ? (tick >= 27000 ? 16 : 10) : (tick >= 28800 ? 12 : 6);
        const targets = this.selectHfoLateMopUpTargets(enemyUnits, maxTargets);
        if (bottomVsTop) {
            this.orderHfoBottomMopUpTargets(game, attackers, targets, maxTargets);
        } else {
            this.orderUnitsToNearestTargets(attackers, targets, true);
        }
        this.lastHfoLateMopUpOrderAt = tick;
        return true;
    }

    private maybeHfoBottomWestExpansionAttack(game: GameApi): boolean {
        const tick = game.getCurrentTick();
        if (tick < 18000 || !this.isHfoBottomVsTop(game)) {
            return false;
        }

        const westTargets = this.getKnownEnemyUnits(game).filter(
            (unit) => unit.tile.rx <= 62 && unit.tile.ry >= 65 && unit.tile.ry <= 112,
        );
        const westBuildings = westTargets.filter((unit) => unit.rules.type === ObjectType.Building);
        if (westBuildings.length === 0) {
            return false;
        }

        const attackers = this.getMobileCombatants(game);
        const enemyCombatants = this.getKnownEnemyCombatUnits(game);
        const importantOwnUnits = this.getImportantOwnUnits(game);
        const nearbyBaseThreats = enemyCombatants.filter(
            (unit) => this.getClosestDistanceSquared(unit, importantOwnUnits) <= 48 * 48,
        );
        if (tick < 24000 && nearbyBaseThreats.length > 0 && attackers.length < nearbyBaseThreats.length + 14) {
            return false;
        }

        const minAttackers = tick < 21000 ? 18 : tick < 25200 ? 24 : 40;
        const requiredAdvantage = tick < 21000 ? 6 : tick < 25200 ? 4 : 20;
        const maxEnemyCombatants = tick < 25200 ? 28 : 16;
        if (
            enemyCombatants.length > maxEnemyCombatants ||
            attackers.length < minAttackers ||
            attackers.length < enemyCombatants.length + requiredAdvantage
        ) {
            return false;
        }
        if (tick < this.lastHfoBottomWestExpansionOrderAt + 6) {
            return true;
        }

        const strikeSize = tick < 21000
            ? Math.min(18, Math.max(8, Math.floor(attackers.length * 0.35)))
            : tick < 25200
              ? Math.min(28, Math.max(12, Math.floor(attackers.length * 0.4)))
              : Math.min(72, Math.max(28, Math.floor(attackers.length * 0.55)));
        const strikeGroup = attackers
            .sort((left, right) => this.getClosestDistanceSquared(left, westBuildings) - this.getClosestDistanceSquared(right, westBuildings))
            .slice(0, strikeSize);
        const maxTargets = tick < 25200 ? 6 : 8;
        const targets = this.selectHfoLateMopUpTargets(westTargets, maxTargets);
        this.orderHfoBottomMopUpTargets(game, strikeGroup, targets, maxTargets);
        this.lastHfoBottomWestExpansionOrderAt = tick;
        return true;
    }

    private maybeHfoBottomDemolition(game: GameApi): boolean {
        const options = this.hfoBottomDemolitionOptions;
        if (!options.enabled || game.getCurrentTick() < options.minTick || !this.isHfoBottomVsTop(game)) {
            return false;
        }

        const enemyBuildings = this.getKnownEnemyBuildings(game);
        if (enemyBuildings.length === 0) {
            return false;
        }

        const enemyCombatants = this.getKnownEnemyCombatUnits(game);
        const ownCombatants = this.getMobileCombatants(game);
        if (ownCombatants.length < options.minCombatants) {
            return false;
        }

        const demolitionUnits = this.getHfoDemolitionUnits(game);
        if (demolitionUnits.length < options.minUnits) {
            return false;
        }
        if (game.getCurrentTick() < this.lastHfoBottomDemolitionOrderAt + options.orderIntervalTicks) {
            return true;
        }

        if (enemyBuildings.length === 1 && enemyCombatants.length === 0 && ownCombatants.length >= 20) {
            this.orderUnitsToNearestTargets(ownCombatants, enemyBuildings, true);
            this.lastHfoBottomDemolitionOrderAt = game.getCurrentTick();
            return true;
        }

        const selectedUnits = this.selectHfoDemolitionUnits(demolitionUnits, enemyBuildings, options.maxUnits);
        if (enemyBuildings.length > options.maxEnemyBuildings || enemyCombatants.length > options.maxEnemyCombatants) {
            if (!options.routeEnabled) {
                return false;
            }
            if (ownCombatants.length < enemyCombatants.length + Math.max(0, Math.floor(options.combatantAdvantage / 2))) {
                return false;
            }
            this.orderBottomDemolitionRoute(game, selectedUnits, options);
            this.lastHfoBottomDemolitionOrderAt = game.getCurrentTick();
            return true;
        }
        if (ownCombatants.length < enemyCombatants.length + options.combatantAdvantage) {
            return false;
        }

        const targets = this.selectHfoBottomDemolitionTargets(enemyBuildings, options.maxTargets);
        this.orderUnitsToNearestTargets(selectedUnits, targets, options.directAttackKnownTargets);
        this.lastHfoBottomDemolitionOrderAt = game.getCurrentTick();
        return true;
    }

    private selectHfoDemolitionUnits(demolitionUnits: UnitData[], targets: UnitData[], maxUnits: number): UnitData[] {
        return demolitionUnits
            .sort((left, right) => {
                const weightDiff = this.getHfoDemolitionUnitWeight(right) - this.getHfoDemolitionUnitWeight(left);
                if (weightDiff !== 0) {
                    return weightDiff;
                }
                return this.getClosestDistanceSquared(left, targets) - this.getClosestDistanceSquared(right, targets);
            })
            .slice(0, Math.max(1, maxUnits));
    }

    private orderBottomDemolitionRoute(
        game: GameApi,
        units: UnitData[],
        options: Required<HfoBottomDemolitionOptions>,
    ): void {
        if (units.length === 0) {
            return;
        }
        const stage = Math.floor((game.getCurrentTick() - options.minTick) / options.routeAdvanceIntervalTicks);
        const waypoint = HFO_BOTTOM_DEMOLITION_ROUTE[Math.min(stage, HFO_BOTTOM_DEMOLITION_ROUTE.length - 1)];
        const attackers = this.prepareUnitsForAttackMove(units);
        if (attackers.length === 0) {
            return;
        }
        this.player.actions.orderUnits(
            attackers.map((unit) => unit.id),
            OrderType.AttackMove,
            waypoint.x,
            waypoint.y,
        );
    }

    private selectHfoBottomDemolitionTargets(enemyBuildings: UnitData[], maxTargets: number): UnitData[] {
        const targetLimit = Math.max(1, maxTargets);
        const targets = enemyBuildings
            .sort((left, right) => this.getHfoCloseoutTargetWeight(right) - this.getHfoCloseoutTargetWeight(left))
            .slice(0, targetLimit);
        const constructionYard = maxBy(
            enemyBuildings.filter((unit) => unit.rules.constructionYard),
            (unit) => unit.maxHitPoints ?? 0,
        );
        if (constructionYard && !targets.some((target) => target.id === constructionYard.id)) {
            if (targets.length < targetLimit) {
                targets.push(constructionYard);
            } else {
                targets[targets.length - 1] = constructionYard;
            }
        }
        return targets;
    }

    private selectHfoLateMopUpTargets(enemyUnits: UnitData[], maxTargets: number): UnitData[] {
        return enemyUnits
            .sort((left, right) => this.getHfoLateMopUpTargetWeight(right) - this.getHfoLateMopUpTargetWeight(left))
            .slice(0, Math.max(1, maxTargets));
    }

    private getHfoLateMopUpTargetWeight(unit: UnitData): number {
        if (unit.rules.constructionYard || unit.rules.name === "AMCV" || unit.rules.name === "SMCV") {
            return 2000000 + (unit.maxHitPoints ?? 0);
        }
        if (HFO_DEFENSE_BUILDINGS.has(unit.rules.name)) {
            return 1990000 + (unit.maxHitPoints ?? 0);
        }
        if (unit.rules.weaponsFactory || unit.rules.nodBarracks || unit.rules.gdiBarracks) {
            return 1950000 + (unit.maxHitPoints ?? 0);
        }
        if (unit.rules.refinery) {
            return 1900000 + (unit.maxHitPoints ?? 0);
        }
        if (unit.rules.harvester) {
            return 1750000 + (unit.maxHitPoints ?? 0);
        }
        if (unit.rules.type === ObjectType.Building) {
            return 1500000 + (unit.maxHitPoints ?? 0);
        }
        if (unit.rules.isSelectableCombatant) {
            return 1000000 + (unit.maxHitPoints ?? 0);
        }
        return unit.maxHitPoints ?? 0;
    }

    private selectWeakStartEconomyBreakTargets(enemyUnits: UnitData[], maxTargets: number): UnitData[] {
        return enemyUnits
            .sort(
                (left, right) =>
                    this.getWeakStartEconomyBreakTargetWeight(right) -
                    this.getWeakStartEconomyBreakTargetWeight(left),
            )
            .slice(0, Math.max(1, maxTargets));
    }

    private selectWeakStartDefenseBreakTargets(enemyUnits: UnitData[], maxTargets: number): UnitData[] {
        return enemyUnits
            .sort(
                (left, right) =>
                    this.getWeakStartDefenseBreakTargetWeight(right) -
                    this.getWeakStartDefenseBreakTargetWeight(left),
            )
            .slice(0, Math.max(1, maxTargets));
    }

    private selectWeakStartCloseoutTargets(
        enemyUnits: UnitData[],
        maxTargets: number,
        profile: WeakStartTargetProfile,
    ): UnitData[] {
        if (profile === "economyBreak") {
            return this.selectWeakStartEconomyBreakTargets(enemyUnits, maxTargets);
        }
        if (profile === "defenseBreak") {
            return this.selectWeakStartDefenseBreakTargets(enemyUnits, maxTargets);
        }
        return this.selectHfoLateMopUpTargets(enemyUnits, maxTargets);
    }

    private selectWeakStartPressureTargets(
        game: GameApi,
        maxTargets: number,
        profile: WeakStartTargetProfile,
    ): UnitData[] {
        if (profile === "economyBreak") {
            return this.selectWeakStartEconomyBreakTargets(this.getKnownEnemyUnits(game), maxTargets);
        }
        if (profile === "defenseBreak") {
            return this.selectWeakStartDefenseBreakTargets(this.getKnownEnemyUnits(game), maxTargets);
        }
        return this.findBestKnownTargets(game, maxTargets);
    }

    private getWeakStartEconomyBreakTargetWeight(unit: UnitData): number {
        if (unit.rules.constructionYard || unit.rules.name === "AMCV" || unit.rules.name === "SMCV") {
            return 2500000 + (unit.maxHitPoints ?? 0);
        }
        if (POWER_BUILDINGS.has(unit.rules.name)) {
            return 2400000 + (unit.maxHitPoints ?? 0);
        }
        if (unit.rules.weaponsFactory || unit.rules.refinery || unit.rules.nodBarracks || unit.rules.gdiBarracks) {
            return 2300000 + (unit.maxHitPoints ?? 0);
        }
        if (unit.rules.name === "CAOILD") {
            return 2250000 + (unit.maxHitPoints ?? 0);
        }
        if (unit.rules.harvester) {
            return 2000000 + (unit.maxHitPoints ?? 0);
        }
        if (HFO_DEFENSE_BUILDINGS.has(unit.rules.name)) {
            return 1200000 + (unit.maxHitPoints ?? 0);
        }
        if (unit.rules.type === ObjectType.Building) {
            return 1100000 + (unit.maxHitPoints ?? 0);
        }
        if (unit.rules.isSelectableCombatant) {
            return 500000 + (unit.maxHitPoints ?? 0);
        }
        return unit.maxHitPoints ?? 0;
    }

    private getWeakStartDefenseBreakTargetWeight(unit: UnitData): number {
        if (POWER_BUILDINGS.has(unit.rules.name)) {
            return 3000000 + (unit.maxHitPoints ?? 0);
        }
        if (HFO_DEFENSE_BUILDINGS.has(unit.rules.name)) {
            return 2950000 + (unit.maxHitPoints ?? 0);
        }
        if (unit.rules.weaponsFactory || unit.rules.refinery || unit.rules.nodBarracks || unit.rules.gdiBarracks) {
            return 2500000 + (unit.maxHitPoints ?? 0);
        }
        if (unit.rules.constructionYard || unit.rules.name === "AMCV" || unit.rules.name === "SMCV") {
            return 2400000 + (unit.maxHitPoints ?? 0);
        }
        if (unit.rules.harvester) {
            return 1800000 + (unit.maxHitPoints ?? 0);
        }
        if (unit.rules.type === ObjectType.Building) {
            return 1500000 + (unit.maxHitPoints ?? 0);
        }
        if (unit.rules.isSelectableCombatant) {
            return 1000000 + (unit.maxHitPoints ?? 0);
        }
        return unit.maxHitPoints ?? 0;
    }

    private prepareUnitsForAttackMove(units: UnitData[]): UnitData[] {
        const deployedUnitIds = units
            .filter((unit) => unit.stance === StanceType.Deployed)
            .map((unit) => unit.id);
        if (deployedUnitIds.length > 0) {
            this.player.actions.orderUnits(deployedUnitIds, OrderType.DeploySelected);
        }
        return units.filter((unit) => unit.stance !== StanceType.Deployed);
    }

    private orderUnitsToNearestTargets(units: UnitData[], targets: UnitData[], directAttackKnownTargets: boolean): void {
        const orderedUnits = this.prepareUnitsForAttackMove(units);
        this.orderPreparedUnitsToNearestTargets(orderedUnits, targets, directAttackKnownTargets);
    }

    private orderPreparedUnitsToNearestTargets(
        units: UnitData[],
        targets: UnitData[],
        directAttackKnownTargets: boolean,
    ): void {
        const targetUnitIds = new Map<number, number[]>();
        targets.forEach((target) => targetUnitIds.set(target.id, []));
        units.forEach((unit) => {
            const target = targets.reduce((best, candidate) => {
                if (!best) {
                    return candidate;
                }
                return this.getDistanceSquared(unit, candidate) < this.getDistanceSquared(unit, best) ? candidate : best;
            }, null as UnitData | null);
            if (!target) {
                return;
            }
            targetUnitIds.get(target.id)?.push(unit.id);
        });
        targets.forEach((target) => {
            const assignedUnits = targetUnitIds.get(target.id) ?? [];
            if (assignedUnits.length === 0) {
                return;
            }
            if (directAttackKnownTargets) {
                this.player.actions.orderUnits(assignedUnits, OrderType.Attack, target.id);
            } else {
                this.player.actions.orderUnits(assignedUnits, OrderType.AttackMove, target.tile.rx, target.tile.ry);
            }
        });
    }

    private orderGenericCloseoutTargets(
        game: GameApi,
        units: UnitData[],
        targets: UnitData[],
        maxTargets: number,
        profile: WeakStartTargetProfile = "economyBreak",
    ): void {
        const selectedTargets = profile === "defenseBreak"
            ? this.selectWeakStartDefenseBreakTargets(targets, maxTargets)
            : this.selectWeakStartEconomyBreakTargets(targets, maxTargets);
        if (selectedTargets.length === 0) {
            return;
        }
        const attackers = this.prepareUnitsForAttackMove(units);
        if (attackers.length === 0) {
            return;
        }

        const useAttackMovePulse = game.getCurrentTick() % 30 < 10;
        const groupCount = Math.min(
            selectedTargets.length,
            Math.max(1, attackers.length < 16 || selectedTargets.length <= 2 ? 1 : Math.ceil(attackers.length / 16)),
        );
        const groups = Array.from({ length: groupCount }, (_, groupIndex) => {
            const groupTargets = selectedTargets.filter((_, targetIndex) => targetIndex % groupCount === groupIndex);
            return {
                anchor: groupTargets[0] ?? selectedTargets[groupIndex],
                targets: groupTargets.length > 0 ? groupTargets : [selectedTargets[groupIndex]],
            };
        });

        groups.forEach((group, groupIndex) => {
            const assignedUnits = attackers.filter((_, unitIndex) => unitIndex % groups.length === groupIndex);
            if (assignedUnits.length === 0 || !group.anchor) {
                return;
            }
            if (useAttackMovePulse) {
                this.player.actions.orderUnits(
                    assignedUnits.map((unit) => unit.id),
                    OrderType.AttackMove,
                    group.anchor.tile.rx,
                    group.anchor.tile.ry,
                );
                return;
            }
            this.orderPreparedUnitsToNearestTargets(assignedUnits, group.targets, true);
        });
    }

    private orderHfoBottomMopUpTargets(game: GameApi, units: UnitData[], targets: UnitData[], maxTargets: number): void {
        const selectedTargets = this.selectHfoLateMopUpTargets(targets, maxTargets);
        if (selectedTargets.length === 0) {
            return;
        }
        const attackers = this.prepareUnitsForAttackMove(units);
        if (attackers.length === 0) {
            return;
        }

        const useAttackMovePulse = game.getCurrentTick() % 24 < 8;
        const remainingBuildings = selectedTargets.filter((target) => target.rules.type === ObjectType.Building).length;
        const shouldFocusSingleTarget = attackers.length < 18 || (game.getCurrentTick() >= 42000 && remainingBuildings <= 2);
        if (shouldFocusSingleTarget) {
            const target = selectedTargets[0];
            if (useAttackMovePulse) {
                this.player.actions.orderUnits(
                    attackers.map((unit) => unit.id),
                    OrderType.AttackMove,
                    target.tile.rx,
                    target.tile.ry,
                );
            } else {
                this.orderPreparedUnitsToNearestTargets(attackers, [target], true);
            }
            return;
        }

        const westTargets = selectedTargets.filter((target) => this.isHfoWestPocketTarget(target));
        const topTargets = selectedTargets.filter((target) => this.isHfoTopPocketTarget(target));
        const otherTargets = selectedTargets.filter(
            (target) => !this.isHfoWestPocketTarget(target) && !this.isHfoTopPocketTarget(target),
        );
        const groups = [westTargets, topTargets, otherTargets]
            .filter((groupTargets) => groupTargets.length > 0)
            .map((groupTargets) => ({
                targets: groupTargets,
                anchor: this.selectHfoLateMopUpTargets(groupTargets, 1)[0],
            }));
        const activeGroups = groups.length > 0 ? groups : [{ targets: selectedTargets, anchor: selectedTargets[0] }];

        activeGroups.forEach((group, groupIndex) => {
            const assignedUnits = attackers.filter((_, unitIndex) => unitIndex % activeGroups.length === groupIndex);
            if (assignedUnits.length === 0) {
                return;
            }
            if (useAttackMovePulse) {
                this.player.actions.orderUnits(
                    assignedUnits.map((unit) => unit.id),
                    OrderType.AttackMove,
                    group.anchor.tile.rx,
                    group.anchor.tile.ry,
                );
                return;
            }
            this.orderPreparedUnitsToNearestTargets(assignedUnits, group.targets, true);
        });
    }

    private selectHfoBottomSiegeTargets(enemyBuildings: UnitData[], maxTargets: number): UnitData[] {
        const targetLimit = Math.max(1, maxTargets);
        const targets = enemyBuildings
            .sort((left, right) => {
                const weightDiff = this.getHfoBottomSiegeTargetWeight(right) - this.getHfoBottomSiegeTargetWeight(left);
                if (weightDiff !== 0) {
                    return weightDiff;
                }
                return right.tile.ry - left.tile.ry;
            })
            .slice(0, targetLimit);
        if (targets.some((target) => HFO_DEFENSE_BUILDINGS.has(target.rules.name))) {
            return targets;
        }
        const constructionYard = maxBy(
            enemyBuildings.filter((unit) => unit.rules.constructionYard),
            (unit) => unit.maxHitPoints ?? 0,
        );
        if (constructionYard && !targets.some((target) => target.id === constructionYard.id)) {
            if (targets.length < targetLimit) {
                targets.push(constructionYard);
            } else {
                targets[targets.length - 1] = constructionYard;
            }
        }
        return targets;
    }

    private getHfoBottomSiegeTargetWeight(unit: UnitData): number {
        if (HFO_DEFENSE_BUILDINGS.has(unit.rules.name)) {
            return 3000000 + (unit.maxHitPoints ?? 0);
        }
        if (unit.rules.constructionYard || unit.rules.name === "AMCV" || unit.rules.name === "SMCV") {
            return 2800000 + (unit.maxHitPoints ?? 0);
        }
        if (unit.rules.weaponsFactory || unit.rules.nodBarracks || unit.rules.gdiBarracks) {
            return 2600000 + (unit.maxHitPoints ?? 0);
        }
        if (unit.rules.refinery) {
            return 2400000 + (unit.maxHitPoints ?? 0);
        }
        return 2000000 + (unit.maxHitPoints ?? 0);
    }

    private isHfoWestPocketTarget(unit: UnitData): boolean {
        return unit.tile.rx <= 62 && unit.tile.ry >= 65 && unit.tile.ry <= 112;
    }

    private isHfoTopPocketTarget(unit: UnitData): boolean {
        return unit.tile.rx >= 64 && unit.tile.rx <= 116 && unit.tile.ry <= 64;
    }

    private executeStagedSweep(
        game: GameApi,
        options: Required<HfoWestSweepOptions> | Required<HfoBottomSweepOptions>,
        _lastOrderAt: number,
        markOrdered: (tick: number) => void,
    ): boolean {
        const ownCombatants = this.getMobileCombatants(game);
        if (ownCombatants.length < options.minCombatants) {
            return false;
        }

        const enemyCombatants = this.getKnownEnemyCombatUnits(game);
        if (enemyCombatants.length > options.maxEnemyCombatants) {
            return false;
        }
        if (ownCombatants.length < enemyCombatants.length + options.combatantAdvantage) {
            return false;
        }

        const stage = Math.floor((game.getCurrentTick() - options.minTick) / options.advanceIntervalTicks);
        const shouldSweepRoute = options.waypoints.length > 0 && stage < options.waypoints.length;
        if (shouldSweepRoute) {
            const waypoint = options.waypoints[stage];
            const attackers = this.prepareUnitsForAttackMove(ownCombatants);
            if (attackers.length === 0) {
                return true;
            }
            this.player.actions.orderUnits(
                attackers.map((unit) => unit.id),
                OrderType.AttackMove,
                waypoint.x,
                waypoint.y,
            );
            markOrdered(game.getCurrentTick());
            return true;
        }

        const targets = this.findBestKnownTargets(game, options.maxTargets);
        if (targets.length === 0) {
            if (options.waypoints.length === 0) {
                return false;
            }
            const waypoint = options.waypoints[options.waypoints.length - 1];
            const attackers = this.prepareUnitsForAttackMove(ownCombatants);
            if (attackers.length === 0) {
                return true;
            }
            this.player.actions.orderUnits(
                attackers.map((unit) => unit.id),
                OrderType.AttackMove,
                waypoint.x,
                waypoint.y,
            );
            markOrdered(game.getCurrentTick());
            return true;
        }

        const attackers = this.prepareUnitsForAttackMove(ownCombatants);
        if (attackers.length === 0) {
            return true;
        }
        targets.forEach((target, index) => {
            const assignedUnits = attackers
                .filter((_, unitIndex) => unitIndex % targets.length === index)
                .map((unit) => unit.id);
            if (assignedUnits.length === 0) {
                return;
            }
            if (options.directAttackKnownTargets) {
                this.player.actions.orderUnits(assignedUnits, OrderType.Attack, target.id);
            } else {
                this.player.actions.orderUnits(assignedUnits, OrderType.AttackMove, target.tile.rx, target.tile.ry);
            }
        });
        markOrdered(game.getCurrentTick());
        return true;
    }

    private maybeHfoCloseout(game: GameApi): boolean {
        const options = this.hfoCloseoutOptions;
        if (!options.enabled || game.getCurrentTick() < options.minTick || !this.isHfoWestVsEast(game)) {
            return false;
        }

        const enemyBuildings = this.getKnownEnemyBuildings(game);
        const enemyCombatants = this.getKnownEnemyCombatUnits(game);
        if (enemyBuildings.length === 0) {
            return false;
        }
        if (enemyBuildings.length > options.maxEnemyBuildings || enemyCombatants.length > options.maxEnemyCombatants) {
            return false;
        }

        const closeoutUnits = this.getHfoCloseoutUnits(game, options.includeHarvesters);
        if (closeoutUnits.length < options.minUnits) {
            return false;
        }

        if (game.getCurrentTick() < this.lastHfoCloseoutOrderAt + options.orderIntervalTicks) {
            return true;
        }

        const target = maxBy(enemyBuildings, (unit) => this.getHfoCloseoutTargetWeight(unit));
        if (!target) {
            return false;
        }

        const westUnits = closeoutUnits.filter((unit) => unit.tile.rx < 105).map((unit) => unit.id);
        const centerUnits = closeoutUnits
            .filter((unit) => unit.tile.rx >= 105 && unit.tile.rx < 135)
            .map((unit) => unit.id);
        const eastUnits = closeoutUnits.filter((unit) => unit.tile.rx >= 135).map((unit) => unit.id);

        if (westUnits.length > 0) {
            this.player.actions.orderUnits(
                westUnits,
                OrderType.AttackMove,
                HFO_WEST_CLOSEOUT_STAGE_1.x,
                HFO_WEST_CLOSEOUT_STAGE_1.y,
            );
        }
        if (centerUnits.length > 0) {
            this.player.actions.orderUnits(
                centerUnits,
                OrderType.AttackMove,
                HFO_WEST_CLOSEOUT_STAGE_2.x,
                HFO_WEST_CLOSEOUT_STAGE_2.y,
            );
        }
        if (eastUnits.length > 0) {
            this.player.actions.orderUnits(eastUnits, OrderType.Attack, target.id);
        }
        this.lastHfoCloseoutOrderAt = game.getCurrentTick();
        return true;
    }

    private isHfoWestVsEast(game: GameApi): boolean {
        if (!this.isHeckFreezesOver(game)) {
            return false;
        }
        const playerData = game.getPlayerData(this.name);
        if (this.getStartKey(playerData.startLocation) !== HFO_WEST_START) {
            return false;
        }
        return game
            .getPlayers()
            .map((name) => game.getPlayerData(name))
            .some(
                (otherPlayer) =>
                    otherPlayer.name !== playerData.name &&
                    otherPlayer.isCombatant &&
                    !game.areAlliedPlayers(playerData.name, otherPlayer.name) &&
                    this.getStartKey(otherPlayer.startLocation) === HFO_EAST_START,
            );
    }

    private isHfoEastVsWest(game: GameApi): boolean {
        if (!this.isHeckFreezesOver(game)) {
            return false;
        }
        const playerData = game.getPlayerData(this.name);
        if (this.getStartKey(playerData.startLocation) !== HFO_EAST_START) {
            return false;
        }
        return game
            .getPlayers()
            .map((name) => game.getPlayerData(name))
            .some(
                (otherPlayer) =>
                    otherPlayer.name !== playerData.name &&
                    otherPlayer.isCombatant &&
                    !game.areAlliedPlayers(playerData.name, otherPlayer.name) &&
                    this.getStartKey(otherPlayer.startLocation) === HFO_WEST_START,
            );
    }

    private isHfoBottomVsTop(game: GameApi): boolean {
        if (!this.isHeckFreezesOver(game)) {
            return false;
        }
        const playerData = game.getPlayerData(this.name);
        if (this.getStartKey(playerData.startLocation) !== HFO_BOTTOM_START) {
            return false;
        }
        return game
            .getPlayers()
            .map((name) => game.getPlayerData(name))
            .some(
                (otherPlayer) =>
                    otherPlayer.name !== playerData.name &&
                    otherPlayer.isCombatant &&
                    !game.areAlliedPlayers(playerData.name, otherPlayer.name) &&
                    this.getStartKey(otherPlayer.startLocation) === HFO_TOP_START,
            );
    }

    private isHeckFreezesOver(game: GameApi): boolean {
        const starts = game.mapApi.getStartingLocations().map((start) => this.getStartKey(start)).sort();
        return starts.length === HFO_STARTS.size && starts.every((start) => HFO_STARTS.has(start));
    }

    private isTsunami(game: GameApi): boolean {
        const starts = game.mapApi.getStartingLocations().map((start) => this.getStartKey(start)).sort();
        return starts.length === TSUNAMI_STARTS.size && starts.every((start) => TSUNAMI_STARTS.has(start));
    }

    private applySimpleInfantryProfile(): void {
        this.forceAttackOptions = {
            ...this.forceAttackOptions,
            enabled: false,
            minTick: 16200,
            minCombatants: 12,
            combatantAdvantage: -3,
            maxEnemyCombatants: 4,
            orderIntervalTicks: 60,
            directAttackKnownTargets: true,
            maxTargets: 1,
            hfoWestVsEastOnly: false,
        };
        this.harassOptions = {
            ...this.harassOptions,
            enabled: false,
            minTick: 12600,
            minCombatants: 4,
            maxUnits: 4,
            combatantAdvantage: -3,
            maxEnemyCombatants: 8,
            orderIntervalTicks: 120,
            directAttackKnownTargets: true,
        };
        this.routeAttackOptions = {
            ...this.routeAttackOptions,
            enabled: false,
            minTick: 12600,
            minCombatants: 10,
            orderIntervalTicks: 60,
            advanceIntervalTicks: 1200,
            waypoints: [
                new Vector2(74, 95),
                new Vector2(103, 116),
                new Vector2(128, 122),
                new Vector2(151, 119),
            ],
            directAttackKnownTargets: false,
            hfoWestVsEastOnly: false,
        };
        this.hfoCloseoutOptions = {
            ...this.hfoCloseoutOptions,
            enabled: false,
            minTick: 9000,
            minUnits: 6,
            maxEnemyBuildings: 8,
            maxEnemyCombatants: 2,
            orderIntervalTicks: 8,
            includeHarvesters: false,
        };
        this.hfoWestSweepOptions = {
            ...this.hfoWestSweepOptions,
            enabled: false,
            minTick: 16200,
            minCombatants: 4,
            combatantAdvantage: 14,
            maxEnemyCombatants: 4,
            orderIntervalTicks: 60,
            advanceIntervalTicks: 600,
            waypoints: [
                { x: 76, y: 95 },
                { x: 103, y: 116 },
                { x: 127, y: 122 },
                { x: 147, y: 121 },
                { x: 151, y: 119 },
                { x: 151, y: 129 },
                { x: 140, y: 134 },
            ],
            directAttackKnownTargets: false,
            maxTargets: 1,
        };
        this.hfoEastSweepOptions = {
            ...this.hfoEastSweepOptions,
            enabled: false,
        };
        this.hfoBottomSweepOptions = {
            ...this.hfoBottomSweepOptions,
            enabled: false,
        };
        this.hfoBottomPincerOptions = {
            ...this.hfoBottomPincerOptions,
            enabled: false,
        };
        this.hfoBottomCloseoutOptions = {
            ...this.hfoBottomCloseoutOptions,
            enabled: false,
        };
        this.hfoBottomDemolitionOptions = {
            ...this.hfoBottomDemolitionOptions,
            enabled: false,
        };
        this.hfoBottomHomeGuardOptions = {
            ...this.hfoBottomHomeGuardOptions,
            enabled: false,
        };
        this.emergencyDefenseOptions = {
            ...this.emergencyDefenseOptions,
            enabled: false,
            radius: 24,
            minCombatants: 1,
            maxDefenders: 999,
            orderIntervalTicks: 30,
            directAttackKnownTargets: true,
            mapSignatures: [],
            hfoWestVsEastOnly: false,
            hfoBottomOnly: false,
        };
    }

    private applyRiverRampageLowerProfile(): void {
        this.forceAttackOptions = {
            ...this.forceAttackOptions,
            enabled: false,
            hfoWestVsEastOnly: false,
        };
        this.harassOptions = {
            ...this.harassOptions,
            enabled: false,
        };
        this.routeAttackOptions = {
            ...this.routeAttackOptions,
            enabled: false,
            hfoWestVsEastOnly: false,
        };
        this.hfoCloseoutOptions = {
            ...this.hfoCloseoutOptions,
            enabled: false,
        };
        this.hfoWestSweepOptions = {
            ...this.hfoWestSweepOptions,
            enabled: false,
        };
        this.emergencyDefenseOptions = {
            ...this.emergencyDefenseOptions,
            enabled: true,
            radius: 24,
            minCombatants: 1,
            maxDefenders: 999,
            orderIntervalTicks: 30,
            directAttackKnownTargets: true,
            mapSignatures: [],
            hfoWestVsEastOnly: false,
            hfoBottomOnly: false,
        };
    }

    private applyYinYangUpperProfile(): void {
        this.forceAttackOptions = {
            ...this.forceAttackOptions,
            enabled: true,
            minTick: 16200,
            minCombatants: 10,
            combatantAdvantage: 6,
            maxEnemyCombatants: 0,
            orderIntervalTicks: 30,
            directAttackKnownTargets: true,
            maxTargets: 1,
            hfoWestVsEastOnly: false,
        };
        this.harassOptions = {
            ...this.harassOptions,
            enabled: true,
            minTick: 5400,
            minCombatants: 5,
            maxUnits: 6,
            combatantAdvantage: -10,
            maxEnemyCombatants: 8,
            orderIntervalTicks: 240,
            directAttackKnownTargets: true,
        };
        this.routeAttackOptions = {
            ...this.routeAttackOptions,
            enabled: true,
            minTick: 5400,
            minCombatants: 10,
            orderIntervalTicks: 90,
            advanceIntervalTicks: 1200,
            waypoints: [
                new Vector2(74, 95),
                new Vector2(103, 116),
                new Vector2(128, 122),
                new Vector2(151, 119),
            ],
            directAttackKnownTargets: true,
            hfoWestVsEastOnly: false,
        };
        this.hfoCloseoutOptions = {
            ...this.hfoCloseoutOptions,
            enabled: false,
            minTick: 5400,
            minUnits: 6,
            maxEnemyBuildings: 3,
            maxEnemyCombatants: 2,
            orderIntervalTicks: 15,
            includeHarvesters: false,
        };
        this.hfoWestSweepOptions = {
            ...this.hfoWestSweepOptions,
            enabled: true,
            minTick: 9000,
            minCombatants: 12,
            combatantAdvantage: -3,
            maxEnemyCombatants: 1,
            orderIntervalTicks: 90,
            advanceIntervalTicks: 900,
            waypoints: [
                { x: 82, y: 86 },
                { x: 110, y: 104 },
                { x: 138, y: 112 },
                { x: 151, y: 119 },
                { x: 151, y: 128 },
                { x: 142, y: 134 },
            ],
            directAttackKnownTargets: false,
            maxTargets: 1,
        };
        this.emergencyDefenseOptions = {
            ...this.emergencyDefenseOptions,
            enabled: false,
            radius: 24,
            minCombatants: 1,
            maxDefenders: 16,
            orderIntervalTicks: 30,
            directAttackKnownTargets: true,
            mapSignatures: [],
            hfoWestVsEastOnly: false,
            hfoBottomOnly: false,
        };
    }


    private applyPeakOfPerfectionWeakProfile(): void {
        this.forceAttackOptions = {
            ...this.forceAttackOptions,
            enabled: true,
            minTick: 14400,
            minCombatants: 18,
            combatantAdvantage: 3,
            maxEnemyCombatants: 999,
            orderIntervalTicks: 90,
            directAttackKnownTargets: true,
            maxTargets: 1,
            hfoWestVsEastOnly: false,
        };
        this.harassOptions = {
            ...this.harassOptions,
            enabled: false,
            minTick: 5400,
            minCombatants: 4,
            maxUnits: 4,
            combatantAdvantage: -4,
            maxEnemyCombatants: 10,
            orderIntervalTicks: 180,
            directAttackKnownTargets: true,
        };
        this.routeAttackOptions = {
            ...this.routeAttackOptions,
            enabled: false,
            minTick: 9000,
            minCombatants: 10,
            orderIntervalTicks: 24,
            advanceIntervalTicks: 1200,
            waypoints: [
                new Vector2(74, 95),
                new Vector2(103, 116),
                new Vector2(128, 122),
                new Vector2(151, 119),
            ],
            directAttackKnownTargets: true,
            hfoWestVsEastOnly: false,
        };
        this.hfoCloseoutOptions = {
            ...this.hfoCloseoutOptions,
            enabled: false,
            minTick: 9000,
            minUnits: 8,
            maxEnemyBuildings: 3,
            maxEnemyCombatants: 10,
            orderIntervalTicks: 15,
            includeHarvesters: false,
        };
        this.hfoWestSweepOptions = {
            ...this.hfoWestSweepOptions,
            enabled: false,
            minTick: 16200,
            minCombatants: 12,
            combatantAdvantage: 3,
            maxEnemyCombatants: 4,
            orderIntervalTicks: 60,
            advanceIntervalTicks: 900,
            waypoints: [
                { x: 76, y: 95 },
                { x: 103, y: 116 },
                { x: 127, y: 122 },
                { x: 147, y: 121 },
                { x: 151, y: 119 },
                { x: 151, y: 129 },
                { x: 140, y: 134 },
            ],
            directAttackKnownTargets: false,
            maxTargets: 1,
        };
        this.emergencyDefenseOptions = {
            ...this.emergencyDefenseOptions,
            enabled: true,
            radius: 30,
            minCombatants: 1,
            maxDefenders: 999,
            orderIntervalTicks: 30,
            directAttackKnownTargets: true,
            mapSignatures: [],
            hfoWestVsEastOnly: false,
            hfoBottomOnly: false,
        };
    }

    private applyOtmqSouthwestProfile(): void {
        this.forceAttackOptions = {
            ...this.forceAttackOptions,
            enabled: true,
            minTick: 48000,
            minCombatants: 40,
            combatantAdvantage: 10,
            maxEnemyCombatants: 16,
            orderIntervalTicks: 18,
            directAttackKnownTargets: true,
            maxTargets: 8,
            hfoWestVsEastOnly: false,
        };
        this.harassOptions = {
            ...this.harassOptions,
            enabled: false,
            minTick: 5400,
            minCombatants: 5,
            maxUnits: 4,
            combatantAdvantage: -4,
            maxEnemyCombatants: 3,
            orderIntervalTicks: 120,
            directAttackKnownTargets: true,
        };
        this.routeAttackOptions = {
            ...this.routeAttackOptions,
            enabled: true,
            minTick: 42000,
            minCombatants: 40,
            orderIntervalTicks: 30,
            advanceIntervalTicks: 600,
            waypoints: [
                new Vector2(96, 90),
                new Vector2(114, 74),
                new Vector2(132, 58),
                new Vector2(145, 45),
                new Vector2(124, 48),
                new Vector2(142, 70),
                new Vector2(118, 64),
                new Vector2(134, 56),
                new Vector2(146, 56),
                new Vector2(128, 72),
            ],
            directAttackKnownTargets: true,
            hfoWestVsEastOnly: false,
        };
        this.hfoCloseoutOptions = {
            ...this.hfoCloseoutOptions,
            enabled: false,
            minTick: 9000,
            minUnits: 10,
            maxEnemyBuildings: 3,
            maxEnemyCombatants: 4,
            orderIntervalTicks: 15,
            includeHarvesters: false,
        };
        this.hfoWestSweepOptions = {
            ...this.hfoWestSweepOptions,
            enabled: false,
            minTick: 7200,
            minCombatants: 6,
            combatantAdvantage: 6,
            maxEnemyCombatants: 4,
            orderIntervalTicks: 30,
            advanceIntervalTicks: 600,
            waypoints: [
                { x: 76, y: 95 },
                { x: 103, y: 116 },
                { x: 127, y: 122 },
                { x: 147, y: 121 },
                { x: 151, y: 119 },
                { x: 151, y: 129 },
                { x: 140, y: 134 },
            ],
            directAttackKnownTargets: false,
            maxTargets: 3,
        };
        this.emergencyDefenseOptions = {
            ...this.emergencyDefenseOptions,
            enabled: true,
            radius: 62,
            minCombatants: 3,
            maxDefenders: 36,
            orderIntervalTicks: 4,
            directAttackKnownTargets: true,
            mapSignatures: [],
            hfoWestVsEastOnly: false,
            hfoBottomOnly: false,
        };
    }

    private isSimple1v1Map(game: GameApi): boolean {
        if (this.country !== Countries.IRAQ) {
            return false;
        }
        const starts = game.mapApi.getStartingLocations().map((start) => this.getStartKey(start)).sort();
        return starts.length === SIMPLE_1V1_STARTS.size && starts.every((start) => SIMPLE_1V1_STARTS.has(start));
    }

    private isRiverRampageLowerStart(game: GameApi): boolean {
        return this.isKnownStartProfile(game, RIVER_RAMPAGE_STARTS, RIVER_RAMPAGE_LOWER_START);
    }

    private isYinYangUpperStart(game: GameApi): boolean {
        return this.isKnownStartProfile(game, YIN_YANG_STARTS, YIN_YANG_UPPER_START);
    }

    private isKnownStartProfile(game: GameApi, expectedStarts: Set<string>, expectedOwnStart: string): boolean {
        const starts = game.mapApi.getStartingLocations().map((start) => this.getStartKey(start)).sort();
        if (starts.length !== expectedStarts.size || !starts.every((start) => expectedStarts.has(start))) {
            return false;
        }
        const playerData = game.getPlayerData(this.name);
        return this.getStartKey(playerData.startLocation) === expectedOwnStart;
    }

    private isPeakOfPerfectionWeakStart(game: GameApi): boolean {
        const starts = game.mapApi.getStartingLocations().map((start) => this.getStartKey(start)).sort();
        if (
            starts.length !== PEAK_OF_PERFECTION_STARTS.size ||
            !starts.every((start) => PEAK_OF_PERFECTION_STARTS.has(start))
        ) {
            return false;
        }
        const playerData = game.getPlayerData(this.name);
        return this.getStartKey(playerData.startLocation) === PEAK_OF_PERFECTION_WEAK_START;
    }

    private isOtmqSouthwestStart(game: GameApi): boolean {
        return this.isKnownStartProfile(game, OTMQ_STARTS, OTMQ_SOUTHWEST_START);
    }

    private getWeakStartHomeGuard(game: GameApi): WeakStartHomeGuard | null {
        const starts = game.mapApi.getStartingLocations().map((start) => this.getStartKey(start)).sort();
        const playerData = game.getPlayerData(this.name);
        const ownStart = this.getStartKey(playerData.startLocation);
        return (
            WEAK_START_HOME_GUARDS.find(
                (guard) =>
                    guard.ownStart === ownStart &&
                    starts.length === guard.starts.size &&
                    starts.every((start) => guard.starts.has(start)),
            ) ?? null
        );
    }

    private isPrimaryEnemyCountry(game: GameApi, countries: Set<string>): boolean {
        const playerData = game.getPlayerData(this.name);
        const enemyPlayer = game
            .getPlayers()
            .map((name) => game.getPlayerData(name))
            .find(
                (otherPlayer) =>
                    otherPlayer.name !== playerData.name &&
                    otherPlayer.isCombatant &&
                    !game.areAlliedPlayers(playerData.name, otherPlayer.name),
            );
        const countryName = (enemyPlayer?.country as { name?: string } | undefined)?.name;
        return countryName !== undefined && countries.has(countryName);
    }

    private getStartKey(point: { x: number; y: number }): string {
        return `${point.x},${point.y}`;
    }

    private getHfoCloseoutTargetWeight(unit: UnitData): number {
        if (unit.rules.constructionYard || unit.rules.name === "AMCV" || unit.rules.name === "SMCV") {
            return 1300000 + (unit.maxHitPoints ?? 0);
        }
        if (unit.rules.weaponsFactory || unit.rules.nodBarracks || unit.rules.gdiBarracks) {
            return 1200000 + (unit.maxHitPoints ?? 0);
        }
        if (HFO_DEFENSE_BUILDINGS.has(unit.rules.name)) {
            return 1100000 + (unit.maxHitPoints ?? 0);
        }
        if (unit.rules.refinery) {
            return 1000000 + (unit.maxHitPoints ?? 0);
        }
        if (unit.rules.type === ObjectType.Building) {
            return 500000 + (unit.maxHitPoints ?? 0);
        }
        return unit.maxHitPoints ?? 0;
    }

    private maybeEmergencyDefend(game: GameApi): boolean {
        const options = this.emergencyDefenseOptions;
        if (!options.enabled || !this.isEmergencyDefenseMapAllowed(game, options.mapSignatures)) {
            return false;
        }
        const defaultGlobalEmergencyDefense =
            options.mapSignatures.length === 0 &&
            !options.hfoWestVsEastOnly &&
            !options.hfoBottomOnly &&
            options.radius === DEFAULT_EMERGENCY_DEFENSE_OPTIONS.radius &&
            options.minCombatants === DEFAULT_EMERGENCY_DEFENSE_OPTIONS.minCombatants &&
            options.maxDefenders === DEFAULT_EMERGENCY_DEFENSE_OPTIONS.maxDefenders &&
            options.orderIntervalTicks === DEFAULT_EMERGENCY_DEFENSE_OPTIONS.orderIntervalTicks &&
            options.directAttackKnownTargets === DEFAULT_EMERGENCY_DEFENSE_OPTIONS.directAttackKnownTargets;
        if (defaultGlobalEmergencyDefense && !this.isHeckFreezesOver(game)) {
            return false;
        }
        if (options.hfoWestVsEastOnly && !this.isHfoWestVsEast(game)) {
            return false;
        }
        if (options.hfoBottomOnly && !this.isHfoBottomVsTop(game)) {
            return false;
        }
        const hfoBottomVsTop = this.isHfoBottomVsTop(game);
        const orderIntervalTicks =
            hfoBottomVsTop && options.orderIntervalTicks === DEFAULT_EMERGENCY_DEFENSE_OPTIONS.orderIntervalTicks
                ? 8
                : options.orderIntervalTicks;
        if (game.getCurrentTick() < this.lastEmergencyDefenseOrderAt + orderIntervalTicks) {
            return false;
        }

        const importantOwnUnits = this.getImportantOwnUnits(game);
        if (importantOwnUnits.length === 0) {
            return false;
        }

        const radius =
            hfoBottomVsTop && options.radius === DEFAULT_EMERGENCY_DEFENSE_OPTIONS.radius ? 50 : options.radius;
        const radiusSquared = radius * radius;
        const threateningEnemies = this.getKnownEnemyCombatUnits(game).filter(
            (unit) => this.getClosestDistanceSquared(unit, importantOwnUnits) <= radiusSquared,
        );
        if (threateningEnemies.length === 0) {
            return false;
        }

        const target = maxBy(threateningEnemies, (unit) => this.getEmergencyDefenseWeight(unit, importantOwnUnits));
        if (!target) {
            return false;
        }

        const defenders = this.prepareUnitsForAttackMove(
            this.getMobileCombatants(game)
                .sort((left, right) => this.getDistanceSquared(left, target) - this.getDistanceSquared(right, target))
                .slice(0, options.maxDefenders),
        ).map((unit) => unit.id);
        if (defenders.length < options.minCombatants) {
            return false;
        }

        if (options.directAttackKnownTargets) {
            this.player.actions.orderUnits(defenders, OrderType.Attack, target.id);
        } else {
            this.player.actions.orderUnits(defenders, OrderType.AttackMove, target.tile.rx, target.tile.ry);
        }
        this.lastEmergencyDefenseOrderAt = game.getCurrentTick();
        return true;
    }

    private isEmergencyDefenseMapAllowed(game: GameApi, mapSignatures: string[]): boolean {
        if (mapSignatures.length === 0) {
            return true;
        }
        return mapSignatures.includes(this.getMapSignature(game));
    }

    private getMapSignature(game: GameApi): string {
        const { width, height } = game.mapApi.getRealMapSize();
        const starts = game.mapApi
            .getStartingLocations()
            .map((start) => `${start.x},${start.y}`)
            .sort();
        return `${width}x${height}:${starts.join(";")}`;
    }

    private maybeRouteAttack(game: GameApi): void {
        const options = this.routeAttackOptions;
        if (!options.enabled || game.getCurrentTick() < options.minTick || options.waypoints.length === 0) {
            return;
        }
        if (options.hfoWestVsEastOnly && !this.isHfoWestVsEast(game)) {
            return;
        }
        if (game.getCurrentTick() < this.lastRouteAttackOrderAt + options.orderIntervalTicks) {
            return;
        }

        const ownCombatants = this.getMobileCombatants(game);
        if (ownCombatants.length < options.minCombatants) {
            return;
        }

        const stage = Math.floor((game.getCurrentTick() - options.minTick) / options.advanceIntervalTicks);
        const ids = ownCombatants.map((unit) => unit.id);
        if (stage < options.waypoints.length) {
            const waypoint = options.waypoints[stage];
            if (!game.mapApi.getTile(waypoint.x, waypoint.y)) {
                this.lastRouteAttackOrderAt = game.getCurrentTick();
                return;
            }
            this.player.actions.orderUnits(ids, OrderType.AttackMove, waypoint.x, waypoint.y);
        } else {
            const target = this.findBestKnownTarget(game);
            if (target && options.directAttackKnownTargets) {
                this.player.actions.orderUnits(ids, OrderType.Attack, target.id);
            } else if (target) {
                this.player.actions.orderUnits(ids, OrderType.AttackMove, target.tile.rx, target.tile.ry);
            } else {
                const waypoint = options.waypoints[options.waypoints.length - 1];
                if (!game.mapApi.getTile(waypoint.x, waypoint.y)) {
                    this.lastRouteAttackOrderAt = game.getCurrentTick();
                    return;
                }
                this.player.actions.orderUnits(ids, OrderType.AttackMove, waypoint.x, waypoint.y);
            }
        }
        this.lastRouteAttackOrderAt = game.getCurrentTick();
    }

    private maybeHarvesterHarass(game: GameApi): void {
        const options = this.harvesterHarassOptions;
        if (!options.enabled || game.getCurrentTick() < options.minTick) {
            return;
        }
        if (game.getCurrentTick() < this.lastHarvesterHarassOrderAt + options.orderIntervalTicks) {
            return;
        }

        const ownHarvesters = game
            .getVisibleUnits(this.name, "self", (rules) => rules.harvester)
            .map((id) => game.getUnitData(id))
            .filter((unit): unit is UnitData => !!unit);
        if (ownHarvesters.length < options.minHarvesters) {
            return;
        }

        const target = this.findBestHarassTarget(game);
        if (!target) {
            return;
        }

        const attackers = ownHarvesters
            .sort((left, right) => this.getDistanceSquared(left, target) - this.getDistanceSquared(right, target))
            .slice(0, Math.min(options.maxHarvesters, ownHarvesters.length))
            .map((unit) => unit.id);
        if (attackers.length === 0) {
            return;
        }
        if (options.directAttackKnownTargets) {
            this.player.actions.orderUnits(attackers, OrderType.Attack, target.id);
        } else {
            this.player.actions.orderUnits(attackers, OrderType.AttackMove, target.tile.rx, target.tile.ry);
        }
        this.lastHarvesterHarassOrderAt = game.getCurrentTick();
    }

    private maybeHarass(game: GameApi): void {
        const options = this.harassOptions;
        if (!options.enabled || game.getCurrentTick() < options.minTick) {
            return;
        }
        if (game.getCurrentTick() < this.lastHarassOrderAt + options.orderIntervalTicks) {
            return;
        }

        const ownCombatants = this.getMobileCombatants(game);
        if (ownCombatants.length < options.minCombatants) {
            return;
        }

        const enemyCombatants = this.getKnownEnemyCombatUnits(game);
        if (enemyCombatants.length > options.maxEnemyCombatants) {
            return;
        }
        if (ownCombatants.length < enemyCombatants.length + options.combatantAdvantage) {
            return;
        }

        const target = this.findBestHarassTarget(game);
        if (!target) {
            return;
        }

        const attackers = ownCombatants
            .sort((left, right) => this.getDistanceSquared(left, target) - this.getDistanceSquared(right, target))
            .slice(0, Math.min(options.maxUnits, ownCombatants.length))
            .map((unit) => unit.id);
        if (options.directAttackKnownTargets) {
            this.player.actions.orderUnits(attackers, OrderType.Attack, target.id);
        } else {
            this.player.actions.orderUnits(attackers, OrderType.AttackMove, target.tile.rx, target.tile.ry);
        }
        this.lastHarassOrderAt = game.getCurrentTick();
    }

    private maybeIslandTechAttack(game: GameApi): boolean {
        const tick = game.getCurrentTick();
        if (!this.isTsunami(game) || tick < 9000) {
            return false;
        }
        const enemyCombatants = this.getKnownEnemyCombatUnits(game);
        const enemyBuildings = this.getKnownEnemyBuildings(game);
        const cleanupMode = tick >= 30000 && enemyCombatants.length === 0 && enemyBuildings.length > 0 && enemyBuildings.length <= 8;
        const orderIntervalTicks = cleanupMode ? 15 : 60;
        if (tick < this.lastIslandTechAttackOrderAt + orderIntervalTicks) {
            return true;
        }

        const ownCombatants = this.getIslandAttackUnits(game);
        if (ownCombatants.length < 1) {
            return false;
        }

        const targets = cleanupMode
            ? this.selectIslandCleanupTargets(enemyBuildings, 1)
            : this.findBestKnownTargets(game, 12);
        if (targets.length === 0) {
            return false;
        }

        const attackers = this.prepareUnitsForAttackMove(ownCombatants);
        if (attackers.length === 0) {
            return true;
        }
        if (targets.length === 1) {
            const [target] = targets;
            const attackerIds = attackers.map((unit) => unit.id);
            if (cleanupMode) {
                this.player.actions.orderUnits(attackerIds, OrderType.Attack, target.id);
            } else {
                this.player.actions.orderUnits(attackerIds, OrderType.AttackMove, target.tile.rx, target.tile.ry);
            }
            this.lastIslandTechAttackOrderAt = tick;
            return true;
        }
        targets.forEach((target, index) => {
            const assignedUnits = attackers
                .filter((_, unitIndex) => unitIndex % targets.length === index)
                .map((unit) => unit.id);
            if (assignedUnits.length === 0) {
                return;
            }
            this.player.actions.orderUnits(assignedUnits, OrderType.AttackMove, target.tile.rx, target.tile.ry);
        });
        this.lastIslandTechAttackOrderAt = tick;
        return true;
    }

    private getIslandAttackUnits(game: GameApi): UnitData[] {
        const mobileCombatants = this.getMobileCombatants(game).filter(
            (unit) => unit.rules.name !== "DOG" && unit.rules.name !== "ADOG",
        );
        const preferredUnits = mobileCombatants
            .filter((unit) => ISLAND_ATTACK_UNIT_WEIGHTS.has(unit.rules.name))
            .sort((left, right) => this.getIslandAttackUnitWeight(right) - this.getIslandAttackUnitWeight(left));
        return preferredUnits.length > 0 ? preferredUnits : mobileCombatants;
    }

    private getIslandAttackUnitWeight(unit: UnitData): number {
        return ISLAND_ATTACK_UNIT_WEIGHTS.get(unit.rules.name) ?? 0;
    }

    private selectIslandCleanupTargets(targets: UnitData[], maxTargets: number): UnitData[] {
        return targets
            .sort((left, right) => this.getTargetWeight(right) - this.getTargetWeight(left))
            .slice(0, maxTargets);
    }

    private maybeForceAttack(game: GameApi): void {
        const options = this.forceAttackOptions;
        if (!options.enabled || game.getCurrentTick() < options.minTick) {
            return;
        }
        if (options.hfoWestVsEastOnly && !this.isHfoWestVsEast(game)) {
            return;
        }
        if (game.getCurrentTick() < this.lastForceAttackOrderAt + options.orderIntervalTicks) {
            return;
        }

        const ownCombatants = this.getMobileCombatants(game);
        if (ownCombatants.length < options.minCombatants) {
            return;
        }

        const enemyCombatants = this.getKnownEnemyCombatUnits(game);
        if (enemyCombatants.length > options.maxEnemyCombatants) {
            return;
        }
        if (ownCombatants.length < enemyCombatants.length + options.combatantAdvantage) {
            return;
        }

        const targets = this.findBestKnownTargets(game, options.maxTargets);
        if (targets.length === 0) {
            return;
        }

        if (targets.length === 1) {
            const [target] = targets;
            const ownCombatantIds = ownCombatants
                .sort((left, right) => this.getDistanceSquared(left, target) - this.getDistanceSquared(right, target))
                .map((unit) => unit.id);
            if (options.directAttackKnownTargets) {
                this.player.actions.orderUnits(ownCombatantIds, OrderType.Attack, target.id);
            } else {
                this.player.actions.orderUnits(ownCombatantIds, OrderType.AttackMove, target.tile.rx, target.tile.ry);
            }
        } else {
            targets.forEach((target, index) => {
                const assignedUnits = ownCombatants
                    .filter((_, unitIndex) => unitIndex % targets.length === index)
                    .map((unit) => unit.id);
                if (assignedUnits.length === 0) {
                    return;
                }
                if (options.directAttackKnownTargets) {
                    this.player.actions.orderUnits(assignedUnits, OrderType.Attack, target.id);
                } else {
                    this.player.actions.orderUnits(assignedUnits, OrderType.AttackMove, target.tile.rx, target.tile.ry);
                }
            });
        }
        this.lastForceAttackOrderAt = game.getCurrentTick();
    }

    private getKnownEnemyUnits(game: GameApi, filter?: (unit: UnitData) => boolean): UnitData[] {
        const playerData = game.getPlayerData(this.name);
        return game
            .getAllUnits()
            .map((id) => game.getUnitData(id))
            .filter((unit): unit is UnitData => !!unit && !isOwnedByNeutral(unit))
            .filter((unit) => unit.owner !== playerData.name)
            .filter((unit) => !game.areAlliedPlayers(playerData.name, unit.owner))
            .filter((unit) => game.getPlayerData(unit.owner).isCombatant)
            .filter((unit) => !filter || filter(unit));
    }

    private getMobileCombatants(game: GameApi): UnitData[] {
        return game
            .getVisibleUnits(
                this.name,
                "self",
                (rules) => rules.isSelectableCombatant && !rules.harvester && rules.type !== ObjectType.Building,
            )
            .map((id) => game.getUnitData(id))
            .filter((unit): unit is UnitData => !!unit);
    }

    private getHfoCloseoutUnits(game: GameApi, includeHarvesters: boolean): UnitData[] {
        const combatants = this.getMobileCombatants(game);
        if (!includeHarvesters) {
            return combatants;
        }
        const harvesters = game
            .getVisibleUnits(this.name, "self", (rules) => rules.harvester)
            .map((id) => game.getUnitData(id))
            .filter((unit): unit is UnitData => !!unit);
        return [...combatants, ...harvesters];
    }

    private getHfoDemolitionUnits(game: GameApi): UnitData[] {
        return this.getMobileCombatants(game)
            .filter((unit) => HFO_DEMOLITION_UNIT_WEIGHTS.has(unit.rules.name))
            .sort((left, right) => this.getHfoDemolitionUnitWeight(right) - this.getHfoDemolitionUnitWeight(left));
    }

    private getHfoDemolitionUnitWeight(unit: UnitData): number {
        return HFO_DEMOLITION_UNIT_WEIGHTS.get(unit.rules.name) ?? 0;
    }

    private getKnownEnemyCombatUnits(game: GameApi): UnitData[] {
        return this.getKnownEnemyUnits(
            game,
            (unit) =>
                !!unit.rules.isSelectableCombatant && !unit.rules.harvester && unit.rules.type !== ObjectType.Building,
        );
    }

    private getKnownEnemyBuildings(game: GameApi): UnitData[] {
        return this.getKnownEnemyUnits(game, (unit) => unit.rules.type === ObjectType.Building);
    }

    private findBestKnownTarget(game: GameApi): UnitData | null {
        return maxBy(this.getKnownEnemyUnits(game), (unit) => this.getTargetWeight(unit));
    }

    private findBestKnownTargets(game: GameApi, maxTargets: number): UnitData[] {
        if (maxTargets <= 1) {
            const target = this.findBestKnownTarget(game);
            return target ? [target] : [];
        }
        return this.getKnownEnemyUnits(game)
            .sort((left, right) => this.getTargetWeight(right) - this.getTargetWeight(left))
            .slice(0, maxTargets);
    }

    private getImportantOwnUnits(game: GameApi): UnitData[] {
        return game
            .getVisibleUnits(
                this.name,
                "self",
                (rules) => rules.constructionYard || rules.refinery || rules.weaponsFactory,
            )
            .map((id) => game.getUnitData(id))
            .filter((unit): unit is UnitData => !!unit);
    }

    private isDogUnit(unit: UnitData): boolean {
        return unit.rules.name === "DOG" || unit.rules.name === "ADOG";
    }

    private isInfantryThreat(unit: UnitData): boolean {
        return unit.rules.type === ObjectType.Infantry;
    }

    private getClosestDistanceSquared(unit: UnitData, targets: UnitData[]): number {
        return targets.reduce(
            (closest, target) => Math.min(closest, this.getDistanceSquared(unit, target)),
            Number.POSITIVE_INFINITY,
        );
    }

    private getClosestPointDistanceSquared(unit: UnitData, points: Array<{ x: number; y: number }>): number {
        return points.reduce((closest, point) => {
            const dx = unit.tile.rx - point.x;
            const dy = unit.tile.ry - point.y;
            return Math.min(closest, dx * dx + dy * dy);
        }, Number.POSITIVE_INFINITY);
    }

    private isHfoBottomApproachEnemy(unit: UnitData): boolean {
        const { rx, ry } = unit.tile;
        if (rx < 42 || rx > 134 || ry < 82 || ry > 152) {
            return false;
        }
        if (ry >= 118) {
            return true;
        }
        return this.getClosestPointDistanceSquared(unit, HFO_BOTTOM_INTERCEPT_POINTS) <=
            HFO_BOTTOM_INTERCEPT_RADIUS * HFO_BOTTOM_INTERCEPT_RADIUS;
    }

    private getDistanceSquared(left: UnitData, right: UnitData): number {
        const dx = left.tile.rx - right.tile.rx;
        const dy = left.tile.ry - right.tile.ry;
        return dx * dx + dy * dy;
    }

    private isWeakStartProxyAttackTarget(unit: UnitData): boolean {
        return (
            unit.rules.constructionYard ||
            unit.rules.name === "AMCV" ||
            unit.rules.name === "SMCV" ||
            unit.rules.weaponsFactory ||
            unit.rules.nodBarracks ||
            unit.rules.gdiBarracks ||
            unit.rules.refinery ||
            HFO_DEFENSE_BUILDINGS.has(unit.rules.name) ||
            unit.rules.type === ObjectType.Building ||
            !!unit.rules.isSelectableCombatant
        );
    }

    private getWeakStartProxyAttackerWeight(unit: UnitData, targets: UnitData[]): number {
        const distance = this.getClosestDistanceSquared(unit, targets);
        if (unit.rules.name === "HTNK" || unit.rules.name === "MTNK") {
            return distance;
        }
        if (unit.rules.type === ObjectType.Infantry) {
            return 10000 + distance;
        }
        return 5000 + distance;
    }

    private getWeakStartProxyAttackTargetWeight(unit: UnitData, profile: "default" | "defenseBreak" = "default"): number {
        if (profile === "defenseBreak") {
            return this.getWeakStartDefenseBreakTargetWeight(unit);
        }
        if (unit.rules.constructionYard || unit.rules.name === "AMCV" || unit.rules.name === "SMCV") {
            return 3000000 + (unit.maxHitPoints ?? 0);
        }
        if (unit.rules.weaponsFactory || unit.rules.nodBarracks || unit.rules.gdiBarracks) {
            return 2600000 + (unit.maxHitPoints ?? 0);
        }
        if (unit.rules.refinery) {
            return 2500000 + (unit.maxHitPoints ?? 0);
        }
        if (HFO_DEFENSE_BUILDINGS.has(unit.rules.name)) {
            return 2400000 + (unit.maxHitPoints ?? 0);
        }
        if (unit.rules.type === ObjectType.Building) {
            return 2200000 + (unit.maxHitPoints ?? 0);
        }
        if (unit.rules.isSelectableCombatant) {
            return 1000000 + (unit.maxHitPoints ?? 0);
        }
        return unit.maxHitPoints ?? 0;
    }

    private getEmergencyDefenseWeight(unit: UnitData, importantOwnUnits: UnitData[]): number {
        const distancePenalty = this.getClosestDistanceSquared(unit, importantOwnUnits);
        if (unit.rules.isSelectableCombatant) {
            return 1000000 + (unit.maxHitPoints ?? 0) - distancePenalty;
        }
        return (unit.maxHitPoints ?? 0) - distancePenalty;
    }

    private findBestHarassTarget(game: GameApi): UnitData | null {
        return maxBy(this.getKnownEnemyUnits(game), (unit) => this.getHarassTargetWeight(unit));
    }

    private getHarassTargetWeight(unit: UnitData): number {
        if (unit.rules.harvester) {
            return 1000000;
        }
        if (unit.rules.refinery) {
            return 900000;
        }
        if (unit.rules.weaponsFactory) {
            return 800000;
        }
        if (unit.rules.constructionYard) {
            return 700000;
        }
        if (unit.rules.type === ObjectType.Building) {
            return 300000 + (unit.maxHitPoints ?? 0);
        }
        return unit.rules.isSelectableCombatant ? 1000 + (unit.maxHitPoints ?? 0) : 0;
    }

    private getTargetWeight(unit: UnitData): number {
        if (unit.rules.constructionYard) {
            return 1000000;
        }
        if (unit.rules.weaponsFactory) {
            return 900000;
        }
        if (unit.rules.refinery) {
            return 800000;
        }
        if (unit.rules.harvester) {
            return 700000;
        }
        if (unit.rules.type === ObjectType.Building) {
            return 600000 + (unit.maxHitPoints ?? 0);
        }
        if (unit.rules.isSelectableCombatant) {
            return 500000 + (unit.maxHitPoints ?? 0);
        }
        return unit.maxHitPoints ?? 0;
    }
}
