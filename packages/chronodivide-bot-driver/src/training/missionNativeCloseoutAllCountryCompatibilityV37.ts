import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { cdapi } from "@chronodivide/game-api";
import { Countries } from "@supalosa/chronodivide-bot/dist/bot/logic/common/utils.js";
import { loadBaselineFactory } from "../benchmark/baselineLoader.js";
import { createExperimentManifest } from "../benchmark/provenance.js";
import { METHOD_V5_EQUIVALENCE_MAP_SHA256 } from "./methodV5BaselineEquivalence.js";
import { sha256File } from "./methodV5PlanRunner.js";
import { MissionNativeCloseoutRunTrace, runMissionNativeCloseoutTrace } from
    "./missionNativeCloseoutCompatibilityGate.js";
import {
    summarizeMissionNativeCloseoutAllCountryV35Coverage,
    validateMissionNativeCloseoutV35ObjectiveRaceTelemetry,
} from "./missionNativeCloseoutAllCountryGateV35.js";
import { validateMissionNativeCloseoutFocusedGateV29Telemetry } from
    "./missionNativeCloseoutFocusedGateV29.js";
import {
    MissionNativeCloseoutV37ProgressSummary,
    validateMissionNativeCloseoutV37ProgressTelemetry,
} from "./missionNativeCloseoutGateV37.js";
import {
    buildMissionNativeCloseoutPolicyV37,
    missionNativeCloseoutPolicyV37Sha256,
} from "./missionNativeCloseoutPolicyV37.js";

export const MISSION_NATIVE_CLOSEOUT_V37_COMPATIBILITY_SEED_BASE = 4_294_950_000 as const;
export const MISSION_NATIVE_CLOSEOUT_V37_COMPATIBILITY_MAX_TICKS = 5_400 as const;
export const MISSION_NATIVE_CLOSEOUT_V37_COMPATIBILITY_COUNTRIES = [
    Countries.USA,
    Countries.KOREA,
    Countries.FRANCE,
    Countries.GERMANY,
    Countries.GREAT_BRITAIN,
    Countries.LIBYA,
    Countries.IRAQ,
    Countries.CUBA,
    Countries.RUSSIA,
] as const;
export const MISSION_NATIVE_CLOSEOUT_V37_COMPATIBILITY_CELL_COUNT =
    MISSION_NATIVE_CLOSEOUT_V37_COMPATIBILITY_COUNTRIES.length * 2;

const requiredPath = (name: string): string => {
    const value = process.env[name];
    if (!value) throw new Error(`${name} is required`);
    return path.resolve(value);
};
const requiredTaskIndex = (): number => {
    const raw = process.env.SLURM_ARRAY_TASK_ID;
    const value = raw === undefined ? Number.NaN : Number(raw);
    if (!Number.isSafeInteger(value) || value < 0 || value >= MISSION_NATIVE_CLOSEOUT_V37_COMPATIBILITY_CELL_COUNT) {
        throw new Error("SLURM_ARRAY_TASK_ID must select one V37 country-slot cell");
    }
    return value;
};
const digest = (value: unknown): string => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const traceDigest = (trace: MissionNativeCloseoutRunTrace, includeTelemetry: boolean): string => digest({
    actions: trace.actions,
    snapshots: trace.snapshots,
    quitAttempts: trace.quitAttempts,
    observedTicks: trace.observedTicks,
    engineFinishObservedAtTick: trace.engineFinishObservedAtTick,
    ...(includeTelemetry ? { telemetry: trace.telemetry } : {}),
});
const errorMessage = (error: unknown): string => error instanceof Error ? error.message : String(error);
const validateTrace = (
    label: string,
    trace: MissionNativeCloseoutRunTrace,
    country: Countries,
    validationErrors: string[],
): MissionNativeCloseoutV37ProgressSummary | null => {
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
        validationErrors.push(`${label} V29 mechanism telemetry: ${errorMessage(error)}`);
    }
    try {
        validateMissionNativeCloseoutV35ObjectiveRaceTelemetry(trace.telemetry);
    } catch (error) {
        validationErrors.push(`${label} objective-race telemetry: ${errorMessage(error)}`);
    }
    try {
        return validateMissionNativeCloseoutV37ProgressTelemetry(trace.telemetry, trace.observedTicks);
    } catch (error) {
        validationErrors.push(`${label} V37 progress telemetry: ${errorMessage(error)}`);
        return null;
    }
};

const main = async (): Promise<void> => {
    const taskIndex = requiredTaskIndex();
    const outFile = requiredPath("OUT_FILE");
    if (fs.existsSync(outFile)) throw new Error(`Refusing to overwrite ${outFile}`);
    if (!process.env.BASELINE_PACKAGE_ROOT || process.env.REQUIRE_EXTERNAL_BASELINE !== "true") {
        throw new Error("V37-C1 compatibility probe requires the pinned external baseline");
    }
    const repoRoot = path.resolve(process.cwd(), "..", "..");
    const mapName = "simple-1v1-no-preview.map";
    if (sha256File(path.join(process.cwd(), "data", mapName)) !== METHOD_V5_EQUIVALENCE_MAP_SHA256) {
        throw new Error("V37-C1 compatibility probe map bytes drifted");
    }
    const country = MISSION_NATIVE_CLOSEOUT_V37_COMPATIBILITY_COUNTRIES[Math.floor(taskIndex / 2)];
    const candidateSlot = taskIndex % 2 as 0 | 1;
    const requestedEngineSeed = MISSION_NATIVE_CLOSEOUT_V37_COMPATIBILITY_SEED_BASE + taskIndex;
    const factory = await loadBaselineFactory(path.join(repoRoot, "packages", "chronodivide-bot"));
    const disabledPolicy = buildMissionNativeCloseoutPolicyV37(false);
    const policy = buildMissionNativeCloseoutPolicyV37(true);
    await cdapi.init(path.join(process.cwd(), "data"));
    const args = {
        factory,
        mapName,
        requestedEngineSeed,
        country,
        candidateSlot,
        policy,
        maxTicks: MISSION_NATIVE_CLOSEOUT_V37_COMPATIBILITY_MAX_TICKS,
        allowOutcomeFreeEngineFinishTruncation: true,
    };
    const direct = await runMissionNativeCloseoutTrace({ ...args, policy: null });
    const disabled = await runMissionNativeCloseoutTrace({ ...args, policy: disabledPolicy });
    const first = await runMissionNativeCloseoutTrace(args);
    const repeat = await runMissionNativeCloseoutTrace(args);
    const validationErrors: string[] = [];
    const firstProgress = validateTrace("first", first, country, validationErrors);
    const repeatProgress = validateTrace("repeat", repeat, country, validationErrors);
    const directSha256 = traceDigest(direct, false);
    const disabledSha256 = traceDigest(disabled, false);
    const firstSha256 = traceDigest(first, true);
    const repeatSha256 = traceDigest(repeat, true);
    if (directSha256 !== disabledSha256 || disabled.telemetry.length !== 0) {
        validationErrors.push("disabled V37-C1 control drifted from exact Supalosa");
    }
    if (firstSha256 !== repeatSha256) validationErrors.push("same-seed V37-C1 traces differ");
    if (
        first.observedTicks !== repeat.observedTicks ||
        first.engineFinishObservedAtTick !== repeat.engineFinishObservedAtTick
    ) validationErrors.push("same-seed V37-C1 trace boundaries differ");
    const enabledChangedCommands = digest(first.actions) !== digest(direct.actions);
    if (!enabledChangedCommands) validationErrors.push("enabled V37-C1 policy did not change commands");
    const control: {
        directSha256: string;
        disabledSha256: string;
        directObservedTicks: number;
        disabledObservedTicks: number;
        directEngineFinishObservedAtTick: number | null;
        disabledEngineFinishObservedAtTick: number | null;
        directSuppressedQuitAttempts: MissionNativeCloseoutRunTrace["quitAttempts"];
        disabledSuppressedQuitAttempts: MissionNativeCloseoutRunTrace["quitAttempts"];
    } = {
        directSha256,
        disabledSha256,
        directObservedTicks: direct.observedTicks,
        disabledObservedTicks: disabled.observedTicks,
        directEngineFinishObservedAtTick: direct.engineFinishObservedAtTick,
        disabledEngineFinishObservedAtTick: disabled.engineFinishObservedAtTick,
        directSuppressedQuitAttempts: direct.quitAttempts,
        disabledSuppressedQuitAttempts: disabled.quitAttempts,
    };
    const manifest = createExperimentManifest({
        runId: `mission-native-closeout-v37-c1-exposure-${process.env.SLURM_ARRAY_JOB_ID ?? "local"}-${taskIndex}`,
        mixDir: path.join(process.cwd(), "data"),
        maps: [mapName],
        effectiveConfig: {
            purpose: "outcome-free-mission-native-closeout-v37-c1-all-country-compatibility",
            taskIndex,
            country,
            candidateSlot,
            requestedEngineSeed,
            traces: 4,
            maxTicks: MISSION_NATIVE_CLOSEOUT_V37_COMPATIBILITY_MAX_TICKS,
            engineFinishAccess: "predicate-only-technical-censoring",
            outcomeInspection: false,
        },
        baseline: factory.descriptor,
        gameSeedBase: requestedEngineSeed,
    });
    if (
        manifest.scheduler.account !== "pi_jss233" || manifest.source.gitBranch !== "main" ||
        manifest.source.trackedDirty !== false || manifest.software.baseline.kind !== "external-package" ||
        manifest.software.baseline.trackedDirty !== false
    ) throw new Error("V37-C1 compatibility probe provenance failed");
    const passed = validationErrors.length === 0;
    const coverage = summarizeMissionNativeCloseoutAllCountryV35Coverage(
        first.telemetry,
        country,
        candidateSlot,
        passed,
    );
    const output = {
        schemaVersion: 1,
        gateRevision: "V37-C1",
        status: passed
            ? "PASS_OUTCOME_FREE_V37_C1_COMPATIBILITY_CELL"
            : "FAIL_OUTCOME_FREE_V37_C1_COMPATIBILITY_CELL",
        passed,
        outcomeFree: true,
        sourceGitCommit: manifest.source.gitCommit,
        scheduler: manifest.scheduler,
        externalBaseline: manifest.software.baseline,
        disabledPolicyId: missionNativeCloseoutPolicyV37Sha256(disabledPolicy),
        enabledPolicyId: missionNativeCloseoutPolicyV37Sha256(policy),
        taskIndex,
        country,
        candidateSlot,
        requestedEngineSeed,
        maxTicks: MISSION_NATIVE_CLOSEOUT_V37_COMPATIBILITY_MAX_TICKS,
        gameCount: 4,
        firstSha256,
        repeatSha256,
        firstBoundary: {
            observedTicks: first.observedTicks,
            engineFinishObservedAtTick: first.engineFinishObservedAtTick,
        },
        repeatBoundary: {
            observedTicks: repeat.observedTicks,
            engineFinishObservedAtTick: repeat.engineFinishObservedAtTick,
        },
        suppressedQuitAttempts: {
            first: first.quitAttempts,
            repeat: repeat.quitAttempts,
        },
        enabledChangedCommands,
        control,
        coverage,
        firstProgress,
        repeatProgress,
        fallbackStartedCount: first.telemetry.filter((event) =>
            event.event === "objective_progress_deadline" && event.phase === "fallback_started").length,
        validationErrors,
        telemetry: first.telemetry,
        outcomeFieldsEmitted: [],
    };
    fs.mkdirSync(path.dirname(outFile), { recursive: true, mode: 0o700 });
    fs.writeFileSync(outFile, JSON.stringify(output, null, 2) + "\n", { flag: "wx", mode: 0o600 });
    console.log(JSON.stringify({ ...output, telemetry: undefined, sha256: sha256File(outFile) }));
    if (!passed) throw new Error("V37-C1 cell failed; preserved complete outcome-free artifact");
};

const invoked = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (import.meta.url === invoked) main().catch((error) => { console.error(error); process.exitCode = 1; });
