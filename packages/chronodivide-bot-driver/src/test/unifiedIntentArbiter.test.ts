import { OrderType } from "@chronodivide/game-api";
import { describe, expect, it } from "vitest";
import {
    UnifiedForwardedOrder,
    UnifiedIntentArbiter,
    UNIFIED_INTENT_GAMEPLAY_RESERVE,
    UNIFIED_INTENT_MAX_CHUNK,
    UNIFIED_INTENT_ROLLING_UPDATES,
    UNIFIED_INTENT_SCOPE_SPECS,
} from "@supalosa/chronodivide-bot/dist/bot/logic/intent/unifiedIntentArbiter.js";

type FakeUnit = {
    id: number;
    owner: string;
    hitPoints: number;
};

const game = (
    unitValues: FakeUnit[],
    objectValues: Array<{ id: number; hitPoints?: number; owner?: string }> = [],
) => {
    const units = new Map(unitValues.map((unit) => [unit.id, unit]));
    const objects = new Map<number, FakeUnit | { id: number; hitPoints?: number; owner?: string }>();
    unitValues.forEach((unit) => objects.set(unit.id, unit));
    objectValues.forEach((object) => objects.set(object.id, object));
    return {
        areAlliedPlayers: (left: string, right: string) => left === right,
        getUnitData: (id: number) => units.get(id),
        getGameObjectData: (id: number) => objects.get(id),
        map: {
            getTile: (rx: number, ry: number) =>
                rx >= 0 && ry >= 0 && rx <= 200 && ry <= 200
                    ? { rx, ry }
                    : undefined,
        },
    } as any;
};

const owned = (count: number, first = 1): FakeUnit[] =>
    Array.from({ length: count }, (_, index) => ({
        id: first + index,
        owner: "candidate",
        hitPoints: 100,
    }));

const collect = (
    arbiter: UnifiedIntentArbiter,
    view: ReturnType<typeof game>,
): { calls: UnifiedForwardedOrder[]; telemetry: ReturnType<UnifiedIntentArbiter["flush"]> } => {
    const calls: UnifiedForwardedOrder[] = [];
    const telemetry = arbiter.flush(view, "candidate", (call) => calls.push(call));
    return { calls, telemetry };
};

describe("unified intent arbiter V1", () => {
    it("freezes the measured constants and scope priorities", () => {
        expect(UNIFIED_INTENT_GAMEPLAY_RESERVE).toBe(35);
        expect(UNIFIED_INTENT_ROLLING_UPDATES).toBe(900);
        expect(UNIFIED_INTENT_MAX_CHUNK).toBe(128);
        expect(UNIFIED_INTENT_SCOPE_SPECS).toEqual({
            terminal_objective: { priority: 700, retryTicks: 1, pendingTtlTicks: 360 },
            emergency_defense: { priority: 600, retryTicks: 3, pendingTtlTicks: 90 },
            home_guard: { priority: 550, retryTicks: 6, pendingTtlTicks: 120 },
            objective_closeout: { priority: 500, retryTicks: 6, pendingTtlTicks: 360 },
            tactical_assault: { priority: 400, retryTicks: 12, pendingTtlTicks: 240 },
            route_sweep: { priority: 300, retryTicks: 30, pendingTtlTicks: 600 },
            harassment: { priority: 200, retryTicks: 60, pendingTtlTicks: 180 },
            baseline_core: { priority: 100, retryTicks: 30, pendingTtlTicks: 240 },
        });
        expect(() => new UnifiedIntentArbiter({ totalCeiling: 76 as any }))
            .toThrow(/ceiling/);
        expect(() => new UnifiedIntentArbiter({
            totalCeiling: 75,
            gameplayReserve: 34,
        })).toThrow(/constants/);
    });

    it("chooses one highest-priority winner per unit and preserves overloads", () => {
        const view = game(owned(130), [{ id: 500, hitPoints: 500 }]);
        const arbiter = new UnifiedIntentArbiter({ totalCeiling: 75 });
        arbiter.beginUpdate(1);
        arbiter.withScope("baseline_core", () => {
            arbiter.captureOrder(
                Array.from({ length: 130 }, (_, index) => 130 - index),
                OrderType.Attack,
                500,
            );
        });
        arbiter.withScope("emergency_defense", () => {
            arbiter.captureOrder([2, 1, 1], OrderType.AttackMove, 10, 11, true);
        });
        const { calls, telemetry } = collect(arbiter, view);
        expect(calls).toHaveLength(2);
        expect(calls[0]).toMatchObject({
            scope: "emergency_defense",
            unitIds: [1, 2],
            target: { kind: "tile", rx: 10, ry: 11, onBridge: true },
        });
        expect(calls[1]).toMatchObject({
            scope: "baseline_core",
            unitIds: Array.from({ length: 128 }, (_, index) => index + 3),
            target: { kind: "object", objectId: 500 },
        });
        expect(new Set(calls.flatMap((call) => call.unitIds)).size).toBe(130);
        expect(telemetry.sameUnitConflicts).toBe(2);
        expect(telemetry.forwardedOrderCalls).toBe(2);
        expect(telemetry.forwardedUnitIds).toBe(130);
    });

    it("sorts IDs and chunks a canonical group at 128", () => {
        const view = game(owned(260));
        const arbiter = new UnifiedIntentArbiter({ totalCeiling: 75 });
        arbiter.beginUpdate(1);
        arbiter.withScope("route_sweep", () => {
            arbiter.captureOrder(
                Array.from({ length: 260 }, (_, index) => 260 - index),
                OrderType.Move,
                12,
                13,
            );
        });
        const { calls } = collect(arbiter, view);
        expect(calls.map((call) => call.unitIds.length)).toEqual([128, 128, 4]);
        expect(calls.flatMap((call) => call.unitIds))
            .toEqual(Array.from({ length: 260 }, (_, index) => index + 1));
    });

    it("rejects missing, dead, foreign, invalid-target, and invalid-tile intents", () => {
        const view = game([
            { id: 1, owner: "candidate", hitPoints: 100 },
            { id: 2, owner: "opponent", hitPoints: 100 },
            { id: 3, owner: "candidate", hitPoints: 0 },
            { id: 4, owner: "candidate", hitPoints: 100 },
            { id: 5, owner: "candidate", hitPoints: 100 },
        ], [
            { id: 500, hitPoints: 100 },
            { id: 501, hitPoints: 0 },
        ]);
        const arbiter = new UnifiedIntentArbiter({ totalCeiling: 75 });
        arbiter.beginUpdate(1);
        arbiter.withScope("tactical_assault", () => {
            arbiter.captureOrder([999, 3, 2, 1, 1], OrderType.Attack, 500);
            arbiter.captureOrder([4], OrderType.Attack, 501);
            arbiter.captureOrder([5], OrderType.Move, 999, 999);
        });
        const { calls, telemetry } = collect(arbiter, view);
        expect(calls).toHaveLength(1);
        expect(calls[0].unitIds).toEqual([1]);
        expect(telemetry.invalidUnitIds).toBe(3);
        expect(telemetry.invalidTargets).toBe(1);
        expect(telemetry.invalidTiles).toBe(1);
    });

    it("invalidates a terminal object target after it becomes friendly", () => {
        const view = game(owned(1), [{
            id: 500,
            owner: "candidate",
            hitPoints: 100,
        }]);
        const arbiter = new UnifiedIntentArbiter({ totalCeiling: 75 });
        arbiter.beginUpdate(1);
        arbiter.withScope("terminal_objective", () => {
            arbiter.captureOrder([1], OrderType.Attack, 500);
        });
        const result = collect(arbiter, view);
        expect(result.calls).toEqual([]);
        expect(result.telemetry.invalidTargets).toBe(1);
        expect(result.telemetry.pendingUnitIds).toBe(0);
    });

    it("suppresses identical retries until the exact scope boundary", () => {
        const view = game(owned(1));
        const arbiter = new UnifiedIntentArbiter({ totalCeiling: 75 });
        const issue = (tick: number) => {
            arbiter.beginUpdate(tick);
            arbiter.withScope("baseline_core", () => {
                arbiter.captureOrder([1], OrderType.Move, 5, 6);
            });
            return collect(arbiter, view);
        };
        expect(issue(1).calls).toHaveLength(1);
        expect(issue(29).telemetry.duplicateSuppressions).toBe(1);
        expect(issue(30).telemetry.duplicateSuppressions).toBe(1);
        expect(issue(31).calls).toHaveLength(1);
    });

    it("defers at the order cap and admits the pending intent at t plus 900", () => {
        const units = owned(41);
        const targets = Array.from({ length: 41 }, (_, index) => ({
            id: 1_000 + index,
            hitPoints: 100,
        }));
        const view = game(units, targets);
        const arbiter = new UnifiedIntentArbiter({ totalCeiling: 75 });
        arbiter.beginUpdate(1);
        arbiter.withScope("terminal_objective", () => {
            for (let index = 0; index < 40; index += 1) {
                arbiter.captureOrder([index + 1], OrderType.Attack, 1_000 + index);
            }
        });
        expect(collect(arbiter, view).telemetry.forwardedOrderCalls).toBe(40);

        arbiter.beginUpdate(900);
        arbiter.withScope("terminal_objective", () => {
            arbiter.captureOrder([41], OrderType.Attack, 1_040);
        });
        const blocked = collect(arbiter, view);
        expect(blocked.calls).toEqual([]);
        expect(blocked.telemetry.deferredUnitIds).toBe(1);
        expect(arbiter.pendingCount()).toBe(1);

        arbiter.beginUpdate(901);
        const admitted = collect(arbiter, view);
        expect(admitted.calls).toHaveLength(1);
        expect(admitted.calls[0].unitIds).toEqual([41]);
        expect(arbiter.pendingCount()).toBe(0);
    });

    it("revokes stale terminal pending intents before they can forward", () => {
        const units = owned(41);
        const targets = Array.from({ length: 41 }, (_, index) => ({
            id: 2_000 + index,
            hitPoints: 100,
        }));
        const view = game(units, targets);
        const arbiter = new UnifiedIntentArbiter({ totalCeiling: 75 });
        arbiter.beginUpdate(1);
        arbiter.withScope("terminal_objective", () => {
            for (let index = 0; index < 41; index += 1) {
                arbiter.captureOrder([index + 1], OrderType.Attack, 2_000 + index);
            }
        });
        const first = collect(arbiter, view);
        expect(first.telemetry.forwardedOrderCalls).toBe(40);
        expect(arbiter.pendingCount()).toBe(1);
        arbiter.beginUpdate(2);
        expect(arbiter.revokePending("terminal_objective")).toBe(1);
        const revoked = collect(arbiter, view);
        expect(revoked.calls).toEqual([]);
        expect(revoked.telemetry.revokedPending).toBe(1);
    });

    it("reserves 35 gameplay calls and fails visibly on essential overflow", () => {
        const view = game(owned(40), Array.from({ length: 40 }, (_, index) => ({
            id: 3_000 + index,
            hitPoints: 100,
        })));
        const exact = new UnifiedIntentArbiter({ totalCeiling: 75 });
        exact.beginUpdate(1);
        exact.recordImmediateGameplayNonorder(35);
        exact.withScope("objective_closeout", () => {
            for (let index = 0; index < 40; index += 1) {
                exact.captureOrder([index + 1], OrderType.Attack, 3_000 + index);
            }
        });
        const full = collect(exact, view).telemetry;
        expect(full.forwardedOrderCalls).toBe(40);
        expect(full.rollingTotalCalls).toBe(75);
        expect(full.gameplayReserveOverflow).toBe(false);
        expect(full.totalCeilingOverflow).toBe(false);

        const overflow = new UnifiedIntentArbiter({ totalCeiling: 75 });
        overflow.beginUpdate(1);
        overflow.recordImmediateGameplayNonorder(76);
        const failed = collect(overflow, game([])).telemetry;
        expect(failed.gameplayReserveOverflow).toBe(true);
        expect(failed.totalCeilingOverflow).toBe(true);
    });

    it("expires a deferred intent immediately after its exact TTL", () => {
        const units = owned(41);
        const targets = Array.from({ length: 41 }, (_, index) => ({
            id: 4_000 + index,
            hitPoints: 100,
        }));
        const view = game(units, targets);
        const arbiter = new UnifiedIntentArbiter({ totalCeiling: 75 });
        arbiter.beginUpdate(1);
        arbiter.withScope("terminal_objective", () => {
            for (let index = 0; index < 40; index += 1) {
                arbiter.captureOrder([index + 1], OrderType.Attack, 4_000 + index);
            }
        });
        expect(collect(arbiter, view).telemetry.forwardedOrderCalls).toBe(40);

        arbiter.beginUpdate(2);
        arbiter.withScope("harassment", () => {
            arbiter.captureOrder([41], OrderType.Attack, 4_040);
        });
        const blocked = collect(arbiter, view);
        expect(blocked.telemetry.pendingUnitIds).toBe(1);
        expect(blocked.telemetry.deferredUnitIds).toBe(1);

        arbiter.beginUpdate(181);
        const lastValid = collect(arbiter, view);
        expect(lastValid.telemetry.pendingUnitIds).toBe(1);

        arbiter.beginUpdate(182);
        const expired = collect(arbiter, view);
        expect(expired.telemetry.expiredPending).toBe(1);
        expect(expired.telemetry.pendingUnitIds).toBe(0);
    });
    it("fails closed on unscoped or malformed proposals", () => {

        const arbiter = new UnifiedIntentArbiter({ totalCeiling: 75 });
        expect(() => arbiter.captureOrder([1], OrderType.Move, 1, 2))
            .toThrow(/not active/);
        arbiter.beginUpdate(1);
        expect(() => arbiter.captureOrder([1], OrderType.Move, 1, 2))
            .toThrow(/semantic scope/);
        expect(() => arbiter.withScope("baseline_core", () =>
            arbiter.captureOrder([1], OrderType.Move, 1, 2, "bridge" as any)))
            .toThrow(/bridge flag/);
    });
});
