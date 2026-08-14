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
        preterminalObjectiveFeasibilityRequiresTransferredCapability: false,
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

    it("keeps a preterminal direct infantry wave under predecessor control", () => {
        const result = arbitrate({
            decision: decision({ blocker: null, reason: "building_completion_race" }),
            assaultTankCount: 0,
            assaultScreenCount: 8,
            preterminalObjectiveFeasibilityRequiresTransferredCapability: true,
        });
        expect(result).toMatchObject({
            directObjectiveFeasible: true,
            compositionReady: false,
            objectiveFeasibilityBypassesComposition: false,
            buildingReady: false,
        });
    });

    it("keeps a preterminal complete-route infantry wave under predecessor control", () => {
        const result = arbitrate({
            decision: decision({ estimatedRouteClearanceTicks: 80 }),
            assaultTankCount: 0,
            assaultScreenCount: 8,
            preterminalObjectiveFeasibilityRequiresTransferredCapability: true,
        });
        expect(result).toMatchObject({
            completeRouteFeasible: true,
            compositionReady: false,
            objectiveFeasibilityBypassesComposition: false,
            blockerReady: false,
        });
    });

    it("launches a preterminal objective on the actual transferred combined-arms set", () => {
        const result = arbitrate({
            decision: decision({ blocker: null, reason: "building_completion_race" }),
            readinessTankCount: 0,
            readinessScreenCount: 0,
            assaultTankCount: 1,
            assaultScreenCount: 3,
            preterminalObjectiveFeasibilityRequiresTransferredCapability: true,
        });
        expect(result).toMatchObject({
            directObjectiveFeasible: true,
            compositionReady: true,
            objectiveFeasibilityBypassesComposition: false,
            buildingReady: true,
        });
    });

    it("preserves the literal-objective override for a final building", () => {
        const direct = arbitrate({
            decision: decision({ blocker: null, reason: "building_completion_race" }),
            enemyBuildingCount: 1,
            assaultTankCount: 0,
            assaultScreenCount: 8,
            preterminalObjectiveFeasibilityRequiresTransferredCapability: true,
        });
        const route = arbitrate({
            decision: decision({ estimatedRouteClearanceTicks: 80 }),
            enemyBuildingCount: 1,
            assaultTankCount: 0,
            assaultScreenCount: 8,
            preterminalObjectiveFeasibilityRequiresTransferredCapability: true,
        });
        expect(direct).toMatchObject({
            compositionReady: false,
            objectiveFeasibilityBypassesComposition: true,
            buildingReady: true,
        });
        expect(route).toMatchObject({
            compositionReady: false,
            objectiveFeasibilityBypassesComposition: true,
            blockerReady: true,
        });
    });
});
