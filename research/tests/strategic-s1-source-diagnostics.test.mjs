import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {STUDY, REPO, encode, exact, fileHash, hash} from "../runtime/strategic-s1-io.mjs";
import {
    SOURCE_DIAGNOSTICS_ROOT, MAX_SOURCE_DIAGNOSTIC_BYTES, makeSourceDiagnostic,
    publishSourceDiagnostic, preserveSourceMismatch, sourceMismatchFailureFields,
} from "../runtime/strategic-s1-source-diagnostics.mjs";
import {verifySubmission} from "../scripts/submit-strategic-s1.mjs";
const fixtureBase = process.env.S1_TEST_ROOT ?? path.join(STUDY, "development");
assert.ok(path.resolve(fixtureBase).startsWith(STUDY + "/"));
fs.mkdirSync(fixtureBase, {recursive: true});
const base = fs.mkdtempSync(path.join(fixtureBase, "source-diagnostic-fixtures-"));
const H = "a".repeat(64);
const file = {path: path.join(REPO, "package.json"), bytes: 100, sha256: H};
const tree = (root) => ({root, files: 1, bytes: 100, sha256: H});
const source = () => ({
    sourceCommit: "a".repeat(40), programSha256: H, scriptSha256: H, protocolSha256: H,
    configuration: {
        cwd: REPO, aiIniOverride: null,
        aiIniCandidates: [null, {present: true, ...file}, {path: path.join(REPO, "data/ai.ini"), present: false}],
        configuredGameApiPath: path.join(REPO, "packages/chronodivide-bot-driver/node_modules/@chronodivide/game-api/dist/index.js"),
        participantNames: ["OD1Candidate", "OD1Opponent"], participantRngIdentities: ["candidate", "opponent"],
        observationMode: "api_full_state", arbiterEnabled: false,
    },
    files: [{...file}],
    driverTree: tree(path.join(REPO, "packages/chronodivide-bot-driver/dist")),
    candidateTree: tree(path.join(REPO, "packages/chronodivide-bot/dist")),
});
const scheduler = (stage = "case", id = "123") => ({
    jobId: id, arrayJobId: stage === "case" || stage === "canary" ? "100" : null,
    arrayTaskId: stage === "case" ? "13" : stage === "canary" ? "0" : null,
    account: "pi_jss233", partition: "day", cpus: 1, restarts: 0,
});
function setup(expected, stage = "case") {
    const root = fs.mkdtempSync(path.join(base, "submission-"));
    const folder = path.join(root, stage === "case" ? "main" : stage);
    fs.mkdirSync(folder);
    fs.writeFileSync(path.join(folder, "freeze.json"), encode({source: expected, runtime: {}, environment: {}, sourceBound: true}), {flag: "wx"});
    return root;
}
function reject(expected, actual, root = setup(expected), stage = "case", s = scheduler(stage)) {
    let error;
    try { verifySubmission(stage, actual, {}, s, root); } catch (e) { error = e; }
    assert.equal(error?.message, "S1 submitted source drifted");
    assert.equal(hash(error.message), "e3e486c0e145054faa20762301bf43217ddbbb245ad3d8ed211dbe4366b4bdf0");
    return error;
}
test("S1 A4 source equality writes no diagnostic and no execution artifact", () => {
    const expected = source(), root = setup(expected, "prepare");
    assert.throws(() => verifySubmission("prepare", structuredClone(expected), {}, scheduler("prepare"), root), /ENOENT/);
    assert.ok(!fs.existsSync(path.join(root, "startup-source-diagnostics-v1")));
    assert.ok(!fs.existsSync(path.join(root, "execution-v1")));
    assert.equal(SOURCE_DIAGNOSTICS_ROOT, path.join(STUDY, "startup-source-diagnostics-v1"));
});
test("S1 A4 every source component rejects while retaining exact immutable expected/actual metadata", () => {
    const mutations = {
        sourceCommit: (v) => v.sourceCommit = "b".repeat(40),
        programSha256: (v) => v.programSha256 = "b".repeat(64),
        scriptSha256: (v) => v.scriptSha256 = "b".repeat(64),
        protocolSha256: (v) => v.protocolSha256 = "b".repeat(64),
        configuration: (v) => v.configuration.arbiterEnabled = true,
        files: (v) => v.files[0].bytes++,
        driverTree: (v) => v.driverTree.sha256 = "b".repeat(64),
        candidateTree: (v) => v.candidateTree.files++,
    };
    for (const [component, mutate] of Object.entries(mutations)) {
        const expected = source(), actual = structuredClone(expected); mutate(actual);
        const before = [JSON.stringify(expected), JSON.stringify(actual)];
        const error = reject(expected, actual);
        assert.ok(error.startupSourceDiagnostic); assert.ok(!error.startupSourceDiagnosticFailure);
        const d = error.startupSourceDiagnostic, r = JSON.parse(fs.readFileSync(d.path));
        assert.equal(d.bytes, fs.statSync(d.path).size); assert.equal(d.sha256, fileHash(d.path));
        assert.equal(r.expectedSerialized, before[0]); assert.equal(r.actualSerialized, before[1]);
        assert.deepEqual([JSON.stringify(expected), JSON.stringify(actual)], before);
        assert.deepEqual(r.expected, expected); assert.deepEqual(r.actual, actual);
        assert.equal(r.expectedSerializedIdentity.sha256, hash(before[0]));
        assert.equal(r.actualSerializedIdentity.sha256, hash(before[1]));
        assert.ok(r.changedComponents.includes(component)); assert.ok(r.differences.some((v) => v.path.startsWith("/" + component)));
        assert.equal(r.accepted, false); assert.equal(r.initializerEntered, false); assert.equal(r.stage, "case");
        assert.deepEqual(r.scheduler, scheduler());
        assert.deepEqual(sourceMismatchFailureFields(error), {startupSourceDiagnostic: d});
    }
});
test("S1 A4 top-level and nested JSON key-order drift remains rejected, not canonicalized", () => {
    const expected = source();
    for (const reorder of [
        (v) => Object.fromEntries(Object.entries(v).reverse()),
        (v) => ({...v, configuration: Object.fromEntries(Object.entries(v.configuration).reverse())}),
        (v) => ({...v, files: [Object.fromEntries(Object.entries(v.files[0]).reverse())]}),
    ]) {
        const actual = reorder(structuredClone(expected));
        assert.throws(() => exact(expected, actual, "submitted source"), /submitted source drifted/);
        const error = reject(expected, actual), r = JSON.parse(fs.readFileSync(error.startupSourceDiagnostic.path));
        assert.equal(r.actualSerialized, JSON.stringify(actual));
        assert.ok(r.differences.some((d) => d.kind === "ordered-keys"));
        assert.deepEqual(r.actualOrderedKeys, Object.keys(actual));
        assert.ok(r.changedComponents.length > 0);
    }
});
test("S1 A4 diagnostic publication is exclusive and confined with no symlink/traversal", () => {
    const expected = source(), actual = {...expected, sourceCommit: "b".repeat(40)};
    const root = path.join(fs.mkdtempSync(path.join(base, "exclusive-")), "diagnostics");
    const d = publishSourceDiagnostic(expected, actual, "case", scheduler(), root), original = fs.readFileSync(d.path);
    assert.throws(() => publishSourceDiagnostic(expected, actual, "case", scheduler(), root), /EEXIST/);
    assert.deepEqual(fs.readFileSync(d.path), original);
    const symlinkRoot = fs.mkdtempSync(path.join(base, "symlink-"));
    fs.symlinkSync(root, path.join(symlinkRoot, "link"));
    for (const bad of [path.join(symlinkRoot, "link", "nested"), STUDY + "/../escape", path.join(STUDY, "execution-v1"), path.join(STUDY, "execution-v1/diagnostics")])
        assert.throws(() => publishSourceDiagnostic(expected, actual, "case", scheduler(), bad));
    assert.throws(() => publishSourceDiagnostic(expected, actual, "../case", scheduler(), root));
    assert.throws(() => publishSourceDiagnostic(expected, actual, "case", {...scheduler(), arrayTaskId: "200"}, root));
});
test("S1 A4 publication failure retains the original rejection plus hashed capture failure", () => {
    const expected = source(), actual = {...expected, sourceCommit: "b".repeat(40)}, root = setup(expected);
    const diagnosticRoot = path.join(root, "startup-source-diagnostics-v1");
    fs.mkdirSync(path.join(diagnosticRoot, "case", "job-123__task-13"), {recursive: true});
    const error = reject(expected, actual, root);
    assert.ok(!error.startupSourceDiagnostic);
    assert.equal(error.startupSourceDiagnosticFailure.errorType, "Error");
    assert.match(error.startupSourceDiagnosticFailure.errorMessageSha256, /^[0-9a-f]{64}$/);
    assert.deepEqual(sourceMismatchFailureFields(error), {startupSourceDiagnosticFailure: error.startupSourceDiagnosticFailure});
    assert.deepEqual(fs.readdirSync(path.join(diagnosticRoot, "case", "job-123__task-13")), []);
    const e = new Error("S1 submitted source drifted");
    assert.equal(preserveSourceMismatch(e, expected, actual, "case", scheduler(), STUDY + "/../escape"), e);
    assert.ok(e.startupSourceDiagnosticFailure);
});
test("S1 A4 metadata allowlist and 8MiB bound reject lossy/private/oversized inputs without truncation", () => {
    const expected = source();
    for (const mutate of [
        (v) => v.game = {winner: "private"},
        (v) => v.configuration.credential = "private",
        (v) => v.files[0].bytes = NaN,
        (v) => Object.defineProperty(v, "files", {get() {throw Error("must not invoke");}, enumerable: true}),
        (v) => v.configuration.aiIniCandidates.push(v),
    ]) {
        const actual = source(); mutate(actual);
        assert.throws(() => makeSourceDiagnostic(expected, actual, "case", scheduler()));
    }
    const large = source(); large.files = Array.from({length: 50000}, () => ({...file}));
    const actual = {...large, sourceCommit: "b".repeat(40)};
    assert.equal(MAX_SOURCE_DIAGNOSTIC_BYTES, 8 * 1024 * 1024);
    assert.throws(() => publishSourceDiagnostic(large, actual, "case", scheduler(), path.join(base, "oversized")), /byte limit/);
    assert.ok(!fs.existsSync(path.join(base, "oversized")));
});
test("S1 A4 production mismatch capture precedes stage execution and both generic failures retain its identity", () => {
    const submit = fs.readFileSync(path.join(REPO, "research/scripts/submit-strategic-s1.mjs"), "utf8");
    assert.ok(submit.includes('exact(freeze.source, source, "submitted source");'));
    assert.ok(submit.indexOf("throw preserveSourceMismatch") < submit.indexOf('exact(freeze.runtime, runtime, "submitted runtime")'));
    const runner = fs.readFileSync(path.join(REPO, "research/scripts/strategic-s1.mjs"), "utf8");
    assert.ok(runner.indexOf("verifySubmission(stage, source") < runner.lastIndexOf("await executeS1Stage"));
    assert.ok(runner.includes("...sourceMismatchFailureFields(error)"));
    const pure = fs.readFileSync(path.join(REPO, "research/scripts/strategic-s1-pure.mjs"), "utf8");
    assert.ok(pure.indexOf('verifySubmission("pure"') < pure.indexOf('run("build"'));
    assert.ok(pure.includes('"pure-v3-startup-FAILURE.json"')); assert.ok(pure.includes("sourceMismatchFailureFields(error)"));
    assert.ok(!pure.includes('"pure-startup-FAILURE.json"'));
    assert.ok(!pure.includes('"pure-v2-startup-FAILURE.json"'));
});
