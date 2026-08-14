import { describe, expect, it } from "vitest";
import {
    buildMissionNativeCloseoutPolicyV2,
    missionNativeCloseoutPolicyV2Sha256,
    validateMissionNativeCloseoutPolicyV2,
} from "../training/missionNativeCloseoutPolicyV2.js";

describe("mission-native closeout policy v2", () => {
    it("adds only the completion-race engagement contract", () => {
        const policy = buildMissionNativeCloseoutPolicyV2();
        expect(policy).toMatchObject({
            schemaVersion: 2,
            enabled: true,
            engagementMode: "completionRace",
            routeCorridorRadius: 8,
            maxTargetGroups: 1,
            reserveCombatants: 0,
        });
        expect(missionNativeCloseoutPolicyV2Sha256(policy)).toMatch(/^[a-f0-9]{64}$/);
    });

    it("retains the disabled equivalence counterfactual", () => {
        expect(buildMissionNativeCloseoutPolicyV2(false).enabled).toBe(false);
    });

    it("rejects engagement or inherited-policy drift", () => {
        expect(() => validateMissionNativeCloseoutPolicyV2({
            ...buildMissionNativeCloseoutPolicyV2(),
            routeCorridorRadius: 9,
        } as any)).toThrow(/engagement representation/);
        expect(() => validateMissionNativeCloseoutPolicyV2({
            ...buildMissionNativeCloseoutPolicyV2(),
            reserveCombatants: 1,
        } as any)).toThrow(/inherited field reserveCombatants/);
    });
});
