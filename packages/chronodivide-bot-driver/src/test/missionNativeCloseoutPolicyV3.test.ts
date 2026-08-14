import { describe, expect, it } from "vitest";
import {
    buildMissionNativeCloseoutPolicyV3,
    missionNativeCloseoutPolicyV3Sha256,
    validateMissionNativeCloseoutPolicyV3,
} from "../training/missionNativeCloseoutPolicyV3.js";

describe("mission-native closeout policy v3", () => {
    it("adds only the bounded blocker-screen allocation contract", () => {
        const policy = buildMissionNativeCloseoutPolicyV3();
        expect(policy).toMatchObject({
            schemaVersion: 3,
            enabled: true,
            engagementMode: "completionRace",
            engagementAllocationMode: "boundedScreen",
            routeCorridorRadius: 8,
        });
        expect(missionNativeCloseoutPolicyV3Sha256(policy)).toMatch(/^[a-f0-9]{64}$/);
    });

    it("retains the disabled equivalence counterfactual", () => {
        expect(buildMissionNativeCloseoutPolicyV3(false).enabled).toBe(false);
    });

    it("rejects allocation or inherited-policy drift", () => {
        expect(() => validateMissionNativeCloseoutPolicyV3({
            ...buildMissionNativeCloseoutPolicyV3(),
            engagementAllocationMode: "allBlocker",
        } as any)).toThrow(/allocation representation/);
        expect(() => validateMissionNativeCloseoutPolicyV3({
            ...buildMissionNativeCloseoutPolicyV3(),
            routeCorridorRadius: 9,
        } as any)).toThrow(/inherited field routeCorridorRadius/);
    });
});
