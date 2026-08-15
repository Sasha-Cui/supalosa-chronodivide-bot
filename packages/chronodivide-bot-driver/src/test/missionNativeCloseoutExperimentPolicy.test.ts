import { describe, expect, it } from "vitest";
import { MissionNativeCloseoutPolicyV35 } from "../training/missionNativeCloseoutPolicyV35.js";
import {
    MISSION_NATIVE_CLOSEOUT_ARM_ORDER,
    MISSION_NATIVE_CLOSEOUT_V34_POLICY_ID,
    MISSION_NATIVE_CLOSEOUT_V35_POLICY_ID,
    buildMissionNativeCloseoutArms,
    missionNativeCloseoutExperimentPolicySha256,
    validateMissionNativeCloseoutExperimentPolicy,
} from "../training/missionNativeCloseoutExperimentPolicy.js";

describe("mission-native closeout experiment policies", () => {
    it("freezes exact Supalosa, V34, and V35 in causal order", () => {
        const arms = buildMissionNativeCloseoutArms();
        expect(arms.map(({ armId }) => armId)).toEqual(MISSION_NATIVE_CLOSEOUT_ARM_ORDER);
        expect(arms.map(({ policy }) => policy.missionPolicyId)).toEqual([
            null,
            MISSION_NATIVE_CLOSEOUT_V34_POLICY_ID,
            MISSION_NATIVE_CLOSEOUT_V35_POLICY_ID,
        ]);
        expect(new Set(arms.map(({ policyId }) => policyId)).size).toBe(3);
        for (const arm of arms) {
            expect(validateMissionNativeCloseoutExperimentPolicy(arm.policy)).toEqual(arm.policy);
            expect(missionNativeCloseoutExperimentPolicySha256(arm.policy)).toBe(arm.policyId);
        }
    });

    it("isolates V35 to the frozen physical-progress deadline fields", () => {
        const [, v34Arm, v35Arm] = buildMissionNativeCloseoutArms();
        const v34 = v34Arm.policy.missionPolicy!;
        const v35 = v35Arm.policy.missionPolicy!;
        const {
            schemaVersion: _v35Schema,
            physicalProgressDeadlineFallback,
            buildingNoProgressDeadlineTicks,
            blockerNoProgressDeadlineTicks,
            predecessorFallbackTicks,
            ...v35Inherited
        } = v35 as MissionNativeCloseoutPolicyV35;
        const { schemaVersion: _v34Schema, ...v34Inherited } = v34;
        expect(v35Inherited).toEqual(v34Inherited);
        expect({
            physicalProgressDeadlineFallback,
            buildingNoProgressDeadlineTicks,
            blockerNoProgressDeadlineTicks,
            predecessorFallbackTicks,
        }).toEqual({
            physicalProgressDeadlineFallback: true,
            buildingNoProgressDeadlineTicks: 300,
            blockerNoProgressDeadlineTicks: 240,
            predecessorFallbackTicks: 180,
        });
    });

    it("fails closed if the exact external control is coupled to a mission policy", () => {
        const [external, v34] = buildMissionNativeCloseoutArms();
        expect(() => validateMissionNativeCloseoutExperimentPolicy({
            ...external.policy,
            missionPolicyId: v34.policy.missionPolicyId,
            missionPolicy: v34.policy.missionPolicy,
        })).toThrow("External Supalosa control");
    });
});
