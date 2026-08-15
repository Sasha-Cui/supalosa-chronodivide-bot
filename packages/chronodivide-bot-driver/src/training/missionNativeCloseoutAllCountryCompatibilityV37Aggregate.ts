import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { sha256File } from "./methodV5PlanRunner.js";
import { BuildingEliminationTelemetryEvent } from
    "@supalosa/chronodivide-bot/dist/bot/logic/mission/missions/buildingEliminationMission.js";
import {
    MISSION_NATIVE_CLOSEOUT_V37_COMPATIBILITY_CELL_COUNT,
    MISSION_NATIVE_CLOSEOUT_V37_COMPATIBILITY_COUNTRIES,
    MISSION_NATIVE_CLOSEOUT_V37_COMPATIBILITY_MAX_TICKS,
    MISSION_NATIVE_CLOSEOUT_V37_COMPATIBILITY_SEED_BASE,
} from "./missionNativeCloseoutAllCountryCompatibilityV37.js";
import {
    MissionNativeCloseoutAllCountryV35CoverageRow,
    summarizeMissionNativeCloseoutAllCountryV35Coverage,
    validateMissionNativeCloseoutAllCountryV35Coverage,
} from "./missionNativeCloseoutAllCountryGateV35.js";
import {
    buildMissionNativeCloseoutPolicyV37,
    missionNativeCloseoutPolicyV37Sha256,
} from "./missionNativeCloseoutPolicyV37.js";

type RecordValue = Record<string, unknown>;
const isRecord = (value: unknown): value is RecordValue =>
    typeof value === "object" && value !== null && !Array.isArray(value);
const requiredPath = (name: string): string => {
    const value = process.env[name];
    if (!value) throw new Error(`${name} is required`);
    return path.resolve(value);
};
const requiredArrayJobId = (): string => {
    const value = process.env.ARRAY_JOB_ID;
    if (!value || !/^\d+$/.test(value)) throw new Error("ARRAY_JOB_ID must be numeric");
    return value;
};
const readJson = (filePath: string): unknown => JSON.parse(fs.readFileSync(filePath, "utf8"));
const findForbiddenKey = (value: unknown): string | null => {
    if (Array.isArray(value)) {
        for (const item of value) {
            const found = findForbiddenKey(item);
            if (found) return found;
        }
        return null;
    }
    if (!isRecord(value)) return null;
    for (const [key, item] of Object.entries(value)) {
        if (/winner|candidateScore|outcomeStatus|terminalBuildingCounts|candidateWins|baselineWins|draws/i.test(key)) {
            return key;
        }
        const found = findForbiddenKey(item);
        if (found) return found;
    }
    return null;
};

type SchedulerTask = { schedulerJobId: string };
const parseSacct = (raw: string, arrayJobId: string): Map<number, SchedulerTask> => {
    const tasks = new Map<number, SchedulerTask>();
    for (const [lineIndex, line] of raw.split("\n").entries()) {
        if (!line) continue;
        const [logicalJobId, schedulerJobId, state, exitCode, account, extra] = line.split("|");
        const match = new RegExp(`^${arrayJobId}_(\\d+)$`).exec(logicalJobId);
        const taskIndex = match ? Number(match[1]) : -1;
        if (
            extra !== undefined || !match || !/^\d+$/.test(schedulerJobId) ||
            taskIndex < 0 || taskIndex >= MISSION_NATIVE_CLOSEOUT_V37_COMPATIBILITY_CELL_COUNT ||
            tasks.has(taskIndex) || state !== "COMPLETED" || exitCode !== "0:0" || account !== "pi_jss233"
        ) throw new Error(`V37-C1 scheduler row ${lineIndex + 1} is malformed, failed, duplicate, or unauthorized`);
        tasks.set(taskIndex, { schedulerJobId });
    }
    if (tasks.size !== MISSION_NATIVE_CLOSEOUT_V37_COMPATIBILITY_CELL_COUNT) {
        throw new Error(`V37-C1 scheduler returned ${tasks.size}/${MISSION_NATIVE_CLOSEOUT_V37_COMPATIBILITY_CELL_COUNT} tasks`);
    }
    return tasks;
};

const checkedCount = (record: RecordValue, key: string, taskIndex: number): number => {
    const value = record[key];
    if (!Number.isSafeInteger(value) || (value as number) < 0) {
        throw new Error(`V37-C1 task ${taskIndex} has invalid ${key}`);
    }
    return value as number;
};

type QuitAudit = { candidate: number; baseline: number };
const validateQuitAudit = (value: unknown, label: string): QuitAudit => {
    if (!isRecord(value)) throw new Error(`${label} is missing`);
    const candidate = value.candidate;
    const baseline = value.baseline;
    if (
        !Number.isSafeInteger(candidate) || (candidate as number) < 0 ||
        !Number.isSafeInteger(baseline) || (baseline as number) < 0
    ) throw new Error(`${label} is invalid`);
    return { candidate: candidate as number, baseline: baseline as number };
};

const validateBoundary = (value: unknown, label: string): { engineFinished: boolean } => {
    if (!isRecord(value)) throw new Error(`${label} is missing`);
    const observedTicks = value.observedTicks;
    const engineFinishObservedAtTick = value.engineFinishObservedAtTick;
    if (!Number.isSafeInteger(observedTicks) || (observedTicks as number) < 1 ||
        (observedTicks as number) > MISSION_NATIVE_CLOSEOUT_V37_COMPATIBILITY_MAX_TICKS) {
        throw new Error(`${label} observedTicks is invalid`);
    }
    if (engineFinishObservedAtTick === null) {
        if (observedTicks !== MISSION_NATIVE_CLOSEOUT_V37_COMPATIBILITY_MAX_TICKS) {
            throw new Error(`${label} stopped without a cap or engine-finish boundary`);
        }
        return { engineFinished: false };
    }
    if (
        !Number.isSafeInteger(engineFinishObservedAtTick) ||
        engineFinishObservedAtTick !== (observedTicks as number) + 1 ||
        (engineFinishObservedAtTick as number) > MISSION_NATIVE_CLOSEOUT_V37_COMPATIBILITY_MAX_TICKS
    ) throw new Error(`${label} engine-finish censoring boundary is invalid`);
    return { engineFinished: true };
};

export const meetsMissionNativeCloseoutV37CompatibilityCoverageGate = (
    globalValidationErrors: readonly string[],
): boolean => globalValidationErrors.length === 0;

const main = (): void => {
    const evidenceRoot = requiredPath("EVIDENCE_ROOT");
    const outFile = requiredPath("OUT_FILE");
    const arrayJobId = requiredArrayJobId();
    if (fs.existsSync(outFile)) throw new Error(`Refusing to overwrite ${outFile}`);
    const gitCommit = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
    const gitBranch = execFileSync("git", ["branch", "--show-current"], { encoding: "utf8" }).trim();
    const dirty = execFileSync("git", ["status", "--short", "--untracked-files=no"], { encoding: "utf8" }).trim();
    if (gitBranch !== "main" || dirty) throw new Error("V37-C1 aggregate requires clean tracked main");
    const schedulerTasks = parseSacct(execFileSync(
        "/opt/slurm/current/bin/sacct",
        ["-j", arrayJobId, "-n", "-P", "-X", "--format=JobID,JobIDRaw,State,ExitCode,Account"],
        { encoding: "utf8" },
    ), arrayJobId);
    const expectedPolicyId = missionNativeCloseoutPolicyV37Sha256(buildMissionNativeCloseoutPolicyV37(true));
    const expectedDisabledPolicyId = missionNativeCloseoutPolicyV37Sha256(
        buildMissionNativeCloseoutPolicyV37(false),
    );
    const artifactCommitments: Array<{ taskIndex: number; path: string; sha256: string }> = [];
    const coverageRows: MissionNativeCloseoutAllCountryV35CoverageRow[] = [];
    let gameCount = 0;
    let predecessorOwnedFallbacks = 0;
    let noOwnerRecoveries = 0;
    let ownershipLossRecoveries = 0;
    let incompleteFallbacks = 0;
    let ownershipObservations = 0;
    let engineFinishedTraceCount = 0;
    let fallbackStartedCount = 0;
    let candidateSuppressedQuitAttempts = 0;
    let baselineSuppressedQuitAttempts = 0;
    for (let taskIndex = 0; taskIndex < MISSION_NATIVE_CLOSEOUT_V37_COMPATIBILITY_CELL_COUNT; taskIndex += 1) {
        const artifactPath = path.join(evidenceRoot, `${arrayJobId}_${taskIndex}`, "v37-compatibility.json");
        if (!fs.existsSync(artifactPath)) throw new Error(`V37-C1 task ${taskIndex} lacks its artifact`);
        const artifact = readJson(artifactPath);
        const scheduler = isRecord(artifact) && isRecord(artifact.scheduler) ? artifact.scheduler : null;
        const firstProgress = isRecord(artifact) && isRecord(artifact.firstProgress) ? artifact.firstProgress : null;
        const repeatProgress = isRecord(artifact) && isRecord(artifact.repeatProgress) ? artifact.repeatProgress : null;
        const expectedCountry = MISSION_NATIVE_CLOSEOUT_V37_COMPATIBILITY_COUNTRIES[Math.floor(taskIndex / 2)];
        const expectedSlot = taskIndex % 2;
        const expectedGames = 4;
        if (
            !isRecord(artifact) || artifact.schemaVersion !== 1 || artifact.gateRevision !== "V37-C1" ||
            artifact.status !== "PASS_OUTCOME_FREE_V37_C1_COMPATIBILITY_CELL" || artifact.passed !== true ||
            artifact.outcomeFree !== true || artifact.sourceGitCommit !== gitCommit ||
            artifact.enabledPolicyId !== expectedPolicyId || artifact.disabledPolicyId !== expectedDisabledPolicyId ||
            artifact.enabledChangedCommands !== true || artifact.taskIndex !== taskIndex ||
            artifact.country !== expectedCountry || artifact.candidateSlot !== expectedSlot ||
            artifact.requestedEngineSeed !== MISSION_NATIVE_CLOSEOUT_V37_COMPATIBILITY_SEED_BASE + taskIndex ||
            artifact.maxTicks !== MISSION_NATIVE_CLOSEOUT_V37_COMPATIBILITY_MAX_TICKS ||
            artifact.gameCount !== expectedGames || artifact.firstSha256 !== artifact.repeatSha256 ||
            !Array.isArray(artifact.validationErrors) || artifact.validationErrors.length !== 0 ||
            !Array.isArray(artifact.outcomeFieldsEmitted) || artifact.outcomeFieldsEmitted.length !== 0 ||
            !scheduler || scheduler.account !== "pi_jss233" ||
            String(scheduler.arrayJobId) !== arrayJobId || String(scheduler.arrayTaskId) !== String(taskIndex) ||
            scheduler.jobId !== schedulerTasks.get(taskIndex)?.schedulerJobId ||
            !firstProgress || !repeatProgress || JSON.stringify(firstProgress) !== JSON.stringify(repeatProgress) ||
            JSON.stringify(artifact.firstBoundary) !== JSON.stringify(artifact.repeatBoundary)
        ) throw new Error(`V37-C1 task ${taskIndex} artifact or provenance drifted`);
        const firstBoundary = validateBoundary(artifact.firstBoundary, `V37-C1 task ${taskIndex} first boundary`);
        validateBoundary(artifact.repeatBoundary, `V37-C1 task ${taskIndex} repeat boundary`);
        const suppressedQuitAttempts = isRecord(artifact.suppressedQuitAttempts)
            ? artifact.suppressedQuitAttempts
            : null;
        const firstQuitAudit = validateQuitAudit(
            suppressedQuitAttempts?.first,
            `V37-C1 task ${taskIndex} first suppressed quit audit`,
        );
        const repeatQuitAudit = validateQuitAudit(
            suppressedQuitAttempts?.repeat,
            `V37-C1 task ${taskIndex} repeat suppressed quit audit`,
        );
        if (JSON.stringify(firstQuitAudit) !== JSON.stringify(repeatQuitAudit)) {
            throw new Error(`V37-C1 task ${taskIndex} suppressed quit audits differ across repeats`);
        }
        candidateSuppressedQuitAttempts += firstQuitAudit.candidate;
        baselineSuppressedQuitAttempts += firstQuitAudit.baseline;
        engineFinishedTraceCount += firstBoundary.engineFinished ? 2 : 0;
        const control = isRecord(artifact.control) ? artifact.control : null;
        if (
            !control || control.directSha256 !== control.disabledSha256 ||
            control.directObservedTicks !== control.disabledObservedTicks ||
            control.directEngineFinishObservedAtTick !== control.disabledEngineFinishObservedAtTick ||
            JSON.stringify(validateQuitAudit(
                control.directSuppressedQuitAttempts,
                `V37-C1 task ${taskIndex} direct-control suppressed quit audit`,
            )) !== JSON.stringify(validateQuitAudit(
                control.disabledSuppressedQuitAttempts,
                `V37-C1 task ${taskIndex} disabled-control suppressed quit audit`,
            ))
        ) throw new Error(`V37-C1 task ${taskIndex} exact disabled control failed`);
        const controlBoundary = validateBoundary({
            observedTicks: control.directObservedTicks,
            engineFinishObservedAtTick: control.directEngineFinishObservedAtTick,
        }, `V37-C1 task ${taskIndex} direct control boundary`);
        engineFinishedTraceCount += controlBoundary.engineFinished ? 2 : 0;
        const forbidden = findForbiddenKey(artifact);
        if (forbidden) throw new Error(`V37-C1 artifact ${taskIndex} exposes forbidden key ${forbidden}`);
        gameCount += expectedGames;
        const cellPredecessorOwned = checkedCount(firstProgress, "predecessorOwnedFallbacks", taskIndex);
        const cellNoOwnerRecoveries = checkedCount(firstProgress, "noOwnerRecoveries", taskIndex);
        const cellOwnershipLossRecoveries = checkedCount(firstProgress, "ownershipLossRecoveries", taskIndex);
        const cellIncompleteFallbacks = checkedCount(firstProgress, "incompleteFallbacks", taskIndex);
        const cellFallbackStartedCount = checkedCount(artifact, "fallbackStartedCount", taskIndex);
        if (
            cellFallbackStartedCount !== cellPredecessorOwned + cellNoOwnerRecoveries +
                cellOwnershipLossRecoveries + cellIncompleteFallbacks
        ) throw new Error(`V37-C1 task ${taskIndex} has an uncategorized fallback interval`);
        predecessorOwnedFallbacks += cellPredecessorOwned;
        noOwnerRecoveries += cellNoOwnerRecoveries;
        ownershipLossRecoveries += cellOwnershipLossRecoveries;
        incompleteFallbacks += cellIncompleteFallbacks;
        fallbackStartedCount += cellFallbackStartedCount;
        ownershipObservations += checkedCount(firstProgress, "ownershipObservations", taskIndex);
        if (!Array.isArray(artifact.telemetry)) {
            throw new Error(`V37-C1 task ${taskIndex} telemetry is missing`);
        }
        const recomputedCoverage = summarizeMissionNativeCloseoutAllCountryV35Coverage(
            artifact.telemetry as BuildingEliminationTelemetryEvent[],
            expectedCountry,
            expectedSlot as 0 | 1,
            true,
        );
        if (JSON.stringify(artifact.coverage) !== JSON.stringify(recomputedCoverage)) {
            throw new Error(`V37-C1 task ${taskIndex} coverage summary drifted from telemetry`);
        }
        coverageRows.push(recomputedCoverage);
        artifactCommitments.push({ taskIndex, path: artifactPath, sha256: sha256File(artifactPath) });
    }
    const artifactCommitmentSha256 = crypto.createHash("sha256")
        .update(JSON.stringify(artifactCommitments))
        .digest("hex");
    const globalValidationErrors = validateMissionNativeCloseoutAllCountryV35Coverage(coverageRows);
    const passed = meetsMissionNativeCloseoutV37CompatibilityCoverageGate(globalValidationErrors);
    const output = {
        schemaVersion: 1,
        gateRevision: "V37-C1",
        status: passed
            ? "PASS_OUTCOME_FREE_V37_C1_ALL_COUNTRY_COMPATIBILITY"
            : "FAIL_OUTCOME_FREE_V37_C1_ALL_COUNTRY_COMPATIBILITY",
        passed,
        outcomeFree: true,
        sourceGitCommit: gitCommit,
        arrayJobId,
        schedulerAccount: "pi_jss233",
        schedulerJobIds: [...schedulerTasks.values()].map(({ schedulerJobId }) => schedulerJobId),
        cellCount: MISSION_NATIVE_CLOSEOUT_V37_COMPATIBILITY_CELL_COUNT,
        countryCount: MISSION_NATIVE_CLOSEOUT_V37_COMPATIBILITY_COUNTRIES.length,
        reciprocalSlotCount: 2,
        gameCount,
        disabledPolicyId: expectedDisabledPolicyId,
        enabledPolicyId: expectedPolicyId,
        predecessorOwnedFallbacks,
        noOwnerRecoveries,
        ownershipLossRecoveries,
        incompleteFallbacks,
        ownershipObservations,
        engineFinishedTraceCount,
        fallbackStartedCount,
        suppressedQuitAttempts: {
            candidate: candidateSuppressedQuitAttempts,
            baseline: baselineSuppressedQuitAttempts,
        },
        globalValidationErrors,
        mechanismCoverage: {
            compositionBlockedEvaluationCount: coverageRows.reduce(
                (total, row) => total + row.preterminalCompositionBlockedEvaluationCount,
                0,
            ),
            convertedAfterCompositionBlockCellCount: coverageRows.filter((row) =>
                row.firstPreterminalCompositionBlockedTick !== null && row.capabilityLaunchCount >= 1 &&
                row.launchTick !== null && row.launchTick > row.firstPreterminalCompositionBlockedTick &&
                row.launchCompositionReady === true && row.launchHandoffCount > 0 && row.buildingDamage > 0,
            ).length,
            launchHandoffCount: coverageRows.reduce((total, row) => total + row.launchHandoffCount, 0),
            buildingDamage: coverageRows.reduce((total, row) => total + row.buildingDamage, 0),
            productionFocusActiveCount: coverageRows.reduce(
                (total, row) => total + row.productionFocusActiveCount,
                0,
            ),
            exclusiveSchedulerEventCount: coverageRows.reduce(
                (total, row) => total + row.exclusiveSchedulerEventCount,
                0,
            ),
            objectiveRaceAllocationEventCount: coverageRows.reduce(
                (total, row) => total + row.objectiveRaceAllocationEventCount,
                0,
            ),
            boundedBlockerAllocationEventCount: coverageRows.reduce(
                (total, row) => total + row.boundedBlockerAllocationEventCount,
                0,
            ),
            buildingPhysicalProgressEventCount: coverageRows.reduce(
                (total, row) => total + row.buildingPhysicalProgressEventCount,
                0,
            ),
            blockerPhysicalProgressEventCount: coverageRows.reduce(
                (total, row) => total + row.blockerPhysicalProgressEventCount,
                0,
            ),
        },
        artifactCommitmentSha256,
        artifactCommitments,
        outcomeFieldsEmitted: [],
        authorizedNextPhase: passed ? "v37-open-development" : null,
    };
    fs.mkdirSync(path.dirname(outFile), { recursive: true, mode: 0o700 });
    fs.writeFileSync(outFile, JSON.stringify(output, null, 2) + "\n", { flag: "wx", mode: 0o600 });
    console.log(JSON.stringify({ ...output, artifactCommitments: undefined, sha256: sha256File(outFile) }));
    if (!passed) {
        throw new Error("V37-C1 failed broader all-country mechanism coverage");
    }
};

const invoked = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (import.meta.url === invoked) { try { main(); } catch (error) { console.error(error); process.exitCode = 1; } }
