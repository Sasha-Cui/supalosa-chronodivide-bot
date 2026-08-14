import {
    AttackState,
    FactoryType,
    GameApi,
    ObjectType,
    OrderType,
    SpeedType,
    UnitData,
    WeaponData,
} from "@chronodivide/game-api";
import { Countries } from "@supalosa/chronodivide-bot/dist/bot/logic/common/utils.js";
import { BaselineFactory, InspectableBaselineBot } from "../benchmark/baselineLoader.js";
import { publicEnemyUnits } from "./terminalRacePublicState.js";
import {
    PersistentObjectiveCompletionPolicy,
    validatePersistentObjectiveCompletionPolicy,
} from "./persistentObjectiveCompletionPolicy.js";

type Point = { x: number; y: number };
type Logger = (message: string, sayInGame?: boolean) => void;

type StrategyContext = {
    game: GameApi;
    player: {
        name: string;
        actions: NonNullable<InspectableBaselineBot["lastPlayerActions"]>;
    };
};

type StrategyLike = {
    onAiUpdate(context: StrategyContext, missionController: unknown, logger: Logger): unknown;
};

type MissionLike = {
    getUnitIds(): number[];
    getUniqueName(): string;
    isUnitsLocked(): boolean;
    getPriority(): number;
};

type MissionControllerLike = {
    getMissions(): MissionLike[];
};

export type ObjectiveMissionAssignment = {
    missionName: string;
    locked: boolean;
    priority: number;
};

export type ObjectiveUnitDiagnostic = {
    id: number;
    rulesName: string;
    compatible: boolean;
    rejectionReason: string | null;
    currentAction: "idle" | "moving" | "attacking" | "other";
    missionName: string | null;
    missionLocked: boolean | null;
    hasOrdinaryCompatibleWeapon: boolean;
    hasSpecialSecondaryMechanic: boolean;
    reachable: boolean;
    selected: boolean;
};

export type PersistentObjectiveCompletionTelemetry = {
    schemaVersion: 1;
    event: "objective_completion_decision";
    informationInterface: "public_complete_state";
    tick: number;
    phase: "inactive" | "building_strike" | "blocker_clear" | "predecessor_fallback";
    reason: string;
    exactEnemyBuildingCount: number;
    ownBuildingCount: number;
    terminal: boolean;
    targetId: number | null;
    targetRulesName: string | null;
    targetArmor: string;
    targetHitPoints: number | null;
    blockerId: number | null;
    selectedAttackerIds: number[];
    selectedAttackerRulesNames: string[];
    buildingDamageSincePreviousDecision: number;
    blockerDamageSincePreviousDecision: number;
    routeProgressSincePreviousDecision: number;
    homeThreatened: boolean;
    issuedOrder: "attack_building" | "attack_blocker" | "none";
    unitDiagnostics: ObjectiveUnitDiagnostic[];
};

type TelemetrySink = (event: PersistentObjectiveCompletionTelemetry) => void;

type Compatibility = {
    compatible: boolean;
    reason: string | null;
    hasOrdinaryCompatibleWeapon: boolean;
    hasSpecialSecondaryMechanic: boolean;
    reachable: boolean;
    maximumRange: number;
    approximateDamagePerTick: number;
};

const DOGS = new Set(["DOG", "ADOG"]);

const point = (unit: UnitData): Point => ({ x: unit.tile.rx, y: unit.tile.ry });
const distance = (left: Point, right: Point): number => Math.hypot(left.x - right.x, left.y - right.y);

const distanceToSegment = (candidate: Point, start: Point, end: Point): number => {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const lengthSquared = dx * dx + dy * dy;
    if (lengthSquared === 0) return distance(candidate, start);
    const projection = Math.max(0, Math.min(1,
        ((candidate.x - start.x) * dx + (candidate.y - start.y) * dy) / lengthSquared,
    ));
    return distance(candidate, {
        x: start.x + projection * dx,
        y: start.y + projection * dy,
    });
};

const unitAction = (unit: UnitData): ObjectiveUnitDiagnostic["currentAction"] => {
    if (unit.attackState !== undefined && unit.attackState !== AttackState.Idle) return "attacking";
    if (unit.isIdle === true) return "idle";
    if (unit.canMove !== false) return "moving";
    return "other";
};

const weaponIsSpecial = (weapon: WeaponData | undefined): boolean => !!weapon && (
    weapon.rules.areaFire || weapon.rules.spawner || weapon.rules.limboLaunch ||
    weapon.rules.suicide || weapon.rules.fireOnce || weapon.warheadRules.cellSpread > 0 ||
    weapon.warheadRules.temporal || weapon.warheadRules.mindControl ||
    weapon.warheadRules.ivanBomb || weapon.projectileRules.arcing
);

export const weaponCanDamageObjectiveBuilding = (
    weapon: WeaponData | undefined,
    target: UnitData,
): boolean => {
    if (!weapon || !weapon.projectileRules.isAntiGround || weapon.rules.neverUse) return false;
    const verses = weapon.warheadRules.verses.get(target.rules.armor) ?? 0;
    return weapon.rules.damage > 0 && weapon.rules.burst > 0 && verses > 0;
};

const weaponApproximateDamagePerTick = (weapon: WeaponData, target: UnitData): number => {
    const verses = weapon.warheadRules.verses.get(target.rules.armor) ?? 0;
    return weapon.rules.damage * Math.max(1, weapon.rules.burst) * verses /
        Math.max(1, weapon.rules.rof);
};

const foundationBounds = (target: UnitData) => ({
    left: target.tile.rx,
    top: target.tile.ry,
    right: target.tile.rx + Math.max(1, target.foundation.width) - 1,
    bottom: target.tile.ry + Math.max(1, target.foundation.height) - 1,
});

const distanceToFoundation = (candidate: Point, target: UnitData): number => {
    const { left, top, right, bottom } = foundationBounds(target);
    const dx = candidate.x < left ? left - candidate.x : candidate.x > right ? candidate.x - right : 0;
    const dy = candidate.y < top ? top - candidate.y : candidate.y > bottom ? candidate.y - bottom : 0;
    return Math.hypot(dx, dy);
};

export const hasReachableObjectiveFiringPerimeter = (
    game: GameApi,
    unit: UnitData,
    target: UnitData,
    range: number,
): boolean => {
    const speedType = unit.rules.speedType ??
        (unit.type === ObjectType.Infantry ? SpeedType.Foot : null);
    if (speedType === SpeedType.Winged) return true;
    if (speedType === null || range < 0) return false;
    const subCell = unit.type === ObjectType.Infantry;
    const padding = Math.max(1, Math.ceil(range));
    const { left, top, right, bottom } = foundationBounds(target);
    const reachability = game.map.getReachabilityMap(speedType, subCell);
    return game.map.getTilesInRect({
        x: left - padding,
        y: top - padding,
        width: right - left + 1 + 2 * padding,
        height: bottom - top + 1 + 2 * padding,
    }).some((tile) =>
        distanceToFoundation({ x: tile.rx, y: tile.ry }, target) <= range &&
        game.map.isPassableTile(tile, speedType, !!tile.onBridgeLandType, subCell) &&
        reachability.isReachable(
            { tile: unit.tile, onBridge: unit.onBridge ?? false },
            { tile, onBridge: !!tile.onBridgeLandType },
        ),
    );
};

export const objectiveUnitCompatibility = (
    game: GameApi,
    unit: UnitData,
    target: UnitData,
): Compatibility => {
    const weapons = [unit.primaryWeapon, unit.secondaryWeapon];
    const compatibleWeapons = weapons.filter((weapon): weapon is WeaponData =>
        weaponCanDamageObjectiveBuilding(weapon, target),
    );
    const hasOrdinaryCompatibleWeapon = compatibleWeapons.some((weapon) => !weaponIsSpecial(weapon));
    const hasSpecialSecondaryMechanic = weaponIsSpecial(unit.secondaryWeapon) ||
        !!unit.rules.deployFire || !!unit.rules.c4 || !!unit.rules.ivan ||
        !!unit.rules.spawns || !!unit.rules.teleporter;
    const base = {
        hasOrdinaryCompatibleWeapon,
        hasSpecialSecondaryMechanic,
        maximumRange: compatibleWeapons.reduce((maximum, weapon) => Math.max(maximum, weapon.maxRange), 0),
        approximateDamagePerTick: compatibleWeapons.reduce(
            (sum, weapon) => sum + weaponApproximateDamagePerTick(weapon, target),
            0,
        ),
    };
    if (!unit.rules.isSelectableCombatant || unit.type === ObjectType.Building) {
        return { ...base, compatible: false, reason: "not_mobile_combatant", reachable: false };
    }
    if (unit.rules.harvester || DOGS.has(unit.rules.name)) {
        return { ...base, compatible: false, reason: "reserved_non_assault_role", reachable: false };
    }
    if (unit.canMove === false) {
        return { ...base, compatible: false, reason: "cannot_move", reachable: false };
    }
    if (unit.rules.ammo > 0 && (unit.ammo ?? 0) <= 0) {
        return { ...base, compatible: false, reason: "no_ammunition", reachable: false };
    }
    if (compatibleWeapons.length === 0) {
        return { ...base, compatible: false, reason: "no_positive_anti_building_weapon", reachable: false };
    }
    const reachable = hasReachableObjectiveFiringPerimeter(game, unit, target, base.maximumRange);
    return {
        ...base,
        compatible: reachable,
        reason: reachable ? null : "unreachable_firing_perimeter",
        reachable,
    };
};

export const objectiveMissionAssignments = (missionController: unknown): Map<number, ObjectiveMissionAssignment> => {
    const controller = missionController as Partial<MissionControllerLike> | null;
    if (!controller || typeof controller.getMissions !== "function") return new Map();
    const assignments = new Map<number, ObjectiveMissionAssignment>();
    for (const mission of controller.getMissions()) {
        if (
            !mission || typeof mission.getUnitIds !== "function" ||
            typeof mission.getUniqueName !== "function" ||
            typeof mission.isUnitsLocked !== "function" ||
            typeof mission.getPriority !== "function"
        ) continue;
        const assignment = {
            missionName: mission.getUniqueName(),
            locked: mission.isUnitsLocked(),
            priority: mission.getPriority(),
        };
        for (const id of mission.getUnitIds()) assignments.set(id, assignment);
    }
    return assignments;
};

const isLeaseSourceEligible = (
    unit: UnitData,
    assignment: ObjectiveMissionAssignment | undefined,
    policy: PersistentObjectiveCompletionPolicy,
): boolean => {
    if (assignment?.locked) return false;
    if (policy.leaseSource === "unassigned_idle") return !assignment && unit.isIdle === true;
    if (policy.leaseSource === "unassigned_available") return !assignment;
    return !assignment || !assignment.locked;
};

const centroid = (units: readonly UnitData[]): Point | null => units.length === 0 ? null : ({
    x: units.reduce((sum, unit) => sum + unit.tile.rx, 0) / units.length,
    y: units.reduce((sum, unit) => sum + unit.tile.ry, 0) / units.length,
});

const targetArmorName = (target: UnitData | null): string =>
    target ? String(target.rules.armor) : "none";

const enemyBuildings = (game: GameApi, playerName: string): UnitData[] =>
    publicEnemyUnits(game, playerName, (unit) => unit.type === ObjectType.Building)
        .sort((left, right) => left.id - right.id);

const enemyForces = (game: GameApi, playerName: string): UnitData[] =>
    publicEnemyUnits(game, playerName, (unit) =>
        unit.type !== ObjectType.Building && !!unit.rules.isSelectableCombatant,
    ).sort((left, right) => left.id - right.id);

const selfUnits = (game: GameApi, playerName: string): UnitData[] => game
    .getVisibleUnits(playerName, "self")
    .map((id) => game.getUnitData(id))
    .filter((unit): unit is UnitData => !!unit);

const targetOpportunity = (game: GameApi, units: readonly UnitData[], target: UnitData) => {
    const compatible = units.flatMap((unit) => {
        const compatibility = objectiveUnitCompatibility(game, unit, target);
        return compatibility.compatible ? [{ unit, compatibility }] : [];
    });
    const damagePerTick = compatible.reduce(
        (sum, entry) => sum + entry.compatibility.approximateDamagePerTick,
        0,
    );
    const travel = compatible.length === 0 ? Number.POSITIVE_INFINITY : Math.min(
        ...compatible.map(({ unit }) => distanceToFoundation(point(unit), target)),
    );
    const completion = damagePerTick <= 0
        ? Number.POSITIVE_INFINITY
        : travel * 15 + target.hitPoints / damagePerTick;
    return { target, compatible, completion };
};

const routeBlockers = (
    forces: readonly UnitData[],
    attackers: readonly UnitData[],
    target: UnitData,
    corridorRadius: number,
): UnitData[] => {
    const start = centroid(attackers);
    if (!start) return [];
    const end = point(target);
    const routeLength = distance(start, end);
    return forces.filter((force) =>
        distanceToSegment(point(force), start, end) <= corridorRadius &&
        distance(start, point(force)) <= routeLength + corridorRadius,
    ).sort((left, right) =>
        distance(start, point(left)) - distance(start, point(right)) || left.id - right.id,
    );
};

export class PersistentObjectiveCompletionStrategy implements StrategyLike {
    private committedTargetId: number | null = null;
    private committedTargetHitPoints: number | null = null;
    private committedBlockerId: number | null = null;
    private committedBlockerHitPoints: number | null = null;
    private leasedIds = new Set<number>();
    private leaseStartedTick = 0;
    private lastBuildingDamageTick = 0;
    private lastBlockerDamageTick = 0;
    private lastRouteProgressTick = 0;
    private bestRouteDistance = Number.POSITIVE_INFINITY;
    private fallbackUntilTick = 0;
    private lastOrderTick = Number.NEGATIVE_INFINITY;
    private lastTelemetrySignature = "";
    private lastTelemetryTick = Number.NEGATIVE_INFINITY;

    constructor(
        private inner: StrategyLike,
        private readonly country: Countries,
        private readonly policy: PersistentObjectiveCompletionPolicy,
        private readonly telemetry: TelemetrySink,
    ) {}

    onAiUpdate(context: StrategyContext, missionController: unknown, logger: Logger): StrategyLike {
        const next = this.inner.onAiUpdate(context, missionController, logger);
        if (next && typeof (next as StrategyLike).onAiUpdate === "function") this.inner = next as StrategyLike;
        this.update(context, missionController);
        return this;
    }

    private update(context: StrategyContext, missionController: unknown): void {
        const { game, player } = context;
        const tick = game.getCurrentTick();
        this.telemetryGame = game;
        if (tick < this.lastOrderTick + this.policy.orderIntervalTicks) return;
        this.lastOrderTick = tick;

        const buildings = enemyBuildings(game, player.name);
        const mine = selfUnits(game, player.name);
        const ownBuildings = mine.filter((unit) => unit.type === ObjectType.Building);
        const forces = enemyForces(game, player.name);
        const terminal = buildings.length === 1;
        const active = terminal
            ? tick >= this.policy.terminalMinTick
            : tick >= this.policy.assaultMinTick &&
              buildings.length >= 2 && buildings.length <= this.policy.assaultBuildingCount &&
              ownBuildings.length >= this.policy.minimumOwnBuildingsForAssault;
        if (!active || buildings.length === 0) {
            this.releaseCommitment();
            this.emit(this.makeTelemetry({
                tick, phase: "inactive", reason: buildings.length === 0 ? "no_enemy_building" : "outside_scope",
                buildings, ownBuildings, terminal, target: null, blocker: null, selected: [],
                assignments: objectiveMissionAssignments(missionController), mine, homeThreatened: false,
                issuedOrder: "none", buildingDamage: 0, blockerDamage: 0, routeProgress: 0,
            }));
            return;
        }

        const assignments = objectiveMissionAssignments(missionController);
        const homeThreatenedBuildings = ownBuildings.filter((building) => forces.some((force) =>
            distance(point(force), point(building)) <= this.policy.homeThreatRadius,
        ));
        const homeThreatened = homeThreatenedBuildings.length > 0;
        let target = buildings.find(({ id }) => id === this.committedTargetId) ?? null;
        if (!target) {
            const opportunities = buildings.map((building) => targetOpportunity(game, mine, building))
                .filter(({ compatible }) => compatible.length > 0)
                .sort((left, right) =>
                    left.completion - right.completion ||
                    Number(right.target.rules.constructionYard) - Number(left.target.rules.constructionYard) ||
                    Number(right.target.rules.factory !== FactoryType.None) -
                        Number(left.target.rules.factory !== FactoryType.None) ||
                    left.target.id - right.target.id,
                );
            target = opportunities[0]?.target ?? null;
            if (target) this.startTarget(target, tick);
        }
        if (!target) {
            this.releaseCommitment();
            this.emit(this.makeTelemetry({
                tick, phase: "predecessor_fallback", reason: "no_reachable_damage_capability",
                buildings, ownBuildings, terminal, target: null, blocker: null, selected: [], assignments,
                mine, homeThreatened, issuedOrder: "none", buildingDamage: 0, blockerDamage: 0, routeProgress: 0,
            }));
            return;
        }

        let buildingDamage = 0;
        if (this.committedTargetHitPoints !== null && target.hitPoints < this.committedTargetHitPoints) {
            buildingDamage = this.committedTargetHitPoints - target.hitPoints;
            this.lastBuildingDamageTick = tick;
        }
        this.committedTargetHitPoints = target.hitPoints;

        if (tick < this.fallbackUntilTick) {
            this.leasedIds.clear();
            this.emit(this.makeTelemetry({
                tick, phase: "predecessor_fallback", reason: "bounded_fallback_cooldown",
                buildings, ownBuildings, terminal, target, blocker: null, selected: [], assignments,
                mine, homeThreatened, issuedOrder: "none", buildingDamage, blockerDamage: 0, routeProgress: 0,
            }));
            return;
        }

        const compatible = mine.flatMap((unit) => {
            const compatibility = objectiveUnitCompatibility(game, unit, target!);
            return compatibility.compatible ? [{ unit, compatibility }] : [];
        });
        const protectedHomeIds = new Set(homeThreatenedBuildings.flatMap((building) => compatible
            .filter(({ unit }) => distance(point(unit), point(building)) <= this.policy.homeReserveRadius)
            .map(({ unit }) => unit.id)));
        const selected = terminal
            ? compatible.map(({ unit }) => unit).sort((left, right) => left.id - right.id)
            : this.selectAssaultLease(
                compatible.map(({ unit }) => unit),
                assignments,
                protectedHomeIds,
                target,
                game.getPlayerData(player.name).startLocation,
                tick,
            );
        if (selected.length === 0) {
            this.leasedIds.clear();
            this.emit(this.makeTelemetry({
                tick, phase: "predecessor_fallback", reason: terminal
                    ? "no_terminal_damage_capability"
                    : homeThreatened ? "no_safe_surplus_under_home_threat" : "no_lease_eligible_surplus",
                buildings, ownBuildings, terminal, target, blocker: null, selected, assignments,
                mine, homeThreatened, issuedOrder: "none", buildingDamage, blockerDamage: 0, routeProgress: 0,
            }));
            return;
        }

        const routeDistance = Math.min(...selected.map((unit) => distanceToFoundation(point(unit), target!)));
        let routeProgress = 0;
        if (this.bestRouteDistance - routeDistance >= this.policy.routeProgressDistanceTiles) {
            routeProgress = this.bestRouteDistance === Number.POSITIVE_INFINITY
                ? 0
                : this.bestRouteDistance - routeDistance;
            this.bestRouteDistance = routeDistance;
            this.lastRouteProgressTick = tick;
        } else this.bestRouteDistance = Math.min(this.bestRouteDistance, routeDistance);

        const buildingProgressTick = Math.max(
            this.lastBuildingDamageTick,
            this.lastRouteProgressTick,
            this.leaseStartedTick,
        );
        if (
            this.committedBlockerId === null &&
            tick - buildingProgressTick >= this.policy.buildingNoProgressDeadlineTicks
        ) {
            const blockers = this.policy.blockerMode === "route_blocker_clear"
                ? routeBlockers(forces, selected, target, this.policy.routeCorridorRadius)
                : [];
            const blocker = blockers[0] ?? null;
            if (blocker) {
                this.committedBlockerId = blocker.id;
                this.committedBlockerHitPoints = blocker.hitPoints;
                this.lastBlockerDamageTick = tick;
            } else if (!terminal) {
                this.enterFallback(tick);
                this.emit(this.makeTelemetry({
                    tick, phase: "predecessor_fallback", reason: "building_route_stalled_without_blocker",
                    buildings, ownBuildings, terminal, target, blocker: null, selected: [], assignments,
                    mine, homeThreatened, issuedOrder: "none", buildingDamage, blockerDamage: 0, routeProgress,
                }));
                return;
            }
        }

        let blocker = this.committedBlockerId === null
            ? null
            : forces.find(({ id }) => id === this.committedBlockerId) ?? null;
        let blockerDamage = 0;
        if (this.committedBlockerId !== null && !blocker) {
            this.committedBlockerId = null;
            this.committedBlockerHitPoints = null;
            this.lastBuildingDamageTick = tick;
            this.lastRouteProgressTick = tick;
        }
        if (blocker) {
            if (this.committedBlockerHitPoints !== null && blocker.hitPoints < this.committedBlockerHitPoints) {
                blockerDamage = this.committedBlockerHitPoints - blocker.hitPoints;
                this.lastBlockerDamageTick = tick;
            }
            this.committedBlockerHitPoints = blocker.hitPoints;
            if (tick - this.lastBlockerDamageTick >= this.policy.blockerNoProgressDeadlineTicks) {
                if (!terminal) {
                    this.enterFallback(tick);
                    this.emit(this.makeTelemetry({
                        tick, phase: "predecessor_fallback", reason: "blocker_clear_stalled",
                        buildings, ownBuildings, terminal, target, blocker, selected: [], assignments,
                        mine, homeThreatened, issuedOrder: "none", buildingDamage, blockerDamage, routeProgress,
                    }));
                    return;
                }
                // The final building remains lexicographically dominant.  A
                // blocker that cannot be damaged does not turn into a global
                // enemy-force sweep; retry the building with the full force.
                this.committedBlockerId = null;
                this.committedBlockerHitPoints = null;
                blocker = null;
                this.lastBuildingDamageTick = tick;
                this.lastRouteProgressTick = tick;
            }
        }

        if (!terminal && tick - this.leaseStartedTick >= this.policy.maximumLeaseTicks) {
            this.enterFallback(tick);
            this.emit(this.makeTelemetry({
                tick, phase: "predecessor_fallback", reason: "maximum_lease_expired",
                buildings, ownBuildings, terminal, target, blocker, selected: [], assignments,
                mine, homeThreatened, issuedOrder: "none", buildingDamage, blockerDamage, routeProgress,
            }));
            return;
        }

        const ids = selected.map(({ id }) => id);
        if (blocker) context.player.actions.orderUnits(ids, OrderType.Attack, blocker.id);
        else context.player.actions.orderUnits(ids, OrderType.Attack, target.id);
        this.emit(this.makeTelemetry({
            tick, phase: blocker ? "blocker_clear" : "building_strike",
            reason: blocker ? "minimum_route_blocker_after_stall" : terminal
                ? "terminal_building_overrides_off_route_forces"
                : "persistent_additive_building_pressure",
            buildings, ownBuildings, terminal, target, blocker, selected, assignments,
            mine, homeThreatened, issuedOrder: blocker ? "attack_blocker" : "attack_building",
            buildingDamage, blockerDamage, routeProgress,
        }));
    }

    private selectAssaultLease(
        compatible: readonly UnitData[],
        assignments: ReadonlyMap<number, ObjectiveMissionAssignment>,
        protectedHomeIds: ReadonlySet<number>,
        target: UnitData,
        ownStart: Point,
        tick: number,
    ): UnitData[] {
        const eligible = compatible.filter((unit) =>
            !protectedHomeIds.has(unit.id) &&
            isLeaseSourceEligible(unit, assignments.get(unit.id), this.policy),
        );
        const reserved = eligible.slice().sort((left, right) =>
            distance(point(left), ownStart) - distance(point(right), ownStart) || left.id - right.id,
        ).slice(0, Math.min(this.policy.ordinaryReserveCombatants, eligible.length));
        const reservedIds = new Set(reserved.map(({ id }) => id));
        const maximumByFraction = Math.max(1, Math.floor(compatible.length * this.policy.maximumAssaultFraction));
        const maximum = Math.min(this.policy.maximumAssaultCombatants, maximumByFraction);
        const previous = eligible.filter(({ id }) => this.leasedIds.has(id) && !reservedIds.has(id));
        const previousIds = new Set(previous.map(({ id }) => id));
        const additions = eligible.filter(({ id }) => !reservedIds.has(id) && !previousIds.has(id))
            .sort((left, right) =>
                distanceToFoundation(point(left), target) - distanceToFoundation(point(right), target) ||
                left.id - right.id,
            );
        const selected = [...previous, ...additions].slice(0, maximum);
        const nextIds = new Set(selected.map(({ id }) => id));
        const changed = nextIds.size !== this.leasedIds.size ||
            [...nextIds].some((id) => !this.leasedIds.has(id));
        this.leasedIds = nextIds;
        if (changed || this.leaseStartedTick === 0) this.leaseStartedTick = tick;
        return selected;
    }

    private startTarget(target: UnitData, tick: number): void {
        this.committedTargetId = target.id;
        this.committedTargetHitPoints = target.hitPoints;
        this.committedBlockerId = null;
        this.committedBlockerHitPoints = null;
        this.leasedIds.clear();
        this.leaseStartedTick = tick;
        this.lastBuildingDamageTick = tick;
        this.lastBlockerDamageTick = tick;
        this.lastRouteProgressTick = tick;
        this.bestRouteDistance = Number.POSITIVE_INFINITY;
    }

    private enterFallback(tick: number): void {
        this.leasedIds.clear();
        this.committedBlockerId = null;
        this.committedBlockerHitPoints = null;
        this.fallbackUntilTick = tick + this.policy.fallbackCooldownTicks;
    }

    private releaseCommitment(): void {
        this.committedTargetId = null;
        this.committedTargetHitPoints = null;
        this.committedBlockerId = null;
        this.committedBlockerHitPoints = null;
        this.leasedIds.clear();
        this.bestRouteDistance = Number.POSITIVE_INFINITY;
    }

    private makeTelemetry(args: {
        tick: number;
        phase: PersistentObjectiveCompletionTelemetry["phase"];
        reason: string;
        buildings: readonly UnitData[];
        ownBuildings: readonly UnitData[];
        terminal: boolean;
        target: UnitData | null;
        blocker: UnitData | null;
        selected: readonly UnitData[];
        assignments: ReadonlyMap<number, ObjectiveMissionAssignment>;
        mine: readonly UnitData[];
        homeThreatened: boolean;
        issuedOrder: PersistentObjectiveCompletionTelemetry["issuedOrder"];
        buildingDamage: number;
        blockerDamage: number;
        routeProgress: number;
    }): PersistentObjectiveCompletionTelemetry {
        const selectedIds = new Set(args.selected.map(({ id }) => id));
        const diagnostics = args.target === null ? [] : args.mine
            .filter((unit) => !!unit.rules.isSelectableCombatant && unit.type !== ObjectType.Building)
            .map((unit): ObjectiveUnitDiagnostic => {
                const compatibility = objectiveUnitCompatibility(
                    // The context game is invariant for this decision.  It is
                    // stored transiently only through the target opportunity;
                    // makeTelemetry is called synchronously from update.
                    this.telemetryGame!,
                    unit,
                    args.target!,
                );
                const assignment = args.assignments.get(unit.id);
                return {
                    id: unit.id,
                    rulesName: unit.rules.name,
                    compatible: compatibility.compatible,
                    rejectionReason: compatibility.reason,
                    currentAction: unitAction(unit),
                    missionName: assignment?.missionName ?? null,
                    missionLocked: assignment?.locked ?? null,
                    hasOrdinaryCompatibleWeapon: compatibility.hasOrdinaryCompatibleWeapon,
                    hasSpecialSecondaryMechanic: compatibility.hasSpecialSecondaryMechanic,
                    reachable: compatibility.reachable,
                    selected: selectedIds.has(unit.id),
                };
            }).sort((left, right) => left.id - right.id);
        return {
            schemaVersion: 1,
            event: "objective_completion_decision",
            informationInterface: "public_complete_state",
            tick: args.tick,
            phase: args.phase,
            reason: args.reason,
            exactEnemyBuildingCount: args.buildings.length,
            ownBuildingCount: args.ownBuildings.length,
            terminal: args.terminal,
            targetId: args.target?.id ?? null,
            targetRulesName: args.target?.rules.name ?? null,
            targetArmor: targetArmorName(args.target),
            targetHitPoints: args.target?.hitPoints ?? null,
            blockerId: args.blocker?.id ?? null,
            selectedAttackerIds: args.selected.map(({ id }) => id).sort((left, right) => left - right),
            selectedAttackerRulesNames: args.selected.map(({ rules }) => rules.name).sort(),
            buildingDamageSincePreviousDecision: args.buildingDamage,
            blockerDamageSincePreviousDecision: args.blockerDamage,
            routeProgressSincePreviousDecision: args.routeProgress,
            homeThreatened: args.homeThreatened,
            issuedOrder: args.issuedOrder,
            unitDiagnostics: diagnostics,
        };
    }

    private telemetryGame: GameApi | null = null;

    private emit(event: PersistentObjectiveCompletionTelemetry): void {
        const signature = JSON.stringify({ ...event, tick: 0 });
        if (signature === this.lastTelemetrySignature && event.tick < this.lastTelemetryTick + 120) return;
        this.telemetry(event);
        this.lastTelemetrySignature = signature;
        this.lastTelemetryTick = event.tick;
    }
}

export const createPersistentObjectiveCompletionCandidate = (
    baselineFactory: BaselineFactory,
    name: string,
    country: Countries,
    rawPolicy: PersistentObjectiveCompletionPolicy,
    telemetry: TelemetrySink = () => undefined,
): InspectableBaselineBot => {
    const policy = validatePersistentObjectiveCompletionPolicy(rawPolicy);
    if (!policy.enabled) return baselineFactory.create(name, country);
    if (!baselineFactory.createDefaultStrategy || !baselineFactory.createWithStrategy) {
        throw new Error("Baseline factory does not expose the persistent objective strategy interface");
    }
    const inner = baselineFactory.createDefaultStrategy();
    if (!inner || typeof (inner as StrategyLike).onAiUpdate !== "function") {
        throw new Error("Pinned baseline factory did not provide a valid external DefaultStrategy");
    }
    return baselineFactory.createWithStrategy(
        name,
        country,
        new PersistentObjectiveCompletionStrategy(inner as StrategyLike, country, policy, telemetry),
    );
};
