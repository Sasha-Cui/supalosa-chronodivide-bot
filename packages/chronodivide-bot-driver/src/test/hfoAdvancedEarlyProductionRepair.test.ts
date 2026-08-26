import { QueueStatus, QueueType } from "@chronodivide/game-api";
import { describe, expect, it, vi } from "vitest";
import { HFO_ADVANCED_V6_REPAIR_ARMS, HFO_ADVANCED_V6_REPAIR_SPEC,
    createV6VehicleRepairController } from "../training/hfoAdvancedEarlyProductionRepair.js";

const fixture = (tick: number, queueStatus: QueueStatus, currentName?: string) => {
    const tank = { name: "MTNK", type: 0 }, current = currentName ? { name: currentName, type: 0 } : undefined;
    const originals = { queueForProduction: vi.fn(), unqueueFromProduction: vi.fn(), pauseProduction: vi.fn(),
        resumeProduction: vi.fn(), orderUnits: vi.fn(), quitGame: vi.fn() };
    const actions = { ...originals }, production = {
        getAvailableObjects: (queue: QueueType) => queue === QueueType.Vehicles ? [tank] : [],
        getQueueData: () => ({ status: queueStatus, items: current ? [{ rules: current }] : [] }),
    }, bot = { lastPlayerActions: actions, lastPlayerProduction: production } as any,
        game = { getCurrentTick: () => tick,
            getPlayerData: (name: string) => ({ startLocation: name === "first" ? { x: 39, y: 82 } : { x: 151, y: 119 } }) } as any;
    return { originals, actions, production, bot, game };
};

describe("HFO Advanced V6 vehicle repair", () => {
    it("freezes the fresh two-arm repair design", () => {
        expect(HFO_ADVANCED_V6_REPAIR_ARMS).toEqual(["noop", "vehicle_idle_or_replace"]);
        expect(HFO_ADVANCED_V6_REPAIR_SPEC).toEqual({ seedBase: 4_277_500_000, maxOffsets: 100,
            traceUpdates: 9_600, caseCount: 18, armCount: 2, taskCount: 36, snapshotCount: 9 });
        expect(HFO_ADVANCED_V6_REPAIR_SPEC.seedBase + 8 * 10_000 + 100 + 99).toBeLessThan(2 ** 32);
    });

    it("queues an available tank on an idle 90-update check", () => {
        const f = fixture(1_200, QueueStatus.Idle), controller =
            createV6VehicleRepairController(true, "Americans" as any, "first", "opponent");
        controller.overlay.afterGameStart!(f.game, f.bot); controller.overlay.afterGameTick!(f.game, f.bot);
        expect(controller.actions).toEqual([expect.objectContaining({ update: 1_200, source: "overlay",
            method: "queueForProduction", args: [QueueType.Vehicles, "MTNK", 0, 1] })]);
        expect(controller.telemetry).toEqual(expect.arrayContaining([
            expect.objectContaining({ event: "production_mutation_issued", mutation: "queue_idle" }),
        ]));
    });

    it("replaces a different active item on a 600-update check", () => {
        const f = fixture(1_800, QueueStatus.Active, "FV"), controller =
            createV6VehicleRepairController(true, "Americans" as any, "first", "opponent");
        controller.overlay.afterGameStart!(f.game, f.bot); controller.overlay.afterGameTick!(f.game, f.bot);
        expect(controller.actions.map((row) => row.method)).toEqual([
            "unqueueFromProduction", "queueForProduction",
        ]);
        expect(controller.telemetry).toEqual(expect.arrayContaining([
            expect.objectContaining({ event: "production_mutation_issued", mutation: "replace_active",
                replacedName: "FV" }),
        ]));
    });

    it("prefers the idle rule when both checks coincide", () => {
        const f = fixture(3_000, QueueStatus.Idle), controller =
            createV6VehicleRepairController(true, "Americans" as any, "first", "opponent");
        controller.overlay.afterGameStart!(f.game, f.bot); controller.overlay.afterGameTick!(f.game, f.bot);
        expect(controller.actions.map((row) => row.method)).toEqual(["queueForProduction"]);
        expect(controller.telemetry).toEqual(expect.arrayContaining([
            expect.objectContaining({ mutation: "queue_idle" }),
        ]));
    });

    it("keeps no-op free of production and both arms free of combat actions", () => {
        for (const enabled of [false, true]) {
            const f = fixture(7_200, QueueStatus.Ready, "MTNK"), controller =
                createV6VehicleRepairController(enabled, "Americans" as any, "first", "opponent");
            controller.overlay.afterGameStart!(f.game, f.bot); controller.overlay.afterGameTick!(f.game, f.bot);
            expect(controller.actions.filter((row) => row.method === "orderUnits")).toHaveLength(0);
            if (!enabled) expect(controller.actions.filter((row) => row.source === "overlay")).toHaveLength(0);
        }
    });
});
