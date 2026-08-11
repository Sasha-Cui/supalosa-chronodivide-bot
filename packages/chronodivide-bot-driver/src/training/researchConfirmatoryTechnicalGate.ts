import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
    RESEARCH_CONFIRMATORY_CHAMPION_POLICY_ID,
    RESEARCH_CONFIRMATORY_DEFAULT_POLICY_ID,
    RESEARCH_CONFIRMATORY_LAUNCH_COUNT,
    RESEARCH_CONFIRMATORY_SHARD_COUNT,
    ResearchConfirmatoryCampaign,
} from "./researchConfirmatoryPlanGenerator.js";
import { validateSealedDevelopmentV2Summary } from "./researchDevelopmentV2TechnicalGate.js";
import { parseResearchRunPlan, sha256File } from "./researchPlanRunner.js";

export const RESEARCH_CONFIRMATORY_TECHNICAL_GATE_SCHEMA_VERSION = 1 as const;

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null && !Array.isArray(value);

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

const confirmatoryFamilyRankSha256 = (familyId: string): string => crypto.createHash("sha256")
    .update(`chrono-divide-confirmatory-v1\0${familyId}`)
    .digest("hex");

export const validateConfirmatoryCampaignStructure = (value: unknown): ResearchConfirmatoryCampaign => {
    if (
        !isRecord(value) || value.schemaVersion !== 1 || value.kind !== "method-v2-confirmatory" ||
        value.outcomeAccess !== "sealed-private-events" || value.familyCount !== 16 ||
        value.blocksPerFamily !== 8 || value.shardCount !== 128 || value.launchedGameCount !== 512 ||
        !Array.isArray(value.selectedFamilies) || value.selectedFamilies.length !== 16 ||
        !Array.isArray(value.shards) || value.shards.length !== 128 ||
        !Array.isArray(value.policies) || value.policies.length !== 2
    ) throw new Error("Confirmatory campaign has an invalid frozen schema");
    const campaign = value as unknown as ResearchConfirmatoryCampaign;
    const selectedFamilyIds = campaign.selectedFamilies.map(({ familyId }) => familyId);
    const sortedFamilyIds = [...selectedFamilyIds].sort((left, right) =>
        confirmatoryFamilyRankSha256(left).localeCompare(confirmatoryFamilyRankSha256(right))
    );
    if (
        selectedFamilyIds.some((familyId) => typeof familyId !== "string") ||
        new Set(selectedFamilyIds).size !== 16 ||
        selectedFamilyIds.some((familyId, index) => familyId !== sortedFamilyIds[index]) ||
        campaign.selectedFamilies.some(({ familyId, representativeSha256, rankSha256 }) =>
            !/^[0-9a-f]{64}$/.test(representativeSha256) || rankSha256 !== confirmatoryFamilyRankSha256(familyId)
        ) ||
        campaign.shards.some((shard, index) =>
            shard.shardIndex !== index || shard.familyRank !== Math.floor(index / 8) ||
            shard.seedOrdinal !== index % 8 || shard.seedBlockIndex !== index ||
            shard.familyId !== selectedFamilyIds[Math.floor(index / 8)] || shard.launchedGameCount !== 4
        ) ||
        new Set(campaign.shards.map(({ planFile }) => planFile)).size !== 128 ||
        new Set(campaign.shards.map(({ runId }) => runId)).size !== 128 ||
        new Set(campaign.shards.map(({ planSha256 }) => planSha256)).size !== 128 ||
        campaign.policies.map(({ policyId }) => policyId).sort().join(",") !==
            [RESEARCH_CONFIRMATORY_CHAMPION_POLICY_ID, RESEARCH_CONFIRMATORY_DEFAULT_POLICY_ID].sort().join(",")
    ) throw new Error("Confirmatory campaign schedule differs from the frozen all-family allocation");
    return campaign;
};

const parseCampaign = (campaignPath: string): ResearchConfirmatoryCampaign =>
    validateConfirmatoryCampaignStructure(parseJson(campaignPath));

export const confirmatoryResultArtifactCommitmentSha256 = (
    campaign: ResearchConfirmatoryCampaign,
    resultsRoot: string,
    arrayJobId: string,
): string => {
    const artifacts = campaign.shards.map(({ shardIndex }) => {
        const resultDir = path.join(resultsRoot, `${arrayJobId}_${shardIndex}`);
        return {
            shardIndex,
            manifestSha256: sha256File(path.join(resultDir, "manifest.json")),
            summarySha256: sha256File(path.join(resultDir, "summary.json")),
            eventsSha256: sha256File(path.join(resultDir, "events.jsonl")),
        };
    });
    return crypto.createHash("sha256").update(JSON.stringify(artifacts)).digest("hex");
};

const parseEvents = (eventsPath: string): Record<string, unknown>[] => fs.readFileSync(eventsPath, "utf8")
    .split("\n").filter(Boolean).map((line, index) => {
        const value = JSON.parse(line) as unknown;
        if (!isRecord(value) || typeof value.event !== "string") {
            throw new Error(`Confirmatory event ${index} in ${eventsPath} is malformed`);
        }
        return value;
    });

const validateShard = (
    campaign: ResearchConfirmatoryCampaign,
    resultsRoot: string,
    arrayJobId: string,
    shard: ResearchConfirmatoryCampaign["shards"][number],
): { schedulerJobId: string; completionCount: number } => {
    const resultDir = path.join(resultsRoot, `${arrayJobId}_${shard.shardIndex}`);
    const manifestPath = path.join(resultDir, "manifest.json");
    const summaryPath = path.join(resultDir, "summary.json");
    const eventsPath = path.join(resultDir, "events.jsonl");
    for (const required of [manifestPath, summaryPath, eventsPath, shard.planFile]) {
        if (!fs.existsSync(required)) throw new Error(`Confirmatory shard ${shard.shardIndex} lacks ${required}`);
    }
    if (sha256File(shard.planFile) !== shard.planSha256) throw new Error(`Confirmatory shard ${shard.shardIndex} plan bytes changed`);
    const summary = validateSealedDevelopmentV2Summary(parseJson(summaryPath));
    if (
        summary.runId !== shard.runId || summary.planBytesSha256 !== shard.planSha256 ||
        summary.requestedLaunches !== 4 || summary.accountedLaunches !== 4 || summary.completed !== 4 ||
        summary.technicalFailures !== 0 || !summary.complete || !summary.technicallyClean
    ) throw new Error(`Confirmatory shard ${shard.shardIndex} is not one clean four-game block`);
    const outer = parseJson(manifestPath);
    if (!isRecord(outer) || !isRecord(outer.plan) || !isRecord(outer.manifest)) throw new Error(`Confirmatory shard ${shard.shardIndex} manifest is malformed`);
    const plan = parseResearchRunPlan(outer.plan);
    if (
        outer.planBytesSha256 !== shard.planSha256 || plan.runId !== shard.runId ||
        plan.role !== "test" || plan.purpose !== "confirmatory-evaluation" ||
        plan.sourceGitCommit !== campaign.sourceGitCommit || plan.sourceRuntimeSha256 !== campaign.sourceRuntimeSha256 ||
        plan.baselineGitCommit !== campaign.baselineGitCommit || plan.baselineRuntimeSha256 !== campaign.baselineRuntimeSha256 ||
        plan.gameApiRuntimeSha256 !== campaign.gameApiRuntimeSha256 || plan.packageLockSha256 !== campaign.packageLockSha256 ||
        plan.roleManifestSha256 !== campaign.roleManifestSha256 || plan.roleCommitmentSha256 !== campaign.roleCommitmentSha256 ||
        plan.splitCommitmentSha256 !== campaign.splitCommitmentSha256 ||
        plan.sourcePopulationCommitmentSha256 !== campaign.sourcePopulationCommitmentSha256 ||
        plan.engineSeedBase !== campaign.engineSeedBase || plan.maxTicks !== campaign.maxTicks || plan.episodes.length !== 4
    ) throw new Error(`Confirmatory shard ${shard.shardIndex} commitments drifted`);
    const methodSlots = plan.episodes.map(({ methodId, candidateSlot }) => `${methodId}|${candidateSlot}`);
    const methodPolicies = new Map(plan.episodes.map(({ methodId, policyId }) => [methodId, policyId]));
    if (
        new Set(methodSlots).size !== 4 || methodPolicies.get("champion") !== RESEARCH_CONFIRMATORY_CHAMPION_POLICY_ID ||
        methodPolicies.get("default") !== RESEARCH_CONFIRMATORY_DEFAULT_POLICY_ID ||
        plan.episodes.some((episode) => episode.familyId !== shard.familyId || episode.seedBlockIndex !== shard.seedBlockIndex)
    ) throw new Error(`Confirmatory shard ${shard.shardIndex} method schedule drifted`);
    const manifest = outer.manifest;
    const scheduler = manifest.scheduler;
    const source = manifest.source;
    if (
        !isRecord(scheduler) || scheduler.account !== "pi_jss233" || String(scheduler.arrayJobId) !== arrayJobId ||
        String(scheduler.arrayTaskId) !== String(shard.shardIndex) ||
        (typeof scheduler.jobId !== "string" && typeof scheduler.jobId !== "number") ||
        !isRecord(source) || source.gitCommit !== campaign.sourceGitCommit || source.gitBranch !== "main" || source.trackedDirty !== false
    ) throw new Error(`Confirmatory shard ${shard.shardIndex} scheduler or source provenance drifted`);
    const events = parseEvents(eventsPath);
    const expectedOrder = [
        "run_start", "launch_counted", "episode_complete", "launch_counted", "episode_complete",
        "launch_counted", "episode_complete", "launch_counted", "episode_complete", "run_complete",
    ];
    if (events.length !== 10 || events.some((event, index) => event.event !== expectedOrder[index])) {
        throw new Error(`Confirmatory shard ${shard.shardIndex} event order drifted`);
    }
    if (
        events[0].planBytesSha256 !== shard.planSha256 || events[0].launchedEpisodeCount !== 4 ||
        !isRecord(events[9].summary) || events[9].summary.planBytesSha256 !== shard.planSha256 ||
        events[9].summary.runId !== shard.runId
    ) throw new Error(`Confirmatory shard ${shard.shardIndex} boundary events drifted`);
    const expectedById = new Map(plan.episodes.map((episode) => [episode.episodeId, episode]));
    const launches = events.filter(({ event }) => event === "launch_counted");
    const completions = events.filter(({ event }) => event === "episode_complete");
    launches.forEach((event, launchIndex) => {
        const expected = plan.episodes[launchIndex];
        if (
            event.launchIndex !== launchIndex || event.episodeId !== expected.episodeId || event.familyId !== expected.familyId ||
            event.policyId !== expected.policyId || event.methodId !== expected.methodId ||
            event.seedBlockIndex !== expected.seedBlockIndex || event.requestedEngineSeed !== expected.requestedEngineSeed ||
            event.candidateSlot !== expected.candidateSlot
        ) throw new Error(`Confirmatory shard ${shard.shardIndex} launch ${launchIndex} drifted`);
    });
    completions.forEach((event) => {
        if (!isRecord(event.result) || typeof event.result.episodeId !== "string") throw new Error(`Confirmatory shard ${shard.shardIndex} completion is malformed`);
        const expected = expectedById.get(event.result.episodeId);
        if (
            !expected || event.result.familyId !== expected.familyId || event.result.policyId !== expected.policyId ||
            event.result.methodId !== expected.methodId || event.result.seedBlockIndex !== expected.seedBlockIndex ||
            event.result.requestedEngineSeed !== expected.requestedEngineSeed || event.result.candidateSlot !== expected.candidateSlot
        ) throw new Error(`Confirmatory shard ${shard.shardIndex} completion identity drifted`);
    });
    return { schedulerJobId: String(scheduler.jobId), completionCount: completions.length };
};

const main = (): void => {
    const campaignPath = requiredPath("CAMPAIGN");
    const resultsRoot = requiredPath("RESULTS_ROOT");
    const outputPath = requiredPath("OUT_FILE");
    const arrayJobId = requiredArrayJobId();
    if (fs.existsSync(outputPath)) throw new Error(`Refusing to overwrite confirmatory technical gate ${outputPath}`);
    const campaign = parseCampaign(campaignPath);
    const campaignSha256 = sha256File(campaignPath);
    const schedulerJobIds: string[] = [];
    let completionCount = 0;
    for (const shard of campaign.shards) {
        const validated = validateShard(campaign, resultsRoot, arrayJobId, shard);
        schedulerJobIds.push(validated.schedulerJobId);
        completionCount += validated.completionCount;
    }
    if (
        campaign.shards.some(({ launchedGameCount }) => launchedGameCount !== 4) ||
        completionCount !== RESEARCH_CONFIRMATORY_LAUNCH_COUNT || new Set(schedulerJobIds).size !== RESEARCH_CONFIRMATORY_SHARD_COUNT
    ) throw new Error("Confirmatory launch or scheduler accounting is incomplete");
    const gitCommit = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
    const gitBranch = execFileSync("git", ["branch", "--show-current"], { encoding: "utf8" }).trim();
    const dirty = execFileSync("git", ["status", "--short", "--untracked-files=no"], { encoding: "utf8" }).trim();
    if (gitBranch !== "main" || dirty || gitCommit !== campaign.sourceGitCommit) throw new Error("Confirmatory gate requires unchanged clean campaign source on main");
    const output = {
        schemaVersion: RESEARCH_CONFIRMATORY_TECHNICAL_GATE_SCHEMA_VERSION,
        status: "PASSED_TECHNICAL_ONLY_NO_OUTCOMES_INSPECTED",
        generatedAt: new Date().toISOString(), gateSourceGitCommit: gitCommit,
        campaignPath, campaignSha256, campaignSourceGitCommit: campaign.sourceGitCommit,
        designSha256: campaign.designSha256, developmentUnblindingSha256: campaign.developmentUnblindingSha256,
        resultsRoot, resultArtifactCommitmentSha256: confirmatoryResultArtifactCommitmentSha256(campaign, resultsRoot, arrayJobId),
        arrayJobId, schedulerAccount: "pi_jss233",
        schedulerJobIds: [...new Set(schedulerJobIds)].sort((a, b) => Number(a) - Number(b)),
        shardCount: 128, requestedLaunches: 512, accountedLaunches: 512, completedLaunches: 512,
        technicalFailures: 0, sealedSummaryViolations: 0, outcomeFieldsEmitted: [],
        authorizedNextPhase: "confirmatory-unblinding",
    };
    fs.mkdirSync(path.dirname(outputPath), { recursive: true, mode: 0o700 });
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), { flag: "wx", mode: 0o600 });
    console.log(JSON.stringify({ outputPath, outputSha256: sha256File(outputPath), status: output.status, shardCount: 128, accountedLaunches: 512, authorizedNextPhase: output.authorizedNextPhase }));
};

const invokedModuleUrl = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (import.meta.url === invokedModuleUrl) try { main(); } catch (error) { console.error(error); process.exitCode = 1; }
