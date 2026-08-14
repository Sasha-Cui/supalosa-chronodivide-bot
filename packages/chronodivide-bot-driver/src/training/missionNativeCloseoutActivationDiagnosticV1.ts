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
    buildMissionNativeCloseoutPolicyV23,
    missionNativeCloseoutPolicyV23Sha256,
} from "./missionNativeCloseoutPolicyV23.js";

export const MISSION_NATIVE_CLOSEOUT_ACTIVATION_DIAGNOSTIC_V1_SCHEMA_VERSION = 1 as const;
export const MISSION_NATIVE_CLOSEOUT_ACTIVATION_DIAGNOSTIC_V1_ENGINE_SEED_BASE = 4_260_000_000 as const;
export const MISSION_NATIVE_CLOSEOUT_ACTIVATION_DIAGNOSTIC_V1_COUNTRIES = [
    Countries.USA,
    Countries.LIBYA,
] as const;

type ActivationEvaluation = Extract<
    BuildingEliminationTelemetryEvent,
    { event: "activation_evaluation"; schemaVersion: 12 }
>;
type LaunchHandoff = Extract<BuildingEliminationTelemetryEvent, { event: "launch_handoff" }>;

const requiredPath = (name: string): string => {
    const value = process.env[name];
    if (!value) throw new Error(`${name} is required`);
    return path.resolve(value);
};

const digest = (value: unknown): string => createHash("sha256").update(JSON.stringify(value)).digest("hex");

const eventsOf = <T extends BuildingEliminationTelemetryEvent["event"]>(
    telemetry: readonly BuildingEliminationTelemetryEvent[],
    event: T,
): Array<Extract<BuildingEliminationTelemetryEvent, { event: T }>> => telemetry.filter(
    (value): value is Extract<BuildingEliminationTelemetryEvent, { event: T }> => value.event === event,
);

const finiteOrNull = (value: number | null): boolean => value === null || Number.isFinite(value);

const sortedUniqueNonnegativeIntegers = (values: readonly number[]): boolean => values.every(
    (value, index) => Number.isSafeInteger(value) && value >= 0 && (index === 0 || value > values[index - 1]),
);

const validateLaunchHandoff = (event: LaunchHandoff, country: Countries): void => {
    const arrays = [
        event.expectedStagedUnitIds,
        event.assignedExpectedUnitIds,
        event.destroyedExpectedUnitIds,
        event.aliveUnassignedExpectedUnitIds,
    ];
    if (event.schemaVersion !== 10 || arrays.some((values) => !sortedUniqueNonnegativeIntegers(values))) {
        throw new Error(`Invalid schema-10 launch handoff for ${country}`);
    }
    const classified = [
        ...event.assignedExpectedUnitIds,
        ...event.destroyedExpectedUnitIds,
        ...event.aliveUnassignedExpectedUnitIds,
    ].sort((left, right) => left - right);
    if (
        classified.length !== event.expectedStagedUnitIds.length ||
        classified.some((value, index) => value !== event.expectedStagedUnitIds[index])
    ) throw new Error(`Incomplete schema-10 launch handoff partition for ${country}`);
};

export const validateMissionNativeCloseoutActivationDiagnosticV1Telemetry = (
    telemetry: readonly BuildingEliminationTelemetryEvent[],
    country: Countries,
): void => {
    const evaluations = telemetry.filter((event): event is ActivationEvaluation =>
        event.event === "activation_evaluation" && event.schemaVersion === 12,
    );
    if (evaluations.length === 0) throw new Error(`Missing schema-12 activation evaluation for ${country}`);
    if (eventsOf(telemetry, "activation_evaluation").length !== evaluations.length) {
        throw new Error(`Activation schema drifted for ${country}`);
    }
    for (const event of evaluations) {
        const counts = [
            event.compatibleAttackerCount,
            event.totalCompatibleAttackerCount,
            event.transferCertifiedAttackerCount,
            event.stagedCompatibleAttackerCount,
            event.vanguardCompatibleAttackerCount,
            event.assaultTankCount,
            event.routeThreatCount,
        ];
        if (
            !Number.isSafeInteger(event.tick) || event.tick < 0 ||
            counts.some((value) => !Number.isSafeInteger(value) || value < 0) ||
            event.transferCertifiedAttackerCount !== event.compatibleAttackerCount ||
            event.stagedCompatibleAttackerCount + event.vanguardCompatibleAttackerCount !==
                event.compatibleAttackerCount ||
            event.totalCompatibleAttackerCount < event.compatibleAttackerCount ||
            event.assaultTankCount > event.compatibleAttackerCount ||
            [
                event.estimatedBuildingCompletionTicks,
                event.estimatedForceSurvivalTicks,
                event.estimatedBlockerRemovalTicks,
                event.estimatedRouteClearanceTicks,
            ].some((value) => !finiteOrNull(value))
        ) throw new Error(`Invalid schema-12 activation evaluation for ${country}`);
        if (event.phase === "building_ready" && (event.targetId === null || event.blockerId !== null)) {
            throw new Error(`Invalid direct-building activation certificate for ${country}`);
        }
        if (event.phase === "blocker_ready") {
            if (
                event.targetId === null || event.blockerId === null ||
                event.estimatedRouteClearanceTicks === null ||
                event.estimatedForceSurvivalTicks === null ||
                event.estimatedRouteClearanceTicks > event.estimatedForceSurvivalTicks
            ) throw new Error(`Invalid blocker-clearance activation certificate for ${country}`);
        }
    }

    const reserve = eventsOf(telemetry, "readiness_reserve");
    if (reserve.length === 0 || reserve.some((event) =>
        event.schemaVersion !== 6 || event.stagedCombatants < 0 ||
        event.eligibleCombatants < 0 || event.vanguardCombatants < 0,
    )) throw new Error(`Invalid readiness-reserve trace for ${country}`);

    const production = eventsOf(telemetry, "assault_production");
    if (production.length === 0 || production.some((event) =>
        event.schemaVersion !== 14 || event.targetCount !== 4 || event.currentCount < 0,
    )) throw new Error(`Invalid assault-production trace for ${country}`);

    const screen = eventsOf(telemetry, "assault_screen_production");
    if (screen.length === 0 || screen.some((event) =>
        event.schemaVersion !== 17 || event.targetCount !== 4 || event.currentCount < 0 ||
        event.readinessOwned !== true || typeof event.factoryCount !== "number" ||
        !Number.isSafeInteger(event.factoryCount) || event.factoryCount < 0 ||
        event.factoryTriggerActive !== (event.factoryCount >= 1) ||
        (event.requested && event.factoryTriggerActive !== true),
    )) throw new Error(`Invalid readiness-owned screen trace for ${country}`);

    const activated = eventsOf(telemetry, "activated");
    if (activated.length > 1) throw new Error(`Repeated activation for ${country}`);
    if (activated.length === 1 && !evaluations.some((event) =>
        event.tick <= activated[0].tick && (event.phase === "building_ready" || event.phase === "blocker_ready"),
    )) throw new Error(`Activation lacks a ready certificate for ${country}`);

    const handoffs = eventsOf(telemetry, "launch_handoff");
    handoffs.forEach((event) => validateLaunchHandoff(event, country));
    if (handoffs.length > 0 && activated.length === 0) {
        throw new Error(`Launch handoff precedes activation for ${country}`);
    }
};

const traceDigest = (trace: MissionNativeCloseoutRunTrace): string => digest({
    actions: trace.actions,
    snapshots: trace.snapshots,
    telemetry: trace.telemetry,
    quitAttempts: trace.quitAttempts,
});

const phaseCounts = (evaluations: readonly ActivationEvaluation[]): Record<string, number> => {
    const counts: Record<string, number> = {};
    for (const { phase } of evaluations) counts[phase] = (counts[phase] ?? 0) + 1;
    return counts;
};

const main = async (): Promise<void> => {
    const repoRoot = path.resolve(process.cwd(), "..", "..");
    const outFile = requiredPath("OUT_FILE");
    if (fs.existsSync(outFile)) throw new Error(`Refusing to overwrite ${outFile}`);
    if (!process.env.BASELINE_PACKAGE_ROOT || process.env.REQUIRE_EXTERNAL_BASELINE !== "true") {
        throw new Error("Activation diagnostic V1 requires the pinned external baseline");
    }
    const mapName = "simple-1v1-no-preview.map";
    if (sha256File(path.join(process.cwd(), "data", mapName)) !== METHOD_V5_EQUIVALENCE_MAP_SHA256) {
        throw new Error("Activation diagnostic V1 map bytes drifted");
    }
    const factory = await loadBaselineFactory(path.join(repoRoot, "packages", "chronodivide-bot"));
    const policy = buildMissionNativeCloseoutPolicyV23(true);
    await cdapi.init(path.join(process.cwd(), "data"));
    const rows: Array<Record<string, unknown>> = [];
    for (const [index, country] of MISSION_NATIVE_CLOSEOUT_ACTIVATION_DIAGNOSTIC_V1_COUNTRIES.entries()) {
        const requestedEngineSeed = derivePairedEngineSeed(
            MISSION_NATIVE_CLOSEOUT_ACTIVATION_DIAGNOSTIC_V1_ENGINE_SEED_BASE,
            index,
        );
        const first = await runMissionNativeCloseoutTrace({
            factory, mapName, country, candidateSlot: 0, requestedEngineSeed, policy,
        });
        const repeat = await runMissionNativeCloseoutTrace({
            factory, mapName, country, candidateSlot: 0, requestedEngineSeed, policy,
        });
        const validationErrors: string[] = [];
        for (const [label, trace] of [["first", first], ["repeat", repeat]] as const) {
            try {
                validateMissionNativeCloseoutActivationDiagnosticV1Telemetry(trace.telemetry, country);
            } catch (error) {
                validationErrors.push(`${label}: ${error instanceof Error ? error.message : String(error)}`);
            }
        }
        const firstTraceSha256 = traceDigest(first);
        const repeatTraceSha256 = traceDigest(repeat);
        if (firstTraceSha256 !== repeatTraceSha256) validationErrors.push("same-seed trace mismatch");
        const evaluations = first.telemetry.filter((event): event is ActivationEvaluation =>
            event.event === "activation_evaluation" && event.schemaVersion === 12,
        );
        const selectedEvents = first.telemetry.filter(({ event }) => new Set([
            "activation_evaluation", "activation_blocked", "readiness_reserve", "launch_handoff",
            "activated", "engagement_decision", "assault_production", "assault_screen_production",
        ]).has(event));
        rows.push({
            country,
            candidateSlot: 0,
            requestedEngineSeed,
            firstTraceSha256,
            repeatTraceSha256,
            traceDeterministic: firstTraceSha256 === repeatTraceSha256,
            quitAttempts: { first: first.quitAttempts, repeat: repeat.quitAttempts },
            activationPhaseCounts: phaseCounts(evaluations),
            firstReadyEvaluation: evaluations.find(({ phase }) =>
                phase === "building_ready" || phase === "blocker_ready",
            ) ?? null,
            lastActivationEvaluation: evaluations[evaluations.length - 1] ?? null,
            selectedTelemetry: selectedEvents,
            candidateSelfSnapshots: first.snapshots,
            validationErrors,
            passed: validationErrors.length === 0,
            outcomeFree: true,
        });
    }
    const manifest = createExperimentManifest({
        runId: `mission-native-closeout-activation-diagnostic-v1-${process.env.SLURM_JOB_ID ?? "local"}`,
        mixDir: path.join(process.cwd(), "data"),
        maps: [mapName],
        effectiveConfig: {
            purpose: "outcome-free-mission-native-closeout-activation-diagnostic-v1",
            schemaVersion: MISSION_NATIVE_CLOSEOUT_ACTIVATION_DIAGNOSTIC_V1_SCHEMA_VERSION,
            policyId: missionNativeCloseoutPolicyV23Sha256(policy),
            countries: MISSION_NATIVE_CLOSEOUT_ACTIVATION_DIAGNOSTIC_V1_COUNTRIES,
            candidateSlot: 0,
            freshProcessRepeats: 2,
            maxTicks: MISSION_NATIVE_CLOSEOUT_COMPATIBILITY_MAX_TICKS,
            outcomeInspection: false,
        },
        baseline: factory.descriptor,
        gameSeedBase: MISSION_NATIVE_CLOSEOUT_ACTIVATION_DIAGNOSTIC_V1_ENGINE_SEED_BASE,
    });
    if (
        manifest.scheduler.account !== "pi_jss233" || manifest.source.gitBranch !== "main" ||
        manifest.source.trackedDirty !== false || manifest.software.baseline.kind !== "external-package" ||
        manifest.software.baseline.trackedDirty !== false || rows.length !== 2
    ) throw new Error("Activation diagnostic V1 provenance or coverage failed");
    const passed = rows.every((row) => row.passed === true);
    const output = {
        schemaVersion: MISSION_NATIVE_CLOSEOUT_ACTIVATION_DIAGNOSTIC_V1_SCHEMA_VERSION,
        status: passed
            ? "PASS_OUTCOME_FREE_MISSION_NATIVE_CLOSEOUT_ACTIVATION_DIAGNOSTIC_V1"
            : "FAIL_OUTCOME_FREE_MISSION_NATIVE_CLOSEOUT_ACTIVATION_DIAGNOSTIC_V1",
        generatedAt: new Date().toISOString(),
        passed,
        outcomeFree: true,
        gameCount: 4,
        sourceGitCommit: manifest.source.gitCommit,
        scheduler: manifest.scheduler,
        externalBaseline: manifest.software.baseline,
        policyId: missionNativeCloseoutPolicyV23Sha256(policy),
        maxTicks: MISSION_NATIVE_CLOSEOUT_COMPATIBILITY_MAX_TICKS,
        rows,
    };
    fs.mkdirSync(path.dirname(outFile), { recursive: true, mode: 0o700 });
    fs.writeFileSync(outFile, JSON.stringify(output, null, 2) + "\n", { flag: "wx", mode: 0o600 });
    console.log(JSON.stringify({
        outFile,
        sha256: sha256File(outFile),
        status: output.status,
        observed: rows.map((row) => ({
            country: row.country,
            phases: row.activationPhaseCounts,
            firstReady: row.firstReadyEvaluation,
            lastEvaluation: row.lastActivationEvaluation,
            quitAttempts: row.quitAttempts,
        })),
    }));
    if (!passed) throw new Error("Activation diagnostic V1 failed its outcome-blind technical contract");
};

const invoked = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (import.meta.url === invoked) main().catch((error) => { console.error(error); process.exitCode = 1; });
