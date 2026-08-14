import { describe, expect, it } from "vitest";
import {
    buildMissionNativeCloseoutPolicyV26,
    missionNativeCloseoutPolicyV26Sha256,
    validateMissionNativeCloseoutPolicyV26,
} from "../training/missionNativeCloseoutPolicyV26.js";

describe("mission-native closeout policy v26", () => {
    it("adds only bounded production and positive-progress launch to V25", () => {
        const policy = buildMissionNativeCloseoutPolicyV26();
        expect(policy).toMatchObject({
            schemaVersion: 26,
            requireGroundAssaultCapabilityForActivation: true,
            queueAwareGroundAssaultTargets: true,
            positiveProgressBlockerLaunch: true,
        });
        expect(missionNativeCloseoutPolicyV26Sha256(policy)).toMatch(/^[a-f0-9]{64}$/);
    }, 150_000);

    it("preserves the disabled control", () => {
        expect(buildMissionNativeCloseoutPolicyV26(false).enabled).toBe(false);
    }, 150_000);

    it("rejects queue and progress drift", () => {
        expect(() => validateMissionNativeCloseoutPolicyV26({
            ...buildMissionNativeCloseoutPolicyV26(),
            queueAwareGroundAssaultTargets: false,
        } as any)).toThrow(/queue-aware/);
        expect(() => validateMissionNativeCloseoutPolicyV26({
            ...buildMissionNativeCloseoutPolicyV26(),
            positiveProgressBlockerLaunch: false,
        } as any)).toThrow(/positive-progress/);
    }, 180_000);
});
