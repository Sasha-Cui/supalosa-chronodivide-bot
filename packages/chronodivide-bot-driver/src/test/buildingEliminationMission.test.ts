import { describe, expect, test } from "vitest";
import { AttackState, FactoryType, ObjectType, SideType, SpeedType } from "@chronodivide/game-api";
import {
    assignAttackersToTargets,
    assignAttackersToCompatibleTargets,
    allocateBuildingEliminationEngagement,
    applyContactTriggeredBuildingAdvance,
    BuildingTargetDescriptor,
    classifyBuildingCapabilityGaps,
    classifyBuildingEliminationLaunchHandoff,
    chooseBuildingEliminationEngagement,
    deferStalledBuildingTargets,
    getBuildingCapabilityProductionPlan,
    getBuildingCapabilityUnitMissionAction,
    getBuildingEliminationAssaultProductionAction,
    getBuildingEliminationGroundAssaultUnitName,
    getBuildingEliminationGroundAssaultStructureName,
    getBuildingTargetWeight,
    getAssignedBuildingEliminationMissionName,
    isPreemptibleBuildingEliminationMission,
    isTransferCertifiedBuildingEliminationMission,
    meetsBuildingEliminationActivationGate,
    meetsLowBuildingEliminationActivationGate,
    meetsObjectiveClearanceBuildingEliminationActivationGate,
    meetsObjectiveRaceBuildingEliminationActivationGate,
    meetsObjectiveRouteClearanceBuildingEliminationActivationGate,
    mergeCurrentAndRememberedBuildingTargets,
    prioritizeStalledBuildingTargets,
    rankBuildingTargets,
    rankSweepPoints,
    reconcileRememberedBuildingTargets,
    resolveBuildingEliminationOptions,
    selectAvailableCapabilityStructures,
    selectBuildingEliminationReadinessReserveCandidates,
    selectCommittedBuildingAttackers,
    selectCompatibleBuildingTargets,
    selectStagedBuildingEliminationAttackers,
    selectTransferCertifiedBuildingEliminationAttackers,
    shouldRunBuildingEliminationCapabilityProduction,
    shouldDirectAttackBuildingTarget,
    summarizeBuildingExecutionDistances,
    updateBuildingTargetProgress,
} from "@supalosa/chronodivide-bot/dist/bot/logic/mission/missions/buildingEliminationMission.js";

const target = (overrides: Partial<BuildingTargetDescriptor>): BuildingTargetDescriptor => ({
    id: 1,
    x: 10,
    y: 10,
    name: "GENERIC",
    maxHitPoints: 500,
    hitPoints: 500,
    constructionYard: false,
    weaponsFactory: false,
    barracks: false,
    refinery: false,
    power: false,
    defense: false,
    visible: true,
    ...overrides,
});

const ordinaryWeapon = (damage = 100, range = 5, rof = 30) => ({
    rules: {
        name: "ordinary",
        damage,
        burst: 1,
        rof,
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
    maxRange: range,
    cooldownTicks: 0,
});

const baseRules = (name: string, type: ObjectType, speed = 256) => ({
    name,
    type,
    armor: 8,
    speed,
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

const combatant = (
    id: number,
    x: number,
    y = 0,
    hitPoints = 500,
    damage = 100,
    range = 5,
    rof = 30,
) => ({
    id,
    name: `TANK${id}`,
    type: ObjectType.Vehicle,
    owner: id < 100 ? "candidate" : "enemy",
    rules: baseRules(`TANK${id}`, ObjectType.Vehicle),
    tile: { id: id * 10, rx: x, ry: y },
    foundation: { width: 1, height: 1 },
    hitPoints,
    maxHitPoints: hitPoints,
    primaryWeapon: ordinaryWeapon(damage, range, rof),
    secondaryWeapon: undefined,
    canMove: true,
    isIdle: true,
    attackState: AttackState.Idle,
    onBridge: false,
});

const buildingUnit = (id: number, x: number, hitPoints = 1_000) => ({
    id,
    name: `BUILDING${id}`,
    type: ObjectType.Building,
    owner: "enemy",
    rules: baseRules(`BUILDING${id}`, ObjectType.Building, 0),
    tile: { id: id * 10, rx: x, ry: 0 },
    foundation: { width: 2, height: 2 },
    hitPoints,
    maxHitPoints: hitPoints,
    canMove: false,
    isIdle: true,
    attackState: AttackState.Idle,
    onBridge: false,
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

    test("reinforcement priority attacks barracks and weapons factories before refineries", () => {
        const barracks = target({ id: 1, name: "GAPILE", barracks: true, x: 30 });
        const weapons = target({ id: 2, name: "GAWEAP", weaponsFactory: true, x: 20 });
        const refinery = target({ id: 3, name: "GAREFN", refinery: true, x: 1 });
        expect(rankBuildingTargets(
            [refinery, weapons, barracks],
            "reinforcement",
            [{ x: 0, y: 0 }],
        )).toEqual([barracks, weapons, refinery]);
        expect(getBuildingTargetWeight(barracks, "reinforcement")).toBeGreaterThan(
            getBuildingTargetWeight(refinery, "reinforcement"),
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

    test("capability checks use the same non-reserve force committed to closeout", () => {
        const eligible = [
            { id: 1, type: "vehicle", rules: {}, tile: { rx: 1, ry: 0 } },
            { id: 2, type: "vehicle", rules: {}, tile: { rx: 4, ry: 0 } },
            { id: 3, type: "vehicle", rules: {}, tile: { rx: 8, ry: 0 } },
        ] as any[];
        const committed = selectCommittedBuildingAttackers(eligible, { x: 0, y: 0 }, 1);
        expect(committed.map(({ id }) => id)).toEqual([3, 2]);
        expect(eligible.map(({ id }) => id)).toEqual([1, 2, 3]);
    });

    test("does not strand purpose-built aircraft in the home reserve", () => {
        const eligible = [
            { id: 1, type: "vehicle", rules: {}, tile: { rx: 8, ry: 0 } },
            { id: 2, type: "vehicle", rules: {}, tile: { rx: 4, ry: 0 } },
            { id: 3, type: ObjectType.Aircraft, rules: {}, tile: { rx: 1, ry: 0 } },
        ] as any[];
        const committed = selectCommittedBuildingAttackers(eligible, { x: 0, y: 0 }, 1);
        expect(committed.map(({ id }) => id)).toEqual([3, 1]);
    });

    test("compatible assignment never sends an attacker to an invalid target", () => {
        const attackers = [
            { id: 1, x: 0, y: 0, side: "land" },
            { id: 2, x: 9, y: 0, side: "water" },
            { id: 3, x: 5, y: 0, side: "none" },
        ];
        const targets = [
            { id: "land", x: 0, y: 1 },
            { id: "water", x: 10, y: 1 },
        ];
        const assignments = assignAttackersToCompatibleTargets(
            attackers,
            targets,
            (attacker, candidate) => attacker.side === candidate.id,
        );
        expect(assignments.map(({ attacker, target: assigned }) => [attacker.id, assigned.id])).toEqual([
            [1, "land"],
            [2, "water"],
        ]);
    });

    test("blocked high-priority structures do not prevent reachable closeout work", () => {
        const attackers = [{ id: 1 }, { id: 2 }];
        const targets = [{ id: "blocked" }, { id: "reachable" }, { id: "later" }];
        expect(selectCompatibleBuildingTargets(
            attackers,
            targets,
            2,
            (_attacker, candidate) => candidate.id !== "blocked",
        )).toEqual([{ id: "reachable" }, { id: "later" }]);
    });

    test("moves toward hidden known structures before issuing a direct attack", () => {
        expect(shouldDirectAttackBuildingTarget(true, false, true)).toBe(false);
        expect(shouldDirectAttackBuildingTarget(true, true, true)).toBe(true);
        expect(shouldDirectAttackBuildingTarget(false, true, true)).toBe(false);
        expect(shouldDirectAttackBuildingTarget(true, true, false)).toBe(false);
    });

    test("retains hidden remembered buildings when another structure is visible", () => {
        const remembered = [
            target({ id: 1, name: "OLD", visible: false }),
            target({ id: 2, name: "HIDDEN", x: 40, y: 40, visible: false }),
        ];
        const current = [target({ id: 1, name: "CURRENT", hitPoints: 200, visible: true })];
        expect(mergeCurrentAndRememberedBuildingTargets(current, remembered)).toEqual([
            current[0],
            remembered[1],
        ]);
    });

    test("classifies missing damage separately from missing firing access", () => {
        const attackers = [{ id: 10 }, { id: 11 }] as any[];
        const buildings = [{ id: 1 }, { id: 2 }, { id: 3 }] as any[];
        const gaps = classifyBuildingCapabilityGaps(
            attackers,
            buildings,
            new Set([3]),
            (attacker, building) => building.id !== 1 && !(attacker.id === 11 && building.id === 2),
            (_attacker, building) => building.id !== 2,
        );
        expect(gaps).toEqual({
            stalledBuildingIds: [3],
            incompatibleBuildingIds: [1],
            unreachableBuildingIds: [2],
        });
    });

    test("maps one coordinate-free capability request to side-appropriate finishers", () => {
        expect(getBuildingCapabilityProductionPlan(SideType.Nod, 4, 2, true)).toEqual({
            structures: ["NARADR", "NATECH", "NAYARD"],
            units: [
                { name: "ZEP", targetCount: 4 },
                { name: "DRED", targetCount: 2 },
            ],
        });
        expect(getBuildingCapabilityProductionPlan(SideType.GDI, 4, 2, false)).toEqual({
            structures: ["GAAIRC", "AMRADR"],
            units: [{ name: "JUMPJET", targetCount: 4 }],
        });
        expect(getBuildingCapabilityProductionPlan(SideType.GDI, 0, 2, true)).toEqual({
            structures: ["GAYARD", "GAAIRC", "AMRADR", "GATECH"],
            units: [{ name: "CARRIER", targetCount: 2 }],
        });
    });

    test("selects the country-available Allied air prerequisite", () => {
        const planned = ["GAAIRC", "AMRADR", "GATECH"];
        expect(
            selectAvailableCapabilityStructures(
                planned,
                new Set(["AMRADR", "GATECH"]),
                new Set(),
            ),
        ).toEqual(["AMRADR", "GATECH"]);
        expect(
            selectAvailableCapabilityStructures(
                planned,
                new Set(["GAAIRC", "GATECH"]),
                new Set(["GAAIRC"]),
            ),
        ).toEqual(["GATECH"]);
    });

    test("releases produced capability units before refreshing production requests", () => {
        expect(getBuildingCapabilityUnitMissionAction([41], { JUMPJET: 140 })).toEqual({
            type: "releaseUnits",
            unitIds: [41],
        });
        expect(getBuildingCapabilityUnitMissionAction([], { JUMPJET: 140 })).toEqual({
            type: "request",
            unitNameToPriority: { JUMPJET: 140 },
        });
        expect(getBuildingCapabilityUnitMissionAction([], {})).toEqual({ type: "noop" });
    });

    test("requests the side-generic main battle tank up to the frozen ceiling", () => {
        expect(getBuildingEliminationGroundAssaultUnitName(SideType.Nod)).toBe("HTNK");
        expect(getBuildingEliminationGroundAssaultUnitName(SideType.GDI)).toBe("MTNK");
        expect(getBuildingEliminationGroundAssaultStructureName(SideType.Nod)).toBe("NAWEAP");
        expect(getBuildingEliminationGroundAssaultStructureName(SideType.GDI)).toBe("GAWEAP");
        expect(getBuildingEliminationAssaultProductionAction([], "MTNK", 3, 4, 140)).toEqual({
            type: "request",
            unitNameToPriority: { MTNK: 140 },
        });
        expect(getBuildingEliminationAssaultProductionAction([], "HTNK", 4, 4, 140)).toEqual({
            type: "noop",
        });
        expect(getBuildingEliminationAssaultProductionAction([71], "HTNK", 1, 4, 140)).toEqual({
            type: "releaseUnits",
            unitIds: [71],
        });
    });

    test("keeps capability production active after the closeout gate has fired", () => {
        expect(shouldRunBuildingEliminationCapabilityProduction(false, false)).toBe(false);
        expect(shouldRunBuildingEliminationCapabilityProduction(false, true)).toBe(true);
        expect(shouldRunBuildingEliminationCapabilityProduction(true, false)).toBe(true);
    });

    test("progress tracking emits damage and becomes stalled only at the frozen interval", () => {
        const initial = updateBuildingTargetProgress(undefined, 1000, 9000, 600);
        expect(initial.damage).toBe(0);
        expect(initial.state.stalled).toBe(false);
        const damaged = updateBuildingTargetProgress(initial.state, 800, 9300, 600);
        expect(damaged).toMatchObject({ previousHitPoints: 1000, damage: 200, becameStalled: false });
        expect(damaged.state.lastDamageTick).toBe(9300);
        const waiting = updateBuildingTargetProgress(damaged.state, 800, 9899, 600);
        expect(waiting.state.stalled).toBe(false);
        const stalled = updateBuildingTargetProgress(waiting.state, 800, 9900, 600);
        expect(stalled.state.stalled).toBe(true);
        expect(stalled.becameStalled).toBe(true);
        const stillStalled = updateBuildingTargetProgress(stalled.state, 800, 10000, 600);
        expect(stillStalled.becameStalled).toBe(false);
    });

    test("stall reassignment brings a stalled surviving structure to the front", () => {
        const progressing = target({ id: 1, name: "GAPOWR" });
        const stalled = target({ id: 2, name: "GACNST" });
        const progress = new Map([
            [1, { hitPoints: 200, lastObservedTick: 10_000, lastDamageTick: 9_900, stalled: false }],
            [2, { hitPoints: 400, lastObservedTick: 10_000, lastDamageTick: 9_000, stalled: true }],
        ]);
        expect(prioritizeStalledBuildingTargets([progressing, stalled], progress)).toEqual([
            stalled,
            progressing,
        ]);
    });

    test("progress-certified retargeting defers a stalled committed structure", () => {
        const stalled = target({ id: 1, name: "GAREFN" });
        const untried = target({ id: 2, name: "GAPOWR" });
        const progress = new Map([
            [1, { hitPoints: 1_000, lastObservedTick: 4_000, lastDamageTick: 3_400, stalled: true }],
            [2, { hitPoints: 750, lastObservedTick: 4_000, lastDamageTick: 4_000, stalled: false }],
        ]);
        expect(deferStalledBuildingTargets([stalled, untried], progress)).toEqual([untried, stalled]);
        expect(deferStalledBuildingTargets([stalled], progress)).toEqual([stalled]);
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

    test("transfer certification matches the units the takeover can command", () => {
        const missionByUnit = new Map<number, string | null>([
            [1, null],
            [2, "buildingEliminationReadinessReserve"],
            [3, "attack_12"],
            [4, "retreat-from-attack_12"],
            [5, "allInAttack"],
            [6, "defence_12"],
            [7, "scout_12"],
        ]);
        const eligible = [...missionByUnit.keys()].map((id) => combatant(id, id)) as any[];
        expect(selectTransferCertifiedBuildingEliminationAttackers(
            eligible,
            (id) => missionByUnit.get(id) ?? null,
        ).map(({ id }) => id)).toEqual([1, 2, 3, 4, 5]);
        expect(isTransferCertifiedBuildingEliminationMission("defence_12")).toBe(false);
        expect(isTransferCertifiedBuildingEliminationMission("scout_12")).toBe(false);
    });

    test("staged readiness counts only units already owned by assembly", () => {
        const missionByUnit = new Map<number, string | null>([
            [1, null],
            [2, "buildingEliminationReadinessReserve"],
            [3, "attack_12"],
            [4, "buildingEliminationReadinessReserve"],
        ]);
        const eligible = [...missionByUnit.keys()].map((id) => combatant(id, id)) as any[];
        expect(selectStagedBuildingEliminationAttackers(
            eligible,
            (id) => missionByUnit.get(id) ?? null,
        ).map(({ id }) => id)).toEqual([2, 4]);
        expect(selectBuildingEliminationReadinessReserveCandidates(
            eligible,
            new Set(),
        ).map(({ id }) => id)).toEqual([1, 2, 3, 4]);
    });

    test("launch handoff partitions staged identifiers without hiding live ownership loss", () => {
        expect(classifyBuildingEliminationLaunchHandoff(
            [4, 3, 2, 1, 4],
            [1, 3, 9],
            (id) => id !== 2,
        )).toEqual({
            expectedStagedUnitIds: [1, 2, 3, 4],
            assignedExpectedUnitIds: [1, 3],
            destroyedExpectedUnitIds: [2],
            aliveUnassignedExpectedUnitIds: [4],
        });
    });

    test("mission ownership supports native and pinned legacy controllers", () => {
        const native = {
            getAssignedMissionName: (id: number) => id === 1 ? "attack_12" : null,
            getMissions: () => [],
        };
        expect(getAssignedBuildingEliminationMissionName(native, 1)).toBe("attack_12");
        expect(getAssignedBuildingEliminationMissionName(native, 2)).toBeNull();

        const mission = (name: string, unitIds: number[]) => ({
            getUniqueName: () => name,
            getUnitIds: () => unitIds,
        });
        const legacy = { getMissions: () => [mission("attack_12", [1, 2])] };
        expect(getAssignedBuildingEliminationMissionName(legacy, 1)).toBe("attack_12");
        expect(getAssignedBuildingEliminationMissionName(legacy, 3)).toBeNull();
        expect(() => getAssignedBuildingEliminationMissionName({
            getMissions: () => [mission("attack_12", [1]), mission("defence_12", [1])],
        }, 1)).toThrow(/multiple missions/);
    });

    test("adaptive closeout is gated by the same reserve and advantage conditions", () => {
        const gate = {
            minCombatants: 8,
            reserveCombatants: 2,
            maxEnemyCombatants: 4,
            combatantAdvantage: 2,
        };
        expect(meetsBuildingEliminationActivationGate(10, 4, gate)).toBe(true);
        expect(meetsBuildingEliminationActivationGate(9, 4, gate)).toBe(false);
        expect(meetsBuildingEliminationActivationGate(12, 5, gate)).toBe(false);
    });

    test("low-building closeout ignores the enemy army count but keeps the building and reserve gates", () => {
        const gate = {
            minCombatants: 1,
            reserveCombatants: 0,
            maxEnemyBuildings: 5,
        };
        expect(meetsLowBuildingEliminationActivationGate(1, 5, gate)).toBe(true);
        expect(meetsLowBuildingEliminationActivationGate(1, 1, gate)).toBe(true);
        expect(meetsLowBuildingEliminationActivationGate(0, 1, gate)).toBe(false);
        expect(meetsLowBuildingEliminationActivationGate(100, 6, gate)).toBe(false);
        expect(meetsLowBuildingEliminationActivationGate(100, 0, gate)).toBe(false);
    });

    test("objective-race takeover ignores 100 armed units that are off the building route", () => {
        const attackers = [combatant(1, 0, 0, 500, 100, 5, 10)] as any[];
        const building = buildingUnit(200, 20, 1_000) as any;
        const offRouteForces = Array.from({ length: 100 }, (_, index) =>
            combatant(100 + index, 10 + index % 4, 30 + Math.floor(index / 4), 500, 100, 5, 10),
        ) as any[];
        expect(meetsObjectiveRaceBuildingEliminationActivationGate(
            attackers,
            building,
            offRouteForces,
            8,
        )).toBe(true);
    });

    test("objective-race takeover waits when the same armed force lethally intercepts the route", () => {
        const attackers = [combatant(1, 0, 0, 100, 10, 1, 30)] as any[];
        const building = buildingUnit(200, 20, 1_000) as any;
        const routeForces = Array.from({ length: 100 }, (_, index) =>
            combatant(100 + index, 5 + index % 4, index % 3, 500, 500, 5, 1),
        ) as any[];
        expect(meetsObjectiveRaceBuildingEliminationActivationGate(
            attackers,
            building,
            routeForces,
            8,
        )).toBe(false);
    });

    test("objective-clearance takeover still rejects a suicidal one-unit blocker attack", () => {
        expect(meetsObjectiveClearanceBuildingEliminationActivationGate(
            [combatant(1, 0, 0, 100, 10, 1, 1)] as any[],
            buildingUnit(200, 20, 1_000) as any,
            [combatant(100, 5, 0, 500, 500, 5, 1)] as any[],
            8,
        )).toBe(false);
    });

    test("objective-clearance takeover launches a reserve that can remove the blocker before destruction", () => {
        const attackers = Array.from({ length: 25 }, (_, index) =>
            combatant(index + 1, 0, index % 2, 500, 100, 1, 30),
        ) as any[];
        const threats = Array.from({ length: 20 }, (_, index) =>
            combatant(100 + index, 5 + index % 3, index % 2, 500, 100, 5, 30),
        ) as any[];
        const fortifiedBuilding = buildingUnit(200, 20, 100_000) as any;
        const decision = chooseBuildingEliminationEngagement(
            attackers,
            fortifiedBuilding,
            threats,
            8,
        );
        expect(decision.blocker).not.toBeNull();
        expect(decision.estimatedBlockerRemovalTicks).toBeLessThanOrEqual(
            decision.estimatedForceSurvivalTicks,
        );
        expect(meetsObjectiveClearanceBuildingEliminationActivationGate(
            attackers,
            fortifiedBuilding,
            threats,
            8,
        )).toBe(true);
    });

    test("route-clearance takeover rejects a force that can remove only the first blocker", () => {
        const attackers = Array.from({ length: 25 }, (_, index) =>
            combatant(index + 1, 0, index % 2, 500, 100, 1, 30),
        ) as any[];
        const threats = Array.from({ length: 100 }, (_, index) =>
            combatant(100 + index, 5 + index % 3, index % 2, 500, 100, 5, 30),
        ) as any[];
        const fortifiedBuilding = buildingUnit(300, 20, 100_000) as any;
        const decision = chooseBuildingEliminationEngagement(attackers, fortifiedBuilding, threats, 8);
        expect(decision.estimatedBlockerRemovalTicks).toBeLessThanOrEqual(
            decision.estimatedForceSurvivalTicks,
        );
        expect(decision.estimatedRouteClearanceTicks).toBeGreaterThan(
            decision.estimatedForceSurvivalTicks,
        );
        expect(meetsObjectiveRouteClearanceBuildingEliminationActivationGate(
            attackers,
            fortifiedBuilding,
            threats,
            8,
        )).toBe(false);
    });

    test("route-clearance takeover launches when the full threat set can be removed before destruction", () => {
        const attackers = Array.from({ length: 25 }, (_, index) =>
            combatant(index + 1, 0, index % 2, 500, 100, 1, 30),
        ) as any[];
        const threats = Array.from({ length: 5 }, (_, index) =>
            combatant(100 + index, 5 + index % 3, index % 2, 500, 100, 5, 30),
        ) as any[];
        const fortifiedBuilding = buildingUnit(300, 20, 100_000) as any;
        const decision = chooseBuildingEliminationEngagement(attackers, fortifiedBuilding, threats, 8);
        expect(decision.blocker).not.toBeNull();
        expect(decision.estimatedRouteClearanceTicks).toBeLessThanOrEqual(
            decision.estimatedForceSurvivalTicks,
        );
        expect(meetsObjectiveRouteClearanceBuildingEliminationActivationGate(
            attackers,
            fortifiedBuilding,
            threats,
            8,
        )).toBe(true);
    });

    test("objective-race takeover attacks immediately when the building is already in range", () => {
        expect(meetsObjectiveRaceBuildingEliminationActivationGate(
            [combatant(1, 8, 0, 100, 10, 5, 30)] as any[],
            buildingUnit(200, 10, 1_000) as any,
            [combatant(100, 8, 0, 500, 500, 5, 1)] as any[],
            8,
        )).toBe(true);
    });

    test("readiness reserve excludes the frozen vanguard and retains later attackers", () => {
        const vanguard = combatant(1, 0) as any;
        const firstReinforcement = combatant(2, 0) as any;
        const secondReinforcement = combatant(3, 0) as any;
        expect(selectBuildingEliminationReadinessReserveCandidates(
            [vanguard, firstReinforcement, secondReinforcement],
            new Set([vanguard.id]),
        ).map(({ id }) => id)).toEqual([firstReinforcement.id, secondReinforcement.id]);
        expect(selectBuildingEliminationReadinessReserveCandidates(
            [vanguard, firstReinforcement],
            new Set([vanguard.id]),
        ).map(({ id }) => id)).toEqual([firstReinforcement.id]);
    });

    test("finishes an in-range building instead of being distracted by enemy forces", () => {
        const attackers = [combatant(1, 8, 0, 500, 100, 5, 10)] as any[];
        const building = buildingUnit(200, 10, 200) as any;
        const threats = Array.from({ length: 20 }, (_, index) =>
            combatant(100 + index, 7, index % 2, 500, 100, 5, 10),
        ) as any[];
        expect(chooseBuildingEliminationEngagement(attackers, building, threats, 8)).toMatchObject({
            blocker: null,
            reason: "building_in_range",
        });
    });

    test("ignores armed forces that cannot intersect the route to the committed building", () => {
        const decision = chooseBuildingEliminationEngagement(
            [combatant(1, 0)] as any[],
            buildingUnit(200, 20) as any,
            [combatant(100, 10, 30)] as any[],
            8,
        );
        expect(decision).toMatchObject({ blocker: null, reason: "no_route_threat", routeThreatCount: 0 });
    });

    test("clears one removable route blocker when interception beats building completion", () => {
        const blocker = combatant(100, 5, 0, 100, 500, 5, 1) as any;
        const decision = chooseBuildingEliminationEngagement(
            [combatant(1, 0, 0, 100, 10, 1, 1)] as any[],
            buildingUnit(200, 20, 1_000) as any,
            [blocker],
            8,
        );
        expect(decision).toMatchObject({ blocker, reason: "route_interception_wins", routeThreatCount: 1 });
        expect(decision.estimatedBuildingCompletionTicks).toBeGreaterThan(
            decision.estimatedForceSurvivalTicks,
        );
    });

    test("preserves a preferred blocker while it remains a certified route threat", () => {
        const first = combatant(100, 5, 0, 100, 500, 5, 1) as any;
        const preferred = combatant(101, 6, 0, 100, 500, 5, 1) as any;
        const decision = chooseBuildingEliminationEngagement(
            [combatant(1, 0, 0, 100, 10, 1, 1)] as any[],
            buildingUnit(200, 20, 1_000) as any,
            [first, preferred],
            8,
            preferred.id,
        );
        expect(decision).toMatchObject({
            blocker: preferred,
            reason: "route_interception_wins",
            routeThreatCount: 2,
        });
        expect(chooseBuildingEliminationEngagement(
            [combatant(1, 0, 0, 100, 10, 1, 1)] as any[],
            buildingUnit(200, 20, 1_000) as any,
            [first],
            8,
            preferred.id,
        )).toMatchObject({ blocker: first, reason: "route_interception_wins", routeThreatCount: 1 });
    });

    test("advances toward the building until a predicted blocker reaches contact", () => {
        const blocker = combatant(100, 5, 0, 100, 500, 1, 1) as any;
        const predicted = chooseBuildingEliminationEngagement(
            [combatant(1, 0, 0, 100, 10, 1, 1)] as any[],
            buildingUnit(200, 20, 1_000) as any,
            [blocker],
            8,
        );
        expect(predicted).toMatchObject({ blocker, reason: "route_interception_wins" });
        expect(predicted.earliestRouteThreatInterceptTicks).toBeGreaterThan(0);
        expect(applyContactTriggeredBuildingAdvance(predicted, false)).toMatchObject({
            blocker: null,
            reason: "objective_advance",
        });
        expect(applyContactTriggeredBuildingAdvance(predicted, true)).toBe(predicted);

        const contact = {
            ...predicted,
            earliestRouteThreatInterceptTicks: 0,
        };
        expect(applyContactTriggeredBuildingAdvance(contact, false)).toBe(contact);
    });

    test("races a finishable building when completion precedes force destruction", () => {
        const decision = chooseBuildingEliminationEngagement(
            [combatant(1, 0, 0, 500, 100, 1, 1)] as any[],
            buildingUnit(200, 10, 10) as any,
            [combatant(100, 6, 0, 500, 1, 1, 30)] as any[],
            8,
        );
        expect(decision).toMatchObject({ blocker: null, reason: "building_completion_race", routeThreatCount: 1 });
        expect(decision.estimatedBuildingCompletionTicks).toBeLessThanOrEqual(
            decision.estimatedForceSurvivalTicks,
        );
    });

    test("keeps at least half of a threatened force on the building objective", () => {
        const attackers = Array.from({ length: 6 }, (_, index) => combatant(index + 1, 0)) as any[];
        const allocation = allocateBuildingEliminationEngagement(
            attackers,
            buildingUnit(200, 20) as any,
            combatant(100, 5) as any,
            "boundedScreen",
        );
        expect(allocation.buildingAttackers).toHaveLength(3);
        expect(allocation.blockerAttackers).toHaveLength(3);
        expect(new Set([
            ...allocation.buildingAttackers.map(({ id }) => id),
            ...allocation.blockerAttackers.map(({ id }) => id),
        ])).toEqual(new Set(attackers.map(({ id }) => id)));
    });

    test("single-screen allocation sends only one compatible attacker to the blocker", () => {
        const attackers = Array.from({ length: 6 }, (_, index) => combatant(index + 1, 0)) as any[];
        const allocation = allocateBuildingEliminationEngagement(
            attackers,
            buildingUnit(200, 20) as any,
            combatant(100, 5) as any,
            "singleScreen",
        );
        expect(allocation.buildingAttackers).toHaveLength(5);
        expect(allocation.blockerAttackers).toHaveLength(1);
    });

    test("summarizes execution distance to the actual building firing perimeter", () => {
        expect(summarizeBuildingExecutionDistances(
            [combatant(1, 0), combatant(2, 10), combatant(3, 20)] as any[],
            buildingUnit(200, 20) as any,
        )).toEqual({ minimum: 0, median: 5, maximum: 15, inRangeCount: 1 });
        expect(summarizeBuildingExecutionDistances([], buildingUnit(200, 20) as any)).toEqual({
            minimum: null,
            median: null,
            maximum: null,
            inRangeCount: 0,
        });
    });

    test("never diverts an in-range building attacker to the blocker screen", () => {
        const inRange = [combatant(1, 19), combatant(2, 19)];
        const allocation = allocateBuildingEliminationEngagement(
            [...inRange, combatant(3, 0), combatant(4, 0)] as any[],
            buildingUnit(200, 20) as any,
            combatant(100, 5) as any,
            "boundedScreen",
        );
        expect(allocation.inRangeBuildingAttackerCount).toBe(2);
        expect(allocation.buildingAttackers.map(({ id }) => id)).toEqual(expect.arrayContaining([1, 2]));
        expect(allocation.blockerAttackers.map(({ id }) => id)).not.toContain(1);
        expect(allocation.blockerAttackers.map(({ id }) => id)).not.toContain(2);
    });

    test("a single attacker continues toward the building despite a blocker", () => {
        const allocation = allocateBuildingEliminationEngagement(
            [combatant(1, 0)] as any[],
            buildingUnit(200, 20) as any,
            combatant(100, 5) as any,
            "boundedScreen",
        );
        expect(allocation.buildingAttackers.map(({ id }) => id)).toEqual([1]);
        expect(allocation.blockerAttackers).toEqual([]);
    });

    test("does not assign an attacker that cannot damage the blocker to screening", () => {
        const blocker = combatant(100, 5) as any;
        blocker.rules = { ...blocker.rules, armor: 9 };
        const attackers = [combatant(1, 0), combatant(2, 0)] as any[];
        const allocation = allocateBuildingEliminationEngagement(
            attackers,
            buildingUnit(200, 20) as any,
            blocker,
            "boundedScreen",
        );
        expect(allocation.buildingAttackers).toEqual(attackers);
        expect(allocation.blockerAttackers).toEqual([]);
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
            "capabilityAwareAttackers",
            "reachabilityAwareTargets",
            "stallTicks",
            "reassignStalledTargets",
            "retargetStalledBuildings",
            "adaptiveAirTargetCount",
            "adaptiveNavalTargetCount",
            "adaptiveGroundAssaultTargetCount",
            "adaptiveGroundAssaultInfrastructure",
            "adaptiveProductionPriority",
            "adaptiveTechPriority",
            "activationMode",
            "maxEnemyBuildings",
            "engagementMode",
            "engagementAllocationMode",
            "commitRouteBlocker",
            "routeCorridorRadius",
            "readinessReserve",
            "readinessReserveScope",
            "contactOnlyBlockerClearance",
        ]);
    });

    test("configuration rejects impossible or non-integral search values", () => {
        expect(() => resolveBuildingEliminationOptions({ orderIntervalTicks: 0 })).toThrow(
            "orderIntervalTicks",
        );
        expect(() => resolveBuildingEliminationOptions({ maxTargetGroups: 1.5 })).toThrow("maxTargetGroups");
        expect(() => resolveBuildingEliminationOptions({ minTick: -1 })).toThrow("minTick");
        expect(() => resolveBuildingEliminationOptions({ stallTicks: 0 })).toThrow("stallTicks");
        expect(() => resolveBuildingEliminationOptions({ maxEnemyBuildings: 0 })).toThrow("maxEnemyBuildings");
        expect(() => resolveBuildingEliminationOptions({ routeCorridorRadius: 0 })).toThrow("routeCorridorRadius");
        expect(() => resolveBuildingEliminationOptions({ activationMode: "unknown" as any })).toThrow(
            "activation mode",
        );
        expect(() => resolveBuildingEliminationOptions({ engagementMode: "unknown" as any })).toThrow(
            "engagement mode",
        );
        expect(() => resolveBuildingEliminationOptions({ engagementAllocationMode: "unknown" as any })).toThrow(
            "allocation mode",
        );
        expect(() => resolveBuildingEliminationOptions({ readinessReserve: "yes" as any })).toThrow(
            "readiness reserve",
        );
        expect(() => resolveBuildingEliminationOptions({ readinessReserveScope: "unknown" as any })).toThrow(
            "readiness reserve scope",
        );
        expect(() => resolveBuildingEliminationOptions({ contactOnlyBlockerClearance: "yes" as any })).toThrow(
            "contact-only blocker clearance",
        );
    });
});
