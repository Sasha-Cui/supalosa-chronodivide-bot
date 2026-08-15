import { execFileSync } from "node:child_process";
import { isDeepStrictEqual } from "node:util";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { Countries } from "@supalosa/chronodivide-bot/dist/bot/logic/common/utils.js";
import {
    PROGRESS_CERTIFIED_V5_ADVANCEMENT_RULE,
    PROGRESS_CERTIFIED_V5_ONE_SIDED_80_T_CRITICAL_DF9,
    PROGRESS_CERTIFIED_V5_OPEN_DEVELOPMENT_COUNTRIES,
    PROGRESS_CERTIFIED_V5_OPEN_DEVELOPMENT_FAMILIES,
    PROGRESS_CERTIFIED_V5_OPEN_DEVELOPMENT_LAUNCH_COUNT,
    PROGRESS_CERTIFIED_V5_OPEN_DEVELOPMENT_SHARD_COUNT,
    ProgressCertifiedV5OpenDevelopmentCampaign,
    buildProgressCertifiedV5Episodes,
    validateProgressCertifiedV5OpenDevelopmentCampaign,
} from "./progressCertifiedV5OpenDevelopmentCampaign.js";
import {
    PROGRESS_CERTIFIED_V5_ARM_ORDER,
    ProgressCertifiedV5ArmId,
    buildProgressCertifiedV5Arms,
} from "./progressCertifiedV5ExperimentPolicy.js";
import { ProgressCertifiedEpisodeResult } from "./progressCertifiedEpisode.js";
import { parseProgressCertifiedRunPlan, sha256File } from "./progressCertifiedPlanRunner.js";
import { validateProgressCertifiedResult } from "./progressCertifiedTechnicalGate.js";
import { TerminalObjectiveTelemetry } from "./terminalObjectiveStrategy.js";
import { LITERAL_BUILDING_ELIMINATION_ENDPOINT } from "./literalBuildingEliminationEndpoint.js";

type RecordValue = Record<string, unknown>;
type Outcome = "candidate" | "baseline" | "draw";
type Faction = "Allied" | "Soviet";

export type ProgressCertifiedV5Observation = {
    shardIndex: number;
    familyId: string;
    country: Countries;
    faction: Faction;
    candidateSlot: 0 | 1;
    armId: ProgressCertifiedV5ArmId;
    outcome: Outcome;
    outcomeStatus: string;
    score: 0 | 0.5 | 1;
    ticks: number;
    engineFinished: boolean;
    candidateBuildings: number;
    baselineBuildings: number;
    candidateQuitAttempts: number;
    baselineQuitAttempts: number;
    candidateAttributedBuildingDestructionTicks: number[];
    baselineAttributedBuildingDestructionTicks: number[];
    telemetry: TerminalObjectiveTelemetry[];
};

type SchedulerTask = {
    schedulerJobId: string;
    state: "COMPLETED";
    exitCode: "0:0";
    account: "pi_jss233";
};

type OutcomeCounts = {
    games: number;
    wins: number;
    draws: number;
    losses: number;
    literalWinProbability: number;
    drawProbability: number;
    score: number;
};

const SHA256 = /^[0-9a-f]{64}$/;
const isRecord = (value: unknown): value is RecordValue =>
    !!value && typeof value === "object" && !Array.isArray(value);
const PROGRESS_CERTIFIED_V5_AGGREGATION_REPAIR_PATHS = new Set([
    "packages/chronodivide-bot-driver/src/training/progressCertifiedTechnicalGate.ts",
    "packages/chronodivide-bot-driver/src/test/progressCertifiedTechnicalGate.test.ts",
    "packages/chronodivide-bot-driver/src/training/progressCertifiedV5OpenDevelopmentAggregate.ts",
    "packages/chronodivide-bot-driver/src/test/progressCertifiedV5OpenDevelopmentAggregate.test.ts",
]);
export const isProgressCertifiedV5AggregationRevisionAllowed = ({
    branch,
    dirty,
    campaignSourceIsAncestor,
    changedPaths,
}: {
    branch: string;
    dirty: boolean;
    campaignSourceIsAncestor: boolean;
    changedPaths: readonly string[];
}): boolean => branch === "main" && !dirty && campaignSourceIsAncestor &&
    changedPaths.every((changedPath) => PROGRESS_CERTIFIED_V5_AGGREGATION_REPAIR_PATHS.has(changedPath));
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
const mean = (values: readonly number[]): number => {
    if (values.length === 0) throw new Error("Cannot compute an empty mean");
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
const sha256Text = (value: string): string => crypto.createHash("sha256").update(value).digest("hex");
const countStrings = (values: readonly string[]): Record<string, number> =>
    values.reduce<Record<string, number>>((counts, value) => ({
        ...counts,
        [value]: (counts[value] ?? 0) + 1,
    }), {});
const ALLIED = new Set<Countries>([
    Countries.USA,
    Countries.KOREA,
    Countries.FRANCE,
    Countries.GERMANY,
    Countries.GREAT_BRITAIN,
]);

export const parseProgressCertifiedV5Sacct = (
    raw: string,
    arrayJobId: string,
): Map<number, SchedulerTask> => {
    const tasks = new Map<number, SchedulerTask>();
    for (const [lineIndex, line] of raw.split("\n").entries()) {
        if (!line) continue;
        const fields = line.split("|");
        if (fields.length !== 5) throw new Error(`V5 sacct line ${lineIndex + 1} is malformed`);
        const [logicalJobId, schedulerJobId, state, exitCode, account] = fields;
        const match = new RegExp(`^${arrayJobId}_(\\d+)$`).exec(logicalJobId);
        const taskIndex = match ? Number(match[1]) : -1;
        if (
            !match || !/^\d+$/.test(schedulerJobId) || taskIndex < 0 ||
            taskIndex >= PROGRESS_CERTIFIED_V5_OPEN_DEVELOPMENT_SHARD_COUNT || tasks.has(taskIndex) ||
            state !== "COMPLETED" || exitCode !== "0:0" || account !== "pi_jss233"
        ) throw new Error(`V5 scheduler row ${lineIndex + 1} is failed, duplicate, or unauthorized`);
        tasks.set(taskIndex, { schedulerJobId, state, exitCode, account });
    }
    if (tasks.size !== PROGRESS_CERTIFIED_V5_OPEN_DEVELOPMENT_SHARD_COUNT) {
        throw new Error(`V5 sacct returned ${tasks.size}/${PROGRESS_CERTIFIED_V5_OPEN_DEVELOPMENT_SHARD_COUNT} tasks`);
    }
    return tasks;
};

const allowedTelemetryKeys = new Set([
    "schemaVersion", "event", "informationBoundary", "tick", "mechanism", "decisionKind",
    "decisionReason", "selectedBuildingId", "selectedBuildingVisible", "selectedBuildingObservedBy",
    "selectedBuildingCoordinates", "selectedBuildingOrderMode", "selectedAttackerIds", "blockerIds",
    "threatIds", "predictedCompletionTicks", "directCompletionTicks", "earliestLethalInterceptTick",
    "earliestBaseDestructionTick", "noProgressTicks", "searchCoverageFraction", "searchPointCount",
    "invalidatedBuildingIds", "activationReason", "exactEnemyBuildingCount", "eligibleAttackerCount",
    "reservedCombatantCount", "reservedCombatantIds", "reservedActionCounts", "certifiedAttackerCount",
    "rejectedAttackerCountsByReason", "selectedAttackerRulesNames", "delegatedActionCounts",
    "assignedCombatantFraction", "lastPhysicalProgressTick", "physicalNoProgressTicks",
    "missionStartedTick", "progressDeadlineExpired", "terminalReserveReleased", "completeMissionCostTicks",
]);

export const validateProgressCertifiedV5Telemetry = (
    value: unknown,
    schemaVersion: 3 | 4,
): TerminalObjectiveTelemetry => {
    if (
        !isRecord(value) || value.schemaVersion !== schemaVersion || !Number.isSafeInteger(value.tick) ||
        (value.tick as number) < 0 || value.informationBoundary !== "public_complete_state" ||
        value.mechanism !== "progress_certified_terminal_conversion" ||
        !new Set(["decision", "search_orders", "memory_invalidated"]).has(String(value.event)) ||
        Object.keys(value).some((key) => !allowedTelemetryKeys.has(key))
    ) throw new Error("Progress-certified V5 policy telemetry is malformed or not allowlisted");
    for (const key of [
        "selectedAttackerIds", "blockerIds", "threatIds", "invalidatedBuildingIds", "reservedCombatantIds",
    ]) {
        const field = value[key];
        if (field !== undefined && (!Array.isArray(field) || field.some(
            (id) => !Number.isSafeInteger(id) || (id as number) < 0,
        ))) throw new Error(`Progress-certified V5 telemetry ${key} is invalid`);
    }
    for (const key of [
        "selectedBuildingId", "predictedCompletionTicks", "directCompletionTicks",
        "earliestLethalInterceptTick", "earliestBaseDestructionTick", "noProgressTicks", "searchPointCount",
        "exactEnemyBuildingCount", "eligibleAttackerCount", "reservedCombatantCount", "certifiedAttackerCount",
        "lastPhysicalProgressTick", "physicalNoProgressTicks", "missionStartedTick", "completeMissionCostTicks",
    ]) {
        const field = value[key];
        if (field !== undefined && field !== null && (!Number.isSafeInteger(field) || (field as number) < 0)) {
            throw new Error(`Progress-certified V5 telemetry ${key} is invalid`);
        }
    }
    if (
        value.lastPhysicalProgressTick !== undefined &&
        (value.lastPhysicalProgressTick as number) > (value.tick as number)
    ) throw new Error("Progress-certified V5 physical-progress clock is in the future");
    if (value.terminalReserveReleased === true && value.exactEnemyBuildingCount !== 1) {
        throw new Error("Progress-certified V5 terminal reserve release lacks exact count one");
    }
    const selected = new Set(Array.isArray(value.selectedAttackerIds) ? value.selectedAttackerIds : []);
    if (
        Array.isArray(value.reservedCombatantIds) &&
        value.reservedCombatantIds.some((id) => selected.has(id))
    ) throw new Error("Progress-certified V5 selected and reserved combatants overlap");
    if (schemaVersion === 3 && (
        value.selectedBuildingCoordinates !== undefined || value.selectedBuildingOrderMode !== undefined
    )) throw new Error("Frozen V4 telemetry contains V5-only building-order fields");
    if (schemaVersion === 4) {
        const buildingDecision = value.decisionKind === "building_strike" ||
            value.decisionKind === "terminal_candidate_strike";
        if (buildingDecision) {
            if (!isRecord(value.selectedBuildingCoordinates) ||
                !Number.isFinite(value.selectedBuildingCoordinates.x) ||
                !Number.isFinite(value.selectedBuildingCoordinates.y)) {
                throw new Error("V5 building decision lacks finite target coordinates");
            }
            if (value.selectedBuildingVisible === true && value.selectedBuildingOrderMode !== "attack_visible_building") {
                throw new Error("V5 visible building lacks direct-attack order mode");
            }
            if (
                value.selectedBuildingVisible === false &&
                value.selectedBuildingObservedBy === "public_complete_state" &&
                value.selectedBuildingOrderMode !== "attack_move_exact_unseen_coordinates"
            ) throw new Error("V5 exact unseen building lacks coordinate approach mode");
        } else if (value.selectedBuildingOrderMode !== undefined) {
            throw new Error("V5 non-building decision declares a building order mode");
        }
    }
    return value as unknown as TerminalObjectiveTelemetry;
};

const parseEvents = (eventsPath: string): RecordValue[] => fs.readFileSync(eventsPath, "utf8")
    .split("\n").filter(Boolean).map((line, index) => {
        const value = JSON.parse(line) as unknown;
        if (!isRecord(value) || typeof value.event !== "string") throw new Error(`Malformed V5 event ${index}`);
        return value;
    });

const validateEpisodeResult = (
    value: unknown,
    expected: {
        episodeId: string;
        campaign: ProgressCertifiedV5OpenDevelopmentCampaign;
        shard: ProgressCertifiedV5OpenDevelopmentCampaign["shards"][number];
        arm: ProgressCertifiedV5OpenDevelopmentCampaign["arms"][number];
        candidateSlot: 0 | 1;
    },
): ProgressCertifiedEpisodeResult => {
    const objectivePolicy = expected.arm.policy.objectivePolicy;
    const telemetrySchema: 3 | 4 = objectivePolicy.schemaVersion === 5 ? 4 : 3;
    const fullyValidated = validateProgressCertifiedResult(value, {
        episodeId: expected.episodeId,
        familyId: expected.shard.familyId,
        mapName: expected.shard.mapName,
        mapSha256: expected.shard.mapSha256,
        policyId: expected.arm.policyId,
        candidateCore: "external_supalosa",
        informationBoundary: objectivePolicy.enabled ? "public_complete_state" : "none",
        telemetrySchemaVersion: telemetrySchema,
        candidateSlot: expected.candidateSlot,
        country: expected.shard.country,
        seedBlockIndex: expected.shard.seedBlockIndex,
        requestedEngineSeed: expected.shard.requestedEngineSeed,
        maxTicks: expected.campaign.maxTicks,
    });
    if (!isRecord(value)) throw new Error(`V5 episode ${expected.episodeId} result is not an object`);
    const winner = value.winner;
    const score = winner === "candidate" ? 1 : winner === "baseline" ? 0 : winner === "draw" ? 0.5 : null;
    if (
        value.schemaVersion !== 1 || value.episodeId !== expected.episodeId ||
        value.familyId !== expected.shard.familyId || value.mapName !== expected.shard.mapName ||
        value.mapSha256 !== expected.shard.mapSha256 || value.policyId !== expected.arm.policyId ||
        value.policySha256 !== expected.arm.policyId || value.candidateCore !== "external_supalosa" ||
        value.policyInformationBoundary !== (objectivePolicy.enabled ? "public_complete_state" : "none") ||
        value.endpointVersion !== expected.campaign.endpointVersion ||
        value.endpointSha256 !== expected.campaign.endpointSha256 ||
        value.endpoint !== LITERAL_BUILDING_ELIMINATION_ENDPOINT ||
        value.seedBlockIndex !== expected.shard.seedBlockIndex ||
        value.requestedEngineSeed !== expected.shard.requestedEngineSeed ||
        value.candidateSlot !== expected.candidateSlot || value.candidateCountry !== expected.shard.country ||
        value.baselineCountry !== expected.shard.country || value.maxTicks !== expected.campaign.maxTicks ||
        value.shortGame !== false || !Number.isSafeInteger(value.ticks) ||
        (value.ticks as number) < 1 || (value.ticks as number) > expected.campaign.maxTicks ||
        score === null || value.candidateScore !== score || value.technicalFailure !== null ||
        typeof value.engineFinished !== "boolean" || !isRecord(value.terminal) ||
        !isRecord(value.endpointEstablished) ||
        typeof value.endpointEstablished.candidate !== "boolean" ||
        typeof value.endpointEstablished.baseline !== "boolean" ||
        !isRecord(value.quitSuppression) || value.quitSuppression.mode !== "symmetric_no_forwarding" ||
        !isRecord(value.quitSuppression.attempts) ||
        !Number.isSafeInteger(value.quitSuppression.attempts.candidate) ||
        !Number.isSafeInteger(value.quitSuppression.attempts.baseline) ||
        !isRecord(value.quitSuppression.forwarded) ||
        value.quitSuppression.forwarded.candidate !== 0 || value.quitSuppression.forwarded.baseline !== 0 ||
        !isRecord(value.terminalBuildingCounts) ||
        !Number.isSafeInteger(value.terminalBuildingCounts.candidate) ||
        !Number.isSafeInteger(value.terminalBuildingCounts.baseline) ||
        (value.terminalBuildingCounts.candidate as number) < 0 ||
        (value.terminalBuildingCounts.baseline as number) < 0 ||
        !Array.isArray(value.dispositionHistory) || !Array.isArray(value.policyTelemetry)
    ) throw new Error(`V5 episode ${expected.episodeId} result provenance or endpoint drifted`);
    if (
        winner === "candidate" && (value.outcomeStatus !== "candidate_win" || value.terminalBuildingCounts.baseline !== 0) ||
        winner === "baseline" && (value.outcomeStatus !== "baseline_win" || value.terminalBuildingCounts.candidate !== 0) ||
        winner === "draw" && !new Set([
            "simultaneous_draw", "engine_nonliteral_termination_draw", "tick_cap_draw",
        ]).has(String(value.outcomeStatus))
    ) throw new Error(`V5 episode ${expected.episodeId} winner and literal endpoint disagree`);
    if (!objectivePolicy.enabled && value.policyTelemetry.length !== 0) {
        throw new Error(`V5 disabled control ${expected.episodeId} emitted telemetry`);
    }
    if (objectivePolicy.enabled) {
        for (const event of value.policyTelemetry) validateProgressCertifiedV5Telemetry(event, telemetrySchema);
    }
    return fullyValidated;
};

const validateShard = (
    campaign: ProgressCertifiedV5OpenDevelopmentCampaign,
    resultsRoot: string,
    arrayJobId: string,
    schedulerTask: SchedulerTask,
    shard: ProgressCertifiedV5OpenDevelopmentCampaign["shards"][number],
): ProgressCertifiedV5Observation[] => {
    const resultDir = path.join(resultsRoot, `${arrayJobId}_${shard.shardIndex}`, "run");
    const manifestPath = path.join(resultDir, "manifest.json");
    const summaryPath = path.join(resultDir, "summary.json");
    const eventsPath = path.join(resultDir, "events.jsonl");
    for (const required of [manifestPath, summaryPath, eventsPath]) {
        if (!fs.existsSync(required)) throw new Error(`V5 shard ${shard.shardIndex} lacks ${required}`);
    }
    const summary = readJson(summaryPath);
    if (
        !isRecord(summary) || summary.schemaVersion !== 2 ||
        summary.status !== "COMPLETE_PROGRESS_CERTIFIED_OPEN_DEVELOPMENT_SHARD" ||
        summary.runId !== shard.runId || summary.planSha256 !== shard.planSha256 ||
        summary.requestedLaunches !== 6 || summary.accountedLaunches !== 6 || summary.completed !== 6 ||
        summary.technicalFailures !== 0 || summary.complete !== true || summary.technicallyClean !== true ||
        summary.outcomeAccess !== "open-development-only" ||
        !Number.isSafeInteger(summary.candidateWins) || !Number.isSafeInteger(summary.baselineWins) ||
        !Number.isSafeInteger(summary.draws) ||
        (summary.candidateWins as number) + (summary.baselineWins as number) + (summary.draws as number) !== 6
    ) throw new Error(`V5 shard ${shard.shardIndex} summary is not a complete clean block`);
    const outer = readJson(manifestPath);
    if (!isRecord(outer) || outer.planSha256 !== shard.planSha256 || !isRecord(outer.plan) || !isRecord(outer.manifest)) {
        throw new Error(`V5 shard ${shard.shardIndex} manifest is malformed`);
    }
    const plan = parseProgressCertifiedRunPlan(outer.plan);
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
    ) throw new Error(`V5 shard ${shard.shardIndex} plan commitments drifted`);
    const manifest = outer.manifest;
    const scheduler = manifest.scheduler;
    const source = manifest.source;
    const software = manifest.software;
    const baseline = isRecord(software) ? software.baseline : null;
    const gameApi = isRecord(software) ? software.gameApiRuntimeTree : null;
    if (
        !isRecord(scheduler) || scheduler.account !== "pi_jss233" ||
        String(scheduler.arrayJobId) !== arrayJobId || String(scheduler.arrayTaskId) !== String(shard.shardIndex) ||
        String(scheduler.jobId) !== schedulerTask.schedulerJobId || !isRecord(source) ||
        source.gitCommit !== campaign.sourceGitCommit || source.gitBranch !== "main" || source.trackedDirty !== false ||
        !isRecord(baseline) || baseline.kind !== "external-package" ||
        baseline.gitCommit !== campaign.baselineGitCommit || baseline.trackedDirty !== false ||
        !isRecord(baseline.runtimeTree) || baseline.runtimeTree.sha256 !== campaign.baselineRuntimeSha256 ||
        !isRecord(gameApi) || gameApi.sha256 !== campaign.gameApiRuntimeSha256 ||
        (isRecord(software) ? software.packageLockSha256 : null) !== campaign.packageLockSha256
    ) throw new Error(`V5 shard ${shard.shardIndex} scheduler or software provenance drifted`);
    const events = parseEvents(eventsPath);
    if (events[0]?.event !== "run_start" || events[events.length - 1]?.event !== "run_complete") {
        throw new Error(`V5 shard ${shard.shardIndex} event boundaries drifted`);
    }
    const observations: ProgressCertifiedV5Observation[] = [];
    let cursor = 1;
    for (let launchIndex = 0; launchIndex < plan.episodes.length; launchIndex++) {
        const episode = plan.episodes[launchIndex];
        const arm = campaign.arms.find(({ armId }) => armId === episode.armId);
        const launch = events[cursor++];
        if (
            !arm || launch?.event !== "launch_counted" || launch.launchIndex !== launchIndex ||
            launch.episodeId !== episode.episodeId || launch.familyId !== shard.familyId ||
            launch.country !== shard.country || launch.armId !== episode.armId || launch.policyId !== episode.policyId ||
            launch.seedBlockIndex !== shard.seedBlockIndex || launch.requestedEngineSeed !== shard.requestedEngineSeed ||
            launch.candidateSlot !== episode.candidateSlot
        ) throw new Error(`V5 shard ${shard.shardIndex} launch ${launchIndex} drifted`);
        const completion = events[cursor++];
        if (completion?.event !== "episode_complete" || completion.launchIndex !== launchIndex) {
            throw new Error(`V5 shard ${shard.shardIndex} launch ${launchIndex} did not complete cleanly`);
        }
        const result = validateEpisodeResult(completion.result, {
            episodeId: episode.episodeId,
            campaign,
            shard,
            arm,
            candidateSlot: episode.candidateSlot,
        });
        const candidateName = `ProgressCandidate_${shard.seedBlockIndex}_${episode.candidateSlot}`;
        const baselineName = `ProgressBaseline_${shard.seedBlockIndex}_${episode.candidateSlot}`;
        const physicalTicks = (victimName: string): number[] => result.dispositionHistory
            .filter(({ building, kind, validPhysicalDestruction }) =>
                building.owner === victimName &&
                kind === "opponent_attributed_physical_destruction" &&
                validPhysicalDestruction,
            )
            .map(({ tick }) => tick);
        observations.push({
            shardIndex: shard.shardIndex,
            familyId: shard.familyId,
            country: shard.country,
            faction: ALLIED.has(shard.country) ? "Allied" : "Soviet",
            candidateSlot: episode.candidateSlot,
            armId: arm.armId,
            outcome: result.winner as Outcome,
            outcomeStatus: result.outcomeStatus,
            score: result.candidateScore as 0 | 0.5 | 1,
            ticks: result.ticks,
            engineFinished: result.engineFinished,
            candidateBuildings: result.terminalBuildingCounts.candidate,
            baselineBuildings: result.terminalBuildingCounts.baseline,
            candidateQuitAttempts: result.quitSuppression.attempts.candidate,
            baselineQuitAttempts: result.quitSuppression.attempts.baseline,
            candidateAttributedBuildingDestructionTicks: physicalTicks(baselineName),
            baselineAttributedBuildingDestructionTicks: physicalTicks(candidateName),
            telemetry: result.policyTelemetry,
        });
    }
    if (cursor !== events.length - 1 || !isRecord(events[cursor]?.summary)) {
        throw new Error(`V5 shard ${shard.shardIndex} event accounting is incomplete`);
    }
    return observations;
};

const counts = (rows: readonly ProgressCertifiedV5Observation[]): OutcomeCounts => ({
    games: rows.length,
    wins: rows.filter(({ outcome }) => outcome === "candidate").length,
    draws: rows.filter(({ outcome }) => outcome === "draw").length,
    losses: rows.filter(({ outcome }) => outcome === "baseline").length,
    literalWinProbability: mean(rows.map(({ outcome }) => Number(outcome === "candidate"))),
    drawProbability: mean(rows.map(({ outcome }) => Number(outcome === "draw"))),
    score: mean(rows.map(({ score }) => score)),
});

const stratumSummary = (rows: readonly ProgressCertifiedV5Observation[]) => {
    const winTicks = rows.filter(({ outcome }) => outcome === "candidate").map(({ ticks }) => ticks);
    return {
        ...counts(rows),
        medianLiteralWinTick: median(winTicks),
        meanLiteralWinTick: winTicks.length > 0 ? mean(winTicks) : null,
    };
};

const armSummary = (
    observations: readonly ProgressCertifiedV5Observation[],
    armId: ProgressCertifiedV5ArmId,
) => {
    const rows = observations.filter((row) => row.armId === armId);
    const familyRows = PROGRESS_CERTIFIED_V5_OPEN_DEVELOPMENT_FAMILIES.map(({ familyId }) => ({
        familyId,
        ...stratumSummary(rows.filter((row) => row.familyId === familyId)),
    }));
    return {
        armId,
        ...counts(rows),
        familyMacroLiteralWinProbability: mean(familyRows.map(({ literalWinProbability }) => literalWinProbability)),
        familyMacroDrawProbability: mean(familyRows.map(({ drawProbability }) => drawProbability)),
        medianLiteralWinTick: median(rows.filter(({ outcome }) => outcome === "candidate").map(({ ticks }) => ticks)),
        terminalBuildingCounts: {
            candidateMean: mean(rows.map(({ candidateBuildings }) => candidateBuildings)),
            baselineMean: mean(rows.map(({ baselineBuildings }) => baselineBuildings)),
        },
        terminalStatusCounts: countStrings(rows.map(({ outcomeStatus }) => outcomeStatus)),
        suppressedQuitAttempts: {
            candidate: rows.reduce((sum, row) => sum + row.candidateQuitAttempts, 0),
            baseline: rows.reduce((sum, row) => sum + row.baselineQuitAttempts, 0),
        },
        families: familyRows,
        factions: (["Allied", "Soviet"] as const).map((faction) => ({
            faction,
            ...stratumSummary(rows.filter((row) => row.faction === faction)),
        })),
        countries: PROGRESS_CERTIFIED_V5_OPEN_DEVELOPMENT_COUNTRIES.map((country) => ({
            country,
            ...stratumSummary(rows.filter((row) => row.country === country)),
        })),
        slots: ([0, 1] as const).map((candidateSlot) => ({
            candidateSlot,
            ...stratumSummary(rows.filter((row) => row.candidateSlot === candidateSlot)),
        })),
    };
};

const pairedKey = (row: ProgressCertifiedV5Observation): string =>
    `${row.familyId}|${row.country}|${row.candidateSlot}`;

export const progressCertifiedV5PairedFamilyScoreEffects = (
    observations: readonly ProgressCertifiedV5Observation[],
): Array<{ familyId: string; effect: number }> => {
    const external = new Map(observations.filter(({ armId }) => armId === "external_supalosa_control")
        .map((row) => [pairedKey(row), row.score]));
    return PROGRESS_CERTIFIED_V5_OPEN_DEVELOPMENT_FAMILIES.map(({ familyId }) => {
        const rows = observations.filter((row) =>
            row.armId === "visibility_aware_final_building_v5" && row.familyId === familyId,
        );
        if (rows.length !== 18) throw new Error(`V5 family ${familyId} lacks 18 paired observations`);
        const differences = rows.map((row) => {
            const control = external.get(pairedKey(row));
            if (control === undefined) throw new Error(`V5 observation ${pairedKey(row)} lacks its external pair`);
            return row.score - control;
        });
        return {
            familyId,
            effect: mean(differences),
        };
    });
};

export type ProgressCertifiedV5AdvancementInputs = {
    technicalGatePassed: boolean;
    familyEffects: readonly number[];
    v5: OutcomeCounts & {
        factionCounts: readonly OutcomeCounts[];
        countryCounts: readonly OutcomeCounts[];
        familyMacroLiteralWinProbability: number;
        familyMacroDrawProbability: number;
    };
    external: { familyMacroLiteralWinProbability: number; familyMacroDrawProbability: number };
    v4: { familyMacroLiteralWinProbability: number; familyMacroDrawProbability: number };
};

export const evaluateProgressCertifiedV5Advancement = (inputs: ProgressCertifiedV5AdvancementInputs) => {
    if (inputs.familyEffects.length !== 10) throw new Error("V5 advancement requires ten family effects");
    const effect = mean(inputs.familyEffects);
    const standardError = sampleSd(inputs.familyEffects) / Math.sqrt(inputs.familyEffects.length);
    const lowerBound = effect - PROGRESS_CERTIFIED_V5_ONE_SIDED_80_T_CRITICAL_DF9 * standardError;
    const leaveOneFamilyOut = inputs.familyEffects.map((_, excludedIndex) => ({
        excludedIndex,
        effect: mean(inputs.familyEffects.filter((__, index) => index !== excludedIndex)),
    }));
    const checks = {
        technicalGatePassed: inputs.technicalGatePassed,
        pairedFamilyClustered80LowerScoreEffectAboveZero: lowerBound > 0,
        winsExceedLossesOverall: inputs.v5.wins > inputs.v5.losses,
        winsExceedLossesInBothFactions: inputs.v5.factionCounts.every(({ wins, losses }) => wins > losses),
        winsExceedLossesInAtLeastSevenCountries:
            inputs.v5.countryCounts.filter(({ wins, losses }) => wins > losses).length >= 7,
        familyMacroWinProbabilityExceedsBothControls:
            inputs.v5.familyMacroLiteralWinProbability > inputs.external.familyMacroLiteralWinProbability &&
            inputs.v5.familyMacroLiteralWinProbability > inputs.v4.familyMacroLiteralWinProbability,
        familyMacroDrawProbabilityBelowBothControls:
            inputs.v5.familyMacroDrawProbability < inputs.external.familyMacroDrawProbability &&
            inputs.v5.familyMacroDrawProbability < inputs.v4.familyMacroDrawProbability,
        everyLeaveOneFamilyOutScoreEffectPositive: leaveOneFamilyOut.every(({ effect: item }) => item > 0),
    };
    return {
        effect,
        standardError,
        lowerBound,
        leaveOneFamilyOut,
        checks,
        advanced: Object.values(checks).every(Boolean),
    };
};

const mechanismDiagnostics = (
    observations: readonly ProgressCertifiedV5Observation[],
    armId: ProgressCertifiedV5ArmId,
) => {
    const rows = observations.filter((row) => row.armId === armId);
    const telemetry = rows.flatMap(({ telemetry: events }) => events);
    const buildingDecisionKinds = new Set(["building_strike", "terminal_candidate_strike"]);
    const gameDiagnostics = rows.map((row) => {
        const buildingDecisions = row.telemetry.filter(({ decisionKind }) =>
            decisionKind !== undefined && buildingDecisionKinds.has(decisionKind),
        );
        const firstBuildingDecisionTick = buildingDecisions[0]?.tick ?? null;
        const completionTick = firstBuildingDecisionTick === null
            ? null
            : row.candidateAttributedBuildingDestructionTicks.find((tick) => tick >= firstBuildingDecisionTick) ?? null;
        const selectedBuildingIds = buildingDecisions.flatMap(({ selectedBuildingId }) =>
            selectedBuildingId === undefined || selectedBuildingId === null ? [] : [selectedBuildingId],
        );
        const uniqueBuildingIds = new Set(selectedBuildingIds);
        const approachIds = new Set(buildingDecisions.flatMap((event) =>
            event.selectedBuildingOrderMode === "attack_move_exact_unseen_coordinates" &&
            event.selectedBuildingId !== undefined && event.selectedBuildingId !== null
                ? [event.selectedBuildingId]
                : [],
        ));
        const liveHandoff = buildingDecisions.some((event) =>
            event.selectedBuildingOrderMode === "attack_visible_building" &&
            event.selectedBuildingId !== undefined && event.selectedBuildingId !== null &&
            approachIds.has(event.selectedBuildingId),
        );
        return {
            firstBuildingDecisionTick,
            completionTick,
            completionLatencyTicks: firstBuildingDecisionTick !== null && completionTick !== null
                ? completionTick - firstBuildingDecisionTick
                : null,
            uniqueBuildingTargetCount: uniqueBuildingIds.size,
            targetSwitchCount: selectedBuildingIds.reduce((switches, id, index) =>
                switches + Number(index > 0 && selectedBuildingIds[index - 1] !== id),
            0),
            liveHandoff,
            maximumPhysicalNoProgressTicks: Math.max(0, ...row.telemetry.map(
                ({ physicalNoProgressTicks }) => physicalNoProgressTicks ?? 0,
            )),
            deadlineExpirationCount: row.telemetry.filter(({ progressDeadlineExpired }) =>
                progressDeadlineExpired === "blocker" || progressDeadlineExpired === "building",
            ).length,
        };
    });
    const completionLatencies = gameDiagnostics.flatMap(({ completionLatencyTicks }) =>
        completionLatencyTicks === null ? [] : [completionLatencyTicks],
    );
    const selectedAttackerCounts = telemetry.flatMap(({ selectedAttackerIds }) =>
        selectedAttackerIds ? [selectedAttackerIds.length] : [],
    );
    const assignedFractions = telemetry.flatMap(({ assignedCombatantFraction }) =>
        assignedCombatantFraction === undefined ? [] : [assignedCombatantFraction],
    );
    return {
        gamesWithTelemetry: rows.filter(({ telemetry: events }) => events.length > 0).length,
        telemetryEvents: telemetry.length,
        decisionKindCounts: countStrings(telemetry.flatMap(({ decisionKind }) =>
            decisionKind ? [decisionKind] : [],
        )),
        buildingOrderModeCounts: countStrings(telemetry.flatMap(({ selectedBuildingOrderMode }) =>
            selectedBuildingOrderMode ? [selectedBuildingOrderMode] : [],
        )),
        observedByCounts: countStrings(telemetry.flatMap(({ selectedBuildingObservedBy }) =>
            selectedBuildingObservedBy ? [selectedBuildingObservedBy] : [],
        )),
        gamesWithExactUnseenApproach: rows.filter(({ telemetry: events }) => events.some(
            ({ selectedBuildingOrderMode }) => selectedBuildingOrderMode === "attack_move_exact_unseen_coordinates",
        )).length,
        gamesWithVisibleDirectAttack: rows.filter(({ telemetry: events }) => events.some(
            ({ selectedBuildingOrderMode }) => selectedBuildingOrderMode === "attack_visible_building",
        )).length,
        gamesWithLiveSameBuildingHandoff: gameDiagnostics.filter(({ liveHandoff }) => liveHandoff).length,
        gamesWithBuildingIntervention: gameDiagnostics.filter(
            ({ firstBuildingDecisionTick }) => firstBuildingDecisionTick !== null,
        ).length,
        gamesWithPhysicalBuildingCompletionAfterIntervention: completionLatencies.length,
        completionLatencyTicks: {
            median: median(completionLatencies),
            mean: completionLatencies.length > 0 ? mean(completionLatencies) : null,
            maximum: completionLatencies.length > 0 ? Math.max(...completionLatencies) : null,
        },
        candidateAttributedPhysicalBuildingDestructions: rows.reduce(
            (sum, row) => sum + row.candidateAttributedBuildingDestructionTicks.length,
            0,
        ),
        baselineAttributedPhysicalBuildingDestructions: rows.reduce(
            (sum, row) => sum + row.baselineAttributedBuildingDestructionTicks.length,
            0,
        ),
        deadlineExpirations: countStrings(telemetry.flatMap(({ progressDeadlineExpired }) =>
            progressDeadlineExpired ? [progressDeadlineExpired] : [],
        )),
        gamesWithDeadlineExpiration: gameDiagnostics.filter(
            ({ deadlineExpirationCount }) => deadlineExpirationCount > 0,
        ).length,
        gamesWithTargetSwitch: gameDiagnostics.filter(({ targetSwitchCount }) => targetSwitchCount > 0).length,
        targetSwitches: gameDiagnostics.reduce((sum, { targetSwitchCount }) => sum + targetSwitchCount, 0),
        gamesWithTerminalReserveRelease: rows.filter(({ telemetry: events }) => events.some(
            ({ terminalReserveReleased }) => terminalReserveReleased === true,
        )).length,
        selectedAttackerCount: {
            median: median(selectedAttackerCounts),
            maximum: selectedAttackerCounts.length > 0 ? Math.max(...selectedAttackerCounts) : null,
        },
        assignedCombatantFraction: {
            median: median(assignedFractions),
            maximum: assignedFractions.length > 0 ? Math.max(...assignedFractions) : null,
        },
        maximumPhysicalNoProgressTicks: Math.max(0, ...gameDiagnostics.map(
            ({ maximumPhysicalNoProgressTicks }) => maximumPhysicalNoProgressTicks,
        )),
        maximumLastPhysicalProgressTick: Math.max(0, ...telemetry.map(
            ({ lastPhysicalProgressTick }) => lastPhysicalProgressTick ?? 0,
        )),
    };
};

const transitionCounts = (
    observations: readonly ProgressCertifiedV5Observation[],
    fromArm: ProgressCertifiedV5ArmId,
    toArm: ProgressCertifiedV5ArmId,
): Record<string, number> => {
    const from = new Map(observations.filter(({ armId }) => armId === fromArm)
        .map((row) => [pairedKey(row), row.outcome]));
    return countStrings(observations.filter(({ armId }) => armId === toArm)
        .map((row) => `${from.get(pairedKey(row))}->${row.outcome}`));
};

const artifactCommitment = (
    campaign: ProgressCertifiedV5OpenDevelopmentCampaign,
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
    if (fs.existsSync(outputPath)) throw new Error(`Refusing to overwrite V5 aggregate ${outputPath}`);
    if (sha256File(campaignPath) !== campaignSha256) throw new Error("V5 campaign drifted from launch commitment");
    const campaign = validateProgressCertifiedV5OpenDevelopmentCampaign(readJson(campaignPath));
    const gitCommit = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
    const gitBranch = execFileSync("git", ["branch", "--show-current"], { encoding: "utf8" }).trim();
    const dirty = execFileSync("git", ["status", "--short", "--untracked-files=no"], { encoding: "utf8" }).trim();
    const campaignSourceIsAncestor = (() => {
        try {
            execFileSync("git", ["merge-base", "--is-ancestor", campaign.sourceGitCommit, gitCommit]);
            return true;
        } catch {
            return false;
        }
    })();
    const aggregationSourceChangedPaths = execFileSync(
        "git",
        ["diff", "--name-only", `${campaign.sourceGitCommit}..${gitCommit}`],
        { encoding: "utf8" },
    ).trim().split("\n").filter(Boolean);
    if (!isProgressCertifiedV5AggregationRevisionAllowed({
        branch: gitBranch,
        dirty: dirty.length > 0,
        campaignSourceIsAncestor,
        changedPaths: aggregationSourceChangedPaths,
    })) {
        throw new Error("V5 aggregate requires clean main with only allowlisted outcome-blind aggregation repairs");
    }
    const schedulerTasks = parseProgressCertifiedV5Sacct(execFileSync(
        "/opt/slurm/current/bin/sacct",
        ["-j", arrayJobId, "-n", "-P", "-X", "--format=JobID,JobIDRaw,State,ExitCode,Account"],
        { encoding: "utf8" },
    ), arrayJobId);
    const observations: ProgressCertifiedV5Observation[] = [];
    for (const shard of campaign.shards) {
        const schedulerTask = schedulerTasks.get(shard.shardIndex);
        if (!schedulerTask) throw new Error(`V5 shard ${shard.shardIndex} lacks its scheduler task`);
        observations.push(...validateShard(campaign, resultsRoot, arrayJobId, schedulerTask, shard));
    }
    if (observations.length !== PROGRESS_CERTIFIED_V5_OPEN_DEVELOPMENT_LAUNCH_COUNT) {
        throw new Error(`V5 aggregate counted ${observations.length}/540 launches`);
    }
    const unique = new Set(observations.map((row) => `${pairedKey(row)}|${row.armId}`));
    if (unique.size !== observations.length || PROGRESS_CERTIFIED_V5_ARM_ORDER.some((armId) =>
        observations.filter((row) => row.armId === armId).length !== 180,
    )) throw new Error("V5 aggregate population identities are duplicate or incomplete");
    const summaries = Object.fromEntries(PROGRESS_CERTIFIED_V5_ARM_ORDER.map((armId) => [
        armId,
        armSummary(observations, armId),
    ])) as Record<ProgressCertifiedV5ArmId, ReturnType<typeof armSummary>>;
    const familyEffects = progressCertifiedV5PairedFamilyScoreEffects(observations);
    const v5 = summaries.visibility_aware_final_building_v5;
    const advancement = evaluateProgressCertifiedV5Advancement({
        technicalGatePassed: true,
        familyEffects: familyEffects.map(({ effect }) => effect),
        v5: {
            ...v5,
            factionCounts: v5.factions,
            countryCounts: v5.countries,
        },
        external: summaries.external_supalosa_control,
        v4: summaries.final_building_hybrid_v4,
    });
    const output = {
        schemaVersion: 1,
        status: advancement.advanced
            ? "ADVANCE_PROGRESS_CERTIFIED_V5_TO_FRESH_CONFIRMATION"
            : "FAIL_PROGRESS_CERTIFIED_V5_RETURN_TO_OPEN_DEVELOPMENT",
        generatedAt: new Date().toISOString(),
        advanced: advancement.advanced,
        outcomeAccess: "permanently-open-development-only-no-paper-claim",
        sourceGitCommit: campaign.sourceGitCommit,
        aggregationGitCommit: gitCommit,
        aggregationRuntimeSha256: sha256File(path.resolve(process.argv[1]!)),
        aggregationSourceChangedPaths,
        campaignPath,
        campaignSha256,
        arrayJobId,
        controllerJobId: process.env.SLURM_JOB_ID ?? null,
        schedulerAccount: process.env.SLURM_JOB_ACCOUNT ?? null,
        schedulerJobIds: [...schedulerTasks.values()].map(({ schedulerJobId }) => schedulerJobId),
        resultArtifactCommitmentSha256: artifactCommitment(campaign, resultsRoot, arrayJobId),
        launchCount: observations.length,
        advancementRule: PROGRESS_CERTIFIED_V5_ADVANCEMENT_RULE,
        primaryPairedScoreComparison: {
            familyEffects,
            effect: advancement.effect,
            standardError: advancement.standardError,
            oneSidedFamilyClustered80LowerBound: advancement.lowerBound,
            leaveOneFamilyOut: advancement.leaveOneFamilyOut.map((item) => ({
                excludedFamilyId: familyEffects[item.excludedIndex].familyId,
                effect: item.effect,
            })),
        },
        positiveChecks: advancement.checks,
        arms: summaries,
        pairedTransitions: {
            externalToV4: transitionCounts(
                observations, "external_supalosa_control", "final_building_hybrid_v4",
            ),
            externalToV5: transitionCounts(
                observations, "external_supalosa_control", "visibility_aware_final_building_v5",
            ),
            v4ToV5: transitionCounts(
                observations, "final_building_hybrid_v4", "visibility_aware_final_building_v5",
            ),
        },
        mechanismDiagnostics: Object.fromEntries(PROGRESS_CERTIFIED_V5_ARM_ORDER.map((armId) => [
            armId,
            mechanismDiagnostics(observations, armId),
        ])),
        policyIdentities: buildProgressCertifiedV5Arms(),
    };
    fs.mkdirSync(path.dirname(outputPath), { recursive: true, mode: 0o700 });
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2) + "\n", { flag: "wx", mode: 0o600 });
    console.log(JSON.stringify({
        outputPath,
        sha256: sha256File(outputPath),
        status: output.status,
        advanced: output.advanced,
        launchCount: output.launchCount,
    }));
};

const invoked = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (import.meta.url === invoked) {
    try {
        main();
    } catch (error) {
        console.error(error);
        process.exitCode = 1;
    }
}
