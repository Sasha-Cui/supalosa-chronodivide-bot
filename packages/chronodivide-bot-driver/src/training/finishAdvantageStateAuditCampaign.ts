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
import { sha256File } from "./methodV5PlanRunner.js";

export const FINISH_ADVANTAGE_STATE_AUDIT_ENGINE_SEED_BASE = 4_225_000_000 as const;
export const FINISH_ADVANTAGE_STATE_AUDIT_MAX_TICKS = 24_000 as const;
export const FINISH_ADVANTAGE_STATE_AUDIT_BASELINE_COMMIT =
    "165b77a71d0cf5ebd27c65b19d0486bcbae78d0f" as const;
export const FINISH_ADVANTAGE_STATE_AUDIT_OPEN_CAMPAIGN_SHA256 =
    "b9aa0aa9eb9a622062705f52fed5018ff22d066a283092e554eee90d96214423" as const;
export const FINISH_ADVANTAGE_STATE_AUDIT_PROTOCOL_SHA256 =
    "2f496b69aca964d52a043b446578cb301130ec35f47d4cfe1ffd723007c8f053" as const;
export const FINISH_ADVANTAGE_STATE_AUDIT_AMENDMENT_SHA256S = [
    "f7d7fe8c33fb11d0855646a9720e8dbf999aac5ce38cb5b5d3ddf0d93a563335",
    "3d9931d52ce81ca01e19d56d72ea95e6e976a83b38263b20b29cf9dc59f264a6",
] as const;

export const FINISH_ADVANTAGE_STATE_AUDIT_COUNTRIES = [
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

export type FinishAdvantageStateAuditFamily = {
    familyId: string;
    mapName: string;
    mapSha256: string;
};

export type FinishAdvantageStateAuditCampaign = {
    schemaVersion: 1;
    kind: "finish-advantage-outcome-blind-state-audit";
    status: "FROZEN_FINISH_ADVANTAGE_OUTCOME_BLIND_STATE_AUDIT_V1";
    generatedAt: string;
    sourceGitCommit: string;
    sourceRuntimeSha256: string;
    externalBaselineGitCommit: typeof FINISH_ADVANTAGE_STATE_AUDIT_BASELINE_COMMIT;
    externalBaselineRuntimeSha256: string;
    gameApiRuntimeSha256: string;
    packageLockSha256: string;
    populationSha256: string;
    sourceOpenCampaignPath: string;
    sourceOpenCampaignSha256: typeof FINISH_ADVANTAGE_STATE_AUDIT_OPEN_CAMPAIGN_SHA256;
    generationManifestPath: string;
    generationManifestSha256: string;
    protocolPath: string;
    protocolSha256: typeof FINISH_ADVANTAGE_STATE_AUDIT_PROTOCOL_SHA256;
    amendmentPaths: [string, string];
    amendmentSha256s: [string, string];
    endpointVersion: typeof LITERAL_BUILDING_ELIMINATION_ENDPOINT_VERSION;
    endpointSha256: typeof LITERAL_BUILDING_ELIMINATION_ENDPOINT_SHA256;
    outcomeAccess: "outcome-free-state-exposure-only";
    familyCount: 10;
    countryCount: 9;
    reciprocalSlotCount: 2;
    observerConditionCount: 2;
    cellCount: 90;
    launchedGameCount: 360;
    engineSeedBase: typeof FINISH_ADVANTAGE_STATE_AUDIT_ENGINE_SEED_BASE;
    maxTicks: typeof FINISH_ADVANTAGE_STATE_AUDIT_MAX_TICKS;
    countries: readonly Countries[];
    selectedFamilies: FinishAdvantageStateAuditFamily[];
};

type RecordValue = Record<string, unknown>;
const isRecord = (value: unknown): value is RecordValue =>
    !!value && typeof value === "object" && !Array.isArray(value);
const requiredPath = (name: string): string => {
    const value = process.env[name];
    if (!value) throw new Error(`${name} is required`);
    return path.resolve(value);
};
const sha256Text = (value: string): string => crypto.createHash("sha256").update(value).digest("hex");
const runtimeCommitment = (value: unknown): string => sha256Text(JSON.stringify(value));

export const loadFinishAdvantageStateAuditFamilies = (
    sourceCampaignPath: string,
): FinishAdvantageStateAuditFamily[] => {
    if (sha256File(sourceCampaignPath) !== FINISH_ADVANTAGE_STATE_AUDIT_OPEN_CAMPAIGN_SHA256) {
        throw new Error("Committed open V5 campaign bytes drifted");
    }
    const value = JSON.parse(fs.readFileSync(sourceCampaignPath, "utf8")) as unknown;
    if (
        !isRecord(value) || value.schemaVersion !== 1 ||
        value.kind !== "progress-certified-v5-open-development-literal-endpoint" ||
        value.status !== "FROZEN_PROGRESS_CERTIFIED_V5_OPEN_DEVELOPMENT_V1_ENDPOINT_V5" ||
        value.outcomeAccess !== "permanently-open-development-only-no-paper-claim" ||
        value.familyCount !== 10 || value.countryCount !== 9 || value.reciprocalSlotCount !== 2 ||
        !Array.isArray(value.selectedFamilies) || value.selectedFamilies.length !== 10
    ) throw new Error("Committed open V5 campaign has an invalid frozen schema");
    const families = value.selectedFamilies.map((raw, index): FinishAdvantageStateAuditFamily => {
        if (
            !isRecord(raw) || typeof raw.familyId !== "string" || raw.familyId.length === 0 ||
            typeof raw.mapName !== "string" || raw.mapName.length === 0 ||
            typeof raw.mapSha256 !== "string" || !/^[0-9a-f]{64}$/.test(raw.mapSha256)
        ) throw new Error(`Open V5 family ${index} is malformed`);
        return { familyId: raw.familyId, mapName: raw.mapName, mapSha256: raw.mapSha256 };
    });
    if (
        new Set(families.map(({ familyId }) => familyId)).size !== 10 ||
        new Set(families.map(({ mapName }) => mapName)).size !== 10 ||
        new Set(families.map(({ mapSha256 }) => mapSha256)).size !== 10
    ) throw new Error("State-audit families must have unique IDs, names, and map identities");
    return families;
};

const main = async (): Promise<void> => {
    const repoRoot = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
    const driverRoot = path.join(repoRoot, "packages", "chronodivide-bot-driver");
    if (path.resolve(process.cwd()) !== driverRoot) {
        throw new Error(`State-audit generator must start in ${driverRoot}`);
    }
    if (!process.env.BASELINE_PACKAGE_ROOT || process.env.REQUIRE_EXTERNAL_BASELINE !== "true") {
        throw new Error("State-audit generation requires the pinned external baseline");
    }
    const sourceOpenCampaignPath = requiredPath("SOURCE_OPEN_CAMPAIGN");
    const protocolPath = requiredPath("STATE_AUDIT_PROTOCOL");
    const amendmentPaths = [
        requiredPath("STATE_AUDIT_AMENDMENT_1"),
        requiredPath("STATE_AUDIT_AMENDMENT_2"),
    ] as [string, string];
    const outRoot = requiredPath("OUT_ROOT");
    if (fs.existsSync(outRoot)) throw new Error(`Refusing to reuse state-audit root ${outRoot}`);
    if (
        sha256File(protocolPath) !== FINISH_ADVANTAGE_STATE_AUDIT_PROTOCOL_SHA256 ||
        amendmentPaths.some((item, index) =>
            sha256File(item) !== FINISH_ADVANTAGE_STATE_AUDIT_AMENDMENT_SHA256S[index]
        )
    ) throw new Error("State-audit protocol commitments drifted");

    const families = loadFinishAdvantageStateAuditFamilies(sourceOpenCampaignPath);
    for (const family of families) {
        const mapPath = path.join(driverRoot, "data", family.mapName);
        if (!fs.existsSync(mapPath) || sha256File(mapPath) !== family.mapSha256) {
            throw new Error(`State-audit family ${family.familyId} lacks exact map bytes`);
        }
    }
    const baselineFactory = await loadBaselineFactory(path.join(repoRoot, "packages", "chronodivide-bot"));
    const manifest = createExperimentManifest({
        runId: "generate-finish-advantage-outcome-blind-state-audit-v1",
        mixDir: path.join(driverRoot, "data"),
        maps: families.map(({ mapName }) => mapName),
        effectiveConfig: {
            purpose: "outcome-blind-finish-advantage-state-exposure-and-passive-equivalence",
            outcomeAccess: "outcome-free-state-exposure-only",
            countries: FINISH_ADVANTAGE_STATE_AUDIT_COUNTRIES,
            reciprocalSlots: [0, 1],
            observerConditions: ["unobserved", "observed"],
            cellCount: 90,
            launchedGameCount: 360,
            maxTicks: FINISH_ADVANTAGE_STATE_AUDIT_MAX_TICKS,
            protocolSha256: FINISH_ADVANTAGE_STATE_AUDIT_PROTOCOL_SHA256,
            amendmentSha256s: FINISH_ADVANTAGE_STATE_AUDIT_AMENDMENT_SHA256S,
            sourceOpenCampaignSha256: FINISH_ADVANTAGE_STATE_AUDIT_OPEN_CAMPAIGN_SHA256,
        },
        baseline: baselineFactory.descriptor,
        gameSeedBase: FINISH_ADVANTAGE_STATE_AUDIT_ENGINE_SEED_BASE,
    });
    const forkMain = execFileSync("git", ["rev-parse", "fork/main"], { encoding: "utf8" }).trim();
    const baseline = manifest.software.baseline;
    if (
        manifest.source.gitBranch !== "main" || manifest.source.trackedDirty !== false ||
        manifest.source.gitCommit !== forkMain ||
        baseline.kind !== "external-package" || baseline.trackedDirty !== false ||
        baseline.gitCommit !== FINISH_ADVANTAGE_STATE_AUDIT_BASELINE_COMMIT ||
        !baseline.runtimeTree.sha256 || !manifest.software.gameApiRuntimeTree.sha256 ||
        !manifest.software.packageLockSha256 || manifest.inputs.maps.some((map) =>
            !map.exists || map.sha256 !== families.find(({ mapName }) => mapName === map.name)?.mapSha256
        )
    ) throw new Error("State-audit generation provenance failed");

    fs.mkdirSync(path.dirname(outRoot), { recursive: true, mode: 0o700 });
    fs.mkdirSync(outRoot, { recursive: false, mode: 0o700 });
    const generationManifestPath = path.join(outRoot, "generation-manifest.json");
    fs.writeFileSync(generationManifestPath, JSON.stringify(manifest, null, 2) + "\n", {
        flag: "wx",
        mode: 0o600,
    });
    const campaign: FinishAdvantageStateAuditCampaign = {
        schemaVersion: 1,
        kind: "finish-advantage-outcome-blind-state-audit",
        status: "FROZEN_FINISH_ADVANTAGE_OUTCOME_BLIND_STATE_AUDIT_V1",
        generatedAt: new Date().toISOString(),
        sourceGitCommit: manifest.source.gitCommit,
        sourceRuntimeSha256: runtimeCommitment(manifest.source.runtimeTrees),
        externalBaselineGitCommit: FINISH_ADVANTAGE_STATE_AUDIT_BASELINE_COMMIT,
        externalBaselineRuntimeSha256: baseline.runtimeTree.sha256,
        gameApiRuntimeSha256: manifest.software.gameApiRuntimeTree.sha256,
        packageLockSha256: manifest.software.packageLockSha256,
        populationSha256: sha256Text(JSON.stringify(families)),
        sourceOpenCampaignPath,
        sourceOpenCampaignSha256: FINISH_ADVANTAGE_STATE_AUDIT_OPEN_CAMPAIGN_SHA256,
        generationManifestPath,
        generationManifestSha256: sha256File(generationManifestPath),
        protocolPath,
        protocolSha256: FINISH_ADVANTAGE_STATE_AUDIT_PROTOCOL_SHA256,
        amendmentPaths,
        amendmentSha256s: [...FINISH_ADVANTAGE_STATE_AUDIT_AMENDMENT_SHA256S],
        endpointVersion: LITERAL_BUILDING_ELIMINATION_ENDPOINT_VERSION,
        endpointSha256: LITERAL_BUILDING_ELIMINATION_ENDPOINT_SHA256,
        outcomeAccess: "outcome-free-state-exposure-only",
        familyCount: 10,
        countryCount: 9,
        reciprocalSlotCount: 2,
        observerConditionCount: 2,
        cellCount: 90,
        launchedGameCount: 360,
        engineSeedBase: FINISH_ADVANTAGE_STATE_AUDIT_ENGINE_SEED_BASE,
        maxTicks: FINISH_ADVANTAGE_STATE_AUDIT_MAX_TICKS,
        countries: FINISH_ADVANTAGE_STATE_AUDIT_COUNTRIES,
        selectedFamilies: families,
    };
    const campaignPath = path.join(outRoot, "campaign.json");
    fs.writeFileSync(campaignPath, JSON.stringify(campaign, null, 2) + "\n", { flag: "wx", mode: 0o600 });
    console.log(JSON.stringify({
        campaignPath,
        campaignSha256: sha256File(campaignPath),
        sourceGitCommit: campaign.sourceGitCommit,
        populationSha256: campaign.populationSha256,
        cellCount: campaign.cellCount,
        launchedGameCount: campaign.launchedGameCount,
    }));
};

const invoked = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (import.meta.url === invoked) main().catch((error) => { console.error(error); process.exitCode = 1; });
