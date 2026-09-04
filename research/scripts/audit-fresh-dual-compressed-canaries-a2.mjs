import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { rejectOutcomeKeys } from "../runtime/fresh-dual-endpoint-plan-v1.mjs";
import {
    DRIVER,
    REPO,
    read,
} from "../runtime/fresh-dual-inputs-v1.mjs";
import {
    FRESH_DUAL_EXECUTION_ROOT,
    validateFreshDualFrozenPolicyInputs,
} from "../runtime/fresh-dual-runtime-freeze-validator-v1.mjs";

const ROOT = path.join(FRESH_DUAL_EXECUTION_ROOT, "compressed-canaries-a2");
const ARRAY_JOB_ID = "24731908";
const FINALIZER_JOB_ID = "24731909";
const MANIFEST_SHA256 = "0aedc3165fcb9434ba9f7f2fe5865cd4e8dddfbd4010ad67230285f49a5715ee";
const AGGREGATE_SHA256 = "e4796e2e8d1fec4038473dfa444bf9728b27a58d3fcdb3c187198cbba7ec4186";
const hash = (value) => crypto.createHash("sha256").update(value).digest("hex");
const json = (file) => JSON.parse(read(file));
const sealed = (directory, name, marker) => {
    fs.readdirSync(directory);
    assert.equal(read(path.join(directory, "COMPLETE")).toString().trim(), marker);
    const bytes = read(path.join(directory, `${name}.json`));
    const sha256 = hash(bytes);
    assert.equal(sha256, read(path.join(directory, `${name}.sha256`)).toString().trim().split(/\s+/)[0]);
    return { value: JSON.parse(bytes), sha256 };
};
const csv = (rows) => {
    const keys = Object.keys(rows[0]);
    const quote = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
    return [keys, ...rows.map((row) => keys.map((key) => row[key]))]
        .map((row) => row.map(quote).join(",")).join("\n") + "\n";
};

const policy = validateFreshDualFrozenPolicyInputs();
const manifest = sealed(
    path.join(ROOT, "manifest"),
    "manifest",
    "COMPLETE_FRESH_DUAL_COMPRESSED_CANARY_MANIFEST_A2",
);
assert.equal(manifest.sha256, MANIFEST_SHA256);
rejectOutcomeKeys(manifest.value);
assert.equal(manifest.value.complete, true);
assert.equal(manifest.value.passed, true);
assert.equal(manifest.value.outcomeBlind, true);
assert.equal(manifest.value.sourceCommit, "f5317fbe94ba274de680f0d5a79a792ebb3fe5a2");
assert.equal(manifest.value.policyFreezeSha256, policy.freezeSha256);
assert.equal(manifest.value.parentCanaryAggregateSha256,
    "a4e9d38a91dfb9840e30041be52b83b65b564fd3d91ba06292346ad0b8107a52");
assert.equal(manifest.value.competitiveRunAuthorized, false);

const aggregate = sealed(
    path.join(ROOT, "finalizer"),
    "compressed-canary-aggregate",
    "COMPLETE_FRESH_DUAL_COMPRESSED_CANARY_AGGREGATE_A2",
);
assert.equal(aggregate.sha256, AGGREGATE_SHA256);
rejectOutcomeKeys(aggregate.value);
assert.equal(aggregate.value.complete, true);
assert.equal(aggregate.value.passed, true);
assert.equal(aggregate.value.outcomeBlind, true);
assert.equal(aggregate.value.sourceCommit, manifest.value.sourceCommit);
assert.equal(aggregate.value.manifestSha256, manifest.sha256);
assert.equal(aggregate.value.arrayJobId, ARRAY_JOB_ID);
assert.equal(aggregate.value.scheduler.jobId, FINALIZER_JOB_ID);
assert.equal(aggregate.value.configurations, 4);
assert.equal(aggregate.value.technicalGames, 8);
assert.equal(aggregate.value.simulationUpdates, 48_000);
assert.equal(aggregate.value.publicWorldSnapshots, 48_008);
assert.equal(aggregate.value.compressedTraceRecords, 48_024);
for (const key of [
    "exactWorldPairs", "exactActionPairs", "exactQuitPairs",
    "exactPlainTracePairs", "exactGzipTracePairs",
]) assert.equal(aggregate.value[key], 4);
assert.equal(aggregate.value.zeroForwardedResignations, true);
assert.equal(aggregate.value.competitiveRunAuthorized, true);

const submission = json(path.join(ROOT, "submission.json"));
const finalizerSubmission = json(path.join(ROOT, "finalizer-submission.json"));
assert.equal(submission.arrayJobId, ARRAY_JOB_ID);
assert.equal(submission.sourceCommit, manifest.value.sourceCommit);
assert.equal(submission.manifestSha256, manifest.sha256);
assert.equal(submission.workers, 4);
assert.equal(submission.technicalGames, 8);
assert.equal(finalizerSubmission.jobId, FINALIZER_JOB_ID);
assert.equal(finalizerSubmission.dependency, `afterok:${ARRAY_JOB_ID}`);
assert.equal(finalizerSubmission.sourceCommit, manifest.value.sourceCommit);

const raw = execFileSync("/opt/slurm/current/bin/sacct", [
    "-X", "-j", `${ARRAY_JOB_ID},${FINALIZER_JOB_ID}`, "-n", "-P",
    "--format=JobID,JobIDRaw,Account,Partition,State,ExitCode,Restarts,AllocCPUS,ElapsedRaw",
], { encoding: "utf8" }).trim();
const scheduler = raw.split("\n").map((line) => {
    const [label, jobId, account, partition, state, exitCode, restarts, cpus, elapsedSeconds] = line.split("|");
    return {
        label,
        jobId,
        account,
        partition,
        state,
        exitCode,
        restarts: Number(restarts),
        cpus: Number(cpus),
        elapsedSeconds: Number(elapsedSeconds),
    };
});
assert.equal(scheduler.length, 5);
assert.equal(new Set(scheduler.map((row) => row.jobId)).size, 5);
for (const row of scheduler) {
    assert.deepEqual(
        [row.account, row.partition, row.state, row.exitCode, row.restarts, row.cpus],
        ["pi_jss233", "day", "COMPLETED", "0:0", 0, 1],
    );
}
const jobs = new Map(scheduler.map((row) => [row.label, row.jobId]));
assert.equal(jobs.get(FINALIZER_JOB_ID), FINALIZER_JOB_ID);
const traceModule = await import(pathToFileURL(path.join(
    DRIVER, "dist/training/freshDualCanaryTrace.js",
)));

const pairs = [];
let plainBytes = 0;
let gzipBytes = 0;
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
    assert.equal(value.sourceCommit, manifest.value.sourceCommit);
    assert.equal(value.manifestSha256, manifest.sha256);
    assert.equal(value.scheduler.jobId, jobs.get(`${ARRAY_JOB_ID}_${index}`));
    assert.deepEqual(value.canary, manifest.value.canaries[index]);
    assert.equal(value.technicalGames, 2);
    assert.deepEqual(value.results.map((result) => result.mode), ["v5_reference", "dual"]);
    const [reference, dual] = value.results;
    for (const result of value.results) {
        assert.equal(result.complete, true);
        assert.equal(result.technicalPass, true);
        assert.equal(result.updates, 6000);
        assert.equal(result.worldTrajectory.snapshots, 6001);
        assert.equal(result.compressedTrace.records, 6003);
        assert.equal(result.quitSuppression.forwarded.candidate, 0);
        assert.equal(result.quitSuppression.forwarded.baseline, 0);
        const traceFinal = {
            updates: 6000,
            observations: 6001,
            worldTrajectory: result.worldTrajectory,
            actionAudit: result.actionAudit,
            quitSuppression: result.quitSuppression,
        };
        const verified = await traceModule.verifyFreshDualCanaryTraceFile(
            result.compressedTrace.file,
            result.compressedTrace,
            value.traceContext,
            traceFinal,
        );
        assert.equal(verified.records, 6003);
        assert.equal(verified.observations, 6001);
        plainBytes += result.compressedTrace.plainBytes;
        gzipBytes += result.compressedTrace.gzipBytes;
    }
    assert.deepEqual(reference.worldTrajectory, dual.worldTrajectory);
    assert.deepEqual(reference.actionAudit, dual.actionAudit);
    assert.deepEqual(reference.quitSuppression, dual.quitSuppression);
    assert.equal(reference.compressedTrace.plainSha256, dual.compressedTrace.plainSha256);
    assert.equal(reference.compressedTrace.gzipSha256, dual.compressedTrace.gzipSha256);
    assert.equal(reference.compressedTrace.plainBytes, dual.compressedTrace.plainBytes);
    assert.equal(reference.compressedTrace.gzipBytes, dual.compressedTrace.gzipBytes);
    for (const key of [
        "exactWorld", "exactActions", "exactQuit", "exactPlainTrace", "exactGzipTrace",
    ]) assert.equal(value[key], true);
    const parent = json(path.join(FRESH_DUAL_EXECUTION_ROOT, "canaries/finalizer/canary-aggregate.json"))
        .pairs[index];
    assert.equal(reference.worldTrajectory.sha256, parent.worldSha256);
    assert.equal(reference.actionAudit.sha256, parent.actionSha256);
    const aggregateRow = aggregate.value.pairs[index];
    assert.equal(aggregateRow.cellSha256, cell.sha256);
    assert.equal(aggregateRow.plainTraceSha256, reference.compressedTrace.plainSha256);
    assert.equal(aggregateRow.gzipTraceSha256, reference.compressedTrace.gzipSha256);
    pairs.push({
        canaryIndex: index,
        mapId: value.canary.mapId,
        candidateArm: value.canary.candidateArm,
        opponent: value.canary.opponent,
        taskJobId: value.scheduler.jobId,
        cellSha256: cell.sha256,
        seed: value.canary.requestedEngineSeed,
        worldSha256: reference.worldTrajectory.sha256,
        actionSha256: reference.actionAudit.sha256,
        actionCalls: reference.actionAudit.callCount,
        plainTraceSha256: reference.compressedTrace.plainSha256,
        gzipTraceSha256: reference.compressedTrace.gzipSha256,
        recordsPerGame: reference.compressedTrace.records,
        plainBytesPerGame: reference.compressedTrace.plainBytes,
        gzipBytesPerGame: reference.compressedTrace.gzipBytes,
        corpseTargetRequests: reference.actionAudit.zeroHealthBuildingTargetRequests.count,
        exactWorld: value.exactWorld,
        exactActions: value.exactActions,
        exactPlainTrace: value.exactPlainTrace,
        exactGzipTrace: value.exactGzipTrace,
        exactQuit: value.exactQuit,
    });
}
assert.deepEqual(
    aggregate.value.taskJobIds,
    Object.fromEntries([...Array(4).keys()].map((index) => [
        String(index), jobs.get(`${ARRAY_JOB_ID}_${index}`),
    ])),
);
assert.equal(aggregate.value.pairs.reduce((total, row) => total + 2 * row.tracePlainBytes, 0), plainBytes);
assert.equal(aggregate.value.pairs.reduce((total, row) => total + 2 * row.traceGzipBytes, 0), gzipBytes);

const outputDirectory = path.join(REPO, "research/results/2026-09-03-fresh-dual-compressed-canary-a2-audit");
fs.mkdirSync(outputDirectory, { recursive: true });
const outputs = {
    "pairs.csv": csv(pairs),
    "scheduler.csv": csv(scheduler),
};
for (const [name, value] of Object.entries(outputs)) fs.writeFileSync(path.join(outputDirectory, name), value);
const validation = {
    complete: true,
    passed: true,
    outcomeBlind: true,
    manifestSha256: manifest.sha256,
    aggregateSha256: aggregate.sha256,
    policyFreezeSha256: policy.freezeSha256,
    executionSourceCommit: manifest.value.sourceCommit,
    auditSourceCommit: policy.currentSourceCommit,
    programSha256: hash(read(fileURLToPath(import.meta.url))),
    schedulerRecords: 5,
    configurations: 4,
    technicalGames: 8,
    simulationUpdates: 48_000,
    publicWorldSnapshots: 48_008,
    compressedTraceRecords: 48_024,
    tracesStreamVerified: 8,
    totalPlainBytes: plainBytes,
    totalGzipBytes: gzipBytes,
    exactWorldPairs: 4,
    exactActionPairs: 4,
    exactPlainTracePairs: 4,
    exactGzipTracePairs: 4,
    exactQuitPairs: 4,
    zeroForwardedResignations: true,
    competitiveRunAuthorized: true,
    cpuSeconds: scheduler.reduce((total, row) => total + row.cpus * row.elapsedSeconds, 0),
    outputs: Object.fromEntries(Object.entries(outputs).map(([name, value]) => [name, hash(value)])),
};
fs.writeFileSync(path.join(outputDirectory, "validation.json"), JSON.stringify(validation, null, 2) + "\n");
console.log(JSON.stringify({ ...validation, pairs }));
