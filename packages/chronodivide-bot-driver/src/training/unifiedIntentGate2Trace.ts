import {
    ActionsApi,
    GameApi,
    ProductionApi,
    QueueType,
    UnitData,
} from "@chronodivide/game-api";
import { createHash, Hash } from "node:crypto";
import {
    FRESH_DUAL_ACTION_METHODS,
    normalizePublicValue,
} from "./freshDualStudyInstrumentation.js";

export type UnifiedIntentGate2Side = "candidate" | "opponent";

type InspectableBot = {
    name: string;
    lastPlayerActions: ActionsApi | null;
    lastPlayerProduction: ProductionApi | null;
    onGameStart(game: GameApi): void;
};

type SideState = {
    hash: Hash;
    calls: number;
    byMethod: Map<string, number>;
};

const newSideState = (): SideState => ({
    hash: createHash("sha256"),
    calls: 0,
    byMethod: new Map(),
});

const updateHash = (value: Hash, row: unknown): void => {
    value.update(JSON.stringify(normalizePublicValue(row)) + "\n");
};

export class UnifiedIntentGate2ActionTrace {
    private readonly installed = new Set<UnifiedIntentGate2Side>();
    private readonly sides: Record<UnifiedIntentGate2Side, SideState> = {
        candidate: newSideState(),
        opponent: newSideState(),
    };
    private finished = false;

    install(side: UnifiedIntentGate2Side, actions: ActionsApi, game: GameApi): void {
        if (this.installed.has(side)) {
            throw new Error("Unified intent Gate 2 action side was installed twice");
        }
        this.installed.add(side);
        const api = actions as unknown as Record<string, unknown>;
        for (const method of FRESH_DUAL_ACTION_METHODS) {
            const original = api[method];
            if (typeof original !== "function") {
                throw new Error("Unified intent Gate 2 action method is missing: " + method);
            }
            Object.defineProperty(api, method, {
                configurable: true,
                writable: true,
                value: (...args: unknown[]): unknown => {
                    if (this.finished) {
                        throw new Error("Unified intent Gate 2 action after finalization");
                    }
                    const state = this.sides[side];
                    state.calls += 1;
                    state.byMethod.set(method, (state.byMethod.get(method) ?? 0) + 1);
                    updateHash(state.hash, {
                        update: game.getCurrentTick(),
                        side,
                        method,
                        args,
                    });
                    return (original as (...values: unknown[]) => unknown).apply(actions, args);
                },
            });
        }
    }

    finish(): Record<UnifiedIntentGate2Side, {
        sha256: string;
        calls: number;
        byMethod: Record<string, number>;
    }> {
        if (this.finished || this.installed.size !== 2) {
            throw new Error("Unified intent Gate 2 action trace is incomplete");
        }
        this.finished = true;
        return Object.fromEntries((["candidate", "opponent"] as const).map((side) => {
            const state = this.sides[side];
            return [side, {
                sha256: state.hash.digest("hex"),
                calls: state.calls,
                byMethod: Object.fromEntries([...state.byMethod.entries()].sort()),
            }];
        })) as Record<UnifiedIntentGate2Side, {
            sha256: string;
            calls: number;
            byMethod: Record<string, number>;
        }>;
    }
}

export const installUnifiedIntentGate2ActionTrace = (
    bots: Record<UnifiedIntentGate2Side, InspectableBot>,
    trace: UnifiedIntentGate2ActionTrace,
): void => {
    for (const side of ["candidate", "opponent"] as const) {
        const bot = bots[side];
        const start = bot.onGameStart.bind(bot);
        bot.onGameStart = (game: GameApi): void => {
            const player = (bot as unknown as {
                player: { actions: ActionsApi };
            }).player;
            trace.install(side, player.actions, game);
            start(game);
            if (bot.lastPlayerActions !== player.actions || !bot.lastPlayerProduction) {
                throw new Error("Unified intent Gate 2 inspectable API was not retained");
            }
        };
    }
};

const queueSnapshot = (production: ProductionApi) => {
    const types = Object.values(QueueType)
        .filter((value): value is number => typeof value === "number")
        .sort((left, right) => left - right);
    return [...new Set(types)].map((type) => {
        const queue = production.getQueueData(type);
        return {
            type,
            size: queue.size,
            maxSize: queue.maxSize,
            status: queue.status,
            items: queue.items.map((item) => ({
                rulesName: item.rules.name,
                rulesType: item.rules.type,
                quantity: item.quantity,
            })),
        };
    });
};

const ownerRole = (
    owner: string,
    names: Record<UnifiedIntentGate2Side, string>,
): string => owner === names.candidate
    ? "candidate"
    : owner === names.opponent
        ? "opponent"
        : owner;

const unitSnapshot = (
    value: UnitData,
    names: Record<UnifiedIntentGate2Side, string>,
) => ({
    id: value.id,
    owner: ownerRole(value.owner, names),
    name: value.name,
    type: value.type,
    rulesName: value.rules.name,
    rulesType: value.rules.type,
    tile: {
        id: value.tile.id,
        rx: value.tile.rx,
        ry: value.tile.ry,
        z: value.tile.z,
    },
    hitPoints: value.hitPoints,
    maxHitPoints: value.maxHitPoints,
    stance: value.stance ?? null,
    isIdle: value.isIdle ?? null,
    canMove: value.canMove ?? null,
    buildStatus: value.buildStatus ?? null,
    factory: normalizePublicValue(value.factory ?? null),
    onBridge: value.onBridge ?? null,
    isWarpedOut: value.isWarpedOut,
});

const units = (
    game: GameApi,
    playerName: string,
    relation: "self" | "enemy",
    names: Record<UnifiedIntentGate2Side, string>,
) => game.getVisibleUnits(playerName, relation)
    .map((id) => game.getUnitData(id))
    .filter((value): value is UnitData => !!value)
    .sort((left, right) => left.id - right.id)
    .map((value) => unitSnapshot(value, names));

export const snapshotUnifiedIntentGate2PublicState = (
    game: GameApi,
    bots: Record<UnifiedIntentGate2Side, InspectableBot>,
): unknown => {
    const names = {
        candidate: bots.candidate.name,
        opponent: bots.opponent.name,
    };
    return {
        update: game.getCurrentTick(),
        candidate: sideSnapshot("candidate"),
        opponent: sideSnapshot("opponent"),
    };

    function sideSnapshot(side: UnifiedIntentGate2Side) {
        const bot = bots[side];
        const player = game.getPlayerData(bot.name);
        const production = bot.lastPlayerProduction;
        if (!production) {
            throw new Error("Unified intent Gate 2 production API is unavailable");
        }
        return {
            side,
            country: player.country?.name ?? null,
            startLocation: {
                x: player.startLocation.x,
                y: player.startLocation.y,
            },
            credits: player.credits,
            power: normalizePublicValue(player.power),
            radarDisabled: player.radarDisabled,
            queues: queueSnapshot(production),
            ownUnits: units(game, bot.name, "self", names),
            visibleEnemyUnits: units(game, bot.name, "enemy", names),
        };
    }
};

export class UnifiedIntentGate2Trajectory {
    private readonly hash = createHash("sha256");
    private readonly values: unknown[] = [];
    private finished = false;

    observe(value: unknown): void {
        if (this.finished) {
            throw new Error("Unified intent Gate 2 trajectory was finalized");
        }
        const normalized = normalizePublicValue(value);
        this.values.push(normalized);
        this.hash.update(JSON.stringify(normalized) + "\n");
    }

    finish(): { sha256: string; snapshots: unknown[] } {
        if (this.finished) {
            throw new Error("Unified intent Gate 2 trajectory was finalized");
        }
        this.finished = true;
        return {
            sha256: this.hash.digest("hex"),
            snapshots: structuredClone(this.values),
        };
    }
}
