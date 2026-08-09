import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { ResearchDevelopmentCampaign } from "./researchDevelopmentPlanGenerator.js";
import {
    developmentResultArtifactCommitmentSha256,
    validateSealedDevelopmentSummary,
} from "./researchDevelopmentTechnicalGate.js";
import { parseResearchRunPlan, sha256File } from "./researchPlanRunner.js";

export const RESEARCH_DEVELOPMENT_UNBLINDING_SCHEMA_VERSION = 1 as const;
export const RESEARCH_DEVELOPMENT_ONE_SIDED_CONFIDENCE = 0.80 as const;
export const RESEARCH_DEVELOPMENT_CLUSTER_DF = 4 as const;
// 0.80 quantile of Student's t with min(10 map families, 5 optimizer runs) - 1 = 4 df.
export const RESEARCH_DEVELOPMENT_T_CRITICAL = 0.9409645772351825 as const;

export type DevelopmentPhase3Block = {
    familyId: string;
    optimizerRunIndex: number;
    seedBlockIndex: number;
    globalScores: [number, number];
    conditionedScores: [number, number];
    globalWallTimeMs?: [number, number];
    conditionedWallTimeMs?: [number, number];
};

type PrimaryAnalysis = {
    estimand: "equally-family-weighted conditioned-minus-global score difference";
    observationUnit: "reciprocal-start-averaged family-run-seed block";
    familyCount: 10;
    optimizerRunCount: 5;
    blocksPerFamilyRun: 4;
    blockCount: 200;
    estimate: number;
    varianceFamily: number;
    varianceOptimizerRun: number;
    varianceFamilyByRunIntersection: number;
    sandwichVariance: number;
    standardError: number | null;
    confidence: typeof RESEARCH_DEVELOPMENT_ONE_SIDED_CONFIDENCE;
    degreesOfFreedom: typeof RESEARCH_DEVELOPMENT_CLUSTER_DF;
    criticalValue: typeof RESEARCH_DEVELOPMENT_T_CRITICAL;
    oneSidedLowerBound: number | null;
    varianceValid: boolean;
    passed: boolean;
};

type MethodDiagnostic = {
    score: number;
    candidateWins: number;
    draws: number;
    baselineWins: number;
};

export type DevelopmentPhase3Analysis = {
    status: "PASSED_DEVELOPMENT_SIGNAL_GATE" | "FAILED_DEVELOPMENT_SIGNAL_GATE";
    primary: PrimaryAnalysis;
    methods: {
        global: MethodDiagnostic;
        conditioned: MethodDiagnostic;
    };
    familyDiagnostics: Array<{
        familyId: string;
        estimate: number;
        globalScore: number;
        conditionedScore: number;
        blockCount: 20;
    }>;
    optimizerRunDiagnostics: Array<{
        optimizerRunIndex: number;
        estimate: number;
        globalScore: number;
        conditionedScore: number;
        blockCount: 40;
    }>;
    varianceDiagnostics: {
        randomEffectsMethod: "balanced crossed method-of-moments on block contrasts";
        family: number;
        optimizerRun: number;
        familyByOptimizerRun: number;
        residualBlock: number;
        startContrastVariance: [number, number];
        reciprocalStartContrastCovariance: number;
        startLevelConditionedGlobalCovariance: number;
        blockLevelConditionedGlobalCovariance: number;
        observedSandwichVarianceNonPositive: boolean;
    };
    timingDiagnostics: {
        available: boolean;
        globalMeanWallTimeMs: number | null;
        conditionedMeanWallTimeMs: number | null;
    };
};

const SHA256_PATTERN = /^[0-9a-f]{64}$/;

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null && !Array.isArray(value);

const mean = (values: number[]): number => values.reduce((sum, value) => sum + value, 0) / values.length;

const sampleVariance = (values: number[]): number => {
    const center = mean(values);
    return values.reduce((sum, value) => sum + (value - center) ** 2, 0) / (values.length - 1);
};

const sampleCovariance = (left: number[], right: number[]): number => {
    if (left.length !== right.length || left.length < 2) {
        throw new Error("Covariance inputs must have the same length of at least two");
    }
    const leftMean = mean(left);
    const rightMean = mean(right);
    return left.reduce(
        (sum, value, index) => sum + (value - leftMean) * (right[index] - rightMean),
        0,
    ) / (left.length - 1);
};

const methodDiagnostic = (scores: number[]): MethodDiagnostic => ({
    score: mean(scores),
    candidateWins: scores.filter((score) => score === 1).length,
    draws: scores.filter((score) => score === 0.5).length,
    baselineWins: scores.filter((score) => score === 0).length,
});

const blockContrast = (block: DevelopmentPhase3Block): number =>
    mean(block.conditionedScores.map((score, index) => score - block.globalScores[index]));

const assertScore = (score: number, label: string): void => {
    if (score !== 0 && score !== 0.5 && score !== 1) {
        throw new Error(`${label} must be one of 0, 0.5, or 1`);
    }
};

export const analyzeDevelopmentPhase3 = (
    blocks: DevelopmentPhase3Block[],
): DevelopmentPhase3Analysis => {
    if (blocks.length !== 200) {
        throw new Error("Phase-3 analysis requires exactly 200 reciprocal-start-averaged blocks");
    }
    const families = [...new Set(blocks.map(({ familyId }) => familyId))].sort();
    const runs = [...new Set(blocks.map(({ optimizerRunIndex }) => optimizerRunIndex))].sort((a, b) => a - b);
    if (families.length !== 10 || runs.join(",") !== "0,1,2,3,4") {
        throw new Error("Phase-3 analysis requires ten families crossed with optimizer runs 0,1,2,3,4");
    }
    const blockKeys = new Set<string>();
    for (const block of blocks) {
        if (!Number.isSafeInteger(block.seedBlockIndex) || block.seedBlockIndex < 0) {
            throw new Error("Phase-3 seed block index must be a non-negative integer");
        }
        const key = `${block.familyId}|${block.optimizerRunIndex}|${block.seedBlockIndex}`;
        if (blockKeys.has(key)) {
            throw new Error(`Duplicate phase-3 block ${key}`);
        }
        blockKeys.add(key);
        block.globalScores.forEach((score, index) => assertScore(score, `${key} global slot ${index}`));
        block.conditionedScores.forEach((score, index) => assertScore(score, `${key} conditioned slot ${index}`));
    }
    for (const familyId of families) {
        for (const optimizerRunIndex of runs) {
            const cell = blocks.filter((block) =>
                block.familyId === familyId && block.optimizerRunIndex === optimizerRunIndex
            );
            if (cell.length !== 4 || new Set(cell.map(({ seedBlockIndex }) => seedBlockIndex)).size !== 4) {
                throw new Error(`Phase-3 cell ${familyId}|${optimizerRunIndex} must contain four unique blocks`);
            }
        }
    }

    const contrasts = blocks.map(blockContrast);
    const estimate = mean(contrasts);
    const residuals = contrasts.map((value) => value - estimate);
    const observationCount = blocks.length;
    const clusterMeat = <T>(cluster: (block: DevelopmentPhase3Block) => T): number => {
        const sums = new Map<T, number>();
        blocks.forEach((block, index) => {
            const key = cluster(block);
            sums.set(key, (sums.get(key) ?? 0) + residuals[index]);
        });
        return [...sums.values()].reduce((sum, value) => sum + value ** 2, 0);
    };
    const familyMeat = clusterMeat(({ familyId }) => familyId);
    const runMeat = clusterMeat(({ optimizerRunIndex }) => optimizerRunIndex);
    const intersectionMeat = clusterMeat(({ familyId, optimizerRunIndex }) =>
        `${familyId}|${optimizerRunIndex}`
    );
    const varianceFamily = (10 / 9) * familyMeat / observationCount ** 2;
    const varianceOptimizerRun = (5 / 4) * runMeat / observationCount ** 2;
    const varianceFamilyByRunIntersection = (50 / 49) * intersectionMeat / observationCount ** 2;
    const sandwichVariance = varianceFamily + varianceOptimizerRun - varianceFamilyByRunIntersection;
    const varianceValid = Number.isFinite(sandwichVariance) && sandwichVariance > 0;
    const standardError = varianceValid ? Math.sqrt(sandwichVariance) : null;
    const oneSidedLowerBound = standardError === null
        ? null
        : estimate - RESEARCH_DEVELOPMENT_T_CRITICAL * standardError;
    const passed = oneSidedLowerBound !== null && oneSidedLowerBound > 0;

    const familyDiagnostics = families.map((familyId) => {
        const rows = blocks.filter((block) => block.familyId === familyId);
        return {
            familyId,
            estimate: mean(rows.map(blockContrast)),
            globalScore: mean(rows.flatMap(({ globalScores }) => globalScores)),
            conditionedScore: mean(rows.flatMap(({ conditionedScores }) => conditionedScores)),
            blockCount: 20 as const,
        };
    });
    const optimizerRunDiagnostics = runs.map((optimizerRunIndex) => {
        const rows = blocks.filter((block) => block.optimizerRunIndex === optimizerRunIndex);
        return {
            optimizerRunIndex,
            estimate: mean(rows.map(blockContrast)),
            globalScore: mean(rows.flatMap(({ globalScores }) => globalScores)),
            conditionedScore: mean(rows.flatMap(({ conditionedScores }) => conditionedScores)),
            blockCount: 40 as const,
        };
    });

    const familyMeans = new Map(familyDiagnostics.map((row) => [row.familyId, row.estimate]));
    const runMeans = new Map(optimizerRunDiagnostics.map((row) => [row.optimizerRunIndex, row.estimate]));
    const cellMeans = new Map<string, number>();
    for (const familyId of families) {
        for (const optimizerRunIndex of runs) {
            const key = `${familyId}|${optimizerRunIndex}`;
            cellMeans.set(key, mean(blocks.filter((block) =>
                block.familyId === familyId && block.optimizerRunIndex === optimizerRunIndex
            ).map(blockContrast)));
        }
    }
    const ssFamily = 5 * 4 * familyDiagnostics.reduce(
        (sum, row) => sum + (row.estimate - estimate) ** 2,
        0,
    );
    const ssRun = 10 * 4 * optimizerRunDiagnostics.reduce(
        (sum, row) => sum + (row.estimate - estimate) ** 2,
        0,
    );
    let ssInteraction = 0;
    let ssResidual = 0;
    blocks.forEach((block, index) => {
        const cellMean = cellMeans.get(`${block.familyId}|${block.optimizerRunIndex}`) as number;
        ssResidual += (contrasts[index] - cellMean) ** 2;
    });
    for (const familyId of families) {
        for (const optimizerRunIndex of runs) {
            const cellMean = cellMeans.get(`${familyId}|${optimizerRunIndex}`) as number;
            ssInteraction += 4 * (
                cellMean - (familyMeans.get(familyId) as number) -
                (runMeans.get(optimizerRunIndex) as number) + estimate
            ) ** 2;
        }
    }
    const msFamily = ssFamily / 9;
    const msRun = ssRun / 4;
    const msInteraction = ssInteraction / 36;
    const msResidual = ssResidual / 150;
    const startContrasts: [number[], number[]] = [[], []];
    const globalStartScores: number[] = [];
    const conditionedStartScores: number[] = [];
    const globalBlockScores: number[] = [];
    const conditionedBlockScores: number[] = [];
    for (const block of blocks) {
        startContrasts[0].push(block.conditionedScores[0] - block.globalScores[0]);
        startContrasts[1].push(block.conditionedScores[1] - block.globalScores[1]);
        globalStartScores.push(...block.globalScores);
        conditionedStartScores.push(...block.conditionedScores);
        globalBlockScores.push(mean(block.globalScores));
        conditionedBlockScores.push(mean(block.conditionedScores));
    }
    const globalTimes = blocks.flatMap(({ globalWallTimeMs }) => globalWallTimeMs ?? []);
    const conditionedTimes = blocks.flatMap(({ conditionedWallTimeMs }) => conditionedWallTimeMs ?? []);
    const timingAvailable = globalTimes.length === 400 && conditionedTimes.length === 400;

    return {
        status: passed ? "PASSED_DEVELOPMENT_SIGNAL_GATE" : "FAILED_DEVELOPMENT_SIGNAL_GATE",
        primary: {
            estimand: "equally-family-weighted conditioned-minus-global score difference",
            observationUnit: "reciprocal-start-averaged family-run-seed block",
            familyCount: 10,
            optimizerRunCount: 5,
            blocksPerFamilyRun: 4,
            blockCount: 200,
            estimate,
            varianceFamily,
            varianceOptimizerRun,
            varianceFamilyByRunIntersection,
            sandwichVariance,
            standardError,
            confidence: RESEARCH_DEVELOPMENT_ONE_SIDED_CONFIDENCE,
            degreesOfFreedom: RESEARCH_DEVELOPMENT_CLUSTER_DF,
            criticalValue: RESEARCH_DEVELOPMENT_T_CRITICAL,
            oneSidedLowerBound,
            varianceValid,
            passed,
        },
        methods: {
            global: methodDiagnostic(globalStartScores),
            conditioned: methodDiagnostic(conditionedStartScores),
        },
        familyDiagnostics,
        optimizerRunDiagnostics,
        varianceDiagnostics: {
            randomEffectsMethod: "balanced crossed method-of-moments on block contrasts",
            family: Math.max(0, (msFamily - msInteraction) / (5 * 4)),
            optimizerRun: Math.max(0, (msRun - msInteraction) / (10 * 4)),
            familyByOptimizerRun: Math.max(0, (msInteraction - msResidual) / 4),
            residualBlock: msResidual,
            startContrastVariance: [sampleVariance(startContrasts[0]), sampleVariance(startContrasts[1])],
            reciprocalStartContrastCovariance: sampleCovariance(startContrasts[0], startContrasts[1]),
            startLevelConditionedGlobalCovariance: sampleCovariance(conditionedStartScores, globalStartScores),
            blockLevelConditionedGlobalCovariance: sampleCovariance(conditionedBlockScores, globalBlockScores),
            observedSandwichVarianceNonPositive: !varianceValid,
        },
        timingDiagnostics: {
            available: timingAvailable,
            globalMeanWallTimeMs: timingAvailable ? mean(globalTimes) : null,
            conditionedMeanWallTimeMs: timingAvailable ? mean(conditionedTimes) : null,
        },
    };
};

const parseJson = (filePath: string): unknown => JSON.parse(fs.readFileSync(filePath, "utf8"));

const requiredPath = (name: string): string => {
    const value = process.env[name];
    if (!value) {
        throw new Error(`${name} is required`);
    }
    return path.resolve(value);
};

const requiredSha256 = (name: string): string => {
    const value = process.env[name];
    if (!value || !SHA256_PATTERN.test(value)) {
        throw new Error(`${name} must be a lowercase SHA-256 digest`);
    }
    return value;
};

const requiredArrayJobId = (): string => {
    const value = process.env.ARRAY_JOB_ID;
    if (!value || !/^\d+$/.test(value)) {
        throw new Error("ARRAY_JOB_ID must be the numeric Slurm array job ID");
    }
    return value;
};

const parsePhase3Campaign = (campaignPath: string): ResearchDevelopmentCampaign => {
    const value = parseJson(campaignPath);
    if (
        !isRecord(value) ||
        value.schemaVersion !== 1 ||
        value.phase !== "development-phase3" ||
        value.outcomeAccess !== "sealed-private-events" ||
        value.launchedGameCount !== 800 ||
        !Array.isArray(value.shards) ||
        value.shards.length !== 200 ||
        !Array.isArray(value.selectedFamilies) ||
        value.selectedFamilies.length !== 10 ||
        !Array.isArray(value.selectedOptimizerRuns) ||
        value.selectedOptimizerRuns.join(",") !== "0,1,2,3,4"
    ) {
        throw new Error("Unblinding requires the exact frozen phase-3 campaign schema and allocation");
    }
    return value as unknown as ResearchDevelopmentCampaign;
};

const validateTechnicalGate = (
    value: unknown,
    campaign: ResearchDevelopmentCampaign,
    campaignPath: string,
    campaignSha256: string,
    resultsRoot: string,
    arrayJobId: string,
): void => {
    if (
        !isRecord(value) ||
        value.schemaVersion !== 2 ||
        value.status !== "PASSED_TECHNICAL_ONLY_NO_OUTCOMES_INSPECTED" ||
        value.phase !== "development-phase3" ||
        value.authorizedNextPhase !== "development-unblinding" ||
        value.schedulerAccount !== "pi_jss233" ||
        value.campaignPath !== campaignPath ||
        value.campaignSha256 !== campaignSha256 ||
        value.campaignSourceGitCommit !== campaign.sourceGitCommit ||
        value.gateSourceGitCommit !== campaign.sourceGitCommit ||
        value.resultsRoot !== resultsRoot ||
        value.resultArtifactCommitmentSha256 !== developmentResultArtifactCommitmentSha256(
            campaign,
            resultsRoot,
            arrayJobId,
        ) ||
        value.arrayJobId !== arrayJobId ||
        value.shardCount !== 200 ||
        value.requestedLaunches !== 800 ||
        value.accountedLaunches !== 800 ||
        value.completedLaunches !== 800 ||
        value.technicalFailures !== 0 ||
        value.sealedSummaryViolations !== 0 ||
        !Array.isArray(value.outcomeFieldsEmitted) ||
        value.outcomeFieldsEmitted.length !== 0 ||
        !Array.isArray(value.schedulerJobIds) ||
        value.schedulerJobIds.length !== 200
    ) {
        throw new Error("Phase-3 technical gate does not authorize the single scheduled unblinding");
    }
};

const winnerScore = (winner: unknown): number | null =>
    winner === "candidate" ? 1 : winner === "draw" ? 0.5 : winner === "baseline" ? 0 : null;

const readPhase3Blocks = (
    campaign: ResearchDevelopmentCampaign,
    resultsRoot: string,
    arrayJobId: string,
): DevelopmentPhase3Block[] => campaign.shards.map((shard) => {
    const resultDir = path.join(resultsRoot, `${arrayJobId}_${shard.shardIndex}`);
    const summaryPath = path.join(resultDir, "summary.json");
    const eventsPath = path.join(resultDir, "events.jsonl");
    const summary = validateSealedDevelopmentSummary(parseJson(summaryPath));
    if (
        summary.runId !== shard.runId ||
        summary.planBytesSha256 !== shard.planSha256 ||
        summary.requestedLaunches !== 4 ||
        summary.accountedLaunches !== 4 ||
        summary.completed !== 4 ||
        summary.technicalFailures !== 0 ||
        !summary.complete ||
        !summary.technicallyClean ||
        sha256File(shard.planFile) !== shard.planSha256
    ) {
        throw new Error(`Phase-3 shard ${shard.shardIndex} changed after its technical gate`);
    }
    const plan = parseResearchRunPlan(parseJson(shard.planFile));
    if (
        plan.runId !== shard.runId ||
        plan.sourceGitCommit !== campaign.sourceGitCommit ||
        plan.role !== "development" ||
        plan.episodes.length !== 4
    ) {
        throw new Error(`Phase-3 shard ${shard.shardIndex} plan differs from the frozen campaign`);
    }
    const events = fs.readFileSync(eventsPath, "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line) as unknown);
    if (events.length !== 10 || events.some((event) => !isRecord(event))) {
        throw new Error(`Phase-3 shard ${shard.shardIndex} event stream is malformed`);
    }
    const completions = (events as Record<string, unknown>[]).filter(({ event }) => event === "episode_complete");
    if (completions.length !== 4) {
        throw new Error(`Phase-3 shard ${shard.shardIndex} does not contain four completions`);
    }
    const byEpisode = new Map(completions.map((event) => {
        if (!isRecord(event.result) || typeof event.result.episodeId !== "string") {
            throw new Error(`Phase-3 shard ${shard.shardIndex} contains a malformed result`);
        }
        return [event.result.episodeId, event.result];
    }));
    if (byEpisode.size !== 4) {
        throw new Error(`Phase-3 shard ${shard.shardIndex} contains duplicate completion IDs`);
    }
    const scores: Record<"global" | "conditioned", [number | null, number | null]> = {
        global: [null, null],
        conditioned: [null, null],
    };
    const wallTimes: Record<"global" | "conditioned", [number | null, number | null]> = {
        global: [null, null],
        conditioned: [null, null],
    };
    for (const episode of plan.episodes) {
        const result = byEpisode.get(episode.episodeId);
        if (!result) {
            throw new Error(`Phase-3 shard ${shard.shardIndex} is missing ${episode.episodeId}`);
        }
        const score = result.candidateScore;
        const expectedScore = winnerScore(result.winner);
        if (
            result.familyId !== episode.familyId ||
            result.methodId !== episode.methodId ||
            result.policyId !== episode.policyId ||
            result.seedBlockIndex !== episode.seedBlockIndex ||
            result.requestedEngineSeed !== episode.requestedEngineSeed ||
            result.candidateSlot !== episode.candidateSlot ||
            typeof score !== "number" ||
            expectedScore === null ||
            score !== expectedScore ||
            typeof result.wallTimeMs !== "number" ||
            !Number.isFinite(result.wallTimeMs) ||
            result.wallTimeMs < 0 ||
            (episode.methodId !== "global" && episode.methodId !== "conditioned")
        ) {
            throw new Error(`Phase-3 shard ${shard.shardIndex} completion differs from its plan or endpoint`);
        }
        assertScore(score, `${episode.episodeId} candidateScore`);
        scores[episode.methodId][episode.candidateSlot] = score;
        wallTimes[episode.methodId][episode.candidateSlot] = result.wallTimeMs;
    }
    if ([...scores.global, ...scores.conditioned, ...wallTimes.global, ...wallTimes.conditioned].some((value) => value === null)) {
        throw new Error(`Phase-3 shard ${shard.shardIndex} is not a complete method-by-start block`);
    }
    return {
        familyId: shard.familyId,
        optimizerRunIndex: shard.optimizerRunIndex,
        seedBlockIndex: shard.seedBlockIndex,
        globalScores: scores.global as [number, number],
        conditionedScores: scores.conditioned as [number, number],
        globalWallTimeMs: wallTimes.global as [number, number],
        conditionedWallTimeMs: wallTimes.conditioned as [number, number],
    };
});

const main = (): void => {
    const campaignPath = requiredPath("CAMPAIGN");
    const resultsRoot = requiredPath("RESULTS_ROOT");
    const technicalGatePath = requiredPath("TECHNICAL_GATE");
    const technicalGateSha256 = requiredSha256("TECHNICAL_GATE_SHA256");
    const outputPath = requiredPath("OUT_FILE");
    const arrayJobId = requiredArrayJobId();
    if (fs.existsSync(outputPath)) {
        throw new Error(`Refusing to repeat or overwrite scheduled unblinding ${outputPath}`);
    }
    if (sha256File(technicalGatePath) !== technicalGateSha256) {
        throw new Error("Phase-3 technical gate bytes differ from the explicit unblinding authorization");
    }
    const campaignSha256 = sha256File(campaignPath);
    const campaign = parsePhase3Campaign(campaignPath);
    validateTechnicalGate(
        parseJson(technicalGatePath),
        campaign,
        campaignPath,
        campaignSha256,
        resultsRoot,
        arrayJobId,
    );
    const gitCommit = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
    const gitBranch = execFileSync("git", ["branch", "--show-current"], { encoding: "utf8" }).trim();
    const trackedDirty = execFileSync("git", ["status", "--short", "--untracked-files=no"], { encoding: "utf8" }).trim();
    if (gitBranch !== "main" || trackedDirty.length > 0 || gitCommit !== campaign.sourceGitCommit) {
        throw new Error("Scheduled unblinding requires the exact clean main commit that generated phase 3");
    }
    const analysis = analyzeDevelopmentPhase3(readPhase3Blocks(campaign, resultsRoot, arrayJobId));
    const output = {
        schemaVersion: RESEARCH_DEVELOPMENT_UNBLINDING_SCHEMA_VERSION,
        ...analysis,
        generatedAt: new Date().toISOString(),
        singleScheduledUnblinding: true,
        confirmatoryEvaluationAuthorized: analysis.primary.passed,
        provenance: {
            analysisSourceGitCommit: gitCommit,
            analysisExecutablePath: path.resolve(process.argv[1]),
            analysisExecutableSha256: sha256File(path.resolve(process.argv[1])),
            campaignPath,
            campaignSha256,
            resultsRoot,
            arrayJobId,
            schedulerAccount: "pi_jss233",
            technicalGatePath,
            technicalGateSha256,
        },
    };
    fs.mkdirSync(path.dirname(outputPath), { recursive: true, mode: 0o700 });
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), { flag: "wx", mode: 0o600 });
    console.log(JSON.stringify({
        outputPath,
        outputSha256: sha256File(outputPath),
        status: output.status,
        estimate: output.primary.estimate,
        standardError: output.primary.standardError,
        oneSidedLowerBound: output.primary.oneSidedLowerBound,
        confirmatoryEvaluationAuthorized: output.confirmatoryEvaluationAuthorized,
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
