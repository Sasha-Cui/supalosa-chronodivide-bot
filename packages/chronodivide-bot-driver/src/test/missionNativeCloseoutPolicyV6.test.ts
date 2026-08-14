import { describe, expect, it } from "vitest";
import {
    buildMissionNativeCloseoutPolicyV6,
    missionNativeCloseoutPolicyV6Sha256,
    validateMissionNativeCloseoutPolicyV6,
} from "../training/missionNativeCloseoutPolicyV6.js";

describe("mission-native closeout policy v6", () => {
    it("changes only blocker allocation and blocker commitment", () => {
        const policy = buildMissionNativeCloseoutPolicyV6();
        expect(policy).toMatchObject({
            schemaVersion: 6,
            enabled: true,
            engagementMode: "completionRace",
            engagementAllocationMode: "allBlocker",
            retargetStalledBuildings: true,
            commitRouteBlocker: true,
        });
        expect(missionNativeCloseoutPolicyV6Sha256(policy)).toMatch(/^[a-f0-9]{64}$/);
    });

    it("retains the disabled equivalence counterfactual", () => {
        expect(buildMissionNativeCloseoutPolicyV6(false).enabled).toBe(false);
    });

    it("rejects phase-persistence or inherited-policy drift", () => {
        expect(() => validateMissionNativeCloseoutPolicyV6({
            ...buildMissionNativeCloseoutPolicyV6(),
            engagementAllocationMode: "singleScreen",
        } as any)).toThrow(/phase-persistence representation/);
        expect(() => validateMissionNativeCloseoutPolicyV6({
            ...buildMissionNativeCloseoutPolicyV6(),
            commitRouteBlocker: false,
        } as any)).toThrow(/phase-persistence representation/);
        expect(() => validateMissionNativeCloseoutPolicyV6({
            ...buildMissionNativeCloseoutPolicyV6(),
            retargetStalledBuildings: false,
        } as any)).toThrow(/inherited field retargetStalledBuildings/);
    });
});
