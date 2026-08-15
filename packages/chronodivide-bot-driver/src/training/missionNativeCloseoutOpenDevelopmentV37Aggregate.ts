import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { isDeepStrictEqual } from "node:util";
import { BuildingEliminationTelemetryEvent } from
    "@supalosa/chronodivide-bot/dist/bot/logic/mission/missions/buildingEliminationMission.js";
import { derivePairedEngineSeed } from "../benchmark/seededOfflineGame.js";
import {
    LITERAL_BUILDING_ELIMINATION_ENDPOINT_SHA256,
    LITERAL_BUILDING_ELIMINATION_ENDPOINT_VERSION,
} from "./literalBuildingEliminationEndpoint.js";
import {
    MISSION_NATIVE_CLOSEOUT_ARM_ORDER_V2,
    MissionNativeCloseoutArmIdV2,
    buildMissionNativeCloseoutArmsV2,
} from "./missionNativeCloseoutExperimentPolicy.js";
import {
    parseMissionNativeCloseoutOpenDevelopmentRunPlan,
    sha256File,
} from "./missionNativeCloseoutOpenDevelopmentPlanRunner.js";
import {
    parseMissionNativeCloseoutOpenDevelopmentSacct,
    validateMissionNativeCloseoutOpenDevelopmentResult,
} from "./missionNativeCloseoutOpenDevelopmentTechnicalGate.js";
import { validateMissionNativeCloseoutV37ProgressTelemetry } from "./missionNativeCloseoutGateV37.js";
import {
    MISSION_NATIVE_CLOSEOUT_V37_ADVANCEMENT_RULE,
    MISSION_NATIVE_CLOSEOUT_V37_C1_GATE_SHA256,
    MISSION_NATIVE_CLOSEOUT_V37_ONE_SIDED_80_T_CRITICAL_DF9,
    MISSION_NATIVE_CLOSEOUT_V37_OPEN_DEVELOPMENT_BASELINE_COMMIT,
    MISSION_NATIVE_CLOSEOUT_V37_OPEN_DEVELOPMENT_COUNTRIES,
    MISSION_NATIVE_CLOSEOUT_V37_OPEN_DEVELOPMENT_ENGINE_SEED_BASE,
    MISSION_NATIVE_CLOSEOUT_V37_OPEN_DEVELOPMENT_FAMILIES,
    MISSION_NATIVE_CLOSEOUT_V37_OPEN_DEVELOPMENT_FAMILY_COUNT,
    MISSION_NATIVE_CLOSEOUT_V37_OPEN_DEVELOPMENT_LAUNCH_COUNT,
    MISSION_NATIVE_CLOSEOUT_V37_OPEN_DEVELOPMENT_MAX_TICKS,
    MISSION_NATIVE_CLOSEOUT_V37_OPEN_DEVELOPMENT_PROTOCOL_SHA256,
    MISSION_NATIVE_CLOSEOUT_V37_OPEN_DEVELOPMENT_SHARD_COUNT,
    MISSION_NATIVE_CLOSEOUT_V37_R2_GATE_SHA256,
    MissionNativeCloseoutV37OpenDevelopmentCampaign,
    buildMissionNativeCloseoutV37OpenDevelopmentEpisodes,
} from "./missionNativeCloseoutOpenDevelopmentV37Campaign.js";

type RecordValue = Record<string, unknown>;
type Outcome = "candidate" | "baseline" | "draw";
type Observation = {
    shardIndex: number;
    familyId: string;
    country: string;
    faction: "Allied" | "Soviet";
    candidateSlot: 0 | 1;
    armId: MissionNativeCloseoutArmIdV2;
    outcome: Outcome;
    outcomeStatus: string;
    literalWin: number;
    score: number;
    ticks: number;
    engineFinished: boolean;
    candidateBuildings: number;
    baselineBuildings: number;
    candidateQuitAttempts: number;
    baselineQuitAttempts: number;
    telemetry: BuildingEliminationTelemetryEvent[];
};

export type MissionNativeCloseoutV37PositiveGateInput = {
    technicalPass: boolean;
    primaryLowerBound: number;
    wins: number;
    losses: number;
    alliedWins: number;
    alliedLosses: number;
    sovietWins: number;
    sovietLosses: number;
    countriesWithWinsExceedingLosses: number;
    v37FamilyMacroWinProbability: number;
    externalFamilyMacroWinProbability: number;
    v34FamilyMacroWinProbability: number;
    v37FamilyMacroDrawProbability: number;
    externalFamilyMacroDrawProbability: number;
    v34FamilyMacroDrawProbability: number;
    leaveOneFamilyOutEffects: readonly number[];
};

export const evaluateMissionNativeCloseoutV37PositiveGate = (
    input: MissionNativeCloseoutV37PositiveGateInput,
) => ({
    allLaunchesTechnicallyClean: input.technicalPass,
    primaryFamilyClustered80LowerPairedScoreEffectAboveZero: input.primaryLowerBound > 0,
    v37LiteralWinsExceedLossesOverall: input.wins > input.losses,
    v37AlliedLiteralWinsExceedLosses: input.alliedWins > input.alliedLosses,
    v37SovietLiteralWinsExceedLosses: input.sovietWins > input.sovietLosses,
    countriesWithV37WinsExceedingLossesAtLeastSeven: input.countriesWithWinsExceedingLosses >= 7,
    v37FamilyMacroWinProbabilityAboveExternal:
        input.v37FamilyMacroWinProbability > input.externalFamilyMacroWinProbability,
    v37FamilyMacroWinProbabilityAboveV34:
        input.v37FamilyMacroWinProbability > input.v34FamilyMacroWinProbability,
    v37FamilyMacroDrawProbabilityBelowExternal:
        input.v37FamilyMacroDrawProbability < input.externalFamilyMacroDrawProbability,
    v37FamilyMacroDrawProbabilityBelowV34:
        input.v37FamilyMacroDrawProbability < input.v34FamilyMacroDrawProbability,
    everyLeaveOneFamilyOutPrimaryEffectPositive:
        input.leaveOneFamilyOutEffects.length === MISSION_NATIVE_CLOSEOUT_V37_OPEN_DEVELOPMENT_FAMILY_COUNT &&
        input.leaveOneFamilyOutEffects.every((value) => value > 0),
});

const ALLIED = new Set(["Americans", "Alliance", "French", "Germans", "British"]);
const SHA256 = /^[0-9a-f]{64}$/;
const COMMIT = /^[0-9a-f]{40}$/;
const isRecord = (value: unknown): value is RecordValue =>
    typeof value === "object" && value !== null && !Array.isArray(value);
export const areMissionNativeCloseoutV37CommitmentsStructurallyEqual = (
    actual: unknown,
    expected: unknown,
): boolean => isDeepStrictEqual(actual, expected);
const readJson = (filePath: string): unknown => JSON.parse(fs.readFileSync(filePath, "utf8"));
const requiredPath = (name: string): string => {
    const value = process.env[name];
    if (!value) throw new Error(`${name} is required`);
    return path.resolve(value);
};
const requiredText = (name: string, pattern: RegExp): string => {
    const value = process.env[name];
    if (!value || !pattern.test(value)) throw new Error(`${name} is missing or invalid`);
    return value;
};
const mean = (values: readonly number[]): number => {
    if (values.length === 0) throw new Error("Cannot calculate an empty mean");
    return values.reduce((sum, value) => sum + value, 0) / values.length;
};
const sampleSd = (values: readonly number[]): number => {
    if (values.length < 2) throw new Error("Sample standard deviation requires at least two values");
    const center = mean(values);
    return Math.sqrt(values.reduce((sum, value) => sum + (value - center) ** 2, 0) / (values.length - 1));
};
const median = (values: readonly number[]): number | null => {
    if (values.length === 0) return null;
    const sorted = values.slice().sort((left, right) => left - right);
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
};
const countBy = (values: readonly string[]): Record<string, number> => values.reduce<Record<string, number>>(
    (counts, value) => ({ ...counts, [value]: (counts[value] ?? 0) + 1 }),
    {},
);
const sha256Text = (value: string): string => crypto.createHash("sha256").update(value).digest("hex");

export const validateMissionNativeCloseoutV37Campaign = (
    value: unknown,
): MissionNativeCloseoutV37OpenDevelopmentCampaign => {
    if (
        !isRecord(value) || value.schemaVersion !== 1 ||
        value.kind !== "mission-native-closeout-v37-open-development-literal-endpoint" ||
        value.status !== "FROZEN_MISSION_NATIVE_CLOSEOUT_V37_OPEN_DEVELOPMENT_V2_ENDPOINT_V5" ||
        !COMMIT.test(String(value.sourceGitCommit)) || !SHA256.test(String(value.sourceRuntimeSha256)) ||
        value.baselineGitCommit !== MISSION_NATIVE_CLOSEOUT_V37_OPEN_DEVELOPMENT_BASELINE_COMMIT ||
        !SHA256.test(String(value.baselineRuntimeSha256)) || !SHA256.test(String(value.gameApiRuntimeSha256)) ||
        !SHA256.test(String(value.packageLockSha256)) || !SHA256.test(String(value.populationSha256)) ||
        value.protocolSha256 !== MISSION_NATIVE_CLOSEOUT_V37_OPEN_DEVELOPMENT_PROTOCOL_SHA256 ||
        typeof value.protocolPath !== "string" || value.endpointVersion !== LITERAL_BUILDING_ELIMINATION_ENDPOINT_VERSION ||
        value.endpointSha256 !== LITERAL_BUILDING_ELIMINATION_ENDPOINT_SHA256 ||
        value.outcomeAccess !== "permanently-open-development-only-no-paper-claim" ||
        value.familyCount !== MISSION_NATIVE_CLOSEOUT_V37_OPEN_DEVELOPMENT_FAMILY_COUNT ||
        value.countryCount !== MISSION_NATIVE_CLOSEOUT_V37_OPEN_DEVELOPMENT_COUNTRIES.length ||
        value.reciprocalSlotCount !== 2 || value.policyCount !== 3 ||
        value.shardCount !== MISSION_NATIVE_CLOSEOUT_V37_OPEN_DEVELOPMENT_SHARD_COUNT ||
        value.launchedGameCount !== MISSION_NATIVE_CLOSEOUT_V37_OPEN_DEVELOPMENT_LAUNCH_COUNT ||
        value.engineSeedBase !== MISSION_NATIVE_CLOSEOUT_V37_OPEN_DEVELOPMENT_ENGINE_SEED_BASE ||
        value.maxTicks !== MISSION_NATIVE_CLOSEOUT_V37_OPEN_DEVELOPMENT_MAX_TICKS ||
        !Array.isArray(value.countries) || !Array.isArray(value.advancementRule) || !Array.isArray(value.arms) ||
        !Array.isArray(value.selectedFamilies) || !Array.isArray(value.shards) || !Array.isArray(value.technicalEvidence)
    ) throw new Error("V37 open-development campaign has an invalid frozen schema");
    const campaign = value as unknown as MissionNativeCloseoutV37OpenDevelopmentCampaign;
    const expectedArms = buildMissionNativeCloseoutArmsV2();
    const expectedFamilies = MISSION_NATIVE_CLOSEOUT_V37_OPEN_DEVELOPMENT_FAMILIES;
    if (
        JSON.stringify(campaign.countries) !== JSON.stringify(MISSION_NATIVE_CLOSEOUT_V37_OPEN_DEVELOPMENT_COUNTRIES) ||
        JSON.stringify(campaign.advancementRule) !== JSON.stringify(MISSION_NATIVE_CLOSEOUT_V37_ADVANCEMENT_RULE) ||
        JSON.stringify(campaign.arms) !== JSON.stringify(expectedArms) ||
        JSON.stringify(campaign.selectedFamilies) !== JSON.stringify(expectedFamilies) ||
        campaign.populationSha256 !== sha256Text(JSON.stringify(expectedFamilies)) ||
        sha256File(campaign.protocolPath) !== MISSION_NATIVE_CLOSEOUT_V37_OPEN_DEVELOPMENT_PROTOCOL_SHA256
    ) throw new Error("V37 campaign population, arms, protocol, or advancement rule drifted");
    const evidenceSpecs = [
        ["v37_literal_endpoint_interfaces", MISSION_NATIVE_CLOSEOUT_V37_R2_GATE_SHA256,
            "22284109", "22284108", "PASS_OUTCOME_FREE_V37_R2_LITERAL_ENDPOINT_INTERFACES"],
        ["v37_all_country_compatibility", MISSION_NATIVE_CLOSEOUT_V37_C1_GATE_SHA256,
            "22287905", "22287904", "PASS_OUTCOME_FREE_V37_C1_ALL_COUNTRY_COMPATIBILITY"],
    ] as const;
    if (campaign.technicalEvidence.length !== evidenceSpecs.length || campaign.technicalEvidence.some((evidence, index) => {
        const [role, digest, controllerJobId, arrayJobId, status] = evidenceSpecs[index];
        const raw = readJson(evidence.path);
        return evidence.role !== role || evidence.sha256 !== digest || evidence.controllerJobId !== controllerJobId ||
            evidence.status !== status || sha256File(evidence.path) !== digest || !isRecord(raw) ||
            raw.status !== status || raw.passed !== true || raw.outcomeFree !== true ||
            raw.schedulerAccount !== "pi_jss233" || raw.arrayJobId !== arrayJobId ||
            path.basename(path.dirname(evidence.path)) !== `controller-${controllerJobId}` ||
            !Array.isArray(raw.schedulerJobIds) || raw.schedulerJobIds.length !== 18 ||
            raw.schedulerJobIds.some((jobId) => typeof jobId !== "string" || !/^\d+$/.test(jobId)) ||
            raw.sourceGitCommit !== evidence.sourceGitCommit ||
            raw.artifactCommitmentSha256 !== evidence.artifactCommitmentSha256 ||
            !Array.isArray(raw.outcomeFieldsEmitted) || raw.outcomeFieldsEmitted.length !== 0;
    })) throw new Error("V37 campaign technical-evidence chain drifted");
    if (campaign.shards.some((shard, index) => {
        const familyIndex = Math.floor(index / MISSION_NATIVE_CLOSEOUT_V37_OPEN_DEVELOPMENT_COUNTRIES.length);
        const countryIndex = index % MISSION_NATIVE_CLOSEOUT_V37_OPEN_DEVELOPMENT_COUNTRIES.length;
        const family = expectedFamilies[familyIndex];
        const requestedEngineSeed = derivePairedEngineSeed(
            MISSION_NATIVE_CLOSEOUT_V37_OPEN_DEVELOPMENT_ENGINE_SEED_BASE,
            index,
        );
        return shard.shardIndex !== index || shard.familyId !== family.familyId ||
            shard.mapName !== family.mapName || shard.mapSha256 !== family.mapSha256 ||
            shard.country !== MISSION_NATIVE_CLOSEOUT_V37_OPEN_DEVELOPMENT_COUNTRIES[countryIndex] ||
            shard.seedBlockIndex !== index || shard.requestedEngineSeed !== requestedEngineSeed ||
            shard.launchedGameCount !== 6 || !fs.existsSync(shard.planFile) ||
            sha256File(shard.planFile) !== shard.planSha256;
    })) throw new Error("V37 campaign shard schedule or plan commitment drifted");
    return campaign;
};

const parseEvents = (eventsPath: string): RecordValue[] => fs.readFileSync(eventsPath, "utf8")
    .split("\n").filter(Boolean).map((line, index) => {
        const value = JSON.parse(line) as unknown;
        if (!isRecord(value) || typeof value.event !== "string") throw new Error(`Malformed V37 event ${index}`);
        return value;
    });

const outcomeCounts = (rows: readonly Observation[]) => ({
    games: rows.length,
    wins: rows.filter(({ outcome }) => outcome === "candidate").length,
    draws: rows.filter(({ outcome }) => outcome === "draw").length,
    losses: rows.filter(({ outcome }) => outcome === "baseline").length,
    literalWinProbability: mean(rows.map(({ literalWin }) => literalWin)),
    drawProbability: mean(rows.map(({ outcome }) => Number(outcome === "draw"))),
    score: mean(rows.map(({ score }) => score)),
    meanTicks: mean(rows.map(({ ticks }) => ticks)),
    medianLiteralWinTick: median(rows.filter(({ outcome }) => outcome === "candidate").map(({ ticks }) => ticks)),
    terminalStatusCounts: countBy(rows.map(({ outcomeStatus }) => outcomeStatus)),
    engineFinishedGames: rows.filter(({ engineFinished }) => engineFinished).length,
    suppressedQuitAttempts: {
        candidate: rows.reduce((sum, row) => sum + row.candidateQuitAttempts, 0),
        baseline: rows.reduce((sum, row) => sum + row.baselineQuitAttempts, 0),
    },
    terminalBuildingCounts: {
        candidateMean: mean(rows.map(({ candidateBuildings }) => candidateBuildings)),
        baselineMean: mean(rows.map(({ baselineBuildings }) => baselineBuildings)),
    },
});

const validateShard = (
    campaign: MissionNativeCloseoutV37OpenDevelopmentCampaign,
    resultsRoot: string,
    arrayJobId: string,
    schedulerJobId: string,
    shard: MissionNativeCloseoutV37OpenDevelopmentCampaign["shards"][number],
): { observations: Observation[]; exposures: string[] } => {
    const resultDir = path.join(resultsRoot, `${arrayJobId}_${shard.shardIndex}`, "run");
    const manifestPath = path.join(resultDir, "manifest.json");
    const summaryPath = path.join(resultDir, "summary.json");
    const eventsPath = path.join(resultDir, "events.jsonl");
    for (const required of [manifestPath, summaryPath, eventsPath]) {
        if (!fs.existsSync(required)) throw new Error(`V37 shard ${shard.shardIndex} lacks ${required}`);
    }
    const summary = readJson(summaryPath);
    if (
        !isRecord(summary) || summary.schemaVersion !== 2 ||
        summary.status !== "COMPLETE_MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_SHARD" ||
        summary.runId !== shard.runId || summary.planSha256 !== shard.planSha256 ||
        summary.requestedLaunches !== 6 || summary.accountedLaunches !== 6 || summary.completed !== 6 ||
        summary.technicalFailures !== 0 || summary.complete !== true || summary.technicallyClean !== true ||
        summary.outcomeAccess !== "open-development-only" || !Number.isSafeInteger(summary.candidateWins) ||
        !Number.isSafeInteger(summary.baselineWins) || !Number.isSafeInteger(summary.draws) ||
        (summary.candidateWins as number) + (summary.baselineWins as number) + (summary.draws as number) !== 6
    ) throw new Error(`V37 shard ${shard.shardIndex} summary is not one complete clean block`);
    const outer = readJson(manifestPath);
    if (!isRecord(outer) || outer.planSha256 !== shard.planSha256 || !isRecord(outer.plan) || !isRecord(outer.manifest)) {
        throw new Error(`V37 shard ${shard.shardIndex} manifest is malformed`);
    }
    const plan = parseMissionNativeCloseoutOpenDevelopmentRunPlan(outer.plan);
    if (
        plan.runId !== shard.runId || plan.sourceGitCommit !== campaign.sourceGitCommit ||
        plan.sourceRuntimeSha256 !== campaign.sourceRuntimeSha256 || plan.baselineGitCommit !== campaign.baselineGitCommit ||
        plan.baselineRuntimeSha256 !== campaign.baselineRuntimeSha256 || plan.gameApiRuntimeSha256 !== campaign.gameApiRuntimeSha256 ||
        plan.packageLockSha256 !== campaign.packageLockSha256 ||
        plan.sourcePopulationCommitmentSha256 !== campaign.populationSha256 ||
        plan.endpointVersion !== campaign.endpointVersion || plan.endpointSha256 !== campaign.endpointSha256 ||
        plan.family.familyId !== shard.familyId || plan.family.mapName !== shard.mapName ||
        plan.family.mapSha256 !== shard.mapSha256 || plan.country !== shard.country ||
        plan.engineSeedBase !== campaign.engineSeedBase || plan.seedBlockIndex !== shard.seedBlockIndex ||
        plan.requestedEngineSeed !== shard.requestedEngineSeed || plan.maxTicks !== campaign.maxTicks ||
        !areMissionNativeCloseoutV37CommitmentsStructurallyEqual(plan.arms, campaign.arms) ||
        !areMissionNativeCloseoutV37CommitmentsStructurallyEqual(
            plan.episodes,
            buildMissionNativeCloseoutV37OpenDevelopmentEpisodes(campaign.arms),
        )
    ) throw new Error(`V37 shard ${shard.shardIndex} plan commitments drifted`);
    const manifest = outer.manifest;
    const scheduler = manifest.scheduler;
    const source = manifest.source;
    const software = manifest.software;
    const baseline = isRecord(software) ? software.baseline : null;
    const gameApiRuntimeTree = isRecord(software) ? software.gameApiRuntimeTree : null;
    const packageLockSha256 = isRecord(software) ? software.packageLockSha256 : null;
    if (
        !isRecord(scheduler) || scheduler.account !== "pi_jss233" || String(scheduler.arrayJobId) !== arrayJobId ||
        String(scheduler.arrayTaskId) !== String(shard.shardIndex) || String(scheduler.jobId) !== schedulerJobId ||
        !isRecord(source) || source.gitCommit !== campaign.sourceGitCommit || source.gitBranch !== "main" ||
        source.trackedDirty !== false || !isRecord(baseline) || baseline.kind !== "external-package" ||
        baseline.gitCommit !== campaign.baselineGitCommit || baseline.trackedDirty !== false ||
        !isRecord(baseline.runtimeTree) || baseline.runtimeTree.sha256 !== campaign.baselineRuntimeSha256 ||
        !isRecord(gameApiRuntimeTree) || gameApiRuntimeTree.sha256 !== campaign.gameApiRuntimeSha256 ||
        packageLockSha256 !== campaign.packageLockSha256
    ) throw new Error(`V37 shard ${shard.shardIndex} scheduler or software provenance drifted`);
    const events = parseEvents(eventsPath);
    if (events[0]?.event !== "run_start" || events[events.length - 1]?.event !== "run_complete") {
        throw new Error(`V37 shard ${shard.shardIndex} boundary events drifted`);
    }
    const observations: Observation[] = [];
    const exposures = new Set<string>();
    let cursor = 1;
    for (let launchIndex = 0; launchIndex < plan.episodes.length; launchIndex += 1) {
        const episode = plan.episodes[launchIndex];
        const arm = plan.arms.find(({ armId }) => armId === episode.armId);
        const launch = events[cursor++];
        if (
            !arm || launch?.event !== "launch_counted" || launch.launchIndex !== launchIndex ||
            launch.episodeId !== episode.episodeId || launch.familyId !== shard.familyId ||
            launch.country !== shard.country || launch.armId !== episode.armId || launch.policyId !== episode.policyId ||
            launch.seedBlockIndex !== shard.seedBlockIndex || launch.requestedEngineSeed !== shard.requestedEngineSeed ||
            launch.candidateSlot !== episode.candidateSlot
        ) throw new Error(`V37 shard ${shard.shardIndex} launch ${launchIndex} drifted`);
        const completion = events[cursor++];
        if (completion?.event !== "episode_complete" || completion.launchIndex !== launchIndex) {
            throw new Error(`V37 shard ${shard.shardIndex} launch ${launchIndex} did not complete cleanly`);
        }
        const result = validateMissionNativeCloseoutOpenDevelopmentResult(completion.result, {
            episodeId: episode.episodeId,
            familyId: shard.familyId,
            mapName: shard.mapName,
            mapSha256: shard.mapSha256,
            policyId: arm.policyId,
            candidateCore: arm.policy.candidateCore,
            missionPolicyId: arm.policy.missionPolicyId,
            informationBoundary: arm.policy.missionPolicy?.informationInterface ?? "none",
            candidateSlot: episode.candidateSlot,
            country: shard.country,
            seedBlockIndex: shard.seedBlockIndex,
            requestedEngineSeed: shard.requestedEngineSeed,
            maxTicks: campaign.maxTicks,
        });
        if (
            arm.policy.missionPolicy !== null && result.policyTelemetry.some(({ event }) =>
                event === "activated" || event === "objective_race_allocation" || event === "objective_physical_progress")
        ) exposures.add(`${arm.armId}|slot${episode.candidateSlot}`);
        observations.push({
            shardIndex: shard.shardIndex,
            familyId: shard.familyId,
            country: shard.country,
            faction: ALLIED.has(shard.country) ? "Allied" : "Soviet",
            candidateSlot: episode.candidateSlot,
            armId: episode.armId as MissionNativeCloseoutArmIdV2,
            outcome: result.winner as Outcome,
            outcomeStatus: result.outcomeStatus,
            literalWin: result.winner === "candidate" ? 1 : 0,
            score: result.winner === "candidate" ? 1 : result.winner === "baseline" ? 0 : 0.5,
            ticks: result.ticks,
            engineFinished: result.engineFinished,
            candidateBuildings: result.terminalBuildingCounts.candidate,
            baselineBuildings: result.terminalBuildingCounts.baseline,
            candidateQuitAttempts: result.quitSuppression.attempts.candidate,
            baselineQuitAttempts: result.quitSuppression.attempts.baseline,
            telemetry: result.policyTelemetry,
        });
    }
    if (cursor !== events.length - 1 || !isRecord(events[cursor]?.summary)) {
        throw new Error(`V37 shard ${shard.shardIndex} event accounting is incomplete`);
    }
    return { observations, exposures: [...exposures] };
};

const artifactCommitment = (
    campaign: MissionNativeCloseoutV37OpenDevelopmentCampaign,
    resultsRoot: string,
    arrayJobId: string,
): string => sha256Text(JSON.stringify(campaign.shards.map(({ shardIndex }) => {
    const root = path.join(resultsRoot, `${arrayJobId}_${shardIndex}`, "run");
    return {
        shardIndex,
        manifestSha256: sha256File(path.join(root, "manifest.json")),
        summarySha256: sha256File(path.join(root, "summary.json")),
        eventsSha256: sha256File(path.join(root, "events.jsonl")),
    };
})));

const main = (): void => {
    const campaignPath = requiredPath("CAMPAIGN");
    const resultsRoot = requiredPath("RESULTS_ROOT");
    const outputPath = requiredPath("OUT_FILE");
    const campaignSha256 = requiredText("CAMPAIGN_SHA256", SHA256);
    const arrayJobId = requiredText("ARRAY_JOB_ID", /^\d+$/);
    if (fs.existsSync(outputPath)) throw new Error(`Refusing to overwrite V37 aggregate ${outputPath}`);
    if (sha256File(campaignPath) !== campaignSha256) throw new Error("V37 campaign file drifted from launch commitment");
    const campaign = validateMissionNativeCloseoutV37Campaign(readJson(campaignPath));
    const gitCommit = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
    const gitBranch = execFileSync("git", ["branch", "--show-current"], { encoding: "utf8" }).trim();
    const dirty = execFileSync("git", ["status", "--short", "--untracked-files=no"], { encoding: "utf8" }).trim();
    if (gitBranch !== "main" || dirty || gitCommit !== campaign.sourceGitCommit) {
        throw new Error("V37 aggregate requires the exact clean evaluated main revision");
    }
    const schedulerTasks = parseMissionNativeCloseoutOpenDevelopmentSacct(execFileSync(
        "/opt/slurm/current/bin/sacct",
        ["-j", arrayJobId, "-n", "-P", "-X", "--format=JobID,JobIDRaw,State,ExitCode,Account"],
        { encoding: "utf8" },
    ), arrayJobId);
    const observations: Observation[] = [];
    const exposureByCountry = new Map<string, Set<string>>();
    for (const shard of campaign.shards) {
        const schedulerTask = schedulerTasks.get(shard.shardIndex);
        if (!schedulerTask) throw new Error(`V37 shard ${shard.shardIndex} lacks its scheduler task`);
        const validated = validateShard(campaign, resultsRoot, arrayJobId, schedulerTask.schedulerJobId, shard);
        observations.push(...validated.observations);
        const exposure = exposureByCountry.get(shard.country) ?? new Set<string>();
        validated.exposures.forEach((key) => exposure.add(key));
        exposureByCountry.set(shard.country, exposure);
    }
    if (observations.length !== MISSION_NATIVE_CLOSEOUT_V37_OPEN_DEVELOPMENT_LAUNCH_COUNT) {
        throw new Error(`V37 aggregate accounted for ${observations.length}/${MISSION_NATIVE_CLOSEOUT_V37_OPEN_DEVELOPMENT_LAUNCH_COUNT} games`);
    }
    const enabledArmIds = MISSION_NATIVE_CLOSEOUT_ARM_ORDER_V2.filter((armId) => armId !== "external_supalosa_control");
    const requiredExposure = enabledArmIds.flatMap((armId) => ([0, 1] as const).map((slot) => `${armId}|slot${slot}`));
    for (const country of MISSION_NATIVE_CLOSEOUT_V37_OPEN_DEVELOPMENT_COUNTRIES) {
        const exposed = exposureByCountry.get(country) ?? new Set<string>();
        const missing = requiredExposure.filter((key) => !exposed.has(key));
        if (missing.length > 0) throw new Error(`V37 intervention exposure is absent for ${country}: ${missing.join(",")}`);
    }

    const families = campaign.selectedFamilies.map(({ familyId }) => familyId);
    const armResults = MISSION_NATIVE_CLOSEOUT_ARM_ORDER_V2.map((armId) => {
        const rows = observations.filter((row) => row.armId === armId);
        const familyMeans = families.map((familyId) => {
            const familyRows = rows.filter((row) => row.familyId === familyId);
            if (familyRows.length !== 18) throw new Error(`${armId} family ${familyId} lacks 18 observations`);
            return {
                familyId,
                literalWinProbability: mean(familyRows.map(({ literalWin }) => literalWin)),
                literalScore: mean(familyRows.map(({ score }) => score)),
                drawProbability: mean(familyRows.map(({ outcome }) => Number(outcome === "draw"))),
            };
        });
        return {
            armId,
            policyId: campaign.arms.find((arm) => arm.armId === armId)!.policyId,
            ...outcomeCounts(rows),
            familyMacroWinProbability: mean(familyMeans.map(({ literalWinProbability }) => literalWinProbability)),
            familyMacroDrawProbability: mean(familyMeans.map(({ drawProbability }) => drawProbability)),
            familyMeans,
            factions: (["Allied", "Soviet"] as const).map((faction) => ({
                faction,
                ...outcomeCounts(rows.filter((row) => row.faction === faction)),
            })),
            countries: MISSION_NATIVE_CLOSEOUT_V37_OPEN_DEVELOPMENT_COUNTRIES.map((country) => ({
                country,
                ...outcomeCounts(rows.filter((row) => row.country === country)),
            })),
            slots: ([0, 1] as const).map((slot) => ({
                candidateSlot: slot,
                ...outcomeCounts(rows.filter((row) => row.candidateSlot === slot)),
            })),
        };
    });
    const external = armResults.find(({ armId }) => armId === "external_supalosa_control")!;
    const v34 = armResults.find(({ armId }) => armId === "mission_native_v34_no_deadline")!;
    const v37 = armResults.find(({ armId }) => armId === "mission_native_v37_recovered_deadline")!;
    const pairedAgainst = (control: typeof v37) => {
        const familyEffects = families.map((familyId) => {
            const selected = v37.familyMeans.find((row) => row.familyId === familyId)!;
            const baseline = control.familyMeans.find((row) => row.familyId === familyId)!;
            return {
                familyId,
                literalScoreEffect: selected.literalScore - baseline.literalScore,
                literalWinProbabilityEffect: selected.literalWinProbability - baseline.literalWinProbability,
                drawProbabilityEffect: selected.drawProbability - baseline.drawProbability,
            };
        });
        return {
            controlArmId: control.armId,
            familyMacroPairedLiteralScoreEffect: mean(familyEffects.map(({ literalScoreEffect }) => literalScoreEffect)),
            familyMacroPairedLiteralWinEffect: mean(familyEffects.map(({ literalWinProbabilityEffect }) => literalWinProbabilityEffect)),
            familyMacroPairedDrawProbabilityEffect: mean(familyEffects.map(({ drawProbabilityEffect }) => drawProbabilityEffect)),
            familyEffects,
        };
    };
    const v37VersusExternal = pairedAgainst(external);
    const v37VersusV34 = pairedAgainst(v34);
    const primaryFamilyEffects = v37VersusExternal.familyEffects.map(({ literalScoreEffect }) => literalScoreEffect);
    const primaryEffect = mean(primaryFamilyEffects);
    const primaryStandardError = sampleSd(primaryFamilyEffects) / Math.sqrt(primaryFamilyEffects.length);
    const primaryLowerBound = primaryEffect -
        MISSION_NATIVE_CLOSEOUT_V37_ONE_SIDED_80_T_CRITICAL_DF9 * primaryStandardError;
    const leaveOneFamilyOut = families.map((omittedFamilyId) => ({
        omittedFamilyId,
        literalScoreEffect: mean(v37VersusExternal.familyEffects
            .filter(({ familyId }) => familyId !== omittedFamilyId)
            .map(({ literalScoreEffect }) => literalScoreEffect)),
    }));
    const v37Allied = v37.factions.find(({ faction }) => faction === "Allied")!;
    const v37Soviet = v37.factions.find(({ faction }) => faction === "Soviet")!;
    const positiveChecks = evaluateMissionNativeCloseoutV37PositiveGate({
        technicalPass: true,
        primaryLowerBound,
        wins: v37.wins,
        losses: v37.losses,
        alliedWins: v37Allied.wins,
        alliedLosses: v37Allied.losses,
        sovietWins: v37Soviet.wins,
        sovietLosses: v37Soviet.losses,
        countriesWithWinsExceedingLosses: v37.countries.filter(({ wins, losses }) => wins > losses).length,
        v37FamilyMacroWinProbability: v37.familyMacroWinProbability,
        externalFamilyMacroWinProbability: external.familyMacroWinProbability,
        v34FamilyMacroWinProbability: v34.familyMacroWinProbability,
        v37FamilyMacroDrawProbability: v37.familyMacroDrawProbability,
        externalFamilyMacroDrawProbability: external.familyMacroDrawProbability,
        v34FamilyMacroDrawProbability: v34.familyMacroDrawProbability,
        leaveOneFamilyOutEffects: leaveOneFamilyOut.map(({ literalScoreEffect }) => literalScoreEffect),
    });
    const advanced = Object.values(positiveChecks).every(Boolean);
    const v37Rows = observations.filter(({ armId }) => armId === "mission_native_v37_recovered_deadline");
    const mechanismEventCounts: Record<string, number> = {};
    const progressKindCounts: Record<string, number> = {};
    const deadlinePhaseCounts: Record<string, number> = {};
    const recoverySummary = {
        predecessorOwnedFallbacks: 0,
        noOwnerRecoveries: 0,
        ownershipLossRecoveries: 0,
        incompleteFallbacks: 0,
        ownershipObservations: 0,
    };
    for (const row of v37Rows) {
        const summary = validateMissionNativeCloseoutV37ProgressTelemetry(row.telemetry, row.ticks);
        for (const key of Object.keys(recoverySummary) as Array<keyof typeof recoverySummary>) {
            recoverySummary[key] += summary[key];
        }
        for (const event of row.telemetry) {
            mechanismEventCounts[event.event] = (mechanismEventCounts[event.event] ?? 0) + 1;
            if ("progressKind" in event && typeof event.progressKind === "string") {
                progressKindCounts[event.progressKind] = (progressKindCounts[event.progressKind] ?? 0) + 1;
            }
            if (event.event === "objective_progress_deadline") {
                deadlinePhaseCounts[event.phase] = (deadlinePhaseCounts[event.phase] ?? 0) + 1;
            }
        }
    }
    const resultArtifactCommitmentSha256 = artifactCommitment(campaign, resultsRoot, arrayJobId);
    const output = {
        schemaVersion: 1,
        status: advanced
            ? "PASS_POSITIVE_MISSION_NATIVE_CLOSEOUT_V37_OPEN_DEVELOPMENT"
            : "FAIL_POSITIVE_MISSION_NATIVE_CLOSEOUT_V37_RETURN_TO_OPEN_DEVELOPMENT",
        generatedAt: new Date().toISOString(),
        interpretationBoundary: "permanently-open-development-only-no-paper-claim",
        campaignPath,
        campaignSha256,
        sourceGitCommit: campaign.sourceGitCommit,
        arrayJobId,
        schedulerAccount: "pi_jss233",
        schedulerJobIds: [...schedulerTasks.values()].map(({ schedulerJobId }) => schedulerJobId),
        resultArtifactCommitmentSha256,
        technicalGate: {
            passed: true,
            shardCount: campaign.shardCount,
            accountedLaunches: observations.length,
            technicalFailures: 0,
            endpointViolations: 0,
            informationBoundaryViolations: 0,
            interventionExposure: Object.fromEntries(MISSION_NATIVE_CLOSEOUT_V37_OPEN_DEVELOPMENT_COUNTRIES.map((country) => [
                country,
                [...(exposureByCountry.get(country) ?? [])].sort(),
            ])),
        },
        armResults,
        primaryEstimand: {
            comparison: "mission_native_v37_recovered_deadline_minus_external_supalosa_control",
            unit: "family",
            familyEffects: v37VersusExternal.familyEffects,
            meanPairedLiteralScoreEffect: primaryEffect,
            sampleStandardDeviation: sampleSd(primaryFamilyEffects),
            standardError: primaryStandardError,
            criticalValue: MISSION_NATIVE_CLOSEOUT_V37_ONE_SIDED_80_T_CRITICAL_DF9,
            oneSidedFamilyClustered80LowerBound: primaryLowerBound,
            leaveOneFamilyOut,
        },
        pairedEffectsOverControls: [v37VersusExternal, v37VersusV34],
        selectedArmId: v37.armId,
        selectedPolicyId: v37.policyId,
        selectedMechanismDiagnostics: {
            eventCounts: mechanismEventCounts,
            physicalProgressCounts: progressKindCounts,
            deadlinePhaseCounts,
            recoverySummary,
        },
        advancementRule: MISSION_NATIVE_CLOSEOUT_V37_ADVANCEMENT_RULE,
        positiveChecks,
        advanced,
    };
    fs.mkdirSync(path.dirname(outputPath), { recursive: true, mode: 0o700 });
    fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`, { flag: "wx", mode: 0o600 });
    console.log(JSON.stringify({
        outputPath,
        outputSha256: sha256File(outputPath),
        status: output.status,
        accountedLaunches: observations.length,
        advanced,
    }));
};

const invoked = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (import.meta.url === invoked) { try { main(); } catch (error) { console.error(error); process.exitCode = 1; } }
