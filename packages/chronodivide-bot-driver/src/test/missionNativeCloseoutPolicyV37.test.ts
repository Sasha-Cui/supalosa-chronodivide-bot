import { describe, expect, it } from "vitest";
import {
    buildMissionNativeCloseoutPolicyV37,
    validateMissionNativeCloseoutPolicyV37,
} from "../training/missionNativeCloseoutPolicyV37.js";

describe("mission-native closeout policy v37", () => {
    it("adds only active ownership-loss recovery to V36", () => {
        const policy = buildMissionNativeCloseoutPolicyV37(true);
        expect(policy).toMatchObject({
            schemaVersion: 37,
            enabled: true,
            engagementAllocationMode: "boundedScreen",
            terminalBuildingPriority: true,
            physicalProgressDeadlineFallback: true,
            buildingNoProgressDeadlineTicks: 300,
            blockerNoProgressDeadlineTicks: 240,
            predecessorFallbackTicks: 180,
            noOwnerFallbackRecovery: true,
            predecessorOwnershipGraceTicks: 120,
            recoverAfterPredecessorOwnershipLoss: true,
        });
    });

    it("preserves exact disabled construction", () => {
        expect(buildMissionNativeCloseoutPolicyV37(false)).toMatchObject({
            schemaVersion: 37,
            enabled: false,
            noOwnerFallbackRecovery: true,
            predecessorOwnershipGraceTicks: 120,
            recoverAfterPredecessorOwnershipLoss: true,
        });
    });

    it("fails closed on recovery or inherited-policy drift", () => {
        const policy = buildMissionNativeCloseoutPolicyV37(true);
        expect(() => validateMissionNativeCloseoutPolicyV37({
            ...policy,
            recoverAfterPredecessorOwnershipLoss: false,
        } as any)).toThrow("ownership-loss recovery representation");
        expect(() => validateMissionNativeCloseoutPolicyV37({
            ...policy,
            predecessorFallbackTicks: 181,
        } as any)).toThrow("inherited field predecessorFallbackTicks");
        const { recoverAfterPredecessorOwnershipLoss: _removed, ...missing } = policy;
        expect(() => validateMissionNativeCloseoutPolicyV37(missing as any)).toThrow("invalid exact schema");
    });
});
