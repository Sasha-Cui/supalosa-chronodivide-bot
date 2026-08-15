import { BuildingEliminationTelemetryEvent } from
    "@supalosa/chronodivide-bot/dist/bot/logic/mission/missions/buildingEliminationMission.js";

type DeadlineEvent = Extract<BuildingEliminationTelemetryEvent, { event: "objective_progress_deadline" }>;
type RecoveryEvent = Extract<BuildingEliminationTelemetryEvent, { event: "objective_progress_recovery" }>;

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

export const validateMissionNativeCloseoutV36ProgressTelemetry = (
    telemetry: readonly BuildingEliminationTelemetryEvent[],
    maxTicks: number,
): { predecessorOwnedFallbacks: number; noOwnerRecoveries: number; incompleteFallbacks: number } => {
    if (!Number.isSafeInteger(maxTicks) || maxTicks < 1) throw new Error("V36 maxTicks is invalid");
    const progress = eventsOf(telemetry, "objective_physical_progress");
    const deadlines = eventsOf(telemetry, "objective_progress_deadline");
    const recoveries = eventsOf(telemetry, "objective_progress_recovery");
    for (const event of progress) {
        const damageKind = event.progressKind === "building_damage" || event.progressKind === "blocker_damage";
        if (
            event.schemaVersion !== 28 || event.lastCertifiedProgressTick !== event.tick ||
            (damageKind ? event.damage <= 0 : event.damage !== 0)
        ) throw new Error("V36 physical-progress event is not an irreversible certified fact");
    }
    for (const event of deadlines) {
        if (event.schemaVersion !== 29 || event.fallbackUntilTick < event.tick) {
            throw new Error("V36 progress-deadline event schema or time order drifted");
        }
    }
    let predecessorOwnedFallbacks = 0;
    let noOwnerRecoveries = 0;
    let incompleteFallbacks = 0;
    const starts = deadlines.filter(({ phase }) => phase === "fallback_started");
    const matchedRecoveries = new Set<RecoveryEvent>();
    for (const start of starts) {
        const expectedDeadline = start.reason === "building_no_progress" ? 300 : 240;
        if (
            start.reason === null || start.targetId === null || start.lastCertifiedProgressTick === null ||
            start.deadlineTicks !== expectedDeadline ||
            start.tick - start.lastCertifiedProgressTick < expectedDeadline ||
            start.fallbackUntilTick - start.tick !== 180 || start.releasedUnitIds.length === 0
        ) throw new Error("V36 fallback start did not satisfy the frozen deadline contract");
        const active = matchingActive(deadlines, start);
        if (active.length === 0 || active.some((event) =>
            event.tick < start.tick || event.tick >= start.fallbackUntilTick || event.reason !== start.reason
        )) throw new Error("V36 fallback interval was not audited inside its frozen bounds");
        if (!active.some(({ suspendedOverlayMissionNames }) => suspendedOverlayMissionNames.length > 0)) {
            throw new Error("V36 fallback never suspended the closeout overlay");
        }
        const hasPredecessorOwnership = active.some(
            ({ activePredecessorMissionNames }) => activePredecessorMissionNames.length > 0,
        );
        const recovery = recoveries.filter(({ fallbackStartedTick }) => fallbackStartedTick === start.tick);
        const replans = deadlines.filter((event) =>
            event.phase === "replan_started" && event.fallbackUntilTick === start.fallbackUntilTick,
        );
        if (hasPredecessorOwnership) {
            predecessorOwnedFallbacks += 1;
            if (recovery.length !== 0) throw new Error("V36 recovered a fallback after predecessor ownership");
            if (
                start.fallbackUntilTick <= maxTicks &&
                (replans.length !== 1 || replans[0].tick !== start.fallbackUntilTick)
            ) throw new Error("V36 predecessor-owned fallback did not replan at its exact boundary");
            continue;
        }
        const graceUntilTick = start.tick + 120;
        if (graceUntilTick > maxTicks) {
            if (recovery.length !== 0 || replans.length !== 0) {
                throw new Error("V36 incomplete fallback emitted a premature recovery or replan");
            }
            incompleteFallbacks += 1;
            continue;
        }
        if (recovery.length !== 1) throw new Error("V36 no-owner fallback lacked one bounded recovery");
        const recovered = recovery[0];
        if (
            recovered.schemaVersion !== 30 || recovered.phase !== "fallback_no_predecessor_replan" ||
            recovered.tick !== graceUntilTick || recovered.reason !== start.reason ||
            recovered.targetId !== start.targetId || recovered.blockerId !== start.blockerId ||
            recovered.predecessorOwnershipGraceTicks !== 120 ||
            recovered.predecessorOwnershipGraceUntilTick !== graceUntilTick ||
            recovered.plannedFallbackUntilTick !== start.fallbackUntilTick ||
            recovered.releasedUnitIds.join(",") !== start.releasedUnitIds.join(",") ||
            recovered.activePredecessorMissionNames.length !== 0 || replans.length !== 0
        ) throw new Error("V36 no-owner recovery drifted from its frozen exact contract");
        matchedRecoveries.add(recovered);
        noOwnerRecoveries += 1;
    }
    if (recoveries.some((event) => !matchedRecoveries.has(event))) {
        throw new Error("V36 emitted an orphan no-owner recovery");
    }
    return { predecessorOwnedFallbacks, noOwnerRecoveries, incompleteFallbacks };
};
