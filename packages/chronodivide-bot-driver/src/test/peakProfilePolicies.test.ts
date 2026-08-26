import { describe, expect, it } from "vitest";
import { PEAK_PROFILE_ARMS, peakProfileOptions } from "../training/peakProfilePolicies.js";

describe("Peak profile-scope policies", () => {
    it("freezes the scope factorial and historical arms", () => {
        expect(PEAK_PROFILE_ARMS).toEqual([
            { id: "deployed", strategyScope: "weak_only", botScope: "weak_only", historical: false },
            { id: "strategy_both", strategyScope: "both", botScope: "weak_only", historical: false },
            { id: "bot_both", strategyScope: "weak_only", botScope: "both", historical: false },
            { id: "both_both", strategyScope: "both", botScope: "both", historical: false },
            { id: "historical_defensive_infantry", strategyScope: "weak_only", botScope: "weak_only", historical: true },
            { id: "historical_defensive_infantry_bot_both", strategyScope: "weak_only", botScope: "both", historical: true },
        ]);
    });

    it("changes only the declared scope for factorial arms", () => {
        for (const arm of PEAK_PROFILE_ARMS.filter((row) => !row.historical)) {
            expect(peakProfileOptions(arm)).toEqual({
                strategyOptions: { peakOfPerfectionProfileScope: arm.strategyScope },
                botOptions: { peakOfPerfectionProfileScope: arm.botScope },
            });
        }
    });

    it("reconstructs the historical defensive-infantry seed", () => {
        const arm = PEAK_PROFILE_ARMS.find((row) => row.id === "historical_defensive_infantry")!;
        const { strategyOptions, botOptions } = peakProfileOptions(arm);
        expect(strategyOptions).toMatchObject({
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
            strategicPlan: { enabled: false, plan: "off" },
            macroBoost: { enabled: false }, staticDefenseBoost: { enabled: false }, allIn: { enabled: false },
        });
        expect(botOptions).toMatchObject({
            defaultMapProfiles: true, exactMapTactics: true, peakOfPerfectionProfileScope: "weak_only",
            harass: { enabled: false }, forceAttack: { enabled: false, minTick: 12_600,
                minCombatants: 10, combatantAdvantage: -6, maxEnemyCombatants: 10 },
            routeAttack: { enabled: false }, hfoCloseout: { enabled: false },
            hfoWestSweep: { enabled: false }, emergencyDefense: { enabled: false },
        });
    });

    it("adds only reciprocal bot/tactic scope to the historical variant", () => {
        const plain = peakProfileOptions(PEAK_PROFILE_ARMS[4]), both = peakProfileOptions(PEAK_PROFILE_ARMS[5]);
        expect(both.strategyOptions).toEqual(plain.strategyOptions);
        expect({ ...both.botOptions, peakOfPerfectionProfileScope: "weak_only" }).toEqual(plain.botOptions);
        expect(both.botOptions.peakOfPerfectionProfileScope).toBe("both");
    });
});
