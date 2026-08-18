import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { Countries } from "@supalosa/chronodivide-bot/dist/bot/logic/common/utils.js";
import {
    RA2WEB_COMPATIBILITY_COUNTRIES,
    RA2WEB_COMPATIBILITY_ENGINE_SEED_BASE,
    RA2WEB_COMPATIBILITY_MAX_TICKS,
    validateRa2WebCompatibilityCampaign,
} from "./ra2WebCompatibilityCampaign.js";
import { RA2WEB_OPPONENT_DESCRIPTORS, Ra2WebOpponentId } from "./ra2WebOpponentBundle.js";
import { sha256File } from "./methodV5PlanRunner.js";

type RecordValue = Record<string, unknown>;
type SchedulerTask = {
    schedulerJobId: string;
    state: "COMPLETED";
    exitCode: "0:0";
    account: "pi_jss233";
};
export type Ra2WebCompatibilitySummaryCell = {
    taskIndex: number;
    country: Countries;
    candidateSlot: 0 | 1;
    standardIdenticalToExact: boolean;
    deterministicOpponentIds: Ra2WebOpponentId[];
};

const SHA256 = /^[0-9a-f]{64}$/;
const isRecord = (value: unknown): value is RecordValue =>
    !!value && typeof value === "object" && !Array.isArray(value);
const requiredPath = (name: string): string => {
    const value = process.env[name];
    if (!value) throw new Error(`${name} is required`);
    return path.resolve(value);
};
const requiredText = (name: string, pattern: RegExp): string => {
    const value = process.env[name];
    if (!value || !pattern.test(value)) throw new Error(`${name} is invalid`);
    return value;
};
const readJson = (filePath: string): unknown => JSON.parse(fs.readFileSync(filePath, "utf8"));

export const parseRa2WebCompatibilitySacct = (
    raw: string,
    arrayJobId: string,
): Map<number, SchedulerTask> => {
    const tasks = new Map<number, SchedulerTask>();
    for (const [lineIndex, line] of raw.split("\n").entries()) {
        if (!line) continue;
        const fields = line.split("|");
        if (fields.length !== 5) throw new Error(`RA2Web sacct line ${lineIndex + 1} is malformed`);
        const [logicalJobId, schedulerJobId, state, exitCode, account] = fields;
        const match = new RegExp(`^${arrayJobId}_(\\d+)$`).exec(logicalJobId);
        const taskIndex = match ? Number(match[1]) : -1;
        if (
            !match || !/^\d+$/.test(schedulerJobId) || taskIndex < 0 || taskIndex >= 18 || tasks.has(taskIndex) ||
            state !== "COMPLETED" || exitCode !== "0:0" || account !== "pi_jss233"
        ) throw new Error(`RA2Web scheduler row ${lineIndex + 1} is failed, duplicate, or unauthorized`);
        tasks.set(taskIndex, { schedulerJobId, state, exitCode, account });
    }
    if (tasks.size !== 18) throw new Error(`RA2Web sacct returned ${tasks.size}/18 tasks`);
    return tasks;
};

export const summarizeRa2WebCompatibilityCells = (
    cells: readonly Ra2WebCompatibilitySummaryCell[],
) => {
    if (cells.length !== 18 || new Set(cells.map(({ taskIndex }) => taskIndex)).size !== 18) {
        throw new Error("RA2Web compatibility summary requires exactly 18 distinct cells");
    }
    const opponentSupport = RA2WEB_OPPONENT_DESCRIPTORS.map(({ opponentId }) => {
        const supportedCells = cells.filter(({ deterministicOpponentIds }) =>
            deterministicOpponentIds.includes(opponentId),
        );
        const supportedCountrySlots = new Set(supportedCells.map(({ country, candidateSlot }) =>
            `${country}|${candidateSlot}`,
        ));
        const supportedCountries = RA2WEB_COMPATIBILITY_COUNTRIES.filter((country) =>
            supportedCountrySlots.has(`${country}|0`) && supportedCountrySlots.has(`${country}|1`),
        );
        return {
            opponentId,
            supportedCellCount: supportedCells.length,
            supportedCountrySlotCount: supportedCountrySlots.size,
            supportedCountries,
            allCountryReciprocalSupport: supportedCells.length === 18 &&
                supportedCountrySlots.size === 18 && supportedCountries.length === 9,
        };
    });
    return {
        standardEquivalenceCellCount: cells.filter(({ standardIdenticalToExact }) =>
            standardIdenticalToExact,
        ).length,
        standardDivergenceCellCount: cells.filter(({ standardIdenticalToExact }) =>
            !standardIdenticalToExact,
        ).length,
        opponentSupport,
        passed: opponentSupport.every(({ allCountryReciprocalSupport }) => allCountryReciprocalSupport),
    };
};

const assertFiniteJsonNumbers = (value: unknown): void => {
    const stack: unknown[] = [value];
    while (stack.length > 0) {
        const item = stack.pop();
        if (typeof item === "number" && !Number.isFinite(item)) {
            throw new Error("RA2Web compatibility artifact contains a non-finite number");
        }
        if (Array.isArray(item)) stack.push(...item);
        else if (item && typeof item === "object") stack.push(...Object.values(item));
    }
};
const forbiddenKey = (value: unknown): string | null => {
    const stack: unknown[] = [value];
    const forbidden = /winner|score|outcome|endpointOrientation|terminalBuilding/i;
    while (stack.length > 0) {
        const item = stack.pop();
        if (Array.isArray(item)) stack.push(...item);
        else if (item && typeof item === "object") {
            for (const [key, child] of Object.entries(item)) {
                if (forbidden.test(key)) return key;
                stack.push(child);
            }
        }
    }
    return null;
};
const validTrace = (value: unknown, requestedEngineSeed: number): boolean =>
    isRecord(value) && value.requestedEngineSeed === requestedEngineSeed &&
    value.updateCount === RA2WEB_COMPATIBILITY_MAX_TICKS &&
    Number.isSafeInteger(value.actionCount) && Number(value.actionCount) >= 0 &&
    typeof value.actionTraceSha256 === "string" && SHA256.test(value.actionTraceSha256) &&
    value.fixedSnapshotCount === 4 && typeof value.fixedSnapshotSha256 === "string" &&
    SHA256.test(value.fixedSnapshotSha256) && typeof value.technicalTraceSha256 === "string" &&
    SHA256.test(value.technicalTraceSha256);

const main = (): void => {
    const campaignPath = requiredPath("CAMPAIGN");
    const resultsRoot = requiredPath("RESULTS_ROOT");
    const outputPath = requiredPath("OUT_FILE");
    const campaignSha256 = requiredText("CAMPAIGN_SHA256", SHA256);
    const arrayJobId = requiredText("ARRAY_JOB_ID", /^\d+$/);
    if (process.env.SLURM_JOB_ACCOUNT !== "pi_jss233") {
        throw new Error("RA2Web compatibility finalizer requires Slurm account pi_jss233");
    }
    if (fs.existsSync(outputPath)) throw new Error(`Refusing to overwrite ${outputPath}`);
    if (sha256File(campaignPath) !== campaignSha256) throw new Error("RA2Web compatibility campaign drifted");
    const campaign = validateRa2WebCompatibilityCampaign(readJson(campaignPath));
    if (
        campaign.sourceGitCommit !== execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim() ||
        execFileSync("git", ["branch", "--show-current"], { encoding: "utf8" }).trim() !== "main" ||
        execFileSync("git", ["status", "--short", "--untracked-files=no"], { encoding: "utf8" }).trim() !== ""
    ) throw new Error("RA2Web compatibility finalizer source drifted");
    const schedulerTasks = parseRa2WebCompatibilitySacct(execFileSync(
        "/opt/slurm/current/bin/sacct",
        ["-j", arrayJobId, "-n", "-P", "-X", "--format=JobID,JobIDRaw,State,ExitCode,Account"],
        { encoding: "utf8" },
    ), arrayJobId);
    const cells: Ra2WebCompatibilitySummaryCell[] = [];
    const artifacts: Array<{ taskIndex: number; path: string; sha256: string }> = [];
    for (let taskIndex = 0; taskIndex < 18; taskIndex += 1) {
        const filePath = path.join(resultsRoot, `task-${String(taskIndex).padStart(2, "0")}`, "cell.json");
        const value = readJson(filePath);
        assertFiniteJsonNumbers(value);
        const forbidden = forbiddenKey(value);
        if (forbidden) throw new Error(`RA2Web task ${taskIndex} contains forbidden key ${forbidden}`);
        const countryOrdinal = Math.floor(taskIndex / 2);
        const candidateSlot = (taskIndex % 2) as 0 | 1;
        const country = campaign.countries[countryOrdinal];
        const requestedEngineSeed = RA2WEB_COMPATIBILITY_ENGINE_SEED_BASE + taskIndex;
        if (
            !isRecord(value) || value.schemaVersion !== 1 ||
            value.kind !== "ra2web-outcome-blind-compatibility-cell" ||
            value.status !== "PASS_RA2WEB_OUTCOME_BLIND_COMPATIBILITY_CELL" || value.passed !== true ||
            value.technicalOnly !== true || value.taskIndex !== taskIndex || value.countryOrdinal !== countryOrdinal ||
            value.country !== country || value.candidateSlot !== candidateSlot ||
            value.requestedEngineSeed !== requestedEngineSeed || value.sourceGitCommit !== campaign.sourceGitCommit ||
            value.sourceRuntimeSha256 !== campaign.sourceRuntimeSha256 ||
            value.externalBaselineGitCommit !== campaign.externalBaselineGitCommit ||
            value.externalBaselineRuntimeSha256 !== campaign.externalBaselineRuntimeSha256 ||
            value.gameApiRuntimeSha256 !== campaign.gameApiRuntimeSha256 ||
            value.packageLockSha256 !== campaign.packageLockSha256 ||
            value.freezeManifestSha256 !== campaign.freezeManifestSha256 ||
            value.opponentSetSha256 !== campaign.opponentSetSha256 || value.mapName !== campaign.mapName ||
            value.mapSha256 !== campaign.mapSha256 || value.launchedGameCount !== 7 ||
            !validTrace(value.exactExternal, requestedEngineSeed) || !isRecord(value.traces) ||
            !Array.isArray(value.validationErrors) || value.validationErrors.length !== 0 ||
            !isRecord(value.scheduler) || value.scheduler.account !== "pi_jss233" ||
            String(value.scheduler.arrayJobId) !== arrayJobId ||
            value.scheduler.jobId !== schedulerTasks.get(taskIndex)?.schedulerJobId
        ) throw new Error(`RA2Web task ${taskIndex} failed structural or scheduler validation`);
        const deterministicOpponentIds: Ra2WebOpponentId[] = [];
        for (const { opponentId } of RA2WEB_OPPONENT_DESCRIPTORS) {
            const result = value.traces[opponentId];
            if (
                !isRecord(result) || result.deterministic !== true ||
                typeof result.identicalToExactExternal !== "boolean" ||
                !validTrace(result.first, requestedEngineSeed) || !validTrace(result.repeat, requestedEngineSeed) ||
                JSON.stringify(result.first) !== JSON.stringify(result.repeat)
            ) throw new Error(`RA2Web task ${taskIndex} failed ${opponentId} determinism`);
            deterministicOpponentIds.push(opponentId);
        }
        cells.push({
            taskIndex,
            country,
            candidateSlot,
            standardIdenticalToExact:
                (value.traces.ra2web_standard as RecordValue).identicalToExactExternal === true,
            deterministicOpponentIds,
        });
        artifacts.push({ taskIndex, path: filePath, sha256: sha256File(filePath) });
    }
    const summary = summarizeRa2WebCompatibilityCells(cells);
    if (!summary.passed) throw new Error("RA2Web compatibility lacks all-country reciprocal support");
    const artifactCommitmentSha256 = crypto.createHash("sha256")
        .update(JSON.stringify(artifacts.map(({ taskIndex, sha256 }) => ({ taskIndex, sha256 }))))
        .digest("hex");
    const output = {
        schemaVersion: 1,
        kind: "ra2web-outcome-blind-compatibility-finalizer",
        status: "PASS_RA2WEB_OUTCOME_BLIND_COMPATIBILITY_GATE",
        passed: true,
        technicalOnly: true,
        generatedAt: new Date().toISOString(),
        sourceGitCommit: campaign.sourceGitCommit,
        sourceRuntimeSha256: campaign.sourceRuntimeSha256,
        externalBaselineGitCommit: campaign.externalBaselineGitCommit,
        externalBaselineRuntimeSha256: campaign.externalBaselineRuntimeSha256,
        gameApiRuntimeSha256: campaign.gameApiRuntimeSha256,
        packageLockSha256: campaign.packageLockSha256,
        ra2webClientCommit: campaign.ra2webClientCommit,
        ra2webClientReleaseId: campaign.ra2webClientReleaseId,
        freezeManifestSha256: campaign.freezeManifestSha256,
        opponentSetSha256: campaign.opponentSetSha256,
        protocolSha256: campaign.protocolSha256,
        campaignPath,
        campaignSha256,
        arrayJobId,
        controllerJobId: process.env.SLURM_JOB_ID ?? null,
        schedulerAccount: process.env.SLURM_JOB_ACCOUNT,
        launchedGameCount: 126,
        cellTaskCount: 18,
        countryCount: 9,
        reciprocalSlotCount: 2,
        summary,
        artifactCommitmentSha256,
        artifacts,
        fieldsProvenAbsent: [
            "winner", "score", "competitive disposition", "endpoint orientation",
            "terminal building counts", "resignation-derived label",
        ],
    };
    fs.mkdirSync(path.dirname(outputPath), { recursive: true, mode: 0o700 });
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2) + "\n", { flag: "wx", mode: 0o600 });
    console.log(JSON.stringify({ outFile: outputPath, sha256: sha256File(outputPath), status: output.status, summary }));
};

const invoked = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (import.meta.url === invoked) {
    try { main(); } catch (error) { console.error(error); process.exitCode = 1; }
}
