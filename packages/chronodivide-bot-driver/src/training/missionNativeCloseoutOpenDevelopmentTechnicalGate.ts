import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { ApiEventType } from "@chronodivide/game-api";
import { BuildingEliminationTelemetryEvent } from "@supalosa/chronodivide-bot/dist/bot/logic/mission/missions/buildingEliminationMission.js";
import {
    MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_ADVANCEMENT_RULE,
    MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_BASELINE_COMMIT,
    MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_COUNTRIES,
    MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_ENGINE_SEED_BASE,
    MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_FAMILY_COUNT,
    MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_LAUNCH_COUNT,
    MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_MAX_TICKS,
    MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_ONE_SIDED_80_T_CRITICAL_DF9,
    MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_PROTOCOL_SHA256,
    MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_SEED_BLOCKS_PER_FAMILY,
    MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_SHARD_COUNT,
    MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_SOURCE_CAMPAIGN_SHA256,
    MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_SUPPORTED_POPULATION_SHA256,
    MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_V34_GATE_SHA256,
    MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_V35_GATE_SHA256,
    MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_V35_PROBE_SHA256,
    MissionNativeCloseoutOpenDevelopmentCampaign,
    buildMissionNativeCloseoutOpenDevelopmentEpisodes,
} from "./missionNativeCloseoutOpenDevelopmentCampaign.js";
import {
    MISSION_NATIVE_CLOSEOUT_ARM_ORDER,
    buildMissionNativeCloseoutArms,
    missionNativeCloseoutExperimentPolicySha256,
} from "./missionNativeCloseoutExperimentPolicy.js";
import { TerminalObjectiveTelemetry } from "./terminalObjectiveStrategy.js";
import {
    LITERAL_BUILDING_ELIMINATION_ENDPOINT,
    LITERAL_BUILDING_ELIMINATION_ENDPOINT_SHA256,
    LITERAL_BUILDING_ELIMINATION_ENDPOINT_VERSION,
} from "./literalBuildingEliminationEndpoint.js";
import { MissionNativeCloseoutOpenDevelopmentEpisodeResult } from "./missionNativeCloseoutOpenDevelopmentEpisode.js";
import { parseMissionNativeCloseoutOpenDevelopmentRunPlan, sha256File } from "./missionNativeCloseoutOpenDevelopmentPlanRunner.js";
import { validateMissionNativeCloseoutV37ProgressTelemetry } from "./missionNativeCloseoutGateV37.js";
import { derivePairedEngineSeed } from "../benchmark/seededOfflineGame.js";

type RecordValue = Record<string, unknown>;
const isRecord = (value: unknown): value is RecordValue =>
    typeof value === "object" && value !== null && !Array.isArray(value);
const readJson = (filePath: string): unknown => JSON.parse(fs.readFileSync(filePath, "utf8"));
const FROZEN_CAMPAIGN_SHA256 = "8d3213c7b5469e92122c29f127e954905deaeb50647023251d2a7421fff3ae7d";
const FROZEN_EVALUATED_SOURCE_GIT_COMMIT = "0b2b61221ad874268cc4296b7a651c616b4cd1d9";
const FROZEN_EVALUATION_FILES = [
    ["packages/chronodivide-bot-driver/src/training/missionNativeCloseoutCandidate.ts", "6e78f71e0c720237e617aaba5f6d4e7d941489248878538e42a6da8c19833d41"],
    ["packages/chronodivide-bot-driver/dist/training/missionNativeCloseoutCandidate.js", "ce69e9e3f6cd6ae48b32d66d714db62422c3f171aed50567febd271a9bd63e81"],
    ["packages/chronodivide-bot-driver/src/training/missionNativeCloseoutPolicyV34.ts", "68456a5bc96a9793589077f6b6852b05d6f235d6d7940d79cec113df6058b682"],
    ["packages/chronodivide-bot-driver/dist/training/missionNativeCloseoutPolicyV34.js", "e2476d3da631e9c7a316d8a27f30266af345c7461978b6070054c5ff24ee7307"],
    ["packages/chronodivide-bot-driver/src/training/missionNativeCloseoutPolicyV35.ts", "4ded8ea6504c29667b04248be9c75a4d6009a8d8c88b3eb6473b2e76b7ebfa3f"],
    ["packages/chronodivide-bot-driver/dist/training/missionNativeCloseoutPolicyV35.js", "4b7e066d86b1293fb89a84fef61513c72f1d0b0fba279c59106cdf4a3de64c3c"],
    ["packages/chronodivide-bot/src/bot/logic/mission/missions/buildingEliminationMission.ts", "a29ab553e42bf5af763a37eea70523bdb594eca79b7eaa2014a9da49a140e8ec"],
    ["packages/chronodivide-bot/dist/bot/logic/mission/missions/buildingEliminationMission.js", "b8171cacd930fbcd681b3b1ff901697f8c86eb78f96e6b4a4b1afe628d01f39d"],
    ["packages/chronodivide-bot-driver/src/training/literalBuildingEliminationEndpoint.ts", "e50c4523f2bc8e74addd94e75d7377972b82f3a825f8310878508ca6cf60e920"],
    ["packages/chronodivide-bot-driver/dist/training/literalBuildingEliminationEndpoint.js", "8823bf03697b3605d4039fdc24893f8e12edbd98e33db1538da0221333de2bee"],
    ["package-lock.json", "5854f0a70c2c2e6217beef35fc5820497ce9203e51cc2d399085b8250a0d6e65"],
] as const;
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
export const validateMissionNativeCloseoutEvaluationFileCommitments = (
    repoRoot: string,
    commitments: readonly (readonly [string, string])[] = FROZEN_EVALUATION_FILES,
): Record<string, string> => {
    const validated: Record<string, string> = {};
    for (const [relativePath, expectedSha256] of commitments) {
        const absolutePath = path.join(repoRoot, relativePath);
        if (!fs.existsSync(absolutePath) || sha256File(absolutePath) !== expectedSha256) {
            throw new Error(`Frozen mission-native closeout evaluation file drifted: ${relativePath}`);
        }
        validated[relativePath] = expectedSha256;
    }
    return validated;
};
const exactKeys = (value: RecordValue, expected: string[], label: string): void => {
    const actual = Object.keys(value).sort();
    const wanted = [...expected].sort();
    if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
        throw new Error(`${label} has an invalid exact schema`);
    }
};

export const validateMissionNativeCloseoutOpenDevelopmentCampaign = (value: unknown): MissionNativeCloseoutOpenDevelopmentCampaign => {
    if (
        !isRecord(value) || value.schemaVersion !== 1 ||
        value.kind !== "mission-native-closeout-open-development-literal-endpoint" ||
        value.status !== "FROZEN_MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_V1_ENDPOINT_V5" ||
        value.supportedPopulationSha256 !== MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_SUPPORTED_POPULATION_SHA256 ||
        value.sourcePopulationCommitmentSha256 !== MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_SUPPORTED_POPULATION_SHA256 ||
        value.sourceCampaignSha256 !== MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_SOURCE_CAMPAIGN_SHA256 ||
        value.familySelectionRule !== "exact-ten-fixed-families-from-prespecified-continuous-offense-campaign" ||
        value.outcomeFreePopulationSelection !== true ||
        value.endpointVersion !== LITERAL_BUILDING_ELIMINATION_ENDPOINT_VERSION ||
        value.endpointSha256 !== LITERAL_BUILDING_ELIMINATION_ENDPOINT_SHA256 ||
        value.protocolSha256 !== MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_PROTOCOL_SHA256 ||
        value.priorCampaignReuse !== "fixed_families_only_fresh_seeds_and_games" ||
        value.outcomeAccess !== "open-development-only-no-paper-claim" ||
        value.familyCount !== MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_FAMILY_COUNT ||
        value.seedBlocksPerFamily !== MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_SEED_BLOCKS_PER_FAMILY ||
        value.countryCount !== MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_COUNTRIES.length || value.reciprocalSlotCount !== 2 ||
        value.policyCount !== MISSION_NATIVE_CLOSEOUT_ARM_ORDER.length ||
        value.shardCount !== MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_SHARD_COUNT ||
        value.launchedGameCount !== MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_LAUNCH_COUNT ||
        value.engineSeedBase !== MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_ENGINE_SEED_BASE || value.maxTicks !== MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_MAX_TICKS ||
        !Array.isArray(value.countries) || value.countries.join(",") !== MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_COUNTRIES.join(",") ||
        !Array.isArray(value.advancementRule) || value.advancementRule.join("\0") !== MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_ADVANCEMENT_RULE.join("\0") ||
        !isRecord(value.confidenceInterval) || value.confidenceInterval.unit !== "family" ||
        value.confidenceInterval.familyCount !== MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_FAMILY_COUNT ||
        value.confidenceInterval.method !== "student-t-lower-bound-on-family-means" ||
        value.confidenceInterval.sidedness !== "one-sided" || value.confidenceInterval.confidenceLevel !== 0.8 ||
        value.confidenceInterval.degreesOfFreedom !== 9 ||
        value.confidenceInterval.criticalValue !== MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_ONE_SIDED_80_T_CRITICAL_DF9 ||
        !Array.isArray(value.arms) || !Array.isArray(value.selectedFamilies) || !Array.isArray(value.shards) ||
        value.arms.length !== MISSION_NATIVE_CLOSEOUT_ARM_ORDER.length ||
        value.selectedFamilies.length !== MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_FAMILY_COUNT || value.shards.length !== MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_SHARD_COUNT ||
        typeof value.supportedPopulationPath !== "string" || typeof value.sourceCampaignPath !== "string" ||
        typeof value.protocolPath !== "string" || !Array.isArray(value.technicalEvidence) ||
        value.technicalEvidence.length !== 3 || value.baselineGitCommit !== MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_BASELINE_COMMIT
    ) throw new Error("Mission-native closeout open-development campaign has an invalid frozen schema");
    const campaign = value as unknown as MissionNativeCloseoutOpenDevelopmentCampaign;
    const frozenArms = buildMissionNativeCloseoutArms();
    if (
        sha256File(campaign.supportedPopulationPath) !== MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_SUPPORTED_POPULATION_SHA256 ||
        sha256File(campaign.sourceCampaignPath) !== MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_SOURCE_CAMPAIGN_SHA256 ||
        sha256File(campaign.protocolPath) !== MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_PROTOCOL_SHA256 ||
        campaign.technicalEvidence.some((evidence, index) => {
            const expected = [
                ["v34_population", MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_V34_GATE_SHA256, "22262232"],
                ["v35_liveness_probe", MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_V35_PROBE_SHA256, "22264739"],
                ["v35_population_revalidation", MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_V35_GATE_SHA256, "22267338"],
            ] as const;
            return evidence.role !== expected[index][0] || evidence.sha256 !== expected[index][1] ||
                evidence.jobId !== expected[index][2] || sha256File(evidence.path) !== expected[index][1];
        }) ||
        campaign.arms.some((arm, index) => {
            const expected = frozenArms[index];
            return arm.armId !== expected.armId || arm.policyId !== expected.policyId ||
                missionNativeCloseoutExperimentPolicySha256(arm.policy) !== expected.policyId;
        }) ||
        new Set(campaign.selectedFamilies.map(({ familyId }) => familyId)).size !== MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_FAMILY_COUNT ||
        new Set(campaign.selectedFamilies.map(({ mapSha256 }) => mapSha256)).size !== MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_FAMILY_COUNT ||
        campaign.shards.some((shard, index) => {
            const familyIndex = Math.floor(index / (MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_SEED_BLOCKS_PER_FAMILY * MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_COUNTRIES.length));
            const familySeedIndex = Math.floor(index / MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_COUNTRIES.length) % MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_SEED_BLOCKS_PER_FAMILY;
            const family = campaign.selectedFamilies[familyIndex];
            return shard.shardIndex !== index || shard.familyId !== family.familyId ||
                shard.mapName !== family.mapName || shard.mapSha256 !== family.mapSha256 ||
                shard.country !== MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_COUNTRIES[index % MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_COUNTRIES.length] ||
                shard.familySeedIndex !== familySeedIndex || shard.seedBlockIndex !== index ||
                shard.requestedEngineSeed !== derivePairedEngineSeed(MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_ENGINE_SEED_BASE, index) ||
                shard.launchedGameCount !== MISSION_NATIVE_CLOSEOUT_ARM_ORDER.length * 2;
        }) ||
        new Set(campaign.shards.map(({ planFile }) => planFile)).size !== MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_SHARD_COUNT ||
        new Set(campaign.shards.map(({ planSha256 }) => planSha256)).size !== MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_SHARD_COUNT ||
        new Set(campaign.shards.map(({ runId }) => runId)).size !== MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_SHARD_COUNT
    ) throw new Error("Mission-native closeout open-development campaign schedule or evidence chain drifted");
    const v35PopulationEvidence = campaign.technicalEvidence.find(
        ({ role }) => role === "v35_population_revalidation",
    );
    const v35PopulationGate = v35PopulationEvidence ? readJson(v35PopulationEvidence.path) : null;
    const v35PopulationInput = isRecord(v35PopulationGate) && isRecord(v35PopulationGate.input)
        ? v35PopulationGate.input
        : null;
    if (
        !v35PopulationInput ||
        v35PopulationInput.sha256 !== "dc120885b30cf4d82b90cfcbe58fff6ec42c2f247112e53eeaf3c9b7d5409f85" ||
        v35PopulationInput.originalSchedulerJobId !== "22265722" ||
        v35PopulationInput.sourceGitCommit !== "329bd68913c390cae342df4fe9beaae37f9d79c2" ||
        v35PopulationInput.gameCount !== 72 || typeof v35PopulationInput.file !== "string" ||
        sha256File(v35PopulationInput.file) !== v35PopulationInput.sha256
    ) throw new Error("Mission-native closeout V35-R2 evidence does not bind the complete V35-R1 population");
    return campaign;
};

type SchedulerTask = { schedulerJobId: string; state: "COMPLETED"; exitCode: "0:0"; account: "pi_jss233" };
export const parseMissionNativeCloseoutOpenDevelopmentSacct = (raw: string, arrayJobId: string): Map<number, SchedulerTask> => {
    const tasks = new Map<number, SchedulerTask>();
    for (const [lineIndex, line] of raw.split("\n").entries()) {
        if (!line) continue;
        const fields = line.split("|");
        if (fields.length !== 5) throw new Error(`Mission-native closeout open-development sacct line ${lineIndex + 1} is malformed`);
        const [logicalJobId, schedulerJobId, state, exitCode, account] = fields;
        const match = new RegExp(`^${arrayJobId}_(\\d+)$`).exec(logicalJobId);
        const taskIndex = match ? Number(match[1]) : -1;
        if (
            !match || !/^\d+$/.test(schedulerJobId) || taskIndex < 0 || taskIndex >= MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_SHARD_COUNT ||
            tasks.has(taskIndex) || state !== "COMPLETED" || exitCode !== "0:0" || account !== "pi_jss233"
        ) throw new Error(`Mission-native closeout open-development scheduler row ${lineIndex + 1} is failed, duplicate, or unauthorized`);
        tasks.set(taskIndex, { schedulerJobId, state, exitCode, account });
    }
    if (tasks.size !== MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_SHARD_COUNT) throw new Error(`Mission-native closeout open-development sacct returned ${tasks.size}/${MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_SHARD_COUNT} tasks`);
    return tasks;
};

export const validateMissionNativeCloseoutOpenDevelopmentTelemetry = (value: unknown): TerminalObjectiveTelemetry => {
    if (
        !isRecord(value) || value.schemaVersion !== 2 || !Number.isSafeInteger(value.tick) ||
        (value.tick as number) < 0 ||
        !new Set(["visible_memory", "public_complete_state"]).has(String(value.informationBoundary)) ||
        value.informationBoundary !== "public_complete_state" ||
        value.mechanism !== "continuous_objective_offense"
    ) {
        throw new Error("Mission-native closeout open-development policy telemetry is malformed");
    }
    const allowed = new Set([
        "schemaVersion", "event", "informationBoundary", "tick", "mechanism", "decisionKind",
        "decisionReason", "selectedBuildingId", "selectedBuildingVisible", "selectedBuildingObservedBy",
        "selectedAttackerIds",
        "blockerIds", "threatIds", "predictedCompletionTicks", "directCompletionTicks",
        "earliestLethalInterceptTick", "earliestBaseDestructionTick", "noProgressTicks",
        "searchCoverageFraction", "searchPointCount", "invalidatedBuildingIds",
        "activationReason", "exactEnemyBuildingCount", "eligibleAttackerCount",
        "reservedCombatantCount", "reservedCombatantIds", "reservedActionCounts",
        "certifiedAttackerCount", "rejectedAttackerCountsByReason", "selectedAttackerRulesNames",
        "delegatedActionCounts", "assignedCombatantFraction",
    ]);
    if (Object.keys(value).some((key) => !allowed.has(key))) {
        throw new Error(`Mission-native closeout open-development ${String(value.event)} telemetry has a non-allowlisted field`);
    }
    if (!new Set(["decision", "search_orders", "memory_invalidated"]).has(String(value.event))) {
        throw new Error("Mission-native closeout open-development policy telemetry event is not allowlisted");
    }
    for (const key of [
        "selectedAttackerIds", "blockerIds", "threatIds", "invalidatedBuildingIds", "reservedCombatantIds",
    ]) {
        const field = value[key];
        if (field !== undefined && (!Array.isArray(field) || field.some((id) => !Number.isSafeInteger(id) || id < 0))) {
            throw new Error(`Mission-native closeout open-development telemetry ${key} is not an array of nonnegative integer ids`);
        }
    }
    for (const key of [
        "selectedBuildingId", "predictedCompletionTicks", "directCompletionTicks",
        "earliestLethalInterceptTick", "earliestBaseDestructionTick", "noProgressTicks", "searchPointCount",
        "exactEnemyBuildingCount", "eligibleAttackerCount", "reservedCombatantCount", "certifiedAttackerCount",
    ]) {
        const field = value[key];
        if (field !== undefined && field !== null && (!Number.isSafeInteger(field) || (field as number) < 0)) {
            throw new Error(`Mission-native closeout open-development telemetry ${key} is not a nonnegative integer or null`);
        }
    }
    if (
        value.searchCoverageFraction !== undefined &&
        (typeof value.searchCoverageFraction !== "number" || value.searchCoverageFraction < 0 || value.searchCoverageFraction > 1)
    ) throw new Error("Mission-native closeout open-development search coverage is outside [0,1]");
    if (value.selectedBuildingVisible !== undefined && typeof value.selectedBuildingVisible !== "boolean") {
        throw new Error("Mission-native closeout open-development selected-building visibility is not boolean");
    }
    if (value.selectedBuildingObservedBy !== undefined && !new Set([
        "vision", "memory", "public_complete_state",
    ]).has(String(value.selectedBuildingObservedBy))) {
        throw new Error("Mission-native closeout open-development selected-building observation source is invalid");
    }
    if (value.activationReason !== undefined && !new Set([
        "fixed_tick", "guarded_building_count",
    ]).has(String(value.activationReason))) throw new Error("Mission-native closeout open-development activation reason is invalid");
    if (
        value.assignedCombatantFraction !== undefined &&
        (typeof value.assignedCombatantFraction !== "number" ||
            value.assignedCombatantFraction < 0 || value.assignedCombatantFraction > 1)
    ) throw new Error("Mission-native closeout open-development assigned combatant fraction is outside [0,1]");
    if (value.selectedAttackerRulesNames !== undefined && (
        !Array.isArray(value.selectedAttackerRulesNames) ||
        value.selectedAttackerRulesNames.some((name) => typeof name !== "string" || name.length === 0)
    )) throw new Error("Mission-native closeout open-development selected-attacker rules names are invalid");
    if (value.rejectedAttackerCountsByReason !== undefined) {
        if (!isRecord(value.rejectedAttackerCountsByReason)) {
            throw new Error("Mission-native closeout open-development rejection counts are invalid");
        }
        for (const [reason, count] of Object.entries(value.rejectedAttackerCountsByReason)) {
            if (!reason || !Number.isSafeInteger(count) || (count as number) < 0) {
                throw new Error("Mission-native closeout open-development rejection counts are invalid");
            }
        }
    }
    for (const key of ["delegatedActionCounts", "reservedActionCounts"] as const) {
        const counts = value[key];
        if (counts !== undefined) {
            if (!isRecord(counts)) throw new Error(`Mission-native closeout open-development ${key} is invalid`);
            exactKeys(counts, ["idle", "moving", "attacking", "other"], `Mission-native closeout open-development ${key}`);
            if (Object.values(counts).some((count) =>
                !Number.isSafeInteger(count) || (count as number) < 0,
            )) throw new Error(`Mission-native closeout open-development ${key} is invalid`);
        }
    }
    const selectedAttackerIds = value.selectedAttackerIds;
    const reservedCombatantIds = value.reservedCombatantIds;
    if (
        Array.isArray(selectedAttackerIds) && Array.isArray(reservedCombatantIds) &&
        selectedAttackerIds.some((id) => reservedCombatantIds.includes(id))
    ) throw new Error("Mission-native closeout open-development selected and reserved combatants overlap");
    if (value.decisionKind !== undefined && !new Set([
        "search", "regroup", "building_strike", "terminal_candidate_strike", "blocker_clear",
        "base_defense", "predecessor_fallback",
    ]).has(String(value.decisionKind))) throw new Error("Mission-native closeout open-development decision kind is invalid");
    if (value.decisionReason !== undefined && typeof value.decisionReason !== "string") {
        throw new Error("Mission-native closeout open-development decision reason is invalid");
    }
    return value as unknown as TerminalObjectiveTelemetry;
};

const findForbiddenTelemetryKey = (value: unknown): string | null => {
    if (Array.isArray(value)) {
        for (const item of value) {
            const found = findForbiddenTelemetryKey(item);
            if (found) return found;
        }
        return null;
    }
    if (!isRecord(value)) return null;
    for (const [key, item] of Object.entries(value)) {
        if (/winner|score|outcome|terminalBuildingCounts/i.test(key)) return key;
        const found = findForbiddenTelemetryKey(item);
        if (found) return found;
    }
    return null;
};

export const validateMissionNativeBuildingEliminationTelemetry = (
    value: unknown,
): BuildingEliminationTelemetryEvent => {
    if (
        !isRecord(value) || !Number.isSafeInteger(value.schemaVersion) || (value.schemaVersion as number) < 1 ||
        typeof value.event !== "string" || value.event.length === 0 ||
        !Number.isSafeInteger(value.tick) || (value.tick as number) < 0
    ) throw new Error("Mission-native building-elimination telemetry is malformed");
    const forbidden = findForbiddenTelemetryKey(value);
    if (forbidden) throw new Error(`Mission-native telemetry exposes forbidden outcome key ${forbidden}`);
    return value as unknown as BuildingEliminationTelemetryEvent;
};

export const validateMissionNativeCloseoutV35FallbackTelemetry = (
    telemetry: readonly RecordValue[],
    episodeId: string,
): void => {
    const deadlines = telemetry.filter((event) => event.event === "objective_progress_deadline");
    const starts = deadlines.filter((event) => event.phase === "fallback_started");
    const active = deadlines.filter((event) => event.phase === "fallback_active");
    const replans = deadlines.filter((event) => event.phase === "replan_started");
    for (const start of starts) {
        if (!Array.isArray(start.releasedUnitIds) || start.releasedUnitIds.length < 1) {
            throw new Error(`Mission-native V35 fallback ${episodeId} did not release the overlay force`);
        }
        const matchingActive = active.filter((event) =>
            typeof event.tick === "number" && typeof start.tick === "number" && event.tick >= start.tick &&
            event.fallbackUntilTick === start.fallbackUntilTick,
        );
        if (!matchingActive.some((event) =>
            Array.isArray(event.suspendedOverlayMissionNames) && event.suspendedOverlayMissionNames.length > 0,
        )) throw new Error(`Mission-native V35 fallback ${episodeId} did not suspend the overlay missions`);
        if (!matchingActive.some((event) =>
            Array.isArray(event.activePredecessorMissionNames) && event.activePredecessorMissionNames.length > 0,
        )) throw new Error(`Mission-native V35 fallback ${episodeId} lacked actual predecessor ownership`);
        if (!replans.some((event) =>
            typeof event.tick === "number" && typeof start.fallbackUntilTick === "number" &&
            event.tick >= start.fallbackUntilTick,
        )) throw new Error(`Mission-native V35 fallback ${episodeId} lacked its exact replan`);
    }
    if (active.length > 0 && starts.length === 0) {
        throw new Error(`Mission-native V35 completion ${episodeId} has an orphan fallback-active phase`);
    }
};

export const validateMissionNativeCloseoutOpenDevelopmentResult = (
    value: unknown,
    expected: {
        episodeId: string;
        familyId: string;
        mapName: string;
        mapSha256: string;
        policyId: string;
        candidateCore: "external_supalosa" | "mission_native_v34" | "mission_native_v35" | "mission_native_v37";
        missionPolicyId: string | null;
        informationBoundary: "none" | "visible_memory" | "public_complete_state";
        candidateSlot: 0 | 1;
        country: string;
        seedBlockIndex: number;
        requestedEngineSeed: number;
        maxTicks: number;
    },
): MissionNativeCloseoutOpenDevelopmentEpisodeResult => {
    if (isRecord(value)) exactKeys(value, [
        "schemaVersion", "episodeId", "familyId", "mapName", "mapSha256", "policyId", "policySha256",
        "candidateCore", "missionPolicyId", "policyInformationBoundary", "endpointVersion", "endpointSha256", "endpoint", "seedBlockIndex",
        "requestedEngineSeed", "botRandomSeed", "candidateBotRandomSeed", "baselineBotRandomSeed",
        "engineSeedEpochMs", "candidateSlot", "candidateCountry", "baselineCountry", "candidateStart",
        "baselineStart", "maxTicks", "ticks", "wallTimeMs", "shortGame", "outcomeStatus", "winner",
        "candidateScore", "engineFinished", "terminal", "technicalFailure", "quitSuppression",
        "terminalBuildingCounts", "endpointEstablished", "dispositionHistory", "policyTelemetry",
    ], `Mission-native closeout open-development completion ${expected.episodeId}`);
    if (
        !isRecord(value) || value.schemaVersion !== 1 || value.episodeId !== expected.episodeId ||
        value.familyId !== expected.familyId || value.mapName !== expected.mapName || value.mapSha256 !== expected.mapSha256 ||
        value.policyId !== expected.policyId || value.policySha256 !== expected.policyId ||
        value.candidateCore !== expected.candidateCore || value.missionPolicyId !== expected.missionPolicyId ||
        value.policyInformationBoundary !== expected.informationBoundary ||
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
    ) throw new Error(`Mission-native closeout open-development completion ${expected.episodeId} is malformed or technically invalid`);
    if (expected.informationBoundary === "none" && value.policyTelemetry.length !== 0) {
        throw new Error(`Mission-native closeout open-development disabled completion ${expected.episodeId} emitted policy telemetry`);
    }
    value.policyTelemetry.forEach((telemetry) => {
        validateMissionNativeBuildingEliminationTelemetry(telemetry);
    });
    if (
        expected.candidateCore === "mission_native_v34" &&
        value.policyTelemetry.some((event) => event.schemaVersion === 29 || event.event === "objective_progress_deadline")
    ) throw new Error(`Mission-native V34 completion ${expected.episodeId} emitted V35 deadline telemetry`);
    if (expected.candidateCore === "mission_native_v35") {
        validateMissionNativeCloseoutV35FallbackTelemetry(value.policyTelemetry as unknown as RecordValue[], expected.episodeId);
    }
    if (expected.candidateCore === "mission_native_v37") {
        validateMissionNativeCloseoutV37ProgressTelemetry(
            value.policyTelemetry as BuildingEliminationTelemetryEvent[],
            value.ticks as number,
        );
    }
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
    ) throw new Error(`Mission-native closeout open-development completion ${expected.episodeId} has a contradictory terminal state`);
    if (value.outcomeStatus === "tick_cap_draw") {
        exactKeys(terminal, ["endpointVersion", "endpointSha256", "tick", "status", "winner"],
            `Mission-native closeout open-development cap terminal ${expected.episodeId}`);
        if (terminal.tick !== value.ticks || value.engineFinished !== false) {
            throw new Error(`Mission-native closeout open-development cap terminal ${expected.episodeId} has an invalid tick or engine state`);
        }
    } else if (value.outcomeStatus === "engine_nonliteral_termination_draw") {
        exactKeys(terminal, [
            "endpointVersion", "endpointSha256", "endpoint", "tick", "status", "winner",
            "defeated", "evaluation", "engineFinishedSameUpdate",
        ], `Mission-native closeout open-development nonliteral terminal ${expected.episodeId}`);
        if (
            terminal.endpoint !== LITERAL_BUILDING_ELIMINATION_ENDPOINT ||
            terminal.tick !== value.ticks || value.engineFinished !== true ||
            terminal.engineFinishedSameUpdate !== true || !isRecord(terminal.defeated) ||
            (terminal.defeated.candidate !== true && terminal.defeated.baseline !== true)
        ) throw new Error(`Mission-native closeout open-development nonliteral terminal ${expected.episodeId} has invalid engine evidence`);
    } else {
        exactKeys(terminal, [
            "endpointVersion", "endpointSha256", "endpoint", "tick", "status", "winner", "evaluation",
            "engineFinishedSameUpdate",
        ], `Mission-native closeout open-development physical terminal ${expected.episodeId}`);
        if (
            terminal.endpoint !== LITERAL_BUILDING_ELIMINATION_ENDPOINT ||
            terminal.tick !== value.ticks || terminal.engineFinishedSameUpdate !== value.engineFinished
        ) throw new Error(`Mission-native closeout open-development physical terminal ${expected.episodeId} has invalid endpoint metadata`);
    }
    if (
        (value.winner === "candidate" && value.terminalBuildingCounts.baseline !== 0) ||
        (value.winner === "baseline" && value.terminalBuildingCounts.candidate !== 0) ||
        (value.outcomeStatus === "simultaneous_draw" &&
            (value.terminalBuildingCounts.candidate !== 0 || value.terminalBuildingCounts.baseline !== 0))
    ) throw new Error(`Mission-native closeout open-development completion ${expected.episodeId} contradicts its terminal building counts`);
    const candidateName = `MissionNativeCandidate_${expected.seedBlockIndex}_${expected.candidateSlot}`;
    const baselineName = `MissionNativeBaseline_${expected.seedBlockIndex}_${expected.candidateSlot}`;
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
            throw new Error(`Mission-native closeout open-development win ${expected.episodeId} lacks its endpoint ledger`);
        }
        const side = value.winner;
        const victim = side === "candidate" ? "baseline" : "candidate";
        const rows = validatePhysicalRows(
            terminal.evaluation.zeroingDispositions[side],
            side === "candidate" ? candidateName : baselineName,
            side === "candidate" ? baselineName : candidateName,
            `Mission-native closeout open-development win ${expected.episodeId}`,
        );
        const preCounts = isRecord(terminal.evaluation.preCounts) ? terminal.evaluation.preCounts : null;
        const postCounts = isRecord(terminal.evaluation.postCounts) ? terminal.evaluation.postCounts : null;
        if (
            !Array.isArray(rows) || !preCounts || !postCounts || !Number.isSafeInteger(preCounts[victim]) ||
            (preCounts[victim] as number) <= 0 || postCounts[victim] !== 0 || rows.length !== preCounts[victim] ||
            terminal.evaluation.enabledBeforeUpdate !== true || terminal.evaluation[`${side}PhysicalWin`] !== true ||
            terminal.evaluation[`${victim}PhysicalWin`] !== false
        ) throw new Error(`Mission-native closeout open-development win ${expected.episodeId} violates literal building destruction`);
    } else if (value.outcomeStatus === "simultaneous_draw") {
        if (!isRecord(terminal.evaluation) || !isRecord(terminal.evaluation.zeroingDispositions)) {
            throw new Error(`Mission-native closeout open-development simultaneous draw ${expected.episodeId} lacks its endpoint ledger`);
        }
        const preCounts = isRecord(terminal.evaluation.preCounts) ? terminal.evaluation.preCounts : null;
        const postCounts = isRecord(terminal.evaluation.postCounts) ? terminal.evaluation.postCounts : null;
        for (const side of ["candidate", "baseline"] as const) {
            const victim = side === "candidate" ? "baseline" : "candidate";
            const rows = validatePhysicalRows(
                terminal.evaluation.zeroingDispositions[side],
                side === "candidate" ? candidateName : baselineName,
                side === "candidate" ? baselineName : candidateName,
                `Mission-native closeout open-development simultaneous draw ${expected.episodeId} ${side}`,
            );
            if (
                !preCounts || !postCounts || !Number.isSafeInteger(preCounts[victim]) ||
                (preCounts[victim] as number) <= 0 || postCounts[victim] !== 0 ||
                rows.length !== preCounts[victim] || terminal.evaluation.enabledBeforeUpdate !== true ||
                terminal.evaluation[`${side}PhysicalWin`] !== true
            ) throw new Error(`Mission-native closeout open-development simultaneous draw ${expected.episodeId} violates literal building destruction`);
        }
    }
    return value as unknown as MissionNativeCloseoutOpenDevelopmentEpisodeResult;
};

const parseEvents = (eventsPath: string): RecordValue[] => fs.readFileSync(eventsPath, "utf8")
    .split("\n").filter(Boolean).map((line, index) => {
        const value = JSON.parse(line) as unknown;
        if (!isRecord(value) || typeof value.event !== "string") throw new Error(`Malformed Mission-native closeout open-development event ${index}`);
        return value;
    });

const validateShard = (
    campaign: MissionNativeCloseoutOpenDevelopmentCampaign,
    resultsRoot: string,
    arrayJobId: string,
    task: SchedulerTask,
    shard: MissionNativeCloseoutOpenDevelopmentCampaign["shards"][number],
): { launches: number; exposedEnabledArmSlotKeys: string[] } => {
    const resultDir = path.join(resultsRoot, `${arrayJobId}_${shard.shardIndex}`, "run");
    const manifestPath = path.join(resultDir, "manifest.json");
    const summaryPath = path.join(resultDir, "summary.json");
    const eventsPath = path.join(resultDir, "events.jsonl");
    for (const required of [manifestPath, summaryPath, eventsPath, shard.planFile]) {
        if (!fs.existsSync(required)) throw new Error(`Mission-native closeout open-development shard ${shard.shardIndex} lacks ${required}`);
    }
    if (sha256File(shard.planFile) !== shard.planSha256) throw new Error(`Mission-native closeout open-development shard ${shard.shardIndex} plan changed`);
    const summary = readJson(summaryPath);
    if (
        !isRecord(summary) || summary.schemaVersion !== 2 ||
        summary.status !== "COMPLETE_MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_SHARD" ||
        summary.runId !== shard.runId || summary.planSha256 !== shard.planSha256 ||
        summary.requestedLaunches !== shard.launchedGameCount || summary.accountedLaunches !== shard.launchedGameCount ||
        summary.completed !== shard.launchedGameCount || summary.technicalFailures !== 0 ||
        summary.complete !== true || summary.technicallyClean !== true || summary.outcomeAccess !== "open-development-only" ||
        !Number.isSafeInteger(summary.candidateWins) || !Number.isSafeInteger(summary.baselineWins) || !Number.isSafeInteger(summary.draws) ||
        (summary.candidateWins as number) + (summary.baselineWins as number) + (summary.draws as number) !== shard.launchedGameCount
    ) throw new Error(`Mission-native closeout open-development shard ${shard.shardIndex} summary is not one complete clean block`);
    const outer = readJson(manifestPath);
    if (!isRecord(outer) || outer.planSha256 !== shard.planSha256 || !isRecord(outer.plan) || !isRecord(outer.manifest)) {
        throw new Error(`Mission-native closeout open-development shard ${shard.shardIndex} manifest is malformed`);
    }
    const plan = parseMissionNativeCloseoutOpenDevelopmentRunPlan(outer.plan);
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
    ) throw new Error(`Mission-native closeout open-development shard ${shard.shardIndex} plan commitments drifted`);
    const expectedEpisodes = buildMissionNativeCloseoutOpenDevelopmentEpisodes(campaign.arms);
    if (plan.episodes.some((episode, index) => JSON.stringify(episode) !== JSON.stringify(expectedEpisodes[index]))) {
        throw new Error(`Mission-native closeout open-development shard ${shard.shardIndex} episode order drifted`);
    }
    const scheduler = outer.manifest.scheduler;
    const source = outer.manifest.source;
    if (
        !isRecord(scheduler) || scheduler.account !== "pi_jss233" || String(scheduler.arrayJobId) !== arrayJobId ||
        String(scheduler.arrayTaskId) !== String(shard.shardIndex) || String(scheduler.jobId) !== task.schedulerJobId ||
        !isRecord(source) || source.gitCommit !== campaign.sourceGitCommit || source.gitBranch !== "main" || source.trackedDirty !== false
    ) throw new Error(`Mission-native closeout open-development shard ${shard.shardIndex} scheduler or source provenance drifted`);
    const events = parseEvents(eventsPath);
    if (events[0]?.event !== "run_start" || events[events.length - 1]?.event !== "run_complete") {
        throw new Error(`Mission-native closeout open-development shard ${shard.shardIndex} boundary events drifted`);
    }
    let cursor = 1;
    const exposedEnabledArmSlotKeys = new Set<string>();
    for (let launchIndex = 0; launchIndex < plan.episodes.length; launchIndex++) {
        const episode = plan.episodes[launchIndex];
        const launch = events[cursor++];
        const arm = plan.arms.find(({ armId }) => armId === episode.armId);
        if (
            launch?.event !== "launch_counted" || launch.launchIndex !== launchIndex || launch.episodeId !== episode.episodeId ||
            launch.familyId !== shard.familyId || launch.country !== shard.country || launch.armId !== episode.armId ||
            launch.policyId !== episode.policyId || launch.seedBlockIndex !== shard.seedBlockIndex ||
            launch.requestedEngineSeed !== shard.requestedEngineSeed || launch.candidateSlot !== episode.candidateSlot || !arm
        ) throw new Error(`Mission-native closeout open-development shard ${shard.shardIndex} launch ${launchIndex} drifted`);
        const completion = events[cursor++];
        if (completion?.event !== "episode_complete" || completion.launchIndex !== launchIndex) {
            throw new Error(`Mission-native closeout open-development shard ${shard.shardIndex} launch ${launchIndex} did not complete cleanly`);
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
            arm.policy.missionPolicy !== null &&
            result.policyTelemetry.some(({ event }) => event === "activated" ||
                event === "objective_race_allocation" || event === "objective_physical_progress")
        ) exposedEnabledArmSlotKeys.add(`${arm.armId}|slot${episode.candidateSlot}`);
    }
    if (cursor !== events.length - 1 || !isRecord(events[cursor].summary)) {
        throw new Error(`Mission-native closeout open-development shard ${shard.shardIndex} event accounting is incomplete`);
    }
    return { launches: plan.episodes.length, exposedEnabledArmSlotKeys: [...exposedEnabledArmSlotKeys] };
};

export const missionNativeCloseoutOpenDevelopmentResultArtifactCommitmentSha256 = (
    campaign: MissionNativeCloseoutOpenDevelopmentCampaign,
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

export const validateMissionNativeExposureByCountryAndSlot = (
    exposureByCountry: ReadonlyMap<string, ReadonlySet<string>>,
    enabledArmIds: readonly string[],
): void => {
    const requiredArmSlotKeys = enabledArmIds
        .flatMap((armId) => ([0, 1] as const).map((slot) => `${armId}|slot${slot}`));
    for (const country of MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_COUNTRIES) {
        const exposed = exposureByCountry.get(country) ?? new Set<string>();
        const missingExposure = requiredArmSlotKeys.filter((armSlotKey) => !exposed.has(armSlotKey));
        if (missingExposure.length > 0) {
            throw new Error(
                `Mission-native closeout intervention exposure is absent for ${country}: ${missingExposure.join(",")}`,
            );
        }
    }
};

const main = (): void => {
    const campaignPath = requiredPath("CAMPAIGN");
    const resultsRoot = requiredPath("RESULTS_ROOT");
    const outputPath = requiredPath("OUT_FILE");
    const arrayJobId = requiredArrayJobId();
    if (fs.existsSync(outputPath)) throw new Error(`Refusing to overwrite Mission-native closeout open-development gate ${outputPath}`);
    if (sha256File(campaignPath) !== FROZEN_CAMPAIGN_SHA256) {
        throw new Error("Mission-native closeout open-development campaign file drifted from its frozen commitment");
    }
    const campaign = validateMissionNativeCloseoutOpenDevelopmentCampaign(readJson(campaignPath));
    if (campaign.sourceGitCommit !== FROZEN_EVALUATED_SOURCE_GIT_COMMIT) {
        throw new Error("Mission-native closeout open-development evaluated source commit drifted");
    }
    const schedulerTasks = parseMissionNativeCloseoutOpenDevelopmentSacct(execFileSync(
        "/opt/slurm/current/bin/sacct",
        ["-j", arrayJobId, "-n", "-P", "-X", "--format=JobID,JobIDRaw,State,ExitCode,Account"],
        { encoding: "utf8" },
    ), arrayJobId);
    let accountedLaunches = 0;
    const exposureByCountry = new Map<string, Set<string>>();
    for (const shard of campaign.shards) {
        const validated = validateShard(
            campaign, resultsRoot, arrayJobId, schedulerTasks.get(shard.shardIndex) as SchedulerTask, shard,
        );
        accountedLaunches += validated.launches;
        const countryExposure = exposureByCountry.get(shard.country) ?? new Set<string>();
        validated.exposedEnabledArmSlotKeys.forEach((armSlotKey) => countryExposure.add(armSlotKey));
        exposureByCountry.set(shard.country, countryExposure);
    }
    if (accountedLaunches !== MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_LAUNCH_COUNT) throw new Error("Mission-native closeout open-development launch accounting is incomplete");
    validateMissionNativeExposureByCountryAndSlot(
        exposureByCountry,
        campaign.arms.filter(({ policy }) => policy.missionPolicy !== null).map(({ armId }) => armId),
    );
    const gitCommit = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
    const gitBranch = execFileSync("git", ["branch", "--show-current"], { encoding: "utf8" }).trim();
    const dirty = execFileSync("git", ["status", "--short", "--untracked-files=no"], { encoding: "utf8" }).trim();
    if (gitBranch !== "main" || dirty) {
        throw new Error("Mission-native closeout open-development gate requires clean tracked main");
    }
    const repoRoot = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
    const evaluatedSourceFiles = validateMissionNativeCloseoutEvaluationFileCommitments(repoRoot);
    const output = {
        schemaVersion: 3,
        status: "PASSED_MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_LITERAL_ENDPOINT_TECHNICAL_GATE_OUTCOMES_NOT_SUMMARIZED",
        generatedAt: new Date().toISOString(),
        gateSourceGitCommit: gitCommit,
        evaluatedSourceGitCommit: campaign.sourceGitCommit,
        evaluatedSourceFiles,
        campaignPath,
        campaignSha256: sha256File(campaignPath),
        resultsRoot,
        resultArtifactCommitmentSha256: missionNativeCloseoutOpenDevelopmentResultArtifactCommitmentSha256(campaign, resultsRoot, arrayJobId),
        arrayJobId,
        schedulerAccount: "pi_jss233",
        schedulerJobIds: [...schedulerTasks.values()].map(({ schedulerJobId }) => schedulerJobId),
        shardCount: MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_SHARD_COUNT,
        requestedLaunches: MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_LAUNCH_COUNT,
        accountedLaunches,
        technicalFailures: 0,
        endpointViolations: 0,
        informationBoundaryViolations: 0,
        interventionExposure: Object.fromEntries(MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_COUNTRIES.map((country) => [
            country, [...(exposureByCountry.get(country) ?? [])].sort(),
        ])),
        outcomeFieldsEmitted: [],
        authorizedNextPhase: "mission-native-closeout-open-development-analysis",
    };
    fs.mkdirSync(path.dirname(outputPath), { recursive: true, mode: 0o700 });
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2) + "\n", { flag: "wx", mode: 0o600 });
    console.log(JSON.stringify({ outputPath, outputSha256: sha256File(outputPath), status: output.status, accountedLaunches }));
};

const invoked = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (import.meta.url === invoked) { try { main(); } catch (error) { console.error(error); process.exitCode = 1; } }
