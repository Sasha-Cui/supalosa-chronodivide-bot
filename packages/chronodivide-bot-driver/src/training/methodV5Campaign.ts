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

export const METHOD_V5_ENGINE_SEED_BASE = 3_600_000_000 as const;
export const METHOD_V5_MAX_TICKS = 24_000 as const;
export const METHOD_V5_FAMILY_COUNT = 22 as const;
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
    "32c3d7c9af5ba95c46447053d7e813dc3f6e9879d58c4f4fedd94ce9d5b25230" as const;
export const METHOD_V5_TRAINING_POPULATION_SHA256 =
    "ece688c14d8c02b98754a88f04e42581f4c6c6044d742a7b8d4e0feaa5177fa5" as const;
export const METHOD_V5_MAP_CATALOG_SHA256 =
    "8f378ee52a2d8a6d45e5d23a1e521aa6b2e08e9ab174adc8066cce8a1824bd54" as const;

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
    "all 3,168 launches are technically clean under endpoint v4",
] as const;

export type MethodV5Family = {
    familyId: string;
    mapName: string;
    mapSha256: string;
};

export type MethodV5Campaign = {
    schemaVersion: 1;
    kind: "method-v5-open-training-literal-endpoint";
    status: "FROZEN_METHOD_V5_OPEN_TRAINING_LITERAL_ENDPOINT_V4_SCREEN";
    generatedAt: string;
    sourceGitCommit: string;
    sourceRuntimeSha256: string;
    baselineGitCommit: string;
    baselineRuntimeSha256: string;
    gameApiRuntimeSha256: string;
    packageLockSha256: string;
    sourceCampaignPath: string;
    sourceCampaignSha256: typeof METHOD_V5_SOURCE_CAMPAIGN_SHA256;
    mapCatalogPath: string;
    mapCatalogSha256: typeof METHOD_V5_MAP_CATALOG_SHA256;
    sourcePopulationCommitmentSha256: string;
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
    sourceCampaign: unknown,
    mapCatalog: unknown,
    repoRoot: string,
): MethodV5Family[] => {
    if (
        !isRecord(sourceCampaign) ||
        sourceCampaign.kind !== "method-v4-lifecycle-screen" ||
        sourceCampaign.sourcePopulationCommitmentSha256 !== METHOD_V5_TRAINING_POPULATION_SHA256 ||
        !Array.isArray(sourceCampaign.selectedFamilies) ||
        sourceCampaign.selectedFamilies.length !== METHOD_V5_FAMILY_COUNT ||
        !isRecord(mapCatalog) ||
        !Array.isArray(mapCatalog.families)
    ) throw new Error("Method-v5 source family inputs have an invalid schema");
    const catalog = new Map<string, RecordValue>();
    for (const raw of mapCatalog.families) {
        if (isRecord(raw) && typeof raw.familyId === "string") catalog.set(raw.familyId, raw);
    }
    return sourceCampaign.selectedFamilies.map((raw, index): MethodV5Family => {
        if (!isRecord(raw) || typeof raw.familyId !== "string" || typeof raw.representativeSha256 !== "string") {
            throw new Error(`Method-v5 source family ${index} is malformed`);
        }
        const catalogFamily = catalog.get(raw.familyId);
        if (!catalogFamily || !Array.isArray(catalogFamily.mapPaths)) {
            throw new Error(`Method-v5 source family ${raw.familyId} is missing from the catalog`);
        }
        const candidates = catalogFamily.mapPaths
            .filter((item): item is string => typeof item === "string")
            .filter((item) => item.startsWith("packages/chronodivide-bot-driver/data/"))
            .filter((item) => {
                const fullPath = path.join(repoRoot, item);
                return fs.existsSync(fullPath) && sha256File(fullPath) === raw.representativeSha256;
            });
        if (candidates.length !== 1) {
            throw new Error(`Method-v5 family ${raw.familyId} has ${candidates.length} exact representative maps`);
        }
        return {
            familyId: raw.familyId,
            mapName: path.basename(candidates[0]),
            mapSha256: raw.representativeSha256,
        };
    });
};

const main = async (): Promise<void> => {
    const repoRoot = gitRoot();
    const driverRoot = path.join(repoRoot, "packages", "chronodivide-bot-driver");
    if (path.resolve(process.cwd()) !== driverRoot) throw new Error(`Method-v5 generator must start in ${driverRoot}`);
    if (!process.env.BASELINE_PACKAGE_ROOT || process.env.REQUIRE_EXTERNAL_BASELINE !== "true") {
        throw new Error("Method-v5 generation requires the pinned external baseline environment");
    }
    const sourceCampaignPath = requiredPath("METHOD_V5_SOURCE_CAMPAIGN");
    const mapCatalogPath = requiredPath("METHOD_V5_MAP_CATALOG");
    const outRoot = requiredPath("OUT_ROOT");
    if (fs.existsSync(outRoot)) throw new Error(`Refusing to reuse Method-v5 OUT_ROOT ${outRoot}`);
    if (
        sha256File(sourceCampaignPath) !== METHOD_V5_SOURCE_CAMPAIGN_SHA256 ||
        sha256File(mapCatalogPath) !== METHOD_V5_MAP_CATALOG_SHA256
    ) throw new Error("Method-v5 family inputs differ from the frozen commitments");
    const families = bindMethodV5Families(
        JSON.parse(fs.readFileSync(sourceCampaignPath, "utf8")),
        JSON.parse(fs.readFileSync(mapCatalogPath, "utf8")),
        repoRoot,
    );
    const arms = buildMethodV5CloseoutArms();
    const baselineFactory = await loadBaselineFactory(path.join(repoRoot, "packages", "chronodivide-bot"));
    const generationManifest = createExperimentManifest({
        runId: "plan-method-v5-open-training-v1",
        mixDir: path.join(driverRoot, "data"),
        maps: families.map(({ mapName }) => mapName),
        effectiveConfig: {
            purpose: "method-v5-open-training-literal-endpoint-v4",
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
            const runId = `method-v5-f${familyIndex}-c${countryIndex}-${generationManifest.source.gitCommit.slice(0, 10)}`;
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
                sourcePopulationCommitmentSha256: METHOD_V5_TRAINING_POPULATION_SHA256,
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
        schemaVersion: 1,
        kind: "method-v5-open-training-literal-endpoint",
        status: "FROZEN_METHOD_V5_OPEN_TRAINING_LITERAL_ENDPOINT_V4_SCREEN",
        generatedAt: new Date().toISOString(),
        sourceGitCommit: generationManifest.source.gitCommit,
        sourceRuntimeSha256,
        baselineGitCommit: baseline.gitCommit,
        baselineRuntimeSha256: baseline.runtimeTree.sha256,
        gameApiRuntimeSha256: generationManifest.software.gameApiRuntimeTree.sha256,
        packageLockSha256: generationManifest.software.packageLockSha256,
        sourceCampaignPath,
        sourceCampaignSha256: METHOD_V5_SOURCE_CAMPAIGN_SHA256,
        mapCatalogPath,
        mapCatalogSha256: METHOD_V5_MAP_CATALOG_SHA256,
        sourcePopulationCommitmentSha256: METHOD_V5_TRAINING_POPULATION_SHA256,
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
