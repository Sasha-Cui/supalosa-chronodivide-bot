import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { cdapi } from "@chronodivide/game-api";
import { Countries } from "@supalosa/chronodivide-bot/dist/bot/logic/common/utils.js";
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
    validateMissionNativeCloseoutV35ObjectiveRaceTelemetry,
    validateMissionNativeCloseoutV35ProgressTelemetry,
    validateMissionNativeCloseoutV35QuitAudits,
} from "./missionNativeCloseoutAllCountryGateV35.js";
import {
    buildMissionNativeCloseoutPolicyV35,
    missionNativeCloseoutPolicyV35Sha256,
} from "./missionNativeCloseoutPolicyV35.js";

export const MISSION_NATIVE_CLOSEOUT_LIVENESS_SMOKE_V35_ENGINE_SEED_BASE = 4_294_875_000 as const;
export const MISSION_NATIVE_CLOSEOUT_LIVENESS_SMOKE_V35_CELLS = Object.freeze([
    { country: Countries.GERMANY, candidateSlot: 0 as const },
    { country: Countries.LIBYA, candidateSlot: 0 as const },
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

const main = async (): Promise<void> => {
    const repoRoot = path.resolve(process.cwd(), "..", "..");
    const outFile = requiredPath("OUT_FILE");
    if (fs.existsSync(outFile)) throw new Error(`Refusing to overwrite ${outFile}`);
    if (!process.env.BASELINE_PACKAGE_ROOT || process.env.REQUIRE_EXTERNAL_BASELINE !== "true") {
        throw new Error("V35 liveness smoke requires the pinned external baseline");
    }
    const mapName = "simple-1v1-no-preview.map";
    if (sha256File(path.join(process.cwd(), "data", mapName)) !== METHOD_V5_EQUIVALENCE_MAP_SHA256) {
        throw new Error("V35 liveness smoke map bytes drifted");
    }
    const factory = await loadBaselineFactory(path.join(repoRoot, "packages", "chronodivide-bot"));
    const disabledPolicy = buildMissionNativeCloseoutPolicyV35(false);
    const enabledPolicy = buildMissionNativeCloseoutPolicyV35(true);
    const rows: Array<Record<string, unknown>> = [];
    await cdapi.init(path.join(process.cwd(), "data"));
    for (const [index, cell] of MISSION_NATIVE_CLOSEOUT_LIVENESS_SMOKE_V35_CELLS.entries()) {
        const requestedEngineSeed = derivePairedEngineSeed(
            MISSION_NATIVE_CLOSEOUT_LIVENESS_SMOKE_V35_ENGINE_SEED_BASE,
            index,
        );
        const direct = await runMissionNativeCloseoutTrace({
            factory, mapName, requestedEngineSeed, policy: null, ...cell,
        });
        const disabled = await runMissionNativeCloseoutTrace({
            factory, mapName, requestedEngineSeed, policy: disabledPolicy, ...cell,
        });
        const first = await runMissionNativeCloseoutTrace({
            factory, mapName, requestedEngineSeed, policy: enabledPolicy, ...cell,
        });
        const repeat = await runMissionNativeCloseoutTrace({
            factory, mapName, requestedEngineSeed, policy: enabledPolicy, ...cell,
        });
        const validationErrors: string[] = [];
        const directSha256 = traceDigest(direct, false);
        const disabledSha256 = traceDigest(disabled, false);
        const firstSha256 = traceDigest(first, true);
        const repeatSha256 = traceDigest(repeat, true);
        if (directSha256 !== disabledSha256) validationErrors.push("disabled V35 smoke trace drifted");
        if (disabled.telemetry.length !== 0) validationErrors.push("disabled V35 smoke emitted telemetry");
        for (const [label, trace] of [["first", first], ["repeat", repeat]] as const) {
            try {
                validateMissionNativeCloseoutV35ObjectiveRaceTelemetry(trace.telemetry);
                validateMissionNativeCloseoutV35ProgressTelemetry(trace.telemetry);
            } catch (error) {
                validationErrors.push(`${label}: ${error instanceof Error ? error.message : String(error)}`);
            }
        }
        if (firstSha256 !== repeatSha256) validationErrors.push("same-seed V35 smoke mismatch");
        validationErrors.push(...validateMissionNativeCloseoutV35QuitAudits(
            direct.quitAttempts, disabled.quitAttempts, first.quitAttempts, repeat.quitAttempts,
        ));
        const progress = first.telemetry.filter(({ event }) => event === "objective_physical_progress");
        const deadlines = first.telemetry.filter(({ event }) => event === "objective_progress_deadline");
        rows.push({
            ...cell,
            requestedEngineSeed,
            passed: validationErrors.length === 0,
            directSha256,
            disabledSha256,
            firstSha256,
            repeatSha256,
            physicalProgressEventCount: progress.length,
            fallbackStartedCount: deadlines.filter((event) =>
                event.event === "objective_progress_deadline" && event.phase === "fallback_started",
            ).length,
            fallbackActiveCount: deadlines.filter((event) =>
                event.event === "objective_progress_deadline" && event.phase === "fallback_active",
            ).length,
            replanStartedCount: deadlines.filter((event) =>
                event.event === "objective_progress_deadline" && event.phase === "replan_started",
            ).length,
            activePredecessorFallbackEventCount: deadlines.filter((event) =>
                event.event === "objective_progress_deadline" && event.phase === "fallback_active" &&
                event.activePredecessorMissionNames.length > 0,
            ).length,
            overlaySuspensionEventCount: deadlines.filter((event) =>
                event.event === "objective_progress_deadline" && event.phase === "fallback_active" &&
                event.suspendedOverlayMissionNames.length > 0,
            ).length,
            validationErrors,
            telemetry: first.telemetry,
            outcomeFree: true,
        });
    }
    const total = (key: string): number => rows.reduce((sum, row) => sum + Number(row[key]), 0);
    const globalValidationErrors: string[] = [];
    for (const key of [
        "physicalProgressEventCount", "fallbackStartedCount", "fallbackActiveCount", "replanStartedCount",
        "activePredecessorFallbackEventCount", "overlaySuspensionEventCount",
    ]) {
        if (total(key) === 0) globalValidationErrors.push(`V35 liveness smoke never exposed ${key}`);
    }
    const manifest = createExperimentManifest({
        runId: `mission-native-closeout-liveness-smoke-v35-${process.env.SLURM_JOB_ID ?? "local"}`,
        mixDir: path.join(process.cwd(), "data"),
        maps: [mapName],
        effectiveConfig: {
            purpose: "outcome-free-mission-native-closeout-liveness-smoke-v35",
            cells: MISSION_NATIVE_CLOSEOUT_LIVENESS_SMOKE_V35_CELLS,
            tracesPerCell: 4,
            maxTicks: MISSION_NATIVE_CLOSEOUT_COMPATIBILITY_MAX_TICKS,
            outcomeInspection: false,
        },
        baseline: factory.descriptor,
        gameSeedBase: MISSION_NATIVE_CLOSEOUT_LIVENESS_SMOKE_V35_ENGINE_SEED_BASE,
    });
    if (
        manifest.scheduler.account !== "pi_jss233" || manifest.source.gitBranch !== "main" ||
        manifest.source.trackedDirty !== false || manifest.software.baseline.kind !== "external-package" ||
        manifest.software.baseline.trackedDirty !== false || rows.length !== 2
    ) throw new Error("V35 liveness smoke provenance failed");
    const passed = rows.every((row) => row.passed === true) && globalValidationErrors.length === 0;
    const output = {
        schemaVersion: 1,
        status: passed ? "PASS_OUTCOME_FREE_V35_LIVENESS_SMOKE" : "FAIL_OUTCOME_FREE_V35_LIVENESS_SMOKE",
        passed,
        outcomeFree: true,
        sourceGitCommit: manifest.source.gitCommit,
        scheduler: manifest.scheduler,
        externalBaseline: manifest.software.baseline,
        disabledPolicyId: missionNativeCloseoutPolicyV35Sha256(disabledPolicy),
        enabledPolicyId: missionNativeCloseoutPolicyV35Sha256(enabledPolicy),
        gameCount: rows.length * 4,
        globalValidationErrors,
        aggregate: Object.fromEntries([
            "physicalProgressEventCount", "fallbackStartedCount", "fallbackActiveCount", "replanStartedCount",
            "activePredecessorFallbackEventCount", "overlaySuspensionEventCount",
        ].map((key) => [key, total(key)])),
        rows,
    };
    fs.mkdirSync(path.dirname(outFile), { recursive: true, mode: 0o700 });
    fs.writeFileSync(outFile, JSON.stringify(output, null, 2) + "\n", { flag: "wx", mode: 0o600 });
    console.log(JSON.stringify({ outFile, sha256: sha256File(outFile), ...output, rows: undefined }));
    if (!passed) throw new Error("V35 liveness smoke failed; preserved complete outcome-free artifact");
};

const invoked = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (import.meta.url === invoked) main().catch((error) => { console.error(error); process.exitCode = 1; });
