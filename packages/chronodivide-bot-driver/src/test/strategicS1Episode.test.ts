import { describe, it, expect, vi } from "vitest";
import { ApiEventType, ObjectType } from "@chronodivide/game-api";
import {
    runStrategicS1Episode,
    S1EpisodeMode,
    assertS1ArtifactBytes,
    S1_MAX_ARTIFACT_BYTES,
} from "../training/strategicS1Episode.js";
import { runUnifiedIntentD1Episode } from "../training/unifiedIntentD1Episode.js";
import { D1_ARMS } from "../training/unifiedIntentD1Plan.js";
import { FRESH_DUAL_ACTION_METHODS } from "../training/freshDualStudyInstrumentation.js";
import { replayS1Ledger } from "../training/strategicS1Ledger.js";
import { S1ActionWindows } from "../training/strategicS1Observation.js";
import { verifyEmbeddedFreshDualLedger } from "../training/embeddedFreshDualLedger.js";

vi.mock("../benchmark/seededOfflineGame.js", () => ({
    withSeededOfflineGame: async (api: any, options: any, seed: number, bindings: any[], body: any) => {
        expect(Number.isSafeInteger(seed)).toBe(true);
        expect(bindings.map((b: any) => b.identity)).toEqual(["candidate", "opponent"]);
        const instance = await api.createGame(options);
        try {
            return await body(instance);
        } finally {
            instance.dispose();
        }
    },
}));
type EventMode = "destroy" | "rubble" | "none" | "unexplained";
const fixture = (mode: S1EpisodeMode = "diagnostic", eventMode: EventMode = "destroy", slot: 0 | 1 = 0) => {
    let tick = 0,
        nativeFinished = false,
        disposed = false;
    const names = { candidate: "OD1Candidate", baseline: "OD1Opponent" };
    const weapon = { type: 0, rules: { name: "Cannon" }, minRange: 0, maxRange: 6, speed: 20, cooldownTicks: 0 };
    const make = (id: number, owner: string, type: number, name: string) => ({
        id,
        owner,
        type,
        name,
        hitPoints: 100,
        maxHitPoints: 100,
        rules: { name, type, primary: type === 7 ? "Cannon" : undefined, secondary: undefined },
        tile: { id: String(id), rx: id, ry: 2, z: 0, terrainType: 0, landType: 0, rampType: 0, occluded: false },
        foundation: { width: 1, height: 1 },
        purchaseValue: 700,
        canMove: type === 7,
        isIdle: type === 7,
        primaryWeapon: type === 7 ? weapon : undefined,
        buildStatus: type === 2 ? 1 : undefined,
        isPoweredOn: type === 2 ? true : undefined,
    });
    let units: any[] = [
        make(1, names.candidate, 2, "GACNST"),
        make(2, names.baseline, 2, "NACNST"),
        ...Array.from({ length: 8 }, (_, i) => make(10 + i, names.candidate, 7, "MTNK")),
    ];
    const checked = <T>(value: T) => {
        if (disposed) throw new Error("API read after disposal");
        return value;
    };
    const game: any = {
        getCurrentTick: () => checked(tick),
        getAllUnits: () => checked(units.map((u) => u.id)),
        getUnitData: (id: number) => checked(units.find((u) => u.id === id)),
        getGameObjectData: (id: number) => checked(units.find((u) => u.id === id)),
        getVisibleUnits: (name: string, _visibility: string, filter?: (rules: any) => boolean) =>
            checked(
                units
                    .filter((u) => u.owner === name && u.hitPoints > 0 && (!filter || filter(u.rules)))
                    .map((u) => u.id),
            ),
        getPlayers: () => Object.values(names),
        getPlayerData: (name: string) =>
            checked({
                name,
                country: { name: "Americans" },
                startLocation: name === names.candidate ? { x: 1, y: 2 } : { x: 3, y: 4 },
                credits: 3000,
                power: { total: 100, drain: 50, isLowPower: false },
                isObserver: false,
                isAi: true,
                isCombatant: true,
                radarDisabled: false,
            }),
        isPlayerDefeated: () => checked(false),
        getAllTerrainObjects: () => [],
        getAllSuperWeaponData: () => [],
        map: { getAllTilesResourceData: () => [] },
    };
    const bot = (name: string): any => {
        const originals: any = Object.fromEntries(FRESH_DUAL_ACTION_METHODS.map((k) => [k, vi.fn()]));
        const actions = { ...originals };
        const production = {
            getQueueData: (type: number) => checked({ type, status: 0, size: 0, maxSize: 99, items: [] }),
        };
        const mission = {};
        return {
            name,
            player: { actions },
            originals,
            lastGameApi: null,
            lastPlayerActions: null,
            lastPlayerProduction: null,
            lastUnifiedIntentTelemetry: null,
            getResearchMissionSnapshot: vi.fn(() => [
                {
                    handle: mission,
                    name: "attack",
                    type: "AttackMission",
                    active: true,
                    priority: 10,
                    unitIds: Array.from({ length: 8 }, (_, i) => 10 + i),
                },
            ]),
            onGameStart(api: any) {
                this.lastGameApi = api;
                this.lastPlayerActions = actions;
                this.lastPlayerProduction = production;
                actions.queueForProduction(3, "MTNK", 1);
            },
            onGameEvent: vi.fn(),
        };
    };
    const candidate = bot(names.candidate),
        opponent = bot(names.baseline);
    const canary = mode.startsWith("canary"),
        caseIndex = canary ? 200 : mode === "smoke" ? 204 : 0;
    const config = { clockJump: false, enabledTelemetry: false, quit: true };
    const api = {
        createGame: vi.fn(async (options: any) => {
            expect(options).toEqual({
                online: false,
                agents: slot === 0 ? [candidate, opponent] : [opponent, candidate],
                mapName: "synthetic",
                gameMode: 1,
                shortGame: false,
                mcvRepacks: true,
                cratesAppear: false,
                superWeapons: false,
                gameSpeed: 6,
                credits: 10000,
                unitCount: 0,
                buildOffAlly: false,
                multiEngineer: false,
            });
            for (const agent of options.agents) agent.onGameStart(game);
            return {
                isFinished: () => nativeFinished,
                dispose: () => {
                    disposed = true;
                },
                update: async () => {
                    tick += config.clockJump ? 2 : 1;
                    if (config.enabledTelemetry) candidate.lastUnifiedIntentTelemetry = {};
                    candidate.lastPlayerActions.orderUnits([10], 0, 12, 13);
                    if (tick === 2 && config.quit) {
                        candidate.lastPlayerActions.quitGame();
                        opponent.lastPlayerActions.quitGame();
                    }
                    if (tick === 2 && (eventMode === "destroy" || eventMode === "rubble")) {
                        const e = {
                            type: ApiEventType.ObjectDestroy,
                            target: 2,
                            attackerInfo: { playerName: names.candidate, objId: 10, weaponName: "Cannon" },
                        };
                        candidate.onGameEvent(e);
                        opponent.onGameEvent(e);
                        units =
                            eventMode === "destroy"
                                ? units.filter((u) => u.id !== 2)
                                : units.map((u) => (u.id === 2 ? { ...u, hitPoints: 0 } : u));
                    }
                    if (tick === 2 && eventMode === "unexplained") nativeFinished = true;
                },
            };
        }),
    };
    return {
        api,
        candidate,
        opponent,
        config,
        game,
        mode,
        spec: {
            caseIndex,
            country: "Americans" as const,
            mapName: "synthetic",
            gameMode: 1,
            candidateSlot: slot,
            candidateStart: "1,2",
            opponentStart: "3,4",
            candidateStartOrdinal: 0,
            opponentStartOrdinal: 1,
            requestedEngineSeed: canary ? 3350121000 : mode === "smoke" ? 3350121100 : 3350120000,
            maxUpdates: canary ? (3600 as const) : (24000 as const),
        },
    };
};
function diagnostic(value: Awaited<ReturnType<typeof runStrategicS1Episode>>) {
    if (value.kind !== "strategic-s1-diagnostic-v1") throw new Error("wrong projection");
    return value;
}
describe("S1 episode lifecycle and technical projections (fake game only)", () => {
    it.each([0, 1] as const)("preserves the entire disabled D1 payload for slot=%s", async (slot) => {
        const legacy = await runUnifiedIntentD1Episode({
            ...fixture("diagnostic", "destroy", slot),
            mode: "competitive",
            arm: D1_ARMS[0],
        });
        const current = diagnostic(await runStrategicS1Episode(fixture("diagnostic", "destroy", slot)));
        for (const k of [
            "updates",
            "requestedEngineSeed",
            "observedStarts",
            "quitSuppression",
            "publicCall",
            "publicState",
            "stopReason",
            "dualState",
            "actionAudit",
            "ledger",
        ] as const) {
            expect(current[k]).toEqual((legacy as any)[k]);
        }
    });
    it("captures startup once, final before disposal, both ledger replays and deduplicated events", async () => {
        const f = fixture(),
            initialStart = f.candidate.onGameStart,
            initialEvent = f.candidate.onGameEvent;
        const result = diagnostic(await runStrategicS1Episode(f));
        const strategic = replayS1Ledger(result.strategicLedger);
        expect(strategic.samples.map((s) => s.tick)).toEqual([0, 2]);
        expect(strategic.samples[0].window.calls).toBe(2);
        expect(strategic.samples[1].window.events).toHaveLength(1);
        expect(strategic.final.publicCalls).toEqual(result.publicCall);
        expect((await verifyEmbeddedFreshDualLedger(result.ledger)).final?.dualState).toEqual(result.dualState);
        expect(f.candidate.onGameStart).toBe(initialStart);
        expect(f.candidate.onGameEvent).toBe(initialEvent);
        expect(f.candidate.originals.quitGame).not.toHaveBeenCalled();
        expect(f.opponent.originals.quitGame).not.toHaveBeenCalled();
        expect(result.quitSuppression.attempts).toEqual({ candidate: 1, baseline: 1 });
    });
    it("keeps immutable distinct v5/v6 first results and 81 samples at the frozen cap", async () => {
        const r = diagnostic(await runStrategicS1Episode(fixture("diagnostic", "rubble")));
        expect(r.updates).toBe(24000);
        expect(r.dualState.v6.firstResult?.tick).toBe(2);
        expect(r.dualState.v5.firstResult?.status).toBe("tick_cap_draw");
        const s = replayS1Ledger(r.strategicLedger);
        expect(s.samples).toHaveLength(81);
        expect(s.samples[80].tick).toBe(24000);
        expect(s.samples[80].periodic).toBe(true);
        expect(r.publicState.snapshots).toBe(5);
    });
    it.each(["none", "destroy"] as const)("proves complete canary instrumentation equality with %s", async (event) => {
        const a = fixture("canary_endpoint_only", event),
            b = fixture("canary_strategic", event);
        const left = await runStrategicS1Episode(a),
            right = await runStrategicS1Episode(b);
        expect(left.kind).toBe("strategic-s1-canary-v1");
        expect(right.kind).toBe("strategic-s1-canary-v1");
        if (left.kind !== "strategic-s1-canary-v1" || right.kind !== "strategic-s1-canary-v1") throw new Error("kind");
        for (const key of ["updates", "quitSuppression", "publicCall", "publicState", "dualTrace"] as const) {
            expect(left[key]).toEqual(right[key]);
        }
        expect(right.updates).toBe(3600);
        expect(right.publicState.snapshots).toBe(3601);
        expect(right.dualTrace.snapshots).toBe(3601);
        expect(right.strategic?.samples).toBe(13);
        expect(right.strategic?.payloadDiscarded).toBe(true);
        expect(left.strategic).toBe(null);
        expect(a.candidate.getResearchMissionSnapshot).not.toHaveBeenCalled();
        expect(b.candidate.getResearchMissionSnapshot).toHaveBeenCalledTimes(13);
        for (const value of [left, right])
            expect(JSON.stringify(value)).not.toMatch(
                /"(winner|firstResult|evaluation|ledger|data|missions|credits|screens|actionAudit)":/,
            );
    });
    it("smoke replays and then discards both payloads without outcome/diagnostic leakage", async () => {
        const r = await runStrategicS1Episode(fixture("smoke"));
        expect(r.kind).toBe("strategic-s1-smoke-technical-v1");
        if (r.kind !== "strategic-s1-smoke-technical-v1") throw new Error("kind");
        expect(r.endpointReplayPass && r.strategicReplayPass && r.payloadDiscarded).toBe(true);
        expect(r.endpointStorage.gzipBytes).toBeGreaterThan(0);
        expect(r.strategicStorage.gzipBytes).toBeGreaterThan(0);
        expect(JSON.stringify(r)).not.toMatch(
            /"(winner|updates|firstResult|evaluation|ledger|data|missions|credits|screens|actionAudit|publicCall|stopReason)":/,
        );
    });
    it("rejects case/seed/horizon/name/country/mode drift before creating a game", async () => {
        for (const change of [
            (f: any) => (f.spec.caseIndex = 204),
            (f: any) => f.spec.requestedEngineSeed++,
            (f: any) => (f.spec.maxUpdates = 90000),
            (f: any) => (f.spec.gameMode = 0),
            (f: any) => (f.spec.country = "Russians"),
            (f: any) => (f.spec.candidateSlot = 2),
            (f: any) => (f.spec.opponentStartOrdinal = 0),
            (f: any) => (f.candidate.name = "Candidate"),
            (f: any) => (f.mode = "competitive"),
            (f: any) => (f.candidate.lastUnifiedIntentTelemetry = {}),
        ]) {
            const f = fixture();
            change(f);
            await expect(runStrategicS1Episode(f)).rejects.toThrow(/identity/);
            expect(f.api.createGame).not.toHaveBeenCalled();
        }
    });
    it("rejects effective start/country and missing public API at initialization", async () => {
        const a = fixture();
        a.spec.candidateStart = "9,9";
        await expect(runStrategicS1Episode(a)).rejects.toThrow(/start/);
        const b = fixture();
        b.spec.country = "Africans" as any;
        await expect(runStrategicS1Episode(b)).rejects.toThrow(/country/);
        const c = fixture();
        c.candidate.onGameStart = () => undefined;
        await expect(runStrategicS1Episode(c)).rejects.toThrow(/retained/);
    });
    it("fails on telemetry, update-clock or native termination drift", async () => {
        const a = fixture();
        a.config.enabledTelemetry = true;
        await expect(runStrategicS1Episode(a)).rejects.toThrow(/arbiter telemetry/);
        const b = fixture();
        b.config.clockJump = true;
        await expect(runStrategicS1Episode(b)).rejects.toThrow(/clock/);
        await expect(runStrategicS1Episode(fixture("diagnostic", "unexplained"))).rejects.toThrow(/technical failure/);
        await expect(runStrategicS1Episode(fixture("canary_strategic", "unexplained"))).rejects.toThrow(
            /technical failure|canary/,
        );
    });
    it("restores strategic action wrappers even when startup fails before the body", async () => {
        const f = fixture(),
            wrappers: any[] = [];
        const original = S1ActionWindows.prototype.install;
        const spy = vi.spyOn(S1ActionWindows.prototype, "install").mockImplementation(function (
            this: S1ActionWindows,
            side,
            actions,
            game,
        ) {
            wrappers.push({ actions, prior: actions.orderUnits });
            return original.call(this, side, actions, game);
        });
        const fail = () => {
            throw new Error("synthetic startup failure");
        };
        f.candidate.onGameStart = fail;
        try {
            await expect(runStrategicS1Episode(f)).rejects.toThrow(/synthetic startup/);
            expect(f.candidate.onGameStart).toBe(fail);
            expect(wrappers).toHaveLength(1);
            expect(wrappers[0].actions.orderUnits).toBe(wrappers[0].prior);
        } finally {
            spy.mockRestore();
        }
    });
    it("does not consume policy randomness in passive observation", async () => {
        const spy = vi.spyOn(Math, "random");
        try {
            await runStrategicS1Episode(fixture());
            expect(spy).not.toHaveBeenCalled();
        } finally {
            spy.mockRestore();
        }
    });
    it("fails rather than truncates the combined artifact bound", () => {
        expect(assertS1ArtifactBytes({ a: 1 })).toBe(8);
        expect(() => assertS1ArtifactBytes({ payload: "x".repeat(S1_MAX_ARTIFACT_BYTES) })).toThrow(/byte bound/);
    });
});
