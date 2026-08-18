import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { Countries } from "@supalosa/chronodivide-bot/dist/bot/logic/common/utils.js";
import { loadBaselineFactory } from "../benchmark/baselineLoader.js";
import { createExperimentManifest } from "../benchmark/provenance.js";
import { buildProgressCertifiedV5Arms } from "./progressCertifiedV5ExperimentPolicy.js";
import { sha256File } from "./methodV5PlanRunner.js";

export const OFFICIAL_MAP_LIVE_ENGINE_SEED_BASE = 4_226_200_000 as const;
export const OFFICIAL_MAP_LIVE_TARGET_TICK = 120 as const;
export const OFFICIAL_MAP_LIVE_BASELINE_COMMIT =
    "165b77a71d0cf5ebd27c65b19d0486bcbae78d0f" as const;
export const OFFICIAL_MAP_IDENTITY_AUDIT_SHA256 =
    "a824d66a1b42f7afa26cfaeb579aa673e43ff29383fdffad9592c42bcc0bd36b" as const;
export const OFFICIAL_MAP_STATIC_SCREEN_SHA256 =
    "cbe286fe9edfd46582e00e072af76a0aa55c751a58562508a529b922f6442fbc" as const;
export const OFFICIAL_MAP_LIVE_PROTOCOL_SHA256 =
    "472eaaada854fdeff04a8bcddfbc93efc1bb1fdb59d8b92f55b5651f07ef9ea0" as const;
export const OFFICIAL_MAP_RUNTIME_REPAIR_SHA256 =
    "78ebc27c203e83fa9281756750562b4f05257ee492b1a6ed0a8558f9b71723de" as const;
export const OFFICIAL_MAP_CACHE_REUSE_SHA256 =
    "7ab0f11fdb9612753853b809370e2d9e74bae668a7ea6de70a0876059a12f3b6" as const;

export const OFFICIAL_MAP_LIVE_COUNTRIES = [
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

export const OFFICIAL_MAP_LIVE_WARNING_RULE = Object.freeze({
    ruleId: "official-map-live-warning-rule-v1" as const,
    failCategories: [
        "missing_asset",
        "unsupported_theater",
        "invalid_terrain",
        "invalid_object",
        "invalid_rules",
        "invalid_trigger_event",
        "invalid_waypoint",
        "parse_warning",
        "unknown_reference",
        "engine_error",
    ] as const,
    reviewCategories: ["other_warning"] as const,
    consoleErrorAlwaysFails: true as const,
    truncatedCaptureFails: true as const,
});

type Bounds = { x: number; y: number; width: number; height: number };
type StartLocation = { waypoint: number; encoded: number; x: number; y: number };
export type OfficialMapLiveFamily = {
    familyOrdinal: number;
    familyId: string;
    mapName: string;
    mapPath: string;
    mapBytes: number;
    mapSha256: string;
    isoMapPack5Sha256: string;
    sourceCatalogFamilyIds: string[];
    theater: "TEMPERATE" | "SNOW" | "URBAN";
    mapBounds: Bounds;
    localBounds: Bounds;
    declaredStartCount: number;
    declaredStartCountSource: "live_indexed_waypoints";
    headerStartingPoints: number | null;
    minPlayers: number | null;
    maxPlayers: number | null;
    declaredStartLocations: StartLocation[];
    staticComplexity: {
        staticCompatibilityPass: false;
        exclusionReasons: string[];
        customSections: string[];
        nonemptyScriptOrAiSections: string[];
        unknownPlacedObjectCount: number;
        nonneutralPlacedObjectCount: number;
    };
};

export type OfficialMapLiveCampaign = {
    schemaVersion: 3;
    kind: "official-map-live-outcome-blind-compatibility";
    status: "FROZEN_OFFICIAL_MAP_LIVE_COMPATIBILITY_V3_AUTHENTICATED_CACHE_REUSE";
    generatedAt: string;
    sourceGitCommit: string;
    sourceRuntimeSha256: string;
    externalBaselineGitCommit: typeof OFFICIAL_MAP_LIVE_BASELINE_COMMIT;
    externalBaselineRuntimeSha256: string;
    gameApiRuntimeSha256: string;
    packageLockSha256: string;
    candidateArmId: "visibility_aware_final_building_v5";
    candidatePolicyId: string;
    identityAuditPath: string;
    identityAuditSha256: typeof OFFICIAL_MAP_IDENTITY_AUDIT_SHA256;
    staticScreenPath: string;
    staticScreenSha256: typeof OFFICIAL_MAP_STATIC_SCREEN_SHA256;
    protocolPath: string;
    protocolSha256: typeof OFFICIAL_MAP_LIVE_PROTOCOL_SHA256;
    repairAmendmentPath: string;
    repairAmendmentSha256: typeof OFFICIAL_MAP_RUNTIME_REPAIR_SHA256;
    cacheReuseAmendmentPath: string;
    cacheReuseAmendmentSha256: typeof OFFICIAL_MAP_CACHE_REUSE_SHA256;
    generationManifestPath: string;
    generationManifestSha256: string;
    populationSha256: string;
    outcomeAccess: "outcome-free-live-compatibility-only";
    familyCount: 41;
    countryCount: 9;
    candidateSlotCount: 2;
    replicateCount: 2;
    cellTaskCount: 738;
    launchedGameCount: 1_476;
    engineSeedBase: typeof OFFICIAL_MAP_LIVE_ENGINE_SEED_BASE;
    targetTick: typeof OFFICIAL_MAP_LIVE_TARGET_TICK;
    countries: readonly Countries[];
    warningRule: typeof OFFICIAL_MAP_LIVE_WARNING_RULE;
    selectedFamilies: OfficialMapLiveFamily[];
};

type RecordValue = Record<string, unknown>;
type Ini = Map<string, Map<string, string>>;
const isRecord = (value: unknown): value is RecordValue =>
    !!value && typeof value === "object" && !Array.isArray(value);
const requiredPath = (name: string): string => {
    const value = process.env[name];
    if (!value) throw new Error(`${name} is required`);
    return path.resolve(value);
};
const sha256Text = (value: string): string => crypto.createHash("sha256").update(value).digest("hex");
const runtimeCommitment = (value: unknown): string => sha256Text(JSON.stringify(value));

export const parseOfficialMapIni = (contents: string): Ini => {
    const sections: Ini = new Map();
    let current: Map<string, string> | null = null;
    for (const rawLine of contents.replace(/^\uFEFF/, "").split(/\r?\n/)) {
        const line = rawLine.trim();
        if (line.length === 0 || line.startsWith(";") || line.startsWith("#")) continue;
        const sectionMatch = /^\[([^\]]+)\]$/.exec(line);
        if (sectionMatch) {
            const name = sectionMatch[1].trim().toLowerCase();
            current = sections.get(name) ?? new Map<string, string>();
            sections.set(name, current);
            continue;
        }
        if (current === null) continue;
        const equals = line.indexOf("=");
        if (equals < 1) continue;
        const key = line.slice(0, equals).trim().toLowerCase();
        if (!current.has(key)) {
            current.set(key, line.slice(equals + 1).split(";", 1)[0].trim());
        }
    }
    return sections;
};

const requiredIni = (ini: Ini, section: string, key: string): string => {
    const value = ini.get(section.toLowerCase())?.get(key.toLowerCase());
    if (value === undefined || value.length === 0) throw new Error(`Map lacks [${section}] ${key}`);
    return value;
};
const parseInteger = (value: string, label: string): number => {
    if (!/^-?\d+$/.test(value)) throw new Error(`${label} is not an integer`);
    const parsed = Number(value);
    if (!Number.isSafeInteger(parsed)) throw new Error(`${label} is outside the safe integer range`);
    return parsed;
};
const parseOptionalInteger = (value: string | undefined, label: string): number | null =>
    value === undefined || value.length === 0 ? null : parseInteger(value, label);
const parseBounds = (value: string, label: string): Bounds => {
    const items = value.split(",").map((item, index) => parseInteger(item.trim(), `${label}[${index}]`));
    if (items.length !== 4 || items[2] <= 0 || items[3] <= 0) throw new Error(`${label} is invalid`);
    return { x: items[0], y: items[1], width: items[2], height: items[3] };
};
const parseStartLocations = (ini: Ini): StartLocation[] => {
    const waypoints = ini.get("waypoints");
    if (!waypoints) throw new Error("Map lacks [Waypoints]");
    return [...waypoints.entries()]
        .filter(([key, value]) => /^\d+$/.test(key) && Number(key) <= 7 && !["", "-1", "0", "0,0"].includes(value))
        .map(([key, value]) => {
            const waypoint = parseInteger(key, `waypoint key ${key}`);
            const encoded = parseInteger(value, `waypoint ${waypoint}`);
            if (encoded <= 0) throw new Error(`waypoint ${waypoint} is disabled or invalid`);
            return { waypoint, encoded, x: encoded % 1000, y: Math.floor(encoded / 1000) };
        })
        .sort((left, right) => left.waypoint - right.waypoint);
};

export const loadOfficialMapLiveFamilies = (
    identityAuditPath: string,
    staticScreenPath: string,
): OfficialMapLiveFamily[] => {
    if (sha256File(identityAuditPath) !== OFFICIAL_MAP_IDENTITY_AUDIT_SHA256) {
        throw new Error("Official-map identity audit bytes drifted");
    }
    if (sha256File(staticScreenPath) !== OFFICIAL_MAP_STATIC_SCREEN_SHA256) {
        throw new Error("Official-map static screen bytes drifted");
    }
    const identity = JSON.parse(fs.readFileSync(identityAuditPath, "utf8")) as unknown;
    const screen = JSON.parse(fs.readFileSync(staticScreenPath, "utf8")) as unknown;
    if (
        !isRecord(identity) || identity.schemaVersion !== 1 || identity.outcomeBlind !== true ||
        identity.notPolicyOutcomeEvidence !== true || identity.identityEligibleIndependentFamilyCount !== 41 ||
        !Array.isArray(identity.representatives) || identity.representatives.length !== 41 ||
        !isRecord(screen) || screen.schemaVersion !== 1 || screen.outcomeBlind !== true ||
        screen.notPolicyOutcomeEvidence !== true || screen.selectedRepresentativeCount !== 41 ||
        screen.passCount !== 0 || screen.excludedCount !== 41 ||
        screen.identityAuditSha256 !== OFFICIAL_MAP_IDENTITY_AUDIT_SHA256 ||
        !Array.isArray(screen.rows) || screen.rows.length !== 41
    ) throw new Error("Official-map source evidence has an invalid frozen schema");
    const screenByFamily = new Map<string, RecordValue>();
    for (const raw of screen.rows) {
        if (!isRecord(raw) || typeof raw.familyId !== "string" || screenByFamily.has(raw.familyId)) {
            throw new Error("Official-map static rows have malformed or duplicate family IDs");
        }
        screenByFamily.set(raw.familyId, raw);
    }
    const families = identity.representatives.map((raw, familyOrdinal): OfficialMapLiveFamily => {
        if (
            !isRecord(raw) || typeof raw.familyId !== "string" || typeof raw.mapName !== "string" ||
            typeof raw.mapPath !== "string" || typeof raw.mapBytes !== "number" ||
            !Number.isSafeInteger(raw.mapBytes) || raw.mapBytes <= 0 ||
            typeof raw.mapSha256 !== "string" || !/^[0-9a-f]{64}$/.test(raw.mapSha256) ||
            typeof raw.isoMapPack5Sha256 !== "string" || !/^[0-9a-f]{64}$/.test(raw.isoMapPack5Sha256) ||
            !Array.isArray(raw.sourceCatalogFamilyIds) ||
            raw.sourceCatalogFamilyIds.some((item) => typeof item !== "string")
        ) throw new Error(`Official-map identity representative ${familyOrdinal} is malformed`);
        const row = screenByFamily.get(raw.familyId);
        if (
            !row || row.mapName !== raw.mapName || row.mapPath !== raw.mapPath ||
            row.mapBytes !== raw.mapBytes || row.mapSha256 !== raw.mapSha256 ||
            row.staticCompatibilityPass !== false || !Array.isArray(row.exclusionReasons) ||
            !Array.isArray(row.customSections) || !Array.isArray(row.nonemptyScriptOrAiSections) ||
            !Number.isSafeInteger(row.unknownPlacedObjectCount) ||
            !Number.isSafeInteger(row.nonneutralPlacedObjectCount) ||
            (row.headerStartingPoints !== null &&
                (!Number.isSafeInteger(row.headerStartingPoints) || (row.headerStartingPoints as number) < 2)) ||
            !Array.isArray(row.liveIndexedStartWaypoints) ||
            (row.theater !== "TEMPERATE" && row.theater !== "SNOW" && row.theater !== "URBAN")
        ) throw new Error(`Official-map static row ${raw.familyId} is malformed or mismatched`);
        const mapPath = path.resolve(raw.mapPath);
        const stat = fs.lstatSync(mapPath);
        if (
            !stat.isFile() || stat.isSymbolicLink() || stat.size !== raw.mapBytes ||
            sha256File(mapPath) !== raw.mapSha256
        ) throw new Error(`Official-map bytes drifted for ${raw.familyId}`);
        const ini = parseOfficialMapIni(fs.readFileSync(mapPath, "latin1"));
        const theater = requiredIni(ini, "Map", "Theater").toUpperCase();
        const minPlayers = parseOptionalInteger(ini.get("basic")?.get("minplayer"), "MinPlayer");
        const maxPlayers = parseOptionalInteger(ini.get("basic")?.get("maxplayer"), "MaxPlayer");
        const rawHeaderStartingPoints = ini.get("header")?.get("numberstartingpoints");
        const headerStartingPoints = parseOptionalInteger(rawHeaderStartingPoints, "NumberStartingPoints");
        const declaredStartLocations = parseStartLocations(ini);
        const declaredStartCount = declaredStartLocations.length;
        if (
            theater !== row.theater || headerStartingPoints !== row.headerStartingPoints ||
            minPlayers !== row.minPlayers || maxPlayers !== row.maxPlayers ||
            (minPlayers !== null && (minPlayers < 1 || minPlayers > 8)) ||
            (maxPlayers !== null && (maxPlayers < 2 || maxPlayers > 8)) ||
            (minPlayers !== null && maxPlayers !== null && minPlayers > maxPlayers) ||
            declaredStartCount < 2 || declaredStartCount > 8 ||
            declaredStartLocations.some(({ waypoint }, index) => waypoint !== index) ||
            JSON.stringify(row.liveIndexedStartWaypoints) !==
                JSON.stringify(declaredStartLocations.map(({ waypoint }) => waypoint)) ||
            new Set(declaredStartLocations.map(({ x, y }) => `${x},${y}`)).size !== declaredStartCount
        ) {
            throw new Error(`Official-map header drifted for ${raw.familyId}`);
        }
        return {
            familyOrdinal,
            familyId: raw.familyId,
            mapName: raw.mapName,
            mapPath,
            mapBytes: raw.mapBytes,
            mapSha256: raw.mapSha256,
            isoMapPack5Sha256: raw.isoMapPack5Sha256,
            sourceCatalogFamilyIds: [...raw.sourceCatalogFamilyIds] as string[],
            theater: theater as OfficialMapLiveFamily["theater"],
            mapBounds: parseBounds(requiredIni(ini, "Map", "Size"), "Map.Size"),
            localBounds: parseBounds(requiredIni(ini, "Map", "LocalSize"), "Map.LocalSize"),
            declaredStartCount,
            declaredStartCountSource: "live_indexed_waypoints",
            headerStartingPoints,
            minPlayers,
            maxPlayers,
            declaredStartLocations,
            staticComplexity: {
                staticCompatibilityPass: false,
                exclusionReasons: [...row.exclusionReasons] as string[],
                customSections: [...row.customSections] as string[],
                nonemptyScriptOrAiSections: [...row.nonemptyScriptOrAiSections] as string[],
                unknownPlacedObjectCount: row.unknownPlacedObjectCount as number,
                nonneutralPlacedObjectCount: row.nonneutralPlacedObjectCount as number,
            },
        };
    });
    if (
        screenByFamily.size !== families.length ||
        new Set(families.map(({ familyId }) => familyId)).size !== 41 ||
        new Set(families.map(({ mapSha256 }) => mapSha256)).size !== 41
    ) throw new Error("Official-map live population is not exactly 41 independent identities");
    return families;
};

export const validateOfficialMapLiveCampaign = (value: unknown): OfficialMapLiveCampaign => {
    if (
        !isRecord(value) || value.schemaVersion !== 3 ||
        value.kind !== "official-map-live-outcome-blind-compatibility" ||
        value.status !== "FROZEN_OFFICIAL_MAP_LIVE_COMPATIBILITY_V3_AUTHENTICATED_CACHE_REUSE" ||
        typeof value.generatedAt !== "string" || Number.isNaN(Date.parse(value.generatedAt)) ||
        typeof value.sourceGitCommit !== "string" || !/^[0-9a-f]{40}$/.test(value.sourceGitCommit) ||
        typeof value.sourceRuntimeSha256 !== "string" || !/^[0-9a-f]{64}$/.test(value.sourceRuntimeSha256) ||
        value.externalBaselineGitCommit !== OFFICIAL_MAP_LIVE_BASELINE_COMMIT ||
        typeof value.externalBaselineRuntimeSha256 !== "string" ||
        !/^[0-9a-f]{64}$/.test(value.externalBaselineRuntimeSha256) ||
        typeof value.gameApiRuntimeSha256 !== "string" || !/^[0-9a-f]{64}$/.test(value.gameApiRuntimeSha256) ||
        typeof value.packageLockSha256 !== "string" || !/^[0-9a-f]{64}$/.test(value.packageLockSha256) ||
        value.candidateArmId !== "visibility_aware_final_building_v5" ||
        typeof value.candidatePolicyId !== "string" || !/^[0-9a-f]{64}$/.test(value.candidatePolicyId) ||
        typeof value.identityAuditPath !== "string" || value.identityAuditSha256 !== OFFICIAL_MAP_IDENTITY_AUDIT_SHA256 ||
        typeof value.staticScreenPath !== "string" || value.staticScreenSha256 !== OFFICIAL_MAP_STATIC_SCREEN_SHA256 ||
        typeof value.protocolPath !== "string" || value.protocolSha256 !== OFFICIAL_MAP_LIVE_PROTOCOL_SHA256 ||
        typeof value.repairAmendmentPath !== "string" ||
        value.repairAmendmentSha256 !== OFFICIAL_MAP_RUNTIME_REPAIR_SHA256 ||
        typeof value.cacheReuseAmendmentPath !== "string" ||
        value.cacheReuseAmendmentSha256 !== OFFICIAL_MAP_CACHE_REUSE_SHA256 ||
        typeof value.generationManifestPath !== "string" ||
        typeof value.generationManifestSha256 !== "string" || !/^[0-9a-f]{64}$/.test(value.generationManifestSha256) ||
        typeof value.populationSha256 !== "string" || !/^[0-9a-f]{64}$/.test(value.populationSha256) ||
        value.outcomeAccess !== "outcome-free-live-compatibility-only" ||
        value.familyCount !== 41 || value.countryCount !== 9 || value.candidateSlotCount !== 2 ||
        value.replicateCount !== 2 || value.cellTaskCount !== 738 || value.launchedGameCount !== 1_476 ||
        value.engineSeedBase !== OFFICIAL_MAP_LIVE_ENGINE_SEED_BASE ||
        value.targetTick !== OFFICIAL_MAP_LIVE_TARGET_TICK ||
        !Array.isArray(value.countries) ||
        JSON.stringify(value.countries) !== JSON.stringify(OFFICIAL_MAP_LIVE_COUNTRIES) ||
        JSON.stringify(value.warningRule) !== JSON.stringify(OFFICIAL_MAP_LIVE_WARNING_RULE) ||
        !Array.isArray(value.selectedFamilies) || value.selectedFamilies.length !== 41
    ) throw new Error("Official-map live campaign has an invalid frozen schema");
    const campaign = value as unknown as OfficialMapLiveCampaign;
    if (
        sha256File(campaign.identityAuditPath) !== campaign.identityAuditSha256 ||
        sha256File(campaign.staticScreenPath) !== campaign.staticScreenSha256 ||
        sha256File(campaign.protocolPath) !== campaign.protocolSha256 ||
        sha256File(campaign.repairAmendmentPath) !== campaign.repairAmendmentSha256 ||
        sha256File(campaign.cacheReuseAmendmentPath) !== campaign.cacheReuseAmendmentSha256 ||
        sha256File(campaign.generationManifestPath) !== campaign.generationManifestSha256 ||
        campaign.populationSha256 !== sha256Text(JSON.stringify(campaign.selectedFamilies)) ||
        JSON.stringify(campaign.selectedFamilies) !== JSON.stringify(loadOfficialMapLiveFamilies(
            campaign.identityAuditPath,
            campaign.staticScreenPath,
        ))
    ) throw new Error("Official-map live campaign evidence commitments drifted");
    const candidateArm = buildProgressCertifiedV5Arms().find(
        ({ armId }) => armId === campaign.candidateArmId,
    );
    if (!candidateArm || candidateArm.policyId !== campaign.candidatePolicyId) {
        throw new Error("Official-map live candidate policy drifted");
    }
    return campaign;
};

const main = async (): Promise<void> => {
    const repoRoot = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
    const driverRoot = path.join(repoRoot, "packages", "chronodivide-bot-driver");
    if (path.resolve(process.cwd()) !== driverRoot) {
        throw new Error(`Official-map campaign generator must start in ${driverRoot}`);
    }
    if (!process.env.BASELINE_PACKAGE_ROOT || process.env.REQUIRE_EXTERNAL_BASELINE !== "true") {
        throw new Error("Official-map generation requires the pinned external baseline");
    }
    const identityAuditPath = requiredPath("OFFICIAL_MAP_IDENTITY_AUDIT");
    const staticScreenPath = requiredPath("OFFICIAL_MAP_STATIC_SCREEN");
    const protocolPath = requiredPath("OFFICIAL_MAP_LIVE_PROTOCOL");
    const repairAmendmentPath = requiredPath("OFFICIAL_MAP_RUNTIME_REPAIR");
    const cacheReuseAmendmentPath = requiredPath("OFFICIAL_MAP_CACHE_REUSE");
    const outRoot = requiredPath("OUT_ROOT");
    if (fs.existsSync(outRoot)) throw new Error(`Refusing to reuse official-map campaign root ${outRoot}`);
    if (
        sha256File(protocolPath) !== OFFICIAL_MAP_LIVE_PROTOCOL_SHA256 ||
        sha256File(repairAmendmentPath) !== OFFICIAL_MAP_RUNTIME_REPAIR_SHA256 ||
        sha256File(cacheReuseAmendmentPath) !== OFFICIAL_MAP_CACHE_REUSE_SHA256
    ) throw new Error("Official-map live protocol bytes drifted");
    const families = loadOfficialMapLiveFamilies(identityAuditPath, staticScreenPath);
    const candidateArm = buildProgressCertifiedV5Arms().find(
        ({ armId }) => armId === "visibility_aware_final_building_v5",
    );
    if (!candidateArm) throw new Error("Frozen V5 candidate arm is unavailable");
    const baselineFactory = await loadBaselineFactory(path.join(repoRoot, "packages", "chronodivide-bot"));
    const manifest = createExperimentManifest({
        runId: "generate-official-map-live-outcome-blind-compatibility-v3-authenticated-cache-reuse",
        mixDir: path.join(driverRoot, "data"),
        maps: [],
        effectiveConfig: {
            purpose: "official-map-live-outcome-blind-all-country-compatibility",
            outcomeAccess: "outcome-free-live-compatibility-only",
            familyCount: 41,
            countries: OFFICIAL_MAP_LIVE_COUNTRIES,
            candidateSlots: [0, 1],
            replicateCount: 2,
            cellTaskCount: 738,
            launchedGameCount: 1_476,
            targetTick: OFFICIAL_MAP_LIVE_TARGET_TICK,
            protocolSha256: OFFICIAL_MAP_LIVE_PROTOCOL_SHA256,
            repairAmendmentSha256: OFFICIAL_MAP_RUNTIME_REPAIR_SHA256,
            cacheReuseAmendmentSha256: OFFICIAL_MAP_CACHE_REUSE_SHA256,
            identityAuditSha256: OFFICIAL_MAP_IDENTITY_AUDIT_SHA256,
            staticScreenSha256: OFFICIAL_MAP_STATIC_SCREEN_SHA256,
            candidatePolicyId: candidateArm.policyId,
            warningRule: OFFICIAL_MAP_LIVE_WARNING_RULE,
        },
        baseline: baselineFactory.descriptor,
        gameSeedBase: OFFICIAL_MAP_LIVE_ENGINE_SEED_BASE,
    });
    const forkMain = execFileSync("git", ["rev-parse", "fork/main"], { encoding: "utf8" }).trim();
    const baseline = manifest.software.baseline;
    if (
        manifest.source.gitBranch !== "main" || manifest.source.trackedDirty !== false ||
        manifest.source.gitCommit !== forkMain || baseline.kind !== "external-package" ||
        baseline.trackedDirty !== false || baseline.gitCommit !== OFFICIAL_MAP_LIVE_BASELINE_COMMIT ||
        !baseline.runtimeTree.sha256 || !manifest.software.gameApiRuntimeTree.sha256 ||
        !manifest.software.packageLockSha256
    ) throw new Error("Official-map campaign provenance failed");

    fs.mkdirSync(path.dirname(outRoot), { recursive: true, mode: 0o700 });
    fs.mkdirSync(outRoot, { recursive: false, mode: 0o700 });
    const generationManifestPath = path.join(outRoot, "generation-manifest.json");
    fs.writeFileSync(generationManifestPath, JSON.stringify(manifest, null, 2) + "\n", {
        flag: "wx",
        mode: 0o600,
    });
    const campaign: OfficialMapLiveCampaign = {
        schemaVersion: 3,
        kind: "official-map-live-outcome-blind-compatibility",
        status: "FROZEN_OFFICIAL_MAP_LIVE_COMPATIBILITY_V3_AUTHENTICATED_CACHE_REUSE",
        generatedAt: new Date().toISOString(),
        sourceGitCommit: manifest.source.gitCommit,
        sourceRuntimeSha256: runtimeCommitment(manifest.source.runtimeTrees),
        externalBaselineGitCommit: OFFICIAL_MAP_LIVE_BASELINE_COMMIT,
        externalBaselineRuntimeSha256: baseline.runtimeTree.sha256,
        gameApiRuntimeSha256: manifest.software.gameApiRuntimeTree.sha256,
        packageLockSha256: manifest.software.packageLockSha256,
        candidateArmId: "visibility_aware_final_building_v5",
        candidatePolicyId: candidateArm.policyId,
        identityAuditPath,
        identityAuditSha256: OFFICIAL_MAP_IDENTITY_AUDIT_SHA256,
        staticScreenPath,
        staticScreenSha256: OFFICIAL_MAP_STATIC_SCREEN_SHA256,
        protocolPath,
        protocolSha256: OFFICIAL_MAP_LIVE_PROTOCOL_SHA256,
        repairAmendmentPath,
        repairAmendmentSha256: OFFICIAL_MAP_RUNTIME_REPAIR_SHA256,
        cacheReuseAmendmentPath,
        cacheReuseAmendmentSha256: OFFICIAL_MAP_CACHE_REUSE_SHA256,
        generationManifestPath,
        generationManifestSha256: sha256File(generationManifestPath),
        populationSha256: sha256Text(JSON.stringify(families)),
        outcomeAccess: "outcome-free-live-compatibility-only",
        familyCount: 41,
        countryCount: 9,
        candidateSlotCount: 2,
        replicateCount: 2,
        cellTaskCount: 738,
        launchedGameCount: 1_476,
        engineSeedBase: OFFICIAL_MAP_LIVE_ENGINE_SEED_BASE,
        targetTick: OFFICIAL_MAP_LIVE_TARGET_TICK,
        countries: OFFICIAL_MAP_LIVE_COUNTRIES,
        warningRule: OFFICIAL_MAP_LIVE_WARNING_RULE,
        selectedFamilies: families,
    };
    const campaignPath = path.join(outRoot, "campaign.json");
    fs.writeFileSync(campaignPath, JSON.stringify(campaign, null, 2) + "\n", { flag: "wx", mode: 0o600 });
    console.log(JSON.stringify({
        campaignPath,
        campaignSha256: sha256File(campaignPath),
        sourceGitCommit: campaign.sourceGitCommit,
        populationSha256: campaign.populationSha256,
        familyCount: campaign.familyCount,
        launchedGameCount: campaign.launchedGameCount,
    }));
};

const invoked = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (import.meta.url === invoked) main().catch((error) => { console.error(error); process.exitCode = 1; });
