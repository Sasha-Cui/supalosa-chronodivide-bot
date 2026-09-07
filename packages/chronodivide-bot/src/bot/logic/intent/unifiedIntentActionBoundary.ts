import { ActionsApi, GameApi, OrderType } from "@chronodivide/game-api";
import crypto from "node:crypto";
import {
    UnifiedBestEffortDebugCall,
    UnifiedForwardedOrder,
    UnifiedIntentArbiter,
    UnifiedIntentArbiterOptions,
    UnifiedIntentScope,
    UnifiedIntentUpdateTelemetry,
} from "./unifiedIntentArbiter.js";

const ACTION_METHODS = [
    "placeBuilding",
    "sellObject",
    "sellBuilding",
    "toggleRepairWrench",
    "toggleAlliance",
    "pauseProduction",
    "resumeProduction",
    "queueForProduction",
    "unqueueFromProduction",
    "activateSuperWeapon",
    "orderUnits",
    "sayAll",
    "setGlobalDebugText",
    "setUnitDebugText",
    "quitGame",
] as const;

const DEBUG_METHODS = new Set<string>([
    "sayAll",
    "setGlobalDebugText",
    "setUnitDebugText",
]);

const PRODUCTION_METHODS = new Set<string>([
    "pauseProduction",
    "resumeProduction",
    "queueForProduction",
    "unqueueFromProduction",
]);

export const UNIFIED_INTENT_SCOPE_RUNNER = Symbol.for(
    "@supalosa/chronodivide-bot/unified-intent-scope-v1",
);

type ScopeRunner = <T>(scope: UnifiedIntentScope, callback: () => T) => T;
type ActionsRecord = Record<PropertyKey, unknown>;
type OriginalAction = (...args: unknown[]) => unknown;

const hash = (value: string): string =>
    crypto.createHash("sha256").update(value).digest("hex");

const debugKey = (method: string, args: readonly unknown[]): string => {
    const encoded = JSON.stringify(args);
    if (Buffer.byteLength(encoded) > 64 * 1024) {
        throw new Error("Unified intent debug arguments exceed 64 KiB");
    }
    return method + "|" + hash(encoded);
};

export const withUnifiedIntentScope = <T>(
    actions: ActionsApi,
    scope: UnifiedIntentScope,
    callback: () => T,
): T => {
    const runner = (actions as unknown as ActionsRecord)[UNIFIED_INTENT_SCOPE_RUNNER];
    return typeof runner === "function"
        ? (runner as ScopeRunner)(scope, callback)
        : callback();
};

export type UnifiedIntentBoundaryOptions = UnifiedIntentArbiterOptions & {
    telemetrySink?: (telemetry: UnifiedIntentUpdateTelemetry) => void;
};

export class UnifiedIntentActionBoundary {
    private readonly core: UnifiedIntentArbiter;
    private readonly originals = new Map<string, OriginalAction>();
    private readonly debugCalls = new Map<string, UnifiedBestEffortDebugCall>();
    private active = false;
    private previousActionWasProduction = false;
    private installed = false;
    private latestTelemetry: UnifiedIntentUpdateTelemetry | null = null;

    constructor(
        private readonly actions: ActionsApi,
        private readonly game: GameApi,
        private readonly playerName: string,
        private readonly options: UnifiedIntentBoundaryOptions,
    ) {
        this.core = new UnifiedIntentArbiter(options);
        this.install();
    }

    beginUpdate(tick: number): void {
        if (this.active) throw new Error("Unified intent boundary update is already active");
        this.active = true;
        this.previousActionWasProduction = false;
        this.debugCalls.clear();
        this.core.beginUpdate(tick);
    }

    withScope<T>(scope: UnifiedIntentScope, callback: () => T): T {
        return this.core.withScope(scope, callback);
    }

    flush(): UnifiedIntentUpdateTelemetry {
        if (!this.active) throw new Error("Unified intent boundary update is not active");
        try {
            const telemetry = this.core.flush(
                this.game,
                this.playerName,
                (order) => this.forwardOrder(order),
                [...this.debugCalls.values()],
            );
            this.latestTelemetry = telemetry;
            this.options.telemetrySink?.(structuredClone(telemetry));
            return telemetry;
        } finally {
            this.active = false;
            this.previousActionWasProduction = false;
            this.debugCalls.clear();
        }
    }

    getLatestTelemetry(): UnifiedIntentUpdateTelemetry | null {
        return this.latestTelemetry === null ? null : structuredClone(this.latestTelemetry);
    }

    revokePending(scope: UnifiedIntentScope, objectTargetId?: number): number {
        return this.core.revokePending(scope, objectTargetId);
    }

    uninstall(): void {
        if (this.active) throw new Error("Cannot uninstall an active unified intent boundary");
        if (!this.installed) return;
        const record = this.actions as unknown as ActionsRecord;
        for (const [method, original] of this.originals) {
            Object.defineProperty(record, method, {
                configurable: true,
                writable: true,
                value: original,
            });
        }
        delete record[UNIFIED_INTENT_SCOPE_RUNNER];
        this.originals.clear();
        this.installed = false;
    }

    private install(): void {
        if (this.installed) throw new Error("Unified intent boundary is already installed");
        const record = this.actions as unknown as ActionsRecord;
        for (const method of ACTION_METHODS) {
            const original = record[method];
            if (typeof original !== "function") {
                throw new Error("Unified intent public action is missing: " + method);
            }
            this.originals.set(method, original as OriginalAction);
        }
        for (const method of ACTION_METHODS) {
            const original = this.originals.get(method);
            if (!original) throw new Error("Unified intent original action disappeared");
            Object.defineProperty(record, method, {
                configurable: true,
                writable: true,
                value: (...args: unknown[]): unknown =>
                    this.intercept(method, original, args),
            });
        }
        Object.defineProperty(record, UNIFIED_INTENT_SCOPE_RUNNER, {
            configurable: true,
            value: <T>(scope: UnifiedIntentScope, callback: () => T): T =>
                this.withScope(scope, callback),
        });
        this.installed = true;
    }

    private intercept(method: typeof ACTION_METHODS[number], original: OriginalAction, args: unknown[]): unknown {
        if (!this.active) return original.apply(this.actions, args);
        if (method === "orderUnits") {
            this.previousActionWasProduction = false;
            if (!Array.isArray(args[0])) {
                throw new Error("Unified intent orderUnits unit IDs are invalid");
            }
            this.core.captureOrder(
                args[0] as number[],
                args[1] as OrderType,
                ...args.slice(2),
            );
            return undefined;
        }
        if (DEBUG_METHODS.has(method)) {
            this.previousActionWasProduction = false;
            const key = debugKey(method, args);
            const coalesced = this.debugCalls.has(key);
            this.core.recordDebugProposal(coalesced);
            if (!coalesced) {
                this.debugCalls.set(key, {
                    key,
                    forward: () => { original.apply(this.actions, args); },
                });
            }
            return undefined;
        }
        const production = PRODUCTION_METHODS.has(method);
        if (production && !this.previousActionWasProduction) {
            this.core.recordProductionBatch();
        }
        this.previousActionWasProduction = production;
        const value = original.apply(this.actions, args);
        this.core.recordImmediateGameplayNonorder();
        return value;
    }

    private forwardOrder(order: UnifiedForwardedOrder): void {
        const original = this.originals.get("orderUnits");
        if (!original) throw new Error("Unified intent original orderUnits is unavailable");
        if (order.target.kind === "none") {
            original.call(this.actions, order.unitIds, order.orderType);
        } else if (order.target.kind === "object") {
            original.call(this.actions, order.unitIds, order.orderType, order.target.objectId);
        } else {
            original.call(
                this.actions,
                order.unitIds,
                order.orderType,
                order.target.rx,
                order.target.ry,
                order.target.onBridge,
            );
        }
    }
}
