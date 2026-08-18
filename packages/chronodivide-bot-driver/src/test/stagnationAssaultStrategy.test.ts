import { describe, expect, it } from "vitest";
import { Countries } from "@supalosa/chronodivide-bot/dist/bot/logic/common/utils.js";
import {
    buildStagnationAssaultPolicy,
    buildingProgressObserved,
    shouldTriggerStagnationAssault,
    stagnationAssaultComposition,
    stagnationAssaultPolicySha256,
} from "../training/stagnationAssaultStrategy.js";

describe("stagnation-triggered additive assault", () => {
    it("freezes all four policy variants and faction compositions", () => {
        const conservative = buildStagnationAssaultPolicy("conservative");
        const early = buildStagnationAssaultPolicy("early");
        const strong = buildStagnationAssaultPolicy("early_strong");
        expect(conservative).toMatchObject({ activationNotBeforeTick: 12_000, stagnationWindowTicks: 3_600 });
        expect(early).toMatchObject({ activationNotBeforeTick: 9_000, stagnationWindowTicks: 3_000 });
        expect(strong).toMatchObject({ minimumUnits: 8, maximumUnits: 16 });
        expect(stagnationAssaultComposition(Countries.USA, early).composition).toEqual({ MTNK: 5, FV: 1 });
        expect(stagnationAssaultComposition(Countries.IRAQ, early).composition).toEqual({ HTNK: 5, HTK: 1 });
        expect(stagnationAssaultPolicySha256(early)).toMatch(/^[0-9a-f]{64}$/);
    });

    it("counts damage and disappearance as progress but not new construction", () => {
        const prior = new Map([[1, 100], [2, 200]]);
        expect(buildingProgressObserved(prior, new Map([[1, 99], [2, 200]]))).toBe(true);
        expect(buildingProgressObserved(prior, new Map([[1, 100]]))).toBe(true);
        expect(buildingProgressObserved(prior, new Map([[1, 100], [2, 200], [3, 300]]))).toBe(false);
    });

    it("requires both thresholds, a buildable composition, and no active assault", () => {
        const policy = buildStagnationAssaultPolicy("early");
        const base = {
            tick: 12_000,
            lastProgressTick: 9_000,
            enemyBuildingCount: 4,
            activeMissionCount: 0,
            compositionBuildable: true,
            policy,
        };
        expect(shouldTriggerStagnationAssault(base)).toBe(true);
        expect(shouldTriggerStagnationAssault({ ...base, tick: 11_999 })).toBe(false);
        expect(shouldTriggerStagnationAssault({ ...base, lastProgressTick: 9_001 })).toBe(false);
        expect(shouldTriggerStagnationAssault({ ...base, activeMissionCount: 1 })).toBe(false);
        expect(shouldTriggerStagnationAssault({ ...base, compositionBuildable: false })).toBe(false);
        expect(shouldTriggerStagnationAssault({ ...base, enemyBuildingCount: 0 })).toBe(false);
        expect(shouldTriggerStagnationAssault({ ...base, policy: buildStagnationAssaultPolicy("disabled") })).toBe(false);
    });
});
