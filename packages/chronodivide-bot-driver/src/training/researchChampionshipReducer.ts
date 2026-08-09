import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { ResearchEpisodeResult } from "./researchEpisode.js";
import {
    buildChampionshipShardDesign,
    RESEARCH_CHAMPIONSHIP_ARTIFACTS,
    RESEARCH_CHAMPIONSHIP_ENGINE_SEED_BASE,
    RESEARCH_CHAMPIONSHIP_FAMILY_COUNT,
    RESEARCH_CHAMPIONSHIP_OPTIMIZER_SOURCE_COMMIT,
    RESEARCH_CHAMPIONSHIP_SCHEMA_VERSION,
    RESEARCH_CHAMPIONSHIP_SELECTION_RULE,
    RESEARCH_CHAMPIONSHIP_STAGE_A_GAME_COUNT,
    RESEARCH_CHAMPIONSHIP_STAGE_A_POLICY_COUNT,
    RESEARCH_CHAMPIONSHIP_STAGE_A_SEEDS_PER_FAMILY,
    RESEARCH_CHAMPIONSHIP_STAGE_B_GAME_COUNT,
    RESEARCH_CHAMPIONSHIP_STAGE_B_POLICY_COUNT,
    RESEARCH_CHAMPIONSHIP_STAGE_B_SEEDS_PER_FAMILY,
    ResearchChampionshipCampaign,
} from "./researchChampionshipPlanGenerator.js";
import {
    parseResearchRunPlan,
    ResearchPlanPolicy,
    sha256File,
} from "./researchPlanRunner.js";
import { parseResearchPolicy, researchPolicySha256 } from "./researchPolicy.js";
import { loadCompleteCampaignResults } from "./researchStageReducer.js";

export const RESEARCH_CHAMPIONSHIP_REDUCER_SCHEMA_VERSION = 1 as const;

export type ChampionshipPolicyRanking = {
    rank: number;
    policyId: string;
    macroOutcomeScore: number;
    lower20FamilyCvar: number;
    worstFamilyScore: number;
    familyCount: number;
    seedBlocksPerFamily: number;
    gameCount: number;
    familyScores: Array<{
        familyId: string;
        outcomeScore: number;
        seedBlockCount: number;
        gameCount: number;
    }>;
};

export type ChampionshipSchedulerJob = {
    runId: string;
    jobId: string;
    arrayJobId: string | null;
    arrayTaskId: string | null;
    account: "pi_jss233";
};

type StageASelectionArtifact = {
    schemaVersion: typeof RESEARCH_CHAMPIONSHIP_REDUCER_SCHEMA_VERSION;
    kind: "stage-a-selection";
    sourceCampaignPath: string;
    sourceCampaignSha256: string;
    sourceResultsRoot: string;
    resultsCommitmentSha256: string;
    selectionRule: typeof RESEARCH_CHAMPIONSHIP_SELECTION_RULE;
    selectedCount: typeof RESEARCH_CHAMPIONSHIP_STAGE_B_POLICY_COUNT;
    selectedPolicies: ResearchPlanPolicy[];
    ranking: ChampionshipPolicyRanking[];
    schedulerJobs: ChampionshipSchedulerJob[];
    launchedGameCount: typeof RESEARCH_CHAMPIONSHIP_STAGE_A_GAME_COUNT;
    completedGameCount: typeof RESEARCH_CHAMPIONSHIP_STAGE_A_GAME_COUNT;
    technicalFailureCount: 0;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null && !Array.isArray(value);

const mean = (values: number[]): number => values.reduce((total, value) => total + value, 0) / values.length;

const sameStrings = (left: string[], right: string[]): boolean =>
    left.length === right.length && left.every((value, index) => value === right[index]);

const requiredPath = (name: string): string => {
    const value = process.env[name];
    if (!value) {
        throw new Error(`${name} is required`);
    }
    return path.resolve(value);
};

const readJson = (filePath: string): unknown => JSON.parse(fs.readFileSync(filePath, "utf8"));

export const rankChampionshipPolicies = (
    policies: ResearchPlanPolicy[],
    familyIds: string[],
    results: ResearchEpisodeResult[],
    expectedSeedBlocksPerFamily: number,
): ChampionshipPolicyRanking[] => {
    if (
        policies.length === 0 ||
        familyIds.length === 0 ||
        !Number.isSafeInteger(expectedSeedBlocksPerFamily) ||
        expectedSeedBlocksPerFamily <= 0
    ) {
        throw new Error("Championship ranking requires nonempty policies/families and a positive seed-block count");
    }
    const policyIds = policies.map(({ policyId }) => policyId);
    if (new Set(policyIds).size !== policyIds.length || new Set(familyIds).size !== familyIds.length) {
        throw new Error("Championship ranking received duplicate policy or family identities");
    }
    const familySet = new Set(familyIds);
    const policySet = new Set(policyIds);
    if (results.some((result) =>
        !familySet.has(result.familyId) ||
        !policySet.has(result.policyId) ||
        result.methodId !== result.policyId
    )) {
        throw new Error("Championship ranking received an undeclared or non-training result identity");
    }

    const referenceSchedules = new Map<string, string[]>();
    const rows = policies.map(({ policyId }) => {
        const familyScores = familyIds.map((familyId) => {
            const games = results.filter((result) => result.policyId === policyId && result.familyId === familyId);
            if (games.length !== expectedSeedBlocksPerFamily * 2) {
                throw new Error(`Policy ${policyId} family ${familyId} lacks its complete championship schedule`);
            }
            const schedule = games
                .map(({ seedBlockIndex, candidateSlot }) => `${seedBlockIndex}|${candidateSlot}`)
                .sort();
            if (new Set(schedule).size !== schedule.length) {
                throw new Error(`Policy ${policyId} family ${familyId} contains duplicate seed/slot results`);
            }
            const reciprocal = new Map<number, number[]>();
            for (const game of games) {
                const slots = reciprocal.get(game.seedBlockIndex) ?? [];
                slots.push(game.candidateSlot);
                reciprocal.set(game.seedBlockIndex, slots);
            }
            if (
                reciprocal.size !== expectedSeedBlocksPerFamily ||
                [...reciprocal.values()].some((slots) => [...slots].sort().join(",") !== "0,1")
            ) {
                throw new Error(`Policy ${policyId} family ${familyId} lacks complete reciprocal seed blocks`);
            }
            const reference = referenceSchedules.get(familyId);
            if (reference && !sameStrings(schedule, reference)) {
                throw new Error(`Policies do not share the same seed/slot schedule for family ${familyId}`);
            }
            referenceSchedules.set(familyId, schedule);
            return {
                familyId,
                outcomeScore: mean(games.map(({ candidateScore }) => candidateScore)),
                seedBlockCount: reciprocal.size,
                gameCount: games.length,
            };
        });
        const orderedScores = familyScores.map(({ outcomeScore }) => outcomeScore).sort((left, right) => left - right);
        const cvarFamilyCount = Math.ceil(0.20 * orderedScores.length);
        return {
            rank: 0,
            policyId,
            macroOutcomeScore: mean(orderedScores),
            lower20FamilyCvar: mean(orderedScores.slice(0, cvarFamilyCount)),
            worstFamilyScore: orderedScores[0],
            familyCount: familyScores.length,
            seedBlocksPerFamily: expectedSeedBlocksPerFamily,
            gameCount: familyScores.reduce((total, row) => total + row.gameCount, 0),
            familyScores,
        };
    });
    rows.sort((left, right) =>
        right.macroOutcomeScore - left.macroOutcomeScore ||
        right.lower20FamilyCvar - left.lower20FamilyCvar ||
        right.worstFamilyScore - left.worstFamilyScore ||
        left.policyId.localeCompare(right.policyId),
    );
    return rows.map((row, index) => ({ ...row, rank: index + 1 }));
};

export const loadResearchChampionshipCampaign = (campaignPath: string): ResearchChampionshipCampaign => {
    const value = readJson(campaignPath);
    if (
        !isRecord(value) ||
        value.schemaVersion !== RESEARCH_CHAMPIONSHIP_SCHEMA_VERSION ||
        (value.stage !== "stage-a" && value.stage !== "stage-b") ||
        value.optimizerSourceGitCommit !== RESEARCH_CHAMPIONSHIP_OPTIMIZER_SOURCE_COMMIT ||
        value.selectionRule !== RESEARCH_CHAMPIONSHIP_SELECTION_RULE ||
        value.maxTicks !== 18_000 ||
        value.engineSeedBase !== RESEARCH_CHAMPIONSHIP_ENGINE_SEED_BASE ||
        value.familyCount !== RESEARCH_CHAMPIONSHIP_FAMILY_COUNT ||
        !Array.isArray(value.optimizerArtifacts) ||
        !Array.isArray(value.policies) ||
        !Array.isArray(value.selectedFamilies) ||
        !Array.isArray(value.shards)
    ) {
        throw new Error("Expected a valid method-v2 championship campaign");
    }
    const campaign = value as unknown as ResearchChampionshipCampaign;
    const isStageA = campaign.stage === "stage-a";
    const expectedPolicyCount = isStageA
        ? RESEARCH_CHAMPIONSHIP_STAGE_A_POLICY_COUNT
        : RESEARCH_CHAMPIONSHIP_STAGE_B_POLICY_COUNT;
    const expectedSeeds = isStageA
        ? RESEARCH_CHAMPIONSHIP_STAGE_A_SEEDS_PER_FAMILY
        : RESEARCH_CHAMPIONSHIP_STAGE_B_SEEDS_PER_FAMILY;
    const expectedGames = isStageA
        ? RESEARCH_CHAMPIONSHIP_STAGE_A_GAME_COUNT
        : RESEARCH_CHAMPIONSHIP_STAGE_B_GAME_COUNT;
    if (
        campaign.policyCount !== expectedPolicyCount ||
        campaign.policies.length !== expectedPolicyCount ||
        campaign.seedsPerFamily !== expectedSeeds ||
        campaign.launchedGameCount !== expectedGames ||
        campaign.selectedFamilies.length !== RESEARCH_CHAMPIONSHIP_FAMILY_COUNT ||
        campaign.shards.length !== RESEARCH_CHAMPIONSHIP_FAMILY_COUNT ||
        (isStageA ? campaign.parentStageA !== null : campaign.parentStageA === null)
    ) {
        throw new Error(`Championship ${campaign.stage} dimensions or parent commitment are invalid`);
    }
    const expectedArtifactSignatures = RESEARCH_CHAMPIONSHIP_ARTIFACTS.map((artifact) =>
        `${artifact.run}|${artifact.sha256}|${RESEARCH_CHAMPIONSHIP_OPTIMIZER_SOURCE_COMMIT}`,
    );
    const actualArtifactSignatures = campaign.optimizerArtifacts.map((artifact) =>
        `${artifact.optimizerRunIndex}|${artifact.artifactSha256}|${artifact.sourceGitCommit}`,
    );
    if (!sameStrings(actualArtifactSignatures, expectedArtifactSignatures)) {
        throw new Error("Championship optimizer artifact commitments differ from the frozen five-run population");
    }
    const policies = campaign.policies.map((raw, index): ResearchPlanPolicy => {
        const policy = parseResearchPolicy(raw.policy);
        if (researchPolicySha256(policy) !== raw.policyId) {
            throw new Error(`Championship policy ${index} fails its canonical hash`);
        }
        return { policyId: raw.policyId, policy };
    });
    if (new Set(policies.map(({ policyId }) => policyId)).size !== policies.length) {
        throw new Error("Championship campaign contains duplicate policies");
    }
    const familyIds = campaign.selectedFamilies.map(({ familyId }) => familyId);
    const sortedFamilyIds = [...familyIds].sort();
    if (!sameStrings(familyIds, sortedFamilyIds) || new Set(familyIds).size !== familyIds.length) {
        throw new Error("Championship families are not unique and ascending by family ID");
    }
    const roleTargets = campaign.selectedFamilies.map((family) => ({
        familyId: family.familyId,
        representative: { path: "committed-private.map", sha256: family.representativeSha256 },
        descriptors: family.descriptors,
    }));
    const expectedDesign = buildChampionshipShardDesign(campaign.stage, roleTargets);
    for (let index = 0; index < expectedDesign.length; index++) {
        const expected = expectedDesign[index];
        const shard = campaign.shards[index];
        const plan = parseResearchRunPlan(readJson(shard.planFile));
        const expectedPlanPolicies = policies.map(({ policyId }) => policyId);
        const actualPlanPolicies = plan.policies.map(({ policyId }) => policyId);
        const expectedLaunches = expected.seedBlockIndices.length * policies.length * 2;
        if (
            shard.shardIndex !== expected.shardIndex ||
            shard.familyId !== expected.familyId ||
            !sameStrings(shard.seedBlockIndices.map(String), expected.seedBlockIndices.map(String)) ||
            shard.planSha256 !== sha256File(shard.planFile) ||
            shard.runId !== plan.runId ||
            shard.launchedGameCount !== expectedLaunches ||
            plan.episodes.length !== expectedLaunches ||
            plan.role !== "train" ||
            plan.purpose !== "optimizer-search" ||
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
            !sameStrings(actualPlanPolicies, expectedPlanPolicies) ||
            plan.episodes.some((episode) =>
                episode.familyId !== expected.familyId ||
                !expected.seedBlockIndices.includes(episode.seedBlockIndex)
            )
        ) {
            throw new Error(`Championship shard ${index} plan or commitment does not match its campaign`);
        }
    }
    return { ...campaign, policies };
};

const resultDirectories = (resultsRoot: string): string[] => fs
    .readdirSync(resultsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(resultsRoot, entry.name));

const loadSchedulerJobs = (
    campaign: ResearchChampionshipCampaign,
    resultsRoot: string,
): ChampionshipSchedulerJob[] => {
    const byRunId = new Map<string, string>();
    for (const directory of resultDirectories(resultsRoot)) {
        const summaryPath = path.join(directory, "summary.json");
        if (!fs.existsSync(summaryPath)) {
            continue;
        }
        const summary = readJson(summaryPath);
        if (!isRecord(summary) || typeof summary.runId !== "string" || byRunId.has(summary.runId)) {
            throw new Error(`Invalid or duplicate championship result summary in ${directory}`);
        }
        byRunId.set(summary.runId, directory);
    }
    return campaign.shards.map((shard) => {
        const directory = byRunId.get(shard.runId);
        if (!directory) {
            throw new Error(`Missing championship result directory for ${shard.runId}`);
        }
        const manifestValue = readJson(path.join(directory, "manifest.json"));
        if (!isRecord(manifestValue) || !isRecord(manifestValue.manifest)) {
            throw new Error(`Malformed championship manifest for ${shard.runId}`);
        }
        const scheduler = manifestValue.manifest.scheduler;
        if (
            !isRecord(scheduler) ||
            typeof scheduler.jobId !== "string" ||
            scheduler.jobId.length === 0 ||
            scheduler.account !== "pi_jss233"
        ) {
            throw new Error(`Championship shard ${shard.runId} lacks authoritative pi_jss233 scheduler provenance`);
        }
        return {
            runId: shard.runId,
            jobId: scheduler.jobId,
            arrayJobId: typeof scheduler.arrayJobId === "string" ? scheduler.arrayJobId : null,
            arrayTaskId: typeof scheduler.arrayTaskId === "string" ? scheduler.arrayTaskId : null,
            account: "pi_jss233" as const,
        };
    });
};

const resultsCommitment = (results: ResearchEpisodeResult[]): string => {
    const normalized = results.map((result) => ({
        episodeId: result.episodeId,
        familyId: result.familyId,
        methodId: result.methodId,
        policyId: result.policyId,
        seedBlockIndex: result.seedBlockIndex,
        requestedEngineSeed: result.requestedEngineSeed,
        candidateSlot: result.candidateSlot,
        candidateScore: result.candidateScore,
    })).sort((left, right) =>
        left.familyId.localeCompare(right.familyId) ||
        left.policyId.localeCompare(right.policyId) ||
        left.seedBlockIndex - right.seedBlockIndex ||
        left.candidateSlot - right.candidateSlot,
    );
    return crypto.createHash("sha256").update(JSON.stringify(normalized)).digest("hex");
};

const writeStageASelection = (
    campaignPath: string,
    resultsRoot: string,
    outputPath: string,
): void => {
    const campaign = loadResearchChampionshipCampaign(campaignPath);
    if (campaign.stage !== "stage-a") {
        throw new Error("Stage-A reduction requires a stage-A championship campaign");
    }
    const results = loadCompleteCampaignResults(campaign, resultsRoot);
    if (results.length !== RESEARCH_CHAMPIONSHIP_STAGE_A_GAME_COUNT) {
        throw new Error("Stage-A results do not contain exactly 1,320 completed games");
    }
    const familyIds = campaign.selectedFamilies.map(({ familyId }) => familyId);
    const ranking = rankChampionshipPolicies(
        campaign.policies,
        familyIds,
        results,
        RESEARCH_CHAMPIONSHIP_STAGE_A_SEEDS_PER_FAMILY,
    );
    const policiesById = new Map(campaign.policies.map((policy) => [policy.policyId, policy]));
    const selectedPolicies = ranking.slice(0, RESEARCH_CHAMPIONSHIP_STAGE_B_POLICY_COUNT).map(({ policyId }) => {
        const policy = policiesById.get(policyId);
        if (!policy) {
            throw new Error(`Ranked stage-A policy ${policyId} is absent from the campaign`);
        }
        return policy;
    });
    const output: StageASelectionArtifact = {
        schemaVersion: RESEARCH_CHAMPIONSHIP_REDUCER_SCHEMA_VERSION,
        kind: "stage-a-selection",
        sourceCampaignPath: campaignPath,
        sourceCampaignSha256: sha256File(campaignPath),
        sourceResultsRoot: resultsRoot,
        resultsCommitmentSha256: resultsCommitment(results),
        selectionRule: RESEARCH_CHAMPIONSHIP_SELECTION_RULE,
        selectedCount: RESEARCH_CHAMPIONSHIP_STAGE_B_POLICY_COUNT,
        selectedPolicies,
        ranking,
        schedulerJobs: loadSchedulerJobs(campaign, resultsRoot),
        launchedGameCount: RESEARCH_CHAMPIONSHIP_STAGE_A_GAME_COUNT,
        completedGameCount: RESEARCH_CHAMPIONSHIP_STAGE_A_GAME_COUNT,
        technicalFailureCount: 0,
    };
    fs.mkdirSync(path.dirname(outputPath), { recursive: true, mode: 0o700 });
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), { flag: "wx", mode: 0o600 });
    console.log(JSON.stringify({
        outputPath,
        outputSha256: sha256File(outputPath),
        kind: output.kind,
        selectedCount: output.selectedCount,
        launchedGameCount: output.launchedGameCount,
        schedulerJobCount: output.schedulerJobs.length,
    }));
};

const finalizeChampion = (
    stageACampaignPath: string,
    stageAResultsRoot: string,
    stageASelectionPath: string,
    stageBCampaignPath: string,
    stageBResultsRoot: string,
    outputPath: string,
): void => {
    const stageA = loadResearchChampionshipCampaign(stageACampaignPath);
    const stageB = loadResearchChampionshipCampaign(stageBCampaignPath);
    const selectionValue = readJson(stageASelectionPath);
    if (!isRecord(selectionValue) || !Array.isArray(selectionValue.selectedPolicies)) {
        throw new Error("Stage-A selection artifact is malformed");
    }
    if (
        stageA.stage !== "stage-a" ||
        stageB.stage !== "stage-b" ||
        stageB.parentStageA === null ||
        path.resolve(stageB.parentStageA.campaignPath) !== stageACampaignPath ||
        stageB.parentStageA.campaignSha256 !== sha256File(stageACampaignPath) ||
        path.resolve(stageB.parentStageA.selectionPath) !== stageASelectionPath ||
        stageB.parentStageA.selectionSha256 !== sha256File(stageASelectionPath) ||
        selectionValue.kind !== "stage-a-selection" ||
        selectionValue.sourceCampaignSha256 !== sha256File(stageACampaignPath) ||
        stageA.sourceGitCommit !== stageB.sourceGitCommit ||
        !sameStrings(
            stageB.policies.map(({ policyId }) => policyId),
            (selectionValue.selectedPolicies as ResearchPlanPolicy[]).map(({ policyId }) => policyId),
        )
    ) {
        throw new Error("Stage-B campaign is not chained to the exact complete stage-A selection");
    }
    const stageAResults = loadCompleteCampaignResults(stageA, stageAResultsRoot);
    const stageBResults = loadCompleteCampaignResults(stageB, stageBResultsRoot);
    if (
        stageAResults.length !== RESEARCH_CHAMPIONSHIP_STAGE_A_GAME_COUNT ||
        stageBResults.length !== RESEARCH_CHAMPIONSHIP_STAGE_B_GAME_COUNT
    ) {
        throw new Error("Championship finalization requires all 2,112 scheduled games");
    }
    const stageBPolicyIds = new Set(stageB.policies.map(({ policyId }) => policyId));
    const pooledResults = [
        ...stageAResults.filter(({ policyId }) => stageBPolicyIds.has(policyId)),
        ...stageBResults,
    ];
    const familyIds = stageB.selectedFamilies.map(({ familyId }) => familyId);
    const ranking = rankChampionshipPolicies(stageB.policies, familyIds, pooledResults, 4);
    const championPolicy = stageB.policies.find(({ policyId }) => policyId === ranking[0].policyId);
    if (!championPolicy) {
        throw new Error("Final championship winner is absent from the stage-B policy set");
    }
    const output = {
        schemaVersion: RESEARCH_CHAMPIONSHIP_REDUCER_SCHEMA_VERSION,
        kind: "method-v2-champion" as const,
        sourceGitCommit: stageB.sourceGitCommit,
        optimizerSourceGitCommit: RESEARCH_CHAMPIONSHIP_OPTIMIZER_SOURCE_COMMIT,
        createdAt: new Date().toISOString(),
        selectionRule: RESEARCH_CHAMPIONSHIP_SELECTION_RULE,
        sourceCampaigns: [
            {
                stage: "stage-a",
                campaignPath: stageACampaignPath,
                campaignSha256: sha256File(stageACampaignPath),
                resultsRoot: stageAResultsRoot,
                resultsCommitmentSha256: resultsCommitment(stageAResults),
                schedulerJobs: loadSchedulerJobs(stageA, stageAResultsRoot),
            },
            {
                stage: "stage-b",
                campaignPath: stageBCampaignPath,
                campaignSha256: sha256File(stageBCampaignPath),
                resultsRoot: stageBResultsRoot,
                resultsCommitmentSha256: resultsCommitment(stageBResults),
                schedulerJobs: loadSchedulerJobs(stageB, stageBResultsRoot),
            },
        ],
        stageASelectionPath,
        stageASelectionSha256: sha256File(stageASelectionPath),
        championPolicy,
        finalistCount: stageB.policies.length,
        familyCount: familyIds.length,
        pooledFinalistGameCount: pooledResults.length,
        totalChampionshipGameCount: stageAResults.length + stageBResults.length,
        technicalFailureCount: 0 as const,
        ranking,
        interpretation:
            "Training-only fixed-policy selection artifact. It is not held-out evidence and does not authorize a positive claim.",
    };
    fs.mkdirSync(path.dirname(outputPath), { recursive: true, mode: 0o700 });
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), { flag: "wx", mode: 0o600 });
    console.log(JSON.stringify({
        outputPath,
        outputSha256: sha256File(outputPath),
        kind: output.kind,
        championPolicyId: championPolicy.policyId,
        familyCount: output.familyCount,
        totalChampionshipGameCount: output.totalChampionshipGameCount,
        schedulerJobCount: output.sourceCampaigns.reduce((total, source) => total + source.schedulerJobs.length, 0),
    }));
};

const main = (): void => {
    const mode = process.env.CHAMPIONSHIP_REDUCER_MODE;
    const outputPath = requiredPath("OUT_FILE");
    if (fs.existsSync(outputPath)) {
        throw new Error(`Refusing to overwrite championship reducer output ${outputPath}`);
    }
    if (mode === "stage-a-selection") {
        writeStageASelection(requiredPath("CAMPAIGN"), requiredPath("RESULTS_ROOT"), outputPath);
    } else if (mode === "finalize-champion") {
        finalizeChampion(
            requiredPath("STAGE_A_CAMPAIGN"),
            requiredPath("STAGE_A_RESULTS"),
            requiredPath("STAGE_A_SELECTION"),
            requiredPath("STAGE_B_CAMPAIGN"),
            requiredPath("STAGE_B_RESULTS"),
            outputPath,
        );
    } else {
        throw new Error("CHAMPIONSHIP_REDUCER_MODE must be stage-a-selection or finalize-champion");
    }
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
