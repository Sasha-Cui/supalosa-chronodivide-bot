import { describe, expect, it } from "vitest";
import { QueueType, SideType } from "@chronodivide/game-api";
import { Countries } from "@supalosa/chronodivide-bot/dist/bot/logic/common/utils.js";
import { BuildingEliminationTelemetryEvent } from
    "@supalosa/chronodivide-bot/dist/bot/logic/mission/missions/buildingEliminationMission.js";
import { validateMissionNativeCloseoutFocusedGateV19Telemetry } from
    "../training/missionNativeCloseoutFocusedGateV19.js";

const valid = (): BuildingEliminationTelemetryEvent[] => [
    {
        schemaVersion: 15,
        event: "assault_production_reservation",
        tick: 2_700,
        side: SideType.GDI,
        currentTankCount: 0,
        targetTankCount: 4,
        retainedNames: ["GAWEAP", "MTNK"],
        removedRequestNames: ["E1"],
        canceledQueueItems: [{ queue: QueueType.Infantry, name: "E1", quantity: 1 }],
    },
    {
        schemaVersion: 14,
        event: "assault_production",
        tick: 3_600,
        side: SideType.GDI,
        unitName: "MTNK",
        targetCount: 4,
        currentCount: 1,
        requested: true,
        available: true,
        credits: 400,
        vehicleQueueStatus: 1,
        vehicleQueueItems: [{ name: "MTNK", quantity: 1 }],
    },
    {
        schemaVersion: 2,
        event: "target_progress",
        tick: 3_900,
        targetId: 10,
        targetName: "NAPOWR",
        hitPoints: 400,
        previousHitPoints: 500,
        damage: 100,
    },
];

describe("mission-native closeout focused gate v19", () => {
    it("requires reservation, physical tank acquisition, and building damage", () => {
        expect(() => validateMissionNativeCloseoutFocusedGateV19Telemetry(
            valid(),
            Countries.USA,
        )).not.toThrow();
    });

    it("fails closed when a retained tank is canceled", () => {
        const telemetry = valid();
        const reservation = telemetry.find((event) => event.event === "assault_production_reservation");
        if (!reservation || reservation.event !== "assault_production_reservation") throw new Error("Missing fixture");
        reservation.canceledQueueItems.push({ queue: QueueType.Vehicles, name: "MTNK", quantity: 1 });
        expect(() => validateMissionNativeCloseoutFocusedGateV19Telemetry(
            telemetry,
            Countries.USA,
        )).toThrow(/schema-15/);
    });

    it("fails closed without a physical tank or positive building damage", () => {
        const telemetry = valid().map((event) => event.event === "assault_production"
            ? { ...event, currentCount: 0 }
            : event.event === "target_progress" ? { ...event, damage: 0 } : event);
        expect(() => validateMissionNativeCloseoutFocusedGateV19Telemetry(
            telemetry,
            Countries.USA,
        )).toThrow(/physical MTNK/);
    });
});
