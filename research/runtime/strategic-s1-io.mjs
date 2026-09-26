import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";

export const REPO = "/nfs/roberts/project/pi_jss233/zc362/chrono_divide/strong-chronodivide-bot";
export const PROJECT = path.dirname(REPO);
export const DRIVER = path.join(REPO, "packages/chronodivide-bot-driver");
export const STUDY = path.join(PROJECT, "research-evidence/strategic-diagnostic-s1");
export const EXECUTION = path.join(STUDY, "execution-v1");
export const PROTOCOL_SHA = "952bca278befb716a25551d022fd3954b9ed999be375d8d9baf1253c53dc5b54";
export const SHA = /^[0-9a-f]{64}$/;
export const MAX_MAIN_BYTES = 32 * 1024 * 1024;
// Prospective aggregate engineering bound, not a change to any per-game limit.
// Full synthetic analysis is already 55,109,610 bytes; no frequency/group truncation.
export const MAX_AGGREGATE_BYTES = 384 * 1024 * 1024;
export const STAGES = ["prepare", "canary", "canary-finalize", "smoke", "case", "finalize"];
export const requireTrue = (condition, message) => {
    if (!condition) throw new Error("S1 " + message);
};
export const exact = (a, b, label) => requireTrue(JSON.stringify(a) === JSON.stringify(b), label + " drifted");
export const fields = (x, names, label = "fields") => {
    requireTrue(x && typeof x === "object" && !Array.isArray(x), label);
    exact(Object.keys(x).sort(), names.slice().sort(), label);
};
export const hash = (value) => crypto.createHash("sha256").update(value).digest("hex");
export const fileHash = (file) => {
    const digest = crypto.createHash("sha256"),
        buffer = Buffer.allocUnsafe(1024 * 1024),
        fd = fs.openSync(file, "r");
    try {
        let bytes;
        while ((bytes = fs.readSync(fd, buffer, 0, buffer.length, null)) > 0) digest.update(buffer.subarray(0, bytes));
    } finally {
        fs.closeSync(fd);
    }
    return digest.digest("hex");
};
export const json = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
export const fileIdentity = (file) => ({ path: file, bytes: fs.statSync(file).size, sha256: fileHash(file) });
export const git = (...args) => execFileSync("git", args, { cwd: REPO, encoding: "utf8" }).trim();
export const required = (name) => {
    const value = process.env[name];
    requireTrue(typeof value === "string" && value.length > 0, "missing " + name);
    return value;
};
export const requiredHash = (name) => {
    const value = required(name);
    requireTrue(SHA.test(value), "invalid " + name);
    return value;
};
export function assertJsonValue(value, active = new Set()) {
    if (value === null || typeof value === "string" || typeof value === "boolean") return;
    if (typeof value === "number") {
        requireTrue(Number.isFinite(value), "nonfinite JSON value");
        return;
    }
    requireTrue(value && typeof value === "object" && !active.has(value), "unsupported/circular JSON value");
    requireTrue(
        Array.isArray(value) || [Object.prototype, null].includes(Object.getPrototypeOf(value)),
        "non-plain JSON object",
    );
    requireTrue(Object.getOwnPropertySymbols(value).length === 0, "symbol-keyed JSON object");
    if (Array.isArray(value))
        for (let i = 0; i < value.length; i++) requireTrue(Object.hasOwn(value, i), "sparse JSON array");
    active.add(value);
    for (const child of Object.values(value)) assertJsonValue(child, active);
    active.delete(value);
}
export const encode = (value) => {
    assertJsonValue(value);
    return JSON.stringify(value) + "\n";
};
export const stageLimit = (stage) => {
    requireTrue(STAGES.includes(stage), "stage");
    return stage === "finalize" ? MAX_AGGREGATE_BYTES : MAX_MAIN_BYTES;
};
export function stageDirectory(stage, index = null, root = EXECUTION) {
    requireTrue(STAGES.includes(stage), "stage");
    const array = stage === "case" || stage === "canary",
        count = stage === "case" ? 200 : 4;
    requireTrue(
        array ? Number.isSafeInteger(index) && index >= 0 && index < count : index === null,
        "stage task index",
    );
    const suffix =
        stage === "prepare"
            ? "manifest"
            : stage === "canary-finalize"
            ? "canary-finalizer"
            : stage === "finalize"
            ? "finalizer"
            : array
            ? stage === "case"
                ? "cases/task-" + String(index).padStart(4, "0")
                : "canary/task-" + String(index).padStart(2, "0")
            : "smoke";
    return path.join(path.resolve(root), suffix);
}
export const expectedExecutionFiles = (root = EXECUTION) =>
    [
        stageDirectory("prepare", null, root),
        ...Array.from({ length: 4 }, (_, i) => stageDirectory("canary", i, root)),
        stageDirectory("canary-finalize", null, root),
        stageDirectory("smoke", null, root),
        ...Array.from({ length: 200 }, (_, i) => stageDirectory("case", i, root)),
        stageDirectory("finalize", null, root),
    ]
        .flatMap((d) => [path.join(d, "COMPLETE"), path.join(d, "record.json")])
        .sort();
export function executionFiles(root = EXECUTION) {
    const files = [];
    const walk = (directory) => {
        for (const e of fs.readdirSync(directory, { withFileTypes: true })) {
            const file = path.join(directory, e.name);
            if (e.isDirectory()) walk(file);
            else {
                requireTrue(e.isFile(), "nonregular execution entry");
                files.push(file);
            }
        }
    };
    walk(root);
    return files.sort();
}
const lstatMaybe = (file) => {
    try {
        return fs.lstatSync(file);
    } catch (error) {
        if (error.code === "ENOENT") return null;
        throw error;
    }
};

export function writeExclusive(file, value) {
    const fd = fs.openSync(file, "wx", 0o600);
    try {
        fs.writeFileSync(fd, value);
        fs.fsyncSync(fd);
    } finally {
        fs.closeSync(fd);
    }
}
const append = (file, value) => {
    const fd = fs.openSync(
        file,
        fs.constants.O_WRONLY | fs.constants.O_APPEND | fs.constants.O_CREAT | fs.constants.O_NOFOLLOW,
        0o600,
    );
    try {
        fs.writeFileSync(fd, value);
        fs.fsyncSync(fd);
    } finally {
        fs.closeSync(fd);
    }
};
const MARKER = "COMPLETE_S1_V1 ",
    LAUNCH = "LAUNCH_S1_V1 ";
export function parseLaunchMarker(text, expectedCompletion = null) {
    const lines = text.split("\n");
    requireTrue(lines.pop() === "", "marker newline");
    if (expectedCompletion !== null) requireTrue(lines.pop() === expectedCompletion, "completion marker");
    const seen = new Set();
    return lines.map((line) => {
        requireTrue(line.startsWith(LAUNCH), "launch marker");
        const r = JSON.parse(line.slice(LAUNCH.length));
        fields(r, ["role", "caseIndex", "mode", "requestedEngineSeed", "policy"], "launch schema");
        requireTrue(
            Number.isSafeInteger(r.caseIndex) &&
                r.caseIndex >= 0 &&
                r.caseIndex <= 204 &&
                r.policy === "unchanged_strongbot" &&
                ["zero_update", "canary_endpoint_only", "canary_strategic", "smoke", "diagnostic"].includes(r.mode),
            "launch identity",
        );
        const expectedSeed =
            r.caseIndex < 200
                ? 3350120000 + r.caseIndex
                : r.caseIndex < 204
                ? 3350121000 + r.caseIndex - 200
                : 3350121100;
        const role = r.caseIndex < 200 ? "diagnostic" : r.caseIndex < 204 ? "canary" : "smoke";
        requireTrue(
            r.requestedEngineSeed === expectedSeed &&
                r.role === role &&
                (r.mode === "zero_update" || (role === "canary" ? r.mode.startsWith("canary_") : r.mode === role)),
            "launch seed/role",
        );
        const key = r.caseIndex + "/" + r.mode;
        requireTrue(!seen.has(key), "duplicate launch");
        seen.add(key);
        return r;
    });
}
/** Actual store is canonical. Test roots must remain beneath this durable study root
 * and must not create fake manifest/record.json registrations in the project census. */
export function createS1Store(root = EXECUTION) {
    root = path.resolve(root);
    requireTrue(root.startsWith(STUDY + "/"), "store outside study");
    const location = (stage, index) => {
        const file = stageDirectory(stage, index, root);
        const studyStat = lstatMaybe(STUDY);
        if (studyStat) requireTrue(studyStat.isDirectory() && !studyStat.isSymbolicLink(), "study ancestor");
        requireTrue(path.resolve(file).startsWith(root + "/"), "store path");
        // Reject symlinked existing ancestors, including root. No namespace escapes.
        let current = file;
        while (current.startsWith(STUDY + "/")) {
            const stat = lstatMaybe(current);
            if (stat) requireTrue(stat.isDirectory() && !stat.isSymbolicLink(), "store ancestor");
            current = path.dirname(current);
        }
        return file;
    };
    const checkMarker = (file) => {
        const s = lstatMaybe(file);
        if (s) requireTrue(s.isFile() && !s.isSymbolicLink(), "marker file");
    };
    return {
        root,
        reserve(stage, index = null) {
            const d = location(stage, index);
            fs.mkdirSync(path.dirname(d), { recursive: true, mode: 0o700 });
            fs.mkdirSync(d, { mode: 0o700 });
            return d; // EEXIST is deliberate, even after failure.
        },
        launch(stage, index, value) {
            const d = location(stage, index);
            requireTrue(fs.existsSync(d), "unreserved launch");
            const marker = path.join(d, "COMPLETE");
            checkMarker(marker);
            exact(fs.readdirSync(d).sort(), fs.existsSync(marker) ? ["COMPLETE"] : [], "prelaunch directory");
            const prior = fs.existsSync(marker) ? fs.readFileSync(marker, "utf8") : "";
            parseLaunchMarker(prior + LAUNCH + JSON.stringify(value) + "\n");
            requireTrue(
                !fs.existsSync(path.join(d, "record.json")) && !fs.existsSync(path.join(d, "FAILURE.json")),
                "launch after publication/failure",
            );
            append(marker, LAUNCH + encode(value));
        },
        publish(stage, index, value) {
            requireTrue(
                value?.complete === true && value?.passed === true && value?.stage === stage,
                "publication stage/flags",
            );
            const d = location(stage, index),
                marker = path.join(d, "COMPLETE");
            checkMarker(marker);
            exact(fs.readdirSync(d).sort(), fs.existsSync(marker) ? ["COMPLETE"] : [], "publication files");
            const launches = fs.existsSync(marker) ? parseLaunchMarker(fs.readFileSync(marker, "utf8")) : [];
            exact(launches, value.launches, "durable launch journal");
            const data = encode(value),
                bytes = Buffer.byteLength(data);
            requireTrue(bytes <= stageLimit(stage), "whole artifact byte bound");
            writeExclusive(path.join(d, "record.json"), data);
            append(marker, MARKER + hash(data) + " " + bytes + "\n");
            return { sha256: hash(data), bytes };
        },
        read(stage, index = null, expectedHash = null) {
            const d = location(stage, index),
                marker = path.join(d, "COMPLETE"),
                file = path.join(d, "record.json");
            exact(fs.readdirSync(d).sort(), ["COMPLETE", "record.json"], "published file set");
            checkMarker(marker);
            const s = fs.lstatSync(file);
            requireTrue(
                s.isFile() && !s.isSymbolicLink() && s.size > 0 && s.size <= stageLimit(stage),
                "published file type/size",
            );
            const data = fs.readFileSync(file),
                sha256 = hash(data);
            requireTrue(expectedHash === null || expectedHash === sha256, "published hash");
            const launches = parseLaunchMarker(fs.readFileSync(marker, "utf8"), MARKER + sha256 + " " + data.length);
            const value = JSON.parse(data);
            assertJsonValue(value);
            exact(launches, value.launches, "published journal");
            requireTrue(
                value.complete === true && value.passed === true && value.stage === stage,
                "published stage/flags",
            );
            return { value, sha256, bytes: data.length };
        },
        fail(stage, index, value) {
            const d = location(stage, index);
            requireTrue(value.complete === false && value.passed === false, "failure flags");
            writeExclusive(path.join(d, "FAILURE.json"), encode(value));
        },
    };
}
export const store = createS1Store();
export const requestFor = (stage) => {
    requireTrue(stage === "pure" || STAGES.includes(stage), "scheduler stage");
    return {
        cpus: 1,
        memoryMiB: stage === "finalize" ? 24576 : 8192,
        timeMinutes:
            stage === "pure"
                ? 120
                : stage === "prepare" || stage === "finalize"
                ? 480
                : stage === "canary-finalize"
                ? 60
                : 360,
    };
};
export function schedulerIdentity(stage, env = process.env) {
    const value = {
        jobId: env.SLURM_JOB_ID,
        arrayJobId: env.SLURM_ARRAY_JOB_ID ?? null,
        arrayTaskId: env.SLURM_ARRAY_TASK_ID ?? null,
        account: env.SLURM_JOB_ACCOUNT,
        partition: env.SLURM_JOB_PARTITION,
        cpus: Number(env.SLURM_CPUS_PER_TASK),
        restarts: Number(env.SLURM_RESTART_COUNT ?? 0),
    };
    const r = requestFor(stage);
    requireTrue(
        /^\d+$/.test(value.jobId ?? "") &&
            value.account === "pi_jss233" &&
            value.partition === "day" &&
            value.cpus === 1 &&
            value.restarts === 0 &&
            !env.SLURM_JOB_GPUS &&
            !env.SLURM_GPUS &&
            Number(env.SLURM_MEM_PER_NODE) === r.memoryMiB &&
            Number(env.SLURM_JOB_NUM_NODES) === 1,
        "scheduler resource identity",
    );
    if (stage === "case" || stage === "canary") {
        requireTrue(
            /^\d+$/.test(value.arrayJobId ?? "") && /^(0|[1-9]\d*)$/.test(value.arrayTaskId ?? ""),
            "array identity",
        );
        stageDirectory(stage, Number(value.arrayTaskId));
    } else requireTrue(value.arrayJobId === null && value.arrayTaskId === null, "unexpected array identity");
    return value;
}
export function memoryMiB(text) {
    const match = /^([0-9]+(?:\.[0-9]+)?)([KMGT])([nc])$/.exec(text);
    requireTrue(match !== null, "Slurm memory unit");
    return Number(match[1]) * { K: 1 / 1024, M: 1, G: 1024, T: 1048576 }[match[2]];
}
export function parseSchedulerRows(raw, jobId, stage, taskCount = null) {
    requireTrue(
        /^\d+$/.test(String(jobId)) && (taskCount === null || [4, 200].includes(taskCount)),
        "accounting request",
    );
    requireTrue(taskCount === (stage === "case" ? 200 : stage === "canary" ? 4 : null), "accounting stage population");
    const rows = raw
        .trim()
        .split("\n")
        .filter(Boolean)
        .map((line) => {
            const v = line.trim().split("|");
            requireTrue(v.length === 12, "accounting columns");
            return {
                label: v[0],
                jobId: v[1],
                state: v[2],
                exitCode: v[3],
                account: v[4],
                partition: v[5],
                cpus: Number(v[6]),
                restarts: Number(v[7]),
                elapsedSeconds: Number(v[8]),
                reqMem: v[9],
                timeLimitMinutes: Number(v[10]),
                workDir: v[11],
            };
        });
    const count = taskCount ?? 1,
        r = requestFor(stage);
    requireTrue(
        rows.length === count &&
            new Set(rows.map((v) => v.jobId)).size === count &&
            new Set(rows.map((v) => v.label)).size === count,
        "exact allocation rows",
    );
    const ordered = Array.from({ length: count }, (_, i) =>
        rows.find((v) => v.label === (taskCount === null ? String(jobId) : jobId + "_" + i)),
    );
    for (const v of ordered)
        requireTrue(
            v &&
                /^\d+$/.test(v.jobId) &&
                v.state === "COMPLETED" &&
                v.exitCode === "0:0" &&
                v.account === "pi_jss233" &&
                v.partition === "day" &&
                v.cpus === 1 &&
                v.restarts === 0 &&
                Number.isSafeInteger(v.elapsedSeconds) &&
                v.elapsedSeconds >= 0 &&
                memoryMiB(v.reqMem) === r.memoryMiB &&
                v.timeLimitMinutes === r.timeMinutes &&
                v.workDir === REPO,
            "completed accounting identity",
        );
    return ordered;
}
export const schedulerRows = (jobId, stage, taskCount = null) => {
    requireTrue(/^\d+$/.test(String(jobId)), "scheduler lookup identity");
    return parseSchedulerRows(
        execFileSync(
            "/opt/slurm/current/bin/sacct",
            [
                "-X",
                "-n",
                "-P",
                "-j",
                String(jobId),
                "--format=JobID%64,JobIDRaw,State,ExitCode,Account,Partition,AllocCPUS,Restarts,ElapsedRaw,ReqMem,TimelimitRaw,WorkDir%256",
            ],
            { encoding: "utf8" },
        ),
        String(jobId),
        stage,
        taskCount,
    );
};
export function hashTree(rootValue) {
    const root = path.resolve(rootValue),
        entries = [];
    const visit = (d) => {
        for (const e of fs.readdirSync(d, { withFileTypes: true })) {
            const file = path.join(d, e.name),
                relativePath = path.relative(root, file);
            if (e.isDirectory()) visit(file);
            else if (e.isFile()) entries.push({ relativePath, file, bytes: fs.statSync(file).size, target: null });
            else if (e.isSymbolicLink()) {
                const target = fs.readlinkSync(file);
                entries.push({ relativePath, file, bytes: Buffer.byteLength(target), target });
            } else throw new Error("S1 runtime tree entry");
        }
    };
    visit(root);
    entries.sort((a, b) => Buffer.compare(Buffer.from(a.relativePath), Buffer.from(b.relativePath)));
    const digest = crypto.createHash("sha256");
    for (const e of entries)
        digest
            .update(e.relativePath)
            .update("\0")
            .update(e.target ?? fs.readFileSync(e.file))
            .update("\0");
    return {
        root,
        files: entries.length,
        bytes: entries.reduce((n, e) => n + e.bytes, 0),
        sha256: digest.digest("hex"),
    };
}
