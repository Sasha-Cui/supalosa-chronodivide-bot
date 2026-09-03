import { describe, expect, it } from "vitest";
import { ObjectType } from "@chronodivide/game-api";
import {
    PublicActionAudit,
    PublicWorldTrajectory,
    installFreshDualStudyInstrumentation,
    normalizePublicValue,
    snapshotFreshDualPublicWorld,
} from "../training/freshDualStudyInstrumentation.js";

const actionMethods = [
    "placeBuilding", "sellObject", "sellBuilding", "toggleRepairWrench", "toggleAlliance",
    "pauseProduction", "resumeProduction", "queueForProduction", "unqueueFromProduction",
    "activateSuperWeapon", "orderUnits", "sayAll", "setGlobalDebugText", "setUnitDebugText",
    "quitGame",
];

const actions = () => {
    const calls: Array<{ method: string; args: unknown[] }> = [];
    const api: Record<string, (...args: unknown[]) => void> = {};
    for (const method of actionMethods) api[method] = (...args) => { calls.push({ method, args }); };
    return { api, calls };
};

const production = () => ({
    getQueueData: (type: number) => ({ size: 0, maxSize: 30, status: 0, type, items: [] }),
});

describe("fresh dual study instrumentation", () => {
    it("records identical public actions while suppressing quit only after start", () => {
        let tick = 0;
        const game = {
            getCurrentTick: () => tick,
            getUnitData: (id: number) => id === 91 ? ({
                id, owner: "Opponent", hitPoints: 0,
                rules: { name: "GACNST", type: ObjectType.Building },
            }) : undefined,
        };
        const observerEvents: unknown[] = [];
        const audit = new PublicActionAudit();
        const candidateActions = actions();
        const baselineActions = actions();
        const makeBot = (name: string, value: ReturnType<typeof actions>) => {
            const bot: any = {
                name,
                player: { actions: value.api },
                lastPlayerActions: null,
                lastPlayerProduction: null,
                onGameStart() {
                    this.lastPlayerActions = this.player.actions;
                    this.lastPlayerProduction = production();
                    this.player.actions.toggleAlliance("Nobody", false);
                },
                onGameEvent() {},
            };
            return bot;
        };
        const bots = {
            candidate: makeBot("Candidate", candidateActions),
            baseline: makeBot("Baseline", baselineActions),
        };
        installFreshDualStudyInstrumentation(bots, { observe: (event) => observerEvents.push(event) }, audit);
        bots.candidate.onGameStart(game as any);
        bots.baseline.onGameStart(game as any);
        tick = 30;
        (bots.candidate.player.actions as any).orderUnits([1, 2], 3, 91);
        (bots.candidate.player.actions as any).quitGame();
        (bots.baseline.player.actions as any).quitGame();
        const event = { type: 1, target: 9 };
        bots.candidate.onGameEvent(event as any);
        bots.baseline.onGameEvent(event as any);
        const summary = audit.finish();

        expect(candidateActions.calls.map((row) => row.method)).toEqual(["toggleAlliance", "orderUnits"]);
        expect(baselineActions.calls.map((row) => row.method)).toEqual(["toggleAlliance"]);
        expect(audit.quit).toEqual({
            mode: "symmetric_no_forwarding",
            attempts: { candidate: 1, baseline: 1 },
            forwarded: { candidate: 0, baseline: 0 },
        });
        expect(observerEvents).toEqual([event, event]);
        expect(summary.callCount).toBe(5);
        expect(summary.sha256).toMatch(/^[0-9a-f]{64}$/);
        const diagnostic = {
            tick: 30,
            side: "candidate",
            method: "orderUnits",
            targetId: 91,
            targetOwner: "Opponent",
            targetRulesName: "GACNST",
            targetType: ObjectType.Building,
            targetHitPoints: 0,
        };
        expect(summary.zeroHealthBuildingTargetRequests).toEqual({
            count: 1,
            first: diagnostic,
            last: diagnostic,
            bySideAndRulesName: { "candidate.GACNST": 1 },
        });
    });

    it("normalizes keys, special numbers, and cycles deterministically", () => {
        const value: any = { z: -0, b: Infinity, a: Number.NaN, _hidden: 2 };
        value.self = value;
        expect(normalizePublicValue(value)).toEqual({
            a: "[NaN]",
            b: "[Infinity]",
            self: "[circular]",
            z: 0,
        });
    });

    it("hashes deterministic public snapshots including queues and resources", () => {
        const unit = (id: number) => ({
            id,
            type: ObjectType.Building,
            name: "GAPOWR",
            rules: { name: "GAPOWR", type: ObjectType.Building },
            tile: {
                id: `tile-${id}`, rx: id, ry: id + 1, z: 0, terrainType: 0,
                landType: 0, onBridgeLandType: undefined, rampType: 0, occluded: false,
            },
            worldPosition: { x: id, y: id + 1, z: 0 },
            tileElevation: 0,
            foundation: { width: 2, height: 2 },
            owner: id === 1 ? "Candidate" : "Baseline",
            hitPoints: 100,
            maxHitPoints: 200,
            sight: 4,
            veteranLevel: 0,
            guardMode: false,
            purchaseValue: 800,
            isWarpedOut: false,
        });
        const prod = production() as any;
        const game: any = {
            getCurrentTick: () => 7,
            getPlayers: () => ["Baseline", "Candidate"],
            getPlayerData: (name: string) => ({
                name,
                country: { name: "Americans" },
                startLocation: { x: name === "Candidate" ? 1 : 2, y: 3 },
                isObserver: false,
                isAi: false,
                isCombatant: true,
                credits: 9000,
                power: { total: 100, drain: 50, isLowPower: false },
                radarDisabled: false,
            }),
            isPlayerDefeated: () => false,
            getAllUnits: () => [2, 1],
            getUnitData: unit,
            getAllTerrainObjects: () => [],
            getGameObjectData: () => undefined,
            getAllSuperWeaponData: () => [],
            map: {
                getAllTilesResourceData: () => [{
                    tile: { id: "b", rx: 2, ry: 2, z: 0 }, gems: 0, ore: 3, spawnsOre: false,
                }, {
                    tile: { id: "a", rx: 1, ry: 1, z: 0 }, gems: 1, ore: 0, spawnsOre: false,
                }],
            },
        };
        const bots: any = {
            candidate: { lastPlayerProduction: prod },
            baseline: { lastPlayerProduction: prod },
        };
        const first = snapshotFreshDualPublicWorld(game, bots);
        const second = snapshotFreshDualPublicWorld(game, bots);
        expect(first).toEqual(second);
        expect((first as any).players.map((row: any) => row.name)).toEqual(["Baseline", "Candidate"]);
        expect((first as any).units.map((row: any) => row.id)).toEqual([1, 2]);
        expect((first as any).resources.map((row: any) => row.tile.id)).toEqual(["a", "b"]);

        const a = new PublicWorldTrajectory();
        const b = new PublicWorldTrajectory();
        a.observe(first);
        b.observe(second);
        expect(a.finish()).toEqual(b.finish());
    });
});
