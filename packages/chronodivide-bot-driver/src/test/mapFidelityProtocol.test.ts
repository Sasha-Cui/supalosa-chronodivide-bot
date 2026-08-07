import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
    BUNDLE_HASH_ALGORITHM,
    BundleDescriptor,
    EXPANDED_PREFLIGHT_RULE,
    TREE_HASH_ALGORITHM,
    TreeDescriptor,
    assertPinnedLoggingMode,
    assertStrictFamilyWorkerShard,
    assertStrictFidelityProbeResult,
    canonicalJson,
    captureConsoleWarnings,
    classifyConsoleMessage,
    deriveProbeCoverage,
    diagnosticSha256,
    fatalDiagnosticLine,
    sanitizeDiagnosticText,
    serializeCapturedError,
    serializeCapturedWarning,
    sha256File,
    treeCompositeSha256,
    validateReciprocalStarts,
    verifyBundleDescriptor,
    verifyTreeDescriptor,
} from "../benchmark/mapFidelityProtocol.js";

describe("outcome-free map fidelity protocol", () => {
    it("categorizes known parser and asset warnings", () => {
        expect(classifyConsoleMessage("warn", 'File "isourb.mix" not found')).toMatchObject({
            category: "missing_asset",
            severity: "fail",
        });
        expect(classifyConsoleMessage("warn", 'Unsupported theater "Desert"')).toMatchObject({
            category: "unsupported_theater",
            severity: "fail",
        });
        expect(classifyConsoleMessage("warn", "Invalid terrain tile 511")).toMatchObject({
            category: "invalid_terrain",
            severity: "review",
        });
        expect(classifyConsoleMessage("info", "Loaded map resources")).toBeNull();
        expect(classifyConsoleMessage("error", "Unknown object reference FOO")).toMatchObject({
            category: "invalid_object",
            severity: "fail",
        });
        expect(sanitizeDiagnosticText("alpha was defeated; winner beta; score 10")).toBe(
            "alpha was [outcome-redacted]; [outcome-redacted] beta; [outcome-redacted] 10",
        );
    });

    it("captures a synthetic console.warn and restores the console exactly", async () => {
        const originalWarn = console.warn;
        const captured = await captureConsoleWarnings("synthetic-warning-test", async () => {
            console.warn("Invalid terrain tile %d", 511);
            return "complete";
        });

        expect(captured.value).toBe("complete");
        expect(captured.error).toBeNull();
        expect(captured.truncated).toBe(false);
        expect(captured.warnings).toEqual([
            {
                phase: "synthetic-warning-test",
                level: "warn",
                category: "invalid_terrain",
                severity: "review",
                text: "Invalid terrain tile 511",
            },
        ]);
        expect(serializeCapturedWarning(captured.warnings[0])).toEqual({
            phase: "synthetic-warning-test",
            level: "warn",
            category: "invalid_terrain",
            severity: "review",
            diagnosticSha256: diagnosticSha256("Invalid terrain tile 511"),
        });
        expect(console.warn).toBe(originalWarn);
    });

    it("suppresses and hashes emitWarning plus direct process stream writes", async () => {
        const originalEmitWarning = process.emitWarning;
        const originalStdoutWrite = process.stdout.write;
        const originalStderrWrite = process.stderr.write;
        let callbackRan = false;
        const captured = await captureConsoleWarnings("all-diagnostics", async () => {
            process.emitWarning("Unknown waypoint reference");
            process.stdout.write("plain direct stdout diagnostic", () => {
                callbackRan = true;
            });
            process.stderr.write("plain direct stderr diagnostic");
            return "done";
        });

        expect(captured.value).toBe("done");
        expect(captured.error).toBeNull();
        expect(callbackRan).toBe(true);
        expect(captured.warnings.map(({ level, category, severity }) => ({ level, category, severity }))).toEqual([
            { level: "warn", category: "invalid_waypoint", severity: "fail" },
            { level: "info", category: "other_warning", severity: "review" },
            { level: "error", category: "engine_error", severity: "fail" },
        ]);
        expect(process.emitWarning).toBe(originalEmitWarning);
        expect(process.stdout.write).toBe(originalStdoutWrite);
        expect(process.stderr.write).toBe(originalStderrWrite);
    });

    it("matches Python ensure_ascii canonical JSON for evidence bindings", () => {
        expect(canonicalJson({ é: "🙂", z: 1 })).toBe(
            '{"z":1,"\\u00e9":"\\ud83d\\ude42"}',
        );
        expect(() => canonicalJson({ timeout: 120.5 })).toThrow(/safe integers/);
    });

    it("hashes fatal diagnostics without serializing raw names, messages, or stacks", () => {
        const rawMessage = "WinnerError_score_total: alpha was defeated";
        const serialized = serializeCapturedError(new Error(rawMessage));
        expect(serialized).toEqual({
            category: "engine_error",
            name: "captured_error",
            messageSha256: diagnosticSha256(rawMessage),
        });
        const line = fatalDiagnosticLine(new Error(rawMessage));
        expect(line).toContain(serialized.messageSha256);
        expect(line).not.toMatch(/WinnerError|score_total|defeated|stack/i);
    });

    it("requires sbatch-pinned debug logging and keeps preflight ineligible", () => {
        expect(() => assertPinnedLoggingMode({ debugLogging: "1", source: "sbatch_pinned" }, "1")).not.toThrow();
        expect(() => assertPinnedLoggingMode({ debugLogging: "1", source: "sbatch_pinned" }, "0")).toThrow(
            /DEBUG_LOGGING/,
        );
        const zeroHash = "0".repeat(64);
        const coverage = deriveProbeCoverage(
            {
                criterion: "all role-blind targets",
                forbiddenCriterion: "any split assignment",
                roleBlind: true,
                scope: "preflight",
                populationFamilyCount: 127,
                familyCount: 11,
                representativeField: "representativeMapPath",
                preflightRule: EXPANDED_PREFLIGHT_RULE,
                preflightPlanSha256: zeroHash,
                preflightSelectedCommitmentSha256: zeroHash,
            },
            11,
            11,
        );
        expect(coverage).toMatchObject({
            artifactKind: "infrastructure_fidelity_preflight_probe_not_clearance",
            scope: "preflight",
            populationFamilyCount: 127,
            runFamilyCount: 11,
            fullCoverage: false,
            eligibleForFidelityClearance: false,
        });
        const fullCoverage = deriveProbeCoverage(
            {
                criterion: "all role-blind targets",
                forbiddenCriterion: "any split assignment",
                roleBlind: true,
                scope: "full",
                populationFamilyCount: 127,
                familyCount: 127,
                representativeField: "representativeMapPath",
                preflightRule: null,
                preflightPlanSha256: null,
                preflightSelectedCommitmentSha256: null,
            },
            127,
            127,
        );
        expect(fullCoverage).toMatchObject({
            artifactKind: "infrastructure_fidelity_full_probe_not_policy_evaluation",
            fullCoverage: true,
            eligibleForFidelityClearance: false,
        });
    });

    it("recomputes exact tree and ordered bundle descriptors", () => {
        const root = fs.mkdtempSync(path.join(os.tmpdir(), "map-fidelity-tree-"));
        try {
            fs.mkdirSync(path.join(root, "nested"));
            const first = path.join(root, "a.txt");
            const second = path.join(root, "nested", "b.bin");
            fs.writeFileSync(first, "alpha");
            fs.writeFileSync(second, Buffer.from([0, 1, 2]));
            const entries = [
                { path: "a.txt", kind: "regular_file" as const, bytes: 5, sha256: sha256File(first), target: null },
                {
                    path: "nested/b.bin",
                    kind: "regular_file" as const,
                    bytes: 3,
                    sha256: sha256File(second),
                    target: null,
                },
            ];
            const treeDigest = createHash("sha256");
            for (const entry of entries) {
                treeDigest.update(entry.path);
                treeDigest.update("\0");
                treeDigest.update(entry.kind);
                treeDigest.update("\0");
                treeDigest.update(String(entry.bytes));
                treeDigest.update("\0");
                treeDigest.update(entry.sha256);
                treeDigest.update("\0");
                treeDigest.update(entry.target ?? "");
                treeDigest.update("\0");
            }
            const descriptor: TreeDescriptor = {
                root,
                fileCount: 2,
                symlinkCount: 0,
                bytes: 8,
                sha256: treeDigest.digest("hex"),
                hashAlgorithm: TREE_HASH_ALGORITHM,
                entries,
            };
            expect(verifyTreeDescriptor(descriptor, "fixtureTree")).toBe(descriptor.sha256);
            fs.appendFileSync(first, "drift");
            expect(() => verifyTreeDescriptor(descriptor, "fixtureTree")).toThrow(/tree mismatch/);

            const members = [
                { label: "first", value: "abc" },
                { label: "second", value: "def" },
            ];
            const bundleDigest = createHash("sha256");
            for (const member of members) {
                bundleDigest.update(member.label);
                bundleDigest.update("\0");
                bundleDigest.update(member.value);
                bundleDigest.update("\0");
            }
            const bundle: BundleDescriptor = {
                hashAlgorithm: BUNDLE_HASH_ALGORITHM,
                members,
                sha256: bundleDigest.digest("hex"),
            };
            expect(verifyBundleDescriptor(bundle, members, "fixtureBundle")).toBe(bundle.sha256);
            expect(() => verifyBundleDescriptor(bundle, [...members].reverse(), "fixtureBundle")).toThrow(/in order/);
        } finally {
            fs.rmSync(root, { recursive: true, force: true });
        }
    });

    it("binds symbolic-link targets without traversing them", () => {
        const root = fs.mkdtempSync(path.join(os.tmpdir(), "map-fidelity-symlink-tree-"));
        try {
            const targetPath = path.join(root, "target.txt");
            fs.writeFileSync(targetPath, "payload");
            fs.symlinkSync("target.txt", path.join(root, "link.txt"));
            const target = "target.txt";
            const targetBytes = Buffer.from(target, "utf8");
            const entries = [
                {
                    path: "link.txt",
                    kind: "symbolic_link" as const,
                    bytes: targetBytes.byteLength,
                    sha256: createHash("sha256").update(targetBytes).digest("hex"),
                    target,
                },
                {
                    path: "target.txt",
                    kind: "regular_file" as const,
                    bytes: 7,
                    sha256: sha256File(targetPath),
                    target: null,
                },
            ];
            const descriptor: TreeDescriptor = {
                root,
                fileCount: 2,
                symlinkCount: 1,
                bytes: targetBytes.byteLength + 7,
                sha256: treeCompositeSha256(entries),
                hashAlgorithm: TREE_HASH_ALGORITHM,
                entries,
            };
            expect(verifyTreeDescriptor(descriptor, "symlinkTree")).toBe(descriptor.sha256);
        } finally {
            fs.rmSync(root, { recursive: true, force: true });
        }
    });

    it("rejects unknown fields in the outcome-free probe artifact", () => {
        const zeroHash = "0".repeat(64);
        const result = {
            schemaVersion: 1,
            gate: "map-fidelity-gate-v1",
            outcomeFree: true,
            artifactKind: "infrastructure_fidelity_preflight_probe_not_clearance",
            scheduler: { jobId: "123", account: "pi_jss233", partition: "devel", qos: null, source: "scontrol" },
            manifestPath: "/private/manifest.json",
            manifestSha256: zeroHash,
            logging: { debugLogging: "1", source: "sbatch_pinned" },
            runtimeHashes: {
                packageLockSha256: zeroHash,
                gameApiPackageSha256: zeroHash,
                gameApiRuntimeSha256: zeroHash,
                compiledProbeSha256: zeroHash,
                gameApiRuntimeTreeSha256: zeroHash,
                runtimeDependencyTreeSha256: zeroHash,
                mixTreeSha256: zeroHash,
                sourceBundleSha256: zeroHash,
                runtimeBundleSha256: zeroHash,
            },
            scope: "preflight",
            populationFamilyCount: 127,
            runFamilyCount: 0,
            fullCoverage: false,
            eligibleForFidelityClearance: false,
            initialization: { succeeded: false, warnings: [], warningCaptureTruncated: false, error: null },
            familyCountRequested: 3,
            familyCountRun: 0,
            families: [],
        };
        expect(() => assertStrictFidelityProbeResult(result)).not.toThrow();
        expect(() => assertStrictFidelityProbeResult({ ...result, score: 1 })).toThrow(/keys must be exactly/);
    });

    it("strictly validates a complete one-family 1+2+2 worker shard", () => {
        const zeroHash = "0".repeat(64);
        const oneHash = "1".repeat(64);
        const familyId = "mf_fixture";
        const familyIndex = 7;
        const alias = `cdfid-000007-${zeroHash}.map`;
        const aliasPath = `/private/attempt/map-sandbox/${alias}`;
        const starts = {
            alpha: { x: 1, y: 2 },
            beta: { x: 3, y: 4 },
        };
        const probe = (order: ["alpha", "beta"] | ["beta", "alpha"], reverse: boolean) => ({
            order,
            loaded: true,
            initialTick: 0,
            finalTick: 10,
            updates: 10,
            initialTickIsZero: true,
            tickUpdateArithmeticConsistent: true,
            progressedBeyondTickOne: true,
            reachedTargetTick: true,
            starts: reverse ? { alpha: starts.beta, beta: starts.alpha } : starts,
            wallTimeMs: 5,
            warningCaptureTruncated: false,
            error: null,
        });
        const phaseSequence = [
            { phase: "initialization", count: 1 },
            { phase: "forward_create", count: 2 },
            { phase: "reverse_create", count: 2 },
        ] as const;
        const shard = {
            schemaVersion: 1,
            gate: "map-fidelity-gate-v1",
            artifactKind: "map_fidelity_family_worker_shard",
            outcomeFree: true,
            manifestSha256: zeroHash,
            attestationSha256: oneHash,
            family: {
                manifestOrdinal: 0,
                familyIndex,
                familyIdSha256: createHash("sha256").update(familyId).digest("hex"),
                familyEntrySha256: oneHash,
            },
            attemptNumber: 1,
            intentSha256: zeroHash,
            scheduler: {
                jobId: "123",
                account: "pi_jss233",
                partition: "devel",
                qos: null,
                source: "scontrol",
            },
            payload: {
                engineInitialization: {
                    succeeded: true,
                    warnings: [],
                    warningCaptureTruncated: false,
                    error: null,
                },
                familyResult: {
                    familyIndex,
                    familyId,
                    representativeMapPath: "packages/chronodivide-bot-driver/data/fixture.map",
                    mapName: "fixture.map",
                    executedMapAlias: alias,
                    mapBytes: 123,
                    mapSha256: zeroHash,
                    slurmJobId: "123",
                    requestedEngineSeed: 11,
                    targetTick: 10,
                    declaredStartLocations: [
                        { x: 1, y: 2, waypoint: 0, encoded: 2001 },
                        { x: 3, y: 4, waypoint: 1, encoded: 4003 },
                    ],
                    forward: probe(["alpha", "beta"], false),
                    reverse: probe(["beta", "alpha"], true),
                    reciprocalStartCheck: {
                        declaredStartCountValid: true,
                        forwardStartsDistinct: true,
                        reverseStartsDistinct: true,
                        allObservedStartsDeclared: true,
                        reciprocalPhysicalSlots: true,
                        failures: [],
                    },
                    warnings: [],
                    failureCategories: [],
                    reviewCategories: [],
                    fidelityStatus: "pass",
                },
                mapLoadAttestation: {
                    protocol: "unique-rfs-alias-adapter-snapshot-v1",
                    alias,
                    aliasPath,
                    expectedBytes: 123,
                    expectedSha256: zeroHash,
                    phases: phaseSequence.map(({ phase, count }) => ({
                        phase,
                        expectedReads: count,
                        observedReads: count,
                    })),
                    reads: phaseSequence.flatMap(({ phase, count }) =>
                        Array.from({ length: count }, (_, index) => ({
                            phase,
                            ordinal: index + 1,
                            alias,
                            resolvedPath: aliasPath,
                            bytes: 123,
                            sha256: zeroHash,
                            adapter: "file-system-access/node.FileHandle.getFile",
                            inMemorySnapshot: true,
                        })),
                    ),
                    complete: true,
                },
            },
        };

        expect(() => assertStrictFamilyWorkerShard(shard)).not.toThrow();
        const firstReadCompatibilityFailure = JSON.parse(JSON.stringify(shard));
        for (const order of ["forward", "reverse"]) {
            Object.assign(firstReadCompatibilityFailure.payload.familyResult[order], {
                loaded: false,
                initialTick: null,
                finalTick: null,
                updates: 0,
                initialTickIsZero: false,
                tickUpdateArithmeticConsistent: false,
                progressedBeyondTickOne: false,
                reachedTargetTick: false,
                starts: { alpha: null, beta: null },
                error: {
                    category: "engine_error",
                    name: "captured_error",
                    messageSha256: zeroHash,
                },
            });
        }
        Object.assign(firstReadCompatibilityFailure.payload.familyResult.reciprocalStartCheck, {
            forwardStartsDistinct: false,
            reverseStartsDistinct: false,
            allObservedStartsDeclared: false,
            reciprocalPhysicalSlots: false,
            failures: [
                "forward_duplicate_or_missing_start",
                "observed_start_not_declared",
                "reciprocal_physical_slot_mismatch",
                "reverse_duplicate_or_missing_start",
            ],
        });
        firstReadCompatibilityFailure.payload.familyResult.failureCategories = [
            "forward_engine_error",
            "forward_initial_tick_not_zero",
            "forward_load_failed",
            "forward_no_progress_beyond_tick_1",
            "forward_target_tick_not_reached",
            "forward_tick_update_arithmetic_mismatch",
            ...firstReadCompatibilityFailure.payload.familyResult.reciprocalStartCheck.failures,
            "reverse_engine_error",
            "reverse_initial_tick_not_zero",
            "reverse_load_failed",
            "reverse_no_progress_beyond_tick_1",
            "reverse_target_tick_not_reached",
            "reverse_tick_update_arithmetic_mismatch",
        ].sort();
        firstReadCompatibilityFailure.payload.familyResult.fidelityStatus = "fail";
        expect(() => assertStrictFamilyWorkerShard(firstReadCompatibilityFailure)).not.toThrow();

        const unknownPayload = JSON.parse(JSON.stringify(shard));
        unknownPayload.payload.policyResult = {};
        expect(() => assertStrictFamilyWorkerShard(unknownPayload)).toThrow(/keys must be exactly/);
        const missingRead = JSON.parse(JSON.stringify(shard));
        missingRead.payload.mapLoadAttestation.reads.pop();
        expect(() => assertStrictFamilyWorkerShard(missingRead)).toThrow(/exactly 5/);
        const badArithmetic = JSON.parse(JSON.stringify(shard));
        badArithmetic.payload.familyResult.forward.updates = 9;
        expect(() => assertStrictFamilyWorkerShard(badArithmetic)).toThrow(/ArithmeticConsistent/);
    });

    it("accepts a reciprocal physical-slot assignment", () => {
        const check = validateReciprocalStarts(
            { alpha: { x: 37, y: 63 }, beta: { x: 62, y: 39 } },
            { alpha: { x: 62, y: 39 }, beta: { x: 37, y: 63 } },
            [
                { x: 37, y: 63 },
                { x: 62, y: 39 },
                { x: 50, y: 80 },
                { x: 80, y: 50 },
            ],
        );
        expect(check.failures).toEqual([]);
        expect(check.reciprocalPhysicalSlots).toBe(true);
    });

    it("rejects undeclared and non-reciprocal starts", () => {
        const check = validateReciprocalStarts(
            { alpha: { x: 37, y: 63 }, beta: { x: 62, y: 39 } },
            { alpha: { x: 99, y: 99 }, beta: { x: 62, y: 39 } },
            [
                { x: 37, y: 63 },
                { x: 62, y: 39 },
            ],
        );
        expect(check.failures).toContain("observed_start_not_declared");
        expect(check.failures).toContain("reciprocal_physical_slot_mismatch");
    });
});
