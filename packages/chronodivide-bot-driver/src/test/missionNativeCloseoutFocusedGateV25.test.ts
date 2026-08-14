import { describe, expect, it } from "vitest";
import { QueueType, SideType } from "@chronodivide/game-api";
import { Countries } from "@supalosa/chronodivide-bot/dist/bot/logic/common/utils.js";
import { BuildingEliminationTelemetryEvent } from
    "@supalosa/chronodivide-bot/dist/bot/logic/mission/missions/buildingEliminationMission.js";
import {
    MISSION_NATIVE_CLOSEOUT_FOCUSED_GATE_V25_COUNTRIES,
    MISSION_NATIVE_CLOSEOUT_FOCUSED_GATE_V25_ENGINE_SEED_BASE,
    validateMissionNativeCloseoutFocusedGateV25Telemetry,
} from
    "../training/missionNativeCloseoutFocusedGateV25.js";
import { derivePairedEngineSeed } from "../benchmark/seededOfflineGame.js";

const valid = (): BuildingEliminationTelemetryEvent[] => [
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
    },
    {
        schemaVersion: 17, event: "assault_screen_production", tick: 2_730,
        side: SideType.GDI, unitName: "E1", targetCount: 4, currentCount: 1,
        mainTankPresent: false, requested: true, factoryCount: 1,
        factoryTriggerActive: true, readinessOwned: true, readinessTankCount: 0,
    },
    {
        schemaVersion: 17, event: "assault_screen_production", tick: 3_610,
        side: SideType.GDI, unitName: "E1", targetCount: 4, currentCount: 2,
        mainTankPresent: true, requested: true, factoryCount: 1,
        factoryTriggerActive: true, readinessOwned: true, readinessTankCount: 1,
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
    },
    {
        schemaVersion: 14, event: "assault_production", tick: 3_720, side: SideType.GDI,
        unitName: "MTNK", targetCount: 4, currentCount: 1, requested: true,
        available: true, credits: 100, vehicleQueueStatus: 1,
        vehicleQueueItems: [{ name: "MTNK", quantity: 1 }],
    },
    {
        schemaVersion: 18, event: "progressive_blocker_launch", tick: 3_620,
        targetId: 10, targetName: "NAPOWR", blockerId: 20, blockerName: "E1",
        compatibleAttackerCount: 3, readinessTankCount: 1, readinessScreenCount: 2,
        estimatedBlockerRemovalTicks: 2, estimatedRouteClearanceTicks: 100,
        estimatedForceSurvivalTicks: 30,
    },
    {
        schemaVersion: 19, event: "assault_capability_launch", tick: 3_620,
        launchMode: "progressive_blocker", targetId: 10, targetName: "NAPOWR",
        blockerId: 20, blockerName: "E1", compatibleAttackerCount: 3,
        readinessTankCount: 1, readinessScreenCount: 2, routeThreatCount: 2,
        staticRouteThreatCount: 1, estimatedBuildingCompletionTicks: 80,
        estimatedBlockerRemovalTicks: 2, estimatedForceSurvivalTicks: 30,
    },
    {
        schemaVersion: 1, event: "activated", tick: 3_620, observationMode: "publicApi",
        ownCombatants: 3, enemyCombatants: 12, reservedCombatants: 0,
        preemptedMissions: ["attack_main"],
    },
    {
        schemaVersion: 10, event: "launch_handoff", tick: 3_621,
        expectedStagedUnitIds: [1, 2, 3], assignedExpectedUnitIds: [1, 2, 3],
        destroyedExpectedUnitIds: [], aliveUnassignedExpectedUnitIds: [],
    },
    {
        schemaVersion: 2, event: "target_progress", tick: 3_900, targetId: 10,
        targetName: "NAPOWR", hitPoints: 400, previousHitPoints: 500, damage: 100,
    },
];

describe("mission-native closeout focused gate v25", () => {
    it("keeps every focused seed inside the engine uint32 domain", () => {
        for (const index of MISSION_NATIVE_CLOSEOUT_FOCUSED_GATE_V25_COUNTRIES.keys()) {
            const seed = derivePairedEngineSeed(
                MISSION_NATIVE_CLOSEOUT_FOCUSED_GATE_V25_ENGINE_SEED_BASE,
                index,
            );
            expect(seed).toBeGreaterThanOrEqual(0);
            expect(seed).toBeLessThanOrEqual(0xffff_ffff);
        }
    });

    it("requires factory-triggered readiness ownership, persistent tanks, and building damage", () => {
        expect(() => validateMissionNativeCloseoutFocusedGateV25Telemetry(valid(), Countries.USA)).not.toThrow();
    });

    it("fails closed if production telemetry ends on tank acquisition", () => {
        const telemetry = valid().filter((event) =>
            event.event !== "assault_production" || event.tick === 3_600,
        );
        expect(() => validateMissionNativeCloseoutFocusedGateV25Telemetry(
            telemetry, Countries.USA,
        )).toThrow(/did not persist/);
    });

    it("fails closed without building damage", () => {
        const telemetry = valid().filter((event) => event.event !== "target_progress");
        expect(() => validateMissionNativeCloseoutFocusedGateV25Telemetry(
            telemetry, Countries.USA,
        )).toThrow(/building damage/);
    });

    it("fails closed on out-of-scope readiness defense", () => {
        const telemetry = valid().map((event) => event.event === "readiness_defense"
            ? { ...event, distance: 13 }
            : event);
        expect(() => validateMissionNativeCloseoutFocusedGateV25Telemetry(
            telemetry, Countries.USA,
        )).toThrow(/schema-16/);
    });

    it("fails closed when a requested screen never physically grows", () => {
        const telemetry = valid().map((event) => event.event === "assault_screen_production"
            ? { ...event, currentCount: 0 }
            : event);
        expect(() => validateMissionNativeCloseoutFocusedGateV25Telemetry(
            telemetry, Countries.USA,
        )).toThrow(/physical E1/);
    });

    it("fails closed when ambient infantry is mislabeled as readiness-owned", () => {
        const telemetry = valid().map((event) => event.event === "assault_screen_production"
            ? { ...event, readinessOwned: false }
            : event);
        expect(() => validateMissionNativeCloseoutFocusedGateV25Telemetry(
            telemetry, Countries.USA,
        )).toThrow(/schema-17/);
    });

    it("fails closed when screen production waits for the first tank", () => {
        const telemetry = valid().map((event) => event.event === "assault_screen_production"
            ? { ...event, mainTankPresent: true }
            : event);
        expect(() => validateMissionNativeCloseoutFocusedGateV25Telemetry(
            telemetry, Countries.USA,
        )).toThrow(/before the first tank/);
    });

    it("fails closed when the tank is physical but not readiness-owned", () => {
        const telemetry = valid().map((event) => event.event === "assault_screen_production"
            ? { ...event, readinessTankCount: 0 }
            : event);
        expect(() => validateMissionNativeCloseoutFocusedGateV25Telemetry(
            telemetry, Countries.USA,
        )).toThrow(/combined-arms/);
    });

    it("accepts a certified direct building race without requiring a blocker event", () => {
        const telemetry = valid()
            .filter((event) => event.event !== "progressive_blocker_launch")
            .map((event) => event.event === "assault_capability_launch"
                ? {
                    ...event,
                    launchMode: "direct_building" as const,
                    blockerId: null,
                    blockerName: null,
                    estimatedBuildingCompletionTicks: 20,
                    estimatedBlockerRemovalTicks: null,
                }
                : event);
        expect(() => validateMissionNativeCloseoutFocusedGateV25Telemetry(
            telemetry, Countries.USA,
        )).not.toThrow();
    });

    it("fails closed without the combined-arms launch certificate", () => {
        const telemetry = valid().filter((event) => event.event !== "assault_capability_launch");
        expect(() => validateMissionNativeCloseoutFocusedGateV25Telemetry(
            telemetry, Countries.USA,
        )).toThrow(/schema-19/);
    });

    it("fails closed when the certificate claims no readiness-owned tank", () => {
        const telemetry = valid().map((event) => event.event === "assault_capability_launch"
            ? { ...event, readinessTankCount: 0 }
            : event);
        expect(() => validateMissionNativeCloseoutFocusedGateV25Telemetry(
            telemetry, Countries.USA,
        )).toThrow(/schema-19/);
    });

    it("fails closed on an incomplete launch handoff", () => {
        const telemetry = valid().map((event) => event.event === "launch_handoff"
            ? { ...event, assignedExpectedUnitIds: [1], aliveUnassignedExpectedUnitIds: [2, 3] }
            : event);
        expect(() => validateMissionNativeCloseoutFocusedGateV25Telemetry(
            telemetry, Countries.USA,
        )).toThrow(/schema-10/);
    });
});
