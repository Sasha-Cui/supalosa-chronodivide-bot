import { describe, expect, it } from "vitest";
import { QueueStatus, SideType } from "@chronodivide/game-api";
import { Countries } from "@supalosa/chronodivide-bot/dist/bot/logic/common/utils.js";
import { BuildingEliminationTelemetryEvent } from
    "@supalosa/chronodivide-bot/dist/bot/logic/mission/missions/buildingEliminationMission.js";
import { validateMissionNativeCloseoutProductionProbeV1Telemetry } from
    "../training/missionNativeCloseoutProductionProbeV1.js";

const valid = (): BuildingEliminationTelemetryEvent[] => [
    {
        schemaVersion: 13,
        event: "assault_infrastructure",
        tick: 2_700,
        side: SideType.GDI,
        structureName: "GAWEAP",
        currentCount: 1,
        available: true,
        requested: false,
    },
    {
        schemaVersion: 14,
        event: "assault_production",
        tick: 2_700,
        side: SideType.GDI,
        unitName: "MTNK",
        targetCount: 4,
        currentCount: 0,
        requested: true,
        available: true,
        credits: 800,
        vehicleQueueStatus: QueueStatus.Active,
        vehicleQueueItems: [{ name: "CMIN", quantity: 1 }],
    },
];

describe("mission-native closeout production probe v1", () => {
    it("accepts a deterministic queue-state observation without requiring a tank", () => {
        expect(() => validateMissionNativeCloseoutProductionProbeV1Telemetry(
            valid(),
            Countries.USA,
        )).not.toThrow();
    });

    it("fails closed on legacy telemetry that omits queue state", () => {
        const telemetry = valid();
        const production = telemetry.find((event) => event.event === "assault_production");
        if (!production || production.event !== "assault_production") throw new Error("Missing fixture");
        production.schemaVersion = 11;
        expect(() => validateMissionNativeCloseoutProductionProbeV1Telemetry(
            telemetry,
            Countries.USA,
        )).toThrow(/schema-14/);
    });
});
