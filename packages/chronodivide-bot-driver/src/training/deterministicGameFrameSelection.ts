import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const SHA256 = /^[0-9a-f]{64}$/;
const HFO_AGGREGATE_SHA256 = "a734acf077540793e309834f0bda7bcd4a34fde9f95d5457921303bb8d743cc8";
const PEAK_AGGREGATE_SHA256 = "f970f197ee106408ae0842bd466b073f540cc623b8b96a41d5e838061a1b0285";
const HFO_SOURCE = "f8d5a9961a6e1dd2746cd5c03b6b0793ba73ba02";
const PEAK_SOURCE = "8c73a32a18e04500dc7c52a83264460c01a13f66";
const BASELINE_COMMIT = "165b77a71d0cf5ebd27c65b19d0486bcbae78d0f";

type ResultRow = Record<string, any>;
type Aggregate = Record<string, any>;

export type FrameCaseSelection = {
    category: "peak_reciprocal" | "hfo_final_building" | "hfo_force_clearance" | "hfo_tick_cap";
    selectionInput: string;
    selectionSha256: string;
    campaign: "peak-profile-scope-v1" | "hfo-deployed-confirmatory-v1";
    aggregateSha256: string;
    taskIndex: number;
    schedulerJobId: string;
    cellPath: string;
    row: ResultRow;
    pairedTaskIndex?: number;
    pairedSchedulerJobId?: string;
    pairedCellPath?: string;
    pairedRow?: ResultRow;
    status?: "selected" | "same_case_pending_event";
};

const sha256Text = (value: string): string => crypto.createHash("sha256").update(value).digest("hex");
const sha256File = (file: string): string => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const requiredPath = (name: string): string => {
    const value = process.env[name];
    if (!value) throw new Error(`${name} is required`);
    return path.resolve(value);
};
const requiredSha = (name: string): string => {
    const value = process.env[name];
    if (!value || !SHA256.test(value)) throw new Error(`${name} is invalid`);
    return value;
};

const schedulerId = (aggregate: Aggregate, row: ResultRow): string => {
    const value = aggregate.schedulerJobIds?.[row.taskIndex];
    if (!value || !/^\d+$/.test(String(value))) throw new Error("Frame selector scheduler mapping drifted");
    return String(value);
};

const cellPath = (aggregatePath: string, taskIndex: number): string =>
    path.resolve(path.dirname(path.dirname(aggregatePath)), "cells", `task-${String(taskIndex).padStart(3, "0")}`, "cell.json");

const selectSmallest = <T extends { selectionInput: string }>(rows: T[]): T & { selectionSha256: string } => {
    if (!rows.length) throw new Error("Frame selector population is empty");
    const ranked = rows.map((row) => ({ ...row, selectionSha256: sha256Text(row.selectionInput) }))
        .sort((left, right) => left.selectionSha256.localeCompare(right.selectionSha256));
    return ranked[0];
};

const validateHfo = (aggregate: Aggregate): void => {
    if (aggregate.kind !== "hfo-deployed-confirmatory-finalizer" || aggregate.complete !== true ||
        aggregate.passed !== true || aggregate.sourceCommit !== HFO_SOURCE ||
        aggregate.baselineCommit !== BASELINE_COMMIT || aggregate.launchedGameCount !== 720 ||
        aggregate.overall?.wins !== 633 || aggregate.overall?.draws !== 24 || aggregate.overall?.losses !== 63 ||
        !Array.isArray(aggregate.rows) || aggregate.rows.length !== 720 ||
        !Array.isArray(aggregate.schedulerJobIds) || aggregate.schedulerJobIds.length !== 720) {
        throw new Error("HFO frame aggregate is ineligible");
    }
};

const validatePeak = (aggregate: Aggregate): void => {
    const candidate = aggregate.candidates?.find((row: ResultRow) => row.id === "strategy_both");
    if (aggregate.kind !== "peak-profile-scope-stage" || aggregate.stageIndex !== 1 ||
        aggregate.complete !== true || aggregate.passed !== true || aggregate.sourceCommit !== PEAK_SOURCE ||
        aggregate.baselineCommit !== BASELINE_COMMIT || aggregate.launchedGameCount !== 360 ||
        candidate?.eligible !== true || candidate?.overall?.wins !== 134 ||
        candidate?.overall?.draws !== 14 || candidate?.overall?.losses !== 32 ||
        !Array.isArray(aggregate.rows) || aggregate.rows.length !== 360 ||
        !Array.isArray(aggregate.schedulerJobIds) || aggregate.schedulerJobIds.length !== 360) {
        throw new Error("Peak frame aggregate is ineligible");
    }
};

export const selectDeterministicFrameCases = (
    hfo: Aggregate,
    peak: Aggregate,
    hfoPath: string,
    peakPath: string,
): FrameCaseSelection[] => {
    validateHfo(hfo);
    validatePeak(peak);

    const peakControls = new Map<number, ResultRow>(peak.rows
        .filter((row: ResultRow) => row.armId === "deployed")
        .map((row: ResultRow) => [row.populationCaseIndex, row]));
    const peakCandidates = peak.rows.filter((row: ResultRow) =>
        row.armId === "strategy_both" && row.candidateStart === "118,73");
    if (peakCandidates.length !== 90) throw new Error("Peak reciprocal population drifted");
    const peakSelected = selectSmallest<{
        selectionInput: string; row: ResultRow; paired: ResultRow; deployedJob: string; confirmedJob: string;
    }>(peakCandidates.map((row: ResultRow) => {
        const paired = peakControls.get(row.populationCaseIndex);
        if (!paired || paired.candidateStart !== row.candidateStart ||
            paired.requestedEngineSeed !== row.requestedEngineSeed ||
            paired.country !== row.country || paired.candidateSlot !== row.candidateSlot) {
            throw new Error("Peak reciprocal pair drifted");
        }
        const deployedJob = schedulerId(peak, paired);
        const confirmedJob = schedulerId(peak, row);
        return {
            selectionInput: ["peak-reciprocal", row.country, row.candidateStart, row.candidateSlot,
                row.requestedEngineSeed, deployedJob, confirmedJob].join("|"),
            row,
            paired,
            deployedJob,
            confirmedJob,
        };
    }));

    const hfoWins = hfo.rows.filter((row: ResultRow) =>
        row.winner === "candidate" && row.status === "candidate_win" &&
        row.terminalBuildingCounts?.baseline === 0);
    if (hfoWins.length !== 633) throw new Error("HFO win population drifted");
    const hfoFinal = selectSmallest<{
        selectionInput: string; row: ResultRow; job: string;
    }>(hfoWins.map((row: ResultRow) => {
        const job = schedulerId(hfo, row);
        return {
            selectionInput: ["hfo-final-building", row.country, row.candidateStart, row.candidateSlot,
                row.requestedEngineSeed, job].join("|"),
            row,
            job,
        };
    }));

    const hfoTickCaps = hfo.rows.filter((row: ResultRow) =>
        row.winner === "draw" && row.status === "tick_cap_draw" && row.ticks === 90_000);
    if (hfoTickCaps.length !== 4) throw new Error("HFO tick-cap population drifted");
    const hfoTickCap = selectSmallest<{
        selectionInput: string; row: ResultRow; job: string;
    }>(hfoTickCaps.map((row: ResultRow) => {
        const job = schedulerId(hfo, row);
        return {
            selectionInput: ["hfo-tick-cap", row.country, row.candidateStart, row.candidateSlot,
                row.requestedEngineSeed, job].join("|"),
            row,
            job,
        };
    }));

    const peakSelection: FrameCaseSelection = {
        category: "peak_reciprocal",
        selectionInput: peakSelected.selectionInput,
        selectionSha256: peakSelected.selectionSha256,
        campaign: "peak-profile-scope-v1",
        aggregateSha256: PEAK_AGGREGATE_SHA256,
        taskIndex: peakSelected.row.taskIndex,
        schedulerJobId: peakSelected.confirmedJob,
        cellPath: cellPath(peakPath, peakSelected.row.taskIndex),
        row: peakSelected.row,
        pairedTaskIndex: peakSelected.paired.taskIndex,
        pairedSchedulerJobId: peakSelected.deployedJob,
        pairedCellPath: cellPath(peakPath, peakSelected.paired.taskIndex),
        pairedRow: peakSelected.paired,
        status: "selected",
    };
    const finalSelection: FrameCaseSelection = {
        category: "hfo_final_building",
        selectionInput: hfoFinal.selectionInput,
        selectionSha256: hfoFinal.selectionSha256,
        campaign: "hfo-deployed-confirmatory-v1",
        aggregateSha256: HFO_AGGREGATE_SHA256,
        taskIndex: hfoFinal.row.taskIndex,
        schedulerJobId: hfoFinal.job,
        cellPath: cellPath(hfoPath, hfoFinal.row.taskIndex),
        row: hfoFinal.row,
        status: "selected",
    };
    return [
        peakSelection,
        finalSelection,
        {
            ...finalSelection,
            category: "hfo_force_clearance",
            selectionInput: hfoFinal.selectionInput,
            status: "same_case_pending_event",
        },
        {
            category: "hfo_tick_cap",
            selectionInput: hfoTickCap.selectionInput,
            selectionSha256: hfoTickCap.selectionSha256,
            campaign: "hfo-deployed-confirmatory-v1",
            aggregateSha256: HFO_AGGREGATE_SHA256,
            taskIndex: hfoTickCap.row.taskIndex,
            schedulerJobId: hfoTickCap.job,
            cellPath: cellPath(hfoPath, hfoTickCap.row.taskIndex),
            row: hfoTickCap.row,
            status: "selected",
        },
    ];
};

const sourceIdentity = (): { repo: string; commit: string } => {
    const repo = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
    const commit = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
    if (execFileSync("git", ["branch", "--show-current"], { encoding: "utf8" }).trim() !== "main" ||
        execFileSync("git", ["status", "--short", "--untracked-files=no"], { encoding: "utf8" }).trim() ||
        execFileSync("git", ["rev-parse", "fork/main"], { encoding: "utf8" }).trim() !== commit) {
        throw new Error("Frame selector requires clean synchronized main");
    }
    return { repo, commit };
};

const main = (): void => {
    const out = requiredPath("OUT_PATH");
    const programPath = requiredPath("PROGRAM_PATH");
    const hfoPath = requiredPath("HFO_AGGREGATE_PATH");
    const peakPath = requiredPath("PEAK_AGGREGATE_PATH");
    const protocolPath = requiredPath("FRAME_PROTOCOL_PATH");
    const amendmentPath = requiredPath("FRAME_AMENDMENT_PATH");
    const programSha256 = requiredSha("PROGRAM_SHA256");
    const protocolSha256 = requiredSha("FRAME_PROTOCOL_SHA256");
    const amendmentSha256 = requiredSha("FRAME_AMENDMENT_SHA256");
    if (fs.existsSync(out) || sha256File(programPath) !== programSha256 ||
        sha256File(protocolPath) !== protocolSha256 || sha256File(amendmentPath) !== amendmentSha256 ||
        sha256File(hfoPath) !== HFO_AGGREGATE_SHA256 || sha256File(peakPath) !== PEAK_AGGREGATE_SHA256) {
        throw new Error("Frame selector input drifted");
    }
    const hfo = JSON.parse(fs.readFileSync(hfoPath, "utf8"));
    const peak = JSON.parse(fs.readFileSync(peakPath, "utf8"));
    const { repo, commit } = sourceIdentity();
    const coreFiles = execFileSync("git", ["diff", "--name-only", HFO_SOURCE, "HEAD", "--",
        "packages/chronodivide-bot/src"], { encoding: "utf8" }).trim().split("\n").filter(Boolean);
    const allowedCoreFiles = [
        "packages/chronodivide-bot/src/bot/strategy/strongStrategy.ts",
        "packages/chronodivide-bot/src/bot/strongBot.ts",
    ];
    if (JSON.stringify(coreFiles.sort()) !== JSON.stringify(allowedCoreFiles.sort())) {
        throw new Error("HFO replay core source boundary drifted");
    }
    const coreDiff = execFileSync("git", ["diff", HFO_SOURCE, "HEAD", "--",
        "packages/chronodivide-bot/src"], { encoding: "utf8", maxBuffer: 8 * 1024 * 1024 });
    const selections = selectDeterministicFrameCases(hfo, peak, hfoPath, peakPath);
    for (const selection of selections) {
        if (sha256File(selection.cellPath) === "" ||
            (selection.pairedCellPath && sha256File(selection.pairedCellPath) === "")) {
            throw new Error("Selected cell is missing");
        }
    }
    const artifact = {
        schemaVersion: 1,
        kind: "deterministic-game-frame-selection",
        status: "PASS_DETERMINISTIC_GAME_FRAME_SELECTION",
        complete: true,
        passed: true,
        rendererExecuted: false,
        sourceCommit: commit,
        programSha256,
        protocolSha256,
        amendmentSha256,
        hfoAggregateSha256: HFO_AGGREGATE_SHA256,
        peakAggregateSha256: PEAK_AGGREGATE_SHA256,
        baselineCommit: BASELINE_COMMIT,
        hfoConfirmedSource: HFO_SOURCE,
        peakConfirmedSource: PEAK_SOURCE,
        hfoCoreDiffFiles: coreFiles,
        hfoCoreDiffSha256: sha256Text(coreDiff),
        omittedCategories: [{
            category: "advanced_transfer",
            reason: "Protocol amendment 1 omits V1 because the older schema lacks trajectory hashes.",
        }],
        selections,
        provenance: { repo, createdAt: new Date().toISOString() },
    };
    fs.mkdirSync(path.dirname(out), { recursive: true, mode: 0o700 });
    fs.writeFileSync(out, JSON.stringify(artifact, null, 2) + "\n", { flag: "wx", mode: 0o600 });
    console.log(JSON.stringify({
        status: artifact.status,
        selections: selections.map((row) => ({
            category: row.category,
            selectionSha256: row.selectionSha256,
            taskIndex: row.taskIndex,
            schedulerJobId: row.schedulerJobId,
        })),
    }));
};

const invoked = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (import.meta.url === invoked) {
    try {
        main();
    } catch (error) {
        console.error(error);
        process.exitCode = 1;
    }
}
