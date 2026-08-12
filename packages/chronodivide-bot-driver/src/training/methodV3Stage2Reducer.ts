import { ResearchEpisodeResult } from "./researchEpisode.js";
import { ResearchPlanPolicy } from "./researchPlanRunner.js";

export const METHOD_V3_STAGE2_SELECTION_RULE = [
    "equal-family-country actual win probability descending",
    "equal-family-country win-minus-loss probability descending",
    "mean actual win probability over worst ten percent of family-country cells descending",
    "mean 1/(1+terminal Supalosa building count) among draws descending",
    "equal-family-country draw probability ascending",
    "median tick among actual wins ascending",
    "canonical policy SHA-256 ascending",
] as const;

export type MethodV3Stage2RankingRow = {
    rank: number;
    policyId: string;
    familyCountryCellCount: number;
    gameCount: number;
    wins: number;
    draws: number;
    losses: number;
    actualWinProbability: number;
    winMinusLossProbability: number;
    worstDecileActualWinProbability: number;
    drawConversion: number;
    drawProbability: number;
    medianActualWinTick: number | null;
};

export type MethodV3Stage2OutcomeRecord = {
    policyId: string;
    familyId: string;
    candidateCountry: string;
    candidateSlot: 0 | 1;
    winner: "candidate" | "baseline" | "draw";
    ticks: number;
    baselineBuildings: number;
    /** Distinguishes repeated complete Stage-2 blocks across optimizer runs. */
    blockId?: string;
};

const mean = (values: number[]): number => values.reduce((total, value) => total + value, 0) / values.length;

const median = (values: number[]): number | null => {
    if (values.length === 0) return null;
    const ordered = values.slice().sort((left, right) => left - right);
    const middle = Math.floor(ordered.length / 2);
    return ordered.length % 2 === 1 ? ordered[middle] : (ordered[middle - 1] + ordered[middle]) / 2;
};

export const rankMethodV3Stage2OutcomeRecords = (
    policies: ResearchPlanPolicy[],
    results: MethodV3Stage2OutcomeRecord[],
): MethodV3Stage2RankingRow[] => {
    if (policies.length === 0 || results.length === 0) throw new Error("Stage-2 ranking requires policies and results");
    const policyIds = new Set(policies.map(({ policyId }) => policyId));
    if (policyIds.size !== policies.length) throw new Error("Stage-2 ranking received duplicate policies");
    for (const [index, result] of results.entries()) {
        if (
            !policyIds.has(result.policyId) ||
            typeof result.familyId !== "string" ||
            result.familyId.length === 0 ||
            typeof result.candidateCountry !== "string" ||
            result.candidateCountry.length === 0 ||
            (result.candidateSlot !== 0 && result.candidateSlot !== 1) ||
            (result.winner !== "candidate" && result.winner !== "baseline" && result.winner !== "draw") ||
            !Number.isSafeInteger(result.ticks) ||
            result.ticks < 0 ||
            !Number.isSafeInteger(result.baselineBuildings) ||
            result.baselineBuildings < 0 ||
            (result.blockId !== undefined && (typeof result.blockId !== "string" || result.blockId.length === 0))
        ) {
            throw new Error(`Stage-2 ranking result ${index} is malformed or belongs to an undeclared policy`);
        }
    }
    const rows = policies.map(({ policyId }) => {
        const policyResults = results.filter((result) => result.policyId === policyId);
        const cells = new Map<string, MethodV3Stage2OutcomeRecord[]>();
        for (const result of policyResults) {
            const key = `${result.blockId ?? "single-block"}|${result.familyId}|${result.candidateCountry}`;
            const cell = cells.get(key) ?? [];
            cell.push(result);
            cells.set(key, cell);
        }
        if (cells.size === 0) throw new Error(`Policy ${policyId} has no family-country cells`);
        const cellRows = [...cells.entries()].map(([key, cell]) => {
            if (cell.length !== 2 || cell.map(({ candidateSlot }) => candidateSlot).sort().join(",") !== "0,1") {
                throw new Error(`Policy ${policyId} cell ${key} lacks one reciprocal pair`);
            }
            const wins = cell.filter(({ winner }) => winner === "candidate").length;
            const losses = cell.filter(({ winner }) => winner === "baseline").length;
            const draws = 2 - wins - losses;
            return { win: wins / 2, margin: (wins - losses) / 2, draw: draws / 2 };
        });
        const wins = policyResults.filter(({ winner }) => winner === "candidate").length;
        const losses = policyResults.filter(({ winner }) => winner === "baseline").length;
        const draws = policyResults.length - wins - losses;
        const drawRows = policyResults.filter(({ winner }) => winner === "draw");
        const worstCount = Math.ceil(cellRows.length * 0.10);
        return {
            rank: 0,
            policyId,
            familyCountryCellCount: cellRows.length,
            gameCount: policyResults.length,
            wins,
            draws,
            losses,
            actualWinProbability: mean(cellRows.map(({ win }) => win)),
            winMinusLossProbability: mean(cellRows.map(({ margin }) => margin)),
            worstDecileActualWinProbability: mean(
                cellRows.map(({ win }) => win).sort((left, right) => left - right).slice(0, worstCount),
            ),
            drawConversion: drawRows.length === 0
                ? 1
                : mean(drawRows.map(({ baselineBuildings }) => 1 / (1 + baselineBuildings))),
            drawProbability: mean(cellRows.map(({ draw }) => draw)),
            medianActualWinTick: median(
                policyResults.filter(({ winner }) => winner === "candidate").map(({ ticks }) => ticks),
            ),
        };
    });
    rows.sort((left, right) =>
        right.actualWinProbability - left.actualWinProbability ||
        right.winMinusLossProbability - left.winMinusLossProbability ||
        right.worstDecileActualWinProbability - left.worstDecileActualWinProbability ||
        right.drawConversion - left.drawConversion ||
        left.drawProbability - right.drawProbability ||
        (left.medianActualWinTick ?? Number.POSITIVE_INFINITY) -
            (right.medianActualWinTick ?? Number.POSITIVE_INFINITY) ||
        left.policyId.localeCompare(right.policyId),
    );
    return rows.map((row, index) => ({ ...row, rank: index + 1 }));
};

export const rankMethodV3Stage2Policies = (
    policies: ResearchPlanPolicy[],
    results: ResearchEpisodeResult[],
): MethodV3Stage2RankingRow[] => rankMethodV3Stage2OutcomeRecords(
    policies,
    results.map((result) => ({
        policyId: result.policyId,
        familyId: result.familyId,
        candidateCountry: result.candidateCountry,
        candidateSlot: result.candidateSlot,
        winner: result.winner,
        ticks: result.ticks,
        baselineBuildings: result.baseline.buildings,
    })),
);
