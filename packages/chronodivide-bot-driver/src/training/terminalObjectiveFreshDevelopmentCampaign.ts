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
    LITERAL_BUILDING_ELIMINATION_ENDPOINT_SHA256,
    LITERAL_BUILDING_ELIMINATION_ENDPOINT_VERSION,
} from "./literalBuildingEliminationEndpoint.js";
import {
    TerminalObjectiveArm,
    buildTerminalObjectiveArms,
} from "./terminalObjectivePolicy.js";
import {
    TERMINAL_FRESH_DEVELOPMENT_PLAN_KIND,
    TERMINAL_FRESH_DEVELOPMENT_PLAN_SCHEMA_VERSION,
    TerminalFreshDevelopmentRunPlan,
    parseTerminalFreshDevelopmentRunPlan,
    serializeTerminalFreshDevelopmentRunPlan,
    sha256File,
} from "./terminalObjectiveFreshDevelopmentPlanRunner.js";

export const TERMINAL_FRESH_DEVELOPMENT_ENGINE_SEED_BASE = 4_050_000_000 as const;
export const TERMINAL_FRESH_DEVELOPMENT_MAX_TICKS = 24_000 as const;
export const TERMINAL_FRESH_DEVELOPMENT_FAMILY_COUNT = 10 as const;
export const TERMINAL_FRESH_DEVELOPMENT_SEEDS_PER_CELL = 4 as const;
export const TERMINAL_FRESH_DEVELOPMENT_SHARD_COUNT = 360 as const;
export const TERMINAL_FRESH_DEVELOPMENT_LAUNCH_COUNT = 720 as const;
export const TERMINAL_FRESH_DEVELOPMENT_OPEN_ANALYSIS_STATUS =
    "ADVANCE_TERMINAL_OBJECTIVE_TO_CONFIRMATORY_DESIGN" as const;
export const TERMINAL_FRESH_DEVELOPMENT_OPEN_CAMPAIGN_SHA256 =
    "bc15d6e83df8d3cdaa03eac92e6dea1ec7477727e54c25ef8ba2e9bc9630509e" as const;
export const TERMINAL_FRESH_DEVELOPMENT_PROTOCOL_SHA256 =
    "a828f5ff34582eef102a98819b9fadce70c0054feff78354945f5f122f744597" as const;
export const TERMINAL_FRESH_DEVELOPMENT_PUBLIC_ROLE_SHA256 =
    "ab778395def5e69730c7772b0af5e9f767c96d1ea8699ef0e56e644521fc61a8" as const;
export const TERMINAL_FRESH_DEVELOPMENT_PRIVATE_ROLE_SHA256 =
    "3460b82487b9a5e0f5bce7ba68d75babfb08a1d43a2e51f11eebcbba95079c98" as const;
export const TERMINAL_FRESH_DEVELOPMENT_CANDIDATE_POLICY_ID =
    "438f059f4723242947fefa4e79ef28f22c35a1717ccd361accf8472329db5e95" as const;

export const TERMINAL_FRESH_DEVELOPMENT_COUNTRIES = [
    Countries.USA, Countries.KOREA, Countries.FRANCE, Countries.GERMANY,
    Countries.GREAT_BRITAIN, Countries.LIBYA, Countries.IRAQ, Countries.CUBA,
    Countries.RUSSIA,
] as const;

type RecordValue = Record<string, unknown>;
const isRecord = (value: unknown): value is RecordValue =>
    typeof value === "object" && value !== null && !Array.isArray(value);
const requiredPath = (name: string): string => {
    const value = process.env[name];
    if (!value) throw new Error(`${name} is required`);
    return path.resolve(value);
};
const gitRoot = (): string => execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
const sha256Text = (value: string): string => crypto.createHash("sha256").update(value).digest("hex");
const runtimeCommitment = (trees: ReturnType<typeof createExperimentManifest>["source"]["runtimeTrees"]): string =>
    sha256Text(JSON.stringify(trees));

export type TerminalFreshDevelopmentFamily = {
    familyId: string;
    mapName: string;
    mapSha256: string;
    ordinal: number;
};

export type TerminalFreshDevelopmentCampaign = {
    schemaVersion: 1;
    kind: "terminal-objective-fresh-development-literal-endpoint";
    status: "FROZEN_TERMINAL_OBJECTIVE_FRESH_DEVELOPMENT_ENDPOINT_V5";
    generatedAt: string;
    sourceGitCommit: string;
    sourceRuntimeSha256: string;
    baselineGitCommit: string;
    baselineRuntimeSha256: string;
    gameApiRuntimeSha256: string;
    packageLockSha256: string;
    authorizationAnalysisPath: string;
    authorizationAnalysisSha256: string;
    sourceOpenCampaignPath: string;
    sourceOpenCampaignSha256: typeof TERMINAL_FRESH_DEVELOPMENT_OPEN_CAMPAIGN_SHA256;
    protocolPath: string;
    protocolSha256: typeof TERMINAL_FRESH_DEVELOPMENT_PROTOCOL_SHA256;
    publicRolePath: string;
    publicRoleSha256: typeof TERMINAL_FRESH_DEVELOPMENT_PUBLIC_ROLE_SHA256;
    privateRolePath: string;
    privateRoleSha256: typeof TERMINAL_FRESH_DEVELOPMENT_PRIVATE_ROLE_SHA256;
    outcomeAccess: "single-scheduled-fresh-development-unblinding";
    familyCount: typeof TERMINAL_FRESH_DEVELOPMENT_FAMILY_COUNT;
    countryCount: 9;
    seedBlocksPerCell: typeof TERMINAL_FRESH_DEVELOPMENT_SEEDS_PER_CELL;
    reciprocalSlotCount: 2;
    shardCount: typeof TERMINAL_FRESH_DEVELOPMENT_SHARD_COUNT;
    launchedGameCount: typeof TERMINAL_FRESH_DEVELOPMENT_LAUNCH_COUNT;
    engineSeedBase: typeof TERMINAL_FRESH_DEVELOPMENT_ENGINE_SEED_BASE;
    maxTicks: typeof TERMINAL_FRESH_DEVELOPMENT_MAX_TICKS;
    endpointVersion: typeof LITERAL_BUILDING_ELIMINATION_ENDPOINT_VERSION;
    endpointSha256: typeof LITERAL_BUILDING_ELIMINATION_ENDPOINT_SHA256;
    candidate: TerminalObjectiveArm;
    countries: readonly Countries[];
    families: TerminalFreshDevelopmentFamily[];
    shards: Array<{
        shardIndex: number;
        planFile: string;
        planSha256: string;
        runId: string;
        familyId: string;
        mapName: string;
        mapSha256: string;
        country: Countries;
        familyOrdinal: number;
        countryOrdinal: number;
        seedOrdinal: number;
        seedBlockIndex: number;
        requestedEngineSeed: number;
        launchedGameCount: 2;
    }>;
};

export const parseTerminalFreshDevelopmentFamilies = (
    value: unknown,
    repoRoot: string,
): TerminalFreshDevelopmentFamily[] => {
    if (
        !isRecord(value) || value.schemaVersion !== 1 || value.role !== "development" || value.outcomeBlind !== true ||
        value.status !== "PRIVATE_FROZEN_METHOD_V6_FRESH_ROLE_NO_POLICY_OUTCOMES" || value.targetCount !== 10 ||
        !Array.isArray(value.targets) || value.targets.length !== TERMINAL_FRESH_DEVELOPMENT_FAMILY_COUNT
    ) throw new Error("Fresh-development private role artifact is invalid");
    const families = value.targets.map((raw, index): TerminalFreshDevelopmentFamily => {
        if (
            !isRecord(raw) || typeof raw.familyId !== "string" || raw.familyId.length === 0 ||
            typeof raw.mapName !== "string" || path.basename(raw.mapName) !== raw.mapName ||
            typeof raw.mapSha256 !== "string" || !/^[0-9a-f]{64}$/.test(raw.mapSha256) || raw.ordinal !== index ||
            typeof raw.representativeMapPath !== "string"
        ) throw new Error(`Fresh-development role target ${index} is malformed`);
        const mapPath = path.isAbsolute(raw.representativeMapPath)
            ? path.resolve(raw.representativeMapPath)
            : path.resolve(repoRoot, raw.representativeMapPath);
        const dataRoot = path.join(repoRoot, "packages", "chronodivide-bot-driver", "data") + path.sep;
        if (!mapPath.startsWith(dataRoot) || path.basename(mapPath) !== raw.mapName || !fs.existsSync(mapPath) ||
            sha256File(mapPath) !== raw.mapSha256) throw new Error(`Fresh-development map ${index} drifted`);
        return { familyId: raw.familyId, mapName: raw.mapName, mapSha256: raw.mapSha256, ordinal: index };
    });
    if (
        new Set(families.map(({ familyId }) => familyId)).size !== families.length ||
        new Set(families.map(({ mapSha256 }) => mapSha256)).size !== families.length
    ) throw new Error("Fresh-development family identities are not unique");
    return families;
};

const main = async (): Promise<void> => {
    const repoRoot = gitRoot();
    const driverRoot = path.join(repoRoot, "packages", "chronodivide-bot-driver");
    if (path.resolve(process.cwd()) !== driverRoot) throw new Error(`Generator must start in ${driverRoot}`);
    if (!process.env.BASELINE_PACKAGE_ROOT || process.env.REQUIRE_EXTERNAL_BASELINE !== "true") {
        throw new Error("Fresh development requires the pinned external baseline environment");
    }
    const authorizationAnalysisPath = requiredPath("TERMINAL_FRESH_AUTHORIZATION_ANALYSIS");
    const sourceOpenCampaignPath = requiredPath("TERMINAL_FRESH_OPEN_CAMPAIGN");
    const protocolPath = requiredPath("TERMINAL_FRESH_PROTOCOL");
    const publicRolePath = requiredPath("TERMINAL_FRESH_PUBLIC_ROLE");
    const privateRolePath = requiredPath("TERMINAL_FRESH_PRIVATE_ROLE");
    const outRoot = requiredPath("OUT_ROOT");
    if (fs.existsSync(outRoot)) throw new Error(`Refusing to reuse OUT_ROOT ${outRoot}`);
    if (
        sha256File(sourceOpenCampaignPath) !== TERMINAL_FRESH_DEVELOPMENT_OPEN_CAMPAIGN_SHA256 ||
        sha256File(protocolPath) !== TERMINAL_FRESH_DEVELOPMENT_PROTOCOL_SHA256 ||
        sha256File(publicRolePath) !== TERMINAL_FRESH_DEVELOPMENT_PUBLIC_ROLE_SHA256 ||
        sha256File(privateRolePath) !== TERMINAL_FRESH_DEVELOPMENT_PRIVATE_ROLE_SHA256
    ) throw new Error("Fresh-development source or role commitment drifted");
    const authorization = JSON.parse(fs.readFileSync(authorizationAnalysisPath, "utf8")) as RecordValue;
    if (
        authorization.status !== TERMINAL_FRESH_DEVELOPMENT_OPEN_ANALYSIS_STATUS || authorization.advanced !== true ||
        authorization.campaignSha256 !== TERMINAL_FRESH_DEVELOPMENT_OPEN_CAMPAIGN_SHA256 ||
        !isRecord(authorization.advancementChecks) ||
        Object.values(authorization.advancementChecks).length !== 6 ||
        !Object.values(authorization.advancementChecks).every((value) => value === true)
    ) throw new Error("Open-development analysis does not authorize fresh development");
    const publicRole = JSON.parse(fs.readFileSync(publicRolePath, "utf8")) as RecordValue;
    if (
        publicRole.status !== "FROZEN_METHOD_V6_FRESH_ROLES_IDENTITIES_PRIVATE" || publicRole.outcomeBlind !== true ||
        publicRole.passFamilyCount !== 29 || !isRecord(publicRole.roleCounts) ||
        publicRole.roleCounts.development !== 10 || publicRole.roleCounts.confirmatory !== 16 || publicRole.roleCounts.substitute !== 3
    ) throw new Error("Fresh-role public commitment does not match the frozen design");
    const families = parseTerminalFreshDevelopmentFamilies(
        JSON.parse(fs.readFileSync(privateRolePath, "utf8")), repoRoot,
    );
    const candidate = buildTerminalObjectiveArms().find(({ armId }) => armId === "full_sufficient_strike");
    if (!candidate || candidate.policyId !== TERMINAL_FRESH_DEVELOPMENT_CANDIDATE_POLICY_ID) {
        throw new Error("Frozen terminal-objective candidate drifted");
    }
    const baselineFactory = await loadBaselineFactory(path.join(repoRoot, "packages", "chronodivide-bot"));
    const generationManifest = createExperimentManifest({
        runId: "plan-terminal-objective-fresh-development-v1",
        mixDir: path.join(driverRoot, "data"),
        maps: families.map(({ mapName }) => mapName),
        effectiveConfig: {
            purpose: "terminal-objective-fresh-development-v1",
            countries: TERMINAL_FRESH_DEVELOPMENT_COUNTRIES,
            seedBlocksPerCell: TERMINAL_FRESH_DEVELOPMENT_SEEDS_PER_CELL,
            reciprocalSlots: [0, 1], candidate,
            maxTicks: TERMINAL_FRESH_DEVELOPMENT_MAX_TICKS,
        },
        baseline: baselineFactory.descriptor,
        gameSeedBase: TERMINAL_FRESH_DEVELOPMENT_ENGINE_SEED_BASE,
    });
    const baseline = generationManifest.software.baseline;
    if (
        generationManifest.source.gitBranch !== "main" || generationManifest.source.trackedDirty !== false ||
        !generationManifest.source.gitCommit || baseline.kind !== "external-package" || baseline.trackedDirty !== false ||
        !baseline.gitCommit || !baseline.runtimeTree.sha256 || !generationManifest.software.gameApiRuntimeTree.sha256 ||
        !generationManifest.software.packageLockSha256 || generationManifest.inputs.maps.some(({ exists }) => !exists)
    ) throw new Error("Fresh-development generation lacks clean source, baseline, API, or maps");
    fs.mkdirSync(path.dirname(outRoot), { recursive: true, mode: 0o700 });
    fs.mkdirSync(outRoot, { recursive: false, mode: 0o700 });
    const plansRoot = path.join(outRoot, "plans");
    fs.mkdirSync(plansRoot, { mode: 0o700 });
    const sourceRuntimeSha256 = runtimeCommitment(generationManifest.source.runtimeTrees);
    const shards: TerminalFreshDevelopmentCampaign["shards"] = [];
    for (const family of families) for (let countryOrdinal = 0; countryOrdinal < 9; countryOrdinal += 1) {
        for (let seedOrdinal = 0; seedOrdinal < TERMINAL_FRESH_DEVELOPMENT_SEEDS_PER_CELL; seedOrdinal += 1) {
            const country = TERMINAL_FRESH_DEVELOPMENT_COUNTRIES[countryOrdinal];
            const shardIndex = ((family.ordinal * 9) + countryOrdinal) * 4 + seedOrdinal;
            const seedBlockIndex = shardIndex;
            const requestedEngineSeed = derivePairedEngineSeed(TERMINAL_FRESH_DEVELOPMENT_ENGINE_SEED_BASE, seedBlockIndex);
            const runId = `terminal-fresh-v1-f${family.ordinal}-c${countryOrdinal}-b${seedOrdinal}-${generationManifest.source.gitCommit.slice(0, 10)}`;
            const plan: TerminalFreshDevelopmentRunPlan = parseTerminalFreshDevelopmentRunPlan({
                schemaVersion: TERMINAL_FRESH_DEVELOPMENT_PLAN_SCHEMA_VERSION,
                kind: TERMINAL_FRESH_DEVELOPMENT_PLAN_KIND,
                runId,
                sourceGitCommit: generationManifest.source.gitCommit,
                sourceRuntimeSha256,
                baselineGitCommit: baseline.gitCommit,
                baselineRuntimeSha256: baseline.runtimeTree.sha256,
                gameApiRuntimeSha256: generationManifest.software.gameApiRuntimeTree.sha256,
                packageLockSha256: generationManifest.software.packageLockSha256,
                sourcePopulationCommitmentSha256: TERMINAL_FRESH_DEVELOPMENT_PRIVATE_ROLE_SHA256,
                endpointVersion: LITERAL_BUILDING_ELIMINATION_ENDPOINT_VERSION,
                endpointSha256: LITERAL_BUILDING_ELIMINATION_ENDPOINT_SHA256,
                family: { familyId: family.familyId, mapName: family.mapName, mapSha256: family.mapSha256 },
                country,
                engineSeedBase: TERMINAL_FRESH_DEVELOPMENT_ENGINE_SEED_BASE,
                seedBlockIndex,
                requestedEngineSeed,
                maxTicks: TERMINAL_FRESH_DEVELOPMENT_MAX_TICKS,
                arms: [candidate],
                episodes: ([0, 1] as const).map((candidateSlot) => ({
                    episodeId: `a0-s${candidateSlot}`, armId: candidate.armId,
                    policyId: candidate.policyId, candidateSlot,
                })),
            });
            const planFile = path.join(plansRoot, `shard-${String(shardIndex).padStart(3, "0")}.json`);
            fs.writeFileSync(planFile, serializeTerminalFreshDevelopmentRunPlan(plan), { flag: "wx", mode: 0o600 });
            shards.push({
                shardIndex, planFile, planSha256: sha256File(planFile), runId,
                familyId: family.familyId, mapName: family.mapName, mapSha256: family.mapSha256,
                country, familyOrdinal: family.ordinal, countryOrdinal, seedOrdinal,
                seedBlockIndex, requestedEngineSeed, launchedGameCount: 2,
            });
        }
    }
    const campaign: TerminalFreshDevelopmentCampaign = {
        schemaVersion: 1,
        kind: "terminal-objective-fresh-development-literal-endpoint",
        status: "FROZEN_TERMINAL_OBJECTIVE_FRESH_DEVELOPMENT_ENDPOINT_V5",
        generatedAt: new Date().toISOString(),
        sourceGitCommit: generationManifest.source.gitCommit,
        sourceRuntimeSha256,
        baselineGitCommit: baseline.gitCommit as string,
        baselineRuntimeSha256: baseline.runtimeTree.sha256,
        gameApiRuntimeSha256: generationManifest.software.gameApiRuntimeTree.sha256,
        packageLockSha256: generationManifest.software.packageLockSha256,
        authorizationAnalysisPath,
        authorizationAnalysisSha256: sha256File(authorizationAnalysisPath),
        sourceOpenCampaignPath,
        sourceOpenCampaignSha256: TERMINAL_FRESH_DEVELOPMENT_OPEN_CAMPAIGN_SHA256,
        protocolPath,
        protocolSha256: TERMINAL_FRESH_DEVELOPMENT_PROTOCOL_SHA256,
        publicRolePath,
        publicRoleSha256: TERMINAL_FRESH_DEVELOPMENT_PUBLIC_ROLE_SHA256,
        privateRolePath,
        privateRoleSha256: TERMINAL_FRESH_DEVELOPMENT_PRIVATE_ROLE_SHA256,
        outcomeAccess: "single-scheduled-fresh-development-unblinding",
        familyCount: TERMINAL_FRESH_DEVELOPMENT_FAMILY_COUNT,
        countryCount: 9,
        seedBlocksPerCell: TERMINAL_FRESH_DEVELOPMENT_SEEDS_PER_CELL,
        reciprocalSlotCount: 2,
        shardCount: TERMINAL_FRESH_DEVELOPMENT_SHARD_COUNT,
        launchedGameCount: TERMINAL_FRESH_DEVELOPMENT_LAUNCH_COUNT,
        engineSeedBase: TERMINAL_FRESH_DEVELOPMENT_ENGINE_SEED_BASE,
        maxTicks: TERMINAL_FRESH_DEVELOPMENT_MAX_TICKS,
        endpointVersion: LITERAL_BUILDING_ELIMINATION_ENDPOINT_VERSION,
        endpointSha256: LITERAL_BUILDING_ELIMINATION_ENDPOINT_SHA256,
        candidate,
        countries: TERMINAL_FRESH_DEVELOPMENT_COUNTRIES,
        families,
        shards,
    };
    if (shards.length !== 360 || shards.some(({ shardIndex }, index) => shardIndex !== index)) {
        throw new Error("Fresh-development schedule drifted");
    }
    const campaignPath = path.join(outRoot, "campaign.json");
    fs.writeFileSync(campaignPath, `${JSON.stringify(campaign, null, 2)}\n`, { flag: "wx", mode: 0o600 });
    fs.writeFileSync(path.join(outRoot, "plan-files.txt"), shards.map(({ planFile }) => planFile).join("\n") + "\n", { flag: "wx" });
    console.log(JSON.stringify({ campaignPath, campaignSha256: sha256File(campaignPath), shards: 360, launches: 720 }));
};

const invoked = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (import.meta.url === invoked) main().catch((error) => { console.error(error); process.exitCode = 1; });
