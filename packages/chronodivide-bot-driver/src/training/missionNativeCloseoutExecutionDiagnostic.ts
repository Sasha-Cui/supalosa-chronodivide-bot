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
    buildMissionNativeCloseoutPolicyV5,
    missionNativeCloseoutPolicyV5Sha256,
} from "./missionNativeCloseoutPolicyV5.js";

export const MISSION_NATIVE_CLOSEOUT_EXECUTION_DIAGNOSTIC_SCHEMA_VERSION = 1 as const;
export const MISSION_NATIVE_CLOSEOUT_EXECUTION_DIAGNOSTIC_ENGINE_SEED_BASE = 4_010_000_000 as const;
export const MISSION_NATIVE_CLOSEOUT_EXECUTION_DIAGNOSTIC_RUNS_PER_COUNTRY_SLOT = 4 as const;
export const MISSION_NATIVE_CLOSEOUT_EXECUTION_NEAR_RANGE_TILES = 2 as const;
const DISTANCE_EPSILON = 1e-9;

type ExecutionHeartbeat = Extract<BuildingEliminationTelemetryEvent, { event: "execution_heartbeat" }>;

export type MissionNativeCloseoutExecutionMechanism =
    | "no_approach_progress"
    | "approach_followed_by_attacker_loss"
    | "arrival_without_firing_range"
    | "firing_range_without_physical_damage"
    | "direct_order_replacement_or_oscillation"
    | "successful_physical_damage";

const requiredPath = (name: string): string => {
    const value = process.env[name];
    if (!value) throw new Error(`${name} is required`);
    return path.resolve(value);
};

const digest = (value: unknown): string => createHash("sha256")
    .update(JSON.stringify(value))
    .digest("hex");

const isFiniteOrNull = (value: unknown): value is number | null =>
    value === null || (typeof value === "number" && Number.isFinite(value));

const isSortedUniqueIntegerArray = (value: unknown): value is number[] =>
    Array.isArray(value) && value.every((entry, index) =>
        Number.isSafeInteger(entry) && entry >= 0 && (index === 0 || entry > value[index - 1]),
    );

const sameNumbers = (left: readonly number[], right: readonly number[]): boolean =>
    left.length === right.length && left.every((value, index) => value === right[index]);

const recordCount = (value: Record<string, number>): number =>
    Object.values(value).reduce((sum, count) => sum + count, 0);

export const validateMissionNativeCloseoutExecutionTelemetry = (
    telemetry: readonly BuildingEliminationTelemetryEvent[],
    country: Countries,
    slot: 0 | 1,
    options: { engagementAllocationMode?: "singleScreen" | "allBlocker" } = {},
): void => {
    const engagementAllocationMode = options.engagementAllocationMode ?? "singleScreen";
    const heartbeats = telemetry.filter((event): event is ExecutionHeartbeat =>
        event.event === "execution_heartbeat",
    );
    if (heartbeats.length === 0) {
        throw new Error(`No execution heartbeat for ${country} slot ${slot}`);
    }
    let previous: ExecutionHeartbeat | null = null;
    for (const heartbeat of heartbeats) {
        if (heartbeat.schemaVersion !== 5 || !Number.isSafeInteger(heartbeat.tick) || heartbeat.tick < 0) {
            throw new Error(`Execution heartbeat identity drifted for ${country} slot ${slot}`);
        }
        if (
            !isSortedUniqueIntegerArray(heartbeat.assignedAttackerIds) ||
            !isSortedUniqueIntegerArray(heartbeat.buildingAttackerIds) ||
            !isSortedUniqueIntegerArray(heartbeat.blockerAttackerIds) ||
            !isSortedUniqueIntegerArray(heartbeat.noLongerAssignedUnitIds) ||
            !isSortedUniqueIntegerArray(heartbeat.destroyedAssignedUnitIds)
        ) {
            throw new Error(`Execution heartbeat unit identities drifted for ${country} slot ${slot}`);
        }
        const combinedIds = [...heartbeat.buildingAttackerIds, ...heartbeat.blockerAttackerIds]
            .sort((left, right) => left - right);
        const destroyedSet = new Set(heartbeat.noLongerAssignedUnitIds);
        if (
            !sameNumbers(combinedIds, heartbeat.assignedAttackerIds) ||
            heartbeat.assignedAttackerCount <= 0 ||
            (engagementAllocationMode === "singleScreen" && heartbeat.buildingAttackerCount <= 0) ||
            heartbeat.assignedAttackerCount !== heartbeat.assignedAttackerIds.length ||
            heartbeat.buildingAttackerCount !== heartbeat.buildingAttackerIds.length ||
            heartbeat.blockerAttackerCount !== heartbeat.blockerAttackerIds.length ||
            heartbeat.buildingAttackerCount + heartbeat.blockerAttackerCount !==
                heartbeat.assignedAttackerCount ||
            (engagementAllocationMode === "singleScreen" && heartbeat.blockerAttackerCount > 1) ||
            (engagementAllocationMode === "allBlocker" && heartbeat.blockerId !== null &&
                heartbeat.blockerAttackerCount <= 0) ||
            heartbeat.destroyedAssignedUnitIds.some((id) => !destroyedSet.has(id))
        ) {
            throw new Error(`Execution heartbeat allocation drifted for ${country} slot ${slot}`);
        }
        if (
            recordCount(heartbeat.assignedAttackerTypes) !== heartbeat.assignedAttackerCount ||
            recordCount(heartbeat.attackStateCounts) !== heartbeat.assignedAttackerCount ||
            Object.values(heartbeat.assignedAttackerTypes).some((count) => !Number.isSafeInteger(count) || count <= 0) ||
            Object.values(heartbeat.attackStateCounts).some((count) => !Number.isSafeInteger(count) || count <= 0)
        ) {
            throw new Error(`Execution heartbeat attacker-type counts drifted for ${country} slot ${slot}`);
        }
        if (
            heartbeat.targetHitPoints < 0 || heartbeat.routeThreatCount < 0 ||
            heartbeat.totalAssignedHitPoints < 0 || heartbeat.totalBuildingAttackerHitPoints < 0 ||
            heartbeat.totalBlockerAttackerHitPoints < 0 ||
            heartbeat.totalBuildingAttackerHitPoints + heartbeat.totalBlockerAttackerHitPoints !==
                heartbeat.totalAssignedHitPoints ||
            heartbeat.idleAttackerCount < 0 || heartbeat.idleAttackerCount > heartbeat.assignedAttackerCount ||
            heartbeat.movingAttackerCount < 0 || heartbeat.movingAttackerCount > heartbeat.assignedAttackerCount
        ) {
            throw new Error(`Execution heartbeat physical state drifted for ${country} slot ${slot}`);
        }
        if (
            !isFiniteOrNull(heartbeat.minimumDistanceToFiringPerimeter) ||
            !isFiniteOrNull(heartbeat.medianDistanceToFiringPerimeter) ||
            !isFiniteOrNull(heartbeat.maximumDistanceToFiringPerimeter) ||
            !isFiniteOrNull(heartbeat.minimumDistanceDelta) ||
            !isFiniteOrNull(heartbeat.medianDistanceDelta) ||
            !isFiniteOrNull(heartbeat.targetHitPointDelta)
        ) {
            throw new Error(`Execution heartbeat distance state is non-finite for ${country} slot ${slot}`);
        }
        const distances = [
            heartbeat.minimumDistanceToFiringPerimeter,
            heartbeat.medianDistanceToFiringPerimeter,
            heartbeat.maximumDistanceToFiringPerimeter,
        ];
        if (heartbeat.buildingAttackerCount === 0) {
            if (distances.some((value) => value !== null) || heartbeat.inRangeBuildingAttackerCount !== 0) {
                throw new Error(`Empty building allocation has distances for ${country} slot ${slot}`);
            }
        } else if (
            distances.some((value) => value === null) ||
            heartbeat.minimumDistanceToFiringPerimeter! < 0 ||
            heartbeat.minimumDistanceToFiringPerimeter! > heartbeat.medianDistanceToFiringPerimeter! ||
            heartbeat.medianDistanceToFiringPerimeter! > heartbeat.maximumDistanceToFiringPerimeter! ||
            heartbeat.inRangeBuildingAttackerCount < 0 ||
            heartbeat.inRangeBuildingAttackerCount > heartbeat.buildingAttackerCount ||
            (heartbeat.inRangeBuildingAttackerCount > 0) !==
                (heartbeat.minimumDistanceToFiringPerimeter === 0)
        ) {
            throw new Error(`Execution heartbeat firing-perimeter state drifted for ${country} slot ${slot}`);
        }
        if (
            heartbeat.directBuildingAttackCommandCount + heartbeat.moveTowardBuildingCommandCount !==
                heartbeat.buildingAttackerCount ||
            heartbeat.blockerAttackCommandCount !== heartbeat.blockerAttackerCount ||
            heartbeat.directBuildingAttackCommandCount + heartbeat.moveTowardBuildingCommandCount +
                heartbeat.blockerAttackCommandCount !== heartbeat.assignedAttackerCount ||
            (heartbeat.blockerAttackCommandCount > 0 && heartbeat.blockerId === null)
        ) {
            throw new Error(`Execution heartbeat command certificate drifted for ${country} slot ${slot}`);
        }
        const consecutive = previous?.targetId === heartbeat.targetId ? previous : null;
        if (consecutive) {
            const expectedMinimumDelta = heartbeat.minimumDistanceToFiringPerimeter !== null &&
                consecutive.minimumDistanceToFiringPerimeter !== null
                ? heartbeat.minimumDistanceToFiringPerimeter - consecutive.minimumDistanceToFiringPerimeter
                : null;
            const expectedMedianDelta = heartbeat.medianDistanceToFiringPerimeter !== null &&
                consecutive.medianDistanceToFiringPerimeter !== null
                ? heartbeat.medianDistanceToFiringPerimeter - consecutive.medianDistanceToFiringPerimeter
                : null;
            if (
                heartbeat.tick < consecutive.tick + 120 ||
                heartbeat.targetHitPointDelta !== heartbeat.targetHitPoints - consecutive.targetHitPoints ||
                heartbeat.minimumDistanceDelta !== expectedMinimumDelta ||
                heartbeat.medianDistanceDelta !== expectedMedianDelta
            ) {
                throw new Error(`Execution heartbeat delta certificate drifted for ${country} slot ${slot}`);
            }
        } else if (
            heartbeat.targetHitPointDelta !== null || heartbeat.minimumDistanceDelta !== null ||
            heartbeat.medianDistanceDelta !== null || heartbeat.noLongerAssignedUnitIds.length !== 0 ||
            heartbeat.destroyedAssignedUnitIds.length !== 0
        ) {
            throw new Error(`First target heartbeat has inherited state for ${country} slot ${slot}`);
        }
        previous = heartbeat;
    }
};

export const classifyMissionNativeCloseoutExecution = (
    telemetry: readonly BuildingEliminationTelemetryEvent[],
): MissionNativeCloseoutExecutionMechanism[] => {
    const heartbeats = telemetry.filter((event): event is ExecutionHeartbeat =>
        event.event === "execution_heartbeat",
    );
    const damage = telemetry
        .filter((event): event is Extract<BuildingEliminationTelemetryEvent, { event: "target_progress" }> =>
            event.event === "target_progress",
        )
        .reduce((sum, event) => sum + Math.max(0, event.damage), 0);
    const minimumDeltas = heartbeats.flatMap(({ minimumDistanceDelta }) =>
        minimumDistanceDelta === null ? [] : [minimumDistanceDelta],
    );
    const medianDeltas = heartbeats.flatMap(({ medianDistanceDelta }) =>
        medianDistanceDelta === null ? [] : [medianDistanceDelta],
    );
    const approached = [...minimumDeltas, ...medianDeltas].some((delta) => delta < -DISTANCE_EPSILON);
    const receded = [...minimumDeltas, ...medianDeltas].some((delta) => delta > DISTANCE_EPSILON);
    const enteredRange = heartbeats.some(({ inRangeBuildingAttackerCount }) => inRangeBuildingAttackerCount > 0);
    const arrivedNearRange = heartbeats.some(({ minimumDistanceToFiringPerimeter }) =>
        minimumDistanceToFiringPerimeter !== null && minimumDistanceToFiringPerimeter > 0 &&
            minimumDistanceToFiringPerimeter <= MISSION_NATIVE_CLOSEOUT_EXECUTION_NEAR_RANGE_TILES,
    );
    const destroyed = heartbeats.some(({ destroyedAssignedUnitIds }) => destroyedAssignedUnitIds.length > 0);
    const directCommands = heartbeats.some(
        ({ directBuildingAttackCommandCount }) => directBuildingAttackCommandCount > 0,
    );
    const mechanisms: MissionNativeCloseoutExecutionMechanism[] = [];
    if (!arrivedNearRange && !enteredRange && damage === 0) mechanisms.push("no_approach_progress");
    if (approached && destroyed) mechanisms.push("approach_followed_by_attacker_loss");
    if (arrivedNearRange && !enteredRange && damage === 0) mechanisms.push("arrival_without_firing_range");
    if (enteredRange && damage === 0) mechanisms.push("firing_range_without_physical_damage");
    if (directCommands && approached && receded) mechanisms.push("direct_order_replacement_or_oscillation");
    if (damage > 0) mechanisms.push("successful_physical_damage");
    return mechanisms;
};

export const summarizeMissionNativeCloseoutExecution = (
    telemetry: readonly BuildingEliminationTelemetryEvent[],
): Record<string, unknown> => {
    const heartbeats = telemetry.filter((event): event is ExecutionHeartbeat =>
        event.event === "execution_heartbeat",
    );
    const progress = telemetry.filter((event): event is Extract<BuildingEliminationTelemetryEvent, {
        event: "target_progress";
    }> => event.event === "target_progress");
    const numericRange = (values: number[]): [number, number] | null => values.length === 0
        ? null
        : [Math.min(...values), Math.max(...values)];
    return {
        mechanisms: classifyMissionNativeCloseoutExecution(telemetry),
        heartbeatCount: heartbeats.length,
        targetIds: [...new Set(heartbeats.map(({ targetId }) => targetId))].sort((left, right) => left - right),
        targetNames: [...new Set(heartbeats.map(({ targetName }) => targetName))].sort(),
        blockerNames: [...new Set(heartbeats.flatMap(({ blockerName }) => blockerName ? [blockerName] : []))].sort(),
        buildingDamage: progress.reduce((sum, event) => sum + Math.max(0, event.damage), 0),
        inRangeHeartbeatCount: heartbeats.filter(({ inRangeBuildingAttackerCount }) =>
            inRangeBuildingAttackerCount > 0,
        ).length,
        assignedAttackerCountRange: numericRange(heartbeats.map(({ assignedAttackerCount }) =>
            assignedAttackerCount,
        )),
        assignedHitPointRange: numericRange(heartbeats.map(({ totalAssignedHitPoints }) =>
            totalAssignedHitPoints,
        )),
        minimumDistanceRange: numericRange(heartbeats.flatMap(({ minimumDistanceToFiringPerimeter }) =>
            minimumDistanceToFiringPerimeter === null ? [] : [minimumDistanceToFiringPerimeter],
        )),
        medianDistanceRange: numericRange(heartbeats.flatMap(({ medianDistanceToFiringPerimeter }) =>
            medianDistanceToFiringPerimeter === null ? [] : [medianDistanceToFiringPerimeter],
        )),
        destroyedAssignedUnitIds: [...new Set(heartbeats.flatMap(({ destroyedAssignedUnitIds }) =>
            destroyedAssignedUnitIds,
        ))].sort((left, right) => left - right),
        noLongerAssignedUnitIds: [...new Set(heartbeats.flatMap(({ noLongerAssignedUnitIds }) =>
            noLongerAssignedUnitIds,
        ))].sort((left, right) => left - right),
        directBuildingAttackCommandCount: heartbeats.reduce((sum, event) =>
            sum + event.directBuildingAttackCommandCount,
        0),
        moveTowardBuildingCommandCount: heartbeats.reduce((sum, event) =>
            sum + event.moveTowardBuildingCommandCount,
        0),
        blockerAttackCommandCount: heartbeats.reduce((sum, event) =>
            sum + event.blockerAttackCommandCount,
        0),
        executionHeartbeats: heartbeats,
    };
};

const traceDigest = (trace: MissionNativeCloseoutRunTrace, includeTelemetry: boolean): string => digest({
    actions: trace.actions,
    snapshots: trace.snapshots,
    ...(includeTelemetry ? { telemetry: trace.telemetry } : {}),
});

const main = async (): Promise<void> => {
    const repoRoot = path.resolve(process.cwd(), "..", "..");
    const outFile = requiredPath("OUT_FILE");
    if (fs.existsSync(outFile)) throw new Error(`Refusing to overwrite ${outFile}`);
    if (!process.env.BASELINE_PACKAGE_ROOT || process.env.REQUIRE_EXTERNAL_BASELINE !== "true") {
        throw new Error("Mission-native execution diagnostic requires the pinned external baseline");
    }
    const mapName = "simple-1v1-no-preview.map";
    if (sha256File(path.join(process.cwd(), "data", mapName)) !== METHOD_V5_EQUIVALENCE_MAP_SHA256) {
        throw new Error("Mission-native execution diagnostic map bytes drifted");
    }
    const factory = await loadBaselineFactory(path.join(repoRoot, "packages", "chronodivide-bot"));
    const disabledPolicy = buildMissionNativeCloseoutPolicyV5(false);
    const enabledPolicy = buildMissionNativeCloseoutPolicyV5(true);
    const rows: Array<Record<string, unknown>> = [];
    await cdapi.init(path.join(process.cwd(), "data"));
    let index = 0;
    for (const country of Object.values(Countries)) for (const candidateSlot of [0, 1] as const) {
        const requestedEngineSeed = derivePairedEngineSeed(
            MISSION_NATIVE_CLOSEOUT_EXECUTION_DIAGNOSTIC_ENGINE_SEED_BASE,
            index++,
        );
        const direct = await runMissionNativeCloseoutTrace({
            factory, mapName, country, candidateSlot, requestedEngineSeed, policy: null,
        });
        const disabled = await runMissionNativeCloseoutTrace({
            factory, mapName, country, candidateSlot, requestedEngineSeed, policy: disabledPolicy,
        });
        const directDigest = traceDigest(direct, false);
        const disabledDigest = traceDigest(disabled, false);
        const first = await runMissionNativeCloseoutTrace({
            factory, mapName, country, candidateSlot, requestedEngineSeed, policy: enabledPolicy,
        });
        const repeat = await runMissionNativeCloseoutTrace({
            factory, mapName, country, candidateSlot, requestedEngineSeed, policy: enabledPolicy,
        });
        const validationErrors: string[] = [];
        if (directDigest !== disabledDigest) {
            validationErrors.push(`Disabled diagnostic adapter drifted for ${country} slot ${candidateSlot}`);
        }
        if (disabled.telemetry.length !== 0) {
            validationErrors.push(`Disabled diagnostic adapter emitted telemetry for ${country} slot ${candidateSlot}`);
        }
        for (const [label, trace] of [["first", first], ["repeat", repeat]] as const) {
            try {
                validateMissionNativeCloseoutExecutionTelemetry(trace.telemetry, country, candidateSlot);
            } catch (error) {
                validationErrors.push(`${label}: ${error instanceof Error ? error.message : String(error)}`);
            }
        }
        const firstDigest = traceDigest(first, true);
        const repeatDigest = traceDigest(repeat, true);
        if (firstDigest !== repeatDigest) {
            validationErrors.push(`Execution diagnostic trace was not deterministic for ${country} slot ${candidateSlot}`);
        }
        if (digest(first.actions) === digest(direct.actions)) {
            validationErrors.push(`Execution diagnostic candidate did not change commands for ${country} slot ${candidateSlot}`);
        }
        const mechanisms = classifyMissionNativeCloseoutExecution(first.telemetry);
        if (mechanisms.length === 0) {
            validationErrors.push(`Execution diagnostic did not classify ${country} slot ${candidateSlot}`);
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
            executionSummary: summarizeMissionNativeCloseoutExecution(first.telemetry),
            repeatExecutionSummary: summarizeMissionNativeCloseoutExecution(repeat.telemetry),
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
        runId: `mission-native-closeout-execution-diagnostic-${process.env.SLURM_JOB_ID ?? "local"}`,
        mixDir: path.join(process.cwd(), "data"),
        maps: [mapName],
        effectiveConfig: {
            purpose: "outcome-free-mission-native-v5-route-range-survival-and-command-diagnostic",
            diagnosticSchemaVersion: MISSION_NATIVE_CLOSEOUT_EXECUTION_DIAGNOSTIC_SCHEMA_VERSION,
            disabledPolicyId: missionNativeCloseoutPolicyV5Sha256(disabledPolicy),
            enabledPolicyId: missionNativeCloseoutPolicyV5Sha256(enabledPolicy),
            policyChanged: false,
            countries: Object.values(Countries),
            reciprocalSlots: [0, 1],
            runsPerCountrySlot: MISSION_NATIVE_CLOSEOUT_EXECUTION_DIAGNOSTIC_RUNS_PER_COUNTRY_SLOT,
            maxTicks: MISSION_NATIVE_CLOSEOUT_COMPATIBILITY_MAX_TICKS,
            heartbeatTicks: 120,
            nearRangeTiles: MISSION_NATIVE_CLOSEOUT_EXECUTION_NEAR_RANGE_TILES,
            outcomeInspection: false,
        },
        baseline: factory.descriptor,
        gameSeedBase: MISSION_NATIVE_CLOSEOUT_EXECUTION_DIAGNOSTIC_ENGINE_SEED_BASE,
    });
    if (
        manifest.scheduler.account !== "pi_jss233" || manifest.source.gitBranch !== "main" ||
        manifest.source.trackedDirty !== false || manifest.software.baseline.kind !== "external-package" ||
        manifest.software.baseline.trackedDirty !== false || rows.length !== 18
    ) throw new Error("Mission-native execution diagnostic provenance or coverage failed");
    const globalValidationErrors: string[] = [];
    const mechanismCounts: Record<string, number> = {};
    for (const row of rows) {
        const summary = row.executionSummary as { mechanisms?: unknown };
        if (!Array.isArray(summary.mechanisms) || summary.mechanisms.length === 0) {
            globalValidationErrors.push(`Unclassified execution row ${row.country} slot ${row.candidateSlot}`);
            continue;
        }
        for (const mechanism of summary.mechanisms) {
            if (typeof mechanism === "string") mechanismCounts[mechanism] = (mechanismCounts[mechanism] ?? 0) + 1;
        }
    }
    const passed = rows.every((row) => row.passed === true) && globalValidationErrors.length === 0;
    const output = {
        schemaVersion: MISSION_NATIVE_CLOSEOUT_EXECUTION_DIAGNOSTIC_SCHEMA_VERSION,
        status: passed
            ? "PASS_OUTCOME_FREE_MISSION_NATIVE_CLOSEOUT_EXECUTION_DIAGNOSTIC_V1"
            : "FAIL_OUTCOME_FREE_MISSION_NATIVE_CLOSEOUT_EXECUTION_DIAGNOSTIC_V1",
        generatedAt: new Date().toISOString(),
        passed,
        outcomeFree: true,
        policyChanged: false,
        sourceGitCommit: manifest.source.gitCommit,
        scheduler: manifest.scheduler,
        externalBaseline: manifest.software.baseline,
        disabledPolicyId: missionNativeCloseoutPolicyV5Sha256(disabledPolicy),
        enabledPolicyId: missionNativeCloseoutPolicyV5Sha256(enabledPolicy),
        countryCount: Object.values(Countries).length,
        reciprocalSlotCount: 2,
        gameCount: rows.length * MISSION_NATIVE_CLOSEOUT_EXECUTION_DIAGNOSTIC_RUNS_PER_COUNTRY_SLOT,
        maxTicks: MISSION_NATIVE_CLOSEOUT_COMPATIBILITY_MAX_TICKS,
        mechanismCounts,
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
        mechanismCounts,
    }));
    if (!passed) throw new Error("Mission-native execution diagnostic-v1 failed; preserved artifact");
};

const invoked = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (import.meta.url === invoked) main().catch((error) => { console.error(error); process.exitCode = 1; });
