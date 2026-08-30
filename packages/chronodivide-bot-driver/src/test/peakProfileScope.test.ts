import { describe, expect, it } from "vitest";
import {
    CONFIRMED_PEAK_OF_PERFECTION_STRATEGY_SCOPE, PeakOfPerfectionProfileScope,
    peakOfPerfectionProfileApplies, resolvePeakOfPerfectionStrategyScope,
} from "@supalosa/chronodivide-bot/dist/bot/strategy/strongStrategy.js";

describe("Peak of Perfection profile scope", () => {
    it("preserves the low-level weak-only fallback", () => {
        expect(peakOfPerfectionProfileApplies(undefined, true, true)).toBe(true);
        expect(peakOfPerfectionProfileApplies(undefined, true, false)).toBe(false);
        expect(peakOfPerfectionProfileApplies("weak_only", true, true)).toBe(true);
        expect(peakOfPerfectionProfileApplies("weak_only", true, false)).toBe(false);
    });

    it("promotes only the confirmed reciprocal macro strategy scope", () => {
        expect(CONFIRMED_PEAK_OF_PERFECTION_STRATEGY_SCOPE).toBe("both");
        expect(resolvePeakOfPerfectionStrategyScope(undefined)).toBe("both");
        expect(resolvePeakOfPerfectionStrategyScope("weak_only")).toBe("weak_only");
        expect(resolvePeakOfPerfectionStrategyScope("off")).toBe("off");

        const confirmed = resolvePeakOfPerfectionStrategyScope(undefined);
        expect(peakOfPerfectionProfileApplies(confirmed, true, true)).toBe(
            peakOfPerfectionProfileApplies("weak_only", true, true),
        );
        expect(peakOfPerfectionProfileApplies(confirmed, true, false)).toBe(true);
        expect(peakOfPerfectionProfileApplies(confirmed, false, false)).toBe(false);
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
