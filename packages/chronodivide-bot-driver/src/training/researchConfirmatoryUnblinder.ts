import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { ResearchConfirmatoryCampaign } from "./researchConfirmatoryPlanGenerator.js";
import { confirmatoryResultArtifactCommitmentSha256 } from "./researchConfirmatoryTechnicalGate.js";
import { parseResearchRunPlan, sha256File } from "./researchPlanRunner.js";

export const RESEARCH_CONFIRMATORY_UNBLINDING_SCHEMA_VERSION = 1 as const;
export const RESEARCH_CONFIRMATORY_TWO_SIDED_CRITICAL = 2.131449545559323 as const;
export const RESEARCH_CONFIRMATORY_ONE_SIDED_CRITICAL = 1.7530503556925547 as const;

export type ConfirmatoryBlock = {
    familyId: string;
    seedBlockIndex: number;
    defaultScores: [number, number];
    championScores: [number, number];
    defaultWallTimeMs?: [number, number];
    championWallTimeMs?: [number, number];
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null && !Array.isArray(value);
const mean = (values: number[]): number => values.reduce((sum, value) => sum + value, 0) / values.length;
const assertScore = (score: number, label: string): void => {
    if (score !== 0 && score !== 0.5 && score !== 1) throw new Error(`${label} must be 0, 0.5, or 1`);
};
const diagnostic = (scores: number[]) => ({
    score: mean(scores),
    candidateWins: scores.filter((score) => score === 1).length,
    draws: scores.filter((score) => score === 0.5).length,
    baselineWins: scores.filter((score) => score === 0).length,
});

const familyVariance = (values: number[], familyIds: string[]): number => {
    const center = mean(values);
    const residualSums = new Map<string, number>();
    values.forEach((value, index) => residualSums.set(
        familyIds[index],
        (residualSums.get(familyIds[index]) ?? 0) + value - center,
    ));
    if (values.length !== 128 || residualSums.size !== 16) throw new Error("Confirmatory family variance requires 128 blocks and 16 clusters");
    return (16 / 15) * [...residualSums.values()].reduce((sum, value) => sum + value ** 2, 0) / 128 ** 2;
};

export const analyzeConfirmatoryBlocks = (blocks: ConfirmatoryBlock[]) => {
    if (blocks.length !== 128) throw new Error("Confirmatory analysis requires exactly 128 blocks");
    const families = [...new Set(blocks.map(({ familyId }) => familyId))].sort();
    if (families.length !== 16) throw new Error("Confirmatory analysis requires exactly sixteen families");
    const keys = new Set<string>();
    for (const block of blocks) {
        const key = `${block.familyId}|${block.seedBlockIndex}`;
        if (keys.has(key)) throw new Error(`Duplicate confirmatory block ${key}`);
        keys.add(key);
        block.defaultScores.forEach((score, slot) => assertScore(score, `${key} default slot ${slot}`));
        block.championScores.forEach((score, slot) => assertScore(score, `${key} champion slot ${slot}`));
    }
    for (const familyId of families) {
        const rows = blocks.filter((block) => block.familyId === familyId);
        if (rows.length !== 8 || new Set(rows.map(({ seedBlockIndex }) => seedBlockIndex)).size !== 8) {
            throw new Error(`Confirmatory family ${familyId} must have eight unique blocks`);
        }
    }
    const familyIds = blocks.map(({ familyId }) => familyId);
    const improvements = blocks.map((block) => mean(block.championScores.map((score, slot) => score - block.defaultScores[slot])));
    const championBlocks = blocks.map((block) => mean(block.championScores));
    const improvementEstimate = mean(improvements);
    const improvementVariance = familyVariance(improvements, familyIds);
    const improvementValid = Number.isFinite(improvementVariance) && improvementVariance > 0;
    const improvementSe = improvementValid ? Math.sqrt(improvementVariance) : null;
    const improvementLower = improvementSe === null ? null : improvementEstimate - RESEARCH_CONFIRMATORY_TWO_SIDED_CRITICAL * improvementSe;
    const improvementUpper = improvementSe === null ? null : improvementEstimate + RESEARCH_CONFIRMATORY_TWO_SIDED_CRITICAL * improvementSe;
    const championScore = mean(championBlocks);
    const championMargin = championScore - 0.5;
    const championVariance = familyVariance(championBlocks, familyIds);
    const championValid = Number.isFinite(championVariance) && championVariance > 0;
    const championSe = championValid ? Math.sqrt(championVariance) : null;
    const championLower = championSe === null ? null : championMargin - RESEARCH_CONFIRMATORY_ONE_SIDED_CRITICAL * championSe;
    const improvementPassed = improvementLower !== null && improvementLower > 0;
    const championPassed = championLower !== null && championLower > 0;
    const defaultScores = blocks.flatMap(({ defaultScores: scores }) => scores);
    const championScores = blocks.flatMap(({ championScores: scores }) => scores);
    const defaultTimes = blocks.flatMap(({ defaultWallTimeMs }) => defaultWallTimeMs ?? []);
    const championTimes = blocks.flatMap(({ championWallTimeMs }) => championWallTimeMs ?? []);
    const timingAvailable = defaultTimes.length === 256 && championTimes.length === 256;
    return {
        status: improvementPassed && championPassed ? "PASSED_CONFIRMATORY_SUCCESS_GATE" : "FAILED_CONFIRMATORY_SUCCESS_GATE",
        improvement: {
            estimand: "equally-family-weighted champion-minus-default score difference",
            familyCount: 16, blocksPerFamily: 8, blockCount: 128,
            estimate: improvementEstimate, variance: improvementVariance, standardError: improvementSe,
            confidence: 0.95, alternative: "two-sided", degreesOfFreedom: 15,
            criticalValue: RESEARCH_CONFIRMATORY_TWO_SIDED_CRITICAL,
            confidenceInterval: { lower: improvementLower, upper: improvementUpper },
            varianceValid: improvementValid, passed: improvementPassed,
        },
        championAbsolute: {
            estimand: "equally-family-weighted champion score minus 0.5",
            familyCount: 16, blocksPerFamily: 8, blockCount: 128,
            championScore, referenceScore: 0.5, estimate: championMargin,
            variance: championVariance, standardError: championSe,
            confidence: 0.95, alternative: "greater", degreesOfFreedom: 15,
            criticalValue: RESEARCH_CONFIRMATORY_ONE_SIDED_CRITICAL,
            oneSidedLowerBound: championLower,
            varianceValid: championValid, passed: championPassed,
        },
        methods: { default: diagnostic(defaultScores), champion: diagnostic(championScores) },
        familyDiagnostics: families.map((familyId) => {
            const rows = blocks.filter((block) => block.familyId === familyId);
            return {
                familyId,
                improvement: mean(rows.map((block) => mean(block.championScores.map((score, slot) => score - block.defaultScores[slot])))),
                defaultScore: mean(rows.flatMap(({ defaultScores: scores }) => scores)),
                championScore: mean(rows.flatMap(({ championScores: scores }) => scores)),
                blockCount: 8,
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
    const value = process.env[name]; if (!value) throw new Error(`${name} is required`); return path.resolve(value);
};
const requiredSha = (name: string): string => {
    const value = process.env[name]; if (!value || !/^[0-9a-f]{64}$/.test(value)) throw new Error(`${name} must be SHA-256`); return value;
};
const requiredArrayJobId = (): string => {
    const value = process.env.ARRAY_JOB_ID; if (!value || !/^\d+$/.test(value)) throw new Error("ARRAY_JOB_ID must be numeric"); return value;
};

const parseCampaign = (campaignPath: string): ResearchConfirmatoryCampaign => {
    const value = parseJson(campaignPath);
    if (!isRecord(value) || value.schemaVersion !== 1 || value.kind !== "method-v2-confirmatory" || value.shardCount !== 128 || value.launchedGameCount !== 512 || !Array.isArray(value.shards) || value.shards.length !== 128) {
        throw new Error("Unblinding requires the exact confirmatory campaign");
    }
    return value as unknown as ResearchConfirmatoryCampaign;
};

const validateGate = (
    value: unknown, gatePath: string, gateSha: string, campaign: ResearchConfirmatoryCampaign,
    campaignPath: string, campaignSha: string, resultsRoot: string, arrayJobId: string,
): void => {
    if (
        sha256File(gatePath) !== gateSha || !isRecord(value) || value.schemaVersion !== 1 ||
        value.status !== "PASSED_TECHNICAL_ONLY_NO_OUTCOMES_INSPECTED" || value.authorizedNextPhase !== "confirmatory-unblinding" ||
        value.schedulerAccount !== "pi_jss233" || value.campaignPath !== campaignPath || value.campaignSha256 !== campaignSha ||
        value.campaignSourceGitCommit !== campaign.sourceGitCommit || value.gateSourceGitCommit !== campaign.sourceGitCommit ||
        value.resultsRoot !== resultsRoot || value.arrayJobId !== arrayJobId || value.shardCount !== 128 ||
        value.requestedLaunches !== 512 || value.accountedLaunches !== 512 || value.completedLaunches !== 512 ||
        value.technicalFailures !== 0 || value.sealedSummaryViolations !== 0 ||
        value.resultArtifactCommitmentSha256 !== confirmatoryResultArtifactCommitmentSha256(campaign, resultsRoot, arrayJobId) ||
        !Array.isArray(value.schedulerJobIds) || value.schedulerJobIds.length !== 128 || new Set(value.schedulerJobIds).size !== 128 ||
        !Array.isArray(value.outcomeFieldsEmitted) || value.outcomeFieldsEmitted.length !== 0
    ) throw new Error("Technical gate does not authorize confirmatory unblinding");
};

const winnerScore = (winner: unknown): number | null => winner === "candidate" ? 1 : winner === "draw" ? 0.5 : winner === "baseline" ? 0 : null;

const readBlocks = (campaign: ResearchConfirmatoryCampaign, resultsRoot: string, arrayJobId: string): ConfirmatoryBlock[] => campaign.shards.map((shard) => {
    const resultDir = path.join(resultsRoot, `${arrayJobId}_${shard.shardIndex}`);
    const outer = parseJson(path.join(resultDir, "manifest.json"));
    if (!isRecord(outer) || !isRecord(outer.plan)) throw new Error(`Confirmatory shard ${shard.shardIndex} manifest is malformed`);
    const plan = parseResearchRunPlan(outer.plan);
    const expected = new Map(plan.episodes.map((episode) => [episode.episodeId, episode]));
    const events = fs.readFileSync(path.join(resultDir, "events.jsonl"), "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line) as unknown);
    const rows = new Map<string, { score: number; wallTimeMs?: number }>();
    for (const event of events) {
        if (!isRecord(event) || event.event !== "episode_complete" || !isRecord(event.result)) continue;
        const result = event.result;
        const episode = typeof result.episodeId === "string" ? expected.get(result.episodeId) : undefined;
        const score = typeof result.candidateScore === "number" ? result.candidateScore : Number.NaN;
        if (
            !episode || result.familyId !== episode.familyId || result.methodId !== episode.methodId || result.policyId !== episode.policyId ||
            result.seedBlockIndex !== episode.seedBlockIndex || result.requestedEngineSeed !== episode.requestedEngineSeed ||
            result.candidateSlot !== episode.candidateSlot || winnerScore(result.winner) !== score
        ) throw new Error(`Confirmatory shard ${shard.shardIndex} outcome identity drifted`);
        assertScore(score, `Confirmatory shard ${shard.shardIndex} score`);
        const key = `${episode.methodId}|${episode.candidateSlot}`;
        if (rows.has(key)) throw new Error(`Confirmatory shard ${shard.shardIndex} duplicates ${key}`);
        rows.set(key, { score, wallTimeMs: typeof result.wallTimeMs === "number" && result.wallTimeMs >= 0 ? result.wallTimeMs : undefined });
    }
    const get = (method: "default" | "champion", slot: 0 | 1) => {
        const row = rows.get(`${method}|${slot}`); if (!row) throw new Error(`Confirmatory shard ${shard.shardIndex} lacks ${method}|${slot}`); return row;
    };
    const d0 = get("default", 0), d1 = get("default", 1), c0 = get("champion", 0), c1 = get("champion", 1);
    return {
        familyId: shard.familyId, seedBlockIndex: shard.seedBlockIndex,
        defaultScores: [d0.score, d1.score], championScores: [c0.score, c1.score],
        defaultWallTimeMs: d0.wallTimeMs !== undefined && d1.wallTimeMs !== undefined ? [d0.wallTimeMs, d1.wallTimeMs] : undefined,
        championWallTimeMs: c0.wallTimeMs !== undefined && c1.wallTimeMs !== undefined ? [c0.wallTimeMs, c1.wallTimeMs] : undefined,
    };
});

const main = (): void => {
    const campaignPath = requiredPath("CAMPAIGN"), resultsRoot = requiredPath("RESULTS_ROOT");
    const gatePath = requiredPath("TECHNICAL_GATE"), gateSha = requiredSha("TECHNICAL_GATE_SHA256");
    const outputPath = requiredPath("OUT_FILE"), arrayJobId = requiredArrayJobId();
    if (fs.existsSync(outputPath)) throw new Error(`Refusing to overwrite confirmatory unblinding ${outputPath}`);
    const campaign = parseCampaign(campaignPath), campaignSha = sha256File(campaignPath);
    validateGate(parseJson(gatePath), gatePath, gateSha, campaign, campaignPath, campaignSha, resultsRoot, arrayJobId);
    const gitCommit = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
    const branch = execFileSync("git", ["branch", "--show-current"], { encoding: "utf8" }).trim();
    const dirty = execFileSync("git", ["status", "--short", "--untracked-files=no"], { encoding: "utf8" }).trim();
    if (branch !== "main" || dirty || gitCommit !== campaign.sourceGitCommit) throw new Error("Unblinding requires unchanged clean campaign source");
    const analysis = analyzeConfirmatoryBlocks(readBlocks(campaign, resultsRoot, arrayJobId));
    const output = {
        schemaVersion: RESEARCH_CONFIRMATORY_UNBLINDING_SCHEMA_VERSION, status: analysis.status,
        generatedAt: new Date().toISOString(), unblindingCount: 1, sourceGitCommit: gitCommit,
        campaignPath, campaignSha256: campaignSha, technicalGatePath: gatePath, technicalGateSha256: gateSha,
        resultsRoot, resultArtifactCommitmentSha256: confirmatoryResultArtifactCommitmentSha256(campaign, resultsRoot, arrayJobId),
        arrayJobId, schedulerAccount: "pi_jss233", familyCount: 16, blockCount: 128, launchedGameCount: 512,
        championArtifactSha256: campaign.championArtifactSha256, championPolicyId: campaign.championPolicyId,
        defaultPolicyId: campaign.defaultPolicyId, analysis,
        paperPositiveClaimSupported: analysis.status === "PASSED_CONFIRMATORY_SUCCESS_GATE",
        interpretation: "Complete prespecified confirmatory result; report regardless of direction.",
    };
    fs.mkdirSync(path.dirname(outputPath), { recursive: true, mode: 0o700 });
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), { flag: "wx", mode: 0o600 });
    console.log(JSON.stringify({
        outputPath, outputSha256: sha256File(outputPath), status: output.status,
        improvementEstimate: analysis.improvement.estimate,
        improvementInterval: analysis.improvement.confidenceInterval,
        championScore: analysis.championAbsolute.championScore,
        championLowerBound: analysis.championAbsolute.oneSidedLowerBound,
        paperPositiveClaimSupported: output.paperPositiveClaimSupported,
    }));
};

const invokedModuleUrl = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (import.meta.url === invokedModuleUrl) try { main(); } catch (error) { console.error(error); process.exitCode = 1; }
