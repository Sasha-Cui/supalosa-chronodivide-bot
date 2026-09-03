import { ActionsApi, ApiEvent, GameApi } from "@chronodivide/game-api";
import { createHash } from "node:crypto";
import {
    BuildingDisposition, BuildingLedgerRow, EndpointEngineState, EndpointEstablished,
    EndpointEvent, EndpointSide, EndpointUpdateEvaluation, LiteralEndpointCombatants,
    LiteralEndpointTechnicalFailure, LiteralEndpointTerminal, QuitSuppressionAudit,
    classifyLiteralEndpointCompletion, evaluateLiteralBuildingUpdate, toEndpointEvent,
} from "./literalBuildingEliminationEndpoint.js";
import { snapshotLiveOwnedBuildingsCandidate } from "./liveOwnedBuildingSnapshotCandidate.js";

/** Separate research evaluator. Existing competitive runners still use v5. */
export const LIVE_OWNED_ENDPOINT_VERSION = 6 as const;
export const LIVE_OWNED_ENDPOINT = "opponent-attributed physical destruction of every currently live enemy-owned building" as const;
export const LIVE_OWNED_ENDPOINT_SPEC = Object.freeze({
    version: LIVE_OWNED_ENDPOINT_VERSION,
    objective: LIVE_OWNED_ENDPOINT,
    snapshot: "public self-owned building collections; checked owner/type; finite positive health; sorted unique IDs",
    attribution: "unchanged v5 strict opposing ObjectDestroy and zeroing rules; reject owner-change, sale and unattributed cleanup",
    completion: "physical first; simultaneous physical draw; nonliteral native termination draw; missing evidence fails closed",
    cap: "draw only at the separately frozen caller limit",
});
export const LIVE_OWNED_ENDPOINT_SHA256 = createHash("sha256")
    .update(JSON.stringify(LIVE_OWNED_ENDPOINT_SPEC)).digest("hex");

type Versioned<T> = T extends unknown
    ? Omit<T, "endpointVersion" | "endpointSha256" | "endpoint"> & {
        endpointVersion: typeof LIVE_OWNED_ENDPOINT_VERSION;
        endpointSha256: string;
        endpoint: typeof LIVE_OWNED_ENDPOINT;
    } : never;
export type LiveOwnedEndpointTerminal = Versioned<LiteralEndpointTerminal>;
export type LiveOwnedEndpointTechnicalFailure = Versioned<LiteralEndpointTechnicalFailure>;
export type LiveOwnedEndpointUpdate = {
    evaluation: EndpointUpdateEvaluation;
    terminal: LiveOwnedEndpointTerminal | null;
    technicalFailure: LiveOwnedEndpointTechnicalFailure | null;
};
export type LiveOwnedEndpointCap = {
    endpointVersion: typeof LIVE_OWNED_ENDPOINT_VERSION;
    endpointSha256: string;
    endpoint: typeof LIVE_OWNED_ENDPOINT;
    tick: number;
    status: "tick_cap_draw";
    winner: "draw";
};

const identity = () => ({
    endpointVersion: LIVE_OWNED_ENDPOINT_VERSION,
    endpointSha256: LIVE_OWNED_ENDPOINT_SHA256,
    endpoint: LIVE_OWNED_ENDPOINT,
});

export const createLiveOwnedCapDraw = (tick: number, frozenLimit: number): LiveOwnedEndpointCap => {
    if (!Number.isSafeInteger(frozenLimit) || frozenLimit <= 0 ||
        !Number.isSafeInteger(tick) || tick !== frozenLimit) {
        throw new Error("A cap result requires the exact positive frozen update limit");
    }
    return { ...identity(), tick, status: "tick_cap_draw", winner: "draw" };
};

export class LiveOwnedBuildingEliminationAdjudicator {
    private pre: BuildingLedgerRow[] | null = null;
    private events: EndpointEvent[] = [];
    private established: EndpointEstablished = { candidate: false, baseline: false };
    private dispositions: BuildingDisposition[] = [];
    private readonly combatants: LiteralEndpointCombatants;

    constructor(combatants: LiteralEndpointCombatants) {
        const { candidate, baseline } = combatants;
        if (typeof candidate !== "string" || typeof baseline !== "string" ||
            !candidate.length || !baseline.length || candidate === baseline) {
            throw new Error("Distinct nonempty combatant names required");
        }
        this.combatants = { candidate, baseline };
    }

    beginUpdate(game: GameApi): void {
        if (this.pre !== null) throw new Error("Live-owned endpoint update already began");
        this.pre = snapshotLiveOwnedBuildingsCandidate(game, this.combatants);
        this.events = [];
    }

    observe(event: ApiEvent): void {
        const converted = toEndpointEvent(event);
        if (converted) this.events.push(converted);
    }

    completeUpdate(game: GameApi, engine: EndpointEngineState): LiveOwnedEndpointUpdate {
        if (this.pre === null) throw new Error("Live-owned endpoint update was not begun");
        const evaluation = evaluateLiteralBuildingUpdate({
            tick: game.getCurrentTick(),
            combatants: this.combatants,
            pre: this.pre,
            post: snapshotLiveOwnedBuildingsCandidate(game, this.combatants),
            events: this.events,
            establishedBeforeUpdate: this.established,
        });
        const result = classifyLiteralEndpointCompletion({ evaluation, engine });
        this.pre = null;
        this.events = [];
        this.established = evaluation.establishedAfterUpdate;
        this.dispositions.push(...evaluation.dispositions);
        return {
            evaluation,
            terminal: result.terminal
                ? { ...result.terminal, ...identity() } as LiveOwnedEndpointTerminal : null,
            technicalFailure: result.technicalFailure
                ? { ...result.technicalFailure, ...identity() } as LiveOwnedEndpointTechnicalFailure : null,
        };
    }

    getEstablished(): EndpointEstablished { return { ...this.established }; }

    getDispositionHistory(): BuildingDisposition[] {
        return this.dispositions.map((entry) => ({
            ...entry, building: { ...entry.building },
            matchedEvents: entry.matchedEvents.map((event) => ({ ...event })),
        }));
    }
}

type InstrumentedBot = {
    lastPlayerActions: ActionsApi | null;
    onGameStart(game: GameApi): void;
    onGameEvent: (...args: any[]) => void;
};
export type LiteralEventObserver = { observe(event: ApiEvent): void };

/** A structural observer permits a passive v5/v6 multiplexer without altering v5. */
export const installLiveOwnedEndpointInstrumentation = (
    bots: Record<EndpointSide, InstrumentedBot>,
    observer: LiteralEventObserver,
): { audit: QuitSuppressionAudit } => {
    const audit: QuitSuppressionAudit = {
        mode: "symmetric_no_forwarding",
        attempts: { candidate: 0, baseline: 0 }, forwarded: { candidate: 0, baseline: 0 },
    };
    for (const side of ["candidate", "baseline"] as const) {
        const bot = bots[side], start = bot.onGameStart.bind(bot), event = bot.onGameEvent.bind(bot);
        bot.onGameStart = (game: GameApi): void => {
            start(game);
            const actions = bot.lastPlayerActions;
            if (!actions) throw new Error("Missing instrumented player actions");
            Object.defineProperty(actions, "quitGame", {
                configurable: true, writable: true, value: (): void => { audit.attempts[side] += 1; },
            });
        };
        bot.onGameEvent = (value: ApiEvent, ...args: unknown[]): void => {
            observer.observe(value);
            event(value, ...args);
        };
    }
    return { audit };
};
