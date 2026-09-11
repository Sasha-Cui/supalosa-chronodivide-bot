#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const PROGRAM = fileURLToPath(import.meta.url);
const REPO = path.resolve(path.dirname(PROGRAM), "../..");
const PROJECT = path.dirname(REPO);
const DRIVER = path.join(REPO, "packages", "chronodivide-bot-driver");
const STUDY = path.join(
    PROJECT,
    "research-evidence",
    "unified-intent-arbiter-v1",
    "gate-3",
    "diagnostic-a1",
);
const EXECUTION = path.join(STUDY, "execution-v1");
const RUNTIME_FREEZE = path.join(
    PROJECT,
    "research-evidence",
    "fresh-dual-endpoint-v1",
    "execution-v1",
    "runtime-freeze",
    "runtime-freeze.json",
);
const RUNTIME_FREEZE_SHA256 = "be47027c8526daa961500a1ca2acc3c04dd1a487460d4dec78361faa03ece649";
const SHA256 = /^[0-9a-f]{64}$/;
const RECORD_LIMIT = 128 * 1024;
const FILE_LIMIT = 700;
const COMPLETE_RE = /^COMPLETE_UNIFIED_INTENT_GATE3_DIAGNOSTIC_A1_RECORD_V1 ([0-9a-f]{64}) ([0-9]+)$/;
const PROHIBITED = /winner|outcome|score|endpoint|defeated|terminal|building|inventory|unit|credit|damage|action|trajectory|rank|failureupdate/i;
const STATUSES = new Set([
    "clean",
    "fixed_horizon_incomplete",
    "telemetry_contract",
    "trace_contract",
    "setup_contract",
]);
const COUNTRIES = [
    "Americans", "Alliance", "French", "Germans", "British",
    "Africans", "Arabs", "Confederation", "Russians",
];

const requireDriver = createRequire(path.join(DRIVER, "package.json"));
const gameApiPath = fs.realpathSync(requireDriver.resolve("@chronodivide/game-api"));
const gameApi = await import(pathToFileURL(gameApiPath).href);
const {
    buildUnifiedIntentGate3DiagnosticPlan,
    validateUnifiedIntentGate3DiagnosticPlan,
} = await import(pathToFileURL(path.join(
    DRIVER,
    "dist",
    "training",
    "unifiedIntentGate3DiagnosticPlan.js",
)).href);
const {
    installUnifiedIntentGate2ActionTrace,
    snapshotUnifiedIntentGate2PublicState,
    UnifiedIntentGate2ActionTrace,
    UnifiedIntentGate2Trajectory,
} = await import(pathToFileURL(path.join(
    DRIVER,
    "dist",
    "training",
    "unifiedIntentGate2Trace.js",
)).href);
const { UnifiedIntentGate3TelemetryCollector } = await import(pathToFileURL(path.join(
    DRIVER,
    "dist",
    "training",
    "unifiedIntentGate3Telemetry.js",
)).href);
const { createDeployedStrongBotCandidate } = await import(pathToFileURL(path.join(
    DRIVER,
    "dist",
    "training",
    "deployedStrongBotCandidate.js",
)).href);
const { loadBaselineFactory } = await import(pathToFileURL(path.join(
    DRIVER,
    "dist",
    "benchmark",
    "baselineLoader.js",
)).href);
const { withSeededOfflineGame } = await import(pathToFileURL(path.join(
    DRIVER,
    "dist",
    "benchmark",
    "seededOfflineGame.js",
)).href);
const { installSymmetricObservationFirewall } = await import(pathToFileURL(path.join(
    DRIVER,
    "dist",
    "training",
    "symmetricObservationFirewall.js",
)).href);

const hash = (value) => crypto.createHash("sha256").update(value).digest("hex");
const read = (file) => fs.readFileSync(file);
const sha256File = (file) => hash(read(file));
const json = (file) => JSON.parse(read(file));
const canonical = (value) => JSON.stringify(value);
const exact = (left, right, message) => {
    if (canonical(left) !== canonical(right)) throw new Error(message);
};
const git = (...args) => execFileSync("git", args, { cwd: REPO, encoding: "utf8" }).trim();
const required = (name) => {
    const value = process.env[name];
    if (!value) throw new Error("Missing environment value " + name);
    return value;
};
const requiredHash = (name) => {
    const value = required(name);
    if (!SHA256.test(value)) throw new Error("Invalid hash environment value " + name);
    return value;
};
const writeExclusive = (file, value) => fs.writeFileSync(file, value, {
    flag: "wx",
    mode: 0o600,
});
const completeLine = (label, file) =>
    label + " " + sha256File(file) + " " + fs.statSync(file).size + "\n";

const rejectProhibited = (value) => {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) {
        value.forEach(rejectProhibited);
        return;
    }
    for (const [key, child] of Object.entries(value)) {
        if (PROHIBITED.test(key)) {
            throw new Error("Gate 3 A1 prohibited diagnostic field " + key);
        }
        rejectProhibited(child);
    }
};

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
            } else throw new Error("Unsupported runtime tree entry");
        }
    };
    visit(root);
    entries.sort((left, right) =>
        Buffer.compare(Buffer.from(left.relativePath), Buffer.from(right.relativePath)));
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

const SOURCE_FILES = {
    a1Protocol: path.join(
        REPO,
        "research/protocols/method/2026-09-10-unified-intent-arbiter-v1-gate-3-amendment-a1.md",
    ),
    failureRecord: path.join(
        REPO,
        "research/results/2026-09-10-unified-intent-arbiter-v1-gate-3-failed.md",
    ),
    parentProtocol: path.join(
        REPO,
        "research/protocols/method/2026-09-09-unified-intent-arbiter-v1-gate-3.md",
    ),
    gate2Record: path.join(
        REPO,
        "research/results/2026-09-09-unified-intent-arbiter-v1-gate-2-complete.md",
    ),
};

const sourceIdentity = () => {
    const sourceCommit = required("SOURCE_COMMIT");
    const programSha256 = requiredHash("PROGRAM_SHA256");
    if (
        process.version !== "v20.13.1" ||
        git("branch", "--show-current") !== "main" ||
        git("rev-parse", "HEAD") !== sourceCommit ||
        git("rev-parse", "fork/main") !== sourceCommit ||
        git("status", "--porcelain=v1") !== "" ||
        sha256File(PROGRAM) !== programSha256
    ) throw new Error("Gate 3 A1 source identity drifted");
    const identities = {};
    for (const [name, file] of Object.entries(SOURCE_FILES)) {
        const environment = "IDENTITY_" + name.toUpperCase() + "_SHA256";
        const actual = sha256File(file);
        if (requiredHash(environment) !== actual) {
            throw new Error("Gate 3 A1 source-file hash drifted: " + name);
        }
        identities[name + "Sha256"] = actual;
    }
    return { sourceCommit, programSha256, identities };
};

const verifyRuntime = () => {
    if (sha256File(RUNTIME_FREEZE) !== RUNTIME_FREEZE_SHA256) {
        throw new Error("Gate 3 A1 runtime freeze drifted");
    }
    const value = json(RUNTIME_FREEZE);
    if (!value.complete || !value.passed) throw new Error("Gate 3 A1 runtime freeze failed");
    const frozen = value.frozen;
    if (
        sha256File(gameApiPath) !== frozen.gameApi.sha256 ||
        frozen.nodeVersion !== "v20.13.1"
    ) throw new Error("Gate 3 A1 game runtime drifted");
    const externalSupalosaRuntimeTree = hashTree(frozen.externalSupalosa.runtimeTree.root);
    exact(
        externalSupalosaRuntimeTree,
        frozen.externalSupalosa.runtimeTree,
        "Gate 3 A1 external Supalosa runtime drifted",
    );
    const byMapId = new Map(frozen.maps.map((map) => [map.id, map]));
    const maps = ["hfo-le", "tour-of-egypt"].map((id) => {
        const map = byMapId.get(id);
        if (!map || map.starts.length < 2 || sha256File(map.absolutePath) !== map.sha256) {
            throw new Error("Gate 3 A1 map drifted: " + id);
        }
        return { ...map, advancedEligible: id === "hfo-le" };
    });
    for (const entry of frozen.assets.entries) {
        const file = path.join(frozen.assets.root, entry.name);
        if (!fs.statSync(file).isFile() || sha256File(file) !== entry.sha256) {
            throw new Error("Gate 3 A1 asset drifted: " + entry.name);
        }
    }
    return {
        runtimeFreezeSha256: RUNTIME_FREEZE_SHA256,
        gameApiPath,
        gameApiSha256: frozen.gameApi.sha256,
        assetsRoot: frozen.assets.root,
        assetCount: frozen.assets.count,
        candidateRuntimeTree: hashTree(path.join(REPO, "packages", "chronodivide-bot", "dist")),
        externalSupalosaRuntimeTree,
        externalSupalosaCommit: frozen.externalSupalosa.commit,
        maps,
    };
};

const programFiles = () => {
    const values = {
        program: PROGRAM,
        plan: path.join(DRIVER, "dist/training/unifiedIntentGate3DiagnosticPlan.js"),
        traceSupport: path.join(DRIVER, "dist/training/unifiedIntentGate2Trace.js"),
        telemetry: path.join(DRIVER, "dist/training/unifiedIntentGate3Telemetry.js"),
        candidate: path.join(DRIVER, "dist/training/deployedStrongBotCandidate.js"),
        baseline: path.join(DRIVER, "dist/benchmark/baselineLoader.js"),
        seeded: path.join(DRIVER, "dist/benchmark/seededOfflineGame.js"),
        firewall: path.join(DRIVER, "dist/training/symmetricObservationFirewall.js"),
        explicitStartLoader: path.join(REPO, "research/runtime/explicit-start-loader-v1.mjs"),
        explicitStartTransform: path.join(REPO, "research/runtime/explicit-start-transform-v1.mjs"),
        package: path.join(DRIVER, "package.json"),
        lockfile: path.join(DRIVER, "pnpm-lock.yaml"),
        pureProgram: path.join(REPO, "research/scripts/unified-intent-gate3-pure-gate.mjs"),
        pureSlurm: path.join(REPO, "research/slurm/unified_intent_gate3_pure.sbatch"),
        manifestSlurm: path.join(REPO, "research/slurm/unified_intent_gate3_diagnostic_manifest.sbatch"),
        traceSlurm: path.join(REPO, "research/slurm/unified_intent_gate3_diagnostic_trace.sbatch"),
        finalizerSlurm: path.join(REPO, "research/slurm/unified_intent_gate3_diagnostic_finalizer.sbatch"),
    };
    return Object.fromEntries(Object.entries(values).map(([name, file]) => [name, {
        path: file,
        bytes: fs.statSync(file).size,
        sha256: sha256File(file),
    }]));
};

const verifyPureGate = () => {
    const file = required("PURE_GATE_PATH");
    const expected = requiredHash("PURE_GATE_SHA256");
    if (sha256File(file) !== expected) throw new Error("Gate 3 A1 pure hash drifted");
    const value = json(file);
    if (
        value.kind !== "unified-intent-gate3-pure-gate-v1" ||
        !value.complete ||
        !value.passed ||
        !value.technicalOnly ||
        !value.competitiveFieldsAbsent ||
        value.sourceCommit !== required("SOURCE_COMMIT") ||
        value.tests?.vitest?.files !== 9 ||
        value.tests?.vitest?.tests !== 118 ||
        value.tests?.runtimeSchema?.tests !== 1 ||
        value.scheduler.account !== "pi_jss233" ||
        value.scheduler.partition !== "day"
    ) throw new Error("Gate 3 A1 pure artifact is ineligible");
    return value;
};

const startKey = (value) => String(value.x) + "," + String(value.y);
const setStart = (bot, ordinal) => { bot.chronoResearchStartPos = ordinal; };
const settings = (task, map, candidate, opponent, gameMode) => ({
    online: false,
    agents: task.candidateSlot === 0 ? [candidate, opponent] : [opponent, candidate],
    mapName: map.fileName,
    gameMode,
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

const createBots = (task, arm, factory) => {
    const candidateName = "Gate3A1Candidate";
    const opponentName = "Gate3A1Opponent";
    const botOptions = arm.enabled
        ? { intentArbiter: { enabled: true, totalCeiling: arm.totalCeiling } }
        : { intentArbiter: { enabled: false } };
    const candidate = createDeployedStrongBotCandidate(
        candidateName,
        task.country,
        {},
        botOptions,
    );
    const opponent = factory.create(opponentName, task.country);
    setStart(candidate, task.candidateStartOrdinal);
    setStart(opponent, task.opponentStartOrdinal);
    installSymmetricObservationFirewall([candidate, opponent], "api_full_state");
    return { candidate, opponent, candidateName, opponentName };
};

const observeStarts = (game, names) => ({
    candidate: startKey(game.getPlayerData(names.candidateName).startLocation),
    opponent: startKey(game.getPlayerData(names.opponentName).startLocation),
});

const prepare = async () => {
    const source = sourceIdentity();
    const pure = verifyPureGate();
    const runtime = verifyRuntime();
    const plan = buildUnifiedIntentGate3DiagnosticPlan(runtime.maps);
    validateUnifiedIntentGate3DiagnosticPlan(plan);
    await gameApi.cdapi.init(runtime.assetsRoot);
    const gameModes = Object.fromEntries(runtime.maps.map((map) => {
        const modes = gameApi.cdapi.getAvailableGameModes(map.fileName);
        if (modes.length === 0) throw new Error("Gate 3 A1 map mode unavailable");
        return [map.id, modes[0]];
    }));
    const factory = await loadBaselineFactory(path.join(REPO, "packages/chronodivide-bot"));
    if (factory.descriptor.kind !== "external-package") {
        throw new Error("Gate 3 A1 baseline is not external");
    }
    const selectorRows = [];
    for (const caseValue of plan.cases) {
        const map = runtime.maps.find((value) => value.id === caseValue.mapId);
        const bots = createBots(caseValue, plan.arms[0], factory);
        const observed = await withSeededOfflineGame(
            gameApi.cdapi,
            settings(caseValue, map, bots.candidate, bots.opponent, gameModes[map.id]),
            caseValue.requestedEngineSeed,
            [
                { agent: bots.candidate, identity: "candidate" },
                { agent: bots.opponent, identity: "opponent" },
            ],
            async (instance) => {
                const api = bots.candidate.lastGameApi;
                if (!api || !bots.opponent.lastGameApi || instance.isFinished() ||
                    api.getCurrentTick() !== 0) {
                    throw new Error("Gate 3 A1 selector setup drifted");
                }
                const starts = observeStarts(api, bots);
                exact(starts, {
                    candidate: caseValue.candidateStart,
                    opponent: caseValue.opponentStart,
                }, "Gate 3 A1 selector start drifted");
                return starts;
            },
        );
        selectorRows.push({
            caseIndex: caseValue.caseIndex,
            mapId: caseValue.mapId,
            directionOrdinal: caseValue.directionOrdinal,
            country: caseValue.country,
            candidateSlot: caseValue.candidateSlot,
            requestedEngineSeed: caseValue.requestedEngineSeed,
            updates: 0,
            observedStarts: observed,
        });
    }
    const manifest = {
        kind: "unified-intent-gate3-diagnostic-a1-manifest-v1",
        complete: true,
        passed: true,
        technicalOnly: true,
        competitiveFieldsAbsent: true,
        sourceCommit: source.sourceCommit,
        programSha256: source.programSha256,
        identities: source.identities,
        pure: {
            path: required("PURE_GATE_PATH"),
            sha256: requiredHash("PURE_GATE_SHA256"),
            jobId: pure.scheduler.jobId,
        },
        runtime,
        files: programFiles(),
        gameModes,
        plan,
        selectorRows,
        scheduler: {
            jobId: process.env.SLURM_JOB_ID,
            account: process.env.SLURM_JOB_ACCOUNT,
            partition: process.env.SLURM_JOB_PARTITION,
        },
    };
    rejectProhibited(manifest);
    const directory = required("OUT_DIR");
    if (directory !== path.join(EXECUTION, "manifest") || fs.existsSync(directory)) {
        throw new Error("Gate 3 A1 manifest output drifted");
    }
    fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
    const file = path.join(directory, "manifest.json");
    writeExclusive(file, JSON.stringify(manifest, null, 2) + "\n");
    writeExclusive(
        path.join(directory, "COMPLETE"),
        completeLine("COMPLETE_UNIFIED_INTENT_GATE3_DIAGNOSTIC_A1_MANIFEST_V1", file),
    );
    console.log(JSON.stringify({
        complete: true,
        passed: true,
        cases: 72,
        tasks: 288,
        manifestSha256: sha256File(file),
    }));
};

const loadManifest = () => {
    const file = required("MANIFEST_PATH");
    if (
        file !== path.join(EXECUTION, "manifest", "manifest.json") ||
        sha256File(file) !== requiredHash("MANIFEST_SHA256")
    ) throw new Error("Gate 3 A1 manifest binding drifted");
    const value = json(file);
    rejectProhibited(value);
    if (
        value.kind !== "unified-intent-gate3-diagnostic-a1-manifest-v1" ||
        !value.complete ||
        !value.passed ||
        !value.technicalOnly ||
        !value.competitiveFieldsAbsent ||
        value.sourceCommit !== required("SOURCE_COMMIT") ||
        value.programSha256 !== requiredHash("PROGRAM_SHA256") ||
        value.pure.sha256 !== requiredHash("PURE_GATE_SHA256") ||
        value.plan.cases.length !== 72 ||
        value.plan.tasks.length !== 288 ||
        value.selectorRows.length !== 72
    ) throw new Error("Gate 3 A1 manifest is ineligible");
    validateUnifiedIntentGate3DiagnosticPlan(value.plan);
    exact(programFiles(), value.files, "Gate 3 A1 program binding drifted");
    return value;
};

class DiagnosticFailure extends Error {
    constructor(status, gateChecks) {
        super(status);
        this.status = status;
        this.gateChecks = gateChecks;
    }
}

const telemetryChecks = (arm, value) => ({
    telemetrySchema: Boolean(
        value &&
        value.complete === true &&
        value.updates === 3600 &&
        value.totalCeiling === arm.totalCeiling &&
        value.gameplayReserve === 35 &&
        value.orderCap === arm.totalCeiling - 35 &&
        SHA256.test(value.telemetrySha256)
    ),
    budget: Boolean(
        value &&
        value.gameplayReserveOverflowUpdates === 0 &&
        value.totalCeilingOverflowUpdates === 0 &&
        value.maxima.rollingTotalCalls <= arm.totalCeiling &&
        value.maxima.rollingOrderCalls <= arm.totalCeiling - 35
    ),
    chunk: Boolean(value && value.maxima.maxForwardedChunkSize <= 128),
    oneForward: Boolean(
        value &&
        value.oneUnitMultipleForwardUpdates === 0 &&
        value.sums.multipleForwardedUnitViolations === 0
    ),
    forwardValidation: Boolean(
        value &&
        value.forwardedValidationViolationUpdates === 0 &&
        value.sums.forwardedValidationViolations === 0
    ),
    productionAtomicity: Boolean(
        value &&
        value.partialProductionBatchViolationUpdates === 0 &&
        value.sums.partialProductionBatchViolations === 0
    ),
});

const runRecord = async () => {
    const source = sourceIdentity();
    verifyPureGate();
    const runtime = verifyRuntime();
    const manifest = loadManifest();
    exact(runtime, manifest.runtime, "Gate 3 A1 trace runtime drifted");
    const taskIndex = Number(required("TASK_INDEX"));
    if (!Number.isSafeInteger(taskIndex) || taskIndex < 0 || taskIndex >= 288) {
        throw new Error("Gate 3 A1 task index drifted");
    }
    const task = manifest.plan.tasks[taskIndex];
    const map = runtime.maps.find((value) => value.id === task.mapId);
    if (!map) throw new Error("Gate 3 A1 trace map unavailable");
    const role = required("TRACE_ROLE");
    const directory = required("OUT_DIR");
    if (!["smoke", "array"].includes(role) || fs.existsSync(directory)) {
        throw new Error("Gate 3 A1 record output drifted");
    }
    fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
    try {
        await gameApi.cdapi.init(runtime.assetsRoot);
        const factory = await loadBaselineFactory(path.join(REPO, "packages/chronodivide-bot"));
        if (factory.descriptor.kind !== "external-package") {
            throw new Error("Gate 3 A1 trace baseline is not external");
        }
        const bots = createBots(task, task.arm, factory);
        const trace = new UnifiedIntentGate2ActionTrace();
        installUnifiedIntentGate2ActionTrace({
            candidate: bots.candidate,
            opponent: bots.opponent,
        }, trace);
        const snapshots = new UnifiedIntentGate2Trajectory();
        const collector = task.arm.enabled
            ? new UnifiedIntentGate3TelemetryCollector(task.arm.totalCeiling, task.fixedUpdates)
            : null;
        let diagnostic;
        try {
            diagnostic = await withSeededOfflineGame(
                gameApi.cdapi,
                settings(task, map, bots.candidate, bots.opponent, manifest.gameModes[map.id]),
                task.requestedEngineSeed,
                [
                    { agent: bots.candidate, identity: "candidate" },
                    { agent: bots.opponent, identity: "opponent" },
                ],
                async (instance) => {
                    const api = bots.candidate.lastGameApi;
                    if (!api || !bots.opponent.lastGameApi || instance.isFinished() ||
                        api.getCurrentTick() !== 0) {
                        throw new DiagnosticFailure("setup_contract", { setup: false });
                    }
                    const observed = observeStarts(api, bots);
                    if (canonical(observed) !== canonical({
                        candidate: task.candidateStart,
                        opponent: task.opponentStart,
                    })) throw new DiagnosticFailure("setup_contract", { setup: false });
                    try {
                        snapshots.observe(snapshotUnifiedIntentGate2PublicState(api, {
                            candidate: bots.candidate,
                            opponent: bots.opponent,
                        }));
                    } catch {
                        throw new DiagnosticFailure("trace_contract", { traceContract: false });
                    }
                    for (let update = 1; update <= task.fixedUpdates; update += 1) {
                        if (instance.isFinished()) {
                            throw new DiagnosticFailure(
                                "fixed_horizon_incomplete",
                                { horizon: false },
                            );
                        }
                        await instance.update();
                        if (api.getCurrentTick() !== update) {
                            throw new DiagnosticFailure("setup_contract", { setup: false });
                        }
                        if (instance.isFinished()) {
                            throw new DiagnosticFailure(
                                "fixed_horizon_incomplete",
                                { horizon: false },
                            );
                        }
                        const telemetry = bots.candidate.lastUnifiedIntentTelemetry;
                        if (collector) {
                            if (!telemetry) {
                                throw new DiagnosticFailure(
                                    "telemetry_contract",
                                    { telemetrySchema: false },
                                );
                            }
                            try {
                                collector.observe(telemetry);
                            } catch {
                                throw new DiagnosticFailure(
                                    "telemetry_contract",
                                    { telemetrySchema: false },
                                );
                            }
                        } else if (telemetry !== null) {
                            throw new DiagnosticFailure(
                                "telemetry_contract",
                                { telemetrySchema: false },
                            );
                        }
                        if (update % 900 === 0) {
                            try {
                                snapshots.observe(snapshotUnifiedIntentGate2PublicState(api, {
                                    candidate: bots.candidate,
                                    opponent: bots.opponent,
                                }));
                            } catch {
                                throw new DiagnosticFailure(
                                    "trace_contract",
                                    { traceContract: false },
                                );
                            }
                        }
                    }
                    let traceValue;
                    let snapshotValue;
                    try {
                        traceValue = trace.finish();
                        snapshotValue = snapshots.finish();
                    } catch {
                        throw new DiagnosticFailure("trace_contract", { traceContract: false });
                    }
                    if (
                        snapshotValue.snapshots.length !== 5 ||
                        !SHA256.test(snapshotValue.sha256) ||
                        !SHA256.test(traceValue.candidate.sha256) ||
                        !SHA256.test(traceValue.opponent.sha256)
                    ) throw new DiagnosticFailure("trace_contract", { traceContract: false });
                    let telemetry = null;
                    if (collector) {
                        try {
                            telemetry = collector.finish();
                        } catch {
                            throw new DiagnosticFailure(
                                "telemetry_contract",
                                { telemetrySchema: false },
                            );
                        }
                        const gateChecks = telemetryChecks(task.arm, telemetry);
                        if (Object.values(gateChecks).some((value) => !value)) {
                            throw new DiagnosticFailure("telemetry_contract", gateChecks);
                        }
                    }
                    return {
                        status: "clean",
                        updates: 3600,
                        snapshots: 5,
                        traceSha256: hash(canonical({ traceValue, snapshotValue })),
                        telemetrySha256: telemetry?.telemetrySha256 ?? null,
                        gateChecks: {
                            setup: true,
                            horizon: true,
                            traceContract: true,
                            ...(telemetry ? telemetryChecks(task.arm, telemetry) : {}),
                        },
                    };
                },
            );
        } catch (error) {
            if (!(error instanceof DiagnosticFailure) || !STATUSES.has(error.status)) throw error;
            diagnostic = { status: error.status, gateChecks: error.gateChecks };
        }
        if (
            !STATUSES.has(diagnostic.status) ||
            Object.values(diagnostic.gateChecks).some((value) => typeof value !== "boolean") ||
            (diagnostic.status === "clean" && Object.values(diagnostic.gateChecks).some((value) => !value)) ||
            (diagnostic.status !== "clean" && !Object.values(diagnostic.gateChecks).some((value) => !value))
        ) throw new Error("Gate 3 A1 diagnostic schema drifted");
        const artifact = {
            kind: "unified-intent-gate3-diagnostic-a1-record-v1",
            complete: true,
            passed: diagnostic.status === "clean",
            technicalOnly: true,
            competitiveFieldsAbsent: true,
            sourceCommit: source.sourceCommit,
            programSha256: source.programSha256,
            manifestSha256: requiredHash("MANIFEST_SHA256"),
            role,
            assignment: task,
            mapSha256: map.sha256,
            diagnostic,
            scheduler: {
                jobId: process.env.SLURM_JOB_ID,
                arrayJobId: process.env.SLURM_ARRAY_JOB_ID ?? null,
                arrayTaskId: process.env.SLURM_ARRAY_TASK_ID ?? null,
                account: process.env.SLURM_JOB_ACCOUNT,
                partition: process.env.SLURM_JOB_PARTITION,
            },
        };
        rejectProhibited(artifact);
        const file = path.join(directory, "record.json");
        writeExclusive(file, JSON.stringify(artifact) + "\n");
        if (fs.statSync(file).size > RECORD_LIMIT) {
            throw new Error("Gate 3 A1 record exceeds size limit");
        }
        writeExclusive(
            path.join(directory, "COMPLETE"),
            completeLine("COMPLETE_UNIFIED_INTENT_GATE3_DIAGNOSTIC_A1_RECORD_V1", file),
        );
    } catch (error) {
        const failure = {
            kind: "unified-intent-gate3-diagnostic-a1-runner-failure-v1",
            complete: false,
            passed: false,
            technicalOnly: true,
            competitiveFieldsAbsent: true,
            taskIndex,
            errorType: error instanceof Error ? error.name : "UnknownError",
        };
        rejectProhibited(failure);
        const file = path.join(directory, "FAILURE.json");
        if (!fs.existsSync(file)) writeExclusive(file, JSON.stringify(failure, null, 2) + "\n");
        throw error;
    }
};

const parseRecord = (directory, task, manifestSha256, role) => {
    exact(fs.readdirSync(directory).sort(), ["COMPLETE", "record.json"], "Gate 3 A1 record files drifted");
    const file = path.join(directory, "record.json");
    const marker = fs.readFileSync(path.join(directory, "COMPLETE"), "utf8").trim();
    const match = COMPLETE_RE.exec(marker);
    if (
        !match ||
        match[1] !== sha256File(file) ||
        Number(match[2]) !== fs.statSync(file).size ||
        fs.statSync(file).size > RECORD_LIMIT
    ) throw new Error("Gate 3 A1 record checksum drifted");
    const value = json(file);
    rejectProhibited(value);
    if (
        value.kind !== "unified-intent-gate3-diagnostic-a1-record-v1" ||
        !value.complete ||
        !value.technicalOnly ||
        !value.competitiveFieldsAbsent ||
        value.role !== role ||
        value.manifestSha256 !== manifestSha256 ||
        !STATUSES.has(value.diagnostic.status) ||
        value.passed !== (value.diagnostic.status === "clean")
    ) throw new Error("Gate 3 A1 record schema drifted");
    exact(value.assignment, task, "Gate 3 A1 assignment drifted");
    const keys = Object.keys(value.diagnostic).sort();
    if (value.diagnostic.status === "clean") {
        exact(keys, [
            "gateChecks", "snapshots", "status", "telemetrySha256",
            "traceSha256", "updates",
        ], "Gate 3 A1 clean record drifted");
        if (
            value.diagnostic.updates !== 3600 ||
            value.diagnostic.snapshots !== 5 ||
            !SHA256.test(value.diagnostic.traceSha256) ||
            (task.arm.enabled
                ? !SHA256.test(value.diagnostic.telemetrySha256)
                : value.diagnostic.telemetrySha256 !== null) ||
            Object.values(value.diagnostic.gateChecks).some((check) => check !== true)
        ) throw new Error("Gate 3 A1 clean checks failed");
    } else {
        exact(keys, ["gateChecks", "status"], "Gate 3 A1 failure record drifted");
        if (!Object.values(value.diagnostic.gateChecks).some((check) => check === false)) {
            throw new Error("Gate 3 A1 failure check drifted");
        }
    }
    return value;
};

const schedulerRows = (arrayJobId) => {
    const raw = execFileSync("/opt/slurm/current/bin/sacct", [
        "-X", "-n", "-P", "-j", arrayJobId,
        "--format=JobID,JobIDRaw,State,ExitCode,Account,Partition,AllocCPUS,Restarts,ElapsedRaw",
    ], { encoding: "utf8" });
    const rows = raw.trim().split("\n").filter(Boolean).map((line) => {
        const values = line.split("|");
        return {
            label: values[0], jobId: values[1], state: values[2],
            exitCode: values[3], account: values[4], partition: values[5],
            cpus: Number(values[6]), restarts: Number(values[7]),
            elapsedSeconds: Number(values[8]),
        };
    }).filter((row) => row.label.startsWith(arrayJobId + "_"));
    if (
        rows.length !== 288 ||
        new Set(rows.map((value) => value.label)).size !== 288 ||
        new Set(rows.map((value) => value.jobId)).size !== 288
    ) throw new Error("Gate 3 A1 scheduler identities drifted");
    for (let taskIndex = 0; taskIndex < 288; taskIndex += 1) {
        const row = rows.find((value) => value.label === arrayJobId + "_" + taskIndex);
        if (
            !row || row.state !== "COMPLETED" || row.exitCode !== "0:0" ||
            row.account !== "pi_jss233" || row.partition !== "day" ||
            row.cpus !== 1 || row.restarts !== 0
        ) throw new Error("Gate 3 A1 scheduler task failed");
    }
    return rows.sort((left, right) =>
        Number(left.label.split("_")[1]) - Number(right.label.split("_")[1]));
};

const csv = (rows) => {
    const keys = Object.keys(rows[0]);
    const encode = (value) => '"' + String(value ?? "").replaceAll('"', '""') + '"';
    return keys.map(encode).join(",") + "\n" + rows.map((row) => keys.map((key) =>
        encode(typeof row[key] === "object" ? JSON.stringify(row[key]) : row[key])).join(","))
        .join("\n") + "\n";
};

const countFiles = (root) => {
    let count = 0;
    const visit = (directory) => {
        for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
            const value = path.join(directory, entry.name);
            if (entry.isDirectory()) visit(value);
            else if (entry.isFile()) count += 1;
        }
    };
    visit(root);
    return count;
};

const faction = (country) => COUNTRIES.indexOf(country) < 5 ? "Allied" : "Soviet";

const finalize = () => {
    const source = sourceIdentity();
    verifyPureGate();
    const runtime = verifyRuntime();
    const manifest = loadManifest();
    exact(runtime, manifest.runtime, "Gate 3 A1 finalizer runtime drifted");
    const manifestSha256 = requiredHash("MANIFEST_SHA256");
    const arrayJobId = required("ARRAY_JOB_ID");
    const scheduler = schedulerRows(arrayJobId);
    const smoke = parseRecord(
        path.join(EXECUTION, "smoke"),
        manifest.plan.tasks[0],
        manifestSha256,
        "smoke",
    );
    if (
        smoke.diagnostic.status !== "clean" ||
        smoke.sourceCommit !== source.sourceCommit ||
        smoke.programSha256 !== source.programSha256 ||
        smoke.scheduler.account !== "pi_jss233" ||
        smoke.scheduler.partition !== "day" ||
        smoke.scheduler.arrayJobId !== null ||
        smoke.scheduler.arrayTaskId !== null
    ) throw new Error("Gate 3 A1 smoke drifted");
    const records = manifest.plan.tasks.map((task) => parseRecord(
        path.join(EXECUTION, "cells", "task-" + String(task.taskIndex).padStart(3, "0")),
        task,
        manifestSha256,
        "array",
    ));
    const schedulerJobIds = new Set();
    for (const [taskIndex, value] of records.entries()) {
        const map = runtime.maps.find((candidate) => candidate.id === value.assignment.mapId);
        if (
            value.sourceCommit !== source.sourceCommit ||
            value.programSha256 !== source.programSha256 ||
            !map || value.mapSha256 !== map.sha256 ||
            value.scheduler.account !== "pi_jss233" ||
            value.scheduler.partition !== "day" ||
            value.scheduler.arrayJobId !== arrayJobId ||
            String(value.scheduler.arrayTaskId) !== String(taskIndex) ||
            typeof value.scheduler.jobId !== "string"
        ) throw new Error("Gate 3 A1 array identity drifted");
        schedulerJobIds.add(value.scheduler.jobId);
    }
    if (schedulerJobIds.size !== 288) throw new Error("Gate 3 A1 scheduler IDs are not unique");

    const taskRows = records.map((value) => ({
        taskIndex: value.assignment.taskIndex,
        caseIndex: value.assignment.caseIndex,
        mapId: value.assignment.mapId,
        directionOrdinal: value.assignment.directionOrdinal,
        faction: faction(value.assignment.country),
        country: value.assignment.country,
        candidateSlot: value.assignment.candidateSlot,
        requestedEngineSeed: value.assignment.requestedEngineSeed,
        armId: value.assignment.arm.id,
        status: value.diagnostic.status,
        gateChecks: value.diagnostic.gateChecks,
        traceSha256: value.diagnostic.traceSha256 ?? null,
        telemetrySha256: value.diagnostic.telemetrySha256 ?? null,
    }));
    const contingency = [];
    for (const map of runtime.maps) {
        for (let directionOrdinal = 0; directionOrdinal < 2; directionOrdinal += 1) {
            for (const factionValue of ["Allied", "Soviet"]) {
                for (let candidateSlot = 0; candidateSlot < 2; candidateSlot += 1) {
                    for (const arm of manifest.plan.arms) {
                        for (const status of STATUSES) {
                            contingency.push({
                                mapId: map.id,
                                directionOrdinal,
                                faction: factionValue,
                                candidateSlot,
                                armId: arm.id,
                                status,
                                count: taskRows.filter((row) =>
                                    row.mapId === map.id &&
                                    row.directionOrdinal === directionOrdinal &&
                                    row.faction === factionValue &&
                                    row.candidateSlot === candidateSlot &&
                                    row.armId === arm.id &&
                                    row.status === status).length,
                            });
                        }
                    }
                }
            }
        }
    }
    if (contingency.length !== 320 || contingency.reduce((sum, row) => sum + row.count, 0) !== 288) {
        throw new Error("Gate 3 A1 contingency drifted");
    }
    const statusCounts = Object.fromEntries([...STATUSES].map((status) => [
        status,
        taskRows.filter((row) => row.status === status).length,
    ]));
    const directory = required("OUT_DIR");
    if (directory !== path.join(EXECUTION, "finalizer") || fs.existsSync(directory)) {
        throw new Error("Gate 3 A1 finalizer output drifted");
    }
    fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
    const outputs = {
        "tasks.csv": csv(taskRows),
        "contingency.csv": csv(contingency),
        "scheduler.csv": csv(scheduler),
    };
    const descriptors = {};
    for (const [name, content] of Object.entries(outputs)) {
        const file = path.join(directory, name);
        writeExclusive(file, content);
        descriptors[name] = { sha256: sha256File(file), bytes: fs.statSync(file).size };
        writeExclusive(file + ".sha256", descriptors[name].sha256 + "  " + file + "\n");
    }
    const filesBeforeAggregate = countFiles(EXECUTION);
    const aggregate = {
        kind: "unified-intent-gate3-diagnostic-a1-aggregate-v1",
        complete: true,
        passed: true,
        technicalOnly: true,
        competitiveFieldsAbsent: true,
        gate3Eligible: false,
        sourceCommit: source.sourceCommit,
        programSha256: source.programSha256,
        manifestSha256,
        manifestJobId: manifest.scheduler.jobId,
        smokeJobId: smoke.scheduler.jobId,
        arrayJobId,
        finalizerJobId: process.env.SLURM_JOB_ID,
        cases: 72,
        tasks: 288,
        maps: 2,
        countries: 9,
        slots: 2,
        arms: 4,
        fixedUpdates: 3600,
        statusCounts,
        filesBeforeAggregate,
        expectedFilesAfter: filesBeforeAggregate + 3,
        outputs: descriptors,
    };
    rejectProhibited(aggregate);
    if (aggregate.expectedFilesAfter >= FILE_LIMIT) {
        throw new Error("Gate 3 A1 file budget exceeded");
    }
    const aggregateFile = path.join(directory, "aggregate.json");
    writeExclusive(aggregateFile, JSON.stringify(aggregate, null, 2) + "\n");
    writeExclusive(
        aggregateFile + ".sha256",
        sha256File(aggregateFile) + "  " + aggregateFile + "\n",
    );
    writeExclusive(
        path.join(directory, "COMPLETE"),
        completeLine("COMPLETE_UNIFIED_INTENT_GATE3_DIAGNOSTIC_A1_FINALIZER_V1", aggregateFile),
    );
    if (countFiles(EXECUTION) !== aggregate.expectedFilesAfter) {
        throw new Error("Gate 3 A1 final file count drifted");
    }
    console.log(JSON.stringify({
        complete: true,
        passed: true,
        gate3Eligible: false,
        statusCounts,
        aggregateSha256: sha256File(aggregateFile),
    }));
};

const mode = required("MODE");
if (mode === "prepare") await prepare();
else if (mode === "trace") await runRecord();
else if (mode === "finalize") finalize();
else throw new Error("Unknown Gate 3 A1 mode");
