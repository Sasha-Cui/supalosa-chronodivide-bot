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
    CONTINUOUS_OFFENSE_ARM_ORDER,
    ContinuousOffenseArm,
    buildContinuousOffenseArms,
} from "./continuousOffenseExperimentPolicy.js";
import {
    CONTINUOUS_OFFENSE_PLAN_KIND,
    CONTINUOUS_OFFENSE_PLAN_SCHEMA_VERSION,
    ContinuousOffensePlanEpisode,
    ContinuousOffenseRunPlan,
    parseContinuousOffenseRunPlan,
    serializeContinuousOffenseRunPlan,
    sha256File,
} from "./continuousOffensePlanRunner.js";

export const CONTINUOUS_OFFENSE_ENGINE_SEED_BASE = 4_180_000_000 as const;
export const CONTINUOUS_OFFENSE_MAX_TICKS = 24_000 as const;
export const CONTINUOUS_OFFENSE_FAMILY_COUNT = 10 as const;
export const CONTINUOUS_OFFENSE_SEED_BLOCKS_PER_FAMILY = 1 as const;
export const CONTINUOUS_OFFENSE_SUPPORTED_POPULATION_SHA256 =
    "80012d84a9897c90fa54acf7971cdb66551b842cd072f33ecec9f6c6f9b10084" as const;
export const CONTINUOUS_OFFENSE_SOURCE_CAMPAIGN_SHA256 =
    "e6859b6ddde8ea34c7167e3fd8575a26a1bb1f4eb141f53dc7c3dda3375f388d" as const;
export const CONTINUOUS_OFFENSE_CORE_SHA256 =
    "96cfc0a2c6a8e9a02fa8d422e4b5d6a54aab6a19143d3abdeb1842d3194f36f0" as const;
export const CONTINUOUS_OFFENSE_ADAPTER_SHA256 =
    "a39cdb70571de40f72a3aae251eb1e8610c94b76ca7125790f9e0ee488ad52fc" as const;
export const CONTINUOUS_OFFENSE_PROTOCOL_SHA256 =
    "425214575ed5fe876d3fdb9a33dae968c2305bbc40d2545bf4586f626d44f9c8" as const;
export const CONTINUOUS_OFFENSE_COMPATIBILITY_SHA256 =
    "24a17eb494dbcd7bfe2b9c21025d3dea6ae31a324755b54be262233d572aa4b5" as const;
export const CONTINUOUS_OFFENSE_ONE_SIDED_80_T_CRITICAL_DF9 = 0.8834038596855205 as const;

export const CONTINUOUS_OFFENSE_COUNTRIES = [
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

export const CONTINUOUS_OFFENSE_SHARD_COUNT =
    CONTINUOUS_OFFENSE_FAMILY_COUNT * CONTINUOUS_OFFENSE_SEED_BLOCKS_PER_FAMILY * CONTINUOUS_OFFENSE_COUNTRIES.length;
export const CONTINUOUS_OFFENSE_LAUNCH_COUNT =
    CONTINUOUS_OFFENSE_SHARD_COUNT * CONTINUOUS_OFFENSE_ARM_ORDER.length * 2;

export const CONTINUOUS_OFFENSE_ADVANCEMENT_RULE = [
    "one-sided family-clustered 80% lower confidence bound for the ranked arm literal-win probability above 0.50",
    "ranked arm literal wins exceed losses overall",
    "ranked arm pooled Allied and Soviet literal-win probabilities each exceed 0.50",
    "ranked arm literal wins exceed losses in at least seven of nine countries",
    "family-macro paired literal-win effects over external_baseline_control and macro_champion_control are positive",
    "family-macro draw probability is lower than macro_champion_control",
    "all 1,080 launches are technically and information-boundary clean under literal endpoint v5",
] as const;

export type ContinuousOffenseFamily = {
    familyId: string;
    mapName: string;
    mapSha256: string;
    selectionDigest: string;
};

export type ContinuousOffenseCampaign = {
    schemaVersion: 1;
    kind: "continuous-offense-open-development-literal-endpoint";
    status: "FROZEN_CONTINUOUS_OFFENSE_OPEN_DEVELOPMENT_ENDPOINT_V5";
    generatedAt: string;
    sourceGitCommit: string;
    sourceRuntimeSha256: string;
    baselineGitCommit: string;
    baselineRuntimeSha256: string;
    gameApiRuntimeSha256: string;
    packageLockSha256: string;
    supportedPopulationPath: string;
    supportedPopulationSha256: typeof CONTINUOUS_OFFENSE_SUPPORTED_POPULATION_SHA256;
    sourcePopulationCommitmentSha256: typeof CONTINUOUS_OFFENSE_SUPPORTED_POPULATION_SHA256;
    sourceCampaignPath: string;
    sourceCampaignSha256: typeof CONTINUOUS_OFFENSE_SOURCE_CAMPAIGN_SHA256;
    familySelectionRule: "exact-ten-fixed-families-from-completed-terminal-race-campaign";
    outcomeFreePopulationSelection: true;
    endpointVersion: typeof LITERAL_BUILDING_ELIMINATION_ENDPOINT_VERSION;
    endpointSha256: typeof LITERAL_BUILDING_ELIMINATION_ENDPOINT_SHA256;
    coreSha256: typeof CONTINUOUS_OFFENSE_CORE_SHA256;
    adapterSha256: typeof CONTINUOUS_OFFENSE_ADAPTER_SHA256;
    protocolPath: string;
    protocolSha256: typeof CONTINUOUS_OFFENSE_PROTOCOL_SHA256;
    compatibilityGatePath: string;
    compatibilityGateSha256: typeof CONTINUOUS_OFFENSE_COMPATIBILITY_SHA256;
    compatibilityJobId: "22145862";
    priorCampaignReuse: "fixed_families_only_fresh_seeds_and_games";
    outcomeAccess: "open-development-only-no-paper-claim";
    familyCount: number;
    seedBlocksPerFamily: number;
    countryCount: number;
    reciprocalSlotCount: 2;
    policyCount: number;
    shardCount: number;
    launchedGameCount: number;
    engineSeedBase: typeof CONTINUOUS_OFFENSE_ENGINE_SEED_BASE;
    maxTicks: typeof CONTINUOUS_OFFENSE_MAX_TICKS;
    countries: readonly Countries[];
    advancementRule: readonly string[];
    confidenceInterval: {
        unit: "family";
        familyCount: typeof CONTINUOUS_OFFENSE_FAMILY_COUNT;
        method: "student-t-lower-bound-on-family-means";
        sidedness: "one-sided";
        confidenceLevel: 0.8;
        degreesOfFreedom: 9;
        criticalValue: typeof CONTINUOUS_OFFENSE_ONE_SIDED_80_T_CRITICAL_DF9;
    };
    arms: ContinuousOffenseArm[];
    selectedFamilies: ContinuousOffenseFamily[];
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

export const buildContinuousOffenseEpisodes = (arms: ContinuousOffenseArm[]): ContinuousOffensePlanEpisode[] =>
    arms.flatMap((arm, armIndex) => ([0, 1] as const).map((candidateSlot) => ({
        episodeId: `a${armIndex}-s${candidateSlot}`,
        armId: arm.armId,
        policyId: arm.policyId,
        candidateSlot,
    })));

export const selectContinuousOffenseFamilies = (
    supportedPopulation: unknown,
    sourceCampaign: unknown,
    repoRoot: string,
): ContinuousOffenseFamily[] => {
    if (
        !isRecord(supportedPopulation) || supportedPopulation.schemaVersion !== 1 ||
        supportedPopulation.status !== "FROZEN_METHOD_V6_OPEN_TRAINING_ECONOMIC_START_SUPPORTED_POPULATION" ||
        supportedPopulation.outcomeFree !== true || !Array.isArray(supportedPopulation.supportedFamilies)
    ) throw new Error("Continuous-offense supported-population input is invalid");
    if (
        !isRecord(sourceCampaign) || sourceCampaign.schemaVersion !== 1 ||
        sourceCampaign.status !== "FROZEN_TERMINAL_RACE_OPEN_DEVELOPMENT_ENDPOINT_V5" ||
        sourceCampaign.sourcePopulationCommitmentSha256 !== CONTINUOUS_OFFENSE_SUPPORTED_POPULATION_SHA256 ||
        !Array.isArray(sourceCampaign.selectedFamilies) || sourceCampaign.selectedFamilies.length !== 10
    ) throw new Error("Continuous-offense source campaign is invalid");
    const supported = new Map((supportedPopulation.supportedFamilies as unknown[]).map((raw) => {
        if (!isRecord(raw) || typeof raw.familyId !== "string" || typeof raw.mapSha256 !== "string") {
            throw new Error("Continuous-offense supported family is malformed");
        }
        return [raw.familyId, raw.mapSha256];
    }));
    const families = (sourceCampaign.selectedFamilies as unknown[]).map((raw, index): ContinuousOffenseFamily => {
        if (
            !isRecord(raw) || typeof raw.familyId !== "string" || typeof raw.mapName !== "string" ||
            path.basename(raw.mapName) !== raw.mapName || typeof raw.mapSha256 !== "string" ||
            !/^[0-9a-f]{64}$/.test(raw.mapSha256) || supported.get(raw.familyId) !== raw.mapSha256
        ) throw new Error(`Continuous-offense source family ${index} is malformed or unsupported`);
        const mapPath = path.join(repoRoot, "packages", "chronodivide-bot-driver", "data", raw.mapName);
        if (!fs.existsSync(mapPath) || sha256File(mapPath) !== raw.mapSha256) {
            throw new Error(`Continuous-offense family ${raw.familyId} lacks exact committed map bytes`);
        }
        return {
            familyId: raw.familyId,
            mapName: raw.mapName,
            mapSha256: raw.mapSha256,
            selectionDigest: sha256Text(`continuous-offense-open-development-v1|${raw.familyId}|${raw.mapSha256}`),
        };
    });
    if (
        new Set(families.map(({ familyId }) => familyId)).size !== CONTINUOUS_OFFENSE_FAMILY_COUNT ||
        new Set(families.map(({ mapSha256 }) => mapSha256)).size !== CONTINUOUS_OFFENSE_FAMILY_COUNT
    ) throw new Error("Continuous-offense selected families are not unique");
    return families;
};

const main = async (): Promise<void> => {
    const repoRoot = gitRoot();
    const driverRoot = path.join(repoRoot, "packages", "chronodivide-bot-driver");
    if (path.resolve(process.cwd()) !== driverRoot) throw new Error(`Generator must start in ${driverRoot}`);
    if (!process.env.BASELINE_PACKAGE_ROOT || process.env.REQUIRE_EXTERNAL_BASELINE !== "true") {
        throw new Error("Generation requires the pinned external baseline environment");
    }
    const supportedPopulationPath = requiredPath("CONTINUOUS_OFFENSE_SUPPORTED_POPULATION");
    const sourceCampaignPath = requiredPath("CONTINUOUS_OFFENSE_SOURCE_CAMPAIGN");
    const protocolPath = requiredPath("CONTINUOUS_OFFENSE_PROTOCOL");
    const compatibilityGatePath = requiredPath("CONTINUOUS_OFFENSE_COMPATIBILITY_GATE");
    const outRoot = requiredPath("OUT_ROOT");
    if (fs.existsSync(outRoot)) throw new Error(`Refusing to reuse OUT_ROOT ${outRoot}`);
    for (const [filePath, digest, label] of [
        [supportedPopulationPath, CONTINUOUS_OFFENSE_SUPPORTED_POPULATION_SHA256, "population"],
        [sourceCampaignPath, CONTINUOUS_OFFENSE_SOURCE_CAMPAIGN_SHA256, "source campaign"],
        [protocolPath, CONTINUOUS_OFFENSE_PROTOCOL_SHA256, "protocol"],
        [compatibilityGatePath, CONTINUOUS_OFFENSE_COMPATIBILITY_SHA256, "compatibility"],
    ] as const) if (sha256File(filePath) !== digest) throw new Error(`Continuous-offense ${label} commitment drifted`);
    const corePath = path.join(
        repoRoot,
        "packages", "chronodivide-bot", "src", "bot", "logic", "objective", "terminalObjectiveDecisionCore.ts",
    );
    const adapterPath = path.join(
        repoRoot,
        "packages", "chronodivide-bot", "src", "bot", "logic", "objective", "objectiveMechanicsAdapter.ts",
    );
    if (sha256File(corePath) !== CONTINUOUS_OFFENSE_CORE_SHA256 || sha256File(adapterPath) !== CONTINUOUS_OFFENSE_ADAPTER_SHA256) {
        throw new Error("Continuous-offense exact decision core or mechanics adapter commitment drifted");
    }
    const compatibility = JSON.parse(fs.readFileSync(compatibilityGatePath, "utf8")) as RecordValue;
    if (
        compatibility.status !== "PASS_OUTCOME_FREE_CONTINUOUS_OFFENSE_COMPATIBILITY_AND_EXPOSURE" ||
        compatibility.outcomeFree !== true || compatibility.gameCount !== 72 ||
        compatibility.countryCount !== 9 || compatibility.reciprocalSlotCount !== 2 ||
        !isRecord(compatibility.scheduler) || compatibility.scheduler.jobId !== "22145862" ||
        compatibility.scheduler.account !== "pi_jss233"
    ) throw new Error("Continuous-offense outcome-free technical gates do not authorize generation");

    const supportedPopulation = JSON.parse(fs.readFileSync(supportedPopulationPath, "utf8")) as unknown;
    const sourceCampaign = JSON.parse(fs.readFileSync(sourceCampaignPath, "utf8")) as unknown;
    const families = selectContinuousOffenseFamilies(supportedPopulation, sourceCampaign, repoRoot);
    const arms = buildContinuousOffenseArms();
    const baselineFactory = await loadBaselineFactory(path.join(repoRoot, "packages", "chronodivide-bot"));
    const generationManifest = createExperimentManifest({
        runId: "plan-continuous-offense-open-development-v1",
        mixDir: path.join(driverRoot, "data"),
        maps: families.map(({ mapName }) => mapName),
        effectiveConfig: {
            purpose: "continuous-offense-open-development-literal-endpoint-v5",
            outcomeAccess: false,
            countries: CONTINUOUS_OFFENSE_COUNTRIES,
            reciprocalSlots: [0, 1],
            seedBlocksPerFamily: CONTINUOUS_OFFENSE_SEED_BLOCKS_PER_FAMILY,
            arms,
            maxTicks: CONTINUOUS_OFFENSE_MAX_TICKS,
            sourceCampaignSha256: CONTINUOUS_OFFENSE_SOURCE_CAMPAIGN_SHA256,
            priorCampaignReuse: "fixed_families_only_fresh_seeds_and_games",
        },
        baseline: baselineFactory.descriptor,
        gameSeedBase: CONTINUOUS_OFFENSE_ENGINE_SEED_BASE,
    });
    const baseline = generationManifest.software.baseline;
    if (
        generationManifest.source.gitBranch !== "main" || generationManifest.source.trackedDirty !== false ||
        !generationManifest.source.gitCommit || baseline.kind !== "external-package" ||
        baseline.trackedDirty !== false || !baseline.gitCommit || !baseline.runtimeTree.sha256 ||
        !generationManifest.software.gameApiRuntimeTree.sha256 ||
        !generationManifest.software.packageLockSha256 || generationManifest.inputs.maps.some((map) => !map.exists)
    ) throw new Error("Continuous-offense generation lacks clean source, baseline, API, or maps");

    fs.mkdirSync(path.dirname(outRoot), { recursive: true, mode: 0o700 });
    fs.mkdirSync(outRoot, { recursive: false, mode: 0o700 });
    const plansRoot = path.join(outRoot, "plans");
    fs.mkdirSync(plansRoot, { mode: 0o700 });
    const shards: ContinuousOffenseCampaign["shards"] = [];
    const sourceRuntimeSha256 = runtimeCommitment(generationManifest.source.runtimeTrees);
    for (let familyIndex = 0; familyIndex < families.length; familyIndex += 1) {
        for (let countryIndex = 0; countryIndex < CONTINUOUS_OFFENSE_COUNTRIES.length; countryIndex += 1) {
            const family = families[familyIndex];
            const country = CONTINUOUS_OFFENSE_COUNTRIES[countryIndex];
            const shardIndex = familyIndex * CONTINUOUS_OFFENSE_COUNTRIES.length + countryIndex;
            const seedBlockIndex = shardIndex;
            const requestedEngineSeed = derivePairedEngineSeed(CONTINUOUS_OFFENSE_ENGINE_SEED_BASE, seedBlockIndex);
            const runId = `continuous-offense-v1-f${familyIndex}-c${countryIndex}-${generationManifest.source.gitCommit.slice(0, 10)}`;
            const plan: ContinuousOffenseRunPlan = parseContinuousOffenseRunPlan({
                schemaVersion: CONTINUOUS_OFFENSE_PLAN_SCHEMA_VERSION,
                kind: CONTINUOUS_OFFENSE_PLAN_KIND,
                runId,
                sourceGitCommit: generationManifest.source.gitCommit,
                sourceRuntimeSha256,
                baselineGitCommit: baseline.gitCommit,
                baselineRuntimeSha256: baseline.runtimeTree.sha256,
                gameApiRuntimeSha256: generationManifest.software.gameApiRuntimeTree.sha256,
                packageLockSha256: generationManifest.software.packageLockSha256,
                sourcePopulationCommitmentSha256: CONTINUOUS_OFFENSE_SUPPORTED_POPULATION_SHA256,
                endpointVersion: LITERAL_BUILDING_ELIMINATION_ENDPOINT_VERSION,
                endpointSha256: LITERAL_BUILDING_ELIMINATION_ENDPOINT_SHA256,
                family: {
                    familyId: family.familyId,
                    mapName: family.mapName,
                    mapSha256: family.mapSha256,
                },
                country,
                engineSeedBase: CONTINUOUS_OFFENSE_ENGINE_SEED_BASE,
                seedBlockIndex,
                requestedEngineSeed,
                maxTicks: CONTINUOUS_OFFENSE_MAX_TICKS,
                arms,
                episodes: buildContinuousOffenseEpisodes(arms),
            });
            const planFile = path.join(plansRoot, `shard-${String(shardIndex).padStart(3, "0")}.json`);
            fs.writeFileSync(planFile, serializeContinuousOffenseRunPlan(plan), { flag: "wx", mode: 0o600 });
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
    const campaign: ContinuousOffenseCampaign = {
        schemaVersion: 1,
        kind: "continuous-offense-open-development-literal-endpoint",
        status: "FROZEN_CONTINUOUS_OFFENSE_OPEN_DEVELOPMENT_ENDPOINT_V5",
        generatedAt: new Date().toISOString(),
        sourceGitCommit: generationManifest.source.gitCommit,
        sourceRuntimeSha256,
        baselineGitCommit: baseline.gitCommit,
        baselineRuntimeSha256: baseline.runtimeTree.sha256,
        gameApiRuntimeSha256: generationManifest.software.gameApiRuntimeTree.sha256,
        packageLockSha256: generationManifest.software.packageLockSha256,
        supportedPopulationPath,
        supportedPopulationSha256: CONTINUOUS_OFFENSE_SUPPORTED_POPULATION_SHA256,
        sourcePopulationCommitmentSha256: CONTINUOUS_OFFENSE_SUPPORTED_POPULATION_SHA256,
        sourceCampaignPath,
        sourceCampaignSha256: CONTINUOUS_OFFENSE_SOURCE_CAMPAIGN_SHA256,
        familySelectionRule: "exact-ten-fixed-families-from-completed-terminal-race-campaign",
        outcomeFreePopulationSelection: true,
        endpointVersion: LITERAL_BUILDING_ELIMINATION_ENDPOINT_VERSION,
        endpointSha256: LITERAL_BUILDING_ELIMINATION_ENDPOINT_SHA256,
        coreSha256: CONTINUOUS_OFFENSE_CORE_SHA256,
        adapterSha256: CONTINUOUS_OFFENSE_ADAPTER_SHA256,
        protocolPath,
        protocolSha256: CONTINUOUS_OFFENSE_PROTOCOL_SHA256,
        compatibilityGatePath,
        compatibilityGateSha256: CONTINUOUS_OFFENSE_COMPATIBILITY_SHA256,
        compatibilityJobId: "22145862",
        priorCampaignReuse: "fixed_families_only_fresh_seeds_and_games",
        outcomeAccess: "open-development-only-no-paper-claim",
        familyCount: families.length,
        seedBlocksPerFamily: CONTINUOUS_OFFENSE_SEED_BLOCKS_PER_FAMILY,
        countryCount: CONTINUOUS_OFFENSE_COUNTRIES.length,
        reciprocalSlotCount: 2,
        policyCount: arms.length,
        shardCount: shards.length,
        launchedGameCount: shards.length * arms.length * 2,
        engineSeedBase: CONTINUOUS_OFFENSE_ENGINE_SEED_BASE,
        maxTicks: CONTINUOUS_OFFENSE_MAX_TICKS,
        countries: CONTINUOUS_OFFENSE_COUNTRIES,
        advancementRule: CONTINUOUS_OFFENSE_ADVANCEMENT_RULE,
        confidenceInterval: {
            unit: "family",
            familyCount: CONTINUOUS_OFFENSE_FAMILY_COUNT,
            method: "student-t-lower-bound-on-family-means",
            sidedness: "one-sided",
            confidenceLevel: 0.8,
            degreesOfFreedom: 9,
            criticalValue: CONTINUOUS_OFFENSE_ONE_SIDED_80_T_CRITICAL_DF9,
        },
        arms,
        selectedFamilies: families,
        shards,
    };
    if (
        campaign.shardCount !== CONTINUOUS_OFFENSE_SHARD_COUNT ||
        campaign.launchedGameCount !== CONTINUOUS_OFFENSE_LAUNCH_COUNT
    ) throw new Error("Continuous-offense launch count drifted");
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
