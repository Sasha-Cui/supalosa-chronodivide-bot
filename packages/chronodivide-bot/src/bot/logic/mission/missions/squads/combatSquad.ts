import {
    MovementZone,
    UnitData,
    Vector2,
} from "@chronodivide/game-api";
import { CombatTargetPriority, getAttackWeight, manageAttackMicro, manageMoveMicro } from "./common.js";
import { DebugLogger, isOwnedByNeutral, maxBy } from "../../../common/utils.js";
import { ActionBatcher, BatchableAction } from "../../actionBatcher.js";
import { Squad } from "./squad.js";
import { Mission, MissionAction, noop } from "../../mission.js";
import { MissionContext } from "../../../common/context.js";

const TARGET_UPDATE_INTERVAL_TICKS = 10;

// Units must be in a certain radius of the leader before attacking.
const MIN_GATHER_RADIUS = 5;

// If the radius expands beyond this amount then we should switch back to gathering mode.
const MAX_GATHER_RADIUS = 15;

const GATHER_RATIO = 10;

const ATTACK_SCAN_AREA = 15;

const FOLLOW_LEADER_RADIUS = 5;

enum SquadState {
    Gathering,
    Attacking,
}

export class CombatSquad implements Squad {
    private lastCommand: number | null = null;
    private state = SquadState.Gathering;

    private debugLastTarget: string | undefined;

    private lastOrderGiven: { [unitId: number]: BatchableAction } = {};

    /**
     *
     * @param rallyArea the initial location to grab combatants
     * @param targetArea
     * @param radius
     */
    constructor(
        private rallyArea: Vector2,
        private targetArea: Vector2,
        private radius: number,
        private targetPriority: CombatTargetPriority = "distance",
    ) {}

    public getGlobalDebugText(): string | undefined {
        return this.debugLastTarget ?? "<none>";
    }

    public setAttackArea(targetArea: Vector2) {
        this.targetArea = targetArea;
    }

    public onAiUpdate(context: MissionContext, mission: Mission<any>, logger: DebugLogger): MissionAction {
        const { game, actionBatcher, matchAwareness } = context;
        const playerData = game.getPlayerData(context.player.name);
        if (
            mission.getUnitIds().length > 0 &&
            (!this.lastCommand || game.getCurrentTick() > this.lastCommand + TARGET_UPDATE_INTERVAL_TICKS)
        ) {
            this.lastCommand = game.getCurrentTick();
            const unitIds = mission.getUnitsMatchingByRule(game, (r) => this.canSquadControl(r));
            const units = unitIds.map((unitId) => game.getUnitData(unitId)).filter((unit): unit is UnitData => !!unit);
            const leader = this.selectLeader(units);
            if (!leader) {
                return noop();
            }

            const targetPoint = this.targetArea || playerData.startLocation;
            const maxDistanceToLeader = this.getMaxDistanceToLeader(units, leader);
            const groundUnitCount = units.filter((unit) => this.isGroundUnit(unit)).length;

            if (this.state === SquadState.Gathering) {
                const requiredGatherRadius = Math.sqrt(groundUnitCount) * GATHER_RATIO + MIN_GATHER_RADIUS;
                if (maxDistanceToLeader > requiredGatherRadius) {
                    this.orderSquadToPoint(actionBatcher, units, leader, targetPoint);
                } else {
                    logger(`CombatSquad ${mission.getUniqueName()} switching back to attack mode (${maxDistanceToLeader})`);
                    this.state = SquadState.Attacking;
                }
            } else {
                const requiredGatherRadius = Math.sqrt(groundUnitCount) * GATHER_RATIO + MAX_GATHER_RADIUS;
                if (maxDistanceToLeader > requiredGatherRadius) {
                    // Switch back to gather mode
                    logger(`CombatSquad ${mission.getUniqueName()} switching back to gather (${maxDistanceToLeader})`);
                    this.state = SquadState.Gathering;
                    return noop();
                }
                // The unit with the shortest range chooses the target. Otherwise, a base range of 5 is chosen.
                const getRangeForUnit = (unit: UnitData) =>
                    unit.primaryWeapon?.maxRange ?? unit.secondaryWeapon?.maxRange ?? 5;
                const attackLeader = maxBy(units, (unit) => -getRangeForUnit(unit));
                if (!attackLeader) {
                    return noop();
                }
                // Find units within scan range of the leader.
                const nearbyHostiles = matchAwareness
                    .getHostilesNearPoint(attackLeader.tile.rx, attackLeader.tile.ry, ATTACK_SCAN_AREA)
                    .map(({ unitId }) => game.getUnitData(unitId))
                    .filter((unit) => !isOwnedByNeutral(unit)) as UnitData[];

                for (const unit of units) {
                    const bestUnit = this.selectBestTarget(unit, nearbyHostiles);
                    if (bestUnit) {
                        this.submitActionIfNew(actionBatcher, manageAttackMicro(unit, bestUnit));
                        this.debugLastTarget = `Unit ${bestUnit.id.toString()}`;
                    } else if (unit.id === leader.id) {
                        this.submitActionIfNew(actionBatcher, manageMoveMicro(unit, targetPoint));
                        this.debugLastTarget = `leader @${targetPoint.x},${targetPoint.y}`;
                    } else {
                        const leaderPoint = this.getUnitPoint(leader);
                        const ownPoint = this.getUnitPoint(unit);
                        const followPoint = ownPoint.distanceTo(leaderPoint) > FOLLOW_LEADER_RADIUS ? leaderPoint : targetPoint;
                        this.submitActionIfNew(actionBatcher, manageMoveMicro(unit, followPoint));
                        this.debugLastTarget = `follow ${leader.id}`;
                    }
                }
            }
        }
        return noop();
    }

    private selectBestTarget(unit: UnitData, nearbyHostiles: UnitData[]): UnitData | null {
        const weightedTargets = nearbyHostiles
            .map((target) => ({ target, weight: getAttackWeight(unit, target, this.targetPriority) }))
            .filter((entry): entry is { target: UnitData; weight: number } => entry.weight !== null);
        return maxBy(weightedTargets, (entry) => entry.weight)?.target ?? null;
    }

    /**
     * Sends an action to the actionBatcher if and only if the action is different from the last action we submitted to it.
     * Prevents spamming redundant orders, which affects performance and can also cause the unit to sit around doing nothing.
     */
    private submitActionIfNew(actionBatcher: ActionBatcher, action: BatchableAction) {
        const lastAction = this.lastOrderGiven[action.unitId];
        if (!lastAction || !lastAction.isSameAs(action)) {
            actionBatcher.push(action);
            this.lastOrderGiven[action.unitId] = action;
        }
    }

    private orderSquadToPoint(actionBatcher: ActionBatcher, units: UnitData[], leader: UnitData, targetPoint: Vector2): void {
        const leaderPoint = this.getUnitPoint(leader);
        for (const unit of units) {
            const movePoint = unit.id === leader.id ? targetPoint : leaderPoint;
            this.submitActionIfNew(actionBatcher, manageMoveMicro(unit, movePoint));
        }
        this.debugLastTarget = `leader ${leader.id} @${targetPoint.x},${targetPoint.y}`;
    }

    private selectLeader(units: UnitData[]): UnitData | null {
        const candidates = units.filter((unit) => this.isGroundUnit(unit));
        const selectableUnits = candidates.length > 0 ? candidates : units;
        return selectableUnits
            .slice()
            .sort((a, b) => {
                const speedDiff = this.getLeaderSpeed(a) - this.getLeaderSpeed(b);
                return speedDiff !== 0 ? speedDiff : a.id - b.id;
            })[0] ?? null;
    }

    private getLeaderSpeed(unit: UnitData): number {
        return unit.rules.speed > 0 ? unit.rules.speed : Number.POSITIVE_INFINITY;
    }

    private getMaxDistanceToLeader(units: UnitData[], leader: UnitData): number {
        const leaderPoint = this.getUnitPoint(leader);
        return units.reduce((maxDistance, unit) => Math.max(maxDistance, this.getUnitPoint(unit).distanceTo(leaderPoint)), 0);
    }

    private getUnitPoint(unit: UnitData): Vector2 {
        return new Vector2(unit.tile.rx, unit.tile.ry);
    }

    private canSquadControl(rules: UnitData["rules"]): boolean {
        return (
            rules.isSelectableCombatant ||
            !!rules.primary ||
            !!rules.secondary ||
            rules.engineer ||
            rules.agent ||
            rules.infiltrate ||
            rules.c4 ||
            rules.ivan
        );
    }

    private isGroundUnit(unit: UnitData): boolean {
        return (
            unit.rules.movementZone === MovementZone.Infantry ||
            unit.rules.movementZone === MovementZone.Normal ||
            unit.rules.movementZone === MovementZone.InfantryDestroyer ||
            unit.rules.movementZone === MovementZone.Amphibious ||
            unit.rules.movementZone === MovementZone.AmphibiousDestroyer ||
            unit.rules.movementZone === MovementZone.AmphibiousCrusher ||
            unit.rules.movementZone === MovementZone.Destroyer ||
            unit.rules.movementZone === MovementZone.Crusher
        );
    }
}
