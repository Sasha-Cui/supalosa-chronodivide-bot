import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
    ResearchDevelopmentV2Campaign,
    ResearchDevelopmentV2Phase,
} from "./researchDevelopmentV2PlanGenerator.js";
import { parseResearchRunPlan, sha256File } from "./researchPlanRunner.js";

export const RESEARCH_DEVELOPMENT_V2_TECHNICAL_GATE_SCHEMA_VERSION = 1 as const;

export const developmentV2PhaseAllocation = (
    phase: ResearchDevelopmentV2Phase,
): { shards: number; launches: number } => phase === "development-v2-phase1"
    ? { shards: 8, launches: 32 }
    : phase === "development-v2-phase2"
        ? { shards: 22, launches: 88 }
        : { shards: 80, launches: 320 };

type SealedSummary = {
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
    seedBlockIndex: number;
    freshProcessRepeat: number;
    methodId: string;
    policyId: string;
    candidateSlot: 0 | 1;
    normalizedSha256: string | null;
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

export const validateSealedDevelopmentV2Summary = (value: unknown): SealedSummary => {
    if (!isRecord(value)) {
        throw new Error("Method-v2 development summary must be an object");
    }
    for (const key of FORBIDDEN_OUTCOME_KEYS) {
        if (key in value) {
            throw new Error(`Method-v2 development summary leaks forbidden outcome field ${key}`);
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
    if (actualKeys.length !== expectedKeys.length || actualKeys.some((key, index) => key !== expectedKeys[index])) {
        throw new Error("Method-v2 development summary differs from the sealed technical-only interface");
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
        throw new Error("Method-v2 development summary has invalid sealed metadata");
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

export const normalizedDevelopmentV2RepeatSha256 = (value: unknown): string => {
    if (!isRecord(value)) {
        throw new Error("Completed method-v2 development result must be an object");
    }
    const { episodeId: _episodeId, wallTimeMs: _wallTimeMs, ...normalized } = value;
    return crypto.createHash("sha256").update(JSON.stringify(normalized)).digest("hex");
};

const parseJsonFile = (filePath: string): unknown => JSON.parse(fs.readFileSync(filePath, "utf8"));

const parseCampaign = (campaignPath: string): ResearchDevelopmentV2Campaign => {
    const value = parseJsonFile(campaignPath);
    if (
        !isRecord(value) ||
        value.schemaVersion !== 1 ||
        (
            value.phase !== "development-v2-phase1" &&
            value.phase !== "development-v2-phase2" &&
            value.phase !== "development-v2-phase3"
        ) ||
        value.outcomeAccess !== "sealed-private-events" ||
        !Array.isArray(value.shards) ||
        !Array.isArray(value.selectedFamilies) ||
        !Array.isArray(value.policies)
    ) {
        throw new Error("Method-v2 development campaign manifest has an invalid schema");
    }
    return value as unknown as ResearchDevelopmentV2Campaign;
};

export const developmentV2ResultArtifactCommitmentSha256 = (
    campaign: ResearchDevelopmentV2Campaign,
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

const parseEvents = (eventsPath: string): Record<string, unknown>[] => fs
    .readFileSync(eventsPath, "utf8")
    .split("\n")
    .filter((line) => line.length > 0)
    .map((line, index) => {
        const value = JSON.parse(line) as unknown;
        if (!isRecord(value) || typeof value.event !== "string") {
            throw new Error(`Method-v2 development event ${index} in ${eventsPath} has an invalid schema`);
        }
        return value;
    });

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
    campaign: ResearchDevelopmentV2Campaign,
    resultsRoot: string,
    arrayJobId: string,
    shard: ResearchDevelopmentV2Campaign["shards"][number],
): { schedulerJobId: string; completions: CompletionRecord[] } => {
    const resultDir = path.join(resultsRoot, `${arrayJobId}_${shard.shardIndex}`);
    const manifestPath = path.join(resultDir, "manifest.json");
    const summaryPath = path.join(resultDir, "summary.json");
    const eventsPath = path.join(resultDir, "events.jsonl");
    for (const required of [manifestPath, summaryPath, eventsPath, shard.planFile]) {
        if (!fs.existsSync(required)) {
            throw new Error(`Method-v2 development shard ${shard.shardIndex} lacks ${required}`);
        }
    }
    if (sha256File(shard.planFile) !== shard.planSha256) {
        throw new Error(`Method-v2 development shard ${shard.shardIndex} plan bytes changed`);
    }
    const summary = validateSealedDevelopmentV2Summary(parseJsonFile(summaryPath));
    if (
        summary.runId !== shard.runId ||
        summary.planBytesSha256 !== shard.planSha256 ||
        summary.requestedLaunches !== 4 ||
        summary.accountedLaunches !== 4 ||
        summary.completed !== 4 ||
        summary.technicalFailures !== 0 ||
        !summary.complete ||
        !summary.technicallyClean
    ) {
        throw new Error(`Method-v2 development shard ${shard.shardIndex} is not a clean four-game block`);
    }
    const outer = parseJsonFile(manifestPath);
    if (!isRecord(outer) || !isRecord(outer.plan) || !isRecord(outer.manifest)) {
        throw new Error(`Method-v2 development shard ${shard.shardIndex} manifest is malformed`);
    }
    const plan = parseResearchRunPlan(outer.plan);
    const expectedPurpose = campaign.phase === "development-v2-phase3"
        ? "development-v2-evaluation"
        : "development-v2-qc";
    if (
        outer.planBytesSha256 !== shard.planSha256 ||
        plan.runId !== shard.runId ||
        plan.role !== "development" ||
        plan.purpose !== expectedPurpose ||
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
        plan.episodes.length !== 4
    ) {
        throw new Error(`Method-v2 development shard ${shard.shardIndex} manifest commitments disagree`);
    }
    const methods = [...new Set(plan.episodes.map(({ methodId }) => methodId))].sort();
    const policyIds = new Map(plan.episodes.map(({ methodId, policyId }) => [methodId, policyId]));
    const methodSlotKeys = plan.episodes.map(({ methodId, candidateSlot }) => `${methodId}|${candidateSlot}`);
    if (
        methods.join(",") !== "champion,default" ||
        policyIds.get("champion") !== campaign.championPolicyId ||
        policyIds.get("default") !== campaign.defaultPolicyId ||
        new Set(methodSlotKeys).size !== 4 ||
        plan.episodes.some((episode) =>
            episode.familyId !== shard.familyId ||
            episode.seedBlockIndex !== shard.seedBlockIndex
        ) ||
        new Set(plan.episodes.map(({ candidateSlot }) => candidateSlot)).size !== 2
    ) {
        throw new Error(`Method-v2 development shard ${shard.shardIndex} method schedule drifted`);
    }
    const manifest = outer.manifest;
    const scheduler = manifest.scheduler;
    const source = manifest.source;
    const software = manifest.software;
    if (
        !isRecord(scheduler) ||
        scheduler.account !== "pi_jss233" ||
        String(scheduler.arrayJobId) !== arrayJobId ||
        String(scheduler.arrayTaskId) !== String(shard.shardIndex) ||
        (typeof scheduler.jobId !== "string" && typeof scheduler.jobId !== "number") ||
        !isRecord(source) ||
        source.gitCommit !== campaign.sourceGitCommit ||
        source.gitBranch !== "main" ||
        source.trackedDirty !== false ||
        !isRecord(software) ||
        software.packageLockSha256 !== campaign.packageLockSha256
    ) {
        throw new Error(`Method-v2 development shard ${shard.shardIndex} scheduler or runtime provenance drifted`);
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
        throw new Error(`Method-v2 development shard ${shard.shardIndex} event accounting is inconsistent`);
    }
    const expectedEventOrder = [
        "run_start",
        "launch_counted", "episode_complete",
        "launch_counted", "episode_complete",
        "launch_counted", "episode_complete",
        "launch_counted", "episode_complete",
        "run_complete",
    ];
    if (events.some((event, index) => event.event !== expectedEventOrder[index])) {
        throw new Error(`Method-v2 development shard ${shard.shardIndex} event order drifted`);
    }
    if (
        events[0].planBytesSha256 !== shard.planSha256 ||
        events[0].launchedEpisodeCount !== 4 ||
        !isRecord(events[9].summary) ||
        events[9].summary.planBytesSha256 !== shard.planSha256 ||
        events[9].summary.runId !== shard.runId
    ) {
        throw new Error(`Method-v2 development shard ${shard.shardIndex} boundary events drifted`);
    }
    const expectedEpisodes = new Map(plan.episodes.map((episode) => [episode.episodeId, episode]));
    const launchEvents = events.filter(({ event }) => event === "launch_counted");
    launchEvents.forEach((event, launchIndex) => {
        const episode = plan.episodes[launchIndex];
        if (
            event.launchIndex !== launchIndex ||
            event.episodeId !== episode.episodeId ||
            event.familyId !== episode.familyId ||
            event.policyId !== episode.policyId ||
            event.methodId !== episode.methodId ||
            event.seedBlockIndex !== episode.seedBlockIndex ||
            event.requestedEngineSeed !== episode.requestedEngineSeed ||
            event.candidateSlot !== episode.candidateSlot
        ) {
            throw new Error(`Method-v2 development shard ${shard.shardIndex} launch ${launchIndex} drifted`);
        }
    });
    const completions: CompletionRecord[] = [];
    for (const event of events.filter(({ event }) => event === "episode_complete")) {
        if (!isRecord(event.result)) {
            throw new Error(`Method-v2 development shard ${shard.shardIndex} completion is malformed`);
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
            throw new Error(`Method-v2 development shard ${shard.shardIndex} completion identity drifted`);
        }
        completions.push({
            familyId: shard.familyId,
            seedBlockIndex: shard.seedBlockIndex,
            freshProcessRepeat: shard.freshProcessRepeat,
            methodId: expected.methodId,
            policyId: expected.policyId,
            candidateSlot: expected.candidateSlot,
            normalizedSha256: campaign.phase === "development-v2-phase1"
                ? normalizedDevelopmentV2RepeatSha256(result)
                : null,
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
        throw new Error(`Refusing to overwrite method-v2 technical gate ${outputPath}`);
    }
    const campaignSha256 = sha256File(campaignPath);
    const campaign = parseCampaign(campaignPath);
    const allocation = developmentV2PhaseAllocation(campaign.phase);
    if (
        campaign.shardCount !== allocation.shards ||
        campaign.shards.length !== allocation.shards ||
        campaign.launchedGameCount !== allocation.launches ||
        campaign.shards.some(({ launchedGameCount }) => launchedGameCount !== 4)
    ) {
        throw new Error(`Method-v2 ${campaign.phase} campaign allocation drifted`);
    }
    const schedulerJobIds: string[] = [];
    const completions: CompletionRecord[] = [];
    for (const shard of campaign.shards) {
        const validated = validateShard(campaign, resultsRoot, arrayJobId, shard);
        schedulerJobIds.push(validated.schedulerJobId);
        completions.push(...validated.completions);
    }
    if (completions.length !== allocation.launches || new Set(schedulerJobIds).size !== allocation.shards) {
        throw new Error("Method-v2 scheduler IDs or completion count are incomplete");
    }
    let repeatIdentityGroupCount: number | null = null;
    if (campaign.phase === "development-v2-phase1") {
        const groups = new Map<string, CompletionRecord[]>();
        for (const completion of completions) {
            const key = [
                completion.familyId,
                completion.seedBlockIndex,
                completion.methodId,
                completion.policyId,
                completion.candidateSlot,
            ].join("|");
            const rows = groups.get(key) ?? [];
            rows.push(completion);
            groups.set(key, rows);
        }
        repeatIdentityGroupCount = groups.size;
        if (
            groups.size !== 16 ||
            [...groups.values()].some((rows) =>
                rows.length !== 2 ||
                new Set(rows.map(({ freshProcessRepeat }) => freshProcessRepeat)).size !== 2 ||
                new Set(rows.map(({ normalizedSha256 }) => normalizedSha256)).size !== 1
            )
        ) {
            throw new Error("Method-v2 phase-1 fresh-process result identity gate failed");
        }
    }
    const activeFamilyIds = campaign.phase === "development-v2-phase2"
        ? campaign.selectedFamilies.filter(({ diagnosticRole }) => diagnosticRole === "primary").map(({ familyId }) => familyId)
        : null;
    if (activeFamilyIds !== null && (activeFamilyIds.length !== 10 || new Set(activeFamilyIds).size !== 10)) {
        throw new Error("Method-v2 phase-2 did not preserve exactly ten clean primary families");
    }
    const gitCommit = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
    const gitBranch = execFileSync("git", ["branch", "--show-current"], { encoding: "utf8" }).trim();
    const trackedDirty = execFileSync("git", ["status", "--short", "--untracked-files=no"], { encoding: "utf8" }).trim();
    if (gitBranch !== "main" || trackedDirty.length > 0 || gitCommit !== campaign.sourceGitCommit) {
        throw new Error("Method-v2 technical gate requires the unchanged clean campaign source on main");
    }
    const schedulerIds = [...new Set(schedulerJobIds)].sort((left, right) => Number(left) - Number(right));
    const output = {
        schemaVersion: RESEARCH_DEVELOPMENT_V2_TECHNICAL_GATE_SCHEMA_VERSION,
        status: "PASSED_TECHNICAL_ONLY_NO_OUTCOMES_INSPECTED",
        phase: campaign.phase,
        generatedAt: new Date().toISOString(),
        gateSourceGitCommit: gitCommit,
        campaignPath,
        campaignSha256,
        campaignSourceGitCommit: campaign.sourceGitCommit,
        resultsRoot,
        resultArtifactCommitmentSha256: developmentV2ResultArtifactCommitmentSha256(campaign, resultsRoot, arrayJobId),
        arrayJobId,
        schedulerAccount: "pi_jss233",
        schedulerJobIds: schedulerIds,
        roleManifestSha256: campaign.roleManifestSha256,
        roleCommitmentSha256: campaign.roleCommitmentSha256,
        splitCommitmentSha256: campaign.splitCommitmentSha256,
        sourcePopulationCommitmentSha256: campaign.sourcePopulationCommitmentSha256,
        poolCommitmentSha256: campaign.poolCommitmentSha256,
        championArtifactSha256: campaign.championArtifactSha256,
        championPolicyId: campaign.championPolicyId,
        defaultPolicyId: campaign.defaultPolicyId,
        shardCount: allocation.shards,
        requestedLaunches: allocation.launches,
        accountedLaunches: completions.length,
        completedLaunches: completions.length,
        technicalFailures: 0,
        sealedSummaryViolations: 0,
        repeatIdentityGroupCount,
        repeatIdentityPassed: campaign.phase === "development-v2-phase1" ? true : null,
        activeFamilyIds,
        substitutionApplied: false,
        outcomeFieldsEmitted: [],
        authorizedNextPhase: campaign.phase === "development-v2-phase1"
            ? "development-v2-phase2"
            : campaign.phase === "development-v2-phase2"
                ? "development-v2-phase3"
                : "development-v2-unblinding",
    };
    fs.mkdirSync(path.dirname(outputPath), { recursive: true, mode: 0o700 });
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), { flag: "wx", mode: 0o600 });
    console.log(JSON.stringify({
        outputPath,
        outputSha256: sha256File(outputPath),
        status: output.status,
        phase: output.phase,
        schedulerJobIds: output.schedulerJobIds,
        accountedLaunches: output.accountedLaunches,
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
