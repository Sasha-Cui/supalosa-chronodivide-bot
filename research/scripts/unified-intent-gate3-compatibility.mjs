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
const GATE2_STUDY = path.join(PROJECT, "research-evidence", "unified-intent-arbiter-v1", "gate-2");
const STUDY = path.join(PROJECT, "research-evidence", "unified-intent-arbiter-v1", "gate-3");
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
const AUDIT = path.join(GATE2_STUDY, "seed-audit-v1-a2", "seed-audit.json");
const AUDIT_SHA256 = "6e83a8d51597236dbf1fe80d22262b40bfc737dc6234c68a94853af5ddfaf52a";
const AUDIT_BYTES = 585357862;
const CERTIFICATE_ROOT = path.join(GATE2_STUDY, "seed-certificate-v1-a4");
const CERTIFICATE = path.join(CERTIFICATE_ROOT, "selection-certificate.json");
const CERTIFICATE_SHA256 = "f7f7086d32630b1eede7a300a382a9348d60f610c1768c300cb3818f738307fd";
const CERTIFICATE_BYTES = 4399;
const TRACE_LIMIT = 32 * 1024 * 1024;
const FILE_LIMIT = 2000;
const SHA256 = /^[0-9a-f]{64}$/;
const COMPLETE_RE = /^COMPLETE_UNIFIED_INTENT_GATE3_CASE_V1 ([0-9a-f]{64}) ([0-9]+)$/;
const PROHIBITED = /winner|outcome|score|endpoint|defeated|terminalbuilding|remainingbuilding|buildingcount|rank/i;

const MAP_IDS = [
    "hfo-le", "peak", "hfo-original", "hfo-golden", "hfo-corners",
    "hfo-corners-b", "hfo-corners-b-golden", "hfo-bvb", "hfo-lvl",
    "hfo-rvr", "hfo-tvt", "tour-of-egypt", "south-pacific",
    "south-pacific-2", "pacific-heights",
];
const ADVANCED_MAP_IDS = new Set([
    "hfo-le", "hfo-original", "hfo-golden", "hfo-corners",
    "hfo-corners-b", "hfo-corners-b-golden", "hfo-bvb", "hfo-lvl",
    "hfo-rvr", "hfo-tvt",
]);

const requireDriver = createRequire(path.join(DRIVER, "package.json"));
const gameApiPath = fs.realpathSync(requireDriver.resolve("@chronodivide/game-api"));
const gameApi = await import(pathToFileURL(gameApiPath).href);
const {
    buildUnifiedIntentGate3Plan,
    validateUnifiedIntentGate3Plan,
} = await import(pathToFileURL(path.join(
    DRIVER, "dist", "training", "unifiedIntentGate3Plan.js",
)).href);
const {
    installUnifiedIntentGate2ActionTrace,
    snapshotUnifiedIntentGate2PublicState,
    UnifiedIntentGate2ActionTrace,
    UnifiedIntentGate2Trajectory,
} = await import(pathToFileURL(path.join(
    DRIVER, "dist", "training", "unifiedIntentGate2Trace.js",
)).href);
const { createDeployedStrongBotCandidate } = await import(pathToFileURL(path.join(
    DRIVER, "dist", "training", "deployedStrongBotCandidate.js",
)).href);
const { UnifiedIntentGate3TelemetryCollector } = await import(pathToFileURL(path.join(
    DRIVER, "dist", "training", "unifiedIntentGate3Telemetry.js",
)).href);
const { loadBaselineFactory } = await import(pathToFileURL(path.join(
    DRIVER, "dist", "benchmark", "baselineLoader.js",
)).href);
const { withSeededOfflineGame } = await import(pathToFileURL(path.join(
    DRIVER, "dist", "benchmark", "seededOfflineGame.js",
)).href);
const { installSymmetricObservationFirewall } = await import(pathToFileURL(path.join(
    DRIVER, "dist", "training", "symmetricObservationFirewall.js",
)).href);

const hash = (value) => crypto.createHash("sha256").update(value).digest("hex");
const read = (file) => fs.readFileSync(file);
const sha256File = (file) => hash(read(file));
const json = (file) => JSON.parse(read(file));
const {
    createInspectableRa2WebBot,
    loadRa2WebOpponent,
} = await import(pathToFileURL(path.join(
    DRIVER, "dist", "training", "ra2WebOpponentBundle.js",
)).href);
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
        if (PROHIBITED.test(key)) throw new Error("Gate 3 prohibited field " + key);
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

const sourceFiles = {
    gate3Protocol: path.join(
        REPO, "research/protocols/method/2026-09-09-unified-intent-arbiter-v1-gate-3.md",
    ),
    gate1Result: path.join(
        REPO, "research/results/2026-09-07-unified-intent-arbiter-v1-gate-1.md",
    ),
    gate2Result: path.join(
        REPO, "research/results/2026-09-09-unified-intent-arbiter-v1-gate-2-complete.md",
    ),
};
const PURE_GATE_PROGRAM = path.join(
    REPO,
    "research",
    "scripts",
    "unified-intent-gate3-pure-gate.mjs",
);

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
    ) throw new Error("Gate 3 source identity drifted");
    const identities = {};
    for (const [name, file] of Object.entries(sourceFiles)) {
        const environment = "IDENTITY_" + name.toUpperCase() + "_SHA256";
        const actual = sha256File(file);
        if (requiredHash(environment) !== actual) {
            throw new Error("Gate 3 source file hash drifted: " + name);
        }
        identities[name + "Sha256"] = actual;
    }
    return { sourceCommit, programSha256, identities };
};

const verifyCertificate = () => {
    if (
        fs.statSync(AUDIT).size !== AUDIT_BYTES ||
        sha256File(AUDIT) !== AUDIT_SHA256 ||
        fs.statSync(CERTIFICATE).size !== CERTIFICATE_BYTES ||
        sha256File(CERTIFICATE) !== CERTIFICATE_SHA256 ||
        fs.readFileSync(path.join(CERTIFICATE_ROOT, "COMPLETE"), "utf8").trim() !==
            "COMPLETE_UNIFIED_INTENT_GATE2_SEED_CERTIFICATE_V1_A4" ||
        fs.readFileSync(
            path.join(CERTIFICATE_ROOT, "selection-certificate.sha256"),
            "utf8",
        ).trim().split(/\s+/)[0] !== CERTIFICATE_SHA256
    ) throw new Error("Gate 2 seed certificate binding drifted");
    const value = json(CERTIFICATE);
    if (
        value.complete !== true ||
        value.passed !== true ||
        value.technicalOnly !== true ||
        value.competitiveFieldsAbsent !== true ||
        value.selectedBase !== 3350000000 ||
        canonical(value.selectedInterval) !== canonical([3350000000, 3351000000]) ||
        value.audit.sha256 !== AUDIT_SHA256 ||
        value.audit.bytes !== AUDIT_BYTES ||
        value.audit.job.jobId !== "25480245" ||
        value.audit.job.state !== "COMPLETED" ||
        value.audit.job.exitCode !== "0:0" ||
        value.audit.job.account !== "pi_jss233" ||
        value.audit.job.partition !== "day" ||
        value.audit.job.cpus !== 1 ||
        value.audit.job.restarts !== 0 ||
        value.candidateAssessments.length !== 20 ||
        value.candidateAssessments.find((row) => row.selected)?.base !== 3350000000 ||
        value.sampleSize !== 2048 ||
        !SHA256.test(value.sampleSha256) ||
        value.totals.errors !== 0
    ) throw new Error("Gate 2 seed certificate is ineligible");
    rejectProhibited(value);
    return value;
};

const verifyRuntime = () => {
    if (sha256File(RUNTIME_FREEZE) !== RUNTIME_FREEZE_SHA256) {
        throw new Error("Gate 3 runtime freeze drifted");
    }
    const value = json(RUNTIME_FREEZE);
    if (!value.complete || !value.passed) throw new Error("Gate 3 runtime freeze failed");
    const frozen = value.frozen;
    if (
        sha256File(gameApiPath) !== frozen.gameApi.sha256 ||
        frozen.nodeVersion !== "v20.13.1"
    ) throw new Error("Gate 3 game runtime drifted");
    const externalSupalosaRuntimeTree = hashTree(frozen.externalSupalosa.runtimeTree.root);
    exact(
        externalSupalosaRuntimeTree,
        frozen.externalSupalosa.runtimeTree,
        "Gate 3 external Supalosa runtime drifted",
    );
    const byMapId = new Map(frozen.maps.map((map) => [map.id, map]));
    const maps = MAP_IDS.map((id) => {
        const map = byMapId.get(id);
        if (!map || map.starts.length < 2) {
            throw new Error("Gate 3 frozen map is missing: " + id);
        }
        return { ...map, advancedEligible: ADVANCED_MAP_IDS.has(id) };
    });
    if (maps.filter((map) => map.advancedEligible).length !== 10) {
        throw new Error("Gate 3 Advanced map coverage drifted");
    }
    for (const map of maps) {
        if (sha256File(map.absolutePath) !== map.sha256) {
            throw new Error("Gate 3 map drifted: " + map.id);
        }
    }
    if (
        !Array.isArray(frozen.assets.entries) ||
        frozen.assets.entries.length !== frozen.assets.count
    ) throw new Error("Gate 3 asset count drifted");
    for (const entry of frozen.assets.entries) {
        if (
            canonical(Object.keys(entry).sort()) !== canonical(["name", "sha256"]) ||
            typeof entry.name !== "string" ||
            !SHA256.test(entry.sha256)
        ) throw new Error("Gate 3 asset schema drifted");
        const file = path.join(frozen.assets.root, entry.name);
        if (!fs.statSync(file).isFile() || sha256File(file) !== entry.sha256) {
            throw new Error("Gate 3 asset drifted: " + entry.name);
        }
    }
    const advanced = frozen.ra2WebAdvanced;
    if (
        sha256File(advanced.bundlePath) !== advanced.bundleSha256 ||
        sha256File(advanced.manifestPath) !== advanced.manifestSha256 ||
        advanced.opponentId !== "ra2web_advanced_old_priest"
    ) throw new Error("Gate 3 Advanced runtime drifted");
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
        advancedFreezeRoot: advanced.freezeRoot,
        advancedBundleSha256: advanced.bundleSha256,
        advancedManifestSha256: advanced.manifestSha256,
        advancedOpponentId: advanced.opponentId,
    };
};

const programFiles = () => {
    const values = {
        program: PROGRAM,
        plan: path.join(DRIVER, "dist", "training", "unifiedIntentGate3Plan.js"),
        trace: path.join(DRIVER, "dist", "training", "unifiedIntentGate2Trace.js"),
        candidate: path.join(DRIVER, "dist", "training", "deployedStrongBotCandidate.js"),
        baseline: path.join(DRIVER, "dist", "benchmark", "baselineLoader.js"),
        seeded: path.join(DRIVER, "dist", "benchmark", "seededOfflineGame.js"),
        firewall: path.join(DRIVER, "dist", "training", "symmetricObservationFirewall.js"),
        telemetry: path.join(DRIVER, "dist", "training", "unifiedIntentGate3Telemetry.js"),
        pureGate: PURE_GATE_PROGRAM,
        explicitStartLoader: path.join(REPO, "research", "runtime", "explicit-start-loader-v1.mjs"),
        explicitStartTransform: path.join(REPO, "research", "runtime", "explicit-start-transform-v1.mjs"),
        package: path.join(DRIVER, "package.json"),
        lockfile: path.join(DRIVER, "pnpm-lock.yaml"),
        advanced: path.join(DRIVER, "dist", "training", "ra2WebOpponentBundle.js"),
        pureSlurm: path.join(REPO, "research", "slurm", "unified_intent_gate3_pure.sbatch"),
        manifestSlurm: path.join(REPO, "research", "slurm", "unified_intent_gate3_manifest.sbatch"),
        traceSlurm: path.join(REPO, "research", "slurm", "unified_intent_gate3_trace.sbatch"),
        finalizerSlurm: path.join(REPO, "research", "slurm", "unified_intent_gate3_finalizer.sbatch"),
    };
    return Object.fromEntries(Object.entries(values).map(([name, file]) => [name, {
        path: file,
        bytes: fs.statSync(file).size,
        sha256: sha256File(file),
    }]));
};

const verifyProgramFiles = (expected) =>
    exact(programFiles(), expected, "Gate 3 program file drifted");

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

const createBots = async (task, arm, factory, advancedDefinition) => {
    const candidateName = "Gate3Candidate";
    const opponentName = "Gate3Opponent";
    const botOptions = arm.enabled
        ? { intentArbiter: { enabled: true, totalCeiling: arm.totalCeiling } }
        : { intentArbiter: { enabled: false } };
    const candidate = createDeployedStrongBotCandidate(
        candidateName,
        task.country,
        {},
        botOptions,
    );
    const opponent = task.opponent === "pinned_supalosa"
        ? factory.create(opponentName, task.country)
        : createInspectableRa2WebBot(advancedDefinition, opponentName, task.country);
    setStart(candidate, task.candidateStartOrdinal);
    setStart(opponent, task.opponentStartOrdinal);
    installSymmetricObservationFirewall([candidate, opponent], "api_full_state");
    return { candidate, opponent, candidateName, opponentName };
};

const observeStarts = (game, names) => ({
    candidate: startKey(game.getPlayerData(names.candidateName).startLocation),
    opponent: startKey(game.getPlayerData(names.opponentName).startLocation),
});

const verifyPureGate = () => {
    const file = required("PURE_GATE_PATH");
    const expected = requiredHash("PURE_GATE_SHA256");
    if (sha256File(file) !== expected) throw new Error("Gate 3 pure gate hash drifted");
    const value = json(file);
    if (
        value.kind !== "unified-intent-gate3-pure-gate-v1" ||
        value.complete !== true ||
        value.passed !== true ||
        value.technicalOnly !== true ||
        value.competitiveFieldsAbsent !== true ||
        value.sourceCommit !== required("SOURCE_COMMIT") ||
        value.programSha256 !== sha256File(PURE_GATE_PROGRAM) ||
        value.tests?.vitest?.files !== 8 ||
        value.tests?.vitest?.tests !== 115 ||
        value.tests?.runtimeSchema?.tests !== 1 ||
        value.scheduler.account !== "pi_jss233" ||
        value.scheduler.partition !== "day"
    ) throw new Error("Gate 3 pure gate is ineligible");
    rejectProhibited(value);
    return value;
};

const prepare = async () => {
    const source = sourceIdentity();
    const certificate = verifyCertificate();
    const pureGate = verifyPureGate();
    const runtime = verifyRuntime();
    const plan = buildUnifiedIntentGate3Plan(runtime.maps);
    validateUnifiedIntentGate3Plan(plan);
    await gameApi.cdapi.init(runtime.assetsRoot);
    const gameModes = Object.fromEntries(runtime.maps.map((map) => {
        const modes = gameApi.cdapi.getAvailableGameModes(map.fileName);
        if (modes.length === 0) throw new Error("Gate 3 map mode unavailable");
        return [map.id, modes[0]];
    }));
    const factory = await loadBaselineFactory(path.join(REPO, "packages", "chronodivide-bot"));
    if (factory.descriptor.kind !== "external-package") {
        throw new Error("Gate 3 baseline is not external");
    }
    const advancedDefinition = loadRa2WebOpponent(
        runtime.advancedFreezeRoot,
        runtime.advancedOpponentId,
    );
    const selectorRows = [];
    for (const caseValue of plan.cases) {
        const map = runtime.maps.find((value) => value.id === caseValue.mapId);
        if (!map) throw new Error("Gate 3 selector map is unavailable");
        const bots = await createBots(
            caseValue,
            plan.arms[0],
            factory,
            advancedDefinition,
        );
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
                    throw new Error("Gate 3 zero-update selector did not initialize cleanly");
                }
                const starts = observeStarts(api, bots);
                exact(starts, {
                    candidate: caseValue.candidateStart,
                    opponent: caseValue.opponentStart,
                }, "Gate 3 selected start drifted");
                return starts;
            },
        );
        selectorRows.push({
            caseIndex: caseValue.caseIndex,
            opponent: caseValue.opponent,
            mapId: caseValue.mapId,
            country: caseValue.country,
            candidateSlot: caseValue.candidateSlot,
            requestedEngineSeed: caseValue.requestedEngineSeed,
            updates: 0,
            observedStarts: observed,
        });
    }
    const manifest = {
        kind: "unified-intent-gate3-manifest-v1",
        complete: true,
        passed: true,
        technicalOnly: true,
        competitiveFieldsAbsent: true,
        sourceCommit: source.sourceCommit,
        programSha256: source.programSha256,
        identities: source.identities,
        seedAudit: { path: AUDIT, sha256: AUDIT_SHA256, bytes: AUDIT_BYTES },
        seedCertificate: {
            path: CERTIFICATE,
            sha256: CERTIFICATE_SHA256,
            bytes: CERTIFICATE_BYTES,
            selectedBase: certificate.selectedBase,
        },
        pureGate: {
            path: required("PURE_GATE_PATH"),
            sha256: requiredHash("PURE_GATE_SHA256"),
            programSha256: pureGate.programSha256,
            jobId: pureGate.scheduler.jobId,
            tests: pureGate.tests,
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
        throw new Error("Gate 3 manifest output path drifted");
    }
    fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
    const file = path.join(directory, "manifest.json");
    writeExclusive(file, JSON.stringify(manifest, null, 2) + "\n");
    writeExclusive(
        path.join(directory, "COMPLETE"),
        completeLine("COMPLETE_UNIFIED_INTENT_GATE3_MANIFEST_V1", file),
    );
    console.log(JSON.stringify({
        complete: true,
        passed: true,
        cases: plan.cases.length,
        tasks: plan.tasks.length,
        traces: plan.counts.traces,
        manifestSha256: sha256File(file),
    }));
};

const loadManifest = () => {
    const file = required("MANIFEST_PATH");
    const expectedHash = requiredHash("MANIFEST_SHA256");
    if (
        file !== path.join(EXECUTION, "manifest", "manifest.json") ||
        sha256File(file) !== expectedHash
    ) throw new Error("Gate 3 manifest binding drifted");
    const value = json(file);
    rejectProhibited(value);
    if (
        !value.complete ||
        !value.passed ||
        !value.technicalOnly ||
        !value.competitiveFieldsAbsent ||
        value.sourceCommit !== required("SOURCE_COMMIT") ||
        value.programSha256 !== requiredHash("PROGRAM_SHA256") ||
        value.plan.tasks.length !== 925 ||
        value.plan.cases.length !== 900 ||
        value.selectorRows.length !== 900 ||
        value.pureGate.sha256 !== requiredHash("PURE_GATE_SHA256")
    ) throw new Error("Gate 3 manifest is ineligible");
    validateUnifiedIntentGate3Plan(value.plan);
    verifyProgramFiles(value.files);
    return value;
};


const TELEMETRY_SUM_FIELDS = [
    "proposedCalls", "proposedUnitIds", "sameUnitConflicts", "invalidUnitIds",
    "invalidTargets", "invalidTiles", "duplicateSuppressions", "supersededPending",
    "expiredPending", "revokedPending", "deferredUnitIds", "productionBatches",
    "debugProposals", "debugCoalesced", "debugForwarded", "debugDropped",
    "forwardedGroups", "forwardedChunks", "forwardedOrderCalls", "forwardedUnitIds",
    "multipleForwardedUnitViolations", "forwardedValidationViolations",
    "partialProductionBatchViolations",
];
const TELEMETRY_MAX_FIELDS = [
    "pendingUnitIds", "maxForwardedChunkSize", "rollingTotalCalls",
    "rollingOrderCalls", "rollingGameplayNonorderCalls", "rollingDebugCalls",
];
const TELEMETRY_SCOPES = [
    "terminal_objective", "emergency_defense", "home_guard", "objective_closeout",
    "tactical_assault", "route_sweep", "harassment", "baseline_core",
];
const validateNumericRecord = (value, keys, label) => {
    if (!value || canonical(Object.keys(value).sort()) !== canonical([...keys].sort())) {
        throw new Error("Gate 3 " + label + " schema drifted");
    }
    for (const number of Object.values(value)) {
        if (!Number.isSafeInteger(number) || number < 0) {
            throw new Error("Gate 3 " + label + " numeric drifted");
        }
    }
};
const validateTelemetrySummary = (arm, value) => {
    validateNumericRecord(value?.sums, TELEMETRY_SUM_FIELDS, "telemetry sums");
    validateNumericRecord(value?.maxima, TELEMETRY_MAX_FIELDS, "telemetry maxima");
    validateNumericRecord(value?.proposalsByScope, TELEMETRY_SCOPES, "proposal scopes");
    validateNumericRecord(value?.winningUnitsByScope, TELEMETRY_SCOPES, "winner scopes");
    validateNumericRecord(value?.forwardedUnitsByScope, TELEMETRY_SCOPES, "forwarded scopes");
    if (
        !arm.enabled ||
        !value ||
        value.complete !== true ||
        value.updates !== 3600 ||
        value.totalCeiling !== arm.totalCeiling ||
        value.gameplayReserve !== 35 ||
        value.orderCap !== arm.totalCeiling - 35 ||
        value.gameplayReserveOverflowUpdates !== 0 ||
        value.totalCeilingOverflowUpdates !== 0 ||
        value.oneUnitMultipleForwardUpdates !== 0 ||
        value.forwardedValidationViolationUpdates !== 0 ||
        value.partialProductionBatchViolationUpdates !== 0 ||
        value.sums.multipleForwardedUnitViolations !== 0 ||
        value.sums.forwardedValidationViolations !== 0 ||
        value.sums.partialProductionBatchViolations !== 0 ||
        value.maxima.rollingTotalCalls > arm.totalCeiling ||
        value.maxima.rollingOrderCalls > arm.totalCeiling - 35 ||
        value.maxima.maxForwardedChunkSize > 128 ||
        !SHA256.test(value.telemetrySha256)
    ) throw new Error("Gate 3 enabled telemetry gate failed: " + arm.id);
};

const validateArmTrace = (value, arm, task) => {
    if (
        canonical(value.arm) !== canonical(arm) ||
        value.fixedUpdates !== 3600 ||
        value.trajectory.snapshots.length !== 5 ||
        !SHA256.test(value.action.candidate.sha256) ||
        !SHA256.test(value.action.opponent.sha256) ||
        !SHA256.test(value.trajectory.sha256)
    ) throw new Error("Gate 3 arm trace drifted: " + arm.id);
    exact(value.observedStarts, {
        candidate: task.candidateStart,
        opponent: task.opponentStart,
    }, "Gate 3 observed start drifted");
    if (arm.enabled) validateTelemetrySummary(arm, value.telemetry);
    else if (value.telemetry !== null) {
        throw new Error("Disabled Gate 3 arm emitted arbiter telemetry");
    }
};

const runTrace = async () => {
    const source = sourceIdentity();
    verifyCertificate();
    const runtime = verifyRuntime();
    const manifest = loadManifest();
    exact(runtime, manifest.runtime, "Gate 3 trace runtime drifted");
    const taskIndex = Number(required("TASK_INDEX"));
    if (!Number.isSafeInteger(taskIndex) || taskIndex < 0 || taskIndex >= 925) {
        throw new Error("Gate 3 task index drifted");
    }
    const task = manifest.plan.tasks[taskIndex];
    const map = runtime.maps.find((value) => value.id === task.mapId);
    if (!map) throw new Error("Gate 3 trace map is unavailable");
    const role = required("TRACE_ROLE");
    const directory = required("OUT_DIR");
    if (!["smoke", "array"].includes(role) || fs.existsSync(directory)) {
        throw new Error("Gate 3 trace output identity drifted");
    }
    fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
    try {
        await gameApi.cdapi.init(runtime.assetsRoot);
        const factory = await loadBaselineFactory(path.join(REPO, "packages", "chronodivide-bot"));
        if (factory.descriptor.kind !== "external-package") {
            throw new Error("Gate 3 trace baseline is not external");
        }
        const advancedDefinition = loadRa2WebOpponent(
            runtime.advancedFreezeRoot,
            runtime.advancedOpponentId,
        );
        const arms = [];
        for (const arm of task.arms) {
            const bots = await createBots(task, arm, factory, advancedDefinition);
            const action = new UnifiedIntentGate2ActionTrace();
            installUnifiedIntentGate2ActionTrace({
                candidate: bots.candidate,
                opponent: bots.opponent,
            }, action);
            const trajectory = new UnifiedIntentGate2Trajectory();
            const collector = arm.enabled
                ? new UnifiedIntentGate3TelemetryCollector(arm.totalCeiling, task.fixedUpdates)
                : null;
            const result = await withSeededOfflineGame(
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
                        throw new Error("Gate 3 fixed horizon did not start cleanly");
                    }
                    const observedStarts = observeStarts(api, bots);
                    exact(observedStarts, {
                        candidate: task.candidateStart,
                        opponent: task.opponentStart,
                    }, "Gate 3 trace start drifted");
                    trajectory.observe(snapshotUnifiedIntentGate2PublicState(api, {
                        candidate: bots.candidate,
                        opponent: bots.opponent,
                    }));
                    for (let update = 1; update <= task.fixedUpdates; update += 1) {
                        if (instance.isFinished()) {
                            throw new Error("Gate 3 fixed technical horizon was not reached");
                        }
                        await instance.update();
                        if (api.getCurrentTick() !== update || instance.isFinished()) {
                            throw new Error("Gate 3 fixed technical horizon was not reached");
                        }
                        const telemetry = bots.candidate.lastUnifiedIntentTelemetry;
                        if (collector) {
                            if (!telemetry) throw new Error("Enabled Gate 3 telemetry is absent");
                            collector.observe(telemetry);
                        } else if (telemetry !== null) {
                            throw new Error("Disabled Gate 3 arm emitted arbiter telemetry");
                        }
                        if (update % 900 === 0) {
                            trajectory.observe(snapshotUnifiedIntentGate2PublicState(api, {
                                candidate: bots.candidate,
                                opponent: bots.opponent,
                            }));
                        }
                    }
                    return {
                        observedStarts,
                        action: action.finish(),
                        trajectory: trajectory.finish(),
                        telemetry: collector ? collector.finish() : null,
                    };
                },
            );
            const armTrace = { arm, fixedUpdates: task.fixedUpdates, ...result };
            validateArmTrace(armTrace, arm, task);
            arms.push(armTrace);
        }
        const artifact = {
            kind: "unified-intent-gate3-case-v1",
            complete: true,
            passed: true,
            technicalOnly: true,
            competitiveFieldsAbsent: true,
            sourceCommit: source.sourceCommit,
            programSha256: source.programSha256,
            manifestSha256: requiredHash("MANIFEST_SHA256"),
            role,
            assignment: task,
            mapSha256: map.sha256,
            arms,
            scheduler: {
                jobId: process.env.SLURM_JOB_ID,
                arrayJobId: process.env.SLURM_ARRAY_JOB_ID ?? null,
                arrayTaskId: process.env.SLURM_ARRAY_TASK_ID ?? null,
                account: process.env.SLURM_JOB_ACCOUNT,
                partition: process.env.SLURM_JOB_PARTITION,
            },
        };
        rejectProhibited(artifact);
        const file = path.join(directory, "case.json");
        writeExclusive(file, JSON.stringify(artifact) + "\n");
        if (fs.statSync(file).size > TRACE_LIMIT) throw new Error("Gate 3 case exceeds size limit");
        writeExclusive(
            path.join(directory, "COMPLETE"),
            completeLine("COMPLETE_UNIFIED_INTENT_GATE3_CASE_V1", file),
        );
    } catch (error) {
        const failure = {
            kind: "unified-intent-gate3-generic-failure-v1",
            complete: false,
            passed: false,
            technicalOnly: true,
            competitiveFieldsAbsent: true,
            taskIndex,
            stage: "fixed_horizon",
            errorType: error instanceof Error ? error.name : "UnknownError",
        };
        rejectProhibited(failure);
        const failurePath = path.join(directory, "FAILURE.json");
        if (!fs.existsSync(failurePath)) {
            writeExclusive(failurePath, JSON.stringify(failure, null, 2) + "\n");
        }
        throw error;
    }
};

const parseCase = (directory, task, manifestSha256, role) => {
    exact(fs.readdirSync(directory).sort(), ["COMPLETE", "case.json"], "Gate 3 task files drifted");
    const file = path.join(directory, "case.json");
    const marker = fs.readFileSync(path.join(directory, "COMPLETE"), "utf8").trim();
    const match = COMPLETE_RE.exec(marker);
    if (
        !match ||
        match[1] !== sha256File(file) ||
        Number(match[2]) !== fs.statSync(file).size ||
        fs.statSync(file).size > TRACE_LIMIT
    ) throw new Error("Gate 3 task checksum drifted");
    const value = json(file);
    rejectProhibited(value);
    if (
        value.kind !== "unified-intent-gate3-case-v1" ||
        !value.complete ||
        !value.passed ||
        !value.technicalOnly ||
        !value.competitiveFieldsAbsent ||
        value.role !== role ||
        value.manifestSha256 !== manifestSha256 ||
        value.arms.length !== 4 ||
        !SHA256.test(value.mapSha256)
    ) throw new Error("Gate 3 task artifact drifted");
    exact(value.assignment, task, "Gate 3 assignment drifted");
    value.arms.forEach((armTrace, index) =>
        validateArmTrace(armTrace, task.arms[index], task));
    return value;
};

const schedulerRows = (arrayJobId, taskCount) => {
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
    if (rows.length !== taskCount ||
        new Set(rows.map((value) => value.label)).size !== taskCount ||
        new Set(rows.map((value) => value.jobId)).size !== taskCount) {
        throw new Error("Gate 3 scheduler identities drifted");
    }
    for (let taskIndex = 0; taskIndex < taskCount; taskIndex += 1) {
        const row = rows.find((value) => value.label === arrayJobId + "_" + taskIndex);
        if (!row || row.state !== "COMPLETED" || row.exitCode !== "0:0" ||
            row.account !== "pi_jss233" || row.partition !== "day" ||
            row.cpus !== 1 || row.restarts !== 0) {
            throw new Error("Gate 3 scheduler task failed");
        }
    }
    return rows.sort((left, right) =>
        Number(left.label.split("_")[1]) - Number(right.label.split("_")[1]));
};

const csv = (rows) => {
    const keys = Object.keys(rows[0]);
    const encode = (value) => '"' + String(value ?? "").replaceAll('"', '""') + '"';
    return keys.map(encode).join(",") + "\n" +
        rows.map((row) => keys.map((key) =>
            encode(typeof row[key] === "object" ? JSON.stringify(row[key]) : row[key])).join(",")).join("\n") + "\n";
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

const finalize = () => {
    const source = sourceIdentity();
    verifyCertificate();
    verifyPureGate();
    const runtime = verifyRuntime();
    const manifest = loadManifest();
    exact(runtime, manifest.runtime, "Gate 3 finalizer runtime drifted");
    const manifestSha256 = requiredHash("MANIFEST_SHA256");
    const arrayJobId = required("ARRAY_JOB_ID");
    const scheduler = schedulerRows(arrayJobId, 925);
    const smoke = parseCase(
        path.join(EXECUTION, "smoke"),
        manifest.plan.tasks[0],
        manifestSha256,
        "smoke",
    );
    if (
        smoke.sourceCommit !== source.sourceCommit ||
        smoke.programSha256 !== source.programSha256 ||
        smoke.scheduler.account !== "pi_jss233" ||
        smoke.scheduler.partition !== "day" ||
        smoke.scheduler.arrayJobId !== null ||
        smoke.scheduler.arrayTaskId !== null
    ) throw new Error("Gate 3 smoke identity drifted");
    const traces = manifest.plan.tasks.map((task) => parseCase(
        path.join(EXECUTION, "cells", "task-" + String(task.taskIndex).padStart(4, "0")),
        task,
        manifestSha256,
        "array",
    ));
    const schedulerJobIds = new Set();
    for (const [taskIndex, value] of traces.entries()) {
        const map = runtime.maps.find((candidate) => candidate.id === value.assignment.mapId);
        if (
            value.sourceCommit !== source.sourceCommit ||
            value.programSha256 !== source.programSha256 ||
            !map ||
            value.mapSha256 !== map.sha256 ||
            value.scheduler.account !== "pi_jss233" ||
            value.scheduler.partition !== "day" ||
            value.scheduler.arrayJobId !== arrayJobId ||
            String(value.scheduler.arrayTaskId) !== String(taskIndex) ||
            typeof value.scheduler.jobId !== "string"
        ) throw new Error("Gate 3 array identity drifted");
        schedulerJobIds.add(value.scheduler.jobId);
    }
    if (schedulerJobIds.size !== 925) {
        throw new Error("Gate 3 array scheduler job IDs are not unique");
    }

    const duplicates = manifest.plan.tasks.slice(900).map((task) => {
        const original = traces[task.duplicateOfTaskIndex];
        const duplicate = traces[task.taskIndex];
        const identical = canonical(original.arms) === canonical(duplicate.arms);
        return {
            originalTaskIndex: task.duplicateOfTaskIndex,
            duplicateTaskIndex: task.taskIndex,
            caseIndex: task.caseIndex,
            opponent: task.opponent,
            mapId: task.mapId,
            country: task.country,
            candidateSlot: task.candidateSlot,
            requestedEngineSeed: task.requestedEngineSeed,
            identical,
            armTraceSha256: hash(canonical(duplicate.arms)),
        };
    });
    if (duplicates.length !== 25 || duplicates.some((value) => !value.identical)) {
        throw new Error("Gate 3 duplicate determinism failed");
    }

    const armRows = [];
    const mechanisms = Object.fromEntries(manifest.plan.arms.filter((arm) => arm.enabled)
        .map((arm) => [arm.id, {
            totalCeiling: arm.totalCeiling,
            traces: 0,
            proposedCalls: 0,
            forwardedOrderCalls: 0,
            sameUnitConflicts: 0,
            duplicateSuppressions: 0,
            deferredUnitIds: 0,
            updatesWithDeferral: 0,
            maxRollingTotalCalls: 0,
            maxRollingOrderCalls: 0,
            maxForwardedChunkSize: 0,
        }]));
    for (const trace of traces) {
        for (const armTrace of trace.arms) {
            const telemetry = armTrace.telemetry;
            armRows.push({
                taskIndex: trace.assignment.taskIndex,
                caseIndex: trace.assignment.caseIndex,
                executionReplicateOrdinal: trace.assignment.executionReplicateOrdinal,
                opponent: trace.assignment.opponent,
                mapId: trace.assignment.mapId,
                directionOrdinal: trace.assignment.directionOrdinal,
                country: trace.assignment.country,
                candidateSlot: trace.assignment.candidateSlot,
                requestedEngineSeed: trace.assignment.requestedEngineSeed,
                armId: armTrace.arm.id,
                totalCeiling: armTrace.arm.totalCeiling,
                candidateActionSha256: armTrace.action.candidate.sha256,
                opponentActionSha256: armTrace.action.opponent.sha256,
                trajectorySha256: armTrace.trajectory.sha256,
                telemetrySha256: telemetry?.telemetrySha256 ?? null,
                proposedCalls: telemetry?.sums.proposedCalls ?? null,
                forwardedOrderCalls: telemetry?.sums.forwardedOrderCalls ?? null,
                sameUnitConflicts: telemetry?.sums.sameUnitConflicts ?? null,
                duplicateSuppressions: telemetry?.sums.duplicateSuppressions ?? null,
                deferredUnitIds: telemetry?.sums.deferredUnitIds ?? null,
            });
            if (!armTrace.arm.enabled) continue;
            const current = mechanisms[armTrace.arm.id];
            current.traces += 1;
            current.proposedCalls += telemetry.sums.proposedCalls;
            current.forwardedOrderCalls += telemetry.sums.forwardedOrderCalls;
            current.sameUnitConflicts += telemetry.sums.sameUnitConflicts;
            current.duplicateSuppressions += telemetry.sums.duplicateSuppressions;
            current.deferredUnitIds += telemetry.sums.deferredUnitIds;
            current.updatesWithDeferral += telemetry.updatesWithDeferral;
            current.maxRollingTotalCalls = Math.max(
                current.maxRollingTotalCalls,
                telemetry.maxima.rollingTotalCalls,
            );
            current.maxRollingOrderCalls = Math.max(
                current.maxRollingOrderCalls,
                telemetry.maxima.rollingOrderCalls,
            );
            current.maxForwardedChunkSize = Math.max(
                current.maxForwardedChunkSize,
                telemetry.maxima.maxForwardedChunkSize,
            );
        }
    }
    if (armRows.length !== 3700) throw new Error("Gate 3 arm trace count drifted");
    for (const arm of manifest.plan.arms.filter((value) => value.enabled)) {
        const value = mechanisms[arm.id];
        if (
            value.traces !== 925 ||
            value.proposedCalls < 1 ||
            value.forwardedOrderCalls < 1 ||
            value.sameUnitConflicts < 1 ||
            value.duplicateSuppressions < 1 ||
            value.maxRollingTotalCalls > arm.totalCeiling ||
            value.maxRollingOrderCalls > arm.totalCeiling - 35 ||
            value.maxForwardedChunkSize > 128
        ) throw new Error("Gate 3 complete-population mechanism gate failed: " + arm.id);
    }

    const directory = required("OUT_DIR");
    if (directory !== path.join(EXECUTION, "finalizer") || fs.existsSync(directory)) {
        throw new Error("Gate 3 finalizer output path drifted");
    }
    fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
    const outputs = {
        "cases.csv": csv(armRows),
        "duplicates.csv": csv(duplicates),
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
        kind: "unified-intent-gate3-aggregate-v1",
        complete: true,
        passed: true,
        technicalOnly: true,
        competitiveFieldsAbsent: true,
        sourceCommit: source.sourceCommit,
        programSha256: source.programSha256,
        manifestSha256,
        manifestJobId: manifest.scheduler.jobId,
        smokeJobId: smoke.scheduler.jobId,
        arrayJobId,
        finalizerJobId: process.env.SLURM_JOB_ID,
        cases: 900,
        tasks: 925,
        traces: 3700,
        duplicateTasks: 25,
        exactDuplicates: 25,
        maps: 15,
        advancedMaps: 10,
        supalosaCases: 540,
        advancedCases: 360,
        countries: 9,
        slots: 2,
        fixedUpdates: 3600,
        mechanisms,
        filesBeforeAggregate,
        expectedFilesAfter: filesBeforeAggregate + 3,
        outputs: descriptors,
    };
    rejectProhibited(aggregate);
    if (aggregate.expectedFilesAfter >= FILE_LIMIT) {
        throw new Error("Gate 3 file budget exceeded");
    }
    const aggregateFile = path.join(directory, "aggregate.json");
    writeExclusive(aggregateFile, JSON.stringify(aggregate, null, 2) + "\n");
    writeExclusive(
        aggregateFile + ".sha256",
        sha256File(aggregateFile) + "  " + aggregateFile + "\n",
    );
    writeExclusive(
        path.join(directory, "COMPLETE"),
        completeLine("COMPLETE_UNIFIED_INTENT_GATE3_FINALIZER_V1", aggregateFile),
    );
    if (countFiles(EXECUTION) !== aggregate.expectedFilesAfter) {
        throw new Error("Gate 3 final file count drifted");
    }
    console.log(JSON.stringify({
        complete: true,
        passed: true,
        tasks: 925,
        traces: 3700,
        exactDuplicates: 25,
        aggregateSha256: sha256File(aggregateFile),
    }));
};

const mode = required("MODE");
if (mode === "prepare") await prepare();
else if (mode === "trace") await runTrace();
else if (mode === "finalize") finalize();
else throw new Error("Unknown Gate 3 mode");
