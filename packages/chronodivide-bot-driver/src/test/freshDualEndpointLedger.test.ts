import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
    LIVE_OWNED_ENDPOINT,
    LIVE_OWNED_ENDPOINT_SHA256,
    LIVE_OWNED_ENDPOINT_VERSION,
} from "../training/liveOwnedBuildingEliminationEndpointV6.js";
import {
    LITERAL_BUILDING_ELIMINATION_ENDPOINT_SHA256,
    LITERAL_BUILDING_ELIMINATION_ENDPOINT_VERSION,
    classifyLiteralEndpointCompletion,
    evaluateLiteralBuildingUpdate,
} from "../training/literalBuildingEliminationEndpoint.js";
import {
    FreshDualEndpointLedgerWriter,
    decodeFreshDualLedgerSync,
    verifyFreshDualLedgerFile,
    verifyFreshDualLedgerRecords,
} from "../training/freshDualEndpointLedger.js";

const row = (id: number, owner: string) => ({
    id,
    owner,
    rulesName: owner === "Candidate" ? "GACNST" : "NACNST",
    x: id,
    y: id + 1,
    hitPoints: 100,
});
const initial = {
    legacy: [row(1, "Candidate"), row(2, "Baseline")],
    live: [row(1, "Candidate"), row(2, "Baseline")],
};
const openState = () => ({
    v5: { firstResult: null, technicalFailure: null },
    v6: { firstResult: null, technicalFailure: null },
    complete: false,
    failed: false,
});
const audit = () => ({
    sha256: "a".repeat(64),
    callCount: 0,
    bySideAndMethod: {},
    zeroHealthBuildingTargetRequests: { count: 0, first: null, last: null, bySideAndRulesName: {} },
});
const quit = () => ({
    mode: "symmetric_no_forwarding" as const,
    attempts: { candidate: 0, baseline: 0 },
    forwarded: { candidate: 0, baseline: 0 },
});
const engine = { finished: false, defeated: { candidate: false, baseline: false } };
const hash = (value: Buffer) => createHash("sha256").update(value).digest("hex");

describe("fresh dual endpoint ledger", () => {
    it("streams a bounded stable run and replays exact cap completion", async () => {
        const directory = fs.mkdtempSync(path.join(os.tmpdir(), "fresh-dual-ledger-"));
        const file = path.join(directory, "trace.jsonl.gz");
        try {
            const writer = await FreshDualEndpointLedgerWriter.create(
                file,
                { candidate: "Candidate", baseline: "Baseline" },
                3,
                0,
                initial,
                engine,
                openState(),
            );
            for (let tick = 1; tick <= 3; tick += 1) {
                await writer.appendUpdate({
                    tick,
                    pre: initial,
                    post: initial,
                    events: [],
                    engine,
                    dualState: openState(),
                });
            }
            const capped = openState() as any;
            capped.v5.firstResult = {
                endpointVersion: LITERAL_BUILDING_ELIMINATION_ENDPOINT_VERSION,
                endpointSha256: LITERAL_BUILDING_ELIMINATION_ENDPOINT_SHA256,
                tick: 3,
                status: "tick_cap_draw",
                winner: "draw",
            };
            capped.v6.firstResult = {
                endpointVersion: LIVE_OWNED_ENDPOINT_VERSION,
                endpointSha256: LIVE_OWNED_ENDPOINT_SHA256,
                endpoint: LIVE_OWNED_ENDPOINT,
                tick: 3,
                status: "tick_cap_draw",
                winner: "draw",
            };
            capped.complete = true;
            const metadata = await writer.finish({
                stopReason: "tick_cap",
                updates: 3,
                dualState: capped,
                actionAudit: audit(),
                quitSuppression: quit(),
            });
            const compressed = fs.readFileSync(file);
            expect(metadata.gzipSha256).toBe(hash(compressed));
            expect(metadata.gzipBytes).toBe(compressed.length);
            const records = decodeFreshDualLedgerSync(compressed);
            expect(records.map((record) => record.kind)).toEqual(["header", "step", "stable", "final"]);
            expect((records[2] as any)).toMatchObject({ fromTick: 2, toTick: 3 });
            expect(verifyFreshDualLedgerRecords(records)).toMatchObject({
                updates: 3,
                complete: true,
                aborted: false,
                final: { stopReason: "tick_cap" },
            });
            expect(await verifyFreshDualLedgerFile(file, metadata)).toMatchObject({
                updates: 3,
                records: 4,
                complete: true,
                aborted: false,
                final: { stopReason: "tick_cap" },
            });
            await expect(verifyFreshDualLedgerFile(file, {
                ...metadata,
                plainSha256: "0".repeat(64),
            })).rejects.toThrow("checksum or count drifted");
        } finally {
            fs.rmSync(directory, { recursive: true, force: true });
        }
    });

    it("reconstructs a physical terminal from snapshots and attributed events", async () => {
        const directory = fs.mkdtempSync(path.join(os.tmpdir(), "fresh-dual-ledger-"));
        const file = path.join(directory, "trace.jsonl.gz");
        try {
            const writer = await FreshDualEndpointLedgerWriter.create(
                file,
                { candidate: "Candidate", baseline: "Baseline" },
                90_000,
                0,
                initial,
                engine,
                openState(),
            );
            await writer.appendUpdate({
                tick: 1,
                pre: initial,
                post: initial,
                events: [],
                engine,
                dualState: openState(),
            });
            const post = {
                legacy: [row(1, "Candidate")],
                live: [row(1, "Candidate")],
            };
            const events = [{
                type: 3,
                target: 2,
                attackerPlayerName: "Candidate",
                attackerObjectId: 44,
                weaponName: "120mm",
            }] as any;
            const evaluation = evaluateLiteralBuildingUpdate({
                tick: 2,
                combatants: { candidate: "Candidate", baseline: "Baseline" },
                pre: initial.legacy,
                post: post.legacy,
                events,
                establishedBeforeUpdate: { candidate: true, baseline: true },
            });
            const classified = classifyLiteralEndpointCompletion({ evaluation, engine });
            expect(classified.terminal?.winner).toBe("candidate");
            const state: any = openState();
            state.v5.firstResult = classified.terminal;
            state.v6.firstResult = {
                ...classified.terminal,
                endpointVersion: LIVE_OWNED_ENDPOINT_VERSION,
                endpointSha256: LIVE_OWNED_ENDPOINT_SHA256,
                endpoint: LIVE_OWNED_ENDPOINT,
            };
            state.complete = true;
            await writer.appendUpdate({
                tick: 2,
                pre: initial,
                post,
                events,
                engine,
                dualState: state,
            });
            await writer.finish({
                stopReason: "dual_complete",
                updates: 2,
                dualState: state,
                actionAudit: audit(),
                quitSuppression: quit(),
            });
            const verified = verifyFreshDualLedgerRecords(decodeFreshDualLedgerSync(fs.readFileSync(file)));
            expect(verified.final?.dualState.v5.firstResult?.winner).toBe("candidate");
            expect(verified.final?.dualState.v6.firstResult?.winner).toBe("candidate");
        } finally {
            fs.rmSync(directory, { recursive: true, force: true });
        }
    });
});
