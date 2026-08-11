import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
    RESEARCH_EPISODE_SCHEMA_VERSION,
    RESEARCH_OUTCOME_ENDPOINT,
    ResearchEpisodeResult,
} from "./researchEpisode.js";
import {
    RESEARCH_OPTIMIZER_SCHEMA_VERSION,
    RESEARCH_STAGE1_POLICY_COUNT,
    RESEARCH_STAGE2_POLICY_COUNT,
    ResearchCampaignManifest,
} from "./researchPlanGenerator.js";
import {
    parseRecordedResearchRunPlan,
    parseResearchRunPlan,
    ResearchPlanPolicy,
    sha256File,
} from "./researchPlanRunner.js";
import { parseResearchPolicy, researchPolicySha256 } from "./researchPolicy.js";

export const RESEARCH_SELECTION_UTILITY_VERSION = 1 as const;
export const RESEARCH_MATERIAL_TIE_WEIGHT = 0.04 as const;
export const RESEARCH_SELECTION_RULE =
    "Rank by equal-family mean of outcome score plus 0.04 times terminal material advantage; " +
    "break exact ties by outcome macro score, worst-family utility, then ascending policy SHA-256.";

export type StagePolicyRanking = {
    rank: number;
    policyId: string;
    macroSelectionUtility: number;
    macroOutcomeScore: number;
    worstFamilySelectionUtility: number;
    familyCount: number;
    gameCount: number;
    familyScores: Array<{
        familyId: string;
        selectionUtility: number;
        outcomeScore: number;
        materialAdvantage: number;
        gameCount: number;
    }>;
};

type ReducerOutput = {
    schemaVersion: 1;
    optimizerRunIndex: number;
    completedStage: 0 | 1;
    sourceCampaignPath: string;
    sourceCampaignSha256: string;
    sourceResultsRoot: string;
    resultsCommitmentSha256: string;
    selectionUtilityVersion: typeof RESEARCH_SELECTION_UTILITY_VERSION;
    selectionRule: typeof RESEARCH_SELECTION_RULE;
    selectedCount: number;
    selectedPolicies: ResearchPlanPolicy[];
    ranking: StagePolicyRanking[];
    launchedGameCount: number;
    completedGameCount: number;
    technicalFailureCount: 0;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null && !Array.isArray(value);

const mean = (values: number[]): number => values.reduce((total, value) => total + value, 0) / values.length;

const normalizedDifference = (candidate: number, baseline: number, stabilizer: number): number =>
    (candidate - baseline) / (Math.abs(candidate) + Math.abs(baseline) + stabilizer);

/**
 * Average scale-free advantage over raw terminal resources and unit/base
 * categories. Components remain in [-1, 1]; overlap is deliberate and frozen.
 */
export const terminalMaterialAdvantage = (result: ResearchEpisodeResult): number => mean([
    normalizedDifference(result.candidate.credits, result.baseline.credits, 1000),
    normalizedDifference(result.candidate.units, result.baseline.units, 1),
    normalizedDifference(result.candidate.buildings, result.baseline.buildings, 1),
    normalizedDifference(result.candidate.combatants, result.baseline.combatants, 1),
    normalizedDifference(result.candidate.harvesters, result.baseline.harvesters, 1),
    normalizedDifference(result.candidate.factories, result.baseline.factories, 1),
    normalizedDifference(result.candidate.refineries, result.baseline.refineries, 1),
    normalizedDifference(result.candidate.conyards, result.baseline.conyards, 1),
]);

/** The 0.04 weight preserves loss < draw < win for every individual game. */
export const trainingSelectionUtility = (result: ResearchEpisodeResult): number =>
    result.candidateScore + RESEARCH_MATERIAL_TIE_WEIGHT * terminalMaterialAdvantage(result);

export const rankStagePolicies = (
    policies: ResearchPlanPolicy[],
    familyIds: string[],
    results: ResearchEpisodeResult[],
): StagePolicyRanking[] => {
    if (policies.length === 0 || familyIds.length === 0) {
        throw new Error("Policy ranking requires nonempty policies and families");
    }
    if (new Set(policies.map(({ policyId }) => policyId)).size !== policies.length) {
        throw new Error("Policy ranking received duplicate policy IDs");
    }
    if (new Set(familyIds).size !== familyIds.length) {
        throw new Error("Policy ranking received duplicate family IDs");
    }
    const familySet = new Set(familyIds);
    const policySet = new Set(policies.map(({ policyId }) => policyId));
    if (results.some((result) => !familySet.has(result.familyId) || !policySet.has(result.policyId))) {
        throw new Error("Policy ranking received an undeclared policy or family result");
    }
    const rows = policies.map(({ policyId }) => {
        const familyScores = familyIds.map((familyId) => {
            const games = results.filter((result) => result.policyId === policyId && result.familyId === familyId);
            if (games.length !== 2 || new Set(games.map(({ candidateSlot }) => candidateSlot)).size !== 2) {
                throw new Error(`Policy ${policyId} family ${familyId} lacks one complete reciprocal game pair`);
            }
            return {
                familyId,
                selectionUtility: mean(games.map(trainingSelectionUtility)),
                outcomeScore: mean(games.map(({ candidateScore }) => candidateScore)),
                materialAdvantage: mean(games.map(terminalMaterialAdvantage)),
                gameCount: games.length,
            };
        });
        return {
            rank: 0,
            policyId,
            macroSelectionUtility: mean(familyScores.map(({ selectionUtility }) => selectionUtility)),
            macroOutcomeScore: mean(familyScores.map(({ outcomeScore }) => outcomeScore)),
            worstFamilySelectionUtility: Math.min(...familyScores.map(({ selectionUtility }) => selectionUtility)),
            familyCount: familyScores.length,
            gameCount: familyScores.reduce((total, row) => total + row.gameCount, 0),
            familyScores,
        };
    });
    rows.sort((left, right) =>
        right.macroSelectionUtility - left.macroSelectionUtility ||
        right.macroOutcomeScore - left.macroOutcomeScore ||
        right.worstFamilySelectionUtility - left.worstFamilySelectionUtility ||
        left.policyId.localeCompare(right.policyId),
    );
    return rows.map((row, index) => ({ ...row, rank: index + 1 }));
};

const readJson = (filePath: string): unknown => JSON.parse(fs.readFileSync(filePath, "utf8"));

const requiredPath = (name: string): string => {
    const value = process.env[name];
    if (!value) {
        throw new Error(`${name} is required`);
    }
    return path.resolve(value);
};

export const loadOptimizerCampaign = (campaignPath: string): ResearchCampaignManifest => {
    const value = readJson(campaignPath);
    if (
        !isRecord(value) ||
        value.schemaVersion !== RESEARCH_OPTIMIZER_SCHEMA_VERSION ||
        (value.mode !== "optimizer-stage0" && value.mode !== "optimizer-stage1" && value.mode !== "optimizer-stage2") ||
        (value.stage !== 0 && value.stage !== 1 && value.stage !== 2) ||
        !Number.isSafeInteger(value.optimizerRunIndex) ||
        !Array.isArray(value.policies) ||
        !Array.isArray(value.selectedFamilies) ||
        !Array.isArray(value.shards)
    ) {
        throw new Error("Expected a valid optimizer stage-0, stage-1, or stage-2 campaign");
    }
    if (
        (value.stage === 0 && value.mode !== "optimizer-stage0") ||
        (value.stage === 1 && value.mode !== "optimizer-stage1") ||
        (value.stage === 2 && value.mode !== "optimizer-stage2")
    ) {
        throw new Error("Campaign stage and mode disagree");
    }
    return value as unknown as ResearchCampaignManifest;
};

const resultDirectories = (resultsRoot: string): string[] => fs
    .readdirSync(resultsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(resultsRoot, entry.name));

export const loadCompleteCampaignResults = (
    campaign: Pick<ResearchCampaignManifest, "shards">,
    resultsRoot: string,
): ResearchEpisodeResult[] => {
    const byRunId = new Map<string, string>();
    for (const directory of resultDirectories(resultsRoot)) {
        const summaryPath = path.join(directory, "summary.json");
        if (!fs.existsSync(summaryPath)) {
            continue;
        }
        const summary = readJson(summaryPath);
        if (!isRecord(summary) || typeof summary.runId !== "string") {
            throw new Error(`Invalid result summary in ${directory}`);
        }
        if (byRunId.has(summary.runId)) {
            throw new Error(`Duplicate result directories for run ${summary.runId}`);
        }
        byRunId.set(summary.runId, directory);
    }
    const results: ResearchEpisodeResult[] = [];
    for (const shard of campaign.shards) {
        const directory = byRunId.get(shard.runId);
        if (!directory) {
            throw new Error(`Missing result directory for campaign shard ${shard.runId}`);
        }
        if (sha256File(shard.planFile) !== shard.planSha256) {
            throw new Error(`Campaign plan bytes changed for shard ${shard.runId}`);
        }
        const manifestValue = readJson(path.join(directory, "manifest.json"));
        const summaryValue = readJson(path.join(directory, "summary.json"));
        if (!isRecord(manifestValue) || !isRecord(summaryValue) || !isRecord(manifestValue.manifest)) {
            throw new Error(`Malformed runner manifest or summary for shard ${shard.runId}`);
        }
        const parsedPlan = parseResearchRunPlan(readJson(shard.planFile));
        const recordedPlan = parseRecordedResearchRunPlan(manifestValue.plan);
        if (
            JSON.stringify(recordedPlan) !== JSON.stringify(parsedPlan) ||
            parsedPlan.runId !== shard.runId ||
            manifestValue.planBytesSha256 !== shard.planSha256 ||
            summaryValue.runId !== shard.runId ||
            summaryValue.requestedLaunches !== shard.launchedGameCount ||
            summaryValue.accountedLaunches !== shard.launchedGameCount ||
            summaryValue.completed !== shard.launchedGameCount ||
            summaryValue.technicalFailures !== 0 ||
            summaryValue.complete !== true ||
            summaryValue.technicallyClean !== true
        ) {
            throw new Error(`Shard ${shard.runId} is incomplete, technically failed, or mismatched`);
        }
        const provenance = manifestValue.manifest;
        if (!isRecord(provenance.scheduler) || provenance.scheduler.account !== "pi_jss233") {
            throw new Error(`Shard ${shard.runId} does not attest the pi_jss233 allocation`);
        }
        const events = fs.readFileSync(path.join(directory, "events.jsonl"), "utf8")
            .trim()
            .split(/\r?\n/)
            .filter(Boolean)
            .map((line) => JSON.parse(line) as Record<string, unknown>);
        const launchEvents = events.filter(({ event }) => event === "launch_counted");
        const completeEvents = events.filter(({ event }) => event === "episode_complete");
        const failureEvents = events.filter(({ event }) => event === "technical_failure");
        if (
            launchEvents.length !== shard.launchedGameCount ||
            completeEvents.length !== shard.launchedGameCount ||
            failureEvents.length !== 0
        ) {
            throw new Error(`Shard ${shard.runId} event accounting does not reconcile`);
        }
        const shardResults = completeEvents.map((event) => event.result as ResearchEpisodeResult);
        const expectedEpisodes = new Map(parsedPlan.episodes.map((episode) => [episode.episodeId, episode]));
        if (
            shardResults.some((result) => {
                if (!isRecord(result) || typeof result.episodeId !== "string") {
                    return true;
                }
                const expected = expectedEpisodes.get(result.episodeId);
                return !expected ||
                    result.schemaVersion !== RESEARCH_EPISODE_SCHEMA_VERSION ||
                    result.familyId !== expected.familyId ||
                    result.methodId !== expected.methodId ||
                    result.policyId !== expected.policyId ||
                    result.policySha256 !== expected.policyId ||
                    result.seedBlockIndex !== expected.seedBlockIndex ||
                    result.requestedEngineSeed !== expected.requestedEngineSeed ||
                    result.candidateSlot !== expected.candidateSlot ||
                    result.candidateCountry !== parsedPlan.candidateCountry ||
                    result.baselineCountry !== parsedPlan.baselineCountry ||
                    result.maxTicks !== parsedPlan.maxTicks ||
                    result.outcomeEndpoint !== RESEARCH_OUTCOME_ENDPOINT ||
                    (result.candidateScore !== 0 && result.candidateScore !== 0.5 && result.candidateScore !== 1) ||
                    (result.winner === "candidate" ? result.candidateScore !== 1
                        : result.winner === "baseline" ? result.candidateScore !== 0
                            : result.winner === "draw" ? result.candidateScore !== 0.5
                                : true);
            }) ||
            new Set(shardResults.map(({ episodeId }) => episodeId)).size !== expectedEpisodes.size
        ) {
            throw new Error(`Shard ${shard.runId} result identities or schedule fields do not match its plan`);
        }
        results.push(...shardResults);
    }
    return results;
};

const main = (): void => {
    const campaignPath = requiredPath("CAMPAIGN");
    const resultsRoot = requiredPath("RESULTS_ROOT");
    const outputPath = requiredPath("OUT_FILE");
    if (fs.existsSync(outputPath)) {
        throw new Error(`Refusing to overwrite reducer output ${outputPath}`);
    }
    const campaign = loadOptimizerCampaign(campaignPath);
    if (campaign.stage === 2) {
        throw new Error("Stage 2 is finalized into method artifacts rather than reduced to another survivor stage");
    }
    const policies = campaign.policies.map((raw, index) => {
        const policy = parseResearchPolicy(raw.policy);
        if (researchPolicySha256(policy) !== raw.policyId) {
            throw new Error(`Campaign policy ${index} fails its canonical hash`);
        }
        return { policyId: raw.policyId, policy };
    });
    const familyIds = campaign.selectedFamilies.map(({ familyId }) => familyId);
    const results = loadCompleteCampaignResults(campaign, resultsRoot);
    const ranking = rankStagePolicies(policies, familyIds, results);
    const selectedCount = campaign.stage === 0 ? RESEARCH_STAGE1_POLICY_COUNT : RESEARCH_STAGE2_POLICY_COUNT;
    const policiesById = new Map(policies.map((policy) => [policy.policyId, policy]));
    const selectedPolicies = ranking.slice(0, selectedCount).map(({ policyId }) => {
        const policy = policiesById.get(policyId);
        if (!policy) {
            throw new Error(`Ranked policy ${policyId} is absent from the campaign`);
        }
        return policy;
    });
    const normalizedResults = results
        .map((result) => ({
            episodeId: result.episodeId,
            familyId: result.familyId,
            policyId: result.policyId,
            seedBlockIndex: result.seedBlockIndex,
            requestedEngineSeed: result.requestedEngineSeed,
            candidateSlot: result.candidateSlot,
            candidateScore: result.candidateScore,
            candidate: result.candidate,
            baseline: result.baseline,
        }))
        .sort((left, right) => left.episodeId.localeCompare(right.episodeId));
    const output: ReducerOutput = {
        schemaVersion: 1,
        optimizerRunIndex: campaign.optimizerRunIndex,
        completedStage: campaign.stage as 0 | 1,
        sourceCampaignPath: campaignPath,
        sourceCampaignSha256: sha256File(campaignPath),
        sourceResultsRoot: resultsRoot,
        resultsCommitmentSha256: crypto.createHash("sha256").update(JSON.stringify(normalizedResults)).digest("hex"),
        selectionUtilityVersion: RESEARCH_SELECTION_UTILITY_VERSION,
        selectionRule: RESEARCH_SELECTION_RULE,
        selectedCount,
        selectedPolicies,
        ranking,
        launchedGameCount: campaign.launchedGameCount,
        completedGameCount: results.length,
        technicalFailureCount: 0,
    };
    fs.mkdirSync(path.dirname(outputPath), { recursive: true, mode: 0o700 });
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), { flag: "wx", mode: 0o600 });
    console.log(JSON.stringify({
        outputPath,
        outputSha256: sha256File(outputPath),
        optimizerRunIndex: output.optimizerRunIndex,
        completedStage: output.completedStage,
        selectedCount,
        launchedGameCount: output.launchedGameCount,
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
