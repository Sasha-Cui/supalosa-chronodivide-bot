import { createHash } from "node:crypto";
import fs from "node:fs";
import { once } from "node:events";
import { createInterface } from "node:readline";
import { finished as streamFinished } from "node:stream";
import { createGzip, createGunzip } from "node:zlib";
import {
    PublicActionAuditSummary,
    normalizePublicValue,
} from "./freshDualStudyInstrumentation.js";
import { QuitSuppressionAudit } from "./literalBuildingEliminationEndpoint.js";

export type FreshDualCanaryTraceContext = {
    mapId: string;
    mapName: string;
    country: string;
    candidateSlot: 0 | 1;
    candidateStart: string;
    opponentStart: string;
    requestedEngineSeed: number;
};
export type FreshDualCanaryTraceFinal = {
    updates: 6000;
    observations: 6001;
    worldTrajectory: { sha256: string; snapshots: 6001 };
    actionAudit: PublicActionAuditSummary;
    quitSuppression: QuitSuppressionAudit;
};
export type FreshDualCanaryTraceMetadata = {
    file: string;
    encoding: "gzip-jsonl-v1";
    records: number;
    plainBytes: number;
    gzipBytes: number;
    plainSha256: string;
    gzipSha256: string;
};
type Header = {
    kind: "header";
    schemaVersion: 1;
    context: FreshDualCanaryTraceContext;
};
type Observation = {
    kind: "observation";
    index: number;
    update: number;
    publicWorldSha256: string;
};
type Final = { kind: "final"; value: FreshDualCanaryTraceFinal };
type Abort = { kind: "abort"; observations: number; technicalError: string };
type RecordValue = Header | Observation | Final | Abort;

const hash = (value: string | Buffer): string => createHash("sha256").update(value).digest("hex");
const prohibited = (value: unknown): void => {
    if (!value || typeof value !== "object") return;
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
        if (/winner|defeat|score|terminal|winrate|losses|draws|ranking/i.test(key)) {
            throw new Error(`Prohibited compressed-canary field ${key}`);
        }
        prohibited(child);
    }
};
const serialize = (value: unknown): string => JSON.stringify(value);
export const hashFreshDualPublicSnapshot = (snapshot: unknown): string =>
    hash(serialize(normalizePublicValue(snapshot)));

export class FreshDualCanaryTraceWriter {
    private readonly output: fs.WriteStream;
    private readonly gzip = createGzip({ level: 9 });
    private readonly plainHash = createHash("sha256");
    private readonly gzipHash = createHash("sha256");
    private records = 0;
    private plainBytes = 0;
    private gzipBytes = 0;
    private observations = 0;
    private ended = false;

    private constructor(
        readonly file: string,
        readonly context: FreshDualCanaryTraceContext,
    ) {
        prohibited(context);
        this.output = fs.createWriteStream(file, { flags: "wx", mode: 0o600 });
        this.gzip.on("data", (chunk: Buffer) => {
            this.gzipHash.update(chunk);
            this.gzipBytes += chunk.length;
        });
        this.gzip.pipe(this.output);
    }

    static async create(
        file: string,
        context: FreshDualCanaryTraceContext,
    ): Promise<FreshDualCanaryTraceWriter> {
        if (fs.existsSync(file)) throw new Error("Compressed canary trace path already exists");
        const writer = new FreshDualCanaryTraceWriter(file, structuredClone(context));
        await writer.write({ kind: "header", schemaVersion: 1, context: structuredClone(context) });
        return writer;
    }

    async observe(update: number, snapshot: unknown): Promise<void> {
        this.assertOpen();
        if (!Number.isSafeInteger(update) || update !== this.observations) {
            throw new Error("Compressed canary observations must be contiguous from update zero");
        }
        await this.write({
            kind: "observation",
            index: this.observations,
            update,
            publicWorldSha256: hashFreshDualPublicSnapshot(snapshot),
        });
        this.observations += 1;
    }

    async finish(value: FreshDualCanaryTraceFinal): Promise<FreshDualCanaryTraceMetadata> {
        this.assertOpen();
        if (value.updates !== 6000 || value.observations !== 6001 ||
            value.worldTrajectory.snapshots !== 6001 || this.observations !== 6001) {
            throw new Error("Compressed canary final horizon drifted");
        }
        if (value.quitSuppression.forwarded.candidate !== 0 ||
            value.quitSuppression.forwarded.baseline !== 0) {
            throw new Error("Compressed canary cannot contain a forwarded resignation");
        }
        await this.write({ kind: "final", value: structuredClone(value) });
        return this.close();
    }

    async abort(error: unknown): Promise<FreshDualCanaryTraceMetadata> {
        this.assertOpen();
        await this.write({
            kind: "abort",
            observations: this.observations,
            technicalError: error instanceof Error ? error.message : String(error),
        });
        return this.close();
    }

    private async write(value: RecordValue): Promise<void> {
        prohibited(value);
        const line = serialize(value) + "\n";
        this.plainHash.update(line);
        this.plainBytes += Buffer.byteLength(line);
        this.records += 1;
        if (!this.gzip.write(line)) await once(this.gzip, "drain");
    }

    private async close(): Promise<FreshDualCanaryTraceMetadata> {
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
        if (this.ended) throw new Error("Compressed canary trace is already closed");
    }
}

export const verifyFreshDualCanaryTraceFile = async (
    file: string,
    expected: FreshDualCanaryTraceMetadata,
    expectedContext: FreshDualCanaryTraceContext,
    expectedFinal: FreshDualCanaryTraceFinal,
): Promise<{ records: number; observations: number; final: FreshDualCanaryTraceFinal }> => {
    if (expected.file !== file || expected.encoding !== "gzip-jsonl-v1") {
        throw new Error("Compressed canary trace metadata path drifted");
    }
    const stat = fs.lstatSync(file);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size !== expected.gzipBytes) {
        throw new Error("Compressed canary trace is not an exact regular-file match");
    }
    const compressedHash = createHash("sha256");
    const plainHash = createHash("sha256");
    let compressedBytes = 0;
    let plainBytes = 0;
    let lastByte: number | null = null;
    const input = fs.createReadStream(file);
    input.on("data", (chunk: Buffer) => {
        compressedHash.update(chunk);
        compressedBytes += chunk.length;
    });
    const gunzip = createGunzip();
    gunzip.on("data", (chunk: Buffer) => {
        plainHash.update(chunk);
        plainBytes += chunk.length;
        if (chunk.length) lastByte = chunk[chunk.length - 1];
    });
    input.pipe(gunzip);
    const lines = createInterface({ input: gunzip, crlfDelay: Infinity });
    let records = 0;
    let observations = 0;
    let final: FreshDualCanaryTraceFinal | null = null;
    let ended = false;
    for await (const line of lines) {
        if (!line.length || ended) throw new Error("Compressed canary record order invalid");
        const value = JSON.parse(line) as RecordValue;
        prohibited(value);
        if (records === 0) {
            if (value.kind !== "header" || value.schemaVersion !== 1 ||
                serialize(value.context) !== serialize(expectedContext)) {
                throw new Error("Compressed canary header drifted");
            }
        } else if (value.kind === "observation") {
            if (value.index !== observations || value.update !== observations ||
                !/^[0-9a-f]{64}$/.test(value.publicWorldSha256)) {
                throw new Error("Compressed canary observation drifted");
            }
            observations += 1;
        } else if (value.kind === "final") {
            if (serialize(value.value) !== serialize(expectedFinal)) {
                throw new Error("Compressed canary final summary drifted");
            }
            final = structuredClone(value.value);
            ended = true;
        } else if (value.kind === "abort") {
            throw new Error("Compressed canary trace contains an abort marker");
        } else {
            throw new Error("Compressed canary record kind drifted");
        }
        records += 1;
    }
    if (!ended || !final || observations !== 6001 || records !== 6003 || lastByte !== 10) {
        throw new Error("Compressed canary trace is incomplete");
    }
    if (compressedBytes !== expected.gzipBytes || plainBytes !== expected.plainBytes ||
        compressedHash.digest("hex") !== expected.gzipSha256 ||
        plainHash.digest("hex") !== expected.plainSha256 ||
        records !== expected.records) {
        throw new Error("Compressed canary checksum, byte, or record count drifted");
    }
    return { records, observations, final };
};
