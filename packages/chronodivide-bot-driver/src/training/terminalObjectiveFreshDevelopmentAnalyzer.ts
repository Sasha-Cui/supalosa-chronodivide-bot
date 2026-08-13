import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
    TERMINAL_FRESH_DEVELOPMENT_COUNTRIES,
    TERMINAL_FRESH_DEVELOPMENT_FAMILY_COUNT,
    TERMINAL_FRESH_DEVELOPMENT_LAUNCH_COUNT,
    TerminalFreshDevelopmentCampaign,
} from "./terminalObjectiveFreshDevelopmentCampaign.js";
import {
    terminalFreshDevelopmentResultArtifactCommitmentSha256,
    validateTerminalFreshDevelopmentCampaign,
} from "./terminalObjectiveFreshDevelopmentTechnicalGate.js";
import { sha256File } from "./terminalObjectiveFreshDevelopmentPlanRunner.js";

type RecordValue = Record<string, unknown>;
type Observation = { familyId: string; country: string; winner: "candidate" | "baseline" | "draw"; ticks: number };
const isRecord = (value: unknown): value is RecordValue =>
    typeof value === "object" && value !== null && !Array.isArray(value);
const readJson = (filePath: string): unknown => JSON.parse(fs.readFileSync(filePath, "utf8"));
const requiredPath = (name: string): string => {
    const value = process.env[name];
    if (!value) throw new Error(`${name} is required`);
    return path.resolve(value);
};
const mean = (values: readonly number[]): number => {
    if (values.length === 0) throw new Error("Cannot average an empty vector");
    return values.reduce((sum, value) => sum + value, 0) / values.length;
};
const interval = (familyValues: readonly number[], direction: "lower" | "upper") => {
    if (familyValues.length !== 10) throw new Error("Fresh-development interval requires ten family estimates");
    const estimate = mean(familyValues);
    const variance = familyValues.reduce((sum, value) => sum + (value - estimate) ** 2, 0) / 9;
    const standardError = Math.sqrt(variance / 10);
    const halfWidth = 0.8834038596855205 * standardError;
    return { estimate, standardError, bound: direction === "lower" ? estimate - halfWidth : estimate + halfWidth };
};

const observations = (
    campaign: TerminalFreshDevelopmentCampaign,
    resultsRoot: string,
    arrayJobId: string,
): Observation[] => campaign.shards.flatMap((shard) => {
    const events = fs.readFileSync(
        path.join(resultsRoot, `${arrayJobId}_${shard.shardIndex}`, "run", "events.jsonl"), "utf8",
    ).split("\n").filter(Boolean).map((line) => JSON.parse(line) as unknown);
    return events.filter((event): event is RecordValue => isRecord(event) && event.event === "episode_complete").map((event) => {
        if (!isRecord(event.result)) throw new Error(`Fresh shard ${shard.shardIndex} completion is malformed`);
        const winner = event.result.winner;
        if (
            winner !== "candidate" && winner !== "baseline" && winner !== "draw" ||
            !Number.isSafeInteger(event.result.ticks) || Number(event.result.ticks) < 1
        ) throw new Error(`Fresh shard ${shard.shardIndex} completion is not analyzable`);
        return { familyId: shard.familyId, country: shard.country, winner, ticks: Number(event.result.ticks) };
    });
});

const main = (): void => {
    const campaignPath = requiredPath("CAMPAIGN");
    const resultsRoot = requiredPath("RESULTS_ROOT");
    const technicalGatePath = requiredPath("TECHNICAL_GATE");
    const outputPath = requiredPath("OUT_FILE");
    if (fs.existsSync(outputPath)) throw new Error(`Refusing to overwrite fresh-development unblinding ${outputPath}`);
    const repoRoot = path.resolve(process.cwd(), "..", "..");
    const campaign = validateTerminalFreshDevelopmentCampaign(readJson(campaignPath), repoRoot);
    const gate = readJson(technicalGatePath);
    if (
        !isRecord(gate) ||
        gate.status !== "PASSED_TERMINAL_OBJECTIVE_FRESH_DEVELOPMENT_TECHNICAL_GATE_OUTCOMES_NOT_SUMMARIZED" ||
        gate.campaignSha256 !== sha256File(campaignPath) || gate.schedulerAccount !== "pi_jss233" ||
        gate.accountedLaunches !== TERMINAL_FRESH_DEVELOPMENT_LAUNCH_COUNT || gate.technicalFailures !== 0 ||
        gate.endpointViolations !== 0 || gate.informationBoundaryViolations !== 0 ||
        gate.authorizedNextPhase !== "single-terminal-objective-fresh-development-unblinding"
    ) throw new Error("Fresh-development technical gate does not authorize unblinding");
    const arrayJobId = String(gate.arrayJobId);
    const artifactCommitment = terminalFreshDevelopmentResultArtifactCommitmentSha256(campaign, resultsRoot, arrayJobId);
    if (gate.resultArtifactCommitmentSha256 !== artifactCommitment) {
        throw new Error("Fresh-development result artifacts changed after technical gating");
    }
    const rows = observations(campaign, resultsRoot, arrayJobId);
    if (rows.length !== TERMINAL_FRESH_DEVELOPMENT_LAUNCH_COUNT) {
        throw new Error(`Fresh-development unblinding found ${rows.length}/${TERMINAL_FRESH_DEVELOPMENT_LAUNCH_COUNT} games`);
    }
    const families = campaign.families.map(({ familyId }) => familyId);
    const familyResults = families.map((familyId) => {
        const subset = rows.filter((row) => row.familyId === familyId);
        if (subset.length !== 72) throw new Error(`Fresh-development family ${familyId} is unbalanced`);
        return {
            familyId,
            games: subset.length,
            wins: subset.filter(({ winner }) => winner === "candidate").length,
            draws: subset.filter(({ winner }) => winner === "draw").length,
            losses: subset.filter(({ winner }) => winner === "baseline").length,
            winProbability: subset.filter(({ winner }) => winner === "candidate").length / subset.length,
            drawProbability: subset.filter(({ winner }) => winner === "draw").length / subset.length,
        };
    });
    const countryResults = TERMINAL_FRESH_DEVELOPMENT_COUNTRIES.map((country) => {
        const subset = rows.filter((row) => row.country === country);
        if (subset.length !== 80) throw new Error(`Fresh-development country ${country} is unbalanced`);
        const wins = subset.filter(({ winner }) => winner === "candidate").length;
        const draws = subset.filter(({ winner }) => winner === "draw").length;
        const losses = subset.filter(({ winner }) => winner === "baseline").length;
        return { country, games: 80, wins, draws, losses, winProbability: wins / 80, drawProbability: draws / 80 };
    });
    const winInterval = interval(familyResults.map(({ winProbability }) => winProbability), "lower");
    const drawInterval = interval(familyResults.map(({ drawProbability }) => drawProbability), "upper");
    const allied = new Set(["Americans", "Alliance", "French", "Germans", "British"]);
    const alliedRows = rows.filter(({ country }) => allied.has(country));
    const sovietRows = rows.filter(({ country }) => !allied.has(country));
    const advancementChecks = {
        familyClustered80LowerWinProbabilityAboveHalf: winInterval.bound > 0.5,
        alliedPooledWinProbabilityAboveHalf:
            alliedRows.filter(({ winner }) => winner === "candidate").length / alliedRows.length > 0.5,
        sovietPooledWinProbabilityAboveHalf:
            sovietRows.filter(({ winner }) => winner === "candidate").length / sovietRows.length > 0.5,
        winsExceedLossesInEveryCountry: countryResults.every(({ wins, losses }) => wins > losses),
        familyClustered80UpperDrawProbabilityBelowPointFour: drawInterval.bound < 0.4,
        allLaunchesTechnicallyClean: true,
    };
    const advanced = Object.values(advancementChecks).every(Boolean);
    const output = {
        schemaVersion: 1,
        status: advanced
            ? "ADVANCE_TERMINAL_OBJECTIVE_TO_SEALED_CONFIRMATORY_EVALUATION"
            : "DO_NOT_ADVANCE_TERMINAL_OBJECTIVE_FROM_FRESH_DEVELOPMENT",
        generatedAt: new Date().toISOString(),
        interpretationBoundary: "fresh-development-selection-only-not-paper-evidence",
        campaignPath,
        campaignSha256: sha256File(campaignPath),
        technicalGatePath,
        technicalGateSha256: sha256File(technicalGatePath),
        resultArtifactCommitmentSha256: artifactCommitment,
        arrayJobId,
        schedulerAccount: "pi_jss233",
        gameCount: rows.length,
        familyCount: TERMINAL_FRESH_DEVELOPMENT_FAMILY_COUNT,
        countryCount: 9,
        wins: rows.filter(({ winner }) => winner === "candidate").length,
        draws: rows.filter(({ winner }) => winner === "draw").length,
        losses: rows.filter(({ winner }) => winner === "baseline").length,
        familyClusteredWinProbability: winInterval,
        familyClusteredDrawProbability: drawInterval,
        alliedPooledWinProbability:
            alliedRows.filter(({ winner }) => winner === "candidate").length / alliedRows.length,
        sovietPooledWinProbability:
            sovietRows.filter(({ winner }) => winner === "candidate").length / sovietRows.length,
        familyResults,
        countryResults,
        advancementChecks,
        advanced,
    };
    fs.mkdirSync(path.dirname(outputPath), { recursive: true, mode: 0o700 });
    fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`, { flag: "wx", mode: 0o600 });
    console.log(JSON.stringify({ outputPath, outputSha256: sha256File(outputPath), status: output.status, advanced }));
};

const invoked = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (import.meta.url === invoked) { try { main(); } catch (error) { console.error(error); process.exitCode = 1; } }
