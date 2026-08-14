import { describe, expect, it } from "vitest";
import { QueueType, SideType } from "@chronodivide/game-api";
import { Countries } from "@supalosa/chronodivide-bot/dist/bot/logic/common/utils.js";
import { BuildingEliminationTelemetryEvent } from
    "@supalosa/chronodivide-bot/dist/bot/logic/mission/missions/buildingEliminationMission.js";
import { validateMissionNativeCloseoutFocusedGateV20Telemetry } from
    "../training/missionNativeCloseoutFocusedGateV20.js";

const valid = (): BuildingEliminationTelemetryEvent[] => [
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

describe("mission-native closeout focused gate v20", () => {
    it("requires persistent production after a physical tank plus building damage", () => {
        expect(() => validateMissionNativeCloseoutFocusedGateV20Telemetry(valid(), Countries.USA)).not.toThrow();
    });

    it("fails closed if production telemetry ends on tank acquisition", () => {
        const telemetry = valid().filter((event) =>
            event.event !== "assault_production" || event.tick === 3_600,
        );
        expect(() => validateMissionNativeCloseoutFocusedGateV20Telemetry(
            telemetry, Countries.USA,
        )).toThrow(/did not persist/);
    });

    it("fails closed without building damage", () => {
        const telemetry = valid().filter((event) => event.event !== "target_progress");
        expect(() => validateMissionNativeCloseoutFocusedGateV20Telemetry(
            telemetry, Countries.USA,
        )).toThrow(/building damage/);
    });
});
