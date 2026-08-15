import { describe, expect, it, vi } from "vitest";
import { QueueStatus, QueueType } from "@chronodivide/game-api";
import { QUEUES } from "@supalosa/chronodivide-bot/dist/bot/logic/building/queueController.js";
import {
    ExclusiveProductionFocusQueueController,
    deriveExclusiveProductionFocusDecision,
} from "../benchmark/exclusiveProductionFocusQueueController.js";

const requests = (tankPriority: number) => new Map([
    ["GAPOWR", { priority: 300, specificLocation: null }],
    ["E1", { priority: 140, specificLocation: null }],
    ["MTNK", { priority: tankPriority, specificLocation: null }],
]);

const fixture = () => {
    const available = new Map<QueueType, Array<{ name: string }>>([
        [QueueType.Structures, [{ name: "GAPOWR" }]],
        [QueueType.Armory, []],
        [QueueType.Infantry, [{ name: "E1" }]],
        [QueueType.Vehicles, [{ name: "MTNK" }]],
        [QueueType.Aircrafts, []],
        [QueueType.Ships, []],
    ]);
    const statuses = new Map<QueueType, QueueStatus>([
        [QueueType.Structures, QueueStatus.Idle],
        [QueueType.Armory, QueueStatus.OnHold],
        [QueueType.Infantry, QueueStatus.Active],
        [QueueType.Vehicles, QueueStatus.Active],
        [QueueType.Aircrafts, QueueStatus.Ready],
        [QueueType.Ships, QueueStatus.Idle],
    ]);
    const actions = {
        pauseProduction: vi.fn(),
        queueForProduction: vi.fn(),
        resumeProduction: vi.fn(),
        unqueueFromProduction: vi.fn(),
    };
    const context = {
        game: { getCurrentTick: () => 3_600 },
        player: {
            actions,
            production: {
                getAvailableObjects: (queue: QueueType) => available.get(queue) ?? [],
                getQueueData: (queue: QueueType) => ({ type: queue, status: statuses.get(queue) }),
            },
        },
    };
    return { actions, context };
};

describe("exclusive production-focus external queue adapter", () => {
    it("derives one explicit focus and classifies every other queue", () => {
        const { context } = fixture();
        expect(deriveExclusiveProductionFocusDecision(
            context.player.production,
            requests(10_000),
        )).toEqual({
            focusQueue: QueueType.Vehicles,
            focusRequestName: "MTNK",
            focusPriority: 10_000,
            focusQueueStatus: QueueStatus.Active,
            pausedQueueTypes: [QueueType.Infantry],
            deferredQueueTypes: [QueueType.Structures, QueueType.Armory, QueueType.Ships],
            readyQueueTypes: [QueueType.Aircrafts],
        });
    });

    it("filters nonfocused mutations, pauses active work, and emits proof telemetry", () => {
        const { actions, context } = fixture();
        const telemetry: any[] = [];
        const delegate = {
            onAiUpdate: vi.fn((received: any) => {
                received.player.actions.queueForProduction(QueueType.Structures, "GAPOWR", 2, 1);
                received.player.actions.resumeProduction(QueueType.Infantry);
                received.player.actions.unqueueFromProduction(QueueType.Infantry, "E1", 3, 1);
                received.player.actions.pauseProduction(QueueType.Infantry);
                received.player.actions.pauseProduction(QueueType.Vehicles);
            }),
        };
        const controller = new ExclusiveProductionFocusQueueController(
            delegate,
            (event) => telemetry.push(event),
        );
        controller.onAiUpdate(context, null, requests(10_000), vi.fn());

        expect(actions.queueForProduction).not.toHaveBeenCalled();
        expect(actions.resumeProduction).not.toHaveBeenCalled();
        expect(actions.unqueueFromProduction).not.toHaveBeenCalled();
        expect(actions.pauseProduction).toHaveBeenCalledTimes(2);
        expect(actions.pauseProduction).toHaveBeenCalledWith(QueueType.Vehicles);
        expect(actions.pauseProduction).toHaveBeenCalledWith(QueueType.Infantry);
        expect(telemetry).toEqual([expect.objectContaining({
            schemaVersion: 26,
            event: "exclusive_queue_focus_scheduler",
            tick: 3_600,
            focusQueue: QueueType.Vehicles,
            focusRequestName: "MTNK",
            pausedQueueTypes: [QueueType.Infantry],
        })]);
    });

    it("delegates the exact context and emits nothing below the focus threshold", () => {
        const { context } = fixture();
        const telemetry: any[] = [];
        const delegate = { onAiUpdate: vi.fn() };
        const controller = new ExclusiveProductionFocusQueueController(
            delegate,
            (event) => telemetry.push(event),
        );
        controller.onAiUpdate(context, null, requests(1_000), vi.fn());
        expect(delegate.onAiUpdate.mock.calls[0][0]).toBe(context);
        expect(telemetry).toEqual([]);
    });

    it("covers the full canonical queue set in the test fixture", () => {
        const { context } = fixture();
        expect(QUEUES.map((queue) => context.player.production.getQueueData(queue).status)).toHaveLength(
            QUEUES.length,
        );
    });
});
