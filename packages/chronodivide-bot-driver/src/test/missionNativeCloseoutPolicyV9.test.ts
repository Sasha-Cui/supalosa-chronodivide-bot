import { describe, expect, it } from "vitest";
import {
    buildMissionNativeCloseoutPolicyV9,
    missionNativeCloseoutPolicyV9Sha256,
    validateMissionNativeCloseoutPolicyV9,
} from "../training/missionNativeCloseoutPolicyV9.js";

describe("mission-native closeout policy v9", () => {
    it("adds only the dual-track readiness reserve", () => {
        const policy = buildMissionNativeCloseoutPolicyV9();
        expect(policy).toMatchObject({
            schemaVersion: 9,
            enabled: true,
            activationMode: "objectiveRace",
            readinessReserve: true,
            targetPriority: "reinforcement",
            engagementMode: "completionRace",
            engagementAllocationMode: "allBlocker",
            commitRouteBlocker: true,
        });
        expect(missionNativeCloseoutPolicyV9Sha256(policy)).toMatch(/^[a-f0-9]{64}$/);
    });

    it("retains the disabled equivalence counterfactual", () => {
        expect(buildMissionNativeCloseoutPolicyV9(false).enabled).toBe(false);
    });

    it("rejects reserve or inherited-policy drift", () => {
        expect(() => validateMissionNativeCloseoutPolicyV9({
            ...buildMissionNativeCloseoutPolicyV9(),
            readinessReserve: false,
        } as any)).toThrow(/reserve representation/);
        expect(() => validateMissionNativeCloseoutPolicyV9({
            ...buildMissionNativeCloseoutPolicyV9(),
            activationMode: "lowBuilding",
        } as any)).toThrow(/inherited field activationMode/);
    });
});
