import { describe, expect, it } from "vitest";
import {
    buildMissionNativeCloseoutPolicyV28,
    missionNativeCloseoutPolicyV28Sha256,
    validateMissionNativeCloseoutPolicyV28,
} from "../training/missionNativeCloseoutPolicyV28.js";

describe("mission-native closeout policy v28", () => {
    it("adds only objective-feasibility arbitration to V27", () => {
        const policy = buildMissionNativeCloseoutPolicyV28();
        expect(policy).toMatchObject({
            schemaVersion: 28,
            objectiveFeasibilityOverridesGroundAssaultCapability: true,
            preterminalRequiresRouteFeasibleLaunch: true,
        });
        expect(missionNativeCloseoutPolicyV28Sha256(policy)).toMatch(/^[a-f0-9]{64}$/);
    }, 300_000);

    it("preserves the disabled control", () => {
        expect(buildMissionNativeCloseoutPolicyV28(false).enabled).toBe(false);
    }, 300_000);

    it("rejects arbitration drift and extra fields", () => {
        const policy = buildMissionNativeCloseoutPolicyV28();
        expect(() => validateMissionNativeCloseoutPolicyV28({
            ...policy,
            preterminalRequiresRouteFeasibleLaunch: false,
        } as any)).toThrow(/preterminal/);
        expect(() => validateMissionNativeCloseoutPolicyV28({
            ...policy,
            unexpected: true,
        } as any)).toThrow(/exact schema/);
    }, 300_000);
});
