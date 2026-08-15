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
    MISSION_NATIVE_CLOSEOUT_ARM_ORDER,
    MissionNativeCloseoutArm,
    buildMissionNativeCloseoutArms,
} from "./missionNativeCloseoutExperimentPolicy.js";
import {
    MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_PLAN_KIND,
    MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_PLAN_SCHEMA_VERSION,
    MissionNativeCloseoutOpenDevelopmentPlanEpisode,
    MissionNativeCloseoutOpenDevelopmentRunPlan,
    parseMissionNativeCloseoutOpenDevelopmentRunPlan,
    serializeMissionNativeCloseoutOpenDevelopmentRunPlan,
    sha256File,
} from "./missionNativeCloseoutOpenDevelopmentPlanRunner.js";

export const MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_ENGINE_SEED_BASE = 4_270_000_000 as const;
export const MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_MAX_TICKS = 24_000 as const;
export const MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_FAMILY_COUNT = 10 as const;
export const MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_SEED_BLOCKS_PER_FAMILY = 1 as const;
export const MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_SUPPORTED_POPULATION_SHA256 =
    "80012d84a9897c90fa54acf7971cdb66551b842cd072f33ecec9f6c6f9b10084" as const;
export const MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_SOURCE_CAMPAIGN_SHA256 =
    "adc33ce6748ff4f047187fb8d375ac4467c2fb8afbc39e657388298be51a9dca" as const;
export const MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_PROTOCOL_SHA256 =
    "3ac159060064db1b6020ccb41706f6bceed4ba46dc87696f0af0d3f8378bf72e" as const;
export const MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_V34_GATE_SHA256 =
    "db1b6cd682f8aff4f51297e68e8bedd90ce3cba9e17971347a8b5bcd900991f6" as const;
export const MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_V35_PROBE_SHA256 =
    "55fac9bc4d6190cbf1f00e078d6f377eeb2a33e1a4408da6154215e529f5504e" as const;
export const MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_V35_GATE_SHA256 =
    "777a0c61375ac6170da610e4a9e7c2763c6efa3c529382b35d501128bc3e2704" as const;
export const MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_BASELINE_COMMIT =
    "165b77a71d0cf5ebd27c65b19d0486bcbae78d0f" as const;
export const MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_ONE_SIDED_80_T_CRITICAL_DF9 = 0.8834038596855205 as const;

export const MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_COUNTRIES = [
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

export const MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_SHARD_COUNT =
    MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_FAMILY_COUNT * MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_SEED_BLOCKS_PER_FAMILY * MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_COUNTRIES.length;
export const MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_LAUNCH_COUNT =
    MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_SHARD_COUNT * MISSION_NATIVE_CLOSEOUT_ARM_ORDER.length * 2;

export const MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_ADVANCEMENT_RULE = [
    "one-sided family-clustered 80% lower confidence bound for V35 minus external paired literal score is above zero",
    "V35 literal wins exceed losses overall and within pooled Allied and Soviet factions",
    "V35 literal wins exceed losses in at least seven of nine countries",
    "family-macro V35 literal-win probability is above both external Supalosa and V34",
    "family-macro V35 draw probability is below both external Supalosa and V34",
    "every leave-one-family-out V35 minus external paired literal-score effect is positive",
    "all 540 launches are technically and information-boundary clean under literal endpoint v5",
] as const;

export type MissionNativeCloseoutOpenDevelopmentFamily = {
    familyId: string;
    mapName: string;
    mapSha256: string;
    selectionDigest: string;
};

export type MissionNativeCloseoutOpenDevelopmentCampaign = {
    schemaVersion: 1;
    kind: "mission-native-closeout-open-development-literal-endpoint";
    status: "FROZEN_MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_V1_ENDPOINT_V5";
    generatedAt: string;
    sourceGitCommit: string;
    sourceRuntimeSha256: string;
    baselineGitCommit: string;
    baselineRuntimeSha256: string;
    gameApiRuntimeSha256: string;
    packageLockSha256: string;
    supportedPopulationPath: string;
    supportedPopulationSha256: typeof MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_SUPPORTED_POPULATION_SHA256;
    sourcePopulationCommitmentSha256: typeof MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_SUPPORTED_POPULATION_SHA256;
    sourceCampaignPath: string;
    sourceCampaignSha256: typeof MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_SOURCE_CAMPAIGN_SHA256;
    familySelectionRule: "exact-ten-fixed-families-from-prespecified-continuous-offense-campaign";
    outcomeFreePopulationSelection: true;
    endpointVersion: typeof LITERAL_BUILDING_ELIMINATION_ENDPOINT_VERSION;
    endpointSha256: typeof LITERAL_BUILDING_ELIMINATION_ENDPOINT_SHA256;
    protocolPath: string;
    protocolSha256: typeof MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_PROTOCOL_SHA256;
    technicalEvidence: Array<{
        role: "v34_population" | "v35_liveness_probe" | "v35_population_revalidation";
        path: string;
        sha256: string;
        jobId: "22262232" | "22264739" | "22267338";
        status: string;
    }>;
    priorCampaignReuse: "fixed_families_only_fresh_seeds_and_games";
    outcomeAccess: "open-development-only-no-paper-claim";
    familyCount: number;
    seedBlocksPerFamily: number;
    countryCount: number;
    reciprocalSlotCount: 2;
    policyCount: number;
    shardCount: number;
    launchedGameCount: number;
    engineSeedBase: typeof MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_ENGINE_SEED_BASE;
    maxTicks: typeof MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_MAX_TICKS;
    countries: readonly Countries[];
    advancementRule: readonly string[];
    confidenceInterval: {
        unit: "family";
        familyCount: typeof MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_FAMILY_COUNT;
        method: "student-t-lower-bound-on-family-means";
        sidedness: "one-sided";
        confidenceLevel: 0.8;
        degreesOfFreedom: 9;
        criticalValue: typeof MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_ONE_SIDED_80_T_CRITICAL_DF9;
    };
    arms: MissionNativeCloseoutArm[];
    selectedFamilies: MissionNativeCloseoutOpenDevelopmentFamily[];
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

export const buildMissionNativeCloseoutOpenDevelopmentEpisodes = (arms: MissionNativeCloseoutArm[]): MissionNativeCloseoutOpenDevelopmentPlanEpisode[] =>
    arms.flatMap((arm, armIndex) => ([0, 1] as const).map((candidateSlot) => ({
        episodeId: `a${armIndex}-s${candidateSlot}`,
        armId: arm.armId,
        policyId: arm.policyId,
        candidateSlot,
    })));

export const selectMissionNativeCloseoutOpenDevelopmentFamilies = (
    supportedPopulation: unknown,
    sourceCampaign: unknown,
    repoRoot: string,
): MissionNativeCloseoutOpenDevelopmentFamily[] => {
    if (
        !isRecord(supportedPopulation) || supportedPopulation.schemaVersion !== 1 ||
        supportedPopulation.status !== "FROZEN_METHOD_V6_OPEN_TRAINING_ECONOMIC_START_SUPPORTED_POPULATION" ||
        supportedPopulation.outcomeFree !== true || !Array.isArray(supportedPopulation.supportedFamilies)
    ) throw new Error("Mission-native closeout open-development supported-population input is invalid");
    if (
        !isRecord(sourceCampaign) || sourceCampaign.schemaVersion !== 1 ||
        sourceCampaign.status !== "FROZEN_CONTINUOUS_OFFENSE_OPEN_DEVELOPMENT_V2_ENDPOINT_V5" ||
        sourceCampaign.sourcePopulationCommitmentSha256 !== MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_SUPPORTED_POPULATION_SHA256 ||
        !Array.isArray(sourceCampaign.selectedFamilies) || sourceCampaign.selectedFamilies.length !== 10
    ) throw new Error("Mission-native closeout open-development source campaign is invalid");
    const supported = new Map((supportedPopulation.supportedFamilies as unknown[]).map((raw) => {
        if (!isRecord(raw) || typeof raw.familyId !== "string" || typeof raw.mapSha256 !== "string") {
            throw new Error("Mission-native closeout open-development supported family is malformed");
        }
        return [raw.familyId, raw.mapSha256];
    }));
    const families = (sourceCampaign.selectedFamilies as unknown[]).map((raw, index): MissionNativeCloseoutOpenDevelopmentFamily => {
        if (
            !isRecord(raw) || typeof raw.familyId !== "string" || typeof raw.mapName !== "string" ||
            path.basename(raw.mapName) !== raw.mapName || typeof raw.mapSha256 !== "string" ||
            !/^[0-9a-f]{64}$/.test(raw.mapSha256) || supported.get(raw.familyId) !== raw.mapSha256
        ) throw new Error(`Mission-native closeout open-development source family ${index} is malformed or unsupported`);
        const mapPath = path.join(repoRoot, "packages", "chronodivide-bot-driver", "data", raw.mapName);
        if (!fs.existsSync(mapPath) || sha256File(mapPath) !== raw.mapSha256) {
            throw new Error(`Mission-native closeout open-development family ${raw.familyId} lacks exact committed map bytes`);
        }
        return {
            familyId: raw.familyId,
            mapName: raw.mapName,
            mapSha256: raw.mapSha256,
            selectionDigest: sha256Text(`mission-native-closeout-open-development-v1|${raw.familyId}|${raw.mapSha256}`),
        };
    });
    if (
        new Set(families.map(({ familyId }) => familyId)).size !== MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_FAMILY_COUNT ||
        new Set(families.map(({ mapSha256 }) => mapSha256)).size !== MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_FAMILY_COUNT
    ) throw new Error("Mission-native closeout open-development selected families are not unique");
    return families;
};

const main = async (): Promise<void> => {
    const repoRoot = gitRoot();
    const driverRoot = path.join(repoRoot, "packages", "chronodivide-bot-driver");
    if (path.resolve(process.cwd()) !== driverRoot) throw new Error(`Generator must start in ${driverRoot}`);
    if (!process.env.BASELINE_PACKAGE_ROOT || process.env.REQUIRE_EXTERNAL_BASELINE !== "true") {
        throw new Error("Generation requires the pinned external baseline environment");
    }
    const supportedPopulationPath = requiredPath("MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_SUPPORTED_POPULATION");
    const sourceCampaignPath = requiredPath("MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_SOURCE_CAMPAIGN");
    const protocolPath = requiredPath("MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_PROTOCOL");
    const v34GatePath = requiredPath("MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_V34_GATE");
    const v35ProbePath = requiredPath("MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_V35_PROBE");
    const v35GatePath = requiredPath("MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_V35_GATE");
    const outRoot = requiredPath("OUT_ROOT");
    if (fs.existsSync(outRoot)) throw new Error(`Refusing to reuse OUT_ROOT ${outRoot}`);
    for (const [filePath, digest, label] of [
        [supportedPopulationPath, MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_SUPPORTED_POPULATION_SHA256, "population"],
        [sourceCampaignPath, MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_SOURCE_CAMPAIGN_SHA256, "source campaign"],
        [protocolPath, MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_PROTOCOL_SHA256, "protocol"],
        [v34GatePath, MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_V34_GATE_SHA256, "V34 population gate"],
        [v35ProbePath, MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_V35_PROBE_SHA256, "V35 liveness probe"],
        [v35GatePath, MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_V35_GATE_SHA256, "V35 population gate"],
    ] as const) if (sha256File(filePath) !== digest) throw new Error(`Mission-native closeout open-development ${label} commitment drifted`);
    const evidenceSpecs = [
        [v34GatePath, "v34_population", "22262232", "PASS_OUTCOME_FREE_MISSION_NATIVE_CLOSEOUT_ALL_COUNTRY_GATE_V34_R1"],
        [v35ProbePath, "v35_liveness_probe", "22264739", "PASS_OUTCOME_FREE_V35_R1_LIVENESS_PROBE"],
        [v35GatePath, "v35_population_revalidation", "22267338", "PASS_OUTCOME_FREE_MISSION_NATIVE_CLOSEOUT_ALL_COUNTRY_GATE_V35_R2"],
    ] as const;
    const technicalEvidence = evidenceSpecs.map(([filePath, role, jobId, status]) => {
        const evidence = JSON.parse(fs.readFileSync(filePath, "utf8")) as RecordValue;
        if (
            evidence.status !== status || evidence.outcomeFree !== true ||
            !isRecord(evidence.scheduler) || evidence.scheduler.jobId !== jobId ||
            evidence.scheduler.account !== "pi_jss233"
        ) throw new Error(`Mission-native closeout technical evidence ${role} does not authorize generation`);
        return { role, path: filePath, sha256: sha256File(filePath), jobId, status };
    });

    const supportedPopulation = JSON.parse(fs.readFileSync(supportedPopulationPath, "utf8")) as unknown;
    const sourceCampaign = JSON.parse(fs.readFileSync(sourceCampaignPath, "utf8")) as unknown;
    const families = selectMissionNativeCloseoutOpenDevelopmentFamilies(supportedPopulation, sourceCampaign, repoRoot);
    const arms = buildMissionNativeCloseoutArms();
    const baselineFactory = await loadBaselineFactory(path.join(repoRoot, "packages", "chronodivide-bot"));
    const generationManifest = createExperimentManifest({
        runId: "plan-mission-native-closeout-open-development-v1",
        mixDir: path.join(driverRoot, "data"),
        maps: families.map(({ mapName }) => mapName),
        effectiveConfig: {
            purpose: "mission-native-closeout-open-development-v1-literal-endpoint-v5",
            outcomeAccess: false,
            countries: MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_COUNTRIES,
            reciprocalSlots: [0, 1],
            seedBlocksPerFamily: MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_SEED_BLOCKS_PER_FAMILY,
            arms,
            maxTicks: MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_MAX_TICKS,
            sourceCampaignSha256: MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_SOURCE_CAMPAIGN_SHA256,
            priorCampaignReuse: "fixed_families_only_fresh_seed_namespace_and_games",
            technicalEvidence,
        },
        baseline: baselineFactory.descriptor,
        gameSeedBase: MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_ENGINE_SEED_BASE,
    });
    const baseline = generationManifest.software.baseline;
    if (
        generationManifest.source.gitBranch !== "main" || generationManifest.source.trackedDirty !== false ||
        !generationManifest.source.gitCommit || baseline.kind !== "external-package" ||
        baseline.trackedDirty !== false || !baseline.gitCommit || !baseline.runtimeTree.sha256 ||
        !generationManifest.software.gameApiRuntimeTree.sha256 ||
        !generationManifest.software.packageLockSha256 || generationManifest.inputs.maps.some((map) => !map.exists)
    ) throw new Error("Mission-native closeout open-development generation lacks clean source, baseline, API, or maps");
    if (baseline.gitCommit !== MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_BASELINE_COMMIT) {
        throw new Error("Mission-native closeout external Supalosa commit drifted");
    }

    fs.mkdirSync(path.dirname(outRoot), { recursive: true, mode: 0o700 });
    fs.mkdirSync(outRoot, { recursive: false, mode: 0o700 });
    const plansRoot = path.join(outRoot, "plans");
    fs.mkdirSync(plansRoot, { mode: 0o700 });
    const shards: MissionNativeCloseoutOpenDevelopmentCampaign["shards"] = [];
    const sourceRuntimeSha256 = runtimeCommitment(generationManifest.source.runtimeTrees);
    for (let familyIndex = 0; familyIndex < families.length; familyIndex += 1) {
        for (let countryIndex = 0; countryIndex < MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_COUNTRIES.length; countryIndex += 1) {
            const family = families[familyIndex];
            const country = MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_COUNTRIES[countryIndex];
            const shardIndex = familyIndex * MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_COUNTRIES.length + countryIndex;
            const seedBlockIndex = shardIndex;
            const requestedEngineSeed = derivePairedEngineSeed(MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_ENGINE_SEED_BASE, seedBlockIndex);
            const runId = `mission-native-closeout-v1-f${familyIndex}-c${countryIndex}-${generationManifest.source.gitCommit.slice(0, 10)}`;
            const plan: MissionNativeCloseoutOpenDevelopmentRunPlan = parseMissionNativeCloseoutOpenDevelopmentRunPlan({
                schemaVersion: MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_PLAN_SCHEMA_VERSION,
                kind: MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_PLAN_KIND,
                runId,
                sourceGitCommit: generationManifest.source.gitCommit,
                sourceRuntimeSha256,
                baselineGitCommit: baseline.gitCommit,
                baselineRuntimeSha256: baseline.runtimeTree.sha256,
                gameApiRuntimeSha256: generationManifest.software.gameApiRuntimeTree.sha256,
                packageLockSha256: generationManifest.software.packageLockSha256,
                sourcePopulationCommitmentSha256: MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_SUPPORTED_POPULATION_SHA256,
                endpointVersion: LITERAL_BUILDING_ELIMINATION_ENDPOINT_VERSION,
                endpointSha256: LITERAL_BUILDING_ELIMINATION_ENDPOINT_SHA256,
                family: {
                    familyId: family.familyId,
                    mapName: family.mapName,
                    mapSha256: family.mapSha256,
                },
                country,
                engineSeedBase: MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_ENGINE_SEED_BASE,
                seedBlockIndex,
                requestedEngineSeed,
                maxTicks: MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_MAX_TICKS,
                arms,
                episodes: buildMissionNativeCloseoutOpenDevelopmentEpisodes(arms),
            });
            const planFile = path.join(plansRoot, `shard-${String(shardIndex).padStart(3, "0")}.json`);
            fs.writeFileSync(planFile, serializeMissionNativeCloseoutOpenDevelopmentRunPlan(plan), { flag: "wx", mode: 0o600 });
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
    const campaign: MissionNativeCloseoutOpenDevelopmentCampaign = {
        schemaVersion: 1,
        kind: "mission-native-closeout-open-development-literal-endpoint",
        status: "FROZEN_MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_V1_ENDPOINT_V5",
        generatedAt: new Date().toISOString(),
        sourceGitCommit: generationManifest.source.gitCommit,
        sourceRuntimeSha256,
        baselineGitCommit: baseline.gitCommit,
        baselineRuntimeSha256: baseline.runtimeTree.sha256,
        gameApiRuntimeSha256: generationManifest.software.gameApiRuntimeTree.sha256,
        packageLockSha256: generationManifest.software.packageLockSha256,
        supportedPopulationPath,
        supportedPopulationSha256: MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_SUPPORTED_POPULATION_SHA256,
        sourcePopulationCommitmentSha256: MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_SUPPORTED_POPULATION_SHA256,
        sourceCampaignPath,
        sourceCampaignSha256: MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_SOURCE_CAMPAIGN_SHA256,
        familySelectionRule: "exact-ten-fixed-families-from-prespecified-continuous-offense-campaign",
        outcomeFreePopulationSelection: true,
        endpointVersion: LITERAL_BUILDING_ELIMINATION_ENDPOINT_VERSION,
        endpointSha256: LITERAL_BUILDING_ELIMINATION_ENDPOINT_SHA256,
        protocolPath,
        protocolSha256: MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_PROTOCOL_SHA256,
        technicalEvidence,
        priorCampaignReuse: "fixed_families_only_fresh_seeds_and_games",
        outcomeAccess: "open-development-only-no-paper-claim",
        familyCount: families.length,
        seedBlocksPerFamily: MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_SEED_BLOCKS_PER_FAMILY,
        countryCount: MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_COUNTRIES.length,
        reciprocalSlotCount: 2,
        policyCount: arms.length,
        shardCount: shards.length,
        launchedGameCount: shards.length * arms.length * 2,
        engineSeedBase: MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_ENGINE_SEED_BASE,
        maxTicks: MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_MAX_TICKS,
        countries: MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_COUNTRIES,
        advancementRule: MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_ADVANCEMENT_RULE,
        confidenceInterval: {
            unit: "family",
            familyCount: MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_FAMILY_COUNT,
            method: "student-t-lower-bound-on-family-means",
            sidedness: "one-sided",
            confidenceLevel: 0.8,
            degreesOfFreedom: 9,
            criticalValue: MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_ONE_SIDED_80_T_CRITICAL_DF9,
        },
        arms,
        selectedFamilies: families,
        shards,
    };
    if (
        campaign.shardCount !== MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_SHARD_COUNT ||
        campaign.launchedGameCount !== MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_LAUNCH_COUNT
    ) throw new Error("Mission-native closeout open-development launch count drifted");
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
