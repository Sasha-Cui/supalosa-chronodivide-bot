import { OrderType, UnitData, Vector2 } from "@chronodivide/game-api";
import { DebugLogger, isOwnedByNeutral, maxBy } from "../../common/utils.js";
import { Mission, MissionAction, noop } from "../mission.js";
import { MissionController } from "../missionController.js";
import { MissionContext, SupabotContext } from "../../common/context.js";
import { BatchableAction } from "../actionBatcher.js";

const NAVAL_ASSAULT_MISSION_NAME = "navalAssault";
const NAVAL_ASSAULT_PRIORITY = 130;
const NAVAL_ORDER_INTERVAL_TICKS = 120;
const NAVAL_UNIT_NAMES = new Set(["SUB", "HYD", "DRED", "SQD", "DEST", "AEGIS", "CARRIER", "DLPH"]);
const TRANSPORT_NAMES = new Set(["SAPC", "LCRF"]);

export type NavalAssaultMissionFactoryOptions = {
    enabled?: boolean;
    minTick?: number;
    minNavalUnits?: number;
    includeTransports?: boolean;
};

const DEFAULT_OPTIONS: Required<NavalAssaultMissionFactoryOptions> = {
    enabled: true,
    minTick: 4800,
    minNavalUnits: 2,
    includeTransports: false,
};

class NavalAssaultMission extends Mission {
    private lastOrderAt = 0;

    constructor(
        private options: Required<NavalAssaultMissionFactoryOptions>,
        logger: DebugLogger,
    ) {
        super(NAVAL_ASSAULT_MISSION_NAME, logger);
    }

    _onAiUpdate(context: MissionContext): MissionAction {
        if (context.game.getCurrentTick() < this.options.minTick) {
            return noop();
        }
        if (context.game.getCurrentTick() <= this.lastOrderAt + NAVAL_ORDER_INTERVAL_TICKS) {
            return noop();
        }
        const navalUnits = this.getNavalUnitIds(context);
        if (navalUnits.length < this.options.minNavalUnits) {
            return noop();
        }
        const target = this.findBestTarget(context);
        if (!target) {
            return noop();
        }
        navalUnits.forEach((unitId) => {
            context.actionBatcher.push(BatchableAction.toPoint(unitId, OrderType.AttackMove, target.point));
        });
        this.lastOrderAt = context.game.getCurrentTick();
        return noop();
    }

    getGlobalDebugText(): string | undefined {
        return NAVAL_ASSAULT_MISSION_NAME;
    }

    getPriority(): number {
        return NAVAL_ASSAULT_PRIORITY;
    }

    isUnitsLocked(): boolean {
        return false;
    }

    private getNavalUnitIds(context: MissionContext): number[] {
        return context.game.getVisibleUnits(context.player.name, "self", (rules) => {
            if (NAVAL_UNIT_NAMES.has(rules.name)) {
                return true;
            }
            return this.options.includeTransports && TRANSPORT_NAMES.has(rules.name);
        });
    }

    private findBestTarget(context: MissionContext): { point: Vector2 } | null {
        const playerData = context.game.getPlayerData(context.player.name);
        const knownTargets = context.game
            .getAllUnits((rules) => NAVAL_UNIT_NAMES.has(rules.name) || rules.name === "NAYARD" || rules.name === "GAYARD")
            .map((id) => context.game.getUnitData(id))
            .filter((unit): unit is UnitData => !!unit && !isOwnedByNeutral(unit))
            .filter((unit) => unit.owner !== playerData.name)
            .filter((unit) => !context.game.areAlliedPlayers(playerData.name, unit.owner))
            .filter((unit) => context.game.getPlayerData(unit.owner).isCombatant);
        const bestKnownTarget = maxBy(knownTargets, (unit) => this.getTargetWeight(unit));
        if (bestKnownTarget) {
            return {
                point: new Vector2(bestKnownTarget.tile.rx, bestKnownTarget.tile.ry),
            };
        }
        const enemyPlayer = context.game
            .getPlayers()
            .map((name) => context.game.getPlayerData(name))
            .find(
                (otherPlayer) =>
                    otherPlayer.name !== playerData.name &&
                    !context.game.areAlliedPlayers(playerData.name, otherPlayer.name) &&
                    otherPlayer.isCombatant,
            );
        return enemyPlayer ? { point: enemyPlayer.startLocation } : null;
    }

    private getTargetWeight(unit: UnitData): number {
        if (NAVAL_UNIT_NAMES.has(unit.rules.name)) {
            return 1000000 + (unit.maxHitPoints ?? 0);
        }
        if (unit.rules.name === "NAYARD" || unit.rules.name === "GAYARD") {
            return 900000 + (unit.maxHitPoints ?? 0);
        }
        return unit.maxHitPoints ?? 0;
    }
}

export class NavalAssaultMissionFactory {
    private options: Required<NavalAssaultMissionFactoryOptions>;

    constructor(options: NavalAssaultMissionFactoryOptions = {}) {
        this.options = { ...DEFAULT_OPTIONS, ...options };
    }

    maybeCreateMissions(context: SupabotContext, missionController: MissionController, logger: DebugLogger): void {
        if (!this.options.enabled || !context.matchAwareness.isNavalMap()) {
            return;
        }
        if (missionController.getMissions().some((mission) => mission.getUniqueName() === NAVAL_ASSAULT_MISSION_NAME)) {
            return;
        }
        missionController.addMission(new NavalAssaultMission(this.options, logger));
    }
}
