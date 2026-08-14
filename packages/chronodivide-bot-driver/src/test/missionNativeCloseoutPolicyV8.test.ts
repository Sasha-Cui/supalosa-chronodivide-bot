import { describe, expect, it } from "vitest";
import {
    buildMissionNativeCloseoutPolicyV8,
    missionNativeCloseoutPolicyV8Sha256,
    validateMissionNativeCloseoutPolicyV8,
} from "../training/missionNativeCloseoutPolicyV8.js";

describe("mission-native closeout policy v8", () => {
    it("changes only takeover activation to the objective-race certificate", () => {
        const policy = buildMissionNativeCloseoutPolicyV8();
        expect(policy).toMatchObject({
            schemaVersion: 8,
            enabled: true,
            activationMode: "objectiveRace",
            targetPriority: "reinforcement",
            engagementMode: "completionRace",
            engagementAllocationMode: "allBlocker",
            commitRouteBlocker: true,
        });
        expect(missionNativeCloseoutPolicyV8Sha256(policy)).toMatch(/^[a-f0-9]{64}$/);
    });

    it("retains the disabled equivalence counterfactual", () => {
        expect(buildMissionNativeCloseoutPolicyV8(false).enabled).toBe(false);
    });

    it("rejects activation or inherited-policy drift", () => {
        expect(() => validateMissionNativeCloseoutPolicyV8({
            ...buildMissionNativeCloseoutPolicyV8(),
            activationMode: "lowBuilding",
        } as any)).toThrow(/activation representation/);
        expect(() => validateMissionNativeCloseoutPolicyV8({
            ...buildMissionNativeCloseoutPolicyV8(),
            targetPriority: "nearest",
        } as any)).toThrow(/inherited field targetPriority/);
    });
});
