import { AttackState, ObjectType, OrderType, StanceType, UnitData, Vector2, ZoneType } from "@chronodivide/game-api";
import { getDistanceBetweenPoints, getDistanceBetweenUnits } from "../../../map/map.js";
import { BatchableAction } from "../../actionBatcher.js";

const NONCE_GI_DEPLOY = 0;
const NONCE_GI_UNDEPLOY = 1;

export type CombatTargetPriority = "distance" | "strategic";

// Micro methods
export function manageMoveMicro(attacker: UnitData, attackPoint: Vector2): BatchableAction {
    if (attacker.name === "E1") {
        const isDeployed = attacker.stance === StanceType.Deployed;
        if (isDeployed) {
            return BatchableAction.noTarget(attacker.id, OrderType.DeploySelected, NONCE_GI_UNDEPLOY);
        }
    }

    return BatchableAction.toPoint(attacker.id, OrderType.AttackMove, attackPoint);
}

export function manageAttackMicro(attacker: UnitData, target: UnitData): BatchableAction {
    const distance = getDistanceBetweenUnits(attacker, target);
    if (target.type === ObjectType.Building) {
        if (attacker.rules.engineer && (target.rules.capturable || target.rules.needsEngineer)) {
            return BatchableAction.toTargetId(attacker.id, OrderType.Capture, target.id);
        }
        if ((attacker.rules.agent || attacker.rules.infiltrate) && target.rules.spyable) {
            return BatchableAction.toTargetId(attacker.id, OrderType.Capture, target.id);
        }
        if ((attacker.rules.c4 || attacker.rules.ivan) && target.rules.canC4) {
            return BatchableAction.toTargetId(attacker.id, OrderType.PlaceBomb, target.id);
        }
    }
    if (attacker.name === "E1") {
        // Para (deployed weapon) range is 5.
        const deployedWeaponRange = attacker.secondaryWeapon?.maxRange || 5;
        const isDeployed = attacker.stance === StanceType.Deployed;
        if (!isDeployed && (distance <= deployedWeaponRange || attacker.attackState === AttackState.JustFired)) {
            return BatchableAction.noTarget(attacker.id, OrderType.DeploySelected, NONCE_GI_DEPLOY);
        } else if (isDeployed && distance > deployedWeaponRange) {
            return BatchableAction.noTarget(attacker.id, OrderType.DeploySelected, NONCE_GI_UNDEPLOY);
        }
    }
    if (attacker.name === "DESO") {
        const deployedWeaponRange = attacker.secondaryWeapon?.maxRange || 4;
        const isDeployed = attacker.stance === StanceType.Deployed;
        if (!isDeployed && distance <= deployedWeaponRange) {
            return BatchableAction.noTarget(attacker.id, OrderType.DeploySelected, NONCE_GI_DEPLOY);
        } else if (isDeployed && distance > deployedWeaponRange) {
            return BatchableAction.noTarget(attacker.id, OrderType.DeploySelected, NONCE_GI_UNDEPLOY);
        }
    }
    let targetData = target;
    let orderType: OrderType = OrderType.Attack;
    const primaryWeaponRange = attacker.primaryWeapon?.maxRange || 5;
    if (targetData?.type == ObjectType.Building && distance < primaryWeaponRange * 0.8) {
        orderType = OrderType.Attack;
    } else if (targetData?.rules.canDisguise) {
        // Special case for mirage tank/spy as otherwise they just sit next to it.
        orderType = OrderType.Attack;
    }
    return BatchableAction.toTargetId(attacker.id, orderType, target.id);
}

/**
 *
 * @param attacker
 * @param target
 * @returns A number describing the weight of the given target for the attacker, or null if it should not attack it.
 */
export function getAttackWeight(
    attacker: UnitData,
    target: UnitData,
    targetPriority: CombatTargetPriority = "distance",
): number | null {
    const { rx: x, ry: y } = attacker.tile;
    const { rx: hX, ry: hY } = target.tile;

    const distanceWeight = 1000000 - getDistanceBetweenPoints(new Vector2(x, y), new Vector2(hX, hY));
    if (target.type === ObjectType.Building) {
        if (attacker.rules.engineer && (target.rules.capturable || target.rules.needsEngineer)) {
            return 9000000 + distanceWeight;
        }
        if ((attacker.rules.agent || attacker.rules.infiltrate) && target.rules.spyable) {
            return 8500000 + distanceWeight;
        }
        if ((attacker.rules.c4 || attacker.rules.ivan) && target.rules.canC4) {
            return 8200000 + distanceWeight;
        }
    }

    if ((attacker.name === "DOG" || attacker.name === "ADOG") && target.type === ObjectType.Infantry) {
        return 7000000 + distanceWeight;
    }

    if (target.zone !== undefined && !canAttackZone(attacker, target.zone)) {
        return null;
    }

    if (targetPriority === "distance") {
        return distanceWeight;
    }

    return getStrategicTargetWeight(target) + distanceWeight;
}

function canAttackZone(attacker: UnitData, targetZone: ZoneType): boolean {
    const weapons = [attacker.primaryWeapon, attacker.secondaryWeapon];
    if (targetZone === ZoneType.Air) {
        return weapons.some((weapon) => !!weapon?.projectileRules.isAntiAir);
    }
    if (targetZone === ZoneType.Ground) {
        return weapons.some((weapon) => !!weapon?.projectileRules.isAntiGround);
    }
    return true;
}

function getStrategicTargetWeight(target: UnitData): number {
    if (target.rules.isSelectableCombatant) {
        return 9000000 + (target.maxHitPoints ?? 0);
    }
    if (target.rules.constructionYard) {
        return 8000000 + (target.maxHitPoints ?? 0);
    }
    if (target.rules.weaponsFactory) {
        return 7000000 + (target.maxHitPoints ?? 0);
    }
    if (target.rules.refinery) {
        return 6000000 + (target.maxHitPoints ?? 0);
    }
    if (target.rules.harvester) {
        return 5000000 + (target.maxHitPoints ?? 0);
    }
    if (target.type === ObjectType.Building) {
        return 4000000 + (target.maxHitPoints ?? 0);
    }
    return target.maxHitPoints ?? 0;
}
