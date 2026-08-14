import {
    AttackState,
    FactoryType,
    GameApi,
    ObjectType,
    OrderType,
    SpeedType,
    UnitData,
} from "@chronodivide/game-api";
import { Countries } from "@supalosa/chronodivide-bot/dist/bot/logic/common/utils.js";
import {
    ObjectiveAssetThreatProjection,
    ObjectiveAttacker,
    ObjectiveBaseAsset,
    ObjectiveBuilding,
    ObjectiveForceAttacker,
    ObjectiveMissionDecision,
    ObjectiveSchedulerThresholds,
    ObjectiveThreat,
    classifyObjectiveThreats,
    estimateBlockerThenBuildingCompletionTicks,
    estimateObjectiveStrikeCompletionTicks,
    rankObjectiveBuildingOpportunities,
    rankObjectiveMissionOpportunities,
    objectiveMissionProgressDeadlineExpired,
    selectMinimumSufficientObjectiveStrikeGroup,
    selectContinuousObjectiveMission,
    selectObjectiveMission,
} from "@supalosa/chronodivide-bot/dist/bot/logic/objective/terminalObjectiveDecisionCore.js";
import {
    calibrateObjectiveAttackerEnvelope,
    calibrateObjectiveThreatEnvelope,
    calibrateObjectiveUnitMechanics,
    calibratedWeaponDamageAgainst,
    hasUncalibratedObjectiveMechanic,
    objectiveTargetArmorDivisor,
    objectiveVeterancyMultipliers,
} from "@supalosa/chronodivide-bot/dist/bot/logic/objective/objectiveMechanicsAdapter.js";
import { BaselineFactory, InspectableBaselineBot } from "../benchmark/baselineLoader.js";
import {
    TERMINAL_OBJECTIVE_INFORMATION_BOUNDARY,
    TerminalObjectivePolicy,
    validateTerminalObjectivePolicy,
} from "./terminalObjectivePolicy.js";
import {
    TerminalRaceFriendlyCalibrationMode,
    TerminalRacePolicy,
    validateTerminalRacePolicy,
} from "./terminalRacePolicy.js";
import { publicEnemyUnits } from "./terminalRacePublicState.js";
import {
    ContinuousOffensePolicy,
    validateContinuousOffensePolicy,
} from "./continuousOffensePolicy.js";
import {
    ProgressCertifiedConversionPolicy,
    validateProgressCertifiedConversionPolicy,
} from "./progressCertifiedConversionPolicy.js";

type Point = { x: number; y: number };

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

type Logger = (message: string, sayInGame?: boolean) => void;

type RememberedBuilding = {
    unit: UnitData;
    visible: boolean;
    exact: boolean;
    lastSeenTick: number;
    lastDamageTick: number;
};

type RememberedThreat = {
    unit: UnitData;
    visible: boolean;
    exact: boolean;
    lastSeenTick: number;
};

type SearchPoint = Point & {
    key: string;
    publicEnemyStart: boolean;
    lastObservedTick: number;
    lastOrderedTick: number;
};

type ObjectiveOverlayPolicy = TerminalObjectivePolicy | TerminalRacePolicy | ContinuousOffensePolicy |
    ProgressCertifiedConversionPolicy;
type ObjectiveOverlayMechanism = ObjectiveOverlayPolicy["mechanism"];
type ObjectiveInformationBoundary =
    | typeof TERMINAL_OBJECTIVE_INFORMATION_BOUNDARY
    | TerminalRacePolicy["informationInterface"];

export type TerminalObjectiveTelemetry = {
    schemaVersion: 1 | 2 | 3;
    event: "decision" | "search_orders" | "memory_invalidated";
    informationBoundary: ObjectiveInformationBoundary;
    tick: number;
    mechanism: ObjectiveOverlayMechanism;
    decisionKind?: ObjectiveMissionDecision["kind"];
    decisionReason?: string;
    selectedBuildingId?: number | null;
    selectedBuildingVisible?: boolean;
    selectedBuildingObservedBy?: "vision" | "memory" | "public_complete_state";
    selectedAttackerIds?: number[];
    blockerIds?: number[];
    threatIds?: number[];
    predictedCompletionTicks?: number | null;
    directCompletionTicks?: number | null;
    earliestLethalInterceptTick?: number | null;
    earliestBaseDestructionTick?: number | null;
    noProgressTicks?: number;
    searchCoverageFraction?: number;
    searchPointCount?: number;
    invalidatedBuildingIds?: number[];
    activationReason?: "fixed_tick" | "guarded_building_count";
    exactEnemyBuildingCount?: number | null;
    eligibleAttackerCount?: number;
    reservedCombatantCount?: number;
    reservedCombatantIds?: number[];
    reservedActionCounts?: { idle: number; moving: number; attacking: number; other: number };
    certifiedAttackerCount?: number;
    rejectedAttackerCountsByReason?: Record<string, number>;
    selectedAttackerRulesNames?: string[];
    delegatedActionCounts?: { idle: number; moving: number; attacking: number; other: number };
    assignedCombatantFraction?: number;
    lastPhysicalProgressTick?: number;
    physicalNoProgressTicks?: number;
    missionStartedTick?: number;
    progressDeadlineExpired?: "blocker" | "building" | null;
    terminalReserveReleased?: boolean;
    completeMissionCostTicks?: number | null;
};

type TelemetrySink = (event: TerminalObjectiveTelemetry) => void;

const DOGS = new Set(["DOG", "ADOG"]);

const point = (unit: UnitData): Point => ({ x: unit.tile.rx, y: unit.tile.ry });
const distance = (left: Point, right: Point): number => Math.hypot(left.x - right.x, left.y - right.y);

export const partitionContinuousOffenseCombatants = (
    eligible: readonly UnitData[],
    ownStart: Point,
    reserveCombatants: number,
): { active: UnitData[]; reserved: UnitData[] } => {
    const reserveCount = Math.min(Math.max(0, reserveCombatants), eligible.length);
    const reserved = eligible.slice().sort((left, right) =>
        distance(point(left), ownStart) - distance(point(right), ownStart) || left.id - right.id,
    ).slice(0, reserveCount);
    const reservedIds = new Set(reserved.map(({ id }) => id));
    return {
        active: eligible.filter(({ id }) => !reservedIds.has(id)),
        reserved,
    };
};

const snapshotUnit = (unit: UnitData): UnitData => ({
    ...unit,
    tile: { ...unit.tile },
    worldPosition: unit.worldPosition.clone(),
    foundation: { ...unit.foundation },
});

const isTerminalRacePolicy = (policy: ObjectiveOverlayPolicy): policy is TerminalRacePolicy =>
    policy.schemaVersion === 2;

const isContinuousOffensePolicy = (policy: ObjectiveOverlayPolicy): policy is ContinuousOffensePolicy =>
    policy.schemaVersion === 3;

const isProgressCertifiedPolicy = (
    policy: ObjectiveOverlayPolicy,
): policy is ProgressCertifiedConversionPolicy => policy.schemaVersion === 4;

const hasPublicObjectiveInterface = (
    policy: ObjectiveOverlayPolicy,
): policy is TerminalRacePolicy | ContinuousOffensePolicy | ProgressCertifiedConversionPolicy =>
    isTerminalRacePolicy(policy) || isContinuousOffensePolicy(policy) || isProgressCertifiedPolicy(policy);

const missionLivenessTicks = (policy: ObjectiveOverlayPolicy): number =>
    isProgressCertifiedPolicy(policy)
        ? policy.buildingNoDamageDeadlineTicks
        : policy.missionLivenessTicks;

export const objectiveReserveCombatantCount = (
    policy: ObjectiveOverlayPolicy,
    exactEnemyBuildingCount: number | null,
): number => isProgressCertifiedPolicy(policy)
    ? exactEnemyBuildingCount === 1
      ? policy.terminalReserveCombatants
      : policy.ordinaryReserveCombatants
    : isContinuousOffensePolicy(policy)
      ? policy.reserveCombatants
      : 0;

const continuousForceEngagementMode = (
    policy: ContinuousOffensePolicy | ProgressCertifiedConversionPolicy,
): "all_observed_forces_first" | "route_blockers_only" | "buildings_only" =>
    isContinuousOffensePolicy(policy)
        ? policy.forceEngagementMode
        : policy.terminalForceMode === "direct_building"
          ? "buildings_only"
          : "route_blockers_only";

const objectiveInformationBoundary = (policy: ObjectiveOverlayPolicy): ObjectiveInformationBoundary =>
    hasPublicObjectiveInterface(policy)
        ? policy.informationInterface
        : TERMINAL_OBJECTIVE_INFORMATION_BOUNDARY;

const objectiveTelemetrySchemaVersion = (policy: ObjectiveOverlayPolicy): 1 | 2 | 3 =>
    isProgressCertifiedPolicy(policy)
        ? 3
        : isTerminalRacePolicy(policy) || isContinuousOffensePolicy(policy)
          ? 2
          : 1;

export const terminalRaceActivationReason = (
    policy: ObjectiveOverlayPolicy,
    tick: number,
    exactEnemyBuildingCount: number | null,
    maximumPreviouslyObservedExactCount: number,
): "fixed_tick" | "guarded_building_count" | null => {
    if (isProgressCertifiedPolicy(policy)) {
        const inScope = exactEnemyBuildingCount !== null &&
            exactEnemyBuildingCount <= policy.activationBuildingCount &&
            (policy.conversionScope !== "final_building_only" || exactEnemyBuildingCount === 1);
        if (!inScope || tick < policy.activationMinTick) return null;
        if (tick >= policy.minTick) return "fixed_tick";
        if (
            !policy.requireObservedCountAboveThreshold ||
            maximumPreviouslyObservedExactCount > policy.activationBuildingCount
        ) return "guarded_building_count";
        return null;
    }
    if (tick >= policy.minTick) return "fixed_tick";
    if (
        (isContinuousOffensePolicy(policy) ||
            isTerminalRacePolicy(policy) && policy.activationMode === "fixed_tick_or_guarded_building_count") &&
        tick >= policy.activationMinTick &&
        exactEnemyBuildingCount !== null &&
        exactEnemyBuildingCount <= policy.activationBuildingCount &&
        (!policy.requireObservedCountAboveThreshold ||
            maximumPreviouslyObservedExactCount > policy.activationBuildingCount)
    ) return "guarded_building_count";
    return null;
};

export const resolvedObjectiveSpeedType = (unit: UnitData): SpeedType | null =>
    unit.rules.speedType ??
    (unit.type === ObjectType.Infantry
        ? SpeedType.Foot
        : unit.type === ObjectType.Aircraft
          ? SpeedType.Winged
          : null);

export const hasBridgeUncalibratedObjectiveMechanic = (unit: UnitData): boolean =>
    hasUncalibratedObjectiveMechanic(unit) ||
    !!unit.rules.deployFire ||
    !!unit.rules.teleporter ||
    !!unit.rules.radialFireSegments ||
    (unit.garrisonUnitCount ?? 0) > 0 ||
    [unit.primaryWeapon, unit.secondaryWeapon].some((weapon) =>
        !!weapon?.projectileRules.arcing || !!weapon?.rules.neverUse,
    );

export const hasBridgeUncalibratedFriendlyObjectiveMechanic = (
    unit: UnitData,
    target: UnitData,
    mode: TerminalRaceFriendlyCalibrationMode,
    multipliers: ReturnType<typeof mechanicsMultipliers>,
    targetArmorDivisor: number,
): boolean => {
    if (mode === "all_specials_fail_closed") return hasBridgeUncalibratedObjectiveMechanic(unit);
    const uncertifiedAntiGroundWeapon = [unit.primaryWeapon, unit.secondaryWeapon].some((weapon) =>
        !!weapon?.projectileRules.isAntiGround &&
        calibratedWeaponDamageAgainst(weapon, target, multipliers, targetArmorDivisor) === null,
    );
    return uncertifiedAntiGroundWeapon ||
        !!unit.rules.c4 || !!unit.rules.ivan || !!unit.rules.spawns || !!unit.rules.engineer ||
        !!unit.rules.teleporter || !!unit.rules.radialFireSegments ||
        (unit.garrisonUnitCount ?? 0) > 0 ||
        [unit.primaryWeapon, unit.secondaryWeapon].some((weapon) =>
            !!weapon?.projectileRules.arcing || !!weapon?.rules.neverUse,
        );
};

const isMobileAntiGroundCombatant = (unit: UnitData): boolean =>
    !!unit.rules.isSelectableCombatant &&
    unit.rules.type !== ObjectType.Building &&
    !unit.rules.harvester &&
    !DOGS.has(unit.rules.name) &&
    unit.canMove !== false &&
    (unit.rules.ammo <= 0 || (unit.ammo ?? 0) > 0) &&
    [unit.primaryWeapon, unit.secondaryWeapon].some((weapon) => !!weapon?.projectileRules.isAntiGround);

const foundationBounds = (unit: UnitData): { left: number; top: number; right: number; bottom: number } => ({
    left: unit.tile.rx,
    top: unit.tile.ry,
    right: unit.tile.rx + Math.max(1, unit.foundation.width) - 1,
    bottom: unit.tile.ry + Math.max(1, unit.foundation.height) - 1,
});

const distanceToFoundation = (candidate: Point, target: UnitData): number => {
    const { left, top, right, bottom } = foundationBounds(target);
    const dx = candidate.x < left ? left - candidate.x : candidate.x > right ? candidate.x - right : 0;
    const dy = candidate.y < top ? top - candidate.y : candidate.y > bottom ? candidate.y - bottom : 0;
    return Math.hypot(dx, dy);
};

const entireFoundationVisible = (game: GameApi, playerName: string, target: UnitData): boolean => {
    const { left, top, right, bottom } = foundationBounds(target);
    for (let x = left; x <= right; x += 1) {
        for (let y = top; y <= bottom; y += 1) {
            const tile = game.map.getTile(x, y);
            if (!tile || !game.map.isVisibleTile(tile, playerName)) return false;
        }
    }
    return true;
};

const firingTiles = (game: GameApi, unit: UnitData, target: UnitData, range: number) => {
    const speedType = resolvedObjectiveSpeedType(unit);
    if (speedType === null || speedType === SpeedType.Winged) return [];
    const subCell = unit.type === ObjectType.Infantry;
    const padding = Math.max(1, Math.ceil(range));
    const { left, top, right, bottom } = foundationBounds(target);
    const reachability = game.map.getReachabilityMap(speedType, subCell);
    return game.map.getTilesInRect({
        x: left - padding,
        y: top - padding,
        width: right - left + 1 + 2 * padding,
        height: bottom - top + 1 + 2 * padding,
    }).filter((tile) =>
        distanceToFoundation({ x: tile.rx, y: tile.ry }, target) <= range &&
        game.map.isPassableTile(tile, speedType, !!tile.onBridgeLandType, subCell) &&
        reachability.isReachable(
            { tile: unit.tile, onBridge: unit.onBridge ?? false },
            { tile, onBridge: !!tile.onBridgeLandType },
        ),
    ).sort((leftTile, rightTile) =>
        distance(point(unit), { x: leftTile.rx, y: leftTile.ry }) -
            distance(point(unit), { x: rightTile.rx, y: rightTile.ry }) ||
        leftTile.rx - rightTile.rx || leftTile.ry - rightTile.ry,
    );
};

export const conservativeObjectiveTravelTicks = (
    game: GameApi,
    unit: UnitData,
    target: UnitData,
    range: number,
    speedTilesPerTick: number,
): number | null => {
    if (!(speedTilesPerTick > 0) || !(range >= 0)) return null;
    const speedType = resolvedObjectiveSpeedType(unit);
    if (speedType === SpeedType.Winged) {
        return Math.ceil(Math.max(0, distanceToFoundation(point(unit), target) - range) / speedTilesPerTick);
    }
    if (speedType === null) return null;
    const destinations = firingTiles(game, unit, target, range);
    const destination = destinations[0];
    if (!destination) return null;
    if (destination.id === unit.tile.id && !!destination.onBridgeLandType === (unit.onBridge ?? false)) return 0;
    try {
        const path = game.map.findPath(
            speedType,
            unit.type === ObjectType.Infantry,
            { tile: unit.tile, onBridge: unit.onBridge ?? false },
            { tile: destination, onBridge: !!destination.onBridgeLandType },
            { bestEffort: false },
        );
        if (path.length === 0) return null;
        return Math.ceil(Math.max(0, path.length - 1) / speedTilesPerTick);
    } catch {
        return null;
    }
};

const canReachSearchPoint = (game: GameApi, unit: UnitData, target: Point): boolean => {
    const speedType = resolvedObjectiveSpeedType(unit);
    if (speedType === SpeedType.Winged) return true;
    if (speedType === null) return false;
    const tile = game.map.getTile(target.x, target.y);
    if (!tile) return false;
    const subCell = unit.type === ObjectType.Infantry;
    if (!game.map.isPassableTile(tile, speedType, !!tile.onBridgeLandType, subCell)) return false;
    return game.map.getReachabilityMap(speedType, subCell).isReachable(
        { tile: unit.tile, onBridge: unit.onBridge ?? false },
        { tile, onBridge: !!tile.onBridgeLandType },
    );
};

const strategicRemovalValue = (target: UnitData): number =>
    (target.rules.constructionYard ? 8_000_000 : 0) +
    (target.rules.factory !== FactoryType.None ? 6_000_000 : 0) +
    (target.rules.isBaseDefense ? 4_000_000 : 0) +
    (target.rules.refinery ? 2_000_000 : 0) +
    target.maxHitPoints;

const mechanicsMultipliers = (game: GameApi, unit: UnitData) => {
    const veteran = game.rules.general.veteran;
    return objectiveVeterancyMultipliers(
        unit,
        veteran.veteranCombat,
        veteran.veteranROF,
        veteran.veteranSpeed,
    );
};

const armorDivisor = (game: GameApi, target: UnitData): number =>
    objectiveTargetArmorDivisor(target, game.rules.general.veteran.veteranArmor);

type BoundAttacker = { core: ObjectiveAttacker; unit: UnitData };

const bindAttacker = (
    game: GameApi,
    unit: UnitData,
    target: UnitData,
    policy: ObjectiveOverlayPolicy,
): BoundAttacker | null => {
    if (!isMobileAntiGroundCombatant(unit)) return null;
    const multipliers = mechanicsMultipliers(game, unit);
    const targetDivisor = armorDivisor(game, target);
    const uncalibrated = hasPublicObjectiveInterface(policy)
        ? hasBridgeUncalibratedFriendlyObjectiveMechanic(
            unit,
            target,
            policy.friendlyCalibrationMode,
            multipliers,
            targetDivisor,
        )
        : hasBridgeUncalibratedObjectiveMechanic(unit);
    if (uncalibrated) return null;
    const mechanics = calibrateObjectiveUnitMechanics(
        unit,
        target,
        multipliers,
        targetDivisor,
    );
    if (
        mechanics.targetCalibrationStatus !== "ordinary_direct_weapon" ||
        !mechanics.hasFiniteAmmoForInitialShot ||
        mechanics.calibratedDamagePerVolley <= 0 || mechanics.calibratedRateOfFireTicks <= 0
    ) return null;
    const travelTicks = conservativeObjectiveTravelTicks(
        game,
        unit,
        target,
        mechanics.maximumGroundRangeTiles,
        mechanics.speedTilesPerTick,
    );
    if (travelTicks === null) return null;
    return {
        unit,
        core: {
            id: unit.id,
            ...point(unit),
            hitPoints: unit.hitPoints,
            speedTilesPerTick: mechanics.speedTilesPerTick,
            rangeTiles: mechanics.maximumGroundRangeTiles,
            buildingDamagePerVolley: mechanics.calibratedDamagePerVolley,
            buildingRateOfFireTicks: mechanics.calibratedRateOfFireTicks,
            projectileTravelTicks: mechanics.calibratedProjectileTravelTicks,
            initialCooldownTicks: Math.max(mechanics.initialCooldownTicks, travelTicks),
        },
    };
};

const directPrediction = (attackers: readonly BoundAttacker[], target: RememberedBuilding): number | null =>
    estimateObjectiveStrikeCompletionTicks(
        attackers.map(({ core }) => core),
        { id: target.unit.id, ...point(target.unit), hitPoints: target.unit.hitPoints, visible: target.visible },
    );

const projectionFirstVolleyTick = (
    source: RememberedThreat,
    target: UnitData,
    range: number,
    speed: number,
    cooldown: number,
    tick: number,
): number | null => {
    const uncertainty = source.visible || source.exact
        ? 0
        : speed * Math.max(0, tick - source.lastSeenTick);
    const travel = Math.max(0, distanceToFoundation(point(source.unit), target) - uncertainty - range);
    if (travel > 0 && speed <= 0) return null;
    return Math.max(Math.ceil(travel / Math.max(speed, Number.EPSILON)), Math.max(0, Math.floor(cooldown)));
};

const rejectionReason = (
    game: GameApi,
    unit: UnitData,
    target: UnitData,
    policy: ObjectiveOverlayPolicy,
): string => {
    if (!isMobileAntiGroundCombatant(unit)) return "not_mobile_anti_ground_combatant";
    const multipliers = mechanicsMultipliers(game, unit);
    const divisor = armorDivisor(game, target);
    const bridgeUncalibrated = hasPublicObjectiveInterface(policy)
        ? hasBridgeUncalibratedFriendlyObjectiveMechanic(
            unit,
            target,
            policy.friendlyCalibrationMode,
            multipliers,
            divisor,
        )
        : hasBridgeUncalibratedObjectiveMechanic(unit);
    if (bridgeUncalibrated) return "uncalibrated_friendly_mechanic";
    const mechanics = calibrateObjectiveUnitMechanics(unit, target, multipliers, divisor);
    if (mechanics.targetCalibrationStatus !== "ordinary_direct_weapon") return "no_ordinary_building_damage";
    if (!mechanics.hasFiniteAmmoForInitialShot) return "no_initial_ammunition";
    if (mechanics.calibratedDamagePerVolley <= 0 || mechanics.calibratedRateOfFireTicks <= 0) {
        return "nonpositive_calibrated_damage";
    }
    return conservativeObjectiveTravelTicks(
        game,
        unit,
        target,
        mechanics.maximumGroundRangeTiles,
        mechanics.speedTilesPerTick,
    ) === null ? "unreachable_firing_perimeter" : "certified";
};

const countReasons = (reasons: readonly string[]): Record<string, number> =>
    Object.fromEntries([...new Set(reasons)].sort().map((reason) => [
        reason,
        reasons.filter((value) => value === reason).length,
    ]));

const delegatedActionCounts = (
    eligible: readonly UnitData[],
    selectedAttackerIds: ReadonlySet<number>,
): { idle: number; moving: number; attacking: number; other: number } => {
    const counts = { idle: 0, moving: 0, attacking: 0, other: 0 };
    for (const unit of eligible.filter(({ id }) => !selectedAttackerIds.has(id))) {
        if (unit.attackState !== undefined && unit.attackState !== AttackState.Idle) counts.attacking += 1;
        else if (unit.isIdle === true) counts.idle += 1;
        else if (unit.canMove !== false) counts.moving += 1;
        else counts.other += 1;
    }
    return counts;
};

export class TerminalObjectiveStrategy implements StrategyLike {
    private buildings = new Map<number, RememberedBuilding>();
    private threats = new Map<number, RememberedThreat>();
    private searchPoints: SearchPoint[] | null = null;
    private committedBuildingId: number | null = null;
    private committedBuildingMadeProgress = false;
    private committedBlockerClear = false;
    private committedBlockerIds = new Set<number>();
    private lastProgressTick = 0;
    private lastPhysicalProgressTick = 0;
    private missionStartedTick = 0;
    private objectiveSuspendedUntilTick = 0;
    private lastOrderTick = Number.NEGATIVE_INFINITY;
    private lastTelemetry = new Map<string, { signature: string; tick: number }>();
    private exactEnemyBuildingCount: number | null = null;
    private maximumObservedExactEnemyBuildingCount = 0;
    private activationReason: "fixed_tick" | "guarded_building_count" | null = null;

    constructor(
        private inner: StrategyLike,
        private readonly country: Countries,
        private readonly policy: ObjectiveOverlayPolicy,
        private readonly telemetry: TelemetrySink,
    ) {}

    onAiUpdate(context: StrategyContext, missionController: unknown, logger: Logger): StrategyLike {
        const next = this.inner.onAiUpdate(context, missionController, logger);
        if (next && typeof (next as StrategyLike).onAiUpdate === "function") this.inner = next as StrategyLike;
        this.update(context);
        return this;
    }

    private update(context: StrategyContext): void {
        const { game, player } = context;
        const tick = game.getCurrentTick();
        const progressPolicy = isProgressCertifiedPolicy(this.policy) ? this.policy : null;
        this.updateMemory(game, player.name, tick);
        this.updateSearchCoverage(game, player.name, tick);
        this.activationReason = terminalRaceActivationReason(
            this.policy,
            tick,
            this.exactEnemyBuildingCount,
            this.maximumObservedExactEnemyBuildingCount,
        );
        if (
            this.activationReason === null ||
            tick < this.lastOrderTick + this.policy.orderIntervalTicks
        ) return;
        this.lastOrderTick = tick;

        const selfUnits = game.getVisibleUnits(player.name, "self")
            .map((id) => game.getUnitData(id))
            .filter((unit): unit is UnitData => !!unit);
        const eligible = selfUnits.filter(isMobileAntiGroundCombatant);
        const managedReserve = isContinuousOffensePolicy(this.policy) || progressPolicy !== null;
        const reserveCount = objectiveReserveCombatantCount(this.policy, this.exactEnemyBuildingCount);
        const terminalReserveReleased = progressPolicy !== null &&
            this.exactEnemyBuildingCount === 1 &&
            progressPolicy.terminalReserveCombatants < progressPolicy.ordinaryReserveCombatants;
        const partition = managedReserve
            ? partitionContinuousOffenseCombatants(
                eligible,
                game.getPlayerData(player.name).startLocation,
                reserveCount,
            )
            : { active: eligible, reserved: [] };
        const activeEligible = partition.active;
        const noProgressTicks = Math.max(0, tick - this.lastProgressTick);
        const physicalNoProgressTicks = Math.max(0, tick - this.lastPhysicalProgressTick);
        const blockerDeadlineExpired = progressPolicy !== null && this.committedBlockerClear &&
            objectiveMissionProgressDeadlineExpired({
                tick,
                lastPhysicalProgressTick: this.lastPhysicalProgressTick,
                missionStartedTick: this.missionStartedTick,
                deadlineTicks: progressPolicy.blockerNoDamageDeadlineTicks,
            });
        const buildingDeadlineExpired = progressPolicy !== null &&
            this.committedBuildingId !== null && !this.committedBlockerClear &&
            objectiveMissionProgressDeadlineExpired({
                tick,
                lastPhysicalProgressTick: this.lastPhysicalProgressTick,
                missionStartedTick: this.missionStartedTick,
                deadlineTicks: progressPolicy.buildingNoDamageDeadlineTicks,
            });
        const progressDeadlineExpired = blockerDeadlineExpired
            ? "blocker" as const
            : buildingDeadlineExpired
              ? "building" as const
              : null;
        if (progressDeadlineExpired !== null) {
            // A mission that is not producing physical damage yields briefly to
            // the unchanged Supalosa predecessor. This is a bounded tactical
            // fallback, not an idle state: the predecessor continues ordinary
            // combat while the overlay waits before replanning the objective.
            this.objectiveSuspendedUntilTick = tick + progressPolicy!.blockerNoDamageDeadlineTicks;
            this.emit({
                schemaVersion: objectiveTelemetrySchemaVersion(this.policy),
                event: "decision",
                informationBoundary: objectiveInformationBoundary(this.policy),
                tick,
                mechanism: this.policy.mechanism,
                decisionKind: "predecessor_fallback",
                decisionReason: "physical_progress_deadline",
                selectedBuildingId: this.committedBuildingId,
                selectedAttackerIds: [],
                blockerIds: progressDeadlineExpired === "blocker"
                    ? [...this.committedBlockerIds].sort((left, right) => left - right)
                    : [],
                noProgressTicks,
                physicalNoProgressTicks,
                lastPhysicalProgressTick: this.lastPhysicalProgressTick,
                missionStartedTick: this.missionStartedTick,
                progressDeadlineExpired,
                terminalReserveReleased,
            });
        }
        if (
            this.committedBuildingId !== null &&
            (!this.buildings.has(this.committedBuildingId) ||
                (isProgressCertifiedPolicy(this.policy)
                    ? progressDeadlineExpired !== null
                    : noProgressTicks >= missionLivenessTicks(this.policy)))
        ) {
            this.committedBuildingId = null;
            this.committedBuildingMadeProgress = false;
            this.committedBlockerClear = false;
            this.committedBlockerIds.clear();
        }
        if (progressPolicy !== null && tick < this.objectiveSuspendedUntilTick) return;

        if (this.buildings.size === 0) {
            this.issueSearch(
                context,
                activeEligible,
                tick,
                noProgressTicks,
                eligible.length,
                partition.reserved.length,
                partition.reserved,
            );
            return;
        }

        const candidates = [...this.buildings.values()].map((target) => {
            const attackers = activeEligible.map((unit) => bindAttacker(game, unit, target.unit, this.policy))
                .filter((value): value is BoundAttacker => value !== null);
            return {
                target,
                attackers,
                opportunity: {
                    building: {
                        id: target.unit.id,
                        ...point(target.unit),
                        hitPoints: target.unit.hitPoints,
                        visible: target.visible,
                    },
                    directCompletionTicks: directPrediction(attackers, target),
                    strategicRemovalValue: strategicRemovalValue(target.unit),
                    committed: target.unit.id === this.committedBuildingId,
                    committedMadeProgress: target.unit.id === this.committedBuildingId &&
                        (this.committedBuildingMadeProgress || this.committedBlockerClear),
                },
            };
        });
        const progressCertifiedMissionOpportunities = progressPolicy !== null
            ? candidates.map((candidate) => {
                if (candidate.opportunity.directCompletionTicks === null || candidate.attackers.length === 0) {
                    return {
                        ...candidate.opportunity,
                        directStrikeSurvives: false,
                        blockerThenBuildingCompletionTicks: null,
                        missionSwitchPenaltyTicks: progressPolicy.missionSwitchPenaltyTicks,
                    };
                }
                const bound = this.bindThreatState(
                    game, tick, candidate.target.unit, candidate.attackers, selfUnits,
                );
                const classification = classifyObjectiveThreats({
                    attackers: candidate.attackers.map(({ core }) => core),
                    building: candidate.opportunity.building,
                    threats: bound.threats,
                    baseAssets: bound.baseAssets,
                    assetThreatProjections: bound.assetThreatProjections,
                    directCompletionTicks: candidate.opportunity.directCompletionTicks,
                    thresholds: this.thresholds(),
                });
                const directSurvives = classification.uncalibratedStrikeThreatIds.length === 0 &&
                    (classification.earliestLethalInterceptTick === null ||
                        candidate.opportunity.directCompletionTicks +
                            progressPolicy.directCompletionSafetyMarginTicks <
                                classification.earliestLethalInterceptTick);
                const blockerIds = [...new Set([
                    ...classification.blockerIds,
                    ...classification.uncalibratedStrikeThreatIds,
                ])].sort((left, right) => left - right);
                return {
                    ...candidate.opportunity,
                    directStrikeSurvives: directSurvives,
                    blockerThenBuildingCompletionTicks: this.blockerCompletion(
                        game,
                        candidate.attackers,
                        blockerIds,
                        candidate.opportunity.directCompletionTicks,
                        bound.threatUnitsById,
                    ),
                    missionSwitchPenaltyTicks: progressPolicy.missionSwitchPenaltyTicks,
                };
            })
            : null;
        const retained = this.committedBuildingId !== null &&
            (this.committedBuildingMadeProgress || this.committedBlockerClear) &&
            (progressPolicy !== null
                ? progressDeadlineExpired === null
                : noProgressTicks < missionLivenessTicks(this.policy))
            ? candidates.find(({ target }) => target.unit.id === this.committedBuildingId)
            : undefined;
        const rankedIds = (progressPolicy !== null
            ? rankObjectiveMissionOpportunities(progressCertifiedMissionOpportunities!)
            : rankObjectiveBuildingOpportunities(candidates.map(({ opportunity }) => opportunity)))
            .map(({ building }) => building.id);
        const selected = retained ?? rankedIds.map((id) =>
            candidates.find(({ target }) => target.unit.id === id),
        ).find((value) => value?.opportunity.directCompletionTicks !== null);
        if (!selected || selected.attackers.length === 0) {
            const target = selected?.target.unit;
            const reasons = target
                ? activeEligible.map((unit) => rejectionReason(game, unit, target, this.policy))
                : [];
            this.emit({
                schemaVersion: objectiveTelemetrySchemaVersion(this.policy),
                event: "decision",
                informationBoundary: objectiveInformationBoundary(this.policy),
                tick,
                mechanism: this.policy.mechanism,
                decisionKind: "regroup",
                decisionReason: "no_capable_strike_group",
                selectedBuildingId: selected?.target.unit.id ?? null,
                selectedAttackerIds: [],
                noProgressTicks,
                searchCoverageFraction: this.searchCoverageFraction(),
                activationReason: this.activationReason ?? undefined,
                exactEnemyBuildingCount: this.exactEnemyBuildingCount,
                eligibleAttackerCount: eligible.length,
                reservedCombatantCount: managedReserve
                    ? partition.reserved.length
                    : undefined,
                reservedCombatantIds: managedReserve
                    ? partition.reserved.map(({ id }) => id).sort((a, b) => a - b)
                    : undefined,
                reservedActionCounts: managedReserve
                    ? delegatedActionCounts(partition.reserved, new Set())
                    : undefined,
                certifiedAttackerCount: selected?.attackers.length ?? 0,
                rejectedAttackerCountsByReason: countReasons(reasons.filter((reason) => reason !== "certified")),
                delegatedActionCounts: delegatedActionCounts(activeEligible, new Set()),
                assignedCombatantFraction: 0,
                lastPhysicalProgressTick: isProgressCertifiedPolicy(this.policy)
                    ? this.lastPhysicalProgressTick
                    : undefined,
                physicalNoProgressTicks: isProgressCertifiedPolicy(this.policy)
                    ? physicalNoProgressTicks
                    : undefined,
                missionStartedTick: isProgressCertifiedPolicy(this.policy) ? this.missionStartedTick : undefined,
                progressDeadlineExpired: isProgressCertifiedPolicy(this.policy) ? progressDeadlineExpired : undefined,
                terminalReserveReleased: isProgressCertifiedPolicy(this.policy) ? terminalReserveReleased : undefined,
            });
            return;
        }

        const bound = this.bindThreatState(
            game,
            tick,
            selected.target.unit,
            selected.attackers,
            selfUnits,
        );
        const thresholds = this.thresholds();
        const classification = classifyObjectiveThreats({
            attackers: selected.attackers.map(({ core }) => core),
            building: selected.opportunity.building,
            threats: bound.threats,
            baseAssets: bound.baseAssets,
            assetThreatProjections: bound.assetThreatProjections,
            directCompletionTicks: selected.opportunity.directCompletionTicks!,
            thresholds,
        });
        const blockerThenBuildingCompletionTicks = this.blockerCompletion(
            game,
            selected.attackers,
            classification.blockerIds,
            selected.opportunity.directCompletionTicks!,
            bound.threatUnitsById,
        );

        let decision: ObjectiveMissionDecision;
        if (this.policy.mechanism === "persistent_liveness") {
            decision = {
                kind: "building_strike",
                buildingId: selected.target.unit.id,
                predictedCompletionTicks: selected.opportunity.directCompletionTicks!,
                reason: retained ? "retain_committed_building" : "direct_objective_progress",
            };
        } else {
            const terminalMechanism = hasPublicObjectiveInterface(this.policy) ||
                this.policy.mechanism === "terminal_candidate" ||
                this.policy.mechanism === "full_sufficient_strike";
            const decide = isContinuousOffensePolicy(this.policy) || isProgressCertifiedPolicy(this.policy)
                ? selectContinuousObjectiveMission
                : selectObjectiveMission;
            decision = decide({
                attackers: selected.attackers.map(({ core }) => core),
                buildings: [selected.opportunity.building],
                selectedBuildingId: selected.target.unit.id,
                committedBuildingId: this.committedBuildingId,
                committedBuildingMadeProgress: this.committedBuildingMadeProgress ||
                    this.committedBlockerClear,
                threats: bound.threats,
                baseAssets: bound.baseAssets,
                assetThreatProjections: bound.assetThreatProjections,
                terminalEvidence: terminalMechanism
                    ? this.terminalEvidence()
                    : {
                        remainingKnownBuildingCount: 2,
                        allPreviouslyKnownAlternativesInvalidated: false,
                        searchCoverageFraction: this.searchCoverageFraction(),
                        requiredSearchCoverageFraction: this.policy.requiredSearchCoverageFraction,
                    },
                noProgressTicks,
                thresholds,
                blockerThenBuildingCompletionTicks,
                forceEngagementMode: isContinuousOffensePolicy(this.policy) || isProgressCertifiedPolicy(this.policy)
                    ? continuousForceEngagementMode(this.policy)
                    : undefined,
            });
        }

        let strike = selected.attackers;
        if (
            (hasPublicObjectiveInterface(this.policy) ||
                this.policy.mechanism === "full_sufficient_strike") &&
            (decision.kind === "building_strike" || decision.kind === "terminal_candidate_strike")
        ) {
            const threatDeadline = Math.min(
                classification.earliestLethalInterceptTick ?? Number.POSITIVE_INFINITY,
                (decision.kind === "terminal_candidate_strike"
                    ? null
                    : classification.earliestBaseDestructionTick) ?? Number.POSITIVE_INFINITY,
            );
            const deadline = Number.isFinite(threatDeadline)
                ? Math.max(0, threatDeadline - thresholds.directCompletionSafetyMarginTicks - 1)
                : decision.predictedCompletionTicks;
            const useFullForce = isProgressCertifiedPolicy(this.policy) ||
                isContinuousOffensePolicy(this.policy) && this.policy.strikeGroupMode === "full_compatible_force";
            const minimum = useFullForce ? null : selectMinimumSufficientObjectiveStrikeGroup({
                attackers: selected.attackers.map(({ core }) => core),
                building: selected.opportunity.building,
                completionDeadlineTicks: deadline,
            });
            if (minimum) {
                const minimumIds = new Set(minimum.attackers.map(({ id }) => id));
                const proposed = selected.attackers.filter(({ unit }) => minimumIds.has(unit.id));
                const rechecked = (isContinuousOffensePolicy(this.policy) || isProgressCertifiedPolicy(this.policy)
                    ? selectContinuousObjectiveMission
                    : selectObjectiveMission)({
                    attackers: proposed.map(({ core }) => core),
                    buildings: [selected.opportunity.building],
                    selectedBuildingId: selected.target.unit.id,
                    committedBuildingId: this.committedBuildingId,
                    committedBuildingMadeProgress: this.committedBuildingMadeProgress ||
                        this.committedBlockerClear,
                    threats: bound.threats,
                    baseAssets: bound.baseAssets,
                    assetThreatProjections: bound.assetThreatProjections,
                    terminalEvidence: this.terminalEvidence(),
                    noProgressTicks,
                    thresholds,
                    blockerThenBuildingCompletionTicks: null,
                    forceEngagementMode: isContinuousOffensePolicy(this.policy) || isProgressCertifiedPolicy(this.policy)
                        ? continuousForceEngagementMode(this.policy)
                        : undefined,
                });
                if (rechecked.kind === "building_strike" || rechecked.kind === "terminal_candidate_strike") {
                    strike = proposed;
                    decision = rechecked;
                }
            }
        }

        this.issueDecision(context, decision, selected.target, strike, bound.threatUnitsById);
        if (
            decision.kind === "building_strike" || decision.kind === "terminal_candidate_strike" ||
            decision.kind === "blocker_clear"
        ) {
            const nextBlockerClear = decision.kind === "blocker_clear";
            const missionChanged = this.committedBuildingId !== selected.target.unit.id ||
                this.committedBlockerClear !== nextBlockerClear;
            if (
                missionChanged && !isProgressCertifiedPolicy(this.policy)
            ) this.lastProgressTick = tick;
            if (missionChanged && isProgressCertifiedPolicy(this.policy)) this.missionStartedTick = tick;
            this.committedBuildingId = selected.target.unit.id;
            this.committedBlockerClear = nextBlockerClear;
            this.committedBlockerIds = new Set(
                decision.kind === "blocker_clear" ? decision.blockerIds : [],
            );
        }
        this.emit({
            schemaVersion: objectiveTelemetrySchemaVersion(this.policy),
            event: "decision",
            informationBoundary: objectiveInformationBoundary(this.policy),
            tick,
            mechanism: this.policy.mechanism,
            decisionKind: decision.kind,
            decisionReason: decision.reason,
            selectedBuildingId: selected.target.unit.id,
            selectedBuildingVisible: selected.target.visible,
            selectedBuildingObservedBy: selected.target.visible
                ? "vision"
                : selected.target.exact
                  ? "public_complete_state"
                  : "memory",
            selectedAttackerIds: strike.map(({ unit }) => unit.id).sort((a, b) => a - b),
            blockerIds: decision.kind === "blocker_clear" ? decision.blockerIds : classification.blockerIds,
            threatIds: decision.kind === "base_defense" || decision.kind === "predecessor_fallback"
                ? decision.threatIds
                : undefined,
            predictedCompletionTicks: "predictedCompletionTicks" in decision
                ? decision.predictedCompletionTicks
                : null,
            directCompletionTicks: selected.opportunity.directCompletionTicks,
            earliestLethalInterceptTick: classification.earliestLethalInterceptTick,
            earliestBaseDestructionTick: classification.earliestBaseDestructionTick,
            noProgressTicks,
            searchCoverageFraction: this.searchCoverageFraction(),
            activationReason: this.activationReason ?? undefined,
            exactEnemyBuildingCount: this.exactEnemyBuildingCount,
            eligibleAttackerCount: eligible.length,
            reservedCombatantCount: managedReserve
                ? partition.reserved.length
                : undefined,
            reservedCombatantIds: managedReserve
                ? partition.reserved.map(({ id }) => id).sort((a, b) => a - b)
                : undefined,
            reservedActionCounts: managedReserve
                ? delegatedActionCounts(partition.reserved, new Set())
                : undefined,
            certifiedAttackerCount: selected.attackers.length,
            rejectedAttackerCountsByReason: countReasons(activeEligible.map((unit) =>
                rejectionReason(game, unit, selected.target.unit, this.policy),
            ).filter((reason) => reason !== "certified")),
            selectedAttackerRulesNames: strike.map(({ unit }) => unit.rules.name).sort(),
            delegatedActionCounts: delegatedActionCounts(
                activeEligible,
                new Set(strike.map(({ unit }) => unit.id)),
            ),
            assignedCombatantFraction: activeEligible.length === 0 ? 0 : strike.length / activeEligible.length,
            lastPhysicalProgressTick: isProgressCertifiedPolicy(this.policy)
                ? this.lastPhysicalProgressTick
                : undefined,
            physicalNoProgressTicks: isProgressCertifiedPolicy(this.policy)
                ? physicalNoProgressTicks
                : undefined,
            missionStartedTick: isProgressCertifiedPolicy(this.policy) ? this.missionStartedTick : undefined,
            progressDeadlineExpired: isProgressCertifiedPolicy(this.policy) ? progressDeadlineExpired : undefined,
            terminalReserveReleased: isProgressCertifiedPolicy(this.policy) ? terminalReserveReleased : undefined,
            completeMissionCostTicks: isProgressCertifiedPolicy(this.policy)
                ? (classification.uncalibratedStrikeThreatIds.length === 0 &&
                    (classification.earliestLethalInterceptTick === null ||
                        selected.opportunity.directCompletionTicks! +
                            thresholds.directCompletionSafetyMarginTicks <
                                classification.earliestLethalInterceptTick)
                    ? selected.opportunity.directCompletionTicks
                    : blockerThenBuildingCompletionTicks)
                : undefined,
        });
    }

    private thresholds(): ObjectiveSchedulerThresholds {
        return {
            routeCorridorRadius: this.policy.routeCorridorRadius,
            interceptHorizonTicks: this.policy.interceptHorizonTicks,
            baseDefenseHorizonTicks: this.policy.baseDefenseHorizonTicks,
            blockerLethalDamageFraction: this.policy.blockerLethalDamageFraction,
            directCompletionSafetyMarginTicks: this.policy.directCompletionSafetyMarginTicks,
            missionLivenessTicks: missionLivenessTicks(this.policy),
        };
    }

    private terminalEvidence(): {
        remainingKnownBuildingCount: number;
        allPreviouslyKnownAlternativesInvalidated: boolean;
        searchCoverageFraction: number;
        requiredSearchCoverageFraction: number;
    } {
        const exact = hasPublicObjectiveInterface(this.policy) &&
            this.policy.informationInterface === "public_complete_state" &&
            this.exactEnemyBuildingCount !== null;
        return {
            remainingKnownBuildingCount: exact ? this.exactEnemyBuildingCount! : this.buildings.size,
            allPreviouslyKnownAlternativesInvalidated: exact
                ? this.exactEnemyBuildingCount === 1
                : this.buildings.size === 1,
            searchCoverageFraction: exact ? 1 : this.searchCoverageFraction(),
            requiredSearchCoverageFraction: this.policy.requiredSearchCoverageFraction,
        };
    }

    private bindThreatState(
        game: GameApi,
        tick: number,
        selectedBuilding: UnitData,
        attackers: readonly BoundAttacker[],
        selfUnits: readonly UnitData[],
    ): {
        threats: ObjectiveThreat[];
        baseAssets: ObjectiveBaseAsset[];
        assetThreatProjections: ObjectiveAssetThreatProjection[];
        threatUnitsById: Map<number, RememberedThreat>;
    } {
        const attackUnits = attackers.map(({ unit }) => unit);
        const threatUnitsById = new Map([...this.threats.entries()].filter(([id]) => id !== selectedBuilding.id));
        const threats = [...threatUnitsById.values()].map((remembered): ObjectiveThreat => {
            const unit = remembered.unit;
            const envelope = calibrateObjectiveThreatEnvelope(unit, attackUnits, mechanicsMultipliers(game, unit));
            const hiddenTicks = remembered.visible || remembered.exact
                ? 0
                : Math.max(0, tick - remembered.lastSeenTick);
            const special = (!remembered.visible && !remembered.exact) ||
                hasBridgeUncalibratedObjectiveMechanic(unit) ||
                !envelope.ordinaryDirectUpperBoundComplete;
            return {
                id: unit.id,
                ...point(unit),
                hitPoints: unit.hitPoints,
                speedTilesPerTick: envelope.speedTilesPerTick,
                rangeTiles: envelope.maximumObservedAntiGroundRangeTiles + envelope.speedTilesPerTick * hiddenTicks,
                damagePerVolleyToStrike: envelope.maximumApplicableDamagePerVolley,
                rateOfFireTicks: Math.max(1, envelope.minimumApplicableRateOfFireTicks),
                currentlyDamagingStrike: (remembered.visible || remembered.exact) &&
                    unit.attackState !== undefined && unit.attackState !== AttackState.Idle &&
                    attackers.some(({ unit: member }) =>
                        distance(point(unit), point(member)) <= envelope.maximumObservedAntiGroundRangeTiles,
                    ),
                initialCooldownTicks: envelope.minimumInitialCooldownTicks,
                calibrationStatus: special ? "uncalibrated_special" : "ordinary_direct_upper_bound",
            };
        });
        const selfBuildings = selfUnits.filter((unit) => unit.type === ObjectType.Building);
        const baseAssets: ObjectiveBaseAsset[] = selfBuildings.map((unit) => ({
            id: unit.id,
            ...point(unit),
            hitPoints: unit.hitPoints,
            soleSurvivingBuilding: selfBuildings.length === 1,
            lastRequiredCapability: false,
        }));
        const indispensable = new Set(baseAssets.filter((asset) =>
            asset.soleSurvivingBuilding || asset.lastRequiredCapability,
        ).map(({ id }) => id));
        const assetThreatProjections: ObjectiveAssetThreatProjection[] = [];
        for (const remembered of threatUnitsById.values()) {
            const unit = remembered.unit;
            for (const asset of selfBuildings.filter(({ id }) => indispensable.has(id))) {
                const envelope = calibrateObjectiveThreatEnvelope(unit, [asset], mechanicsMultipliers(game, unit));
                const special = (!remembered.visible && !remembered.exact) ||
                    hasBridgeUncalibratedObjectiveMechanic(unit) ||
                    !envelope.ordinaryDirectUpperBoundComplete;
                const firstVolleyTick = projectionFirstVolleyTick(
                    remembered,
                    asset,
                    envelope.maximumObservedAntiGroundRangeTiles,
                    envelope.speedTilesPerTick,
                    envelope.minimumInitialCooldownTicks,
                    tick,
                );
                if (firstVolleyTick === null) continue;
                assetThreatProjections.push({
                    threatId: unit.id,
                    assetId: asset.id,
                    firstVolleyTick,
                    damagePerVolley: envelope.maximumApplicableDamagePerVolley,
                    rateOfFireTicks: Math.max(1, envelope.minimumApplicableRateOfFireTicks),
                    calibrationStatus: special ? "uncalibrated_special" : "ordinary_direct_upper_bound",
                });
            }
        }
        return { threats, baseAssets, assetThreatProjections, threatUnitsById };
    }

    private blockerCompletion(
        game: GameApi,
        attackers: readonly BoundAttacker[],
        blockerIds: readonly number[],
        resumedBuildingCompletionTicks: number,
        threatUnitsById: ReadonlyMap<number, RememberedThreat>,
    ): number | null {
        const blockers = blockerIds.map((id) => threatUnitsById.get(id)?.unit)
            .filter((unit): unit is UnitData => !!unit);
        if (blockers.length !== blockerIds.length) return null;
        const forceAttackers: ObjectiveForceAttacker[] = attackers.flatMap(({ unit }) => {
            const divisors = new Map(blockers.map((target) => [target.id, armorDivisor(game, target)]));
            const multipliers = mechanicsMultipliers(game, unit);
            const friendlyCalibrationMode = hasPublicObjectiveInterface(this.policy)
                ? this.policy.friendlyCalibrationMode
                : null;
            const envelope = calibrateObjectiveAttackerEnvelope(
                unit,
                blockers,
                multipliers,
                divisors,
            );
            const uncalibratedFriendlyMechanic = friendlyCalibrationMode !== null
                ? blockers.some((target) => hasBridgeUncalibratedFriendlyObjectiveMechanic(
                    unit,
                    target,
                    friendlyCalibrationMode,
                    multipliers,
                    divisors.get(target.id) ?? 1,
                ))
                : hasBridgeUncalibratedObjectiveMechanic(unit);
            if (
                uncalibratedFriendlyMechanic ||
                envelope.uncalibratedTargetIds.length > 0 ||
                envelope.minimumSelectedDamagePerVolley <= 0 ||
                envelope.maximumSelectedRateOfFireTicks <= 0
            ) return [];
            const travelTicks = blockers.map((target) => conservativeObjectiveTravelTicks(
                game,
                unit,
                target,
                envelope.minimumSelectedRangeTiles,
                envelope.speedTilesPerTick,
            ));
            if (travelTicks.some((value) => value === null)) return [];
            return [{
                id: unit.id,
                ...point(unit),
                speedTilesPerTick: envelope.speedTilesPerTick,
                rangeTiles: envelope.minimumSelectedRangeTiles,
                forceDamagePerVolley: envelope.minimumSelectedDamagePerVolley,
                forceRateOfFireTicks: envelope.maximumSelectedRateOfFireTicks,
                initialCooldownTicks: Math.max(
                    envelope.maximumInitialCooldownTicks + envelope.maximumSelectedProjectileTravelTicks,
                    ...(travelTicks as number[]),
                ),
            }];
        });
        return estimateBlockerThenBuildingCompletionTicks({
            attackers: forceAttackers,
            blockers: blockers.map((unit) => ({ id: unit.id, ...point(unit), hitPoints: unit.hitPoints })),
            resumedBuildingCompletionTicks,
            reassessmentTicks: this.policy.blockerReassessmentTicks,
        });
    }

    private issueDecision(
        context: StrategyContext,
        decision: ObjectiveMissionDecision,
        target: RememberedBuilding,
        attackers: readonly BoundAttacker[],
        threatUnitsById: ReadonlyMap<number, RememberedThreat>,
    ): void {
        const ids = attackers.map(({ unit }) => unit.id);
        if (ids.length === 0) return;
        if (decision.kind === "building_strike" || decision.kind === "terminal_candidate_strike") {
            if (target.visible || target.exact) {
                context.player.actions.orderUnits(ids, OrderType.Attack, target.unit.id);
            }
            else context.player.actions.orderUnits(ids, OrderType.AttackMove, target.unit.tile.rx, target.unit.tile.ry);
            return;
        }
        if (decision.kind === "blocker_clear") {
            const blocker = decision.blockerIds.map((id) => threatUnitsById.get(id))
                .find((value) => value?.visible || value?.exact);
            if (blocker) context.player.actions.orderUnits(ids, OrderType.Attack, blocker.unit.id);
            return;
        }
        if (decision.kind === "base_defense") {
            const threat = decision.threatIds.map((id) => threatUnitsById.get(id))
                .find((value) => value?.visible || value?.exact);
            if (threat) context.player.actions.orderUnits(ids, OrderType.Attack, threat.unit.id);
        }
    }

    private issueSearch(
        context: StrategyContext,
        eligible: readonly UnitData[],
        tick: number,
        noProgressTicks: number,
        totalEligibleCount: number = eligible.length,
        reservedCombatantCount?: number,
        reservedCombatants: readonly UnitData[] = [],
    ): void {
        if (eligible.length === 0 || this.searchPoints === null) return;
        const ranked = this.searchPoints.slice().sort((left, right) => {
            const leftRecent = tick < left.lastOrderedTick + this.policy.searchRevisitTicks ? 1 : 0;
            const rightRecent = tick < right.lastOrderedTick + this.policy.searchRevisitTicks ? 1 : 0;
            const leftNeverObserved = left.lastObservedTick === Number.NEGATIVE_INFINITY ? 1 : 0;
            const rightNeverObserved = right.lastObservedTick === Number.NEGATIVE_INFINITY ? 1 : 0;
            return leftRecent - rightRecent ||
                rightNeverObserved - leftNeverObserved ||
                Number(right.publicEnemyStart) - Number(left.publicEnemyStart) ||
                (leftNeverObserved ? 0 : left.lastObservedTick - right.lastObservedTick) ||
                left.lastOrderedTick - right.lastOrderedTick || left.key.localeCompare(right.key);
        }).slice(0, this.policy.maxSearchGroups);
        const assignments = new Map<string, { target: SearchPoint; ids: number[] }>();
        const assignedIds: number[] = [];
        for (const unit of eligible.slice().sort((a, b) => a.id - b.id)) {
            const reachable = ranked.filter((target) => canReachSearchPoint(context.game, unit, target));
            const target = reachable.reduce<SearchPoint | null>((best, candidate) => {
                if (!best) return candidate;
                const bestLoad = assignments.get(best.key)?.ids.length ?? 0;
                const candidateLoad = assignments.get(candidate.key)?.ids.length ?? 0;
                return candidateLoad < bestLoad ||
                    candidateLoad === bestLoad && distance(point(unit), candidate) < distance(point(unit), best)
                    ? candidate
                    : best;
            }, null);
            if (!target) continue;
            const current = assignments.get(target.key) ?? { target, ids: [] };
            current.ids.push(unit.id);
            assignedIds.push(unit.id);
            assignments.set(target.key, current);
        }
        for (const { target, ids } of assignments.values()) {
            target.lastOrderedTick = tick;
            context.player.actions.orderUnits(ids, OrderType.AttackMove, target.x, target.y);
        }
        this.emit({
            schemaVersion: objectiveTelemetrySchemaVersion(this.policy),
            event: "search_orders",
            informationBoundary: objectiveInformationBoundary(this.policy),
            tick,
            mechanism: this.policy.mechanism,
            decisionKind: "search",
            decisionReason: noProgressTicks >= missionLivenessTicks(this.policy)
                ? "offensive_liveness_deadline"
                : "no_known_building",
            selectedBuildingId: null,
            selectedAttackerIds: assignedIds.sort((a, b) => a - b),
            noProgressTicks,
            searchCoverageFraction: this.searchCoverageFraction(),
            searchPointCount: ranked.length,
            activationReason: this.activationReason ?? undefined,
            exactEnemyBuildingCount: this.exactEnemyBuildingCount,
            eligibleAttackerCount: totalEligibleCount,
            reservedCombatantCount,
            reservedCombatantIds: reservedCombatantCount === undefined
                ? undefined
                : reservedCombatants.map(({ id }) => id).sort((a, b) => a - b),
            reservedActionCounts: reservedCombatantCount === undefined
                ? undefined
                : delegatedActionCounts(reservedCombatants, new Set()),
            certifiedAttackerCount: 0,
            delegatedActionCounts: delegatedActionCounts(eligible, new Set(assignedIds)),
            assignedCombatantFraction: eligible.length === 0 ? 0 : assignedIds.length / eligible.length,
        });
    }

    private updateMemory(game: GameApi, playerName: string, tick: number): void {
        const publicComplete = hasPublicObjectiveInterface(this.policy) &&
            this.policy.informationInterface === "public_complete_state";
        const actuallyVisibleEnemyIds = new Set(game.getVisibleUnits(playerName, "enemy"));
        const visibleBuildings = publicComplete
            ? publicEnemyUnits(game, playerName, (unit) => unit.type === ObjectType.Building)
            : game.getVisibleUnits(
                playerName,
                "enemy",
                (rules) => rules.type === ObjectType.Building,
            ).map((id) => game.getUnitData(id)).filter((unit): unit is UnitData => !!unit);
        this.exactEnemyBuildingCount = publicComplete ? visibleBuildings.length : null;
        if (this.exactEnemyBuildingCount !== null) {
            this.maximumObservedExactEnemyBuildingCount = Math.max(
                this.maximumObservedExactEnemyBuildingCount,
                this.exactEnemyBuildingCount,
            );
        }
        const visibleBuildingIds = new Set(visibleBuildings.map(({ id }) => id));
        for (const unit of visibleBuildings) {
            const previous = this.buildings.get(unit.id);
            const madeProgress = previous !== undefined && unit.hitPoints < previous.unit.hitPoints;
            if (madeProgress) {
                this.lastProgressTick = tick;
                this.lastPhysicalProgressTick = tick;
                if (this.committedBuildingId === unit.id) this.committedBuildingMadeProgress = true;
            }
            this.buildings.set(unit.id, {
                unit: snapshotUnit(unit),
                visible: actuallyVisibleEnemyIds.has(unit.id),
                exact: publicComplete,
                lastSeenTick: tick,
                lastDamageTick: madeProgress ? tick : previous?.lastDamageTick ?? tick,
            });
        }
        const invalidated: number[] = [];
        for (const [id, remembered] of this.buildings) {
            if (visibleBuildingIds.has(id)) continue;
            if (publicComplete) {
                this.buildings.delete(id);
                invalidated.push(id);
                if (this.committedBuildingId === id) {
                    this.committedBuildingId = null;
                    this.committedBuildingMadeProgress = false;
                    this.committedBlockerClear = false;
                    this.committedBlockerIds.clear();
                    this.lastProgressTick = tick;
                    this.lastPhysicalProgressTick = tick;
                }
                continue;
            }
            remembered.visible = false;
            if (entireFoundationVisible(game, playerName, remembered.unit)) {
                this.buildings.delete(id);
                invalidated.push(id);
                if (this.committedBuildingId === id) {
                    this.committedBuildingId = null;
                    this.committedBuildingMadeProgress = false;
                    this.committedBlockerClear = false;
                    this.committedBlockerIds.clear();
                    this.lastProgressTick = tick;
                    this.lastPhysicalProgressTick = tick;
                }
            }
        }

        const visibleThreats = (publicComplete
            ? publicEnemyUnits(game, playerName, (unit) =>
                !!unit.rules.isSelectableCombatant &&
                (unit.type !== ObjectType.Building || !!unit.rules.isBaseDefense),
            )
            : game.getVisibleUnits(playerName, "enemy", (rules) =>
                !!rules.isSelectableCombatant &&
                [rules.type].every((type) => type !== ObjectType.Building || rules.isBaseDefense) &&
                (!!rules.c4 || !!rules.ivan || !!rules.spawns || !!rules.engineer ||
                    !!rules.isBaseDefense || !!rules.isSelectableCombatant),
            ).map((id) => game.getUnitData(id)).filter((unit): unit is UnitData => !!unit))
            .filter((unit) => [unit.primaryWeapon, unit.secondaryWeapon].some((weapon) =>
                !!weapon?.projectileRules.isAntiGround,
            ) || hasBridgeUncalibratedObjectiveMechanic(unit));
        const visibleThreatIds = new Set(visibleThreats.map(({ id }) => id));
        for (const unit of visibleThreats) {
            const previous = this.threats.get(unit.id);
            if (
                previous && unit.hitPoints < previous.unit.hitPoints &&
                this.committedBlockerIds.has(unit.id)
            ) {
                this.lastProgressTick = tick;
                this.lastPhysicalProgressTick = tick;
            }
            this.threats.set(unit.id, {
                unit: snapshotUnit(unit),
                visible: actuallyVisibleEnemyIds.has(unit.id),
                exact: publicComplete,
                lastSeenTick: tick,
            });
        }
        for (const [id, remembered] of this.threats) {
            if (visibleThreatIds.has(id)) continue;
            if (publicComplete) {
                this.threats.delete(id);
                if (this.committedBlockerIds.delete(id)) {
                    this.lastProgressTick = tick;
                    this.lastPhysicalProgressTick = tick;
                }
                continue;
            }
            remembered.visible = false;
            if (this.uncertaintyRegionFullyObserved(game, playerName, remembered, tick)) {
                this.threats.delete(id);
                if (this.committedBlockerIds.delete(id)) {
                    this.lastProgressTick = tick;
                    this.lastPhysicalProgressTick = tick;
                }
            }
        }
        if (invalidated.length > 0) {
            this.emit({
                schemaVersion: objectiveTelemetrySchemaVersion(this.policy),
                event: "memory_invalidated",
                informationBoundary: objectiveInformationBoundary(this.policy),
                tick,
                mechanism: this.policy.mechanism,
                invalidatedBuildingIds: invalidated.sort((a, b) => a - b),
            });
        }
    }

    private updateSearchCoverage(game: GameApi, playerName: string, tick: number): void {
        if (this.searchPoints === null) {
            const { width, height } = game.map.getRealMapSize();
            const ownStart = game.getPlayerData(playerName).startLocation;
            const enemyStarts = game.map.getStartingLocations().filter((start) =>
                start.x !== ownStart.x || start.y !== ownStart.y,
            );
            const points = new Map<string, SearchPoint>();
            const add = (x: number, y: number, publicEnemyStart: boolean): void => {
                const tile = game.map.getTile(x, y);
                if (!tile) return;
                const key = `${tile.rx},${tile.ry}`;
                const previous = points.get(key);
                points.set(key, {
                    key,
                    x: tile.rx,
                    y: tile.ry,
                    publicEnemyStart: publicEnemyStart || previous?.publicEnemyStart === true,
                    lastObservedTick: Number.NEGATIVE_INFINITY,
                    lastOrderedTick: Number.NEGATIVE_INFINITY,
                });
            };
            for (const start of enemyStarts) add(start.x, start.y, true);
            for (let x = 0; x < width; x += this.policy.searchCellSize) {
                for (let y = 0; y < height; y += this.policy.searchCellSize) {
                    add(
                        x + Math.floor(this.policy.searchCellSize / 2),
                        y + Math.floor(this.policy.searchCellSize / 2),
                        false,
                    );
                }
            }
            this.searchPoints = [...points.values()];
        }
        for (const search of this.searchPoints) {
            const tile = game.map.getTile(search.x, search.y);
            if (tile && game.map.isVisibleTile(tile, playerName)) search.lastObservedTick = tick;
        }
    }

    private uncertaintyRegionFullyObserved(
        game: GameApi,
        playerName: string,
        remembered: RememberedThreat,
        tick: number,
    ): boolean {
        const multipliers = mechanicsMultipliers(game, remembered.unit);
        const speed = Math.max(0, remembered.unit.rules.speed / 256 * multipliers.speedMultiplier);
        const radius = Math.ceil(speed * Math.max(0, tick - remembered.lastSeenTick));
        // This exact bounded check removes a just-destroyed blocker. Beyond the
        // bound, retaining memory is conservative and avoids a full-map scan.
        if (radius > 8) return false;
        const { left, top, right, bottom } = foundationBounds(remembered.unit);
        for (let x = left - radius; x <= right + radius; x += 1) {
            for (let y = top - radius; y <= bottom + radius; y += 1) {
                const dx = x < left ? left - x : x > right ? x - right : 0;
                const dy = y < top ? top - y : y > bottom ? y - bottom : 0;
                if (Math.hypot(dx, dy) > radius) continue;
                const tile = game.map.getTile(x, y);
                if (!tile || !game.map.isVisibleTile(tile, playerName)) return false;
            }
        }
        return true;
    }

    private searchCoverageFraction(): number {
        if (!this.searchPoints || this.searchPoints.length === 0) return 0;
        return this.searchPoints.filter(({ lastObservedTick }) =>
            lastObservedTick !== Number.NEGATIVE_INFINITY,
        ).length / this.searchPoints.length;
    }

    private emit(event: TerminalObjectiveTelemetry): void {
        const signature = JSON.stringify({ ...event, tick: 0 });
        const previous = this.lastTelemetry.get(event.event);
        if (previous && previous.signature === signature && event.tick < previous.tick + 120) return;
        this.telemetry(event);
        this.lastTelemetry.set(event.event, { signature, tick: event.tick });
    }
}

export const createTerminalObjectiveCandidate = (
    baselineFactory: BaselineFactory,
    name: string,
    country: Countries,
    rawPolicy: ObjectiveOverlayPolicy,
    telemetry: TelemetrySink = () => undefined,
): InspectableBaselineBot => {
    const policy = rawPolicy.schemaVersion === 4
        ? validateProgressCertifiedConversionPolicy(rawPolicy as ProgressCertifiedConversionPolicy)
        : rawPolicy.schemaVersion === 3
        ? validateContinuousOffensePolicy(rawPolicy as ContinuousOffensePolicy)
        : rawPolicy.schemaVersion === 2
          ? validateTerminalRacePolicy(rawPolicy as TerminalRacePolicy)
          : validateTerminalObjectivePolicy(rawPolicy as TerminalObjectivePolicy);
    if (!policy.enabled) return baselineFactory.create(name, country);
    if (!baselineFactory.createDefaultStrategy || !baselineFactory.createWithStrategy) {
        throw new Error("Baseline factory does not expose the terminal-objective strategy interface");
    }
    const inner = baselineFactory.createDefaultStrategy();
    if (!inner || typeof (inner as StrategyLike).onAiUpdate !== "function") {
        throw new Error("Pinned baseline factory did not provide a valid external DefaultStrategy");
    }
    return baselineFactory.createWithStrategy(
        name,
        country,
        new TerminalObjectiveStrategy(inner as StrategyLike, country, policy, telemetry),
    );
};
