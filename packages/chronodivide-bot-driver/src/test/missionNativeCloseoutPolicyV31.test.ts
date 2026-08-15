import { describe, expect, test } from "vitest";
import {
    buildMissionNativeCloseoutPolicyV31,
    missionNativeCloseoutPolicyV31Sha256,
    validateMissionNativeCloseoutPolicyV31,
} from "../training/missionNativeCloseoutPolicyV31.js";

describe("mission-native closeout policy v31", () => {
    test("adds only queue-safe production focus to V30", () => {
        const policy = buildMissionNativeCloseoutPolicyV31(true);
        expect(policy.schemaVersion).toBe(31);
        expect(policy.enabled).toBe(true);
        expect(policy.adaptiveGroundAssaultScreenInfrastructure).toBe(true);
        expect(policy.adaptiveGroundAssaultProductionReservation).toBe(false);
        expect(policy.adaptiveGroundAssaultQueuedProductionFocusPriority).toBe(1_000);
        expect(policy.preterminalObjectiveFeasibilityRequiresTransferredCapability).toBe(true);
        expect(missionNativeCloseoutPolicyV31Sha256(policy)).toMatch(/^[0-9a-f]{64}$/);
        expect(missionNativeCloseoutPolicyV31Sha256(policy)).toBe(
            missionNativeCloseoutPolicyV31Sha256(buildMissionNativeCloseoutPolicyV31(true)),
        );
    });

    test("preserves exact disabled-control construction", () => {
        const policy = buildMissionNativeCloseoutPolicyV31(false);
        expect(policy.enabled).toBe(false);
        expect(policy.adaptiveGroundAssaultScreenInfrastructure).toBe(true);
        expect(policy.adaptiveGroundAssaultProductionReservation).toBe(false);
        expect(policy.adaptiveGroundAssaultQueuedProductionFocusPriority).toBe(1_000);
        expect(validateMissionNativeCloseoutPolicyV31(policy)).toEqual(policy);
    });

    test("rejects focus or inherited safety mechanisms drifting", () => {
        const policy = buildMissionNativeCloseoutPolicyV31(true);
        expect(() => validateMissionNativeCloseoutPolicyV31({
            ...policy,
            adaptiveGroundAssaultQueuedProductionFocusPriority: 999,
        } as any)).toThrow("queue-safe production focus");
        expect(() => validateMissionNativeCloseoutPolicyV31({
            ...policy,
            adaptiveGroundAssaultScreenInfrastructure: false,
        } as any)).toThrow("inherited field adaptiveGroundAssaultScreenInfrastructure");
        const { adaptiveGroundAssaultQueuedProductionFocusPriority: _removed, ...missing } = policy;
        expect(() => validateMissionNativeCloseoutPolicyV31(missing as any)).toThrow("exact schema");
    });
});
