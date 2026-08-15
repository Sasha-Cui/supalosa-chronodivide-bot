import { describe, expect, test } from "vitest";
import {
    buildMissionNativeCloseoutPolicyV33,
    missionNativeCloseoutPolicyV33Sha256,
    validateMissionNativeCloseoutPolicyV33,
} from "../training/missionNativeCloseoutPolicyV33.js";

describe("mission-native closeout policy v33", () => {
    test("adds the external queue-controller adapter to the frozen V32 policy", () => {
        const policy = buildMissionNativeCloseoutPolicyV33(true);
        expect(policy.schemaVersion).toBe(33);
        expect(policy.enabled).toBe(true);
        expect(policy.adaptiveGroundAssaultScreenInfrastructure).toBe(true);
        expect(policy.adaptiveGroundAssaultProductionReservation).toBe(false);
        expect(policy.adaptiveGroundAssaultQueuedProductionFocusPriority).toBe(10_000);
        expect(policy.externalQueueControllerExclusiveFocusAdapter).toBe(true);
        expect(policy.preterminalObjectiveFeasibilityRequiresTransferredCapability).toBe(true);
        expect(missionNativeCloseoutPolicyV33Sha256(policy)).toMatch(/^[0-9a-f]{64}$/);
        expect(missionNativeCloseoutPolicyV33Sha256(policy)).toBe(
            missionNativeCloseoutPolicyV33Sha256(buildMissionNativeCloseoutPolicyV33(true)),
        );
    });

    test("preserves exact disabled-control construction", () => {
        const policy = buildMissionNativeCloseoutPolicyV33(false);
        expect(policy.enabled).toBe(false);
        expect(policy.adaptiveGroundAssaultScreenInfrastructure).toBe(true);
        expect(policy.adaptiveGroundAssaultProductionReservation).toBe(false);
        expect(policy.adaptiveGroundAssaultQueuedProductionFocusPriority).toBe(10_000);
        expect(policy.externalQueueControllerExclusiveFocusAdapter).toBe(true);
        expect(validateMissionNativeCloseoutPolicyV33(policy)).toEqual(policy);
    });

    test("rejects focus or inherited safety mechanisms drifting", () => {
        const policy = buildMissionNativeCloseoutPolicyV33(true);
        expect(() => validateMissionNativeCloseoutPolicyV33({
            ...policy,
            externalQueueControllerExclusiveFocusAdapter: false,
        } as any)).toThrow("external queue-controller adapter");
        expect(() => validateMissionNativeCloseoutPolicyV33({
            ...policy,
            adaptiveGroundAssaultQueuedProductionFocusPriority: 1_000,
        } as any)).toThrow("inherited field adaptiveGroundAssaultQueuedProductionFocusPriority");
        expect(() => validateMissionNativeCloseoutPolicyV33({
            ...policy,
            adaptiveGroundAssaultScreenInfrastructure: false,
        } as any)).toThrow("inherited field adaptiveGroundAssaultScreenInfrastructure");
        const { externalQueueControllerExclusiveFocusAdapter: _removed, ...missing } = policy;
        expect(() => validateMissionNativeCloseoutPolicyV33(missing as any)).toThrow("exact schema");
    });
});
