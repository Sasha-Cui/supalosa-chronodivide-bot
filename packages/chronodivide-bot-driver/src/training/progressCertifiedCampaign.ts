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
    PROGRESS_CERTIFIED_ARM_ORDER,
    ProgressCertifiedArm,
    buildProgressCertifiedArms,
} from "./progressCertifiedExperimentPolicy.js";
import {
    PROGRESS_CERTIFIED_PLAN_KIND,
    PROGRESS_CERTIFIED_PLAN_SCHEMA_VERSION,
    ProgressCertifiedPlanEpisode,
    ProgressCertifiedRunPlan,
    parseProgressCertifiedRunPlan,
    serializeProgressCertifiedRunPlan,
    sha256File,
} from "./progressCertifiedPlanRunner.js";

export const PROGRESS_CERTIFIED_ENGINE_SEED_BASE = 4_220_000_000 as const;
export const PROGRESS_CERTIFIED_MAX_TICKS = 24_000 as const;
export const PROGRESS_CERTIFIED_FAMILY_COUNT = 10 as const;
export const PROGRESS_CERTIFIED_SEED_BLOCKS_PER_FAMILY = 1 as const;
export const PROGRESS_CERTIFIED_SUPPORTED_POPULATION_SHA256 =
    "80012d84a9897c90fa54acf7971cdb66551b842cd072f33ecec9f6c6f9b10084" as const;
export const PROGRESS_CERTIFIED_SOURCE_CAMPAIGN_SHA256 =
    "adc33ce6748ff4f047187fb8d375ac4467c2fb8afbc39e657388298be51a9dca" as const;
export const PROGRESS_CERTIFIED_CORE_SHA256 =
    "4a8144cb7df1f293cd6b63e0f208a37edcb6e6380935901a801b09ee4858845c" as const;
export const PROGRESS_CERTIFIED_ADAPTER_SHA256 =
    "a39cdb70571de40f72a3aae251eb1e8610c94b76ca7125790f9e0ee488ad52fc" as const;
export const PROGRESS_CERTIFIED_PROTOCOL_SHA256 =
    "8ac5f723f83e06e30695ef9f15670c5f985b377ddcfc6b4f75da36aaec0f384e" as const;
export const PROGRESS_CERTIFIED_COMPATIBILITY_SHA256 =
    "7548913b88f880e4560469d8ea578fb6f1b2473bfa718e2628e9be7ffff86bcb" as const;
export const PROGRESS_CERTIFIED_FAILED_COMPATIBILITY_RECORD_SHA256 =
    "d7bc43868d282e95fb9e31087944fdf47621b564f138eae1d78f6e0ac09cb17f" as const;
export const PROGRESS_CERTIFIED_ONE_SIDED_80_T_CRITICAL_DF9 = 0.8834038596855205 as const;

export const PROGRESS_CERTIFIED_COUNTRIES = [
    Countries.USA,
    Countries.KOREA,
    Countries.FRANCE,
    Countries.GERMANY,
    Countries.GREAT_BRITAIN,
    Countries.LIBYA,
    Countries.IRAQ,
    Countries.CUBA,
    Countries.RUSSIA,
] as const;

export const PROGRESS_CERTIFIED_SHARD_COUNT =
    PROGRESS_CERTIFIED_FAMILY_COUNT * PROGRESS_CERTIFIED_SEED_BLOCKS_PER_FAMILY * PROGRESS_CERTIFIED_COUNTRIES.length;
export const PROGRESS_CERTIFIED_LAUNCH_COUNT =
    PROGRESS_CERTIFIED_SHARD_COUNT * PROGRESS_CERTIFIED_ARM_ORDER.length * 2;

export const PROGRESS_CERTIFIED_ADVANCEMENT_RULE = [
    "one-sided family-clustered 80% lower confidence bound for the ranked arm literal-win probability above 0.50",
    "ranked arm literal wins exceed losses overall",
    "ranked arm pooled Allied and Soviet literal-win probabilities each exceed 0.50",
    "ranked arm literal wins exceed losses in at least seven of nine countries",
    "family-macro paired literal-win effect over external_baseline_control is positive",
    "family-macro draw probability is lower than external_baseline_control",
    "all 1,080 launches are technically and information-boundary clean under literal endpoint v5",
] as const;

export type ProgressCertifiedFamily = {
    familyId: string;
    mapName: string;
    mapSha256: string;
    selectionDigest: string;
};

export type ProgressCertifiedCampaign = {
    schemaVersion: 1;
    kind: "progress-certified-open-development-literal-endpoint";
    status: "FROZEN_PROGRESS_CERTIFIED_OPEN_DEVELOPMENT_V1_ENDPOINT_V5";
    generatedAt: string;
    sourceGitCommit: string;
    sourceRuntimeSha256: string;
    baselineGitCommit: string;
    baselineRuntimeSha256: string;
    gameApiRuntimeSha256: string;
    packageLockSha256: string;
    supportedPopulationPath: string;
    supportedPopulationSha256: typeof PROGRESS_CERTIFIED_SUPPORTED_POPULATION_SHA256;
    sourcePopulationCommitmentSha256: typeof PROGRESS_CERTIFIED_SUPPORTED_POPULATION_SHA256;
    sourceCampaignPath: string;
    sourceCampaignSha256: typeof PROGRESS_CERTIFIED_SOURCE_CAMPAIGN_SHA256;
    familySelectionRule: "all-ten-fixed-families-from-completed-continuous-offense-campaign";
    sourceFamilyRole: "open-development-with-prior-outcomes";
    currentFamilyFiltering: "none-complete-source-population-reused";
    endpointVersion: typeof LITERAL_BUILDING_ELIMINATION_ENDPOINT_VERSION;
    endpointSha256: typeof LITERAL_BUILDING_ELIMINATION_ENDPOINT_SHA256;
    coreSha256: typeof PROGRESS_CERTIFIED_CORE_SHA256;
    adapterSha256: typeof PROGRESS_CERTIFIED_ADAPTER_SHA256;
    protocolPath: string;
    protocolSha256: typeof PROGRESS_CERTIFIED_PROTOCOL_SHA256;
    compatibilityGatePath: string;
    compatibilityGateSha256: typeof PROGRESS_CERTIFIED_COMPATIBILITY_SHA256;
    compatibilityJobId: "22159661";
    failedCompatibilityRecordPath: string;
    failedCompatibilityRecordSha256: typeof PROGRESS_CERTIFIED_FAILED_COMPATIBILITY_RECORD_SHA256;
    supersededCompatibilityJobId: "22159510";
    priorCampaignReuse: "fixed_families_only_fresh_seeds_and_games";
    outcomeAccess: "open-development-only-no-paper-claim";
    familyCount: number;
    seedBlocksPerFamily: number;
    countryCount: number;
    reciprocalSlotCount: 2;
    policyCount: number;
    shardCount: number;
    launchedGameCount: number;
    engineSeedBase: typeof PROGRESS_CERTIFIED_ENGINE_SEED_BASE;
    maxTicks: typeof PROGRESS_CERTIFIED_MAX_TICKS;
    countries: readonly Countries[];
    advancementRule: readonly string[];
    confidenceInterval: {
        unit: "family";
        familyCount: typeof PROGRESS_CERTIFIED_FAMILY_COUNT;
        method: "student-t-lower-bound-on-family-means";
        sidedness: "one-sided";
        confidenceLevel: 0.8;
        degreesOfFreedom: 9;
        criticalValue: typeof PROGRESS_CERTIFIED_ONE_SIDED_80_T_CRITICAL_DF9;
    };
    arms: ProgressCertifiedArm[];
    selectedFamilies: ProgressCertifiedFamily[];
    shards: Array<{
        shardIndex: number;
        planFile: string;
        planSha256: string;
        runId: string;
        familyId: string;
        mapName: string;
        mapSha256: string;
        country: Countries;
        familySeedIndex: 0;
        seedBlockIndex: number;
        requestedEngineSeed: number;
        launchedGameCount: number;
    }>;
};

type RecordValue = Record<string, unknown>;
const isRecord = (value: unknown): value is RecordValue =>
    typeof value === "object" && value !== null && !Array.isArray(value);
const requiredPath = (name: string): string => {
    const value = process.env[name];
    if (!value) throw new Error(`${name} is required`);
    return path.resolve(value);
};
const sha256Text = (value: string): string => crypto.createHash("sha256").update(value).digest("hex");
const gitRoot = (): string => execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
const runtimeCommitment = (trees: ReturnType<typeof createExperimentManifest>["source"]["runtimeTrees"]): string =>
    sha256Text(JSON.stringify(trees));

export const buildProgressCertifiedEpisodes = (arms: ProgressCertifiedArm[]): ProgressCertifiedPlanEpisode[] =>
    arms.flatMap((arm, armIndex) => ([0, 1] as const).map((candidateSlot) => ({
        episodeId: `a${armIndex}-s${candidateSlot}`,
        armId: arm.armId,
        policyId: arm.policyId,
        candidateSlot,
    })));

export const selectProgressCertifiedFamilies = (
    supportedPopulation: unknown,
    sourceCampaign: unknown,
    repoRoot: string,
): ProgressCertifiedFamily[] => {
    if (
        !isRecord(supportedPopulation) || supportedPopulation.schemaVersion !== 1 ||
        supportedPopulation.status !== "FROZEN_METHOD_V6_OPEN_TRAINING_ECONOMIC_START_SUPPORTED_POPULATION" ||
        supportedPopulation.outcomeFree !== true || !Array.isArray(supportedPopulation.supportedFamilies)
    ) throw new Error("Progress-certified supported-population input is invalid");
    if (
        !isRecord(sourceCampaign) || sourceCampaign.schemaVersion !== 1 ||
        sourceCampaign.status !== "FROZEN_CONTINUOUS_OFFENSE_OPEN_DEVELOPMENT_V2_ENDPOINT_V5" ||
        sourceCampaign.sourcePopulationCommitmentSha256 !== PROGRESS_CERTIFIED_SUPPORTED_POPULATION_SHA256 ||
        !Array.isArray(sourceCampaign.selectedFamilies) || sourceCampaign.selectedFamilies.length !== 10
    ) throw new Error("Progress-certified source campaign is invalid");
    const supported = new Map((supportedPopulation.supportedFamilies as unknown[]).map((raw) => {
        if (!isRecord(raw) || typeof raw.familyId !== "string" || typeof raw.mapSha256 !== "string") {
            throw new Error("Progress-certified supported family is malformed");
        }
        return [raw.familyId, raw.mapSha256];
    }));
    const families = (sourceCampaign.selectedFamilies as unknown[]).map((raw, index): ProgressCertifiedFamily => {
        if (
            !isRecord(raw) || typeof raw.familyId !== "string" || typeof raw.mapName !== "string" ||
            path.basename(raw.mapName) !== raw.mapName || typeof raw.mapSha256 !== "string" ||
            !/^[0-9a-f]{64}$/.test(raw.mapSha256) || supported.get(raw.familyId) !== raw.mapSha256
        ) throw new Error(`Progress-certified source family ${index} is malformed or unsupported`);
        const mapPath = path.join(repoRoot, "packages", "chronodivide-bot-driver", "data", raw.mapName);
        if (!fs.existsSync(mapPath) || sha256File(mapPath) !== raw.mapSha256) {
            throw new Error(`Progress-certified family ${raw.familyId} lacks exact committed map bytes`);
        }
        return {
            familyId: raw.familyId,
            mapName: raw.mapName,
            mapSha256: raw.mapSha256,
            selectionDigest: sha256Text(`progress-certified-open-development-v1|${raw.familyId}|${raw.mapSha256}`),
        };
    });
    if (
        new Set(families.map(({ familyId }) => familyId)).size !== PROGRESS_CERTIFIED_FAMILY_COUNT ||
        new Set(families.map(({ mapSha256 }) => mapSha256)).size !== PROGRESS_CERTIFIED_FAMILY_COUNT
    ) throw new Error("Progress-certified selected families are not unique");
    return families;
};

const main = async (): Promise<void> => {
    const repoRoot = gitRoot();
    const driverRoot = path.join(repoRoot, "packages", "chronodivide-bot-driver");
    if (path.resolve(process.cwd()) !== driverRoot) throw new Error(`Generator must start in ${driverRoot}`);
    if (!process.env.BASELINE_PACKAGE_ROOT || process.env.REQUIRE_EXTERNAL_BASELINE !== "true") {
        throw new Error("Generation requires the pinned external baseline environment");
    }
    const supportedPopulationPath = requiredPath("PROGRESS_CERTIFIED_SUPPORTED_POPULATION");
    const sourceCampaignPath = requiredPath("PROGRESS_CERTIFIED_SOURCE_CAMPAIGN");
    const protocolPath = requiredPath("PROGRESS_CERTIFIED_PROTOCOL");
    const compatibilityGatePath = requiredPath("PROGRESS_CERTIFIED_COMPATIBILITY_GATE");
    const failedCompatibilityRecordPath = requiredPath("PROGRESS_CERTIFIED_FAILED_COMPATIBILITY_RECORD");
    const outRoot = requiredPath("OUT_ROOT");
    if (fs.existsSync(outRoot)) throw new Error(`Refusing to reuse OUT_ROOT ${outRoot}`);
    for (const [filePath, digest, label] of [
        [supportedPopulationPath, PROGRESS_CERTIFIED_SUPPORTED_POPULATION_SHA256, "population"],
        [sourceCampaignPath, PROGRESS_CERTIFIED_SOURCE_CAMPAIGN_SHA256, "source campaign"],
        [protocolPath, PROGRESS_CERTIFIED_PROTOCOL_SHA256, "protocol"],
        [compatibilityGatePath, PROGRESS_CERTIFIED_COMPATIBILITY_SHA256, "compatibility"],
        [
            failedCompatibilityRecordPath,
            PROGRESS_CERTIFIED_FAILED_COMPATIBILITY_RECORD_SHA256,
            "failed-compatibility record",
        ],
    ] as const) if (sha256File(filePath) !== digest) throw new Error(`Progress-certified ${label} commitment drifted`);
    const corePath = path.join(
        repoRoot,
        "packages", "chronodivide-bot", "src", "bot", "logic", "objective", "terminalObjectiveDecisionCore.ts",
    );
    const adapterPath = path.join(
        repoRoot,
        "packages", "chronodivide-bot", "src", "bot", "logic", "objective", "objectiveMechanicsAdapter.ts",
    );
    if (sha256File(corePath) !== PROGRESS_CERTIFIED_CORE_SHA256 || sha256File(adapterPath) !== PROGRESS_CERTIFIED_ADAPTER_SHA256) {
        throw new Error("Progress-certified exact decision core or mechanics adapter commitment drifted");
    }
    const compatibility = JSON.parse(fs.readFileSync(compatibilityGatePath, "utf8")) as RecordValue;
    if (
        compatibility.status !== "PASS_OUTCOME_FREE_PROGRESS_CERTIFIED_COMPATIBILITY" ||
        compatibility.outcomeFree !== true || compatibility.gameCount !== 72 ||
        compatibility.countryCount !== 9 || compatibility.reciprocalSlotCount !== 2 ||
        compatibility.sourceGitCommit !== "f9bc85ff18d79183a3a2ad3872bc3a44b400f7eb" ||
        !isRecord(compatibility.scheduler) || compatibility.scheduler.jobId !== "22159661" ||
        compatibility.scheduler.account !== "pi_jss233"
    ) throw new Error("Progress-certified outcome-free technical gates do not authorize generation");
    const failedCompatibility = JSON.parse(
        fs.readFileSync(failedCompatibilityRecordPath, "utf8"),
    ) as RecordValue;
    if (
        failedCompatibility.status !== "INVALIDATED_OUTCOME_FREE_COMPATIBILITY_SOURCE_REVISION_CHANGED" ||
        failedCompatibility.jobId !== "22159510" ||
        failedCompatibility.schedulerAccount !== "pi_jss233" ||
        failedCompatibility.outcomeBearingGameCount !== 0 ||
        failedCompatibility.outcomeInspected !== false
    ) throw new Error("Progress-certified failed-compatibility record is not an exact zero-outcome supersession record");

    const supportedPopulation = JSON.parse(fs.readFileSync(supportedPopulationPath, "utf8")) as unknown;
    const sourceCampaign = JSON.parse(fs.readFileSync(sourceCampaignPath, "utf8")) as unknown;
    const families = selectProgressCertifiedFamilies(supportedPopulation, sourceCampaign, repoRoot);
    const arms = buildProgressCertifiedArms();
    const baselineFactory = await loadBaselineFactory(path.join(repoRoot, "packages", "chronodivide-bot"));
    const generationManifest = createExperimentManifest({
        runId: "plan-progress-certified-open-development-v1",
        mixDir: path.join(driverRoot, "data"),
        maps: families.map(({ mapName }) => mapName),
        effectiveConfig: {
            purpose: "progress-certified-open-development-v1-literal-endpoint-v5",
            outcomeAccess: false,
            countries: PROGRESS_CERTIFIED_COUNTRIES,
            reciprocalSlots: [0, 1],
            seedBlocksPerFamily: PROGRESS_CERTIFIED_SEED_BLOCKS_PER_FAMILY,
            arms,
            maxTicks: PROGRESS_CERTIFIED_MAX_TICKS,
            sourceCampaignSha256: PROGRESS_CERTIFIED_SOURCE_CAMPAIGN_SHA256,
            priorCampaignReuse: "fixed_families_only_fresh_seeds_and_games",
        },
        baseline: baselineFactory.descriptor,
        gameSeedBase: PROGRESS_CERTIFIED_ENGINE_SEED_BASE,
    });
    const baseline = generationManifest.software.baseline;
    if (
        generationManifest.source.gitBranch !== "main" || generationManifest.source.trackedDirty !== false ||
        !generationManifest.source.gitCommit || baseline.kind !== "external-package" ||
        baseline.trackedDirty !== false || !baseline.gitCommit || !baseline.runtimeTree.sha256 ||
        !generationManifest.software.gameApiRuntimeTree.sha256 ||
        !generationManifest.software.packageLockSha256 || generationManifest.inputs.maps.some((map) => !map.exists)
    ) throw new Error("Progress-certified generation lacks clean source, baseline, API, or maps");

    fs.mkdirSync(path.dirname(outRoot), { recursive: true, mode: 0o700 });
    fs.mkdirSync(outRoot, { recursive: false, mode: 0o700 });
    const plansRoot = path.join(outRoot, "plans");
    fs.mkdirSync(plansRoot, { mode: 0o700 });
    const shards: ProgressCertifiedCampaign["shards"] = [];
    const sourceRuntimeSha256 = runtimeCommitment(generationManifest.source.runtimeTrees);
    for (let familyIndex = 0; familyIndex < families.length; familyIndex += 1) {
        for (let countryIndex = 0; countryIndex < PROGRESS_CERTIFIED_COUNTRIES.length; countryIndex += 1) {
            const family = families[familyIndex];
            const country = PROGRESS_CERTIFIED_COUNTRIES[countryIndex];
            const shardIndex = familyIndex * PROGRESS_CERTIFIED_COUNTRIES.length + countryIndex;
            const seedBlockIndex = shardIndex;
            const requestedEngineSeed = derivePairedEngineSeed(PROGRESS_CERTIFIED_ENGINE_SEED_BASE, seedBlockIndex);
            const runId = `progress-certified-v1-f${familyIndex}-c${countryIndex}-${generationManifest.source.gitCommit.slice(0, 10)}`;
            const plan: ProgressCertifiedRunPlan = parseProgressCertifiedRunPlan({
                schemaVersion: PROGRESS_CERTIFIED_PLAN_SCHEMA_VERSION,
                kind: PROGRESS_CERTIFIED_PLAN_KIND,
                runId,
                sourceGitCommit: generationManifest.source.gitCommit,
                sourceRuntimeSha256,
                baselineGitCommit: baseline.gitCommit,
                baselineRuntimeSha256: baseline.runtimeTree.sha256,
                gameApiRuntimeSha256: generationManifest.software.gameApiRuntimeTree.sha256,
                packageLockSha256: generationManifest.software.packageLockSha256,
                sourcePopulationCommitmentSha256: PROGRESS_CERTIFIED_SUPPORTED_POPULATION_SHA256,
                endpointVersion: LITERAL_BUILDING_ELIMINATION_ENDPOINT_VERSION,
                endpointSha256: LITERAL_BUILDING_ELIMINATION_ENDPOINT_SHA256,
                family: {
                    familyId: family.familyId,
                    mapName: family.mapName,
                    mapSha256: family.mapSha256,
                },
                country,
                engineSeedBase: PROGRESS_CERTIFIED_ENGINE_SEED_BASE,
                seedBlockIndex,
                requestedEngineSeed,
                maxTicks: PROGRESS_CERTIFIED_MAX_TICKS,
                arms,
                episodes: buildProgressCertifiedEpisodes(arms),
            });
            const planFile = path.join(plansRoot, `shard-${String(shardIndex).padStart(3, "0")}.json`);
            fs.writeFileSync(planFile, serializeProgressCertifiedRunPlan(plan), { flag: "wx", mode: 0o600 });
            shards.push({
                shardIndex,
                planFile,
                planSha256: sha256File(planFile),
                runId,
                familyId: family.familyId,
                mapName: family.mapName,
                mapSha256: family.mapSha256,
                country,
                familySeedIndex: 0,
                seedBlockIndex,
                requestedEngineSeed,
                launchedGameCount: plan.episodes.length,
            });
        }
    }
    const campaign: ProgressCertifiedCampaign = {
        schemaVersion: 1,
        kind: "progress-certified-open-development-literal-endpoint",
        status: "FROZEN_PROGRESS_CERTIFIED_OPEN_DEVELOPMENT_V1_ENDPOINT_V5",
        generatedAt: new Date().toISOString(),
        sourceGitCommit: generationManifest.source.gitCommit,
        sourceRuntimeSha256,
        baselineGitCommit: baseline.gitCommit,
        baselineRuntimeSha256: baseline.runtimeTree.sha256,
        gameApiRuntimeSha256: generationManifest.software.gameApiRuntimeTree.sha256,
        packageLockSha256: generationManifest.software.packageLockSha256,
        supportedPopulationPath,
        supportedPopulationSha256: PROGRESS_CERTIFIED_SUPPORTED_POPULATION_SHA256,
        sourcePopulationCommitmentSha256: PROGRESS_CERTIFIED_SUPPORTED_POPULATION_SHA256,
        sourceCampaignPath,
        sourceCampaignSha256: PROGRESS_CERTIFIED_SOURCE_CAMPAIGN_SHA256,
        familySelectionRule: "all-ten-fixed-families-from-completed-continuous-offense-campaign",
        sourceFamilyRole: "open-development-with-prior-outcomes",
        currentFamilyFiltering: "none-complete-source-population-reused",
        endpointVersion: LITERAL_BUILDING_ELIMINATION_ENDPOINT_VERSION,
        endpointSha256: LITERAL_BUILDING_ELIMINATION_ENDPOINT_SHA256,
        coreSha256: PROGRESS_CERTIFIED_CORE_SHA256,
        adapterSha256: PROGRESS_CERTIFIED_ADAPTER_SHA256,
        protocolPath,
        protocolSha256: PROGRESS_CERTIFIED_PROTOCOL_SHA256,
        compatibilityGatePath,
        compatibilityGateSha256: PROGRESS_CERTIFIED_COMPATIBILITY_SHA256,
        compatibilityJobId: "22159661",
        failedCompatibilityRecordPath,
        failedCompatibilityRecordSha256: PROGRESS_CERTIFIED_FAILED_COMPATIBILITY_RECORD_SHA256,
        supersededCompatibilityJobId: "22159510",
        priorCampaignReuse: "fixed_families_only_fresh_seeds_and_games",
        outcomeAccess: "open-development-only-no-paper-claim",
        familyCount: families.length,
        seedBlocksPerFamily: PROGRESS_CERTIFIED_SEED_BLOCKS_PER_FAMILY,
        countryCount: PROGRESS_CERTIFIED_COUNTRIES.length,
        reciprocalSlotCount: 2,
        policyCount: arms.length,
        shardCount: shards.length,
        launchedGameCount: shards.length * arms.length * 2,
        engineSeedBase: PROGRESS_CERTIFIED_ENGINE_SEED_BASE,
        maxTicks: PROGRESS_CERTIFIED_MAX_TICKS,
        countries: PROGRESS_CERTIFIED_COUNTRIES,
        advancementRule: PROGRESS_CERTIFIED_ADVANCEMENT_RULE,
        confidenceInterval: {
            unit: "family",
            familyCount: PROGRESS_CERTIFIED_FAMILY_COUNT,
            method: "student-t-lower-bound-on-family-means",
            sidedness: "one-sided",
            confidenceLevel: 0.8,
            degreesOfFreedom: 9,
            criticalValue: PROGRESS_CERTIFIED_ONE_SIDED_80_T_CRITICAL_DF9,
        },
        arms,
        selectedFamilies: families,
        shards,
    };
    if (
        campaign.shardCount !== PROGRESS_CERTIFIED_SHARD_COUNT ||
        campaign.launchedGameCount !== PROGRESS_CERTIFIED_LAUNCH_COUNT
    ) throw new Error("Progress-certified launch count drifted");
    const campaignPath = path.join(outRoot, "campaign.json");
    fs.writeFileSync(campaignPath, JSON.stringify(campaign, null, 2) + "\n", { flag: "wx", mode: 0o600 });
    fs.writeFileSync(
        path.join(outRoot, "plan-files.txt"),
        shards.map(({ planFile }) => planFile).join("\n") + "\n",
        { flag: "wx" },
    );
    console.log(JSON.stringify({
        campaignPath,
        campaignSha256: sha256File(campaignPath),
        families: families.map(({ familyId }) => familyId),
        shards: shards.length,
        launches: campaign.launchedGameCount,
    }));
};

const invoked = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (import.meta.url === invoked) main().catch((error) => { console.error(error); process.exitCode = 1; });
