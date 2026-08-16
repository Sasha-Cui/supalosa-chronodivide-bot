import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { Countries } from "@supalosa/chronodivide-bot/dist/bot/logic/common/utils.js";
import { sha256File } from "./methodV5PlanRunner.js";
import {
    LITERAL_BUILDING_ELIMINATION_ENDPOINT_SHA256,
    LITERAL_BUILDING_ELIMINATION_ENDPOINT_VERSION,
} from "./literalBuildingEliminationEndpoint.js";
import { FINISH_ADVANTAGE_STATE_AUDIT_OPEN_CAMPAIGN_SHA256 } from "./finishAdvantageStateAuditCampaign.js";

type RecordValue = Record<string, unknown>;
type Margin = 0 | 2 | 4 | 8;
type SchedulerTask = {
    schedulerJobId: string;
    state: "COMPLETED";
    exitCode: "0:0";
    account: "pi_jss233";
};
type ExposureCell = {
    familyId: string;
    country: Countries;
    faction: "Allied" | "Soviet";
    candidateSlot: 0 | 1;
    margin: Margin;
    maximumPositiveStrikeSize: number;
};

const SHA256 = /^[0-9a-f]{64}$/;
const GIT_COMMIT = /^[0-9a-f]{40}$/;
const MARGINS = [0, 2, 4, 8] as const;
const STANDARD_COUNTRIES = [
    Countries.USA,
    Countries.KOREA,
    Countries.FRANCE,
    Countries.GERMANY,
    Countries.GREAT_BRITAIN,
    Countries.LIBYA,
    Countries.IRAQ,
    Countries.CUBA,
    Countries.RUSSIA,
] as const;
const ALLIED = new Set<Countries>([
    Countries.USA,
    Countries.KOREA,
    Countries.FRANCE,
    Countries.GERMANY,
    Countries.GREAT_BRITAIN,
]);
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
const assertFiniteJsonNumbers = (value: unknown, location: string): void => {
    const stack: Array<{ value: unknown; location: string }> = [{ value, location }];
    while (stack.length > 0) {
        const current = stack.pop()!;
        if (typeof current.value === "number" && !Number.isFinite(current.value)) {
            throw new Error(`State-audit artifact has a non-finite number at ${current.location}`);
        }
        if (Array.isArray(current.value)) {
            current.value.forEach((child, index) => stack.push({
                value: child,
                location: `${current.location}[${index}]`,
            }));
        } else if (isRecord(current.value)) {
            Object.entries(current.value).forEach(([key, child]) => stack.push({
                value: child,
                location: `${current.location}.${key}`,
            }));
        }
    }
};
const median = (values: readonly number[]): number | null => {
    if (values.length === 0) return null;
    const sorted = values.slice().sort((left, right) => left - right);
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
};

export const parseFinishAdvantageStateAuditSacct = (
    raw: string,
    arrayJobId: string,
): Map<number, SchedulerTask> => {
    const tasks = new Map<number, SchedulerTask>();
    for (const [lineIndex, line] of raw.split("\n").entries()) {
        if (!line) continue;
        const fields = line.split("|");
        if (fields.length !== 5) throw new Error(`State-audit sacct line ${lineIndex + 1} is malformed`);
        const [logicalJobId, schedulerJobId, state, exitCode, account] = fields;
        const match = new RegExp(`^${arrayJobId}_(\\d+)$`).exec(logicalJobId);
        const taskIndex = match ? Number(match[1]) : -1;
        if (
            !match || !/^\d+$/.test(schedulerJobId) || taskIndex < 0 || taskIndex >= 90 || tasks.has(taskIndex) ||
            state !== "COMPLETED" || exitCode !== "0:0" || account !== "pi_jss233"
        ) throw new Error(`State-audit scheduler row ${lineIndex + 1} is failed, duplicate, or unauthorized`);
        tasks.set(taskIndex, { schedulerJobId, state, exitCode, account });
    }
    if (tasks.size !== 90) throw new Error(`State-audit sacct returned ${tasks.size}/90 tasks`);
    return tasks;
};

export const summarizeFinishAdvantageMarginExposure = (cells: readonly ExposureCell[]) =>
    MARGINS.map((margin) => {
        const canonicalByCell = new Map<string, ExposureCell>();
        for (const cell of cells.filter((candidate) => candidate.margin === margin)) {
            const key = [cell.familyId, cell.country, cell.candidateSlot, cell.margin].join("|");
            const previous = canonicalByCell.get(key);
            if (!previous || cell.maximumPositiveStrikeSize > previous.maximumPositiveStrikeSize) {
                canonicalByCell.set(key, cell);
            }
        }
        const exposed = [...canonicalByCell.values()];
        const families = new Set(exposed.map(({ familyId }) => familyId));
        const countries = new Set(exposed.map(({ country }) => country));
        const slots = new Set(exposed.map(({ candidateSlot }) => candidateSlot));
        const countrySlots = new Set(exposed.map(({ country, candidateSlot }) =>
            `${country}|${candidateSlot}`,
        ));
        const factions = new Set(exposed.map(({ faction }) => faction));
        const positiveStrikeMedian = median(exposed.map(({ maximumPositiveStrikeSize }) =>
            maximumPositiveStrikeSize,
        ));
        const eligible = factions.size === 2 && slots.size === 2 && countries.size === 9 &&
            countrySlots.size === 18 && families.size >= 5;
        return {
            margin,
            exposedCellCount: exposed.length,
            distinctFamilyCount: families.size,
            distinctCountryCount: countries.size,
            distinctCountrySlotCount: countrySlots.size,
            distinctSlots: [...slots].sort(),
            distinctFactions: [...factions].sort(),
            medianMaximumPositiveStrikeSizePerExposedCell: positiveStrikeMedian,
            eligible,
        };
    });

export const selectFinishAdvantageMargins = (
    summaries: ReturnType<typeof summarizeFinishAdvantageMarginExposure>,
): Margin[] => {
    const eligible = summaries.filter(({ eligible }) => eligible);
    const largest = eligible.slice().sort((left, right) => right.margin - left.margin)[0]?.margin;
    const smallestWithMedianTwo = eligible
        .filter(({ medianMaximumPositiveStrikeSizePerExposedCell }) =>
            medianMaximumPositiveStrikeSizePerExposedCell !== null &&
            medianMaximumPositiveStrikeSizePerExposedCell >= 2,
        )
        .sort((left, right) => left.margin - right.margin)[0]?.margin;
    return [...new Set([largest, smallestWithMedianTwo].filter((value): value is Margin =>
        value !== undefined,
    ))];
};

const main = (): void => {
    const campaignPath = requiredPath("CAMPAIGN");
    const resultsRoot = requiredPath("RESULTS_ROOT");
    const outputPath = requiredPath("OUT_FILE");
    const campaignSha256 = requiredText("CAMPAIGN_SHA256", SHA256);
    const arrayJobId = requiredText("ARRAY_JOB_ID", /^\d+$/);
    if (process.env.SLURM_JOB_ACCOUNT !== "pi_jss233") {
        throw new Error("State-audit finalizer requires Slurm account pi_jss233");
    }
    if (fs.existsSync(outputPath)) throw new Error(`Refusing to overwrite ${outputPath}`);
    if (sha256File(campaignPath) !== campaignSha256) throw new Error("State-audit campaign drifted");
    const campaign = readJson(campaignPath);
    if (
        !isRecord(campaign) || campaign.schemaVersion !== 1 ||
        campaign.kind !== "finish-advantage-outcome-blind-state-audit" ||
        campaign.status !== "FROZEN_FINISH_ADVANTAGE_OUTCOME_BLIND_STATE_AUDIT_V1" ||
        typeof campaign.generatedAt !== "string" || Number.isNaN(Date.parse(campaign.generatedAt)) ||
        typeof campaign.sourceGitCommit !== "string" || !GIT_COMMIT.test(campaign.sourceGitCommit) ||
        typeof campaign.externalBaselineGitCommit !== "string" ||
        !GIT_COMMIT.test(campaign.externalBaselineGitCommit) ||
        typeof campaign.sourceRuntimeSha256 !== "string" || !SHA256.test(campaign.sourceRuntimeSha256) ||
        typeof campaign.externalBaselineRuntimeSha256 !== "string" ||
        !SHA256.test(campaign.externalBaselineRuntimeSha256) ||
        typeof campaign.gameApiRuntimeSha256 !== "string" || !SHA256.test(campaign.gameApiRuntimeSha256) ||
        typeof campaign.packageLockSha256 !== "string" || !SHA256.test(campaign.packageLockSha256) ||
        typeof campaign.populationSha256 !== "string" || !SHA256.test(campaign.populationSha256) ||
        typeof campaign.sourceOpenCampaignPath !== "string" ||
        campaign.sourceOpenCampaignSha256 !== FINISH_ADVANTAGE_STATE_AUDIT_OPEN_CAMPAIGN_SHA256 ||
        typeof campaign.generationManifestPath !== "string" ||
        typeof campaign.generationManifestSha256 !== "string" ||
        !SHA256.test(campaign.generationManifestSha256) ||
        typeof campaign.protocolPath !== "string" ||
        typeof campaign.protocolSha256 !== "string" || !SHA256.test(campaign.protocolSha256) ||
        !Array.isArray(campaign.amendmentPaths) || campaign.amendmentPaths.length !== 2 ||
        campaign.amendmentPaths.some((item) => typeof item !== "string") ||
        !Array.isArray(campaign.amendmentSha256s) || campaign.amendmentSha256s.length !== 2 ||
        campaign.amendmentSha256s.some((hash) => typeof hash !== "string" || !SHA256.test(hash)) ||
        new Set(campaign.amendmentSha256s).size !== 2 ||
        !Array.isArray(campaign.countries) ||
        JSON.stringify(campaign.countries) !== JSON.stringify(STANDARD_COUNTRIES) ||
        !Array.isArray(campaign.selectedFamilies) || campaign.selectedFamilies.length !== 10 ||
        campaign.familyCount !== 10 || campaign.countryCount !== 9 || campaign.reciprocalSlotCount !== 2 ||
        campaign.observerConditionCount !== 2 ||
        campaign.endpointVersion !== LITERAL_BUILDING_ELIMINATION_ENDPOINT_VERSION ||
        campaign.endpointSha256 !== LITERAL_BUILDING_ELIMINATION_ENDPOINT_SHA256 ||
        campaign.outcomeAccess !== "outcome-free-state-exposure-only" ||
        campaign.sourceGitCommit !== execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim() ||
        execFileSync("git", ["branch", "--show-current"], { encoding: "utf8" }).trim() !== "main" ||
        execFileSync("git", ["status", "--short", "--untracked-files=no"], { encoding: "utf8" }).trim() !== "" ||
        campaign.cellCount !== 90 || campaign.launchedGameCount !== 360
    ) throw new Error("State-audit campaign or source contract failed");
    const campaignCountries = campaign.countries as Countries[];
    const selectedFamilies = campaign.selectedFamilies as RecordValue[];
    if (selectedFamilies.some((family) =>
        !isRecord(family) || typeof family.familyId !== "string" || family.familyId.length === 0 ||
        typeof family.mapName !== "string" || family.mapName.length === 0 ||
        typeof family.mapSha256 !== "string" || !SHA256.test(family.mapSha256)
    )) throw new Error("State-audit family contract failed");
    if (
        sha256File(campaign.protocolPath as string) !== campaign.protocolSha256 ||
        sha256File(campaign.sourceOpenCampaignPath as string) !== campaign.sourceOpenCampaignSha256 ||
        sha256File(campaign.generationManifestPath as string) !== campaign.generationManifestSha256 ||
        (campaign.amendmentPaths as string[]).some((item, index) =>
            sha256File(item) !== (campaign.amendmentSha256s as string[])[index]
        ) ||
        crypto.createHash("sha256").update(JSON.stringify(selectedFamilies)).digest("hex") !==
            campaign.populationSha256
    ) throw new Error("State-audit evidence commitments drifted");
    const schedulerTasks = parseFinishAdvantageStateAuditSacct(execFileSync(
        "/opt/slurm/current/bin/sacct",
        ["-j", arrayJobId, "-n", "-P", "-X", "--format=JobID,JobIDRaw,State,ExitCode,Account"],
        { encoding: "utf8" },
    ), arrayJobId);
    const exposures: ExposureCell[] = [];
    const artifactRows: Array<{ taskIndex: number; path: string; sha256: string }> = [];
    let stateRecordCount = 0;
    let ownershipUnavailableRecordCount = 0;
    let irreversibleExposedCellCount = 0;
    for (let taskIndex = 0; taskIndex < 90; taskIndex += 1) {
        const filePath = path.join(
            resultsRoot,
            `task-${String(taskIndex).padStart(3, "0")}`,
            "cell.json",
        );
        const value = readJson(filePath);
        assertFiniteJsonNumbers(value, `task-${taskIndex}`);
        const expectedFamilyOrdinal = Math.floor(taskIndex / 9);
        const expectedCountryOrdinal = taskIndex % 9;
        const expectedFamily = selectedFamilies[expectedFamilyOrdinal];
        const expectedCountry = campaignCountries[expectedCountryOrdinal];
        if (
            !isRecord(value) || value.schemaVersion !== 1 || value.passed !== true ||
            value.status !== "PASS_OUTCOME_BLIND_STATE_AUDIT_CELL" || value.taskIndex !== taskIndex ||
            value.outcomeFree !== true || value.familyOrdinal !== expectedFamilyOrdinal ||
            value.familyId !== expectedFamily.familyId || value.mapName !== expectedFamily.mapName ||
            value.mapSha256 !== expectedFamily.mapSha256 || value.countryOrdinal !== expectedCountryOrdinal ||
            value.country !== expectedCountry ||
            value.sourceGitCommit !== campaign.sourceGitCommit ||
            value.sourceRuntimeSha256 !== campaign.sourceRuntimeSha256 ||
            value.externalBaselineRuntimeSha256 !== campaign.externalBaselineRuntimeSha256 ||
            value.gameApiRuntimeSha256 !== campaign.gameApiRuntimeSha256 ||
            value.packageLockSha256 !== campaign.packageLockSha256 ||
            value.populationSha256 !== campaign.populationSha256 ||
            value.protocolSha256 !== campaign.protocolSha256 ||
            JSON.stringify(value.amendmentSha256s) !== JSON.stringify(campaign.amendmentSha256s) ||
            value.endpointVersion !== campaign.endpointVersion || value.endpointSha256 !== campaign.endpointSha256 ||
            value.requestedEngineSeed !== 4_225_000_000 + taskIndex || value.launchedGameCount !== 4 ||
            !isRecord(value.scheduler) || value.scheduler.account !== "pi_jss233" ||
            String(value.scheduler.arrayJobId) !== arrayJobId || !Array.isArray(value.validationErrors) ||
            value.scheduler.jobId !== schedulerTasks.get(taskIndex)?.schedulerJobId ||
            !isRecord(value.externalBaseline) ||
            value.externalBaseline.gitCommit !== campaign.externalBaselineGitCommit ||
            !isRecord(value.externalBaseline.runtimeTree) ||
            value.externalBaseline.runtimeTree.sha256 !== campaign.externalBaselineRuntimeSha256 ||
            value.validationErrors.length !== 0 || !Array.isArray(value.pairs) || value.pairs.length !== 2 ||
            !schedulerTasks.has(taskIndex)
        ) throw new Error(`State-audit task ${taskIndex} failed structural or scheduler validation`);
        const familyId = String(value.familyId);
        const country = value.country as Countries;
        const faction = ALLIED.has(country) ? "Allied" : "Soviet";
        const observedSlots = new Set<number>();
        for (const pair of value.pairs) {
            if (
                !isRecord(pair) || pair.equivalent !== true ||
                (pair.candidateSlot !== 0 && pair.candidateSlot !== 1) || !Array.isArray(pair.stateRecords) ||
                pair.stateRecords.length === 0
            ) throw new Error(`State-audit task ${taskIndex} has an invalid observer pair`);
            const candidateSlot = pair.candidateSlot as 0 | 1;
            if (observedSlots.has(candidateSlot)) {
                throw new Error(`State-audit task ${taskIndex} duplicates candidate slot ${candidateSlot}`);
            }
            observedSlots.add(candidateSlot);
            stateRecordCount += pair.stateRecords.length;
            const maximumByMargin = new Map<Margin, number>();
            let pairIrreversible = false;
            for (const state of pair.stateRecords) {
                if (
                    !isRecord(state) || state.event !== "finish_advantage_state" ||
                    state.informationInterface !== "public_complete_state" ||
                    state.country !== country || state.candidateSlot !== candidateSlot || state.faction !== faction ||
                    Number(state.ownBuildingCount) <= 0 || Number(state.enemyBuildingCount) <= 0 ||
                    !Array.isArray(state.margins) || state.margins.length !== MARGINS.length ||
                    !Array.isArray(state.forbiddenFieldsEmitted) || state.forbiddenFieldsEmitted.length !== 0
                ) throw new Error(`State-audit task ${taskIndex} has a malformed state record`);
                if (state.irreversibleCertificate === true) pairIrreversible = true;
                if (state.missionOwnershipAvailable !== true) ownershipUnavailableRecordCount += 1;
                const observedMargins = new Set<Margin>();
                for (const marginState of state.margins) {
                    if (!isRecord(marginState) || !MARGINS.includes(marginState.margin as Margin)) {
                        throw new Error(`State-audit task ${taskIndex} has malformed margin state`);
                    }
                    const margin = marginState.margin as Margin;
                    if (observedMargins.has(margin)) {
                        throw new Error(`State-audit task ${taskIndex} duplicates margin ${margin}`);
                    }
                    observedMargins.add(margin);
                    const qualifies = state.missionOwnershipAvailable === true &&
                        Number(marginState.effectiveStrikeCount) > 0 &&
                        Number(marginState.compatibleFiniteTargetCount) > 0;
                    if (marginState.exposed !== qualifies) {
                        throw new Error(`State-audit task ${taskIndex} has inconsistent margin exposure`);
                    }
                    if (qualifies) {
                        maximumByMargin.set(margin, Math.max(
                            maximumByMargin.get(margin) ?? 0,
                            Number(marginState.effectiveStrikeCount),
                        ));
                    }
                }
            }
            if (observedSlots.size > 2) throw new Error(`State-audit task ${taskIndex} has excess slots`);
            for (const [margin, maximumPositiveStrikeSize] of maximumByMargin) {
                exposures.push({ familyId, country, faction, candidateSlot, margin, maximumPositiveStrikeSize });
            }
            if (pairIrreversible) irreversibleExposedCellCount += 1;
        }
        if (observedSlots.size !== 2 || !observedSlots.has(0) || !observedSlots.has(1)) {
            throw new Error(`State-audit task ${taskIndex} lacks exact reciprocal slots`);
        }
        artifactRows.push({ taskIndex, path: filePath, sha256: sha256File(filePath) });
    }
    if (stateRecordCount === 0) throw new Error("State audit emitted no state records");
    const marginExposure = summarizeFinishAdvantageMarginExposure(exposures);
    const selectedMargins = selectFinishAdvantageMargins(marginExposure);
    const artifactCommitmentSha256 = crypto.createHash("sha256")
        .update(JSON.stringify(artifactRows.map(({ taskIndex, sha256 }) => ({ taskIndex, sha256 }))))
        .digest("hex");
    const output = {
        schemaVersion: 1,
        kind: "finish-advantage-outcome-blind-state-audit-finalizer",
        status: "PASS_OUTCOME_BLIND_STATE_AUDIT",
        passed: true,
        outcomeFree: true,
        generatedAt: new Date().toISOString(),
        sourceGitCommit: campaign.sourceGitCommit,
        sourceRuntimeSha256: campaign.sourceRuntimeSha256,
        externalBaselineGitCommit: campaign.externalBaselineGitCommit,
        externalBaselineRuntimeSha256: campaign.externalBaselineRuntimeSha256,
        gameApiRuntimeSha256: campaign.gameApiRuntimeSha256,
        packageLockSha256: campaign.packageLockSha256,
        populationSha256: campaign.populationSha256,
        sourceOpenCampaignSha256: campaign.sourceOpenCampaignSha256,
        generationManifestSha256: campaign.generationManifestSha256,
        protocolSha256: campaign.protocolSha256,
        amendmentSha256s: campaign.amendmentSha256s,
        endpointVersion: campaign.endpointVersion,
        endpointSha256: campaign.endpointSha256,
        campaignPath,
        campaignSha256,
        arrayJobId,
        controllerJobId: process.env.SLURM_JOB_ID ?? null,
        schedulerAccount: process.env.SLURM_JOB_ACCOUNT ?? null,
        schedulerJobIds: [...schedulerTasks.values()].map(({ schedulerJobId }) => schedulerJobId),
        launchedGameCount: 360,
        cellCount: 90,
        familyCount: 10,
        countryCount: 9,
        reciprocalSlotCount: 2,
        observerConditionCount: 2,
        stateRecordCount,
        ownershipUnavailableRecordCount,
        irreversibleExposedCellCount,
        marginExposure,
        selectedMargins,
        artifactCommitmentSha256,
        artifactRows,
        fieldsProvenAbsent: [
            "winner",
            "score",
            "outcome",
            "terminal building counts",
            "endpoint orientation",
            "resignation signal in state exposure",
        ],
    };
    fs.mkdirSync(path.dirname(outputPath), { recursive: true, mode: 0o700 });
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2) + "\n", { flag: "wx", mode: 0o600 });
    console.log(JSON.stringify({
        outFile: outputPath,
        sha256: sha256File(outputPath),
        status: output.status,
        selectedMargins,
    }));
};

const invoked = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (import.meta.url === invoked) {
    try { main(); } catch (error) { console.error(error); process.exitCode = 1; }
}
