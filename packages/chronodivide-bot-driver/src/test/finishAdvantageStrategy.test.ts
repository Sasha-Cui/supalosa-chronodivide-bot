import { describe, expect, it, vi } from "vitest";
import { AttackState, FactoryType, ObjectType, OrderType, SpeedType } from "@chronodivide/game-api";
import { Countries } from "@supalosa/chronodivide-bot/dist/bot/logic/common/utils.js";
import { buildFinishAdvantageIrreversiblePolicy, buildFinishAdvantageSurplusPolicy } from "../training/finishAdvantagePolicy.js";
import { FinishAdvantageStrategy } from "../training/finishAdvantageStrategy.js";

const weapon = (damage = 100) => ({
    rules: {
        name: "ordinary",
        damage,
        burst: 1,
        rof: 30,
        neverUse: false,
        areaFire: false,
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

const rules = (name: string, type: ObjectType, selectable = type !== ObjectType.Building) => ({
    name,
    type,
    armor: 8,
    isSelectableCombatant: selectable,
    harvester: false,
    ammo: 0,
    speed: 256,
    speedType: type === ObjectType.Infantry ? SpeedType.Foot : SpeedType.Track,
    deployFire: false,
    c4: false,
    ivan: false,
    spawns: false,
    teleporter: false,
    constructionYard: false,
    factory: FactoryType.None,
    deploysInto: null,
});

const combatant = (
    id: number,
    x: number,
    y = 0,
    owner = "candidate",
    unitWeapon: ReturnType<typeof weapon> | undefined = weapon(),
) => ({
    id,
    name: `TANK${id}`,
    type: ObjectType.Vehicle,
    owner,
    rules: rules(`TANK${id}`, ObjectType.Vehicle),
    tile: { id: id * 10, rx: x, ry: y },
    foundation: { width: 1, height: 1 },
    hitPoints: 500,
    maxHitPoints: 500,
    primaryWeapon: unitWeapon,
    secondaryWeapon: undefined,
    canMove: true,
    isIdle: true,
    attackState: AttackState.Idle,
    onBridge: false,
});

const building = (
    id: number,
    x: number,
    owner: string,
    overrides: Record<string, unknown> = {},
) => ({
    id,
    name: `BUILDING${id}`,
    type: ObjectType.Building,
    owner,
    rules: { ...rules(`BUILDING${id}`, ObjectType.Building, false), ...overrides },
    tile: { id: id * 10, rx: x, ry: 0 },
    foundation: { width: 2, height: 2 },
    hitPoints: 1_000,
    maxHitPoints: 1_000,
    primaryWeapon: undefined,
    secondaryWeapon: undefined,
    canMove: false,
    isIdle: true,
    attackState: AttackState.Idle,
    onBridge: false,
});

const mockGame = (
    units: any[],
    tick: { value: number },
    visibleEnemyIds: () => number[] = () => units.filter(({ owner }) => owner === "enemy").map(({ id }) => id),
) => {
    const byId = new Map(units.map((unit) => [unit.id, unit]));
    return {
        getCurrentTick: () => tick.value,
        getAllUnits: () => units.map(({ id }) => id),
        getUnitData: (id: number) => byId.get(id),
        getVisibleUnits: (name: string, type: string) => type === "self"
            ? units.filter(({ owner }) => owner === name).map(({ id }) => id)
            : visibleEnemyIds(),
        areAlliedPlayers: () => false,
        getPlayerData: (name: string) => ({
            isCombatant: name === "candidate" || name === "enemy",
            startLocation: { x: 0, y: 0 },
        }),
        getGeneralRules: () => ({ baseUnit: ["MCV"] }),
        map: {
            getReachabilityMap: () => ({ isReachable: () => true }),
            getTilesInRect: ({ x, y, width, height }: {
                x: number;
                y: number;
                width: number;
                height: number;
            }) => [
                {
                    id: 999,
                    rx: x + Math.floor(width / 2),
                    ry: y + Math.floor(height / 2),
                    onBridgeLandType: false,
                },
            ],
            isPassableTile: () => true,
        },
    };
};

const mission = (name: string, ids: number[]) => ({
    getUnitIds: () => ids,
    getUniqueName: () => name,
    isUnitsLocked: () => true,
    getPriority: () => 100,
});

const run = ({
    units,
    policy = buildFinishAdvantageIrreversiblePolicy({ orderIntervalTicks: 1 }),
    missions = [],
    tick = { value: 0 },
    visibleEnemyIds,
}: {
    units: any[];
    policy?: ReturnType<typeof buildFinishAdvantageIrreversiblePolicy>;
    missions?: ReturnType<typeof mission>[];
    tick?: { value: number };
    visibleEnemyIds?: () => number[];
}) => {
    const orders: any[][] = [];
    const telemetry: any[] = [];
    const callOrder: string[] = [];
    let inner: any;
    inner = { onAiUpdate: () => { callOrder.push("inner"); return inner; } };
    const strategy = new FinishAdvantageStrategy(
        inner,
        Countries.USA,
        policy,
        (event) => telemetry.push(event),
    );
    const actions = { orderUnits: (...args: any[]) => { callOrder.push("overlay"); orders.push(args); } };
    const game = mockGame(units, tick, visibleEnemyIds);
    const update = () => strategy.onAiUpdate({
        game,
        player: { name: "candidate", actions },
    } as any, { getMissions: () => missions }, vi.fn());
    return { strategy, tick, orders, telemetry, callOrder, update, units };
};

const last = <T>(values: readonly T[]): T | undefined => values[values.length - 1];

describe("mission-preserving finish-advantage strategy", () => {
    it("leaves the final-building state exclusively to the outer V5 controller", () => {
        const harness = run({ units: [
            combatant(1, 0),
            building(10, 0, "candidate"),
            building(100, 20, "enemy"),
        ] });
        harness.update();
        expect(harness.orders).toHaveLength(0);
        expect(last(harness.telemetry)).toMatchObject({
            phase: "inactive",
            reason: "outside_multi_building_scope",
            enemyBuildingCount: 1,
        });
    });

    it("serializes protected IDs when a nonempty protected set leaves no strike", () => {
        const harness = run({
            units: [
                combatant(1, 0),
                building(10, 0, "candidate"),
                building(100, 20, "enemy"),
                building(101, 35, "enemy"),
            ],
            missions: [mission("globalDefence.0.0", [1])],
        });
        harness.update();
        expect(harness.orders).toHaveLength(0);
        expect(last(harness.telemetry)).toMatchObject({
            phase: "inactive",
            nominalEligibleCount: 1,
            protectedEligibleCount: 1,
            protectedEligibleIds: [1],
            strikePoolIds: [],
        });
    });

    it("runs Supalosa first and sweeps helpless buildings with all unprotected compatible units", () => {
        const harness = run({
            units: [
                combatant(1, 0), combatant(2, 1), combatant(3, 2), combatant(4, 3),
                building(10, 0, "candidate"),
                building(100, 20, "enemy"), building(101, 35, "enemy"), building(102, 50, "enemy"),
            ],
            missions: [mission("globalDefence.0.0", [1]), mission("attack_0.0", [2, 3])],
        });
        harness.update();
        expect(harness.callOrder).toEqual(["inner", "overlay"]);
        expect(harness.orders).toHaveLength(1);
        expect(harness.orders[0][0]).toEqual([2, 3, 4]);
        expect(harness.orders[0][1]).toBe(OrderType.Attack);
        expect(harness.orders[0][2]).toBe(100);
        expect(last(harness.telemetry)).toMatchObject({
            schemaVersion: 4,
            irreversibleCertificate: true,
            protectedEligibleCount: 1,
            protectedEligibleIds: [1],
            strikePoolIds: [2, 3, 4],
            phase: "building_strike",
            targetBuildingId: 100,
            targetBuildingCoordinates: { x: 20, y: 0 },
            targetBuildingHitPoints: 1_000,
            targetBuildingVisible: true,
            earliestInterceptTicks: null,
            earliestOwnBuildingLossTicks: null,
            blockerRemovalTicks: null,
            objectiveProgress: "new_commitment",
        });
        expect(last(harness.telemetry)?.buildingCompletionTicks).toBeGreaterThan(0);
    });

    it("retargets on the next legal update after the current building is destroyed", () => {
        const tick = { value: 0 };
        const units = [
            combatant(1, 0), combatant(2, 1), combatant(3, 2),
            building(10, 0, "candidate"),
            building(100, 20, "enemy"), building(101, 35, "enemy"), building(102, 50, "enemy"),
        ];
        const harness = run({ units, tick });
        harness.update();
        expect(last(harness.orders)?.[2]).toBe(100);

        units.splice(units.findIndex(({ id }) => id === 100), 1);
        tick.value = 1;
        harness.update();

        expect(last(harness.orders)?.[2]).toBe(101);
        expect(last(harness.telemetry)).toMatchObject({
            phase: "building_strike",
            targetBuildingId: 101,
            stalledTargetId: null,
        });
    });

    it("breaks equal completion cost toward a resistance-producing building", () => {
        const harness = run({
            policy: buildFinishAdvantageSurplusPolicy(0, { orderIntervalTicks: 1 }),
            units: [
                combatant(1, 0), combatant(2, 1), combatant(3, 2), combatant(4, 3),
                building(10, 0, "candidate"),
                building(100, 20, "enemy"),
                building(101, 20, "enemy", { factory: 1 }),
            ],
        });
        harness.update();
        expect(last(harness.orders)?.[2]).toBe(101);
        expect(last(harness.telemetry)).toMatchObject({
            phase: "building_strike",
            targetBuildingId: 101,
        });
    });

    it("leases only the post-cover numerical surplus before certification", () => {
        const enemyScout = combatant(200, 100, 100, "enemy", undefined);
        const harness = run({
            policy: buildFinishAdvantageSurplusPolicy(2, { orderIntervalTicks: 1 }),
            units: [
                combatant(1, 0), combatant(2, 1), combatant(3, 2),
                combatant(4, 3), combatant(5, 4), combatant(6, 5),
                building(10, 0, "candidate"),
                building(100, 20, "enemy"), building(101, 35, "enemy"),
                enemyScout,
            ],
            missions: [mission("globalDefence.0.0", [1, 2])],
        });
        harness.update();
        expect(harness.orders[0][0]).toEqual([4, 5, 6]);
        expect(last(harness.telemetry)).toMatchObject({
            irreversibleCertificate: false,
            additionalReserveIds: [3],
            strikePoolIds: [4, 5, 6],
        });
    });

    it("temporarily clears only an on-route lethal blocker", () => {
        const blocker = combatant(200, 10, 0, "enemy", weapon(50_000));
        const harness = run({
            policy: buildFinishAdvantageSurplusPolicy(0, { orderIntervalTicks: 1 }),
            units: [
                combatant(1, 0), combatant(2, 1), combatant(3, 2),
                combatant(4, 3), combatant(5, 4), combatant(6, 5),
                building(10, -100, "candidate"),
                building(100, 20, "enemy"), building(101, 35, "enemy"),
                blocker,
            ],
        });
        harness.update();
        expect(harness.orders).toHaveLength(1);
        expect(harness.orders[0][1]).toBe(OrderType.Attack);
        expect(harness.orders[0][2]).toBe(200);
        expect(last(harness.telemetry)).toMatchObject({
            phase: "blocker_clear",
            reason: "minimum_causal_intercept_blocker",
            blockerId: 200,
            blockerCoordinates: { x: 10, y: 0 },
            blockerVisible: true,
            targetBuildingId: 100,
        });
        expect(last(harness.telemetry)?.earliestInterceptTicks).toBeGreaterThanOrEqual(0);
        expect(last(harness.telemetry)?.blockerRemovalTicks).toBeGreaterThanOrEqual(0);
    });

    it("does not abandon the building for a weak route force that cannot collapse the strike", () => {
        const weak = combatant(200, 10, 0, "enemy", weapon());
        const harness = run({
            policy: buildFinishAdvantageSurplusPolicy(0, { orderIntervalTicks: 1 }),
            units: [
                combatant(1, 0), combatant(2, 1), combatant(3, 2),
                combatant(4, 3), combatant(5, 4), combatant(6, 5),
                building(10, 0, "candidate"),
                building(100, 20, "enemy"), building(101, 35, "enemy"),
                weak,
            ],
        });
        harness.update();
        expect(harness.orders).toHaveLength(1);
        expect(harness.orders[0][1]).toBe(OrderType.Attack);
        expect(harness.orders[0][2]).toBe(100);
        expect(last(harness.telemetry)).toMatchObject({
            phase: "building_strike",
            blockerId: null,
            targetBuildingId: 100,
        });
    });

    it("recognizes several weak route forces that collectively collapse the strike", () => {
        const harness = run({
            policy: buildFinishAdvantageSurplusPolicy(0, { orderIntervalTicks: 1 }),
            units: [
                combatant(1, 0), combatant(2, 1), combatant(3, 2),
                combatant(4, 3), combatant(5, 4), combatant(6, 5),
                building(10, -100, "candidate"),
                building(100, 20, "enemy"), building(101, 35, "enemy"),
                combatant(200, 10, 0, "enemy", weapon(500)),
                combatant(201, 11, 0, "enemy", weapon(500)),
            ],
        });
        harness.update();
        expect(harness.orders).toHaveLength(1);
        expect(harness.orders[0][1]).toBe(OrderType.Attack);
        expect([200, 201]).toContain(harness.orders[0][2]);
        expect(last(harness.telemetry)).toMatchObject({
            phase: "blocker_clear",
            reason: "minimum_causal_intercept_blocker",
            targetBuildingId: 100,
        });
    });

    it("keeps irreversible-only action-free when production can restore resistance", () => {
        const harness = run({ units: [
            combatant(1, 0), combatant(2, 1), combatant(3, 2),
            building(10, 0, "candidate"),
            building(100, 20, "enemy", { factory: 1 }),
            building(101, 35, "enemy"),
        ] });
        harness.update();
        expect(harness.orders).toHaveLength(0);
        expect(last(harness.telemetry)).toMatchObject({
            irreversibleCertificate: false,
            phase: "inactive",
            reason: "no_certified_surplus",
        });
    });

    it("abstains when a public enemy threat wins our base race", () => {
        const own = Array.from({ length: 8 }, (_, index) => combatant(index + 1, index));
        const baseThreat = combatant(200, 1, 0, "enemy", weapon(50_000));
        const harness = run({
            policy: buildFinishAdvantageSurplusPolicy(0, { orderIntervalTicks: 1 }),
            units: [
                ...own,
                building(10, 0, "candidate"),
                building(100, 40, "enemy"), building(101, 60, "enemy"),
                baseThreat,
            ],
        });
        harness.update();
        expect(harness.orders).toHaveLength(0);
        expect(last(harness.telemetry)).toMatchObject({
            phase: "base_defense",
            reason: "own_building_loss_precedes_objective",
            baseRaceThreatId: 200,
            issuedOrder: "none",
        });
    });

    it("does not let a distant heavy threat borrow a nearby weak threat's base-arrival time", () => {
        const nearWeak = combatant(200, -99, 0, "enemy", weapon());
        const distantHeavy = combatant(201, -1_000, 0, "enemy", weapon(50_000));
        const harness = run({
            policy: buildFinishAdvantageSurplusPolicy(0, { orderIntervalTicks: 1 }),
            units: [
                combatant(1, 0), combatant(2, 1), combatant(3, 2),
                combatant(4, 3), combatant(5, 4), combatant(6, 5),
                building(10, -100, "candidate"),
                building(100, 20, "enemy"), building(101, 35, "enemy"),
                nearWeak, distantHeavy,
            ],
        });
        harness.update();
        expect(harness.orders).toHaveLength(1);
        expect(harness.orders[0][1]).toBe(OrderType.Attack);
        expect(harness.orders[0][2]).toBe(100);
        expect(last(harness.telemetry)).toMatchObject({
            phase: "building_strike",
            targetBuildingId: 100,
        });
        expect(last(harness.telemetry)?.earliestOwnBuildingLossTicks).toBeCloseTo(300);
        expect(last(harness.telemetry)?.buildingCompletionTicks).toBeLessThan(300);
    });

    it("uses coordinate approach for an exact unseen building", () => {
        const harness = run({
            units: [
                combatant(1, 0), combatant(2, 1), combatant(3, 2),
                building(10, 0, "candidate"),
                building(100, 20, "enemy"), building(101, 35, "enemy"),
            ],
            visibleEnemyIds: () => [],
        });
        harness.update();
        expect(harness.orders[0]).toEqual([[1, 2, 3], OrderType.AttackMove, 20, 0]);
        expect(last(harness.telemetry)?.issuedOrder).toBe("approach_exact_unseen_building");
    });

    it("retargets after the physical-progress deadline instead of sweeping forces", () => {
        const tick = { value: 0 };
        const harness = run({
            tick,
            policy: buildFinishAdvantageIrreversiblePolicy({
                orderIntervalTicks: 1,
                physicalProgressDeadlineTicks: 120,
                retargetCooldownTicks: 300,
            }),
            units: [
                combatant(1, 0), combatant(2, 1), combatant(3, 2),
                building(10, 0, "candidate"),
                building(100, 20, "enemy"), building(101, 35, "enemy"),
            ],
        });
        harness.update();
        expect(last(harness.orders)?.[2]).toBe(100);
        tick.value = 120;
        harness.update();
        expect(last(harness.orders)?.[2]).toBe(101);
        expect(last(harness.telemetry)).toMatchObject({
            phase: "building_strike",
            targetBuildingId: 101,
        });
    });

    it("does not mistake continued approach toward a building for a stalemate", () => {
        const tick = { value: 0 };
        const units = [
            combatant(1, 0), combatant(2, 1), combatant(3, 2),
            building(10, 0, "candidate"),
            building(100, 40, "enemy"), building(101, 60, "enemy"),
        ];
        const harness = run({
            tick,
            policy: buildFinishAdvantageIrreversiblePolicy({
                orderIntervalTicks: 1,
                physicalProgressDeadlineTicks: 120,
                retargetCooldownTicks: 300,
            }),
            units,
        });
        harness.update();
        expect(last(harness.orders)?.[2]).toBe(100);

        for (const unit of units.filter(({ type, owner }) =>
            type === ObjectType.Vehicle && owner === "candidate")) unit.tile.rx += 5;
        tick.value = 120;
        harness.update();

        expect(last(harness.orders)?.[2]).toBe(100);
        expect(last(harness.telemetry)).toMatchObject({
            targetBuildingId: 100,
            objectiveProgress: "approach",
            ticksSinceObjectiveProgress: 0,
            stalledTargetId: null,
        });
    });

    it("records an irreversible-certificate revocation without inventing an outcome", () => {
        const tick = { value: 0 };
        const emergentThreat = combatant(200, 100, 100, "spectator");
        const units = [
            combatant(1, 0), combatant(2, 1), combatant(3, 2),
            building(10, 0, "candidate"),
            building(100, 20, "enemy"), building(101, 35, "enemy"),
            emergentThreat,
        ];
        const harness = run({ units, tick });
        harness.update();
        expect(last(harness.telemetry)).toMatchObject({
            irreversibleCertificate: true,
            irreversibleCertificateRevoked: false,
        });

        emergentThreat.owner = "enemy";
        tick.value = 1;
        harness.update();
        expect(last(harness.telemetry)).toMatchObject({
            irreversibleCertificate: false,
            irreversibleCertificateRevoked: true,
            phase: "inactive",
        });
    });

    it("fails closed when the mission ownership interface is unavailable", () => {
        const units = [
            combatant(1, 0), combatant(2, 1), combatant(3, 2),
            building(10, 0, "candidate"),
            building(100, 20, "enemy"), building(101, 35, "enemy"),
        ];
        const orders: any[][] = [];
        let inner: any;
        inner = { onAiUpdate: () => inner };
        const telemetry: any[] = [];
        const strategy = new FinishAdvantageStrategy(
            inner,
            Countries.USA,
            buildFinishAdvantageIrreversiblePolicy({ orderIntervalTicks: 1 }),
            (event) => telemetry.push(event),
        );
        strategy.onAiUpdate({
            game: mockGame(units, { value: 0 }),
            player: { name: "candidate", actions: { orderUnits: (...args: any[]) => orders.push(args) } },
        } as any, null, vi.fn());
        expect(orders).toHaveLength(0);
        expect(last(telemetry)?.reason).toBe("mission_ownership_controller_unavailable");
    });

    it("emits no outcome, endpoint, resignation, or evaluator field", () => {
        const harness = run({ units: [
            combatant(1, 0), combatant(2, 1), combatant(3, 2),
            building(10, 0, "candidate"),
            building(100, 20, "enemy"), building(101, 35, "enemy"),
        ] });
        harness.update();
        const serialized = JSON.stringify(harness.telemetry);
        expect(serialized).not.toMatch(/winner|score|outcome|endpoint|resignation|evaluator/i);
    });
});
