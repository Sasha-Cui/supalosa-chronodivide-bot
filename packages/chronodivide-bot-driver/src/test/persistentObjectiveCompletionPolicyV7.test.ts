import { describe, expect, it } from "vitest";
import {
    buildPersistentObjectiveCompletionPolicyV7,
    persistentObjectiveCompletionPolicyV7Sha256,
    validatePersistentObjectiveCompletionPolicyV7,
} from "../training/persistentObjectiveCompletionPolicyV7.js";

describe("persistent objective-completion policy v7", () => {
    it("freezes complete-mission-cost building selection", () => {
        const policy = buildPersistentObjectiveCompletionPolicyV7();
        expect(policy).toMatchObject({
            schemaVersion: 11,
            routeInterceptionMode: "time_to_interception_completion_race",
            targetRankingMode: "minimum_complete_mission_cost",
            minimumAssaultCombatants: 3,
            maximumAssaultCombatants: 8,
        });
        expect(persistentObjectiveCompletionPolicyV7Sha256(policy)).toMatch(/^[a-f0-9]{64}$/);
    });

    it("rejects a target ranker that omits the complete mission", () => {
        expect(() => validatePersistentObjectiveCompletionPolicyV7({
            ...buildPersistentObjectiveCompletionPolicyV7(),
            targetRankingMode: "minimum_building_completion_cost",
        } as any)).toThrow(/target ranking mode/);
    });

    it("rejects extra schema fields", () => {
        expect(() => validatePersistentObjectiveCompletionPolicyV7({
            ...buildPersistentObjectiveCompletionPolicyV7(),
            buildingPriorityBonus: 10,
        } as any)).toThrow(/invalid exact schema/);
    });
});
