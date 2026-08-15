import { execFileSync } from "node:child_process";
import { isDeepStrictEqual } from "node:util";
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
    ProgressCertifiedV5Arm,
    buildProgressCertifiedV5Arms,
} from "./progressCertifiedV5ExperimentPolicy.js";
import {
    PROGRESS_CERTIFIED_PLAN_KIND,
    PROGRESS_CERTIFIED_PLAN_SCHEMA_VERSION,
    ProgressCertifiedPlanEpisode,
    ProgressCertifiedRunPlan,
    parseProgressCertifiedRunPlan,
    serializeProgressCertifiedRunPlan,
    sha256File,
} from "./progressCertifiedPlanRunner.js";

export const PROGRESS_CERTIFIED_V5_OPEN_DEVELOPMENT_ENGINE_SEED_BASE = 4_215_000_000 as const;
export const PROGRESS_CERTIFIED_V5_OPEN_DEVELOPMENT_MAX_TICKS = 24_000 as const;
export const PROGRESS_CERTIFIED_V5_OPEN_DEVELOPMENT_BASELINE_COMMIT =
    "165b77a71d0cf5ebd27c65b19d0486bcbae78d0f" as const;
export const PROGRESS_CERTIFIED_V5_OPEN_DEVELOPMENT_PROTOCOL_SHA256 =
    "91032745d809512cc749dabc185860f7bc201a1d077d8da3962b146b920d8cb2" as const;
export const PROGRESS_CERTIFIED_V5_COMPATIBILITY_SHA256 =
    "573f9a694561ae90d13197c39494144678ebfe039be138672258ed4b0e522718" as const;
export const PROGRESS_CERTIFIED_V5_COMPATIBILITY_JOB_ID = "22308006" as const;
export const PROGRESS_CERTIFIED_V5_COMPATIBILITY_SOURCE_COMMIT =
    "7b0a4e600ed1178248fb1b8aecff5f89bcb15865" as const;
export const PROGRESS_CERTIFIED_V5_ONE_SIDED_80_T_CRITICAL_DF9 = 0.8834038596855205 as const;

export const PROGRESS_CERTIFIED_V5_OPEN_DEVELOPMENT_COUNTRIES = [
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

export type ProgressCertifiedV5OpenDevelopmentFamily = {
    familyId: string;
    mapName: string;
    mapSha256: string;
};

export const PROGRESS_CERTIFIED_V5_OPEN_DEVELOPMENT_FAMILIES:
readonly ProgressCertifiedV5OpenDevelopmentFamily[] = [
    { familyId: "mf_hills", mapName: "cd_chrono_hills.map", mapSha256: "d674520bba62402d1679b5e97d391f238d9dbdd410ff22303ebf5549f26d8d3b" },
    { familyId: "mf_reconcile", mapName: "cd_2_reconcile.map", mapSha256: "248a459912518fa46aad82387c232e51ca5e287fabe0c1d913ba4d26ed78373a" },
    { familyId: "mf_mp25mw", mapName: "cd_chrono_mp25mw.map", mapSha256: "4b90f4eb66bdc19721b9033a268cbafd1b839ea93ed0ad35d6728485e8a177bf" },
    { familyId: "mf_dustbowl", mapName: "cd_chrono_dustbowl.map", mapSha256: "e1d66f99af69a0b41165991ebb522de8be0c834db899f1bbc6d5773646640ef4" },
    { familyId: "mf_mp23t4", mapName: "cd_chrono_mp23t4.map", mapSha256: "6e053a3df5a9d3b54410ade694e0d61065109bdb44cde44e746181f5c678c722" },
    { familyId: "mf_nearorefar", mapName: "cd_chrono_6_near_ore_far.map", mapSha256: "0d608a5c1a48752280751477bf18803caea47edca3af90b975b700a419bbccaf" },
    { familyId: "mf_offensedefense", mapName: "cd_chrono_offensedefense.map", mapSha256: "94043927a79a30df9394ac6d6195e0d2926863fdad9c412556d0cc7af409f11a" },
    { familyId: "mf_mp01t4", mapName: "cd_chrono_mp01t4.map", mapSha256: "89a428f214d5ca2a5f650b94e2847fc493d51805aac04f869f1fcc76e4db3381" },
    { familyId: "mf_mp17mw", mapName: "cd_chrono_mp17mw.map", mapSha256: "e55a460f8d519ae2685d93cd7891b23c2268d20100afaae10c82e9d011e8a25e" },
    { familyId: "mf_ore2", mapName: "cd_chrono_ore2_startfixed.map", mapSha256: "af9749ef2f9d085d5406b00fd518cafb29d8e7d58a3f76218280c0e0735cb761" },
];

export const PROGRESS_CERTIFIED_V5_OPEN_DEVELOPMENT_FAMILY_COUNT =
    PROGRESS_CERTIFIED_V5_OPEN_DEVELOPMENT_FAMILIES.length;
export const PROGRESS_CERTIFIED_V5_OPEN_DEVELOPMENT_SHARD_COUNT =
    PROGRESS_CERTIFIED_V5_OPEN_DEVELOPMENT_FAMILY_COUNT *
    PROGRESS_CERTIFIED_V5_OPEN_DEVELOPMENT_COUNTRIES.length;
export const PROGRESS_CERTIFIED_V5_OPEN_DEVELOPMENT_LAUNCH_COUNT =
    PROGRESS_CERTIFIED_V5_OPEN_DEVELOPMENT_SHARD_COUNT * 3 * 2;

export const PROGRESS_CERTIFIED_V5_ADVANCEMENT_RULE = [
    "all 540 launches pass the whole-population technical and information-boundary gate",
    "one-sided family-clustered 80% lower bound for V5-minus-external literal score is above zero",
    "V5 literal wins exceed losses overall and in pooled Allied and Soviet countries",
    "V5 literal wins exceed losses in at least seven of nine countries",
    "family-macro V5 literal-win probability exceeds exact Supalosa and V4",
    "family-macro V5 draw probability is below exact Supalosa and V4",
    "every leave-one-family-out V5-minus-external literal-score effect is positive",
] as const;

export type ProgressCertifiedV5OpenDevelopmentCampaign = {
    schemaVersion: 1;
    kind: "progress-certified-v5-open-development-literal-endpoint";
    status: "FROZEN_PROGRESS_CERTIFIED_V5_OPEN_DEVELOPMENT_V1_ENDPOINT_V5";
    generatedAt: string;
    sourceGitCommit: string;
    sourceRuntimeSha256: string;
    baselineGitCommit: typeof PROGRESS_CERTIFIED_V5_OPEN_DEVELOPMENT_BASELINE_COMMIT;
    baselineRuntimeSha256: string;
    gameApiRuntimeSha256: string;
    packageLockSha256: string;
    populationSha256: string;
    protocolPath: string;
    protocolSha256: typeof PROGRESS_CERTIFIED_V5_OPEN_DEVELOPMENT_PROTOCOL_SHA256;
    compatibilityGatePath: string;
    compatibilityGateSha256: typeof PROGRESS_CERTIFIED_V5_COMPATIBILITY_SHA256;
    compatibilityJobId: typeof PROGRESS_CERTIFIED_V5_COMPATIBILITY_JOB_ID;
    compatibilitySourceGitCommit: typeof PROGRESS_CERTIFIED_V5_COMPATIBILITY_SOURCE_COMMIT;
    endpointVersion: typeof LITERAL_BUILDING_ELIMINATION_ENDPOINT_VERSION;
    endpointSha256: typeof LITERAL_BUILDING_ELIMINATION_ENDPOINT_SHA256;
    outcomeAccess: "permanently-open-development-only-no-paper-claim";
    familyCount: number;
    countryCount: number;
    reciprocalSlotCount: 2;
    policyCount: 3;
    shardCount: number;
    launchedGameCount: number;
    engineSeedBase: typeof PROGRESS_CERTIFIED_V5_OPEN_DEVELOPMENT_ENGINE_SEED_BASE;
    maxTicks: typeof PROGRESS_CERTIFIED_V5_OPEN_DEVELOPMENT_MAX_TICKS;
    countries: readonly Countries[];
    advancementRule: readonly string[];
    confidenceInterval: {
        unit: "family";
        familyCount: 10;
        method: "student-t-lower-bound-on-paired-family-score-effects";
        sidedness: "one-sided";
        confidenceLevel: 0.8;
        degreesOfFreedom: 9;
        criticalValue: typeof PROGRESS_CERTIFIED_V5_ONE_SIDED_80_T_CRITICAL_DF9;
    };
    arms: ProgressCertifiedV5Arm[];
    selectedFamilies: ProgressCertifiedV5OpenDevelopmentFamily[];
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
        launchedGameCount: 6;
    }>;
};

type RecordValue = Record<string, unknown>;
const isRecord = (value: unknown): value is RecordValue =>
    !!value && typeof value === "object" && !Array.isArray(value);
const requiredPath = (name: string): string => {
    const value = process.env[name];
    if (!value) throw new Error(`${name} is required`);
    return path.resolve(value);
};
const sha256Text = (value: string): string => crypto.createHash("sha256").update(value).digest("hex");
const runtimeCommitment = (trees: ReturnType<typeof createExperimentManifest>["source"]["runtimeTrees"]): string =>
    sha256Text(JSON.stringify(trees));

export const buildProgressCertifiedV5Episodes = (
    arms: readonly ProgressCertifiedV5Arm[],
): ProgressCertifiedPlanEpisode[] => arms.flatMap((item, armIndex) =>
    ([0, 1] as const).map((candidateSlot) => ({
        episodeId: `a${armIndex}-s${candidateSlot}`,
        armId: item.armId,
        policyId: item.policyId,
        candidateSlot,
    })),
);

const validateCompatibility = (value: unknown): void => {
    const populationCoverage = isRecord(value) && isRecord(value.populationCoverage)
        ? value.populationCoverage
        : null;
    const rows = isRecord(value) && Array.isArray(value.rows) ? value.rows : [];
    const uniqueCells = new Set(rows.flatMap((row) => isRecord(row) &&
        typeof row.country === "string" && (row.candidateSlot === 0 || row.candidateSlot === 1)
        ? [`${row.country}|${row.candidateSlot}`]
        : []));
    if (
        !isRecord(value) || value.schemaVersion !== 3 || value.gateRevision !== "V5-C3" ||
        value.status !== "PASS_OUTCOME_FREE_PROGRESS_CERTIFIED_V5_COMPATIBILITY_V3" ||
        value.passed !== true || value.outcomeFree !== true ||
        value.sourceGitCommit !== PROGRESS_CERTIFIED_V5_COMPATIBILITY_SOURCE_COMMIT ||
        value.gameCount !== 72 || value.countryCount !== 9 || value.reciprocalSlotCount !== 2 ||
        !isRecord(value.scheduler) || value.scheduler.jobId !== PROGRESS_CERTIFIED_V5_COMPATIBILITY_JOB_ID ||
        value.scheduler.account !== "pi_jss233" || !Array.isArray(value.validationErrors) ||
        value.validationErrors.length !== 0 || !Array.isArray(value.outcomeFieldsEmitted) ||
        value.outcomeFieldsEmitted.length !== 0 || rows.length !== 18 || uniqueCells.size !== 18 ||
        rows.some((row) => !isRecord(row) || row.disabledEquivalent !== true ||
            row.deterministic !== true || row.enabledChangedCommands !== true ||
            !isRecord(row.firstCoverage) || !isRecord(row.repeatCoverage) ||
            !Number.isSafeInteger(row.firstCoverage.buildingDecisionCount) ||
            (row.firstCoverage.buildingDecisionCount as number) < 1 ||
            row.firstCoverage.exactUnseenApproachCount !== row.repeatCoverage.exactUnseenApproachCount ||
            row.firstCoverage.visibleHandoffCount !== row.repeatCoverage.visibleHandoffCount) ||
        !populationCoverage || populationCoverage.cellCount !== 18 ||
        populationCoverage.buildingOrderCellCount !== 18 ||
        !Number.isSafeInteger(populationCoverage.exactUnseenApproachCellCount) ||
        (populationCoverage.exactUnseenApproachCellCount as number) < 4 ||
        !Number.isSafeInteger(populationCoverage.exactUnseenApproachCountryCount) ||
        (populationCoverage.exactUnseenApproachCountryCount as number) < 4 ||
        !isDeepStrictEqual(populationCoverage.exactUnseenApproachFactions, ["Allied", "Soviet"]) ||
        !isDeepStrictEqual(populationCoverage.exactUnseenApproachSlots, [0, 1]) ||
        !Number.isSafeInteger(populationCoverage.visibleHandoffCellCount) ||
        (populationCoverage.visibleHandoffCellCount as number) < 1 ||
        !Array.isArray(populationCoverage.validationErrors) ||
        populationCoverage.validationErrors.length !== 0
    ) throw new Error("V5-C3 outcome-free compatibility artifact does not authorize generation");
};

export const validateProgressCertifiedV5OpenDevelopmentCampaign = (
    value: unknown,
): ProgressCertifiedV5OpenDevelopmentCampaign => {
    if (
        !isRecord(value) || value.schemaVersion !== 1 ||
        value.kind !== "progress-certified-v5-open-development-literal-endpoint" ||
        value.status !== "FROZEN_PROGRESS_CERTIFIED_V5_OPEN_DEVELOPMENT_V1_ENDPOINT_V5" ||
        !/^[0-9a-f]{40}$/.test(String(value.sourceGitCommit)) ||
        !/^[0-9a-f]{64}$/.test(String(value.sourceRuntimeSha256)) ||
        value.baselineGitCommit !== PROGRESS_CERTIFIED_V5_OPEN_DEVELOPMENT_BASELINE_COMMIT ||
        !/^[0-9a-f]{64}$/.test(String(value.baselineRuntimeSha256)) ||
        !/^[0-9a-f]{64}$/.test(String(value.gameApiRuntimeSha256)) ||
        !/^[0-9a-f]{64}$/.test(String(value.packageLockSha256)) ||
        value.protocolSha256 !== PROGRESS_CERTIFIED_V5_OPEN_DEVELOPMENT_PROTOCOL_SHA256 ||
        value.compatibilityGateSha256 !== PROGRESS_CERTIFIED_V5_COMPATIBILITY_SHA256 ||
        value.compatibilityJobId !== PROGRESS_CERTIFIED_V5_COMPATIBILITY_JOB_ID ||
        value.compatibilitySourceGitCommit !== PROGRESS_CERTIFIED_V5_COMPATIBILITY_SOURCE_COMMIT ||
        value.endpointVersion !== LITERAL_BUILDING_ELIMINATION_ENDPOINT_VERSION ||
        value.endpointSha256 !== LITERAL_BUILDING_ELIMINATION_ENDPOINT_SHA256 ||
        value.outcomeAccess !== "permanently-open-development-only-no-paper-claim" ||
        value.familyCount !== 10 || value.countryCount !== 9 || value.reciprocalSlotCount !== 2 ||
        value.policyCount !== 3 || value.shardCount !== 90 || value.launchedGameCount !== 540 ||
        value.engineSeedBase !== PROGRESS_CERTIFIED_V5_OPEN_DEVELOPMENT_ENGINE_SEED_BASE ||
        value.maxTicks !== PROGRESS_CERTIFIED_V5_OPEN_DEVELOPMENT_MAX_TICKS ||
        !Array.isArray(value.countries) || !Array.isArray(value.advancementRule) ||
        !Array.isArray(value.arms) || !Array.isArray(value.selectedFamilies) || !Array.isArray(value.shards) ||
        typeof value.protocolPath !== "string" || typeof value.compatibilityGatePath !== "string"
    ) throw new Error("Progress-certified V5 campaign has an invalid frozen schema");
    const campaign = value as unknown as ProgressCertifiedV5OpenDevelopmentCampaign;
    const expectedArms = buildProgressCertifiedV5Arms();
    const expectedPopulationSha256 = sha256Text(JSON.stringify(PROGRESS_CERTIFIED_V5_OPEN_DEVELOPMENT_FAMILIES));
    if (
        campaign.populationSha256 !== expectedPopulationSha256 ||
        sha256File(campaign.protocolPath) !== PROGRESS_CERTIFIED_V5_OPEN_DEVELOPMENT_PROTOCOL_SHA256 ||
        sha256File(campaign.compatibilityGatePath) !== PROGRESS_CERTIFIED_V5_COMPATIBILITY_SHA256 ||
        !isDeepStrictEqual(campaign.countries, PROGRESS_CERTIFIED_V5_OPEN_DEVELOPMENT_COUNTRIES) ||
        !isDeepStrictEqual(campaign.advancementRule, PROGRESS_CERTIFIED_V5_ADVANCEMENT_RULE) ||
        !isDeepStrictEqual(campaign.arms, expectedArms) ||
        !isDeepStrictEqual(campaign.selectedFamilies, PROGRESS_CERTIFIED_V5_OPEN_DEVELOPMENT_FAMILIES) ||
        campaign.shards.length !== PROGRESS_CERTIFIED_V5_OPEN_DEVELOPMENT_SHARD_COUNT
    ) throw new Error("Progress-certified V5 campaign commitments drifted");
    for (const [index, shard] of campaign.shards.entries()) {
        const family = PROGRESS_CERTIFIED_V5_OPEN_DEVELOPMENT_FAMILIES[Math.floor(index / 9)];
        const country = PROGRESS_CERTIFIED_V5_OPEN_DEVELOPMENT_COUNTRIES[index % 9];
        const requestedEngineSeed = derivePairedEngineSeed(
            PROGRESS_CERTIFIED_V5_OPEN_DEVELOPMENT_ENGINE_SEED_BASE,
            index,
        );
        if (
            shard.shardIndex !== index || shard.familyId !== family.familyId ||
            shard.mapName !== family.mapName || shard.mapSha256 !== family.mapSha256 ||
            shard.country !== country || shard.seedBlockIndex !== index ||
            shard.requestedEngineSeed !== requestedEngineSeed || shard.launchedGameCount !== 6 ||
            !fs.existsSync(shard.planFile) || sha256File(shard.planFile) !== shard.planSha256
        ) throw new Error(`Progress-certified V5 shard ${index} commitments drifted`);
        const plan = parseProgressCertifiedRunPlan(JSON.parse(fs.readFileSync(shard.planFile, "utf8")));
        if (
            plan.runId !== shard.runId || plan.sourceGitCommit !== campaign.sourceGitCommit ||
            plan.sourceRuntimeSha256 !== campaign.sourceRuntimeSha256 ||
            plan.baselineGitCommit !== campaign.baselineGitCommit ||
            plan.baselineRuntimeSha256 !== campaign.baselineRuntimeSha256 ||
            plan.gameApiRuntimeSha256 !== campaign.gameApiRuntimeSha256 ||
            plan.packageLockSha256 !== campaign.packageLockSha256 ||
            plan.sourcePopulationCommitmentSha256 !== campaign.populationSha256 ||
            plan.family.familyId !== shard.familyId || plan.family.mapName !== shard.mapName ||
            plan.family.mapSha256 !== shard.mapSha256 || plan.country !== shard.country ||
            plan.seedBlockIndex !== shard.seedBlockIndex || plan.requestedEngineSeed !== shard.requestedEngineSeed ||
            plan.maxTicks !== campaign.maxTicks || !isDeepStrictEqual(plan.arms, campaign.arms) ||
            !isDeepStrictEqual(plan.episodes, buildProgressCertifiedV5Episodes(campaign.arms))
        ) throw new Error(`Progress-certified V5 shard ${index} plan drifted`);
    }
    return campaign;
};

const main = async (): Promise<void> => {
    const repoRoot = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
    const driverRoot = path.join(repoRoot, "packages", "chronodivide-bot-driver");
    if (path.resolve(process.cwd()) !== driverRoot) throw new Error(`Generator must start in ${driverRoot}`);
    if (!process.env.BASELINE_PACKAGE_ROOT || process.env.REQUIRE_EXTERNAL_BASELINE !== "true") {
        throw new Error("V5 campaign generation requires the pinned external baseline");
    }
    const protocolPath = requiredPath("PROGRESS_CERTIFIED_V5_PROTOCOL");
    const compatibilityGatePath = requiredPath("PROGRESS_CERTIFIED_V5_COMPATIBILITY_GATE");
    const outRoot = requiredPath("OUT_ROOT");
    if (fs.existsSync(outRoot)) throw new Error(`Refusing to reuse V5 campaign root ${outRoot}`);
    if (sha256File(protocolPath) !== PROGRESS_CERTIFIED_V5_OPEN_DEVELOPMENT_PROTOCOL_SHA256) {
        throw new Error("V5 protocol commitment drifted");
    }
    if (sha256File(compatibilityGatePath) !== PROGRESS_CERTIFIED_V5_COMPATIBILITY_SHA256) {
        throw new Error("V5 compatibility commitment drifted");
    }
    validateCompatibility(JSON.parse(fs.readFileSync(compatibilityGatePath, "utf8")));
    for (const family of PROGRESS_CERTIFIED_V5_OPEN_DEVELOPMENT_FAMILIES) {
        const mapPath = path.join(driverRoot, "data", family.mapName);
        if (!fs.existsSync(mapPath) || sha256File(mapPath) !== family.mapSha256) {
            throw new Error(`V5 family ${family.familyId} lacks exact map bytes`);
        }
    }
    const arms = buildProgressCertifiedV5Arms();
    const baselineFactory = await loadBaselineFactory(path.join(repoRoot, "packages", "chronodivide-bot"));
    const generationManifest = createExperimentManifest({
        runId: "plan-progress-certified-v5-open-development-v1",
        mixDir: path.join(driverRoot, "data"),
        maps: PROGRESS_CERTIFIED_V5_OPEN_DEVELOPMENT_FAMILIES.map(({ mapName }) => mapName),
        effectiveConfig: {
            purpose: "progress-certified-v5-open-development-literal-endpoint-v5",
            outcomeAccess: false,
            countries: PROGRESS_CERTIFIED_V5_OPEN_DEVELOPMENT_COUNTRIES,
            reciprocalSlots: [0, 1],
            arms,
            maxTicks: PROGRESS_CERTIFIED_V5_OPEN_DEVELOPMENT_MAX_TICKS,
            compatibilityGateSha256: PROGRESS_CERTIFIED_V5_COMPATIBILITY_SHA256,
            protocolSha256: PROGRESS_CERTIFIED_V5_OPEN_DEVELOPMENT_PROTOCOL_SHA256,
        },
        baseline: baselineFactory.descriptor,
        gameSeedBase: PROGRESS_CERTIFIED_V5_OPEN_DEVELOPMENT_ENGINE_SEED_BASE,
    });
    const baseline = generationManifest.software.baseline;
    if (
        generationManifest.source.gitBranch !== "main" || generationManifest.source.trackedDirty !== false ||
        generationManifest.source.gitCommit !== execFileSync("git", ["rev-parse", "fork/main"], { encoding: "utf8" }).trim() ||
        baseline.kind !== "external-package" || baseline.gitCommit !== PROGRESS_CERTIFIED_V5_OPEN_DEVELOPMENT_BASELINE_COMMIT ||
        baseline.trackedDirty !== false || !baseline.runtimeTree.sha256 ||
        !generationManifest.software.gameApiRuntimeTree.sha256 ||
        !generationManifest.software.packageLockSha256 || generationManifest.inputs.maps.some((map) => !map.exists)
    ) throw new Error("V5 campaign generation provenance failed");

    fs.mkdirSync(path.dirname(outRoot), { recursive: true, mode: 0o700 });
    fs.mkdirSync(outRoot, { recursive: false, mode: 0o700 });
    const plansRoot = path.join(outRoot, "plans");
    fs.mkdirSync(plansRoot, { mode: 0o700 });
    const sourceRuntimeSha256 = runtimeCommitment(generationManifest.source.runtimeTrees);
    const populationSha256 = sha256Text(JSON.stringify(PROGRESS_CERTIFIED_V5_OPEN_DEVELOPMENT_FAMILIES));
    const shards: ProgressCertifiedV5OpenDevelopmentCampaign["shards"] = [];
    for (let familyIndex = 0; familyIndex < PROGRESS_CERTIFIED_V5_OPEN_DEVELOPMENT_FAMILIES.length; familyIndex++) {
        for (let countryIndex = 0; countryIndex < PROGRESS_CERTIFIED_V5_OPEN_DEVELOPMENT_COUNTRIES.length; countryIndex++) {
            const shardIndex = familyIndex * 9 + countryIndex;
            const family = PROGRESS_CERTIFIED_V5_OPEN_DEVELOPMENT_FAMILIES[familyIndex];
            const country = PROGRESS_CERTIFIED_V5_OPEN_DEVELOPMENT_COUNTRIES[countryIndex];
            const requestedEngineSeed = derivePairedEngineSeed(
                PROGRESS_CERTIFIED_V5_OPEN_DEVELOPMENT_ENGINE_SEED_BASE,
                shardIndex,
            );
            const runId = `pcv5-open-f${familyIndex}-c${countryIndex}-${generationManifest.source.gitCommit.slice(0, 10)}`;
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
                sourcePopulationCommitmentSha256: populationSha256,
                endpointVersion: LITERAL_BUILDING_ELIMINATION_ENDPOINT_VERSION,
                endpointSha256: LITERAL_BUILDING_ELIMINATION_ENDPOINT_SHA256,
                family: { familyId: family.familyId, mapName: family.mapName, mapSha256: family.mapSha256 },
                country,
                engineSeedBase: PROGRESS_CERTIFIED_V5_OPEN_DEVELOPMENT_ENGINE_SEED_BASE,
                seedBlockIndex: shardIndex,
                requestedEngineSeed,
                maxTicks: PROGRESS_CERTIFIED_V5_OPEN_DEVELOPMENT_MAX_TICKS,
                arms,
                episodes: buildProgressCertifiedV5Episodes(arms),
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
                seedBlockIndex: shardIndex,
                requestedEngineSeed,
                launchedGameCount: 6,
            });
        }
    }
    const campaign: ProgressCertifiedV5OpenDevelopmentCampaign = {
        schemaVersion: 1,
        kind: "progress-certified-v5-open-development-literal-endpoint",
        status: "FROZEN_PROGRESS_CERTIFIED_V5_OPEN_DEVELOPMENT_V1_ENDPOINT_V5",
        generatedAt: new Date().toISOString(),
        sourceGitCommit: generationManifest.source.gitCommit,
        sourceRuntimeSha256,
        baselineGitCommit: PROGRESS_CERTIFIED_V5_OPEN_DEVELOPMENT_BASELINE_COMMIT,
        baselineRuntimeSha256: baseline.runtimeTree.sha256,
        gameApiRuntimeSha256: generationManifest.software.gameApiRuntimeTree.sha256,
        packageLockSha256: generationManifest.software.packageLockSha256,
        populationSha256,
        protocolPath,
        protocolSha256: PROGRESS_CERTIFIED_V5_OPEN_DEVELOPMENT_PROTOCOL_SHA256,
        compatibilityGatePath,
        compatibilityGateSha256: PROGRESS_CERTIFIED_V5_COMPATIBILITY_SHA256,
        compatibilityJobId: PROGRESS_CERTIFIED_V5_COMPATIBILITY_JOB_ID,
        compatibilitySourceGitCommit: PROGRESS_CERTIFIED_V5_COMPATIBILITY_SOURCE_COMMIT,
        endpointVersion: LITERAL_BUILDING_ELIMINATION_ENDPOINT_VERSION,
        endpointSha256: LITERAL_BUILDING_ELIMINATION_ENDPOINT_SHA256,
        outcomeAccess: "permanently-open-development-only-no-paper-claim",
        familyCount: 10,
        countryCount: 9,
        reciprocalSlotCount: 2,
        policyCount: 3,
        shardCount: 90,
        launchedGameCount: 540,
        engineSeedBase: PROGRESS_CERTIFIED_V5_OPEN_DEVELOPMENT_ENGINE_SEED_BASE,
        maxTicks: PROGRESS_CERTIFIED_V5_OPEN_DEVELOPMENT_MAX_TICKS,
        countries: PROGRESS_CERTIFIED_V5_OPEN_DEVELOPMENT_COUNTRIES,
        advancementRule: PROGRESS_CERTIFIED_V5_ADVANCEMENT_RULE,
        confidenceInterval: {
            unit: "family",
            familyCount: 10,
            method: "student-t-lower-bound-on-paired-family-score-effects",
            sidedness: "one-sided",
            confidenceLevel: 0.8,
            degreesOfFreedom: 9,
            criticalValue: PROGRESS_CERTIFIED_V5_ONE_SIDED_80_T_CRITICAL_DF9,
        },
        arms,
        selectedFamilies: [...PROGRESS_CERTIFIED_V5_OPEN_DEVELOPMENT_FAMILIES],
        shards,
    };
    validateProgressCertifiedV5OpenDevelopmentCampaign(campaign);
    fs.writeFileSync(path.join(outRoot, "campaign.json"), JSON.stringify(campaign, null, 2) + "\n", {
        flag: "wx", mode: 0o600,
    });
    fs.writeFileSync(path.join(outRoot, "plan-files.txt"), `${shards.map(({ planFile }) => planFile).join("\n")}\n`, {
        flag: "wx", mode: 0o600,
    });
    fs.writeFileSync(path.join(outRoot, "generation-manifest.json"), JSON.stringify(generationManifest, null, 2) + "\n", {
        flag: "wx", mode: 0o600,
    });
    console.log(JSON.stringify({
        outRoot,
        campaignSha256: sha256File(path.join(outRoot, "campaign.json")),
        shardCount: shards.length,
        launchedGameCount: PROGRESS_CERTIFIED_V5_OPEN_DEVELOPMENT_LAUNCH_COUNT,
        sourceGitCommit: campaign.sourceGitCommit,
    }));
};

const invoked = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (import.meta.url === invoked) main().catch((error) => { console.error(error); process.exitCode = 1; });
