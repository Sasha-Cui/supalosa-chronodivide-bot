import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
    buildMethodV4LifecycleEpisodes,
    METHOD_V4_COUNTRIES,
    METHOD_V4_LIFECYCLE_FAMILY_COUNT,
    METHOD_V4_LIFECYCLE_LAUNCH_COUNT,
    METHOD_V4_LIFECYCLE_MAX_TICKS,
    METHOD_V4_LIFECYCLE_RANKING_RULE,
    METHOD_V4_LIFECYCLE_SHARD_COUNT,
    MethodV4LifecycleCampaign,
} from "./methodV4LifecyclePlanGenerator.js";
import { METHOD_V4_LIFECYCLE_ARM_ORDER } from "./methodV4LifecyclePolicies.js";
import { validateMethodV3Stage2PolicyTelemetry } from "./methodV3Stage2TechnicalGate.js";
import { parseResearchRunPlan, sha256File } from "./researchPlanRunner.js";
import { METHOD_V4_POLICY_SCHEMA_VERSION, researchPolicySha256 } from "./researchPolicy.js";

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null && !Array.isArray(value);

const readJson = (filePath: string): unknown => JSON.parse(fs.readFileSync(filePath, "utf8"));

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

export const validateMethodV4LifecycleCampaign = (value: unknown): MethodV4LifecycleCampaign => {
    if (
        !isRecord(value) ||
        value.schemaVersion !== 1 ||
        value.kind !== "method-v4-lifecycle-screen" ||
        value.status !== "FROZEN_OPEN_TRAINING_LITERAL_BUILDING_ELIMINATION_SCREEN" ||
        value.outcomeAccess !== "open-training-only-no-paper-claim" ||
        value.actualWinInvariant !==
            "finished shortGame, Supalosa defeated, candidate alive, zero terminal Supalosa buildings" ||
        value.mapProfilesEnabled !== false ||
        value.exactMapTacticsEnabled !== false ||
        value.familyCount !== METHOD_V4_LIFECYCLE_FAMILY_COUNT ||
        value.countryCount !== METHOD_V4_COUNTRIES.length ||
        value.reciprocalSlotCount !== 2 ||
        value.policyCount !== METHOD_V4_LIFECYCLE_ARM_ORDER.length ||
        value.seedBlockCount !== METHOD_V4_LIFECYCLE_SHARD_COUNT ||
        value.launchedGameCount !== METHOD_V4_LIFECYCLE_LAUNCH_COUNT ||
        value.maxTicks !== METHOD_V4_LIFECYCLE_MAX_TICKS ||
        !Array.isArray(value.countries) ||
        value.countries.join(",") !== METHOD_V4_COUNTRIES.join(",") ||
        !Array.isArray(value.rankingRule) ||
        value.rankingRule.join("\0") !== METHOD_V4_LIFECYCLE_RANKING_RULE.join("\0") ||
        !Array.isArray(value.advancementRule) ||
        value.advancementRule.length !== 4 ||
        !Array.isArray(value.arms) ||
        value.arms.length !== METHOD_V4_LIFECYCLE_ARM_ORDER.length ||
        !Array.isArray(value.selectedFamilies) ||
        value.selectedFamilies.length !== METHOD_V4_LIFECYCLE_FAMILY_COUNT ||
        !Array.isArray(value.shards) ||
        value.shards.length !== METHOD_V4_LIFECYCLE_SHARD_COUNT ||
        typeof value.failureAuditPath !== "string" ||
        typeof value.failureAuditSha256 !== "string" ||
        typeof value.methodV3FinalistsPath !== "string" ||
        typeof value.methodV3FinalistsSha256 !== "string"
    ) {
        throw new Error("Method-v4 lifecycle campaign has an invalid frozen schema");
    }
    const campaign = value as unknown as MethodV4LifecycleCampaign;
    const familyIds = campaign.selectedFamilies.map(({ familyId }) => familyId);
    if (
        sha256File(campaign.failureAuditPath) !== campaign.failureAuditSha256 ||
        sha256File(campaign.methodV3FinalistsPath) !== campaign.methodV3FinalistsSha256 ||
        campaign.failureAuditSha256 !== "5d10ba27d3f2527d6a43e9b248d2459990a96ae15220f1f31346b474264d276f" ||
        campaign.methodV3FinalistsSha256 !== "d95ebd5d77fbd0d5dba01009341868bf514bc0690936eb3fba830f2929350284" ||
        new Set(familyIds).size !== METHOD_V4_LIFECYCLE_FAMILY_COUNT ||
        campaign.arms.map(({ armId }) => armId).join(",") !== METHOD_V4_LIFECYCLE_ARM_ORDER.join(",") ||
        new Set(campaign.arms.map(({ policyId }) => policyId)).size !== campaign.arms.length ||
        campaign.arms.some(({ policyId, policy }) =>
            policy.schemaVersion !== METHOD_V4_POLICY_SCHEMA_VERSION || researchPolicySha256(policy) !== policyId
        ) ||
        campaign.shards.some((shard, index) =>
            shard.shardIndex !== index ||
            shard.familyId !== familyIds[Math.floor(index / METHOD_V4_COUNTRIES.length)] ||
            shard.country !== METHOD_V4_COUNTRIES[index % METHOD_V4_COUNTRIES.length] ||
            shard.seedBlockIndex !== index ||
            shard.requestedEngineSeed !== campaign.engineSeedBase + index ||
            shard.launchedGameCount !== METHOD_V4_LIFECYCLE_ARM_ORDER.length * 2
        ) ||
        new Set(campaign.shards.map(({ planFile }) => planFile)).size !== METHOD_V4_LIFECYCLE_SHARD_COUNT ||
        new Set(campaign.shards.map(({ planSha256 }) => planSha256)).size !== METHOD_V4_LIFECYCLE_SHARD_COUNT ||
        new Set(campaign.shards.map(({ runId }) => runId)).size !== METHOD_V4_LIFECYCLE_SHARD_COUNT
    ) {
        throw new Error("Method-v4 lifecycle campaign schedule or evidence chain drifted");
    }
    return campaign;
};

type SchedulerTask = { schedulerJobId: string; state: "COMPLETED"; exitCode: "0:0"; account: "pi_jss233" };

export const parseMethodV4LifecycleSacct = (
    raw: string,
    arrayJobId: string,
): Map<number, SchedulerTask> => {
    const tasks = new Map<number, SchedulerTask>();
    for (const [lineIndex, line] of raw.split("\n").entries()) {
        if (!line) continue;
        const fields = line.split("|");
        if (fields.length !== 5) throw new Error(`Method-v4 sacct line ${lineIndex + 1} is malformed`);
        const [logicalJobId, schedulerJobId, state, exitCode, account] = fields;
        const match = new RegExp(`^${arrayJobId}_(\\d+)$`).exec(logicalJobId);
        if (!match) throw new Error(`Method-v4 sacct row has unexpected logical job ID ${logicalJobId}`);
        const taskIndex = Number(match[1]);
        if (
            !/^\d+$/.test(schedulerJobId) ||
            taskIndex < 0 ||
            taskIndex >= METHOD_V4_LIFECYCLE_SHARD_COUNT ||
            tasks.has(taskIndex) ||
            state !== "COMPLETED" ||
            exitCode !== "0:0" ||
            account !== "pi_jss233"
        ) {
            throw new Error(`Method-v4 scheduler task ${taskIndex} is duplicate, failed, or unauthorized`);
        }
        tasks.set(taskIndex, { schedulerJobId, state, exitCode, account });
    }
    if (tasks.size !== METHOD_V4_LIFECYCLE_SHARD_COUNT) {
        throw new Error(`Method-v4 sacct returned ${tasks.size}/${METHOD_V4_LIFECYCLE_SHARD_COUNT} tasks`);
    }
    return tasks;
};

export const validateMethodV4ActualWin = (result: Record<string, unknown>, episodeId: string): void => {
    if (!isRecord(result.candidate) || !isRecord(result.baseline)) {
        throw new Error(`Method-v4 completion ${episodeId} lacks terminal player snapshots`);
    }
    const winner = result.winner;
    const candidateBuildings = result.candidate.buildings;
    const baselineBuildings = result.baseline.buildings;
    const candidateDefeated = result.candidateDefeated;
    const baselineDefeated = result.baselineDefeated;
    if (
        !Number.isSafeInteger(candidateBuildings) ||
        !Number.isSafeInteger(baselineBuildings) ||
        typeof candidateDefeated !== "boolean" ||
        typeof baselineDefeated !== "boolean" ||
        (winner !== "candidate" && winner !== "baseline" && winner !== "draw")
    ) {
        throw new Error(`Method-v4 completion ${episodeId} has malformed terminal outcome fields`);
    }
    const validCandidateWin = winner === "candidate" && result.finished === true &&
        candidateDefeated === false && baselineDefeated === true && baselineBuildings === 0;
    const validBaselineWin = winner === "baseline" && result.finished === true &&
        candidateDefeated === true && baselineDefeated === false && candidateBuildings === 0;
    const validDraw = winner === "draw" && candidateDefeated === baselineDefeated;
    if (!validCandidateWin && !validBaselineWin && !validDraw) {
        throw new Error(`Method-v4 completion ${episodeId} violates the literal building-elimination invariant`);
    }
};

const parseEvents = (eventsPath: string): Record<string, unknown>[] => fs.readFileSync(eventsPath, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((line, index) => {
        const event = JSON.parse(line) as unknown;
        if (!isRecord(event) || typeof event.event !== "string") {
            throw new Error(`Method-v4 event ${index} in ${eventsPath} is malformed`);
        }
        return event;
    });

const validateShard = (
    campaign: MethodV4LifecycleCampaign,
    resultsRoot: string,
    arrayJobId: string,
    task: SchedulerTask,
    shard: MethodV4LifecycleCampaign["shards"][number],
): { completionCount: number; policyEventCount: number } => {
    const resultDir = path.join(resultsRoot, `${arrayJobId}_${shard.shardIndex}`, "run");
    const manifestPath = path.join(resultDir, "manifest.json");
    const summaryPath = path.join(resultDir, "summary.json");
    const eventsPath = path.join(resultDir, "events.jsonl");
    for (const required of [manifestPath, summaryPath, eventsPath, shard.planFile]) {
        if (!fs.existsSync(required)) throw new Error(`Method-v4 shard ${shard.shardIndex} lacks ${required}`);
    }
    if (sha256File(shard.planFile) !== shard.planSha256) {
        throw new Error(`Method-v4 shard ${shard.shardIndex} plan bytes changed`);
    }
    const summary = readJson(summaryPath);
    if (
        !isRecord(summary) ||
        summary.runId !== shard.runId ||
        summary.planBytesSha256 !== shard.planSha256 ||
        summary.requestedLaunches !== shard.launchedGameCount ||
        summary.accountedLaunches !== shard.launchedGameCount ||
        summary.completed !== shard.launchedGameCount ||
        summary.technicalFailures !== 0 ||
        summary.complete !== true ||
        summary.technicallyClean !== true ||
        summary.outcomeAccess !== "open-training" ||
        !Number.isSafeInteger(summary.candidateWins) ||
        !Number.isSafeInteger(summary.baselineWins) ||
        !Number.isSafeInteger(summary.draws) ||
        (summary.candidateWins as number) + (summary.baselineWins as number) + (summary.draws as number) !==
            shard.launchedGameCount
    ) {
        throw new Error(`Method-v4 shard ${shard.runId} is not one clean ${shard.launchedGameCount}-game block`);
    }
    const outer = readJson(manifestPath);
    if (!isRecord(outer) || !isRecord(outer.plan) || !isRecord(outer.manifest)) {
        throw new Error(`Method-v4 shard ${shard.shardIndex} manifest is malformed`);
    }
    const plan = parseResearchRunPlan(outer.plan);
    if (
        outer.planBytesSha256 !== shard.planSha256 ||
        plan.runId !== shard.runId ||
        plan.role !== "train" ||
        plan.purpose !== "method-v4-lifecycle-screen" ||
        plan.sourceGitCommit !== campaign.sourceGitCommit ||
        plan.sourceRuntimeSha256 !== campaign.sourceRuntimeSha256 ||
        plan.baselineGitCommit !== campaign.baselineGitCommit ||
        plan.baselineRuntimeSha256 !== campaign.baselineRuntimeSha256 ||
        plan.gameApiRuntimeSha256 !== campaign.gameApiRuntimeSha256 ||
        plan.packageLockSha256 !== campaign.packageLockSha256 ||
        plan.roleManifestSha256 !== campaign.roleManifestSha256 ||
        plan.roleCommitmentSha256 !== campaign.roleCommitmentSha256 ||
        plan.splitCommitmentSha256 !== campaign.splitCommitmentSha256 ||
        plan.sourcePopulationCommitmentSha256 !== campaign.sourcePopulationCommitmentSha256 ||
        plan.engineSeedBase !== campaign.engineSeedBase ||
        plan.maxTicks !== campaign.maxTicks ||
        plan.candidateCountry !== shard.country ||
        plan.baselineCountry !== shard.country ||
        plan.episodes.length !== shard.launchedGameCount ||
        plan.policies.map(({ policyId }) => policyId).join(",") !== campaign.arms.map(({ policyId }) => policyId).join(",")
    ) {
        throw new Error(`Method-v4 shard ${shard.shardIndex} commitments drifted`);
    }
    const expectedEpisodes = buildMethodV4LifecycleEpisodes(
        shard.familyId,
        shard.seedBlockIndex,
        shard.requestedEngineSeed,
    );
    if (plan.episodes.some((episode, index) => {
        const expected = expectedEpisodes[index];
        return !expected || episode.episodeId !== expected.episodeId || episode.familyId !== expected.familyId ||
            episode.policyId !== expected.policyId || episode.methodId !== expected.policyId ||
            episode.seedBlockIndex !== expected.seedBlockIndex ||
            episode.requestedEngineSeed !== expected.requestedEngineSeed ||
            episode.candidateSlot !== expected.candidateSlot;
    })) {
        throw new Error(`Method-v4 shard ${shard.shardIndex} episode order drifted`);
    }
    const scheduler = outer.manifest.scheduler;
    const source = outer.manifest.source;
    if (
        !isRecord(scheduler) ||
        scheduler.account !== "pi_jss233" ||
        String(scheduler.arrayJobId) !== arrayJobId ||
        String(scheduler.arrayTaskId) !== String(shard.shardIndex) ||
        String(scheduler.jobId) !== task.schedulerJobId ||
        !isRecord(source) ||
        source.gitCommit !== campaign.sourceGitCommit ||
        source.gitBranch !== "main" ||
        source.trackedDirty !== false
    ) {
        throw new Error(`Method-v4 shard ${shard.shardIndex} scheduler or source provenance drifted`);
    }

    const events = parseEvents(eventsPath);
    if (events[0]?.event !== "run_start" || events[events.length - 1]?.event !== "run_complete") {
        throw new Error(`Method-v4 shard ${shard.shardIndex} boundary events drifted`);
    }
    let cursor = 1;
    let policyEventCount = 0;
    for (let launchIndex = 0; launchIndex < plan.episodes.length; launchIndex++) {
        const expected = plan.episodes[launchIndex];
        const launch = events[cursor++];
        if (
            launch?.event !== "launch_counted" || launch.launchIndex !== launchIndex ||
            launch.episodeId !== expected.episodeId || launch.familyId !== expected.familyId ||
            launch.policyId !== expected.policyId || launch.seedBlockIndex !== expected.seedBlockIndex ||
            launch.requestedEngineSeed !== expected.requestedEngineSeed || launch.candidateSlot !== expected.candidateSlot
        ) {
            throw new Error(`Method-v4 shard ${shard.shardIndex} launch ${launchIndex} drifted`);
        }
        while (events[cursor]?.event === "candidate_policy_event") {
            const event = events[cursor++];
            if (
                event.launchIndex !== launchIndex || event.episodeId !== expected.episodeId ||
                event.policyId !== expected.policyId || !isRecord(event.policyEvent)
            ) {
                throw new Error(`Method-v4 shard ${shard.shardIndex} telemetry identity drifted`);
            }
            validateMethodV3Stage2PolicyTelemetry(event.policyEvent);
            policyEventCount++;
        }
        const completion = events[cursor++];
        if (completion?.event !== "episode_complete" || completion.launchIndex !== launchIndex || !isRecord(completion.result)) {
            throw new Error(`Method-v4 shard ${shard.shardIndex} completion ${launchIndex} is malformed`);
        }
        const result = completion.result;
        if (
            result.episodeId !== expected.episodeId || result.familyId !== expected.familyId ||
            result.policyId !== expected.policyId || result.methodId !== expected.methodId ||
            result.seedBlockIndex !== expected.seedBlockIndex ||
            result.requestedEngineSeed !== expected.requestedEngineSeed ||
            result.candidateSlot !== expected.candidateSlot || result.candidateCountry !== shard.country ||
            result.baselineCountry !== shard.country
        ) {
            throw new Error(`Method-v4 shard ${shard.shardIndex} completion identity drifted`);
        }
        validateMethodV4ActualWin(result, expected.episodeId);
    }
    if (cursor !== events.length - 1 || !isRecord(events[cursor].summary)) {
        throw new Error(`Method-v4 shard ${shard.shardIndex} event accounting is incomplete`);
    }
    return { completionCount: plan.episodes.length, policyEventCount };
};

export const methodV4ResultArtifactCommitmentSha256 = (
    campaign: MethodV4LifecycleCampaign,
    resultsRoot: string,
    arrayJobId: string,
): string => crypto.createHash("sha256").update(JSON.stringify(campaign.shards.map(({ shardIndex }) => {
    const resultDir = path.join(resultsRoot, `${arrayJobId}_${shardIndex}`, "run");
    return {
        shardIndex,
        manifestSha256: sha256File(path.join(resultDir, "manifest.json")),
        summarySha256: sha256File(path.join(resultDir, "summary.json")),
        eventsSha256: sha256File(path.join(resultDir, "events.jsonl")),
    };
}))).digest("hex");

const main = (): void => {
    const campaignPath = requiredPath("CAMPAIGN");
    const resultsRoot = requiredPath("RESULTS_ROOT");
    const outputPath = requiredPath("OUT_FILE");
    const arrayJobId = requiredArrayJobId();
    if (fs.existsSync(outputPath)) throw new Error(`Refusing to overwrite Method-v4 gate ${outputPath}`);
    const campaign = validateMethodV4LifecycleCampaign(readJson(campaignPath));
    const sacctRaw = execFileSync(
        "/opt/slurm/25.11.6/bin/sacct",
        ["-j", arrayJobId, "-n", "-P", "-X", "--format=JobID,JobIDRaw,State,ExitCode,Account"],
        { encoding: "utf8" },
    );
    const schedulerTasks = parseMethodV4LifecycleSacct(sacctRaw, arrayJobId);
    let completionCount = 0;
    let policyEventCount = 0;
    for (const shard of campaign.shards) {
        const validated = validateShard(
            campaign,
            resultsRoot,
            arrayJobId,
            schedulerTasks.get(shard.shardIndex) as SchedulerTask,
            shard,
        );
        completionCount += validated.completionCount;
        policyEventCount += validated.policyEventCount;
    }
    if (completionCount !== METHOD_V4_LIFECYCLE_LAUNCH_COUNT) {
        throw new Error("Method-v4 launch accounting is incomplete");
    }
    const gitCommit = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
    const gitBranch = execFileSync("git", ["branch", "--show-current"], { encoding: "utf8" }).trim();
    const dirty = execFileSync("git", ["status", "--short", "--untracked-files=no"], { encoding: "utf8" }).trim();
    if (gitBranch !== "main" || dirty || gitCommit !== campaign.sourceGitCommit) {
        throw new Error("Method-v4 gate requires the unchanged clean campaign source on main");
    }
    const output = {
        schemaVersion: 1,
        status: "PASSED_METHOD_V4_LIFECYCLE_TECHNICAL_GATE_OUTCOMES_NOT_SUMMARIZED",
        generatedAt: new Date().toISOString(),
        gateSourceGitCommit: gitCommit,
        campaignPath,
        campaignSha256: sha256File(campaignPath),
        resultsRoot,
        resultArtifactCommitmentSha256: methodV4ResultArtifactCommitmentSha256(campaign, resultsRoot, arrayJobId),
        arrayJobId,
        schedulerAccount: "pi_jss233",
        schedulerJobIds: [...schedulerTasks.values()].map(({ schedulerJobId }) => schedulerJobId),
        shardCount: METHOD_V4_LIFECYCLE_SHARD_COUNT,
        requestedLaunches: METHOD_V4_LIFECYCLE_LAUNCH_COUNT,
        accountedLaunches: METHOD_V4_LIFECYCLE_LAUNCH_COUNT,
        completedLaunches: METHOD_V4_LIFECYCLE_LAUNCH_COUNT,
        technicalFailures: 0,
        actualWinInvariantViolations: 0,
        policyEventCount,
        outcomeFieldsEmitted: [],
        authorizedNextPhase: "method-v4-open-training-analysis",
    };
    fs.mkdirSync(path.dirname(outputPath), { recursive: true, mode: 0o700 });
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), { flag: "wx", mode: 0o600 });
    console.log(JSON.stringify({
        outputPath,
        outputSha256: sha256File(outputPath),
        status: output.status,
        accountedLaunches: output.accountedLaunches,
        policyEventCount,
    }));
};

const invokedModuleUrl = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (import.meta.url === invokedModuleUrl) {
    try {
        main();
    } catch (error) {
        console.error(error);
        process.exitCode = 1;
    }
}
