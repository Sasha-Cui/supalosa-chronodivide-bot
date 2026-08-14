import { describe, expect, it } from "vitest";
import { UnitData } from "@chronodivide/game-api";
import {
    BuildingEliminationEngagementDecision,
    arbitrateBuildingEliminationActivation,
} from "@supalosa/chronodivide-bot/dist/bot/logic/mission/missions/buildingEliminationMission.js";

const blocker = { id: 7 } as UnitData;

const decision = (overrides: Partial<BuildingEliminationEngagementDecision> = {}):
BuildingEliminationEngagementDecision => ({
    blocker,
    reason: "route_interception_wins",
    routeThreatCount: 3,
    staticRouteThreatCount: 0,
    estimatedBuildingCompletionTicks: 120,
    estimatedForceSurvivalTicks: 100,
    earliestRouteThreatInterceptTicks: 5,
    estimatedBlockerApproachTicks: 5,
    estimatedBlockerRemovalTicks: 10,
    estimatedRouteClearanceTicks: 200,
    ...overrides,
});

const arbitrate = (overrides: Partial<Parameters<typeof arbitrateBuildingEliminationActivation>[0]> = {}) =>
    arbitrateBuildingEliminationActivation({
        activationMode: "objectiveVanguardRouteClearance",
        decision: decision(),
        enemyBuildingCount: 2,
        readinessTankCount: 0,
        readinessScreenCount: 0,
        assaultTankCount: 1,
        assaultScreenCount: 3,
        requireGroundAssaultCapabilityForActivation: true,
        requireTransferredGroundAssaultCapabilityForActivation: true,
        progressiveRouteBlockerLaunch: true,
        positiveProgressBlockerLaunch: true,
        objectiveFeasibilityOverridesGroundAssaultCapability: true,
        preterminalRequiresRouteFeasibleLaunch: true,
        ...overrides,
    });

describe("mission-native closeout activation arbitration", () => {
    it("lets a feasible direct building mission override readiness composition", () => {
        const result = arbitrate({
            decision: decision({
                blocker: null,
                reason: "building_completion_race",
                estimatedBuildingCompletionTicks: 80,
            }),
            assaultTankCount: 0,
            assaultScreenCount: 8,
        });
        expect(result).toMatchObject({
            directObjectiveFeasible: true,
            completeRouteFeasible: false,
            compositionReady: false,
            buildingReady: true,
            blockerReady: false,
        });
    });

    it("launches a complete route-feasible mission without a heuristic tank veto", () => {
        const result = arbitrate({
            decision: decision({ estimatedRouteClearanceTicks: 80 }),
            assaultTankCount: 0,
            assaultScreenCount: 8,
        });
        expect(result).toMatchObject({
            completeRouteFeasible: true,
            compositionReady: false,
            conventionalBlockerReady: true,
            blockerReady: true,
        });
    });

    it("keeps a route-infeasible partial wave under predecessor control before terminal state", () => {
        const result = arbitrate();
        expect(result).toMatchObject({
            completeRouteFeasible: false,
            progressiveBlockerReady: true,
            compositionReady: true,
            partialBlockerLaunchPermitted: false,
            blockerReady: false,
        });
    });

    it("retains minimum-blocker clearance when exactly one building remains", () => {
        const result = arbitrate({ enemyBuildingCount: 1 });
        expect(result).toMatchObject({
            completeRouteFeasible: false,
            progressiveBlockerReady: true,
            partialBlockerLaunchPermitted: true,
            blockerReady: true,
        });
    });

    it("preserves V27 readiness-owned launch semantics when V28 switches are disabled", () => {
        const result = arbitrate({
            objectiveFeasibilityOverridesGroundAssaultCapability: false,
            preterminalRequiresRouteFeasibleLaunch: false,
            readinessTankCount: 0,
            readinessScreenCount: 0,
        });
        expect(result).toMatchObject({
            transferredCapabilityReady: true,
            compositionReady: false,
            blockerReady: false,
        });
    });
});
