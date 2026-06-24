import { GameApi, GameObjectData, ObjectType, OrderType, SideType, SpeedType, UnitData } from "@chronodivide/game-api";
import {
    Mission,
    MissionAction,
    disbandMission,
    noop,
    requestUnits,
    requestUnitsWithSamePriority,
} from "../mission.js";
import { MissionController } from "../missionController.js";
import { DebugLogger, toPathNode, toVector2 } from "../../common/utils.js";
import { computeAdjacentRect, getAdjacentTiles } from "../../common/tileUtils.js";
import { MissionContext, SupabotContext } from "../../common/context.js";
import { UnitComposition } from "../../../strategy/strategy.js";

const CAPTURE_COOLDOWN_TICKS = 30;

enum EngineerMissionState {
    Preparing = 0,
    Capturing = 1,
}

const LOST_ENGINEER = "lost_engineer";
const NO_PATH = "no_path";

/**
 * A mission that tries to send an engineer into a building (e.g. to capture tech building or repair bridge)
 */
export class EngineerMission extends Mission {
    private state = EngineerMissionState.Preparing;
    private lastCaptureAttemptTick = -1;

    constructor(
        uniqueName: string,
        private priority: number,
        private captureTargetId: number,
        private escortLevel: number,
        logger: DebugLogger,
    ) {
        super(uniqueName, logger);
    }

    get targetId() {
        return this.captureTargetId;
    }

    public _onAiUpdate(context: MissionContext): MissionAction {
        const { game } = context;
        const actionsApi = context.player.actions;
        const playerData = game.getPlayerData(context.player.name);
        const engineers = this.getUnitsOfTypes(game, ...["SENGINEER", "ENGINEER"]);

        const target = game.getGameObjectData(this.captureTargetId);
        if (!target || target.owner === playerData.name) {
            // Target gone or already captured, disband.
            return disbandMission();
        }

        if (engineers.length === 0 && this.state === EngineerMissionState.Capturing) {
            // Engineer died and we already tried to capture
            return disbandMission(LOST_ENGINEER);
        }

        if (this.state === EngineerMissionState.Preparing) {
            const composition: UnitComposition = {};
            switch (playerData.country!.side) {
                case SideType.Nod:
                    composition["SENGINEER"] = 1;
                    composition["DOG"] = Math.max(0, this.escortLevel - 1); // 0, 1, 2
                    composition["HTNK"] = Math.max(0, this.escortLevel - 2); // 0, 0, 1
                    break;
                case SideType.GDI:
                    composition["ENGINEER"] = 1;
                    composition["ADOG"] = Math.max(0, this.escortLevel - 1); // 0, 1, 2
                    composition["MTNK"] = Math.max(0, this.escortLevel - 2); // 0, 0, 1
                    break;
            }
            const missingUnits = this.getMissingUnits(game, composition);
            if (missingUnits.length > 0) {
                return requestUnitsWithSamePriority(
                    missingUnits.map(([unitName]) => unitName),
                    this.priority,
                );
            }
            this.state = EngineerMissionState.Capturing;
        }

        if (
            this.state === EngineerMissionState.Capturing &&
            game.getCurrentTick() > this.lastCaptureAttemptTick + CAPTURE_COOLDOWN_TICKS
        ) {
            const engineer = engineers[0];
            if (!canReachStructure(game, engineer, target)) {
                return disbandMission(NO_PATH);
            }
            actionsApi.orderUnits([engineer.id], OrderType.Capture, this.captureTargetId);
            const escortUnits = this.getUnitsOfTypes(game, "DOG", "HTNK", "ADOG", "MTNK");
            if (escortUnits.length > 0) {
                actionsApi.orderUnits(
                    escortUnits.map((u) => u.id),
                    OrderType.Guard,
                    engineer.id,
                );
            }
            // Add a cooldown to deploy attempts.
            this.lastCaptureAttemptTick = game.getCurrentTick();
        }
        return noop();
    }

    public getGlobalDebugText(): string | undefined {
        return undefined;
    }

    public getPriority() {
        return this.priority;
    }
}

function canReachStructure(gameApi: GameApi, engineer: UnitData, target: GameObjectData) {
    const reachabilityMap = gameApi.map.getReachabilityMap(SpeedType.Foot, true);
    // unfortunately we have to test tiles around the target, because the target blocks pathing
    const range = computeAdjacentRect(toVector2(target.tile), target.foundation, 1);
    const adjacentTiles = getAdjacentTiles(gameApi, range, false);
    for (const tile of adjacentTiles) {
        if (
            reachabilityMap.isReachable(toPathNode(engineer.tile, engineer.onBridge ?? false), toPathNode(tile, false))
        ) {
            return true;
        }
    }
    return false;
}

const TECH_CHECK_INTERVAL_TICKS = 300;
const MAX_CAPTURE_ATTEMPT_COUNT = 3;

export type EngineerMissionFactoryOptions = {
    useKnownTechBuildings?: boolean;
    captureEnemyBuildings?: boolean;
    enemyStartTick?: number;
    enemyMaxCombatants?: number;
    enemyMaxBuildings?: number;
    techPriority?: number;
    techMaxTargets?: number;
    techMaxDistanceFromStart?: number;
    enemyPriority?: number;
    techEscortLevel?: number;
    enemyEscortLevel?: number;
    enemyMaxTargets?: number;
};

const DEFAULT_ENGINEER_OPTIONS: Required<EngineerMissionFactoryOptions> = {
    useKnownTechBuildings: false,
    captureEnemyBuildings: false,
    enemyStartTick: 0,
    enemyMaxCombatants: 999,
    enemyMaxBuildings: 999,
    techPriority: 100,
    techMaxTargets: 999,
    techMaxDistanceFromStart: Number.POSITIVE_INFINITY,
    enemyPriority: 120,
    techEscortLevel: 1,
    enemyEscortLevel: 2,
    enemyMaxTargets: 1,
};

export class EngineerMissionFactory {
    private lastCheckAt = 0;
    private lostEngineerCounts: { [buildingId: number]: number } = {};
    private noPathCounts: { [buildingId: number]: number } = {};
    private options: Required<EngineerMissionFactoryOptions>;

    constructor(options: EngineerMissionFactoryOptions = {}) {
        this.options = { ...DEFAULT_ENGINEER_OPTIONS, ...options };
    }

    getName(): string {
        return "EngineerMissionFactory";
    }

    maybeCreateMissions(context: SupabotContext, missionController: MissionController, logger: DebugLogger): void {
        const { game } = context;
        const playerData = game.getPlayerData(context.player.name);
        if (!(game.getCurrentTick() > this.lastCheckAt + TECH_CHECK_INTERVAL_TICKS)) {
            return;
        }
        this.lastCheckAt = game.getCurrentTick();

        this.getEligibleTechBuildings(context).forEach((techBuildingId) => {
            const escortLevel = Math.max(
                this.options.techEscortLevel,
                (this.lostEngineerCounts[techBuildingId] ?? 0) + 1,
            );
            this.addCaptureMission(
                missionController,
                logger,
                "capture",
                techBuildingId,
                this.options.techPriority,
                escortLevel,
            );
        });

        if (!this.options.captureEnemyBuildings) {
            return;
        }
        if (game.getCurrentTick() < this.options.enemyStartTick) {
            return;
        }
        if (
            this.getEnemyCombatants(context).length > this.options.enemyMaxCombatants ||
            this.getEnemyBuildings(context).length > this.options.enemyMaxBuildings
        ) {
            return;
        }

        this.getEnemyCaptureTargets(context)
            .slice(0, this.options.enemyMaxTargets)
            .forEach((targetId) => {
                this.addCaptureMission(
                    missionController,
                    logger,
                    "capture-enemy",
                    targetId,
                    this.options.enemyPriority,
                    this.options.enemyEscortLevel,
                );
            });
    }

    private getEligibleTechBuildings(context: SupabotContext): number[] {
        const { game } = context;
        const playerData = game.getPlayerData(context.player.name);
        if (!this.options.useKnownTechBuildings) {
            return game
                .getVisibleUnits(playerData.name, "hostile", (r) => r.capturable && r.produceCashAmount > 0)
                .slice(0, this.options.techMaxTargets);
        }
        return game
            .getAllUnits((r) => r.capturable && r.produceCashAmount > 0)
            .map((id) => game.getGameObjectData(id))
            .filter((unit): unit is GameObjectData => !!unit && unit.owner !== playerData.name)
            .filter(
                (unit) =>
                    this.getDistanceFromStartSquared(playerData.startLocation, unit) <=
                    this.options.techMaxDistanceFromStart * this.options.techMaxDistanceFromStart,
            )
            .sort(
                (left, right) =>
                    this.getDistanceFromStartSquared(playerData.startLocation, left) -
                    this.getDistanceFromStartSquared(playerData.startLocation, right),
            )
            .slice(0, this.options.techMaxTargets)
            .map((unit) => unit.id);
    }

    private getDistanceFromStartSquared(start: { x: number; y: number }, unit: GameObjectData): number {
        const tile = unit.tile as any;
        const x = Number.isFinite(tile?.x) ? tile.x : tile?.rx;
        const y = Number.isFinite(tile?.y) ? tile.y : tile?.ry;
        if (!Number.isFinite(x) || !Number.isFinite(y)) {
            return Number.POSITIVE_INFINITY;
        }
        const dx = x - start.x;
        const dy = y - start.y;
        return dx * dx + dy * dy;
    }

    private getEnemyCaptureTargets(context: SupabotContext): number[] {
        const { game } = context;
        const playerData = game.getPlayerData(context.player.name);
        return game
            .getAllUnits(
                (r: any) =>
                    r.capturable &&
                    (r.constructionYard || r.weaponsFactory || r.refinery || r.nodBarracks || r.gdiBarracks),
            )
            .map((id) => game.getGameObjectData(id))
            .filter(
                (unit): unit is GameObjectData & { owner: string } =>
                    !!unit && typeof unit.owner === "string" && unit.owner !== playerData.name,
            )
            .filter((unit) => !game.areAlliedPlayers(playerData.name, unit.owner))
            .filter((unit) => this.isCombatantOwner(game, unit.owner))
            .sort((left, right) => this.getEnemyCaptureWeight(right) - this.getEnemyCaptureWeight(left))
            .map((unit) => unit.id);
    }

    private getEnemyCombatants(context: SupabotContext): GameObjectData[] {
        const { game } = context;
        const playerData = game.getPlayerData(context.player.name);
        return game
            .getAllUnits((r) => r.isSelectableCombatant && !r.harvester && r.type !== ObjectType.Building)
            .map((id) => game.getGameObjectData(id))
            .filter(
                (unit): unit is GameObjectData & { owner: string } =>
                    !!unit && typeof unit.owner === "string" && unit.owner !== playerData.name,
            )
            .filter((unit) => !game.areAlliedPlayers(playerData.name, unit.owner))
            .filter((unit) => this.isCombatantOwner(game, unit.owner));
    }

    private getEnemyBuildings(context: SupabotContext): GameObjectData[] {
        const { game } = context;
        const playerData = game.getPlayerData(context.player.name);
        return game
            .getAllUnits((r) => r.type === ObjectType.Building)
            .map((id) => game.getGameObjectData(id))
            .filter(
                (unit): unit is GameObjectData & { owner: string } =>
                    !!unit && typeof unit.owner === "string" && unit.owner !== playerData.name,
            )
            .filter((unit) => !game.areAlliedPlayers(playerData.name, unit.owner))
            .filter((unit) => this.isCombatantOwner(game, unit.owner));
    }

    private isCombatantOwner(game: GameApi, owner: string): boolean {
        try {
            return game.getPlayerData(owner).isCombatant;
        } catch {
            return false;
        }
    }

    private getEnemyCaptureWeight(unit: GameObjectData): number {
        const rules = unit.rules as any;
        if (rules.constructionYard) {
            return 1000000;
        }
        if (rules.nodBarracks || rules.gdiBarracks) {
            return 950000;
        }
        if (rules.weaponsFactory) {
            return 900000;
        }
        if (rules.refinery) {
            return 800000;
        }
        return unit.hitPoints ?? 0;
    }

    private addCaptureMission(
        missionController: MissionController,
        logger: DebugLogger,
        prefix: string,
        buildingId: number,
        priority: number,
        escortLevel: number,
    ): void {
        if (
            this.lostEngineerCounts[buildingId] >= MAX_CAPTURE_ATTEMPT_COUNT ||
            this.noPathCounts[buildingId] >= MAX_CAPTURE_ATTEMPT_COUNT
        ) {
            return;
        }
        missionController.addMission(
            new EngineerMission(`${prefix}-${buildingId}`, priority, buildingId, escortLevel, logger).withOnFinish(
                (_unitIds, reason) => {
                    if (reason === LOST_ENGINEER) {
                        this.lostEngineerCounts[buildingId] = (this.lostEngineerCounts[buildingId] ?? 0) + 1;
                    } else if (reason === NO_PATH) {
                        this.noPathCounts[buildingId] = (this.noPathCounts[buildingId] ?? 0) + 1;
                    }
                },
            ),
        );
    }
}
