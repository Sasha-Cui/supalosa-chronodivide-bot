import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
    DevelopmentPhase,
    ResearchDevelopmentCampaign,
} from "./researchDevelopmentPlanGenerator.js";
import {
    parseResearchRunPlan,
    sha256File,
} from "./researchPlanRunner.js";

export const RESEARCH_DEVELOPMENT_TECHNICAL_GATE_SCHEMA_VERSION = 1 as const;

type SealedDevelopmentSummary = {
    schemaVersion: 1;
    generatedAt: string;
    runId: string;
    planBytesSha256: string;
    requestedLaunches: number;
    accountedLaunches: number;
    completed: number;
    technicalFailures: number;
    complete: boolean;
    technicallyClean: boolean;
    outcomeAccess: "sealed-private-events";
};

type CompletionRecord = {
    familyId: string;
    optimizerRunIndex: number;
    seedBlockIndex: number;
    freshProcessRepeat: number;
    methodId: string;
    candidateSlot: 0 | 1;
    normalizedSha256: string;
};

const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const FORBIDDEN_OUTCOME_KEYS = [
    "candidateWins",
    "baselineWins",
    "draws",
    "candidateScoreRate",
    "winner",
    "candidateScore",
] as const;

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null && !Array.isArray(value);

const expectString = (value: Record<string, unknown>, key: string): string => {
    const result = value[key];
    if (typeof result !== "string" || result.length === 0) {
        throw new Error(`${key} must be a non-empty string`);
    }
    return result;
};

const expectInteger = (value: Record<string, unknown>, key: string): number => {
    const result = value[key];
    if (!Number.isSafeInteger(result) || (result as number) < 0) {
        throw new Error(`${key} must be a non-negative integer`);
    }
    return result as number;
};

export const validateSealedDevelopmentSummary = (value: unknown): SealedDevelopmentSummary => {
    if (!isRecord(value)) {
        throw new Error("Development summary must be an object");
    }
    for (const key of FORBIDDEN_OUTCOME_KEYS) {
        if (key in value) {
            throw new Error(`Development summary leaks forbidden outcome field ${key}`);
        }
    }
    const expectedKeys = [
        "schemaVersion",
        "generatedAt",
        "runId",
        "planBytesSha256",
        "requestedLaunches",
        "accountedLaunches",
        "completed",
        "technicalFailures",
        "complete",
        "technicallyClean",
        "outcomeAccess",
    ].sort();
    const actualKeys = Object.keys(value).sort();
    if (
        actualKeys.length !== expectedKeys.length ||
        actualKeys.some((key, index) => key !== expectedKeys[index])
    ) {
        throw new Error("Development summary schema differs from the sealed technical-only interface");
    }
    const planBytesSha256 = expectString(value, "planBytesSha256");
    if (
        value.schemaVersion !== 1 ||
        !SHA256_PATTERN.test(planBytesSha256) ||
        value.outcomeAccess !== "sealed-private-events" ||
        typeof value.generatedAt !== "string" ||
        typeof value.runId !== "string" ||
        typeof value.complete !== "boolean" ||
        typeof value.technicallyClean !== "boolean"
    ) {
        throw new Error("Development summary has invalid sealed metadata");
    }
    return {
        schemaVersion: 1,
        generatedAt: value.generatedAt,
        runId: value.runId,
        planBytesSha256,
        requestedLaunches: expectInteger(value, "requestedLaunches"),
        accountedLaunches: expectInteger(value, "accountedLaunches"),
        completed: expectInteger(value, "completed"),
        technicalFailures: expectInteger(value, "technicalFailures"),
        complete: value.complete,
        technicallyClean: value.technicallyClean,
        outcomeAccess: "sealed-private-events",
    };
};

export const normalizedRepeatResultSha256 = (value: unknown): string => {
    if (!isRecord(value)) {
        throw new Error("Completed development result must be an object");
    }
    const { episodeId: _episodeId, wallTimeMs: _wallTimeMs, ...normalized } = value;
    return crypto.createHash("sha256").update(JSON.stringify(normalized)).digest("hex");
};

const parseJsonFile = (filePath: string): unknown => JSON.parse(fs.readFileSync(filePath, "utf8"));

const parseCampaign = (campaignPath: string): ResearchDevelopmentCampaign => {
    const value = parseJsonFile(campaignPath);
    if (
        !isRecord(value) ||
        value.schemaVersion !== 1 ||
        (
            value.phase !== "development-phase1" &&
            value.phase !== "development-phase2" &&
            value.phase !== "development-phase3"
        ) ||
        value.outcomeAccess !== "sealed-private-events" ||
        !Array.isArray(value.shards) ||
        !Array.isArray(value.selectedFamilies) ||
        !Array.isArray(value.selectedOptimizerRuns)
    ) {
        throw new Error("Development campaign manifest has an invalid schema");
    }
    if (value.phase === "development-phase3") {
        throw new Error("Technical compatibility gate refuses phase-3 outcome-bearing analysis");
    }
    return value as unknown as ResearchDevelopmentCampaign;
};

const parseEvents = (eventsPath: string): Record<string, unknown>[] => {
    const lines = fs.readFileSync(eventsPath, "utf8").split("\n").filter((line) => line.length > 0);
    return lines.map((line, index) => {
        const value = JSON.parse(line) as unknown;
        if (!isRecord(value) || typeof value.event !== "string") {
            throw new Error(`Development event ${index} in ${eventsPath} has an invalid schema`);
        }
        return value;
    });
};

const requiredPath = (name: string): string => {
    const value = process.env[name];
    if (!value) {
        throw new Error(`${name} is required`);
    }
    return path.resolve(value);
};

const requiredArrayJobId = (): string => {
    const value = process.env.ARRAY_JOB_ID;
    if (!value || !/^\d+$/.test(value)) {
        throw new Error("ARRAY_JOB_ID must be the numeric Slurm array job ID");
    }
    return value;
};

const validateShard = (
    campaign: ResearchDevelopmentCampaign,
    resultsRoot: string,
    arrayJobId: string,
    shard: ResearchDevelopmentCampaign["shards"][number],
): { schedulerJobId: string; completions: CompletionRecord[] } => {
    const resultDir = path.join(resultsRoot, `${arrayJobId}_${shard.shardIndex}`);
    const manifestPath = path.join(resultDir, "manifest.json");
    const summaryPath = path.join(resultDir, "summary.json");
    const eventsPath = path.join(resultDir, "events.jsonl");
    for (const required of [manifestPath, summaryPath, eventsPath, shard.planFile]) {
        if (!fs.existsSync(required)) {
            throw new Error(`Development shard ${shard.shardIndex} lacks required artifact ${required}`);
        }
    }
    if (sha256File(shard.planFile) !== shard.planSha256) {
        throw new Error(`Development shard ${shard.shardIndex} plan bytes differ from the campaign commitment`);
    }
    const summary = validateSealedDevelopmentSummary(parseJsonFile(summaryPath));
    if (
        summary.runId !== shard.runId ||
        summary.planBytesSha256 !== shard.planSha256 ||
        summary.requestedLaunches !== 4 ||
        summary.accountedLaunches !== 4 ||
        summary.completed !== 4 ||
        summary.technicalFailures !== 0 ||
        summary.complete !== true ||
        summary.technicallyClean !== true
    ) {
        throw new Error(`Development shard ${shard.shardIndex} is not one technically clean four-game block`);
    }
    const outerManifest = parseJsonFile(manifestPath);
    if (!isRecord(outerManifest) || !isRecord(outerManifest.plan) || !isRecord(outerManifest.manifest)) {
        throw new Error(`Development shard ${shard.shardIndex} manifest has an invalid schema`);
    }
    const plan = parseResearchRunPlan(outerManifest.plan);
    if (
        outerManifest.planBytesSha256 !== shard.planSha256 ||
        plan.runId !== shard.runId ||
        plan.role !== "development" ||
        plan.sourceGitCommit !== campaign.sourceGitCommit ||
        plan.roleManifestSha256 !== campaign.roleManifestSha256 ||
        plan.roleCommitmentSha256 !== campaign.roleCommitmentSha256 ||
        plan.splitCommitmentSha256 !== campaign.splitCommitmentSha256 ||
        plan.sourcePopulationCommitmentSha256 !== campaign.sourcePopulationCommitmentSha256 ||
        plan.episodes.length !== 4
    ) {
        throw new Error(`Development shard ${shard.shardIndex} manifest and campaign commitments disagree`);
    }
    const scheduler = outerManifest.manifest.scheduler;
    if (
        !isRecord(scheduler) ||
        scheduler.account !== "pi_jss233" ||
        (typeof scheduler.jobId !== "string" && typeof scheduler.jobId !== "number")
    ) {
        throw new Error(`Development shard ${shard.shardIndex} lacks authoritative pi_jss233 scheduler provenance`);
    }
    const schedulerJobId = String(scheduler.jobId);
    const events = parseEvents(eventsPath);
    const counts = new Map<string, number>();
    for (const event of events) {
        const eventName = event.event as string;
        counts.set(eventName, (counts.get(eventName) ?? 0) + 1);
    }
    if (
        counts.get("run_start") !== 1 ||
        counts.get("launch_counted") !== 4 ||
        counts.get("episode_complete") !== 4 ||
        (counts.get("technical_failure") ?? 0) !== 0 ||
        counts.get("run_complete") !== 1 ||
        events.length !== 10
    ) {
        throw new Error(`Development shard ${shard.shardIndex} event accounting is incomplete or inconsistent`);
    }
    const expectedEpisodes = new Map(plan.episodes.map((episode) => [episode.episodeId, episode]));
    const completions: CompletionRecord[] = [];
    for (const event of events.filter(({ event }) => event === "episode_complete")) {
        if (!isRecord(event.result)) {
            throw new Error(`Development shard ${shard.shardIndex} has a malformed completion event`);
        }
        const result = event.result;
        const episodeId = expectString(result, "episodeId");
        const expected = expectedEpisodes.get(episodeId);
        if (
            !expected ||
            result.familyId !== expected.familyId ||
            result.policyId !== expected.policyId ||
            result.methodId !== expected.methodId ||
            result.seedBlockIndex !== expected.seedBlockIndex ||
            result.requestedEngineSeed !== expected.requestedEngineSeed ||
            result.candidateSlot !== expected.candidateSlot
        ) {
            throw new Error(`Development shard ${shard.shardIndex} completion ${episodeId} drifts from its plan`);
        }
        completions.push({
            familyId: shard.familyId,
            optimizerRunIndex: shard.optimizerRunIndex,
            seedBlockIndex: shard.seedBlockIndex,
            freshProcessRepeat: shard.freshProcessRepeat,
            methodId: expected.methodId,
            candidateSlot: expected.candidateSlot,
            normalizedSha256: normalizedRepeatResultSha256(result),
        });
    }
    return { schedulerJobId, completions };
};

const main = (): void => {
    const campaignPath = requiredPath("CAMPAIGN");
    const resultsRoot = requiredPath("RESULTS_ROOT");
    const outputPath = requiredPath("OUT_FILE");
    const arrayJobId = requiredArrayJobId();
    if (fs.existsSync(outputPath)) {
        throw new Error(`Refusing to overwrite development technical gate ${outputPath}`);
    }
    const campaignSha256 = sha256File(campaignPath);
    const campaign = parseCampaign(campaignPath);
    const expectedShards = campaign.phase === "development-phase1" ? 16 : 24;
    const expectedLaunches = campaign.phase === "development-phase1" ? 64 : 96;
    if (
        campaign.shards.length !== expectedShards ||
        campaign.launchedGameCount !== expectedLaunches ||
        campaign.shards.some(({ launchedGameCount }) => launchedGameCount !== 4)
    ) {
        throw new Error(`Development ${campaign.phase} campaign does not match its frozen launch allocation`);
    }
    const schedulerJobIds: string[] = [];
    const completions: CompletionRecord[] = [];
    for (const shard of campaign.shards) {
        const validated = validateShard(campaign, resultsRoot, arrayJobId, shard);
        schedulerJobIds.push(validated.schedulerJobId);
        completions.push(...validated.completions);
    }
    let repeatIdentityGroupCount: number | null = null;
    if (campaign.phase === "development-phase1") {
        const groups = new Map<string, CompletionRecord[]>();
        for (const completion of completions) {
            const key = [
                completion.familyId,
                completion.optimizerRunIndex,
                completion.seedBlockIndex,
                completion.methodId,
                completion.candidateSlot,
            ].join("|");
            const rows = groups.get(key) ?? [];
            rows.push(completion);
            groups.set(key, rows);
        }
        repeatIdentityGroupCount = groups.size;
        if (
            groups.size !== 32 ||
            [...groups.values()].some((rows) =>
                rows.length !== 2 ||
                new Set(rows.map(({ freshProcessRepeat }) => freshProcessRepeat)).size !== 2 ||
                new Set(rows.map(({ normalizedSha256 }) => normalizedSha256)).size !== 1
            )
        ) {
            throw new Error("Phase-1 fresh-process normalized result identity gate failed");
        }
    }
    const gitCommit = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
    const gitBranch = execFileSync("git", ["branch", "--show-current"], { encoding: "utf8" }).trim();
    const trackedDirty = execFileSync("git", ["status", "--short", "--untracked-files=no"], { encoding: "utf8" }).trim();
    if (gitBranch !== "main" || trackedDirty.length > 0) {
        throw new Error("Development technical gate requires a clean main-branch checkout");
    }
    const output = {
        schemaVersion: RESEARCH_DEVELOPMENT_TECHNICAL_GATE_SCHEMA_VERSION,
        status: "PASSED_TECHNICAL_ONLY_NO_OUTCOMES_INSPECTED",
        phase: campaign.phase as Exclude<DevelopmentPhase, "development-phase3">,
        generatedAt: new Date().toISOString(),
        gateSourceGitCommit: gitCommit,
        campaignPath,
        campaignSha256,
        campaignSourceGitCommit: campaign.sourceGitCommit,
        optimizerSourceGitCommit: campaign.optimizerSourceGitCommit,
        arrayJobId,
        schedulerAccount: "pi_jss233",
        schedulerJobIds: [...new Set(schedulerJobIds)].sort((left, right) => Number(left) - Number(right)),
        shardCount: campaign.shards.length,
        requestedLaunches: expectedLaunches,
        accountedLaunches: completions.length,
        completedLaunches: completions.length,
        technicalFailures: 0,
        sealedSummaryViolations: 0,
        repeatIdentityGroupCount,
        repeatIdentityPassed: campaign.phase === "development-phase1" ? true : null,
        outcomeFieldsEmitted: [],
        authorizedNextPhase:
            campaign.phase === "development-phase1" ? "development-phase2" : "development-phase3",
    };
    fs.mkdirSync(path.dirname(outputPath), { recursive: true, mode: 0o700 });
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), { flag: "wx", mode: 0o600 });
    console.log(JSON.stringify({
        outputPath,
        outputSha256: sha256File(outputPath),
        status: output.status,
        phase: output.phase,
        shardCount: output.shardCount,
        accountedLaunches: output.accountedLaunches,
        technicalFailures: output.technicalFailures,
        repeatIdentityPassed: output.repeatIdentityPassed,
        authorizedNextPhase: output.authorizedNextPhase,
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
