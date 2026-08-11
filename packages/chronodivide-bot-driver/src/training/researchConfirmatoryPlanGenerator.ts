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
    serializeResearchRunPlan,
    sha256File,
    sourceRuntimeCommitmentSha256,
} from "./researchPlanRunner.js";
import { DEFAULT_RESEARCH_POLICY, parseResearchPolicy, researchPolicySha256 } from "./researchPolicy.js";

export const RESEARCH_CONFIRMATORY_SCHEMA_VERSION = 1 as const;
export const RESEARCH_CONFIRMATORY_ENGINE_SEED_BASE = 60_000_000 as const;
export const RESEARCH_CONFIRMATORY_MAX_TICKS = 18_000 as const;
export const RESEARCH_CONFIRMATORY_FAMILY_COUNT = 16 as const;
export const RESEARCH_CONFIRMATORY_BLOCKS_PER_FAMILY = 8 as const;
export const RESEARCH_CONFIRMATORY_SHARD_COUNT = 128 as const;
export const RESEARCH_CONFIRMATORY_LAUNCH_COUNT = 512 as const;
export const RESEARCH_CONFIRMATORY_TEST_ARTIFACT_SHA256 =
    "63c22710de11e3490260fb78ed9246456eaf0bca9dec6bffdf266b7e5cf4e8b2" as const;
export const RESEARCH_CONFIRMATORY_TEST_ROLE_COMMITMENT_SHA256 =
    "2f6dcce3c9021f050bc84eae69ea12b9fd094af8b78bf0567724ac4a156f4716" as const;
export const RESEARCH_CONFIRMATORY_CHAMPION_ARTIFACT_SHA256 =
    "40a53c142fa30725ea5d22032d4b6dfcda4f358e15e1b8d36ac6a102b76e9ee1" as const;
export const RESEARCH_CONFIRMATORY_CHAMPION_POLICY_ID =
    "ab0071009cbd5f1fc9e2f1a76a562455a0ebeacf77dac1cd9c13b9fc6374203f" as const;
export const RESEARCH_CONFIRMATORY_DEFAULT_POLICY_ID =
    "8fc9e46aba10fb84d7283e16a4ccde12d3e3e429c29d5caca5b42dd5a25cef4a" as const;
export const RESEARCH_CONFIRMATORY_DEVELOPMENT_SHA256 =
    "2d07f8d0bec8befb470342081e4753d0e910d7aa211873f8ea11aed3ecd0202d" as const;

export type ConfirmatoryTarget = {
    familyId: string;
    representative: { path: string; sha256: string };
    descriptors: Record<string, unknown>;
};

type LoadedTestRole = {
    fileSha256: string;
    roleCommitmentSha256: string;
    splitCommitmentSha256: string;
    sourcePopulationCommitmentSha256: string;
    targets: ConfirmatoryTarget[];
};

export type ResearchConfirmatoryCampaign = {
    schemaVersion: typeof RESEARCH_CONFIRMATORY_SCHEMA_VERSION;
    kind: "method-v2-confirmatory";
    sourceGitCommit: string;
    generatedAt: string;
    outcomeAccess: "sealed-private-events";
    designPath: string;
    designSha256: string;
    developmentUnblindingPath: string;
    developmentUnblindingSha256: typeof RESEARCH_CONFIRMATORY_DEVELOPMENT_SHA256;
    sourceRuntimeSha256: string;
    baselineGitCommit: string;
    baselineRuntimeSha256: string;
    gameApiRuntimeSha256: string;
    packageLockSha256: string;
    roleManifestSha256: typeof RESEARCH_CONFIRMATORY_TEST_ARTIFACT_SHA256;
    roleCommitmentSha256: typeof RESEARCH_CONFIRMATORY_TEST_ROLE_COMMITMENT_SHA256;
    splitCommitmentSha256: string;
    sourcePopulationCommitmentSha256: string;
    championArtifactPath: string;
    championArtifactSha256: typeof RESEARCH_CONFIRMATORY_CHAMPION_ARTIFACT_SHA256;
    championPolicyId: typeof RESEARCH_CONFIRMATORY_CHAMPION_POLICY_ID;
    defaultPolicyId: typeof RESEARCH_CONFIRMATORY_DEFAULT_POLICY_ID;
    engineSeedBase: typeof RESEARCH_CONFIRMATORY_ENGINE_SEED_BASE;
    maxTicks: typeof RESEARCH_CONFIRMATORY_MAX_TICKS;
    familyCount: typeof RESEARCH_CONFIRMATORY_FAMILY_COUNT;
    blocksPerFamily: typeof RESEARCH_CONFIRMATORY_BLOCKS_PER_FAMILY;
    shardCount: typeof RESEARCH_CONFIRMATORY_SHARD_COUNT;
    launchedGameCount: typeof RESEARCH_CONFIRMATORY_LAUNCH_COUNT;
    selectedFamilies: Array<{ familyId: string; representativeSha256: string; rankSha256: string }>;
    policies: ResearchPlanPolicy[];
    shards: Array<{
        shardIndex: number;
        planFile: string;
        planSha256: string;
        runId: string;
        familyId: string;
        familyRank: number;
        seedOrdinal: number;
        seedBlockIndex: number;
        launchedGameCount: 4;
    }>;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null && !Array.isArray(value);

const requiredPath = (name: string): string => {
    const value = process.env[name];
    if (!value) throw new Error(`${name} is required`);
    return path.resolve(value);
};

const gitRoot = (): string => execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();

const familyRankSha256 = (familyId: string): string => crypto.createHash("sha256")
    .update(`chrono-divide-confirmatory-v1\0${familyId}`)
    .digest("hex");

const loadDesign = (designPath: string): void => {
    const value = JSON.parse(fs.readFileSync(designPath, "utf8")) as Record<string, unknown>;
    if (
        value.schemaVersion !== 1 ||
        value.status !== "FROZEN_BEFORE_TEST_IDENTITY_ACCESS" ||
        value.engineSeedBase !== RESEARCH_CONFIRMATORY_ENGINE_SEED_BASE ||
        value.familyCount !== RESEARCH_CONFIRMATORY_FAMILY_COUNT ||
        value.blocksPerFamily !== RESEARCH_CONFIRMATORY_BLOCKS_PER_FAMILY ||
        value.shardCount !== RESEARCH_CONFIRMATORY_SHARD_COUNT ||
        value.launchedGameCount !== RESEARCH_CONFIRMATORY_LAUNCH_COUNT ||
        value.testArtifactSha256 !== RESEARCH_CONFIRMATORY_TEST_ARTIFACT_SHA256 ||
        value.testRoleCommitmentSha256 !== RESEARCH_CONFIRMATORY_TEST_ROLE_COMMITMENT_SHA256 ||
        value.championArtifactSha256 !== RESEARCH_CONFIRMATORY_CHAMPION_ARTIFACT_SHA256 ||
        value.championPolicyId !== RESEARCH_CONFIRMATORY_CHAMPION_POLICY_ID ||
        value.defaultPolicyId !== RESEARCH_CONFIRMATORY_DEFAULT_POLICY_ID ||
        value.developmentUnblindingSha256 !== RESEARCH_CONFIRMATORY_DEVELOPMENT_SHA256
    ) {
        throw new Error("Confirmatory design artifact differs from the frozen public design");
    }
};

const loadTestRole = (repoRoot: string, privateRoot: string): LoadedTestRole => {
    const publicPath = path.join(repoRoot, "research", "artifacts", "family_role_commitments_v1.json");
    const publicValue = JSON.parse(fs.readFileSync(publicPath, "utf8")) as Record<string, unknown>;
    if (
        publicValue.status !== "FROZEN_FAMILY_ROLE_COMMITMENTS_IDENTITIES_PRIVATE" ||
        !isRecord(publicValue.privateArtifacts) ||
        !isRecord(publicValue.roleCommitments)
    ) throw new Error("Public family-role commitment artifact is invalid");
    const descriptor = publicValue.privateArtifacts.test;
    if (!isRecord(descriptor) || descriptor.file !== "test-families.json" || descriptor.sha256 !== RESEARCH_CONFIRMATORY_TEST_ARTIFACT_SHA256) {
        throw new Error("Public test-role artifact descriptor differs from the frozen commitment");
    }
    const privatePath = path.resolve(privateRoot, "test-families.json");
    if (sha256File(privatePath) !== RESEARCH_CONFIRMATORY_TEST_ARTIFACT_SHA256) {
        throw new Error("Private test-role bytes differ from the frozen commitment");
    }
    const value = JSON.parse(fs.readFileSync(privatePath, "utf8")) as Record<string, unknown>;
    if (
        value.status !== "PRIVATE_FAMILY_ROLE_MANIFEST_NO_POLICY_OUTCOMES" ||
        value.role !== "test" || value.outcomeBlind !== true || value.targetCount !== 16 ||
        value.roleCommitmentSha256 !== RESEARCH_CONFIRMATORY_TEST_ROLE_COMMITMENT_SHA256 ||
        !Array.isArray(value.targets) || value.targets.length !== 16
    ) throw new Error("Private test role has an invalid frozen schema");
    const targets = value.targets.map((raw, index): ConfirmatoryTarget => {
        if (!isRecord(raw) || typeof raw.familyId !== "string" || !isRecord(raw.representative) || !isRecord(raw.descriptors)) {
            throw new Error(`Private test target ${index} is malformed`);
        }
        const mapPath = raw.representative.path;
        const mapSha256 = raw.representative.sha256;
        if (typeof mapPath !== "string" || typeof mapSha256 !== "string") throw new Error(`Private test target ${index} representative is malformed`);
        const absoluteMap = path.resolve(repoRoot, mapPath);
        const relativeMap = path.relative(repoRoot, absoluteMap);
        if (relativeMap.startsWith("..") || path.isAbsolute(relativeMap) || sha256File(absoluteMap) !== mapSha256) {
            throw new Error(`Private test target ${index} map path or bytes differ`);
        }
        return { familyId: raw.familyId, representative: { path: mapPath, sha256: mapSha256 }, descriptors: raw.descriptors };
    });
    if (new Set(targets.map(({ familyId }) => familyId)).size !== 16) throw new Error("Private test families are duplicated");
    if (
        typeof value.splitCommitmentSha256 !== "string" || value.splitCommitmentSha256 !== publicValue.splitCommitmentSha256 ||
        typeof value.sourcePopulationCommitmentSha256 !== "string" || value.sourcePopulationCommitmentSha256 !== publicValue.sourcePopulationCommitmentSha256 ||
        publicValue.roleCommitments.test !== RESEARCH_CONFIRMATORY_TEST_ROLE_COMMITMENT_SHA256
    ) throw new Error("Private test role commitments differ from the public artifact");
    return {
        fileSha256: RESEARCH_CONFIRMATORY_TEST_ARTIFACT_SHA256,
        roleCommitmentSha256: RESEARCH_CONFIRMATORY_TEST_ROLE_COMMITMENT_SHA256,
        splitCommitmentSha256: value.splitCommitmentSha256,
        sourcePopulationCommitmentSha256: value.sourcePopulationCommitmentSha256,
        targets,
    };
};

const loadChampion = (artifactPath: string): ResearchPlanPolicy => {
    if (sha256File(artifactPath) !== RESEARCH_CONFIRMATORY_CHAMPION_ARTIFACT_SHA256) throw new Error("Champion artifact bytes changed");
    const value = JSON.parse(fs.readFileSync(artifactPath, "utf8")) as Record<string, unknown>;
    if (!isRecord(value.championPolicy) || value.championPolicy.policyId !== RESEARCH_CONFIRMATORY_CHAMPION_POLICY_ID) {
        throw new Error("Champion artifact schema or policy identity changed");
    }
    const policy = parseResearchPolicy(value.championPolicy.policy);
    if (researchPolicySha256(policy) !== RESEARCH_CONFIRMATORY_CHAMPION_POLICY_ID) throw new Error("Champion policy bytes changed");
    return { policyId: RESEARCH_CONFIRMATORY_CHAMPION_POLICY_ID, policy };
};

const validateDevelopmentAuthorization = (artifactPath: string): void => {
    if (sha256File(artifactPath) !== RESEARCH_CONFIRMATORY_DEVELOPMENT_SHA256) throw new Error("Development unblinding bytes changed");
    const value = JSON.parse(fs.readFileSync(artifactPath, "utf8")) as Record<string, unknown>;
    if (value.status !== "PASSED_DEVELOPMENT_SIGNAL_GATE" || value.confirmatoryEvaluationAuthorized !== true || value.unblindingCount !== 1) {
        throw new Error("Development unblinding does not authorize confirmatory evaluation");
    }
};

export const buildConfirmatoryDesign = (targets: ConfirmatoryTarget[]): Array<{
    familyId: string; familyRank: number; seedOrdinal: number; seedBlockIndex: number;
}> => {
    if (targets.length !== 16 || new Set(targets.map(({ familyId }) => familyId)).size !== 16) {
        throw new Error("Confirmatory design requires exactly sixteen unique test families");
    }
    const ranked = [...targets].sort((left, right) => familyRankSha256(left.familyId).localeCompare(familyRankSha256(right.familyId)));
    return ranked.flatMap((target, familyRank) => Array.from({ length: 8 }, (_, seedOrdinal) => ({
        familyId: target.familyId,
        familyRank,
        seedOrdinal,
        seedBlockIndex: familyRank * 8 + seedOrdinal,
    })));
};

const main = async (): Promise<void> => {
    const repoRoot = gitRoot();
    const driverRoot = path.join(repoRoot, "packages", "chronodivide-bot-driver");
    if (path.resolve(process.cwd()) !== driverRoot) throw new Error(`Confirmatory generator must start in ${driverRoot}`);
    if (!process.env.BASELINE_PACKAGE_ROOT || process.env.REQUIRE_EXTERNAL_BASELINE !== "true") throw new Error("Set the external baseline environment");
    const outRoot = requiredPath("OUT_ROOT");
    if (fs.existsSync(outRoot)) throw new Error(`Refusing to reuse OUT_ROOT ${outRoot}`);
    const privateRoleRoot = requiredPath("RESEARCH_PRIVATE_ROLE_ROOT");
    const championArtifactPath = requiredPath("CHAMPION_ARTIFACT");
    const developmentPath = requiredPath("DEVELOPMENT_UNBLINDING");
    const designPath = path.join(repoRoot, "research", "artifacts", "confirmatory_design_v1.json");
    loadDesign(designPath);
    validateDevelopmentAuthorization(developmentPath);
    const champion = loadChampion(championArtifactPath);
    const defaultPolicy: ResearchPlanPolicy = { policyId: researchPolicySha256(DEFAULT_RESEARCH_POLICY), policy: parseResearchPolicy(DEFAULT_RESEARCH_POLICY) };
    if (defaultPolicy.policyId !== RESEARCH_CONFIRMATORY_DEFAULT_POLICY_ID) throw new Error("Default policy identity changed");
    const policies = [defaultPolicy, champion];
    const baselineFactory = await loadBaselineFactory(path.join(repoRoot, "packages", "chronodivide-bot"));
    const generationManifest = createExperimentManifest({
        runId: "plan-method-v2-confirmatory",
        mixDir: path.join(driverRoot, "data"),
        maps: [],
        effectiveConfig: { role: "test", purpose: "confirmatory-evaluation", outcomeAccess: "sealed-private-events" },
        baseline: baselineFactory.descriptor,
        gameSeedBase: RESEARCH_CONFIRMATORY_ENGINE_SEED_BASE,
    });
    if (
        generationManifest.source.gitBranch !== "main" || generationManifest.source.trackedDirty !== false || !generationManifest.source.gitCommit ||
        generationManifest.software.baseline.kind !== "external-package" || generationManifest.software.baseline.trackedDirty !== false ||
        !generationManifest.software.baseline.gitCommit || !generationManifest.software.baseline.runtimeTree.sha256 ||
        !generationManifest.software.gameApiRuntimeTree.sha256 || !generationManifest.software.packageLockSha256
    ) throw new Error("Confirmatory generation requires clean committed source and runtime trees");
    // This is the first authorized private test-identity access. Keep it after
    // every public authorization and clean-source/runtime precondition.
    const role = loadTestRole(repoRoot, privateRoleRoot);
    const design = buildConfirmatoryDesign(role.targets);
    const targetById = new Map(role.targets.map((target) => [target.familyId, target]));
    fs.mkdirSync(outRoot, { recursive: false, mode: 0o700 });
    const plansRoot = path.join(outRoot, "plans");
    fs.mkdirSync(plansRoot, { mode: 0o700 });
    const sourceShort = generationManifest.source.gitCommit.slice(0, 10);
    const shards: ResearchConfirmatoryCampaign["shards"] = [];
    for (let shardIndex = 0; shardIndex < design.length; shardIndex++) {
        const row = design[shardIndex];
        const target = targetById.get(row.familyId) as ConfirmatoryTarget;
        const runId = `confirmatory-shard${String(shardIndex).padStart(3, "0")}-${sourceShort}`;
        const requestedEngineSeed = derivePairedEngineSeed(RESEARCH_CONFIRMATORY_ENGINE_SEED_BASE, row.seedBlockIndex);
        const episodes = ([{ methodId: "default", policy: defaultPolicy }, { methodId: "champion", policy: champion }] as const)
            .flatMap(({ methodId, policy }) => ([0, 1] as const).map((candidateSlot) => ({
                episodeId: `${methodId}-b${row.seedBlockIndex}-s${candidateSlot}`,
                familyId: row.familyId,
                methodId,
                policyId: policy.policyId,
                seedBlockIndex: row.seedBlockIndex,
                requestedEngineSeed,
                candidateSlot,
            })));
        const plan: ResearchRunPlan = parseResearchRunPlan({
            schemaVersion: 1, runId, role: "test", purpose: "confirmatory-evaluation",
            sourceGitCommit: generationManifest.source.gitCommit,
            sourceRuntimeSha256: sourceRuntimeCommitmentSha256(generationManifest.source.runtimeTrees),
            baselineGitCommit: generationManifest.software.baseline.gitCommit,
            baselineRuntimeSha256: generationManifest.software.baseline.runtimeTree.sha256,
            gameApiRuntimeSha256: generationManifest.software.gameApiRuntimeTree.sha256,
            packageLockSha256: generationManifest.software.packageLockSha256,
            roleManifestSha256: role.fileSha256, roleCommitmentSha256: role.roleCommitmentSha256,
            splitCommitmentSha256: role.splitCommitmentSha256,
            sourcePopulationCommitmentSha256: role.sourcePopulationCommitmentSha256,
            engineSeedBase: RESEARCH_CONFIRMATORY_ENGINE_SEED_BASE,
            candidateCountry: Countries.IRAQ, baselineCountry: Countries.IRAQ,
            maxTicks: RESEARCH_CONFIRMATORY_MAX_TICKS, policies, episodes,
        });
        const planFile = path.join(plansRoot, `shard-${String(shardIndex).padStart(3, "0")}.json`);
        fs.writeFileSync(planFile, serializeResearchRunPlan(plan), { flag: "wx", mode: 0o600 });
        shards.push({ ...row, shardIndex, planFile, planSha256: sha256File(planFile), runId, launchedGameCount: 4 });
    }
    const rankedTargets = [...role.targets].sort((a, b) => familyRankSha256(a.familyId).localeCompare(familyRankSha256(b.familyId)));
    const campaign: ResearchConfirmatoryCampaign = {
        schemaVersion: 1, kind: "method-v2-confirmatory", sourceGitCommit: generationManifest.source.gitCommit,
        generatedAt: new Date().toISOString(), outcomeAccess: "sealed-private-events",
        designPath, designSha256: sha256File(designPath), developmentUnblindingPath: developmentPath,
        developmentUnblindingSha256: RESEARCH_CONFIRMATORY_DEVELOPMENT_SHA256,
        sourceRuntimeSha256: sourceRuntimeCommitmentSha256(generationManifest.source.runtimeTrees),
        baselineGitCommit: generationManifest.software.baseline.gitCommit,
        baselineRuntimeSha256: generationManifest.software.baseline.runtimeTree.sha256,
        gameApiRuntimeSha256: generationManifest.software.gameApiRuntimeTree.sha256,
        packageLockSha256: generationManifest.software.packageLockSha256,
        roleManifestSha256: RESEARCH_CONFIRMATORY_TEST_ARTIFACT_SHA256,
        roleCommitmentSha256: RESEARCH_CONFIRMATORY_TEST_ROLE_COMMITMENT_SHA256,
        splitCommitmentSha256: role.splitCommitmentSha256,
        sourcePopulationCommitmentSha256: role.sourcePopulationCommitmentSha256,
        championArtifactPath, championArtifactSha256: RESEARCH_CONFIRMATORY_CHAMPION_ARTIFACT_SHA256,
        championPolicyId: RESEARCH_CONFIRMATORY_CHAMPION_POLICY_ID, defaultPolicyId: RESEARCH_CONFIRMATORY_DEFAULT_POLICY_ID,
        engineSeedBase: RESEARCH_CONFIRMATORY_ENGINE_SEED_BASE, maxTicks: RESEARCH_CONFIRMATORY_MAX_TICKS,
        familyCount: 16, blocksPerFamily: 8, shardCount: 128, launchedGameCount: 512,
        selectedFamilies: rankedTargets.map((target) => ({
            familyId: target.familyId, representativeSha256: target.representative.sha256, rankSha256: familyRankSha256(target.familyId),
        })),
        policies, shards,
    };
    const campaignPath = path.join(outRoot, "campaign.json");
    fs.writeFileSync(campaignPath, JSON.stringify(campaign, null, 2), { flag: "wx", mode: 0o600 });
    fs.writeFileSync(path.join(outRoot, "plan-files.txt"), `${shards.map(({ planFile }) => planFile).join("\n")}\n`, { flag: "wx", mode: 0o600 });
    console.log(JSON.stringify({ campaignPath, campaignSha256: sha256File(campaignPath), familyCount: 16, shardCount: 128, launchedGameCount: 512, outcomeAccess: campaign.outcomeAccess }));
};

const invokedModuleUrl = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (import.meta.url === invokedModuleUrl) main().catch((error) => { console.error(error); process.exitCode = 1; });
