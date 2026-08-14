import { describe, expect, it } from "vitest";
import { Countries } from "@supalosa/chronodivide-bot/dist/bot/logic/common/utils.js";
import { BuildingEliminationTelemetryEvent } from
    "@supalosa/chronodivide-bot/dist/bot/logic/mission/missions/buildingEliminationMission.js";
import {
    summarizeMissionNativeCloseoutV10,
    validateMissionNativeCloseoutV10Exposure,
} from "../training/missionNativeCloseoutCompatibilityGateV10.js";

type Heartbeat = Extract<BuildingEliminationTelemetryEvent, { event: "execution_heartbeat" }>;

const heartbeat = (overrides: Partial<Heartbeat> = {}): Heartbeat => ({
    schemaVersion: 5,
    event: "execution_heartbeat",
    tick: 2_703,
    targetId: 200,
    targetName: "GAWEAP",
    targetHitPoints: 1_000,
    targetHitPointDelta: null,
    targetVisible: true,
    blockerId: 100,
    blockerName: "E1",
    routeThreatCount: 8,
    assignedAttackerIds: [1, 2],
    buildingAttackerIds: [],
    blockerAttackerIds: [1, 2],
    assignedAttackerTypes: { E1: 2 },
    attackStateCounts: { "1": 2 },
    assignedAttackerCount: 2,
    buildingAttackerCount: 0,
    blockerAttackerCount: 2,
    inRangeBuildingAttackerCount: 0,
    totalAssignedHitPoints: 250,
    totalBuildingAttackerHitPoints: 0,
    totalBlockerAttackerHitPoints: 250,
    idleAttackerCount: 0,
    movingAttackerCount: 0,
    minimumDistanceToFiringPerimeter: null,
    medianDistanceToFiringPerimeter: null,
    maximumDistanceToFiringPerimeter: null,
    minimumDistanceDelta: null,
    medianDistanceDelta: null,
    noLongerAssignedUnitIds: [],
    destroyedAssignedUnitIds: [],
    directBuildingAttackCommandCount: 0,
    moveTowardBuildingCommandCount: 0,
    blockerAttackCommandCount: 2,
    ...overrides,
});

const validTelemetry = (): BuildingEliminationTelemetryEvent[] => [
    {
        schemaVersion: 7,
        event: "activation_evaluation",
        tick: 2_700,
        phase: "blocked",
        targetId: 200,
        targetName: "GAWEAP",
        blockerId: 100,
        blockerName: "E1",
        compatibleAttackerCount: 1,
        routeThreatCount: 8,
        estimatedBuildingCompletionTicks: 100,
        estimatedForceSurvivalTicks: 5,
        estimatedBlockerRemovalTicks: 10,
    },
    {
        schemaVersion: 6,
        event: "readiness_reserve",
        tick: 2_700,
        phase: "created",
        stagedCombatants: 0,
        eligibleCombatants: 1,
        vanguardCombatants: 1,
    },
    {
        schemaVersion: 2,
        event: "activation_blocked",
        tick: 2_700,
        reason: "no_viable_objective_clearance",
        ownCombatants: 2,
        enemyCombatants: 8,
        reservedCombatants: 0,
    },
    {
        schemaVersion: 6,
        event: "readiness_reserve",
        tick: 2_703,
        phase: "accumulating",
        stagedCombatants: 1,
        eligibleCombatants: 2,
        vanguardCombatants: 1,
    },
    {
        schemaVersion: 7,
        event: "activation_evaluation",
        tick: 2_703,
        phase: "blocker_ready",
        targetId: 200,
        targetName: "GAWEAP",
        blockerId: 100,
        blockerName: "E1",
        compatibleAttackerCount: 2,
        routeThreatCount: 8,
        estimatedBuildingCompletionTicks: 100,
        estimatedForceSurvivalTicks: 50,
        estimatedBlockerRemovalTicks: 10,
    },
    {
        schemaVersion: 6,
        event: "readiness_reserve",
        tick: 2_703,
        phase: "released",
        stagedCombatants: 1,
        eligibleCombatants: 2,
        vanguardCombatants: 1,
    },
    {
        schemaVersion: 1,
        event: "activated",
        tick: 2_703,
        observationMode: "publicApi",
        ownCombatants: 2,
        enemyCombatants: 8,
        reservedCombatants: 0,
        preemptedMissions: ["attack"],
    },
    {
        schemaVersion: 1,
        event: "target_orders",
        tick: 2_703,
        attackerCount: 2,
        targets: [{ id: 200, name: "GAWEAP", x: 20, y: 20, visible: true }],
    },
    {
        schemaVersion: 2,
        event: "assignment_summary",
        tick: 2_703,
        eligibleAttackers: 2,
        assignedAttackers: 2,
        incompatiblePairs: 0,
        unreachablePairs: 0,
        targetCount: 1,
    },
    {
        schemaVersion: 3,
        event: "engagement_decision",
        tick: 2_703,
        phase: "blocker_clear",
        reason: "route_interception_wins",
        targetId: 200,
        targetName: "GAWEAP",
        targetHitPoints: 1_000,
        blockerId: 100,
        blockerName: "E1",
        ownedAttackerCount: 2,
        assignedAttackerCount: 2,
        routeThreatCount: 8,
        estimatedBuildingCompletionTicks: 100,
        estimatedForceSurvivalTicks: 50,
        earliestRouteThreatInterceptTicks: 10,
    },
    {
        schemaVersion: 4,
        event: "engagement_allocation",
        tick: 2_703,
        targetId: 200,
        targetName: "GAWEAP",
        blockerId: 100,
        blockerName: "E1",
        assignedAttackerCount: 2,
        buildingAttackerCount: 0,
        blockerAttackerCount: 2,
        inRangeBuildingAttackerCount: 0,
    },
    heartbeat(),
    heartbeat({ tick: 2_823, targetHitPointDelta: 0 }),
    {
        schemaVersion: 3,
        event: "engagement_decision",
        tick: 2_943,
        phase: "building_strike",
        reason: "building_in_range",
        targetId: 200,
        targetName: "GAWEAP",
        targetHitPoints: 990,
        blockerId: null,
        blockerName: null,
        ownedAttackerCount: 2,
        assignedAttackerCount: 2,
        routeThreatCount: 7,
        estimatedBuildingCompletionTicks: 40,
        estimatedForceSurvivalTicks: 50,
        earliestRouteThreatInterceptTicks: 10,
    },
    {
        schemaVersion: 4,
        event: "engagement_allocation",
        tick: 2_943,
        targetId: 200,
        targetName: "GAWEAP",
        blockerId: null,
        blockerName: null,
        assignedAttackerCount: 2,
        buildingAttackerCount: 2,
        blockerAttackerCount: 0,
        inRangeBuildingAttackerCount: 1,
    },
    heartbeat({
        tick: 2_943,
        targetHitPoints: 990,
        targetHitPointDelta: -10,
        blockerId: null,
        blockerName: null,
        routeThreatCount: 7,
        buildingAttackerIds: [1, 2],
        blockerAttackerIds: [],
        buildingAttackerCount: 2,
        blockerAttackerCount: 0,
        inRangeBuildingAttackerCount: 1,
        totalBuildingAttackerHitPoints: 250,
        totalBlockerAttackerHitPoints: 0,
        minimumDistanceToFiringPerimeter: 0,
        medianDistanceToFiringPerimeter: 2,
        maximumDistanceToFiringPerimeter: 4,
        directBuildingAttackCommandCount: 2,
        blockerAttackCommandCount: 0,
    }),
    {
        schemaVersion: 2,
        event: "target_progress",
        tick: 2_943,
        targetId: 200,
        targetName: "GAWEAP",
        hitPoints: 990,
        previousHitPoints: 1_000,
        damage: 10,
    },
];

describe("mission-native closeout compatibility v10", () => {
    it("validates blocker persistence followed by a physical building phase", () => {
        const telemetry = validTelemetry();
        expect(() => validateMissionNativeCloseoutV10Exposure(
            telemetry,
            Countries.USA,
            0,
        )).not.toThrow();
        expect(summarizeMissionNativeCloseoutV10(telemetry)).toMatchObject({
            buildingDamage: 10,
            readinessBlockedCount: 1,
            firstActivationTick: 2_703,
            firstTargetOrderTick: 2_703,
            readinessReserveCreatedCount: 1,
            readinessReserveReleasedCount: 1,
            readinessReservePositiveGrowth: 1,
            maximumStagedCombatants: 1,
            blockerReadyEvaluationCount: 1,
            blockedEvaluationCount: 1,
            pureBlockerAllocationCount: 1,
            pureBuildingAllocationCount: 1,
            persistentBlockerHeartbeats: 1,
            blockerToBuildingTransitions: 1,
        });
    });

    it("fails closed when the execution trace never damages a building", () => {
        const telemetry = validTelemetry().filter(({ event }) => event !== "target_progress");
        expect(() => validateMissionNativeCloseoutV10Exposure(
            telemetry,
            Countries.USA,
            0,
        )).toThrow(/no physical building damage/);
    });

    it("fails closed when a closeout order precedes takeover", () => {
        const telemetry = validTelemetry();
        const order = telemetry.find((event) => event.event === "target_orders");
        if (!order || order.event !== "target_orders") throw new Error("Missing target order fixture");
        order.tick = 2_700;
        expect(() => validateMissionNativeCloseoutV10Exposure(
            telemetry,
            Countries.USA,
            0,
        )).toThrow(/before takeover/);
    });

    it("fails closed when reserve release occurs after takeover", () => {
        const telemetry = validTelemetry();
        const release = telemetry.find((event) =>
            event.event === "readiness_reserve" && event.phase === "released",
        );
        if (!release || release.event !== "readiness_reserve") throw new Error("Missing reserve release fixture");
        release.tick = 2_706;
        expect(() => validateMissionNativeCloseoutV10Exposure(
            telemetry,
            Countries.USA,
            0,
        )).toThrow(/reserve lifecycle/);
    });

    it("fails closed when blocker readiness exceeds force survival", () => {
        const telemetry = validTelemetry();
        const evaluation = telemetry.find((event) =>
            event.event === "activation_evaluation" && event.phase === "blocker_ready",
        );
        if (!evaluation || evaluation.event !== "activation_evaluation") {
            throw new Error("Missing blocker-ready fixture");
        }
        evaluation.estimatedBlockerRemovalTicks = 51;
        expect(() => validateMissionNativeCloseoutV10Exposure(
            telemetry,
            Countries.USA,
            0,
        )).toThrow(/blocker-readiness certificate/);
    });
});
