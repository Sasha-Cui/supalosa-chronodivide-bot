import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { Bot, CreateOfflineOpts, GameApi, cdapi } from "@chronodivide/game-api";
import {
    BundleDescriptor,
    ExactFileDescriptor,
    LoggingDescriptor,
    MAP_FIDELITY_GATE,
    ManifestSelection,
    ParticipantStarts,
    PhaseWarning,
    SerializedError,
    StartLocation,
    TreeDescriptor,
    assertPinnedLoggingMode,
    assertStrictFidelityProbeResult,
    captureConsoleWarnings,
    deriveProbeCoverage,
    fatalDiagnosticLine,
    serializeCapturedError,
    serializeCapturedWarning,
    sha256File,
    validateReciprocalStarts,
    verifyBundleDescriptor,
    verifyExactFileDescriptor,
    verifyTreeDescriptor,
} from "./mapFidelityProtocol.js";
import { deriveEngineSeed, withSeededOfflineGame } from "./seededOfflineGame.js";

type SchedulerDescriptor = {
    jobId: string;
    account: string;
    partition: string | null;
    qos: string | null;
    source: "scontrol";
};

type ManifestFamily = {
    index: number;
    familyId: string;
    representativeMapPath: string;
    mapName: string;
    bytes: number;
    sha256: string;
    declaredStartLocations: Array<StartLocation & { waypoint: number; encoded: number }>;
    staticChecks: {
        requiredSectionsPresent: boolean;
        requiredKeysPresent: boolean;
        payloadSectionsNonempty: boolean;
        startEnumerationValid: boolean;
        failures: string[];
    };
};

type FidelityManifest = {
    schemaVersion: 1;
    gate: typeof MAP_FIDELITY_GATE;
    outcomeFree: true;
    status: "SLURM_MAP_FIDELITY_FULL_NOT_A_PAPER_RESULT" | "SLURM_MAP_FIDELITY_PREFLIGHT_NOT_CLEARANCE";
    scheduler: SchedulerDescriptor;
    protocol: {
        targetTick: number;
        engineSeedBase: number;
        participantCountry: string;
        requiredSections: string[];
        forbiddenOutcomeKeys: string[];
        logging: LoggingDescriptor;
    };
    inputs: {
        repoRoot: string;
        mixDir: string;
        git: { commit: string | null };
        sourceFiles: ExactFileDescriptor[];
        targetManifest: ExactFileDescriptor;
        catalog: ExactFileDescriptor;
        packageLock: ExactFileDescriptor;
        nodeRuntime: ExactFileDescriptor;
        pythonRuntime: ExactFileDescriptor;
        scontrolRuntime: ExactFileDescriptor;
        gameApiPackage: ExactFileDescriptor;
        gameApiRuntime: ExactFileDescriptor;
        compiledProbe: ExactFileDescriptor;
        compiledRuntime: ExactFileDescriptor[];
        gameApiRuntimeTree: TreeDescriptor;
        runtimeDependencyTree: TreeDescriptor;
        mixTree: TreeDescriptor;
        sourceBundle: BundleDescriptor;
        runtimeBundle: BundleDescriptor;
        logging: LoggingDescriptor;
    };
    selection: ManifestSelection;
    families: ManifestFamily[];
};

type ProbeRun = {
    order: ["alpha", "beta"] | ["beta", "alpha"];
    loaded: boolean;
    initialTick: number | null;
    finalTick: number | null;
    updates: number;
    progressedBeyondTickOne: boolean;
    reachedTargetTick: boolean;
    starts: ParticipantStarts;
    wallTimeMs: number;
    warnings: PhaseWarning[];
    warningCaptureTruncated: boolean;
    error: SerializedError | null;
};

type RuntimeHashes = {
    packageLockSha256: string;
    gameApiPackageSha256: string;
    gameApiRuntimeSha256: string;
    compiledProbeSha256: string;
    gameApiRuntimeTreeSha256: string;
    runtimeDependencyTreeSha256: string;
    mixTreeSha256: string;
    sourceBundleSha256: string;
    runtimeBundleSha256: string;
};

const REQUIRED_SOURCE_PATHS = [
    "packages/chronodivide-bot-driver/src/benchmark/mapFidelityProbe.ts",
    "packages/chronodivide-bot-driver/src/benchmark/mapFidelityProtocol.ts",
    "packages/chronodivide-bot-driver/src/benchmark/seededOfflineGame.ts",
    "research/scripts/map_fidelity_gate.py",
    "research/slurm/map_fidelity_gate_v1.sbatch",
] as const;

class PassiveFidelityProbe extends Bot {
    public startLocation: StartLocation | null = null;

    override onGameInit(gameApi: GameApi): void {
        const start = gameApi.getPlayerData(this.name).startLocation;
        this.startLocation = { x: start.x, y: start.y };
    }
}

const parseScontrolLine = (value: string, jobId: string): SchedulerDescriptor => {
    const field = (name: string): string | null => new RegExp(`(?:^|\\s)${name}=([^\\s]+)`).exec(value)?.[1] ?? null;
    const account = field("Account");
    if (account !== "pi_jss233") {
        throw new Error(`Authoritative Slurm account is ${String(account)}, expected pi_jss233`);
    }
    return {
        jobId,
        account,
        partition: field("Partition"),
        qos: field("QOS"),
        source: "scontrol",
    };
};

const getAuthoritativeScheduler = (): SchedulerDescriptor => {
    const jobId = process.env.SLURM_JOB_ID;
    if (!jobId) {
        throw new Error("Map fidelity engine probe is Slurm-only; SLURM_JOB_ID is absent");
    }
    const scontrol = process.env.SCONTROL || "scontrol";
    const line = execFileSync(scontrol, ["show", "job", "-o", jobId], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
    }).trim();
    return parseScontrolLine(line, jobId);
};

const requireStringArg = (name: string): string => {
    const index = process.argv.indexOf(name);
    if (index < 0 || index + 1 >= process.argv.length || process.argv[index + 1].startsWith("--")) {
        throw new Error(`Missing required argument ${name}`);
    }
    return process.argv[index + 1];
};

const assertDescriptorIncludedInTree = (descriptor: ExactFileDescriptor, tree: TreeDescriptor, label: string): void => {
    const relative = path.relative(tree.root, descriptor.path).split(path.sep).join("/");
    if (relative.startsWith("../") || path.posix.isAbsolute(relative)) {
        throw new Error(`${label} is outside its bound runtime tree`);
    }
    const entry = tree.entries.find((candidate) => candidate.path === relative);
    if (!entry || entry.bytes !== descriptor.bytes || entry.sha256 !== descriptor.sha256) {
        throw new Error(`${label} does not match its entry in the bound runtime tree`);
    }
};

const assertManifestIntegrity = (manifest: FidelityManifest, scheduler: SchedulerDescriptor): RuntimeHashes => {
    if (manifest.schemaVersion !== 1 || manifest.gate !== MAP_FIDELITY_GATE || manifest.outcomeFree !== true) {
        throw new Error("Unsupported or non-outcome-free map fidelity manifest");
    }
    if (
        manifest.scheduler.source !== "scontrol" ||
        manifest.scheduler.account !== "pi_jss233" ||
        manifest.scheduler.jobId !== scheduler.jobId
    ) {
        throw new Error("Manifest scheduler provenance does not match the authoritative running Slurm job");
    }
    if (!Number.isSafeInteger(manifest.protocol.targetTick) || manifest.protocol.targetTick <= 1) {
        throw new Error(`targetTick must be an integer greater than one; got ${manifest.protocol.targetTick}`);
    }
    if (manifest.families.length === 0) throw new Error("Fidelity manifest has no families");
    assertPinnedLoggingMode(manifest.inputs.logging, process.env.DEBUG_LOGGING);
    assertPinnedLoggingMode(manifest.protocol.logging, process.env.DEBUG_LOGGING);
    if (JSON.stringify(manifest.inputs.logging) !== JSON.stringify(manifest.protocol.logging)) {
        throw new Error("Protocol and input logging descriptors disagree");
    }
    const manifestCoverage = deriveProbeCoverage(
        manifest.selection,
        manifest.families.length,
        manifest.families.length,
    );
    const expectedStatus =
        manifestCoverage.scope === "full"
            ? "SLURM_MAP_FIDELITY_FULL_NOT_A_PAPER_RESULT"
            : "SLURM_MAP_FIDELITY_PREFLIGHT_NOT_CLEARANCE";
    if (manifest.status !== expectedStatus) throw new Error("Manifest status does not match its selection scope");

    const sourceRelativePaths = manifest.inputs.sourceFiles.map((record) =>
        path.relative(manifest.inputs.repoRoot, record.path).split(path.sep).join("/"),
    );
    if (JSON.stringify(sourceRelativePaths) !== JSON.stringify(REQUIRED_SOURCE_PATHS)) {
        throw new Error("inputs.sourceFiles do not exactly match the required source bundle order");
    }

    const exactInputs: Array<[string, ExactFileDescriptor]> = [
        ...manifest.inputs.sourceFiles.map(
            (record, index) => [`inputs.sourceFiles[${index}]`, record] as [string, ExactFileDescriptor],
        ),
        ["inputs.targetManifest", manifest.inputs.targetManifest],
        ["inputs.catalog", manifest.inputs.catalog],
        ["inputs.packageLock", manifest.inputs.packageLock],
        ["inputs.nodeRuntime", manifest.inputs.nodeRuntime],
        ["inputs.pythonRuntime", manifest.inputs.pythonRuntime],
        ["inputs.scontrolRuntime", manifest.inputs.scontrolRuntime],
        ["inputs.gameApiPackage", manifest.inputs.gameApiPackage],
        ["inputs.gameApiRuntime", manifest.inputs.gameApiRuntime],
        ["inputs.compiledProbe", manifest.inputs.compiledProbe],
        ...manifest.inputs.compiledRuntime.map(
            (record, index) => [`inputs.compiledRuntime[${index}]`, record] as [string, ExactFileDescriptor],
        ),
    ];
    for (const [label, descriptor] of exactInputs) verifyExactFileDescriptor(descriptor, label);

    const gameApiRuntimeTreeSha256 = verifyTreeDescriptor(
        manifest.inputs.gameApiRuntimeTree,
        "inputs.gameApiRuntimeTree",
    );
    const runtimeDependencyTreeSha256 = verifyTreeDescriptor(
        manifest.inputs.runtimeDependencyTree,
        "inputs.runtimeDependencyTree",
    );
    const mixTreeSha256 = verifyTreeDescriptor(manifest.inputs.mixTree, "inputs.mixTree");
    if (path.resolve(manifest.inputs.mixDir) !== path.resolve(manifest.inputs.mixTree.root)) {
        throw new Error("inputs.mixDir does not match inputs.mixTree.root");
    }
    assertDescriptorIncludedInTree(
        manifest.inputs.gameApiPackage,
        manifest.inputs.gameApiRuntimeTree,
        "gameApiPackage",
    );
    assertDescriptorIncludedInTree(
        manifest.inputs.gameApiRuntime,
        manifest.inputs.gameApiRuntimeTree,
        "gameApiRuntime",
    );
    if (
        !manifest.inputs.compiledRuntime.some(
            (record) =>
                path.resolve(record.path) === path.resolve(manifest.inputs.compiledProbe.path) &&
                record.bytes === manifest.inputs.compiledProbe.bytes &&
                record.sha256 === manifest.inputs.compiledProbe.sha256,
        )
    ) {
        throw new Error("compiledProbe is not exactly represented in compiledRuntime");
    }

    const gitCommit = manifest.inputs.git?.commit;
    if (typeof gitCommit !== "string" || gitCommit.length === 0) throw new Error("Manifest source commit is absent");
    const sourceBundleSha256 = verifyBundleDescriptor(
        manifest.inputs.sourceBundle,
        [
            { label: "gitCommit", value: gitCommit },
            ...manifest.inputs.sourceFiles.map((record, index) => ({
                label: `source:${REQUIRED_SOURCE_PATHS[index]}`,
                value: record.sha256,
            })),
            { label: "targetManifest", value: manifest.inputs.targetManifest.sha256 },
            { label: "catalog", value: manifest.inputs.catalog.sha256 },
        ],
        "inputs.sourceBundle",
    );
    const runtimeBundleSha256 = verifyBundleDescriptor(
        manifest.inputs.runtimeBundle,
        [
            { label: "packageLock", value: manifest.inputs.packageLock.sha256 },
            { label: "nodeRuntime", value: manifest.inputs.nodeRuntime.sha256 },
            { label: "pythonRuntime", value: manifest.inputs.pythonRuntime.sha256 },
            { label: "scontrolRuntime", value: manifest.inputs.scontrolRuntime.sha256 },
            { label: "gameApiPackage", value: manifest.inputs.gameApiPackage.sha256 },
            { label: "gameApiRuntime", value: manifest.inputs.gameApiRuntime.sha256 },
            { label: "gameApiRuntimeTree", value: gameApiRuntimeTreeSha256 },
            { label: "runtimeDependencyTree", value: runtimeDependencyTreeSha256 },
            ...manifest.inputs.compiledRuntime.map((record) => ({
                label: `compiledRuntime:${path.basename(record.path)}`,
                value: record.sha256,
            })),
            { label: "mixTree", value: mixTreeSha256 },
        ],
        "inputs.runtimeBundle",
    );

    return {
        packageLockSha256: manifest.inputs.packageLock.sha256,
        gameApiPackageSha256: manifest.inputs.gameApiPackage.sha256,
        gameApiRuntimeSha256: manifest.inputs.gameApiRuntime.sha256,
        compiledProbeSha256: manifest.inputs.compiledProbe.sha256,
        gameApiRuntimeTreeSha256,
        runtimeDependencyTreeSha256,
        mixTreeSha256,
        sourceBundleSha256,
        runtimeBundleSha256,
    };
};

const buildSettings = (mapName: string, agents: Bot[]): CreateOfflineOpts => {
    const gameMode = cdapi.getAvailableGameModes(mapName)[0];
    if (!gameMode) throw new Error(`No available game mode for ${mapName}`);
    return {
        buildOffAlly: false,
        cratesAppear: false,
        credits: 10000,
        gameMode,
        gameSpeed: 6,
        mapName,
        mcvRepacks: true,
        shortGame: true,
        superWeapons: false,
        unitCount: 0,
        online: false,
        agents,
    };
};

const runProbeOrder = async (
    family: ManifestFamily,
    seed: number,
    targetTick: number,
    country: string,
    order: ProbeRun["order"],
): Promise<ProbeRun> => {
    const startedAt = Date.now();
    const alpha = new PassiveFidelityProbe(`FidelityAlpha_${family.index}`, country);
    const beta = new PassiveFidelityProbe(`FidelityBeta_${family.index}`, country);
    const participants = { alpha, beta };
    let initialTick: number | null = null;
    let finalTick: number | null = null;
    let updates = 0;

    const captured = await captureConsoleWarnings(`${family.familyId}:${order.join("-")}`, async () => {
        const agents = order.map((identity) => participants[identity]);
        await withSeededOfflineGame(
            cdapi,
            buildSettings(family.mapName, agents),
            seed,
            [
                { agent: alpha, identity: "fidelity-alpha" },
                { agent: beta, identity: "fidelity-beta" },
            ],
            async (game) => {
                initialTick = game.getCurrentTick();
                finalTick = initialTick;
                let stagnantUpdates = 0;
                const maxUpdates = targetTick + 32;
                while ((finalTick as number) < targetTick && updates < maxUpdates) {
                    const before = finalTick as number;
                    await game.update();
                    updates++;
                    finalTick = game.getCurrentTick();
                    stagnantUpdates = finalTick > before ? 0 : stagnantUpdates + 1;
                    if (stagnantUpdates >= 8) {
                        throw new Error(`Engine tick failed to advance for ${stagnantUpdates} consecutive updates`);
                    }
                }
                if ((finalTick as number) < targetTick) {
                    throw new Error(`Engine reached tick ${finalTick} instead of target tick ${targetTick}`);
                }
            },
        );
    });

    return {
        order,
        loaded: initialTick !== null,
        initialTick,
        finalTick,
        updates,
        progressedBeyondTickOne: finalTick !== null && finalTick > 1,
        reachedTargetTick: finalTick !== null && finalTick >= targetTick,
        starts: {
            alpha: alpha.startLocation,
            beta: beta.startLocation,
        },
        wallTimeMs: Date.now() - startedAt,
        warnings: captured.warnings,
        warningCaptureTruncated: captured.truncated,
        error: captured.error === null ? null : serializeCapturedError(captured.error),
    };
};

const runFamily = async (family: ManifestFamily, manifest: FidelityManifest) => {
    const expectedPath = path.resolve(manifest.inputs.mixDir, family.mapName);
    const runtimeSha256 = fs.existsSync(expectedPath) ? sha256File(expectedPath) : null;
    const seed = deriveEngineSeed(manifest.protocol.engineSeedBase, family.index);
    let forward: ProbeRun | null = null;
    let reverse: ProbeRun | null = null;
    const failureCategories = [...family.staticChecks.failures];

    if (runtimeSha256 !== family.sha256) {
        failureCategories.push(runtimeSha256 === null ? "runtime_map_missing" : "runtime_map_hash_mismatch");
    } else {
        forward = await runProbeOrder(
            family,
            seed,
            manifest.protocol.targetTick,
            manifest.protocol.participantCountry,
            ["alpha", "beta"],
        );
        reverse = await runProbeOrder(
            family,
            seed,
            manifest.protocol.targetTick,
            manifest.protocol.participantCountry,
            ["beta", "alpha"],
        );
    }

    for (const [label, probe] of [
        ["forward", forward],
        ["reverse", reverse],
    ] as const) {
        if (!probe) continue;
        if (probe.error) failureCategories.push(`${label}_${probe.error.category}`);
        if (!probe.loaded) failureCategories.push(`${label}_load_failed`);
        if (!probe.progressedBeyondTickOne) failureCategories.push(`${label}_no_progress_beyond_tick_1`);
        if (!probe.reachedTargetTick) failureCategories.push(`${label}_target_tick_not_reached`);
        if (probe.warningCaptureTruncated) failureCategories.push(`${label}_warning_capture_truncated`);
    }

    const reciprocal =
        forward && reverse
            ? validateReciprocalStarts(
                  forward.starts,
                  reverse.starts,
                  family.declaredStartLocations.map(({ x, y }) => ({ x, y })),
              )
            : null;
    if (reciprocal) failureCategories.push(...reciprocal.failures);

    const capturedWarnings = [...(forward?.warnings ?? []), ...(reverse?.warnings ?? [])];
    for (const warning of capturedWarnings) {
        if (warning.severity === "fail") failureCategories.push(`warning_${warning.category}`);
    }
    const reviewCategories = capturedWarnings
        .filter((warning) => warning.severity === "review")
        .map((warning) => `warning_${warning.category}`);
    const warnings = capturedWarnings.map(serializeCapturedWarning);
    const uniqueFailures = [...new Set(failureCategories)].sort();
    const uniqueReviews = [...new Set(reviewCategories)].sort();
    const withoutDuplicatedWarnings = (probe: ProbeRun | null) => {
        if (!probe) return null;
        const { warnings: _warnings, ...record } = probe;
        return record;
    };

    return {
        familyIndex: family.index,
        familyId: family.familyId,
        representativeMapPath: family.representativeMapPath,
        mapName: family.mapName,
        mapBytes: family.bytes,
        mapSha256: runtimeSha256,
        slurmJobId: manifest.scheduler.jobId,
        requestedEngineSeed: seed,
        targetTick: manifest.protocol.targetTick,
        declaredStartLocations: family.declaredStartLocations,
        forward: withoutDuplicatedWarnings(forward),
        reverse: withoutDuplicatedWarnings(reverse),
        reciprocalStartCheck: reciprocal,
        warnings,
        failureCategories: uniqueFailures,
        reviewCategories: uniqueReviews,
        fidelityStatus: uniqueFailures.length > 0 ? "fail" : uniqueReviews.length > 0 ? "review" : "pass",
    };
};

const writeExclusiveJson = (outputPath: string, value: unknown): void => {
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    if (fs.existsSync(outputPath)) throw new Error(`Refusing to overwrite ${outputPath}`);
    const temporaryPath = `${outputPath}.tmp-${process.pid}`;
    fs.writeFileSync(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, { flag: "wx" });
    fs.renameSync(temporaryPath, outputPath);
};

const main = async (): Promise<void> => {
    const manifestPath = path.resolve(requireStringArg("--manifest"));
    const outputPath = path.resolve(requireStringArg("--output"));
    const scheduler = getAuthoritativeScheduler();
    const manifestBytes = fs.readFileSync(manifestPath);
    const manifest = JSON.parse(manifestBytes.toString("utf8")) as FidelityManifest;
    const runtimeHashes = assertManifestIntegrity(manifest, scheduler);

    const initialization = await captureConsoleWarnings("cdapi.init", async () => cdapi.init(manifest.inputs.mixDir));
    const families = [];
    if (initialization.error === null) {
        for (const family of manifest.families) families.push(await runFamily(family, manifest));
    }

    const initializationError = initialization.error === null ? null : serializeCapturedError(initialization.error);
    const coverage = deriveProbeCoverage(manifest.selection, manifest.families.length, families.length);
    const result = {
        schemaVersion: 1,
        gate: MAP_FIDELITY_GATE,
        outcomeFree: true,
        artifactKind: coverage.artifactKind,
        scheduler,
        manifestPath,
        manifestSha256: createHash("sha256").update(manifestBytes).digest("hex"),
        logging: manifest.inputs.logging,
        runtimeHashes,
        scope: coverage.scope,
        populationFamilyCount: coverage.populationFamilyCount,
        runFamilyCount: coverage.runFamilyCount,
        fullCoverage: coverage.fullCoverage,
        eligibleForFidelityClearance: coverage.eligibleForFidelityClearance,
        initialization: {
            succeeded: initialization.error === null,
            warnings: initialization.warnings.map(serializeCapturedWarning),
            warningCaptureTruncated: initialization.truncated,
            error: initializationError,
        },
        familyCountRequested: manifest.families.length,
        familyCountRun: families.length,
        families,
    };
    assertStrictFidelityProbeResult(result);
    writeExclusiveJson(outputPath, result);
};

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
    main().catch((error) => {
        process.stderr.write(fatalDiagnosticLine(error));
        process.exitCode = 2;
    });
}
