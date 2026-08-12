import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
    METHOD_V4_COUNTRIES,
    METHOD_V4_LIFECYCLE_LAUNCH_COUNT,
    MethodV4LifecycleCampaign,
} from "./methodV4LifecyclePlanGenerator.js";
import { MethodV4LifecycleArmId } from "./methodV4LifecyclePolicies.js";
import {
    methodV4ResultArtifactCommitmentSha256,
    validateMethodV4ActualWin,
    validateMethodV4LifecycleCampaign,
} from "./methodV4LifecycleTechnicalGate.js";
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

type Breakdown = {
    games: number;
    wins: number;
    draws: number;
    losses: number;
    winProbability: number;
    winMinusLossProbability: number;
};

export type MethodV4LifecycleRankingRow = {
    rank: number;
    armId: MethodV4LifecycleArmId;
    policyId: string;
    gameCount: number;
    wins: number;
    draws: number;
    losses: number;
    actualWinProbability: number;
    equalFamilyCountryWinProbability: number;
    equalFamilyCountryWinMinusLossProbability: number;
    equalFamilyCountryDrawProbability: number;
    minimumFactionWinProbability: number;
    minimumCountryWinMinusLossProbability: number;
    medianActualWinTick: number | null;
    allied: Breakdown;
    soviet: Breakdown;
    countryBreakdown: Array<{ country: string } & Breakdown>;
    countriesWithWinsAboveLosses: number;
    passesAdvancementRule: boolean;
};

const ALLIED_COUNTRIES = new Set<string>(METHOD_V4_COUNTRIES.slice(0, 5));

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

const summarize = (rows: ResultRecord[]): Breakdown => {
    const wins = rows.filter(({ winner }) => winner === "candidate").length;
    const losses = rows.filter(({ winner }) => winner === "baseline").length;
    const draws = rows.length - wins - losses;
    return {
        games: rows.length,
        wins,
        draws,
        losses,
        winProbability: wins / rows.length,
        winMinusLossProbability: (wins - losses) / rows.length,
    };
};

const expectedKey = (
    familyId: string,
    country: string,
    seedBlockIndex: number,
    policyId: string,
    candidateSlot: number,
): string => `${familyId}|${country}|${seedBlockIndex}|${policyId}|${candidateSlot}`;

const parseResult = (value: unknown): ResultRecord => {
    if (
        !isRecord(value) || typeof value.familyId !== "string" || typeof value.policyId !== "string" ||
        !Number.isSafeInteger(value.seedBlockIndex) || !Number.isSafeInteger(value.requestedEngineSeed) ||
        (value.candidateSlot !== 0 && value.candidateSlot !== 1) || typeof value.candidateCountry !== "string" ||
        value.baselineCountry !== value.candidateCountry ||
        (value.winner !== "candidate" && value.winner !== "baseline" && value.winner !== "draw") ||
        !Number.isSafeInteger(value.ticks) || (value.ticks as number) < 1
    ) {
        throw new Error("Method-v4 analysis encountered a malformed result");
    }
    validateMethodV4ActualWin(value, String(value.episodeId));
    return value as ResultRecord;
};

export const rankMethodV4LifecycleArms = (
    campaign: MethodV4LifecycleCampaign,
    rawResults: unknown[],
): MethodV4LifecycleRankingRow[] => {
    validateMethodV4LifecycleCampaign(campaign);
    const expected = new Map<string, { armId: MethodV4LifecycleArmId; requestedEngineSeed: number }>();
    for (const shard of campaign.shards) {
        for (const arm of campaign.arms) {
            for (const slot of [0, 1] as const) {
                expected.set(
                    expectedKey(shard.familyId, shard.country, shard.seedBlockIndex, arm.policyId, slot),
                    { armId: arm.armId, requestedEngineSeed: shard.requestedEngineSeed },
                );
            }
        }
    }
    if (expected.size !== METHOD_V4_LIFECYCLE_LAUNCH_COUNT || rawResults.length !== expected.size) {
        throw new Error("Method-v4 analysis requires the complete frozen launch population");
    }
    const seen = new Set<string>();
    const byArm = new Map<MethodV4LifecycleArmId, ResultRecord[]>(
        campaign.arms.map(({ armId }) => [armId, []]),
    );
    for (const raw of rawResults) {
        const result = parseResult(raw);
        const key = expectedKey(
            result.familyId,
            result.candidateCountry,
            result.seedBlockIndex,
            result.policyId,
            result.candidateSlot,
        );
        const expectedRow = expected.get(key);
        if (!expectedRow || seen.has(key) || result.requestedEngineSeed !== expectedRow.requestedEngineSeed ||
            result.methodId !== result.policyId) {
            throw new Error("Method-v4 analysis result identity or seed differs from the frozen schedule");
        }
        seen.add(key);
        byArm.get(expectedRow.armId)?.push(result);
    }

    const unranked = campaign.arms.map(({ armId, policyId }) => {
        const rows = byArm.get(armId) ?? [];
        const cells = new Map<string, ResultRecord[]>();
        for (const row of rows) {
            const key = `${row.familyId}|${row.candidateCountry}`;
            cells.set(key, [...(cells.get(key) ?? []), row]);
        }
        if (cells.size !== campaign.familyCount * campaign.countryCount ||
            [...cells.values()].some((cell) => cell.length !== 2 ||
                cell.map(({ candidateSlot }) => candidateSlot).sort().join(",") !== "0,1")) {
            throw new Error(`Method-v4 arm ${armId} lacks complete reciprocal family-country cells`);
        }
        const cellRows = [...cells.values()];
        const cellWin = cellRows.map((cell) => cell.filter(({ winner }) => winner === "candidate").length / 2);
        const cellMargin = cellRows.map((cell) => (
            cell.filter(({ winner }) => winner === "candidate").length -
            cell.filter(({ winner }) => winner === "baseline").length
        ) / 2);
        const cellDraw = cellRows.map((cell) => cell.filter(({ winner }) => winner === "draw").length / 2);
        const overall = summarize(rows);
        const allied = summarize(rows.filter(({ candidateCountry }) => ALLIED_COUNTRIES.has(candidateCountry)));
        const soviet = summarize(rows.filter(({ candidateCountry }) => !ALLIED_COUNTRIES.has(candidateCountry)));
        const countryBreakdown = METHOD_V4_COUNTRIES.map((country) => ({
            country,
            ...summarize(rows.filter(({ candidateCountry }) => candidateCountry === country)),
        }));
        const countriesWithWinsAboveLosses = countryBreakdown.filter(({ wins, losses }) => wins > losses).length;
        const result = {
            rank: 0,
            armId,
            policyId,
            gameCount: rows.length,
            wins: overall.wins,
            draws: overall.draws,
            losses: overall.losses,
            actualWinProbability: overall.winProbability,
            equalFamilyCountryWinProbability: mean(cellWin),
            equalFamilyCountryWinMinusLossProbability: mean(cellMargin),
            equalFamilyCountryDrawProbability: mean(cellDraw),
            minimumFactionWinProbability: Math.min(allied.winProbability, soviet.winProbability),
            minimumCountryWinMinusLossProbability: Math.min(
                ...countryBreakdown.map(({ winMinusLossProbability }) => winMinusLossProbability),
            ),
            medianActualWinTick: median(rows.filter(({ winner }) => winner === "candidate").map(({ ticks }) => ticks)),
            allied,
            soviet,
            countryBreakdown,
            countriesWithWinsAboveLosses,
            passesAdvancementRule: overall.winProbability > 0.5 && allied.wins > allied.losses &&
                soviet.wins > soviet.losses && countriesWithWinsAboveLosses >= 7,
        };
        return result;
    });
    unranked.sort((left, right) =>
        right.minimumFactionWinProbability - left.minimumFactionWinProbability ||
        right.equalFamilyCountryWinProbability - left.equalFamilyCountryWinProbability ||
        right.equalFamilyCountryWinMinusLossProbability - left.equalFamilyCountryWinMinusLossProbability ||
        right.minimumCountryWinMinusLossProbability - left.minimumCountryWinMinusLossProbability ||
        left.equalFamilyCountryDrawProbability - right.equalFamilyCountryDrawProbability ||
        (left.medianActualWinTick ?? Number.POSITIVE_INFINITY) -
            (right.medianActualWinTick ?? Number.POSITIVE_INFINITY) ||
        left.policyId.localeCompare(right.policyId),
    );
    return unranked.map((row, index) => ({ ...row, rank: index + 1 }));
};

const loadAllResults = (campaign: MethodV4LifecycleCampaign, resultsRoot: string, arrayJobId: string): unknown[] =>
    campaign.shards.flatMap(({ shardIndex }) => fs.readFileSync(
        path.join(resultsRoot, `${arrayJobId}_${shardIndex}`, "run", "events.jsonl"),
        "utf8",
    ).split("\n").filter(Boolean).map((line) => JSON.parse(line) as unknown)
        .filter((event) => isRecord(event) && event.event === "episode_complete")
        .map((event) => (event as Record<string, unknown>).result));

const main = (): void => {
    const campaignPath = requiredPath("CAMPAIGN");
    const gatePath = requiredPath("TECHNICAL_GATE");
    const resultsRoot = requiredPath("RESULTS_ROOT");
    const outputPath = requiredPath("OUT_FILE");
    const arrayJobId = requiredArrayJobId();
    if (fs.existsSync(outputPath)) throw new Error(`Refusing to overwrite Method-v4 analysis ${outputPath}`);
    const campaign = validateMethodV4LifecycleCampaign(JSON.parse(fs.readFileSync(campaignPath, "utf8")));
    const gate = JSON.parse(fs.readFileSync(gatePath, "utf8")) as unknown;
    if (
        !isRecord(gate) ||
        gate.status !== "PASSED_METHOD_V4_LIFECYCLE_TECHNICAL_GATE_OUTCOMES_NOT_SUMMARIZED" ||
        gate.campaignSha256 !== sha256File(campaignPath) ||
        path.resolve(String(gate.resultsRoot)) !== resultsRoot ||
        String(gate.arrayJobId) !== arrayJobId ||
        gate.schedulerAccount !== "pi_jss233" ||
        gate.accountedLaunches !== METHOD_V4_LIFECYCLE_LAUNCH_COUNT ||
        gate.technicalFailures !== 0 ||
        gate.actualWinInvariantViolations !== 0 ||
        gate.authorizedNextPhase !== "method-v4-open-training-analysis" ||
        gate.resultArtifactCommitmentSha256 !== methodV4ResultArtifactCommitmentSha256(
            campaign,
            resultsRoot,
            arrayJobId,
        )
    ) {
        throw new Error("Method-v4 technical gate does not authorize open-training analysis");
    }
    const ranking = rankMethodV4LifecycleArms(campaign, loadAllResults(campaign, resultsRoot, arrayJobId));
    const passing = ranking.filter(({ passesAdvancementRule }) => passesAdvancementRule);
    const output = {
        schemaVersion: 1,
        status: passing.length > 0
            ? "OPEN_TRAINING_METHOD_V4_POSITIVE_SIGNAL_NOT_A_PAPER_CLAIM"
            : "OPEN_TRAINING_METHOD_V4_NO_ADVANCING_POLICY_NOT_A_PAPER_CLAIM",
        generatedAt: new Date().toISOString(),
        campaignPath,
        campaignSha256: sha256File(campaignPath),
        technicalGatePath: gatePath,
        technicalGateSha256: sha256File(gatePath),
        resultsRoot,
        resultArtifactCommitmentSha256: gate.resultArtifactCommitmentSha256,
        gameCount: METHOD_V4_LIFECYCLE_LAUNCH_COUNT,
        rankingRule: campaign.rankingRule,
        advancementRule: campaign.advancementRule,
        ranking,
        advancingPolicyIds: passing.map(({ policyId }) => policyId),
        selectedPolicyId: passing[0]?.policyId ?? null,
        selectedArmId: passing[0]?.armId ?? null,
        authorizedNextPhase: passing.length > 0
            ? "prespecified-outcome-blind-development-compatibility-gate"
            : "prospective-open-training-refinement-only",
        limitations: [
            "All outcomes are from opened training families and cannot support a paper claim.",
            "The external Supalosa runtime remains the opponent, but source-level baseline preservation is checked separately.",
            "Fresh development and sealed confirmatory outcomes remain unopened.",
        ],
    };
    fs.mkdirSync(path.dirname(outputPath), { recursive: true, mode: 0o700 });
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), { flag: "wx", mode: 0o600 });
    console.log(JSON.stringify({
        outputPath,
        outputSha256: sha256File(outputPath),
        status: output.status,
        selectedArmId: output.selectedArmId,
        selectedPolicyId: output.selectedPolicyId,
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
