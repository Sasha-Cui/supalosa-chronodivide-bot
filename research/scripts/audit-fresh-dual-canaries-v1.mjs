import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { rejectOutcomeKeys } from "../runtime/fresh-dual-endpoint-plan-v1.mjs";
import {
    REPO,
    ROOT,
    read,
} from "../runtime/fresh-dual-inputs-v1.mjs";
import {
    FRESH_DUAL_EXECUTION_ROOT,
    validateFreshDualFrozenComponents,
} from "../runtime/fresh-dual-runtime-freeze-validator-v1.mjs";

const ARRAY_JOB_ID = "24728660";
const FINALIZER_JOB_ID = "24728661";
const AGGREGATE_SHA256 = "a4e9d38a91dfb9840e30041be52b83b65b564fd3d91ba06292346ad0b8107a52";
const hash = (value) => crypto.createHash("sha256").update(value).digest("hex");
const json = (file) => JSON.parse(read(file));
const canonical = (value) => JSON.stringify(value);
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

const frozen = validateFreshDualFrozenComponents();
const canaryRoot = path.join(FRESH_DUAL_EXECUTION_ROOT, "canaries");
const aggregate = sealed(
    path.join(canaryRoot, "finalizer"),
    "canary-aggregate",
    "COMPLETE_FRESH_DUAL_CANARY_AGGREGATE_V1",
);
assert.equal(aggregate.sha256, AGGREGATE_SHA256);
rejectOutcomeKeys(aggregate.value);
assert.equal(aggregate.value.complete, true);
assert.equal(aggregate.value.passed, true);
assert.equal(aggregate.value.outcomeBlind, true);
assert.equal(aggregate.value.sourceCommit, frozen.frozenSourceCommit);
assert.equal(aggregate.value.freezeSha256, frozen.freezeSha256);
assert.equal(aggregate.value.arrayJobId, ARRAY_JOB_ID);
assert.equal(aggregate.value.scheduler.jobId, FINALIZER_JOB_ID);
assert.equal(aggregate.value.configurations, 4);
assert.equal(aggregate.value.technicalGames, 8);
assert.equal(aggregate.value.exactWorldPairs, 4);
assert.equal(aggregate.value.exactActionPairs, 4);
assert.equal(aggregate.value.zeroForwardedResignations, true);
assert.equal(aggregate.value.competitiveRunAuthorized, true);

const submission = json(path.join(FRESH_DUAL_EXECUTION_ROOT, "canary-submission.json"));
const finalizerSubmission = json(path.join(FRESH_DUAL_EXECUTION_ROOT, "canary-finalizer-submission.json"));
assert.equal(submission.arrayJobId, ARRAY_JOB_ID);
assert.equal(submission.workers, 4);
assert.equal(submission.technicalGames, 8);
assert.equal(submission.sourceCommit, frozen.frozenSourceCommit);
assert.equal(submission.freezeSha256, frozen.freezeSha256);
assert.equal(finalizerSubmission.jobId, FINALIZER_JOB_ID);
assert.equal(finalizerSubmission.dependency, `afterok:${ARRAY_JOB_ID}`);
assert.equal(finalizerSubmission.sourceCommit, frozen.frozenSourceCommit);
assert.equal(finalizerSubmission.freezeSha256, frozen.freezeSha256);

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
    assert.equal(row.account, "pi_jss233");
    assert.equal(row.partition, "day");
    assert.equal(row.state, "COMPLETED");
    assert.equal(row.exitCode, "0:0");
    assert.equal(row.restarts, 0);
    assert.equal(row.cpus, 1);
}
const byLabel = new Map(scheduler.map((row) => [row.label, row]));
assert.equal(byLabel.get(FINALIZER_JOB_ID)?.jobId, FINALIZER_JOB_ID);

const pairs = [];
for (let index = 0; index < 4; index += 1) {
    const cell = sealed(
        path.join(canaryRoot, `cell-${String(index).padStart(2, "0")}`),
        "canary",
        "COMPLETE_FRESH_DUAL_CANARY_PAIR_V1",
    );
    const value = cell.value;
    rejectOutcomeKeys(value);
    assert.equal(value.complete, true);
    assert.equal(value.passed, true);
    assert.equal(value.outcomeBlind, true);
    assert.equal(value.sourceCommit, frozen.frozenSourceCommit);
    assert.equal(value.freezeSha256, frozen.freezeSha256);
    assert.equal(value.scheduler.jobId, byLabel.get(`${ARRAY_JOB_ID}_${index}`)?.jobId);
    assert.deepEqual(value.canary, frozen.frozen.canaries[index]);
    assert.equal(value.technicalGames, 2);
    assert.equal(value.results.length, 2);
    assert.deepEqual(value.results.map((result) => result.mode), ["v5_reference", "dual"]);
    const [reference, dual] = value.results;
    for (const result of value.results) {
        assert.equal(result.complete, true);
        assert.equal(result.technicalPass, true);
        assert.equal(result.updates, 6000);
        assert.equal(result.initialTick, 0);
        assert.equal(result.finalTick, 6000);
        assert.equal(result.worldTrajectory.snapshots, 6001);
        assert.equal(result.requestedEngineSeed, value.canary.requestedEngineSeed);
        assert.deepEqual(result.observedStarts, {
            candidate: value.canary.candidateStart,
            opponent: value.canary.opponentStart,
        });
        assert.equal(result.quitSuppression.forwarded.candidate, 0);
        assert.equal(result.quitSuppression.forwarded.baseline, 0);
    }
    assert.equal(reference.worldTrajectory.sha256, dual.worldTrajectory.sha256);
    assert.deepEqual(reference.worldTrajectory, dual.worldTrajectory);
    assert.equal(reference.actionAudit.sha256, dual.actionAudit.sha256);
    assert.equal(reference.actionAudit.callCount, dual.actionAudit.callCount);
    assert.deepEqual(reference.actionAudit.bySideAndMethod, dual.actionAudit.bySideAndMethod);
    assert.deepEqual(
        reference.actionAudit.zeroHealthBuildingTargetRequests,
        dual.actionAudit.zeroHealthBuildingTargetRequests,
    );
    assert.deepEqual(reference.quitSuppression, dual.quitSuppression);
    assert.equal(value.exactWorld, true);
    assert.equal(value.exactActions, true);
    assert.equal(value.exactQuit, true);
    const aggregateRow = aggregate.value.pairs[index];
    assert.equal(aggregateRow.cellSha256, cell.sha256);
    assert.equal(aggregateRow.taskJobId, value.scheduler.jobId);
    assert.equal(aggregateRow.worldSha256, reference.worldTrajectory.sha256);
    assert.equal(aggregateRow.actionSha256, reference.actionAudit.sha256);
    assert.equal(aggregateRow.actionCalls, reference.actionAudit.callCount);
    pairs.push({
        canaryIndex: index,
        mapId: value.canary.mapId,
        candidateArm: value.canary.candidateArm,
        opponent: value.canary.opponent,
        taskJobId: value.scheduler.jobId,
        cellSha256: cell.sha256,
        seed: value.canary.requestedEngineSeed,
        updatesPerGame: 6000,
        snapshotsPerGame: 6001,
        worldSha256: reference.worldTrajectory.sha256,
        actionSha256: reference.actionAudit.sha256,
        actionCalls: reference.actionAudit.callCount,
        corpseTargetRequests: reference.actionAudit.zeroHealthBuildingTargetRequests.count,
        candidateQuitAttempts: reference.quitSuppression.attempts.candidate,
        baselineQuitAttempts: reference.quitSuppression.attempts.baseline,
        exactWorld: value.exactWorld,
        exactActions: value.exactActions,
        exactQuit: value.exactQuit,
    });
}
assert.deepEqual(
    aggregate.value.taskJobIds,
    Object.fromEntries([...Array(4).keys()].map((index) => [
        String(index), byLabel.get(`${ARRAY_JOB_ID}_${index}`)?.jobId,
    ])),
);

const outputDirectory = path.join(REPO, "research/results/2026-09-03-fresh-dual-canary-audit");
fs.mkdirSync(outputDirectory, { recursive: true });
const outputs = {
    "pairs.csv": csv(pairs),
    "scheduler.csv": csv(scheduler),
};
for (const [name, value] of Object.entries(outputs)) {
    fs.writeFileSync(path.join(outputDirectory, name), value);
}
const validation = {
    complete: true,
    passed: true,
    outcomeBlind: true,
    aggregateSha256: aggregate.sha256,
    freezeSha256: frozen.freezeSha256,
    frozenSourceCommit: frozen.frozenSourceCommit,
    auditSourceCommit: frozen.currentSourceCommit,
    programSha256: hash(read(fileURLToPath(import.meta.url))),
    schedulerRecords: scheduler.length,
    configurations: 4,
    technicalGames: 8,
    totalUpdates: 48_000,
    publicWorldSnapshots: 48_008,
    exactWorldPairs: 4,
    exactActionPairs: 4,
    exactQuitPairs: 4,
    zeroForwardedResignations: true,
    verifiedFrozenFiles: frozen.verifiedFiles,
    verifiedAssets: frozen.verifiedAssets,
    verifiedMaps: frozen.verifiedMaps,
    competitiveRunAuthorized: true,
    cpuSeconds: scheduler.reduce((total, row) => total + row.cpus * row.elapsedSeconds, 0),
    outputs: Object.fromEntries(Object.entries(outputs).map(([name, value]) => [name, hash(value)])),
};
fs.writeFileSync(
    path.join(outputDirectory, "validation.json"),
    JSON.stringify(validation, null, 2) + "\n",
);
console.log(JSON.stringify({ ...validation, pairs }));
