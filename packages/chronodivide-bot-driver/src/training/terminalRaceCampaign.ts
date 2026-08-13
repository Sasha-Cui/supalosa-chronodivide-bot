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
    TERMINAL_RACE_ARM_ORDER,
    TerminalRaceArm,
    buildTerminalRaceArms,
} from "./terminalRacePolicy.js";
import {
    TERMINAL_RACE_PLAN_KIND,
    TERMINAL_RACE_PLAN_SCHEMA_VERSION,
    TerminalRacePlanEpisode,
    TerminalRaceRunPlan,
    parseTerminalRaceRunPlan,
    serializeTerminalRaceRunPlan,
    sha256File,
} from "./terminalRacePlanRunner.js";

export const TERMINAL_RACE_ENGINE_SEED_BASE = 4_150_000_000 as const;
export const TERMINAL_RACE_MAX_TICKS = 24_000 as const;
export const TERMINAL_RACE_FAMILY_COUNT = 10 as const;
export const TERMINAL_RACE_SEED_BLOCKS_PER_FAMILY = 1 as const;
export const TERMINAL_RACE_SUPPORTED_POPULATION_SHA256 =
    "80012d84a9897c90fa54acf7971cdb66551b842cd072f33ecec9f6c6f9b10084" as const;
export const TERMINAL_RACE_SOURCE_CAMPAIGN_SHA256 =
    "ea53ebad3590553840b56eb58d805925cb47c9920d69966cd9c3e2385704a02a" as const;
export const TERMINAL_RACE_CORE_SHA256 =
    "03238e35095bbf9b74e336599f922ae64a11958d0da5b27859c791401d719f62" as const;
export const TERMINAL_RACE_ADAPTER_SHA256 =
    "a39cdb70571de40f72a3aae251eb1e8610c94b76ca7125790f9e0ee488ad52fc" as const;
export const TERMINAL_RACE_PROTOCOL_SHA256 =
    "700ddd24d7c19cca70a15902164a26eee9140c8fd2d7bb49e8e658da3dd9a1be" as const;
export const TERMINAL_RACE_EQUIVALENCE_SHA256 =
    "244ee006659f9a95610df0ff70e9bfa7093c0b9cc187c7d5aafe216a87b97837" as const;
export const TERMINAL_RACE_SMOKE_SHA256 =
    "95b0d1cac6934adec311471be626086f65a04f406797092da992834d37984594" as const;
export const TERMINAL_RACE_ONE_SIDED_80_T_CRITICAL_DF9 = 0.8834038596855205 as const;

export const TERMINAL_RACE_COUNTRIES = [
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

export const TERMINAL_RACE_SHARD_COUNT =
    TERMINAL_RACE_FAMILY_COUNT * TERMINAL_RACE_SEED_BLOCKS_PER_FAMILY * TERMINAL_RACE_COUNTRIES.length;
export const TERMINAL_RACE_LAUNCH_COUNT =
    TERMINAL_RACE_SHARD_COUNT * TERMINAL_RACE_ARM_ORDER.length * 2;

export const TERMINAL_RACE_ADVANCEMENT_RULE = [
    "one-sided family-clustered 80% lower confidence bound for the ranked arm literal-win probability above 0.50",
    "ranked arm literal wins exceed losses overall",
    "ranked arm pooled Allied and Soviet literal-win probabilities each exceed 0.50",
    "ranked arm literal wins exceed losses in at least seven of nine countries",
    "family-macro paired literal-win effect over baseline_control is positive",
    "all 1,080 launches are technically and information-boundary clean under literal endpoint v5",
] as const;

export type TerminalRaceFamily = {
    familyId: string;
    mapName: string;
    mapSha256: string;
    selectionDigest: string;
};

export type TerminalRaceCampaign = {
    schemaVersion: 1;
    kind: "terminal-race-open-development-literal-endpoint";
    status: "FROZEN_TERMINAL_RACE_OPEN_DEVELOPMENT_ENDPOINT_V5";
    generatedAt: string;
    sourceGitCommit: string;
    sourceRuntimeSha256: string;
    baselineGitCommit: string;
    baselineRuntimeSha256: string;
    gameApiRuntimeSha256: string;
    packageLockSha256: string;
    supportedPopulationPath: string;
    supportedPopulationSha256: typeof TERMINAL_RACE_SUPPORTED_POPULATION_SHA256;
    sourcePopulationCommitmentSha256: typeof TERMINAL_RACE_SUPPORTED_POPULATION_SHA256;
    sourceCampaignPath: string;
    sourceCampaignSha256: typeof TERMINAL_RACE_SOURCE_CAMPAIGN_SHA256;
    familySelectionRule: "exact-ten-families-from-completed-building-first-campaign";
    outcomeFreePopulationSelection: true;
    endpointVersion: typeof LITERAL_BUILDING_ELIMINATION_ENDPOINT_VERSION;
    endpointSha256: typeof LITERAL_BUILDING_ELIMINATION_ENDPOINT_SHA256;
    coreSha256: typeof TERMINAL_RACE_CORE_SHA256;
    adapterSha256: typeof TERMINAL_RACE_ADAPTER_SHA256;
    protocolPath: string;
    protocolSha256: typeof TERMINAL_RACE_PROTOCOL_SHA256;
    equivalenceGatePath: string;
    equivalenceGateSha256: typeof TERMINAL_RACE_EQUIVALENCE_SHA256;
    equivalenceJobId: "22136495";
    smokeGatePath: string;
    smokeGateSha256: typeof TERMINAL_RACE_SMOKE_SHA256;
    smokeJobId: "22136496";
    priorCampaignReuse: "families_only_no_seeds_no_games_no_outcomes";
    outcomeAccess: "open-development-only-no-paper-claim";
    familyCount: number;
    seedBlocksPerFamily: number;
    countryCount: number;
    reciprocalSlotCount: 2;
    policyCount: number;
    shardCount: number;
    launchedGameCount: number;
    engineSeedBase: typeof TERMINAL_RACE_ENGINE_SEED_BASE;
    maxTicks: typeof TERMINAL_RACE_MAX_TICKS;
    countries: readonly Countries[];
    advancementRule: readonly string[];
    confidenceInterval: {
        unit: "family";
        familyCount: typeof TERMINAL_RACE_FAMILY_COUNT;
        method: "student-t-lower-bound-on-family-means";
        sidedness: "one-sided";
        confidenceLevel: 0.8;
        degreesOfFreedom: 9;
        criticalValue: typeof TERMINAL_RACE_ONE_SIDED_80_T_CRITICAL_DF9;
    };
    arms: TerminalRaceArm[];
    selectedFamilies: TerminalRaceFamily[];
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

export const buildTerminalRaceEpisodes = (arms: TerminalRaceArm[]): TerminalRacePlanEpisode[] =>
    arms.flatMap((arm, armIndex) => ([0, 1] as const).map((candidateSlot) => ({
        episodeId: `a${armIndex}-s${candidateSlot}`,
        armId: arm.armId,
        policyId: arm.policyId,
        candidateSlot,
    })));

export const selectTerminalRaceFamilies = (
    supportedPopulation: unknown,
    sourceCampaign: unknown,
    repoRoot: string,
): TerminalRaceFamily[] => {
    if (
        !isRecord(supportedPopulation) || supportedPopulation.schemaVersion !== 1 ||
        supportedPopulation.status !== "FROZEN_METHOD_V6_OPEN_TRAINING_ECONOMIC_START_SUPPORTED_POPULATION" ||
        supportedPopulation.outcomeFree !== true || !Array.isArray(supportedPopulation.supportedFamilies)
    ) throw new Error("Terminal-race supported-population input is invalid");
    if (
        !isRecord(sourceCampaign) || sourceCampaign.schemaVersion !== 2 ||
        sourceCampaign.status !== "FROZEN_TERMINAL_OBJECTIVE_BUILDING_FIRST_OPEN_DEVELOPMENT_ENDPOINT_V5" ||
        sourceCampaign.sourcePopulationCommitmentSha256 !== TERMINAL_RACE_SUPPORTED_POPULATION_SHA256 ||
        !Array.isArray(sourceCampaign.selectedFamilies) || sourceCampaign.selectedFamilies.length !== 10
    ) throw new Error("Terminal-race source campaign is invalid");
    const supported = new Map((supportedPopulation.supportedFamilies as unknown[]).map((raw) => {
        if (!isRecord(raw) || typeof raw.familyId !== "string" || typeof raw.mapSha256 !== "string") {
            throw new Error("Terminal-race supported family is malformed");
        }
        return [raw.familyId, raw.mapSha256];
    }));
    const families = (sourceCampaign.selectedFamilies as unknown[]).map((raw, index): TerminalRaceFamily => {
        if (
            !isRecord(raw) || typeof raw.familyId !== "string" || typeof raw.mapName !== "string" ||
            path.basename(raw.mapName) !== raw.mapName || typeof raw.mapSha256 !== "string" ||
            !/^[0-9a-f]{64}$/.test(raw.mapSha256) || supported.get(raw.familyId) !== raw.mapSha256
        ) throw new Error(`Terminal-race source family ${index} is malformed or unsupported`);
        const mapPath = path.join(repoRoot, "packages", "chronodivide-bot-driver", "data", raw.mapName);
        if (!fs.existsSync(mapPath) || sha256File(mapPath) !== raw.mapSha256) {
            throw new Error(`Terminal-race family ${raw.familyId} lacks exact committed map bytes`);
        }
        return {
            familyId: raw.familyId,
            mapName: raw.mapName,
            mapSha256: raw.mapSha256,
            selectionDigest: sha256Text(`terminal-race-open-development-v1|${raw.familyId}|${raw.mapSha256}`),
        };
    });
    if (
        new Set(families.map(({ familyId }) => familyId)).size !== TERMINAL_RACE_FAMILY_COUNT ||
        new Set(families.map(({ mapSha256 }) => mapSha256)).size !== TERMINAL_RACE_FAMILY_COUNT
    ) throw new Error("Terminal-race selected families are not unique");
    return families;
};

const main = async (): Promise<void> => {
    const repoRoot = gitRoot();
    const driverRoot = path.join(repoRoot, "packages", "chronodivide-bot-driver");
    if (path.resolve(process.cwd()) !== driverRoot) throw new Error(`Generator must start in ${driverRoot}`);
    if (!process.env.BASELINE_PACKAGE_ROOT || process.env.REQUIRE_EXTERNAL_BASELINE !== "true") {
        throw new Error("Generation requires the pinned external baseline environment");
    }
    const supportedPopulationPath = requiredPath("TERMINAL_RACE_SUPPORTED_POPULATION");
    const sourceCampaignPath = requiredPath("TERMINAL_RACE_SOURCE_CAMPAIGN");
    const protocolPath = requiredPath("TERMINAL_RACE_PROTOCOL");
    const equivalenceGatePath = requiredPath("TERMINAL_RACE_EQUIVALENCE_GATE");
    const smokeGatePath = requiredPath("TERMINAL_RACE_SMOKE_GATE");
    const outRoot = requiredPath("OUT_ROOT");
    if (fs.existsSync(outRoot)) throw new Error(`Refusing to reuse OUT_ROOT ${outRoot}`);
    for (const [filePath, digest, label] of [
        [supportedPopulationPath, TERMINAL_RACE_SUPPORTED_POPULATION_SHA256, "population"],
        [sourceCampaignPath, TERMINAL_RACE_SOURCE_CAMPAIGN_SHA256, "source campaign"],
        [protocolPath, TERMINAL_RACE_PROTOCOL_SHA256, "protocol"],
        [equivalenceGatePath, TERMINAL_RACE_EQUIVALENCE_SHA256, "equivalence"],
        [smokeGatePath, TERMINAL_RACE_SMOKE_SHA256, "smoke"],
    ] as const) if (sha256File(filePath) !== digest) throw new Error(`Terminal-race ${label} commitment drifted`);
    const corePath = path.join(
        repoRoot,
        "packages", "chronodivide-bot", "src", "bot", "logic", "objective", "terminalObjectiveDecisionCore.ts",
    );
    const adapterPath = path.join(
        repoRoot,
        "packages", "chronodivide-bot", "src", "bot", "logic", "objective", "objectiveMechanicsAdapter.ts",
    );
    if (sha256File(corePath) !== TERMINAL_RACE_CORE_SHA256 || sha256File(adapterPath) !== TERMINAL_RACE_ADAPTER_SHA256) {
        throw new Error("Terminal-race exact decision core or mechanics adapter commitment drifted");
    }
    const equivalence = JSON.parse(fs.readFileSync(equivalenceGatePath, "utf8")) as RecordValue;
    const smoke = JSON.parse(fs.readFileSync(smokeGatePath, "utf8")) as RecordValue;
    if (
        equivalence.status !== "PASS_OUTCOME_FREE_TERMINAL_RACE_EXTERNAL_BASELINE_IDENTITY" ||
        equivalence.outcomeFree !== true || equivalence.gameCount !== 36 ||
        !isRecord(equivalence.scheduler) || equivalence.scheduler.jobId !== "22136495" ||
        equivalence.scheduler.account !== "pi_jss233" ||
        smoke.status !== "PASS_OUTCOME_FREE_TERMINAL_RACE_ALL_COUNTRY_LIVE_BRIDGE_SMOKE" ||
        smoke.outcomeFree !== true || smoke.gameCount !== 90 || smoke.enabledArmCount !== 5 ||
        !isRecord(smoke.scheduler) || smoke.scheduler.jobId !== "22136496" || smoke.scheduler.account !== "pi_jss233"
    ) throw new Error("Terminal-race outcome-free technical gates do not authorize generation");

    const supportedPopulation = JSON.parse(fs.readFileSync(supportedPopulationPath, "utf8")) as unknown;
    const sourceCampaign = JSON.parse(fs.readFileSync(sourceCampaignPath, "utf8")) as unknown;
    const families = selectTerminalRaceFamilies(supportedPopulation, sourceCampaign, repoRoot);
    const arms = buildTerminalRaceArms();
    const baselineFactory = await loadBaselineFactory(path.join(repoRoot, "packages", "chronodivide-bot"));
    const generationManifest = createExperimentManifest({
        runId: "plan-terminal-race-open-development-v1",
        mixDir: path.join(driverRoot, "data"),
        maps: families.map(({ mapName }) => mapName),
        effectiveConfig: {
            purpose: "terminal-race-open-development-literal-endpoint-v5",
            outcomeAccess: false,
            countries: TERMINAL_RACE_COUNTRIES,
            reciprocalSlots: [0, 1],
            seedBlocksPerFamily: TERMINAL_RACE_SEED_BLOCKS_PER_FAMILY,
            arms,
            maxTicks: TERMINAL_RACE_MAX_TICKS,
            sourceCampaignSha256: TERMINAL_RACE_SOURCE_CAMPAIGN_SHA256,
            priorCampaignReuse: "families_only_no_seeds_no_games_no_outcomes",
        },
        baseline: baselineFactory.descriptor,
        gameSeedBase: TERMINAL_RACE_ENGINE_SEED_BASE,
    });
    const baseline = generationManifest.software.baseline;
    if (
        generationManifest.source.gitBranch !== "main" || generationManifest.source.trackedDirty !== false ||
        !generationManifest.source.gitCommit || baseline.kind !== "external-package" ||
        baseline.trackedDirty !== false || !baseline.gitCommit || !baseline.runtimeTree.sha256 ||
        !generationManifest.software.gameApiRuntimeTree.sha256 ||
        !generationManifest.software.packageLockSha256 || generationManifest.inputs.maps.some((map) => !map.exists)
    ) throw new Error("Terminal-race generation lacks clean source, baseline, API, or maps");

    fs.mkdirSync(path.dirname(outRoot), { recursive: true, mode: 0o700 });
    fs.mkdirSync(outRoot, { recursive: false, mode: 0o700 });
    const plansRoot = path.join(outRoot, "plans");
    fs.mkdirSync(plansRoot, { mode: 0o700 });
    const shards: TerminalRaceCampaign["shards"] = [];
    const sourceRuntimeSha256 = runtimeCommitment(generationManifest.source.runtimeTrees);
    for (let familyIndex = 0; familyIndex < families.length; familyIndex += 1) {
        for (let countryIndex = 0; countryIndex < TERMINAL_RACE_COUNTRIES.length; countryIndex += 1) {
            const family = families[familyIndex];
            const country = TERMINAL_RACE_COUNTRIES[countryIndex];
            const shardIndex = familyIndex * TERMINAL_RACE_COUNTRIES.length + countryIndex;
            const seedBlockIndex = shardIndex;
            const requestedEngineSeed = derivePairedEngineSeed(TERMINAL_RACE_ENGINE_SEED_BASE, seedBlockIndex);
            const runId = `terminal-race-v1-f${familyIndex}-c${countryIndex}-${generationManifest.source.gitCommit.slice(0, 10)}`;
            const plan: TerminalRaceRunPlan = parseTerminalRaceRunPlan({
                schemaVersion: TERMINAL_RACE_PLAN_SCHEMA_VERSION,
                kind: TERMINAL_RACE_PLAN_KIND,
                runId,
                sourceGitCommit: generationManifest.source.gitCommit,
                sourceRuntimeSha256,
                baselineGitCommit: baseline.gitCommit,
                baselineRuntimeSha256: baseline.runtimeTree.sha256,
                gameApiRuntimeSha256: generationManifest.software.gameApiRuntimeTree.sha256,
                packageLockSha256: generationManifest.software.packageLockSha256,
                sourcePopulationCommitmentSha256: TERMINAL_RACE_SUPPORTED_POPULATION_SHA256,
                endpointVersion: LITERAL_BUILDING_ELIMINATION_ENDPOINT_VERSION,
                endpointSha256: LITERAL_BUILDING_ELIMINATION_ENDPOINT_SHA256,
                family: {
                    familyId: family.familyId,
                    mapName: family.mapName,
                    mapSha256: family.mapSha256,
                },
                country,
                engineSeedBase: TERMINAL_RACE_ENGINE_SEED_BASE,
                seedBlockIndex,
                requestedEngineSeed,
                maxTicks: TERMINAL_RACE_MAX_TICKS,
                arms,
                episodes: buildTerminalRaceEpisodes(arms),
            });
            const planFile = path.join(plansRoot, `shard-${String(shardIndex).padStart(3, "0")}.json`);
            fs.writeFileSync(planFile, serializeTerminalRaceRunPlan(plan), { flag: "wx", mode: 0o600 });
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
    const campaign: TerminalRaceCampaign = {
        schemaVersion: 1,
        kind: "terminal-race-open-development-literal-endpoint",
        status: "FROZEN_TERMINAL_RACE_OPEN_DEVELOPMENT_ENDPOINT_V5",
        generatedAt: new Date().toISOString(),
        sourceGitCommit: generationManifest.source.gitCommit,
        sourceRuntimeSha256,
        baselineGitCommit: baseline.gitCommit,
        baselineRuntimeSha256: baseline.runtimeTree.sha256,
        gameApiRuntimeSha256: generationManifest.software.gameApiRuntimeTree.sha256,
        packageLockSha256: generationManifest.software.packageLockSha256,
        supportedPopulationPath,
        supportedPopulationSha256: TERMINAL_RACE_SUPPORTED_POPULATION_SHA256,
        sourcePopulationCommitmentSha256: TERMINAL_RACE_SUPPORTED_POPULATION_SHA256,
        sourceCampaignPath,
        sourceCampaignSha256: TERMINAL_RACE_SOURCE_CAMPAIGN_SHA256,
        familySelectionRule: "exact-ten-families-from-completed-building-first-campaign",
        outcomeFreePopulationSelection: true,
        endpointVersion: LITERAL_BUILDING_ELIMINATION_ENDPOINT_VERSION,
        endpointSha256: LITERAL_BUILDING_ELIMINATION_ENDPOINT_SHA256,
        coreSha256: TERMINAL_RACE_CORE_SHA256,
        adapterSha256: TERMINAL_RACE_ADAPTER_SHA256,
        protocolPath,
        protocolSha256: TERMINAL_RACE_PROTOCOL_SHA256,
        equivalenceGatePath,
        equivalenceGateSha256: TERMINAL_RACE_EQUIVALENCE_SHA256,
        equivalenceJobId: "22136495",
        smokeGatePath,
        smokeGateSha256: TERMINAL_RACE_SMOKE_SHA256,
        smokeJobId: "22136496",
        priorCampaignReuse: "families_only_no_seeds_no_games_no_outcomes",
        outcomeAccess: "open-development-only-no-paper-claim",
        familyCount: families.length,
        seedBlocksPerFamily: TERMINAL_RACE_SEED_BLOCKS_PER_FAMILY,
        countryCount: TERMINAL_RACE_COUNTRIES.length,
        reciprocalSlotCount: 2,
        policyCount: arms.length,
        shardCount: shards.length,
        launchedGameCount: shards.length * arms.length * 2,
        engineSeedBase: TERMINAL_RACE_ENGINE_SEED_BASE,
        maxTicks: TERMINAL_RACE_MAX_TICKS,
        countries: TERMINAL_RACE_COUNTRIES,
        advancementRule: TERMINAL_RACE_ADVANCEMENT_RULE,
        confidenceInterval: {
            unit: "family",
            familyCount: TERMINAL_RACE_FAMILY_COUNT,
            method: "student-t-lower-bound-on-family-means",
            sidedness: "one-sided",
            confidenceLevel: 0.8,
            degreesOfFreedom: 9,
            criticalValue: TERMINAL_RACE_ONE_SIDED_80_T_CRITICAL_DF9,
        },
        arms,
        selectedFamilies: families,
        shards,
    };
    if (
        campaign.shardCount !== TERMINAL_RACE_SHARD_COUNT ||
        campaign.launchedGameCount !== TERMINAL_RACE_LAUNCH_COUNT
    ) throw new Error("Terminal-race launch count drifted");
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
