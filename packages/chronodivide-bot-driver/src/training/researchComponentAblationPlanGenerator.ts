import { execFileSync } from "node:child_process";
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
import {
    DEFAULT_RESEARCH_POLICY,
    parseResearchPolicy,
    ResearchPolicyConfig,
    researchPolicySha256,
} from "./researchPolicy.js";

export const RESEARCH_COMPONENT_SCHEMA_VERSION = 1 as const;
export const RESEARCH_COMPONENT_ENGINE_SEED_BASE = 80_000_000 as const;
export const RESEARCH_COMPONENT_MAX_TICKS = 18_000 as const;
export const RESEARCH_COMPONENT_FAMILY_COUNT = 10 as const;
export const RESEARCH_COMPONENT_BLOCKS_PER_FAMILY = 4 as const;
export const RESEARCH_COMPONENT_SHARD_COUNT = 40 as const;
export const RESEARCH_COMPONENT_LAUNCH_COUNT = 480 as const;
export const RESEARCH_COMPONENT_DEVELOPMENT_SHA256 =
    "2d07f8d0bec8befb470342081e4753d0e910d7aa211873f8ea11aed3ecd0202d" as const;
export const RESEARCH_COMPONENT_ROLE_ARTIFACT_SHA256 =
    "80a7f04739b06480cf2c7c9aa5ac6466c47bd69952c6ccc6207a238b94a4c59b" as const;
export const RESEARCH_COMPONENT_ROLE_COMMITMENT_SHA256 =
    "9bdc1ec8370002daa584d6c7964ef0856161233f00f09b65be7aa6d4988beba4" as const;
export const RESEARCH_COMPONENT_CHAMPION_ARTIFACT_SHA256 =
    "40a53c142fa30725ea5d22032d4b6dfcda4f358e15e1b8d36ac6a102b76e9ee1" as const;
export const RESEARCH_COMPONENT_CHAMPION_POLICY_ID =
    "ab0071009cbd5f1fc9e2f1a76a562455a0ebeacf77dac1cd9c13b9fc6374203f" as const;
export const RESEARCH_COMPONENT_METHOD_IDS = [
    "champion",
    "revertDefenseGrowth",
    "revertEmergencyDefense",
    "revertForceAttack",
    "revertScouting",
    "revertStrategy",
] as const;
export type ComponentMethodId = typeof RESEARCH_COMPONENT_METHOD_IDS[number];

export const RESEARCH_COMPONENT_EXPECTED_POLICY_IDS: Record<ComponentMethodId, string> = {
    champion: RESEARCH_COMPONENT_CHAMPION_POLICY_ID,
    revertDefenseGrowth: "fbd4b6ad17b4e24e4087f729680db81fe13a69db1e4aa38625dc3711a9c22c3f",
    revertEmergencyDefense: "7e491f94ded1f63cbfbb661d957a986f902a65616bc5a8488984d4f42d8a08d9",
    revertForceAttack: "9e7ab6838a02daff07409ff73672d736eb36a444e7605fb3feee55a669dce8a0",
    revertScouting: "be735d57597d0795de90dbb442be17ba309d5a57db6f52a4c726e99e3c788d4f",
    revertStrategy: "31e4b9b8ba9ad47747c87eafe873211d3f45d3f7586870bbd64644ab06b76dc2",
};

export type ComponentTarget = {
    familyId: string;
    representative: { path: string; sha256: string };
    descriptors: Record<string, unknown>;
};

export type ComponentMethod = {
    methodId: ComponentMethodId;
    policyId: string;
    parentPolicyId: typeof RESEARCH_COMPONENT_CHAMPION_POLICY_ID;
    parentArtifactPath: string;
    parentArtifactSha256: typeof RESEARCH_COMPONENT_CHAMPION_ARTIFACT_SHA256;
    revertedParameters: Array<keyof ResearchPolicyConfig>;
};

export type ResearchComponentAblationCampaign = {
    schemaVersion: typeof RESEARCH_COMPONENT_SCHEMA_VERSION;
    kind: "method-v2-component-ablation";
    status: "POST_CONFIRMATORY_COMPONENT_DIAGNOSTIC_NOT_CLAIM_RESCUE";
    sourceGitCommit: string;
    generatedAt: string;
    outcomeAccess: "sealed-private-events";
    protocolPath: string;
    protocolSha256: string;
    developmentUnblindingPath: string;
    developmentUnblindingSha256: typeof RESEARCH_COMPONENT_DEVELOPMENT_SHA256;
    sourceRuntimeSha256: string;
    baselineGitCommit: string;
    baselineRuntimeSha256: string;
    gameApiRuntimeSha256: string;
    packageLockSha256: string;
    roleManifestSha256: typeof RESEARCH_COMPONENT_ROLE_ARTIFACT_SHA256;
    roleCommitmentSha256: typeof RESEARCH_COMPONENT_ROLE_COMMITMENT_SHA256;
    splitCommitmentSha256: string;
    sourcePopulationCommitmentSha256: string;
    methods: ComponentMethod[];
    policies: ResearchPlanPolicy[];
    engineSeedBase: typeof RESEARCH_COMPONENT_ENGINE_SEED_BASE;
    maxTicks: typeof RESEARCH_COMPONENT_MAX_TICKS;
    familyCount: typeof RESEARCH_COMPONENT_FAMILY_COUNT;
    blocksPerFamily: typeof RESEARCH_COMPONENT_BLOCKS_PER_FAMILY;
    shardCount: typeof RESEARCH_COMPONENT_SHARD_COUNT;
    launchedGameCount: typeof RESEARCH_COMPONENT_LAUNCH_COUNT;
    selectedFamilies: Array<{ familyId: string; representativeSha256: string }>;
    shards: Array<{
        shardIndex: number;
        planFile: string;
        planSha256: string;
        runId: string;
        familyId: string;
        seedOrdinal: number;
        seedBlockIndex: number;
        launchedGameCount: 12;
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

const loadDevelopmentRole = (repoRoot: string, privateRoot: string): {
    roleCommitmentSha256: typeof RESEARCH_COMPONENT_ROLE_COMMITMENT_SHA256;
    splitCommitmentSha256: string;
    sourcePopulationCommitmentSha256: string;
    targets: ComponentTarget[];
} => {
    const publicValue = JSON.parse(fs.readFileSync(path.join(repoRoot, "research", "artifacts", "method_v2_development_role_commitment.json"), "utf8")) as Record<string, unknown>;
    if (!isRecord(publicValue.privateArtifacts) || !isRecord(publicValue.roleCommitments)) throw new Error("Method-v2 role commitment is malformed");
    const descriptor = publicValue.privateArtifacts.development;
    if (!isRecord(descriptor) || descriptor.sha256 !== RESEARCH_COMPONENT_ROLE_ARTIFACT_SHA256) throw new Error("Method-v2 role artifact commitment drifted");
    const privatePath = path.join(privateRoot, "development-families.json");
    if (sha256File(privatePath) !== RESEARCH_COMPONENT_ROLE_ARTIFACT_SHA256) throw new Error("Method-v2 private development role bytes changed");
    const value = JSON.parse(fs.readFileSync(privatePath, "utf8")) as Record<string, unknown>;
    if (value.role !== "development" || value.methodVersion !== 2 || value.targetCount !== 11 || !Array.isArray(value.targets) || value.targets.length !== 11) {
        throw new Error("Method-v2 private development role schema drifted");
    }
    const targets = value.targets.map((raw, index): ComponentTarget => {
        if (!isRecord(raw) || typeof raw.familyId !== "string" || !isRecord(raw.representative) || !isRecord(raw.descriptors)) throw new Error(`Development target ${index} is malformed`);
        const mapPath = raw.representative.path, mapSha256 = raw.representative.sha256;
        if (typeof mapPath !== "string" || typeof mapSha256 !== "string" || sha256File(path.resolve(repoRoot, mapPath)) !== mapSha256) throw new Error(`Development target ${index} map commitment drifted`);
        return { familyId: raw.familyId, representative: { path: mapPath, sha256: mapSha256 }, descriptors: raw.descriptors };
    });
    if (new Set(targets.map(({ familyId }) => familyId)).size !== 11) throw new Error("Development targets are duplicated");
    const roleCommitmentSha256 = value.roleCommitmentSha256;
    const splitCommitmentSha256 = value.splitCommitmentSha256;
    const sourcePopulationCommitmentSha256 = value.sourcePopulationCommitmentSha256;
    if (
        roleCommitmentSha256 !== RESEARCH_COMPONENT_ROLE_COMMITMENT_SHA256 ||
        roleCommitmentSha256 !== publicValue.roleCommitments.development ||
        typeof splitCommitmentSha256 !== "string" || splitCommitmentSha256 !== publicValue.splitCommitmentSha256 ||
        typeof sourcePopulationCommitmentSha256 !== "string" || sourcePopulationCommitmentSha256 !== publicValue.sourcePopulationCommitmentSha256
    ) throw new Error("Development role commitment chain drifted");
    return {
        roleCommitmentSha256: RESEARCH_COMPONENT_ROLE_COMMITMENT_SHA256,
        splitCommitmentSha256,
        sourcePopulationCommitmentSha256,
        targets,
    };
};

const loadActiveFamilies = (artifactPath: string): string[] => {
    if (sha256File(artifactPath) !== RESEARCH_COMPONENT_DEVELOPMENT_SHA256) throw new Error("Development unblinding bytes changed");
    const value = JSON.parse(fs.readFileSync(artifactPath, "utf8")) as Record<string, unknown>;
    if (value.status !== "PASSED_DEVELOPMENT_SIGNAL_GATE" || !isRecord(value.analysis) || !Array.isArray(value.analysis.familyDiagnostics)) {
        throw new Error("Development artifact does not contain the completed method-v2 family panel");
    }
    const ids = value.analysis.familyDiagnostics.map((row, index) => {
        if (!isRecord(row) || typeof row.familyId !== "string") throw new Error(`Development family diagnostic ${index} is malformed`);
        return row.familyId;
    }).sort();
    if (ids.length !== 10 || new Set(ids).size !== 10) throw new Error("Component ablation requires exactly ten development families");
    return ids;
};

const parsePolicyEntry = (raw: unknown, expectedPolicyId: string, label: string): ResearchPlanPolicy => {
    if (!isRecord(raw) || raw.policyId !== expectedPolicyId) throw new Error(`${label} policy identity drifted`);
    const policy = parseResearchPolicy(raw.policy);
    if (researchPolicySha256(policy) !== expectedPolicyId) throw new Error(`${label} policy bytes drifted`);
    return { policyId: expectedPolicyId, policy };
};

type ComponentRevertSpec = {
    methodId: Exclude<ComponentMethodId, "champion">;
    revertedParameters: Array<keyof ResearchPolicyConfig>;
    changes: Partial<ResearchPolicyConfig>;
};

const COMPONENT_REVERT_SPECS: ComponentRevertSpec[] = [
    {
        methodId: "revertDefenseGrowth",
        revertedParameters: ["defenceRadiusIncreasePerTick"],
        changes: { defenceRadiusIncreasePerTick: DEFAULT_RESEARCH_POLICY.defenceRadiusIncreasePerTick },
    },
    {
        methodId: "revertEmergencyDefense",
        revertedParameters: ["emergencyDefenseRadius"],
        changes: { emergencyDefenseRadius: DEFAULT_RESEARCH_POLICY.emergencyDefenseRadius },
    },
    {
        methodId: "revertForceAttack",
        revertedParameters: ["forceAttackEnabled", "forceAttackMinCombatants"],
        changes: {
            forceAttackEnabled: DEFAULT_RESEARCH_POLICY.forceAttackEnabled,
            forceAttackMinCombatants: DEFAULT_RESEARCH_POLICY.forceAttackMinCombatants,
        },
    },
    {
        methodId: "revertScouting",
        revertedParameters: ["scoutCooldownTicks"],
        changes: { scoutCooldownTicks: DEFAULT_RESEARCH_POLICY.scoutCooldownTicks },
    },
    {
        methodId: "revertStrategy",
        revertedParameters: ["attackCompositionPolicy", "strategicPlan"],
        changes: {
            attackCompositionPolicy: DEFAULT_RESEARCH_POLICY.attackCompositionPolicy,
            strategicPlan: DEFAULT_RESEARCH_POLICY.strategicPlan,
        },
    },
];

export const buildComponentMethods = (
    championPolicy: ResearchPlanPolicy,
    championPath: string,
): { methods: ComponentMethod[]; policies: ResearchPlanPolicy[] } => {
    if (championPolicy.policyId !== RESEARCH_COMPONENT_CHAMPION_POLICY_ID || researchPolicySha256(championPolicy.policy) !== championPolicy.policyId) {
        throw new Error("Champion policy identity drifted");
    }
    const changedFromDefault = (Object.keys(championPolicy.policy) as Array<keyof ResearchPolicyConfig>)
        .filter((key) => championPolicy.policy[key] !== DEFAULT_RESEARCH_POLICY[key])
        .sort();
    const coveredByReverts = [...new Set(COMPONENT_REVERT_SPECS.flatMap(({ revertedParameters }) => revertedParameters))].sort();
    if (changedFromDefault.join(",") !== coveredByReverts.join(",")) {
        throw new Error("Component groups must exhaust the champion-versus-default policy difference");
    }
    const methods: ComponentMethod[] = [{
        methodId: "champion",
        policyId: championPolicy.policyId,
        parentPolicyId: RESEARCH_COMPONENT_CHAMPION_POLICY_ID,
        parentArtifactPath: championPath,
        parentArtifactSha256: RESEARCH_COMPONENT_CHAMPION_ARTIFACT_SHA256,
        revertedParameters: [],
    }];
    const policies: ResearchPlanPolicy[] = [championPolicy];
    for (const spec of COMPONENT_REVERT_SPECS) {
        const policy = parseResearchPolicy({ ...championPolicy.policy, ...spec.changes });
        const policyId = researchPolicySha256(policy);
        if (policyId !== RESEARCH_COMPONENT_EXPECTED_POLICY_IDS[spec.methodId]) {
            throw new Error(`${spec.methodId} policy identity drifted`);
        }
        const actualChanges = (Object.keys(policy) as Array<keyof ResearchPolicyConfig>)
            .filter((key) => policy[key] !== championPolicy.policy[key])
            .sort();
        if (actualChanges.join(",") !== [...spec.revertedParameters].sort().join(",")) {
            throw new Error(`${spec.methodId} changes parameters outside its frozen component group`);
        }
        methods.push({
            methodId: spec.methodId,
            policyId,
            parentPolicyId: RESEARCH_COMPONENT_CHAMPION_POLICY_ID,
            parentArtifactPath: championPath,
            parentArtifactSha256: RESEARCH_COMPONENT_CHAMPION_ARTIFACT_SHA256,
            revertedParameters: [...spec.revertedParameters],
        });
        policies.push({ policyId, policy });
    }
    if (
        methods.map(({ methodId }) => methodId).join(",") !== RESEARCH_COMPONENT_METHOD_IDS.join(",") ||
        new Set(policies.map(({ policyId }) => policyId)).size !== 6
    ) throw new Error("Component methods must be the six unique frozen policies");
    return { methods, policies };
};

const loadMethods = (championPath: string): { methods: ComponentMethod[]; policies: ResearchPlanPolicy[] } => {
    if (sha256File(championPath) !== RESEARCH_COMPONENT_CHAMPION_ARTIFACT_SHA256) throw new Error("Champion artifact bytes changed");
    const championValue = JSON.parse(fs.readFileSync(championPath, "utf8")) as Record<string, unknown>;
    const championPolicy = parsePolicyEntry(championValue.championPolicy, RESEARCH_COMPONENT_CHAMPION_POLICY_ID, "Champion");
    return buildComponentMethods(championPolicy, championPath);
};

export const buildComponentAblationDesign = (familyIds: string[]) => {
    if (familyIds.length !== 10 || new Set(familyIds).size !== 10) throw new Error("Component design requires exactly ten unique development families");
    return [...familyIds].sort().flatMap((familyId, familyIndex) => Array.from({ length: 4 }, (_, seedOrdinal) => ({
        familyId, seedOrdinal, seedBlockIndex: familyIndex * 4 + seedOrdinal,
    })));
};

const main = async (): Promise<void> => {
    const repoRoot = gitRoot();
    const driverRoot = path.join(repoRoot, "packages", "chronodivide-bot-driver");
    if (path.resolve(process.cwd()) !== driverRoot) throw new Error(`Component generator must start in ${driverRoot}`);
    if (!process.env.BASELINE_PACKAGE_ROOT || process.env.REQUIRE_EXTERNAL_BASELINE !== "true") throw new Error("Set the external baseline environment");
    const outRoot = requiredPath("OUT_ROOT");
    if (fs.existsSync(outRoot)) throw new Error(`Refusing to reuse OUT_ROOT ${outRoot}`);
    const privateRoot = requiredPath("RESEARCH_PRIVATE_ROLE_ROOT");
    const developmentPath = requiredPath("DEVELOPMENT_UNBLINDING");
    const championPath = requiredPath("CHAMPION_ARTIFACT");
    const protocolPath = path.join(repoRoot, "research", "METHOD_V2_COMPONENT_ABLATION_PROTOCOL.md");
    const role = loadDevelopmentRole(repoRoot, privateRoot);
    const activeFamilyIds = loadActiveFamilies(developmentPath);
    const targets = new Map(role.targets.map((target) => [target.familyId, target]));
    if (activeFamilyIds.some((familyId) => !targets.has(familyId))) throw new Error("Development artifact contains a family outside the frozen role");
    const { methods, policies } = loadMethods(championPath);
    const baselineFactory = await loadBaselineFactory(path.join(repoRoot, "packages", "chronodivide-bot"));
    const generationManifest = createExperimentManifest({
        runId: "plan-method-v2-component-ablation", mixDir: path.join(driverRoot, "data"), maps: [],
        effectiveConfig: { purpose: "component-ablation", postConfirmatory: true, outcomeAccess: "sealed-private-events" },
        baseline: baselineFactory.descriptor, gameSeedBase: RESEARCH_COMPONENT_ENGINE_SEED_BASE,
    });
    if (
        generationManifest.source.gitBranch !== "main" || generationManifest.source.trackedDirty !== false || !generationManifest.source.gitCommit ||
        generationManifest.software.baseline.kind !== "external-package" || generationManifest.software.baseline.trackedDirty !== false ||
        !generationManifest.software.baseline.gitCommit || !generationManifest.software.baseline.runtimeTree.sha256 ||
        !generationManifest.software.gameApiRuntimeTree.sha256 || !generationManifest.software.packageLockSha256
    ) throw new Error("Component generation requires clean committed source and runtime trees");
    fs.mkdirSync(outRoot, { recursive: false, mode: 0o700 });
    const plansRoot = path.join(outRoot, "plans");
    fs.mkdirSync(plansRoot, { mode: 0o700 });
    const design = buildComponentAblationDesign(activeFamilyIds);
    const methodPolicies = methods.map((method) => ({ method, policy: policies.find(({ policyId }) => policyId === method.policyId) as ResearchPlanPolicy }));
    const shards: ResearchComponentAblationCampaign["shards"] = [];
    for (let shardIndex = 0; shardIndex < design.length; shardIndex++) {
        const row = design[shardIndex];
        const runId = `component-shard${String(shardIndex).padStart(2, "0")}-${generationManifest.source.gitCommit.slice(0, 10)}`;
        const requestedEngineSeed = derivePairedEngineSeed(RESEARCH_COMPONENT_ENGINE_SEED_BASE, row.seedBlockIndex);
        const episodes = methodPolicies.flatMap(({ method, policy }) => ([0, 1] as const).map((candidateSlot) => ({
            episodeId: `${method.methodId}-b${row.seedBlockIndex}-s${candidateSlot}`,
            familyId: row.familyId, methodId: method.methodId, policyId: policy.policyId,
            seedBlockIndex: row.seedBlockIndex, requestedEngineSeed, candidateSlot,
        })));
        const plan: ResearchRunPlan = parseResearchRunPlan({
            schemaVersion: 1, runId, role: "development", purpose: "component-ablation",
            sourceGitCommit: generationManifest.source.gitCommit,
            sourceRuntimeSha256: sourceRuntimeCommitmentSha256(generationManifest.source.runtimeTrees),
            baselineGitCommit: generationManifest.software.baseline.gitCommit,
            baselineRuntimeSha256: generationManifest.software.baseline.runtimeTree.sha256,
            gameApiRuntimeSha256: generationManifest.software.gameApiRuntimeTree.sha256,
            packageLockSha256: generationManifest.software.packageLockSha256,
            roleManifestSha256: RESEARCH_COMPONENT_ROLE_ARTIFACT_SHA256,
            roleCommitmentSha256: role.roleCommitmentSha256,
            splitCommitmentSha256: role.splitCommitmentSha256,
            sourcePopulationCommitmentSha256: role.sourcePopulationCommitmentSha256,
            engineSeedBase: RESEARCH_COMPONENT_ENGINE_SEED_BASE,
            candidateCountry: Countries.IRAQ, baselineCountry: Countries.IRAQ,
            maxTicks: RESEARCH_COMPONENT_MAX_TICKS, policies, episodes,
        });
        const planFile = path.join(plansRoot, `shard-${String(shardIndex).padStart(2, "0")}.json`);
        fs.writeFileSync(planFile, serializeResearchRunPlan(plan), { flag: "wx", mode: 0o600 });
        shards.push({ ...row, shardIndex, planFile, planSha256: sha256File(planFile), runId, launchedGameCount: 12 });
    }
    const campaign: ResearchComponentAblationCampaign = {
        schemaVersion: 1, kind: "method-v2-component-ablation", status: "POST_CONFIRMATORY_COMPONENT_DIAGNOSTIC_NOT_CLAIM_RESCUE",
        sourceGitCommit: generationManifest.source.gitCommit, generatedAt: new Date().toISOString(), outcomeAccess: "sealed-private-events",
        protocolPath, protocolSha256: sha256File(protocolPath), developmentUnblindingPath: developmentPath,
        developmentUnblindingSha256: RESEARCH_COMPONENT_DEVELOPMENT_SHA256,
        sourceRuntimeSha256: sourceRuntimeCommitmentSha256(generationManifest.source.runtimeTrees),
        baselineGitCommit: generationManifest.software.baseline.gitCommit,
        baselineRuntimeSha256: generationManifest.software.baseline.runtimeTree.sha256,
        gameApiRuntimeSha256: generationManifest.software.gameApiRuntimeTree.sha256,
        packageLockSha256: generationManifest.software.packageLockSha256,
        roleManifestSha256: RESEARCH_COMPONENT_ROLE_ARTIFACT_SHA256,
        roleCommitmentSha256: role.roleCommitmentSha256,
        splitCommitmentSha256: role.splitCommitmentSha256,
        sourcePopulationCommitmentSha256: role.sourcePopulationCommitmentSha256,
        methods, policies, engineSeedBase: RESEARCH_COMPONENT_ENGINE_SEED_BASE, maxTicks: RESEARCH_COMPONENT_MAX_TICKS,
        familyCount: 10, blocksPerFamily: 4, shardCount: 40, launchedGameCount: 480,
        selectedFamilies: activeFamilyIds.map((familyId) => ({ familyId, representativeSha256: (targets.get(familyId) as ComponentTarget).representative.sha256 })),
        shards,
    };
    const campaignPath = path.join(outRoot, "campaign.json");
    fs.writeFileSync(campaignPath, JSON.stringify(campaign, null, 2), { flag: "wx", mode: 0o600 });
    fs.writeFileSync(path.join(outRoot, "plan-files.txt"), `${shards.map(({ planFile }) => planFile).join("\n")}\n`, { flag: "wx", mode: 0o600 });
    console.log(JSON.stringify({ campaignPath, campaignSha256: sha256File(campaignPath), familyCount: 10, methodCount: 6, shardCount: 40, launchedGameCount: 480, status: campaign.status }));
};

const invokedModuleUrl = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (import.meta.url === invokedModuleUrl) main().catch((error) => { console.error(error); process.exitCode = 1; });
