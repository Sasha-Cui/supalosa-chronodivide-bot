import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { ProgressCertifiedEpisodeResult } from "./progressCertifiedEpisode.js";
import { validateProgressCertifiedResult } from "./progressCertifiedTechnicalGate.js";
import { parseProgressCertifiedRunPlan, sha256File } from "./progressCertifiedPlanRunner.js";
import {
    PROGRESS_CERTIFIED_V5_REPAIR_CONFIRMATORY_FAMILY_COUNT,
    PROGRESS_CERTIFIED_V5_REPAIR_CONFIRMATORY_LAUNCH_COUNT,
    PROGRESS_CERTIFIED_V5_REPAIR_CONFIRMATORY_ONE_SIDED_95_T_CRITICAL_DF52,
    PROGRESS_CERTIFIED_V5_REPAIR_CONFIRMATORY_SHARD_COUNT,
    PROGRESS_CERTIFIED_V5_REPAIR_CONFIRMATORY_SUCCESS_RULE,
    ProgressCertifiedV5RepairConfirmatoryCampaign,
    validateProgressCertifiedV5RepairConfirmatoryCampaign,
} from "./progressCertifiedV5RepairConfirmatoryCampaign.js";
import {
    progressCertifiedV5RepairConfirmatoryResultCommitmentSha256,
} from "./progressCertifiedV5RepairConfirmatoryTechnicalGate.js";

export const PROGRESS_CERTIFIED_V5_REPAIR_CONFIRMATORY_UNBLINDING_SCHEMA_VERSION = 1 as const;

type RecordValue = Record<string, unknown>;
type ArmId = "external_supalosa_control" | "final_building_hybrid_v4" | "visibility_aware_final_building_v5";
export type ProgressCertifiedV5RepairConfirmatoryAnalysisRow = {
    familyId: string;
    country: string;
    faction: "Allied" | "Soviet";
    candidateSlot: 0 | 1;
    armId: ArmId;
    score: 0 | 0.5 | 1;
    winner: "candidate" | "baseline" | "draw";
    ticks: number;
    outcomeStatus: string;
    policyTelemetry: ProgressCertifiedEpisodeResult["policyTelemetry"];
};
type Row = ProgressCertifiedV5RepairConfirmatoryAnalysisRow;

const isRecord = (value: unknown): value is RecordValue =>
    !!value && typeof value === "object" && !Array.isArray(value);
const parseJson = (filePath: string): unknown => JSON.parse(fs.readFileSync(filePath, "utf8"));
const requiredPath = (name: string): string => {
    const value = process.env[name];
    if (!value) throw new Error(`${name} is required`);
    return path.resolve(value);
};
const requiredSha = (name: string): string => {
    const value = process.env[name];
    if (!value || !/^[0-9a-f]{64}$/.test(value)) throw new Error(`${name} must be SHA-256`);
    return value;
};
const requiredArrayJobId = (): string => {
    const value = process.env.ARRAY_JOB_ID;
    if (!value || !/^\d+$/.test(value)) throw new Error("ARRAY_JOB_ID must be numeric");
    return value;
};
const mean = (values: readonly number[]): number => values.reduce((sum, value) => sum + value, 0) / values.length;
const sampleSd = (values: readonly number[]): number => {
    const center = mean(values);
    return Math.sqrt(values.reduce((sum, value) => sum + (value - center) ** 2, 0) / (values.length - 1));
};
const median = (values: readonly number[]): number | null => {
    if (values.length === 0) return null;
    const sorted = [...values].sort((left, right) => left - right);
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
};
const faction = (country: string): "Allied" | "Soviet" => new Set([
    "Americans", "Alliance", "French", "Germans", "British",
]).has(country) ? "Allied" : "Soviet";
const armIds: ArmId[] = [
    "external_supalosa_control",
    "final_building_hybrid_v4",
    "visibility_aware_final_building_v5",
];

const diagnostic = (rows: readonly Row[]) => ({
    games: rows.length,
    wins: rows.filter(({ score }) => score === 1).length,
    draws: rows.filter(({ score }) => score === 0.5).length,
    losses: rows.filter(({ score }) => score === 0).length,
    literalScore: mean(rows.map(({ score }) => score)),
    literalWinProbability: rows.filter(({ score }) => score === 1).length / rows.length,
    drawProbability: rows.filter(({ score }) => score === 0.5).length / rows.length,
    medianTerminalTick: median(rows.map(({ ticks }) => ticks)),
    medianWinTick: median(rows.filter(({ score }) => score === 1).map(({ ticks }) => ticks)),
});

const oneSidedFamilyInference = (values: number[], estimand: string) => {
    if (values.length !== PROGRESS_CERTIFIED_V5_REPAIR_CONFIRMATORY_FAMILY_COUNT) {
        throw new Error(
            `${estimand} requires exactly ${PROGRESS_CERTIFIED_V5_REPAIR_CONFIRMATORY_FAMILY_COUNT} ` +
            "family observations",
        );
    }
    const estimate = mean(values);
    const standardDeviation = sampleSd(values);
    const varianceValid = Number.isFinite(standardDeviation) && standardDeviation > 0;
    const standardError = varianceValid ? standardDeviation / Math.sqrt(values.length) : null;
    const lowerBound = standardError === null
        ? null
        : estimate - PROGRESS_CERTIFIED_V5_REPAIR_CONFIRMATORY_ONE_SIDED_95_T_CRITICAL_DF52 * standardError;
    return {
        estimand,
        unit: "family",
        familyCount: PROGRESS_CERTIFIED_V5_REPAIR_CONFIRMATORY_FAMILY_COUNT,
        estimate,
        sampleStandardDeviation: standardDeviation,
        standardError,
        confidence: 0.95,
        alternative: "greater",
        degreesOfFreedom: PROGRESS_CERTIFIED_V5_REPAIR_CONFIRMATORY_FAMILY_COUNT - 1,
        criticalValue: PROGRESS_CERTIFIED_V5_REPAIR_CONFIRMATORY_ONE_SIDED_95_T_CRITICAL_DF52,
        oneSidedLowerBound: lowerBound,
        varianceValid,
        passed: lowerBound !== null && lowerBound > 0,
    };
};

export const analyzeProgressCertifiedV5Confirmation = (rows: Row[]) => {
    if (rows.length !== PROGRESS_CERTIFIED_V5_REPAIR_CONFIRMATORY_LAUNCH_COUNT) {
        throw new Error(
            `V5 confirmation requires exactly ${PROGRESS_CERTIFIED_V5_REPAIR_CONFIRMATORY_LAUNCH_COUNT} ` +
            "validated outcomes",
        );
    }
    const families = [...new Set(rows.map(({ familyId }) => familyId))];
    const countries = [...new Set(rows.map(({ country }) => country))];
    if (families.length !== PROGRESS_CERTIFIED_V5_REPAIR_CONFIRMATORY_FAMILY_COUNT || countries.length !== 9) {
        throw new Error("V5 confirmation population is incomplete");
    }
    const keys = new Set<string>();
    for (const row of rows) {
        const key = `${row.familyId}|${row.country}|${row.candidateSlot}|${row.armId}`;
        if (keys.has(key)) throw new Error(`Duplicate confirmatory outcome ${key}`);
        keys.add(key);
    }
    for (const familyId of families) {
        for (const country of countries) {
            for (const candidateSlot of [0, 1] as const) {
                for (const armId of armIds) {
                    if (!keys.has(`${familyId}|${country}|${candidateSlot}|${armId}`)) {
                        throw new Error(`Missing confirmatory outcome ${familyId}|${country}|${candidateSlot}|${armId}`);
                    }
                }
            }
        }
    }
    const familyDiagnostics = families.map((familyId) => {
        const familyRows = rows.filter((row) => row.familyId === familyId);
        const armScores = Object.fromEntries(armIds.map((armId) => [
            armId,
            mean(familyRows.filter((row) => row.armId === armId).map(({ score }) => score)),
        ])) as Record<ArmId, number>;
        return {
            familyId,
            armScores,
            v5MinusExternal: armScores.visibility_aware_final_building_v5 - armScores.external_supalosa_control,
            v5MinusV4: armScores.visibility_aware_final_building_v5 - armScores.final_building_hybrid_v4,
            v5MarginAboveEven: armScores.visibility_aware_final_building_v5 - 0.5,
        };
    });
    const pairedV5MinusExternal = oneSidedFamilyInference(
        familyDiagnostics.map(({ v5MinusExternal }) => v5MinusExternal),
        "equally-family-weighted V5-minus-exact-Supalosa literal score",
    );
    const v5Absolute = oneSidedFamilyInference(
        familyDiagnostics.map(({ v5MarginAboveEven }) => v5MarginAboveEven),
        "equally-family-weighted V5 literal score minus 0.5",
    );
    const v5MinusV4 = oneSidedFamilyInference(
        familyDiagnostics.map(({ v5MinusV4: effect }) => effect),
        "equally-family-weighted V5-minus-V4 literal score",
    );
    const primaryPassed = pairedV5MinusExternal.passed && v5Absolute.passed;
    const pairedCells = families.flatMap((familyId) => countries.flatMap((country) =>
        ([0, 1] as const).map((candidateSlot) => {
            const cell = rows.filter((row) =>
                row.familyId === familyId && row.country === country && row.candidateSlot === candidateSlot,
            );
            const scores = Object.fromEntries(cell.map(({ armId, score }) => [armId, score])) as Record<ArmId, number>;
            const label = (score: number): "win" | "draw" | "loss" => score === 1 ? "win" : score === 0.5 ? "draw" : "loss";
            return {
                familyId,
                country,
                candidateSlot,
                externalToV5: `${label(scores.external_supalosa_control)}_to_${label(scores.visibility_aware_final_building_v5)}`,
                v4ToV5: `${label(scores.final_building_hybrid_v4)}_to_${label(scores.visibility_aware_final_building_v5)}`,
            };
        }),
    ));
    const transitionCounts = (key: "externalToV5" | "v4ToV5") => Object.fromEntries(
        [...new Set(pairedCells.map((row) => row[key]))].sort().map((transition) => [
            transition,
            pairedCells.filter((row) => row[key] === transition).length,
        ]),
    );
    const leaveOneFamilyOut = familyDiagnostics.map(({ familyId }) => ({
        excludedFamilyId: familyId,
        v5MinusExternal: mean(familyDiagnostics.filter((row) => row.familyId !== familyId).map((row) => row.v5MinusExternal)),
        v5MarginAboveEven: mean(familyDiagnostics.filter((row) => row.familyId !== familyId).map((row) => row.v5MarginAboveEven)),
    }));
    const policyTelemetry = Object.fromEntries(armIds.map((armId) => {
        const events = rows.filter((row) => row.armId === armId).flatMap(({ policyTelemetry: telemetry }) => telemetry);
        const decisions = events.filter(({ event }) => event === "decision");
        return [armId, {
            eventCount: events.length,
            decisionCount: decisions.length,
            decisionKinds: Object.fromEntries([...new Set(decisions.map(({ decisionKind }) => String(decisionKind)))].sort().map((kind) => [
                kind,
                decisions.filter(({ decisionKind }) => String(decisionKind) === kind).length,
            ])),
            exactUnseenApproachOrders: decisions.filter(({ selectedBuildingOrderMode }) =>
                selectedBuildingOrderMode === "attack_move_exact_unseen_coordinates",
            ).length,
            visibleBuildingAttackOrders: decisions.filter(({ selectedBuildingOrderMode }) =>
                selectedBuildingOrderMode === "attack_visible_building",
            ).length,
            deadlineExpirations: decisions.filter(({ progressDeadlineExpired }) => progressDeadlineExpired !== null && progressDeadlineExpired !== undefined).length,
        }];
    }));
    return {
        status: primaryPassed
            ? "PASSED_PROGRESS_CERTIFIED_V5_REPAIR_CONFIRMATORY_SUCCESS_GATE"
            : "FAILED_PROGRESS_CERTIFIED_V5_REPAIR_CONFIRMATORY_SUCCESS_GATE",
        primaryPassed,
        successRule: PROGRESS_CERTIFIED_V5_REPAIR_CONFIRMATORY_SUCCESS_RULE,
        primary: { pairedV5MinusExternal, v5Absolute },
        secondary: { v5MinusV4 },
        arms: Object.fromEntries(armIds.map((armId) => [armId, diagnostic(rows.filter((row) => row.armId === armId))])),
        transitions: {
            pairedCellCount: pairedCells.length,
            externalToV5: transitionCounts("externalToV5"),
            v4ToV5: transitionCounts("v4ToV5"),
        },
        countries: countries.map((country) => ({
            country,
            arms: Object.fromEntries(armIds.map((armId) => [armId, diagnostic(rows.filter((row) => row.country === country && row.armId === armId))])),
        })),
        factions: (["Allied", "Soviet"] as const).map((item) => ({
            faction: item,
            arms: Object.fromEntries(armIds.map((armId) => [armId, diagnostic(rows.filter((row) => row.faction === item && row.armId === armId))])),
        })),
        familyDiagnostics,
        leaveOneFamilyOut,
        policyTelemetry,
    };
};

const validateTechnicalGate = (
    value: unknown,
    gatePath: string,
    gateSha256: string,
    campaign: ProgressCertifiedV5RepairConfirmatoryCampaign,
    campaignPath: string,
    campaignSha256: string,
    resultsRoot: string,
    arrayJobId: string,
): void => {
    if (
        sha256File(gatePath) !== gateSha256 || !isRecord(value) || value.schemaVersion !== 1 ||
        value.status !== "PASSED_PROGRESS_CERTIFIED_V5_REPAIR_CONFIRMATORY_TECHNICAL_GATE_NO_OUTCOMES_INSPECTED" ||
        value.sourceGitCommit !== campaign.sourceGitCommit || value.campaignPath !== campaignPath ||
        value.campaignSha256 !== campaignSha256 || value.resultsRoot !== resultsRoot ||
        value.arrayJobId !== arrayJobId || value.schedulerAccount !== "pi_jss233" ||
        value.shardCount !== PROGRESS_CERTIFIED_V5_REPAIR_CONFIRMATORY_SHARD_COUNT ||
        value.requestedLaunches !== PROGRESS_CERTIFIED_V5_REPAIR_CONFIRMATORY_LAUNCH_COUNT ||
        value.accountedLaunches !== PROGRESS_CERTIFIED_V5_REPAIR_CONFIRMATORY_LAUNCH_COUNT ||
        value.completedLaunches !== PROGRESS_CERTIFIED_V5_REPAIR_CONFIRMATORY_LAUNCH_COUNT ||
        value.technicalFailures !== 0 || value.sealedSummaryViolations !== 0 ||
        value.outcomeAccess !== "not-inspected-technical-only" ||
        value.authorizedNextPhase !== "single-complete-confirmatory-unblinding" ||
        value.resultArtifactCommitmentSha256 !== progressCertifiedV5RepairConfirmatoryResultCommitmentSha256(campaign, resultsRoot, arrayJobId) ||
        !Array.isArray(value.schedulerJobIds) ||
        value.schedulerJobIds.length !== PROGRESS_CERTIFIED_V5_REPAIR_CONFIRMATORY_SHARD_COUNT ||
        new Set(value.schedulerJobIds).size !== PROGRESS_CERTIFIED_V5_REPAIR_CONFIRMATORY_SHARD_COUNT ||
        !Array.isArray(value.outcomeFieldsEmittedBySummaries) || value.outcomeFieldsEmittedBySummaries.length !== 0
    ) throw new Error("Technical gate does not authorize V5 confirmatory unblinding");
};

const readRows = (
    campaign: ProgressCertifiedV5RepairConfirmatoryCampaign,
    resultsRoot: string,
    arrayJobId: string,
): Row[] => campaign.shards.flatMap((shard) => {
    const runRoot = path.join(resultsRoot, `${arrayJobId}_${shard.shardIndex}`, "run");
    const outer = parseJson(path.join(runRoot, "manifest.json"));
    if (!isRecord(outer) || !isRecord(outer.plan)) throw new Error(`Shard ${shard.shardIndex} manifest is malformed`);
    const plan = parseProgressCertifiedRunPlan(outer.plan);
    const armById = new Map(plan.arms.map((arm) => [arm.armId, arm]));
    const expectedById = new Map(plan.episodes.map((episode) => [episode.episodeId, episode]));
    const events = fs.readFileSync(path.join(runRoot, "events.jsonl"), "utf8")
        .split("\n").filter(Boolean).map((line) => JSON.parse(line) as unknown);
    return events.flatMap((event): Row[] => {
        if (!isRecord(event) || event.event !== "episode_complete" || !isRecord(event.result)) return [];
        const episodeId = event.result.episodeId;
        const episode = typeof episodeId === "string" ? expectedById.get(episodeId) : undefined;
        const arm = episode ? armById.get(episode.armId) : undefined;
        if (!episode || !arm || !armIds.includes(episode.armId as ArmId)) {
            throw new Error(`Shard ${shard.shardIndex} completion identity is unknown`);
        }
        const objectivePolicy = arm.policy.objectivePolicy;
        const result = validateProgressCertifiedResult(event.result, {
            episodeId: episode.episodeId,
            familyId: shard.familyId,
            mapName: shard.mapName,
            mapSha256: shard.mapSha256,
            policyId: arm.policyId,
            candidateCore: arm.policy.candidateCore,
            informationBoundary: objectivePolicy.enabled ? "public_complete_state" : "none",
            telemetrySchemaVersion: objectivePolicy.schemaVersion === 5 ? 4 : 3,
            candidateSlot: episode.candidateSlot,
            country: shard.country,
            seedBlockIndex: shard.seedBlockIndex,
            requestedEngineSeed: shard.requestedEngineSeed,
            maxTicks: campaign.maxTicks,
        });
        if (result.candidateScore === null || result.winner === null) {
            throw new Error(`Shard ${shard.shardIndex} has a technically invalid null outcome`);
        }
        return [{
            familyId: shard.familyId,
            country: shard.country,
            faction: faction(shard.country),
            candidateSlot: episode.candidateSlot,
            armId: episode.armId as ArmId,
            score: result.candidateScore,
            winner: result.winner,
            ticks: result.ticks,
            outcomeStatus: result.outcomeStatus,
            policyTelemetry: result.policyTelemetry,
        }];
    });
});

const main = (): void => {
    const campaignPath = requiredPath("CAMPAIGN");
    const resultsRoot = requiredPath("RESULTS_ROOT");
    const gatePath = requiredPath("TECHNICAL_GATE");
    const gateSha256 = requiredSha("TECHNICAL_GATE_SHA256");
    const outputPath = requiredPath("OUT_FILE");
    const arrayJobId = requiredArrayJobId();
    if (fs.existsSync(outputPath)) throw new Error(`Refusing to overwrite V5 confirmatory unblinding ${outputPath}`);
    const campaign = validateProgressCertifiedV5RepairConfirmatoryCampaign(parseJson(campaignPath));
    const campaignSha256 = sha256File(campaignPath);
    validateTechnicalGate(
        parseJson(gatePath), gatePath, gateSha256, campaign, campaignPath,
        campaignSha256, resultsRoot, arrayJobId,
    );
    const gitCommit = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
    const gitBranch = execFileSync("git", ["branch", "--show-current"], { encoding: "utf8" }).trim();
    const dirty = execFileSync("git", ["status", "--short", "--untracked-files=no"], { encoding: "utf8" }).trim();
    if (gitBranch !== "main" || dirty || gitCommit !== campaign.sourceGitCommit) {
        throw new Error("Unblinding requires unchanged clean campaign source on main");
    }
    const analysis = analyzeProgressCertifiedV5Confirmation(readRows(campaign, resultsRoot, arrayJobId));
    const output = {
        schemaVersion: PROGRESS_CERTIFIED_V5_REPAIR_CONFIRMATORY_UNBLINDING_SCHEMA_VERSION,
        status: analysis.status,
        generatedAt: new Date().toISOString(),
        unblindingCount: 1,
        sourceGitCommit: gitCommit,
        campaignPath,
        campaignSha256,
        technicalGatePath: gatePath,
        technicalGateSha256: gateSha256,
        resultsRoot,
        resultArtifactCommitmentSha256: progressCertifiedV5RepairConfirmatoryResultCommitmentSha256(
            campaign,
            resultsRoot,
            arrayJobId,
        ),
        arrayJobId,
        schedulerAccount: "pi_jss233",
        familyCount: PROGRESS_CERTIFIED_V5_REPAIR_CONFIRMATORY_FAMILY_COUNT,
        countryCount: 9,
        launchedGameCount: PROGRESS_CERTIFIED_V5_REPAIR_CONFIRMATORY_LAUNCH_COUNT,
        analysis,
        paperPositiveClaimSupported: analysis.primaryPassed,
        interpretation: "Complete prespecified confirmatory result; report regardless of direction.",
    };
    fs.mkdirSync(path.dirname(outputPath), { recursive: true, mode: 0o700 });
    fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`, { flag: "wx", mode: 0o600 });
    console.log(JSON.stringify({
        outputPath,
        outputSha256: sha256File(outputPath),
        status: output.status,
        pairedV5MinusExternal: analysis.primary.pairedV5MinusExternal,
        v5Absolute: analysis.primary.v5Absolute,
        v5MinusV4: analysis.secondary.v5MinusV4,
        paperPositiveClaimSupported: output.paperPositiveClaimSupported,
    }));
};

const invoked = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (import.meta.url === invoked) try { main(); } catch (error) { console.error(error); process.exitCode = 1; }
