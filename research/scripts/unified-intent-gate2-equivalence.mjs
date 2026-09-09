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
const STUDY = path.join(PROJECT, "research-evidence", "unified-intent-arbiter-v1", "gate-2");
const EXECUTION = path.join(STUDY, "execution-v1-wrapper-a1");
const RUNTIME_FREEZE = path.join(
    PROJECT,
    "research-evidence",
    "fresh-dual-endpoint-v1",
    "execution-v1",
    "runtime-freeze",
    "runtime-freeze.json",
);
const RUNTIME_FREEZE_SHA256 = "be47027c8526daa961500a1ca2acc3c04dd1a487460d4dec78361faa03ece649";
const AUDIT = path.join(STUDY, "seed-audit-v1-a2", "seed-audit.json");
const AUDIT_SHA256 = "6e83a8d51597236dbf1fe80d22262b40bfc737dc6234c68a94853af5ddfaf52a";
const AUDIT_BYTES = 585357862;
const CERTIFICATE_ROOT = path.join(STUDY, "seed-certificate-v1-a4");
const CERTIFICATE = path.join(CERTIFICATE_ROOT, "selection-certificate.json");
const CERTIFICATE_SHA256 = "f7f7086d32630b1eede7a300a382a9348d60f610c1768c300cb3818f738307fd";
const CERTIFICATE_BYTES = 4399;
const TRACE_LIMIT = 8 * 1024 * 1024;
const FILE_LIMIT = 1000;
const SHA256 = /^[0-9a-f]{64}$/;
const COMPLETE_RE = /^COMPLETE_UNIFIED_INTENT_GATE2_TRACE_V1 ([0-9a-f]{64}) ([0-9]+)$/;
const PROHIBITED = /winner|outcome|score|endpoint|defeated|terminalbuilding|remainingbuilding|buildingcount|rank/i;

const MAPS = [
    {
        id: "hfo-le",
        label: "HFO LE",
        fileName: "cd_chrono_4_heck_freezes_over_le.map",
        absolutePath: path.join(
            PROJECT,
            "private-assets/ra2/runtimes/hfo-literal-snow-regular-e0b18958/",
            "cd_chrono_4_heck_freezes_over_le.map",
        ),
        sha256: "e4dfc736a6355e0e68d4681e4d67419516e6bb94549e2d42880c9414e95e2e8d",
        startA: "39,82", startB: "88,34", startAOrdinal: 0, startBOrdinal: 1,
    },
    {
        id: "peak",
        label: "Peak of Perfection",
        fileName: "cd_2_peak_of_perfection.map",
        absolutePath: path.join(
            PROJECT,
            "private-assets/ra2/runtimes/hfo-literal-snow-regular-e0b18958/",
            "cd_2_peak_of_perfection.map",
        ),
        sha256: "440715dc154ac10b4b922159824140d40c48990311c6838345b66958f3b3a442",
        startA: "118,73", startB: "37,73", startAOrdinal: 0, startBOrdinal: 1,
    },
    {
        id: "tour-of-egypt",
        label: "Tour of Egypt",
        fileName: "cd_chrono_tourofegypt.map",
        absolutePath: path.join(
            PROJECT,
            "private-assets/ra2/runtimes/hfo-literal-snow-regular-e0b18958/",
            "cd_chrono_tourofegypt.map",
        ),
        sha256: "2e660f22cf5ef994ca7453d14b9f68349063f9086b7c7c038f58e2067706236e",
        startA: "22,72", startB: "41,91", startAOrdinal: 0, startBOrdinal: 1,
    },
    {
        id: "south-pacific",
        label: "South Pacific",
        fileName: "cd_chrono_mp01t4.map",
        absolutePath: path.join(
            PROJECT,
            "private-assets/ra2/runtimes/hfo-literal-snow-regular-e0b18958/",
            "cd_chrono_mp01t4.map",
        ),
        sha256: "89a428f214d5ca2a5f650b94e2847fc493d51805aac04f869f1fcc76e4db3381",
        startA: "57,98", startB: "99,148", startAOrdinal: 0, startBOrdinal: 1,
    },
    {
        id: "pacific-heights",
        label: "Pacific Heights",
        fileName: "cd_chrono_pacific.map",
        absolutePath: path.join(
            PROJECT,
            "private-assets/ra2/runtimes/hfo-literal-snow-regular-e0b18958/",
            "cd_chrono_pacific.map",
        ),
        sha256: "8ba46066a7e034c37b2367bd07df94be8d6252757d4396ea68d21bc226fa8898",
        startA: "83,146", startB: "43,80", startAOrdinal: 0, startBOrdinal: 1,
    },
];

const requireDriver = createRequire(path.join(DRIVER, "package.json"));
const gameApiPath = fs.realpathSync(requireDriver.resolve("@chronodivide/game-api"));
const gameApi = await import(pathToFileURL(gameApiPath).href);
const {
    buildUnifiedIntentGate2Plan,
    validateUnifiedIntentGate2Plan,
} = await import(pathToFileURL(path.join(
    DRIVER, "dist", "training", "unifiedIntentGate2Plan.js",
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
        if (PROHIBITED.test(key)) throw new Error("Gate 2 prohibited field " + key);
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

const protocolFiles = {
    gate2: "2026-09-07-unified-intent-arbiter-v1-gate-2.md",
    a1: "2026-09-07-unified-intent-arbiter-v1-gate-2-amendment-a1.md",
    a2: "2026-09-08-unified-intent-arbiter-v1-gate-2-amendment-a2.md",
    a3: "2026-09-09-unified-intent-arbiter-v1-gate-2-amendment-a3.md",
    a4: "2026-09-09-unified-intent-arbiter-v1-gate-2-amendment-a4.md",
    a5: "2026-09-09-unified-intent-arbiter-v1-gate-2-amendment-a5.md",
    a6: "2026-09-09-unified-intent-arbiter-v1-gate-2-amendment-a6.md",
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
    ) throw new Error("Gate 2 source identity drifted");
    const protocols = {};
    for (const [name, fileName] of Object.entries(protocolFiles)) {
        const environment = "PROTOCOL_" + name.toUpperCase() + "_SHA256";
        const actual = sha256File(path.join(REPO, "research", "protocols", "method", fileName));
        if (requiredHash(environment) !== actual) {
            throw new Error("Gate 2 protocol hash drifted: " + name);
        }
        protocols[name + "Sha256"] = actual;
    }
    return { sourceCommit, programSha256, protocols };
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
        throw new Error("Gate 2 runtime freeze drifted");
    }
    const value = json(RUNTIME_FREEZE);
    if (!value.complete || !value.passed) throw new Error("Gate 2 runtime freeze failed");
    const frozen = value.frozen;
    if (
        sha256File(gameApiPath) !== frozen.gameApi.sha256 ||
        frozen.nodeVersion !== "v20.13.1"
    ) throw new Error("Gate 2 game runtime drifted");
    const externalSupalosaRuntimeTree = hashTree(frozen.externalSupalosa.runtimeTree.root);
    exact(
        externalSupalosaRuntimeTree,
        frozen.externalSupalosa.runtimeTree,
        "Gate 2 external Supalosa runtime drifted",
    );
    for (const map of MAPS) {
        if (sha256File(map.absolutePath) !== map.sha256) {
            throw new Error("Gate 2 map drifted: " + map.id);
        }
    }
    for (const entry of frozen.assets.entries) {
        const file = path.join(frozen.assets.root, entry.relativePath);
        if (fs.statSync(file).size !== entry.bytes || sha256File(file) !== entry.sha256) {
            throw new Error("Gate 2 asset drifted: " + entry.relativePath);
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
    };
};

const programFiles = () => {
    const values = {
        program: PROGRAM,
        plan: path.join(DRIVER, "dist", "training", "unifiedIntentGate2Plan.js"),
        trace: path.join(DRIVER, "dist", "training", "unifiedIntentGate2Trace.js"),
        candidate: path.join(DRIVER, "dist", "training", "deployedStrongBotCandidate.js"),
        baseline: path.join(DRIVER, "dist", "benchmark", "baselineLoader.js"),
        seeded: path.join(DRIVER, "dist", "benchmark", "seededOfflineGame.js"),
        firewall: path.join(DRIVER, "dist", "training", "symmetricObservationFirewall.js"),
        explicitStartLoader: path.join(REPO, "research", "runtime", "explicit-start-loader-v1.mjs"),
        explicitStartTransform: path.join(REPO, "research", "runtime", "explicit-start-transform-v1.mjs"),
        package: path.join(DRIVER, "package.json"),
        lockfile: path.join(DRIVER, "pnpm-lock.yaml"),
    };
    return Object.fromEntries(Object.entries(values).map(([name, file]) => [name, {
        path: file,
        bytes: fs.statSync(file).size,
        sha256: sha256File(file),
    }]));
};

const verifyProgramFiles = (expected) =>
    exact(programFiles(), expected, "Gate 2 program file drifted");

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

const createBots = async (task, factory) => {
    const candidateName = "Gate2Candidate";
    const opponentName = "Gate2Opponent";
    const botOptions = task.arm === "disabled"
        ? { intentArbiter: { enabled: false } }
        : {};
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
    const certificate = verifyCertificate();
    const runtime = verifyRuntime();
    const plan = buildUnifiedIntentGate2Plan(MAPS);
    validateUnifiedIntentGate2Plan(plan);
    await gameApi.cdapi.init(runtime.assetsRoot);
    const gameModes = Object.fromEntries(MAPS.map((map) => {
        const modes = gameApi.cdapi.getAvailableGameModes(map.fileName);
        if (modes.length === 0) throw new Error("Gate 2 map mode unavailable");
        return [map.id, modes[0]];
    }));
    const factory = await loadBaselineFactory(path.join(REPO, "packages", "chronodivide-bot"));
    if (factory.descriptor.kind !== "external-package") {
        throw new Error("Gate 2 baseline is not external");
    }
    const selectorRows = [];
    for (const caseValue of plan.cases) {
        const task = { ...caseValue, arm: "unwrapped" };
        const map = MAPS[task.mapOrdinal];
        const bots = await createBots(task, factory);
        const observed = await withSeededOfflineGame(
            gameApi.cdapi,
            settings(task, map, bots.candidate, bots.opponent, gameModes[map.id]),
            task.requestedEngineSeed,
            [
                { agent: bots.candidate, identity: "candidate" },
                { agent: bots.opponent, identity: "opponent" },
            ],
            async (instance) => {
                const api = bots.candidate.lastGameApi;
                if (!api || !bots.opponent.lastGameApi || instance.isFinished() ||
                    api.getCurrentTick() !== 0) {
                    throw new Error("Gate 2 zero-update selector did not initialize cleanly");
                }
                const starts = observeStarts(api, bots);
                exact(starts, {
                    candidate: task.candidateStart,
                    opponent: task.opponentStart,
                }, "Gate 2 selected start drifted");
                return starts;
            },
        );
        selectorRows.push({
            caseIndex: task.caseIndex,
            mapId: task.mapId,
            country: task.country,
            candidateSlot: task.candidateSlot,
            requestedEngineSeed: task.requestedEngineSeed,
            updates: 0,
            observedStarts: observed,
        });
    }
    const manifest = {
        kind: "unified-intent-gate2-manifest-v1",
        complete: true,
        passed: true,
        technicalOnly: true,
        competitiveFieldsAbsent: true,
        sourceCommit: source.sourceCommit,
        programSha256: source.programSha256,
        protocols: source.protocols,
        seedAudit: { path: AUDIT, sha256: AUDIT_SHA256, bytes: AUDIT_BYTES },
        seedCertificate: {
            path: CERTIFICATE,
            sha256: CERTIFICATE_SHA256,
            bytes: CERTIFICATE_BYTES,
            selectedBase: certificate.selectedBase,
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
        throw new Error("Gate 2 manifest output path drifted");
    }
    fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
    const file = path.join(directory, "manifest.json");
    writeExclusive(file, JSON.stringify(manifest, null, 2) + "\n");
    writeExclusive(
        path.join(directory, "COMPLETE"),
        completeLine("COMPLETE_UNIFIED_INTENT_GATE2_MANIFEST_V1", file),
    );
    console.log(JSON.stringify({
        complete: true,
        passed: true,
        cases: plan.cases.length,
        tasks: plan.tasks.length,
        manifestSha256: sha256File(file),
    }));
};

const loadManifest = () => {
    const file = required("MANIFEST_PATH");
    const expectedHash = requiredHash("MANIFEST_SHA256");
    if (
        file !== path.join(EXECUTION, "manifest", "manifest.json") ||
        sha256File(file) !== expectedHash
    ) throw new Error("Gate 2 manifest binding drifted");
    const value = json(file);
    rejectProhibited(value);
    if (
        !value.complete ||
        !value.passed ||
        !value.technicalOnly ||
        !value.competitiveFieldsAbsent ||
        value.sourceCommit !== required("SOURCE_COMMIT") ||
        value.programSha256 !== requiredHash("PROGRAM_SHA256") ||
        value.plan.tasks.length !== 360 ||
        value.plan.cases.length !== 180 ||
        value.selectorRows.length !== 180
    ) throw new Error("Gate 2 manifest is ineligible");
    validateUnifiedIntentGate2Plan(value.plan);
    verifyProgramFiles(value.files);
    return value;
};

const runTrace = async () => {
    const source = sourceIdentity();
    verifyCertificate();
    const runtime = verifyRuntime();
    const manifest = loadManifest();
    exact(runtime, manifest.runtime, "Gate 2 trace runtime drifted");
    const taskIndex = Number(required("TASK_INDEX"));
    if (!Number.isSafeInteger(taskIndex) || taskIndex < 0 || taskIndex >= 360) {
        throw new Error("Gate 2 task index drifted");
    }
    const task = manifest.plan.tasks[taskIndex];
    const map = manifest.plan.maps[task.mapOrdinal];
    const role = required("TRACE_ROLE");
    const directory = required("OUT_DIR");
    if (!["smoke", "array"].includes(role) || fs.existsSync(directory)) {
        throw new Error("Gate 2 trace output identity drifted");
    }
    fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
    try {
        await gameApi.cdapi.init(runtime.assetsRoot);
        const factory = await loadBaselineFactory(path.join(REPO, "packages", "chronodivide-bot"));
        if (factory.descriptor.kind !== "external-package") {
            throw new Error("Gate 2 trace baseline is not external");
        }
        const bots = await createBots(task, factory);
        const action = new UnifiedIntentGate2ActionTrace();
        installUnifiedIntentGate2ActionTrace({
            candidate: bots.candidate,
            opponent: bots.opponent,
        }, action);
        const trajectory = new UnifiedIntentGate2Trajectory();
        const result = await withSeededOfflineGame(
            gameApi.cdapi,
            settings(
                task,
                map,
                bots.candidate,
                bots.opponent,
                manifest.gameModes[map.id],
            ),
            task.requestedEngineSeed,
            [
                { agent: bots.candidate, identity: "candidate" },
                { agent: bots.opponent, identity: "opponent" },
            ],
            async (instance) => {
                const api = bots.candidate.lastGameApi;
                if (!api || !bots.opponent.lastGameApi || instance.isFinished() ||
                    api.getCurrentTick() !== 0) {
                    throw new Error("Gate 2 fixed horizon did not start cleanly");
                }
                const observedStarts = observeStarts(api, bots);
                exact(observedStarts, {
                    candidate: task.candidateStart,
                    opponent: task.opponentStart,
                }, "Gate 2 trace start drifted");
                trajectory.observe(snapshotUnifiedIntentGate2PublicState(api, {
                    candidate: bots.candidate,
                    opponent: bots.opponent,
                }));
                for (let update = 1; update <= task.fixedUpdates; update += 1) {
                    if (instance.isFinished()) {
                        throw new Error("Gate 2 fixed technical horizon was not reached");
                    }
                    await instance.update();
                    if (api.getCurrentTick() !== update || instance.isFinished()) {
                        throw new Error("Gate 2 fixed technical horizon was not reached");
                    }
                    if (update % 900 === 0) {
                        trajectory.observe(snapshotUnifiedIntentGate2PublicState(api, {
                            candidate: bots.candidate,
                            opponent: bots.opponent,
                        }));
                    }
                }
                if (bots.candidate.lastUnifiedIntentTelemetry !== null) {
                    throw new Error("Disabled Gate 2 arm emitted arbiter telemetry");
                }
                return {
                    observedStarts,
                    action: action.finish(),
                    trajectory: trajectory.finish(),
                };
            },
        );
        const artifact = {
            kind: "unified-intent-gate2-trace-v1",
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
            fixedUpdates: task.fixedUpdates,
            observedStarts: result.observedStarts,
            action: result.action,
            trajectory: result.trajectory,
            arbiterTelemetryAbsent: true,
            scheduler: {
                jobId: process.env.SLURM_JOB_ID,
                arrayJobId: process.env.SLURM_ARRAY_JOB_ID ?? null,
                arrayTaskId: process.env.SLURM_ARRAY_TASK_ID ?? null,
                account: process.env.SLURM_JOB_ACCOUNT,
                partition: process.env.SLURM_JOB_PARTITION,
            },
        };
        rejectProhibited(artifact);
        const file = path.join(directory, "trace.json");
        writeExclusive(file, JSON.stringify(artifact) + "\n");
        if (fs.statSync(file).size > TRACE_LIMIT) throw new Error("Gate 2 trace exceeds size limit");
        writeExclusive(
            path.join(directory, "COMPLETE"),
            completeLine("COMPLETE_UNIFIED_INTENT_GATE2_TRACE_V1", file),
        );
    } catch (error) {
        const failure = {
            kind: "unified-intent-gate2-generic-failure-v1",
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

const parseTrace = (directory, task, manifestSha256, role) => {
    exact(fs.readdirSync(directory).sort(), ["COMPLETE", "trace.json"], "Gate 2 task files drifted");
    const file = path.join(directory, "trace.json");
    const marker = fs.readFileSync(path.join(directory, "COMPLETE"), "utf8").trim();
    const match = COMPLETE_RE.exec(marker);
    if (
        !match ||
        match[1] !== sha256File(file) ||
        Number(match[2]) !== fs.statSync(file).size ||
        fs.statSync(file).size > TRACE_LIMIT
    ) throw new Error("Gate 2 task checksum drifted");
    const value = json(file);
    rejectProhibited(value);
    if (
        value.kind !== "unified-intent-gate2-trace-v1" ||
        !value.complete ||
        !value.passed ||
        !value.technicalOnly ||
        !value.competitiveFieldsAbsent ||
        value.role !== role ||
        value.manifestSha256 !== manifestSha256 ||
        value.fixedUpdates !== 3600 ||
        value.trajectory.snapshots.length !== 5 ||
        value.arbiterTelemetryAbsent !== true
    ) throw new Error("Gate 2 task artifact drifted");
    exact(value.assignment, task, "Gate 2 assignment drifted");
    exact(value.observedStarts, {
        candidate: task.candidateStart,
        opponent: task.opponentStart,
    }, "Gate 2 observed start drifted");
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
        throw new Error("Gate 2 scheduler identities drifted");
    }
    for (let taskIndex = 0; taskIndex < taskCount; taskIndex += 1) {
        const row = rows.find((value) => value.label === arrayJobId + "_" + taskIndex);
        if (!row || row.state !== "COMPLETED" || row.exitCode !== "0:0" ||
            row.account !== "pi_jss233" || row.partition !== "day" ||
            row.cpus !== 1 || row.restarts !== 0) {
            throw new Error("Gate 2 scheduler task failed");
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
    const runtime = verifyRuntime();
    const manifest = loadManifest();
    exact(runtime, manifest.runtime, "Gate 2 finalizer runtime drifted");
    const manifestSha256 = requiredHash("MANIFEST_SHA256");
    const arrayJobId = required("ARRAY_JOB_ID");
    const scheduler = schedulerRows(arrayJobId, 360);
    const smoke = parseTrace(
        path.join(EXECUTION, "smoke"),
        manifest.plan.tasks[0],
        manifestSha256,
        "smoke",
    );
    if (
        smoke.sourceCommit !== source.sourceCommit ||
        smoke.programSha256 !== source.programSha256 ||
        smoke.scheduler.account !== "pi_jss233" ||
        smoke.scheduler.partition !== "day"
    ) throw new Error("Gate 2 smoke identity drifted");
    const traces = manifest.plan.tasks.map((task) => parseTrace(
        path.join(EXECUTION, "cells", "task-" + String(task.taskIndex).padStart(4, "0")),
        task,
        manifestSha256,
        "array",
    ));
    const pairs = [];
    for (const caseValue of manifest.plan.cases) {
        const left = traces[caseValue.caseIndex * 2];
        const right = traces[caseValue.caseIndex * 2 + 1];
        const comparable = (value) => ({
            fixedUpdates: value.fixedUpdates,
            observedStarts: value.observedStarts,
            action: value.action,
            trajectory: value.trajectory,
            arbiterTelemetryAbsent: value.arbiterTelemetryAbsent,
        });
        const identical = canonical(comparable(left)) === canonical(comparable(right));
        pairs.push({
            caseIndex: caseValue.caseIndex,
            mapId: caseValue.mapId,
            directionOrdinal: caseValue.directionOrdinal,
            country: caseValue.country,
            candidateSlot: caseValue.candidateSlot,
            requestedEngineSeed: caseValue.requestedEngineSeed,
            identical,
            candidateActionSha256: left.action.candidate.sha256,
            opponentActionSha256: left.action.opponent.sha256,
            trajectorySha256: left.trajectory.sha256,
        });
    }
    const mismatches = pairs.filter((value) => !value.identical);
    if (mismatches.length !== 0) throw new Error("Gate 2 disabled live equivalence failed");
    const directory = required("OUT_DIR");
    if (directory !== path.join(EXECUTION, "finalizer") || fs.existsSync(directory)) {
        throw new Error("Gate 2 finalizer output path drifted");
    }
    fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
    const outputs = {
        "pairs.csv": csv(pairs),
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
        kind: "unified-intent-gate2-aggregate-v1",
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
        cases: 180,
        tasks: 360,
        exactPairs: pairs.length,
        mismatches: 0,
        maps: 5,
        countries: 9,
        slots: 2,
        fixedUpdates: 3600,
        filesBeforeAggregate,
        expectedFilesAfter: filesBeforeAggregate + 3,
        outputs: descriptors,
    };
    rejectProhibited(aggregate);
    if (aggregate.expectedFilesAfter >= FILE_LIMIT) {
        throw new Error("Gate 2 file budget exceeded");
    }
    const aggregateFile = path.join(directory, "aggregate.json");
    writeExclusive(aggregateFile, JSON.stringify(aggregate, null, 2) + "\n");
    writeExclusive(
        aggregateFile + ".sha256",
        sha256File(aggregateFile) + "  " + aggregateFile + "\n",
    );
    writeExclusive(
        path.join(directory, "COMPLETE"),
        completeLine("COMPLETE_UNIFIED_INTENT_GATE2_FINALIZER_V1", aggregateFile),
    );
    if (countFiles(EXECUTION) !== aggregate.expectedFilesAfter) {
        throw new Error("Gate 2 final file count drifted");
    }
    console.log(JSON.stringify({
        complete: true,
        passed: true,
        exactPairs: pairs.length,
        mismatches: 0,
        aggregateSha256: sha256File(aggregateFile),
    }));
};

const mode = required("MODE");
if (mode === "prepare") await prepare();
else if (mode === "trace") await runTrace();
else if (mode === "finalize") finalize();
else throw new Error("Unknown Gate 2 mode");
