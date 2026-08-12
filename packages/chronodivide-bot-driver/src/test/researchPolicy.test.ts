import { describe, expect, test } from "vitest";
import {
    buildResearchBotOptions,
    buildResearchStrategyOptions,
    DEFAULT_RESEARCH_POLICY,
    METHOD_V3_STARTING_POLICY,
    parseResearchPolicy,
    RESEARCH_POLICY_SEARCH_SPACE,
    researchPolicySha256,
} from "../training/researchPolicy.js";


describe("research policy interface", () => {
    test("parses and hashes the canonical default policy deterministically", () => {
        expect(parseResearchPolicy(DEFAULT_RESEARCH_POLICY)).toEqual(DEFAULT_RESEARCH_POLICY);
        expect(researchPolicySha256(DEFAULT_RESEARCH_POLICY)).toMatch(/^[0-9a-f]{64}$/);
        expect(researchPolicySha256({ ...DEFAULT_RESEARCH_POLICY })).toBe(
            researchPolicySha256(DEFAULT_RESEARCH_POLICY),
        );
    });

    test("rejects map identity, coordinate, and unknown fields", () => {
        expect(() => parseResearchPolicy({ ...DEFAULT_RESEARCH_POLICY, mapName: "secret.map" })).toThrow(
            /unexpected=\[mapName\]/,
        );
        expect(() => parseResearchPolicy({ ...DEFAULT_RESEARCH_POLICY, routeWaypoints: "10,20" })).toThrow(
            /routeWaypoints/,
        );
        expect(() => parseResearchPolicy({ ...DEFAULT_RESEARCH_POLICY, strategicPlan: "hfo" })).toThrow(
            /strategicPlan must be one of/,
        );
    });

    test("forces all map profiles and coordinate-specific tactics off", () => {
        const strategy = buildResearchStrategyOptions(DEFAULT_RESEARCH_POLICY);
        const bot = buildResearchBotOptions(DEFAULT_RESEARCH_POLICY);
        expect(strategy.defaultMapProfiles).toBe(false);
        expect(strategy.base?.attackGate?.hfoOnly).toBe(false);
        expect(strategy.base?.attackSuppression?.hfoBottomOnly).toBe(false);
        expect(strategy.staticDefenseBoost?.hfoBottomOnly).toBe(false);
        expect(strategy.staticDefenseBoost?.placementAnchors).toEqual([]);
        expect(strategy.allIn?.hfoWestVsEastOnly).toBe(false);
        expect(bot.defaultMapProfiles).toBe(false);
        expect(bot.exactMapTactics).toBe(false);
        expect(bot.routeAttack?.enabled).toBe(false);
        expect(bot.routeAttack?.waypoints).toEqual([]);
        expect(bot.forceAttack?.hfoWestVsEastOnly).toBe(false);
        expect(bot.emergencyDefense?.mapSignatures).toEqual([]);
        expect(bot.emergencyDefense?.hfoWestVsEastOnly).toBe(false);
        expect(bot.emergencyDefense?.hfoBottomOnly).toBe(false);
        expect(bot.hfoCloseout?.enabled).toBe(false);
        expect(bot.hfoWestSweep?.enabled).toBe(false);
        expect(bot.hfoEastSweep?.enabled).toBe(false);
        expect(bot.hfoBottomSweep?.enabled).toBe(false);
        expect(bot.hfoBottomPincer?.enabled).toBe(false);
        expect(bot.hfoBottomCloseout?.enabled).toBe(false);
        expect(bot.hfoBottomDemolition?.enabled).toBe(false);
        expect(bot.hfoBottomHomeGuard?.enabled).toBe(false);
    });

    test("parses, hashes, and materializes the canonical method-v3 finisher policy", () => {
        expect(parseResearchPolicy(METHOD_V3_STARTING_POLICY)).toEqual(METHOD_V3_STARTING_POLICY);
        expect(researchPolicySha256(METHOD_V3_STARTING_POLICY)).toMatch(/^[0-9a-f]{64}$/);
        expect(researchPolicySha256(METHOD_V3_STARTING_POLICY)).not.toBe(
            researchPolicySha256(DEFAULT_RESEARCH_POLICY),
        );
        const policy = {
            ...METHOD_V3_STARTING_POLICY,
            allInDisbandExistingAttacks: true,
            rushSellEnabled: false,
            finisherArtilleryTargetCount: 6,
            buildingEliminationEnabled: true,
            buildingEliminationTargetPriority: "defense" as const,
            buildingEliminationObservationMode: "visibleOnly" as const,
        };
        const strategy = buildResearchStrategyOptions(policy);
        expect(strategy.defaultMapProfiles).toBe(false);
        expect(strategy.allIn?.disbandExistingAttacks).toBe(true);
        expect(strategy.strategicPlan).toMatchObject({
            rushSellEnabled: false,
            finisherArtilleryTargetCount: 6,
        });
        expect(strategy.buildingElimination).toEqual({
            enabled: true,
            minTick: policy.buildingEliminationMinTick,
            minCombatants: policy.buildingEliminationMinCombatants,
            combatantAdvantage: policy.buildingEliminationCombatantAdvantage,
            maxEnemyCombatants: policy.buildingEliminationMaxEnemyCombatants,
            reserveCombatants: policy.buildingEliminationReserveCombatants,
            orderIntervalTicks: policy.buildingEliminationOrderIntervalTicks,
            maxTargetGroups: policy.buildingEliminationMaxTargetGroups,
            targetPriority: "defense",
            observationMode: "visibleOnly",
            directVisibleAttack: policy.buildingEliminationDirectVisibleAttack,
            preemptExistingAttacks: policy.buildingEliminationPreemptExistingAttacks,
            sweepWhenNoTargets: policy.buildingEliminationSweepWhenNoTargets,
            sweepRevisitTicks: policy.buildingEliminationSweepRevisitTicks,
        });
    });

    test("rejects method-v3 coordinate fields and invalid finisher values", () => {
        expect(() => parseResearchPolicy({ ...METHOD_V3_STARTING_POLICY, sweepWaypoints: [[10, 20]] })).toThrow(
            /sweepWaypoints/,
        );
        expect(() => parseResearchPolicy({
            ...METHOD_V3_STARTING_POLICY,
            buildingEliminationTargetPriority: "construction-yard",
        })).toThrow(/buildingEliminationTargetPriority/);
        expect(() => parseResearchPolicy({
            ...METHOD_V3_STARTING_POLICY,
            finisherArtilleryTargetCount: -1,
        })).toThrow(/finisherArtilleryTargetCount/);
    });

    test("every declared search-space value passes the strict schema", () => {
        for (const [key, values] of Object.entries(RESEARCH_POLICY_SEARCH_SPACE)) {
            for (const value of values) {
                expect(() => parseResearchPolicy({ ...DEFAULT_RESEARCH_POLICY, [key]: value })).not.toThrow();
            }
        }
    });
});
