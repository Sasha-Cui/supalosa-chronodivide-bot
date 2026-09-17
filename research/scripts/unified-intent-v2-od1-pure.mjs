#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const PROGRAM = fileURLToPath(import.meta.url);
const REPO = path.resolve(path.dirname(PROGRAM), "../..");
const DRIVER = path.join(REPO, "packages/chronodivide-bot-driver");
const ROOT = path.join(path.dirname(REPO), "research-evidence/unified-intent-arbiter-v2/od1");
const hash = (value) => crypto.createHash("sha256").update(value).digest("hex");
const fileHash = (file) => hash(fs.readFileSync(file));
const git = (...args) => execFileSync("git", args, { cwd: REPO, encoding: "utf8" }).trim();
const required = (name) => {
    if (!process.env[name]) throw new Error("Missing " + name);
    return process.env[name];
};
const source = required("SOURCE_COMMIT");
const programHash = required("PROGRAM_SHA256");
const scriptHash = required("SCRIPT_SHA256");
const out = path.resolve(required("OUT_DIR"));
const assertSource = () => {
    if (process.version !== "v20.13.1" || git("branch", "--show-current") !== "main" ||
        git("rev-parse", "HEAD") !== source || git("rev-parse", "fork/main") !== source ||
        git("status", "--porcelain=v1") !== "" || fileHash(PROGRAM) !== programHash ||
        fileHash(path.join(REPO, "research/slurm/unified_intent_v2_od1_pure.sbatch")) !== scriptHash) {
        throw new Error("OD1 pure source identity drifted");
    }
};
assertSource();
if (!out.startsWith(ROOT + "/") || fs.existsSync(out) || process.env.SLURM_JOB_ACCOUNT !== "pi_jss233" ||
    process.env.SLURM_JOB_PARTITION !== "day" || Number(process.env.SLURM_CPUS_PER_TASK) !== 1 ||
    Number(process.env.SLURM_RESTART_COUNT ?? 0) !== 0) throw new Error("OD1 pure scheduler/output invalid");
fs.mkdirSync(out, { recursive: true, mode: 0o700 });
const exclusive = (name, value) => fs.writeFileSync(path.join(out, name), value, { flag: "wx", mode: 0o600 });
exclusive("STARTED.json", JSON.stringify({ source, programHash, scriptHash, jobId: required("SLURM_JOB_ID") }) + "\n");
const names = [
    "unifiedIntentArbiter", "unifiedIntentActionBoundary", "unifiedIntentSourceInventory", "researchFlags",
    "buildingEliminationMission", "symmetricObservationFirewall", "unifiedIntentGate3Plan",
    "unifiedIntentGate3Telemetry", "unifiedIntentGate3DiagnosticPlan", "unifiedIntentGate3B1Plan",
    "unifiedIntentM2Plan", "unifiedIntentM2Telemetry", "unifiedIntentM2Analysis",
    "literalBuildingEliminationEndpoint", "unifiedIntentM2C1Plan", "unifiedIntentV2Gate2Plan",
    "unifiedIntentV2Telemetry", "unifiedIntentV2OD1Plan", "embeddedFreshDualLedger",
    "unifiedIntentV2OD1Episode", "freshDualEndpointLedger", "liveOwnedBuildingEliminationEndpointV6",
    "liveOwnedBuildingSnapshotCandidate", "passiveDualBuildingEndpoint", "freshDualStudyInstrumentation",
];
const testFiles = names.map((name) => "src/test/" + name + ".test.ts");
try {
    const build = execFileSync(path.join(REPO, "node_modules/.bin/tsc"), ["--build"], { cwd: REPO, encoding: "utf8" });
    exclusive("build.log", build);
    const report = path.join(out, "vitest.json");
    const log = execFileSync(path.join(DRIVER, "node_modules/.bin/vitest"), [
        "run", "--maxWorkers=1", "--reporter=json", "--outputFile=" + report, ...testFiles,
    ], { cwd: DRIVER, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
    exclusive("vitest.log", log);
    const results = JSON.parse(fs.readFileSync(report, "utf8"));
    if (!results.success || results.testResults.length !== 25 || results.numTotalTests !== 208 ||
        results.numPassedTests !== 208 || results.numFailedTests !== 0 || results.numPendingTests !== 0 ||
        results.numTodoTests !== 0) throw new Error("OD1 pure test population or results failed");
    const runtimeTest = path.join(REPO, "research/tests/unified-intent-gate2-runtime-schema.test.mjs");
    const runtime = execFileSync(process.execPath, ["--test", runtimeTest], { cwd: REPO, encoding: "utf8" });
    exclusive("runtime.log", runtime);
    if (!/^# pass 1$/m.test(runtime) || !/^# fail 0$/m.test(runtime)) throw new Error("OD1 runtime test failed");
    assertSource();
    const artifact = {
        kind: "unified-intent-v2-od1-pure-v1", complete: true, passed: true,
        technicalOnly: true, sourceCommit: source, programSha256: programHash, scriptSha256: scriptHash,
        tests: { build: true, files: 25, passed: 208, runtimePassed: 1,
            testFiles: testFiles.map((relativePath) => ({ relativePath,
                sha256: fileHash(path.join(DRIVER, relativePath)) })),
            reportSha256: fileHash(report), runtimeTestSha256: fileHash(runtimeTest), runtimeLogSha256: hash(runtime) },
        scheduler: { jobId: required("SLURM_JOB_ID"), account: "pi_jss233", partition: "day", cpus: 1, restarts: 0 },
        scope: "Pure and synthetic only. Does not authorize competitive launch before selector/canary/smoke.",
    };
    const data = JSON.stringify(artifact, null, 2) + "\n";
    exclusive("pure.json", data);
    exclusive("COMPLETE", "COMPLETE_UNIFIED_INTENT_V2_OD1_PURE_V1 " + hash(data) + " " + Buffer.byteLength(data) + "\n");
    console.log(JSON.stringify({ complete: true, tests: 209, sha256: hash(data) }));
} catch (error) {
    exclusive("FAILED.json", JSON.stringify({ complete: false, sourceCommit: source,
        jobId: process.env.SLURM_JOB_ID, message: String(error.message),
        stdout: error.stdout?.toString(), stderr: error.stderr?.toString() }) + "\n");
    throw error;
}
