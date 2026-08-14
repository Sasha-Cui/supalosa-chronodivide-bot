import { describe, expect, it } from "vitest";
import {
    buildMissionNativeCloseoutPolicyV24,
    missionNativeCloseoutPolicyV24Sha256,
    validateMissionNativeCloseoutPolicyV24,
} from "../training/missionNativeCloseoutPolicyV24.js";

describe("mission-native closeout policy v24", () => {
    it("adds only readiness ownership and progressive blocker launch to V23", () => {
        const policy = buildMissionNativeCloseoutPolicyV24();
        expect(policy).toMatchObject({
            schemaVersion: 24,
            adaptiveGroundAssaultReadinessForceOwnership: true,
            progressiveRouteBlockerLaunch: true,
        });
        expect(missionNativeCloseoutPolicyV24Sha256(policy)).toMatch(/^[a-f0-9]{64}$/);
    }, 90_000);

    it("retains the disabled adapter representation", () => {
        expect(buildMissionNativeCloseoutPolicyV24(false).enabled).toBe(false);
    }, 90_000);

    it("rejects readiness-ownership drift", () => {
        expect(() => validateMissionNativeCloseoutPolicyV24({
            ...buildMissionNativeCloseoutPolicyV24(),
            adaptiveGroundAssaultReadinessForceOwnership: false,
        } as any)).toThrow(/readiness-force ownership/);
    }, 90_000);

    it("rejects progressive-launch drift", () => {
        expect(() => validateMissionNativeCloseoutPolicyV24({
            ...buildMissionNativeCloseoutPolicyV24(),
            progressiveRouteBlockerLaunch: false,
        } as any)).toThrow(/progressive-blocker/);
    }, 90_000);
});
