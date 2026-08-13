import { describe, expect, it } from "vitest";
import {
    CONTINUOUS_OFFENSE_COMPATIBILITY_ENGINE_SEED_BASE,
    CONTINUOUS_OFFENSE_COMPATIBILITY_MAX_TICKS,
} from "../training/continuousOffenseCompatibilityGate.js";

describe("continuous-offense compatibility gate", () => {
    it("freezes a short outcome-blind all-country exposure budget", () => {
        expect(CONTINUOUS_OFFENSE_COMPATIBILITY_MAX_TICKS).toBe(2_400);
        expect(CONTINUOUS_OFFENSE_COMPATIBILITY_ENGINE_SEED_BASE).toBe(4_170_000_000);
        expect(9 * 2 * 4).toBe(72);
    });
});
