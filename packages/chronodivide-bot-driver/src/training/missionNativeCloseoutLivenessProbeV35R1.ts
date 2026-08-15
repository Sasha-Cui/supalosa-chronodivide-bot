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

export const MISSION_NATIVE_CLOSEOUT_LIVENESS_PROBE_V35_R1_CELL = Object.freeze({
    country: Countries.GERMANY,
    candidateSlot: 0 as const,
    requestedEngineSeed: 4_294_850_006,
});

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

const main = async (): Promise<void> => {
    const repoRoot = path.resolve(process.cwd(), "..", "..");
    const outFile = requiredPath("OUT_FILE");
    if (fs.existsSync(outFile)) throw new Error(`Refusing to overwrite ${outFile}`);
    if (!process.env.BASELINE_PACKAGE_ROOT || process.env.REQUIRE_EXTERNAL_BASELINE !== "true") {
        throw new Error("V35-R1 liveness probe requires the pinned external baseline");
    }
    const mapName = "simple-1v1-no-preview.map";
    if (sha256File(path.join(process.cwd(), "data", mapName)) !== METHOD_V5_EQUIVALENCE_MAP_SHA256) {
        throw new Error("V35-R1 liveness probe map bytes drifted");
    }
    const factory = await loadBaselineFactory(path.join(repoRoot, "packages", "chronodivide-bot"));
    const disabledPolicy = buildMissionNativeCloseoutPolicyV35(false);
    const enabledPolicy = buildMissionNativeCloseoutPolicyV35(true);
    await cdapi.init(path.join(process.cwd(), "data"));
    const args = {
        factory,
        mapName,
        requestedEngineSeed: MISSION_NATIVE_CLOSEOUT_LIVENESS_PROBE_V35_R1_CELL.requestedEngineSeed,
        country: MISSION_NATIVE_CLOSEOUT_LIVENESS_PROBE_V35_R1_CELL.country,
        candidateSlot: MISSION_NATIVE_CLOSEOUT_LIVENESS_PROBE_V35_R1_CELL.candidateSlot,
    };
    const direct = await runMissionNativeCloseoutTrace({ ...args, policy: null });
    const disabled = await runMissionNativeCloseoutTrace({ ...args, policy: disabledPolicy });
    const first = await runMissionNativeCloseoutTrace({ ...args, policy: enabledPolicy });
    const repeat = await runMissionNativeCloseoutTrace({ ...args, policy: enabledPolicy });
    const validationErrors: string[] = [];
    const directSha256 = traceDigest(direct, false);
    const disabledSha256 = traceDigest(disabled, false);
    const firstSha256 = traceDigest(first, true);
    const repeatSha256 = traceDigest(repeat, true);
    if (directSha256 !== disabledSha256) validationErrors.push("disabled V35-R1 probe trace drifted");
    if (disabled.telemetry.length !== 0) validationErrors.push("disabled V35-R1 probe emitted telemetry");
    for (const [label, trace] of [["first", first], ["repeat", repeat]] as const) {
        try {
            validateMissionNativeCloseoutV35ObjectiveRaceTelemetry(trace.telemetry);
            validateMissionNativeCloseoutV35ProgressTelemetry(trace.telemetry);
        } catch (error) {
            validationErrors.push(`${label}: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    if (firstSha256 !== repeatSha256) validationErrors.push("same-seed V35-R1 probe mismatch");
    validationErrors.push(...validateMissionNativeCloseoutV35QuitAudits(
        direct.quitAttempts, disabled.quitAttempts, first.quitAttempts, repeat.quitAttempts,
    ));
    const deadlines = eventsOf(first.telemetry, "objective_progress_deadline");
    const starts = deadlines.filter(({ phase }) => phase === "fallback_started");
    const active = deadlines.filter(({ phase }) => phase === "fallback_active");
    const replans = deadlines.filter(({ phase }) => phase === "replan_started");
    if (starts.length === 0 || starts.some(({ reason, deadlineTicks }) =>
        reason !== "building_no_progress" || deadlineTicks !== 300
    )) validationErrors.push("V35-R1 probe did not expose the frozen building deadline");
    if (!active.some(({ activePredecessorMissionNames }) => activePredecessorMissionNames.length > 0)) {
        validationErrors.push("V35-R1 probe did not yield to a unit-owning predecessor attack mission");
    }
    if (!active.some(({ suspendedOverlayMissionNames }) => suspendedOverlayMissionNames.length > 0)) {
        validationErrors.push("V35-R1 probe did not suspend the closeout overlay");
    }
    if (replans.length === 0) validationErrors.push("V35-R1 probe did not replan after fallback");
    const manifest = createExperimentManifest({
        runId: `mission-native-closeout-liveness-probe-v35-r1-${process.env.SLURM_JOB_ID ?? "local"}`,
        mixDir: path.join(process.cwd(), "data"),
        maps: [mapName],
        effectiveConfig: {
            purpose: "outcome-free-mission-native-closeout-liveness-probe-v35-r1",
            cell: MISSION_NATIVE_CLOSEOUT_LIVENESS_PROBE_V35_R1_CELL,
            traces: 4,
            maxTicks: MISSION_NATIVE_CLOSEOUT_COMPATIBILITY_MAX_TICKS,
            selectionEvidence: "V34-R1 job 22262232 outcome-free telemetry",
            outcomeInspection: false,
        },
        baseline: factory.descriptor,
        gameSeedBase: MISSION_NATIVE_CLOSEOUT_LIVENESS_PROBE_V35_R1_CELL.requestedEngineSeed,
    });
    if (
        manifest.scheduler.account !== "pi_jss233" || manifest.source.gitBranch !== "main" ||
        manifest.source.trackedDirty !== false || manifest.software.baseline.kind !== "external-package" ||
        manifest.software.baseline.trackedDirty !== false
    ) throw new Error("V35-R1 liveness probe provenance failed");
    const passed = validationErrors.length === 0;
    const output = {
        schemaVersion: 1,
        gateRevision: "V35-R1",
        status: passed ? "PASS_OUTCOME_FREE_V35_R1_LIVENESS_PROBE" : "FAIL_OUTCOME_FREE_V35_R1_LIVENESS_PROBE",
        passed,
        outcomeFree: true,
        sourceGitCommit: manifest.source.gitCommit,
        scheduler: manifest.scheduler,
        externalBaseline: manifest.software.baseline,
        disabledPolicyId: missionNativeCloseoutPolicyV35Sha256(disabledPolicy),
        enabledPolicyId: missionNativeCloseoutPolicyV35Sha256(enabledPolicy),
        cell: MISSION_NATIVE_CLOSEOUT_LIVENESS_PROBE_V35_R1_CELL,
        gameCount: 4,
        directSha256,
        disabledSha256,
        firstSha256,
        repeatSha256,
        physicalProgressEventCount: first.telemetry.filter(({ event }) =>
            event === "objective_physical_progress").length,
        fallbackStartedCount: starts.length,
        fallbackActiveCount: active.length,
        replanStartedCount: replans.length,
        activePredecessorFallbackEventCount: active.filter(({ activePredecessorMissionNames }) =>
            activePredecessorMissionNames.length > 0).length,
        overlaySuspensionEventCount: active.filter(({ suspendedOverlayMissionNames }) =>
            suspendedOverlayMissionNames.length > 0).length,
        validationErrors,
        telemetry: first.telemetry,
    };
    fs.mkdirSync(path.dirname(outFile), { recursive: true, mode: 0o700 });
    fs.writeFileSync(outFile, JSON.stringify(output, null, 2) + "\n", { flag: "wx", mode: 0o600 });
    console.log(JSON.stringify({ ...output, telemetry: undefined, sha256: sha256File(outFile) }));
    if (!passed) throw new Error("V35-R1 liveness probe failed; preserved complete outcome-free artifact");
};

const invoked = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (import.meta.url === invoked) main().catch((error) => { console.error(error); process.exitCode = 1; });
