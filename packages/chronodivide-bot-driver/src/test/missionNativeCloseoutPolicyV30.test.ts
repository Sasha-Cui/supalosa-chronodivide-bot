import { describe, expect, test } from "vitest";
import {
    buildMissionNativeCloseoutPolicyV30,
    missionNativeCloseoutPolicyV30Sha256,
    validateMissionNativeCloseoutPolicyV30,
} from "../training/missionNativeCloseoutPolicyV30.js";

describe("mission-native closeout policy v30", () => {
    test("adds Soviet-compatible screen infrastructure and disables destructive reservation", () => {
        const policy = buildMissionNativeCloseoutPolicyV30(true);
        expect(policy.schemaVersion).toBe(30);
        expect(policy.enabled).toBe(true);
        expect(policy.adaptiveGroundAssaultScreenInfrastructure).toBe(true);
        expect(policy.adaptiveGroundAssaultProductionReservation).toBe(false);
        expect(policy.preterminalObjectiveFeasibilityRequiresTransferredCapability).toBe(true);
        expect(missionNativeCloseoutPolicyV30Sha256(policy)).toMatch(/^[0-9a-f]{64}$/);
        expect(missionNativeCloseoutPolicyV30Sha256(policy)).toBe(
            missionNativeCloseoutPolicyV30Sha256(buildMissionNativeCloseoutPolicyV30(true)),
        );
    });

    test("preserves exact disabled-control construction", () => {
        const policy = buildMissionNativeCloseoutPolicyV30(false);
        expect(policy.enabled).toBe(false);
        expect(policy.adaptiveGroundAssaultScreenInfrastructure).toBe(true);
        expect(policy.adaptiveGroundAssaultProductionReservation).toBe(false);
        expect(validateMissionNativeCloseoutPolicyV30(policy)).toEqual(policy);
    });

    test("rejects either safety mechanism drifting", () => {
        const policy = buildMissionNativeCloseoutPolicyV30(true);
        expect(() => validateMissionNativeCloseoutPolicyV30({
            ...policy,
            adaptiveGroundAssaultProductionReservation: true,
        } as any)).toThrow("prelaunch production safety");
        expect(() => validateMissionNativeCloseoutPolicyV30({
            ...policy,
            adaptiveGroundAssaultScreenInfrastructure: false,
        } as any)).toThrow("screen infrastructure");
        const { adaptiveGroundAssaultScreenInfrastructure: _removed, ...missing } = policy;
        expect(() => validateMissionNativeCloseoutPolicyV30(missing as any)).toThrow("exact schema");
    });
});
