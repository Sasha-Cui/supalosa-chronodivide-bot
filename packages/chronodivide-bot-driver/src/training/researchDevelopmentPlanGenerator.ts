import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { Countries } from "@supalosa/chronodivide-bot/dist/bot/logic/common/utils.js";
import { loadBaselineFactory } from "../benchmark/baselineLoader.js";
import { createExperimentManifest } from "../benchmark/provenance.js";
import { derivePairedEngineSeed } from "../benchmark/seededOfflineGame.js";
import { parseResearchPolicy, researchPolicySha256 } from "./researchPolicy.js";
import {
    parseResearchRunPlan,
    ResearchPlanPolicy,
    ResearchRunPlan,
    sha256File,
    sourceRuntimeCommitmentSha256,
} from "./researchPlanRunner.js";
import {
    ResearchSelectorModel,
    ResearchStructuralDescriptors,
    selectConditionedPolicy,
} from "./researchSelector.js";

export const RESEARCH_DEVELOPMENT_CAMPAIGN_SCHEMA_VERSION = 1 as const;
export const RESEARCH_DEVELOPMENT_MAX_TICKS = 18_000 as const;
export const RESEARCH_DEVELOPMENT_SEED_BASE = 30_000_000 as const;
export const RESEARCH_DEVELOPMENT_HARD_CAP = 1_000 as const;
export const RESEARCH_DEVELOPMENT_METHODS = ["global", "conditioned"] as const;

export type DevelopmentPhase =
    | "development-phase1"
    | "development-phase2"
    | "development-phase3";

export type DevelopmentTarget = {
    familyId: string;
    representative: { path: string; sha256: string };
    descriptors: Record<string, unknown>;
    diagnosticRole: "primary" | "substitute";
    substituteOrder: number | null;
};

export type DevelopmentShardDesign = {
    shardIndex: number;
    familyId: string;
    optimizerRunIndex: number;
    seedBlockIndex: number;
    seedOrdinal: number;
    freshProcessRepeat: number;
};

type DevelopmentRoleData = {
    fileSha256: string;
    roleCommitmentSha256: string;
    splitCommitmentSha256: string;
    sourcePopulationCommitmentSha256: string;
    targets: DevelopmentTarget[];
};

type LoadedOptimizerArtifact = {
    artifactPath: string;
    artifactSha256: string;
    schemaVersion: 1;
    optimizerRunIndex: number;
    sourceGitCommit: string;
    finalists: ResearchPlanPolicy[];
    globalPolicyId: string;
    selector: ResearchSelectorModel;
};

export type ResearchDevelopmentCampaign = {
    schemaVersion: typeof RESEARCH_DEVELOPMENT_CAMPAIGN_SCHEMA_VERSION;
    phase: DevelopmentPhase;
    sourceGitCommit: string;
    optimizerSourceGitCommit: string;
    generatedAt: string;
    selectionRule: string;
    priorTechnicalGate: {
        gatePath: string;
        gateSha256: string;
        status: "PASSED_TECHNICAL_ONLY_NO_OUTCOMES_INSPECTED";
        phase: "development-phase1" | "development-phase2";
        authorizedNextPhase: "development-phase2" | "development-phase3";
    } | null;
    maxTicks: typeof RESEARCH_DEVELOPMENT_MAX_TICKS;
    engineSeedBase: typeof RESEARCH_DEVELOPMENT_SEED_BASE;
    outcomeAccess: "sealed-private-events";
    hardDiagnosticLaunchCap: typeof RESEARCH_DEVELOPMENT_HARD_CAP;
    launchedGameCount: number;
    familyCount: number;
    optimizerRunCount: number;
    roleManifestSha256: string;
    roleCommitmentSha256: string;
    splitCommitmentSha256: string;
    sourcePopulationCommitmentSha256: string;
    optimizerArtifacts: Array<{
        optimizerRunIndex: number;
        artifactPath: string;
        artifactSha256: string;
        sourceGitCommit: string;
    }>;
    selectedFamilies: Array<{
        familyId: string;
        diagnosticRole: "primary" | "substitute";
        substituteOrder: number | null;
        descriptors: Record<string, unknown>;
        representativeSha256: string;
    }>;
    selectedOptimizerRuns: number[];
    shards: Array<{
        shardIndex: number;
        planFile: string;
        planSha256: string;
        runId: string;
        familyId: string;
        optimizerRunIndex: number;
        optimizerArtifactSha256: string;
        seedBlockIndex: number;
        seedOrdinal: number;
        freshProcessRepeat: number;
        globalPolicyId: string;
        conditionedPolicyId: string;
        conditionedSwitchedFromGlobal: boolean;
        conditionedPredictedMargin: number;
        launchedGameCount: 4;
    }>;
};

const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const GIT_COMMIT_PATTERN = /^[0-9a-f]{40}$/;

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null && !Array.isArray(value);

const deterministicRank = (domain: string, value: string): string =>
    crypto.createHash("sha256")
        .update(["chrono-divide-development-diagnostic-v1", domain, value].join("\0"))
        .digest("hex");

const rankTargets = (domain: string, targets: DevelopmentTarget[]): DevelopmentTarget[] =>
    [...targets].sort((left, right) =>
        deterministicRank(domain, left.familyId).localeCompare(deterministicRank(domain, right.familyId)),
    );

const rankRuns = (domain: string, optimizerRunIndices: number[]): number[] =>
    [...optimizerRunIndices].sort((left, right) =>
        deterministicRank(domain, String(left)).localeCompare(deterministicRank(domain, String(right))),
    );

const validateDesignInputs = (targets: DevelopmentTarget[], optimizerRunIndices: number[]): void => {
    const primary = targets.filter(({ diagnosticRole }) => diagnosticRole === "primary");
    const substitutes = targets.filter(({ diagnosticRole }) => diagnosticRole === "substitute");
    if (
        targets.length !== 12 ||
        primary.length !== 10 ||
        substitutes.length !== 2 ||
        new Set(targets.map(({ familyId }) => familyId)).size !== targets.length
    ) {
        throw new Error("Development diagnostic requires exactly ten primary and two unique substitute families");
    }
    if (
        substitutes.map(({ substituteOrder }) => substituteOrder).sort().join(",") !== "1,2" ||
        primary.some(({ substituteOrder }) => substituteOrder !== null)
    ) {
        throw new Error("Development substitute ordering is not the frozen 1,2 sequence");
    }
    if (
        optimizerRunIndices.length !== 5 ||
        [...optimizerRunIndices].sort((left, right) => left - right).join(",") !== "0,1,2,3,4"
    ) {
        throw new Error("Development diagnostic requires finalized optimizer runs 0,1,2,3,4");
    }
};

export const buildDevelopmentShardDesign = (
    phase: DevelopmentPhase,
    targets: DevelopmentTarget[],
    optimizerRunIndices: number[],
): DevelopmentShardDesign[] => {
    validateDesignInputs(targets, optimizerRunIndices);
    const primary = targets.filter(({ diagnosticRole }) => diagnosticRole === "primary");
    const families = phase === "development-phase1"
        ? rankTargets("phase1-family", primary).slice(0, 4)
        : phase === "development-phase2"
            ? rankTargets("phase2-family", targets)
            : rankTargets("phase3-family", primary);
    const runs = phase === "development-phase1"
        ? rankRuns("phase1-run", optimizerRunIndices).slice(0, 2)
        : phase === "development-phase2"
            ? rankRuns("phase2-run", optimizerRunIndices).slice(0, 1)
            : [...optimizerRunIndices].sort((left, right) => left - right);
    const seedOrdinals = phase === "development-phase1" ? [0] : phase === "development-phase2" ? [0, 1] : [0, 1, 2, 3];
    const repeats = phase === "development-phase1" ? [0, 1] : [0];
    const phaseOffset = phase === "development-phase1" ? 1_000 : phase === "development-phase2" ? 2_000 : 3_000;
    const design: DevelopmentShardDesign[] = [];
    for (let familyOrdinal = 0; familyOrdinal < families.length; familyOrdinal++) {
        for (const optimizerRunIndex of runs) {
            for (const seedOrdinal of seedOrdinals) {
                for (const freshProcessRepeat of repeats) {
                    design.push({
                        shardIndex: design.length,
                        familyId: families[familyOrdinal].familyId,
                        optimizerRunIndex,
                        seedBlockIndex: phaseOffset + familyOrdinal * seedOrdinals.length + seedOrdinal,
                        seedOrdinal,
                        freshProcessRepeat,
                    });
                }
            }
        }
    }
    const expectedShardCount = phase === "development-phase1" ? 16 : phase === "development-phase2" ? 24 : 200;
    if (design.length !== expectedShardCount || design.length * 4 > RESEARCH_DEVELOPMENT_HARD_CAP) {
        throw new Error(`Development ${phase} design does not match its frozen shard allocation`);
    }
    return design;
};

const parseStructuralDescriptors = (
    familyId: string,
    descriptors: Record<string, unknown>,
): ResearchStructuralDescriptors => {
    const area = descriptors.area;
    const width = descriptors.width;
    const height = descriptors.height;
    const startCount = descriptors.startCount;
    if (
        typeof area !== "number" ||
        !Number.isFinite(area) ||
        area <= 0 ||
        typeof width !== "number" ||
        !Number.isFinite(width) ||
        width <= 0 ||
        typeof height !== "number" ||
        !Number.isFinite(height) ||
        height <= 0 ||
        !Number.isSafeInteger(startCount) ||
        (startCount as number) <= 0
    ) {
        throw new Error(`Development family ${familyId} lacks the frozen positive structural descriptors`);
    }
    return { area, width, height, startCount: startCount as number };
};

const readDevelopmentRole = (repoRoot: string, privateRoleRoot: string): DevelopmentRoleData => {
    const publicPath = path.join(repoRoot, "research", "artifacts", "family_role_commitments_v1.json");
    const publicValue = JSON.parse(fs.readFileSync(publicPath, "utf8")) as Record<string, unknown>;
    if (
        publicValue.status !== "FROZEN_FAMILY_ROLE_COMMITMENTS_IDENTITIES_PRIVATE" ||
        !isRecord(publicValue.privateArtifacts) ||
        !isRecord(publicValue.roleCommitments)
    ) {
        throw new Error("Public family-role commitment artifact is incomplete");
    }
    const developmentArtifact = publicValue.privateArtifacts.development;
    if (
        !isRecord(developmentArtifact) ||
        developmentArtifact.file !== "development-families.json" ||
        typeof developmentArtifact.sha256 !== "string"
    ) {
        throw new Error("Public development-role commitment is invalid");
    }
    const privatePath = path.resolve(privateRoleRoot, "development-families.json");
    if (path.dirname(privatePath) !== path.resolve(privateRoleRoot)) {
        throw new Error("Resolved development-role path escapes the private role root");
    }
    const fileSha256 = sha256File(privatePath);
    if (fileSha256 !== developmentArtifact.sha256) {
        throw new Error("Private development manifest bytes differ from the public commitment");
    }
    const privateValue = JSON.parse(fs.readFileSync(privatePath, "utf8")) as Record<string, unknown>;
    if (
        privateValue.status !== "PRIVATE_FAMILY_ROLE_MANIFEST_NO_POLICY_OUTCOMES" ||
        privateValue.role !== "development" ||
        privateValue.outcomeBlind !== true ||
        !Array.isArray(privateValue.targets)
    ) {
        throw new Error("Private development manifest has the wrong status, role, or target schema");
    }
    const targets = privateValue.targets.map((raw, index): DevelopmentTarget => {
        if (
            !isRecord(raw) ||
            typeof raw.familyId !== "string" ||
            !isRecord(raw.representative) ||
            !isRecord(raw.descriptors) ||
            (raw.diagnosticRole !== "primary" && raw.diagnosticRole !== "substitute")
        ) {
            throw new Error(`Development target ${index} has an invalid schema`);
        }
        const representativePath = raw.representative.path;
        const representativeSha256 = raw.representative.sha256;
        if (
            typeof representativePath !== "string" ||
            typeof representativeSha256 !== "string" ||
            !SHA256_PATTERN.test(representativeSha256)
        ) {
            throw new Error(`Development target ${index} has an invalid representative`);
        }
        const absoluteMapPath = path.resolve(repoRoot, representativePath);
        const relativeMapPath = path.relative(path.resolve(repoRoot), absoluteMapPath);
        if (relativeMapPath.startsWith("..") || path.isAbsolute(relativeMapPath)) {
            throw new Error(`Development target ${index} map path escapes the repository`);
        }
        if (sha256File(absoluteMapPath) !== representativeSha256) {
            throw new Error(`Development target ${index} committed map bytes differ`);
        }
        const substituteOrder = raw.substituteOrder;
        if (
            (raw.diagnosticRole === "primary" && substituteOrder !== null) ||
            (raw.diagnosticRole === "substitute" && substituteOrder !== 1 && substituteOrder !== 2)
        ) {
            throw new Error(`Development target ${index} has an invalid diagnostic substitution role`);
        }
        parseStructuralDescriptors(raw.familyId, raw.descriptors);
        return {
            familyId: raw.familyId,
            representative: { path: representativePath, sha256: representativeSha256 },
            descriptors: raw.descriptors,
            diagnosticRole: raw.diagnosticRole,
            substituteOrder: substituteOrder as number | null,
        };
    });
    const roleCommitmentSha256 = privateValue.roleCommitmentSha256;
    const splitCommitmentSha256 = privateValue.splitCommitmentSha256;
    const sourcePopulationCommitmentSha256 = privateValue.sourcePopulationCommitmentSha256;
    if (
        targets.length !== privateValue.targetCount ||
        typeof roleCommitmentSha256 !== "string" ||
        roleCommitmentSha256 !== publicValue.roleCommitments.development ||
        typeof splitCommitmentSha256 !== "string" ||
        splitCommitmentSha256 !== publicValue.splitCommitmentSha256 ||
        typeof sourcePopulationCommitmentSha256 !== "string" ||
        sourcePopulationCommitmentSha256 !== publicValue.sourcePopulationCommitmentSha256
    ) {
        throw new Error("Development role commitment chain is inconsistent");
    }
    validateDesignInputs(targets, [0, 1, 2, 3, 4]);
    return {
        fileSha256,
        roleCommitmentSha256,
        splitCommitmentSha256,
        sourcePopulationCommitmentSha256,
        targets,
    };
};

const parseOptimizerArtifact = (artifactPath: string): LoadedOptimizerArtifact => {
    const value = JSON.parse(fs.readFileSync(artifactPath, "utf8")) as Record<string, unknown>;
    if (
        value.schemaVersion !== 1 ||
        !Number.isSafeInteger(value.optimizerRunIndex) ||
        (value.optimizerRunIndex as number) < 0 ||
        (value.optimizerRunIndex as number) > 4 ||
        typeof value.sourceGitCommit !== "string" ||
        !GIT_COMMIT_PATTERN.test(value.sourceGitCommit) ||
        typeof value.globalPolicyId !== "string" ||
        !SHA256_PATTERN.test(value.globalPolicyId) ||
        !Array.isArray(value.finalists) ||
        value.finalists.length !== 6 ||
        !isRecord(value.selector)
    ) {
        throw new Error(`Optimizer artifact ${artifactPath} has an invalid schema`);
    }
    const finalists = value.finalists.map((raw, index): ResearchPlanPolicy => {
        if (!isRecord(raw) || typeof raw.policyId !== "string") {
            throw new Error(`Optimizer artifact finalist ${index} has an invalid schema`);
        }
        const policy = parseResearchPolicy(raw.policy);
        if (researchPolicySha256(policy) !== raw.policyId) {
            throw new Error(`Optimizer artifact finalist ${index} fails its canonical policy hash`);
        }
        return { policyId: raw.policyId, policy };
    });
    const finalistIds = new Set(finalists.map(({ policyId }) => policyId));
    const selector = value.selector as unknown as ResearchSelectorModel;
    if (
        finalistIds.size !== 6 ||
        !finalistIds.has(value.globalPolicyId) ||
        selector.globalPolicyId !== value.globalPolicyId ||
        !Array.isArray(selector.policyModels) ||
        selector.policyModels.length !== 6 ||
        selector.policyModels.some(({ policyId }) => !finalistIds.has(policyId))
    ) {
        throw new Error(`Optimizer artifact ${artifactPath} selector and finalist commitments disagree`);
    }
    return {
        artifactPath,
        artifactSha256: sha256File(artifactPath),
        schemaVersion: 1,
        optimizerRunIndex: value.optimizerRunIndex as number,
        sourceGitCommit: value.sourceGitCommit,
        finalists,
        globalPolicyId: value.globalPolicyId,
        selector,
    };
};

const loadOptimizerArtifacts = (artifactRoot: string): LoadedOptimizerArtifact[] => {
    const artifacts = [0, 1, 2, 3, 4].map((optimizerRunIndex) => {
        const artifactPath = path.resolve(artifactRoot, `run-${optimizerRunIndex}-optimizer-artifact.json`);
        if (path.dirname(artifactPath) !== path.resolve(artifactRoot)) {
            throw new Error("Resolved optimizer artifact path escapes the artifact root");
        }
        const artifact = parseOptimizerArtifact(artifactPath);
        if (artifact.optimizerRunIndex !== optimizerRunIndex) {
            throw new Error(`Optimizer artifact filename and run index disagree for run ${optimizerRunIndex}`);
        }
        return artifact;
    });
    if (new Set(artifacts.map(({ sourceGitCommit }) => sourceGitCommit)).size !== 1) {
        throw new Error("Finalized optimizer artifacts do not share one training source commit");
    }
    return artifacts;
};

const gitRoot = (): string => execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();

const requiredPath = (name: string): string => {
    const value = process.env[name];
    if (!value) {
        throw new Error(`${name} is required`);
    }
    return path.resolve(value);
};

export const validatePriorTechnicalGate = (
    requestedPhase: DevelopmentPhase,
    value: unknown,
    gatePath: string,
    gateSha256: string,
): ResearchDevelopmentCampaign["priorTechnicalGate"] => {
    if (requestedPhase === "development-phase1") {
        if (value !== null) {
            throw new Error("Phase 1 must not inherit a prior technical gate");
        }
        return null;
    }
    if (!isRecord(value)) {
        throw new Error(`${requestedPhase} requires a prior technical gate artifact`);
    }
    const expectedPriorPhase = requestedPhase === "development-phase2"
        ? "development-phase1"
        : "development-phase2";
    const expectedLaunches = expectedPriorPhase === "development-phase1" ? 64 : 96;
    if (
        !path.isAbsolute(gatePath) ||
        !SHA256_PATTERN.test(gateSha256) ||
        (value.schemaVersion !== 1 && value.schemaVersion !== 2) ||
        value.status !== "PASSED_TECHNICAL_ONLY_NO_OUTCOMES_INSPECTED" ||
        value.phase !== expectedPriorPhase ||
        value.authorizedNextPhase !== requestedPhase ||
        value.schedulerAccount !== "pi_jss233" ||
        value.technicalFailures !== 0 ||
        value.sealedSummaryViolations !== 0 ||
        value.requestedLaunches !== expectedLaunches ||
        value.accountedLaunches !== expectedLaunches ||
        !Array.isArray(value.outcomeFieldsEmitted) ||
        value.outcomeFieldsEmitted.length !== 0
    ) {
        throw new Error(`Prior technical gate does not authorize ${requestedPhase}`);
    }
    if (expectedPriorPhase === "development-phase1" && value.repeatIdentityPassed !== true) {
        throw new Error("Phase-1 prior gate lacks the required fresh-process identity pass");
    }
    return {
        gatePath,
        gateSha256,
        status: "PASSED_TECHNICAL_ONLY_NO_OUTCOMES_INSPECTED",
        phase: expectedPriorPhase,
        authorizedNextPhase: requestedPhase,
    };
};

const loadPriorTechnicalGate = (
    phase: DevelopmentPhase,
): ResearchDevelopmentCampaign["priorTechnicalGate"] => {
    if (phase === "development-phase1") {
        if (process.env.PRIOR_TECHNICAL_GATE) {
            throw new Error("Phase 1 refuses an unexpected PRIOR_TECHNICAL_GATE");
        }
        return validatePriorTechnicalGate(phase, null, "", "");
    }
    const gatePath = requiredPath("PRIOR_TECHNICAL_GATE");
    return validatePriorTechnicalGate(
        phase,
        JSON.parse(fs.readFileSync(gatePath, "utf8")) as unknown,
        gatePath,
        sha256File(gatePath),
    );
};

const phaseFromEnvironment = (): DevelopmentPhase => {
    const phase = process.env.RESEARCH_DEVELOPMENT_PHASE;
    if (
        phase !== "development-phase1" &&
        phase !== "development-phase2" &&
        phase !== "development-phase3"
    ) {
        throw new Error("RESEARCH_DEVELOPMENT_PHASE must be development-phase1/2/3");
    }
    return phase;
};

const main = async (): Promise<void> => {
    const repoRoot = gitRoot();
    const driverRoot = path.join(repoRoot, "packages", "chronodivide-bot-driver");
    if (path.resolve(process.cwd()) !== driverRoot) {
        throw new Error(`Development plan generator must start in ${driverRoot}`);
    }
    if (!process.env.BASELINE_PACKAGE_ROOT || process.env.REQUIRE_EXTERNAL_BASELINE !== "true") {
        throw new Error("Set BASELINE_PACKAGE_ROOT and REQUIRE_EXTERNAL_BASELINE=true before plan generation");
    }
    const privateRoleRoot = requiredPath("RESEARCH_PRIVATE_ROLE_ROOT");
    const artifactRoot = requiredPath("OPTIMIZER_ARTIFACT_ROOT");
    const outRoot = requiredPath("OUT_ROOT");
    if (fs.existsSync(outRoot)) {
        throw new Error(`Refusing to reuse existing OUT_ROOT ${outRoot}`);
    }
    const phase = phaseFromEnvironment();
    const priorTechnicalGate = loadPriorTechnicalGate(phase);
    const role = readDevelopmentRole(repoRoot, privateRoleRoot);
    const artifacts = loadOptimizerArtifacts(artifactRoot);
    const artifactByRun = new Map(artifacts.map((artifact) => [artifact.optimizerRunIndex, artifact]));
    const design = buildDevelopmentShardDesign(
        phase,
        role.targets,
        artifacts.map(({ optimizerRunIndex }) => optimizerRunIndex),
    );
    const baselineFactory = await loadBaselineFactory(path.join(repoRoot, "packages", "chronodivide-bot"));
    const generationManifest = createExperimentManifest({
        runId: `plan-${phase}`,
        mixDir: path.join(driverRoot, "data"),
        maps: [],
        effectiveConfig: {
            phase,
            outcomeAccess: "sealed-private-events",
            hardDiagnosticLaunchCap: RESEARCH_DEVELOPMENT_HARD_CAP,
        },
        baseline: baselineFactory.descriptor,
        gameSeedBase: RESEARCH_DEVELOPMENT_SEED_BASE,
    });
    if (
        generationManifest.source.gitBranch !== "main" ||
        generationManifest.source.trackedDirty !== false ||
        !generationManifest.source.gitCommit
    ) {
        throw new Error("Development plan generation requires a clean main-branch source checkout");
    }
    if (
        generationManifest.software.baseline.kind !== "external-package" ||
        generationManifest.software.baseline.trackedDirty !== false ||
        !generationManifest.software.baseline.gitCommit ||
        !generationManifest.software.baseline.runtimeTree.sha256 ||
        !generationManifest.software.gameApiRuntimeTree.sha256 ||
        !generationManifest.software.packageLockSha256
    ) {
        throw new Error("Development plan generation could not bind clean baseline and runtime dependencies");
    }

    fs.mkdirSync(outRoot, { recursive: false, mode: 0o700 });
    const plansRoot = path.join(outRoot, "plans");
    fs.mkdirSync(plansRoot, { mode: 0o700 });
    const targetsById = new Map(role.targets.map((target) => [target.familyId, target]));
    const shards: ResearchDevelopmentCampaign["shards"] = [];
    const sourceShort = generationManifest.source.gitCommit.slice(0, 10);
    for (const shardDesign of design) {
        const target = targetsById.get(shardDesign.familyId);
        const artifact = artifactByRun.get(shardDesign.optimizerRunIndex);
        if (!target || !artifact) {
            throw new Error(`Missing target or optimizer artifact for shard ${shardDesign.shardIndex}`);
        }
        const descriptor = parseStructuralDescriptors(target.familyId, target.descriptors);
        const conditioned = selectConditionedPolicy(artifact.selector, descriptor);
        const policiesById = new Map(artifact.finalists.map((policy) => [policy.policyId, policy]));
        const globalPolicy = policiesById.get(artifact.globalPolicyId);
        const conditionedPolicy = policiesById.get(conditioned.policyId);
        if (!globalPolicy || !conditionedPolicy) {
            throw new Error(`Shard ${shardDesign.shardIndex} selector references a non-finalist policy`);
        }
        const policies = [...new Map(
            [globalPolicy, conditionedPolicy].map((policy) => [policy.policyId, policy]),
        ).values()];
        const requestedEngineSeed = derivePairedEngineSeed(
            RESEARCH_DEVELOPMENT_SEED_BASE,
            shardDesign.seedBlockIndex,
        );
        const runId = [
            phase.replace("development-", "dev-"),
            `f${shardDesign.familyId.replace(/^mf_/, "")}`,
            `r${shardDesign.optimizerRunIndex}`,
            `b${shardDesign.seedBlockIndex}`,
            `q${shardDesign.freshProcessRepeat}`,
            sourceShort,
        ].join("-");
        const episodes = RESEARCH_DEVELOPMENT_METHODS.flatMap((methodId) => {
            const policy = methodId === "global" ? globalPolicy : conditionedPolicy;
            return ([0, 1] as const).map((candidateSlot) => ({
                episodeId: `${methodId}-b${shardDesign.seedBlockIndex}-q${shardDesign.freshProcessRepeat}-s${candidateSlot}`,
                familyId: target.familyId,
                policyId: policy.policyId,
                methodId,
                seedBlockIndex: shardDesign.seedBlockIndex,
                requestedEngineSeed,
                candidateSlot,
            }));
        });
        const plan: ResearchRunPlan = parseResearchRunPlan({
            schemaVersion: 1,
            runId,
            role: "development",
            purpose: phase === "development-phase3" ? "development-evaluation" : "development-qc",
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
            engineSeedBase: RESEARCH_DEVELOPMENT_SEED_BASE,
            candidateCountry: Countries.IRAQ,
            baselineCountry: Countries.IRAQ,
            maxTicks: RESEARCH_DEVELOPMENT_MAX_TICKS,
            policies,
            episodes,
        });
        const planFile = path.join(plansRoot, `shard-${String(shardDesign.shardIndex).padStart(3, "0")}.json`);
        fs.writeFileSync(planFile, JSON.stringify(plan, null, 2), { flag: "wx", mode: 0o600 });
        shards.push({
            ...shardDesign,
            planFile,
            planSha256: sha256File(planFile),
            runId,
            optimizerArtifactSha256: artifact.artifactSha256,
            globalPolicyId: globalPolicy.policyId,
            conditionedPolicyId: conditionedPolicy.policyId,
            conditionedSwitchedFromGlobal: conditioned.switchedFromGlobal,
            conditionedPredictedMargin: conditioned.predictedMargin,
            launchedGameCount: 4,
        });
    }
    const selectedFamilyIds = new Set(design.map(({ familyId }) => familyId));
    const selectedOptimizerRuns = [...new Set(design.map(({ optimizerRunIndex }) => optimizerRunIndex))]
        .sort((left, right) => left - right);
    const campaign: ResearchDevelopmentCampaign = {
        schemaVersion: RESEARCH_DEVELOPMENT_CAMPAIGN_SCHEMA_VERSION,
        phase,
        sourceGitCommit: generationManifest.source.gitCommit,
        optimizerSourceGitCommit: artifacts[0].sourceGitCommit,
        generatedAt: new Date().toISOString(),
        selectionRule:
            "Frozen SHA-256 ranks select phase-1 families/runs and the phase-2 run; phase 3 uses all ten primary families and all five optimizer runs.",
        priorTechnicalGate,
        maxTicks: RESEARCH_DEVELOPMENT_MAX_TICKS,
        engineSeedBase: RESEARCH_DEVELOPMENT_SEED_BASE,
        outcomeAccess: "sealed-private-events",
        hardDiagnosticLaunchCap: RESEARCH_DEVELOPMENT_HARD_CAP,
        launchedGameCount: shards.reduce((total, shard) => total + shard.launchedGameCount, 0),
        familyCount: selectedFamilyIds.size,
        optimizerRunCount: selectedOptimizerRuns.length,
        roleManifestSha256: role.fileSha256,
        roleCommitmentSha256: role.roleCommitmentSha256,
        splitCommitmentSha256: role.splitCommitmentSha256,
        sourcePopulationCommitmentSha256: role.sourcePopulationCommitmentSha256,
        optimizerArtifacts: artifacts.map((artifact) => ({
            optimizerRunIndex: artifact.optimizerRunIndex,
            artifactPath: artifact.artifactPath,
            artifactSha256: artifact.artifactSha256,
            sourceGitCommit: artifact.sourceGitCommit,
        })),
        selectedFamilies: role.targets.filter(({ familyId }) => selectedFamilyIds.has(familyId)).map((target) => ({
            familyId: target.familyId,
            diagnosticRole: target.diagnosticRole,
            substituteOrder: target.substituteOrder,
            descriptors: target.descriptors,
            representativeSha256: target.representative.sha256,
        })),
        selectedOptimizerRuns,
        shards,
    };
    const expectedLaunches = phase === "development-phase1" ? 64 : phase === "development-phase2" ? 96 : 800;
    if (campaign.launchedGameCount !== expectedLaunches) {
        throw new Error(`Generated ${campaign.launchedGameCount} launches, expected frozen count ${expectedLaunches}`);
    }
    const campaignPath = path.join(outRoot, "campaign.json");
    fs.writeFileSync(campaignPath, JSON.stringify(campaign, null, 2), { flag: "wx", mode: 0o600 });
    fs.writeFileSync(path.join(outRoot, "plan-files.txt"), `${shards.map(({ planFile }) => planFile).join("\n")}\n`, {
        flag: "wx",
        mode: 0o600,
    });
    console.log(JSON.stringify({
        campaignPath,
        campaignSha256: sha256File(campaignPath),
        phase,
        sourceGitCommit: campaign.sourceGitCommit,
        optimizerSourceGitCommit: campaign.optimizerSourceGitCommit,
        familyCount: campaign.familyCount,
        optimizerRunCount: campaign.optimizerRunCount,
        shardCount: campaign.shards.length,
        launchedGameCount: campaign.launchedGameCount,
        outcomeAccess: campaign.outcomeAccess,
    }));
};

const invokedModuleUrl = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (import.meta.url === invokedModuleUrl) {
    main().catch((error) => {
        console.error(error);
        process.exitCode = 1;
    });
}
