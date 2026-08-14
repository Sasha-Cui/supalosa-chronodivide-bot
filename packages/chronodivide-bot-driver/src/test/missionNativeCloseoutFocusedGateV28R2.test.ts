import { describe, expect, it } from "vitest";
import { QueueType, SideType } from "@chronodivide/game-api";
import { Countries } from "@supalosa/chronodivide-bot/dist/bot/logic/common/utils.js";
import { BuildingEliminationTelemetryEvent } from
    "@supalosa/chronodivide-bot/dist/bot/logic/mission/missions/buildingEliminationMission.js";
import {
    MISSION_NATIVE_CLOSEOUT_FOCUSED_GATE_V28_R2_COUNTRIES,
    MISSION_NATIVE_CLOSEOUT_FOCUSED_GATE_V28_R2_ENGINE_SEED_BASE,
    validateMissionNativeCloseoutFocusedGateV28R2Telemetry,
} from "../training/missionNativeCloseoutFocusedGateV28R2.js";
import { derivePairedEngineSeed } from "../benchmark/seededOfflineGame.js";

type ActivationV28 = Extract<BuildingEliminationTelemetryEvent, {
    schemaVersion: 22;
    event: "activation_evaluation";
}>;

const common = (): BuildingEliminationTelemetryEvent[] => [
    {
        schemaVersion: 13, event: "assault_infrastructure", tick: 2_600,
        side: SideType.GDI, structureName: "GAWEAP", currentCount: 1,
        available: true, requested: false,
    },
    {
        schemaVersion: 17, event: "assault_screen_production", tick: 2_610,
        side: SideType.GDI, unitName: "E1", targetCount: 4, currentCount: 0,
        mainTankPresent: false, requested: true, factoryCount: 1,
        factoryTriggerActive: true, readinessOwned: true, readinessTankCount: 0,
        queuedCount: 1, queueAwareTargeting: true,
    },
    {
        schemaVersion: 17, event: "assault_screen_production", tick: 3_610,
        side: SideType.GDI, unitName: "E1", targetCount: 4, currentCount: 2,
        mainTankPresent: true, requested: true, factoryCount: 1,
        factoryTriggerActive: true, readinessOwned: true, readinessTankCount: 1,
        queuedCount: 0, queueAwareTargeting: true,
    },
    {
        schemaVersion: 16, event: "readiness_defense", tick: 3_500,
        threatId: 9, threatName: "HTNK", protectedId: 2, protectedName: "GAWEAP",
        distance: 6, stagedAttackerCount: 1,
    },
    {
        schemaVersion: 15, event: "assault_production_reservation", tick: 2_700,
        side: SideType.GDI, currentTankCount: 0, targetTankCount: 4,
        retainedNames: ["E1", "GAWEAP", "MTNK"], removedRequestNames: ["HARV"],
        canceledQueueItems: [{ queue: QueueType.Vehicles, name: "HARV", quantity: 1 }],
    },
    {
        schemaVersion: 14, event: "assault_production", tick: 3_600, side: SideType.GDI,
        unitName: "MTNK", targetCount: 4, currentCount: 1, requested: true,
        available: true, credits: 400, vehicleQueueStatus: 1,
        vehicleQueueItems: [{ name: "MTNK", quantity: 1 }],
        queuedCount: 1, queueAwareTargeting: true,
    },
    {
        schemaVersion: 14, event: "assault_production", tick: 3_720, side: SideType.GDI,
        unitName: "MTNK", targetCount: 4, currentCount: 1, requested: true,
        available: true, credits: 100, vehicleQueueStatus: 1,
        vehicleQueueItems: [{ name: "MTNK", quantity: 1 }],
        queuedCount: 1, queueAwareTargeting: true,
    },
];

const activation = (overrides: Partial<ActivationV28> = {}): ActivationV28 => ({
    schemaVersion: 22, event: "activation_evaluation", tick: 3_620,
    phase: "building_ready", targetId: 10, targetName: "NAPOWR",
    blockerId: null, blockerName: null, compatibleAttackerCount: 3,
    totalCompatibleAttackerCount: 3, transferCertifiedAttackerCount: 3,
    stagedCompatibleAttackerCount: 1, vanguardCompatibleAttackerCount: 2,
    assaultTankCount: 0, assaultScreenCount: 3,
    readinessTankCount: 0, readinessScreenCount: 0,
    transferredCapabilityReady: false, compositionReady: false,
    enemyBuildingCount: 5, activationScopeLatched: true,
    directObjectiveFeasible: true, completeRouteFeasible: false,
    partialBlockerLaunchPermitted: false, activePredecessorCompatibleAttackerCount: 2,
    routeThreatCount: 2, estimatedBuildingCompletionTicks: 20,
    estimatedForceSurvivalTicks: 30, estimatedBlockerRemovalTicks: null,
    estimatedRouteClearanceTicks: null,
    ...overrides,
});

const activated: BuildingEliminationTelemetryEvent = {
    schemaVersion: 1, event: "activated", tick: 3_620, observationMode: "publicApi",
    ownCombatants: 3, enemyCombatants: 12, reservedCombatants: 0,
    preemptedMissions: ["attack_main"],
};
const handoff: BuildingEliminationTelemetryEvent = {
    schemaVersion: 10, event: "launch_handoff", tick: 3_621,
    expectedStagedUnitIds: [1, 2, 3], assignedExpectedUnitIds: [1, 2, 3],
    destroyedExpectedUnitIds: [], aliveUnassignedExpectedUnitIds: [],
};
const progress: BuildingEliminationTelemetryEvent = {
    schemaVersion: 2, event: "target_progress", tick: 3_900, targetId: 10,
    targetName: "NAPOWR", hitPoints: 400, previousHitPoints: 500, damage: 100,
};

const directLaunch = (): BuildingEliminationTelemetryEvent[] => [
    ...common(),
    {
        schemaVersion: 19, event: "assault_capability_launch", tick: 3_620,
        launchMode: "direct_building", targetId: 10, targetName: "NAPOWR",
        blockerId: null, blockerName: null, compatibleAttackerCount: 3,
        readinessTankCount: 0, readinessScreenCount: 0, routeThreatCount: 2,
        staticRouteThreatCount: 1, estimatedBuildingCompletionTicks: 20,
        estimatedBlockerRemovalTicks: null, estimatedForceSurvivalTicks: 30,
    },
    activation(), activated, handoff, progress,
];

const blockedPreterminal = (): BuildingEliminationTelemetryEvent[] => [
    ...common(),
    activation({
        phase: "blocked", blockerId: 20, blockerName: "E1",
        assaultTankCount: 1, assaultScreenCount: 2,
        transferredCapabilityReady: true, compositionReady: true,
        directObjectiveFeasible: false, completeRouteFeasible: false,
        activePredecessorCompatibleAttackerCount: 3,
        estimatedBuildingCompletionTicks: 80, estimatedBlockerRemovalTicks: 2,
        estimatedRouteClearanceTicks: 100,
    }),
];

const conventionalLaunch = (): BuildingEliminationTelemetryEvent[] => [
    ...common(),
    {
        schemaVersion: 19, event: "assault_capability_launch", tick: 3_620,
        launchMode: "conventional_blocker", targetId: 10, targetName: "NAPOWR",
        blockerId: 20, blockerName: "E1", compatibleAttackerCount: 3,
        readinessTankCount: 0, readinessScreenCount: 0, routeThreatCount: 2,
        staticRouteThreatCount: 1, estimatedBuildingCompletionTicks: 80,
        estimatedBlockerRemovalTicks: 2, estimatedForceSurvivalTicks: 30,
    },
    activation({
        phase: "blocker_ready", blockerId: 20, blockerName: "E1",
        directObjectiveFeasible: false, completeRouteFeasible: true,
        estimatedBuildingCompletionTicks: 80, estimatedBlockerRemovalTicks: 2,
        estimatedRouteClearanceTicks: 20,
    }),
    activated, handoff, progress,
];

const terminalProgressiveLaunch = (): BuildingEliminationTelemetryEvent[] => [
    ...common(),
    {
        schemaVersion: 18, event: "progressive_blocker_launch", tick: 3_620,
        targetId: 10, targetName: "NAPOWR", blockerId: 20, blockerName: "E1",
        compatibleAttackerCount: 3, readinessTankCount: 0, readinessScreenCount: 0,
        estimatedBlockerRemovalTicks: 2, estimatedRouteClearanceTicks: 100,
        estimatedForceSurvivalTicks: 30,
    },
    {
        schemaVersion: 19, event: "assault_capability_launch", tick: 3_620,
        launchMode: "progressive_blocker", targetId: 10, targetName: "NAPOWR",
        blockerId: 20, blockerName: "E1", compatibleAttackerCount: 3,
        readinessTankCount: 0, readinessScreenCount: 0, routeThreatCount: 2,
        staticRouteThreatCount: 1, estimatedBuildingCompletionTicks: 80,
        estimatedBlockerRemovalTicks: 2, estimatedForceSurvivalTicks: 30,
    },
    activation({
        phase: "blocker_ready", blockerId: 20, blockerName: "E1",
        assaultTankCount: 1, assaultScreenCount: 2,
        transferredCapabilityReady: true, compositionReady: true,
        enemyBuildingCount: 1, directObjectiveFeasible: false,
        partialBlockerLaunchPermitted: true,
        activePredecessorCompatibleAttackerCount: 3,
        estimatedBuildingCompletionTicks: 80, estimatedBlockerRemovalTicks: 2,
        estimatedRouteClearanceTicks: 100,
    }),
    activated, handoff, progress,
];

describe("mission-native closeout focused gate v28-r2", () => {
    it("keeps every focused seed inside the engine uint32 domain", () => {
        for (const index of MISSION_NATIVE_CLOSEOUT_FOCUSED_GATE_V28_R2_COUNTRIES.keys()) {
            const seed = derivePairedEngineSeed(
                MISSION_NATIVE_CLOSEOUT_FOCUSED_GATE_V28_R2_ENGINE_SEED_BASE,
                index,
            );
            expect(seed).toBeGreaterThanOrEqual(0);
            expect(seed).toBeLessThanOrEqual(0xffff_ffff);
        }
    });

    it("accepts an objective-feasible direct launch despite zero readiness composition", () => {
        expect(() => validateMissionNativeCloseoutFocusedGateV28R2Telemetry(
            directLaunch(), Countries.USA,
        )).not.toThrow();
    });

    it("accepts an objective-feasible infantry launch before physical tank acquisition", () => {
        const telemetry = directLaunch().map((event) =>
            event.event === "assault_capability_launch" || event.event === "activation_evaluation" ||
            event.event === "activated"
                ? { ...event, tick: 2_700 }
                : event,
        ) as BuildingEliminationTelemetryEvent[];
        expect(() => validateMissionNativeCloseoutFocusedGateV28R2Telemetry(
            telemetry, Countries.USA,
        )).not.toThrow();
    });

    it("accepts a full-route-feasible blocker launch despite zero readiness composition", () => {
        expect(() => validateMissionNativeCloseoutFocusedGateV28R2Telemetry(
            conventionalLaunch(), Countries.USA,
        )).not.toThrow();
    });

    it("accepts a preterminal route veto with active predecessor delegation", () => {
        expect(() => validateMissionNativeCloseoutFocusedGateV28R2Telemetry(
            blockedPreterminal(), Countries.USA,
        )).not.toThrow();
    });

    it("retains progressive minimum-blocker launch for the final building", () => {
        expect(() => validateMissionNativeCloseoutFocusedGateV28R2Telemetry(
            terminalProgressiveLaunch(), Countries.USA,
        )).not.toThrow();
    });

    it("fails closed if production telemetry ends on tank acquisition", () => {
        const telemetry = blockedPreterminal().filter((event) =>
            event.event !== "assault_production" || event.tick === 3_600,
        );
        expect(() => validateMissionNativeCloseoutFocusedGateV28R2Telemetry(
            telemetry, Countries.USA,
        )).toThrow(/did not persist/);
    });

    it("requires physical building damage after a live objective launch", () => {
        const telemetry = directLaunch().filter((event) => event.event !== "target_progress");
        expect(() => validateMissionNativeCloseoutFocusedGateV28R2Telemetry(
            telemetry, Countries.USA,
        )).toThrow(/building damage/);
    });

    it("accepts a conservative zero-damage heartbeat alongside positive physical damage", () => {
        const telemetry = directLaunch();
        telemetry.push({
            schemaVersion: 2, event: "target_progress", tick: 3_780, targetId: 10,
            targetName: "NAPOWR", hitPoints: 400, previousHitPoints: 400, damage: 0,
        });
        expect(() => validateMissionNativeCloseoutFocusedGateV28R2Telemetry(
            telemetry, Countries.USA,
        )).not.toThrow();
    });

    it("rejects an internally inconsistent progress delta", () => {
        const telemetry = directLaunch().map((event) => event.event === "target_progress"
            ? { ...event, damage: 99 }
            : event) as BuildingEliminationTelemetryEvent[];
        expect(() => validateMissionNativeCloseoutFocusedGateV28R2Telemetry(
            telemetry, Countries.USA,
        )).toThrow(/Invalid physical/);
    });

    it("does not require building damage from a correctly vetoed partial wave", () => {
        expect(blockedPreterminal().some((event) => event.event === "target_progress")).toBe(false);
        expect(() => validateMissionNativeCloseoutFocusedGateV28R2Telemetry(
            blockedPreterminal(), Countries.USA,
        )).not.toThrow();
    });

    it("fails closed when preterminal partial clearance launches anyway", () => {
        const telemetry = terminalProgressiveLaunch().map((event) =>
            event.event === "activation_evaluation"
                ? { ...event, enemyBuildingCount: 5, partialBlockerLaunchPermitted: false }
                : event,
        ) as BuildingEliminationTelemetryEvent[];
        expect(() => validateMissionNativeCloseoutFocusedGateV28R2Telemetry(
            telemetry, Countries.USA,
        )).toThrow(/objective feasibility/);
    });

    it("fails closed without active predecessor delegation on a blocked row", () => {
        const telemetry = blockedPreterminal().map((event) =>
            event.event === "activation_evaluation"
                ? { ...event, activePredecessorCompatibleAttackerCount: 0 }
                : event,
        ) as BuildingEliminationTelemetryEvent[];
        expect(() => validateMissionNativeCloseoutFocusedGateV28R2Telemetry(
            telemetry, Countries.USA,
        )).toThrow(/predecessor delegation/);
    });

    it("fails closed when objective feasibility disagrees with route estimates", () => {
        const telemetry = blockedPreterminal().map((event) =>
            event.event === "activation_evaluation"
                ? { ...event, completeRouteFeasible: true }
                : event,
        ) as BuildingEliminationTelemetryEvent[];
        expect(() => validateMissionNativeCloseoutFocusedGateV28R2Telemetry(
            telemetry, Countries.USA,
        )).toThrow(/schema-22/);
    });

    it("fails closed when activation telemetry has not advanced to schema 22", () => {
        const telemetry = directLaunch().map((event) =>
            event.event === "activation_evaluation"
                ? { ...event, schemaVersion: 21 }
                : event,
        ) as BuildingEliminationTelemetryEvent[];
        expect(() => validateMissionNativeCloseoutFocusedGateV28R2Telemetry(
            telemetry, Countries.USA,
        )).toThrow(/schema-22/);
    });

    it("fails closed on launch side effects without a capability certificate", () => {
        const telemetry = directLaunch().filter((event) => event.event !== "assault_capability_launch");
        expect(() => validateMissionNativeCloseoutFocusedGateV28R2Telemetry(
            telemetry, Countries.USA,
        )).toThrow(/Launch side effects/);
    });

    it("fails closed on an incomplete launch handoff", () => {
        const telemetry = directLaunch().map((event) => event.event === "launch_handoff"
            ? { ...event, assignedExpectedUnitIds: [1], aliveUnassignedExpectedUnitIds: [2, 3] }
            : event) as BuildingEliminationTelemetryEvent[];
        expect(() => validateMissionNativeCloseoutFocusedGateV28R2Telemetry(
            telemetry, Countries.USA,
        )).toThrow(/schema-10/);
    });

    it("accepts reassigned screens above the production target when none are requested", () => {
        const telemetry = blockedPreterminal();
        telemetry.push({
            schemaVersion: 17, event: "assault_screen_production", tick: 4_716,
            side: SideType.GDI, unitName: "E1", targetCount: 4, currentCount: 6,
            mainTankPresent: false, requested: false, factoryCount: 0,
            factoryTriggerActive: false, readinessOwned: true, readinessTankCount: 0,
            queuedCount: 0, queueAwareTargeting: true,
        });
        expect(() => validateMissionNativeCloseoutFocusedGateV28R2Telemetry(
            telemetry, Countries.USA,
        )).not.toThrow();
    });

    it("fails closed when screen production is requested at the queue-aware target", () => {
        const telemetry = blockedPreterminal().map((event) =>
            event.event === "assault_screen_production" && event.tick === 3_610
                ? { ...event, currentCount: 4, queuedCount: 0, requested: true }
                : event,
        ) as BuildingEliminationTelemetryEvent[];
        expect(() => validateMissionNativeCloseoutFocusedGateV28R2Telemetry(
            telemetry, Countries.USA,
        )).toThrow(/schema-17/);
    });

    it("fails closed on out-of-scope readiness defense", () => {
        const telemetry = blockedPreterminal().map((event) => event.event === "readiness_defense"
            ? { ...event, distance: 13 }
            : event) as BuildingEliminationTelemetryEvent[];
        expect(() => validateMissionNativeCloseoutFocusedGateV28R2Telemetry(
            telemetry, Countries.USA,
        )).toThrow(/schema-16/);
    });
});
