import { describe, expect, it } from "vitest";
import {
    buildMissionNativeCloseoutPolicyV29,
    missionNativeCloseoutPolicyV29Sha256,
    validateMissionNativeCloseoutPolicyV29,
} from "../training/missionNativeCloseoutPolicyV29.js";

describe("mission-native closeout policy v29", () => {
    it("adds only preterminal force certification to V28", () => {
        const policy = buildMissionNativeCloseoutPolicyV29();
        expect(policy).toMatchObject({
            schemaVersion: 29,
            objectiveFeasibilityOverridesGroundAssaultCapability: true,
            preterminalRequiresRouteFeasibleLaunch: true,
            preterminalObjectiveFeasibilityRequiresTransferredCapability: true,
        });
        expect(missionNativeCloseoutPolicyV29Sha256(policy)).toMatch(/^[a-f0-9]{64}$/);
    }, 300_000);

    it("preserves the disabled control", () => {
        expect(buildMissionNativeCloseoutPolicyV29(false).enabled).toBe(false);
    }, 300_000);

    it("rejects preterminal certification drift and extra fields", () => {
        const policy = buildMissionNativeCloseoutPolicyV29();
        expect(() => validateMissionNativeCloseoutPolicyV29({
            ...policy,
            preterminalObjectiveFeasibilityRequiresTransferredCapability: false,
        } as any)).toThrow(/preterminal/);
        expect(() => validateMissionNativeCloseoutPolicyV29({
            ...policy,
            unexpected: true,
        } as any)).toThrow(/exact schema/);
    }, 300_000);
});
