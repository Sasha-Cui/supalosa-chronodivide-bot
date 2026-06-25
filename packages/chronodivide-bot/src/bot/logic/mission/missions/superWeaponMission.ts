import { ObjectType, SuperWeaponData, SuperWeaponStatus, SuperWeaponType, UnitData, Vector2 } from "@chronodivide/game-api";
import { DebugLogger, isOwnedByNeutral, maxBy } from "../../common/utils.js";
import { Mission, MissionAction, noop } from "../mission.js";
import { MissionContext } from "../../common/context.js";

const SUPERWEAPON_CHECK_INTERVAL_TICKS = 150;
const OFFENSIVE_RADIUS = 6;
const PARADROP_RADIUS = 10;

export class SuperWeaponMission extends Mission {
    private lastCheckAt = -SUPERWEAPON_CHECK_INTERVAL_TICKS;

    constructor(logger: DebugLogger) {
        super("superWeaponUsage", logger);
    }

    _onAiUpdate(context: MissionContext): MissionAction {
        const tick = context.game.getCurrentTick();
        if (tick < this.lastCheckAt + SUPERWEAPON_CHECK_INTERVAL_TICKS) {
            return noop();
        }
        this.lastCheckAt = tick;

        const playerData = context.game.getPlayerData(context.player.name);
        const readyWeapons = context.game
            .getAllSuperWeaponData()
            .filter((weapon) => weapon.playerName === playerData.name && weapon.status === SuperWeaponStatus.Ready);

        for (const weapon of readyWeapons) {
            const target = this.selectTarget(context, weapon);
            if (!target) {
                continue;
            }
            context.player.actions.activateSuperWeapon(weapon.type, { rx: target.x, ry: target.y });
            this.logger(`Activated ${SuperWeaponType[weapon.type]} at ${target.x},${target.y}`);
        }

        return noop();
    }

    getGlobalDebugText(): string | undefined {
        return "superweapons";
    }

    getPriority(): number {
        return 0;
    }

    isUnitsLocked(): boolean {
        return false;
    }

    private selectTarget(context: MissionContext, weapon: SuperWeaponData): Vector2 | null {
        switch (weapon.type) {
            case SuperWeaponType.MultiMissile:
            case SuperWeaponType.LightningStorm:
                return this.selectOffensiveTarget(context, OFFENSIVE_RADIUS);
            case SuperWeaponType.ParaDrop:
            case SuperWeaponType.AmerParaDrop:
                return this.selectOffensiveTarget(context, PARADROP_RADIUS);
            default:
                return null;
        }
    }

    private selectOffensiveTarget(context: MissionContext, radius: number): Vector2 | null {
        const { game, player } = context;
        const playerData = game.getPlayerData(player.name);
        const enemyUnits = game
            .getVisibleUnits(player.name, "enemy")
            .map((unitId) => game.getUnitData(unitId))
            .filter((unit): unit is UnitData => !!unit && !isOwnedByNeutral(unit))
            .filter((unit) => !game.areAlliedPlayers(playerData.name, unit.owner))
            .filter((unit) => game.getPlayerData(unit.owner).isCombatant);
        if (enemyUnits.length === 0) {
            const enemyStart = game
                .getPlayers()
                .map((name) => game.getPlayerData(name))
                .find((otherPlayer) =>
                    otherPlayer.name !== playerData.name &&
                    !game.areAlliedPlayers(playerData.name, otherPlayer.name) &&
                    otherPlayer.isCombatant
                )?.startLocation;
            return enemyStart ?? null;
        }

        const ownUnits = game
            .getVisibleUnits(player.name, "self")
            .map((unitId) => game.getUnitData(unitId))
            .filter((unit): unit is UnitData => !!unit);

        const bestTarget = maxBy(enemyUnits, (candidate) => {
            const point = new Vector2(candidate.tile.rx, candidate.tile.ry);
            const enemyScore = enemyUnits.reduce((score, target) => {
                const distance = point.distanceTo(new Vector2(target.tile.rx, target.tile.ry));
                if (distance > radius) {
                    return score;
                }
                return score + this.getEnemyTargetWeight(target);
            }, 0);
            const friendlyPenalty = ownUnits.reduce((penalty, unit) => {
                const distance = point.distanceTo(new Vector2(unit.tile.rx, unit.tile.ry));
                return distance <= radius ? penalty + 500 : penalty;
            }, 0);
            return enemyScore - friendlyPenalty;
        });
        return bestTarget ? new Vector2(bestTarget.tile.rx, bestTarget.tile.ry) : null;
    }

    private getEnemyTargetWeight(target: UnitData): number {
        if (target.rules.constructionYard) {
            return 1800;
        }
        if (target.rules.weaponsFactory) {
            return 1400;
        }
        if (target.rules.refinery) {
            return 1200;
        }
        if (target.type === ObjectType.Building) {
            return 800 + (target.maxHitPoints ?? 0) / 10;
        }
        if (target.rules.isSelectableCombatant) {
            return 250 + (target.maxHitPoints ?? 0) / 10;
        }
        return 100;
    }
}
