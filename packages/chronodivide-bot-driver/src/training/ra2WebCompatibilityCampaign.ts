import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { Countries } from "@supalosa/chronodivide-bot/dist/bot/logic/common/utils.js";
import { loadBaselineFactory } from "../benchmark/baselineLoader.js";
import { createExperimentManifest } from "../benchmark/provenance.js";
import { METHOD_V5_EQUIVALENCE_MAP_SHA256 } from "./methodV5BaselineEquivalence.js";
import { sha256File } from "./methodV5PlanRunner.js";
import {
    RA2WEB_CLIENT_COMMIT,
    RA2WEB_CLIENT_RELEASE_ID,
    RA2WEB_FREEZE_MANIFEST_SHA256,
    RA2WEB_OPPONENT_DESCRIPTORS,
    Ra2WebOpponentId,
    loadRa2WebOpponent,
} from "./ra2WebOpponentBundle.js";

export const RA2WEB_COMPATIBILITY_ENGINE_SEED_BASE = 4_229_000_000 as const;
export const RA2WEB_COMPATIBILITY_MAX_TICKS = 1_200 as const;
export const RA2WEB_COMPATIBILITY_MAP_NAME = "simple-1v1-no-preview.map" as const;
export const RA2WEB_COMPATIBILITY_PROTOCOL_SHA256 =
    "23567e51012a0ae56d587c0787b5efe21272f3d339104cd2bff1fc34a3f2fda3" as const;
export const RA2WEB_COMPATIBILITY_BASELINE_COMMIT =
    "165b77a71d0cf5ebd27c65b19d0486bcbae78d0f" as const;
export const RA2WEB_COMPATIBILITY_COUNTRIES = [
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

export type Ra2WebCompatibilityBundleRow = {
    opponentId: Ra2WebOpponentId;
    clientDifficulty: "Medium" | "MediumSea" | "Advanced";
    bundleFile: string;
    bundleBytes: number;
    bundleSha256: string;
    version: string;
    buildInfo: Record<string, unknown> | null;
    telemetrySchemaVersion: number | null;
};
export type Ra2WebCompatibilityCampaign = {
    schemaVersion: 1;
    kind: "ra2web-outcome-blind-compatibility";
    status: "FROZEN_RA2WEB_OUTCOME_BLIND_COMPATIBILITY_V1";
    generatedAt: string;
    sourceGitCommit: string;
    sourceRuntimeSha256: string;
    externalBaselineGitCommit: typeof RA2WEB_COMPATIBILITY_BASELINE_COMMIT;
    externalBaselineRuntimeSha256: string;
    gameApiRuntimeSha256: string;
    packageLockSha256: string;
    ra2webClientCommit: typeof RA2WEB_CLIENT_COMMIT;
    ra2webClientReleaseId: typeof RA2WEB_CLIENT_RELEASE_ID;
    freezeRoot: string;
    freezeManifestPath: string;
    freezeManifestSha256: typeof RA2WEB_FREEZE_MANIFEST_SHA256;
    opponentSetSha256: string;
    bundles: Ra2WebCompatibilityBundleRow[];
    protocolPath: string;
    protocolSha256: typeof RA2WEB_COMPATIBILITY_PROTOCOL_SHA256;
    generationManifestPath: string;
    generationManifestSha256: string;
    mapName: typeof RA2WEB_COMPATIBILITY_MAP_NAME;
    mapSha256: typeof METHOD_V5_EQUIVALENCE_MAP_SHA256;
    outcomeAccess: "outcome-free-runtime-action-state-compatibility-only";
    countries: readonly Countries[];
    countryCount: 9;
    reciprocalSlotCount: 2;
    runKindsPerCell: 7;
    cellTaskCount: 18;
    launchedGameCount: 126;
    engineSeedBase: typeof RA2WEB_COMPATIBILITY_ENGINE_SEED_BASE;
    maxTicks: typeof RA2WEB_COMPATIBILITY_MAX_TICKS;
};

type RecordValue = Record<string, unknown>;
const SHA256 = /^[0-9a-f]{64}$/;
const GIT_COMMIT = /^[0-9a-f]{40}$/;
const isRecord = (value: unknown): value is RecordValue =>
    !!value && typeof value === "object" && !Array.isArray(value);
const requiredPath = (name: string): string => {
    const value = process.env[name];
    if (!value) throw new Error(`${name} is required`);
    return path.resolve(value);
};
const sha256Text = (value: string): string => crypto.createHash("sha256").update(value).digest("hex");
const runtimeCommitment = (value: unknown): string => sha256Text(JSON.stringify(value));

export const validateRa2WebCompatibilityCampaign = (
    value: unknown,
    verifyFiles = true,
): Ra2WebCompatibilityCampaign => {
    if (
        !isRecord(value) || value.schemaVersion !== 1 ||
        value.kind !== "ra2web-outcome-blind-compatibility" ||
        value.status !== "FROZEN_RA2WEB_OUTCOME_BLIND_COMPATIBILITY_V1" ||
        typeof value.generatedAt !== "string" || Number.isNaN(Date.parse(value.generatedAt)) ||
        typeof value.sourceGitCommit !== "string" || !GIT_COMMIT.test(value.sourceGitCommit) ||
        typeof value.sourceRuntimeSha256 !== "string" || !SHA256.test(value.sourceRuntimeSha256) ||
        value.externalBaselineGitCommit !== RA2WEB_COMPATIBILITY_BASELINE_COMMIT ||
        typeof value.externalBaselineRuntimeSha256 !== "string" ||
        !SHA256.test(value.externalBaselineRuntimeSha256) ||
        typeof value.gameApiRuntimeSha256 !== "string" || !SHA256.test(value.gameApiRuntimeSha256) ||
        typeof value.packageLockSha256 !== "string" || !SHA256.test(value.packageLockSha256) ||
        value.ra2webClientCommit !== RA2WEB_CLIENT_COMMIT ||
        value.ra2webClientReleaseId !== RA2WEB_CLIENT_RELEASE_ID ||
        typeof value.freezeRoot !== "string" || typeof value.freezeManifestPath !== "string" ||
        value.freezeManifestSha256 !== RA2WEB_FREEZE_MANIFEST_SHA256 ||
        typeof value.opponentSetSha256 !== "string" || !SHA256.test(value.opponentSetSha256) ||
        !Array.isArray(value.bundles) || value.bundles.length !== RA2WEB_OPPONENT_DESCRIPTORS.length ||
        typeof value.protocolPath !== "string" || value.protocolSha256 !== RA2WEB_COMPATIBILITY_PROTOCOL_SHA256 ||
        typeof value.generationManifestPath !== "string" ||
        typeof value.generationManifestSha256 !== "string" || !SHA256.test(value.generationManifestSha256) ||
        value.mapName !== RA2WEB_COMPATIBILITY_MAP_NAME || value.mapSha256 !== METHOD_V5_EQUIVALENCE_MAP_SHA256 ||
        value.outcomeAccess !== "outcome-free-runtime-action-state-compatibility-only" ||
        !Array.isArray(value.countries) ||
        JSON.stringify(value.countries) !== JSON.stringify(RA2WEB_COMPATIBILITY_COUNTRIES) ||
        value.countryCount !== 9 || value.reciprocalSlotCount !== 2 || value.runKindsPerCell !== 7 ||
        value.cellTaskCount !== 18 || value.launchedGameCount !== 126 ||
        value.engineSeedBase !== RA2WEB_COMPATIBILITY_ENGINE_SEED_BASE ||
        value.maxTicks !== RA2WEB_COMPATIBILITY_MAX_TICKS
    ) throw new Error("RA2Web compatibility campaign has an invalid frozen schema");
    const campaign = value as unknown as Ra2WebCompatibilityCampaign;
    const expectedRows = RA2WEB_OPPONENT_DESCRIPTORS.map((descriptor) => {
        const row = campaign.bundles.find(({ opponentId }) => opponentId === descriptor.opponentId);
        if (
            !row || row.clientDifficulty !== descriptor.clientDifficulty || row.bundleFile !== descriptor.bundleFile ||
            row.bundleSha256 !== descriptor.bundleSha256 || !Number.isSafeInteger(row.bundleBytes) ||
            row.bundleBytes <= 0 || row.version !== descriptor.expectedVersion ||
            (descriptor.expectedBuildId !== null && row.buildInfo?.buildId !== descriptor.expectedBuildId)
        ) throw new Error(`RA2Web compatibility bundle row drifted for ${descriptor.opponentId}`);
        return row;
    });
    if (
        new Set(expectedRows.map(({ opponentId }) => opponentId)).size !== RA2WEB_OPPONENT_DESCRIPTORS.length ||
        campaign.opponentSetSha256 !== sha256Text(JSON.stringify(expectedRows))
    ) throw new Error("RA2Web compatibility opponent commitment drifted");
    if (verifyFiles && (
        sha256File(campaign.freezeManifestPath) !== campaign.freezeManifestSha256 ||
        sha256File(campaign.protocolPath) !== campaign.protocolSha256 ||
        sha256File(campaign.generationManifestPath) !== campaign.generationManifestSha256 ||
        campaign.bundles.some(({ bundleFile, bundleSha256 }) =>
            sha256File(path.join(campaign.freezeRoot, bundleFile)) !== bundleSha256
        )
    )) throw new Error("RA2Web compatibility evidence bytes drifted");
    return campaign;
};

const main = async (): Promise<void> => {
    const repoRoot = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
    const driverRoot = path.join(repoRoot, "packages", "chronodivide-bot-driver");
    if (path.resolve(process.cwd()) !== driverRoot) {
        throw new Error(`RA2Web compatibility generator must start in ${driverRoot}`);
    }
    if (!process.env.BASELINE_PACKAGE_ROOT || process.env.REQUIRE_EXTERNAL_BASELINE !== "true") {
        throw new Error("RA2Web compatibility generation requires exact external Supalosa");
    }
    const freezeRoot = requiredPath("RA2WEB_FREEZE_ROOT");
    const protocolPath = requiredPath("RA2WEB_PROTOCOL");
    const outRoot = requiredPath("OUT_ROOT");
    if (fs.existsSync(outRoot)) throw new Error(`Refusing to reuse RA2Web campaign root ${outRoot}`);
    if (sha256File(protocolPath) !== RA2WEB_COMPATIBILITY_PROTOCOL_SHA256) {
        throw new Error("RA2Web compatibility protocol bytes drifted");
    }
    const mapPath = path.join(driverRoot, "data", RA2WEB_COMPATIBILITY_MAP_NAME);
    if (sha256File(mapPath) !== METHOD_V5_EQUIVALENCE_MAP_SHA256) {
        throw new Error("RA2Web compatibility map bytes drifted");
    }
    const bundles = RA2WEB_OPPONENT_DESCRIPTORS.map(({ opponentId }): Ra2WebCompatibilityBundleRow => {
        const loaded = loadRa2WebOpponent(freezeRoot, opponentId);
        return {
            opponentId,
            clientDifficulty: loaded.descriptor.clientDifficulty,
            bundleFile: loaded.descriptor.bundleFile,
            bundleBytes: loaded.bundleBytes,
            bundleSha256: loaded.bundleSha256,
            version: loaded.module.version,
            buildInfo: loaded.module.buildInfo,
            telemetrySchemaVersion: loaded.module.telemetrySchemaVersion,
        };
    });
    const baselineFactory = await loadBaselineFactory(path.join(repoRoot, "packages", "chronodivide-bot"));
    const manifest = createExperimentManifest({
        runId: "generate-ra2web-outcome-blind-compatibility-v1",
        mixDir: path.join(driverRoot, "data"),
        maps: [RA2WEB_COMPATIBILITY_MAP_NAME],
        effectiveConfig: {
            purpose: "outcome-blind-ra2web-runtime-action-state-compatibility",
            countries: RA2WEB_COMPATIBILITY_COUNTRIES,
            candidateSlots: [0, 1],
            runKindsPerCell: 7,
            cellTaskCount: 18,
            launchedGameCount: 126,
            maxTicks: RA2WEB_COMPATIBILITY_MAX_TICKS,
            freezeManifestSha256: RA2WEB_FREEZE_MANIFEST_SHA256,
            opponentSetSha256: sha256Text(JSON.stringify(bundles)),
            protocolSha256: RA2WEB_COMPATIBILITY_PROTOCOL_SHA256,
            outcomeInspection: false,
        },
        baseline: baselineFactory.descriptor,
        gameSeedBase: RA2WEB_COMPATIBILITY_ENGINE_SEED_BASE,
    });
    const forkMain = execFileSync("git", ["rev-parse", "fork/main"], { encoding: "utf8" }).trim();
    const baseline = manifest.software.baseline;
    if (
        manifest.source.gitBranch !== "main" || manifest.source.trackedDirty !== false ||
        manifest.source.gitCommit !== forkMain || baseline.kind !== "external-package" ||
        baseline.trackedDirty !== false || baseline.gitCommit !== RA2WEB_COMPATIBILITY_BASELINE_COMMIT ||
        !baseline.runtimeTree.sha256 || !manifest.software.gameApiRuntimeTree.sha256 ||
        !manifest.software.packageLockSha256 || manifest.inputs.maps[0]?.sha256 !== METHOD_V5_EQUIVALENCE_MAP_SHA256
    ) throw new Error("RA2Web compatibility generation provenance failed");

    fs.mkdirSync(path.dirname(outRoot), { recursive: true, mode: 0o700 });
    fs.mkdirSync(outRoot, { recursive: false, mode: 0o700 });
    const generationManifestPath = path.join(outRoot, "generation-manifest.json");
    fs.writeFileSync(generationManifestPath, JSON.stringify(manifest, null, 2) + "\n", { flag: "wx", mode: 0o600 });
    const campaign: Ra2WebCompatibilityCampaign = {
        schemaVersion: 1,
        kind: "ra2web-outcome-blind-compatibility",
        status: "FROZEN_RA2WEB_OUTCOME_BLIND_COMPATIBILITY_V1",
        generatedAt: new Date().toISOString(),
        sourceGitCommit: manifest.source.gitCommit!,
        sourceRuntimeSha256: runtimeCommitment(manifest.source.runtimeTrees),
        externalBaselineGitCommit: RA2WEB_COMPATIBILITY_BASELINE_COMMIT,
        externalBaselineRuntimeSha256: baseline.runtimeTree.sha256,
        gameApiRuntimeSha256: manifest.software.gameApiRuntimeTree.sha256,
        packageLockSha256: manifest.software.packageLockSha256,
        ra2webClientCommit: RA2WEB_CLIENT_COMMIT,
        ra2webClientReleaseId: RA2WEB_CLIENT_RELEASE_ID,
        freezeRoot,
        freezeManifestPath: path.join(freezeRoot, "freeze-manifest-v1.json"),
        freezeManifestSha256: RA2WEB_FREEZE_MANIFEST_SHA256,
        opponentSetSha256: sha256Text(JSON.stringify(bundles)),
        bundles,
        protocolPath,
        protocolSha256: RA2WEB_COMPATIBILITY_PROTOCOL_SHA256,
        generationManifestPath,
        generationManifestSha256: sha256File(generationManifestPath),
        mapName: RA2WEB_COMPATIBILITY_MAP_NAME,
        mapSha256: METHOD_V5_EQUIVALENCE_MAP_SHA256,
        outcomeAccess: "outcome-free-runtime-action-state-compatibility-only",
        countries: RA2WEB_COMPATIBILITY_COUNTRIES,
        countryCount: 9,
        reciprocalSlotCount: 2,
        runKindsPerCell: 7,
        cellTaskCount: 18,
        launchedGameCount: 126,
        engineSeedBase: RA2WEB_COMPATIBILITY_ENGINE_SEED_BASE,
        maxTicks: RA2WEB_COMPATIBILITY_MAX_TICKS,
    };
    validateRa2WebCompatibilityCampaign(campaign);
    const campaignPath = path.join(outRoot, "campaign.json");
    fs.writeFileSync(campaignPath, JSON.stringify(campaign, null, 2) + "\n", { flag: "wx", mode: 0o600 });
    console.log(JSON.stringify({
        campaignPath,
        campaignSha256: sha256File(campaignPath),
        sourceGitCommit: campaign.sourceGitCommit,
        opponentSetSha256: campaign.opponentSetSha256,
        cellTaskCount: campaign.cellTaskCount,
        launchedGameCount: campaign.launchedGameCount,
    }));
};

const invoked = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (import.meta.url === invoked) main().catch((error) => { console.error(error); process.exitCode = 1; });
