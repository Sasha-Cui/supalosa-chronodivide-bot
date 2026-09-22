import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";
import { REPO, PROJECT, DRIVER, STUDY, EXECUTION, SHA, hash, fileHash, fileIdentity, json, exact,
    required, requiredHash, git, hashTree, schedulerIdentity, schedulerRows, technicalOnly, parseLaunchMarker, buildD1RegistrationAudit, validateD1RegistrationScan, registeredD1Seeds } from "./unified-intent-d1-io.mjs";
import { parseLaunchMarker as parseLegacyLaunchMarker } from "./unified-intent-v2-od1-io.mjs";

export const PROTOCOL = path.join(REPO, "research/protocols/method/2026-09-22-command-budget-diagnostic-d1.md");
const FROZEN_D1_PROTOCOL_SHA = "151c4cd5719459b8a6dc218f17d55f7fbc563803a11d6a0b7298a0a121247ebe";
const RUNTIME = path.join(PROJECT, "research-evidence/fresh-dual-endpoint-v1/execution-v1/runtime-freeze/runtime-freeze.json");
const RUNTIME_SHA = "be47027c8526daa961500a1ca2acc3c04dd1a487460d4dec78361faa03ece649";
const CERT = path.join(PROJECT, "research-evidence/unified-intent-arbiter-v1/gate-2/seed-certificate-v1-a4/selection-certificate.json");
const CERT_SHA = "f7f7086d32630b1eede7a300a382a9348d60f610c1768c300cb3818f738307fd";
const GATE2_ROOT = path.join(PROJECT, "research-evidence/unified-intent-arbiter-v2/gate-2");
const GATE2_MANIFEST = path.join(GATE2_ROOT, "execution-v1/manifest/manifest.json");
const GATE2_MANIFEST_SHA = "66277b66569b5512e6b286758bbd2cf39bc00427e3c2a7d1c18ec1b49e8b2adc";
const GATE2_RESULT = path.join(GATE2_ROOT, "execution-v1/finalizer/aggregate.json");
const GATE2_RESULT_SHA = "be3a7fcdfc261f4eb60c0dd812b43525484ca7ac2496cf152c810229cf5547d3";
const PROGRAM = path.join(REPO, "research/scripts/unified-intent-d1.mjs");
export const PURE_PROGRAM = path.join(REPO, "research/scripts/unified-intent-d1-pure.mjs");
const moduleAt = (relative) => import(pathToFileURL(path.join(DRIVER, "dist", relative)).href);
const requireDriver = createRequire(path.join(DRIVER, "package.json"));
export const gameApiPath = fs.realpathSync(requireDriver.resolve("@chronodivide/game-api"));
export const api = await import(pathToFileURL(gameApiPath).href);
export const planModule = await moduleAt("training/unifiedIntentD1Plan.js");
const originalPlanModule = await moduleAt("training/unifiedIntentV2OD1Plan.js");
const a1PlanModule = await moduleAt("training/unifiedIntentV2OD1A1Plan.js");
const OD1_STUDY = path.join(PROJECT, "research-evidence/unified-intent-arbiter-v2/od1");
const A1_REGISTRATION = path.join(OD1_STUDY, "execution-a1/manifest/record.json");
const A1_REGISTRATION_SHA = "a595d73b1e06c01e4212add30d19083d6260836cf30b2a2d90fd37762ab99b67";
export const episodeModule = await moduleAt("training/unifiedIntentD1Episode.js");
export const { verifyEmbeddedFreshDualLedger } = await moduleAt("training/embeddedFreshDualLedger.js");
const { createDeployedStrongBotCandidate } = await moduleAt("training/deployedStrongBotCandidate.js");
const { loadBaselineFactory } = await moduleAt("benchmark/baselineLoader.js");
const { createInspectableRa2WebBot, loadRa2WebOpponent } = await moduleAt("training/ra2WebOpponentBundle.js");
const { installSymmetricObservationFirewall } = await moduleAt("training/symmetricObservationFirewall.js");
export const { withSeededOfflineGame } = await moduleAt("benchmark/seededOfflineGame.js");

const sourceFiles = [
    "research/scripts/unified-intent-d1.mjs",
    "research/scripts/unified-intent-d1-pure.mjs",
    "research/scripts/submit-unified-intent-d1.mjs",
    "research/runtime/unified-intent-d1-analysis.mjs",
    "research/runtime/unified-intent-d1-io.mjs",
    "research/runtime/unified-intent-d1-context.mjs",
    "research/runtime/unified-intent-d1-validation.mjs",
    "research/runtime/unified-intent-d1-golden.mjs",
    "research/fixtures/unified-intent-d1-prechange.json",
    "research/tests/unified-intent-d1-analysis.test.mjs",
    "research/tests/unified-intent-d1-runtime.test.mjs",
    "research/tests/unified-intent-d1-golden.test.mjs",
    "research/runtime/explicit-start-loader-v1.mjs",
    "research/runtime/explicit-start-transform-v1.mjs",
    "research/slurm/unified_intent_d1_pure.sbatch",
    "research/slurm/unified_intent_d1_stage.sbatch",
    "research/protocols/method/2026-09-22-command-budget-diagnostic-d1.md",
    "packages/chronodivide-bot-driver/package.json",
    "packages/chronodivide-bot-driver/pnpm-lock.yaml",
    "package-lock.json",
    "packages/chronodivide-bot-driver/src/training/unifiedIntentD1Plan.ts",
    "packages/chronodivide-bot-driver/dist/training/unifiedIntentD1Plan.js",
    "packages/chronodivide-bot-driver/src/training/unifiedIntentD1Telemetry.ts",
    "packages/chronodivide-bot-driver/dist/training/unifiedIntentD1Telemetry.js",
    "packages/chronodivide-bot-driver/src/training/unifiedIntentD1Episode.ts",
    "packages/chronodivide-bot-driver/dist/training/unifiedIntentD1Episode.js",
    "packages/chronodivide-bot-driver/src/training/literalBuildingEliminationEndpoint.ts",
    "packages/chronodivide-bot-driver/dist/training/literalBuildingEliminationEndpoint.js",
    "packages/chronodivide-bot-driver/src/training/liveOwnedBuildingEliminationEndpointV6.ts",
    "packages/chronodivide-bot-driver/dist/training/liveOwnedBuildingEliminationEndpointV6.js",
    "packages/chronodivide-bot-driver/src/training/liveOwnedBuildingSnapshotCandidate.ts",
    "packages/chronodivide-bot-driver/dist/training/liveOwnedBuildingSnapshotCandidate.js",
    "packages/chronodivide-bot-driver/src/training/passiveDualBuildingEndpoint.ts",
    "packages/chronodivide-bot-driver/dist/training/passiveDualBuildingEndpoint.js",
    "packages/chronodivide-bot-driver/src/test/unifiedIntentD1.test.ts",
    "packages/chronodivide-bot-driver/src/test/unifiedIntentD1Plan.test.ts",
    "packages/chronodivide-bot-driver/src/test/unifiedIntentD1Episode.test.ts",
    "packages/chronodivide-bot-driver/src/test/unifiedIntentD1Rng.test.ts",
    "packages/chronodivide-bot/src/bot/strongBot.ts",
    "packages/chronodivide-bot/src/bot/logic/intent/unifiedIntentArbiter.ts",
    "packages/chronodivide-bot/src/bot/logic/intent/unifiedIntentActionBoundary.ts",
    "research/runtime/unified-intent-v2-od1-io.mjs"
];
export const assertSource = () => {
    const sourceCommit = required("SOURCE_COMMIT"), programSha256 = requiredHash("PROGRAM_SHA256");
    if (process.version !== "v20.13.1" || git("branch", "--show-current") !== "main" ||
        git("rev-parse", "HEAD") !== sourceCommit || git("rev-parse", "fork/main") !== sourceCommit ||
        git("status", "--porcelain=v1") !== "" || fileHash(PROGRAM) !== programSha256 ||
        fileHash(PROTOCOL) !== requiredHash("PROTOCOL_SHA256") ||
        fileHash(PROTOCOL) !== FROZEN_D1_PROTOCOL_SHA) throw new Error("D1 source/protocol drifted");
    schedulerIdentity();
    const optionalAiPaths = [process.env.CHRONO_AI_INI_PATH ?? null,
        path.join(DRIVER, "data/ai.ini"), path.join(REPO, "data/ai.ini")];
    const aiIniCandidates = optionalAiPaths.map((file) => {
        if (file === null) return null;
        const absolute = path.resolve(REPO, file);
        if (!absolute.startsWith(PROJECT + "/")) throw new Error("D1 AI configuration outside project");
        return fs.existsSync(absolute) ? { present: true, ...fileIdentity(absolute) } : { path: absolute, present: false };
    });
    return { sourceCommit, programSha256, protocolSha256: fileHash(PROTOCOL),
        configuration: { cwd: REPO, aiIniOverride: process.env.CHRONO_AI_INI_PATH ?? null, aiIniCandidates },
        files: sourceFiles.map((file) => fileIdentity(path.join(REPO, file))),
        driverTree: hashTree(path.join(DRIVER, "dist")),
        candidateTree: hashTree(path.join(REPO, "packages/chronodivide-bot/dist")) };
};
export const verifyPure = () => {
    const file = required("PURE_GATE_PATH");
    if (!file.startsWith(STUDY + "/pure-") || path.basename(file) !== "pure.json") throw new Error("D1 pure path invalid");
    const raw = fs.readFileSync(file), sha256 = hash(raw), v = JSON.parse(raw);
    if (fs.readFileSync(path.join(path.dirname(file), "COMPLETE"), "utf8") !==
        "COMPLETE_UNIFIED_INTENT_D1_PURE_V1 " + sha256 + " " + raw.length + "\n" ||
        v.kind !== "unified-intent-d1-pure-v1" || !v.complete || !v.passed || !v.technicalOnly ||
        v.sourceCommit !== required("SOURCE_COMMIT") || v.programSha256 !== fileHash(PURE_PROGRAM) ||
        v.tests.files !== 30 || v.tests.passed !== 264 || v.tests.runtimePassed !== 1 ||
        v.tests.od1RuntimePassed !== 16 || v.tests.d1RuntimePassed !== 11 ||
        v.tests.d1AnalysisPassed !== 8 || v.tests.goldenPassed !== 1 || v.scheduler.jobId !== required("PURE_JOB_ID")) throw new Error("D1 pure binding invalid");
    if (v.scheduler.account !== "pi_jss233" || v.scheduler.partition !== "day" ||
        v.scheduler.cpus !== 1 || v.scheduler.restarts !== 0) throw new Error("D1 pure scheduler identity invalid");
    // Cell jobs trust the pinned prerequisite marker; control stages reconcile sacct once.
    // Avoid thousands of identical accounting requests from the 200-block array.
    if (!["canary", "pair"].includes(process.env.MODE)) schedulerRows(v.scheduler.jobId);
    return { path: file, sha256, bytes: raw.length, jobId: v.scheduler.jobId, scheduler: v.scheduler };
};
export const verifyRuntime = () => {
    if (fileHash(RUNTIME) !== RUNTIME_SHA || fileHash(CERT) !== CERT_SHA ||
        fileHash(GATE2_MANIFEST) !== GATE2_MANIFEST_SHA || fileHash(GATE2_RESULT) !== GATE2_RESULT_SHA) {
        throw new Error("D1 prerequisite identities drifted");
    }
    const frozen = json(RUNTIME).frozen, prior = json(GATE2_MANIFEST), gate = json(GATE2_RESULT), certificate = json(CERT);
    if (!gate.complete || !gate.passed || gate.tasks !== 925 || gate.exactDuplicates !== 25 ||
        !certificate.complete || !certificate.passed || certificate.selectedBase !== 3350000000 ||
        JSON.stringify(certificate.selectedInterval) !== JSON.stringify([3350000000, 3351000000]) ||
        frozen.nodeVersion !== "v20.13.1" || fileHash(gameApiPath) !== frozen.gameApi.sha256) {
        throw new Error("D1 prerequisite eligibility failed");
    }
    const external = hashTree(frozen.externalSupalosa.runtimeTree.root);
    exact(external, frozen.externalSupalosa.runtimeTree, "D1 pinned Supalosa");
    const maps = originalPlanModule.OD1_MAP_IDS.map((id) => {
        const found = frozen.maps.find((m) => m.id === id);
        if (!found || fileHash(found.absolutePath) !== found.sha256) throw new Error("D1 map binding invalid");
        return { ...found, advancedEligible: id.startsWith("hfo-") };
    });
    exact(maps, prior.plan.maps, "D1 Gate 2 map order");
    if (frozen.assets.entries.length !== frozen.assets.count) throw new Error("D1 asset count invalid");
    for (const entry of frozen.assets.entries) {
        if (!path.resolve(frozen.assets.root, entry.name).startsWith(frozen.assets.root + "/") || !SHA.test(entry.sha256) ||
            fileHash(path.join(frozen.assets.root, entry.name)) !== entry.sha256) throw new Error("D1 asset binding invalid");
    }
    const advanced = frozen.ra2WebAdvanced;
    if (advanced.opponentId !== "ra2web_advanced_old_priest" ||
        fileHash(advanced.bundlePath) !== advanced.bundleSha256 ||
        fileHash(advanced.manifestPath) !== advanced.manifestSha256) throw new Error("D1 Advanced binding invalid");
    return {
        runtimeFreeze: fileIdentity(RUNTIME), certificate: fileIdentity(CERT), gate2Manifest: fileIdentity(GATE2_MANIFEST),
        gate2Aggregate: fileIdentity(GATE2_RESULT), gameApi: frozen.gameApi, assets: frozen.assets,
        externalSupalosa: frozen.externalSupalosa, advanced, maps,
    };
};
export const initialize = async (runtime) => {
    process.env.BASELINE_PACKAGE_ROOT = runtime.externalSupalosa.packageRoot;
    process.env.REQUIRE_EXTERNAL_BASELINE = "true";
    await api.cdapi.init(runtime.assets.root);
    const factory = await loadBaselineFactory(path.join(REPO, "packages/chronodivide-bot"));
    if (factory.descriptor.kind !== "external-package" ||
        path.resolve(factory.descriptor.packageRoot) !== runtime.externalSupalosa.packageRoot) {
        throw new Error("D1 external baseline factory invalid");
    }
    return { factory, advanced: loadRa2WebOpponent(runtime.advanced.freezeRoot, runtime.advanced.opponentId) };
};
export const createBots = (cell, arm, definitions) => {
    const candidate = createDeployedStrongBotCandidate("OD1Candidate", cell.country, {}, {
        intentArbiter: arm.enabled
            ? { enabled: true, budgetMode: arm.budgetMode, commandCeiling: arm.commandCeiling }
            : { enabled: false },
    });
    const opponent = cell.opponent === "pinned_supalosa"
        ? definitions.factory.create("OD1Opponent", cell.country)
        : createInspectableRa2WebBot(definitions.advanced, "OD1Opponent", cell.country);
    candidate.chronoResearchStartPos = cell.candidateStartOrdinal;
    opponent.chronoResearchStartPos = cell.opponentStartOrdinal;
    installSymmetricObservationFirewall([candidate, opponent], "api_full_state");
    return { candidate, opponent };
};
export const zeroSettings = (cell, map, bots, gameMode) => ({
    online: false, agents: cell.candidateSlot === 0 ? [bots.candidate, bots.opponent] : [bots.opponent, bots.candidate],
    mapName: map.fileName, gameMode, shortGame: false, mcvRepacks: true, cratesAppear: false,
    superWeapons: false, gameSpeed: 6, credits: 10000, unitCount: 0, buildOffAlly: false, multiEngineer: false,
});

/**
 * Inspect registration metadata only. Unknown post-certificate metadata blocks launch
 * instead of silently treating an unrecognized seed representation as collision-free.
 */
export const auditFreshSeeds = (plan) => {
    const suffixes = [
        "unified-intent-arbiter-v1/gate-2/execution-v1-wrapper-a1-runtime-a1/manifest/manifest.json",
        "unified-intent-arbiter-v1/gate-3/execution-v1/manifest/manifest.json",
        "unified-intent-arbiter-v1/gate-3/diagnostic-a1/execution-v1/manifest/manifest.json",
        "unified-intent-arbiter-v1/gate-3/ceiling-150-b1/execution-v1/manifest/manifest.json",
        "unified-intent-arbiter-v1/m2-open-development/execution-v1/manifest/manifest.json",
        "unified-intent-arbiter-v1/m2-long-horizon-c1/execution-v1/manifest/manifest.json",
        "unified-intent-arbiter-v2/gate-2/execution-v1/manifest/manifest.json",
    ];
    const registry = [...suffixes.map((s) => path.join(PROJECT, "research-evidence", s)), A1_REGISTRATION];
    if (fileHash(A1_REGISTRATION) !== A1_REGISTRATION_SHA) throw new Error("D1 consumed A1 registration changed");
    const a1 = json(A1_REGISTRATION);
    exact(a1.plan, a1PlanModule.buildUnifiedIntentV2OD1Plan(plan.maps), "D1 complete consumed A1 population");
    const receipt = path.join(GATE2_ROOT, "manifest-submission-v1.json");
    const permitted = new Set([...registry, CERT, receipt]);
    const names = execFileSync("/usr/bin/find", [PROJECT,
        "(", "-name", "node_modules", "-o", "-name", ".git", ")", "-prune", "-o",
        "-type", "f", "-newermt", "2026-09-09 06:35:54 UTC",
        "(", "-iname", "*manifest*.json", "-o", "-iname", "*selection*.json",
        "-o", "-iname", "*reservation*.json", "-o", "-iname", "*plan*.json",
        "-o", "-path", "*/manifest/record.json", ")", "-print0"],
        { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 }).split("\0").filter(Boolean).sort();
    validateD1RegistrationScan(names, [...permitted], registry);
    const proposed = [...plan.cases, ...plan.canaries, plan.smoke].map((c) => c.requestedEngineSeed);
    if (proposed.length !== 205 || new Set(proposed).size !== 205) throw new Error("D1 fresh seed population invalid");
    const requested = new Set(proposed), records = [];
    for (const file of registry) {
        const expected = file === A1_REGISTRATION ? A1_REGISTRATION_SHA :
            a1.seedAudit.inspectedRegistrationFiles.find(r => r.path === file)?.sha256;
        if (!expected || fileHash(file) !== expected) throw new Error("D1 prior registration hash drifted");
        const seeds = registeredD1Seeds(json(file), proposed);
        records.push({ ...fileIdentity(file), definitions: seeds.length, distinctSeeds: new Set(seeds).size,
            minSeed: Math.min(...seeds), maxSeed: Math.max(...seeds),
            seedsSha256: hash(JSON.stringify(seeds)), collisions: 0 });
    }
    const abandonedRoot = path.join(OD1_STUDY, "execution-v1/manifest");
    const failureFile = path.join(abandonedRoot, "FAILURE.json");
    const journalFile = path.join(abandonedRoot, "COMPLETE");
    const auditFile = path.join(OD1_STUDY, "selector-failure-audit-v1.json");
    if (fileHash(failureFile) !== "ca726a89c6dcd00635f4eae458aafb53ea6d1fd7f9354b254860b4979aef4a2b" ||
        fileHash(journalFile) !== "9dd5fe87d5e08e15884a0821dc8a1b41fa6f0578cb6fc7eae9a5a6854b54b9c6" ||
        fileHash(auditFile) !== "04a7ab8f3c9ce8ceecbacc818e1d38d7ab35453b9318b57756a230d3ad85b7b3" ||
        fs.existsSync(path.join(abandonedRoot, "record.json"))) throw new Error("D1 abandoned predecessor evidence drifted");
    const failure = json(failureFile), oldPlan = originalPlanModule.buildUnifiedIntentV2OD1Plan(plan.maps);
    const abandonedLaunches = parseLegacyLaunchMarker(fs.readFileSync(journalFile, "utf8"));
    exact(abandonedLaunches, failure.launches, "D1 abandoned launch journal");
    exact(abandonedLaunches, [...oldPlan.cases, ...oldPlan.canaries, oldPlan.smoke].map((c) => ({
        role: c.role, caseIndex: c.caseIndex, arm: "disabled", mode: "zero_update",
        requestedEngineSeed: c.requestedEngineSeed,
    })), "D1 abandoned frozen population");
    if (failure.mode !== "prepare" || failure.sourceCommit !== "468dae122744505a7c46e3de1b0d13c4fa15d13a" ||
        failure.scheduler.jobId !== "26516850" || abandonedLaunches.some((l) => requested.has(l.requestedEngineSeed))) {
        throw new Error("D1 A1 overlaps or misidentifies the abandoned selector");
    }
    const abandonedAccounting = execFileSync("/opt/slurm/current/bin/sacct", [
        "-X", "-n", "-P", "-j", "26516850",
        "--format=JobIDRaw,Account,Partition,State,ExitCode,AllocCPUS,Restarts",
    ], { encoding: "utf8" }).trim();
    if (abandonedAccounting !== "26516850|pi_jss233|day|FAILED|1:0|1|0") {
        throw new Error("D1 abandoned selector accounting drifted");
    }
    return buildD1RegistrationAudit({
        certificate: { path: CERT, sha256: CERT_SHA, interval: [3350000000, 3351000000] },
        registrationRoot: PROJECT, registrationAfterUtc: "2026-09-09T06:35:54Z",
        records, supportingMetadata: [fileIdentity(CERT), fileIdentity(receipt)],
        proposedSeeds: proposed,
        od1A1: { zeroUpdateInitializations: 905, advancingEpisodes: 1818,
            manifest: fileIdentity(A1_REGISTRATION), selectorJobId: "26539451",
            arrayJobId: "27061644", finalizerJobId: "27061645", independentAuditJobId: "27089677" },
        abandonedSelector: { jobId: "26516850", sourceCommit: failure.sourceCommit,
            zeroUpdateInitializations: 905, advancingEpisodes: 0, accounting: abandonedAccounting,
            failure: fileIdentity(failureFile), launchJournal: fileIdentity(journalFile),
            independentAudit: fileIdentity(auditFile) },
    });
};
