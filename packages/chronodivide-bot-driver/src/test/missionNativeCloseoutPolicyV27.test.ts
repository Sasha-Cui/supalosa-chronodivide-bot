import { describe, expect, test } from "vitest";
import {
    buildMissionNativeCloseoutPolicyV27,
    missionNativeCloseoutPolicyV27Sha256,
    validateMissionNativeCloseoutPolicyV27,
} from "../training/missionNativeCloseoutPolicyV27.js";

describe("mission-native closeout policy v27", () => {
    test("adds only persistent scope and transferred capability to V26", () => {
        const policy = buildMissionNativeCloseoutPolicyV27(true);
        expect(policy).toMatchObject({
            schemaVersion: 27,
            enabled: true,
            persistentCloseoutActivationScope: true,
            requireTransferredGroundAssaultCapabilityForActivation: true,
        });
        expect(missionNativeCloseoutPolicyV27Sha256(policy)).toMatch(/^[0-9a-f]{64}$/);
    }, 180_000);

    test("preserves the disabled control", () => {
        expect(buildMissionNativeCloseoutPolicyV27(false).enabled).toBe(false);
    }, 180_000);

    test("rejects scope, transfer, and schema drift", () => {
        const policy = buildMissionNativeCloseoutPolicyV27(true);
        expect(() => validateMissionNativeCloseoutPolicyV27({
            ...policy,
            persistentCloseoutActivationScope: false,
        } as any)).toThrow("persistent activation scope");
        expect(() => validateMissionNativeCloseoutPolicyV27({
            ...policy,
            requireTransferredGroundAssaultCapabilityForActivation: false,
        } as any)).toThrow("transferred capability");
        expect(() => validateMissionNativeCloseoutPolicyV27({
            ...policy,
            unexpected: true,
        } as any)).toThrow("exact schema");
    }, 240_000);
});
