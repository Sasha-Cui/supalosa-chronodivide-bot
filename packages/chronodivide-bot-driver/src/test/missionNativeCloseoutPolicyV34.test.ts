import { describe, expect, test } from "vitest";
import {
    buildMissionNativeCloseoutPolicyV34,
    missionNativeCloseoutPolicyV34Sha256,
    validateMissionNativeCloseoutPolicyV34,
} from "../training/missionNativeCloseoutPolicyV34.js";

describe("mission-native closeout policy v34", () => {
    test("adds bounded blocker allocation and terminal priority to the frozen V33 policy", () => {
        const policy = buildMissionNativeCloseoutPolicyV34(true);
        expect(policy.schemaVersion).toBe(34);
        expect(policy.enabled).toBe(true);
        expect(policy.engagementAllocationMode).toBe("boundedScreen");
        expect(policy.terminalBuildingPriority).toBe(true);
        expect(policy.adaptiveGroundAssaultScreenInfrastructure).toBe(true);
        expect(policy.adaptiveGroundAssaultProductionReservation).toBe(false);
        expect(policy.adaptiveGroundAssaultQueuedProductionFocusPriority).toBe(10_000);
        expect(policy.externalQueueControllerExclusiveFocusAdapter).toBe(true);
        expect(policy.preterminalObjectiveFeasibilityRequiresTransferredCapability).toBe(true);
        expect(missionNativeCloseoutPolicyV34Sha256(policy)).toMatch(/^[0-9a-f]{64}$/);
        expect(missionNativeCloseoutPolicyV34Sha256(policy)).toBe(
            missionNativeCloseoutPolicyV34Sha256(buildMissionNativeCloseoutPolicyV34(true)),
        );
    });

    test("preserves exact disabled-control construction", () => {
        const policy = buildMissionNativeCloseoutPolicyV34(false);
        expect(policy.enabled).toBe(false);
        expect(policy.adaptiveGroundAssaultScreenInfrastructure).toBe(true);
        expect(policy.adaptiveGroundAssaultProductionReservation).toBe(false);
        expect(policy.adaptiveGroundAssaultQueuedProductionFocusPriority).toBe(10_000);
        expect(policy.externalQueueControllerExclusiveFocusAdapter).toBe(true);
        expect(policy.engagementAllocationMode).toBe("boundedScreen");
        expect(policy.terminalBuildingPriority).toBe(true);
        expect(validateMissionNativeCloseoutPolicyV34(policy)).toEqual(policy);
    });

    test("rejects objective-race or inherited safety mechanisms drifting", () => {
        const policy = buildMissionNativeCloseoutPolicyV34(true);
        expect(() => validateMissionNativeCloseoutPolicyV34({
            ...policy,
            engagementAllocationMode: "allBlocker",
        } as any)).toThrow("objective-race representation");
        expect(() => validateMissionNativeCloseoutPolicyV34({
            ...policy,
            terminalBuildingPriority: false,
        } as any)).toThrow("objective-race representation");
        expect(() => validateMissionNativeCloseoutPolicyV34({
            ...policy,
            adaptiveGroundAssaultQueuedProductionFocusPriority: 1_000,
        } as any)).toThrow("inherited field adaptiveGroundAssaultQueuedProductionFocusPriority");
        expect(() => validateMissionNativeCloseoutPolicyV34({
            ...policy,
            adaptiveGroundAssaultScreenInfrastructure: false,
        } as any)).toThrow("inherited field adaptiveGroundAssaultScreenInfrastructure");
        const { terminalBuildingPriority: _removed, ...missing } = policy;
        expect(() => validateMissionNativeCloseoutPolicyV34(missing as any)).toThrow("exact schema");
    });
});
