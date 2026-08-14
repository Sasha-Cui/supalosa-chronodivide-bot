import { describe, expect, it } from "vitest";
import {
    buildMissionNativeCloseoutPolicyV22,
    missionNativeCloseoutPolicyV22Sha256,
    validateMissionNativeCloseoutPolicyV22,
} from "../training/missionNativeCloseoutPolicyV22.js";

describe("mission-native closeout policy v22", () => {
    it("adds only a side-generic readiness screen to V21", () => {
        const policy = buildMissionNativeCloseoutPolicyV22();
        expect(policy).toMatchObject({
            schemaVersion: 22,
            readinessReserveDefenseRadius: 12,
            adaptiveGroundAssaultScreenTargetCount: 4,
        });
        expect(missionNativeCloseoutPolicyV22Sha256(policy)).toMatch(/^[a-f0-9]{64}$/);
    }, 30_000);
    it("retains the disabled adapter representation", () => {
        expect(buildMissionNativeCloseoutPolicyV22(false).enabled).toBe(false);
    }, 30_000);
    it("rejects screen-target drift", () => {
        expect(() => validateMissionNativeCloseoutPolicyV22({
            ...buildMissionNativeCloseoutPolicyV22(), adaptiveGroundAssaultScreenTargetCount: 3,
        } as any)).toThrow(/screen target/);
    }, 30_000);
    it("rejects inherited drift", () => {
        expect(() => validateMissionNativeCloseoutPolicyV22({
            ...buildMissionNativeCloseoutPolicyV22(), targetPriority: "nearest",
        } as any)).toThrow(/inherited field/);
    }, 30_000);
});
