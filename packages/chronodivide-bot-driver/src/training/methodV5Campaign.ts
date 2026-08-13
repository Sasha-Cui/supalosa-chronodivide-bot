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
    METHOD_V5_CLOSEOUT_ARM_ORDER,
    MethodV5CloseoutArm,
    buildMethodV5CloseoutArms,
} from "./methodV5CloseoutPolicies.js";
import {
    METHOD_V5_PLAN_KIND,
    METHOD_V5_PLAN_SCHEMA_VERSION,
    MethodV5PlanEpisode,
    MethodV5RunPlan,
    parseMethodV5RunPlan,
    serializeMethodV5RunPlan,
    sha256File,
} from "./methodV5PlanRunner.js";

export const METHOD_V5_ENGINE_SEED_BASE = 3_730_000_000 as const;
export const METHOD_V5_MAX_TICKS = 24_000 as const;
export const METHOD_V5_FAMILY_COUNT = 19 as const;
export const METHOD_V5_COUNTRIES = [
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
export const METHOD_V5_SHARD_COUNT = METHOD_V5_FAMILY_COUNT * METHOD_V5_COUNTRIES.length;
export const METHOD_V5_LAUNCH_COUNT = METHOD_V5_SHARD_COUNT * METHOD_V5_CLOSEOUT_ARM_ORDER.length * 2;
export const METHOD_V5_SOURCE_CAMPAIGN_SHA256 =
    "73a4e88ba618281d368c78e2e7c7d667e147e40378fe458ed01f74af8bad1de6" as const;
export const METHOD_V5_SUPPORTED_POPULATION_SHA256 =
    "80012d84a9897c90fa54acf7971cdb66551b842cd072f33ecec9f6c6f9b10084" as const;
export const METHOD_V5_ECONOMIC_START_GATE_SHA256 =
    "f3d50b207ad6a4aaae48842d8e78e133411d0edd7fc5d37a0d8687f213f38e22" as const;

export const METHOD_V5_RANKING_RULE = [
    "literal candidate wins descending",
    "literal candidate wins minus baseline wins descending",
    "literal draw probability ascending",
    "minimum country win-minus-loss probability descending",
    "median tick among literal candidate wins ascending",
    "canonical policy SHA-256 ascending",
] as const;

export const METHOD_V5_ADVANCEMENT_RULE = [
    "literal candidate win probability strictly greater than 0.50",
    "literal candidate wins strictly exceed literal baseline wins",
    "candidate wins strictly exceed losses in at least seven of nine countries",
    "all 2,736 launches are technically clean under endpoint v5",
] as const;

export type MethodV5Family = {
    familyId: string;
    mapName: string;
    mapSha256: string;
};

export type MethodV5Campaign = {
    schemaVersion: 3;
    kind: "method-v6-supported-open-training-literal-endpoint";
    status: "FROZEN_METHOD_V6_SUPPORTED_OBJECTIVE_DIRECTED_OPEN_TRAINING_ENDPOINT_V5_SCREEN";
    generatedAt: string;
    sourceGitCommit: string;
    sourceRuntimeSha256: string;
    baselineGitCommit: string;
    baselineRuntimeSha256: string;
    gameApiRuntimeSha256: string;
    packageLockSha256: string;
    sourceCampaignPath: string;
    sourceCampaignSha256: typeof METHOD_V5_SOURCE_CAMPAIGN_SHA256;
    supportedPopulationPath: string;
    supportedPopulationSha256: typeof METHOD_V5_SUPPORTED_POPULATION_SHA256;
    economicStartGatePath: string;
    economicStartGateSha256: typeof METHOD_V5_ECONOMIC_START_GATE_SHA256;
    sourcePopulationCommitmentSha256: typeof METHOD_V5_SUPPORTED_POPULATION_SHA256;
    outcomeFreePopulationSelection: true;
    excludedTechnicalFamilyCount: 3;
    priorCampaignReuse: "none_fresh_complete_rerun";
    replacesFailedArrayJobId: "22094119";
    replacesFailedControllerJobId: "22094121";
    endpointVersion: typeof LITERAL_BUILDING_ELIMINATION_ENDPOINT_VERSION;
    endpointSha256: typeof LITERAL_BUILDING_ELIMINATION_ENDPOINT_SHA256;
    outcomeAccess: "open-training-only-no-paper-claim";
    familyCount: number;
    countryCount: number;
    reciprocalSlotCount: 2;
    policyCount: number;
    seedBlockCount: number;
    launchedGameCount: number;
    engineSeedBase: typeof METHOD_V5_ENGINE_SEED_BASE;
    maxTicks: typeof METHOD_V5_MAX_TICKS;
    countries: readonly Countries[];
    rankingRule: readonly string[];
    advancementRule: readonly string[];
    arms: MethodV5CloseoutArm[];
    selectedFamilies: MethodV5Family[];
    shards: Array<{
        shardIndex: number;
        planFile: string;
        planSha256: string;
        runId: string;
        familyId: string;
        mapName: string;
        mapSha256: string;
        country: Countries;
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

const gitRoot = (): string => execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();

const runtimeCommitment = (trees: ReturnType<typeof createExperimentManifest>["source"]["runtimeTrees"]): string =>
    crypto.createHash("sha256").update(JSON.stringify(trees)).digest("hex");

export const buildMethodV5Episodes = (arms: MethodV5CloseoutArm[]): MethodV5PlanEpisode[] =>
    arms.flatMap((arm, armIndex) => ([0, 1] as const).map((candidateSlot) => ({
        episodeId: `a${armIndex}-s${candidateSlot}`,
        armId: arm.armId,
        policyId: arm.policyId,
        candidateSlot,
    })));

export const bindMethodV5Families = (
    supportedPopulation: unknown,
    repoRoot: string,
): MethodV5Family[] => {
    if (
        !isRecord(supportedPopulation) || supportedPopulation.schemaVersion !== 1 ||
        supportedPopulation.status !== "FROZEN_METHOD_V6_OPEN_TRAINING_ECONOMIC_START_SUPPORTED_POPULATION" ||
        supportedPopulation.authorizedUse !== "generate_complete_replacement_method_v6_open_training_campaign_with_fresh_seeds" ||
        supportedPopulation.outcomeFree !== true || supportedPopulation.sourceFamilyCount !== 22 ||
        supportedPopulation.supportedFamilyCount !== METHOD_V5_FAMILY_COUNT ||
        supportedPopulation.unsupportedFamilyCount !== 3 ||
        supportedPopulation.sourceOpenCampaignSha256 !== METHOD_V5_SOURCE_CAMPAIGN_SHA256 ||
        supportedPopulation.economicStartGateSha256 !== METHOD_V5_ECONOMIC_START_GATE_SHA256 ||
        !Array.isArray(supportedPopulation.forbiddenInputs) ||
        supportedPopulation.forbiddenInputs.join(",") !== "winner,score,candidateScore,outcomeStatus,policyArmPerformance" ||
        !Array.isArray(supportedPopulation.supportedFamilies) ||
        supportedPopulation.supportedFamilies.length !== METHOD_V5_FAMILY_COUNT ||
        !Array.isArray(supportedPopulation.unsupportedFamilies) ||
        supportedPopulation.unsupportedFamilies.length !== 3
    ) throw new Error("Method-v6 supported-population input has an invalid schema");
    const families = supportedPopulation.supportedFamilies.map((raw, index): MethodV5Family => {
        if (
            !isRecord(raw) || typeof raw.familyId !== "string" ||
            typeof raw.mapName !== "string" || path.basename(raw.mapName) !== raw.mapName ||
            typeof raw.mapSha256 !== "string" || !/^[0-9a-f]{64}$/.test(raw.mapSha256)
        ) throw new Error(`Method-v6 supported family ${index} is malformed`);
        const fullPath = path.join(repoRoot, "packages", "chronodivide-bot-driver", "data", raw.mapName);
        if (!fs.existsSync(fullPath) || sha256File(fullPath) !== raw.mapSha256) {
            throw new Error(`Method-v6 supported family ${raw.familyId} lacks its exact committed map`);
        }
        return {
            familyId: raw.familyId,
            mapName: raw.mapName,
            mapSha256: raw.mapSha256,
        };
    });
    if (
        new Set(families.map(({ familyId }) => familyId)).size !== METHOD_V5_FAMILY_COUNT ||
        new Set(families.map(({ mapSha256 }) => mapSha256)).size !== METHOD_V5_FAMILY_COUNT
    ) throw new Error("Method-v6 supported families are not unique");
    return families;
};

const main = async (): Promise<void> => {
    const repoRoot = gitRoot();
    const driverRoot = path.join(repoRoot, "packages", "chronodivide-bot-driver");
    if (path.resolve(process.cwd()) !== driverRoot) throw new Error(`Method-v5 generator must start in ${driverRoot}`);
    if (!process.env.BASELINE_PACKAGE_ROOT || process.env.REQUIRE_EXTERNAL_BASELINE !== "true") {
        throw new Error("Method-v5 generation requires the pinned external baseline environment");
    }
    const supportedPopulationPath = requiredPath("METHOD_V6_SUPPORTED_POPULATION");
    const outRoot = requiredPath("OUT_ROOT");
    if (fs.existsSync(outRoot)) throw new Error(`Refusing to reuse Method-v5 OUT_ROOT ${outRoot}`);
    if (sha256File(supportedPopulationPath) !== METHOD_V5_SUPPORTED_POPULATION_SHA256) {
        throw new Error("Method-v6 supported population differs from the frozen commitment");
    }
    const supportedPopulation = JSON.parse(fs.readFileSync(supportedPopulationPath, "utf8")) as unknown;
    const families = bindMethodV5Families(supportedPopulation, repoRoot);
    if (!isRecord(supportedPopulation)) throw new Error("Method-v6 supported population is malformed");
    const sourceCampaignPath = path.resolve(String(supportedPopulation.sourceOpenCampaignPath));
    const economicStartGatePath = path.resolve(String(supportedPopulation.economicStartGatePath));
    if (
        sha256File(sourceCampaignPath) !== METHOD_V5_SOURCE_CAMPAIGN_SHA256 ||
        sha256File(economicStartGatePath) !== METHOD_V5_ECONOMIC_START_GATE_SHA256
    ) throw new Error("Method-v6 supported-population evidence chain drifted");
    const arms = buildMethodV5CloseoutArms();
    const baselineFactory = await loadBaselineFactory(path.join(repoRoot, "packages", "chronodivide-bot"));
    const generationManifest = createExperimentManifest({
        runId: "plan-method-v6-supported-open-training-v2",
        mixDir: path.join(driverRoot, "data"),
        maps: families.map(({ mapName }) => mapName),
        effectiveConfig: {
            purpose: "method-v6-supported-objective-directed-open-training-literal-endpoint-v5",
            outcomeAccess: false,
            countries: METHOD_V5_COUNTRIES,
            reciprocalSlots: [0, 1],
            arms,
            maxTicks: METHOD_V5_MAX_TICKS,
        },
        baseline: baselineFactory.descriptor,
        gameSeedBase: METHOD_V5_ENGINE_SEED_BASE,
    });
    const baseline = generationManifest.software.baseline;
    if (
        generationManifest.source.gitBranch !== "main" ||
        generationManifest.source.trackedDirty !== false ||
        !generationManifest.source.gitCommit ||
        baseline.kind !== "external-package" ||
        baseline.trackedDirty !== false ||
        !baseline.gitCommit ||
        !baseline.runtimeTree.sha256 ||
        !generationManifest.software.gameApiRuntimeTree.sha256 ||
        !generationManifest.software.packageLockSha256 ||
        generationManifest.inputs.maps.some((map) => !map.exists)
    ) throw new Error("Method-v5 plan generation lacks clean source, external baseline, or maps");

    fs.mkdirSync(path.dirname(outRoot), { recursive: true, mode: 0o700 });
    fs.mkdirSync(outRoot, { recursive: false, mode: 0o700 });
    const plansRoot = path.join(outRoot, "plans");
    fs.mkdirSync(plansRoot, { mode: 0o700 });
    const shards: MethodV5Campaign["shards"] = [];
    const sourceRuntimeSha256 = runtimeCommitment(generationManifest.source.runtimeTrees);
    for (let familyIndex = 0; familyIndex < families.length; familyIndex++) {
        for (let countryIndex = 0; countryIndex < METHOD_V5_COUNTRIES.length; countryIndex++) {
            const family = families[familyIndex];
            const country = METHOD_V5_COUNTRIES[countryIndex];
            const shardIndex = familyIndex * METHOD_V5_COUNTRIES.length + countryIndex;
            const requestedEngineSeed = derivePairedEngineSeed(METHOD_V5_ENGINE_SEED_BASE, shardIndex);
            const runId = `method-v6-supported-f${familyIndex}-c${countryIndex}-${generationManifest.source.gitCommit.slice(0, 10)}`;
            const plan: MethodV5RunPlan = parseMethodV5RunPlan({
                schemaVersion: METHOD_V5_PLAN_SCHEMA_VERSION,
                kind: METHOD_V5_PLAN_KIND,
                runId,
                sourceGitCommit: generationManifest.source.gitCommit,
                sourceRuntimeSha256,
                baselineGitCommit: baseline.gitCommit,
                baselineRuntimeSha256: baseline.runtimeTree.sha256,
                gameApiRuntimeSha256: generationManifest.software.gameApiRuntimeTree.sha256,
                packageLockSha256: generationManifest.software.packageLockSha256,
                sourcePopulationCommitmentSha256: METHOD_V5_SUPPORTED_POPULATION_SHA256,
                endpointVersion: LITERAL_BUILDING_ELIMINATION_ENDPOINT_VERSION,
                endpointSha256: LITERAL_BUILDING_ELIMINATION_ENDPOINT_SHA256,
                family,
                country,
                engineSeedBase: METHOD_V5_ENGINE_SEED_BASE,
                seedBlockIndex: shardIndex,
                requestedEngineSeed,
                maxTicks: METHOD_V5_MAX_TICKS,
                arms,
                episodes: buildMethodV5Episodes(arms),
            });
            const planFile = path.join(plansRoot, `shard-${String(shardIndex).padStart(3, "0")}.json`);
            fs.writeFileSync(planFile, serializeMethodV5RunPlan(plan), { flag: "wx", mode: 0o600 });
            shards.push({
                shardIndex,
                planFile,
                planSha256: sha256File(planFile),
                runId,
                ...family,
                country,
                seedBlockIndex: shardIndex,
                requestedEngineSeed,
                launchedGameCount: plan.episodes.length,
            });
        }
    }
    const campaign: MethodV5Campaign = {
        schemaVersion: 3,
        kind: "method-v6-supported-open-training-literal-endpoint",
        status: "FROZEN_METHOD_V6_SUPPORTED_OBJECTIVE_DIRECTED_OPEN_TRAINING_ENDPOINT_V5_SCREEN",
        generatedAt: new Date().toISOString(),
        sourceGitCommit: generationManifest.source.gitCommit,
        sourceRuntimeSha256,
        baselineGitCommit: baseline.gitCommit,
        baselineRuntimeSha256: baseline.runtimeTree.sha256,
        gameApiRuntimeSha256: generationManifest.software.gameApiRuntimeTree.sha256,
        packageLockSha256: generationManifest.software.packageLockSha256,
        sourceCampaignPath,
        sourceCampaignSha256: METHOD_V5_SOURCE_CAMPAIGN_SHA256,
        supportedPopulationPath,
        supportedPopulationSha256: METHOD_V5_SUPPORTED_POPULATION_SHA256,
        economicStartGatePath,
        economicStartGateSha256: METHOD_V5_ECONOMIC_START_GATE_SHA256,
        sourcePopulationCommitmentSha256: METHOD_V5_SUPPORTED_POPULATION_SHA256,
        outcomeFreePopulationSelection: true,
        excludedTechnicalFamilyCount: 3,
        priorCampaignReuse: "none_fresh_complete_rerun",
        replacesFailedArrayJobId: "22094119",
        replacesFailedControllerJobId: "22094121",
        endpointVersion: LITERAL_BUILDING_ELIMINATION_ENDPOINT_VERSION,
        endpointSha256: LITERAL_BUILDING_ELIMINATION_ENDPOINT_SHA256,
        outcomeAccess: "open-training-only-no-paper-claim",
        familyCount: families.length,
        countryCount: METHOD_V5_COUNTRIES.length,
        reciprocalSlotCount: 2,
        policyCount: arms.length,
        seedBlockCount: shards.length,
        launchedGameCount: shards.length * arms.length * 2,
        engineSeedBase: METHOD_V5_ENGINE_SEED_BASE,
        maxTicks: METHOD_V5_MAX_TICKS,
        countries: METHOD_V5_COUNTRIES,
        rankingRule: METHOD_V5_RANKING_RULE,
        advancementRule: METHOD_V5_ADVANCEMENT_RULE,
        arms,
        selectedFamilies: families,
        shards,
    };
    if (campaign.launchedGameCount !== METHOD_V5_LAUNCH_COUNT) throw new Error("Method-v5 launch count drifted");
    const campaignPath = path.join(outRoot, "campaign.json");
    fs.writeFileSync(campaignPath, JSON.stringify(campaign, null, 2) + "\n", { flag: "wx", mode: 0o600 });
    fs.writeFileSync(path.join(outRoot, "plan-files.txt"), shards.map(({ planFile }) => planFile).join("\n") + "\n", { flag: "wx" });
    console.log(JSON.stringify({ campaignPath, campaignSha256: sha256File(campaignPath), shards: shards.length, launches: campaign.launchedGameCount }));
};

const invoked = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (import.meta.url === invoked) main().catch((error) => { console.error(error); process.exitCode = 1; });
