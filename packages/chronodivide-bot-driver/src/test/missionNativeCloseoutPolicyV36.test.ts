import { describe, expect, it } from "vitest";
import {
    buildMissionNativeCloseoutPolicyV36,
    validateMissionNativeCloseoutPolicyV36,
} from "../training/missionNativeCloseoutPolicyV36.js";

describe("mission-native closeout policy v36", () => {
    it("adds only frozen no-owner recovery to V35", () => {
        const policy = buildMissionNativeCloseoutPolicyV36(true);
        expect(policy).toMatchObject({
            schemaVersion: 36,
            enabled: true,
            engagementAllocationMode: "boundedScreen",
            terminalBuildingPriority: true,
            physicalProgressDeadlineFallback: true,
            buildingNoProgressDeadlineTicks: 300,
            blockerNoProgressDeadlineTicks: 240,
            predecessorFallbackTicks: 180,
            noOwnerFallbackRecovery: true,
            predecessorOwnershipGraceTicks: 120,
        });
    });

    it("preserves exact disabled construction", () => {
        expect(buildMissionNativeCloseoutPolicyV36(false)).toMatchObject({
            schemaVersion: 36,
            enabled: false,
            noOwnerFallbackRecovery: true,
            predecessorOwnershipGraceTicks: 120,
        });
    });

    it("fails closed on recovery or inherited-policy drift", () => {
        const policy = buildMissionNativeCloseoutPolicyV36(true);
        expect(() => validateMissionNativeCloseoutPolicyV36({
            ...policy,
            predecessorOwnershipGraceTicks: 121,
        } as any)).toThrow("no-owner recovery representation");
        expect(() => validateMissionNativeCloseoutPolicyV36({
            ...policy,
            predecessorFallbackTicks: 181,
        } as any)).toThrow("inherited field predecessorFallbackTicks");
        const { noOwnerFallbackRecovery: _removed, ...missing } = policy;
        expect(() => validateMissionNativeCloseoutPolicyV36(missing as any)).toThrow("invalid exact schema");
    });
});
