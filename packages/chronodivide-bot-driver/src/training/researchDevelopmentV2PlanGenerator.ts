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
import {
    DEFAULT_RESEARCH_POLICY,
    parseResearchPolicy,
    researchPolicySha256,
} from "./researchPolicy.js";

export const RESEARCH_DEVELOPMENT_V2_SCHEMA_VERSION = 1 as const;
export const RESEARCH_DEVELOPMENT_V2_ENGINE_SEED_BASE = 50_000_000 as const;
export const RESEARCH_DEVELOPMENT_V2_MAX_TICKS = 18_000 as const;
export const RESEARCH_DEVELOPMENT_V2_CHAMPION_ARTIFACT_SHA256 =
    "40a53c142fa30725ea5d22032d4b6dfcda4f358e15e1b8d36ac6a102b76e9ee1" as const;
export const RESEARCH_DEVELOPMENT_V2_CHAMPION_POLICY_ID =
    "ab0071009cbd5f1fc9e2f1a76a562455a0ebeacf77dac1cd9c13b9fc6374203f" as const;
export const RESEARCH_DEVELOPMENT_V2_ROLE_ARTIFACT_SHA256 =
    "80a7f04739b06480cf2c7c9aa5ac6466c47bd69952c6ccc6207a238b94a4c59b" as const;

export type ResearchDevelopmentV2Phase =
    | "development-v2-phase1"
    | "development-v2-phase2"
    | "development-v2-phase3";

export type DevelopmentV2Target = {
    familyId: string;
    representative: { path: string; sha256: string };
    descriptors: Record<string, unknown>;
    poolSource: "original-reserve" | "fidelity-review";
    diagnosticRole: "primary" | "substitute";
    substituteOrder: number | null;
    rankSha256: string;
};

type DevelopmentV2Role = {
    fileSha256: string;
    roleCommitmentSha256: string;
    splitCommitmentSha256: string;
    sourcePopulationCommitmentSha256: string;
    poolCommitmentSha256: string;
    adjudicationCommitmentSha256: string;
    targets: DevelopmentV2Target[];
};

export type ResearchDevelopmentV2Campaign = {
    schemaVersion: typeof RESEARCH_DEVELOPMENT_V2_SCHEMA_VERSION;
    phase: ResearchDevelopmentV2Phase;
    sourceGitCommit: string;
    generatedAt: string;
    outcomeAccess: "sealed-private-events";
    selectionRule: string;
    maxTicks: typeof RESEARCH_DEVELOPMENT_V2_MAX_TICKS;
    engineSeedBase: typeof RESEARCH_DEVELOPMENT_V2_ENGINE_SEED_BASE;
    sourceRuntimeSha256: string;
    baselineGitCommit: string;
    baselineRuntimeSha256: string;
    gameApiRuntimeSha256: string;
    packageLockSha256: string;
    roleManifestSha256: string;
    roleCommitmentSha256: string;
    splitCommitmentSha256: string;
    sourcePopulationCommitmentSha256: string;
    poolCommitmentSha256: string;
    adjudicationCommitmentSha256: string;
    championArtifactPath: string;
    championArtifactSha256: typeof RESEARCH_DEVELOPMENT_V2_CHAMPION_ARTIFACT_SHA256;
    championTrainingSourceGitCommit: string;
    championPolicyId: typeof RESEARCH_DEVELOPMENT_V2_CHAMPION_POLICY_ID;
    defaultPolicyId: string;
    priorTechnicalGate: {
        path: string;
        sha256: string;
        phase: "development-v2-phase1" | "development-v2-phase2";
        authorizedNextPhase: "development-v2-phase2" | "development-v2-phase3";
    } | null;
    familyCount: number;
    shardCount: number;
    launchedGameCount: number;
    selectedFamilies: Array<{
        familyId: string;
        diagnosticRole: "primary" | "substitute";
        representativeSha256: string;
        poolSource: "original-reserve" | "fidelity-review";
    }>;
    policies: ResearchPlanPolicy[];
    shards: Array<{
        shardIndex: number;
        planFile: string;
        planSha256: string;
        runId: string;
        familyId: string;
        seedBlockIndex: number;
        seedOrdinal: number;
        freshProcessRepeat: number;
        launchedGameCount: 4;
    }>;
};

type ShardDesign = {
    familyId: string;
    seedBlockIndex: number;
    seedOrdinal: number;
    freshProcessRepeat: number;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null && !Array.isArray(value);

const requiredPath = (name: string): string => {
    const value = process.env[name];
    if (!value) {
        throw new Error(`${name} is required`);
    }
    return path.resolve(value);
};

const gitRoot = (): string => execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();

const deterministicRank = (domain: string, familyId: string): string => crypto
    .createHash("sha256")
    .update(`${domain}\0${familyId}`)
    .digest("hex");

const phaseFromEnvironment = (): ResearchDevelopmentV2Phase => {
    const value = process.env.DEVELOPMENT_V2_PHASE;
    if (
        value !== "development-v2-phase1" &&
        value !== "development-v2-phase2" &&
        value !== "development-v2-phase3"
    ) {
        throw new Error("DEVELOPMENT_V2_PHASE must be development-v2-phase1, phase2, or phase3");
    }
    return value;
};

const loadRole = (repoRoot: string, privateRoot: string): DevelopmentV2Role => {
    const publicPath = path.join(repoRoot, "research", "artifacts", "method_v2_development_role_commitment.json");
    const publicValue = JSON.parse(fs.readFileSync(publicPath, "utf8")) as Record<string, unknown>;
    if (
        publicValue.status !== "FROZEN_FAMILY_ROLE_COMMITMENTS_IDENTITIES_PRIVATE" ||
        publicValue.methodVersion !== 2 ||
        !isRecord(publicValue.privateArtifacts) ||
        !isRecord(publicValue.roleCommitments)
    ) {
        throw new Error("Method-v2 public development role commitment is invalid");
    }
    const descriptor = publicValue.privateArtifacts.development;
    if (!isRecord(descriptor) || descriptor.file !== "development-families.json") {
        throw new Error("Method-v2 private development artifact descriptor is invalid");
    }
    const privatePath = path.resolve(privateRoot, "development-families.json");
    const fileSha256 = sha256File(privatePath);
    if (fileSha256 !== descriptor.sha256 || fileSha256 !== RESEARCH_DEVELOPMENT_V2_ROLE_ARTIFACT_SHA256) {
        throw new Error("Method-v2 private development role differs from both commitments");
    }
    const value = JSON.parse(fs.readFileSync(privatePath, "utf8")) as Record<string, unknown>;
    if (
        value.status !== "PRIVATE_FAMILY_ROLE_MANIFEST_NO_POLICY_OUTCOMES" ||
        value.methodVersion !== 2 ||
        value.role !== "development" ||
        value.outcomeBlind !== true ||
        value.targetCount !== 11 ||
        value.primaryCount !== 10 ||
        value.substituteCount !== 1 ||
        !Array.isArray(value.targets) ||
        value.targets.length !== 11
    ) {
        throw new Error("Method-v2 private development role has invalid frozen dimensions");
    }
    const targets = value.targets.map((raw, index): DevelopmentV2Target => {
        if (
            !isRecord(raw) ||
            typeof raw.familyId !== "string" ||
            !isRecord(raw.representative) ||
            !isRecord(raw.descriptors) ||
            (raw.poolSource !== "original-reserve" && raw.poolSource !== "fidelity-review") ||
            (raw.diagnosticRole !== "primary" && raw.diagnosticRole !== "substitute") ||
            typeof raw.rankSha256 !== "string"
        ) {
            throw new Error(`Method-v2 development target ${index} is malformed`);
        }
        const representativePath = raw.representative.path;
        const representativeSha256 = raw.representative.sha256;
        if (typeof representativePath !== "string" || typeof representativeSha256 !== "string") {
            throw new Error(`Method-v2 development target ${index} representative is malformed`);
        }
        const absoluteMap = path.resolve(repoRoot, representativePath);
        if (sha256File(absoluteMap) !== representativeSha256) {
            throw new Error(`Method-v2 development target ${index} map bytes changed`);
        }
        return {
            familyId: raw.familyId,
            representative: { path: representativePath, sha256: representativeSha256 },
            descriptors: raw.descriptors,
            poolSource: raw.poolSource,
            diagnosticRole: raw.diagnosticRole,
            substituteOrder: raw.substituteOrder === null ? null : Number(raw.substituteOrder),
            rankSha256: raw.rankSha256,
        };
    });
    if (
        new Set(targets.map(({ familyId }) => familyId)).size !== 11 ||
        targets.filter(({ diagnosticRole }) => diagnosticRole === "primary").length !== 10 ||
        targets.filter(({ diagnosticRole }) => diagnosticRole === "substitute").length !== 1
    ) {
        throw new Error("Method-v2 development targets are duplicated or role counts drifted");
    }
    const stringField = (key: string): string => {
        const field = value[key];
        if (typeof field !== "string" || field !== publicValue[key]) {
            throw new Error(`Method-v2 role ${key} is missing or differs from its public commitment`);
        }
        return field;
    };
    const roleCommitmentSha256 = value.roleCommitmentSha256;
    if (typeof roleCommitmentSha256 !== "string" || roleCommitmentSha256 !== publicValue.roleCommitments.development) {
        throw new Error("Method-v2 role commitment differs from the public artifact");
    }
    return {
        fileSha256,
        roleCommitmentSha256,
        splitCommitmentSha256: stringField("splitCommitmentSha256"),
        sourcePopulationCommitmentSha256: stringField("sourcePopulationCommitmentSha256"),
        poolCommitmentSha256: stringField("poolCommitmentSha256"),
        adjudicationCommitmentSha256: stringField("adjudicationCommitmentSha256"),
        targets,
    };
};

const loadChampion = (artifactPath: string): { policy: ResearchPlanPolicy; sourceGitCommit: string } => {
    if (sha256File(artifactPath) !== RESEARCH_DEVELOPMENT_V2_CHAMPION_ARTIFACT_SHA256) {
        throw new Error("Method-v2 champion artifact differs from its frozen SHA-256");
    }
    const value = JSON.parse(fs.readFileSync(artifactPath, "utf8")) as Record<string, unknown>;
    if (
        value.schemaVersion !== 1 ||
        value.kind !== "method-v2-champion" ||
        typeof value.sourceGitCommit !== "string" ||
        !isRecord(value.championPolicy)
    ) {
        throw new Error("Method-v2 champion artifact has an invalid schema");
    }
    const policy = parseResearchPolicy(value.championPolicy.policy);
    if (
        value.championPolicy.policyId !== RESEARCH_DEVELOPMENT_V2_CHAMPION_POLICY_ID ||
        researchPolicySha256(policy) !== RESEARCH_DEVELOPMENT_V2_CHAMPION_POLICY_ID
    ) {
        throw new Error("Method-v2 champion policy differs from its frozen identity");
    }
    return {
        policy: { policyId: RESEARCH_DEVELOPMENT_V2_CHAMPION_POLICY_ID, policy },
        sourceGitCommit: value.sourceGitCommit,
    };
};

const loadPriorGate = (
    phase: ResearchDevelopmentV2Phase,
    role: DevelopmentV2Role,
    defaultPolicyId: string,
): { gate: Record<string, unknown>; commitment: NonNullable<ResearchDevelopmentV2Campaign["priorTechnicalGate"]> } | null => {
    if (phase === "development-v2-phase1") {
        return null;
    }
    const gatePath = requiredPath("PRIOR_TECHNICAL_GATE");
    const gate = JSON.parse(fs.readFileSync(gatePath, "utf8")) as Record<string, unknown>;
    const expectedPrior = phase === "development-v2-phase2" ? "development-v2-phase1" : "development-v2-phase2";
    const expectedNext = phase;
    if (
        gate.schemaVersion !== 1 ||
        gate.status !== "PASSED_TECHNICAL_ONLY_NO_OUTCOMES_INSPECTED" ||
        gate.phase !== expectedPrior ||
        gate.authorizedNextPhase !== expectedNext ||
        gate.roleManifestSha256 !== role.fileSha256 ||
        gate.roleCommitmentSha256 !== role.roleCommitmentSha256 ||
        gate.splitCommitmentSha256 !== role.splitCommitmentSha256 ||
        gate.sourcePopulationCommitmentSha256 !== role.sourcePopulationCommitmentSha256 ||
        gate.poolCommitmentSha256 !== role.poolCommitmentSha256 ||
        gate.championArtifactSha256 !== RESEARCH_DEVELOPMENT_V2_CHAMPION_ARTIFACT_SHA256 ||
        gate.championPolicyId !== RESEARCH_DEVELOPMENT_V2_CHAMPION_POLICY_ID ||
        gate.defaultPolicyId !== defaultPolicyId
    ) {
        throw new Error(`Prior technical gate does not authorize ${phase}`);
    }
    return {
        gate,
        commitment: {
            path: gatePath,
            sha256: sha256File(gatePath),
            phase: expectedPrior,
            authorizedNextPhase: expectedNext,
        },
    };
};

export const buildDevelopmentV2Design = (
    phase: ResearchDevelopmentV2Phase,
    targets: DevelopmentV2Target[],
    activeFamilyIds?: string[],
): ShardDesign[] => {
    const primary = targets.filter(({ diagnosticRole }) => diagnosticRole === "primary");
    let selected: DevelopmentV2Target[];
    if (phase === "development-v2-phase1") {
        selected = [...primary].sort((left, right) =>
            deterministicRank("chrono-divide-method-v2-phase1-v1", left.familyId).localeCompare(
                deterministicRank("chrono-divide-method-v2-phase1-v1", right.familyId),
            ),
        ).slice(0, 4);
    } else if (phase === "development-v2-phase2") {
        selected = [...targets];
    } else {
        if (!activeFamilyIds || activeFamilyIds.length !== 10 || new Set(activeFamilyIds).size !== 10) {
            throw new Error("Phase 3 requires exactly ten active family IDs from the phase-2 technical gate");
        }
        const targetById = new Map(targets.map((target) => [target.familyId, target]));
        selected = activeFamilyIds.map((familyId) => {
            const target = targetById.get(familyId);
            if (!target) {
                throw new Error("Phase-2 gate authorized a family outside the frozen method-v2 role");
            }
            return target;
        });
    }
    const design: ShardDesign[] = [];
    if (phase === "development-v2-phase1") {
        selected.forEach((target, rank) => {
            for (const freshProcessRepeat of [0, 1]) {
                design.push({ familyId: target.familyId, seedBlockIndex: 100 + rank, seedOrdinal: 0, freshProcessRepeat });
            }
        });
    } else if (phase === "development-v2-phase2") {
        selected.forEach((target, rank) => {
            for (const seedOrdinal of [0, 1]) {
                design.push({
                    familyId: target.familyId,
                    seedBlockIndex: 1_000 + 2 * rank + seedOrdinal,
                    seedOrdinal,
                    freshProcessRepeat: 0,
                });
            }
        });
    } else {
        selected.forEach((target, rank) => {
            for (let seedOrdinal = 0; seedOrdinal < 8; seedOrdinal++) {
                design.push({
                    familyId: target.familyId,
                    seedBlockIndex: 2_000 + 8 * rank + seedOrdinal,
                    seedOrdinal,
                    freshProcessRepeat: 0,
                });
            }
        });
    }
    const expected = phase === "development-v2-phase1" ? 8 : phase === "development-v2-phase2" ? 22 : 80;
    if (design.length !== expected) {
        throw new Error(`Method-v2 ${phase} shard count drifted from ${expected}`);
    }
    return design;
};

const main = async (): Promise<void> => {
    const repoRoot = gitRoot();
    const driverRoot = path.join(repoRoot, "packages", "chronodivide-bot-driver");
    if (path.resolve(process.cwd()) !== driverRoot) {
        throw new Error(`Method-v2 development generator must start in ${driverRoot}`);
    }
    if (!process.env.BASELINE_PACKAGE_ROOT || process.env.REQUIRE_EXTERNAL_BASELINE !== "true") {
        throw new Error("Set BASELINE_PACKAGE_ROOT and REQUIRE_EXTERNAL_BASELINE=true");
    }
    const phase = phaseFromEnvironment();
    const outRoot = requiredPath("OUT_ROOT");
    if (fs.existsSync(outRoot)) {
        throw new Error(`Refusing to reuse OUT_ROOT ${outRoot}`);
    }
    const privateRoleRoot = requiredPath("RESEARCH_PRIVATE_ROLE_ROOT");
    const championArtifactPath = requiredPath("CHAMPION_ARTIFACT");
    const role = loadRole(repoRoot, privateRoleRoot);
    const champion = loadChampion(championArtifactPath);
    const defaultPolicy: ResearchPlanPolicy = {
        policyId: researchPolicySha256(DEFAULT_RESEARCH_POLICY),
        policy: parseResearchPolicy(DEFAULT_RESEARCH_POLICY),
    };
    if (defaultPolicy.policyId === champion.policy.policyId) {
        throw new Error("Method-v2 champion unexpectedly equals the frozen default policy");
    }
    const prior = loadPriorGate(phase, role, defaultPolicy.policyId);
    const activeFamilyIds = phase === "development-v2-phase3"
        ? prior?.gate.activeFamilyIds
        : undefined;
    if (activeFamilyIds !== undefined && (!Array.isArray(activeFamilyIds) || activeFamilyIds.some((value) => typeof value !== "string"))) {
        throw new Error("Phase-2 gate activeFamilyIds are malformed");
    }
    const design = buildDevelopmentV2Design(phase, role.targets, activeFamilyIds as string[] | undefined);
    const targetById = new Map(role.targets.map((target) => [target.familyId, target]));
    const policies = [defaultPolicy, champion.policy];

    const baselineFactory = await loadBaselineFactory(path.join(repoRoot, "packages", "chronodivide-bot"));
    const generationManifest = createExperimentManifest({
        runId: `plan-${phase}`,
        mixDir: path.join(driverRoot, "data"),
        maps: [],
        effectiveConfig: { phase, outcomeAccess: "sealed-private-events", methodIds: ["champion", "default"] },
        baseline: baselineFactory.descriptor,
        gameSeedBase: RESEARCH_DEVELOPMENT_V2_ENGINE_SEED_BASE,
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
        throw new Error("Method-v2 development generation requires clean committed source and baseline runtimes");
    }
    if (prior && prior.gate.gateSourceGitCommit !== generationManifest.source.gitCommit) {
        throw new Error("Method-v2 development phases must use one unchanged source commit");
    }

    fs.mkdirSync(outRoot, { recursive: false, mode: 0o700 });
    const plansRoot = path.join(outRoot, "plans");
    fs.mkdirSync(plansRoot, { mode: 0o700 });
    const sourceShort = generationManifest.source.gitCommit.slice(0, 10);
    const shards: ResearchDevelopmentV2Campaign["shards"] = [];
    for (let shardIndex = 0; shardIndex < design.length; shardIndex++) {
        const row = design[shardIndex];
        const target = targetById.get(row.familyId);
        if (!target) {
            throw new Error(`Design family ${row.familyId} is absent from the frozen role`);
        }
        const runId = `development-v2-${phase.slice(-6)}-shard${String(shardIndex).padStart(3, "0")}-${sourceShort}`;
        const requestedEngineSeed = derivePairedEngineSeed(
            RESEARCH_DEVELOPMENT_V2_ENGINE_SEED_BASE,
            row.seedBlockIndex,
        );
        const episodes = ([
            { methodId: "default", policy: defaultPolicy },
            { methodId: "champion", policy: champion.policy },
        ] as const).flatMap(({ methodId, policy }) => ([0, 1] as const).map((candidateSlot) => ({
            episodeId: `${methodId}-b${row.seedBlockIndex}-r${row.freshProcessRepeat}-s${candidateSlot}`,
            familyId: target.familyId,
            methodId,
            policyId: policy.policyId,
            seedBlockIndex: row.seedBlockIndex,
            requestedEngineSeed,
            candidateSlot,
        })));
        const plan: ResearchRunPlan = parseResearchRunPlan({
            schemaVersion: 1,
            runId,
            role: "development",
            purpose: phase === "development-v2-phase3" ? "development-v2-evaluation" : "development-v2-qc",
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
            engineSeedBase: RESEARCH_DEVELOPMENT_V2_ENGINE_SEED_BASE,
            candidateCountry: Countries.IRAQ,
            baselineCountry: Countries.IRAQ,
            maxTicks: RESEARCH_DEVELOPMENT_V2_MAX_TICKS,
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
            seedBlockIndex: row.seedBlockIndex,
            seedOrdinal: row.seedOrdinal,
            freshProcessRepeat: row.freshProcessRepeat,
            launchedGameCount: 4,
        });
    }
    const selectedIds = [...new Set(design.map(({ familyId }) => familyId))];
    const selectedFamilies = selectedIds.map((familyId) => {
        const target = targetById.get(familyId) as DevelopmentV2Target;
        return {
            familyId,
            diagnosticRole: target.diagnosticRole,
            representativeSha256: target.representative.sha256,
            poolSource: target.poolSource,
        };
    });
    const launchedGameCount = shards.length * 4;
    const expectedLaunches = phase === "development-v2-phase1" ? 32 : phase === "development-v2-phase2" ? 88 : 320;
    if (launchedGameCount !== expectedLaunches) {
        throw new Error(`Method-v2 ${phase} launch count drifted from ${expectedLaunches}`);
    }
    const campaign: ResearchDevelopmentV2Campaign = {
        schemaVersion: RESEARCH_DEVELOPMENT_V2_SCHEMA_VERSION,
        phase,
        sourceGitCommit: generationManifest.source.gitCommit,
        generatedAt: new Date().toISOString(),
        outcomeAccess: "sealed-private-events",
        selectionRule: "Frozen method-v2 fresh-development protocol; no outcome-dependent family, seed, or method selection.",
        maxTicks: RESEARCH_DEVELOPMENT_V2_MAX_TICKS,
        engineSeedBase: RESEARCH_DEVELOPMENT_V2_ENGINE_SEED_BASE,
        sourceRuntimeSha256: sourceRuntimeCommitmentSha256(generationManifest.source.runtimeTrees),
        baselineGitCommit: generationManifest.software.baseline.gitCommit,
        baselineRuntimeSha256: generationManifest.software.baseline.runtimeTree.sha256,
        gameApiRuntimeSha256: generationManifest.software.gameApiRuntimeTree.sha256,
        packageLockSha256: generationManifest.software.packageLockSha256,
        roleManifestSha256: role.fileSha256,
        roleCommitmentSha256: role.roleCommitmentSha256,
        splitCommitmentSha256: role.splitCommitmentSha256,
        sourcePopulationCommitmentSha256: role.sourcePopulationCommitmentSha256,
        poolCommitmentSha256: role.poolCommitmentSha256,
        adjudicationCommitmentSha256: role.adjudicationCommitmentSha256,
        championArtifactPath,
        championArtifactSha256: RESEARCH_DEVELOPMENT_V2_CHAMPION_ARTIFACT_SHA256,
        championTrainingSourceGitCommit: champion.sourceGitCommit,
        championPolicyId: RESEARCH_DEVELOPMENT_V2_CHAMPION_POLICY_ID,
        defaultPolicyId: defaultPolicy.policyId,
        priorTechnicalGate: prior?.commitment ?? null,
        familyCount: selectedFamilies.length,
        shardCount: shards.length,
        launchedGameCount,
        selectedFamilies,
        policies,
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
        phase,
        familyCount: campaign.familyCount,
        shardCount: campaign.shardCount,
        launchedGameCount,
        championPolicyId: campaign.championPolicyId,
        defaultPolicyId: campaign.defaultPolicyId,
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
