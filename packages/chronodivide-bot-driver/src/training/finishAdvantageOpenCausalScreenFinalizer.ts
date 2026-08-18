import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
    FinishAdvantageOpenArm,
    FinishAdvantageOpenArmId,
    FinishAdvantageOpenOutcomeRow,
    compareFinishAdvantageOpenArms,
    evaluateFinishAdvantageOpenCandidate,
    selectFinishAdvantageOpenCandidate,
    summarizeFinishAdvantageOpenAbsoluteRates,
} from "./finishAdvantageOpenCausalScreenAnalysis.js";
import {
    FinishAdvantageOpenCampaign,
    FinishAdvantageOpenCampaignArm,
    sha256File,
    validateFinishAdvantageOpenCampaign,
} from "./finishAdvantageOpenCausalScreenCampaign.js";
import { FinishAdvantageOpenEpisodeResult } from "./finishAdvantageOpenCausalScreenEpisode.js";
import {
    validateFinishAdvantageCompatibilityTelemetry,
    validateTerminalBaseRaceCompatibilityTelemetry,
} from
    "./finishAdvantageCompositeCompatibilityGate.js";
import {
    buildFinishAdvantageIrreversiblePolicy,
    buildFinishAdvantageSurplusPolicy,
} from "./finishAdvantagePolicy.js";
import { FinishAdvantageTelemetry } from "./finishAdvantageStrategy.js";
import { LITERAL_BUILDING_ELIMINATION_ENDPOINT } from "./literalBuildingEliminationEndpoint.js";
import { buildProgressCertifiedConversionPolicyV5 } from "./progressCertifiedConversionPolicyV5.js";
import {
    deriveBotRandomSeed,
    deriveParticipantBotRandomSeed,
    engineSeedToEpochMs,
} from "../benchmark/seededOfflineGame.js";

type RecordValue = Record<string, unknown>;
type SchedulerTask = { schedulerJobId: string; state: "COMPLETED"; exitCode: "0:0"; account: "pi_jss233" };
type ValidatedObservation = FinishAdvantageOpenOutcomeRow & {
    taskIndex: number;
    ticks: number;
    outcomeStatus: string;
    candidateBuildings: number;
    baselineBuildings: number;
    candidateQuitAttempts: number;
    baselineQuitAttempts: number;
    candidateAttributedBuildingDestructionTicks: number[];
    baselineAttributedBuildingDestructionTicks: number[];
    firstObservedEnemyBuildingDamageTick: number | null;
    mechanism: ReturnType<typeof mechanismSummary>;
    mechanismViolations: string[];
};

const SHA256 = /^[0-9a-f]{64}$/;
const OPEN_SCREEN_V3_CAMPAIGN_SHA256 =
    "133d49d2a8ed1f0ed467c986c5c2d017df2adc675f0686972495973fc53b3edc" as const;
const OPEN_SCREEN_V3_SOURCE_COMMIT = "9455404e96522b75bba3779d63765c9964e9ecdc" as const;
const OPEN_SCREEN_V3_ARRAY_JOB_ID = "22610506" as const;
const OPEN_SCREEN_FINALIZER_REPAIR_SHA256 =
    "0f1a982e0874ca40c02abb828a6199700f4ff6f63d016677153c7304e74c999d" as const;
const isRecord = (value: unknown): value is RecordValue =>
    !!value && typeof value === "object" && !Array.isArray(value);
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
const readJson = (filePath: string): unknown => JSON.parse(fs.readFileSync(filePath, "utf8"));
const sha256Value = (value: unknown): string => crypto.createHash("sha256")
    .update(JSON.stringify(value)).digest("hex");
export const matchesOpenScreenRuntimeTrees = (value: unknown, expectedSha256: string): boolean =>
    Array.isArray(value) && SHA256.test(expectedSha256) && sha256Value(value) === expectedSha256;
const readEvents = (filePath: string): RecordValue[] => fs.readFileSync(filePath, "utf8")
    .split("\n").filter(Boolean).map((line, index) => {
        const value = JSON.parse(line) as unknown;
        if (!isRecord(value) || typeof value.event !== "string") {
            throw new Error(`Open-screen event ${index} is malformed`);
        }
        return value;
    });
const finiteInteger = (value: unknown, min = 0): value is number =>
    Number.isSafeInteger(value) && (value as number) >= min;
const forbiddenOnlineField = (value: unknown): string | null => {
    const forbidden = /(^|_)(winner|loser|score|outcome|endpoint|resignation|evaluator)($|_)/i;
    const stack = [value];
    while (stack.length > 0) {
        const item = stack.pop();
        if (Array.isArray(item)) stack.push(...item);
        else if (isRecord(item)) for (const [key, child] of Object.entries(item)) {
            if (forbidden.test(key)) return key;
            stack.push(child);
        }
    }
    return null;
};
const assertFinite = (value: unknown, label: string): void => {
    const stack = [value];
    while (stack.length > 0) {
        const item = stack.pop();
        if (typeof item === "number" && !Number.isFinite(item)) throw new Error(`${label} is non-finite`);
        if (Array.isArray(item)) stack.push(...item);
        else if (isRecord(item)) stack.push(...Object.values(item));
    }
};

export const parseFinishAdvantageOpenSacct = (
    raw: string,
    arrayJobId: string,
): Map<number, SchedulerTask> => {
    const tasks = new Map<number, SchedulerTask>();
    for (const [lineIndex, line] of raw.split("\n").entries()) {
        if (!line) continue;
        const [logicalJobId, schedulerJobId, state, exitCode, account, ...extra] = line.split("|");
        const match = new RegExp(`^${arrayJobId}_(\\d+)$`).exec(logicalJobId);
        const taskIndex = match ? Number(match[1]) : -1;
        if (
            extra.length !== 0 || !match || !/^\d+$/.test(schedulerJobId) || taskIndex < 0 || taskIndex >= 90 ||
            tasks.has(taskIndex) || state !== "COMPLETED" || exitCode !== "0:0" || account !== "pi_jss233"
        ) throw new Error(`Open-screen scheduler row ${lineIndex + 1} is failed, duplicate, or unauthorized`);
        tasks.set(taskIndex, { schedulerJobId, state, exitCode, account });
    }
    if (tasks.size !== 90) throw new Error(`Open-screen sacct returned ${tasks.size}/90 tasks`);
    return tasks;
};

const policyFor = (arm: FinishAdvantageOpenCampaignArm) => arm.kind === "surplus"
    ? buildFinishAdvantageSurplusPolicy(arm.margin!)
    : buildFinishAdvantageIrreversiblePolicy();

export const countFinishAdvantageMechanismTransitions = (
    finish: readonly FinishAdvantageTelemetry[],
) => ({
    certificateRevocations: finish.filter(({ irreversibleCertificateRevoked }) =>
        irreversibleCertificateRevoked).length,
    stallRecoveries: finish.filter(({ stalledTargetId }) => stalledTargetId !== null).length,
});

const mechanismSummary = (result: FinishAdvantageOpenEpisodeResult) => {
    const finish = result.finishAdvantageTelemetry;
    const v5 = result.v5Telemetry;
    const terminalBaseRaceOpportunities = v5.filter(({ event, exactEnemyBuildingCount }) =>
        event === "decision" && exactEnemyBuildingCount === 1);
    const terminalBaseRaceActivations = terminalBaseRaceOpportunities.filter(
        ({ terminalBaseRaceGuardIntervened }) => terminalBaseRaceGuardIntervened === true,
    );
    const visibleApproachByTarget = new Map<number, number>();
    let visibleHandoffs = 0;
    const priorHitPoints = new Map<number, number>();
    let firstDamageTick: number | null = null;
    for (const event of finish) {
        if (event.targetBuildingId !== null && event.targetBuildingHitPoints !== null) {
            const prior = priorHitPoints.get(event.targetBuildingId);
            if (prior !== undefined && event.targetBuildingHitPoints < prior && firstDamageTick === null) {
                firstDamageTick = event.tick;
            }
            priorHitPoints.set(event.targetBuildingId, event.targetBuildingHitPoints);
        }
        if (event.issuedOrder === "approach_exact_unseen_building" && event.targetBuildingId !== null) {
            visibleApproachByTarget.set(event.targetBuildingId, event.tick);
        }
        if (
            event.issuedOrder === "attack_visible_building" && event.targetBuildingId !== null &&
            (visibleApproachByTarget.get(event.targetBuildingId) ?? Number.POSITIVE_INFINITY) < event.tick
        ) visibleHandoffs += 1;
    }
    return {
        directBuildingStrikes: finish.filter(({ issuedOrder }) => issuedOrder === "attack_visible_building").length,
        exactUnseenApproaches: finish.filter(({ issuedOrder }) =>
            issuedOrder === "approach_exact_unseen_building").length,
        visibleHandoffs,
        blockerClears: finish.filter(({ phase }) => phase === "blocker_clear").length,
        baseRaceAbstentions: finish.filter(({ phase }) => phase === "base_defense").length,
        irreversibleActivations: finish.filter(({ irreversibleCertificate, issuedOrder }) =>
            irreversibleCertificate && issuedOrder !== "none").length,
        surplusActivations: finish.filter(({ irreversibleCertificate, issuedOrder }) =>
            !irreversibleCertificate && issuedOrder !== "none").length,
        ...countFinishAdvantageMechanismTransitions(finish),
        livenessProgressEvents: finish.filter(({ objectiveProgress }) => objectiveProgress !== "none").length,
        approachProgressEvents: finish.filter(({ objectiveProgress }) => objectiveProgress === "approach").length,
        blockerProgressEvents: finish.filter(({ objectiveProgress }) =>
            objectiveProgress === "blocker_damage" || objectiveProgress === "blocker_removed").length,
        predecessorFallbacks: finish.filter(({ phase }) => phase === "predecessor_fallback").length,
        v5DecisionEvents: v5.filter(({ event }) => event === "decision").length,
        terminalBaseRaceOpportunities: terminalBaseRaceOpportunities.length,
        terminalBaseRaceActivations: terminalBaseRaceActivations.length,
        terminalBaseRaceNonactivations: terminalBaseRaceOpportunities.length - terminalBaseRaceActivations.length,
        terminalBaseRaceDualPurposeDefenses: terminalBaseRaceActivations.filter((event) => {
            const blockers = new Set(event.blockerIds ?? []);
            return (event.threatIds ?? []).some((id) => blockers.has(id));
        }).length,
        firstObservedEnemyBuildingDamageTick: firstDamageTick,
    };
};

const validateOnlineMechanism = (
    result: FinishAdvantageOpenEpisodeResult,
    arm: FinishAdvantageOpenCampaignArm,
): string[] => {
    const violations: string[] = [];
    if (forbiddenOnlineField(result.v5Telemetry) !== null ||
        forbiddenOnlineField(result.finishAdvantageTelemetry) !== null) {
        violations.push("online policy telemetry contains a forbidden outcome field");
    }
    if (arm.kind === "control") {
        if (result.v5Telemetry.length !== 0 || result.finishAdvantageTelemetry.length !== 0) {
            violations.push("exact Supalosa control emitted overlay telemetry");
        }
        return violations;
    }
    for (const [index, event] of result.v5Telemetry.entries()) if (
        !isRecord(event) || event.schemaVersion !== 4 ||
        event.informationBoundary !== "public_complete_state" ||
        event.mechanism !== "progress_certified_terminal_conversion"
    ) violations.push(`V5 telemetry ${index} identity drifted`);
    if (arm.kind === "v5") {
        if (result.finishAdvantageTelemetry.length !== 0) {
            violations.push("unchanged V5 arm emitted finish-advantage telemetry");
        }
        return violations;
    }
    if (result.terminalBaseRaceMode !== "strict_literal_endpoint_base_race") {
        violations.push("intervention result lacks the strict terminal base-race mode");
    }
    const v5 = buildProgressCertifiedConversionPolicyV5();
    violations.push(...validateTerminalBaseRaceCompatibilityTelemetry(
        result.v5Telemetry,
        "strict_literal_endpoint_base_race",
        v5.directCompletionSafetyMarginTicks,
    ));
    if (arm.kind === "base_race") {
        if (result.finishAdvantageTelemetry.length !== 0) {
            violations.push("base-race isolation arm emitted finish-advantage telemetry");
        }
        return violations;
    }
    const policy = policyFor(arm);
    for (const [index, event] of result.finishAdvantageTelemetry.entries()) {
        violations.push(...validateFinishAdvantageCompatibilityTelemetry(event, policy)
            .map((error) => `finish telemetry ${index}: ${error}`));
    }
    return violations;
};

const validateResult = (
    value: unknown,
    campaign: FinishAdvantageOpenCampaign,
    shard: FinishAdvantageOpenCampaign["shards"][number],
    arm: FinishAdvantageOpenCampaignArm,
    candidateSlot: 0 | 1,
    episodeId: string,
): ValidatedObservation => {
    assertFinite(value, episodeId);
    if (!isRecord(value)) throw new Error(`${episodeId} result is not an object`);
    const expectedWinner = value.winner;
    const expectedScore = expectedWinner === "candidate" ? 1 : expectedWinner === "baseline" ? 0 :
        expectedWinner === "draw" ? 0.5 : null;
    if (
        value.schemaVersion !== 2 || value.episodeId !== episodeId ||
        value.familyId !== shard.familyId || value.mapName !== shard.mapName ||
        value.mapSha256 !== shard.mapSha256 || value.armId !== arm.armId ||
        value.terminalBaseRaceMode !== arm.terminalBaseRaceMode ||
        value.policySha256 !== arm.policySha256 ||
        value.policyInformationBoundary !== (arm.kind === "control" ? "none" : "public_complete_state") ||
        value.endpointVersion !== campaign.endpointVersion || value.endpointSha256 !== campaign.endpointSha256 ||
        value.endpoint !== LITERAL_BUILDING_ELIMINATION_ENDPOINT ||
        value.familyOrdinal !== shard.familyOrdinal || value.countryOrdinal !== shard.countryOrdinal ||
        value.requestedEngineSeed !== shard.requestedEngineSeed ||
        value.botRandomSeed !== deriveBotRandomSeed(shard.requestedEngineSeed) ||
        value.candidateBotRandomSeed !== deriveParticipantBotRandomSeed(shard.requestedEngineSeed, "candidate") ||
        value.baselineBotRandomSeed !== deriveParticipantBotRandomSeed(shard.requestedEngineSeed, "baseline") ||
        value.engineSeedEpochMs !== engineSeedToEpochMs(shard.requestedEngineSeed) ||
        value.candidateSlot !== candidateSlot ||
        value.candidateCountry !== shard.country || value.baselineCountry !== shard.country ||
        value.maxTicks !== campaign.maxTicks || value.shortGame !== false ||
        !finiteInteger(value.ticks, 1) || (value.ticks as number) > campaign.maxTicks ||
        !finiteInteger(value.wallTimeMs) || !isRecord(value.candidateStart) || !isRecord(value.baselineStart) ||
        !Number.isFinite(value.candidateStart.x) || !Number.isFinite(value.candidateStart.y) ||
        !Number.isFinite(value.baselineStart.x) || !Number.isFinite(value.baselineStart.y) ||
        value.candidateStart.x === value.baselineStart.x && value.candidateStart.y === value.baselineStart.y ||
        expectedScore === null || value.candidateScore !== expectedScore || value.technicalFailure !== null ||
        typeof value.engineFinished !== "boolean" || !isRecord(value.terminal) ||
        !isRecord(value.endpointEstablished) || !isRecord(value.quitSuppression) ||
        !isRecord(value.terminalBuildingCounts) || !Array.isArray(value.dispositionHistory) ||
        !Array.isArray(value.v5Telemetry) || !Array.isArray(value.finishAdvantageTelemetry)
    ) throw new Error(`${episodeId} provenance or endpoint schema drifted`);
    const result = value as unknown as FinishAdvantageOpenEpisodeResult;
    if (!result.terminal) throw new Error(`${episodeId} lacks a literal terminal record`);
    const terminal = result.terminal;
    if (
        !finiteInteger(result.terminalBuildingCounts.candidate) ||
        !finiteInteger(result.terminalBuildingCounts.baseline) ||
        !finiteInteger(result.quitSuppression.attempts.candidate) ||
        !finiteInteger(result.quitSuppression.attempts.baseline) ||
        result.quitSuppression.forwarded.candidate !== 0 || result.quitSuppression.forwarded.baseline !== 0 ||
        result.endpointEstablished.candidate !== true || result.endpointEstablished.baseline !== true ||
        (result.winner === "candidate" && (
            result.outcomeStatus !== "candidate_win" || result.terminalBuildingCounts.baseline !== 0 ||
            terminal.status !== "candidate_win" || terminal.winner !== "candidate"
        )) ||
        (result.winner === "baseline" && (
            result.outcomeStatus !== "baseline_win" || result.terminalBuildingCounts.candidate !== 0 ||
            terminal.status !== "baseline_win" || terminal.winner !== "baseline"
        )) ||
        (result.winner === "draw" && !new Set([
            "simultaneous_draw", "engine_nonliteral_termination_draw", "tick_cap_draw",
        ]).has(result.outcomeStatus)) ||
        terminal.status !== result.outcomeStatus || terminal.winner !== result.winner
    ) throw new Error(`${episodeId} literal endpoint or quit suppression drifted`);
    const candidateName = `FinishCandidate_${shard.familyOrdinal}_${shard.countryOrdinal}_${candidateSlot}`;
    const baselineName = `FinishBaseline_${shard.familyOrdinal}_${shard.countryOrdinal}_${candidateSlot}`;
    const physicalTicks = (victim: string): number[] => result.dispositionHistory.filter((row) =>
        row.building.owner === victim && row.kind === "opponent_attributed_physical_destruction" &&
        row.validPhysicalDestruction,
    ).map(({ tick }) => tick);
    const mechanism = mechanismSummary(result);
    const mechanismViolations = validateOnlineMechanism(result, arm);
    return {
        taskIndex: shard.taskIndex,
        armId: arm.armId,
        familyId: shard.familyId,
        country: shard.country,
        candidateSlot,
        outcome: result.winner === "candidate" ? "win" : result.winner === "baseline" ? "loss" : "draw",
        nonterminalDraw: result.outcomeStatus === "engine_nonliteral_termination_draw" ||
            result.outcomeStatus === "tick_cap_draw",
        ticks: result.ticks,
        outcomeStatus: result.outcomeStatus,
        candidateBuildings: result.terminalBuildingCounts.candidate,
        baselineBuildings: result.terminalBuildingCounts.baseline,
        candidateQuitAttempts: result.quitSuppression.attempts.candidate,
        baselineQuitAttempts: result.quitSuppression.attempts.baseline,
        candidateAttributedBuildingDestructionTicks: physicalTicks(baselineName),
        baselineAttributedBuildingDestructionTicks: physicalTicks(candidateName),
        firstObservedEnemyBuildingDamageTick: mechanism.firstObservedEnemyBuildingDamageTick,
        mechanism,
        mechanismViolations,
    };
};

const validateShard = (
    campaign: FinishAdvantageOpenCampaign,
    campaignSha256: string,
    resultsRoot: string,
    arrayJobId: string,
    scheduler: SchedulerTask,
    shard: FinishAdvantageOpenCampaign["shards"][number],
): ValidatedObservation[] => {
    const runDir = path.join(resultsRoot, `task-${String(shard.taskIndex).padStart(3, "0")}`, "run");
    const manifestPath = path.join(runDir, "manifest.json");
    const eventsPath = path.join(runDir, "events.jsonl");
    const summaryPath = path.join(runDir, "summary.json");
    for (const filePath of [manifestPath, eventsPath, summaryPath]) if (!fs.existsSync(filePath)) {
        throw new Error(`Open-screen task ${shard.taskIndex} lacks ${filePath}`);
    }
    const summary = readJson(summaryPath);
    if (
        !isRecord(summary) || summary.schemaVersion !== 1 ||
        summary.status !== "COMPLETE_FINISH_ADVANTAGE_OPEN_CAUSAL_SCREEN_SHARD" ||
        summary.campaignSha256 !== campaignSha256 || summary.taskIndex !== shard.taskIndex ||
        summary.requestedLaunches !== shard.launchedGameCount ||
        summary.accountedLaunches !== shard.launchedGameCount || summary.completed !== shard.launchedGameCount ||
        summary.technicalFailures !== 0 || summary.complete !== true || summary.technicallyClean !== true ||
        summary.outcomeAccess !== "withheld-until-complete-open-screen-finalizer" ||
        !finiteInteger(summary.candidateWins) || !finiteInteger(summary.baselineWins) || !finiteInteger(summary.draws) ||
        Number(summary.candidateWins) + Number(summary.baselineWins) + Number(summary.draws) !==
            shard.launchedGameCount
    ) throw new Error(`Open-screen task ${shard.taskIndex} summary is incomplete or failed`);
    const outer = readJson(manifestPath);
    if (!isRecord(outer) || outer.campaignSha256 !== campaignSha256 ||
        JSON.stringify(outer.shard) !== JSON.stringify(shard) || !isRecord(outer.manifest)) {
        throw new Error(`Open-screen task ${shard.taskIndex} manifest drifted`);
    }
    const manifest = outer.manifest;
    const source = isRecord(manifest.source) ? manifest.source : null;
    const software = isRecord(manifest.software) ? manifest.software : null;
    const baseline = software && isRecord(software.baseline) ? software.baseline : null;
    const baselineRuntime = baseline && isRecord(baseline.runtimeTree) ? baseline.runtimeTree : null;
    const gameApi = software && isRecord(software.gameApiRuntimeTree) ? software.gameApiRuntimeTree : null;
    const inputs = isRecord(manifest.inputs) ? manifest.inputs : null;
    const maps = inputs && Array.isArray(inputs.maps) ? inputs.maps : [];
    const runtimeMap = maps[0];
    if (
        !isRecord(manifest.scheduler) || manifest.scheduler.account !== "pi_jss233" ||
        String(manifest.scheduler.arrayJobId) !== arrayJobId ||
        String(manifest.scheduler.arrayTaskId) !== String(shard.taskIndex) ||
        String(manifest.scheduler.jobId) !== scheduler.schedulerJobId || !source ||
        source.gitCommit !== campaign.sourceGitCommit || source.gitBranch !== "main" || source.trackedDirty !== false ||
        !matchesOpenScreenRuntimeTrees(source.runtimeTrees, campaign.sourceRuntimeSha256) ||
        !baseline || baseline.kind !== "external-package" ||
        baseline.gitCommit !== campaign.externalBaselineGitCommit || baseline.trackedDirty !== false ||
        !baselineRuntime || baselineRuntime.sha256 !== campaign.externalBaselineRuntimeSha256 ||
        !gameApi || gameApi.sha256 !== campaign.gameApiRuntimeSha256 ||
        !software || software.packageLockSha256 !== campaign.packageLockSha256 ||
        !isRecord(runtimeMap) || runtimeMap.exists !== true || runtimeMap.sha256 !== shard.mapSha256
    ) throw new Error(`Open-screen task ${shard.taskIndex} scheduler, source, software, or map drifted`);
    const events = readEvents(eventsPath);
    if (events[0]?.event !== "run_start" || events[events.length - 1]?.event !== "run_complete") {
        throw new Error(`Open-screen task ${shard.taskIndex} event boundaries drifted`);
    }
    const observations: ValidatedObservation[] = [];
    let cursor = 1;
    let launchIndex = 0;
    for (const arm of campaign.arms) for (const candidateSlot of [0, 1] as const) {
        const episodeId = `f${shard.familyOrdinal}-k${shard.countryOrdinal}-a${campaign.arms.indexOf(arm)}-s${candidateSlot}`;
        const launch = events[cursor++];
        if (
            launch?.event !== "launch_counted" || launch.launchIndex !== launchIndex ||
            launch.episodeId !== episodeId || launch.armId !== arm.armId ||
            launch.policySha256 !== arm.policySha256 || launch.candidateSlot !== candidateSlot ||
            launch.familyOrdinal !== shard.familyOrdinal || launch.countryOrdinal !== shard.countryOrdinal ||
            launch.requestedEngineSeed !== shard.requestedEngineSeed
        ) throw new Error(`Open-screen task ${shard.taskIndex} launch ${launchIndex} drifted`);
        const completion = events[cursor++];
        if (completion?.event !== "episode_complete" || completion.launchIndex !== launchIndex) {
            throw new Error(`Open-screen task ${shard.taskIndex} launch ${launchIndex} did not complete cleanly`);
        }
        observations.push(validateResult(
            completion.result,
            campaign,
            shard,
            arm,
            candidateSlot,
            episodeId,
        ));
        launchIndex += 1;
    }
    if (cursor !== events.length - 1 || !isRecord(events[cursor]?.summary)) {
        throw new Error(`Open-screen task ${shard.taskIndex} event accounting drifted`);
    }
    return observations;
};

const armRows = (
    observations: readonly ValidatedObservation[],
    armId: FinishAdvantageOpenArmId,
): FinishAdvantageOpenOutcomeRow[] => observations.filter((row) => row.armId === armId).map((row) => ({
    armId: row.armId,
    familyId: row.familyId,
    country: row.country,
    candidateSlot: row.candidateSlot,
    outcome: row.outcome,
    nonterminalDraw: row.nonterminalDraw,
}));

const aggregateMechanism = (rows: readonly ValidatedObservation[]) => {
    const numericKeys = Object.keys(rows[0]?.mechanism ?? {}).filter((key) =>
        key !== "firstObservedEnemyBuildingDamageTick",
    );
    return {
        ...Object.fromEntries(numericKeys.map((key) => [key, rows.reduce(
            (sum, row) => sum + Number(row.mechanism[key as keyof typeof row.mechanism]), 0,
        )])),
        firstObservedEnemyBuildingDamageTicks: rows.map(({ firstObservedEnemyBuildingDamageTick }) =>
            firstObservedEnemyBuildingDamageTick).filter((tick): tick is number => tick !== null),
        candidateAttributedBuildingDestructionTicks: rows.flatMap(
            ({ candidateAttributedBuildingDestructionTicks }) => candidateAttributedBuildingDestructionTicks,
        ),
        mechanismViolations: [...new Set(rows.flatMap(({ mechanismViolations }) => mechanismViolations))].sort(),
    };
};

const main = (): void => {
    const campaignPath = requiredPath("CAMPAIGN");
    const campaignSha256 = requiredText("CAMPAIGN_SHA256", SHA256);
    const resultsRoot = requiredPath("RESULTS_ROOT");
    const outputPath = requiredPath("OUT_FILE");
    const arrayJobId = requiredText("ARRAY_JOB_ID", /^\d+$/);
    if (process.env.SLURM_JOB_ACCOUNT !== "pi_jss233") {
        throw new Error("Open-screen finalizer requires Slurm account pi_jss233");
    }
    if (fs.existsSync(outputPath)) throw new Error(`Refusing to overwrite ${outputPath}`);
    if (sha256File(campaignPath) !== campaignSha256) throw new Error("Open-screen campaign drifted");
    const campaign = validateFinishAdvantageOpenCampaign(readJson(campaignPath));
    const aggregatorGitCommit = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
    const forkMain = execFileSync("git", ["rev-parse", "fork/main"], { encoding: "utf8" }).trim();
    const branch = execFileSync("git", ["branch", "--show-current"], { encoding: "utf8" }).trim();
    const trackedStatus = execFileSync(
        "git", ["status", "--short", "--untracked-files=no"], { encoding: "utf8" },
    ).trim();
    if (branch !== "main" || trackedStatus !== "" || forkMain !== aggregatorGitCommit) {
        throw new Error("Open-screen finalizer requires clean pushed main");
    }
    const runtimeProgram = process.argv[1] ? path.resolve(process.argv[1]) : null;
    if (!runtimeProgram) throw new Error("Open-screen finalizer program is unavailable");
    let aggregationRepairSha256: string | null = null;
    if (aggregatorGitCommit !== campaign.sourceGitCommit) {
        const repairPath = requiredPath("OPEN_SCREEN_AGGREGATION_REPAIR");
        aggregationRepairSha256 = sha256File(repairPath);
        if (
            campaignSha256 !== OPEN_SCREEN_V3_CAMPAIGN_SHA256 ||
            campaign.sourceGitCommit !== OPEN_SCREEN_V3_SOURCE_COMMIT ||
            arrayJobId !== OPEN_SCREEN_V3_ARRAY_JOB_ID ||
            aggregationRepairSha256 !== OPEN_SCREEN_FINALIZER_REPAIR_SHA256
        ) throw new Error("Open-screen finalizer repair authorization failed");
    } else if (sha256File(runtimeProgram) !== campaign.programs.finalizerSha256) {
        throw new Error("Open-screen finalizer program commitment drifted");
    }
    const scheduler = parseFinishAdvantageOpenSacct(execFileSync(
        "/opt/slurm/current/bin/sacct",
        ["-j", arrayJobId, "-n", "-P", "-X", "--format=JobID,JobIDRaw,State,ExitCode,Account"],
        { encoding: "utf8" },
    ), arrayJobId);
    const observations = campaign.shards.flatMap((shard) => validateShard(
        campaign,
        campaignSha256,
        resultsRoot,
        arrayJobId,
        scheduler.get(shard.taskIndex)!,
        shard,
    ));
    if (observations.length !== campaign.launchedGameCount) {
        throw new Error(`Open-screen observed ${observations.length}/${campaign.launchedGameCount} games`);
    }
    const control = campaign.arms.find(({ kind }) => kind === "control")!;
    const v5 = campaign.arms.find(({ kind }) => kind === "v5")!;
    const controlRows = armRows(observations, control.armId);
    const v5Rows = armRows(observations, v5.armId);
    const interventionArms = campaign.arms.filter(({ kind }) =>
        kind === "base_race" || kind === "irreversible" || kind === "surplus");
    const evaluations = interventionArms.map((arm) => {
        const rows = observations.filter(({ armId }) => armId === arm.armId);
        const mechanism = aggregateMechanism(rows);
        return {
            ...evaluateFinishAdvantageOpenCandidate(
                arm as FinishAdvantageOpenArm,
                armRows(observations, arm.armId),
                controlRows,
                v5Rows,
                mechanism.mechanismViolations,
            ),
            mechanism,
        };
    });
    const selected = selectFinishAdvantageOpenCandidate(evaluations);
    const byArm = Object.fromEntries(campaign.arms.map((arm) => {
        const rows = observations.filter(({ armId }) => armId === arm.armId);
        return [arm.armId, {
            games: rows.length,
            wins: rows.filter(({ outcome }) => outcome === "win").length,
            draws: rows.filter(({ outcome }) => outcome === "draw").length,
            nonterminalDraws: rows.filter(({ nonterminalDraw }) => nonterminalDraw).length,
            losses: rows.filter(({ outcome }) => outcome === "loss").length,
            absolute: summarizeFinishAdvantageOpenAbsoluteRates(
                armRows(observations, arm.armId),
            ),
            meanTicks: rows.reduce((sum, { ticks }) => sum + ticks, 0) / rows.length,
            mechanism: aggregateMechanism(rows),
            versusExternalSupalosa: arm.kind === "control" ? null : compareFinishAdvantageOpenArms(
                armRows(observations, arm.armId), controlRows, control.armId,
            ),
            versusV5: arm.kind === "control" || arm.kind === "v5" ? null : compareFinishAdvantageOpenArms(
                armRows(observations, arm.armId), v5Rows, v5.armId,
            ),
        }];
    }));
    const artifactRows = campaign.shards.map((shard) => {
        const runDir = path.join(resultsRoot, `task-${String(shard.taskIndex).padStart(3, "0")}`, "run");
        return {
            taskIndex: shard.taskIndex,
            manifestSha256: sha256File(path.join(runDir, "manifest.json")),
            eventsSha256: sha256File(path.join(runDir, "events.jsonl")),
            summarySha256: sha256File(path.join(runDir, "summary.json")),
            schedulerJobId: scheduler.get(shard.taskIndex)!.schedulerJobId,
        };
    });
    const output = {
        schemaVersion: 2,
        kind: "finish-advantage-complete-open-causal-screen-finalizer",
        status: selected ? "ADVANCING_FINISH_ADVANTAGE_CANDIDATE" : "NO_ADVANCING_CANDIDATE",
        generatedAt: new Date().toISOString(),
        complete: true,
        technicallyClean: true,
        developmentOnly: true,
        notPaperClaimEvidence: true,
        campaignPath,
        campaignSha256,
        sourceGitCommit: campaign.sourceGitCommit,
        aggregatorGitCommit,
        aggregationRepairSha256,
        arrayJobId,
        controllerJobId: process.env.SLURM_JOB_ID ?? null,
        schedulerAccount: process.env.SLURM_JOB_ACCOUNT,
        schedulerJobIds: [...scheduler.values()].map(({ schedulerJobId }) => schedulerJobId),
        launchedGameCount: campaign.launchedGameCount,
        armCount: campaign.armCount,
        familyCount: campaign.familyCount,
        countryCount: campaign.countryCount,
        reciprocalSlotCount: campaign.reciprocalSlotCount,
        selectedArmId: selected?.arm.armId ?? null,
        evaluations,
        byArm,
        artifactCommitmentSha256: crypto.createHash("sha256").update(JSON.stringify(artifactRows)).digest("hex"),
        artifactRows,
    };
    fs.mkdirSync(path.dirname(outputPath), { recursive: true, mode: 0o700 });
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2) + "\n", { flag: "wx", mode: 0o600 });
    console.log(JSON.stringify({ outFile: outputPath, sha256: sha256File(outputPath), status: output.status }));
};

const invoked = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (import.meta.url === invoked) {
    try { main(); } catch (error) { console.error(error); process.exitCode = 1; }
}
