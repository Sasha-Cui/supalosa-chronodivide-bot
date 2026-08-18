import { ObjectType } from "@chronodivide/game-api";
import { describe, expect, it } from "vitest";
import { getAttackWeight } from
    "@supalosa/chronodivide-bot/dist/bot/logic/mission/missions/squads/common.js";
import {
    buildObjectiveAwareReplacementPolicy,
    objectiveAwareReplacementPolicySha256,
} from "../training/objectiveAwareAttackReplacementCandidate.js";

const attacker = { tile: { rx: 0, ry: 0 }, rules: {}, name: "MTNK" } as never;
const combatant = {
    tile: { rx: 1, ry: 0 },
    type: ObjectType.Vehicle,
    rules: { isSelectableCombatant: true },
    maxHitPoints: 500,
} as never;
const constructionYard = {
    tile: { rx: 10, ry: 0 },
    type: ObjectType.Building,
    rules: { constructionYard: true, isSelectableCombatant: false },
    maxHitPoints: 1000,
} as never;

describe("objective-aware attack replacement", () => {
    it("freezes exact policy identities", () => {
        for (const priority of ["distance", "strategic", "objective"] as const) {
            const policy = buildObjectiveAwareReplacementPolicy(priority);
            expect(policy).toMatchObject({ enabled: true, targetPriority: priority, allowDefenceSteal: false });
            expect(objectiveAwareReplacementPolicySha256(policy)).toMatch(/^[0-9a-f]{64}$/);
        }
    });

    it("distinguishes nearest, forces-first, and buildings-first target choices", () => {
        expect(getAttackWeight(attacker, combatant, "distance")).toBeGreaterThan(
            getAttackWeight(attacker, constructionYard, "distance")!,
        );
        expect(getAttackWeight(attacker, combatant, "strategic")).toBeGreaterThan(
            getAttackWeight(attacker, constructionYard, "strategic")!,
        );
        expect(getAttackWeight(attacker, constructionYard, "objective")).toBeGreaterThan(
            getAttackWeight(attacker, combatant, "objective")!,
        );
    });
});
