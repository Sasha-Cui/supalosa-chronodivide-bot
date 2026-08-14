import { describe, expect, it } from "vitest";
import {
    buildMissionNativeCloseoutPolicyV20,
    missionNativeCloseoutPolicyV20Sha256,
    validateMissionNativeCloseoutPolicyV20,
} from "../training/missionNativeCloseoutPolicyV20.js";

describe("mission-native closeout policy v20", () => {
    it("adds only a persistent production-scope latch to V19", () => {
        const policy = buildMissionNativeCloseoutPolicyV20();
        expect(policy).toMatchObject({
            schemaVersion: 20,
            activationMode: "objectiveVanguardRouteClearance",
            adaptiveGroundAssaultTargetCount: 4,
            adaptiveGroundAssaultInfrastructure: true,
            adaptiveGroundAssaultInfrastructurePriority: 300,
            adaptiveGroundAssaultProductionReservation: true,
            adaptiveGroundAssaultProductionScopeLatch: true,
        });
        expect(missionNativeCloseoutPolicyV20Sha256(policy)).toMatch(/^[a-f0-9]{64}$/);
    });

    it("retains the disabled adapter representation", () => {
        expect(buildMissionNativeCloseoutPolicyV20(false).enabled).toBe(false);
    });

    it("rejects latch drift", () => {
        expect(() => validateMissionNativeCloseoutPolicyV20({
            ...buildMissionNativeCloseoutPolicyV20(),
            adaptiveGroundAssaultProductionScopeLatch: false,
        } as any)).toThrow(/latch/);
    });

    it("rejects inherited drift", () => {
        expect(() => validateMissionNativeCloseoutPolicyV20({
            ...buildMissionNativeCloseoutPolicyV20(),
            targetPriority: "nearest",
        } as any)).toThrow(/inherited field/);
    });
});
