import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { cdapi } from "@chronodivide/game-api";
import { Countries } from "@supalosa/chronodivide-bot/dist/bot/logic/common/utils.js";
import { loadBaselineFactory } from "../benchmark/baselineLoader.js";
import { createExperimentManifest } from "../benchmark/provenance.js";
import { sha256File } from "./methodV5PlanRunner.js";
import {
    LITERAL_BUILDING_ELIMINATION_ENDPOINT_SHA256,
    LITERAL_BUILDING_ELIMINATION_ENDPOINT_VERSION,
} from "./literalBuildingEliminationEndpoint.js";
import {
    FINISH_ADVANTAGE_STATE_AUDIT_ENGINE_SEED_BASE,
    FINISH_ADVANTAGE_STATE_AUDIT_OPEN_CAMPAIGN_SHA256,
} from "./finishAdvantageStateAuditCampaign.js";
import {
    FinishAdvantageStateAuditTrace,
    runFinishAdvantageStateAuditTrace,
} from "./finishAdvantageStateAuditTrace.js";

type AuditFamily = { familyId: string; mapName: string; mapSha256: string };
type AuditCampaign = {
    schemaVersion: 2;
    kind: "finish-advantage-outcome-blind-state-audit";
    status: "FROZEN_FINISH_ADVANTAGE_OUTCOME_BLIND_STATE_AUDIT_V2_RUNTIME_REPAIR";
    generatedAt: string;
    sourceGitCommit: string;
    sourceRuntimeSha256: string;
    externalBaselineRuntimeSha256: string;
    gameApiRuntimeSha256: string;
    packageLockSha256: string;
    populationSha256: string;
    sourceOpenCampaignPath: string;
    sourceOpenCampaignSha256: typeof FINISH_ADVANTAGE_STATE_AUDIT_OPEN_CAMPAIGN_SHA256;
    generationManifestPath: string;
    generationManifestSha256: string;
    protocolPath: string;
    protocolSha256: string;
    amendmentPaths: [string, string, string, string];
    amendmentSha256s: [string, string, string, string];
    externalBaselineGitCommit: string;
    endpointVersion: typeof LITERAL_BUILDING_ELIMINATION_ENDPOINT_VERSION;
    endpointSha256: typeof LITERAL_BUILDING_ELIMINATION_ENDPOINT_SHA256;
    outcomeAccess: "outcome-free-state-exposure-only";
    familyCount: 10;
    countryCount: 9;
    reciprocalSlotCount: 2;
    observerConditionCount: 2;
    engineSeedBase: typeof FINISH_ADVANTAGE_STATE_AUDIT_ENGINE_SEED_BASE;
    maxTicks: 24_000;
    countries: Countries[];
    selectedFamilies: AuditFamily[];
    cellCount: 90;
    launchedGameCount: 360;
};

const SHA256 = /^[0-9a-f]{64}$/;
const GIT_COMMIT = /^[0-9a-f]{40}$/;
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
const ALLIED_COUNTRIES = new Set<Countries>(STANDARD_COUNTRIES.slice(0, 5));
const sha256Text = (value: string): string => crypto.createHash("sha256").update(value).digest("hex");
const runtimeCommitment = (value: unknown): string => sha256Text(JSON.stringify(value));

const requiredPath = (name: string): string => {
    const value = process.env[name];
    if (!value) throw new Error(`${name} is required`);
    return path.resolve(value);
};

const requiredTaskIndex = (): number => {
    const raw = process.env.SLURM_ARRAY_TASK_ID;
    const value = raw === undefined ? Number.NaN : Number(raw);
    if (!Number.isSafeInteger(value) || value < 0 || value >= 90) {
        throw new Error("SLURM_ARRAY_TASK_ID must select one of 90 state-audit cells");
    }
    return value;
};

const readCampaign = (campaignPath: string): AuditCampaign => {
    const value = JSON.parse(fs.readFileSync(campaignPath, "utf8")) as AuditCampaign;
    if (
        value.schemaVersion !== 2 || value.kind !== "finish-advantage-outcome-blind-state-audit" ||
        value.status !== "FROZEN_FINISH_ADVANTAGE_OUTCOME_BLIND_STATE_AUDIT_V2_RUNTIME_REPAIR" ||
        typeof value.generatedAt !== "string" || Number.isNaN(Date.parse(value.generatedAt)) ||
        value.engineSeedBase !== FINISH_ADVANTAGE_STATE_AUDIT_ENGINE_SEED_BASE || value.maxTicks !== 24_000 ||
        value.selectedFamilies?.length !== 10 || value.countries?.length !== 9 ||
        value.familyCount !== 10 || value.countryCount !== 9 || value.reciprocalSlotCount !== 2 ||
        value.observerConditionCount !== 2 || value.cellCount !== 90 || value.launchedGameCount !== 360 ||
        !GIT_COMMIT.test(value.sourceGitCommit) || !GIT_COMMIT.test(value.externalBaselineGitCommit) ||
        !SHA256.test(value.sourceRuntimeSha256) || !SHA256.test(value.externalBaselineRuntimeSha256) ||
        !SHA256.test(value.gameApiRuntimeSha256) || !SHA256.test(value.packageLockSha256) ||
        !SHA256.test(value.populationSha256) || typeof value.sourceOpenCampaignPath !== "string" ||
        value.sourceOpenCampaignSha256 !== FINISH_ADVANTAGE_STATE_AUDIT_OPEN_CAMPAIGN_SHA256 ||
        typeof value.generationManifestPath !== "string" || !SHA256.test(value.generationManifestSha256) ||
        typeof value.protocolPath !== "string" ||
        !SHA256.test(value.protocolSha256) || !Array.isArray(value.amendmentPaths) ||
        value.amendmentPaths.length !== 4 || value.amendmentPaths.some((item) => typeof item !== "string") ||
        !Array.isArray(value.amendmentSha256s) ||
        value.amendmentSha256s.length !== 4 || value.amendmentSha256s.some((hash) => !SHA256.test(hash)) ||
        new Set(value.amendmentSha256s).size !== 4 ||
        value.endpointVersion !== LITERAL_BUILDING_ELIMINATION_ENDPOINT_VERSION ||
        value.endpointSha256 !== LITERAL_BUILDING_ELIMINATION_ENDPOINT_SHA256 ||
        value.outcomeAccess !== "outcome-free-state-exposure-only" ||
        JSON.stringify(value.countries) !== JSON.stringify(STANDARD_COUNTRIES) ||
        new Set(value.selectedFamilies.map(({ familyId }) => familyId)).size !== 10 ||
        new Set(value.selectedFamilies.map(({ mapName }) => mapName)).size !== 10 ||
        value.selectedFamilies.some(({ familyId, mapName, mapSha256 }) =>
            typeof familyId !== "string" || familyId.length === 0 ||
            typeof mapName !== "string" || mapName.length === 0 || !SHA256.test(mapSha256)
        )
    ) throw new Error("Finish-advantage state-audit campaign contract drifted");
    if (
        sha256File(value.protocolPath) !== value.protocolSha256 ||
        sha256File(value.sourceOpenCampaignPath) !== value.sourceOpenCampaignSha256 ||
        sha256File(value.generationManifestPath) !== value.generationManifestSha256 ||
        value.amendmentPaths.some((item, index) => sha256File(item) !== value.amendmentSha256s[index]) ||
        sha256Text(JSON.stringify(value.selectedFamilies)) !== value.populationSha256
    ) throw new Error("Finish-advantage state-audit campaign evidence drifted");
    return value;
};

const forbiddenStateField = (value: unknown): string | null => {
    const forbidden = /(^|_)(winner|score|outcome|endpoint|terminal_building|quit|resignation)($|_)/i;
    const stack: unknown[] = [value];
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

const equivalenceFields = (trace: FinishAdvantageStateAuditTrace) => ({
    requestedEngineSeed: trace.requestedEngineSeed,
    observedTicks: trace.observedTicks,
    engineFinishObservedAtTick: trace.engineFinishObservedAtTick,
    candidateActionCount: trace.candidateActionCount,
    candidateActionTraceSha256: trace.candidateActionTraceSha256,
    fixedSnapshotCount: trace.fixedSnapshotCount,
    fixedSnapshotSha256: trace.fixedSnapshotSha256,
    suppressedQuitAttempts: trace.suppressedQuitAttempts,
    dispositionHistorySha256: trace.dispositionHistorySha256,
    dispositionCount: trace.dispositionCount,
    terminalTechnicalStatusSha256: trace.terminalTechnicalStatusSha256,
});

const main = async (): Promise<void> => {
    const taskIndex = requiredTaskIndex();
    const campaignPath = requiredPath("CAMPAIGN_PATH");
    const outFile = requiredPath("OUT_FILE");
    if (fs.existsSync(outFile)) throw new Error(`Refusing to overwrite ${outFile}`);
    if (!process.env.BASELINE_PACKAGE_ROOT || process.env.REQUIRE_EXTERNAL_BASELINE !== "true") {
        throw new Error("State audit requires the pinned external baseline");
    }
    const campaign = readCampaign(campaignPath);
    const familyOrdinal = Math.floor(taskIndex / campaign.countries.length);
    const countryOrdinal = taskIndex % campaign.countries.length;
    const family = campaign.selectedFamilies[familyOrdinal];
    const country = campaign.countries[countryOrdinal];
    const faction = ALLIED_COUNTRIES.has(country) ? "Allied" : "Soviet";
    const requestedEngineSeed = campaign.engineSeedBase + 9 * familyOrdinal + countryOrdinal;
    const repoRoot = path.resolve(process.cwd(), "..", "..");
    const mapPath = path.join(process.cwd(), "data", family.mapName);
    if (sha256File(mapPath) !== family.mapSha256) throw new Error("State-audit map bytes drifted");
    const factory = await loadBaselineFactory(path.join(repoRoot, "packages", "chronodivide-bot"));
    await cdapi.init(path.join(process.cwd(), "data"));
    const pairs = [];
    const validationErrors: string[] = [];
    for (const candidateSlot of [0, 1] as const) {
        const common = {
            factory,
            mapName: family.mapName,
            country,
            candidateSlot,
            requestedEngineSeed,
            maxTicks: campaign.maxTicks,
        };
        const unobserved = await runFinishAdvantageStateAuditTrace({ ...common, observed: false });
        const observed = await runFinishAdvantageStateAuditTrace({ ...common, observed: true });
        if (unobserved.stateRecords.length !== 0) {
            validationErrors.push(`slot ${candidateSlot} unobserved control emitted observer state`);
        }
        if (observed.stateRecords.length === 0) {
            validationErrors.push(`slot ${candidateSlot} observer emitted no nonterminal state record`);
        }
        const forbidden = forbiddenStateField(observed.stateRecords);
        if (forbidden !== null) validationErrors.push(`slot ${candidateSlot} emitted forbidden state field ${forbidden}`);
        if (observed.stateRecords.some((record) =>
            record.enemyBuildingCount <= 0 || record.ownBuildingCount <= 0 ||
            record.country !== country || record.candidateSlot !== candidateSlot || record.faction !== faction ||
            record.forbiddenFieldsEmitted.length !== 0
        )) validationErrors.push(`slot ${candidateSlot} persisted an unbound, terminal, or forbidden state record`);
        const control = equivalenceFields(unobserved);
        const treatment = equivalenceFields(observed);
        const equivalent = JSON.stringify(control) === JSON.stringify(treatment);
        if (!equivalent) validationErrors.push(`slot ${candidateSlot} passive observer changed the exact trace`);
        pairs.push({
            candidateSlot,
            equivalent,
            unobserved: control,
            observed: treatment,
            stateRecordCount: observed.stateRecords.length,
            stateRecords: observed.stateRecords,
        });
    }
    const manifest = createExperimentManifest({
        runId: `finish-advantage-state-audit-${process.env.SLURM_ARRAY_JOB_ID ?? "local"}-${taskIndex}`,
        mixDir: path.join(process.cwd(), "data"),
        maps: [family.mapName],
        effectiveConfig: {
            purpose: "outcome-blind-finish-advantage-state-exposure-and-passive-equivalence",
            taskIndex,
            familyOrdinal,
            familyId: family.familyId,
            countryOrdinal,
            country,
            requestedEngineSeed,
            reciprocalSlots: [0, 1],
            observerConditions: ["unobserved", "observed"],
            launchedGameCount: 4,
            maxTicks: campaign.maxTicks,
            populationSha256: campaign.populationSha256,
            protocolSha256: campaign.protocolSha256,
            amendmentSha256s: campaign.amendmentSha256s,
            outcomeInspection: false,
        },
        baseline: factory.descriptor,
        gameSeedBase: campaign.engineSeedBase,
    });
    if (
        manifest.scheduler.account !== "pi_jss233" || manifest.source.gitBranch !== "main" ||
        manifest.source.trackedDirty !== false || manifest.source.gitCommit !== campaign.sourceGitCommit ||
        runtimeCommitment(manifest.source.runtimeTrees) !== campaign.sourceRuntimeSha256 ||
        manifest.software.baseline.kind !== "external-package" ||
        manifest.software.baseline.trackedDirty !== false ||
        manifest.software.baseline.gitCommit !== campaign.externalBaselineGitCommit ||
        manifest.software.baseline.runtimeTree.sha256 !== campaign.externalBaselineRuntimeSha256 ||
        manifest.software.gameApiRuntimeTree.sha256 !== campaign.gameApiRuntimeSha256 ||
        manifest.software.packageLockSha256 !== campaign.packageLockSha256
    ) validationErrors.push("State-audit provenance contract failed");
    const output = {
        schemaVersion: 1,
        kind: "finish-advantage-outcome-blind-state-audit-cell",
        status: validationErrors.length === 0 ? "PASS_OUTCOME_BLIND_STATE_AUDIT_CELL" : "FAIL_STATE_AUDIT_CELL",
        passed: validationErrors.length === 0,
        outcomeFree: true,
        taskIndex,
        familyOrdinal,
        familyId: family.familyId,
        mapName: family.mapName,
        mapSha256: family.mapSha256,
        countryOrdinal,
        country,
        faction,
        requestedEngineSeed,
        launchedGameCount: 4,
        sourceGitCommit: manifest.source.gitCommit,
        sourceRuntimeSha256: campaign.sourceRuntimeSha256,
        externalBaselineRuntimeSha256: campaign.externalBaselineRuntimeSha256,
        gameApiRuntimeSha256: campaign.gameApiRuntimeSha256,
        packageLockSha256: campaign.packageLockSha256,
        populationSha256: campaign.populationSha256,
        protocolSha256: campaign.protocolSha256,
        amendmentSha256s: campaign.amendmentSha256s,
        endpointVersion: campaign.endpointVersion,
        endpointSha256: campaign.endpointSha256,
        scheduler: manifest.scheduler,
        externalBaseline: manifest.software.baseline,
        validationErrors,
        pairs,
        forbiddenFieldsEmitted: [],
    };
    fs.mkdirSync(path.dirname(outFile), { recursive: true, mode: 0o700 });
    fs.writeFileSync(outFile, JSON.stringify(output, null, 2) + "\n", { flag: "wx", mode: 0o600 });
    console.log(JSON.stringify({
        outFile,
        sha256: sha256File(outFile),
        status: output.status,
        taskIndex,
        stateRecordCount: pairs.reduce((sum, pair) => sum + pair.stateRecordCount, 0),
    }));
    if (!output.passed) throw new Error("Finish-advantage state-audit cell failed closed");
};

const invoked = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (import.meta.url === invoked) main().catch((error) => { console.error(error); process.exitCode = 1; });
