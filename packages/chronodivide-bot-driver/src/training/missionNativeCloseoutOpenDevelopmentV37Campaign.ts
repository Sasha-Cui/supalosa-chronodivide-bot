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
    MISSION_NATIVE_CLOSEOUT_ARM_ORDER_V2,
    MissionNativeCloseoutArm,
    buildMissionNativeCloseoutArmsV2,
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

export const MISSION_NATIVE_CLOSEOUT_V37_OPEN_DEVELOPMENT_ENGINE_SEED_BASE = 4_205_000_000 as const;
export const MISSION_NATIVE_CLOSEOUT_V37_OPEN_DEVELOPMENT_MAX_TICKS = 24_000 as const;
export const MISSION_NATIVE_CLOSEOUT_V37_OPEN_DEVELOPMENT_FAMILY_COUNT = 10 as const;
export const MISSION_NATIVE_CLOSEOUT_V37_OPEN_DEVELOPMENT_PROTOCOL_SHA256 =
    "81e67e49ea4806fe32c20c643f1fe3afba92dfc46fc29c9a822911f4696d355b" as const;
export const MISSION_NATIVE_CLOSEOUT_V37_R2_GATE_SHA256 =
    "ef9ca94b22fcdb1f7a3bb787413a06f197d8805c32177d93f96a0b94d884067b" as const;
export const MISSION_NATIVE_CLOSEOUT_V37_C1_GATE_SHA256 =
    "e6b65b4ce05f5d592eb7c885dadcfa49b476e265c2fe315f89a030a3d8ead091" as const;
export const MISSION_NATIVE_CLOSEOUT_V37_OPEN_DEVELOPMENT_BASELINE_COMMIT =
    "165b77a71d0cf5ebd27c65b19d0486bcbae78d0f" as const;
export const MISSION_NATIVE_CLOSEOUT_V37_ONE_SIDED_80_T_CRITICAL_DF9 = 0.8834038596855205 as const;

export const MISSION_NATIVE_CLOSEOUT_V37_OPEN_DEVELOPMENT_COUNTRIES = [
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

export type MissionNativeCloseoutV37OpenDevelopmentFamily = {
    familyId: string;
    mapName: string;
    mapSha256: string;
};

export const MISSION_NATIVE_CLOSEOUT_V37_OPEN_DEVELOPMENT_FAMILIES: readonly MissionNativeCloseoutV37OpenDevelopmentFamily[] = [
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
] as const;

export const MISSION_NATIVE_CLOSEOUT_V37_OPEN_DEVELOPMENT_SHARD_COUNT =
    MISSION_NATIVE_CLOSEOUT_V37_OPEN_DEVELOPMENT_FAMILY_COUNT *
    MISSION_NATIVE_CLOSEOUT_V37_OPEN_DEVELOPMENT_COUNTRIES.length;
export const MISSION_NATIVE_CLOSEOUT_V37_OPEN_DEVELOPMENT_LAUNCH_COUNT =
    MISSION_NATIVE_CLOSEOUT_V37_OPEN_DEVELOPMENT_SHARD_COUNT *
    MISSION_NATIVE_CLOSEOUT_ARM_ORDER_V2.length * 2;

export const MISSION_NATIVE_CLOSEOUT_V37_ADVANCEMENT_RULE = [
    "all 540 launches pass source, scheduler, endpoint, telemetry, and information-boundary validation",
    "one-sided family-clustered 80% lower confidence bound for V37 minus external literal score is above zero",
    "V37 literal wins exceed losses overall and within pooled Allied and Soviet factions",
    "V37 literal wins exceed losses in at least seven of nine countries",
    "family-macro V37 literal-win probability is above both external Supalosa and V34",
    "family-macro V37 draw probability is below both external Supalosa and V34",
    "every leave-one-family-out V37 minus external literal-score effect is positive",
] as const;

export type MissionNativeCloseoutV37OpenDevelopmentCampaign = {
    schemaVersion: 1;
    kind: "mission-native-closeout-v37-open-development-literal-endpoint";
    status: "FROZEN_MISSION_NATIVE_CLOSEOUT_V37_OPEN_DEVELOPMENT_V2_ENDPOINT_V5";
    generatedAt: string;
    sourceGitCommit: string;
    sourceRuntimeSha256: string;
    baselineGitCommit: string;
    baselineRuntimeSha256: string;
    gameApiRuntimeSha256: string;
    packageLockSha256: string;
    populationSha256: string;
    protocolPath: string;
    protocolSha256: typeof MISSION_NATIVE_CLOSEOUT_V37_OPEN_DEVELOPMENT_PROTOCOL_SHA256;
    technicalEvidence: Array<{
        role: "v37_literal_endpoint_interfaces" | "v37_all_country_compatibility";
        path: string;
        sha256: string;
        controllerJobId: "22284109" | "22287905";
        status: string;
        sourceGitCommit: string;
        artifactCommitmentSha256: string;
    }>;
    endpointVersion: typeof LITERAL_BUILDING_ELIMINATION_ENDPOINT_VERSION;
    endpointSha256: typeof LITERAL_BUILDING_ELIMINATION_ENDPOINT_SHA256;
    outcomeAccess: "permanently-open-development-only-no-paper-claim";
    familyCount: 10;
    countryCount: 9;
    reciprocalSlotCount: 2;
    policyCount: 3;
    shardCount: 90;
    launchedGameCount: 540;
    engineSeedBase: typeof MISSION_NATIVE_CLOSEOUT_V37_OPEN_DEVELOPMENT_ENGINE_SEED_BASE;
    maxTicks: typeof MISSION_NATIVE_CLOSEOUT_V37_OPEN_DEVELOPMENT_MAX_TICKS;
    countries: readonly Countries[];
    advancementRule: readonly string[];
    arms: MissionNativeCloseoutArm[];
    selectedFamilies: MissionNativeCloseoutV37OpenDevelopmentFamily[];
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

export const buildMissionNativeCloseoutV37OpenDevelopmentEpisodes = (
    arms: MissionNativeCloseoutArm[],
): MissionNativeCloseoutOpenDevelopmentPlanEpisode[] => arms.flatMap((arm, armIndex) =>
    ([0, 1] as const).map((candidateSlot) => ({
        episodeId: `a${armIndex}-s${candidateSlot}`,
        armId: arm.armId,
        policyId: arm.policyId,
        candidateSlot,
    })),
);

const validateEvidence = (
    filePath: string,
    role: MissionNativeCloseoutV37OpenDevelopmentCampaign["technicalEvidence"][number]["role"],
    expectedSha256: string,
    controllerJobId: "22284109" | "22287905",
    arrayJobId: "22284108" | "22287904",
    expectedStatus: string,
): MissionNativeCloseoutV37OpenDevelopmentCampaign["technicalEvidence"][number] => {
    if (sha256File(filePath) !== expectedSha256) throw new Error(`${role} evidence commitment drifted`);
    const value = JSON.parse(fs.readFileSync(filePath, "utf8")) as unknown;
    if (
        !isRecord(value) || value.status !== expectedStatus || value.passed !== true || value.outcomeFree !== true ||
        value.schedulerAccount !== "pi_jss233" || value.arrayJobId !== arrayJobId ||
        path.basename(path.dirname(filePath)) !== `controller-${controllerJobId}` ||
        !Array.isArray(value.schedulerJobIds) || value.schedulerJobIds.length !== 18 ||
        value.schedulerJobIds.some((jobId) => typeof jobId !== "string" || !/^\d+$/.test(jobId)) ||
        typeof value.sourceGitCommit !== "string" ||
        typeof value.artifactCommitmentSha256 !== "string" || value.outcomeFieldsEmitted === undefined ||
        !Array.isArray(value.outcomeFieldsEmitted) || value.outcomeFieldsEmitted.length !== 0
    ) throw new Error(`${role} evidence does not authorize open development`);
    return {
        role,
        path: filePath,
        sha256: expectedSha256,
        controllerJobId,
        status: expectedStatus,
        sourceGitCommit: value.sourceGitCommit,
        artifactCommitmentSha256: value.artifactCommitmentSha256,
    };
};

const main = async (): Promise<void> => {
    const repoRoot = gitRoot();
    const driverRoot = path.join(repoRoot, "packages", "chronodivide-bot-driver");
    if (path.resolve(process.cwd()) !== driverRoot) throw new Error(`Generator must start in ${driverRoot}`);
    if (!process.env.BASELINE_PACKAGE_ROOT || process.env.REQUIRE_EXTERNAL_BASELINE !== "true") {
        throw new Error("V37 open development requires the pinned external baseline environment");
    }
    const protocolPath = requiredPath("MISSION_NATIVE_CLOSEOUT_V37_PROTOCOL");
    const r2GatePath = requiredPath("MISSION_NATIVE_CLOSEOUT_V37_R2_GATE");
    const c1GatePath = requiredPath("MISSION_NATIVE_CLOSEOUT_V37_C1_GATE");
    const outRoot = requiredPath("OUT_ROOT");
    if (fs.existsSync(outRoot)) throw new Error(`Refusing to reuse OUT_ROOT ${outRoot}`);
    if (sha256File(protocolPath) !== MISSION_NATIVE_CLOSEOUT_V37_OPEN_DEVELOPMENT_PROTOCOL_SHA256) {
        throw new Error("V37 open-development protocol commitment drifted");
    }
    const technicalEvidence = [
        validateEvidence(
            r2GatePath,
            "v37_literal_endpoint_interfaces",
            MISSION_NATIVE_CLOSEOUT_V37_R2_GATE_SHA256,
            "22284109",
            "22284108",
            "PASS_OUTCOME_FREE_V37_R2_LITERAL_ENDPOINT_INTERFACES",
        ),
        validateEvidence(
            c1GatePath,
            "v37_all_country_compatibility",
            MISSION_NATIVE_CLOSEOUT_V37_C1_GATE_SHA256,
            "22287905",
            "22287904",
            "PASS_OUTCOME_FREE_V37_C1_ALL_COUNTRY_COMPATIBILITY",
        ),
    ];
    const families = MISSION_NATIVE_CLOSEOUT_V37_OPEN_DEVELOPMENT_FAMILIES.map((family) => ({ ...family }));
    if (
        families.length !== MISSION_NATIVE_CLOSEOUT_V37_OPEN_DEVELOPMENT_FAMILY_COUNT ||
        new Set(families.map(({ familyId }) => familyId)).size !== families.length ||
        new Set(families.map(({ mapSha256 }) => mapSha256)).size !== families.length
    ) throw new Error("V37 open-development family population drifted");
    for (const family of families) {
        const mapPath = path.join(driverRoot, "data", family.mapName);
        if (!fs.existsSync(mapPath) || sha256File(mapPath) !== family.mapSha256) {
            throw new Error(`V37 open-development map bytes drifted for ${family.familyId}`);
        }
    }
    const populationSha256 = sha256Text(JSON.stringify(families));
    const arms = buildMissionNativeCloseoutArmsV2();
    const baselineFactory = await loadBaselineFactory(path.join(repoRoot, "packages", "chronodivide-bot"));
    const generationManifest = createExperimentManifest({
        runId: "plan-mission-native-closeout-v37-open-development-v2",
        mixDir: path.join(driverRoot, "data"),
        maps: families.map(({ mapName }) => mapName),
        effectiveConfig: {
            purpose: "mission-native-closeout-v37-open-development-v2-literal-endpoint-v5",
            outcomeAccess: false,
            countries: MISSION_NATIVE_CLOSEOUT_V37_OPEN_DEVELOPMENT_COUNTRIES,
            reciprocalSlots: [0, 1],
            arms,
            maxTicks: MISSION_NATIVE_CLOSEOUT_V37_OPEN_DEVELOPMENT_MAX_TICKS,
            protocolSha256: MISSION_NATIVE_CLOSEOUT_V37_OPEN_DEVELOPMENT_PROTOCOL_SHA256,
            technicalEvidence,
        },
        baseline: baselineFactory.descriptor,
        gameSeedBase: MISSION_NATIVE_CLOSEOUT_V37_OPEN_DEVELOPMENT_ENGINE_SEED_BASE,
    });
    const baseline = generationManifest.software.baseline;
    const forkMain = execFileSync("git", ["rev-parse", "fork/main"], { encoding: "utf8" }).trim();
    if (
        generationManifest.source.gitBranch !== "main" || generationManifest.source.trackedDirty !== false ||
        !generationManifest.source.gitCommit || generationManifest.source.gitCommit !== forkMain ||
        baseline.kind !== "external-package" || baseline.trackedDirty !== false ||
        baseline.gitCommit !== MISSION_NATIVE_CLOSEOUT_V37_OPEN_DEVELOPMENT_BASELINE_COMMIT ||
        !baseline.runtimeTree.sha256 || !generationManifest.software.gameApiRuntimeTree.sha256 ||
        !generationManifest.software.packageLockSha256 || generationManifest.inputs.maps.some((map) => !map.exists)
    ) throw new Error("V37 generation lacks clean pushed source, baseline, API, lockfile, or maps");

    fs.mkdirSync(path.dirname(outRoot), { recursive: true, mode: 0o700 });
    fs.mkdirSync(outRoot, { recursive: false, mode: 0o700 });
    const plansRoot = path.join(outRoot, "plans");
    fs.mkdirSync(plansRoot, { mode: 0o700 });
    const sourceRuntimeSha256 = runtimeCommitment(generationManifest.source.runtimeTrees);
    const shards: MissionNativeCloseoutV37OpenDevelopmentCampaign["shards"] = [];
    for (let familyIndex = 0; familyIndex < families.length; familyIndex += 1) {
        for (let countryIndex = 0; countryIndex < MISSION_NATIVE_CLOSEOUT_V37_OPEN_DEVELOPMENT_COUNTRIES.length; countryIndex += 1) {
            const family = families[familyIndex];
            const country = MISSION_NATIVE_CLOSEOUT_V37_OPEN_DEVELOPMENT_COUNTRIES[countryIndex];
            const shardIndex = familyIndex * MISSION_NATIVE_CLOSEOUT_V37_OPEN_DEVELOPMENT_COUNTRIES.length + countryIndex;
            const requestedEngineSeed = derivePairedEngineSeed(
                MISSION_NATIVE_CLOSEOUT_V37_OPEN_DEVELOPMENT_ENGINE_SEED_BASE,
                shardIndex,
            );
            const runId = `mission-native-closeout-v37-f${familyIndex}-c${countryIndex}-${generationManifest.source.gitCommit.slice(0, 10)}`;
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
                sourcePopulationCommitmentSha256: populationSha256,
                endpointVersion: LITERAL_BUILDING_ELIMINATION_ENDPOINT_VERSION,
                endpointSha256: LITERAL_BUILDING_ELIMINATION_ENDPOINT_SHA256,
                family,
                country,
                engineSeedBase: MISSION_NATIVE_CLOSEOUT_V37_OPEN_DEVELOPMENT_ENGINE_SEED_BASE,
                seedBlockIndex: shardIndex,
                requestedEngineSeed,
                maxTicks: MISSION_NATIVE_CLOSEOUT_V37_OPEN_DEVELOPMENT_MAX_TICKS,
                arms,
                episodes: buildMissionNativeCloseoutV37OpenDevelopmentEpisodes(arms),
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
                seedBlockIndex: shardIndex,
                requestedEngineSeed,
                launchedGameCount: 6,
            });
        }
    }
    const campaign: MissionNativeCloseoutV37OpenDevelopmentCampaign = {
        schemaVersion: 1,
        kind: "mission-native-closeout-v37-open-development-literal-endpoint",
        status: "FROZEN_MISSION_NATIVE_CLOSEOUT_V37_OPEN_DEVELOPMENT_V2_ENDPOINT_V5",
        generatedAt: new Date().toISOString(),
        sourceGitCommit: generationManifest.source.gitCommit,
        sourceRuntimeSha256,
        baselineGitCommit: baseline.gitCommit,
        baselineRuntimeSha256: baseline.runtimeTree.sha256,
        gameApiRuntimeSha256: generationManifest.software.gameApiRuntimeTree.sha256,
        packageLockSha256: generationManifest.software.packageLockSha256,
        populationSha256,
        protocolPath,
        protocolSha256: MISSION_NATIVE_CLOSEOUT_V37_OPEN_DEVELOPMENT_PROTOCOL_SHA256,
        technicalEvidence,
        endpointVersion: LITERAL_BUILDING_ELIMINATION_ENDPOINT_VERSION,
        endpointSha256: LITERAL_BUILDING_ELIMINATION_ENDPOINT_SHA256,
        outcomeAccess: "permanently-open-development-only-no-paper-claim",
        familyCount: 10,
        countryCount: 9,
        reciprocalSlotCount: 2,
        policyCount: 3,
        shardCount: 90,
        launchedGameCount: 540,
        engineSeedBase: MISSION_NATIVE_CLOSEOUT_V37_OPEN_DEVELOPMENT_ENGINE_SEED_BASE,
        maxTicks: MISSION_NATIVE_CLOSEOUT_V37_OPEN_DEVELOPMENT_MAX_TICKS,
        countries: MISSION_NATIVE_CLOSEOUT_V37_OPEN_DEVELOPMENT_COUNTRIES,
        advancementRule: MISSION_NATIVE_CLOSEOUT_V37_ADVANCEMENT_RULE,
        arms,
        selectedFamilies: families,
        shards,
    };
    if (
        campaign.shardCount !== MISSION_NATIVE_CLOSEOUT_V37_OPEN_DEVELOPMENT_SHARD_COUNT ||
        campaign.launchedGameCount !== MISSION_NATIVE_CLOSEOUT_V37_OPEN_DEVELOPMENT_LAUNCH_COUNT
    ) throw new Error("V37 open-development launch count drifted");
    const campaignPath = path.join(outRoot, "campaign.json");
    fs.writeFileSync(campaignPath, `${JSON.stringify(campaign, null, 2)}\n`, { flag: "wx", mode: 0o600 });
    fs.writeFileSync(
        path.join(outRoot, "plan-files.txt"),
        `${shards.map(({ planFile }) => planFile).join("\n")}\n`,
        { flag: "wx", mode: 0o600 },
    );
    console.log(JSON.stringify({
        campaignPath,
        campaignSha256: sha256File(campaignPath),
        shardCount: shards.length,
        launchCount: campaign.launchedGameCount,
    }));
};

const invoked = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (import.meta.url === invoked) main().catch((error) => { console.error(error); process.exitCode = 1; });
