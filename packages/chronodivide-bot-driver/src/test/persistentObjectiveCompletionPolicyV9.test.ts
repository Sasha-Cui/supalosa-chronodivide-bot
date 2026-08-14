import { describe, expect, it } from "vitest";
import {
    buildPersistentObjectiveCompletionPolicyV9,
    persistentObjectiveCompletionPolicyV9Sha256,
    validatePersistentObjectiveCompletionPolicyV9,
} from "../training/persistentObjectiveCompletionPolicyV9.js";

describe("persistent objective-completion policy v9", () => {
    it("freezes the low-building full compatible offensive force", () => {
        const policy = buildPersistentObjectiveCompletionPolicyV9();
        expect(policy).toMatchObject({
            schemaVersion: 13,
            assaultBuildingCount: 5,
            forceCommitmentMode: "full_compatible_offensive_force",
            maximumAssaultCombatants: 100,
            maximumAssaultFraction: 1,
            ordinaryReserveCombatants: 0,
            maximumLockedOffensiveCombatants: 100,
            maximumLockedOffensiveFraction: 1,
        });
        expect(persistentObjectiveCompletionPolicyV9Sha256(policy)).toMatch(/^[a-f0-9]{64}$/);
    });

    it("rejects a partial offensive force", () => {
        expect(() => validatePersistentObjectiveCompletionPolicyV9({
            ...buildPersistentObjectiveCompletionPolicyV9(),
            maximumAssaultFraction: 0.5,
        } as any)).toThrow(/full-force representation/);
    });

    it("rejects extra schema fields", () => {
        expect(() => validatePersistentObjectiveCompletionPolicyV9({
            ...buildPersistentObjectiveCompletionPolicyV9(),
            extraReserve: 1,
        } as any)).toThrow(/invalid exact schema/);
    });
});
