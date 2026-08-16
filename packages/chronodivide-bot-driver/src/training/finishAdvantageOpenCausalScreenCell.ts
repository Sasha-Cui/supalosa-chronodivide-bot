import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { cdapi } from "@chronodivide/game-api";
import { loadBaselineFactory } from "../benchmark/baselineLoader.js";
import { createExperimentManifest } from "../benchmark/provenance.js";
import {
    FinishAdvantageOpenCampaign,
    sha256File,
    validateFinishAdvantageOpenCampaign,
} from "./finishAdvantageOpenCausalScreenCampaign.js";
import {
    FINISH_ADVANTAGE_OPEN_EPISODE_SCHEMA_VERSION,
    runFinishAdvantageOpenEpisode,
} from "./finishAdvantageOpenCausalScreenEpisode.js";

const SHA256 = /^[0-9a-f]{64}$/;
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
const append = (filePath: string, value: unknown): void => {
    fs.appendFileSync(filePath, JSON.stringify(value) + "\n");
};
const runtimeSha = (manifest: ReturnType<typeof createExperimentManifest>): string => {
    return crypto.createHash("sha256").update(JSON.stringify(manifest.source.runtimeTrees)).digest("hex");
};

export const buildFinishAdvantageOpenCellSummary = (args: {
    runId: string;
    campaignSha256: string;
    taskIndex: number;
    requestedLaunches: number;
    completed: number;
    technicalFailures: number;
    candidateWins: number;
    baselineWins: number;
    draws: number;
}) => ({
    schemaVersion: 1,
    status: args.technicalFailures === 0
        ? "COMPLETE_FINISH_ADVANTAGE_OPEN_CAUSAL_SCREEN_SHARD"
        : "FAILED_FINISH_ADVANTAGE_OPEN_CAUSAL_SCREEN_TECHNICAL_SHARD",
    generatedAt: new Date().toISOString(),
    runId: args.runId,
    campaignSha256: args.campaignSha256,
    taskIndex: args.taskIndex,
    requestedLaunches: args.requestedLaunches,
    accountedLaunches: args.completed + args.technicalFailures,
    completed: args.completed,
    technicalFailures: args.technicalFailures,
    complete: args.completed + args.technicalFailures === args.requestedLaunches,
    technicallyClean: args.technicalFailures === 0,
    candidateWins: args.candidateWins,
    baselineWins: args.baselineWins,
    draws: args.draws,
    outcomeAccess: "withheld-until-complete-open-screen-finalizer",
});

const verifyRuntime = (
    campaign: FinishAdvantageOpenCampaign,
    manifest: ReturnType<typeof createExperimentManifest>,
): void => {
    if (
        manifest.source.gitCommit !== campaign.sourceGitCommit || manifest.source.gitBranch !== "main" ||
        manifest.source.trackedDirty !== false || runtimeSha(manifest) !== campaign.sourceRuntimeSha256 ||
        manifest.scheduler.account !== "pi_jss233" || manifest.scheduler.jobId === null ||
        manifest.software.baseline.kind !== "external-package" ||
        manifest.software.baseline.gitCommit !== campaign.externalBaselineGitCommit ||
        manifest.software.baseline.trackedDirty !== false ||
        manifest.software.baseline.runtimeTree.sha256 !== campaign.externalBaselineRuntimeSha256 ||
        manifest.software.gameApiRuntimeTree.sha256 !== campaign.gameApiRuntimeSha256 ||
        manifest.software.packageLockSha256 !== campaign.packageLockSha256
    ) throw new Error("Finish-advantage open shard runtime or scheduler provenance drifted");
};

const main = async (): Promise<void> => {
    const repoRoot = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
    const driverRoot = path.join(repoRoot, "packages", "chronodivide-bot-driver");
    if (path.resolve(process.cwd()) !== driverRoot) throw new Error(`Cell runner must start in ${driverRoot}`);
    if (process.env.SLURM_JOB_ACCOUNT !== "pi_jss233") {
        throw new Error("Finish-advantage open shard requires Slurm account pi_jss233");
    }
    if (!process.env.BASELINE_PACKAGE_ROOT || process.env.REQUIRE_EXTERNAL_BASELINE !== "true") {
        throw new Error("Finish-advantage open shard requires the pinned external baseline");
    }
    const campaignPath = requiredPath("CAMPAIGN");
    const campaignSha256 = requiredText("CAMPAIGN_SHA256", SHA256);
    const taskIndex = Number(requiredText("TASK_INDEX", /^\d+$/));
    const outDir = requiredPath("OUT_DIR");
    if (fs.existsSync(outDir)) throw new Error(`Refusing to reuse open-screen OUT_DIR ${outDir}`);
    if (sha256File(campaignPath) !== campaignSha256) throw new Error("Open-screen campaign hash drifted");
    const campaign = validateFinishAdvantageOpenCampaign(JSON.parse(fs.readFileSync(campaignPath, "utf8")));
    if (taskIndex < 0 || taskIndex >= campaign.shardCount || process.env.SLURM_ARRAY_TASK_ID !== String(taskIndex)) {
        throw new Error("Open-screen task index does not match the scheduler");
    }
    if (
        execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim() !== campaign.sourceGitCommit ||
        execFileSync("git", ["branch", "--show-current"], { encoding: "utf8" }).trim() !== "main" ||
        execFileSync("git", ["status", "--short", "--untracked-files=no"], { encoding: "utf8" }).trim() !== ""
    ) throw new Error("Open-screen shard source contract failed");
    const shard = campaign.shards[taskIndex];
    const runtimeProgram = process.argv[1] ? path.resolve(process.argv[1]) : null;
    if (!runtimeProgram || sha256File(runtimeProgram) !== campaign.programs.cellSha256) {
        throw new Error("Open-screen cell program commitment drifted");
    }
    const mapPath = path.join(driverRoot, "data", shard.mapName);
    if (sha256File(mapPath) !== shard.mapSha256) throw new Error("Open-screen map bytes drifted");
    const factory = await loadBaselineFactory(path.join(repoRoot, "packages", "chronodivide-bot"));
    const runId = `finish-open-${taskIndex}-${process.env.SLURM_JOB_ID ?? "unknown"}`;
    const manifest = createExperimentManifest({
        runId,
        mixDir: path.join(driverRoot, "data"),
        maps: [shard.mapName],
        effectiveConfig: {
            purpose: campaign.kind,
            campaignPath,
            campaignSha256,
            taskIndex,
            familyId: shard.familyId,
            country: shard.country,
            requestedEngineSeed: shard.requestedEngineSeed,
            reciprocalSlots: [0, 1],
            arms: campaign.arms,
            maxTicks: campaign.maxTicks,
            noRetries: true,
            outcomeAccess: "withheld-until-complete-open-screen-finalizer",
        },
        baseline: factory.descriptor,
        gameSeedBase: shard.requestedEngineSeed,
    });
    verifyRuntime(campaign, manifest);
    const runtimeMap = manifest.inputs.maps[0];
    if (!runtimeMap?.exists || runtimeMap.sha256 !== shard.mapSha256) {
        throw new Error("Open-screen runtime map commitment drifted");
    }
    fs.mkdirSync(outDir, { recursive: false, mode: 0o700 });
    const manifestPath = path.join(outDir, "manifest.json");
    const eventsPath = path.join(outDir, "events.jsonl");
    const summaryPath = path.join(outDir, "summary.json");
    fs.writeFileSync(manifestPath, JSON.stringify({ campaignSha256, shard, manifest }, null, 2) + "\n", {
        flag: "wx", mode: 0o600,
    });
    fs.writeFileSync(eventsPath, "", { flag: "wx", mode: 0o600 });
    append(eventsPath, {
        event: "run_start",
        campaignSha256,
        taskIndex,
        requestedLaunches: shard.launchedGameCount,
    });
    await cdapi.init(path.join(driverRoot, "data"));
    let completed = 0;
    let technicalFailures = 0;
    let candidateWins = 0;
    let baselineWins = 0;
    let draws = 0;
    let launchIndex = 0;
    for (const arm of campaign.arms) {
        for (const candidateSlot of [0, 1] as const) {
            const episodeId = `f${shard.familyOrdinal}-k${shard.countryOrdinal}-a${campaign.arms.indexOf(arm)}-s${candidateSlot}`;
            append(eventsPath, {
                event: "launch_counted",
                launchIndex,
                episodeId,
                armId: arm.armId,
                policySha256: arm.policySha256,
                candidateSlot,
                familyOrdinal: shard.familyOrdinal,
                countryOrdinal: shard.countryOrdinal,
                requestedEngineSeed: shard.requestedEngineSeed,
            });
            try {
                const result = await runFinishAdvantageOpenEpisode({
                    schemaVersion: FINISH_ADVANTAGE_OPEN_EPISODE_SCHEMA_VERSION,
                    episodeId,
                    familyId: shard.familyId,
                    mapName: shard.mapName,
                    mapSha256: shard.mapSha256,
                    arm,
                    policySha256: arm.policySha256,
                    familyOrdinal: shard.familyOrdinal,
                    countryOrdinal: shard.countryOrdinal,
                    requestedEngineSeed: shard.requestedEngineSeed,
                    candidateSlot,
                    candidateCountry: shard.country,
                    baselineCountry: shard.country,
                    maxTicks: campaign.maxTicks,
                }, factory);
                if (result.technicalFailure || result.winner === null) {
                    technicalFailures += 1;
                    append(eventsPath, { event: "endpoint_technical_failure", launchIndex, result });
                } else {
                    completed += 1;
                    candidateWins += Number(result.winner === "candidate");
                    baselineWins += Number(result.winner === "baseline");
                    draws += Number(result.winner === "draw");
                    append(eventsPath, { event: "episode_complete", launchIndex, result });
                }
            } catch (error) {
                technicalFailures += 1;
                append(eventsPath, {
                    event: "technical_failure",
                    launchIndex,
                    episodeId,
                    error: {
                        name: error instanceof Error ? error.name : "Error",
                        message: error instanceof Error ? error.message : String(error),
                        stack: error instanceof Error ? error.stack : null,
                    },
                });
            }
            launchIndex += 1;
        }
    }
    const summary = buildFinishAdvantageOpenCellSummary({
        runId,
        campaignSha256,
        taskIndex,
        requestedLaunches: shard.launchedGameCount,
        completed,
        technicalFailures,
        candidateWins,
        baselineWins,
        draws,
    });
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2) + "\n", { flag: "wx", mode: 0o600 });
    append(eventsPath, { event: "run_complete", summary });
    console.log(JSON.stringify(summary));
    if (!summary.complete || !summary.technicallyClean) process.exitCode = 2;
};

const invoked = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (import.meta.url === invoked) main().catch((error) => { console.error(error); process.exitCode = 1; });
