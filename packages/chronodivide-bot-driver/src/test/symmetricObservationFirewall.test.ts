import { describe, expect, it, vi } from "vitest";
import {
    createSymmetricObservationViews,
    installSymmetricObservationFirewall,
} from "../training/symmetricObservationFirewall.js";

const rawGame = () => {
    const objects = new Map([
        [1, { id: 1, owner: "p1", hitPoints: 100, rules: { name: "P1" } }],
        [2, { id: 2, owner: "p2", hitPoints: 100, rules: { name: "P2-visible" } }],
        [3, { id: 3, owner: "p2", hitPoints: 100, rules: { name: "P2-hidden" } }],
        [4, { id: 4, owner: "@@NEUTRAL@@", hitPoints: 100, rules: { name: "TECH" } }],
    ]);
    const players: Record<string, any> = {
        p1: {
            name: "p1",
            country: { name: "Americans", side: 0 },
            startLocation: { x: 1, y: 2 },
            isObserver: false,
            isAi: true,
            isCombatant: true,
            credits: 1_000,
            power: { total: 100, drain: 50, isLowPower: false },
        },
        p2: {
            name: "p2",
            country: { name: "Iraq", side: 1 },
            startLocation: { x: 9, y: 8 },
            isObserver: false,
            isAi: true,
            isCombatant: true,
            credits: 9_000,
            power: { total: 200, drain: 75, isLowPower: false },
        },
    };
    const visible = (name: string, relation: string): number[] => {
        if (name === "p1") {
            if (relation === "self" || relation === "allied") return [1];
            if (relation === "enemy") return [2];
            return [2, 4];
        }
        if (relation === "self" || relation === "allied") return [2, 3];
        if (relation === "enemy") return [1];
        return [1, 4];
    };
    const map: any = {
        getRealMapSize: () => ({ width: 100, height: 100 }),
        getStartingLocations: () => [{ x: 1, y: 2 }, { x: 9, y: 8 }],
        getTheaterType: () => 1,
        getTile: (rx: number, ry: number) => ({ rx, ry }),
        getTilesInRect: () => [],
        getObjectsOnTile: () => [1, 2, 3, 4],
        hasBridgeOnTile: () => false,
        hasHighBridgeOnTile: () => false,
        isPassableTile: () => true,
        findPath: () => [],
        getReachabilityMap: () => ({}),
        isVisibleTile: (_tile: unknown, name: string) => name === "p1",
        getTileResourceData: () => undefined,
        getAllTilesResourceData: () => [],
    };
    const game: any = {
        map,
        rules: { publicRules: true },
        getCurrentTick: () => 1,
        isPlayerDefeated: () => false,
        areAlliedPlayers: (left: string, right: string) => left === right,
        canPlaceBuilding: () => true,
        getBuildingPlacementData: () => ({ foundation: { width: 1, height: 1 } }),
        getPlayers: () => ["p1", "p2"],
        getPlayerData: (name: string) => players[name],
        getAllTerrainObjects: () => [4],
        getAllUnits: () => [1, 2, 3, 4],
        getNeutralUnits: () => [4],
        getUnitsInArea: () => [1, 2, 3, 4],
        getVisibleUnits: (
            name: string,
            relation: string,
            filter?: (rules: unknown) => boolean,
        ) => visible(name, relation).filter((id) =>
            !filter || filter(objects.get(id)!.rules)),
        getGameObjectData: (id: number) => objects.get(id),
        getUnitData: (id: number) => objects.get(id),
        getAllSuperWeaponData: () => [
            { playerName: "p1", type: 1, status: 2, timerSeconds: 0 },
            { playerName: "p2", type: 2, status: 2, timerSeconds: 0 },
        ],
        getGeneralRules: () => ({ baseUnit: ["AMCV"] }),
        getRulesIni: () => ({}),
        getArtIni: () => ({}),
        getAiIni: () => ({}),
        generateRandomInt: () => 3,
        generateRandom: () => 0.5,
        getTickRate: () => 60,
        getBaseTickRate: () => 15,
        getCurrentTime: () => 10,
        secretMethod: () => "hidden",
    };
    return game;
};

describe("symmetric observation firewall", () => {
    it("leaves the declared API-full-state mode unchanged", () => {
        const game = rawGame();
        const result = createSymmetricObservationViews(
            game,
            ["p1", "p2"],
            "api_full_state",
        );
        expect(result.views.p1).toBe(game);
        expect(result.views.p2).toBe(game);
        expect(result.getAudit("p1")).toEqual({
            mode: "api_full_state",
            viewer: "p1",
            hiddenObjectQueries: 0,
            filteredObjectIds: 0,
            foreignVisibilityQueries: 0,
            redactedPlayerFieldReads: 0,
            unclassifiedQueries: 0,
        });
    });

    it("filters hidden objects before caller predicates can observe them", () => {
        const result = createSymmetricObservationViews(
            rawGame(),
            ["p1", "p2"],
            "fog_respecting",
        );
        const p1 = result.views.p1;
        const observedRules: string[] = [];
        expect(p1.getAllUnits((rules) => {
            observedRules.push(rules.name);
            return true;
        })).toEqual([1, 2, 4]);
        expect(observedRules).toEqual(["P1", "P2-visible", "TECH"]);
        expect(p1.getGameObjectData(3)).toBeUndefined();
        expect(p1.getUnitData(1)).toMatchObject({ id: 1, owner: "p1" });
        expect(Object.isFrozen(p1.getUnitData(1))).toBe(true);
        expect(p1.getUnitsInArea({} as any)).toEqual([1, 2, 4]);
        expect(p1.map.getObjectsOnTile({} as any)).toEqual([1, 2, 4]);
        expect(result.views.p2.getUnitData(3)).toMatchObject({ owner: "p2" });
        expect(result.getAudit("p1")).toMatchObject({
            hiddenObjectQueries: 1,
            filteredObjectIds: 3,
        });
    });

    it("binds visibility and private player data to the receiving player", () => {
        const result = createSymmetricObservationViews(
            rawGame(),
            ["p1", "p2"],
            "fog_respecting",
        );
        const p1 = result.views.p1;
        expect(p1.getVisibleUnits("p1", "enemy")).toEqual([2]);
        expect(() => p1.getVisibleUnits("p2", "self")).toThrow(/bound to p1/);
        expect(p1.getPlayerData("p1").credits).toBe(1_000);
        const opponent = p1.getPlayerData("p2");
        expect(opponent.name).toBe("p2");
        expect(opponent.country!.name).toBe("Iraq");
        expect(opponent.startLocation).toEqual({ x: 9, y: 8 });
        expect(opponent.isCombatant).toBe(true);
        expect(() => opponent.credits).toThrow(/private/);
        expect(p1.getAllSuperWeaponData()).toEqual([
            { playerName: "p1", type: 1, status: 2, timerSeconds: 0 },
        ]);
        expect(() => (p1 as any).secretMethod).toThrow(/unclassified/);
        expect(result.getAudit("p1")).toMatchObject({
            foreignVisibilityQueries: 1,
            redactedPlayerFieldReads: 1,
            unclassifiedQueries: 1,
        });
    });

    it("enforces player-relative map visibility", () => {
        const result = createSymmetricObservationViews(
            rawGame(),
            ["p1", "p2"],
            "fog_respecting",
        );
        expect(result.views.p1.map.isVisibleTile({} as any, "p1")).toBe(true);
        expect(() => result.views.p1.map.isVisibleTile({} as any, "p2"))
            .toThrow(/bound to p1/);
    });

    it("injects independent views into both callback surfaces", () => {
        const game = rawGame();
        const p1Tick = vi.fn();
        const p2Tick = vi.fn();
        const bot = (name: string, tick: ReturnType<typeof vi.fn>) => ({
            name,
            onGameInit: vi.fn(),
            onGameStart: vi.fn(),
            onGameTick: tick,
            onGameEvent: vi.fn(),
        }) as any;
        const p1 = bot("p1", p1Tick);
        const p2 = bot("p2", p2Tick);
        installSymmetricObservationFirewall([p1, p2], "fog_respecting");

        p1.onGameTick(game);
        p2.onGameTick(game);

        expect(p1Tick).toHaveBeenCalledOnce();
        expect(p2Tick).toHaveBeenCalledOnce();
        const p1View = p1Tick.mock.calls[0][0];
        const p2View = p2Tick.mock.calls[0][0];
        expect(Object.is(p1View, game)).toBe(false);
        expect(Object.is(p2View, game)).toBe(false);
        expect(Object.is(p1View, p2View)).toBe(false);
        expect(p1View.getUnitData(3)).toBeUndefined();
        expect(p2View.getUnitData(3)).toMatchObject({ owner: "p2" });
    });
});
