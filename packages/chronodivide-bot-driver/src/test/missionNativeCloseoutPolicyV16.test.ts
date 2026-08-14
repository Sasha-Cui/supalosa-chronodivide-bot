import { describe, expect, it } from "vitest";
import {
    buildMissionNativeCloseoutPolicyV16,
    missionNativeCloseoutPolicyV16Sha256,
    validateMissionNativeCloseoutPolicyV16,
} from "../training/missionNativeCloseoutPolicyV16.js";

describe("mission-native closeout policy v16", () => {
    it("freezes continuous-vanguard combined-arms readiness on V14 micro", () => {
        const policy = buildMissionNativeCloseoutPolicyV16();
        expect(policy).toMatchObject({
            schemaVersion: 16,
            activationMode: "objectiveVanguardRouteClearance",
            readinessReserve: true,
            readinessReserveScope: "reinforcements",
            engagementAllocationMode: "allBlocker",
            commitRouteBlocker: true,
            adaptiveGroundAssaultTargetCount: 4,
        });
        expect(missionNativeCloseoutPolicyV16Sha256(policy)).toMatch(/^[a-f0-9]{64}$/);
    });

    it("retains the disabled adapter representation", () => {
        expect(buildMissionNativeCloseoutPolicyV16(false).enabled).toBe(false);
    });

    it("rejects readiness and inherited drift", () => {
        expect(() => validateMissionNativeCloseoutPolicyV16({
            ...buildMissionNativeCloseoutPolicyV16(),
            adaptiveGroundAssaultTargetCount: 3,
        } as any)).toThrow(/assault-production ceiling/);
        expect(() => validateMissionNativeCloseoutPolicyV16({
            ...buildMissionNativeCloseoutPolicyV16(),
            targetPriority: "nearest",
        } as any)).toThrow(/inherited field/);
    });
});
