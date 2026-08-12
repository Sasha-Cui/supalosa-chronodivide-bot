import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
    METHOD_V3_COUNTRIES,
    METHOD_V3_STAGE1_FAMILY_COUNT,
    METHOD_V3_STAGE1_LAUNCH_COUNT,
    METHOD_V3_STAGE1_MAX_TICKS,
    METHOD_V3_STAGE1_SHARD_COUNT,
    MethodV3MechanismCampaign,
} from "./methodV3MechanismPlanGenerator.js";
import { METHOD_V3_MECHANISM_ARM_ORDER } from "./methodV3MechanismPolicies.js";
import { parseResearchRunPlan, sha256File } from "./researchPlanRunner.js";
import { researchPolicySha256 } from "./researchPolicy.js";


const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null && !Array.isArray(value);

const parseJson = (filePath: string): unknown => JSON.parse(fs.readFileSync(filePath, "utf8"));

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

export const validateMethodV3MechanismCampaign = (value: unknown): MethodV3MechanismCampaign => {
    if (
        !isRecord(value) ||
        value.schemaVersion !== 1 ||
        value.kind !== "method-v3-stage1-mechanism-screen" ||
        value.status !== "FROZEN_OPEN_TRAINING_MECHANISM_SCREEN" ||
        value.outcomeAccess !== "open-training-only-no-paper-claim" ||
        value.actualWinInvariant !== "shortGame engine defeat and zero terminal enemy buildings" ||
        value.mapProfilesEnabled !== false ||
        value.exactMapTacticsEnabled !== false ||
        value.familyCount !== METHOD_V3_STAGE1_FAMILY_COUNT ||
        value.countryCount !== METHOD_V3_COUNTRIES.length ||
        value.reciprocalSlotCount !== 2 ||
        value.policyCount !== METHOD_V3_MECHANISM_ARM_ORDER.length ||
        value.seedBlockCount !== METHOD_V3_STAGE1_SHARD_COUNT ||
        value.launchedGameCount !== METHOD_V3_STAGE1_LAUNCH_COUNT ||
        value.maxTicks !== METHOD_V3_STAGE1_MAX_TICKS ||
        !Array.isArray(value.countries) ||
        value.countries.join(",") !== METHOD_V3_COUNTRIES.join(",") ||
        !Array.isArray(value.rankingRule) ||
        value.rankingRule.length !== 6 ||
        !Array.isArray(value.arms) ||
        value.arms.length !== METHOD_V3_MECHANISM_ARM_ORDER.length ||
        !Array.isArray(value.selectedFamilies) ||
        value.selectedFamilies.length !== METHOD_V3_STAGE1_FAMILY_COUNT ||
        !Array.isArray(value.shards) ||
        value.shards.length !== METHOD_V3_STAGE1_SHARD_COUNT
    ) {
        throw new Error("Method-v3 mechanism campaign has an invalid frozen schema");
    }
    const campaign = value as unknown as MethodV3MechanismCampaign;
    const familyIds = campaign.selectedFamilies.map(({ familyId }) => familyId);
    if (
        new Set(familyIds).size !== METHOD_V3_STAGE1_FAMILY_COUNT ||
        campaign.arms.map(({ armId }) => armId).join(",") !== METHOD_V3_MECHANISM_ARM_ORDER.join(",") ||
        new Set(campaign.arms.map(({ policyId }) => policyId)).size !== campaign.arms.length ||
        campaign.arms.some(({ policyId, policy }) => researchPolicySha256(policy) !== policyId) ||
        campaign.shards.some((shard, index) =>
            shard.shardIndex !== index ||
            shard.familyId !== familyIds[Math.floor(index / METHOD_V3_COUNTRIES.length)] ||
            shard.country !== METHOD_V3_COUNTRIES[index % METHOD_V3_COUNTRIES.length] ||
            shard.seedBlockIndex !== index ||
            shard.launchedGameCount !== METHOD_V3_MECHANISM_ARM_ORDER.length * 2
        ) ||
        new Set(campaign.shards.map(({ planFile }) => planFile)).size !== METHOD_V3_STAGE1_SHARD_COUNT ||
        new Set(campaign.shards.map(({ planSha256 }) => planSha256)).size !== METHOD_V3_STAGE1_SHARD_COUNT ||
        new Set(campaign.shards.map(({ runId }) => runId)).size !== METHOD_V3_STAGE1_SHARD_COUNT
    ) {
        throw new Error("Method-v3 mechanism campaign schedule differs from the frozen allocation");
    }
    return campaign;
};

const parseEvents = (eventsPath: string): Record<string, unknown>[] => fs.readFileSync(eventsPath, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((line, index) => {
        const value = JSON.parse(line) as unknown;
        if (!isRecord(value) || typeof value.event !== "string") {
            throw new Error(`Method-v3 event ${index} in ${eventsPath} is malformed`);
        }
        return value;
    });

const validateSummary = (value: unknown, runId: string, planSha256: string): void => {
    if (
        !isRecord(value) ||
        value.runId !== runId ||
        value.planBytesSha256 !== planSha256 ||
        value.requestedLaunches !== 18 ||
        value.accountedLaunches !== 18 ||
        value.completed !== 18 ||
        value.technicalFailures !== 0 ||
        value.complete !== true ||
        value.technicallyClean !== true ||
        value.outcomeAccess !== "open-training" ||
        !Number.isSafeInteger(value.candidateWins) ||
        !Number.isSafeInteger(value.baselineWins) ||
        !Number.isSafeInteger(value.draws) ||
        (value.candidateWins as number) + (value.baselineWins as number) + (value.draws as number) !== 18
    ) {
        throw new Error(`Method-v3 shard ${runId} summary is not one clean eighteen-game block`);
    }
};

export const validateMethodV3ActualWin = (result: Record<string, unknown>, episodeId: string): void => {
    if (!isRecord(result.candidate) || !isRecord(result.baseline)) {
        throw new Error(`Method-v3 completion ${episodeId} lacks terminal player snapshots`);
    }
    const winner = result.winner;
    const candidateBuildings = result.candidate.buildings;
    const baselineBuildings = result.baseline.buildings;
    if (
        !Number.isSafeInteger(candidateBuildings) ||
        !Number.isSafeInteger(baselineBuildings) ||
        (winner !== "candidate" && winner !== "baseline" && winner !== "draw")
    ) {
        throw new Error(`Method-v3 completion ${episodeId} has malformed outcome fields`);
    }
    if (
        (winner === "candidate" && (
            result.finished !== true ||
            result.candidateDefeated !== false ||
            result.baselineDefeated !== true ||
            baselineBuildings !== 0
        )) ||
        (winner === "baseline" && (
            result.finished !== true ||
            result.candidateDefeated !== true ||
            result.baselineDefeated !== false ||
            candidateBuildings !== 0
        ))
    ) {
        throw new Error(`Method-v3 completion ${episodeId} violates the actual building-elimination win invariant`);
    }
};

const validateShard = (
    campaign: MethodV3MechanismCampaign,
    resultsRoot: string,
    arrayJobId: string,
    shard: MethodV3MechanismCampaign["shards"][number],
): { schedulerJobId: string; completionCount: number; policyEventCount: number } => {
    const jobRoot = path.join(resultsRoot, `${arrayJobId}_${shard.shardIndex}`);
    const resultDir = path.join(jobRoot, "run");
    const manifestPath = path.join(resultDir, "manifest.json");
    const summaryPath = path.join(resultDir, "summary.json");
    const eventsPath = path.join(resultDir, "events.jsonl");
    for (const required of [manifestPath, summaryPath, eventsPath, shard.planFile]) {
        if (!fs.existsSync(required)) throw new Error(`Method-v3 shard ${shard.shardIndex} lacks ${required}`);
    }
    if (sha256File(shard.planFile) !== shard.planSha256) {
        throw new Error(`Method-v3 shard ${shard.shardIndex} plan bytes changed`);
    }
    validateSummary(parseJson(summaryPath), shard.runId, shard.planSha256);
    const outer = parseJson(manifestPath);
    if (!isRecord(outer) || !isRecord(outer.plan) || !isRecord(outer.manifest)) {
        throw new Error(`Method-v3 shard ${shard.shardIndex} manifest is malformed`);
    }
    const plan = parseResearchRunPlan(outer.plan);
    if (
        outer.planBytesSha256 !== shard.planSha256 ||
        plan.runId !== shard.runId ||
        plan.role !== "train" ||
        plan.purpose !== "method-v3-mechanism-screen" ||
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
        plan.episodes.length !== 18
    ) {
        throw new Error(`Method-v3 shard ${shard.shardIndex} commitments drifted`);
    }
    const armPolicies = campaign.arms.map(({ policyId }) => policyId);
    if (
        plan.policies.map(({ policyId }) => policyId).join(",") !== armPolicies.join(",") ||
        plan.episodes.some((episode) =>
            episode.familyId !== shard.familyId ||
            episode.seedBlockIndex !== shard.seedBlockIndex ||
            episode.requestedEngineSeed !== shard.requestedEngineSeed ||
            episode.methodId !== episode.policyId
        )
    ) {
        throw new Error(`Method-v3 shard ${shard.shardIndex} policy schedule drifted`);
    }
    for (const policyId of armPolicies) {
        const slots = plan.episodes.filter((episode) => episode.policyId === policyId).map(({ candidateSlot }) => candidateSlot);
        if (slots.length !== 2 || slots.sort().join(",") !== "0,1") {
            throw new Error(`Method-v3 shard ${shard.shardIndex} lacks an indivisible reciprocal policy block`);
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
        throw new Error(`Method-v3 shard ${shard.shardIndex} scheduler or source provenance drifted`);
    }

    const events = parseEvents(eventsPath);
    if (events[0]?.event !== "run_start" || events[events.length - 1]?.event !== "run_complete") {
        throw new Error(`Method-v3 shard ${shard.shardIndex} boundary events drifted`);
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
            throw new Error(`Method-v3 shard ${shard.shardIndex} launch ${launchIndex} drifted`);
        }
        while (events[cursor]?.event === "candidate_policy_event") {
            const event = events[cursor++];
            if (
                event.launchIndex !== launchIndex ||
                event.episodeId !== expected.episodeId ||
                event.policyId !== expected.policyId ||
                !isRecord(event.policyEvent) ||
                event.policyEvent.schemaVersion !== 1 ||
                !["activated", "memory_invalidated", "target_orders", "sweep_orders"].includes(
                    String(event.policyEvent.event),
                )
            ) {
                throw new Error(`Method-v3 shard ${shard.shardIndex} policy telemetry drifted`);
            }
            policyEventCount++;
        }
        const completion = events[cursor++];
        if (completion?.event !== "episode_complete" || completion.launchIndex !== launchIndex || !isRecord(completion.result)) {
            throw new Error(`Method-v3 shard ${shard.shardIndex} completion ${launchIndex} is malformed`);
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
            throw new Error(`Method-v3 shard ${shard.shardIndex} completion identity drifted`);
        }
        validateMethodV3ActualWin(result, expected.episodeId);
    }
    if (cursor !== events.length - 1 || !isRecord(events[cursor].summary)) {
        throw new Error(`Method-v3 shard ${shard.shardIndex} event accounting is incomplete`);
    }
    return { schedulerJobId: String(scheduler.jobId), completionCount: plan.episodes.length, policyEventCount };
};

export const methodV3ResultArtifactCommitmentSha256 = (
    campaign: MethodV3MechanismCampaign,
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
    if (fs.existsSync(outputPath)) throw new Error(`Refusing to overwrite method-v3 technical gate ${outputPath}`);
    const campaign = validateMethodV3MechanismCampaign(parseJson(campaignPath));
    const schedulerJobIds: string[] = [];
    let completionCount = 0;
    let policyEventCount = 0;
    for (const shard of campaign.shards) {
        const validated = validateShard(campaign, resultsRoot, arrayJobId, shard);
        schedulerJobIds.push(validated.schedulerJobId);
        completionCount += validated.completionCount;
        policyEventCount += validated.policyEventCount;
    }
    if (
        completionCount !== METHOD_V3_STAGE1_LAUNCH_COUNT ||
        new Set(schedulerJobIds).size !== METHOD_V3_STAGE1_SHARD_COUNT
    ) {
        throw new Error("Method-v3 Stage-1 accounting is incomplete");
    }
    const gitCommit = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
    const gitBranch = execFileSync("git", ["branch", "--show-current"], { encoding: "utf8" }).trim();
    const dirty = execFileSync("git", ["status", "--short", "--untracked-files=no"], { encoding: "utf8" }).trim();
    if (gitBranch !== "main" || dirty || gitCommit !== campaign.sourceGitCommit) {
        throw new Error("Method-v3 gate requires unchanged clean campaign source on main");
    }
    const output = {
        schemaVersion: 1,
        status: "PASSED_METHOD_V3_STAGE1_TECHNICAL_GATE_OUTCOMES_NOT_SUMMARIZED",
        generatedAt: new Date().toISOString(),
        gateSourceGitCommit: gitCommit,
        campaignPath,
        campaignSha256: sha256File(campaignPath),
        resultsRoot,
        resultArtifactCommitmentSha256: methodV3ResultArtifactCommitmentSha256(campaign, resultsRoot, arrayJobId),
        arrayJobId,
        schedulerAccount: "pi_jss233",
        schedulerJobIds: [...new Set(schedulerJobIds)].sort((left, right) => Number(left) - Number(right)),
        shardCount: METHOD_V3_STAGE1_SHARD_COUNT,
        requestedLaunches: METHOD_V3_STAGE1_LAUNCH_COUNT,
        accountedLaunches: METHOD_V3_STAGE1_LAUNCH_COUNT,
        completedLaunches: METHOD_V3_STAGE1_LAUNCH_COUNT,
        technicalFailures: 0,
        actualWinInvariantViolations: 0,
        policyEventCount,
        outcomeFieldsEmitted: [],
        authorizedNextPhase: "method-v3-stage1-open-training-analysis",
    };
    fs.mkdirSync(path.dirname(outputPath), { recursive: true, mode: 0o700 });
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), { flag: "wx", mode: 0o600 });
    console.log(JSON.stringify({
        outputPath,
        outputSha256: sha256File(outputPath),
        status: output.status,
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
