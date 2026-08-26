import { ObjectType, QueueStatus, QueueType } from "@chronodivide/game-api";
import { describe, expect, it, vi } from "vitest";
import { HFO_ADVANCED_V6_ARMS, HFO_ADVANCED_V6_COUNTRIES, HFO_ADVANCED_V6_SPEC,
    createV6TechnicalController, v6ProhibitedCompetitivePaths, v6UnitNames } from
    "../training/hfoAdvancedEarlyProductionTechnical.js";

const arm = (id: string) => {
    const value = HFO_ADVANCED_V6_ARMS.find((row) => row.id === id);
    if (!value) throw new Error(`missing arm ${id}`);
    return value;
};
const fixture = (args: { country?: any; tick: number; infantryStatus?: QueueStatus;
    vehicleStatus?: QueueStatus; vehicleItem?: string }) => {
    const country = args.country ?? "Americans", names = v6UnitNames(country);
    const rules: Record<string, any> = {
        [names.infantry]: { name: names.infantry, type: ObjectType.Infantry },
        [names.tank]: { name: names.tank, type: 0 },
        FV: { name: "FV", type: 0 },
    };
    const queueForProduction = vi.fn(), unqueueFromProduction = vi.fn(), pauseProduction = vi.fn(),
        resumeProduction = vi.fn(), orderUnits = vi.fn(), quitGame = vi.fn();
    const actions = { queueForProduction, unqueueFromProduction, pauseProduction, resumeProduction, orderUnits, quitGame };
    const production = {
        getAvailableObjects: (queue: QueueType) => queue === QueueType.Infantry ? [rules[names.infantry]] :
            queue === QueueType.Vehicles ? [rules[names.tank]] : [],
        getQueueData: (queue: QueueType) => ({ type: queue,
            status: queue === QueueType.Infantry ? args.infantryStatus ?? QueueStatus.Idle :
                args.vehicleStatus ?? QueueStatus.Idle,
            items: queue === QueueType.Vehicles && args.vehicleItem
                ? [{ rules: rules[args.vehicleItem] }] : [] }),
    };
    const bot = { lastPlayerActions: actions, lastPlayerProduction: production } as any;
    const game = {
        getCurrentTick: () => args.tick,
        getPlayerData: (name: string) => ({ startLocation: name === "first" ? { x: 39, y: 82 } : { x: 151, y: 119 } }),
        getVisibleUnits: () => [], getUnitData: () => undefined,
    } as any;
    return { country, names, actions, bot, game,
        spies: { queueForProduction, unqueueFromProduction, pauseProduction, resumeProduction, orderUnits, quitGame } };
};

describe("HFO Advanced V6 early-production technical gate", () => {
    it("freezes the six-arm trace design and country-aware units", () => {
        expect(HFO_ADVANCED_V6_SPEC).toEqual({ seedBase: 4_277_000_000, maxOffsets: 100,
            traceUpdates: 9_600, caseCount: 18, armCount: 6, taskCount: 108, snapshotCount: 9 });
        expect(HFO_ADVANCED_V6_ARMS.map((row) => row.id)).toEqual([
            "noop", "infantry_rush", "tank_rush", "dual_rush", "tank_production_only", "vehicle_focus",
        ]);
        expect(HFO_ADVANCED_V6_COUNTRIES).toHaveLength(9);
        expect(v6UnitNames("Americans" as any)).toEqual({ infantry: "E1", tank: "MTNK" });
        expect(v6UnitNames("Iraq" as any)).toEqual({ infantry: "E2", tank: "HTNK" });
        expect(HFO_ADVANCED_V6_SPEC.seedBase + 8 * 10_000 + 100 + 99).toBeLessThan(2 ** 32);
    });

    it("queues only the intended idle infantry unit inside its window", () => {
        const f = fixture({ tick: 1_200 });
        const controller = createV6TechnicalController(arm("infantry_rush"), f.country, "first", "opponent");
        controller.overlay.afterGameStart!(f.game, f.bot);
        controller.overlay.afterGameTick!(f.game, f.bot);
        expect(f.spies.queueForProduction).toHaveBeenCalledWith(
            QueueType.Infantry, f.names.infantry, ObjectType.Infantry, 1,
        );
        expect(f.spies.unqueueFromProduction).not.toHaveBeenCalled();
        expect(controller.actions).toEqual([expect.objectContaining({
            update: 1_200, source: "overlay", method: "queueForProduction",
        })]);
        expect(controller.telemetry).toEqual(expect.arrayContaining([
            expect.objectContaining({ event: "availability_check", available: true }),
            expect.objectContaining({ event: "production_mutation_issued", mutation: "queue" }),
        ]));
    });

    it("replaces a different active vehicle item only in vehicle-focus mode", () => {
        const f = fixture({ tick: 1_800, vehicleStatus: QueueStatus.Active, vehicleItem: "FV" });
        const controller = createV6TechnicalController(arm("vehicle_focus"), f.country, "first", "opponent");
        controller.overlay.afterGameStart!(f.game, f.bot);
        controller.overlay.afterGameTick!(f.game, f.bot);
        expect(f.spies.unqueueFromProduction).toHaveBeenCalledWith(
            QueueType.Vehicles, "FV", 0, 1,
        );
        expect(f.spies.queueForProduction).toHaveBeenCalledWith(
            QueueType.Vehicles, f.names.tank, 0, 1,
        );
        expect(controller.actions.map((row) => row.method)).toEqual([
            "unqueueFromProduction", "queueForProduction",
        ]);
    });

    it("keeps no-op and production-only arms free of overlay attack calls", () => {
        for (const id of ["noop", "tank_production_only"]) {
            const f = fixture({ tick: 7_200 });
            const controller = createV6TechnicalController(arm(id), f.country, "first", "opponent");
            controller.overlay.afterGameStart!(f.game, f.bot);
            controller.overlay.afterGameTick!(f.game, f.bot);
            expect(controller.actions.filter((row) => row.method === "orderUnits")).toHaveLength(0);
        }
    });

    it("recursively rejects competitive fields but accepts technical state", () => {
        expect(v6ProhibitedCompetitivePaths({ technicalState: "complete", queueStatus: 1,
            traces: [{ update: 1_200 }] })).toEqual([]);
        expect(v6ProhibitedCompetitivePaths({ nested: [{ winner: "first" }, { result: { score: 1 } }] }))
            .toEqual(["/nested/0/winner", "/nested/1/result", "/nested/1/result/score"]);
    });
});
