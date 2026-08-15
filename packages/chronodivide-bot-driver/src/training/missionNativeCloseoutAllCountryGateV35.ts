import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { cdapi } from "@chronodivide/game-api";
import { Countries } from "@supalosa/chronodivide-bot/dist/bot/logic/common/utils.js";
import { BuildingEliminationTelemetryEvent } from
    "@supalosa/chronodivide-bot/dist/bot/logic/mission/missions/buildingEliminationMission.js";
import { loadBaselineFactory } from "../benchmark/baselineLoader.js";
import { createExperimentManifest } from "../benchmark/provenance.js";
import { derivePairedEngineSeed } from "../benchmark/seededOfflineGame.js";
import { METHOD_V5_EQUIVALENCE_MAP_SHA256 } from "./methodV5BaselineEquivalence.js";
import { sha256File } from "./methodV5PlanRunner.js";
import {
    MISSION_NATIVE_CLOSEOUT_COMPATIBILITY_MAX_TICKS,
    MissionNativeCloseoutRunTrace,
    runMissionNativeCloseoutTrace,
} from "./missionNativeCloseoutCompatibilityGate.js";
import { validateMissionNativeCloseoutFocusedGateV29Telemetry } from
    "./missionNativeCloseoutFocusedGateV29.js";
import {
    buildMissionNativeCloseoutPolicyV35,
    missionNativeCloseoutPolicyV35Sha256,
} from "./missionNativeCloseoutPolicyV35.js";

export const MISSION_NATIVE_CLOSEOUT_ALL_COUNTRY_GATE_V35_SCHEMA_VERSION = 1 as const;
export const MISSION_NATIVE_CLOSEOUT_ALL_COUNTRY_GATE_V35_REVISION = "V35-R1" as const;
export const MISSION_NATIVE_CLOSEOUT_ALL_COUNTRY_GATE_V35_ENGINE_SEED_BASE = 4_294_900_000 as const;
export const MISSION_NATIVE_CLOSEOUT_ALL_COUNTRY_GATE_V35_RUNS_PER_COUNTRY_SLOT = 4 as const;
export const MISSION_NATIVE_CLOSEOUT_ALL_COUNTRY_GATE_V35_COUNTRIES = Object.freeze(
    Object.values(Countries),
);

const alliedCountries = new Set<Countries>([
    Countries.USA,
    Countries.KOREA,
    Countries.FRANCE,
    Countries.GERMANY,
    Countries.GREAT_BRITAIN,
]);

const requiredPath = (name: string): string => {
    const value = process.env[name];
    if (!value) throw new Error(`${name} is required`);
    return path.resolve(value);
};
const digest = (value: unknown): string => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const traceDigest = (trace: MissionNativeCloseoutRunTrace, includeTelemetry: boolean): string => digest({
    actions: trace.actions,
    snapshots: trace.snapshots,
    quitAttempts: trace.quitAttempts,
    ...(includeTelemetry ? { telemetry: trace.telemetry } : {}),
});
const eventsOf = <T extends BuildingEliminationTelemetryEvent["event"]>(
    telemetry: readonly BuildingEliminationTelemetryEvent[],
    event: T,
): Array<Extract<BuildingEliminationTelemetryEvent, { event: T }>> => telemetry.filter(
    (value): value is Extract<BuildingEliminationTelemetryEvent, { event: T }> => value.event === event,
);

export type MissionNativeCloseoutAllCountryV35CoverageRow = {
    country: Countries;
    candidateSlot: 0 | 1;
    passed: boolean;
    preterminalCompositionBlockedEvaluationCount: number;
    firstPreterminalCompositionBlockedTick: number | null;
    capabilityLaunchCount: number;
    launchTick: number | null;
    launchCompositionReady: boolean | null;
    launchEnemyBuildingCount: number | null;
    launchObjectiveBypassesComposition: boolean | null;
    launchHandoffCount: number;
    buildingDamage: number;
    screenInfrastructureEventCount: number;
    screenInfrastructureRequestedCount: number;
    screenInfrastructureReadyCount: number;
    screenInfrastructureNames: string[];
    productionFocusEventCount: number;
    productionFocusActiveCount: number;
    exclusiveSchedulerEventCount: number;
    exclusiveSchedulerPausedQueueCount: number;
    exclusiveSchedulerDeferredQueueCount: number;
    exclusiveSchedulerReadyQueueCount: number;
    objectiveRaceAllocationEventCount: number;
    boundedBlockerAllocationEventCount: number;
    terminalPriorityEventCount: number;
    productionReservationEventCount: number;
    physicalProgressEventCount: number;
    buildingPhysicalProgressEventCount: number;
    blockerPhysicalProgressEventCount: number;
    fallbackStartedCount: number;
    fallbackActiveCount: number;
    replanStartedCount: number;
    activePredecessorFallbackEventCount: number;
    overlaySuspensionEventCount: number;
};

export const validateMissionNativeCloseoutV35ObjectiveRaceTelemetry = (
    telemetry: readonly BuildingEliminationTelemetryEvent[],
): void => {
    const allocations = eventsOf(telemetry, "engagement_allocation");
    const objectiveRace = eventsOf(telemetry, "objective_race_allocation");
    for (const allocation of allocations) {
        const audit = objectiveRace.find((candidate) =>
            candidate.tick === allocation.tick && candidate.targetId === allocation.targetId &&
            candidate.blockerId === allocation.blockerId &&
            candidate.assignedAttackerCount === allocation.assignedAttackerCount &&
            candidate.buildingAttackerCount === allocation.buildingAttackerCount &&
            candidate.blockerAttackerCount === allocation.blockerAttackerCount,
        );
        if (!audit) {
            throw new Error("V35 objective-race telemetry did not cover a throttled live allocation");
        }
    }
    for (const event of objectiveRace) {
        if (event.allocationMode !== "boundedScreen") {
            throw new Error("V35 objective-race allocation did not execute boundedScreen mode");
        }
        if (
            event.assignedAttackerCount !== event.buildingAttackerCount + event.blockerAttackerCount ||
            event.remainingEnemyBuildingCount < 1 ||
            event.terminalPriorityActive !== (event.remainingEnemyBuildingCount === 1)
        ) {
            throw new Error("V35 objective-race allocation partition or terminal state was inconsistent");
        }
        if (event.terminalPriorityActive && event.blockerId === null) {
            if (event.blockerAttackerCount !== 0 || event.buildingAttackerCount !== event.assignedAttackerCount) {
                throw new Error("V35 feasible terminal strike did not receive the full compatible force");
            }
        } else if (event.blockerId !== null) {
            if (
                event.blockerAttackerCount > Math.floor(event.assignedAttackerCount / 2) ||
                event.buildingAttackerCount < Math.ceil(event.assignedAttackerCount / 2)
            ) {
                throw new Error("V35 blocker clearance consumed more than the bounded screen");
            }
        } else if (
            event.blockerAttackerCount !== 0 || event.buildingAttackerCount !== event.assignedAttackerCount
        ) {
            throw new Error("V35 direct building strike did not retain the full compatible force");
        }
    }
};

type MissionNativeCloseoutQuitAudit = MissionNativeCloseoutRunTrace["quitAttempts"];

export const validateMissionNativeCloseoutV35QuitAudits = (
    direct: MissionNativeCloseoutQuitAudit,
    disabled: MissionNativeCloseoutQuitAudit,
    first: MissionNativeCloseoutQuitAudit,
    repeat: MissionNativeCloseoutQuitAudit,
): string[] => {
    const errors: string[] = [];
    if (digest(direct) !== digest(disabled)) {
        errors.push("direct and disabled control resignation audits differ");
    }
    for (const [label, audit] of [["first", first], ["repeat", repeat]] as const) {
        if (audit.candidate !== 0 || audit.baseline !== 0) {
            errors.push(`${label}: enabled resignation attempt`);
        }
    }
    return errors;
};

export const validateMissionNativeCloseoutV35ProgressTelemetry = (
    telemetry: readonly BuildingEliminationTelemetryEvent[],
): void => {
    const progress = eventsOf(telemetry, "objective_physical_progress");
    const deadlines = eventsOf(telemetry, "objective_progress_deadline");
    for (const event of progress) {
        const damageKind = event.progressKind === "building_damage" || event.progressKind === "blocker_damage";
        if (
            event.schemaVersion !== 28 || event.lastCertifiedProgressTick !== event.tick ||
            (damageKind ? event.damage <= 0 : event.damage !== 0)
        ) throw new Error("V35 physical-progress event is not an irreversible certified fact");
    }
    const starts = deadlines.filter(({ phase }) => phase === "fallback_started");
    for (const event of deadlines) {
        if (event.schemaVersion !== 29 || event.fallbackUntilTick < event.tick) {
            throw new Error("V35 progress-deadline event schema or time order drifted");
        }
    }
    for (const start of starts) {
        const expectedDeadline = start.reason === "building_no_progress" ? 300 : 240;
        if (
            start.reason === null || start.targetId === null || start.lastCertifiedProgressTick === null ||
            start.deadlineTicks !== expectedDeadline ||
            start.tick - start.lastCertifiedProgressTick < expectedDeadline ||
            start.fallbackUntilTick - start.tick !== 180 || start.releasedUnitIds.length === 0
        ) throw new Error("V35 fallback start did not satisfy the frozen deadline contract");
        const active = deadlines.filter((event) =>
            event.phase === "fallback_active" && event.fallbackUntilTick === start.fallbackUntilTick,
        );
        if (active.length === 0 || active.some((event) =>
            event.tick < start.tick || event.tick >= start.fallbackUntilTick || event.reason !== start.reason
        )) throw new Error("V35 fallback interval was not audited inside its frozen bounds");
        if (!active.some(({ activePredecessorMissionNames }) => activePredecessorMissionNames.length > 0)) {
            throw new Error("V35 fallback never yielded to a unit-owning predecessor attack mission");
        }
        if (!active.some(({ suspendedOverlayMissionNames }) => suspendedOverlayMissionNames.length > 0)) {
            throw new Error("V35 fallback never suspended the closeout overlay");
        }
        const replans = deadlines.filter((event) =>
            event.phase === "replan_started" && event.fallbackUntilTick === start.fallbackUntilTick,
        );
        if (
            start.fallbackUntilTick <= MISSION_NATIVE_CLOSEOUT_COMPATIBILITY_MAX_TICKS &&
            (replans.length !== 1 || replans[0].tick !== start.fallbackUntilTick)
        ) throw new Error("V35 completed fallback interval did not replan at its exact boundary");
    }
};

const convertedAfterCompositionBlock = (row: MissionNativeCloseoutAllCountryV35CoverageRow): boolean =>
    row.firstPreterminalCompositionBlockedTick !== null && row.capabilityLaunchCount >= 1 &&
    row.launchTick !== null && row.launchTick > row.firstPreterminalCompositionBlockedTick &&
    row.launchCompositionReady === true && row.launchHandoffCount > 0 && row.buildingDamage > 0;

export const validateMissionNativeCloseoutAllCountryV35Coverage = (
    rows: readonly MissionNativeCloseoutAllCountryV35CoverageRow[],
): string[] => {
    const errors: string[] = [];
    if (rows.length !== MISSION_NATIVE_CLOSEOUT_ALL_COUNTRY_GATE_V35_COUNTRIES.length * 2) {
        errors.push("all-country matrix does not contain exactly 18 country-slot cells");
    }
    for (const country of MISSION_NATIVE_CLOSEOUT_ALL_COUNTRY_GATE_V35_COUNTRIES) {
        for (const slot of [0, 1] as const) {
            if (rows.filter((row) => row.country === country && row.candidateSlot === slot).length !== 1) {
                errors.push(`missing or duplicate ${country} slot ${slot} cell`);
            }
        }
    }
    const compositionExposure = (row: MissionNativeCloseoutAllCountryV35CoverageRow): boolean =>
        row.preterminalCompositionBlockedEvaluationCount > 0;
    for (const [label, predicate] of [
        ["Allied", (row: MissionNativeCloseoutAllCountryV35CoverageRow) => alliedCountries.has(row.country)],
        ["Soviet", (row: MissionNativeCloseoutAllCountryV35CoverageRow) => !alliedCountries.has(row.country)],
        ["slot 0", (row: MissionNativeCloseoutAllCountryV35CoverageRow) => row.candidateSlot === 0],
        ["slot 1", (row: MissionNativeCloseoutAllCountryV35CoverageRow) => row.candidateSlot === 1],
    ] as const) {
        if (!rows.some((row) => predicate(row) && compositionExposure(row))) {
            errors.push(`${label} rows never exposed preterminal composition blocking`);
        }
        if (!rows.some((row) => predicate(row) && convertedAfterCompositionBlock(row))) {
            errors.push(`${label} rows never converted a composition block into certified building damage`);
        }
    }
    if (rows.some((row) => row.productionReservationEventCount !== 0)) {
        errors.push("V35 emitted destructive production-reservation telemetry");
    }
    for (const [label, predicate, expectedName] of [
        ["Allied", (row: MissionNativeCloseoutAllCountryV35CoverageRow) => alliedCountries.has(row.country), "GAPILE"],
        ["Soviet", (row: MissionNativeCloseoutAllCountryV35CoverageRow) => !alliedCountries.has(row.country), "NAHAND"],
    ] as const) {
        const factionRows = rows.filter(predicate);
        if (!factionRows.some((row) => row.screenInfrastructureNames.includes(expectedName))) {
            errors.push(`${label} rows never evaluated side-correct screen infrastructure ${expectedName}`);
        }
        if (!factionRows.some((row) => row.screenInfrastructureReadyCount > 0)) {
            errors.push(`${label} rows never observed ready screen infrastructure ${expectedName}`);
        }
    }
    for (const [label, predicate] of [
        ["Allied", (row: MissionNativeCloseoutAllCountryV35CoverageRow) => alliedCountries.has(row.country)],
        ["Soviet", (row: MissionNativeCloseoutAllCountryV35CoverageRow) => !alliedCountries.has(row.country)],
        ["slot 0", (row: MissionNativeCloseoutAllCountryV35CoverageRow) => row.candidateSlot === 0],
        ["slot 1", (row: MissionNativeCloseoutAllCountryV35CoverageRow) => row.candidateSlot === 1],
    ] as const) {
        if (!rows.some((row) => predicate(row) && row.productionFocusActiveCount > 0)) {
            errors.push(`${label} rows never activated queue-safe production focus`);
        }
        if (!rows.some((row) => predicate(row) && row.exclusiveSchedulerEventCount > 0)) {
            errors.push(`${label} rows never executed the external queue-controller focus adapter`);
        }
        if (!rows.some((row) => predicate(row) && row.objectiveRaceAllocationEventCount > 0)) {
            errors.push(`${label} rows never executed objective-race allocation`);
        }
    }
    if (!rows.some((row) => row.boundedBlockerAllocationEventCount > 0)) {
        errors.push("V35 never exercised bounded blocker clearance");
    }
    if (!rows.some((row) => row.buildingPhysicalProgressEventCount > 0)) {
        errors.push("V35 never certified physical building progress");
    }
    if (!rows.some((row) => row.blockerPhysicalProgressEventCount > 0)) {
        errors.push("V35 never certified physical blocker progress");
    }
    return errors;
};

const summarizeCoverage = (
    telemetry: readonly BuildingEliminationTelemetryEvent[],
    country: Countries,
    candidateSlot: 0 | 1,
    passed: boolean,
): MissionNativeCloseoutAllCountryV35CoverageRow => {
    const activation = eventsOf(telemetry, "activation_evaluation");
    const capability = eventsOf(telemetry, "assault_capability_launch");
    const handoff = eventsOf(telemetry, "launch_handoff");
    const progress = eventsOf(telemetry, "target_progress");
    const screenInfrastructure = eventsOf(telemetry, "assault_screen_infrastructure");
    const productionFocus = eventsOf(telemetry, "assault_production_focus");
    const exclusiveScheduler = eventsOf(telemetry, "exclusive_queue_focus_scheduler");
    const objectiveRaceAllocation = eventsOf(telemetry, "objective_race_allocation");
    const productionReservation = eventsOf(telemetry, "assault_production_reservation");
    const physicalProgress = eventsOf(telemetry, "objective_physical_progress");
    const progressDeadline = eventsOf(telemetry, "objective_progress_deadline");
    const compositionBlocks = activation.filter((event) =>
        event.schemaVersion === 23 && event.phase === "blocked" && event.enemyBuildingCount > 1 &&
        (event.directObjectiveFeasible || event.completeRouteFeasible) && !event.compositionReady &&
        !event.objectiveFeasibilityBypassesComposition &&
        event.activePredecessorCompatibleAttackerCount > 0,
    );
    const launch = capability[0];
    const launchEvaluation = launch
        ? activation.find((event) => event.schemaVersion === 23 && event.tick === launch.tick)
        : undefined;
    return {
        country,
        candidateSlot,
        passed,
        preterminalCompositionBlockedEvaluationCount: compositionBlocks.length,
        firstPreterminalCompositionBlockedTick: compositionBlocks[0]?.tick ?? null,
        capabilityLaunchCount: capability.length,
        launchTick: launch?.tick ?? null,
        launchCompositionReady: launchEvaluation?.schemaVersion === 23
            ? launchEvaluation.compositionReady
            : null,
        launchEnemyBuildingCount: launchEvaluation?.schemaVersion === 23
            ? launchEvaluation.enemyBuildingCount
            : null,
        launchObjectiveBypassesComposition: launchEvaluation?.schemaVersion === 23
            ? launchEvaluation.objectiveFeasibilityBypassesComposition
            : null,
        launchHandoffCount: handoff.length,
        buildingDamage: progress.reduce((total, event) => total + event.damage, 0),
        screenInfrastructureEventCount: screenInfrastructure.length,
        screenInfrastructureRequestedCount: screenInfrastructure.filter(({ requested }) => requested).length,
        screenInfrastructureReadyCount: screenInfrastructure.filter(({ currentCount }) => currentCount >= 1).length,
        screenInfrastructureNames: [...new Set(screenInfrastructure.map(({ structureName }) => structureName))]
            .sort((left, right) => left.localeCompare(right)),
        productionFocusEventCount: productionFocus.length,
        productionFocusActiveCount: productionFocus.filter(({ phase }) => phase !== "inactive").length,
        exclusiveSchedulerEventCount: exclusiveScheduler.length,
        exclusiveSchedulerPausedQueueCount: exclusiveScheduler.reduce(
            (total, event) => total + event.pausedQueueTypes.length, 0,
        ),
        exclusiveSchedulerDeferredQueueCount: exclusiveScheduler.reduce(
            (total, event) => total + event.deferredQueueTypes.length, 0,
        ),
        exclusiveSchedulerReadyQueueCount: exclusiveScheduler.reduce(
            (total, event) => total + event.readyQueueTypes.length, 0,
        ),
        objectiveRaceAllocationEventCount: objectiveRaceAllocation.length,
        boundedBlockerAllocationEventCount: objectiveRaceAllocation.filter(
            ({ blockerId, blockerAttackerCount }) => blockerId !== null && blockerAttackerCount > 0,
        ).length,
        terminalPriorityEventCount: objectiveRaceAllocation.filter(
            ({ terminalPriorityActive }) => terminalPriorityActive,
        ).length,
        productionReservationEventCount: productionReservation.length,
        physicalProgressEventCount: physicalProgress.length,
        buildingPhysicalProgressEventCount: physicalProgress.filter(({ progressKind }) =>
            progressKind === "building_damage" || progressKind === "building_destroyed",
        ).length,
        blockerPhysicalProgressEventCount: physicalProgress.filter(({ progressKind }) =>
            progressKind === "blocker_damage" || progressKind === "blocker_destroyed",
        ).length,
        fallbackStartedCount: progressDeadline.filter(({ phase }) => phase === "fallback_started").length,
        fallbackActiveCount: progressDeadline.filter(({ phase }) => phase === "fallback_active").length,
        replanStartedCount: progressDeadline.filter(({ phase }) => phase === "replan_started").length,
        activePredecessorFallbackEventCount: progressDeadline.filter((event) =>
            event.phase === "fallback_active" && event.activePredecessorMissionNames.length > 0,
        ).length,
        overlaySuspensionEventCount: progressDeadline.filter((event) =>
            event.phase === "fallback_active" && event.suspendedOverlayMissionNames.length > 0,
        ).length,
    };
};

const main = async (): Promise<void> => {
    const repoRoot = path.resolve(process.cwd(), "..", "..");
    const outFile = requiredPath("OUT_FILE");
    if (fs.existsSync(outFile)) throw new Error(`Refusing to overwrite ${outFile}`);
    if (!process.env.BASELINE_PACKAGE_ROOT || process.env.REQUIRE_EXTERNAL_BASELINE !== "true") {
        throw new Error("All-country V35 gate requires the pinned external baseline");
    }
    const mapName = "simple-1v1-no-preview.map";
    if (sha256File(path.join(process.cwd(), "data", mapName)) !== METHOD_V5_EQUIVALENCE_MAP_SHA256) {
        throw new Error("All-country V35 gate map bytes drifted");
    }
    const factory = await loadBaselineFactory(path.join(repoRoot, "packages", "chronodivide-bot"));
    const disabledPolicy = buildMissionNativeCloseoutPolicyV35(false);
    const enabledPolicy = buildMissionNativeCloseoutPolicyV35(true);
    const rows: Array<Record<string, unknown>> = [];
    const coverageRows: MissionNativeCloseoutAllCountryV35CoverageRow[] = [];
    await cdapi.init(path.join(process.cwd(), "data"));
    let index = 0;
    for (const country of MISSION_NATIVE_CLOSEOUT_ALL_COUNTRY_GATE_V35_COUNTRIES) {
        for (const candidateSlot of [0, 1] as const) {
            const requestedEngineSeed = derivePairedEngineSeed(
                MISSION_NATIVE_CLOSEOUT_ALL_COUNTRY_GATE_V35_ENGINE_SEED_BASE,
                index++,
            );
            const direct = await runMissionNativeCloseoutTrace({
                factory, mapName, country, candidateSlot, requestedEngineSeed, policy: null,
            });
            const disabled = await runMissionNativeCloseoutTrace({
                factory, mapName, country, candidateSlot, requestedEngineSeed, policy: disabledPolicy,
            });
            const first = await runMissionNativeCloseoutTrace({
                factory, mapName, country, candidateSlot, requestedEngineSeed, policy: enabledPolicy,
            });
            const repeat = await runMissionNativeCloseoutTrace({
                factory, mapName, country, candidateSlot, requestedEngineSeed, policy: enabledPolicy,
            });
            const directDigest = traceDigest(direct, false);
            const disabledDigest = traceDigest(disabled, false);
            const firstDigest = traceDigest(first, true);
            const repeatDigest = traceDigest(repeat, true);
            const validationErrors: string[] = [];
            if (directDigest !== disabledDigest) validationErrors.push("disabled V35 adapter drifted");
            if (disabled.telemetry.length !== 0) validationErrors.push("disabled V35 adapter emitted telemetry");
            for (const [label, trace] of [["first", first], ["repeat", repeat]] as const) {
                try {
                    validateMissionNativeCloseoutFocusedGateV29Telemetry(trace.telemetry, country, {
                        productionReservation: "forbidden",
                        screenInfrastructure: "required",
                        screenProductionEvidence: "sufficient_before_tank",
                        productionFocus: "required",
                        productionFocusPriority: 10_000,
                        exclusiveProductionFocusScheduler: "required",
                        allowPredecessorExhaustionDuringRecovery: true,
                        allowRepeatedLaunchAfterRecovery: true,
                    });
                } catch (error) {
                    validationErrors.push(`${label}: ${error instanceof Error ? error.message : String(error)}`);
                }
                try {
                    validateMissionNativeCloseoutV35ObjectiveRaceTelemetry(trace.telemetry);
                } catch (error) {
                    validationErrors.push(`${label}: ${error instanceof Error ? error.message : String(error)}`);
                }
                try {
                    validateMissionNativeCloseoutV35ProgressTelemetry(trace.telemetry);
                } catch (error) {
                    validationErrors.push(`${label}: ${error instanceof Error ? error.message : String(error)}`);
                }
            }
            if (firstDigest !== repeatDigest) validationErrors.push("same-seed enabled trace mismatch");
            if (digest(first.actions) === digest(direct.actions)) {
                validationErrors.push("enabled V35 policy did not change commands");
            }
            validationErrors.push(...validateMissionNativeCloseoutV35QuitAudits(
                direct.quitAttempts,
                disabled.quitAttempts,
                first.quitAttempts,
                repeat.quitAttempts,
            ));
            const coverage = summarizeCoverage(
                first.telemetry,
                country,
                candidateSlot,
                validationErrors.length === 0,
            );
            coverageRows.push(coverage);
            rows.push({
                ...coverage,
                requestedEngineSeed,
                directExternalTraceSha256: directDigest,
                disabledAdapterTraceSha256: disabledDigest,
                disabledAdapterEquivalent: directDigest === disabledDigest,
                enabledTraceSha256: firstDigest,
                enabledRepeatTraceSha256: repeatDigest,
                enabledTraceDeterministic: firstDigest === repeatDigest,
                enabledChangedCommands: digest(first.actions) !== digest(direct.actions),
                quitAttempts: {
                    direct: direct.quitAttempts,
                    disabled: disabled.quitAttempts,
                    first: first.quitAttempts,
                    repeat: repeat.quitAttempts,
                },
                candidateSelfSnapshots: first.snapshots,
                telemetry: first.telemetry,
                validationErrors,
                outcomeFree: true,
            });
        }
    }
    const manifest = createExperimentManifest({
        runId: `mission-native-closeout-all-country-gate-v35-r1-${process.env.SLURM_JOB_ID ?? "local"}`,
        mixDir: path.join(process.cwd(), "data"),
        maps: [mapName],
        effectiveConfig: {
            purpose: "outcome-free-mission-native-closeout-all-country-gate-v35-r1",
            gateRevision: MISSION_NATIVE_CLOSEOUT_ALL_COUNTRY_GATE_V35_REVISION,
            schemaVersion: MISSION_NATIVE_CLOSEOUT_ALL_COUNTRY_GATE_V35_SCHEMA_VERSION,
            disabledPolicyId: missionNativeCloseoutPolicyV35Sha256(disabledPolicy),
            enabledPolicyId: missionNativeCloseoutPolicyV35Sha256(enabledPolicy),
            countries: MISSION_NATIVE_CLOSEOUT_ALL_COUNTRY_GATE_V35_COUNTRIES,
            reciprocalSlots: [0, 1],
            runsPerCountrySlot: MISSION_NATIVE_CLOSEOUT_ALL_COUNTRY_GATE_V35_RUNS_PER_COUNTRY_SLOT,
            maxTicks: MISSION_NATIVE_CLOSEOUT_COMPATIBILITY_MAX_TICKS,
            outcomeInspection: false,
        },
        baseline: factory.descriptor,
        gameSeedBase: MISSION_NATIVE_CLOSEOUT_ALL_COUNTRY_GATE_V35_ENGINE_SEED_BASE,
    });
    if (
        manifest.scheduler.account !== "pi_jss233" || manifest.source.gitBranch !== "main" ||
        manifest.source.trackedDirty !== false || manifest.software.baseline.kind !== "external-package" ||
        manifest.software.baseline.trackedDirty !== false || rows.length !== 18
    ) throw new Error("All-country V35 gate provenance or matrix coverage failed");
    const globalValidationErrors = validateMissionNativeCloseoutAllCountryV35Coverage(coverageRows);
    const passed = coverageRows.every((row) => row.passed) && globalValidationErrors.length === 0;
    const output = {
        schemaVersion: MISSION_NATIVE_CLOSEOUT_ALL_COUNTRY_GATE_V35_SCHEMA_VERSION,
        gateRevision: MISSION_NATIVE_CLOSEOUT_ALL_COUNTRY_GATE_V35_REVISION,
        status: passed
            ? "PASS_OUTCOME_FREE_MISSION_NATIVE_CLOSEOUT_ALL_COUNTRY_GATE_V35_R1"
            : "FAIL_OUTCOME_FREE_MISSION_NATIVE_CLOSEOUT_ALL_COUNTRY_GATE_V35_R1",
        generatedAt: new Date().toISOString(),
        passed,
        outcomeFree: true,
        sourceGitCommit: manifest.source.gitCommit,
        scheduler: manifest.scheduler,
        externalBaseline: manifest.software.baseline,
        disabledPolicyId: missionNativeCloseoutPolicyV35Sha256(disabledPolicy),
        enabledPolicyId: missionNativeCloseoutPolicyV35Sha256(enabledPolicy),
        countryCount: MISSION_NATIVE_CLOSEOUT_ALL_COUNTRY_GATE_V35_COUNTRIES.length,
        reciprocalSlotCount: 2,
        gameCount: rows.length * MISSION_NATIVE_CLOSEOUT_ALL_COUNTRY_GATE_V35_RUNS_PER_COUNTRY_SLOT,
        maxTicks: MISSION_NATIVE_CLOSEOUT_COMPATIBILITY_MAX_TICKS,
        globalValidationErrors,
        aggregate: {
            compositionBlockedEvaluationCount: coverageRows.reduce(
                (total, row) => total + row.preterminalCompositionBlockedEvaluationCount, 0,
            ),
            launchedCellCount: coverageRows.filter((row) => row.capabilityLaunchCount === 1).length,
            convertedAfterCompositionBlockCellCount: coverageRows.filter(convertedAfterCompositionBlock).length,
            launchHandoffCount: coverageRows.reduce((total, row) => total + row.launchHandoffCount, 0),
            buildingDamage: coverageRows.reduce((total, row) => total + row.buildingDamage, 0),
            screenInfrastructureEventCount: coverageRows.reduce(
                (total, row) => total + row.screenInfrastructureEventCount, 0,
            ),
            screenInfrastructureRequestedCount: coverageRows.reduce(
                (total, row) => total + row.screenInfrastructureRequestedCount, 0,
            ),
            screenInfrastructureReadyCount: coverageRows.reduce(
                (total, row) => total + row.screenInfrastructureReadyCount, 0,
            ),
            productionFocusEventCount: coverageRows.reduce(
                (total, row) => total + row.productionFocusEventCount, 0,
            ),
            productionFocusActiveCount: coverageRows.reduce(
                (total, row) => total + row.productionFocusActiveCount, 0,
            ),
            exclusiveSchedulerEventCount: coverageRows.reduce(
                (total, row) => total + row.exclusiveSchedulerEventCount, 0,
            ),
            exclusiveSchedulerPausedQueueCount: coverageRows.reduce(
                (total, row) => total + row.exclusiveSchedulerPausedQueueCount, 0,
            ),
            exclusiveSchedulerDeferredQueueCount: coverageRows.reduce(
                (total, row) => total + row.exclusiveSchedulerDeferredQueueCount, 0,
            ),
            exclusiveSchedulerReadyQueueCount: coverageRows.reduce(
                (total, row) => total + row.exclusiveSchedulerReadyQueueCount, 0,
            ),
            objectiveRaceAllocationEventCount: coverageRows.reduce(
                (total, row) => total + row.objectiveRaceAllocationEventCount, 0,
            ),
            boundedBlockerAllocationEventCount: coverageRows.reduce(
                (total, row) => total + row.boundedBlockerAllocationEventCount, 0,
            ),
            terminalPriorityEventCount: coverageRows.reduce(
                (total, row) => total + row.terminalPriorityEventCount, 0,
            ),
            productionReservationEventCount: coverageRows.reduce(
                (total, row) => total + row.productionReservationEventCount, 0,
            ),
            physicalProgressEventCount: coverageRows.reduce(
                (total, row) => total + row.physicalProgressEventCount, 0,
            ),
            buildingPhysicalProgressEventCount: coverageRows.reduce(
                (total, row) => total + row.buildingPhysicalProgressEventCount, 0,
            ),
            blockerPhysicalProgressEventCount: coverageRows.reduce(
                (total, row) => total + row.blockerPhysicalProgressEventCount, 0,
            ),
            fallbackStartedCount: coverageRows.reduce((total, row) => total + row.fallbackStartedCount, 0),
            fallbackActiveCount: coverageRows.reduce((total, row) => total + row.fallbackActiveCount, 0),
            replanStartedCount: coverageRows.reduce((total, row) => total + row.replanStartedCount, 0),
            activePredecessorFallbackEventCount: coverageRows.reduce(
                (total, row) => total + row.activePredecessorFallbackEventCount, 0,
            ),
            overlaySuspensionEventCount: coverageRows.reduce(
                (total, row) => total + row.overlaySuspensionEventCount, 0,
            ),
            terminalCompositionBypassCellCount: coverageRows.filter((row) =>
                row.launchEnemyBuildingCount === 1 && row.launchObjectiveBypassesComposition === true &&
                row.launchCompositionReady === false,
            ).length,
        },
        rows,
    };
    fs.mkdirSync(path.dirname(outFile), { recursive: true, mode: 0o700 });
    fs.writeFileSync(outFile, JSON.stringify(output, null, 2) + "\n", { flag: "wx", mode: 0o600 });
    console.log(JSON.stringify({
        outFile,
        sha256: sha256File(outFile),
        status: output.status,
        gameCount: output.gameCount,
        aggregate: output.aggregate,
        globalValidationErrors,
        rows: coverageRows,
    }));
    if (!passed) throw new Error("All-country V35 gate failed; preserved outcome-free artifact");
};

const invoked = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (import.meta.url === invoked) main().catch((error) => { console.error(error); process.exitCode = 1; });
