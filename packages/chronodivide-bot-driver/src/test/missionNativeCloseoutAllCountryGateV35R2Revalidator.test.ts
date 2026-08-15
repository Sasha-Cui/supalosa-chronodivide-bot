import { describe, expect, it } from "vitest";
import {
    MISSION_NATIVE_CLOSEOUT_V35_R2_INPUT_SHA256,
    MISSION_NATIVE_CLOSEOUT_V35_R2_INPUT_SOURCE_COMMIT,
    findForbiddenOutcomeKeys,
} from "../training/missionNativeCloseoutAllCountryGateV35R2Revalidator.js";

describe("mission-native closeout V35-R2 validator-only correction", () => {
    it("freezes the complete V35-R1 input artifact", () => {
        expect(MISSION_NATIVE_CLOSEOUT_V35_R2_INPUT_SHA256).toBe(
            "dc120885b30cf4d82b90cfcbe58fff6ec42c2f247112e53eeaf3c9b7d5409f85",
        );
        expect(MISSION_NATIVE_CLOSEOUT_V35_R2_INPUT_SOURCE_COMMIT).toBe(
            "329bd68913c390cae342df4fe9beaae37f9d79c2",
        );
    });

    it("rejects outcome keys recursively without rejecting outcomeFree metadata", () => {
        expect(findForbiddenOutcomeKeys({ outcomeFree: true, rows: [{ telemetry: [] }] })).toEqual([]);
        expect(findForbiddenOutcomeKeys({ rows: [{ score: 1 }, { nested: { Winner: "candidate" } }] }))
            .toEqual(["$.rows[0].score", "$.rows[1].nested.Winner"]);
    });
});
