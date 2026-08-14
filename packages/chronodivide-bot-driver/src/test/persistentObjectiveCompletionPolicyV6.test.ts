import { describe, expect, it } from "vitest";
import {
    buildPersistentObjectiveCompletionPolicyV6,
    persistentObjectiveCompletionPolicyV6Sha256,
    validatePersistentObjectiveCompletionPolicyV6,
} from "../training/persistentObjectiveCompletionPolicyV6.js";

describe("persistent objective-completion policy v6", () => {
    it("freezes a time-to-interception completion race", () => {
        const policy = buildPersistentObjectiveCompletionPolicyV6();
        expect(policy).toMatchObject({
            schemaVersion: 10,
            routeInterceptionMode: "time_to_interception_completion_race",
            minimumAssaultCombatants: 3,
            maximumAssaultCombatants: 8,
        });
        expect(persistentObjectiveCompletionPolicyV6Sha256(policy)).toMatch(/^[a-f0-9]{64}$/);
    });

    it("rejects an interception clock without travel time", () => {
        expect(() => validatePersistentObjectiveCompletionPolicyV6({
            ...buildPersistentObjectiveCompletionPolicyV6(),
            routeInterceptionMode: "instantaneous_threat_damage",
        } as any)).toThrow(/interception mode/);
    });

    it("rejects extra schema fields", () => {
        expect(() => validatePersistentObjectiveCompletionPolicyV6({
            ...buildPersistentObjectiveCompletionPolicyV6(),
            threatDiscount: 10,
        } as any)).toThrow(/invalid exact schema/);
    });
});
