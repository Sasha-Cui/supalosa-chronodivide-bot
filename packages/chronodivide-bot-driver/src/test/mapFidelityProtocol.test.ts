import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
    BUNDLE_HASH_ALGORITHM,
    BundleDescriptor,
    TREE_HASH_ALGORITHM,
    TreeDescriptor,
    assertPinnedLoggingMode,
    assertStrictFidelityProbeResult,
    captureConsoleWarnings,
    classifyConsoleMessage,
    deriveProbeCoverage,
    diagnosticSha256,
    fatalDiagnosticLine,
    sanitizeDiagnosticText,
    serializeCapturedError,
    serializeCapturedWarning,
    sha256File,
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
        const coverage = deriveProbeCoverage(
            {
                criterion: "all role-blind targets",
                forbiddenCriterion: "any split assignment",
                roleBlind: true,
                scope: "preflight",
                populationFamilyCount: 127,
                familyCount: 3,
                representativeField: "representativeMapPath",
                preflightRule: "deterministic hash rule",
            },
            3,
            3,
        );
        expect(coverage).toMatchObject({
            artifactKind: "infrastructure_fidelity_preflight_probe_not_clearance",
            scope: "preflight",
            populationFamilyCount: 127,
            runFamilyCount: 3,
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
                { path: "a.txt", bytes: 5, sha256: sha256File(first) },
                { path: "nested/b.bin", bytes: 3, sha256: sha256File(second) },
            ];
            const treeDigest = createHash("sha256");
            for (const entry of entries) {
                treeDigest.update(entry.path);
                treeDigest.update("\0");
                treeDigest.update(String(entry.bytes));
                treeDigest.update("\0");
                treeDigest.update(entry.sha256);
                treeDigest.update("\0");
            }
            const descriptor: TreeDescriptor = {
                root,
                fileCount: 2,
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
