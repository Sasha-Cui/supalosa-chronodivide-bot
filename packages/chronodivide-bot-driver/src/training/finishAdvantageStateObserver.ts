import { createHash } from "node:crypto";
import { FactoryType, GameApi, ObjectType, UnitData } from "@chronodivide/game-api";
import { Countries } from "@supalosa/chronodivide-bot/dist/bot/logic/common/utils.js";
import { BaselineFactory, InspectableBaselineBot } from "../benchmark/baselineLoader.js";
import {
    canonicalObjectiveMissionMembership,
    isObjectiveOffensiveMissionName,
    readObjectiveMissionOwnership,
} from "./objectiveMissionOwnership.js";
import {
    FINISH_ADVANTAGE_BASE_RESERVE,
    FINISH_ADVANTAGE_MARGINS,
    FinishAdvantageMargin,
    computeFinishAdvantagePartition,
    hasFinishAdvantageIrreversibleCertificate,
} from "./finishAdvantageControl.js";
import { objectiveUnitCompatibility } from "./persistentObjectiveCompletionStrategy.js";
import { publicEnemyUnits } from "./terminalRacePublicState.js";

export const FINISH_ADVANTAGE_AUDIT_MARGINS = FINISH_ADVANTAGE_MARGINS;
export const FINISH_ADVANTAGE_AUDIT_BASE_RESERVE = FINISH_ADVANTAGE_BASE_RESERVE;
export const FINISH_ADVANTAGE_AUDIT_SAMPLE_INTERVAL_TICKS = 120 as const;

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
type Margin = FinishAdvantageMargin;

export type FinishAdvantageAuditCellContext = {
    country: Countries;
    candidateSlot: 0 | 1;
    faction: "Allied" | "Soviet";
};

export type FinishAdvantageMarginExposure = {
    margin: Margin;
    desiredCover: number;
    protectedCount: number;
    additionalReserveCount: number;
    leasePoolCount: number;
    effectiveStrikeCount: number;
    compatibleFiniteTargetCount: number;
    exposed: boolean;
    minimumEstimatedDamageTicks: number | null;
};

export type FinishAdvantageStateRecord = {
    schemaVersion: 1;
    event: "finish_advantage_state";
    informationInterface: "public_complete_state";
    country: Countries;
    candidateSlot: 0 | 1;
    faction: "Allied" | "Soviet";
    tick: number;
    samplingReason: "interval" | "building_count_transition" | "certificate_transition" | "initial";
    ownBuildingCount: number;
    enemyBuildingCount: number;
    maximumObservedEnemyBuildingCount: number;
    enemySelectableCombatantCount: number;
    enemyProductionBuildingCount: number;
    enemyDeployableBaseUnitCount: number;
    enemyMobileSelectableCombatantCount: number;
    irreversibleCertificate: boolean;
    finalBuildingState: boolean;
    nominalEligibleAntiBuildingCount: number;
    protectedEligibleCount: number;
    offensiveEligibleCount: number;
    unassignedEligibleCount: number;
    protectedCountsByCategory: Record<string, number>;
    missionOwnershipAvailable: boolean;
    missionOwnershipFailure: string | null;
    missionMembershipSha256: string | null;
    enemyBuildingsWithFiniteCompatibleMission: number;
    compatibleReachableAttackersByBuilding: number[];
    selectedTargetVisible: boolean | null;
    selectedTargetPotentialRouteThreatCount: number | null;
    ticksSincePhysicalBuildingDamage: number | null;
    margins: FinishAdvantageMarginExposure[];
    forbiddenFieldsEmitted: [];
};

export type FinishAdvantageStateSink = (record: FinishAdvantageStateRecord) => void;

const digest = (value: unknown): string => createHash("sha256")
    .update(JSON.stringify(value))
    .digest("hex");

const selfUnits = (game: GameApi, playerName: string): UnitData[] => game.getAllUnits()
    .map((id) => game.getUnitData(id))
    .filter((unit): unit is UnitData => !!unit && unit.owner === playerName);

const missionCategory = (name: string): string => {
    if (isObjectiveOffensiveMissionName(name)) return "offensive";
    const normalized = name.toLowerCase();
    if (normalized.includes("defen")) return "defense";
    if (normalized.includes("retreat")) return "retreat";
    if (normalized.includes("scout")) return "scouting";
    if (normalized.includes("engineer")) return "engineering";
    if (normalized.includes("expan")) return "expansion";
    if (normalized.includes("readiness") || normalized.includes("reserve")) return "readiness";
    return "other_protected";
};

const finiteTargetEstimate = (
    game: GameApi,
    attackers: readonly UnitData[],
    target: UnitData,
): number | null => {
    const damagePerTick = attackers.reduce((sum, attacker) => {
        const compatibility = objectiveUnitCompatibility(game, attacker, target);
        return compatibility.compatible && Number.isFinite(compatibility.approximateDamagePerTick)
            ? sum + compatibility.approximateDamagePerTick
            : sum;
    }, 0);
    if (!(damagePerTick > 0) || !Number.isFinite(damagePerTick)) return null;
    const estimate = target.hitPoints / damagePerTick;
    return Number.isFinite(estimate) && estimate > 0 ? estimate : null;
};

const distanceToSegment = (
    point: { x: number; y: number },
    start: { x: number; y: number },
    end: { x: number; y: number },
): number => {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const lengthSquared = dx * dx + dy * dy;
    if (lengthSquared === 0) return Math.hypot(point.x - start.x, point.y - start.y);
    const fraction = Math.max(0, Math.min(1,
        ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared,
    ));
    return Math.hypot(point.x - (start.x + fraction * dx), point.y - (start.y + fraction * dy));
};

const potentialRouteThreatCount = (
    attackers: readonly UnitData[],
    target: UnitData,
    enemySelectableCombatants: readonly UnitData[],
): number | null => {
    if (attackers.length === 0) return null;
    const start = {
        x: attackers.reduce((sum, unit) => sum + unit.tile.rx, 0) / attackers.length,
        y: attackers.reduce((sum, unit) => sum + unit.tile.ry, 0) / attackers.length,
    };
    const end = { x: target.tile.rx, y: target.tile.ry };
    return enemySelectableCombatants.filter((unit) =>
        unit.id !== target.id &&
        distanceToSegment({ x: unit.tile.rx, y: unit.tile.ry }, start, end) <= 8,
    ).length;
};

const samplingReason = (
    tick: number,
    previousBuildingCount: number | null,
    enemyBuildingCount: number,
    previousCertificate: boolean | null,
    certificate: boolean,
): FinishAdvantageStateRecord["samplingReason"] | null => {
    if (previousBuildingCount === null || previousCertificate === null) return "initial";
    if (previousBuildingCount !== enemyBuildingCount) return "building_count_transition";
    if (previousCertificate !== certificate) return "certificate_transition";
    return tick % FINISH_ADVANTAGE_AUDIT_SAMPLE_INTERVAL_TICKS === 0 ? "interval" : null;
};

export class FinishAdvantageStateObserver implements StrategyLike {
    private previousEnemyBuildingCount: number | null = null;
    private previousCertificate: boolean | null = null;
    private maximumObservedEnemyBuildingCount = 0;
    private previousBuildingHitPoints = new Map<number, number>();
    private lastPhysicalBuildingDamageTick: number | null = null;

    constructor(
        private inner: StrategyLike,
        private readonly sink: FinishAdvantageStateSink,
        private readonly auditContext: FinishAdvantageAuditCellContext,
    ) {}

    onAiUpdate(context: StrategyContext, missionController: unknown, logger: Logger): StrategyLike {
        const next = this.inner.onAiUpdate(context, missionController, logger);
        if (next && typeof (next as StrategyLike).onAiUpdate === "function") this.inner = next as StrategyLike;
        this.observe(context, missionController);
        return this;
    }

    private observe(context: StrategyContext, missionController: unknown): void {
        const { game, player } = context;
        const tick = game.getCurrentTick();
        const enemy = publicEnemyUnits(game, player.name, () => true);
        const buildings = enemy.filter((unit) => unit.type === ObjectType.Building)
            .sort((left, right) => left.id - right.id);
        const selectableCombatants = enemy.filter((unit) => !!unit.rules.isSelectableCombatant);
        const mobileSelectableCombatants = selectableCombatants.filter((unit) =>
            unit.type !== ObjectType.Building && unit.canMove !== false,
        );
        const productionBuildings = buildings.filter((unit) => unit.rules.factory !== FactoryType.None);
        const baseUnits = new Set(game.getGeneralRules().baseUnit);
        const deployableBaseUnits = enemy.filter((unit) =>
            !!unit.rules.deploysInto && baseUnits.has(unit.rules.name),
        );
        const irreversibleCertificate = hasFinishAdvantageIrreversibleCertificate({
            enemyBuildingCount: buildings.length,
            enemySelectableCombatantCount: selectableCombatants.length,
            enemyProductionBuildingCount: productionBuildings.length,
            enemyDeployableBaseUnitCount: deployableBaseUnits.length,
        });
        const mine = selfUnits(game, player.name);
        const ownBuildingCount = mine.filter((unit) => unit.type === ObjectType.Building).length;

        for (const building of buildings) {
            const previous = this.previousBuildingHitPoints.get(building.id);
            if (previous !== undefined && building.hitPoints < previous) this.lastPhysicalBuildingDamageTick = tick;
        }
        this.previousBuildingHitPoints = new Map(buildings.map((building) => [building.id, building.hitPoints]));
        this.maximumObservedEnemyBuildingCount = Math.max(
            this.maximumObservedEnemyBuildingCount,
            buildings.length,
        );
        const reason = samplingReason(
            tick,
            this.previousEnemyBuildingCount,
            buildings.length,
            this.previousCertificate,
            irreversibleCertificate,
        );
        this.previousEnemyBuildingCount = buildings.length;
        this.previousCertificate = irreversibleCertificate;
        if (reason === null) return;

        // A zero-building snapshot is terminal outcome information. The audit
        // may use the engine-finished predicate only in its technical harness,
        // so the state observer censors terminal building-count transitions.
        if (buildings.length === 0 || ownBuildingCount === 0) return;

        const compatibleByBuilding = buildings.map((building) => mine.filter((unit) =>
            objectiveUnitCompatibility(game, unit, building).compatible,
        ));
        const nominalIds = new Set(compatibleByBuilding.flatMap((units) => units.map(({ id }) => id)));
        const nominal = mine.filter(({ id }) => nominalIds.has(id));
        const ownership = readObjectiveMissionOwnership(missionController);
        const assignments = ownership.ok ? ownership.assignments : new Map();
        const protectedUnits = ownership.ok
            ? nominal.filter((unit) => {
                const assignment = assignments.get(unit.id);
                return !!assignment && !isObjectiveOffensiveMissionName(assignment.missionName);
            })
            : nominal.slice();
        const protectedIds = new Set(protectedUnits.map(({ id }) => id));
        const offensive = ownership.ok
            ? nominal.filter((unit) => {
                const assignment = assignments.get(unit.id);
                return !!assignment && isObjectiveOffensiveMissionName(assignment.missionName);
            })
            : [];
        const unassigned = ownership.ok ? nominal.filter((unit) => !assignments.has(unit.id)) : [];
        const protectedCountsByCategory: Record<string, number> = {};
        if (ownership.ok) {
            for (const unit of protectedUnits) {
                const category = missionCategory(assignments.get(unit.id)!.missionName);
                protectedCountsByCategory[category] = (protectedCountsByCategory[category] ?? 0) + 1;
            }
        } else protectedCountsByCategory.ownership_unavailable = protectedUnits.length;
        const leasePool = ownership.ok ? nominal.filter(({ id }) => !protectedIds.has(id)) : [];
        const ownStart = game.getPlayerData(player.name).startLocation;
        const byHomeDistance = leasePool.slice().sort((left, right) =>
            Math.hypot(left.tile.rx - ownStart.x, left.tile.ry - ownStart.y) -
                Math.hypot(right.tile.rx - ownStart.x, right.tile.ry - ownStart.y) ||
            left.id - right.id,
        );
        const margins = FINISH_ADVANTAGE_AUDIT_MARGINS.map((margin): FinishAdvantageMarginExposure => {
            const partition = computeFinishAdvantagePartition({
                nominalEligibleIds: nominal.map(({ id }) => id),
                protectedEligibleIds: protectedIds,
                leasePoolByHomeDistance: byHomeDistance.map(({ id }) => id),
                enemyMobileSelectableCombatantCount: mobileSelectableCombatants.length,
                margin,
            });
            const strikeIds = new Set(partition.strikeIds);
            const strike = leasePool.filter(({ id }) => strikeIds.has(id));
            const finiteEstimates = buildings.flatMap((building) => {
                const compatibleStrike = strike.filter((unit) =>
                    objectiveUnitCompatibility(game, unit, building).compatible,
                );
                const estimate = finiteTargetEstimate(game, compatibleStrike, building);
                return estimate === null ? [] : [estimate];
            });
            return {
                margin,
                desiredCover: partition.desiredCover,
                protectedCount: partition.protectedCount,
                additionalReserveCount: partition.additionalReserveIds.length,
                leasePoolCount: leasePool.length,
                effectiveStrikeCount: strike.length,
                compatibleFiniteTargetCount: finiteEstimates.length,
                exposed: ownership.ok && strike.length > 0 && finiteEstimates.length > 0,
                minimumEstimatedDamageTicks: finiteEstimates.length > 0 ? Math.min(...finiteEstimates) : null,
            };
        });
        const allFiniteTargets = buildings.flatMap((building, index) => {
            const estimate = finiteTargetEstimate(game, compatibleByBuilding[index], building);
            return estimate === null ? [] : [{ building, estimate }];
        }).sort((left, right) => left.estimate - right.estimate || left.building.id - right.building.id);
        const visibleEnemyIds = new Set(game.getVisibleUnits(player.name, "enemy"));
        const selectedTarget = allFiniteTargets[0]?.building ?? null;
        const selectedTargetAttackers = selectedTarget === null
            ? []
            : mine.filter((unit) => objectiveUnitCompatibility(game, unit, selectedTarget).compatible);
        const record: FinishAdvantageStateRecord = {
            schemaVersion: 1,
            event: "finish_advantage_state",
            informationInterface: "public_complete_state",
            country: this.auditContext.country,
            candidateSlot: this.auditContext.candidateSlot,
            faction: this.auditContext.faction,
            tick,
            samplingReason: reason,
            ownBuildingCount,
            enemyBuildingCount: buildings.length,
            maximumObservedEnemyBuildingCount: this.maximumObservedEnemyBuildingCount,
            enemySelectableCombatantCount: selectableCombatants.length,
            enemyProductionBuildingCount: productionBuildings.length,
            enemyDeployableBaseUnitCount: deployableBaseUnits.length,
            enemyMobileSelectableCombatantCount: mobileSelectableCombatants.length,
            irreversibleCertificate,
            finalBuildingState: buildings.length === 1,
            nominalEligibleAntiBuildingCount: nominal.length,
            protectedEligibleCount: protectedUnits.length,
            offensiveEligibleCount: offensive.length,
            unassignedEligibleCount: unassigned.length,
            protectedCountsByCategory,
            missionOwnershipAvailable: ownership.ok,
            missionOwnershipFailure: ownership.ok ? null : ownership.reason,
            missionMembershipSha256: ownership.ok
                ? digest(canonicalObjectiveMissionMembership(ownership))
                : null,
            enemyBuildingsWithFiniteCompatibleMission: allFiniteTargets.length,
            compatibleReachableAttackersByBuilding: compatibleByBuilding.map((units) => units.length).sort((a, b) => a - b),
            selectedTargetVisible: selectedTarget !== null
                ? visibleEnemyIds.has(selectedTarget.id)
                : null,
            selectedTargetPotentialRouteThreatCount: selectedTarget === null
                ? null
                : potentialRouteThreatCount(selectedTargetAttackers, selectedTarget, selectableCombatants),
            ticksSincePhysicalBuildingDamage: this.lastPhysicalBuildingDamageTick === null
                ? null
                : tick - this.lastPhysicalBuildingDamageTick,
            margins,
            forbiddenFieldsEmitted: [],
        };
        this.sink(record);
    }
}

export const createFinishAdvantageObservedBaseline = (
    factory: BaselineFactory,
    name: string,
    country: Countries,
    candidateSlot: 0 | 1,
    sink: FinishAdvantageStateSink,
): InspectableBaselineBot => {
    if (typeof factory.createDefaultStrategy !== "function" || typeof factory.createWithStrategy !== "function") {
        throw new Error("Finish-advantage observer requires the pinned external strategy-construction interface");
    }
    const inner = factory.createDefaultStrategy();
    if (!inner || typeof (inner as StrategyLike).onAiUpdate !== "function") {
        throw new Error("Pinned external DefaultStrategy does not expose onAiUpdate");
    }
    return factory.createWithStrategy(
        name,
        country,
        new FinishAdvantageStateObserver(inner as StrategyLike, sink, {
            country,
            candidateSlot,
            faction: [
                Countries.USA,
                Countries.KOREA,
                Countries.FRANCE,
                Countries.GERMANY,
                Countries.GREAT_BRITAIN,
            ].includes(country) ? "Allied" : "Soviet",
        }),
    );
};
