import { BuildingEliminationTelemetryEvent } from
    "@supalosa/chronodivide-bot/dist/bot/logic/mission/missions/buildingEliminationMission.js";

type DeadlineEvent = Extract<BuildingEliminationTelemetryEvent, { event: "objective_progress_deadline" }>;
type RecoveryEvent = Extract<BuildingEliminationTelemetryEvent, { event: "objective_progress_recovery" }>;
type OwnershipEvent = Extract<BuildingEliminationTelemetryEvent, { event: "objective_predecessor_ownership" }>;

const eventsOf = <T extends BuildingEliminationTelemetryEvent["event"]>(
    telemetry: readonly BuildingEliminationTelemetryEvent[],
    event: T,
): Array<Extract<BuildingEliminationTelemetryEvent, { event: T }>> => telemetry.filter(
    (value): value is Extract<BuildingEliminationTelemetryEvent, { event: T }> => value.event === event,
);

const matchingActive = (deadlines: readonly DeadlineEvent[], start: DeadlineEvent): DeadlineEvent[] =>
    deadlines.filter((event) =>
        event.phase === "fallback_active" && event.fallbackUntilTick === start.fallbackUntilTick,
    );

export type MissionNativeCloseoutV37ProgressSummary = {
    predecessorOwnedFallbacks: number;
    noOwnerRecoveries: number;
    ownershipLossRecoveries: number;
    incompleteFallbacks: number;
    ownershipObservations: number;
};

export const validateMissionNativeCloseoutV37ProgressTelemetry = (
    telemetry: readonly BuildingEliminationTelemetryEvent[],
    observedTicks: number,
): MissionNativeCloseoutV37ProgressSummary => {
    if (!Number.isSafeInteger(observedTicks) || observedTicks < 1) {
        throw new Error("V37 observedTicks is invalid");
    }
    const progress = eventsOf(telemetry, "objective_physical_progress");
    const deadlines = eventsOf(telemetry, "objective_progress_deadline");
    const recoveries = eventsOf(telemetry, "objective_progress_recovery");
    const ownershipEvents = eventsOf(telemetry, "objective_predecessor_ownership");
    for (const event of progress) {
        const damageKind = event.progressKind === "building_damage" || event.progressKind === "blocker_damage";
        if (
            event.schemaVersion !== 28 || event.lastCertifiedProgressTick !== event.tick ||
            (damageKind ? event.damage <= 0 : event.damage !== 0)
        ) throw new Error("V37 physical-progress event is not an irreversible certified fact");
    }
    for (const event of deadlines) {
        if (event.schemaVersion !== 29 || event.fallbackUntilTick < event.tick) {
            throw new Error("V37 progress-deadline event schema or time order drifted");
        }
    }
    let predecessorOwnedFallbacks = 0;
    let noOwnerRecoveries = 0;
    let ownershipLossRecoveries = 0;
    let incompleteFallbacks = 0;
    let ownershipObservations = 0;
    const starts = deadlines.filter(({ phase }) => phase === "fallback_started");
    const matchedRecoveries = new Set<RecoveryEvent>();
    const matchedOwnership = new Set<OwnershipEvent>();
    for (const start of starts) {
        const expectedDeadline = start.reason === "building_no_progress" ? 300 : 240;
        if (
            start.reason === null || start.targetId === null || start.lastCertifiedProgressTick === null ||
            start.deadlineTicks !== expectedDeadline ||
            start.tick - start.lastCertifiedProgressTick < expectedDeadline ||
            start.fallbackUntilTick - start.tick !== 180 || start.releasedUnitIds.length === 0
        ) throw new Error("V37 fallback start did not satisfy the frozen deadline contract");
        const active = matchingActive(deadlines, start);
        if (active.length === 0 || active.some((event) =>
            event.tick < start.tick || event.tick >= start.fallbackUntilTick || event.reason !== start.reason
        )) throw new Error("V37 fallback interval was not audited inside its frozen bounds");
        if (!active.some(({ suspendedOverlayMissionNames }) => suspendedOverlayMissionNames.length > 0)) {
            throw new Error("V37 fallback never suspended the closeout overlay");
        }
        const recovery = recoveries.filter(({ fallbackStartedTick }) => fallbackStartedTick === start.tick);
        const ownership = ownershipEvents.filter(({ fallbackStartedTick }) => fallbackStartedTick === start.tick);
        const replans = deadlines.filter((event) =>
            event.phase === "replan_started" && event.fallbackUntilTick === start.fallbackUntilTick,
        );
        if (ownership.length > 1) throw new Error("V37 fallback emitted duplicate first-ownership observations");
        if (ownership.length === 1) {
            const observed = ownership[0];
            if (
                observed.schemaVersion !== 31 ||
                observed.phase !== "fallback_predecessor_ownership_observed" ||
                observed.tick < start.tick || observed.tick >= start.fallbackUntilTick ||
                observed.reason !== start.reason || observed.targetId !== start.targetId ||
                observed.blockerId !== start.blockerId ||
                observed.plannedFallbackUntilTick !== start.fallbackUntilTick ||
                observed.releasedUnitIds.join(",") !== start.releasedUnitIds.join(",") ||
                observed.activePredecessorMissionNames.length === 0
            ) throw new Error("V37 first-ownership observation drifted from its sealed contract");
            matchedOwnership.add(observed);
            ownershipObservations += 1;
        }
        const sampledOwnership = active.some(
            ({ activePredecessorMissionNames }) => activePredecessorMissionNames.length > 0,
        );
        if (sampledOwnership && ownership.length !== 1) {
            throw new Error("V37 sampled predecessor ownership lacked one immediate first-ownership observation");
        }
        const graceUntilTick = start.tick + 120;
        if (recovery.length === 1) {
            const recovered = recovery[0];
            if (
                recovered.schemaVersion !== 30 || recovered.phase !== "fallback_no_predecessor_replan" ||
                recovered.tick < graceUntilTick || recovered.tick >= start.fallbackUntilTick ||
                recovered.reason !== start.reason || recovered.targetId !== start.targetId ||
                recovered.blockerId !== start.blockerId || recovered.predecessorOwnershipGraceTicks !== 120 ||
                recovered.predecessorOwnershipGraceUntilTick !== graceUntilTick ||
                recovered.plannedFallbackUntilTick !== start.fallbackUntilTick ||
                recovered.releasedUnitIds.join(",") !== start.releasedUnitIds.join(",") ||
                recovered.activePredecessorMissionNames.length !== 0 || replans.length !== 0
            ) throw new Error("V37 recovery drifted from its frozen active-ownership contract");
            if (ownership.length === 0 && recovered.tick !== graceUntilTick) {
                throw new Error("V37 never-owned fallback did not recover at its exact grace boundary");
            }
            if (ownership.length === 1 && ownership[0].tick >= recovered.tick) {
                throw new Error("V37 ownership-loss recovery did not follow the ownership observation");
            }
            matchedRecoveries.add(recovered);
            if (ownership.length === 1) ownershipLossRecoveries += 1;
            else noOwnerRecoveries += 1;
            continue;
        }
        if (recovery.length > 1) throw new Error("V37 fallback emitted duplicate recoveries");
        if (graceUntilTick > observedTicks) {
            if (replans.length !== 0) throw new Error("V37 censored fallback emitted a premature replan");
            incompleteFallbacks += 1;
            continue;
        }
        const ownerAfterGrace = active.some((event) =>
            event.tick >= graceUntilTick && event.activePredecessorMissionNames.length > 0,
        ) || ownership.some((event) => event.tick >= graceUntilTick) || replans.some((event) =>
            event.tick >= graceUntilTick && event.activePredecessorMissionNames.length > 0,
        );
        if (!ownerAfterGrace) {
            throw new Error("V37 ownerless post-grace fallback lacked bounded recovery");
        }
        if (start.fallbackUntilTick <= observedTicks) {
            if (replans.length !== 1 || replans[0].tick !== start.fallbackUntilTick) {
                throw new Error("V37 predecessor-owned fallback did not replan at its exact boundary");
            }
            predecessorOwnedFallbacks += 1;
        } else {
            if (replans.length !== 0) throw new Error("V37 censored owned fallback emitted a premature replan");
            incompleteFallbacks += 1;
        }
    }
    if (recoveries.some((event) => !matchedRecoveries.has(event))) {
        throw new Error("V37 emitted an orphan recovery");
    }
    if (ownershipEvents.some((event) => !matchedOwnership.has(event))) {
        throw new Error("V37 emitted an orphan first-ownership observation");
    }
    return {
        predecessorOwnedFallbacks,
        noOwnerRecoveries,
        ownershipLossRecoveries,
        incompleteFallbacks,
        ownershipObservations,
    };
};
