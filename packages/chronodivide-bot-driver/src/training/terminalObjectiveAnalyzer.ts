import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
    TERMINAL_OBJECTIVE_ARM_ORDER,
    TerminalObjectiveArmId,
} from "./terminalObjectivePolicy.js";
import {
    TERMINAL_OBJECTIVE_COUNTRIES,
    TERMINAL_OBJECTIVE_FAMILY_COUNT,
    TERMINAL_OBJECTIVE_LAUNCH_COUNT,
    TERMINAL_OBJECTIVE_ONE_SIDED_80_T_CRITICAL_DF9,
    TerminalObjectiveCampaign,
} from "./terminalObjectiveCampaign.js";
import {
    terminalObjectiveResultArtifactCommitmentSha256,
    validateTerminalObjectiveCampaign,
} from "./terminalObjectiveTechnicalGate.js";
import { sha256File } from "./terminalObjectivePlanRunner.js";

type RecordValue = Record<string, unknown>;
type Outcome = "candidate" | "baseline" | "draw";
type Observation = {
    shardIndex: number;
    familyId: string;
    country: string;
    seedBlockIndex: number;
    candidateSlot: 0 | 1;
    armId: TerminalObjectiveArmId;
    outcome: Outcome;
    score: number;
    ticks: number;
    telemetry: RecordValue[];
};

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
const outcomeCounts = (rows: readonly Observation[]) => ({
    games: rows.length,
    wins: rows.filter(({ outcome }) => outcome === "candidate").length,
    draws: rows.filter(({ outcome }) => outcome === "draw").length,
    losses: rows.filter(({ outcome }) => outcome === "baseline").length,
    score: mean(rows.map(({ score }) => score)),
    meanTicks: mean(rows.map(({ ticks }) => ticks)),
});

const parseObservations = (
    campaign: TerminalObjectiveCampaign,
    resultsRoot: string,
    arrayJobId: string,
): Observation[] => {
    const observations: Observation[] = [];
    for (const shard of campaign.shards) {
        const eventsPath = path.join(resultsRoot, `${arrayJobId}_${shard.shardIndex}`, "run", "events.jsonl");
        const events = fs.readFileSync(eventsPath, "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line) as unknown);
        const completions = events.filter((event) => isRecord(event) && event.event === "episode_complete") as RecordValue[];
        if (completions.length !== shard.launchedGameCount) {
            throw new Error(`Terminal-objective shard ${shard.shardIndex} completion count drifted after its gate`);
        }
        for (const completion of completions) {
            const result = completion.result;
            if (!isRecord(result) || typeof completion.launchIndex !== "number") {
                throw new Error(`Terminal-objective shard ${shard.shardIndex} has a malformed completion`);
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
            ) throw new Error(`Terminal-objective shard ${shard.shardIndex} completion is not analyzable`);
            observations.push({
                shardIndex: shard.shardIndex,
                familyId: shard.familyId,
                country: shard.country,
                seedBlockIndex: shard.seedBlockIndex,
                candidateSlot: episode.candidateSlot,
                armId: episode.armId,
                outcome: result.winner,
                score: result.winner === "candidate" ? 1 : result.winner === "baseline" ? 0 : 0.5,
                ticks: result.ticks as number,
                telemetry: result.policyTelemetry.filter(isRecord),
            });
        }
    }
    if (observations.length !== TERMINAL_OBJECTIVE_LAUNCH_COUNT) {
        throw new Error(`Terminal-objective analysis accounted for ${observations.length}/${TERMINAL_OBJECTIVE_LAUNCH_COUNT} games`);
    }
    return observations;
};

const main = (): void => {
    const campaignPath = requiredPath("CAMPAIGN");
    const resultsRoot = requiredPath("RESULTS_ROOT");
    const technicalGatePath = requiredPath("TECHNICAL_GATE");
    const outputPath = requiredPath("OUT_FILE");
    if (fs.existsSync(outputPath)) throw new Error(`Refusing to overwrite terminal-objective analysis ${outputPath}`);
    const campaign = validateTerminalObjectiveCampaign(readJson(campaignPath));
    const gate = readJson(technicalGatePath);
    if (
        !isRecord(gate) || gate.status !== "PASSED_TERMINAL_OBJECTIVE_LITERAL_ENDPOINT_TECHNICAL_GATE_OUTCOMES_NOT_SUMMARIZED" ||
        gate.campaignSha256 !== sha256File(campaignPath) || gate.arrayJobId === undefined ||
        gate.schedulerAccount !== "pi_jss233" || gate.accountedLaunches !== TERMINAL_OBJECTIVE_LAUNCH_COUNT ||
        gate.technicalFailures !== 0 || gate.endpointViolations !== 0 || gate.informationBoundaryViolations !== 0 ||
        gate.authorizedNextPhase !== "terminal-objective-open-development-analysis"
    ) throw new Error("Terminal-objective technical gate does not authorize outcome analysis");
    const arrayJobId = String(gate.arrayJobId);
    const artifactCommitment = terminalObjectiveResultArtifactCommitmentSha256(campaign, resultsRoot, arrayJobId);
    if (gate.resultArtifactCommitmentSha256 !== artifactCommitment) {
        throw new Error("Terminal-objective result artifacts changed after their technical gate");
    }
    const observations = parseObservations(campaign, resultsRoot, arrayJobId);
    const families = campaign.selectedFamilies.map(({ familyId }) => familyId);
    const byArm = TERMINAL_OBJECTIVE_ARM_ORDER.map((armId) => {
        const rows = observations.filter((row) => row.armId === armId);
        const familyMeans = families.map((familyId) => ({
            familyId,
            score: mean(rows.filter((row) => row.familyId === familyId).map(({ score }) => score)),
        }));
        const macroScore = mean(familyMeans.map(({ score }) => score));
        const standardError = sampleSd(familyMeans.map(({ score }) => score)) / Math.sqrt(TERMINAL_OBJECTIVE_FAMILY_COUNT);
        return {
            armId,
            ...outcomeCounts(rows),
            familyMacroScore: macroScore,
            familyMacroScoreMargin: macroScore - 0.5,
            oneSidedFamilyClustered80LowerScoreMargin:
                macroScore - 0.5 - TERMINAL_OBJECTIVE_ONE_SIDED_80_T_CRITICAL_DF9 * standardError,
            familyMeans,
            countries: TERMINAL_OBJECTIVE_COUNTRIES.map((country) => ({
                country,
                ...outcomeCounts(rows.filter((row) => row.country === country)),
            })),
        };
    });
    const full = byArm.find(({ armId }) => armId === "full_sufficient_strike") as typeof byArm[number];
    const prior = byArm.find(({ armId }) => armId === "selected_prior") as typeof byArm[number];
    const pairedFamilyEffects = families.map((familyId) => ({
        familyId,
        effect: (full.familyMeans.find((row) => row.familyId === familyId) as { score: number }).score -
            (prior.familyMeans.find((row) => row.familyId === familyId) as { score: number }).score,
    }));
    const leaveOneFamilyOut = families.map((excludedFamilyId) => {
        const retained = full.familyMeans.filter(({ familyId }) => familyId !== excludedFamilyId);
        return { excludedFamilyId, scoreMargin: mean(retained.map(({ score }) => score)) - 0.5 };
    });
    const fullRows = observations.filter(({ armId }) => armId === "full_sufficient_strike");
    const mechanismEventCounts: Record<string, number> = {};
    for (const { telemetry } of fullRows) for (const event of telemetry) {
        const key = `${String(event.event)}:${String(event.decisionKind ?? "none")}`;
        mechanismEventCounts[key] = (mechanismEventCounts[key] ?? 0) + 1;
    }
    const advancementChecks = {
        familyClustered80LowerScoreMarginPositive: full.oneSidedFamilyClustered80LowerScoreMargin > 0,
        literalWinsExceedLossesOverall: full.wins > full.losses,
        countriesWithWinsExceedingLossesAtLeastSeven:
            full.countries.filter(({ wins, losses }) => wins > losses).length >= 7,
        everyLeaveOneFamilyOutScoreMarginPositive: leaveOneFamilyOut.every(({ scoreMargin }) => scoreMargin > 0),
        positiveFamilyMacroPairedEffectOverSelectedPrior: mean(pairedFamilyEffects.map(({ effect }) => effect)) > 0,
        allLaunchesTechnicallyClean: true,
    };
    const advanced = Object.values(advancementChecks).every(Boolean);
    const output = {
        schemaVersion: 1,
        status: advanced
            ? "ADVANCE_TERMINAL_OBJECTIVE_TO_CONFIRMATORY_DESIGN"
            : "DO_NOT_ADVANCE_TERMINAL_OBJECTIVE_FROM_OPEN_DEVELOPMENT",
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
        familyCount: TERMINAL_OBJECTIVE_FAMILY_COUNT,
        countryCount: TERMINAL_OBJECTIVE_COUNTRIES.length,
        armResults: byArm,
        fullVsPrior: {
            familyMacroPairedEffect: mean(pairedFamilyEffects.map(({ effect }) => effect)),
            pairedFamilyEffects,
        },
        leaveOneFamilyOut,
        fullMechanismEventCounts: mechanismEventCounts,
        advancementChecks,
        advanced,
    };
    fs.mkdirSync(path.dirname(outputPath), { recursive: true, mode: 0o700 });
    fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`, { flag: "wx", mode: 0o600 });
    console.log(JSON.stringify({ outputPath, outputSha256: sha256File(outputPath), status: output.status, advanced }));
};

const invoked = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (import.meta.url === invoked) { try { main(); } catch (error) { console.error(error); process.exitCode = 1; } }
