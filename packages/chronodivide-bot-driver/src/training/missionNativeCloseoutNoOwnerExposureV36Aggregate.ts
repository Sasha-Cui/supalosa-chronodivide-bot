import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { sha256File } from "./methodV5PlanRunner.js";
import {
    MISSION_NATIVE_CLOSEOUT_V36_EXPOSURE_CELL_COUNT,
    MISSION_NATIVE_CLOSEOUT_V36_EXPOSURE_COUNTRIES,
    MISSION_NATIVE_CLOSEOUT_V36_EXPOSURE_MAX_TICKS,
    MISSION_NATIVE_CLOSEOUT_V36_EXPOSURE_SEED_BASE,
} from "./missionNativeCloseoutNoOwnerExposureV36.js";
import {
    buildMissionNativeCloseoutPolicyV36,
    missionNativeCloseoutPolicyV36Sha256,
} from "./missionNativeCloseoutPolicyV36.js";

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
            taskIndex < 0 || taskIndex >= MISSION_NATIVE_CLOSEOUT_V36_EXPOSURE_CELL_COUNT ||
            tasks.has(taskIndex) || state !== "COMPLETED" || exitCode !== "0:0" || account !== "pi_jss233"
        ) throw new Error(`V36-R2 scheduler row ${lineIndex + 1} is malformed, failed, duplicate, or unauthorized`);
        tasks.set(taskIndex, { schedulerJobId });
    }
    if (tasks.size !== MISSION_NATIVE_CLOSEOUT_V36_EXPOSURE_CELL_COUNT) {
        throw new Error(`V36-R2 scheduler returned ${tasks.size}/${MISSION_NATIVE_CLOSEOUT_V36_EXPOSURE_CELL_COUNT} tasks`);
    }
    return tasks;
};

const main = (): void => {
    const evidenceRoot = requiredPath("EVIDENCE_ROOT");
    const outFile = requiredPath("OUT_FILE");
    const arrayJobId = requiredArrayJobId();
    if (fs.existsSync(outFile)) throw new Error(`Refusing to overwrite ${outFile}`);
    const gitCommit = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
    const gitBranch = execFileSync("git", ["branch", "--show-current"], { encoding: "utf8" }).trim();
    const dirty = execFileSync("git", ["status", "--short", "--untracked-files=no"], { encoding: "utf8" }).trim();
    if (gitBranch !== "main" || dirty) throw new Error("V36-R2 aggregate requires clean tracked main");
    const schedulerTasks = parseSacct(execFileSync(
        "/opt/slurm/current/bin/sacct",
        ["-j", arrayJobId, "-n", "-P", "-X", "--format=JobID,JobIDRaw,State,ExitCode,Account"],
        { encoding: "utf8" },
    ), arrayJobId);
    const expectedPolicyId = missionNativeCloseoutPolicyV36Sha256(buildMissionNativeCloseoutPolicyV36(true));
    const artifactCommitments: Array<{ taskIndex: number; path: string; sha256: string }> = [];
    let gameCount = 0;
    let predecessorOwnedFallbacks = 0;
    let noOwnerRecoveries = 0;
    let incompleteFallbacks = 0;
    for (let taskIndex = 0; taskIndex < MISSION_NATIVE_CLOSEOUT_V36_EXPOSURE_CELL_COUNT; taskIndex += 1) {
        const artifactPath = path.join(evidenceRoot, `${arrayJobId}_${taskIndex}`, "v36-exposure.json");
        if (!fs.existsSync(artifactPath)) throw new Error(`V36-R2 task ${taskIndex} lacks its artifact`);
        const artifact = readJson(artifactPath);
        const scheduler = isRecord(artifact) && isRecord(artifact.scheduler) ? artifact.scheduler : null;
        const firstProgress = isRecord(artifact) && isRecord(artifact.firstProgress) ? artifact.firstProgress : null;
        const repeatProgress = isRecord(artifact) && isRecord(artifact.repeatProgress) ? artifact.repeatProgress : null;
        const expectedCountry = MISSION_NATIVE_CLOSEOUT_V36_EXPOSURE_COUNTRIES[Math.floor(taskIndex / 2)];
        const expectedSlot = taskIndex % 2;
        const expectedGames = taskIndex === 0 ? 4 : 2;
        if (
            !isRecord(artifact) || artifact.schemaVersion !== 1 || artifact.gateRevision !== "V36-R2" ||
            artifact.status !== "PASS_OUTCOME_FREE_V36_EXPOSURE_CELL" || artifact.passed !== true ||
            artifact.outcomeFree !== true || artifact.sourceGitCommit !== gitCommit ||
            artifact.enabledPolicyId !== expectedPolicyId || artifact.taskIndex !== taskIndex ||
            artifact.country !== expectedCountry || artifact.candidateSlot !== expectedSlot ||
            artifact.requestedEngineSeed !== MISSION_NATIVE_CLOSEOUT_V36_EXPOSURE_SEED_BASE + taskIndex ||
            artifact.maxTicks !== MISSION_NATIVE_CLOSEOUT_V36_EXPOSURE_MAX_TICKS ||
            artifact.gameCount !== expectedGames || artifact.firstSha256 !== artifact.repeatSha256 ||
            !Array.isArray(artifact.validationErrors) || artifact.validationErrors.length !== 0 ||
            !scheduler || scheduler.account !== "pi_jss233" ||
            String(scheduler.arrayJobId) !== arrayJobId || String(scheduler.arrayTaskId) !== String(taskIndex) ||
            scheduler.jobId !== schedulerTasks.get(taskIndex)?.schedulerJobId ||
            !firstProgress || !repeatProgress || JSON.stringify(firstProgress) !== JSON.stringify(repeatProgress)
        ) throw new Error(`V36-R2 task ${taskIndex} artifact or provenance drifted`);
        if (taskIndex === 0) {
            const control = isRecord(artifact.control) ? artifact.control : null;
            if (!control || control.directSha256 !== control.disabledSha256) {
                throw new Error("V36-R2 exact disabled control failed");
            }
        } else if (artifact.control !== null) throw new Error(`V36-R2 task ${taskIndex} emitted an unexpected control`);
        const forbidden = findForbiddenKey(artifact);
        if (forbidden) throw new Error(`V36-R2 artifact ${taskIndex} exposes forbidden key ${forbidden}`);
        for (const [label, value] of Object.entries({
            predecessorOwnedFallbacks: firstProgress.predecessorOwnedFallbacks,
            noOwnerRecoveries: firstProgress.noOwnerRecoveries,
            incompleteFallbacks: firstProgress.incompleteFallbacks,
        })) {
            if (!Number.isSafeInteger(value) || (value as number) < 0) {
                throw new Error(`V36-R2 task ${taskIndex} has invalid ${label}`);
            }
        }
        gameCount += expectedGames;
        predecessorOwnedFallbacks += firstProgress.predecessorOwnedFallbacks as number;
        noOwnerRecoveries += firstProgress.noOwnerRecoveries as number;
        incompleteFallbacks += firstProgress.incompleteFallbacks as number;
        artifactCommitments.push({ taskIndex, path: artifactPath, sha256: sha256File(artifactPath) });
    }
    const artifactCommitmentSha256 = crypto.createHash("sha256")
        .update(JSON.stringify(artifactCommitments))
        .digest("hex");
    const passed = noOwnerRecoveries > 0;
    const output = {
        schemaVersion: 1,
        gateRevision: "V36-R2",
        status: passed
            ? "PASS_OUTCOME_FREE_V36_R2_LIVE_NO_OWNER_EXPOSURE"
            : "FAIL_OUTCOME_FREE_V36_R2_NO_LIVE_NO_OWNER_EXPOSURE",
        passed,
        outcomeFree: true,
        sourceGitCommit: gitCommit,
        arrayJobId,
        schedulerAccount: "pi_jss233",
        schedulerJobIds: [...schedulerTasks.values()].map(({ schedulerJobId }) => schedulerJobId),
        cellCount: MISSION_NATIVE_CLOSEOUT_V36_EXPOSURE_CELL_COUNT,
        countryCount: MISSION_NATIVE_CLOSEOUT_V36_EXPOSURE_COUNTRIES.length,
        reciprocalSlotCount: 2,
        gameCount,
        enabledPolicyId: expectedPolicyId,
        predecessorOwnedFallbacks,
        noOwnerRecoveries,
        incompleteFallbacks,
        artifactCommitmentSha256,
        artifactCommitments,
        outcomeFieldsEmitted: [],
        authorizedNextPhase: passed ? "v36-all-country-compatibility" : null,
    };
    fs.mkdirSync(path.dirname(outFile), { recursive: true, mode: 0o700 });
    fs.writeFileSync(outFile, JSON.stringify(output, null, 2) + "\n", { flag: "wx", mode: 0o600 });
    console.log(JSON.stringify({ ...output, artifactCommitments: undefined, sha256: sha256File(outFile) }));
    if (!passed) throw new Error("V36-R2 did not expose live no-owner recovery; preserved complete aggregate");
};

const invoked = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (import.meta.url === invoked) { try { main(); } catch (error) { console.error(error); process.exitCode = 1; } }
