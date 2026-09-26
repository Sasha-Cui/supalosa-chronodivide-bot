import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
    REPO,
    PROJECT,
    STUDY,
    DRIVER,
    PROTOCOL_SHA,
    encode,
    hash,
    fileHash,
    fileIdentity,
    requestFor,
    stageDirectory,
} from "../runtime/strategic-s1-io.mjs";
import {
    REGISTRATIONS,
    CERT,
    CERT_SHA,
    CERT_AUDIT,
    CERT_AUDIT_SHA,
    GATE2_RECEIPT,
    GATE2_RECEIPT_SHA,
    REGISTRATION_AFTER_UTC,
    permittedRegistrations,
    proposedS1Seeds,
} from "../runtime/strategic-s1-registration.mjs";
import {
    makeBinding,
    stageHeader,
    expectedZeroObservation,
    preparationEnvelope,
    validateStage,
    validateSeedAudit,
    digest,
} from "../runtime/strategic-s1-stages.mjs";
import { expectedLaunches } from "../runtime/strategic-s1-contract.mjs";
import { executeS1Stage, prerequisites, realServices } from "../scripts/strategic-s1.mjs";
import {
    submissionArguments,
    submitOne,
    verifySubmission,
    releaseHeld,
    prepareRelease,
    validateHeldJob,
    cleanSubmitEnvironment,
} from "../scripts/submit-strategic-s1.mjs";
import {
    confinedFile,
    artifactInventory,
    validateVitestReport,
    validateNodeLog,
    readVerification,
    verificationPath,
} from "../runtime/strategic-s1-gates.mjs";
import { PROGRAM, STAGE_SCRIPT, requiredHarnessFiles } from "../runtime/strategic-s1-provenance.mjs";
import { VITEST_NAMES, VITEST_PASSED, NODE_TESTS, TOTAL_PASSED } from "../runtime/strategic-s1-tests.mjs";
import {
    syntheticS1Plan,
    syntheticS1Record,
    syntheticS1Canaries,
    syntheticS1Smoke,
} from "../../packages/chronodivide-bot-driver/dist/test/strategicS1Synthetic.js";
import { analyzeStrategicS1Population } from "../../packages/chronodivide-bot-driver/dist/training/strategicS1Population.js";

const baseRoot = process.env.S1_TEST_ROOT ?? path.join(STUDY, "development");
assert.ok(path.resolve(baseRoot).startsWith(STUDY + "/"));
fs.mkdirSync(baseRoot, { recursive: true });
const base = fs.mkdtempSync(path.join(baseRoot, "harness-fixtures-"));
const clone = (x) => JSON.parse(JSON.stringify(x)),
    H = "a".repeat(64),
    C = "a".repeat(40),
    plan = syntheticS1Plan();
const source = {
    sourceCommit: C,
    protocolSha256: PROTOCOL_SHA,
    programSha256: fileHash(PROGRAM),
    scriptSha256: fileHash(STAGE_SCRIPT),
};
const runtime = { syntheticOnly: true },
    pure = { path: path.join(base, "pure-evidence.json"), bytes: 1, sha256: H, jobId: "9000" };
const scheduler = (stage, index = null) => ({
    jobId: String(index === null ? 9000 : 9100 + index),
    arrayJobId: index === null ? null : "8000",
    arrayTaskId: index === null ? null : String(index),
    account: "pi_jss233",
    partition: "day",
    cpus: 1,
    restarts: 0,
});
const ctx = (stage, index = null) => ({
    source,
    runtime,
    pure,
    plan,
    bindings: makeBinding(source, runtime, pure),
    scheduler: scheduler(stage, index),
    manifestSha256: H,
    canaryGateSha256: H,
    smokeSha256: H,
    executionRoot: path.join(base, "virtual-execution"),
});
const accounting = (stage, count) =>
    Array.from({ length: count }, (_, i) => ({
        label: "8000_" + i,
        jobId: String(9100 + i),
        state: "COMPLETED",
        exitCode: "0:0",
        account: "pi_jss233",
        partition: "day",
        cpus: 1,
        restarts: 0,
        elapsedSeconds: 1,
        reqMem: "8Gn",
        timeLimitMinutes: requestFor(stage).timeMinutes,
        workDir: REPO,
    }));
const identity = (p, sha = H, bytes = 1) => ({ path: p, bytes, sha256: sha });
function seedAudit() {
    const records = REGISTRATIONS.map((r) => ({
        ...identity(r.path, r.sha256),
        definitions: r.definitions,
        distinctSeeds: r.definitions,
        minSeed: 3350000000,
        maxSeed: 3350000001,
        seedsSha256: H,
        collisions: 0,
    }));
    const old = path.join(PROJECT, "research-evidence/unified-intent-arbiter-v2/od1");
    return {
        kind: "strategic-s1-registration-audit-v1",
        complete: true,
        passed: true,
        technicalOnly: true,
        registrationRoot: PROJECT,
        registrationAfterUtc: REGISTRATION_AFTER_UTC,
        discovered: permittedRegistrations(),
        inspectedRegistrationFiles: records,
        supportingMetadata: [
            identity(CERT, CERT_SHA, 4399),
            identity(CERT_AUDIT, CERT_AUDIT_SHA, 585357862),
            identity(GATE2_RECEIPT, GATE2_RECEIPT_SHA, 663),
        ],
        abandonedSelector: {
            jobId: "26516850",
            zeroUpdateInitializations: 905,
            advancingEpisodes: 0,
            accounting: "26516850|pi_jss233|day|FAILED|1:0|1|0",
            failure: identity(
                path.join(old, "execution-v1/manifest/FAILURE.json"),
                "ca726a89c6dcd00635f4eae458aafb53ea6d1fd7f9354b254860b4979aef4a2b",
            ),
            launchJournal: identity(
                path.join(old, "execution-v1/manifest/COMPLETE"),
                "9dd5fe87d5e08e15884a0821dc8a1b41fa6f0578cb6fc7eae9a5a6854b54b9c6",
            ),
            audit: identity(
                path.join(old, "selector-failure-audit-v1.json"),
                "04a7ab8f3c9ce8ceecbacc818e1d38d7ab35453b9318b57756a230d3ad85b7b3",
            ),
        },
        od1A1: { definitions: 905, zeroUpdateInitializations: 905, advancingEpisodes: 1818, manifest: records[7] },
        d1: { definitions: 205, zeroUpdateInitializations: 205, advancingEpisodes: 627, manifest: records[8] },
        priorZeroUpdateInitializations: 2015,
        newSeeds: { count: 205, min: 3350120000, max: 3350121100, sha256: digest(proposedS1Seeds(plan)) },
        collisions: 0,
        scope: "Registration/certificate/journal metadata only; no competitive payloads opened or engine initialized.",
    };
}
function memoryStore() {
    const records = new Map(),
        journal = [],
        events = [];
    return {
        root: path.join(base, "virtual-execution"),
        records,
        journal,
        events,
        launch(s, i, v) {
            journal.push(v);
            events.push("launch:" + v.caseIndex + ":" + v.mode);
        },
        read(s, i = null) {
            events.push("read:" + s + ":" + i);
            const value = records.get(s + ":" + i);
            assert.ok(value, "missing synthetic record");
            const raw = encode(value);
            return { value, bytes: Buffer.byteLength(raw), sha256: hash(raw) };
        },
        publish(s, i, v) {
            events.push("publish:" + s);
            records.set(s + ":" + i, v);
            const raw = encode(v);
            return { sha256: hash(raw), bytes: Buffer.byteLength(raw) };
        },
    };
}
const canaries = (i) =>
    syntheticS1Canaries(plan).map((e) => ({
        ...e,
        caseIndex: 200 + i,
        requestedEngineSeed: plan.canaries[i].requestedEngineSeed,
        observedStarts: { candidate: plan.canaries[i].candidateStart, opponent: plan.canaries[i].opponentStart },
    }));
const caseValue = (i) => ({
    ...stageHeader("case", ctx("case", i), expectedLaunches("case", plan, i)),
    manifestSha256: H,
    canaryGateSha256: H,
    smokeSha256: H,
    assignment: plan.cases[i],
    mapSha256: plan.maps.find((m) => m.id === plan.cases[i].mapId).sha256,
    episode: syntheticS1Record(plan.cases[i]).episode,
});
const canaryValue = (i) => ({
    ...stageHeader("canary", ctx("canary", i), expectedLaunches("canary", plan, i)),
    manifestSha256: H,
    assignment: plan.canaries[i],
    episodes: canaries(i),
});
const services = (storage) => ({
    arrayJobId: "8000",
    auditSeeds: async () => seedAudit(),
    initialize: async () => {
        storage.events.push("synthetic-initialize");
        return { gameModes: Object.fromEntries(plan.maps.map((m) => [m.id, 1])) };
    },
    zero: async (c) => expectedZeroObservation(c),
    episode: async (c, mode) =>
        mode === "diagnostic"
            ? syntheticS1Record(c).episode
            : mode === "smoke"
            ? syntheticS1Smoke(plan)
            : canaries(c.caseIndex - 200).find((e) => e.mode === mode),
    accounting: async (_id, stage, count) => {
        storage.events.push("accounting");
        return accounting(stage, count);
    },
    analyze: analyzeStrategicS1Population,
    assertStable: async () => storage.events.push("stable"),
    assertFilePopulation: async (done) => storage.events.push("files:" + done),
});
const environment = () => ({
    REPO_ROOT: REPO,
    SOURCE_COMMIT: C,
    PROTOCOL_SHA256: PROTOCOL_SHA,
    PROGRAM_SHA256: source.programSha256,
    SCRIPT_SHA256: source.scriptSha256,
    MODE: "prepare",
});
const output = (id = "9999") => ({ status: 0, signal: null, stdout: id + "\n", stderr: "" });
const write = (file, value) => fs.writeFileSync(file, encode(value), { flag: "wx" });

test("S1 pure inventory explicitly includes all synthetic groups and excludes engine seed suite", () => {
    assert.equal(VITEST_NAMES.length, 33);
    assert.equal(new Set(VITEST_NAMES).size, 33);
    assert.ok(!VITEST_NAMES.includes("seedControl"));
    assert.equal(VITEST_PASSED, 329);
    assert.equal(TOTAL_PASSED, 329 + NODE_TESTS.reduce((n, v) => n + v[1], 0));
    for (const p of requiredHarnessFiles) assert.ok(fs.existsSync(path.join(REPO, p)), p);
});
test("S1 complete registration envelope requires the full pinned metadata population", () => {
    validateSeedAudit(seedAudit(), plan);
    for (const mutate of [
        (a) => a.discovered.pop(),
        (a) => (a.registrationRoot = "/tmp"),
        (a) => (a.registrationAfterUtc = "2026"),
        (a) => a.inspectedRegistrationFiles.pop(),
        (a) => a.supportingMetadata[1].bytes--,
        (a) => (a.abandonedSelector.failure.sha256 = H),
        (a) => (a.od1A1.definitions = 900),
        (a) => (a.d1.definitions = 200),
        (a) => (a.collisions = 1),
        (a) => (a.newSeeds.sha256 = "b".repeat(64)),
        (a) => (a.extra = true),
    ]) {
        const a = seedAudit();
        mutate(a);
        assert.throws(() => validateSeedAudit(a, plan));
    }
});
test("S1 failed pre-initialization metadata invokes no initializer or launch callback", async () => {
    const s = memoryStore(),
        d = services(s);
    d.auditSeeds = async () => ({ ...seedAudit(), collisions: 1 });
    await assert.rejects(executeS1Stage("prepare", null, ctx("prepare"), d, s));
    assert.deepEqual(s.events, []);
});
test("S1 selector runs exactly205 synthetic zero-update callbacks after full metadata validation", async () => {
    const s = memoryStore();
    await executeS1Stage("prepare", null, ctx("prepare"), services(s), s);
    const v = s.records.get("prepare:null");
    assert.equal(v.observations.length, 205);
    assert.deepEqual(v.launches, expectedLaunches("prepare", plan));
    assert.equal(s.events[0], "synthetic-initialize");
    assert.equal(s.events.at(-2), "stable");
    assert.equal(s.events.at(-1), "publish:prepare");
    assert.equal(v.cumulativeZeroUpdateInitializations, undefined); // Counts belong to the aggregate, not an invented selector field.
});
test("S1 selector callback failure retains its exact attempted launch and publishes nothing", async () => {
    const s = memoryStore(),
        d = services(s);
    d.zero = async () => {
        throw new Error("synthetic failure");
    };
    await assert.rejects(executeS1Stage("prepare", null, ctx("prepare"), d, s), /synthetic failure/);
    assert.deepEqual(s.journal, [expectedLaunches("prepare", plan)[0]]);
    assert.equal(s.records.size, 0);
});
test("S1 canary runner visits both frozen modes in order for all four configurations", async () => {
    for (let i = 0; i < 4; i++) {
        const s = memoryStore();
        await executeS1Stage("canary", i, ctx("canary", i), services(s), s);
        assert.deepEqual(s.journal, expectedLaunches("canary", plan, i));
        assert.equal(s.records.get("canary:" + i).episodes.length, 2);
    }
});
test("S1 canary outer envelope rejects outcomes, mode swaps and altered first results", async () => {
    for (const mutate of [
        (v) => (v.winner = "candidate"),
        (v) => v.episodes.reverse(),
        (v) => (v.episodes[0].dualState = {}),
        (v) => (v.episodes[1].dualTrace.sha256 = H),
        (v) => (v.technicalOnly = false),
    ]) {
        const v = canaryValue(0);
        mutate(v);
        await assert.rejects(validateStage(v, "canary", ctx("canary", 0), 0));
    }
});
test("S1 smoke retains only checked technical projections and discards diagnostic fields", async () => {
    const s = memoryStore();
    await executeS1Stage("smoke", null, ctx("smoke"), services(s), s);
    const v = s.records.get("smoke:null");
    assert.equal(v.episode.payloadDiscarded, true);
    for (const key of ["dualState", "strategicLedger", "winner", "samples"]) {
        const x = clone(v);
        x.episode[key] = {};
        await assert.rejects(validateStage(x, "smoke", ctx("smoke")));
    }
});
test("S1 main worker replays both embedded ledgers and checks its entire outer assignment", async () => {
    const s = memoryStore();
    await executeS1Stage("case", 0, ctx("case", 0), services(s), s);
    const v = s.records.get("case:0");
    await validateStage(v, "case", ctx("case", 0), 0);
    for (const mutate of [
        (x) => (x.assignment.country = "Africans"),
        (x) => (x.mapSha256 = H),
        (x) => (x.episode.strategicAnalysisSha256 = H),
    ]) {
        const x = clone(v);
        mutate(x);
        await assert.rejects(validateStage(x, "case", ctx("case", 0), 0));
    }
});
test("S1 stage schema binds source, resources, scheduler, prerequisites and full journals", async () => {
    for (const mutate of [
        (x) => (x.bindings.sourceCommit = "b".repeat(40)),
        (x) => (x.request.memoryMiB = 4096),
        (x) => (x.scheduler.restarts = 1),
        (x) => (x.manifestSha256 = "b".repeat(64)),
        (x) => (x.launches = []),
        (x) => (x.complete = 1),
        (x) => (x.extra = {}),
    ]) {
        const x = caseValue(0);
        mutate(x);
        await assert.rejects(validateStage(x, "case", ctx("case", 0), 0));
    }
});
test("S1 canary finalizer reconciles four scheduler rows before any read and binds embedded records", async () => {
    const s = memoryStore();
    for (let i = 0; i < 4; i++) s.records.set("canary:" + i, canaryValue(i));
    await executeS1Stage("canary-finalize", null, ctx("canary-finalize"), services(s), s);
    assert.equal(s.events[0], "accounting");
    const v = s.records.get("canary-finalize:null");
    assert.equal(v.records.length, 4);
    assert.equal(v.advancingEpisodes, 8);
    const bad = clone(v);
    bad.records[0].identity.sha256 = H;
    await assert.rejects(validateStage(bad, "canary-finalize", ctx("canary-finalize")));
});
test("S1 complete synthetic200-case finalizer retains all72groups and frequencies beyond32MiB", async () => {
    const s = memoryStore();
    for (let i = 0; i < 200; i++) s.records.set("case:" + i, caseValue(i));
    const r = await executeS1Stage("finalize", null, ctx("finalize"), services(s), s),
        v = s.records.get("finalize:null");
    assert.equal(s.events[0], "accounting");
    assert.equal(s.events.filter((e) => e.startsWith("read:case")).length, 200);
    assert.equal(v.analysis.counts.groups, 72);
    assert.equal(v.analysis.counts.endpointReplays, 200);
    assert.equal(v.analysis.counts.strategicReplays, 200);
    assert.equal(v.totalAdvancingEpisodes, 209);
    assert.equal(v.cumulativeZeroUpdateInitializations, 2220);
    assert.ok(r.bytes > 32 * 1024 * 1024 && r.bytes < 384 * 1024 * 1024);
    assert.equal(v.analysis.independentAudit, false);
    assert.deepEqual(s.events.slice(-4), ["files:false", "stable", "publish:finalize", "files:true"]);
});
test("S1 failed or incomplete scheduler population blocks finalizers before payload reads", async () => {
    for (const stage of ["finalize", "canary-finalize"]) {
        const s = memoryStore(),
            d = services(s);
        d.accounting = async () => {
            s.events.push("accounting");
            throw new Error("not completed");
        };
        await assert.rejects(executeS1Stage(stage, null, ctx(stage), d, s));
        assert.deepEqual(s.events, ["accounting"]);
    }
});
test("S1 corrupted main record prevents population analysis and publication", async () => {
    const s = memoryStore(),
        d = services(s);
    s.records.set("case:0", { ...caseValue(0), mapSha256: H });
    d.analyze = async () => {
        throw new Error("analysis must not run");
    };
    await assert.rejects(executeS1Stage("finalize", null, ctx("finalize"), d, s), /map binding/);
    assert.equal(s.events.filter((e) => e.startsWith("publish")).length, 0);
});
test("S1 independently verified prerequisite is required before loading selector metadata", async () => {
    const prior = process.env.PURE_VERIFICATION_SHA256;
    process.env.PURE_VERIFICATION_SHA256 = H;
    const s = memoryStore();
    try {
        await assert.rejects(
            prerequisites("canary", ctx("canary", 0), s, {
                verify: () => {
                    throw new Error("no independent receipt");
                },
                accounting: () => assert.fail(),
            }),
            /no independent receipt/,
        );
        assert.deepEqual(s.events, []);
    } finally {
        if (prior === undefined) delete process.env.PURE_VERIFICATION_SHA256;
        else process.env.PURE_VERIFICATION_SHA256 = prior;
    }
});
test("S1 submission arguments freeze all CPU requests, arrays, no-requeue and afterok dependencies", () => {
    for (const stage of ["pure", "prepare", "canary", "canary-finalize", "smoke", "case", "finalize"]) {
        const final = ["finalize", "canary-finalize"].includes(stage),
            args = submissionArguments(stage, environment(), final ? "8000" : null),
            r = requestFor(stage);
        for (const a of [
            "--hold",
            "--account=pi_jss233",
            "--partition=day",
            "--nodes=1",
            "--cpus-per-task=1",
            "--no-requeue",
            "--mem=" + r.memoryMiB + "M",
            "--time=" + r.timeMinutes,
            "--chdir=" + REPO,
        ])
            assert.ok(args.includes(a), a);
        if (final) assert.ok(args.includes("--dependency=afterok:8000"));
        if (stage === "case") assert.ok(args.includes("--array=0-199%32"));
        if (stage === "canary") assert.ok(args.includes("--array=0-3%4"));
    }
    assert.throws(() => submissionArguments("finalize", environment()));
    assert.throws(() => submissionArguments("case", { ...environment(), BAD: "x" }));
    assert.deepEqual(cleanSubmitEnvironment({ PATH: "x", SBATCH_GRES: "gpu:1", SLURM_JOB_ID: "2" }), { PATH: "x" });
});
test("S1 submission attempts are immutable even on rejected or ambiguous scheduler responses", () => {
    for (const response of [
        output(),
        { status: 1, stdout: "", stderr: "rejected" },
        { status: 0, stdout: "uncertain", stderr: "" },
    ]) {
        const parent = fs.mkdtempSync(path.join(base, "submit-")),
            dir = path.join(parent, "worker");
        let calls = 0;
        const invoke = () => {
            calls++;
            return response;
        };
        if (response.stdout === "9999\n")
            assert.equal(submitOne(dir, "prepare", environment(), null, invoke).jobId, "9999");
        else assert.throws(() => submitOne(dir, "prepare", environment(), null, invoke));
        assert.ok(fs.existsSync(path.join(dir, "intent.json")));
        assert.ok(fs.existsSync(path.join(dir, "response.json")));
        assert.throws(() => submitOne(dir, "prepare", environment(), null, invoke));
        assert.equal(calls, 1);
    }
});
const heldText = (stage, id) =>
    "JobId=" +
    id +
    " JobName=chrono-s1-" +
    stage +
    " Account=pi_jss233 Partition=day JobState=PENDING Priority=0 Requeue=0 Restarts=0 " +
    "NumNodes=1 NumCPUs=1 NumTasks=1 CPUs/Task=1 WorkDir=" +
    REPO +
    " Command=" +
    path.join(REPO, "research/slurm/strategic_s1_" + (stage === "pure" ? "pure" : "stage") + ".sbatch") +
    " ReqTRES=cpu=1,mem=" +
    requestFor(stage).memoryMiB +
    "M,node=1 TimeLimit=" +
    requestFor(stage).timeMinutes / 60 +
    ":00:00\n";
test("S1 held Slurm resources must validate before READY publication or release", () => {
    for (const stage of ["pure", "prepare", "canary", "canary-finalize", "smoke", "case", "finalize"]) {
        validateHeldJob(heldText(stage, "9000"), "9000", stage);
        validateHeldJob(heldText(stage, "9000").replace("NumNodes=1 ", "NumNodes=1-1 "), "9000", stage);
    }
    const text = heldText("case", "9000");
    for (const [a, b] of [
        ["Priority=0", "Priority=1"],
        ["Requeue=0", "Requeue=1"],
        ["mem=8192M", "mem=4096M"],
        ["NumNodes=1", "NumNodes=2"],
        ["NumNodes=1", "NumNodes=1-2"],
        ["NumNodes=1", "NumNodes=0-1"],
        ["NumNodes=1", "NumNodes=2-2"],
        ["TimeLimit=6:00:00", "TimeLimit=8:00:00"],
        ["JobState=PENDING", "JobState=RUNNING"],
        ["node=1", "node=1,gres/gpu=1"],
        ["Account=pi_jss233", "Account=wrong"],
    ])
        assert.throws(() => validateHeldJob(text.replace(a, b), "9000", "case"));
    const folder = fs.mkdtempSync(path.join(base, "not-ready-"));
    fs.mkdirSync(path.join(folder, "worker"));
    assert.throws(() =>
        prepareRelease(folder, "worker", { jobId: "9000", stage: "case" }, text.replace("Priority=0", "Priority=1")),
    );
    assert.ok(fs.existsSync(path.join(folder, "worker-initial-scheduler.txt")));
    assert.ok(!fs.existsSync(path.join(folder, "worker/READY.json")));
});
test("S1 own submission receipt verifies complete argv, frozen source/runtime and scheduler identity", () => {
    const root = fs.mkdtempSync(path.join(base, "receipt-")),
        folder = path.join(root, "prepare");
    fs.mkdirSync(folder);
    const env = environment();
    write(path.join(folder, "freeze.json"), { source, runtime, environment: env, sourceBound: true });
    const submitted = submitOne(path.join(folder, "worker"), "prepare", env, null, () => output("9000"));
    prepareRelease(folder, "worker", submitted, heldText("prepare", "9000"));
    const keys = [
        "PURE_VERIFICATION_SHA256",
        "MANIFEST_SHA256",
        "MANIFEST_VERIFICATION_SHA256",
        "CANARY_GATE_SHA256",
        "CANARY_VERIFICATION_SHA256",
        "SMOKE_SHA256",
        "SMOKE_VERIFICATION_SHA256",
    ];
    const old = Object.fromEntries(keys.map((k) => [k, process.env[k]]));
    keys.forEach((k) => delete process.env[k]);
    try {
        assert.ok(verifySubmission("prepare", source, runtime, scheduler("prepare"), root).sha256);
        assert.throws(() =>
            verifySubmission(
                "prepare",
                { ...source, sourceCommit: "b".repeat(40) },
                runtime,
                scheduler("prepare"),
                root,
            ),
        );
        assert.throws(() =>
            verifySubmission("prepare", source, runtime, { ...scheduler("prepare"), jobId: "9998" }, root),
        );
        fs.appendFileSync(path.join(folder, "worker/intent.json"), " ");
        assert.throws(() => verifySubmission("prepare", source, runtime, scheduler("prepare"), root));
    } finally {
        for (const k of keys) {
            if (old[k] === undefined) delete process.env[k];
            else process.env[k] = old[k];
        }
    }
});
test("S1 held-job release persists intent and failure without resubmitting or releasing another job", () => {
    const root = fs.mkdtempSync(path.join(base, "release-"));
    let calls = 0;
    assert.throws(() =>
        releaseHeld(root, ["9000", "9001"], () => {
            calls++;
            return { status: 1, stdout: "", stderr: "synthetic failure" };
        }),
    );
    assert.equal(calls, 1);
    assert.ok(fs.existsSync(path.join(root, "release-9000-intent.json")));
    assert.ok(fs.existsSync(path.join(root, "release-9000-response.json")));
    assert.ok(!fs.existsSync(path.join(root, "release-9001-intent.json")));
    assert.throws(() =>
        releaseHeld(root, ["9000"], () => {
            calls++;
            return output();
        }),
    );
    assert.equal(calls, 1);
});
test("S1 prerequisite file readers reject path traversal and symlinked ancestors without following them", () => {
    const root = fs.mkdtempSync(path.join(base, "confined-")),
        file = path.join(root, "ok.json");
    write(file, { ok: true });
    assert.equal(confinedFile(file, root), file);
    assert.throws(() => confinedFile(root + "/../" + path.basename(root) + "/ok.json", root));
    fs.symlinkSync(root, path.join(root, "loop"));
    assert.throws(() => confinedFile(path.join(root, "loop/ok.json"), root));
    fs.symlinkSync(path.join(root, "missing"), path.join(root, "dangling"));
    assert.throws(() => confinedFile(path.join(root, "dangling"), root));
    assert.equal(artifactInventory(root).length, 3);
});
test("S1 pure test reports reject skipped, wrong-file, failed and incomplete populations", () => {
    const report = {
        success: true,
        numTotalTests: 329,
        numPassedTests: 329,
        numFailedTests: 0,
        numPendingTests: 0,
        numTodoTests: 0,
        testResults: VITEST_NAMES.map((n, i) => ({
            name: path.join(DRIVER, "src/test/" + n + ".test.ts"),
            status: "passed",
            assertionResults: Array.from({ length: i === 0 ? 297 : 1 }, () => ({ status: "passed" })),
        })),
    };
    validateVitestReport(report);
    for (const mutate of [
        (x) => (x.success = false),
        (x) => (x.numPendingTests = 1),
        (x) => (x.testResults[0].name = "/wrong"),
        (x) => x.testResults[0].assertionResults.pop(),
    ]) {
        const x = clone(report);
        mutate(x);
        assert.throws(() => validateVitestReport(x));
    }
    validateNodeLog("# pass 20\n# fail 0\n# cancelled 0\n# skipped 0\n# todo 0\n", 20);
    assert.throws(() => validateNodeLog("# pass 20\n# fail 0\n# cancelled 0\n# skipped 1\n# todo 0\n", 20));
});
test("S1 real service entry guards reject bad mode/runtime and uninitialized definitions before imports", async () => {
    const values = {
        MODE: "case",
        SLURM_JOB_ID: "9100",
        SLURM_ARRAY_JOB_ID: "8000",
        SLURM_ARRAY_TASK_ID: "0",
        SLURM_JOB_ACCOUNT: "pi_jss233",
        SLURM_JOB_PARTITION: "day",
        SLURM_CPUS_PER_TASK: "1",
        SLURM_RESTART_COUNT: "0",
        SLURM_MEM_PER_NODE: "8192",
        SLURM_JOB_NUM_NODES: "1",
        SLURM_JOB_GPUS: undefined,
        SLURM_GPUS: undefined,
    };
    const before = Object.fromEntries(Object.keys(values).map((k) => [k, process.env[k]]));
    for (const [k, v] of Object.entries(values)) {
        if (v === undefined) delete process.env[k];
        else process.env[k] = v;
    }
    try {
        const d = realServices("case", source, runtime);
        await assert.rejects(d.initialize({ wrong: true }, plan), /initialization runtime/);
        process.env.MODE = "finalize";
        await assert.rejects(d.initialize(runtime, plan), /game initialization stage/);
        await assert.rejects(d.zero(plan.cases[0], {}, plan), /uninitialized definitions/);
        await assert.rejects(d.episode(plan.cases[0], "diagnostic", {}, plan), /uninitialized definitions/);
    } finally {
        for (const [k, v] of Object.entries(before)) {
            if (v === undefined) delete process.env[k];
            else process.env[k] = v;
        }
    }
});
test("S1 independent prerequisite receipts rehash pinned auditor programs and bind exact scope", () => {
    for (const corrupt of [null, "scope", "payload", "program", "discarded", "source"]) {
        const root = fs.mkdtempSync(path.join(base, "audit-receipt-")),
            dir = path.join(root, "independent-audit");
        fs.mkdirSync(dir);
        const auditor = path.join(dir, "audit.mjs"),
            wrapper = path.join(dir, "audit.sbatch");
        fs.writeFileSync(auditor, "// synthetic fixture; never executed\n", { flag: "wx" });
        fs.writeFileSync(wrapper, "# synthetic fixture; never submitted\n", { flag: "wx" });
        const programPath = path.join(dir, "PROGRAM.json");
        write(programPath, {
            kind: "strategic-s1-independent-program-v1",
            stage: "smoke",
            files: [fileIdentity(auditor), fileIdentity(wrapper)],
        });
        const auditPath = path.join(dir, "audit.json"),
            payload = identity(path.join(root, "payload.json"));
        const result = {
            kind: "strategic-s1-independent-audit-v1",
            stage: "smoke",
            complete: true,
            passed: true,
            sourceCommit: C,
            protocolSha256: PROTOCOL_SHA,
            payloadSha256: H,
            programSha256: fileHash(programPath),
            independentMetadataAudit: true,
            discardedPayloadReplayIndependent: false,
            scheduler: scheduler("pure"),
        };
        if (corrupt === "discarded") result.discardedPayloadReplayIndependent = true;
        if (corrupt === "source") result.sourceCommit = "b".repeat(40);
        write(auditPath, result);
        const receipt = {
            kind: "strategic-s1-stage-verification-v1",
            stage: "smoke",
            complete: true,
            passed: true,
            sourceCommit: C,
            protocolSha256: PROTOCOL_SHA,
            scope: "source-bound-discarded-smoke",
            payload,
            audit: { ...fileIdentity(auditPath), jobId: "9000", program: fileIdentity(programPath) },
        };
        if (corrupt === "scope") receipt.scope = "independent-discarded-replay";
        if (corrupt === "payload") receipt.payload = { ...payload, sha256: "b".repeat(64) };
        write(verificationPath("smoke", root), receipt);
        if (corrupt === "program") fs.appendFileSync(auditor, "// altered synthetic file\n");
        if (corrupt) assert.throws(() => readVerification("smoke", payload, C, { root, accounting: false }));
        else {
            const d = readVerification("smoke", payload, C, { root, accounting: false });
            assert.equal(d.sha256, fileHash(verificationPath("smoke", root)));
            assert.throws(() =>
                readVerification("smoke", payload, C, { root, accounting: false, expectedHash: "b".repeat(64) }),
            );
        }
    }
});
test("S1 incomplete returned accounting also fails before a finalizer reads its first payload", async () => {
    for (const [stage, worker, count] of [
        ["finalize", "case", 200],
        ["canary-finalize", "canary", 4],
    ]) {
        const s = memoryStore(),
            d = services(s);
        d.accounting = async () => accounting(worker, count - 1);
        await assert.rejects(executeS1Stage(stage, null, ctx(stage), d, s), /exact allocation rows/);
        assert.deepEqual(s.events, []);
    }
});
test("S1 native Slurm wrappers are syntax-valid, CPU-only and preserve the explicit-start adapter", () => {
    for (const name of ["strategic_s1_pure.sbatch", "strategic_s1_stage.sbatch"]) {
        const p = path.join(REPO, "research/slurm", name),
            text = fs.readFileSync(p, "utf8");
        assert.equal(spawnSync("/bin/bash", ["-n", p]).status, 0);
        for (const token of [
            "#SBATCH --no-requeue",
            "#SBATCH --account=pi_jss233",
            "#SBATCH --partition=day",
            "#SBATCH --cpus-per-task=1",
            "SLURM_RESTART_COUNT",
        ])
            assert.ok(text.includes(token));
        assert.ok(!text.includes("--gres="));
        assert.ok(!text.includes("sbatch "));
        if (name.includes("_stage")) {
            assert.ok(text.includes("explicit-start-loader-v1.mjs"));
            assert.ok(text.includes("HEAP_MIB=18432"));
        }
    }
});
