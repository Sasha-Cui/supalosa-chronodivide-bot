import { ObjectType, OrderType, QueueStatus, QueueType } from "@chronodivide/game-api";
import { describe, expect, it, vi } from "vitest";
import { HFO_ADVANCED_V7_COUNTRIES } from "../training/hfoAdvancedPublicStateDiagnosticV7.js";
import { V8_DETECTOR_CREDIT_THRESHOLD, V8_DETECTOR_UPDATE, V8_MAX_PREDICATES, V8_MAX_RULES,
    V8_SEARCH_SEEDS, V8_TECHNICAL_FIXTURES, canonicalizeV8Policy, crossoverV8Policy,
    decorateWithV8Controller, generateV8InitialPolicies, matchV8Rule, mutateV8Policy,
    selectV8Rule } from "../training/hfoAdvancedStateConditionedV8Core.js";

describe("HFO Advanced V8 grammar", () => {
    it("generates deterministic unique bounded populations for all three runs", () => {
        expect(V8_SEARCH_SEEDS).toEqual([8_801, 8_802, 8_803]);
        for (const seed of V8_SEARCH_SEEDS) {
            const first = generateV8InitialPolicies(seed), second = generateV8InitialPolicies(seed);
            expect(first.map((row) => row.sha256)).toEqual(second.map((row) => row.sha256));
            expect(new Set(first.map((row) => row.sha256)).size).toBe(32);
            expect(first.every((row) => row.policy.rules.length >= 4 && row.policy.rules.length <= V8_MAX_RULES &&
                row.policy.rules.every((rule) => rule.predicates.length <= V8_MAX_PREDICATES))).toBe(true);
        }
        expect(new Set(V8_SEARCH_SEEDS.flatMap((seed) => generateV8InitialPolicies(seed).map((row) => row.sha256))).size)
            .toBe(96);
    });

    it("canonicalizes predicate order and fails closed on duplicate predicate features", () => {
        const rule: any = { predicates: [
            { feature: "ownCombatants", comparator: ">=", value: 8 },
            { feature: "update", comparator: ">=", value: 1_200 },
        ], production: "tank", force: "probe", target: "nearest", forceFraction: 0.5,
        homeReserve: 4, persistence: 300 };
        const left = canonicalizeV8Policy({ schemaVersion: 8, rules: [rule], fallback: { production: "baseline",
            threatened: "defend_home", weak: "recover", strong: "probe", weakCombatants: 8 } }),
            right = canonicalizeV8Policy({ ...left.policy, rules: [{ ...rule, predicates: [...rule.predicates].reverse() }] });
        expect(left.sha256).toBe(right.sha256);
        expect(() => canonicalizeV8Policy({ ...left.policy, rules: [{ ...rule,
            predicates: [rule.predicates[0], { ...rule.predicates[0] }] }] })).toThrow("duplicate predicate feature");
    });

    it("freezes six fixtures and deterministic mutation and crossover", () => {
        expect(Object.keys(V8_TECHNICAL_FIXTURES)).toEqual([
            "fallback_only", "defense", "recover", "mixed", "raid", "closeout",
        ]);
        const parents = generateV8InitialPolicies(8_801);
        expect(mutateV8Policy(parents[0], 91).sha256).toBe(mutateV8Policy(parents[0], 91).sha256);
        expect(crossoverV8Policy(parents[0], parents[1], 92).sha256)
            .toBe(crossoverV8Policy(parents[0], parents[1], 92).sha256);
    });

    it("selects the first matching rule from frozen public features", () => {
        const policy = V8_TECHNICAL_FIXTURES.defense.policy, features: any = {
            update: 1_200, ownCredits: 8_000, creditGap: 0, ownCombatants: 8, visibleEnemyCombatants: 0,
            threat8: 0, threat16: 0, threat24: 0, ownHarvesters: 1, ownBarracks: 1, ownWarFactories: 1,
            ownBuildings: 5, homeForce: 8, midfieldForce: 0, opponentBaseForce: 0, forceDelta: 0,
            noProgressUpdates: 1_200, visibleEnemyBuildings: 0, factionSide: "Allied", physicalStart: "West",
        };
        expect(matchV8Rule(policy.rules[0], features)).toBe(true);
        expect(selectV8Rule(policy, features)).toEqual({ index: 0, rule: policy.rules[0] });
    });
});

const fixture = (opponentCredits: number) => {
    let tick = 1_199;
    const queueForProduction = vi.fn(), unqueueFromProduction = vi.fn(), orderUnits = vi.fn(),
        actions: any = { queueForProduction, unqueueFromProduction, pauseProduction: vi.fn(),
            resumeProduction: vi.fn(), orderUnits, quitGame: vi.fn() },
        infantry = { name: "E1", type: ObjectType.Infantry }, tank = { name: "MTNK", type: 0 }, dog = { name: "DOG", type: ObjectType.Infantry },
        production: any = { getAvailableObjects: (queue: QueueType) => queue === QueueType.Infantry ? [infantry, dog] :
            queue === QueueType.Vehicles ? [tank] : [], getQueueData: (queue: QueueType) =>
            ({ type: queue, status: QueueStatus.Idle, items: [] }) },
        ownUnit: any = { id: 1, owner: "candidate", hitPoints: 100, tile: { rx: 40, ry: 82 }, stance: 0,
            rules: { name: "E1", type: ObjectType.Infantry, isSelectableCombatant: true, harvester: false } },
        game: any = { getCurrentTick: () => tick, getPlayerData: (name: string) => name === "candidate" ?
            ({ credits: 8_000, startLocation: { x: 39, y: 82 } }) :
            ({ credits: opponentCredits, startLocation: { x: 151, y: 119 } }),
        getVisibleUnits: (name: string, relation: string) => name === "candidate" && relation === "self" ? [1] : [],
        getUnitData: (id: number) => id === 1 ? ownUnit : undefined },
        bot: any = { name: "candidate", lastGameApi: null, lastPlayerActions: null, lastPlayerProduction: null,
            onGameStart: (g: any) => { bot.lastGameApi = g; bot.lastPlayerActions = actions; bot.lastPlayerProduction = production; },
            onGameTick: () => { actions.queueForProduction(QueueType.Infantry, "E1", ObjectType.Infantry, 1);
                actions.orderUnits([1], OrderType.AttackMove, 151, 119); }, onGameEvent: vi.fn() };
    return { bot, game, actions, queueForProduction, orderUnits, setTick: (value: number) => { tick = value; } };
};

describe("HFO Advanced V8 exclusive controller", () => {
    it("keeps the controller exactly inactive for the Supalosa detector branch", () => {
        const f = fixture(V8_DETECTOR_CREDIT_THRESHOLD + 100), decorated = decorateWithV8Controller(
            f.bot, "opponent", HFO_ADVANCED_V7_COUNTRIES[0], V8_TECHNICAL_FIXTURES.defense);
        decorated.bot.onGameStart(f.game); f.setTick(V8_DETECTOR_UPDATE); decorated.bot.onGameTick(f.game);
        f.setTick(V8_DETECTOR_UPDATE + 1); decorated.bot.onGameTick(f.game);
        expect(decorated.state()).toMatchObject({ active: false, detected: "Supalosa" });
        expect(decorated.ownershipEvents.some((row) => row.disposition === "suppressed")).toBe(false);
        expect(decorated.controllerEvents.filter((row) => row.event === "rule_selected")).toHaveLength(0);
        expect(f.queueForProduction).toHaveBeenCalledTimes(2);
        expect(f.orderUnits).toHaveBeenCalledTimes(2);
    });

    it("activates at tick 1200 and suppresses owned baseline calls thereafter", () => {
        const f = fixture(V8_DETECTOR_CREDIT_THRESHOLD - 100), decorated = decorateWithV8Controller(
            f.bot, "opponent", HFO_ADVANCED_V7_COUNTRIES[0], V8_TECHNICAL_FIXTURES.defense);
        decorated.bot.onGameStart(f.game); f.setTick(V8_DETECTOR_UPDATE); decorated.bot.onGameTick(f.game);
        f.setTick(V8_DETECTOR_UPDATE + 1); decorated.bot.onGameTick(f.game);
        expect(decorated.state()).toMatchObject({ active: true, detected: "Advanced" });
        expect(decorated.controllerEvents.some((row) => row.event === "rule_selected" && row.update === 1_200)).toBe(true);
        expect(decorated.ownershipEvents.some((row) => row.phase === "baseline" && row.disposition === "suppressed" &&
            row.update === 1_201 && row.ownedCombatantCount === 1)).toBe(true);
        expect(decorated.ownershipEvents.some((row) => row.phase === "controller" && row.disposition === "forwarded")).toBe(true);
    });
});
