import { GameApi, ObjectType, OrderType, SpeedType, UnitData, Vector2 } from "@chronodivide/game-api";
import { Mission, MissionAction, noop, requestSpecificUnits } from "../mission.js";
import { MissionController } from "../missionController.js";
import { MissionContext, SupabotContext } from "../../common/context.js";
import { DebugLogger, isOwnedByNeutral } from "../../common/utils.js";
import { BatchableAction } from "../actionBatcher.js";
import { manageAttackMicro, manageMoveMicro } from "./squads/common.js";

export type BuildingEliminationObservationMode = "publicApi" | "visibleOnly";
export type BuildingEliminationTargetPriority = "production" | "defense" | "nearest";

export type BuildingEliminationOptions = {
    enabled?: boolean;
    minTick?: number;
    minCombatants?: number;
    combatantAdvantage?: number;
    maxEnemyCombatants?: number;
    reserveCombatants?: number;
    orderIntervalTicks?: number;
    maxTargetGroups?: number;
    targetPriority?: BuildingEliminationTargetPriority;
    observationMode?: BuildingEliminationObservationMode;
    directVisibleAttack?: boolean;
    preemptExistingAttacks?: boolean;
    sweepWhenNoTargets?: boolean;
    sweepRevisitTicks?: number;
};

export type BuildingTargetDescriptor = {
    id?: number;
    x: number;
    y: number;
    name: string;
    maxHitPoints: number;
    constructionYard: boolean;
    weaponsFactory: boolean;
    barracks: boolean;
    refinery: boolean;
    power: boolean;
    defense: boolean;
    visible: boolean;
};

export type PointDescriptor = { x: number; y: number };

const DEFAULT_OPTIONS: Required<BuildingEliminationOptions> = {
    enabled: false,
    minTick: 9000,
    minCombatants: 12,
    combatantAdvantage: 0,
    maxEnemyCombatants: 999,
    reserveCombatants: 4,
    orderIntervalTicks: 15,
    maxTargetGroups: 3,
    targetPriority: "production",
    observationMode: "publicApi",
    directVisibleAttack: true,
    preemptExistingAttacks: true,
    sweepWhenNoTargets: true,
    sweepRevisitTicks: 900,
};

const BUILDING_ELIMINATION_MISSION_NAME = "buildingElimination";
const BUILDING_ELIMINATION_PRIORITY = 300;
const POWER_BUILDINGS = new Set(["NAPOWR", "NANRCT", "GAPOWR"]);
const DEFENSE_BUILDINGS = new Set([
    "NALASR",
    "TESLA",
    "NAFLAK",
    "NASAM",
    "GAPILL",
    "ATESLA",
    "GTGCAN",
    "GASPYSAT",
]);

const isEnemyOwned = (game: GameApi, playerName: string, unit: UnitData): boolean => {
    if (isOwnedByNeutral(unit) || unit.owner === playerName || game.areAlliedPlayers(playerName, unit.owner)) {
        return false;
    }
    try {
        return game.getPlayerData(unit.owner).isCombatant;
    } catch {
        return false;
    }
};

const toTargetDescriptor = (unit: UnitData, visible: boolean): BuildingTargetDescriptor => ({
    id: unit.id,
    x: unit.tile.rx,
    y: unit.tile.ry,
    name: unit.rules.name,
    maxHitPoints: unit.maxHitPoints ?? 0,
    constructionYard: !!unit.rules.constructionYard || unit.rules.name === "AMCV" || unit.rules.name === "SMCV",
    weaponsFactory: !!unit.rules.weaponsFactory,
    barracks: !!unit.rules.nodBarracks || !!unit.rules.gdiBarracks,
    refinery: !!unit.rules.refinery,
    power: POWER_BUILDINGS.has(unit.rules.name),
    defense: DEFENSE_BUILDINGS.has(unit.rules.name),
    visible,
});

export const getBuildingTargetWeight = (
    target: BuildingTargetDescriptor,
    priority: BuildingEliminationTargetPriority,
): number => {
    if (priority === "nearest") {
        return 0;
    }
    if (priority === "defense") {
        if (target.power) return 8_000_000 + target.maxHitPoints;
        if (target.defense) return 7_000_000 + target.maxHitPoints;
        if (target.constructionYard) return 6_000_000 + target.maxHitPoints;
        if (target.weaponsFactory || target.barracks) return 5_000_000 + target.maxHitPoints;
        if (target.refinery) return 4_000_000 + target.maxHitPoints;
        return 3_000_000 + target.maxHitPoints;
    }
    if (target.constructionYard) return 8_000_000 + target.maxHitPoints;
    if (target.power) return 7_000_000 + target.maxHitPoints;
    if (target.weaponsFactory || target.barracks) return 6_000_000 + target.maxHitPoints;
    if (target.defense) return 5_000_000 + target.maxHitPoints;
    if (target.refinery) return 4_000_000 + target.maxHitPoints;
    return 3_000_000 + target.maxHitPoints;
};

const distanceSquared = (left: PointDescriptor, right: PointDescriptor): number => {
    const dx = left.x - right.x;
    const dy = left.y - right.y;
    return dx * dx + dy * dy;
};

export const rankBuildingTargets = (
    targets: BuildingTargetDescriptor[],
    priority: BuildingEliminationTargetPriority,
    attackers: PointDescriptor[],
): BuildingTargetDescriptor[] =>
    targets.slice().sort((left, right) => {
        const weightDifference = getBuildingTargetWeight(right, priority) - getBuildingTargetWeight(left, priority);
        if (weightDifference !== 0) {
            return weightDifference;
        }
        const leftDistance = attackers.reduce(
            (best, attacker) => Math.min(best, distanceSquared(attacker, left)),
            Number.POSITIVE_INFINITY,
        );
        const rightDistance = attackers.reduce(
            (best, attacker) => Math.min(best, distanceSquared(attacker, right)),
            Number.POSITIVE_INFINITY,
        );
        if (leftDistance !== rightDistance) {
            return leftDistance - rightDistance;
        }
        return (left.id ?? Number.MAX_SAFE_INTEGER) - (right.id ?? Number.MAX_SAFE_INTEGER);
    });

export const assignAttackersToTargets = <T extends PointDescriptor, U extends PointDescriptor>(
    attackers: T[],
    targets: U[],
): Array<{ attacker: T; target: U }> => {
    if (targets.length === 0) {
        return [];
    }
    const assignedCounts = new Map<U, number>(targets.map((target) => [target, 0]));
    return attackers.map((attacker) => {
        const target = targets.reduce((best, candidate) => {
            const bestScore = distanceSquared(attacker, best) * (1 + (assignedCounts.get(best) ?? 0));
            const candidateScore =
                distanceSquared(attacker, candidate) * (1 + (assignedCounts.get(candidate) ?? 0));
            return candidateScore < bestScore ? candidate : best;
        }, targets[0]);
        assignedCounts.set(target, (assignedCounts.get(target) ?? 0) + 1);
        return { attacker, target };
    });
};

const getEnemyUnits = (
    context: SupabotContext,
    observationMode: BuildingEliminationObservationMode,
    filter: (unit: UnitData) => boolean,
): UnitData[] => {
    const { game, player } = context;
    const ids =
        observationMode === "visibleOnly"
            ? game.getVisibleUnits(player.name, "enemy")
            : game.getAllUnits();
    return ids
        .map((id) => game.getUnitData(id))
        .filter((unit): unit is UnitData => !!unit && isEnemyOwned(game, player.name, unit))
        .filter(filter);
};

const getEligibleAttackers = (context: SupabotContext): UnitData[] =>
    context.game
        .getVisibleUnits(
            context.player.name,
            "self",
            (rules) => rules.isSelectableCombatant && !rules.harvester && rules.type !== ObjectType.Building,
        )
        .map((id) => context.game.getUnitData(id))
        .filter((unit): unit is UnitData => !!unit)
        .filter((unit) => unit.rules.name !== "DOG" && unit.rules.name !== "ADOG")
        .filter(
            (unit) =>
                !!unit.primaryWeapon?.projectileRules.isAntiGround ||
                !!unit.secondaryWeapon?.projectileRules.isAntiGround,
        );

class BuildingEliminationMission extends Mission {
    private lastOrderAt = Number.NEGATIVE_INFINITY;
    private rememberedBuildings = new Map<number, BuildingTargetDescriptor>();
    private lastSweepAt = new Map<string, number>();

    constructor(
        private options: Required<BuildingEliminationOptions>,
        logger: DebugLogger,
    ) {
        super(BUILDING_ELIMINATION_MISSION_NAME, logger);
    }

    _onAiUpdate(context: MissionContext): MissionAction {
        const eligibleAttackers = this.selectCommittedAttackers(context);
        this.updateRememberedBuildings(context);
        if (
            this.getUnitIds().length > 0 &&
            context.game.getCurrentTick() >= this.lastOrderAt + this.options.orderIntervalTicks
        ) {
            this.issueOrders(context);
            this.lastOrderAt = context.game.getCurrentTick();
        }
        return eligibleAttackers.length > 0
            ? requestSpecificUnits(eligibleAttackers.map((unit) => unit.id), BUILDING_ELIMINATION_PRIORITY)
            : noop();
    }

    getGlobalDebugText(): string | undefined {
        return `finish buildings=${this.rememberedBuildings.size} units=${this.getUnitIds().length}`;
    }

    getPriority(): number {
        return BUILDING_ELIMINATION_PRIORITY;
    }

    private selectCommittedAttackers(context: SupabotContext): UnitData[] {
        const start = context.game.getPlayerData(context.player.name).startLocation;
        const eligibleAttackers = getEligibleAttackers(context);
        return eligibleAttackers
            .sort(
                (left, right) =>
                    distanceSquared({ x: right.tile.rx, y: right.tile.ry }, start) -
                    distanceSquared({ x: left.tile.rx, y: left.tile.ry }, start),
            )
            .slice(0, Math.max(0, eligibleAttackers.length - this.options.reserveCombatants));
    }

    private updateRememberedBuildings(context: MissionContext): void {
        const visibleBuildings = getEnemyUnits(
            context,
            "visibleOnly",
            (unit) => unit.rules.type === ObjectType.Building,
        );
        for (const unit of visibleBuildings) {
            this.rememberedBuildings.set(unit.id, toTargetDescriptor(unit, true));
        }
        const visibleIds = new Set(visibleBuildings.map((unit) => unit.id));
        for (const [id, target] of this.rememberedBuildings.entries()) {
            if (visibleIds.has(id)) {
                continue;
            }
            const tile = context.game.mapApi.getTile(target.x, target.y);
            if (tile && context.game.mapApi.isVisibleTile(tile, context.player.name)) {
                this.rememberedBuildings.delete(id);
            } else {
                this.rememberedBuildings.set(id, { ...target, visible: false });
            }
        }
    }

    private issueOrders(context: MissionContext): void {
        const units = this.getUnits(context.game).filter(
            (unit) =>
                !!unit.primaryWeapon?.projectileRules.isAntiGround ||
                !!unit.secondaryWeapon?.projectileRules.isAntiGround,
        );
        if (units.length === 0) {
            return;
        }
        const currentTargets = getEnemyUnits(
            context,
            this.options.observationMode,
            (unit) => unit.rules.type === ObjectType.Building,
        );
        const currentTargetById = new Map(currentTargets.map((unit) => [unit.id, unit]));
        const descriptors =
            currentTargets.length > 0
                ? currentTargets.map((unit) => toTargetDescriptor(unit, true))
                : [...this.rememberedBuildings.values()];
        const rankedTargets = rankBuildingTargets(
            descriptors,
            this.options.targetPriority,
            units.map((unit) => ({ x: unit.tile.rx, y: unit.tile.ry })),
        ).slice(0, this.options.maxTargetGroups);

        if (rankedTargets.length > 0) {
            const assignments = assignAttackersToTargets(
                units.map((unit) => ({ ...unit, x: unit.tile.rx, y: unit.tile.ry })),
                rankedTargets,
            );
            for (const { attacker, target } of assignments) {
                const currentTarget = target.id === undefined ? undefined : currentTargetById.get(target.id);
                const action =
                    currentTarget && this.options.directVisibleAttack
                        ? manageAttackMicro(attacker, currentTarget)
                        : manageMoveMicro(attacker, new Vector2(target.x, target.y));
                context.actionBatcher.push(action);
            }
            return;
        }

        if (!this.options.sweepWhenNoTargets) {
            return;
        }
        const sweepPoints = this.selectSweepPoints(context, this.options.maxTargetGroups);
        const assignments = assignAttackersToTargets(
            units.map((unit) => ({ ...unit, x: unit.tile.rx, y: unit.tile.ry })),
            sweepPoints,
        );
        for (const { attacker, target } of assignments) {
            context.actionBatcher.push(
                BatchableAction.toPoint(attacker.id, OrderType.AttackMove, new Vector2(target.x, target.y)),
            );
        }
        for (const target of sweepPoints) {
            this.lastSweepAt.set(`${target.x},${target.y}`, context.game.getCurrentTick());
        }
    }

    private selectSweepPoints(context: MissionContext, maximum: number): PointDescriptor[] {
        const candidates: Array<PointDescriptor & { visibility: number; lastSwept: number }> = [];
        context.matchAwareness.getSectorCache().forEach((x, y, cell) => {
            const tile = context.game.mapApi.getTile(x, y);
            if (
                !tile ||
                !context.game.mapApi.isPassableTile(tile, SpeedType.Track, !!tile.onBridgeLandType, true)
            ) {
                return;
            }
            const key = `${x},${y}`;
            const lastSwept = this.lastSweepAt.get(key) ?? Number.NEGATIVE_INFINITY;
            candidates.push({
                x,
                y,
                visibility: cell.value.sectorVisibilityRatio ?? 0,
                lastSwept,
            });
        });
        const tick = context.game.getCurrentTick();
        return candidates
            .sort((left, right) => {
                const leftRecent = tick < left.lastSwept + this.options.sweepRevisitTicks ? 1 : 0;
                const rightRecent = tick < right.lastSwept + this.options.sweepRevisitTicks ? 1 : 0;
                if (leftRecent !== rightRecent) return leftRecent - rightRecent;
                if (left.visibility !== right.visibility) return left.visibility - right.visibility;
                if (left.lastSwept !== right.lastSwept) return left.lastSwept - right.lastSwept;
                if (left.x !== right.x) return left.x - right.x;
                return left.y - right.y;
            })
            .slice(0, Math.max(1, maximum))
            .map(({ x, y }) => ({ x, y }));
    }
}

export class BuildingEliminationMissionFactory {
    private options: Required<BuildingEliminationOptions>;

    constructor(options: BuildingEliminationOptions = {}) {
        const definedOptions = Object.fromEntries(
            Object.entries(options).filter(([, value]) => value !== undefined),
        ) as BuildingEliminationOptions;
        this.options = { ...DEFAULT_OPTIONS, ...definedOptions };
    }

    maybeCreateMissions(
        context: SupabotContext,
        missionController: MissionController,
        logger: DebugLogger,
    ): void {
        if (!this.options.enabled || context.game.getCurrentTick() < this.options.minTick) {
            return;
        }
        const existing = missionController
            .getMissions()
            .find((mission) => mission.getUniqueName() === BUILDING_ELIMINATION_MISSION_NAME);
        if (existing) {
            this.preemptAttacks(missionController);
            return;
        }

        const ownCombatants = getEligibleAttackers(context);
        if (ownCombatants.length < this.options.minCombatants + this.options.reserveCombatants) {
            return;
        }
        const enemyCombatants = getEnemyUnits(
            context,
            this.options.observationMode,
            (unit) => unit.rules.isSelectableCombatant && !unit.rules.harvester && unit.rules.type !== ObjectType.Building,
        );
        if (
            enemyCombatants.length > this.options.maxEnemyCombatants ||
            ownCombatants.length - this.options.reserveCombatants <
                enemyCombatants.length + this.options.combatantAdvantage
        ) {
            return;
        }

        this.preemptAttacks(missionController);
        missionController.addMission(new BuildingEliminationMission(this.options, logger));
    }

    private preemptAttacks(missionController: MissionController): void {
        if (!this.options.preemptExistingAttacks) {
            return;
        }
        missionController
            .getMissions()
            .filter((mission) => {
                const name = mission.getUniqueName();
                return (
                    name.startsWith("attack_") ||
                    name.startsWith("retreat-from-attack") ||
                    name === "allInAttack"
                );
            })
            .forEach((mission) => missionController.disbandMission(mission.getUniqueName()));
    }
}
