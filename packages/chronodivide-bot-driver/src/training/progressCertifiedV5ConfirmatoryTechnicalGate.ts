import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
    PROGRESS_CERTIFIED_SEALED_PLAN_KIND,
    parseProgressCertifiedRunPlan,
    sha256File,
} from "./progressCertifiedPlanRunner.js";
import {
    PROGRESS_CERTIFIED_V5_CONFIRMATORY_LAUNCH_COUNT,
    PROGRESS_CERTIFIED_V5_CONFIRMATORY_SHARD_COUNT,
    ProgressCertifiedV5ConfirmatoryCampaign,
    validateProgressCertifiedV5ConfirmatoryCampaign,
} from "./progressCertifiedV5ConfirmatoryCampaign.js";

export const PROGRESS_CERTIFIED_V5_CONFIRMATORY_TECHNICAL_GATE_SCHEMA_VERSION = 1 as const;

type RecordValue = Record<string, unknown>;
const isRecord = (value: unknown): value is RecordValue =>
    !!value && typeof value === "object" && !Array.isArray(value);
const parseJson = (filePath: string): unknown => JSON.parse(fs.readFileSync(filePath, "utf8"));
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
const exactKeys = (value: RecordValue, keys: string[], label: string): void => {
    const actual = Object.keys(value).sort();
    const expected = [...keys].sort();
    if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
        throw new Error(`${label} has an invalid exact schema`);
    }
};

type SchedulerTask = { schedulerJobId: string; state: "COMPLETED"; exitCode: "0:0"; account: "pi_jss233" };
export const parseProgressCertifiedV5ConfirmatorySacct = (
    raw: string,
    arrayJobId: string,
): Map<number, SchedulerTask> => {
    const tasks = new Map<number, SchedulerTask>();
    for (const [lineIndex, line] of raw.split("\n").entries()) {
        if (!line) continue;
        const fields = line.split("|");
        if (fields.length !== 5) throw new Error(`Confirmatory sacct line ${lineIndex + 1} is malformed`);
        const [logicalJobId, schedulerJobId, state, exitCode, account] = fields;
        const match = new RegExp(`^${arrayJobId}_(\\d+)$`).exec(logicalJobId);
        const taskIndex = match ? Number(match[1]) : -1;
        if (
            !match || !/^\d+$/.test(schedulerJobId) || taskIndex < 0 || taskIndex >= 504 ||
            tasks.has(taskIndex) || state !== "COMPLETED" || exitCode !== "0:0" || account !== "pi_jss233"
        ) throw new Error(`Confirmatory scheduler row ${lineIndex + 1} is failed, duplicate, or unauthorized`);
        tasks.set(taskIndex, { schedulerJobId, state, exitCode, account });
    }
    if (tasks.size !== 504) throw new Error(`Confirmatory sacct returned ${tasks.size}/504 tasks`);
    return tasks;
};

export const parseProgressCertifiedV5SealedSummary = (value: unknown): RecordValue => {
    if (!isRecord(value)) throw new Error("Sealed V5 summary must be an object");
    exactKeys(value, [
        "schemaVersion", "status", "generatedAt", "runId", "planSha256",
        "requestedLaunches", "accountedLaunches", "completed", "technicalFailures",
        "complete", "technicallyClean", "outcomeAccess",
    ], "Sealed V5 summary");
    if (
        value.schemaVersion !== 2 || value.status !== "COMPLETE_PROGRESS_CERTIFIED_SEALED_CONFIRMATORY_SHARD" ||
        typeof value.generatedAt !== "string" || typeof value.runId !== "string" ||
        typeof value.planSha256 !== "string" || !/^[0-9a-f]{64}$/.test(value.planSha256) ||
        value.requestedLaunches !== 6 || value.accountedLaunches !== 6 || value.completed !== 6 ||
        value.technicalFailures !== 0 || value.complete !== true || value.technicallyClean !== true ||
        value.outcomeAccess !== "sealed-private-events"
    ) throw new Error("Sealed V5 summary is incomplete or technically unclean");
    const serialized = JSON.stringify(value);
    if (/candidateWins|baselineWins|draws|literalWinRate|winner|candidateScore|terminalTick|terminalBuilding/i.test(serialized)) {
        throw new Error("Sealed V5 summary contains a forbidden outcome field");
    }
    return value;
};

export const progressCertifiedV5ConfirmatoryResultCommitmentSha256 = (
    campaign: ProgressCertifiedV5ConfirmatoryCampaign,
    resultsRoot: string,
    arrayJobId: string,
): string => {
    const artifacts = campaign.shards.map(({ shardIndex }) => {
        const runRoot = path.join(resultsRoot, `${arrayJobId}_${shardIndex}`, "run");
        return {
            shardIndex,
            manifestSha256: sha256File(path.join(runRoot, "manifest.json")),
            summarySha256: sha256File(path.join(runRoot, "summary.json")),
            eventsSha256: sha256File(path.join(runRoot, "events.jsonl")),
        };
    });
    return crypto.createHash("sha256").update(JSON.stringify(artifacts)).digest("hex");
};

const parseEvents = (eventsPath: string): RecordValue[] => fs.readFileSync(eventsPath, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((line, index) => {
        const value = JSON.parse(line) as unknown;
        if (!isRecord(value) || typeof value.event !== "string") {
            throw new Error(`Sealed event ${index} in ${eventsPath} is malformed`);
        }
        return value;
    });

const validateShard = (
    campaign: ProgressCertifiedV5ConfirmatoryCampaign,
    resultsRoot: string,
    arrayJobId: string,
    schedulerTask: SchedulerTask,
    shard: ProgressCertifiedV5ConfirmatoryCampaign["shards"][number],
): string => {
    const runRoot = path.join(resultsRoot, `${arrayJobId}_${shard.shardIndex}`, "run");
    const manifestPath = path.join(runRoot, "manifest.json");
    const summaryPath = path.join(runRoot, "summary.json");
    const eventsPath = path.join(runRoot, "events.jsonl");
    for (const required of [manifestPath, summaryPath, eventsPath, shard.planFile]) {
        if (!fs.existsSync(required)) throw new Error(`Confirmatory shard ${shard.shardIndex} lacks ${required}`);
    }
    if (sha256File(shard.planFile) !== shard.planSha256) {
        throw new Error(`Confirmatory shard ${shard.shardIndex} plan bytes changed`);
    }
    const summary = parseProgressCertifiedV5SealedSummary(parseJson(summaryPath));
    if (summary.runId !== shard.runId || summary.planSha256 !== shard.planSha256) {
        throw new Error(`Confirmatory shard ${shard.shardIndex} summary identity drifted`);
    }
    const outer = parseJson(manifestPath);
    if (!isRecord(outer) || !isRecord(outer.plan) || !isRecord(outer.manifest)) {
        throw new Error(`Confirmatory shard ${shard.shardIndex} manifest is malformed`);
    }
    exactKeys(outer, ["planSha256", "plan", "manifest"], `Confirmatory shard ${shard.shardIndex} outer manifest`);
    if (outer.planSha256 !== shard.planSha256) throw new Error(`Confirmatory shard ${shard.shardIndex} plan hash drifted`);
    const plan = parseProgressCertifiedRunPlan(outer.plan);
    if (
        plan.kind !== PROGRESS_CERTIFIED_SEALED_PLAN_KIND || plan.runId !== shard.runId ||
        plan.sourceGitCommit !== campaign.sourceGitCommit || plan.sourceRuntimeSha256 !== campaign.sourceRuntimeSha256 ||
        plan.baselineGitCommit !== campaign.baselineGitCommit || plan.baselineRuntimeSha256 !== campaign.baselineRuntimeSha256 ||
        plan.gameApiRuntimeSha256 !== campaign.gameApiRuntimeSha256 || plan.packageLockSha256 !== campaign.packageLockSha256 ||
        plan.sourcePopulationCommitmentSha256 !== campaign.populationSha256 ||
        plan.family.familyId !== shard.familyId || plan.family.mapName !== shard.mapName ||
        plan.family.mapSha256 !== shard.mapSha256 || plan.country !== shard.country ||
        plan.seedBlockIndex !== shard.seedBlockIndex || plan.requestedEngineSeed !== shard.requestedEngineSeed ||
        plan.maxTicks !== campaign.maxTicks || plan.episodes.length !== 6
    ) throw new Error(`Confirmatory shard ${shard.shardIndex} plan commitments drifted`);
    const manifest = outer.manifest;
    const scheduler = manifest.scheduler;
    const source = manifest.source;
    const effective = isRecord(manifest.inputs) ? manifest.inputs.effectiveConfig : null;
    if (
        !isRecord(scheduler) || scheduler.account !== "pi_jss233" || String(scheduler.arrayJobId) !== arrayJobId ||
        String(scheduler.arrayTaskId) !== String(shard.shardIndex) ||
        String(scheduler.jobId) !== schedulerTask.schedulerJobId ||
        !isRecord(source) || source.gitCommit !== campaign.sourceGitCommit ||
        source.gitBranch !== "main" || source.trackedDirty !== false ||
        !isRecord(effective) || effective.outcomeAccess !== "sealed-private-events" ||
        effective.runner !== "progressCertifiedPlanRunner-v2" || effective.noRetries !== true
    ) throw new Error(`Confirmatory shard ${shard.shardIndex} scheduler, source, or execution provenance drifted`);
    const events = parseEvents(eventsPath);
    const expectedOrder = [
        "run_start",
        ...plan.episodes.flatMap(() => ["launch_counted", "episode_complete"]),
        "run_complete",
    ];
    if (events.length !== expectedOrder.length || events.some((event, index) => event.event !== expectedOrder[index])) {
        throw new Error(`Confirmatory shard ${shard.shardIndex} event order drifted`);
    }
    const finalSummary = events[events.length - 1].summary;
    if (
        events[0].planSha256 !== shard.planSha256 || events[0].requestedLaunches !== 6 ||
        !isRecord(finalSummary) || finalSummary.planSha256 !== shard.planSha256
    ) throw new Error(`Confirmatory shard ${shard.shardIndex} run boundary drifted`);
    const expectedById = new Map(plan.episodes.map((episode) => [episode.episodeId, episode]));
    for (let launchIndex = 0; launchIndex < plan.episodes.length; launchIndex++) {
        const launch = events[1 + launchIndex * 2];
        const completion = events[2 + launchIndex * 2];
        const expected = plan.episodes[launchIndex];
        if (
            launch.launchIndex !== launchIndex || launch.episodeId !== expected.episodeId ||
            launch.familyId !== shard.familyId || launch.country !== shard.country ||
            launch.armId !== expected.armId || launch.policyId !== expected.policyId ||
            launch.seedBlockIndex !== shard.seedBlockIndex ||
            launch.requestedEngineSeed !== shard.requestedEngineSeed ||
            launch.candidateSlot !== expected.candidateSlot || !isRecord(completion.result)
        ) throw new Error(`Confirmatory shard ${shard.shardIndex} launch identity drifted`);
        const result = completion.result;
        const resultEpisodeId = result.episodeId;
        const resultExpected = typeof resultEpisodeId === "string" ? expectedById.get(resultEpisodeId) : undefined;
        if (
            completion.launchIndex !== launchIndex || !resultExpected || resultEpisodeId !== expected.episodeId ||
            result.familyId !== shard.familyId || result.policyId !== expected.policyId ||
            result.seedBlockIndex !== shard.seedBlockIndex || result.requestedEngineSeed !== shard.requestedEngineSeed ||
            result.candidateSlot !== expected.candidateSlot || result.technicalFailure !== null
        ) throw new Error(`Confirmatory shard ${shard.shardIndex} completion identity drifted`);
    }
    return String(scheduler.jobId);
};

const main = (): void => {
    const campaignPath = requiredPath("CAMPAIGN");
    const resultsRoot = requiredPath("RESULTS_ROOT");
    const outputPath = requiredPath("OUT_FILE");
    const arrayJobId = requiredArrayJobId();
    if (fs.existsSync(outputPath)) throw new Error(`Refusing to overwrite confirmatory gate ${outputPath}`);
    const campaign = validateProgressCertifiedV5ConfirmatoryCampaign(parseJson(campaignPath));
    const campaignSha256 = sha256File(campaignPath);
    const schedulerTasks = parseProgressCertifiedV5ConfirmatorySacct(execFileSync(
        "/opt/slurm/current/bin/sacct",
        ["-j", arrayJobId, "-n", "-P", "-X", "--format=JobID,JobIDRaw,State,ExitCode,Account"],
        { encoding: "utf8" },
    ), arrayJobId);
    const schedulerJobIds = campaign.shards.map((shard) => {
        const schedulerTask = schedulerTasks.get(shard.shardIndex);
        if (!schedulerTask) throw new Error(`Confirmatory shard ${shard.shardIndex} lacks scheduler evidence`);
        return validateShard(campaign, resultsRoot, arrayJobId, schedulerTask, shard);
    });
    if (schedulerJobIds.length !== 504 || new Set(schedulerJobIds).size !== 504) {
        throw new Error("Confirmatory scheduler-job accounting is incomplete");
    }
    const gitCommit = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
    const gitBranch = execFileSync("git", ["branch", "--show-current"], { encoding: "utf8" }).trim();
    const dirty = execFileSync("git", ["status", "--short", "--untracked-files=no"], { encoding: "utf8" }).trim();
    if (gitBranch !== "main" || dirty || gitCommit !== campaign.sourceGitCommit) {
        throw new Error("Confirmatory gate requires unchanged clean campaign source on main");
    }
    const output = {
        schemaVersion: PROGRESS_CERTIFIED_V5_CONFIRMATORY_TECHNICAL_GATE_SCHEMA_VERSION,
        status: "PASSED_PROGRESS_CERTIFIED_V5_CONFIRMATORY_TECHNICAL_GATE_NO_OUTCOMES_INSPECTED",
        generatedAt: new Date().toISOString(),
        sourceGitCommit: gitCommit,
        campaignPath,
        campaignSha256,
        resultsRoot,
        resultArtifactCommitmentSha256: progressCertifiedV5ConfirmatoryResultCommitmentSha256(
            campaign,
            resultsRoot,
            arrayJobId,
        ),
        arrayJobId,
        schedulerAccount: "pi_jss233",
        schedulerJobIds: [...schedulerJobIds].sort((left, right) => Number(left) - Number(right)),
        shardCount: PROGRESS_CERTIFIED_V5_CONFIRMATORY_SHARD_COUNT,
        requestedLaunches: PROGRESS_CERTIFIED_V5_CONFIRMATORY_LAUNCH_COUNT,
        accountedLaunches: PROGRESS_CERTIFIED_V5_CONFIRMATORY_LAUNCH_COUNT,
        completedLaunches: PROGRESS_CERTIFIED_V5_CONFIRMATORY_LAUNCH_COUNT,
        technicalFailures: 0,
        sealedSummaryViolations: 0,
        outcomeFieldsEmittedBySummaries: [],
        outcomeAccess: "not-inspected-technical-only",
        authorizedNextPhase: "single-complete-confirmatory-unblinding",
    };
    fs.mkdirSync(path.dirname(outputPath), { recursive: true, mode: 0o700 });
    fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`, { flag: "wx", mode: 0o600 });
    console.log(JSON.stringify({
        outputPath,
        outputSha256: sha256File(outputPath),
        status: output.status,
        shardCount: output.shardCount,
        accountedLaunches: output.accountedLaunches,
        authorizedNextPhase: output.authorizedNextPhase,
    }));
};

const invoked = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (import.meta.url === invoked) try { main(); } catch (error) { console.error(error); process.exitCode = 1; }
