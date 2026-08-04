import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { FileHandle as NodeAdapterFileHandle } from "file-system-access/lib/adapters/node.js";
import FetchBlobFile from "fetch-blob/file.js";

export const MAP_LOAD_ATTESTATION_PROTOCOL = "unique-rfs-alias-adapter-snapshot-v1" as const;
export const PINNED_GAME_API_VERSION = "0.75.0";
export const PINNED_FILE_SYSTEM_ACCESS_VERSION = "1.0.4";
export const PINNED_FETCH_BLOB_VERSION = "3.2.0";

const PINNED_SHA256 = Object.freeze({
    gameApiPackage: "79d1f8d5b976ef73b4267e0e423cd611f7b1251da8076ca4e9314afc67544297",
    gameApiRuntime: "dd398f5c8c2b4c3e3d6eb0f9ca6d7549bf70fee16c5950cd8902616ac922497d",
    fileSystemAccessPackage: "00dee2fc8b36c42c6f64101b117a872dad0831543b5ee82110e63cff489e9cf5",
    fileSystemAccessEntry: "f5bc67a1085bc35e10ff3f7d4232bfb6d4a582bc5c94acf465039056d9a2d426",
    fileSystemAccessAdapter: "55db1161b68613e3f48a54f7c13171fc3c43648ad37a3320034e91809efe2e67",
    fetchBlobPackage: "ee47bb73168049962586a09317017c44b1b10b2a90fc74e5c4561efdb361411b",
    fetchBlobEntry: "5b56afbb2cc10d38ed6631954e17e4dfa90322b688bef7c0db3a2bda6c901587",
    fetchBlobFrom: "8083ba1d38737d94fe02d51255a5b827f3f2a83894764f60c3a2f3bc28ea96e8",
    fetchBlobFile: "c8bcea7adb270e2dbfa1bea29e149fd22214b26210641b479d5ce90af410cd78",
} as const);

/**
 * These commitments cover every regular file shipped in each installed package,
 * not merely the modules that happen to be imported today. The manifest digest
 * is SHA-256 over sorted `<relative-path>\0<byte-count>\0<file-sha256>\n`
 * records. Symlinks and special files are rejected.
 */
export const PINNED_IMPLEMENTATION_TREES = Object.freeze({
    fileSystemAccess: Object.freeze({
        fileCount: 94,
        bytes: 483_240,
        sha256: "5526c54170af3a79ac4a48f064b4ec4289a582ed51db5133ac60c205f03795d0",
    }),
    fetchBlob: Object.freeze({
        fileCount: 10,
        bytes: 21_755,
        sha256: "b6515d3cb683951ebb1c4cd72102072dd4c6a29b1551dd30ee1244eb40930b48",
    }),
} as const);

const GAME_API_RUNTIME_MARKERS = [
    "async openFileWithRfs(e)",
    "t=await this.rfs.openFile(e)",
    "if(!this.fileExists(e))throw new FileNotFoundError",
    "r.addDirectoryHandle(i),r.addDirectoryHandle(e)",
    "r=new MapFile(await Engine.vfs.openFileWithRfs(t.mapName))",
    "let i=await Engine.vfs.openFileWithRfs(t.mapName)",
    "new DataStream(await t.arrayBuffer())",
] as const;

const NODE_ADAPTER_MARKERS = [
    "this._path = path;",
    "return (await fileFrom(this._path));",
    "const stat = await fs.lstat(path);",
    "if (stat.isFile())",
] as const;

const FETCH_BLOB_MARKERS = ["_File = class File extends Blob", "super(fileBits, options)"] as const;

export type MapLoadCompatibilityPaths = {
    gameApiPackage: string;
    gameApiRuntime: string;
    gameApiResDirectory: string;
    fileSystemAccessRoot: string;
    fileSystemAccessPackage: string;
    fileSystemAccessEntry: string;
    fileSystemAccessAdapter: string;
    fetchBlobRoot: string;
    fetchBlobPackage: string;
    fetchBlobEntry: string;
    fetchBlobFrom: string;
    fetchBlobFile: string;
};

export type ImplementationTreeAttestation = {
    root: string;
    fileCount: number;
    bytes: number;
    sha256: string;
};

export type MapLoadModuleResolutions = {
    gameApiFileSystemAccessEntry: string;
    gameApiNodeAdapter: string;
    adapterFetchBlobEntry: string;
    adapterFetchBlobFrom: string;
    adapterFetchBlobFile: string;
};

export type MapLoadCompatibility = {
    protocol: typeof MAP_LOAD_ATTESTATION_PROTOCOL;
    versions: {
        gameApi: typeof PINNED_GAME_API_VERSION;
        fileSystemAccess: typeof PINNED_FILE_SYSTEM_ACCESS_VERSION;
        fetchBlob: typeof PINNED_FETCH_BLOB_VERSION;
    };
    sha256: typeof PINNED_SHA256;
    implementationTrees: {
        fileSystemAccess: ImplementationTreeAttestation;
        fetchBlob: ImplementationTreeAttestation;
    };
    moduleResolutions: MapLoadModuleResolutions;
    paths: MapLoadCompatibilityPaths;
};

export type ResolutionRoot = {
    label: "mix_dir" | "game_api_res" | "private_cwd";
    path: string;
};

export type AliasCollision = {
    rootLabel: ResolutionRoot["label"];
    rootPath: string;
    name: string;
    path: string;
    kind: "regular_file" | "directory" | "symbolic_link" | "other";
};

export type MaterializedMapAlias = {
    protocol: typeof MAP_LOAD_ATTESTATION_PROTOCOL;
    familyIndex: number;
    alias: string;
    sourcePath: string;
    aliasPath: string;
    mixDirectory: string;
    gameApiResDirectory: string;
    sandboxDirectory: string;
    resolutionRoots: readonly Readonly<ResolutionRoot>[];
    bytes: number;
    sha256: string;
};

export const MAP_LOAD_PHASE_READ_COUNTS = {
    initialization: 1,
    forward_create: 2,
    reverse_create: 2,
} as const;

export type MapLoadPhase = keyof typeof MAP_LOAD_PHASE_READ_COUNTS;

export type MapLoadReadAttestation = {
    phase: MapLoadPhase;
    ordinal: number;
    alias: string;
    resolvedPath: string;
    bytes: number;
    sha256: string;
    adapter: "file-system-access/node.FileHandle.getFile";
    inMemorySnapshot: true;
};

export type MapLoadAttestationEvidence = {
    protocol: typeof MAP_LOAD_ATTESTATION_PROTOCOL;
    alias: string;
    aliasPath: string;
    expectedBytes: number;
    expectedSha256: string;
    phases: Array<{ phase: MapLoadPhase; expectedReads: number; observedReads: number }>;
    reads: MapLoadReadAttestation[];
    complete: true;
};

const sha256Bytes = (value: Uint8Array): string => createHash("sha256").update(value).digest("hex");

export const sha256AttestationFile = (filePath: string): string => sha256Bytes(fs.readFileSync(filePath));

const readPackageVersion = (packagePath: string, label: string): string => {
    const parsed = JSON.parse(fs.readFileSync(packagePath, "utf8")) as { version?: unknown };
    if (typeof parsed.version !== "string") throw new Error(`${label} package version is absent`);
    return parsed.version;
};

const requireExactFile = (filePath: string, expectedSha256: string, label: string): string => {
    const resolved = path.resolve(filePath);
    const stat = fs.lstatSync(resolved);
    if (!stat.isFile() || stat.isSymbolicLink()) throw new Error(`${label} is not a regular non-symlink file`);
    const actualSha256 = sha256AttestationFile(resolved);
    if (actualSha256 !== expectedSha256) {
        throw new Error(`${label} SHA-256 drift: ${actualSha256} != ${expectedSha256}`);
    }
    return fs.realpathSync(resolved);
};

const requireMarkers = (filePath: string, markers: readonly string[], label: string): void => {
    const source = fs.readFileSync(filePath, "utf8");
    const missing = markers.filter((marker) => !source.includes(marker));
    if (missing.length > 0) throw new Error(`${label} compatibility marker(s) missing: ${missing.join(", ")}`);
};

const requireRegularDirectory = (directoryPath: string, label: string): string => {
    const resolved = path.resolve(directoryPath);
    const stat = fs.lstatSync(resolved);
    if (!stat.isDirectory() || stat.isSymbolicLink()) {
        throw new Error(`${label} is not a regular non-symlink directory`);
    }
    return fs.realpathSync(resolved);
};

/** Build the deterministic, content-only package commitment described above. */
export const attestImplementationTree = (rootDirectory: string): ImplementationTreeAttestation => {
    const root = requireRegularDirectory(rootDirectory, "implementation tree root");
    const records: Array<{ relativePath: string; bytes: number; sha256: string }> = [];

    const visit = (directory: string): void => {
        for (const name of fs.readdirSync(directory)) {
            const entryPath = path.join(directory, name);
            const stat = fs.lstatSync(entryPath);
            if (stat.isSymbolicLink()) {
                throw new Error(`Implementation tree contains a symbolic link: ${entryPath}`);
            }
            if (stat.isDirectory()) {
                visit(entryPath);
                continue;
            }
            if (!stat.isFile()) {
                throw new Error(`Implementation tree contains a special file: ${entryPath}`);
            }
            const relativePath = path.relative(root, entryPath).split(path.sep).join("/");
            if (/[\u0000\n]/.test(relativePath)) {
                throw new Error(`Implementation tree path cannot be committed unambiguously: ${relativePath}`);
            }
            const contents = fs.readFileSync(entryPath);
            records.push({ relativePath, bytes: contents.byteLength, sha256: sha256Bytes(contents) });
        }
    };
    visit(root);
    records.sort((left, right) =>
        left.relativePath < right.relativePath ? -1 : left.relativePath > right.relativePath ? 1 : 0,
    );

    const manifestHash = createHash("sha256");
    let totalBytes = 0;
    for (const record of records) {
        manifestHash.update(`${record.relativePath}\0${record.bytes}\0${record.sha256}\n`, "utf8");
        totalBytes += record.bytes;
    }
    return Object.freeze({
        root,
        fileCount: records.length,
        bytes: totalBytes,
        sha256: manifestHash.digest("hex"),
    });
};

const requireImplementationTree = (
    rootDirectory: string,
    expected: Readonly<{ fileCount: number; bytes: number; sha256: string }>,
    label: string,
): ImplementationTreeAttestation => {
    const actual = attestImplementationTree(rootDirectory);
    if (
        actual.fileCount !== expected.fileCount ||
        actual.bytes !== expected.bytes ||
        actual.sha256 !== expected.sha256
    ) {
        throw new Error(
            `${label} implementation tree drift: ${actual.fileCount}/${actual.bytes}/${actual.sha256} != ` +
                `${expected.fileCount}/${expected.bytes}/${expected.sha256}`,
        );
    }
    return actual;
};

const requirePathRelationship = (condition: boolean, label: string): void => {
    if (!condition) throw new Error(`${label} does not belong to the pinned package tree`);
};

const resolveExactModule = (fromFile: string, specifier: string, expectedPath: string, label: string): string => {
    const resolved = fs.realpathSync(createRequire(fromFile).resolve(specifier));
    if (resolved !== fs.realpathSync(expectedPath)) {
        throw new Error(`${label} resolved ${resolved}, expected ${expectedPath}`);
    }
    return resolved;
};

export const resolveMapLoadCompatibilityPaths = (): MapLoadCompatibilityPaths => {
    const require = createRequire(import.meta.url);
    const gameApiRuntime = require.resolve("@chronodivide/game-api");
    const fileSystemAccessPackage = require.resolve("file-system-access/package.json");
    const fetchBlobPackage = require.resolve("fetch-blob/package.json");
    return {
        gameApiPackage: path.resolve(path.dirname(gameApiRuntime), "..", "package.json"),
        gameApiRuntime,
        gameApiResDirectory: path.resolve(path.dirname(gameApiRuntime), "res"),
        fileSystemAccessRoot: path.dirname(fileSystemAccessPackage),
        fileSystemAccessPackage,
        fileSystemAccessEntry: require.resolve("file-system-access"),
        fileSystemAccessAdapter: require.resolve("file-system-access/lib/adapters/node.js"),
        fetchBlobRoot: path.dirname(fetchBlobPackage),
        fetchBlobPackage,
        fetchBlobEntry: require.resolve("fetch-blob"),
        fetchBlobFrom: require.resolve("fetch-blob/from.js"),
        fetchBlobFile: require.resolve("fetch-blob/file.js"),
    };
};

/** Fail closed if any private implementation detail used by the attestor drifts. */
export const validateMapLoadCompatibility = (
    paths: MapLoadCompatibilityPaths = resolveMapLoadCompatibilityPaths(),
): MapLoadCompatibility => {
    const fileSystemAccessRoot = requireRegularDirectory(paths.fileSystemAccessRoot, "file-system-access root");
    const fetchBlobRoot = requireRegularDirectory(paths.fetchBlobRoot, "fetch-blob root");
    const gameApiRuntime = requireExactFile(paths.gameApiRuntime, PINNED_SHA256.gameApiRuntime, "game-api runtime");
    const expectedGameApiResDirectory = path.resolve(path.dirname(gameApiRuntime), "res");
    if (path.resolve(paths.gameApiResDirectory) !== expectedGameApiResDirectory) {
        throw new Error("game-api resource root is not the res directory beside the pinned runtime");
    }

    const exactPaths: MapLoadCompatibilityPaths = {
        gameApiPackage: requireExactFile(paths.gameApiPackage, PINNED_SHA256.gameApiPackage, "game-api package"),
        gameApiRuntime,
        gameApiResDirectory: requireRegularDirectory(expectedGameApiResDirectory, "game-api resource root"),
        fileSystemAccessRoot,
        fileSystemAccessPackage: requireExactFile(
            paths.fileSystemAccessPackage,
            PINNED_SHA256.fileSystemAccessPackage,
            "file-system-access package",
        ),
        fileSystemAccessEntry: requireExactFile(
            paths.fileSystemAccessEntry,
            PINNED_SHA256.fileSystemAccessEntry,
            "file-system-access entry",
        ),
        fileSystemAccessAdapter: requireExactFile(
            paths.fileSystemAccessAdapter,
            PINNED_SHA256.fileSystemAccessAdapter,
            "file-system-access adapter",
        ),
        fetchBlobRoot,
        fetchBlobPackage: requireExactFile(
            paths.fetchBlobPackage,
            PINNED_SHA256.fetchBlobPackage,
            "fetch-blob package",
        ),
        fetchBlobEntry: requireExactFile(
            paths.fetchBlobEntry,
            PINNED_SHA256.fetchBlobEntry,
            "fetch-blob entry",
        ),
        fetchBlobFrom: requireExactFile(paths.fetchBlobFrom, PINNED_SHA256.fetchBlobFrom, "fetch-blob from runtime"),
        fetchBlobFile: requireExactFile(paths.fetchBlobFile, PINNED_SHA256.fetchBlobFile, "fetch-blob File runtime"),
    };

    requirePathRelationship(
        exactPaths.gameApiPackage === path.resolve(path.dirname(exactPaths.gameApiRuntime), "..", "package.json"),
        "game-api package",
    );
    requirePathRelationship(
        path.dirname(exactPaths.fileSystemAccessPackage) === fileSystemAccessRoot,
        "file-system-access package",
    );
    requirePathRelationship(
        exactPaths.fileSystemAccessEntry.startsWith(`${fileSystemAccessRoot}${path.sep}`),
        "file-system-access entry",
    );
    requirePathRelationship(
        exactPaths.fileSystemAccessAdapter.startsWith(`${fileSystemAccessRoot}${path.sep}`),
        "file-system-access adapter",
    );
    requirePathRelationship(path.dirname(exactPaths.fetchBlobPackage) === fetchBlobRoot, "fetch-blob package");
    for (const [label, filePath] of [
        ["fetch-blob entry", exactPaths.fetchBlobEntry],
        ["fetch-blob from runtime", exactPaths.fetchBlobFrom],
        ["fetch-blob File runtime", exactPaths.fetchBlobFile],
    ] as const) {
        requirePathRelationship(filePath.startsWith(`${fetchBlobRoot}${path.sep}`), label);
    }

    const implementationTrees = {
        fileSystemAccess: requireImplementationTree(
            fileSystemAccessRoot,
            PINNED_IMPLEMENTATION_TREES.fileSystemAccess,
            "file-system-access",
        ),
        fetchBlob: requireImplementationTree(fetchBlobRoot, PINNED_IMPLEMENTATION_TREES.fetchBlob, "fetch-blob"),
    };

    const moduleResolutions: MapLoadModuleResolutions = {
        gameApiFileSystemAccessEntry: resolveExactModule(
            exactPaths.gameApiRuntime,
            "file-system-access",
            exactPaths.fileSystemAccessEntry,
            "game-api file-system-access entry",
        ),
        gameApiNodeAdapter: resolveExactModule(
            exactPaths.gameApiRuntime,
            "file-system-access/lib/adapters/node.js",
            exactPaths.fileSystemAccessAdapter,
            "game-api Node adapter",
        ),
        adapterFetchBlobEntry: resolveExactModule(
            exactPaths.fileSystemAccessAdapter,
            "fetch-blob",
            exactPaths.fetchBlobEntry,
            "Node adapter fetch-blob entry",
        ),
        adapterFetchBlobFrom: resolveExactModule(
            exactPaths.fileSystemAccessAdapter,
            "fetch-blob/from.js",
            exactPaths.fetchBlobFrom,
            "Node adapter fetch-blob/from.js",
        ),
        adapterFetchBlobFile: resolveExactModule(
            exactPaths.fileSystemAccessAdapter,
            "fetch-blob/file.js",
            exactPaths.fetchBlobFile,
            "Node adapter fetch-blob/file.js",
        ),
    };

    const versions = {
        gameApi: readPackageVersion(exactPaths.gameApiPackage, "game-api"),
        fileSystemAccess: readPackageVersion(exactPaths.fileSystemAccessPackage, "file-system-access"),
        fetchBlob: readPackageVersion(exactPaths.fetchBlobPackage, "fetch-blob"),
    };
    if (versions.gameApi !== PINNED_GAME_API_VERSION) throw new Error(`Unsupported game-api ${versions.gameApi}`);
    if (versions.fileSystemAccess !== PINNED_FILE_SYSTEM_ACCESS_VERSION) {
        throw new Error(`Unsupported file-system-access ${versions.fileSystemAccess}`);
    }
    if (versions.fetchBlob !== PINNED_FETCH_BLOB_VERSION) {
        throw new Error(`Unsupported fetch-blob ${versions.fetchBlob}`);
    }

    requireMarkers(exactPaths.gameApiRuntime, GAME_API_RUNTIME_MARKERS, "game-api runtime");
    requireMarkers(exactPaths.fileSystemAccessAdapter, NODE_ADAPTER_MARKERS, "file-system-access adapter");
    requireMarkers(exactPaths.fetchBlobFile, FETCH_BLOB_MARKERS, "fetch-blob File runtime");

    const descriptor = Object.getOwnPropertyDescriptor(NodeAdapterFileHandle.prototype, "getFile");
    if (
        !descriptor ||
        typeof descriptor.value !== "function" ||
        descriptor.writable !== true ||
        descriptor.configurable !== true
    ) {
        throw new Error("Node adapter FileHandle.getFile cannot be safely intercepted and restored");
    }

    return {
        protocol: MAP_LOAD_ATTESTATION_PROTOCOL,
        versions: {
            gameApi: PINNED_GAME_API_VERSION,
            fileSystemAccess: PINNED_FILE_SYSTEM_ACCESS_VERSION,
            fetchBlob: PINNED_FETCH_BLOB_VERSION,
        },
        sha256: PINNED_SHA256,
        implementationTrees,
        moduleResolutions,
        paths: exactPaths,
    };
};

export const createMapLoadAlias = (familyIndex: number, expectedSha256: string): string => {
    if (!Number.isSafeInteger(familyIndex) || familyIndex < 0 || familyIndex > 999_999) {
        throw new Error(`familyIndex must be an integer in [0, 999999], got ${familyIndex}`);
    }
    if (!/^[0-9a-f]{64}$/.test(expectedSha256)) {
        throw new Error("Expected map SHA-256 must be 64 lowercase hexadecimal characters");
    }
    return `cdfid-${String(familyIndex).padStart(6, "0")}-${expectedSha256}.map`;
};

const classifyEntry = (stat: fs.Stats): AliasCollision["kind"] => {
    if (stat.isFile()) return "regular_file";
    if (stat.isDirectory()) return "directory";
    if (stat.isSymbolicLink()) return "symbolic_link";
    return "other";
};

const validateResolutionRoots = (roots: readonly ResolutionRoot[]): ResolutionRoot[] => {
    const exactOrder: ResolutionRoot["label"][] = ["mix_dir", "game_api_res", "private_cwd"];
    if (roots.length !== exactOrder.length || roots.some((root, index) => root.label !== exactOrder[index])) {
        throw new Error("Resolution roots must contain exactly mix_dir, game_api_res, and private_cwd");
    }

    const canonicalRoots = roots.map((root) => ({
        ...root,
        path: requireRegularDirectory(root.path, `${root.label} resolution root`),
    }));
    if (new Set(canonicalRoots.map((root) => root.path)).size !== canonicalRoots.length) {
        throw new Error("Resolution roots must be three distinct directories");
    }
    return canonicalRoots;
};

export const findAliasCollisions = (roots: readonly ResolutionRoot[], alias: string): AliasCollision[] => {
    const canonicalRoots = validateResolutionRoots(roots);
    const foldedAlias = alias.toLowerCase();
    const collisions: AliasCollision[] = [];
    for (const root of canonicalRoots) {
        for (const name of fs.readdirSync(root.path)) {
            if (name.toLowerCase() !== foldedAlias) continue;
            const entryPath = path.join(root.path, name);
            collisions.push({
                rootLabel: root.label,
                rootPath: root.path,
                name,
                path: entryPath,
                kind: classifyEntry(fs.lstatSync(entryPath)),
            });
        }
    }
    return collisions;
};

export const assertAliasAbsent = (roots: readonly ResolutionRoot[], alias: string): void => {
    const collisions = findAliasCollisions(roots, alias);
    if (collisions.length > 0) {
        throw new Error(
            `Map alias ${alias} collides with ${collisions
                .map((entry) => `${entry.rootLabel}:${entry.name}`)
                .join(", ")}`,
        );
    }
};

export const assertUniqueMaterializedAlias = (
    roots: readonly ResolutionRoot[],
    alias: string,
    expectedAliasPath: string,
): AliasCollision => {
    const collisions = findAliasCollisions(roots, alias);
    const expected = path.resolve(expectedAliasPath);
    if (
        collisions.length !== 1 ||
        collisions[0].kind !== "regular_file" ||
        collisions[0].name !== alias ||
        path.resolve(collisions[0].path) !== expected
    ) {
        throw new Error(`Map alias ${alias} is not the sole exact regular-file match across the finite RFS roots`);
    }
    return collisions[0];
};

export const buildResolutionRoots = (
    mixDirectory: string,
    privateWorkingDirectory: string,
    compatibility: MapLoadCompatibility,
): ResolutionRoot[] =>
    validateResolutionRoots([
        { label: "mix_dir", path: mixDirectory },
        { label: "game_api_res", path: compatibility.paths.gameApiResDirectory },
        { label: "private_cwd", path: privateWorkingDirectory },
    ]);

const fsyncDirectory = (directoryPath: string): void => {
    const descriptor = fs.openSync(directoryPath, fs.constants.O_RDONLY);
    try {
        fs.fsyncSync(descriptor);
    } finally {
        fs.closeSync(descriptor);
    }
};

const issuedMaterializations = new WeakSet<object>();

export const materializeMapAlias = (args: {
    familyIndex: number;
    expectedSha256: string;
    expectedBytes: number;
    sourcePath: string;
    mixDirectory: string;
    sandboxDirectory: string;
}): MaterializedMapAlias => {
    if (!Number.isSafeInteger(args.expectedBytes) || args.expectedBytes < 0) {
        throw new Error(`Expected map byte count is invalid: ${args.expectedBytes}`);
    }
    const compatibility = validateMapLoadCompatibility();
    const sourceCandidate = path.resolve(args.sourcePath);
    const sourceStat = fs.lstatSync(sourceCandidate);
    if (!sourceStat.isFile() || sourceStat.isSymbolicLink()) {
        throw new Error("Source map is not a regular non-symlink file");
    }
    const sourcePath = fs.realpathSync(sourceCandidate);
    const sourceBytes = fs.readFileSync(sourcePath);
    if (sourceBytes.byteLength !== args.expectedBytes || sha256Bytes(sourceBytes) !== args.expectedSha256) {
        throw new Error("Source map bytes do not match the committed byte count and SHA-256");
    }

    const sandboxCandidate = path.resolve(args.sandboxDirectory);
    if (!fs.existsSync(sandboxCandidate)) fs.mkdirSync(sandboxCandidate, { mode: 0o700 });
    const sandboxDirectory = requireRegularDirectory(sandboxCandidate, "alias sandbox");
    const sandboxStat = fs.lstatSync(sandboxDirectory);
    if ((sandboxStat.mode & 0o077) !== 0) {
        throw new Error("Alias sandbox must not be accessible by group or other users");
    }
    const mixDirectory = requireRegularDirectory(args.mixDirectory, "mix directory");
    const roots = buildResolutionRoots(mixDirectory, sandboxDirectory, compatibility);
    const resolutionRoots = Object.freeze(roots.map((root) => Object.freeze({ ...root })));

    const alias = createMapLoadAlias(args.familyIndex, args.expectedSha256);
    assertAliasAbsent(resolutionRoots, alias);
    const aliasPath = path.join(sandboxDirectory, alias);
    const temporaryPath = path.join(sandboxDirectory, `.${alias}.tmp-${process.pid}-${randomUUID()}`);
    let temporaryCreated = false;
    let finalCreated = false;

    try {
        const descriptor = fs.openSync(
            temporaryPath,
            fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_WRONLY,
            0o400,
        );
        temporaryCreated = true;
        try {
            fs.writeFileSync(descriptor, sourceBytes);
            fs.fchmodSync(descriptor, 0o400);
            fs.fsyncSync(descriptor);
        } finally {
            fs.closeSync(descriptor);
        }

        const stagedStat = fs.lstatSync(temporaryPath);
        const stagedBytes = fs.readFileSync(temporaryPath);
        if (
            !stagedStat.isFile() ||
            stagedStat.isSymbolicLink() ||
            stagedBytes.byteLength !== args.expectedBytes ||
            !stagedBytes.equals(sourceBytes) ||
            sha256Bytes(stagedBytes) !== args.expectedSha256
        ) {
            throw new Error("Staged map alias does not exactly match the expected source bytes");
        }

        // link(2) is an atomic no-replace publication primitive on the same filesystem.
        fs.linkSync(temporaryPath, aliasPath);
        finalCreated = true;
        fs.unlinkSync(temporaryPath);
        temporaryCreated = false;
        fsyncDirectory(sandboxDirectory);

        const copiedStat = fs.lstatSync(aliasPath);
        const copiedBytes = fs.readFileSync(aliasPath);
        if (
            !copiedStat.isFile() ||
            copiedStat.isSymbolicLink() ||
            (copiedStat.mode & 0o777) !== 0o400 ||
            copiedBytes.byteLength !== args.expectedBytes ||
            !copiedBytes.equals(sourceBytes) ||
            sha256Bytes(copiedBytes) !== args.expectedSha256
        ) {
            throw new Error("Published map alias does not exactly match the expected source bytes and mode");
        }
        assertUniqueMaterializedAlias(resolutionRoots, alias, aliasPath);

        const materialized = Object.freeze({
            protocol: MAP_LOAD_ATTESTATION_PROTOCOL,
            familyIndex: args.familyIndex,
            alias,
            sourcePath,
            aliasPath,
            mixDirectory,
            gameApiResDirectory: compatibility.paths.gameApiResDirectory,
            sandboxDirectory,
            resolutionRoots,
            bytes: args.expectedBytes,
            sha256: args.expectedSha256,
        });
        issuedMaterializations.add(materialized);
        return materialized;
    } catch (error) {
        const rollbackErrors: unknown[] = [];
        if (finalCreated) {
            try {
                fs.unlinkSync(aliasPath);
                finalCreated = false;
            } catch (rollbackError) {
                rollbackErrors.push(rollbackError);
            }
        }
        if (temporaryCreated) {
            try {
                fs.unlinkSync(temporaryPath);
                temporaryCreated = false;
            } catch (rollbackError) {
                rollbackErrors.push(rollbackError);
            }
        }
        try {
            fsyncDirectory(sandboxDirectory);
        } catch (rollbackError) {
            rollbackErrors.push(rollbackError);
        }
        if (rollbackErrors.length > 0) {
            const rollbackFailure = new Error(
                `Map alias publication failed and rollback reported ${rollbackErrors.length} error(s)`,
            ) as Error & { cause?: unknown };
            rollbackFailure.cause = error;
            throw rollbackFailure;
        }
        throw error;
    }
};

type AdapterGetFile = typeof NodeAdapterFileHandle.prototype.getFile;
type RuntimeFileHandle = { _path?: unknown };

const PHASE_ORDER: MapLoadPhase[] = ["initialization", "forward_create", "reverse_create"];

export class MapLoadAttestationSession {
    private readonly reads: MapLoadReadAttestation[] = [];
    private readonly completedPhases: MapLoadAttestationEvidence["phases"] = [];
    private activePhase: MapLoadPhase | null = null;
    private phaseStart = 0;
    private nextPhaseIndex = 0;

    constructor(private readonly materialized: MaterializedMapAlias) {}

    async runPhase<T>(phase: MapLoadPhase, operation: () => Promise<T>): Promise<T> {
        if (this.activePhase !== null) throw new Error(`Map-load phase ${this.activePhase} is still active`);
        const expectedPhase = PHASE_ORDER[this.nextPhaseIndex];
        if (phase !== expectedPhase) throw new Error(`Expected map-load phase ${String(expectedPhase)}, got ${phase}`);
        this.activePhase = phase;
        this.phaseStart = this.reads.length;
        try {
            const value = await operation();
            const observedReads = this.reads.length - this.phaseStart;
            const expectedReads = MAP_LOAD_PHASE_READ_COUNTS[phase];
            if (observedReads !== expectedReads) {
                throw new Error(`Map-load phase ${phase} observed ${observedReads} reads; expected ${expectedReads}`);
            }
            this.completedPhases.push({ phase, expectedReads, observedReads });
            this.nextPhaseIndex++;
            return value;
        } finally {
            this.activePhase = null;
        }
    }

    async interceptGetFile(handle: NodeAdapterFileHandle, originalGetFile: AdapterGetFile): Promise<File> {
        if (handle.name.toLowerCase() !== this.materialized.alias.toLowerCase()) {
            return originalGetFile.call(handle);
        }
        if (this.activePhase === null)
            throw new Error(`Map alias ${this.materialized.alias} was opened outside an attested phase`);
        const expectedReads = MAP_LOAD_PHASE_READ_COUNTS[this.activePhase];
        const ordinal = this.reads.length - this.phaseStart + 1;
        if (ordinal > expectedReads)
            throw new Error(`Map-load phase ${this.activePhase} exceeded ${expectedReads} alias reads`);

        if (fs.realpathSync(process.cwd()) !== this.materialized.sandboxDirectory) {
            throw new Error("Process cwd left the authenticated private map sandbox during attestation");
        }
        assertUniqueMaterializedAlias(
            this.materialized.resolutionRoots,
            this.materialized.alias,
            this.materialized.aliasPath,
        );

        const runtimePath = (handle as unknown as RuntimeFileHandle)._path;
        if (typeof runtimePath !== "string")
            throw new Error("Pinned Node adapter FileHandle._path is unavailable at runtime");
        const resolvedPath = path.resolve(runtimePath);
        if (handle.name !== this.materialized.alias || resolvedPath !== path.resolve(this.materialized.aliasPath)) {
            throw new Error("Node adapter resolved the map alias to an unexpected name or path");
        }
        const stat = fs.lstatSync(resolvedPath);
        if (!stat.isFile() || stat.isSymbolicLink())
            throw new Error("Resolved map alias is not a regular non-symlink file");

        const diskFile = await originalGetFile.call(handle);
        if (diskFile.name !== this.materialized.alias)
            throw new Error("Node adapter returned an unexpected map filename");
        const bytes = Buffer.from(await diskFile.arrayBuffer());
        const digest = sha256Bytes(bytes);
        if (bytes.byteLength !== this.materialized.bytes || digest !== this.materialized.sha256) {
            throw new Error("Node adapter returned map bytes that differ from the committed representative");
        }
        this.reads.push({
            phase: this.activePhase,
            ordinal,
            alias: this.materialized.alias,
            resolvedPath,
            bytes: bytes.byteLength,
            sha256: digest,
            adapter: "file-system-access/node.FileHandle.getFile",
            inMemorySnapshot: true,
        });
        return new FetchBlobFile([bytes], this.materialized.alias, {
            type: diskFile.type,
            lastModified: diskFile.lastModified,
        }) as unknown as File;
    }

    evidence(): MapLoadAttestationEvidence {
        if (this.activePhase !== null || this.nextPhaseIndex !== PHASE_ORDER.length || this.reads.length !== 5) {
            throw new Error("Map-load attestation is incomplete");
        }
        return {
            protocol: MAP_LOAD_ATTESTATION_PROTOCOL,
            alias: this.materialized.alias,
            aliasPath: this.materialized.aliasPath,
            expectedBytes: this.materialized.bytes,
            expectedSha256: this.materialized.sha256,
            phases: this.completedPhases.map((record) => ({ ...record })),
            reads: this.reads.map((record) => ({ ...record })),
            complete: true,
        };
    }
}

let installedSession: MapLoadAttestationSession | null = null;

/**
 * Installs the process-global adapter hook for one sequential family worker.
 * Both cwd and the exact original prototype descriptor are restored on every exit path.
 */
export const withMapLoadAttestation = async <T>(args: {
    materialized: MaterializedMapAlias;
    operation: (session: MapLoadAttestationSession) => Promise<T>;
}): Promise<{ value: T; evidence: MapLoadAttestationEvidence }> => {
    const compatibility = validateMapLoadCompatibility();
    if (!issuedMaterializations.has(args.materialized)) {
        throw new Error("Materialized map alias was not issued by this attestor instance");
    }
    const expectedAlias = createMapLoadAlias(args.materialized.familyIndex, args.materialized.sha256);
    const expectedRoots = buildResolutionRoots(
        args.materialized.mixDirectory,
        args.materialized.sandboxDirectory,
        compatibility,
    );
    const rootsMatch =
        Array.isArray(args.materialized.resolutionRoots) &&
        args.materialized.resolutionRoots.length === expectedRoots.length &&
        expectedRoots.every(
            (expected, index) =>
                args.materialized.resolutionRoots[index].label === expected.label &&
                args.materialized.resolutionRoots[index].path === expected.path,
        );
    if (
        args.materialized.protocol !== MAP_LOAD_ATTESTATION_PROTOCOL ||
        args.materialized.alias !== expectedAlias ||
        args.materialized.gameApiResDirectory !== compatibility.paths.gameApiResDirectory ||
        !rootsMatch ||
        path.resolve(args.materialized.aliasPath) !==
            path.join(path.resolve(args.materialized.sandboxDirectory), expectedAlias)
    ) {
        throw new Error("Materialized map alias descriptor or authenticated root binding is inconsistent");
    }
    assertUniqueMaterializedAlias(expectedRoots, args.materialized.alias, args.materialized.aliasPath);
    const aliasStat = fs.lstatSync(args.materialized.aliasPath);
    if (
        !aliasStat.isFile() ||
        aliasStat.isSymbolicLink() ||
        (aliasStat.mode & 0o777) !== 0o400 ||
        aliasStat.size !== args.materialized.bytes ||
        sha256AttestationFile(args.materialized.aliasPath) !== args.materialized.sha256
    ) {
        throw new Error("Materialized alias bytes, type, or mode drifted before attestation installation");
    }
    if (installedSession !== null) {
        throw new Error("A process-global map-load attestation session is already installed");
    }
    const originalCwd = process.cwd();
    const originalDescriptor = Object.getOwnPropertyDescriptor(NodeAdapterFileHandle.prototype, "getFile");
    if (!originalDescriptor || typeof originalDescriptor.value !== "function") {
        throw new Error("Node adapter FileHandle.getFile descriptor is unavailable");
    }
    const originalGetFile = originalDescriptor.value as AdapterGetFile;
    const session = new MapLoadAttestationSession(args.materialized);
    installedSession = session;
    try {
        process.chdir(args.materialized.sandboxDirectory);
        if (fs.realpathSync(process.cwd()) !== args.materialized.sandboxDirectory) {
            throw new Error("Process cwd did not enter the authenticated private map sandbox");
        }
        Object.defineProperty(NodeAdapterFileHandle.prototype, "getFile", {
            ...originalDescriptor,
            value: function (this: NodeAdapterFileHandle): Promise<File> {
                return session.interceptGetFile(this, originalGetFile);
            },
        });
        const value = await args.operation(session);
        return { value, evidence: session.evidence() };
    } finally {
        try {
            try {
                process.chdir(originalCwd);
            } finally {
                Object.defineProperty(NodeAdapterFileHandle.prototype, "getFile", originalDescriptor);
            }
        } finally {
            installedSession = null;
        }
    }
};
