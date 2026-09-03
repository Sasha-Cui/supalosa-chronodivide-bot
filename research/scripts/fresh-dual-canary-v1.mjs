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
    ROOT,
    read,
} from "../runtime/fresh-dual-inputs-v1.mjs";
import {
    EXECUTION_ROOT,
    loadAndVerifyFreshDualRuntimeFreeze,
} from "./fresh-dual-runtime-freeze-v1.mjs";

const required = (name) => {
    const value = process.env[name];
    assert.ok(value, `${name} required`);
    return value;
};
const hash = (value) => crypto.createHash("sha256").update(value).digest("hex");
const git = (...args) => execFileSync("git", args, { cwd: REPO, encoding: "utf8" }).trim();
const write = (file, value) => {
    rejectOutcomeKeys(value);
    fs.writeFileSync(file, JSON.stringify(value, null, 2) + "\n", { flag: "wx", mode: 0o600 });
};
const sealed = (directory, name, marker) => {
    fs.readdirSync(directory);
    assert.equal(fs.readFileSync(path.join(directory, "COMPLETE"), "utf8").trim(), marker);
    const bytes = read(path.join(directory, `${name}.json`));
    const actual = hash(bytes);
    assert.equal(actual, fs.readFileSync(path.join(directory, `${name}.sha256`), "utf8").trim().split(/\s+/)[0]);
    return { value: JSON.parse(bytes), sha256: actual };
};
const deepEqualJson = (left, right) => JSON.stringify(left) === JSON.stringify(right);

const main = async () => {
    const mode = process.argv[2];
    assert.ok(["cell", "finalize"].includes(mode));
    assert.equal(required("SLURM_JOB_ACCOUNT"), "pi_jss233");
    assert.equal(process.version, "v20.13.1");
    assert.equal(git("branch", "--show-current"), "main");
    assert.equal(git("status", "--porcelain=v1"), "");
    const sourceCommit = git("rev-parse", "HEAD");
    assert.equal(sourceCommit, git("rev-parse", "fork/main"));
    assert.equal(sourceCommit, required("SOURCE_COMMIT"));
    const programSha256 = hash(read(fileURLToPath(import.meta.url)));
    assert.equal(programSha256, required("PROGRAM_SHA256"));
    const freeze = loadAndVerifyFreshDualRuntimeFreeze();
    assert.equal(freeze.sha256, required("FREEZE_SHA256"));
    assert.equal(freeze.manifest.frozen.sourceCommit, sourceCommit);
    assert.equal(
        freeze.manifest.frozen.files["research/scripts/fresh-dual-canary-v1.mjs"],
        programSha256,
    );
    const context = {
        sourceCommit,
        programSha256,
        freezeSha256: freeze.sha256,
        policyRuntimeIdentities: {
            candidateTree: freeze.manifest.frozen.candidatePolicy.runtimeTree.sha256,
            externalTree: freeze.manifest.frozen.externalSupalosa.runtimeTree.sha256,
            gameApi: freeze.manifest.frozen.gameApi.sha256,
            effectiveGameApi: freeze.manifest.frozen.gameApi.effectiveSha256,
            ra2Bundle: freeze.manifest.frozen.ra2WebAdvanced.bundleSha256,
        },
        scheduler: {
            jobId: required("SLURM_JOB_ID"),
            arrayJobId: process.env.SLURM_ARRAY_JOB_ID ?? null,
            account: "pi_jss233",
            partition: "day",
        },
        nodeVersion: process.version,
    };
    const canaryRoot = path.join(EXECUTION_ROOT, "canaries");
    if (mode === "cell") {
        const canaryIndex = Number(required("SLURM_ARRAY_TASK_ID"));
        assert.ok(Number.isSafeInteger(canaryIndex) && canaryIndex >= 0 && canaryIndex < 4);
        const canary = freeze.manifest.frozen.canaries[canaryIndex];
        assert.equal(canary.canaryIndex, canaryIndex);
        const map = freeze.manifest.frozen.maps.find((value) => value.id === canary.mapId);
        assert.ok(map);
        const runtime = await import(pathToFileURL(freeze.manifest.frozen.gameApi.path));
        assert.equal(
            globalThis[Symbol.for("chrono.research.explicit-start.v1")]?.originalSha256,
            freeze.manifest.frozen.gameApi.sha256,
        );
        await runtime.cdapi.init(ASSETS);
        const modes = runtime.cdapi.getAvailableGameModes(map.fileName);
        assert.ok(modes.length > 0);
        process.env.BASELINE_PACKAGE_ROOT = freeze.manifest.frozen.externalSupalosa.packageRoot;
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
        assert.equal(baselineFactory.descriptor.packageRoot, freeze.manifest.frozen.externalSupalosa.packageRoot);
        const loadedAdvanced = canary.opponent === "ra2web_advanced"
            ? ra2Module.loadRa2WebOpponent(
                freeze.manifest.frozen.ra2WebAdvanced.freezeRoot,
                freeze.manifest.frozen.ra2WebAdvanced.opponentId,
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
                throw new Error(`Unsupported canary candidate arm ${canary.candidateArm}`);
            }
            const opponent = canary.opponent === "pinned_supalosa"
                ? baselineFactory.create(opponentName, canary.country)
                : ra2Module.createInspectableRa2WebBot(
                    loadedAdvanced,
                    opponentName,
                    canary.country,
                );
            assert.ok(candidate instanceof runtime.Bot);
            assert.ok(opponent instanceof runtime.Bot);
            return { candidate, opponent };
        };
        const results = [];
        for (const canaryMode of canary.modes) {
            const bots = makeBots();
            results.push(await runner.runFreshDualCanary({
                spec: {
                    mapName: map.fileName,
                    gameMode: modes[0],
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
            }));
        }
        assert.deepEqual(results.map((value) => value.mode), canary.modes);
        const [reference, dual] = results;
        const exactWorld = reference.worldTrajectory.sha256 === dual.worldTrajectory.sha256 &&
            reference.worldTrajectory.snapshots === dual.worldTrajectory.snapshots;
        const exactActions = reference.actionAudit.sha256 === dual.actionAudit.sha256 &&
            reference.actionAudit.callCount === dual.actionAudit.callCount &&
            deepEqualJson(reference.actionAudit.bySideAndMethod, dual.actionAudit.bySideAndMethod) &&
            deepEqualJson(
                reference.actionAudit.zeroHealthBuildingTargetRequests,
                dual.actionAudit.zeroHealthBuildingTargetRequests,
            );
        const exactQuit = deepEqualJson(reference.quitSuppression, dual.quitSuppression) &&
            reference.quitSuppression.forwarded.candidate === 0 &&
            reference.quitSuppression.forwarded.baseline === 0;
        assert.ok(exactWorld && exactActions && exactQuit);
        const value = {
            kind: "fresh-dual-noninterference-canary-pair-v1",
            complete: true,
            passed: true,
            outcomeBlind: true,
            ...context,
            canary,
            map,
            technicalGames: 2,
            exactWorld,
            exactActions,
            exactQuit,
            results,
            competitiveRunAuthorized: false,
        };
        rejectOutcomeKeys(value);
        write(path.join(required("OUT_DIR"), "canary.json"), value);
        console.log(JSON.stringify({
            complete: true,
            canaryIndex,
            technicalGames: 2,
            exactWorld,
            exactActions,
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
        const directory = path.join(canaryRoot, `cell-${String(index).padStart(2, "0")}`);
        const sealedCell = sealed(
            directory,
            "canary",
            "COMPLETE_FRESH_DUAL_CANARY_PAIR_V1",
        );
        const value = sealedCell.value;
        rejectOutcomeKeys(value);
        assert.equal(value.complete, true);
        assert.equal(value.passed, true);
        assert.equal(value.outcomeBlind, true);
        assert.equal(value.sourceCommit, sourceCommit);
        assert.equal(value.programSha256, programSha256);
        assert.equal(value.freezeSha256, freeze.sha256);
        assert.equal(value.scheduler.jobId, jobs.get(index));
        assert.equal(value.scheduler.arrayJobId, arrayJobId);
        assert.deepEqual(value.canary, freeze.manifest.frozen.canaries[index]);
        assert.equal(value.technicalGames, 2);
        assert.equal(value.results.length, 2);
        assert.equal(value.results[0].updates, 6000);
        assert.equal(value.results[1].updates, 6000);
        assert.equal(value.results[0].worldTrajectory.snapshots, 6001);
        assert.equal(value.results[1].worldTrajectory.snapshots, 6001);
        assert.equal(value.exactWorld, true);
        assert.equal(value.exactActions, true);
        assert.equal(value.exactQuit, true);
        assert.equal(value.competitiveRunAuthorized, false);
        pairs.push({
            canaryIndex: index,
            cellSha256: sealedCell.sha256,
            taskJobId: jobs.get(index),
            mapId: value.canary.mapId,
            candidateArm: value.canary.candidateArm,
            opponent: value.canary.opponent,
            worldSha256: value.results[0].worldTrajectory.sha256,
            actionSha256: value.results[0].actionAudit.sha256,
            actionCalls: value.results[0].actionAudit.callCount,
            quitAttempts: value.results[0].quitSuppression.attempts,
        });
    }
    const aggregate = {
        kind: "fresh-dual-noninterference-canary-aggregate-v1",
        complete: true,
        passed: true,
        outcomeBlind: true,
        ...context,
        arrayJobId,
        taskJobIds: Object.fromEntries(jobs),
        configurations: 4,
        technicalGames: 8,
        pairs,
        exactWorldPairs: 4,
        exactActionPairs: 4,
        zeroForwardedResignations: true,
        competitiveRunAuthorized: true,
    };
    rejectOutcomeKeys(aggregate);
    write(path.join(required("OUT_DIR"), "canary-aggregate.json"), aggregate);
    console.log(JSON.stringify({
        complete: true,
        passed: true,
        configurations: 4,
        technicalGames: 8,
        competitiveRunAuthorized: true,
    }));
};

main().catch((error) => {
    const failure = {
        kind: "fresh-dual-canary-technical-failure-v1",
        complete: false,
        technicalError: error instanceof Error ? error.message : String(error),
        frames: String(error instanceof Error ? error.stack : error).split("\n")
            .filter((line) => /^\s*at /.test(line) && line.length < 700).slice(0, 10),
    };
    console.error(JSON.stringify(failure));
    if (process.env.OUT_DIR) {
        try {
            write(path.join(process.env.OUT_DIR, "failure.json"), failure);
        } catch {
            // Preserve the original failure and any partial output.
        }
    }
    process.exitCode = 1;
});
