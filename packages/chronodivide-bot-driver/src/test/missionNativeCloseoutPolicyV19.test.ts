import { describe, expect, it } from "vitest";
import {
    buildMissionNativeCloseoutPolicyV19,
    missionNativeCloseoutPolicyV19Sha256,
    validateMissionNativeCloseoutPolicyV19,
} from "../training/missionNativeCloseoutPolicyV19.js";

describe("mission-native closeout policy v19", () => {
    it("adds only terminal assault-production reservation to V18", () => {
        const policy = buildMissionNativeCloseoutPolicyV19();
        expect(policy).toMatchObject({
            schemaVersion: 19,
            activationMode: "objectiveVanguardRouteClearance",
            readinessReserve: true,
            readinessReserveScope: "reinforcements",
            engagementAllocationMode: "allBlocker",
            commitRouteBlocker: true,
            adaptiveGroundAssaultTargetCount: 4,
            adaptiveGroundAssaultInfrastructure: true,
            adaptiveGroundAssaultInfrastructurePriority: 300,
            adaptiveGroundAssaultProductionReservation: true,
        });
        expect(missionNativeCloseoutPolicyV19Sha256(policy)).toMatch(/^[a-f0-9]{64}$/);
    }, 60_000);

    it("retains the disabled adapter representation", () => {
        expect(buildMissionNativeCloseoutPolicyV19(false).enabled).toBe(false);
    }, 60_000);

    it("rejects reservation and inherited drift", () => {
        expect(() => validateMissionNativeCloseoutPolicyV19({
            ...buildMissionNativeCloseoutPolicyV19(),
            adaptiveGroundAssaultProductionReservation: false,
        } as any)).toThrow(/reservation/);
        expect(() => validateMissionNativeCloseoutPolicyV19({
            ...buildMissionNativeCloseoutPolicyV19(),
            targetPriority: "nearest",
        } as any)).toThrow(/inherited field/);
    }, 60_000);
});
