#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync, execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
    REPO,
    STUDY,
    EXECUTION,
    PROTOCOL_SHA,
    SHA,
    encode,
    hash,
    fileHash,
    fileIdentity,
    writeExclusive,
    requireTrue,
    fields,
    exact,
    git,
    requestFor,
    stageDirectory,
    json,
} from "../runtime/strategic-s1-io.mjs";
import {
    PROGRAM,
    PURE_PROGRAM,
    STAGE_SCRIPT,
    PURE_SCRIPT,
    PROTOCOL,
    sourceSnapshot,
    verifyRuntime,
} from "../runtime/strategic-s1-provenance.mjs";
import {
    PURE_DIRECTORY,
    readPure,
    regularIdentity,
    confinedFile,
    verificationPath,
} from "../runtime/strategic-s1-gates.mjs";
import { buildStrategicS1Plan } from "../runtime/strategic-s1-registration.mjs";
import { makeBinding } from "../runtime/strategic-s1-stages.mjs";

export const SUBMISSIONS = path.join(STUDY, "submissions-v2");
const phases = ["pure", "prepare", "canary", "smoke", "main"];
const baseEnvironment = (stage) => ({
    REPO_ROOT: REPO,
    SOURCE_COMMIT: git("rev-parse", "HEAD"),
    PROTOCOL_SHA256: PROTOCOL_SHA,
    PROGRAM_SHA256: fileHash(stage === "pure" ? PURE_PROGRAM : PROGRAM),
    SCRIPT_SHA256: fileHash(stage === "pure" ? PURE_SCRIPT : STAGE_SCRIPT),
    MODE: stage,
    ...(stage === "pure" ? { OUT_DIR: PURE_DIRECTORY } : {}),
});
const prerequisiteNames = [
    "PURE_VERIFICATION_SHA256",
    "MANIFEST_SHA256",
    "MANIFEST_VERIFICATION_SHA256",
    "CANARY_GATE_SHA256",
    "CANARY_VERIFICATION_SHA256",
    "SMOKE_SHA256",
    "SMOKE_VERIFICATION_SHA256",
];
export function submissionArguments(stage, environment, arrayJobId = null) {
    requireTrue(
        ["pure", "prepare", "canary", "canary-finalize", "smoke", "case", "finalize"].includes(stage),
        "submission stage",
    );
    const req = requestFor(stage),
        env = { ...environment, MODE: stage };
    const allowed = [
        "REPO_ROOT",
        "SOURCE_COMMIT",
        "PROTOCOL_SHA256",
        "PROGRAM_SHA256",
        "SCRIPT_SHA256",
        "MODE",
        "OUT_DIR",
        ...prerequisiteNames,
        "ARRAY_JOB_ID",
    ];
    requireTrue(
        Object.keys(env).every((k) => allowed.includes(k)) &&
            env.REPO_ROOT === REPO &&
            /^[0-9a-f]{40}$/.test(env.SOURCE_COMMIT) &&
            env.PROTOCOL_SHA256 === PROTOCOL_SHA &&
            SHA.test(env.PROGRAM_SHA256) &&
            SHA.test(env.SCRIPT_SHA256),
        "submission environment",
    );
    requireTrue(
        Object.values(env).every((v) => typeof v === "string" && !/[,\n\r\0]/.test(v)),
        "export safety",
    );
    const finalized = ["canary-finalize", "finalize"].includes(stage);
    requireTrue(finalized ? /^\d+$/.test(arrayJobId) : arrayJobId === null, "dependency identity");
    if (finalized) env.ARRAY_JOB_ID = arrayJobId;
    const args = [
        "--parsable",
        "--hold",
        "--account=pi_jss233",
        "--partition=day",
        "--nodes=1",
        "--ntasks=1",
        "--cpus-per-task=1",
        "--mem=" + req.memoryMiB + "M",
        "--time=" + req.timeMinutes,
        "--no-requeue",
        "--chdir=" + REPO,
        "--job-name=chrono-s1-" + stage,
        "--open-mode=append",
        "--output=" + path.join(STUDY, "slurm", stage + "-%A_%a.out"),
        "--error=" + path.join(STUDY, "slurm", stage + "-%A_%a.err"),
    ];
    if (stage === "canary") args.push("--array=0-3%4");
    if (stage === "case") args.push("--array=0-199%32");
    if (finalized) args.push("--dependency=afterok:" + arrayJobId, "--kill-on-invalid-dep=yes");
    args.push(
        "--export=" +
            Object.keys(env)
                .sort()
                .map((k) => k + "=" + env[k])
                .join(","),
        stage === "pure" ? PURE_SCRIPT : STAGE_SCRIPT,
    );
    return args;
}
const syncDirectory = (d) => {
    const fd = fs.openSync(d, "r");
    try {
        fs.fsyncSync(fd);
    } finally {
        fs.closeSync(fd);
    }
};
/** Only called after complete prerequisite checks. Any attempted submission owns
 * its directory forever, including an ambiguous sbatch response; never retry it. */
export function submitOne(
    directory,
    stage,
    environment,
    arrayJobId = null,
    invoke = (exe, args) => spawnSync(exe, args, { encoding: "utf8", env: cleanSubmitEnvironment() }),
) {
    requireTrue(path.resolve(directory) === directory && directory.startsWith(STUDY + "/"), "submission directory");
    let ancestor = path.dirname(directory);
    while (ancestor !== path.dirname(STUDY)) {
        requireTrue(!fs.lstatSync(ancestor).isSymbolicLink(), "symlinked submission directory");
        ancestor = path.dirname(ancestor);
    }
    fs.mkdirSync(directory, { mode: 0o700 });
    syncDirectory(path.dirname(directory));
    const args = submissionArguments(stage, environment, arrayJobId);
    const intent = {
        kind: "strategic-s1-submission-intent-v1",
        stage,
        createdAt: new Date().toISOString(),
        cwd: REPO,
        sourceCommit: environment.SOURCE_COMMIT,
        request: requestFor(stage),
        args,
        wrapper: fileIdentity(stage === "pure" ? PURE_SCRIPT : STAGE_SCRIPT),
        program: fileIdentity(stage === "pure" ? PURE_PROGRAM : PROGRAM),
    };
    writeExclusive(path.join(directory, "intent.json"), encode(intent));
    let response;
    try {
        const r = invoke("/opt/slurm/current/bin/sbatch", args);
        response = {
            status: r.status,
            signal: r.signal ?? null,
            stdout: r.stdout ?? "",
            stderr: r.stderr ?? "",
            error: r.error?.message ?? null,
        };
    } catch (error) {
        response = { status: null, signal: null, stdout: "", stderr: "", error: String(error.message) };
    }
    writeExclusive(path.join(directory, "response.json"), encode(response));
    requireTrue(
        response.status === 0 &&
            response.signal === null &&
            response.error === null &&
            /^\d+\n?$/.test(response.stdout),
        "submission failed/uncertain; reconcile, never retry",
    );
    const jobId = response.stdout.trim();
    const receipt = {
        kind: "strategic-s1-submission-v1",
        stage,
        jobId,
        sourceCommit: environment.SOURCE_COMMIT,
        intent: fileIdentity(path.join(directory, "intent.json")),
        response: fileIdentity(path.join(directory, "response.json")),
    };
    writeExclusive(path.join(directory, "receipt.json"), encode(receipt));
    syncDirectory(directory);
    return receipt;
}
export function cleanSubmitEnvironment(environment = process.env) {
    return Object.fromEntries(
        Object.entries(environment).filter(([k]) => !k.startsWith("SBATCH_") && !k.startsWith("SLURM_")),
    );
}
const absent = (p) => {
    try {
        fs.lstatSync(p);
        throw new Error("S1 attempted stage already exists: " + p);
    } catch (e) {
        if (e.code !== "ENOENT") throw e;
    }
};
export function requireUnattempted(phase, root = EXECUTION, submissionRoot = SUBMISSIONS) {
    requireTrue(phases.includes(phase), "submission phase");
    absent(path.join(submissionRoot, phase));
    if (phase === "pure") {
        absent(PURE_DIRECTORY);
        return;
    }
    const stage = phase === "main" ? "case" : phase;
    const count = stage === "case" ? 200 : stage === "canary" ? 4 : 0;
    if (count) for (let i = 0; i < count; i++) absent(stageDirectory(stage, i, root));
    else absent(stageDirectory(stage, null, root));
    if (count) absent(stageDirectory(stage === "case" ? "finalize" : "canary-finalize", null, root));
}
export async function main() {
    requireTrue(
        process.argv.length === 3 && phases.includes(process.argv[2]),
        "usage: submit-strategic-s1.mjs pure|prepare|canary|smoke|main",
    );
    const phase = process.argv[2],
        stage = phase === "main" ? "case" : phase;
    requireTrue(
        process.cwd() === REPO &&
            process.version === "v20.13.1" &&
            git("status", "--porcelain=v1") === "" &&
            git("branch", "--show-current") === "main" &&
            git("rev-parse", "HEAD") === git("rev-parse", "fork/main"),
        "clean synchronized main",
    );
    requireTrue(fileHash(PROTOCOL) === PROTOCOL_SHA, "frozen protocol");
    requireUnattempted(phase);
    const queue = execFileSync("/opt/slurm/current/bin/squeue", ["-h", "-u", "zc362", "-o", "%i|%Z"], {
        encoding: "utf8",
    });
    requireTrue(
        !queue.split("\n").some((line) => line.split("|")[1] === REPO),
        "active source-bound jobs; do not duplicate",
    );
    const env = baseEnvironment(stage);
    Object.assign(process.env, env);
    const source = sourceSnapshot(stage),
        runtime = verifyRuntime();
    if (stage !== "pure") {
        const pure = readPure(source, runtime),
            plan = buildStrategicS1Plan(runtime.maps);
        env.PURE_VERIFICATION_SHA256 = fileHash(verificationPath("pure"));
        const readPhase = (name, hashName, verificationName) => {
            const folder = stageDirectory(name),
                raw = fs.readFileSync(path.join(folder, "record.json"));
            env[hashName] = hash(raw);
            env[verificationName] = fileHash(verificationPath(name));
        };
        if (stage !== "prepare") readPhase("prepare", "MANIFEST_SHA256", "MANIFEST_VERIFICATION_SHA256");
        if (["smoke", "case"].includes(stage))
            readPhase("canary-finalize", "CANARY_GATE_SHA256", "CANARY_VERIFICATION_SHA256");
        if (stage === "case") readPhase("smoke", "SMOKE_SHA256", "SMOKE_VERIFICATION_SHA256");
        Object.assign(process.env, env);
        const controllerStage = stage === "canary" ? "canary-finalize" : stage === "case" ? "finalize" : stage;
        const { prerequisites } = await import("./strategic-s1.mjs");
        await prerequisites(controllerStage, {
            source,
            runtime,
            plan,
            pure,
            bindings: makeBinding(source, runtime, pure),
        });
    }
    exact(sourceSnapshot(stage), source, "pre-submit source stability");
    exact(verifyRuntime(), runtime, "pre-submit runtime stability");
    fs.mkdirSync(SUBMISSIONS, { recursive: true, mode: 0o700 });
    fs.mkdirSync(path.join(STUDY, "slurm"), { recursive: true, mode: 0o700 });
    const folder = path.join(SUBMISSIONS, phase);
    fs.mkdirSync(folder, { mode: 0o700 });
    syncDirectory(SUBMISSIONS);
    writeExclusive(path.join(folder, "freeze.json"), encode({ source, runtime, environment: env, sourceBound: true }));
    const first = submitOne(path.join(folder, "worker"), stage, env);
    prepareRelease(
        folder,
        "worker",
        first,
        execFileSync("/opt/slurm/current/bin/scontrol", ["show", "job", first.jobId], { encoding: "utf8" }),
    );
    if (["canary", "case"].includes(stage)) {
        const finalStage = stage === "canary" ? "canary-finalize" : "finalize";
        const final = submitOne(path.join(folder, "finalizer"), finalStage, env, first.jobId);
        prepareRelease(
            folder,
            "finalizer",
            final,
            execFileSync("/opt/slurm/current/bin/scontrol", ["show", "job", final.jobId], { encoding: "utf8" }),
        );
        releaseHeld(folder, [final.jobId, first.jobId]);
        console.log(JSON.stringify({ phase, arrayJobId: first.jobId, finalizerJobId: final.jobId }));
    } else {
        releaseHeld(folder, [first.jobId]);
        console.log(JSON.stringify({ phase, jobId: first.jobId }));
    }
}
export function validateHeldJob(text, jobId, stage) {
    const get = (k) => {
        const matches = [...text.matchAll(new RegExp("(?:^|\\s)" + k + "=([^\\s]+)", "g"))];
        requireTrue(matches.length === 1, "held job field " + k);
        return matches[0][1];
    };
    const req = requestFor(stage),
        time = /^(?:(\d+)-)?(\d+):(\d+):(\d+)$/.exec(get("TimeLimit"));
    const tres = Object.fromEntries(
        get("ReqTRES")
            .split(",")
            .map((p) => p.split("=")),
    );
    const mem = /^(\d+(?:\.\d+)?)([KMGT])$/.exec(tres.mem ?? "");
    requireTrue(
        get("JobId") === jobId &&
            get("JobName") === "chrono-s1-" + stage &&
            get("Account") === "pi_jss233" &&
            get("Partition") === "day" &&
            get("JobState") === "PENDING" &&
            get("Priority") === "0" &&
            get("Requeue") === "0" &&
            get("Restarts") === "0" &&
            ["1", "1-1"].includes(get("NumNodes")) &&
            get("NumCPUs") === "1" &&
            get("NumTasks") === "1" &&
            get("CPUs/Task") === "1" &&
            get("WorkDir") === REPO &&
            get("Command") === (stage === "pure" ? PURE_SCRIPT : STAGE_SCRIPT) &&
            tres.cpu === "1" &&
            tres.node === "1" &&
            !/gpu/i.test(get("ReqTRES")) &&
            mem &&
            Number(mem[1]) * { K: 1 / 1024, M: 1, G: 1024, T: 1048576 }[mem[2]] === req.memoryMiB &&
            time &&
            Number(time[1] ?? 0) * 1440 + Number(time[2]) * 60 + Number(time[3]) + Number(time[4]) / 60 ===
                req.timeMinutes,
        "held scheduler resources/identity",
    );
}
export function prepareRelease(folder, label, receipt, text) {
    requireTrue(["worker", "finalizer"].includes(label), "release label");
    const file = path.join(folder, label + "-initial-scheduler.txt");
    writeExclusive(file, text);
    validateHeldJob(text, receipt.jobId, receipt.stage);
    writeExclusive(
        path.join(folder, label, "READY.json"),
        encode({
            kind: "strategic-s1-ready-v1",
            stage: receipt.stage,
            jobId: receipt.jobId,
            passed: true,
            receipt: fileIdentity(path.join(folder, label, "receipt.json")),
            initialScheduler: fileIdentity(file),
        }),
    );
}
export function verifySubmission(stage, source, runtime, scheduler, root = SUBMISSIONS) {
    const phase = ["case", "finalize"].includes(stage) ? "main" : stage === "canary-finalize" ? "canary" : stage;
    const final = ["finalize", "canary-finalize"].includes(stage),
        folder = path.join(root, phase);
    const load = (file) => json(confinedFile(file, root));
    const freeze = load(path.join(folder, "freeze.json"));
    fields(freeze, ["source", "runtime", "environment", "sourceBound"]);
    requireTrue(freeze.sourceBound === true, "submission freeze");
    exact(freeze.source, source, "submitted source");
    exact(freeze.runtime, runtime, "submitted runtime");
    const directory = path.join(folder, final ? "finalizer" : "worker"),
        file = path.join(directory, "receipt.json"),
        receipt = load(file);
    fields(receipt, ["kind", "stage", "jobId", "sourceCommit", "intent", "response"]);
    const ready = load(path.join(directory, "READY.json"));
    fields(ready, ["kind", "stage", "jobId", "passed", "receipt", "initialScheduler"]);
    requireTrue(
        ready.kind === "strategic-s1-ready-v1" &&
            ready.stage === stage &&
            ready.jobId === receipt.jobId &&
            ready.passed === true,
        "held readiness receipt",
    );
    exact(ready.receipt, fileIdentity(file), "ready submission binding");
    exact(
        ready.initialScheduler.path,
        path.join(folder, (final ? "finalizer" : "worker") + "-initial-scheduler.txt"),
        "initial scheduler path",
    );
    confinedFile(ready.initialScheduler.path, root);
    regularIdentity(ready.initialScheduler);
    validateHeldJob(fs.readFileSync(ready.initialScheduler.path, "utf8"), receipt.jobId, stage);
    requireTrue(
        receipt.kind === "strategic-s1-submission-v1" &&
            receipt.stage === stage &&
            receipt.sourceCommit === source.sourceCommit &&
            receipt.jobId === (["case", "canary"].includes(stage) ? scheduler.arrayJobId : scheduler.jobId),
        "own submission identity",
    );
    for (const [key, name] of [
        ["intent", "intent.json"],
        ["response", "response.json"],
    ]) {
        exact(receipt[key].path, path.join(directory, name), "submission record path");
        confinedFile(receipt[key].path, root);
        regularIdentity(receipt[key]);
    }
    const response = load(receipt.response.path);
    fields(response, ["status", "signal", "stdout", "stderr", "error"]);
    requireTrue(
        response.status === 0 &&
            response.signal === null &&
            response.error === null &&
            response.stdout.trim() === receipt.jobId,
        "submitted response",
    );
    const intent = load(receipt.intent.path);
    fields(intent, ["kind", "stage", "createdAt", "cwd", "sourceCommit", "request", "args", "wrapper", "program"]);
    requireTrue(
        intent.kind === "strategic-s1-submission-intent-v1" &&
            intent.stage === stage &&
            intent.cwd === REPO &&
            intent.sourceCommit === source.sourceCommit &&
            Number.isFinite(Date.parse(intent.createdAt)),
        "submitted intent",
    );
    exact(intent.request, requestFor(stage), "submitted resources");
    const worker = final ? load(path.join(folder, "worker/receipt.json")) : null,
        arrayJobId = worker?.jobId ?? null;
    exact(intent.args, submissionArguments(stage, freeze.environment, arrayJobId), "submitted complete argv");
    exact(intent.wrapper, fileIdentity(stage === "pure" ? PURE_SCRIPT : STAGE_SCRIPT), "submitted wrapper");
    exact(intent.program, fileIdentity(stage === "pure" ? PURE_PROGRAM : PROGRAM), "submitted program");
    requireTrue(
        freeze.environment.SOURCE_COMMIT === source.sourceCommit &&
            freeze.environment.PROGRAM_SHA256 === source.programSha256 &&
            freeze.environment.SCRIPT_SHA256 === source.scriptSha256 &&
            freeze.environment.PROTOCOL_SHA256 === source.protocolSha256,
        "submitted source fields",
    );
    for (const name of prerequisiteNames) {
        requireTrue(process.env[name] === freeze.environment[name], "submitted prerequisite export " + name);
    }
    if (final) requireTrue(process.env.ARRAY_JOB_ID === arrayJobId, "submitted dependency export");
    return fileIdentity(file);
}
export function releaseHeld(
    folder,
    jobIds,
    invoke = (exe, args) => spawnSync(exe, args, { encoding: "utf8", env: cleanSubmitEnvironment() }),
) {
    for (const jobId of jobIds) {
        requireTrue(/^\d+$/.test(jobId), "release identity");
        writeExclusive(
            path.join(folder, "release-" + jobId + "-intent.json"),
            encode({ jobId, action: "release", heldUntilReceiptsDurable: true }),
        );
        let r;
        try {
            r = invoke("/opt/slurm/current/bin/scontrol", ["release", jobId]);
        } catch (error) {
            r = { status: null, signal: null, stdout: "", stderr: "", error };
        }
        writeExclusive(
            path.join(folder, "release-" + jobId + "-response.json"),
            encode({
                status: r.status,
                signal: r.signal ?? null,
                stdout: r.stdout ?? "",
                stderr: r.stderr ?? "",
                error: r.error?.message ?? null,
            }),
        );
        requireTrue(r.status === 0 && !r.signal && !r.error, "release uncertain; reconcile held job, do not resubmit");
    }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))
    main().catch((e) => {
        console.error(e.message);
        process.exitCode = 1;
    });
