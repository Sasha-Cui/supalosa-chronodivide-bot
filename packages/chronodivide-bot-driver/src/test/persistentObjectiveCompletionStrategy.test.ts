import { describe, expect, it, vi } from "vitest";
import { AttackState, FactoryType, ObjectType, SpeedType } from "@chronodivide/game-api";
import { Countries } from "@supalosa/chronodivide-bot/dist/bot/logic/common/utils.js";
import {
    PersistentObjectiveCompletionStrategy,
    objectiveMissionAssignments,
    objectiveUnitCompatibility,
    weaponCanDamageObjectiveBuilding,
} from "../training/persistentObjectiveCompletionStrategy.js";
import { buildPersistentObjectiveCompletionPolicy } from "../training/persistentObjectiveCompletionPolicy.js";

const ordinaryWeapon = (special = false) => ({
    rules: {
        name: special ? "special" : "ordinary",
        damage: 100,
        burst: 1,
        rof: 30,
        neverUse: false,
        areaFire: special,
        spawner: false,
        limboLaunch: false,
        suicide: false,
        fireOnce: false,
    },
    projectileRules: { isAntiGround: true, arcing: false },
    warheadRules: {
        verses: new Map([[8, 1]]),
        cellSpread: 0,
        temporal: false,
        mindControl: false,
        ivanBomb: false,
    },
    maxRange: 5,
    cooldownTicks: 0,
});

const baseRules = (name: string, type: ObjectType) => ({
    name,
    type,
    armor: 8,
    isSelectableCombatant: type !== ObjectType.Building,
    harvester: false,
    ammo: 0,
    speedType: type === ObjectType.Infantry ? SpeedType.Foot : SpeedType.Track,
    deployFire: false,
    c4: false,
    ivan: false,
    spawns: false,
    teleporter: false,
    constructionYard: false,
    factory: FactoryType.None,
});

const combatant = (id: number, x: number, y = 0, owner = "candidate") => ({
    id,
    name: `TANK${id}`,
    type: ObjectType.Vehicle,
    owner,
    rules: baseRules(`TANK${id}`, ObjectType.Vehicle),
    tile: { id: id * 10, rx: x, ry: y },
    foundation: { width: 1, height: 1 },
    hitPoints: 500,
    maxHitPoints: 500,
    primaryWeapon: ordinaryWeapon(),
    secondaryWeapon: undefined,
    canMove: true,
    isIdle: true,
    attackState: AttackState.Idle,
    onBridge: false,
});

const building = (id: number, x: number, owner: string) => ({
    id,
    name: `BUILDING${id}`,
    type: ObjectType.Building,
    owner,
    rules: baseRules(`BUILDING${id}`, ObjectType.Building),
    tile: { id: id * 10, rx: x, ry: 0 },
    foundation: { width: 2, height: 2 },
    hitPoints: 1_000,
    maxHitPoints: 1_000,
    canMove: false,
    isIdle: true,
    attackState: AttackState.Idle,
    onBridge: false,
});

const mockGame = (units: any[], tickRef: { value: number }) => {
    const byId = new Map(units.map((unit) => [unit.id, unit]));
    return {
        getCurrentTick: () => tickRef.value,
        getAllUnits: () => units.map(({ id }) => id),
        getUnitData: (id: number) => byId.get(id),
        getVisibleUnits: (name: string, type: string) => type === "self"
            ? units.filter((unit) => unit.owner === name).map(({ id }) => id)
            : [],
        areAlliedPlayers: () => false,
        getPlayerData: (name: string) => ({
            isCombatant: name === "candidate" || name === "enemy",
            startLocation: { x: 0, y: 0 },
        }),
        map: {
            getReachabilityMap: () => ({ isReachable: () => true }),
            getTilesInRect: () => [{ id: 999, rx: 18, ry: 0, onBridgeLandType: false }],
            isPassableTile: () => true,
        },
    };
};

describe("persistent objective-completion strategy", () => {
    it("treats a usable ordinary primary as command-compatible despite a special secondary", () => {
        const target = building(100, 20, "enemy");
        const unit = {
            ...combatant(1, 0),
            secondaryWeapon: ordinaryWeapon(true),
        };
        const game = mockGame([unit, target], { value: 0 });
        expect(weaponCanDamageObjectiveBuilding(unit.primaryWeapon as any, target as any)).toBe(true);
        const compatibility = objectiveUnitCompatibility(game as any, unit as any, target as any);
        expect(compatibility).toMatchObject({
            compatible: true,
            hasOrdinaryCompatibleWeapon: true,
            hasSpecialSecondaryMechanic: true,
            reachable: true,
        });
    });

    it("reads mission ownership structurally without depending on local class identity", () => {
        const controller = {
            getMissions: () => [{
                getUnitIds: () => [1, 2],
                getUniqueName: () => "globalDefence.1.1",
                isUnitsLocked: () => true,
                getPriority: () => 100,
            }],
        };
        expect(objectiveMissionAssignments(controller).get(1)).toEqual({
            missionName: "globalDefence.1.1",
            locked: true,
            priority: 100,
        });
    });

    it("reasserts the final-building order after Supalosa every three ticks and ignores off-route forces", () => {
        const tick = { value: 0 };
        const units = [
            combatant(1, 0),
            combatant(2, 1),
            building(10, 0, "candidate"),
            building(100, 20, "enemy"),
            ...Array.from({ length: 100 }, (_, index) => combatant(200 + index, 10, 100 + index, "enemy")),
        ];
        const game = mockGame(units, tick);
        const calls: string[] = [];
        const orders: any[][] = [];
        let inner: any;
        inner = { onAiUpdate: vi.fn(() => { calls.push("supalosa"); return inner; }) };
        const strategy = new PersistentObjectiveCompletionStrategy(
            inner,
            Countries.USA,
            buildPersistentObjectiveCompletionPolicy({ terminalMinTick: 0 }),
            () => undefined,
        );
        const context = {
            game,
            player: {
                name: "candidate",
                actions: { orderUnits: (...args: any[]) => { calls.push("objective"); orders.push(args); } },
            },
        };
        const lockedController = {
            getMissions: () => [{
                getUnitIds: () => [1, 2], getUniqueName: () => "globalDefence.0.0",
                isUnitsLocked: () => true, getPriority: () => 100,
            }],
        };
        strategy.onAiUpdate(context as any, lockedController, vi.fn());
        tick.value = 3;
        strategy.onAiUpdate(context as any, lockedController, vi.fn());
        expect(calls).toEqual(["supalosa", "objective", "supalosa", "objective"]);
        expect(orders).toHaveLength(2);
        expect(orders[0][0]).toEqual([1, 2]);
        expect(orders[0][2]).toBe(100);
        expect(orders[1][2]).toBe(100);
    });

    it("clears only a force intersecting a stalled final route, not an off-route army", () => {
        const tick = { value: 0 };
        const routeBlocker = combatant(200, 10, 0, "enemy");
        const units = [
            combatant(1, 0),
            building(10, 0, "candidate"),
            building(100, 20, "enemy"),
            routeBlocker,
            ...Array.from({ length: 100 }, (_, index) => combatant(300 + index, 10, 100 + index, "enemy")),
        ];
        const game = mockGame(units, tick);
        const orders: any[][] = [];
        let inner: any;
        inner = { onAiUpdate: () => inner };
        const strategy = new PersistentObjectiveCompletionStrategy(
            inner,
            Countries.USA,
            buildPersistentObjectiveCompletionPolicy({ terminalMinTick: 0 }),
            () => undefined,
        );
        const context = {
            game,
            player: { name: "candidate", actions: { orderUnits: (...args: any[]) => orders.push(args) } },
        };
        strategy.onAiUpdate(context as any, { getMissions: () => [] }, vi.fn());
        tick.value = 300;
        strategy.onAiUpdate(context as any, { getMissions: () => [] }, vi.fn());
        expect(orders[0][2]).toBe(100);
        expect(orders[1][2]).toBe(routeBlocker.id);
    });
});
