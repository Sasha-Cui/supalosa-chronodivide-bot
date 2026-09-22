import { describe, expect, it, vi } from "vitest";
import { ApiEventType, ObjectType } from "@chronodivide/game-api";
import { runUnifiedIntentD1Episode } from "../training/unifiedIntentD1Episode.js";
import { D1_ARMS } from "../training/unifiedIntentD1Plan.js";
import { runUnifiedIntentV2OD1Episode } from "../training/unifiedIntentV2OD1Episode.js";
import { UnifiedIntentArbiter } from "@supalosa/chronodivide-bot/dist/bot/logic/intent/unifiedIntentArbiter.js";
import { FRESH_DUAL_ACTION_METHODS } from "../training/freshDualStudyInstrumentation.js";
import { verifyEmbeddedFreshDualLedger } from "../training/embeddedFreshDualLedger.js";
vi.mock("../benchmark/seededOfflineGame.js", () => ({
    withSeededOfflineGame: async (api: any, options: any, seed: number, bindings: any[], body: any) => {
        expect(seed).toBe(3350111100);
        expect(bindings.map((b: any) => b.identity)).toEqual(["candidate", "opponent"]);
        const instance = await api.createGame(options);
        return body(instance);
    },
}));
vi.mock("../training/freshDualStudyInstrumentation.js", async (original) => {
    const real = await original<any>();
    return { ...real, snapshotFreshDualPublicWorld: (game: any) => ({
        tick: game.getCurrentTick(), units: game.getAllUnits().map((id: number) => game.getUnitData(id)),
    }) };
});
const telemetry = (tick: number, arm: any): any => {
    const core = new UnifiedIntentArbiter({ budgetMode: arm.budgetMode, commandCeiling: arm.commandCeiling });
    core.beginUpdate(tick);
    return core.flush({} as any, "Candidate", () => {});
};
const fixture = (armIndex = 0, event: "destroy" | "rubble" | "none" | "unexplained" = "destroy") => {
    let tick = 0;
    let nativeFinished = false;
    let units: any[] = [
        { id: 1, owner: "Candidate", hitPoints: 100, rules: { name: "GACNST", type: ObjectType.Building },
            tile: { rx: 1, ry: 2 } },
        { id: 2, owner: "Opponent", hitPoints: 100, rules: { name: "NACNST", type: ObjectType.Building },
            tile: { rx: 3, ry: 4 } },
    ];
    const game: any = {
        getCurrentTick: () => tick, getAllUnits: () => units.map((u) => u.id),
        getUnitData: (id: number) => units.find((u) => u.id === id),
        getVisibleUnits: (owner: string) => units.filter((u) => u.owner === owner && u.hitPoints > 0).map((u) => u.id),
        getPlayerData: (name: string) => ({ startLocation: name === "Candidate" ? { x: 1, y: 2 } : { x: 3, y: 4 } }),
        isPlayerDefeated: () => false,
    };
    const bot = (name: string): any => {
        const actions = Object.fromEntries(FRESH_DUAL_ACTION_METHODS.map((method) => [method, vi.fn()]));
        return { name, player: { actions }, lastGameApi: null, lastPlayerActions: null,
            lastPlayerProduction: null, lastUnifiedIntentTelemetry: null,
            onGameStart(api: any) { this.lastGameApi = api; this.lastPlayerActions = actions; this.lastPlayerProduction = {}; },
            onGameEvent: vi.fn() };
    };
    const candidate = bot("Candidate"), opponent = bot("Opponent");
    const api = {
        createGame: vi.fn(async (options: any) => {
            expect(options.shortGame).toBe(false);
            expect(options.credits).toBe(10000);
            for (const player of options.agents) player.onGameStart(game);
            return {
                isFinished: () => nativeFinished,
                update: async () => {
                    tick++;
                    candidate.lastUnifiedIntentTelemetry = armIndex > 0 ? telemetry(tick, D1_ARMS[armIndex]) : null;
                    if (tick === 2 && (event === "destroy" || event === "rubble")) {
                        const e = { type: ApiEventType.ObjectDestroy, target: 2,
                            attackerInfo: { playerName: "Candidate", objId: 99, weaponName: "105mm" } };
                        candidate.onGameEvent(e); opponent.onGameEvent(e);
                        units = event === "destroy" ? [units[0]] : [units[0], { ...units[1], hitPoints: 0 }];
                    }
                    if (tick === 2 && event === "unexplained") nativeFinished = true;
                },
            };
        }),
    };
    return { api, candidate, opponent, arm: D1_ARMS[armIndex],
        spec: { mapName: "synthetic", gameMode: 0, candidateSlot: 0 as const,
            candidateStart: "1,2", opponentStart: "3,4", candidateStartOrdinal: 0,
            opponentStartOrdinal: 1, requestedEngineSeed: 3350111100, maxUpdates: 24000 as const } };
};
describe("D1 dual-observer episode adapter (synthetic, no simulator)", () => {
    it.each([0, 1])("preserves the complete OD1 payload and telemetry contract for arm=%s", async armIndex => {
        const legacy = await runUnifiedIntentV2OD1Episode({ ...fixture(armIndex), mode: "competitive" } as any);
        const diagnostic = await runUnifiedIntentD1Episode({ ...fixture(armIndex), mode: "competitive" });
        const { budgetDiagnostics, ...unchanged } = diagnostic;
        expect(unchanged).toEqual({ ...legacy, kind: "unified-intent-d1-competitive-v1" });
        expect(budgetDiagnostics === null).toBe(armIndex === 0);
    });
    it("rejects nonfinite unbounded ceilings before creating a game", async () => {
        for (const commandCeiling of [Infinity, -Infinity, NaN, undefined]) {
            const args = fixture(2);
            await expect(runUnifiedIntentD1Episode({ ...args,
                arm: { ...D1_ARMS[2], commandCeiling } as any, mode: "competitive",
            })).rejects.toThrow(/identity/);
            expect(args.api.createGame).not.toHaveBeenCalled();
        }
    });
    it.each([0, 1, 2])("replays exact destruction completion with arm=%s", async (armIndex) => {
        const value = await runUnifiedIntentD1Episode({ ...fixture(armIndex), mode: "competitive" });
        expect(value.kind).toBe("unified-intent-d1-competitive-v1");
        if (value.kind !== "unified-intent-d1-competitive-v1") throw new Error("wrong projection");
        expect(value.updates).toBe(2);
        expect(value.dualState.v6.firstResult?.winner).toBe("candidate");
        expect(value.dualState.v5.firstResult?.winner).toBe("candidate");
        expect(value.telemetry === null).toBe(armIndex === 0);
        expect((await verifyEmbeddedFreshDualLedger(value.ledger)).final?.dualState).toEqual(value.dualState);
    });
    it("retains the early v6 result while v5 runs to the frozen 24000 cap", async () => {
        const value = await runUnifiedIntentD1Episode({ ...fixture(0, "rubble"), mode: "competitive" });
        if (value.kind !== "unified-intent-d1-competitive-v1") throw new Error("wrong projection");
        expect(value.updates).toBe(24000);
        expect(value.dualState.v6.firstResult?.tick).toBe(2);
        expect(value.dualState.v6.firstResult?.winner).toBe("candidate");
        expect(value.dualState.v5.firstResult?.status).toBe("tick_cap_draw");
        expect(value.publicState.snapshots).toBe(5);
    });
    it.each([0, 1, 2].flatMap(armIndex => (["canary_v5_reference", "canary_dual"] as const).map(mode => ({ armIndex, mode }))))("keeps $armIndex/$mode fixed-horizon and outcome-free", async ({ armIndex, mode }) => {
        const args = fixture(armIndex, "none");
        const value = await runUnifiedIntentD1Episode({ ...args, spec: { ...args.spec, maxUpdates: 3600 }, mode });
        expect(value.updates).toBe(3600);
        expect(value.publicState.snapshots).toBe(3601);
        const audit = (v: any): void => {
            if (!v || typeof v !== "object") return;
            for (const [key, child] of Object.entries(v)) {
                expect(key).not.toMatch(/winner|outcome|score|endpoint|defeated|terminal|building|inventory|credit|damage|rank/i);
                audit(child);
            }
        };
        audit(value);
        expect("ledger" in value).toBe(false);
    });
    it("fails technically on unexplained native finish instead of manufacturing a draw", async () => {
        await expect(runUnifiedIntentD1Episode({ ...fixture(0, "unexplained"), mode: "competitive" }))
            .rejects.toThrow(/technical failure/);
    });
    it("rejects unsupported horizons, arm drift, and mismatched starts before gameplay", async () => {
        const a = fixture();
        await expect(runUnifiedIntentD1Episode({ ...a, spec: { ...a.spec, maxUpdates: 90000 } as any,
            mode: "competitive" })).rejects.toThrow(/identity/);
        expect(a.api.createGame).not.toHaveBeenCalled();
        await expect(runUnifiedIntentD1Episode({ ...a, arm: { ...D1_ARMS[1], commandCeiling: 116 } as any,
            mode: "competitive" })).rejects.toThrow(/identity/);
        const b = fixture();
        await expect(runUnifiedIntentD1Episode({ ...b, spec: { ...b.spec, candidateStart: "9,9" },
            mode: "competitive" })).rejects.toThrow(/start/);
    });
});
