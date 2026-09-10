#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const PROGRAM = fileURLToPath(import.meta.url);
const REPO = path.resolve(path.dirname(PROGRAM), "../..");
const DRIVER = path.join(REPO, "packages", "chronodivide-bot-driver");
const SHA256 = /^[0-9a-f]{64}$/;
const PROHIBITED = /winner|outcome|score|endpoint|defeated|terminalbuilding|remainingbuilding|buildingcount|rank/i;

const hash = (value) => crypto.createHash("sha256").update(value).digest("hex");
const sha256File = (file) => hash(fs.readFileSync(file));
const git = (...args) => execFileSync("git", args, { cwd: REPO, encoding: "utf8" }).trim();
const required = (name) => {
    const value = process.env[name];
    if (!value) throw new Error("Missing environment value " + name);
    return value;
};
const requiredHash = (name) => {
    const value = required(name);
    if (!SHA256.test(value)) throw new Error("Invalid hash environment value " + name);
    return value;
};
const rejectProhibited = (value) => {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) {
        value.forEach(rejectProhibited);
        return;
    }
    for (const [key, child] of Object.entries(value)) {
        if (PROHIBITED.test(key)) throw new Error("Gate 3 pure artifact prohibited field " + key);
        rejectProhibited(child);
    }
};
const writeExclusive = (file, value) => fs.writeFileSync(file, value, {
    flag: "wx",
    mode: 0o600,
});

const sourceCommit = required("SOURCE_COMMIT");
const programSha256 = requiredHash("PROGRAM_SHA256");
const scriptSha256 = requiredHash("SCRIPT_SHA256");
if (
    process.version !== "v20.13.1" ||
    sha256File(PROGRAM) !== programSha256 ||
    git("branch", "--show-current") !== "main" ||
    git("rev-parse", "HEAD") !== sourceCommit ||
    git("rev-parse", "fork/main") !== sourceCommit ||
    git("status", "--porcelain=v1") !== ""
) throw new Error("Gate 3 pure source identity drifted");

const vitestFiles = [
    "src/test/unifiedIntentArbiter.test.ts",
    "src/test/unifiedIntentActionBoundary.test.ts",
    "src/test/unifiedIntentSourceInventory.test.ts",
    "src/test/researchFlags.test.ts",
    "src/test/buildingEliminationMission.test.ts",
    "src/test/symmetricObservationFirewall.test.ts",
    "src/test/unifiedIntentGate3Plan.test.ts",
    "src/test/unifiedIntentGate3Telemetry.test.ts",
];
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "chrono-intent-g3-pure-"));
let vitest;
let runtimeSchemaLog;
try {
    execFileSync(path.join(REPO, "node_modules", ".bin", "tsc"), ["--build"], {
        cwd: REPO,
        stdio: "pipe",
    });
    const reportPath = path.join(temporary, "vitest.json");
    execFileSync(path.join(DRIVER, "node_modules", ".bin", "vitest"), [
        "run", "--reporter=json", "--outputFile=" + reportPath, ...vitestFiles,
    ], { cwd: DRIVER, stdio: "pipe" });
    vitest = JSON.parse(fs.readFileSync(reportPath, "utf8"));
    if (
        vitest.success !== true ||
        vitest.testResults.length !== 8 ||
        vitest.numTotalTests !== 115 ||
        vitest.numPassedTests !== 115 ||
        vitest.numFailedTests !== 0 ||
        vitest.numPendingTests !== 0 ||
        vitest.numTodoTests !== 0
    ) throw new Error("Gate 3 pure Vitest gate failed");
    runtimeSchemaLog = execFileSync(process.execPath, [
        "--test", path.join(REPO, "research", "tests", "unified-intent-gate2-runtime-schema.test.mjs"),
    ], { cwd: REPO, encoding: "utf8" });
    if (!/^# pass 1$/m.test(runtimeSchemaLog) || !/^# fail 0$/m.test(runtimeSchemaLog)) {
        throw new Error("Gate 3 runtime-schema gate failed");
    }
} finally {
    fs.rmSync(temporary, { recursive: true, force: true });
}

if (
    git("rev-parse", "HEAD") !== sourceCommit ||
    git("rev-parse", "fork/main") !== sourceCommit ||
    git("status", "--porcelain=v1") !== ""
) throw new Error("Gate 3 pure source changed during tests");

const testFiles = Object.fromEntries(vitestFiles.map((relativePath) => [relativePath, {
    sha256: sha256File(path.join(DRIVER, relativePath)),
    bytes: fs.statSync(path.join(DRIVER, relativePath)).size,
}]));
const runtimeSchemaPath = path.join(
    REPO,
    "research",
    "tests",
    "unified-intent-gate2-runtime-schema.test.mjs",
);
const artifact = {
    kind: "unified-intent-gate3-pure-gate-v1",
    complete: true,
    passed: true,
    technicalOnly: true,
    competitiveFieldsAbsent: true,
    sourceCommit,
    programSha256,
    scriptSha256,
    tests: {
        build: { passed: true, command: "tsc --build" },
        vitest: {
            passed: true,
            files: 8,
            tests: 115,
            testFiles,
        },
        runtimeSchema: {
            passed: true,
            tests: 1,
            sha256: sha256File(runtimeSchemaPath),
            logSha256: hash(runtimeSchemaLog),
        },
    },
    scheduler: {
        jobId: process.env.SLURM_JOB_ID,
        account: process.env.SLURM_JOB_ACCOUNT,
        partition: process.env.SLURM_JOB_PARTITION,
        cpus: Number(process.env.SLURM_CPUS_PER_TASK),
    },
};
rejectProhibited(artifact);
if (
    artifact.scheduler.account !== "pi_jss233" ||
    artifact.scheduler.partition !== "day" ||
    artifact.scheduler.cpus !== 1
) throw new Error("Gate 3 pure scheduler identity drifted");
const directory = required("OUT_DIR");
if (fs.existsSync(directory)) throw new Error("Gate 3 pure output already exists");
fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
const file = path.join(directory, "pure-gate.json");
writeExclusive(file, JSON.stringify(artifact, null, 2) + "\n");
writeExclusive(
    path.join(directory, "COMPLETE"),
    "COMPLETE_UNIFIED_INTENT_GATE3_PURE_V1 " + sha256File(file) + " " +
        fs.statSync(file).size + "\n",
);
console.log(JSON.stringify({
    complete: true,
    passed: true,
    files: 8,
    tests: 116,
    pureGateSha256: sha256File(file),
}));
