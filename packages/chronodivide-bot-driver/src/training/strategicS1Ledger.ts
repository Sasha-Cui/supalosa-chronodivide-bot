import { createHash } from "node:crypto";
import { gzipSync, gunzipSync } from "node:zlib";
import { S1Sample, natural } from "./strategicS1Observation.js";
import { exactFields, validateS1Sequence } from "./strategicS1Validation.js";
import { analyzeS1Episode } from "./strategicS1Analysis.js";
export const S1_LEDGER_LIMITS = {
    gzipBytes: 8 * 1024 * 1024,
    plainBytes: 64 * 1024 * 1024,
    recordBytes: 512 * 1024,
} as const;
export type S1LedgerIdentity = { caseIndex: number; requestedEngineSeed: number; maxUpdates: 3600 | 24000 };
export type S1EmbeddedLedger = {
    encoding: "strategic-s1-gzip-jsonl-base64-v1";
    records: number;
    gzipBytes: number;
    plainBytes: number;
    gzipSha256: string;
    plainSha256: string;
    data: string;
};
const hash = (x: string | Buffer) => createHash("sha256").update(x).digest("hex");
const require = (x: unknown, why: string) => {
    if (!x) throw new Error("S1 ledger: " + why);
};
function identity(x: S1LedgerIdentity) {
    exactFields(x, "caseIndex requestedEngineSeed maxUpdates");
    natural(x.caseIndex);
    require(x.caseIndex <= 204, "case index");
    const seed =
        x.caseIndex < 200 ? 3350120000 + x.caseIndex : x.caseIndex < 204 ? 3350121000 + x.caseIndex - 200 : 3350121100;
    require(x.requestedEngineSeed === seed, "seed");
    require(x.maxUpdates === (x.caseIndex >= 200 && x.caseIndex < 204 ? 3600 : 24000), "horizon");
}
const counts = (samples: S1Sample[]) => {
    const result: Record<string, number> = {};
    for (const s of samples)
        for (const [k, n] of Object.entries(s.window.bySideAndMethod)) result[k] = natural((result[k] ?? 0) + n);
    return Object.fromEntries(Object.entries(result).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
};
export function encodeS1Ledger(
    samples: S1Sample[],
    binding: S1LedgerIdentity,
    updates: number,
    publicCalls: { sha256: string; bySideAndMethod: Record<string, number> },
) {
    identity(binding);
    validateS1Sequence(samples, updates);
    require(updates <= binding.maxUpdates, "updates exceed caller horizon");
    require(/^[a-f0-9]{64}$/.test(publicCalls.sha256), "public action hash");
    const total = counts(samples),
        expected = Object.fromEntries(
            Object.entries(publicCalls.bySideAndMethod).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
        );
    require(JSON.stringify(total) === JSON.stringify(expected), "public action conservation");
    const analysis = analyzeS1Episode(samples, updates),
        header = {
            kind: "strategic-s1-header-v1",
            identity: binding,
            sampleInterval: 300,
            policy: "unchanged_strongbot",
            arbiterEnabled: false,
            combatants: { candidate: "OD1Candidate", baseline: "OD1Opponent" },
        };
    const final = {
        kind: "strategic-s1-final-v1",
        updates,
        samples: samples.length,
        publicCalls: { sha256: publicCalls.sha256, bySideAndMethod: total },
        analysisSha256: hash(JSON.stringify(analysis)),
    };
    const records = [header, ...samples, final].map((r) => JSON.stringify(r) + "\n");
    require(records.every((r) => Buffer.byteLength(r) <= S1_LEDGER_LIMITS.recordBytes), "record byte bound");
    const plain = Buffer.from(records.join(""));
    require(plain.length <= S1_LEDGER_LIMITS.plainBytes, "plain byte bound");
    const gzip = gzipSync(plain, { level: 9 });
    require(gzip.length <= S1_LEDGER_LIMITS.gzipBytes, "gzip byte bound");
    const ledger: S1EmbeddedLedger = {
        encoding: "strategic-s1-gzip-jsonl-base64-v1",
        records: records.length,
        gzipBytes: gzip.length,
        plainBytes: plain.length,
        gzipSha256: hash(gzip),
        plainSha256: hash(plain),
        data: gzip.toString("base64"),
    };
    return { ledger, analysis };
}
export function replayS1Ledger(ledger: S1EmbeddedLedger) {
    exactFields(ledger, "encoding records gzipBytes plainBytes gzipSha256 plainSha256 data");
    require(ledger.encoding === "strategic-s1-gzip-jsonl-base64-v1", "encoding");
    for (const k of ["records", "gzipBytes", "plainBytes"] as const) {
        natural(ledger[k]);
        require(ledger[k] > 0, "empty ledger");
    }
    require(ledger.gzipBytes <= S1_LEDGER_LIMITS.gzipBytes &&
        ledger.plainBytes <= S1_LEDGER_LIMITS.plainBytes, "byte bounds");
    require(/^[a-f0-9]{64}$/.test(ledger.gzipSha256) && /^[a-f0-9]{64}$/.test(ledger.plainSha256), "hash shape");
    require(typeof ledger.data === "string" &&
        ledger.data.length === 4 * Math.ceil(ledger.gzipBytes / 3), "base64 length");
    const gzip = Buffer.from(ledger.data, "base64");
    require(gzip.length === ledger.gzipBytes &&
        gzip.toString("base64") === ledger.data &&
        hash(gzip) === ledger.gzipSha256, "compressed identity");
    const plain = gunzipSync(gzip, { maxOutputLength: S1_LEDGER_LIMITS.plainBytes });
    require(plain.length === ledger.plainBytes &&
        hash(plain) === ledger.plainSha256 &&
        plain[plain.length - 1] === 10, "plain identity");
    const lines = plain.toString("utf8").split("\n");
    lines.pop();
    require(lines.length === ledger.records &&
        lines.every(
            (l) => l.length > 0 && !l.includes("\r") && Buffer.byteLength(l) + 1 <= S1_LEDGER_LIMITS.recordBytes,
        ), "record bounds");
    const decoded = lines.map((l) => JSON.parse(l));
    const header = decoded.shift(),
        final = decoded.pop();
    exactFields(header, "kind identity sampleInterval policy arbiterEnabled combatants");
    require(header.kind === "strategic-s1-header-v1" &&
        header.sampleInterval === 300 &&
        header.policy === "unchanged_strongbot" &&
        header.arbiterEnabled === false, "header");
    require(JSON.stringify(header.combatants) ===
        JSON.stringify({ candidate: "OD1Candidate", baseline: "OD1Opponent" }), "combatants");
    identity(header.identity);
    exactFields(final, "kind updates samples publicCalls analysisSha256");
    require(final.kind === "strategic-s1-final-v1", "final");
    exactFields(final.publicCalls, "sha256 bySideAndMethod");
    require(/^[a-f0-9]{64}$/.test(final.publicCalls.sha256), "public action hash");
    validateS1Sequence(decoded, final.updates);
    require(final.updates <= header.identity.maxUpdates &&
        final.samples === decoded.length, "complete sample population");
    require(JSON.stringify(counts(decoded)) === JSON.stringify(final.publicCalls.bySideAndMethod), "window totals");
    const analysis = analyzeS1Episode(decoded, final.updates);
    require(hash(JSON.stringify(analysis)) === final.analysisSha256, "analysis digest");
    return {
        complete: true as const,
        identity: header.identity as S1LedgerIdentity,
        samples: decoded as S1Sample[],
        analysis,
        final,
    };
}
