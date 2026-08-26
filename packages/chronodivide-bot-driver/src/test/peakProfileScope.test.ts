import { describe, expect, it } from "vitest";
import { PeakOfPerfectionProfileScope, peakOfPerfectionProfileApplies } from
    "@supalosa/chronodivide-bot/dist/bot/strategy/strongStrategy.js";

describe("Peak of Perfection profile scope", () => {
    it("preserves weak-only deployed behavior by default", () => {
        expect(peakOfPerfectionProfileApplies(undefined, true, true)).toBe(true);
        expect(peakOfPerfectionProfileApplies(undefined, true, false)).toBe(false);
        expect(peakOfPerfectionProfileApplies("weak_only", true, true)).toBe(true);
        expect(peakOfPerfectionProfileApplies("weak_only", true, false)).toBe(false);
    });

    it("applies both only to exact Peak maps", () => {
        expect(peakOfPerfectionProfileApplies("both", true, true)).toBe(true);
        expect(peakOfPerfectionProfileApplies("both", true, false)).toBe(true);
        expect(peakOfPerfectionProfileApplies("both", false, false)).toBe(false);
    });

    it("disables the layer at both starts", () => {
        expect(peakOfPerfectionProfileApplies("off", true, true)).toBe(false);
        expect(peakOfPerfectionProfileApplies("off", true, false)).toBe(false);
    });

    it("fails closed on an invalid runtime value", () => {
        expect(() => peakOfPerfectionProfileApplies("all" as PeakOfPerfectionProfileScope, true, true))
            .toThrow("Invalid Peak of Perfection profile scope");
    });
});
