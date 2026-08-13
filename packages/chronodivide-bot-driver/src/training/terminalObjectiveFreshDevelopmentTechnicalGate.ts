import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
    TERMINAL_FRESH_DEVELOPMENT_CANDIDATE_POLICY_ID,
    TERMINAL_FRESH_DEVELOPMENT_COUNTRIES,
    TERMINAL_FRESH_DEVELOPMENT_ENGINE_SEED_BASE,
    TERMINAL_FRESH_DEVELOPMENT_FAMILY_COUNT,
    TERMINAL_FRESH_DEVELOPMENT_LAUNCH_COUNT,
    TERMINAL_FRESH_DEVELOPMENT_MAX_TICKS,
    TERMINAL_FRESH_DEVELOPMENT_OPEN_ANALYSIS_STATUS,
    TERMINAL_FRESH_DEVELOPMENT_OPEN_CAMPAIGN_SHA256,
    TERMINAL_FRESH_DEVELOPMENT_PRIVATE_ROLE_SHA256,
    TERMINAL_FRESH_DEVELOPMENT_PROTOCOL_SHA256,
    TERMINAL_FRESH_DEVELOPMENT_PUBLIC_ROLE_SHA256,
    TERMINAL_FRESH_DEVELOPMENT_SEEDS_PER_CELL,
    TERMINAL_FRESH_DEVELOPMENT_SHARD_COUNT,
    TerminalFreshDevelopmentCampaign,
    parseTerminalFreshDevelopmentFamilies,
} from "./terminalObjectiveFreshDevelopmentCampaign.js";
import {
    parseTerminalFreshDevelopmentRunPlan,
    sha256File,
} from "./terminalObjectiveFreshDevelopmentPlanRunner.js";
import { terminalObjectivePolicySha256 } from "./terminalObjectivePolicy.js";
import { validateTerminalObjectiveResult } from "./terminalObjectiveTechnicalGate.js";
import { derivePairedEngineSeed } from "../benchmark/seededOfflineGame.js";
import {
    LITERAL_BUILDING_ELIMINATION_ENDPOINT_SHA256,
    LITERAL_BUILDING_ELIMINATION_ENDPOINT_VERSION,
} from "./literalBuildingEliminationEndpoint.js";

type RecordValue = Record<string, unknown>;
type SchedulerTask = { schedulerJobId: string; state: "COMPLETED"; exitCode: "0:0"; account: "pi_jss233" };
const isRecord = (value: unknown): value is RecordValue =>
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

export const validateTerminalFreshDevelopmentCampaign = (
    value: unknown,
    repoRoot: string,
): TerminalFreshDevelopmentCampaign => {
    if (
        !isRecord(value) || value.schemaVersion !== 1 ||
        value.kind !== "terminal-objective-fresh-development-literal-endpoint" ||
        value.status !== "FROZEN_TERMINAL_OBJECTIVE_FRESH_DEVELOPMENT_ENDPOINT_V5" ||
        typeof value.sourceGitCommit !== "string" || !/^[0-9a-f]{40}$/.test(value.sourceGitCommit) ||
        typeof value.sourceRuntimeSha256 !== "string" || !/^[0-9a-f]{64}$/.test(value.sourceRuntimeSha256) ||
        value.sourceOpenCampaignSha256 !== TERMINAL_FRESH_DEVELOPMENT_OPEN_CAMPAIGN_SHA256 ||
        value.protocolSha256 !== TERMINAL_FRESH_DEVELOPMENT_PROTOCOL_SHA256 ||
        value.publicRoleSha256 !== TERMINAL_FRESH_DEVELOPMENT_PUBLIC_ROLE_SHA256 ||
        value.privateRoleSha256 !== TERMINAL_FRESH_DEVELOPMENT_PRIVATE_ROLE_SHA256 ||
        value.outcomeAccess !== "single-scheduled-fresh-development-unblinding" ||
        value.familyCount !== TERMINAL_FRESH_DEVELOPMENT_FAMILY_COUNT || value.countryCount !== 9 ||
        value.seedBlocksPerCell !== TERMINAL_FRESH_DEVELOPMENT_SEEDS_PER_CELL || value.reciprocalSlotCount !== 2 ||
        value.shardCount !== TERMINAL_FRESH_DEVELOPMENT_SHARD_COUNT ||
        value.launchedGameCount !== TERMINAL_FRESH_DEVELOPMENT_LAUNCH_COUNT ||
        value.engineSeedBase !== TERMINAL_FRESH_DEVELOPMENT_ENGINE_SEED_BASE ||
        value.maxTicks !== TERMINAL_FRESH_DEVELOPMENT_MAX_TICKS ||
        value.endpointVersion !== LITERAL_BUILDING_ELIMINATION_ENDPOINT_VERSION ||
        value.endpointSha256 !== LITERAL_BUILDING_ELIMINATION_ENDPOINT_SHA256 ||
        !isRecord(value.candidate) || value.candidate.armId !== "full_sufficient_strike" ||
        value.candidate.policyId !== TERMINAL_FRESH_DEVELOPMENT_CANDIDATE_POLICY_ID ||
        !Array.isArray(value.countries) || value.countries.join(",") !== TERMINAL_FRESH_DEVELOPMENT_COUNTRIES.join(",") ||
        !Array.isArray(value.families) || value.families.length !== TERMINAL_FRESH_DEVELOPMENT_FAMILY_COUNT ||
        !Array.isArray(value.shards) || value.shards.length !== TERMINAL_FRESH_DEVELOPMENT_SHARD_COUNT ||
        typeof value.authorizationAnalysisPath !== "string" || typeof value.authorizationAnalysisSha256 !== "string" ||
        typeof value.sourceOpenCampaignPath !== "string" || typeof value.protocolPath !== "string" ||
        typeof value.publicRolePath !== "string" || typeof value.privateRolePath !== "string"
    ) throw new Error("Fresh-development campaign has an invalid frozen schema");
    const campaign = value as unknown as TerminalFreshDevelopmentCampaign;
    if (
        sha256File(campaign.authorizationAnalysisPath) !== campaign.authorizationAnalysisSha256 ||
        sha256File(campaign.sourceOpenCampaignPath) !== TERMINAL_FRESH_DEVELOPMENT_OPEN_CAMPAIGN_SHA256 ||
        sha256File(campaign.protocolPath) !== TERMINAL_FRESH_DEVELOPMENT_PROTOCOL_SHA256 ||
        sha256File(campaign.publicRolePath) !== TERMINAL_FRESH_DEVELOPMENT_PUBLIC_ROLE_SHA256 ||
        sha256File(campaign.privateRolePath) !== TERMINAL_FRESH_DEVELOPMENT_PRIVATE_ROLE_SHA256 ||
        terminalObjectivePolicySha256(campaign.candidate.policy) !== TERMINAL_FRESH_DEVELOPMENT_CANDIDATE_POLICY_ID
    ) throw new Error("Fresh-development campaign commitments drifted");
    const authorization = readJson(campaign.authorizationAnalysisPath);
    if (
        !isRecord(authorization) || authorization.status !== TERMINAL_FRESH_DEVELOPMENT_OPEN_ANALYSIS_STATUS ||
        authorization.advanced !== true || authorization.campaignSha256 !== TERMINAL_FRESH_DEVELOPMENT_OPEN_CAMPAIGN_SHA256 ||
        !isRecord(authorization.advancementChecks) || Object.values(authorization.advancementChecks).length !== 6 ||
        !Object.values(authorization.advancementChecks).every((entry) => entry === true)
    ) throw new Error("Fresh-development authorization no longer passes exactly");
    const roleFamilies = parseTerminalFreshDevelopmentFamilies(readJson(campaign.privateRolePath), repoRoot);
    if (roleFamilies.some((family, index) => JSON.stringify(family) !== JSON.stringify(campaign.families[index]))) {
        throw new Error("Fresh-development campaign family schedule drifted from its private role");
    }
    if (campaign.shards.some((shard, index) => {
        const familyOrdinal = Math.floor(index / (9 * TERMINAL_FRESH_DEVELOPMENT_SEEDS_PER_CELL));
        const countryOrdinal = Math.floor(index / TERMINAL_FRESH_DEVELOPMENT_SEEDS_PER_CELL) % 9;
        const seedOrdinal = index % TERMINAL_FRESH_DEVELOPMENT_SEEDS_PER_CELL;
        const family = campaign.families[familyOrdinal];
        return shard.shardIndex !== index || shard.familyOrdinal !== familyOrdinal || shard.countryOrdinal !== countryOrdinal ||
            shard.seedOrdinal !== seedOrdinal || shard.familyId !== family.familyId || shard.mapName !== family.mapName ||
            shard.mapSha256 !== family.mapSha256 || shard.country !== TERMINAL_FRESH_DEVELOPMENT_COUNTRIES[countryOrdinal] ||
            shard.seedBlockIndex !== index ||
            shard.requestedEngineSeed !== derivePairedEngineSeed(TERMINAL_FRESH_DEVELOPMENT_ENGINE_SEED_BASE, index) ||
            shard.launchedGameCount !== 2;
    })) throw new Error("Fresh-development shard schedule drifted");
    if (
        new Set(campaign.shards.map(({ planFile }) => planFile)).size !== TERMINAL_FRESH_DEVELOPMENT_SHARD_COUNT ||
        new Set(campaign.shards.map(({ planSha256 }) => planSha256)).size !== TERMINAL_FRESH_DEVELOPMENT_SHARD_COUNT ||
        new Set(campaign.shards.map(({ runId }) => runId)).size !== TERMINAL_FRESH_DEVELOPMENT_SHARD_COUNT
    ) throw new Error("Fresh-development plan identities are not unique");
    return campaign;
};

export const parseTerminalFreshDevelopmentSacct = (
    raw: string,
    arrayJobId: string,
): Map<number, SchedulerTask> => {
    const tasks = new Map<number, SchedulerTask>();
    for (const [lineIndex, line] of raw.split("\n").entries()) {
        if (!line) continue;
        const fields = line.split("|");
        if (fields.length !== 5) throw new Error(`Fresh-development sacct line ${lineIndex + 1} is malformed`);
        const [logicalJobId, schedulerJobId, state, exitCode, account] = fields;
        const match = new RegExp(`^${arrayJobId}_(\\d+)$`).exec(logicalJobId);
        const taskIndex = match ? Number(match[1]) : -1;
        if (
            !match || !/^\d+$/.test(schedulerJobId) || taskIndex < 0 || taskIndex >= TERMINAL_FRESH_DEVELOPMENT_SHARD_COUNT ||
            tasks.has(taskIndex) || state !== "COMPLETED" || exitCode !== "0:0" || account !== "pi_jss233"
        ) throw new Error(`Fresh-development scheduler row ${lineIndex + 1} is failed, duplicate, or unauthorized`);
        tasks.set(taskIndex, { schedulerJobId, state, exitCode, account });
    }
    if (tasks.size !== TERMINAL_FRESH_DEVELOPMENT_SHARD_COUNT) {
        throw new Error(`Fresh-development sacct returned ${tasks.size}/${TERMINAL_FRESH_DEVELOPMENT_SHARD_COUNT} tasks`);
    }
    return tasks;
};

const parseEvents = (eventsPath: string): RecordValue[] => fs.readFileSync(eventsPath, "utf8")
    .split("\n").filter(Boolean).map((line, index) => {
        const value = JSON.parse(line) as unknown;
        if (!isRecord(value) || typeof value.event !== "string") throw new Error(`Malformed fresh event ${index}`);
        return value;
    });

const validateShard = (
    campaign: TerminalFreshDevelopmentCampaign,
    resultsRoot: string,
    arrayJobId: string,
    task: SchedulerTask,
    shard: TerminalFreshDevelopmentCampaign["shards"][number],
): number => {
    const resultDir = path.join(resultsRoot, `${arrayJobId}_${shard.shardIndex}`, "run");
    const manifestPath = path.join(resultDir, "manifest.json");
    const summaryPath = path.join(resultDir, "summary.json");
    const eventsPath = path.join(resultDir, "events.jsonl");
    for (const required of [manifestPath, summaryPath, eventsPath, shard.planFile]) {
        if (!fs.existsSync(required)) throw new Error(`Fresh-development shard ${shard.shardIndex} lacks ${required}`);
    }
    if (sha256File(shard.planFile) !== shard.planSha256) throw new Error(`Fresh-development shard ${shard.shardIndex} plan changed`);
    const summary = readJson(summaryPath);
    if (
        !isRecord(summary) || summary.schemaVersion !== 2 ||
        summary.status !== "COMPLETE_TERMINAL_OBJECTIVE_FRESH_DEVELOPMENT_SHARD" ||
        summary.runId !== shard.runId || summary.planSha256 !== shard.planSha256 ||
        summary.requestedLaunches !== 2 || summary.accountedLaunches !== 2 || summary.completed !== 2 ||
        summary.technicalFailures !== 0 || summary.complete !== true || summary.technicallyClean !== true ||
        summary.outcomeAccess !== "fresh-development-single-scheduled" ||
        !Number.isSafeInteger(summary.candidateWins) || !Number.isSafeInteger(summary.baselineWins) ||
        !Number.isSafeInteger(summary.draws) ||
        Number(summary.candidateWins) + Number(summary.baselineWins) + Number(summary.draws) !== 2
    ) throw new Error(`Fresh-development shard ${shard.shardIndex} summary is not complete and clean`);
    const outer = readJson(manifestPath);
    if (!isRecord(outer) || outer.planSha256 !== shard.planSha256 || !isRecord(outer.plan) || !isRecord(outer.manifest)) {
        throw new Error(`Fresh-development shard ${shard.shardIndex} manifest is malformed`);
    }
    const plan = parseTerminalFreshDevelopmentRunPlan(outer.plan);
    if (
        plan.runId !== shard.runId || plan.sourceGitCommit !== campaign.sourceGitCommit ||
        plan.sourceRuntimeSha256 !== campaign.sourceRuntimeSha256 || plan.baselineGitCommit !== campaign.baselineGitCommit ||
        plan.baselineRuntimeSha256 !== campaign.baselineRuntimeSha256 || plan.gameApiRuntimeSha256 !== campaign.gameApiRuntimeSha256 ||
        plan.packageLockSha256 !== campaign.packageLockSha256 ||
        plan.sourcePopulationCommitmentSha256 !== TERMINAL_FRESH_DEVELOPMENT_PRIVATE_ROLE_SHA256 ||
        plan.family.familyId !== shard.familyId || plan.family.mapName !== shard.mapName || plan.family.mapSha256 !== shard.mapSha256 ||
        plan.country !== shard.country || plan.engineSeedBase !== campaign.engineSeedBase || plan.seedBlockIndex !== shard.seedBlockIndex ||
        plan.requestedEngineSeed !== shard.requestedEngineSeed || plan.maxTicks !== campaign.maxTicks ||
        plan.arms.length !== 1 || plan.arms[0].armId !== "full_sufficient_strike" ||
        plan.arms[0].policyId !== TERMINAL_FRESH_DEVELOPMENT_CANDIDATE_POLICY_ID || plan.episodes.length !== 2
    ) throw new Error(`Fresh-development shard ${shard.shardIndex} plan commitments drifted`);
    const scheduler = outer.manifest.scheduler;
    const source = outer.manifest.source;
    if (
        !isRecord(scheduler) || scheduler.account !== "pi_jss233" || String(scheduler.arrayJobId) !== arrayJobId ||
        String(scheduler.arrayTaskId) !== String(shard.shardIndex) || String(scheduler.jobId) !== task.schedulerJobId ||
        !isRecord(source) || source.gitCommit !== campaign.sourceGitCommit || source.gitBranch !== "main" || source.trackedDirty !== false
    ) throw new Error(`Fresh-development shard ${shard.shardIndex} scheduler or source provenance drifted`);
    const events = parseEvents(eventsPath);
    if (events[0]?.event !== "run_start" || events[events.length - 1]?.event !== "run_complete") {
        throw new Error(`Fresh-development shard ${shard.shardIndex} boundary events drifted`);
    }
    let cursor = 1;
    for (let launchIndex = 0; launchIndex < 2; launchIndex += 1) {
        const episode = plan.episodes[launchIndex];
        const launch = events[cursor++];
        if (
            launch?.event !== "launch_counted" || launch.launchIndex !== launchIndex || launch.episodeId !== episode.episodeId ||
            launch.familyId !== shard.familyId || launch.country !== shard.country || launch.armId !== "full_sufficient_strike" ||
            launch.policyId !== TERMINAL_FRESH_DEVELOPMENT_CANDIDATE_POLICY_ID ||
            launch.seedBlockIndex !== shard.seedBlockIndex || launch.requestedEngineSeed !== shard.requestedEngineSeed ||
            launch.candidateSlot !== episode.candidateSlot
        ) throw new Error(`Fresh-development shard ${shard.shardIndex} launch ${launchIndex} drifted`);
        const completion = events[cursor++];
        if (completion?.event !== "episode_complete" || completion.launchIndex !== launchIndex) {
            throw new Error(`Fresh-development shard ${shard.shardIndex} launch ${launchIndex} did not complete cleanly`);
        }
        validateTerminalObjectiveResult(completion.result, {
            episodeId: episode.episodeId,
            familyId: shard.familyId,
            mapName: shard.mapName,
            mapSha256: shard.mapSha256,
            policyId: TERMINAL_FRESH_DEVELOPMENT_CANDIDATE_POLICY_ID,
            candidateSlot: episode.candidateSlot,
            country: shard.country,
            seedBlockIndex: shard.seedBlockIndex,
            requestedEngineSeed: shard.requestedEngineSeed,
            maxTicks: campaign.maxTicks,
        });
    }
    if (cursor !== events.length - 1 || !isRecord(events[cursor].summary)) {
        throw new Error(`Fresh-development shard ${shard.shardIndex} event accounting is incomplete`);
    }
    return 2;
};

export const terminalFreshDevelopmentResultArtifactCommitmentSha256 = (
    campaign: TerminalFreshDevelopmentCampaign,
    resultsRoot: string,
    arrayJobId: string,
): string => crypto.createHash("sha256").update(JSON.stringify(campaign.shards.map(({ shardIndex }) => {
    const root = path.join(resultsRoot, `${arrayJobId}_${shardIndex}`, "run");
    return {
        shardIndex,
        manifestSha256: sha256File(path.join(root, "manifest.json")),
        summarySha256: sha256File(path.join(root, "summary.json")),
        eventsSha256: sha256File(path.join(root, "events.jsonl")),
    };
}))).digest("hex");

const main = (): void => {
    const campaignPath = requiredPath("CAMPAIGN");
    const resultsRoot = requiredPath("RESULTS_ROOT");
    const outputPath = requiredPath("OUT_FILE");
    const arrayJobId = requiredArrayJobId();
    if (fs.existsSync(outputPath)) throw new Error(`Refusing to overwrite fresh-development gate ${outputPath}`);
    const repoRoot = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
    const campaign = validateTerminalFreshDevelopmentCampaign(readJson(campaignPath), repoRoot);
    const schedulerTasks = parseTerminalFreshDevelopmentSacct(execFileSync(
        "/opt/slurm/current/bin/sacct",
        ["-j", arrayJobId, "-n", "-P", "-X", "--format=JobID,JobIDRaw,State,ExitCode,Account"],
        { encoding: "utf8" },
    ), arrayJobId);
    let accountedLaunches = 0;
    for (const shard of campaign.shards) accountedLaunches += validateShard(
        campaign, resultsRoot, arrayJobId, schedulerTasks.get(shard.shardIndex) as SchedulerTask, shard,
    );
    if (accountedLaunches !== TERMINAL_FRESH_DEVELOPMENT_LAUNCH_COUNT) {
        throw new Error("Fresh-development launch accounting is incomplete");
    }
    const gitCommit = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
    const gitBranch = execFileSync("git", ["branch", "--show-current"], { encoding: "utf8" }).trim();
    const dirty = execFileSync("git", ["status", "--short", "--untracked-files=no"], { encoding: "utf8" }).trim();
    if (gitCommit !== campaign.sourceGitCommit || gitBranch !== "main" || dirty) {
        throw new Error("Fresh-development gate requires the unchanged clean campaign source on main");
    }
    const output = {
        schemaVersion: 1,
        status: "PASSED_TERMINAL_OBJECTIVE_FRESH_DEVELOPMENT_TECHNICAL_GATE_OUTCOMES_NOT_SUMMARIZED",
        generatedAt: new Date().toISOString(),
        gateSourceGitCommit: gitCommit,
        campaignPath,
        campaignSha256: sha256File(campaignPath),
        resultsRoot,
        resultArtifactCommitmentSha256: terminalFreshDevelopmentResultArtifactCommitmentSha256(campaign, resultsRoot, arrayJobId),
        arrayJobId,
        schedulerAccount: "pi_jss233",
        schedulerJobIds: [...schedulerTasks.values()].map(({ schedulerJobId }) => schedulerJobId),
        shardCount: TERMINAL_FRESH_DEVELOPMENT_SHARD_COUNT,
        requestedLaunches: TERMINAL_FRESH_DEVELOPMENT_LAUNCH_COUNT,
        accountedLaunches,
        technicalFailures: 0,
        endpointViolations: 0,
        informationBoundaryViolations: 0,
        outcomeFieldsEmitted: [],
        authorizedNextPhase: "single-terminal-objective-fresh-development-unblinding",
    };
    fs.mkdirSync(path.dirname(outputPath), { recursive: true, mode: 0o700 });
    fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`, { flag: "wx", mode: 0o600 });
    console.log(JSON.stringify({ outputPath, outputSha256: sha256File(outputPath), status: output.status, accountedLaunches }));
};

const invoked = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (import.meta.url === invoked) { try { main(); } catch (error) { console.error(error); process.exitCode = 1; } }
