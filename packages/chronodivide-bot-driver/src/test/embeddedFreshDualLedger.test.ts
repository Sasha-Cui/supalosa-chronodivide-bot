import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { gzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import {
    EmbeddedFreshDualLedgerWriter, verifyEmbeddedFreshDualLedger, OD1_LEDGER_LIMITS,
} from "../training/embeddedFreshDualLedger.js";
import {
    FreshDualEndpointLedgerWriter, FreshDualLedgerFinal, FreshDualLedgerUpdate,
    decodeFreshDualLedgerSync,
} from "../training/freshDualEndpointLedger.js";
import {
    LITERAL_BUILDING_ELIMINATION_ENDPOINT_SHA256, LITERAL_BUILDING_ELIMINATION_ENDPOINT_VERSION,
    classifyLiteralEndpointCompletion, evaluateLiteralBuildingUpdate,
} from "../training/literalBuildingEliminationEndpoint.js";
import {
    LIVE_OWNED_ENDPOINT, LIVE_OWNED_ENDPOINT_SHA256, LIVE_OWNED_ENDPOINT_VERSION,
} from "../training/liveOwnedBuildingEliminationEndpointV6.js";
import { PassiveDualEndpointState } from "../training/passiveDualBuildingEndpoint.js";
const hash = (value: Buffer) => createHash("sha256").update(value).digest("hex");
const combatants = { candidate: "Candidate", baseline: "Baseline" };
const rows = [{ id: 1, owner: "Candidate", rulesName: "GACNST", x: 1, y: 2, hitPoints: 100 },
    { id: 2, owner: "Baseline", rulesName: "NACNST", x: 3, y: 4, hitPoints: 100 }];
const initial = { legacy: rows, live: rows };
const engine = { finished: false, defeated: { candidate: false, baseline: false } };
const state = (): PassiveDualEndpointState => ({
    v5: { firstResult: null, technicalFailure: null }, v6: { firstResult: null, technicalFailure: null },
    complete: false, failed: false,
});
const audit = { sha256: "a".repeat(64), callCount: 0, bySideAndMethod: {},
    zeroHealthBuildingTargetRequests: { count: 0, first: null, last: null, bySideAndRulesName: {} } };
const quit = { mode: "symmetric_no_forwarding" as const, attempts: { candidate: 0, baseline: 0 },
    forwarded: { candidate: 0, baseline: 0 } };
const step = (tick: number): FreshDualLedgerUpdate => ({
    tick, pre: initial, post: initial, events: [], engine, dualState: state(),
});
const final = (): FreshDualLedgerFinal => {
    const capped = state();
    capped.v5.firstResult = { endpointVersion: LITERAL_BUILDING_ELIMINATION_ENDPOINT_VERSION,
        endpointSha256: LITERAL_BUILDING_ELIMINATION_ENDPOINT_SHA256,
        tick: 3, status: "tick_cap_draw", winner: "draw" };
    capped.v6.firstResult = { endpointVersion: LIVE_OWNED_ENDPOINT_VERSION,
        endpointSha256: LIVE_OWNED_ENDPOINT_SHA256, endpoint: LIVE_OWNED_ENDPOINT,
        tick: 3, status: "tick_cap_draw", winner: "draw" };
    capped.complete = true;
    return { updates: 3, stopReason: "tick_cap", dualState: capped, actionAudit: audit, quitSuppression: quit };
};
const create = (limits = OD1_LEDGER_LIMITS) =>
    EmbeddedFreshDualLedgerWriter.create(combatants, 3, initial, engine, state(), limits);
const capLedger = async () => {
    const writer = await create();
    for (let tick = 1; tick <= 3; tick++) await writer.appendUpdate(step(tick));
    return writer.finish(final());
};
describe("bounded embedded dual-endpoint ledger", () => {
    it("matches the validated file writer byte-for-byte and independently replays its cap", async () => {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), "od1-ledger-"));
        try {
            const file = path.join(dir, "ledger.gz");
            const old = await FreshDualEndpointLedgerWriter.create(file, combatants, 3, 0, initial, engine, state());
            const embedded = await create();
            for (let tick = 1; tick <= 3; tick++) {
                await old.appendUpdate(step(tick));
                await embedded.appendUpdate(step(tick));
            }
            const oldMeta = await old.finish(final());
            const value = await embedded.finish(final());
            expect(Buffer.from(value.data, "base64")).toEqual(fs.readFileSync(file));
            expect(value.plainSha256).toBe(oldMeta.plainSha256);
            expect(value.records).toBe(4);
            expect(await verifyEmbeddedFreshDualLedger(value)).toMatchObject({
                complete: true, aborted: false, updates: 3, final: final(),
            });
        } finally { fs.rmSync(dir, { recursive: true, force: true }); }
    });
    it("preserves a v6 physical win before the v5 rubble cap without rewriting the first result", async () => {
        const writer = await create();
        await writer.appendUpdate(step(1));
        const post = { legacy: [rows[0], { ...rows[1], hitPoints: 0 }], live: [rows[0]] };
        const events = [{ type: 3, target: 2, attackerPlayerName: "Candidate",
            attackerObjectId: 44, weaponName: "120mm" }] as any;
        const classified = classifyLiteralEndpointCompletion({
            evaluation: evaluateLiteralBuildingUpdate({ tick: 2, combatants, pre: initial.live,
                post: post.live, events, establishedBeforeUpdate: { candidate: true, baseline: true } }),
            engine,
        });
        expect(classified.terminal?.winner).toBe("candidate");
        const early = state();
        early.v6.firstResult = { ...classified.terminal!, endpointVersion: LIVE_OWNED_ENDPOINT_VERSION,
            endpointSha256: LIVE_OWNED_ENDPOINT_SHA256, endpoint: LIVE_OWNED_ENDPOINT };
        await writer.appendUpdate({ tick: 2, pre: initial, post, events, engine, dualState: early });
        await writer.appendUpdate({ tick: 3, pre: post, post, events: [], engine, dualState: early });
        const end = final(); end.dualState.v6 = early.v6;
        const value = await writer.finish(end);
        const replay = await verifyEmbeddedFreshDualLedger(value);
        expect(replay.final?.dualState.v6.firstResult?.winner).toBe("candidate");
        expect(replay.final?.dualState.v6.firstResult?.tick).toBe(2);
        expect(replay.final?.dualState.v5.firstResult?.winner).toBe("draw");
    });
    it("rejects changed payloads and metadata without accepting endpoint claims", async () => {
        const value = await capLedger();
        await expect(verifyEmbeddedFreshDualLedger({ ...value, gzipSha256: "0".repeat(64) })).rejects.toThrow(/checksum/);
        await expect(verifyEmbeddedFreshDualLedger({ ...value, plainSha256: "0".repeat(64) })).rejects.toThrow(/checksum/);
        await expect(verifyEmbeddedFreshDualLedger({ ...value, records: value.records + 1 })).rejects.toThrow(/checksum/);
        await expect(verifyEmbeddedFreshDualLedger({ ...value, data: value.data + "\n" })).rejects.toThrow();
        const records = decodeFreshDualLedgerSync(Buffer.from(value.data, "base64"));
        (records[records.length - 1] as any).value.dualState.v6.firstResult.winner = "candidate";
        const plain = Buffer.from(records.map((record) => JSON.stringify(record)).join("\n") + "\n");
        const gzip = gzipSync(plain, { level: 9 });
        await expect(verifyEmbeddedFreshDualLedger({ ...value, data: gzip.toString("base64"),
            gzipBytes: gzip.length, plainBytes: plain.length, gzipSha256: hash(gzip), plainSha256: hash(plain) }))
            .rejects.toThrow(/replay/);
    });
    it("rejects sequence gaps, post-close appends, and forwarded resignation", async () => {
        const writer = await create();
        try {
            await expect(writer.appendUpdate(step(2))).rejects.toThrow(/continuity/);
            for (let tick = 1; tick <= 3; tick++) await writer.appendUpdate(step(tick));
            const bad = final(); bad.quitSuppression = structuredClone(quit);
            bad.quitSuppression.forwarded.baseline = 1;
            await expect(writer.finish(bad)).rejects.toThrow(/final state/);
            await writer.finish(final());
            await expect(writer.appendUpdate(step(4))).rejects.toThrow(/closed/);
        } finally { writer.dispose(); }
    });
    it("bounds plain records before compression and bounds compressed output", async () => {
        await expect(create({ ...OD1_LEDGER_LIMITS, recordBytes: 16 })).rejects.toThrow(/bound/);
        await expect(create({ ...OD1_LEDGER_LIMITS, plainBytes: 16 })).rejects.toThrow(/bound/);
        const writer = await create({ ...OD1_LEDGER_LIMITS, gzipBytes: 16 });
        try {
            for (let tick = 1; tick <= 3; tick++) await writer.appendUpdate(step(tick));
            await expect(writer.finish(final())).rejects.toThrow(/compressed byte bound/);
        } finally { writer.dispose(); }
    });
    it("bounds decompression and rejects malformed gzip without hanging", async () => {
        const value = await capLedger();
        await expect(verifyEmbeddedFreshDualLedger(value, { ...OD1_LEDGER_LIMITS, plainBytes: 10 }))
            .rejects.toThrow(/bounds/);
        await expect(verifyEmbeddedFreshDualLedger(value, { ...OD1_LEDGER_LIMITS, recordBytes: 16 }))
            .rejects.toThrow(/bound/);
        const bytes = Buffer.from(value.data, "base64"); bytes[0] = 0;
        await expect(verifyEmbeddedFreshDualLedger({ ...value, data: bytes.toString("base64"),
            gzipSha256: hash(bytes) })).rejects.toThrow();
    });
});
