import { describe, expect, it } from "vitest";
import {
    buildContinuousOffensePolicy,
    continuousOffensePolicySha256,
    validateContinuousOffensePolicy,
} from "../training/continuousOffensePolicy.js";

describe("continuous-offense policy", () => {
    it("has a deterministic exact-schema identity", () => {
        const policy = buildContinuousOffensePolicy();
        expect(validateContinuousOffensePolicy(policy)).toEqual(policy);
        expect(continuousOffensePolicySha256(policy)).toMatch(/^[0-9a-f]{64}$/);
        expect(continuousOffensePolicySha256(policy)).toBe(continuousOffensePolicySha256({ ...policy }));
    });

    it("rejects unknown fields and invalid activation order", () => {
        const policy = buildContinuousOffensePolicy();
        expect(() => validateContinuousOffensePolicy({ ...policy, extra: true } as any))
            .toThrow("invalid exact schema");
        expect(() => buildContinuousOffensePolicy({ activationMinTick: 5_401, minTick: 5_400 }))
            .toThrow("cannot exceed");
    });
});
