import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { ApiEventType } from "@chronodivide/game-api";
import {
    TERMINAL_RACE_ADAPTER_SHA256,
    TERMINAL_RACE_ADVANCEMENT_RULE,
    TERMINAL_RACE_CORE_SHA256,
    TERMINAL_RACE_COUNTRIES,
    TERMINAL_RACE_ENGINE_SEED_BASE,
    TERMINAL_RACE_EQUIVALENCE_SHA256,
    TERMINAL_RACE_FAMILY_COUNT,
    TERMINAL_RACE_LAUNCH_COUNT,
    TERMINAL_RACE_MAX_TICKS,
    TERMINAL_RACE_ONE_SIDED_80_T_CRITICAL_DF9,
    TERMINAL_RACE_PROTOCOL_SHA256,
    TERMINAL_RACE_SEED_BLOCKS_PER_FAMILY,
    TERMINAL_RACE_SHARD_COUNT,
    TERMINAL_RACE_SMOKE_SHA256,
    TERMINAL_RACE_SOURCE_CAMPAIGN_SHA256,
    TERMINAL_RACE_SUPPORTED_POPULATION_SHA256,
    TerminalRaceCampaign,
    buildTerminalRaceEpisodes,
} from "./terminalRaceCampaign.js";
import {
    TERMINAL_RACE_ARM_ORDER,
    buildTerminalRaceArms,
    terminalRacePolicySha256,
} from "./terminalRacePolicy.js";
import { TerminalObjectiveTelemetry } from "./terminalObjectiveStrategy.js";
import {
    LITERAL_BUILDING_ELIMINATION_ENDPOINT,
    LITERAL_BUILDING_ELIMINATION_ENDPOINT_SHA256,
    LITERAL_BUILDING_ELIMINATION_ENDPOINT_VERSION,
} from "./literalBuildingEliminationEndpoint.js";
import { TerminalRaceEpisodeResult } from "./terminalRaceEpisode.js";
import { parseTerminalRaceRunPlan, sha256File } from "./terminalRacePlanRunner.js";
import { derivePairedEngineSeed } from "../benchmark/seededOfflineGame.js";

type RecordValue = Record<string, unknown>;
const isRecord = (value: unknown): value is RecordValue =>
    typeof value === "object" && value !== null && !Array.isArray(value);
const readJson = (filePath: string): unknown => JSON.parse(fs.readFileSync(filePath, "utf8"));
const requiredPath = (name: string): string => {
    const value = process.env[name];
    if (!value) throw new Error(`${name} is required`);
    return path.resolve(value);
};
const requiredArrayJobId = (): string => {
    const value = process.env.ARRAY_JOB_ID;
    if (!value || !/^\d+$/.test(value)) throw new Error("ARRAY_JOB_ID must be numeric");
    return value;
};
const exactKeys = (value: RecordValue, expected: string[], label: string): void => {
    const actual = Object.keys(value).sort();
    const wanted = [...expected].sort();
    if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
        throw new Error(`${label} has an invalid exact schema`);
    }
};

export const validateTerminalRaceCampaign = (value: unknown): TerminalRaceCampaign => {
    if (
        !isRecord(value) || value.schemaVersion !== 1 ||
        value.kind !== "terminal-race-open-development-literal-endpoint" ||
        value.status !== "FROZEN_TERMINAL_RACE_OPEN_DEVELOPMENT_ENDPOINT_V5" ||
        value.supportedPopulationSha256 !== TERMINAL_RACE_SUPPORTED_POPULATION_SHA256 ||
        value.sourcePopulationCommitmentSha256 !== TERMINAL_RACE_SUPPORTED_POPULATION_SHA256 ||
        value.sourceCampaignSha256 !== TERMINAL_RACE_SOURCE_CAMPAIGN_SHA256 ||
        value.familySelectionRule !== "exact-ten-families-from-completed-building-first-campaign" ||
        value.outcomeFreePopulationSelection !== true ||
        value.endpointVersion !== LITERAL_BUILDING_ELIMINATION_ENDPOINT_VERSION ||
        value.endpointSha256 !== LITERAL_BUILDING_ELIMINATION_ENDPOINT_SHA256 ||
        value.coreSha256 !== TERMINAL_RACE_CORE_SHA256 ||
        value.adapterSha256 !== TERMINAL_RACE_ADAPTER_SHA256 ||
        value.protocolSha256 !== TERMINAL_RACE_PROTOCOL_SHA256 ||
        value.equivalenceGateSha256 !== TERMINAL_RACE_EQUIVALENCE_SHA256 ||
        value.equivalenceJobId !== "22136495" ||
        value.smokeGateSha256 !== TERMINAL_RACE_SMOKE_SHA256 ||
        value.smokeJobId !== "22136496" ||
        value.priorCampaignReuse !== "families_only_no_seeds_no_games_no_outcomes" ||
        value.outcomeAccess !== "open-development-only-no-paper-claim" ||
        value.familyCount !== TERMINAL_RACE_FAMILY_COUNT ||
        value.seedBlocksPerFamily !== TERMINAL_RACE_SEED_BLOCKS_PER_FAMILY ||
        value.countryCount !== TERMINAL_RACE_COUNTRIES.length || value.reciprocalSlotCount !== 2 ||
        value.policyCount !== TERMINAL_RACE_ARM_ORDER.length ||
        value.shardCount !== TERMINAL_RACE_SHARD_COUNT ||
        value.launchedGameCount !== TERMINAL_RACE_LAUNCH_COUNT ||
        value.engineSeedBase !== TERMINAL_RACE_ENGINE_SEED_BASE || value.maxTicks !== TERMINAL_RACE_MAX_TICKS ||
        !Array.isArray(value.countries) || value.countries.join(",") !== TERMINAL_RACE_COUNTRIES.join(",") ||
        !Array.isArray(value.advancementRule) || value.advancementRule.join("\0") !== TERMINAL_RACE_ADVANCEMENT_RULE.join("\0") ||
        !isRecord(value.confidenceInterval) || value.confidenceInterval.unit !== "family" ||
        value.confidenceInterval.familyCount !== TERMINAL_RACE_FAMILY_COUNT ||
        value.confidenceInterval.method !== "student-t-lower-bound-on-family-means" ||
        value.confidenceInterval.sidedness !== "one-sided" || value.confidenceInterval.confidenceLevel !== 0.8 ||
        value.confidenceInterval.degreesOfFreedom !== 9 ||
        value.confidenceInterval.criticalValue !== TERMINAL_RACE_ONE_SIDED_80_T_CRITICAL_DF9 ||
        !Array.isArray(value.arms) || !Array.isArray(value.selectedFamilies) || !Array.isArray(value.shards) ||
        value.arms.length !== TERMINAL_RACE_ARM_ORDER.length ||
        value.selectedFamilies.length !== TERMINAL_RACE_FAMILY_COUNT || value.shards.length !== TERMINAL_RACE_SHARD_COUNT ||
        typeof value.supportedPopulationPath !== "string" || typeof value.sourceCampaignPath !== "string" ||
        typeof value.protocolPath !== "string" || typeof value.equivalenceGatePath !== "string" ||
        typeof value.smokeGatePath !== "string"
    ) throw new Error("Terminal-race campaign has an invalid frozen schema");
    const campaign = value as unknown as TerminalRaceCampaign;
    const frozenArms = buildTerminalRaceArms();
    if (
        sha256File(campaign.supportedPopulationPath) !== TERMINAL_RACE_SUPPORTED_POPULATION_SHA256 ||
        sha256File(campaign.sourceCampaignPath) !== TERMINAL_RACE_SOURCE_CAMPAIGN_SHA256 ||
        sha256File(campaign.protocolPath) !== TERMINAL_RACE_PROTOCOL_SHA256 ||
        sha256File(campaign.equivalenceGatePath) !== TERMINAL_RACE_EQUIVALENCE_SHA256 ||
        sha256File(campaign.smokeGatePath) !== TERMINAL_RACE_SMOKE_SHA256 ||
        campaign.arms.some((arm, index) => {
            const expected = frozenArms[index];
            return arm.armId !== expected.armId || arm.policyId !== expected.policyId ||
                terminalRacePolicySha256(arm.policy) !== expected.policyId;
        }) ||
        new Set(campaign.selectedFamilies.map(({ familyId }) => familyId)).size !== TERMINAL_RACE_FAMILY_COUNT ||
        new Set(campaign.selectedFamilies.map(({ mapSha256 }) => mapSha256)).size !== TERMINAL_RACE_FAMILY_COUNT ||
        campaign.shards.some((shard, index) => {
            const familyIndex = Math.floor(index / (TERMINAL_RACE_SEED_BLOCKS_PER_FAMILY * TERMINAL_RACE_COUNTRIES.length));
            const familySeedIndex = Math.floor(index / TERMINAL_RACE_COUNTRIES.length) % TERMINAL_RACE_SEED_BLOCKS_PER_FAMILY;
            const family = campaign.selectedFamilies[familyIndex];
            return shard.shardIndex !== index || shard.familyId !== family.familyId ||
                shard.mapName !== family.mapName || shard.mapSha256 !== family.mapSha256 ||
                shard.country !== TERMINAL_RACE_COUNTRIES[index % TERMINAL_RACE_COUNTRIES.length] ||
                shard.familySeedIndex !== familySeedIndex || shard.seedBlockIndex !== index ||
                shard.requestedEngineSeed !== derivePairedEngineSeed(TERMINAL_RACE_ENGINE_SEED_BASE, index) ||
                shard.launchedGameCount !== TERMINAL_RACE_ARM_ORDER.length * 2;
        }) ||
        new Set(campaign.shards.map(({ planFile }) => planFile)).size !== TERMINAL_RACE_SHARD_COUNT ||
        new Set(campaign.shards.map(({ planSha256 }) => planSha256)).size !== TERMINAL_RACE_SHARD_COUNT ||
        new Set(campaign.shards.map(({ runId }) => runId)).size !== TERMINAL_RACE_SHARD_COUNT
    ) throw new Error("Terminal-race campaign schedule or evidence chain drifted");
    return campaign;
};

type SchedulerTask = { schedulerJobId: string; state: "COMPLETED"; exitCode: "0:0"; account: "pi_jss233" };
export const parseTerminalRaceSacct = (raw: string, arrayJobId: string): Map<number, SchedulerTask> => {
    const tasks = new Map<number, SchedulerTask>();
    for (const [lineIndex, line] of raw.split("\n").entries()) {
        if (!line) continue;
        const fields = line.split("|");
        if (fields.length !== 5) throw new Error(`Terminal-race sacct line ${lineIndex + 1} is malformed`);
        const [logicalJobId, schedulerJobId, state, exitCode, account] = fields;
        const match = new RegExp(`^${arrayJobId}_(\\d+)$`).exec(logicalJobId);
        const taskIndex = match ? Number(match[1]) : -1;
        if (
            !match || !/^\d+$/.test(schedulerJobId) || taskIndex < 0 || taskIndex >= TERMINAL_RACE_SHARD_COUNT ||
            tasks.has(taskIndex) || state !== "COMPLETED" || exitCode !== "0:0" || account !== "pi_jss233"
        ) throw new Error(`Terminal-race scheduler row ${lineIndex + 1} is failed, duplicate, or unauthorized`);
        tasks.set(taskIndex, { schedulerJobId, state, exitCode, account });
    }
    if (tasks.size !== TERMINAL_RACE_SHARD_COUNT) throw new Error(`Terminal-race sacct returned ${tasks.size}/${TERMINAL_RACE_SHARD_COUNT} tasks`);
    return tasks;
};

export const validateTerminalRaceTelemetry = (value: unknown): TerminalObjectiveTelemetry => {
    if (
        !isRecord(value) || value.schemaVersion !== 2 || !Number.isSafeInteger(value.tick) ||
        (value.tick as number) < 0 ||
        !new Set(["visible_memory", "public_complete_state"]).has(String(value.informationBoundary)) ||
        value.mechanism !== "terminal_race"
    ) {
        throw new Error("Terminal-race policy telemetry is malformed");
    }
    const allowed = new Set([
        "schemaVersion", "event", "informationBoundary", "tick", "mechanism", "decisionKind",
        "decisionReason", "selectedBuildingId", "selectedBuildingVisible", "selectedBuildingObservedBy",
        "selectedAttackerIds",
        "blockerIds", "threatIds", "predictedCompletionTicks", "directCompletionTicks",
        "earliestLethalInterceptTick", "earliestBaseDestructionTick", "noProgressTicks",
        "searchCoverageFraction", "searchPointCount", "invalidatedBuildingIds",
        "activationReason", "exactEnemyBuildingCount", "eligibleAttackerCount",
        "certifiedAttackerCount", "rejectedAttackerCountsByReason", "selectedAttackerRulesNames",
        "delegatedActionCounts", "assignedCombatantFraction",
    ]);
    if (Object.keys(value).some((key) => !allowed.has(key))) {
        throw new Error(`Terminal-race ${String(value.event)} telemetry has a non-allowlisted field`);
    }
    if (!new Set(["decision", "search_orders", "memory_invalidated"]).has(String(value.event))) {
        throw new Error("Terminal-race policy telemetry event is not allowlisted");
    }
    for (const key of ["selectedAttackerIds", "blockerIds", "threatIds", "invalidatedBuildingIds"]) {
        const field = value[key];
        if (field !== undefined && (!Array.isArray(field) || field.some((id) => !Number.isSafeInteger(id) || id < 0))) {
            throw new Error(`Terminal-race telemetry ${key} is not an array of nonnegative integer ids`);
        }
    }
    for (const key of [
        "selectedBuildingId", "predictedCompletionTicks", "directCompletionTicks",
        "earliestLethalInterceptTick", "earliestBaseDestructionTick", "noProgressTicks", "searchPointCount",
        "exactEnemyBuildingCount", "eligibleAttackerCount", "certifiedAttackerCount",
    ]) {
        const field = value[key];
        if (field !== undefined && field !== null && (!Number.isSafeInteger(field) || (field as number) < 0)) {
            throw new Error(`Terminal-race telemetry ${key} is not a nonnegative integer or null`);
        }
    }
    if (
        value.searchCoverageFraction !== undefined &&
        (typeof value.searchCoverageFraction !== "number" || value.searchCoverageFraction < 0 || value.searchCoverageFraction > 1)
    ) throw new Error("Terminal-race search coverage is outside [0,1]");
    if (value.selectedBuildingVisible !== undefined && typeof value.selectedBuildingVisible !== "boolean") {
        throw new Error("Terminal-race selected-building visibility is not boolean");
    }
    if (value.selectedBuildingObservedBy !== undefined && !new Set([
        "vision", "memory", "public_complete_state",
    ]).has(String(value.selectedBuildingObservedBy))) {
        throw new Error("Terminal-race selected-building observation source is invalid");
    }
    if (value.activationReason !== undefined && !new Set([
        "fixed_tick", "guarded_building_count",
    ]).has(String(value.activationReason))) throw new Error("Terminal-race activation reason is invalid");
    if (
        value.assignedCombatantFraction !== undefined &&
        (typeof value.assignedCombatantFraction !== "number" ||
            value.assignedCombatantFraction < 0 || value.assignedCombatantFraction > 1)
    ) throw new Error("Terminal-race assigned combatant fraction is outside [0,1]");
    if (value.selectedAttackerRulesNames !== undefined && (
        !Array.isArray(value.selectedAttackerRulesNames) ||
        value.selectedAttackerRulesNames.some((name) => typeof name !== "string" || name.length === 0)
    )) throw new Error("Terminal-race selected-attacker rules names are invalid");
    if (value.rejectedAttackerCountsByReason !== undefined) {
        if (!isRecord(value.rejectedAttackerCountsByReason)) {
            throw new Error("Terminal-race rejection counts are invalid");
        }
        for (const [reason, count] of Object.entries(value.rejectedAttackerCountsByReason)) {
            if (!reason || !Number.isSafeInteger(count) || (count as number) < 0) {
                throw new Error("Terminal-race rejection counts are invalid");
            }
        }
    }
    if (value.delegatedActionCounts !== undefined) {
        if (!isRecord(value.delegatedActionCounts)) throw new Error("Terminal-race action counts are invalid");
        exactKeys(value.delegatedActionCounts, ["idle", "moving", "attacking", "other"],
            "Terminal-race delegated action counts");
        if (Object.values(value.delegatedActionCounts).some((count) =>
            !Number.isSafeInteger(count) || (count as number) < 0,
        )) throw new Error("Terminal-race action counts are invalid");
    }
    if (value.decisionKind !== undefined && !new Set([
        "search", "regroup", "building_strike", "terminal_candidate_strike", "blocker_clear",
        "base_defense", "predecessor_fallback",
    ]).has(String(value.decisionKind))) throw new Error("Terminal-race decision kind is invalid");
    if (value.decisionReason !== undefined && typeof value.decisionReason !== "string") {
        throw new Error("Terminal-race decision reason is invalid");
    }
    return value as unknown as TerminalObjectiveTelemetry;
};

export const validateTerminalRaceResult = (
    value: unknown,
    expected: { episodeId: string; familyId: string; mapName: string; mapSha256: string; policyId: string; informationInterface: "visible_memory" | "public_complete_state"; candidateSlot: 0 | 1; country: string; seedBlockIndex: number; requestedEngineSeed: number; maxTicks: number },
): TerminalRaceEpisodeResult => {
    if (isRecord(value)) exactKeys(value, [
        "schemaVersion", "episodeId", "familyId", "mapName", "mapSha256", "policyId", "policySha256",
        "policyInformationBoundary", "endpointVersion", "endpointSha256", "endpoint", "seedBlockIndex",
        "requestedEngineSeed", "botRandomSeed", "candidateBotRandomSeed", "baselineBotRandomSeed",
        "engineSeedEpochMs", "candidateSlot", "candidateCountry", "baselineCountry", "candidateStart",
        "baselineStart", "maxTicks", "ticks", "wallTimeMs", "shortGame", "outcomeStatus", "winner",
        "candidateScore", "engineFinished", "terminal", "technicalFailure", "quitSuppression",
        "terminalBuildingCounts", "endpointEstablished", "dispositionHistory", "policyTelemetry",
    ], `Terminal-race completion ${expected.episodeId}`);
    if (
        !isRecord(value) || value.schemaVersion !== 2 || value.episodeId !== expected.episodeId ||
        value.familyId !== expected.familyId || value.mapName !== expected.mapName || value.mapSha256 !== expected.mapSha256 ||
        value.policyId !== expected.policyId || value.policySha256 !== expected.policyId ||
        value.policyInformationBoundary !== expected.informationInterface ||
        value.endpointVersion !== LITERAL_BUILDING_ELIMINATION_ENDPOINT_VERSION ||
        value.endpointSha256 !== LITERAL_BUILDING_ELIMINATION_ENDPOINT_SHA256 ||
        value.seedBlockIndex !== expected.seedBlockIndex || value.requestedEngineSeed !== expected.requestedEngineSeed ||
        value.candidateSlot !== expected.candidateSlot || value.candidateCountry !== expected.country ||
        value.baselineCountry !== expected.country || value.maxTicks !== expected.maxTicks || value.shortGame !== false ||
        value.technicalFailure !== null || !Array.isArray(value.policyTelemetry) || !Array.isArray(value.dispositionHistory) ||
        !isRecord(value.quitSuppression) || value.quitSuppression.mode !== "symmetric_no_forwarding" ||
        !isRecord(value.quitSuppression.attempts) || !isRecord(value.quitSuppression.forwarded) ||
        !Number.isSafeInteger(value.quitSuppression.attempts.candidate) ||
        !Number.isSafeInteger(value.quitSuppression.attempts.baseline) ||
        (value.quitSuppression.attempts.candidate as number) < 0 ||
        (value.quitSuppression.attempts.baseline as number) < 0 ||
        value.quitSuppression.forwarded.candidate !== 0 || value.quitSuppression.forwarded.baseline !== 0 ||
        !isRecord(value.terminalBuildingCounts) || !isRecord(value.endpointEstablished) ||
        !Number.isSafeInteger(value.terminalBuildingCounts.candidate) ||
        !Number.isSafeInteger(value.terminalBuildingCounts.baseline) ||
        (value.terminalBuildingCounts.candidate as number) < 0 ||
        (value.terminalBuildingCounts.baseline as number) < 0 ||
        typeof value.endpointEstablished.candidate !== "boolean" ||
        typeof value.endpointEstablished.baseline !== "boolean" ||
        value.endpointEstablished.candidate !== true || value.endpointEstablished.baseline !== true ||
        !Number.isSafeInteger(value.wallTimeMs) || (value.wallTimeMs as number) < 0 ||
        !Number.isSafeInteger(value.ticks) || (value.ticks as number) < 1 || (value.ticks as number) > expected.maxTicks ||
        (value.winner !== "candidate" && value.winner !== "baseline" && value.winner !== "draw") ||
        value.candidateScore !== (value.winner === "candidate" ? 1 : value.winner === "baseline" ? 0 : 0.5) ||
        !isRecord(value.terminal)
    ) throw new Error(`Terminal-race completion ${expected.episodeId} is malformed or technically invalid`);
    value.policyTelemetry.forEach((telemetry) => {
        const event = validateTerminalRaceTelemetry(telemetry);
        if (event.informationBoundary !== expected.informationInterface) {
            throw new Error(`Terminal-race completion ${expected.episodeId} telemetry boundary drifted`);
        }
    });
    const terminal = value.terminal;
    if (
        terminal.endpointVersion !== LITERAL_BUILDING_ELIMINATION_ENDPOINT_VERSION ||
        terminal.endpointSha256 !== LITERAL_BUILDING_ELIMINATION_ENDPOINT_SHA256 ||
        (value.winner === "candidate" && (value.outcomeStatus !== "candidate_win" || terminal.status !== "candidate_win" || terminal.winner !== "candidate")) ||
        (value.winner === "baseline" && (value.outcomeStatus !== "baseline_win" || terminal.status !== "baseline_win" || terminal.winner !== "baseline")) ||
        (value.winner === "draw" && !(
            (value.outcomeStatus === "tick_cap_draw" && terminal.status === "tick_cap_draw") ||
            (value.outcomeStatus === "simultaneous_draw" && terminal.status === "simultaneous_draw" && terminal.winner === "draw") ||
            (value.outcomeStatus === "engine_nonliteral_termination_draw" &&
                terminal.status === "engine_nonliteral_termination_draw" && terminal.winner === "draw")
        ))
    ) throw new Error(`Terminal-race completion ${expected.episodeId} has a contradictory terminal state`);
    if (value.outcomeStatus === "tick_cap_draw") {
        exactKeys(terminal, ["endpointVersion", "endpointSha256", "tick", "status", "winner"],
            `Terminal-race cap terminal ${expected.episodeId}`);
        if (terminal.tick !== value.ticks || value.engineFinished !== false) {
            throw new Error(`Terminal-race cap terminal ${expected.episodeId} has an invalid tick or engine state`);
        }
    } else if (value.outcomeStatus === "engine_nonliteral_termination_draw") {
        exactKeys(terminal, [
            "endpointVersion", "endpointSha256", "endpoint", "tick", "status", "winner",
            "defeated", "evaluation", "engineFinishedSameUpdate",
        ], `Terminal-race nonliteral terminal ${expected.episodeId}`);
        if (
            terminal.endpoint !== LITERAL_BUILDING_ELIMINATION_ENDPOINT ||
            terminal.tick !== value.ticks || value.engineFinished !== true ||
            terminal.engineFinishedSameUpdate !== true || !isRecord(terminal.defeated) ||
            (terminal.defeated.candidate !== true && terminal.defeated.baseline !== true)
        ) throw new Error(`Terminal-race nonliteral terminal ${expected.episodeId} has invalid engine evidence`);
    } else {
        exactKeys(terminal, [
            "endpointVersion", "endpointSha256", "endpoint", "tick", "status", "winner", "evaluation",
            "engineFinishedSameUpdate",
        ], `Terminal-race physical terminal ${expected.episodeId}`);
        if (
            terminal.endpoint !== LITERAL_BUILDING_ELIMINATION_ENDPOINT ||
            terminal.tick !== value.ticks || terminal.engineFinishedSameUpdate !== value.engineFinished
        ) throw new Error(`Terminal-race physical terminal ${expected.episodeId} has invalid endpoint metadata`);
    }
    if (
        (value.winner === "candidate" && value.terminalBuildingCounts.baseline !== 0) ||
        (value.winner === "baseline" && value.terminalBuildingCounts.candidate !== 0) ||
        (value.outcomeStatus === "simultaneous_draw" &&
            (value.terminalBuildingCounts.candidate !== 0 || value.terminalBuildingCounts.baseline !== 0))
    ) throw new Error(`Terminal-race completion ${expected.episodeId} contradicts its terminal building counts`);
    const candidateName = `TerminalRaceCandidate_${expected.seedBlockIndex}_${expected.candidateSlot}`;
    const baselineName = `TerminalRaceBaseline_${expected.seedBlockIndex}_${expected.candidateSlot}`;
    const validatePhysicalRows = (
        rows: unknown,
        attackerName: string,
        victimName: string,
        label: string,
    ): RecordValue[] => {
        if (!Array.isArray(rows) || rows.length < 1) throw new Error(`${label} has no credited final buildings`);
        return rows.map((raw, index) => {
            const building = isRecord(raw) && isRecord(raw.building) ? raw.building : null;
            if (
                !isRecord(raw) || raw.validPhysicalDestruction !== true ||
                raw.kind !== "opponent_attributed_physical_destruction" || raw.postOwner !== null ||
                !building || building.owner !== victimName ||
                !Array.isArray(raw.matchedEvents) ||
                !raw.matchedEvents.some((event) => isRecord(event) && event.type === ApiEventType.ObjectDestroy &&
                    event.attackerPlayerName === attackerName && event.target === building.id) ||
                raw.matchedEvents.some((event) => isRecord(event) && event.type === ApiEventType.ObjectOwnerChange)
            ) throw new Error(`${label} credited row ${index} lacks an unambiguous opponent-attributed destruction`);
            return raw;
        });
    };
    if (value.winner !== "draw") {
        if (!isRecord(terminal.evaluation) || !isRecord(terminal.evaluation.zeroingDispositions)) {
            throw new Error(`Terminal-race win ${expected.episodeId} lacks its endpoint ledger`);
        }
        const side = value.winner;
        const victim = side === "candidate" ? "baseline" : "candidate";
        const rows = validatePhysicalRows(
            terminal.evaluation.zeroingDispositions[side],
            side === "candidate" ? candidateName : baselineName,
            side === "candidate" ? baselineName : candidateName,
            `Terminal-race win ${expected.episodeId}`,
        );
        const preCounts = isRecord(terminal.evaluation.preCounts) ? terminal.evaluation.preCounts : null;
        const postCounts = isRecord(terminal.evaluation.postCounts) ? terminal.evaluation.postCounts : null;
        if (
            !Array.isArray(rows) || !preCounts || !postCounts || !Number.isSafeInteger(preCounts[victim]) ||
            (preCounts[victim] as number) <= 0 || postCounts[victim] !== 0 || rows.length !== preCounts[victim] ||
            terminal.evaluation.enabledBeforeUpdate !== true || terminal.evaluation[`${side}PhysicalWin`] !== true ||
            terminal.evaluation[`${victim}PhysicalWin`] !== false
        ) throw new Error(`Terminal-race win ${expected.episodeId} violates literal building destruction`);
    } else if (value.outcomeStatus === "simultaneous_draw") {
        if (!isRecord(terminal.evaluation) || !isRecord(terminal.evaluation.zeroingDispositions)) {
            throw new Error(`Terminal-race simultaneous draw ${expected.episodeId} lacks its endpoint ledger`);
        }
        const preCounts = isRecord(terminal.evaluation.preCounts) ? terminal.evaluation.preCounts : null;
        const postCounts = isRecord(terminal.evaluation.postCounts) ? terminal.evaluation.postCounts : null;
        for (const side of ["candidate", "baseline"] as const) {
            const victim = side === "candidate" ? "baseline" : "candidate";
            const rows = validatePhysicalRows(
                terminal.evaluation.zeroingDispositions[side],
                side === "candidate" ? candidateName : baselineName,
                side === "candidate" ? baselineName : candidateName,
                `Terminal-race simultaneous draw ${expected.episodeId} ${side}`,
            );
            if (
                !preCounts || !postCounts || !Number.isSafeInteger(preCounts[victim]) ||
                (preCounts[victim] as number) <= 0 || postCounts[victim] !== 0 ||
                rows.length !== preCounts[victim] || terminal.evaluation.enabledBeforeUpdate !== true ||
                terminal.evaluation[`${side}PhysicalWin`] !== true
            ) throw new Error(`Terminal-race simultaneous draw ${expected.episodeId} violates literal building destruction`);
        }
    }
    return value as unknown as TerminalRaceEpisodeResult;
};

const parseEvents = (eventsPath: string): RecordValue[] => fs.readFileSync(eventsPath, "utf8")
    .split("\n").filter(Boolean).map((line, index) => {
        const value = JSON.parse(line) as unknown;
        if (!isRecord(value) || typeof value.event !== "string") throw new Error(`Malformed Terminal-race event ${index}`);
        return value;
    });

const validateShard = (
    campaign: TerminalRaceCampaign,
    resultsRoot: string,
    arrayJobId: string,
    task: SchedulerTask,
    shard: TerminalRaceCampaign["shards"][number],
): number => {
    const resultDir = path.join(resultsRoot, `${arrayJobId}_${shard.shardIndex}`, "run");
    const manifestPath = path.join(resultDir, "manifest.json");
    const summaryPath = path.join(resultDir, "summary.json");
    const eventsPath = path.join(resultDir, "events.jsonl");
    for (const required of [manifestPath, summaryPath, eventsPath, shard.planFile]) {
        if (!fs.existsSync(required)) throw new Error(`Terminal-race shard ${shard.shardIndex} lacks ${required}`);
    }
    if (sha256File(shard.planFile) !== shard.planSha256) throw new Error(`Terminal-race shard ${shard.shardIndex} plan changed`);
    const summary = readJson(summaryPath);
    if (
        !isRecord(summary) || summary.schemaVersion !== 2 ||
        summary.status !== "COMPLETE_TERMINAL_RACE_OPEN_DEVELOPMENT_SHARD" ||
        summary.runId !== shard.runId || summary.planSha256 !== shard.planSha256 ||
        summary.requestedLaunches !== shard.launchedGameCount || summary.accountedLaunches !== shard.launchedGameCount ||
        summary.completed !== shard.launchedGameCount || summary.technicalFailures !== 0 ||
        summary.complete !== true || summary.technicallyClean !== true || summary.outcomeAccess !== "open-development-only" ||
        !Number.isSafeInteger(summary.candidateWins) || !Number.isSafeInteger(summary.baselineWins) || !Number.isSafeInteger(summary.draws) ||
        (summary.candidateWins as number) + (summary.baselineWins as number) + (summary.draws as number) !== shard.launchedGameCount
    ) throw new Error(`Terminal-race shard ${shard.shardIndex} summary is not one complete clean block`);
    const outer = readJson(manifestPath);
    if (!isRecord(outer) || outer.planSha256 !== shard.planSha256 || !isRecord(outer.plan) || !isRecord(outer.manifest)) {
        throw new Error(`Terminal-race shard ${shard.shardIndex} manifest is malformed`);
    }
    const plan = parseTerminalRaceRunPlan(outer.plan);
    if (
        plan.runId !== shard.runId || plan.sourceGitCommit !== campaign.sourceGitCommit ||
        plan.sourceRuntimeSha256 !== campaign.sourceRuntimeSha256 || plan.baselineGitCommit !== campaign.baselineGitCommit ||
        plan.baselineRuntimeSha256 !== campaign.baselineRuntimeSha256 || plan.gameApiRuntimeSha256 !== campaign.gameApiRuntimeSha256 ||
        plan.packageLockSha256 !== campaign.packageLockSha256 ||
        plan.sourcePopulationCommitmentSha256 !== campaign.sourcePopulationCommitmentSha256 ||
        plan.endpointVersion !== campaign.endpointVersion || plan.endpointSha256 !== campaign.endpointSha256 ||
        plan.family.familyId !== shard.familyId || plan.family.mapName !== shard.mapName || plan.family.mapSha256 !== shard.mapSha256 ||
        plan.country !== shard.country || plan.engineSeedBase !== campaign.engineSeedBase || plan.seedBlockIndex !== shard.seedBlockIndex ||
        plan.requestedEngineSeed !== shard.requestedEngineSeed || plan.maxTicks !== campaign.maxTicks ||
        plan.arms.map(({ policyId }) => policyId).join(",") !== campaign.arms.map(({ policyId }) => policyId).join(",")
    ) throw new Error(`Terminal-race shard ${shard.shardIndex} plan commitments drifted`);
    const expectedEpisodes = buildTerminalRaceEpisodes(campaign.arms);
    if (plan.episodes.some((episode, index) => JSON.stringify(episode) !== JSON.stringify(expectedEpisodes[index]))) {
        throw new Error(`Terminal-race shard ${shard.shardIndex} episode order drifted`);
    }
    const scheduler = outer.manifest.scheduler;
    const source = outer.manifest.source;
    if (
        !isRecord(scheduler) || scheduler.account !== "pi_jss233" || String(scheduler.arrayJobId) !== arrayJobId ||
        String(scheduler.arrayTaskId) !== String(shard.shardIndex) || String(scheduler.jobId) !== task.schedulerJobId ||
        !isRecord(source) || source.gitCommit !== campaign.sourceGitCommit || source.gitBranch !== "main" || source.trackedDirty !== false
    ) throw new Error(`Terminal-race shard ${shard.shardIndex} scheduler or source provenance drifted`);
    const events = parseEvents(eventsPath);
    if (events[0]?.event !== "run_start" || events[events.length - 1]?.event !== "run_complete") {
        throw new Error(`Terminal-race shard ${shard.shardIndex} boundary events drifted`);
    }
    let cursor = 1;
    for (let launchIndex = 0; launchIndex < plan.episodes.length; launchIndex++) {
        const episode = plan.episodes[launchIndex];
        const launch = events[cursor++];
        const arm = plan.arms.find(({ armId }) => armId === episode.armId);
        if (
            launch?.event !== "launch_counted" || launch.launchIndex !== launchIndex || launch.episodeId !== episode.episodeId ||
            launch.familyId !== shard.familyId || launch.country !== shard.country || launch.armId !== episode.armId ||
            launch.policyId !== episode.policyId || launch.seedBlockIndex !== shard.seedBlockIndex ||
            launch.requestedEngineSeed !== shard.requestedEngineSeed || launch.candidateSlot !== episode.candidateSlot || !arm
        ) throw new Error(`Terminal-race shard ${shard.shardIndex} launch ${launchIndex} drifted`);
        const completion = events[cursor++];
        if (completion?.event !== "episode_complete" || completion.launchIndex !== launchIndex) {
            throw new Error(`Terminal-race shard ${shard.shardIndex} launch ${launchIndex} did not complete cleanly`);
        }
        validateTerminalRaceResult(completion.result, {
            episodeId: episode.episodeId,
            familyId: shard.familyId,
            mapName: shard.mapName,
            mapSha256: shard.mapSha256,
            policyId: arm.policyId,
            informationInterface: arm.policy.informationInterface,
            candidateSlot: episode.candidateSlot,
            country: shard.country,
            seedBlockIndex: shard.seedBlockIndex,
            requestedEngineSeed: shard.requestedEngineSeed,
            maxTicks: campaign.maxTicks,
        });
    }
    if (cursor !== events.length - 1 || !isRecord(events[cursor].summary)) {
        throw new Error(`Terminal-race shard ${shard.shardIndex} event accounting is incomplete`);
    }
    return plan.episodes.length;
};

export const terminalRaceResultArtifactCommitmentSha256 = (
    campaign: TerminalRaceCampaign,
    resultsRoot: string,
    arrayJobId: string,
): string => crypto.createHash("sha256").update(JSON.stringify(campaign.shards.map(({ shardIndex }) => {
    const root = path.join(resultsRoot, `${arrayJobId}_${shardIndex}`, "run");
    return {
        shardIndex,
        manifestSha256: sha256File(path.join(root, "manifest.json")),
        summarySha256: sha256File(path.join(root, "summary.json")),
        eventsSha256: sha256File(path.join(root, "events.jsonl")),
    };
}))).digest("hex");

const main = (): void => {
    const campaignPath = requiredPath("CAMPAIGN");
    const resultsRoot = requiredPath("RESULTS_ROOT");
    const outputPath = requiredPath("OUT_FILE");
    const arrayJobId = requiredArrayJobId();
    if (fs.existsSync(outputPath)) throw new Error(`Refusing to overwrite Terminal-race gate ${outputPath}`);
    const campaign = validateTerminalRaceCampaign(readJson(campaignPath));
    const schedulerTasks = parseTerminalRaceSacct(execFileSync(
        "/opt/slurm/current/bin/sacct",
        ["-j", arrayJobId, "-n", "-P", "-X", "--format=JobID,JobIDRaw,State,ExitCode,Account"],
        { encoding: "utf8" },
    ), arrayJobId);
    let accountedLaunches = 0;
    for (const shard of campaign.shards) accountedLaunches += validateShard(
        campaign, resultsRoot, arrayJobId, schedulerTasks.get(shard.shardIndex) as SchedulerTask, shard,
    );
    if (accountedLaunches !== TERMINAL_RACE_LAUNCH_COUNT) throw new Error("Terminal-race launch accounting is incomplete");
    const gitCommit = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
    const gitBranch = execFileSync("git", ["branch", "--show-current"], { encoding: "utf8" }).trim();
    const dirty = execFileSync("git", ["status", "--short", "--untracked-files=no"], { encoding: "utf8" }).trim();
    if (gitCommit !== campaign.sourceGitCommit || gitBranch !== "main" || dirty) {
        throw new Error("Terminal-race gate requires the unchanged clean campaign source on main");
    }
    const output = {
        schemaVersion: 2,
        status: "PASSED_TERMINAL_RACE_LITERAL_ENDPOINT_TECHNICAL_GATE_OUTCOMES_NOT_SUMMARIZED",
        generatedAt: new Date().toISOString(),
        gateSourceGitCommit: gitCommit,
        campaignPath,
        campaignSha256: sha256File(campaignPath),
        resultsRoot,
        resultArtifactCommitmentSha256: terminalRaceResultArtifactCommitmentSha256(campaign, resultsRoot, arrayJobId),
        arrayJobId,
        schedulerAccount: "pi_jss233",
        schedulerJobIds: [...schedulerTasks.values()].map(({ schedulerJobId }) => schedulerJobId),
        shardCount: TERMINAL_RACE_SHARD_COUNT,
        requestedLaunches: TERMINAL_RACE_LAUNCH_COUNT,
        accountedLaunches,
        technicalFailures: 0,
        endpointViolations: 0,
        informationBoundaryViolations: 0,
        outcomeFieldsEmitted: [],
        authorizedNextPhase: "terminal-race-open-development-analysis",
    };
    fs.mkdirSync(path.dirname(outputPath), { recursive: true, mode: 0o700 });
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2) + "\n", { flag: "wx", mode: 0o600 });
    console.log(JSON.stringify({ outputPath, outputSha256: sha256File(outputPath), status: output.status, accountedLaunches }));
};

const invoked = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (import.meta.url === invoked) { try { main(); } catch (error) { console.error(error); process.exitCode = 1; } }
