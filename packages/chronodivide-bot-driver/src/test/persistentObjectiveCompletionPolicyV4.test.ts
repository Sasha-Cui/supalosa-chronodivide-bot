import { describe, expect, it } from "vitest";
import {
    buildPersistentObjectiveCompletionPolicyV4,
    persistentObjectiveCompletionPolicyV4Sha256,
    validatePersistentObjectiveCompletionPolicyV4,
} from "../training/persistentObjectiveCompletionPolicyV4.js";

describe("persistent objective-completion policy v4", () => {
    it("freezes preemptive damage-capable route interception", () => {
        const policy = buildPersistentObjectiveCompletionPolicyV4();
        expect(policy).toMatchObject({
            schemaVersion: 8,
            routeInterceptionMode: "preemptive_damage_capable_threats",
            minimumAssaultCombatants: 3,
            maximumAssaultCombatants: 8,
        });
        expect(persistentObjectiveCompletionPolicyV4Sha256(policy)).toMatch(/^[a-f0-9]{64}$/);
    });

    it("rejects an unregistered interception mode", () => {
        expect(() => validatePersistentObjectiveCompletionPolicyV4({
            ...buildPersistentObjectiveCompletionPolicyV4(),
            routeInterceptionMode: "clear_everything",
        } as any)).toThrow(/interception mode/);
    });

    it("rejects extra schema fields", () => {
        expect(() => validatePersistentObjectiveCompletionPolicyV4({
            ...buildPersistentObjectiveCompletionPolicyV4(),
            chaseOffRouteForces: true,
        } as any)).toThrow(/invalid exact schema/);
    });
});
