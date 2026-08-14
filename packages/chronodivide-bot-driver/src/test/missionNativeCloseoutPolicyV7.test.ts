import { describe, expect, it } from "vitest";
import {
    buildMissionNativeCloseoutPolicyV7,
    missionNativeCloseoutPolicyV7Sha256,
    validateMissionNativeCloseoutPolicyV7,
} from "../training/missionNativeCloseoutPolicyV7.js";

describe("mission-native closeout policy v7", () => {
    it("changes only target ranking to reinforcement suppression", () => {
        const policy = buildMissionNativeCloseoutPolicyV7();
        expect(policy).toMatchObject({
            schemaVersion: 7,
            enabled: true,
            targetPriority: "reinforcement",
            engagementMode: "completionRace",
            engagementAllocationMode: "allBlocker",
            commitRouteBlocker: true,
        });
        expect(missionNativeCloseoutPolicyV7Sha256(policy)).toMatch(/^[a-f0-9]{64}$/);
    });

    it("retains the disabled equivalence counterfactual", () => {
        expect(buildMissionNativeCloseoutPolicyV7(false).enabled).toBe(false);
    });

    it("rejects target-priority or inherited-policy drift", () => {
        expect(() => validateMissionNativeCloseoutPolicyV7({
            ...buildMissionNativeCloseoutPolicyV7(),
            targetPriority: "nearest",
        } as any)).toThrow(/target-priority representation/);
        expect(() => validateMissionNativeCloseoutPolicyV7({
            ...buildMissionNativeCloseoutPolicyV7(),
            commitRouteBlocker: false,
        } as any)).toThrow(/inherited field commitRouteBlocker/);
    });
});
