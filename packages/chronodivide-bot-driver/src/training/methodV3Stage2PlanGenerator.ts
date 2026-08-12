import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { Countries } from "@supalosa/chronodivide-bot/dist/bot/logic/common/utils.js";
import { loadBaselineFactory } from "../benchmark/baselineLoader.js";
import { createExperimentManifest } from "../benchmark/provenance.js";
import { derivePairedEngineSeed } from "../benchmark/seededOfflineGame.js";
import {
    METHOD_V3_STAGE1_LAUNCH_COUNT,
    METHOD_V3_STAGE1_SHARD_COUNT,
} from "./methodV3MechanismPlanGenerator.js";
import { hasCompleteMethodV3Stage1SchedulerTasks } from "./methodV3Stage1SchedulerGate.js";
import { validateMethodV3MechanismCampaign } from "./methodV3MechanismTechnicalGate.js";
import { readGeneratorRole } from "./researchPlanGenerator.js";
import {
    parseResearchRunPlan,
    ResearchPlanEpisode,
    ResearchPlanPolicy,
    ResearchRunPlan,
    serializeResearchRunPlan,
    sha256File,
    sourceRuntimeCommitmentSha256,
} from "./researchPlanRunner.js";
import {
    MethodV3PolicyConfig,
    MethodV3Stage2PolicyConfig,
    parseResearchPolicy,
    researchPolicySha256,
} from "./researchPolicy.js";
import { generateMethodV3Stage2Policies } from "./methodV3Stage2Policies.js";
import {
    METHOD_V3_STAGE2_CAMPAIGN_VERSIONS,
    MethodV3Stage2CampaignVersion,
    METHOD_V3_STAGE2_POLICY_COUNTS,
    selectMethodV3Stage2Schedule,
} from "./methodV3Stage2Schedule.js";
import { METHOD_V3_STAGE2_SELECTION_RULE } from "./methodV3Stage2Reducer.js";

export const METHOD_V3_STAGE2_MAX_TICKS = 18_000 as const;

export type MethodV3Stage2Campaign = {
    schemaVersion: 1;
    kind: "method-v3-stage2-draw-to-win-optimizer";
    status: "FROZEN_OPEN_TRAINING_DRAW_TO_WIN_OPTIMIZER";
    generatedAt: string;
    optimizerRunIndex: number;
    stage: 0 | 1 | 2;
    campaignVersion?: MethodV3Stage2CampaignVersion;
    sourceGitCommit: string;
    sourceRuntimeSha256: string;
    baselineGitCommit: string;
    baselineRuntimeSha256: string;
    gameApiRuntimeSha256: string;
    packageLockSha256: string;
    roleManifestSha256: string;
    roleCommitmentSha256: string;
    splitCommitmentSha256: string;
    sourcePopulationCommitmentSha256: string;
    stage1CampaignPath: string;
    stage1CampaignSha256: string;
    stage1TechnicalGatePath: string;
    stage1TechnicalGateSha256: string;
    stage1SchedulerGatePath: string;
    stage1SchedulerGateSha256: string;
    stage1AnalysisPath: string;
    stage1AnalysisSha256: string;
    selectedStage1ArmId: string;
    selectedStage1PolicyId: string;
    parentCampaignPath: string | null;
    parentCampaignSha256: string | null;
    survivorPath: string | null;
    survivorSha256: string | null;
    outcomeAccess: "open-training-only-no-paper-claim";
    actualWinInvariant: string;
    mapProfilesEnabled: false;
    exactMapTacticsEnabled: false;
    familyCount: number;
    countryCount: number;
    reciprocalSlotCount: 2;
    policyCount: number;
    launchedGameCount: number;
    engineSeedBase: number;
    maxTicks: typeof METHOD_V3_STAGE2_MAX_TICKS;
    countries: Countries[];
    rankingRule: readonly string[];
    policies: Array<{ policyId: string; policy: MethodV3Stage2PolicyConfig }>;
    selectedFamilies: Array<{
        familyId: string;
        representativeSha256: string;
        descriptors: Record<string, unknown>;
    }>;
    shards: Array<{
        shardIndex: number;
        planFile: string;
        planSha256: string;
        runId: string;
        familyId: string;
        country: Countries;
        seedBlockIndex: number;
        requestedEngineSeed: number;
        launchedGameCount: number;
    }>;
};

type Stage1Analysis = {
    stage1CampaignPath: string;
    stage1CampaignSha256: string;
    stage1TechnicalGatePath: string;
    stage1TechnicalGateSha256: string;
    stage1SchedulerGatePath: string;
    stage1SchedulerGateSha256: string;
    stage1AnalysisPath: string;
    stage1AnalysisSha256: string;
    selectedStage1ArmId: string;
    selectedStage1PolicyId: string;
    selectedStage1Policy: MethodV3PolicyConfig;
};

type SurvivorArtifact = {
    schemaVersion: 1;
    status: "PASSED_METHOD_V3_STAGE2_COMPLETE_STAGE_REDUCTION";
    optimizerRunIndex: number;
    completedStage: 0 | 1;
    sourceCampaignPath: string;
    sourceCampaignSha256: string;
    selectedCount: number;
    selectedPolicies: ResearchPlanPolicy[];
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null && !Array.isArray(value);

const gitRoot = (): string => execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();

const requiredPath = (name: string): string => {
    const value = process.env[name];
    if (!value) throw new Error(`${name} is required`);
    return path.resolve(value);
};

const requiredInteger = (name: string, minimum: number, maximum: number): number => {
    const value = process.env[name];
    const parsed = value === undefined ? Number.NaN : Number(value);
    if (!Number.isSafeInteger(parsed) || parsed < minimum || parsed > maximum) {
        throw new Error(`${name} must be an integer in [${minimum}, ${maximum}]`);
    }
    return parsed;
};

const requestedCampaignVersion = (): MethodV3Stage2CampaignVersion => {
    const value = process.env.METHOD_V3_STAGE2_CAMPAIGN_VERSION ?? "primary-v1";
    if (!METHOD_V3_STAGE2_CAMPAIGN_VERSIONS.includes(value as MethodV3Stage2CampaignVersion)) {
        throw new Error(`METHOD_V3_STAGE2_CAMPAIGN_VERSION must be one of ${METHOD_V3_STAGE2_CAMPAIGN_VERSIONS.join(", ")}`);
    }
    return value as MethodV3Stage2CampaignVersion;
};

const readJson = (filePath: string): unknown => JSON.parse(fs.readFileSync(filePath, "utf8"));

export const loadMethodV3Stage1Selection = (
    campaignPath: string,
    schedulerGatePath: string,
    analysisPath: string,
): Stage1Analysis => {
    const campaign = validateMethodV3MechanismCampaign(readJson(campaignPath));
    const analysis = readJson(analysisPath);
    if (
        !isRecord(analysis) ||
        analysis.schemaVersion !== 1 ||
        analysis.status !== "OPEN_TRAINING_METHOD_V3_STAGE1_MECHANISM_ANALYSIS_NOT_A_PAPER_CLAIM" ||
        path.resolve(String(analysis.campaignPath)) !== campaignPath ||
        analysis.campaignSha256 !== sha256File(campaignPath) ||
        typeof analysis.technicalGatePath !== "string" ||
        analysis.technicalGateSha256 !== sha256File(path.resolve(analysis.technicalGatePath)) ||
        typeof analysis.selectedArmId !== "string" ||
        typeof analysis.selectedPolicyId !== "string"
    ) {
        throw new Error("Stage-1 analysis does not bind the complete frozen mechanism campaign and gate");
    }
    const technicalGatePath = path.resolve(analysis.technicalGatePath);
    const technicalGate = readJson(technicalGatePath);
    if (
        !isRecord(technicalGate) ||
        technicalGate.status !== "PASSED_METHOD_V3_STAGE1_TECHNICAL_GATE_OUTCOMES_NOT_SUMMARIZED" ||
        technicalGate.campaignSha256 !== sha256File(campaignPath) ||
        technicalGate.schedulerAccount !== "pi_jss233" ||
        technicalGate.accountedLaunches !== METHOD_V3_STAGE1_LAUNCH_COUNT ||
        technicalGate.completedLaunches !== METHOD_V3_STAGE1_LAUNCH_COUNT ||
        technicalGate.technicalFailures !== 0 ||
        technicalGate.actualWinInvariantViolations !== 0 ||
        technicalGate.authorizedNextPhase !== "method-v3-stage1-open-training-analysis"
    ) {
        throw new Error("Stage-1 technical gate is incomplete or does not authorize the cited analysis");
    }
    const schedulerGate = readJson(schedulerGatePath);
    if (
        !isRecord(schedulerGate) ||
        schedulerGate.schemaVersion !== 1 ||
        schedulerGate.status !== "PASSED_METHOD_V3_STAGE1_SCHEDULER_GATE" ||
        path.resolve(String(schedulerGate.campaignPath)) !== campaignPath ||
        schedulerGate.campaignSha256 !== sha256File(campaignPath) ||
        path.resolve(String(schedulerGate.technicalGatePath)) !== technicalGatePath ||
        schedulerGate.technicalGateSha256 !== sha256File(technicalGatePath) ||
        schedulerGate.schedulerAccount !== "pi_jss233" ||
        schedulerGate.shardCount !== METHOD_V3_STAGE1_SHARD_COUNT ||
        schedulerGate.launchedGameCount !== METHOD_V3_STAGE1_LAUNCH_COUNT ||
        !hasCompleteMethodV3Stage1SchedulerTasks(schedulerGate.tasks) ||
        schedulerGate.authorizedNextPhase !== "method-v3-stage2-plan-generation"
    ) {
        throw new Error("Stage-1 scheduler gate does not bind the complete frozen campaign and technical gate");
    }
    const selected = campaign.arms.find(
        ({ armId, policyId }) => armId === analysis.selectedArmId && policyId === analysis.selectedPolicyId,
    );
    if (!selected || researchPolicySha256(selected.policy) !== selected.policyId) {
        throw new Error("Stage-1 selected policy is absent from the frozen mechanism campaign");
    }
    return {
        stage1CampaignPath: campaignPath,
        stage1CampaignSha256: sha256File(campaignPath),
        stage1TechnicalGatePath: technicalGatePath,
        stage1TechnicalGateSha256: analysis.technicalGateSha256 as string,
        stage1SchedulerGatePath: schedulerGatePath,
        stage1SchedulerGateSha256: sha256File(schedulerGatePath),
        stage1AnalysisPath: analysisPath,
        stage1AnalysisSha256: sha256File(analysisPath),
        selectedStage1ArmId: selected.armId,
        selectedStage1PolicyId: selected.policyId,
        selectedStage1Policy: selected.policy,
    };
};

const loadSurvivors = (
    parentCampaignPath: string,
    survivorPath: string,
    runIndex: number,
    requestedStage: 1 | 2,
): Array<{ policyId: string; policy: MethodV3Stage2PolicyConfig }> => {
    const parent = readJson(parentCampaignPath);
    const survivor = readJson(survivorPath);
    const expectedCompletedStage = requestedStage === 1 ? 0 : 1;
    const expectedCount = METHOD_V3_STAGE2_POLICY_COUNTS[requestedStage];
    if (
        !isRecord(parent) ||
        parent.schemaVersion !== 1 ||
        parent.kind !== "method-v3-stage2-draw-to-win-optimizer" ||
        parent.status !== "FROZEN_OPEN_TRAINING_DRAW_TO_WIN_OPTIMIZER" ||
        parent.optimizerRunIndex !== runIndex ||
        parent.stage !== expectedCompletedStage ||
        !Array.isArray(parent.policies) ||
        parent.policies.length !== METHOD_V3_STAGE2_POLICY_COUNTS[expectedCompletedStage] ||
        !isRecord(survivor) ||
        survivor.schemaVersion !== 1 ||
        survivor.status !== "PASSED_METHOD_V3_STAGE2_COMPLETE_STAGE_REDUCTION" ||
        survivor.optimizerRunIndex !== runIndex ||
        survivor.completedStage !== expectedCompletedStage ||
        path.resolve(String(survivor.sourceCampaignPath)) !== parentCampaignPath ||
        survivor.sourceCampaignSha256 !== sha256File(parentCampaignPath) ||
        survivor.selectedCount !== expectedCount ||
        !Array.isArray(survivor.selectedPolicies) ||
        survivor.selectedPolicies.length !== expectedCount
    ) {
        throw new Error(`Stage-${requestedStage} survivor chain is incomplete or mismatched`);
    }
    const parentPolicies = new Map(
        (parent.policies as ResearchPlanPolicy[]).map(({ policyId, policy }) => [policyId, policy]),
    );
    return survivor.selectedPolicies.map((raw, index) => {
        if (!isRecord(raw) || typeof raw.policyId !== "string") {
            throw new Error(`Survivor ${index} is malformed`);
        }
        const policy = parseResearchPolicy(raw.policy);
        if (
            policy.schemaVersion !== 3 ||
            researchPolicySha256(policy) !== raw.policyId ||
            JSON.stringify(parentPolicies.get(raw.policyId)) !== JSON.stringify(raw.policy)
        ) {
            throw new Error(`Survivor ${index} is not an exact parent campaign policy`);
        }
        return { policyId: raw.policyId, policy } as { policyId: string; policy: MethodV3Stage2PolicyConfig };
    });
};

export const buildMethodV3Stage2Episodes = (
    familyId: string,
    policies: Array<{ policyId: string }>,
    seedBlockIndex: number,
    requestedEngineSeed: number,
): Array<Omit<ResearchPlanEpisode, "methodId">> =>
    policies.flatMap(({ policyId }, policyIndex) => ([0, 1] as const).map((candidateSlot) => ({
        episodeId: `p${policyIndex}-b${seedBlockIndex}-s${candidateSlot}`,
        familyId,
        policyId,
        seedBlockIndex,
        requestedEngineSeed,
        candidateSlot,
    })));

const main = async (): Promise<void> => {
    const repoRoot = gitRoot();
    const driverRoot = path.join(repoRoot, "packages", "chronodivide-bot-driver");
    if (path.resolve(process.cwd()) !== driverRoot) {
        throw new Error(`Method-v3 Stage-2 generator must start in ${driverRoot}`);
    }
    if (!process.env.BASELINE_PACKAGE_ROOT || process.env.REQUIRE_EXTERNAL_BASELINE !== "true") {
        throw new Error("Set BASELINE_PACKAGE_ROOT and REQUIRE_EXTERNAL_BASELINE=true before generation");
    }
    const stage = requiredInteger("STAGE", 0, 2) as 0 | 1 | 2;
    const optimizerRunIndex = requiredInteger("OPTIMIZER_RUN_INDEX", 0, 4);
    const campaignVersion = requestedCampaignVersion();
    const privateRoleRoot = requiredPath("RESEARCH_PRIVATE_ROLE_ROOT");
    const outRoot = requiredPath("OUT_ROOT");
    const stage1CampaignPath = requiredPath("STAGE1_CAMPAIGN");
    const stage1SchedulerGatePath = requiredPath("STAGE1_SCHEDULER_GATE");
    const stage1AnalysisPath = requiredPath("STAGE1_ANALYSIS");
    if (fs.existsSync(outRoot)) throw new Error(`Refusing to reuse existing OUT_ROOT ${outRoot}`);

    const stage1 = loadMethodV3Stage1Selection(
        stage1CampaignPath,
        stage1SchedulerGatePath,
        stage1AnalysisPath,
    );
    const { selectedStage1Policy, ...stage1Commitments } = stage1;
    const parentCampaignPath = stage === 0 ? null : requiredPath("PARENT_CAMPAIGN");
    const survivorPath = stage === 0 ? null : requiredPath("SURVIVOR_FILE");
    const policies = stage === 0
        ? generateMethodV3Stage2Policies(optimizerRunIndex, selectedStage1Policy)
        : loadSurvivors(parentCampaignPath as string, survivorPath as string, optimizerRunIndex, stage);
    if (policies.length !== METHOD_V3_STAGE2_POLICY_COUNTS[stage]) {
        throw new Error(`Stage ${stage} requires ${METHOD_V3_STAGE2_POLICY_COUNTS[stage]} policies`);
    }

    const role = readGeneratorRole(repoRoot, privateRoleRoot);
    const schedule = selectMethodV3Stage2Schedule(role.targets, optimizerRunIndex, stage, campaignVersion);
    const baselineFactory = await loadBaselineFactory(path.join(repoRoot, "packages", "chronodivide-bot"));
    const generationManifest = createExperimentManifest({
        runId: `plan-method-v3-stage2-r${optimizerRunIndex}-s${stage}`,
        mixDir: path.join(driverRoot, "data"),
        maps: [],
        effectiveConfig: {
            purpose: "method-v3-draw-to-win-optimizer",
            outcomeAccess: false,
            optimizerRunIndex,
            stage,
            campaignVersion,
            policyCount: policies.length,
            familyCount: schedule.families.length,
            countryCount: schedule.countries.length,
            reciprocalSlots: [0, 1],
            maxTicks: METHOD_V3_STAGE2_MAX_TICKS,
        },
        baseline: baselineFactory.descriptor,
        gameSeedBase: schedule.engineSeedBase,
    });
    if (
        generationManifest.source.gitBranch !== "main" ||
        generationManifest.source.trackedDirty !== false ||
        !generationManifest.source.gitCommit ||
        generationManifest.software.baseline.kind !== "external-package" ||
        generationManifest.software.baseline.trackedDirty !== false ||
        !generationManifest.software.baseline.gitCommit ||
        !generationManifest.software.baseline.runtimeTree.sha256 ||
        !generationManifest.software.gameApiRuntimeTree.sha256 ||
        !generationManifest.software.packageLockSha256
    ) {
        throw new Error("Method-v3 Stage-2 generation requires clean main and the clean external baseline");
    }

    fs.mkdirSync(outRoot, { recursive: false, mode: 0o700 });
    const plansRoot = path.join(outRoot, "plans");
    fs.mkdirSync(plansRoot, { mode: 0o700 });
    const sourceShort = generationManifest.source.gitCommit.slice(0, 10);
    const shards: MethodV3Stage2Campaign["shards"] = [];
    for (let familyIndex = 0; familyIndex < schedule.families.length; familyIndex++) {
        const target = schedule.families[familyIndex];
        for (let countryIndex = 0; countryIndex < schedule.countries.length; countryIndex++) {
            const country = schedule.countries[countryIndex];
            const shardIndex = familyIndex * schedule.countries.length + countryIndex;
            const seedBlockIndex = shardIndex;
            const requestedEngineSeed = derivePairedEngineSeed(schedule.engineSeedBase, seedBlockIndex);
            const runId = `method-v3-stage2-r${optimizerRunIndex}-s${stage}-f${familyIndex}-c${countryIndex}-${sourceShort}`;
            const episodes = buildMethodV3Stage2Episodes(
                target.familyId,
                policies,
                seedBlockIndex,
                requestedEngineSeed,
            );
            const plan: ResearchRunPlan = parseResearchRunPlan({
                schemaVersion: 1,
                runId,
                role: "train",
                purpose: "method-v3-draw-to-win-optimizer",
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
                engineSeedBase: schedule.engineSeedBase,
                candidateCountry: country,
                baselineCountry: country,
                maxTicks: METHOD_V3_STAGE2_MAX_TICKS,
                policies,
                episodes,
            });
            const planFile = path.join(plansRoot, `shard-${String(shardIndex).padStart(3, "0")}.json`);
            fs.writeFileSync(planFile, serializeResearchRunPlan(plan), { flag: "wx", mode: 0o600 });
            shards.push({
                shardIndex,
                planFile,
                planSha256: sha256File(planFile),
                runId,
                familyId: target.familyId,
                country,
                seedBlockIndex,
                requestedEngineSeed,
                launchedGameCount: episodes.length,
            });
        }
    }
    const campaign: MethodV3Stage2Campaign = {
        schemaVersion: 1,
        kind: "method-v3-stage2-draw-to-win-optimizer",
        status: "FROZEN_OPEN_TRAINING_DRAW_TO_WIN_OPTIMIZER",
        generatedAt: new Date().toISOString(),
        optimizerRunIndex,
        stage,
        campaignVersion,
        sourceGitCommit: generationManifest.source.gitCommit,
        sourceRuntimeSha256: sourceRuntimeCommitmentSha256(generationManifest.source.runtimeTrees),
        baselineGitCommit: generationManifest.software.baseline.gitCommit,
        baselineRuntimeSha256: generationManifest.software.baseline.runtimeTree.sha256 as string,
        gameApiRuntimeSha256: generationManifest.software.gameApiRuntimeTree.sha256 as string,
        packageLockSha256: generationManifest.software.packageLockSha256 as string,
        roleManifestSha256: role.fileSha256,
        roleCommitmentSha256: role.roleCommitmentSha256,
        splitCommitmentSha256: role.splitCommitmentSha256,
        sourcePopulationCommitmentSha256: role.sourcePopulationCommitmentSha256,
        ...stage1Commitments,
        parentCampaignPath,
        parentCampaignSha256: parentCampaignPath ? sha256File(parentCampaignPath) : null,
        survivorPath,
        survivorSha256: survivorPath ? sha256File(survivorPath) : null,
        outcomeAccess: "open-training-only-no-paper-claim",
        actualWinInvariant: "finished shortGame, Supalosa defeated, candidate alive, zero terminal Supalosa buildings",
        mapProfilesEnabled: false,
        exactMapTacticsEnabled: false,
        familyCount: schedule.families.length,
        countryCount: schedule.countries.length,
        reciprocalSlotCount: 2,
        policyCount: policies.length,
        launchedGameCount: shards.reduce((total, shard) => total + shard.launchedGameCount, 0),
        engineSeedBase: schedule.engineSeedBase,
        maxTicks: METHOD_V3_STAGE2_MAX_TICKS,
        countries: schedule.countries,
        rankingRule: METHOD_V3_STAGE2_SELECTION_RULE,
        policies,
        selectedFamilies: schedule.families.map((target) => ({
            familyId: target.familyId,
            representativeSha256: target.representative.sha256,
            descriptors: target.descriptors,
        })),
        shards,
    } as MethodV3Stage2Campaign;
    const campaignPath = path.join(outRoot, "campaign.json");
    fs.writeFileSync(campaignPath, JSON.stringify(campaign, null, 2), { flag: "wx", mode: 0o600 });
    fs.writeFileSync(path.join(outRoot, "plan-files.txt"), `${shards.map(({ planFile }) => planFile).join("\n")}\n`, {
        flag: "wx",
        mode: 0o600,
    });
    console.log(JSON.stringify({
        campaignPath,
        campaignSha256: sha256File(campaignPath),
        optimizerRunIndex,
        stage,
        policyCount: policies.length,
        familyCount: schedule.families.length,
        countryCount: schedule.countries.length,
        shardCount: shards.length,
        launchedGameCount: campaign.launchedGameCount,
    }));
};

const invokedModuleUrl = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (import.meta.url === invokedModuleUrl) {
    main().catch((error) => {
        console.error(error);
        process.exitCode = 1;
    });
}
