import { describe, expect, it } from "vitest";
import { HFO_OPPONENT_STYLE_COUNTRIES, HFO_OPPONENT_STYLE_SPEC } from
    "../training/hfoOpponentStyleDiagnostic.js";

describe("HFO opponent-style diagnostic design", () => {
    it("freezes the trace population, horizons, and classifier limits", () => {
        expect(HFO_OPPONENT_STYLE_SPEC).toEqual({
            seedBase: 4_263_000_000,
            maxOffsets: 400,
            maxTicks: 3_600,
            snapshotTicks: [300, 600, 900, 1_200, 1_800, 2_400, 3_000, 3_600],
            caseCount: 72,
            opponentCount: 2,
            taskCount: 144,
            maxTreeDepth: 3,
            minLeaf: 5,
        });
        expect(HFO_OPPONENT_STYLE_COUNTRIES).toEqual([
            "Americans",
            "Alliance",
            "French",
            "Germans",
            "British",
            "Africans",
            "Arabs",
            "Confederation",
            "Russians",
        ]);
        expect(9 * 4 * 2).toBe(HFO_OPPONENT_STYLE_SPEC.caseCount);
        expect(HFO_OPPONENT_STYLE_SPEC.caseCount * HFO_OPPONENT_STYLE_SPEC.opponentCount)
            .toBe(HFO_OPPONENT_STYLE_SPEC.taskCount);
        expect(HFO_OPPONENT_STYLE_SPEC.seedBase + 8 * 100_000 + 3 * 20_000 + 10_000 + 399)
            .toBeLessThan(2 ** 32);
    });
});
