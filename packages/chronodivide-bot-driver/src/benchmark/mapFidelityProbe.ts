import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { Bot, CreateOfflineOpts, GameApi, cdapi } from "@chronodivide/game-api";
import {
    BundleDescriptor,
    ExactFileDescriptor,
    EXPANDED_PREFLIGHT_FAMILY_COUNT,
    EXPANDED_PREFLIGHT_RULE,
    FamilyBinding,
    FamilyWorkerInitialization,
    FamilyWorkerProbeRun,
    FamilyWorkerResult,
    FamilyWorkerScheduler,
    FamilyWorkerShard,
    LoggingDescriptor,
    MAP_FIDELITY_GATE,
    ManifestSelection,
    PhaseWarning,
    StartLocation,
    TreeDescriptor,
    WARNING_CATEGORY_SEVERITY,
    assertPinnedLoggingMode,
    assertStrictFamilyWorkerShard,
    canonicalJson,
    canonicalJsonSha256,
    captureConsoleWarnings,
    deriveProbeCoverage,
    serializeCapturedError,
    serializeCapturedWarning,
    treeCompositeSha256,
    validateReciprocalStarts,
    verifyBundleDescriptor,
    verifyExactFileDescriptor,
} from "./mapFidelityProtocol.js";
import {
    MAP_LOAD_ATTESTATION_PROTOCOL,
    MapLoadAttestationError,
    materializeMapAlias,
    removeMaterializedMapAlias,
    withMapLoadAttestation,
} from "./mapLoadAttestation.js";
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

const WORKER_SOURCE_PATHS = [
    "packages/chronodivide-bot-driver/src/benchmark/mapFidelityProbe.ts",
    "packages/chronodivide-bot-driver/src/benchmark/mapFidelityProtocol.ts",
    "packages/chronodivide-bot-driver/src/benchmark/mapLoadAttestation.ts",
    "packages/chronodivide-bot-driver/src/benchmark/seededOfflineGame.ts",
    "research/scripts/map_fidelity_gate.py",
    "research/scripts/map_fidelity_supervisor.py",
    "research/scripts/select_map_fidelity_preflight.py",
    "research/scripts/select_temperate_fidelity_targets.py",
    "research/scripts/freeze_method_v3_fresh_fidelity_population.py",
    "research/scripts/retrieve_method_v3_fresh_maps.py",
    "research/slurm/map_fidelity_gate_v1.sbatch",
] as const;

const PREFLIGHT_PLAN_RELATIVE_PATH = "research/artifacts/map_fidelity_expanded_preflight_v2.json";
const SOURCE_TARGET_RELATIVE_PATH = "research/artifacts/role_blind_fidelity_targets_v1.json";
const TEMPERATE_TARGET_RELATIVE_PATH =
    "research/artifacts/role_blind_temperate_fidelity_targets_v1.json";
const COMPILED_RUNTIME_NAMES = [
    "mapFidelityProbe.js",
    "mapFidelityProtocol.js",
    "mapLoadAttestation.js",
    "seededOfflineGame.js",
] as const;

export const expectedWorkerCommittedInputPaths = (
    targetRelative: string,
    catalogRelative: string,
    preflightRelative: string | null,
): string[] => [
    ...WORKER_SOURCE_PATHS,
    targetRelative,
    catalogRelative,
    ...(targetRelative === TEMPERATE_TARGET_RELATIVE_PATH
        ? [SOURCE_TARGET_RELATIVE_PATH]
        : []),
    ...(preflightRelative === null ? [] : [preflightRelative]),
];

const RUNTIME_HASH_KEYS = [
    "packageLockSha256",
    "nodeRuntimeSha256",
    "pythonRuntimeSha256",
    "scontrolRuntimeSha256",
    "gameApiPackageSha256",
    "gameApiRuntimeSha256",
    "gameApiRuntimeTreeSha256",
    "runtimeDependencyTreeSha256",
    "mixTreeSha256",
    "compiledProbeSha256",
    "compiledProtocolSha256",
    "compiledMapLoadAttestationSha256",
    "compiledSeededGameSha256",
    "sourceBundleSha256",
    "runtimeBundleSha256",
] as const;

const WORKER_ENVIRONMENT_KEYS = [
    "PATH",
    "LD_LIBRARY_PATH",
    "TZ",
    "LC_ALL",
    "PYTHONHASHSEED",
    "DEBUG_LOGGING",
    "SCONTROL",
    "MAP_FIDELITY_PRIVATE_DIAGNOSTICS_ROOT",
    "SLURM_JOB_ID",
    "SLURM_JOB_NAME",
    "SLURM_JOB_PARTITION",
    "SLURM_JOB_QOS",
    "SLURM_CPUS_PER_TASK",
    "SLURM_MEM_PER_NODE",
    "SLURM_RESTART_COUNT",
    "SLURM_ARRAY_JOB_ID",
    "SLURM_ARRAY_TASK_ID",
    "SLURMD_NODENAME",
] as const;

type WorkerRuntimeHashes = Record<(typeof RUNTIME_HASH_KEYS)[number], string>;

type WorkerGitDescriptor = {
    commit: string;
    branch: string;
    status: string[];
    criticalStatus: string[];
    criticalPaths: string[];
    trackedDiffBytes: number;
    trackedDiffSha256: string;
};

type WorkerGitBlob = {
    gitPath: string;
    objectId: string;
    bytes: number;
    sha256: string;
};

export type WorkerManifestFamily = ManifestFamily & {
    representativeSelectionRule: string;
    sections: string[];
    requiredSections: Record<string, boolean>;
    requiredKeys: Record<string, boolean>;
    payloadEntryCounts: Record<string, number>;
};

type WorkerManifest = {
    schemaVersion: 2;
    gate: typeof MAP_FIDELITY_GATE;
    outcomeFree: true;
    status: "SLURM_MAP_FIDELITY_FULL_NOT_A_PAPER_RESULT" | "SLURM_MAP_FIDELITY_PREFLIGHT_NOT_CLEARANCE";
    createdAt: string;
    scheduler: SchedulerDescriptor;
    protocol: {
        targetTick: number;
        engineSeedBase: number;
        participantCountry: string;
        initialTickRequired: 0;
        tickUpdateArithmetic: "updates === finalTick - initialTick";
        mapLoadAttestation: {
            protocol: typeof MAP_LOAD_ATTESTATION_PROTOCOL;
            aliasTemplate: "cdfid-{familyIndex:06d}-{mapSha256}.map";
            expectedReadsByPhase: {
                initialization: 1;
                forward_create: 2;
                reverse_create: 2;
            };
            totalExpectedReads: 5;
        };
        reciprocalOrders: [["alpha", "beta"], ["beta", "alpha"]];
        dynamicStartCoverageClaim: string;
        requiredSections: string[];
        requiredKeys: Record<string, string[]>;
        warningCategorySeverity: typeof WARNING_CATEGORY_SEVERITY;
        consoleErrorAlwaysFails: true;
        forbiddenOutcomeKeys: string[];
        noPolicyBots: true;
        noGameCompletionQuery: true;
        logging: LoggingDescriptor;
    };
    inputs: {
        repoRoot: string;
        git: WorkerGitDescriptor;
        trackedCommittedInputs: string[];
        gitBlobs: WorkerGitBlob[];
        sourceFiles: ExactFileDescriptor[];
        targetManifest: ExactFileDescriptor;
        targetPopulationCommitmentSha256: string;
        catalog: ExactFileDescriptor;
        preflightPlan: ExactFileDescriptor | null;
        mixDir: string;
        mixTree: TreeDescriptor;
        packageLock: ExactFileDescriptor;
        nodeRuntime: ExactFileDescriptor;
        pythonRuntime: ExactFileDescriptor;
        scontrolRuntime: ExactFileDescriptor;
        gameApiPackage: ExactFileDescriptor;
        gameApiRuntime: ExactFileDescriptor;
        gameApiRuntimeTree: TreeDescriptor;
        runtimeDependencyTree: TreeDescriptor;
        compiledProbe: ExactFileDescriptor;
        compiledRuntime: ExactFileDescriptor[];
        logging: LoggingDescriptor;
        sourceBundle: BundleDescriptor;
        runtimeBundle: BundleDescriptor;
        familySequenceSha256: string;
    };
    runtimeHashes: WorkerRuntimeHashes;
    selection: ManifestSelection;
    families: WorkerManifestFamily[];
};

type WorkerPreAttestation = {
    schemaVersion: 1;
    gate: typeof MAP_FIDELITY_GATE;
    artifactKind: "map_fidelity_job_attestation";
    outcomeFree: true;
    phase: "pre_workers";
    manifest: ExactFileDescriptor;
    scheduler: SchedulerDescriptor;
    runtimeHashes: WorkerRuntimeHashes;
    bindings: {
        sourceCommit: string;
        targetPopulationCommitmentSha256: string;
        familySequenceSha256: string;
        sourceBundleSha256: string;
        runtimeBundleSha256: string;
    };
    preAttestation: null;
    checkpointLedger: null;
};

type WorkerIntent = {
    schemaVersion: 1;
    gate: typeof MAP_FIDELITY_GATE;
    artifactKind: "map_fidelity_family_attempt_intent";
    outcomeFree: true;
    manifest: { path: string; sha256: string };
    attestation: { path: string; sha256: string };
    family: FamilyBinding;
    attemptNumber: number;
    executionPolicy: {
        timeoutSeconds: number;
        terminationGraceSeconds: number;
        maxTechnicalAttempts: number;
        maxStreamBytes: number;
    };
    scheduler: SchedulerDescriptor;
    environment: {
        allowedKeys: string[];
        values: Record<string, string>;
        sha256: string;
    };
    worker: {
        argumentProtocol: "map-fidelity-family-worker-v1";
        commandPrefixSha256: string;
        commandSha256: string;
        executable: ExactFileDescriptor | null;
        shardPath: string;
    };
};

type WorkerPhaseResult<T> = {
    value: T | null;
    error: unknown | null;
    warnings: PhaseWarning[];
    truncated: boolean;
};

type WorkerOrderResult = {
    record: FamilyWorkerProbeRun;
    warnings: PhaseWarning[];
};

const HEX_SHA256 = /^[0-9a-f]{64}$/;
const GIT_OBJECT_ID = /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/;
const EMPTY_SHA256 = createHash("sha256").update(Buffer.alloc(0)).digest("hex");

export const WORKER_TECHNICAL_STAGES = [
    "parse_arguments",
    "scheduler_validate",
    "manifest_read",
    "manifest_validate",
    "family_select",
    "pre_attestation_read",
    "pre_attestation_validate",
    "intent_read",
    "intent_validate",
    "output_parent_validate",
    "source_validate",
    "sandbox_create",
    "alias_materialize",
    "engine_initialize",
    "engine_attestation_enter",
    "engine_map_initialize",
    "engine_forward",
    "engine_reverse",
    "engine_attestation_finalize",
    "engine_result_finalize",
    "alias_cleanup",
    "shard_validate",
    "shard_write",
] as const;

export type WorkerTechnicalStage = (typeof WORKER_TECHNICAL_STAGES)[number];

export type WorkerTechnicalDiagnostic = {
    schemaVersion: 1;
    gate: typeof MAP_FIDELITY_GATE;
    artifactKind: "map_fidelity_worker_technical_diagnostic";
    outcomeFree: true;
    stage: WorkerTechnicalStage;
    errorNameSha256: string;
    errorMessageSha256: string;
    errorStackSha256: string | null;
};

let currentWorkerTechnicalStage: WorkerTechnicalStage = "parse_arguments";

export const getCurrentWorkerTechnicalStage = (): WorkerTechnicalStage => currentWorkerTechnicalStage;

const diagnosticComponentSha256 = (value: string): string =>
    createHash("sha256").update(value, "utf8").digest("hex");

export const buildWorkerTechnicalDiagnostic = (
    stage: WorkerTechnicalStage,
    error: unknown,
): WorkerTechnicalDiagnostic => {
    const errorName = error instanceof Error ? error.name : typeof error;
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error && typeof error.stack === "string" ? error.stack : null;
    return {
        schemaVersion: 1,
        gate: MAP_FIDELITY_GATE,
        artifactKind: "map_fidelity_worker_technical_diagnostic",
        outcomeFree: true,
        stage,
        errorNameSha256: diagnosticComponentSha256(errorName),
        errorMessageSha256: diagnosticComponentSha256(errorMessage),
        errorStackSha256: errorStack === null ? null : diagnosticComponentSha256(errorStack),
    };
};

const setWorkerTechnicalStage = (stage: WorkerTechnicalStage): void => {
    currentWorkerTechnicalStage = stage;
};

const assertWorkerRecord = (value: unknown, label: string): Record<string, unknown> => {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
        throw new Error(`${label} must be an object`);
    }
    return value as Record<string, unknown>;
};

const assertWorkerExactKeys = (
    value: unknown,
    expectedKeys: readonly string[],
    label: string,
): Record<string, unknown> => {
    const record = assertWorkerRecord(value, label);
    const actual = Object.keys(record).sort();
    const expected = [...expectedKeys].sort();
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`${label} keys must be exactly [${expected.join(", ")}]`);
    }
    return record;
};

const requireWorkerString = (value: unknown, label: string): string => {
    if (typeof value !== "string" || value.length === 0) throw new Error(`${label} must be nonempty`);
    return value;
};

const requireWorkerInteger = (value: unknown, label: string): number => {
    if (!Number.isSafeInteger(value) || (value as number) < 0) {
        throw new Error(`${label} must be a nonnegative safe integer`);
    }
    return value as number;
};

const requireWorkerHash = (value: unknown, label: string): string => {
    if (typeof value !== "string" || !HEX_SHA256.test(value)) {
        throw new Error(`${label} must be a lowercase SHA-256`);
    }
    return value;
};

const requireWorkerStringArray = (value: unknown, label: string): string[] => {
    if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string")) {
        throw new Error(`${label} must be an array of strings`);
    }
    return value as string[];
};

const WORKER_FORBIDDEN_OUTCOME_KEYS = [
    "winner",
    "loser",
    "defeated",
    "credits",
    "candidateWins",
    "baselineWins",
    "winRate",
    "scoreRate",
    "score",
    "draws",
    "combatants",
    "units",
    "buildings",
    "playerStats",
    "isFinished",
    "finished",
    "outcome",
] as const;

const assertWorkerScheduler = (
    value: unknown,
    label: string,
    expected?: SchedulerDescriptor,
): SchedulerDescriptor => {
    const record = assertWorkerExactKeys(value, ["jobId", "account", "partition", "qos", "source"], label);
    const scheduler: SchedulerDescriptor = {
        jobId: requireWorkerString(record.jobId, `${label}.jobId`),
        account: requireWorkerString(record.account, `${label}.account`),
        partition:
            record.partition === null ? null : requireWorkerString(record.partition, `${label}.partition`),
        qos: record.qos === null ? null : requireWorkerString(record.qos, `${label}.qos`),
        source: record.source as "scontrol",
    };
    if (scheduler.account !== "pi_jss233" || scheduler.source !== "scontrol") {
        throw new Error(`${label} is not authoritative pi_jss233 provenance`);
    }
    if (expected && canonicalJsonSha256(scheduler) !== canonicalJsonSha256(expected)) {
        throw new Error(`${label} does not match the authoritative running Slurm job`);
    }
    return scheduler;
};

const assertWorkerFileDescriptor = (value: unknown, label: string): ExactFileDescriptor => {
    const record = assertWorkerExactKeys(value, ["path", "bytes", "sha256"], label);
    const descriptor = {
        path: requireWorkerString(record.path, `${label}.path`),
        bytes: requireWorkerInteger(record.bytes, `${label}.bytes`),
        sha256: requireWorkerHash(record.sha256, `${label}.sha256`),
    };
    if (!path.isAbsolute(descriptor.path)) throw new Error(`${label}.path must be absolute`);
    const stat = fs.lstatSync(descriptor.path);
    if (stat.isSymbolicLink()) throw new Error(`${label}.path cannot be a symbolic link`);
    verifyExactFileDescriptor(descriptor, label);
    return descriptor;
};

const assertWorkerTreeCommitment = (value: unknown, label: string): TreeDescriptor => {
    const record = assertWorkerExactKeys(
        value,
        ["root", "fileCount", "symlinkCount", "bytes", "sha256", "hashAlgorithm", "entries"],
        label,
    );
    const root = requireWorkerString(record.root, `${label}.root`);
    if (!path.isAbsolute(root)) throw new Error(`${label}.root must be absolute`);
    const fileCount = requireWorkerInteger(record.fileCount, `${label}.fileCount`);
    const symlinkCount = requireWorkerInteger(record.symlinkCount, `${label}.symlinkCount`);
    const bytes = requireWorkerInteger(record.bytes, `${label}.bytes`);
    const sha256 = requireWorkerHash(record.sha256, `${label}.sha256`);
    if (
        record.hashAlgorithm !==
        "sha256(relative_path NUL kind NUL bytes NUL content_or_target_sha256 NUL target_or_empty NUL)"
    ) {
        throw new Error(`${label}.hashAlgorithm is invalid`);
    }
    if (!Array.isArray(record.entries)) throw new Error(`${label}.entries must be an array`);
    const entries = record.entries.map((entry, index) => {
        const item = assertWorkerExactKeys(
            entry,
            ["path", "kind", "bytes", "sha256", "target"],
            `${label}.entries[${index}]`,
        );
        const relativePath = requireWorkerString(item.path, `${label}.entries[${index}].path`);
        if (path.posix.isAbsolute(relativePath) || relativePath.split("/").includes("..")) {
            throw new Error(`${label}.entries[${index}].path is unsafe`);
        }
        if (item.kind !== "regular_file" && item.kind !== "symbolic_link") {
            throw new Error(`${label}.entries[${index}].kind is invalid`);
        }
        const entryBytes = requireWorkerInteger(item.bytes, `${label}.entries[${index}].bytes`);
        const entrySha256 = requireWorkerHash(item.sha256, `${label}.entries[${index}].sha256`);
        if (item.kind === "regular_file" && item.target !== null) {
            throw new Error(`${label}.entries[${index}] regular-file target must be null`);
        }
        if (item.kind === "symbolic_link") {
            if (typeof item.target !== "string") {
                throw new Error(`${label}.entries[${index}] link target must be a string`);
            }
            const targetBytes = Buffer.from(item.target, "utf8");
            if (
                targetBytes.byteLength !== entryBytes ||
                createHash("sha256").update(targetBytes).digest("hex") !== entrySha256
            ) {
                throw new Error(`${label}.entries[${index}] link target commitment is invalid`);
            }
        }
        return {
            path: relativePath,
            kind: item.kind as "regular_file" | "symbolic_link",
            bytes: entryBytes,
            sha256: entrySha256,
            target: item.target as string | null,
        };
    });
    const paths = entries.map((entry) => entry.path);
    if (
        JSON.stringify(paths) !== JSON.stringify([...paths].sort()) ||
        new Set(paths).size !== paths.length
    ) {
        throw new Error(`${label}.entries must have unique deterministic path order`);
    }
    if (
        fileCount !== entries.length ||
        symlinkCount !== entries.filter((entry) => entry.kind === "symbolic_link").length ||
        bytes !== entries.reduce((total, entry) => total + entry.bytes, 0) ||
        sha256 !== treeCompositeSha256(entries)
    ) {
        throw new Error(`${label} aggregate commitment is inconsistent`);
    }
    return {
        root,
        fileCount,
        symlinkCount,
        bytes,
        sha256,
        hashAlgorithm: record.hashAlgorithm as TreeDescriptor["hashAlgorithm"],
        entries,
    };
};

const assertWorkerIntegerRecord = (value: unknown, label: string): void => {
    const record = assertWorkerRecord(value, label);
    for (const [key, entry] of Object.entries(record)) {
        requireWorkerInteger(entry, `${label}.${key}`);
    }
};

const assertWorkerBooleanRecord = (value: unknown, label: string): void => {
    const record = assertWorkerRecord(value, label);
    for (const [key, entry] of Object.entries(record)) {
        if (typeof entry !== "boolean") {
            throw new Error(`${label}.${key} must be boolean`);
        }
    }
};

export const assertWorkerManifestFamily = (value: unknown, label: string): WorkerManifestFamily => {
    const family = assertWorkerExactKeys(
        value,
        [
            "index",
            "familyId",
            "representativeMapPath",
            "representativeSelectionRule",
            "mapName",
            "bytes",
            "sha256",
            "sections",
            "requiredSections",
            "requiredKeys",
            "payloadEntryCounts",
            "declaredStartLocations",
            "staticChecks",
        ],
        label,
    );
    requireWorkerInteger(family.index, `${label}.index`);
    requireWorkerString(family.familyId, `${label}.familyId`);
    const representative = requireWorkerString(family.representativeMapPath, `${label}.representativeMapPath`);
    if (path.posix.isAbsolute(representative) || representative.split("/").includes("..")) {
        throw new Error(`${label}.representativeMapPath is unsafe`);
    }
    requireWorkerString(family.representativeSelectionRule, `${label}.representativeSelectionRule`);
    requireWorkerString(family.mapName, `${label}.mapName`);
    requireWorkerInteger(family.bytes, `${label}.bytes`);
    requireWorkerHash(family.sha256, `${label}.sha256`);
    const sections = requireWorkerStringArray(family.sections, `${label}.sections`);
    if (JSON.stringify(sections) !== JSON.stringify([...new Set(sections)].sort())) {
        throw new Error(`${label}.sections must be sorted and unique`);
    }
    assertWorkerBooleanRecord(family.requiredSections, `${label}.requiredSections`);
    assertWorkerBooleanRecord(family.requiredKeys, `${label}.requiredKeys`);
    assertWorkerIntegerRecord(family.payloadEntryCounts, `${label}.payloadEntryCounts`);
    if (!Array.isArray(family.declaredStartLocations) || family.declaredStartLocations.length < 2) {
        throw new Error(`${label}.declaredStartLocations must contain at least two points`);
    }
    family.declaredStartLocations.forEach((point, index) => {
        const start = assertWorkerExactKeys(
            point,
            ["x", "y", "waypoint", "encoded"],
            `${label}.declaredStartLocations[${index}]`,
        );
        for (const key of ["x", "y", "waypoint", "encoded"]) {
            requireWorkerInteger(start[key], `${label}.declaredStartLocations[${index}].${key}`);
        }
    });
    const staticChecks = assertWorkerExactKeys(
        family.staticChecks,
        [
            "requiredSectionsPresent",
            "requiredKeysPresent",
            "payloadSectionsNonempty",
            "startEnumerationValid",
            "failures",
        ],
        `${label}.staticChecks`,
    );
    for (const key of [
        "requiredSectionsPresent",
        "requiredKeysPresent",
        "payloadSectionsNonempty",
        "startEnumerationValid",
    ]) {
        if (typeof staticChecks[key] !== "boolean") {
            throw new Error(`${label}.staticChecks.${key} must be boolean`);
        }
    }
    requireWorkerStringArray(staticChecks.failures, `${label}.staticChecks.failures`);
    return value as WorkerManifestFamily;
};

const assertWorkerProtocol = (value: unknown, label: string): WorkerManifest["protocol"] => {
    const protocol = assertWorkerExactKeys(
        value,
        [
            "targetTick",
            "engineSeedBase",
            "participantCountry",
            "initialTickRequired",
            "tickUpdateArithmetic",
            "mapLoadAttestation",
            "reciprocalOrders",
            "dynamicStartCoverageClaim",
            "requiredSections",
            "requiredKeys",
            "warningCategorySeverity",
            "consoleErrorAlwaysFails",
            "forbiddenOutcomeKeys",
            "noPolicyBots",
            "noGameCompletionQuery",
            "logging",
        ],
        label,
    );
    if (requireWorkerInteger(protocol.targetTick, `${label}.targetTick`) <= 1) {
        throw new Error(`${label}.targetTick must exceed one`);
    }
    requireWorkerInteger(protocol.engineSeedBase, `${label}.engineSeedBase`);
    requireWorkerString(protocol.participantCountry, `${label}.participantCountry`);
    if (
        protocol.initialTickRequired !== 0 ||
        protocol.tickUpdateArithmetic !== "updates === finalTick - initialTick" ||
        protocol.consoleErrorAlwaysFails !== true ||
        protocol.noPolicyBots !== true ||
        protocol.noGameCompletionQuery !== true
    ) {
        throw new Error(`${label} fixed safety invariants are invalid`);
    }
    const mapLoad = assertWorkerExactKeys(
        protocol.mapLoadAttestation,
        ["protocol", "aliasTemplate", "expectedReadsByPhase", "totalExpectedReads"],
        `${label}.mapLoadAttestation`,
    );
    const reads = assertWorkerExactKeys(
        mapLoad.expectedReadsByPhase,
        ["initialization", "forward_create", "reverse_create"],
        `${label}.mapLoadAttestation.expectedReadsByPhase`,
    );
    if (
        mapLoad.protocol !== MAP_LOAD_ATTESTATION_PROTOCOL ||
        mapLoad.aliasTemplate !== "cdfid-{familyIndex:06d}-{mapSha256}.map" ||
        reads.initialization !== 1 ||
        reads.forward_create !== 2 ||
        reads.reverse_create !== 2 ||
        mapLoad.totalExpectedReads !== 5
    ) {
        throw new Error(`${label}.mapLoadAttestation is invalid`);
    }
    if (JSON.stringify(protocol.reciprocalOrders) !== JSON.stringify([["alpha", "beta"], ["beta", "alpha"]])) {
        throw new Error(`${label}.reciprocalOrders is invalid`);
    }
    requireWorkerString(protocol.dynamicStartCoverageClaim, `${label}.dynamicStartCoverageClaim`);
    if (JSON.stringify(protocol.requiredSections) !== JSON.stringify(["basic", "map", "waypoints", "isomappack5", "overlaypack", "overlaydatapack"])) {
        throw new Error(`${label}.requiredSections is invalid`);
    }
    if (JSON.stringify(protocol.requiredKeys) !== JSON.stringify({ basic: ["gamemode"], map: ["size", "localsize", "theater"] })) {
        throw new Error(`${label}.requiredKeys is invalid`);
    }
    if (canonicalJsonSha256(protocol.warningCategorySeverity) !== canonicalJsonSha256(WARNING_CATEGORY_SEVERITY)) {
        throw new Error(`${label}.warningCategorySeverity is invalid`);
    }
    if (JSON.stringify(protocol.forbiddenOutcomeKeys) !== JSON.stringify(WORKER_FORBIDDEN_OUTCOME_KEYS)) {
        throw new Error(`${label}.forbiddenOutcomeKeys is invalid`);
    }
    assertPinnedLoggingMode(protocol.logging as LoggingDescriptor, process.env.DEBUG_LOGGING);
    return value as WorkerManifest["protocol"];
};

const assertWorkerGitDescriptor = (value: unknown, label: string): WorkerGitDescriptor => {
    const record = assertWorkerExactKeys(
        value,
        [
            "commit",
            "branch",
            "status",
            "criticalStatus",
            "criticalPaths",
            "trackedDiffBytes",
            "trackedDiffSha256",
        ],
        label,
    );
    const commit = requireWorkerString(record.commit, `${label}.commit`);
    if (!GIT_OBJECT_ID.test(commit)) throw new Error(`${label}.commit is not a Git object ID`);
    requireWorkerString(record.branch, `${label}.branch`);
    const status = requireWorkerStringArray(record.status, `${label}.status`);
    const criticalStatus = requireWorkerStringArray(record.criticalStatus, `${label}.criticalStatus`);
    requireWorkerStringArray(record.criticalPaths, `${label}.criticalPaths`);
    if (
        status.length !== 0 ||
        criticalStatus.length !== 0 ||
        record.trackedDiffBytes !== 0 ||
        record.trackedDiffSha256 !== EMPTY_SHA256
    ) {
        throw new Error(`${label} does not attest a clean committed source tree`);
    }
    return value as WorkerGitDescriptor;
};

const assertWorkerGitBlob = (value: unknown, label: string): WorkerGitBlob => {
    const record = assertWorkerExactKeys(value, ["gitPath", "objectId", "bytes", "sha256"], label);
    const gitPath = requireWorkerString(record.gitPath, `${label}.gitPath`);
    if (path.posix.isAbsolute(gitPath) || gitPath.split("/").includes("..")) {
        throw new Error(`${label}.gitPath is unsafe`);
    }
    const objectId = requireWorkerString(record.objectId, `${label}.objectId`);
    if (!GIT_OBJECT_ID.test(objectId)) throw new Error(`${label}.objectId is invalid`);
    requireWorkerInteger(record.bytes, `${label}.bytes`);
    requireWorkerHash(record.sha256, `${label}.sha256`);
    return value as WorkerGitBlob;
};

const descriptorRelativePath = (repoRoot: string, descriptor: ExactFileDescriptor, label: string): string => {
    const relative = path.relative(repoRoot, descriptor.path).split(path.sep).join("/");
    if (relative.length === 0 || relative.startsWith("../") || path.posix.isAbsolute(relative)) {
        throw new Error(`${label} is outside the repository`);
    }
    return relative;
};

const assertWorkerExpandedPreflightPlan = (
    descriptor: ExactFileDescriptor,
    repoRoot: string,
    selection: ManifestSelection,
    families: WorkerManifestFamily[],
    targetManifest: ExactFileDescriptor,
    catalog: ExactFileDescriptor,
    targetPopulationCommitmentSha256: string,
): void => {
    const relativePath = descriptorRelativePath(
        repoRoot,
        descriptor,
        "manifest.inputs.preflightPlan",
    );
    if (relativePath !== PREFLIGHT_PLAN_RELATIVE_PATH) {
        throw new Error("Expanded preflight plan path is not the frozen repository artifact");
    }
    if (
        descriptor.sha256 !== selection.preflightPlanSha256 ||
        typeof selection.preflightSelectedCommitmentSha256 !== "string"
    ) {
        throw new Error("Expanded preflight plan is not bound by manifest.selection");
    }
    const plan = assertWorkerExactKeys(
        JSON.parse(fs.readFileSync(descriptor.path, "utf8")) as unknown,
        [
            "schemaVersion",
            "artifactKind",
            "status",
            "outcomeBlind",
            "roleBlind",
            "isSplit",
            "notPolicyEvidence",
            "catalogSha256",
            "targetManifestSha256",
            "targetPopulationCommitmentSha256",
            "targetPopulationFamilyCount",
            "selectionPolicy",
            "selectionPolicySha256",
            "selectedFamilyCount",
            "selectedCommitmentSha256",
            "selected",
            "interpretation",
        ],
        "expanded preflight plan",
    );
    if (
        plan.schemaVersion !== 1 ||
        plan.artifactKind !== "role_blind_expanded_map_compatibility_preflight_plan" ||
        plan.status !== "FROZEN_ROLE_BLIND_TECHNICAL_PREFLIGHT_NOT_CLEARANCE" ||
        plan.outcomeBlind !== true ||
        plan.roleBlind !== true ||
        plan.isSplit !== false ||
        plan.notPolicyEvidence !== true ||
        plan.catalogSha256 !== catalog.sha256 ||
        plan.targetManifestSha256 !== targetManifest.sha256 ||
        plan.targetPopulationCommitmentSha256 !== targetPopulationCommitmentSha256 ||
        plan.targetPopulationFamilyCount !== selection.populationFamilyCount ||
        plan.selectedFamilyCount !== EXPANDED_PREFLIGHT_FAMILY_COUNT ||
        plan.selectedCommitmentSha256 !== selection.preflightSelectedCommitmentSha256 ||
        typeof plan.interpretation !== "string"
    ) {
        throw new Error("Expanded preflight plan identity/population binding is invalid");
    }
    const policy = assertWorkerExactKeys(
        plan.selectionPolicy,
        ["version", "axisOrder", "anchorPolicy", "extremaPolicy", "trace"],
        "expanded preflight plan.selectionPolicy",
    );
    if (
        policy.version !== "expanded-map-compatibility-preflight-v2" ||
        JSON.stringify(policy.axisOrder) !== JSON.stringify(["theater", "start_count", "global_extrema"]) ||
        !Array.isArray(policy.trace) ||
        plan.selectionPolicySha256 !== canonicalJsonSha256(policy)
    ) {
        throw new Error("Expanded preflight selection policy is invalid");
    }
    if (!Array.isArray(plan.selected) || plan.selected.length !== EXPANDED_PREFLIGHT_FAMILY_COUNT) {
        throw new Error("Expanded preflight selected list must contain exactly 11 families");
    }
    const selectedProjection: Array<{
        familyId: string;
        representative: { path: string; sha256: string };
    }> = [];
    const selectedById = new Map<string, { path: string; sha256: string }>();
    for (let ordinal = 0; ordinal < plan.selected.length; ordinal++) {
        const selected = assertWorkerExactKeys(
            plan.selected[ordinal],
            ["preflightOrdinal", "familyId", "representative", "coverage", "safeDescriptors"],
            `expanded preflight plan.selected[${ordinal}]`,
        );
        const familyId = requireWorkerString(
            selected.familyId,
            `expanded preflight plan.selected[${ordinal}].familyId`,
        );
        const representative = assertWorkerExactKeys(
            selected.representative,
            ["path", "sha256"],
            `expanded preflight plan.selected[${ordinal}].representative`,
        );
        const representativePath = requireWorkerString(
            representative.path,
            `expanded preflight plan.selected[${ordinal}].representative.path`,
        );
        const representativeSha256 = requireWorkerHash(
            representative.sha256,
            `expanded preflight plan.selected[${ordinal}].representative.sha256`,
        );
        if (
            requireWorkerInteger(
                selected.preflightOrdinal,
                `expanded preflight plan.selected[${ordinal}].preflightOrdinal`,
            ) !== ordinal ||
            selectedById.has(familyId)
        ) {
            throw new Error("Expanded preflight selected identities/order are invalid");
        }
        assertWorkerExactKeys(
            selected.coverage,
            ["axis", "value"],
            `expanded preflight plan.selected[${ordinal}].coverage`,
        );
        assertWorkerExactKeys(
            selected.safeDescriptors,
            ["theater", "startCount", "mapArea", "bytes"],
            `expanded preflight plan.selected[${ordinal}].safeDescriptors`,
        );
        const binding = { path: representativePath, sha256: representativeSha256 };
        selectedById.set(familyId, binding);
        selectedProjection.push({ familyId, representative: binding });
    }
    if (canonicalJsonSha256(selectedProjection) !== plan.selectedCommitmentSha256) {
        throw new Error("Expanded preflight selected commitment is invalid");
    }
    if (
        selectedById.size !== families.length ||
        families.some((family) => {
            const planned = selectedById.get(family.familyId);
            return (
                planned === undefined ||
                planned.path !== family.representativeMapPath ||
                planned.sha256 !== family.sha256
            );
        })
    ) {
        throw new Error("Manifest families do not equal the expanded preflight plan");
    }
};

export const assertWorkerManifest = (
    value: unknown,
    scheduler: SchedulerDescriptor,
): WorkerManifest => {
    const manifest = assertWorkerExactKeys(
        value,
        [
            "schemaVersion",
            "gate",
            "outcomeFree",
            "status",
            "createdAt",
            "scheduler",
            "protocol",
            "inputs",
            "runtimeHashes",
            "selection",
            "families",
        ],
        "manifest",
    );
    if (
        manifest.schemaVersion !== 2 ||
        manifest.gate !== MAP_FIDELITY_GATE ||
        manifest.outcomeFree !== true
    ) {
        throw new Error("Manifest identity markers are invalid");
    }
    const createdAt = requireWorkerString(manifest.createdAt, "manifest.createdAt");
    if (!Number.isFinite(Date.parse(createdAt))) throw new Error("manifest.createdAt is invalid");
    assertWorkerScheduler(manifest.scheduler, "manifest.scheduler", scheduler);
    const protocol = assertWorkerProtocol(manifest.protocol, "manifest.protocol");
    const inputs = assertWorkerExactKeys(
        manifest.inputs,
        [
            "repoRoot",
            "git",
            "trackedCommittedInputs",
            "gitBlobs",
            "sourceFiles",
            "targetManifest",
            "targetPopulationCommitmentSha256",
            "catalog",
            "mixDir",
            "preflightPlan",
            "mixTree",
            "packageLock",
            "nodeRuntime",
            "pythonRuntime",
            "scontrolRuntime",
            "gameApiPackage",
            "gameApiRuntime",
            "gameApiRuntimeTree",
            "runtimeDependencyTree",
            "compiledProbe",
            "compiledRuntime",
            "logging",
            "sourceBundle",
            "runtimeBundle",
            "familySequenceSha256",
        ],
        "manifest.inputs",
    );
    const repoRoot = requireWorkerString(inputs.repoRoot, "manifest.inputs.repoRoot");
    if (!path.isAbsolute(repoRoot) || !fs.lstatSync(repoRoot).isDirectory()) {
        throw new Error("manifest.inputs.repoRoot must be an existing absolute directory");
    }
    const git = assertWorkerGitDescriptor(inputs.git, "manifest.inputs.git");
    assertPinnedLoggingMode(inputs.logging as LoggingDescriptor, process.env.DEBUG_LOGGING);
    if (JSON.stringify(inputs.logging) !== JSON.stringify(protocol.logging)) {
        throw new Error("Manifest logging descriptors disagree");
    }
    if (!Array.isArray(manifest.families) || manifest.families.length === 0) {
        throw new Error("Manifest must contain at least one family");
    }
    const families = manifest.families.map((family, index) =>
        assertWorkerManifestFamily(family, `manifest.families[${index}]`),
    );
    for (let index = 0; index < families.length; index++) {
        if (index > 0 && families[index - 1].index >= families[index].index) {
            throw new Error("Manifest family indices must be strictly increasing");
        }
    }
    if (new Set(families.map((family) => family.familyId)).size !== families.length) {
        throw new Error("Manifest family IDs must be unique");
    }
    const familySequenceSha256 = requireWorkerHash(
        inputs.familySequenceSha256,
        "manifest.inputs.familySequenceSha256",
    );
    if (familySequenceSha256 !== canonicalJsonSha256(families)) {
        throw new Error("Manifest familySequenceSha256 is inconsistent");
    }
    const targetPopulationCommitmentSha256 = requireWorkerHash(
        inputs.targetPopulationCommitmentSha256,
        "manifest.inputs.targetPopulationCommitmentSha256",
    );
    const coverage = deriveProbeCoverage(manifest.selection as ManifestSelection, families.length, families.length);
    const expectedStatus =
        coverage.scope === "full"
            ? "SLURM_MAP_FIDELITY_FULL_NOT_A_PAPER_RESULT"
            : "SLURM_MAP_FIDELITY_PREFLIGHT_NOT_CLEARANCE";
    if (manifest.status !== expectedStatus) throw new Error("Manifest status does not match selection scope");

    if (!Array.isArray(inputs.sourceFiles) || inputs.sourceFiles.length !== WORKER_SOURCE_PATHS.length) {
        throw new Error("manifest.inputs.sourceFiles has the wrong length");
    }
    const sourceFiles = inputs.sourceFiles.map((descriptor, index) =>
        assertWorkerFileDescriptor(descriptor, `manifest.inputs.sourceFiles[${index}]`),
    );
    const sourceRelativePaths = sourceFiles.map((descriptor, index) =>
        descriptorRelativePath(repoRoot, descriptor, `manifest.inputs.sourceFiles[${index}]`),
    );
    if (JSON.stringify(sourceRelativePaths) !== JSON.stringify(WORKER_SOURCE_PATHS)) {
        throw new Error("manifest.inputs.sourceFiles is not the frozen ordered source list");
    }
    const targetManifest = assertWorkerFileDescriptor(inputs.targetManifest, "manifest.inputs.targetManifest");
    const catalog = assertWorkerFileDescriptor(inputs.catalog, "manifest.inputs.catalog");
    let preflightPlan: ExactFileDescriptor | null = null;
    if (coverage.scope === "preflight") {
        if (inputs.preflightPlan === null) {
            throw new Error("Preflight manifest lacks its committed expanded plan");
        }
        preflightPlan = assertWorkerFileDescriptor(
            inputs.preflightPlan,
            "manifest.inputs.preflightPlan",
        );
        assertWorkerExpandedPreflightPlan(
            preflightPlan,
            repoRoot,
            manifest.selection as ManifestSelection,
            families,
            targetManifest,
            catalog,
            targetPopulationCommitmentSha256,
        );
    } else if (inputs.preflightPlan !== null) {
        throw new Error("Full manifest must not bind a preflight plan");
    }
    const packageLock = assertWorkerFileDescriptor(inputs.packageLock, "manifest.inputs.packageLock");
    const nodeRuntime = assertWorkerFileDescriptor(inputs.nodeRuntime, "manifest.inputs.nodeRuntime");
    const pythonRuntime = assertWorkerFileDescriptor(inputs.pythonRuntime, "manifest.inputs.pythonRuntime");
    const scontrolRuntime = assertWorkerFileDescriptor(inputs.scontrolRuntime, "manifest.inputs.scontrolRuntime");
    const gameApiPackage = assertWorkerFileDescriptor(inputs.gameApiPackage, "manifest.inputs.gameApiPackage");
    const gameApiRuntime = assertWorkerFileDescriptor(inputs.gameApiRuntime, "manifest.inputs.gameApiRuntime");
    if (!Array.isArray(inputs.compiledRuntime) || inputs.compiledRuntime.length !== COMPILED_RUNTIME_NAMES.length) {
        throw new Error("manifest.inputs.compiledRuntime has the wrong length");
    }
    const compiledRuntime = inputs.compiledRuntime.map((descriptor, index) =>
        assertWorkerFileDescriptor(descriptor, `manifest.inputs.compiledRuntime[${index}]`),
    );
    if (
        JSON.stringify(compiledRuntime.map((descriptor) => path.basename(descriptor.path))) !==
        JSON.stringify(COMPILED_RUNTIME_NAMES)
    ) {
        throw new Error("manifest.inputs.compiledRuntime order is invalid");
    }
    const compiledProbe = assertWorkerFileDescriptor(inputs.compiledProbe, "manifest.inputs.compiledProbe");
    if (JSON.stringify(compiledProbe) !== JSON.stringify(compiledRuntime[0])) {
        throw new Error("manifest.inputs.compiledProbe must alias the first compiled runtime");
    }

    const gameApiRuntimeTree = assertWorkerTreeCommitment(
        inputs.gameApiRuntimeTree,
        "manifest.inputs.gameApiRuntimeTree",
    );
    const runtimeDependencyTree = assertWorkerTreeCommitment(
        inputs.runtimeDependencyTree,
        "manifest.inputs.runtimeDependencyTree",
    );
    const mixTree = assertWorkerTreeCommitment(inputs.mixTree, "manifest.inputs.mixTree");
    const mixDir = requireWorkerString(inputs.mixDir, "manifest.inputs.mixDir");
    if (path.resolve(mixDir) !== path.resolve(mixTree.root)) {
        throw new Error("manifest.inputs.mixDir does not match mixTree.root");
    }

    const targetRelative = descriptorRelativePath(repoRoot, targetManifest, "manifest.inputs.targetManifest");
    const catalogRelative = descriptorRelativePath(repoRoot, catalog, "manifest.inputs.catalog");
    const preflightRelative = preflightPlan === null ? null : PREFLIGHT_PLAN_RELATIVE_PATH;
    const expectedTracked = expectedWorkerCommittedInputPaths(
        targetRelative,
        catalogRelative,
        preflightRelative,
    );
    if (
        JSON.stringify(requireWorkerStringArray(inputs.trackedCommittedInputs, "manifest.inputs.trackedCommittedInputs")) !==
        JSON.stringify(expectedTracked)
    ) {
        throw new Error("manifest.inputs.trackedCommittedInputs is invalid");
    }
    if (!Array.isArray(inputs.gitBlobs)) throw new Error("manifest.inputs.gitBlobs must be an array");
    const gitBlobs = inputs.gitBlobs.map((record, index) =>
        assertWorkerGitBlob(record, `manifest.inputs.gitBlobs[${index}]`),
    );
    const expectedBlobPaths = expectedWorkerCommittedInputPaths(
        targetRelative,
        catalogRelative,
        preflightRelative,
    ).filter(
        (entry, index, all) => all.indexOf(entry) === index,
    );
    if (JSON.stringify(gitBlobs.map((record) => record.gitPath)) !== JSON.stringify(expectedBlobPaths)) {
        throw new Error("manifest.inputs.gitBlobs is not the frozen ordered union");
    }
    const descriptorByRelativePath = new Map<string, ExactFileDescriptor>([
        ...sourceFiles.map((descriptor, index) => [WORKER_SOURCE_PATHS[index], descriptor] as const),
        [targetRelative, targetManifest],
        [catalogRelative, catalog],
    ]);
    if (preflightRelative !== null && preflightPlan !== null) {
        descriptorByRelativePath.set(preflightRelative, preflightPlan);
    }
    for (const blob of gitBlobs) {
        const descriptor = descriptorByRelativePath.get(blob.gitPath);
        if (descriptor && (descriptor.bytes !== blob.bytes || descriptor.sha256 !== blob.sha256)) {
            throw new Error(`Git blob and exact-file descriptor disagree for ${blob.gitPath}`);
        }
    }

    const sourceBundleSha256 = verifyBundleDescriptor(
        inputs.sourceBundle as BundleDescriptor,
        [
            { label: "gitCommit", value: git.commit },
            ...gitBlobs.map((record) => ({
                label: `gitBlob:${record.gitPath}`,
                value: `${record.objectId}:${record.sha256}`,
            })),
            ...families.map((family) => ({
                label: `mapAsset:${family.index}:${family.representativeMapPath}`,
                value: `${family.bytes}:${family.sha256}`,
            })),
        ],
        "manifest.inputs.sourceBundle",
    );
    const runtimeBundleSha256 = verifyBundleDescriptor(
        inputs.runtimeBundle as BundleDescriptor,
        [
            { label: "packageLock", value: packageLock.sha256 },
            { label: "nodeRuntime", value: nodeRuntime.sha256 },
            { label: "pythonRuntime", value: pythonRuntime.sha256 },
            { label: "scontrolRuntime", value: scontrolRuntime.sha256 },
            { label: "gameApiPackage", value: gameApiPackage.sha256 },
            { label: "gameApiRuntime", value: gameApiRuntime.sha256 },
            { label: "gameApiRuntimeTree", value: gameApiRuntimeTree.sha256 },
            { label: "runtimeDependencyTree", value: runtimeDependencyTree.sha256 },
            ...compiledRuntime.map((record) => ({
                label: `compiledRuntime:${path.basename(record.path)}`,
                value: record.sha256,
            })),
            { label: "mixTree", value: mixTree.sha256 },
        ],
        "manifest.inputs.runtimeBundle",
    );
    const expectedRuntimeHashes: WorkerRuntimeHashes = {
        packageLockSha256: packageLock.sha256,
        nodeRuntimeSha256: nodeRuntime.sha256,
        pythonRuntimeSha256: pythonRuntime.sha256,
        scontrolRuntimeSha256: scontrolRuntime.sha256,
        gameApiPackageSha256: gameApiPackage.sha256,
        gameApiRuntimeSha256: gameApiRuntime.sha256,
        gameApiRuntimeTreeSha256: gameApiRuntimeTree.sha256,
        runtimeDependencyTreeSha256: runtimeDependencyTree.sha256,
        mixTreeSha256: mixTree.sha256,
        compiledProbeSha256: compiledRuntime[0].sha256,
        compiledProtocolSha256: compiledRuntime[1].sha256,
        compiledMapLoadAttestationSha256: compiledRuntime[2].sha256,
        compiledSeededGameSha256: compiledRuntime[3].sha256,
        sourceBundleSha256,
        runtimeBundleSha256,
    };
    const runtimeHashes = assertWorkerExactKeys(manifest.runtimeHashes, RUNTIME_HASH_KEYS, "manifest.runtimeHashes");
    for (const key of RUNTIME_HASH_KEYS) {
        requireWorkerHash(runtimeHashes[key], `manifest.runtimeHashes.${key}`);
    }
    if (canonicalJsonSha256(runtimeHashes) !== canonicalJsonSha256(expectedRuntimeHashes)) {
        throw new Error("manifest.runtimeHashes does not match exact inputs");
    }
    return value as WorkerManifest;
};

const readWorkerJson = (filePath: string, label: string): { bytes: Buffer; sha256: string; value: unknown } => {
    const resolved = path.resolve(filePath);
    const stat = fs.lstatSync(resolved);
    if (!stat.isFile() || stat.isSymbolicLink()) {
        throw new Error(`${label} must be a regular non-symlink file`);
    }
    const bytes = fs.readFileSync(resolved);
    return {
        bytes,
        sha256: createHash("sha256").update(bytes).digest("hex"),
        value: JSON.parse(bytes.toString("utf8")) as unknown,
    };
};

const assertWorkerRuntimeHashes = (
    value: unknown,
    label: string,
    expected: WorkerRuntimeHashes,
): WorkerRuntimeHashes => {
    const hashes = assertWorkerExactKeys(value, RUNTIME_HASH_KEYS, label);
    for (const key of RUNTIME_HASH_KEYS) requireWorkerHash(hashes[key], `${label}.${key}`);
    if (canonicalJsonSha256(hashes) !== canonicalJsonSha256(expected)) {
        throw new Error(`${label} does not match the manifest runtime hashes`);
    }
    return value as WorkerRuntimeHashes;
};

const assertWorkerPreAttestation = (
    value: unknown,
    manifest: WorkerManifest,
    manifestPath: string,
    manifestBytes: Buffer,
    manifestSha256: string,
    scheduler: SchedulerDescriptor,
): WorkerPreAttestation => {
    const attestation = assertWorkerExactKeys(
        value,
        [
            "schemaVersion",
            "gate",
            "artifactKind",
            "outcomeFree",
            "phase",
            "manifest",
            "scheduler",
            "runtimeHashes",
            "bindings",
            "preAttestation",
            "checkpointLedger",
        ],
        "pre-attestation",
    );
    if (
        attestation.schemaVersion !== 1 ||
        attestation.gate !== MAP_FIDELITY_GATE ||
        attestation.artifactKind !== "map_fidelity_job_attestation" ||
        attestation.outcomeFree !== true ||
        attestation.phase !== "pre_workers" ||
        attestation.preAttestation !== null ||
        attestation.checkpointLedger !== null
    ) {
        throw new Error("Pre-attestation identity or phase markers are invalid");
    }
    assertWorkerScheduler(attestation.scheduler, "pre-attestation.scheduler", scheduler);
    const manifestBinding = assertWorkerFileDescriptor(attestation.manifest, "pre-attestation.manifest");
    if (
        path.resolve(manifestBinding.path) !== path.resolve(manifestPath) ||
        manifestBinding.bytes !== manifestBytes.byteLength ||
        manifestBinding.sha256 !== manifestSha256
    ) {
        throw new Error("Pre-attestation does not bind the exact manifest");
    }
    assertWorkerRuntimeHashes(
        attestation.runtimeHashes,
        "pre-attestation.runtimeHashes",
        manifest.runtimeHashes,
    );
    const bindings = assertWorkerExactKeys(
        attestation.bindings,
        [
            "sourceCommit",
            "targetPopulationCommitmentSha256",
            "familySequenceSha256",
            "sourceBundleSha256",
            "runtimeBundleSha256",
        ],
        "pre-attestation.bindings",
    );
    if (
        bindings.sourceCommit !== manifest.inputs.git.commit ||
        bindings.targetPopulationCommitmentSha256 !== manifest.inputs.targetPopulationCommitmentSha256 ||
        bindings.familySequenceSha256 !== manifest.inputs.familySequenceSha256 ||
        bindings.sourceBundleSha256 !== manifest.runtimeHashes.sourceBundleSha256 ||
        bindings.runtimeBundleSha256 !== manifest.runtimeHashes.runtimeBundleSha256
    ) {
        throw new Error("Pre-attestation bindings do not match the manifest");
    }
    return value as WorkerPreAttestation;
};

const assertWorkerFileBinding = (
    value: unknown,
    label: string,
    expectedPath: string,
    expectedSha256: string,
): void => {
    const binding = assertWorkerExactKeys(value, ["path", "sha256"], label);
    if (
        path.resolve(requireWorkerString(binding.path, `${label}.path`)) !== path.resolve(expectedPath) ||
        requireWorkerHash(binding.sha256, `${label}.sha256`) !== expectedSha256
    ) {
        throw new Error(`${label} does not bind the expected file`);
    }
};

const expectedWorkerFamilyBinding = (
    family: WorkerManifestFamily,
    manifestOrdinal: number,
): FamilyBinding => ({
    manifestOrdinal,
    familyIndex: family.index,
    familyIdSha256: createHash("sha256").update(family.familyId, "utf8").digest("hex"),
    familyEntrySha256: canonicalJsonSha256(family),
});

const assertWorkerFamilyBinding = (
    value: unknown,
    label: string,
    expected: FamilyBinding,
): FamilyBinding => {
    const binding = assertWorkerExactKeys(
        value,
        ["manifestOrdinal", "familyIndex", "familyIdSha256", "familyEntrySha256"],
        label,
    );
    requireWorkerInteger(binding.manifestOrdinal, `${label}.manifestOrdinal`);
    requireWorkerInteger(binding.familyIndex, `${label}.familyIndex`);
    requireWorkerHash(binding.familyIdSha256, `${label}.familyIdSha256`);
    requireWorkerHash(binding.familyEntrySha256, `${label}.familyEntrySha256`);
    if (canonicalJsonSha256(binding) !== canonicalJsonSha256(expected)) {
        throw new Error(`${label} does not match the selected manifest family`);
    }
    return value as FamilyBinding;
};

const currentWorkerEnvironment = (): Record<string, string> => {
    const values: Record<string, string> = {};
    for (const key of WORKER_ENVIRONMENT_KEYS) {
        if (process.env[key] !== undefined) values[key] = process.env[key] as string;
    }
    return values;
};

const assertWorkerIntent = (
    value: unknown,
    manifestPath: string,
    manifestSha256: string,
    attestationPath: string,
    attestationSha256: string,
    outputPath: string,
    expectedFamily: FamilyBinding,
    scheduler: SchedulerDescriptor,
): WorkerIntent => {
    const intent = assertWorkerExactKeys(
        value,
        [
            "schemaVersion",
            "gate",
            "artifactKind",
            "outcomeFree",
            "manifest",
            "attestation",
            "family",
            "attemptNumber",
            "executionPolicy",
            "scheduler",
            "environment",
            "worker",
        ],
        "attempt intent",
    );
    if (
        intent.schemaVersion !== 1 ||
        intent.gate !== MAP_FIDELITY_GATE ||
        intent.artifactKind !== "map_fidelity_family_attempt_intent" ||
        intent.outcomeFree !== true
    ) {
        throw new Error("Attempt intent identity markers are invalid");
    }
    assertWorkerFileBinding(intent.manifest, "attempt intent.manifest", manifestPath, manifestSha256);
    assertWorkerFileBinding(
        intent.attestation,
        "attempt intent.attestation",
        attestationPath,
        attestationSha256,
    );
    assertWorkerFamilyBinding(intent.family, "attempt intent.family", expectedFamily);
    const attemptNumber = requireWorkerInteger(intent.attemptNumber, "attempt intent.attemptNumber");
    if (attemptNumber !== 1 && attemptNumber !== 2) throw new Error("Attempt number must be one or two");
    assertWorkerScheduler(intent.scheduler, "attempt intent.scheduler", scheduler);
    const policy = assertWorkerExactKeys(
        intent.executionPolicy,
        ["timeoutSeconds", "terminationGraceSeconds", "maxTechnicalAttempts", "maxStreamBytes"],
        "attempt intent.executionPolicy",
    );
    for (const key of ["timeoutSeconds", "terminationGraceSeconds"]) {
        if (
            typeof policy[key] !== "number" ||
            !Number.isFinite(policy[key] as number) ||
            (policy[key] as number) <= 0
        ) {
            throw new Error(`attempt intent.executionPolicy.${key} must be positive`);
        }
    }
    if (policy.maxTechnicalAttempts !== 1 && policy.maxTechnicalAttempts !== 2) {
        throw new Error("attempt intent.executionPolicy.maxTechnicalAttempts is invalid");
    }
    if (requireWorkerInteger(policy.maxStreamBytes, "attempt intent.executionPolicy.maxStreamBytes") <= 0) {
        throw new Error("attempt intent.executionPolicy.maxStreamBytes must be positive");
    }
    const environment = assertWorkerExactKeys(
        intent.environment,
        ["allowedKeys", "values", "sha256"],
        "attempt intent.environment",
    );
    if (JSON.stringify(environment.allowedKeys) !== JSON.stringify(WORKER_ENVIRONMENT_KEYS)) {
        throw new Error("Attempt intent environment allowlist is invalid");
    }
    const environmentValues = assertWorkerRecord(environment.values, "attempt intent.environment.values");
    for (const [key, entry] of Object.entries(environmentValues)) {
        if (!(WORKER_ENVIRONMENT_KEYS as readonly string[]).includes(key) || typeof entry !== "string") {
            throw new Error("Attempt intent environment contains a non-allowlisted value");
        }
    }
    if (
        canonicalJsonSha256(environmentValues) !==
            requireWorkerHash(environment.sha256, "attempt intent.environment.sha256") ||
        canonicalJsonSha256(environmentValues) !== canonicalJsonSha256(currentWorkerEnvironment())
    ) {
        throw new Error("Attempt intent environment binding is invalid");
    }
    const worker = assertWorkerExactKeys(
        intent.worker,
        [
            "argumentProtocol",
            "commandPrefixSha256",
            "commandSha256",
            "executable",
            "shardPath",
        ],
        "attempt intent.worker",
    );
    if (
        worker.argumentProtocol !== "map-fidelity-family-worker-v1" ||
        path.resolve(requireWorkerString(worker.shardPath, "attempt intent.worker.shardPath")) !==
            path.resolve(outputPath)
    ) {
        throw new Error("Attempt intent worker argument/output binding is invalid");
    }
    requireWorkerHash(worker.commandPrefixSha256, "attempt intent.worker.commandPrefixSha256");
    requireWorkerHash(worker.commandSha256, "attempt intent.worker.commandSha256");
    if (worker.executable !== null) {
        assertWorkerFileDescriptor(worker.executable, "attempt intent.worker.executable");
    }
    return value as WorkerIntent;
};

const requireFamilyOrdinalArg = (): number => {
    const raw = requireStringArg("--family-ordinal");
    if (!/^(?:0|[1-9][0-9]*)$/.test(raw)) throw new Error("--family-ordinal must be a nonnegative integer");
    return requireWorkerInteger(Number(raw), "--family-ordinal");
};

const assertPrivateWorkerDirectory = (directoryPath: string, label: string): string => {
    const resolved = path.resolve(directoryPath);
    const stat = fs.lstatSync(resolved);
    if (!stat.isDirectory() || stat.isSymbolicLink() || (stat.mode & 0o077) !== 0) {
        throw new Error(`${label} must be a private 0700 directory`);
    }
    return fs.realpathSync(resolved);
};

/**
 * A map-mode preparation failure is a genuine compatibility outcome only when
 * the fixed phase read contract is complete. Repeating the same engine
 * preparation supplies the second independent parse attempt without padding
 * provenance with direct filesystem reads.
 */
export const completeAttestedMapSettingsReadPair = async <T>(
    prepare: () => T | Promise<T>,
): Promise<T> => {
    try {
        return await prepare();
    } catch (firstError) {
        if (firstError instanceof MapLoadAttestationError) throw firstError;
        try {
            await prepare();
        } catch (secondError) {
            if (secondError instanceof MapLoadAttestationError) throw secondError;
        }
        throw firstError;
    }
};

const fsyncWorkerDirectory = (directoryPath: string): void => {
    const descriptor = fs.openSync(directoryPath, fs.constants.O_RDONLY);
    try {
        fs.fsyncSync(descriptor);
    } finally {
        fs.closeSync(descriptor);
    }
};

const runWorkerOrder = async (
    family: WorkerManifestFamily,
    mapAlias: string,
    seed: number,
    targetTick: number,
    country: string,
    order: FamilyWorkerProbeRun["order"],
): Promise<WorkerOrderResult> => {
    const startedAt = Date.now();
    const alpha = new PassiveFidelityProbe(`FidelityAlpha_${family.index}`, country);
    const beta = new PassiveFidelityProbe(`FidelityBeta_${family.index}`, country);
    const participants = { alpha, beta };
    let initialTick: number | null = null;
    let finalTick: number | null = null;
    let updates = 0;

    const captured = await captureConsoleWarnings(`${family.familyId}:${order.join("-")}`, async () => {
        const agents = order.map((identity) => participants[identity]);
        const settings = await completeAttestedMapSettingsReadPair(() =>
            buildSettings(mapAlias, agents),
        );
        await withSeededOfflineGame(
            cdapi,
            settings,
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
                        throw new Error("Engine tick failed to advance for the fixed stagnant-update budget");
                    }
                }
                if ((finalTick as number) < targetTick) {
                    throw new Error("Engine did not reach the fixed compatibility target tick");
                }
            },
        );
    });
    if (captured.error instanceof MapLoadAttestationError) {
        throw captured.error;
    }

    const loaded = initialTick !== null && finalTick !== null;
    const record: FamilyWorkerProbeRun = {
        order,
        loaded,
        initialTick,
        finalTick,
        updates,
        initialTickIsZero: initialTick === 0,
        tickUpdateArithmeticConsistent:
            initialTick !== null && finalTick !== null && (finalTick as number) - (initialTick as number) === updates,
        progressedBeyondTickOne: finalTick !== null && (finalTick as number) > 1,
        reachedTargetTick: finalTick !== null && (finalTick as number) >= targetTick,
        starts: {
            alpha: alpha.startLocation,
            beta: beta.startLocation,
        },
        wallTimeMs: Math.max(0, Date.now() - startedAt),
        warningCaptureTruncated: captured.truncated,
        error: captured.error === null ? null : serializeCapturedError(captured.error),
    };
    return { record, warnings: captured.warnings };
};

const runAttestedWorkerFamily = async (
    family: WorkerManifestFamily,
    manifest: WorkerManifest,
    materialized: ReturnType<typeof materializeMapAlias>,
): Promise<{
    initialization: FamilyWorkerInitialization;
    familyResult: FamilyWorkerResult;
    mapLoadAttestation: Awaited<ReturnType<typeof withMapLoadAttestation>>["evidence"];
}> => {
    const seed = deriveEngineSeed(manifest.protocol.engineSeedBase, family.index);
    setWorkerTechnicalStage("engine_attestation_enter");
    const attested = await withMapLoadAttestation({
        materialized,
        operation: async (session) => {
            const initialization: WorkerPhaseResult<boolean> = await session.runPhase(
                "initialization",
                async () => {
                    setWorkerTechnicalStage("engine_initialize");
                    const engineInitialization = await captureConsoleWarnings(
                        `${family.familyId}:engine-initialize`,
                        async () => {
                            await cdapi.init(manifest.inputs.mixDir);
                            return true;
                        },
                    );
                    if (engineInitialization.error !== null) throw engineInitialization.error;
                    setWorkerTechnicalStage("engine_map_initialize");
                    const captured = await captureConsoleWarnings(`${family.familyId}:initialization`, async () => {
                        const alpha = new PassiveFidelityProbe(`FidelityInitAlpha_${family.index}`, manifest.protocol.participantCountry);
                        const beta = new PassiveFidelityProbe(`FidelityInitBeta_${family.index}`, manifest.protocol.participantCountry);
                        buildSettings(materialized.alias, [alpha, beta]);
                        return true;
                    });
                    if (captured.error instanceof MapLoadAttestationError) {
                        throw captured.error;
                    }
                    return {
                        value: captured.value,
                        error: captured.error,
                        warnings: [...engineInitialization.warnings, ...captured.warnings],
                        truncated: engineInitialization.truncated || captured.truncated,
                    };
                },
            );
            setWorkerTechnicalStage("engine_forward");
            const forward = await session.runPhase("forward_create", async () =>
                runWorkerOrder(
                    family,
                    materialized.alias,
                    seed,
                    manifest.protocol.targetTick,
                    manifest.protocol.participantCountry,
                    ["alpha", "beta"],
                ),
            );
            setWorkerTechnicalStage("engine_reverse");
            const reverse = await session.runPhase("reverse_create", async () =>
                runWorkerOrder(
                    family,
                    materialized.alias,
                    seed,
                    manifest.protocol.targetTick,
                    manifest.protocol.participantCountry,
                    ["beta", "alpha"],
                ),
            );
            setWorkerTechnicalStage("engine_attestation_finalize");
            return { initialization, forward, reverse };
        },
    });

    setWorkerTechnicalStage("engine_result_finalize");
    const { initialization: initializationCapture, forward, reverse } = attested.value;
    const initialization: FamilyWorkerInitialization = {
        succeeded: initializationCapture.error === null,
        warnings: initializationCapture.warnings.map(serializeCapturedWarning),
        warningCaptureTruncated: initializationCapture.truncated,
        error:
            initializationCapture.error === null
                ? null
                : serializeCapturedError(initializationCapture.error),
    };
    const reciprocal = validateReciprocalStarts(
        forward.record.starts,
        reverse.record.starts,
        family.declaredStartLocations.map(({ x, y }) => ({ x, y })),
    );
    const reciprocalStartCheck = {
        ...reciprocal,
        failures: [...new Set(reciprocal.failures)].sort(),
    };
    const allWarnings = [
        ...initializationCapture.warnings,
        ...forward.warnings,
        ...reverse.warnings,
    ];
    const failureCategories = [...family.staticChecks.failures];
    const reviewCategories: string[] = [];
    if (initialization.error) failureCategories.push(`initialization_${initialization.error.category}`);
    if (initialization.warningCaptureTruncated) {
        failureCategories.push("initialization_warning_capture_truncated");
    }
    for (const [label, probe] of [
        ["forward", forward.record],
        ["reverse", reverse.record],
    ] as const) {
        if (probe.error) failureCategories.push(`${label}_${probe.error.category}`);
        if (!probe.loaded) failureCategories.push(`${label}_load_failed`);
        if (!probe.initialTickIsZero) failureCategories.push(`${label}_initial_tick_not_zero`);
        if (!probe.tickUpdateArithmeticConsistent) {
            failureCategories.push(`${label}_tick_update_arithmetic_mismatch`);
        }
        if (!probe.progressedBeyondTickOne) failureCategories.push(`${label}_no_progress_beyond_tick_1`);
        if (!probe.reachedTargetTick) failureCategories.push(`${label}_target_tick_not_reached`);
        if (probe.warningCaptureTruncated) failureCategories.push(`${label}_warning_capture_truncated`);
    }
    failureCategories.push(...reciprocalStartCheck.failures);
    for (const warning of allWarnings) {
        if (warning.severity === "fail") failureCategories.push(`warning_${warning.category}`);
        else reviewCategories.push(`warning_${warning.category}`);
    }
    const uniqueFailures = [...new Set(failureCategories)].sort();
    const uniqueReviews = [...new Set(reviewCategories)].sort();
    const familyResult: FamilyWorkerResult = {
        familyIndex: family.index,
        familyId: family.familyId,
        representativeMapPath: family.representativeMapPath,
        mapName: family.mapName,
        executedMapAlias: materialized.alias,
        mapBytes: materialized.bytes,
        mapSha256: materialized.sha256,
        slurmJobId: manifest.scheduler.jobId,
        requestedEngineSeed: seed,
        targetTick: manifest.protocol.targetTick,
        declaredStartLocations: family.declaredStartLocations,
        forward: forward.record,
        reverse: reverse.record,
        reciprocalStartCheck,
        warnings: allWarnings.map(serializeCapturedWarning),
        failureCategories: uniqueFailures,
        reviewCategories: uniqueReviews,
        fidelityStatus: uniqueFailures.length > 0 ? "fail" : uniqueReviews.length > 0 ? "review" : "pass",
    };
    return {
        initialization,
        familyResult,
        mapLoadAttestation: attested.evidence,
    };
};

export const writeExclusiveWorkerJson = (outputPath: string, value: unknown): void => {
    const resolved = path.resolve(outputPath);
    const parent = assertPrivateWorkerDirectory(path.dirname(resolved), "Worker output parent");
    if (path.dirname(resolved) !== parent) throw new Error("Worker output parent must already be canonical");
    if (fs.existsSync(resolved)) throw new Error(`Refusing to overwrite ${resolved}`);
    const temporaryPath = path.join(parent, `.${path.basename(resolved)}.tmp-${process.pid}-${Date.now()}`);
    let temporaryExists = false;
    let outputExists = false;
    try {
        const descriptor = fs.openSync(
            temporaryPath,
            fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_WRONLY,
            0o600,
        );
        temporaryExists = true;
        try {
            fs.writeFileSync(descriptor, `${JSON.stringify(value, null, 2)}\n`, "utf8");
            fs.fchmodSync(descriptor, 0o600);
            fs.fsyncSync(descriptor);
        } finally {
            fs.closeSync(descriptor);
        }
        fs.linkSync(temporaryPath, resolved);
        outputExists = true;
        fs.unlinkSync(temporaryPath);
        temporaryExists = false;
        fsyncWorkerDirectory(parent);
        const outputStat = fs.lstatSync(resolved);
        if (!outputStat.isFile() || outputStat.isSymbolicLink() || (outputStat.mode & 0o777) !== 0o600) {
            throw new Error("Published family shard is not a private regular file");
        }
    } catch (error) {
        if (outputExists) {
            try {
                fs.unlinkSync(resolved);
                fsyncWorkerDirectory(parent);
            } catch {
                // The supervisor will classify the nonzero worker as technically incomplete.
            }
        }
        if (temporaryExists) {
            try {
                fs.unlinkSync(temporaryPath);
            } catch {
                // The private attempt directory remains fail-closed.
            }
        }
        throw error;
    }
};

const assertCurrentFamilyInputs = (manifest: WorkerManifest, family: WorkerManifestFamily): string => {
    const sourcePath = path.resolve(manifest.inputs.repoRoot, family.representativeMapPath);
    const relative = path.relative(manifest.inputs.repoRoot, sourcePath).split(path.sep).join("/");
    if (relative !== family.representativeMapPath) {
        throw new Error("Selected representative escaped or changed its repository-relative path");
    }
    const sourceDescriptor: ExactFileDescriptor = {
        path: sourcePath,
        bytes: family.bytes,
        sha256: family.sha256,
    };
    assertWorkerFileDescriptor(sourceDescriptor, "selected representative");
    return sourcePath;
};

export const removeEmptyWorkerSandbox = (
    sandboxDirectory: string,
    outputParent: string,
): boolean => {
    const resolvedParent = assertPrivateWorkerDirectory(outputParent, "Worker output parent");
    const resolvedSandbox = path.resolve(sandboxDirectory);
    if (path.dirname(resolvedSandbox) !== resolvedParent || !fs.existsSync(resolvedSandbox)) {
        return false;
    }
    const descriptor = fs.lstatSync(resolvedSandbox);
    if (
        !descriptor.isDirectory() ||
        descriptor.isSymbolicLink() ||
        (descriptor.mode & 0o777) !== 0o700 ||
        fs.readdirSync(resolvedSandbox).length !== 0
    ) {
        return false;
    }
    fs.rmdirSync(resolvedSandbox);
    fsyncWorkerDirectory(resolvedParent);
    return !fs.existsSync(resolvedSandbox);
};

export const manifestValidationOnlyMain = async (): Promise<void> => {
    setWorkerTechnicalStage("parse_arguments");
    const argumentsAfterEntry = process.argv.slice(2);
    if (
        argumentsAfterEntry.length !== 3 ||
        argumentsAfterEntry[0] !== "--validate-manifest-only" ||
        argumentsAfterEntry[1] !== "--manifest"
    ) {
        throw new Error(
            "Manifest-only validation requires exactly --validate-manifest-only --manifest <path>",
        );
    }
    const manifestPath = path.resolve(argumentsAfterEntry[2]);
    setWorkerTechnicalStage("scheduler_validate");
    const scheduler = getAuthoritativeScheduler();
    setWorkerTechnicalStage("manifest_read");
    const manifestArtifact = readWorkerJson(manifestPath, "Manifest");
    setWorkerTechnicalStage("manifest_validate");
    assertWorkerManifest(manifestArtifact.value, scheduler);
};

export const familyWorkerMain = async (): Promise<void> => {
    setWorkerTechnicalStage("parse_arguments");
    const manifestPath = path.resolve(requireStringArg("--manifest"));
    const attestationPath = path.resolve(requireStringArg("--attestation"));
    const intentPath = path.resolve(requireStringArg("--intent"));
    const outputPath = path.resolve(requireStringArg("--output"));
    const familyOrdinal = requireFamilyOrdinalArg();
    setWorkerTechnicalStage("scheduler_validate");
    const scheduler = getAuthoritativeScheduler();

    setWorkerTechnicalStage("manifest_read");
    const manifestArtifact = readWorkerJson(manifestPath, "Manifest");
    setWorkerTechnicalStage("manifest_validate");
    const manifest = assertWorkerManifest(manifestArtifact.value, scheduler);
    setWorkerTechnicalStage("family_select");
    if (familyOrdinal >= manifest.families.length) throw new Error("--family-ordinal is outside the manifest");
    const family = manifest.families[familyOrdinal];
    const familyBinding = expectedWorkerFamilyBinding(family, familyOrdinal);
    setWorkerTechnicalStage("pre_attestation_read");
    const attestationArtifact = readWorkerJson(attestationPath, "Pre-attestation");
    setWorkerTechnicalStage("pre_attestation_validate");
    assertWorkerPreAttestation(
        attestationArtifact.value,
        manifest,
        manifestPath,
        manifestArtifact.bytes,
        manifestArtifact.sha256,
        scheduler,
    );
    setWorkerTechnicalStage("intent_read");
    const intentArtifact = readWorkerJson(intentPath, "Attempt intent");
    setWorkerTechnicalStage("intent_validate");
    const intent = assertWorkerIntent(
        intentArtifact.value,
        manifestPath,
        manifestArtifact.sha256,
        attestationPath,
        attestationArtifact.sha256,
        outputPath,
        familyBinding,
        scheduler,
    );
    setWorkerTechnicalStage("output_parent_validate");
    const outputParent = assertPrivateWorkerDirectory(path.dirname(outputPath), "Worker output parent");
    const sandboxDirectory = path.join(outputParent, "map-sandbox");
    setWorkerTechnicalStage("source_validate");
    const sourcePath = assertCurrentFamilyInputs(manifest, family);
    let materialized: ReturnType<typeof materializeMapAlias>;
    setWorkerTechnicalStage("sandbox_create");
    try {
        if (fs.existsSync(sandboxDirectory)) {
            throw new Error("Attempt-local map sandbox already exists");
        }
        fs.mkdirSync(sandboxDirectory, { mode: 0o700 });
        fs.chmodSync(sandboxDirectory, 0o700);
        fsyncWorkerDirectory(outputParent);
        assertPrivateWorkerDirectory(sandboxDirectory, "Attempt-local map sandbox");
        setWorkerTechnicalStage("alias_materialize");
        materialized = materializeMapAlias({
            familyIndex: family.index,
            expectedSha256: family.sha256,
            expectedBytes: family.bytes,
            sourcePath,
            mixDirectory: manifest.inputs.mixDir,
            sandboxDirectory,
        });
    } catch (error) {
        try {
            removeEmptyWorkerSandbox(sandboxDirectory, outputParent);
        } catch {
            // A nonempty or drifted private sandbox remains visible to the evidence gate.
        }
        throw error;
    }
    const payload = await (async () => {
        let engineFailure: unknown | null = null;
        try {
            return await runAttestedWorkerFamily(family, manifest, materialized);
        } catch (error) {
            engineFailure = error;
            throw error;
        } finally {
            if (engineFailure === null) setWorkerTechnicalStage("alias_cleanup");
            try {
                removeMaterializedMapAlias(materialized);
            } catch (cleanupError) {
                setWorkerTechnicalStage("alias_cleanup");
                throw cleanupError;
            }
        }
    })();
    const workerScheduler: FamilyWorkerScheduler = {
        jobId: scheduler.jobId,
        account: "pi_jss233",
        partition: scheduler.partition,
        qos: scheduler.qos,
        source: "scontrol",
    };
    const shard: FamilyWorkerShard = {
        schemaVersion: 1,
        gate: MAP_FIDELITY_GATE,
        artifactKind: "map_fidelity_family_worker_shard",
        outcomeFree: true,
        manifestSha256: manifestArtifact.sha256,
        attestationSha256: attestationArtifact.sha256,
        family: familyBinding,
        attemptNumber: intent.attemptNumber,
        intentSha256: intentArtifact.sha256,
        scheduler: workerScheduler,
        payload: {
            engineInitialization: payload.initialization,
            familyResult: payload.familyResult,
            mapLoadAttestation: payload.mapLoadAttestation,
        },
    };
    setWorkerTechnicalStage("shard_validate");
    assertStrictFamilyWorkerShard(shard);
    setWorkerTechnicalStage("shard_write");
    writeExclusiveWorkerJson(outputPath, shard);
};

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
    const selectedMain =
        process.argv[2] === "--validate-manifest-only"
            ? manifestValidationOnlyMain
            : familyWorkerMain;
    selectedMain().catch((error: unknown) => {
        // Only canonical stage metadata and hashes cross stderr; raw diagnostic
        // text, roles, paths, stacks, and outcomes are never emitted.
        try {
            const diagnostic = buildWorkerTechnicalDiagnostic(currentWorkerTechnicalStage, error);
            process.stderr.write(`${canonicalJson(diagnostic)}\n`);
        } catch {
            // Exit status remains fail-closed even if diagnostic serialization fails.
        }
        process.exitCode = 2;
    });
}
