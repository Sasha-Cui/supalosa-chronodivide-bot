import { GameApi, OrderType } from "@chronodivide/game-api";
import crypto from "node:crypto";

export const UNIFIED_INTENT_TOTAL_CEILINGS = [75, 150, 300] as const;
export const UNIFIED_INTENT_GAMEPLAY_RESERVE = 35;
export const UNIFIED_INTENT_ROLLING_UPDATES = 900;
export const UNIFIED_INTENT_MAX_CHUNK = 128;
export const UNIFIED_INTENT_MAX_REQUESTED_IDS = 4_096;

export const UNIFIED_INTENT_SCOPES = [
    "terminal_objective",
    "emergency_defense",
    "home_guard",
    "objective_closeout",
    "tactical_assault",
    "route_sweep",
    "harassment",
    "baseline_core",
] as const;

export type UnifiedIntentScope = typeof UNIFIED_INTENT_SCOPES[number];

export type UnifiedIntentScopeSpec = {
    priority: number;
    retryTicks: number;
    pendingTtlTicks: number;
};

export const UNIFIED_INTENT_SCOPE_SPECS: Readonly<Record<UnifiedIntentScope, UnifiedIntentScopeSpec>> = {
    terminal_objective: { priority: 700, retryTicks: 1, pendingTtlTicks: 360 },
    emergency_defense: { priority: 600, retryTicks: 3, pendingTtlTicks: 90 },
    home_guard: { priority: 550, retryTicks: 6, pendingTtlTicks: 120 },
    objective_closeout: { priority: 500, retryTicks: 6, pendingTtlTicks: 360 },
    tactical_assault: { priority: 400, retryTicks: 12, pendingTtlTicks: 240 },
    route_sweep: { priority: 300, retryTicks: 30, pendingTtlTicks: 600 },
    harassment: { priority: 200, retryTicks: 60, pendingTtlTicks: 180 },
    baseline_core: { priority: 100, retryTicks: 30, pendingTtlTicks: 240 },
};

export type UnifiedIntentTarget =
    | { kind: "none" }
    | { kind: "object"; objectId: number }
    | { kind: "tile"; rx: number; ry: number; onBridge: boolean };

export type UnifiedOrderProposal = {
    tick: number;
    sequence: number;
    scope: UnifiedIntentScope;
    priority: number;
    retryTicks: number;
    expiresTick: number;
    unitIds: number[];
    orderType: OrderType;
    target: UnifiedIntentTarget;
    signature: string;
};

type UnifiedUnitIntent = Omit<UnifiedOrderProposal, "unitIds"> & {
    unitId: number;
};

export type UnifiedForwardedOrder = {
    tick: number;
    scope: UnifiedIntentScope;
    priority: number;
    unitIds: number[];
    orderType: OrderType;
    target: UnifiedIntentTarget;
    signature: string;
};

export type UnifiedIntentUpdateTelemetry = {
    tick: number;
    proposedCalls: number;
    proposedUnitIds: number;
    sameUnitConflicts: number;
    invalidUnitIds: number;
    invalidTargets: number;
    invalidTiles: number;
    duplicateSuppressions: number;
    supersededPending: number;
    expiredPending: number;
    revokedPending: number;
    deferredUnitIds: number;
    pendingUnitIds: number;
    productionBatches: number;
    debugProposals: number;
    debugCoalesced: number;
    debugForwarded: number;
    debugDropped: number;
    forwardedGroups: number;
    forwardedChunks: number;
    forwardedOrderCalls: number;
    forwardedUnitIds: number;
    rollingTotalCalls: number;
    rollingOrderCalls: number;
    rollingGameplayNonorderCalls: number;
    rollingDebugCalls: number;
    gameplayReserveOverflow: boolean;
    totalCeilingOverflow: boolean;
    proposalsByScope: Record<UnifiedIntentScope, number>;
    winningUnitsByScope: Record<UnifiedIntentScope, number>;
    forwardedUnitsByScope: Record<UnifiedIntentScope, number>;
    forwardedActionSha256: string;
};

export type UnifiedIntentArbiterOptions = {
    totalCeiling: typeof UNIFIED_INTENT_TOTAL_CEILINGS[number];
    gameplayReserve?: number;
    rollingUpdates?: number;
    maxChunk?: number;
};

export type UnifiedBestEffortDebugCall = {
    key: string;
    forward: () => void;
};

type HistoryRow = {
    tick: number;
    totalCalls: number;
    orderCalls: number;
    gameplayNonorderCalls: number;
    debugCalls: number;
};

type LastForwarded = {
    tick: number;
    signature: string;
};

type IntentGameView = Pick<
    GameApi, "getUnitData" | "getGameObjectData" | "areAlliedPlayers"> & {
    map: Pick<GameApi["map"], "getTile">;
};

const sha256 = (value: string): string =>
    crypto.createHash("sha256").update(value).digest("hex");

const emptyScopeCounts = (): Record<UnifiedIntentScope, number> => ({
    terminal_objective: 0,
    emergency_defense: 0,
    home_guard: 0,
    objective_closeout: 0,
    tactical_assault: 0,
    route_sweep: 0,
    harassment: 0,
    baseline_core: 0,
});

const requireSafeInteger = (label: string, value: unknown): number => {
    if (!Number.isSafeInteger(value)) {
        throw new Error("Unified intent " + label + " must be a safe integer");
    }
    return value as number;
};

const normalizeTarget = (args: readonly unknown[]): UnifiedIntentTarget => {
    if (args.length === 0) return { kind: "none" };
    if (args.length === 1) {
        const objectId = requireSafeInteger("object target", args[0]);
        if (objectId < 0) {
            throw new Error("Unified intent object target must be nonnegative");
        }
        return {
            kind: "object",
            objectId,
        };
    }
    if (args.length === 2 || args.length === 3) {
        const onBridge = args.length === 3 ? args[2] : false;
        if (typeof onBridge !== "boolean") {
            throw new Error("Unified intent bridge flag must be boolean");
        }
        return {
            kind: "tile",
            rx: requireSafeInteger("tile rx", args[0]),
            ry: requireSafeInteger("tile ry", args[1]),
            onBridge,
        };
    }
    throw new Error("Unified intent order overload is invalid");
};

const canonicalCommand = (
    scope: UnifiedIntentScope,
    orderType: OrderType,
    target: UnifiedIntentTarget,
): string => JSON.stringify({
    scope,
    priority: UNIFIED_INTENT_SCOPE_SPECS[scope].priority,
    orderType,
    target,
});

const compareCanonical = (left: string, right: string): number =>
    left < right ? -1 : left > right ? 1 : 0;

const compareIntent = (left: UnifiedUnitIntent, right: UnifiedUnitIntent): number =>
    left.priority - right.priority ||
    left.sequence - right.sequence ||
    compareCanonical(left.signature, right.signature);

const validateOptions = (options: UnifiedIntentArbiterOptions): Required<UnifiedIntentArbiterOptions> => {
    if (!UNIFIED_INTENT_TOTAL_CEILINGS.includes(options.totalCeiling)) {
        throw new Error("Unified intent total ceiling is not frozen");
    }
    const resolved = {
        totalCeiling: options.totalCeiling,
        gameplayReserve: options.gameplayReserve ?? UNIFIED_INTENT_GAMEPLAY_RESERVE,
        rollingUpdates: options.rollingUpdates ?? UNIFIED_INTENT_ROLLING_UPDATES,
        maxChunk: options.maxChunk ?? UNIFIED_INTENT_MAX_CHUNK,
    };
    if (
        resolved.gameplayReserve !== UNIFIED_INTENT_GAMEPLAY_RESERVE ||
        resolved.rollingUpdates !== UNIFIED_INTENT_ROLLING_UPDATES ||
        resolved.maxChunk !== UNIFIED_INTENT_MAX_CHUNK
    ) throw new Error("Unified intent fixed budget constants drifted");
    return resolved;
};

export class UnifiedIntentArbiter {
    private readonly options: Required<UnifiedIntentArbiterOptions>;
    private readonly history: HistoryRow[] = [];
    private readonly pending = new Map<number, UnifiedUnitIntent>();
    private readonly lastForwarded = new Map<number, LastForwarded>();
    private readonly scopeStack: UnifiedIntentScope[] = [];
    private proposals: UnifiedOrderProposal[] = [];
    private currentHistory: HistoryRow | null = null;
    private currentTelemetry: UnifiedIntentUpdateTelemetry | null = null;
    private lastTick = 0;
    private sequence = 0;

    constructor(options: UnifiedIntentArbiterOptions) {
        this.options = validateOptions(options);
    }

    beginUpdate(tickValue: number): void {
        const tick = requireSafeInteger("update", tickValue);
        if (tick < 1 || tick <= this.lastTick || this.currentHistory !== null) {
            throw new Error("Unified intent update clock drifted");
        }
        this.lastTick = tick;
        this.pruneHistory(tick);
        this.proposals = [];
        this.scopeStack.length = 0;
        this.currentHistory = {
            tick,
            totalCalls: 0,
            orderCalls: 0,
            gameplayNonorderCalls: 0,
            debugCalls: 0,
        };
        this.currentTelemetry = {
            tick,
            proposedCalls: 0,
            proposedUnitIds: 0,
            sameUnitConflicts: 0,
            invalidUnitIds: 0,
            invalidTargets: 0,
            invalidTiles: 0,
            duplicateSuppressions: 0,
            supersededPending: 0,
            expiredPending: 0,
            revokedPending: 0,
            deferredUnitIds: 0,
            pendingUnitIds: 0,
            productionBatches: 0,
            debugProposals: 0,
            debugCoalesced: 0,
            debugForwarded: 0,
            debugDropped: 0,
            forwardedGroups: 0,
            forwardedChunks: 0,
            forwardedOrderCalls: 0,
            forwardedUnitIds: 0,
            rollingTotalCalls: 0,
            rollingOrderCalls: 0,
            rollingGameplayNonorderCalls: 0,
            rollingDebugCalls: 0,
            gameplayReserveOverflow: false,
            totalCeilingOverflow: false,
            proposalsByScope: emptyScopeCounts(),
            winningUnitsByScope: emptyScopeCounts(),
            forwardedUnitsByScope: emptyScopeCounts(),
            forwardedActionSha256: sha256(""),
        };
        for (const [unitId, intent] of this.pending) {
            if (intent.expiresTick < tick) {
                this.pending.delete(unitId);
                this.currentTelemetry.expiredPending += 1;
            }
        }
    }

    withScope<T>(scope: UnifiedIntentScope, callback: () => T): T {
        if (!UNIFIED_INTENT_SCOPES.includes(scope)) {
            throw new Error("Unified intent scope is invalid");
        }
        this.scopeStack.push(scope);
        try {
            return callback();
        } finally {
            if (this.scopeStack.pop() !== scope) {
                throw new Error("Unified intent scope stack drifted");
            }
        }
    }

    captureOrder(
        unitIdsValue: readonly number[],
        orderTypeValue: OrderType,
        ...targetArgs: readonly unknown[]
    ): void {
        const history = this.requireCurrentHistory();
        const telemetry = this.requireCurrentTelemetry();
        const scope = this.scopeStack[this.scopeStack.length - 1];
        if (!scope) throw new Error("Unified intent order lacks a semantic scope");
        if (!Array.isArray(unitIdsValue) || unitIdsValue.length > UNIFIED_INTENT_MAX_REQUESTED_IDS) {
            throw new Error("Unified intent unit ID array is invalid");
        }
        const unitIds = [...new Set(unitIdsValue.map((value) =>
            requireSafeInteger("unit ID", value)))].sort((left, right) => left - right);
        if (unitIds.some((value) => value < 0)) {
            throw new Error("Unified intent unit IDs must be nonnegative");
        }
        const orderType = requireSafeInteger("order type", orderTypeValue) as OrderType;
        if (orderType < OrderType.Move || orderType > OrderType.PlaceBomb) {
            throw new Error("Unified intent order type is outside OrderType");
        }
        const target = normalizeTarget(targetArgs);
        const spec = UNIFIED_INTENT_SCOPE_SPECS[scope];
        this.sequence += 1;
        const signature = sha256(canonicalCommand(scope, orderType, target));
        this.proposals.push({
            tick: history.tick,
            sequence: this.sequence,
            scope,
            priority: spec.priority,
            retryTicks: spec.retryTicks,
            expiresTick: history.tick + spec.pendingTtlTicks - 1,
            unitIds,
            orderType,
            target,
            signature,
        });
        telemetry.proposedCalls += 1;
        telemetry.proposedUnitIds += unitIds.length;
        telemetry.proposalsByScope[scope] += 1;
    }

    recordImmediateGameplayNonorder(countValue = 1): void {
        const count = requireSafeInteger("gameplay non-order count", countValue);
        if (count < 0) throw new Error("Unified intent action count is negative");
        const history = this.requireCurrentHistory();
        history.gameplayNonorderCalls += count;
        history.totalCalls += count;
        this.updateOverflowFlags();
    }

    recordProductionBatch(): void {
        this.requireCurrentTelemetry().productionBatches += 1;
    }

    recordDebugProposal(coalesced: boolean): void {
        const telemetry = this.requireCurrentTelemetry();
        telemetry.debugProposals += 1;
        if (coalesced) telemetry.debugCoalesced += 1;
    }

    revokePending(scope: UnifiedIntentScope, objectTargetId?: number): number {
        let revoked = 0;
        for (const [unitId, intent] of this.pending) {
            if (
                intent.scope === scope &&
                (objectTargetId === undefined ||
                    (intent.target.kind === "object" && intent.target.objectId === objectTargetId))
            ) {
                this.pending.delete(unitId);
                revoked += 1;
            }
        }
        if (this.currentTelemetry) this.currentTelemetry.revokedPending += revoked;
        return revoked;
    }

    flush(
        game: IntentGameView,
        playerName: string,
        forward: (order: UnifiedForwardedOrder) => void,
        debugCalls: readonly UnifiedBestEffortDebugCall[] = [],
    ): UnifiedIntentUpdateTelemetry {
        const history = this.requireCurrentHistory();
        if (this.scopeStack.length !== 0) {
            throw new Error("Unified intent scope remains active at flush");
        }
        const telemetry = this.requireCurrentTelemetry();
        const candidates = new Map<number, UnifiedUnitIntent[]>();
        for (const intent of this.pending.values()) {
            const bucket = candidates.get(intent.unitId) ?? [];
            bucket.push(intent);
            candidates.set(intent.unitId, bucket);
        }
        for (const proposal of this.proposals) {
            for (const unitId of proposal.unitIds) {
                const bucket = candidates.get(unitId) ?? [];
                bucket.push({ ...proposal, unitId });
                candidates.set(unitId, bucket);
            }
        }
        const winners: UnifiedUnitIntent[] = [];
        for (const [unitId, unitCandidates] of candidates) {
            const valid = unitCandidates.filter((intent) =>
                this.validateIntent(game, playerName, intent, telemetry));
            if (valid.length === 0) {
                this.pending.delete(unitId);
                continue;
            }
            telemetry.sameUnitConflicts += Math.max(0, valid.length - 1);
            const winner = valid.reduce((best, intent) =>
                compareIntent(intent, best) > 0 ? intent : best);
            const previous = this.pending.get(unitId);
            if (previous && previous !== winner &&
                (previous.signature !== winner.signature || previous.sequence !== winner.sequence)) {
                telemetry.supersededPending += 1;
            }
            telemetry.winningUnitsByScope[winner.scope] += 1;
            const last = this.lastForwarded.get(unitId);
            if (
                last &&
                last.signature === winner.signature &&
                history.tick - last.tick < winner.retryTicks
            ) {
                telemetry.duplicateSuppressions += 1;
                this.pending.delete(unitId);
                continue;
            }
            winners.push(winner);
        }

        const groups = new Map<string, UnifiedUnitIntent[]>();
        for (const winner of winners) {
            const key = winner.priority.toString().padStart(4, "0") + "|" + winner.signature;
            const group = groups.get(key) ?? [];
            group.push(winner);
            groups.set(key, group);
        }
        const orderedGroups = [...groups.entries()]
            .sort((left, right) =>
                right[1][0].priority - left[1][0].priority ||
                compareCanonical(left[1][0].signature, right[1][0].signature));
        const forwardedRows: UnifiedForwardedOrder[] = [];
        for (const [, groupValue] of orderedGroups) {
            const group = groupValue.sort((left, right) => left.unitId - right.unitId);
            let forwardedGroup = false;
            for (let index = 0; index < group.length; index += this.options.maxChunk) {
                const chunk = group.slice(index, index + this.options.maxChunk);
                if (!this.orderBudgetAvailable()) {
                    for (const intent of chunk) this.pending.set(intent.unitId, intent);
                    telemetry.deferredUnitIds += chunk.length;
                    continue;
                }
                const first = chunk[0];
                const order: UnifiedForwardedOrder = {
                    tick: history.tick,
                    scope: first.scope,
                    priority: first.priority,
                    unitIds: chunk.map((intent) => intent.unitId),
                    orderType: first.orderType,
                    target: first.target,
                    signature: first.signature,
                };
                forward(order);
                forwardedRows.push(order);
                if (!forwardedGroup) {
                    telemetry.forwardedGroups += 1;
                    forwardedGroup = true;
                }
                history.orderCalls += 1;
                history.totalCalls += 1;
                telemetry.forwardedChunks += 1;
                telemetry.forwardedOrderCalls += 1;
                telemetry.forwardedUnitIds += chunk.length;
                telemetry.forwardedUnitsByScope[first.scope] += chunk.length;
                for (const intent of chunk) {
                    this.pending.delete(intent.unitId);
                    this.lastForwarded.set(intent.unitId, {
                        tick: history.tick,
                        signature: intent.signature,
                    });
                }
            }
        }
        for (const debug of [...debugCalls].sort((left, right) =>
            compareCanonical(left.key, right.key))) {
            if (this.debugBudgetAvailable()) {
                debug.forward();
                history.debugCalls += 1;
                history.totalCalls += 1;
                telemetry.debugForwarded += 1;
            } else {
                telemetry.debugDropped += 1;
            }
        }
        telemetry.pendingUnitIds = this.pending.size;
        const rolling = this.rollingCounts();
        telemetry.rollingTotalCalls = rolling.total;
        telemetry.rollingOrderCalls = rolling.order;
        telemetry.rollingGameplayNonorderCalls = rolling.gameplayNonorder;
        telemetry.rollingDebugCalls = rolling.debug;
        this.updateOverflowFlags();
        telemetry.forwardedActionSha256 = sha256(
            forwardedRows.map((row) => JSON.stringify(row)).join("\n") +
                (forwardedRows.length === 0 ? "" : "\n"),
        );
        this.history.push({ ...history });
        this.currentHistory = null;
        this.currentTelemetry = null;
        this.scopeStack.length = 0;
        this.proposals = [];
        return structuredClone(telemetry);
    }

    pendingCount(): number {
        return this.pending.size;
    }

    private validateIntent(
        game: IntentGameView,
        playerName: string,
        intent: UnifiedUnitIntent,
        telemetry: UnifiedIntentUpdateTelemetry,
    ): boolean {
        const unit = game.getUnitData(intent.unitId);
        if (!unit || unit.hitPoints <= 0 || unit.owner !== playerName) {
            telemetry.invalidUnitIds += 1;
            return false;
        }
        if (intent.target.kind === "object") {
            const target = game.getGameObjectData(intent.target.objectId);
            if (!target || (target.hitPoints !== undefined && target.hitPoints <= 0)) {
                telemetry.invalidTargets += 1;
                return false;
            }
            if (
                intent.scope === "terminal_objective" &&
                "owner" in target &&
                typeof target.owner === "string" &&
                (target.owner === playerName || game.areAlliedPlayers(playerName, target.owner))
            ) {
                telemetry.invalidTargets += 1;
                return false;
            }
        }
        if (
            intent.target.kind === "tile" &&
            !game.map.getTile(intent.target.rx, intent.target.ry)
        ) {
            telemetry.invalidTiles += 1;
            return false;
        }
        return true;
    }

    private orderBudgetAvailable(): boolean {
        const rolling = this.rollingCounts();
        return rolling.total < this.options.totalCeiling &&
            rolling.order < this.options.totalCeiling - this.options.gameplayReserve;
    }
    private debugBudgetAvailable(): boolean {
        const rolling = this.rollingCounts();
        return rolling.total < this.options.totalCeiling &&
            rolling.order + rolling.debug <
                this.options.totalCeiling - this.options.gameplayReserve;
    }


    private rollingCounts(): {
        total: number;
        order: number;
        gameplayNonorder: number;
        debug: number;
    } {
        const history = this.requireCurrentHistory();
        return [...this.history, history].reduce((result, row) => ({
            total: result.total + row.totalCalls,
            order: result.order + row.orderCalls,
            gameplayNonorder: result.gameplayNonorder + row.gameplayNonorderCalls,
            debug: result.debug + row.debugCalls,
        }), { total: 0, order: 0, gameplayNonorder: 0, debug: 0 });
    }

    private updateOverflowFlags(): void {
        if (!this.currentTelemetry || !this.currentHistory) return;
        const rolling = this.rollingCounts();
        this.currentTelemetry.gameplayReserveOverflow =
            rolling.gameplayNonorder > this.options.gameplayReserve;
        this.currentTelemetry.totalCeilingOverflow =
            rolling.total > this.options.totalCeiling;
    }

    private pruneHistory(tick: number): void {
        while (
            this.history.length > 0 &&
            this.history[0].tick < tick - this.options.rollingUpdates + 1
        ) this.history.shift();
        for (const [unitId, value] of this.lastForwarded) {
            if (value.tick < tick - this.options.rollingUpdates) {
                this.lastForwarded.delete(unitId);
            }
        }
    }

    private requireCurrentHistory(): HistoryRow {
        if (!this.currentHistory) throw new Error("Unified intent update is not active");
        return this.currentHistory;
    }

    private requireCurrentTelemetry(): UnifiedIntentUpdateTelemetry {
        if (!this.currentTelemetry) throw new Error("Unified intent update is not active");
        return this.currentTelemetry;
    }
}
