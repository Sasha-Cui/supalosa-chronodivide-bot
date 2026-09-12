import { describe, expect, it } from "vitest";
import {
    unifiedIntentM2ClusterBootstrap,
    unifiedIntentM2Wdl,
    unifiedIntentM2WilsonLower90,
} from "../training/unifiedIntentM2Analysis.js";

const rows = Array.from({ length: 4 }, (_, family) => Array.from(
    { length: 3 },
    (_, index) => ({
        familyId: "family-" + family,
        opponent: "pinned_supalosa" as const,
        country: "Americans",
        faction: "Allied" as const,
        candidateSlot: index % 2,
        disabledWinner: "draw" as const,
        enabledWinner: "candidate" as const,
        disabledScore: 0.5 as const,
        enabledScore: 1 as const,
    }),
)).flat();

describe("unified intent M2 analysis", () => {
    it("computes exact WDL and Wilson lower bounds", () => {
        expect(unifiedIntentM2Wdl(["candidate", "draw", "baseline", "candidate"]))
            .toEqual({ wins: 2, draws: 1, losses: 1, score: 0.625, winRate: 0.5 });
        expect(unifiedIntentM2WilsonLower90(50, 100)).toBeCloseTo(0.4364, 3);
    });

    it("is deterministic and preserves exact positive family effects", () => {
        const left = unifiedIntentM2ClusterBootstrap(rows, "test", 1_000);
        const right = unifiedIntentM2ClusterBootstrap(rows, "test", 1_000);
        expect(left).toEqual(right);
        expect(left.pairedScore).toEqual({ estimate: 0.5, lower90: 0.5 });
        expect(left.pairedLiteralWin).toEqual({ estimate: 1, lower90: 1 });
        expect(left.drawsSha256).toMatch(/^[0-9a-f]{64}$/);
    });

    it("fails closed on invalid populations", () => {
        expect(() => unifiedIntentM2ClusterBootstrap([], "test", 10)).toThrow(/population/);
        expect(() => unifiedIntentM2WilsonLower90(2, 1)).toThrow(/inputs/);
    });
});
