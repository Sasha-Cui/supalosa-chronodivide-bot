import { describe, expect, it } from "vitest";
import {
    parseProgressCertifiedV5ConfirmatorySacct,
    parseProgressCertifiedV5SealedSummary,
} from
    "../training/progressCertifiedV5ConfirmatoryTechnicalGate.js";

const cleanSummary = () => ({
    schemaVersion: 2,
    status: "COMPLETE_PROGRESS_CERTIFIED_SEALED_CONFIRMATORY_SHARD",
    generatedAt: "2026-08-15T00:00:00.000Z",
    runId: "pcv5-confirm-f00-c0-example",
    planSha256: "a".repeat(64),
    requestedLaunches: 6,
    accountedLaunches: 6,
    completed: 6,
    technicalFailures: 0,
    complete: true,
    technicallyClean: true,
    outcomeAccess: "sealed-private-events",
});

describe("progress-certified V5 confirmatory technical gate", () => {
    it("accepts the exact outcome-free sealed summary", () => {
        expect(parseProgressCertifiedV5SealedSummary(cleanSummary())).toEqual(cleanSummary());
    });

    it("fails closed on outcome fields or partial launch accounting", () => {
        expect(() => parseProgressCertifiedV5SealedSummary({
            ...cleanSummary(),
            candidateWins: 4,
        })).toThrow("exact schema");
        expect(() => parseProgressCertifiedV5SealedSummary({
            ...cleanSummary(),
            completed: 5,
        })).toThrow("incomplete");
    });

    it("requires all 504 clean scheduler tasks on pi_jss233", () => {
        const rows = Array.from({ length: 504 }, (_, index) =>
            `999_${index}|${10_000 + index}|COMPLETED|0:0|pi_jss233`,
        ).join("\n");
        expect(parseProgressCertifiedV5ConfirmatorySacct(rows, "999").size).toBe(504);
        expect(() => parseProgressCertifiedV5ConfirmatorySacct(
            rows.replace("COMPLETED|0:0|pi_jss233", "FAILED|1:0|pi_jss233"),
            "999",
        )).toThrow("failed");
    });
});
