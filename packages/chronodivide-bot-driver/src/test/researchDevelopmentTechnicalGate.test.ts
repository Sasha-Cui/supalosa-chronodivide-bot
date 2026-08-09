import { describe, expect, test } from "vitest";
import {
    developmentPhaseTechnicalAllocation,
    normalizedRepeatResultSha256,
    validateSealedDevelopmentSummary,
} from "../training/researchDevelopmentTechnicalGate.js";

const sealedSummary = (): Record<string, unknown> => ({
    schemaVersion: 1,
    generatedAt: "2026-08-09T00:00:00.000Z",
    runId: "dev-qc",
    planBytesSha256: "0".repeat(64),
    requestedLaunches: 4,
    accountedLaunches: 4,
    completed: 4,
    technicalFailures: 0,
    complete: true,
    technicallyClean: true,
    outcomeAccess: "sealed-private-events",
});

describe("development technical gate", () => {
    test("accepts only the technical-only sealed summary schema", () => {
        expect(validateSealedDevelopmentSummary(sealedSummary())).toMatchObject({
            requestedLaunches: 4,
            accountedLaunches: 4,
            technicalFailures: 0,
            outcomeAccess: "sealed-private-events",
        });
        for (const forbidden of ["candidateWins", "baselineWins", "draws", "candidateScoreRate"]) {
            expect(() => validateSealedDevelopmentSummary({
                ...sealedSummary(),
                [forbidden]: 1,
            })).toThrow(/leaks forbidden outcome field/);
        }
    });

    test("normalizes only repeat-specific identity and wall-clock fields", () => {
        const result = {
            schemaVersion: 1,
            episodeId: "repeat-0",
            familyId: "mf_alpha",
            methodId: "conditioned",
            policyId: "1".repeat(64),
            requestedEngineSeed: 123,
            candidateSlot: 0,
            wallTimeMs: 100,
            winner: "candidate",
            candidateScore: 1,
            candidate: { units: 4 },
            baseline: { units: 0 },
        };
        const replay = {
            ...result,
            episodeId: "repeat-1",
            wallTimeMs: 999,
        };
        expect(normalizedRepeatResultSha256(replay)).toBe(normalizedRepeatResultSha256(result));
        expect(normalizedRepeatResultSha256({
            ...replay,
            winner: "baseline",
            candidateScore: 0,
        })).not.toBe(normalizedRepeatResultSha256(result));
    });

    test("rejects malformed summaries and completion records without echoing payloads", () => {
        expect(() => validateSealedDevelopmentSummary({
            ...sealedSummary(),
            outcomeAccess: "open-training",
        })).toThrow(/invalid sealed metadata/);
        expect(() => normalizedRepeatResultSha256(null)).toThrow(/must be an object/);
    });
    test("preserves the frozen technical allocations through phase 3", () => {
        expect(developmentPhaseTechnicalAllocation("development-phase1")).toEqual({ shards: 16, launches: 64 });
        expect(developmentPhaseTechnicalAllocation("development-phase2")).toEqual({ shards: 24, launches: 96 });
        expect(developmentPhaseTechnicalAllocation("development-phase3")).toEqual({ shards: 200, launches: 800 });
    });
});
