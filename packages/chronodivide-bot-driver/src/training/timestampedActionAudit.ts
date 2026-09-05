import { ActionsApi, Bot, GameApi, ProductionApi } from "@chronodivide/game-api";
import crypto from "node:crypto";
import {
    FRESH_DUAL_ACTION_METHODS,
    normalizePublicValue,
} from "./freshDualStudyInstrumentation.js";

export const ACTION_BURST_ARGUMENT_LIMIT_BYTES = 64 * 1024;
export const ACTION_BURST_EVENT_LIMIT = 100_000;
export const ACTION_BURST_PROHIBITED_KEY =
    /winner|outcome|score|endpoint|defeated|gamefinished|terminalbuilding|remainingbuilding|buildingcount|rank/i;

export type ActionBurstSide = "candidate" | "baseline";
export type ActionBurstMethod = typeof FRESH_DUAL_ACTION_METHODS[number];
export type ActionBurstClass =
    "order" | "gameplay_nonorder" | "debug_or_communication" | "suppressed_quit";
export type ActionBurstOrderMetadata = {
    unitCount: number;
    orderType: number | string;
    overload: "no_target" | "object_target" | "tile_target";
    orderedUnitIdsSha256: string;
    targetAvailable: boolean;
};
export type ActionBurstEvent = {
    update: number;
    side: ActionBurstSide;
    method: ActionBurstMethod;
    actionClass: ActionBurstClass;
    argumentSha256: string;
    argumentBytes: number;
    forwarded: boolean;
    order: ActionBurstOrderMetadata | null;
};
export type ActionBurstAuditSummary = {
    complete: true;
    eventCount: number;
    traceSha256: string;
    bySideAndMethod: Record<string, number>;
    bySideAndClass: Record<string, number>;
    suppressedQuitAttempts: Record<ActionBurstSide, number>;
};

export type TimestampedInspectableBot = Bot & {
    lastGameApi: GameApi | null;
    lastPlayerActions: ActionsApi | null;
    lastPlayerProduction: ProductionApi | null;
};

type RecordValue = Record<string, unknown>;

const hash = (value: Buffer | string): string =>
    crypto.createHash("sha256").update(value).digest("hex");

const actionClass = (method: ActionBurstMethod): ActionBurstClass => {
    if (method === "orderUnits") return "order";
    if (method === "quitGame") return "suppressed_quit";
    if (method === "sayAll" || method === "setGlobalDebugText" || method === "setUnitDebugText") {
        return "debug_or_communication";
    }
    return "gameplay_nonorder";
};

const canonicalArguments = (args: unknown[]): { sha256: string; bytes: number } => {
    const encoded = Buffer.from(JSON.stringify(normalizePublicValue(args)));
    if (encoded.length > ACTION_BURST_ARGUMENT_LIMIT_BYTES) {
        throw new Error("Action-burst canonical arguments exceed 64 KiB");
    }
    return { sha256: hash(encoded), bytes: encoded.length };
};

const finite = (value: unknown): value is number =>
    typeof value === "number" && Number.isFinite(value);

const orderMetadata = (
    game: GameApi,
    args: unknown[],
): ActionBurstOrderMetadata => {
    if (!Array.isArray(args[0]) || !args[0].every((value) => Number.isSafeInteger(value))) {
        throw new Error("Action-burst orderUnits unit IDs are invalid");
    }
    const ids = [...args[0] as number[]].sort((left, right) => left - right);
    const orderType = args[1];
    if (!(typeof orderType === "string" || Number.isSafeInteger(orderType))) {
        throw new Error("Action-burst order type is invalid");
    }
    let overload: ActionBurstOrderMetadata["overload"] = "no_target";
    let targetAvailable = true;
    if (args.length >= 3) {
        const target = args[2];
        if (Number.isSafeInteger(target)) {
            overload = "object_target";
            targetAvailable = game.getGameObjectData(target as number) != null;
        } else if (
            target && typeof target === "object" &&
            finite((target as RecordValue).x) && finite((target as RecordValue).y)
        ) {
            overload = "tile_target";
            targetAvailable = true;
        } else {
            throw new Error("Action-burst orderUnits target overload is invalid");
        }
    }
    return {
        unitCount: ids.length,
        orderType: orderType as number | string,
        overload,
        orderedUnitIdsSha256: hash(JSON.stringify(ids)),
        targetAvailable,
    };
};

export const rejectActionBurstProhibitedFields = (value: unknown): void => {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) {
        value.forEach(rejectActionBurstProhibitedFields);
        return;
    }
    for (const [key, child] of Object.entries(value as RecordValue)) {
        if (ACTION_BURST_PROHIBITED_KEY.test(key)) {
            throw new Error("Prohibited action-burst field " + key);
        }
        rejectActionBurstProhibitedFields(child);
    }
};

export class TimestampedActionAudit {
    private readonly installed = new Set<ActionBurstSide>();
    private readonly rows: ActionBurstEvent[] = [];
    private readonly methodCounts = new Map<string, number>();
    private readonly classCounts = new Map<string, number>();
    private readonly quitAttempts: Record<ActionBurstSide, number> = {
        candidate: 0,
        baseline: 0,
    };
    private finished = false;

    install(side: ActionBurstSide, actions: ActionsApi, game: GameApi): void {
        if (this.installed.has(side)) throw new Error("Action-burst side already installed: " + side);
        this.installed.add(side);
        const api = actions as unknown as RecordValue;
        for (const method of FRESH_DUAL_ACTION_METHODS) {
            const original = api[method];
            if (typeof original !== "function") {
                throw new Error("Action-burst public method missing: " + method);
            }
            Object.defineProperty(api, method, {
                configurable: true,
                writable: true,
                value: (...args: unknown[]): unknown => {
                    if (this.finished) throw new Error("Action-burst request after finalization");
                    if (this.rows.length >= ACTION_BURST_EVENT_LIMIT) {
                        throw new Error("Action-burst event limit exceeded");
                    }
                    const encoded = canonicalArguments(args);
                    const category = actionClass(method);
                    const forwarded = method !== "quitGame";
                    const event: ActionBurstEvent = {
                        update: game.getCurrentTick(),
                        side,
                        method,
                        actionClass: category,
                        argumentSha256: encoded.sha256,
                        argumentBytes: encoded.bytes,
                        forwarded,
                        order: method === "orderUnits" ? orderMetadata(game, args) : null,
                    };
                    rejectActionBurstProhibitedFields(event);
                    this.rows.push(event);
                    const methodKey = side + "." + method;
                    const classKey = side + "." + category;
                    this.methodCounts.set(methodKey, (this.methodCounts.get(methodKey) ?? 0) + 1);
                    this.classCounts.set(classKey, (this.classCounts.get(classKey) ?? 0) + 1);
                    if (!forwarded) {
                        this.quitAttempts[side] += 1;
                        return undefined;
                    }
                    return (original as (...values: unknown[]) => unknown).apply(actions, args);
                },
            });
        }
    }

    finish(): { events: ActionBurstEvent[]; summary: ActionBurstAuditSummary } {
        if (this.finished) throw new Error("Action-burst audit already finalized");
        if (this.installed.size !== 2) throw new Error("Action-burst audit requires both sides");
        this.finished = true;
        const events = structuredClone(this.rows) as ActionBurstEvent[];
        const summary: ActionBurstAuditSummary = {
            complete: true,
            eventCount: events.length,
            traceSha256: hash(events.map((event) => JSON.stringify(event)).join("\n") + "\n"),
            bySideAndMethod: Object.fromEntries([...this.methodCounts.entries()].sort()),
            bySideAndClass: Object.fromEntries([...this.classCounts.entries()].sort()),
            suppressedQuitAttempts: structuredClone(this.quitAttempts),
        };
        rejectActionBurstProhibitedFields(summary);
        return { events, summary };
    }
}

export const installTimestampedActionAudit = (
    bots: Record<ActionBurstSide, TimestampedInspectableBot>,
    audit: TimestampedActionAudit,
): void => {
    for (const side of ["candidate", "baseline"] as const) {
        const bot = bots[side];
        const originalStart = bot.onGameStart.bind(bot);
        bot.onGameStart = (game: GameApi): void => {
            const player = (bot as unknown as {
                player: { actions: ActionsApi; production: ProductionApi };
            }).player;
            audit.install(side, player.actions, game);
            originalStart(game);
            if (
                bot.lastGameApi !== game ||
                bot.lastPlayerActions !== player.actions ||
                !bot.lastPlayerProduction
            ) {
                throw new Error("Action-burst inspectable APIs missing for " + side);
            }
        };
    }
};
