import { describe, expect, it } from "vitest";
import {
    HFO_BOTTOM_RETARGET_ISOLATION_SPEC,
    isHfoBottomRetargetIsolationActive,
} from "../training/hfoBottomRetargetIsolation.js";

describe("HFO bottom retarget activation isolation", () => {
    it("freezes the complete country-start trace matrix", () => {
        expect(HFO_BOTTOM_RETARGET_ISOLATION_SPEC).toEqual({
            seedBase: 4_253_000_000,
            maxOffsets: 400,
            maxTicks: 36_000,
            snapshotInterval: 600,
            caseCount: 36,
            activeCaseCount: 9,
            inactiveCaseCount: 27,
        });
    });

    it("activates only for the HFO bottom start", () => {
        expect(["39,82", "151,119", "88,34", "88,157"].map(isHfoBottomRetargetIsolationActive))
            .toEqual([false, false, false, true]);
    });
});
