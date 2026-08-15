import { describe, expect, it } from "vitest";
import {
    MISSION_NATIVE_CLOSEOUT_V37_COMPATIBILITY_CELL_COUNT,
    MISSION_NATIVE_CLOSEOUT_V37_COMPATIBILITY_COUNTRIES,
    MISSION_NATIVE_CLOSEOUT_V37_COMPATIBILITY_MAX_TICKS,
    MISSION_NATIVE_CLOSEOUT_V37_COMPATIBILITY_SEED_BASE,
} from "../training/missionNativeCloseoutAllCountryCompatibilityV37.js";
import { meetsMissionNativeCloseoutV37CompatibilityCoverageGate } from
    "../training/missionNativeCloseoutAllCountryCompatibilityV37Aggregate.js";

describe("mission-native closeout V37-C1 outcome-free all-country compatibility screen", () => {
    it("freezes all nine countries and reciprocal starts", () => {
        expect(MISSION_NATIVE_CLOSEOUT_V37_COMPATIBILITY_COUNTRIES).toHaveLength(9);
        expect(new Set(MISSION_NATIVE_CLOSEOUT_V37_COMPATIBILITY_COUNTRIES).size).toBe(9);
        expect(MISSION_NATIVE_CLOSEOUT_V37_COMPATIBILITY_CELL_COUNT).toBe(18);
    });

    it("uses a fresh valid uint32 seed interval", () => {
        expect(MISSION_NATIVE_CLOSEOUT_V37_COMPATIBILITY_SEED_BASE).toBe(4_294_950_000);
        expect(MISSION_NATIVE_CLOSEOUT_V37_COMPATIBILITY_SEED_BASE +
            MISSION_NATIVE_CLOSEOUT_V37_COMPATIBILITY_CELL_COUNT - 1).toBeLessThanOrEqual(0xffff_ffff);
    });

    it("retains the frozen outcome-blind diagnostic horizon", () => {
        expect(MISSION_NATIVE_CLOSEOUT_V37_COMPATIBILITY_MAX_TICKS).toBe(5_400);
    });

    it("fails closed on any whole-population mechanism coverage error", () => {
        expect(meetsMissionNativeCloseoutV37CompatibilityCoverageGate([])).toBe(true);
        expect(meetsMissionNativeCloseoutV37CompatibilityCoverageGate(["missing blocker progress"])).toBe(false);
    });
});
