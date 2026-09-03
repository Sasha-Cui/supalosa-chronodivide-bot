import { ApiEvent } from "@chronodivide/game-api";
import { createHash } from "node:crypto";
import fs from "node:fs";
import { finished as streamFinished } from "node:stream";
import { once } from "node:events";
import { createGzip, gunzipSync } from "node:zlib";
import {
    BuildingLedgerRow,
    EndpointEngineState,
    EndpointEvent,
    EndpointSide,
    LiteralEndpointCombatants,
    classifyLiteralEndpointCompletion,
    deduplicateEndpointEvents,
    evaluateLiteralBuildingUpdate,
    LITERAL_BUILDING_ELIMINATION_ENDPOINT_SHA256,
    LITERAL_BUILDING_ELIMINATION_ENDPOINT_VERSION,
    toEndpointEvent,
} from "./literalBuildingEliminationEndpoint.js";
import {
    LIVE_OWNED_ENDPOINT,
    LIVE_OWNED_ENDPOINT_SHA256,
    LIVE_OWNED_ENDPOINT_VERSION,
} from "./liveOwnedBuildingEliminationEndpointV6.js";
import { PassiveDualEndpointState } from "./passiveDualBuildingEndpoint.js";
import { PublicActionAuditSummary } from "./freshDualStudyInstrumentation.js";

export type FreshDualSnapshots = {
    legacy: BuildingLedgerRow[];
    live: BuildingLedgerRow[];
};
export type FreshDualLedgerUpdate = {
    tick: number;
    pre: FreshDualSnapshots;
    post: FreshDualSnapshots;
    events: EndpointEvent[];
    engine: EndpointEngineState;
    dualState: PassiveDualEndpointState;
};
export type FreshDualLedgerFinal = {
    stopReason: "dual_complete" | "technical_failure" | "tick_cap";
    updates: number;
    dualState: PassiveDualEndpointState;
    actionAudit: PublicActionAuditSummary;
    quitSuppression: {
        mode: "symmetric_no_forwarding";
        attempts: Record<EndpointSide, number>;
        forwarded: Record<EndpointSide, number>;
    };
};
export type FreshDualLedgerMetadata = {
    file: string;
    encoding: "gzip-jsonl-v1";
    records: number;
    plainBytes: number;
    gzipBytes: number;
    plainSha256: string;
    gzipSha256: string;
};
type HeaderRecord = {
    kind: "header";
    schemaVersion: 1;
    combatants: LiteralEndpointCombatants;
    frozenLimit: number;
    initialTick: number;
    initial: FreshDualSnapshots;
    initialEngine: EndpointEngineState;
    initialState: PassiveDualEndpointState;
};
type StepRecord = {
    kind: "step";
    tick: number;
    pre: FreshDualSnapshots;
    post: FreshDualSnapshots;
    events: EndpointEvent[];
    engine: EndpointEngineState;
    dualState: PassiveDualEndpointState;
};
type StableRecord = {
    kind: "stable";
    fromTick: number;
    toTick: number;
    snapshotsSha256: string;
    engine: EndpointEngineState;
    dualState: PassiveDualEndpointState;
};
type FinalRecord = { kind: "final"; value: FreshDualLedgerFinal };
type AbortRecord = { kind: "abort"; tick: number; error: string };
export type FreshDualLedgerRecord = HeaderRecord | StepRecord | StableRecord | FinalRecord | AbortRecord;

const canonical = (value: unknown): string => JSON.stringify(value);
const sha256 = (value: string | Buffer): string => createHash("sha256").update(value).digest("hex");
const clone = <T>(value: T): T => structuredClone(value);
const allEqual = (left: unknown, right: unknown): boolean => canonical(left) === canonical(right);

export const normalizeFreshDualEvents = (events: readonly ApiEvent[]): EndpointEvent[] =>
    deduplicateEndpointEvents(events.map(toEndpointEvent).filter((event): event is EndpointEvent => event !== null));

export class FreshDualEndpointLedgerWriter {
    private readonly output: fs.WriteStream;
    private readonly gzip = createGzip({ level: 9 });
    private readonly plainHash = createHash("sha256");
    private readonly gzipHash = createHash("sha256");
    private records = 0;
    private plainBytes = 0;
    private gzipBytes = 0;
    private ended = false;
    private tick: number;
    private snapshots: FreshDualSnapshots;
    private engine: EndpointEngineState;
    private state: PassiveDualEndpointState;
    private stable: { fromTick: number; toTick: number } | null = null;

    private constructor(
        readonly file: string,
        private readonly combatants: LiteralEndpointCombatants,
        private readonly frozenLimit: number,
        initialTick: number,
        initial: FreshDualSnapshots,
        initialEngine: EndpointEngineState,
        initialState: PassiveDualEndpointState,
    ) {
        this.tick = initialTick;
        this.snapshots = clone(initial);
        this.engine = clone(initialEngine);
        this.state = clone(initialState);
        this.output = fs.createWriteStream(file, { flags: "wx", mode: 0o600 });
        this.gzip.on("data", (chunk: Buffer) => {
            this.gzipHash.update(chunk);
            this.gzipBytes += chunk.length;
        });
        this.gzip.pipe(this.output);
    }

    static async create(
        file: string,
        combatants: LiteralEndpointCombatants,
        frozenLimit: number,
        initialTick: number,
        initial: FreshDualSnapshots,
        initialEngine: EndpointEngineState,
        initialState: PassiveDualEndpointState,
    ): Promise<FreshDualEndpointLedgerWriter> {
        if (!Number.isSafeInteger(frozenLimit) || frozenLimit <= 0) throw new Error("Positive ledger limit required");
        if (!Number.isSafeInteger(initialTick) || initialTick !== 0) throw new Error("Ledger must begin at tick zero");
        const writer = new FreshDualEndpointLedgerWriter(
            file, combatants, frozenLimit, initialTick, initial, initialEngine, initialState,
        );
        await writer.write({
            kind: "header",
            schemaVersion: 1,
            combatants: clone(combatants),
            frozenLimit,
            initialTick,
            initial: clone(initial),
            initialEngine: clone(initialEngine),
            initialState: clone(initialState),
        });
        return writer;
    }

    async appendUpdate(value: FreshDualLedgerUpdate): Promise<void> {
        this.assertOpen();
        if (value.tick !== this.tick + 1) throw new Error("Ledger update ticks must be contiguous");
        if (!allEqual(value.pre, this.snapshots)) throw new Error("Ledger pre-snapshot does not continue prior state");
        const material = value.tick === 1 ||
            !allEqual(value.pre, value.post) ||
            value.events.length > 0 ||
            !allEqual(value.engine, this.engine) ||
            !allEqual(value.dualState, this.state);
        if (material) {
            await this.flushStable();
            await this.write({ kind: "step", ...clone(value) });
        } else if (this.stable) {
            this.stable.toTick = value.tick;
        } else {
            this.stable = { fromTick: value.tick, toTick: value.tick };
        }
        this.tick = value.tick;
        this.snapshots = clone(value.post);
        this.engine = clone(value.engine);
        this.state = clone(value.dualState);
    }

    async finish(value: FreshDualLedgerFinal): Promise<FreshDualLedgerMetadata> {
        this.assertOpen();
        if (value.updates !== this.tick) throw new Error("Ledger final update count drifted");
        if (value.quitSuppression.forwarded.candidate !== 0 ||
            value.quitSuppression.forwarded.baseline !== 0) {
            throw new Error("Ledger cannot finalize after a forwarded resignation");
        }
        await this.flushStable();
        if (value.stopReason === "tick_cap") {
            if (value.updates !== this.frozenLimit || value.dualState.failed || !value.dualState.complete) {
                throw new Error("Ledger cap state is invalid");
            }
            this.state = clone(value.dualState);
        } else {
            if (!allEqual(value.dualState, this.state)) throw new Error("Ledger final state drifted");
            if (value.stopReason === "dual_complete" && (!value.dualState.complete || value.dualState.failed)) {
                throw new Error("Ledger dual-complete state is invalid");
            }
            if (value.stopReason === "technical_failure" && !value.dualState.failed) {
                throw new Error("Ledger technical-failure state is invalid");
            }
        }
        await this.write({ kind: "final", value: clone(value) });
        return this.close();
    }

    async abort(error: unknown): Promise<FreshDualLedgerMetadata> {
        this.assertOpen();
        await this.flushStable();
        await this.write({
            kind: "abort",
            tick: this.tick,
            error: error instanceof Error ? error.message : String(error),
        });
        return this.close();
    }

    private async flushStable(): Promise<void> {
        if (!this.stable) return;
        await this.write({
            kind: "stable",
            ...this.stable,
            snapshotsSha256: sha256(canonical(this.snapshots)),
            engine: clone(this.engine),
            dualState: clone(this.state),
        });
        this.stable = null;
    }

    private async write(record: FreshDualLedgerRecord): Promise<void> {
        const line = canonical(record) + "\n";
        this.plainHash.update(line);
        this.plainBytes += Buffer.byteLength(line);
        this.records += 1;
        if (!this.gzip.write(line)) await once(this.gzip, "drain");
    }

    private async close(): Promise<FreshDualLedgerMetadata> {
        this.ended = true;
        const completion = new Promise<void>((resolve, reject) => {
            streamFinished(this.output, (error) => error ? reject(error) : resolve());
        });
        this.gzip.end();
        await completion;
        return {
            file: this.file,
            encoding: "gzip-jsonl-v1",
            records: this.records,
            plainBytes: this.plainBytes,
            gzipBytes: this.gzipBytes,
            plainSha256: this.plainHash.digest("hex"),
            gzipSha256: this.gzipHash.digest("hex"),
        };
    }

    private assertOpen(): void {
        if (this.ended) throw new Error("Ledger is already closed");
    }
}

const v6Result = (value: ReturnType<typeof classifyLiteralEndpointCompletion>) => ({
    terminal: value.terminal ? {
        ...value.terminal,
        endpointVersion: LIVE_OWNED_ENDPOINT_VERSION,
        endpointSha256: LIVE_OWNED_ENDPOINT_SHA256,
        endpoint: LIVE_OWNED_ENDPOINT,
    } : null,
    technicalFailure: value.technicalFailure ? {
        ...value.technicalFailure,
        endpointVersion: LIVE_OWNED_ENDPOINT_VERSION,
        endpointSha256: LIVE_OWNED_ENDPOINT_SHA256,
        endpoint: LIVE_OWNED_ENDPOINT,
    } : null,
});

export const decodeFreshDualLedgerSync = (compressed: Buffer): FreshDualLedgerRecord[] => {
    const value = gunzipSync(compressed).toString("utf8");
    if (!value.endsWith("\n")) throw new Error("Ledger JSONL is not newline terminated");
    return value.trimEnd().split("\n").map((line) => JSON.parse(line) as FreshDualLedgerRecord);
};

export const verifyFreshDualLedgerRecords = (
    records: FreshDualLedgerRecord[],
): { updates: number; complete: boolean; aborted: boolean; final: FreshDualLedgerFinal | null } => {
    if (records.length < 2 || records[0].kind !== "header") throw new Error("Ledger header missing");
    const header = records[0];
    if (header.schemaVersion !== 1 || header.initialTick !== 0) throw new Error("Ledger header invalid");
    let tick = 0;
    let snapshots = clone(header.initial);
    let engine = clone(header.initialEngine);
    let state = clone(header.initialState);
    let established = {
        v5: { candidate: false, baseline: false },
        v6: { candidate: false, baseline: false },
    };
    let final: FreshDualLedgerFinal | null = null;
    let aborted = false;
    for (const record of records.slice(1)) {
        if (record.kind === "step") {
            if (record.tick !== tick + 1 || !allEqual(record.pre, snapshots)) throw new Error("Ledger step continuity failed");
            const events = deduplicateEndpointEvents(record.events);
            if (state.v5.firstResult === null && state.v5.technicalFailure === null) {
                const evaluation = evaluateLiteralBuildingUpdate({
                    tick: record.tick,
                    combatants: header.combatants,
                    pre: record.pre.legacy,
                    post: record.post.legacy,
                    events,
                    establishedBeforeUpdate: established.v5,
                });
                established.v5 = evaluation.establishedAfterUpdate;
                const result = classifyLiteralEndpointCompletion({ evaluation, engine: record.engine });
                if (result.terminal) state.v5.firstResult = result.terminal;
                if (result.technicalFailure) state.v5.technicalFailure = result.technicalFailure;
            }
            if (state.v6.firstResult === null && state.v6.technicalFailure === null) {
                const evaluation = evaluateLiteralBuildingUpdate({
                    tick: record.tick,
                    combatants: header.combatants,
                    pre: record.pre.live,
                    post: record.post.live,
                    events,
                    establishedBeforeUpdate: established.v6,
                });
                established.v6 = evaluation.establishedAfterUpdate;
                const result = v6Result(classifyLiteralEndpointCompletion({ evaluation, engine: record.engine }));
                if (result.terminal) state.v6.firstResult = result.terminal;
                if (result.technicalFailure) state.v6.technicalFailure = result.technicalFailure;
            }
            state.complete = (state.v5.firstResult !== null || state.v5.technicalFailure !== null) &&
                (state.v6.firstResult !== null || state.v6.technicalFailure !== null);
            state.failed = state.v5.technicalFailure !== null || state.v6.technicalFailure !== null;
            if (!allEqual(state, record.dualState)) throw new Error("Ledger endpoint replay diverged");
            tick = record.tick;
            snapshots = clone(record.post);
            engine = clone(record.engine);
        } else if (record.kind === "stable") {
            if (record.fromTick !== tick + 1 || record.toTick < record.fromTick) throw new Error("Stable run continuity failed");
            if (record.snapshotsSha256 !== sha256(canonical(snapshots)) ||
                !allEqual(record.engine, engine) || !allEqual(record.dualState, state)) {
                throw new Error("Stable run state drifted");
            }
            tick = record.toTick;
        } else if (record.kind === "final") {
            if (final || aborted || record.value.updates !== tick ||
                (record.value.stopReason !== "tick_cap" && !allEqual(record.value.dualState, state))) {
                throw new Error("Ledger final record drifted");
            }
            final = clone(record.value);
        } else if (record.kind === "abort") {
            if (final || aborted || record.tick !== tick) throw new Error("Ledger abort record drifted");
            aborted = true;
        } else {
            throw new Error("Unexpected second ledger header");
        }
    }
    if ((final === null) === !aborted) throw new Error("Ledger requires exactly one final or abort record");
    if (final?.stopReason === "tick_cap") {
        if (tick !== header.frozenLimit || final.updates !== tick) throw new Error("Ledger cap tick drifted");
        const capped = clone(state);
        if (capped.v5.firstResult === null && capped.v5.technicalFailure === null) {
            capped.v5.firstResult = {
                endpointVersion: LITERAL_BUILDING_ELIMINATION_ENDPOINT_VERSION,
                endpointSha256: LITERAL_BUILDING_ELIMINATION_ENDPOINT_SHA256,
                tick,
                status: "tick_cap_draw",
                winner: "draw",
            };
        }
        if (capped.v6.firstResult === null && capped.v6.technicalFailure === null) {
            capped.v6.firstResult = {
                endpointVersion: LIVE_OWNED_ENDPOINT_VERSION,
                endpointSha256: LIVE_OWNED_ENDPOINT_SHA256,
                endpoint: LIVE_OWNED_ENDPOINT,
                tick,
                status: "tick_cap_draw",
                winner: "draw",
            };
        }
        capped.complete = true;
        capped.failed = capped.v5.technicalFailure !== null || capped.v6.technicalFailure !== null;
        if (!allEqual(capped, final.dualState)) throw new Error("Ledger cap replay diverged");
    } else if (final && !allEqual(final.dualState, state)) {
        throw new Error("Ledger final endpoint state diverged");
    }
    if (final && (final.quitSuppression.forwarded.candidate !== 0 ||
        final.quitSuppression.forwarded.baseline !== 0)) {
        throw new Error("Ledger contains a forwarded resignation");
    }
    return { updates: tick, complete: final !== null, aborted, final };
};
