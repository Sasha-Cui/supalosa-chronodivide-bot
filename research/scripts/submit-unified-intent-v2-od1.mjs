#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { REPO, PROJECT, STUDY, EXECUTION, fileHash, git, writeExclusive, readPublished,
    schedulerRows, json } from "../runtime/unified-intent-v2-od1-io.mjs";
const phase = process.argv[2];
if (!["pure", "prepare", "canary", "smoke", "pairs"].includes(phase)) throw new Error("Choose pure|prepare|canary|smoke|pairs");
const source = git("rev-parse", "HEAD");
if (process.version !== "v20.13.1" || git("branch", "--show-current") !== "main" ||
    git("rev-parse", "fork/main") !== source || git("status", "--porcelain=v1") !== "") throw new Error("Clean synchronized main required");
const active = execFileSync("/opt/slurm/current/bin/squeue", ["--noheader", "--user=zc362", "--format=%i|%Z"], { encoding: "utf8" })
    .trim().split("\n").filter((line) => line.includes(PROJECT));
if (active.length) throw new Error("Source-bound jobs are active; do not duplicate or advance");
fs.mkdirSync(STUDY, { recursive: true, mode: 0o700 });
const receiptPath = (name) => path.join(STUDY, "launch-" + name + "-a1.json");
const reservation = path.join(STUDY, "launch-" + phase + "-intent-a1.json");
if (fs.existsSync(reservation) || fs.existsSync(receiptPath(phase))) throw new Error("Stage already attempted; reconcile receipts without resubmitting");
const program = path.join(REPO, "research/scripts/unified-intent-v2-od1.mjs");
const script = path.join(REPO, "research/slurm/unified_intent_v2_od1_stage.sbatch");
const protocol = path.join(REPO, "research/protocols/method/2026-09-17-unified-intent-v2-od1-selector-repair-a1.md");
let env = { ...process.env, REPO_ROOT: REPO, SOURCE_COMMIT: source, PROGRAM_SHA256: fileHash(program),
    SCRIPT_SHA256: fileHash(script), PROTOCOL_SHA256: fileHash(protocol) };
const checkPublished = (dir, kind) => {
    const r = readPublished(dir);
    if (!r.value.complete || !r.value.passed || r.value.kind !== kind ||
        r.value.sourceCommit !== source || r.value.programSha256 !== env.PROGRAM_SHA256) throw new Error("Stage prerequisite binding invalid");
    schedulerRows(r.value.scheduler.jobId);
    return r;
};
if (phase !== "pure") {
    const receipt = json(receiptPath("pure")), purePath = path.join(STUDY, "pure-a1/pure.json");
    const value = json(purePath), digest = fileHash(purePath);
    if (receipt.sourceCommit !== source || value.sourceCommit !== source || value.scheduler.jobId !== receipt.jobId ||
        !value.complete || !value.passed || value.tests.passed !== 213 || value.tests.od1RuntimePassed !== 16 ||
        fs.readFileSync(path.join(STUDY, "pure-a1/COMPLETE"), "utf8") !==
            "COMPLETE_UNIFIED_INTENT_V2_OD1_PURE_V1 " + digest + " " + fs.statSync(purePath).size + "\n") {
        throw new Error("Current-source pure gate required");
    }
    schedulerRows(receipt.jobId);
    env.PURE_GATE_PATH = purePath; env.PURE_JOB_ID = receipt.jobId;
}
if (!["pure", "prepare"].includes(phase)) {
    const m = checkPublished(path.join(EXECUTION, "manifest"), "unified-intent-v2-od1-manifest-v1");
    env.MANIFEST_SHA256 = m.sha256;
}
if (["smoke", "pairs"].includes(phase)) {
    const c = checkPublished(path.join(EXECUTION, "canary-finalizer"), "unified-intent-v2-od1-canary-aggregate-v1");
    schedulerRows(c.value.arrayJobId, 4);
    env.CANARY_GATE_SHA256 = c.sha256;
}
if (phase === "pairs") {
    const s = checkPublished(path.join(EXECUTION, "smoke"), "unified-intent-v2-od1-smoke-v1");
    env.SMOKE_SHA256 = s.sha256;
    console.log(JSON.stringify({ technicalSmokeResources: schedulerRows(s.value.scheduler.jobId)[0] }));
}
writeExclusive(reservation, JSON.stringify({ sourceCommit: source, phase, createdAt: new Date().toISOString(),
    programSha256: env.PROGRAM_SHA256, protocolSha256: env.PROTOCOL_SHA256 }) + "\n");
const submit = (label, extra, selectedEnv, selectedScript, finalizer = false) => {
    const args = ["--parsable", "--account=pi_jss233", "--partition=day", "--cpus-per-task=1",
        "--no-requeue", "--export=ALL", ...extra, selectedScript];
    const stdout = execFileSync("/opt/slurm/current/bin/sbatch", args, { cwd: REPO, encoding: "utf8", env: selectedEnv }).trim();
    if (!/^\d+(;[^\s]+)?$/.test(stdout)) throw new Error("Uncertain submission; reconcile intent before any retry");
    const receipt = { sourceCommit: source, phase: label, jobId: stdout.split(";")[0], submittedAt: new Date().toISOString(),
        args, programSha256: selectedEnv.PROGRAM_SHA256, scriptSha256: selectedEnv.SCRIPT_SHA256,
        protocolSha256: env.PROTOCOL_SHA256, account: "pi_jss233", partition: "day", cpus: 1,
        ...Object.fromEntries(["PURE_GATE_PATH", "PURE_JOB_ID", "MANIFEST_SHA256", "CANARY_GATE_SHA256",
            "SMOKE_SHA256", "CANARY_ARRAY_JOB_ID", "ARRAY_JOB_ID", "MODE", "OUT_DIR"].filter((k) => selectedEnv[k]).map((k) => [k, selectedEnv[k]])) };
    writeExclusive(receiptPath(label), JSON.stringify(receipt, null, 2) + "\n");
    console.log(JSON.stringify(receipt));
    return receipt;
};
if (phase === "pure") {
    const pureProgram = path.join(REPO, "research/scripts/unified-intent-v2-od1-pure.mjs");
    const pureScript = path.join(REPO, "research/slurm/unified_intent_v2_od1_pure.sbatch");
    submit("pure", ["--job-name=chrono-intent-v2od1-pure", "--mem=8G", "--time=01:00:00"],
        { ...env, OUT_DIR: path.join(STUDY, "pure-a1"), PROGRAM_SHA256: fileHash(pureProgram), SCRIPT_SHA256: fileHash(pureScript) }, pureScript);
} else if (phase === "prepare" || phase === "smoke") {
    submit(phase, ["--job-name=chrono-intent-v2od1-" + phase, "--mem=8G", "--time=" + (phase === "prepare" ? "08:00:00" : "04:00:00")],
        { ...env, MODE: phase }, script);
} else {
    const isCanary = phase === "canary", n = isCanary ? 4 : 900;
    const array = submit(phase, ["--job-name=chrono-intent-v2od1-" + phase,
        "--mem=8G", "--time=04:00:00", "--array=0-" + (n - 1) + "%" + (isCanary ? 4 : 64)],
        { ...env, MODE: isCanary ? "canary" : "pair" }, script);
    submit(phase + "-finalizer", ["--job-name=chrono-intent-v2od1-finalizer", "--mem=" + (isCanary ? "8G" : "24G"),
        "--time=" + (isCanary ? "01:00:00" : "08:00:00"), "--dependency=afterok:" + array.jobId, "--kill-on-invalid-dep=yes"],
        { ...env, MODE: isCanary ? "canary-finalize" : "finalize",
            [isCanary ? "CANARY_ARRAY_JOB_ID" : "ARRAY_JOB_ID"]: array.jobId }, script, true);
}
