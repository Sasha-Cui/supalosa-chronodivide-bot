import { describe, expect, it } from "vitest";
import {
    ACTION_BURST_ARGUMENT_LIMIT_BYTES,
    TimestampedActionAudit,
    installTimestampedActionAudit,
    rejectActionBurstProhibitedFields,
} from "../training/timestampedActionAudit.js";
import { FRESH_DUAL_ACTION_METHODS } from "../training/freshDualStudyInstrumentation.js";

const actions = () => {
    const calls: Array<{ method: string; args: unknown[] }> = [];
    const api: Record<string, any> = { receiver: "physical" };
    for (const method of FRESH_DUAL_ACTION_METHODS) {
        api[method] = function (...args: unknown[]) {
            expect(this).toBe(api);
            calls.push({ method, args });
            return method;
        };
    }
    return { api, calls };
};

const bot = (name: string, value: ReturnType<typeof actions>): any => ({
    name,
    player: { actions: value.api, production: {} },
    lastGameApi: null,
    lastPlayerActions: null,
    lastPlayerProduction: null,
    onGameStart(game: unknown) {
        this.lastGameApi = game;
        this.lastPlayerActions = this.player.actions;
        this.lastPlayerProduction = this.player.production;
    },
    onGameTick() {},
    onGameEvent() {},
});

describe("timestamped action audit", () => {
    it("wraps both sides, preserves receivers, and suppresses quit only", () => {
        let update = 12;
        const game = {
            getCurrentTick: () => update,
            getGameObjectData: (id: number) => id === 99 ? { id } : undefined,
        };
        const candidateActions = actions();
        const baselineActions = actions();
        const bots = {
            candidate: bot("Candidate", candidateActions),
            baseline: bot("Baseline", baselineActions),
        } as any;
        const audit = new TimestampedActionAudit();
        installTimestampedActionAudit(bots, audit);
        bots.candidate.onGameStart(game);
        bots.baseline.onGameStart(game);
        audit.setUpdate(12);

        expect(bots.candidate.player.actions.orderUnits([3, 1], 7, 99)).toBe("orderUnits");
        update = 13;
        audit.setUpdate(13);
        expect(bots.baseline.player.actions.orderUnits([4], "Move", { x: 2, y: 3 })).toBe("orderUnits");
        expect(bots.candidate.player.actions.quitGame()).toBeUndefined();
        const value = audit.finish();

        expect(candidateActions.calls.map((row) => row.method)).toEqual(["orderUnits"]);
        expect(baselineActions.calls.map((row) => row.method)).toEqual(["orderUnits"]);
        expect(value.summary.suppressedQuitAttempts).toEqual({ candidate: 1, baseline: 0 });
        expect(value.summary.eventCount).toBe(3);
        expect(value.summary.traceSha256).toMatch(/^[0-9a-f]{64}$/);
        expect(value.events[0]).toMatchObject({
            update: 12,
            side: "candidate",
            method: "orderUnits",
            actionClass: "order",
            forwarded: true,
            order: {
                unitCount: 2,
                orderType: 7,
                overload: "object_target",
                targetAvailable: true,
            },
        });
        expect(value.events[1]).toMatchObject({
            update: 13,
            side: "baseline",
            order: {
                overload: "tile_target",
                targetAvailable: true,
            },
        });
        expect(value.events[2]).toMatchObject({
            method: "quitGame",
            actionClass: "suppressed_quit",
            forwarded: false,
            order: null,
        });
        rejectActionBurstProhibitedFields(value);
    });

    it("is deterministic for identical action streams", () => {
        const run = () => {
            const game = {
                getCurrentTick: () => 4,
                getGameObjectData: () => undefined,
            };
            const audit = new TimestampedActionAudit();
            const candidate = actions();
            const baseline = actions();
            audit.install("candidate", candidate.api as any, game as any);
            audit.install("baseline", baseline.api as any, game as any);
            audit.setUpdate(4);
            candidate.api.orderUnits([2, 1], 3, 404);
            baseline.api.queueForProduction(2, "E1");
            return audit.finish();
        };
        expect(run()).toEqual(run());
    });

    it("rejects oversized arguments before forwarding", () => {
        const game = { getCurrentTick: () => 0, getGameObjectData: () => undefined };
        const audit = new TimestampedActionAudit();
        const candidate = actions();
        const baseline = actions();
        audit.install("candidate", candidate.api as any, game as any);
        audit.install("baseline", baseline.api as any, game as any);
        expect(() => candidate.api.sayAll("x".repeat(ACTION_BURST_ARGUMENT_LIMIT_BYTES + 1)))
            .toThrow(/exceed 64 KiB/);
        expect(candidate.calls).toEqual([]);
    });

    it("rejects missing methods, invalid overloads, and post-finalization calls", () => {
        const game = { getCurrentTick: () => 0, getGameObjectData: () => undefined };
        const incomplete = actions();
        delete incomplete.api.orderUnits;
        expect(() => new TimestampedActionAudit().install(
            "candidate", incomplete.api as any, game as any,
        )).toThrow(/method missing/);

        const audit = new TimestampedActionAudit();
        const candidate = actions();
        const baseline = actions();
        audit.install("candidate", candidate.api as any, game as any);
        audit.install("baseline", baseline.api as any, game as any);
        expect(() => candidate.api.orderUnits([1], 2, { nope: true }))
            .toThrow(/target overload/);
        expect(() => audit.setUpdate(0)).toThrow(/logical update/);
        audit.setUpdate(3_600);
        expect(() => audit.setUpdate(3_599)).toThrow(/logical update/);
        audit.finish();
        expect(() => audit.setUpdate(3_600)).toThrow(/logical update/);
        expect(() => baseline.api.sayAll("late")).toThrow(/after finalization/);
    });

    it("recursively rejects prohibited scientific fields", () => {
        for (const key of [
            "winner", "outcomeCode", "score", "endpointVersion", "defeatedSide",
            "gameFinished", "terminalBuilding", "remainingBuilding",
            "buildingCount", "ranking",
        ]) {
            expect(() => rejectActionBurstProhibitedFields({ safe: [{ [key]: 1 }] }))
                .toThrow(/Prohibited action-burst field/);
        }
        expect(() => rejectActionBurstProhibitedFields({
            update: 1,
            traceSha256: "a",
            targetAvailable: false,
        })).not.toThrow();
    });
});
