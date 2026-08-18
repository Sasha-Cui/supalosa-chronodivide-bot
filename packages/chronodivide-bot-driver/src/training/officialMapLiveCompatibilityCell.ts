import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { Bot, CreateOfflineOpts, GameApi, cdapi } from "@chronodivide/game-api";
import { Countries } from "@supalosa/chronodivide-bot/dist/bot/logic/common/utils.js";
import { InspectableBaselineBot, loadBaselineFactory } from "../benchmark/baselineLoader.js";
import {
    PhaseWarning,
    SerializedError,
    SerializedWarning,
    WarningCategory,
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
import {
    OfficialMapLiveCampaign,
    OfficialMapLiveFamily,
    OFFICIAL_MAP_LIVE_WARNING_RULE,
    validateOfficialMapLiveCampaign,
} from "./officialMapLiveCompatibilityCampaign.js";
import { createProgressCertifiedExperimentCandidate } from "./progressCertifiedEpisode.js";
import { buildProgressCertifiedV5Arms } from "./progressCertifiedV5ExperimentPolicy.js";
import { sha256File } from "./methodV5PlanRunner.js";

type StartLocation = { x: number; y: number };
type NormalizedWarning = Omit<SerializedWarning, "phase">;
type PrivateDiagnostic = {
    phase: string;
    level: string;
    category: string;
    severity: string;
    text: string;
};
type ReplicateRecord = {
    replicate: 0 | 1;
    candidateSlot: 0 | 1;
    requestedEngineSeed: number;
    gameModeSha256: string | null;
    initialTick: number | null;
    finalTick: number | null;
    updateCount: number;
    tickArithmeticConsistent: boolean;
    reachedTargetTick: boolean;
    candidateStart: StartLocation | null;
    baselineStart: StartLocation | null;
    distinctStarts: boolean;
    startsDeclared: boolean;
    warnings: SerializedWarning[];
    warningCaptureTruncated: boolean;
    error: SerializedError | null;
    failureCategories: string[];
    reviewCategories: string[];
    technicalDigestSha256: string;
};

class PassiveInitializationBot extends Bot {
    override onGameInit(_gameApi: GameApi): void {}
}

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
    const raw = process.env.SLURM_ARRAY_TASK_ID;
    const value = raw === undefined ? Number.NaN : Number(raw);
    if (!Number.isSafeInteger(value) || value < 0 || value >= 738) {
        throw new Error("SLURM_ARRAY_TASK_ID must select one of 738 official-map cells");
    }
    return value;
};

const buildSettings = (
    mapName: string,
    candidate: Bot,
    baseline: Bot,
    candidateSlot: 0 | 1,
): { settings: CreateOfflineOpts; gameModeSha256: string } => {
    const gameMode = cdapi.getAvailableGameModes(mapName)[0];
    if (!gameMode) throw new Error(`No game mode is available for committed official map ${mapName}`);
    return {
        gameModeSha256: sha256Text(String(gameMode)),
        settings: {
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
            agents: candidateSlot === 0 ? [candidate, baseline] : [baseline, candidate],
        },
    };
};

const normalizeWarnings = (warnings: readonly SerializedWarning[]): NormalizedWarning[] => warnings
    .map(({ phase: _phase, ...record }) => record)
    .sort((left, right) => canonicalJson(left).localeCompare(canonicalJson(right)));

const classifiedCategories = (
    warnings: readonly SerializedWarning[],
    error: SerializedError | null,
    truncated: boolean,
): { failures: string[]; reviews: string[] } => {
    const categories: string[] = warnings.map(({ category }) => category);
    if (error) categories.push(error.category);
    const failures: string[] = categories.filter((category) =>
        (OFFICIAL_MAP_LIVE_WARNING_RULE.failCategories as readonly string[]).includes(category),
    );
    const reviews: string[] = categories.filter((category) =>
        (OFFICIAL_MAP_LIVE_WARNING_RULE.reviewCategories as readonly string[]).includes(category),
    );
    if (truncated) failures.push("warning_capture_truncated");
    return {
        failures: [...new Set(failures)].sort(),
        reviews: [...new Set(reviews)].sort(),
    };
};

const declaredStart = (family: OfficialMapLiveFamily, point: StartLocation | null): boolean =>
    point !== null && family.declaredStartLocations.some(({ x, y }) => x === point.x && y === point.y);

const privateDiagnostics = (warnings: readonly PhaseWarning[]): PrivateDiagnostic[] => warnings.map((warning) => ({
    phase: warning.phase,
    level: warning.level,
    category: warning.category,
    severity: warning.severity,
    text: sanitizeDiagnosticText(warning.text),
}));

const runReplicate = async (args: {
    campaign: OfficialMapLiveCampaign;
    family: OfficialMapLiveFamily;
    country: Countries;
    candidateSlot: 0 | 1;
    replicate: 0 | 1;
    requestedEngineSeed: number;
    mapAlias: string;
    initializationWarnings: SerializedWarning[];
    baselineFactory: Awaited<ReturnType<typeof loadBaselineFactory>>;
    privateSink: PrivateDiagnostic[];
}): Promise<ReplicateRecord> => {
    const candidateArm = buildProgressCertifiedV5Arms().find(({ armId }) =>
        armId === args.campaign.candidateArmId,
    );
    if (!candidateArm || candidateArm.policyId !== args.campaign.candidatePolicyId) {
        throw new Error("Official-map V5 candidate policy drifted before construction");
    }
    const candidateName = `OfficialCandidate_${args.family.familyOrdinal}_${args.country}_${args.candidateSlot}`;
    const baselineName = `OfficialBaseline_${args.family.familyOrdinal}_${args.country}_${args.candidateSlot}`;
    const candidate = createProgressCertifiedExperimentCandidate(
        args.baselineFactory,
        candidateName,
        args.country,
        candidateArm.policy,
        () => undefined,
    );
    const baseline = args.baselineFactory.create(baselineName, args.country);
    let gameModeSha256: string | null = null;
    let initialTick: number | null = null;
    let finalTick: number | null = null;
    let updateCount = 0;
    let candidateStart: StartLocation | null = null;
    let baselineStart: StartLocation | null = null;
    const phase = `official-live:${args.family.familyId}:${args.country}:slot-${args.candidateSlot}:rep-${args.replicate}`;
    const captured = await captureConsoleWarnings(phase, async () => {
        const prepared = await completeAttestedMapSettingsReadPair(() =>
            buildSettings(args.mapAlias, candidate, baseline, args.candidateSlot),
        );
        gameModeSha256 = prepared.gameModeSha256;
        await withSeededOfflineGame(
            cdapi,
            prepared.settings,
            args.requestedEngineSeed,
            [
                { agent: candidate, identity: "official-live-candidate" },
                { agent: baseline, identity: "official-live-baseline" },
            ],
            async (game) => {
                initialTick = game.getCurrentTick();
                finalTick = initialTick;
                const candidateApi = (candidate as InspectableBaselineBot).lastGameApi;
                const baselineApi = (baseline as InspectableBaselineBot).lastGameApi;
                if (!candidateApi || !baselineApi) throw new Error("Official-map bots lack GameApi after creation");
                const candidateStartRaw = candidateApi.getPlayerData(candidateName).startLocation;
                const baselineStartRaw = baselineApi.getPlayerData(baselineName).startLocation;
                candidateStart = { x: candidateStartRaw.x, y: candidateStartRaw.y };
                baselineStart = { x: baselineStartRaw.x, y: baselineStartRaw.y };
                let stagnantUpdates = 0;
                while ((finalTick as number) < args.campaign.targetTick && updateCount < args.campaign.targetTick + 32) {
                    const before = finalTick as number;
                    await game.update();
                    updateCount += 1;
                    finalTick = game.getCurrentTick();
                    stagnantUpdates = (finalTick as number) > before ? 0 : stagnantUpdates + 1;
                    if (stagnantUpdates >= 8) {
                        throw new Error("Official-map engine tick failed to advance for eight updates");
                    }
                }
                if ((finalTick as number) < args.campaign.targetTick) {
                    throw new Error("Official-map engine did not reach the fixed technical horizon");
                }
            },
        );
    });
    args.privateSink.push(...privateDiagnostics(captured.warnings));
    const warnings = captured.warnings.map(serializeCapturedWarning);
    const error = captured.error === null ? null : serializeCapturedError(captured.error);
    const classification = classifiedCategories(warnings, error, captured.truncated);
    const observedCandidateStart = candidateStart as StartLocation | null;
    const observedBaselineStart = baselineStart as StartLocation | null;
    const distinctStarts = observedCandidateStart !== null && observedBaselineStart !== null &&
        (observedCandidateStart.x !== observedBaselineStart.x ||
            observedCandidateStart.y !== observedBaselineStart.y);
    const startsDeclared = declaredStart(args.family, observedCandidateStart) &&
        declaredStart(args.family, observedBaselineStart);
    const tickArithmeticConsistent = initialTick !== null && finalTick !== null &&
        finalTick - initialTick === updateCount;
    const reachedTargetTick = finalTick !== null && finalTick >= args.campaign.targetTick;
    const technicalDigestSha256 = canonicalSha256({
        mapAlias: args.mapAlias,
        mapSha256: args.family.mapSha256,
        theater: args.family.theater,
        mapBounds: args.family.mapBounds,
        localBounds: args.family.localBounds,
        declaredStartCount: args.family.declaredStartCount,
        declaredStartLocations: args.family.declaredStartLocations,
        country: args.country,
        candidateSlot: args.candidateSlot,
        requestedEngineSeed: args.requestedEngineSeed,
        gameModeSha256,
        initialTick,
        finalTick,
        updateCount,
        tickArithmeticConsistent,
        reachedTargetTick,
        candidateStart: observedCandidateStart,
        baselineStart: observedBaselineStart,
        distinctStarts,
        startsDeclared,
        initializationWarnings: normalizeWarnings(args.initializationWarnings),
        warnings: normalizeWarnings(warnings),
        warningCaptureTruncated: captured.truncated,
        error,
        candidatePolicyId: args.campaign.candidatePolicyId,
        sourceGitCommit: args.campaign.sourceGitCommit,
        externalBaselineGitCommit: args.campaign.externalBaselineGitCommit,
    });
    return {
        replicate: args.replicate,
        candidateSlot: args.candidateSlot,
        requestedEngineSeed: args.requestedEngineSeed,
        gameModeSha256,
        initialTick,
        finalTick,
        updateCount,
        tickArithmeticConsistent,
        reachedTargetTick,
        candidateStart: observedCandidateStart,
        baselineStart: observedBaselineStart,
        distinctStarts,
        startsDeclared,
        warnings,
        warningCaptureTruncated: captured.truncated,
        error,
        failureCategories: classification.failures,
        reviewCategories: classification.reviews,
        technicalDigestSha256,
    };
};

const main = async (): Promise<void> => {
    const taskIndex = requiredTaskIndex();
    const campaignPath = requiredPath("CAMPAIGN_PATH");
    const outFile = requiredPath("OUT_FILE");
    const privateDiagnosticsFile = requiredPath("PRIVATE_DIAGNOSTICS_FILE");
    const aliasSandbox = requiredPath("ALIAS_SANDBOX");
    if (fs.existsSync(outFile) || fs.existsSync(privateDiagnosticsFile) || fs.existsSync(aliasSandbox)) {
        throw new Error("Official-map cell refuses to reuse an output or alias path");
    }
    if (!process.env.BASELINE_PACKAGE_ROOT || process.env.REQUIRE_EXTERNAL_BASELINE !== "true") {
        throw new Error("Official-map cell requires the pinned external baseline");
    }
    const campaign = validateOfficialMapLiveCampaign(JSON.parse(fs.readFileSync(campaignPath, "utf8")));
    const familyOrdinal = Math.floor(taskIndex / 18);
    const withinFamilyOrdinal = taskIndex % 18;
    const countryOrdinal = Math.floor(withinFamilyOrdinal / 2);
    const candidateSlot = (withinFamilyOrdinal % 2) as 0 | 1;
    const family = campaign.selectedFamilies[familyOrdinal];
    const country = campaign.countries[countryOrdinal];
    const requestedEngineSeed = campaign.engineSeedBase + familyOrdinal * 9 + countryOrdinal;
    const repoRoot = path.resolve(process.cwd(), "..", "..");
    const driverRoot = process.cwd();
    const baselineFactory = await loadBaselineFactory(path.join(repoRoot, "packages", "chronodivide-bot"));
    const manifest = createExperimentManifest({
        runId: `official-map-live-${process.env.SLURM_ARRAY_JOB_ID ?? "local"}-${taskIndex}`,
        mixDir: path.join(driverRoot, "data"),
        maps: [],
        effectiveConfig: {
            purpose: "official-map-live-outcome-blind-all-country-compatibility-cell",
            taskIndex,
            familyOrdinal,
            familyId: family.familyId,
            countryOrdinal,
            country,
            candidateSlot,
            replicates: [0, 1],
            requestedEngineSeed,
            targetTick: campaign.targetTick,
            launchedGameCount: 2,
            populationSha256: campaign.populationSha256,
            protocolSha256: campaign.protocolSha256,
            repairAmendmentSha256: campaign.repairAmendmentSha256,
            outcomeInspection: false,
        },
        baseline: baselineFactory.descriptor,
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
    ) throw new Error("Official-map cell provenance contract failed");

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
                        `official-live:${family.familyId}:${country}:initialization`,
                        async () => {
                            await cdapi.init(path.join(driverRoot, "data"));
                            const alpha = new PassiveInitializationBot("OfficialInitAlpha", country);
                            const beta = new PassiveInitializationBot("OfficialInitBeta", country);
                            buildSettings(materialized.alias, alpha, beta, 0);
                            return true;
                        },
                    );
                    diagnostics.push(...privateDiagnostics(captured.warnings));
                    if (captured.error instanceof MapLoadAttestationError) throw captured.error;
                    return {
                        succeeded: captured.error === null,
                        warnings: captured.warnings.map(serializeCapturedWarning),
                        warningCaptureTruncated: captured.truncated,
                        error: captured.error === null ? null : serializeCapturedError(captured.error),
                    };
                });
                const replicates = [] as ReplicateRecord[];
                for (const replicate of [0, 1] as const) {
                    const phase = replicate === 0 ? "forward_create" : "reverse_create";
                    const record = await session.runPhase(phase, async () => runReplicate({
                        campaign,
                        family,
                        country,
                        candidateSlot,
                        replicate,
                        requestedEngineSeed,
                        mapAlias: materialized.alias,
                        initializationWarnings: initialization.warnings,
                        baselineFactory,
                        privateSink: diagnostics,
                    }));
                    replicates.push(record);
                }
                return { initialization, replicates };
            },
        });
        const initializationClassification = classifiedCategories(
            attested.value.initialization.warnings,
            attested.value.initialization.error,
            attested.value.initialization.warningCaptureTruncated,
        );
        const replicates = attested.value.replicates;
        const deterministic = replicates.length === 2 &&
            replicates[0].technicalDigestSha256 === replicates[1].technicalDigestSha256;
        const validationErrors: string[] = [];
        if (!attested.value.initialization.succeeded) validationErrors.push("initialization_failed");
        validationErrors.push(...initializationClassification.failures.map((item) => `initialization_${item}`));
        for (const replicate of replicates) {
            if (replicate.candidateSlot !== candidateSlot) validationErrors.push("candidate_slot_drift");
            if (replicate.error) validationErrors.push(`replicate_${replicate.replicate}_error_${replicate.error.category}`);
            if (!replicate.tickArithmeticConsistent || !replicate.reachedTargetTick) {
                validationErrors.push(`replicate_${replicate.replicate}_tick_failure`);
            }
            if (!replicate.distinctStarts || !replicate.startsDeclared) {
                validationErrors.push(`replicate_${replicate.replicate}_start_failure`);
            }
            validationErrors.push(...replicate.failureCategories.map((item) =>
                `replicate_${replicate.replicate}_${item}`,
            ));
        }
        if (!deterministic) validationErrors.push("replicate_digest_mismatch");
        fs.mkdirSync(path.dirname(outFile), { recursive: true, mode: 0o700 });
        fs.writeFileSync(privateDiagnosticsFile, JSON.stringify({
            schemaVersion: 1,
            outcomeFree: true,
            taskIndex,
            diagnostics,
        }, null, 2) + "\n", { flag: "wx", mode: 0o600 });
        const output = {
            schemaVersion: 1,
            kind: "official-map-live-outcome-blind-compatibility-cell",
            status: validationErrors.length === 0
                ? "PASS_OFFICIAL_MAP_LIVE_COMPATIBILITY_CELL"
                : "FAIL_OFFICIAL_MAP_LIVE_COMPATIBILITY_CELL",
            passed: validationErrors.length === 0,
            outcomeFree: true,
            forbiddenFieldsEmitted: [],
            taskIndex,
            familyOrdinal,
            familyId: family.familyId,
            mapName: family.mapName,
            mapSha256: family.mapSha256,
            mapBytes: family.mapBytes,
            theater: family.theater,
            mapBounds: family.mapBounds,
            localBounds: family.localBounds,
            declaredStartCount: family.declaredStartCount,
            declaredStartLocations: family.declaredStartLocations,
            staticComplexity: family.staticComplexity,
            countryOrdinal,
            country,
            candidateSlot,
            requestedEngineSeed,
            targetTick: campaign.targetTick,
            launchedGameCount: 2,
            sourceGitCommit: campaign.sourceGitCommit,
            sourceRuntimeSha256: campaign.sourceRuntimeSha256,
            externalBaselineGitCommit: campaign.externalBaselineGitCommit,
            externalBaselineRuntimeSha256: campaign.externalBaselineRuntimeSha256,
            gameApiRuntimeSha256: campaign.gameApiRuntimeSha256,
            packageLockSha256: campaign.packageLockSha256,
            candidatePolicyId: campaign.candidatePolicyId,
            populationSha256: campaign.populationSha256,
            protocolSha256: campaign.protocolSha256,
            repairAmendmentSha256: campaign.repairAmendmentSha256,
            scheduler: manifest.scheduler,
            mapLoadAttestation: {
                protocol: MAP_LOAD_ATTESTATION_PROTOCOL,
                alias: attested.evidence.alias,
                expectedBytes: attested.evidence.expectedBytes,
                expectedSha256: attested.evidence.expectedSha256,
                phases: attested.evidence.phases,
                readsSha256: canonicalSha256(attested.evidence.reads),
                complete: attested.evidence.complete,
            },
            initialization: attested.value.initialization,
            initializationFailureCategories: initializationClassification.failures,
            initializationReviewCategories: initializationClassification.reviews,
            replicates,
            deterministic,
            validationErrors: [...new Set(validationErrors)].sort(),
            privateDiagnostics: {
                path: privateDiagnosticsFile,
                sha256: sha256File(privateDiagnosticsFile),
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
