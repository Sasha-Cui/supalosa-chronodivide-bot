import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { Bot, CreateOfflineOpts, GameApi, ObjectType, cdapi } from "@chronodivide/game-api";
import { Countries } from "@supalosa/chronodivide-bot/dist/bot/logic/common/utils.js";
import { InspectableBaselineBot, loadBaselineFactory } from "../benchmark/baselineLoader.js";
import {
    PhaseWarning,
    SerializedError,
    SerializedWarning,
    captureConsoleWarnings,
    sanitizeDiagnosticText,
    serializeCapturedError,
    serializeCapturedWarning,
} from "../benchmark/mapFidelityProtocol.js";
import {
    MAP_LOAD_ATTESTATION_PROTOCOL,
    MapLoadAttestationError,
    materializeMapAlias,
    removeMaterializedMapAlias,
    withMapLoadAttestation,
} from "../benchmark/mapLoadAttestation.js";
import { createExperimentManifest } from "../benchmark/provenance.js";
import { withSeededOfflineGame } from "../benchmark/seededOfflineGame.js";
import { completeAttestedMapSettingsReadPair } from "../benchmark/mapFidelityProbe.js";
import { sha256File } from "./methodV5PlanRunner.js";

const BASELINE_COMMIT = "165b77a71d0cf5ebd27c65b19d0486bcbae78d0f" as const;
const ENGINE_SEED_BASE = 4_231_000_000 as const;
const TARGET_TICK = 600 as const;
const COUNTRIES = [
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
const FAIL_CATEGORIES = new Set([
    "missing_asset", "unsupported_theater", "invalid_terrain", "invalid_object", "invalid_rules",
    "invalid_trigger_event", "invalid_waypoint", "parse_warning", "unknown_reference", "engine_error",
]);

type RecordValue = Record<string, unknown>;
type StartLocation = { x: number; y: number };
type DeclaredStart = StartLocation & { waypoint: number; encoded: number };
type Family = {
    candidateOrdinal: number;
    familyId: string;
    sourceTier: "original" | "reserve";
    sourceOrdinal: number;
    sourceName: string;
    rankSha256: string | null;
    sourceSha1: string | null;
    mapPath: string;
    mapName: string;
    mapBytes: number;
    mapSha256: string;
    theater: "TEMPERATE";
    declaredStartLocations: DeclaredStart[];
};
type Campaign = {
    schemaVersion: 1;
    kind: "progress-certified-v5-outcome-blind-map-deployability-repair";
    status: "FROZEN_BEFORE_ANY_DEPLOYABILITY_ENGINE_EXECUTION";
    outcomeBlind: true;
    notPolicyEvidence: true;
    sourceGitCommit: string;
    baselineGitCommit: typeof BASELINE_COMMIT;
    schedulerAccount: "pi_jss233";
    engineSeedBase: typeof ENGINE_SEED_BASE;
    targetTick: typeof TARGET_TICK;
    countries: readonly Countries[];
    familyCount: 60;
    countryCount: 9;
    ordersPerCell: 2;
    cellTaskCount: 540;
    launchedGameCount: 1080;
    populationSha256: string;
    candidateFamilies: Family[];
};
type PrivateDiagnostic = {
    phase: string;
    level: string;
    category: string;
    severity: string;
    text: string;
};
export type DeployabilityOrderRecord = {
    order: ["alpha", "beta"] | ["beta", "alpha"];
    requestedEngineSeed: number;
    initialTick: number | null;
    finalTick: number | null;
    updateCount: number;
    tickArithmeticConsistent: boolean;
    alphaStart: StartLocation | null;
    betaStart: StartLocation | null;
    distinctStarts: boolean;
    startsDeclared: boolean;
    alphaEstablished: boolean;
    betaEstablished: boolean;
    alphaFirstBuildingTick: number | null;
    betaFirstBuildingTick: number | null;
    warnings: SerializedWarning[];
    warningCaptureTruncated: boolean;
    error: SerializedError | null;
    failureCategories: string[];
    reviewCategories: string[];
};

class PassiveInitializationBot extends Bot {
    override onGameInit(_gameApi: GameApi): void {}
}

const isRecord = (value: unknown): value is RecordValue =>
    !!value && typeof value === "object" && !Array.isArray(value);
const SHA256 = /^[0-9a-f]{64}$/;
const sha256Text = (value: string): string => crypto.createHash("sha256").update(value).digest("hex");
const canonicalJson = (value: unknown): string => JSON.stringify(value, (_key, item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return item;
    return Object.fromEntries(Object.entries(item).sort(([left], [right]) => left.localeCompare(right)));
});
const canonicalSha256 = (value: unknown): string => sha256Text(canonicalJson(value));
const runtimeCommitment = (value: unknown): string => sha256Text(JSON.stringify(value));
const requiredPath = (name: string): string => {
    const value = process.env[name];
    if (!value) throw new Error(`${name} is required`);
    return path.resolve(value);
};
const requiredTaskIndex = (): number => {
    const value = Number(process.env.SLURM_ARRAY_TASK_ID);
    if (!Number.isSafeInteger(value) || value < 0 || value >= 540) {
        throw new Error("SLURM_ARRAY_TASK_ID must select one of 540 deployability cells");
    }
    return value;
};

const validateFamily = (value: unknown, ordinal: number): value is Family => isRecord(value) &&
    value.candidateOrdinal === ordinal && typeof value.familyId === "string" &&
    (value.sourceTier === "original" || value.sourceTier === "reserve") &&
    Number.isSafeInteger(value.sourceOrdinal) && typeof value.sourceName === "string" &&
    (value.rankSha256 === null || SHA256.test(String(value.rankSha256))) &&
    (value.sourceSha1 === null || /^[0-9a-f]{40}$/.test(String(value.sourceSha1))) &&
    typeof value.mapPath === "string" && typeof value.mapName === "string" &&
    Number.isSafeInteger(value.mapBytes) && (value.mapBytes as number) > 0 &&
    SHA256.test(String(value.mapSha256)) && value.theater === "TEMPERATE" &&
    Array.isArray(value.declaredStartLocations) && value.declaredStartLocations.length === 2 &&
    value.declaredStartLocations.every((start, index) => isRecord(start) && start.waypoint === index &&
        Number.isSafeInteger(start.encoded) && Number.isSafeInteger(start.x) && Number.isSafeInteger(start.y));

export const validateDeployabilityCampaign = (value: unknown): Campaign => {
    if (
        !isRecord(value) || value.schemaVersion !== 1 ||
        value.kind !== "progress-certified-v5-outcome-blind-map-deployability-repair" ||
        value.status !== "FROZEN_BEFORE_ANY_DEPLOYABILITY_ENGINE_EXECUTION" ||
        value.outcomeBlind !== true || value.notPolicyEvidence !== true ||
        !/^[0-9a-f]{40}$/.test(String(value.sourceGitCommit)) ||
        value.baselineGitCommit !== BASELINE_COMMIT || value.schedulerAccount !== "pi_jss233" ||
        value.engineSeedBase !== ENGINE_SEED_BASE || value.targetTick !== TARGET_TICK ||
        JSON.stringify(value.countries) !== JSON.stringify(COUNTRIES) ||
        value.familyCount !== 60 || value.countryCount !== 9 || value.ordersPerCell !== 2 ||
        value.cellTaskCount !== 540 || value.launchedGameCount !== 1080 ||
        !SHA256.test(String(value.populationSha256)) ||
        !Array.isArray(value.candidateFamilies) || value.candidateFamilies.length !== 60 ||
        !value.candidateFamilies.every(validateFamily)
    ) throw new Error("Deployability campaign has an invalid frozen schema");
    const campaign = value as unknown as Campaign;
    if (canonicalSha256(campaign.candidateFamilies) !== campaign.populationSha256) {
        throw new Error("Deployability population commitment drifted");
    }
    for (const family of campaign.candidateFamilies) {
        const stat = fs.lstatSync(family.mapPath);
        if (!stat.isFile() || stat.isSymbolicLink() || stat.size !== family.mapBytes ||
            sha256File(family.mapPath) !== family.mapSha256) {
            throw new Error(`Deployability map bytes drifted for ${family.familyId}`);
        }
    }
    return campaign;
};

export const reciprocalStartsPass = (
    forward: DeployabilityOrderRecord,
    reverse: DeployabilityOrderRecord,
): boolean => forward.alphaStart !== null && forward.betaStart !== null &&
    reverse.alphaStart !== null && reverse.betaStart !== null &&
    forward.alphaStart.x === reverse.betaStart.x && forward.alphaStart.y === reverse.betaStart.y &&
    forward.betaStart.x === reverse.alphaStart.x && forward.betaStart.y === reverse.alphaStart.y;

const buildSettings = (mapName: string, agents: Bot[]): CreateOfflineOpts => {
    const gameMode = cdapi.getAvailableGameModes(mapName)[0];
    if (!gameMode) throw new Error(`No game mode is available for committed map ${mapName}`);
    return {
        buildOffAlly: false,
        cratesAppear: false,
        credits: 10_000,
        gameMode,
        gameSpeed: 6,
        mapName,
        mcvRepacks: true,
        shortGame: false,
        superWeapons: false,
        unitCount: 0,
        online: false,
        agents,
    };
};

const point = (bot: InspectableBaselineBot): StartLocation => {
    if (!bot.lastGameApi) throw new Error(`Bot ${bot.name} lacks GameApi after creation`);
    const start = bot.lastGameApi.getPlayerData(bot.name).startLocation;
    return { x: start.x, y: start.y };
};
const hasBuilding = (bot: InspectableBaselineBot): boolean => {
    if (!bot.lastGameApi) throw new Error(`Bot ${bot.name} lacks GameApi after creation`);
    return bot.lastGameApi.getVisibleUnits(
        bot.name,
        "self",
        (rules) => rules.type === ObjectType.Building,
    ).length > 0;
};
const declared = (family: Family, value: StartLocation | null): boolean => value !== null &&
    family.declaredStartLocations.some(({ x, y }) => x === value.x && y === value.y);
const privateDiagnostics = (warnings: readonly PhaseWarning[]): PrivateDiagnostic[] => warnings.map((warning) => ({
    phase: warning.phase,
    level: warning.level,
    category: warning.category,
    severity: warning.severity,
    text: sanitizeDiagnosticText(warning.text),
}));
const classify = (warnings: readonly SerializedWarning[], error: SerializedError | null, truncated: boolean) => {
    const categories = warnings.map(({ category }) => category);
    if (error) categories.push(error.category);
    const failures: string[] = categories.filter((category) => FAIL_CATEGORIES.has(category));
    if (truncated) failures.push("warning_capture_truncated");
    return {
        failures: [...new Set(failures)].sort(),
        reviews: [...new Set(categories.filter((category) => category === "other_warning"))].sort(),
    };
};

const runOrder = async (args: {
    family: Family;
    country: Countries;
    order: ["alpha", "beta"] | ["beta", "alpha"];
    seed: number;
    mapAlias: string;
    factory: Awaited<ReturnType<typeof loadBaselineFactory>>;
    privateSink: PrivateDiagnostic[];
}): Promise<DeployabilityOrderRecord> => {
    const suffix = `${args.family.candidateOrdinal}_${args.country}_${args.order.join("-")}`;
    const alpha = args.factory.create(`DeployAlpha_${suffix}`, args.country);
    const beta = args.factory.create(`DeployBeta_${suffix}`, args.country);
    const agents = args.order.map((identity) => identity === "alpha" ? alpha : beta);
    let initialTick: number | null = null;
    let finalTick: number | null = null;
    let updateCount = 0;
    let alphaStart: StartLocation | null = null;
    let betaStart: StartLocation | null = null;
    let alphaFirstBuildingTick: number | null = null;
    let betaFirstBuildingTick: number | null = null;
    const captured = await captureConsoleWarnings(
        `deploy:${args.family.familyId}:${args.country}:${args.order.join("-")}`,
        async () => {
            const settings = await completeAttestedMapSettingsReadPair(() =>
                buildSettings(args.mapAlias, agents),
            );
            await withSeededOfflineGame(
                cdapi,
                settings,
                args.seed,
                [
                    { agent: alpha, identity: "deployability-alpha" },
                    { agent: beta, identity: "deployability-beta" },
                ],
                async (game) => {
                    initialTick = game.getCurrentTick();
                    finalTick = initialTick;
                    alphaStart = point(alpha);
                    betaStart = point(beta);
                    if (hasBuilding(alpha)) alphaFirstBuildingTick = finalTick;
                    if (hasBuilding(beta)) betaFirstBuildingTick = finalTick;
                    let stagnantUpdates = 0;
                    while (
                        (finalTick as number) < TARGET_TICK &&
                        (alphaFirstBuildingTick === null || betaFirstBuildingTick === null) &&
                        updateCount < TARGET_TICK + 32
                    ) {
                        const before = finalTick as number;
                        await game.update();
                        updateCount += 1;
                        finalTick = game.getCurrentTick();
                        if (alphaFirstBuildingTick === null && hasBuilding(alpha)) {
                            alphaFirstBuildingTick = finalTick;
                        }
                        if (betaFirstBuildingTick === null && hasBuilding(beta)) {
                            betaFirstBuildingTick = finalTick;
                        }
                        stagnantUpdates = (finalTick as number) > before ? 0 : stagnantUpdates + 1;
                        if (stagnantUpdates >= 8) {
                            throw new Error("Engine tick failed to advance for eight updates");
                        }
                    }
                },
            );
        },
    );
    args.privateSink.push(...privateDiagnostics(captured.warnings));
    const warnings = captured.warnings.map(serializeCapturedWarning);
    const error = captured.error === null ? null : serializeCapturedError(captured.error);
    const categories = classify(warnings, error, captured.truncated);
    const observedAlphaStart = alphaStart as StartLocation | null;
    const observedBetaStart = betaStart as StartLocation | null;
    const distinctStarts = observedAlphaStart !== null && observedBetaStart !== null &&
        (observedAlphaStart.x !== observedBetaStart.x || observedAlphaStart.y !== observedBetaStart.y);
    return {
        order: args.order,
        requestedEngineSeed: args.seed,
        initialTick,
        finalTick,
        updateCount,
        tickArithmeticConsistent: initialTick !== null && finalTick !== null &&
            finalTick - initialTick === updateCount,
        alphaStart: observedAlphaStart,
        betaStart: observedBetaStart,
        distinctStarts,
        startsDeclared: declared(args.family, observedAlphaStart) && declared(args.family, observedBetaStart),
        alphaEstablished: alphaFirstBuildingTick !== null,
        betaEstablished: betaFirstBuildingTick !== null,
        alphaFirstBuildingTick,
        betaFirstBuildingTick,
        warnings,
        warningCaptureTruncated: captured.truncated,
        error,
        failureCategories: categories.failures,
        reviewCategories: categories.reviews,
    };
};

const main = async (): Promise<void> => {
    const taskIndex = requiredTaskIndex();
    const campaignPath = requiredPath("CAMPAIGN_PATH");
    const campaignSha256 = process.env.CAMPAIGN_SHA256;
    const outFile = requiredPath("OUT_FILE");
    const privateFile = requiredPath("PRIVATE_DIAGNOSTICS_FILE");
    const aliasSandbox = requiredPath("ALIAS_SANDBOX");
    if (!campaignSha256 || !SHA256.test(campaignSha256) || sha256File(campaignPath) !== campaignSha256) {
        throw new Error("Deployability campaign SHA-256 is absent or drifted");
    }
    if (fs.existsSync(outFile) || fs.existsSync(privateFile) || fs.existsSync(aliasSandbox)) {
        throw new Error("Deployability cell refuses to reuse output or alias paths");
    }
    if (!process.env.BASELINE_PACKAGE_ROOT || process.env.REQUIRE_EXTERNAL_BASELINE !== "true") {
        throw new Error("Deployability cell requires the pinned external Supalosa package");
    }
    const campaign = validateDeployabilityCampaign(JSON.parse(fs.readFileSync(campaignPath, "utf8")));
    const familyOrdinal = Math.floor(taskIndex / 9);
    const countryOrdinal = taskIndex % 9;
    const family = campaign.candidateFamilies[familyOrdinal];
    const country = campaign.countries[countryOrdinal];
    const seed = campaign.engineSeedBase + taskIndex;
    const repoRoot = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
    const driverRoot = path.join(repoRoot, "packages", "chronodivide-bot-driver");
    const factory = await loadBaselineFactory(path.join(repoRoot, "packages", "chronodivide-bot"));
    const manifest = createExperimentManifest({
        runId: `v5-deployability-${process.env.SLURM_ARRAY_JOB_ID ?? "local"}-${taskIndex}`,
        mixDir: path.join(driverRoot, "data"),
        maps: [],
        effectiveConfig: {
            purpose: "outcome-blind-v5-map-deployability-repair",
            taskIndex,
            familyId: family.familyId,
            country,
            reciprocalOrders: [["alpha", "beta"], ["beta", "alpha"]],
            targetTick: campaign.targetTick,
            outcomeInspection: false,
        },
        baseline: factory.descriptor,
        gameSeedBase: campaign.engineSeedBase,
    });
    if (
        manifest.scheduler.account !== "pi_jss233" ||
        manifest.scheduler.arrayTaskId !== String(taskIndex) ||
        manifest.source.gitBranch !== "main" || manifest.source.trackedDirty !== false ||
        manifest.source.gitCommit !== campaign.sourceGitCommit ||
        manifest.software.baseline.kind !== "external-package" ||
        manifest.software.baseline.trackedDirty !== false ||
        manifest.software.baseline.gitCommit !== campaign.baselineGitCommit
    ) throw new Error("Deployability cell provenance contract failed");

    const materialized = materializeMapAlias({
        familyIndex: taskIndex,
        expectedSha256: family.mapSha256,
        expectedBytes: family.mapBytes,
        sourcePath: family.mapPath,
        mixDirectory: path.join(driverRoot, "data"),
        sandboxDirectory: aliasSandbox,
    });
    const diagnostics: PrivateDiagnostic[] = [];
    try {
        const attested = await withMapLoadAttestation({
            materialized,
            operation: async (session) => {
                const initialization = await session.runPhase("initialization", async () => {
                    const captured = await captureConsoleWarnings(
                        `deploy:${family.familyId}:${country}:initialization`,
                        async () => {
                            await cdapi.init(path.join(driverRoot, "data"));
                            buildSettings(materialized.alias, [
                                new PassiveInitializationBot("DeployInitAlpha", country),
                                new PassiveInitializationBot("DeployInitBeta", country),
                            ]);
                        },
                    );
                    diagnostics.push(...privateDiagnostics(captured.warnings));
                    if (captured.error instanceof MapLoadAttestationError) throw captured.error;
                    return {
                        warnings: captured.warnings.map(serializeCapturedWarning),
                        warningCaptureTruncated: captured.truncated,
                        error: captured.error === null ? null : serializeCapturedError(captured.error),
                    };
                });
                const forward = await session.runPhase("forward_create", async () => runOrder({
                    family, country, order: ["alpha", "beta"], seed,
                    mapAlias: materialized.alias, factory, privateSink: diagnostics,
                }));
                const reverse = await session.runPhase("reverse_create", async () => runOrder({
                    family, country, order: ["beta", "alpha"], seed,
                    mapAlias: materialized.alias, factory, privateSink: diagnostics,
                }));
                return { initialization, orders: [forward, reverse] as const };
            },
        });
        const validationErrors: string[] = [];
        const initialization = attested.value.initialization;
        const initializationCategories = classify(
            initialization.warnings,
            initialization.error,
            initialization.warningCaptureTruncated,
        );
        if (initialization.error) validationErrors.push(`initialization_error_${initialization.error.category}`);
        validationErrors.push(...initializationCategories.failures.map((item) => `initialization_${item}`));
        for (const [index, order] of attested.value.orders.entries()) {
            if (order.error) validationErrors.push(`order_${index}_error_${order.error.category}`);
            if (!order.tickArithmeticConsistent) validationErrors.push(`order_${index}_tick_failure`);
            if (!order.distinctStarts || !order.startsDeclared) validationErrors.push(`order_${index}_start_failure`);
            if (!order.alphaEstablished) validationErrors.push(`order_${index}_alpha_not_established`);
            if (!order.betaEstablished) validationErrors.push(`order_${index}_beta_not_established`);
            validationErrors.push(...order.failureCategories.map((item) => `order_${index}_${item}`));
        }
        const reciprocalStartSwap = reciprocalStartsPass(attested.value.orders[0], attested.value.orders[1]);
        if (!reciprocalStartSwap) validationErrors.push("reciprocal_start_swap_failure");
        fs.mkdirSync(path.dirname(outFile), { recursive: true, mode: 0o700 });
        fs.writeFileSync(privateFile, JSON.stringify({
            schemaVersion: 1,
            outcomeBlind: true,
            notPolicyEvidence: true,
            taskIndex,
            diagnostics,
        }, null, 2) + "\n", { flag: "wx", mode: 0o600 });
        const output = {
            schemaVersion: 1,
            kind: "progress-certified-v5-outcome-blind-map-deployability-cell",
            status: validationErrors.length === 0 ? "PASS_DEPLOYABILITY_CELL" : "FAIL_DEPLOYABILITY_CELL",
            passed: validationErrors.length === 0,
            outcomeBlind: true,
            notPolicyEvidence: true,
            forbiddenFieldsEmitted: [],
            taskIndex,
            familyOrdinal,
            familyId: family.familyId,
            mapSha256: family.mapSha256,
            countryOrdinal,
            country,
            requestedEngineSeed: seed,
            targetTick: campaign.targetTick,
            populationSha256: campaign.populationSha256,
            sourceGitCommit: campaign.sourceGitCommit,
            baselineGitCommit: campaign.baselineGitCommit,
            sourceRuntimeSha256: runtimeCommitment(manifest.source.runtimeTrees),
            baselineRuntimeSha256: manifest.software.baseline.runtimeTree.sha256,
            gameApiRuntimeSha256: manifest.software.gameApiRuntimeTree.sha256,
            packageLockSha256: manifest.software.packageLockSha256,
            scheduler: manifest.scheduler,
            mapLoadAttestation: {
                protocol: MAP_LOAD_ATTESTATION_PROTOCOL,
                expectedBytes: attested.evidence.expectedBytes,
                expectedSha256: attested.evidence.expectedSha256,
                phases: attested.evidence.phases,
                readsSha256: canonicalSha256(attested.evidence.reads),
                complete: attested.evidence.complete,
            },
            initialization,
            orders: attested.value.orders,
            reciprocalStartSwap,
            validationErrors: [...new Set(validationErrors)].sort(),
            privateDiagnostics: {
                path: privateFile,
                sha256: sha256File(privateFile),
                recordCount: diagnostics.length,
            },
        };
        fs.writeFileSync(outFile, JSON.stringify(output, null, 2) + "\n", { flag: "wx", mode: 0o600 });
        console.log(JSON.stringify({ outFile, sha256: sha256File(outFile), status: output.status, taskIndex }));
    } finally {
        if (fs.existsSync(materialized.aliasPath)) removeMaterializedMapAlias(materialized);
    }
};

const invoked = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (import.meta.url === invoked) main().catch((error) => { console.error(error); process.exitCode = 1; });
