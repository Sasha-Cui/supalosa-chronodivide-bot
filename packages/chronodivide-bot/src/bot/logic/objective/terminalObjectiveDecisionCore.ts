export type ObjectivePoint = { x: number; y: number };

export type ObjectiveAttacker = ObjectivePoint & {
    id: number;
    hitPoints: number;
    speedTilesPerTick: number;
    rangeTiles: number;
    buildingDamagePerVolley: number;
    buildingRateOfFireTicks: number;
    projectileTravelTicks: number;
    initialCooldownTicks: number;
};

export type ObjectiveBuilding = ObjectivePoint & {
    id: number;
    hitPoints: number;
    visible: boolean;
};

export type ObjectiveThreat = ObjectivePoint & {
    id: number;
    hitPoints: number;
    speedTilesPerTick: number;
    rangeTiles: number;
    damagePerVolleyToStrike: number;
    rateOfFireTicks: number;
    currentlyDamagingStrike: boolean;
    initialCooldownTicks: number;
    calibrationStatus: "ordinary_direct_upper_bound" | "uncalibrated_special";
};

export type ObjectiveBlockerTarget = ObjectivePoint & {
    id: number;
    hitPoints: number;
};

export type ObjectiveForceAttacker = ObjectivePoint & {
    id: number;
    speedTilesPerTick: number;
    rangeTiles: number;
    forceDamagePerVolley: number;
    forceRateOfFireTicks: number;
    initialCooldownTicks: number;
};

export type ObjectiveBaseAsset = ObjectivePoint & {
    id: number;
    hitPoints: number;
    soleSurvivingBuilding: boolean;
    lastRequiredCapability: boolean;
};

export type ObjectiveAssetThreatProjection = {
    threatId: number;
    assetId: number;
    firstVolleyTick: number;
    damagePerVolley: number;
    rateOfFireTicks: number;
    calibrationStatus: "ordinary_direct_upper_bound" | "uncalibrated_special";
};

export type ObjectiveDamageSource = {
    id: number;
    firstVolleyTick: number;
    damagePerVolley: number;
    rateOfFireTicks: number;
};

export type TerminalEvidence = {
    remainingKnownBuildingCount: number;
    allPreviouslyKnownAlternativesInvalidated: boolean;
    searchCoverageFraction: number;
    requiredSearchCoverageFraction: number;
};

export type ObjectiveSchedulerThresholds = {
    routeCorridorRadius: number;
    interceptHorizonTicks: number;
    baseDefenseHorizonTicks: number;
    blockerLethalDamageFraction: number;
    directCompletionSafetyMarginTicks: number;
    missionLivenessTicks: number;
};

export type ObjectiveThreatClassification = {
    blockerIds: number[];
    existentialBaseThreatIds: number[];
    threatenedBaseAssetIds: number[];
    irrelevantThreatIds: number[];
    uncalibratedRelevantThreatIds: number[];
    safetyCertificateComplete: boolean;
    safetyCertificateFailureReason: "uncalibrated_relevant_threat" | "analysis_horizon_exceeded" | null;
    earliestLethalInterceptTick: number | null;
    earliestBaseDestructionTick: number | null;
    baseThreatReason: "sole_surviving_building" | "last_required_capability" | null;
};

export type ObjectiveBuildingOpportunity = {
    building: ObjectiveBuilding;
    directCompletionTicks: number | null;
    strategicRemovalValue: number;
    committed: boolean;
    committedMadeProgress: boolean;
};

export type ObjectiveMissionDecision =
    | { kind: "terminal_candidate_strike"; buildingId: number; predictedCompletionTicks: number; reason: "sole_known_building_before_intercept" }
    | { kind: "building_strike"; buildingId: number; predictedCompletionTicks: number; reason: "direct_objective_progress" | "retain_committed_building" }
    | { kind: "blocker_clear"; buildingId: number; blockerIds: number[]; predictedCompletionTicks: number; reason: "direct_strike_not_survivable" }
    | { kind: "base_defense"; threatIds: number[]; reason: "base_falls_before_objective" }
    | { kind: "regroup"; reason: "no_capable_strike_group" }
    | { kind: "search"; reason: "no_known_building" | "offensive_liveness_deadline" }
    | {
          kind: "predecessor_fallback";
          threatIds: number[];
          reason: "uncalibrated_relevant_threat" | "analysis_horizon_exceeded";
      };

const finiteNonnegative = (value: number): boolean => Number.isFinite(value) && value >= 0;
const positive = (value: number): boolean => Number.isFinite(value) && value > 0;

const volleyCountThroughTick = (
    source: Pick<ObjectiveDamageSource, "firstVolleyTick" | "rateOfFireTicks">,
    tick: number,
): number => tick < source.firstVolleyTick
    ? 0
    : 1 + Math.floor((tick - source.firstVolleyTick) / source.rateOfFireTicks);

const damageThroughTick = (source: ObjectiveDamageSource, tick: number): number =>
    volleyCountThroughTick(source, tick) * source.damagePerVolley;

export const objectiveDistance = (left: ObjectivePoint, right: ObjectivePoint): number =>
    Math.hypot(left.x - right.x, left.y - right.y);

export const objectiveDistanceToSegment = (
    point: ObjectivePoint,
    start: ObjectivePoint,
    end: ObjectivePoint,
): number => {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const lengthSquared = dx * dx + dy * dy;
    if (lengthSquared === 0) return objectiveDistance(point, start);
    const projection = Math.max(0, Math.min(1,
        ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared,
    ));
    return objectiveDistance(point, {
        x: start.x + projection * dx,
        y: start.y + projection * dy,
    });
};

export const objectiveStrikeCentroid = (attackers: readonly ObjectiveAttacker[]): ObjectivePoint | null => {
    if (attackers.length === 0) return null;
    return {
        x: attackers.reduce((sum, unit) => sum + unit.x, 0) / attackers.length,
        y: attackers.reduce((sum, unit) => sum + unit.y, 0) / attackers.length,
    };
};

export const rankObjectiveBuildingOpportunities = <T extends ObjectiveBuildingOpportunity>(
    opportunities: readonly T[],
): T[] => opportunities.slice().sort((left, right) =>
    Number(right.committed && right.committedMadeProgress) -
        Number(left.committed && left.committedMadeProgress) ||
    Number(left.directCompletionTicks === null) - Number(right.directCompletionTicks === null) ||
    (left.directCompletionTicks ?? Number.POSITIVE_INFINITY) -
        (right.directCompletionTicks ?? Number.POSITIVE_INFINITY) ||
    right.strategicRemovalValue - left.strategicRemovalValue ||
    left.building.id - right.building.id
);

export const estimateObjectiveStrikeCompletionTicks = (
    attackers: readonly ObjectiveAttacker[],
    building: ObjectiveBuilding,
): number | null => {
    if (!finiteNonnegative(building.hitPoints)) throw new Error("building hit points must be finite and nonnegative");
    if (building.hitPoints === 0) return 0;
    const sources = attackers.flatMap((attacker): ObjectiveDamageSource[] => {
        if (
            !positive(attacker.speedTilesPerTick) || !positive(attacker.buildingDamagePerVolley) ||
            !Number.isInteger(attacker.buildingRateOfFireTicks) || attacker.buildingRateOfFireTicks <= 0 ||
            !Number.isInteger(attacker.projectileTravelTicks) || attacker.projectileTravelTicks < 0 ||
            !finiteNonnegative(attacker.rangeTiles) || !finiteNonnegative(attacker.initialCooldownTicks)
        ) return [];
        const travelDistance = Math.max(0, objectiveDistance(attacker, building) - attacker.rangeTiles);
        return [{
            id: attacker.id,
            // Friendly completion is lower-bounded by assuming that movement
            // or cooldown readiness consumes the current tick and the first
            // damaging volley lands on the following tick.
            firstVolleyTick: 1 + Math.max(
                Math.ceil(travelDistance / attacker.speedTilesPerTick),
                Math.ceil(Math.max(0, attacker.initialCooldownTicks)),
            ) + attacker.projectileTravelTicks,
            damagePerVolley: attacker.buildingDamagePerVolley,
            rateOfFireTicks: attacker.buildingRateOfFireTicks,
        }];
    }).sort((left, right) => left.firstVolleyTick - right.firstVolleyTick || left.id - right.id);
    if (sources.length === 0) return null;

    let low = 0;
    let high = Math.max(
        ...sources.map(({ firstVolleyTick }) => firstVolleyTick),
        Math.ceil(building.hitPoints / Math.min(...sources.map(({ damagePerVolley }) => damagePerVolley))) *
            Math.max(...sources.map(({ rateOfFireTicks }) => rateOfFireTicks)),
    );
    while (sources.reduce((sum, source) => sum + damageThroughTick(source, high), 0) < building.hitPoints) {
        high = Math.max(high + 1, high * 2);
        if (!Number.isSafeInteger(high)) throw new Error("objective completion tick exceeds safe integer range");
    }
    while (low < high) {
        const middle = Math.floor((low + high) / 2);
        const damage = sources.reduce((sum, source) => sum + damageThroughTick(source, middle), 0);
        if (damage >= building.hitPoints) high = middle;
        else low = middle + 1;
    }
    return low;
};

export const selectMinimumSufficientObjectiveStrikeGroup = (args: {
    attackers: readonly ObjectiveAttacker[];
    building: ObjectiveBuilding;
    completionDeadlineTicks: number;
}): { attackers: ObjectiveAttacker[]; predictedCompletionTicks: number } | null => {
    const { building, completionDeadlineTicks } = args;
    if (!Number.isInteger(completionDeadlineTicks) || completionDeadlineTicks < 0) {
        throw new Error("completion deadline must be a nonnegative integer");
    }
    if (!finiteNonnegative(building.hitPoints)) throw new Error("building hit points must be nonnegative");
    if (building.hitPoints === 0) return { attackers: [], predictedCompletionTicks: 0 };
    const capable = args.attackers.filter((attacker) =>
        positive(attacker.speedTilesPerTick) && positive(attacker.buildingDamagePerVolley) &&
        Number.isInteger(attacker.buildingRateOfFireTicks) && attacker.buildingRateOfFireTicks > 0 &&
        Number.isInteger(attacker.projectileTravelTicks) && attacker.projectileTravelTicks >= 0 &&
        finiteNonnegative(attacker.rangeTiles) && finiteNonnegative(attacker.initialCooldownTicks),
    );
    const contributionAtDeadline = (attacker: ObjectiveAttacker): number => {
        const arrival = Math.max(
            Math.ceil(Math.max(0, objectiveDistance(attacker, building) - attacker.rangeTiles) /
                attacker.speedTilesPerTick),
            Math.ceil(Math.max(0, attacker.initialCooldownTicks)),
        ) + 1 + attacker.projectileTravelTicks;
        return damageThroughTick({
            id: attacker.id,
            firstVolleyTick: arrival,
            damagePerVolley: attacker.buildingDamagePerVolley,
            rateOfFireTicks: attacker.buildingRateOfFireTicks,
        }, completionDeadlineTicks);
    };
    const ranked = capable.slice().sort((left, right) => {
        const leftArrival = Math.max(
            Math.ceil(Math.max(0, objectiveDistance(left, building) - left.rangeTiles) / left.speedTilesPerTick),
            Math.ceil(Math.max(0, left.initialCooldownTicks)),
        );
        const rightArrival = Math.max(
            Math.ceil(Math.max(0, objectiveDistance(right, building) - right.rangeTiles) / right.speedTilesPerTick),
            Math.ceil(Math.max(0, right.initialCooldownTicks)),
        );
        const leftDamageByDeadline = contributionAtDeadline(left);
        const rightDamageByDeadline = contributionAtDeadline(right);
        return rightDamageByDeadline - leftDamageByDeadline ||
            leftArrival - rightArrival ||
            right.buildingDamagePerVolley - left.buildingDamagePerVolley ||
            left.buildingRateOfFireTicks - right.buildingRateOfFireTicks ||
            left.id - right.id;
    });
    const selected: ObjectiveAttacker[] = [];
    let damageByDeadline = 0;
    for (const attacker of ranked) {
        selected.push(attacker);
        damageByDeadline += contributionAtDeadline(attacker);
        if (damageByDeadline >= building.hitPoints) {
            const finalCompletion = estimateObjectiveStrikeCompletionTicks(selected, building);
            return finalCompletion === null || finalCompletion > completionDeadlineTicks ? null : {
                attackers: selected.slice().sort((left, right) => left.id - right.id),
                predictedCompletionTicks: finalCompletion,
            };
        }
    }
    return null;
};

export const estimateBlockerThenBuildingCompletionTicks = (args: {
    attackers: readonly ObjectiveForceAttacker[];
    blockers: readonly ObjectiveBlockerTarget[];
    resumedBuildingCompletionTicks: number;
    reassessmentTicks: number;
}): number | null => {
    const { attackers, blockers, resumedBuildingCompletionTicks, reassessmentTicks } = args;
    if (!finiteNonnegative(resumedBuildingCompletionTicks) || !finiteNonnegative(reassessmentTicks)) {
        throw new Error("blocker-clear continuation costs must be finite and nonnegative");
    }
    let elapsed = 0;
    const activeAttackers = attackers.filter((attacker) =>
        positive(attacker.speedTilesPerTick) && positive(attacker.forceDamagePerVolley) &&
        Number.isInteger(attacker.forceRateOfFireTicks) && attacker.forceRateOfFireTicks > 0 &&
        finiteNonnegative(attacker.rangeTiles) && finiteNonnegative(attacker.initialCooldownTicks),
    );
    if (blockers.length > 0 && activeAttackers.length === 0) return null;
    for (const blocker of blockers.slice().sort((left, right) => left.id - right.id)) {
        if (!finiteNonnegative(blocker.hitPoints)) throw new Error("blocker hit points must be nonnegative");
        const completion = estimateObjectiveStrikeCompletionTicks(
            activeAttackers.map((attacker) => ({
                ...attacker,
                hitPoints: 1,
                buildingDamagePerVolley: attacker.forceDamagePerVolley,
                buildingRateOfFireTicks: attacker.forceRateOfFireTicks,
                projectileTravelTicks: 0,
            })),
            { ...blocker, visible: true },
        );
        if (completion === null) return null;
        // Recomputing travel from the original observed positions for each
        // blocker is deliberately conservative until a native route simulator
        // supplies stateful post-clear positions.
        elapsed += completion + reassessmentTicks;
    }
    return elapsed + resumedBuildingCompletionTicks;
};

export const isObjectiveTerminalEvidenceSufficient = (evidence: TerminalEvidence): boolean => {
    if (!Number.isInteger(evidence.remainingKnownBuildingCount) || evidence.remainingKnownBuildingCount < 0) {
        throw new Error("terminal evidence is malformed");
    }
    if (
        !Number.isFinite(evidence.searchCoverageFraction) || evidence.searchCoverageFraction < 0 ||
        evidence.searchCoverageFraction > 1 ||
        !Number.isFinite(evidence.requiredSearchCoverageFraction) ||
        evidence.requiredSearchCoverageFraction < 0 || evidence.requiredSearchCoverageFraction > 1
    ) throw new Error("terminal coverage evidence is malformed");
    return evidence.remainingKnownBuildingCount === 1 &&
        evidence.allPreviouslyKnownAlternativesInvalidated &&
        evidence.searchCoverageFraction >= evidence.requiredSearchCoverageFraction;
};

export const estimateEarliestRouteEngagementTick = (args: {
    threat: ObjectiveThreat;
    routeStart: ObjectivePoint;
    routeEnd: ObjectivePoint;
    strikeSpeedTilesPerTick: number;
    strikeRangeTiles: number;
    horizonTicks: number;
    corridorRadius: number;
}): number | null => {
    const {
        threat, routeStart, routeEnd, strikeSpeedTilesPerTick, strikeRangeTiles,
        horizonTicks, corridorRadius,
    } = args;
    if (!Number.isInteger(horizonTicks) || horizonTicks < 0) {
        throw new Error("engagement horizon must be a nonnegative integer");
    }
    const routeLength = Math.max(0, objectiveDistance(routeStart, routeEnd) - strikeRangeTiles);
    const fullDistance = objectiveDistance(routeStart, routeEnd);
    const unitX = fullDistance === 0 ? 0 : (routeEnd.x - routeStart.x) / fullDistance;
    const unitY = fullDistance === 0 ? 0 : (routeEnd.y - routeStart.y) / fullDistance;
    for (let tick = 0; tick <= horizonTicks; tick += 1) {
        const strikeProgress = Math.min(routeLength, Math.max(0, strikeSpeedTilesPerTick) * tick);
        const strikePoint = {
            x: routeStart.x + unitX * strikeProgress,
            y: routeStart.y + unitY * strikeProgress,
        };
        const threatReach = Math.max(0, threat.rangeTiles) + Math.max(0, corridorRadius) +
            Math.max(0, threat.speedTilesPerTick) * tick;
        if (objectiveDistance(threat, strikePoint) <= threatReach) return tick;
    }
    return null;
};

export const estimateAggregateDamageThresholdTick = (args: {
    sources: readonly ObjectiveDamageSource[];
    damageNeeded: number;
    horizonTicks: number;
}): { tick: number; contributorIds: number[] } | null => {
    const { damageNeeded, horizonTicks } = args;
    if (!positive(damageNeeded)) return { tick: 0, contributorIds: [] };
    if (!Number.isInteger(horizonTicks) || horizonTicks < 0) {
        throw new Error("damage horizon must be a nonnegative integer");
    }
    const sources = args.sources
        .filter(({ firstVolleyTick, damagePerVolley, rateOfFireTicks }) =>
            Number.isInteger(firstVolleyTick) && firstVolleyTick >= 0 &&
            positive(damagePerVolley) && Number.isInteger(rateOfFireTicks) && rateOfFireTicks > 0,
        )
        .slice()
        .sort((left, right) => left.firstVolleyTick - right.firstVolleyTick || left.id - right.id);
    for (let tick = 0; tick <= horizonTicks; tick += 1) {
        const damage = sources.reduce(
            (total, source) => total + damageThroughTick(source, tick),
            0,
        );
        if (damage >= damageNeeded) {
            return {
                tick,
                contributorIds: sources
                    .filter((source) => volleyCountThroughTick(source, tick) > 0)
                    .map(({ id }) => id)
                    .sort((left, right) => left - right),
            };
        }
    }
    return null;
};

export const selectMinimumBlockingThreatIds = (args: {
    sources: readonly ObjectiveDamageSource[];
    damageNeeded: number;
    completionDeadlineTicks: number;
}): number[] => {
    const { damageNeeded, completionDeadlineTicks } = args;
    if (!positive(damageNeeded)) return [];
    if (!Number.isInteger(completionDeadlineTicks) || completionDeadlineTicks < 0) {
        throw new Error("completion deadline must be a nonnegative integer");
    }
    const contributions = args.sources.flatMap((source) => {
        if (
            !Number.isInteger(source.firstVolleyTick) || source.firstVolleyTick < 0 ||
            !positive(source.damagePerVolley) ||
            !Number.isInteger(source.rateOfFireTicks) || source.rateOfFireTicks <= 0
        ) return [];
        const damage = damageThroughTick(source, completionDeadlineTicks);
        return damage > 0 ? [{ id: source.id, damage }] : [];
    }).sort((left, right) => right.damage - left.damage || left.id - right.id);
    let remainingDamage = contributions.reduce((sum, source) => sum + source.damage, 0);
    if (remainingDamage < damageNeeded) return [];
    const selected: number[] = [];
    for (const source of contributions) {
        selected.push(source.id);
        remainingDamage -= source.damage;
        if (remainingDamage < damageNeeded) return selected.sort((left, right) => left - right);
    }
    return selected.sort((left, right) => left - right);
};

export const classifyObjectiveBaseThreats = (args: {
    assets: readonly ObjectiveBaseAsset[];
    projections: readonly ObjectiveAssetThreatProjection[];
    horizonTicks: number;
}): {
    threatIds: number[];
    assetIds: number[];
    earliestDestructionTick: number | null;
    reason: "sole_surviving_building" | "last_required_capability" | null;
} => {
    if (!Number.isInteger(args.horizonTicks) || args.horizonTicks < 0) {
        throw new Error("base-defense horizon must be a nonnegative integer");
    }
    const indispensable = args.assets.filter((asset) =>
        asset.soleSurvivingBuilding || asset.lastRequiredCapability,
    ).sort((left, right) => left.id - right.id);
    const candidates = indispensable.flatMap((asset) => {
        if (!finiteNonnegative(asset.hitPoints)) throw new Error("base asset hit points must be nonnegative");
        const destruction = estimateAggregateDamageThresholdTick({
            sources: args.projections
                .filter(({ assetId }) => assetId === asset.id)
                .map(({ threatId: id, firstVolleyTick, damagePerVolley, rateOfFireTicks }) => ({
                    id,
                    firstVolleyTick,
                    damagePerVolley,
                    rateOfFireTicks,
                })),
            damageNeeded: asset.hitPoints,
            horizonTicks: args.horizonTicks,
        });
        return destruction === null ? [] : [{
            asset,
            tick: destruction.tick,
            threatIds: destruction.contributorIds,
            reason: asset.soleSurvivingBuilding
                ? "sole_surviving_building" as const
                : "last_required_capability" as const,
        }];
    }).sort((left, right) =>
        left.tick - right.tick ||
        Number(right.reason === "sole_surviving_building") - Number(left.reason === "sole_surviving_building") ||
        left.asset.id - right.asset.id,
    );
    const earliest = candidates[0];
    if (!earliest) return { threatIds: [], assetIds: [], earliestDestructionTick: null, reason: null };
    const simultaneous = candidates.filter(({ tick, reason }) => tick === earliest.tick && reason === earliest.reason);
    return {
        threatIds: [...new Set(simultaneous.flatMap(({ threatIds }) => threatIds))].sort((left, right) => left - right),
        assetIds: simultaneous.map(({ asset }) => asset.id).sort((left, right) => left - right),
        earliestDestructionTick: earliest.tick,
        reason: earliest.reason,
    };
};

export const classifyObjectiveThreats = (args: {
    attackers: readonly ObjectiveAttacker[];
    building: ObjectiveBuilding;
    threats: readonly ObjectiveThreat[];
    baseAssets: readonly ObjectiveBaseAsset[];
    assetThreatProjections: readonly ObjectiveAssetThreatProjection[];
    directCompletionTicks: number;
    thresholds: ObjectiveSchedulerThresholds;
}): ObjectiveThreatClassification => {
    const {
        attackers, building, threats, baseAssets, assetThreatProjections,
        directCompletionTicks, thresholds,
    } = args;
    if (attackers.length === 0) throw new Error("threat classification requires attackers");
    const strikeHitPoints = attackers.reduce((sum, unit) => sum + Math.max(0, unit.hitPoints), 0);
    const sortedThreats = threats.slice().sort((left, right) => left.id - right.id);
    const strikeDamageSources: ObjectiveDamageSource[] = [];
    const uncalibratedRelevantThreatIds: number[] = [];
    const requiredInterceptHorizon = directCompletionTicks + thresholds.directCompletionSafetyMarginTicks;
    const horizonExceeded = requiredInterceptHorizon > thresholds.interceptHorizonTicks ||
        requiredInterceptHorizon > thresholds.baseDefenseHorizonTicks;
    const interceptHorizon = Math.min(requiredInterceptHorizon, thresholds.interceptHorizonTicks);

    for (const threat of sortedThreats) {
        const engagementTick = threat.currentlyDamagingStrike
            ? 0
            : attackers.reduce<number | null>((earliest, attacker) => {
                const engagement = estimateEarliestRouteEngagementTick({
                    threat,
                    routeStart: attacker,
                    routeEnd: building,
                    strikeSpeedTilesPerTick: Math.max(0, attacker.speedTilesPerTick),
                    strikeRangeTiles: Math.max(0, attacker.rangeTiles),
                    horizonTicks: interceptHorizon,
                    corridorRadius: thresholds.routeCorridorRadius,
                });
                return engagement === null
                    ? earliest
                    : earliest === null
                      ? engagement
                      : Math.min(earliest, engagement);
            }, null);
        const damagePerVolleyToStrike = Math.max(0, threat.damagePerVolleyToStrike);
        if (engagementTick !== null && threat.calibrationStatus === "uncalibrated_special") {
            uncalibratedRelevantThreatIds.push(threat.id);
            continue;
        }
        if (
            engagementTick !== null && positive(damagePerVolleyToStrike) &&
            Number.isInteger(threat.rateOfFireTicks) && threat.rateOfFireTicks > 0
        ) {
            strikeDamageSources.push({
                id: threat.id,
                firstVolleyTick: Math.max(
                    engagementTick,
                    Math.ceil(Math.max(0, threat.initialCooldownTicks)),
                ),
                damagePerVolley: damagePerVolleyToStrike,
                rateOfFireTicks: threat.rateOfFireTicks,
            });
        }
    }
    const lethalIntercept = estimateAggregateDamageThresholdTick({
        sources: strikeDamageSources,
        damageNeeded: strikeHitPoints * thresholds.blockerLethalDamageFraction,
        horizonTicks: interceptHorizon,
    });
    const blockerIds = selectMinimumBlockingThreatIds({
        sources: strikeDamageSources,
        damageNeeded: strikeHitPoints * thresholds.blockerLethalDamageFraction,
        completionDeadlineTicks: interceptHorizon,
    });
    const baseThreat = classifyObjectiveBaseThreats({
        assets: baseAssets,
        projections: assetThreatProjections.filter(
            ({ calibrationStatus }) => calibrationStatus === "ordinary_direct_upper_bound",
        ),
        horizonTicks: Math.min(requiredInterceptHorizon, thresholds.baseDefenseHorizonTicks),
    });
    const indispensableAssetIds = new Set(baseAssets
        .filter(({ soleSurvivingBuilding, lastRequiredCapability }) =>
            soleSurvivingBuilding || lastRequiredCapability,
        )
        .map(({ id }) => id));
    const uncalibratedBaseThreatIds = assetThreatProjections
        .filter(({ assetId, firstVolleyTick, calibrationStatus }) =>
            calibrationStatus === "uncalibrated_special" &&
            indispensableAssetIds.has(assetId) &&
            firstVolleyTick <= Math.min(requiredInterceptHorizon, thresholds.baseDefenseHorizonTicks),
        )
        .map(({ threatId }) => threatId);
    uncalibratedRelevantThreatIds.push(...uncalibratedBaseThreatIds);
    const uniqueUncalibratedRelevantThreatIds = [...new Set(uncalibratedRelevantThreatIds)]
        .sort((left, right) => left - right);
    const existentialBaseThreatIds = baseThreat.threatIds;
    const relevantIds = new Set([
        ...blockerIds,
        ...existentialBaseThreatIds,
        ...uniqueUncalibratedRelevantThreatIds,
    ]);
    return {
        blockerIds,
        existentialBaseThreatIds,
        threatenedBaseAssetIds: baseThreat.assetIds,
        irrelevantThreatIds: sortedThreats.map(({ id }) => id).filter((id) => !relevantIds.has(id)),
        uncalibratedRelevantThreatIds: uniqueUncalibratedRelevantThreatIds,
        safetyCertificateComplete: uniqueUncalibratedRelevantThreatIds.length === 0 && !horizonExceeded,
        safetyCertificateFailureReason: uniqueUncalibratedRelevantThreatIds.length > 0
            ? "uncalibrated_relevant_threat"
            : horizonExceeded
              ? "analysis_horizon_exceeded"
              : null,
        earliestLethalInterceptTick: lethalIntercept?.tick ?? null,
        earliestBaseDestructionTick: baseThreat.earliestDestructionTick,
        baseThreatReason: baseThreat.reason,
    };
};

export const selectObjectiveMission = (args: {
    attackers: readonly ObjectiveAttacker[];
    buildings: readonly ObjectiveBuilding[];
    selectedBuildingId: number | null;
    committedBuildingId: number | null;
    committedBuildingMadeProgress: boolean;
    threats: readonly ObjectiveThreat[];
    baseAssets: readonly ObjectiveBaseAsset[];
    assetThreatProjections: readonly ObjectiveAssetThreatProjection[];
    terminalEvidence: TerminalEvidence;
    noProgressTicks: number;
    thresholds: ObjectiveSchedulerThresholds;
    blockerThenBuildingCompletionTicks: number | null;
}): ObjectiveMissionDecision => {
    const {
        attackers, buildings, selectedBuildingId, committedBuildingId, committedBuildingMadeProgress,
        threats, baseAssets, assetThreatProjections, terminalEvidence, noProgressTicks,
        thresholds, blockerThenBuildingCompletionTicks,
    } = args;
    if (buildings.length === 0) {
        return {
            kind: "search",
            reason: noProgressTicks >= thresholds.missionLivenessTicks
                ? "offensive_liveness_deadline"
                : "no_known_building",
        };
    }
    if (attackers.length === 0) return { kind: "regroup", reason: "no_capable_strike_group" };
    const committed = committedBuildingId === null
        ? null
        : buildings.find(({ id }) => id === committedBuildingId) ?? null;
    const selected = committed && committedBuildingMadeProgress &&
        noProgressTicks < thresholds.missionLivenessTicks
        ? committed
        : buildings.find(({ id }) => id === selectedBuildingId) ?? buildings[0];
    const directCompletionTicks = estimateObjectiveStrikeCompletionTicks(attackers, selected);
    if (directCompletionTicks === null) return { kind: "regroup", reason: "no_capable_strike_group" };
    const classification = classifyObjectiveThreats({
        attackers,
        building: selected,
        threats,
        baseAssets,
        assetThreatProjections,
        directCompletionTicks,
        thresholds,
    });
    const directSurvives = classification.earliestLethalInterceptTick === null ||
        directCompletionTicks + thresholds.directCompletionSafetyMarginTicks <
            classification.earliestLethalInterceptTick;
    const terminal = isObjectiveTerminalEvidenceSufficient(terminalEvidence);

    if (!classification.safetyCertificateComplete) {
        return {
            kind: "predecessor_fallback",
            threatIds: classification.uncalibratedRelevantThreatIds,
            reason: classification.safetyCertificateFailureReason ?? "analysis_horizon_exceeded",
        };
    }

    const baseSurvivesUntilCompletion = classification.earliestBaseDestructionTick === null ||
        directCompletionTicks + thresholds.directCompletionSafetyMarginTicks <
            classification.earliestBaseDestructionTick;
    if (terminal && directSurvives && baseSurvivesUntilCompletion) {
        return {
            kind: "terminal_candidate_strike",
            buildingId: selected.id,
            predictedCompletionTicks: directCompletionTicks,
            reason: "sole_known_building_before_intercept",
        };
    }
    if (
        classification.earliestBaseDestructionTick !== null &&
        classification.earliestBaseDestructionTick <=
            directCompletionTicks + thresholds.directCompletionSafetyMarginTicks &&
        classification.existentialBaseThreatIds.length > 0
    ) {
        return {
            kind: "base_defense",
            threatIds: classification.existentialBaseThreatIds,
            reason: "base_falls_before_objective",
        };
    }
    if (!directSurvives && classification.blockerIds.length > 0) {
        // A lethal intercept makes the direct route infeasible; its effective
        // completion cost is infinite. Any finite blocker-clear route is
        // therefore preferred, even when its nominal tick count exceeds the
        // counterfactual no-interception building time.
        if (blockerThenBuildingCompletionTicks !== null) {
            return {
                kind: "blocker_clear",
                buildingId: selected.id,
                blockerIds: classification.blockerIds,
                predictedCompletionTicks: blockerThenBuildingCompletionTicks,
                reason: "direct_strike_not_survivable",
            };
        }
        return { kind: "regroup", reason: "no_capable_strike_group" };
    }
    return {
        kind: "building_strike",
        buildingId: selected.id,
        predictedCompletionTicks: directCompletionTicks,
        reason: committed?.id === selected.id && committedBuildingMadeProgress
            ? "retain_committed_building"
            : "direct_objective_progress",
    };
};
