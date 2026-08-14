import { describe, expect, it } from "vitest";
import {
    buildMissionNativeCloseoutPolicyV4,
    missionNativeCloseoutPolicyV4Sha256,
    validateMissionNativeCloseoutPolicyV4,
} from "../training/missionNativeCloseoutPolicyV4.js";

describe("mission-native closeout policy v4", () => {
    it("adds only progress-certified building retargeting", () => {
        const policy = buildMissionNativeCloseoutPolicyV4();
        expect(policy).toMatchObject({
            schemaVersion: 4,
            enabled: true,
            engagementMode: "completionRace",
            engagementAllocationMode: "boundedScreen",
            retargetStalledBuildings: true,
            stallTicks: 600,
        });
        expect(missionNativeCloseoutPolicyV4Sha256(policy)).toMatch(/^[a-f0-9]{64}$/);
    });

    it("retains the disabled equivalence counterfactual", () => {
        expect(buildMissionNativeCloseoutPolicyV4(false).enabled).toBe(false);
    });

    it("rejects retargeting or inherited-policy drift", () => {
        expect(() => validateMissionNativeCloseoutPolicyV4({
            ...buildMissionNativeCloseoutPolicyV4(),
            retargetStalledBuildings: false,
        } as any)).toThrow(/retargeting representation/);
        expect(() => validateMissionNativeCloseoutPolicyV4({
            ...buildMissionNativeCloseoutPolicyV4(),
            stallTicks: 599,
        } as any)).toThrow(/inherited field stallTicks/);
    });
});
