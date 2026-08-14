import { describe, expect, it } from "vitest";
import {
    buildMissionNativeCloseoutPolicyV17,
    missionNativeCloseoutPolicyV17Sha256,
    validateMissionNativeCloseoutPolicyV17,
} from "../training/missionNativeCloseoutPolicyV17.js";

describe("mission-native closeout policy v17", () => {
    it("adds side-generic assault infrastructure to V16 readiness", () => {
        const policy = buildMissionNativeCloseoutPolicyV17();
        expect(policy).toMatchObject({
            schemaVersion: 17,
            activationMode: "objectiveVanguardRouteClearance",
            readinessReserve: true,
            readinessReserveScope: "reinforcements",
            engagementAllocationMode: "allBlocker",
            commitRouteBlocker: true,
            adaptiveGroundAssaultTargetCount: 4,
            adaptiveGroundAssaultInfrastructure: true,
        });
        expect(missionNativeCloseoutPolicyV17Sha256(policy)).toMatch(/^[a-f0-9]{64}$/);
    });

    it("retains the disabled adapter representation", () => {
        expect(buildMissionNativeCloseoutPolicyV17(false).enabled).toBe(false);
    });

    it("rejects infrastructure and inherited drift", () => {
        expect(() => validateMissionNativeCloseoutPolicyV17({
            ...buildMissionNativeCloseoutPolicyV17(),
            adaptiveGroundAssaultInfrastructure: false,
        } as any)).toThrow(/assault-infrastructure/);
        expect(() => validateMissionNativeCloseoutPolicyV17({
            ...buildMissionNativeCloseoutPolicyV17(),
            targetPriority: "nearest",
        } as any)).toThrow(/inherited field/);
    });
});
