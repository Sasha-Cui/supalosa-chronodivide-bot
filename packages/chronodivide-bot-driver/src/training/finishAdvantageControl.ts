export const FINISH_ADVANTAGE_MARGINS = [0, 2, 4, 8] as const;
export const FINISH_ADVANTAGE_BASE_RESERVE = 2 as const;

export type FinishAdvantageMargin = typeof FINISH_ADVANTAGE_MARGINS[number];

export type FinishAdvantagePartitionInput = {
    nominalEligibleIds: readonly number[];
    protectedEligibleIds: ReadonlySet<number>;
    leasePoolByHomeDistance: readonly number[];
    enemyMobileSelectableCombatantCount: number;
    margin: FinishAdvantageMargin;
};

export type FinishAdvantagePartition = {
    desiredCover: number;
    protectedCount: number;
    additionalReserveIds: number[];
    strikeIds: number[];
};

export type FinishAdvantageOperationalPartitionInput = FinishAdvantagePartitionInput & {
    multiBuildingMode: "irreversible_only" | "surplus_cover";
    irreversibleCertificate: boolean;
};

export type FinishAdvantageOperationalPartition = FinishAdvantagePartition & {
    active: boolean;
    activationReason: "irreversible_certificate" | "surplus_cover" | "inactive";
};

export type FinishAdvantageOpponentState = {
    enemyBuildingCount: number;
    enemySelectableCombatantCount: number;
    enemyProductionBuildingCount: number;
    enemyDeployableBaseUnitCount: number;
};

export type FinishAdvantageRaceInput = {
    buildingCompletionTicks: number | null;
    earliestInterceptTicks: number | null;
    earliestOwnBuildingLossTicks: number | null;
    safetyMarginTicks: number;
};

export type FinishAdvantageObjectiveCandidate = {
    buildingId: number;
    strategicPriority: number;
    buildingCompletionTicks: number | null;
    earliestInterceptTicks: number | null;
    blockerId: number | null;
    blockerRemovalTicks: number | null;
    stalled: boolean;
};

export type FinishAdvantageObjectiveDecisionInput = {
    candidates: readonly FinishAdvantageObjectiveCandidate[];
    earliestOwnBuildingLossTicks: number | null;
    baseRaceThreatId: number | null;
    safetyMarginTicks: number;
};

export type FinishAdvantageObjectiveDecision =
    | {
        kind: "building_strike";
        reason: "fastest_safe_building_race";
        targetBuildingId: number;
        blockerId: null;
        threatId: null;
    }
    | {
        kind: "blocker_clear";
        reason: "minimum_causal_intercept_blocker";
        targetBuildingId: number;
        blockerId: number;
        threatId: null;
    }
    | {
        kind: "base_defense";
        reason: "own_building_loss_precedes_objective";
        targetBuildingId: null;
        blockerId: null;
        threatId: number;
    }
    | {
        kind: "predecessor_fallback";
        reason: "malformed_or_unknown_race" | "no_live_reachable_objective";
        targetBuildingId: null;
        blockerId: null;
        threatId: null;
    };

export type FinishAdvantageDamageArrival = {
    unitId: number;
    arrivalTicks: number;
    damagePerTick: number;
};

export type FinishAdvantageDamageCompletion = {
    completionTicks: number;
    participatingUnitIds: number[];
};

/**
 * Earliest completion under constant damage after each unit's arrival. This
 * integrates the active damage rate between arrival events instead of making
 * near units wait conceptually for the slowest member of the candidate pool.
 */
export const estimateFinishAdvantageStaggeredDamageCompletion = (
    targetHitPoints: number,
    rawArrivals: readonly FinishAdvantageDamageArrival[],
): FinishAdvantageDamageCompletion | null => {
    if (!Number.isFinite(targetHitPoints) || targetHitPoints <= 0 || rawArrivals.length === 0) return null;
    if (
        new Set(rawArrivals.map(({ unitId }) => unitId)).size !== rawArrivals.length ||
        rawArrivals.some(({ unitId, arrivalTicks, damagePerTick }) =>
            !Number.isSafeInteger(unitId) || unitId < 0 ||
            !Number.isFinite(arrivalTicks) || arrivalTicks < 0 ||
            !Number.isFinite(damagePerTick) || damagePerTick <= 0
        )
    ) return null;
    const arrivals = rawArrivals.slice().sort((left, right) =>
        left.arrivalTicks - right.arrivalTicks || left.unitId - right.unitId,
    );
    let tick = 0;
    let damage = 0;
    let activeDamagePerTick = 0;
    const participatingUnitIds: number[] = [];
    let index = 0;
    while (index < arrivals.length) {
        const arrivalTick = arrivals[index].arrivalTicks;
        const interval = arrivalTick - tick;
        const intervalDamage = activeDamagePerTick * interval;
        if (!Number.isFinite(intervalDamage)) return null;
        if (activeDamagePerTick > 0 && damage + intervalDamage >= targetHitPoints) {
            const completionTicks = tick + (targetHitPoints - damage) / activeDamagePerTick;
            return Number.isFinite(completionTicks) ? {
                completionTicks,
                participatingUnitIds: participatingUnitIds.slice().sort((left, right) => left - right),
            } : null;
        }
        damage += intervalDamage;
        tick = arrivalTick;
        while (index < arrivals.length && arrivals[index].arrivalTicks === arrivalTick) {
            activeDamagePerTick += arrivals[index].damagePerTick;
            participatingUnitIds.push(arrivals[index].unitId);
            index += 1;
        }
        if (!Number.isFinite(activeDamagePerTick) || !(activeDamagePerTick > 0)) return null;
    }
    const completionTicks = tick + (targetHitPoints - damage) / activeDamagePerTick;
    return Number.isFinite(completionTicks) && completionTicks >= tick ? {
        completionTicks,
        participatingUnitIds: participatingUnitIds.slice().sort((left, right) => left - right),
    } : null;
};

const nonnegativeInteger = (value: number): boolean => Number.isSafeInteger(value) && value >= 0;

/**
 * Exact shared force partition for the passive state audit and enabled policy.
 * Every protected mission owner stays outside the lease pool. The additional
 * reserve is selected deterministically from the exact unprotected set.
 */
export const computeFinishAdvantagePartition = (
    input: FinishAdvantagePartitionInput,
): FinishAdvantagePartition => {
    const nominal = new Set(input.nominalEligibleIds);
    if (nominal.size !== input.nominalEligibleIds.length) {
        throw new Error("Finish-advantage nominal eligible set contains duplicate unit IDs");
    }
    if ([...input.protectedEligibleIds].some((id) => !nominal.has(id))) {
        throw new Error("Finish-advantage protected set is not a subset of nominal eligibility");
    }
    if (
        !nonnegativeInteger(input.enemyMobileSelectableCombatantCount) ||
        !FINISH_ADVANTAGE_MARGINS.includes(input.margin)
    ) throw new Error("Finish-advantage partition count or margin is invalid");

    const protectedIds = new Set(input.protectedEligibleIds);
    const leasePool = input.leasePoolByHomeDistance.slice();
    if (new Set(leasePool).size !== leasePool.length) {
        throw new Error("Finish-advantage lease pool contains duplicate unit IDs");
    }
    const expectedLeasePool = [...nominal].filter((id) => !protectedIds.has(id));
    if (
        leasePool.length !== expectedLeasePool.length ||
        leasePool.some((id) => !nominal.has(id) || protectedIds.has(id))
    ) {
        throw new Error("Finish-advantage lease pool is not the exact unprotected eligible set");
    }
    const desiredCover = Math.min(
        nominal.size,
        Math.max(
            FINISH_ADVANTAGE_BASE_RESERVE,
            input.enemyMobileSelectableCombatantCount + input.margin,
        ),
    );
    const additionalReserveCount = Math.max(0, desiredCover - protectedIds.size);
    const additionalReserveIds = leasePool.slice(0, additionalReserveCount);
    const reserved = new Set(additionalReserveIds);
    return {
        desiredCover,
        protectedCount: protectedIds.size,
        additionalReserveIds,
        strikeIds: leasePool.filter((id) => !reserved.has(id)),
    };
};

/**
 * Apply the prospective activation hierarchy around the exact cover
 * partition. A certified helpless opponent releases the numerical reserve in
 * both arms, but never borrows a unit protected by a Supalosa mission. The
 * irreversible-only ablation remains action-free without that certificate.
 */
export const computeFinishAdvantageOperationalPartition = (
    input: FinishAdvantageOperationalPartitionInput,
): FinishAdvantageOperationalPartition => {
    const ordinary = computeFinishAdvantagePartition(input);
    if (typeof input.irreversibleCertificate !== "boolean") {
        throw new Error("Finish-advantage irreversible certificate must be boolean");
    }
    if (input.multiBuildingMode !== "irreversible_only" && input.multiBuildingMode !== "surplus_cover") {
        throw new Error("Finish-advantage multi-building mode is invalid");
    }
    if (input.irreversibleCertificate) {
        return {
            active: input.leasePoolByHomeDistance.length > 0,
            activationReason: input.leasePoolByHomeDistance.length > 0
                ? "irreversible_certificate"
                : "inactive",
            desiredCover: 0,
            protectedCount: input.protectedEligibleIds.size,
            additionalReserveIds: [],
            strikeIds: input.leasePoolByHomeDistance.slice(),
        };
    }
    if (input.multiBuildingMode === "irreversible_only") return {
        active: false,
        activationReason: "inactive",
        desiredCover: ordinary.desiredCover,
        protectedCount: ordinary.protectedCount,
        additionalReserveIds: ordinary.additionalReserveIds,
        strikeIds: [],
    };
    return {
        active: ordinary.strikeIds.length > 0,
        activationReason: ordinary.strikeIds.length > 0 ? "surplus_cover" : "inactive",
        ...ordinary,
    };
};

/** More than one helpless structure remains and the opponent cannot replenish resistance. */
export const hasFinishAdvantageIrreversibleCertificate = (
    state: FinishAdvantageOpponentState,
): boolean => {
    const values = Object.values(state);
    if (values.some((value) => !nonnegativeInteger(value))) {
        throw new Error("Finish-advantage opponent state contains an invalid count");
    }
    return state.enemyBuildingCount > 1 &&
        state.enemySelectableCombatantCount === 0 &&
        state.enemyProductionBuildingCount === 0 &&
        state.enemyDeployableBaseUnitCount === 0;
};

/**
 * Decide only the direct building race. `null` means no relevant public threat
 * is projected; a non-finite or negative estimate is malformed and fails
 * closed. Army size never enters this decision independently.
 */
export const finishAdvantageDirectStrikeIsSafe = (
    input: FinishAdvantageRaceInput,
): boolean => {
    if (
        input.buildingCompletionTicks === null ||
        !Number.isFinite(input.buildingCompletionTicks) ||
        input.buildingCompletionTicks < 0 ||
        !nonnegativeInteger(input.safetyMarginTicks)
    ) return false;
    for (const threat of [input.earliestInterceptTicks, input.earliestOwnBuildingLossTicks]) {
        if (threat !== null && (!Number.isFinite(threat) || threat < 0)) return false;
    }
    const deadline = Math.min(
        input.earliestInterceptTicks ?? Number.POSITIVE_INFINITY,
        input.earliestOwnBuildingLossTicks ?? Number.POSITIVE_INFINITY,
    );
    return input.buildingCompletionTicks + input.safetyMarginTicks < deadline;
};

const nonnegativeFiniteOrNull = (value: number | null): boolean =>
    value === null || Number.isFinite(value) && value >= 0;

const nonnegativeIdOrNull = (value: number | null): boolean =>
    value === null || Number.isSafeInteger(value) && value >= 0;

const fallback = (
    reason: Extract<FinishAdvantageObjectiveDecision, { kind: "predecessor_fallback" }>['reason'],
): FinishAdvantageObjectiveDecision => ({
    kind: "predecessor_fallback",
    reason,
    targetBuildingId: null,
    blockerId: null,
    threatId: null,
});

/**
 * Select one minimal, causally justified intervention. A remote army with no
 * projected intercept is never considered a blocker. Stalled targets are
 * skipped so that a reachable alternative is tried before yielding to the
 * unchanged predecessor. This function deliberately has no global force-sweep
 * decision.
 */
export const selectFinishAdvantageObjectiveDecision = (
    input: FinishAdvantageObjectiveDecisionInput,
): FinishAdvantageObjectiveDecision => {
    if (
        !nonnegativeInteger(input.safetyMarginTicks) ||
        !nonnegativeFiniteOrNull(input.earliestOwnBuildingLossTicks) ||
        !nonnegativeIdOrNull(input.baseRaceThreatId)
    ) return fallback("malformed_or_unknown_race");

    const buildingIds = new Set<number>();
    for (const candidate of input.candidates) {
        if (
            !Number.isSafeInteger(candidate.buildingId) || candidate.buildingId < 0 ||
            !nonnegativeInteger(candidate.strategicPriority) || candidate.strategicPriority > 3 ||
            buildingIds.has(candidate.buildingId) ||
            !nonnegativeFiniteOrNull(candidate.buildingCompletionTicks) ||
            !nonnegativeFiniteOrNull(candidate.earliestInterceptTicks) ||
            !nonnegativeIdOrNull(candidate.blockerId) ||
            !nonnegativeFiniteOrNull(candidate.blockerRemovalTicks) ||
            typeof candidate.stalled !== "boolean" ||
            (candidate.blockerId === null) !== (candidate.blockerRemovalTicks === null)
        ) return fallback("malformed_or_unknown_race");
        buildingIds.add(candidate.buildingId);
    }

    const live = input.candidates.filter(({ stalled }) => !stalled);
    const safe = live.filter((candidate) => finishAdvantageDirectStrikeIsSafe({
        buildingCompletionTicks: candidate.buildingCompletionTicks,
        earliestInterceptTicks: candidate.earliestInterceptTicks,
        earliestOwnBuildingLossTicks: input.earliestOwnBuildingLossTicks,
        safetyMarginTicks: input.safetyMarginTicks,
    })).sort((left, right) =>
        (left.buildingCompletionTicks ?? Number.POSITIVE_INFINITY) -
            (right.buildingCompletionTicks ?? Number.POSITIVE_INFINITY) ||
        right.strategicPriority - left.strategicPriority ||
        left.buildingId - right.buildingId,
    );
    if (safe.length > 0) return {
        kind: "building_strike",
        reason: "fastest_safe_building_race",
        targetBuildingId: safe[0].buildingId,
        blockerId: null,
        threatId: null,
    };

    const finiteObjectiveDeadlines = live.flatMap(({ buildingCompletionTicks }) =>
        buildingCompletionTicks === null
            ? []
            : [buildingCompletionTicks + input.safetyMarginTicks],
    );
    const earliestObjectiveDeadline = finiteObjectiveDeadlines.length === 0
        ? Number.POSITIVE_INFINITY
        : Math.min(...finiteObjectiveDeadlines);
    if (
        input.earliestOwnBuildingLossTicks !== null &&
        input.earliestOwnBuildingLossTicks <= earliestObjectiveDeadline
    ) {
        if (input.baseRaceThreatId === null) return fallback("malformed_or_unknown_race");
        return {
            kind: "base_defense",
            reason: "own_building_loss_precedes_objective",
            targetBuildingId: null,
            blockerId: null,
            threatId: input.baseRaceThreatId,
        };
    }

    const blockers = live.filter((candidate) =>
        candidate.buildingCompletionTicks !== null &&
        candidate.earliestInterceptTicks !== null &&
        candidate.earliestInterceptTicks <= candidate.buildingCompletionTicks + input.safetyMarginTicks &&
        candidate.blockerId !== null && candidate.blockerRemovalTicks !== null,
    ).sort((left, right) =>
        (left.blockerRemovalTicks ?? Number.POSITIVE_INFINITY) -
            (right.blockerRemovalTicks ?? Number.POSITIVE_INFINITY) ||
        (left.buildingCompletionTicks ?? Number.POSITIVE_INFINITY) -
            (right.buildingCompletionTicks ?? Number.POSITIVE_INFINITY) ||
        right.strategicPriority - left.strategicPriority ||
        left.buildingId - right.buildingId ||
        (left.blockerId ?? Number.POSITIVE_INFINITY) - (right.blockerId ?? Number.POSITIVE_INFINITY),
    );
    const selected = blockers[0];
    if (selected?.blockerId !== null && selected?.blockerId !== undefined) return {
        kind: "blocker_clear",
        reason: "minimum_causal_intercept_blocker",
        targetBuildingId: selected.buildingId,
        blockerId: selected.blockerId,
        threatId: null,
    };
    return fallback("no_live_reachable_objective");
};
