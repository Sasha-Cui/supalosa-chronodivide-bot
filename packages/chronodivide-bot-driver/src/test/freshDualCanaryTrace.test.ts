import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
    FreshDualCanaryTraceWriter,
    verifyFreshDualCanaryTraceFile,
} from "../training/freshDualCanaryTrace.js";

const context = {
    mapId: "hfo-le",
    mapName: "cd_chrono_4_heck_freezes_over_le.map",
    country: "Americans",
    candidateSlot: 0 as const,
    candidateStart: "39,82",
    opponentStart: "151,119",
    requestedEngineSeed: 3_769_000_000,
};
const final = {
    updates: 6000 as const,
    observations: 6001 as const,
    worldTrajectory: { sha256: "a".repeat(64), snapshots: 6001 as const },
    actionAudit: {
        sha256: "b".repeat(64),
        callCount: 4,
        bySideAndMethod: { "candidate.orderUnits": 4 },
        zeroHealthBuildingTargetRequests: {
            count: 0,
            first: null,
            last: null,
            bySideAndRulesName: {},
        },
    },
    quitSuppression: {
        mode: "symmetric_no_forwarding" as const,
        attempts: { candidate: 0, baseline: 0 },
        forwarded: { candidate: 0, baseline: 0 },
    },
};

describe("fresh dual compressed canary trace", () => {
    it("produces byte-identical streams and verifies them incrementally", async () => {
        const directory = fs.mkdtempSync(path.join(os.tmpdir(), "fresh-dual-canary-"));
        try {
            const files = [path.join(directory, "reference.jsonl.gz"), path.join(directory, "dual.jsonl.gz")];
            const metadata = [];
            for (const file of files) {
                const writer = await FreshDualCanaryTraceWriter.create(file, context);
                for (let update = 0; update <= 6000; update += 1) {
                    await writer.observe(update, { tick: update, objects: [{ id: 1, hp: 100 }] });
                }
                metadata.push(await writer.finish(final));
            }
            expect(metadata[0].records).toBe(6003);
            expect(metadata[0].plainSha256).toBe(metadata[1].plainSha256);
            expect(metadata[0].gzipSha256).toBe(metadata[1].gzipSha256);
            expect(fs.readFileSync(files[0])).toEqual(fs.readFileSync(files[1]));
            expect(await verifyFreshDualCanaryTraceFile(files[0], metadata[0], context, final))
                .toEqual({ records: 6003, observations: 6001, final });
            await expect(verifyFreshDualCanaryTraceFile(files[0], {
                ...metadata[0],
                gzipSha256: "0".repeat(64),
            }, context, final)).rejects.toThrow("checksum, byte, or record count drifted");
        } finally {
            fs.rmSync(directory, { recursive: true, force: true });
        }
    });

    it("rejects outcome-shaped context before opening a stream", async () => {
        const directory = fs.mkdtempSync(path.join(os.tmpdir(), "fresh-dual-canary-"));
        const file = path.join(directory, "invalid.jsonl.gz");
        try {
            await expect(FreshDualCanaryTraceWriter.create(file, {
                ...context,
                winner: "candidate",
            } as any)).rejects.toThrow("Prohibited compressed-canary field");
            expect(fs.existsSync(file)).toBe(false);
        } finally {
            fs.rmSync(directory, { recursive: true, force: true });
        }
    });
});
