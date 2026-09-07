import { ObjectType, OrderType, QueueType } from "@chronodivide/game-api";
import { describe, expect, it } from "vitest";
import {
    UnifiedIntentActionBoundary,
    withUnifiedIntentScope,
} from "@supalosa/chronodivide-bot/dist/bot/logic/intent/unifiedIntentActionBoundary.js";
import {
    ActionBatcher,
    BatchableAction,
} from "@supalosa/chronodivide-bot/dist/bot/logic/mission/actionBatcher.js";

type ActionCall = { method: string; args: unknown[] };

const actions = (): { api: any; calls: ActionCall[] } => {
    const calls: ActionCall[] = [];
    const api: Record<string, (...args: unknown[]) => unknown> = {};
    for (const method of [
        "placeBuilding",
        "sellObject",
        "sellBuilding",
        "toggleRepairWrench",
        "toggleAlliance",
        "pauseProduction",
        "resumeProduction",
        "queueForProduction",
        "unqueueFromProduction",
        "activateSuperWeapon",
        "orderUnits",
        "sayAll",
        "setGlobalDebugText",
        "setUnitDebugText",
        "quitGame",
    ]) {
        api[method] = (...args: unknown[]) => {
            calls.push({ method, args: structuredClone(args) });
            return method + "-result";
        };
    }
    return { api, calls };
};

const game = (
    unitCount: number,
    targetCount = 1,
) => {
    const units = new Map(Array.from({ length: unitCount }, (_, index) => [
        index + 1,
        { id: index + 1, owner: "candidate", hitPoints: 100 },
    ]));
    const targets = new Map(Array.from({ length: targetCount }, (_, index) => [
        500 + index,
        { id: 500 + index, owner: "opponent", hitPoints: 100 },
    ]));
    return {
        areAlliedPlayers: (left: string, right: string) => left === right,
        getUnitData: (id: number) => units.get(id),
        getGameObjectData: (id: number) => units.get(id) ?? targets.get(id),
        map: {
            getTile: (rx: number, ry: number) =>
                rx >= 0 && ry >= 0 && rx < 200 && ry < 200
                    ? { rx, ry }
                    : undefined,
        },
    } as any;
};

describe("unified intent action boundary", () => {
    it("is exact passthrough outside an update and restores originals", () => {
        const value = actions();
        const originalOrder = value.api.orderUnits;
        const boundary = new UnifiedIntentActionBoundary(
            value.api,
            game(1),
            "candidate",
            { totalCeiling: 75 },
        );
        expect(value.api.placeBuilding("GAPOWR", 1, 2)).toBe("placeBuilding-result");
        expect(value.api.orderUnits([1], OrderType.Move, 2, 3)).toBe("orderUnits-result");
        expect(value.calls.map((call) => call.method)).toEqual(["placeBuilding", "orderUnits"]);
        boundary.uninstall();
        expect(value.api.orderUnits).toBe(originalOrder);
        expect(withUnifiedIntentScope(value.api, "terminal_objective", () => 7)).toBe(7);
    });

    it("arbitrates orders, preserves production batches, and coalesces debug", () => {
        const value = actions();
        const boundary = new UnifiedIntentActionBoundary(
            value.api,
            game(2),
            "candidate",
            { totalCeiling: 75 },
        );
        boundary.beginUpdate(1);
        withUnifiedIntentScope(value.api, "baseline_core", () => {
            value.api.orderUnits([1], OrderType.Move, 10, 11);
        });
        boundary.withScope("emergency_defense", () => {
            value.api.orderUnits([1], OrderType.Attack, 500);
        });
        value.api.queueForProduction(QueueType.Vehicles, "MTNK", ObjectType.Vehicle, 1);
        value.api.unqueueFromProduction(QueueType.Vehicles, "MTNK", ObjectType.Vehicle, 1);
        value.api.placeBuilding("GAPOWR", 1, 2);
        value.api.pauseProduction(QueueType.Vehicles);
        value.api.setUnitDebugText(1, "unit");
        value.api.setUnitDebugText(1, "unit");
        const telemetry = boundary.flush();

        const orders = value.calls.filter((call) => call.method === "orderUnits");
        expect(orders).toEqual([{
            method: "orderUnits",
            args: [[1], OrderType.Attack, 500],
        }]);
        expect(telemetry.sameUnitConflicts).toBe(1);
        expect(telemetry.productionBatches).toBe(2);
        expect(telemetry.debugProposals).toBe(2);
        expect(telemetry.debugCoalesced).toBe(1);
        expect(telemetry.debugForwarded).toBe(1);
        expect(telemetry.debugDropped).toBe(0);
        expect(telemetry.forwardedOrderCalls).toBe(1);
        expect(value.calls.filter((call) => call.method === "setUnitDebugText")).toHaveLength(1);
        expect(boundary.getLatestTelemetry()).toEqual(telemetry);
    });

    it("gives orders priority over best-effort debug at the smallest ceiling", () => {
        const value = actions();
        const boundary = new UnifiedIntentActionBoundary(
            value.api,
            game(40, 40),
            "candidate",
            { totalCeiling: 75 },
        );
        boundary.beginUpdate(1);
        for (let index = 0; index < 35; index += 1) {
            value.api.toggleRepairWrench(index + 1);
        }
        boundary.withScope("objective_closeout", () => {
            for (let index = 0; index < 40; index += 1) {
                value.api.orderUnits([index + 1], OrderType.Attack, 500 + index);
            }
        });
        value.api.sayAll("best effort");
        const telemetry = boundary.flush();
        expect(telemetry.rollingGameplayNonorderCalls).toBe(35);
        expect(telemetry.rollingOrderCalls).toBe(40);
        expect(telemetry.rollingDebugCalls).toBe(0);
        expect(telemetry.rollingTotalCalls).toBe(75);
        expect(telemetry.debugDropped).toBe(1);
        expect(telemetry.totalCeilingOverflow).toBe(false);
        expect(value.calls.filter((call) => call.method === "sayAll")).toEqual([]);
    });

    it("preserves BatchableAction scope through the final per-unit boundary", () => {
        const value = actions();
        const boundary = new UnifiedIntentActionBoundary(
            value.api,
            game(1),
            "candidate",
            { totalCeiling: 75 },
        );
        boundary.beginUpdate(1);
        const batcher = new ActionBatcher(1);
        batcher.push(BatchableAction.toPoint(
            1,
            OrderType.Move,
            { x: 10, y: 11 } as any,
        ));
        batcher.push(BatchableAction.toTargetId(
            1,
            OrderType.Attack,
            500,
        ).withIntentScope("terminal_objective"));
        batcher.resolve(value.api);
        const telemetry = boundary.flush();

        expect(value.calls.filter((call) => call.method === "orderUnits")).toEqual([{
            method: "orderUnits",
            args: [[1], OrderType.Attack, 500],
        }]);
        expect(telemetry.sameUnitConflicts).toBe(1);
        expect(telemetry.winningUnitsByScope.terminal_objective).toBe(1);
        expect(telemetry.winningUnitsByScope.baseline_core).toBe(0);
    });

    it("fails closed when the public action surface is incomplete", () => {
        const value = actions();
        const originalPlace = value.api.placeBuilding;
        delete value.api.quitGame;
        expect(() => new UnifiedIntentActionBoundary(
            value.api,
            game(1),
            "candidate",
            { totalCeiling: 75 },
        )).toThrow(/quitGame/);
        expect(value.api.placeBuilding).toBe(originalPlace);
    });
});
