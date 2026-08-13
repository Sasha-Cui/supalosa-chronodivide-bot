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
    METHOD_V5_EPISODE_SCHEMA_VERSION,
    MethodV5EpisodeSpec,
    runMethodV5Episode,
} from "./methodV5Episode.js";
import {
    MethodV5CloseoutPolicy,
    methodV5CloseoutPolicySha256,
    validateMethodV5CloseoutPolicy,
} from "./methodV5Closeout.js";

export const METHOD_V5_PLAN_SCHEMA_VERSION = 1 as const;
export const METHOD_V5_PLAN_KIND = "method-v5-open-training-literal-endpoint" as const;

export type MethodV5PlanArm = {
    armId: string;
    policyId: string;
    policy: MethodV5CloseoutPolicy;
};

export type MethodV5PlanEpisode = {
    episodeId: string;
    armId: string;
    policyId: string;
    candidateSlot: 0 | 1;
};

export type MethodV5RunPlan = {
    schemaVersion: typeof METHOD_V5_PLAN_SCHEMA_VERSION;
    kind: typeof METHOD_V5_PLAN_KIND;
    runId: string;
    sourceGitCommit: string;
    sourceRuntimeSha256: string;
    baselineGitCommit: string;
    baselineRuntimeSha256: string;
    gameApiRuntimeSha256: string;
    packageLockSha256: string;
    sourcePopulationCommitmentSha256: string;
    endpointVersion: typeof LITERAL_BUILDING_ELIMINATION_ENDPOINT_VERSION;
    endpointSha256: typeof LITERAL_BUILDING_ELIMINATION_ENDPOINT_SHA256;
    family: {
        familyId: string;
        mapName: string;
        mapSha256: string;
    };
    country: Countries;
    engineSeedBase: number;
    seedBlockIndex: number;
    requestedEngineSeed: number;
    maxTicks: number;
    arms: MethodV5PlanArm[];
    episodes: MethodV5PlanEpisode[];
};

const SHA256 = /^[0-9a-f]{64}$/;
const COMMIT = /^[0-9a-f]{40}$/;
const IDENTIFIER = /^[A-Za-z0-9._-]+$/;

const exactKeys = (value: Record<string, unknown>, expected: string[], label: string): void => {
    const actual = Object.keys(value).sort();
    const wanted = expected.sort();
    if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
        throw new Error(`${label} has an invalid exact schema`);
    }
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
    !!value && typeof value === "object" && !Array.isArray(value);

const requireString = (value: unknown, label: string, pattern?: RegExp): string => {
    if (typeof value !== "string" || value.length === 0 || (pattern && !pattern.test(value))) {
        throw new Error(`${label} is invalid`);
    }
    return value;
};

const requireInteger = (value: unknown, label: string, minimum: number, maximum: number): number => {
    if (!Number.isSafeInteger(value) || (value as number) < minimum || (value as number) > maximum) {
        throw new Error(`${label} must be an integer in [${minimum}, ${maximum}]`);
    }
    return value as number;
};

export const parseMethodV5RunPlan = (value: unknown): MethodV5RunPlan => {
    if (!isRecord(value)) throw new Error("Method-v5 run plan must be an object");
    exactKeys(value, [
        "schemaVersion", "kind", "runId", "sourceGitCommit", "sourceRuntimeSha256",
        "baselineGitCommit", "baselineRuntimeSha256", "gameApiRuntimeSha256",
        "packageLockSha256", "sourcePopulationCommitmentSha256", "endpointVersion",
        "endpointSha256", "family", "country", "engineSeedBase", "seedBlockIndex",
        "requestedEngineSeed", "maxTicks", "arms", "episodes",
    ], "Method-v5 run plan");
    if (value.schemaVersion !== METHOD_V5_PLAN_SCHEMA_VERSION || value.kind !== METHOD_V5_PLAN_KIND) {
        throw new Error("Method-v5 plan identity is invalid");
    }
    if (
        value.endpointVersion !== LITERAL_BUILDING_ELIMINATION_ENDPOINT_VERSION ||
        value.endpointSha256 !== LITERAL_BUILDING_ELIMINATION_ENDPOINT_SHA256
    ) throw new Error("Method-v5 plan endpoint binding drifted");
    if (!isRecord(value.family)) throw new Error("Method-v5 plan family is invalid");
    exactKeys(value.family, ["familyId", "mapName", "mapSha256"], "Method-v5 family");
    const familyId = requireString(value.family.familyId, "familyId", IDENTIFIER);
    const mapName = requireString(value.family.mapName, "mapName");
    if (mapName !== mapName.split(/[\\/]/).pop() || !/\.(map|mpr)$/i.test(mapName)) {
        throw new Error("Method-v5 mapName must be a map basename");
    }
    const country = value.country;
    if (typeof country !== "string" || !Object.values(Countries).includes(country as Countries)) {
        throw new Error("Method-v5 plan country is invalid");
    }
    if (!Array.isArray(value.arms) || value.arms.length < 1) throw new Error("Method-v5 plan has no arms");
    const arms = value.arms.map((raw, index): MethodV5PlanArm => {
        if (!isRecord(raw)) throw new Error(`Method-v5 arm ${index} is invalid`);
        exactKeys(raw, ["armId", "policyId", "policy"], `Method-v5 arm ${index}`);
        const armId = requireString(raw.armId, `arm ${index} armId`, IDENTIFIER);
        const policyId = requireString(raw.policyId, `arm ${index} policyId`, SHA256);
        const policy = validateMethodV5CloseoutPolicy(raw.policy as MethodV5CloseoutPolicy);
        if (methodV5CloseoutPolicySha256(policy) !== policyId) {
            throw new Error(`Method-v5 arm ${armId} policy hash drifted`);
        }
        return { armId, policyId, policy };
    });
    if (
        new Set(arms.map(({ armId }) => armId)).size !== arms.length ||
        new Set(arms.map(({ policyId }) => policyId)).size !== arms.length
    ) throw new Error("Method-v5 plan arm identities must be unique");
    if (!Array.isArray(value.episodes)) throw new Error("Method-v5 plan episodes are invalid");
    const armById = new Map(arms.map((arm) => [arm.armId, arm]));
    const episodes = value.episodes.map((raw, index): MethodV5PlanEpisode => {
        if (!isRecord(raw)) throw new Error(`Method-v5 episode ${index} is invalid`);
        exactKeys(raw, ["episodeId", "armId", "policyId", "candidateSlot"], `Method-v5 episode ${index}`);
        const episodeId = requireString(raw.episodeId, `episode ${index} episodeId`, IDENTIFIER);
        const armId = requireString(raw.armId, `episode ${index} armId`, IDENTIFIER);
        const policyId = requireString(raw.policyId, `episode ${index} policyId`, SHA256);
        if ((raw.candidateSlot !== 0 && raw.candidateSlot !== 1) || armById.get(armId)?.policyId !== policyId) {
            throw new Error(`Method-v5 episode ${index} has an invalid arm or slot binding`);
        }
        return { episodeId, armId, policyId, candidateSlot: raw.candidateSlot };
    });
    if (
        episodes.length !== arms.length * 2 ||
        new Set(episodes.map(({ episodeId }) => episodeId)).size !== episodes.length
    ) throw new Error("Method-v5 plan episode count or identities are invalid");
    for (const arm of arms) {
        const slots = episodes.filter(({ armId }) => armId === arm.armId).map(({ candidateSlot }) => candidateSlot).sort();
        if (slots.join(",") !== "0,1") throw new Error(`Method-v5 arm ${arm.armId} lacks reciprocal slots`);
    }
    const engineSeedBase = requireInteger(value.engineSeedBase, "engineSeedBase", 0, 0xffff_ffff);
    const seedBlockIndex = requireInteger(value.seedBlockIndex, "seedBlockIndex", 0, Number.MAX_SAFE_INTEGER);
    const requestedEngineSeed = requireInteger(value.requestedEngineSeed, "requestedEngineSeed", 0, 0xffff_ffff);
    if (derivePairedEngineSeed(engineSeedBase, seedBlockIndex) !== requestedEngineSeed) {
        throw new Error("Method-v5 requested engine seed drifted from its paired derivation");
    }
    return {
        schemaVersion: METHOD_V5_PLAN_SCHEMA_VERSION,
        kind: METHOD_V5_PLAN_KIND,
        runId: requireString(value.runId, "runId", IDENTIFIER),
        sourceGitCommit: requireString(value.sourceGitCommit, "sourceGitCommit", COMMIT),
        sourceRuntimeSha256: requireString(value.sourceRuntimeSha256, "sourceRuntimeSha256", SHA256),
        baselineGitCommit: requireString(value.baselineGitCommit, "baselineGitCommit", COMMIT),
        baselineRuntimeSha256: requireString(value.baselineRuntimeSha256, "baselineRuntimeSha256", SHA256),
        gameApiRuntimeSha256: requireString(value.gameApiRuntimeSha256, "gameApiRuntimeSha256", SHA256),
        packageLockSha256: requireString(value.packageLockSha256, "packageLockSha256", SHA256),
        sourcePopulationCommitmentSha256: requireString(
            value.sourcePopulationCommitmentSha256,
            "sourcePopulationCommitmentSha256",
            SHA256,
        ),
        endpointVersion: LITERAL_BUILDING_ELIMINATION_ENDPOINT_VERSION,
        endpointSha256: LITERAL_BUILDING_ELIMINATION_ENDPOINT_SHA256,
        family: {
            familyId,
            mapName,
            mapSha256: requireString(value.family.mapSha256, "mapSha256", SHA256),
        },
        country: country as Countries,
        engineSeedBase,
        seedBlockIndex,
        requestedEngineSeed,
        maxTicks: requireInteger(value.maxTicks, "maxTicks", 1, 100_000),
        arms,
        episodes,
    };
};

export const serializeMethodV5RunPlan = (plan: MethodV5RunPlan): string =>
    `${JSON.stringify(parseMethodV5RunPlan(plan), null, 2)}\n`;

export const sha256File = (filePath: string): string =>
    crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");

const runtimeCommitment = (trees: ReturnType<typeof createExperimentManifest>["source"]["runtimeTrees"]): string =>
    crypto.createHash("sha256").update(JSON.stringify(trees)).digest("hex");

const appendJsonLine = (filePath: string, value: unknown): void => {
    fs.appendFileSync(filePath, `${JSON.stringify(value)}\n`);
};

const gitRoot = (): string => execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();

const requireEnvPath = (name: string): string => {
    const value = process.env[name];
    if (!value) throw new Error(`${name} is required`);
    return path.resolve(value);
};

export const runMethodV5PlanFromEnvironment = async (): Promise<void> => {
    const repoRoot = gitRoot();
    const driverRoot = path.join(repoRoot, "packages", "chronodivide-bot-driver");
    if (path.resolve(process.cwd()) !== driverRoot) throw new Error(`Method-v5 runner must start in ${driverRoot}`);
    const planPath = requireEnvPath("METHOD_V5_PLAN");
    const outDir = requireEnvPath("OUT_DIR");
    if (fs.existsSync(outDir)) throw new Error(`Refusing to reuse Method-v5 OUT_DIR ${outDir}`);
    if (!process.env.BASELINE_PACKAGE_ROOT || process.env.REQUIRE_EXTERNAL_BASELINE !== "true") {
        throw new Error("Method-v5 execution requires the pinned external baseline environment");
    }
    const planSha256 = sha256File(planPath);
    const plan = parseMethodV5RunPlan(JSON.parse(fs.readFileSync(planPath, "utf8")));
    const baselineFactory = await loadBaselineFactory(path.join(repoRoot, "packages", "chronodivide-bot"));
    const mixDir = path.join(driverRoot, "data");
    const manifest = createExperimentManifest({
        runId: plan.runId,
        mixDir,
        maps: [plan.family.mapName],
        effectiveConfig: {
            runner: "methodV5PlanRunner-v1",
            planPath,
            planSha256,
            familyId: plan.family.familyId,
            country: plan.country,
            armCount: plan.arms.length,
            launchedEpisodeCount: plan.episodes.length,
            noRetries: true,
            shortGame: false,
            quitSuppression: "symmetric_no_forwarding",
            endpointVersion: plan.endpointVersion,
            endpointSha256: plan.endpointSha256,
            outcomeAccess: "open-training-only",
        },
        baseline: baselineFactory.descriptor,
        gameSeedBase: plan.engineSeedBase,
    });
    if (
        manifest.source.gitCommit !== plan.sourceGitCommit ||
        manifest.source.gitBranch !== "main" ||
        manifest.source.trackedDirty !== false ||
        runtimeCommitment(manifest.source.runtimeTrees) !== plan.sourceRuntimeSha256 ||
        manifest.scheduler.jobId === null ||
        manifest.scheduler.account !== "pi_jss233" ||
        manifest.software.baseline.kind !== "external-package" ||
        manifest.software.baseline.gitCommit !== plan.baselineGitCommit ||
        manifest.software.baseline.trackedDirty !== false ||
        manifest.software.baseline.runtimeTree.sha256 !== plan.baselineRuntimeSha256 ||
        manifest.software.gameApiRuntimeTree.sha256 !== plan.gameApiRuntimeSha256 ||
        manifest.software.packageLockSha256 !== plan.packageLockSha256
    ) throw new Error("Method-v5 runtime, source, baseline, or scheduler provenance drifted");
    const runtimeMap = manifest.inputs.maps[0];
    if (!runtimeMap?.exists || runtimeMap.sha256 !== plan.family.mapSha256) {
        throw new Error("Method-v5 runtime map bytes drifted from the plan");
    }
    const closeoutSource = fs.readFileSync(path.join(driverRoot, "src", "training", "methodV5Closeout.ts"), "utf8");
    const closeoutRuntime = fs.readFileSync(path.join(driverRoot, "dist", "training", "methodV5Closeout.js"), "utf8");
    if (/\bgetAllUnits\s*\(/.test(closeoutSource) || /\.getAllUnits\(/.test(closeoutRuntime)) {
        throw new Error("Method-v5 policy source or runtime violates the complete-state information boundary");
    }

    fs.mkdirSync(outDir, { recursive: false, mode: 0o700 });
    const manifestPath = path.join(outDir, "manifest.json");
    const eventsPath = path.join(outDir, "events.jsonl");
    const summaryPath = path.join(outDir, "summary.json");
    fs.writeFileSync(manifestPath, JSON.stringify({ planSha256, plan, manifest }, null, 2), { flag: "wx" });
    fs.writeFileSync(eventsPath, "", { flag: "wx" });
    appendJsonLine(eventsPath, { event: "run_start", planSha256, requestedLaunches: plan.episodes.length });
    await (await import("@chronodivide/game-api")).cdapi.init(mixDir);
    const armById = new Map(plan.arms.map((arm) => [arm.armId, arm]));
    let completed = 0;
    let technicalFailures = 0;
    let candidateWins = 0;
    let baselineWins = 0;
    let draws = 0;
    for (let launchIndex = 0; launchIndex < plan.episodes.length; launchIndex++) {
        const episode = plan.episodes[launchIndex];
        const arm = armById.get(episode.armId) as MethodV5PlanArm;
        const spec: MethodV5EpisodeSpec = {
            schemaVersion: METHOD_V5_EPISODE_SCHEMA_VERSION,
            episodeId: episode.episodeId,
            familyId: plan.family.familyId,
            mapName: plan.family.mapName,
            mapSha256: plan.family.mapSha256,
            policyId: arm.policyId,
            policy: arm.policy,
            seedBlockIndex: plan.seedBlockIndex,
            requestedEngineSeed: plan.requestedEngineSeed,
            candidateSlot: episode.candidateSlot,
            candidateCountry: plan.country,
            baselineCountry: plan.country,
            maxTicks: plan.maxTicks,
        };
        appendJsonLine(eventsPath, {
            event: "launch_counted",
            launchIndex,
            episodeId: episode.episodeId,
            familyId: plan.family.familyId,
            country: plan.country,
            armId: arm.armId,
            policyId: arm.policyId,
            seedBlockIndex: plan.seedBlockIndex,
            requestedEngineSeed: plan.requestedEngineSeed,
            candidateSlot: episode.candidateSlot,
        });
        try {
            const result = await runMethodV5Episode(spec, baselineFactory);
            if (result.technicalFailure || result.winner === null) {
                technicalFailures++;
                appendJsonLine(eventsPath, { event: "endpoint_technical_failure", launchIndex, result });
                continue;
            }
            completed++;
            candidateWins += Number(result.winner === "candidate");
            baselineWins += Number(result.winner === "baseline");
            draws += Number(result.winner === "draw");
            appendJsonLine(eventsPath, { event: "episode_complete", launchIndex, result });
        } catch (error) {
            technicalFailures++;
            appendJsonLine(eventsPath, {
                event: "technical_failure",
                launchIndex,
                episodeId: episode.episodeId,
                error: {
                    name: error instanceof Error ? error.name : "Error",
                    message: error instanceof Error ? error.message : String(error),
                    stack: error instanceof Error ? error.stack : null,
                },
            });
        }
    }
    const summary = {
        schemaVersion: 1,
        status: technicalFailures === 0 ? "COMPLETE_METHOD_V5_OPEN_TRAINING_SHARD" : "FAILED_METHOD_V5_TECHNICAL_SHARD",
        generatedAt: new Date().toISOString(),
        runId: plan.runId,
        planSha256,
        requestedLaunches: plan.episodes.length,
        accountedLaunches: completed + technicalFailures,
        completed,
        technicalFailures,
        candidateWins,
        baselineWins,
        draws,
        literalWinRate: completed > 0 ? candidateWins / completed : null,
        complete: completed + technicalFailures === plan.episodes.length,
        technicallyClean: technicalFailures === 0,
        outcomeAccess: "open-training-only",
    };
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2), { flag: "wx" });
    appendJsonLine(eventsPath, { event: "run_complete", summary });
    console.log(JSON.stringify(summary));
    if (technicalFailures > 0) process.exitCode = 2;
};

const invoked = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (import.meta.url === invoked) {
    runMethodV5PlanFromEnvironment().catch((error) => {
        console.error(error);
        process.exitCode = 1;
    });
}
