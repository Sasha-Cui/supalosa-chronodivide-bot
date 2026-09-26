import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import {
    REPO,
    PROJECT,
    DRIVER,
    PROTOCOL_SHA,
    hash,
    fileHash,
    fileIdentity,
    json,
    exact,
    requireTrue,
    required,
    requiredHash,
    git,
    hashTree,
    schedulerIdentity,
} from "./strategic-s1-io.mjs";
import { CERT, CERT_SHA, REGISTRATIONS } from "./strategic-s1-registration.mjs";
import { transformExplicitStartRuntime, EXPLICIT_START_SYMBOL } from "./explicit-start-transform-v1.mjs";
import { OD1_MAP_IDS } from "../../packages/chronodivide-bot-driver/dist/training/unifiedIntentV2OD1Plan.js";

export const PROTOCOL = path.join(REPO, "research/protocols/method/2026-09-25-strategic-diagnostic-s1.md");
export const PROGRAM = path.join(REPO, "research/scripts/strategic-s1.mjs");
export const PURE_PROGRAM = path.join(REPO, "research/scripts/strategic-s1-pure.mjs");
export const STAGE_SCRIPT = path.join(REPO, "research/slurm/strategic_s1_stage.sbatch");
export const PURE_SCRIPT = path.join(REPO, "research/slurm/strategic_s1_pure.sbatch");
export const CONFIGURED_GAME_API = path.join(DRIVER, "node_modules/@chronodivide/game-api/dist/index.js");
const RUNTIME = path.join(
    PROJECT,
    "research-evidence/fresh-dual-endpoint-v1/execution-v1/runtime-freeze/runtime-freeze.json",
);
const RUNTIME_SHA = "be47027c8526daa961500a1ca2acc3c04dd1a487460d4dec78361faa03ece649";
const GATE2_RESULT = path.join(
    PROJECT,
    "research-evidence/unified-intent-arbiter-v2/gate-2/execution-v1/finalizer/aggregate.json",
);
const GATE2_RESULT_SHA = "be3a7fcdfc261f4eb60c0dd812b43525484ca7ac2496cf152c810229cf5547d3";
export const requiredHarnessFiles = [
    "research/runtime/strategic-s1-io.mjs",
    "research/runtime/strategic-s1-registration.mjs",
    "research/runtime/strategic-s1-contract.mjs",
    "research/runtime/strategic-s1-provenance.mjs",
    "research/runtime/strategic-s1-stages.mjs",
    "research/runtime/strategic-s1-gates.mjs",
    "research/runtime/strategic-s1-tests.mjs",
    "research/scripts/strategic-s1.mjs",
    "research/scripts/strategic-s1-pure.mjs",
    "research/scripts/submit-strategic-s1.mjs",
    "research/slurm/strategic_s1_pure.sbatch",
    "research/slurm/strategic_s1_stage.sbatch",
    "research/tests/strategic-s1-runtime.test.mjs",
    "research/tests/strategic-s1-harness.test.mjs",
    "research/runtime/strategic-s1-golden.mjs",
    "research/fixtures/strategic-s1-prechange.json",
    "research/runtime/unified-intent-d1-golden.mjs",
    "research/fixtures/unified-intent-d1-prechange.json",
    "research/runtime/unified-intent-v2-od1-io.mjs",
    "research/runtime/explicit-start-loader-v1.mjs",
    "research/runtime/explicit-start-transform-v1.mjs",
    "research/protocols/method/2026-09-25-strategic-diagnostic-s1.md",
    "package.json",
    "package-lock.json",
    "packages/chronodivide-bot/package.json",
    "packages/chronodivide-bot-driver/package.json",
    "packages/chronodivide-bot-driver/pnpm-lock.yaml",
];
export const missingHarnessFiles = () => requiredHarnessFiles.filter((p) => !fs.existsSync(path.join(REPO, p)));
export function sourceFiles() {
    requireTrue(
        missingHarnessFiles().length === 0,
        "complete harness required; missing " + missingHarnessFiles().join(","),
    );
    const tracked = git(
        "ls-files",
        "packages/chronodivide-bot/src",
        "packages/chronodivide-bot-driver/src",
        "research/runtime",
        "research/tests",
        "research/scripts",
        "research/slurm",
    )
        .split("\n")
        .filter((p) => /\.(ts|mjs|js|sbatch|sh)$/.test(p));
    return [...new Set([...requiredHarnessFiles, ...tracked])].sort().map((p) => fileIdentity(path.join(REPO, p)));
}
export function configuration() {
    requireTrue(process.env.CHRONO_AI_INI_PATH === undefined, "AI override must remain absent");
    const driverAi = path.join(DRIVER, "data/ai.ini"),
        repoAi = path.join(REPO, "data/ai.ini");
    requireTrue(!fs.existsSync(repoAi), "repository AI override appeared");
    const ai = fileIdentity(driverAi);
    requireTrue(
        ai.bytes === 84972 && ai.sha256 === "1feac6ddea6886b177ddf7e5f8580b7a99a63f12684f2cbb42831671bb7a8a79",
        "optional driver AI binding",
    );
    return {
        cwd: REPO,
        aiIniOverride: null,
        aiIniCandidates: [null, { present: true, ...ai }, { path: repoAi, present: false }],
        configuredGameApiPath: CONFIGURED_GAME_API,
        participantNames: ["OD1Candidate", "OD1Opponent"],
        participantRngIdentities: ["candidate", "opponent"],
        observationMode: "api_full_state",
        arbiterEnabled: false,
    };
}
export function sourceSnapshot(stage) {
    const sourceCommit = required("SOURCE_COMMIT"),
        program = stage === "pure" ? PURE_PROGRAM : PROGRAM,
        script = stage === "pure" ? PURE_SCRIPT : STAGE_SCRIPT;
    requireTrue(
        process.version === "v20.13.1" &&
            /^[0-9a-f]{40}$/.test(sourceCommit) &&
            git("branch", "--show-current") === "main" &&
            git("rev-parse", "HEAD") === sourceCommit &&
            git("rev-parse", "fork/main") === sourceCommit &&
            git("status", "--porcelain=v1") === "" &&
            process.cwd() === REPO &&
            fileHash(PROTOCOL) === PROTOCOL_SHA &&
            requiredHash("PROTOCOL_SHA256") === PROTOCOL_SHA &&
            fileHash(program) === requiredHash("PROGRAM_SHA256") &&
            fileHash(script) === requiredHash("SCRIPT_SHA256"),
        "source/protocol/program identity",
    );
    return {
        sourceCommit,
        programSha256: fileHash(program),
        scriptSha256: fileHash(script),
        protocolSha256: PROTOCOL_SHA,
        configuration: configuration(),
        files: sourceFiles(),
        driverTree: hashTree(path.join(DRIVER, "dist")),
        candidateTree: hashTree(path.join(REPO, "packages/chronodivide-bot/dist")),
    };
}
export function assertSource(stage) {
    schedulerIdentity(stage);
    return sourceSnapshot(stage);
}
/** Read-only metadata/content verification. Never calls init/createGame or performs a seed census. */
export function verifyRuntime() {
    requireTrue(
        fileHash(RUNTIME) === RUNTIME_SHA &&
            fileHash(CERT) === CERT_SHA &&
            fileHash(REGISTRATIONS[6].path) === REGISTRATIONS[6].sha256 &&
            fileHash(GATE2_RESULT) === GATE2_RESULT_SHA,
        "runtime/prerequisite binding",
    );
    const frozen = json(RUNTIME).frozen,
        prior = json(REGISTRATIONS[6].path),
        gate = json(GATE2_RESULT),
        certificate = json(CERT);
    requireTrue(
        frozen.nodeVersion === "v20.13.1" &&
            gate.complete === true &&
            gate.passed === true &&
            gate.tasks === 925 &&
            gate.exactDuplicates === 25 &&
            certificate.complete === true &&
            certificate.passed === true &&
            certificate.selectedBase === 3350000000,
        "prerequisite eligibility",
    );
    exact(certificate.selectedInterval, [3350000000, 3351000000], "certified interval");
    const requireDriver = createRequire(path.join(DRIVER, "package.json"));
    const resolvedPath = fs.realpathSync(requireDriver.resolve("@chronodivide/game-api"));
    requireTrue(
        resolvedPath === frozen.gameApi.path &&
            resolvedPath === frozen.gameApi.externalBaselineResolvedPath &&
            fileHash(resolvedPath) === frozen.gameApi.sha256 &&
            fs.realpathSync(CONFIGURED_GAME_API) === resolvedPath,
        "game-api original path/bytes",
    );
    const effectiveSha256 = hash(transformExplicitStartRuntime(fs.readFileSync(resolvedPath)));
    requireTrue(effectiveSha256 === frozen.gameApi.effectiveSha256, "effective explicit-start bytes");
    exact(
        hashTree(frozen.externalSupalosa.runtimeTree.root),
        frozen.externalSupalosa.runtimeTree,
        "pinned external Supalosa tree",
    );
    const maps = OD1_MAP_IDS.map((id) => {
        const map = frozen.maps.find((m) => m.id === id);
        requireTrue(
            map &&
                path.resolve(map.absolutePath).startsWith(PROJECT + "/") &&
                fileHash(map.absolutePath) === map.sha256,
            "map binding",
        );
        return { ...map, advancedEligible: id.startsWith("hfo-") };
    });
    exact(maps, prior.plan.maps, "frozen map ordering");
    requireTrue(
        frozen.assets.count === 335 &&
            frozen.assets.entries.length === 335 &&
            new Set(frozen.assets.entries.map((e) => e.name)).size === 335,
        "asset population",
    );
    requireTrue(path.resolve(frozen.assets.root).startsWith(PROJECT + "/"), "assets outside permitted project");
    for (const entry of frozen.assets.entries) {
        const file = path.resolve(frozen.assets.root, entry.name);
        requireTrue(
            file.startsWith(path.resolve(frozen.assets.root) + "/") && fileHash(file) === entry.sha256,
            "asset binding",
        );
    }
    const advanced = frozen.ra2WebAdvanced;
    requireTrue(
        advanced.opponentId === "ra2web_advanced_old_priest" &&
            fileHash(advanced.bundlePath) === advanced.bundleSha256 &&
            fileHash(advanced.manifestPath) === advanced.manifestSha256,
        "pinned Advanced bundle",
    );
    return {
        runtimeFreeze: fileIdentity(RUNTIME),
        certificate: fileIdentity(CERT),
        gate2Manifest: fileIdentity(REGISTRATIONS[6].path),
        gate2Aggregate: fileIdentity(GATE2_RESULT),
        gameApi: { ...frozen.gameApi, resolvedPath, effectiveSha256 },
        assets: frozen.assets,
        externalSupalosa: frozen.externalSupalosa,
        advanced,
        maps,
        configuration: configuration(),
    };
}
export function verifyLoadedRuntime(runtime) {
    requireTrue(process.env.CHRONO_GAME_API_PATH === CONFIGURED_GAME_API, "explicit-start configured route");
    exact(
        globalThis[Symbol.for(EXPLICIT_START_SYMBOL)],
        {
            method: "evaluation-only-explicit-start-v1",
            originalSha256: runtime.gameApi.sha256,
        },
        "loaded explicit-start marker",
    );
}
