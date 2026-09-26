import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
    STUDY,
    EXECUTION,
    REPO,
    encode,
    createS1Store,
    stageDirectory,
    expectedExecutionFiles,
    parseLaunchMarker,
    stageLimit,
    MAX_MAIN_BYTES,
    MAX_AGGREGATE_BYTES,
    fileHash,
    memoryMiB,
    schedulerIdentity,
    parseSchedulerRows,
    requestFor,
} from "../runtime/strategic-s1-io.mjs";
import { syntheticS1Plan } from "../../packages/chronodivide-bot-driver/dist/test/strategicS1Synthetic.js";
import {
    proposedS1Seeds,
    registeredSeeds,
    permittedRegistrations,
    validateRegistrationScan,
    validateHistoricalPlans,
    auditFreshSeeds,
    REGISTRATIONS,
} from "../runtime/strategic-s1-registration.mjs";
import {
    createS1Bots,
    checkedCell,
    expectedLaunches,
    settingsFor,
    episodeSpec,
    rngBindings,
    zeroObservation,
} from "../runtime/strategic-s1-contract.mjs";
import {
    configuration,
    missingHarnessFiles,
    sourceFiles,
    requiredHarnessFiles,
    verifyRuntime,
} from "../runtime/strategic-s1-provenance.mjs";
import { buildUnifiedIntentV2OD1Plan as od1Plan } from "../../packages/chronodivide-bot-driver/dist/training/unifiedIntentV2OD1Plan.js";
import { buildUnifiedIntentV2OD1Plan as a1Plan } from "../../packages/chronodivide-bot-driver/dist/training/unifiedIntentV2OD1A1Plan.js";
import { buildUnifiedIntentD1Plan as d1Plan } from "../../packages/chronodivide-bot-driver/dist/training/unifiedIntentD1Plan.js";
import { createDeployedStrongBotCandidate } from "../../packages/chronodivide-bot-driver/dist/training/deployedStrongBotCandidate.js";

const fixtureBase = process.env.S1_TEST_ROOT ?? path.join(STUDY, "development");
assert.ok(path.resolve(fixtureBase).startsWith(STUDY + "/"));
fs.mkdirSync(fixtureBase, { recursive: true });
const base = fs.mkdtempSync(path.join(fixtureBase, "io-fixtures-"));
const plan = syntheticS1Plan();
const setup = () => {
    const root = fs.mkdtempSync(path.join(base, "store-"));
    return { root, store: createS1Store(root) };
};
const payload = (stage, launches = []) => ({ stage, complete: true, passed: true, syntheticOnly: true, launches });
const launch = expectedLaunches("case", plan, 0)[0];
test("S1 JSON encoding rejects lossy/nonfinite/sparse/circular data before publication", () => {
    const cycle = {};
    cycle.self = cycle;
    for (const v of [undefined, NaN, Infinity, 1n, new Date(), [undefined], Array(1), cycle, { [Symbol("x")]: 1 }])
        assert.throws(() => encode(v));
    const shared = { x: 1 };
    assert.equal(encode({ a: shared, b: shared }), '{"a":{"x":1},"b":{"x":1}}\n');
});
test("S1 stage layout has exactly416 unique execution files and strict task ranges", () => {
    const files = expectedExecutionFiles();
    assert.equal(files.length, 416);
    assert.equal(new Set(files).size, 416);
    assert.equal(stageDirectory("case", 199), path.join(EXECUTION, "cases/task-0199"));
    for (const [stage, i] of [
        ["case", 200],
        ["case", -1],
        ["canary", 4],
        ["smoke", 0],
        ["../escape", null],
    ])
        assert.throws(() => stageDirectory(stage, i));
});
test("S1 reserves exclusively and publishes a checksum-bound durable journal", () => {
    const { root, store } = setup();
    const d = store.reserve("case", 0);
    store.launch("case", 0, launch);
    const p = store.publish("case", 0, payload("case", [launch]));
    assert.deepEqual(store.read("case", 0, p.sha256).value, payload("case", [launch]));
    assert.equal(fileHash(path.join(d, "record.json")), p.sha256);
    assert.throws(() => store.reserve("case", 0));
    assert.throws(() => store.launch("case", 0, launch));
    assert.throws(() => store.publish("case", 0, payload("case", [launch])));
    assert.ok(root.startsWith(base));
});
test("S1 duplicate/shifted launches fail before appending and retain the original journal", () => {
    const { store } = setup(),
        d = store.reserve("case", 0);
    store.launch("case", 0, launch);
    const before = fs.readFileSync(path.join(d, "COMPLETE"), "utf8");
    assert.throws(() => store.launch("case", 0, launch));
    assert.throws(() => store.launch("case", 0, { ...launch, requestedEngineSeed: 3350120999 }));
    assert.equal(fs.readFileSync(path.join(d, "COMPLETE"), "utf8"), before);
    assert.throws(() => parseLaunchMarker(before.trimEnd()));
});
test("S1 failure reservations and journals cannot be silently replaced or published", () => {
    const { store } = setup(),
        d = store.reserve("case", 0);
    store.launch("case", 0, launch);
    store.fail("case", 0, { complete: false, passed: false, syntheticOnly: true, launches: [launch] });
    assert.ok(fs.existsSync(path.join(d, "FAILURE.json")));
    assert.throws(() => store.reserve("case", 0));
    assert.throws(() => store.fail("case", 0, { complete: false, passed: false }));
    assert.throws(() => store.publish("case", 0, payload("case", [launch])));
    assert.throws(() => store.launch("case", 0, launch));
});
test("S1 checksum, journal and nested symlink corruption are rejected", () => {
    const a = setup(),
        d = a.store.reserve("case", 0);
    const p = a.store.publish("case", 0, payload("case"));
    assert.throws(() => a.store.read("case", 0, "0".repeat(64)));
    fs.appendFileSync(path.join(d, "COMPLETE"), "SYNTHETIC_CORRUPTION\n");
    assert.throws(() => a.store.read("case", 0, p.sha256));
    const b = setup(),
        target = fs.mkdtempSync(path.join(base, "link-target-"));
    fs.symlinkSync(target, path.join(b.root, "cases"));
    assert.throws(() => b.store.reserve("case", 0));
    assert.throws(() => createS1Store("/tmp/not-permitted"));
    const c = setup(),
        absentDir = path.join(base, "never-created-directory");
    fs.symlinkSync(absentDir, path.join(c.root, "cases"));
    assert.throws(() => c.store.reserve("case", 0));
    assert.equal(fs.existsSync(absentDir), false);
    const e = setup(),
        directory = e.store.reserve("case", 0),
        absentFile = path.join(base, "never-created-marker");
    fs.symlinkSync(absentFile, path.join(directory, "COMPLETE"));
    assert.throws(() => e.store.launch("case", 0, launch));
    assert.equal(fs.existsSync(absentFile), false);
});
test("S1 32MiB game cap remains fixed while complete aggregates can exceed it", () => {
    assert.equal(stageLimit("case"), MAX_MAIN_BYTES);
    assert.equal(stageLimit("finalize"), MAX_AGGREGATE_BYTES);
    assert.equal(MAX_AGGREGATE_BYTES, 384 * 1024 * 1024);
    const { store } = setup();
    const d = store.reserve("case", 0);
    const large = { ...payload("case"), padding: "x".repeat(MAX_MAIN_BYTES + 1) };
    assert.throws(() => store.publish("case", 0, large));
    assert.equal(fs.existsSync(path.join(d, "record.json")), false);
    store.reserve("finalize");
    const aggregate = { ...large, stage: "finalize" },
        p = store.publish("finalize", null, aggregate);
    assert.ok(p.bytes > MAX_MAIN_BYTES);
    assert.equal(store.read("finalize").bytes, p.bytes);
    assert.throws(() => store.publish("finalize", null, { ...aggregate, complete: 1 }));
});
test("S1 CPU scheduler identity rejects wrong account, memory, restarts, GPU or array shape", () => {
    const env = {
        SLURM_JOB_ID: "123",
        SLURM_JOB_ACCOUNT: "pi_jss233",
        SLURM_JOB_PARTITION: "day",
        SLURM_CPUS_PER_TASK: "1",
        SLURM_MEM_PER_NODE: "8192",
        SLURM_JOB_NUM_NODES: "1",
    };
    assert.equal(schedulerIdentity("pure", env).jobId, "123");
    for (const changed of [
        { SLURM_JOB_ACCOUNT: "pi_btk22" },
        { SLURM_MEM_PER_NODE: "16384" },
        { SLURM_RESTART_COUNT: "1" },
        { SLURM_GPUS: "1" },
        { SLURM_ARRAY_TASK_ID: "0" },
    ])
        assert.throws(() => schedulerIdentity("pure", { ...env, ...changed }));
    assert.equal(
        schedulerIdentity("case", { ...env, SLURM_ARRAY_TASK_ID: "199", SLURM_ARRAY_JOB_ID: "123" }).arrayTaskId,
        "199",
    );
});
test("S1 accounting expands exact200allocation rows and checks complete resource identity", () => {
    const rows =
        Array.from(
            { length: 200 },
            (_, i) => "123_" + i + "|" + (200 + i) + "|COMPLETED|0:0|pi_jss233|day|1|0|100|8Gn|360|" + REPO,
        ).join("\n") + "\n";
    assert.equal(parseSchedulerRows(rows, "123", "case", 200).length, 200);
    for (const bad of [
        rows.replace("COMPLETED", "FAILED"),
        rows.replace("8Gn", "9Gn"),
        rows.replace("|360|", "|480|"),
        rows.replace(REPO, "/wrong"),
        rows.split("\n").slice(1).join("\n"),
    ])
        assert.throws(() => parseSchedulerRows(bad, "123", "case", 200));
    assert.throws(() => parseSchedulerRows(rows, "123", "canary", 200));
    assert.equal(requestFor("canary-finalize").memoryMiB, 8192);
    assert.equal(requestFor("finalize").memoryMiB, 24576);
});
test("S1 Slurm memory parser supports exactK/M/G/T node or CPU units", () => {
    for (const m of ["8388608Kn", "8192Mn", "8Gn", "0.0078125Tn", "8Gc"]) assert.equal(memoryMiB(m), 8192);
    for (const m of ["8G", "NaNGn", "-8Gn", "8Pn"]) assert.throws(() => memoryMiB(m));
});
test("S1 metadata census is exact with no prior/current-study blanket exemptions", () => {
    const allowed = permittedRegistrations();
    assert.equal(allowed.length, 11);
    assert.equal(REGISTRATIONS.length, 9);
    validateRegistrationScan(allowed);
    for (const values of [
        allowed.slice(1),
        [...allowed, allowed[0]],
        [...allowed, path.join(STUDY, "unknown-manifest.json")],
    ])
        assert.throws(() => validateRegistrationScan(values));
});
test("S1 fresh seeds and complete old canary/smoke/task registrations reject collisions", () => {
    const seeds = proposedS1Seeds(plan);
    assert.equal(seeds.length, 205);
    assert.equal(seeds[204], 3350121100);
    const old = { complete: true, passed: true, plan: a1Plan(plan.maps) };
    assert.equal(registeredSeeds(old, seeds, 905).length, 905);
    for (const mutate of [
        (v) => (v.complete = 1),
        (v) => (v.plan.smoke.requestedEngineSeed = seeds[0]),
        (v) => (v.plan.canaries = {}),
        (v) => (v.plan.tasks = [{ requestedEngineSeed: seeds[1] }]),
    ]) {
        const v = structuredClone(old);
        mutate(v);
        assert.throws(() => registeredSeeds(v, seeds, 905));
    }
});
test("S1 reconstructs both complete prior populations and the905failed-selector journal", () => {
    const old = od1Plan(plan.maps),
        journal = [...old.cases, ...old.canaries, old.smoke].map((c) => ({
            role: c.role,
            caseIndex: c.caseIndex,
            arm: "disabled",
            mode: "zero_update",
            requestedEngineSeed: c.requestedEngineSeed,
        }));
    const failure = {
        mode: "prepare",
        sourceCommit: "468dae122744505a7c46e3de1b0d13c4fa15d13a",
        scheduler: { jobId: "26516850" },
        launches: journal,
    };
    const a1 = { plan: a1Plan(plan.maps) },
        d1 = { plan: d1Plan(plan.maps) };
    validateHistoricalPlans(plan, a1, d1, failure, journal);
    const bad = structuredClone(d1);
    bad.plan.smoke.requestedEngineSeed++;
    assert.throws(() => validateHistoricalPlans(plan, a1, bad, failure, journal));
    assert.throws(() => validateHistoricalPlans(plan, a1, d1, failure, journal.slice(0, 900)));
});
test("S1 slow census cannot be run interactively or from a pure-test phase", () => {
    const previous = process.env.MODE;
    process.env.MODE = "pure";
    try {
        assert.throws(() => auditFreshSeeds(plan), /Slurm preparation only/);
    } finally {
        if (previous === undefined) delete process.env.MODE;
        else process.env.MODE = previous;
    }
});
test("S1 factories preserve disabled deployed defaults and bind names, starts and firewall", () => {
    const calls = [];
    const deps = {
        createCandidate: (...args) => {
            calls.push(args);
            return createDeployedStrongBotCandidate(...args);
        },
        createBaseline: (name, country) => ({ name, country }),
        createAdvanced: (name, country) => ({ name, country }),
        installFirewall: (bots, mode) => calls.push({ names: bots.map((b) => b.name), mode }),
    };
    const c = plan.cases[3],
        bots = createS1Bots(c, plan, deps);
    assert.deepEqual(calls[0], ["OD1Candidate", c.country, {}, { intentArbiter: { enabled: false } }]);
    assert.deepEqual(calls[1], { names: ["OD1Candidate", "OD1Opponent"], mode: "api_full_state" });
    assert.deepEqual(bots.candidate.intentArbiterOptions, { enabled: false });
    assert.equal(bots.candidate.enableDefaultMapProfiles, true);
    assert.equal(bots.candidate.enableExactMapTactics, true);
    assert.equal(bots.candidate.getResearchMissionSnapshot(), null);
    assert.equal(bots.candidate.chronoResearchStartPos, c.candidateStartOrdinal);
    assert.deepEqual(
        rngBindings(bots).map((b) => b.identity),
        ["candidate", "opponent"],
    );
});
test("S1 settings use exact slots, map mode1 and unchanged game options for all205definitions", () => {
    const modes = Object.fromEntries(plan.maps.map((m) => [m.id, 1]));
    for (const c of [...plan.cases, ...plan.canaries, plan.smoke]) {
        const bots = { candidate: { name: "OD1Candidate" }, opponent: { name: "OD1Opponent" } };
        const s = settingsFor(c, plan, bots, modes);
        assert.equal(s.agents[c.candidateSlot], bots.candidate);
        assert.deepEqual(
            { ...s, agents: [], mapName: "" },
            {
                online: false,
                agents: [],
                mapName: "",
                gameMode: 1,
                shortGame: false,
                mcvRepacks: true,
                cratesAppear: false,
                superWeapons: false,
                gameSpeed: 6,
                credits: 10000,
                unitCount: 0,
                buildOffAlly: false,
                multiEngineer: false,
            },
        );
        assert.equal(episodeSpec(c, plan).caseIndex, c.caseIndex);
    }
    assert.throws(() => checkedCell({ ...plan.cases[0], extra: undefined }, plan));
});
test("S1 zero-observation checks public identity, starts, countries and explicit source-bound slot proof", () => {
    const c = plan.cases[1],
        game = {
            getCurrentTick: () => 0,
            getPlayers: () => ["OD1Opponent", "OD1Candidate"],
            isPlayerDefeated: () => false,
            getPlayerData: (name) => ({
                country: { name: c.country },
                startLocation: Object.fromEntries(
                    (name === "OD1Candidate" ? c.candidateStart : c.opponentStart)
                        .split(",")
                        .map((v, i) => [i ? "y" : "x", Number(v)]),
                ),
            }),
        };
    const bots = {
        candidate: { name: "OD1Candidate", lastGameApi: game },
        opponent: { name: "OD1Opponent", lastGameApi: game },
    };
    const options = { agents: [bots.opponent, bots.candidate] },
        instance = { isFinished: () => false };
    assert.equal(
        zeroObservation(c, plan, bots, instance, options).slotVerification,
        "source-bound-agent-order-and-pinned-creator",
    );
    assert.throws(() => zeroObservation(c, plan, bots, instance, { agents: options.agents.slice().reverse() }));
    assert.throws(() => zeroObservation(c, plan, bots, { isFinished: () => undefined }, options));
});
test("S1 launch counts are205zero,8canary,1smoke and200diagnostic with no finalizer games", () => {
    assert.equal(expectedLaunches("prepare", plan).length, 205);
    assert.equal(plan.canaries.flatMap((_, i) => expectedLaunches("canary", plan, i)).length, 8);
    assert.equal(expectedLaunches("smoke", plan).length, 1);
    assert.equal(plan.cases.flatMap((_, i) => expectedLaunches("case", plan, i)).length, 200);
    assert.deepEqual(expectedLaunches("finalize", plan), []);
});
test("S1 configuration pins unchanged optionalAI and requires a complete harness before source binding", () => {
    const c = configuration();
    assert.equal(c.aiIniCandidates[1].bytes, 84972);
    assert.equal(c.arbiterEnabled, false);
    const old = process.env.CHRONO_AI_INI_PATH;
    process.env.CHRONO_AI_INI_PATH = "/not-allowed";
    try {
        assert.throws(() => configuration());
    } finally {
        if (old === undefined) delete process.env.CHRONO_AI_INI_PATH;
        else process.env.CHRONO_AI_INI_PATH = old;
    }
    const missing = missingHarnessFiles();
    assert.deepEqual(
        missing,
        requiredHarnessFiles.filter((f) => !fs.existsSync(path.join(REPO, f))),
    );
    if (missing.length) assert.throws(() => sourceFiles(), /complete harness required/);
    else assert.ok(sourceFiles().length >= requiredHarnessFiles.length);
});
test("S1 read-only runtime verification matches335assets15maps and original/effective API identity", () => {
    const r = verifyRuntime();
    assert.equal(r.assets.count, 335);
    assert.equal(r.maps.length, 15);
    assert.equal(r.gameApi.sha256, "dd398f5c8c2b4c3e3d6eb0f9ca6d7549bf70fee16c5950cd8902616ac922497d");
    assert.equal(r.gameApi.effectiveSha256, "4ad4a5dd7a6a8ae53a7e671a29d7dd0a5fbad1916d94e52c69c9eda133a30f0c");
    assert.equal(r.externalSupalosa.runtimeTree.files, 172);
});
