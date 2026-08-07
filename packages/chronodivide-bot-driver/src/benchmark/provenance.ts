import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
    OFFLINE_SEED_CONTROL_METHOD,
    OfflineSeedCompatibility,
    validateOfflineSeedCompatibility,
} from "./seededOfflineGame.js";

export type BaselineDescriptor = {
    kind: "local-shared-package" | "external-package";
    packageRoot: string;
};

export type RuntimeTreeDescriptor = {
    root: string;
    exists: boolean;
    files: number;
    bytes: number;
    sha256: string | null;
};

export type ExperimentManifest = {
    schemaVersion: 3;
    createdAt: string;
    runId: string;
    command: string[];
    cwd: string;
    host: {
        hostname: string;
        platform: string;
        arch: string;
    };
    scheduler: {
        jobId: string | null;
        arrayJobId: string | null;
        arrayTaskId: string | null;
        account: string | null;
        partition: string | null;
        qos: string | null;
        source: "scontrol" | "environment" | "none";
        environmentAccount: string | null;
        environmentPartition: string | null;
    };
    source: {
        repoRoot: string;
        gitCommit: string | null;
        gitBranch: string | null;
        trackedDirty: boolean | null;
        trackedStatus: string[];
        trackedDiffSha256: string | null;
        trackedDiffBytes: number | null;
        runtimeTrees: RuntimeTreeDescriptor[];
    };
    software: {
        node: string;
        packageLockSha256: string | null;
        projectVersion: string | null;
        gameApiVersion: string | null;
        gameApiRuntimeTree: RuntimeTreeDescriptor;
        baseline: {
            kind: BaselineDescriptor["kind"];
            packageRoot: string;
            packageVersion: string | null;
            gitCommit: string | null;
            trackedDirty: boolean | null;
            runtimeTree: RuntimeTreeDescriptor;
        };
    };
    inputs: {
        mixDir: string;
        maps: Array<{
            name: string;
            resolvedPath: string;
            exists: boolean;
            bytes: number | null;
            sha256: string | null;
        }>;
        effectiveConfig: unknown;
        capturedEnvironment: Record<string, string>;
    };
    randomness: {
        engineSeedControl: typeof OFFLINE_SEED_CONTROL_METHOD;
        requestedEngineSeedRecordedPerMatch: true;
        botRandomSeedRecordedPerMatch: true;
        participantBotRandomSeedsRecordedPerMatch: true;
        engineSeedBase: number;
        engineSeedDerivation: string;
        engineSeedToEpochMapping: string;
        botRandomSeedDerivation: string;
        compatibility: Omit<OfflineSeedCompatibility, "runtimePath">;
        note: string;
    };
};

const EXACT_ENV_KEYS = new Set([
    "BASELINE_PACKAGE_ROOT",
    "REQUIRE_EXTERNAL_BASELINE",
    "MIX_DIR",
    "OUT_DIR",
    "RUN_ID",
    "MAPS",
    "CANDIDATE_COUNTRIES",
    "BASELINE_COUNTRIES",
    "CANDIDATE_SLOTS",
    "CANDIDATE_STARTS",
    "BASELINE_STARTS",
    "MATCHES_PER_PAIR",
    "MAX_TICKS",
    "MATCH_START_OFFSET",
    "SEED_BLOCK_START_OFFSET",
    "GAME_SEED_BASE",
    "START_FILTER_MAX_ATTEMPTS",
    "TRACE_INTERVAL_TICKS",
    "DEFAULT_MAP_PROFILES_ENABLED",
    "EXACT_MAP_TACTICS_ENABLED",
    "SUPERWEAPONS",
]);

const CAPTURED_PREFIXES = [
    "ALL_IN_",
    "ATTACK_",
    "EMERGENCY_DEFENSE_",
    "FORCE_ATTACK_",
    "HARASS_",
    "HARVESTER_HARASS_",
    "HFO_",
    "MACRO_BOOST_",
    "ROUTE_ATTACK_",
    "STATIC_DEFENSE_",
    "STRATEGIC_",
    "TRAIN_",
];

const sha256File = (filePath: string): string => {
    const hash = createHash("sha256");
    hash.update(fs.readFileSync(filePath));
    return hash.digest("hex");
};

const sha256Text = (value: string): string => createHash("sha256").update(value).digest("hex");

const hashRuntimeTree = (rootPath: string): RuntimeTreeDescriptor => {
    const root = path.resolve(rootPath);
    if (!fs.existsSync(root)) {
        return { root, exists: false, files: 0, bytes: 0, sha256: null };
    }
    const entries: Array<{
        relativePath: string;
        absolutePath: string;
        bytes: number;
        symlinkTarget: string | null;
    }> = [];
    const visit = (directory: string): void => {
        for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
            const absolutePath = path.join(directory, entry.name);
            const relativePath = path.relative(root, absolutePath);
            if (entry.isDirectory()) {
                visit(absolutePath);
            } else if (entry.isFile()) {
                entries.push({
                    relativePath,
                    absolutePath,
                    bytes: fs.statSync(absolutePath).size,
                    symlinkTarget: null,
                });
            } else if (entry.isSymbolicLink()) {
                const target = fs.readlinkSync(absolutePath);
                entries.push({
                    relativePath,
                    absolutePath,
                    bytes: Buffer.byteLength(target),
                    symlinkTarget: target,
                });
            }
        }
    };
    visit(root);
    entries.sort((left, right) => left.relativePath.localeCompare(right.relativePath));
    const hash = createHash("sha256");
    for (const entry of entries) {
        hash.update(entry.relativePath);
        hash.update("\0");
        hash.update(entry.symlinkTarget ?? fs.readFileSync(entry.absolutePath));
        hash.update("\0");
    }
    return {
        root,
        exists: true,
        files: entries.length,
        bytes: entries.reduce((total, entry) => total + entry.bytes, 0),
        sha256: hash.digest("hex"),
    };
};

const safeExec = (cwd: string, args: string[]): string | null => {
    try {
        return execFileSync("git", args, {
            cwd,
            encoding: "utf8",
            stdio: ["ignore", "pipe", "ignore"],
        }).trim();
    } catch {
        return null;
    }
};

const readJson = (filePath: string): Record<string, unknown> | null => {
    try {
        return JSON.parse(fs.readFileSync(filePath, "utf8")) as Record<string, unknown>;
    } catch {
        return null;
    }
};

const packageVersion = (packageRoot: string): string | null => {
    const value = readJson(path.join(packageRoot, "package.json"))?.version;
    return typeof value === "string" ? value : null;
};

const resolveGitRoot = (startPath: string): string =>
    safeExec(startPath, ["rev-parse", "--show-toplevel"]) ?? startPath;

const getGitState = (startPath: string) => {
    const repoRoot = resolveGitRoot(startPath);
    const trackedStatusRaw = safeExec(repoRoot, ["status", "--porcelain=v1", "--untracked-files=no"]);
    const trackedStatus = trackedStatusRaw ? trackedStatusRaw.split(/\r?\n/).filter(Boolean) : [];
    const trackedDiff = safeExec(repoRoot, ["diff", "--binary", "--no-ext-diff", "HEAD"]);
    return {
        repoRoot,
        gitCommit: safeExec(repoRoot, ["rev-parse", "HEAD"]),
        gitBranch: safeExec(repoRoot, ["branch", "--show-current"]),
        trackedDirty: trackedStatusRaw === null ? null : trackedStatus.length > 0,
        trackedStatus,
        trackedDiffSha256: trackedDiff === null ? null : sha256Text(trackedDiff),
        trackedDiffBytes: trackedDiff === null ? null : Buffer.byteLength(trackedDiff),
    };
};

export const parseScontrolJobLine = (
    value: string,
): {
    account: string | null;
    partition: string | null;
    qos: string | null;
} => {
    const field = (name: string): string | null => new RegExp(`(?:^|\\s)${name}=([^\\s]+)`).exec(value)?.[1] ?? null;
    return {
        account: field("Account"),
        partition: field("Partition"),
        qos: field("QOS"),
    };
};

const getSchedulerDescriptor = (): ExperimentManifest["scheduler"] => {
    const jobId = process.env.SLURM_JOB_ID ?? null;
    const environmentAccount = process.env.SLURM_JOB_ACCOUNT ?? null;
    const environmentPartition = process.env.SLURM_JOB_PARTITION ?? null;
    if (jobId !== null) {
        try {
            const output = execFileSync("scontrol", ["show", "job", "-o", jobId], {
                encoding: "utf8",
                stdio: ["ignore", "pipe", "ignore"],
            }).trim();
            const accounting = parseScontrolJobLine(output);
            if (accounting.account !== null) {
                return {
                    jobId,
                    arrayJobId: process.env.SLURM_ARRAY_JOB_ID ?? null,
                    arrayTaskId: process.env.SLURM_ARRAY_TASK_ID ?? null,
                    ...accounting,
                    source: "scontrol",
                    environmentAccount,
                    environmentPartition,
                };
            }
        } catch {
            // Fall back to the environment for non-Slurm and restricted shells.
        }
    }
    return {
        jobId,
        arrayJobId: process.env.SLURM_ARRAY_JOB_ID ?? null,
        arrayTaskId: process.env.SLURM_ARRAY_TASK_ID ?? null,
        account: environmentAccount,
        partition: environmentPartition,
        qos: null,
        source: jobId !== null || environmentAccount !== null ? "environment" : "none",
        environmentAccount,
        environmentPartition,
    };
};

const captureEnvironment = (): Record<string, string> =>
    Object.fromEntries(
        Object.entries(process.env)
            .filter(([name, value]) => {
                if (value === undefined) {
                    return false;
                }
                return EXACT_ENV_KEYS.has(name) || CAPTURED_PREFIXES.some((prefix) => name.startsWith(prefix));
            })
            .sort(([left], [right]) => left.localeCompare(right))
            .map(([name, value]) => [name, value as string]),
    );

export const createExperimentManifest = (args: {
    runId: string;
    mixDir: string;
    maps: string[];
    effectiveConfig: unknown;
    baseline: BaselineDescriptor;
    gameSeedBase: number;
}): ExperimentManifest => {
    const cwd = process.cwd();
    const source = getGitState(cwd);
    const baselineGit = getGitState(args.baseline.packageRoot);
    const projectPackage = readJson(path.join(source.repoRoot, "package.json"));
    const gameApiPackage = readJson(
        path.join(source.repoRoot, "node_modules", "@chronodivide", "game-api", "package.json"),
    );
    const packageLockPath = path.join(source.repoRoot, "package-lock.json");
    const resolvedMixDir = path.resolve(cwd, args.mixDir);
    const sourceRuntimeTrees = [
        hashRuntimeTree(path.join(source.repoRoot, "packages", "chronodivide-bot", "dist")),
        hashRuntimeTree(path.join(source.repoRoot, "packages", "chronodivide-bot-driver", "dist", "benchmark")),
        hashRuntimeTree(path.join(source.repoRoot, "packages", "chronodivide-bot-driver", "dist", "training")),
    ];
    const gameApiRuntimeTree = hashRuntimeTree(
        path.join(source.repoRoot, "node_modules", "@chronodivide", "game-api", "dist"),
    );
    const baselineRuntimeTree = hashRuntimeTree(path.join(args.baseline.packageRoot, "dist"));
    const { runtimePath: _runtimePath, ...seedCompatibility } = validateOfflineSeedCompatibility();

    return {
        schemaVersion: 3,
        createdAt: new Date().toISOString(),
        runId: args.runId,
        command: process.argv,
        cwd,
        host: {
            hostname: os.hostname(),
            platform: process.platform,
            arch: process.arch,
        },
        scheduler: getSchedulerDescriptor(),
        source: {
            repoRoot: source.repoRoot,
            gitCommit: source.gitCommit,
            gitBranch: source.gitBranch,
            trackedDirty: source.trackedDirty,
            trackedStatus: source.trackedStatus,
            trackedDiffSha256: source.trackedDiffSha256,
            trackedDiffBytes: source.trackedDiffBytes,
            runtimeTrees: sourceRuntimeTrees,
        },
        software: {
            node: process.version,
            packageLockSha256: fs.existsSync(packageLockPath) ? sha256File(packageLockPath) : null,
            projectVersion: typeof projectPackage?.version === "string" ? projectPackage.version : null,
            gameApiVersion: typeof gameApiPackage?.version === "string" ? gameApiPackage.version : null,
            gameApiRuntimeTree,
            baseline: {
                kind: args.baseline.kind,
                packageRoot: path.resolve(args.baseline.packageRoot),
                packageVersion: packageVersion(args.baseline.packageRoot),
                gitCommit: baselineGit.gitCommit,
                trackedDirty: baselineGit.trackedDirty,
                runtimeTree: baselineRuntimeTree,
            },
        },
        inputs: {
            mixDir: resolvedMixDir,
            maps: args.maps.map((name) => {
                const resolvedPath = path.resolve(resolvedMixDir, name);
                const exists = fs.existsSync(resolvedPath);
                const stat = exists ? fs.statSync(resolvedPath) : null;
                return {
                    name,
                    resolvedPath,
                    exists,
                    bytes: stat?.size ?? null,
                    sha256: exists ? sha256File(resolvedPath) : null,
                };
            }),
            effectiveConfig: args.effectiveConfig,
            capturedEnvironment: captureEnvironment(),
        },
        randomness: {
            engineSeedControl: OFFLINE_SEED_CONTROL_METHOD,
            requestedEngineSeedRecordedPerMatch: true,
            botRandomSeedRecordedPerMatch: true,
            participantBotRandomSeedsRecordedPerMatch: true,
            engineSeedBase: args.gameSeedBase,
            engineSeedDerivation:
                "(engineSeedBase + seedBlockIndex) mod 2^32; reciprocal physical-slot runs reuse one seedBlockIndex",
            engineSeedToEpochMapping:
                "Date.now() = requestedEngineSeed * 1000 milliseconds; " +
                "offline floor(Date.now()/1000) = requestedEngineSeed",
            botRandomSeedDerivation:
                "root = requestedEngineSeed xor 0x9e3779b9; " + "participant = root xor fnv1a32(candidate|baseline)",
            compatibility: seedCompatibility,
            note:
                "The pinned @chronodivide/game-api 0.75.0 interface has no public offline seed. " +
                "After validating the bundled implementation (offline game ID '0', timestamp from floor(Date.now()/1000), " +
                "and Mersenne Twister seed derived from game ID plus timestamp), this sequential harness supplies each " +
                "requested uint32 seed through a temporary Date.now shim. The external Bot GameApi in this version uses " +
                "Math.random rather than the engine PRNG, so synchronous candidate and baseline callbacks receive separate " +
                "identity-keyed Mulberry32 streams. Candidate random draws therefore cannot advance the baseline stream, " +
                "and reciprocal agent-array slot swaps retain participant streams. Both globals and callback wrappers are " +
                "restored in finally paths, and concurrent in-process seeded sessions fail closed. Every accepted match, " +
                "trace, and rejected-start event records the root and participant seeds plus the exact epoch mapping.",
        },
    };
};
