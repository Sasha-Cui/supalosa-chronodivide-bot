import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { ResearchDevelopmentV2Campaign } from "./researchDevelopmentV2PlanGenerator.js";
import {
    developmentV2ResultArtifactCommitmentSha256,
    validateSealedDevelopmentV2Summary,
} from "./researchDevelopmentV2TechnicalGate.js";
import { parseResearchRunPlan, sha256File } from "./researchPlanRunner.js";

export const RESEARCH_DEVELOPMENT_V2_UNBLINDING_SCHEMA_VERSION = 1 as const;
export const RESEARCH_DEVELOPMENT_V2_CONFIDENCE = 0.80 as const;
export const RESEARCH_DEVELOPMENT_V2_CLUSTER_DF = 9 as const;
export const RESEARCH_DEVELOPMENT_V2_T_CRITICAL = 0.883403859685 as const;

export type DevelopmentV2Phase3Block = {
    familyId: string;
    seedBlockIndex: number;
    defaultScores: [number, number];
    championScores: [number, number];
    defaultWallTimeMs?: [number, number];
    championWallTimeMs?: [number, number];
};

type BoundAnalysis = {
    estimate: number;
    variance: number;
    standardError: number | null;
    confidence: typeof RESEARCH_DEVELOPMENT_V2_CONFIDENCE;
    degreesOfFreedom: typeof RESEARCH_DEVELOPMENT_V2_CLUSTER_DF;
    criticalValue: typeof RESEARCH_DEVELOPMENT_V2_T_CRITICAL;
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

export type DevelopmentV2Phase3Analysis = {
    status: "PASSED_DEVELOPMENT_SIGNAL_GATE" | "FAILED_DEVELOPMENT_SIGNAL_GATE";
    improvement: BoundAnalysis & {
        estimand: "equally-family-weighted champion-minus-default score difference";
        observationUnit: "reciprocal-start-averaged family-seed block";
        familyCount: 10;
        blocksPerFamily: 8;
        blockCount: 80;
    };
    championAbsolute: BoundAnalysis & {
        estimand: "equally-family-weighted champion score minus 0.5";
        observationUnit: "reciprocal-start-averaged family-seed block";
        familyCount: 10;
        blocksPerFamily: 8;
        blockCount: 80;
        championScore: number;
        referenceScore: 0.5;
    };
    methods: {
        default: MethodDiagnostic;
        champion: MethodDiagnostic;
    };
    familyDiagnostics: Array<{
        familyId: string;
        improvement: number;
        defaultScore: number;
        championScore: number;
        blockCount: 8;
    }>;
    timingDiagnostics: {
        available: boolean;
        defaultMeanWallTimeMs: number | null;
        championMeanWallTimeMs: number | null;
    };
};

const SHA256_PATTERN = /^[0-9a-f]{64}$/;

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null && !Array.isArray(value);

const mean = (values: number[]): number => values.reduce((sum, value) => sum + value, 0) / values.length;

const assertScore = (score: number, label: string): void => {
    if (score !== 0 && score !== 0.5 && score !== 1) {
        throw new Error(`${label} must be one of 0, 0.5, or 1`);
    }
};

const methodDiagnostic = (scores: number[]): MethodDiagnostic => ({
    score: mean(scores),
    candidateWins: scores.filter((score) => score === 1).length,
    draws: scores.filter((score) => score === 0.5).length,
    baselineWins: scores.filter((score) => score === 0).length,
});

const familyClusterBound = (
    values: number[],
    familyIds: string[],
    reference: number,
): BoundAnalysis => {
    if (values.length !== 80 || familyIds.length !== 80) {
        throw new Error("Family-cluster analysis requires exactly 80 blocks");
    }
    const center = mean(values);
    const residualSums = new Map<string, number>();
    values.forEach((value, index) => {
        const familyId = familyIds[index];
        residualSums.set(familyId, (residualSums.get(familyId) ?? 0) + value - center);
    });
    if (residualSums.size !== 10) {
        throw new Error("Family-cluster analysis requires exactly ten clusters");
    }
    const variance = (10 / 9) * [...residualSums.values()].reduce((sum, value) => sum + value ** 2, 0) / 80 ** 2;
    const varianceValid = Number.isFinite(variance) && variance > 0;
    const standardError = varianceValid ? Math.sqrt(variance) : null;
    const estimate = center - reference;
    const oneSidedLowerBound = standardError === null
        ? null
        : estimate - RESEARCH_DEVELOPMENT_V2_T_CRITICAL * standardError;
    return {
        estimate,
        variance,
        standardError,
        confidence: RESEARCH_DEVELOPMENT_V2_CONFIDENCE,
        degreesOfFreedom: RESEARCH_DEVELOPMENT_V2_CLUSTER_DF,
        criticalValue: RESEARCH_DEVELOPMENT_V2_T_CRITICAL,
        oneSidedLowerBound,
        varianceValid,
        passed: oneSidedLowerBound !== null && oneSidedLowerBound > 0,
    };
};

export const analyzeDevelopmentV2Phase3 = (
    blocks: DevelopmentV2Phase3Block[],
): DevelopmentV2Phase3Analysis => {
    if (blocks.length !== 80) {
        throw new Error("Method-v2 phase-3 analysis requires exactly 80 reciprocal-start blocks");
    }
    const families = [...new Set(blocks.map(({ familyId }) => familyId))].sort();
    if (families.length !== 10) {
        throw new Error("Method-v2 phase-3 analysis requires exactly ten families");
    }
    const keys = new Set<string>();
    for (const block of blocks) {
        if (!Number.isSafeInteger(block.seedBlockIndex) || block.seedBlockIndex < 0) {
            throw new Error("Method-v2 phase-3 seed block must be a non-negative integer");
        }
        const key = `${block.familyId}|${block.seedBlockIndex}`;
        if (keys.has(key)) {
            throw new Error(`Duplicate method-v2 phase-3 block ${key}`);
        }
        keys.add(key);
        block.defaultScores.forEach((score, index) => assertScore(score, `${key} default slot ${index}`));
        block.championScores.forEach((score, index) => assertScore(score, `${key} champion slot ${index}`));
    }
    for (const familyId of families) {
        const rows = blocks.filter((block) => block.familyId === familyId);
        if (rows.length !== 8 || new Set(rows.map(({ seedBlockIndex }) => seedBlockIndex)).size !== 8) {
            throw new Error(`Method-v2 family ${familyId} must contain eight unique seed blocks`);
        }
    }
    const blockImprovement = blocks.map((block) =>
        mean(block.championScores.map((score, index) => score - block.defaultScores[index])),
    );
    const championBlockScores = blocks.map((block) => mean(block.championScores));
    const familyIds = blocks.map(({ familyId }) => familyId);
    const improvementBound = familyClusterBound(blockImprovement, familyIds, 0);
    const absoluteBound = familyClusterBound(championBlockScores, familyIds, 0.5);
    const defaultScores = blocks.flatMap(({ defaultScores: scores }) => scores);
    const championScores = blocks.flatMap(({ championScores: scores }) => scores);
    const defaultTimes = blocks.flatMap(({ defaultWallTimeMs }) => defaultWallTimeMs ?? []);
    const championTimes = blocks.flatMap(({ championWallTimeMs }) => championWallTimeMs ?? []);
    const timingAvailable = defaultTimes.length === 160 && championTimes.length === 160;
    const passed = improvementBound.passed && absoluteBound.passed;
    return {
        status: passed ? "PASSED_DEVELOPMENT_SIGNAL_GATE" : "FAILED_DEVELOPMENT_SIGNAL_GATE",
        improvement: {
            estimand: "equally-family-weighted champion-minus-default score difference",
            observationUnit: "reciprocal-start-averaged family-seed block",
            familyCount: 10,
            blocksPerFamily: 8,
            blockCount: 80,
            ...improvementBound,
        },
        championAbsolute: {
            estimand: "equally-family-weighted champion score minus 0.5",
            observationUnit: "reciprocal-start-averaged family-seed block",
            familyCount: 10,
            blocksPerFamily: 8,
            blockCount: 80,
            championScore: mean(championBlockScores),
            referenceScore: 0.5,
            ...absoluteBound,
        },
        methods: {
            default: methodDiagnostic(defaultScores),
            champion: methodDiagnostic(championScores),
        },
        familyDiagnostics: families.map((familyId) => {
            const rows = blocks.filter((block) => block.familyId === familyId);
            return {
                familyId,
                improvement: mean(rows.map((block) =>
                    mean(block.championScores.map((score, index) => score - block.defaultScores[index])),
                )),
                defaultScore: mean(rows.flatMap(({ defaultScores: scores }) => scores)),
                championScore: mean(rows.flatMap(({ championScores: scores }) => scores)),
                blockCount: 8 as const,
            };
        }),
        timingDiagnostics: {
            available: timingAvailable,
            defaultMeanWallTimeMs: timingAvailable ? mean(defaultTimes) : null,
            championMeanWallTimeMs: timingAvailable ? mean(championTimes) : null,
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

const parsePhase3Campaign = (campaignPath: string): ResearchDevelopmentV2Campaign => {
    const value = parseJson(campaignPath);
    if (
        !isRecord(value) ||
        value.schemaVersion !== 1 ||
        value.phase !== "development-v2-phase3" ||
        value.outcomeAccess !== "sealed-private-events" ||
        value.shardCount !== 80 ||
        value.launchedGameCount !== 320 ||
        value.familyCount !== 10 ||
        !Array.isArray(value.shards) ||
        value.shards.length !== 80 ||
        !Array.isArray(value.selectedFamilies) ||
        value.selectedFamilies.length !== 10
    ) {
        throw new Error("Method-v2 unblinding requires the exact frozen phase-3 campaign");
    }
    return value as unknown as ResearchDevelopmentV2Campaign;
};

const validateTechnicalGate = (
    value: unknown,
    gatePath: string,
    gateSha256: string,
    campaign: ResearchDevelopmentV2Campaign,
    campaignPath: string,
    campaignSha256: string,
    resultsRoot: string,
    arrayJobId: string,
): void => {
    if (
        sha256File(gatePath) !== gateSha256 ||
        !isRecord(value) ||
        value.schemaVersion !== 1 ||
        value.status !== "PASSED_TECHNICAL_ONLY_NO_OUTCOMES_INSPECTED" ||
        value.phase !== "development-v2-phase3" ||
        value.authorizedNextPhase !== "development-v2-unblinding" ||
        value.schedulerAccount !== "pi_jss233" ||
        value.campaignPath !== campaignPath ||
        value.campaignSha256 !== campaignSha256 ||
        value.campaignSourceGitCommit !== campaign.sourceGitCommit ||
        value.gateSourceGitCommit !== campaign.sourceGitCommit ||
        value.roleManifestSha256 !== campaign.roleManifestSha256 ||
        value.roleCommitmentSha256 !== campaign.roleCommitmentSha256 ||
        value.splitCommitmentSha256 !== campaign.splitCommitmentSha256 ||
        value.sourcePopulationCommitmentSha256 !== campaign.sourcePopulationCommitmentSha256 ||
        value.poolCommitmentSha256 !== campaign.poolCommitmentSha256 ||
        value.championArtifactSha256 !== campaign.championArtifactSha256 ||
        value.championPolicyId !== campaign.championPolicyId ||
        value.defaultPolicyId !== campaign.defaultPolicyId ||
        value.resultsRoot !== resultsRoot ||
        value.resultArtifactCommitmentSha256 !== developmentV2ResultArtifactCommitmentSha256(
            campaign,
            resultsRoot,
            arrayJobId,
        ) ||
        value.arrayJobId !== arrayJobId ||
        value.shardCount !== 80 ||
        value.requestedLaunches !== 320 ||
        value.accountedLaunches !== 320 ||
        value.completedLaunches !== 320 ||
        value.technicalFailures !== 0 ||
        value.sealedSummaryViolations !== 0 ||
        !Array.isArray(value.outcomeFieldsEmitted) ||
        value.outcomeFieldsEmitted.length !== 0 ||
        !Array.isArray(value.schedulerJobIds) ||
        value.schedulerJobIds.length !== 80 ||
        new Set(value.schedulerJobIds).size !== 80
    ) {
        throw new Error("Method-v2 phase-3 technical gate does not authorize unblinding");
    }
};

const winnerScore = (winner: unknown): number | null => winner === "candidate"
    ? 1
    : winner === "draw"
        ? 0.5
        : winner === "baseline"
            ? 0
            : null;

const readPhase3Blocks = (
    campaign: ResearchDevelopmentV2Campaign,
    resultsRoot: string,
    arrayJobId: string,
): DevelopmentV2Phase3Block[] => campaign.shards.map((shard) => {
    const resultDir = path.join(resultsRoot, `${arrayJobId}_${shard.shardIndex}`);
    const summary = validateSealedDevelopmentV2Summary(parseJson(path.join(resultDir, "summary.json")));
    if (!summary.complete || !summary.technicallyClean || summary.completed !== 4) {
        throw new Error(`Method-v2 phase-3 shard ${shard.shardIndex} is not technically clean`);
    }
    const outer = parseJson(path.join(resultDir, "manifest.json"));
    if (!isRecord(outer) || !isRecord(outer.plan)) {
        throw new Error(`Method-v2 phase-3 shard ${shard.shardIndex} manifest is malformed`);
    }
    const plan = parseResearchRunPlan(outer.plan);
    const expected = new Map(plan.episodes.map((episode) => [episode.episodeId, episode]));
    const events = fs.readFileSync(path.join(resultDir, "events.jsonl"), "utf8")
        .split("\n")
        .filter((line) => line.length > 0)
        .map((line) => JSON.parse(line) as unknown);
    const scoreRows = new Map<string, { score: number; wallTimeMs?: number }>();
    for (const rawEvent of events) {
        if (!isRecord(rawEvent) || rawEvent.event !== "episode_complete" || !isRecord(rawEvent.result)) {
            continue;
        }
        const result = rawEvent.result;
        const episodeId = result.episodeId;
        const episode = typeof episodeId === "string" ? expected.get(episodeId) : undefined;
        const score = typeof result.candidateScore === "number" ? result.candidateScore : Number.NaN;
        if (
            !episode ||
            result.familyId !== episode.familyId ||
            result.methodId !== episode.methodId ||
            result.policyId !== episode.policyId ||
            result.seedBlockIndex !== episode.seedBlockIndex ||
            result.requestedEngineSeed !== episode.requestedEngineSeed ||
            result.candidateSlot !== episode.candidateSlot ||
            winnerScore(result.winner) !== score
        ) {
            throw new Error(`Method-v2 phase-3 shard ${shard.shardIndex} completion outcome identity drifted`);
        }
        assertScore(score, `Method-v2 phase-3 shard ${shard.shardIndex} score`);
        const key = `${episode.methodId}|${episode.candidateSlot}`;
        if (scoreRows.has(key)) {
            throw new Error(`Method-v2 phase-3 shard ${shard.shardIndex} duplicates ${key}`);
        }
        const wallTimeMs = Number.isFinite(result.wallTimeMs) && (result.wallTimeMs as number) >= 0
            ? result.wallTimeMs as number
            : undefined;
        scoreRows.set(key, { score, wallTimeMs });
    }
    const get = (methodId: "default" | "champion", slot: 0 | 1): { score: number; wallTimeMs?: number } => {
        const row = scoreRows.get(`${methodId}|${slot}`);
        if (!row) {
            throw new Error(`Method-v2 phase-3 shard ${shard.shardIndex} lacks ${methodId} slot ${slot}`);
        }
        return row;
    };
    const defaultRows = [get("default", 0), get("default", 1)] as const;
    const championRows = [get("champion", 0), get("champion", 1)] as const;
    const defaultWallTimeMs = defaultRows.every(({ wallTimeMs }) => wallTimeMs !== undefined)
        ? [defaultRows[0].wallTimeMs as number, defaultRows[1].wallTimeMs as number] as [number, number]
        : undefined;
    const championWallTimeMs = championRows.every(({ wallTimeMs }) => wallTimeMs !== undefined)
        ? [championRows[0].wallTimeMs as number, championRows[1].wallTimeMs as number] as [number, number]
        : undefined;
    return {
        familyId: shard.familyId,
        seedBlockIndex: shard.seedBlockIndex,
        defaultScores: [defaultRows[0].score, defaultRows[1].score],
        championScores: [championRows[0].score, championRows[1].score],
        defaultWallTimeMs,
        championWallTimeMs,
    };
});

const main = (): void => {
    const campaignPath = requiredPath("CAMPAIGN");
    const resultsRoot = requiredPath("RESULTS_ROOT");
    const gatePath = requiredPath("TECHNICAL_GATE");
    const expectedGateSha256 = requiredSha256("TECHNICAL_GATE_SHA256");
    const outputPath = requiredPath("OUT_FILE");
    const arrayJobId = requiredArrayJobId();
    if (fs.existsSync(outputPath)) {
        throw new Error(`Refusing to overwrite method-v2 development unblinding ${outputPath}`);
    }
    const campaign = parsePhase3Campaign(campaignPath);
    const campaignSha256 = sha256File(campaignPath);
    validateTechnicalGate(
        parseJson(gatePath),
        gatePath,
        expectedGateSha256,
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
        throw new Error("Method-v2 unblinding requires the unchanged clean campaign source on main");
    }
    const analysis = analyzeDevelopmentV2Phase3(readPhase3Blocks(campaign, resultsRoot, arrayJobId));
    const output = {
        schemaVersion: RESEARCH_DEVELOPMENT_V2_UNBLINDING_SCHEMA_VERSION,
        status: analysis.status,
        generatedAt: new Date().toISOString(),
        unblindingCount: 1,
        sourceGitCommit: gitCommit,
        campaignPath,
        campaignSha256,
        technicalGatePath: gatePath,
        technicalGateSha256: expectedGateSha256,
        resultsRoot,
        resultArtifactCommitmentSha256: developmentV2ResultArtifactCommitmentSha256(campaign, resultsRoot, arrayJobId),
        arrayJobId,
        schedulerAccount: "pi_jss233",
        championArtifactPath: campaign.championArtifactPath,
        championArtifactSha256: campaign.championArtifactSha256,
        championPolicyId: campaign.championPolicyId,
        defaultPolicyId: campaign.defaultPolicyId,
        familyCount: 10,
        blockCount: 80,
        launchedGameCount: 320,
        analysis,
        confirmatoryEvaluationAuthorized: analysis.status === "PASSED_DEVELOPMENT_SIGNAL_GATE",
        interpretation: analysis.status === "PASSED_DEVELOPMENT_SIGNAL_GATE"
            ? "Development futility gate passed; this is not a confirmatory claim."
            : "Development futility gate failed; method v2 is retired without sealed-test access.",
    };
    fs.mkdirSync(path.dirname(outputPath), { recursive: true, mode: 0o700 });
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), { flag: "wx", mode: 0o600 });
    console.log(JSON.stringify({
        outputPath,
        outputSha256: sha256File(outputPath),
        status: output.status,
        improvementEstimate: analysis.improvement.estimate,
        improvementLowerBound: analysis.improvement.oneSidedLowerBound,
        championScore: analysis.championAbsolute.championScore,
        championMarginLowerBound: analysis.championAbsolute.oneSidedLowerBound,
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
