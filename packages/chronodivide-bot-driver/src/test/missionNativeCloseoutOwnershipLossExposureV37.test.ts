import { describe, expect, it } from "vitest";
import {
    MISSION_NATIVE_CLOSEOUT_V37_EXPOSURE_CELL_COUNT,
    MISSION_NATIVE_CLOSEOUT_V37_EXPOSURE_COUNTRIES,
    MISSION_NATIVE_CLOSEOUT_V37_EXPOSURE_MAX_TICKS,
    MISSION_NATIVE_CLOSEOUT_V37_EXPOSURE_SEED_BASE,
} from "../training/missionNativeCloseoutOwnershipLossExposureV37.js";

describe("mission-native closeout V37 outcome-free ownership-loss exposure screen", () => {
    it("freezes all nine countries and reciprocal starts", () => {
        expect(MISSION_NATIVE_CLOSEOUT_V37_EXPOSURE_COUNTRIES).toHaveLength(9);
        expect(new Set(MISSION_NATIVE_CLOSEOUT_V37_EXPOSURE_COUNTRIES).size).toBe(9);
        expect(MISSION_NATIVE_CLOSEOUT_V37_EXPOSURE_CELL_COUNT).toBe(18);
    });

    it("uses a fresh valid uint32 seed interval", () => {
        expect(MISSION_NATIVE_CLOSEOUT_V37_EXPOSURE_SEED_BASE).toBe(4_294_930_000);
        expect(MISSION_NATIVE_CLOSEOUT_V37_EXPOSURE_SEED_BASE +
            MISSION_NATIVE_CLOSEOUT_V37_EXPOSURE_CELL_COUNT - 1).toBeLessThanOrEqual(0xffff_ffff);
    });

    it("extends only the outcome-blind diagnostic horizon", () => {
        expect(MISSION_NATIVE_CLOSEOUT_V37_EXPOSURE_MAX_TICKS).toBe(7_200);
    });
});
