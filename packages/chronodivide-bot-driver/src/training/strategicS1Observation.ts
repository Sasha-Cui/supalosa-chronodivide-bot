import {
    ActionsApi,
    GameApi,
    ProductionApi,
    OrderType,
    QueueType,
    QueueStatus,
    BuildStatus,
    ObjectType,
    WeaponType,
} from "@chronodivide/game-api";
import { FRESH_DUAL_ACTION_METHODS } from "./freshDualStudyInstrumentation.js";
import { EndpointEvent } from "./literalBuildingEliminationEndpoint.js";
export type S1Side = "candidate" | "baseline";
export const S1_SIDES = ["candidate", "baseline"] as const;
export const S1_ENUMS = {
    order: [
        "Move",
        "ForceMove",
        "Attack",
        "ForceAttack",
        "AttackMove",
        "Guard",
        "GuardArea",
        "Capture",
        "Occupy",
        "Deploy",
        "DeploySelected",
        "Stop",
        "Cheer",
        "Dock",
        "Gather",
        "Repair",
        "Scatter",
        "EnterTransport",
        "PlaceBomb",
    ],
    queue: ["Structures", "Armory", "Infantry", "Vehicles", "Aircrafts", "Ships"],
    queueStatus: ["Idle", "Active", "OnHold", "Ready"],
    build: ["BuildUp", "Ready", "BuildDown"],
    weapon: ["Primary", "Secondary", "DeathWeapon"],
    object: [
        "None",
        "Aircraft",
        "Building",
        "Infantry",
        "Overlay",
        "Smudge",
        "Terrain",
        "Vehicle",
        "Animation",
        "Projectile",
        "VoxelAnim",
        "Debris",
    ],
} as const;
export const assertS1ApiEnums = () => {
    for (const [key, api] of [
        ["order", OrderType],
        ["queue", QueueType],
        ["queueStatus", QueueStatus],
        ["build", BuildStatus],
        ["object", ObjectType],
        ["weapon", WeaponType],
    ] as const) {
        const names = Object.values(api).filter((v) => typeof v === "string");
        if (
            JSON.stringify(names) !== JSON.stringify(S1_ENUMS[key]) ||
            S1_ENUMS[key].some((name, i) => (api as any)[name] !== i)
        )
            throw new Error("S1 public enum drift: " + key);
    }
};
function fail(s: string): never {
    throw new Error("S1 " + s);
}
export const finite = (x: unknown): number =>
    typeof x === "number" && Number.isFinite(x) ? x : fail("nonfinite number");
export const natural = (x: unknown): number =>
    Number.isSafeInteger(x) && Number(x) >= 0 ? Number(x) : fail("invalid count");
const text = (x: unknown): string => (typeof x === "string" && x.length > 0 ? x : fail("missing string"));
const boolean = (x: unknown): boolean => (typeof x === "boolean" ? x : fail("invalid boolean"));
const optional = <T>(x: unknown, check: (v: unknown) => T): T | null =>
    x === undefined || x === null ? null : check(x);
const enumNumber = (kind: keyof typeof S1_ENUMS, x: unknown): number => {
    const n = natural(x);
    if (n >= S1_ENUMS[kind].length) fail("unknown " + kind);
    return n;
};
const ordered = (value: Record<string, number>) =>
    Object.fromEntries(Object.entries(value).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
const increment = (map: Record<string, number>, key: string, n = 1) => {
    map[key] = natural((map[key] ?? 0) + n);
};
export type S1Weapon = {
    type: number;
    rulesName: string;
    minRange: number;
    maxRange: number;
    speed: number;
    cooldownTicks: number;
};
const weapon = (w: any): S1Weapon | null =>
    w === undefined || w === null
        ? null
        : {
              type: enumNumber("weapon", w.type),
              rulesName: text(w.rules?.name),
              minRange: finite(w.minRange),
              maxRange: finite(w.maxRange),
              speed: finite(w.speed),
              cooldownTicks: finite(w.cooldownTicks),
          };
export type S1Unit = {
    id: number;
    side: S1Side;
    owner: string;
    rulesName: string;
    type: number;
    x: number;
    y: number;
    health: number;
    maxHealth: number | null;
    purchaseValue: number | null;
    canMove: boolean | null;
    isIdle: boolean | null;
    buildStatus: number | null;
    isPoweredOn: boolean | null;
    primaryWeapon: S1Weapon | null;
    secondaryWeapon: S1Weapon | null;
    weaponRulesObserved: boolean;
    primaryRule: string | null;
    secondaryRule: string | null;
};
export type S1Queue = {
    type: number;
    status: number;
    size: number;
    maxSize: number;
    items: Array<{ rulesName: string; rulesType: number; quantity: number }>;
};
export type S1Player = {
    name: string;
    country: string;
    credits: number;
    power: { total: number; drain: number; isLowPower: boolean };
    defeated: boolean;
    queues: S1Queue[];
};
export type S1Mission = {
    id: number;
    name: string;
    type: string;
    priority: number;
    active: boolean;
    unitIds: number[];
    firstObservedTick: number;
    sampledAgeLowerBound: number;
};
export type S1MissionRead = {
    handle: object;
    name: string;
    type: string;
    priority: number;
    active: boolean;
    unitIds: number[];
};
export type S1ActionWindow = {
    afterTick: number;
    throughTick: number;
    calls: number;
    bySideAndMethod: Record<string, number>;
    bySideAndOrder: Record<string, number>;
    bySideAndTarget: Record<string, number>;
    requestedUnitIdOccurrences: Record<S1Side, number>;
    events: Array<{ tick: number; event: EndpointEvent }>;
};
export type S1Sample = {
    kind: "strategic-s1-sample-v1";
    tick: number;
    periodic: boolean;
    players: Record<S1Side, S1Player>;
    units: S1Unit[];
    unitCoverage: { allIds: number; otherOwner: number; nonLive: number };
    missions: S1Mission[];
    window: S1ActionWindow;
};

/** Counting wrapper around PUBLIC ActionsApi. Arguments and this/return identity are forwarded untouched. */
export class S1ActionWindows {
    private calls = 0;
    private byMethod: Record<string, number> = {};
    private byOrder: Record<string, number> = {};
    private byTarget: Record<string, number> = {};
    private requested = { candidate: 0, baseline: 0 };
    private events: S1ActionWindow["events"] = [];
    private seenEvents = new Set<string>();
    private installed = new Set<S1Side>();
    private restore: Array<() => void> = [];
    private lastSample = -1;
    private lastObservedTick = 0;
    private finished = false;
    readonly totalBySideAndMethod: Record<string, number> = {};
    constructor(private readonly names: Record<S1Side, string>) {
        assertS1ApiEnums();
        if (names.candidate === names.baseline) fail("same combatants");
    }
    install(side: S1Side, actions: ActionsApi, game: GameApi): void {
        if (!S1_SIDES.includes(side) || this.finished || this.installed.has(side))
            fail("duplicate or closed action installation");
        this.installed.add(side);
        for (const method of FRESH_DUAL_ACTION_METHODS) {
            const api = actions as unknown as Record<string, any>,
                original = api[method];
            if (typeof original !== "function") fail("missing public action method");
            const descriptor = Object.getOwnPropertyDescriptor(api, method),
                observer = this;
            const wrapped = function (this: unknown, ...args: unknown[]) {
                observer.record(side, method, args, game);
                return Reflect.apply(original, this, args);
            };
            Object.defineProperty(api, method, {
                configurable: true,
                writable: true,
                enumerable: descriptor?.enumerable ?? false,
                value: wrapped,
            });
            this.restore.push(() => {
                if (api[method] !== wrapped) fail("action wrapper ownership drift");
                if (descriptor) Object.defineProperty(api, method, descriptor);
                else delete api[method];
            });
        }
    }
    private record(side: S1Side, method: string, args: unknown[], game: GameApi): void {
        const tick = natural(game.getCurrentTick());
        if (this.finished || tick <= this.lastSample || tick < this.lastObservedTick)
            fail("action clock or closed observer");
        this.lastObservedTick = tick;
        this.calls++;
        increment(this.byMethod, side + "." + method);
        increment(this.totalBySideAndMethod, side + "." + method);
        if (method !== "orderUnits") return;
        if (!Array.isArray(args[0]) || !args[0].every((x) => Number.isSafeInteger(x) && x >= 0)) fail("order unit IDs");
        const order = enumNumber("order", args[1]);
        increment(this.byOrder, side + "." + S1_ENUMS.order[order]);
        this.requested[side] = natural(this.requested[side] + args[0].length);
        let category: string;
        if (args.length === 2) category = "none";
        else if (args.length === 3) {
            const target = natural(args[2]),
                object = game.getGameObjectData(target);
            if (!object) category = "missing-object";
            else {
                const type = enumNumber("object", object.rules.type),
                    owner = object.owner;
                const targetSide =
                    owner === this.names.candidate
                        ? "candidate"
                        : owner === this.names.baseline
                        ? "baseline"
                        : owner
                        ? "other"
                        : "unowned";
                const health = optional((object as any).hitPoints, finite);
                category =
                    targetSide +
                    "/" +
                    (type === ObjectType.Building ? "building" : "nonbuilding") +
                    "/" +
                    (health === null ? "unknown-health" : health > 0 ? "live" : "nonlive");
            }
        } else if (args.length === 4 || args.length === 5) {
            finite(args[2]);
            finite(args[3]);
            if (args.length === 5 && args[4] !== undefined) boolean(args[4]);
            category = "position";
        } else fail("order argument shape");
        increment(this.byTarget, side + "." + category);
    }
    observeEvent(tick: number, event: EndpointEvent): void {
        natural(tick);
        if (this.finished || tick <= this.lastSample || tick < this.lastObservedTick) fail("event clock");
        this.lastObservedTick = tick;
        const key = tick + "/" + JSON.stringify(event);
        if (!this.seenEvents.has(key)) {
            this.seenEvents.add(key);
            this.events.push({ tick, event: structuredClone(event) });
        }
    }
    take(tick: number): S1ActionWindow {
        natural(tick);
        if (this.finished || this.installed.size !== 2 || tick <= this.lastSample || tick < this.lastObservedTick)
            fail("sample action window");
        const value = {
            afterTick: this.lastSample,
            throughTick: tick,
            calls: this.calls,
            bySideAndMethod: ordered(this.byMethod),
            bySideAndOrder: ordered(this.byOrder),
            bySideAndTarget: ordered(this.byTarget),
            requestedUnitIdOccurrences: { ...this.requested },
            events: this.events,
        };
        this.lastSample = tick;
        this.calls = 0;
        this.byMethod = {};
        this.byOrder = {};
        this.byTarget = {};
        this.requested = { candidate: 0, baseline: 0 };
        this.events = [];
        this.seenEvents.clear();
        return value;
    }
    finish(expectedCounts: Record<string, number>): void {
        if (
            this.finished ||
            this.installed.size !== 2 ||
            this.lastSample < 0 ||
            this.calls ||
            this.events.length ||
            JSON.stringify(ordered(this.totalBySideAndMethod)) !== JSON.stringify(ordered(expectedCounts))
        )
            fail("window conservation/finalization");
        this.finished = true;
    }
    uninstall(): void {
        for (const restore of this.restore.reverse()) restore();
        this.restore = [];
    }
}

export class S1Sampler {
    private identities = new WeakMap<object, { id: number; firstObservedTick: number }>();
    private nextId = 0;
    private lastTick = -1;
    constructor(private readonly names: Record<S1Side, string>) {}
    capture(
        game: GameApi,
        production: Record<S1Side, ProductionApi>,
        missionRead: () => S1MissionRead[] | null,
        window: S1ActionWindow,
    ): S1Sample {
        const tick = natural(game.getCurrentTick());
        if (tick <= this.lastTick || tick !== window.throughTick || window.afterTick !== this.lastTick)
            fail("sampling clock");
        const players = Object.fromEntries(
            S1_SIDES.map((side) => {
                const p = game.getPlayerData(this.names[side]);
                return [
                    side,
                    {
                        name: this.names[side],
                        country: text(p.country?.name),
                        credits: finite(p.credits),
                        power: {
                            total: finite(p.power.total),
                            drain: finite(p.power.drain),
                            isLowPower: boolean(p.power.isLowPower),
                        },
                        defeated: boolean(game.isPlayerDefeated(this.names[side])),
                        queues: S1_ENUMS.queue.map((_, type) => {
                            const q = production[side].getQueueData(type);
                            if (q.type !== type) fail("queue identity");
                            return {
                                type,
                                status: enumNumber("queueStatus", q.status),
                                size: natural(q.size),
                                maxSize: natural(q.maxSize),
                                items: q.items.map((i) => ({
                                    rulesName: text(i.rules.name),
                                    rulesType: enumNumber("object", i.rules.type),
                                    quantity: natural(i.quantity),
                                })),
                            };
                        }),
                    },
                ];
            }),
        ) as Record<S1Side, S1Player>;
        const ids = game
            .getAllUnits()
            .slice()
            .sort((a, b) => a - b);
        if (new Set(ids).size !== ids.length) fail("duplicate public unit IDs");
        const units: S1Unit[] = [],
            coverage = { allIds: ids.length, otherOwner: 0, nonLive: 0 };
        for (const id of ids) {
            natural(id);
            const u = game.getUnitData(id);
            if (!u || u.id !== id) fail("public unit data missing or misidentified");
            const side = S1_SIDES.find((s) => this.names[s] === u.owner);
            if (!side) {
                coverage.otherOwner++;
                continue;
            }
            const health = finite(u.hitPoints);
            if (health <= 0) {
                coverage.nonLive++;
                continue;
            }
            units.push({
                id,
                side,
                owner: this.names[side],
                rulesName: text(u.rules.name),
                type: enumNumber("object", u.rules.type),
                x: finite(u.tile.rx),
                y: finite(u.tile.ry),
                health,
                maxHealth: optional(u.maxHitPoints, finite),
                purchaseValue: optional(u.purchaseValue, finite),
                canMove: optional(u.canMove, boolean),
                isIdle: optional(u.isIdle, boolean),
                buildStatus: optional(u.buildStatus, (v) => enumNumber("build", v)),
                isPoweredOn: optional(u.isPoweredOn, boolean),
                primaryWeapon: weapon(u.primaryWeapon),
                secondaryWeapon: weapon(u.secondaryWeapon),
                weaponRulesObserved: "primary" in u.rules && "secondary" in u.rules,
                primaryRule: optional(u.rules.primary, (v) => (typeof v === "string" ? v : fail("primary rule"))),
                secondaryRule: optional(u.rules.secondary, (v) => (typeof v === "string" ? v : fail("secondary rule"))),
            });
            if (units.length > 4096) fail("unit sample bound");
        }
        const raw = missionRead();
        if (!raw) fail("candidate mission channel unavailable");
        const names = new Set<string>(),
            missions = raw
                .map((m) => {
                    if (!m.handle || typeof m.handle !== "object" || names.has(m.name)) fail("mission identity");
                    names.add(m.name);
                    let identity = this.identities.get(m.handle);
                    if (!identity) {
                        identity = { id: this.nextId++, firstObservedTick: tick };
                        this.identities.set(m.handle, identity);
                    }
                    return {
                        id: identity.id,
                        name: text(m.name),
                        type: text(m.type),
                        priority: finite(m.priority),
                        active: boolean(m.active),
                        unitIds: m.unitIds.map(natural).sort((a, b) => a - b),
                        firstObservedTick: identity.firstObservedTick,
                        sampledAgeLowerBound: tick - identity.firstObservedTick,
                    };
                })
                .sort((a, b) => a.id - b.id);
        this.lastTick = tick;
        const sample: S1Sample = {
            kind: "strategic-s1-sample-v1",
            tick,
            periodic: tick > 0 && tick % 300 === 0,
            players,
            units,
            unitCoverage: coverage,
            missions,
            window,
        };
        if (Buffer.byteLength(JSON.stringify(sample)) + 1 > 512 * 1024) fail("sample record byte bound");
        return sample;
    }
}
