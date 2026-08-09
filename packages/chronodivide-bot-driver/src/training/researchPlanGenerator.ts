import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { Countries } from "@supalosa/chronodivide-bot/dist/bot/logic/common/utils.js";
import { loadBaselineFactory } from "../benchmark/baselineLoader.js";
import { createExperimentManifest } from "../benchmark/provenance.js";
import { derivePairedEngineSeed } from "../benchmark/seededOfflineGame.js";
import {
    parseResearchRunPlan,
    ResearchPlanPolicy,
    ResearchRunPlan,
    RoleTarget,
    sha256File,
    sourceRuntimeCommitmentSha256,
} from "./researchPlanRunner.js";
import {
    DEFAULT_RESEARCH_POLICY,
    parseResearchPolicy,
    RESEARCH_ATTACK_COMPOSITIONS,
    RESEARCH_POLICY_SEARCH_SPACE,
    RESEARCH_STRATEGIC_PLANS,
    ResearchPolicyConfig,
    researchPolicySha256,
} from "./researchPolicy.js";

export const RESEARCH_OPTIMIZER_SCHEMA_VERSION = 1 as const;
export const RESEARCH_MAX_TICKS = 18_000 as const;
export const RESEARCH_STAGE0_POLICY_COUNT = 32 as const;
export const RESEARCH_STAGE0_FAMILY_COUNT = 6 as const;
export const RESEARCH_STAGE1_POLICY_COUNT = 12 as const;
export const RESEARCH_STAGE1_FAMILY_COUNT = 12 as const;
export const RESEARCH_STAGE2_POLICY_COUNT = 6 as const;
export const RESEARCH_STAGE2_FAMILY_COUNT = 22 as const;
export const RESEARCH_SMOKE_SEED_BASE = 10_000_000 as const;
export const RESEARCH_OPTIMIZER_SEED_BASE = 20_000_000 as const;
export const RESEARCH_OPTIMIZER_RUN_STRIDE = 100_000 as const;

export type GeneratorMode = "train-smoke" | "optimizer-stage0" | "optimizer-stage1" | "optimizer-stage2";

export type GeneratorRoleData = {
    fileSha256: string;
    roleCommitmentSha256: string;
    splitCommitmentSha256: string;
    sourcePopulationCommitmentSha256: string;
    targets: RoleTarget[];
};

export type ResearchCampaignManifest = {
    schemaVersion: typeof RESEARCH_OPTIMIZER_SCHEMA_VERSION;
    mode: GeneratorMode;
    stage: "smoke" | 0 | 1 | 2;
    optimizerRunIndex: number;
    sourceGitCommit: string;
    generatedAt: string;
    selectionRule: string;
    candidateGenerationRule: string;
    maxTicks: typeof RESEARCH_MAX_TICKS;
    engineSeedBase: number;
    policyCount: number;
    familyCount: number;
    launchedGameCount: number;
    parentCampaignSha256: string | null;
    survivorFileSha256: string | null;
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
        launchedGameCount: number;
    }>;
};

type SurvivorArtifact = {
    schemaVersion: 1;
    optimizerRunIndex: number;
    completedStage: 0 | 1;
    sourceCampaignPath: string;
    sourceCampaignSha256: string;
    selectedCount: number;
    selectedPolicies: ResearchPlanPolicy[];
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null && !Array.isArray(value);

const digest = (...parts: Array<string | number>): Buffer =>
    crypto.createHash("sha256").update(parts.join("\0")).digest();

const deterministicIndex = (upperBound: number, ...parts: Array<string | number>): number => {
    if (!Number.isSafeInteger(upperBound) || upperBound <= 0) {
        throw new Error(`deterministicIndex upper bound must be positive; got ${upperBound}`);
    }
    return digest("chrono-divide-research-optimizer-v1", ...parts).readUInt32BE(0) % upperBound;
};

const deterministicRank = (domain: string, runIndex: number, value: string): string =>
    digest("chrono-divide-research-optimizer-v1", domain, runIndex, value).toString("hex");

const mutatePolicy = (
    base: ResearchPolicyConfig,
    runIndex: number,
    candidateIndex: number,
): ResearchPolicyConfig => {
    const record = { ...base } as unknown as Record<string, unknown>;
    const mutableKeys = Object.keys(RESEARCH_POLICY_SEARCH_SPACE).sort();
    const compositionAnchors = RESEARCH_ATTACK_COMPOSITIONS.filter(
        (value) => value !== DEFAULT_RESEARCH_POLICY.attackCompositionPolicy,
    );
    const planAnchors = RESEARCH_STRATEGIC_PLANS.filter(
        (value) => value !== DEFAULT_RESEARCH_POLICY.strategicPlan,
    );
    let anchorKey: string | null = null;
    if (candidateIndex >= 1 && candidateIndex <= compositionAnchors.length) {
        anchorKey = "attackCompositionPolicy";
        record[anchorKey] = compositionAnchors[candidateIndex - 1];
    } else if (
        candidateIndex > compositionAnchors.length &&
        candidateIndex <= compositionAnchors.length + planAnchors.length
    ) {
        anchorKey = "strategicPlan";
        record[anchorKey] = planAnchors[candidateIndex - compositionAnchors.length - 1];
    }
    const mutationCount = 6 + deterministicIndex(9, "mutation-count", runIndex, candidateIndex);
    const rankedKeys = mutableKeys
        .filter((key) => key !== anchorKey)
        .sort((left, right) =>
            deterministicRank(`candidate-${candidateIndex}-key`, runIndex, left).localeCompare(
                deterministicRank(`candidate-${candidateIndex}-key`, runIndex, right),
            ),
        );
    for (const key of rankedKeys.slice(0, mutationCount)) {
        const values = (RESEARCH_POLICY_SEARCH_SPACE as unknown as Record<string, readonly unknown[]>)[key];
        const current = record[key];
        const alternatives = values.filter((value) => value !== current);
        record[key] = alternatives[deterministicIndex(alternatives.length, "choice", runIndex, candidateIndex, key)];
    }
    return parseResearchPolicy(record);
};

/**
 * Candidate zero is the frozen generic default. Candidates 1-8 anchor every
 * alternative composition, candidates 9-17 anchor every alternative strategic
 * plan, and the remaining candidates are deterministic sparse mutations. All
 * candidates receive 6-14 additional non-anchor mutations.
 */
export const generateStage0Policies = (optimizerRunIndex: number): ResearchPlanPolicy[] => {
    if (!Number.isSafeInteger(optimizerRunIndex) || optimizerRunIndex < 0 || optimizerRunIndex > 999) {
        throw new Error("optimizerRunIndex must be an integer in [0, 999]");
    }
    const result: ResearchPlanPolicy[] = [];
    const seen = new Set<string>();
    for (let candidateIndex = 0; candidateIndex < RESEARCH_STAGE0_POLICY_COUNT; candidateIndex++) {
        const policy = candidateIndex === 0 ? parseResearchPolicy(DEFAULT_RESEARCH_POLICY) : mutatePolicy(
            DEFAULT_RESEARCH_POLICY,
            optimizerRunIndex,
            candidateIndex,
        );
        const policyId = researchPolicySha256(policy);
        if (seen.has(policyId)) {
            throw new Error(`Candidate generator produced duplicate policy ${policyId} in run ${optimizerRunIndex}`);
        }
        seen.add(policyId);
        result.push({ policyId, policy });
    }
    return result;
};

const targetStartCount = (target: RoleTarget): number => {
    const value = target.descriptors.startCount;
    if (!Number.isSafeInteger(value) || (value as number) <= 0) {
        throw new Error(`Training family ${target.familyId} lacks a positive integer startCount`);
    }
    return value as number;
};

/** Select one family per available start-count stratum, then fill by the same hash rank. */
export const selectTrainingFamilies = (
    targets: RoleTarget[],
    optimizerRunIndex: number,
    familyCount: number,
): RoleTarget[] => {
    if (!Number.isSafeInteger(familyCount) || familyCount <= 0 || targets.length < familyCount) {
        throw new Error(`Requested ${familyCount} families from a population of ${targets.length}`);
    }
    const ranked = [...targets].sort((left, right) =>
        deterministicRank("stage0-family", optimizerRunIndex, left.familyId).localeCompare(
            deterministicRank("stage0-family", optimizerRunIndex, right.familyId),
        ),
    );
    const selected: RoleTarget[] = [];
    for (const startCount of [...new Set(ranked.map(targetStartCount))].sort((left, right) => left - right)) {
        const target = ranked.find((candidate) => targetStartCount(candidate) === startCount);
        if (target && selected.length < familyCount) {
            selected.push(target);
        }
    }
    for (const target of ranked) {
        if (selected.length >= familyCount) {
            break;
        }
        if (!selected.includes(target)) {
            selected.push(target);
        }
    }
    return selected;
};

export const selectStage0Families = (targets: RoleTarget[], optimizerRunIndex: number): RoleTarget[] =>
    selectTrainingFamilies(targets, optimizerRunIndex, RESEARCH_STAGE0_FAMILY_COUNT);

const readSurvivors = (
    survivorPath: string,
    parentCampaignPath: string,
    optimizerRunIndex: number,
    requestedStage: 1 | 2,
): { policies: ResearchPlanPolicy[]; parentCampaignSha256: string; survivorFileSha256: string } => {
    const parentCampaignSha256 = sha256File(parentCampaignPath);
    const parentValue = JSON.parse(fs.readFileSync(parentCampaignPath, "utf8")) as Record<string, unknown>;
    const survivorValue = JSON.parse(fs.readFileSync(survivorPath, "utf8")) as Partial<SurvivorArtifact>;
    const expectedCompletedStage = requestedStage === 1 ? 0 : 1;
    const expectedPolicyCount = requestedStage === 1 ? RESEARCH_STAGE1_POLICY_COUNT : RESEARCH_STAGE2_POLICY_COUNT;
    const expectedParentMode = requestedStage === 1 ? "optimizer-stage0" : "optimizer-stage1";
    if (
        parentValue.schemaVersion !== RESEARCH_OPTIMIZER_SCHEMA_VERSION ||
        parentValue.mode !== expectedParentMode ||
        parentValue.optimizerRunIndex !== optimizerRunIndex ||
        !Array.isArray(parentValue.policies)
    ) {
        throw new Error(`Parent campaign is not the expected run-${optimizerRunIndex} ${expectedParentMode} campaign`);
    }
    if (
        survivorValue.schemaVersion !== 1 ||
        survivorValue.optimizerRunIndex !== optimizerRunIndex ||
        survivorValue.completedStage !== expectedCompletedStage ||
        path.resolve(String(survivorValue.sourceCampaignPath)) !== path.resolve(parentCampaignPath) ||
        survivorValue.sourceCampaignSha256 !== parentCampaignSha256 ||
        survivorValue.selectedCount !== expectedPolicyCount ||
        !Array.isArray(survivorValue.selectedPolicies) ||
        survivorValue.selectedPolicies.length !== expectedPolicyCount
    ) {
        throw new Error(`Survivor artifact is not the expected stage-${expectedCompletedStage} selection`);
    }
    const parentPolicies = new Map(
        (parentValue.policies as ResearchPlanPolicy[]).map((policy) => [policy.policyId, policy.policy]),
    );
    const policies = survivorValue.selectedPolicies.map((raw, index) => {
        if (!isRecord(raw) || typeof raw.policyId !== "string") {
            throw new Error(`Selected survivor ${index} has an invalid schema`);
        }
        const policy = parseResearchPolicy(raw.policy);
        if (researchPolicySha256(policy) !== raw.policyId || !parentPolicies.has(raw.policyId)) {
            throw new Error(`Selected survivor ${index} is not a hash-identical parent policy`);
        }
        if (researchPolicySha256(parentPolicies.get(raw.policyId)) !== raw.policyId) {
            throw new Error(`Parent policy bytes differ for selected survivor ${index}`);
        }
        return { policyId: raw.policyId, policy };
    });
    if (new Set(policies.map(({ policyId }) => policyId)).size !== policies.length) {
        throw new Error("Survivor artifact contains duplicate policies");
    }
    return { policies, parentCampaignSha256, survivorFileSha256: sha256File(survivorPath) };
};

export const readGeneratorRole = (repoRoot: string, privateRoleRoot: string): GeneratorRoleData => {
    const publicPath = path.join(repoRoot, "research", "artifacts", "family_role_commitments_v1.json");
    const publicValue = JSON.parse(fs.readFileSync(publicPath, "utf8")) as Record<string, unknown>;
    if (publicValue.status !== "FROZEN_FAMILY_ROLE_COMMITMENTS_IDENTITIES_PRIVATE") {
        throw new Error("Public role commitment artifact has the wrong status");
    }
    if (!isRecord(publicValue.privateArtifacts) || !isRecord(publicValue.roleCommitments)) {
        throw new Error("Public role commitment artifact is incomplete");
    }
    const trainArtifact = publicValue.privateArtifacts.train;
    if (!isRecord(trainArtifact) || trainArtifact.file !== "train-families.json" || typeof trainArtifact.sha256 !== "string") {
        throw new Error("Public train-role commitment is invalid");
    }
    const privatePath = path.join(privateRoleRoot, "train-families.json");
    const fileSha256 = sha256File(privatePath);
    if (fileSha256 !== trainArtifact.sha256) {
        throw new Error("Private train manifest bytes differ from the public commitment");
    }
    const privateValue = JSON.parse(fs.readFileSync(privatePath, "utf8")) as Record<string, unknown>;
    if (
        privateValue.status !== "PRIVATE_FAMILY_ROLE_MANIFEST_NO_POLICY_OUTCOMES" ||
        privateValue.role !== "train" ||
        !Array.isArray(privateValue.targets)
    ) {
        throw new Error("Private train manifest has the wrong status, role, or target schema");
    }
    const targets = privateValue.targets as RoleTarget[];
    if (targets.length !== privateValue.targetCount || new Set(targets.map(({ familyId }) => familyId)).size !== targets.length) {
        throw new Error("Private train manifest target count or identity uniqueness is invalid");
    }
    const roleCommitmentSha256 = privateValue.roleCommitmentSha256;
    const splitCommitmentSha256 = privateValue.splitCommitmentSha256;
    const sourcePopulationCommitmentSha256 = privateValue.sourcePopulationCommitmentSha256;
    if (
        typeof roleCommitmentSha256 !== "string" ||
        roleCommitmentSha256 !== publicValue.roleCommitments.train ||
        typeof splitCommitmentSha256 !== "string" ||
        splitCommitmentSha256 !== publicValue.splitCommitmentSha256 ||
        typeof sourcePopulationCommitmentSha256 !== "string" ||
        sourcePopulationCommitmentSha256 !== publicValue.sourcePopulationCommitmentSha256
    ) {
        throw new Error("Train role commitment chain is inconsistent");
    }
    return {
        fileSha256,
        roleCommitmentSha256,
        splitCommitmentSha256,
        sourcePopulationCommitmentSha256,
        targets,
    };
};

const gitRoot = (): string => execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();

const requiredPath = (name: string): string => {
    const value = process.env[name];
    if (!value) {
        throw new Error(`${name} is required`);
    }
    return path.resolve(value);
};

const parseOptimizerRunIndex = (): number => {
    const raw = process.env.OPTIMIZER_RUN_INDEX ?? "0";
    const value = Number.parseInt(raw, 10);
    if (!/^\d+$/.test(raw) || !Number.isSafeInteger(value) || value < 0 || value > 999) {
        throw new Error(`OPTIMIZER_RUN_INDEX must be an integer in [0, 999]; got ${raw}`);
    }
    return value;
};

const modeFromEnvironment = (): GeneratorMode => {
    const value = process.env.RESEARCH_PLAN_MODE;
    if (
        value !== "train-smoke" &&
        value !== "optimizer-stage0" &&
        value !== "optimizer-stage1" &&
        value !== "optimizer-stage2"
    ) {
        throw new Error("RESEARCH_PLAN_MODE must be train-smoke or optimizer-stage0/1/2");
    }
    return value;
};

const main = async (): Promise<void> => {
    const repoRoot = gitRoot();
    const driverRoot = path.join(repoRoot, "packages", "chronodivide-bot-driver");
    if (path.resolve(process.cwd()) !== driverRoot) {
        throw new Error(`Research plan generator must start in ${driverRoot}`);
    }
    if (!process.env.BASELINE_PACKAGE_ROOT || process.env.REQUIRE_EXTERNAL_BASELINE !== "true") {
        throw new Error("Set BASELINE_PACKAGE_ROOT and REQUIRE_EXTERNAL_BASELINE=true before plan generation");
    }
    const privateRoleRoot = requiredPath("RESEARCH_PRIVATE_ROLE_ROOT");
    const outRoot = requiredPath("OUT_ROOT");
    if (fs.existsSync(outRoot)) {
        throw new Error(`Refusing to reuse existing OUT_ROOT ${outRoot}`);
    }
    const mode = modeFromEnvironment();
    const optimizerRunIndex = parseOptimizerRunIndex();
    const role = readGeneratorRole(repoRoot, privateRoleRoot);
    if (role.targets.length !== RESEARCH_STAGE2_FAMILY_COUNT) {
        throw new Error(`Research optimizer v1 requires exactly ${RESEARCH_STAGE2_FAMILY_COUNT} frozen train families`);
    }
    const stage: ResearchCampaignManifest["stage"] = mode === "train-smoke"
        ? "smoke"
        : mode === "optimizer-stage0"
            ? 0
            : mode === "optimizer-stage1"
                ? 1
                : 2;
    let policies: ResearchPlanPolicy[];
    let parentCampaignSha256: string | null = null;
    let survivorFileSha256: string | null = null;
    if (mode === "train-smoke") {
        policies = [{ policyId: researchPolicySha256(DEFAULT_RESEARCH_POLICY), policy: parseResearchPolicy(DEFAULT_RESEARCH_POLICY) }];
    } else if (mode === "optimizer-stage0") {
        policies = generateStage0Policies(optimizerRunIndex);
    } else {
        const parent = readSurvivors(
            requiredPath("SURVIVOR_FILE"),
            requiredPath("PARENT_CAMPAIGN"),
            optimizerRunIndex,
            stage as 1 | 2,
        );
        policies = parent.policies;
        parentCampaignSha256 = parent.parentCampaignSha256;
        survivorFileSha256 = parent.survivorFileSha256;
    }
    const familyCount = stage === "smoke"
        ? 1
        : stage === 0
            ? RESEARCH_STAGE0_FAMILY_COUNT
            : stage === 1
                ? RESEARCH_STAGE1_FAMILY_COUNT
                : RESEARCH_STAGE2_FAMILY_COUNT;
    const selectedTrainingFamilies = selectTrainingFamilies(role.targets, optimizerRunIndex, Math.max(1, familyCount));
    const families = stage === "smoke" ? [selectedTrainingFamilies[0]] : selectedTrainingFamilies;
    const engineSeedBase = mode === "train-smoke"
        ? RESEARCH_SMOKE_SEED_BASE + optimizerRunIndex * 100
        : RESEARCH_OPTIMIZER_SEED_BASE + optimizerRunIndex * RESEARCH_OPTIMIZER_RUN_STRIDE;
    const baselineFactory = await loadBaselineFactory(path.join(repoRoot, "packages", "chronodivide-bot"));
    const generationManifest = createExperimentManifest({
        runId: `plan-${mode}-r${optimizerRunIndex}`,
        mixDir: path.join(driverRoot, "data"),
        maps: [],
        effectiveConfig: { mode, optimizerRunIndex, outcomeAccess: false },
        baseline: baselineFactory.descriptor,
        gameSeedBase: engineSeedBase,
    });
    if (
        generationManifest.source.gitBranch !== "main" ||
        generationManifest.source.trackedDirty !== false ||
        !generationManifest.source.gitCommit
    ) {
        throw new Error("Plan generation requires a clean main-branch source checkout");
    }
    if (
        generationManifest.software.baseline.kind !== "external-package" ||
        generationManifest.software.baseline.trackedDirty !== false ||
        !generationManifest.software.baseline.gitCommit ||
        !generationManifest.software.baseline.runtimeTree.sha256 ||
        !generationManifest.software.gameApiRuntimeTree.sha256 ||
        !generationManifest.software.packageLockSha256
    ) {
        throw new Error("Plan generation could not bind the clean baseline and runtime dependencies");
    }

    fs.mkdirSync(outRoot, { recursive: false, mode: 0o700 });
    const plansRoot = path.join(outRoot, "plans");
    fs.mkdirSync(plansRoot, { mode: 0o700 });
    const shards: ResearchCampaignManifest["shards"] = [];
    const sourceShort = generationManifest.source.gitCommit.slice(0, 10);
    for (let shardIndex = 0; shardIndex < families.length; shardIndex++) {
        const target = families[shardIndex];
        const seedBlockIndex = stage === "smoke" ? 900 : (stage as number) * 100 + shardIndex;
        const requestedEngineSeed = derivePairedEngineSeed(engineSeedBase, seedBlockIndex);
        const runId = mode === "train-smoke"
            ? `train-smoke-r${optimizerRunIndex}-${sourceShort}`
            : `optimizer-r${optimizerRunIndex}-stage${stage}-shard${shardIndex}-${sourceShort}`;
        const episodes = policies.flatMap((policy, candidateIndex) => ([0, 1] as const).map((candidateSlot) => ({
            episodeId: `c${candidateIndex}-b${seedBlockIndex}-s${candidateSlot}`,
            familyId: target.familyId,
            policyId: policy.policyId,
            seedBlockIndex,
            requestedEngineSeed,
            candidateSlot,
        })));
        const plan: ResearchRunPlan = parseResearchRunPlan({
            schemaVersion: 1,
            runId,
            role: "train",
            purpose: mode === "train-smoke" ? "train-smoke" : "optimizer-search",
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
            engineSeedBase,
            candidateCountry: Countries.IRAQ,
            baselineCountry: Countries.IRAQ,
            maxTicks: RESEARCH_MAX_TICKS,
            policies,
            episodes,
        });
        const planFile = path.join(plansRoot, `shard-${String(shardIndex).padStart(3, "0")}.json`);
        fs.writeFileSync(planFile, JSON.stringify(plan, null, 2), { flag: "wx", mode: 0o600 });
        shards.push({
            shardIndex,
            planFile,
            planSha256: sha256File(planFile),
            runId,
            familyId: target.familyId,
            launchedGameCount: episodes.length,
        });
    }
    const campaign: ResearchCampaignManifest = {
        schemaVersion: RESEARCH_OPTIMIZER_SCHEMA_VERSION,
        mode,
        stage,
        optimizerRunIndex,
        sourceGitCommit: generationManifest.source.gitCommit,
        generatedAt: new Date().toISOString(),
        selectionRule:
            "Rank train families by SHA-256(run index, family ID), select one per start-count stratum, then fill by rank.",
        candidateGenerationRule:
            "Candidate 0 is the frozen default; candidates 1-8 anchor alternative compositions; candidates 9-17 " +
            "anchor alternative strategic plans; all non-default candidates receive 6-14 deterministic sparse mutations.",
        maxTicks: RESEARCH_MAX_TICKS,
        engineSeedBase,
        policyCount: policies.length,
        familyCount: families.length,
        launchedGameCount: shards.reduce((total, shard) => total + shard.launchedGameCount, 0),
        parentCampaignSha256,
        survivorFileSha256,
        policies,
        selectedFamilies: families.map((target) => ({
            familyId: target.familyId,
            descriptors: target.descriptors,
            representativeSha256: target.representative.sha256,
        })),
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
        mode,
        optimizerRunIndex,
        policyCount: policies.length,
        familyCount: families.length,
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
