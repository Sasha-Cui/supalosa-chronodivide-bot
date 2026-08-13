import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
    METHOD_V5_COUNTRIES,
    METHOD_V5_LAUNCH_COUNT,
    MethodV5Campaign,
} from "./methodV5Campaign.js";
import { MethodV5CloseoutArmId } from "./methodV5CloseoutPolicies.js";
import {
    methodV5ResultArtifactCommitmentSha256,
    validateMethodV5Campaign,
    validateMethodV5Result,
} from "./methodV5TechnicalGate.js";
import { sha256File } from "./methodV5PlanRunner.js";

type ResultRow = {
    familyId: string;
    mapName: string;
    mapSha256: string;
    policyId: string;
    seedBlockIndex: number;
    requestedEngineSeed: number;
    candidateSlot: 0 | 1;
    candidateCountry: string;
    baselineCountry: string;
    winner: "candidate" | "baseline" | "draw";
    ticks: number;
    outcomeStatus: string;
    terminalBuildingCounts: { candidate: number; baseline: number };
    policyTelemetry: Array<Record<string, unknown>>;
};

type Breakdown = {
    games: number;
    wins: number;
    draws: number;
    losses: number;
    literalWinProbability: number;
    winMinusLossProbability: number;
    drawProbability: number;
};

export type MethodV5RankingRow = {
    rank: number;
    armId: MethodV5CloseoutArmId;
    policyId: string;
    gameCount: number;
    wins: number;
    draws: number;
    losses: number;
    literalWinProbability: number;
    winMinusLossProbability: number;
    drawProbability: number;
    minimumCountryWinMinusLossProbability: number;
    countriesWithWinsAboveLosses: number;
    medianLiteralWinTick: number | null;
    activatedGames: number;
    targetOrderGames: number;
    searchOrderGames: number;
    capabilityRequestGames: number;
    threatPausedGames: number;
    noFeasibleStrikeGames: number;
    medianFocusedStrikeConcentration: number | null;
    medianFocusedEstimatedVolleys: number | null;
    nonliteralTerminationDraws: number;
    drawsWithBaselineBuildingsRemaining: number;
    drawsWithNoCandidateBuildings: number;
    countryBreakdown: Array<{ country: string } & Breakdown>;
    passesAdvancementRule: boolean;
};

type RecordValue = Record<string, unknown>;
const isRecord = (value: unknown): value is RecordValue =>
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
const median = (values: number[]): number | null => {
    if (values.length === 0) return null;
    const ordered = [...values].sort((a, b) => a - b);
    const middle = Math.floor(ordered.length / 2);
    return ordered.length % 2 ? ordered[middle] : (ordered[middle - 1] + ordered[middle]) / 2;
};
const summarize = (rows: ResultRow[]): Breakdown => {
    const wins = rows.filter(({ winner }) => winner === "candidate").length;
    const losses = rows.filter(({ winner }) => winner === "baseline").length;
    const draws = rows.length - wins - losses;
    return {
        games: rows.length,
        wins,
        draws,
        losses,
        literalWinProbability: wins / rows.length,
        winMinusLossProbability: (wins - losses) / rows.length,
        drawProbability: draws / rows.length,
    };
};
const key = (familyId: string, country: string, policyId: string, slot: number): string =>
    `${familyId}|${country}|${policyId}|${slot}`;

export const rankMethodV5Arms = (campaign: MethodV5Campaign, rawResults: unknown[]): MethodV5RankingRow[] => {
    validateMethodV5Campaign(campaign);
    if (rawResults.length !== METHOD_V5_LAUNCH_COUNT) throw new Error("Method-v5 analysis requires every frozen launch");
    const expected = new Map<string, { shard: MethodV5Campaign["shards"][number]; armId: MethodV5CloseoutArmId }>();
    for (const shard of campaign.shards) for (const arm of campaign.arms) for (const slot of [0, 1] as const) {
        expected.set(key(shard.familyId, shard.country, arm.policyId, slot), { shard, armId: arm.armId });
    }
    const seen = new Set<string>();
    const byArm = new Map<MethodV5CloseoutArmId, ResultRow[]>(
        campaign.arms.map(({ armId }) => [armId, []]),
    );
    for (const raw of rawResults) {
        if (!isRecord(raw) || typeof raw.familyId !== "string" || typeof raw.candidateCountry !== "string" ||
            typeof raw.policyId !== "string" || (raw.candidateSlot !== 0 && raw.candidateSlot !== 1)) {
            throw new Error("Method-v5 analysis encountered a malformed result identity");
        }
        const resultKey = key(raw.familyId, raw.candidateCountry, raw.policyId, raw.candidateSlot);
        const binding = expected.get(resultKey);
        if (!binding || seen.has(resultKey)) throw new Error("Method-v5 analysis result is duplicate or outside the schedule");
        const arm = campaign.arms.find(({ policyId }) => policyId === raw.policyId);
        if (!arm) throw new Error("Method-v5 analysis result has no arm");
        const episodeId = `a${campaign.arms.indexOf(arm)}-s${raw.candidateSlot}`;
        const validated = validateMethodV5Result(raw, {
            episodeId,
            familyId: binding.shard.familyId,
            mapName: binding.shard.mapName,
            mapSha256: binding.shard.mapSha256,
            policyId: arm.policyId,
            candidateSlot: raw.candidateSlot,
            country: binding.shard.country,
            seedBlockIndex: binding.shard.seedBlockIndex,
            requestedEngineSeed: binding.shard.requestedEngineSeed,
            maxTicks: campaign.maxTicks,
        });
        seen.add(resultKey);
        byArm.get(binding.armId)?.push(validated as unknown as ResultRow);
    }
    return campaign.arms.map(({ armId, policyId }) => {
        const rows = byArm.get(armId) ?? [];
        const overall = summarize(rows);
        const countryBreakdown = METHOD_V5_COUNTRIES.map((country) => ({
            country,
            ...summarize(rows.filter(({ candidateCountry }) => candidateCountry === country)),
        }));
        const telemetryGames = (event: string): number => rows.filter(({ policyTelemetry }) =>
            policyTelemetry.some((row) => row.event === event),
        ).length;
        const targetOrders = rows.flatMap(({ policyTelemetry }) => policyTelemetry).filter(
            (event) => event.event === "target_orders",
        );
        const focusedOrders = targetOrders.filter(
            (event) => event.targetAssignmentMode === "focused",
        );
        return {
            rank: 0,
            armId,
            policyId,
            gameCount: rows.length,
            wins: overall.wins,
            draws: overall.draws,
            losses: overall.losses,
            literalWinProbability: overall.literalWinProbability,
            winMinusLossProbability: overall.winMinusLossProbability,
            drawProbability: overall.drawProbability,
            minimumCountryWinMinusLossProbability: Math.min(...countryBreakdown.map((row) => row.winMinusLossProbability)),
            countriesWithWinsAboveLosses: countryBreakdown.filter(({ wins, losses }) => wins > losses).length,
            medianLiteralWinTick: median(rows.filter(({ winner }) => winner === "candidate").map(({ ticks }) => ticks)),
            activatedGames: telemetryGames("activated"),
            targetOrderGames: telemetryGames("target_orders"),
            searchOrderGames: telemetryGames("search_orders"),
            capabilityRequestGames: telemetryGames("capability_request"),
            threatPausedGames: telemetryGames("orders_paused_for_visible_threat"),
            noFeasibleStrikeGames: telemetryGames("no_feasible_strike"),
            medianFocusedStrikeConcentration: median(focusedOrders.flatMap((event) =>
                typeof event.attackerCount === "number" && typeof event.compatibleAttackerCount === "number" &&
                    event.compatibleAttackerCount > 0
                    ? [event.attackerCount / event.compatibleAttackerCount]
                    : [],
            )),
            medianFocusedEstimatedVolleys: median(focusedOrders.flatMap((event) =>
                typeof event.estimatedVolleys === "number" ? [event.estimatedVolleys] : [],
            )),
            nonliteralTerminationDraws: rows.filter(({ outcomeStatus }) =>
                outcomeStatus === "engine_nonliteral_termination_draw",
            ).length,
            drawsWithBaselineBuildingsRemaining: rows.filter(({ winner, terminalBuildingCounts }) =>
                winner === "draw" && terminalBuildingCounts.baseline > 0,
            ).length,
            drawsWithNoCandidateBuildings: rows.filter(({ winner, terminalBuildingCounts }) =>
                winner === "draw" && terminalBuildingCounts.candidate === 0,
            ).length,
            countryBreakdown,
            passesAdvancementRule: overall.literalWinProbability > 0.5 && overall.wins > overall.losses &&
                countryBreakdown.filter(({ wins, losses }) => wins > losses).length >= 7,
        };
    }).sort((left, right) =>
        right.wins - left.wins ||
        (right.wins - right.losses) - (left.wins - left.losses) ||
        left.drawProbability - right.drawProbability ||
        right.minimumCountryWinMinusLossProbability - left.minimumCountryWinMinusLossProbability ||
        (left.medianLiteralWinTick ?? Number.POSITIVE_INFINITY) - (right.medianLiteralWinTick ?? Number.POSITIVE_INFINITY) ||
        left.policyId.localeCompare(right.policyId)
    ).map((row, index) => ({ ...row, rank: index + 1 }));
};

const loadResults = (campaign: MethodV5Campaign, resultsRoot: string, arrayJobId: string): unknown[] =>
    campaign.shards.flatMap(({ shardIndex }) => fs.readFileSync(
        path.join(resultsRoot, `${arrayJobId}_${shardIndex}`, "run", "events.jsonl"), "utf8",
    ).split("\n").filter(Boolean).map((line) => JSON.parse(line) as unknown)
        .filter((event) => isRecord(event) && event.event === "episode_complete")
        .map((event) => (event as RecordValue).result));

const main = (): void => {
    const campaignPath = requiredPath("CAMPAIGN");
    const gatePath = requiredPath("TECHNICAL_GATE");
    const resultsRoot = requiredPath("RESULTS_ROOT");
    const outputPath = requiredPath("OUT_FILE");
    const arrayJobId = requiredArrayJobId();
    if (fs.existsSync(outputPath)) throw new Error(`Refusing to overwrite Method-v5 analysis ${outputPath}`);
    const campaign = validateMethodV5Campaign(JSON.parse(fs.readFileSync(campaignPath, "utf8")));
    const gate = JSON.parse(fs.readFileSync(gatePath, "utf8")) as unknown;
    if (
        !isRecord(gate) || gate.status !== "PASSED_METHOD_V6_LITERAL_ENDPOINT_TECHNICAL_GATE_OUTCOMES_NOT_SUMMARIZED" ||
        gate.campaignSha256 !== sha256File(campaignPath) || path.resolve(String(gate.resultsRoot)) !== resultsRoot ||
        String(gate.arrayJobId) !== arrayJobId || gate.schedulerAccount !== "pi_jss233" ||
        gate.accountedLaunches !== METHOD_V5_LAUNCH_COUNT || gate.technicalFailures !== 0 ||
        gate.endpointViolations !== 0 || gate.informationBoundaryViolations !== 0 ||
        gate.authorizedNextPhase !== "method-v6-open-training-analysis" ||
        gate.resultArtifactCommitmentSha256 !== methodV5ResultArtifactCommitmentSha256(campaign, resultsRoot, arrayJobId)
    ) throw new Error("Method-v5 technical gate does not authorize analysis");
    const ranking = rankMethodV5Arms(campaign, loadResults(campaign, resultsRoot, arrayJobId));
    const passing = ranking.filter(({ passesAdvancementRule }) => passesAdvancementRule);
    const output = {
        schemaVersion: 2,
        status: passing.length > 0
            ? "OPEN_TRAINING_METHOD_V6_POSITIVE_LITERAL_SIGNAL_NOT_A_PAPER_CLAIM"
            : "OPEN_TRAINING_METHOD_V6_NO_ADVANCING_POLICY_NOT_A_PAPER_CLAIM",
        generatedAt: new Date().toISOString(),
        campaignPath,
        campaignSha256: sha256File(campaignPath),
        technicalGatePath: gatePath,
        technicalGateSha256: sha256File(gatePath),
        resultsRoot,
        resultArtifactCommitmentSha256: gate.resultArtifactCommitmentSha256,
        gameCount: METHOD_V5_LAUNCH_COUNT,
        rankingRule: campaign.rankingRule,
        advancementRule: campaign.advancementRule,
        ranking,
        advancingPolicyIds: passing.map(({ policyId }) => policyId),
        selectedPolicyId: passing[0]?.policyId ?? null,
        selectedArmId: passing[0]?.armId ?? null,
        authorizedNextPhase: passing.length > 0
            ? "fresh-map-outcome-blind-compatibility-gate"
            : "prospective-method-v6-open-training-refinement-only",
        limitations: [
            "All outcomes are from opened training families and cannot support a paper claim.",
            "The literal endpoint does not use engine resignation or short-game cleanup.",
            "Fresh development and sealed confirmatory outcomes remain unopened.",
        ],
    };
    fs.mkdirSync(path.dirname(outputPath), { recursive: true, mode: 0o700 });
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2) + "\n", { flag: "wx", mode: 0o600 });
    console.log(JSON.stringify({ outputPath, outputSha256: sha256File(outputPath), status: output.status, selectedArmId: output.selectedArmId }));
};

const invoked = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (import.meta.url === invoked) { try { main(); } catch (error) { console.error(error); process.exitCode = 1; } }
