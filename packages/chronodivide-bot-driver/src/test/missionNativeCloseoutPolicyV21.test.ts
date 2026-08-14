import { describe, expect, it } from "vitest";
import {
    buildMissionNativeCloseoutPolicyV21,
    missionNativeCloseoutPolicyV21Sha256,
    validateMissionNativeCloseoutPolicyV21,
} from "../training/missionNativeCloseoutPolicyV21.js";

describe("mission-native closeout policy v21", () => {
    it("adds only active readiness defense to V20", () => {
        const policy = buildMissionNativeCloseoutPolicyV21();
        expect(policy).toMatchObject({ schemaVersion: 21, readinessReserveDefenseRadius: 12 });
        expect(missionNativeCloseoutPolicyV21Sha256(policy)).toMatch(/^[a-f0-9]{64}$/);
    }, 15_000);
    it("retains the disabled adapter representation", () => {
        expect(buildMissionNativeCloseoutPolicyV21(false).enabled).toBe(false);
    }, 15_000);
    it("rejects defense-radius drift", () => {
        expect(() => validateMissionNativeCloseoutPolicyV21({
            ...buildMissionNativeCloseoutPolicyV21(), readinessReserveDefenseRadius: 11,
        } as any)).toThrow(/defense radius/);
    }, 15_000);
    it("rejects inherited drift", () => {
        expect(() => validateMissionNativeCloseoutPolicyV21({
            ...buildMissionNativeCloseoutPolicyV21(), targetPriority: "nearest",
        } as any)).toThrow(/inherited field/);
    }, 15_000);
});
