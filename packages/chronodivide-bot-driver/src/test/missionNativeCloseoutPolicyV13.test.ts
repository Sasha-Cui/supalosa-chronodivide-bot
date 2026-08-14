import { describe, expect, it } from "vitest";
import {
    buildMissionNativeCloseoutPolicyV13,
    missionNativeCloseoutPolicyV13Sha256,
    validateMissionNativeCloseoutPolicyV13,
} from "../training/missionNativeCloseoutPolicyV13.js";

describe("mission-native closeout policy v13", () => {
    it("changes only activation and reserve scope to mission-owned assembly", () => {
        const policy = buildMissionNativeCloseoutPolicyV13();
        expect(policy).toMatchObject({
            schemaVersion: 13,
            enabled: true,
            activationMode: "objectiveStagedRouteClearance",
            readinessReserve: true,
            readinessReserveScope: "fullForce",
            targetPriority: "reinforcement",
            engagementMode: "completionRace",
            engagementAllocationMode: "allBlocker",
            commitRouteBlocker: true,
        });
        expect(missionNativeCloseoutPolicyV13Sha256(policy)).toMatch(/^[a-f0-9]{64}$/);
    });

    it("retains the disabled equivalence counterfactual", () => {
        expect(buildMissionNativeCloseoutPolicyV13(false).enabled).toBe(false);
    });

    it("rejects activation, staging, or inherited-policy drift", () => {
        expect(() => validateMissionNativeCloseoutPolicyV13({
            ...buildMissionNativeCloseoutPolicyV13(),
            activationMode: "objectiveTransferableRouteClearance",
        } as any)).toThrow(/activation representation/);
        expect(() => validateMissionNativeCloseoutPolicyV13({
            ...buildMissionNativeCloseoutPolicyV13(),
            readinessReserveScope: "reinforcements",
        } as any)).toThrow(/staging representation/);
        expect(() => validateMissionNativeCloseoutPolicyV13({
            ...buildMissionNativeCloseoutPolicyV13(),
            readinessReserve: false,
        } as any)).toThrow(/inherited field readinessReserve/);
    });
});
