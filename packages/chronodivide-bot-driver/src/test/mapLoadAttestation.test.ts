import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { FileHandle as NodeAdapterFileHandle } from "file-system-access/lib/adapters/node.js";
import { describe, expect, it } from "vitest";
import {
    assertWorkerManifestFamily,
    buildWorkerTechnicalDiagnostic,
    completeAttestedMapSettingsReadPair,
    removeEmptyWorkerSandbox,
} from "../benchmark/mapFidelityProbe.js";
import { captureConsoleWarnings } from "../benchmark/mapFidelityProtocol.js";
import {
    MAP_LOAD_ATTESTATION_PROTOCOL,
    MAP_LOAD_PHASE_READ_COUNTS,
    PINNED_IMPLEMENTATION_TREES,
    MaterializedMapAlias,
    ResolutionRoot,
    assertAliasAbsent,
    createMapLoadAlias,
    findAliasCollisions,
    materializeMapAlias,
    removeMaterializedMapAlias,
    resolveMapLoadCompatibilityPaths,
    validateMapLoadCompatibility,
    withMapLoadAttestation,
} from "../benchmark/mapLoadAttestation.js";

const sha256 = (value: Uint8Array): string => createHash("sha256").update(value).digest("hex");

const copyTree = (source: string, destination: string): void => {
    fs.mkdirSync(destination);
    for (const name of fs.readdirSync(source)) {
        const sourcePath = path.join(source, name);
        const destinationPath = path.join(destination, name);
        if (fs.lstatSync(sourcePath).isDirectory()) copyTree(sourcePath, destinationPath);
        else fs.copyFileSync(sourcePath, destinationPath);
    }
};

type Fixture = {
    root: string;
    mix: string;
    sourcePath: string;
    sandbox: string;
    roots: ResolutionRoot[];
    bytes: Buffer;
    digest: string;
};

const makeFixture = (): Fixture => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "map-load-attestation-"));
    const mix = path.join(root, "mix");
    const res = path.join(root, "res");
    const sandbox = path.join(root, "private-cwd");
    for (const directory of [mix, res, sandbox]) fs.mkdirSync(directory, { mode: 0o700 });
    const sourcePath = path.join(root, "source.map");
    const bytes = Buffer.from("[Basic]\nName=No-engine attestation fixture\n[Map]\nSize=0,0,16,16\n", "utf8");
    fs.writeFileSync(sourcePath, bytes, { mode: 0o600 });
    return {
        root,
        mix,
        sourcePath,
        sandbox,
        roots: [
            { label: "mix_dir", path: mix },
            { label: "game_api_res", path: res },
            { label: "private_cwd", path: sandbox },
        ],
        bytes,
        digest: sha256(bytes),
    };
};

const materialize = (fixture: Fixture, familyIndex = 7): MaterializedMapAlias =>
    materializeMapAlias({
        familyIndex,
        expectedSha256: fixture.digest,
        expectedBytes: fixture.bytes.byteLength,
        sourcePath: fixture.sourcePath,
        mixDirectory: fixture.mix,
        sandboxDirectory: fixture.sandbox,
    });

const readAlias = async (materialized: MaterializedMapAlias, count: number): Promise<File[]> => {
    const files: File[] = [];
    for (let index = 0; index < count; index++) {
        files.push(await new NodeAdapterFileHandle(materialized.aliasPath, materialized.alias).getFile());
    }
    return files;
};

describe("collision-free map-load attestation", () => {
    it("accepts the Python manifest family schema and rejects reversed field types", () => {
        const family = {
            index: 32,
            familyId: "mf_fixture",
            representativeMapPath: "packages/chronodivide-bot-driver/data/cd_fixture.map",
            representativeSelectionRule: "fixture",
            mapName: "cd_fixture.map",
            bytes: 123,
            sha256: "a".repeat(64),
            sections: ["basic", "map", "waypoints"],
            requiredSections: {
                basic: true,
                map: true,
                waypoints: true,
            },
            requiredKeys: {
                "basic.gamemode": true,
                "map.size": true,
            },
            payloadEntryCounts: {
                isomappack5: 10,
                overlaydatapack: 2,
                overlaypack: 2,
            },
            declaredStartLocations: [
                { waypoint: 0, encoded: 63037, x: 37, y: 63 },
                { waypoint: 1, encoded: 39062, x: 62, y: 39 },
            ],
            staticChecks: {
                requiredSectionsPresent: true,
                requiredKeysPresent: true,
                payloadSectionsNonempty: true,
                startEnumerationValid: true,
                failures: [],
            },
        };
        expect(() => assertWorkerManifestFamily(family, "fixture family")).not.toThrow();
        expect(() =>
            assertWorkerManifestFamily(
                { ...family, requiredSections: ["basic", "map"] },
                "fixture family",
            ),
        ).toThrow(/must be an object/);
    });

    it("emits only a fixed technical stage and hashes for worker failures", () => {
        const diagnostic = buildWorkerTechnicalDiagnostic(
            "manifest_validate",
            new Error("winner beta at /private/path"),
        );
        expect(diagnostic).toMatchObject({
            schemaVersion: 1,
            artifactKind: "map_fidelity_worker_technical_diagnostic",
            outcomeFree: true,
            stage: "manifest_validate",
            errorNameSha256: sha256(Buffer.from("Error", "utf8")),
            errorMessageSha256: sha256(Buffer.from("winner beta at /private/path", "utf8")),
        });
        expect(diagnostic.errorStackSha256).toMatch(/^[0-9a-f]{64}$/);
        expect(JSON.stringify(diagnostic)).not.toContain("winner beta");
        expect(JSON.stringify(diagnostic)).not.toContain("/private/path");
    });

    it("pins every private runtime and compatibility marker without importing or starting the engine", () => {
        const compatibility = validateMapLoadCompatibility();
        expect(compatibility).toMatchObject({
            protocol: MAP_LOAD_ATTESTATION_PROTOCOL,
            versions: { gameApi: "0.75.0", fileSystemAccess: "1.0.4", fetchBlob: "3.2.0" },
            sha256: {
                gameApiRuntime: "dd398f5c8c2b4c3e3d6eb0f9ca6d7549bf70fee16c5950cd8902616ac922497d",
                fileSystemAccessAdapter: "55db1161b68613e3f48a54f7c13171fc3c43648ad37a3320034e91809efe2e67",
                fetchBlobFile: "c8bcea7adb270e2dbfa1bea29e149fd22214b26210641b479d5ce90af410cd78",
            },
        });

        expect(compatibility.implementationTrees).toMatchObject(PINNED_IMPLEMENTATION_TREES);
        expect(compatibility.moduleResolutions).toEqual({
            gameApiFileSystemAccessEntry: compatibility.paths.fileSystemAccessEntry,
            gameApiNodeAdapter: compatibility.paths.fileSystemAccessAdapter,
            adapterFetchBlobEntry: compatibility.paths.fetchBlobEntry,
            adapterFetchBlobFrom: compatibility.paths.fetchBlobFrom,
            adapterFetchBlobFile: compatibility.paths.fetchBlobFile,
        });

        const paths = resolveMapLoadCompatibilityPaths();
        const root = fs.mkdtempSync(path.join(os.tmpdir(), "map-load-runtime-drift-"));
        try {
            const driftedRuntime = path.join(root, "index.js");
            fs.copyFileSync(paths.gameApiRuntime, driftedRuntime);
            fs.appendFileSync(driftedRuntime, "\n// drift\n");
            expect(() => validateMapLoadCompatibility({ ...paths, gameApiRuntime: driftedRuntime })).toThrow(
                /SHA-256 drift/,
            );

            const driftedFetchBlobRoot = path.join(root, "fetch-blob");
            copyTree(paths.fetchBlobRoot, driftedFetchBlobRoot);
            fs.appendFileSync(path.join(driftedFetchBlobRoot, "streams.cjs"), "\n// transitive drift\n");
            expect(() =>
                validateMapLoadCompatibility({
                    ...paths,
                    fetchBlobRoot: driftedFetchBlobRoot,
                    fetchBlobPackage: path.join(driftedFetchBlobRoot, "package.json"),
                    fetchBlobEntry: path.join(driftedFetchBlobRoot, "index.js"),
                    fetchBlobFrom: path.join(driftedFetchBlobRoot, "from.js"),
                    fetchBlobFile: path.join(driftedFetchBlobRoot, "file.js"),
                }),
            ).toThrow(/fetch-blob implementation tree drift/);
        } finally {
            fs.rmSync(root, { recursive: true, force: true });
        }
    });

    it("generates a bounded deterministic alias and rejects malformed identity inputs", () => {
        const digest = "a".repeat(64);
        const alias = createMapLoadAlias(12, digest);
        expect(alias).toBe(`cdfid-000012-${digest}.map`);
        expect(alias.length).toBeLessThan(128);
        expect(() => createMapLoadAlias(-1, digest)).toThrow(/familyIndex/);
        expect(() => createMapLoadAlias(1_000_000, digest)).toThrow(/familyIndex/);
        expect(() => createMapLoadAlias(1, "A".repeat(64))).toThrow(/lowercase hexadecimal/);
    });

    it("removes only an empty authenticated worker sandbox", () => {
        const root = fs.mkdtempSync(path.join(os.tmpdir(), "worker-sandbox-cleanup-"));
        const outputParent = path.join(root, "attempt");
        const sandbox = path.join(outputParent, "map-sandbox");
        try {
            fs.mkdirSync(outputParent, { mode: 0o700 });
            fs.mkdirSync(sandbox, { mode: 0o700 });
            expect(removeEmptyWorkerSandbox(sandbox, outputParent)).toBe(true);
            expect(fs.existsSync(sandbox)).toBe(false);

            fs.mkdirSync(sandbox, { mode: 0o700 });
            fs.writeFileSync(path.join(sandbox, "retained.map"), "private evidence");
            expect(removeEmptyWorkerSandbox(sandbox, outputParent)).toBe(false);
            expect(fs.existsSync(sandbox)).toBe(true);
        } finally {
            fs.rmSync(root, { recursive: true, force: true });
        }
    });

    it("fails on finite-root case collisions and exclusively materializes one regular alias", () => {
        const fixture = makeFixture();
        try {
            const alias = createMapLoadAlias(7, fixture.digest);
            const collision = path.join(fixture.roots[0].path, alias.toUpperCase());
            fs.writeFileSync(collision, "decoy");
            const resCollision = path.join(fixture.roots[1].path, alias);
            const sandboxCollision = path.join(fixture.roots[2].path, alias.replace("cdfid", "CDFID"));
            fs.mkdirSync(resCollision);
            fs.symlinkSync(fixture.sourcePath, sandboxCollision);
            expect(findAliasCollisions(fixture.roots, alias)).toMatchObject([
                { rootLabel: "mix_dir", name: alias.toUpperCase(), kind: "regular_file" },
                { rootLabel: "game_api_res", name: alias, kind: "directory" },
                { rootLabel: "private_cwd", name: path.basename(sandboxCollision), kind: "symbolic_link" },
            ]);
            expect(() => assertAliasAbsent(fixture.roots, alias)).toThrow(/collides/);
            fs.unlinkSync(collision);
            fs.rmdirSync(resCollision);
            fs.unlinkSync(sandboxCollision);

            const result = materialize(fixture);
            expect(fs.lstatSync(result.aliasPath).isFile()).toBe(true);
            expect(fs.readFileSync(result.aliasPath)).toEqual(fixture.bytes);
            expect(result.resolutionRoots.map((root) => root.label)).toEqual([
                "mix_dir",
                "game_api_res",
                "private_cwd",
            ]);
            expect(result.resolutionRoots[0].path).toBe(fs.realpathSync(fixture.mix));
            expect(result.resolutionRoots[1].path).toBe(validateMapLoadCompatibility().paths.gameApiResDirectory);
            expect(result.resolutionRoots[2].path).toBe(fs.realpathSync(fixture.sandbox));
            expect(findAliasCollisions(fixture.roots, result.alias)).toHaveLength(1);
            expect(() => materialize(fixture)).toThrow(/collides/);
        } finally {
            fs.rmSync(fixture.root, { recursive: true, force: true });
        }
    });

    it("fsyncs file and directory state and rolls publication back after a post-link failure", () => {
        const successFixture = makeFixture();
        const failureFixture = makeFixture();
        const nativeFsync = fs.fsyncSync;
        try {
            const observedKinds: string[] = [];
            fs.fsyncSync = ((descriptor: number): void => {
                observedKinds.push(fs.fstatSync(descriptor).isDirectory() ? "directory" : "file");
                nativeFsync(descriptor);
            }) as typeof fs.fsyncSync;
            const result = materialize(successFixture);
            expect(observedKinds).toContain("file");
            expect(observedKinds).toContain("directory");
            expect(fs.existsSync(result.aliasPath)).toBe(true);

            let injected = false;
            fs.fsyncSync = ((descriptor: number): void => {
                if (!injected && fs.fstatSync(descriptor).isDirectory()) {
                    injected = true;
                    throw new Error("injected directory fsync failure");
                }
                nativeFsync(descriptor);
            }) as typeof fs.fsyncSync;
            const failedAlias = createMapLoadAlias(7, failureFixture.digest);
            expect(() => materialize(failureFixture)).toThrow(/injected directory fsync failure/);
            expect(injected).toBe(true);
            expect(fs.existsSync(path.join(failureFixture.sandbox, failedAlias))).toBe(false);
            expect(fs.readdirSync(failureFixture.sandbox)).toEqual([]);
        } finally {
            fs.fsyncSync = nativeFsync;
            fs.rmSync(successFixture.root, { recursive: true, force: true });
            fs.rmSync(failureFixture.root, { recursive: true, force: true });
        }
    });

    it("rejects cloned descriptors instead of trusting caller-supplied labeled roots", async () => {
        const fixture = makeFixture();
        try {
            const map = materialize(fixture);
            const cloned = {
                ...map,
                resolutionRoots: fixture.roots,
            } as MaterializedMapAlias;
            await expect(
                withMapLoadAttestation({
                    materialized: cloned,
                    operation: async () => undefined,
                }),
            ).rejects.toThrow(/not issued by this attestor instance/);
        } finally {
            fs.rmSync(fixture.root, { recursive: true, force: true });
        }
    });

    it("attests the exact 1+2+2 read sequence and returns in-memory byte snapshots", async () => {
        const fixture = makeFixture();
        try {
            const map = materialize(fixture);
            let finalSnapshot: File | null = null;
            const result = await withMapLoadAttestation({
                materialized: map,
                operation: async (session) => {
                    await session.runPhase("initialization", async () => {
                        await readAlias(map, MAP_LOAD_PHASE_READ_COUNTS.initialization);
                    });
                    await session.runPhase("forward_create", async () => {
                        await readAlias(map, MAP_LOAD_PHASE_READ_COUNTS.forward_create);
                    });
                    await session.runPhase("reverse_create", async () => {
                        const snapshots = await readAlias(map, MAP_LOAD_PHASE_READ_COUNTS.reverse_create);
                        finalSnapshot = snapshots[snapshots.length - 1];
                    });
                    return "complete";
                },
            });

            expect(result.value).toBe("complete");
            expect(result.evidence.complete).toBe(true);
            expect(result.evidence.reads.map((record) => record.phase)).toEqual([
                "initialization",
                "forward_create",
                "forward_create",
                "reverse_create",
                "reverse_create",
            ]);
            expect(result.evidence.reads.every((record) => record.sha256 === fixture.digest)).toBe(true);
            expect(result.evidence.reads.every((record) => record.inMemorySnapshot)).toBe(true);

            fs.chmodSync(map.aliasPath, 0o600);
            fs.writeFileSync(map.aliasPath, "mutated on disk");
            expect(Buffer.from(await (finalSnapshot as unknown as File).arrayBuffer())).toEqual(fixture.bytes);
        } finally {
            fs.rmSync(fixture.root, { recursive: true, force: true });
        }
    });

    it("preserves 1+2+2 evidence when each order fails after its first engine preparation read", async () => {
        const fixture = makeFixture();
        try {
            const map = materialize(fixture);
            const result = await withMapLoadAttestation({
                materialized: map,
                operation: async (session) => {
                    await session.runPhase("initialization", async () => void (await readAlias(map, 1)));
                    const captures = [];
                    for (const phase of ["forward_create", "reverse_create"] as const) {
                        const captured = await session.runPhase(phase, async () =>
                            captureConsoleWarnings(`mock-engine:${phase}`, async () => {
                                await completeAttestedMapSettingsReadPair(async () => {
                                    await readAlias(map, 1);
                                    throw new Error("synthetic first-read map compatibility failure");
                                });
                            }),
                        );
                        captures.push(captured);
                    }
                    return captures;
                },
            });

            expect(result.value).toHaveLength(2);
            expect(result.value.every((capture) => capture.error instanceof Error)).toBe(true);
            expect(result.evidence.phases).toEqual([
                { phase: "initialization", expectedReads: 1, observedReads: 1 },
                { phase: "forward_create", expectedReads: 2, observedReads: 2 },
                { phase: "reverse_create", expectedReads: 2, observedReads: 2 },
            ]);
            expect(result.evidence.reads).toHaveLength(5);
            expect(result.evidence.complete).toBe(true);

            removeMaterializedMapAlias(map);
            expect(fs.existsSync(map.aliasPath)).toBe(false);
            expect(fs.existsSync(map.sandboxDirectory)).toBe(false);
        } finally {
            fs.rmSync(fixture.root, { recursive: true, force: true });
        }
    });

    it("passes non-alias reads through without counting them", async () => {
        const fixture = makeFixture();
        try {
            const map = materialize(fixture);
            const otherPath = path.join(fixture.sandbox, "other.ini");
            fs.writeFileSync(otherPath, "[Other]\nValue=1\n");
            const result = await withMapLoadAttestation({
                materialized: map,
                operation: async (session) => {
                    await session.runPhase("initialization", async () => {
                        const other = await new NodeAdapterFileHandle(otherPath, "other.ini").getFile();
                        expect(Buffer.from(await other.arrayBuffer()).toString("utf8")).toContain("Value=1");
                        await readAlias(map, 1);
                    });
                    await session.runPhase("forward_create", async () => void (await readAlias(map, 2)));
                    await session.runPhase("reverse_create", async () => void (await readAlias(map, 2)));
                },
            });
            expect(result.evidence.reads).toHaveLength(5);
        } finally {
            fs.rmSync(fixture.root, { recursive: true, force: true });
        }
    });

    it("fails closed on a correct alias opened from the wrong runtime path", async () => {
        const fixture = makeFixture();
        const originalCwd = process.cwd();
        const originalDescriptor = Object.getOwnPropertyDescriptor(NodeAdapterFileHandle.prototype, "getFile");
        try {
            const map = materialize(fixture);
            const wrongDirectory = path.join(fixture.root, "wrong");
            fs.mkdirSync(wrongDirectory, { mode: 0o700 });
            const wrongPath = path.join(wrongDirectory, map.alias);
            fs.writeFileSync(wrongPath, fixture.bytes);
            await expect(
                withMapLoadAttestation({
                    materialized: map,
                    operation: async (session) => {
                        await session.runPhase("initialization", async () => {
                            await new NodeAdapterFileHandle(wrongPath, map.alias).getFile();
                        });
                    },
                }),
            ).rejects.toThrow(/unexpected name or path/);
            expect(process.cwd()).toBe(originalCwd);
            expect(Object.getOwnPropertyDescriptor(NodeAdapterFileHandle.prototype, "getFile")).toEqual(
                originalDescriptor,
            );
        } finally {
            fs.rmSync(fixture.root, { recursive: true, force: true });
        }
    });

    it("fails on missing reads and restores the exact cwd and prototype after an exception", async () => {
        const fixture = makeFixture();
        const originalCwd = process.cwd();
        const originalDescriptor = Object.getOwnPropertyDescriptor(NodeAdapterFileHandle.prototype, "getFile");
        try {
            const map = materialize(fixture);
            await expect(
                withMapLoadAttestation({
                    materialized: map,
                    operation: async (session) => {
                        await session.runPhase("initialization", async () => undefined);
                    },
                }),
            ).rejects.toThrow(/observed 0 reads; expected 1/);
            expect(process.cwd()).toBe(originalCwd);
            expect(Object.getOwnPropertyDescriptor(NodeAdapterFileHandle.prototype, "getFile")).toEqual(
                originalDescriptor,
            );
        } finally {
            fs.rmSync(fixture.root, { recursive: true, force: true });
        }
    });

    it("clears the process-global session even when prototype restoration itself throws", async () => {
        const fixture = makeFixture();
        const nativeDefineProperty = Object.defineProperty;
        const originalDescriptor = Object.getOwnPropertyDescriptor(NodeAdapterFileHandle.prototype, "getFile");
        let enteredSecondSession = false;
        try {
            expect(originalDescriptor).toBeDefined();
            const map = materialize(fixture);
            await expect(
                withMapLoadAttestation({
                    materialized: map,
                    operation: async (session) => {
                        await session.runPhase("initialization", async () => void (await readAlias(map, 1)));
                        await session.runPhase("forward_create", async () => void (await readAlias(map, 2)));
                        await session.runPhase("reverse_create", async () => void (await readAlias(map, 2)));
                        Object.defineProperty = ((target: object, property: PropertyKey, descriptor: PropertyDescriptor) => {
                            if (
                                target === NodeAdapterFileHandle.prototype &&
                                property === "getFile" &&
                                descriptor.value === originalDescriptor?.value
                            ) {
                                throw new Error("injected prototype restore failure");
                            }
                            return nativeDefineProperty(target, property, descriptor);
                        }) as typeof Object.defineProperty;
                    },
                }),
            ).rejects.toThrow(/injected prototype restore failure/);

            Object.defineProperty = nativeDefineProperty;
            await expect(
                withMapLoadAttestation({
                    materialized: map,
                    operation: async () => {
                        enteredSecondSession = true;
                        throw new Error("second session entered");
                    },
                }),
            ).rejects.toThrow(/second session entered/);
            expect(enteredSecondSession).toBe(true);
        } finally {
            Object.defineProperty = nativeDefineProperty;
            if (originalDescriptor) {
                nativeDefineProperty(NodeAdapterFileHandle.prototype, "getFile", originalDescriptor);
            }
            fs.rmSync(fixture.root, { recursive: true, force: true });
        }
    });
});
