import { describe, expect, it } from "vitest";
import {
    buildMissionNativeCloseoutPolicyV14,
    missionNativeCloseoutPolicyV14Sha256,
    validateMissionNativeCloseoutPolicyV14,
} from "../training/missionNativeCloseoutPolicyV14.js";

describe("mission-native closeout policy v14", () => {
    it("changes only activation to staged first-blocker clearance", () => {
        const policy = buildMissionNativeCloseoutPolicyV14();
        expect(policy).toMatchObject({
            schemaVersion: 14,
            enabled: true,
            activationMode: "objectiveStagedBlockerClearance",
            readinessReserve: true,
            readinessReserveScope: "fullForce",
            targetPriority: "reinforcement",
            engagementMode: "completionRace",
            engagementAllocationMode: "allBlocker",
            commitRouteBlocker: true,
        });
        expect(missionNativeCloseoutPolicyV14Sha256(policy)).toMatch(/^[a-f0-9]{64}$/);
    });

    it("retains the disabled equivalence counterfactual", () => {
        expect(buildMissionNativeCloseoutPolicyV14(false).enabled).toBe(false);
    });

    it("rejects activation or inherited-policy drift", () => {
        expect(() => validateMissionNativeCloseoutPolicyV14({
            ...buildMissionNativeCloseoutPolicyV14(),
            activationMode: "objectiveStagedRouteClearance",
        } as any)).toThrow(/activation representation/);
        expect(() => validateMissionNativeCloseoutPolicyV14({
            ...buildMissionNativeCloseoutPolicyV14(),
            readinessReserveScope: "reinforcements",
        } as any)).toThrow(/inherited field readinessReserveScope/);
    });
});
