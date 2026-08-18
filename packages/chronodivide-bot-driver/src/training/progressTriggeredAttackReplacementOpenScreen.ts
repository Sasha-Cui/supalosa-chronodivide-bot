import { Bot, CreateOfflineOpts, GameApi, cdapi } from "@chronodivide/game-api";
import { AttackMissionFactoryTelemetry } from
    "@supalosa/chronodivide-bot/dist/bot/logic/mission/missions/attackMission.js";
import { Countries } from "@supalosa/chronodivide-bot/dist/bot/logic/common/utils.js";
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { BaselineFactory, InspectableBaselineBot, loadBaselineFactory } from "../benchmark/baselineLoader.js";
import { createExperimentManifest } from "../benchmark/provenance.js";
import {
    deriveBotRandomSeed,
    deriveParticipantBotRandomSeed,
    engineSeedToEpochMs,
    withSeededOfflineGame,
} from "../benchmark/seededOfflineGame.js";
import {
    FinishAdvantageOpenOutcomeRow,
    compareFinishAdvantageOpenArms,
    summarizeFinishAdvantageOpenAbsoluteRates,
} from "./finishAdvantageOpenCausalScreenAnalysis.js";
import {
    LITERAL_BUILDING_ELIMINATION_ENDPOINT,
    LITERAL_BUILDING_ELIMINATION_ENDPOINT_SHA256,
    LITERAL_BUILDING_ELIMINATION_ENDPOINT_VERSION,
    LiteralBuildingEliminationAdjudicator,
    installLiteralEndpointInstrumentation,
    snapshotCombatantBuildings,
} from "./literalBuildingEliminationEndpoint.js";
import { PROGRESS_CERTIFIED_V5_OPEN_DEVELOPMENT_FAMILIES } from
    "./progressCertifiedV5OpenDevelopmentCampaign.js";
import {
    buildProgressCertifiedConversionPolicyV5,
    progressCertifiedConversionPolicyV5Sha256,
} from "./progressCertifiedConversionPolicyV5.js";
import {
    ProgressTriggeredReplacementPriority,
    ProgressTriggeredReplacementTelemetry,
    buildProgressTriggeredReplacementPolicy,
    createProgressTriggeredAttackReplacementCandidate,
    progressTriggeredReplacementPolicySha256,
} from "./progressTriggeredAttackReplacementCandidate.js";
import { TerminalObjectiveTelemetry } from "./terminalObjectiveStrategy.js";

const SCHEMA_VERSION = 1 as const;
const KIND = "progress-triggered-attack-replacement-complete-open-screen-v1" as const;
const STATUS = "FROZEN_PROGRESS_TRIGGERED_REPLACEMENT_COMPLETE_OPEN_SCREEN_V1" as const;
const COUNTRIES = [
    Countries.USA, Countries.KOREA, Countries.FRANCE, Countries.GERMANY, Countries.GREAT_BRITAIN,
    Countries.LIBYA, Countries.IRAQ, Countries.CUBA, Countries.RUSSIA,
] as const;
const SEED_BASE = 4_227_400_000;
const MAX_TICKS = 24_000;
const SHA256 = /^[0-9a-f]{64}$/;
const GIT_COMMIT = /^[0-9a-f]{40}$/;
const isRecord = (value: unknown): value is Record<string, unknown> =>
    !!value && typeof value === "object" && !Array.isArray(value);
const hash = (value: unknown): string => crypto.createHash("sha256")
    .update(JSON.stringify(value)).digest("hex");
const fileHash = (filePath: string): string => crypto.createHash("sha256")
    .update(fs.readFileSync(filePath)).digest("hex");
const readJson = (filePath: string): unknown => JSON.parse(fs.readFileSync(filePath, "utf8"));
const requiredPath = (name: string): string => {
    const value = process.env[name];
    if (!value) throw new Error(`${name} is required`);
    return path.resolve(value);
};
const requiredText = (name: string, pattern: RegExp): string => {
    const value = process.env[name];
    if (!value || !pattern.test(value)) throw new Error(`${name} is invalid`);
    return value;
};
const append = (filePath: string, value: unknown): void =>
    fs.appendFileSync(filePath, JSON.stringify(value) + "\n");

type ArmId = "external_supalosa_control" | "unchanged_v5" |
    "v5_plus_early_distance" | "v5_plus_conservative_distance" |
    "v5_plus_conservative_forces_first" | "v5_plus_conservative_buildings_first";
type Arm = {
    armId: ArmId;
    kind: "control" | "v5" | "replacement";
    priority: ProgressTriggeredReplacementPriority;
    replacementEnabled: boolean;
    activationNotBeforeTick: number;
    stagnationWindowTicks: number;
    policySha256: string;
};
type Shard = {
    taskIndex: number;
    familyOrdinal: number;
    familyId: string;
    mapName: string;
    mapSha256: string;
    countryOrdinal: number;
    country: Countries;
    requestedEngineSeed: number;
    launchedGameCount: 12;
};
type Campaign = {
    schemaVersion: 1;
    kind: typeof KIND;
    status: typeof STATUS;
    generatedAt: string;
    outcomeAccess: "withheld-until-complete-finalizer";
    sourceGitCommit: string;
    sourceRuntimeSha256: string;
    externalBaselineGitCommit: string;
    externalBaselineRuntimeSha256: string;
    gameApiRuntimeSha256: string;
    packageLockSha256: string;
    populationSha256: string;
    endpointVersion: typeof LITERAL_BUILDING_ELIMINATION_ENDPOINT_VERSION;
    endpointSha256: typeof LITERAL_BUILDING_ELIMINATION_ENDPOINT_SHA256;
    protocol: { path: string; sha256: string };
    compatibilityGate: { path: string; sha256: string; schedulerJobId: string };
    programs: { screenPath: string; screenSha256: string; shardPath: string; shardSha256: string;
        controllerPath: string; controllerSha256: string };
    familyCount: 10;
    countryCount: 9;
    reciprocalSlotCount: 2;
    armCount: 6;
    shardCount: 90;
    launchedGameCount: 1_080;
    maxTicks: typeof MAX_TICKS;
    seedBase: typeof SEED_BASE;
    countries: readonly Countries[];
    arms: Arm[];
    selectedFamilies: typeof PROGRESS_CERTIFIED_V5_OPEN_DEVELOPMENT_FAMILIES;
    shards: Shard[];
};

const commitmentFor = (arm: Omit<Arm, "policySha256">) => {
    const v5 = buildProgressCertifiedConversionPolicyV5();
    const v5Policy = arm.kind === "control" ? { ...v5, enabled: false } : v5;
    const replacement = buildProgressTriggeredReplacementPolicy({ enabled: arm.replacementEnabled,
        activationNotBeforeTick: arm.activationNotBeforeTick, stagnationWindowTicks: arm.stagnationWindowTicks,
        targetPriority: arm.priority });
    return {
        architecture: arm.kind === "control" ? "exact_external_supalosa" :
            "exact_external_supalosa_then_optional_progress_triggered_attack_replacement_then_strict_v5",
        armId: arm.armId,
        v5: v5Policy,
        v5Sha256: progressCertifiedConversionPolicyV5Sha256(v5Policy),
        replacement,
        replacementSha256: progressTriggeredReplacementPolicySha256(replacement),
    };
};
const buildArms = (): Arm[] => ([
    { armId: "external_supalosa_control", kind: "control", priority: "distance", replacementEnabled: false,
        activationNotBeforeTick: 12_000, stagnationWindowTicks: 3_600 },
    { armId: "unchanged_v5", kind: "v5", priority: "distance", replacementEnabled: false,
        activationNotBeforeTick: 12_000, stagnationWindowTicks: 3_600 },
    { armId: "v5_plus_early_distance", kind: "replacement", priority: "distance", replacementEnabled: true,
        activationNotBeforeTick: 9_000, stagnationWindowTicks: 3_000 },
    { armId: "v5_plus_conservative_distance", kind: "replacement", priority: "distance", replacementEnabled: true,
        activationNotBeforeTick: 12_000, stagnationWindowTicks: 3_600 },
    { armId: "v5_plus_conservative_forces_first", kind: "replacement", priority: "strategic", replacementEnabled: true,
        activationNotBeforeTick: 12_000, stagnationWindowTicks: 3_600 },
    { armId: "v5_plus_conservative_buildings_first", kind: "replacement", priority: "objective", replacementEnabled: true,
        activationNotBeforeTick: 12_000, stagnationWindowTicks: 3_600 },
] as const).map((arm) => ({ ...arm, policySha256: hash(commitmentFor(arm)) }));
const buildShards = (): Shard[] => PROGRESS_CERTIFIED_V5_OPEN_DEVELOPMENT_FAMILIES.flatMap(
    (family, familyOrdinal) => COUNTRIES.map((country, countryOrdinal) => ({
        taskIndex: familyOrdinal * 9 + countryOrdinal,
        familyOrdinal,
        familyId: family.familyId,
        mapName: family.mapName,
        mapSha256: family.mapSha256,
        countryOrdinal,
        country,
        requestedEngineSeed: SEED_BASE + familyOrdinal * 9 + countryOrdinal,
        launchedGameCount: 12 as const,
    })),
);

const validateCampaign = (value: unknown): Campaign => {
    if (!isRecord(value) || value.schemaVersion !== 1 || value.kind !== KIND || value.status !== STATUS ||
        value.outcomeAccess !== "withheld-until-complete-finalizer" ||
        !GIT_COMMIT.test(String(value.sourceGitCommit)) || !SHA256.test(String(value.sourceRuntimeSha256)) ||
        !GIT_COMMIT.test(String(value.externalBaselineGitCommit)) ||
        !SHA256.test(String(value.externalBaselineRuntimeSha256)) ||
        !SHA256.test(String(value.gameApiRuntimeSha256)) || !SHA256.test(String(value.packageLockSha256)) ||
        !SHA256.test(String(value.populationSha256)) || value.endpointVersion !==
            LITERAL_BUILDING_ELIMINATION_ENDPOINT_VERSION ||
        value.endpointSha256 !== LITERAL_BUILDING_ELIMINATION_ENDPOINT_SHA256 ||
        value.familyCount !== 10 || value.countryCount !== 9 || value.reciprocalSlotCount !== 2 ||
        value.armCount !== 6 || value.shardCount !== 90 || value.launchedGameCount !== 1_080 ||
        value.maxTicks !== MAX_TICKS || value.seedBase !== SEED_BASE || !Array.isArray(value.arms) ||
        !Array.isArray(value.shards) || !Array.isArray(value.countries) || !Array.isArray(value.selectedFamilies) ||
        !isRecord(value.protocol) || !isRecord(value.compatibilityGate) || !isRecord(value.programs)) {
        throw new Error("Stagnation-replacement campaign schema is invalid");
    }
    const campaign = value as unknown as Campaign;
    if (JSON.stringify(campaign.arms) !== JSON.stringify(buildArms()) ||
        JSON.stringify(campaign.shards) !== JSON.stringify(buildShards()) ||
        JSON.stringify(campaign.countries) !== JSON.stringify(COUNTRIES) ||
        JSON.stringify(campaign.selectedFamilies) !== JSON.stringify(PROGRESS_CERTIFIED_V5_OPEN_DEVELOPMENT_FAMILIES) ||
        campaign.populationSha256 !== hash(PROGRESS_CERTIFIED_V5_OPEN_DEVELOPMENT_FAMILIES)) {
        throw new Error("Stagnation-replacement campaign commitments drifted");
    }
    return campaign;
};

const settings = (mapName: string, candidate: Bot, baseline: Bot, slot: 0 | 1): CreateOfflineOpts => {
    const gameMode = cdapi.getAvailableGameModes(mapName)[0];
    if (!gameMode) throw new Error(`No game mode is available for ${mapName}`);
    return { buildOffAlly: false, cratesAppear: false, credits: 10_000, gameMode, gameSpeed: 6,
        mapName, mcvRepacks: true, shortGame: false, superWeapons: false, unitCount: 0,
        online: false, agents: slot === 0 ? [candidate, baseline] : [baseline, candidate] };
};
const requireApi = (bot: InspectableBaselineBot): GameApi => {
    if (!bot.lastGameApi) throw new Error("Candidate GameApi is unavailable");
    return bot.lastGameApi;
};

type EpisodeResult = {
    schemaVersion: 1;
    episodeId: string;
    familyId: string;
    mapName: string;
    mapSha256: string;
    armId: ArmId;
    policySha256: string;
    familyOrdinal: number;
    countryOrdinal: number;
    requestedEngineSeed: number;
    botRandomSeed: number;
    candidateBotRandomSeed: number;
    baselineBotRandomSeed: number;
    engineSeedEpochMs: number;
    candidateSlot: 0 | 1;
    country: Countries;
    maxTicks: number;
    ticks: number;
    endpointVersion: typeof LITERAL_BUILDING_ELIMINATION_ENDPOINT_VERSION;
    endpointSha256: typeof LITERAL_BUILDING_ELIMINATION_ENDPOINT_SHA256;
    endpoint: typeof LITERAL_BUILDING_ELIMINATION_ENDPOINT;
    outcomeStatus: string;
    winner: "candidate" | "baseline" | "draw" | null;
    candidateScore: 0 | 0.5 | 1 | null;
    technicalFailure: unknown;
    terminal: unknown;
    terminalBuildingCounts: { candidate: number; baseline: number };
    endpointEstablished: unknown;
    quitSuppression: unknown;
    v5Telemetry: TerminalObjectiveTelemetry[];
    replacementTelemetry: ProgressTriggeredReplacementTelemetry[];
    attackFactoryTelemetry: AttackMissionFactoryTelemetry[];
};

const createCandidate = (
    factory: BaselineFactory,
    name: string,
    country: Countries,
    arm: Arm,
    v5Telemetry: TerminalObjectiveTelemetry[],
    replacementTelemetry: ProgressTriggeredReplacementTelemetry[],
    attackFactoryTelemetry: AttackMissionFactoryTelemetry[],
): InspectableBaselineBot => {
    if (arm.kind === "control") return factory.create(name, country);
    return createProgressTriggeredAttackReplacementCandidate(
        factory, name, country, buildProgressCertifiedConversionPolicyV5(),
        buildProgressTriggeredReplacementPolicy({ enabled: arm.replacementEnabled,
            activationNotBeforeTick: arm.activationNotBeforeTick, stagnationWindowTicks: arm.stagnationWindowTicks,
            targetPriority: arm.priority }),
        { v5: (event) => v5Telemetry.push(event), replacement: (event) => replacementTelemetry.push(event),
            attackFactory: (event) => attackFactoryTelemetry.push(event) },
    );
};

const runEpisode = async (campaign: Campaign, shard: Shard, arm: Arm, slot: 0 | 1,
    factory: BaselineFactory): Promise<EpisodeResult> => {
    const episodeId = `f${shard.familyOrdinal}-k${shard.countryOrdinal}-a${campaign.arms.indexOf(arm)}-s${slot}`;
    const candidateName = `DeferredCandidate_${shard.familyOrdinal}_${shard.countryOrdinal}_${slot}`;
    const baselineName = `DeferredBaseline_${shard.familyOrdinal}_${shard.countryOrdinal}_${slot}`;
    const v5Telemetry: TerminalObjectiveTelemetry[] = [];
    const replacementTelemetry: ProgressTriggeredReplacementTelemetry[] = [];
    const attackFactoryTelemetry: AttackMissionFactoryTelemetry[] = [];
    const candidate = createCandidate(factory, candidateName, shard.country, arm, v5Telemetry,
        replacementTelemetry, attackFactoryTelemetry);
    const baseline = factory.create(baselineName, shard.country);
    const adjudicator = new LiteralBuildingEliminationAdjudicator({ candidate: candidateName, baseline: baselineName });
    const { audit: quitSuppression } = installLiteralEndpointInstrumentation({ candidate, baseline }, adjudicator);
    return withSeededOfflineGame(cdapi, settings(shard.mapName, candidate, baseline, slot),
        shard.requestedEngineSeed,
        [{ agent: candidate, identity: "candidate" }, { agent: baseline, identity: "baseline" }],
        async (game) => {
            const api = requireApi(candidate);
            let ticks = 0;
            let terminal: any = null;
            let technicalFailure: any = null;
            while (ticks < campaign.maxTicks && !terminal && !technicalFailure) {
                adjudicator.beginUpdate(api);
                await game.update();
                ticks += 1;
                const stats = game.getPlayerStats();
                const c = stats.find(({ name }) => name === candidateName);
                const b = stats.find(({ name }) => name === baselineName);
                if (!c || !b) throw new Error(`Missing player statistics for ${episodeId}`);
                const completed = adjudicator.completeUpdate(api, { finished: game.isFinished(),
                    defeated: { candidate: c.defeated, baseline: b.defeated } });
                terminal = completed.terminal;
                technicalFailure = completed.technicalFailure;
            }
            const cap = !terminal && !technicalFailure ? { endpointVersion: LITERAL_BUILDING_ELIMINATION_ENDPOINT_VERSION,
                endpointSha256: LITERAL_BUILDING_ELIMINATION_ENDPOINT_SHA256, tick: api.getCurrentTick(),
                status: "tick_cap_draw", winner: "draw" } : null;
            const winner = technicalFailure ? null : terminal?.winner ?? "draw";
            const outcomeStatus = technicalFailure ? "technical_failure" : terminal?.status ?? "tick_cap_draw";
            const buildings = snapshotCombatantBuildings(api, { candidate: candidateName, baseline: baselineName });
            return {
                schemaVersion: 1, episodeId, familyId: shard.familyId, mapName: shard.mapName,
                mapSha256: shard.mapSha256, armId: arm.armId, policySha256: arm.policySha256,
                familyOrdinal: shard.familyOrdinal, countryOrdinal: shard.countryOrdinal,
                requestedEngineSeed: shard.requestedEngineSeed,
                botRandomSeed: deriveBotRandomSeed(shard.requestedEngineSeed),
                candidateBotRandomSeed: deriveParticipantBotRandomSeed(shard.requestedEngineSeed, "candidate"),
                baselineBotRandomSeed: deriveParticipantBotRandomSeed(shard.requestedEngineSeed, "baseline"),
                engineSeedEpochMs: engineSeedToEpochMs(shard.requestedEngineSeed), candidateSlot: slot,
                country: shard.country, maxTicks: campaign.maxTicks, ticks, outcomeStatus, winner,
                endpointVersion: LITERAL_BUILDING_ELIMINATION_ENDPOINT_VERSION,
                endpointSha256: LITERAL_BUILDING_ELIMINATION_ENDPOINT_SHA256,
                endpoint: LITERAL_BUILDING_ELIMINATION_ENDPOINT,
                candidateScore: winner === "candidate" ? 1 : winner === "baseline" ? 0 : winner === "draw" ? 0.5 : null,
                technicalFailure, terminal: terminal ?? cap,
                terminalBuildingCounts: {
                    candidate: buildings.filter(({ owner }) => owner === candidateName).length,
                    baseline: buildings.filter(({ owner }) => owner === baselineName).length,
                },
                endpointEstablished: adjudicator.getEstablished(), quitSuppression,
                v5Telemetry, replacementTelemetry, attackFactoryTelemetry,
            };
        });
};

const generate = async (): Promise<void> => {
    const outFile = requiredPath("OUT_FILE");
    const compatibilityPath = requiredPath("COMPATIBILITY_GATE");
    const compatibilitySha256 = requiredText("COMPATIBILITY_GATE_SHA256", SHA256);
    const protocolPath = requiredPath("PROTOCOL_PATH");
    const protocolSha256 = requiredText("PROTOCOL_SHA256", SHA256);
    const shardPath = requiredPath("SHARD_PATH");
    const controllerPath = requiredPath("CONTROLLER_PATH");
    if (fs.existsSync(outFile)) throw new Error(`Refusing to overwrite ${outFile}`);
    const screenPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
    if (!screenPath || fileHash(protocolPath) !== protocolSha256 ||
        fileHash(compatibilityPath) !== compatibilitySha256) throw new Error("Generator evidence drifted");
    const compatibility = readJson(compatibilityPath);
    const exposure = isRecord(compatibility) && isRecord(compatibility.exposure) ? compatibility.exposure : null;
    const requiredVariants = ["early_distance", "conservative_distance", "conservative_forces_first",
        "conservative_buildings_first"] as const;
    const completeExposure = exposure !== null && requiredVariants.every((id) => {
        const row = exposure[id];
        return isRecord(row) && Number(row.replacement) > 0 && Number(row.missions) > 0;
    });
    if (!isRecord(compatibility) || compatibility.kind !==
        "progress-triggered-attack-replacement-outcome-blind-gate" || compatibility.passed !== true ||
        compatibility.outcomeFree !== true || compatibility.schedulerAccount !== "pi_jss233" ||
        !/^\d+$/.test(String(compatibility.controllerJobId)) || !completeExposure) {
        throw new Error("Compatibility gate did not pass every deferred replacement variant");
    }
    const repoRoot = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
    const sourceGitCommit = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
    if (execFileSync("git", ["branch", "--show-current"], { encoding: "utf8" }).trim() !== "main" ||
        execFileSync("git", ["status", "--short", "--untracked-files=no"], { encoding: "utf8" }).trim() !== "" ||
        execFileSync("git", ["rev-parse", "fork/main"], { encoding: "utf8" }).trim() !== sourceGitCommit ||
        !process.env.BASELINE_PACKAGE_ROOT || process.env.REQUIRE_EXTERNAL_BASELINE !== "true") {
        throw new Error("Generator requires clean pushed main and the external baseline");
    }
    const driverRoot = path.join(repoRoot, "packages", "chronodivide-bot-driver");
    const factory = await loadBaselineFactory(path.join(repoRoot, "packages", "chronodivide-bot"));
    const manifest = createExperimentManifest({ runId: "progress-triggered-attack-replacement-open-screen-generator",
        mixDir: path.join(driverRoot, "data"), maps: PROGRESS_CERTIFIED_V5_OPEN_DEVELOPMENT_FAMILIES
            .map(({ mapName }) => mapName), effectiveConfig: { arms: buildArms(), shards: buildShards(),
            seedBase: SEED_BASE, maxTicks: MAX_TICKS }, baseline: factory.descriptor, gameSeedBase: SEED_BASE });
    if (manifest.source.gitCommit !== sourceGitCommit || manifest.source.trackedDirty !== false ||
        manifest.software.baseline.kind !== "external-package" || manifest.software.baseline.trackedDirty !== false ||
        !manifest.software.baseline.gitCommit || !manifest.software.baseline.runtimeTree.sha256 ||
        !manifest.software.gameApiRuntimeTree.sha256 || !manifest.software.packageLockSha256) {
        throw new Error("Generator provenance is incomplete");
    }
    const campaign: Campaign = {
        schemaVersion: 1, kind: KIND, status: STATUS, generatedAt: new Date().toISOString(),
        outcomeAccess: "withheld-until-complete-finalizer", sourceGitCommit,
        sourceRuntimeSha256: hash(manifest.source.runtimeTrees),
        externalBaselineGitCommit: manifest.software.baseline.gitCommit,
        externalBaselineRuntimeSha256: manifest.software.baseline.runtimeTree.sha256,
        gameApiRuntimeSha256: manifest.software.gameApiRuntimeTree.sha256,
        packageLockSha256: manifest.software.packageLockSha256,
        populationSha256: hash(PROGRESS_CERTIFIED_V5_OPEN_DEVELOPMENT_FAMILIES),
        endpointVersion: LITERAL_BUILDING_ELIMINATION_ENDPOINT_VERSION,
        endpointSha256: LITERAL_BUILDING_ELIMINATION_ENDPOINT_SHA256,
        protocol: { path: protocolPath, sha256: protocolSha256 },
        compatibilityGate: { path: compatibilityPath, sha256: compatibilitySha256,
            schedulerJobId: String(compatibility.controllerJobId) },
        programs: { screenPath, screenSha256: fileHash(screenPath), shardPath, shardSha256: fileHash(shardPath),
            controllerPath, controllerSha256: fileHash(controllerPath) },
        familyCount: 10, countryCount: 9, reciprocalSlotCount: 2, armCount: 6, shardCount: 90,
        launchedGameCount: 1_080, maxTicks: MAX_TICKS, seedBase: SEED_BASE, countries: COUNTRIES,
        arms: buildArms(), selectedFamilies: PROGRESS_CERTIFIED_V5_OPEN_DEVELOPMENT_FAMILIES,
        shards: buildShards(),
    };
    validateCampaign(campaign);
    fs.writeFileSync(outFile, JSON.stringify(campaign, null, 2) + "\n", { flag: "wx", mode: 0o600 });
    console.log(JSON.stringify({ campaignSha256: fileHash(outFile), launchedGameCount: 1_080 }));
};

const cell = async (): Promise<void> => {
    if (process.env.SLURM_JOB_ACCOUNT !== "pi_jss233") throw new Error("Cell requires pi_jss233");
    const campaignPath = requiredPath("CAMPAIGN");
    const campaignSha256 = requiredText("CAMPAIGN_SHA256", SHA256);
    const taskIndex = Number(requiredText("TASK_INDEX", /^\d+$/));
    const outDir = requiredPath("OUT_DIR");
    if (fs.existsSync(outDir) || fileHash(campaignPath) !== campaignSha256) throw new Error("Cell input drifted");
    const campaign = validateCampaign(readJson(campaignPath));
    if (taskIndex < 0 || taskIndex >= 90 || process.env.SLURM_ARRAY_TASK_ID !== String(taskIndex) ||
        !process.env.BASELINE_PACKAGE_ROOT || process.env.REQUIRE_EXTERNAL_BASELINE !== "true") {
        throw new Error("Cell scheduler or baseline input is invalid");
    }
    const repoRoot = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
    const driverRoot = path.join(repoRoot, "packages", "chronodivide-bot-driver");
    if (execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim() !== campaign.sourceGitCommit ||
        fileHash(process.argv[1]!) !== campaign.programs.screenSha256) throw new Error("Cell source drifted");
    const shard = campaign.shards[taskIndex];
    if (fileHash(path.join(driverRoot, "data", shard.mapName)) !== shard.mapSha256) throw new Error("Map drifted");
    const factory = await loadBaselineFactory(path.join(repoRoot, "packages", "chronodivide-bot"));
    const manifest = createExperimentManifest({ runId: `deferred-open-${taskIndex}-${process.env.SLURM_JOB_ID}`,
        mixDir: path.join(driverRoot, "data"), maps: [shard.mapName], effectiveConfig: { campaignSha256, shard,
            arms: campaign.arms, noRetries: true }, baseline: factory.descriptor,
        gameSeedBase: shard.requestedEngineSeed });
    if (manifest.scheduler.account !== "pi_jss233" || String(manifest.scheduler.arrayTaskId) !== String(taskIndex) ||
        manifest.source.gitCommit !== campaign.sourceGitCommit || manifest.source.trackedDirty !== false ||
        hash(manifest.source.runtimeTrees) !== campaign.sourceRuntimeSha256 ||
        manifest.software.baseline.gitCommit !== campaign.externalBaselineGitCommit ||
        manifest.software.baseline.runtimeTree.sha256 !== campaign.externalBaselineRuntimeSha256 ||
        manifest.software.gameApiRuntimeTree.sha256 !== campaign.gameApiRuntimeSha256 ||
        manifest.software.packageLockSha256 !== campaign.packageLockSha256) throw new Error("Cell provenance drifted");
    fs.mkdirSync(outDir, { recursive: false, mode: 0o700 });
    const manifestPath = path.join(outDir, "manifest.json");
    const eventsPath = path.join(outDir, "events.jsonl");
    const summaryPath = path.join(outDir, "summary.json");
    fs.writeFileSync(manifestPath, JSON.stringify({ campaignSha256, shard, manifest }, null, 2) + "\n",
        { flag: "wx", mode: 0o600 });
    fs.writeFileSync(eventsPath, "", { flag: "wx", mode: 0o600 });
    append(eventsPath, { event: "run_start", campaignSha256, taskIndex, requestedLaunches: 12 });
    await cdapi.init(path.join(driverRoot, "data"));
    let completed = 0, technicalFailures = 0, candidateWins = 0, baselineWins = 0, draws = 0, launchIndex = 0;
    for (const arm of campaign.arms) for (const slot of [0, 1] as const) {
        append(eventsPath, { event: "launch_counted", launchIndex, armId: arm.armId,
            policySha256: arm.policySha256, candidateSlot: slot });
        try {
            const result = await runEpisode(campaign, shard, arm, slot, factory);
            if (result.technicalFailure || result.winner === null) {
                technicalFailures += 1;
                append(eventsPath, { event: "technical_failure", launchIndex, result });
            } else {
                completed += 1;
                candidateWins += Number(result.winner === "candidate");
                baselineWins += Number(result.winner === "baseline");
                draws += Number(result.winner === "draw");
                append(eventsPath, { event: "episode_complete", launchIndex, result });
            }
        } catch (error) {
            technicalFailures += 1;
            append(eventsPath, { event: "technical_failure", launchIndex,
                error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } :
                    { name: "Error", message: String(error) } });
        }
        launchIndex += 1;
    }
    const summary = { schemaVersion: 1, status: technicalFailures === 0 ? "COMPLETE_PROGRESS_TRIGGERED_REPLACEMENT_OPEN_SHARD" :
        "FAILED_PROGRESS_TRIGGERED_REPLACEMENT_OPEN_SHARD", campaignSha256, taskIndex, requestedLaunches: 12,
        accountedLaunches: completed + technicalFailures, completed, technicalFailures,
        complete: completed + technicalFailures === 12, technicallyClean: technicalFailures === 0,
        candidateWins, baselineWins, draws, outcomeAccess: "withheld-until-complete-finalizer" };
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2) + "\n", { flag: "wx", mode: 0o600 });
    append(eventsPath, { event: "run_complete", summary });
    console.log(JSON.stringify(summary));
    if (!summary.complete || !summary.technicallyClean) process.exitCode = 2;
};

type Observation = {
    armId: ArmId;
    familyId: string;
    country: Countries;
    candidateSlot: 0 | 1;
    outcome: "win" | "draw" | "loss";
    nonterminalDraw: boolean;
    replacement: ProgressTriggeredReplacementTelemetry[];
    factory: AttackMissionFactoryTelemetry[];
};
const validateResult = (value: unknown, campaign: Campaign, shard: Shard, arm: Arm, slot: 0 | 1): Observation => {
    if (!isRecord(value) || value.schemaVersion !== 1 || value.familyId !== shard.familyId ||
        value.mapName !== shard.mapName || value.mapSha256 !== shard.mapSha256 || value.armId !== arm.armId ||
        value.policySha256 !== arm.policySha256 || value.familyOrdinal !== shard.familyOrdinal ||
        value.countryOrdinal !== shard.countryOrdinal || value.requestedEngineSeed !== shard.requestedEngineSeed ||
        value.botRandomSeed !== deriveBotRandomSeed(shard.requestedEngineSeed) ||
        value.candidateBotRandomSeed !== deriveParticipantBotRandomSeed(shard.requestedEngineSeed, "candidate") ||
        value.baselineBotRandomSeed !== deriveParticipantBotRandomSeed(shard.requestedEngineSeed, "baseline") ||
        value.engineSeedEpochMs !== engineSeedToEpochMs(shard.requestedEngineSeed) || value.candidateSlot !== slot ||
        value.country !== shard.country || value.maxTicks !== MAX_TICKS || !Number.isSafeInteger(value.ticks) ||
        value.endpointVersion !== LITERAL_BUILDING_ELIMINATION_ENDPOINT_VERSION ||
        value.endpointSha256 !== LITERAL_BUILDING_ELIMINATION_ENDPOINT_SHA256 ||
        value.endpoint !== LITERAL_BUILDING_ELIMINATION_ENDPOINT ||
        !["candidate", "baseline", "draw"].includes(String(value.winner)) || value.technicalFailure !== null ||
        !isRecord(value.terminal) || !isRecord(value.terminalBuildingCounts) ||
        !isRecord(value.quitSuppression) || !isRecord(value.quitSuppression.forwarded) ||
        value.quitSuppression.forwarded.candidate !== 0 || value.quitSuppression.forwarded.baseline !== 0 ||
        !Array.isArray(value.v5Telemetry) || !Array.isArray(value.replacementTelemetry) ||
        !Array.isArray(value.attackFactoryTelemetry)) {
        throw new Error(`Result ${shard.taskIndex}/${arm.armId}/${slot} drifted`);
    }
    const winner = value.winner as "candidate" | "baseline" | "draw";
    if (value.candidateScore !== (winner === "candidate" ? 1 : winner === "baseline" ? 0 : 0.5) ||
        winner === "candidate" && value.terminalBuildingCounts.baseline !== 0 ||
        winner === "baseline" && value.terminalBuildingCounts.candidate !== 0) {
        throw new Error("Literal endpoint result drifted");
    }
    const replacement = value.replacementTelemetry as ProgressTriggeredReplacementTelemetry[];
    const factoryEvents = value.attackFactoryTelemetry as AttackMissionFactoryTelemetry[];
    const v5 = value.v5Telemetry as TerminalObjectiveTelemetry[];
    if (arm.kind !== "replacement" && (replacement.length !== 0 || factoryEvents.length !== 0)) {
        throw new Error("Comparator emitted deferred replacement telemetry");
    }
    if (arm.kind === "control" && v5.length !== 0) throw new Error("Exact control emitted V5 telemetry");
    if (arm.kind !== "control" && v5.some((event) => event.schemaVersion !== 4 ||
        event.informationBoundary !== "public_complete_state" ||
        event.mechanism !== "progress_certified_terminal_conversion")) throw new Error("V5 telemetry identity drifted");
    const policy = buildProgressTriggeredReplacementPolicy({ enabled: arm.replacementEnabled,
        activationNotBeforeTick: arm.activationNotBeforeTick, stagnationWindowTicks: arm.stagnationWindowTicks,
        targetPriority: arm.priority });
    if (replacement.length > 1) throw new Error("Deferred replacement occurred more than once");
    for (const event of replacement) if (event.schemaVersion !== 1 || event.event !== "attack_factory_replaced" ||
        event.informationBoundary !== "public_complete_state" || event.targetPriority !== policy.targetPriority ||
        event.tick < policy.activationNotBeforeTick || event.ticksSinceBuildingProgress < policy.stagnationWindowTicks ||
        JSON.stringify(event.existingMissionNamesBefore) !== JSON.stringify(event.existingMissionNamesAfter) ||
        !Array.isArray(event.forbiddenFieldsEmitted) || event.forbiddenFieldsEmitted.length !== 0 ||
        JSON.stringify(event).match(/winner|loser|score|outcome|endpoint|resignation|evaluator/i)) {
        throw new Error("Deferred replacement telemetry validation failed");
    }
    const swapTick = replacement[0]?.tick ?? Number.POSITIVE_INFINITY;
    const names = new Set<string>();
    for (const event of factoryEvents) {
        if (event.schemaVersion !== 1 || event.event !== "attack_mission_created" ||
            event.informationBoundary !== "public_complete_state" || event.targetPriority !== policy.targetPriority ||
            event.tick < swapTick || names.has(event.missionName) || !isRecord(event.composition) ||
            !isRecord(event.composition.composition) || !isRecord(event.target) ||
            !Array.isArray(event.forbiddenFieldsEmitted) || event.forbiddenFieldsEmitted.length !== 0 ||
            JSON.stringify(event).match(/winner|loser|score|outcome|endpoint|resignation|evaluator/i)) {
            throw new Error("Post-swap factory telemetry validation failed");
        }
        names.add(event.missionName);
    }
    return { armId: arm.armId, familyId: shard.familyId, country: shard.country, candidateSlot: slot,
        outcome: winner === "candidate" ? "win" : winner === "baseline" ? "loss" : "draw",
        nonterminalDraw: winner === "draw" && ["tick_cap_draw", "engine_nonliteral_termination_draw"]
            .includes(String(value.outcomeStatus)), replacement, factory: factoryEvents };
};

const parseSacct = (raw: string, arrayJobId: string): Map<number, string> => {
    const tasks = new Map<number, string>();
    for (const line of raw.split("\n").filter(Boolean)) {
        const [logical, scheduler, state, exitCode, account, ...extra] = line.split("|");
        const match = new RegExp(`^${arrayJobId}_(\\d+)$`).exec(logical);
        if (extra.length || !match || state !== "COMPLETED" || exitCode !== "0:0" || account !== "pi_jss233") continue;
        const index = Number(match[1]);
        if (index >= 0 && index < 90 && !tasks.has(index)) tasks.set(index, scheduler);
    }
    if (tasks.size !== 90) throw new Error(`Scheduler returned ${tasks.size}/90 successful tasks`);
    return tasks;
};

const rowsFor = (observations: Observation[], armId: ArmId): FinishAdvantageOpenOutcomeRow[] =>
    observations.filter((row) => row.armId === armId).map((row) => ({ ...row })) as unknown as
        FinishAdvantageOpenOutcomeRow[];

const finalize = (): void => {
    if (process.env.SLURM_JOB_ACCOUNT !== "pi_jss233") throw new Error("Finalizer requires pi_jss233");
    const campaignPath = requiredPath("CAMPAIGN");
    const campaignSha256 = requiredText("CAMPAIGN_SHA256", SHA256);
    const resultsRoot = requiredPath("RESULTS_ROOT");
    const outFile = requiredPath("OUT_FILE");
    const arrayJobId = requiredText("ARRAY_JOB_ID", /^\d+$/);
    if (fs.existsSync(outFile) || fileHash(campaignPath) !== campaignSha256) throw new Error("Finalizer input drifted");
    const campaign = validateCampaign(readJson(campaignPath));
    const aggregatorGitCommit = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
    if (aggregatorGitCommit !== campaign.sourceGitCommit ||
        fileHash(process.argv[1]!) !== campaign.programs.screenSha256) {
        throw new Error("Finalizer program or source drifted");
    }
    if (fileHash(campaign.protocol.path) !== campaign.protocol.sha256 ||
        fileHash(campaign.compatibilityGate.path) !== campaign.compatibilityGate.sha256) {
        throw new Error("Finalizer source drifted");
    }
    const scheduler = parseSacct(execFileSync("/opt/slurm/current/bin/sacct",
        ["-j", arrayJobId, "-n", "-P", "-X", "--format=JobID,JobIDRaw,State,ExitCode,Account"],
        { encoding: "utf8" }), arrayJobId);
    const observations: Observation[] = [];
    for (const shard of campaign.shards) {
        const taskRoot = path.join(resultsRoot, `task-${String(shard.taskIndex).padStart(3, "0")}`);
        const runRoot = path.join(taskRoot, "run");
        const expectedArtifactPaths = ["manifest.json", "events.jsonl", "summary.json"]
            .map((name) => path.join(runRoot, name));
        const hashRows = fs.readFileSync(path.join(taskRoot, "artifacts.sha256"), "utf8")
            .split("\n").filter(Boolean);
        if (hashRows.length !== 3) throw new Error(`Shard ${shard.taskIndex} hash record drifted`);
        for (const [index, row] of hashRows.entries()) {
            const match = /^([0-9a-f]{64})  (.+)$/.exec(row);
            if (!match || path.resolve(match[2]) !== expectedArtifactPaths[index] ||
                fileHash(expectedArtifactPaths[index]) !== match[1]) {
                throw new Error(`Shard ${shard.taskIndex} artifact ${index} hash drifted`);
            }
        }
        const summary = readJson(path.join(runRoot, "summary.json"));
        if (!isRecord(summary) || summary.status !== "COMPLETE_PROGRESS_TRIGGERED_REPLACEMENT_OPEN_SHARD" ||
            summary.campaignSha256 !== campaignSha256 || summary.taskIndex !== shard.taskIndex ||
            summary.requestedLaunches !== 12 || summary.accountedLaunches !== 12 || summary.completed !== 12 ||
            summary.technicalFailures !== 0 || summary.complete !== true || summary.technicallyClean !== true) {
            throw new Error(`Shard ${shard.taskIndex} failed its summary gate`);
        }
        const outer = readJson(path.join(runRoot, "manifest.json"));
        const manifest = isRecord(outer) && isRecord(outer.manifest) ? outer.manifest : null;
        const source = manifest && isRecord(manifest.source) ? manifest.source : null;
        const software = manifest && isRecord(manifest.software) ? manifest.software : null;
        const baseline = software && isRecord(software.baseline) ? software.baseline : null;
        const baselineRuntime = baseline && isRecord(baseline.runtimeTree) ? baseline.runtimeTree : null;
        const gameApiRuntime = software && isRecord(software.gameApiRuntimeTree) ? software.gameApiRuntimeTree : null;
        if (!isRecord(outer) || outer.campaignSha256 !== campaignSha256 || !manifest ||
            !isRecord(manifest.scheduler) || manifest.scheduler.account !== "pi_jss233" ||
            String(manifest.scheduler.arrayJobId) !== arrayJobId ||
            String(manifest.scheduler.arrayTaskId) !== String(shard.taskIndex) ||
            String(manifest.scheduler.jobId) !== scheduler.get(shard.taskIndex) || !source ||
            source.gitCommit !== campaign.sourceGitCommit || source.gitBranch !== "main" ||
            source.trackedDirty !== false || !Array.isArray(source.runtimeTrees) ||
            hash(source.runtimeTrees) !== campaign.sourceRuntimeSha256 || !software || !baseline ||
            baseline.kind !== "external-package" || baseline.gitCommit !== campaign.externalBaselineGitCommit ||
            baseline.trackedDirty !== false || !baselineRuntime ||
            baselineRuntime.sha256 !== campaign.externalBaselineRuntimeSha256 || !gameApiRuntime ||
            gameApiRuntime.sha256 !== campaign.gameApiRuntimeSha256 ||
            software.packageLockSha256 !== campaign.packageLockSha256) {
            throw new Error(`Shard ${shard.taskIndex} manifest drifted`);
        }
        const events = fs.readFileSync(path.join(runRoot, "events.jsonl"), "utf8").split("\n").filter(Boolean)
            .map((line) => JSON.parse(line) as unknown);
        let cursor = 1;
        for (const arm of campaign.arms) for (const slot of [0, 1] as const) {
            const launch = events[cursor++];
            const completion = events[cursor++];
            if (!isRecord(launch) || launch.event !== "launch_counted" || launch.armId !== arm.armId ||
                launch.candidateSlot !== slot || !isRecord(completion) || completion.event !== "episode_complete") {
                throw new Error(`Shard ${shard.taskIndex} event accounting drifted`);
            }
            observations.push(validateResult(completion.result, campaign, shard, arm, slot));
        }
        if (cursor !== events.length - 1) throw new Error(`Shard ${shard.taskIndex} has extra events`);
    }
    if (observations.length !== 1_080) throw new Error(`Finalizer observed ${observations.length}/1080 games`);
    const controlRows = rowsFor(observations, "external_supalosa_control");
    const v5Rows = rowsFor(observations, "unchanged_v5");
    const v5ComparisonAliasRows = v5Rows.map((row) => ({
        ...row,
        armId: "visibility_aware_final_building_v5" as const,
    })) as FinishAdvantageOpenOutcomeRow[];
    const controlAbsolute = summarizeFinishAdvantageOpenAbsoluteRates(controlRows);
    const v5Absolute = summarizeFinishAdvantageOpenAbsoluteRates(v5Rows);
    const evaluations = campaign.arms.filter(({ kind }) => kind === "replacement").map((arm) => {
        const armObservations = observations.filter((row) => row.armId === arm.armId);
        const armRows = rowsFor(observations, arm.armId);
        const absolute = summarizeFinishAdvantageOpenAbsoluteRates(armRows);
        const versusSupalosa = compareFinishAdvantageOpenArms(armRows, controlRows,
            "external_supalosa_control" as never);
        const versusV5 = compareFinishAdvantageOpenArms(
            armRows,
            v5ComparisonAliasRows,
            "visibility_aware_final_building_v5",
        );
        const replacementCount = armObservations.reduce((sum, row) => sum + row.replacement.length, 0);
        const missionCreations = armObservations.reduce((sum, row) => sum + row.factory.length, 0);
        const eligibilityFailures: string[] = [];
        if (!(versusSupalosa.oneSided80Lower > 0)) eligibilityFailures.push("Supalosa paired-score lower bound is not positive");
        if (!(absolute.oneSided80LiteralWinLower > controlAbsolute.literalWinRate &&
            absolute.oneSided80LiteralWinLower > v5Absolute.literalWinRate)) {
            eligibilityFailures.push("Literal-win lower bound does not exceed both comparator point rates");
        }
        if (versusSupalosa.transitions.winToLoss > versusSupalosa.transitions.drawToWin) {
            eligibilityFailures.push("Baseline win-to-loss transitions exceed draw-to-win transitions");
        }
        if (!(versusSupalosa.alliedEffect > 0 && versusSupalosa.sovietEffect > 0)) {
            eligibilityFailures.push("Paired score does not improve in both factions");
        }
        if (!(absolute.oneSided80DrawUpper < v5Absolute.oneSided80DrawUpper)) {
            eligibilityFailures.push("Draw-rate upper bound is not below V5");
        }
        if (replacementCount === 0) eligibilityFailures.push("No deferred factory replacement occurred");
        if (missionCreations === 0) eligibilityFailures.push("No post-replacement attack mission was created");
        return { arm, absolute, versusSupalosa, versusV5, replacementCount, missionCreations,
            eligibilityFailures, eligible: eligibilityFailures.length === 0 };
    });
    const selected = evaluations.filter(({ eligible }) => eligible).sort((left, right) =>
        right.absolute.oneSided80LiteralWinLower - left.absolute.oneSided80LiteralWinLower ||
        right.versusSupalosa.oneSided80Lower - left.versusSupalosa.oneSided80Lower ||
        left.absolute.oneSided80DrawUpper - right.absolute.oneSided80DrawUpper ||
        left.arm.armId.localeCompare(right.arm.armId))[0] ?? null;
    const byArm = Object.fromEntries(campaign.arms.map((arm) => {
        const rows = rowsFor(observations, arm.armId);
        return [arm.armId, { absolute: summarizeFinishAdvantageOpenAbsoluteRates(rows),
            counts: { wins: rows.filter(({ outcome }) => outcome === "win").length,
                draws: rows.filter(({ outcome }) => outcome === "draw").length,
                losses: rows.filter(({ outcome }) => outcome === "loss").length } }];
    }));
    const artifact = { schemaVersion: 1, kind: "progress-triggered-attack-replacement-complete-open-screen-finalizer-v1",
        status: selected ? "ADVANCING_CANDIDATE" : "NO_ADVANCING_CANDIDATE", complete: true,
        technicallyClean: true, developmentOnly: true, notPaperClaimEvidence: true,
        schedulerAccount: "pi_jss233", arrayJobId, controllerJobId: process.env.SLURM_JOB_ID,
        sourceGitCommit: campaign.sourceGitCommit, aggregatorGitCommit, campaignPath, campaignSha256,
        launchedGameCount: 1_080, familyCount: 10, countryCount: 9, reciprocalSlotCount: 2,
        armCount: 6, schedulerJobIds: [...scheduler.values()].sort((a, b) => Number(a) - Number(b)),
        selectedArmId: selected?.arm.armId ?? null, controlAbsolute, v5Absolute, evaluations, byArm,
        artifactRows: observations.map(({ replacement: _replacement, factory: _factory, ...row }) => row) };
    fs.writeFileSync(outFile, JSON.stringify(artifact, null, 2) + "\n", { flag: "wx", mode: 0o600 });
    console.log(JSON.stringify({ status: artifact.status, selectedArmId: artifact.selectedArmId,
        arrayJobId, controllerJobId: artifact.controllerJobId }));
};

const main = async (): Promise<void> => {
    const mode = requiredText("MODE", /^(generate|cell|finalize)$/);
    if (mode === "generate") await generate();
    else if (mode === "cell") await cell();
    else finalize();
};
const invoked = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (import.meta.url === invoked) main().catch((error) => { console.error(error); process.exitCode = 1; });
