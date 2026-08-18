import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { Countries } from "@supalosa/chronodivide-bot/dist/bot/logic/common/utils.js";
import { loadBaselineFactory } from "../benchmark/baselineLoader.js";
import { createExperimentManifest } from "../benchmark/provenance.js";
import {
    LITERAL_BUILDING_ELIMINATION_ENDPOINT_SHA256,
    LITERAL_BUILDING_ELIMINATION_ENDPOINT_VERSION,
} from "./literalBuildingEliminationEndpoint.js";
import {
    FINISH_ADVANTAGE_OPEN_CAUSAL_SCREEN_AMENDMENT_2_SHA256,
    FINISH_ADVANTAGE_OPEN_CAUSAL_SCREEN_AMENDMENT_3_SHA256,
    FINISH_ADVANTAGE_OPEN_CAUSAL_SCREEN_AMENDMENT_4_SHA256,
    FINISH_ADVANTAGE_OPEN_CAUSAL_SCREEN_AMENDMENT_5_SHA256,
    FINISH_ADVANTAGE_OPEN_CAUSAL_SCREEN_AMENDMENT_SHA256,
    FINISH_ADVANTAGE_OPEN_CAUSAL_SCREEN_COUNTRIES,
    FINISH_ADVANTAGE_OPEN_CAUSAL_SCREEN_MAX_TICKS,
    FINISH_ADVANTAGE_OPEN_CAUSAL_SCREEN_PROTOCOL_SHA256,
    FINISH_ADVANTAGE_OPEN_CAUSAL_SCREEN_SEED_BASE,
    FinishAdvantageOpenArm,
    buildFinishAdvantageOpenArms,
    deriveFinishAdvantageOpenSeed,
} from "./finishAdvantageOpenCausalScreenAnalysis.js";
import { finishAdvantageOpenArmPolicyCommitment } from "./finishAdvantageOpenCausalScreenEpisode.js";
import {
    FINISH_ADVANTAGE_COMPOSITE_COMPATIBILITY_AMENDMENT_4_SHA256,
    FINISH_ADVANTAGE_COMPOSITE_COMPATIBILITY_AMENDMENT_6_SHA256,
    FINISH_ADVANTAGE_COMPOSITE_COMPATIBILITY_MAP_NAME,
    FINISH_ADVANTAGE_COMPOSITE_COMPATIBILITY_MAP_SHA256,
    selectFinishAdvantageTechnicalGatePolicy,
} from "./finishAdvantageCompositeCompatibilityGate.js";
import { FinishAdvantageMargin } from "./finishAdvantageControl.js";
import {
    PROGRESS_CERTIFIED_V5_OPEN_DEVELOPMENT_FAMILIES,
    ProgressCertifiedV5OpenDevelopmentFamily,
} from "./progressCertifiedV5OpenDevelopmentCampaign.js";

export const FINISH_ADVANTAGE_OPEN_CAMPAIGN_SCHEMA_VERSION = 3 as const;
export const FINISH_ADVANTAGE_OPEN_CAMPAIGN_KIND =
    "finish-advantage-complete-open-causal-screen" as const;
export const FINISH_ADVANTAGE_OPEN_BASELINE_COMMIT =
    "165b77a71d0cf5ebd27c65b19d0486bcbae78d0f" as const;
const FINISH_ADVANTAGE_OFFICIAL_GATE_ARTIFACT_SHA256 =
    "b29cc3d0d5501aa303d6e2fe40cd2c1f5aa761b86969100891efc098a18eaa50" as const;
const FINISH_ADVANTAGE_COMPOSITE_GATE_ARTIFACT_SHA256 =
    "c0391854746f7c4b5bc02d1fd9e01826b5708cedc05b54e42a72a8ffc4edbee9" as const;

export type FinishAdvantageOpenCampaignArm = FinishAdvantageOpenArm & {
    policySha256: string;
};

export type FinishAdvantageOpenCampaignShard = {
    taskIndex: number;
    familyOrdinal: number;
    familyId: string;
    mapName: string;
    mapSha256: string;
    countryOrdinal: number;
    country: Countries;
    requestedEngineSeed: number;
    launchedGameCount: number;
};

export type FinishAdvantageOpenCampaign = {
    schemaVersion: typeof FINISH_ADVANTAGE_OPEN_CAMPAIGN_SCHEMA_VERSION;
    kind: typeof FINISH_ADVANTAGE_OPEN_CAMPAIGN_KIND;
    status: "FROZEN_FINISH_ADVANTAGE_COMPLETE_OPEN_CAUSAL_SCREEN_V3";
    generatedAt: string;
    outcomeAccess: "permanently-open-development-only-no-paper-claim";
    sourceGitCommit: string;
    sourceRuntimeSha256: string;
    externalBaselineGitCommit: typeof FINISH_ADVANTAGE_OPEN_BASELINE_COMMIT;
    externalBaselineRuntimeSha256: string;
    gameApiRuntimeSha256: string;
    packageLockSha256: string;
    populationSha256: string;
    endpointVersion: typeof LITERAL_BUILDING_ELIMINATION_ENDPOINT_VERSION;
    endpointSha256: typeof LITERAL_BUILDING_ELIMINATION_ENDPOINT_SHA256;
    protocol: { path: string; sha256: typeof FINISH_ADVANTAGE_OPEN_CAUSAL_SCREEN_PROTOCOL_SHA256 };
    amendment1: { path: string; sha256: typeof FINISH_ADVANTAGE_OPEN_CAUSAL_SCREEN_AMENDMENT_SHA256 };
    amendment2: { path: string; sha256: typeof FINISH_ADVANTAGE_OPEN_CAUSAL_SCREEN_AMENDMENT_2_SHA256 };
    amendment3: { path: string; sha256: typeof FINISH_ADVANTAGE_OPEN_CAUSAL_SCREEN_AMENDMENT_3_SHA256 };
    amendment4: { path: string; sha256: typeof FINISH_ADVANTAGE_OPEN_CAUSAL_SCREEN_AMENDMENT_4_SHA256 };
    amendment5: { path: string; sha256: typeof FINISH_ADVANTAGE_OPEN_CAUSAL_SCREEN_AMENDMENT_5_SHA256 };
    stateAudit: { path: string; sha256: string };
    officialMapGate: { path: string; sha256: string };
    compositeGate: { path: string; sha256: string };
    programs: {
        cellPath: string;
        cellSha256: string;
        finalizerPath: string;
        finalizerSha256: string;
        shardScriptPath: string;
        shardScriptSha256: string;
        controllerScriptPath: string;
        controllerScriptSha256: string;
    };
    familyCount: 10;
    countryCount: 9;
    reciprocalSlotCount: 2;
    armCount: number;
    shardCount: 90;
    launchedGameCount: number;
    maxTicks: typeof FINISH_ADVANTAGE_OPEN_CAUSAL_SCREEN_MAX_TICKS;
    countries: readonly Countries[];
    selectedMargins: number[];
    arms: FinishAdvantageOpenCampaignArm[];
    selectedFamilies: readonly ProgressCertifiedV5OpenDevelopmentFamily[];
    shards: FinishAdvantageOpenCampaignShard[];
};

type RecordValue = Record<string, unknown>;
const SHA256 = /^[0-9a-f]{64}$/;
const GIT_COMMIT = /^[0-9a-f]{40}$/;
const isRecord = (value: unknown): value is RecordValue =>
    !!value && typeof value === "object" && !Array.isArray(value);
export const sha256File = (filePath: string): string => crypto.createHash("sha256")
    .update(fs.readFileSync(filePath)).digest("hex");
const sha256Value = (value: unknown): string => crypto.createHash("sha256")
    .update(JSON.stringify(value)).digest("hex");
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
const runtimeCommitment = (trees: ReturnType<typeof createExperimentManifest>["source"]["runtimeTrees"]): string =>
    sha256Value(trees);

export const buildFinishAdvantageOpenCampaignArms = (
    selectedMargins: readonly number[],
): FinishAdvantageOpenCampaignArm[] => buildFinishAdvantageOpenArms(selectedMargins as FinishAdvantageMargin[])
    .map((arm) => ({
        ...arm,
        policySha256: finishAdvantageOpenArmPolicyCommitment(arm).policySha256,
    }));

export const buildFinishAdvantageOpenCampaignShards = (
    arms: readonly FinishAdvantageOpenCampaignArm[],
): FinishAdvantageOpenCampaignShard[] => PROGRESS_CERTIFIED_V5_OPEN_DEVELOPMENT_FAMILIES.flatMap(
    (family, familyOrdinal) => FINISH_ADVANTAGE_OPEN_CAUSAL_SCREEN_COUNTRIES.map(
        (country, countryOrdinal) => ({
            taskIndex: familyOrdinal * 9 + countryOrdinal,
            familyOrdinal,
            familyId: family.familyId,
            mapName: family.mapName,
            mapSha256: family.mapSha256,
            countryOrdinal,
            country,
            requestedEngineSeed: deriveFinishAdvantageOpenSeed(familyOrdinal, countryOrdinal),
            launchedGameCount: arms.length * 2,
        }),
    ),
);

const exactArms = (campaign: FinishAdvantageOpenCampaign): FinishAdvantageOpenCampaignArm[] =>
    buildFinishAdvantageOpenCampaignArms(campaign.selectedMargins);

export const validateFinishAdvantageOpenCampaign = (value: unknown): FinishAdvantageOpenCampaign => {
    if (
        !isRecord(value) || value.schemaVersion !== FINISH_ADVANTAGE_OPEN_CAMPAIGN_SCHEMA_VERSION ||
        value.kind !== FINISH_ADVANTAGE_OPEN_CAMPAIGN_KIND ||
        value.status !== "FROZEN_FINISH_ADVANTAGE_COMPLETE_OPEN_CAUSAL_SCREEN_V3" ||
        value.outcomeAccess !== "permanently-open-development-only-no-paper-claim" ||
        !GIT_COMMIT.test(String(value.sourceGitCommit)) || !SHA256.test(String(value.sourceRuntimeSha256)) ||
        value.externalBaselineGitCommit !== FINISH_ADVANTAGE_OPEN_BASELINE_COMMIT ||
        !SHA256.test(String(value.externalBaselineRuntimeSha256)) ||
        !SHA256.test(String(value.gameApiRuntimeSha256)) || !SHA256.test(String(value.packageLockSha256)) ||
        !SHA256.test(String(value.populationSha256)) ||
        value.endpointVersion !== LITERAL_BUILDING_ELIMINATION_ENDPOINT_VERSION ||
        value.endpointSha256 !== LITERAL_BUILDING_ELIMINATION_ENDPOINT_SHA256 ||
        value.familyCount !== 10 || value.countryCount !== 9 || value.reciprocalSlotCount !== 2 ||
        !Number.isSafeInteger(value.armCount) || (value.armCount as number) < 4 || (value.armCount as number) > 6 ||
        value.shardCount !== 90 || value.maxTicks !== FINISH_ADVANTAGE_OPEN_CAUSAL_SCREEN_MAX_TICKS ||
        !Array.isArray(value.countries) || !Array.isArray(value.selectedMargins) ||
        !Array.isArray(value.arms) || !Array.isArray(value.selectedFamilies) || !Array.isArray(value.shards) ||
        !isRecord(value.protocol) || !isRecord(value.amendment1) || !isRecord(value.amendment2) ||
        !isRecord(value.amendment3) || !isRecord(value.amendment4) || !isRecord(value.amendment5) ||
        !isRecord(value.stateAudit) || !isRecord(value.officialMapGate) || !isRecord(value.compositeGate) ||
        !isRecord(value.programs)
    ) throw new Error("Finish-advantage open campaign has an invalid frozen schema");
    const campaign = value as unknown as FinishAdvantageOpenCampaign;
    const arms = exactArms(campaign);
    const shards = buildFinishAdvantageOpenCampaignShards(arms);
    const expectedPopulationSha256 = sha256Value(PROGRESS_CERTIFIED_V5_OPEN_DEVELOPMENT_FAMILIES);
    if (
        campaign.protocol.sha256 !== FINISH_ADVANTAGE_OPEN_CAUSAL_SCREEN_PROTOCOL_SHA256 ||
        campaign.amendment1.sha256 !== FINISH_ADVANTAGE_OPEN_CAUSAL_SCREEN_AMENDMENT_SHA256 ||
        campaign.amendment2.sha256 !== FINISH_ADVANTAGE_OPEN_CAUSAL_SCREEN_AMENDMENT_2_SHA256 ||
        campaign.amendment3.sha256 !== FINISH_ADVANTAGE_OPEN_CAUSAL_SCREEN_AMENDMENT_3_SHA256 ||
        campaign.amendment4.sha256 !== FINISH_ADVANTAGE_OPEN_CAUSAL_SCREEN_AMENDMENT_4_SHA256 ||
        campaign.amendment5.sha256 !== FINISH_ADVANTAGE_OPEN_CAUSAL_SCREEN_AMENDMENT_5_SHA256 ||
        campaign.populationSha256 !== expectedPopulationSha256 ||
        JSON.stringify(campaign.countries) !== JSON.stringify(FINISH_ADVANTAGE_OPEN_CAUSAL_SCREEN_COUNTRIES) ||
        JSON.stringify(campaign.selectedFamilies) !==
            JSON.stringify(PROGRESS_CERTIFIED_V5_OPEN_DEVELOPMENT_FAMILIES) ||
        JSON.stringify(campaign.arms) !== JSON.stringify(arms) ||
        JSON.stringify(campaign.shards) !== JSON.stringify(shards) ||
        campaign.armCount !== arms.length || campaign.launchedGameCount !== arms.length * 180
    ) throw new Error("Finish-advantage open campaign commitments drifted");
    for (const evidence of [
        campaign.protocol, campaign.amendment1, campaign.amendment2, campaign.amendment3, campaign.amendment4,
        campaign.amendment5,
        campaign.stateAudit,
        campaign.officialMapGate, campaign.compositeGate,
    ]) if (typeof evidence.path !== "string" || !SHA256.test(evidence.sha256)) {
        throw new Error("Finish-advantage open campaign evidence binding is malformed");
    }
    for (const key of [
        "cellPath", "finalizerPath", "shardScriptPath", "controllerScriptPath",
    ] as const) if (typeof campaign.programs[key] !== "string") {
        throw new Error("Finish-advantage open campaign program path is malformed");
    }
    for (const key of [
        "cellSha256", "finalizerSha256", "shardScriptSha256", "controllerScriptSha256",
    ] as const) if (!SHA256.test(campaign.programs[key])) {
        throw new Error("Finish-advantage open campaign program hash is malformed");
    }
    return campaign;
};

const readJson = (filePath: string): unknown => JSON.parse(fs.readFileSync(filePath, "utf8"));
const verifyEvidence = (filePath: string, expectedSha: string): RecordValue => {
    if (sha256File(filePath) !== expectedSha) throw new Error(`Evidence hash drifted: ${filePath}`);
    const value = readJson(filePath);
    if (!isRecord(value)) throw new Error(`Evidence is not an object: ${filePath}`);
    return value;
};

const main = async (): Promise<void> => {
    const repoRoot = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
    const driverRoot = path.join(repoRoot, "packages", "chronodivide-bot-driver");
    if (path.resolve(process.cwd()) !== driverRoot) throw new Error(`Generator must start in ${driverRoot}`);
    const outFile = requiredPath("OUT_FILE");
    if (fs.existsSync(outFile)) throw new Error(`Refusing to overwrite ${outFile}`);
    if (!process.env.BASELINE_PACKAGE_ROOT || process.env.REQUIRE_EXTERNAL_BASELINE !== "true") {
        throw new Error("Finish-advantage open campaign requires the pinned external baseline");
    }
    const protocolPath = requiredPath("OPEN_SCREEN_PROTOCOL");
    const amendment1Path = requiredPath("OPEN_SCREEN_AMENDMENT_1");
    const amendment2Path = requiredPath("OPEN_SCREEN_AMENDMENT_2");
    const amendment3Path = requiredPath("OPEN_SCREEN_AMENDMENT_3");
    const amendment4Path = requiredPath("OPEN_SCREEN_AMENDMENT_4");
    const amendment5Path = requiredPath("OPEN_SCREEN_AMENDMENT_5");
    const stateAuditPath = requiredPath("STATE_AUDIT_FILE");
    const officialMapGatePath = requiredPath("OFFICIAL_MAP_GATE_FILE");
    const compositeGatePath = requiredPath("COMPOSITE_GATE_FILE");
    const stateAuditSha256 = requiredSha("STATE_AUDIT_SHA256");
    const officialMapGateSha256 = requiredSha("OFFICIAL_MAP_GATE_SHA256");
    const compositeGateSha256 = requiredSha("COMPOSITE_GATE_SHA256");
    const programs = {
        cellPath: requiredPath("OPEN_SCREEN_CELL_PROGRAM"),
        finalizerPath: requiredPath("OPEN_SCREEN_FINALIZER_PROGRAM"),
        shardScriptPath: requiredPath("OPEN_SCREEN_SHARD_SCRIPT"),
        controllerScriptPath: requiredPath("OPEN_SCREEN_CONTROLLER_SCRIPT"),
    };
    if (
        sha256File(protocolPath) !== FINISH_ADVANTAGE_OPEN_CAUSAL_SCREEN_PROTOCOL_SHA256 ||
        sha256File(amendment1Path) !== FINISH_ADVANTAGE_OPEN_CAUSAL_SCREEN_AMENDMENT_SHA256 ||
        sha256File(amendment2Path) !== FINISH_ADVANTAGE_OPEN_CAUSAL_SCREEN_AMENDMENT_2_SHA256 ||
        sha256File(amendment3Path) !== FINISH_ADVANTAGE_OPEN_CAUSAL_SCREEN_AMENDMENT_3_SHA256 ||
        sha256File(amendment4Path) !== FINISH_ADVANTAGE_OPEN_CAUSAL_SCREEN_AMENDMENT_4_SHA256 ||
        sha256File(amendment5Path) !== FINISH_ADVANTAGE_OPEN_CAUSAL_SCREEN_AMENDMENT_5_SHA256
    ) throw new Error("Finish-advantage open protocol commitment drifted");
    const stateAudit = verifyEvidence(stateAuditPath, stateAuditSha256);
    const officialMapGate = verifyEvidence(officialMapGatePath, officialMapGateSha256);
    const compositeGate = verifyEvidence(compositeGatePath, compositeGateSha256);
    const sourceGitCommit = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
    if (
        execFileSync("git", ["branch", "--show-current"], { encoding: "utf8" }).trim() !== "main" ||
        execFileSync("git", ["status", "--short", "--untracked-files=no"], { encoding: "utf8" }).trim() !== "" ||
        execFileSync("git", ["rev-parse", "fork/main"], { encoding: "utf8" }).trim() !== sourceGitCommit
    ) throw new Error("Finish-advantage open generation requires clean pushed main");
    const selection = selectFinishAdvantageTechnicalGatePolicy(stateAudit, stateAuditSha256);
    if (
        officialMapGateSha256 !== FINISH_ADVANTAGE_OFFICIAL_GATE_ARTIFACT_SHA256 ||
        officialMapGate.kind !== "official-map-live-outcome-blind-compatibility-finalizer" ||
        officialMapGate.status !== "COMPLETE_OFFICIAL_MAP_LIVE_COMPATIBILITY_GATE" ||
        officialMapGate.complete !== true || officialMapGate.outcomeFree !== true ||
        officialMapGate.schedulerAccount !== "pi_jss233" || officialMapGate.cellCount !== 738 ||
        officialMapGate.launchedGameCount !== 1_476 ||
        officialMapGate.sourceGitCommit !== "0bfd3ef1b2487b3914936d7b516e4abb1ca99b43" ||
        officialMapGate.aggregatorGitCommit !== "7f4a0eb3e23ba29d64cf63ee6fdeded9a91be4be" ||
        officialMapGate.aggregationRepairSha256 !==
            "d03f6921568f3c7a709c720447431fb148308e22913a5fae35c5a48c4beef88c" ||
        officialMapGate.campaignSha256 !==
            "fb887bbc5ca2f827550e47337a207de862ecd39f95177dbde9f4ac7b0d5b03d4" ||
        officialMapGate.arrayJobId !== "22596084" || officialMapGate.controllerJobId !== "22597427" ||
        compositeGateSha256 !== FINISH_ADVANTAGE_COMPOSITE_GATE_ARTIFACT_SHA256 ||
        compositeGate.kind !== "finish-advantage-outcome-free-composite-compatibility-gate" ||
        compositeGate.schemaVersion !== 2 ||
        compositeGate.status !== "PASS_OUTCOME_FREE_COMPOSITE_COMPATIBILITY" ||
        compositeGate.passed !== true || compositeGate.outcomeFree !== true ||
        !isRecord(compositeGate.scheduler) || compositeGate.scheduler.account !== "pi_jss233" ||
        compositeGate.gameCount !== 72 ||
        compositeGate.sourceGitCommit !== "d98bc78296fc80f57ee7a180a9462c5f2782bec4" ||
        compositeGate.amendment4Sha256 !== FINISH_ADVANTAGE_COMPOSITE_COMPATIBILITY_AMENDMENT_4_SHA256 ||
        compositeGate.amendment6Sha256 !== FINISH_ADVANTAGE_COMPOSITE_COMPATIBILITY_AMENDMENT_6_SHA256 ||
        compositeGate.diagnosticMapName !== FINISH_ADVANTAGE_COMPOSITE_COMPATIBILITY_MAP_NAME ||
        compositeGate.diagnosticMapSha256 !== FINISH_ADVANTAGE_COMPOSITE_COMPATIBILITY_MAP_SHA256 ||
        compositeGate.maxTicks !== 24_000 ||
        compositeGate.terminalBaseRaceMode !== "strict_literal_endpoint_base_race" ||
        compositeGate.stateAuditSha256 !== stateAuditSha256 ||
        JSON.stringify(compositeGate.selectedMargins) !== JSON.stringify(selection.selectedMargins)
    ) throw new Error("Finish-advantage open precondition gate did not pass exactly");
    for (const family of PROGRESS_CERTIFIED_V5_OPEN_DEVELOPMENT_FAMILIES) {
        if (sha256File(path.join(driverRoot, "data", family.mapName)) !== family.mapSha256) {
            throw new Error(`Finish-advantage open family ${family.familyId} map bytes drifted`);
        }
    }
    const arms = buildFinishAdvantageOpenCampaignArms(selection.selectedMargins);
    const baselineFactory = await loadBaselineFactory(path.join(repoRoot, "packages", "chronodivide-bot"));
    const generation = createExperimentManifest({
        runId: "finish-advantage-complete-open-causal-screen-v2",
        mixDir: path.join(driverRoot, "data"),
        maps: PROGRESS_CERTIFIED_V5_OPEN_DEVELOPMENT_FAMILIES.map(({ mapName }) => mapName),
        effectiveConfig: {
            purpose: FINISH_ADVANTAGE_OPEN_CAMPAIGN_KIND,
            outcomeAccess: "permanently-open-development-only-no-paper-claim",
            countries: FINISH_ADVANTAGE_OPEN_CAUSAL_SCREEN_COUNTRIES,
            reciprocalSlots: [0, 1],
            selectedMargins: selection.selectedMargins,
            arms,
            maxTicks: FINISH_ADVANTAGE_OPEN_CAUSAL_SCREEN_MAX_TICKS,
        },
        baseline: baselineFactory.descriptor,
        gameSeedBase: FINISH_ADVANTAGE_OPEN_CAUSAL_SCREEN_SEED_BASE,
    });
    const baseline = generation.software.baseline;
    if (
        generation.source.gitCommit !== sourceGitCommit || generation.source.gitBranch !== "main" ||
        generation.source.trackedDirty !== false || baseline.kind !== "external-package" ||
        baseline.gitCommit !== FINISH_ADVANTAGE_OPEN_BASELINE_COMMIT || baseline.trackedDirty !== false ||
        !baseline.runtimeTree.sha256 || !generation.software.gameApiRuntimeTree.sha256 ||
        !generation.software.packageLockSha256
    ) throw new Error("Finish-advantage open source or software provenance drifted");
    const campaign: FinishAdvantageOpenCampaign = {
        schemaVersion: FINISH_ADVANTAGE_OPEN_CAMPAIGN_SCHEMA_VERSION,
        kind: FINISH_ADVANTAGE_OPEN_CAMPAIGN_KIND,
        status: "FROZEN_FINISH_ADVANTAGE_COMPLETE_OPEN_CAUSAL_SCREEN_V3",
        generatedAt: new Date().toISOString(),
        outcomeAccess: "permanently-open-development-only-no-paper-claim",
        sourceGitCommit,
        sourceRuntimeSha256: runtimeCommitment(generation.source.runtimeTrees),
        externalBaselineGitCommit: FINISH_ADVANTAGE_OPEN_BASELINE_COMMIT,
        externalBaselineRuntimeSha256: baseline.runtimeTree.sha256,
        gameApiRuntimeSha256: generation.software.gameApiRuntimeTree.sha256,
        packageLockSha256: generation.software.packageLockSha256,
        populationSha256: sha256Value(PROGRESS_CERTIFIED_V5_OPEN_DEVELOPMENT_FAMILIES),
        endpointVersion: LITERAL_BUILDING_ELIMINATION_ENDPOINT_VERSION,
        endpointSha256: LITERAL_BUILDING_ELIMINATION_ENDPOINT_SHA256,
        protocol: { path: protocolPath, sha256: FINISH_ADVANTAGE_OPEN_CAUSAL_SCREEN_PROTOCOL_SHA256 },
        amendment1: { path: amendment1Path, sha256: FINISH_ADVANTAGE_OPEN_CAUSAL_SCREEN_AMENDMENT_SHA256 },
        amendment2: { path: amendment2Path, sha256: FINISH_ADVANTAGE_OPEN_CAUSAL_SCREEN_AMENDMENT_2_SHA256 },
        amendment3: { path: amendment3Path, sha256: FINISH_ADVANTAGE_OPEN_CAUSAL_SCREEN_AMENDMENT_3_SHA256 },
        amendment4: { path: amendment4Path, sha256: FINISH_ADVANTAGE_OPEN_CAUSAL_SCREEN_AMENDMENT_4_SHA256 },
        amendment5: { path: amendment5Path, sha256: FINISH_ADVANTAGE_OPEN_CAUSAL_SCREEN_AMENDMENT_5_SHA256 },
        stateAudit: { path: stateAuditPath, sha256: stateAuditSha256 },
        officialMapGate: { path: officialMapGatePath, sha256: officialMapGateSha256 },
        compositeGate: { path: compositeGatePath, sha256: compositeGateSha256 },
        programs: {
            cellPath: programs.cellPath,
            cellSha256: sha256File(programs.cellPath),
            finalizerPath: programs.finalizerPath,
            finalizerSha256: sha256File(programs.finalizerPath),
            shardScriptPath: programs.shardScriptPath,
            shardScriptSha256: sha256File(programs.shardScriptPath),
            controllerScriptPath: programs.controllerScriptPath,
            controllerScriptSha256: sha256File(programs.controllerScriptPath),
        },
        familyCount: 10,
        countryCount: 9,
        reciprocalSlotCount: 2,
        armCount: arms.length,
        shardCount: 90,
        launchedGameCount: arms.length * 180,
        maxTicks: FINISH_ADVANTAGE_OPEN_CAUSAL_SCREEN_MAX_TICKS,
        countries: FINISH_ADVANTAGE_OPEN_CAUSAL_SCREEN_COUNTRIES,
        selectedMargins: selection.selectedMargins,
        arms,
        selectedFamilies: PROGRESS_CERTIFIED_V5_OPEN_DEVELOPMENT_FAMILIES,
        shards: buildFinishAdvantageOpenCampaignShards(arms),
    };
    validateFinishAdvantageOpenCampaign(campaign);
    fs.mkdirSync(path.dirname(outFile), { recursive: true, mode: 0o700 });
    fs.writeFileSync(outFile, JSON.stringify(campaign, null, 2) + "\n", { flag: "wx", mode: 0o600 });
    console.log(JSON.stringify({ outFile, sha256: sha256File(outFile), launchedGameCount: campaign.launchedGameCount }));
};

const invoked = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (import.meta.url === invoked) main().catch((error) => { console.error(error); process.exitCode = 1; });
