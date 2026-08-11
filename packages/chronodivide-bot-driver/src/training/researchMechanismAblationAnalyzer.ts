import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { ResearchMechanismAblationCampaign } from "./researchMechanismAblationPlanGenerator.js";
import { mechanismResultArtifactCommitmentSha256, validateMechanismCampaignStructure } from "./researchMechanismAblationTechnicalGate.js";
import { parseResearchRunPlan, sha256File } from "./researchPlanRunner.js";

export const RESEARCH_MECHANISM_ANALYSIS_SCHEMA_VERSION = 1 as const;
export const RESEARCH_MECHANISM_T_CRITICAL = 2.2621571627409915 as const;
export const RESEARCH_MECHANISM_METHOD_IDS = ["champion", "local0", "local1", "local2", "local3", "local4"] as const;
export type MechanismMethodId = typeof RESEARCH_MECHANISM_METHOD_IDS[number];
export type MechanismBlock = {
    familyId: string;
    seedBlockIndex: number;
    scores: Record<MechanismMethodId, [number, number]>;
    wallTimeMs?: Record<MechanismMethodId, [number, number]>;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null && !Array.isArray(value);
const mean = (values: number[]): number => values.reduce((sum, value) => sum + value, 0) / values.length;
const assertScore = (score: number, label: string): void => {
    if (score !== 0 && score !== 0.5 && score !== 1) throw new Error(`${label} must be 0, 0.5, or 1`);
};
const familyVariance = (values: number[], familyIds: string[]): number => {
    const center = mean(values), residualSums = new Map<string, number>();
    values.forEach((value, index) => residualSums.set(familyIds[index], (residualSums.get(familyIds[index]) ?? 0) + value - center));
    if (values.length !== 40 || residualSums.size !== 10) throw new Error("Mechanism family variance requires forty blocks and ten clusters");
    return (10 / 9) * [...residualSums.values()].reduce((sum, value) => sum + value ** 2, 0) / 40 ** 2;
};
const interval = (values: number[], familyIds: string[]) => {
    const estimate = mean(values), variance = familyVariance(values, familyIds);
    const varianceValid = Number.isFinite(variance) && variance > 0;
    const standardError = varianceValid ? Math.sqrt(variance) : null;
    return {
        estimate, variance, standardError, varianceValid, confidence: 0.95, alternative: "two-sided",
        degreesOfFreedom: 9, criticalValue: RESEARCH_MECHANISM_T_CRITICAL,
        confidenceInterval: {
            lower: standardError === null ? null : estimate - RESEARCH_MECHANISM_T_CRITICAL * standardError,
            upper: standardError === null ? null : estimate + RESEARCH_MECHANISM_T_CRITICAL * standardError,
        },
    };
};
const diagnostic = (scores: number[]) => ({
    score: mean(scores), candidateWins: scores.filter((score) => score === 1).length,
    draws: scores.filter((score) => score === 0.5).length, baselineWins: scores.filter((score) => score === 0).length,
});

export const analyzeMechanismBlocks = (blocks: MechanismBlock[]) => {
    if (blocks.length !== 40) throw new Error("Mechanism analysis requires exactly forty blocks");
    const families = [...new Set(blocks.map(({ familyId }) => familyId))].sort();
    if (families.length !== 10) throw new Error("Mechanism analysis requires exactly ten families");
    const keys = new Set<string>();
    for (const block of blocks) {
        const key = `${block.familyId}|${block.seedBlockIndex}`;
        if (keys.has(key)) throw new Error(`Duplicate mechanism block ${key}`);
        keys.add(key);
        if (Object.keys(block.scores).sort().join(",") !== [...RESEARCH_MECHANISM_METHOD_IDS].sort().join(",")) throw new Error(`${key} method set drifted`);
        for (const methodId of RESEARCH_MECHANISM_METHOD_IDS) block.scores[methodId].forEach((score, slot) => assertScore(score, `${key} ${methodId} slot ${slot}`));
    }
    for (const familyId of families) {
        const rows = blocks.filter((block) => block.familyId === familyId);
        if (rows.length !== 4 || new Set(rows.map(({ seedBlockIndex }) => seedBlockIndex)).size !== 4) throw new Error(`Mechanism family ${familyId} must have four unique blocks`);
    }
    const blockScore = (block: MechanismBlock, methodId: MechanismMethodId): number => mean(block.scores[methodId]);
    const familyIds = blocks.map(({ familyId }) => familyId);
    const mechanismValues = blocks.map((block) => blockScore(block, "champion") - mean(
        (["local0", "local1", "local2", "local3", "local4"] as MechanismMethodId[]).map((methodId) => blockScore(block, methodId)),
    ));
    const methods = Object.fromEntries(RESEARCH_MECHANISM_METHOD_IDS.map((methodId) => [methodId, diagnostic(blocks.flatMap((block) => block.scores[methodId]))]));
    const pairwise = (["local0", "local1", "local2", "local3", "local4"] as MechanismMethodId[]).map((methodId) => ({
        localMethodId: methodId,
        ...interval(blocks.map((block) => blockScore(block, "champion") - blockScore(block, methodId)), familyIds),
    }));
    const timing = Object.fromEntries(RESEARCH_MECHANISM_METHOD_IDS.map((methodId) => {
        const times = blocks.flatMap((block) => block.wallTimeMs?.[methodId] ?? []);
        return [methodId, { available: times.length === 80, meanWallTimeMs: times.length === 80 ? mean(times) : null }];
    }));
    return {
        status: "COMPLETE_POST_CONFIRMATORY_DIAGNOSTIC_NO_SELECTION",
        mechanismContrast: {
            estimand: "championship champion minus equal average of five independently selected optimizer-run policies",
            familyCount: 10, blocksPerFamily: 4, blockCount: 40,
            ...interval(mechanismValues, familyIds),
        },
        methods,
        pairwiseChampionMinusLocal: pairwise,
        familyDiagnostics: families.map((familyId) => {
            const rows = blocks.filter((block) => block.familyId === familyId);
            const methodScores = Object.fromEntries(RESEARCH_MECHANISM_METHOD_IDS.map((methodId) => [methodId, mean(rows.map((block) => blockScore(block, methodId))) ]));
            return {
                familyId, blockCount: 4, methodScores,
                mechanismContrast: mean(rows.map((block) => blockScore(block, "champion") - mean(
                    (["local0", "local1", "local2", "local3", "local4"] as MechanismMethodId[]).map((methodId) => blockScore(block, methodId)),
                ))),
            };
        }),
        timingDiagnostics: timing,
        interpretation: "Post-confirmatory development-family mechanism diagnostic; cannot replace or rescue the frozen confirmatory result.",
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
const winnerScore = (winner: unknown): number | null => winner === "candidate" ? 1 : winner === "draw" ? 0.5 : winner === "baseline" ? 0 : null;

const validateGate = (
    value: unknown, gatePath: string, gateSha: string, campaign: ResearchMechanismAblationCampaign,
    campaignPath: string, campaignSha: string, resultsRoot: string, arrayJobId: string,
): void => {
    if (
        sha256File(gatePath) !== gateSha || !isRecord(value) || value.schemaVersion !== 1 ||
        value.status !== "PASSED_TECHNICAL_ONLY_NO_OUTCOMES_INSPECTED" || value.authorizedNextPhase !== "mechanism-analysis" ||
        value.schedulerAccount !== "pi_jss233" || value.campaignPath !== campaignPath || value.campaignSha256 !== campaignSha ||
        value.campaignSourceGitCommit !== campaign.sourceGitCommit || value.gateSourceGitCommit !== campaign.sourceGitCommit ||
        value.resultsRoot !== resultsRoot || value.arrayJobId !== arrayJobId || value.shardCount !== 40 ||
        value.requestedLaunches !== 480 || value.accountedLaunches !== 480 || value.completedLaunches !== 480 ||
        value.technicalFailures !== 0 || value.sealedSummaryViolations !== 0 ||
        value.resultArtifactCommitmentSha256 !== mechanismResultArtifactCommitmentSha256(campaign, resultsRoot, arrayJobId) ||
        !Array.isArray(value.schedulerJobIds) || value.schedulerJobIds.length !== 40 || new Set(value.schedulerJobIds).size !== 40 ||
        !Array.isArray(value.outcomeFieldsEmitted) || value.outcomeFieldsEmitted.length !== 0
    ) throw new Error("Technical gate does not authorize mechanism analysis");
};

const readBlocks = (campaign: ResearchMechanismAblationCampaign, resultsRoot: string, arrayJobId: string): MechanismBlock[] => campaign.shards.map((shard) => {
    const resultDir = path.join(resultsRoot, `${arrayJobId}_${shard.shardIndex}`);
    const outer = parseJson(path.join(resultDir, "manifest.json"));
    if (!isRecord(outer) || !isRecord(outer.plan)) throw new Error(`Mechanism shard ${shard.shardIndex} manifest is malformed`);
    const plan = parseResearchRunPlan(outer.plan), expected = new Map(plan.episodes.map((episode) => [episode.episodeId, episode]));
    const events = fs.readFileSync(path.join(resultDir, "events.jsonl"), "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line) as unknown);
    const rows = new Map<string, { score: number; wallTimeMs?: number }>();
    for (const event of events) {
        if (!isRecord(event) || event.event !== "episode_complete" || !isRecord(event.result)) continue;
        const result = event.result, episode = typeof result.episodeId === "string" ? expected.get(result.episodeId) : undefined;
        const score = typeof result.candidateScore === "number" ? result.candidateScore : Number.NaN;
        if (
            !episode || result.familyId !== episode.familyId || result.methodId !== episode.methodId || result.policyId !== episode.policyId ||
            result.seedBlockIndex !== episode.seedBlockIndex || result.requestedEngineSeed !== episode.requestedEngineSeed ||
            result.candidateSlot !== episode.candidateSlot || winnerScore(result.winner) !== score
        ) throw new Error(`Mechanism shard ${shard.shardIndex} outcome identity drifted`);
        assertScore(score, `Mechanism shard ${shard.shardIndex} score`);
        const key = `${episode.methodId}|${episode.candidateSlot}`;
        if (rows.has(key)) throw new Error(`Mechanism shard ${shard.shardIndex} duplicates ${key}`);
        rows.set(key, { score, wallTimeMs: typeof result.wallTimeMs === "number" && result.wallTimeMs >= 0 ? result.wallTimeMs : undefined });
    }
    const scores = {} as Record<MechanismMethodId, [number, number]>;
    const wallTimeMs = {} as Record<MechanismMethodId, [number, number]>;
    for (const methodId of RESEARCH_MECHANISM_METHOD_IDS) {
        const first = rows.get(`${methodId}|0`), second = rows.get(`${methodId}|1`);
        if (!first || !second) throw new Error(`Mechanism shard ${shard.shardIndex} lacks ${methodId}`);
        scores[methodId] = [first.score, second.score];
        if (first.wallTimeMs !== undefined && second.wallTimeMs !== undefined) wallTimeMs[methodId] = [first.wallTimeMs, second.wallTimeMs];
    }
    return { familyId: shard.familyId, seedBlockIndex: shard.seedBlockIndex, scores, wallTimeMs };
});

const main = (): void => {
    const campaignPath = requiredPath("CAMPAIGN"), resultsRoot = requiredPath("RESULTS_ROOT"), gatePath = requiredPath("TECHNICAL_GATE");
    const gateSha = requiredSha("TECHNICAL_GATE_SHA256"), outputPath = requiredPath("OUT_FILE"), arrayJobId = requiredArrayJobId();
    if (fs.existsSync(outputPath)) throw new Error(`Refusing to overwrite mechanism analysis ${outputPath}`);
    const campaign = validateMechanismCampaignStructure(parseJson(campaignPath)), campaignSha = sha256File(campaignPath);
    validateGate(parseJson(gatePath), gatePath, gateSha, campaign, campaignPath, campaignSha, resultsRoot, arrayJobId);
    const gitCommit = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
    const branch = execFileSync("git", ["branch", "--show-current"], { encoding: "utf8" }).trim();
    const dirty = execFileSync("git", ["status", "--short", "--untracked-files=no"], { encoding: "utf8" }).trim();
    if (branch !== "main" || dirty || gitCommit !== campaign.sourceGitCommit) throw new Error("Mechanism analysis requires unchanged clean campaign source");
    const analysis = analyzeMechanismBlocks(readBlocks(campaign, resultsRoot, arrayJobId));
    const output = {
        schemaVersion: 1, status: analysis.status, generatedAt: new Date().toISOString(), analysisCount: 1,
        sourceGitCommit: gitCommit, campaignPath, campaignSha256: campaignSha, technicalGatePath: gatePath, technicalGateSha256: gateSha,
        resultsRoot, resultArtifactCommitmentSha256: mechanismResultArtifactCommitmentSha256(campaign, resultsRoot, arrayJobId),
        arrayJobId, schedulerAccount: "pi_jss233", familyCount: 10, blockCount: 40, launchedGameCount: 480,
        postConfirmatory: true, confirmatoryClaimRescueAuthorized: false, analysis,
    };
    fs.mkdirSync(path.dirname(outputPath), { recursive: true, mode: 0o700 });
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), { flag: "wx", mode: 0o600 });
    console.log(JSON.stringify({
        outputPath, outputSha256: sha256File(outputPath), status: output.status,
        mechanismEstimate: analysis.mechanismContrast.estimate,
        mechanismInterval: analysis.mechanismContrast.confidenceInterval,
        championScore: (analysis.methods.champion as { score: number }).score,
        confirmatoryClaimRescueAuthorized: false,
    }));
};

const invokedModuleUrl = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (import.meta.url === invokedModuleUrl) try { main(); } catch (error) { console.error(error); process.exitCode = 1; }
