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

export const PROGRESS_CERTIFIED_V5_REPAIR_CONFIRMATORY_ENGINE_SEED_BASE = 4_232_000_000 as const;
export const PROGRESS_CERTIFIED_V5_REPAIR_CONFIRMATORY_MAX_TICKS = 24_000 as const;
export const PROGRESS_CERTIFIED_V5_REPAIR_CONFIRMATORY_BASELINE_COMMIT =
    "165b77a71d0cf5ebd27c65b19d0486bcbae78d0f" as const;
export const PROGRESS_CERTIFIED_V5_REPAIR_CONFIRMATORY_PROTOCOL_SHA256 =
    "f8df0928ee30a177b183252c8629c2e33dc0fd92e2e51a6617b39ad0b639d183" as const;
export const PROGRESS_CERTIFIED_V5_DEVELOPMENT_AGGREGATE_SHA256 =
    "4c6fedf27f034870d8ed827f93463d70049494764c2c7f50b57d15bb50fa353a" as const;
export const PROGRESS_CERTIFIED_V5_REPAIR_RESULT_SHA256 =
    "e515e80759443678d7e8e4f19a85b65c310ccddd7e9807f0c17ee62fcd8ffccf" as const;
export const PROGRESS_CERTIFIED_V5_DEPLOYABILITY_SUMMARY_SHA256 =
    "e9a6b6dd56b248f581a34e14ae92f6c164b82024a136c3756b98d7df7c5ac646" as const;
export const PROGRESS_CERTIFIED_V5_DEPLOYABILITY_ARRAY_JOB_ID = "22340782" as const;
export const PROGRESS_CERTIFIED_V5_DEPLOYABILITY_FINALIZER_JOB_ID = "22341425" as const;
export const PROGRESS_CERTIFIED_V5_REPAIR_CONFIRMATORY_ONE_SIDED_95_T_CRITICAL_DF52 =
    1.6746891537260253 as const;

export const PROGRESS_CERTIFIED_V5_REPAIR_CONFIRMATORY_COUNTRIES = [
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

export const PROGRESS_CERTIFIED_V5_REPAIR_CONFIRMATORY_FAMILY_COUNT = 53 as const;
export const PROGRESS_CERTIFIED_V5_REPAIR_CONFIRMATORY_SHARD_COUNT = 477 as const;
export const PROGRESS_CERTIFIED_V5_REPAIR_CONFIRMATORY_LAUNCH_COUNT = 2_862 as const;

export const PROGRESS_CERTIFIED_V5_REPAIR_CONFIRMATORY_SUCCESS_RULE = [
    "all 2862 launches pass the outcome-blind technical gate before one complete unblinding",
    "one-sided 95% family-level lower bound for V5-minus-external paired literal score is above zero",
    "one-sided 95% family-level lower bound for V5 absolute literal score minus 0.5 is above zero",
] as const;

export type ProgressCertifiedV5RepairConfirmatoryFamily = {
    familyId: string;
    mapName: string;
    mapPath: string;
    mapSha256: string;
};

export type ProgressCertifiedV5RepairConfirmatoryCampaign = {
    schemaVersion: 1;
    kind: "progress-certified-v5-repaired-sealed-confirmatory-literal-endpoint";
    status: "FROZEN_PROGRESS_CERTIFIED_V5_REPAIRED_SEALED_CONFIRMATORY_V1";
    generatedAt: string;
    sourceGitCommit: string;
    sourceRuntimeSha256: string;
    baselineGitCommit: typeof PROGRESS_CERTIFIED_V5_REPAIR_CONFIRMATORY_BASELINE_COMMIT;
    baselineRuntimeSha256: string;
    gameApiRuntimeSha256: string;
    packageLockSha256: string;
    populationSha256: string;
    protocolPath: string;
    protocolSha256: typeof PROGRESS_CERTIFIED_V5_REPAIR_CONFIRMATORY_PROTOCOL_SHA256;
    developmentAggregatePath: string;
    developmentAggregateSha256: typeof PROGRESS_CERTIFIED_V5_DEVELOPMENT_AGGREGATE_SHA256;
    repairResultPath: string;
    repairResultSha256: typeof PROGRESS_CERTIFIED_V5_REPAIR_RESULT_SHA256;
    deployabilitySummaryPath: string;
    deployabilitySummarySha256: typeof PROGRESS_CERTIFIED_V5_DEPLOYABILITY_SUMMARY_SHA256;
    deployabilityArrayJobId: typeof PROGRESS_CERTIFIED_V5_DEPLOYABILITY_ARRAY_JOB_ID;
    deployabilityFinalizerJobId: typeof PROGRESS_CERTIFIED_V5_DEPLOYABILITY_FINALIZER_JOB_ID;
    endpointVersion: typeof LITERAL_BUILDING_ELIMINATION_ENDPOINT_VERSION;
    endpointSha256: typeof LITERAL_BUILDING_ELIMINATION_ENDPOINT_SHA256;
    outcomeAccess: "sealed-private-events-single-complete-unblinding";
    familyCount: 53;
    countryCount: 9;
    reciprocalSlotCount: 2;
    policyCount: 3;
    shardCount: 477;
    launchedGameCount: 2_862;
    engineSeedBase: typeof PROGRESS_CERTIFIED_V5_REPAIR_CONFIRMATORY_ENGINE_SEED_BASE;
    maxTicks: typeof PROGRESS_CERTIFIED_V5_REPAIR_CONFIRMATORY_MAX_TICKS;
    countries: readonly Countries[];
    successRule: readonly string[];
    powerDesign: {
        unit: "family";
        familyCount: 53;
        developmentMeanEffect: 0.01388888888888889;
        developmentFamilyEffectSampleSd: 0.035258208823444021;
        approximatePower: 0.88204868194211761;
        alpha: 0.05;
        sidedness: "one-sided";
        degreesOfFreedom: 52;
        criticalValue: typeof PROGRESS_CERTIFIED_V5_REPAIR_CONFIRMATORY_ONE_SIDED_95_T_CRITICAL_DF52;
    };
    arms: ProgressCertifiedV5Arm[];
    selectedFamilies: ProgressCertifiedV5RepairConfirmatoryFamily[];
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

export const loadProgressCertifiedV5RepairConfirmatoryFamilies = (
    summaryPath: string,
    repoRoot: string,
    stageReserveMaps = false,
): ProgressCertifiedV5RepairConfirmatoryFamily[] => {
    if (sha256File(summaryPath) !== PROGRESS_CERTIFIED_V5_DEPLOYABILITY_SUMMARY_SHA256) {
        throw new Error("Deployability-summary bytes drifted");
    }
    const value = JSON.parse(fs.readFileSync(summaryPath, "utf8")) as unknown;
    if (
        !isRecord(value) || value.schemaVersion !== 1 ||
        value.kind !== "progress-certified-v5-outcome-blind-map-deployability-summary" ||
        value.status !== "COMPLETE_TECHNICAL_SELECTION_NOT_POLICY_EVIDENCE" ||
        value.outcomeBlind !== true || value.notPolicyEvidence !== true ||
        value.arrayJobId !== PROGRESS_CERTIFIED_V5_DEPLOYABILITY_ARRAY_JOB_ID ||
        value.schedulerAccount !== "pi_jss233" || value.cellTaskCount !== 540 ||
        value.launchedGameCount !== 1080 || value.candidateFamilyCount !== 60 ||
        value.eligibleOriginalFamilyCount !== 49 || value.eligibleReserveFamilyCount !== 4 ||
        value.selectedFamilyCount !== 53 ||
        value.selectedPopulationSha256 !== "595c601817bc685996a293194fc6371ca37c63644a8284cf10ce2abbcff5facb" ||
        !Array.isArray(value.selectedFamilies) || value.selectedFamilies.length !== 53
    ) throw new Error("Deployability summary has an invalid frozen schema");
    const dataRoot = path.join(repoRoot, "packages", "chronodivide-bot-driver", "data");
    const families = value.selectedFamilies.map((raw, index): ProgressCertifiedV5RepairConfirmatoryFamily => {
        if (
            !isRecord(raw) || typeof raw.familyId !== "string" ||
            (raw.sourceTier !== "original" && raw.sourceTier !== "reserve") ||
            typeof raw.mapPath !== "string" || typeof raw.mapName !== "string" ||
            !Number.isSafeInteger(raw.mapBytes) || (raw.mapBytes as number) <= 0 ||
            typeof raw.mapSha256 !== "string" || !/^[0-9a-f]{64}$/.test(raw.mapSha256)
        ) {
            throw new Error(`Deployability family ${index} is malformed`);
        }
        const sourcePath = path.resolve(raw.mapPath);
        const sourceStat = fs.lstatSync(sourcePath);
        if (
            !sourceStat.isFile() || sourceStat.isSymbolicLink() || sourceStat.size !== raw.mapBytes ||
            sha256File(sourcePath) !== raw.mapSha256
        ) throw new Error(`Deployability source map ${raw.familyId} drifted`);
        let runtimePath = sourcePath;
        if (raw.sourceTier === "reserve") {
            if (typeof raw.sourceSha1 !== "string" || !/^[0-9a-f]{40}$/.test(raw.sourceSha1)) {
                throw new Error(`Reserve family ${raw.familyId} lacks a source SHA-1`);
            }
            runtimePath = path.join(dataRoot, `method_v5_repair_${raw.sourceSha1}.map`);
            if (!fs.existsSync(runtimePath)) {
                if (!stageReserveMaps) throw new Error(`Staged reserve map is absent: ${runtimePath}`);
                fs.writeFileSync(runtimePath, fs.readFileSync(sourcePath), { flag: "wx", mode: 0o400 });
            }
            const runtimeStat = fs.lstatSync(runtimePath);
            if (
                !runtimeStat.isFile() || runtimeStat.isSymbolicLink() || runtimeStat.size !== raw.mapBytes ||
                sha256File(runtimePath) !== raw.mapSha256
            ) throw new Error(`Staged reserve map ${raw.familyId} drifted`);
        } else if (!sourcePath.startsWith(`${dataRoot}${path.sep}`)) {
            throw new Error(`Original family ${raw.familyId} is outside the committed data root`);
        }
        const mapPath = path.relative(repoRoot, runtimePath).split(path.sep).join("/");
        return { familyId: raw.familyId, mapPath, mapName: path.basename(runtimePath), mapSha256: raw.mapSha256 };
    });
    if (
        new Set(families.map(({ familyId }) => familyId)).size !== 53 ||
        new Set(families.map(({ mapSha256 }) => mapSha256)).size !== 53
    ) throw new Error("Repaired confirmatory families must have 53 unique family and map identities");
    return families;
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

export const validateProgressCertifiedV5RepairConfirmatoryCampaign = (
    value: unknown,
): ProgressCertifiedV5RepairConfirmatoryCampaign => {
    if (
        !isRecord(value) || value.schemaVersion !== 1 ||
        value.kind !== "progress-certified-v5-repaired-sealed-confirmatory-literal-endpoint" ||
        value.status !== "FROZEN_PROGRESS_CERTIFIED_V5_REPAIRED_SEALED_CONFIRMATORY_V1" ||
        !/^[0-9a-f]{40}$/.test(String(value.sourceGitCommit)) ||
        !/^[0-9a-f]{64}$/.test(String(value.sourceRuntimeSha256)) ||
        value.baselineGitCommit !== PROGRESS_CERTIFIED_V5_REPAIR_CONFIRMATORY_BASELINE_COMMIT ||
        !/^[0-9a-f]{64}$/.test(String(value.baselineRuntimeSha256)) ||
        !/^[0-9a-f]{64}$/.test(String(value.gameApiRuntimeSha256)) ||
        !/^[0-9a-f]{64}$/.test(String(value.packageLockSha256)) ||
        value.protocolSha256 !== PROGRESS_CERTIFIED_V5_REPAIR_CONFIRMATORY_PROTOCOL_SHA256 ||
        value.developmentAggregateSha256 !== PROGRESS_CERTIFIED_V5_DEVELOPMENT_AGGREGATE_SHA256 ||
        value.repairResultSha256 !== PROGRESS_CERTIFIED_V5_REPAIR_RESULT_SHA256 ||
        value.deployabilitySummarySha256 !== PROGRESS_CERTIFIED_V5_DEPLOYABILITY_SUMMARY_SHA256 ||
        value.deployabilityArrayJobId !== PROGRESS_CERTIFIED_V5_DEPLOYABILITY_ARRAY_JOB_ID ||
        value.deployabilityFinalizerJobId !== PROGRESS_CERTIFIED_V5_DEPLOYABILITY_FINALIZER_JOB_ID ||
        value.endpointVersion !== LITERAL_BUILDING_ELIMINATION_ENDPOINT_VERSION ||
        value.endpointSha256 !== LITERAL_BUILDING_ELIMINATION_ENDPOINT_SHA256 ||
        value.outcomeAccess !== "sealed-private-events-single-complete-unblinding" ||
        value.familyCount !== 53 || value.countryCount !== 9 || value.reciprocalSlotCount !== 2 ||
        value.policyCount !== 3 || value.shardCount !== 477 || value.launchedGameCount !== 2_862 ||
        value.engineSeedBase !== PROGRESS_CERTIFIED_V5_REPAIR_CONFIRMATORY_ENGINE_SEED_BASE ||
        value.maxTicks !== PROGRESS_CERTIFIED_V5_REPAIR_CONFIRMATORY_MAX_TICKS ||
        !Array.isArray(value.countries) || !Array.isArray(value.successRule) ||
        !Array.isArray(value.arms) || !Array.isArray(value.selectedFamilies) || !Array.isArray(value.shards)
    ) throw new Error("V5 confirmatory campaign has an invalid frozen schema");
    const campaign = value as unknown as ProgressCertifiedV5RepairConfirmatoryCampaign;
    if (
        !isDeepStrictEqual(campaign.countries, PROGRESS_CERTIFIED_V5_REPAIR_CONFIRMATORY_COUNTRIES) ||
        !isDeepStrictEqual(campaign.successRule, PROGRESS_CERTIFIED_V5_REPAIR_CONFIRMATORY_SUCCESS_RULE) ||
        !isDeepStrictEqual(campaign.arms, buildProgressCertifiedV5Arms()) ||
        campaign.selectedFamilies.length !== 53 || campaign.shards.length !== 477 ||
        campaign.populationSha256 !== sha256Text(JSON.stringify(campaign.selectedFamilies)) ||
        sha256File(campaign.protocolPath) !== PROGRESS_CERTIFIED_V5_REPAIR_CONFIRMATORY_PROTOCOL_SHA256 ||
        sha256File(campaign.developmentAggregatePath) !== PROGRESS_CERTIFIED_V5_DEVELOPMENT_AGGREGATE_SHA256 ||
        sha256File(campaign.repairResultPath) !== PROGRESS_CERTIFIED_V5_REPAIR_RESULT_SHA256 ||
        sha256File(campaign.deployabilitySummaryPath) !== PROGRESS_CERTIFIED_V5_DEPLOYABILITY_SUMMARY_SHA256 ||
        !isDeepStrictEqual(campaign.selectedFamilies, loadProgressCertifiedV5RepairConfirmatoryFamilies(
            campaign.deployabilitySummaryPath,
            execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim(),
        )) ||
        !isDeepStrictEqual(campaign.powerDesign, {
            unit: "family", familyCount: 53,
            developmentMeanEffect: 0.01388888888888889,
            developmentFamilyEffectSampleSd: 0.035258208823444021,
            approximatePower: 0.88204868194211761,
            alpha: 0.05, sidedness: "one-sided", degreesOfFreedom: 52,
            criticalValue: PROGRESS_CERTIFIED_V5_REPAIR_CONFIRMATORY_ONE_SIDED_95_T_CRITICAL_DF52,
        })
    ) throw new Error("V5 confirmatory campaign commitments drifted");
    for (const [index, shard] of campaign.shards.entries()) {
        const family = campaign.selectedFamilies[Math.floor(index / 9)];
        const country = PROGRESS_CERTIFIED_V5_REPAIR_CONFIRMATORY_COUNTRIES[index % 9];
        const requestedEngineSeed = derivePairedEngineSeed(PROGRESS_CERTIFIED_V5_REPAIR_CONFIRMATORY_ENGINE_SEED_BASE, index);
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
    const protocolPath = requiredPath("PROGRESS_CERTIFIED_V5_REPAIR_CONFIRMATORY_PROTOCOL");
    const developmentAggregatePath = requiredPath("PROGRESS_CERTIFIED_V5_DEVELOPMENT_AGGREGATE");
    const repairResultPath = requiredPath("PROGRESS_CERTIFIED_V5_REPAIR_RESULT");
    const deployabilitySummaryPath = requiredPath("PROGRESS_CERTIFIED_V5_DEPLOYABILITY_SUMMARY");
    const outRoot = requiredPath("OUT_ROOT");
    if (fs.existsSync(outRoot)) throw new Error(`Refusing to reuse V5 confirmatory campaign root ${outRoot}`);
    const requiredHashes: Array<[string, string, string]> = [
        ["protocol", protocolPath, PROGRESS_CERTIFIED_V5_REPAIR_CONFIRMATORY_PROTOCOL_SHA256],
        ["development aggregate", developmentAggregatePath, PROGRESS_CERTIFIED_V5_DEVELOPMENT_AGGREGATE_SHA256],
        ["repair result", repairResultPath, PROGRESS_CERTIFIED_V5_REPAIR_RESULT_SHA256],
        ["deployability summary", deployabilitySummaryPath, PROGRESS_CERTIFIED_V5_DEPLOYABILITY_SUMMARY_SHA256],
    ];
    for (const [label, filePath, expected] of requiredHashes) {
        if (sha256File(filePath) !== expected) throw new Error(`${label} commitment drifted`);
    }
    validateDevelopmentAggregate(JSON.parse(fs.readFileSync(developmentAggregatePath, "utf8")));
    const families = loadProgressCertifiedV5RepairConfirmatoryFamilies(
        deployabilitySummaryPath,
        repoRoot,
        true,
    );
    for (const family of families) {
        const mapPath = path.join(repoRoot, family.mapPath);
        if (!fs.existsSync(mapPath) || sha256File(mapPath) !== family.mapSha256) {
            throw new Error(`V5 confirmatory family ${family.familyId} lacks exact map bytes`);
        }
    }
    const arms = buildProgressCertifiedV5Arms();
    const baselineFactory = await loadBaselineFactory(path.join(repoRoot, "packages", "chronodivide-bot"));
    const generationManifest = createExperimentManifest({
        runId: "plan-progress-certified-v5-repaired-sealed-confirmatory-v1",
        mixDir: path.join(driverRoot, "data"),
        maps: families.map(({ mapName }) => mapName),
        effectiveConfig: {
            purpose: "progress-certified-v5-repaired-sealed-confirmatory-literal-endpoint-v5",
            outcomeAccess: "sealed-private-events-single-complete-unblinding",
            countries: PROGRESS_CERTIFIED_V5_REPAIR_CONFIRMATORY_COUNTRIES,
            reciprocalSlots: [0, 1], arms,
            maxTicks: PROGRESS_CERTIFIED_V5_REPAIR_CONFIRMATORY_MAX_TICKS,
            developmentAggregateSha256: PROGRESS_CERTIFIED_V5_DEVELOPMENT_AGGREGATE_SHA256,
            deployabilitySummarySha256: PROGRESS_CERTIFIED_V5_DEPLOYABILITY_SUMMARY_SHA256,
            protocolSha256: PROGRESS_CERTIFIED_V5_REPAIR_CONFIRMATORY_PROTOCOL_SHA256,
        },
        baseline: baselineFactory.descriptor,
        gameSeedBase: PROGRESS_CERTIFIED_V5_REPAIR_CONFIRMATORY_ENGINE_SEED_BASE,
    });
    const baseline = generationManifest.software.baseline;
    if (
        generationManifest.source.gitBranch !== "main" || generationManifest.source.trackedDirty !== false ||
        generationManifest.source.gitCommit !== execFileSync("git", ["rev-parse", "fork/main"], { encoding: "utf8" }).trim() ||
        baseline.kind !== "external-package" || baseline.gitCommit !== PROGRESS_CERTIFIED_V5_REPAIR_CONFIRMATORY_BASELINE_COMMIT ||
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
    const shards: ProgressCertifiedV5RepairConfirmatoryCampaign["shards"] = [];
    for (let familyIndex = 0; familyIndex < families.length; familyIndex++) {
        for (let countryIndex = 0; countryIndex < PROGRESS_CERTIFIED_V5_REPAIR_CONFIRMATORY_COUNTRIES.length; countryIndex++) {
            const shardIndex = familyIndex * 9 + countryIndex;
            const family = families[familyIndex];
            const country = PROGRESS_CERTIFIED_V5_REPAIR_CONFIRMATORY_COUNTRIES[countryIndex];
            const requestedEngineSeed = derivePairedEngineSeed(PROGRESS_CERTIFIED_V5_REPAIR_CONFIRMATORY_ENGINE_SEED_BASE, shardIndex);
            const runId = `pcv5-repair-confirm-f${String(familyIndex).padStart(2, "0")}-c${countryIndex}-${generationManifest.source.gitCommit.slice(0, 10)}`;
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
                engineSeedBase: PROGRESS_CERTIFIED_V5_REPAIR_CONFIRMATORY_ENGINE_SEED_BASE,
                seedBlockIndex: shardIndex,
                requestedEngineSeed,
                maxTicks: PROGRESS_CERTIFIED_V5_REPAIR_CONFIRMATORY_MAX_TICKS,
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
    const campaign: ProgressCertifiedV5RepairConfirmatoryCampaign = {
        schemaVersion: 1,
        kind: "progress-certified-v5-repaired-sealed-confirmatory-literal-endpoint",
        status: "FROZEN_PROGRESS_CERTIFIED_V5_REPAIRED_SEALED_CONFIRMATORY_V1",
        generatedAt: new Date().toISOString(),
        sourceGitCommit: generationManifest.source.gitCommit,
        sourceRuntimeSha256,
        baselineGitCommit: PROGRESS_CERTIFIED_V5_REPAIR_CONFIRMATORY_BASELINE_COMMIT,
        baselineRuntimeSha256: baseline.runtimeTree.sha256,
        gameApiRuntimeSha256: generationManifest.software.gameApiRuntimeTree.sha256,
        packageLockSha256: generationManifest.software.packageLockSha256,
        populationSha256,
        protocolPath, protocolSha256: PROGRESS_CERTIFIED_V5_REPAIR_CONFIRMATORY_PROTOCOL_SHA256,
        developmentAggregatePath, developmentAggregateSha256: PROGRESS_CERTIFIED_V5_DEVELOPMENT_AGGREGATE_SHA256,
        repairResultPath, repairResultSha256: PROGRESS_CERTIFIED_V5_REPAIR_RESULT_SHA256,
        deployabilitySummaryPath,
        deployabilitySummarySha256: PROGRESS_CERTIFIED_V5_DEPLOYABILITY_SUMMARY_SHA256,
        deployabilityArrayJobId: PROGRESS_CERTIFIED_V5_DEPLOYABILITY_ARRAY_JOB_ID,
        deployabilityFinalizerJobId: PROGRESS_CERTIFIED_V5_DEPLOYABILITY_FINALIZER_JOB_ID,
        endpointVersion: LITERAL_BUILDING_ELIMINATION_ENDPOINT_VERSION,
        endpointSha256: LITERAL_BUILDING_ELIMINATION_ENDPOINT_SHA256,
        outcomeAccess: "sealed-private-events-single-complete-unblinding",
        familyCount: 53, countryCount: 9, reciprocalSlotCount: 2, policyCount: 3,
        shardCount: 477, launchedGameCount: 2_862,
        engineSeedBase: PROGRESS_CERTIFIED_V5_REPAIR_CONFIRMATORY_ENGINE_SEED_BASE,
        maxTicks: PROGRESS_CERTIFIED_V5_REPAIR_CONFIRMATORY_MAX_TICKS,
        countries: PROGRESS_CERTIFIED_V5_REPAIR_CONFIRMATORY_COUNTRIES,
        successRule: PROGRESS_CERTIFIED_V5_REPAIR_CONFIRMATORY_SUCCESS_RULE,
        powerDesign: {
            unit: "family", familyCount: 53,
            developmentMeanEffect: 0.01388888888888889,
            developmentFamilyEffectSampleSd: 0.035258208823444021,
            approximatePower: 0.88204868194211761,
            alpha: 0.05, sidedness: "one-sided", degreesOfFreedom: 52,
            criticalValue: PROGRESS_CERTIFIED_V5_REPAIR_CONFIRMATORY_ONE_SIDED_95_T_CRITICAL_DF52,
        },
        arms,
        selectedFamilies: families,
        shards,
    };
    validateProgressCertifiedV5RepairConfirmatoryCampaign(campaign);
    fs.writeFileSync(path.join(outRoot, "campaign.json"), `${JSON.stringify(campaign, null, 2)}\n`, { flag: "wx", mode: 0o600 });
    fs.writeFileSync(path.join(outRoot, "plan-files.txt"), `${shards.map(({ planFile }) => planFile).join("\n")}\n`, { flag: "wx", mode: 0o600 });
    fs.writeFileSync(path.join(outRoot, "generation-manifest.json"), `${JSON.stringify(generationManifest, null, 2)}\n`, { flag: "wx", mode: 0o600 });
    console.log(JSON.stringify({
        outRoot, campaignSha256: sha256File(path.join(outRoot, "campaign.json")),
        shardCount: shards.length, launchedGameCount: PROGRESS_CERTIFIED_V5_REPAIR_CONFIRMATORY_LAUNCH_COUNT,
        sourceGitCommit: campaign.sourceGitCommit,
    }));
};

const invoked = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (import.meta.url === invoked) main().catch((error) => { console.error(error); process.exitCode = 1; });
