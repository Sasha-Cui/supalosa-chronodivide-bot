import { describe, expect, it } from "vitest";
import {
    buildMissionNativeCloseoutPolicyV5,
    missionNativeCloseoutPolicyV5Sha256,
    validateMissionNativeCloseoutPolicyV5,
} from "../training/missionNativeCloseoutPolicyV5.js";

describe("mission-native closeout policy v5", () => {
    it("changes only blocker allocation to a single screen attacker", () => {
        const policy = buildMissionNativeCloseoutPolicyV5();
        expect(policy).toMatchObject({
            schemaVersion: 5,
            enabled: true,
            engagementMode: "completionRace",
            engagementAllocationMode: "singleScreen",
            retargetStalledBuildings: true,
        });
        expect(missionNativeCloseoutPolicyV5Sha256(policy)).toMatch(/^[a-f0-9]{64}$/);
    });

    it("retains the disabled equivalence counterfactual", () => {
        expect(buildMissionNativeCloseoutPolicyV5(false).enabled).toBe(false);
    });

    it("rejects allocation or inherited-policy drift", () => {
        expect(() => validateMissionNativeCloseoutPolicyV5({
            ...buildMissionNativeCloseoutPolicyV5(),
            engagementAllocationMode: "boundedScreen",
        } as any)).toThrow(/allocation representation/);
        expect(() => validateMissionNativeCloseoutPolicyV5({
            ...buildMissionNativeCloseoutPolicyV5(),
            retargetStalledBuildings: false,
        } as any)).toThrow(/inherited field retargetStalledBuildings/);
    });
});
