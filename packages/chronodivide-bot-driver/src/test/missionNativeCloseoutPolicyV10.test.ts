import { describe, expect, it } from "vitest";
import {
    buildMissionNativeCloseoutPolicyV10,
    missionNativeCloseoutPolicyV10Sha256,
    validateMissionNativeCloseoutPolicyV10,
} from "../training/missionNativeCloseoutPolicyV10.js";

describe("mission-native closeout policy v10", () => {
    it("changes only activation to certified route clearance", () => {
        const policy = buildMissionNativeCloseoutPolicyV10();
        expect(policy).toMatchObject({
            schemaVersion: 10,
            enabled: true,
            activationMode: "objectiveClearance",
            readinessReserve: true,
            targetPriority: "reinforcement",
            engagementMode: "completionRace",
            engagementAllocationMode: "allBlocker",
            commitRouteBlocker: true,
        });
        expect(missionNativeCloseoutPolicyV10Sha256(policy)).toMatch(/^[a-f0-9]{64}$/);
    });

    it("retains the disabled equivalence counterfactual", () => {
        expect(buildMissionNativeCloseoutPolicyV10(false).enabled).toBe(false);
    });

    it("rejects certificate or inherited-policy drift", () => {
        expect(() => validateMissionNativeCloseoutPolicyV10({
            ...buildMissionNativeCloseoutPolicyV10(),
            activationMode: "objectiveRace",
        } as any)).toThrow(/activation representation/);
        expect(() => validateMissionNativeCloseoutPolicyV10({
            ...buildMissionNativeCloseoutPolicyV10(),
            readinessReserve: false,
        } as any)).toThrow(/inherited field readinessReserve/);
    });
});
