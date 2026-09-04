import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
    freshDualScore,
} from "../runtime/fresh-dual-analysis-v1.mjs";
import {
    FRESH_DUAL_ANALYSIS_V2,
    analyzeFreshDualRowsV2,
} from "../runtime/fresh-dual-analysis-v2.mjs";
import {
    ASSETS,
    DRIVER,
    REPO,
    ROOT as STUDY_ROOT,
    loadPlanInputs,
    read,
} from "../runtime/fresh-dual-inputs-v1.mjs";
import {
    validateFreshDualFrozenPolicyInputs,
} from "../runtime/fresh-dual-runtime-freeze-validator-v1.mjs";

const ROOT = path.join(STUDY_ROOT, "execution-v2-full-retry-a1");
const MANIFEST_DIR = path.join(ROOT, "manifest");
const MANIFEST_FILE = path.join(MANIFEST_DIR, "manifest.json");
const A2_DIR = path.join(STUDY_ROOT, "execution-v1/compressed-canaries-a2/finalizer");
const A2_SHA256 = "e4796e2e8d1fec4038473dfa444bf9728b27a58d3fcdb3c187198cbba7ec4186";
const SELECTION_SHA256 = "ca1641860595e7a15f1d6651e7ddc6a8f4f6f9e64382829c34d3f8f7efde7189";
const V1_SOURCE_COMMIT = "7e902f6fed790890e4a4dd9eab3834795ad85462";
const V1_MANIFEST_DIR = path.join(STUDY_ROOT, "execution-v1/competitive-v1/manifest");
const V1_MANIFEST_SHA256 = "137575de8d55b7a832ceced58f23f22b84b132416bb4d58ff7ec43e9bb1a7197";
const INCIDENT_NODES = ["c1102u03n03", "c1102u07n01"];
const MAX_GZIP_BYTES_PER_GAME = 256 * 1024 * 1024;
const MAX_TOTAL_GZIP_BYTES = 700 * 1024 ** 3;
const MAX_NEW_FILES = 25_000;
const required = (name) => {
    const value = process.env[name];
    assert.ok(value, `${name} required`);
    return value;
};
const hash = (value) => crypto.createHash("sha256").update(value).digest("hex");
const git = (...args) => execFileSync("git", args, { cwd: REPO, encoding: "utf8" }).trim();
const json = (file) => JSON.parse(read(file));
const write = (file, value) =>
    fs.writeFileSync(file, JSON.stringify(value, null, 2) + "\n", { flag: "wx", mode: 0o600 });
const sealed = (directory, name, marker) => {
    fs.readdirSync(directory);
    assert.equal(read(path.join(directory, "COMPLETE")).toString().trim(), marker);
    const bytes = read(path.join(directory, `${name}.json`));
    const sha256 = hash(bytes);
    assert.equal(sha256, read(path.join(directory, `${name}.sha256`)).toString().trim().split(/\s+/)[0]);
    return { value: JSON.parse(bytes), sha256 };
};
const fileBindings = () => {
    const relative = [
        "research/scripts/fresh-dual-competitive-v2.mjs",
        "research/slurm/fresh_dual_competitive_v2.sbatch",
        "research/runtime/fresh-dual-analysis-v1.mjs",
        "research/runtime/fresh-dual-analysis-v2.mjs",
        "research/runtime/fresh-dual-runtime-freeze-validator-v1.mjs",
        "packages/chronodivide-bot-driver/dist/training/freshDualStudyGame.js",
        "packages/chronodivide-bot-driver/dist/training/freshDualEndpointLedger.js",
        "packages/chronodivide-bot-driver/dist/training/freshDualStudyInstrumentation.js",
        "packages/chronodivide-bot-driver/dist/training/passiveDualBuildingEndpoint.js",
    ];
    return Object.fromEntries(relative.map((value) => {
        const file = path.join(REPO, value);
        assert.ok(fs.lstatSync(file).isFile());
        return [value, hash(read(file))];
    }));
};
const loadManifest = () => {
    const policy = validateFreshDualFrozenPolicyInputs();
    const manifest = sealed(MANIFEST_DIR, "manifest", "COMPLETE_FRESH_DUAL_COMPETITIVE_MANIFEST_V2");
    assert.equal(manifest.value.complete, true);
    assert.equal(manifest.value.passed, true);
    assert.equal(manifest.value.sourceCommit, git("rev-parse", "HEAD"));
    assert.equal(manifest.value.sourceCommit, git("rev-parse", "fork/main"));
    assert.equal(manifest.value.policyFreezeSha256, policy.freezeSha256);
    assert.equal(manifest.value.compressedCanaryAggregateSha256, A2_SHA256);
    assert.equal(manifest.value.selectionSha256, SELECTION_SHA256);
    assert.equal(manifest.value.replacement.v1SourceCommit, V1_SOURCE_COMMIT);
    assert.equal(manifest.value.replacement.v1ManifestSha256, V1_MANIFEST_SHA256);
    assert.equal(manifest.value.replacement.v1CombinedWithV2, false);
    assert.equal(
        manifest.value.replacement.candidateSourceGitTree,
        manifest.value.replacement.v1CandidateSourceGitTree,
    );
    assert.equal(
        manifest.value.replacement.candidateSourceGitTree,
        git("rev-parse", "HEAD:packages/chronodivide-bot/src"),
    );
    assert.equal(
        manifest.value.replacement.candidateRuntimeTreeSha256,
        policy.frozen.candidatePolicy.runtimeTree.sha256,
    );
    assert.equal(
        manifest.value.replacement.externalSupalosaRuntimeTreeSha256,
        policy.frozen.externalSupalosa.runtimeTree.sha256,
    );
    assert.deepEqual(manifest.value.execution.excludedNodes, INCIDENT_NODES);
    assert.equal(manifest.value.analysis.revision, FRESH_DUAL_ANALYSIS_V2);
    assert.deepEqual(manifest.value.files, fileBindings());
    assert.equal(manifest.value.assignments.length, 2700);
    assert.equal(manifest.value.competitiveRunAuthorized, true);
    return { manifest: manifest.value, manifestSha256: manifest.sha256, policy };
};
const endpointSummary = (value) => {
    assert.ok(value && ["candidate", "baseline", "draw"].includes(value.winner));
    assert.ok(Number.isSafeInteger(value.tick) && value.tick > 0 && value.tick <= 90_000);
    assert.equal(typeof value.status, "string");
    return {
        endpointVersion: value.endpointVersion,
        endpointSha256: value.endpointSha256,
        winner: value.winner,
        status: value.status,
        tick: value.tick,
    };
};
const csv = (rows) => {
    assert.ok(rows.length > 0);
    const keys = Object.keys(rows[0]);
    const quote = (value) => {
        const normalized = value && typeof value === "object" ? JSON.stringify(value) : value;
        return `"${String(normalized ?? "").replaceAll('"', '""')}"`;
    };
    return [keys, ...rows.map((row) => keys.map((key) => row[key]))]
        .map((row) => row.map(quote).join(",")).join("\n") + "\n";
};
const countFiles = (directory) => {
    let count = 0;
    const visit = (value) => {
        for (const entry of fs.readdirSync(value, { withFileTypes: true })) {
            const absolute = path.join(value, entry.name);
            if (entry.isDirectory()) visit(absolute);
            else count += 1;
        }
    };
    visit(directory);
    return count;
};

const main = async () => {
    const mode = process.argv[2];
    assert.ok(["prepare", "cell", "finalize"].includes(mode));
    assert.equal(process.version, "v20.13.1");
    assert.equal(git("branch", "--show-current"), "main");
    assert.equal(git("status", "--porcelain=v1"), "");
    const sourceCommit = git("rev-parse", "HEAD");
    assert.equal(sourceCommit, git("rev-parse", "fork/main"));
    const planInputs = loadPlanInputs();
    const plan = planInputs.plan;
    const selection = sealed(
        path.join(STUDY_ROOT, "selection/finalizer"),
        "selection",
        "COMPLETE_FRESH_DUAL_SELECTION_AGGREGATE_V1",
    );
    assert.equal(selection.sha256, SELECTION_SHA256);
    assert.equal(selection.value.complete, true);
    assert.equal(selection.value.passed, true);
    assert.equal(selection.value.updateCalls, 0);
    assert.equal(selection.value.selectedCaseCount, 2160);
    assert.equal(selection.value.competitiveRunAuthorized, false);
    assert.deepEqual(selection.value.selected.map((value) => {
        const { observedCandidateStart, observedOpponentStart, updates, ...specified } = value;
        assert.equal(observedCandidateStart, value.candidateStart);
        assert.equal(observedOpponentStart, value.opponentStart);
        assert.equal(updates, 0);
        return specified;
    }), plan.cases);
    const a2 = sealed(
        A2_DIR,
        "compressed-canary-aggregate",
        "COMPLETE_FRESH_DUAL_COMPRESSED_CANARY_AGGREGATE_A2",
    );
    assert.equal(a2.sha256, A2_SHA256);
    assert.equal(a2.value.complete, true);
    assert.equal(a2.value.passed, true);
    assert.equal(a2.value.outcomeBlind, true);
    assert.equal(a2.value.exactWorldPairs, 4);
    assert.equal(a2.value.exactActionPairs, 4);
    assert.equal(a2.value.exactPlainTracePairs, 4);
    assert.equal(a2.value.exactGzipTracePairs, 4);
    assert.equal(a2.value.competitiveRunAuthorized, true);
    const v1Manifest = sealed(
        V1_MANIFEST_DIR,
        "manifest",
        "COMPLETE_FRESH_DUAL_COMPETITIVE_MANIFEST_V1",
    );
    assert.equal(v1Manifest.sha256, V1_MANIFEST_SHA256);
    assert.equal(v1Manifest.value.sourceCommit, V1_SOURCE_COMMIT);
    assert.equal(v1Manifest.value.assignments.length, 2700);
    assert.deepEqual(v1Manifest.value.assignments, plan.games);
    if (mode === "prepare") {
        assert.ok(!fs.existsSync(ROOT), "Preserve an existing competitive study");
        const policy = validateFreshDualFrozenPolicyInputs();
        const baseProtocol = path.join(
            REPO,
            "research/protocols/maps/2026-09-04-fresh-dual-full-retry-v2.md",
        );
        const amendment = path.join(
            REPO,
            "research/protocols/maps/2026-09-04-fresh-dual-full-retry-v2-amendment-a1.md",
        );
        fs.mkdirSync(MANIFEST_DIR, { recursive: true, mode: 0o700 });
        const assignments = plan.games.map((assignment, gameIndex) => {
            assert.equal(assignment.gameIndex, gameIndex);
            const selectedCase = selection.value.selected[assignment.caseIndex];
            assert.ok(selectedCase);
            return assignment;
        });
        assert.deepEqual(assignments, v1Manifest.value.assignments);
        const candidateSourceTree = git("rev-parse", "HEAD:packages/chronodivide-bot/src");
        const v1CandidateSourceTree = git(
            "rev-parse",
            `${V1_SOURCE_COMMIT}:packages/chronodivide-bot/src`,
        );
        assert.equal(candidateSourceTree, v1CandidateSourceTree);
        write(MANIFEST_FILE, {
            kind: "fresh-dual-competitive-manifest-v2-full-retry",
            complete: true,
            passed: true,
            sourceCommit,
            protocolSha256: hash(read(amendment)),
            baseProtocolSha256: hash(read(baseProtocol)),
            planFileSha256: hash(read(path.join(STUDY_ROOT, "plan.json"))),
            planSha256: json(path.join(STUDY_ROOT, "plan.json")).planSha256,
            selectionSha256: selection.sha256,
            policyFreezeSha256: policy.freezeSha256,
            compressedCanaryAggregateSha256: a2.sha256,
            replacement: {
                v1SourceCommit: V1_SOURCE_COMMIT,
                v1ManifestSha256: v1Manifest.sha256,
                v1ArrayJobId: "24734770",
                v1FinalizerJobId: "24734771",
                reason: "post-seal-node-failure-invalidated-frozen-scheduler-gate",
                assignmentsExact: true,
                v1CombinedWithV2: false,
                candidateSourceGitTree: candidateSourceTree,
                v1CandidateSourceGitTree: v1CandidateSourceTree,
                candidateRuntimeTreeSha256: policy.frozen.candidatePolicy.runtimeTree.sha256,
                externalSupalosaRuntimeTreeSha256: policy.frozen.externalSupalosa.runtimeTree.sha256,
            },
            files: fileBindings(),
            assignments,
            counts: {
                games: 2700,
                selectedCases: 2160,
                maps: 15,
                central: 720,
                peak: 360,
                transfer: 900,
                advanced: 720,
            },
            settings: {
                credits: 10000,
                cratesAppear: false,
                superWeapons: false,
                unitCount: 0,
                mcvRepacks: true,
                shortGame: false,
                gameSpeed: 6,
                buildOffAlly: false,
                multiEngineer: false,
                maxUpdates: 90_000,
            },
            execution: {
                account: "pi_jss233",
                partition: "day",
                array: "0-2699%64",
                globalConcurrency: 64,
                cpusPerTask: 1,
                memoryGiB: 8,
                hoursPerTask: 12,
                gpu: false,
                requeue: false,
                failClosedFinalizer: true,
                excludedNodes: INCIDENT_NODES,
            },
            storage: {
                maxGzipBytesPerGame: MAX_GZIP_BYTES_PER_GAME,
                maxTotalGzipBytes: MAX_TOTAL_GZIP_BYTES,
                maxNewFiles: MAX_NEW_FILES,
                expectedFilesPerCell: 7,
                expectedUpperBoundFiles: 18_920,
            },
            analysis: {
                revision: FRESH_DUAL_ANALYSIS_V2,
                moduleSha256: fileBindings()["research/runtime/fresh-dual-analysis-v2.mjs"],
                frozenGateModuleSha256: fileBindings()["research/runtime/fresh-dual-analysis-v1.mjs"],
                completeCohortOnly: true,
                transferDescriptiveOnly: true,
                endpointImpactIsNotAlgorithmicImprovement: true,
                heterogeneousOverallInference: "omitted",
            },
            competitiveRunAuthorized: true,
        });
        const bytes = read(MANIFEST_FILE);
        fs.writeFileSync(path.join(MANIFEST_DIR, "manifest.sha256"),
            `${hash(bytes)}  manifest.json\n`, { flag: "wx", mode: 0o600 });
        fs.writeFileSync(path.join(MANIFEST_DIR, "COMPLETE"),
            "COMPLETE_FRESH_DUAL_COMPETITIVE_MANIFEST_V2\n", { flag: "wx", mode: 0o600 });
        console.log(JSON.stringify({
            complete: true,
            manifestSha256: hash(bytes),
            games: 2700,
            maps: 15,
            maxConcurrent: 64,
        }));
        return;
    }
    assert.equal(required("SLURM_JOB_ACCOUNT"), "pi_jss233");
    assert.equal(sourceCommit, required("SOURCE_COMMIT"));
    const programSha256 = hash(read(fileURLToPath(import.meta.url)));
    assert.equal(programSha256, required("PROGRAM_SHA256"));
    const loaded = loadManifest();
    assert.equal(loaded.manifestSha256, required("MANIFEST_SHA256"));
    assert.equal(
        loaded.manifest.files["research/scripts/fresh-dual-competitive-v2.mjs"],
        programSha256,
    );
    const common = {
        sourceCommit,
        programSha256,
        manifestSha256: loaded.manifestSha256,
        policyFreezeSha256: loaded.policy.freezeSha256,
        compressedCanaryAggregateSha256: A2_SHA256,
        replacedV1ManifestSha256: V1_MANIFEST_SHA256,
        nodeVersion: process.version,
        scheduler: {
            jobId: required("SLURM_JOB_ID"),
            arrayJobId: process.env.SLURM_ARRAY_JOB_ID ?? null,
            account: "pi_jss233",
            partition: "day",
        },
    };
    if (mode === "cell") {
        const gameIndex = Number(required("SLURM_ARRAY_TASK_ID"));
        assert.ok(Number.isSafeInteger(gameIndex) && gameIndex >= 0 && gameIndex < 2700);
        const assignment = loaded.manifest.assignments[gameIndex];
        assert.equal(assignment.gameIndex, gameIndex);
        const specifiedCase = plan.cases[assignment.caseIndex];
        const selectedCase = selection.value.selected[assignment.caseIndex];
        const { observedCandidateStart, observedOpponentStart, updates, ...selectionSpec } = selectedCase;
        assert.deepEqual(selectionSpec, specifiedCase);
        assert.equal(observedCandidateStart, specifiedCase.candidateStart);
        assert.equal(observedOpponentStart, specifiedCase.opponentStart);
        assert.equal(updates, 0);
        const map = loaded.policy.frozen.maps.find((value) => value.id === assignment.mapId);
        assert.ok(map);
        assert.equal(map.id, specifiedCase.mapId);
        const runtime = await import(pathToFileURL(loaded.policy.frozen.gameApi.path));
        assert.equal(
            globalThis[Symbol.for("chrono.research.explicit-start.v1")]?.originalSha256,
            loaded.policy.frozen.gameApi.sha256,
        );
        await runtime.cdapi.init(ASSETS);
        const gameModes = runtime.cdapi.getAvailableGameModes(map.fileName);
        assert.ok(gameModes.length > 0);
        process.env.BASELINE_PACKAGE_ROOT = loaded.policy.frozen.externalSupalosa.packageRoot;
        process.env.REQUIRE_EXTERNAL_BASELINE = "true";
        const baselineModule = await import(pathToFileURL(path.join(
            DRIVER, "dist/benchmark/baselineLoader.js",
        )));
        const deployedModule = await import(pathToFileURL(path.join(
            DRIVER, "dist/training/deployedStrongBotCandidate.js",
        )));
        const peakModule = await import(pathToFileURL(path.join(
            DRIVER, "dist/training/peakProfilePolicies.js",
        )));
        const ra2Module = await import(pathToFileURL(path.join(
            DRIVER, "dist/training/ra2WebOpponentBundle.js",
        )));
        const runner = await import(pathToFileURL(path.join(
            DRIVER, "dist/training/freshDualStudyGame.js",
        )));
        const baselineFactory = await baselineModule.loadBaselineFactory(
            path.join(REPO, "packages/chronodivide-bot"),
        );
        assert.equal(baselineFactory.descriptor.kind, "external-package");
        const candidateName = "FreshDualCandidate";
        const opponentName = "FreshDualOpponent";
        let candidate;
        if (assignment.candidateArm === "deployed") {
            candidate = deployedModule.createDeployedStrongBotCandidate(candidateName, specifiedCase.country);
        } else if (assignment.candidateArm === "strategy_both") {
            const arm = peakModule.PEAK_PROFILE_ARMS.find((value) => value.id === "strategy_both");
            assert.ok(arm);
            candidate = peakModule.createPeakProfileCandidate(arm, candidateName, specifiedCase.country);
        } else if (assignment.candidateArm === "supalosa_reference") {
            candidate = baselineFactory.create(candidateName, specifiedCase.country);
        } else {
            throw new Error(`Unsupported competitive arm ${assignment.candidateArm}`);
        }
        let opponent;
        if (assignment.opponent === "pinned_supalosa") {
            opponent = baselineFactory.create(opponentName, specifiedCase.country);
        } else if (assignment.opponent === "ra2web_advanced") {
            const advanced = ra2Module.loadRa2WebOpponent(
                loaded.policy.frozen.ra2WebAdvanced.freezeRoot,
                loaded.policy.frozen.ra2WebAdvanced.opponentId,
            );
            opponent = ra2Module.createInspectableRa2WebBot(
                advanced,
                opponentName,
                specifiedCase.country,
            );
        } else {
            throw new Error(`Unsupported competitive opponent ${assignment.opponent}`);
        }
        assert.ok(candidate instanceof runtime.Bot);
        assert.ok(opponent instanceof runtime.Bot);
        const outputDirectory = required("OUT_DIR");
        const ledgerFile = path.join(outputDirectory, "endpoint-ledger.jsonl.gz");
        const result = await runner.runFreshDualCompetitiveGame({
            spec: {
                mapName: map.fileName,
                gameMode: gameModes[0],
                country: specifiedCase.country,
                candidateSlot: specifiedCase.candidateSlot,
                candidateStartOrdinal: specifiedCase.candidateStartOrdinal,
                opponentStartOrdinal: specifiedCase.opponentStartOrdinal,
                requestedEngineSeed: specifiedCase.requestedEngineSeed,
                maxUpdates: 90_000,
            },
            candidate,
            opponent,
            expectedStarts: {
                candidate: specifiedCase.candidateStart,
                opponent: specifiedCase.opponentStart,
            },
            ledgerFile,
        });
        const cell = {
            kind: "fresh-dual-competitive-cell-v2-full-retry",
            complete: true,
            technicalPass: result.technicalPass,
            ...common,
            assignment,
            case: specifiedCase,
            selectedCase,
            map,
            result,
        };
        write(path.join(outputDirectory, "case.json"), cell);
        if (!result.technicalPass || result.dualState.failed || !result.dualState.complete) {
            throw new Error("Competitive cell endpoint failed technically");
        }
        if (result.ledger.file !== ledgerFile ||
            result.ledger.gzipBytes > MAX_GZIP_BYTES_PER_GAME ||
            result.quitSuppression.forwarded.candidate !== 0 ||
            result.quitSuppression.forwarded.baseline !== 0) {
            throw new Error("Competitive cell evidence bound failed");
        }
        console.log(JSON.stringify({
            complete: true,
            technicalPass: true,
            gameIndex,
            updates: result.updates,
            ledgerRecords: result.ledger.records,
            ledgerGzipBytes: result.ledger.gzipBytes,
        }));
        return;
    }
    const arrayJobId = required("ARRAY_JOB_ID");
    const raw = execFileSync("/opt/slurm/current/bin/sacct", [
        "-X", "-j", arrayJobId, "-n", "-P",
        "--format=JobID,JobIDRaw,Account,Partition,State,ExitCode,Restarts,AllocCPUS,ElapsedRaw",
    ], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 }).trim();
    const jobs = new Map();
    const scheduler = [];
    for (const line of raw.split("\n")) {
        const [label, id, account, partition, state, exitCode, restarts, cpus, elapsedSeconds] =
            line.split("|");
        const match = new RegExp(`^${arrayJobId}_(\\d+)$`).exec(label);
        if (!match) continue;
        const row = {
            gameIndex: Number(match[1]),
            label,
            jobId: id,
            account,
            partition,
            state,
            exitCode,
            restarts: Number(restarts),
            cpus: Number(cpus),
            elapsedSeconds: Number(elapsedSeconds),
        };
        assert.deepEqual(
            [row.account, row.partition, row.state, row.exitCode, row.restarts, row.cpus],
            ["pi_jss233", "day", "COMPLETED", "0:0", 0, 1],
        );
        assert.ok(!jobs.has(row.gameIndex));
        jobs.set(row.gameIndex, row.jobId);
        scheduler.push(row);
    }
    assert.equal(jobs.size, 2700);
    assert.equal(new Set(jobs.values()).size, 2700);
    const ledgerModule = await import(pathToFileURL(path.join(
        DRIVER, "dist/training/freshDualEndpointLedger.js",
    )));
    const rows = [];
    const caseHashes = {};
    let totalUpdates = 0;
    let totalLedgerRecords = 0;
    let totalPlainBytes = 0;
    let totalGzipBytes = 0;
    let corpseTargetRequests = 0;
    for (let gameIndex = 0; gameIndex < 2700; gameIndex += 1) {
        const directory = path.join(ROOT, `cells/game-${String(gameIndex).padStart(4, "0")}`);
        const cell = sealed(directory, "case", "COMPLETE_FRESH_DUAL_COMPETITIVE_CELL_V2");
        const value = cell.value;
        assert.equal(value.complete, true);
        assert.equal(value.technicalPass, true);
        assert.equal(value.sourceCommit, sourceCommit);
        assert.equal(value.programSha256, programSha256);
        assert.equal(value.manifestSha256, loaded.manifestSha256);
        assert.equal(value.scheduler.jobId, jobs.get(gameIndex));
        assert.equal(value.scheduler.arrayJobId, arrayJobId);
        assert.deepEqual(value.assignment, loaded.manifest.assignments[gameIndex]);
        assert.deepEqual(value.case, plan.cases[value.assignment.caseIndex]);
        assert.deepEqual(value.selectedCase, selection.value.selected[value.assignment.caseIndex]);
        assert.equal(value.result.complete, true);
        assert.equal(value.result.technicalPass, true);
        assert.equal(value.result.dualState.complete, true);
        assert.equal(value.result.dualState.failed, false);
        assert.equal(value.result.quitSuppression.forwarded.candidate, 0);
        assert.equal(value.result.quitSuppression.forwarded.baseline, 0);
        const ledgerFile = path.join(directory, "endpoint-ledger.jsonl.gz");
        assert.equal(value.result.ledger.file, ledgerFile);
        assert.ok(value.result.ledger.gzipBytes <= MAX_GZIP_BYTES_PER_GAME);
        assert.equal(
            value.result.ledger.gzipSha256,
            read(path.join(directory, "endpoint-ledger.sha256")).toString().trim().split(/\s+/)[0],
        );
        const replayed = await ledgerModule.verifyFreshDualLedgerFile(
            ledgerFile,
            value.result.ledger,
        );
        assert.equal(replayed.complete, true);
        assert.equal(replayed.aborted, false);
        assert.equal(replayed.updates, value.result.updates);
        assert.equal(replayed.records, value.result.ledger.records);
        assert.deepEqual(replayed.final.dualState, value.result.dualState);
        assert.deepEqual(replayed.final.actionAudit, value.result.actionAudit);
        assert.deepEqual(replayed.final.quitSuppression, value.result.quitSuppression);
        const v5 = endpointSummary(value.result.dualState.v5.firstResult);
        const v6 = endpointSummary(value.result.dualState.v6.firstResult);
        rows.push({
            gameIndex,
            caseIndex: value.case.caseIndex,
            cohort: value.assignment.cohort,
            mapId: value.assignment.mapId,
            arm: value.assignment.candidateArm,
            opponent: value.assignment.opponent,
            countryOrdinal: value.case.countryOrdinal,
            country: value.case.country,
            candidateStartOrdinal: value.case.candidateStartOrdinal,
            opponentStartOrdinal: value.case.opponentStartOrdinal,
            candidateStart: value.case.candidateStart,
            opponentStart: value.case.opponentStart,
            candidateSlot: value.case.candidateSlot,
            repeatIndex: value.case.repeatIndex,
            pairIndex: value.case.pairIndex,
            pairId: value.case.pairId,
            requestedEngineSeed: value.case.requestedEngineSeed,
            updates: value.result.updates,
            stopReason: value.result.stopReason,
            actionSha256: value.result.actionAudit.sha256,
            actionCalls: value.result.actionAudit.callCount,
            corpseTargetRequests: value.result.actionAudit.zeroHealthBuildingTargetRequests.count,
            ledgerPlainSha256: value.result.ledger.plainSha256,
            ledgerGzipSha256: value.result.ledger.gzipSha256,
            ledgerRecords: value.result.ledger.records,
            ledgerPlainBytes: value.result.ledger.plainBytes,
            ledgerGzipBytes: value.result.ledger.gzipBytes,
            v5,
            v6,
        });
        caseHashes[gameIndex] = cell.sha256;
        totalUpdates += value.result.updates;
        totalLedgerRecords += value.result.ledger.records;
        totalPlainBytes += value.result.ledger.plainBytes;
        totalGzipBytes += value.result.ledger.gzipBytes;
        corpseTargetRequests += value.result.actionAudit.zeroHealthBuildingTargetRequests.count;
    }
    assert.equal(rows.length, 2700);
    assert.ok(totalGzipBytes <= MAX_TOTAL_GZIP_BYTES);
    const analysis = analyzeFreshDualRowsV2(rows);
    const outputs = {
        "games.csv": csv(rows.map((row) => ({
            ...row,
            v5Winner: row.v5.winner,
            v5Status: row.v5.status,
            v5Tick: row.v5.tick,
            v5Score: freshDualScore(row.v5.winner),
            v6Winner: row.v6.winner,
            v6Status: row.v6.status,
            v6Tick: row.v6.tick,
            v6Score: freshDualScore(row.v6.winner),
            v5: undefined,
            v6: undefined,
        }))),
        "outcomes.csv": csv(analysis.outcomes),
        "transitions.csv": csv(analysis.transitions),
        "endpoint-effects.csv": csv(analysis.endpointEffects),
        "scheduler.csv": csv(scheduler.sort((a, b) => a.gameIndex - b.gameIndex)),
        "gates.json": JSON.stringify(analysis.gates, null, 2) + "\n",
    };
    const outputDirectory = required("OUT_DIR");
    for (const [name, content] of Object.entries(outputs)) {
        fs.writeFileSync(path.join(outputDirectory, name), content, { flag: "wx", mode: 0o600 });
    }
    const fileCountBeforeAggregate = countFiles(ROOT);
    assert.ok(fileCountBeforeAggregate + 3 <= MAX_NEW_FILES);
    const aggregate = {
        kind: "fresh-dual-competitive-aggregate-v2-full-retry",
        complete: true,
        passed: true,
        ...common,
        arrayJobId,
        taskJobIds: Object.fromEntries(jobs),
        caseHashes,
        counts: loaded.manifest.counts,
        replacement: loaded.manifest.replacement,
        analysisRevision: analysis.analysisRevision,
        technical: {
            gamesVerified: 2700,
            ledgersStreamVerified: 2700,
            totalUpdates,
            totalLedgerRecords,
            totalPlainBytes,
            totalGzipBytes,
            maxGzipBytesPerGame: Math.max(...rows.map((row) => row.ledgerGzipBytes)),
            newFilesBeforeAggregate: fileCountBeforeAggregate,
            corpseTargetRequests,
            zeroForwardedResignations: true,
        },
        outputs: Object.fromEntries(Object.entries(outputs).map(([name, content]) => [
            name,
            { sha256: hash(content), bytes: Buffer.byteLength(content) },
        ])),
        gates: analysis.gates,
        endpointImpactInterpretation: "paired measurement difference, not algorithmic improvement",
        transferInterpretation: "descriptive-only-no-family-or-general-map-dominance-claim",
    };
    write(path.join(outputDirectory, "aggregate.json"), aggregate);
    console.log(JSON.stringify({
        complete: true,
        passed: true,
        games: 2700,
        ledgersStreamVerified: 2700,
        totalGzipBytes,
        centralSuperiority: analysis.gates.central.superiorityPassed,
        centralDominance: analysis.gates.central.dominancePassed,
        peakReplication: analysis.gates.peak.passed,
        advancedSuperiority: analysis.gates.advanced.superiorityPassed,
        advancedDominance: analysis.gates.advanced.dominancePassed,
    }));
};

main().catch((error) => {
    const failure = {
        kind: "fresh-dual-competitive-technical-failure-v2-full-retry",
        complete: false,
        technicalError: error instanceof Error ? error.message : String(error),
        frames: String(error instanceof Error ? error.stack : error).split("\n")
            .filter((line) => /^\s*at /.test(line) && line.length < 700).slice(0, 10),
    };
    console.error(JSON.stringify(failure));
    if (process.env.OUT_DIR) {
        try { write(path.join(process.env.OUT_DIR, "failure.json"), failure); } catch {
            // Preserve original error and all exclusive partial evidence.
        }
    }
    process.exitCode = 1;
});
