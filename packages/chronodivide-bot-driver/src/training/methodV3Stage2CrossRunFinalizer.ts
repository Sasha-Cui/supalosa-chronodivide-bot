import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { loadMethodV3Stage2Results } from "./methodV3Stage2ResultLoader.js";
import { ResearchPlanPolicy, sha256File } from "./researchPlanRunner.js";
import {
    MethodV3Stage2OutcomeRecord,
    MethodV3Stage2RankingRow,
    rankMethodV3Stage2OutcomeRecords,
} from "./methodV3Stage2Reducer.js";
import { validateMethodV3Stage2Campaign } from "./methodV3Stage2TechnicalGate.js";
import { parseResearchPolicy, researchPolicySha256 } from "./researchPolicy.js";

type RunFinalizer = {
    optimizerRunIndex: number;
    sourcePath: string;
    sourceSha256: string;
    finalists: ResearchPlanPolicy[];
    ranking: MethodV3Stage2RankingRow[];
    finalistResults: MethodV3Stage2OutcomeRecord[];
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null && !Array.isArray(value);

const requiredPath = (name: string): string => {
    const value = process.env[name];
    if (!value) throw new Error(`${name} is required`);
    return path.resolve(value);
};

const compareRows = (left: MethodV3Stage2RankingRow, right: MethodV3Stage2RankingRow): number =>
    right.actualWinProbability - left.actualWinProbability ||
    right.winMinusLossProbability - left.winMinusLossProbability ||
    right.worstDecileActualWinProbability - left.worstDecileActualWinProbability ||
    right.drawConversion - left.drawConversion ||
    left.drawProbability - right.drawProbability ||
    (left.medianActualWinTick ?? Number.POSITIVE_INFINITY) -
        (right.medianActualWinTick ?? Number.POSITIVE_INFINITY) ||
    left.policyId.localeCompare(right.policyId);

export const analyzeMethodV3DevelopmentFinalists = (runs: RunFinalizer[]): {
    developmentFinalists: ResearchPlanPolicy[];
    aggregateRanking: MethodV3Stage2RankingRow[];
} => {
    if (runs.length !== 5 || runs.map(({ optimizerRunIndex }) => optimizerRunIndex).sort().join(",") !== "0,1,2,3,4") {
        throw new Error("Cross-run selection requires exactly optimizer runs 0 through 4");
    }
    const policies = new Map<string, ResearchPlanPolicy>();
    const accumulatedResults: MethodV3Stage2OutcomeRecord[] = [];
    const runWinners: string[] = [];
    for (const run of runs) {
        if (run.finalists.length !== 3 || run.ranking.length !== 3) {
            throw new Error(`Run ${run.optimizerRunIndex} must contain exactly three fully evaluated finalists`);
        }
        if (run.finalistResults.length !== 1_188) {
            throw new Error(`Run ${run.optimizerRunIndex} must expose all 1,188 finalist result records`);
        }
        for (const finalist of run.finalists) {
            const policy = parseResearchPolicy(finalist.policy);
            if (researchPolicySha256(policy) !== finalist.policyId) {
                throw new Error(`Run ${run.optimizerRunIndex} finalist hash drifted`);
            }
            policies.set(finalist.policyId, { policyId: finalist.policyId, policy });
        }
        for (const row of run.ranking) {
            if (!policies.has(row.policyId)) throw new Error(`Run ${run.optimizerRunIndex} ranked a non-finalist`);
        }
        const recomputedRanking = rankMethodV3Stage2OutcomeRecords(run.finalists, run.finalistResults);
        if (JSON.stringify(recomputedRanking) !== JSON.stringify(run.ranking)) {
            throw new Error(`Run ${run.optimizerRunIndex} ranking does not match its committed finalist results`);
        }
        runWinners.push(recomputedRanking[0].policyId);
        accumulatedResults.push(...run.finalistResults.map((result) => ({
            ...result,
            blockId: `optimizer-run-${run.optimizerRunIndex}`,
        })));
    }
    const aggregateRanking = rankMethodV3Stage2OutcomeRecords([...policies.values()], accumulatedResults);
    const aggregateRows = new Map(aggregateRanking.map((row) => [row.policyId, row]));
    const selectedIds: string[] = [];
    for (const policyId of runWinners) {
        if (!selectedIds.includes(policyId)) selectedIds.push(policyId);
    }
    if (selectedIds.length > 5) {
        selectedIds.sort((left, right) => compareRows(aggregateRows.get(left)!, aggregateRows.get(right)!));
        selectedIds.splice(5);
    }
    const remaining = [...policies.keys()]
        .filter((policyId) => !selectedIds.includes(policyId))
        .sort((left, right) => compareRows(aggregateRows.get(left)!, aggregateRows.get(right)!));
    while (selectedIds.length < 5 && remaining.length > 0) selectedIds.push(remaining.shift() as string);
    if (selectedIds.length === 0) throw new Error("Cross-run selection produced no development finalist");
    return {
        developmentFinalists: selectedIds.map((policyId) => policies.get(policyId) as ResearchPlanPolicy),
        aggregateRanking,
    };
};

export const selectMethodV3DevelopmentFinalists = (runs: RunFinalizer[]): ResearchPlanPolicy[] =>
    analyzeMethodV3DevelopmentFinalists(runs).developmentFinalists;

const main = (): void => {
    const listPath = requiredPath("RUN_FINALIZER_LIST");
    const outputPath = requiredPath("OUT_FILE");
    if (fs.existsSync(outputPath)) throw new Error(`Refusing to overwrite cross-run finalizer ${outputPath}`);
    const finalizerPaths = fs.readFileSync(listPath, "utf8").split(/\r?\n/).filter(Boolean).map((value) => path.resolve(value));
    if (finalizerPaths.length !== 5) throw new Error("RUN_FINALIZER_LIST must contain exactly five paths");
    const runs: RunFinalizer[] = finalizerPaths.map((sourcePath) => {
        const value = JSON.parse(fs.readFileSync(sourcePath, "utf8")) as unknown;
        if (
            !isRecord(value) ||
            value.schemaVersion !== 1 ||
            value.status !== "FINALIZED_METHOD_V3_STAGE2_OPEN_TRAINING_RUN_NOT_A_PAPER_CLAIM" ||
            !Number.isSafeInteger(value.optimizerRunIndex) ||
            value.schedulerAccount !== "pi_jss233" ||
            value.familyCount !== 22 ||
            value.countryCount !== 9 ||
            value.launchedGameCount !== 1_188 ||
            value.completedGameCount !== 1_188 ||
            value.technicalFailureCount !== 0 ||
            !Array.isArray(value.finalists) ||
            value.finalists.length !== 3 ||
            !Array.isArray(value.ranking) ||
            value.ranking.length !== 3 ||
            !Array.isArray(value.finalistResults) ||
            value.finalistResults.length !== 1_188 ||
            typeof value.sourceCampaignPath !== "string" ||
            value.sourceCampaignSha256 !== sha256File(path.resolve(value.sourceCampaignPath)) ||
            typeof value.technicalGatePath !== "string" ||
            value.technicalGateSha256 !== sha256File(path.resolve(value.technicalGatePath)) ||
            typeof value.sourceResultsRoot !== "string" ||
            (typeof value.arrayJobId !== "string" && typeof value.arrayJobId !== "number") ||
            typeof value.resultsCommitmentSha256 !== "string"
        ) {
            throw new Error(`Run finalizer ${sourcePath} is incomplete or malformed`);
        }
        const campaignPath = path.resolve(value.sourceCampaignPath as string);
        const gatePath = path.resolve(value.technicalGatePath as string);
        const resultsRoot = path.resolve(value.sourceResultsRoot as string);
        const arrayJobId = String(value.arrayJobId);
        const campaign = validateMethodV3Stage2Campaign(JSON.parse(fs.readFileSync(campaignPath, "utf8")));
        if (campaign.stage !== 2 || campaign.optimizerRunIndex !== value.optimizerRunIndex) {
            throw new Error(`Run finalizer ${sourcePath} does not identify its Stage-2 campaign`);
        }
        const rawResults = loadMethodV3Stage2Results(
            campaign,
            campaignPath,
            gatePath,
            resultsRoot,
            arrayJobId,
            "method-v3-stage2-run-finalization",
        );
        const normalizedResults = rawResults.map((result) => ({
            episodeId: result.episodeId,
            familyId: result.familyId,
            candidateCountry: result.candidateCountry,
            policyId: result.policyId,
            candidateSlot: result.candidateSlot,
            winner: result.winner,
            ticks: result.ticks,
            candidateBuildings: result.candidate.buildings,
            baselineBuildings: result.baseline.buildings,
        })).sort((left, right) => left.episodeId.localeCompare(right.episodeId));
        const resultsCommitmentSha256 = crypto
            .createHash("sha256")
            .update(JSON.stringify(normalizedResults))
            .digest("hex");
        const finalistIds = new Set((value.finalists as ResearchPlanPolicy[]).map(({ policyId }) => policyId));
        const expectedFinalistResults = normalizedResults
            .filter(({ policyId }) => finalistIds.has(policyId))
            .map(({ episodeId: _episodeId, candidateBuildings: _candidateBuildings, ...result }) => result);
        if (
            resultsCommitmentSha256 !== value.resultsCommitmentSha256 ||
            JSON.stringify(expectedFinalistResults) !== JSON.stringify(value.finalistResults)
        ) {
            throw new Error(`Run finalizer ${sourcePath} differs from its gated raw result population`);
        }
        return {
            optimizerRunIndex: value.optimizerRunIndex as number,
            sourcePath,
            sourceSha256: sha256File(sourcePath),
            finalists: value.finalists as ResearchPlanPolicy[],
            ranking: value.ranking as MethodV3Stage2RankingRow[],
            finalistResults: value.finalistResults as MethodV3Stage2OutcomeRecord[],
        };
    });
    const { developmentFinalists, aggregateRanking } = analyzeMethodV3DevelopmentFinalists(runs);
    const output = {
        schemaVersion: 1,
        status: "FROZEN_METHOD_V3_DEVELOPMENT_FINALISTS_FROM_OPEN_TRAINING",
        generatedAt: new Date().toISOString(),
        sourceRunFinalizers: runs.map(({ optimizerRunIndex, sourcePath, sourceSha256 }) => ({
            optimizerRunIndex,
            sourcePath,
            sourceSha256,
        })),
        runFinalistUnionCount: new Set(runs.flatMap(({ finalists }) => finalists.map(({ policyId }) => policyId))).size,
        selectedCount: developmentFinalists.length,
        developmentFinalists,
        aggregateRanking,
        outcomeAccess: "open-training-only-no-paper-claim",
        authorizedNextPhase: "fresh-development-technical-and-statistical-gates",
    };
    fs.mkdirSync(path.dirname(outputPath), { recursive: true, mode: 0o700 });
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), { flag: "wx", mode: 0o600 });
    console.log(JSON.stringify({
        outputPath,
        outputSha256: sha256File(outputPath),
        selectedCount: output.selectedCount,
        selectedPolicyIds: developmentFinalists.map(({ policyId }) => policyId),
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
