import { describe, expect, test } from "vitest";
import {
    developmentV2PhaseAllocation,
    normalizedDevelopmentV2RepeatSha256,
    validateSealedDevelopmentV2Summary,
} from "../training/researchDevelopmentV2TechnicalGate.js";

const sealedSummary = (): Record<string, unknown> => ({
    schemaVersion: 1,
    generatedAt: "2026-08-10T00:00:00.000Z",
    runId: "development-v2-phase1",
    planBytesSha256: "0".repeat(64),
    requestedLaunches: 4,
    accountedLaunches: 4,
    completed: 4,
    technicalFailures: 0,
    complete: true,
    technicallyClean: true,
    outcomeAccess: "sealed-private-events",
});

describe("method-v2 sealed technical gate", () => {
    test("accepts only the exact outcome-free summary interface", () => {
        expect(validateSealedDevelopmentV2Summary(sealedSummary())).toMatchObject({
            completed: 4,
            technicalFailures: 0,
        });
        for (const key of ["winner", "candidateScore", "draws", "candidateScoreRate"]) {
            expect(() => validateSealedDevelopmentV2Summary({ ...sealedSummary(), [key]: 0 })).toThrow(
                /leaks forbidden outcome field/,
            );
        }
    });

    test("hashes repeat results after removing only process-specific fields", () => {
        const original = {
            episodeId: "repeat-0",
            wallTimeMs: 10,
            familyId: "mf_a",
            methodId: "champion",
            candidateSlot: 0,
            winner: "candidate",
            candidateScore: 1,
        };
        expect(normalizedDevelopmentV2RepeatSha256({
            ...original,
            episodeId: "repeat-1",
            wallTimeMs: 1000,
        })).toBe(normalizedDevelopmentV2RepeatSha256(original));
        expect(normalizedDevelopmentV2RepeatSha256({
            ...original,
            winner: "baseline",
            candidateScore: 0,
        })).not.toBe(normalizedDevelopmentV2RepeatSha256(original));
    });

    test("preserves all frozen allocations", () => {
        expect(developmentV2PhaseAllocation("development-v2-phase1")).toEqual({ shards: 8, launches: 32 });
        expect(developmentV2PhaseAllocation("development-v2-phase2")).toEqual({ shards: 22, launches: 88 });
        expect(developmentV2PhaseAllocation("development-v2-phase3")).toEqual({ shards: 80, launches: 320 });
    });
});
