import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import {
    ASSETS,
    DRIVER,
    REPO,
    ROOT,
    read,
} from "./fresh-dual-inputs-v1.mjs";

export const FRESH_DUAL_EXECUTION_ROOT = path.join(ROOT, "execution-v1");
export const FRESH_DUAL_FREEZE_DIR = path.join(FRESH_DUAL_EXECUTION_ROOT, "runtime-freeze");
export const FRESH_DUAL_FREEZE_FILE = path.join(FRESH_DUAL_FREEZE_DIR, "runtime-freeze.json");
const hash = (value) => crypto.createHash("sha256").update(value).digest("hex");
const git = (cwd, ...args) => execFileSync("git", args, { cwd, encoding: "utf8" }).trim();

const hashTree = (rootValue) => {
    const root = path.resolve(rootValue);
    const entries = [];
    const visit = (directory) => {
        for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
            const absolutePath = path.join(directory, entry.name);
            const relativePath = path.relative(root, absolutePath);
            if (entry.isDirectory()) visit(absolutePath);
            else if (entry.isFile()) entries.push({
                relativePath,
                absolutePath,
                bytes: fs.statSync(absolutePath).size,
                symlinkTarget: null,
            });
            else if (entry.isSymbolicLink()) {
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
    const digest = crypto.createHash("sha256");
    for (const entry of entries) {
        digest.update(entry.relativePath);
        digest.update("\0");
        digest.update(entry.symlinkTarget ?? fs.readFileSync(entry.absolutePath));
        digest.update("\0");
    }
    return {
        root,
        files: entries.length,
        bytes: entries.reduce((total, entry) => total + entry.bytes, 0),
        sha256: digest.digest("hex"),
    };
};

export const validateFreshDualFrozenComponents = () => {
    const bytes = read(FRESH_DUAL_FREEZE_FILE);
    const freezeSha256 = hash(bytes);
    assert.equal(
        freezeSha256,
        read(path.join(FRESH_DUAL_FREEZE_DIR, "runtime-freeze.sha256")).toString().trim().split(/\s+/)[0],
    );
    assert.equal(
        read(path.join(FRESH_DUAL_FREEZE_DIR, "COMPLETE")).toString().trim(),
        "COMPLETE_FRESH_DUAL_RUNTIME_FREEZE_V1",
    );
    const manifest = JSON.parse(bytes);
    assert.equal(manifest.complete, true);
    assert.equal(manifest.passed, true);
    const frozen = manifest.frozen;
    assert.equal(git(REPO, "branch", "--show-current"), "main");
    assert.equal(git(REPO, "status", "--porcelain=v1", "--untracked-files=no"), "");
    const currentSourceCommit = git(REPO, "rev-parse", "HEAD");
    assert.equal(currentSourceCommit, git(REPO, "rev-parse", "fork/main"));
    execFileSync("git", ["merge-base", "--is-ancestor", frozen.sourceCommit, currentSourceCommit], {
        cwd: REPO,
        stdio: "ignore",
    });
    for (const [relative, expected] of Object.entries(frozen.files)) {
        const file = path.join(REPO, relative);
        assert.ok(fs.lstatSync(file).isFile(), `Frozen file missing: ${relative}`);
        assert.equal(hash(read(file)), expected, `Frozen file drifted: ${relative}`);
    }
    const candidateTree = hashTree(frozen.candidatePolicy.runtimeTree.root);
    const externalTree = hashTree(frozen.externalSupalosa.runtimeTree.root);
    assert.deepEqual(candidateTree, frozen.candidatePolicy.runtimeTree);
    assert.deepEqual(externalTree, frozen.externalSupalosa.runtimeTree);
    assert.equal(
        git(frozen.externalSupalosa.repoRoot, "rev-parse", "HEAD"),
        frozen.externalSupalosa.commit,
    );
    assert.equal(git(frozen.externalSupalosa.repoRoot, "status", "--porcelain=v1"), "");
    const requireDriver = createRequire(path.join(DRIVER, "package.json"));
    const gameApiPath = fs.realpathSync(requireDriver.resolve("@chronodivide/game-api"));
    assert.equal(gameApiPath, frozen.gameApi.path);
    assert.equal(hash(read(gameApiPath)), frozen.gameApi.sha256);
    const requireExternal = createRequire(path.join(frozen.externalSupalosa.packageRoot, "package.json"));
    assert.equal(
        fs.realpathSync(requireExternal.resolve("@chronodivide/game-api")),
        frozen.gameApi.externalBaselineResolvedPath,
    );
    assert.equal(frozen.assets.root, ASSETS);
    assert.equal(frozen.assets.entries.length, frozen.assets.count);
    for (const entry of frozen.assets.entries) {
        const file = path.join(ASSETS, entry.name);
        assert.ok(fs.lstatSync(file).isFile(), `Frozen asset missing: ${entry.name}`);
        assert.equal(hash(read(file)), entry.sha256, `Frozen asset drifted: ${entry.name}`);
    }
    for (const map of frozen.maps) {
        assert.ok(fs.lstatSync(map.absolutePath).isFile(), `Frozen map missing: ${map.id}`);
        assert.equal(hash(read(map.absolutePath)), map.sha256, `Frozen map drifted: ${map.id}`);
    }
    assert.equal(hash(read(frozen.ra2WebAdvanced.bundlePath)), frozen.ra2WebAdvanced.bundleSha256);
    assert.equal(hash(read(frozen.ra2WebAdvanced.manifestPath)), frozen.ra2WebAdvanced.manifestSha256);
    assert.equal(
        hash(read(path.join(ROOT, "selection/finalizer/selection.json"))),
        frozen.selectionSha256,
    );
    assert.equal(hash(read(path.join(ROOT, "audit/seed-audit.json"))), frozen.seedAuditSha256);
    return {
        manifest,
        frozen,
        freezeSha256,
        frozenSourceCommit: frozen.sourceCommit,
        currentSourceCommit,
        candidateTree,
        externalTree,
        verifiedFiles: Object.keys(frozen.files).length,
        verifiedAssets: frozen.assets.count,
        verifiedMaps: frozen.maps.length,
    };
};
