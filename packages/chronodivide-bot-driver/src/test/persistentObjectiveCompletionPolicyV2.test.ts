import { describe, expect, it } from "vitest";
import {
    buildPersistentObjectiveCompletionPolicyV2,
    persistentObjectiveCompletionPolicyV2Sha256,
    validatePersistentObjectiveCompletionPolicyV2,
} from "../training/persistentObjectiveCompletionPolicyV2.js";

describe("persistent objective-completion policy v2", () => {
    it("freezes bounded offensive-mission borrowing under the overall assault cap", () => {
        const policy = buildPersistentObjectiveCompletionPolicyV2();
        expect(policy).toMatchObject({
            schemaVersion: 6,
            leaseSource: "unassigned_or_bounded_offensive_mission_surplus",
            maximumAssaultCombatants: 8,
            maximumAssaultFraction: 1 / 3,
            maximumLockedOffensiveCombatants: 4,
            maximumLockedOffensiveFraction: 1 / 3,
        });
        expect(persistentObjectiveCompletionPolicyV2Sha256(policy)).toMatch(/^[a-f0-9]{64}$/);
    });

    it("rejects a locked-mission sub-cap larger than the overall cap", () => {
        expect(() => buildPersistentObjectiveCompletionPolicyV2({
            maximumAssaultCombatants: 3,
            maximumLockedOffensiveCombatants: 4,
        })).toThrow(/sub-cap/);
        expect(() => buildPersistentObjectiveCompletionPolicyV2({
            maximumAssaultFraction: 0.25,
            maximumLockedOffensiveFraction: 1 / 3,
        })).toThrow(/fraction/);
    });

    it("rejects unregistered schema fields", () => {
        expect(() => validatePersistentObjectiveCompletionPolicyV2({
            ...buildPersistentObjectiveCompletionPolicyV2(),
            commandeerDefence: true,
        } as any)).toThrow(/invalid exact schema/);
    });
});
