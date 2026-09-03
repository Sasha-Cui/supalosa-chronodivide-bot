import {
    ActionsApi,
    ApiEvent,
    GameApi,
    ObjectType,
    ProductionApi,
    QueueType,
    UnitData,
} from "@chronodivide/game-api";
import { createHash, Hash } from "node:crypto";
import { EndpointSide, QuitSuppressionAudit } from "./literalBuildingEliminationEndpoint.js";

export const FRESH_DUAL_ACTION_METHODS = [
    "placeBuilding", "sellObject", "sellBuilding", "toggleRepairWrench", "toggleAlliance",
    "pauseProduction", "resumeProduction", "queueForProduction", "unqueueFromProduction",
    "activateSuperWeapon", "orderUnits", "sayAll", "setGlobalDebugText", "setUnitDebugText",
    "quitGame",
] as const;

type ActionMethod = typeof FRESH_DUAL_ACTION_METHODS[number];
type RecordValue = Record<string, unknown>;
type InstrumentedBot = {
    name: string;
    lastPlayerActions: ActionsApi | null;
    lastPlayerProduction: ProductionApi | null;
    onGameStart(game: GameApi): void;
    onGameEvent(event: ApiEvent, ...args: unknown[]): void;
};
export type PassiveEventObserver = {
    observe(event: ApiEvent): void;
};
export type ZeroHealthTargetDiagnostic = {
    tick: number;
    side: EndpointSide;
    method: "orderUnits";
    targetId: number;
    targetOwner: string | null;
    targetRulesName: string;
    targetType: number;
    targetHitPoints: number;
};
export type ZeroHealthTargetDiagnosticSummary = {
    count: number;
    first: ZeroHealthTargetDiagnostic | null;
    last: ZeroHealthTargetDiagnostic | null;
    bySideAndRulesName: Record<string, number>;
};
export type PublicActionAuditSummary = {
    sha256: string;
    callCount: number;
    bySideAndMethod: Record<string, number>;
    zeroHealthBuildingTargetRequests: ZeroHealthTargetDiagnosticSummary;
};

const finite = (value: unknown): number | null =>
    typeof value === "number" && Number.isFinite(value) ? value : null;
const vector = (value: unknown): unknown => {
    if (!value || typeof value !== "object") return null;
    const row = value as RecordValue;
    return {
        x: finite(row.x),
        y: finite(row.y),
        z: finite(row.z),
        rx: finite(row.rx),
        ry: finite(row.ry),
    };
};

export const normalizePublicValue = (
    value: unknown,
    depth = 0,
    seen = new Set<object>(),
): unknown => {
    if (value === null || typeof value === "string" || typeof value === "boolean") return value;
    if (typeof value === "number") {
        if (Number.isNaN(value)) return "[NaN]";
        if (value === Infinity) return "[Infinity]";
        if (value === -Infinity) return "[-Infinity]";
        return Object.is(value, -0) ? 0 : value;
    }
    if (value === undefined) return "[undefined]";
    if (typeof value === "bigint") return value.toString();
    if (typeof value === "function") return "[function]";
    if (depth >= 8) return "[depth]";
    if (Array.isArray(value)) return value.map((entry) => normalizePublicValue(entry, depth + 1, seen));
    if (typeof value === "object") {
        if (seen.has(value)) return "[circular]";
        seen.add(value);
        const row = value as RecordValue;
        const normalized: RecordValue = {};
        for (const key of Object.keys(row).sort()) {
            if (key.startsWith("_") || typeof row[key] === "function") continue;
            normalized[key] = normalizePublicValue(row[key], depth + 1, seen);
        }
        seen.delete(value);
        return normalized;
    }
    return String(value);
};

const updateHash = (hash: Hash, value: unknown): void => {
    hash.update(JSON.stringify(normalizePublicValue(value)) + "\n");
};

export class PublicActionAudit {
    private readonly hash = createHash("sha256");
    private readonly counts = new Map<string, number>();
    private readonly installed = new Set<EndpointSide>();
    private readonly suppressQuit: Record<EndpointSide, boolean> = { candidate: false, baseline: false };
    private diagnosticCount = 0;
    private firstDiagnostic: ZeroHealthTargetDiagnostic | null = null;
    private lastDiagnostic: ZeroHealthTargetDiagnostic | null = null;
    private readonly diagnosticsBySideAndRulesName = new Map<string, number>();
    private calls = 0;
    private finished = false;
    readonly quit: QuitSuppressionAudit = {
        mode: "symmetric_no_forwarding",
        attempts: { candidate: 0, baseline: 0 },
        forwarded: { candidate: 0, baseline: 0 },
    };

    install(side: EndpointSide, actions: ActionsApi, game: GameApi): void {
        if (this.installed.has(side)) throw new Error(`Action audit already installed for ${side}`);
        this.installed.add(side);
        const api = actions as unknown as RecordValue;
        for (const method of FRESH_DUAL_ACTION_METHODS) {
            const original = api[method];
            if (typeof original !== "function") throw new Error(`Missing public action method ${method}`);
            Object.defineProperty(api, method, {
                configurable: true,
                writable: true,
                value: (...args: unknown[]): unknown => {
                    if (this.finished) throw new Error("Action emitted after action audit finalized");
                    const tick = game.getCurrentTick();
                    const key = `${side}.${method}`;
                    this.calls += 1;
                    this.counts.set(key, (this.counts.get(key) ?? 0) + 1);
                    updateHash(this.hash, { tick, side, method, args });
                    this.inspectTarget(game, side, method, args, tick);
                    if (method === "quitGame") {
                        if (this.suppressQuit[side]) {
                            this.quit.attempts[side] += 1;
                            return undefined;
                        }
                        this.quit.forwarded[side] += 1;
                    }
                    return (original as (...values: unknown[]) => unknown).apply(actions, args);
                },
            });
        }
    }

    enableQuitSuppression(side: EndpointSide): void {
        if (!this.installed.has(side)) throw new Error(`Cannot suppress quit before ${side} instrumentation`);
        this.suppressQuit[side] = true;
    }

    finish(): PublicActionAuditSummary {
        if (this.finished) throw new Error("Action audit already finalized");
        if (this.installed.size !== 2) throw new Error("Both action APIs must be instrumented");
        this.finished = true;
        return {
            sha256: this.hash.digest("hex"),
            callCount: this.calls,
            bySideAndMethod: Object.fromEntries([...this.counts.entries()].sort()),
            zeroHealthBuildingTargetRequests: {
                count: this.diagnosticCount,
                first: structuredClone(this.firstDiagnostic),
                last: structuredClone(this.lastDiagnostic),
                bySideAndRulesName: Object.fromEntries([...this.diagnosticsBySideAndRulesName.entries()].sort()),
            },
        };
    }

    private inspectTarget(
        game: GameApi,
        side: EndpointSide,
        method: ActionMethod,
        args: unknown[],
        tick: number,
    ): void {
        if (method !== "orderUnits" || args.length !== 3 || typeof args[2] !== "number") return;
        const target = game.getUnitData(args[2]);
        if (!target || target.rules.type !== ObjectType.Building || target.hitPoints > 0) return;
        const diagnostic: ZeroHealthTargetDiagnostic = {
            tick,
            side,
            method,
            targetId: target.id,
            targetOwner: target.owner ?? null,
            targetRulesName: target.rules.name,
            targetType: target.rules.type,
            targetHitPoints: target.hitPoints,
        };
        this.diagnosticCount += 1;
        if (!this.firstDiagnostic) this.firstDiagnostic = diagnostic;
        this.lastDiagnostic = diagnostic;
        const key = `${side}.${target.rules.name}`;
        this.diagnosticsBySideAndRulesName.set(
            key, (this.diagnosticsBySideAndRulesName.get(key) ?? 0) + 1,
        );
    }
}

export const installFreshDualStudyInstrumentation = (
    bots: Record<EndpointSide, InstrumentedBot>,
    observer: PassiveEventObserver,
    actionAudit: PublicActionAudit,
): void => {
    for (const side of ["candidate", "baseline"] as const) {
        const bot = bots[side];
        const originalStart = bot.onGameStart.bind(bot);
        const originalEvent = bot.onGameEvent.bind(bot);
        bot.onGameStart = (game: GameApi): void => {
            const player = (bot as unknown as { player: { actions: ActionsApi } }).player;
            actionAudit.install(side, player.actions, game);
            originalStart(game);
            if (bot.lastPlayerActions !== player.actions || !bot.lastPlayerProduction) {
                throw new Error(`Inspectable ${side} public APIs were not retained`);
            }
            actionAudit.enableQuitSuppression(side);
        };
        bot.onGameEvent = (event: ApiEvent, ...args: unknown[]): void => {
            observer.observe(event);
            originalEvent(event, ...args);
        };
    }
};

const weapon = (value: UnitData["primaryWeapon"]): unknown => value ? {
    type: value.type,
    rulesName: value.rules.name,
    minRange: value.minRange,
    maxRange: value.maxRange,
    speed: value.speed,
    cooldownTicks: value.cooldownTicks,
} : null;

const publicObject = (value: ReturnType<GameApi["getGameObjectData"]>): unknown => {
    if (!value) return null;
    const unit = value as Partial<UnitData>;
    return {
        id: value.id,
        type: value.type,
        name: value.name,
        rulesName: value.rules.name,
        rulesType: value.rules.type,
        owner: value.owner ?? null,
        tile: {
            id: value.tile.id,
            rx: value.tile.rx,
            ry: value.tile.ry,
            z: value.tile.z,
            terrainType: value.tile.terrainType,
            landType: value.tile.landType,
            onBridgeLandType: value.tile.onBridgeLandType ?? null,
            rampType: value.tile.rampType,
            occluded: value.tile.occluded,
        },
        worldPosition: vector(value.worldPosition),
        tileElevation: value.tileElevation,
        foundation: { width: value.foundation.width, height: value.foundation.height },
        hitPoints: value.hitPoints ?? null,
        maxHitPoints: value.maxHitPoints ?? null,
        sight: unit.sight ?? null,
        veteranLevel: unit.veteranLevel ?? null,
        guardMode: unit.guardMode ?? null,
        purchaseValue: unit.purchaseValue ?? null,
        primaryWeapon: weapon(unit.primaryWeapon),
        secondaryWeapon: weapon(unit.secondaryWeapon),
        deathWeapon: weapon(unit.deathWeapon),
        attackState: unit.attackState ?? null,
        direction: unit.direction ?? null,
        onBridge: unit.onBridge ?? null,
        zone: unit.zone ?? null,
        buildStatus: unit.buildStatus ?? null,
        factory: normalizePublicValue(unit.factory ?? null),
        rallyPoint: vector(unit.rallyPoint),
        isPoweredOn: unit.isPoweredOn ?? null,
        hasWrenchRepair: unit.hasWrenchRepair ?? null,
        garrisonUnitCount: unit.garrisonUnitCount ?? null,
        garrisonUnitsMax: unit.garrisonUnitsMax ?? null,
        turretFacing: unit.turretFacing ?? null,
        turretNo: unit.turretNo ?? null,
        isIdle: unit.isIdle ?? null,
        canMove: unit.canMove ?? null,
        velocity: vector(unit.velocity),
        stance: unit.stance ?? null,
        harvestedOre: unit.harvestedOre ?? null,
        harvestedGems: unit.harvestedGems ?? null,
        passengerSlotCount: unit.passengerSlotCount ?? null,
        passengerSlotMax: unit.passengerSlotMax ?? null,
        ammo: unit.ammo ?? null,
        isWarpedOut: unit.isWarpedOut ?? null,
        mindControlledBy: unit.mindControlledBy ?? null,
        tntTimer: unit.tntTimer ?? null,
    };
};

const queueSnapshot = (production: ProductionApi): unknown[] => {
    const values = Object.values(QueueType).filter((value): value is number => typeof value === "number");
    return [...new Set(values)].sort((a, b) => a - b).map((type) => {
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

export const snapshotFreshDualPublicWorld = (
    game: GameApi,
    bots: Record<EndpointSide, InstrumentedBot>,
): unknown => {
    const players = game.getPlayers().slice().sort().map((name) => {
        const value = game.getPlayerData(name);
        return {
            name,
            country: value.country?.name ?? null,
            startLocation: vector(value.startLocation),
            isObserver: value.isObserver,
            isAi: value.isAi,
            isCombatant: value.isCombatant,
            defeated: game.isPlayerDefeated(name),
            credits: value.credits,
            power: normalizePublicValue(value.power),
            radarDisabled: value.radarDisabled,
        };
    });
    const units = game.getAllUnits().slice().sort((a, b) => a - b)
        .map((id) => publicObject(game.getUnitData(id)));
    const terrain = game.getAllTerrainObjects().slice().sort((a, b) => a - b)
        .map((id) => publicObject(game.getGameObjectData(id)));
    const resources = game.map.getAllTilesResourceData().map((value) => ({
        tile: { id: value.tile.id, rx: value.tile.rx, ry: value.tile.ry, z: value.tile.z },
        gems: value.gems,
        ore: value.ore,
        spawnsOre: value.spawnsOre,
    })).sort((a, b) => a.tile.id.localeCompare(b.tile.id));
    const superWeapons = game.getAllSuperWeaponData().map((value) => ({ ...value }))
        .sort((a, b) => a.playerName.localeCompare(b.playerName) || a.type - b.type);
    const queues = Object.fromEntries((["candidate", "baseline"] as const).map((side) => {
        const production = bots[side].lastPlayerProduction;
        if (!production) throw new Error(`Missing ${side} production API for public snapshot`);
        return [side, queueSnapshot(production)];
    }));
    return { tick: game.getCurrentTick(), players, units, terrain, resources, superWeapons, queues };
};

export class PublicWorldTrajectory {
    private readonly hash = createHash("sha256");
    private snapshots = 0;
    private finished = false;

    observe(snapshot: unknown): void {
        if (this.finished) throw new Error("World trajectory already finalized");
        updateHash(this.hash, snapshot);
        this.snapshots += 1;
    }

    finish(): { sha256: string; snapshots: number } {
        if (this.finished) throw new Error("World trajectory already finalized");
        this.finished = true;
        return { sha256: this.hash.digest("hex"), snapshots: this.snapshots };
    }
};
