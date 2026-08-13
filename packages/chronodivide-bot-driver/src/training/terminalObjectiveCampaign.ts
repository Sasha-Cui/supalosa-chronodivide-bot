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
    TERMINAL_OBJECTIVE_ARM_ORDER,
    TerminalObjectiveArm,
    buildTerminalObjectiveArms,
} from "./terminalObjectivePolicy.js";
import {
    TERMINAL_OBJECTIVE_PLAN_KIND,
    TERMINAL_OBJECTIVE_PLAN_SCHEMA_VERSION,
    TerminalObjectivePlanEpisode,
    TerminalObjectiveRunPlan,
    parseTerminalObjectiveRunPlan,
    serializeTerminalObjectiveRunPlan,
    sha256File,
} from "./terminalObjectivePlanRunner.js";

export const TERMINAL_OBJECTIVE_ENGINE_SEED_BASE = 3_770_000_000 as const;
export const TERMINAL_OBJECTIVE_MAX_TICKS = 24_000 as const;
export const TERMINAL_OBJECTIVE_FAMILY_COUNT = 10 as const;
export const TERMINAL_OBJECTIVE_SEED_BLOCKS_PER_FAMILY = 2 as const;
export const TERMINAL_OBJECTIVE_SUPPORTED_POPULATION_SHA256 =
    "80012d84a9897c90fa54acf7971cdb66551b842cd072f33ecec9f6c6f9b10084" as const;
export const TERMINAL_OBJECTIVE_CORE_SHA256 =
    "03238e35095bbf9b74e336599f922ae64a11958d0da5b27859c791401d719f62" as const;
export const TERMINAL_OBJECTIVE_ADAPTER_SHA256 =
    "a39cdb70571de40f72a3aae251eb1e8610c94b76ca7125790f9e0ee488ad52fc" as const;
export const TERMINAL_OBJECTIVE_EQUIVALENCE_SHA256 =
    "60859701828f2e6cb62ccd7d07ed2cdc3ad45a5c8b79edce3a34aaf053d904be" as const;
export const TERMINAL_OBJECTIVE_SMOKE_SHA256 =
    "1a4af658ee7e08ae266cf4b16902ce5476d2ab738e12f18748ab17c031554c63" as const;
export const TERMINAL_OBJECTIVE_REPLACEMENT_FAILURE_AUDIT_SHA256 =
    "ab44c5d7f6064335fbc34532abcc14e7178b97224e375a1fc64b610019f66514" as const;
export const TERMINAL_OBJECTIVE_REPLACEMENT_PROTOCOL_SHA256 =
    "a3eb5dadf124436587fb3b05511204bac996a056e9ec620d45b7169c50a6a2ef" as const;
export const TERMINAL_OBJECTIVE_BUILDING_FIRST_FAILURE_AUDIT_SHA256 =
    "977b8f577a610a968e373de63cca3855a68f07a153c3a6b09c8dae24b5785c9c" as const;
export const TERMINAL_OBJECTIVE_BUILDING_FIRST_AMENDMENT_SHA256 =
    "5f2d5477d9d8f22b692fbd479869e7359b0496dbdafd3d48d0df8602f050abc2" as const;
export const TERMINAL_OBJECTIVE_ONE_SIDED_80_T_CRITICAL_DF9 = 0.8834038596855205 as const;

export const TERMINAL_OBJECTIVE_COUNTRIES = [
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

export const TERMINAL_OBJECTIVE_SHARD_COUNT =
    TERMINAL_OBJECTIVE_FAMILY_COUNT * TERMINAL_OBJECTIVE_SEED_BLOCKS_PER_FAMILY *
    TERMINAL_OBJECTIVE_COUNTRIES.length;
export const TERMINAL_OBJECTIVE_LAUNCH_COUNT =
    TERMINAL_OBJECTIVE_SHARD_COUNT * TERMINAL_OBJECTIVE_ARM_ORDER.length * 2;

export const TERMINAL_OBJECTIVE_ADVANCEMENT_RULE = [
    "one-sided family-clustered 80% lower confidence bound for full_sufficient_strike score margin above zero",
    "literal full_sufficient_strike wins exceed literal losses overall",
    "literal full_sufficient_strike wins exceed losses in at least seven of nine countries",
    "every leave-one-family-out full_sufficient_strike score margin is positive",
    "family-macro paired full_sufficient_strike minus selected_prior effect is positive",
    "all 1,800 launches are technically clean under literal endpoint v5",
] as const;

export type TerminalObjectiveFamily = {
    familyId: string;
    mapName: string;
    mapSha256: string;
    selectionDigest: string;
};

export type TerminalObjectiveCampaign = {
    schemaVersion: 2;
    kind: "terminal-objective-open-development-literal-endpoint";
    status: "FROZEN_TERMINAL_OBJECTIVE_BUILDING_FIRST_OPEN_DEVELOPMENT_ENDPOINT_V5";
    generatedAt: string;
    sourceGitCommit: string;
    sourceRuntimeSha256: string;
    baselineGitCommit: string;
    baselineRuntimeSha256: string;
    gameApiRuntimeSha256: string;
    packageLockSha256: string;
    supportedPopulationPath: string;
    supportedPopulationSha256: typeof TERMINAL_OBJECTIVE_SUPPORTED_POPULATION_SHA256;
    sourcePopulationCommitmentSha256: typeof TERMINAL_OBJECTIVE_SUPPORTED_POPULATION_SHA256;
    familySelectionRule: "lowest-sha256-terminal-objective-open-development-v1-family-id-map-sha";
    outcomeFreePopulationSelection: true;
    endpointVersion: typeof LITERAL_BUILDING_ELIMINATION_ENDPOINT_VERSION;
    endpointSha256: typeof LITERAL_BUILDING_ELIMINATION_ENDPOINT_SHA256;
    coreSha256: typeof TERMINAL_OBJECTIVE_CORE_SHA256;
    adapterSha256: typeof TERMINAL_OBJECTIVE_ADAPTER_SHA256;
    equivalenceGatePath: string;
    equivalenceGateSha256: typeof TERMINAL_OBJECTIVE_EQUIVALENCE_SHA256;
    smokeGatePath: string;
    smokeGateSha256: typeof TERMINAL_OBJECTIVE_SMOKE_SHA256;
    replacesArrayJobId: "22119584";
    replacesControllerJobId: "22119585";
    replacementFailureAuditPath: string;
    replacementFailureAuditSha256: typeof TERMINAL_OBJECTIVE_REPLACEMENT_FAILURE_AUDIT_SHA256;
    replacementProtocolPath: string;
    replacementProtocolSha256: typeof TERMINAL_OBJECTIVE_REPLACEMENT_PROTOCOL_SHA256;
    buildingFirstReplacesArrayJobId: "22125520";
    buildingFirstReplacesControllerJobId: "22125521";
    buildingFirstFailureAuditPath: string;
    buildingFirstFailureAuditSha256: typeof TERMINAL_OBJECTIVE_BUILDING_FIRST_FAILURE_AUDIT_SHA256;
    buildingFirstAmendmentPath: string;
    buildingFirstAmendmentSha256: typeof TERMINAL_OBJECTIVE_BUILDING_FIRST_AMENDMENT_SHA256;
    priorCampaignReuse: "none_complete_building_first_fresh_seed_replacement";
    outcomeAccess: "open-development-only-no-paper-claim";
    familyCount: number;
    seedBlocksPerFamily: number;
    countryCount: number;
    reciprocalSlotCount: 2;
    policyCount: number;
    shardCount: number;
    launchedGameCount: number;
    engineSeedBase: typeof TERMINAL_OBJECTIVE_ENGINE_SEED_BASE;
    maxTicks: typeof TERMINAL_OBJECTIVE_MAX_TICKS;
    countries: readonly Countries[];
    advancementRule: readonly string[];
    confidenceInterval: {
        unit: "family";
        familyCount: typeof TERMINAL_OBJECTIVE_FAMILY_COUNT;
        method: "student-t-lower-bound-on-family-means";
        sidedness: "one-sided";
        confidenceLevel: 0.8;
        degreesOfFreedom: 9;
        criticalValue: typeof TERMINAL_OBJECTIVE_ONE_SIDED_80_T_CRITICAL_DF9;
    };
    arms: TerminalObjectiveArm[];
    selectedFamilies: TerminalObjectiveFamily[];
    shards: Array<{
        shardIndex: number;
        planFile: string;
        planSha256: string;
        runId: string;
        familyId: string;
        mapName: string;
        mapSha256: string;
        country: Countries;
        familySeedIndex: number;
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

export const buildTerminalObjectiveEpisodes = (
    arms: TerminalObjectiveArm[],
): TerminalObjectivePlanEpisode[] => arms.flatMap((arm, armIndex) =>
    ([0, 1] as const).map((candidateSlot) => ({
        episodeId: `a${armIndex}-s${candidateSlot}`,
        armId: arm.armId,
        policyId: arm.policyId,
        candidateSlot,
    })),
);

export const selectTerminalObjectiveFamilies = (
    supportedPopulation: unknown,
    repoRoot: string,
): TerminalObjectiveFamily[] => {
    if (
        !isRecord(supportedPopulation) || supportedPopulation.schemaVersion !== 1 ||
        supportedPopulation.status !== "FROZEN_METHOD_V6_OPEN_TRAINING_ECONOMIC_START_SUPPORTED_POPULATION" ||
        supportedPopulation.outcomeFree !== true ||
        !Array.isArray(supportedPopulation.supportedFamilies) ||
        supportedPopulation.supportedFamilies.length < TERMINAL_OBJECTIVE_FAMILY_COUNT
    ) throw new Error("Terminal-objective supported-population input is invalid");
    const eligible = supportedPopulation.supportedFamilies.map((raw, index): TerminalObjectiveFamily => {
        if (
            !isRecord(raw) || typeof raw.familyId !== "string" ||
            typeof raw.mapName !== "string" || path.basename(raw.mapName) !== raw.mapName ||
            typeof raw.mapSha256 !== "string" || !/^[0-9a-f]{64}$/.test(raw.mapSha256)
        ) throw new Error(`Terminal-objective supported family ${index} is malformed`);
        const mapPath = path.join(repoRoot, "packages", "chronodivide-bot-driver", "data", raw.mapName);
        if (!fs.existsSync(mapPath) || sha256File(mapPath) !== raw.mapSha256) {
            throw new Error(`Terminal-objective family ${raw.familyId} lacks exact committed map bytes`);
        }
        return {
            familyId: raw.familyId,
            mapName: raw.mapName,
            mapSha256: raw.mapSha256,
            selectionDigest: sha256Text(
                `terminal-objective-open-development-v1|${raw.familyId}|${raw.mapSha256}`,
            ),
        };
    }).sort((left, right) =>
        left.selectionDigest.localeCompare(right.selectionDigest) || left.familyId.localeCompare(right.familyId),
    ).slice(0, TERMINAL_OBJECTIVE_FAMILY_COUNT);
    if (
        new Set(eligible.map(({ familyId }) => familyId)).size !== TERMINAL_OBJECTIVE_FAMILY_COUNT ||
        new Set(eligible.map(({ mapSha256 }) => mapSha256)).size !== TERMINAL_OBJECTIVE_FAMILY_COUNT
    ) throw new Error("Terminal-objective selected families are not unique");
    return eligible;
};

const main = async (): Promise<void> => {
    const repoRoot = gitRoot();
    const driverRoot = path.join(repoRoot, "packages", "chronodivide-bot-driver");
    if (path.resolve(process.cwd()) !== driverRoot) throw new Error(`Generator must start in ${driverRoot}`);
    if (!process.env.BASELINE_PACKAGE_ROOT || process.env.REQUIRE_EXTERNAL_BASELINE !== "true") {
        throw new Error("Generation requires the pinned external baseline environment");
    }
    const supportedPopulationPath = requiredPath("TERMINAL_OBJECTIVE_SUPPORTED_POPULATION");
    const equivalenceGatePath = requiredPath("TERMINAL_OBJECTIVE_EQUIVALENCE_GATE");
    const smokeGatePath = requiredPath("TERMINAL_OBJECTIVE_SMOKE_GATE");
    const replacementFailureAuditPath = requiredPath("TERMINAL_OBJECTIVE_REPLACEMENT_FAILURE_AUDIT");
    const replacementProtocolPath = requiredPath("TERMINAL_OBJECTIVE_REPLACEMENT_PROTOCOL");
    const buildingFirstFailureAuditPath = requiredPath("TERMINAL_OBJECTIVE_BUILDING_FIRST_FAILURE_AUDIT");
    const buildingFirstAmendmentPath = requiredPath("TERMINAL_OBJECTIVE_BUILDING_FIRST_AMENDMENT");
    const outRoot = requiredPath("OUT_ROOT");
    if (fs.existsSync(outRoot)) throw new Error(`Refusing to reuse OUT_ROOT ${outRoot}`);
    for (const [filePath, digest, label] of [
        [supportedPopulationPath, TERMINAL_OBJECTIVE_SUPPORTED_POPULATION_SHA256, "population"],
        [equivalenceGatePath, TERMINAL_OBJECTIVE_EQUIVALENCE_SHA256, "equivalence"],
        [smokeGatePath, TERMINAL_OBJECTIVE_SMOKE_SHA256, "smoke"],
        [replacementFailureAuditPath, TERMINAL_OBJECTIVE_REPLACEMENT_FAILURE_AUDIT_SHA256, "replacement failure audit"],
        [replacementProtocolPath, TERMINAL_OBJECTIVE_REPLACEMENT_PROTOCOL_SHA256, "replacement protocol"],
        [buildingFirstFailureAuditPath, TERMINAL_OBJECTIVE_BUILDING_FIRST_FAILURE_AUDIT_SHA256,
            "building-first failure audit"],
        [buildingFirstAmendmentPath, TERMINAL_OBJECTIVE_BUILDING_FIRST_AMENDMENT_SHA256,
            "building-first amendment"],
    ] as const) if (sha256File(filePath) !== digest) throw new Error(`Terminal-objective ${label} commitment drifted`);
    const corePath = path.join(repoRoot, "packages", "chronodivide-bot", "src", "bot", "logic", "objective", "terminalObjectiveDecisionCore.ts");
    const adapterPath = path.join(repoRoot, "packages", "chronodivide-bot", "src", "bot", "logic", "objective", "objectiveMechanicsAdapter.ts");
    if (sha256File(corePath) !== TERMINAL_OBJECTIVE_CORE_SHA256 || sha256File(adapterPath) !== TERMINAL_OBJECTIVE_ADAPTER_SHA256) {
        throw new Error("Terminal-objective exact decision core or mechanics adapter commitment drifted");
    }
    const equivalence = JSON.parse(fs.readFileSync(equivalenceGatePath, "utf8")) as RecordValue;
    const smoke = JSON.parse(fs.readFileSync(smokeGatePath, "utf8")) as RecordValue;
    const replacementFailureAudit = JSON.parse(fs.readFileSync(replacementFailureAuditPath, "utf8")) as RecordValue;
    const buildingFirstFailureAudit = JSON.parse(fs.readFileSync(buildingFirstFailureAuditPath, "utf8")) as RecordValue;
    if (
        equivalence.status !== "PASS_OUTCOME_FREE_TERMINAL_OBJECTIVE_EXTERNAL_BASELINE_IDENTITY" ||
        equivalence.outcomeFree !== true || equivalence.gameCount !== 36 ||
        smoke.status !== "PASS_OUTCOME_FREE_TERMINAL_OBJECTIVE_ALL_COUNTRY_LIVE_BRIDGE_SMOKE" ||
        smoke.outcomeFree !== true || smoke.gameCount !== 18 ||
        replacementFailureAudit.status !== "INVALIDATED_COMPLETE_CAMPAIGN_RUNTIME_COMMITMENT_DRIFT" ||
        replacementFailureAudit.arrayJobId !== "22119584" || replacementFailureAudit.controllerJobId !== "22119585" ||
        !isRecord(replacementFailureAudit.repair) || replacementFailureAudit.repair.reuseAccepted !== false ||
        replacementFailureAudit.repair.selectiveRerunAllowed !== false ||
        replacementFailureAudit.repair.restoredRuntimeExactlyMatchesOriginalPlan !== true ||
        buildingFirstFailureAudit.status !== "INVALIDATED_COMPLETE_CAMPAIGN_BUILDING_FIRST_ENDPOINT_MISMATCH" ||
        buildingFirstFailureAudit.arrayJobId !== "22125520" ||
        buildingFirstFailureAudit.controllerJobId !== "22125521" ||
        !isRecord(buildingFirstFailureAudit.artifacts) ||
        buildingFirstFailureAudit.artifacts.episodeCompleteEvents !== 0 ||
        !isRecord(buildingFirstFailureAudit.outcomes) ||
        buildingFirstFailureAudit.outcomes.outcomeInspected !== false ||
        !isRecord(buildingFirstFailureAudit.repair) || buildingFirstFailureAudit.repair.reuseAccepted !== false ||
        buildingFirstFailureAudit.repair.selectiveRerunAllowed !== false ||
        buildingFirstFailureAudit.repair.rerunOutcomeFreeTechnicalGates !== true
    ) throw new Error("Terminal-objective outcome-free technical gates do not authorize generation");

    const supportedPopulation = JSON.parse(fs.readFileSync(supportedPopulationPath, "utf8")) as unknown;
    const families = selectTerminalObjectiveFamilies(supportedPopulation, repoRoot);
    const arms = buildTerminalObjectiveArms();
    const baselineFactory = await loadBaselineFactory(path.join(repoRoot, "packages", "chronodivide-bot"));
    const generationManifest = createExperimentManifest({
        runId: "plan-terminal-objective-open-development-replacement-v1",
        mixDir: path.join(driverRoot, "data"),
        maps: families.map(({ mapName }) => mapName),
        effectiveConfig: {
            purpose: "terminal-objective-open-development-literal-endpoint-v5",
            outcomeAccess: false,
            countries: TERMINAL_OBJECTIVE_COUNTRIES,
            reciprocalSlots: [0, 1],
            seedBlocksPerFamily: TERMINAL_OBJECTIVE_SEED_BLOCKS_PER_FAMILY,
            arms,
            maxTicks: TERMINAL_OBJECTIVE_MAX_TICKS,
            replacesArrayJobIds: ["22119584", "22125520"],
            priorCampaignReuse: "none_complete_building_first_fresh_seed_replacement",
        },
        baseline: baselineFactory.descriptor,
        gameSeedBase: TERMINAL_OBJECTIVE_ENGINE_SEED_BASE,
    });
    const baseline = generationManifest.software.baseline;
    if (
        generationManifest.source.gitBranch !== "main" || generationManifest.source.trackedDirty !== false ||
        !generationManifest.source.gitCommit || baseline.kind !== "external-package" ||
        baseline.trackedDirty !== false || !baseline.gitCommit || !baseline.runtimeTree.sha256 ||
        !generationManifest.software.gameApiRuntimeTree.sha256 ||
        !generationManifest.software.packageLockSha256 || generationManifest.inputs.maps.some((map) => !map.exists)
    ) throw new Error("Terminal-objective generation lacks clean source, baseline, API, or maps");

    fs.mkdirSync(path.dirname(outRoot), { recursive: true, mode: 0o700 });
    fs.mkdirSync(outRoot, { recursive: false, mode: 0o700 });
    const plansRoot = path.join(outRoot, "plans");
    fs.mkdirSync(plansRoot, { mode: 0o700 });
    const shards: TerminalObjectiveCampaign["shards"] = [];
    const sourceRuntimeSha256 = runtimeCommitment(generationManifest.source.runtimeTrees);
    for (let familyIndex = 0; familyIndex < families.length; familyIndex += 1) {
        for (let familySeedIndex = 0; familySeedIndex < TERMINAL_OBJECTIVE_SEED_BLOCKS_PER_FAMILY; familySeedIndex += 1) {
            for (let countryIndex = 0; countryIndex < TERMINAL_OBJECTIVE_COUNTRIES.length; countryIndex += 1) {
                const family = families[familyIndex];
                const country = TERMINAL_OBJECTIVE_COUNTRIES[countryIndex];
                const shardIndex = (familyIndex * TERMINAL_OBJECTIVE_SEED_BLOCKS_PER_FAMILY + familySeedIndex) *
                    TERMINAL_OBJECTIVE_COUNTRIES.length + countryIndex;
                const seedBlockIndex = shardIndex;
                const requestedEngineSeed = derivePairedEngineSeed(TERMINAL_OBJECTIVE_ENGINE_SEED_BASE, seedBlockIndex);
                const runId = `terminal-building-first-v1-f${familyIndex}-b${familySeedIndex}-c${countryIndex}-${generationManifest.source.gitCommit.slice(0, 10)}`;
                const plan: TerminalObjectiveRunPlan = parseTerminalObjectiveRunPlan({
                    schemaVersion: TERMINAL_OBJECTIVE_PLAN_SCHEMA_VERSION,
                    kind: TERMINAL_OBJECTIVE_PLAN_KIND,
                    runId,
                    sourceGitCommit: generationManifest.source.gitCommit,
                    sourceRuntimeSha256,
                    baselineGitCommit: baseline.gitCommit,
                    baselineRuntimeSha256: baseline.runtimeTree.sha256,
                    gameApiRuntimeSha256: generationManifest.software.gameApiRuntimeTree.sha256,
                    packageLockSha256: generationManifest.software.packageLockSha256,
                    sourcePopulationCommitmentSha256: TERMINAL_OBJECTIVE_SUPPORTED_POPULATION_SHA256,
                    endpointVersion: LITERAL_BUILDING_ELIMINATION_ENDPOINT_VERSION,
                    endpointSha256: LITERAL_BUILDING_ELIMINATION_ENDPOINT_SHA256,
                    family: {
                        familyId: family.familyId,
                        mapName: family.mapName,
                        mapSha256: family.mapSha256,
                    },
                    country,
                    engineSeedBase: TERMINAL_OBJECTIVE_ENGINE_SEED_BASE,
                    seedBlockIndex,
                    requestedEngineSeed,
                    maxTicks: TERMINAL_OBJECTIVE_MAX_TICKS,
                    arms,
                    episodes: buildTerminalObjectiveEpisodes(arms),
                });
                const planFile = path.join(plansRoot, `shard-${String(shardIndex).padStart(3, "0")}.json`);
                fs.writeFileSync(planFile, serializeTerminalObjectiveRunPlan(plan), { flag: "wx", mode: 0o600 });
                shards.push({
                    shardIndex,
                    planFile,
                    planSha256: sha256File(planFile),
                    runId,
                    familyId: family.familyId,
                    mapName: family.mapName,
                    mapSha256: family.mapSha256,
                    country,
                    familySeedIndex,
                    seedBlockIndex,
                    requestedEngineSeed,
                    launchedGameCount: plan.episodes.length,
                });
            }
        }
    }
    const campaign: TerminalObjectiveCampaign = {
        schemaVersion: 2,
        kind: "terminal-objective-open-development-literal-endpoint",
        status: "FROZEN_TERMINAL_OBJECTIVE_BUILDING_FIRST_OPEN_DEVELOPMENT_ENDPOINT_V5",
        generatedAt: new Date().toISOString(),
        sourceGitCommit: generationManifest.source.gitCommit,
        sourceRuntimeSha256,
        baselineGitCommit: baseline.gitCommit,
        baselineRuntimeSha256: baseline.runtimeTree.sha256,
        gameApiRuntimeSha256: generationManifest.software.gameApiRuntimeTree.sha256,
        packageLockSha256: generationManifest.software.packageLockSha256,
        supportedPopulationPath,
        supportedPopulationSha256: TERMINAL_OBJECTIVE_SUPPORTED_POPULATION_SHA256,
        sourcePopulationCommitmentSha256: TERMINAL_OBJECTIVE_SUPPORTED_POPULATION_SHA256,
        familySelectionRule: "lowest-sha256-terminal-objective-open-development-v1-family-id-map-sha",
        outcomeFreePopulationSelection: true,
        endpointVersion: LITERAL_BUILDING_ELIMINATION_ENDPOINT_VERSION,
        endpointSha256: LITERAL_BUILDING_ELIMINATION_ENDPOINT_SHA256,
        coreSha256: TERMINAL_OBJECTIVE_CORE_SHA256,
        adapterSha256: TERMINAL_OBJECTIVE_ADAPTER_SHA256,
        equivalenceGatePath,
        equivalenceGateSha256: TERMINAL_OBJECTIVE_EQUIVALENCE_SHA256,
        smokeGatePath,
        smokeGateSha256: TERMINAL_OBJECTIVE_SMOKE_SHA256,
        replacesArrayJobId: "22119584",
        replacesControllerJobId: "22119585",
        replacementFailureAuditPath,
        replacementFailureAuditSha256: TERMINAL_OBJECTIVE_REPLACEMENT_FAILURE_AUDIT_SHA256,
        replacementProtocolPath,
        replacementProtocolSha256: TERMINAL_OBJECTIVE_REPLACEMENT_PROTOCOL_SHA256,
        buildingFirstReplacesArrayJobId: "22125520",
        buildingFirstReplacesControllerJobId: "22125521",
        buildingFirstFailureAuditPath,
        buildingFirstFailureAuditSha256: TERMINAL_OBJECTIVE_BUILDING_FIRST_FAILURE_AUDIT_SHA256,
        buildingFirstAmendmentPath,
        buildingFirstAmendmentSha256: TERMINAL_OBJECTIVE_BUILDING_FIRST_AMENDMENT_SHA256,
        priorCampaignReuse: "none_complete_building_first_fresh_seed_replacement",
        outcomeAccess: "open-development-only-no-paper-claim",
        familyCount: families.length,
        seedBlocksPerFamily: TERMINAL_OBJECTIVE_SEED_BLOCKS_PER_FAMILY,
        countryCount: TERMINAL_OBJECTIVE_COUNTRIES.length,
        reciprocalSlotCount: 2,
        policyCount: arms.length,
        shardCount: shards.length,
        launchedGameCount: shards.length * arms.length * 2,
        engineSeedBase: TERMINAL_OBJECTIVE_ENGINE_SEED_BASE,
        maxTicks: TERMINAL_OBJECTIVE_MAX_TICKS,
        countries: TERMINAL_OBJECTIVE_COUNTRIES,
        advancementRule: TERMINAL_OBJECTIVE_ADVANCEMENT_RULE,
        confidenceInterval: {
            unit: "family",
            familyCount: TERMINAL_OBJECTIVE_FAMILY_COUNT,
            method: "student-t-lower-bound-on-family-means",
            sidedness: "one-sided",
            confidenceLevel: 0.8,
            degreesOfFreedom: 9,
            criticalValue: TERMINAL_OBJECTIVE_ONE_SIDED_80_T_CRITICAL_DF9,
        },
        arms,
        selectedFamilies: families,
        shards,
    };
    if (
        campaign.shardCount !== TERMINAL_OBJECTIVE_SHARD_COUNT ||
        campaign.launchedGameCount !== TERMINAL_OBJECTIVE_LAUNCH_COUNT
    ) throw new Error("Terminal-objective launch count drifted");
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
