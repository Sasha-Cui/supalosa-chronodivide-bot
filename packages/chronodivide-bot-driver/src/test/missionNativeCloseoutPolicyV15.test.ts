import { describe, expect, it } from "vitest";
import {
    buildMissionNativeCloseoutPolicyV15,
    missionNativeCloseoutPolicyV15Sha256,
    validateMissionNativeCloseoutPolicyV15,
} from "../training/missionNativeCloseoutPolicyV15.js";

describe("mission-native closeout policy v15", () => {
    it("freezes contact-triggered clearance on top of V14 staging", () => {
        const policy = buildMissionNativeCloseoutPolicyV15();
        expect(policy).toMatchObject({
            schemaVersion: 15,
            activationMode: "objectiveStagedBlockerClearance",
            readinessReserve: true,
            readinessReserveScope: "fullForce",
            engagementAllocationMode: "allBlocker",
            commitRouteBlocker: true,
            contactOnlyBlockerClearance: true,
        });
        expect(missionNativeCloseoutPolicyV15Sha256(policy)).toMatch(/^[a-f0-9]{64}$/);
    });

    it("retains the disabled adapter representation", () => {
        expect(buildMissionNativeCloseoutPolicyV15(false).enabled).toBe(false);
    });

    it("rejects contact and inherited drift", () => {
        expect(() => validateMissionNativeCloseoutPolicyV15({
            ...buildMissionNativeCloseoutPolicyV15(),
            contactOnlyBlockerClearance: false,
        } as any)).toThrow(/contact-clearance/);
        expect(() => validateMissionNativeCloseoutPolicyV15({
            ...buildMissionNativeCloseoutPolicyV15(),
            targetPriority: "nearest",
        } as any)).toThrow(/inherited field/);
    });
});
