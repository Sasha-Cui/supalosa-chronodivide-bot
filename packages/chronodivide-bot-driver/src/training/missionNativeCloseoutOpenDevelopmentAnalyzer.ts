import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
    MISSION_NATIVE_CLOSEOUT_ARM_ORDER,
    MissionNativeCloseoutArmId,
} from "./missionNativeCloseoutExperimentPolicy.js";
import {
    MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_COUNTRIES,
    MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_FAMILY_COUNT,
    MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_LAUNCH_COUNT,
    MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_ONE_SIDED_80_T_CRITICAL_DF9,
    MissionNativeCloseoutOpenDevelopmentCampaign,
} from "./missionNativeCloseoutOpenDevelopmentCampaign.js";
import {
    missionNativeCloseoutOpenDevelopmentResultArtifactCommitmentSha256,
    validateMissionNativeCloseoutOpenDevelopmentCampaign,
} from "./missionNativeCloseoutOpenDevelopmentTechnicalGate.js";
import { sha256File } from "./missionNativeCloseoutOpenDevelopmentPlanRunner.js";

type RecordValue = Record<string, unknown>;
type Outcome = "candidate" | "baseline" | "draw";
type Observation = {
    shardIndex: number;
    familyId: string;
    country: string;
    faction: "Allied" | "Soviet";
    seedBlockIndex: number;
    candidateSlot: 0 | 1;
    armId: MissionNativeCloseoutArmId;
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
    campaign: MissionNativeCloseoutOpenDevelopmentCampaign,
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
            throw new Error(`Mission-native closeout open-development shard ${shard.shardIndex} completion count drifted after its gate`);
        }
        for (const completion of completions) {
            const result = completion.result;
            if (!isRecord(result) || typeof completion.launchIndex !== "number") {
                throw new Error(`Mission-native closeout open-development shard ${shard.shardIndex} has a malformed completion`);
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
            ) throw new Error(`Mission-native closeout open-development shard ${shard.shardIndex} completion is not analyzable`);
            observations.push({
                shardIndex: shard.shardIndex,
                familyId: shard.familyId,
                country: shard.country,
                faction: ALLIED.has(shard.country) ? "Allied" : "Soviet",
                seedBlockIndex: shard.seedBlockIndex,
                candidateSlot: episode.candidateSlot,
                armId: episode.armId as MissionNativeCloseoutArmId,
                outcome: result.winner,
                literalWin: result.winner === "candidate" ? 1 : 0,
                score: result.winner === "candidate" ? 1 : result.winner === "baseline" ? 0 : 0.5,
                ticks: result.ticks as number,
                telemetry: result.policyTelemetry.filter(isRecord),
            });
        }
    }
    if (observations.length !== MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_LAUNCH_COUNT) {
        throw new Error(`Mission-native closeout open-development analysis accounted for ${observations.length}/${MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_LAUNCH_COUNT} games`);
    }
    return observations;
};

const main = (): void => {
    const campaignPath = requiredPath("CAMPAIGN");
    const resultsRoot = requiredPath("RESULTS_ROOT");
    const technicalGatePath = requiredPath("TECHNICAL_GATE");
    const outputPath = requiredPath("OUT_FILE");
    if (fs.existsSync(outputPath)) throw new Error(`Refusing to overwrite mission-native-closeout-open-development analysis ${outputPath}`);
    const campaign = validateMissionNativeCloseoutOpenDevelopmentCampaign(readJson(campaignPath));
    const gate = readJson(technicalGatePath);
    if (
        !isRecord(gate) || gate.status !== "PASSED_MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_LITERAL_ENDPOINT_TECHNICAL_GATE_OUTCOMES_NOT_SUMMARIZED" ||
        gate.campaignSha256 !== sha256File(campaignPath) || gate.arrayJobId === undefined ||
        gate.schedulerAccount !== "pi_jss233" || gate.accountedLaunches !== MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_LAUNCH_COUNT ||
        gate.technicalFailures !== 0 || gate.endpointViolations !== 0 || gate.informationBoundaryViolations !== 0 ||
        gate.authorizedNextPhase !== "mission-native-closeout-open-development-analysis"
    ) throw new Error("Mission-native closeout open-development technical gate does not authorize outcome analysis");
    const arrayJobId = String(gate.arrayJobId);
    const artifactCommitment = missionNativeCloseoutOpenDevelopmentResultArtifactCommitmentSha256(campaign, resultsRoot, arrayJobId);
    if (gate.resultArtifactCommitmentSha256 !== artifactCommitment) {
        throw new Error("Mission-native closeout open-development result artifacts changed after their technical gate");
    }
    const observations = parseObservations(campaign, resultsRoot, arrayJobId);
    const families = campaign.selectedFamilies.map(({ familyId }) => familyId);
    const byArm = MISSION_NATIVE_CLOSEOUT_ARM_ORDER.map((armId) => {
        const rows = observations.filter((row) => row.armId === armId);
        const familyMeans = families.map((familyId) => ({
            familyId,
            literalWinProbability: mean(rows.filter((row) => row.familyId === familyId)
                .map(({ literalWin }) => literalWin)),
            literalScore: mean(rows.filter((row) => row.familyId === familyId)
                .map(({ score }) => score)),
            drawProbability: mean(rows.filter((row) => row.familyId === familyId)
                .map(({ outcome }) => Number(outcome === "draw"))),
        }));
        const familyValues = familyMeans.map(({ literalWinProbability }) => literalWinProbability);
        const familyMacroWinProbability = mean(familyValues);
        const standardError = sampleSd(familyValues) / Math.sqrt(MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_FAMILY_COUNT);
        return {
            armId,
            policyId: campaign.arms.find((arm) => arm.armId === armId)!.policyId,
            ...outcomeCounts(rows),
            familyMacroWinProbability,
            oneSidedFamilyClustered80LowerWinProbability:
                familyMacroWinProbability - MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_ONE_SIDED_80_T_CRITICAL_DF9 * standardError,
            familyMeans,
            factions: (["Allied", "Soviet"] as const).map((faction) => ({
                faction,
                ...outcomeCounts(rows.filter((row) => row.faction === faction)),
            })),
            countries: MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_COUNTRIES.map((country) => ({
                country,
                ...outcomeCounts(rows.filter((row) => row.country === country)),
            })),
        };
    });
    const externalControl = byArm.find(({ armId }) => armId === "external_supalosa_control")!;
    const v34Control = byArm.find(({ armId }) => armId === "mission_native_v34_no_deadline")!;
    const selected = byArm.find(({ armId }) => armId === "mission_native_v35_deadline")!;
    const pairedAgainst = (control: typeof selected) => {
        const pairedFamilyEffects = families.map((familyId) => {
            const selectedFamily = selected.familyMeans.find((row) => row.familyId === familyId)!;
            const controlFamily = control.familyMeans.find((row) => row.familyId === familyId)!;
            return {
                familyId,
                literalScoreEffect: selectedFamily.literalScore - controlFamily.literalScore,
                literalWinProbabilityEffect:
                    selectedFamily.literalWinProbability - controlFamily.literalWinProbability,
                drawProbabilityEffect: selectedFamily.drawProbability - controlFamily.drawProbability,
            };
        });
        return {
            controlArmId: control.armId,
            familyMacroPairedLiteralScoreEffect:
                mean(pairedFamilyEffects.map(({ literalScoreEffect }) => literalScoreEffect)),
            familyMacroPairedLiteralWinEffect:
                mean(pairedFamilyEffects.map(({ literalWinProbabilityEffect }) => literalWinProbabilityEffect)),
            familyMacroPairedDrawProbabilityEffect:
                mean(pairedFamilyEffects.map(({ drawProbabilityEffect }) => drawProbabilityEffect)),
            pairedFamilyEffects,
        };
    };
    const selectedVersusExternal = pairedAgainst(externalControl);
    const selectedVersusV34 = pairedAgainst(v34Control);
    const primaryFamilyEffects = selectedVersusExternal.pairedFamilyEffects
        .map(({ literalScoreEffect }) => literalScoreEffect);
    const primaryEffect = mean(primaryFamilyEffects);
    const primaryStandardError = sampleSd(primaryFamilyEffects) /
        Math.sqrt(MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_FAMILY_COUNT);
    const primaryOneSided80LowerBound = primaryEffect -
        MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_ONE_SIDED_80_T_CRITICAL_DF9 * primaryStandardError;
    const leaveOneFamilyOut = families.map((omittedFamilyId) => ({
        omittedFamilyId,
        literalScoreEffect: mean(selectedVersusExternal.pairedFamilyEffects
            .filter(({ familyId }) => familyId !== omittedFamilyId)
            .map(({ literalScoreEffect }) => literalScoreEffect)),
    }));
    const selectedAllied = selected.factions.find(({ faction }) => faction === "Allied")!;
    const selectedSoviet = selected.factions.find(({ faction }) => faction === "Soviet")!;
    const advancementChecks = {
        primaryFamilyClustered80LowerPairedScoreEffectAboveZero: primaryOneSided80LowerBound > 0,
        v35LiteralWinsExceedLossesOverall: selected.wins > selected.losses,
        v35AlliedLiteralWinsExceedLosses: selectedAllied.wins > selectedAllied.losses,
        v35SovietLiteralWinsExceedLosses: selectedSoviet.wins > selectedSoviet.losses,
        countriesWithV35WinsExceedingLossesAtLeastSeven:
            selected.countries.filter(({ wins, losses }) => wins > losses).length >= 7,
        positiveFamilyMacroLiteralWinEffectOverExternal:
            selectedVersusExternal.familyMacroPairedLiteralWinEffect > 0,
        positiveFamilyMacroLiteralWinEffectOverV34:
            selectedVersusV34.familyMacroPairedLiteralWinEffect > 0,
        lowerFamilyMacroDrawProbabilityThanExternal:
            selectedVersusExternal.familyMacroPairedDrawProbabilityEffect < 0,
        lowerFamilyMacroDrawProbabilityThanV34:
            selectedVersusV34.familyMacroPairedDrawProbabilityEffect < 0,
        everyLeaveOneFamilyOutPrimaryEffectPositive:
            leaveOneFamilyOut.every(({ literalScoreEffect }) => literalScoreEffect > 0),
        allLaunchesTechnicallyClean: true,
    };
    const advanced = Object.values(advancementChecks).every(Boolean);
    const ranked = byArm.slice().sort((left, right) => right.score - left.score ||
        right.wins - right.losses - (left.wins - left.losses) || left.policyId.localeCompare(right.policyId));
    const selectedRows = observations.filter(({ armId }) => armId === selected.armId);
    const mechanismEventCounts: Record<string, number> = {};
    const physicalProgressCounts: Record<string, number> = {};
    const deadlinePhaseCounts: Record<string, number> = {};
    for (const { telemetry } of selectedRows) for (const event of telemetry) {
        const key = `${String(event.event)}:${String(event.phase ?? "none")}`;
        mechanismEventCounts[key] = (mechanismEventCounts[key] ?? 0) + 1;
        if (typeof event.progressKind === "string") {
            physicalProgressCounts[event.progressKind] = (physicalProgressCounts[event.progressKind] ?? 0) + 1;
        }
        if (event.event === "objective_progress_deadline" && typeof event.phase === "string") {
            deadlinePhaseCounts[event.phase] = (deadlinePhaseCounts[event.phase] ?? 0) + 1;
        }
    }
    const output = {
        schemaVersion: 1,
        status: advanced
            ? "ADVANCE_MISSION_NATIVE_CLOSEOUT_V35_TO_CONFIRMATORY_EVALUATION"
            : "DO_NOT_ADVANCE_MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_FROM_OPEN_DEVELOPMENT",
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
        familyCount: MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_FAMILY_COUNT,
        countryCount: MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_COUNTRIES.length,
        armResults: byArm,
        ranking: ranked.map(({ armId }) => armId),
        primaryEstimand: {
            comparison: "mission_native_v35_deadline_minus_external_supalosa_control",
            unit: "family",
            familyEffects: selectedVersusExternal.pairedFamilyEffects,
            meanPairedLiteralScoreEffect: primaryEffect,
            oneSidedFamilyClustered80LowerBound: primaryOneSided80LowerBound,
            leaveOneFamilyOut,
        },
        pairedEffectsOverControls: [selectedVersusExternal, selectedVersusV34],
        selectedArmId: selected.armId,
        selectedPolicyId: selected.policyId,
        selectedMechanismDiagnostics: {
            eventCounts: mechanismEventCounts,
            physicalProgressCounts,
            deadlinePhaseCounts,
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
