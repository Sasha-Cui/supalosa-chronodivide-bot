import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { Countries } from "@supalosa/chronodivide-bot/dist/bot/logic/common/utils.js";
import { loadBaselineFactory } from "../benchmark/baselineLoader.js";
import { createExperimentManifest } from "../benchmark/provenance.js";
import { derivePairedEngineSeed } from "../benchmark/seededOfflineGame.js";
import {
    GeneratorRoleData,
    readGeneratorRole,
    RESEARCH_MAX_TICKS,
} from "./researchPlanGenerator.js";
import {
    parseResearchRunPlan,
    ResearchPlanPolicy,
    ResearchRunPlan,
    RoleTarget,
    serializeResearchRunPlan,
    sha256File,
    sourceRuntimeCommitmentSha256,
} from "./researchPlanRunner.js";
import { parseResearchPolicy, researchPolicySha256 } from "./researchPolicy.js";

export const RESEARCH_CHAMPIONSHIP_SCHEMA_VERSION = 1 as const;
export const RESEARCH_CHAMPIONSHIP_ENGINE_SEED_BASE = 40_000_000 as const;
export const RESEARCH_CHAMPIONSHIP_FAMILY_COUNT = 22 as const;
export const RESEARCH_CHAMPIONSHIP_STAGE_A_POLICY_COUNT = 30 as const;
export const RESEARCH_CHAMPIONSHIP_STAGE_B_POLICY_COUNT = 6 as const;
export const RESEARCH_CHAMPIONSHIP_STAGE_A_SEEDS_PER_FAMILY = 1 as const;
export const RESEARCH_CHAMPIONSHIP_STAGE_B_SEEDS_PER_FAMILY = 3 as const;
export const RESEARCH_CHAMPIONSHIP_STAGE_A_GAME_COUNT = 1_320 as const;
export const RESEARCH_CHAMPIONSHIP_STAGE_B_GAME_COUNT = 792 as const;
export const RESEARCH_CHAMPIONSHIP_OPTIMIZER_SOURCE_COMMIT =
    "bbe7616fddcff970ab2767ad1212fd4faed06c9e" as const;
export const RESEARCH_CHAMPIONSHIP_SELECTION_RULE =
    "Rank by equal-family mean candidate score, lower-20% family CVaR using ceil(0.20*n) families, " +
    "worst-family score, then ascending canonical policy SHA-256; terminal material is diagnostic only.";

export type ResearchChampionshipStage = "stage-a" | "stage-b";

export const RESEARCH_CHAMPIONSHIP_ARTIFACTS = [
    { run: 0, file: "run-0-optimizer-artifact.json", sha256: "4981febcb99503564a6850f47c161fecd1f9a6159defae881f13e0744f1dae28" },
    { run: 1, file: "run-1-optimizer-artifact.json", sha256: "4d7fd4baba96cf579ae3193baa83f08f87b39d8e8d6fddb82e38c253ed9533f4" },
    { run: 2, file: "run-2-optimizer-artifact.json", sha256: "1e24851265f30cf5df05da821d99203a4b41434468a76e590a59f16d58163908" },
    { run: 3, file: "run-3-optimizer-artifact.json", sha256: "666570957161e4382d31fe617996bf2fdf675b13ddeab62a2089b11d9b5a4f41" },
    { run: 4, file: "run-4-optimizer-artifact.json", sha256: "b82d6c3423ed99b94c1fb2be2514ad98624f916463c49f3d8d5ae01f0d79b896" },
] as const;

export type ChampionshipArtifactCommitment = {
    optimizerRunIndex: number;
    artifactPath: string;
    artifactSha256: string;
    sourceGitCommit: string;
};

export type ChampionshipShardDesign = {
    shardIndex: number;
    familyId: string;
    seedBlockIndices: number[];
};

export type ResearchChampionshipCampaign = {
    schemaVersion: typeof RESEARCH_CHAMPIONSHIP_SCHEMA_VERSION;
    stage: ResearchChampionshipStage;
    sourceGitCommit: string;
    optimizerSourceGitCommit: typeof RESEARCH_CHAMPIONSHIP_OPTIMIZER_SOURCE_COMMIT;
    generatedAt: string;
    selectionRule: typeof RESEARCH_CHAMPIONSHIP_SELECTION_RULE;
    candidatePopulationRule: string;
    maxTicks: typeof RESEARCH_MAX_TICKS;
    engineSeedBase: typeof RESEARCH_CHAMPIONSHIP_ENGINE_SEED_BASE;
    seedsPerFamily: number;
    policyCount: number;
    familyCount: typeof RESEARCH_CHAMPIONSHIP_FAMILY_COUNT;
    launchedGameCount: number;
    sourceRuntimeSha256: string;
    baselineGitCommit: string;
    baselineRuntimeSha256: string;
    gameApiRuntimeSha256: string;
    packageLockSha256: string;
    roleManifestSha256: string;
    roleCommitmentSha256: string;
    splitCommitmentSha256: string;
    sourcePopulationCommitmentSha256: string;
    optimizerArtifacts: ChampionshipArtifactCommitment[];
    parentStageA: {
        campaignPath: string;
        campaignSha256: string;
        selectionPath: string;
        selectionSha256: string;
    } | null;
    policies: ResearchPlanPolicy[];
    selectedFamilies: Array<{
        familyId: string;
        descriptors: Record<string, unknown>;
        representativeSha256: string;
    }>;
    shards: Array<{
        shardIndex: number;
        planFile: string;
        planSha256: string;
        runId: string;
        familyId: string;
        seedBlockIndices: number[];
        launchedGameCount: number;
    }>;
};

type LoadedCandidatePopulation = {
    artifacts: ChampionshipArtifactCommitment[];
    policies: ResearchPlanPolicy[];
};

type StageASelection = {
    schemaVersion: 1;
    kind: "stage-a-selection";
    sourceCampaignPath: string;
    sourceCampaignSha256: string;
    sourceResultsRoot: string;
    resultsCommitmentSha256: string;
    selectionRule: typeof RESEARCH_CHAMPIONSHIP_SELECTION_RULE;
    selectedCount: 6;
    selectedPolicies: ResearchPlanPolicy[];
    ranking: Array<{ rank: number; policyId: string }>;
    schedulerJobs: Array<{ runId: string; jobId: string; account: string }>;
    launchedGameCount: typeof RESEARCH_CHAMPIONSHIP_STAGE_A_GAME_COUNT;
    completedGameCount: typeof RESEARCH_CHAMPIONSHIP_STAGE_A_GAME_COUNT;
    technicalFailureCount: 0;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null && !Array.isArray(value);

const sameStrings = (left: string[], right: string[]): boolean =>
    left.length === right.length && left.every((value, index) => value === right[index]);

const artifactSignature = (artifacts: ChampionshipArtifactCommitment[]): string[] => artifacts.map((artifact) =>
    `${artifact.optimizerRunIndex}|${artifact.artifactSha256}|${artifact.sourceGitCommit}`,
);

export const loadChampionshipCandidatePopulation = (artifactRoot: string): LoadedCandidatePopulation => {
    const artifacts: ChampionshipArtifactCommitment[] = [];
    const policies: ResearchPlanPolicy[] = [];
    for (const expected of RESEARCH_CHAMPIONSHIP_ARTIFACTS) {
        const artifactPath = path.resolve(artifactRoot, expected.file);
        if (path.dirname(artifactPath) !== path.resolve(artifactRoot)) {
            throw new Error(`Optimizer artifact path escapes the requested root: ${expected.file}`);
        }
        const artifactSha256 = sha256File(artifactPath);
        if (artifactSha256 !== expected.sha256) {
            throw new Error(`Optimizer artifact run ${expected.run} differs from its frozen SHA-256`);
        }
        const value = JSON.parse(fs.readFileSync(artifactPath, "utf8")) as Record<string, unknown>;
        if (
            value.schemaVersion !== 1 ||
            value.optimizerRunIndex !== expected.run ||
            value.sourceGitCommit !== RESEARCH_CHAMPIONSHIP_OPTIMIZER_SOURCE_COMMIT ||
            !Array.isArray(value.finalists) ||
            value.finalists.length !== 6
        ) {
            throw new Error(`Optimizer artifact run ${expected.run} has the wrong frozen schema or lineage`);
        }
        const finalists = value.finalists.map((raw, index): ResearchPlanPolicy => {
            if (!isRecord(raw) || typeof raw.policyId !== "string") {
                throw new Error(`Optimizer artifact run ${expected.run} finalist ${index} is malformed`);
            }
            const policy = parseResearchPolicy(raw.policy);
            if (researchPolicySha256(policy) !== raw.policyId) {
                throw new Error(`Optimizer artifact run ${expected.run} finalist ${index} fails its canonical hash`);
            }
            return { policyId: raw.policyId, policy };
        });
        artifacts.push({
            optimizerRunIndex: expected.run,
            artifactPath,
            artifactSha256,
            sourceGitCommit: RESEARCH_CHAMPIONSHIP_OPTIMIZER_SOURCE_COMMIT,
        });
        policies.push(...finalists);
    }
    if (
        policies.length !== RESEARCH_CHAMPIONSHIP_STAGE_A_POLICY_COUNT ||
        new Set(policies.map(({ policyId }) => policyId)).size !== RESEARCH_CHAMPIONSHIP_STAGE_A_POLICY_COUNT
    ) {
        throw new Error("The frozen championship candidate population is not exactly 30 unique policies");
    }
    policies.sort((left, right) => left.policyId.localeCompare(right.policyId));
    return { artifacts, policies };
};

export const buildChampionshipShardDesign = (
    stage: ResearchChampionshipStage,
    targets: RoleTarget[],
): ChampionshipShardDesign[] => {
    if (
        targets.length !== RESEARCH_CHAMPIONSHIP_FAMILY_COUNT ||
        new Set(targets.map(({ familyId }) => familyId)).size !== RESEARCH_CHAMPIONSHIP_FAMILY_COUNT
    ) {
        throw new Error("The championship requires exactly 22 unique frozen training families");
    }
    return [...targets]
        .sort((left, right) => left.familyId.localeCompare(right.familyId))
        .map((target, familyOrdinal) => ({
            shardIndex: familyOrdinal,
            familyId: target.familyId,
            seedBlockIndices: stage === "stage-a"
                ? [familyOrdinal]
                : [0, 1, 2].map((seedOrdinal) => 1_000 + familyOrdinal * 3 + seedOrdinal),
        }));
};

const parseStage = (): ResearchChampionshipStage => {
    const value = process.env.CHAMPIONSHIP_STAGE;
    if (value !== "stage-a" && value !== "stage-b") {
        throw new Error("CHAMPIONSHIP_STAGE must be stage-a or stage-b");
    }
    return value;
};

const requiredPath = (name: string): string => {
    const value = process.env[name];
    if (!value) {
        throw new Error(`${name} is required`);
    }
    return path.resolve(value);
};

const gitRoot = (): string => execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();

const readStageASelection = (
    campaignPath: string,
    selectionPath: string,
    candidatePopulation: LoadedCandidatePopulation,
): { selection: StageASelection; parentStageA: NonNullable<ResearchChampionshipCampaign["parentStageA"]> } => {
    const campaign = JSON.parse(fs.readFileSync(campaignPath, "utf8")) as Partial<ResearchChampionshipCampaign>;
    const campaignSha256 = sha256File(campaignPath);
    const selection = JSON.parse(fs.readFileSync(selectionPath, "utf8")) as Partial<StageASelection>;
    if (
        campaign.schemaVersion !== RESEARCH_CHAMPIONSHIP_SCHEMA_VERSION ||
        campaign.stage !== "stage-a" ||
        campaign.sourceGitCommit === undefined ||
        campaign.optimizerSourceGitCommit !== RESEARCH_CHAMPIONSHIP_OPTIMIZER_SOURCE_COMMIT ||
        campaign.policyCount !== RESEARCH_CHAMPIONSHIP_STAGE_A_POLICY_COUNT ||
        campaign.familyCount !== RESEARCH_CHAMPIONSHIP_FAMILY_COUNT ||
        campaign.launchedGameCount !== RESEARCH_CHAMPIONSHIP_STAGE_A_GAME_COUNT ||
        !Array.isArray(campaign.optimizerArtifacts) ||
        !Array.isArray(campaign.policies)
    ) {
        throw new Error("STAGE_A_CAMPAIGN is not a valid championship stage-A campaign");
    }
    if (!sameStrings(artifactSignature(campaign.optimizerArtifacts), artifactSignature(candidatePopulation.artifacts))) {
        throw new Error("Stage-A campaign optimizer commitments differ from the frozen candidate population");
    }
    if (
        selection.schemaVersion !== 1 ||
        selection.kind !== "stage-a-selection" ||
        path.resolve(String(selection.sourceCampaignPath)) !== campaignPath ||
        selection.sourceCampaignSha256 !== campaignSha256 ||
        typeof selection.sourceResultsRoot !== "string" ||
        typeof selection.resultsCommitmentSha256 !== "string" ||
        !/^[0-9a-f]{64}$/.test(selection.resultsCommitmentSha256) ||
        selection.selectionRule !== RESEARCH_CHAMPIONSHIP_SELECTION_RULE ||
        selection.selectedCount !== RESEARCH_CHAMPIONSHIP_STAGE_B_POLICY_COUNT ||
        !Array.isArray(selection.selectedPolicies) ||
        selection.selectedPolicies.length !== RESEARCH_CHAMPIONSHIP_STAGE_B_POLICY_COUNT ||
        !Array.isArray(selection.ranking) ||
        selection.ranking.length !== RESEARCH_CHAMPIONSHIP_STAGE_A_POLICY_COUNT ||
        !Array.isArray(selection.schedulerJobs) ||
        selection.schedulerJobs.length !== RESEARCH_CHAMPIONSHIP_FAMILY_COUNT ||
        selection.schedulerJobs.some((job) =>
            !isRecord(job) || typeof job.jobId !== "string" || job.account !== "pi_jss233"
        ) ||
        selection.launchedGameCount !== RESEARCH_CHAMPIONSHIP_STAGE_A_GAME_COUNT ||
        selection.completedGameCount !== RESEARCH_CHAMPIONSHIP_STAGE_A_GAME_COUNT ||
        selection.technicalFailureCount !== 0
    ) {
        throw new Error("STAGE_A_SELECTION is not the exact complete stage-A selection artifact");
    }
    const candidateIds = new Set(candidatePopulation.policies.map(({ policyId }) => policyId));
    const policies = selection.selectedPolicies.map((raw, index): ResearchPlanPolicy => {
        if (!isRecord(raw) || typeof raw.policyId !== "string") {
            throw new Error(`Stage-A selected policy ${index} is malformed`);
        }
        const policy = parseResearchPolicy(raw.policy);
        if (researchPolicySha256(policy) !== raw.policyId || !candidateIds.has(raw.policyId)) {
            throw new Error(`Stage-A selected policy ${index} is not a frozen candidate`);
        }
        return { policyId: raw.policyId, policy };
    });
    if (new Set(policies.map(({ policyId }) => policyId)).size !== policies.length) {
        throw new Error("Stage-A selection contains duplicate policies");
    }
    const rankingIds = selection.ranking.map((row, index) => {
        if (
            !isRecord(row) ||
            row.rank !== index + 1 ||
            typeof row.policyId !== "string" ||
            !candidateIds.has(row.policyId)
        ) {
            throw new Error(`Stage-A ranking row ${index} is invalid`);
        }
        return row.policyId;
    });
    if (
        new Set(rankingIds).size !== RESEARCH_CHAMPIONSHIP_STAGE_A_POLICY_COUNT ||
        !sameStrings(policies.map(({ policyId }) => policyId), rankingIds.slice(0, RESEARCH_CHAMPIONSHIP_STAGE_B_POLICY_COUNT))
    ) {
        throw new Error("Stage-A selected policies are not exactly the first six complete ranking rows");
    }
    return {
        selection: { ...selection, selectedPolicies: policies } as StageASelection,
        parentStageA: { campaignPath, campaignSha256, selectionPath, selectionSha256: sha256File(selectionPath) },
    };
};

const buildCampaign = async (): Promise<void> => {
    const repoRoot = gitRoot();
    const driverRoot = path.join(repoRoot, "packages", "chronodivide-bot-driver");
    if (path.resolve(process.cwd()) !== driverRoot) {
        throw new Error(`Championship generator must start in ${driverRoot}`);
    }
    if (!process.env.BASELINE_PACKAGE_ROOT || process.env.REQUIRE_EXTERNAL_BASELINE !== "true") {
        throw new Error("Set BASELINE_PACKAGE_ROOT and REQUIRE_EXTERNAL_BASELINE=true before plan generation");
    }
    const stage = parseStage();
    const outRoot = requiredPath("OUT_ROOT");
    if (fs.existsSync(outRoot)) {
        throw new Error(`Refusing to reuse existing OUT_ROOT ${outRoot}`);
    }
    const artifactRoot = requiredPath("OPTIMIZER_ARTIFACT_ROOT");
    const privateRoleRoot = requiredPath("RESEARCH_PRIVATE_ROLE_ROOT");
    const candidatePopulation = loadChampionshipCandidatePopulation(artifactRoot);
    const role: GeneratorRoleData = readGeneratorRole(repoRoot, privateRoleRoot);
    const design = buildChampionshipShardDesign(stage, role.targets);
    const targetById = new Map(role.targets.map((target) => [target.familyId, target]));

    let policies = candidatePopulation.policies;
    let parentStageA: ResearchChampionshipCampaign["parentStageA"] = null;
    let parentSourceCommit: string | null = null;
    if (stage === "stage-b") {
        const loaded = readStageASelection(
            requiredPath("STAGE_A_CAMPAIGN"),
            requiredPath("STAGE_A_SELECTION"),
            candidatePopulation,
        );
        policies = loaded.selection.selectedPolicies;
        parentStageA = loaded.parentStageA;
        const parent = JSON.parse(fs.readFileSync(parentStageA.campaignPath, "utf8")) as ResearchChampionshipCampaign;
        parentSourceCommit = parent.sourceGitCommit;
    }

    const baselineFactory = await loadBaselineFactory(path.join(repoRoot, "packages", "chronodivide-bot"));
    const generationManifest = createExperimentManifest({
        runId: `plan-championship-v2-${stage}`,
        mixDir: path.join(driverRoot, "data"),
        maps: [],
        effectiveConfig: { stage, outcomeAccess: "open-training", selectionEndpoint: "candidate-score-only" },
        baseline: baselineFactory.descriptor,
        gameSeedBase: RESEARCH_CHAMPIONSHIP_ENGINE_SEED_BASE,
    });
    if (
        generationManifest.source.gitBranch !== "main" ||
        generationManifest.source.trackedDirty !== false ||
        !generationManifest.source.gitCommit
    ) {
        throw new Error("Championship plan generation requires a clean main-branch source checkout");
    }
    if (parentSourceCommit !== null && generationManifest.source.gitCommit !== parentSourceCommit) {
        throw new Error("Stage B must use the exact same source commit as stage A");
    }
    if (
        generationManifest.software.baseline.kind !== "external-package" ||
        generationManifest.software.baseline.trackedDirty !== false ||
        !generationManifest.software.baseline.gitCommit ||
        !generationManifest.software.baseline.runtimeTree.sha256 ||
        !generationManifest.software.gameApiRuntimeTree.sha256 ||
        !generationManifest.software.packageLockSha256
    ) {
        throw new Error("Championship generation could not bind the clean baseline and runtime dependencies");
    }

    fs.mkdirSync(outRoot, { recursive: false, mode: 0o700 });
    const plansRoot = path.join(outRoot, "plans");
    fs.mkdirSync(plansRoot, { mode: 0o700 });
    const shards: ResearchChampionshipCampaign["shards"] = [];
    const sourceShort = generationManifest.source.gitCommit.slice(0, 10);
    for (const shardDesign of design) {
        const target = targetById.get(shardDesign.familyId);
        if (!target) {
            throw new Error(`Championship family ${shardDesign.familyId} is absent from the train role`);
        }
        const runId = `championship-v2-${stage}-shard${String(shardDesign.shardIndex).padStart(2, "0")}-${sourceShort}`;
        const episodes = policies.flatMap((policy, candidateIndex) => shardDesign.seedBlockIndices.flatMap(
            (seedBlockIndex) => ([0, 1] as const).map((candidateSlot) => ({
                episodeId: `c${candidateIndex}-b${seedBlockIndex}-s${candidateSlot}`,
                familyId: target.familyId,
                policyId: policy.policyId,
                seedBlockIndex,
                requestedEngineSeed: derivePairedEngineSeed(RESEARCH_CHAMPIONSHIP_ENGINE_SEED_BASE, seedBlockIndex),
                candidateSlot,
            })),
        ));
        const plan: ResearchRunPlan = parseResearchRunPlan({
            schemaVersion: 1,
            runId,
            role: "train",
            purpose: "optimizer-search",
            sourceGitCommit: generationManifest.source.gitCommit,
            sourceRuntimeSha256: sourceRuntimeCommitmentSha256(generationManifest.source.runtimeTrees),
            baselineGitCommit: generationManifest.software.baseline.gitCommit,
            baselineRuntimeSha256: generationManifest.software.baseline.runtimeTree.sha256,
            gameApiRuntimeSha256: generationManifest.software.gameApiRuntimeTree.sha256,
            packageLockSha256: generationManifest.software.packageLockSha256,
            roleManifestSha256: role.fileSha256,
            roleCommitmentSha256: role.roleCommitmentSha256,
            splitCommitmentSha256: role.splitCommitmentSha256,
            sourcePopulationCommitmentSha256: role.sourcePopulationCommitmentSha256,
            engineSeedBase: RESEARCH_CHAMPIONSHIP_ENGINE_SEED_BASE,
            candidateCountry: Countries.IRAQ,
            baselineCountry: Countries.IRAQ,
            maxTicks: RESEARCH_MAX_TICKS,
            policies,
            episodes,
        });
        const planFile = path.join(plansRoot, `shard-${String(shardDesign.shardIndex).padStart(3, "0")}.json`);
        fs.writeFileSync(planFile, serializeResearchRunPlan(plan), { flag: "wx", mode: 0o600 });
        shards.push({
            shardIndex: shardDesign.shardIndex,
            planFile,
            planSha256: sha256File(planFile),
            runId,
            familyId: target.familyId,
            seedBlockIndices: shardDesign.seedBlockIndices,
            launchedGameCount: episodes.length,
        });
    }

    const selectedFamilies = design.map(({ familyId }) => {
        const target = targetById.get(familyId);
        if (!target) {
            throw new Error(`Missing frozen training family ${familyId}`);
        }
        return {
            familyId,
            descriptors: target.descriptors,
            representativeSha256: target.representative.sha256,
        };
    });
    const launchedGameCount = shards.reduce((total, shard) => total + shard.launchedGameCount, 0);
    const expectedGameCount = stage === "stage-a"
        ? RESEARCH_CHAMPIONSHIP_STAGE_A_GAME_COUNT
        : RESEARCH_CHAMPIONSHIP_STAGE_B_GAME_COUNT;
    if (launchedGameCount !== expectedGameCount) {
        throw new Error(`Championship ${stage} launch count drifted to ${launchedGameCount}`);
    }
    const campaign: ResearchChampionshipCampaign = {
        schemaVersion: RESEARCH_CHAMPIONSHIP_SCHEMA_VERSION,
        stage,
        sourceGitCommit: generationManifest.source.gitCommit,
        optimizerSourceGitCommit: RESEARCH_CHAMPIONSHIP_OPTIMIZER_SOURCE_COMMIT,
        generatedAt: new Date().toISOString(),
        selectionRule: RESEARCH_CHAMPIONSHIP_SELECTION_RULE,
        candidatePopulationRule:
            "The canonical-policy-SHA-sorted union of six frozen finalists from each optimizer-v1 run 0 through 4.",
        maxTicks: RESEARCH_MAX_TICKS,
        engineSeedBase: RESEARCH_CHAMPIONSHIP_ENGINE_SEED_BASE,
        seedsPerFamily: stage === "stage-a"
            ? RESEARCH_CHAMPIONSHIP_STAGE_A_SEEDS_PER_FAMILY
            : RESEARCH_CHAMPIONSHIP_STAGE_B_SEEDS_PER_FAMILY,
        policyCount: policies.length,
        familyCount: RESEARCH_CHAMPIONSHIP_FAMILY_COUNT,
        launchedGameCount,
        sourceRuntimeSha256: sourceRuntimeCommitmentSha256(generationManifest.source.runtimeTrees),
        baselineGitCommit: generationManifest.software.baseline.gitCommit,
        baselineRuntimeSha256: generationManifest.software.baseline.runtimeTree.sha256,
        gameApiRuntimeSha256: generationManifest.software.gameApiRuntimeTree.sha256,
        packageLockSha256: generationManifest.software.packageLockSha256,
        roleManifestSha256: role.fileSha256,
        roleCommitmentSha256: role.roleCommitmentSha256,
        splitCommitmentSha256: role.splitCommitmentSha256,
        sourcePopulationCommitmentSha256: role.sourcePopulationCommitmentSha256,
        optimizerArtifacts: candidatePopulation.artifacts,
        parentStageA,
        policies,
        selectedFamilies,
        shards,
    };
    const campaignPath = path.join(outRoot, "campaign.json");
    fs.writeFileSync(campaignPath, JSON.stringify(campaign, null, 2), { flag: "wx", mode: 0o600 });
    fs.writeFileSync(path.join(outRoot, "plan-files.txt"), `${shards.map(({ planFile }) => planFile).join("\n")}\n`, {
        flag: "wx",
        mode: 0o600,
    });
    console.log(JSON.stringify({
        campaignPath,
        campaignSha256: sha256File(campaignPath),
        stage,
        policyCount: policies.length,
        familyCount: selectedFamilies.length,
        shardCount: shards.length,
        launchedGameCount,
    }));
};

const invokedModuleUrl = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (import.meta.url === invokedModuleUrl) {
    buildCampaign().catch((error) => {
        console.error(error);
        process.exitCode = 1;
    });
}
