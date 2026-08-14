import { describe, expect, it } from "vitest";
import {
    buildMissionNativeCloseoutPolicy,
    missionNativeCloseoutPolicySha256,
    validateMissionNativeCloseoutPolicy,
} from "../training/missionNativeCloseoutPolicy.js";

describe("mission-native closeout policy", () => {
    it("freezes a low-building, full-offense, single-target mission", () => {
        const policy = buildMissionNativeCloseoutPolicy();
        expect(policy).toMatchObject({
            enabled: true,
            activationMode: "lowBuilding",
            maxEnemyBuildings: 5,
            minTick: 2_700,
            minCombatants: 1,
            reserveCombatants: 0,
            maxTargetGroups: 1,
            orderIntervalTicks: 3,
        });
        expect(missionNativeCloseoutPolicySha256(policy)).toMatch(/^[a-f0-9]{64}$/);
    });

    it("supports only the prospective disabled counterfactual", () => {
        expect(buildMissionNativeCloseoutPolicy(false).enabled).toBe(false);
        expect(() => validateMissionNativeCloseoutPolicy({
            ...buildMissionNativeCloseoutPolicy(),
            maxEnemyBuildings: 6,
        } as any)).toThrow(/frozen field maxEnemyBuildings/);
    });

    it("rejects extra schema fields", () => {
        expect(() => validateMissionNativeCloseoutPolicy({
            ...buildMissionNativeCloseoutPolicy(),
            extra: true,
        } as any)).toThrow(/invalid exact schema/);
    });
});
