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
    selectMinimumSufficientObjectiveStrikeGroup,
    selectObjectiveMission,
} from "@supalosa/chronodivide-bot/dist/bot/logic/objective/terminalObjectiveDecisionCore.js";
import {
    calibrateObjectiveAttackerEnvelope,
    calibrateObjectiveThreatEnvelope,
    calibrateObjectiveUnitMechanics,
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
    lastSeenTick: number;
    lastDamageTick: number;
};

type RememberedThreat = {
    unit: UnitData;
    visible: boolean;
    lastSeenTick: number;
};

type SearchPoint = Point & {
    key: string;
    publicEnemyStart: boolean;
    lastObservedTick: number;
    lastOrderedTick: number;
};

export type TerminalObjectiveTelemetry = {
    schemaVersion: 1;
    event: "decision" | "search_orders" | "memory_invalidated";
    informationBoundary: typeof TERMINAL_OBJECTIVE_INFORMATION_BOUNDARY;
    tick: number;
    mechanism: TerminalObjectivePolicy["mechanism"];
    decisionKind?: ObjectiveMissionDecision["kind"];
    decisionReason?: string;
    selectedBuildingId?: number | null;
    selectedBuildingVisible?: boolean;
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
};

type TelemetrySink = (event: TerminalObjectiveTelemetry) => void;

const DOGS = new Set(["DOG", "ADOG"]);

const point = (unit: UnitData): Point => ({ x: unit.tile.rx, y: unit.tile.ry });
const distance = (left: Point, right: Point): number => Math.hypot(left.x - right.x, left.y - right.y);

const snapshotUnit = (unit: UnitData): UnitData => ({
    ...unit,
    tile: { ...unit.tile },
    worldPosition: unit.worldPosition.clone(),
    foundation: { ...unit.foundation },
});

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
): BoundAttacker | null => {
    if (!isMobileAntiGroundCombatant(unit) || hasBridgeUncalibratedObjectiveMechanic(unit)) return null;
    const mechanics = calibrateObjectiveUnitMechanics(
        unit,
        target,
        mechanicsMultipliers(game, unit),
        armorDivisor(game, target),
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
    const uncertainty = source.visible ? 0 : speed * Math.max(0, tick - source.lastSeenTick);
    const travel = Math.max(0, distanceToFoundation(point(source.unit), target) - uncertainty - range);
    if (travel > 0 && speed <= 0) return null;
    return Math.max(Math.ceil(travel / Math.max(speed, Number.EPSILON)), Math.max(0, Math.floor(cooldown)));
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
    private lastOrderTick = Number.NEGATIVE_INFINITY;
    private lastTelemetry = new Map<string, { signature: string; tick: number }>();

    constructor(
        private inner: StrategyLike,
        private readonly country: Countries,
        private readonly policy: TerminalObjectivePolicy,
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
        this.updateMemory(game, player.name, tick);
        this.updateSearchCoverage(game, player.name, tick);
        if (tick < this.policy.minTick || tick < this.lastOrderTick + this.policy.orderIntervalTicks) return;
        this.lastOrderTick = tick;

        const selfUnits = game.getVisibleUnits(player.name, "self")
            .map((id) => game.getUnitData(id))
            .filter((unit): unit is UnitData => !!unit);
        const eligible = selfUnits.filter(isMobileAntiGroundCombatant);
        const noProgressTicks = Math.max(0, tick - this.lastProgressTick);
        if (
            this.committedBuildingId !== null &&
            (!this.buildings.has(this.committedBuildingId) || noProgressTicks >= this.policy.missionLivenessTicks)
        ) {
            this.committedBuildingId = null;
            this.committedBuildingMadeProgress = false;
            this.committedBlockerClear = false;
            this.committedBlockerIds.clear();
        }

        if (this.buildings.size === 0) {
            this.issueSearch(context, eligible, tick, noProgressTicks);
            return;
        }

        const candidates = [...this.buildings.values()].map((target) => {
            const attackers = eligible.map((unit) => bindAttacker(game, unit, target.unit))
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
        const retained = this.committedBuildingId !== null &&
            (this.committedBuildingMadeProgress || this.committedBlockerClear) &&
            noProgressTicks < this.policy.missionLivenessTicks
            ? candidates.find(({ target }) => target.unit.id === this.committedBuildingId)
            : undefined;
        const rankedIds = rankObjectiveBuildingOpportunities(candidates.map(({ opportunity }) => opportunity))
            .map(({ building }) => building.id);
        const selected = retained ?? rankedIds.map((id) =>
            candidates.find(({ target }) => target.unit.id === id),
        ).find((value) => value?.opportunity.directCompletionTicks !== null);
        if (!selected || selected.attackers.length === 0) {
            this.emit({
                schemaVersion: 1,
                event: "decision",
                informationBoundary: TERMINAL_OBJECTIVE_INFORMATION_BOUNDARY,
                tick,
                mechanism: this.policy.mechanism,
                decisionKind: "regroup",
                decisionReason: "no_capable_strike_group",
                selectedBuildingId: selected?.target.unit.id ?? null,
                selectedAttackerIds: [],
                noProgressTicks,
                searchCoverageFraction: this.searchCoverageFraction(),
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
            const terminalMechanism = this.policy.mechanism === "terminal_candidate" ||
                this.policy.mechanism === "full_sufficient_strike";
            decision = selectObjectiveMission({
                attackers: selected.attackers.map(({ core }) => core),
                buildings: [selected.opportunity.building],
                selectedBuildingId: selected.target.unit.id,
                committedBuildingId: this.committedBuildingId,
                committedBuildingMadeProgress: this.committedBuildingMadeProgress ||
                    this.committedBlockerClear,
                threats: bound.threats,
                baseAssets: bound.baseAssets,
                assetThreatProjections: bound.assetThreatProjections,
                terminalEvidence: {
                    remainingKnownBuildingCount: terminalMechanism ? this.buildings.size : 2,
                    allPreviouslyKnownAlternativesInvalidated: this.buildings.size === 1,
                    searchCoverageFraction: this.searchCoverageFraction(),
                    requiredSearchCoverageFraction: this.policy.requiredSearchCoverageFraction,
                },
                noProgressTicks,
                thresholds,
                blockerThenBuildingCompletionTicks,
            });
        }

        let strike = selected.attackers;
        if (
            this.policy.mechanism === "full_sufficient_strike" &&
            (decision.kind === "building_strike" || decision.kind === "terminal_candidate_strike")
        ) {
            const threatDeadline = Math.min(
                classification.earliestLethalInterceptTick ?? Number.POSITIVE_INFINITY,
                classification.earliestBaseDestructionTick ?? Number.POSITIVE_INFINITY,
            );
            const deadline = Number.isFinite(threatDeadline)
                ? Math.max(0, threatDeadline - thresholds.directCompletionSafetyMarginTicks - 1)
                : decision.predictedCompletionTicks;
            const minimum = selectMinimumSufficientObjectiveStrikeGroup({
                attackers: selected.attackers.map(({ core }) => core),
                building: selected.opportunity.building,
                completionDeadlineTicks: deadline,
            });
            if (minimum) {
                const minimumIds = new Set(minimum.attackers.map(({ id }) => id));
                const proposed = selected.attackers.filter(({ unit }) => minimumIds.has(unit.id));
                const rechecked = selectObjectiveMission({
                    attackers: proposed.map(({ core }) => core),
                    buildings: [selected.opportunity.building],
                    selectedBuildingId: selected.target.unit.id,
                    committedBuildingId: this.committedBuildingId,
                    committedBuildingMadeProgress: this.committedBuildingMadeProgress ||
                        this.committedBlockerClear,
                    threats: bound.threats,
                    baseAssets: bound.baseAssets,
                    assetThreatProjections: bound.assetThreatProjections,
                    terminalEvidence: {
                        remainingKnownBuildingCount: this.buildings.size,
                        allPreviouslyKnownAlternativesInvalidated: this.buildings.size === 1,
                        searchCoverageFraction: this.searchCoverageFraction(),
                        requiredSearchCoverageFraction: this.policy.requiredSearchCoverageFraction,
                    },
                    noProgressTicks,
                    thresholds,
                    blockerThenBuildingCompletionTicks: null,
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
            if (
                this.committedBuildingId !== selected.target.unit.id ||
                this.committedBlockerClear !== nextBlockerClear
            ) this.lastProgressTick = tick;
            this.committedBuildingId = selected.target.unit.id;
            this.committedBlockerClear = nextBlockerClear;
            this.committedBlockerIds = new Set(
                decision.kind === "blocker_clear" ? decision.blockerIds : [],
            );
        }
        this.emit({
            schemaVersion: 1,
            event: "decision",
            informationBoundary: TERMINAL_OBJECTIVE_INFORMATION_BOUNDARY,
            tick,
            mechanism: this.policy.mechanism,
            decisionKind: decision.kind,
            decisionReason: decision.reason,
            selectedBuildingId: selected.target.unit.id,
            selectedBuildingVisible: selected.target.visible,
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
        });
    }

    private thresholds(): ObjectiveSchedulerThresholds {
        return {
            routeCorridorRadius: this.policy.routeCorridorRadius,
            interceptHorizonTicks: this.policy.interceptHorizonTicks,
            baseDefenseHorizonTicks: this.policy.baseDefenseHorizonTicks,
            blockerLethalDamageFraction: this.policy.blockerLethalDamageFraction,
            directCompletionSafetyMarginTicks: this.policy.directCompletionSafetyMarginTicks,
            missionLivenessTicks: this.policy.missionLivenessTicks,
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
            const hiddenTicks = remembered.visible ? 0 : Math.max(0, tick - remembered.lastSeenTick);
            const special = !remembered.visible || hasBridgeUncalibratedObjectiveMechanic(unit) ||
                !envelope.ordinaryDirectUpperBoundComplete;
            return {
                id: unit.id,
                ...point(unit),
                hitPoints: unit.hitPoints,
                speedTilesPerTick: envelope.speedTilesPerTick,
                rangeTiles: envelope.maximumObservedAntiGroundRangeTiles + envelope.speedTilesPerTick * hiddenTicks,
                damagePerVolleyToStrike: envelope.maximumApplicableDamagePerVolley,
                rateOfFireTicks: Math.max(1, envelope.minimumApplicableRateOfFireTicks),
                currentlyDamagingStrike: remembered.visible &&
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
                const special = !remembered.visible || hasBridgeUncalibratedObjectiveMechanic(unit) ||
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
            const envelope = calibrateObjectiveAttackerEnvelope(
                unit,
                blockers,
                mechanicsMultipliers(game, unit),
                divisors,
            );
            if (
                hasBridgeUncalibratedObjectiveMechanic(unit) ||
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
            if (target.visible) context.player.actions.orderUnits(ids, OrderType.Attack, target.unit.id);
            else context.player.actions.orderUnits(ids, OrderType.AttackMove, target.unit.tile.rx, target.unit.tile.ry);
            return;
        }
        if (decision.kind === "blocker_clear") {
            const blocker = decision.blockerIds.map((id) => threatUnitsById.get(id)).find((value) => value?.visible);
            if (blocker) context.player.actions.orderUnits(ids, OrderType.Attack, blocker.unit.id);
            return;
        }
        if (decision.kind === "base_defense") {
            const threat = decision.threatIds.map((id) => threatUnitsById.get(id)).find((value) => value?.visible);
            if (threat) context.player.actions.orderUnits(ids, OrderType.Attack, threat.unit.id);
        }
    }

    private issueSearch(
        context: StrategyContext,
        eligible: readonly UnitData[],
        tick: number,
        noProgressTicks: number,
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
            schemaVersion: 1,
            event: "search_orders",
            informationBoundary: TERMINAL_OBJECTIVE_INFORMATION_BOUNDARY,
            tick,
            mechanism: this.policy.mechanism,
            decisionKind: "search",
            decisionReason: noProgressTicks >= this.policy.missionLivenessTicks
                ? "offensive_liveness_deadline"
                : "no_known_building",
            selectedBuildingId: null,
            selectedAttackerIds: assignedIds.sort((a, b) => a - b),
            noProgressTicks,
            searchCoverageFraction: this.searchCoverageFraction(),
            searchPointCount: ranked.length,
        });
    }

    private updateMemory(game: GameApi, playerName: string, tick: number): void {
        const visibleBuildings = game.getVisibleUnits(
            playerName,
            "enemy",
            (rules) => rules.type === ObjectType.Building,
        ).map((id) => game.getUnitData(id)).filter((unit): unit is UnitData => !!unit);
        const visibleBuildingIds = new Set(visibleBuildings.map(({ id }) => id));
        for (const unit of visibleBuildings) {
            const previous = this.buildings.get(unit.id);
            const madeProgress = previous !== undefined && unit.hitPoints < previous.unit.hitPoints;
            if (madeProgress) {
                this.lastProgressTick = tick;
                if (this.committedBuildingId === unit.id) this.committedBuildingMadeProgress = true;
            }
            this.buildings.set(unit.id, {
                unit: snapshotUnit(unit),
                visible: true,
                lastSeenTick: tick,
                lastDamageTick: madeProgress ? tick : previous?.lastDamageTick ?? tick,
            });
        }
        const invalidated: number[] = [];
        for (const [id, remembered] of this.buildings) {
            if (visibleBuildingIds.has(id)) continue;
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
                }
            }
        }

        const visibleThreats = game.getVisibleUnits(playerName, "enemy", (rules) =>
            !!rules.isSelectableCombatant &&
            [rules.type].every((type) => type !== ObjectType.Building || rules.isBaseDefense) &&
            (!!rules.c4 || !!rules.ivan || !!rules.spawns || !!rules.engineer ||
                !!rules.isBaseDefense || !!rules.isSelectableCombatant),
        ).map((id) => game.getUnitData(id)).filter((unit): unit is UnitData => !!unit)
            .filter((unit) => [unit.primaryWeapon, unit.secondaryWeapon].some((weapon) =>
                !!weapon?.projectileRules.isAntiGround,
            ) || hasBridgeUncalibratedObjectiveMechanic(unit));
        const visibleThreatIds = new Set(visibleThreats.map(({ id }) => id));
        for (const unit of visibleThreats) {
            const previous = this.threats.get(unit.id);
            if (
                previous && unit.hitPoints < previous.unit.hitPoints &&
                this.committedBlockerIds.has(unit.id)
            ) this.lastProgressTick = tick;
            this.threats.set(unit.id, { unit: snapshotUnit(unit), visible: true, lastSeenTick: tick });
        }
        for (const [id, remembered] of this.threats) {
            if (visibleThreatIds.has(id)) continue;
            remembered.visible = false;
            if (this.uncertaintyRegionFullyObserved(game, playerName, remembered, tick)) {
                this.threats.delete(id);
                if (this.committedBlockerIds.delete(id)) this.lastProgressTick = tick;
            }
        }
        if (invalidated.length > 0) {
            this.emit({
                schemaVersion: 1,
                event: "memory_invalidated",
                informationBoundary: TERMINAL_OBJECTIVE_INFORMATION_BOUNDARY,
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
    rawPolicy: TerminalObjectivePolicy,
    telemetry: TelemetrySink = () => undefined,
): InspectableBaselineBot => {
    const policy = validateTerminalObjectivePolicy(rawPolicy);
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
