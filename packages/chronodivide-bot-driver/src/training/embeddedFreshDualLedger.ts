import { createHash } from "node:crypto";
import { once } from "node:events";
import { Readable } from "node:stream";
import { createGzip, createGunzip } from "node:zlib";
import { createInterface } from "node:readline";
import {
    FreshDualLedgerRecord, FreshDualLedgerUpdate, FreshDualLedgerFinal, FreshDualSnapshots,
    FreshDualLedgerRecordVerifier,
} from "./freshDualEndpointLedger.js";
import { EndpointEngineState, LiteralEndpointCombatants } from "./literalBuildingEliminationEndpoint.js";
import { PassiveDualEndpointState } from "./passiveDualBuildingEndpoint.js";

// Two base64 payloads remain below the frozen 32 MiB pair limit (checked again at publication).
export const OD1_LEDGER_LIMITS = Object.freeze({
    gzipBytes: 11 * 1024 * 1024,
    plainBytes: 512 * 1024 * 1024,
    recordBytes: 4 * 1024 * 1024,
});
export type EmbeddedFreshDualLedger = {
    encoding: "gzip-jsonl-base64-v1";
    records: number;
    plainBytes: number;
    gzipBytes: number;
    plainSha256: string;
    gzipSha256: string;
    data: string;
};
type Limits = typeof OD1_LEDGER_LIMITS;
const canonical = (value: unknown): string => JSON.stringify(value);
const equal = (left: unknown, right: unknown): boolean => canonical(left) === canonical(right);
const hash = (value: string | Buffer): string => createHash("sha256").update(value).digest("hex");
const clone = <T>(value: T): T => structuredClone(value);

/** The existing delta/event encoding, streamed into a bounded in-memory gzip sink. */
export class EmbeddedFreshDualLedgerWriter {
    private readonly gzip = createGzip({ level: 9 });
    private readonly chunks: Buffer[] = [];
    private readonly digest = createHash("sha256");
    private readonly completion: Promise<void>;
    private failure: Error | null = null;
    private closed = false;
    private tick = 0;
    private count = 0;
    private plainBytes = 0;
    private gzipBytes = 0;
    private snapshots: FreshDualSnapshots;
    private engine: EndpointEngineState;
    private state: PassiveDualEndpointState;
    private stable: { fromTick: number; toTick: number } | null = null;

    private constructor(
        private readonly frozenLimit: number,
        initial: FreshDualSnapshots,
        engine: EndpointEngineState,
        state: PassiveDualEndpointState,
        private readonly limits: Limits,
    ) {
        this.snapshots = clone(initial);
        this.engine = clone(engine);
        this.state = clone(state);
        // Install handlers immediately; stream failures never become unhandled rejections.
        this.completion = new Promise((resolve) => {
            this.gzip.once("error", (error) => { this.failure = error; resolve(); });
            this.gzip.once("end", resolve);
        });
        this.gzip.on("data", (chunk: Buffer) => {
            this.gzipBytes += chunk.length;
            if (this.gzipBytes > limits.gzipBytes) {
                this.gzip.destroy(new Error("Embedded ledger compressed byte bound exceeded"));
            } else {
                this.chunks.push(chunk);
            }
        });
    }

    static async create(
        combatants: LiteralEndpointCombatants,
        frozenLimit: number,
        initial: FreshDualSnapshots,
        engine: EndpointEngineState,
        state: PassiveDualEndpointState,
        limits: Limits = OD1_LEDGER_LIMITS,
    ): Promise<EmbeddedFreshDualLedgerWriter> {
        if (!Number.isSafeInteger(frozenLimit) || frozenLimit < 1 ||
            Object.values(limits).some((value) => !Number.isSafeInteger(value) || value < 1) ||
            state.complete || state.failed ||
            state.v5.firstResult !== null || state.v6.firstResult !== null ||
            state.v5.technicalFailure !== null || state.v6.technicalFailure !== null ||
            engine.finished || engine.defeated.candidate || engine.defeated.baseline) {
            throw new Error("Embedded ledger initial state or limits invalid");
        }
        const writer = new EmbeddedFreshDualLedgerWriter(frozenLimit, initial, engine, state, limits);
        try {
            await writer.write({
                kind: "header", schemaVersion: 1, combatants: clone(combatants), frozenLimit,
                initialTick: 0, initial: clone(initial), initialEngine: clone(engine),
                initialState: clone(state),
            });
            return writer;
        } catch (error) {
            writer.dispose();
            throw error;
        }
    }

    async appendUpdate(value: FreshDualLedgerUpdate): Promise<void> {
        this.assertOpen();
        if (value.tick !== this.tick + 1 || value.tick > this.frozenLimit ||
            !equal(value.pre, this.snapshots)) throw new Error("Embedded ledger continuity failed");
        const material = value.tick === 1 || !equal(value.pre, value.post) ||
            value.events.length > 0 || !equal(value.engine, this.engine) ||
            !equal(value.dualState, this.state);
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

    async finish(value: FreshDualLedgerFinal): Promise<EmbeddedFreshDualLedger> {
        this.assertOpen();
        if (value.updates !== this.tick || value.quitSuppression.forwarded.candidate !== 0 ||
            value.quitSuppression.forwarded.baseline !== 0 ||
            (value.stopReason === "tick_cap"
                ? value.updates !== this.frozenLimit || value.dualState.failed || !value.dualState.complete
                : !equal(value.dualState, this.state) ||
                    (value.stopReason === "dual_complete" && (!value.dualState.complete || value.dualState.failed)) ||
                    (value.stopReason === "technical_failure" && !value.dualState.failed))) {
            throw new Error("Embedded ledger final state invalid");
        }
        await this.flushStable();
        await this.write({ kind: "final", value: clone(value) });
        this.closed = true;
        this.gzip.end();
        await this.completion;
        if (this.failure) throw this.failure;
        const compressed = Buffer.concat(this.chunks, this.gzipBytes);
        return {
            encoding: "gzip-jsonl-base64-v1", records: this.count, plainBytes: this.plainBytes,
            gzipBytes: this.gzipBytes, plainSha256: this.digest.digest("hex"),
            gzipSha256: hash(compressed), data: compressed.toString("base64"),
        };
    }

    dispose(): void {
        this.closed = true;
        this.gzip.destroy();
        this.chunks.length = 0;
    }

    private assertOpen(): void {
        if (this.failure) throw this.failure;
        if (this.closed) throw new Error("Embedded ledger already closed");
    }
    private async flushStable(): Promise<void> {
        if (!this.stable) return;
        await this.write({
            kind: "stable", ...this.stable, snapshotsSha256: hash(canonical(this.snapshots)),
            engine: clone(this.engine), dualState: clone(this.state),
        });
        this.stable = null;
    }
    private async write(record: FreshDualLedgerRecord): Promise<void> {
        this.assertOpen();
        const line = canonical(record) + "\n";
        const bytes = Buffer.byteLength(line);
        if (bytes > this.limits.recordBytes || this.plainBytes + bytes > this.limits.plainBytes) {
            throw new Error("Embedded ledger plain/record byte bound exceeded");
        }
        this.digest.update(line);
        this.plainBytes += bytes;
        this.count += 1;
        if (!this.gzip.write(line)) {
            await Promise.race([once(this.gzip, "drain"), this.completion]);
        }
        if (this.failure) throw this.failure;
    }
}

/** Streaming replay: never inflate all 512 MiB or retain a full array of decoded records. */
export const verifyEmbeddedFreshDualLedger = async (
    value: EmbeddedFreshDualLedger,
    limits: Limits = OD1_LEDGER_LIMITS,
): Promise<ReturnType<FreshDualLedgerRecordVerifier["finish"]>> => {
    if (value.encoding !== "gzip-jsonl-base64-v1" ||
        ![value.records, value.plainBytes, value.gzipBytes].every((n) => Number.isSafeInteger(n) && n > 0) ||
        value.plainBytes > limits.plainBytes || value.gzipBytes > limits.gzipBytes ||
        !/^[0-9a-f]{64}$/.test(value.plainSha256) || !/^[0-9a-f]{64}$/.test(value.gzipSha256) ||
        value.data.length !== 4 * Math.ceil(value.gzipBytes / 3)) {
        throw new Error("Embedded ledger metadata or bounds invalid");
    }
    const compressed = Buffer.from(value.data, "base64");
    if (compressed.length !== value.gzipBytes || compressed.toString("base64") !== value.data ||
        hash(compressed) !== value.gzipSha256) throw new Error("Embedded ledger compressed checksum invalid");
    const input = Readable.from([compressed]);
    const gunzip = createGunzip();
    let failure: Error | null = null;
    gunzip.on("error", (error) => { failure = error; });
    input.pipe(gunzip);
    const lines = createInterface({ input: gunzip, crlfDelay: Infinity });
    const digest = createHash("sha256");
    const verifier = new FreshDualLedgerRecordVerifier();
    let bytes = 0;
    let recordBytes = 0;
    let records = 0;
    let lastByte = -1;
    gunzip.on("data", (chunk: Buffer) => {
        digest.update(chunk);
        bytes += chunk.length;
        for (let offset = 0; offset < chunk.length;) {
            const newline = chunk.indexOf(10, offset);
            const end = newline < 0 ? chunk.length : newline + 1;
            recordBytes += end - offset;
            if (recordBytes > limits.recordBytes) {
                gunzip.destroy(new Error("Embedded ledger inflated record bound exceeded"));
                return;
            }
            if (newline >= 0) recordBytes = 0;
            offset = end;
        }
        lastByte = chunk[chunk.length - 1];
        if (bytes > value.plainBytes || bytes > limits.plainBytes) {
            gunzip.destroy(new Error("Embedded ledger inflated byte bound exceeded"));
        }
    });
    try {
        for await (const line of lines) {
            if (failure) throw failure;
            if (!line.length || line.includes("\r")) throw new Error("Embedded ledger JSONL invalid");
            const record = JSON.parse(line) as FreshDualLedgerRecord;
            if (records === 0 && (record.kind !== "header" ||
                record.initialTick !== 0 || !Number.isSafeInteger(record.frozenLimit) || record.frozenLimit < 1 ||
                record.initialState.complete || record.initialState.failed ||
                record.initialState.v5.firstResult !== null || record.initialState.v6.firstResult !== null ||
                record.initialState.v5.technicalFailure !== null || record.initialState.v6.technicalFailure !== null ||
                record.initialEngine.finished || record.initialEngine.defeated.candidate ||
                record.initialEngine.defeated.baseline)) {
                throw new Error("Embedded ledger replay requires a clean tick-zero header");
            }
            verifier.accept(record);
            records += 1;
        }
        if (failure) throw failure;
        if (lastByte !== 10 || bytes !== value.plainBytes || records !== value.records ||
            digest.digest("hex") !== value.plainSha256) throw new Error("Embedded ledger plain checksum invalid");
        return verifier.finish();
    } finally {
        lines.close();
        input.destroy();
        gunzip.destroy();
    }
};
