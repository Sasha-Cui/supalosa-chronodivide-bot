import { describe, expect, test } from "vitest";
import {
    assignAttackersToTargets,
    BuildingTargetDescriptor,
    getBuildingTargetWeight,
    rankBuildingTargets,
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
});
