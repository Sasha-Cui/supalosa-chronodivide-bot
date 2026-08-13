import { describe, expect, it } from "vitest";
import {
    ObjectiveAssetThreatProjection,
    ObjectiveAttacker,
    ObjectiveBuilding,
    ObjectiveSchedulerThresholds,
    ObjectiveThreat,
    selectContinuousObjectiveMission,
    selectObjectiveMission,
} from "@supalosa/chronodivide-bot/dist/bot/logic/objective/terminalObjectiveDecisionCore.js";

const attacker: ObjectiveAttacker = {
    id: 1,
    x: 0,
    y: 0,
    hitPoints: 1_000,
    speedTilesPerTick: 1,
    rangeTiles: 1,
    buildingDamagePerVolley: 100,
    buildingRateOfFireTicks: 1,
    projectileTravelTicks: 0,
    initialCooldownTicks: 0,
};

const lastBuilding: ObjectiveBuilding = {
    id: 2,
    x: 5,
    y: 0,
    hitPoints: 100,
    visible: true,
};

const thresholds: ObjectiveSchedulerThresholds = {
    routeCorridorRadius: 0,
    interceptHorizonTicks: 100,
    baseDefenseHorizonTicks: 100,
    blockerLethalDamageFraction: 0.5,
    directCompletionSafetyMarginTicks: 0,
    missionLivenessTicks: 100,
};

const threat = (id: number, x: number, y: number): ObjectiveThreat => ({
    id,
    x,
    y,
    hitPoints: 1_000,
    speedTilesPerTick: 0,
    rangeTiles: 0,
    damagePerVolleyToStrike: 1_000,
    rateOfFireTicks: 1,
    currentlyDamagingStrike: false,
    initialCooldownTicks: 0,
    calibrationStatus: "ordinary_direct_upper_bound",
});

const terminalArgs = (threats: ObjectiveThreat[], projections: ObjectiveAssetThreatProjection[]) => ({
    attackers: [attacker],
    buildings: [lastBuilding],
    selectedBuildingId: lastBuilding.id,
    committedBuildingId: null,
    committedBuildingMadeProgress: false,
    threats,
    baseAssets: [{
        id: 500,
        x: 0,
        y: 100,
        hitPoints: 100,
        soleSurvivingBuilding: true,
        lastRequiredCapability: false,
    }],
    assetThreatProjections: projections,
    terminalEvidence: {
        remainingKnownBuildingCount: 1,
        allPreviouslyKnownAlternativesInvalidated: true,
        searchCoverageFraction: 1,
        requiredSearchCoverageFraction: 0.9,
    },
    noProgressTicks: 0,
    thresholds,
    blockerThenBuildingCompletionTicks: null,
});

describe("terminal objective force-versus-building priority", () => {
    it("attacks the last building even when 100 irrelevant tanks can destroy our final base first", () => {
        const tanks = Array.from({ length: 100 }, (_, index) => threat(100 + index, 100, 100 + index));
        const projections = tanks.map((tank): ObjectiveAssetThreatProjection => ({
            threatId: tank.id,
            assetId: 500,
            firstVolleyTick: 1,
            damagePerVolley: 100,
            rateOfFireTicks: 1,
            calibrationStatus: "ordinary_direct_upper_bound",
        }));
        expect(selectObjectiveMission(terminalArgs(tanks, projections))).toMatchObject({
            kind: "terminal_candidate_strike",
            buildingId: lastBuilding.id,
            reason: "sole_known_building_before_intercept",
        });
    });

    it("clears only forces that make the direct final-building strike unsurvivable", () => {
        const blocker = {
            ...threat(100, 2, 0),
            currentlyDamagingStrike: true,
        };
        expect(selectObjectiveMission({
            ...terminalArgs([blocker], []),
            blockerThenBuildingCompletionTicks: 12,
        })).toEqual({
            kind: "blocker_clear",
            buildingId: lastBuilding.id,
            blockerIds: [blocker.id],
            predictedCompletionTicks: 12,
            reason: "direct_strike_not_survivable",
        });
    });

    it("still defends the final base before a nonterminal objective", () => {
        const tank = threat(100, 100, 100);
        const projection: ObjectiveAssetThreatProjection = {
            threatId: tank.id,
            assetId: 500,
            firstVolleyTick: 1,
            damagePerVolley: 100,
            rateOfFireTicks: 1,
            calibrationStatus: "ordinary_direct_upper_bound",
        };
        expect(selectObjectiveMission({
            ...terminalArgs([tank], [projection]),
            terminalEvidence: {
                remainingKnownBuildingCount: 2,
                allPreviouslyKnownAlternativesInvalidated: false,
                searchCoverageFraction: 0.5,
                requiredSearchCoverageFraction: 0.9,
            },
        })).toEqual({
            kind: "base_defense",
            threatIds: [tank.id],
            reason: "base_falls_before_objective",
        });
    });
});

describe("continuous objective offense", () => {
    it("attacks an exposed last building despite 100 uncalibrated tanks outside the route", () => {
        const tanks = Array.from({ length: 100 }, (_, index): ObjectiveThreat => ({
            ...threat(100 + index, 1_000, 1_000 + index),
            speedTilesPerTick: 0,
            rangeTiles: 0,
            calibrationStatus: "uncalibrated_special",
        }));
        expect(selectContinuousObjectiveMission(terminalArgs(tanks, []))).toMatchObject({
            kind: "terminal_candidate_strike",
            buildingId: lastBuilding.id,
        });
    });

    it("actively clears an uncalibrated force that intersects the building route", () => {
        const blocker: ObjectiveThreat = {
            ...threat(100, 2, 0),
            calibrationStatus: "uncalibrated_special",
        };
        expect(selectContinuousObjectiveMission(terminalArgs([blocker], []))).toEqual({
            kind: "blocker_clear",
            buildingId: lastBuilding.id,
            blockerIds: [blocker.id],
            predictedCompletionTicks: null,
            reason: "direct_strike_not_survivable",
        });
    });

    it("clears a calibrated route blocker even when exact clearance time is unavailable", () => {
        const blocker = {
            ...threat(100, 2, 0),
            currentlyDamagingStrike: true,
        };
        expect(selectContinuousObjectiveMission(terminalArgs([blocker], []))).toEqual({
            kind: "blocker_clear",
            buildingId: lastBuilding.id,
            blockerIds: [blocker.id],
            predictedCompletionTicks: null,
            reason: "direct_strike_not_survivable",
        });
    });

    it("does not abandon a nonterminal building for a threatened home base", () => {
        const tank = threat(100, 100, 100);
        const projection: ObjectiveAssetThreatProjection = {
            threatId: tank.id,
            assetId: 500,
            firstVolleyTick: 1,
            damagePerVolley: 100,
            rateOfFireTicks: 1,
            calibrationStatus: "ordinary_direct_upper_bound",
        };
        expect(selectContinuousObjectiveMission({
            ...terminalArgs([tank], [projection]),
            terminalEvidence: {
                remainingKnownBuildingCount: 2,
                allPreviouslyKnownAlternativesInvalidated: false,
                searchCoverageFraction: 0.5,
                requiredSearchCoverageFraction: 0.9,
            },
        })).toMatchObject({
            kind: "building_strike",
            buildingId: lastBuilding.id,
        });
    });

    it("supports the prespecified fight-all-forces causal ablation", () => {
        const offRoute = threat(100, 100, 100);
        expect(selectContinuousObjectiveMission({
            ...terminalArgs([offRoute], []),
            forceEngagementMode: "all_observed_forces_first",
        })).toMatchObject({
            kind: "blocker_clear",
            blockerIds: [offRoute.id],
        });
    });

    it("supports the prespecified buildings-only causal ablation", () => {
        const lethalBlocker = { ...threat(100, 2, 0), currentlyDamagingStrike: true };
        expect(selectContinuousObjectiveMission({
            ...terminalArgs([lethalBlocker], []),
            forceEngagementMode: "buildings_only",
        })).toMatchObject({
            kind: "terminal_candidate_strike",
            buildingId: lastBuilding.id,
        });
    });
});
