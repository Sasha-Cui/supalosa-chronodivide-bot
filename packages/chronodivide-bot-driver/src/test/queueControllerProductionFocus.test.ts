import { describe, expect, it } from "vitest";
import { QueueStatus, QueueType } from "@chronodivide/game-api";
import {
    EXCLUSIVE_PRODUCTION_FOCUS_PRIORITY,
    getExclusiveProductionFocusDisposition,
    selectExclusiveProductionFocusQueue,
} from "@supalosa/chronodivide-bot/dist/bot/logic/building/queueController.js";

describe("queue controller exclusive production focus", () => {
    it("selects the single queue carrying an explicit focus request", () => {
        expect(selectExclusiveProductionFocusQueue([
            { queue: QueueType.Structures, priority: 300 },
            { queue: QueueType.Infantry, priority: 140 },
            { queue: QueueType.Vehicles, priority: EXCLUSIVE_PRODUCTION_FOCUS_PRIORITY },
        ])).toBe(QueueType.Vehicles);
    });

    it("does not alter ordinary queue scheduling below the explicit threshold", () => {
        expect(selectExclusiveProductionFocusQueue([
            { queue: QueueType.Structures, priority: 1_000 },
            { queue: QueueType.Vehicles, priority: 999 },
        ])).toBeNull();
    });

    it("fails closed instead of choosing among simultaneous focus requests", () => {
        expect(selectExclusiveProductionFocusQueue([
            { queue: QueueType.Infantry, priority: EXCLUSIVE_PRODUCTION_FOCUS_PRIORITY },
            { queue: QueueType.Vehicles, priority: EXCLUSIVE_PRODUCTION_FOCUS_PRIORITY },
        ])).toBeNull();
    });

    it("pauses active nonfocused queues without touching their items", () => {
        expect(getExclusiveProductionFocusDisposition(
            QueueType.Infantry,
            QueueStatus.Active,
            QueueType.Vehicles,
        )).toBe("pause");
        expect(getExclusiveProductionFocusDisposition(
            QueueType.Infantry,
            QueueStatus.OnHold,
            QueueType.Vehicles,
        )).toBe("defer");
        expect(getExclusiveProductionFocusDisposition(
            QueueType.Infantry,
            QueueStatus.Idle,
            QueueType.Vehicles,
        )).toBe("defer");
    });

    it("keeps the focused queue and already-ready work on normal handling", () => {
        expect(getExclusiveProductionFocusDisposition(
            QueueType.Vehicles,
            QueueStatus.Active,
            QueueType.Vehicles,
        )).toBe("normal");
        expect(getExclusiveProductionFocusDisposition(
            QueueType.Structures,
            QueueStatus.Ready,
            QueueType.Vehicles,
        )).toBe("normal");
        expect(getExclusiveProductionFocusDisposition(
            QueueType.Infantry,
            QueueStatus.Active,
            null,
        )).toBe("normal");
    });
});
