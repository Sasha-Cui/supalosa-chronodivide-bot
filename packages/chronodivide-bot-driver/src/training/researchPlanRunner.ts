import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { Countries } from "@supalosa/chronodivide-bot/dist/bot/logic/common/utils.js";
import { loadBaselineFactory } from "../benchmark/baselineLoader.js";
import { createExperimentManifest, ExperimentManifest } from "../benchmark/provenance.js";
import { derivePairedEngineSeed } from "../benchmark/seededOfflineGame.js";
import {
    RESEARCH_EPISODE_SCHEMA_VERSION,
    ResearchEpisodeSpec,
    runResearchEpisode,
    validateResearchEpisodeSpec,
} from "./researchEpisode.js";
import { parseResearchPolicy, ResearchPolicyConfig, researchPolicySha256 } from "./researchPolicy.js";

export const RESEARCH_PLAN_SCHEMA_VERSION = 1 as const;
export const RESEARCH_ROLE_MANIFEST_STATUS = "PRIVATE_FAMILY_ROLE_MANIFEST_NO_POLICY_OUTCOMES" as const;
export const RESEARCH_PUBLIC_ROLE_STATUS = "FROZEN_FAMILY_ROLE_COMMITMENTS_IDENTITIES_PRIVATE" as const;

export type ResearchRole = "train" | "development" | "test";
export type ResearchPurpose =
    | "train-smoke"
    | "optimizer-search"
    | "development-qc"
    | "development-evaluation"
    | "development-v2-qc"
    | "development-v2-evaluation"
    | "confirmatory-evaluation";

export type ResearchPlanPolicy = {
    policyId: string;
    policy: ResearchPolicyConfig;
};

export type ResearchPlanEpisode = {
    episodeId: string;
    familyId: string;
    policyId: string;
    methodId: string;
    seedBlockIndex: number;
    requestedEngineSeed: number;
    candidateSlot: 0 | 1;
};

export type ResearchRunPlan = {
    schemaVersion: typeof RESEARCH_PLAN_SCHEMA_VERSION;
    runId: string;
    role: ResearchRole;
    purpose: ResearchPurpose;
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
    engineSeedBase: number;
    candidateCountry: Countries.IRAQ;
    baselineCountry: Countries.IRAQ;
    maxTicks: number;
    policies: ResearchPlanPolicy[];
    episodes: ResearchPlanEpisode[];
};

export type RoleTarget = {
    familyId: string;
    representative: { path: string; sha256: string };
    descriptors: Record<string, unknown>;
};

export type LoadedResearchRole = {
    role: ResearchRole;
    fileSha256: string;
    roleCommitmentSha256: string;
    splitCommitmentSha256: string;
    sourcePopulationCommitmentSha256: string;
    targets: RoleTarget[];
};

export type StrictPlanContext = {
    publicCommitmentsPath: string;
    privateRoleRoot: string;
    repoRoot: string;
};

const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const GIT_COMMIT_PATTERN = /^[0-9a-f]{40}$/;
const IDENTIFIER_PATTERN = /^[A-Za-z0-9._-]+$/;
const TRAIN_PURPOSES: ResearchPurpose[] = ["train-smoke", "optimizer-search"];
const DEVELOPMENT_PURPOSES: ResearchPurpose[] = [
    "development-qc",
    "development-evaluation",
    "development-v2-qc",
    "development-v2-evaluation",
];
const TEST_PURPOSES: ResearchPurpose[] = ["confirmatory-evaluation"];

const developmentMethodIds = (purpose: ResearchPurpose): readonly string[] =>
    purpose === "development-v2-qc" ||
    purpose === "development-v2-evaluation" ||
    purpose === "confirmatory-evaluation"
        ? ["champion", "default"]
        : ["conditioned", "global"];

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null && !Array.isArray(value);

const assertExactKeys = (label: string, value: Record<string, unknown>, expected: readonly string[]): void => {
    const actual = Object.keys(value).sort();
    const wanted = [...expected].sort();
    if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
        const unexpected = actual.filter((key) => !wanted.includes(key));
        const missing = wanted.filter((key) => !actual.includes(key));
        throw new Error(`${label} schema mismatch; unexpected=[${unexpected.join(",")}] missing=[${missing.join(",")}]`);
    }
};

const expectString = (value: Record<string, unknown>, key: string): string => {
    const result = value[key];
    if (typeof result !== "string" || result.length === 0) {
        throw new Error(`${key} must be a non-empty string`);
    }
    return result;
};

const expectSafeInteger = (value: Record<string, unknown>, key: string, minimum: number, maximum: number): number => {
    const result = value[key];
    if (!Number.isSafeInteger(result) || (result as number) < minimum || (result as number) > maximum) {
        throw new Error(`${key} must be an integer in [${minimum}, ${maximum}]`);
    }
    return result as number;
};

const expectSha256 = (value: Record<string, unknown>, key: string): string => {
    const result = expectString(value, key);
    if (!SHA256_PATTERN.test(result)) {
        throw new Error(`${key} must be a lowercase SHA-256 digest`);
    }
    return result;
};

const expectCommit = (value: Record<string, unknown>, key: string): string => {
    const result = expectString(value, key);
    if (!GIT_COMMIT_PATTERN.test(result)) {
        throw new Error(`${key} must be a full lowercase Git commit`);
    }
    return result;
};

export const sha256File = (filePath: string): string => {
    const digest = crypto.createHash("sha256");
    digest.update(fs.readFileSync(filePath));
    return digest.digest("hex");
};

export const sourceRuntimeCommitmentSha256 = (runtimeTrees: ExperimentManifest["source"]["runtimeTrees"]): string =>
    crypto.createHash("sha256").update(JSON.stringify(runtimeTrees)).digest("hex");

export const parseResearchRunPlan = (value: unknown): ResearchRunPlan => {
    if (!isRecord(value)) {
        throw new Error("Research run plan must be an object");
    }
    assertExactKeys("Research run plan", value, [
        "schemaVersion",
        "runId",
        "role",
        "purpose",
        "sourceGitCommit",
        "sourceRuntimeSha256",
        "baselineGitCommit",
        "baselineRuntimeSha256",
        "gameApiRuntimeSha256",
        "packageLockSha256",
        "roleManifestSha256",
        "roleCommitmentSha256",
        "splitCommitmentSha256",
        "sourcePopulationCommitmentSha256",
        "engineSeedBase",
        "candidateCountry",
        "baselineCountry",
        "maxTicks",
        "policies",
        "episodes",
    ]);
    if (value.schemaVersion !== RESEARCH_PLAN_SCHEMA_VERSION) {
        throw new Error(`Research run plan schemaVersion must be ${RESEARCH_PLAN_SCHEMA_VERSION}`);
    }
    const runId = expectString(value, "runId");
    if (!IDENTIFIER_PATTERN.test(runId)) {
        throw new Error(`runId may contain only letters, digits, dot, underscore, and hyphen`);
    }
    if (value.role !== "train" && value.role !== "development" && value.role !== "test") {
        throw new Error("Research plan role must be train, development, or test; reserve is inaccessible");
    }
    const role = value.role;
    const allowedPurposes = role === "train"
        ? TRAIN_PURPOSES
        : role === "development"
            ? DEVELOPMENT_PURPOSES
            : TEST_PURPOSES;
    if (typeof value.purpose !== "string" || !allowedPurposes.includes(value.purpose as ResearchPurpose)) {
        throw new Error(`Research purpose ${String(value.purpose)} is not allowed for role ${role}`);
    }
    const purpose = value.purpose as ResearchPurpose;
    if (value.candidateCountry !== Countries.IRAQ || value.baselineCountry !== Countries.IRAQ) {
        throw new Error("Research plan v1 requires the prospectively fixed Arabs mirror matchup");
    }
    if (!Array.isArray(value.policies) || value.policies.length === 0) {
        throw new Error("Research plan must contain at least one policy");
    }
    const policies: ResearchPlanPolicy[] = value.policies.map((raw, index) => {
        if (!isRecord(raw)) {
            throw new Error(`Policy ${index} must be an object`);
        }
        assertExactKeys(`Policy ${index}`, raw, ["policyId", "policy"]);
        const policyId = expectSha256(raw, "policyId");
        const policy = parseResearchPolicy(raw.policy);
        if (researchPolicySha256(policy) !== policyId) {
            throw new Error(`Policy ${index} policyId does not equal its canonical policy SHA-256`);
        }
        return { policyId, policy };
    });
    if (new Set(policies.map(({ policyId }) => policyId)).size !== policies.length) {
        throw new Error("Research plan policyId values must be unique");
    }
    if (!Array.isArray(value.episodes) || value.episodes.length === 0) {
        throw new Error("Research plan must contain at least one episode");
    }
    const engineSeedBase = expectSafeInteger(value, "engineSeedBase", 0, 0xffff_ffff);
    const policyIds = new Set(policies.map(({ policyId }) => policyId));
    const episodes: ResearchPlanEpisode[] = value.episodes.map((raw, index) => {
        if (!isRecord(raw)) {
            throw new Error(`Episode ${index} must be an object`);
        }
        const expectedKeys = [
            "episodeId",
            "familyId",
            "policyId",
            "seedBlockIndex",
            "requestedEngineSeed",
            "candidateSlot",
        ];
        if (role === "development" || role === "test") {
            expectedKeys.push("methodId");
        }
        assertExactKeys(`Episode ${index}`, raw, expectedKeys);
        const episodeId = expectString(raw, "episodeId");
        const familyId = expectString(raw, "familyId");
        const policyId = expectSha256(raw, "policyId");
        if (!IDENTIFIER_PATTERN.test(episodeId) || !IDENTIFIER_PATTERN.test(familyId)) {
            throw new Error(`Episode ${index} identifiers contain forbidden characters`);
        }
        const methodId = role === "development" || role === "test" ? expectString(raw, "methodId") : policyId;
        if (!IDENTIFIER_PATTERN.test(methodId)) {
            throw new Error(`Episode ${index} methodId contains forbidden characters`);
        }
        if ((role === "development" || role === "test") && !developmentMethodIds(purpose).includes(methodId)) {
            throw new Error(
                `Episode ${index} development methodId must be one of ${developmentMethodIds(purpose).join(", ")}`,
            );
        }
        if (!policyIds.has(policyId)) {
            throw new Error(`Episode ${index} references undeclared policy ${policyId}`);
        }
        const seedBlockIndex = expectSafeInteger(raw, "seedBlockIndex", 0, Number.MAX_SAFE_INTEGER);
        const requestedEngineSeed = expectSafeInteger(raw, "requestedEngineSeed", 0, 0xffff_ffff);
        if (requestedEngineSeed !== derivePairedEngineSeed(engineSeedBase, seedBlockIndex)) {
            throw new Error(`Episode ${index} requestedEngineSeed drifts from engineSeedBase and seedBlockIndex`);
        }
        if (raw.candidateSlot !== 0 && raw.candidateSlot !== 1) {
            throw new Error(`Episode ${index} candidateSlot must be 0 or 1`);
        }
        return {
            episodeId,
            familyId,
            policyId,
            methodId,
            seedBlockIndex,
            requestedEngineSeed,
            candidateSlot: raw.candidateSlot,
        };
    });
    if (new Set(episodes.map(({ episodeId }) => episodeId)).size !== episodes.length) {
        throw new Error("Research plan episodeId values must be unique");
    }
    const schedules = new Map<string, Set<string>>();
    const methodFamilyPolicies = new Map<string, string>();
    for (const episode of episodes) {
        const schedule = schedules.get(episode.methodId) ?? new Set<string>();
        const key = `${episode.familyId}|${episode.seedBlockIndex}|${episode.candidateSlot}`;
        if (schedule.has(key)) {
            throw new Error(`Duplicate method schedule row ${episode.methodId}|${key}`);
        }
        schedule.add(key);
        schedules.set(episode.methodId, schedule);
        const methodFamilyKey = `${episode.methodId}|${episode.familyId}`;
        const priorPolicyId = methodFamilyPolicies.get(methodFamilyKey);
        if (priorPolicyId && priorPolicyId !== episode.policyId) {
            throw new Error(`Method ${episode.methodId} changes policy within family ${episode.familyId}`);
        }
        methodFamilyPolicies.set(methodFamilyKey, episode.policyId);
    }
    const methodIds = [...schedules.keys()].sort();
    const expectedDevelopmentMethodIds = developmentMethodIds(purpose);
    if ((role === "development" || role === "test") && methodIds.join(",") !== expectedDevelopmentMethodIds.join(",")) {
        throw new Error(`Sealed comparison plans must contain exactly ${expectedDevelopmentMethodIds.join(" and ")} methods`);
    }
    const reference = [...(schedules.get(methodIds[0]) ?? [])].sort();
    for (const methodId of methodIds) {
        const actual = [...(schedules.get(methodId) ?? [])].sort();
        if (actual.length !== reference.length || actual.some((entry, index) => entry !== reference[index])) {
            throw new Error("Every method in a research plan must receive the identical launched-game schedule");
        }
    }
    const reciprocalGroups = new Map<string, number[]>();
    for (const episode of episodes) {
        const key = `${episode.methodId}|${episode.familyId}|${episode.seedBlockIndex}`;
        const slots = reciprocalGroups.get(key) ?? [];
        slots.push(episode.candidateSlot);
        reciprocalGroups.set(key, slots);
    }
    for (const [key, slots] of reciprocalGroups) {
        if (slots.length !== 2 || [...slots].sort().join(",") !== "0,1") {
            throw new Error(`Research schedule group ${key} must contain exactly reciprocal slots 0 and 1`);
        }
    }
    return {
        schemaVersion: RESEARCH_PLAN_SCHEMA_VERSION,
        runId,
        role,
        purpose,
        sourceGitCommit: expectCommit(value, "sourceGitCommit"),
        sourceRuntimeSha256: expectSha256(value, "sourceRuntimeSha256"),
        baselineGitCommit: expectCommit(value, "baselineGitCommit"),
        baselineRuntimeSha256: expectSha256(value, "baselineRuntimeSha256"),
        gameApiRuntimeSha256: expectSha256(value, "gameApiRuntimeSha256"),
        packageLockSha256: expectSha256(value, "packageLockSha256"),
        roleManifestSha256: expectSha256(value, "roleManifestSha256"),
        roleCommitmentSha256: expectSha256(value, "roleCommitmentSha256"),
        splitCommitmentSha256: expectSha256(value, "splitCommitmentSha256"),
        sourcePopulationCommitmentSha256: expectSha256(value, "sourcePopulationCommitmentSha256"),
        engineSeedBase,
        candidateCountry: Countries.IRAQ,
        baselineCountry: Countries.IRAQ,
        maxTicks: expectSafeInteger(value, "maxTicks", 1, 100_000),
        policies,
        episodes,
    };
};

/**
 * Serialize the strict wire schema rather than the parser's normalized model.
 * Training method IDs are derived from policy IDs and are deliberately absent
 * on disk; development method IDs are explicit design inputs and are retained.
 */
export const serializeResearchRunPlan = (plan: ResearchRunPlan): string => JSON.stringify({
    ...plan,
    episodes: plan.role === "train" ? plan.episodes.map((episode) => ({
        episodeId: episode.episodeId,
        familyId: episode.familyId,
        policyId: episode.policyId,
        seedBlockIndex: episode.seedBlockIndex,
        requestedEngineSeed: episode.requestedEngineSeed,
        candidateSlot: episode.candidateSlot,
    })) : plan.episodes,
}, null, 2);

/**
 * Read historical runner records that serialized the parser-normalized train
 * model instead of the strict wire schema. The only tolerated extra field is
 * a train episode methodId exactly equal to its policyId; everything else is
 * delegated to the same strict parser.
 */
export const parseRecordedResearchRunPlan = (value: unknown): ResearchRunPlan => {
    if (!isRecord(value) || value.role !== "train" || !Array.isArray(value.episodes)) {
        return parseResearchRunPlan(value);
    }
    const episodes = value.episodes.map((raw, index) => {
        if (!isRecord(raw) || !("methodId" in raw)) {
            return raw;
        }
        if (typeof raw.policyId !== "string" || raw.methodId !== raw.policyId) {
            throw new Error(`Recorded train episode ${index} methodId must equal its policyId`);
        }
        const normalized = { ...raw };
        delete normalized.methodId;
        return normalized;
    });
    return parseResearchRunPlan({ ...value, episodes });
};

const parseJsonFile = (filePath: string): unknown => JSON.parse(fs.readFileSync(filePath, "utf8"));

export const loadResearchRole = (plan: ResearchRunPlan, context: StrictPlanContext): LoadedResearchRole => {
    const publicValue = parseJsonFile(context.publicCommitmentsPath);
    if (!isRecord(publicValue) || publicValue.status !== RESEARCH_PUBLIC_ROLE_STATUS) {
        throw new Error("Public family-role commitment artifact is missing or has the wrong status");
    }
    const privateArtifacts = publicValue.privateArtifacts;
    const roleCommitments = publicValue.roleCommitments;
    if (!isRecord(privateArtifacts) || !isRecord(roleCommitments)) {
        throw new Error("Public family-role commitment artifact is incomplete");
    }
    const publicRoleArtifact = privateArtifacts[plan.role];
    if (!isRecord(publicRoleArtifact)) {
        throw new Error(`Public family-role artifact has no ${plan.role} commitment`);
    }
    const expectedRoleFile = `${plan.role}-families.json`;
    if (publicRoleArtifact.file !== expectedRoleFile) {
        throw new Error(`Public role filename is not the fixed ${expectedRoleFile}`);
    }
    const rolePath = path.resolve(context.privateRoleRoot, expectedRoleFile);
    if (path.dirname(rolePath) !== path.resolve(context.privateRoleRoot)) {
        throw new Error("Resolved private role path escapes the private role root");
    }
    const fileSha256 = sha256File(rolePath);
    if (fileSha256 !== publicRoleArtifact.sha256 || fileSha256 !== plan.roleManifestSha256) {
        throw new Error(`Private ${plan.role} role manifest does not match both file commitments`);
    }
    const privateValue = parseJsonFile(rolePath);
    if (!isRecord(privateValue) || privateValue.status !== RESEARCH_ROLE_MANIFEST_STATUS || privateValue.role !== plan.role) {
        throw new Error(`Private role manifest is not a valid ${plan.role} manifest`);
    }
    if (
        privateValue.roleCommitmentSha256 !== roleCommitments[plan.role] ||
        privateValue.roleCommitmentSha256 !== plan.roleCommitmentSha256 ||
        privateValue.splitCommitmentSha256 !== publicValue.splitCommitmentSha256 ||
        privateValue.splitCommitmentSha256 !== plan.splitCommitmentSha256 ||
        privateValue.sourcePopulationCommitmentSha256 !== publicValue.sourcePopulationCommitmentSha256 ||
        privateValue.sourcePopulationCommitmentSha256 !== plan.sourcePopulationCommitmentSha256
    ) {
        throw new Error(`Private ${plan.role} role manifest commitment chain is inconsistent`);
    }
    if (!Array.isArray(privateValue.targets) || privateValue.targets.length !== privateValue.targetCount) {
        throw new Error(`Private ${plan.role} role manifest target count is invalid`);
    }
    const targets: RoleTarget[] = privateValue.targets.map((raw, index) => {
        if (!isRecord(raw) || typeof raw.familyId !== "string" || !isRecord(raw.representative) || !isRecord(raw.descriptors)) {
            throw new Error(`Private ${plan.role} target ${index} has an invalid schema`);
        }
        const representativePath = raw.representative.path;
        const representativeSha256 = raw.representative.sha256;
        if (
            typeof representativePath !== "string" ||
            typeof representativeSha256 !== "string" ||
            !SHA256_PATTERN.test(representativeSha256)
        ) {
            throw new Error(`Private ${plan.role} target ${index} has an invalid representative`);
        }
        const absoluteMapPath = path.resolve(context.repoRoot, representativePath);
        const relativeMapPath = path.relative(path.resolve(context.repoRoot), absoluteMapPath);
        if (relativeMapPath.startsWith("..") || path.isAbsolute(relativeMapPath)) {
            throw new Error(`Private ${plan.role} target ${index} map path escapes the repository`);
        }
        if (sha256File(absoluteMapPath) !== representativeSha256) {
            throw new Error(`Committed map bytes differ for private ${plan.role} target ${index}`);
        }
        return {
            familyId: raw.familyId,
            representative: { path: representativePath, sha256: representativeSha256 },
            descriptors: raw.descriptors,
        };
    });
    if (new Set(targets.map(({ familyId }) => familyId)).size !== targets.length) {
        throw new Error(`Private ${plan.role} role manifest contains duplicate families`);
    }
    return {
        role: plan.role,
        fileSha256,
        roleCommitmentSha256: plan.roleCommitmentSha256,
        splitCommitmentSha256: plan.splitCommitmentSha256,
        sourcePopulationCommitmentSha256: plan.sourcePopulationCommitmentSha256,
        targets,
    };
};

export const materializeEpisodeSpecs = (
    plan: ResearchRunPlan,
    role: LoadedResearchRole,
): ResearchEpisodeSpec[] => {
    if (plan.role !== role.role || plan.roleManifestSha256 !== role.fileSha256) {
        throw new Error("Research plan and loaded role differ");
    }
    const targets = new Map(role.targets.map((target) => [target.familyId, target]));
    const policies = new Map(plan.policies.map((policy) => [policy.policyId, policy.policy]));
    return plan.episodes.map((episode) => {
        const target = targets.get(episode.familyId);
        const policy = policies.get(episode.policyId);
        if (!target) {
            throw new Error(`Episode ${episode.episodeId} family is not in the private ${plan.role} manifest`);
        }
        if (!policy) {
            throw new Error(`Episode ${episode.episodeId} policy is undeclared`);
        }
        return validateResearchEpisodeSpec({
            schemaVersion: RESEARCH_EPISODE_SCHEMA_VERSION,
            episodeId: episode.episodeId,
            familyId: episode.familyId,
            mapName: path.basename(target.representative.path),
            mapSha256: target.representative.sha256,
            policyId: episode.policyId,
            methodId: episode.methodId,
            policy,
            seedBlockIndex: episode.seedBlockIndex,
            requestedEngineSeed: episode.requestedEngineSeed,
            candidateSlot: episode.candidateSlot,
            candidateCountry: plan.candidateCountry,
            baselineCountry: plan.baselineCountry,
            maxTicks: plan.maxTicks,
        });
    });
};

const appendJsonLine = (filePath: string, value: unknown): void => {
    fs.appendFileSync(filePath, `${JSON.stringify(value)}\n`);
};

export type ResearchRunAccounting = {
    generatedAt: string;
    runId: string;
    planBytesSha256: string;
    requestedLaunches: number;
    completed: number;
    technicalFailures: number;
    candidateWins: number;
    baselineWins: number;
    draws: number;
};

export const buildResearchRunSummary = (
    role: ResearchRole,
    accounting: ResearchRunAccounting,
): Record<string, unknown> => {
    const technicalSummary = {
        schemaVersion: 1,
        generatedAt: accounting.generatedAt,
        runId: accounting.runId,
        planBytesSha256: accounting.planBytesSha256,
        requestedLaunches: accounting.requestedLaunches,
        accountedLaunches: accounting.completed + accounting.technicalFailures,
        completed: accounting.completed,
        technicalFailures: accounting.technicalFailures,
        complete: accounting.completed + accounting.technicalFailures === accounting.requestedLaunches,
        technicallyClean: accounting.technicalFailures === 0,
    };
    if (role !== "train") {
        return {
            ...technicalSummary,
            outcomeAccess: "sealed-private-events",
        };
    }
    return {
        ...technicalSummary,
        outcomeAccess: "open-training",
        candidateWins: accounting.candidateWins,
        baselineWins: accounting.baselineWins,
        draws: accounting.draws,
        candidateScoreRate: accounting.completed > 0
            ? (accounting.candidateWins + 0.5 * accounting.draws) / accounting.completed
            : null,
    };
};

const assertRuntimeProvenance = (plan: ResearchRunPlan, manifest: ExperimentManifest): void => {
    if (manifest.source.gitCommit !== plan.sourceGitCommit || manifest.source.gitBranch !== "main") {
        throw new Error("Research plan source commit must equal a clean main-branch checkout");
    }
    if (sourceRuntimeCommitmentSha256(manifest.source.runtimeTrees) !== plan.sourceRuntimeSha256) {
        throw new Error("Research source runtime trees do not match the plan commitment");
    }
    if (manifest.source.trackedDirty !== false) {
        throw new Error("Research execution refuses a tracked-dirty source tree");
    }
    if (manifest.software.baseline.kind !== "external-package") {
        throw new Error("Research execution requires an independently loaded external baseline");
    }
    if (
        manifest.software.baseline.gitCommit !== plan.baselineGitCommit ||
        manifest.software.baseline.trackedDirty !== false ||
        manifest.software.baseline.runtimeTree.sha256 !== plan.baselineRuntimeSha256
    ) {
        throw new Error("External baseline source/runtime does not match the plan commitments");
    }
    if (
        manifest.software.gameApiRuntimeTree.sha256 !== plan.gameApiRuntimeSha256 ||
        manifest.software.packageLockSha256 !== plan.packageLockSha256
    ) {
        throw new Error("Game API runtime or package lock does not match the plan commitments");
    }
    if (manifest.scheduler.jobId === null || manifest.scheduler.account !== "pi_jss233") {
        throw new Error("Outcome-bearing research episodes must run under Slurm account pi_jss233");
    }
};

const gitRoot = (): string => execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();

const requireEnvPath = (name: string): string => {
    const value = process.env[name];
    if (!value) {
        throw new Error(`${name} is required`);
    }
    return path.resolve(value);
};

export type ResearchAccessMode = "standard" | "confirmatory";

export const assertResearchAccessMode = (plan: ResearchRunPlan, accessMode: ResearchAccessMode): void => {
    if (accessMode === "standard" && plan.role === "test") {
        throw new Error("Sealed test plans require the separate confirmatory runner");
    }
    if (accessMode === "confirmatory" && (plan.role !== "test" || plan.purpose !== "confirmatory-evaluation")) {
        throw new Error("The confirmatory runner accepts only sealed test confirmatory-evaluation plans");
    }
};

export const runResearchPlanFromEnvironment = async (accessMode: ResearchAccessMode): Promise<void> => {
    const repoRoot = gitRoot();
    const driverRoot = path.join(repoRoot, "packages", "chronodivide-bot-driver");
    if (path.resolve(process.cwd()) !== driverRoot) {
        throw new Error(`Research runner must start in ${driverRoot}`);
    }
    const planPath = requireEnvPath("RESEARCH_PLAN");
    const privateRoleRoot = requireEnvPath("RESEARCH_PRIVATE_ROLE_ROOT");
    const outDir = requireEnvPath("OUT_DIR");
    if (fs.existsSync(outDir)) {
        throw new Error(`Refusing to reuse existing OUT_DIR ${outDir}`);
    }
    if (!process.env.BASELINE_PACKAGE_ROOT || process.env.REQUIRE_EXTERNAL_BASELINE !== "true") {
        throw new Error("Set BASELINE_PACKAGE_ROOT and REQUIRE_EXTERNAL_BASELINE=true for research execution");
    }
    const planBytesSha256 = sha256File(planPath);
    const plan = parseResearchRunPlan(parseJsonFile(planPath));
    assertResearchAccessMode(plan, accessMode);
    const publicCommitmentsPath = path.join(
        repoRoot,
        "research",
        "artifacts",
        plan.purpose === "development-v2-qc" || plan.purpose === "development-v2-evaluation"
            ? "method_v2_development_role_commitment.json"
            : "family_role_commitments_v1.json",
    );
    const role = loadResearchRole(plan, { publicCommitmentsPath, privateRoleRoot, repoRoot });
    const specs = materializeEpisodeSpecs(plan, role);
    const baselineFactory = await loadBaselineFactory(path.join(repoRoot, "packages", "chronodivide-bot"));
    const mixDir = path.join(driverRoot, "data");
    const mapNames = [...new Set(specs.map(({ mapName }) => mapName))].sort();
    const manifest = createExperimentManifest({
        runId: plan.runId,
        mixDir,
        maps: mapNames,
        effectiveConfig: {
            runner: accessMode === "confirmatory" ? "researchConfirmatoryPlanRunner-v1" : "researchPlanRunner-v1",
            planPath,
            planBytesSha256,
            role: plan.role,
            purpose: plan.purpose,
            roleManifestSha256: role.fileSha256,
            roleCommitmentSha256: role.roleCommitmentSha256,
            splitCommitmentSha256: role.splitCommitmentSha256,
            sourcePopulationCommitmentSha256: role.sourcePopulationCommitmentSha256,
            launchedEpisodeCount: specs.length,
            noRetries: true,
            reciprocalSlotsRequired: true,
            outcomeShaping: false,
            candidateCountry: plan.candidateCountry,
            baselineCountry: plan.baselineCountry,
            maxTicks: plan.maxTicks,
            outcomeAccess: plan.role === "train" ? "open-training" : "sealed-private-events",
        },
        baseline: baselineFactory.descriptor,
        gameSeedBase: plan.engineSeedBase,
    });
    assertRuntimeProvenance(plan, manifest);
    for (const map of manifest.inputs.maps) {
        const committed = specs.find(({ mapName }) => mapName === map.name)?.mapSha256;
        if (!map.exists || map.sha256 !== committed) {
            throw new Error(`Runtime map ${map.name} does not match its private role commitment`);
        }
    }

    fs.mkdirSync(outDir, { recursive: false, mode: 0o700 });
    const manifestPath = path.join(outDir, "manifest.json");
    const eventsPath = path.join(outDir, "events.jsonl");
    const summaryPath = path.join(outDir, "summary.json");
    fs.writeFileSync(manifestPath, JSON.stringify({
        planBytesSha256,
        plan: JSON.parse(serializeResearchRunPlan(plan)),
        manifest,
    }, null, 2), { flag: "wx" });
    fs.writeFileSync(eventsPath, "", { flag: "wx" });
    appendJsonLine(eventsPath, { event: "run_start", planBytesSha256, launchedEpisodeCount: specs.length });

    await (await import("@chronodivide/game-api")).cdapi.init(mixDir);
    let completed = 0;
    let technicalFailures = 0;
    let candidateWins = 0;
    let baselineWins = 0;
    let draws = 0;
    for (let launchIndex = 0; launchIndex < specs.length; launchIndex++) {
        const spec = specs[launchIndex];
        appendJsonLine(eventsPath, {
            event: "launch_counted",
            launchIndex,
            episodeId: spec.episodeId,
            familyId: spec.familyId,
            policyId: spec.policyId,
            methodId: spec.methodId,
            seedBlockIndex: spec.seedBlockIndex,
            requestedEngineSeed: spec.requestedEngineSeed,
            candidateSlot: spec.candidateSlot,
        });
        try {
            const result = await runResearchEpisode(spec, baselineFactory);
            completed++;
            candidateWins += result.winner === "candidate" ? 1 : 0;
            baselineWins += result.winner === "baseline" ? 1 : 0;
            draws += result.winner === "draw" ? 1 : 0;
            appendJsonLine(eventsPath, { event: "episode_complete", launchIndex, result });
        } catch (error) {
            technicalFailures++;
            appendJsonLine(eventsPath, {
                event: "technical_failure",
                launchIndex,
                episodeId: spec.episodeId,
                error: {
                    name: error instanceof Error ? error.name : "Error",
                    message: error instanceof Error ? error.message : String(error),
                    stack: error instanceof Error ? error.stack : null,
                },
            });
        }
    }
    const summary = buildResearchRunSummary(plan.role, {
        generatedAt: new Date().toISOString(),
        runId: plan.runId,
        planBytesSha256,
        requestedLaunches: specs.length,
        completed,
        technicalFailures,
        candidateWins,
        baselineWins,
        draws,
    });
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2), { flag: "wx" });
    appendJsonLine(eventsPath, { event: "run_complete", summary });
    console.log(JSON.stringify(summary));
    if (technicalFailures > 0) {
        process.exitCode = 2;
    }
};

const invokedModuleUrl = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;

if (import.meta.url === invokedModuleUrl) {
    runResearchPlanFromEnvironment("standard").catch((error) => {
        console.error(error);
        process.exitCode = 1;
    });
}
