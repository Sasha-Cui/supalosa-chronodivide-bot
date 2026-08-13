import { ApiEvent, ApiEventType, GameApi, ObjectType } from "@chronodivide/game-api";
import { InspectableBaselineBot } from "../benchmark/baselineLoader.js";

export const LITERAL_BUILDING_ELIMINATION_ENDPOINT_VERSION = 4 as const;
export const LITERAL_BUILDING_ELIMINATION_ENDPOINT_SHA256 =
    "6f89e216da64eacf70c203dad2ad5953b2ba6df0e74accc28bc7a66aa7050dc9" as const;
export const LITERAL_BUILDING_ELIMINATION_ENDPOINT =
    "opponent-attributed physical destruction of every currently enemy-owned building" as const;

export type EndpointSide = "candidate" | "baseline";
export type LiteralEndpointCombatants = Record<EndpointSide, string>;

export type BuildingLedgerRow = {
    id: number;
    owner: string;
    rulesName: string;
    x: number;
    y: number;
    hitPoints: number;
};

export type EndpointEvent =
    | {
          type: ApiEventType.ObjectDestroy;
          target: number;
          attackerPlayerName: string | null;
          attackerObjectId: number | null;
          weaponName: string | null;
      }
    | {
          type: ApiEventType.ObjectUnspawn;
          target: number;
      }
    | {
          type: ApiEventType.ObjectOwnerChange;
          target: number;
          previousOwnerName: string;
          newOwnerName: string;
      };

export type BuildingDispositionKind =
    | "opponent_attributed_physical_destruction"
    | "destroyed_without_opponent_attribution"
    | "owner_change"
    | "unspawn"
    | "unexplained_removal";

export type BuildingDisposition = {
    tick: number;
    building: BuildingLedgerRow;
    postOwner: string | null;
    kind: BuildingDispositionKind;
    validPhysicalDestruction: boolean;
    matchedEvents: EndpointEvent[];
    explanation: string;
};

export type EndpointCounts = Record<EndpointSide, number>;
export type EndpointEstablished = Record<EndpointSide, boolean>;

export type EndpointUpdateEvaluation = {
    tick: number;
    enabledBeforeUpdate: boolean;
    establishedAfterUpdate: EndpointEstablished;
    preCounts: EndpointCounts;
    postCounts: EndpointCounts;
    candidateZeroingTransition: boolean;
    baselineZeroingTransition: boolean;
    candidatePhysicalWin: boolean;
    baselinePhysicalWin: boolean;
    status: "continue" | "candidate_win" | "baseline_win" | "simultaneous_draw";
    winner: EndpointSide | "draw" | null;
    dispositions: BuildingDisposition[];
    zeroingDispositions: Record<EndpointSide, BuildingDisposition[]>;
};

export type LiteralEndpointTerminal = {
    endpointVersion: typeof LITERAL_BUILDING_ELIMINATION_ENDPOINT_VERSION;
    endpointSha256: typeof LITERAL_BUILDING_ELIMINATION_ENDPOINT_SHA256;
    endpoint: typeof LITERAL_BUILDING_ELIMINATION_ENDPOINT;
    tick: number;
    status: "candidate_win" | "baseline_win" | "simultaneous_draw";
    winner: EndpointSide | "draw";
    evaluation: EndpointUpdateEvaluation;
    engineFinishedSameUpdate: boolean;
};

export type LiteralEndpointTechnicalFailure = {
    endpointVersion: typeof LITERAL_BUILDING_ELIMINATION_ENDPOINT_VERSION;
    endpointSha256: typeof LITERAL_BUILDING_ELIMINATION_ENDPOINT_SHA256;
    tick: number;
    reason: "engine_finished_without_valid_literal_endpoint";
    evaluation: EndpointUpdateEvaluation;
};

export type LiteralEndpointCapDraw = {
    endpointVersion: typeof LITERAL_BUILDING_ELIMINATION_ENDPOINT_VERSION;
    endpointSha256: typeof LITERAL_BUILDING_ELIMINATION_ENDPOINT_SHA256;
    tick: number;
    status: "tick_cap_draw";
    winner: "draw";
};

const rowsById = (rows: readonly BuildingLedgerRow[]): Map<number, BuildingLedgerRow> =>
    new Map(rows.map((row) => [row.id, row]));

const endpointEventKey = (event: EndpointEvent): string => JSON.stringify(event);

export const deduplicateEndpointEvents = (events: readonly EndpointEvent[]): EndpointEvent[] => {
    const seen = new Set<string>();
    return events.filter((event) => {
        const key = endpointEventKey(event);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
};

const countOwnedBuildings = (
    rows: readonly BuildingLedgerRow[],
    combatants: LiteralEndpointCombatants,
): EndpointCounts => ({
    candidate: rows.filter((row) => row.owner === combatants.candidate).length,
    baseline: rows.filter((row) => row.owner === combatants.baseline).length,
});

const sideForOwner = (
    owner: string,
    combatants: LiteralEndpointCombatants,
): EndpointSide | null =>
    owner === combatants.candidate
        ? "candidate"
        : owner === combatants.baseline
          ? "baseline"
          : null;

const opposingSide = (side: EndpointSide): EndpointSide =>
    side === "candidate" ? "baseline" : "candidate";

const classifyDisposition = (
    tick: number,
    building: BuildingLedgerRow,
    postById: ReadonlyMap<number, BuildingLedgerRow>,
    events: readonly EndpointEvent[],
    combatants: LiteralEndpointCombatants,
): BuildingDisposition => {
    const side = sideForOwner(building.owner, combatants);
    if (!side) throw new Error(`Building ${building.id} is not owned by a declared combatant`);
    const opponentName = combatants[opposingSide(side)];
    const post = postById.get(building.id);
    const matchedEvents = events.filter((event) => event.target === building.id);
    const ownerChange = matchedEvents.find(
        (event): event is Extract<EndpointEvent, { type: ApiEventType.ObjectOwnerChange }> =>
            event.type === ApiEventType.ObjectOwnerChange,
    );
    if (ownerChange) {
        return {
            tick,
            building,
            postOwner: post?.owner ?? ownerChange.newOwnerName,
            kind: "owner_change",
            validPhysicalDestruction: false,
            matchedEvents,
            explanation: `Building ${building.id} changed owner in the zeroing update`,
        };
    }
    const qualifyingDestroy = matchedEvents.find(
        (event): event is Extract<EndpointEvent, { type: ApiEventType.ObjectDestroy }> =>
            event.type === ApiEventType.ObjectDestroy &&
            event.attackerPlayerName === opponentName &&
            post === undefined,
    );
    if (qualifyingDestroy) {
        return {
            tick,
            building,
            postOwner: null,
            kind: "opponent_attributed_physical_destruction",
            validPhysicalDestruction: true,
            matchedEvents,
            explanation:
                `ObjectDestroy target ${building.id} was attributed to opposing player ` +
                `${opponentName}, and the building is absent after the update`,
        };
    }
    if (matchedEvents.some((event) => event.type === ApiEventType.ObjectUnspawn)) {
        return {
            tick,
            building,
            postOwner: post?.owner ?? null,
            kind: "unspawn",
            validPhysicalDestruction: false,
            matchedEvents,
            explanation: `Building ${building.id} unspawned without a qualifying opponent-attributed destruction`,
        };
    }
    if (matchedEvents.some((event) => event.type === ApiEventType.ObjectDestroy)) {
        return {
            tick,
            building,
            postOwner: post?.owner ?? null,
            kind: "destroyed_without_opponent_attribution",
            validPhysicalDestruction: false,
            matchedEvents,
            explanation: `Building ${building.id} was destroyed without attribution to ${opponentName}`,
        };
    }
    return {
        tick,
        building,
        postOwner: post?.owner ?? null,
        kind: "unexplained_removal",
        validPhysicalDestruction: false,
        matchedEvents,
        explanation: `Building ${building.id} left its owner's building set without a qualifying event`,
    };
};

export const evaluateLiteralBuildingUpdate = (args: {
    tick: number;
    combatants: LiteralEndpointCombatants;
    pre: readonly BuildingLedgerRow[];
    post: readonly BuildingLedgerRow[];
    events: readonly EndpointEvent[];
    establishedBeforeUpdate: EndpointEstablished;
}): EndpointUpdateEvaluation => {
    const events = deduplicateEndpointEvents(args.events);
    const preCounts = countOwnedBuildings(args.pre, args.combatants);
    const postCounts = countOwnedBuildings(args.post, args.combatants);
    const enabledBeforeUpdate =
        args.establishedBeforeUpdate.candidate && args.establishedBeforeUpdate.baseline;
    const establishedAfterUpdate: EndpointEstablished = {
        candidate: args.establishedBeforeUpdate.candidate || postCounts.candidate > 0,
        baseline: args.establishedBeforeUpdate.baseline || postCounts.baseline > 0,
    };
    const postById = rowsById(args.post);
    const dispositions = args.pre
        .filter((building) => {
            const side = sideForOwner(building.owner, args.combatants);
            if (!side) return false;
            return postById.get(building.id)?.owner !== building.owner;
        })
        .map((building) =>
            classifyDisposition(args.tick, building, postById, events, args.combatants),
        );
    const dispositionsFor = (side: EndpointSide): BuildingDisposition[] =>
        dispositions.filter((entry) => entry.building.owner === args.combatants[side]);
    const candidateZeroingTransition =
        enabledBeforeUpdate && preCounts.baseline > 0 && postCounts.baseline === 0;
    const baselineZeroingTransition =
        enabledBeforeUpdate && preCounts.candidate > 0 && postCounts.candidate === 0;
    const zeroingDispositions = {
        candidate: candidateZeroingTransition ? dispositionsFor("baseline") : [],
        baseline: baselineZeroingTransition ? dispositionsFor("candidate") : [],
    };
    const candidatePhysicalWin =
        candidateZeroingTransition &&
        zeroingDispositions.candidate.length === preCounts.baseline &&
        zeroingDispositions.candidate.every((entry) => entry.validPhysicalDestruction);
    const baselinePhysicalWin =
        baselineZeroingTransition &&
        zeroingDispositions.baseline.length === preCounts.candidate &&
        zeroingDispositions.baseline.every((entry) => entry.validPhysicalDestruction);
    const status =
        candidatePhysicalWin && baselinePhysicalWin
            ? "simultaneous_draw"
            : candidatePhysicalWin
              ? "candidate_win"
              : baselinePhysicalWin
                ? "baseline_win"
                : "continue";
    const winner =
        status === "candidate_win"
            ? "candidate"
            : status === "baseline_win"
              ? "baseline"
              : status === "simultaneous_draw"
                ? "draw"
                : null;
    return {
        tick: args.tick,
        enabledBeforeUpdate,
        establishedAfterUpdate,
        preCounts,
        postCounts,
        candidateZeroingTransition,
        baselineZeroingTransition,
        candidatePhysicalWin,
        baselinePhysicalWin,
        status,
        winner,
        dispositions,
        zeroingDispositions,
    };
};

export const snapshotCombatantBuildings = (
    game: GameApi,
    combatants: LiteralEndpointCombatants,
): BuildingLedgerRow[] => {
    const names = new Set(Object.values(combatants));
    return game
        .getAllUnits((rules) => rules.type === ObjectType.Building)
        .map((id) => game.getUnitData(id))
        .filter((unit): unit is NonNullable<ReturnType<GameApi["getUnitData"]>> =>
            !!unit && names.has(unit.owner),
        )
        .map((unit) => ({
            id: unit.id,
            owner: unit.owner,
            rulesName: unit.rules.name,
            x: unit.tile.rx,
            y: unit.tile.ry,
            hitPoints: unit.hitPoints,
        }))
        .sort((left, right) => left.id - right.id);
};

export const toEndpointEvent = (event: ApiEvent): EndpointEvent | null => {
    if (event.type === ApiEventType.ObjectDestroy) {
        return {
            type: event.type,
            target: event.target,
            attackerPlayerName: event.attackerInfo?.playerName ?? null,
            attackerObjectId: event.attackerInfo?.objId ?? null,
            weaponName: event.attackerInfo?.weaponName ?? null,
        };
    }
    if (event.type === ApiEventType.ObjectUnspawn) {
        return { type: event.type, target: event.target };
    }
    if (event.type === ApiEventType.ObjectOwnerChange) {
        return {
            type: event.type,
            target: event.target,
            previousOwnerName: event.prevOwnerName,
            newOwnerName: event.newOwnerName,
        };
    }
    return null;
};

export class LiteralBuildingEliminationAdjudicator {
    private pre: BuildingLedgerRow[] | null = null;
    private events: EndpointEvent[] = [];
    private established: EndpointEstablished = { candidate: false, baseline: false };
    private dispositions: BuildingDisposition[] = [];

    constructor(private readonly combatants: LiteralEndpointCombatants) {}

    beginUpdate(game: GameApi): void {
        if (this.pre !== null) throw new Error("Literal endpoint update already began");
        this.pre = snapshotCombatantBuildings(game, this.combatants);
        this.events = [];
    }

    observe(event: ApiEvent): void {
        const endpointEvent = toEndpointEvent(event);
        if (endpointEvent) this.events.push(endpointEvent);
    }

    completeUpdate(game: GameApi, engineFinished: boolean): {
        evaluation: EndpointUpdateEvaluation;
        terminal: LiteralEndpointTerminal | null;
        technicalFailure: LiteralEndpointTechnicalFailure | null;
    } {
        if (this.pre === null) throw new Error("Literal endpoint update was not begun");
        const evaluation = evaluateLiteralBuildingUpdate({
            tick: game.getCurrentTick(),
            combatants: this.combatants,
            pre: this.pre,
            post: snapshotCombatantBuildings(game, this.combatants),
            events: this.events,
            establishedBeforeUpdate: this.established,
        });
        this.pre = null;
        this.events = [];
        this.established = evaluation.establishedAfterUpdate;
        this.dispositions.push(...evaluation.dispositions);
        const terminal =
            evaluation.status === "continue"
                ? null
                : {
                      endpointVersion: LITERAL_BUILDING_ELIMINATION_ENDPOINT_VERSION,
                      endpointSha256: LITERAL_BUILDING_ELIMINATION_ENDPOINT_SHA256,
                      endpoint: LITERAL_BUILDING_ELIMINATION_ENDPOINT,
                      tick: evaluation.tick,
                      status: evaluation.status,
                      winner: evaluation.winner as EndpointSide | "draw",
                      evaluation,
                      engineFinishedSameUpdate: engineFinished,
                  };
        const technicalFailure =
            engineFinished && terminal === null
                ? {
                      endpointVersion: LITERAL_BUILDING_ELIMINATION_ENDPOINT_VERSION,
                      endpointSha256: LITERAL_BUILDING_ELIMINATION_ENDPOINT_SHA256,
                      tick: evaluation.tick,
                      reason: "engine_finished_without_valid_literal_endpoint" as const,
                      evaluation,
                  }
                : null;
        return { evaluation, terminal, technicalFailure };
    }

    getEstablished(): EndpointEstablished {
        return { ...this.established };
    }

    getDispositionHistory(): BuildingDisposition[] {
        return this.dispositions.map((entry) => ({
            ...entry,
            building: { ...entry.building },
            matchedEvents: entry.matchedEvents.map((event) => ({ ...event })),
        }));
    }
}

export type QuitSuppressionAudit = {
    mode: "symmetric_no_forwarding";
    attempts: EndpointCounts;
    forwarded: EndpointCounts;
};

export const installLiteralEndpointInstrumentation = (
    bots: Record<EndpointSide, InspectableBaselineBot>,
    adjudicator: LiteralBuildingEliminationAdjudicator,
): { audit: QuitSuppressionAudit } => {
    const audit: QuitSuppressionAudit = {
        mode: "symmetric_no_forwarding",
        attempts: { candidate: 0, baseline: 0 },
        forwarded: { candidate: 0, baseline: 0 },
    };
    for (const side of ["candidate", "baseline"] as const) {
        const bot = bots[side];
        const originalStart = bot.onGameStart.bind(bot);
        bot.onGameStart = (game: GameApi): void => {
            originalStart(game);
            const actions = bot.lastPlayerActions;
            if (!actions) throw new Error(`Missing ${side} actions after onGameStart`);
            Object.defineProperty(actions, "quitGame", {
                configurable: true,
                writable: true,
                value: (): void => {
                    audit.attempts[side] += 1;
                },
            });
        };
        const originalEvent = bot.onGameEvent.bind(bot);
        bot.onGameEvent = (event: ApiEvent): void => {
            // The engine dispatches the same public event stream to both bots;
            // the adjudicator deduplicates the symmetric observations.
            adjudicator.observe(event);
            originalEvent(event);
        };
    }
    return { audit };
};
