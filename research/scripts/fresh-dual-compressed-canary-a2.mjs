import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { rejectOutcomeKeys } from "../runtime/fresh-dual-endpoint-plan-v1.mjs";
import {
    ASSETS,
    DRIVER,
    REPO,
    read,
} from "../runtime/fresh-dual-inputs-v1.mjs";
import {
    FRESH_DUAL_EXECUTION_ROOT,
    validateFreshDualFrozenPolicyInputs,
} from "../runtime/fresh-dual-runtime-freeze-validator-v1.mjs";

const ROOT = path.join(FRESH_DUAL_EXECUTION_ROOT, "compressed-canaries-a2");
const MANIFEST_DIR = path.join(ROOT, "manifest");
const MANIFEST_FILE = path.join(MANIFEST_DIR, "manifest.json");
const PARENT_DIR = path.join(FRESH_DUAL_EXECUTION_ROOT, "canaries/finalizer");
const PARENT_SHA256 = "a4e9d38a91dfb9840e30041be52b83b65b564fd3d91ba06292346ad0b8107a52";
const required = (name) => {
    const value = process.env[name];
    assert.ok(value, `${name} required`);
    return value;
};
const hash = (value) => crypto.createHash("sha256").update(value).digest("hex");
const git = (...args) => execFileSync("git", args, { cwd: REPO, encoding: "utf8" }).trim();
const json = (file) => JSON.parse(read(file));
const write = (file, value) => {
    rejectOutcomeKeys(value);
    fs.writeFileSync(file, JSON.stringify(value, null, 2) + "\n", { flag: "wx", mode: 0o600 });
};
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
        "research/protocols/maps/2026-09-03-fresh-dual-compressed-canary-amendment-a2.md",
        "research/runtime/fresh-dual-runtime-freeze-validator-v1.mjs",
        "research/scripts/fresh-dual-compressed-canary-a2.mjs",
        "research/slurm/fresh_dual_compressed_canary_a2.sbatch",
        "packages/chronodivide-bot-driver/dist/training/freshDualCanaryTrace.js",
        "packages/chronodivide-bot-driver/dist/training/freshDualStudyGame.js",
        "packages/chronodivide-bot-driver/dist/training/freshDualStudyInstrumentation.js",
    ];
    return Object.fromEntries(relative.map((value) => {
        const file = path.join(REPO, value);
        assert.ok(fs.lstatSync(file).isFile());
        return [value, hash(read(file))];
    }));
};
const loadManifest = () => {
    const policy = validateFreshDualFrozenPolicyInputs();
    const sealedManifest = sealed(MANIFEST_DIR, "manifest", "COMPLETE_FRESH_DUAL_COMPRESSED_CANARY_MANIFEST_A2");
    const manifest = sealedManifest.value;
    assert.equal(manifest.complete, true);
    assert.equal(manifest.passed, true);
    assert.equal(manifest.outcomeBlind, true);
    assert.equal(manifest.sourceCommit, git("rev-parse", "HEAD"));
    assert.equal(manifest.sourceCommit, git("rev-parse", "fork/main"));
    assert.equal(manifest.policyFreezeSha256, policy.freezeSha256);
    assert.equal(manifest.parentCanaryAggregateSha256, PARENT_SHA256);
    assert.deepEqual(manifest.files, fileBindings());
    assert.deepEqual(manifest.canaries, policy.frozen.canaries);
    assert.equal(manifest.competitiveRunAuthorized, false);
    rejectOutcomeKeys(manifest);
    return { manifest, manifestSha256: sealedManifest.sha256, policy };
};
const contextFor = (canary, map) => ({
    mapId: canary.mapId,
    mapName: map.fileName,
    country: canary.country,
    candidateSlot: canary.candidateSlot,
    candidateStart: canary.candidateStart,
    opponentStart: canary.opponentStart,
    requestedEngineSeed: canary.requestedEngineSeed,
});

const main = async () => {
    const mode = process.argv[2];
    assert.ok(["prepare", "cell", "finalize"].includes(mode));
    assert.equal(process.version, "v20.13.1");
    assert.equal(git("branch", "--show-current"), "main");
    assert.equal(git("status", "--porcelain=v1"), "");
    const sourceCommit = git("rev-parse", "HEAD");
    assert.equal(sourceCommit, git("rev-parse", "fork/main"));
    if (mode === "prepare") {
        assert.ok(!fs.existsSync(ROOT), "Preserve an existing compressed-canary repair");
        const policy = validateFreshDualFrozenPolicyInputs();
        const parent = sealed(PARENT_DIR, "canary-aggregate", "COMPLETE_FRESH_DUAL_CANARY_AGGREGATE_V1");
        assert.equal(parent.sha256, PARENT_SHA256);
        assert.equal(parent.value.complete, true);
        assert.equal(parent.value.passed, true);
        assert.equal(parent.value.outcomeBlind, true);
        assert.equal(parent.value.exactWorldPairs, 4);
        assert.equal(parent.value.exactActionPairs, 4);
        rejectOutcomeKeys(parent.value);
        const protocol = path.join(
            REPO,
            "research/protocols/maps/2026-09-03-fresh-dual-compressed-canary-amendment-a2.md",
        );
        fs.mkdirSync(MANIFEST_DIR, { recursive: true, mode: 0o700 });
        write(MANIFEST_FILE, {
            kind: "fresh-dual-compressed-canary-manifest-a2",
            complete: true,
            passed: true,
            outcomeBlind: true,
            sourceCommit,
            policyFreezeSha256: policy.freezeSha256,
            frozenPolicySourceCommit: policy.frozenSourceCommit,
            parentCanaryAggregateSha256: parent.sha256,
            protocolSha256: hash(read(protocol)),
            files: fileBindings(),
            canaries: policy.frozen.canaries,
            resources: {
                account: "pi_jss233",
                partition: "day",
                cpusPerTask: 1,
                memoryGiB: 8,
                hoursPerTask: 4,
                workers: 4,
                gamesPerWorker: 2,
                totalTechnicalGames: 8,
                simulationUpdates: 48_000,
                publicWorldSnapshots: 48_008,
                gpu: false,
                requeue: false,
            },
            requiredPairs: {
                exactWorld: 4,
                exactActions: 4,
                exactPlainTrace: 4,
                exactGzipTrace: 4,
                exactQuit: 4,
            },
            competitiveRunAuthorized: false,
        });
        const bytes = read(MANIFEST_FILE);
        fs.writeFileSync(path.join(MANIFEST_DIR, "manifest.sha256"),
            `${hash(bytes)}  manifest.json\n`, { flag: "wx", mode: 0o600 });
        fs.writeFileSync(path.join(MANIFEST_DIR, "COMPLETE"),
            "COMPLETE_FRESH_DUAL_COMPRESSED_CANARY_MANIFEST_A2\n", { flag: "wx", mode: 0o600 });
        console.log(JSON.stringify({
            complete: true,
            manifestSha256: hash(bytes),
            configurations: 4,
            technicalGames: 8,
            competitiveRunAuthorized: false,
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
        loaded.manifest.files["research/scripts/fresh-dual-compressed-canary-a2.mjs"],
        programSha256,
    );
    const common = {
        sourceCommit,
        programSha256,
        manifestSha256: loaded.manifestSha256,
        policyFreezeSha256: loaded.policy.freezeSha256,
        parentCanaryAggregateSha256: PARENT_SHA256,
        scheduler: {
            jobId: required("SLURM_JOB_ID"),
            arrayJobId: process.env.SLURM_ARRAY_JOB_ID ?? null,
            account: "pi_jss233",
            partition: "day",
        },
        nodeVersion: process.version,
    };
    if (mode === "cell") {
        const canaryIndex = Number(required("SLURM_ARRAY_TASK_ID"));
        assert.ok(Number.isSafeInteger(canaryIndex) && canaryIndex >= 0 && canaryIndex < 4);
        const canary = loaded.manifest.canaries[canaryIndex];
        const map = loaded.policy.frozen.maps.find((value) => value.id === canary.mapId);
        assert.ok(map);
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
        const traceModule = await import(pathToFileURL(path.join(
            DRIVER, "dist/training/freshDualCanaryTrace.js",
        )));
        const baselineFactory = await baselineModule.loadBaselineFactory(
            path.join(REPO, "packages/chronodivide-bot"),
        );
        assert.equal(baselineFactory.descriptor.kind, "external-package");
        const loadedAdvanced = canary.opponent === "ra2web_advanced"
            ? ra2Module.loadRa2WebOpponent(
                loaded.policy.frozen.ra2WebAdvanced.freezeRoot,
                loaded.policy.frozen.ra2WebAdvanced.opponentId,
            )
            : null;
        const makeBots = () => {
            const candidateName = "FreshDualCandidate";
            const opponentName = "FreshDualOpponent";
            let candidate;
            if (canary.candidateArm === "deployed") {
                candidate = deployedModule.createDeployedStrongBotCandidate(candidateName, canary.country);
            } else if (canary.candidateArm === "strategy_both") {
                const arm = peakModule.PEAK_PROFILE_ARMS.find((value) => value.id === "strategy_both");
                assert.ok(arm);
                candidate = peakModule.createPeakProfileCandidate(arm, candidateName, canary.country);
            } else if (canary.candidateArm === "supalosa_reference") {
                candidate = baselineFactory.create(candidateName, canary.country);
            } else {
                throw new Error(`Unsupported compressed-canary arm ${canary.candidateArm}`);
            }
            const opponent = canary.opponent === "pinned_supalosa"
                ? baselineFactory.create(opponentName, canary.country)
                : ra2Module.createInspectableRa2WebBot(loadedAdvanced, opponentName, canary.country);
            assert.ok(candidate instanceof runtime.Bot);
            assert.ok(opponent instanceof runtime.Bot);
            return { candidate, opponent };
        };
        const traceContext = contextFor(canary, map);
        const results = [];
        for (const canaryMode of canary.modes) {
            const bots = makeBots();
            const traceFile = path.join(required("OUT_DIR"), `${canaryMode}.jsonl.gz`);
            const result = await runner.runFreshDualCanary({
                spec: {
                    mapName: map.fileName,
                    gameMode: gameModes[0],
                    country: canary.country,
                    candidateSlot: canary.candidateSlot,
                    candidateStartOrdinal: canary.candidateStartOrdinal,
                    opponentStartOrdinal: canary.opponentStartOrdinal,
                    requestedEngineSeed: canary.requestedEngineSeed,
                    maxUpdates: canary.maxUpdates,
                },
                candidate: bots.candidate,
                opponent: bots.opponent,
                expectedStarts: {
                    candidate: canary.candidateStart,
                    opponent: canary.opponentStart,
                },
                mode: canaryMode,
                traceFile,
                traceContext,
            });
            assert.ok(result.compressedTrace);
            const traceFinal = {
                updates: 6000,
                observations: 6001,
                worldTrajectory: result.worldTrajectory,
                actionAudit: result.actionAudit,
                quitSuppression: result.quitSuppression,
            };
            const verified = await traceModule.verifyFreshDualCanaryTraceFile(
                traceFile, result.compressedTrace, traceContext, traceFinal,
            );
            assert.equal(verified.records, 6003);
            assert.equal(verified.observations, 6001);
            results.push(result);
        }
        const [reference, dual] = results;
        const parentPair = json(path.join(PARENT_DIR, "canary-aggregate.json")).pairs[canaryIndex];
        const exactWorld = reference.worldTrajectory.sha256 === dual.worldTrajectory.sha256 &&
            reference.worldTrajectory.sha256 === parentPair.worldSha256;
        const exactActions = reference.actionAudit.sha256 === dual.actionAudit.sha256 &&
            reference.actionAudit.sha256 === parentPair.actionSha256 &&
            reference.actionAudit.callCount === dual.actionAudit.callCount &&
            reference.actionAudit.callCount === parentPair.actionCalls &&
            JSON.stringify(reference.actionAudit.bySideAndMethod) ===
                JSON.stringify(dual.actionAudit.bySideAndMethod) &&
            JSON.stringify(reference.actionAudit.zeroHealthBuildingTargetRequests) ===
                JSON.stringify(dual.actionAudit.zeroHealthBuildingTargetRequests);
        const exactQuit = JSON.stringify(reference.quitSuppression) === JSON.stringify(dual.quitSuppression) &&
            reference.quitSuppression.forwarded.candidate === 0 &&
            reference.quitSuppression.forwarded.baseline === 0;
        const exactPlainTrace = reference.compressedTrace.plainSha256 === dual.compressedTrace.plainSha256 &&
            reference.compressedTrace.plainBytes === dual.compressedTrace.plainBytes &&
            reference.compressedTrace.records === dual.compressedTrace.records;
        const exactGzipTrace = reference.compressedTrace.gzipSha256 === dual.compressedTrace.gzipSha256 &&
            reference.compressedTrace.gzipBytes === dual.compressedTrace.gzipBytes;
        assert.ok(exactWorld && exactActions && exactQuit && exactPlainTrace && exactGzipTrace);
        const value = {
            kind: "fresh-dual-compressed-canary-pair-a2",
            complete: true,
            passed: true,
            outcomeBlind: true,
            ...common,
            canary,
            map,
            traceContext,
            technicalGames: 2,
            exactWorld,
            exactActions,
            exactQuit,
            exactPlainTrace,
            exactGzipTrace,
            results,
            competitiveRunAuthorized: false,
        };
        write(path.join(required("OUT_DIR"), "compressed-canary.json"), value);
        console.log(JSON.stringify({
            complete: true,
            canaryIndex,
            technicalGames: 2,
            exactWorld,
            exactActions,
            exactPlainTrace,
            exactGzipTrace,
            competitiveRunAuthorized: false,
        }));
        return;
    }
    const arrayJobId = required("ARRAY_JOB_ID");
    const raw = execFileSync("/opt/slurm/current/bin/sacct", [
        "-X", "-j", arrayJobId, "-n", "-P",
        "--format=JobID,JobIDRaw,Account,Partition,State,ExitCode,Restarts,AllocCPUS",
    ], { encoding: "utf8" }).trim();
    const jobs = new Map();
    for (const line of raw.split("\n")) {
        const [label, id, account, partition, state, exit, restarts, cpus] = line.split("|");
        const match = new RegExp(`^${arrayJobId}_(\\d+)$`).exec(label);
        if (!match) continue;
        assert.deepEqual([account, partition, state, exit, restarts, cpus],
            ["pi_jss233", "day", "COMPLETED", "0:0", "0", "1"]);
        assert.ok(!jobs.has(Number(match[1])));
        jobs.set(Number(match[1]), id);
    }
    assert.equal(jobs.size, 4);
    assert.equal(new Set(jobs.values()).size, 4);
    const pairs = [];
    for (let index = 0; index < 4; index += 1) {
        const cell = sealed(
            path.join(ROOT, `cells/cell-${String(index).padStart(2, "0")}`),
            "compressed-canary",
            "COMPLETE_FRESH_DUAL_COMPRESSED_CANARY_PAIR_A2",
        );
        const value = cell.value;
        rejectOutcomeKeys(value);
        assert.equal(value.complete, true);
        assert.equal(value.passed, true);
        assert.equal(value.outcomeBlind, true);
        assert.equal(value.sourceCommit, sourceCommit);
        assert.equal(value.manifestSha256, loaded.manifestSha256);
        assert.equal(value.scheduler.jobId, jobs.get(index));
        assert.equal(value.scheduler.arrayJobId, arrayJobId);
        assert.deepEqual(value.canary, loaded.manifest.canaries[index]);
        assert.equal(value.technicalGames, 2);
        assert.equal(value.results.length, 2);
        assert.equal(value.exactWorld, true);
        assert.equal(value.exactActions, true);
        assert.equal(value.exactQuit, true);
        assert.equal(value.exactPlainTrace, true);
        assert.equal(value.exactGzipTrace, true);
        for (const result of value.results) {
            assert.equal(result.updates, 6000);
            assert.equal(result.worldTrajectory.snapshots, 6001);
            assert.equal(result.compressedTrace.records, 6003);
        }
        pairs.push({
            canaryIndex: index,
            taskJobId: jobs.get(index),
            cellSha256: cell.sha256,
            mapId: value.canary.mapId,
            candidateArm: value.canary.candidateArm,
            opponent: value.canary.opponent,
            worldSha256: value.results[0].worldTrajectory.sha256,
            actionSha256: value.results[0].actionAudit.sha256,
            plainTraceSha256: value.results[0].compressedTrace.plainSha256,
            gzipTraceSha256: value.results[0].compressedTrace.gzipSha256,
            traceRecords: value.results[0].compressedTrace.records,
            tracePlainBytes: value.results[0].compressedTrace.plainBytes,
            traceGzipBytes: value.results[0].compressedTrace.gzipBytes,
        });
    }
    const aggregate = {
        kind: "fresh-dual-compressed-canary-aggregate-a2",
        complete: true,
        passed: true,
        outcomeBlind: true,
        ...common,
        arrayJobId,
        taskJobIds: Object.fromEntries(jobs),
        configurations: 4,
        technicalGames: 8,
        simulationUpdates: 48_000,
        publicWorldSnapshots: 48_008,
        compressedTraceRecords: 48_024,
        exactWorldPairs: 4,
        exactActionPairs: 4,
        exactQuitPairs: 4,
        exactPlainTracePairs: 4,
        exactGzipTracePairs: 4,
        zeroForwardedResignations: true,
        pairs,
        competitiveRunAuthorized: true,
    };
    write(path.join(required("OUT_DIR"), "compressed-canary-aggregate.json"), aggregate);
    console.log(JSON.stringify({
        complete: true,
        passed: true,
        configurations: 4,
        technicalGames: 8,
        exactPlainTracePairs: 4,
        exactGzipTracePairs: 4,
        competitiveRunAuthorized: true,
    }));
};

main().catch((error) => {
    const failure = {
        kind: "fresh-dual-compressed-canary-technical-failure-a2",
        complete: false,
        technicalError: error instanceof Error ? error.message : String(error),
        frames: String(error instanceof Error ? error.stack : error).split("\n")
            .filter((line) => /^\s*at /.test(line) && line.length < 700).slice(0, 10),
    };
    console.error(JSON.stringify(failure));
    if (process.env.OUT_DIR) {
        try { write(path.join(process.env.OUT_DIR, "failure.json"), failure); } catch {
            // Preserve the original failure and partial exclusive streams.
        }
    }
    process.exitCode = 1;
});
