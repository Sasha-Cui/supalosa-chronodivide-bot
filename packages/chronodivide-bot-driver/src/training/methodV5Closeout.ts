import { createHash } from "node:crypto";
import {
    ArmorType,
    FactoryType,
    GameApi,
    ObjectType,
    OrderType,
    QueueType,
    SpeedType,
    TechnoRules,
    Tile,
    UnitData,
} from "@chronodivide/game-api";
import { Countries } from "@supalosa/chronodivide-bot/dist/bot/logic/common/utils.js";
import { BaselineFactory, InspectableBaselineBot } from "../benchmark/baselineLoader.js";

export const METHOD_V5_CLOSEOUT_POLICY_SCHEMA_VERSION = 1 as const;
export const METHOD_V5_INFORMATION_BOUNDARY =
    "self-visible-enemy-memory-public-map-and-starts-only" as const;

export type MethodV5CloseoutPolicy = {
    schemaVersion: typeof METHOD_V5_CLOSEOUT_POLICY_SCHEMA_VERSION;
    enabled: boolean;
    minTick: number;
    minCombatants: number;
    homeDefenseRadius: number;
    maxVisibleEnemyCombatants: number;
    visibleCombatantAdvantage: number;
    reserveCombatants: number;
    orderIntervalTicks: number;
    maxTargetGroups: number;
    targetPriority: "production" | "defense" | "nearest";
    memoryEnabled: boolean;
    searchEnabled: boolean;
    searchCellSize: number;
    searchRevisitTicks: number;
    directVisibleAttack: boolean;
    preemptBaselineOrders: boolean;
    capabilityAware: boolean;
    reachabilityAware: boolean;
    stallTicks: number;
    adaptiveProductionEnabled: boolean;
    adaptiveAirTargetCount: number;
    adaptiveProductionPriority: number;
    adaptiveTechPriority: number;
};

export type MethodV5CloseoutTelemetry =
    | {
          schemaVersion: 1;
          event: "activated";
          tick: number;
          ownEligibleCombatants: number;
          reserveCombatants: number;
      }
    | {
          schemaVersion: 1;
          event: "memory_invalidated";
          tick: number;
          invalidatedCount: number;
      }
    | {
          schemaVersion: 1;
          event: "orders_paused_for_visible_threat";
          tick: number;
          ownEligibleCombatants: number;
          visibleEnemyCombatants: number;
          reserveCombatants: number;
      }
    | {
          schemaVersion: 1;
          event: "target_orders";
          tick: number;
          attackerCount: number;
          visibleTargetCount: number;
          rememberedTargetCount: number;
          assignedTargetCount: number;
      }
    | {
          schemaVersion: 1;
          event: "search_orders";
          tick: number;
          attackerCount: number;
          searchPointCount: number;
      }
    | {
          schemaVersion: 1;
          event: "capability_request";
          tick: number;
          unitName: "JUMPJET" | "ZEP";
          targetCount: number;
          currentCount: number;
          requestedStructure: string | null;
      };

type TelemetrySink = (event: MethodV5CloseoutTelemetry) => void;

type Point = { x: number; y: number };

type RememberedBuilding = Point & {
    id: number;
    name: string;
    hitPoints: number;
    maxHitPoints: number;
    lastSeenTick: number;
    lastDamageTick: number;
    constructionYard: boolean;
    production: boolean;
    power: boolean;
    defense: boolean;
    refinery: boolean;
    armor: ArmorType;
    canC4: boolean;
};

type SearchPoint = Point & {
    key: string;
    publicEnemyStart: boolean;
    lastObservedTick: number;
    lastOrderedTick: number;
};

type StrategyContext = {
    game: GameApi;
    player: {
        name: string;
        actions: NonNullable<InspectableBaselineBot["lastPlayerActions"]>;
        production: NonNullable<InspectableBaselineBot["lastPlayerProduction"]>;
    };
};

type StrategyLike = {
    onAiUpdate(context: StrategyContext, missionController: MissionControllerLike, logger: Logger): unknown;
};

type Logger = (message: string, sayInGame?: boolean) => void;

type StructuralMission = {
    isActive(): boolean;
    getUnitIds(): number[];
    removeUnit(unitId: number): void;
    addUnit(unitId: number): void;
    onAiUpdate(context: StrategyContext & { actionBatcher: unknown }): unknown;
    getUniqueName(): string;
    endMission(reason: unknown): void;
    getGlobalDebugText(): string | undefined;
    isUnitsLocked(): boolean;
    getPriority(): number;
};

type MissionControllerLike = {
    addMission(mission: StructuralMission): StructuralMission | null;
};

const ALLIED_COUNTRIES = new Set<Countries>([
    Countries.USA,
    Countries.KOREA,
    Countries.FRANCE,
    Countries.GERMANY,
    Countries.GREAT_BRITAIN,
]);

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
const DOGS = new Set(["DOG", "ADOG"]);

const requireInteger = (name: string, value: number, minimum: number, maximum: number): void => {
    if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
        throw new Error(`${name} must be an integer in [${minimum}, ${maximum}], got ${value}`);
    }
};

export const validateMethodV5CloseoutPolicy = (
    policy: MethodV5CloseoutPolicy,
): MethodV5CloseoutPolicy => {
    const expectedKeys = [
        "schemaVersion", "enabled", "minTick", "minCombatants", "homeDefenseRadius", "maxVisibleEnemyCombatants",
        "visibleCombatantAdvantage", "reserveCombatants",
        "orderIntervalTicks", "maxTargetGroups", "targetPriority", "memoryEnabled",
        "searchEnabled", "searchCellSize", "searchRevisitTicks", "directVisibleAttack",
        "preemptBaselineOrders", "capabilityAware", "reachabilityAware", "stallTicks",
        "adaptiveProductionEnabled", "adaptiveAirTargetCount", "adaptiveProductionPriority",
        "adaptiveTechPriority",
    ].sort();
    const actualKeys = Object.keys(policy).sort();
    if (
        actualKeys.length !== expectedKeys.length ||
        actualKeys.some((key, index) => key !== expectedKeys[index])
    ) throw new Error("Method-v5 closeout policy has an invalid exact schema");
    if (policy.schemaVersion !== METHOD_V5_CLOSEOUT_POLICY_SCHEMA_VERSION) {
        throw new Error(`Method-v5 closeout schemaVersion must be ${METHOD_V5_CLOSEOUT_POLICY_SCHEMA_VERSION}`);
    }
    for (const key of [
        "enabled", "memoryEnabled", "searchEnabled", "directVisibleAttack",
        "preemptBaselineOrders", "capabilityAware", "reachabilityAware",
        "adaptiveProductionEnabled",
    ] as const) {
        if (typeof policy[key] !== "boolean") {
            throw new Error(`${key} must be boolean, got ${String(policy[key])}`);
        }
    }
    requireInteger("minTick", policy.minTick, 0, 100_000);
    requireInteger("minCombatants", policy.minCombatants, 0, 1_000);
    requireInteger("homeDefenseRadius", policy.homeDefenseRadius, 1, 256);
    requireInteger("maxVisibleEnemyCombatants", policy.maxVisibleEnemyCombatants, 0, 1_000);
    requireInteger("visibleCombatantAdvantage", policy.visibleCombatantAdvantage, 0, 1_000);
    requireInteger("reserveCombatants", policy.reserveCombatants, 0, 1_000);
    requireInteger("orderIntervalTicks", policy.orderIntervalTicks, 1, 10_000);
    requireInteger("maxTargetGroups", policy.maxTargetGroups, 1, 64);
    requireInteger("searchCellSize", policy.searchCellSize, 4, 64);
    requireInteger("searchRevisitTicks", policy.searchRevisitTicks, 0, 100_000);
    requireInteger("stallTicks", policy.stallTicks, 1, 100_000);
    requireInteger("adaptiveAirTargetCount", policy.adaptiveAirTargetCount, 0, 20);
    requireInteger("adaptiveProductionPriority", policy.adaptiveProductionPriority, 1, 1_000);
    requireInteger("adaptiveTechPriority", policy.adaptiveTechPriority, 1, 1_000);
    if (!new Set(["production", "defense", "nearest"]).has(policy.targetPriority)) {
        throw new Error(`Invalid Method-v5 target priority: ${policy.targetPriority}`);
    }
    return { ...policy };
};

const canonicalJson = (value: unknown): string => {
    if (value === null || typeof value !== "object") return JSON.stringify(value);
    if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
        .sort()
        .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
        .join(",")}}`;
};

export const methodV5CloseoutPolicySha256 = (policy: MethodV5CloseoutPolicy): string =>
    createHash("sha256").update(canonicalJson(validateMethodV5CloseoutPolicy(policy))).digest("hex");

const distanceSquared = (left: Point, right: Point): number =>
    (left.x - right.x) ** 2 + (left.y - right.y) ** 2;

export const isWithinMethodV5HomeDefenseRadius = (
    point: Point,
    home: Point,
    radius: number,
): boolean => distanceSquared(point, home) <= radius ** 2;

export const shouldPauseMethodV5CloseoutForVisibleThreat = (args: {
    ownEligibleCombatants: number;
    reserveCombatants: number;
    visibleEnemyCombatants: number;
    maxVisibleEnemyCombatants: number;
    visibleCombatantAdvantage: number;
}): boolean =>
    args.visibleEnemyCombatants > args.maxVisibleEnemyCombatants ||
    Math.max(0, args.ownEligibleCombatants - args.reserveCombatants) <
        args.visibleEnemyCombatants + args.visibleCombatantAdvantage;

const isMobileAntiGroundCombatant = (unit: UnitData): boolean =>
    !!unit.rules.isSelectableCombatant &&
    !unit.rules.harvester &&
    unit.rules.type !== ObjectType.Building &&
    !DOGS.has(unit.rules.name) &&
    (!!unit.primaryWeapon?.projectileRules.isAntiGround ||
        !!unit.secondaryWeapon?.projectileRules.isAntiGround);

const weaponCanDamage = (unit: UnitData, target: UnitData): boolean => {
    if ((unit.rules.c4 || unit.rules.ivan) && target.rules.canC4) return true;
    if (
        unit.rules.spawns &&
        (unit.primaryWeapon?.projectileRules.isAntiGround ||
            unit.secondaryWeapon?.projectileRules.isAntiGround)
    ) return true;
    return [unit.primaryWeapon, unit.secondaryWeapon].some(
        (weapon) =>
            !!weapon?.projectileRules.isAntiGround &&
            weapon.rules.damage > 0 &&
            (weapon.warheadRules.verses.get(target.rules.armor) ?? 0) > 0,
    );
};

const resolvedSpeedType = (unit: UnitData): SpeedType | null =>
    unit.rules.speedType ??
    (unit.rules.type === ObjectType.Infantry
        ? SpeedType.Foot
        : unit.rules.type === ObjectType.Aircraft
          ? SpeedType.Winged
          : null);

const canReachPoint = (game: GameApi, unit: UnitData, point: Point): boolean => {
    const speedType = resolvedSpeedType(unit);
    if (speedType === null || speedType === SpeedType.Winged) return true;
    const tile = game.map.getTile(point.x, point.y);
    if (!tile) return false;
    const subCell = unit.rules.type === ObjectType.Infantry;
    if (!game.map.isPassableTile(tile, speedType, !!tile.onBridgeLandType, subCell)) return false;
    return game.map
        .getReachabilityMap(speedType, subCell)
        .isReachable(
            { tile: unit.tile, onBridge: unit.onBridge ?? false },
            { tile, onBridge: !!tile.onBridgeLandType },
        );
};

const canReachBuildingPerimeter = (game: GameApi, unit: UnitData, target: UnitData): boolean => {
    const speedType = resolvedSpeedType(unit);
    if (speedType === null || speedType === SpeedType.Winged) return true;
    const subCell = unit.rules.type === ObjectType.Infantry;
    const reachability = game.map.getReachabilityMap(speedType, subCell);
    const maximumRange = Math.max(
        1,
        ...[unit.primaryWeapon, unit.secondaryWeapon]
            .filter((weapon) => !!weapon?.projectileRules.isAntiGround)
            .map((weapon) => weapon?.maxRange ?? 1),
    );
    const padding = Math.max(1, Math.ceil(maximumRange));
    const left = target.tile.rx;
    const top = target.tile.ry;
    const right = left + Math.max(1, target.foundation.width) - 1;
    const bottom = top + Math.max(1, target.foundation.height) - 1;
    return game.map
        .getTilesInRect({
            x: left - padding,
            y: top - padding,
            width: target.foundation.width + 2 * padding,
            height: target.foundation.height + 2 * padding,
        })
        .some((tile) => {
            const dx = tile.rx < left ? left - tile.rx : tile.rx > right ? tile.rx - right : 0;
            const dy = tile.ry < top ? top - tile.ry : tile.ry > bottom ? tile.ry - bottom : 0;
            return (
                Math.sqrt(dx ** 2 + dy ** 2) <= maximumRange &&
                game.map.isPassableTile(tile, speedType, !!tile.onBridgeLandType, subCell) &&
                reachability.isReachable(
                    { tile: unit.tile, onBridge: unit.onBridge ?? false },
                    { tile, onBridge: !!tile.onBridgeLandType },
                )
            );
        });
};

const canReachRememberedVicinity = (game: GameApi, unit: UnitData, target: Point): boolean => {
    const speedType = resolvedSpeedType(unit);
    if (speedType === null || speedType === SpeedType.Winged) return true;
    const subCell = unit.rules.type === ObjectType.Infantry;
    const reachability = game.map.getReachabilityMap(speedType, subCell);
    return game.map
        .getTilesInRect({ x: target.x - 4, y: target.y - 4, width: 9, height: 9 })
        .some((tile) =>
            game.map.isPassableTile(tile, speedType, !!tile.onBridgeLandType, subCell) &&
            reachability.isReachable(
                { tile: unit.tile, onBridge: unit.onBridge ?? false },
                { tile, onBridge: !!tile.onBridgeLandType },
            ),
        );
};

const unitPoint = (unit: UnitData): Point => ({ x: unit.tile.rx, y: unit.tile.ry });

const rememberedBuilding = (unit: UnitData, tick: number, previous?: RememberedBuilding): RememberedBuilding => {
    const damage = previous ? Math.max(0, previous.hitPoints - unit.hitPoints) : 0;
    return {
        id: unit.id,
        name: unit.rules.name,
        x: unit.tile.rx,
        y: unit.tile.ry,
        hitPoints: unit.hitPoints,
        maxHitPoints: unit.maxHitPoints,
        lastSeenTick: tick,
        lastDamageTick: damage > 0 ? tick : (previous?.lastDamageTick ?? tick),
        constructionYard: !!unit.rules.constructionYard,
        production:
            unit.rules.factory !== FactoryType.None ||
            !!unit.rules.weaponsFactory ||
            !!unit.rules.gdiBarracks ||
            !!unit.rules.nodBarracks,
        power: POWER_BUILDINGS.has(unit.rules.name),
        defense: unit.rules.isBaseDefense || DEFENSE_BUILDINGS.has(unit.rules.name),
        refinery: !!unit.rules.refinery,
        armor: unit.rules.armor,
        canC4: !!unit.rules.canC4,
    };
};

const targetWeight = (
    target: RememberedBuilding,
    priority: MethodV5CloseoutPolicy["targetPriority"],
): number => {
    if (priority === "nearest") return 0;
    if (priority === "defense") {
        if (target.power) return 8;
        if (target.defense) return 7;
        if (target.constructionYard) return 6;
        if (target.production) return 5;
        if (target.refinery) return 4;
        return 3;
    }
    if (target.constructionYard) return 8;
    if (target.power) return 7;
    if (target.production) return 6;
    if (target.defense) return 5;
    if (target.refinery) return 4;
    return 3;
};

const unitCanDamageRemembered = (unit: UnitData, target: RememberedBuilding): boolean => {
    if ((unit.rules.c4 || unit.rules.ivan) && target.canC4) return true;
    if (
        unit.rules.spawns &&
        (unit.primaryWeapon?.projectileRules.isAntiGround ||
            unit.secondaryWeapon?.projectileRules.isAntiGround)
    ) return true;
    return [unit.primaryWeapon, unit.secondaryWeapon].some(
        (weapon) =>
            !!weapon?.projectileRules.isAntiGround &&
            weapon.rules.damage > 0 &&
            (weapon.warheadRules.verses.get(target.armor) ?? 0) > 0,
    );
};

export const methodV5AirUnitForCountry = (country: Countries): "JUMPJET" | "ZEP" =>
    ALLIED_COUNTRIES.has(country) ? "JUMPJET" : "ZEP";

export const methodV5AirStructurePlanForCountry = (country: Countries): string[] =>
    ALLIED_COUNTRIES.has(country)
        ? ["GAAIRC", "AMRADR", "GATECH"]
        : ["NARADR", "NATECH"];

const placementFor = (game: GameApi, playerName: string, rulesName: string): Tile | null => {
    const anchors = game
        .getVisibleUnits(playerName, "self", (rules) => rules.type === ObjectType.Building)
        .map((id) => game.getUnitData(id))
        .filter((unit): unit is UnitData => !!unit)
        .map((unit) => unit.tile);
    const start = game.getPlayerData(playerName).startLocation;
    const points = anchors.length > 0 ? anchors : [game.map.getTile(start.x, start.y)].filter((tile): tile is Tile => !!tile);
    for (const anchor of points) {
        for (let radius = 2; radius <= 12; radius++) {
            for (let dx = -radius; dx <= radius; dx++) {
                for (const dy of [-radius, radius]) {
                    const tile = game.map.getTile(anchor.rx + dx, anchor.ry + dy);
                    if (tile && game.canPlaceBuilding(playerName, rulesName, tile)) return tile;
                }
            }
            for (let dy = -radius + 1; dy < radius; dy++) {
                for (const dx of [-radius, radius]) {
                    const tile = game.map.getTile(anchor.rx + dx, anchor.ry + dy);
                    if (tile && game.canPlaceBuilding(playerName, rulesName, tile)) return tile;
                }
            }
        }
    }
    return null;
};

class CapabilityMission implements StructuralMission {
    private active = true;
    private unitIds: number[] = [];

    constructor(
        private readonly uniqueName: string,
        private readonly kind: "structures" | "units",
        private readonly state: CloseoutState,
    ) {}

    isActive(): boolean { return this.active; }
    getUnitIds(): number[] { return this.unitIds; }
    removeUnit(unitId: number): void { this.unitIds = this.unitIds.filter((id) => id !== unitId); }
    addUnit(unitId: number): void { this.unitIds.push(unitId); }
    getUniqueName(): string { return this.uniqueName; }
    endMission(): void { this.active = false; }
    getGlobalDebugText(): string | undefined { return undefined; }
    isUnitsLocked(): boolean { return false; }
    getPriority(): number { return this.state.policy.adaptiveProductionPriority; }

    onAiUpdate(context: StrategyContext): unknown {
        const { policy } = this.state;
        if (!this.state.activated || !policy.adaptiveProductionEnabled || policy.adaptiveAirTargetCount <= 0) {
            return { type: "noop" };
        }
        const unitName = methodV5AirUnitForCountry(this.state.country);
        if (this.kind === "units") {
            if (this.unitIds.length > 0) {
                const unitIds = [...this.unitIds];
                this.unitIds = [];
                return { type: "releaseUnits", unitIds };
            }
            const current = context.game.getVisibleUnits(
                context.player.name,
                "self",
                (rules) => rules.name === unitName,
            ).length;
            return current < policy.adaptiveAirTargetCount
                ? { type: "request", unitNameToPriority: { [unitName]: policy.adaptiveProductionPriority } }
                : { type: "noop" };
        }
        const availableUnits = new Set(
            context.player.production.getAvailableObjects().map((rules: TechnoRules) => rules.name),
        );
        if (availableUnits.has(unitName)) return { type: "noop" };
        const owned = new Set(
            context.game
                .getVisibleUnits(context.player.name, "self", (rules) => rules.type === ObjectType.Building)
                .map((id) => context.game.getUnitData(id)?.rules.name)
                .filter((name): name is string => !!name),
        );
        const availableStructures = new Set([
            ...context.player.production.getAvailableObjects(QueueType.Structures),
            ...context.player.production.getAvailableObjects(QueueType.Armory),
        ].map((rules: TechnoRules) => rules.name));
        const requested = methodV5AirStructurePlanForCountry(this.state.country).find(
            (name) => availableStructures.has(name) && !owned.has(name),
        );
        if (!requested) return { type: "noop" };
        const tile = placementFor(context.game, context.player.name, requested);
        if (!tile) return { type: "noop" };
        this.state.lastRequestedStructure = requested;
        return {
            type: "buildStructureAtLocation",
            rulesName: requested,
            priority: policy.adaptiveTechPriority,
            rx: tile.rx,
            ry: tile.ry,
        };
    }
}

type CloseoutState = {
    policy: MethodV5CloseoutPolicy;
    country: Countries;
    activated: boolean;
    lastRequestedStructure: string | null;
};

class MethodV5CloseoutStrategy implements StrategyLike {
    private readonly state: CloseoutState;
    private memory = new Map<number, RememberedBuilding>();
    private searchPoints: SearchPoint[] | null = null;
    private lastOrderAt = Number.NEGATIVE_INFINITY;
    private missionsAdded = false;
    private lastTelemetry = new Map<string, { signature: string; tick: number }>();

    constructor(
        private inner: StrategyLike,
        country: Countries,
        policy: MethodV5CloseoutPolicy,
        private readonly telemetry: TelemetrySink,
    ) {
        this.state = {
            policy,
            country,
            activated: false,
            lastRequestedStructure: null,
        };
    }

    onAiUpdate(context: StrategyContext, missionController: MissionControllerLike, logger: Logger): StrategyLike {
        const next = this.inner.onAiUpdate(context, missionController, logger);
        if (next && typeof (next as StrategyLike).onAiUpdate === "function") this.inner = next as StrategyLike;
        if (!this.missionsAdded && this.state.policy.adaptiveProductionEnabled) {
            const structureMission = new CapabilityMission("methodV5CloseoutStructures", "structures", this.state);
            const unitMission = new CapabilityMission("methodV5CloseoutUnits", "units", this.state);
            if (!missionController.addMission(structureMission) || !missionController.addMission(unitMission)) {
                throw new Error("Method-v5 capability mission names collided with an existing mission");
            }
            this.missionsAdded = true;
        }
        this.updateCloseout(context);
        return this;
    }

    private updateCloseout(context: StrategyContext): void {
        const { game, player } = context;
        const policy = this.state.policy;
        const tick = game.getCurrentTick();
        const self = game
            .getVisibleUnits(player.name, "self")
            .map((id) => game.getUnitData(id))
            .filter((unit): unit is UnitData => !!unit);
        const eligible = self.filter(isMobileAntiGroundCombatant);
        // Retain buildings observed during ordinary opening/midgame play so the
        // late closeout layer does not forget a previously scouted target.
        this.updateMemory(game, player.name, tick);
        if (!this.state.activated && tick >= policy.minTick && eligible.length >= policy.minCombatants) {
            this.state.activated = true;
            this.emit({
                schemaVersion: 1,
                event: "activated",
                tick,
                ownEligibleCombatants: eligible.length,
                reserveCombatants: policy.reserveCombatants,
            });
        }
        if (!this.state.activated) return;
        this.emitCapabilityTelemetry(game, player.name, tick);
        if (tick < this.lastOrderAt + policy.orderIntervalTicks) return;
        this.lastOrderAt = tick;
        const start = game.getPlayerData(player.name).startLocation;
        const visibleEnemyCombatants = game.getVisibleUnits(
            player.name,
            "enemy",
            (rules) => !!rules.isSelectableCombatant && !rules.harvester && rules.type !== ObjectType.Building,
        ).map((id) => game.getUnitData(id))
            .filter((unit): unit is UnitData => !!unit)
            .filter((unit) => isWithinMethodV5HomeDefenseRadius(unitPoint(unit), start, policy.homeDefenseRadius))
            .length;
        if (shouldPauseMethodV5CloseoutForVisibleThreat({
            ownEligibleCombatants: eligible.length,
            reserveCombatants: policy.reserveCombatants,
            visibleEnemyCombatants,
            maxVisibleEnemyCombatants: policy.maxVisibleEnemyCombatants,
            visibleCombatantAdvantage: policy.visibleCombatantAdvantage,
        })) {
            this.emit({
                schemaVersion: 1,
                event: "orders_paused_for_visible_threat",
                tick,
                ownEligibleCombatants: eligible.length,
                visibleEnemyCombatants,
                reserveCombatants: policy.reserveCombatants,
            });
            return;
        }
        const orderable = policy.preemptBaselineOrders
            ? eligible
            : eligible.filter((unit) => unit.isIdle === true);
        const attackers = orderable
            .slice()
            .sort((left, right) => {
                const leftMobility = resolvedSpeedType(left) === SpeedType.Winged || left.rules.speedType === SpeedType.Float ? 1 : 0;
                const rightMobility = resolvedSpeedType(right) === SpeedType.Winged || right.rules.speedType === SpeedType.Float ? 1 : 0;
                if (leftMobility !== rightMobility) return rightMobility - leftMobility;
                return distanceSquared(unitPoint(right), start) - distanceSquared(unitPoint(left), start);
            })
            .slice(0, Math.max(0, eligible.length - policy.reserveCombatants));
        if (attackers.length === 0) return;
        const visible = game
            .getVisibleUnits(player.name, "enemy", (rules) => rules.type === ObjectType.Building)
            .map((id) => game.getUnitData(id))
            .filter((unit): unit is UnitData => !!unit);
        const visibleById = new Map(visible.map((unit) => [unit.id, unit]));
        const targets = [...this.memory.values()]
            .sort((left, right) => {
                const stalledDifference =
                    Number(tick - right.lastDamageTick >= policy.stallTicks) -
                    Number(tick - left.lastDamageTick >= policy.stallTicks);
                if (stalledDifference !== 0) return stalledDifference;
                const weightDifference = targetWeight(right, policy.targetPriority) - targetWeight(left, policy.targetPriority);
                if (weightDifference !== 0) return weightDifference;
                const nearest = (target: Point) => attackers.reduce(
                    (best, unit) => Math.min(best, distanceSquared(unitPoint(unit), target)),
                    Number.POSITIVE_INFINITY,
                );
                return nearest(left) - nearest(right) || left.id - right.id;
            })
            .slice(0, policy.maxTargetGroups);
        if (targets.length > 0) {
            let assigned = 0;
            const counts = new Map<number, number>();
            const assignments = new Map<number, { target: RememberedBuilding; unitIds: number[] }>();
            for (const attacker of attackers) {
                const compatible = targets.filter((target) => {
                    const current = visibleById.get(target.id);
                    if (current && policy.capabilityAware && !weaponCanDamage(attacker, current)) return false;
                    if (!current && policy.capabilityAware && !unitCanDamageRemembered(attacker, target)) return false;
                    return !policy.reachabilityAware ||
                        (current
                            ? canReachBuildingPerimeter(game, attacker, current)
                            : canReachRememberedVicinity(game, attacker, target));
                });
                if (compatible.length === 0) continue;
                const target = compatible.reduce((best, item) => {
                    const bestScore = distanceSquared(unitPoint(attacker), best) * (1 + (counts.get(best.id) ?? 0));
                    const itemScore = distanceSquared(unitPoint(attacker), item) * (1 + (counts.get(item.id) ?? 0));
                    return itemScore < bestScore ? item : best;
                }, compatible[0]);
                counts.set(target.id, (counts.get(target.id) ?? 0) + 1);
                const assignment = assignments.get(target.id) ?? { target, unitIds: [] };
                assignment.unitIds.push(attacker.id);
                assignments.set(target.id, assignment);
                assigned++;
            }
            for (const { target, unitIds } of assignments.values()) {
                const current = visibleById.get(target.id);
                if (current && policy.directVisibleAttack) {
                    player.actions.orderUnits(unitIds, OrderType.Attack, current.id);
                } else {
                    player.actions.orderUnits(unitIds, OrderType.AttackMove, target.x, target.y);
                }
            }
            this.emit({
                schemaVersion: 1,
                event: "target_orders",
                tick,
                attackerCount: assigned,
                visibleTargetCount: visible.length,
                rememberedTargetCount: this.memory.size,
                assignedTargetCount: counts.size,
            });
            return;
        }
        if (!policy.searchEnabled) return;
        const points = this.rankSearchPoints(game, player.name, tick).slice(0, policy.maxTargetGroups);
        let assigned = 0;
        const searchAssignments = new Map<string, number>();
        const searchUnitIds = new Map<string, { point: SearchPoint; unitIds: number[] }>();
        for (const attacker of attackers) {
            const compatible = points.filter(
                (item) => !policy.reachabilityAware || canReachPoint(game, attacker, item),
            );
            if (compatible.length === 0) continue;
            const point = compatible.reduce((best, item) => {
                const bestScore = distanceSquared(unitPoint(attacker), best) *
                    (1 + (searchAssignments.get(best.key) ?? 0));
                const itemScore = distanceSquared(unitPoint(attacker), item) *
                    (1 + (searchAssignments.get(item.key) ?? 0));
                return itemScore < bestScore ? item : best;
            }, compatible[0]);
            point.lastOrderedTick = tick;
            searchAssignments.set(point.key, (searchAssignments.get(point.key) ?? 0) + 1);
            const assignment = searchUnitIds.get(point.key) ?? { point, unitIds: [] };
            assignment.unitIds.push(attacker.id);
            searchUnitIds.set(point.key, assignment);
            assigned++;
        }
        for (const { point, unitIds } of searchUnitIds.values()) {
            player.actions.orderUnits(unitIds, OrderType.AttackMove, point.x, point.y);
        }
        this.emit({
            schemaVersion: 1,
            event: "search_orders",
            tick,
            attackerCount: assigned,
            searchPointCount: points.length,
        });
    }

    private updateMemory(game: GameApi, playerName: string, tick: number): void {
        const visible = game
            .getVisibleUnits(playerName, "enemy", (rules) => rules.type === ObjectType.Building)
            .map((id) => game.getUnitData(id))
            .filter((unit): unit is UnitData => !!unit);
        const visibleIds = new Set(visible.map((unit) => unit.id));
        for (const unit of visible) {
            this.memory.set(unit.id, rememberedBuilding(unit, tick, this.memory.get(unit.id)));
        }
        if (!this.state.policy.memoryEnabled) {
            this.memory = new Map(visible.map((unit) => [unit.id, rememberedBuilding(unit, tick)]));
            return;
        }
        const invalidated: number[] = [];
        for (const [id, target] of this.memory) {
            if (visibleIds.has(id)) continue;
            const tile = game.map.getTile(target.x, target.y);
            if (tile && game.map.isVisibleTile(tile, playerName)) {
                this.memory.delete(id);
                invalidated.push(id);
            }
        }
        if (invalidated.length > 0) {
            this.emit({
                schemaVersion: 1,
                event: "memory_invalidated",
                tick,
                invalidatedCount: invalidated.length,
            });
        }
    }

    private rankSearchPoints(game: GameApi, playerName: string, tick: number): SearchPoint[] {
        if (this.searchPoints === null) this.searchPoints = this.buildSearchPoints(game, playerName);
        for (const point of this.searchPoints) {
            const tile = game.map.getTile(point.x, point.y);
            if (tile && game.map.isVisibleTile(tile, playerName)) point.lastObservedTick = tick;
        }
        return this.searchPoints.slice().sort((left, right) => {
            const leftRecent = tick < left.lastOrderedTick + this.state.policy.searchRevisitTicks ? 1 : 0;
            const rightRecent = tick < right.lastOrderedTick + this.state.policy.searchRevisitTicks ? 1 : 0;
            if (leftRecent !== rightRecent) return leftRecent - rightRecent;
            const leftNeverObserved = left.lastObservedTick === Number.NEGATIVE_INFINITY ? 1 : 0;
            const rightNeverObserved = right.lastObservedTick === Number.NEGATIVE_INFINITY ? 1 : 0;
            if (leftNeverObserved !== rightNeverObserved) return rightNeverObserved - leftNeverObserved;
            if (leftNeverObserved && left.publicEnemyStart !== right.publicEnemyStart) {
                return Number(right.publicEnemyStart) - Number(left.publicEnemyStart);
            }
            if (left.lastObservedTick !== right.lastObservedTick) return left.lastObservedTick - right.lastObservedTick;
            if (left.lastOrderedTick !== right.lastOrderedTick) return left.lastOrderedTick - right.lastOrderedTick;
            return left.key.localeCompare(right.key);
        });
    }

    private buildSearchPoints(game: GameApi, playerName: string): SearchPoint[] {
        const { width, height } = game.map.getRealMapSize();
        const starts = game.map.getStartingLocations();
        const ownStart = game.getPlayerData(playerName).startLocation;
        const enemyStarts = starts.filter((point) => point.x !== ownStart.x || point.y !== ownStart.y);
        const points = new Map<string, SearchPoint>();
        const add = (x: number, y: number, publicEnemyStart: boolean): void => {
            const tile = game.map.getTile(x, y);
            if (!tile) return;
            const key = `${tile.rx},${tile.ry}`;
            const current = points.get(key);
            points.set(key, {
                key,
                x: tile.rx,
                y: tile.ry,
                publicEnemyStart: publicEnemyStart || current?.publicEnemyStart === true,
                lastObservedTick: Number.NEGATIVE_INFINITY,
                lastOrderedTick: Number.NEGATIVE_INFINITY,
            });
        };
        for (const start of enemyStarts) add(start.x, start.y, true);
        for (let x = 0; x < width; x += this.state.policy.searchCellSize) {
            for (let y = 0; y < height; y += this.state.policy.searchCellSize) {
                add(x + Math.floor(this.state.policy.searchCellSize / 2), y + Math.floor(this.state.policy.searchCellSize / 2), false);
            }
        }
        return [...points.values()];
    }

    private emitCapabilityTelemetry(game: GameApi, playerName: string, tick: number): void {
        const policy = this.state.policy;
        if (!policy.adaptiveProductionEnabled || policy.adaptiveAirTargetCount <= 0) return;
        const unitName = methodV5AirUnitForCountry(this.state.country);
        const currentCount = game.getVisibleUnits(playerName, "self", (rules) => rules.name === unitName).length;
        if (currentCount >= policy.adaptiveAirTargetCount) return;
        this.emit({
            schemaVersion: 1,
            event: "capability_request",
            tick,
            unitName,
            targetCount: policy.adaptiveAirTargetCount,
            currentCount,
            requestedStructure: this.state.lastRequestedStructure,
        });
    }

    private emit(event: MethodV5CloseoutTelemetry, heartbeatTicks = 600): void {
        const signature = JSON.stringify({ ...event, tick: 0 });
        const previous = this.lastTelemetry.get(event.event);
        if (
            previous &&
            previous.signature === signature &&
            event.tick < previous.tick + heartbeatTicks
        ) return;
        this.telemetry(event);
        this.lastTelemetry.set(event.event, { signature, tick: event.tick });
    }
}

export const createMethodV5Candidate = (
    baselineFactory: BaselineFactory,
    name: string,
    country: Countries,
    rawPolicy: MethodV5CloseoutPolicy,
    telemetry: TelemetrySink = () => undefined,
): InspectableBaselineBot => {
    const policy = validateMethodV5CloseoutPolicy(rawPolicy);
    if (!policy.enabled) return baselineFactory.create(name, country);
    if (!baselineFactory.createDefaultStrategy || !baselineFactory.createWithStrategy) {
        throw new Error("Baseline factory does not expose the Method-v5 strategy-construction interface");
    }
    const inner = baselineFactory.createDefaultStrategy();
    if (!inner || typeof (inner as StrategyLike).onAiUpdate !== "function") {
        throw new Error("Pinned baseline factory did not provide a valid DefaultStrategy");
    }
    return baselineFactory.createWithStrategy(
        name,
        country,
        new MethodV5CloseoutStrategy(inner as StrategyLike, country, policy, telemetry),
    );
};
