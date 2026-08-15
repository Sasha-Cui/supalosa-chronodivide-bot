import { describe, expect, it } from "vitest";
import {
    MISSION_NATIVE_CLOSEOUT_V37_R2_EXPOSURE_CELL_COUNT,
    MISSION_NATIVE_CLOSEOUT_V37_R2_EXPOSURE_COUNTRIES,
    MISSION_NATIVE_CLOSEOUT_V37_R2_EXPOSURE_MAX_TICKS,
    MISSION_NATIVE_CLOSEOUT_V37_R2_EXPOSURE_SEED_BASE,
} from "../training/missionNativeCloseoutLiteralEndpointExposureV37R2.js";
import { meetsMissionNativeCloseoutV37R2InterfaceExposureGate } from
    "../training/missionNativeCloseoutLiteralEndpointExposureV37R2Aggregate.js";

describe("mission-native closeout V37-R2 outcome-free literal-endpoint exposure screen", () => {
    it("freezes all nine countries and reciprocal starts", () => {
        expect(MISSION_NATIVE_CLOSEOUT_V37_R2_EXPOSURE_COUNTRIES).toHaveLength(9);
        expect(new Set(MISSION_NATIVE_CLOSEOUT_V37_R2_EXPOSURE_COUNTRIES).size).toBe(9);
        expect(MISSION_NATIVE_CLOSEOUT_V37_R2_EXPOSURE_CELL_COUNT).toBe(18);
    });

    it("uses a fresh valid uint32 seed interval", () => {
        expect(MISSION_NATIVE_CLOSEOUT_V37_R2_EXPOSURE_SEED_BASE).toBe(4_294_940_000);
        expect(MISSION_NATIVE_CLOSEOUT_V37_R2_EXPOSURE_SEED_BASE +
            MISSION_NATIVE_CLOSEOUT_V37_R2_EXPOSURE_CELL_COUNT - 1).toBeLessThanOrEqual(0xffff_ffff);
    });

    it("retains the frozen outcome-blind diagnostic horizon", () => {
        expect(MISSION_NATIVE_CLOSEOUT_V37_R2_EXPOSURE_MAX_TICKS).toBe(7_200);
    });

    it("requires both live ownership and bounded no-owner recovery interfaces", () => {
        expect(meetsMissionNativeCloseoutV37R2InterfaceExposureGate(1, 1)).toBe(true);
        expect(meetsMissionNativeCloseoutV37R2InterfaceExposureGate(0, 1)).toBe(false);
        expect(meetsMissionNativeCloseoutV37R2InterfaceExposureGate(1, 0)).toBe(false);
    });
});
