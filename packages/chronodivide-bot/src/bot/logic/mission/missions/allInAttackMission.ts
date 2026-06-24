import { ObjectType, OrderType, UnitData, Vector2 } from "@chronodivide/game-api";
import { DebugLogger, isOwnedByNeutral, maxBy } from "../../common/utils.js";
import { Mission, MissionAction, grabCombatants } from "../mission.js";
import { MissionController } from "../missionController.js";
import { MissionContext, SupabotContext } from "../../common/context.js";

const ALL_IN_ORDER_INTERVAL_TICKS = 45;
const ALL_IN_PRIORITY = 200;
const ALL_IN_GRAB_RADIUS = 999;

export type AllInAttackMissionFactoryOptions = {
    enabled?: boolean;
    minCombatants?: number;
    minTick?: number;
    combatantAdvantage?: number;
    disbandExistingAttacks?: boolean;
    directVisibleAttack?: boolean;
    hfoWestVsEastOnly?: boolean;
};

const DEFAULT_OPTIONS: Required<AllInAttackMissionFactoryOptions> = {
    enabled: false,
    minCombatants: 6,
    minTick: 10000,
    combatantAdvantage: 0,
    disbandExistingAttacks: false,
    directVisibleAttack: false,
    hfoWestVsEastOnly: false,
};

const HFO_STARTS = new Set(["39,82", "151,119", "88,34", "88,157"]);
const HFO_WEST_START = "39,82";
const HFO_EAST_START = "151,119";

class AllInAttackMission extends Mission {
    private lastOrderAt = 0;

    constructor(
        uniqueName: string,
        private priority: number,
        private directVisibleAttack: boolean,
        logger: DebugLogger,
    ) {
        super(uniqueName, logger);
    }

    public _onAiUpdate(context: MissionContext): MissionAction {
        if (
            this.getUnitIds().length > 0 &&
            context.game.getCurrentTick() > this.lastOrderAt + ALL_IN_ORDER_INTERVAL_TICKS
        ) {
            const visibleTarget = this.findBestVisibleTarget(context);
            const knownTarget = visibleTarget ?? this.findBestKnownTarget(context);
            if (knownTarget && this.directVisibleAttack) {
                context.player.actions.orderUnits(this.getUnitIds(), OrderType.Attack, knownTarget.id);
            } else {
                const target = knownTarget ?
                    new Vector2(knownTarget.tile.rx, knownTarget.tile.ry) :
                    this.findFallbackTarget(context);
                context.player.actions.orderUnits(this.getUnitIds(), OrderType.AttackMove, target.x, target.y);
            }
            this.lastOrderAt = context.game.getCurrentTick();
        }

        const startLocation = context.game.getPlayerData(context.player.name).startLocation;
        return grabCombatants(startLocation, ALL_IN_GRAB_RADIUS);
    }

    public getGlobalDebugText(): string | undefined {
        return `all-in ${this.getUnitIds().length}`;
    }

    public getPriority(): number {
        return this.priority;
    }

    private findBestVisibleTarget(context: MissionContext): UnitData | null {
        const playerData = context.game.getPlayerData(context.player.name);
        const visibleTargets = context.game
            .getVisibleUnits(
                playerData.name,
                "enemy",
                (rules) => rules.type === ObjectType.Building || rules.harvester || rules.weaponsFactory,
            )
            .map((id) => context.game.getUnitData(id))
            .filter((unit): unit is UnitData => !!unit && !isOwnedByNeutral(unit));

        return maxBy(visibleTargets, (unit) => this.getTargetWeight(unit));
    }

    private findBestKnownTarget(context: MissionContext): UnitData | null {
        const playerData = context.game.getPlayerData(context.player.name);
        const knownEnemyTargets = context.game
            .getAllUnits()
            .map((id) => context.game.getUnitData(id))
            .filter((unit): unit is UnitData => !!unit && !isOwnedByNeutral(unit))
            .filter((unit) => unit.owner !== playerData.name)
            .filter((unit) => !context.game.areAlliedPlayers(playerData.name, unit.owner))
            .filter((unit) => context.game.getPlayerData(unit.owner).isCombatant);

        const bestKnownTarget = maxBy(knownEnemyTargets, (unit) => this.getTargetWeight(unit));
        return bestKnownTarget;
    }

    private findFallbackTarget(context: MissionContext): Vector2 {
        const playerData = context.game.getPlayerData(context.player.name);
        const enemyPlayers = context.game
            .getPlayers()
            .map((name) => context.game.getPlayerData(name))
            .filter((otherPlayer) => otherPlayer.name !== playerData.name)
            .filter((otherPlayer) => !context.game.areAlliedPlayers(playerData.name, otherPlayer.name))
            .filter((otherPlayer) => otherPlayer.isCombatant);
        return enemyPlayers[0]?.startLocation ?? playerData.startLocation;
    }

    private getTargetWeight(unit: UnitData): number {
        if (unit.rules.constructionYard) {
            return 1000000;
        }
        if (unit.rules.weaponsFactory) {
            return 900000;
        }
        if (unit.rules.refinery) {
            return 800000;
        }
        if (unit.rules.harvester) {
            return 700000;
        }
        if (unit.rules.type === ObjectType.Building) {
            return 600000 + (unit.maxHitPoints ?? 0);
        }
        if (unit.rules.isSelectableCombatant) {
            return 500000 + (unit.maxHitPoints ?? 0);
        }
        return unit.maxHitPoints ?? 0;
    }
}

export class AllInAttackMissionFactory {
    private options: Required<AllInAttackMissionFactoryOptions>;

    constructor(options: AllInAttackMissionFactoryOptions = {}) {
        this.options = { ...DEFAULT_OPTIONS, ...options };
    }

    getName(): string {
        return "AllInAttackMissionFactory";
    }

    maybeCreateMissions(context: SupabotContext, missionController: MissionController, logger: DebugLogger): void {
        if (!this.options.enabled || context.game.getCurrentTick() < this.options.minTick) {
            return;
        }
        if (this.options.hfoWestVsEastOnly && !this.isHfoWestVsEast(context)) {
            return;
        }
        const playerData = context.game.getPlayerData(context.player.name);
        const combatants = context.game.getVisibleUnits(context.player.name, "self", (rules) => rules.isSelectableCombatant);
        if (combatants.length < this.options.minCombatants) {
            return;
        }
        const enemyCombatants = context.game
            .getAllUnits((rules) => rules.isSelectableCombatant)
            .map((id) => context.game.getUnitData(id))
            .filter((unit): unit is UnitData => !!unit && !isOwnedByNeutral(unit))
            .filter((unit) => unit.owner !== playerData.name)
            .filter((unit) => !context.game.areAlliedPlayers(playerData.name, unit.owner))
            .filter((unit) => context.game.getPlayerData(unit.owner).isCombatant);
        if (combatants.length < enemyCombatants.length + this.options.combatantAdvantage) {
            return;
        }
        if (this.options.disbandExistingAttacks) {
            missionController
                .getMissions()
                .filter((mission) => {
                    const name = mission.getUniqueName();
                    return name.startsWith("attack_") || name.startsWith("retreat-from-attack");
                })
                .forEach((mission) => missionController.disbandMission(mission.getUniqueName()));
        }
        missionController.addMission(
            new AllInAttackMission("allInAttack", ALL_IN_PRIORITY, this.options.directVisibleAttack, logger),
        );
    }

    private isHfoWestVsEast(context: SupabotContext): boolean {
        const starts = context.game.mapApi.getStartingLocations().map((start) => `${start.x},${start.y}`).sort();
        if (starts.length !== HFO_STARTS.size || !starts.every((start) => HFO_STARTS.has(start))) {
            return false;
        }
        const playerData = context.game.getPlayerData(context.player.name);
        if (`${playerData.startLocation.x},${playerData.startLocation.y}` !== HFO_WEST_START) {
            return false;
        }
        return context.game
            .getPlayers()
            .map((name) => context.game.getPlayerData(name))
            .some(
                (otherPlayer) =>
                    otherPlayer.name !== playerData.name &&
                    !context.game.areAlliedPlayers(playerData.name, otherPlayer.name) &&
                    otherPlayer.isCombatant &&
                    `${otherPlayer.startLocation.x},${otherPlayer.startLocation.y}` === HFO_EAST_START,
            );
    }
}
