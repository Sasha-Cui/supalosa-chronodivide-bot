#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import zlib from "node:zlib";

const PROGRAM = fileURLToPath(import.meta.url);
const REPO = path.resolve(path.dirname(PROGRAM), "../..");
const PROJECT = path.dirname(REPO);
const DRIVER = path.join(REPO, "packages", "chronodivide-bot-driver");
const STUDY = path.join(PROJECT, "research-evidence", "action-burst-diagnostic-v1");
const EXECUTION = path.join(STUDY, "execution-v1-a4-runtime-a1-certificate-a1");
const RUNTIME_FREEZE = path.join(
    PROJECT,
    "research-evidence",
    "fresh-dual-endpoint-v1",
    "execution-v1",
    "runtime-freeze",
    "runtime-freeze.json",
);
const RUNTIME_FREEZE_SHA256 = "be47027c8526daa961500a1ca2acc3c04dd1a487460d4dec78361faa03ece649";
const SEED_AUDIT = path.join(STUDY, "seed-audit-v1-a2", "seed-audit.json");
const SEED_AUDIT_SHA256 = "ac9c2100702750270e4bc9df311fbdff62aca29a933687e44d16d18f7318a231";
const SEED_CERTIFICATE = path.join(
    STUDY, "seed-certificate-v1-a2", "selection-certificate.json",
);
const SEED_CERTIFICATE_SHA256 = "e53ce72c0fa6fbe56151cf20a11cfd414e0ca88760f02f87e92ee98d36cc3165";
const SELECTED_INTERVAL = [3010000000, 3011000000];
const TRACE_LIMIT = 2 * 1024 * 1024;
const TOTAL_TRACE_LIMIT = 2 * 1024 * 1024 * 1024;
const FILE_LIMIT = 4000;
const SHA256 = /^[0-9a-f]{64}$/;
const COMPLETE_RE = /^COMPLETE_ACTION_BURST_TRACE_V1 ([0-9a-f]{64}) ([0-9]+)$/;

const requireDriver = createRequire(path.join(DRIVER, "package.json"));
const gameApiPath = fs.realpathSync(requireDriver.resolve("@chronodivide/game-api"));
const gameApi = await import(pathToFileURL(gameApiPath).href);
const {
    buildActionBurstDiagnosticPlan,
    validateActionBurstDiagnosticPlan,
} = await import(pathToFileURL(path.join(
    DRIVER, "dist", "training", "actionBurstDiagnosticPlan.js",
)).href);
const {
    TimestampedActionAudit,
    installTimestampedActionAudit,
    rejectActionBurstProhibitedFields,
} = await import(pathToFileURL(path.join(
    DRIVER, "dist", "training", "timestampedActionAudit.js",
)).href);
const {
    actionBurstDistribution,
    deriveActionBurstReserve,
    summarizeActionBurstEvents,
} = await import(pathToFileURL(path.join(
    DRIVER, "dist", "training", "actionBurstTemporalSummary.js",
)).href);
const { FRESH_DUAL_ACTION_METHODS } = await import(pathToFileURL(path.join(
    DRIVER, "dist", "training", "freshDualStudyInstrumentation.js",
)).href);
const ACTION_CLASSES = new Set([
    "order", "gameplay_nonorder", "debug_or_communication", "suppressed_quit",
]);
const { createDeployedStrongBotCandidate } = await import(pathToFileURL(path.join(
    DRIVER, "dist", "training", "deployedStrongBotCandidate.js",
)).href);
const { loadBaselineFactory } = await import(pathToFileURL(path.join(
    DRIVER, "dist", "benchmark", "baselineLoader.js",
)).href);
const { withSeededOfflineGame } = await import(pathToFileURL(path.join(
    DRIVER, "dist", "benchmark", "seededOfflineGame.js",
)).href);
const {
    createInspectableRa2WebBot,
    loadRa2WebOpponent,
} = await import(pathToFileURL(path.join(
    DRIVER, "dist", "training", "ra2WebOpponentBundle.js",
)).href);

const hash = (value) => crypto.createHash("sha256").update(value).digest("hex");
const read = (file) => fs.readFileSync(file);
const sha256File = (file) => hash(read(file));
const json = (file) => JSON.parse(read(file));
const git = (...args) => execFileSync("git", args, { cwd: REPO, encoding: "utf8" }).trim();
const required = (name) => {
    const value = process.env[name];
    if (!value) throw new Error("Missing environment value " + name);
    return value;
};
const requiredHash = (name) => {
    const value = required(name);
    if (!SHA256.test(value)) throw new Error("Invalid SHA-256 environment value " + name);
    return value;
};
const exactJson = (left, right, message) => {
    if (JSON.stringify(left) !== JSON.stringify(right)) throw new Error(message);
};
const writeExclusive = (file, value) => {
    fs.writeFileSync(file, value, { flag: "wx", mode: 0o600 });
};
const canonical = (value) => JSON.stringify(value);

const hashTree = (rootValue, bytewise = false) => {
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
            } else throw new Error("Unsupported runtime tree entry");
        }
    };
    visit(root);
    entries.sort((left, right) => bytewise
        ? Buffer.compare(Buffer.from(left.relativePath), Buffer.from(right.relativePath))
        : left.relativePath.localeCompare(right.relativePath));
    const digest = crypto.createHash("sha256");
    for (const entry of entries) {
        digest.update(entry.relativePath);
        digest.update("\0");
        digest.update(entry.symlinkTarget ?? read(entry.absolutePath));
        digest.update("\0");
    }
    return {
        root,
        files: entries.length,
        bytes: entries.reduce((total, entry) => total + entry.bytes, 0),
        sha256: digest.digest("hex"),
    };
};

const sourceIdentity = () => {
    const sourceCommit = required("SOURCE_COMMIT");
    const programSha256 = requiredHash("PROGRAM_SHA256");
    if (
        git("branch", "--show-current") !== "main" ||
        git("status", "--porcelain=v1") !== "" ||
        git("rev-parse", "HEAD") !== sourceCommit ||
        git("rev-parse", "fork/main") !== sourceCommit ||
        sha256File(PROGRAM) !== programSha256
    ) throw new Error("Action-burst source identity drifted");
    const protocolFiles = {
        protocol: path.join(
            REPO,
            "research/protocols/method/2026-09-05-outcome-blind-action-burst-diagnostic-v1.md",
        ),
        amendmentA1: path.join(
            REPO,
            "research/protocols/method/2026-09-05-outcome-blind-action-burst-diagnostic-v1-amendment-a1.md",
        ),
        amendmentA2: path.join(
            REPO,
            "research/protocols/method/2026-09-05-outcome-blind-action-burst-diagnostic-v1-amendment-a2.md",
        ),
        amendmentA3: path.join(
            REPO,
            "research/protocols/method/2026-09-05-outcome-blind-action-burst-diagnostic-v1-amendment-a3.md",
        ),
        amendmentA4: path.join(
            REPO,
            "research/protocols/method/2026-09-05-outcome-blind-action-burst-diagnostic-v1-amendment-a4.md",
        ),
        amendmentA5: path.join(
            REPO,
            "research/protocols/method/2026-09-06-outcome-blind-action-burst-diagnostic-v1-amendment-a5.md",
        ),
        amendmentA6: path.join(
            REPO,
            "research/protocols/method/2026-09-06-outcome-blind-action-burst-diagnostic-v1-amendment-a6.md",
        ),
    };
    const protocols = {
        protocolSha256: requiredHash("PROTOCOL_SHA256"),
        amendmentA1Sha256: requiredHash("AMENDMENT_A1_SHA256"),
        amendmentA2Sha256: requiredHash("AMENDMENT_A2_SHA256"),
        amendmentA3Sha256: requiredHash("AMENDMENT_A3_SHA256"),
        amendmentA4Sha256: requiredHash("AMENDMENT_A4_SHA256"),
        amendmentA5Sha256: requiredHash("AMENDMENT_A5_SHA256"),
        amendmentA6Sha256: requiredHash("AMENDMENT_A6_SHA256"),
    };
    const expected = {
        protocolSha256: sha256File(protocolFiles.protocol),
        amendmentA1Sha256: sha256File(protocolFiles.amendmentA1),
        amendmentA2Sha256: sha256File(protocolFiles.amendmentA2),
        amendmentA3Sha256: sha256File(protocolFiles.amendmentA3),
        amendmentA4Sha256: sha256File(protocolFiles.amendmentA4),
        amendmentA5Sha256: sha256File(protocolFiles.amendmentA5),
        amendmentA6Sha256: sha256File(protocolFiles.amendmentA6),
    };
    if (process.version !== "v20.13.1") {
        throw new Error("Action-burst Node runtime drifted");
    }
    exactJson(protocols, expected, "Action-burst protocol hashes drifted");
    return { sourceCommit, programSha256, protocols };
};

const verifyRuntime = () => {
    if (sha256File(RUNTIME_FREEZE) !== RUNTIME_FREEZE_SHA256) {
        throw new Error("Action-burst runtime freeze drifted");
    }
    const freeze = json(RUNTIME_FREEZE);
    if (freeze.complete !== true || freeze.passed !== true) {
        throw new Error("Action-burst runtime freeze is not complete");
    }
    const frozen = freeze.frozen;
    const candidateRuntimeTree = hashTree(frozen.candidatePolicy.runtimeTree.root);
    const externalSupalosaRuntimeTree = hashTree(frozen.externalSupalosa.runtimeTree.root);
    exactJson(candidateRuntimeTree, frozen.candidatePolicy.runtimeTree, "Candidate runtime tree drifted");
    exactJson(
        externalSupalosaRuntimeTree,
        frozen.externalSupalosa.runtimeTree,
        "External Supalosa runtime tree drifted",
    );
    if (
        execFileSync("git", ["rev-parse", "HEAD"], {
            cwd: frozen.externalSupalosa.repoRoot,
            encoding: "utf8",
        }).trim() !== frozen.externalSupalosa.commit ||
        execFileSync("git", ["status", "--porcelain=v1"], {
            cwd: frozen.externalSupalosa.repoRoot,
            encoding: "utf8",
        }).trim() !== ""
    ) throw new Error("External Supalosa checkout drifted");
    if (
        fs.realpathSync(frozen.gameApi.path) !== gameApiPath ||
        sha256File(gameApiPath) !== frozen.gameApi.sha256
    ) throw new Error("Action-burst game-api drifted");
    for (const entry of frozen.assets.entries) {
        if (sha256File(path.join(frozen.assets.root, entry.name)) !== entry.sha256) {
            throw new Error("Action-burst asset drifted");
        }
    }
    for (const map of frozen.maps) {
        if (sha256File(map.absolutePath) !== map.sha256) {
            throw new Error("Action-burst map drifted");
        }
    }
    if (
        sha256File(frozen.ra2WebAdvanced.bundlePath) !== frozen.ra2WebAdvanced.bundleSha256 ||
        sha256File(frozen.ra2WebAdvanced.manifestPath) !== frozen.ra2WebAdvanced.manifestSha256
    ) throw new Error("Action-burst Advanced freeze drifted");
    const dependencyRoot = path.join(frozen.externalSupalosa.repoRoot, "node_modules");
    const priorityQueue = hashTree(path.join(
        dependencyRoot, "@datastructures-js", "priority-queue",
    ), true);
    const quadtree = hashTree(path.join(
        dependencyRoot, "@timohausmann", "quadtree-ts",
    ), true);
    if (
        priorityQueue.sha256 !== "1533f9343bc44506b5082a47f5d8dc81420069b9f84e83070c26ebd2cbf57cf7" ||
        quadtree.sha256 !== "af6f532a321a487d38bf6726858313d296ba90883e5c2bb2df0d290d7f932039"
    ) throw new Error("Action-burst transitive dependency drifted");
    return {
        runtimeFreezeSha256: RUNTIME_FREEZE_SHA256,
        candidateRuntimeTree,
        externalSupalosaRuntimeTree,
        externalSupalosaCommit: frozen.externalSupalosa.commit,
        gameApiPath,
        gameApiSha256: frozen.gameApi.sha256,
        assetsRoot: frozen.assets.root,
        assetCount: frozen.assets.entries.length,
        maps: frozen.maps,
        advancedFreezeRoot: frozen.ra2WebAdvanced.freezeRoot,
        advancedBundleSha256: frozen.ra2WebAdvanced.bundleSha256,
        advancedManifestSha256: frozen.ra2WebAdvanced.manifestSha256,
        priorityQueue,
        quadtree,
    };
};

const programFiles = () => {
    const files = {
        program: PROGRAM,
        plan: path.join(DRIVER, "dist", "training", "actionBurstDiagnosticPlan.js"),
        collector: path.join(DRIVER, "dist", "training", "timestampedActionAudit.js"),
        temporal: path.join(DRIVER, "dist", "training", "actionBurstTemporalSummary.js"),
        candidate: path.join(DRIVER, "dist", "training", "deployedStrongBotCandidate.js"),
        baseline: path.join(DRIVER, "dist", "benchmark", "baselineLoader.js"),
        seeded: path.join(DRIVER, "dist", "benchmark", "seededOfflineGame.js"),
        advanced: path.join(DRIVER, "dist", "training", "ra2WebOpponentBundle.js"),
        package: path.join(DRIVER, "package.json"),
        lockfile: path.join(DRIVER, "pnpm-lock.yaml"),
    };
    return Object.fromEntries(Object.entries(files).map(([name, file]) => [
        name,
        { path: file, sha256: sha256File(file), bytes: fs.statSync(file).size },
    ]));
};

const verifyProgramFiles = (files) => {
    const current = programFiles();
    exactJson(current, files, "Action-burst program files drifted");
};

const completeLine = (label, file) => {
    const bytes = fs.statSync(file).size;
    const digest = sha256File(file);
    return label + " " + digest + " " + bytes + "\n";
};

const prepare = () => {
    const source = sourceIdentity();
    const runtime = verifyRuntime();
    if (sha256File(SEED_AUDIT) !== SEED_AUDIT_SHA256) {
        throw new Error("Action-burst seed audit drifted");
    }
    if (sha256File(SEED_CERTIFICATE) !== SEED_CERTIFICATE_SHA256) {
        throw new Error("Action-burst seed certificate drifted");
    }
    const certificateDirectory = path.dirname(SEED_CERTIFICATE);
    if (
        fs.readFileSync(path.join(certificateDirectory, "selection-certificate.sha256"), "utf8")
            .trim().split(/\\s+/)[0] !== SEED_CERTIFICATE_SHA256 ||
        fs.readFileSync(path.join(certificateDirectory, "COMPLETE"), "utf8").trim() !==
            "COMPLETE_ACTION_BURST_SEED_CERTIFICATE_V1_A2"
    ) throw new Error("Action-burst seed certificate marker drifted");
    const seedCertificate = json(SEED_CERTIFICATE);
    const firstPassing = seedCertificate.candidateAssessments.find((value) => value.passed);
    const selected = seedCertificate.candidateAssessments.filter((value) => value.selected);
    if (
        seedCertificate.complete !== true ||
        seedCertificate.passed !== true ||
        seedCertificate.technicalOnly !== true ||
        seedCertificate.competitiveFieldsAbsent !== true ||
        seedCertificate.completeAudit.path !== SEED_AUDIT ||
        seedCertificate.completeAudit.sha256 !== SEED_AUDIT_SHA256 ||
        seedCertificate.completeAudit.bytes !== fs.statSync(SEED_AUDIT).size ||
        seedCertificate.candidateAssessments.length !== 26 ||
        selected.length !== 1 ||
        selected[0] !== firstPassing ||
        JSON.stringify(seedCertificate.selectedInterval) !== JSON.stringify(SELECTED_INTERVAL)
    ) throw new Error("Action-burst seed certificate is ineligible");
    rejectActionBurstProhibitedFields(seedCertificate);
    const plan = buildActionBurstDiagnosticPlan(runtime.maps, SELECTED_INTERVAL);
    validateActionBurstDiagnosticPlan(plan);
    const files = programFiles();
    const manifest = {
        kind: "action-burst-diagnostic-manifest-v1-a4",
        complete: true,
        passed: true,
        technicalOnly: true,
        competitiveFieldsAbsent: true,
        sourceCommit: source.sourceCommit,
        programSha256: source.programSha256,
        scheduler: {
            jobId: process.env.SLURM_JOB_ID,
            account: process.env.SLURM_JOB_ACCOUNT,
            partition: process.env.SLURM_JOB_PARTITION,
        },
        protocols: source.protocols,
        selectedSeedAuditSha256: SEED_AUDIT_SHA256,
        selectedSeedCertificateSha256: SEED_CERTIFICATE_SHA256,
        selectedInterval: SELECTED_INTERVAL,
        runtime,
        files,
        planSha256: hash(Buffer.from(JSON.stringify(plan))),
        plan,
    };
    rejectActionBurstProhibitedFields(manifest);
    const directory = required("OUT_DIR");
    if (directory !== path.join(EXECUTION, "manifest") || fs.existsSync(directory)) {
        throw new Error("Action-burst manifest output path is invalid");
    }
    fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
    const file = path.join(directory, "manifest.json");
    writeExclusive(file, JSON.stringify(manifest, null, 2) + "\n");
    writeExclusive(
        path.join(directory, "COMPLETE"),
        completeLine("COMPLETE_ACTION_BURST_MANIFEST_V1_A4", file),
    );
    console.log(JSON.stringify({
        complete: true,
        passed: true,
        technicalOnly: true,
        traces: plan.traces.length,
        manifestSha256: sha256File(file),
        manifestBytes: fs.statSync(file).size,
    }));
};

const loadManifest = () => {
    const file = required("MANIFEST_PATH");
    const expectedHash = requiredHash("MANIFEST_SHA256");
    if (file !== path.join(EXECUTION, "manifest", "manifest.json")) {
        throw new Error("Action-burst manifest path drifted");
    }
    if (sha256File(file) !== expectedHash) throw new Error("Action-burst manifest hash drifted");
    const marker = fs.readFileSync(path.join(path.dirname(file), "COMPLETE"), "utf8").trim();
    const match = /^COMPLETE_ACTION_BURST_MANIFEST_V1_A4 ([0-9a-f]{64}) ([0-9]+)$/.exec(marker);
    if (!match || match[1] !== expectedHash || Number(match[2]) !== fs.statSync(file).size) {
        throw new Error("Action-burst manifest marker drifted");
    }
    const value = json(file);
    if (
        value.kind !== "action-burst-diagnostic-manifest-v1-a4" ||
        value.complete !== true ||
        value.passed !== true ||
        value.technicalOnly !== true ||
        value.competitiveFieldsAbsent !== true ||
        value.sourceCommit !== required("SOURCE_COMMIT") ||
        value.programSha256 !== requiredHash("PROGRAM_SHA256") ||
        value.selectedSeedAuditSha256 !== SEED_AUDIT_SHA256 ||
        value.selectedSeedCertificateSha256 !== SEED_CERTIFICATE_SHA256 ||
        value.planSha256 !== hash(Buffer.from(JSON.stringify(value.plan)))
    ) throw new Error("Action-burst manifest header drifted");
    validateActionBurstDiagnosticPlan(value.plan);
    rejectActionBurstProhibitedFields(value);
    verifyProgramFiles(value.files);
    return value;
};

const startKey = (value) => String(value.x) + "," + String(value.y);
const setStart = (bot, ordinal) => {
    bot.chronoResearchStartPos = ordinal;
};
const settings = (trace, map, candidate, opponent) => ({
    online: false,
    agents: trace.candidateSlot === 0 ? [candidate, opponent] : [opponent, candidate],
    mapName: map.fileName,
    gameMode: 0,
    shortGame: false,
    mcvRepacks: true,
    cratesAppear: false,
    superWeapons: false,
    gameSpeed: 6,
    credits: 10000,
    unitCount: 0,
    buildOffAlly: false,
    multiEngineer: false,
});

const eventSummary = (events) => {
    const bySideAndMethod = new Map();
    const bySideAndClass = new Map();
    const suppressedQuitAttempts = { candidate: 0, baseline: 0 };
    for (const event of events) {
        rejectActionBurstProhibitedFields(event);
        exactJson(
            Object.keys(event).sort(),
            [
                "actionClass", "argumentBytes", "argumentSha256", "forwarded",
                "method", "order", "side", "update",
            ],
            "Action-burst event keys drifted",
        );
        if (
            !Number.isSafeInteger(event.update) ||
            event.update < 0 ||
            event.update >= 3600 ||
            !["candidate", "baseline"].includes(event.side) ||
            !FRESH_DUAL_ACTION_METHODS.includes(event.method) ||
            !ACTION_CLASSES.has(event.actionClass) ||
            !SHA256.test(event.argumentSha256) ||
            !Number.isSafeInteger(event.argumentBytes) ||
            event.argumentBytes < 0 ||
            event.argumentBytes > 64 * 1024 ||
            typeof event.forwarded !== "boolean" ||
            (event.method === "quitGame") === event.forwarded
        ) throw new Error("Action-burst event value drifted");
        if (event.method === "orderUnits") {
            if (
                !event.order ||
                JSON.stringify(Object.keys(event.order).sort()) !== JSON.stringify([
                    "orderType", "orderedUnitIdsSha256", "overload",
                    "targetAvailable", "unitCount",
                ]) ||
                !Number.isSafeInteger(event.order.unitCount) ||
                event.order.unitCount < 0 ||
                !(typeof event.order.orderType === "string" ||
                    Number.isSafeInteger(event.order.orderType)) ||
                !["no_target", "object_target", "tile_target"].includes(event.order.overload) ||
                !SHA256.test(event.order.orderedUnitIdsSha256) ||
                typeof event.order.targetAvailable !== "boolean"
            ) throw new Error("Action-burst order metadata drifted");
        } else if (event.order !== null) {
            throw new Error("Action-burst non-order metadata drifted");
        }
        const expectedClass = event.method === "orderUnits" ? "order" :
            event.method === "quitGame" ? "suppressed_quit" :
            ["sayAll", "setGlobalDebugText", "setUnitDebugText"].includes(event.method)
                ? "debug_or_communication" : "gameplay_nonorder";
        if (event.actionClass !== expectedClass) {
            throw new Error("Action-burst event class drifted");
        }
        const methodKey = event.side + "." + event.method;
        const classKey = event.side + "." + event.actionClass;
        bySideAndMethod.set(methodKey, (bySideAndMethod.get(methodKey) ?? 0) + 1);
        bySideAndClass.set(classKey, (bySideAndClass.get(classKey) ?? 0) + 1);
        if (!event.forwarded) {
            if (event.method !== "quitGame") throw new Error("Action-burst non-quit request was unforwarded");
            suppressedQuitAttempts[event.side] += 1;
        }
    }
    const summary = {
        complete: true,
        eventCount: events.length,
        traceSha256: hash(events.map((event) => JSON.stringify(event)).join("\n") + "\n"),
        bySideAndMethod: Object.fromEntries([...bySideAndMethod.entries()].sort()),
        bySideAndClass: Object.fromEntries([...bySideAndClass.entries()].sort()),
        suppressedQuitAttempts,
    };
    rejectActionBurstProhibitedFields(summary);
    return summary;
};

const genericFailure = (directory, stage, error, sourceCommit) => {
    try {
        fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
        const stack = String(error instanceof Error ? error.stack : error).split("\n")
            .filter((line) => /^\s*at /.test(line)).slice(0, 8);
        const artifact = {
            kind: "action-burst-generic-technical-failure-v1-a4",
            complete: false,
            passed: false,
            technicalOnly: true,
            competitiveFieldsAbsent: true,
            technicalStage: stage,
            errorClass: error instanceof Error ? error.constructor.name : "UnknownError",
            messageSha256: hash(String(error instanceof Error ? error.message : error)),
            frameSha256: stack.map((line) => hash(line)),
            sourceCommit,
            scheduler: {
                jobId: process.env.SLURM_JOB_ID,
                arrayJobId: process.env.SLURM_ARRAY_JOB_ID ?? null,
                arrayTaskId: process.env.SLURM_ARRAY_TASK_ID ?? null,
                account: process.env.SLURM_JOB_ACCOUNT,
                partition: process.env.SLURM_JOB_PARTITION,
            },
        };
        rejectActionBurstProhibitedFields(artifact);
        writeExclusive(path.join(directory, "FAILURE.json"), JSON.stringify(artifact, null, 2) + "\n");
    } catch {
        // Preserve the original technical error if bounded failure serialization also fails.
    }
};

const runTrace = async () => {
    const source = sourceIdentity();
    const manifest = loadManifest();
    const taskIndex = Number(required("TASK_INDEX"));
    const role = required("TRACE_ROLE");
    if (!Number.isSafeInteger(taskIndex) || taskIndex < 0 || taskIndex >= manifest.plan.traces.length) {
        throw new Error("Action-burst task index is invalid");
    }
    if (
        role === "array" && process.env.SLURM_ARRAY_TASK_ID !== String(taskIndex) ||
        role !== "array" && role !== "smoke"
    ) throw new Error("Action-burst scheduler task identity drifted");
    const expectedDirectory = role === "smoke"
        ? path.join(EXECUTION, "smoke")
        : path.join(EXECUTION, "cells", "task-" + String(taskIndex).padStart(4, "0"));
    const directory = required("OUT_DIR");
    if (directory !== expectedDirectory || fs.existsSync(directory)) {
        throw new Error("Action-burst trace output path is invalid");
    }
    const trace = manifest.plan.traces[taskIndex];
    const map = manifest.plan.maps.find((value) => value.id === trace.mapId);
    if (!map) throw new Error("Action-burst assigned map is missing");
    if (
        sha256File(map.absolutePath) !== map.sha256 ||
        sha256File(gameApiPath) !== manifest.runtime.gameApiSha256
    ) throw new Error("Action-burst assigned runtime drifted");
    exactJson(
        hashTree(manifest.runtime.candidateRuntimeTree.root),
        manifest.runtime.candidateRuntimeTree,
        "Action-burst candidate runtime drifted",
    );
    exactJson(
        hashTree(manifest.runtime.externalSupalosaRuntimeTree.root),
        manifest.runtime.externalSupalosaRuntimeTree,
        "Action-burst baseline runtime drifted",
    );
    if (
        trace.opponent === "ra2web_advanced" &&
        sha256File(path.join(manifest.runtime.advancedFreezeRoot, "spbots3.min.js")) !==
            manifest.runtime.advancedBundleSha256
    ) throw new Error("Action-burst Advanced bundle drifted");

    fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
    try {
        await gameApi.cdapi.init(manifest.runtime.assetsRoot);
        const factory = await loadBaselineFactory(path.join(REPO, "packages", "chronodivide-bot"));
        if (factory.descriptor.kind !== "external-package") {
            throw new Error("Action-burst pinned Supalosa factory is not external");
        }
        const candidateName = "ActionBurstCandidate_" + taskIndex + "_" + role;
        const opponentName = "ActionBurstOpponent_" + taskIndex + "_" + role;
        const candidate = createDeployedStrongBotCandidate(candidateName, trace.country);
        let opponent;
        if (trace.opponent === "pinned_supalosa") {
            opponent = factory.create(opponentName, trace.country);
        } else {
            const advanced = loadRa2WebOpponent(
                manifest.runtime.advancedFreezeRoot,
                "ra2web_advanced_old_priest",
            );
            opponent = createInspectableRa2WebBot(advanced, opponentName, trace.country);
        }
        setStart(candidate, trace.candidateStartOrdinal);
        setStart(opponent, trace.opponentStartOrdinal);
        const audit = new TimestampedActionAudit();
        installTimestampedActionAudit({ candidate, baseline: opponent }, audit);
        const result = await withSeededOfflineGame(
            gameApi.cdapi,
            settings(trace, map, candidate, opponent),
            trace.requestedEngineSeed,
            [
                { agent: candidate, identity: "candidate" },
                { agent: opponent, identity: "opponent" },
            ],
            async (instance) => {
                const api = candidate.lastGameApi;
                if (!api || !opponent.lastGameApi) throw new Error("Action-burst GameApi unavailable");
                const observedStarts = {
                    candidate: startKey(api.getPlayerData(candidateName).startLocation),
                    opponent: startKey(api.getPlayerData(opponentName).startLocation),
                };
                if (
                    observedStarts.candidate !== trace.candidateStart ||
                    observedStarts.opponent !== trace.opponentStart ||
                    instance.isFinished() ||
                    api.getCurrentTick() !== 0
                ) throw new Error("Action-burst fixed horizon did not start cleanly");
                for (let update = 1; update <= trace.fixedUpdates; update += 1) {
                    if (instance.isFinished()) {
                        throw new Error("Action-burst fixed technical horizon was not reached");
                    }
                    await instance.update();
                    if (api.getCurrentTick() !== update || instance.isFinished()) {
                        throw new Error("Action-burst fixed technical horizon was not reached");
                    }
                }
                const captured = audit.finish();
                exactJson(captured.summary, eventSummary(captured.events), "Action-burst summary drifted");
                summarizeActionBurstEvents(captured.events, trace.fixedUpdates);
                return { observedStarts, ...captured };
            },
        );
        const header = {
            kind: "action-burst-trace-header-v1-a4",
            complete: true,
            passed: true,
            technicalOnly: true,
            competitiveFieldsAbsent: true,
            role,
            sourceCommit: source.sourceCommit,
            programSha256: source.programSha256,
            manifestSha256: requiredHash("MANIFEST_SHA256"),
            assignment: trace,
            mapSha256: map.sha256,
            scheduler: {
                jobId: process.env.SLURM_JOB_ID,
                arrayJobId: process.env.SLURM_ARRAY_JOB_ID ?? null,
                arrayTaskId: process.env.SLURM_ARRAY_TASK_ID ?? null,
                account: process.env.SLURM_JOB_ACCOUNT,
                partition: process.env.SLURM_JOB_PARTITION,
            },
        };
        const footer = {
            kind: "action-burst-trace-final-v1-a4",
            complete: true,
            passed: true,
            technicalOnly: true,
            competitiveFieldsAbsent: true,
            fixedUpdates: trace.fixedUpdates,
            observedStarts: result.observedStarts,
            summary: result.summary,
        };
        rejectActionBurstProhibitedFields(header);
        rejectActionBurstProhibitedFields(footer);
        const records = [
            header,
            ...result.events.map((event) => ({ kind: "action-burst-event-v1", value: event })),
            footer,
        ];
        records.forEach(rejectActionBurstProhibitedFields);
        const plain = Buffer.from(records.map((value) => JSON.stringify(value)).join("\n") + "\n");
        const compressed = zlib.gzipSync(plain, { level: 9, mtime: 0 });
        if (compressed.length > TRACE_LIMIT) throw new Error("Action-burst compressed trace exceeds 2 MiB");
        const traceFile = path.join(directory, "trace.jsonl.gz");
        writeExclusive(traceFile, compressed);
        const marker = completeLine("COMPLETE_ACTION_BURST_TRACE_V1", traceFile);
        writeExclusive(path.join(directory, "COMPLETE"), marker);
    } catch (error) {
        genericFailure(directory, "fixed-horizon-trace", error, source.sourceCommit);
        throw error;
    }
};

const csvEscape = (value) => {
    if (value === null || value === undefined) return "";
    const text = typeof value === "object" ? JSON.stringify(value) : String(value);
    return "\"" + text.replaceAll("\"", "\"\"") + "\"";
};
const csvText = (rows) => {
    if (!rows.length) throw new Error("Action-burst CSV rows are empty");
    const fields = [];
    const seen = new Set();
    for (const row of rows) {
        for (const key of Object.keys(row)) {
            if (!seen.has(key)) {
                seen.add(key);
                fields.push(key);
            }
        }
    }
    return [
        fields.map(csvEscape).join(","),
        ...rows.map((row) => fields.map((field) => csvEscape(row[field])).join(",")),
    ].join("\n") + "\n";
};
const mapFamily = (mapId) => {
    if (mapId.startsWith("hfo-")) return "hfo";
    if (mapId === "peak") return "peak";
    if (mapId === "tour-of-egypt") return "tour-of-egypt";
    if (mapId.startsWith("south-pacific")) return "south-pacific";
    if (mapId === "pacific-heights") return "pacific-heights";
    throw new Error("Action-burst map family is unknown");
};
const groupBy = (rows, fields) => {
    const groups = new Map();
    for (const row of rows) {
        const values = fields.map((field) => row[field]);
        const key = JSON.stringify(values);
        if (!groups.has(key)) groups.set(key, { values, rows: [] });
        groups.get(key).rows.push(row);
    }
    return [...groups.values()].sort((left, right) =>
        JSON.stringify(left.values).localeCompare(JSON.stringify(right.values)));
};
const numericMetricFields = [
    "calls", "callsPer900", "quarter0", "quarter1", "quarter2", "quarter3",
    "maxRolling900", "maxSameUpdate", "multiCallUpdates",
    "duplicateSameUpdateFraction", "duplicateWithin30Fraction",
    "orderUnitIds", "orderUnitIdsPerCall", "maxRolling900OrderUnitIds",
];

const parseTrace = (directory, assignment, manifestSha256, expectedRole = "array") => {
    const names = fs.readdirSync(directory).sort();
    exactJson(names, ["COMPLETE", "trace.jsonl.gz"], "Action-burst task file set drifted");
    const traceFile = path.join(directory, "trace.jsonl.gz");
    const marker = fs.readFileSync(path.join(directory, "COMPLETE"), "utf8").trim();
    const match = COMPLETE_RE.exec(marker);
    if (
        !match ||
        match[1] !== sha256File(traceFile) ||
        Number(match[2]) !== fs.statSync(traceFile).size ||
        fs.statSync(traceFile).size > TRACE_LIMIT
    ) throw new Error("Action-burst task marker drifted");
    const plain = zlib.gunzipSync(read(traceFile), { maxOutputLength: 64 * 1024 * 1024 });
    const lines = plain.toString("utf8").trimEnd().split("\n");
    if (lines.length < 2) throw new Error("Action-burst task stream is incomplete");
    const records = lines.map((line) => JSON.parse(line));
    records.forEach(rejectActionBurstProhibitedFields);
    const header = records[0];
    const footer = records.at(-1);
    const events = records.slice(1, -1).map((record) => {
        if (record.kind !== "action-burst-event-v1") {
            throw new Error("Action-burst event record kind drifted");
        }
        return record.value;
    });
    if (
        header.kind !== "action-burst-trace-header-v1-a4" ||
        header.complete !== true ||
        header.passed !== true ||
        header.technicalOnly !== true ||
        header.competitiveFieldsAbsent !== true ||
        header.role !== expectedRole ||
        header.manifestSha256 !== manifestSha256 ||
        footer.kind !== "action-burst-trace-final-v1-a4" ||
        footer.complete !== true ||
        footer.passed !== true ||
        footer.technicalOnly !== true ||
        footer.competitiveFieldsAbsent !== true ||
        footer.fixedUpdates !== 3600
    ) throw new Error("Action-burst task stream header/footer drifted");
    exactJson(header.assignment, assignment, "Action-burst task assignment drifted");
    exactJson(footer.observedStarts, {
        candidate: assignment.candidateStart,
        opponent: assignment.opponentStart,
    }, "Action-burst observed starts drifted");
    exactJson(footer.summary, eventSummary(events), "Action-burst event summary drifted");
    return {
        header,
        footer,
        events,
        compressedBytes: fs.statSync(traceFile).size,
        compressedSha256: match[1],
    };
};

const schedulerRows = (arrayJobId, plan) => {
    const raw = execFileSync(
        "/opt/slurm/current/bin/sacct",
        [
            "-X", "-n", "-P", "-j", arrayJobId,
            "--format=JobID,JobIDRaw,State,ExitCode,Account,Partition,AllocCPUS,Restarts,ElapsedRaw",
        ],
        { encoding: "utf8" },
    );
    const rows = raw.trim().split("\n").filter(Boolean).map((line) => {
        const values = line.split("|");
        return {
            label: values[0],
            jobId: values[1],
            state: values[2],
            exitCode: values[3],
            account: values[4],
            partition: values[5],
            cpus: Number(values[6]),
            restarts: Number(values[7]),
            elapsedSeconds: Number(values[8]),
        };
    }).filter((row) => row.label.startsWith(arrayJobId + "_"));
    if (rows.length !== plan.traces.length) throw new Error("Action-burst scheduler count drifted");
    const byLabel = new Map(rows.map((row) => [row.label, row]));
    if (byLabel.size !== rows.length || new Set(rows.map((row) => row.jobId)).size !== rows.length) {
        throw new Error("Action-burst scheduler identities are not unique");
    }
    for (const trace of plan.traces) {
        const row = byLabel.get(arrayJobId + "_" + trace.taskIndex);
        if (
            !row ||
            row.state !== "COMPLETED" ||
            row.exitCode !== "0:0" ||
            row.account !== "pi_jss233" ||
            row.partition !== "day" ||
            row.cpus !== 1 ||
            row.restarts !== 0
        ) throw new Error("Action-burst scheduler task failed");
    }
    return rows.sort((left, right) =>
        Number(left.label.split("_")[1]) - Number(right.label.split("_")[1]));
};

const distributionRows = (metrics) => {
    const levels = [
        ["overall", []],
        ["opponent", ["opponent"]],
        ["map", ["opponent", "mapId"]],
        ["family", ["opponent", "mapFamily"]],
        ["country", ["opponent", "country"]],
        ["map_candidate_start", ["opponent", "mapId", "candidateStart"]],
        ["map_opponent_start", ["opponent", "mapId", "opponentStart"]],
        ["slot", ["opponent", "candidateSlot"]],
        ["map_country_start", ["opponent", "mapId", "country", "candidateStart"]],
    ];
    const output = [];
    for (const [level, fields] of levels) {
        for (const group of groupBy(metrics, [
            ...fields, "side", "dimensionType", "dimensionValue",
        ])) {
            const dimension = Object.fromEntries(
                [...fields, "side", "dimensionType", "dimensionValue"].map(
                    (field, index) => [field, group.values[index]],
                ),
            );
            for (const metric of numericMetricFields) {
                output.push({
                    level,
                    ...dimension,
                    metric,
                    ...actionBurstDistribution(group.rows.map((row) => row[metric])),
                });
            }
        }
    }
    return output;
};

const weightedRows = (metrics) => {
    const output = [];
    for (const [scope, fields] of [["overall", []], ["opponent", ["opponent"]]]) {
        for (const group of groupBy(metrics, [
            ...fields, "side", "dimensionType", "dimensionValue",
        ])) {
            const dimensions = Object.fromEntries(
                [...fields, "side", "dimensionType", "dimensionValue"].map(
                    (field, index) => [field, group.values[index]],
                ),
            );
            for (const metric of numericMetricFields) {
                const populations = {
                    game_equal: group.rows.map((row) => row[metric]),
                    cluster_equal: groupBy(
                        group.rows, ["mapId", "country", "candidateStart"],
                    ).map((value) =>
                        value.rows.reduce((total, row) => total + row[metric], 0) /
                        value.rows.length),
                    map_equal: groupBy(group.rows, ["mapId"]).map((value) =>
                        value.rows.reduce((total, row) => total + row[metric], 0) /
                        value.rows.length),
                    family_equal: groupBy(group.rows, ["mapFamily"]).map((value) =>
                        value.rows.reduce((total, row) => total + row[metric], 0) /
                        value.rows.length),
                };
                for (const [weighting, values] of Object.entries(populations)) {
                    output.push({
                        scope,
                        ...dimensions,
                        metric,
                        weighting,
                        ...actionBurstDistribution(values),
                    });
                }
            }
        }
    }
    return output;
};

const countFiles = (root) => {
    let count = 0;
    const visit = (directory) => {
        for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
            const file = path.join(directory, entry.name);
            if (entry.isDirectory()) visit(file);
            else if (entry.isFile()) count += 1;
        }
    };
    visit(root);
    return count;
};

const finalize = () => {
    const source = sourceIdentity();
    const manifest = loadManifest();
    const runtime = verifyRuntime();
    exactJson(runtime, manifest.runtime, "Action-burst finalizer runtime drifted");
    const manifestSha256 = requiredHash("MANIFEST_SHA256");
    const arrayJobId = required("ARRAY_JOB_ID");
    const scheduler = schedulerRows(arrayJobId, manifest.plan);
    const smoke = parseTrace(
        path.join(EXECUTION, "smoke"),
        manifest.plan.traces[0],
        manifestSha256,
        "smoke",
    );
    if (
        smoke.header.sourceCommit !== source.sourceCommit ||
        smoke.header.programSha256 !== source.programSha256 ||
        smoke.header.scheduler.account !== "pi_jss233" ||
        smoke.header.scheduler.partition !== "day"
    ) throw new Error("Action-burst smoke identity drifted");
    const parsed = [];
    let totalCompressedBytes = 0;
    const metrics = [];
    for (const assignment of manifest.plan.traces) {
        const directory = path.join(
            EXECUTION,
            "cells",
            "task-" + String(assignment.taskIndex).padStart(4, "0"),
        );
        const trace = parseTrace(directory, assignment, manifestSha256);
        const schedulerRow = scheduler[assignment.taskIndex];
        if (
            trace.header.sourceCommit !== source.sourceCommit ||
            trace.header.programSha256 !== source.programSha256 ||
            trace.header.mapSha256 !== manifest.plan.maps.find(
                (value) => value.id === assignment.mapId,
            ).sha256 ||
            trace.header.scheduler.jobId !== schedulerRow.jobId ||
            trace.header.scheduler.arrayJobId !== arrayJobId ||
            trace.header.scheduler.arrayTaskId !== String(assignment.taskIndex) ||
            trace.header.scheduler.account !== "pi_jss233" ||
            trace.header.scheduler.partition !== "day"
        ) throw new Error("Action-burst trace scheduler/source identity drifted");
        totalCompressedBytes += trace.compressedBytes;
        parsed.push(trace);
        const family = mapFamily(assignment.mapId);
        for (const row of summarizeActionBurstEvents(trace.events, assignment.fixedUpdates)) {
            metrics.push({
                taskIndex: assignment.taskIndex,
                baseTraceIndex: assignment.baseTraceIndex,
                opponent: assignment.opponent,
                mapId: assignment.mapId,
                mapFamily: family,
                country: assignment.country,
                candidateStart: assignment.candidateStart,
                opponentStart: assignment.opponentStart,
                candidateSlot: assignment.candidateSlot,
                executionReplicateOrdinal: assignment.executionReplicateOrdinal,
                requestedEngineSeed: assignment.requestedEngineSeed,
                ...row,
            });
        }
    }
    if (totalCompressedBytes > TOTAL_TRACE_LIMIT) {
        throw new Error("Action-burst complete compressed population exceeds 2 GiB");
    }
    for (const assignment of manifest.plan.traces.filter(
        (trace) => trace.executionReplicateOrdinal === 1,
    )) {
        const base = parsed[assignment.duplicateOfTaskIndex];
        const duplicate = parsed[assignment.taskIndex];
        exactJson(base.events, duplicate.events, "Action-burst deterministic event bytes drifted");
        exactJson(base.footer.summary, duplicate.footer.summary, "Action-burst deterministic summary drifted");
    }
    const reserve = deriveActionBurstReserve(metrics);
    const distributions = distributionRows(metrics);
    const weighted = weightedRows(metrics);
    const outputDirectory = required("OUT_DIR");
    if (outputDirectory !== path.join(EXECUTION, "finalizer") || fs.existsSync(outputDirectory)) {
        throw new Error("Action-burst finalizer output path is invalid");
    }
    fs.mkdirSync(outputDirectory, { recursive: true, mode: 0o700 });
    const outputs = {
        "trace-metrics.csv": csvText(metrics),
        "distribution-summaries.csv": csvText(distributions),
        "weighted-summaries.csv": csvText(weighted),
        "scheduler.csv": csvText(scheduler),
        "reserve.json": JSON.stringify(reserve, null, 2) + "\n",
    };
    for (const [name, bytes] of Object.entries(outputs)) {
        writeExclusive(path.join(outputDirectory, name), bytes);
    }
    const filesBeforeAggregate = countFiles(EXECUTION);
    const expectedFilesAfter = filesBeforeAggregate + Object.keys(outputs).length + 3;
    if (expectedFilesAfter >= FILE_LIMIT) {
        throw new Error("Action-burst complete execution file budget exceeded");
    }
    const aggregate = {
        kind: "action-burst-diagnostic-aggregate-v1-a4",
        complete: true,
        passed: true,
        technicalOnly: true,
        competitiveFieldsAbsent: true,
        sourceCommit: source.sourceCommit,
        programSha256: source.programSha256,
        manifestSha256,
        arrayJobId,
        finalizerJobId: process.env.SLURM_JOB_ID,
        manifestJobId: manifest.scheduler.jobId,
        smokeJobId: smoke.header.scheduler.jobId,
        schedulerRows: scheduler.length,
        traces: manifest.plan.traces.length,
        deterministicDuplicates: 25,
        fixedUpdates: 3600,
        temporalMetricRows: metrics.length,
        distributionRows: distributions.length,
        weightedRows: weighted.length,
        totalCompressedBytes,
        reserve,
        filesBeforeAggregate,
        expectedFilesAfter,
        outputs: Object.fromEntries(Object.entries(outputs).map(([name, bytes]) => [
            name,
            { sha256: hash(bytes), bytes: Buffer.byteLength(bytes) },
        ])),
    };
    rejectActionBurstProhibitedFields(aggregate);
    const aggregateFile = path.join(outputDirectory, "aggregate.json");
    writeExclusive(aggregateFile, JSON.stringify(aggregate, null, 2) + "\n");
    for (const name of [...Object.keys(outputs), "aggregate.json"]) {
        const file = path.join(outputDirectory, name);
        writeExclusive(
            path.join(outputDirectory, name + ".sha256"),
            sha256File(file) + "  " + name + "\n",
        );
    }
    writeExclusive(
        path.join(outputDirectory, "COMPLETE"),
        completeLine("COMPLETE_ACTION_BURST_AGGREGATE_V1_A4", aggregateFile),
    );
    if (countFiles(EXECUTION) !== expectedFilesAfter) {
        throw new Error("Action-burst final file count drifted");
    }
    console.log(JSON.stringify({
        complete: true,
        passed: true,
        technicalOnly: true,
        traces: aggregate.traces,
        protectedReserve: reserve.protectedReserve,
        smallestCeilingFeasible: reserve.smallestCeilingFeasible,
        aggregateSha256: sha256File(aggregateFile),
    }));
};

const mode = required("MODE");
if (mode === "prepare") prepare();
else if (mode === "trace") await runTrace();
else if (mode === "finalize") finalize();
else throw new Error("Unknown action-burst mode");
