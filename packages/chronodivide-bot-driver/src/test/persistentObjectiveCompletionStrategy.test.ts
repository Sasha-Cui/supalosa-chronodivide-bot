import { describe, expect, it, vi } from "vitest";
import { AttackState, FactoryType, ObjectType, SpeedType } from "@chronodivide/game-api";
import { Countries } from "@supalosa/chronodivide-bot/dist/bot/logic/common/utils.js";
import {
    PersistentObjectiveCompletionStrategy,
    isObjectiveOffensiveMissionName,
    objectiveRaceFavorsBuilding,
    objectiveMissionAssignments,
    objectiveUnitCompatibility,
    weaponCanDamageObjectiveBuilding,
} from "../training/persistentObjectiveCompletionStrategy.js";
import { buildPersistentObjectiveCompletionPolicy } from "../training/persistentObjectiveCompletionPolicy.js";
import { buildPersistentObjectiveCompletionPolicyV2 } from "../training/persistentObjectiveCompletionPolicyV2.js";
import { buildPersistentObjectiveCompletionPolicyV3 } from "../training/persistentObjectiveCompletionPolicyV3.js";
import { buildPersistentObjectiveCompletionPolicyV4 } from "../training/persistentObjectiveCompletionPolicyV4.js";
import { buildPersistentObjectiveCompletionPolicyV5 } from "../training/persistentObjectiveCompletionPolicyV5.js";

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

    it("recognizes only the prospectively frozen offensive mission-name classes", () => {
        expect(isObjectiveOffensiveMissionName("attack_7.2")).toBe(true);
        expect(isObjectiveOffensiveMissionName("allInAttack")).toBe(true);
        expect(isObjectiveOffensiveMissionName("navalAssault")).toBe(true);
        expect(isObjectiveOffensiveMissionName("globalDefence.1.1")).toBe(false);
        expect(isObjectiveOffensiveMissionName("scout_7.2")).toBe(false);
        expect(isObjectiveOffensiveMissionName("attack")).toBe(false);
    });

    it("borrows only a one-third detachment from a locked offensive mission", () => {
        const tick = { value: 0 };
        const units = [
            combatant(1, 0), combatant(2, 1), combatant(3, 2),
            combatant(4, 3), combatant(5, 4), combatant(6, 5),
            building(10, 0, "candidate"),
            building(100, 20, "enemy"),
            building(101, 25, "enemy"),
        ];
        const game = mockGame(units, tick);
        const orders: any[][] = [];
        let inner: any;
        inner = { onAiUpdate: () => inner };
        const strategy = new PersistentObjectiveCompletionStrategy(
            inner,
            Countries.USA,
            buildPersistentObjectiveCompletionPolicyV2({
                terminalMinTick: 0,
                assaultMinTick: 0,
                assaultBuildingCount: 100,
                ordinaryReserveCombatants: 0,
                minimumOwnBuildingsForAssault: 1,
                homeThreatRadius: 0,
                homeReserveRadius: 0,
            }),
            () => undefined,
        );
        const mission = (name: string, ids: number[]) => ({
            getUnitIds: () => ids,
            getUniqueName: () => name,
            isUnitsLocked: () => true,
            getPriority: () => 100,
        });
        const controller = {
            getMissions: () => [
                mission("attack_0.0", [1, 2, 3]),
                mission("globalDefence.0.0", [4, 5, 6]),
            ],
        };
        strategy.onAiUpdate({
            game,
            player: { name: "candidate", actions: { orderUnits: (...args: any[]) => orders.push(args) } },
        } as any, controller, vi.fn());
        expect(orders).toHaveLength(1);
        expect(orders[0][0]).toHaveLength(1);
        expect([1, 2, 3]).toContain(orders[0][0][0]);
        expect(orders[0][0]).not.toEqual(expect.arrayContaining([4, 5, 6]));
    });

    it("preserves a three-unit objective package before applying the ordinary reserve", () => {
        const tick = { value: 0 };
        const units = [
            combatant(1, 0), combatant(2, 1), combatant(3, 2),
            combatant(4, 3), combatant(5, 4), combatant(6, 5),
            building(10, 0, "candidate"),
            building(100, 20, "enemy"),
            building(101, 25, "enemy"),
        ];
        const game = mockGame(units, tick);
        const orders: any[][] = [];
        let inner: any;
        inner = { onAiUpdate: () => inner };
        const strategy = new PersistentObjectiveCompletionStrategy(
            inner,
            Countries.USA,
            buildPersistentObjectiveCompletionPolicyV3({
                terminalMinTick: 0,
                assaultMinTick: 0,
                assaultBuildingCount: 100,
                minimumOwnBuildingsForAssault: 1,
                homeThreatRadius: 0,
                homeReserveRadius: 0,
            }),
            () => undefined,
        );
        const mission = (name: string, ids: number[]) => ({
            getUnitIds: () => ids,
            getUniqueName: () => name,
            isUnitsLocked: () => true,
            getPriority: () => 100,
        });
        strategy.onAiUpdate({
            game,
            player: { name: "candidate", actions: { orderUnits: (...args: any[]) => orders.push(args) } },
        } as any, {
            getMissions: () => [
                mission("attack_0.0", [1, 2, 3]),
                mission("globalDefence.0.0", [4, 5, 6]),
            ],
        }, vi.fn());
        expect(orders).toHaveLength(1);
        expect(orders[0][0]).toHaveLength(3);
        expect([...orders[0][0]].sort((left, right) => left - right)).toEqual([1, 2, 3]);
    });

    it("preemptively clears a damage-capable route threat while ignoring an off-route army", () => {
        const tick = { value: 0 };
        const routeBlocker = combatant(200, 15, 0, "enemy");
        const units = [
            combatant(1, 0),
            building(10, 0, "candidate"),
            building(100, 20, "enemy"),
            building(101, 25, "enemy"),
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
            buildPersistentObjectiveCompletionPolicyV4({
                terminalMinTick: 0,
                assaultMinTick: 0,
                assaultBuildingCount: 100,
                minimumOwnBuildingsForAssault: 1,
                homeThreatRadius: 0,
                homeReserveRadius: 0,
            }),
            () => undefined,
        );
        strategy.onAiUpdate({
            game,
            player: { name: "candidate", actions: { orderUnits: (...args: any[]) => orders.push(args) } },
        } as any, { getMissions: () => [] }, vi.fn());
        expect(orders).toHaveLength(1);
        expect(orders[0][2]).toBe(routeBlocker.id);
    });

    it("attacks a building already in range instead of a route threat", () => {
        const tick = { value: 0 };
        const routeBlocker = combatant(200, 18, 0, "enemy");
        const units = [
            combatant(1, 16),
            building(10, 0, "candidate"),
            building(100, 20, "enemy"),
            building(101, 25, "enemy"),
            routeBlocker,
        ];
        const game = mockGame(units, tick);
        const orders: any[][] = [];
        let inner: any;
        inner = { onAiUpdate: () => inner };
        const strategy = new PersistentObjectiveCompletionStrategy(
            inner,
            Countries.USA,
            buildPersistentObjectiveCompletionPolicyV4({
                terminalMinTick: 0,
                assaultMinTick: 0,
                assaultBuildingCount: 100,
                minimumOwnBuildingsForAssault: 1,
                homeThreatRadius: 0,
                homeReserveRadius: 0,
            }),
            () => undefined,
        );
        strategy.onAiUpdate({
            game,
            player: { name: "candidate", actions: { orderUnits: (...args: any[]) => orders.push(args) } },
        } as any, { getMissions: () => [] }, vi.fn());
        expect(orders).toHaveLength(1);
        expect(orders[0][2]).toBe(100);
    });

    it("compares building completion directly against detachment survival", () => {
        expect(objectiveRaceFavorsBuilding(100, 100)).toBe(true);
        expect(objectiveRaceFavorsBuilding(100, 99)).toBe(false);
        expect(objectiveRaceFavorsBuilding(100, Number.POSITIVE_INFINITY)).toBe(true);
        expect(objectiveRaceFavorsBuilding(Number.POSITIVE_INFINITY, 100)).toBe(false);
    });

    it("bypasses a route threat when the selected package can finish the building first", () => {
        const tick = { value: 0 };
        const routeBlocker = combatant(200, 15, 0, "enemy");
        const units = [
            combatant(1, 0), combatant(2, 1), combatant(3, 2),
            building(10, 0, "candidate"),
            building(100, 20, "enemy"),
            building(101, 25, "enemy"),
            routeBlocker,
        ];
        const game = mockGame(units, tick);
        const orders: any[][] = [];
        let inner: any;
        inner = { onAiUpdate: () => inner };
        const strategy = new PersistentObjectiveCompletionStrategy(
            inner,
            Countries.USA,
            buildPersistentObjectiveCompletionPolicyV5({
                terminalMinTick: 0,
                assaultMinTick: 0,
                assaultBuildingCount: 100,
                minimumOwnBuildingsForAssault: 1,
                homeThreatRadius: 0,
                homeReserveRadius: 0,
            }),
            () => undefined,
        );
        strategy.onAiUpdate({
            game,
            player: { name: "candidate", actions: { orderUnits: (...args: any[]) => orders.push(args) } },
        } as any, { getMissions: () => [] }, vi.fn());
        expect(orders).toHaveLength(1);
        expect(orders[0][2]).toBe(100);
    });

    it("clears one removable route threat when interception wins the completion race", () => {
        const tick = { value: 0 };
        const routeBlocker = combatant(200, 15, 0, "enemy");
        const units = [
            combatant(1, 0),
            building(10, 0, "candidate"),
            building(100, 20, "enemy"),
            building(101, 25, "enemy"),
            routeBlocker,
        ];
        const game = mockGame(units, tick);
        const orders: any[][] = [];
        let inner: any;
        inner = { onAiUpdate: () => inner };
        const strategy = new PersistentObjectiveCompletionStrategy(
            inner,
            Countries.USA,
            buildPersistentObjectiveCompletionPolicyV5({
                terminalMinTick: 0,
                assaultMinTick: 0,
                assaultBuildingCount: 100,
                minimumOwnBuildingsForAssault: 1,
                homeThreatRadius: 0,
                homeReserveRadius: 0,
            }),
            () => undefined,
        );
        strategy.onAiUpdate({
            game,
            player: { name: "candidate", actions: { orderUnits: (...args: any[]) => orders.push(args) } },
        } as any, { getMissions: () => [] }, vi.fn());
        expect(orders).toHaveLength(1);
        expect(orders[0][2]).toBe(routeBlocker.id);
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
