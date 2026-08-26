import { Countries } from "@supalosa/chronodivide-bot/dist/bot/logic/common/utils.js";
import { Vector2 } from "@chronodivide/game-api";
import { StrongBotOptions } from "@supalosa/chronodivide-bot/dist/bot/strongBot.js";
import { PeakOfPerfectionProfileScope, StrongStrategyOptions } from
    "@supalosa/chronodivide-bot/dist/bot/strategy/strongStrategy.js";
import { createDeployedStrongBotCandidate } from "./deployedStrongBotCandidate.js";

export type PeakProfileArmId = "deployed" | "strategy_both" | "bot_both" | "both_both" |
    "historical_defensive_infantry" | "historical_defensive_infantry_bot_both";
export type PeakProfileArm = { id: PeakProfileArmId; strategyScope: PeakOfPerfectionProfileScope;
    botScope: PeakOfPerfectionProfileScope; historical: boolean };
export const PEAK_PROFILE_ARMS: readonly PeakProfileArm[] = [
    { id: "deployed", strategyScope: "weak_only", botScope: "weak_only", historical: false },
    { id: "strategy_both", strategyScope: "both", botScope: "weak_only", historical: false },
    { id: "bot_both", strategyScope: "weak_only", botScope: "both", historical: false },
    { id: "both_both", strategyScope: "both", botScope: "both", historical: false },
    { id: "historical_defensive_infantry", strategyScope: "weak_only", botScope: "weak_only", historical: true },
    { id: "historical_defensive_infantry_bot_both", strategyScope: "weak_only", botScope: "both", historical: true },
];

const HISTORICAL_STRATEGY: StrongStrategyOptions = {
    peakOfPerfectionProfileScope: "weak_only",
    base: {
        attackCompositionPolicy: "infantry",
        attackGate: { enabled: false, minTick: 0, minCombatants: 0,
            hfoBottomMinCombatants: 45, combatantAdvantage: 0, maxEnemyCombatants: 999 },
        attackMission: { allowDefenceSteal: false },
        defence: { checkTicks: 30, startingRadius: 24, radiusIncreasePerTick: 0.0003,
            defendProduction: true, missionPriority: 60, activePriority: 120 },
        scouting: { cooldownTicks: 180, maxConcurrentMissions: 3, missionPriority: 10 },
        engineer: { useKnownTechBuildings: true, techMaxTargets: 1,
            techMaxDistanceFromStart: 38, techPriority: 96, techEscortLevel: 2 },
    },
    macroBoost: { enabled: false },
    strategicPlan: { enabled: false, plan: "off", rushSellTick: 7_200,
        rushSellMinCombatants: 12, dogTargetCount: 2, hfoBottomDogTargetCount: 3,
        antiInfantryDogTargetCount: 5 },
    staticDefenseBoost: { enabled: false, startTick: 3_600, targetCount: 4, priority: 28 },
    allIn: { enabled: false, minTick: 10_800, minCombatants: 4, combatantAdvantage: -3,
        disbandExistingAttacks: false, directVisibleAttack: false },
};
const HISTORICAL_BOT_BASE: StrongBotOptions = {
    defaultMapProfiles: true,
    exactMapTactics: true,
    peakOfPerfectionProfileScope: "weak_only",
    harass: { enabled: false, minTick: 5_400, minCombatants: 4, maxUnits: 4,
        combatantAdvantage: -4, maxEnemyCombatants: 8, orderIntervalTicks: 120,
        directAttackKnownTargets: true },
    forceAttack: { enabled: false, minTick: 12_600, minCombatants: 10,
        combatantAdvantage: -6, maxEnemyCombatants: 10, orderIntervalTicks: 45,
        directAttackKnownTargets: true, maxTargets: 1, hfoWestVsEastOnly: false },
    routeAttack: { enabled: false, minTick: 9_000, minCombatants: 10,
        orderIntervalTicks: 60, advanceIntervalTicks: 1_200,
        waypoints: [new Vector2(74, 95), new Vector2(103, 116), new Vector2(128, 122), new Vector2(151, 119)],
        directAttackKnownTargets: true, hfoWestVsEastOnly: false },
    hfoCloseout: { enabled: false, minTick: 9_000, minUnits: 6, maxEnemyBuildings: 3,
        maxEnemyCombatants: 2, orderIntervalTicks: 15, includeHarvesters: false },
    hfoWestSweep: { enabled: false, minTick: 16_200, minCombatants: 12,
        combatantAdvantage: 6, maxEnemyCombatants: 4, orderIntervalTicks: 45,
        advanceIntervalTicks: 900,
        waypoints: [{ x: 76, y: 95 }, { x: 103, y: 116 }, { x: 127, y: 122 },
            { x: 147, y: 121 }, { x: 151, y: 119 }, { x: 151, y: 129 }, { x: 140, y: 134 }],
        directAttackKnownTargets: false, maxTargets: 1 },
    emergencyDefense: { enabled: false, radius: 24, minCombatants: 1,
        maxDefenders: 999, orderIntervalTicks: 30, directAttackKnownTargets: true,
        mapSignatures: [], hfoWestVsEastOnly: false, hfoBottomOnly: false },
};

export const peakProfileOptions = (arm: PeakProfileArm): {
    strategyOptions: StrongStrategyOptions;
    botOptions: StrongBotOptions;
} => {
    if (!arm.historical) return {
        strategyOptions: { peakOfPerfectionProfileScope: arm.strategyScope },
        botOptions: { peakOfPerfectionProfileScope: arm.botScope },
    };
    return {
        strategyOptions: structuredClone(HISTORICAL_STRATEGY),
        botOptions: { ...structuredClone(HISTORICAL_BOT_BASE),
            peakOfPerfectionProfileScope: arm.botScope },
    };
};

export const createPeakProfileCandidate = (
    arm: PeakProfileArm,
    name: string,
    country: Countries,
) => {
    const options = peakProfileOptions(arm);
    return createDeployedStrongBotCandidate(name, country, options.strategyOptions, options.botOptions);
};
