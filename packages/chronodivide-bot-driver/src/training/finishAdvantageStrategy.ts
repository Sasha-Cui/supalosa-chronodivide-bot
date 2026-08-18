import {
    FactoryType,
    GameApi,
    ObjectType,
    OrderType,
    UnitData,
    WeaponData,
} from "@chronodivide/game-api";
import { Countries } from "@supalosa/chronodivide-bot/dist/bot/logic/common/utils.js";
import { BaselineFactory, InspectableBaselineBot } from "../benchmark/baselineLoader.js";
import {
    canonicalObjectiveMissionMembership,
    isObjectiveOffensiveMissionName,
    readObjectiveMissionOwnership,
} from "./objectiveMissionOwnership.js";
import {
    FinishAdvantageObjectiveCandidate,
    FinishAdvantageObjectiveDecision,
    computeFinishAdvantageOperationalPartition,
    estimateFinishAdvantageStaggeredDamageCompletion,
    hasFinishAdvantageIrreversibleCertificate,
    selectFinishAdvantageObjectiveDecision,
} from "./finishAdvantageControl.js";
import { FinishAdvantagePolicy, validateFinishAdvantagePolicy } from "./finishAdvantagePolicy.js";
import { objectiveUnitCompatibility } from "./persistentObjectiveCompletionStrategy.js";
import { publicEnemyUnits } from "./terminalRacePublicState.js";
import { createHash } from "node:crypto";

type Point = { x: number; y: number };
type Logger = (message: string, sayInGame?: boolean) => void;
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
type CandidateEvaluation = FinishAdvantageObjectiveCandidate & {
    target: UnitData;
    attackers: UnitData[];
    blocker: UnitData | null;
};

export type FinishAdvantageTelemetry = {
    schemaVersion: 4;
    event: "finish_advantage_decision";
    informationInterface: "public_complete_state";
    tick: number;
    country: Countries;
    mode: FinishAdvantagePolicy["multiBuildingMode"];
    phase: "inactive" | FinishAdvantageObjectiveDecision["kind"];
    reason: string;
    enemyBuildingCount: number;
    enemyMobileSelectableCombatantCount: number;
    irreversibleCertificate: boolean;
    irreversibleCertificateRevoked: boolean;
    missionOwnershipAvailable: boolean;
    missionMembershipSha256: string | null;
    nominalEligibleCount: number;
    protectedEligibleCount: number;
    protectedEligibleIds: number[];
    additionalReserveIds: number[];
    strikePoolIds: number[];
    selectedAttackerIds: number[];
    targetBuildingId: number | null;
    targetBuildingCoordinates: Point | null;
    targetBuildingHitPoints: number | null;
    targetBuildingVisible: boolean | null;
    buildingCompletionTicks: number | null;
    earliestInterceptTicks: number | null;
    earliestOwnBuildingLossTicks: number | null;
    blockerId: number | null;
    blockerCoordinates: Point | null;
    blockerVisible: boolean | null;
    blockerHitPoints: number | null;
    blockerRemovalTicks: number | null;
    baseRaceThreatId: number | null;
    objectiveProgress: "new_commitment" | "building_damage" | "approach" |
        "blocker_damage" | "blocker_removed" | "none";
    objectiveDistanceTiles: number | null;
    ticksSinceObjectiveProgress: number | null;
    stalledTargetId: number | null;
    issuedOrder: "attack_visible_building" | "approach_exact_unseen_building" |
        "attack_visible_blocker" | "approach_exact_unseen_blocker" | "none";
    forbiddenFieldsEmitted: [];
};

type TelemetrySink = (event: FinishAdvantageTelemetry) => void;

const point = (unit: UnitData): Point => ({ x: unit.tile.rx, y: unit.tile.ry });
const distance = (left: Point, right: Point): number => Math.hypot(left.x - right.x, left.y - right.y);

const foundationDistance = (candidate: Point, target: UnitData): number => {
    const left = target.tile.rx;
    const top = target.tile.ry;
    const right = left + Math.max(1, target.foundation.width) - 1;
    const bottom = top + Math.max(1, target.foundation.height) - 1;
    const dx = candidate.x < left ? left - candidate.x : candidate.x > right ? candidate.x - right : 0;
    const dy = candidate.y < top ? top - candidate.y : candidate.y > bottom ? candidate.y - bottom : 0;
    return Math.hypot(dx, dy);
};

const distanceToSegment = (candidate: Point, start: Point, end: Point): number => {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const lengthSquared = dx * dx + dy * dy;
    if (lengthSquared === 0) return distance(candidate, start);
    const fraction = Math.max(0, Math.min(1,
        ((candidate.x - start.x) * dx + (candidate.y - start.y) * dy) / lengthSquared,
    ));
    return distance(candidate, { x: start.x + fraction * dx, y: start.y + fraction * dy });
};

const weaponIsSpecial = (weapon: WeaponData): boolean =>
    !!weapon.rules.areaFire || !!weapon.rules.spawner || !!weapon.rules.limboLaunch ||
    !!weapon.rules.suicide || !!weapon.rules.fireOnce || weapon.warheadRules.cellSpread > 0 ||
    !!weapon.warheadRules.temporal || !!weapon.warheadRules.mindControl ||
    !!weapon.warheadRules.ivanBomb || !!weapon.projectileRules.arcing;

const ordinaryWeaponDamagePerTick = (weapon: WeaponData | undefined, target: UnitData): number => {
    if (
        !weapon || weaponIsSpecial(weapon) || weapon.rules.neverUse ||
        !weapon.projectileRules.isAntiGround || weapon.rules.damage <= 0 || weapon.rules.burst <= 0
    ) return 0;
    const verses = weapon.warheadRules.verses.get(target.rules.armor) ?? 0;
    if (!(verses > 0) || !(weapon.rules.rof > 0)) return 0;
    return weapon.rules.damage * weapon.rules.burst * verses / weapon.rules.rof;
};

const ordinaryDamagePerTick = (unit: UnitData, target: UnitData): number =>
    ordinaryWeaponDamagePerTick(unit.primaryWeapon, target) +
    ordinaryWeaponDamagePerTick(unit.secondaryWeapon, target);

const ordinaryMaximumRange = (unit: UnitData, target: UnitData): number =>
    [unit.primaryWeapon, unit.secondaryWeapon].reduce((maximum, weapon) =>
        weapon && ordinaryWeaponDamagePerTick(weapon, target) > 0
            ? Math.max(maximum, weapon.maxRange)
            : maximum,
    0);

const speedTilesPerTick = (unit: UnitData): number | null => {
    const speed = unit.rules.speed / 256;
    return Number.isFinite(speed) && speed > 0 ? speed : null;
};

const estimateTravelTicks = (unit: UnitData, target: UnitData, range: number): number | null => {
    const remaining = Math.max(0, foundationDistance(point(unit), target) - range);
    if (remaining === 0) return 0;
    const speed = speedTilesPerTick(unit);
    return speed === null ? null : remaining / speed;
};

const minimumOrdinaryAttackDistance = (
    units: readonly UnitData[],
    target: UnitData,
): number | null => {
    const distances = units.flatMap((unit): number[] => {
        const range = ordinaryMaximumRange(unit, target);
        if (!(range > 0) || ordinaryDamagePerTick(unit, target) <= 0) return [];
        return [Math.max(0, foundationDistance(point(unit), target) - range)];
    });
    return distances.length === 0 ? null : Math.min(...distances);
};

const compatibleOrdinaryAttackers = (
    game: GameApi,
    units: readonly UnitData[],
    target: UnitData,
): UnitData[] => units.filter((unit) => {
    const compatibility = objectiveUnitCompatibility(game, unit, target);
    return compatibility.compatible && compatibility.hasOrdinaryCompatibleWeapon &&
        ordinaryDamagePerTick(unit, target) > 0;
});

const estimateCompletionTicks = (
    game: GameApi,
    units: readonly UnitData[],
    target: UnitData,
): { attackers: UnitData[]; ticks: number } | null => {
    const attackers = compatibleOrdinaryAttackers(game, units, target);
    if (attackers.length === 0) return null;
    const travel = attackers.map((unit) => estimateTravelTicks(
        unit,
        target,
        ordinaryMaximumRange(unit, target),
    ));
    if (travel.some((value) => value === null)) return null;
    const completion = estimateFinishAdvantageStaggeredDamageCompletion(
        target.hitPoints,
        attackers.map((unit, index) => ({
            unitId: unit.id,
            arrivalTicks: (travel as number[])[index],
            damagePerTick: ordinaryDamagePerTick(unit, target),
        })),
    );
    if (!completion) return null;
    const participating = new Set(completion.participatingUnitIds);
    return {
        attackers: attackers.filter(({ id }) => participating.has(id)),
        ticks: completion.completionTicks,
    };
};

const selfUnits = (game: GameApi, playerName: string): UnitData[] => game.getAllUnits()
    .map((id) => game.getUnitData(id))
    .filter((unit): unit is UnitData => !!unit && unit.owner === playerName);

const strategicPriority = (building: UnitData): number =>
    building.rules.constructionYard ? 3 : building.rules.factory !== FactoryType.None ? 2 :
        building.rules.isSelectableCombatant ? 1 : 0;

const missionDigest = (value: unknown): string => createHash("sha256")
    .update(JSON.stringify(value))
    .digest("hex");

type RouteThreat = {
    unit: UnitData;
    interceptTicks: number;
    removalTicks: number;
    damagePerTick: number;
};

const routeThreats = (
    game: GameApi,
    attackers: readonly UnitData[],
    target: UnitData,
    enemyForces: readonly UnitData[],
    buildingCompletionTicks: number,
    policy: FinishAdvantagePolicy,
): RouteThreat[] => {
    if (attackers.length === 0) return [];
    const start = {
        x: attackers.reduce((sum, unit) => sum + unit.tile.rx, 0) / attackers.length,
        y: attackers.reduce((sum, unit) => sum + unit.tile.ry, 0) / attackers.length,
    };
    const end = point(target);
    const possible = enemyForces.flatMap((threat): RouteThreat[] => {
        const damagePerTick = Math.max(0, ...attackers.map((attacker) =>
            ordinaryDamagePerTick(threat, attacker),
        ));
        if (!(damagePerTick > 0)) return [];
        const routeDistance = distanceToSegment(point(threat), start, end);
        const speed = speedTilesPerTick(threat);
        const interceptTicks = routeDistance <= policy.routeCorridorRadiusTiles
            ? 0
            : speed === null
                ? Number.POSITIVE_INFINITY
                : (routeDistance - policy.routeCorridorRadiusTiles) / speed;
        if (
            !Number.isFinite(interceptTicks) ||
            interceptTicks >= buildingCompletionTicks + policy.safetyMarginTicks
        ) return [];
        const removal = estimateCompletionTicks(game, attackers, threat);
        if (!removal) return [];
        return [{ unit: threat, interceptTicks, removalTicks: removal.ticks, damagePerTick }];
    });
    const strikeHitPoints = attackers.reduce((sum, attacker) => sum + attacker.hitPoints, 0);
    const collapse = estimateFinishAdvantageStaggeredDamageCompletion(
        strikeHitPoints,
        possible.map(({ unit, interceptTicks, damagePerTick }) => ({
            unitId: unit.id,
            arrivalTicks: interceptTicks,
            damagePerTick,
        })),
    );
    if (
        !collapse ||
        collapse.completionTicks > buildingCompletionTicks + policy.safetyMarginTicks
    ) return [];
    const participating = new Set(collapse.participatingUnitIds);
    return possible.filter(({ unit }) => participating.has(unit.id)).sort((left, right) =>
        left.interceptTicks - right.interceptTicks ||
        left.removalTicks - right.removalTicks ||
        left.unit.id - right.unit.id,
    );
};

const estimateOwnBuildingLoss = (
    ownBuildings: readonly UnitData[],
    enemyForces: readonly UnitData[],
): { ticks: number; threatId: number } | null => {
    if (ownBuildings.length === 0 || enemyForces.length === 0) return null;
    const perBuilding = ownBuildings.map((building) => {
        const completion = estimateFinishAdvantageStaggeredDamageCompletion(
            building.hitPoints,
            enemyForces.flatMap((unit) => {
                const damagePerTick = ordinaryDamagePerTick(unit, building);
                if (!(damagePerTick > 0)) return [];
                const arrivalTicks = estimateTravelTicks(
                    unit,
                    building,
                    ordinaryMaximumRange(unit, building),
                );
                return arrivalTicks === null ? [] : [{
                    unitId: unit.id,
                    arrivalTicks,
                    damagePerTick,
                }];
            }),
        );
        return completion === null ? null : { buildingId: building.id, ...completion };
    });
    if (perBuilding.some((value) => value === null)) return null;
    const complete = perBuilding as Array<NonNullable<typeof perBuilding[number]>>;
    const ticks = Math.max(...complete.map(({ completionTicks }) => completionTicks));
    const causalThreatIds = complete
        .filter(({ completionTicks }) => Math.abs(completionTicks - ticks) <= 1e-9)
        .flatMap(({ participatingUnitIds }) => participatingUnitIds)
        .sort((left, right) => left - right);
    return Number.isFinite(ticks) && causalThreatIds.length > 0
        ? { ticks, threatId: causalThreatIds[0] }
        : null;
};

export class FinishAdvantageStrategy implements StrategyLike {
    private lastOrderTick = Number.NEGATIVE_INFINITY;
    private committedTargetId: number | null = null;
    private committedTargetHitPoints: number | null = null;
    private committedBlockerId: number | null = null;
    private committedBlockerHitPoints: number | null = null;
    private committedAttackerIds: number[] = [];
    private committedObjectiveDistanceTiles: number | null = null;
    private lastObjectiveProgressTick = 0;
    private progressAtLastUpdate: FinishAdvantageTelemetry["objectiveProgress"] = "none";
    private previousIrreversibleCertificate: boolean | null = null;
    private avoidedUntilTick = new Map<number, number>();

    constructor(
        private inner: StrategyLike,
        private readonly country: Countries,
        private readonly policy: FinishAdvantagePolicy,
        private readonly telemetry: TelemetrySink,
    ) {}

    onAiUpdate(context: StrategyContext, missionController: unknown, logger: Logger): StrategyLike {
        const next = this.inner.onAiUpdate(context, missionController, logger);
        if (next && typeof (next as StrategyLike).onAiUpdate === "function") this.inner = next as StrategyLike;
        this.update(context, missionController);
        return this;
    }

    private update(context: StrategyContext, missionController: unknown): void {
        const { game, player } = context;
        const tick = game.getCurrentTick();
        if (tick < this.lastOrderTick + this.policy.orderIntervalTicks) return;
        this.lastOrderTick = tick;
        this.progressAtLastUpdate = "none";
        const enemy = publicEnemyUnits(game, player.name, () => true);
        const buildings = enemy.filter((unit) => unit.type === ObjectType.Building)
            .sort((left, right) => left.id - right.id);
        const enemySelectable = enemy.filter((unit) => !!unit.rules.isSelectableCombatant);
        const enemyForces = enemySelectable.filter((unit) => unit.type !== ObjectType.Building);
        const enemyMobile = enemyForces.filter((unit) => unit.canMove !== false);
        const productionBuildings = buildings.filter((unit) => unit.rules.factory !== FactoryType.None);
        const baseUnits = new Set(game.getGeneralRules().baseUnit);
        const deployableBaseUnits = enemy.filter((unit) =>
            !!unit.rules.deploysInto && baseUnits.has(unit.rules.name),
        );
        const irreversibleCertificate = hasFinishAdvantageIrreversibleCertificate({
            enemyBuildingCount: buildings.length,
            enemySelectableCombatantCount: enemySelectable.length,
            enemyProductionBuildingCount: productionBuildings.length,
            enemyDeployableBaseUnitCount: deployableBaseUnits.length,
        });
        const irreversibleCertificateRevoked = this.previousIrreversibleCertificate === true &&
            !irreversibleCertificate;
        this.previousIrreversibleCertificate = irreversibleCertificate;
        if (buildings.length <= 1) {
            this.resetCommitment();
            this.emit(this.inactive(tick, buildings.length, enemyMobile.length, irreversibleCertificate,
                irreversibleCertificateRevoked,
                "outside_multi_building_scope"));
            return;
        }

        const mine = selfUnits(game, player.name);
        const ownBuildings = mine.filter((unit) => unit.type === ObjectType.Building);
        if (ownBuildings.length === 0) {
            this.resetCommitment();
            this.emit(this.inactive(tick, buildings.length, enemyMobile.length, irreversibleCertificate,
                irreversibleCertificateRevoked,
                "no_own_building"));
            return;
        }
        const ownership = readObjectiveMissionOwnership(missionController);
        if (!ownership.ok) {
            this.resetCommitment();
            this.emit(this.inactive(tick, buildings.length, enemyMobile.length, irreversibleCertificate,
                irreversibleCertificateRevoked,
                `mission_ownership_${ownership.reason}`));
            return;
        }

        let stalledTargetId: number | null = null;
        const committed = buildings.find(({ id }) => id === this.committedTargetId) ?? null;
        if (!committed) this.resetCommitment();
        else {
            if (
                this.committedTargetHitPoints !== null &&
                committed.hitPoints < this.committedTargetHitPoints
            ) this.recordProgress("building_damage", tick);
            this.committedTargetHitPoints = committed.hitPoints;

            let objective: UnitData = committed;
            if (this.committedBlockerId !== null) {
                const blocker = enemyForces.find(({ id }) => id === this.committedBlockerId) ?? null;
                if (!blocker) {
                    this.recordProgress("blocker_removed", tick);
                    this.committedBlockerId = null;
                    this.committedBlockerHitPoints = null;
                } else {
                    if (
                        this.committedBlockerHitPoints !== null &&
                        blocker.hitPoints < this.committedBlockerHitPoints
                    ) this.recordProgress("blocker_damage", tick);
                    this.committedBlockerHitPoints = blocker.hitPoints;
                    objective = blocker;
                }
            }
            const committedAttackerSet = new Set(this.committedAttackerIds);
            const committedAttackers = mine.filter(({ id }) => committedAttackerSet.has(id));
            const currentDistance = minimumOrdinaryAttackDistance(committedAttackers, objective);
            if (
                currentDistance !== null && this.committedObjectiveDistanceTiles !== null &&
                currentDistance + 1e-9 < this.committedObjectiveDistanceTiles
            ) this.recordProgress("approach", tick);
            this.committedObjectiveDistanceTiles = currentDistance;

            if (tick - this.lastObjectiveProgressTick >= this.policy.physicalProgressDeadlineTicks) {
                stalledTargetId = committed.id;
                this.avoidedUntilTick.set(committed.id, tick + this.policy.retargetCooldownTicks);
                this.resetCommitment();
            }
        }
        for (const [id, until] of this.avoidedUntilTick) if (until <= tick) this.avoidedUntilTick.delete(id);

        const compatibleByBuilding = new Map(buildings.map((building) => [
            building.id,
            compatibleOrdinaryAttackers(game, mine, building),
        ]));
        const nominalIds = new Set([...compatibleByBuilding.values()].flatMap((units) =>
            units.map(({ id }) => id),
        ));
        const nominal = mine.filter(({ id }) => nominalIds.has(id));
        const protectedUnits = nominal.filter((unit) => {
            const assignment = ownership.assignments.get(unit.id);
            return !!assignment && !isObjectiveOffensiveMissionName(assignment.missionName);
        });
        const protectedIds = new Set(protectedUnits.map(({ id }) => id));
        const ownStart = game.getPlayerData(player.name).startLocation;
        const leasePool = nominal.filter(({ id }) => !protectedIds.has(id)).sort((left, right) =>
            distance(point(left), ownStart) - distance(point(right), ownStart) || left.id - right.id,
        );
        const partition = computeFinishAdvantageOperationalPartition({
            nominalEligibleIds: nominal.map(({ id }) => id),
            protectedEligibleIds: protectedIds,
            leasePoolByHomeDistance: leasePool.map(({ id }) => id),
            enemyMobileSelectableCombatantCount: enemyMobile.length,
            margin: this.policy.surplusMargin,
            multiBuildingMode: this.policy.multiBuildingMode,
            irreversibleCertificate,
        });
        const strikeIds = new Set(partition.strikeIds);
        const strikePool = leasePool.filter(({ id }) => strikeIds.has(id));
        if (!partition.active || strikePool.length === 0) {
            this.resetCommitment();
            this.emit({
                ...this.inactive(tick, buildings.length, enemyMobile.length, irreversibleCertificate,
                    irreversibleCertificateRevoked,
                    partition.activationReason === "inactive" ? "no_certified_surplus" : "empty_strike_pool"),
                missionOwnershipAvailable: true,
                missionMembershipSha256: missionDigest(canonicalObjectiveMissionMembership(ownership)),
                nominalEligibleCount: nominal.length,
                protectedEligibleCount: protectedIds.size,
                protectedEligibleIds: [...protectedIds].sort((left, right) => left - right),
                additionalReserveIds: partition.additionalReserveIds,
                strikePoolIds: partition.strikeIds,
            });
            return;
        }

        const ownLoss = estimateOwnBuildingLoss(ownBuildings, enemyForces);
        const evaluations = buildings.flatMap((target): CandidateEvaluation[] => {
            const completion = estimateCompletionTicks(game, strikePool, target);
            if (!completion) return [];
            const threats = routeThreats(
                game,
                completion.attackers,
                target,
                enemyForces,
                completion.ticks,
                this.policy,
            );
            const blocker = threats[0] ?? null;
            return [{
                target,
                attackers: completion.attackers,
                blocker: blocker?.unit ?? null,
                buildingId: target.id,
                strategicPriority: strategicPriority(target),
                buildingCompletionTicks: completion.ticks,
                earliestInterceptTicks: blocker?.interceptTicks ?? null,
                blockerId: blocker?.unit.id ?? null,
                blockerRemovalTicks: blocker?.removalTicks ?? null,
                stalled: (this.avoidedUntilTick.get(target.id) ?? Number.NEGATIVE_INFINITY) > tick,
            }];
        });
        const evaluate = (values: readonly CandidateEvaluation[]) => selectFinishAdvantageObjectiveDecision({
            candidates: values,
            earliestOwnBuildingLossTicks: ownLoss?.ticks ?? null,
            baseRaceThreatId: ownLoss?.threatId ?? null,
            safetyMarginTicks: this.policy.safetyMarginTicks,
        });
        const committedEvaluation = evaluations.find(({ buildingId }) => buildingId === this.committedTargetId);
        let decision = committedEvaluation && !committedEvaluation.stalled
            ? evaluate([committedEvaluation])
            : evaluate(evaluations);
        if (
            committedEvaluation &&
            decision.kind === "predecessor_fallback" &&
            decision.reason === "no_live_reachable_objective"
        ) decision = evaluate(evaluations);
        const selected = decision.targetBuildingId === null
            ? null
            : evaluations.find(({ buildingId }) => buildingId === decision.targetBuildingId) ?? null;
        const visibleEnemyIds = new Set(game.getVisibleUnits(player.name, "enemy"));
        let issuedOrder: FinishAdvantageTelemetry["issuedOrder"] = "none";
        if (decision.kind === "building_strike" && selected) {
            this.commit(selected.target, selected.attackers, null, tick);
            const ids = selected.attackers.map(({ id }) => id);
            const visible = visibleEnemyIds.has(selected.target.id);
            if (visible) {
                player.actions.orderUnits(ids, OrderType.Attack, selected.target.id);
                issuedOrder = "attack_visible_building";
            } else {
                player.actions.orderUnits(ids, OrderType.AttackMove, selected.target.tile.rx, selected.target.tile.ry);
                issuedOrder = "approach_exact_unseen_building";
            }
        } else if (decision.kind === "blocker_clear" && selected?.blocker) {
            this.commit(selected.target, selected.attackers, selected.blocker, tick);
            const ids = selected.attackers.map(({ id }) => id);
            const visible = visibleEnemyIds.has(selected.blocker.id);
            if (visible) {
                player.actions.orderUnits(ids, OrderType.Attack, selected.blocker.id);
                issuedOrder = "attack_visible_blocker";
            } else {
                player.actions.orderUnits(ids, OrderType.AttackMove, selected.blocker.tile.rx, selected.blocker.tile.ry);
                issuedOrder = "approach_exact_unseen_blocker";
            }
        }
        this.emit({
            schemaVersion: 4,
            event: "finish_advantage_decision",
            informationInterface: "public_complete_state",
            tick,
            country: this.country,
            mode: this.policy.multiBuildingMode,
            phase: decision.kind,
            reason: decision.reason,
            enemyBuildingCount: buildings.length,
            enemyMobileSelectableCombatantCount: enemyMobile.length,
            irreversibleCertificate,
            irreversibleCertificateRevoked,
            missionOwnershipAvailable: true,
            missionMembershipSha256: missionDigest(canonicalObjectiveMissionMembership(ownership)),
            nominalEligibleCount: nominal.length,
            protectedEligibleCount: protectedIds.size,
            protectedEligibleIds: [...protectedIds].sort((left, right) => left - right),
            additionalReserveIds: partition.additionalReserveIds,
            strikePoolIds: partition.strikeIds,
            selectedAttackerIds: issuedOrder === "none" ? [] : selected?.attackers.map(({ id }) => id) ?? [],
            targetBuildingId: decision.targetBuildingId,
            targetBuildingCoordinates: selected ? point(selected.target) : null,
            targetBuildingHitPoints: selected?.target.hitPoints ?? null,
            targetBuildingVisible: selected ? visibleEnemyIds.has(selected.target.id) : null,
            buildingCompletionTicks: selected?.buildingCompletionTicks ?? null,
            earliestInterceptTicks: selected?.earliestInterceptTicks ?? null,
            earliestOwnBuildingLossTicks: ownLoss?.ticks ?? null,
            blockerId: decision.blockerId,
            blockerCoordinates: selected?.blocker ? point(selected.blocker) : null,
            blockerVisible: selected?.blocker ? visibleEnemyIds.has(selected.blocker.id) : null,
            blockerHitPoints: selected?.blocker?.hitPoints ?? null,
            blockerRemovalTicks: selected?.blockerRemovalTicks ?? null,
            baseRaceThreatId: decision.threatId,
            objectiveProgress: this.progressAtLastUpdate,
            objectiveDistanceTiles: this.committedObjectiveDistanceTiles,
            ticksSinceObjectiveProgress: this.committedTargetId === null
                ? null
                : tick - this.lastObjectiveProgressTick,
            stalledTargetId,
            issuedOrder,
            forbiddenFieldsEmitted: [],
        });
    }

    private commit(
        target: UnitData,
        attackers: readonly UnitData[],
        blocker: UnitData | null,
        tick: number,
    ): void {
        const sameObjective = this.committedTargetId === target.id &&
            this.committedBlockerId === (blocker?.id ?? null);
        this.committedAttackerIds = attackers.map(({ id }) => id);
        if (sameObjective) return;
        this.committedTargetId = target.id;
        this.committedTargetHitPoints = target.hitPoints;
        this.committedBlockerId = blocker?.id ?? null;
        this.committedBlockerHitPoints = blocker?.hitPoints ?? null;
        this.committedObjectiveDistanceTiles = minimumOrdinaryAttackDistance(
            attackers,
            blocker ?? target,
        );
        this.recordProgress("new_commitment", tick);
    }

    private recordProgress(
        progress: Exclude<FinishAdvantageTelemetry["objectiveProgress"], "none">,
        tick: number,
    ): void {
        this.lastObjectiveProgressTick = tick;
        this.progressAtLastUpdate = progress;
    }

    private resetCommitment(): void {
        this.committedTargetId = null;
        this.committedTargetHitPoints = null;
        this.committedBlockerId = null;
        this.committedBlockerHitPoints = null;
        this.committedAttackerIds = [];
        this.committedObjectiveDistanceTiles = null;
        this.lastObjectiveProgressTick = 0;
    }

    private inactive(
        tick: number,
        enemyBuildingCount: number,
        enemyMobileSelectableCombatantCount: number,
        irreversibleCertificate: boolean,
        irreversibleCertificateRevoked: boolean,
        reason: string,
    ): FinishAdvantageTelemetry {
        return {
            schemaVersion: 4,
            event: "finish_advantage_decision",
            informationInterface: "public_complete_state",
            tick,
            country: this.country,
            mode: this.policy.multiBuildingMode,
            phase: "inactive",
            reason,
            enemyBuildingCount,
            enemyMobileSelectableCombatantCount,
            irreversibleCertificate,
            irreversibleCertificateRevoked,
            missionOwnershipAvailable: false,
            missionMembershipSha256: null,
            nominalEligibleCount: 0,
            protectedEligibleCount: 0,
            protectedEligibleIds: [],
            additionalReserveIds: [],
            strikePoolIds: [],
            selectedAttackerIds: [],
            targetBuildingId: null,
            targetBuildingCoordinates: null,
            targetBuildingHitPoints: null,
            targetBuildingVisible: null,
            buildingCompletionTicks: null,
            earliestInterceptTicks: null,
            earliestOwnBuildingLossTicks: null,
            blockerId: null,
            blockerCoordinates: null,
            blockerVisible: null,
            blockerHitPoints: null,
            blockerRemovalTicks: null,
            baseRaceThreatId: null,
            objectiveProgress: "none",
            objectiveDistanceTiles: null,
            ticksSinceObjectiveProgress: null,
            stalledTargetId: null,
            issuedOrder: "none",
            forbiddenFieldsEmitted: [],
        };
    }

    private lastTelemetrySignature = "";
    private lastTelemetryTick = Number.NEGATIVE_INFINITY;
    private emit(event: FinishAdvantageTelemetry): void {
        const signature = JSON.stringify({ ...event, tick: 0 });
        if (signature === this.lastTelemetrySignature && event.tick < this.lastTelemetryTick + 120) return;
        this.telemetry(event);
        this.lastTelemetrySignature = signature;
        this.lastTelemetryTick = event.tick;
    }
}

export const createFinishAdvantageCandidate = (
    factory: BaselineFactory,
    name: string,
    country: Countries,
    rawPolicy: FinishAdvantagePolicy,
    telemetry: TelemetrySink = () => undefined,
): InspectableBaselineBot => {
    const policy = validateFinishAdvantagePolicy(rawPolicy);
    if (!policy.enabled) return factory.create(name, country);
    if (!factory.createDefaultStrategy || !factory.createWithStrategy) {
        throw new Error("Pinned baseline lacks the finish-advantage strategy-construction interface");
    }
    const inner = factory.createDefaultStrategy();
    if (!inner || typeof (inner as StrategyLike).onAiUpdate !== "function") {
        throw new Error("Pinned baseline DefaultStrategy does not expose onAiUpdate");
    }
    return factory.createWithStrategy(
        name,
        country,
        new FinishAdvantageStrategy(inner as StrategyLike, country, policy, telemetry),
    );
};
