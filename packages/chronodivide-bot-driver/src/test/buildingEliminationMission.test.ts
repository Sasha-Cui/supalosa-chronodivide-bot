import { describe, expect, test } from "vitest";
import {
    assignAttackersToTargets,
    BuildingTargetDescriptor,
    getBuildingTargetWeight,
    isPreemptibleBuildingEliminationMission,
    rankBuildingTargets,
    rankSweepPoints,
    reconcileRememberedBuildingTargets,
    resolveBuildingEliminationOptions,
} from "@supalosa/chronodivide-bot/dist/bot/logic/mission/missions/buildingEliminationMission.js";

const target = (overrides: Partial<BuildingTargetDescriptor>): BuildingTargetDescriptor => ({
    id: 1,
    x: 10,
    y: 10,
    name: "GENERIC",
    maxHitPoints: 500,
    constructionYard: false,
    weaponsFactory: false,
    barracks: false,
    refinery: false,
    power: false,
    defense: false,
    visible: true,
    ...overrides,
});

describe("building elimination policy", () => {
    test("production priority attacks construction and power before generic structures", () => {
        const generic = target({ id: 1, name: "CAOILD" });
        const power = target({ id: 2, name: "NAPOWR", power: true });
        const yard = target({ id: 3, name: "NACNST", constructionYard: true });
        expect(rankBuildingTargets([generic, power, yard], "production", [{ x: 0, y: 0 }])).toEqual([
            yard,
            power,
            generic,
        ]);
        expect(getBuildingTargetWeight(yard, "production")).toBeGreaterThan(
            getBuildingTargetWeight(power, "production"),
        );
    });

    test("defense priority cuts power and static defenses first", () => {
        const yard = target({ id: 1, name: "NACNST", constructionYard: true });
        const laser = target({ id: 2, name: "NALASR", defense: true });
        const power = target({ id: 3, name: "NAPOWR", power: true });
        expect(rankBuildingTargets([yard, laser, power], "defense", [{ x: 0, y: 0 }])).toEqual([
            power,
            laser,
            yard,
        ]);
    });

    test("balanced assignment uses every target when enough attackers exist", () => {
        const attackers = [
            { id: 1, x: 0, y: 0 },
            { id: 2, x: 1, y: 0 },
            { id: 3, x: 9, y: 0 },
            { id: 4, x: 10, y: 0 },
        ];
        const targets = [
            { id: "left", x: 0, y: 1 },
            { id: "right", x: 10, y: 1 },
        ];
        const assignments = assignAttackersToTargets(attackers, targets);
        expect(new Set(assignments.map(({ target: assigned }) => assigned.id))).toEqual(
            new Set(["left", "right"]),
        );
        expect(assignments).toHaveLength(attackers.length);
    });

    test("memory is retained under fog and invalidated after its tile is re-observed empty", () => {
        const hidden = target({ id: 7, x: 20, y: 30, visible: false });
        const retained = reconcileRememberedBuildingTargets(new Map([[7, hidden]]), [], () => false);
        expect(retained.invalidatedIds).toEqual([]);
        expect(retained.remembered.get(7)).toEqual(hidden);

        const invalidated = reconcileRememberedBuildingTargets(retained.remembered, [], () => true);
        expect(invalidated.invalidatedIds).toEqual([7]);
        expect(invalidated.remembered.size).toBe(0);
    });

    test("sweeps stale low-visibility sectors before recently visited sectors", () => {
        const candidates = [
            { x: 1, y: 1, visibility: 0.1, lastSwept: 950 },
            { x: 2, y: 2, visibility: 0.8, lastSwept: 0 },
            { x: 3, y: 3, visibility: 0.2, lastSwept: 0 },
        ];
        expect(rankSweepPoints(candidates, 1000, 100, 2)).toEqual([
            { x: 3, y: 3 },
            { x: 2, y: 2 },
        ]);
    });

    test("preemption is restricted to competing attack missions", () => {
        expect(isPreemptibleBuildingEliminationMission("attack_12")).toBe(true);
        expect(isPreemptibleBuildingEliminationMission("retreat-from-attack_12")).toBe(true);
        expect(isPreemptibleBuildingEliminationMission("allInAttack")).toBe(true);
        expect(isPreemptibleBuildingEliminationMission("defence_12")).toBe(false);
        expect(isPreemptibleBuildingEliminationMission("buildingElimination")).toBe(false);
    });

    test("configuration resolves to a canonical complete object without undefined overrides", () => {
        const resolved = resolveBuildingEliminationOptions({
            enabled: true,
            minTick: 8400,
            reserveCombatants: undefined,
            observationMode: "visibleOnly",
        });
        expect(resolved.enabled).toBe(true);
        expect(resolved.minTick).toBe(8400);
        expect(resolved.reserveCombatants).toBe(4);
        expect(resolved.observationMode).toBe("visibleOnly");
        expect(Object.values(resolved)).not.toContain(undefined);
        expect(Object.keys(resolved)).toEqual([
            "enabled",
            "minTick",
            "minCombatants",
            "combatantAdvantage",
            "maxEnemyCombatants",
            "reserveCombatants",
            "orderIntervalTicks",
            "maxTargetGroups",
            "targetPriority",
            "observationMode",
            "directVisibleAttack",
            "preemptExistingAttacks",
            "sweepWhenNoTargets",
            "sweepRevisitTicks",
        ]);
    });

    test("configuration rejects impossible or non-integral search values", () => {
        expect(() => resolveBuildingEliminationOptions({ orderIntervalTicks: 0 })).toThrow(
            "orderIntervalTicks",
        );
        expect(() => resolveBuildingEliminationOptions({ maxTargetGroups: 1.5 })).toThrow("maxTargetGroups");
        expect(() => resolveBuildingEliminationOptions({ minTick: -1 })).toThrow("minTick");
    });
});
