import { describe, expect, it } from "vitest";
import {
    buildProgressCertifiedConversionPolicy,
    progressCertifiedConversionPolicySha256,
    validateProgressCertifiedConversionPolicy,
} from "../training/progressCertifiedConversionPolicy.js";
import {
    buildProgressCertifiedConversionPolicyV5,
    progressCertifiedConversionPolicyV5Sha256,
    validateProgressCertifiedConversionPolicyV5,
} from "../training/progressCertifiedConversionPolicyV5.js";

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

describe("progress-certified conversion policy v5", () => {
    it("inherits the sealed final-building policy and adds one deterministic approach mode", () => {
        const first = buildProgressCertifiedConversionPolicyV5();
        const second = buildProgressCertifiedConversionPolicyV5();
        expect(first).toEqual(second);
        expect(progressCertifiedConversionPolicyV5Sha256(first)).toBe(
            progressCertifiedConversionPolicyV5Sha256(second),
        );
        expect(first.schemaVersion).toBe(5);
        expect(first.conversionScope).toBe("final_building_only");
        expect(first.activationBuildingCount).toBe(1);
        expect(first.terminalForceMode).toBe("progress_certified_hybrid");
        expect(first.unseenExactBuildingOrderMode).toBe("attack_move_then_visible_attack");
    });

    it("validates all inherited constraints without mutating the frozen v4 schema", () => {
        expect(() => buildProgressCertifiedConversionPolicyV5({
            ordinaryReserveCombatants: 1,
            terminalReserveCombatants: 2,
        })).toThrow("Terminal reserve cannot exceed the ordinary reserve");
        expect(buildProgressCertifiedConversionPolicy().schemaVersion).toBe(4);
        expect(Object.keys(buildProgressCertifiedConversionPolicy())).not.toContain(
            "unseenExactBuildingOrderMode",
        );
        expect(() => buildProgressCertifiedConversionPolicyV5({
            schemaVersion: 4,
        } as any)).toThrow("schemaVersion must be 5");
    });

    it("rejects fields outside the versioned exact schema", () => {
        const policy = buildProgressCertifiedConversionPolicyV5() as Record<string, unknown>;
        policy.unsealedChoice = "forbidden";
        expect(() => validateProgressCertifiedConversionPolicyV5(policy as any)).toThrow(
            "invalid exact schema",
        );
    });
});
