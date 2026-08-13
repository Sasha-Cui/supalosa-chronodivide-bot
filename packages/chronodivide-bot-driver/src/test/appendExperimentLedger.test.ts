import { describe, expect, test } from "vitest";
import { validateExperimentLedgerRow } from "../training/appendExperimentLedger.js";

const row = {
    schemaVersion: 1,
    entryId: "method-v6-gate-22092999",
    recordedAt: "2026-08-13T02:20:00.000Z",
    method: "Method-v6",
    purpose: "endpoint schema probe",
    outcomeAccessClass: "permanently-open-technical",
    claimEligible: false,
    sourceGitCommit: "a".repeat(40),
    sourceRuntimeSha256: "b".repeat(64),
    baselineGitCommit: "c".repeat(40),
    baselineRuntimeSha256: "d".repeat(64),
    gameApiRuntimeSha256: "e".repeat(64),
    campaignSha256: null,
    policyIdsSha256: "f".repeat(64),
    inputPopulationSha256: null,
    expectedLaunches: 6,
    accountedLaunches: 6,
    slurmAccount: "pi_jss233",
    arrayJobId: null,
    controllerJobId: null,
    jobIds: ["22092999"],
    schedulerStates: { "22092999": "COMPLETED" },
    technicalFailures: 0,
    artifactPaths: ["/durable/endpoint-probe.json"],
    artifactSha256: { "/durable/endpoint-probe.json": "0".repeat(64) },
    status: "PASSED",
    advancementDecision: "rerun source-bound gates",
    supersedesEntryId: null,
    notes: ["claimUse=false"],
};

describe("append-only experiment ledger", () => {
    test("accepts one exact, provenance-bound row", () => {
        expect(validateExperimentLedgerRow(row).entryId).toBe(row.entryId);
    });

    test("rejects schema expansion and malformed immutable identities", () => {
        expect(() => validateExperimentLedgerRow({ ...row, unreviewed: true })).toThrow(/exact schema/);
        expect(() => validateExperimentLedgerRow({ ...row, sourceGitCommit: "abc" })).toThrow(/sourceGitCommit/);
        expect(() => validateExperimentLedgerRow({ ...row, jobIds: ["array_2"] })).toThrow(/jobIds/);
        expect(() => validateExperimentLedgerRow({ ...row, expectedLaunches: -1 })).toThrow(/expectedLaunches/);
    });
});
