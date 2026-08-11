import { SideType } from "@chronodivide/game-api";
import { describe, expect, test } from "vitest";
import {
    getFinisherArtilleryPlanItem,
    getFinisherArtilleryStructurePlanItems,
    resolveStrategicFinisherOptions,
} from "@supalosa/chronodivide-bot/dist/bot/logic/mission/missions/strategicPlanMission.js";

describe("strategic finisher production", () => {
    test("maps one shared artillery overlay to each faction side", () => {
        const options = resolveStrategicFinisherOptions({
            rushSellEnabled: false,
            finisherArtilleryTargetCount: 8,
            finisherArtilleryStartTick: 10_800,
            finisherArtilleryPriority: 140,
            finisherArtilleryTechLeadTicks: 3_600,
            finisherArtilleryTechPriority: 130,
        });
        expect(getFinisherArtilleryPlanItem(SideType.Nod, options)).toEqual({
            name: "V3",
            targetCount: 8,
            startTick: 10_800,
            priority: 140,
        });
        expect(getFinisherArtilleryPlanItem(SideType.GDI, options)).toEqual({
            name: "SREF",
            targetCount: 8,
            startTick: 10_800,
            priority: 140,
        });
        expect(getFinisherArtilleryStructurePlanItems(SideType.Nod, options)).toEqual([
            {
                name: "NARADR",
                targetCount: 1,
                priority: 130,
                startTick: 7_200,
                requireCredits: 800,
            },
        ]);
        expect(getFinisherArtilleryStructurePlanItems(SideType.GDI, options).map(({ name }) => name)).toEqual([
            "GAAIRC",
            "GATECH",
        ]);
    });

    test("defaults preserve the existing yard sale and add no artillery", () => {
        const options = resolveStrategicFinisherOptions();
        expect(options).toEqual({
            rushSellEnabled: true,
            artilleryTargetCount: 0,
            artilleryStartTick: 12_600,
            artilleryPriority: 120,
            artilleryTechLeadTicks: 3_600,
            artilleryTechPriority: 112,
        });
        expect(getFinisherArtilleryPlanItem(SideType.Nod, options)).toBeNull();
        expect(getFinisherArtilleryPlanItem(SideType.GDI, options)).toBeNull();
        expect(getFinisherArtilleryStructurePlanItems(SideType.GDI, options)).toEqual([]);
    });

    test("rejects invalid production-search values before simulation", () => {
        expect(() => resolveStrategicFinisherOptions({ finisherArtilleryTargetCount: -1 })).toThrow(
            "finisherArtilleryTargetCount",
        );
        expect(() => resolveStrategicFinisherOptions({ finisherArtilleryStartTick: 0.5 })).toThrow(
            "finisherArtilleryStartTick",
        );
        expect(() => resolveStrategicFinisherOptions({ finisherArtilleryPriority: 0 })).toThrow(
            "finisherArtilleryPriority",
        );
        expect(() => resolveStrategicFinisherOptions({ finisherArtilleryTechLeadTicks: -1 })).toThrow(
            "finisherArtilleryTechLeadTicks",
        );
    });
});
