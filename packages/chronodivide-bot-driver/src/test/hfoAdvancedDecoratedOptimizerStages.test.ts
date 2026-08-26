import { ObjectType, OrderType } from "@chronodivide/game-api";
import { describe, expect, it, vi } from "vitest";
import { AdvancedWestCandidate } from "../training/hfoAdvancedDecoratedOptimizer.js";
import { HFO_ADVANCED_V5_STAGE_DESIGNS, advancedWestConfigSha256, createAdvancedWestOverlay,
    selectAdvancedWestTarget } from "../training/hfoAdvancedDecoratedOptimizerStages.js";

const unit = (id: number, name: string, x: number, y: number, options: any = {}) => ({
    id, tile: { rx: x, ry: y }, hitPoints: 100, owner: options.owner ?? "player",
    rules: { name, type: options.type ?? ObjectType.Infantry, isSelectableCombatant: options.combatant ?? false,
        harvester: false, constructionYard: options.constructionYard ?? false,
        weaponsFactory: options.weaponsFactory ?? false, gdiBarracks: false, nodBarracks: false },
}) as any;
const candidate: AdvancedWestCandidate = {
    defense: "off", minTick: 0, minCombatants: 1, combatantAdvantage: -12, targetMode: "force_first",
};

describe("HFO Advanced V5 optimizer stages", () => {
    it("freezes every successive-halving task and survivor count", () => {
        expect(HFO_ADVANCED_V5_STAGE_DESIGNS).toEqual([
            { stageIndex: 0, casesPerRun: 18, candidateCount: 24, survivorCount: 6,
                armCount: 25, taskCount: 1_350 },
            { stageIndex: 1, casesPerRun: 36, candidateCount: 6, survivorCount: 2,
                armCount: 7, taskCount: 756 },
            { stageIndex: 2, casesPerRun: 72, candidateCount: 2, survivorCount: 1,
                armCount: 3, taskCount: 648 },
        ]);
        for (const stage of HFO_ADVANCED_V5_STAGE_DESIGNS)
            expect(stage.taskCount).toBe(3 * stage.armCount * stage.casesPerRun);
        expect(advancedWestConfigSha256(candidate)).toMatch(/^[0-9a-f]{64}$/);
    });

    it("implements the three frozen target modes", () => {
        const attacker = unit(1, "HTNK", 0, 0, { combatant: true });
        const enemy = unit(2, "MTNK", 2, 2, { combatant: true, owner: "opponent" });
        const factory = unit(3, "GAWEAP", 10, 10,
            { type: ObjectType.Building, weaponsFactory: true, owner: "opponent" });
        const power = unit(4, "GAPOWR", 1, 1, { type: ObjectType.Building, owner: "opponent" });
        expect(selectAdvancedWestTarget("force_first", [attacker], [enemy], [factory, power])?.id).toBe(2);
        expect(selectAdvancedWestTarget("production_first", [attacker], [enemy], [factory, power])?.id).toBe(3);
        expect(selectAdvancedWestTarget("terminal_race", [attacker], [enemy], [power])?.id).toBe(4);
        expect(selectAdvancedWestTarget("force_first", [attacker], [], [factory, power])?.id).toBe(3);
    });

    it("orders a visible force target only at the frozen west start", () => {
        const own = unit(1, "HTNK", 39, 82, { combatant: true, owner: "first" });
        const enemy = unit(2, "MTNK", 80, 100, { combatant: true, owner: "opponent" });
        const byId = new Map([[1, own], [2, enemy]]), orderUnits = vi.fn();
        const makeGame = (firstStart: { x: number; y: number }, opponentStart: { x: number; y: number }) => ({
            getCurrentTick: () => 24,
            getPlayerData: (name: string) => ({ startLocation: name === "first" ? firstStart : opponentStart }),
            getVisibleUnits: (_name: string, relation: string) => relation === "self" ? [1] : [2],
            getUnitData: (id: number) => byId.get(id),
        }) as any;
        const bot = { lastPlayerActions: { orderUnits } } as any;
        const active = createAdvancedWestOverlay(candidate, "first", "opponent");
        const westGame = makeGame({ x: 39, y: 82 }, { x: 151, y: 119 });
        active.afterGameStart!(westGame, bot); active.afterGameTick!(westGame, bot);
        expect(orderUnits).toHaveBeenCalledWith([1], OrderType.Attack, 2);
        orderUnits.mockClear();
        const inactive = createAdvancedWestOverlay(candidate, "first", "opponent");
        const eastGame = makeGame({ x: 151, y: 119 }, { x: 39, y: 82 });
        inactive.afterGameStart!(eastGame, bot); inactive.afterGameTick!(eastGame, bot);
        expect(orderUnits).not.toHaveBeenCalled();
    });

    it("keeps defenders out of same-tick offensive orders", () => {
        const guarded: AdvancedWestCandidate = { ...candidate, defense: "compact" };
        const own = unit(1, "HTNK", 39, 82, { combatant: true, owner: "first" });
        const threat = unit(2, "MTNK", 40, 82, { combatant: true, owner: "opponent" });
        const byId = new Map([[1, own], [2, threat]]), orderUnits = vi.fn();
        const game = { getCurrentTick: () => 24,
            getPlayerData: (name: string) => ({ startLocation: name === "first" ? { x: 39, y: 82 } : { x: 151, y: 119 } }),
            getVisibleUnits: (_name: string, relation: string) => relation === "self" ? [1] : [2],
            getUnitData: (id: number) => byId.get(id) } as any;
        const overlay = createAdvancedWestOverlay(guarded, "first", "opponent"), bot = { lastPlayerActions: { orderUnits } } as any;
        overlay.afterGameStart!(game, bot); overlay.afterGameTick!(game, bot);
        expect(orderUnits).toHaveBeenCalledTimes(1);
        expect(orderUnits).toHaveBeenCalledWith([1], OrderType.Attack, 2);
    });
});
