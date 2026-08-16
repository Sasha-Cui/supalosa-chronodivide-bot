import { describe, expect, it } from "vitest";
import {
    FINISH_ADVANTAGE_INFORMATION_INTERFACE,
    FINISH_ADVANTAGE_MECHANISM,
    FINISH_ADVANTAGE_UNSEEN_ORDER_MODE,
    buildFinishAdvantageIrreversiblePolicy,
    buildFinishAdvantagePolicy,
    buildFinishAdvantageSurplusPolicy,
    validateFinishAdvantagePolicy,
} from "../training/finishAdvantagePolicy.js";

describe("finish-advantage policy", () => {
    it("builds the frozen irreversible-only policy", () => {
        expect(buildFinishAdvantageIrreversiblePolicy()).toEqual({
            schemaVersion: 1,
            mechanism: FINISH_ADVANTAGE_MECHANISM,
            enabled: true,
            multiBuildingMode: "irreversible_only",
            informationInterface: FINISH_ADVANTAGE_INFORMATION_INTERFACE,
            ordinaryBaseReserve: 2,
            surplusMargin: 0,
            orderIntervalTicks: 15,
            safetyMarginTicks: 12,
            routeCorridorRadiusTiles: 8,
            physicalProgressDeadlineTicks: 1_200,
            retargetCooldownTicks: 300,
            exactUnseenBuildingOrderMode: FINISH_ADVANTAGE_UNSEEN_ORDER_MODE,
        });
    });

    it.each([0, 2, 4, 8] as const)("accepts frozen surplus margin %s", (margin) => {
        expect(buildFinishAdvantageSurplusPolicy(margin)).toMatchObject({
            multiBuildingMode: "surplus_cover",
            surplusMargin: margin,
        });
    });

    it("rejects a non-frozen margin and an unused irreversible margin", () => {
        expect(() => buildFinishAdvantageSurplusPolicy(3 as never)).toThrow(/invalid/);
        expect(() => buildFinishAdvantagePolicy({
            multiBuildingMode: "irreversible_only",
            surplusMargin: 2,
        })).toThrow(/unused surplus margin/);
    });

    it.each([
        ["orderIntervalTicks", 0],
        ["safetyMarginTicks", -1],
        ["routeCorridorRadiusTiles", 0],
        ["physicalProgressDeadlineTicks", 119],
        ["retargetCooldownTicks", 0],
    ] as const)("rejects invalid %s", (key, value) => {
        expect(() => buildFinishAdvantagePolicy({ [key]: value })).toThrow(/invalid/);
    });

    it("rejects missing or added fields, including evaluator and outcome access", () => {
        const valid = buildFinishAdvantageIrreversiblePolicy() as Record<string, unknown>;
        const { safetyMarginTicks: _missing, ...missing } = valid;
        expect(() => validateFinishAdvantagePolicy(missing)).toThrow(/exact schema/);
        for (const forbidden of ["winner", "score", "endpoint", "quitAttempted", "evaluatorState"]) {
            expect(() => validateFinishAdvantagePolicy({ ...valid, [forbidden]: null }))
                .toThrow(/exact schema/);
        }
    });

    it("copies validated input instead of returning a mutable alias", () => {
        const raw = buildFinishAdvantageIrreversiblePolicy();
        const validated = validateFinishAdvantagePolicy(raw);
        expect(validated).not.toBe(raw);
        expect(validated).toEqual(raw);
    });
});
