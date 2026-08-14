import { describe, expect, it } from "vitest";
import {
    buildPersistentObjectiveCompletionPolicyV3,
    persistentObjectiveCompletionPolicyV3Sha256,
    validatePersistentObjectiveCompletionPolicyV3,
} from "../training/persistentObjectiveCompletionPolicyV3.js";

describe("persistent objective-completion policy v3", () => {
    it("freezes a viable three-unit minimum under bounded maximums", () => {
        const policy = buildPersistentObjectiveCompletionPolicyV3();
        expect(policy).toMatchObject({
            schemaVersion: 7,
            minimumAssaultCombatants: 3,
            maximumAssaultCombatants: 8,
            maximumAssaultFraction: 0.5,
            minimumLockedOffensiveDetachment: 3,
            maximumLockedOffensiveCombatants: 6,
            maximumLockedOffensiveFraction: 0.5,
            ordinaryReserveCombatants: 4,
        });
        expect(persistentObjectiveCompletionPolicyV3Sha256(policy)).toMatch(/^[a-f0-9]{64}$/);
    });

    it("rejects minimum detachments above their maximums", () => {
        expect(() => buildPersistentObjectiveCompletionPolicyV3({
            minimumAssaultCombatants: 9,
        })).toThrow(/overall assault cap/);
        expect(() => buildPersistentObjectiveCompletionPolicyV3({
            minimumLockedOffensiveDetachment: 7,
        })).toThrow(/locked sub-cap/);
    });

    it("rejects unregistered schema fields", () => {
        expect(() => validatePersistentObjectiveCompletionPolicyV3({
            ...buildPersistentObjectiveCompletionPolicyV3(),
            minimumWinRate: 1,
        } as any)).toThrow(/invalid exact schema/);
    });
});
