import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
    METHOD_V3_STAGE1_LAUNCH_COUNT,
    MethodV3MechanismCampaign,
} from "./methodV3MechanismPlanGenerator.js";
import { MethodV3MechanismArmId } from "./methodV3MechanismPolicies.js";
import {
    methodV3ResultArtifactCommitmentSha256,
    validateMethodV3ActualWin,
    validateMethodV3MechanismCampaign,
} from "./methodV3MechanismTechnicalGate.js";
import { sha256File } from "./researchPlanRunner.js";


type ResultRecord = Record<string, unknown> & {
    familyId: string;
    policyId: string;
    seedBlockIndex: number;
    requestedEngineSeed: number;
    candidateSlot: 0 | 1;
    candidateCountry: string;
    baselineCountry: string;
    winner: "candidate" | "baseline" | "draw";
    ticks: number;
};

export type MethodV3MechanismRankingRow = {
    rank: number;
    armId: MethodV3MechanismArmId;
    policyId: string;
    familyCountryCellCount: number;
    gameCount: number;
    wins: number;
    draws: number;
    losses: number;
    equalFamilyCountryWinProbability: number;
    equalFamilyCountryWinMinusLossMargin: number;
    worstDecileMeanFamilyCountryWinProbability: number;
    equalFamilyCountryDrawProbability: number;
    medianActualWinTick: number | null;
    countryBreakdown: Array<{
        country: string;
        games: number;
        wins: number;
        draws: number;
        losses: number;
        winProbability: number;
    }>;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null && !Array.isArray(value);

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

const mean = (values: number[]): number => values.reduce((total, value) => total + value, 0) / values.length;

const median = (values: number[]): number | null => {
    if (values.length === 0) return null;
    const ordered = [...values].sort((left, right) => left - right);
    const middle = Math.floor(ordered.length / 2);
    return ordered.length % 2 === 1 ? ordered[middle] : (ordered[middle - 1] + ordered[middle]) / 2;
};

const expectedResultKey = (
    familyId: string,
    country: string,
    seedBlockIndex: number,
    policyId: string,
    candidateSlot: number,
): string => `${familyId}|${country}|${seedBlockIndex}|${policyId}|${candidateSlot}`;

const parseResult = (value: unknown): ResultRecord => {
    if (
        !isRecord(value) ||
        typeof value.familyId !== "string" ||
        typeof value.policyId !== "string" ||
        !Number.isSafeInteger(value.seedBlockIndex) ||
        !Number.isSafeInteger(value.requestedEngineSeed) ||
        (value.candidateSlot !== 0 && value.candidateSlot !== 1) ||
        typeof value.candidateCountry !== "string" ||
        value.baselineCountry !== value.candidateCountry ||
        (value.winner !== "candidate" && value.winner !== "baseline" && value.winner !== "draw") ||
        !Number.isSafeInteger(value.ticks) ||
        (value.ticks as number) < 1
    ) {
        throw new Error("Method-v3 analysis encountered a malformed result");
    }
    validateMethodV3ActualWin(value, String(value.episodeId));
    return value as ResultRecord;
};

export const rankMethodV3MechanismArms = (
    campaign: MethodV3MechanismCampaign,
    rawResults: unknown[],
): MethodV3MechanismRankingRow[] => {
    validateMethodV3MechanismCampaign(campaign);
    const expected = new Map<string, { armId: MethodV3MechanismArmId; requestedEngineSeed: number }>();
    for (const shard of campaign.shards) {
        for (const arm of campaign.arms) {
            for (const slot of [0, 1] as const) {
                expected.set(
                    expectedResultKey(shard.familyId, shard.country, shard.seedBlockIndex, arm.policyId, slot),
                    { armId: arm.armId, requestedEngineSeed: shard.requestedEngineSeed },
                );
            }
        }
    }
    if (expected.size !== METHOD_V3_STAGE1_LAUNCH_COUNT || rawResults.length !== expected.size) {
        throw new Error("Method-v3 analysis requires the complete frozen launch population");
    }
    const seen = new Set<string>();
    const byArm = new Map<MethodV3MechanismArmId, ResultRecord[]>(
        campaign.arms.map(({ armId }) => [armId, []]),
    );
    for (const raw of rawResults) {
        const result = parseResult(raw);
        const key = expectedResultKey(
            result.familyId,
            result.candidateCountry,
            result.seedBlockIndex,
            result.policyId,
            result.candidateSlot,
        );
        const expectedRow = expected.get(key);
        if (
            !expectedRow ||
            seen.has(key) ||
            result.requestedEngineSeed !== expectedRow.requestedEngineSeed ||
            result.methodId !== result.policyId
        ) {
            throw new Error("Method-v3 analysis result identity or seed differs from the frozen schedule");
        }
        seen.add(key);
        byArm.get(expectedRow.armId)?.push(result);
    }
    if (seen.size !== expected.size) throw new Error("Method-v3 analysis is missing frozen schedule rows");

    const unranked = campaign.arms.map(({ armId, policyId }) => {
        const results = byArm.get(armId) ?? [];
        const cells = new Map<string, ResultRecord[]>();
        for (const result of results) {
            const key = `${result.familyId}|${result.candidateCountry}`;
            const rows = cells.get(key) ?? [];
            rows.push(result);
            cells.set(key, rows);
        }
        if (cells.size !== campaign.familyCount * campaign.countryCount) {
            throw new Error(`Method-v3 arm ${armId} lacks complete family-country cells`);
        }
        const cellRows = [...cells.values()];
        if (cellRows.some((rows) => rows.length !== 2 || rows.map(({ candidateSlot }) => candidateSlot).sort().join(",") !== "0,1")) {
            throw new Error(`Method-v3 arm ${armId} lacks reciprocal slots in a family-country cell`);
        }
        const cellWin = cellRows.map((rows) => rows.filter(({ winner }) => winner === "candidate").length / 2);
        const cellMargin = cellRows.map((rows) => (
            rows.filter(({ winner }) => winner === "candidate").length -
            rows.filter(({ winner }) => winner === "baseline").length
        ) / 2);
        const cellDraw = cellRows.map((rows) => rows.filter(({ winner }) => winner === "draw").length / 2);
        const worstCount = Math.ceil(cellWin.length * 0.10);
        const worst = [...cellWin].sort((left, right) => left - right).slice(0, worstCount);
        const wins = results.filter(({ winner }) => winner === "candidate").length;
        const losses = results.filter(({ winner }) => winner === "baseline").length;
        const draws = results.length - wins - losses;
        const countryBreakdown = campaign.countries.map((country) => {
            const rows = results.filter(({ candidateCountry }) => candidateCountry === country);
            const countryWins = rows.filter(({ winner }) => winner === "candidate").length;
            const countryLosses = rows.filter(({ winner }) => winner === "baseline").length;
            const countryDraws = rows.length - countryWins - countryLosses;
            return {
                country,
                games: rows.length,
                wins: countryWins,
                draws: countryDraws,
                losses: countryLosses,
                winProbability: countryWins / rows.length,
            };
        });
        return {
            rank: 0,
            armId,
            policyId,
            familyCountryCellCount: cells.size,
            gameCount: results.length,
            wins,
            draws,
            losses,
            equalFamilyCountryWinProbability: mean(cellWin),
            equalFamilyCountryWinMinusLossMargin: mean(cellMargin),
            worstDecileMeanFamilyCountryWinProbability: mean(worst),
            equalFamilyCountryDrawProbability: mean(cellDraw),
            medianActualWinTick: median(results.filter(({ winner }) => winner === "candidate").map(({ ticks }) => ticks)),
            countryBreakdown,
        };
    });
    unranked.sort((left, right) =>
        right.equalFamilyCountryWinProbability - left.equalFamilyCountryWinProbability ||
        right.equalFamilyCountryWinMinusLossMargin - left.equalFamilyCountryWinMinusLossMargin ||
        right.worstDecileMeanFamilyCountryWinProbability - left.worstDecileMeanFamilyCountryWinProbability ||
        left.equalFamilyCountryDrawProbability - right.equalFamilyCountryDrawProbability ||
        (left.medianActualWinTick ?? Number.POSITIVE_INFINITY) -
            (right.medianActualWinTick ?? Number.POSITIVE_INFINITY) ||
        left.policyId.localeCompare(right.policyId),
    );
    return unranked.map((row, index) => ({ ...row, rank: index + 1 }));
};

const loadAllResults = (campaign: MethodV3MechanismCampaign, resultsRoot: string, arrayJobId: string): unknown[] =>
    campaign.shards.flatMap(({ shardIndex }) => {
        const eventsPath = path.join(resultsRoot, `${arrayJobId}_${shardIndex}`, "run", "events.jsonl");
        return fs.readFileSync(eventsPath, "utf8")
            .split("\n")
            .filter(Boolean)
            .map((line) => JSON.parse(line) as unknown)
            .filter((event) => isRecord(event) && event.event === "episode_complete")
            .map((event) => (event as Record<string, unknown>).result);
    });

const main = (): void => {
    const campaignPath = requiredPath("CAMPAIGN");
    const gatePath = requiredPath("TECHNICAL_GATE");
    const resultsRoot = requiredPath("RESULTS_ROOT");
    const outputPath = requiredPath("OUT_FILE");
    const arrayJobId = requiredArrayJobId();
    if (fs.existsSync(outputPath)) throw new Error(`Refusing to overwrite method-v3 analysis ${outputPath}`);
    const campaign = validateMethodV3MechanismCampaign(JSON.parse(fs.readFileSync(campaignPath, "utf8")));
    const gate = JSON.parse(fs.readFileSync(gatePath, "utf8")) as unknown;
    if (
        !isRecord(gate) ||
        gate.status !== "PASSED_METHOD_V3_STAGE1_TECHNICAL_GATE_OUTCOMES_NOT_SUMMARIZED" ||
        gate.campaignSha256 !== sha256File(campaignPath) ||
        path.resolve(String(gate.resultsRoot)) !== resultsRoot ||
        String(gate.arrayJobId) !== arrayJobId ||
        gate.schedulerAccount !== "pi_jss233" ||
        gate.accountedLaunches !== METHOD_V3_STAGE1_LAUNCH_COUNT ||
        gate.technicalFailures !== 0 ||
        gate.actualWinInvariantViolations !== 0 ||
        gate.authorizedNextPhase !== "method-v3-stage1-open-training-analysis" ||
        gate.resultArtifactCommitmentSha256 !== methodV3ResultArtifactCommitmentSha256(
            campaign,
            resultsRoot,
            arrayJobId,
        )
    ) {
        throw new Error("Method-v3 technical gate does not authorize open-training analysis");
    }
    const ranking = rankMethodV3MechanismArms(campaign, loadAllResults(campaign, resultsRoot, arrayJobId));
    const output = {
        schemaVersion: 1,
        status: "OPEN_TRAINING_METHOD_V3_STAGE1_MECHANISM_ANALYSIS_NOT_A_PAPER_CLAIM",
        generatedAt: new Date().toISOString(),
        campaignPath,
        campaignSha256: sha256File(campaignPath),
        technicalGatePath: gatePath,
        technicalGateSha256: sha256File(gatePath),
        resultsRoot,
        resultArtifactCommitmentSha256: gate.resultArtifactCommitmentSha256,
        familyCount: campaign.familyCount,
        countryCount: campaign.countryCount,
        familyCountryCellCount: campaign.familyCount * campaign.countryCount,
        policyCount: campaign.policyCount,
        gameCount: METHOD_V3_STAGE1_LAUNCH_COUNT,
        rankingRule: campaign.rankingRule,
        ranking,
        selectedArmId: ranking[0].armId,
        selectedPolicyId: ranking[0].policyId,
        limitations: [
            "All families are opened method-v2 training families.",
            "This analysis may select a development mechanism but cannot support a reliable-superiority claim.",
            "Fresh development and confirmatory families remain blocked by the supported map population.",
        ],
    };
    fs.mkdirSync(path.dirname(outputPath), { recursive: true, mode: 0o700 });
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), { flag: "wx", mode: 0o600 });
    console.log(JSON.stringify({
        outputPath,
        outputSha256: sha256File(outputPath),
        selectedArmId: output.selectedArmId,
        selectedPolicyId: output.selectedPolicyId,
        selectedWinProbability: ranking[0].equalFamilyCountryWinProbability,
        selectedDrawProbability: ranking[0].equalFamilyCountryDrawProbability,
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
