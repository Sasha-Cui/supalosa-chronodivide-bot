import { describe, expect, it } from "vitest";
import { Countries } from "@supalosa/chronodivide-bot/dist/bot/logic/common/utils.js";
import {
    MISSION_NATIVE_CLOSEOUT_LIVENESS_PROBE_V35_R1_CELL,
} from "../training/missionNativeCloseoutLivenessProbeV35R1.js";

describe("mission-native closeout V35-R1 liveness probe", () => {
    it("freezes the outcome-free V34-R1 branch-exposure cell and seed", () => {
        expect(MISSION_NATIVE_CLOSEOUT_LIVENESS_PROBE_V35_R1_CELL).toEqual({
            country: Countries.GERMANY,
            candidateSlot: 0,
            requestedEngineSeed: 4_294_850_006,
        });
    });

    it("uses a valid uint32 engine seed", () => {
        expect(MISSION_NATIVE_CLOSEOUT_LIVENESS_PROBE_V35_R1_CELL.requestedEngineSeed)
            .toBeLessThanOrEqual(0xffff_ffff);
    });
});
