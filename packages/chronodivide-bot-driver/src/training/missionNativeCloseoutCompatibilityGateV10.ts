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
import {
    summarizeMissionNativeCloseoutExecution,
    validateMissionNativeCloseoutExecutionTelemetry,
} from "./missionNativeCloseoutExecutionDiagnostic.js";
import {
    buildMissionNativeCloseoutPolicyV10,
    missionNativeCloseoutPolicyV10Sha256,
} from "./missionNativeCloseoutPolicyV10.js";

export const MISSION_NATIVE_CLOSEOUT_COMPATIBILITY_V10_SCHEMA_VERSION = 1 as const;
export const MISSION_NATIVE_CLOSEOUT_COMPATIBILITY_V10_ENGINE_SEED_BASE = 4_060_000_000 as const;
export const MISSION_NATIVE_CLOSEOUT_COMPATIBILITY_V10_RUNS_PER_COUNTRY_SLOT = 4 as const;

type Activation = Extract<BuildingEliminationTelemetryEvent, { event: "activated" }>;
type ActivationBlocked = Extract<BuildingEliminationTelemetryEvent, { event: "activation_blocked" }>;
type TargetOrder = Extract<BuildingEliminationTelemetryEvent, { event: "target_orders" }>;
type Decision = Extract<BuildingEliminationTelemetryEvent, { event: "engagement_decision" }>;
type Allocation = Extract<BuildingEliminationTelemetryEvent, { event: "engagement_allocation" }>;
type Heartbeat = Extract<BuildingEliminationTelemetryEvent, { event: "execution_heartbeat" }>;
type Progress = Extract<BuildingEliminationTelemetryEvent, { event: "target_progress" }>;
type ReadinessReserve = Extract<BuildingEliminationTelemetryEvent, { event: "readiness_reserve" }>;
type ActivationEvaluation = Extract<BuildingEliminationTelemetryEvent, { event: "activation_evaluation" }>;

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

export const summarizeMissionNativeCloseoutV10 = (
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
        .filter(({ reason }) => reason === "no_viable_objective_clearance");
    const targetOrders = eventsOf(telemetry, "target_orders");
    const readinessReserve = eventsOf(telemetry, "readiness_reserve");
    const activationEvaluations = eventsOf(telemetry, "activation_evaluation");
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
        maximumStagedCombatants,
        buildingReadyEvaluationCount: activationEvaluations.filter(({ phase }) => phase === "building_ready").length,
        blockerReadyEvaluationCount: activationEvaluations.filter(({ phase }) => phase === "blocker_ready").length,
        blockedEvaluationCount: activationEvaluations.filter(({ phase }) => phase === "blocked").length,
        execution: summarizeMissionNativeCloseoutExecution(telemetry),
    };
};

export const validateMissionNativeCloseoutV10Exposure = (
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
    ) throw new Error(`V10 activation contract drifted for ${country} slot ${slot}`);
    const evaluations = eventsOf(telemetry, "activation_evaluation") as ActivationEvaluation[];
    const activationIndex = telemetry.findIndex(({ event }) => event === "activated");
    const passingEvaluationIndex = telemetry.findIndex((event) =>
        event.event === "activation_evaluation" && event.tick === activations[0].tick &&
        (event.phase === "building_ready" || event.phase === "blocker_ready"),
    );
    if (passingEvaluationIndex < 0 || passingEvaluationIndex > activationIndex) {
        throw new Error(`V10 activation lacked a preceding certificate for ${country} slot ${slot}`);
    }
    for (const evaluation of evaluations) {
        if (
            evaluation.phase === "blocker_ready" &&
            (evaluation.blockerId === null || evaluation.routeThreatCount <= 0 ||
                evaluation.estimatedBlockerRemovalTicks === null ||
                evaluation.estimatedForceSurvivalTicks === null ||
                evaluation.estimatedBlockerRemovalTicks > evaluation.estimatedForceSurvivalTicks)
        ) throw new Error(`V10 blocker-readiness certificate drifted for ${country} slot ${slot}`);
        if (
            evaluation.phase === "building_ready" && evaluation.blockerId !== null
        ) throw new Error(`V10 building-readiness certificate drifted for ${country} slot ${slot}`);
    }
    const activationBlocks = eventsOf(telemetry, "activation_blocked") as ActivationBlocked[];
    if (activationBlocks.some(({ reason, tick }) =>
        (reason !== "no_viable_objective_clearance" && reason !== "insufficient_own_combatants") ||
        tick > activations[0].tick)) {
        throw new Error(`V10 emitted an unfrozen activation block for ${country} slot ${slot}`);
    }
    const reserveEvents = eventsOf(telemetry, "readiness_reserve") as ReadinessReserve[];
    const created = reserveEvents.filter(({ phase }) => phase === "created");
    const released = reserveEvents.filter(({ phase }) => phase === "released");
    if (
        created.length > 1 || released.length > 1 ||
        (created.length === 1 && released.length !== 1) ||
        released.some(({ tick }) => tick > activations[0].tick)
    ) throw new Error(`V10 reserve lifecycle drifted for ${country} slot ${slot}`);
    const orders = eventsOf(telemetry, "target_orders") as TargetOrder[];
    if (
        orders.length === 0 || orders.some(({ attackerCount, targets }) =>
            attackerCount <= 0 || targets.length !== 1)
    ) throw new Error(`V10 target focus drifted for ${country} slot ${slot}`);
    if (orders.some(({ tick }) => tick < activations[0].tick)) {
        throw new Error(`V10 issued closeout orders before takeover for ${country} slot ${slot}`);
    }
    const decisions = eventsOf(telemetry, "engagement_decision") as Decision[];
    const allocations = eventsOf(telemetry, "engagement_allocation") as Allocation[];
    if (decisions.length === 0 || allocations.length === 0) {
        throw new Error(`V10 engagement was not exposed for ${country} slot ${slot}`);
    }
    for (const decision of decisions) {
        if (decision.reason === "route_interception_wins") {
            if (
                decision.phase !== "blocker_clear" || decision.blockerId === null ||
                decision.routeThreatCount <= 0 || decision.estimatedBuildingCompletionTicks === null ||
                decision.estimatedForceSurvivalTicks === null ||
                decision.estimatedBuildingCompletionTicks <= decision.estimatedForceSurvivalTicks
            ) throw new Error(`V10 blocker certificate drifted for ${country} slot ${slot}`);
        } else if (
            decision.phase === "blocker_clear" || decision.blockerId !== null ||
            (decision.reason === "building_completion_race" &&
                (decision.estimatedBuildingCompletionTicks === null ||
                    decision.estimatedForceSurvivalTicks === null ||
                    decision.estimatedBuildingCompletionTicks > decision.estimatedForceSurvivalTicks))
        ) throw new Error(`V10 building certificate drifted for ${country} slot ${slot}`);
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
        ) throw new Error(`V10 phase allocation drifted for ${country} slot ${slot}`);
    }
    const progress = eventsOf(telemetry, "target_progress") as Progress[];
    if (!progress.some(({ damage }) => damage > 0)) {
        throw new Error(`V10 caused no physical building damage for ${country} slot ${slot}`);
    }
    if (telemetry.some(({ event }) => event === "sweep_orders" || event === "capability_production")) {
        throw new Error(`Unfrozen V10 mechanism executed for ${country} slot ${slot}`);
    }
    if (telemetry.some(({ tick }) => !Number.isSafeInteger(tick) || tick < 0)) {
        throw new Error(`V10 telemetry tick drifted for ${country} slot ${slot}`);
    }
};

const main = async (): Promise<void> => {
    const repoRoot = path.resolve(process.cwd(), "..", "..");
    const outFile = requiredPath("OUT_FILE");
    if (fs.existsSync(outFile)) throw new Error(`Refusing to overwrite ${outFile}`);
    if (!process.env.BASELINE_PACKAGE_ROOT || process.env.REQUIRE_EXTERNAL_BASELINE !== "true") {
        throw new Error("Mission-native V10 compatibility requires the pinned external baseline");
    }
    const mapName = "simple-1v1-no-preview.map";
    if (sha256File(path.join(process.cwd(), "data", mapName)) !== METHOD_V5_EQUIVALENCE_MAP_SHA256) {
        throw new Error("Mission-native V10 compatibility map bytes drifted");
    }
    const factory = await loadBaselineFactory(path.join(repoRoot, "packages", "chronodivide-bot"));
    const disabledPolicy = buildMissionNativeCloseoutPolicyV10(false);
    const enabledPolicy = buildMissionNativeCloseoutPolicyV10(true);
    const rows: Array<Record<string, unknown>> = [];
    await cdapi.init(path.join(process.cwd(), "data"));
    let index = 0;
    for (const country of Object.values(Countries)) for (const candidateSlot of [0, 1] as const) {
        const requestedEngineSeed = derivePairedEngineSeed(
            MISSION_NATIVE_CLOSEOUT_COMPATIBILITY_V10_ENGINE_SEED_BASE,
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
            validationErrors.push(`Disabled V10 adapter drifted for ${country} slot ${candidateSlot}`);
        }
        if (disabled.telemetry.length !== 0) {
            validationErrors.push(`Disabled V10 adapter emitted telemetry for ${country} slot ${candidateSlot}`);
        }
        for (const [label, trace] of [["first", first], ["repeat", repeat]] as const) {
            try {
                validateMissionNativeCloseoutV10Exposure(trace.telemetry, country, candidateSlot);
            } catch (error) {
                validationErrors.push(`${label}: ${error instanceof Error ? error.message : String(error)}`);
            }
            if (trace.quitAttempts.candidate !== 0 || trace.quitAttempts.baseline !== 0) {
                validationErrors.push(`${label}: resignation attempt for ${country} slot ${candidateSlot}`);
            }
        }
        if (firstDigest !== repeatDigest) {
            validationErrors.push(`V10 trace was not deterministic for ${country} slot ${candidateSlot}`);
        }
        if (digest(first.actions) === digest(direct.actions)) {
            validationErrors.push(`V10 did not change commands for ${country} slot ${candidateSlot}`);
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
            summary: summarizeMissionNativeCloseoutV10(first.telemetry),
            repeatSummary: summarizeMissionNativeCloseoutV10(repeat.telemetry),
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
        runId: `mission-native-closeout-compatibility-v10-${process.env.SLURM_JOB_ID ?? "local"}`,
        mixDir: path.join(process.cwd(), "data"),
        maps: [mapName],
        effectiveConfig: {
            purpose: "outcome-free-mission-native-certified-clearance-closeout-v10",
            gateSchemaVersion: MISSION_NATIVE_CLOSEOUT_COMPATIBILITY_V10_SCHEMA_VERSION,
            disabledPolicyId: missionNativeCloseoutPolicyV10Sha256(disabledPolicy),
            enabledPolicyId: missionNativeCloseoutPolicyV10Sha256(enabledPolicy),
            countries: Object.values(Countries),
            reciprocalSlots: [0, 1],
            runsPerCountrySlot: MISSION_NATIVE_CLOSEOUT_COMPATIBILITY_V10_RUNS_PER_COUNTRY_SLOT,
            maxTicks: MISSION_NATIVE_CLOSEOUT_COMPATIBILITY_MAX_TICKS,
            outcomeInspection: false,
        },
        baseline: factory.descriptor,
        gameSeedBase: MISSION_NATIVE_CLOSEOUT_COMPATIBILITY_V10_ENGINE_SEED_BASE,
    });
    if (
        manifest.scheduler.account !== "pi_jss233" || manifest.source.gitBranch !== "main" ||
        manifest.source.trackedDirty !== false || manifest.software.baseline.kind !== "external-package" ||
        manifest.software.baseline.trackedDirty !== false || rows.length !== 18
    ) throw new Error("Mission-native V10 compatibility provenance or coverage failed");
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
    if (totals("pureBlockerAllocationCount") <= 0) {
        globalValidationErrors.push("V10 never exposed a phase-pure blocker allocation");
    }
    if (totals("pureBuildingAllocationCount") <= 0) {
        globalValidationErrors.push("V10 never exposed a phase-pure building allocation");
    }
    if (totals("persistentBlockerHeartbeats") <= 0) {
        globalValidationErrors.push("V10 never preserved a blocker across consecutive heartbeats");
    }
    if (totals("readinessBlockedCount") <= 0) {
        globalValidationErrors.push("V10 never exposed a readiness-blocked takeover event");
    }
    if (totals("readinessReserveCreatedCount") <= 0) {
        globalValidationErrors.push("V10 never created a readiness reserve");
    }
    if (totals("readinessReserveReleasedCount") <= 0) {
        globalValidationErrors.push("V10 never released a readiness reserve before takeover");
    }
    if (totals("readinessReservePositiveGrowth") <= 0) {
        globalValidationErrors.push("V10 never accumulated a positive readiness reserve");
    }
    if (totals("blockerReadyEvaluationCount") <= 0) {
        globalValidationErrors.push("V10 never activated through certified blocker clearance");
    }
    if (!reinforcementTargetNames.some((name) => name === "GAPILE" || name === "GAWEAP")) {
        globalValidationErrors.push("V10 never selected an Allied reinforcement source");
    }
    if (!reinforcementTargetNames.some((name) => name === "NAHAND" || name === "NAWEAP")) {
        globalValidationErrors.push("V10 never selected a Soviet reinforcement source");
    }
    const passed = rows.every((row) => row.passed === true) && globalValidationErrors.length === 0;
    const output = {
        schemaVersion: MISSION_NATIVE_CLOSEOUT_COMPATIBILITY_V10_SCHEMA_VERSION,
        status: passed
            ? "PASS_OUTCOME_FREE_MISSION_NATIVE_CLOSEOUT_COMPATIBILITY_V10"
            : "FAIL_OUTCOME_FREE_MISSION_NATIVE_CLOSEOUT_COMPATIBILITY_V10",
        generatedAt: new Date().toISOString(),
        passed,
        outcomeFree: true,
        sourceGitCommit: manifest.source.gitCommit,
        scheduler: manifest.scheduler,
        externalBaseline: manifest.software.baseline,
        disabledPolicyId: missionNativeCloseoutPolicyV10Sha256(disabledPolicy),
        enabledPolicyId: missionNativeCloseoutPolicyV10Sha256(enabledPolicy),
        countryCount: Object.values(Countries).length,
        reciprocalSlotCount: 2,
        gameCount: rows.length * MISSION_NATIVE_CLOSEOUT_COMPATIBILITY_V10_RUNS_PER_COUNTRY_SLOT,
        maxTicks: MISSION_NATIVE_CLOSEOUT_COMPATIBILITY_MAX_TICKS,
        aggregate: {
            buildingDamage: totals("buildingDamage"),
            pureBlockerAllocationCount: totals("pureBlockerAllocationCount"),
            mixedBlockerAllocationCount: totals("mixedBlockerAllocationCount"),
            pureBuildingAllocationCount: totals("pureBuildingAllocationCount"),
            persistentBlockerHeartbeats: totals("persistentBlockerHeartbeats"),
            blockerSwitches: totals("blockerSwitches"),
            blockerToBuildingTransitions: totals("blockerToBuildingTransitions"),
            readinessBlockedCount: totals("readinessBlockedCount"),
            readinessReserveCreatedCount: totals("readinessReserveCreatedCount"),
            readinessReserveReleasedCount: totals("readinessReserveReleasedCount"),
            readinessReservePositiveGrowthCellCount: totals("readinessReservePositiveGrowth"),
            maximumStagedCombatants: Math.max(...summaries.map((summary) =>
                Number(summary.maximumStagedCombatants ?? 0),
            )),
            buildingReadyEvaluationCount: totals("buildingReadyEvaluationCount"),
            blockerReadyEvaluationCount: totals("blockerReadyEvaluationCount"),
            blockedEvaluationCount: totals("blockedEvaluationCount"),
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
    if (!passed) throw new Error("Mission-native compatibility-v10 failed; preserved outcome-free artifact");
};

const invoked = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (import.meta.url === invoked) main().catch((error) => { console.error(error); process.exitCode = 1; });
