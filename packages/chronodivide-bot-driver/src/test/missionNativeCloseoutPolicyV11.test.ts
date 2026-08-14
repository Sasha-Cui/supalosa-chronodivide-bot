import { describe, expect, it } from "vitest";
import {
    buildMissionNativeCloseoutPolicyV11,
    missionNativeCloseoutPolicyV11Sha256,
    validateMissionNativeCloseoutPolicyV11,
} from "../training/missionNativeCloseoutPolicyV11.js";

describe("mission-native closeout policy v11", () => {
    it("changes only activation to aggregate route clearance", () => {
        const policy = buildMissionNativeCloseoutPolicyV11();
        expect(policy).toMatchObject({
            schemaVersion: 11,
            enabled: true,
            activationMode: "objectiveRouteClearance",
            readinessReserve: true,
            targetPriority: "reinforcement",
            engagementMode: "completionRace",
            engagementAllocationMode: "allBlocker",
            commitRouteBlocker: true,
        });
        expect(missionNativeCloseoutPolicyV11Sha256(policy)).toMatch(/^[a-f0-9]{64}$/);
    });

    it("retains the disabled equivalence counterfactual", () => {
        expect(buildMissionNativeCloseoutPolicyV11(false).enabled).toBe(false);
    });

    it("rejects certificate or inherited-policy drift", () => {
        expect(() => validateMissionNativeCloseoutPolicyV11({
            ...buildMissionNativeCloseoutPolicyV11(),
            activationMode: "objectiveClearance",
        } as any)).toThrow(/activation representation/);
        expect(() => validateMissionNativeCloseoutPolicyV11({
            ...buildMissionNativeCloseoutPolicyV11(),
            readinessReserve: false,
        } as any)).toThrow(/inherited field readinessReserve/);
    });
});
