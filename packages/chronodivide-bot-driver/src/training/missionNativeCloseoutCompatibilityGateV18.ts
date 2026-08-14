import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { cdapi, SideType } from "@chronodivide/game-api";
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
import {
    summarizeMissionNativeCloseoutExecution,
    validateMissionNativeCloseoutExecutionTelemetry,
} from "./missionNativeCloseoutExecutionDiagnostic.js";
import {
    buildMissionNativeCloseoutPolicyV18,
    missionNativeCloseoutPolicyV18Sha256,
} from "./missionNativeCloseoutPolicyV18.js";

export const MISSION_NATIVE_CLOSEOUT_COMPATIBILITY_V18_SCHEMA_VERSION = 1 as const;
export const MISSION_NATIVE_CLOSEOUT_COMPATIBILITY_V18_ENGINE_SEED_BASE = 4_140_000_000 as const;
export const MISSION_NATIVE_CLOSEOUT_COMPATIBILITY_V18_RUNS_PER_COUNTRY_SLOT = 4 as const;

type Activation = Extract<BuildingEliminationTelemetryEvent, { event: "activated" }>;
type ActivationBlocked = Extract<BuildingEliminationTelemetryEvent, { event: "activation_blocked" }>;
type TargetOrder = Extract<BuildingEliminationTelemetryEvent, { event: "target_orders" }>;
type Decision = Extract<BuildingEliminationTelemetryEvent, { event: "engagement_decision" }>;
type Allocation = Extract<BuildingEliminationTelemetryEvent, { event: "engagement_allocation" }>;
type Heartbeat = Extract<BuildingEliminationTelemetryEvent, { event: "execution_heartbeat" }>;
type Progress = Extract<BuildingEliminationTelemetryEvent, { event: "target_progress" }>;
type ReadinessReserve = Extract<BuildingEliminationTelemetryEvent, { event: "readiness_reserve" }>;
type ActivationEvaluation = Extract<BuildingEliminationTelemetryEvent, { event: "activation_evaluation" }>;
type LaunchHandoff = Extract<BuildingEliminationTelemetryEvent, { event: "launch_handoff" }>;
type AssaultProduction = Extract<BuildingEliminationTelemetryEvent, { event: "assault_production" }>;
type AssaultInfrastructure = Extract<BuildingEliminationTelemetryEvent, { event: "assault_infrastructure" }>;

const requiredPath = (name: string): string => {
    const value = process.env[name];
    if (!value) throw new Error(`${name} is required`);
    return path.resolve(value);
};

const digest = (value: unknown): string => createHash("sha256")
    .update(JSON.stringify(value))
    .digest("hex");

const traceDigest = (trace: MissionNativeCloseoutRunTrace, includeTelemetry: boolean): string => digest({
    actions: trace.actions,
    snapshots: trace.snapshots,
    ...(includeTelemetry ? { telemetry: trace.telemetry } : {}),
});

const eventsOf = <T extends BuildingEliminationTelemetryEvent["event"]>(
    telemetry: readonly BuildingEliminationTelemetryEvent[],
    event: T,
): Array<Extract<BuildingEliminationTelemetryEvent, { event: T }>> => telemetry.filter(
    (value): value is Extract<BuildingEliminationTelemetryEvent, { event: T }> => value.event === event,
);

export const summarizeMissionNativeCloseoutV18 = (
    telemetry: readonly BuildingEliminationTelemetryEvent[],
): Record<string, unknown> => {
    const counts: Record<string, number> = {};
    for (const { event } of telemetry) counts[event] = (counts[event] ?? 0) + 1;
    const decisions = eventsOf(telemetry, "engagement_decision");
    const allocations = eventsOf(telemetry, "engagement_allocation");
    const heartbeats = eventsOf(telemetry, "execution_heartbeat");
    const progress = eventsOf(telemetry, "target_progress");
    const activations = eventsOf(telemetry, "activated");
    const readinessBlocks = eventsOf(telemetry, "activation_blocked")
        .filter(({ reason }) => reason === "no_viable_vanguard_route_clearance");
    const targetOrders = eventsOf(telemetry, "target_orders");
    const readinessReserve = eventsOf(telemetry, "readiness_reserve");
    const activationEvaluations = eventsOf(telemetry, "activation_evaluation");
    const launchHandoffs = eventsOf(telemetry, "launch_handoff");
    const assaultProduction = eventsOf(telemetry, "assault_production");
    const assaultInfrastructure = eventsOf(telemetry, "assault_infrastructure");
    const maximumStagedCombatants = readinessReserve.reduce(
        (maximum, event) => Math.max(maximum, event.stagedCombatants),
        0,
    );
    const persistentBlockerHeartbeats = heartbeats.slice(1).filter((heartbeat, index) => {
        const previous = heartbeats[index];
        return heartbeat.targetId === previous.targetId && heartbeat.blockerId !== null &&
            heartbeat.blockerId === previous.blockerId;
    }).length;
    const blockerSwitches = heartbeats.slice(1).filter((heartbeat, index) => {
        const previous = heartbeats[index];
        return heartbeat.targetId === previous.targetId && heartbeat.blockerId !== null &&
            previous.blockerId !== null && heartbeat.blockerId !== previous.blockerId;
    }).length;
    const blockerToBuildingTransitions = heartbeats.slice(1).filter((heartbeat, index) => {
        const previous = heartbeats[index];
        return heartbeat.targetId === previous.targetId && previous.blockerId !== null &&
            heartbeat.blockerId === null;
    }).length;
    return {
        eventCounts: counts,
        buildingDamage: progress.reduce((sum, event) => sum + Math.max(0, event.damage), 0),
        buildingDamageEvents: progress.filter(({ damage }) => damage > 0).length,
        blockerDecisionCount: decisions.filter(({ phase }) => phase === "blocker_clear").length,
        buildingDecisionCount: decisions.filter(({ phase }) => phase === "building_strike").length,
        objectiveAdvanceDecisionCount: decisions.filter(({ reason }) => reason === "objective_advance").length,
        contactClearDecisionCount: decisions.filter((event) =>
            event.reason === "route_interception_wins" && event.earliestRouteThreatInterceptTicks === 0,
        ).length,
        objectiveDirectedHeartbeatCount: heartbeats.filter(({ buildingAttackerCount }) =>
            buildingAttackerCount > 0,
        ).length,
        inRangeHeartbeatCount: heartbeats.filter(({ inRangeBuildingAttackerCount }) =>
            inRangeBuildingAttackerCount > 0,
        ).length,
        pureBlockerAllocationCount: allocations.filter(({ blockerAttackerCount, buildingAttackerCount }) =>
            blockerAttackerCount > 0 && buildingAttackerCount === 0,
        ).length,
        mixedBlockerAllocationCount: allocations.filter(({ blockerAttackerCount, buildingAttackerCount }) =>
            blockerAttackerCount > 0 && buildingAttackerCount > 0,
        ).length,
        pureBuildingAllocationCount: allocations.filter(({ blockerAttackerCount, buildingAttackerCount }) =>
            blockerAttackerCount === 0 && buildingAttackerCount > 0,
        ).length,
        blockerIds: [...new Set(heartbeats.flatMap(({ blockerId }) => blockerId === null ? [] : [blockerId]))]
            .sort((left, right) => left - right),
        persistentBlockerHeartbeats,
        blockerSwitches,
        blockerToBuildingTransitions,
        readinessBlockedCount: readinessBlocks.length,
        firstActivationTick: activations[0]?.tick ?? null,
        firstTargetOrderTick: targetOrders[0]?.tick ?? null,
        readinessReserveCreatedCount: readinessReserve.filter(({ phase }) => phase === "created").length,
        readinessReserveReleasedCount: readinessReserve.filter(({ phase }) => phase === "released").length,
        readinessReservePositiveGrowth: maximumStagedCombatants > 0 ? 1 : 0,
        readinessReserveVanguardPreserved: readinessReserve.some(({ phase, vanguardCombatants }) =>
            phase === "created" && vanguardCombatants > 0,
        ) ? 1 : 0,
        maximumStagedCombatants,
        assaultProductionRequestCount: assaultProduction.filter(({ requested }) => requested).length,
        assaultProductionUnitNames: [...new Set(assaultProduction.map(({ unitName }) => unitName))].sort(),
        assaultInfrastructureRequestCount: assaultInfrastructure.filter(({ requested }) => requested).length,
        assaultInfrastructureAvailableCount: assaultInfrastructure.filter(({ available }) => available).length,
        assaultInfrastructureNames: [...new Set(assaultInfrastructure.map(({ structureName }) => structureName))]
            .sort(),
        maximumAssaultInfrastructureCount: assaultInfrastructure.reduce(
            (maximum, event) => Math.max(maximum, event.currentCount),
            0,
        ),
        maximumAssaultTankCount: activationEvaluations.reduce((maximum, event) => Math.max(
            maximum,
            Number("assaultTankCount" in event ? event.assaultTankCount : 0),
        ), 0),
        buildingReadyEvaluationCount: activationEvaluations.filter(({ phase }) => phase === "building_ready").length,
        blockerReadyEvaluationCount: activationEvaluations.filter(({ phase }) => phase === "blocker_ready").length,
        blockedEvaluationCount: activationEvaluations.filter(({ phase }) => phase === "blocked").length,
        stagingShortfallEvaluationCount: activationEvaluations.filter((event) =>
            Number(event.transferCertifiedAttackerCount ?? event.compatibleAttackerCount) >
                Number(event.stagedCompatibleAttackerCount ?? event.compatibleAttackerCount),
        ).length,
        maximumStagingShortfall: activationEvaluations.reduce((maximum, event) => Math.max(
            maximum,
            Number(event.transferCertifiedAttackerCount ?? event.compatibleAttackerCount) -
                Number(event.stagedCompatibleAttackerCount ?? event.compatibleAttackerCount),
        ), 0),
        launchHandoffCount: launchHandoffs.length,
        launchHandoffExpectedUnitCount: launchHandoffs.reduce(
            (sum, event) => sum + event.expectedStagedUnitIds.length,
            0,
        ),
        launchHandoffAssignedUnitCount: launchHandoffs.reduce(
            (sum, event) => sum + event.assignedExpectedUnitIds.length,
            0,
        ),
        launchHandoffDestroyedUnitCount: launchHandoffs.reduce(
            (sum, event) => sum + event.destroyedExpectedUnitIds.length,
            0,
        ),
        launchHandoffAliveUnassignedUnitCount: launchHandoffs.reduce(
            (sum, event) => sum + event.aliveUnassignedExpectedUnitIds.length,
            0,
        ),
        activationEvaluations: activationEvaluations.map((event) => ({ ...event })),
        execution: summarizeMissionNativeCloseoutExecution(telemetry),
    };
};

export const validateMissionNativeCloseoutV18Exposure = (
    telemetry: readonly BuildingEliminationTelemetryEvent[],
    country: Countries,
    slot: 0 | 1,
): void => {
    validateMissionNativeCloseoutExecutionTelemetry(
        telemetry,
        country,
        slot,
        { engagementAllocationMode: "allBlocker" },
    );
    const activations = eventsOf(telemetry, "activated") as Activation[];
    if (
        activations.length !== 1 || activations[0].tick < 2_700 ||
        activations[0].reservedCombatants !== 0
    ) throw new Error(`V18 activation contract drifted for ${country} slot ${slot}`);
    const evaluations = eventsOf(telemetry, "activation_evaluation") as ActivationEvaluation[];
    const activationIndex = telemetry.findIndex(({ event }) => event === "activated");
    const passingEvaluationIndex = telemetry.findIndex((event) =>
        event.event === "activation_evaluation" && event.tick === activations[0].tick &&
        (event.phase === "building_ready" || event.phase === "blocker_ready"),
    );
    if (passingEvaluationIndex < 0 || passingEvaluationIndex > activationIndex) {
        throw new Error(`V18 activation lacked a preceding certificate for ${country} slot ${slot}`);
    }
    for (const evaluation of evaluations) {
        const totalCompatibleAttackerCount = evaluation.totalCompatibleAttackerCount;
        const transferCertifiedAttackerCount = evaluation.transferCertifiedAttackerCount;
        const stagedCompatibleAttackerCount = evaluation.stagedCompatibleAttackerCount;
        const vanguardCompatibleAttackerCount = "vanguardCompatibleAttackerCount" in evaluation
            ? evaluation.vanguardCompatibleAttackerCount
            : undefined;
        const assaultTankCount = "assaultTankCount" in evaluation ? evaluation.assaultTankCount : undefined;
        if (
            evaluation.phase === "blocker_ready" &&
            (evaluation.blockerId === null || evaluation.routeThreatCount <= 0 ||
                evaluation.estimatedForceSurvivalTicks === null ||
                evaluation.estimatedRouteClearanceTicks === null ||
                evaluation.estimatedRouteClearanceTicks > evaluation.estimatedForceSurvivalTicks)
        ) throw new Error(`V18 blocker-readiness certificate drifted for ${country} slot ${slot}`);
        if (
            evaluation.phase === "building_ready" && evaluation.blockerId !== null
        ) throw new Error(`V18 building-readiness certificate drifted for ${country} slot ${slot}`);
        if (
            evaluation.schemaVersion !== 12 ||
            typeof totalCompatibleAttackerCount !== "number" ||
            typeof transferCertifiedAttackerCount !== "number" ||
            typeof stagedCompatibleAttackerCount !== "number" ||
            typeof vanguardCompatibleAttackerCount !== "number" ||
            typeof assaultTankCount !== "number" ||
            !Number.isInteger(totalCompatibleAttackerCount) ||
            !Number.isInteger(transferCertifiedAttackerCount) ||
            !Number.isInteger(stagedCompatibleAttackerCount) ||
            !Number.isInteger(vanguardCompatibleAttackerCount) ||
            !Number.isInteger(assaultTankCount) ||
            totalCompatibleAttackerCount < 0 ||
            transferCertifiedAttackerCount < 0 ||
            stagedCompatibleAttackerCount < 0 ||
            vanguardCompatibleAttackerCount < 0 ||
            assaultTankCount < 0 ||
            transferCertifiedAttackerCount > totalCompatibleAttackerCount ||
            stagedCompatibleAttackerCount > totalCompatibleAttackerCount ||
            vanguardCompatibleAttackerCount + stagedCompatibleAttackerCount !==
                transferCertifiedAttackerCount ||
            assaultTankCount > transferCertifiedAttackerCount ||
            evaluation.compatibleAttackerCount !== transferCertifiedAttackerCount ||
            evaluation.compatibleAttackerCount !==
                vanguardCompatibleAttackerCount + stagedCompatibleAttackerCount
        ) throw new Error(`V18 staging certificate drifted for ${country} slot ${slot}`);
    }
    const activationBlocks = eventsOf(telemetry, "activation_blocked") as ActivationBlocked[];
    if (activationBlocks.some(({ reason, tick }) =>
        (reason !== "no_viable_vanguard_route_clearance" && reason !== "insufficient_own_combatants") ||
        tick > activations[0].tick)) {
        throw new Error(`V18 emitted an unfrozen activation block for ${country} slot ${slot}`);
    }
    const reserveEvents = eventsOf(telemetry, "readiness_reserve") as ReadinessReserve[];
    const created = reserveEvents.filter(({ phase }) => phase === "created");
    const released = reserveEvents.filter(({ phase }) => phase === "released");
    if (reserveEvents.length > 0 && (
        created.length !== 1 || released.length !== 1 ||
        created[0].vanguardCombatants <= 0 || released[0].stagedCombatants <= 0 ||
        !reserveEvents.some(({ phase, stagedCombatants }) => phase === "accumulating" && stagedCombatants > 0) ||
        released.some(({ tick }) => tick > activations[0].tick)
    )) throw new Error(`V18 staging lifecycle drifted for ${country} slot ${slot}`);
    if (activationBlocks.some(({ reason }) => reason === "no_viable_vanguard_route_clearance") &&
        reserveEvents.length === 0) {
        throw new Error(`V18 blocked without continuous-vanguard staging for ${country} slot ${slot}`);
    }
    const assaultProduction = eventsOf(telemetry, "assault_production") as AssaultProduction[];
    if (assaultProduction.some((event) =>
        event.targetCount !== 4 || event.currentCount < 0 ||
        (event.side === SideType.Nod && event.unitName !== "HTNK") ||
        (event.side === SideType.GDI && event.unitName !== "MTNK") ||
        event.requested !== (event.currentCount < event.targetCount)
    )) throw new Error(`V18 assault production drifted for ${country} slot ${slot}`);
    const assaultInfrastructure = eventsOf(telemetry, "assault_infrastructure") as AssaultInfrastructure[];
    if (assaultInfrastructure.some((event) =>
        event.currentCount < 0 ||
        (event.side === SideType.Nod && event.structureName !== "NAWEAP") ||
        (event.side === SideType.GDI && event.structureName !== "GAWEAP") ||
        (event.requested && (!event.available || event.currentCount !== 0))
    )) throw new Error(`V18 assault infrastructure drifted for ${country} slot ${slot}`);
    const orders = eventsOf(telemetry, "target_orders") as TargetOrder[];
    if (
        orders.length === 0 || orders.some(({ attackerCount, targets }) =>
            attackerCount <= 0 || targets.length !== 1)
    ) throw new Error(`V18 target focus drifted for ${country} slot ${slot}`);
    if (orders.some(({ tick }) => tick < activations[0].tick)) {
        throw new Error(`V18 issued closeout orders before takeover for ${country} slot ${slot}`);
    }
    const handoffs = eventsOf(telemetry, "launch_handoff") as LaunchHandoff[];
    if (handoffs.length !== 1) throw new Error(`V18 launch handoff count drifted for ${country} slot ${slot}`);
    const handoff = handoffs[0];
    const partition = [
        ...handoff.assignedExpectedUnitIds,
        ...handoff.destroyedExpectedUnitIds,
        ...handoff.aliveUnassignedExpectedUnitIds,
    ].sort((left, right) => left - right);
    if (
        handoff.expectedStagedUnitIds.length === 0 ||
        new Set(handoff.expectedStagedUnitIds).size !== handoff.expectedStagedUnitIds.length ||
        JSON.stringify(partition) !== JSON.stringify(handoff.expectedStagedUnitIds) ||
        handoff.aliveUnassignedExpectedUnitIds.length !== 0 ||
        handoff.tick > orders[0].tick
    ) throw new Error(`V18 launch handoff did not reconcile for ${country} slot ${slot}`);
    const decisions = eventsOf(telemetry, "engagement_decision") as Decision[];
    const allocations = eventsOf(telemetry, "engagement_allocation") as Allocation[];
    if (decisions.length === 0 || allocations.length === 0) {
        throw new Error(`V18 engagement was not exposed for ${country} slot ${slot}`);
    }
    for (const decision of decisions) {
        if (decision.reason === "route_interception_wins") {
            if (
                decision.phase !== "blocker_clear" || decision.blockerId === null ||
                decision.routeThreatCount <= 0 || decision.estimatedBuildingCompletionTicks === null ||
                decision.estimatedForceSurvivalTicks === null ||
                decision.estimatedBuildingCompletionTicks <= decision.estimatedForceSurvivalTicks
            ) throw new Error(`V18 blocker certificate drifted for ${country} slot ${slot}`);
        } else if (
            decision.reason === "objective_advance" ||
            decision.phase === "blocker_clear" || decision.blockerId !== null ||
            (decision.reason === "building_completion_race" &&
                (decision.estimatedBuildingCompletionTicks === null ||
                    decision.estimatedForceSurvivalTicks === null ||
                    decision.estimatedBuildingCompletionTicks > decision.estimatedForceSurvivalTicks))
        ) throw new Error(`V18 building certificate drifted for ${country} slot ${slot}`);
    }
    for (const allocation of allocations) {
        if (
            allocation.assignedAttackerCount <= 0 || allocation.buildingAttackerCount < 0 ||
            allocation.blockerAttackerCount < 0 ||
            allocation.buildingAttackerCount + allocation.blockerAttackerCount !==
                allocation.assignedAttackerCount ||
            allocation.inRangeBuildingAttackerCount < 0 ||
            allocation.inRangeBuildingAttackerCount > allocation.buildingAttackerCount ||
            (allocation.blockerId === null && allocation.blockerAttackerCount !== 0) ||
            (allocation.blockerId !== null && allocation.blockerAttackerCount <= 0)
        ) throw new Error(`V18 phase allocation drifted for ${country} slot ${slot}`);
    }
    const heartbeats = eventsOf(telemetry, "execution_heartbeat") as Heartbeat[];
    if (!heartbeats.some(({ buildingAttackerCount }) => buildingAttackerCount > 0)) {
        throw new Error(`V18 never advanced the building objective for ${country} slot ${slot}`);
    }
    const progress = eventsOf(telemetry, "target_progress") as Progress[];
    if (!progress.some(({ damage }) => damage > 0)) {
        throw new Error(`V18 caused no physical building damage for ${country} slot ${slot}`);
    }
    if (telemetry.some(({ event }) => event === "sweep_orders" || event === "capability_production")) {
        throw new Error(`Unfrozen V18 mechanism executed for ${country} slot ${slot}`);
    }
    if (telemetry.some(({ tick }) => !Number.isSafeInteger(tick) || tick < 0)) {
        throw new Error(`V18 telemetry tick drifted for ${country} slot ${slot}`);
    }
};

const main = async (): Promise<void> => {
    const repoRoot = path.resolve(process.cwd(), "..", "..");
    const outFile = requiredPath("OUT_FILE");
    if (fs.existsSync(outFile)) throw new Error(`Refusing to overwrite ${outFile}`);
    if (!process.env.BASELINE_PACKAGE_ROOT || process.env.REQUIRE_EXTERNAL_BASELINE !== "true") {
        throw new Error("Mission-native V18 compatibility requires the pinned external baseline");
    }
    const mapName = "simple-1v1-no-preview.map";
    if (sha256File(path.join(process.cwd(), "data", mapName)) !== METHOD_V5_EQUIVALENCE_MAP_SHA256) {
        throw new Error("Mission-native V18 compatibility map bytes drifted");
    }
    const factory = await loadBaselineFactory(path.join(repoRoot, "packages", "chronodivide-bot"));
    const disabledPolicy = buildMissionNativeCloseoutPolicyV18(false);
    const enabledPolicy = buildMissionNativeCloseoutPolicyV18(true);
    const rows: Array<Record<string, unknown>> = [];
    await cdapi.init(path.join(process.cwd(), "data"));
    let index = 0;
    for (const country of Object.values(Countries)) for (const candidateSlot of [0, 1] as const) {
        const requestedEngineSeed = derivePairedEngineSeed(
            MISSION_NATIVE_CLOSEOUT_COMPATIBILITY_V18_ENGINE_SEED_BASE,
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
        if (directDigest !== disabledDigest) {
            validationErrors.push(`Disabled V18 adapter drifted for ${country} slot ${candidateSlot}`);
        }
        if (disabled.telemetry.length !== 0) {
            validationErrors.push(`Disabled V18 adapter emitted telemetry for ${country} slot ${candidateSlot}`);
        }
        for (const [label, trace] of [["first", first], ["repeat", repeat]] as const) {
            try {
                validateMissionNativeCloseoutV18Exposure(trace.telemetry, country, candidateSlot);
            } catch (error) {
                validationErrors.push(`${label}: ${error instanceof Error ? error.message : String(error)}`);
            }
            if (trace.quitAttempts.candidate !== 0 || trace.quitAttempts.baseline !== 0) {
                validationErrors.push(`${label}: resignation attempt for ${country} slot ${candidateSlot}`);
            }
        }
        if (firstDigest !== repeatDigest) {
            validationErrors.push(`V18 trace was not deterministic for ${country} slot ${candidateSlot}`);
        }
        if (digest(first.actions) === digest(direct.actions)) {
            validationErrors.push(`V18 did not change commands for ${country} slot ${candidateSlot}`);
        }
        rows.push({
            country,
            candidateSlot,
            requestedEngineSeed,
            directExternalTraceSha256: directDigest,
            disabledAdapterTraceSha256: disabledDigest,
            disabledAdapterEquivalent: directDigest === disabledDigest,
            enabledTraceSha256: firstDigest,
            enabledTraceDeterministic: firstDigest === repeatDigest,
            enabledChangedCommands: digest(first.actions) !== digest(direct.actions),
            summary: summarizeMissionNativeCloseoutV18(first.telemetry),
            repeatSummary: summarizeMissionNativeCloseoutV18(repeat.telemetry),
            quitAttempts: {
                direct: direct.quitAttempts,
                disabled: disabled.quitAttempts,
                first: first.quitAttempts,
                repeat: repeat.quitAttempts,
            },
            validationErrors,
            passed: validationErrors.length === 0,
            outcomeFree: true,
        });
    }
    const manifest = createExperimentManifest({
        runId: `mission-native-closeout-compatibility-v18-${process.env.SLURM_JOB_ID ?? "local"}`,
        mixDir: path.join(process.cwd(), "data"),
        maps: [mapName],
        effectiveConfig: {
            purpose: "outcome-free-mission-native-continuous-vanguard-combined-arms-closeout-v18",
            gateSchemaVersion: MISSION_NATIVE_CLOSEOUT_COMPATIBILITY_V18_SCHEMA_VERSION,
            disabledPolicyId: missionNativeCloseoutPolicyV18Sha256(disabledPolicy),
            enabledPolicyId: missionNativeCloseoutPolicyV18Sha256(enabledPolicy),
            countries: Object.values(Countries),
            reciprocalSlots: [0, 1],
            runsPerCountrySlot: MISSION_NATIVE_CLOSEOUT_COMPATIBILITY_V18_RUNS_PER_COUNTRY_SLOT,
            maxTicks: MISSION_NATIVE_CLOSEOUT_COMPATIBILITY_MAX_TICKS,
            outcomeInspection: false,
        },
        baseline: factory.descriptor,
        gameSeedBase: MISSION_NATIVE_CLOSEOUT_COMPATIBILITY_V18_ENGINE_SEED_BASE,
    });
    if (
        manifest.scheduler.account !== "pi_jss233" || manifest.source.gitBranch !== "main" ||
        manifest.source.trackedDirty !== false || manifest.software.baseline.kind !== "external-package" ||
        manifest.software.baseline.trackedDirty !== false || rows.length !== 18
    ) throw new Error("Mission-native V18 compatibility provenance or coverage failed");
    const globalValidationErrors: string[] = [];
    const summaries = rows.map((row) => row.summary as Record<string, unknown>);
    const totals = (key: string): number => summaries.reduce(
        (sum, summary) => sum + Number(summary[key] ?? 0),
        0,
    );
    const reinforcementTargetNames = [...new Set(summaries.flatMap((summary) => {
        const execution = summary.execution as { targetNames?: unknown } | undefined;
        const targetNames = execution?.targetNames;
        return Array.isArray(targetNames)
            ? targetNames.filter((name): name is string => typeof name === "string")
            : [];
    }))].sort();
    const assaultProductionUnitNames = [...new Set(summaries.flatMap((summary) => {
        const names = summary.assaultProductionUnitNames;
        return Array.isArray(names)
            ? names.filter((name): name is string => typeof name === "string")
            : [];
    }))].sort();
    const assaultInfrastructureNames = [...new Set(summaries.flatMap((summary) => {
        const names = summary.assaultInfrastructureNames;
        return Array.isArray(names)
            ? names.filter((name): name is string => typeof name === "string")
            : [];
    }))].sort();
    if (totals("pureBlockerAllocationCount") <= 0) {
        globalValidationErrors.push("V18 never exposed a phase-pure blocker allocation");
    }
    if (totals("pureBuildingAllocationCount") <= 0) {
        globalValidationErrors.push("V18 never exposed a phase-pure building allocation");
    }
    if (totals("persistentBlockerHeartbeats") <= 0) {
        globalValidationErrors.push("V18 never preserved a blocker across consecutive heartbeats");
    }
    if (totals("readinessBlockedCount") <= 0) {
        globalValidationErrors.push("V18 never exposed a readiness-blocked takeover event");
    }
    if (totals("readinessReserveCreatedCount") <= 0) {
        globalValidationErrors.push("V18 never created a staging mission");
    }
    if (totals("readinessReserveReleasedCount") <= 0) {
        globalValidationErrors.push("V18 never released staging before takeover");
    }
    if (totals("readinessReservePositiveGrowth") <= 0) {
        globalValidationErrors.push("V18 never accumulated a positive staged force");
    }
    if (totals("readinessReserveVanguardPreserved") <= 0) {
        globalValidationErrors.push("V18 never preserved a live predecessor vanguard");
    }
    if (totals("assaultProductionRequestCount") <= 0) {
        globalValidationErrors.push("V18 never requested a main battle tank");
    }
    if (!assaultProductionUnitNames.includes("MTNK") || !assaultProductionUnitNames.includes("HTNK")) {
        globalValidationErrors.push("V18 did not expose both Allied and Soviet assault production");
    }
    if (totals("assaultInfrastructureRequestCount") <= 0) {
        globalValidationErrors.push("V18 never requested assault infrastructure");
    }
    if (!assaultInfrastructureNames.includes("GAWEAP") || !assaultInfrastructureNames.includes("NAWEAP")) {
        globalValidationErrors.push("V18 did not expose both Allied and Soviet assault infrastructure");
    }
    const alliedCountries = new Set(["Americans", "Alliance", "French", "Germans", "British"]);
    const alliedMaximumAssaultTankCount = Math.max(...rows.filter((row) =>
        alliedCountries.has(String(row.country)),
    ).map((row) => Number((row.summary as Record<string, unknown>).maximumAssaultTankCount ?? 0)));
    const sovietMaximumAssaultTankCount = Math.max(...rows.filter((row) =>
        !alliedCountries.has(String(row.country)),
    ).map((row) => Number((row.summary as Record<string, unknown>).maximumAssaultTankCount ?? 0)));
    if (alliedMaximumAssaultTankCount <= 0 || sovietMaximumAssaultTankCount <= 0) {
        globalValidationErrors.push("V18 did not acquire certified Allied and Soviet assault tanks");
    }
    const alliedMaximumAssaultInfrastructureCount = Math.max(...rows.filter((row) =>
        alliedCountries.has(String(row.country)),
    ).map((row) => Number(
        (row.summary as Record<string, unknown>).maximumAssaultInfrastructureCount ?? 0,
    )));
    const sovietMaximumAssaultInfrastructureCount = Math.max(...rows.filter((row) =>
        !alliedCountries.has(String(row.country)),
    ).map((row) => Number(
        (row.summary as Record<string, unknown>).maximumAssaultInfrastructureCount ?? 0,
    )));
    if (alliedMaximumAssaultInfrastructureCount <= 0 || sovietMaximumAssaultInfrastructureCount <= 0) {
        globalValidationErrors.push("V18 did not acquire visible Allied and Soviet assault infrastructure");
    }
    if (totals("blockerReadyEvaluationCount") <= 0) {
        globalValidationErrors.push("V18 never activated through certified complete-route clearance");
    }
    if (totals("stagingShortfallEvaluationCount") <= 0) {
        globalValidationErrors.push("V18 never exposed a staging-ownership shortfall");
    }
    if (!reinforcementTargetNames.some((name) => name === "GAPILE" || name === "GAWEAP")) {
        globalValidationErrors.push("V18 never selected an Allied reinforcement source");
    }
    if (!reinforcementTargetNames.some((name) => name === "NAHAND" || name === "NAWEAP")) {
        globalValidationErrors.push("V18 never selected a Soviet reinforcement source");
    }
    const passed = rows.every((row) => row.passed === true) && globalValidationErrors.length === 0;
    const output = {
        schemaVersion: MISSION_NATIVE_CLOSEOUT_COMPATIBILITY_V18_SCHEMA_VERSION,
        status: passed
            ? "PASS_OUTCOME_FREE_MISSION_NATIVE_CLOSEOUT_COMPATIBILITY_V18"
            : "FAIL_OUTCOME_FREE_MISSION_NATIVE_CLOSEOUT_COMPATIBILITY_V18",
        generatedAt: new Date().toISOString(),
        passed,
        outcomeFree: true,
        sourceGitCommit: manifest.source.gitCommit,
        scheduler: manifest.scheduler,
        externalBaseline: manifest.software.baseline,
        disabledPolicyId: missionNativeCloseoutPolicyV18Sha256(disabledPolicy),
        enabledPolicyId: missionNativeCloseoutPolicyV18Sha256(enabledPolicy),
        countryCount: Object.values(Countries).length,
        reciprocalSlotCount: 2,
        gameCount: rows.length * MISSION_NATIVE_CLOSEOUT_COMPATIBILITY_V18_RUNS_PER_COUNTRY_SLOT,
        maxTicks: MISSION_NATIVE_CLOSEOUT_COMPATIBILITY_MAX_TICKS,
        aggregate: {
            buildingDamage: totals("buildingDamage"),
            pureBlockerAllocationCount: totals("pureBlockerAllocationCount"),
            mixedBlockerAllocationCount: totals("mixedBlockerAllocationCount"),
            pureBuildingAllocationCount: totals("pureBuildingAllocationCount"),
            persistentBlockerHeartbeats: totals("persistentBlockerHeartbeats"),
            blockerSwitches: totals("blockerSwitches"),
            blockerToBuildingTransitions: totals("blockerToBuildingTransitions"),
            objectiveAdvanceDecisionCount: totals("objectiveAdvanceDecisionCount"),
            contactClearDecisionCount: totals("contactClearDecisionCount"),
            objectiveDirectedHeartbeatCount: totals("objectiveDirectedHeartbeatCount"),
            inRangeHeartbeatCount: totals("inRangeHeartbeatCount"),
            readinessBlockedCount: totals("readinessBlockedCount"),
            readinessReserveCreatedCount: totals("readinessReserveCreatedCount"),
            readinessReserveReleasedCount: totals("readinessReserveReleasedCount"),
            readinessReservePositiveGrowthCellCount: totals("readinessReservePositiveGrowth"),
            readinessReserveVanguardPreservedCellCount: totals("readinessReserveVanguardPreserved"),
            assaultProductionRequestCount: totals("assaultProductionRequestCount"),
            assaultProductionUnitNames,
            assaultInfrastructureRequestCount: totals("assaultInfrastructureRequestCount"),
            assaultInfrastructureAvailableCount: totals("assaultInfrastructureAvailableCount"),
            assaultInfrastructureNames,
            alliedMaximumAssaultInfrastructureCount,
            sovietMaximumAssaultInfrastructureCount,
            maximumAssaultInfrastructureCount: Math.max(...summaries.map((summary) =>
                Number(summary.maximumAssaultInfrastructureCount ?? 0),
            )),
            alliedMaximumAssaultTankCount,
            sovietMaximumAssaultTankCount,
            maximumAssaultTankCount: Math.max(...summaries.map((summary) =>
                Number(summary.maximumAssaultTankCount ?? 0),
            )),
            maximumStagedCombatants: Math.max(...summaries.map((summary) =>
                Number(summary.maximumStagedCombatants ?? 0),
            )),
            buildingReadyEvaluationCount: totals("buildingReadyEvaluationCount"),
            blockerReadyEvaluationCount: totals("blockerReadyEvaluationCount"),
            blockedEvaluationCount: totals("blockedEvaluationCount"),
            stagingShortfallEvaluationCount: totals("stagingShortfallEvaluationCount"),
            maximumStagingShortfall: Math.max(...summaries.map((summary) =>
                Number(summary.maximumStagingShortfall ?? 0),
            )),
            launchHandoffCount: totals("launchHandoffCount"),
            launchHandoffExpectedUnitCount: totals("launchHandoffExpectedUnitCount"),
            launchHandoffAssignedUnitCount: totals("launchHandoffAssignedUnitCount"),
            launchHandoffDestroyedUnitCount: totals("launchHandoffDestroyedUnitCount"),
            launchHandoffAliveUnassignedUnitCount: totals("launchHandoffAliveUnassignedUnitCount"),
            reinforcementTargetNames,
        },
        globalValidationErrors,
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
    }));
    if (!passed) throw new Error("Mission-native compatibility-v18 failed; preserved outcome-free artifact");
};

const invoked = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (import.meta.url === invoked) main().catch((error) => { console.error(error); process.exitCode = 1; });
