import { describe, expect, it } from "vitest";
import {
    buildProgressCertifiedConversionPolicy,
    progressCertifiedConversionPolicySha256,
    validateProgressCertifiedConversionPolicy,
} from "../training/progressCertifiedConversionPolicy.js";

describe("progress-certified conversion policy", () => {
    it("builds a deterministic, exact-schema final-building policy", () => {
        const first = buildProgressCertifiedConversionPolicy();
        const second = buildProgressCertifiedConversionPolicy();
        expect(first).toEqual(second);
        expect(progressCertifiedConversionPolicySha256(first)).toBe(
            progressCertifiedConversionPolicySha256(second),
        );
        expect(first.conversionScope).toBe("final_building_only");
        expect(first.activationBuildingCount).toBe(1);
        expect(first.terminalReserveCombatants).toBe(0);
    });

    it("rejects a terminal reserve larger than the ordinary reserve", () => {
        expect(() => buildProgressCertifiedConversionPolicy({
            ordinaryReserveCombatants: 1,
            terminalReserveCombatants: 2,
        })).toThrow("Terminal reserve cannot exceed the ordinary reserve");
    });

    it("rejects a final-building-only policy that activates above one building", () => {
        expect(() => buildProgressCertifiedConversionPolicy({
            activationBuildingCount: 2,
        })).toThrow("Final-building-only conversion requires activationBuildingCount=1");
    });

    it("rejects fields outside the sealed exact schema", () => {
        const policy = buildProgressCertifiedConversionPolicy() as Record<string, unknown>;
        policy.unsealedChoice = "forbidden";
        expect(() => validateProgressCertifiedConversionPolicy(policy as any)).toThrow(
            "invalid exact schema",
        );
    });
});
