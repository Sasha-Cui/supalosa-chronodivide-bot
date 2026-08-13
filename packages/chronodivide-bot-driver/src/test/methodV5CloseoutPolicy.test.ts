import { describe, expect, test } from "vitest";
import {
    MethodV5CloseoutPolicy,
    methodV5AirStructurePlanForCountry,
    methodV5AirUnitForCountry,
    methodV5CloseoutPolicySha256,
    isWithinMethodV5HomeDefenseRadius,
    shouldPauseMethodV5CloseoutForVisibleThreat,
    validateMethodV5CloseoutPolicy,
} from "../training/methodV5Closeout.js";
import { Countries } from "@supalosa/chronodivide-bot/dist/bot/logic/common/utils.js";

const policy: MethodV5CloseoutPolicy = {
    schemaVersion: 1,
    enabled: true,
    minTick: 7200,
    minCombatants: 8,
    homeDefenseRadius: 48,
    maxVisibleEnemyCombatants: 4,
    visibleCombatantAdvantage: 0,
    reserveCombatants: 4,
    orderIntervalTicks: 12,
    maxTargetGroups: 4,
    targetPriority: "production",
    memoryEnabled: true,
    searchEnabled: true,
    searchCellSize: 12,
    searchRevisitTicks: 600,
    directVisibleAttack: true,
    preemptBaselineOrders: true,
    capabilityAware: true,
    reachabilityAware: true,
    stallTicks: 600,
    adaptiveProductionEnabled: true,
    adaptiveAirTargetCount: 4,
    adaptiveProductionPriority: 180,
    adaptiveTechPriority: 170,
};

describe("Method-v5 closeout policy", () => {
    test("has a stable canonical digest independent of property insertion order", () => {
        const reversed = Object.fromEntries(Object.entries(policy).reverse()) as MethodV5CloseoutPolicy;
        expect(methodV5CloseoutPolicySha256(reversed)).toBe(methodV5CloseoutPolicySha256(policy));
    });

    test("rejects malformed numeric and categorical settings", () => {
        expect(() => validateMethodV5CloseoutPolicy({ ...policy, orderIntervalTicks: 0 })).toThrow(
            /orderIntervalTicks/,
        );
        expect(() => validateMethodV5CloseoutPolicy({
            ...policy,
            targetPriority: "invalid" as MethodV5CloseoutPolicy["targetPriority"],
        })).toThrow(/target priority/);
        expect(() => validateMethodV5CloseoutPolicy({
            ...policy,
            maxVisibleEnemyCombatants: -1,
        })).toThrow(/maxVisibleEnemyCombatants/);
        expect(() => validateMethodV5CloseoutPolicy({
            ...policy,
            enabled: 1 as unknown as boolean,
        })).toThrow(/enabled must be boolean/);
    });

    test("keeps disabled policies fully specified for trace-equivalence gates", () => {
        const disabled = validateMethodV5CloseoutPolicy({ ...policy, enabled: false });
        expect(disabled.enabled).toBe(false);
        expect(disabled.memoryEnabled).toBe(true);
        expect(disabled.adaptiveProductionEnabled).toBe(true);
    });

    test("defines a mobility-capability path for all nine countries", () => {
        const allied = [
            Countries.USA,
            Countries.KOREA,
            Countries.FRANCE,
            Countries.GERMANY,
            Countries.GREAT_BRITAIN,
        ];
        const soviet = [Countries.LIBYA, Countries.IRAQ, Countries.CUBA, Countries.RUSSIA];
        expect(allied.map(methodV5AirUnitForCountry)).toEqual(Array(5).fill("JUMPJET"));
        expect(soviet.map(methodV5AirUnitForCountry)).toEqual(Array(4).fill("ZEP"));
        for (const country of Object.values(Countries)) {
            expect(methodV5AirStructurePlanForCountry(country).length).toBeGreaterThan(0);
        }
    });

    test("pauses only for visible threats near home that exhaust the dispatchable surplus", () => {
        expect(isWithinMethodV5HomeDefenseRadius({ x: 30, y: 40 }, { x: 0, y: 0 }, 50)).toBe(true);
        expect(isWithinMethodV5HomeDefenseRadius({ x: 31, y: 40 }, { x: 0, y: 0 }, 50)).toBe(false);
        expect(shouldPauseMethodV5CloseoutForVisibleThreat({
            ownEligibleCombatants: 8,
            reserveCombatants: 3,
            visibleEnemyCombatants: 5,
            maxVisibleEnemyCombatants: 999,
            visibleCombatantAdvantage: 0,
        })).toBe(false);
        expect(shouldPauseMethodV5CloseoutForVisibleThreat({
            ownEligibleCombatants: 8,
            reserveCombatants: 3,
            visibleEnemyCombatants: 6,
            maxVisibleEnemyCombatants: 999,
            visibleCombatantAdvantage: 0,
        })).toBe(true);
    });
});
