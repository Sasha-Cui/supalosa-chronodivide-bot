import { describe, expect, it } from "vitest";
import {
    buildMissionNativeCloseoutPolicyV35,
    validateMissionNativeCloseoutPolicyV35,
} from "../training/missionNativeCloseoutPolicyV35.js";

describe("mission-native closeout policy v35", () => {
    it("adds only the frozen physical-progress deadline mechanism to V34", () => {
        const policy = buildMissionNativeCloseoutPolicyV35(true);
        expect(policy).toMatchObject({
            schemaVersion: 35,
            enabled: true,
            engagementAllocationMode: "boundedScreen",
            terminalBuildingPriority: true,
            physicalProgressDeadlineFallback: true,
            buildingNoProgressDeadlineTicks: 300,
            blockerNoProgressDeadlineTicks: 240,
            predecessorFallbackTicks: 180,
        });
    });

    it("preserves exact disabled construction", () => {
        expect(buildMissionNativeCloseoutPolicyV35(false)).toMatchObject({
            schemaVersion: 35,
            enabled: false,
            physicalProgressDeadlineFallback: true,
        });
    });

    it("fails closed on timing or inherited-policy drift", () => {
        const policy = buildMissionNativeCloseoutPolicyV35(true);
        expect(() => validateMissionNativeCloseoutPolicyV35({
            ...policy,
            buildingNoProgressDeadlineTicks: 301,
        } as any)).toThrow("liveness representation");
        expect(() => validateMissionNativeCloseoutPolicyV35({
            ...policy,
            terminalBuildingPriority: false,
        } as any)).toThrow("inherited field terminalBuildingPriority");
        const { predecessorFallbackTicks: _removed, ...missing } = policy;
        expect(() => validateMissionNativeCloseoutPolicyV35(missing as any)).toThrow("invalid exact schema");
    });
});
