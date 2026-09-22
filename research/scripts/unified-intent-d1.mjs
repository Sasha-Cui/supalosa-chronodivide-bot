#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import {
    REPO, STUDY, EXECUTION, hash, exact, required, requiredHash, schedulerIdentity, schedulerRows,
    reserveDirectory, publish, readPublished, technicalOnly, countFiles, recordLaunch, writeExclusive,
    buildD1PreparationEnvelope,
} from "../runtime/unified-intent-d1-io.mjs";
import {
    assertSource, verifyPure, verifyRuntime, initialize, createBots, zeroSettings, auditFreshSeeds,
    api, planModule, episodeModule, withSeededOfflineGame,
} from "../runtime/unified-intent-d1-context.mjs";
import { validateD1Competitive, projectD1Canary, projectD1Smoke } from "../runtime/unified-intent-d1-validation.mjs";
import { analyzeUnifiedIntentD1, summarizeD1Actions } from "../runtime/unified-intent-d1-analysis.mjs";

const mode = required("MODE");
const taskIndex = process.env.SLURM_ARRAY_TASK_ID === undefined ? null : Number(process.env.SLURM_ARRAY_TASK_ID);
const directories = {
    prepare: path.join(EXECUTION, "manifest"),
    canary: path.join(EXECUTION, "canary", "task-" + String(taskIndex).padStart(2, "0")),
    "canary-finalize": path.join(EXECUTION, "canary-finalizer"),
    smoke: path.join(EXECUTION, "smoke"),
    pair: path.join(EXECUTION, "pairs", "task-" + String(taskIndex).padStart(4, "0")),
    finalize: path.join(EXECUTION, "finalizer"),
};
if (!Object.hasOwn(directories, mode) ||
    (mode === "canary" && (!Number.isSafeInteger(taskIndex) || taskIndex < 0 || taskIndex >= 4)) ||
    (mode === "pair" && (!Number.isSafeInteger(taskIndex) || taskIndex < 0 || taskIndex >= 200)) ||
    (!["canary", "pair"].includes(mode) && taskIndex !== null)) throw new Error("D1 mode/task invalid");
const directory = directories[mode];
let launches = [];
reserveDirectory(directory);
let failureBinding = { sourceCommit: process.env.SOURCE_COMMIT, programSha256: process.env.PROGRAM_SHA256 };
let failureScheduler = { jobId: process.env.SLURM_JOB_ID };
try {
const launch = (value) => {
    recordLaunch(directory, value);
    launches.push(value);
};
const launchSpec = (cell, arm, episodeMode) => ({
    role: cell.role, caseIndex: cell.caseIndex, arm: arm.id,
    mode: episodeMode, requestedEngineSeed: cell.requestedEngineSeed,
});
const source = assertSource();
const pure = verifyPure();
const runtime = verifyRuntime();
const plan = planModule.buildUnifiedIntentD1Plan(runtime.maps);
const scheduler = schedulerIdentity();
const binding = { sourceCommit: source.sourceCommit, programSha256: source.programSha256,
    protocolSha256: source.protocolSha256, sourceBindingSha256: hash(JSON.stringify(source)),
    runtimeBindingSha256: hash(JSON.stringify(runtime)), pureSha256: pure.sha256 };
failureBinding = binding;
failureScheduler = scheduler;
const common = (kind) => ({ kind, complete: true, passed: true, ...binding, scheduler, launches });
const verifyBinding = (value) => {
    for (const [key, expected] of Object.entries(binding)) if (value[key] !== expected) throw new Error("D1 artifact binding drifted");
};
const manifest = mode === "prepare" ? null : readPublished(directories.prepare, requiredHash("MANIFEST_SHA256"));
if (manifest) {
    verifyBinding(manifest.value);
    if (manifest.value.kind !== "unified-intent-d1-manifest-v1" || !manifest.value.complete ||
        !manifest.value.passed || manifest.value.observations.length !== 205) throw new Error("D1 manifest ineligible");
    planModule.validateUnifiedIntentD1Plan(manifest.value.plan, runtime.maps);
    exact(manifest.value.source, source, "D1 manifest source files");
    exact(manifest.value.runtime, runtime, "D1 manifest runtime");
    if (!["canary", "pair"].includes(mode)) schedulerRows(manifest.value.scheduler.jobId);
    const all = [...plan.cases, ...plan.canaries, plan.smoke];
    exact(manifest.value.launches, all.map((c) => launchSpec(c, plan.arms[0], "zero_update")), "D1 selector launch count");
    for (const [i, cell] of all.entries()) exact(manifest.value.observations[i], {
        caseIndex: cell.caseIndex, requestedEngineSeed: cell.requestedEngineSeed, updates: 0,
        candidateStart: cell.candidateStart, opponentStart: cell.opponentStart,
        candidateCountry: cell.country, opponentCountry: cell.country,
        candidateStartOrdinal: cell.candidateStartOrdinal, opponentStartOrdinal: cell.opponentStartOrdinal,
    }, "D1 selector observation");
}
const readStage = (dir, expectedKind, expectedHash = null) => {
    const record = readPublished(dir, expectedHash);
    verifyBinding(record.value);
    if (!record.value.complete || !record.value.passed || record.value.kind !== expectedKind ||
        record.value.manifestSha256 !== manifest.sha256) throw new Error("D1 stage prerequisite invalid");
    return record;
};
const canaryGate = () => {
    const gate = readStage(directories["canary-finalize"], "unified-intent-d1-canary-aggregate-v1",
        requiredHash("CANARY_GATE_SHA256"));
    technicalOnly(gate.value);
    if (gate.value.configurations !== 4 || gate.value.episodes !== 24 || gate.value.launches.length !== 0) {
        throw new Error("D1 canary gate population invalid");
    }
    if (mode !== "pair") {
        schedulerRows(gate.value.scheduler.jobId);
        schedulerRows(gate.value.arrayJobId, 4);
    }
    return gate;
};
const smokeGate = () => {
    const gate = readStage(directories.smoke, "unified-intent-d1-smoke-v1", requiredHash("SMOKE_SHA256"));
    technicalOnly(gate.value);
    exact(gate.value.assignment, plan.smoke, "D1 smoke assignment");
    exact(gate.value.launches, plan.arms.map((arm) => launchSpec(plan.smoke, arm, "competitive")), "D1 smoke launch count");
    if (gate.value.episodes.length !== 3 || gate.value.episodes.some((e, i) =>
        e.arm !== plan.arms[i].id || !e.technicalPass || !e.replayPass || !e.payloadDiscarded || !e.resignationSuppressed)) {
        throw new Error("D1 smoke technical gate invalid");
    }
    if (mode !== "pair") schedulerRows(gate.value.scheduler.jobId);
    return gate;
};
const runEpisode = async (definitions, cell, arm, episodeMode) => {
    const map = runtime.maps.find((m) => m.id === cell.mapId);
    const bots = createBots(cell, arm, definitions);
    launch(launchSpec(cell, arm, episodeMode));
    return episodeModule.runUnifiedIntentD1Episode({
        api: api.cdapi, candidate: bots.candidate, opponent: bots.opponent, arm, mode: episodeMode,
        spec: { mapName: map.fileName, gameMode: manifest.value.gameModes[map.id],
            candidateSlot: cell.candidateSlot, candidateStart: cell.candidateStart, opponentStart: cell.opponentStart,
            candidateStartOrdinal: cell.candidateStartOrdinal, opponentStartOrdinal: cell.opponentStartOrdinal,
            requestedEngineSeed: cell.requestedEngineSeed, maxUpdates: cell.maxUpdates },
    });
};
    let artifact;
    if (mode === "prepare") {
        const seedAudit = auditFreshSeeds(plan);
        const envelope = buildD1PreparationEnvelope({
            ...common("unified-intent-d1-manifest-v1"), technicalOnly: true,
            source, runtime, pure, plan, seedAudit,
        });
        // The complete metadata envelope is checked before cdapi.init or any game initialization.
        const definitions = await initialize(runtime);
        const gameModes = Object.fromEntries(runtime.maps.map((map) => {
            const values = api.cdapi.getAvailableGameModes(map.fileName);
            if (!values.length) throw new Error("D1 map game mode unavailable");
            return [map.id, values[0]];
        }));
        technicalOnly({ gameModes });
        const observations = [];
        for (const cell of [...plan.cases, ...plan.canaries, plan.smoke]) {
            const map = runtime.maps.find((m) => m.id === cell.mapId), bots = createBots(cell, plan.arms[0], definitions);
            launch(launchSpec(cell, plan.arms[0], "zero_update"));
            await withSeededOfflineGame(api.cdapi, zeroSettings(cell, map, bots, gameModes[map.id]),
                cell.requestedEngineSeed, [{ agent: bots.candidate, identity: "candidate" }, { agent: bots.opponent, identity: "opponent" }],
                async (instance) => {
                    const game = bots.candidate.lastGameApi;
                    if (!game || !bots.opponent.lastGameApi || instance.isFinished() || game.getCurrentTick() !== 0) {
                        throw new Error("D1 zero-update initialization failed");
                    }
                    if (game.getPlayerData(bots.candidate.name).country?.name !== cell.country ||
                        game.getPlayerData(bots.opponent.name).country?.name !== cell.country) {
                        throw new Error("D1 selector effective country drifted");
                    }
                    const location = (name) => { const s = game.getPlayerData(name).startLocation; return s.x + "," + s.y; };
                    exact([location(bots.candidate.name), location(bots.opponent.name)],
                        [cell.candidateStart, cell.opponentStart], "D1 selector starts");
                });
            observations.push({ caseIndex: cell.caseIndex, requestedEngineSeed: cell.requestedEngineSeed, updates: 0,
                candidateStart: cell.candidateStart, opponentStart: cell.opponentStart,
                candidateCountry: cell.country, opponentCountry: cell.country,
                candidateStartOrdinal: cell.candidateStartOrdinal, opponentStartOrdinal: cell.opponentStartOrdinal });
        }
        artifact = { ...envelope, gameModes, observations, launches };
        technicalOnly(artifact);
    } else if (mode === "canary") {
        const cell = plan.canaries[taskIndex], definitions = await initialize(runtime), episodes = [];
        for (const arm of plan.arms) for (const variant of ["canary_v5_reference", "canary_dual"]) {
            episodes.push(await runEpisode(definitions, cell, arm, variant));
        }
        artifact = { ...common("unified-intent-d1-canary-v1"), technicalOnly: true,
            manifestSha256: manifest.sha256, assignment: cell,
            comparisons: projectD1Canary(episodes, cell, plan.arms) };
        technicalOnly(artifact);
    } else if (mode === "canary-finalize") {
        const arrayJobId = required("CANARY_ARRAY_JOB_ID"), accounting = schedulerRows(arrayJobId, 4);
        const records = plan.canaries.map((cell, i) => {
            const r = readStage(path.join(EXECUTION, "canary", "task-" + String(i).padStart(2, "0")),
                "unified-intent-d1-canary-v1");
            const v = r.value; technicalOnly(v);
            exact(v.assignment, cell, "D1 canary assignment");
            exact(v.launches, plan.arms.flatMap((a) => ["canary_v5_reference", "canary_dual"].map((m) =>
                launchSpec(cell, a, m))), "D1 canary launch count");
            if (v.scheduler.arrayJobId !== arrayJobId || v.scheduler.arrayTaskId !== String(i) ||
                v.scheduler.jobId !== accounting[i].jobId || v.comparisons.length !== 3 ||
                v.comparisons.some((c, j) => c.arm !== plan.arms[j].id || c.updates !== 3600 || c.snapshots !== 3601 ||
                    !c.actionEquivalent || !c.stateEquivalent || !c.telemetryEquivalent ||
                    !c.resignationEquivalent || !c.technicalPass)) throw new Error("D1 canary aggregate gate failed");
            return { caseIndex: cell.caseIndex, scheduler: v.scheduler, sha256: r.sha256, comparisons: v.comparisons };
        });
        artifact = { ...common("unified-intent-d1-canary-aggregate-v1"), technicalOnly: true,
            manifestSha256: manifest.sha256, configurations: 4, episodes: 24, arrayJobId, accounting, records };
        technicalOnly(artifact);
    } else if (mode === "smoke") {
        const prerequisite = canaryGate(), definitions = await initialize(runtime), episodes = [];
        for (const arm of plan.arms) episodes.push(await runEpisode(definitions, plan.smoke, arm, "competitive"));
        artifact = { ...common("unified-intent-d1-smoke-v1"), technicalOnly: true,
            manifestSha256: manifest.sha256, canaryGateSha256: prerequisite.sha256, assignment: plan.smoke,
            episodes: await projectD1Smoke(episodes, plan.smoke, plan.arms) };
        technicalOnly(artifact);
    } else if (mode === "pair") {
        const canary = canaryGate(), smoke = smokeGate();
        const definitions = await initialize(runtime), cell = plan.cases[taskIndex], episodes = [];
        for (const arm of plan.arms) {
            const result = await runEpisode(definitions, cell, arm, "competitive");
            await validateD1Competitive(result, cell, arm);
            episodes.push(result);
        }
        artifact = { ...common("unified-intent-d1-pair-v1"), manifestSha256: manifest.sha256,
            canaryGateSha256: canary.sha256, smokeSha256: smoke.sha256, assignment: cell,
            mapSha256: runtime.maps.find((m) => m.id === cell.mapId).sha256, episodes };
    } else if (mode === "finalize") {
        const canary = canaryGate(), smoke = smokeGate(), arrayJobId = required("ARRAY_JOB_ID");
        // No paired payload may be read before the complete scheduler population is clean.
        const accounting = schedulerRows(arrayJobId, 200);
        exact(fs.readdirSync(path.join(EXECUTION, "pairs")).sort(),
            plan.cases.map((c) => "task-" + String(c.caseIndex).padStart(4, "0")), "D1 pair directory population");
        const rows = [], recordIdentities = [], technical = [];
        for (const [i, cell] of plan.cases.entries()) {
            const record = readStage(path.join(EXECUTION, "pairs", "task-" + String(i).padStart(4, "0")),
                "unified-intent-d1-pair-v1");
            const v = record.value;
            exact(v.assignment, cell, "D1 paired assignment");
            exact(v.launches, plan.arms.map((a) => launchSpec(cell, a, "competitive")), "D1 paired launch count");
            if (v.episodes.length !== 3 || v.canaryGateSha256 !== canary.sha256 || v.smokeSha256 !== smoke.sha256 ||
                v.scheduler.arrayJobId !== arrayJobId || v.scheduler.arrayTaskId !== String(i) ||
                v.scheduler.jobId !== accounting[i].jobId ||
                v.mapSha256 !== runtime.maps.find((m) => m.id === cell.mapId).sha256) throw new Error("D1 paired identity invalid");
            const arms = {};
            for (const [j, arm] of plan.arms.entries()) {
                arms[arm.id] = await validateD1Competitive(v.episodes[j], cell, arm);
                technical.push({ caseIndex: i, arm: arm.id, updates: v.episodes[j].updates,
                    publicCallSha256: v.episodes[j].publicCall.sha256, publicCall: v.episodes[j].publicCall,
                    budgetDiagnostics: v.episodes[j].budgetDiagnostics,
                    publicStateSha256: v.episodes[j].publicState.sha256, telemetry: v.episodes[j].telemetry,
                    ledgerGzipSha256: v.episodes[j].ledger.gzipSha256 });
            }
            rows.push({ assignment: cell, arms });
            recordIdentities.push({ caseIndex: i, jobId: v.scheduler.jobId, sha256: record.sha256, bytes: record.bytes });
        }
        const analysis = analyzeUnifiedIntentD1(rows, plan);
        artifact = { ...common("unified-intent-d1-aggregate-v1"), manifestSha256: manifest.sha256,
            canaryGateSha256: canary.sha256, smokeSha256: smoke.sha256, arrayJobId,
            initializations: 205, priorZeroUpdateInitializations: 1810, cumulativeZeroUpdateInitializations: 2015,
            canaryEpisodes: 24, smokeEpisodes: 3, competitiveEpisodes: 600,
            totalAdvancingEpisodes: 627, accounting, recordIdentities, technical, rows, analysis,
            actions: summarizeD1Actions(technical.map(({ caseIndex, arm, updates, publicCall, budgetDiagnostics }) =>
                ({ caseIndex, arm, updates, publicCall, budgetDiagnostics })), plan) };
        const files = countFiles(EXECUTION);
        if (files + 2 !== 416) throw new Error("D1 final execution file budget exceeded");
        artifact.expectedFinalFiles = files + 2;
    }
    exact(assertSource(), source, "D1 source stability");
    const published = publish(directory, artifact);
    if (mode === "finalize" && countFiles(EXECUTION) !== artifact.expectedFinalFiles) throw new Error("D1 final file count drifted");
    console.log(JSON.stringify({ complete: true, mode, ...published }));
} catch (error) {
    const location = String(error.stack ?? "").split("\n").filter((line) => line.includes(REPO))
        .map((line) => line.match(/\/nfs\/[^\s)]+:\d+:\d+/)?.[0]).filter(Boolean).slice(0, 4);
    const failure = { complete: false, passed: false, technicalOnly: true, mode, ...failureBinding,
        scheduler: failureScheduler, launches, errorType: error.name, errorMessageSha256: hash(String(error.message)), location };
    const file = path.join(directory, "FAILURE.json");
    if (!fs.existsSync(file)) writeExclusive(file, JSON.stringify(failure, null, 2) + "\n");
    console.error("D1 failed closed; inspect technical failure identity, not partial game payloads.");
    process.exitCode = 1;
}
