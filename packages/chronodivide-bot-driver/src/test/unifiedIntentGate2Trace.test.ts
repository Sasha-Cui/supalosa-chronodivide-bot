import { describe, expect, it } from "vitest";
import {
    installUnifiedIntentGate2ActionTrace,
    snapshotUnifiedIntentGate2PublicState,
    UnifiedIntentGate2ActionTrace,
    UnifiedIntentGate2Trajectory,
} from "../training/unifiedIntentGate2Trace.js";
import { FRESH_DUAL_ACTION_METHODS } from "../training/freshDualStudyInstrumentation.js";

const actions = () => {
    const calls: Array<{ method: string; args: unknown[] }> = [];
    const api: Record<string, (...args: unknown[]) => unknown> = {};
    for (const method of FRESH_DUAL_ACTION_METHODS) {
        api[method] = (...args: unknown[]) => {
            calls.push({ method, args });
            return method;
        };
    }
    return { api, calls };
};

const bot = (name: string, actionValue: ReturnType<typeof actions>, production: any) => {
    const value: any = {
        name,
        player: { actions: actionValue.api },
        lastPlayerActions: null,
        lastPlayerProduction: null,
        onGameStart() {
            value.lastPlayerActions = actionValue.api;
            value.lastPlayerProduction = production;
        },
    };
    return value;
};

const production = () => ({
    getQueueData: (type: number) => ({
        type,
        size: type === 3 ? 1 : 0,
        maxSize: 30,
        status: type === 3 ? 1 : 0,
        items: type === 3 ? [{
            rules: { name: "MTNK", type: 7 },
            quantity: 2,
        }] : [],
    }),
});

const game = () => {
    const players: Record<string, any> = {
        candidate: {
            name: "candidate",
            country: { name: "Americans" },
            startLocation: { x: 1, y: 2 },
            credits: 10_000,
            power: { total: 100, drain: 50, isLowPower: false },
            radarDisabled: false,
        },
        opponent: {
            name: "opponent",
            country: { name: "Americans" },
            startLocation: { x: 9, y: 8 },
            credits: 9_000,
            power: { total: 80, drain: 40, isLowPower: false },
            radarDisabled: true,
        },
    };
    const units: Record<number, any> = {
        1: {
            id: 1,
            owner: "candidate",
            name: "E1",
            type: 2,
            rules: { name: "E1", type: 2 },
            tile: { id: "1,2", rx: 1, ry: 2, z: 0 },
            hitPoints: 100,
            maxHitPoints: 100,
            isWarpedOut: false,
        },
        2: {
            id: 2,
            owner: "opponent",
            name: "E1",
            type: 2,
            rules: { name: "E1", type: 2 },
            tile: { id: "9,8", rx: 9, ry: 8, z: 0 },
            hitPoints: 90,
            maxHitPoints: 100,
            isWarpedOut: false,
        },
    };
    return {
        getCurrentTick: () => 0,
        getPlayerData: (name: string) => players[name],
        getVisibleUnits: (name: string, relation: string) =>
            relation === "self"
                ? name === "candidate" ? [1] : [2]
                : name === "candidate" ? [2] : [1],
        getUnitData: (id: number) => units[id],
    } as any;
};

describe("unified intent Gate 2 technical trace", () => {
    it("hashes and forwards every action including quit", () => {
        const candidateActions = actions();
        const opponentActions = actions();
        const candidate = bot("candidate", candidateActions, production());
        const opponent = bot("opponent", opponentActions, production());
        const view = game();
        const trace = new UnifiedIntentGate2ActionTrace();
        installUnifiedIntentGate2ActionTrace({ candidate, opponent }, trace);
        candidate.onGameStart(view);
        opponent.onGameStart(view);

        expect(candidate.player.actions.orderUnits([1], 4, 3, 4)).toBe("orderUnits");
        expect(candidate.player.actions.quitGame()).toBe("quitGame");
        expect(opponent.player.actions.queueForProduction(3, "MTNK", 7, 1))
            .toBe("queueForProduction");
        const summary = trace.finish();

        expect(candidateActions.calls.map((value) => value.method))
            .toEqual(["orderUnits", "quitGame"]);
        expect(opponentActions.calls.map((value) => value.method))
            .toEqual(["queueForProduction"]);
        expect(summary.candidate).toMatchObject({
            calls: 2,
            byMethod: { orderUnits: 1, quitGame: 1 },
        });
        expect(summary.opponent).toMatchObject({
            calls: 1,
            byMethod: { queueForProduction: 1 },
        });
        expect(summary.candidate.sha256).not.toBe(summary.opponent.sha256);
    });

    it("captures deterministic public player, queue, and unit state", () => {
        const candidateActions = actions();
        const opponentActions = actions();
        const candidate = bot("candidate", candidateActions, production());
        const opponent = bot("opponent", opponentActions, production());
        candidate.onGameStart();
        opponent.onGameStart();
        const value: any = snapshotUnifiedIntentGate2PublicState(
            game(),
            { candidate, opponent },
        );
        expect(value.update).toBe(0);
        expect(value.candidate).toMatchObject({
            side: "candidate",
            country: "Americans",
            startLocation: { x: 1, y: 2 },
            credits: 10_000,
            ownUnits: [{ id: 1, owner: "candidate" }],
            visibleEnemyUnits: [{ id: 2, owner: "opponent" }],
        });
        expect(value.candidate.queues).toHaveLength(6);
        expect(value.candidate.queues[3]).toMatchObject({
            type: 3,
            size: 1,
            items: [{ rulesName: "MTNK", quantity: 2 }],
        });
    });

    it("makes full snapshot order part of the trajectory hash", () => {
        const first = new UnifiedIntentGate2Trajectory();
        first.observe({ update: 0 });
        first.observe({ update: 900 });
        const second = new UnifiedIntentGate2Trajectory();
        second.observe({ update: 900 });
        second.observe({ update: 0 });
        const a = first.finish();
        const b = second.finish();
        expect(a.snapshots).toHaveLength(2);
        expect(a.sha256).not.toBe(b.sha256);
    });
});
