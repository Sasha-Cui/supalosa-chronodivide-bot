import { describe, expect, it, vi } from "vitest";
import { OrderType } from "@chronodivide/game-api";
import { UnifiedIntentArbiter } from "@supalosa/chronodivide-bot/dist/bot/logic/intent/unifiedIntentArbiter.js";
import { UnifiedIntentActionBoundary } from "@supalosa/chronodivide-bot/dist/bot/logic/intent/unifiedIntentActionBoundary.js";
import { StrongBot } from "@supalosa/chronodivide-bot/dist/bot/strongBot.js";
import { SupalosaBot } from "@supalosa/chronodivide-bot/dist/bot/bot.js";
import { StrongStrategy } from "@supalosa/chronodivide-bot/dist/bot/strategy/strongStrategy.js";
import { Countries } from "@supalosa/chronodivide-bot/dist/bot/logic/common/utils.js";
import { UnifiedIntentD1TelemetryCollector } from "../training/unifiedIntentD1Telemetry.js";
const mode = "separated_lanes_unbounded_d1" as const;
const options = { budgetMode: mode, commandCeiling: null };
const view = {
    getUnitData: (id: number) => id > 0 && id <= 500
        ? { id, owner: id === 499 ? "enemy" : "candidate", hitPoints: id === 498 ? 0 : 100 } : undefined,
    getGameObjectData: (id: number) => id >= 1000 && id <= 2000
        ? { id, hitPoints: id === 1999 ? 0 : 100, owner: id === 2000 ? "candidate" : "enemy" } : undefined,
    areAlliedPlayers: (a: string, b: string) => a === b,
    map: { getTile: (x: number, y: number) => x >= 0 && y >= 0 && x < 200 && y < 200 ? { x, y } : undefined },
} as any;
const flush = (core: UnifiedIntentArbiter) => {
    const calls: any[] = [];
    const telemetry = core.flush(view, "candidate", row => calls.push(row));
    return { calls, telemetry };
};
const saturate = (core: UnifiedIntentArbiter, count = 116) => {
    core.withScope("tactical_assault", () => {
        for (let i = 1; i <= count; i++) core.captureOrder([i], OrderType.Attack, 1000 + i);
    });
};
const fakeActions = () => {
    const calls: any[] = [];
    const api = Object.fromEntries([
        "placeBuilding", "sellObject", "sellBuilding", "toggleRepairWrench", "toggleAlliance",
        "pauseProduction", "resumeProduction", "queueForProduction", "unqueueFromProduction",
        "activateSuperWeapon", "orderUnits", "sayAll", "setGlobalDebugText", "setUnitDebugText", "quitGame",
    ].map(method => [method, (...args: any[]) => {
        calls.push({ method, args });
        return method + "-result";
    }])) as any;
    return { calls, api };
};

describe("D1 research-only unbounded command admission", () => {
    it("requires an explicit null ceiling and rejects mixed limits, Infinity and NaN", () => {
        for (const bad of [undefined, 0, 115, Infinity, NaN]) {
            expect(() => new UnifiedIntentArbiter({ ...options, commandCeiling: bad } as any)).toThrow(/D1/);
        }
        for (const extra of [{ totalCeiling: 150 }, { gameplayReserve: 35 }, { rollingUpdates: 899 }, { maxChunk: 127 }]) {
            expect(() => new UnifiedIntentArbiter({ ...options, ...extra } as any)).toThrow(/D1/);
        }
    });
    it("exceeds 115 without changing the essential lane or claiming cap enforcement", () => {
        const core = new UnifiedIntentArbiter(options);
        core.beginUpdate(1);
        core.recordImmediateGameplayNonorder(400);
        saturate(core);
        const { calls, telemetry } = flush(core);
        expect(calls).toHaveLength(116);
        expect(telemetry).toMatchObject({
            budgetMode: mode, commandCeiling: null, rollingCommandCalls: 116,
            rollingTotalCalls: 516, gameplayNonorderCalls: 400, deferredUnitIds: 0,
            commandCeilingOverflow: false, gameplayReserveOverflow: false, totalCeilingOverflow: false,
        });
        expect(JSON.parse(JSON.stringify(telemetry)).commandCeiling).toBeNull();
    });
    it("retains rolling-window accounting even though it does not limit admission", () => {
        const core = new UnifiedIntentArbiter(options);
        core.beginUpdate(1); saturate(core);
        expect(flush(core).telemetry.rollingCommandCalls).toBe(116);
        core.beginUpdate(900);
        core.withScope("terminal_objective", () => core.captureOrder([120], OrderType.Attack, 1200));
        expect(flush(core).telemetry.rollingCommandCalls).toBe(117);
        core.beginUpdate(901);
        expect(flush(core).telemetry.rollingCommandCalls).toBe(1);
    });
    it("retains priorities, canonical grouping, 128-ID chunks and one-forward semantics", () => {
        const core = new UnifiedIntentArbiter(options);
        core.beginUpdate(1);
        core.withScope("baseline_core", () => core.captureOrder(
            Array.from({ length: 260 }, (_, i) => 260 - i), OrderType.Move, 5, 6));
        core.withScope("emergency_defense", () => core.captureOrder([2, 1, 1], OrderType.Attack, 1500));
        const { calls, telemetry } = flush(core);
        expect(calls[0].scope).toBe("emergency_defense");
        expect(calls.map(row => row.unitIds.length)).toEqual([2, 128, 128, 2]);
        expect(new Set(calls.flatMap(row => row.unitIds)).size).toBe(260);
        expect(telemetry.sameUnitConflicts).toBe(2);
        expect(telemetry.multipleForwardedUnitViolations).toBe(0);
    });
    it("retains exact retry suppression boundaries", () => {
        const core = new UnifiedIntentArbiter(options);
        const issue = (tick: number) => {
            core.beginUpdate(tick);
            core.withScope("baseline_core", () => core.captureOrder([1], OrderType.Move, 5, 6));
            return flush(core);
        };
        expect(issue(1).calls).toHaveLength(1);
        expect(issue(30).telemetry.duplicateSuppressions).toBe(1);
        expect(issue(31).calls).toHaveLength(1);
    });
    it("keeps invalid units, friendly/dead terminal targets and invalid tiles filtered", () => {
        const core = new UnifiedIntentArbiter(options);
        core.beginUpdate(1);
        core.withScope("terminal_objective", () => {
            core.captureOrder([498, 499, 999], OrderType.Attack, 1001);
            core.captureOrder([1], OrderType.Attack, 2000);
            core.captureOrder([2], OrderType.Attack, 1999);
            core.captureOrder([3], OrderType.Move, -1, 2);
        });
        const { calls, telemetry } = flush(core);
        expect(calls).toEqual([]);
        expect(telemetry).toMatchObject({ invalidUnitIds: 3, invalidTargets: 2, invalidTiles: 1,
            deferredUnitIds: 0, pendingUnitIds: 0 });
    });
    it("retains scope validation and the 4096-ID request bound", () => {
        const core = new UnifiedIntentArbiter(options);
        core.beginUpdate(1);
        expect(() => core.captureOrder([1], OrderType.Move, 1, 2)).toThrow(/scope/);
        expect(() => core.withScope("baseline_core", () => core.captureOrder(
            Array.from({ length: 4097 }, (_, i) => i + 1), OrderType.Move, 1, 2))).toThrow(/array/);
    });
    it("preserves atomic production, essential returns, debug coalescing and order-before-debug", () => {
        const value = fakeActions();
        const boundary = new UnifiedIntentActionBoundary(value.api, view, "candidate", options);
        boundary.beginUpdate(1);
        for (let i = 0; i < 200; i++) value.api.toggleRepairWrench(i);
        expect(value.api.queueForProduction(1, "MTNK", 2, 1)).toBe("queueForProduction-result");
        expect(value.api.unqueueFromProduction(1, "MTNK", 2, 1)).toBe("unqueueFromProduction-result");
        boundary.withScope("tactical_assault", () => {
            for (let i = 1; i <= 116; i++) value.api.orderUnits([i], OrderType.Attack, 1000 + i);
        });
        value.api.sayAll("same"); value.api.sayAll("same"); value.api.setGlobalDebugText("other");
        const telemetry = boundary.flush();
        expect(telemetry).toMatchObject({ productionBatches: 1, gameplayNonorderCalls: 202,
            forwardedOrderCalls: 116, debugProposals: 3, debugCoalesced: 1, debugForwarded: 2, debugDropped: 0,
            rollingCommandCalls: 118, partialProductionBatchViolations: 0 });
        const methods = value.calls.map(row => row.method);
        expect(methods.slice(200, 202)).toEqual(["queueForProduction", "unqueueFromProduction"]);
        expect(methods.slice(202, 318)).toEqual(Array(116).fill("orderUnits"));
        expect(methods.slice(318).sort()).toEqual(["sayAll", "setGlobalDebugText"]);
        boundary.uninstall();
        expect(value.api.orderUnits([1], OrderType.Move, 1, 2)).toBe("orderUnits-result");
    });
    it("keeps the default disabled and only accepts explicit research opt-in", () => {
        const create = (intentArbiter: any = undefined) => new StrongBot(
            "candidate", Countries.USA, [], false, new StrongStrategy(), { intentArbiter });
        expect((create() as any).intentArbiterOptions).toEqual({ enabled: false });
        expect((create({ enabled: true, ...options }) as any).intentArbiterOptions)
            .toEqual({ enabled: true, ...options });
        for (const commandCeiling of [undefined, 115, Infinity]) {
            expect(() => create({ enabled: true, ...options, commandCeiling })).toThrow(/explicit null/);
        }
        expect(() => create({ enabled: true, ...options, totalCeiling: 150 })).toThrow(/explicit null/);
    });
    it("wires StrongBot startup to D1 rather than the hard-total fallback", () => {
        const parent = vi.spyOn(SupalosaBot.prototype, "onGameStart").mockImplementation(() => undefined);
        try {
            const bot = new StrongBot("candidate", Countries.USA, [], false, new StrongStrategy(), {
                defaultMapProfiles: false, intentArbiter: { enabled: true, ...options },
            });
            const value = fakeActions();
            Object.defineProperty(bot, "player", { value: { actions: value.api, production: {} }, configurable: true });
            bot.onGameStart(view);
            const boundary = (bot as any).intentActionBoundary;
            boundary.beginUpdate(1);
            for (let i = 0; i < 200; i++) value.api.toggleRepairWrench(i);
            const telemetry = boundary.flush();
            expect(telemetry).toMatchObject({ budgetMode: mode, commandCeiling: null,
                gameplayNonorderCalls: 200, gameplayReserveOverflow: false, totalCeilingOverflow: false });
            expect(parent).toHaveBeenCalledOnce();
        } finally { parent.mockRestore(); }
    });
});

describe("D1 descriptive telemetry", () => {
    it.each(["separated_lanes_v2", mode] as const)("distinguishes budget denials and reference excursions for %s", budgetMode => {
        const core = new UnifiedIntentArbiter(budgetMode === mode ? options
            : { budgetMode, commandCeiling: 115 });
        core.beginUpdate(1); saturate(core);
        const collector = new UnifiedIntentD1TelemetryCollector(budgetMode);
        collector.observe(flush(core).telemetry);
        const summary = collector.finish(1);
        expect(summary.budgetDeniedUnitIdOccurrences).toBe(budgetMode === mode ? 0 : 1);
        expect(summary.referenceExceededUpdates).toBe(budgetMode === mode ? 1 : 0);
        expect(summary.commandCeilingEnforced).toBe(budgetMode !== mode);
        expect(summary.commandCeiling).toBe(budgetMode === mode ? null : 115);
        expect(summary.counters.invalidTargets).toBe(0);
        expect(() => collector.finish(1)).toThrow(/incomplete/);
    });
    it("does not conflate duplicate suppression or invalid requests with budget denial", () => {
        const core = new UnifiedIntentArbiter(options);
        const collector = new UnifiedIntentD1TelemetryCollector(mode);
        for (const tick of [1, 2]) {
            core.beginUpdate(tick);
            core.withScope("baseline_core", () => {
                core.captureOrder([1], OrderType.Move, 5, 6);
                core.captureOrder([499], OrderType.Move, 5, 6);
            });
            collector.observe(flush(core).telemetry);
        }
        expect(collector.finish(2)).toMatchObject({ budgetDeniedUnitIdOccurrences: 0, budgetDenialUpdates: 0,
            counters: { duplicateSuppressions: 1, invalidUnitIds: 2 } });
    });
    it("fails closed on mode, ceiling, clock, rolling-count and admission inconsistencies", () => {
        const core = new UnifiedIntentArbiter(options); core.beginUpdate(1); saturate(core);
        const valid = flush(core).telemetry;
        for (const bad of [
            { budgetMode: "separated_lanes_v2" }, { commandCeiling: Infinity }, { commandCeiling: 115 },
            { tick: 2 }, { deferredUnitIds: 1 }, { debugDropped: 1 }, { rollingCommandCalls: 0 },
            { expiredPending: -1 }, { totalCeilingOverflow: true }, { maxForwardedChunkSize: 129 },
        ]) {
            const collector = new UnifiedIntentD1TelemetryCollector(mode);
            expect(() => collector.observe({ ...valid, ...bad } as any)).toThrow(/invariant/);
        }
    });
});
