import { describe, expect, it } from "vitest";
import {
    buildPersistentObjectiveCompletionPolicyV5,
    persistentObjectiveCompletionPolicyV5Sha256,
    validatePersistentObjectiveCompletionPolicyV5,
} from "../training/persistentObjectiveCompletionPolicyV5.js";

describe("persistent objective-completion policy v5", () => {
    it("freezes the building-completion versus interception race", () => {
        const policy = buildPersistentObjectiveCompletionPolicyV5();
        expect(policy).toMatchObject({
            schemaVersion: 9,
            routeInterceptionMode: "completion_time_interception_race",
            minimumAssaultCombatants: 3,
            maximumAssaultCombatants: 8,
        });
        expect(persistentObjectiveCompletionPolicyV5Sha256(policy)).toMatch(/^[a-f0-9]{64}$/);
    });

    it("rejects a force-centric interception mode", () => {
        expect(() => validatePersistentObjectiveCompletionPolicyV5({
            ...buildPersistentObjectiveCompletionPolicyV5(),
            routeInterceptionMode: "always_clear_corridor",
        } as any)).toThrow(/interception mode/);
    });

    it("rejects extra schema fields", () => {
        expect(() => validatePersistentObjectiveCompletionPolicyV5({
            ...buildPersistentObjectiveCompletionPolicyV5(),
            forceEliminationObjective: true,
        } as any)).toThrow(/invalid exact schema/);
    });
});
