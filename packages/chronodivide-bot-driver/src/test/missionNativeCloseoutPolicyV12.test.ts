import { describe, expect, it } from "vitest";
import {
    buildMissionNativeCloseoutPolicyV12,
    missionNativeCloseoutPolicyV12Sha256,
    validateMissionNativeCloseoutPolicyV12,
} from "../training/missionNativeCloseoutPolicyV12.js";

describe("mission-native closeout policy v12", () => {
    it("changes only activation to transfer-certified aggregate route clearance", () => {
        const policy = buildMissionNativeCloseoutPolicyV12();
        expect(policy).toMatchObject({
            schemaVersion: 12,
            enabled: true,
            activationMode: "objectiveTransferableRouteClearance",
            readinessReserve: true,
            targetPriority: "reinforcement",
            engagementMode: "completionRace",
            engagementAllocationMode: "allBlocker",
            commitRouteBlocker: true,
        });
        expect(missionNativeCloseoutPolicyV12Sha256(policy)).toMatch(/^[a-f0-9]{64}$/);
    });

    it("retains the disabled equivalence counterfactual", () => {
        expect(buildMissionNativeCloseoutPolicyV12(false).enabled).toBe(false);
    });

    it("rejects certificate or inherited-policy drift", () => {
        expect(() => validateMissionNativeCloseoutPolicyV12({
            ...buildMissionNativeCloseoutPolicyV12(),
            activationMode: "objectiveRouteClearance",
        } as any)).toThrow(/activation representation/);
        expect(() => validateMissionNativeCloseoutPolicyV12({
            ...buildMissionNativeCloseoutPolicyV12(),
            readinessReserve: false,
        } as any)).toThrow(/inherited field readinessReserve/);
    });
});
