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
import { buildProgressCertifiedV5Arms, ProgressCertifiedV5Arm } from "./progressCertifiedV5ExperimentPolicy.js";
import { buildProgressCertifiedV5Episodes } from "./progressCertifiedV5OpenDevelopmentCampaign.js";
import {
    PROGRESS_CERTIFIED_PLAN_SCHEMA_VERSION,
    PROGRESS_CERTIFIED_SEALED_PLAN_KIND,
    ProgressCertifiedRunPlan,
    parseProgressCertifiedRunPlan,
    serializeProgressCertifiedRunPlan,
    sha256File,
} from "./progressCertifiedPlanRunner.js";

export const PROGRESS_CERTIFIED_V5_CONFIRMATORY_ENGINE_SEED_BASE = 4_216_000_000 as const;
export const PROGRESS_CERTIFIED_V5_CONFIRMATORY_MAX_TICKS = 24_000 as const;
export const PROGRESS_CERTIFIED_V5_CONFIRMATORY_BASELINE_COMMIT =
    "165b77a71d0cf5ebd27c65b19d0486bcbae78d0f" as const;
export const PROGRESS_CERTIFIED_V5_CONFIRMATORY_PROTOCOL_SHA256 =
    "b08b16780366fdf9febfbb7d2489c544b69b7fccfa179fd89d9c8445f61e7044" as const;
export const PROGRESS_CERTIFIED_V5_DEVELOPMENT_AGGREGATE_SHA256 =
    "4c6fedf27f034870d8ed827f93463d70049494764c2c7f50b57d15bb50fa353a" as const;
export const PROGRESS_CERTIFIED_V5_FRESH_CATALOG_SHA256 =
    "8ecc01bb490f419045298a292ce4935c9e107d0ee1059abe400d9db44427d7b7" as const;
export const PROGRESS_CERTIFIED_V5_FRESH_TARGETS_SHA256 =
    "6b9ec4b0704db15b7b01bd05839228da005abb192aeda9953f88841aa59f2766" as const;
export const PROGRESS_CERTIFIED_V5_FIDELITY_GATE_SHA256 =
    "2351787e84a15f6efb359706c585ec7e31f3cc1217ed354c5c2222a60adc9c1d" as const;
export const PROGRESS_CERTIFIED_V5_FIDELITY_JOB_ID = "22311963" as const;
export const PROGRESS_CERTIFIED_V5_FIDELITY_SOURCE_COMMIT =
    "ce4cb8f4f0f40313fdeb93c796dd1ab1a8a80a5b" as const;
export const PROGRESS_CERTIFIED_V5_CONFIRMATORY_ONE_SIDED_95_T_CRITICAL_DF55 =
    1.6730339652899118 as const;

export const PROGRESS_CERTIFIED_V5_CONFIRMATORY_COUNTRIES = [
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

export const PROGRESS_CERTIFIED_V5_CONFIRMATORY_FAMILY_COUNT = 56 as const;
export const PROGRESS_CERTIFIED_V5_CONFIRMATORY_SHARD_COUNT = 504 as const;
export const PROGRESS_CERTIFIED_V5_CONFIRMATORY_LAUNCH_COUNT = 3_024 as const;

export const PROGRESS_CERTIFIED_V5_CONFIRMATORY_SUCCESS_RULE = [
    "all 3024 launches pass the outcome-blind technical gate before one complete unblinding",
    "one-sided 95% family-level lower bound for V5-minus-external paired literal score is above zero",
    "one-sided 95% family-level lower bound for V5 absolute literal score minus 0.5 is above zero",
] as const;

export type ProgressCertifiedV5ConfirmatoryFamily = {
    familyId: string;
    mapName: string;
    mapPath: string;
    mapSha256: string;
};

export type ProgressCertifiedV5ConfirmatoryCampaign = {
    schemaVersion: 1;
    kind: "progress-certified-v5-sealed-confirmatory-literal-endpoint";
    status: "FROZEN_PROGRESS_CERTIFIED_V5_SEALED_CONFIRMATORY_V1";
    generatedAt: string;
    sourceGitCommit: string;
    sourceRuntimeSha256: string;
    baselineGitCommit: typeof PROGRESS_CERTIFIED_V5_CONFIRMATORY_BASELINE_COMMIT;
    baselineRuntimeSha256: string;
    gameApiRuntimeSha256: string;
    packageLockSha256: string;
    populationSha256: string;
    protocolPath: string;
    protocolSha256: typeof PROGRESS_CERTIFIED_V5_CONFIRMATORY_PROTOCOL_SHA256;
    developmentAggregatePath: string;
    developmentAggregateSha256: typeof PROGRESS_CERTIFIED_V5_DEVELOPMENT_AGGREGATE_SHA256;
    freshCatalogPath: string;
    freshCatalogSha256: typeof PROGRESS_CERTIFIED_V5_FRESH_CATALOG_SHA256;
    freshTargetsPath: string;
    freshTargetsSha256: typeof PROGRESS_CERTIFIED_V5_FRESH_TARGETS_SHA256;
    fidelityGatePath: string;
    fidelityGateSha256: typeof PROGRESS_CERTIFIED_V5_FIDELITY_GATE_SHA256;
    fidelityJobId: typeof PROGRESS_CERTIFIED_V5_FIDELITY_JOB_ID;
    fidelitySourceGitCommit: typeof PROGRESS_CERTIFIED_V5_FIDELITY_SOURCE_COMMIT;
    endpointVersion: typeof LITERAL_BUILDING_ELIMINATION_ENDPOINT_VERSION;
    endpointSha256: typeof LITERAL_BUILDING_ELIMINATION_ENDPOINT_SHA256;
    outcomeAccess: "sealed-private-events-single-complete-unblinding";
    familyCount: 56;
    countryCount: 9;
    reciprocalSlotCount: 2;
    policyCount: 3;
    shardCount: 504;
    launchedGameCount: 3_024;
    engineSeedBase: typeof PROGRESS_CERTIFIED_V5_CONFIRMATORY_ENGINE_SEED_BASE;
    maxTicks: typeof PROGRESS_CERTIFIED_V5_CONFIRMATORY_MAX_TICKS;
    countries: readonly Countries[];
    successRule: readonly string[];
    powerDesign: {
        unit: "family";
        familyCount: 56;
        developmentMeanEffect: 0.01388888888888889;
        developmentFamilyEffectSampleSd: 0.035258208823444021;
        approximatePower: 0.89880788041509219;
        alpha: 0.05;
        sidedness: "one-sided";
        degreesOfFreedom: 55;
        criticalValue: typeof PROGRESS_CERTIFIED_V5_CONFIRMATORY_ONE_SIDED_95_T_CRITICAL_DF55;
    };
    arms: ProgressCertifiedV5Arm[];
    selectedFamilies: ProgressCertifiedV5ConfirmatoryFamily[];
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

export const loadProgressCertifiedV5ConfirmatoryFamilies = (
    targetsPath: string,
): ProgressCertifiedV5ConfirmatoryFamily[] => {
    if (sha256File(targetsPath) !== PROGRESS_CERTIFIED_V5_FRESH_TARGETS_SHA256) {
        throw new Error("Fresh target-manifest bytes drifted");
    }
    const value = JSON.parse(fs.readFileSync(targetsPath, "utf8")) as unknown;
    if (
        !isRecord(value) || value.schemaVersion !== 1 ||
        value.status !== "ROLE_BLIND_FIDELITY_SCREEN_TARGETS_NOT_A_SPLIT" ||
        value.outcomeBlind !== true || value.roleBlind !== true || value.finalSplit !== false ||
        value.isSplit !== false || value.notPolicyEvidence !== true || value.targetCount !== 56 ||
        value.catalogSha256 !== PROGRESS_CERTIFIED_V5_FRESH_CATALOG_SHA256 ||
        !Array.isArray(value.targets) || value.targets.length !== 56
    ) throw new Error("Fresh target manifest has an invalid frozen schema");
    const families = value.targets.map((raw, index): ProgressCertifiedV5ConfirmatoryFamily => {
        if (!isRecord(raw) || typeof raw.familyId !== "string" || !isRecord(raw.representative)) {
            throw new Error(`Fresh target ${index} is malformed`);
        }
        const mapPath = raw.representative.path;
        const mapSha256 = raw.representative.sha256;
        if (
            typeof mapPath !== "string" ||
            !mapPath.startsWith("packages/chronodivide-bot-driver/data/method_v5_fresh_") ||
            typeof mapSha256 !== "string" || !/^[0-9a-f]{64}$/.test(mapSha256)
        ) throw new Error(`Fresh target ${index} has an invalid representative`);
        return { familyId: raw.familyId, mapPath, mapName: path.basename(mapPath), mapSha256 };
    });
    if (
        new Set(families.map(({ familyId }) => familyId)).size !== 56 ||
        new Set(families.map(({ mapSha256 }) => mapSha256)).size !== 56
    ) throw new Error("Fresh confirmatory families must have unique family and map identities");
    return families;
};

export const validateProgressCertifiedV5FidelityGate = (
    value: unknown,
    families: readonly ProgressCertifiedV5ConfirmatoryFamily[],
): void => {
    if (
        !isRecord(value) || value.schemaVersion !== 2 || value.gate !== "map-fidelity-gate-v1" ||
        value.artifactKind !== "infrastructure_fidelity_full_summary_not_policy_evaluation" ||
        value.eligibleForFidelityClearance !== true || value.fullCoverage !== true ||
        value.outcomeFree !== true || value.notSealedTestEvidence !== true || value.passed !== true ||
        value.screenComplete !== true || value.technicalChecksPassed !== true || value.verdict !== "PASS" ||
        value.populationFamilyCount !== 56 || value.runFamilyCount !== 56 ||
        !isRecord(value.familyCounts) || value.familyCounts.requested !== 56 ||
        value.familyCounts.run !== 56 || value.familyCounts.pass !== 56 ||
        value.familyCounts.review !== 0 || value.familyCounts.fail !== 0 ||
        !isRecord(value.scheduler) || value.scheduler.account !== "pi_jss233" ||
        value.scheduler.jobId !== PROGRESS_CERTIFIED_V5_FIDELITY_JOB_ID ||
        !isRecord(value.provenance) || value.provenance.sourceCommit !== PROGRESS_CERTIFIED_V5_FIDELITY_SOURCE_COMMIT ||
        value.provenance.catalogSha256 !== PROGRESS_CERTIFIED_V5_FRESH_CATALOG_SHA256 ||
        value.provenance.targetManifestSha256 !== PROGRESS_CERTIFIED_V5_FRESH_TARGETS_SHA256 ||
        !Array.isArray(value.globalFailures) || value.globalFailures.length !== 0 ||
        !Array.isArray(value.globalReviews) || value.globalReviews.length !== 0 ||
        !isRecord(value.warningCategoryCounts) || Object.keys(value.warningCategoryCounts).length !== 0 ||
        !Array.isArray(value.families) || value.families.length !== 56
    ) throw new Error("Outcome-blind V5 fidelity gate does not authorize confirmation");
    const expected = new Map(families.map((family) => [family.familyId, family]));
    for (const row of value.families) {
        if (!isRecord(row) || typeof row.familyId !== "string") throw new Error("Fidelity family row is malformed");
        const family = expected.get(row.familyId);
        if (
            !family || row.mapName !== family.mapName || row.mapSha256 !== family.mapSha256 ||
            row.status !== "pass" || row.slurmJobId !== PROGRESS_CERTIFIED_V5_FIDELITY_JOB_ID ||
            !Array.isArray(row.failures) || row.failures.length !== 0 ||
            !Array.isArray(row.reviews) || row.reviews.length !== 0 ||
            !isRecord(row.warningCategoryCounts) || Object.keys(row.warningCategoryCounts).length !== 0
        ) throw new Error(`Fidelity row ${row.familyId} is not one clean pass`);
        expected.delete(row.familyId);
    }
    if (expected.size !== 0) throw new Error("Fidelity gate omitted confirmatory families");
};

const validateDevelopmentAggregate = (value: unknown): void => {
    if (
        !isRecord(value) || value.schemaVersion !== 1 ||
        value.status !== "ADVANCE_PROGRESS_CERTIFIED_V5_TO_FRESH_CONFIRMATION" ||
        value.advanced !== true || value.outcomeAccess !== "permanently-open-development-only-no-paper-claim" ||
        value.schedulerAccount !== "pi_jss233" || value.launchCount !== 540 ||
        !isRecord(value.positiveChecks) || Object.values(value.positiveChecks).some((item) => item !== true)
    ) throw new Error("Complete V5 development aggregate does not authorize confirmation");
};

export const validateProgressCertifiedV5ConfirmatoryCampaign = (
    value: unknown,
): ProgressCertifiedV5ConfirmatoryCampaign => {
    if (
        !isRecord(value) || value.schemaVersion !== 1 ||
        value.kind !== "progress-certified-v5-sealed-confirmatory-literal-endpoint" ||
        value.status !== "FROZEN_PROGRESS_CERTIFIED_V5_SEALED_CONFIRMATORY_V1" ||
        !/^[0-9a-f]{40}$/.test(String(value.sourceGitCommit)) ||
        !/^[0-9a-f]{64}$/.test(String(value.sourceRuntimeSha256)) ||
        value.baselineGitCommit !== PROGRESS_CERTIFIED_V5_CONFIRMATORY_BASELINE_COMMIT ||
        !/^[0-9a-f]{64}$/.test(String(value.baselineRuntimeSha256)) ||
        !/^[0-9a-f]{64}$/.test(String(value.gameApiRuntimeSha256)) ||
        !/^[0-9a-f]{64}$/.test(String(value.packageLockSha256)) ||
        value.protocolSha256 !== PROGRESS_CERTIFIED_V5_CONFIRMATORY_PROTOCOL_SHA256 ||
        value.developmentAggregateSha256 !== PROGRESS_CERTIFIED_V5_DEVELOPMENT_AGGREGATE_SHA256 ||
        value.freshCatalogSha256 !== PROGRESS_CERTIFIED_V5_FRESH_CATALOG_SHA256 ||
        value.freshTargetsSha256 !== PROGRESS_CERTIFIED_V5_FRESH_TARGETS_SHA256 ||
        value.fidelityGateSha256 !== PROGRESS_CERTIFIED_V5_FIDELITY_GATE_SHA256 ||
        value.fidelityJobId !== PROGRESS_CERTIFIED_V5_FIDELITY_JOB_ID ||
        value.fidelitySourceGitCommit !== PROGRESS_CERTIFIED_V5_FIDELITY_SOURCE_COMMIT ||
        value.endpointVersion !== LITERAL_BUILDING_ELIMINATION_ENDPOINT_VERSION ||
        value.endpointSha256 !== LITERAL_BUILDING_ELIMINATION_ENDPOINT_SHA256 ||
        value.outcomeAccess !== "sealed-private-events-single-complete-unblinding" ||
        value.familyCount !== 56 || value.countryCount !== 9 || value.reciprocalSlotCount !== 2 ||
        value.policyCount !== 3 || value.shardCount !== 504 || value.launchedGameCount !== 3_024 ||
        value.engineSeedBase !== PROGRESS_CERTIFIED_V5_CONFIRMATORY_ENGINE_SEED_BASE ||
        value.maxTicks !== PROGRESS_CERTIFIED_V5_CONFIRMATORY_MAX_TICKS ||
        !Array.isArray(value.countries) || !Array.isArray(value.successRule) ||
        !Array.isArray(value.arms) || !Array.isArray(value.selectedFamilies) || !Array.isArray(value.shards)
    ) throw new Error("V5 confirmatory campaign has an invalid frozen schema");
    const campaign = value as unknown as ProgressCertifiedV5ConfirmatoryCampaign;
    if (
        !isDeepStrictEqual(campaign.countries, PROGRESS_CERTIFIED_V5_CONFIRMATORY_COUNTRIES) ||
        !isDeepStrictEqual(campaign.successRule, PROGRESS_CERTIFIED_V5_CONFIRMATORY_SUCCESS_RULE) ||
        !isDeepStrictEqual(campaign.arms, buildProgressCertifiedV5Arms()) ||
        campaign.selectedFamilies.length !== 56 || campaign.shards.length !== 504 ||
        campaign.populationSha256 !== sha256Text(JSON.stringify(campaign.selectedFamilies)) ||
        sha256File(campaign.protocolPath) !== PROGRESS_CERTIFIED_V5_CONFIRMATORY_PROTOCOL_SHA256 ||
        sha256File(campaign.developmentAggregatePath) !== PROGRESS_CERTIFIED_V5_DEVELOPMENT_AGGREGATE_SHA256 ||
        sha256File(campaign.freshCatalogPath) !== PROGRESS_CERTIFIED_V5_FRESH_CATALOG_SHA256 ||
        sha256File(campaign.freshTargetsPath) !== PROGRESS_CERTIFIED_V5_FRESH_TARGETS_SHA256 ||
        sha256File(campaign.fidelityGatePath) !== PROGRESS_CERTIFIED_V5_FIDELITY_GATE_SHA256 ||
        !isDeepStrictEqual(campaign.powerDesign, {
            unit: "family", familyCount: 56,
            developmentMeanEffect: 0.01388888888888889,
            developmentFamilyEffectSampleSd: 0.035258208823444021,
            approximatePower: 0.89880788041509219,
            alpha: 0.05, sidedness: "one-sided", degreesOfFreedom: 55,
            criticalValue: PROGRESS_CERTIFIED_V5_CONFIRMATORY_ONE_SIDED_95_T_CRITICAL_DF55,
        })
    ) throw new Error("V5 confirmatory campaign commitments drifted");
    for (const [index, shard] of campaign.shards.entries()) {
        const family = campaign.selectedFamilies[Math.floor(index / 9)];
        const country = PROGRESS_CERTIFIED_V5_CONFIRMATORY_COUNTRIES[index % 9];
        const requestedEngineSeed = derivePairedEngineSeed(PROGRESS_CERTIFIED_V5_CONFIRMATORY_ENGINE_SEED_BASE, index);
        if (
            shard.shardIndex !== index || shard.familyId !== family.familyId || shard.mapName !== family.mapName ||
            shard.mapSha256 !== family.mapSha256 || shard.country !== country || shard.seedBlockIndex !== index ||
            shard.requestedEngineSeed !== requestedEngineSeed || shard.launchedGameCount !== 6 ||
            !fs.existsSync(shard.planFile) || sha256File(shard.planFile) !== shard.planSha256
        ) throw new Error(`V5 confirmatory shard ${index} commitments drifted`);
        const plan = parseProgressCertifiedRunPlan(JSON.parse(fs.readFileSync(shard.planFile, "utf8")));
        if (
            plan.kind !== PROGRESS_CERTIFIED_SEALED_PLAN_KIND || plan.runId !== shard.runId ||
            plan.sourceGitCommit !== campaign.sourceGitCommit || plan.sourceRuntimeSha256 !== campaign.sourceRuntimeSha256 ||
            plan.baselineGitCommit !== campaign.baselineGitCommit || plan.baselineRuntimeSha256 !== campaign.baselineRuntimeSha256 ||
            plan.gameApiRuntimeSha256 !== campaign.gameApiRuntimeSha256 || plan.packageLockSha256 !== campaign.packageLockSha256 ||
            plan.sourcePopulationCommitmentSha256 !== campaign.populationSha256 ||
            plan.family.familyId !== shard.familyId || plan.family.mapName !== shard.mapName ||
            plan.family.mapSha256 !== shard.mapSha256 || plan.country !== shard.country ||
            plan.seedBlockIndex !== shard.seedBlockIndex || plan.requestedEngineSeed !== shard.requestedEngineSeed ||
            plan.maxTicks !== campaign.maxTicks || !isDeepStrictEqual(plan.arms, campaign.arms) ||
            !isDeepStrictEqual(plan.episodes, buildProgressCertifiedV5Episodes(campaign.arms))
        ) throw new Error(`V5 confirmatory shard ${index} plan drifted`);
    }
    return campaign;
};

const main = async (): Promise<void> => {
    const repoRoot = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
    const driverRoot = path.join(repoRoot, "packages", "chronodivide-bot-driver");
    if (path.resolve(process.cwd()) !== driverRoot) throw new Error(`Generator must start in ${driverRoot}`);
    if (!process.env.BASELINE_PACKAGE_ROOT || process.env.REQUIRE_EXTERNAL_BASELINE !== "true") {
        throw new Error("V5 confirmatory generation requires the pinned external baseline");
    }
    const protocolPath = requiredPath("PROGRESS_CERTIFIED_V5_CONFIRMATORY_PROTOCOL");
    const developmentAggregatePath = requiredPath("PROGRESS_CERTIFIED_V5_DEVELOPMENT_AGGREGATE");
    const freshCatalogPath = requiredPath("PROGRESS_CERTIFIED_V5_FRESH_CATALOG");
    const freshTargetsPath = requiredPath("PROGRESS_CERTIFIED_V5_FRESH_TARGETS");
    const fidelityGatePath = requiredPath("PROGRESS_CERTIFIED_V5_FIDELITY_GATE");
    const outRoot = requiredPath("OUT_ROOT");
    if (fs.existsSync(outRoot)) throw new Error(`Refusing to reuse V5 confirmatory campaign root ${outRoot}`);
    const requiredHashes: Array<[string, string, string]> = [
        ["protocol", protocolPath, PROGRESS_CERTIFIED_V5_CONFIRMATORY_PROTOCOL_SHA256],
        ["development aggregate", developmentAggregatePath, PROGRESS_CERTIFIED_V5_DEVELOPMENT_AGGREGATE_SHA256],
        ["fresh catalog", freshCatalogPath, PROGRESS_CERTIFIED_V5_FRESH_CATALOG_SHA256],
        ["fresh targets", freshTargetsPath, PROGRESS_CERTIFIED_V5_FRESH_TARGETS_SHA256],
        ["fidelity gate", fidelityGatePath, PROGRESS_CERTIFIED_V5_FIDELITY_GATE_SHA256],
    ];
    for (const [label, filePath, expected] of requiredHashes) {
        if (sha256File(filePath) !== expected) throw new Error(`${label} commitment drifted`);
    }
    validateDevelopmentAggregate(JSON.parse(fs.readFileSync(developmentAggregatePath, "utf8")));
    const families = loadProgressCertifiedV5ConfirmatoryFamilies(freshTargetsPath);
    validateProgressCertifiedV5FidelityGate(JSON.parse(fs.readFileSync(fidelityGatePath, "utf8")), families);
    for (const family of families) {
        const mapPath = path.join(repoRoot, family.mapPath);
        if (!fs.existsSync(mapPath) || sha256File(mapPath) !== family.mapSha256) {
            throw new Error(`V5 confirmatory family ${family.familyId} lacks exact map bytes`);
        }
    }
    const arms = buildProgressCertifiedV5Arms();
    const baselineFactory = await loadBaselineFactory(path.join(repoRoot, "packages", "chronodivide-bot"));
    const generationManifest = createExperimentManifest({
        runId: "plan-progress-certified-v5-sealed-confirmatory-v1",
        mixDir: path.join(driverRoot, "data"),
        maps: families.map(({ mapName }) => mapName),
        effectiveConfig: {
            purpose: "progress-certified-v5-sealed-confirmatory-literal-endpoint-v5",
            outcomeAccess: "sealed-private-events-single-complete-unblinding",
            countries: PROGRESS_CERTIFIED_V5_CONFIRMATORY_COUNTRIES,
            reciprocalSlots: [0, 1], arms,
            maxTicks: PROGRESS_CERTIFIED_V5_CONFIRMATORY_MAX_TICKS,
            developmentAggregateSha256: PROGRESS_CERTIFIED_V5_DEVELOPMENT_AGGREGATE_SHA256,
            fidelityGateSha256: PROGRESS_CERTIFIED_V5_FIDELITY_GATE_SHA256,
            protocolSha256: PROGRESS_CERTIFIED_V5_CONFIRMATORY_PROTOCOL_SHA256,
        },
        baseline: baselineFactory.descriptor,
        gameSeedBase: PROGRESS_CERTIFIED_V5_CONFIRMATORY_ENGINE_SEED_BASE,
    });
    const baseline = generationManifest.software.baseline;
    if (
        generationManifest.source.gitBranch !== "main" || generationManifest.source.trackedDirty !== false ||
        generationManifest.source.gitCommit !== execFileSync("git", ["rev-parse", "fork/main"], { encoding: "utf8" }).trim() ||
        baseline.kind !== "external-package" || baseline.gitCommit !== PROGRESS_CERTIFIED_V5_CONFIRMATORY_BASELINE_COMMIT ||
        baseline.trackedDirty !== false || !baseline.runtimeTree.sha256 ||
        !generationManifest.software.gameApiRuntimeTree.sha256 || !generationManifest.software.packageLockSha256 ||
        generationManifest.inputs.maps.some((map) => !map.exists)
    ) throw new Error("V5 confirmatory generation provenance failed");

    fs.mkdirSync(path.dirname(outRoot), { recursive: true, mode: 0o700 });
    fs.mkdirSync(outRoot, { recursive: false, mode: 0o700 });
    const plansRoot = path.join(outRoot, "plans");
    fs.mkdirSync(plansRoot, { mode: 0o700 });
    const sourceRuntimeSha256 = runtimeCommitment(generationManifest.source.runtimeTrees);
    const populationSha256 = sha256Text(JSON.stringify(families));
    const shards: ProgressCertifiedV5ConfirmatoryCampaign["shards"] = [];
    for (let familyIndex = 0; familyIndex < families.length; familyIndex++) {
        for (let countryIndex = 0; countryIndex < PROGRESS_CERTIFIED_V5_CONFIRMATORY_COUNTRIES.length; countryIndex++) {
            const shardIndex = familyIndex * 9 + countryIndex;
            const family = families[familyIndex];
            const country = PROGRESS_CERTIFIED_V5_CONFIRMATORY_COUNTRIES[countryIndex];
            const requestedEngineSeed = derivePairedEngineSeed(PROGRESS_CERTIFIED_V5_CONFIRMATORY_ENGINE_SEED_BASE, shardIndex);
            const runId = `pcv5-confirm-f${String(familyIndex).padStart(2, "0")}-c${countryIndex}-${generationManifest.source.gitCommit.slice(0, 10)}`;
            const plan: ProgressCertifiedRunPlan = parseProgressCertifiedRunPlan({
                schemaVersion: PROGRESS_CERTIFIED_PLAN_SCHEMA_VERSION,
                kind: PROGRESS_CERTIFIED_SEALED_PLAN_KIND,
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
                engineSeedBase: PROGRESS_CERTIFIED_V5_CONFIRMATORY_ENGINE_SEED_BASE,
                seedBlockIndex: shardIndex,
                requestedEngineSeed,
                maxTicks: PROGRESS_CERTIFIED_V5_CONFIRMATORY_MAX_TICKS,
                arms,
                episodes: buildProgressCertifiedV5Episodes(arms),
            });
            const planFile = path.join(plansRoot, `shard-${String(shardIndex).padStart(3, "0")}.json`);
            fs.writeFileSync(planFile, serializeProgressCertifiedRunPlan(plan), { flag: "wx", mode: 0o600 });
            shards.push({
                shardIndex, planFile, planSha256: sha256File(planFile), runId,
                familyId: family.familyId, mapName: family.mapName, mapSha256: family.mapSha256,
                country, seedBlockIndex: shardIndex, requestedEngineSeed, launchedGameCount: 6,
            });
        }
    }
    const campaign: ProgressCertifiedV5ConfirmatoryCampaign = {
        schemaVersion: 1,
        kind: "progress-certified-v5-sealed-confirmatory-literal-endpoint",
        status: "FROZEN_PROGRESS_CERTIFIED_V5_SEALED_CONFIRMATORY_V1",
        generatedAt: new Date().toISOString(),
        sourceGitCommit: generationManifest.source.gitCommit,
        sourceRuntimeSha256,
        baselineGitCommit: PROGRESS_CERTIFIED_V5_CONFIRMATORY_BASELINE_COMMIT,
        baselineRuntimeSha256: baseline.runtimeTree.sha256,
        gameApiRuntimeSha256: generationManifest.software.gameApiRuntimeTree.sha256,
        packageLockSha256: generationManifest.software.packageLockSha256,
        populationSha256,
        protocolPath, protocolSha256: PROGRESS_CERTIFIED_V5_CONFIRMATORY_PROTOCOL_SHA256,
        developmentAggregatePath, developmentAggregateSha256: PROGRESS_CERTIFIED_V5_DEVELOPMENT_AGGREGATE_SHA256,
        freshCatalogPath, freshCatalogSha256: PROGRESS_CERTIFIED_V5_FRESH_CATALOG_SHA256,
        freshTargetsPath, freshTargetsSha256: PROGRESS_CERTIFIED_V5_FRESH_TARGETS_SHA256,
        fidelityGatePath, fidelityGateSha256: PROGRESS_CERTIFIED_V5_FIDELITY_GATE_SHA256,
        fidelityJobId: PROGRESS_CERTIFIED_V5_FIDELITY_JOB_ID,
        fidelitySourceGitCommit: PROGRESS_CERTIFIED_V5_FIDELITY_SOURCE_COMMIT,
        endpointVersion: LITERAL_BUILDING_ELIMINATION_ENDPOINT_VERSION,
        endpointSha256: LITERAL_BUILDING_ELIMINATION_ENDPOINT_SHA256,
        outcomeAccess: "sealed-private-events-single-complete-unblinding",
        familyCount: 56, countryCount: 9, reciprocalSlotCount: 2, policyCount: 3,
        shardCount: 504, launchedGameCount: 3_024,
        engineSeedBase: PROGRESS_CERTIFIED_V5_CONFIRMATORY_ENGINE_SEED_BASE,
        maxTicks: PROGRESS_CERTIFIED_V5_CONFIRMATORY_MAX_TICKS,
        countries: PROGRESS_CERTIFIED_V5_CONFIRMATORY_COUNTRIES,
        successRule: PROGRESS_CERTIFIED_V5_CONFIRMATORY_SUCCESS_RULE,
        powerDesign: {
            unit: "family", familyCount: 56,
            developmentMeanEffect: 0.01388888888888889,
            developmentFamilyEffectSampleSd: 0.035258208823444021,
            approximatePower: 0.89880788041509219,
            alpha: 0.05, sidedness: "one-sided", degreesOfFreedom: 55,
            criticalValue: PROGRESS_CERTIFIED_V5_CONFIRMATORY_ONE_SIDED_95_T_CRITICAL_DF55,
        },
        arms,
        selectedFamilies: families,
        shards,
    };
    validateProgressCertifiedV5ConfirmatoryCampaign(campaign);
    fs.writeFileSync(path.join(outRoot, "campaign.json"), `${JSON.stringify(campaign, null, 2)}\n`, { flag: "wx", mode: 0o600 });
    fs.writeFileSync(path.join(outRoot, "plan-files.txt"), `${shards.map(({ planFile }) => planFile).join("\n")}\n`, { flag: "wx", mode: 0o600 });
    fs.writeFileSync(path.join(outRoot, "generation-manifest.json"), `${JSON.stringify(generationManifest, null, 2)}\n`, { flag: "wx", mode: 0o600 });
    console.log(JSON.stringify({
        outRoot, campaignSha256: sha256File(path.join(outRoot, "campaign.json")),
        shardCount: shards.length, launchedGameCount: PROGRESS_CERTIFIED_V5_CONFIRMATORY_LAUNCH_COUNT,
        sourceGitCommit: campaign.sourceGitCommit,
    }));
};

const invoked = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (import.meta.url === invoked) main().catch((error) => { console.error(error); process.exitCode = 1; });
