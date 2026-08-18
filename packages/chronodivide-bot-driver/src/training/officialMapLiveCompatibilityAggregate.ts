import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
    OfficialMapLiveCampaign,
    validateOfficialMapLiveCampaign,
} from "./officialMapLiveCompatibilityCampaign.js";
import { sha256File } from "./methodV5PlanRunner.js";

type RecordValue = Record<string, unknown>;
type SchedulerTask = {
    schedulerJobId: string;
    state: "COMPLETED";
    exitCode: "0:0";
    account: "pi_jss233";
};
type ValidatedCell = {
    taskIndex: number;
    familyOrdinal: number;
    familyId: string;
    theater: string;
    country: string;
    candidateSlot: 0 | 1;
    passed: boolean;
    launchedGameCount: 2;
    validationErrors: string[];
    reviewCategories: string[];
    artifactPath: string;
    artifactSha256: string;
    privateDiagnosticsPath: string;
    privateDiagnosticsSha256: string;
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

const forbiddenField = (value: unknown): string | null => {
    const forbidden = /(^|_)(winner|loser|loss|draw|score|credit|resource|surviving|remaining_building|policy_action|terminal_orientation)($|_)/i;
    const stack: unknown[] = [value];
    while (stack.length > 0) {
        const item = stack.pop();
        if (Array.isArray(item)) stack.push(...item);
        else if (isRecord(item)) {
            for (const [key, child] of Object.entries(item)) {
                if (forbidden.test(key)) return key;
                stack.push(child);
            }
        }
    }
    return null;
};

const assertFiniteNumbers = (value: unknown, label: string): void => {
    const stack: unknown[] = [value];
    while (stack.length > 0) {
        const item = stack.pop();
        if (typeof item === "number" && !Number.isFinite(item)) {
            throw new Error(`${label} contains a non-finite number`);
        }
        if (Array.isArray(item)) stack.push(...item);
        else if (isRecord(item)) stack.push(...Object.values(item));
    }
};

export const parseOfficialMapLiveSacct = (
    raw: string,
    arrayJobId: string,
): Map<number, SchedulerTask> => {
    const tasks = new Map<number, SchedulerTask>();
    for (const [lineIndex, line] of raw.split("\n").entries()) {
        if (!line) continue;
        const fields = line.split("|");
        if (fields.length !== 5) throw new Error(`Official-map sacct line ${lineIndex + 1} is malformed`);
        const [logicalJobId, schedulerJobId, state, exitCode, account] = fields;
        const match = new RegExp(`^${arrayJobId}_(\\d+)$`).exec(logicalJobId);
        const taskIndex = match ? Number(match[1]) : -1;
        if (
            !match || !/^\d+$/.test(schedulerJobId) || taskIndex < 0 || taskIndex >= 738 ||
            tasks.has(taskIndex) || state !== "COMPLETED" || exitCode !== "0:0" || account !== "pi_jss233"
        ) throw new Error(`Official-map scheduler row ${lineIndex + 1} is failed, duplicate, or unauthorized`);
        tasks.set(taskIndex, { schedulerJobId, state, exitCode, account });
    }
    if (tasks.size !== 738) throw new Error(`Official-map sacct returned ${tasks.size}/738 tasks`);
    return tasks;
};

const stringArray = (value: unknown): value is string[] =>
    Array.isArray(value) && value.every((item) => typeof item === "string");

const validateCell = (args: {
    value: unknown;
    filePath: string;
    taskIndex: number;
    campaign: OfficialMapLiveCampaign;
    arrayJobId: string;
    scheduler: SchedulerTask;
}): ValidatedCell => {
    const { value, filePath, taskIndex, campaign, arrayJobId, scheduler } = args;
    assertFiniteNumbers(value, `official-map task ${taskIndex}`);
    const forbidden = forbiddenField(value);
    if (forbidden !== null) throw new Error(`Official-map task ${taskIndex} contains forbidden field ${forbidden}`);
    const familyOrdinal = Math.floor(taskIndex / 18);
    const withinFamilyOrdinal = taskIndex % 18;
    const countryOrdinal = Math.floor(withinFamilyOrdinal / 2);
    const candidateSlot = (withinFamilyOrdinal % 2) as 0 | 1;
    const family = campaign.selectedFamilies[familyOrdinal];
    const country = campaign.countries[countryOrdinal];
    const requestedEngineSeed = campaign.engineSeedBase + familyOrdinal * 9 + countryOrdinal;
    if (
        !isRecord(value) || value.schemaVersion !== 1 ||
        value.kind !== "official-map-live-outcome-blind-compatibility-cell" ||
        (value.status !== "PASS_OFFICIAL_MAP_LIVE_COMPATIBILITY_CELL" &&
            value.status !== "FAIL_OFFICIAL_MAP_LIVE_COMPATIBILITY_CELL") ||
        typeof value.passed !== "boolean" || value.outcomeFree !== true ||
        !Array.isArray(value.forbiddenFieldsEmitted) || value.forbiddenFieldsEmitted.length !== 0 ||
        value.taskIndex !== taskIndex || value.familyOrdinal !== familyOrdinal ||
        value.familyId !== family.familyId || value.mapName !== family.mapName ||
        value.mapSha256 !== family.mapSha256 || value.mapBytes !== family.mapBytes ||
        value.theater !== family.theater ||
        JSON.stringify(value.mapBounds) !== JSON.stringify(family.mapBounds) ||
        JSON.stringify(value.localBounds) !== JSON.stringify(family.localBounds) ||
        value.declaredStartCount !== family.declaredStartCount ||
        JSON.stringify(value.declaredStartLocations) !== JSON.stringify(family.declaredStartLocations) ||
        JSON.stringify(value.staticComplexity) !== JSON.stringify(family.staticComplexity) ||
        value.countryOrdinal !== countryOrdinal || value.country !== country ||
        value.candidateSlot !== candidateSlot || value.requestedEngineSeed !== requestedEngineSeed ||
        value.targetTick !== campaign.targetTick || value.launchedGameCount !== 2 ||
        value.sourceGitCommit !== campaign.sourceGitCommit ||
        value.sourceRuntimeSha256 !== campaign.sourceRuntimeSha256 ||
        value.externalBaselineGitCommit !== campaign.externalBaselineGitCommit ||
        value.externalBaselineRuntimeSha256 !== campaign.externalBaselineRuntimeSha256 ||
        value.gameApiRuntimeSha256 !== campaign.gameApiRuntimeSha256 ||
        value.packageLockSha256 !== campaign.packageLockSha256 ||
        value.candidatePolicyId !== campaign.candidatePolicyId ||
        value.populationSha256 !== campaign.populationSha256 || value.protocolSha256 !== campaign.protocolSha256 ||
        value.repairAmendmentSha256 !== campaign.repairAmendmentSha256 ||
        value.cacheReuseAmendmentSha256 !== campaign.cacheReuseAmendmentSha256 ||
        !isRecord(value.scheduler) || value.scheduler.account !== "pi_jss233" ||
        String(value.scheduler.arrayJobId) !== arrayJobId || value.scheduler.jobId !== scheduler.schedulerJobId ||
        !isRecord(value.mapLoadAttestation) || value.mapLoadAttestation.complete !== true ||
        value.mapLoadAttestation.expectedBytes !== family.mapBytes ||
        value.mapLoadAttestation.expectedSha256 !== family.mapSha256 ||
        !Array.isArray(value.mapLoadAttestation.phases) || value.mapLoadAttestation.phases.length !== 3 ||
        value.mapLoadAttestation.readPolicy !== "authenticated_cache_reuse_v2" ||
        !Array.isArray(value.mapLoadAttestation.authenticatedCacheReusePhases) ||
        !SHA256.test(String(value.mapLoadAttestation.readsSha256)) ||
        !isRecord(value.initialization) || !Array.isArray(value.replicates) || value.replicates.length !== 2 ||
        typeof value.deterministic !== "boolean" || !stringArray(value.validationErrors) ||
        !isRecord(value.privateDiagnostics) || typeof value.privateDiagnostics.path !== "string" ||
        !SHA256.test(String(value.privateDiagnostics.sha256)) ||
        typeof value.privateDiagnostics.recordCount !== "number" ||
        !Number.isSafeInteger(value.privateDiagnostics.recordCount) || value.privateDiagnostics.recordCount < 0
    ) throw new Error(`Official-map task ${taskIndex} failed structural or provenance validation`);
    const phases = value.mapLoadAttestation.phases as RecordValue[];
    const initialization = phases[0];
    const forward = phases[1];
    const reverse = phases[2];
    const createReads = Number(forward.observedReads);
    const expectedCacheReusePhases = createReads === 0 ? ["forward_create", "reverse_create"] : [];
    if (
        initialization.phase !== "initialization" || initialization.expectedReads !== 1 ||
        initialization.observedReads !== 1 || forward.phase !== "forward_create" ||
        forward.expectedReads !== 2 || reverse.phase !== "reverse_create" || reverse.expectedReads !== 2 ||
        (createReads !== 0 && createReads !== 2) || reverse.observedReads !== createReads ||
        JSON.stringify(value.mapLoadAttestation.authenticatedCacheReusePhases) !==
            JSON.stringify(expectedCacheReusePhases)
    ) throw new Error(`Official-map task ${taskIndex} map-read attestation drifted`);
    const digests = new Set<string>();
    const reviews: string[] = [];
    for (const [replicateIndex, replicate] of value.replicates.entries()) {
        if (
            !isRecord(replicate) || replicate.replicate !== replicateIndex ||
            replicate.candidateSlot !== candidateSlot || replicate.requestedEngineSeed !== requestedEngineSeed ||
            !SHA256.test(String(replicate.gameModeSha256)) || !Number.isSafeInteger(replicate.initialTick) ||
            !Number.isSafeInteger(replicate.finalTick) || !Number.isSafeInteger(replicate.updateCount) ||
            replicate.tickArithmeticConsistent !== true || replicate.reachedTargetTick !== true ||
            !isRecord(replicate.candidateStart) || !isRecord(replicate.baselineStart) ||
            replicate.distinctStarts !== true || replicate.startsDeclared !== true ||
            !Array.isArray(replicate.warnings) || typeof replicate.warningCaptureTruncated !== "boolean" ||
            (replicate.error !== null && !isRecord(replicate.error)) ||
            !stringArray(replicate.failureCategories) || !stringArray(replicate.reviewCategories) ||
            !SHA256.test(String(replicate.technicalDigestSha256))
        ) throw new Error(`Official-map task ${taskIndex} replicate ${replicateIndex} is malformed`);
        digests.add(String(replicate.technicalDigestSha256));
        reviews.push(...replicate.reviewCategories);
    }
    const deterministic = digests.size === 1;
    if (value.deterministic !== deterministic) {
        throw new Error(`Official-map task ${taskIndex} determinism verdict is inconsistent`);
    }
    const passed = value.validationErrors.length === 0;
    if (
        value.passed !== passed ||
        value.status !== (passed
            ? "PASS_OFFICIAL_MAP_LIVE_COMPATIBILITY_CELL"
            : "FAIL_OFFICIAL_MAP_LIVE_COMPATIBILITY_CELL")
    ) throw new Error(`Official-map task ${taskIndex} pass status is inconsistent`);
    const privateDiagnosticsPath = path.resolve(value.privateDiagnostics.path as string);
    if (
        !fs.existsSync(privateDiagnosticsPath) ||
        sha256File(privateDiagnosticsPath) !== value.privateDiagnostics.sha256
    ) throw new Error(`Official-map task ${taskIndex} private diagnostics drifted`);
    if (stringArray(value.initializationReviewCategories)) reviews.push(...value.initializationReviewCategories);
    return {
        taskIndex,
        familyOrdinal,
        familyId: family.familyId,
        theater: family.theater,
        country,
        candidateSlot,
        passed,
        launchedGameCount: 2,
        validationErrors: value.validationErrors,
        reviewCategories: [...new Set(reviews)].sort(),
        artifactPath: filePath,
        artifactSha256: sha256File(filePath),
        privateDiagnosticsPath,
        privateDiagnosticsSha256: String(value.privateDiagnostics.sha256),
    };
};

const counts = (items: readonly string[]): Record<string, number> => {
    const output: Record<string, number> = {};
    for (const item of items) output[item] = (output[item] ?? 0) + 1;
    return Object.fromEntries(Object.entries(output).sort(([left], [right]) => left.localeCompare(right)));
};

const main = (): void => {
    const campaignPath = requiredPath("CAMPAIGN");
    const resultsRoot = requiredPath("RESULTS_ROOT");
    const outputPath = requiredPath("OUT_FILE");
    const campaignSha256 = requiredText("CAMPAIGN_SHA256", SHA256);
    const arrayJobId = requiredText("ARRAY_JOB_ID", /^\d+$/);
    if (process.env.SLURM_JOB_ACCOUNT !== "pi_jss233") {
        throw new Error("Official-map finalizer requires Slurm account pi_jss233");
    }
    if (fs.existsSync(outputPath)) throw new Error(`Refusing to overwrite ${outputPath}`);
    if (sha256File(campaignPath) !== campaignSha256) throw new Error("Official-map campaign drifted");
    const campaign = validateOfficialMapLiveCampaign(readJson(campaignPath));
    if (
        campaign.sourceGitCommit !== execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim() ||
        execFileSync("git", ["branch", "--show-current"], { encoding: "utf8" }).trim() !== "main" ||
        execFileSync("git", ["status", "--short", "--untracked-files=no"], { encoding: "utf8" }).trim() !== ""
    ) throw new Error("Official-map finalizer source contract failed");
    const schedulerTasks = parseOfficialMapLiveSacct(execFileSync(
        "/opt/slurm/current/bin/sacct",
        ["-j", arrayJobId, "-n", "-P", "-X", "--format=JobID,JobIDRaw,State,ExitCode,Account"],
        { encoding: "utf8" },
    ), arrayJobId);
    const cells: ValidatedCell[] = [];
    for (let taskIndex = 0; taskIndex < 738; taskIndex += 1) {
        const filePath = path.join(
            resultsRoot,
            `task-${String(taskIndex).padStart(3, "0")}`,
            "cell.json",
        );
        cells.push(validateCell({
            value: readJson(filePath),
            filePath,
            taskIndex,
            campaign,
            arrayJobId,
            scheduler: schedulerTasks.get(taskIndex)!,
        }));
    }
    const familyRows = campaign.selectedFamilies.map((family, familyOrdinal) => {
        const familyCells = cells.filter((cell) => cell.familyOrdinal === familyOrdinal);
        const passCellCount = familyCells.filter(({ passed }) => passed).length;
        if (
            familyCells.length !== 18 || new Set(familyCells.map(({ country }) => country)).size !== 9 ||
            new Set(familyCells.map(({ candidateSlot }) => candidateSlot)).size !== 2
        ) throw new Error(`Official-map family ${family.familyId} lacks the exact 18-cell matrix`);
        return {
            familyOrdinal,
            familyId: family.familyId,
            mapName: family.mapName,
            mapSha256: family.mapSha256,
            theater: family.theater,
            staticCompatibilityPass: false,
            staticExclusionReasons: family.staticComplexity.exclusionReasons,
            cellCount: 18,
            launchedGameCount: 36,
            passCellCount,
            failCellCount: 18 - passCellCount,
            warningReviewCounts: counts(familyCells.flatMap(({ reviewCategories }) => reviewCategories)),
            failureCounts: counts(familyCells.flatMap(({ validationErrors }) => validationErrors)),
            liveCompatibilityStatus: passCellCount === 18 ? "pass" : "fail",
        };
    });
    const passedFamilies = familyRows.filter(({ liveCompatibilityStatus }) =>
        liveCompatibilityStatus === "pass",
    );
    const artifactRows = cells.map((cell) => ({
        taskIndex: cell.taskIndex,
        cellPath: cell.artifactPath,
        cellSha256: cell.artifactSha256,
        privateDiagnosticsPath: cell.privateDiagnosticsPath,
        privateDiagnosticsSha256: cell.privateDiagnosticsSha256,
    }));
    const artifactCommitmentSha256 = crypto.createHash("sha256")
        .update(JSON.stringify(artifactRows.map(({ taskIndex, cellSha256, privateDiagnosticsSha256 }) => ({
            taskIndex,
            cellSha256,
            privateDiagnosticsSha256,
        }))))
        .digest("hex");
    const output = {
        schemaVersion: 1,
        kind: "official-map-live-outcome-blind-compatibility-finalizer",
        status: "COMPLETE_OFFICIAL_MAP_LIVE_COMPATIBILITY_GATE",
        complete: true,
        outcomeFree: true,
        notPolicyOutcomeEvidence: true,
        generatedAt: new Date().toISOString(),
        sourceGitCommit: campaign.sourceGitCommit,
        sourceRuntimeSha256: campaign.sourceRuntimeSha256,
        externalBaselineGitCommit: campaign.externalBaselineGitCommit,
        externalBaselineRuntimeSha256: campaign.externalBaselineRuntimeSha256,
        gameApiRuntimeSha256: campaign.gameApiRuntimeSha256,
        packageLockSha256: campaign.packageLockSha256,
        candidatePolicyId: campaign.candidatePolicyId,
        populationSha256: campaign.populationSha256,
        identityAuditSha256: campaign.identityAuditSha256,
        staticScreenSha256: campaign.staticScreenSha256,
        protocolSha256: campaign.protocolSha256,
        repairAmendmentSha256: campaign.repairAmendmentSha256,
        cacheReuseAmendmentSha256: campaign.cacheReuseAmendmentSha256,
        campaignPath,
        campaignSha256,
        arrayJobId,
        controllerJobId: process.env.SLURM_JOB_ID ?? null,
        schedulerAccount: process.env.SLURM_JOB_ACCOUNT,
        schedulerJobIds: [...schedulerTasks.values()].map(({ schedulerJobId }) => schedulerJobId),
        familyCount: 41,
        cellCount: 738,
        launchedGameCount: 1_476,
        passCellCount: cells.filter(({ passed }) => passed).length,
        failCellCount: cells.filter(({ passed }) => !passed).length,
        liveCompatibleFamilyCount: passedFamilies.length,
        liveIncompatibleFamilyCount: 41 - passedFamilies.length,
        liveCompatibleFamilyIds: passedFamilies.map(({ familyId }) => familyId),
        liveCompatiblePopulationSha256: crypto.createHash("sha256")
            .update(JSON.stringify(passedFamilies.map(({ familyId, mapSha256 }) => ({ familyId, mapSha256 }))))
            .digest("hex"),
        theaterCounts: counts(familyRows.map(({ theater }) => theater)),
        liveCompatibleTheaterCounts: counts(passedFamilies.map(({ theater }) => theater)),
        familyRows,
        artifactCommitmentSha256,
        artifactRows,
        fieldsProvenAbsent: [
            "winner or loser",
            "win, loss, or draw outcome",
            "score or resources",
            "surviving units or remaining buildings",
            "policy actions",
            "terminal orientation",
        ],
    };
    fs.mkdirSync(path.dirname(outputPath), { recursive: true, mode: 0o700 });
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2) + "\n", { flag: "wx", mode: 0o600 });
    console.log(JSON.stringify({
        outFile: outputPath,
        sha256: sha256File(outputPath),
        status: output.status,
        liveCompatibleFamilyCount: output.liveCompatibleFamilyCount,
    }));
};

const invoked = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (import.meta.url === invoked) {
    try { main(); } catch (error) { console.error(error); process.exitCode = 1; }
}
