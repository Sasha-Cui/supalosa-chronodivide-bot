import { describe, expect, it } from "vitest";
import {
    buildPersistentObjectiveCompletionPolicyV8,
    persistentObjectiveCompletionPolicyV8Sha256,
    validatePersistentObjectiveCompletionPolicyV8,
} from "../training/persistentObjectiveCompletionPolicyV8.js";

describe("persistent objective-completion policy v8", () => {
    it("freezes bounded rotation after a nonproductive building mission", () => {
        const policy = buildPersistentObjectiveCompletionPolicyV8();
        expect(policy).toMatchObject({
            schemaVersion: 12,
            targetRankingMode: "minimum_complete_mission_cost",
            targetRetryMode: "rotate_after_bounded_no_building_damage",
            maximumLeaseTicks: 1_800,
        });
        expect(persistentObjectiveCompletionPolicyV8Sha256(policy)).toMatch(/^[a-f0-9]{64}$/);
    });

    it("rejects an unbounded same-target retry", () => {
        expect(() => validatePersistentObjectiveCompletionPolicyV8({
            ...buildPersistentObjectiveCompletionPolicyV8(),
            targetRetryMode: "retry_same_target_forever",
        } as any)).toThrow(/target retry mode/);
    });

    it("rejects extra schema fields", () => {
        expect(() => validatePersistentObjectiveCompletionPolicyV8({
            ...buildPersistentObjectiveCompletionPolicyV8(),
            targetBlacklistSize: 2,
        } as any)).toThrow(/invalid exact schema/);
    });
});
