import { describe, expect, it } from "vitest";
import {
    buildMissionNativeCloseoutPolicyV23,
    missionNativeCloseoutPolicyV23Sha256,
    validateMissionNativeCloseoutPolicyV23,
} from "../training/missionNativeCloseoutPolicyV23.js";

describe("mission-native closeout policy v23", () => {
    it("adds only a factory trigger to the V22 readiness screen", () => {
        const policy = buildMissionNativeCloseoutPolicyV23();
        expect(policy).toMatchObject({
            schemaVersion: 23,
            readinessReserveDefenseRadius: 12,
            adaptiveGroundAssaultScreenTargetCount: 4,
            adaptiveGroundAssaultScreenFactoryTrigger: true,
        });
        expect(missionNativeCloseoutPolicyV23Sha256(policy)).toMatch(/^[a-f0-9]{64}$/);
    }, 60_000);

    it("retains the disabled adapter representation", () => {
        expect(buildMissionNativeCloseoutPolicyV23(false).enabled).toBe(false);
    }, 60_000);

    it("rejects factory-trigger drift", () => {
        expect(() => validateMissionNativeCloseoutPolicyV23({
            ...buildMissionNativeCloseoutPolicyV23(),
            adaptiveGroundAssaultScreenFactoryTrigger: false,
        } as any)).toThrow(/factory trigger/);
    }, 60_000);

    it("rejects inherited drift", () => {
        expect(() => validateMissionNativeCloseoutPolicyV23({
            ...buildMissionNativeCloseoutPolicyV23(),
            adaptiveGroundAssaultScreenTargetCount: 3,
        } as any)).toThrow(/screen target/);
    }, 60_000);
});
