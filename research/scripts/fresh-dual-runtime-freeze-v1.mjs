import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import {
    ASSETS,
    DRIVER,
    REPO,
    ROOT,
    loadPlanInputs,
    read,
} from "../runtime/fresh-dual-inputs-v1.mjs";

const EXPECTED = Object.freeze({
    node: "v20.13.1",
    candidateTree: "c2bfaf67767ef675fbce2f6c00c6164d77f93a2f58501cd9f4424175996598fc",
    candidateFiles: 232,
    externalTree: "34349919500c8019f9d9b1c2b2a7e2269dd57dde6b3414216bb6336e02977199",
    externalFiles: 172,
    externalCommit: "165b77a71d0cf5ebd27c65b19d0486bcbae78d0f",
    gameApi: "dd398f5c8c2b4c3e3d6eb0f9ca6d7549bf70fee16c5950cd8902616ac922497d",
    effectiveGameApi: "4ad4a5dd7a6a8ae53a7e671a29d7dd0a5fbad1916d94e52c69c9eda133a30f0c",
    selection: "ca1641860595e7a15f1d6651e7ddc6a8f4f6f9e64382829c34d3f8f7efde7189",
    seedAudit: "b3efca5e170585ec4c501cb11a7589ff8ec48fb99790c6a47d77d59fc6a32e4d",
    ra2Bundle: "81d8797b6dd1371ba2dcbd79e25df8b42254290c820159e121a82650fd97a143",
    ra2Manifest: "a405c0fc6d1d6541f965582c9b53be0bfd01c0c68f4d0f340e1a5ae37671aa5d",
});
export const EXECUTION_ROOT = path.join(ROOT, "execution-v1");
export const FREEZE_DIR = path.join(EXECUTION_ROOT, "runtime-freeze");
export const FREEZE_FILE = path.join(FREEZE_DIR, "runtime-freeze.json");
const PROJECT = path.dirname(REPO);
const EXTERNAL_ROOT = path.join(PROJECT, "supalosa-chronodivide-bot");
const EXTERNAL_PACKAGE = path.join(EXTERNAL_ROOT, "packages/chronodivide-bot");
const RA2_ROOT = path.join(PROJECT, "research-evidence/ra2web-opponents/source-freeze-v1");
const RELATIVE_FILES = Object.freeze([
    "research/scripts/fresh-dual-runtime-freeze-v1.mjs",
    "research/scripts/fresh-dual-canary-v1.mjs",
    "research/slurm/fresh_dual_canary_v1.sbatch",
    "research/runtime/fresh-dual-endpoint-plan-v1.mjs",
    "research/runtime/fresh-dual-inputs-v1.mjs",
    "research/runtime/explicit-start-loader-v1.mjs",
    "research/runtime/explicit-start-transform-v1.mjs",
    "research/protocols/maps/2026-09-03-fresh-dual-endpoint-remeasurement-v1.md",
    "research/protocols/maps/2026-09-03-fresh-dual-endpoint-seed-amendment-a1.md",
    "packages/chronodivide-bot-driver/dist/benchmark/seededOfflineGame.js",
    "packages/chronodivide-bot-driver/dist/benchmark/baselineLoader.js",
    "packages/chronodivide-bot-driver/dist/training/deployedStrongBotCandidate.js",
    "packages/chronodivide-bot-driver/dist/training/peakProfilePolicies.js",
    "packages/chronodivide-bot-driver/dist/training/ra2WebOpponentBundle.js",
    "packages/chronodivide-bot-driver/dist/training/literalBuildingEliminationEndpoint.js",
    "packages/chronodivide-bot-driver/dist/training/liveOwnedBuildingSnapshotCandidate.js",
    "packages/chronodivide-bot-driver/dist/training/liveOwnedBuildingEliminationEndpointV6.js",
    "packages/chronodivide-bot-driver/dist/training/passiveDualBuildingEndpoint.js",
    "packages/chronodivide-bot-driver/dist/training/freshDualStudyInstrumentation.js",
    "packages/chronodivide-bot-driver/dist/training/freshDualEndpointLedger.js",
    "packages/chronodivide-bot-driver/dist/training/freshDualStudyGame.js",
    "packages/chronodivide-bot-driver/package.json",
    "packages/chronodivide-bot-driver/pnpm-lock.yaml",
]);
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

export const computeFreshDualRuntimeFreeze = () => {
    assert.equal(process.version, EXPECTED.node);
    assert.equal(git(REPO, "branch", "--show-current"), "main");
    assert.equal(git(REPO, "status", "--porcelain=v1"), "");
    const sourceCommit = git(REPO, "rev-parse", "HEAD");
    assert.equal(sourceCommit, git(REPO, "rev-parse", "fork/main"));
    assert.equal(git(EXTERNAL_ROOT, "rev-parse", "HEAD"), EXPECTED.externalCommit);
    assert.equal(git(EXTERNAL_ROOT, "status", "--porcelain=v1"), "");
    const requireDriver = createRequire(path.join(DRIVER, "package.json"));
    const gameApiPath = fs.realpathSync(requireDriver.resolve("@chronodivide/game-api"));
    const strongBotPath = fs.realpathSync(
        requireDriver.resolve("@supalosa/chronodivide-bot/dist/bot/strongBot.js"),
    );
    const candidateDist = path.resolve(strongBotPath, "../..");
    const externalDist = path.join(EXTERNAL_PACKAGE, "dist");
    const requireExternal = createRequire(path.join(EXTERNAL_PACKAGE, "package.json"));
    const externalGameApiPath = fs.realpathSync(requireExternal.resolve("@chronodivide/game-api"));
    assert.equal(externalGameApiPath, gameApiPath);
    const candidateTree = hashTree(candidateDist);
    const externalTree = hashTree(externalDist);
    assert.equal(candidateTree.sha256, EXPECTED.candidateTree);
    assert.equal(candidateTree.files, EXPECTED.candidateFiles);
    assert.equal(externalTree.sha256, EXPECTED.externalTree);
    assert.equal(externalTree.files, EXPECTED.externalFiles);
    assert.equal(hash(read(gameApiPath)), EXPECTED.gameApi);
    const { plan, runtime, fileHashes, assetEntries } = loadPlanInputs();
    assert.equal(fs.realpathSync(runtime), gameApiPath);
    const prepared = JSON.parse(read(path.join(ROOT, "plan.json")).toString("utf8"));
    assert.equal(prepared.complete, true);
    assert.deepEqual(prepared.plan, plan);
    const selectionFile = path.join(ROOT, "selection/finalizer/selection.json");
    const auditFile = path.join(ROOT, "audit/seed-audit.json");
    assert.equal(hash(read(selectionFile)), EXPECTED.selection);
    assert.equal(hash(read(auditFile)), EXPECTED.seedAudit);
    const files = Object.fromEntries(RELATIVE_FILES.map((relative) => {
        const absolute = path.join(REPO, relative);
        assert.ok(fs.lstatSync(absolute).isFile(), `Missing frozen file ${relative}`);
        return [relative, hash(read(absolute))];
    }));
    const maps = plan.maps.map((map) => {
        const absolute = path.join(ASSETS, map.fileName);
        assert.ok(fs.lstatSync(absolute).isFile());
        const sha256 = hash(read(absolute));
        assert.equal(sha256, map.sha256);
        return { ...map, absolutePath: absolute };
    });
    for (const entry of assetEntries) {
        const absolute = path.join(ASSETS, entry.name);
        assert.ok(fs.lstatSync(absolute).isFile());
        assert.equal(hash(read(absolute)), entry.sha256);
    }
    const ra2Manifest = path.join(RA2_ROOT, "freeze-manifest-v1.json");
    const ra2Bundle = path.join(RA2_ROOT, "spbots3.min.js");
    assert.equal(hash(read(ra2Manifest)), EXPECTED.ra2Manifest);
    assert.equal(hash(read(ra2Bundle)), EXPECTED.ra2Bundle);
    return {
        sourceCommit,
        nodeVersion: process.version,
        nodeExecutable: process.execPath,
        planFileSha256: hash(read(path.join(ROOT, "plan.json"))),
        planSha256: prepared.planSha256,
        selectionSha256: EXPECTED.selection,
        seedAuditSha256: EXPECTED.seedAudit,
        inputFileHashes: fileHashes,
        files,
        gameApi: {
            path: gameApiPath,
            sha256: EXPECTED.gameApi,
            effectiveSha256: EXPECTED.effectiveGameApi,
            externalBaselineResolvedPath: externalGameApiPath,
        },
        candidatePolicy: {
            strongBotImportPath: strongBotPath,
            runtimeTree: candidateTree,
        },
        externalSupalosa: {
            repoRoot: EXTERNAL_ROOT,
            packageRoot: EXTERNAL_PACKAGE,
            commit: EXPECTED.externalCommit,
            runtimeTree: externalTree,
        },
        ra2WebAdvanced: {
            freezeRoot: RA2_ROOT,
            opponentId: "ra2web_advanced_old_priest",
            bundlePath: ra2Bundle,
            bundleSha256: EXPECTED.ra2Bundle,
            manifestPath: ra2Manifest,
            manifestSha256: EXPECTED.ra2Manifest,
            clientCommit: "218fb800614295119e25040986b175fee4c3670f",
            release: "0.84.1-r1d35349-dd6a17b9c",
            expectedVersion: "0.83.1-bot3",
            expectedBuildId: "ra2web-0.83.1-ai-old-priest-phase258-20260716",
        },
        assets: {
            root: ASSETS,
            count: assetEntries.length,
            entries: assetEntries,
        },
        maps,
        policies: {
            deployed: { factory: "createDeployedStrongBotCandidate", strategyOptions: {}, botOptions: {} },
            peakStrategyBoth: {
                factory: "createPeakProfileCandidate",
                arm: "strategy_both",
                strategyScope: "both",
                botScope: "weak_only",
            },
            supalosaReference: { factory: "external BaselineFactory.create" },
        },
        canaries: plan.canaries,
        competitiveAssignments: plan.games,
        competitiveRunAuthorized: false,
    };
};

export const loadAndVerifyFreshDualRuntimeFreeze = () => {
    const bytes = read(FREEZE_FILE);
    const sidecar = read(path.join(FREEZE_DIR, "runtime-freeze.sha256")).toString().trim().split(/\s+/)[0];
    assert.equal(hash(bytes), sidecar);
    assert.equal(
        read(path.join(FREEZE_DIR, "COMPLETE")).toString().trim(),
        "COMPLETE_FRESH_DUAL_RUNTIME_FREEZE_V1",
    );
    const manifest = JSON.parse(bytes);
    assert.equal(manifest.complete, true);
    assert.equal(manifest.passed, true);
    assert.deepEqual(manifest.frozen, computeFreshDualRuntimeFreeze());
    return { manifest, sha256: sidecar };
};

const main = () => {
    assert.ok(!fs.existsSync(FREEZE_DIR), "Preserve an existing runtime freeze");
    const frozen = computeFreshDualRuntimeFreeze();
    fs.mkdirSync(FREEZE_DIR, { recursive: true, mode: 0o700 });
    const file = JSON.stringify({
        kind: "fresh-dual-runtime-policy-freeze-v1",
        complete: true,
        passed: true,
        createdAt: new Date().toISOString(),
        frozen,
    }, null, 2) + "\n";
    fs.writeFileSync(FREEZE_FILE, file, { flag: "wx", mode: 0o600 });
    fs.writeFileSync(
        path.join(FREEZE_DIR, "runtime-freeze.sha256"),
        `${hash(file)}  runtime-freeze.json\n`,
        { flag: "wx", mode: 0o600 },
    );
    fs.writeFileSync(
        path.join(FREEZE_DIR, "COMPLETE"),
        "COMPLETE_FRESH_DUAL_RUNTIME_FREEZE_V1\n",
        { flag: "wx", mode: 0o600 },
    );
    console.log(JSON.stringify({
        complete: true,
        sourceCommit: frozen.sourceCommit,
        candidateTree: frozen.candidatePolicy.runtimeTree.sha256,
        externalTree: frozen.externalSupalosa.runtimeTree.sha256,
        assets: frozen.assets.count,
        maps: frozen.maps.length,
        competitiveRunAuthorized: false,
    }));
};

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    try {
        main();
    } catch (error) {
        console.error(error instanceof Error ? error.stack : String(error));
        process.exitCode = 1;
    }
}
