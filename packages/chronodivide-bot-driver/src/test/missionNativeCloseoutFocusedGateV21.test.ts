import { describe, expect, it } from "vitest";
import { QueueType, SideType } from "@chronodivide/game-api";
import { Countries } from "@supalosa/chronodivide-bot/dist/bot/logic/common/utils.js";
import { BuildingEliminationTelemetryEvent } from
    "@supalosa/chronodivide-bot/dist/bot/logic/mission/missions/buildingEliminationMission.js";
import { validateMissionNativeCloseoutFocusedGateV21Telemetry } from
    "../training/missionNativeCloseoutFocusedGateV21.js";

const valid = (): BuildingEliminationTelemetryEvent[] => [
    {
        schemaVersion: 16, event: "readiness_defense", tick: 3_500,
        threatId: 9, threatName: "HTNK", protectedId: 2, protectedName: "GAWEAP",
        distance: 6, stagedAttackerCount: 1,
    },
    {
        schemaVersion: 15, event: "assault_production_reservation", tick: 2_700,
        side: SideType.GDI, currentTankCount: 0, targetTankCount: 4,
        retainedNames: ["GAWEAP", "MTNK"], removedRequestNames: ["E1"],
        canceledQueueItems: [{ queue: QueueType.Infantry, name: "E1", quantity: 1 }],
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

describe("mission-native closeout focused gate v21", () => {
    it("requires persistent production after a physical tank plus building damage", () => {
        expect(() => validateMissionNativeCloseoutFocusedGateV21Telemetry(valid(), Countries.USA)).not.toThrow();
    });

    it("fails closed if production telemetry ends on tank acquisition", () => {
        const telemetry = valid().filter((event) =>
            event.event !== "assault_production" || event.tick === 3_600,
        );
        expect(() => validateMissionNativeCloseoutFocusedGateV21Telemetry(
            telemetry, Countries.USA,
        )).toThrow(/did not persist/);
    });

    it("fails closed without building damage", () => {
        const telemetry = valid().filter((event) => event.event !== "target_progress");
        expect(() => validateMissionNativeCloseoutFocusedGateV21Telemetry(
            telemetry, Countries.USA,
        )).toThrow(/building damage/);
    });

    it("fails closed on out-of-scope readiness defense", () => {
        const telemetry = valid().map((event) => event.event === "readiness_defense"
            ? { ...event, distance: 13 }
            : event);
        expect(() => validateMissionNativeCloseoutFocusedGateV21Telemetry(
            telemetry, Countries.USA,
        )).toThrow(/schema-16/);
    });
});
