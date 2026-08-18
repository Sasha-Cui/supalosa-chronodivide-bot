import { describe, expect, it } from "vitest";
import {
    buildProgressTriggeredReplacementPolicy,
    progressTriggeredReplacementPolicySha256,
    replacementBuildingProgressObserved,
    shouldTriggerAttackFactoryReplacement,
} from "../training/progressTriggeredAttackReplacementCandidate.js";

describe("progress-triggered attack-factory replacement", () => {
    it("counts damage and disappearance as progress but not construction", () => {
        const prior = new Map([[1, 100], [2, 200]]);
        expect(replacementBuildingProgressObserved(prior, new Map([[1, 99], [2, 200]]))).toBe(true);
        expect(replacementBuildingProgressObserved(prior, new Map([[1, 100]]))).toBe(true);
        expect(replacementBuildingProgressObserved(prior, new Map([[1, 100], [2, 200], [3, 300]]))).toBe(false);
    });
    it("requires both thresholds and exactly one replacement", () => {
        const policy = buildProgressTriggeredReplacementPolicy({ activationNotBeforeTick: 12_000,
            stagnationWindowTicks: 3_600, targetPriority: "distance" });
        const base = { tick: 12_000, lastProgressTick: 8_400, enemyBuildingCount: 3,
            alreadyReplaced: false, policy };
        expect(shouldTriggerAttackFactoryReplacement(base)).toBe(true);
        expect(shouldTriggerAttackFactoryReplacement({ ...base, tick: 11_999 })).toBe(false);
        expect(shouldTriggerAttackFactoryReplacement({ ...base, lastProgressTick: 8_401 })).toBe(false);
        expect(shouldTriggerAttackFactoryReplacement({ ...base, alreadyReplaced: true })).toBe(false);
        expect(shouldTriggerAttackFactoryReplacement({ ...base, enemyBuildingCount: 0 })).toBe(false);
        expect(progressTriggeredReplacementPolicySha256(policy)).toMatch(/^[0-9a-f]{64}$/);
    });
});
