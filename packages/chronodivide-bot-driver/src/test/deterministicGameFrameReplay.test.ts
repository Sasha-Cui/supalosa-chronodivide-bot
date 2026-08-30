import { describe, expect, it } from "vitest";

import {
    firstDivergenceUpdate,
    registeredHfoFinalFrameUpdates,
    registeredPeakFrameUpdates,
} from "../training/deterministicGameFrameReplay.js";

describe("deterministic game-frame replay planning", () => {
    it("finds the first common public-state divergence", () => {
        const left = [
            { update: 0, sha256: "a" },
            { update: 60, sha256: "b" },
            { update: 120, sha256: "c" },
        ];
        const right = [
            { update: 0, sha256: "a" },
            { update: 60, sha256: "x" },
            { update: 120, sha256: "c" },
        ];
        expect(firstDivergenceUpdate(left, right)).toBe(60);
        expect(firstDivergenceUpdate(left, left)).toBeNull();
    });

    it("freezes Peak context, decision, and consequence updates", () => {
        expect(registeredPeakFrameUpdates(600)).toEqual([300, 600, 1200]);
        expect(() => registeredPeakFrameUpdates(240)).toThrow("not frame eligible");
        expect(() => registeredPeakFrameUpdates(610)).toThrow("not frame eligible");
    });

    it("uses recorded snapshots before a non-grid terminal update", () => {
        expect(registeredHfoFinalFrameUpdates(19_667)).toEqual([19_020, 19_320, 19_667]);
        expect(() => registeredHfoFinalFrameUpdates(500)).toThrow("not frame eligible");
    });
});
