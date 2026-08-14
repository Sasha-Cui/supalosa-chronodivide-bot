import { describe, expect, it } from "vitest";
import {
    buildPersistentObjectiveCompletionPolicy,
    persistentObjectiveCompletionPolicySha256,
    validatePersistentObjectiveCompletionPolicy,
} from "../training/persistentObjectiveCompletionPolicy.js";

describe("persistent objective-completion policy", () => {
    it("builds a three-tick persistent additive policy with zero implicit terminal reserve", () => {
        const policy = buildPersistentObjectiveCompletionPolicy();
        expect(policy.schemaVersion).toBe(5);
        expect(policy.orderIntervalTicks).toBe(3);
        expect(policy.assaultBuildingCount).toBeGreaterThan(9);
        expect(policy.maximumAssaultFraction).toBeLessThan(1);
        expect(persistentObjectiveCompletionPolicySha256(policy)).toMatch(/^[a-f0-9]{64}$/);
    });

    it("rejects order periods that can drift against Supalosa's three-tick mission cycle", () => {
        expect(() => buildPersistentObjectiveCompletionPolicy({ orderIntervalTicks: 4 })).toThrow(
            /three-tick mission cycle/,
        );
    });

    it("rejects extra policy fields instead of silently accepting protocol drift", () => {
        expect(() => validatePersistentObjectiveCompletionPolicy({
            ...buildPersistentObjectiveCompletionPolicy(),
            unregisteredKnob: true,
        } as any)).toThrow(/invalid exact schema/);
    });
});
