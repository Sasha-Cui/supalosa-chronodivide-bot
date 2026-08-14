import { describe, expect, it } from "vitest";
import {
    buildMissionNativeCloseoutPolicyV18,
    missionNativeCloseoutPolicyV18Sha256,
    validateMissionNativeCloseoutPolicyV18,
} from "../training/missionNativeCloseoutPolicyV18.js";

describe("mission-native closeout policy v18", () => {
    it("gives V17 side-generic assault infrastructure terminal priority", () => {
        const policy = buildMissionNativeCloseoutPolicyV18();
        expect(policy).toMatchObject({
            schemaVersion: 18,
            activationMode: "objectiveVanguardRouteClearance",
            readinessReserve: true,
            readinessReserveScope: "reinforcements",
            engagementAllocationMode: "allBlocker",
            commitRouteBlocker: true,
            adaptiveGroundAssaultTargetCount: 4,
            adaptiveGroundAssaultInfrastructure: true,
            adaptiveGroundAssaultInfrastructurePriority: 300,
        });
        expect(missionNativeCloseoutPolicyV18Sha256(policy)).toMatch(/^[a-f0-9]{64}$/);
    });

    it("retains the disabled adapter representation", () => {
        expect(buildMissionNativeCloseoutPolicyV18(false).enabled).toBe(false);
    });

    it("rejects infrastructure-priority and inherited drift", () => {
        expect(() => validateMissionNativeCloseoutPolicyV18({
            ...buildMissionNativeCloseoutPolicyV18(),
            adaptiveGroundAssaultInfrastructurePriority: 299,
        } as any)).toThrow(/priority/);
        expect(() => validateMissionNativeCloseoutPolicyV18({
            ...buildMissionNativeCloseoutPolicyV18(),
            targetPriority: "nearest",
        } as any)).toThrow(/inherited field/);
    });
});
