import { describe, expect, it } from "vitest";
import { QueueType, SideType } from "@chronodivide/game-api";
import { Countries } from "@supalosa/chronodivide-bot/dist/bot/logic/common/utils.js";
import { BuildingEliminationTelemetryEvent } from
    "@supalosa/chronodivide-bot/dist/bot/logic/mission/missions/buildingEliminationMission.js";
import { validateMissionNativeCloseoutFocusedGateV23Telemetry } from
    "../training/missionNativeCloseoutFocusedGateV23.js";

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
        factoryTriggerActive: true, readinessOwned: true,
    },
    {
        schemaVersion: 17, event: "assault_screen_production", tick: 2_730,
        side: SideType.GDI, unitName: "E1", targetCount: 4, currentCount: 1,
        mainTankPresent: false, requested: true, factoryCount: 1,
        factoryTriggerActive: true, readinessOwned: true,
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
        schemaVersion: 2, event: "target_progress", tick: 3_900, targetId: 10,
        targetName: "NAPOWR", hitPoints: 400, previousHitPoints: 500, damage: 100,
    },
];

describe("mission-native closeout focused gate v23", () => {
    it("requires factory-triggered readiness ownership, persistent tanks, and building damage", () => {
        expect(() => validateMissionNativeCloseoutFocusedGateV23Telemetry(valid(), Countries.USA)).not.toThrow();
    });

    it("fails closed if production telemetry ends on tank acquisition", () => {
        const telemetry = valid().filter((event) =>
            event.event !== "assault_production" || event.tick === 3_600,
        );
        expect(() => validateMissionNativeCloseoutFocusedGateV23Telemetry(
            telemetry, Countries.USA,
        )).toThrow(/did not persist/);
    });

    it("fails closed without building damage", () => {
        const telemetry = valid().filter((event) => event.event !== "target_progress");
        expect(() => validateMissionNativeCloseoutFocusedGateV23Telemetry(
            telemetry, Countries.USA,
        )).toThrow(/building damage/);
    });

    it("fails closed on out-of-scope readiness defense", () => {
        const telemetry = valid().map((event) => event.event === "readiness_defense"
            ? { ...event, distance: 13 }
            : event);
        expect(() => validateMissionNativeCloseoutFocusedGateV23Telemetry(
            telemetry, Countries.USA,
        )).toThrow(/schema-16/);
    });

    it("fails closed when a requested screen never physically grows", () => {
        const telemetry = valid().map((event) => event.event === "assault_screen_production"
            ? { ...event, currentCount: 0 }
            : event);
        expect(() => validateMissionNativeCloseoutFocusedGateV23Telemetry(
            telemetry, Countries.USA,
        )).toThrow(/physical E1/);
    });

    it("fails closed when ambient infantry is mislabeled as readiness-owned", () => {
        const telemetry = valid().map((event) => event.event === "assault_screen_production"
            ? { ...event, readinessOwned: false }
            : event);
        expect(() => validateMissionNativeCloseoutFocusedGateV23Telemetry(
            telemetry, Countries.USA,
        )).toThrow(/schema-17/);
    });

    it("fails closed when screen production waits for the first tank", () => {
        const telemetry = valid().map((event) => event.event === "assault_screen_production"
            ? { ...event, mainTankPresent: true }
            : event);
        expect(() => validateMissionNativeCloseoutFocusedGateV23Telemetry(
            telemetry, Countries.USA,
        )).toThrow(/before the first tank/);
    });
});
