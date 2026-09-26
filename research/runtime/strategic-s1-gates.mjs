import fs from "node:fs";
import path from "node:path";
import {
    REPO,
    DRIVER,
    STUDY,
    PROTOCOL_SHA,
    SHA,
    hash,
    fileHash,
    fileIdentity,
    json,
    fields,
    exact,
    requireTrue,
    schedulerRows,
} from "./strategic-s1-io.mjs";
import { PURE_PROGRAM, PURE_SCRIPT } from "./strategic-s1-provenance.mjs";
import { VITEST_NAMES, VITEST_PASSED, NODE_TESTS, NODE_PASSED, TOTAL_PASSED } from "./strategic-s1-tests.mjs";
import { descriptor, validateScheduler, stageRequest } from "./strategic-s1-stages.mjs";
export const PURE_DIRECTORY = path.join(STUDY, "pure-v1");
export const PURE_PATH = path.join(PURE_DIRECTORY, "pure.json");
export const VERIFICATION_SCOPES = {
    pure: "independent-pure-metadata",
    prepare: "independent-selector-metadata",
    "canary-finalize": "source-bound-discarded-canary",
    smoke: "source-bound-discarded-smoke",
};
export function artifactInventory(root) {
    const values = [];
    const visit = (d) => {
        for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
            const file = path.join(d, entry.name);
            if (entry.isDirectory()) visit(file);
            else if (entry.isFile()) values.push(fileIdentity(file));
            else if (entry.isSymbolicLink())
                values.push({ path: file, type: "synthetic-symlink-fixture", target: fs.readlinkSync(file) });
            else throw new Error("S1 unsupported pure artifact");
        }
    };
    visit(root);
    return values.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
}
export function validateVitestReport(r) {
    exact(
        r.testResults.map((t) => t.name).sort(),
        VITEST_NAMES.map((n) => path.join(DRIVER, "src/test/" + n + ".test.ts")).sort(),
        "pure Vitest filenames",
    );
    requireTrue(
        r.success === true &&
            r.testResults.length === VITEST_NAMES.length &&
            r.numTotalTests === VITEST_PASSED &&
            r.numPassedTests === VITEST_PASSED &&
            r.numFailedTests === 0 &&
            r.numPendingTests === 0 &&
            r.numTodoTests === 0,
        "pure Vitest population",
    );
    requireTrue(
        r.testResults.every((t) => t.status === "passed" && t.assertionResults.every((a) => a.status === "passed")) &&
            r.testResults.reduce((n, t) => n + t.assertionResults.length, 0) === VITEST_PASSED,
        "every pure assertion",
    );
}
export function validateNodeLog(log, count) {
    for (const [key, n] of [
        ["pass", count],
        ["fail", 0],
        ["cancelled", 0],
        ["skipped", 0],
        ["todo", 0],
    ]) {
        requireTrue(new RegExp("^# " + key + " " + n + "$", "m").test(log), "Node " + key);
    }
}
export function confinedFile(file, root) {
    requireTrue(path.resolve(file) === file && file.startsWith(path.resolve(root) + "/"), "canonical confined file");
    let current = file;
    while (current !== path.dirname(root)) {
        requireTrue(!fs.lstatSync(current).isSymbolicLink(), "symlinked artifact ancestor");
        current = path.dirname(current);
    }
    requireTrue(fs.lstatSync(file).isFile(), "regular confined file");
    return file;
}
export const regularIdentity = (d) => {
    descriptor(d);
    const stat = fs.lstatSync(d.path);
    requireTrue(stat.isFile() && !stat.isSymbolicLink(), "regular artifact required");
    exact(fileIdentity(d.path), d, "artifact identity");
};
export function readPure(source, runtime, { accounting = true } = {}) {
    confinedFile(PURE_PATH, PURE_DIRECTORY);
    confinedFile(path.join(PURE_DIRECTORY, "COMPLETE"), PURE_DIRECTORY);
    const stat = fs.lstatSync(PURE_PATH);
    requireTrue(stat.isFile() && !stat.isSymbolicLink() && stat.size < 16 * 1024 * 1024, "pure record");
    const raw = fs.readFileSync(PURE_PATH),
        sha256 = hash(raw),
        v = JSON.parse(raw);
    exact(
        fs.readFileSync(path.join(PURE_DIRECTORY, "COMPLETE"), "utf8"),
        "COMPLETE_S1_PURE_V1 " + sha256 + " " + raw.length + "\n",
        "pure completion",
    );
    fields(v, [
        "kind",
        "stage",
        "complete",
        "passed",
        "technicalOnly",
        "source",
        "runtime",
        "scheduler",
        "request",
        "tests",
        "artifacts",
    ]);
    requireTrue(
        v.kind === "strategic-s1-pure-v1" &&
            v.stage === "pure" &&
            v.complete === true &&
            v.passed === true &&
            v.technicalOnly === true,
        "pure flags",
    );
    fields(v.source, Object.keys(source), "pure source fields");
    requireTrue(
        v.source.sourceCommit === source.sourceCommit &&
            v.source.protocolSha256 === PROTOCOL_SHA &&
            v.source.programSha256 === fileHash(PURE_PROGRAM) &&
            v.source.scriptSha256 === fileHash(PURE_SCRIPT),
        "pure source",
    );
    for (const key of ["configuration", "files", "driverTree", "candidateTree"])
        exact(v.source[key], source[key], "pure postbuild " + key);
    exact(v.runtime, runtime, "pure runtime");
    validateScheduler(v.scheduler, "pure");
    exact(v.request, stageRequest("pure"), "pure request");
    fields(v.tests, ["vitestFiles", "vitestPassed", "nodePassed", "totalPassed", "report", "build", "nodeRuns"]);
    requireTrue(
        v.tests.vitestFiles === VITEST_NAMES.length &&
            v.tests.vitestPassed === VITEST_PASSED &&
            v.tests.nodePassed === NODE_PASSED &&
            v.tests.totalPassed === TOTAL_PASSED &&
            v.tests.nodeRuns.length === NODE_TESTS.length,
        "pure counts",
    );
    const expectedFiles = artifactInventory(PURE_DIRECTORY).filter(
        (d) => !["pure.json", "COMPLETE"].includes(path.relative(PURE_DIRECTORY, d.path)),
    );
    exact(v.artifacts, expectedFiles, "all preserved pure artifacts");
    exact(v.tests.report.path, path.join(PURE_DIRECTORY, "vitest.json"), "pure report path");
    exact(v.tests.build.path, path.join(PURE_DIRECTORY, "build-run.json"), "pure build path");
    confinedFile(v.tests.report.path, PURE_DIRECTORY);
    confinedFile(v.tests.build.path, PURE_DIRECTORY);
    regularIdentity(v.tests.report);
    regularIdentity(v.tests.build);
    validateVitestReport(json(v.tests.report.path));
    for (const file of [v.tests.build.path, path.join(PURE_DIRECTORY, "vitest-run.json")]) {
        confinedFile(file, PURE_DIRECTORY);
        const run = json(file);
        requireTrue(run.status === 0 && run.signal === null && run.error === null, "pure build/Vitest process");
    }
    for (const [i, run] of v.tests.nodeRuns.entries()) {
        fields(run, ["name", "passed", "test", "log"]);
        exact([run.name, run.passed], NODE_TESTS[i], "pure Node test identity");
        exact(run.test.path, path.join(REPO, "research/tests/" + run.name + ".test.mjs"), "test path");
        exact(run.log.path, path.join(PURE_DIRECTORY, run.name + "-run.json"), "test log path");
        confinedFile(run.test.path, REPO);
        confinedFile(run.log.path, PURE_DIRECTORY);
        regularIdentity(run.test);
        regularIdentity(run.log);
        const output = json(run.log.path);
        requireTrue(output.status === 0 && output.signal === null, "Node exit");
        validateNodeLog(output.stdout, run.passed);
    }
    if (accounting) schedulerRows(v.scheduler.jobId, "pure");
    return { path: PURE_PATH, bytes: raw.length, sha256, jobId: v.scheduler.jobId };
}
export const verificationPath = (stage, root = STUDY) => {
    requireTrue(Object.hasOwn(VERIFICATION_SCOPES, stage), "verification stage");
    requireTrue(path.resolve(root) === root && (root === STUDY || root.startsWith(STUDY + "/")), "verification root");
    return path.join(root, "verification-" + stage + "-v1.json");
};
/** Independent work is external to production code; this reader verifies its immutable
 * receipt/program/output/accounting bindings, not the scientific independence by assertion. */
export function readVerification(
    stage,
    payload,
    sourceCommit,
    { accounting = true, expectedHash = null, root = STUDY } = {},
) {
    const file = confinedFile(verificationPath(stage, root), root),
        identity = fileIdentity(file);
    requireTrue(expectedHash === null || identity.sha256 === expectedHash, "verification receipt changed");
    const v = json(file);
    fields(v, ["kind", "stage", "complete", "passed", "sourceCommit", "protocolSha256", "scope", "payload", "audit"]);
    requireTrue(
        v.kind === "strategic-s1-stage-verification-v1" &&
            v.stage === stage &&
            v.complete === true &&
            v.passed === true &&
            v.sourceCommit === sourceCommit &&
            v.protocolSha256 === PROTOCOL_SHA &&
            v.scope === VERIFICATION_SCOPES[stage],
        "independent verification receipt",
    );
    exact(v.payload, { path: payload.path, bytes: payload.bytes, sha256: payload.sha256 }, "verified payload");
    fields(v.audit, ["path", "bytes", "sha256", "jobId", "program"]);
    const auditIdentity = { path: v.audit.path, bytes: v.audit.bytes, sha256: v.audit.sha256 };
    requireTrue(
        v.audit.path.startsWith(STUDY + "/") &&
            v.audit.program.path.startsWith(STUDY + "/") &&
            /^\d+$/.test(v.audit.jobId),
        "audit namespace",
    );
    confinedFile(auditIdentity.path, root);
    confinedFile(v.audit.program.path, root);
    regularIdentity(auditIdentity);
    regularIdentity(v.audit.program);
    const program = json(v.audit.program.path);
    fields(program, ["kind", "stage", "files"]);
    requireTrue(
        program.kind === "strategic-s1-independent-program-v1" && program.stage === stage && program.files.length >= 2,
        "audit program",
    );
    requireTrue(
        new Set(program.files.map((f) => f.path)).size === program.files.length &&
            ["audit.mjs", "audit.sbatch"].every((name) => program.files.some((f) => path.basename(f.path) === name)),
        "audit program population",
    );
    for (const f of program.files) {
        confinedFile(f.path, path.dirname(v.audit.program.path));
        regularIdentity(f);
    }
    const audit = json(v.audit.path);
    requireTrue(
        audit.kind === "strategic-s1-independent-audit-v1" &&
            audit.stage === stage &&
            audit.complete === true &&
            audit.passed === true &&
            audit.sourceCommit === sourceCommit &&
            audit.protocolSha256 === PROTOCOL_SHA &&
            audit.payloadSha256 === payload.sha256 &&
            audit.programSha256 === v.audit.program.sha256 &&
            audit.independentMetadataAudit === true &&
            audit.discardedPayloadReplayIndependent === false &&
            audit.scheduler.jobId === v.audit.jobId,
        "audit completion/bindings/scope",
    );
    validateScheduler(audit.scheduler, "pure");
    if (accounting) schedulerRows(v.audit.jobId, "pure");
    return identity;
}
