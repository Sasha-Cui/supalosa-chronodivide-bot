import { describe, expect, test } from "vitest";
import {
    buildMissionNativeCloseoutPolicyV32,
    missionNativeCloseoutPolicyV32Sha256,
    validateMissionNativeCloseoutPolicyV32,
} from "../training/missionNativeCloseoutPolicyV32.js";

describe("mission-native closeout policy v32", () => {
    test("promotes the V31 request to exclusive queue-safe focus", () => {
        const policy = buildMissionNativeCloseoutPolicyV32(true);
        expect(policy.schemaVersion).toBe(32);
        expect(policy.enabled).toBe(true);
        expect(policy.adaptiveGroundAssaultScreenInfrastructure).toBe(true);
        expect(policy.adaptiveGroundAssaultProductionReservation).toBe(false);
        expect(policy.adaptiveGroundAssaultQueuedProductionFocusPriority).toBe(10_000);
        expect(policy.preterminalObjectiveFeasibilityRequiresTransferredCapability).toBe(true);
        expect(missionNativeCloseoutPolicyV32Sha256(policy)).toMatch(/^[0-9a-f]{64}$/);
        expect(missionNativeCloseoutPolicyV32Sha256(policy)).toBe(
            missionNativeCloseoutPolicyV32Sha256(buildMissionNativeCloseoutPolicyV32(true)),
        );
    });

    test("preserves exact disabled-control construction", () => {
        const policy = buildMissionNativeCloseoutPolicyV32(false);
        expect(policy.enabled).toBe(false);
        expect(policy.adaptiveGroundAssaultScreenInfrastructure).toBe(true);
        expect(policy.adaptiveGroundAssaultProductionReservation).toBe(false);
        expect(policy.adaptiveGroundAssaultQueuedProductionFocusPriority).toBe(10_000);
        expect(validateMissionNativeCloseoutPolicyV32(policy)).toEqual(policy);
    });

    test("rejects focus or inherited safety mechanisms drifting", () => {
        const policy = buildMissionNativeCloseoutPolicyV32(true);
        expect(() => validateMissionNativeCloseoutPolicyV32({
            ...policy,
            adaptiveGroundAssaultQueuedProductionFocusPriority: 1_000,
        } as any)).toThrow("exclusive queue-safe production focus");
        expect(() => validateMissionNativeCloseoutPolicyV32({
            ...policy,
            adaptiveGroundAssaultScreenInfrastructure: false,
        } as any)).toThrow("inherited field adaptiveGroundAssaultScreenInfrastructure");
        const { adaptiveGroundAssaultQueuedProductionFocusPriority: _removed, ...missing } = policy;
        expect(() => validateMissionNativeCloseoutPolicyV32(missing as any)).toThrow("exact schema");
    });
});
