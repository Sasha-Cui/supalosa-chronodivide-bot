import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";

export const REPO = "/nfs/roberts/project/pi_jss233/zc362/chrono_divide/strong-chronodivide-bot";
export const PROJECT = path.dirname(REPO);
export const DRIVER = path.join(REPO, "packages/chronodivide-bot-driver");
export const STUDY = path.join(PROJECT, "research-evidence/unified-intent-arbiter-v2/od1");
export const EXECUTION = path.join(STUDY, "execution-a1");
export const SHA = /^[0-9a-f]{64}$/;
export const MAX_PAIR_BYTES = 32 * 1024 * 1024;
export const hash = (value) => crypto.createHash("sha256").update(value).digest("hex");
export const fileHash = (file) => hash(fs.readFileSync(file));
export const json = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
export const exact = (a, b, label) => {
    if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(label + " drifted");
};
export const required = (name) => {
    const value = process.env[name];
    if (!value) throw new Error("Missing " + name);
    return value;
};
export const requiredHash = (name) => {
    const value = required(name); if (!SHA.test(value)) throw new Error("Invalid " + name); return value;
};
export const git = (...args) => execFileSync("git", args, { cwd: REPO, encoding: "utf8" }).trim();
export const writeExclusive = (file, value) => fs.writeFileSync(file, value, { flag: "wx", mode: 0o600 });
export const fileIdentity = (file) => ({ path: file, bytes: fs.statSync(file).size, sha256: fileHash(file) });
export const schedulerIdentity = () => {
    const value = { jobId: required("SLURM_JOB_ID"), arrayJobId: process.env.SLURM_ARRAY_JOB_ID ?? null,
        arrayTaskId: process.env.SLURM_ARRAY_TASK_ID ?? null, account: required("SLURM_JOB_ACCOUNT"),
        partition: required("SLURM_JOB_PARTITION"), cpus: Number(required("SLURM_CPUS_PER_TASK")),
        restarts: Number(process.env.SLURM_RESTART_COUNT ?? 0) };
    if (!/^\d+$/.test(value.jobId) || value.account !== "pi_jss233" || value.partition !== "day" ||
        value.cpus !== 1 || value.restarts !== 0 || process.env.SLURM_JOB_GPUS || process.env.SLURM_GPUS) {
        throw new Error("OD1 scheduler contract failed");
    }
    return value;
};
export const schedulerRows = (jobId, taskCount = null) => {
    if (!/^\d+$/.test(String(jobId))) throw new Error("Invalid scheduler lookup");
    const raw = execFileSync("/opt/slurm/current/bin/sacct", ["-X", "-n", "-P", "-j", String(jobId),
        "--format=JobID%64,JobIDRaw,State,ExitCode,Account,Partition,AllocCPUS,Restarts,ElapsedRaw"],
        { encoding: "utf8" });
    return parseSchedulerRows(raw, String(jobId), taskCount);
};
export const parseSchedulerRows = (raw, jobId, taskCount) => {
    const rows = raw.trim().split("\n").filter(Boolean).map((line) => {
        const v = line.trim().split("|");
        if (v.length !== 9) throw new Error("OD1 scheduler column count drifted");
        return { label: v[0], jobId: v[1], state: v[2], exitCode: v[3], account: v[4],
            partition: v[5], cpus: Number(v[6]), restarts: Number(v[7]), elapsedSeconds: Number(v[8]) };
    });
    const selected = rows.filter((r) => taskCount === null ? r.label === jobId : r.label.startsWith(jobId + "_"));
    const n = taskCount ?? 1;
    if (!Number.isSafeInteger(n) || n < 1 || selected.length !== n ||
        new Set(selected.map((r) => r.jobId)).size !== n ||
        new Set(selected.map((r) => r.label)).size !== n) throw new Error("OD1 scheduler exact launch count failed");
    for (let i = 0; i < n; i++) {
        const row = selected.find((r) => r.label === (taskCount === null ? jobId : jobId + "_" + i));
        if (!row || !/^\d+$/.test(row.jobId) || row.state !== "COMPLETED" || row.exitCode !== "0:0" ||
            row.account !== "pi_jss233" || row.partition !== "day" || row.cpus !== 1 || row.restarts !== 0 ||
            !Number.isSafeInteger(row.elapsedSeconds) || row.elapsedSeconds < 0) {
            throw new Error("OD1 scheduler completion contract failed");
        }
    }
    return selected.sort((a, b) => taskCount === null ? 0 : Number(a.label.split("_")[1]) - Number(b.label.split("_")[1]));
};
export const hashTree = (rootValue) => {
    const root = path.resolve(rootValue), entries = [];
    const visit = (dir) => {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            const file = path.join(dir, entry.name), relativePath = path.relative(root, file);
            if (entry.isDirectory()) visit(file);
            else if (entry.isFile()) entries.push({ relativePath, file, bytes: fs.statSync(file).size, target: null });
            else if (entry.isSymbolicLink()) {
                const target = fs.readlinkSync(file);
                entries.push({ relativePath, file, bytes: Buffer.byteLength(target), target });
            } else throw new Error("Unsupported runtime tree entry");
        }
    };
    visit(root);
    entries.sort((a, b) => Buffer.compare(Buffer.from(a.relativePath), Buffer.from(b.relativePath)));
    const digest = crypto.createHash("sha256");
    for (const entry of entries) digest.update(entry.relativePath).update("\0")
        .update(entry.target ?? fs.readFileSync(entry.file)).update("\0");
    return { root, files: entries.length, bytes: entries.reduce((s, e) => s + e.bytes, 0), sha256: digest.digest("hex") };
};
export const reserveDirectory = (directory) => {
    if (!directory.startsWith(EXECUTION + "/")) throw new Error("OD1 output outside execution");
    fs.mkdirSync(path.dirname(directory), { recursive: true, mode: 0o700 });
    fs.mkdirSync(directory, { mode: 0o700 }); // EEXIST prevents duplicate/partial replacement.
};
export const recordLaunch = (directory, value) => {
    const marker = path.join(directory, "COMPLETE");
    if (fs.existsSync(marker) && fs.readFileSync(marker, "utf8").includes("COMPLETE_OD1_V1 ")) {
        throw new Error("OD1 launch after completion");
    }
    fs.appendFileSync(marker, "LAUNCH_OD1_V1 " + JSON.stringify(value) + "\n", { mode: 0o600 });
};
export const parseLaunchMarker = (text, expectedCompletion = null) => {
    const lines = text.split("\n");
    if (lines.pop() !== "") throw new Error("OD1 marker missing newline");
    if (expectedCompletion !== null && lines.pop() !== expectedCompletion) throw new Error("OD1 completion marker invalid");
    return lines.map((line) => {
        if (!line.startsWith("LAUNCH_OD1_V1 ")) throw new Error("OD1 launch marker invalid");
        return JSON.parse(line.slice("LAUNCH_OD1_V1 ".length));
    });
};
export const publish = (directory, value, limit = MAX_PAIR_BYTES) => {
    const files = fs.readdirSync(directory);
    if (files.length && JSON.stringify(files) !== JSON.stringify(["COMPLETE"])) {
        throw new Error("OD1 publication directory invalid");
    }
    const marker = path.join(directory, "COMPLETE");
    const launches = fs.existsSync(marker) ? parseLaunchMarker(fs.readFileSync(marker, "utf8")) : [];
    exact(launches, value.launches, "OD1 preserved launch journal");
    const data = JSON.stringify(value) + "\n";
    if (Buffer.byteLength(data) > limit) throw new Error("OD1 complete artifact exceeds byte bound");
    writeExclusive(path.join(directory, "record.json"), data);
    fs.appendFileSync(marker, "COMPLETE_OD1_V1 " + hash(data) + " " + Buffer.byteLength(data) + "\n", { mode: 0o600 });
    return { sha256: hash(data), bytes: Buffer.byteLength(data) };
};
export const readPublished = (directory, expectedHash = null, limit = MAX_PAIR_BYTES) => {
    exact(fs.readdirSync(directory).sort(), ["COMPLETE", "record.json"], "OD1 artifact files");
    const file = path.join(directory, "record.json"), stat = fs.lstatSync(file);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size > limit) throw new Error("OD1 artifact file type/size invalid");
    const data = fs.readFileSync(file), sha256 = hash(data);
    const launches = parseLaunchMarker(fs.readFileSync(path.join(directory, "COMPLETE"), "utf8"),
        "COMPLETE_OD1_V1 " + sha256 + " " + data.length);
    if (expectedHash !== null && expectedHash !== sha256) throw new Error("OD1 artifact checksum invalid");
    const value = JSON.parse(data);
    exact(launches, value.launches, "OD1 completed launch journal");
    return { value, sha256, bytes: data.length };
};
export const technicalOnly = (value) => {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) { value.forEach(technicalOnly); return; }
    for (const [key, child] of Object.entries(value)) {
        if (/winner|outcome|score|endpoint|defeated|terminal|inventory|credit|damage|rank|buildingcount|remainingbuilding|actioncontents|statecontents/i.test(key)) {
            throw new Error("OD1 prohibited technical field");
        }
        technicalOnly(child);
    }
};
export const countFiles = (directory) => fs.readdirSync(directory, { withFileTypes: true })
    .reduce((n, e) => n + (e.isDirectory() ? countFiles(path.join(directory, e.name)) : 1), 0);

/** Shared by the real selector and synthetic tests; names describe registrations, not game inventory. */
export const buildOD1RegistrationAudit = ({
    certificate, registrationRoot, registrationAfterUtc, records, supportingMetadata, proposedSeeds, abandonedSelector,
}) => {
    if (proposedSeeds.length !== 905 || new Set(proposedSeeds).size !== 905 ||
        proposedSeeds.some((s) => !Number.isSafeInteger(s) || s < 3350000000 || s >= 3351000000) ||
        records.some((r) => r.collisions !== 0) || abandonedSelector.zeroUpdateInitializations !== 905 ||
        abandonedSelector.advancingEpisodes !== 0) throw new Error("OD1 A1 registration audit contract failed");
    const value = {
        complete: true, passed: true, technicalOnly: true, certificate,
        registrationRoot, registrationAfterUtc, inspectedRegistrationFiles: records, supportingMetadata,
        abandonedSelector,
        newSeeds: { count: 905, min: Math.min(...proposedSeeds), max: Math.max(...proposedSeeds),
            sha256: hash(JSON.stringify(proposedSeeds)) },
        collisions: 0,
        scope: "Registration metadata and abandoned zero-update journal only; no gameplay payload opened.",
    };
    technicalOnly(value);
    return value;
};
export const buildOD1PreparationEnvelope = (header) => {
    const value = { ...header, gameModes: {}, observations: [] };
    technicalOnly(value);
    return value;
};
