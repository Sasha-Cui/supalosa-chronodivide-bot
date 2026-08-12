import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
    METHOD_V3_COUNTRIES,
    METHOD_V3_STAGE1_LAUNCH_COUNT,
} from "./methodV3MechanismPlanGenerator.js";
import { hasCompleteMethodV3Stage1SchedulerTasks } from "./methodV3Stage1SchedulerGate.js";
import {
    validateMethodV3ActualWin,
    validateMethodV3MechanismCampaign,
} from "./methodV3MechanismTechnicalGate.js";
import {
    buildMethodV3Stage2Episodes,
    METHOD_V3_STAGE2_MAX_TICKS,
    MethodV3Stage2Campaign,
} from "./methodV3Stage2PlanGenerator.js";
import { generateMethodV3Stage2Policies } from "./methodV3Stage2Policies.js";
import {
    METHOD_V3_STAGE2_COUNTRY_COUNTS,
    METHOD_V3_STAGE2_FAMILY_COUNTS,
    METHOD_V3_STAGE2_POLICY_COUNTS,
} from "./methodV3Stage2Schedule.js";
import { METHOD_V3_STAGE2_SELECTION_RULE } from "./methodV3Stage2Reducer.js";
import { parseResearchRunPlan, sha256File } from "./researchPlanRunner.js";
import {
    METHOD_V3_STAGE2_POLICY_SCHEMA_VERSION,
    projectMethodV3PolicyToStage2,
    researchPolicySha256,
} from "./researchPolicy.js";

const isRecord = (value: unknown): value is Record<string, unknown> =>
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

type SchedulerTaskAccounting = {
    schedulerJobId: string;
    state: "COMPLETED";
    exitCode: "0:0";
    account: "pi_jss233";
};

export const validateMethodV3Stage2ArrayLaunch = (
    value: unknown,
    campaign: MethodV3Stage2Campaign,
    campaignPath: string,
    arrayJobId: string,
): void => {
    if (
        !isRecord(value) ||
        value.schemaVersion !== 1 ||
        value.kind !== "stage2_array_launch" ||
        value.schedulerAccount !== "pi_jss233" ||
        String(value.jobId) !== arrayJobId ||
        value.optimizerRunIndex !== campaign.optimizerRunIndex ||
        value.stage !== campaign.stage ||
        value.shardCount !== campaign.shards.length ||
        path.resolve(String(value.campaignPath)) !== campaignPath ||
        value.campaignSha256 !== sha256File(campaignPath) ||
        (campaign.stage === 0
            ? (typeof value.parentInitializerJobId !== "string" &&
                typeof value.parentInitializerJobId !== "number")
            : (typeof value.parentControllerJobId !== "string" &&
                typeof value.parentControllerJobId !== "number"))
    ) {
        throw new Error("Method-v3 Stage-2 array launch record differs from the frozen campaign or scheduler job");
    }
};

export const parseMethodV3Stage2Sacct = (
    raw: string,
    arrayJobId: string,
    expectedTaskCount: number,
): Map<number, SchedulerTaskAccounting> => {
    const result = new Map<number, SchedulerTaskAccounting>();
    for (const [lineIndex, line] of raw.split("\n").entries()) {
        if (!line) continue;
        const fields = line.split("|");
        if (fields.length !== 5) {
            throw new Error(`Stage-2 sacct line ${lineIndex + 1} has ${fields.length} fields, expected 5`);
        }
        const [logicalJobId, schedulerJobId, state, exitCode, account] = fields;
        const match = new RegExp(`^${arrayJobId}_(\\d+)$`).exec(logicalJobId);
        if (!match) {
            throw new Error(`Stage-2 sacct row ${schedulerJobId} has unexpected logical job ID ${logicalJobId}`);
        }
        const taskIndex = Number(match[1]);
        if (
            !/^\d+$/.test(schedulerJobId) ||
            taskIndex < 0 ||
            taskIndex >= expectedTaskCount ||
            result.has(taskIndex) ||
            state !== "COMPLETED" ||
            exitCode !== "0:0" ||
            account !== "pi_jss233"
        ) {
            throw new Error(`Stage-2 sacct task ${taskIndex} is duplicate, failed, or outside the frozen campaign`);
        }
        result.set(taskIndex, { schedulerJobId, state, exitCode, account });
    }
    if (result.size !== expectedTaskCount) {
        throw new Error(`Stage-2 sacct returned ${result.size}/${expectedTaskCount} task rows for ${arrayJobId}`);
    }
    return result;
};

const loadMethodV3Stage2SchedulerAccounting = (
    arrayJobId: string,
    expectedTaskCount: number,
): Map<number, SchedulerTaskAccounting> => {
    const raw = execFileSync(
        "/opt/slurm/25.11.6/bin/sacct",
        ["-j", arrayJobId, "-n", "-P", "-X", "--format=JobID,JobIDRaw,State,ExitCode,Account"],
        { encoding: "utf8" },
    );
    return parseMethodV3Stage2Sacct(raw, arrayJobId, expectedTaskCount);
};

export const validateMethodV3Stage2Campaign = (value: unknown): MethodV3Stage2Campaign => {
    if (
        !isRecord(value) ||
        value.schemaVersion !== 1 ||
        value.kind !== "method-v3-stage2-draw-to-win-optimizer" ||
        value.status !== "FROZEN_OPEN_TRAINING_DRAW_TO_WIN_OPTIMIZER" ||
        !Number.isSafeInteger(value.optimizerRunIndex) ||
        (value.optimizerRunIndex as number) < 0 ||
        (value.optimizerRunIndex as number) > 4 ||
        (value.stage !== 0 && value.stage !== 1 && value.stage !== 2) ||
        value.outcomeAccess !== "open-training-only-no-paper-claim" ||
        value.actualWinInvariant !==
            "finished shortGame, Supalosa defeated, candidate alive, zero terminal Supalosa buildings" ||
        value.mapProfilesEnabled !== false ||
        value.exactMapTacticsEnabled !== false ||
        value.reciprocalSlotCount !== 2 ||
        value.maxTicks !== METHOD_V3_STAGE2_MAX_TICKS ||
        !Array.isArray(value.countries) ||
        !Array.isArray(value.rankingRule) ||
        value.rankingRule.join("\0") !== METHOD_V3_STAGE2_SELECTION_RULE.join("\0") ||
        !Array.isArray(value.policies) ||
        !Array.isArray(value.selectedFamilies) ||
        !Array.isArray(value.shards)
    ) {
        throw new Error("Method-v3 Stage-2 campaign has an invalid frozen schema");
    }
    const campaign = value as unknown as MethodV3Stage2Campaign;
    const stage = campaign.stage;
    const expectedFamilies = METHOD_V3_STAGE2_FAMILY_COUNTS[stage];
    const expectedCountries = METHOD_V3_STAGE2_COUNTRY_COUNTS[stage];
    const expectedPolicies = METHOD_V3_STAGE2_POLICY_COUNTS[stage];
    const expectedShards = expectedFamilies * expectedCountries;
    const expectedLaunches = expectedShards * expectedPolicies * 2;
    const supportedCountries = new Set<string>(METHOD_V3_COUNTRIES);
    const familyIds = campaign.selectedFamilies.map(({ familyId }) => familyId);
    if (
        campaign.familyCount !== expectedFamilies ||
        campaign.countryCount !== expectedCountries ||
        campaign.policyCount !== expectedPolicies ||
        campaign.launchedGameCount !== expectedLaunches ||
        campaign.countries.length !== expectedCountries ||
        new Set(campaign.countries).size !== expectedCountries ||
        campaign.countries.some((country) => !supportedCountries.has(country)) ||
        campaign.policies.length !== expectedPolicies ||
        new Set(campaign.policies.map(({ policyId }) => policyId)).size !== expectedPolicies ||
        campaign.policies.some(({ policyId, policy }) =>
            policy.schemaVersion !== METHOD_V3_STAGE2_POLICY_SCHEMA_VERSION ||
            researchPolicySha256(policy) !== policyId
        ) ||
        familyIds.length !== expectedFamilies ||
        new Set(familyIds).size !== expectedFamilies ||
        campaign.shards.length !== expectedShards
    ) {
        throw new Error("Method-v3 Stage-2 campaign dimensions or canonical policies drifted");
    }
    for (let index = 0; index < campaign.shards.length; index++) {
        const shard = campaign.shards[index];
        if (
            shard.shardIndex !== index ||
            shard.familyId !== familyIds[Math.floor(index / expectedCountries)] ||
            shard.country !== campaign.countries[index % expectedCountries] ||
            shard.seedBlockIndex !== index ||
            shard.requestedEngineSeed !== campaign.engineSeedBase + index ||
            shard.launchedGameCount !== expectedPolicies * 2
        ) {
            throw new Error(`Method-v3 Stage-2 shard ${index} differs from its frozen schedule`);
        }
    }
    if (
        new Set(campaign.shards.map(({ planFile }) => planFile)).size !== expectedShards ||
        new Set(campaign.shards.map(({ planSha256 }) => planSha256)).size !== expectedShards ||
        new Set(campaign.shards.map(({ runId }) => runId)).size !== expectedShards
    ) {
        throw new Error("Method-v3 Stage-2 campaign contains duplicate shard identities");
    }
    if (
        stage === 0 &&
        (campaign.parentCampaignPath !== null ||
            campaign.parentCampaignSha256 !== null ||
            campaign.survivorPath !== null ||
            campaign.survivorSha256 !== null)
    ) {
        throw new Error("Method-v3 Stage-2 stage 0 must not have a survivor parent");
    }
    if (stage > 0) {
        if (
            !campaign.parentCampaignPath ||
            !campaign.survivorPath ||
            campaign.parentCampaignSha256 !== sha256File(campaign.parentCampaignPath) ||
            campaign.survivorSha256 !== sha256File(campaign.survivorPath)
        ) {
            throw new Error("Method-v3 Stage-2 survivor chain is missing or changed");
        }
    }
    for (const [filePath, expectedSha] of [
        [campaign.stage1CampaignPath, campaign.stage1CampaignSha256],
        [campaign.stage1TechnicalGatePath, campaign.stage1TechnicalGateSha256],
        [campaign.stage1SchedulerGatePath, campaign.stage1SchedulerGateSha256],
        [campaign.stage1AnalysisPath, campaign.stage1AnalysisSha256],
    ] as const) {
        if (sha256File(filePath) !== expectedSha) {
            throw new Error(`Method-v3 Stage-1 input changed after Stage-2 generation: ${filePath}`);
        }
    }
    const stage1Campaign = validateMethodV3MechanismCampaign(readJson(campaign.stage1CampaignPath));
    const stage1SchedulerGate = readJson(campaign.stage1SchedulerGatePath);
    const stage1Analysis = readJson(campaign.stage1AnalysisPath);
    if (
        !isRecord(stage1SchedulerGate) ||
        stage1SchedulerGate.status !== "PASSED_METHOD_V3_STAGE1_SCHEDULER_GATE" ||
        stage1SchedulerGate.campaignSha256 !== campaign.stage1CampaignSha256 ||
        stage1SchedulerGate.technicalGateSha256 !== campaign.stage1TechnicalGateSha256 ||
        stage1SchedulerGate.schedulerAccount !== "pi_jss233" ||
        stage1SchedulerGate.shardCount !== 198 ||
        stage1SchedulerGate.launchedGameCount !== METHOD_V3_STAGE1_LAUNCH_COUNT ||
        !hasCompleteMethodV3Stage1SchedulerTasks(stage1SchedulerGate.tasks) ||
        !isRecord(stage1Analysis) ||
        stage1Analysis.status !== "OPEN_TRAINING_METHOD_V3_STAGE1_MECHANISM_ANALYSIS_NOT_A_PAPER_CLAIM" ||
        path.resolve(String(stage1Analysis.campaignPath)) !== path.resolve(campaign.stage1CampaignPath) ||
        stage1Analysis.campaignSha256 !== campaign.stage1CampaignSha256 ||
        path.resolve(String(stage1Analysis.technicalGatePath)) !== path.resolve(campaign.stage1TechnicalGatePath) ||
        stage1Analysis.technicalGateSha256 !== campaign.stage1TechnicalGateSha256 ||
        stage1Analysis.selectedArmId !== campaign.selectedStage1ArmId ||
        stage1Analysis.selectedPolicyId !== campaign.selectedStage1PolicyId
    ) {
        throw new Error("Method-v3 Stage-2 campaign does not bind the exact Stage-1 selection chain");
    }
    const selectedStage1 = stage1Campaign.arms.find(
        ({ armId, policyId }) =>
            armId === campaign.selectedStage1ArmId && policyId === campaign.selectedStage1PolicyId,
    );
    if (!selectedStage1 || researchPolicySha256(selectedStage1.policy) !== selectedStage1.policyId) {
        throw new Error("Method-v3 Stage-2 selected Stage-1 policy is absent or changed");
    }
    if (stage === 0) {
        const projected = projectMethodV3PolicyToStage2(selectedStage1.policy);
        const generatedPolicies = generateMethodV3Stage2Policies(
            campaign.optimizerRunIndex,
            selectedStage1.policy,
        );
        if (
            campaign.policies[0].policyId !== researchPolicySha256(projected) ||
            JSON.stringify(campaign.policies[0].policy) !== JSON.stringify(projected) ||
            JSON.stringify(campaign.policies) !== JSON.stringify(generatedPolicies)
        ) {
            throw new Error("Method-v3 Stage-2 population is not the exact deterministic population from Stage 1");
        }
    } else {
        const parent = validateMethodV3Stage2Campaign(readJson(campaign.parentCampaignPath as string));
        const survivor = readJson(campaign.survivorPath as string);
        if (
            parent.optimizerRunIndex !== campaign.optimizerRunIndex ||
            parent.stage !== stage - 1 ||
            !isRecord(survivor) ||
            survivor.status !== "PASSED_METHOD_V3_STAGE2_COMPLETE_STAGE_REDUCTION" ||
            survivor.optimizerRunIndex !== campaign.optimizerRunIndex ||
            survivor.completedStage !== stage - 1 ||
            path.resolve(String(survivor.sourceCampaignPath)) !== path.resolve(campaign.parentCampaignPath as string) ||
            survivor.sourceCampaignSha256 !== campaign.parentCampaignSha256 ||
            survivor.selectedCount !== expectedPolicies ||
            !Array.isArray(survivor.selectedPolicies) ||
            JSON.stringify(survivor.selectedPolicies) !== JSON.stringify(campaign.policies)
        ) {
            throw new Error(`Method-v3 Stage-2 stage ${stage} does not bind its exact survivor chain`);
        }
    }
    return campaign;
};

const parseEvents = (eventsPath: string): Record<string, unknown>[] => fs
    .readFileSync(eventsPath, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((line, index) => {
        const value = JSON.parse(line) as unknown;
        if (!isRecord(value) || typeof value.event !== "string") {
            throw new Error(`Method-v3 Stage-2 event ${index} in ${eventsPath} is malformed`);
        }
        return value;
    });

export const validateMethodV3Stage2PolicyTelemetry = (value: unknown): void => {
    if (!isRecord(value)) throw new Error("Method-v3 Stage-2 policy telemetry must be an object");
    const event = String(value.event);
    const nonnegativeInteger = (field: string): boolean =>
        Number.isSafeInteger(value[field]) && (value[field] as number) >= 0;
    const stringArray = (field: string): boolean =>
        Array.isArray(value[field]) && (value[field] as unknown[]).every((item) => typeof item === "string");
    const integerArray = (field: string): boolean =>
        Array.isArray(value[field]) && (value[field] as unknown[]).every(
            (item) => Number.isSafeInteger(item) && (item as number) >= 0,
        );
    let valid = nonnegativeInteger("tick");
    if (value.schemaVersion === 1 && event === "activated") {
        valid &&= (value.observationMode === "publicApi" || value.observationMode === "visibleOnly") &&
            nonnegativeInteger("ownCombatants") && nonnegativeInteger("enemyCombatants") &&
            nonnegativeInteger("reservedCombatants") && stringArray("preemptedMissions");
    } else if (value.schemaVersion === 1 && event === "memory_invalidated") {
        valid &&= integerArray("buildingIds");
    } else if (value.schemaVersion === 1 && (event === "target_orders" || event === "sweep_orders")) {
        valid &&= nonnegativeInteger("attackerCount") && Array.isArray(value.targets) &&
            (value.targets as unknown[]).every((target) => isRecord(target) &&
                typeof target.x === "number" && Number.isFinite(target.x) &&
                typeof target.y === "number" && Number.isFinite(target.y) &&
                (event === "sweep_orders" || (
                    (target.id === null || Number.isSafeInteger(target.id)) &&
                    typeof target.name === "string" &&
                    typeof target.visible === "boolean"
                )));
    } else if (value.schemaVersion === 2 && event === "activation_blocked") {
        valid &&= new Set([
            "insufficient_own_combatants",
            "enemy_combatant_limit",
            "insufficient_advantage",
        ]).has(String(value.reason)) && nonnegativeInteger("ownCombatants") &&
            nonnegativeInteger("enemyCombatants") && nonnegativeInteger("reservedCombatants");
    } else if (value.schemaVersion === 2 && event === "target_progress") {
        valid &&= nonnegativeInteger("targetId") && typeof value.targetName === "string" &&
            nonnegativeInteger("hitPoints") && nonnegativeInteger("previousHitPoints") &&
            nonnegativeInteger("damage");
    } else if (value.schemaVersion === 2 && event === "target_stalled") {
        valid &&= nonnegativeInteger("targetId") && typeof value.targetName === "string" &&
            nonnegativeInteger("hitPoints") && nonnegativeInteger("lastDamageTick") &&
            Number.isSafeInteger(value.stallTicks) && (value.stallTicks as number) > 0;
    } else if (value.schemaVersion === 2 && event === "assignment_summary") {
        valid &&= nonnegativeInteger("eligibleAttackers") && nonnegativeInteger("assignedAttackers") &&
            nonnegativeInteger("incompatiblePairs") && nonnegativeInteger("unreachablePairs") &&
            nonnegativeInteger("targetCount");
    } else if (value.schemaVersion === 2 && event === "capability_production") {
        valid &&= integerArray("stalledBuildingIds") && integerArray("incompatibleBuildingIds") &&
            integerArray("unreachableBuildingIds") && stringArray("requestedStructures") &&
            stringArray("requestedUnits");
    } else {
        valid = false;
    }
    if (!valid) {
        throw new Error(`Method-v3 Stage-2 policy telemetry schema/event drifted: ${value.schemaVersion}/${event}`);
    }
};

const validateSummary = (value: unknown, runId: string, planSha256: string, launchCount: number): void => {
    if (
        !isRecord(value) ||
        value.runId !== runId ||
        value.planBytesSha256 !== planSha256 ||
        value.requestedLaunches !== launchCount ||
        value.accountedLaunches !== launchCount ||
        value.completed !== launchCount ||
        value.technicalFailures !== 0 ||
        value.complete !== true ||
        value.technicallyClean !== true ||
        value.outcomeAccess !== "open-training" ||
        !Number.isSafeInteger(value.candidateWins) ||
        !Number.isSafeInteger(value.baselineWins) ||
        !Number.isSafeInteger(value.draws) ||
        (value.candidateWins as number) + (value.baselineWins as number) + (value.draws as number) !== launchCount
    ) {
        throw new Error(`Method-v3 Stage-2 shard ${runId} is not a clean ${launchCount}-game block`);
    }
};

const validateShard = (
    campaign: MethodV3Stage2Campaign,
    resultsRoot: string,
    arrayJobId: string,
    shard: MethodV3Stage2Campaign["shards"][number],
): { schedulerJobId: string; completionCount: number; policyEventCount: number } => {
    const jobRoot = path.join(resultsRoot, `${arrayJobId}_${shard.shardIndex}`);
    const resultDir = path.join(jobRoot, "run");
    const manifestPath = path.join(resultDir, "manifest.json");
    const summaryPath = path.join(resultDir, "summary.json");
    const eventsPath = path.join(resultDir, "events.jsonl");
    for (const required of [manifestPath, summaryPath, eventsPath, shard.planFile]) {
        if (!fs.existsSync(required)) throw new Error(`Method-v3 Stage-2 shard ${shard.shardIndex} lacks ${required}`);
    }
    if (sha256File(shard.planFile) !== shard.planSha256) {
        throw new Error(`Method-v3 Stage-2 shard ${shard.shardIndex} plan bytes changed`);
    }
    validateSummary(readJson(summaryPath), shard.runId, shard.planSha256, shard.launchedGameCount);
    const outer = readJson(manifestPath);
    if (!isRecord(outer) || !isRecord(outer.plan) || !isRecord(outer.manifest)) {
        throw new Error(`Method-v3 Stage-2 shard ${shard.shardIndex} manifest is malformed`);
    }
    const plan = parseResearchRunPlan(outer.plan);
    if (
        outer.planBytesSha256 !== shard.planSha256 ||
        plan.runId !== shard.runId ||
        plan.role !== "train" ||
        plan.purpose !== "method-v3-draw-to-win-optimizer" ||
        plan.sourceGitCommit !== campaign.sourceGitCommit ||
        plan.sourceRuntimeSha256 !== campaign.sourceRuntimeSha256 ||
        plan.baselineGitCommit !== campaign.baselineGitCommit ||
        plan.baselineRuntimeSha256 !== campaign.baselineRuntimeSha256 ||
        plan.gameApiRuntimeSha256 !== campaign.gameApiRuntimeSha256 ||
        plan.packageLockSha256 !== campaign.packageLockSha256 ||
        plan.roleManifestSha256 !== campaign.roleManifestSha256 ||
        plan.roleCommitmentSha256 !== campaign.roleCommitmentSha256 ||
        plan.splitCommitmentSha256 !== campaign.splitCommitmentSha256 ||
        plan.sourcePopulationCommitmentSha256 !== campaign.sourcePopulationCommitmentSha256 ||
        plan.engineSeedBase !== campaign.engineSeedBase ||
        plan.maxTicks !== campaign.maxTicks ||
        plan.candidateCountry !== shard.country ||
        plan.baselineCountry !== shard.country ||
        plan.episodes.length !== shard.launchedGameCount ||
        plan.policies.map(({ policyId }) => policyId).join(",") !==
            campaign.policies.map(({ policyId }) => policyId).join(",")
    ) {
        throw new Error(`Method-v3 Stage-2 shard ${shard.shardIndex} commitments drifted`);
    }
    if (plan.episodes.some((episode) =>
        episode.familyId !== shard.familyId ||
        episode.seedBlockIndex !== shard.seedBlockIndex ||
        episode.requestedEngineSeed !== shard.requestedEngineSeed ||
        episode.methodId !== episode.policyId
    )) {
        throw new Error(`Method-v3 Stage-2 shard ${shard.shardIndex} episode schedule drifted`);
    }
    const expectedEpisodes = buildMethodV3Stage2Episodes(
        shard.familyId,
        campaign.policies,
        shard.seedBlockIndex,
        shard.requestedEngineSeed,
    );
    if (plan.episodes.some((episode, index) => {
        const expected = expectedEpisodes[index];
        return !expected ||
            episode.episodeId !== expected.episodeId ||
            episode.familyId !== expected.familyId ||
            episode.policyId !== expected.policyId ||
            episode.methodId !== expected.policyId ||
            episode.seedBlockIndex !== expected.seedBlockIndex ||
            episode.requestedEngineSeed !== expected.requestedEngineSeed ||
            episode.candidateSlot !== expected.candidateSlot;
    })) {
        throw new Error(`Method-v3 Stage-2 shard ${shard.shardIndex} episode order drifted`);
    }
    for (const policy of campaign.policies) {
        const slots = plan.episodes
            .filter(({ policyId }) => policyId === policy.policyId)
            .map(({ candidateSlot }) => candidateSlot);
        if (slots.join(",") !== "0,1") {
            throw new Error(`Method-v3 Stage-2 shard ${shard.shardIndex} reciprocal policy schedule drifted`);
        }
    }
    const scheduler = outer.manifest.scheduler;
    const source = outer.manifest.source;
    if (
        !isRecord(scheduler) ||
        scheduler.account !== "pi_jss233" ||
        String(scheduler.arrayJobId) !== arrayJobId ||
        String(scheduler.arrayTaskId) !== String(shard.shardIndex) ||
        (typeof scheduler.jobId !== "string" && typeof scheduler.jobId !== "number") ||
        !isRecord(source) ||
        source.gitCommit !== campaign.sourceGitCommit ||
        source.gitBranch !== "main" ||
        source.trackedDirty !== false
    ) {
        throw new Error(`Method-v3 Stage-2 shard ${shard.shardIndex} scheduler or source provenance drifted`);
    }
    const events = parseEvents(eventsPath);
    if (events[0]?.event !== "run_start" || events[events.length - 1]?.event !== "run_complete") {
        throw new Error(`Method-v3 Stage-2 shard ${shard.shardIndex} boundary events drifted`);
    }
    let cursor = 1;
    let policyEventCount = 0;
    for (let launchIndex = 0; launchIndex < plan.episodes.length; launchIndex++) {
        const expected = plan.episodes[launchIndex];
        const launch = events[cursor++];
        if (
            launch?.event !== "launch_counted" ||
            launch.launchIndex !== launchIndex ||
            launch.episodeId !== expected.episodeId ||
            launch.familyId !== expected.familyId ||
            launch.policyId !== expected.policyId ||
            launch.methodId !== expected.methodId ||
            launch.seedBlockIndex !== expected.seedBlockIndex ||
            launch.requestedEngineSeed !== expected.requestedEngineSeed ||
            launch.candidateSlot !== expected.candidateSlot
        ) {
            throw new Error(`Method-v3 Stage-2 shard ${shard.shardIndex} launch ${launchIndex} drifted`);
        }
        while (events[cursor]?.event === "candidate_policy_event") {
            const event = events[cursor++];
            if (
                event.launchIndex !== launchIndex ||
                event.episodeId !== expected.episodeId ||
                event.policyId !== expected.policyId
            ) {
                throw new Error(`Method-v3 Stage-2 shard ${shard.shardIndex} policy event identity drifted`);
            }
            validateMethodV3Stage2PolicyTelemetry(event.policyEvent);
            policyEventCount++;
        }
        const completion = events[cursor++];
        if (
            completion?.event !== "episode_complete" ||
            completion.launchIndex !== launchIndex ||
            !isRecord(completion.result)
        ) {
            throw new Error(`Method-v3 Stage-2 shard ${shard.shardIndex} completion ${launchIndex} is malformed`);
        }
        const result = completion.result;
        if (
            result.episodeId !== expected.episodeId ||
            result.familyId !== expected.familyId ||
            result.policyId !== expected.policyId ||
            result.methodId !== expected.methodId ||
            result.seedBlockIndex !== expected.seedBlockIndex ||
            result.requestedEngineSeed !== expected.requestedEngineSeed ||
            result.candidateSlot !== expected.candidateSlot ||
            result.candidateCountry !== shard.country ||
            result.baselineCountry !== shard.country
        ) {
            throw new Error(`Method-v3 Stage-2 shard ${shard.shardIndex} completion identity drifted`);
        }
        validateMethodV3ActualWin(result, expected.episodeId);
    }
    if (cursor !== events.length - 1 || !isRecord(events[cursor].summary)) {
        throw new Error(`Method-v3 Stage-2 shard ${shard.shardIndex} event accounting is incomplete`);
    }
    return { schedulerJobId: String(scheduler.jobId), completionCount: plan.episodes.length, policyEventCount };
};

export const methodV3Stage2ResultArtifactCommitmentSha256 = (
    campaign: MethodV3Stage2Campaign,
    resultsRoot: string,
    arrayJobId: string,
): string => crypto.createHash("sha256").update(JSON.stringify(campaign.shards.map(({ shardIndex }) => {
    const resultDir = path.join(resultsRoot, `${arrayJobId}_${shardIndex}`, "run");
    return {
        shardIndex,
        manifestSha256: sha256File(path.join(resultDir, "manifest.json")),
        summarySha256: sha256File(path.join(resultDir, "summary.json")),
        eventsSha256: sha256File(path.join(resultDir, "events.jsonl")),
    };
}))).digest("hex");

const main = (): void => {
    const campaignPath = requiredPath("CAMPAIGN");
    const resultsRoot = requiredPath("RESULTS_ROOT");
    const outputPath = requiredPath("OUT_FILE");
    const arrayJobId = requiredArrayJobId();
    if (fs.existsSync(outputPath)) throw new Error(`Refusing to overwrite Stage-2 gate ${outputPath}`);
    const campaign = validateMethodV3Stage2Campaign(readJson(campaignPath));
    const launchPath = path.join(resultsRoot, "array-launch.json");
    if (!fs.existsSync(launchPath)) throw new Error(`Method-v3 Stage-2 lacks array launch record ${launchPath}`);
    validateMethodV3Stage2ArrayLaunch(readJson(launchPath), campaign, campaignPath, arrayJobId);
    const schedulerJobIds: string[] = [];
    let completionCount = 0;
    let policyEventCount = 0;
    for (const shard of campaign.shards) {
        const validated = validateShard(campaign, resultsRoot, arrayJobId, shard);
        schedulerJobIds.push(validated.schedulerJobId);
        completionCount += validated.completionCount;
        policyEventCount += validated.policyEventCount;
    }
    const schedulerAccounting = loadMethodV3Stage2SchedulerAccounting(arrayJobId, campaign.shards.length);
    for (const shard of campaign.shards) {
        const manifestJobId = schedulerJobIds[shard.shardIndex];
        if (schedulerAccounting.get(shard.shardIndex)?.schedulerJobId !== manifestJobId) {
            throw new Error(`Method-v3 Stage-2 shard ${shard.shardIndex} manifest job ID differs from sacct`);
        }
    }
    if (
        completionCount !== campaign.launchedGameCount ||
        new Set(schedulerJobIds).size !== campaign.shards.length
    ) {
        throw new Error("Method-v3 Stage-2 accounting is incomplete");
    }
    const gitCommit = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
    const gitBranch = execFileSync("git", ["branch", "--show-current"], { encoding: "utf8" }).trim();
    const dirty = execFileSync("git", ["status", "--short", "--untracked-files=no"], { encoding: "utf8" }).trim();
    if (gitBranch !== "main" || dirty || gitCommit !== campaign.sourceGitCommit) {
        throw new Error("Method-v3 Stage-2 gate requires unchanged clean campaign source on main");
    }
    const output = {
        schemaVersion: 1,
        status: "PASSED_METHOD_V3_STAGE2_TECHNICAL_GATE_OUTCOMES_NOT_SUMMARIZED",
        generatedAt: new Date().toISOString(),
        gateSourceGitCommit: gitCommit,
        campaignPath,
        campaignSha256: sha256File(campaignPath),
        arrayLaunchPath: launchPath,
        arrayLaunchSha256: sha256File(launchPath),
        resultsRoot,
        resultArtifactCommitmentSha256: methodV3Stage2ResultArtifactCommitmentSha256(
            campaign,
            resultsRoot,
            arrayJobId,
        ),
        optimizerRunIndex: campaign.optimizerRunIndex,
        stage: campaign.stage,
        arrayJobId,
        schedulerAccount: "pi_jss233",
        schedulerJobIds: [...new Set(schedulerJobIds)].sort((left, right) => Number(left) - Number(right)),
        schedulerAccounting: campaign.shards.map(({ shardIndex }) => ({
            arrayTaskId: shardIndex,
            ...schedulerAccounting.get(shardIndex),
        })),
        shardCount: campaign.shards.length,
        requestedLaunches: campaign.launchedGameCount,
        accountedLaunches: campaign.launchedGameCount,
        completedLaunches: campaign.launchedGameCount,
        technicalFailures: 0,
        actualWinInvariantViolations: 0,
        policyEventCount,
        outcomeFieldsEmitted: [],
        authorizedNextPhase: campaign.stage < 2
            ? "method-v3-stage2-complete-stage-reduction"
            : "method-v3-stage2-run-finalization",
    };
    fs.mkdirSync(path.dirname(outputPath), { recursive: true, mode: 0o700 });
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), { flag: "wx", mode: 0o600 });
    console.log(JSON.stringify({
        outputPath,
        outputSha256: sha256File(outputPath),
        status: output.status,
        optimizerRunIndex: output.optimizerRunIndex,
        stage: output.stage,
        shardCount: output.shardCount,
        accountedLaunches: output.accountedLaunches,
        policyEventCount,
        authorizedNextPhase: output.authorizedNextPhase,
    }));
};

const invokedModuleUrl = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (import.meta.url === invokedModuleUrl) {
    try {
        main();
    } catch (error) {
        console.error(error);
        process.exitCode = 1;
    }
}
