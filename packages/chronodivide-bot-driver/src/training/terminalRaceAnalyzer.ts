import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
    TERMINAL_RACE_ARM_ORDER,
    TerminalRaceArmId,
} from "./terminalRacePolicy.js";
import {
    TERMINAL_RACE_COUNTRIES,
    TERMINAL_RACE_FAMILY_COUNT,
    TERMINAL_RACE_LAUNCH_COUNT,
    TERMINAL_RACE_ONE_SIDED_80_T_CRITICAL_DF9,
    TerminalRaceCampaign,
} from "./terminalRaceCampaign.js";
import {
    terminalRaceResultArtifactCommitmentSha256,
    validateTerminalRaceCampaign,
} from "./terminalRaceTechnicalGate.js";
import { sha256File } from "./terminalRacePlanRunner.js";

type RecordValue = Record<string, unknown>;
type Outcome = "candidate" | "baseline" | "draw";
type Observation = {
    shardIndex: number;
    familyId: string;
    country: string;
    faction: "Allied" | "Soviet";
    seedBlockIndex: number;
    candidateSlot: 0 | 1;
    armId: TerminalRaceArmId;
    outcome: Outcome;
    literalWin: number;
    score: number;
    ticks: number;
    telemetry: RecordValue[];
};

const ALLIED = new Set(["Americans", "Alliance", "French", "Germans", "British"]);
const isRecord = (value: unknown): value is RecordValue =>
    typeof value === "object" && value !== null && !Array.isArray(value);
const readJson = (filePath: string): unknown => JSON.parse(fs.readFileSync(filePath, "utf8"));
const requiredPath = (name: string): string => {
    const value = process.env[name];
    if (!value) throw new Error(`${name} is required`);
    return path.resolve(value);
};
const mean = (values: readonly number[]): number => {
    if (values.length === 0) throw new Error("Cannot calculate an empty mean");
    return values.reduce((sum, value) => sum + value, 0) / values.length;
};
const sampleSd = (values: readonly number[]): number => {
    if (values.length < 2) throw new Error("Sample standard deviation requires at least two values");
    const center = mean(values);
    return Math.sqrt(values.reduce((sum, value) => sum + (value - center) ** 2, 0) / (values.length - 1));
};
const median = (values: readonly number[]): number | null => {
    if (values.length === 0) return null;
    const sorted = values.slice().sort((left, right) => left - right);
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
};
const outcomeCounts = (rows: readonly Observation[]) => ({
    games: rows.length,
    wins: rows.filter(({ outcome }) => outcome === "candidate").length,
    draws: rows.filter(({ outcome }) => outcome === "draw").length,
    losses: rows.filter(({ outcome }) => outcome === "baseline").length,
    literalWinProbability: mean(rows.map(({ literalWin }) => literalWin)),
    score: mean(rows.map(({ score }) => score)),
    meanTicks: mean(rows.map(({ ticks }) => ticks)),
    medianLiteralWinTick: median(rows.filter(({ outcome }) => outcome === "candidate").map(({ ticks }) => ticks)),
});

const parseObservations = (
    campaign: TerminalRaceCampaign,
    resultsRoot: string,
    arrayJobId: string,
): Observation[] => {
    const observations: Observation[] = [];
    for (const shard of campaign.shards) {
        const eventsPath = path.join(resultsRoot, `${arrayJobId}_${shard.shardIndex}`, "run", "events.jsonl");
        const events = fs.readFileSync(eventsPath, "utf8").split("\n").filter(Boolean)
            .map((line) => JSON.parse(line) as unknown);
        const completions = events.filter((event) => isRecord(event) && event.event === "episode_complete") as RecordValue[];
        if (completions.length !== shard.launchedGameCount) {
            throw new Error(`Terminal-race shard ${shard.shardIndex} completion count drifted after its gate`);
        }
        for (const completion of completions) {
            const result = completion.result;
            if (!isRecord(result) || typeof completion.launchIndex !== "number") {
                throw new Error(`Terminal-race shard ${shard.shardIndex} has a malformed completion`);
            }
            const episode = campaign.arms.flatMap((arm, armIndex) => ([0, 1] as const).map((candidateSlot) => ({
                armId: arm.armId,
                launchIndex: armIndex * 2 + candidateSlot,
                candidateSlot,
            }))).find(({ launchIndex }) => launchIndex === completion.launchIndex);
            if (
                !episode || (result.winner !== "candidate" && result.winner !== "baseline" && result.winner !== "draw") ||
                !Number.isSafeInteger(result.ticks) || (result.ticks as number) < 1 ||
                !Array.isArray(result.policyTelemetry)
            ) throw new Error(`Terminal-race shard ${shard.shardIndex} completion is not analyzable`);
            observations.push({
                shardIndex: shard.shardIndex,
                familyId: shard.familyId,
                country: shard.country,
                faction: ALLIED.has(shard.country) ? "Allied" : "Soviet",
                seedBlockIndex: shard.seedBlockIndex,
                candidateSlot: episode.candidateSlot,
                armId: episode.armId,
                outcome: result.winner,
                literalWin: result.winner === "candidate" ? 1 : 0,
                score: result.winner === "candidate" ? 1 : result.winner === "baseline" ? 0 : 0.5,
                ticks: result.ticks as number,
                telemetry: result.policyTelemetry.filter(isRecord),
            });
        }
    }
    if (observations.length !== TERMINAL_RACE_LAUNCH_COUNT) {
        throw new Error(`Terminal-race analysis accounted for ${observations.length}/${TERMINAL_RACE_LAUNCH_COUNT} games`);
    }
    return observations;
};

const main = (): void => {
    const campaignPath = requiredPath("CAMPAIGN");
    const resultsRoot = requiredPath("RESULTS_ROOT");
    const technicalGatePath = requiredPath("TECHNICAL_GATE");
    const outputPath = requiredPath("OUT_FILE");
    if (fs.existsSync(outputPath)) throw new Error(`Refusing to overwrite terminal-race analysis ${outputPath}`);
    const campaign = validateTerminalRaceCampaign(readJson(campaignPath));
    const gate = readJson(technicalGatePath);
    if (
        !isRecord(gate) || gate.status !== "PASSED_TERMINAL_RACE_LITERAL_ENDPOINT_TECHNICAL_GATE_OUTCOMES_NOT_SUMMARIZED" ||
        gate.campaignSha256 !== sha256File(campaignPath) || gate.arrayJobId === undefined ||
        gate.schedulerAccount !== "pi_jss233" || gate.accountedLaunches !== TERMINAL_RACE_LAUNCH_COUNT ||
        gate.technicalFailures !== 0 || gate.endpointViolations !== 0 || gate.informationBoundaryViolations !== 0 ||
        gate.authorizedNextPhase !== "terminal-race-open-development-analysis"
    ) throw new Error("Terminal-race technical gate does not authorize outcome analysis");
    const arrayJobId = String(gate.arrayJobId);
    const artifactCommitment = terminalRaceResultArtifactCommitmentSha256(campaign, resultsRoot, arrayJobId);
    if (gate.resultArtifactCommitmentSha256 !== artifactCommitment) {
        throw new Error("Terminal-race result artifacts changed after their technical gate");
    }
    const observations = parseObservations(campaign, resultsRoot, arrayJobId);
    const families = campaign.selectedFamilies.map(({ familyId }) => familyId);
    const byArm = TERMINAL_RACE_ARM_ORDER.map((armId) => {
        const rows = observations.filter((row) => row.armId === armId);
        const familyMeans = families.map((familyId) => ({
            familyId,
            literalWinProbability: mean(rows.filter((row) => row.familyId === familyId)
                .map(({ literalWin }) => literalWin)),
        }));
        const familyValues = familyMeans.map(({ literalWinProbability }) => literalWinProbability);
        const familyMacroWinProbability = mean(familyValues);
        const standardError = sampleSd(familyValues) / Math.sqrt(TERMINAL_RACE_FAMILY_COUNT);
        return {
            armId,
            policyId: campaign.arms.find((arm) => arm.armId === armId)!.policyId,
            ...outcomeCounts(rows),
            familyMacroWinProbability,
            oneSidedFamilyClustered80LowerWinProbability:
                familyMacroWinProbability - TERMINAL_RACE_ONE_SIDED_80_T_CRITICAL_DF9 * standardError,
            familyMeans,
            factions: (["Allied", "Soviet"] as const).map((faction) => ({
                faction,
                ...outcomeCounts(rows.filter((row) => row.faction === faction)),
            })),
            countries: TERMINAL_RACE_COUNTRIES.map((country) => ({
                country,
                ...outcomeCounts(rows.filter((row) => row.country === country)),
            })),
        };
    });
    const control = byArm.find(({ armId }) => armId === "baseline_control")!;
    const enabled = byArm.filter(({ armId }) => armId !== "baseline_control");
    const paired = enabled.map((arm) => {
        const pairedFamilyEffects = families.map((familyId) => ({
            familyId,
            effect: arm.familyMeans.find((row) => row.familyId === familyId)!.literalWinProbability -
                control.familyMeans.find((row) => row.familyId === familyId)!.literalWinProbability,
        }));
        return {
            armId: arm.armId,
            familyMacroPairedLiteralWinEffect: mean(pairedFamilyEffects.map(({ effect }) => effect)),
            pairedFamilyEffects,
        };
    });
    const ranked = enabled.slice().sort((left, right) => {
        const leftMinFaction = Math.min(...left.factions.map(({ literalWinProbability }) => literalWinProbability));
        const rightMinFaction = Math.min(...right.factions.map(({ literalWinProbability }) => literalWinProbability));
        return rightMinFaction - leftMinFaction ||
            right.familyMacroWinProbability - left.familyMacroWinProbability ||
            (right.wins - right.losses) / right.games - (left.wins - left.losses) / left.games ||
            right.countries.filter(({ wins, losses }) => wins > losses).length -
                left.countries.filter(({ wins, losses }) => wins > losses).length ||
            left.draws / left.games - right.draws / right.games ||
            (left.medianLiteralWinTick ?? Number.POSITIVE_INFINITY) -
                (right.medianLiteralWinTick ?? Number.POSITIVE_INFINITY) ||
            left.policyId.localeCompare(right.policyId);
    });
    const selected = ranked[0];
    const selectedPaired = paired.find(({ armId }) => armId === selected.armId)!;
    const advancementChecks = {
        familyClustered80LowerLiteralWinProbabilityAboveHalf:
            selected.oneSidedFamilyClustered80LowerWinProbability > 0.5,
        literalWinsExceedLossesOverall: selected.wins > selected.losses,
        alliedLiteralWinProbabilityAboveHalf:
            selected.factions.find(({ faction }) => faction === "Allied")!.literalWinProbability > 0.5,
        sovietLiteralWinProbabilityAboveHalf:
            selected.factions.find(({ faction }) => faction === "Soviet")!.literalWinProbability > 0.5,
        countriesWithWinsExceedingLossesAtLeastSeven:
            selected.countries.filter(({ wins, losses }) => wins > losses).length >= 7,
        positiveFamilyMacroPairedLiteralWinEffectOverControl:
            selectedPaired.familyMacroPairedLiteralWinEffect > 0,
        allLaunchesTechnicallyClean: true,
    };
    const advanced = Object.values(advancementChecks).every(Boolean);
    const selectedRows = observations.filter(({ armId }) => armId === selected.armId);
    const mechanismEventCounts: Record<string, number> = {};
    const activationReasonCounts: Record<string, number> = {};
    const delegatedActionCounts = { idle: 0, moving: 0, attacking: 0, other: 0 };
    const rejectionCounts: Record<string, number> = {};
    for (const { telemetry } of selectedRows) for (const event of telemetry) {
        const key = `${String(event.event)}:${String(event.decisionKind ?? "none")}`;
        mechanismEventCounts[key] = (mechanismEventCounts[key] ?? 0) + 1;
        if (typeof event.activationReason === "string") {
            activationReasonCounts[event.activationReason] = (activationReasonCounts[event.activationReason] ?? 0) + 1;
        }
        if (isRecord(event.delegatedActionCounts)) for (const action of Object.keys(delegatedActionCounts)) {
            const value = event.delegatedActionCounts[action];
            if (Number.isSafeInteger(value)) delegatedActionCounts[action as keyof typeof delegatedActionCounts] += value as number;
        }
        if (isRecord(event.rejectedAttackerCountsByReason)) for (const [reason, value] of
            Object.entries(event.rejectedAttackerCountsByReason)) {
            if (Number.isSafeInteger(value)) rejectionCounts[reason] = (rejectionCounts[reason] ?? 0) + (value as number);
        }
    }
    const output = {
        schemaVersion: 1,
        status: advanced
            ? "ADVANCE_TERMINAL_RACE_TO_FRESH_DEVELOPMENT"
            : "DO_NOT_ADVANCE_TERMINAL_RACE_FROM_OPEN_DEVELOPMENT",
        generatedAt: new Date().toISOString(),
        interpretationBoundary: "open-development-only-no-paper-claim",
        campaignPath,
        campaignSha256: sha256File(campaignPath),
        technicalGatePath,
        technicalGateSha256: sha256File(technicalGatePath),
        resultArtifactCommitmentSha256: artifactCommitment,
        arrayJobId,
        schedulerAccount: "pi_jss233",
        gameCount: observations.length,
        familyCount: TERMINAL_RACE_FAMILY_COUNT,
        countryCount: TERMINAL_RACE_COUNTRIES.length,
        armResults: byArm,
        ranking: ranked.map(({ armId }) => armId),
        pairedEffectsOverBaselineControl: paired,
        selectedArmId: selected.armId,
        selectedPolicyId: selected.policyId,
        selectedMechanismDiagnostics: {
            eventCounts: mechanismEventCounts,
            activationReasonCounts,
            delegatedActionCounts,
            rejectionCounts,
        },
        advancementChecks,
        advanced,
    };
    fs.mkdirSync(path.dirname(outputPath), { recursive: true, mode: 0o700 });
    fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`, { flag: "wx", mode: 0o600 });
    console.log(JSON.stringify({ outputPath, outputSha256: sha256File(outputPath), status: output.status, advanced }));
};

const invoked = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (import.meta.url === invoked) { try { main(); } catch (error) { console.error(error); process.exitCode = 1; } }
