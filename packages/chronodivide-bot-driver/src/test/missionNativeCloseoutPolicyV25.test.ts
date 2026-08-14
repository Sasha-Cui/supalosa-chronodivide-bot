import { describe, expect, test } from "vitest";
import {
    buildMissionNativeCloseoutPolicyV25,
    missionNativeCloseoutPolicyV25Sha256,
    validateMissionNativeCloseoutPolicyV25,
} from "../training/missionNativeCloseoutPolicyV25.js";

describe("mission-native closeout policy v25", () => {
    test("freezes the combined-arms activation certificate", () => {
        const policy = buildMissionNativeCloseoutPolicyV25();
        expect(policy).toMatchObject({
            schemaVersion: 25,
            adaptiveGroundAssaultReadinessForceOwnership: true,
            progressiveRouteBlockerLaunch: true,
            requireGroundAssaultCapabilityForActivation: true,
        });
        expect(missionNativeCloseoutPolicyV25Sha256(policy)).toMatch(/^[a-f0-9]{64}$/);
    }, 120_000);

    test("preserves the disabled control", () => {
        expect(buildMissionNativeCloseoutPolicyV25(false).enabled).toBe(false);
    }, 120_000);

    test("rejects capability drift and extra fields", () => {
        expect(() => validateMissionNativeCloseoutPolicyV25({
            ...buildMissionNativeCloseoutPolicyV25(),
            requireGroundAssaultCapabilityForActivation: false,
        } as any)).toThrow("activation capability drifted");
        expect(() => validateMissionNativeCloseoutPolicyV25({
            ...buildMissionNativeCloseoutPolicyV25(),
            extra: true,
        } as any)).toThrow("invalid exact schema");
    }, 120_000);
});
