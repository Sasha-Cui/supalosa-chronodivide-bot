import {
    ArmorType,
    GameApi,
    ObjectType,
    OrderType,
    QueueType,
    SideType,
    SpeedType,
    TechnoRules,
    UnitData,
    Vector2,
    WeaponData,
} from "@chronodivide/game-api";
import {
    Mission,
    MissionAction,
    buildStructureAtLocation,
    noop,
    releaseUnits,
    requestSpecificUnits,
    requestUnits,
} from "../mission.js";
import { MissionController } from "../missionController.js";
import { MissionContext, SupabotContext } from "../../common/context.js";
import { DebugLogger, isOwnedByNeutral } from "../../common/utils.js";
import { BatchableAction } from "../actionBatcher.js";
import { manageAttackMicro, manageMoveMicro } from "./squads/common.js";
import { BUILDING_NAME_TO_RULES, getDefaultPlacementLocation } from "../../building/buildingRules.js";

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
    capabilityAwareAttackers?: boolean;
    reachabilityAwareTargets?: boolean;
    stallTicks?: number;
    reassignStalledTargets?: boolean;
    adaptiveAirTargetCount?: number;
    adaptiveNavalTargetCount?: number;
    adaptiveProductionPriority?: number;
    adaptiveTechPriority?: number;
};

export type BuildingTargetDescriptor = {
    id?: number;
    x: number;
    y: number;
    name: string;
    maxHitPoints: number;
    hitPoints: number;
    constructionYard: boolean;
    weaponsFactory: boolean;
    barracks: boolean;
    refinery: boolean;
    power: boolean;
    defense: boolean;
    visible: boolean;
};

export type PointDescriptor = { x: number; y: number };

export type BuildingEliminationTelemetryEvent =
    | {
          schemaVersion: 1;
          event: "activated";
          tick: number;
          observationMode: BuildingEliminationObservationMode;
          ownCombatants: number;
          enemyCombatants: number;
          reservedCombatants: number;
          preemptedMissions: string[];
      }
    | {
          schemaVersion: 2;
          event: "activation_blocked";
          tick: number;
          reason: "insufficient_own_combatants" | "enemy_combatant_limit" | "insufficient_advantage";
          ownCombatants: number;
          enemyCombatants: number;
          reservedCombatants: number;
      }
    | {
          schemaVersion: 2;
          event: "target_progress";
          tick: number;
          targetId: number;
          targetName: string;
          hitPoints: number;
          previousHitPoints: number;
          damage: number;
      }
    | {
          schemaVersion: 2;
          event: "target_stalled";
          tick: number;
          targetId: number;
          targetName: string;
          hitPoints: number;
          lastDamageTick: number;
          stallTicks: number;
      }
    | {
          schemaVersion: 2;
          event: "assignment_summary";
          tick: number;
          eligibleAttackers: number;
          assignedAttackers: number;
          incompatiblePairs: number;
          unreachablePairs: number;
          targetCount: number;
      }
    | {
          schemaVersion: 2;
          event: "capability_production";
          tick: number;
          stalledBuildingIds: number[];
          incompatibleBuildingIds: number[];
          unreachableBuildingIds: number[];
          requestedStructures: string[];
          requestedUnits: string[];
      }
    | {
          schemaVersion: 1;
          event: "memory_invalidated";
          tick: number;
          buildingIds: number[];
      }
    | {
          schemaVersion: 1;
          event: "target_orders";
          tick: number;
          attackerCount: number;
          targets: Array<{ id: number | null; name: string; x: number; y: number; visible: boolean }>;
      }
    | {
          schemaVersion: 1;
          event: "sweep_orders";
          tick: number;
          attackerCount: number;
          targets: PointDescriptor[];
      };

export type BuildingEliminationTelemetrySink = (event: BuildingEliminationTelemetryEvent) => void;

export type SweepPointDescriptor = PointDescriptor & {
    visibility: number;
    lastSwept: number;
};

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
    capabilityAwareAttackers: false,
    reachabilityAwareTargets: false,
    stallTicks: 900,
    reassignStalledTargets: false,
    adaptiveAirTargetCount: 0,
    adaptiveNavalTargetCount: 0,
    adaptiveProductionPriority: 140,
    adaptiveTechPriority: 130,
};

const requireIntegerInRange = (name: string, value: number, minimum: number, maximum: number): void => {
    if (!Number.isInteger(value) || value < minimum || value > maximum) {
        throw new Error(`${name} must be an integer in [${minimum}, ${maximum}], got ${value}`);
    }
};

export const resolveBuildingEliminationOptions = (
    options: BuildingEliminationOptions = {},
): Required<BuildingEliminationOptions> => {
    const definedOptions = Object.fromEntries(
        Object.entries(options).filter(([, value]) => value !== undefined),
    ) as BuildingEliminationOptions;
    const resolved = { ...DEFAULT_OPTIONS, ...definedOptions };
    requireIntegerInRange("minTick", resolved.minTick, 0, 100_000);
    requireIntegerInRange("minCombatants", resolved.minCombatants, 0, 1_000);
    requireIntegerInRange("combatantAdvantage", resolved.combatantAdvantage, -1_000, 1_000);
    requireIntegerInRange("maxEnemyCombatants", resolved.maxEnemyCombatants, 0, 1_000);
    requireIntegerInRange("reserveCombatants", resolved.reserveCombatants, 0, 1_000);
    requireIntegerInRange("orderIntervalTicks", resolved.orderIntervalTicks, 1, 10_000);
    requireIntegerInRange("maxTargetGroups", resolved.maxTargetGroups, 1, 64);
    requireIntegerInRange("sweepRevisitTicks", resolved.sweepRevisitTicks, 0, 100_000);
    requireIntegerInRange("stallTicks", resolved.stallTicks, 1, 100_000);
    requireIntegerInRange("adaptiveAirTargetCount", resolved.adaptiveAirTargetCount, 0, 100);
    requireIntegerInRange("adaptiveNavalTargetCount", resolved.adaptiveNavalTargetCount, 0, 100);
    requireIntegerInRange("adaptiveProductionPriority", resolved.adaptiveProductionPriority, 1, 1_000);
    requireIntegerInRange("adaptiveTechPriority", resolved.adaptiveTechPriority, 1, 1_000);
    if (!new Set<BuildingEliminationTargetPriority>(["production", "defense", "nearest"]).has(resolved.targetPriority)) {
        throw new Error(`Invalid building-elimination target priority: ${resolved.targetPriority}`);
    }
    if (!new Set<BuildingEliminationObservationMode>(["publicApi", "visibleOnly"]).has(resolved.observationMode)) {
        throw new Error(`Invalid building-elimination observation mode: ${resolved.observationMode}`);
    }
    return resolved;
};

const BUILDING_ELIMINATION_MISSION_NAME = "buildingElimination";
const BUILDING_ELIMINATION_CAPABILITY_BUILD_MISSION_NAME = "buildingEliminationCapabilityBuild";
const BUILDING_ELIMINATION_CAPABILITY_UNIT_MISSION_NAME = "buildingEliminationCapabilityUnits";
const BUILDING_ELIMINATION_PRIORITY = 300;
const TELEMETRY_HEARTBEAT_TICKS = 120;
const BLOCKED_TELEMETRY_HEARTBEAT_TICKS = 300;
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

export const isEnemyOwned = (game: GameApi, playerName: string, unit: UnitData): boolean => {
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
    hitPoints: unit.hitPoints ?? 0,
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

export type BuildingTargetProgressState = {
    hitPoints: number;
    lastObservedTick: number;
    lastDamageTick: number;
    stalled: boolean;
};

export type BuildingTargetProgressUpdate = {
    state: BuildingTargetProgressState;
    previousHitPoints: number;
    damage: number;
    becameStalled: boolean;
};

export const updateBuildingTargetProgress = (
    previous: BuildingTargetProgressState | undefined,
    hitPoints: number,
    tick: number,
    stallTicks: number,
): BuildingTargetProgressUpdate => {
    requireIntegerInRange("hitPoints", hitPoints, 0, Number.MAX_SAFE_INTEGER);
    requireIntegerInRange("tick", tick, 0, Number.MAX_SAFE_INTEGER);
    requireIntegerInRange("stallTicks", stallTicks, 1, 100_000);
    const previousHitPoints = previous?.hitPoints ?? hitPoints;
    const damage = Math.max(0, previousHitPoints - hitPoints);
    const lastDamageTick = damage > 0 ? tick : (previous?.lastDamageTick ?? tick);
    const stalled = tick - lastDamageTick >= stallTicks;
    return {
        state: { hitPoints, lastObservedTick: tick, lastDamageTick, stalled },
        previousHitPoints,
        damage,
        becameStalled: stalled && previous?.stalled !== true,
    };
};

export const weaponCanDamageBuildingArmor = (
    weapon: WeaponData | undefined,
    armor: ArmorType,
): boolean => {
    if (!weapon?.projectileRules.isAntiGround || weapon.rules.damage <= 0) {
        return false;
    }
    return (weapon.warheadRules.verses.get(armor) ?? 0) > 0;
};

/**
 * The launcher weapon of a spawn carrier has synthetic damage; its spawned
 * missile/aircraft applies the real warhead. Preserve these engine-native
 * anti-structure systems rather than treating an empty launcher Verses map as
 * proof of zero damage.
 */
export const unitCanDamageBuilding = (attacker: UnitData, target: UnitData): boolean => {
    if (target.rules.type !== ObjectType.Building) {
        return false;
    }
    if ((attacker.rules.c4 || attacker.rules.ivan) && target.rules.canC4) {
        return true;
    }
    if (
        attacker.rules.spawns &&
        (attacker.primaryWeapon?.projectileRules.isAntiGround ||
            attacker.secondaryWeapon?.projectileRules.isAntiGround)
    ) {
        return true;
    }
    return [attacker.primaryWeapon, attacker.secondaryWeapon].some((weapon) =>
        weaponCanDamageBuildingArmor(weapon, target.rules.armor),
    );
};

const resolvedSpeedType = (attacker: UnitData): SpeedType | null => {
    if (attacker.rules.speedType !== undefined) {
        return attacker.rules.speedType;
    }
    if (attacker.type === ObjectType.Infantry) {
        return SpeedType.Foot;
    }
    if (attacker.type === ObjectType.Aircraft) {
        return SpeedType.Winged;
    }
    return null;
};

const maximumGroundWeaponRange = (attacker: UnitData): number =>
    Math.max(
        1,
        ...[attacker.primaryWeapon, attacker.secondaryWeapon]
            .filter((weapon): weapon is WeaponData => !!weapon?.projectileRules.isAntiGround)
            .map(({ maxRange }) => maxRange),
    );

const tileDistanceToFoundation = (x: number, y: number, target: UnitData): number => {
    const left = target.tile.rx;
    const top = target.tile.ry;
    const right = left + Math.max(1, target.foundation.width) - 1;
    const bottom = top + Math.max(1, target.foundation.height) - 1;
    const dx = x < left ? left - x : x > right ? x - right : 0;
    const dy = y < top ? top - y : y > bottom ? y - bottom : 0;
    return Math.sqrt(dx * dx + dy * dy);
};

export const canReachBuildingFiringPerimeter = (
    game: GameApi,
    attacker: UnitData,
    target: UnitData,
): boolean => {
    const speedType = resolvedSpeedType(attacker);
    if (speedType === SpeedType.Winged) {
        return true;
    }
    // Unknown custom locomotors remain assignable; target progress telemetry
    // is the authoritative stall check for interfaces the API cannot classify.
    if (speedType === null) {
        return true;
    }
    const maximumRange = maximumGroundWeaponRange(attacker);
    const padding = Math.max(1, Math.ceil(maximumRange));
    const candidates = game.mapApi.getTilesInRect({
        x: target.tile.rx - padding,
        y: target.tile.ry - padding,
        width: target.foundation.width + padding * 2,
        height: target.foundation.height + padding * 2,
    });
    const subCell = attacker.type === ObjectType.Infantry;
    const reachability = game.map.getReachabilityMap(speedType, subCell);
    const from = { tile: attacker.tile, onBridge: attacker.onBridge ?? false };
    return candidates.some((tile) =>
        tileDistanceToFoundation(tile.rx, tile.ry, target) <= maximumRange &&
        game.mapApi.isPassableTile(tile, speedType, !!tile.onBridgeLandType, subCell) &&
        reachability.isReachable(from, { tile, onBridge: !!tile.onBridgeLandType }),
    );
};

export const assignAttackersToCompatibleTargets = <T extends PointDescriptor, U extends PointDescriptor>(
    attackers: T[],
    targets: U[],
    compatible: (attacker: T, target: U) => boolean,
): Array<{ attacker: T; target: U }> => {
    const assignedCounts = new Map<U, number>(targets.map((target) => [target, 0]));
    const result: Array<{ attacker: T; target: U }> = [];
    for (const attacker of attackers) {
        const candidates = targets.filter((target) => compatible(attacker, target));
        if (candidates.length === 0) continue;
        const target = candidates.reduce((best, candidate) => {
            const bestScore = distanceSquared(attacker, best) * (1 + (assignedCounts.get(best) ?? 0));
            const candidateScore = distanceSquared(attacker, candidate) * (1 + (assignedCounts.get(candidate) ?? 0));
            return candidateScore < bestScore ? candidate : best;
        }, candidates[0]);
        assignedCounts.set(target, (assignedCounts.get(target) ?? 0) + 1);
        result.push({ attacker, target });
    }
    return result;
};

export const selectCompatibleBuildingTargets = <T, U>(
    attackers: T[],
    rankedTargets: U[],
    maximum: number,
    compatible: (attacker: T, target: U) => boolean,
): U[] => rankedTargets
    .filter((target) => attackers.some((attacker) => compatible(attacker, target)))
    .slice(0, Math.max(1, maximum));

export const shouldDirectAttackBuildingTarget = (
    directVisibleAttack: boolean,
    targetIsVisible: boolean,
    currentTargetExists: boolean,
): boolean => directVisibleAttack && targetIsVisible && currentTargetExists;

export const prioritizeStalledBuildingTargets = (
    targets: BuildingTargetDescriptor[],
    progress: ReadonlyMap<number, BuildingTargetProgressState>,
): BuildingTargetDescriptor[] =>
    targets.slice().sort((left, right) =>
        Number(progress.get(right.id ?? -1)?.stalled === true) -
        Number(progress.get(left.id ?? -1)?.stalled === true),
    );

export type BuildingCapabilityGap = {
    stalledBuildingIds: number[];
    incompatibleBuildingIds: number[];
    unreachableBuildingIds: number[];
};

export const classifyBuildingCapabilityGaps = (
    attackers: UnitData[],
    buildings: UnitData[],
    stalledBuildingIds: ReadonlySet<number>,
    canDamage: (attacker: UnitData, building: UnitData) => boolean,
    canReach: (attacker: UnitData, building: UnitData) => boolean,
): BuildingCapabilityGap => {
    const incompatibleBuildingIds: number[] = [];
    const unreachableBuildingIds: number[] = [];
    for (const building of buildings) {
        const damagingAttackers = attackers.filter((attacker) => canDamage(attacker, building));
        if (damagingAttackers.length === 0) {
            incompatibleBuildingIds.push(building.id);
        } else if (!damagingAttackers.some((attacker) => canReach(attacker, building))) {
            unreachableBuildingIds.push(building.id);
        }
    }
    const presentIds = new Set(buildings.map(({ id }) => id));
    return {
        stalledBuildingIds: [...stalledBuildingIds].filter((id) => presentIds.has(id)).sort((a, b) => a - b),
        incompatibleBuildingIds: incompatibleBuildingIds.sort((a, b) => a - b),
        unreachableBuildingIds: unreachableBuildingIds.sort((a, b) => a - b),
    };
};

export type BuildingCapabilityProductionPlan = {
    structures: string[];
    units: Array<{ name: string; targetCount: number }>;
};

export const getBuildingCapabilityUnitMissionAction = (
    assignedUnitIds: number[],
    requests: Record<string, number>,
): MissionAction => {
    // Type requests assign completed units to this producer mission. Release
    // them before refreshing production so the elimination mission can claim
    // and command them on the following controller update.
    if (assignedUnitIds.length > 0) return releaseUnits(assignedUnitIds);
    return Object.keys(requests).length > 0 ? requestUnits(requests) : noop();
};

export const getBuildingCapabilityProductionPlan = (
    side: SideType.Nod | SideType.GDI,
    airTargetCount: number,
    navalTargetCount: number,
    needsNavalCapability: boolean,
): BuildingCapabilityProductionPlan => {
    const structures: string[] = [];
    const units: Array<{ name: string; targetCount: number }> = [];
    if (airTargetCount > 0) {
        if (side === SideType.Nod) {
            structures.push("NARADR", "NATECH");
            units.push({ name: "ZEP", targetCount: airTargetCount });
        } else {
            // GAAIRC is forbidden to the USA, whose rules-equivalent radar
            // and airfield is AMRADR. The production mission chooses whichever
            // prerequisite is actually exposed by the live rules.
            structures.push("GAAIRC", "AMRADR");
            units.push({ name: "JUMPJET", targetCount: airTargetCount });
        }
    }
    if (navalTargetCount > 0 && needsNavalCapability) {
        if (side === SideType.Nod) {
            structures.push("NAYARD", "NARADR", "NATECH");
            units.push({ name: "DRED", targetCount: navalTargetCount });
        } else {
            structures.push("GAYARD", "GAAIRC", "AMRADR", "GATECH");
            units.push({ name: "CARRIER", targetCount: navalTargetCount });
        }
    }
    return {
        structures: [...new Set(structures)],
        units,
    };
};

export const selectAvailableCapabilityStructures = (
    plannedStructures: string[],
    availableStructureNames: ReadonlySet<string>,
    ownedStructureNames: ReadonlySet<string>,
): string[] =>
    plannedStructures.filter(
        (name) => availableStructureNames.has(name) && !ownedStructureNames.has(name),
    );

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

export const reconcileRememberedBuildingTargets = (
    current: ReadonlyMap<number, BuildingTargetDescriptor>,
    visible: BuildingTargetDescriptor[],
    isTileVisible: (target: BuildingTargetDescriptor) => boolean,
): { remembered: Map<number, BuildingTargetDescriptor>; invalidatedIds: number[] } => {
    const remembered = new Map(current);
    for (const target of visible) {
        if (target.id !== undefined) {
            remembered.set(target.id, { ...target, visible: true });
        }
    }
    const visibleIds = new Set(visible.flatMap((target) => (target.id === undefined ? [] : [target.id])));
    const invalidatedIds: number[] = [];
    for (const [id, target] of remembered.entries()) {
        if (visibleIds.has(id)) {
            continue;
        }
        if (isTileVisible(target)) {
            remembered.delete(id);
            invalidatedIds.push(id);
        } else {
            remembered.set(id, { ...target, visible: false });
        }
    }
    return { remembered, invalidatedIds: invalidatedIds.sort((left, right) => left - right) };
};

export const mergeCurrentAndRememberedBuildingTargets = (
    current: BuildingTargetDescriptor[],
    remembered: Iterable<BuildingTargetDescriptor>,
): BuildingTargetDescriptor[] => {
    const byIdentity = new Map<string, BuildingTargetDescriptor>();
    for (const target of remembered) {
        const key = target.id === undefined ? `tile:${target.x},${target.y}` : `id:${target.id}`;
        byIdentity.set(key, target);
    }
    for (const target of current) {
        const key = target.id === undefined ? `tile:${target.x},${target.y}` : `id:${target.id}`;
        byIdentity.set(key, target);
    }
    return [...byIdentity.values()];
};

export const rankSweepPoints = (
    candidates: SweepPointDescriptor[],
    tick: number,
    revisitTicks: number,
    maximum: number,
): PointDescriptor[] =>
    candidates
        .slice()
        .sort((left, right) => {
            const leftRecent = tick < left.lastSwept + revisitTicks ? 1 : 0;
            const rightRecent = tick < right.lastSwept + revisitTicks ? 1 : 0;
            if (leftRecent !== rightRecent) return leftRecent - rightRecent;
            if (left.visibility !== right.visibility) return left.visibility - right.visibility;
            if (left.lastSwept !== right.lastSwept) return left.lastSwept - right.lastSwept;
            if (left.x !== right.x) return left.x - right.x;
            return left.y - right.y;
        })
        .slice(0, Math.max(1, maximum))
        .map(({ x, y }) => ({ x, y }));

export const isPreemptibleBuildingEliminationMission = (name: string): boolean =>
    name.startsWith("attack_") || name.startsWith("retreat-from-attack") || name === "allInAttack";

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

export const getEligibleBuildingAttackers = (context: SupabotContext): UnitData[] =>
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

export const selectCommittedBuildingAttackers = (
    eligibleAttackers: UnitData[],
    start: PointDescriptor,
    reserveCombatants: number,
): UnitData[] => eligibleAttackers
    .slice()
    .sort((left, right) => {
        // Air and naval units are the only way to finish some isolated
        // buildings, so never consume them as the generic home reserve while
        // ordinary ground attackers remain available for that role.
        const leftMobilityPriority = left.type === ObjectType.Aircraft || left.rules.speedType === SpeedType.Float
            ? 1
            : 0;
        const rightMobilityPriority = right.type === ObjectType.Aircraft || right.rules.speedType === SpeedType.Float
            ? 1
            : 0;
        if (leftMobilityPriority !== rightMobilityPriority) {
            return rightMobilityPriority - leftMobilityPriority;
        }
        return distanceSquared({ x: right.tile.rx, y: right.tile.ry }, start) -
            distanceSquared({ x: left.tile.rx, y: left.tile.ry }, start);
    })
    .slice(0, Math.max(0, eligibleAttackers.length - reserveCombatants));

export const meetsBuildingEliminationActivationGate = (
    ownCombatantCount: number,
    enemyCombatantCount: number,
    options: Pick<
        Required<BuildingEliminationOptions>,
        "minCombatants" | "reserveCombatants" | "maxEnemyCombatants" | "combatantAdvantage"
    >,
): boolean =>
    ownCombatantCount >= options.minCombatants + options.reserveCombatants &&
    enemyCombatantCount <= options.maxEnemyCombatants &&
    ownCombatantCount - options.reserveCombatants >= enemyCombatantCount + options.combatantAdvantage;

const getEnemyCombatantCount = (
    context: SupabotContext,
    observationMode: BuildingEliminationObservationMode,
): number => getEnemyUnits(
    context,
    observationMode,
    (unit) => unit.rules.isSelectableCombatant && !unit.rules.harvester && unit.rules.type !== ObjectType.Building,
).length;

const isBuildingEliminationCloseoutState = (
    context: SupabotContext,
    options: Required<BuildingEliminationOptions>,
): boolean => meetsBuildingEliminationActivationGate(
    getEligibleBuildingAttackers(context).length,
    getEnemyCombatantCount(context, options.observationMode),
    options,
);

export const shouldRunBuildingEliminationCapabilityProduction = (
    closeoutWasActivated: boolean,
    currentlyMeetsCloseoutGate: boolean,
): boolean => closeoutWasActivated || currentlyMeetsCloseoutGate;

type BuildingEliminationCloseoutLatch = { activated: boolean };

class BuildingEliminationMission extends Mission {
    private lastOrderAt = Number.NEGATIVE_INFINITY;
    private rememberedBuildings = new Map<number, BuildingTargetDescriptor>();
    private lastSweepAt = new Map<string, number>();
    private lastOrderTelemetrySignature = "";
    private lastAssignmentTelemetrySignature = "";
    private lastAssignmentTelemetryAt = Number.NEGATIVE_INFINITY;
    private targetProgress = new Map<number, BuildingTargetProgressState>();
    private progressTelemetry = new Map<number, { hitPoints: number; lastEmittedTick: number }>();

    constructor(
        private options: Required<BuildingEliminationOptions>,
        logger: DebugLogger,
        private telemetrySink: BuildingEliminationTelemetrySink,
        private stalledBuildingIds: Set<number>,
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
        return selectCommittedBuildingAttackers(
            getEligibleBuildingAttackers(context),
            start,
            this.options.reserveCombatants,
        );
    }

    private updateRememberedBuildings(context: MissionContext): void {
        const visibleBuildings = getEnemyUnits(
            context,
            "visibleOnly",
            (unit) => unit.rules.type === ObjectType.Building,
        );
        const reconciled = reconcileRememberedBuildingTargets(
            this.rememberedBuildings,
            visibleBuildings.map((unit) => toTargetDescriptor(unit, true)),
            (target) => {
                const tile = context.game.mapApi.getTile(target.x, target.y);
                return !!tile && context.game.mapApi.isVisibleTile(tile, context.player.name);
            },
        );
        this.rememberedBuildings = reconciled.remembered;
        if (reconciled.invalidatedIds.length > 0) {
            this.telemetrySink({
                schemaVersion: 1,
                event: "memory_invalidated",
                tick: context.game.getCurrentTick(),
                buildingIds: reconciled.invalidatedIds,
            });
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
        const visibleEnemyIds = new Set(context.game.getVisibleUnits(context.player.name, "enemy"));
        const currentTargetById = new Map(currentTargets.map((unit) => [unit.id, unit]));
        this.updateTargetProgress(currentTargets, context.game.getCurrentTick());
        const descriptors = mergeCurrentAndRememberedBuildingTargets(
            currentTargets.map((unit) => toTargetDescriptor(unit, visibleEnemyIds.has(unit.id))),
            this.rememberedBuildings.values(),
        );
        let rankedTargets = rankBuildingTargets(
            descriptors,
            this.options.targetPriority,
            units.map((unit) => ({ x: unit.tile.rx, y: unit.tile.ry })),
        );
        if (this.options.reassignStalledTargets) {
            rankedTargets = prioritizeStalledBuildingTargets(rankedTargets, this.targetProgress);
        }
        if (rankedTargets.length > 0) {
            const attackerDescriptors = units.map((unit) => ({ ...unit, x: unit.tile.rx, y: unit.tile.ry }));
            let incompatiblePairs = 0;
            let unreachablePairs = 0;
            const pairCompatibility = new Map<string, boolean>();
            const compatible = (attacker: UnitData, target: BuildingTargetDescriptor): boolean => {
                const key = `${attacker.id}|${target.id ?? `${target.x},${target.y}`}`;
                const cached = pairCompatibility.get(key);
                if (cached !== undefined) return cached;
                const currentTarget = target.id === undefined ? undefined : currentTargetById.get(target.id);
                if (!currentTarget) {
                    pairCompatibility.set(key, true);
                    return true;
                }
                if (this.options.capabilityAwareAttackers && !unitCanDamageBuilding(attacker, currentTarget)) {
                    incompatiblePairs++;
                    pairCompatibility.set(key, false);
                    return false;
                }
                if (
                    this.options.reachabilityAwareTargets &&
                    !canReachBuildingFiringPerimeter(context.game, attacker, currentTarget)
                ) {
                    unreachablePairs++;
                    pairCompatibility.set(key, false);
                    return false;
                }
                pairCompatibility.set(key, true);
                return true;
            };
            const selectedTargets =
                this.options.capabilityAwareAttackers || this.options.reachabilityAwareTargets
                    ? selectCompatibleBuildingTargets(
                        attackerDescriptors,
                        rankedTargets,
                        this.options.maxTargetGroups,
                        compatible,
                    )
                    : rankedTargets.slice(0, this.options.maxTargetGroups);
            this.emitOrderTelemetry({
                schemaVersion: 1,
                event: "target_orders",
                tick: context.game.getCurrentTick(),
                attackerCount: units.length,
                targets: selectedTargets.map((target) => ({
                    id: target.id ?? null,
                    name: target.name,
                    x: target.x,
                    y: target.y,
                    visible: target.visible,
                })),
            });
            const assignments =
                this.options.capabilityAwareAttackers || this.options.reachabilityAwareTargets
                    ? assignAttackersToCompatibleTargets(attackerDescriptors, selectedTargets, compatible)
                    : assignAttackersToTargets(
                        attackerDescriptors,
                        selectedTargets,
                    );
            this.emitAssignmentTelemetry({
                schemaVersion: 2,
                event: "assignment_summary",
                tick: context.game.getCurrentTick(),
                eligibleAttackers: units.length,
                assignedAttackers: assignments.length,
                incompatiblePairs,
                unreachablePairs,
                targetCount: selectedTargets.length,
            });
            for (const { attacker, target } of assignments) {
                const currentTarget = target.id === undefined ? undefined : currentTargetById.get(target.id);
                const action =
                    currentTarget && shouldDirectAttackBuildingTarget(
                        this.options.directVisibleAttack,
                        target.visible,
                        true,
                    )
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
        this.emitOrderTelemetry({
            schemaVersion: 1,
            event: "sweep_orders",
            tick: context.game.getCurrentTick(),
            attackerCount: units.length,
            targets: sweepPoints,
        });
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
        const candidates: SweepPointDescriptor[] = [];
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
        return rankSweepPoints(
            candidates,
            context.game.getCurrentTick(),
            this.options.sweepRevisitTicks,
            maximum,
        );
    }

    private updateTargetProgress(targets: UnitData[], tick: number): void {
        const currentIds = new Set(targets.map(({ id }) => id));
        for (const target of targets) {
            const update = updateBuildingTargetProgress(
                this.targetProgress.get(target.id),
                target.hitPoints,
                tick,
                this.options.stallTicks,
            );
            this.targetProgress.set(target.id, update.state);
            if (!update.state.stalled) this.stalledBuildingIds.delete(target.id);
            const previousTelemetry = this.progressTelemetry.get(target.id);
            const shouldEmitProgress =
                update.damage > 0 &&
                (!previousTelemetry ||
                    tick >= previousTelemetry.lastEmittedTick + TELEMETRY_HEARTBEAT_TICKS ||
                    target.hitPoints === 0);
            if (shouldEmitProgress) {
                const previousHitPoints = previousTelemetry?.hitPoints ?? update.previousHitPoints;
                this.telemetrySink({
                    schemaVersion: 2,
                    event: "target_progress",
                    tick,
                    targetId: target.id,
                    targetName: target.rules.name,
                    hitPoints: target.hitPoints,
                    previousHitPoints,
                    damage: Math.max(0, previousHitPoints - target.hitPoints),
                });
                this.progressTelemetry.set(target.id, { hitPoints: target.hitPoints, lastEmittedTick: tick });
            }
            if (update.becameStalled) {
                this.stalledBuildingIds.add(target.id);
                this.telemetrySink({
                    schemaVersion: 2,
                    event: "target_stalled",
                    tick,
                    targetId: target.id,
                    targetName: target.rules.name,
                    hitPoints: target.hitPoints,
                    lastDamageTick: update.state.lastDamageTick,
                    stallTicks: this.options.stallTicks,
                });
            }
        }
        for (const id of this.targetProgress.keys()) {
            if (!currentIds.has(id)) {
                this.targetProgress.delete(id);
                this.progressTelemetry.delete(id);
                this.stalledBuildingIds.delete(id);
            }
        }
    }

    private emitAssignmentTelemetry(
        event: Extract<BuildingEliminationTelemetryEvent, { event: "assignment_summary" }>,
    ): void {
        const signature = JSON.stringify({ ...event, tick: 0 });
        if (signature === this.lastAssignmentTelemetrySignature) return;
        if (event.tick < this.lastAssignmentTelemetryAt + TELEMETRY_HEARTBEAT_TICKS) return;
        this.lastAssignmentTelemetrySignature = signature;
        this.lastAssignmentTelemetryAt = event.tick;
        this.telemetrySink(event);
    }

    private emitOrderTelemetry(
        event: Extract<BuildingEliminationTelemetryEvent, { event: "target_orders" | "sweep_orders" }>,
    ): void {
        const signature = JSON.stringify({ ...event, tick: 0 });
        if (signature === this.lastOrderTelemetrySignature) {
            return;
        }
        this.lastOrderTelemetrySignature = signature;
        this.telemetrySink(event);
    }
}

const getCapabilityGap = (
    context: SupabotContext,
    observationMode: BuildingEliminationObservationMode,
    stalledBuildingIds: ReadonlySet<number>,
    reserveCombatants: number,
): BuildingCapabilityGap => {
    const buildings = getEnemyUnits(context, observationMode, (unit) => unit.rules.type === ObjectType.Building);
    const attackers = selectCommittedBuildingAttackers(
        getEligibleBuildingAttackers(context),
        context.game.getPlayerData(context.player.name).startLocation,
        reserveCombatants,
    );
    return classifyBuildingCapabilityGaps(
        attackers,
        buildings,
        stalledBuildingIds,
        unitCanDamageBuilding,
        (attacker, building) => canReachBuildingFiringPerimeter(context.game, attacker, building),
    );
};

const hasCapabilityGap = (gap: BuildingCapabilityGap): boolean =>
    gap.stalledBuildingIds.length > 0 ||
    gap.incompatibleBuildingIds.length > 0 ||
    gap.unreachableBuildingIds.length > 0;

/**
 * Reachability checks build engine path maps and are substantially more
 * expensive than emitting a cached production request. The build and unit
 * missions share this cache so a closeout position is classified at most once
 * per telemetry heartbeat, while the resulting request remains active on
 * every AI update.
 */
class BuildingCapabilityGapCache {
    private lastEvaluationAt = Number.NEGATIVE_INFINITY;
    private gap: BuildingCapabilityGap = {
        stalledBuildingIds: [],
        incompatibleBuildingIds: [],
        unreachableBuildingIds: [],
    };

    constructor(
        private observationMode: BuildingEliminationObservationMode,
        private stalledBuildingIds: ReadonlySet<number>,
        private reserveCombatants: number,
    ) {}

    get(context: SupabotContext): BuildingCapabilityGap {
        const tick = context.game.getCurrentTick();
        if (tick >= this.lastEvaluationAt + TELEMETRY_HEARTBEAT_TICKS) {
            this.gap = getCapabilityGap(
                context,
                this.observationMode,
                this.stalledBuildingIds,
                this.reserveCombatants,
            );
            this.lastEvaluationAt = tick;
        }
        return this.gap;
    }
}

const getPlayerSide = (context: SupabotContext): SideType.Nod | SideType.GDI | null => {
    const side = context.game.getPlayerData(context.player.name).country?.side;
    return side === SideType.Nod || side === SideType.GDI ? side : null;
};

const countOwnVisibleUnits = (context: SupabotContext, name: string): number =>
    context.game.getVisibleUnits(context.player.name, "self", (rules) => rules.name === name).length;

class BuildingEliminationCapabilityBuildMission extends Mission {
    constructor(
        private options: Required<BuildingEliminationOptions>,
        private capabilityGapCache: BuildingCapabilityGapCache,
        private closeoutLatch: BuildingEliminationCloseoutLatch,
        logger: DebugLogger,
    ) {
        super(BUILDING_ELIMINATION_CAPABILITY_BUILD_MISSION_NAME, logger);
    }

    _onAiUpdate(context: MissionContext): MissionAction {
        const side = getPlayerSide(context);
        if (side === null || context.game.getCurrentTick() < this.options.minTick) return noop();
        if (!shouldRunBuildingEliminationCapabilityProduction(
            this.closeoutLatch.activated,
            isBuildingEliminationCloseoutState(context, this.options),
        )) return noop();
        const gap = this.capabilityGapCache.get(context);
        if (!hasCapabilityGap(gap)) return noop();
        const plan = getBuildingCapabilityProductionPlan(
            side,
            this.options.adaptiveAirTargetCount,
            this.options.adaptiveNavalTargetCount,
            gap.unreachableBuildingIds.length > 0 ||
                (this.options.adaptiveAirTargetCount <= 0 && gap.incompatibleBuildingIds.length > 0),
        );
        const available = [
            ...context.player.production.getAvailableObjects(QueueType.Structures),
            ...context.player.production.getAvailableObjects(QueueType.Armory),
        ];
        const availableByName = new Map(available.map((rules) => [rules.name, rules]));
        const playerData = context.game.getPlayerData(context.player.name);
        const ownedStructureNames = new Set(
            plan.structures.filter((name) => countOwnVisibleUnits(context, name) > 0),
        );
        const buildCandidates = selectAvailableCapabilityStructures(
            plan.structures,
            new Set(availableByName.keys()),
            ownedStructureNames,
        );
        for (const name of buildCandidates) {
            const rules = availableByName.get(name);
            if (!rules) continue; // Narrowing guard for independently supplied sets.
            const buildingRules = BUILDING_NAME_TO_RULES.get(name);
            const location =
                buildingRules?.getPlacementLocation(context.game, playerData, rules) ??
                getDefaultPlacementLocation(context.game, playerData, playerData.startLocation, rules);
            if (location) {
                return buildStructureAtLocation(
                    name,
                    this.options.adaptiveTechPriority,
                    location.rx,
                    location.ry,
                );
            }
        }
        return noop();
    }

    getGlobalDebugText(): string | undefined {
        return "finish capability build";
    }

    getPriority(): number {
        return 0;
    }
}

class BuildingEliminationCapabilityUnitMission extends Mission {
    private lastTelemetrySignature = "";
    private lastTelemetryAt = Number.NEGATIVE_INFINITY;

    constructor(
        private options: Required<BuildingEliminationOptions>,
        private capabilityGapCache: BuildingCapabilityGapCache,
        private closeoutLatch: BuildingEliminationCloseoutLatch,
        logger: DebugLogger,
        private telemetrySink: BuildingEliminationTelemetrySink,
    ) {
        super(BUILDING_ELIMINATION_CAPABILITY_UNIT_MISSION_NAME, logger);
    }

    _onAiUpdate(context: MissionContext): MissionAction {
        if (this.getUnitIds().length > 0) return releaseUnits(this.getUnitIds());
        const side = getPlayerSide(context);
        if (side === null || context.game.getCurrentTick() < this.options.minTick) return noop();
        if (!shouldRunBuildingEliminationCapabilityProduction(
            this.closeoutLatch.activated,
            isBuildingEliminationCloseoutState(context, this.options),
        )) return noop();
        const gap = this.capabilityGapCache.get(context);
        if (!hasCapabilityGap(gap)) return noop();
        const plan = getBuildingCapabilityProductionPlan(
            side,
            this.options.adaptiveAirTargetCount,
            this.options.adaptiveNavalTargetCount,
            gap.unreachableBuildingIds.length > 0 ||
                (this.options.adaptiveAirTargetCount <= 0 && gap.incompatibleBuildingIds.length > 0),
        );
        const requests = Object.fromEntries(
            plan.units
                .filter(({ name, targetCount }) => countOwnVisibleUnits(context, name) < targetCount)
                .map(({ name }) => [name, this.options.adaptiveProductionPriority]),
        );
        this.emitTelemetry(context, gap, plan.structures, Object.keys(requests));
        return getBuildingCapabilityUnitMissionAction([], requests);
    }

    getGlobalDebugText(): string | undefined {
        return "finish capability units";
    }

    getPriority(): number {
        return 0;
    }

    isUnitsLocked(): boolean {
        return false;
    }

    private emitTelemetry(
        context: MissionContext,
        gap: BuildingCapabilityGap,
        requestedStructures: string[],
        requestedUnits: string[],
    ): void {
        const event: Extract<BuildingEliminationTelemetryEvent, { event: "capability_production" }> = {
            schemaVersion: 2,
            event: "capability_production",
            tick: context.game.getCurrentTick(),
            ...gap,
            requestedStructures,
            requestedUnits,
        };
        const signature = JSON.stringify({ ...event, tick: 0 });
        if (signature === this.lastTelemetrySignature && event.tick < this.lastTelemetryAt + TELEMETRY_HEARTBEAT_TICKS) {
            return;
        }
        this.lastTelemetrySignature = signature;
        this.lastTelemetryAt = event.tick;
        this.telemetrySink(event);
    }
}

export class BuildingEliminationMissionFactory {
    private options: Required<BuildingEliminationOptions>;
    private lastBlockedTelemetrySignature = "";
    private lastBlockedTelemetryAt = Number.NEGATIVE_INFINITY;
    private stalledBuildingIds = new Set<number>();
    private capabilityGapCache: BuildingCapabilityGapCache;
    private closeoutLatch: BuildingEliminationCloseoutLatch = { activated: false };

    constructor(
        options: BuildingEliminationOptions = {},
        private telemetrySink: BuildingEliminationTelemetrySink = () => undefined,
    ) {
        this.options = resolveBuildingEliminationOptions(options);
        this.capabilityGapCache = new BuildingCapabilityGapCache(
            this.options.observationMode,
            this.stalledBuildingIds,
            this.options.reserveCombatants,
        );
    }

    maybeCreateMissions(
        context: SupabotContext,
        missionController: MissionController,
        logger: DebugLogger,
    ): void {
        if (!this.options.enabled || context.game.getCurrentTick() < this.options.minTick) {
            return;
        }
        this.maybeCreateCapabilityMissions(missionController, logger);
        const existing = missionController
            .getMissions()
            .find((mission) => mission.getUniqueName() === BUILDING_ELIMINATION_MISSION_NAME);
        if (existing) {
            this.closeoutLatch.activated = true;
            this.preemptAttacks(missionController);
            return;
        }

        const ownCombatants = getEligibleBuildingAttackers(context);
        if (ownCombatants.length < this.options.minCombatants + this.options.reserveCombatants) {
            this.emitBlockedTelemetry(context, "insufficient_own_combatants", ownCombatants.length, 0);
            return;
        }
        const enemyCombatantCount = getEnemyCombatantCount(context, this.options.observationMode);
        if (enemyCombatantCount > this.options.maxEnemyCombatants) {
            this.emitBlockedTelemetry(context, "enemy_combatant_limit", ownCombatants.length, enemyCombatantCount);
            return;
        }
        if (
            ownCombatants.length - this.options.reserveCombatants <
            enemyCombatantCount + this.options.combatantAdvantage
        ) {
            this.emitBlockedTelemetry(context, "insufficient_advantage", ownCombatants.length, enemyCombatantCount);
            return;
        }

        const preemptedMissions = this.preemptAttacks(missionController);
        this.closeoutLatch.activated = true;
        this.telemetrySink({
            schemaVersion: 1,
            event: "activated",
            tick: context.game.getCurrentTick(),
            observationMode: this.options.observationMode,
            ownCombatants: ownCombatants.length,
            enemyCombatants: enemyCombatantCount,
            reservedCombatants: this.options.reserveCombatants,
            preemptedMissions,
        });
        missionController.addMission(
            new BuildingEliminationMission(
                this.options,
                logger,
                this.telemetrySink,
                this.stalledBuildingIds,
            ),
        );
        this.lastBlockedTelemetrySignature = "";
    }

    private maybeCreateCapabilityMissions(missionController: MissionController, logger: DebugLogger): void {
        if (this.options.adaptiveAirTargetCount <= 0 && this.options.adaptiveNavalTargetCount <= 0) return;
        const names = new Set(missionController.getMissions().map((mission) => mission.getUniqueName()));
        if (!names.has(BUILDING_ELIMINATION_CAPABILITY_BUILD_MISSION_NAME)) {
            missionController.addMission(
                new BuildingEliminationCapabilityBuildMission(
                    this.options,
                    this.capabilityGapCache,
                    this.closeoutLatch,
                    logger,
                ),
            );
        }
        if (!names.has(BUILDING_ELIMINATION_CAPABILITY_UNIT_MISSION_NAME)) {
            missionController.addMission(
                new BuildingEliminationCapabilityUnitMission(
                    this.options,
                    this.capabilityGapCache,
                    this.closeoutLatch,
                    logger,
                    this.telemetrySink,
                ),
            );
        }
    }

    private emitBlockedTelemetry(
        context: SupabotContext,
        reason: Extract<BuildingEliminationTelemetryEvent, { event: "activation_blocked" }>["reason"],
        ownCombatants: number,
        enemyCombatants: number,
    ): void {
        const event: Extract<BuildingEliminationTelemetryEvent, { event: "activation_blocked" }> = {
            schemaVersion: 2,
            event: "activation_blocked",
            tick: context.game.getCurrentTick(),
            reason,
            ownCombatants,
            enemyCombatants,
            reservedCombatants: this.options.reserveCombatants,
        };
        const signature = event.reason;
        if (
            signature === this.lastBlockedTelemetrySignature &&
            event.tick < this.lastBlockedTelemetryAt + BLOCKED_TELEMETRY_HEARTBEAT_TICKS
        ) {
            return;
        }
        this.lastBlockedTelemetrySignature = signature;
        this.lastBlockedTelemetryAt = event.tick;
        this.telemetrySink(event);
    }

    private preemptAttacks(missionController: MissionController): string[] {
        if (!this.options.preemptExistingAttacks) {
            return [];
        }
        const names = missionController
            .getMissions()
            .map((mission) => mission.getUniqueName())
            .filter(isPreemptibleBuildingEliminationMission)
            .sort();
        names.forEach((name) => missionController.disbandMission(name));
        return names;
    }
}
