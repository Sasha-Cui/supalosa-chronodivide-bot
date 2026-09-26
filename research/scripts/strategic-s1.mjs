#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
    REPO,
    DRIVER,
    EXECUTION,
    hash,
    exact,
    requireTrue,
    required,
    requiredHash,
    schedulerIdentity,
    schedulerRows,
    store,
    stageDirectory,
    expectedExecutionFiles,
    executionFiles,
} from "../runtime/strategic-s1-io.mjs";
import {
    assertSource,
    verifyRuntime,
    verifyLoadedRuntime,
    CONFIGURED_GAME_API,
} from "../runtime/strategic-s1-provenance.mjs";
import { readPure, readVerification } from "../runtime/strategic-s1-gates.mjs";
import { auditFreshSeeds, buildStrategicS1Plan } from "../runtime/strategic-s1-registration.mjs";
import {
    createS1Bots,
    settingsFor,
    episodeSpec,
    rngBindings,
    zeroObservation,
    launchSpec,
    validateGameModes,
} from "../runtime/strategic-s1-contract.mjs";
import {
    makeBinding,
    stageHeader,
    preparationEnvelope,
    validateStage,
    validateAccounting,
} from "../runtime/strategic-s1-stages.mjs";
import { analyzeStrategicS1Population } from "../../packages/chronodivide-bot-driver/dist/training/strategicS1Population.js";
import { verifySubmission } from "./submit-strategic-s1.mjs";

const markerName = (stage) =>
    ({
        pure: "PURE_VERIFICATION_SHA256",
        prepare: "MANIFEST_VERIFICATION_SHA256",
        "canary-finalize": "CANARY_VERIFICATION_SHA256",
        smoke: "SMOKE_VERIFICATION_SHA256",
    })[stage];
export async function prerequisites(
    stage,
    context,
    storage = store,
    services = { accounting: schedulerRows, verify: readVerification },
) {
    const worker = ["canary", "case"].includes(stage),
        source = context.source.sourceCommit;
    services.verify("pure", context.pure, source, {
        accounting: !worker,
        expectedHash: requiredHash(markerName("pure")),
    });
    if (stage === "prepare") return context;
    const m = storage.read("prepare", null, requiredHash("MANIFEST_SHA256"));
    await validateStage(m.value, "prepare", context);
    services.verify(
        "prepare",
        { path: path.join(stageDirectory("prepare"), "record.json"), bytes: m.bytes, sha256: m.sha256 },
        source,
        { accounting: !worker, expectedHash: requiredHash(markerName("prepare")) },
    );
    if (!worker) services.accounting(m.value.scheduler.jobId, "prepare");
    context = { ...context, manifestSha256: m.sha256, manifest: m.value };
    if (["canary", "canary-finalize"].includes(stage)) return context;
    const c = storage.read("canary-finalize", null, requiredHash("CANARY_GATE_SHA256"));
    await validateStage(c.value, "canary-finalize", context);
    services.verify(
        "canary-finalize",
        { path: path.join(stageDirectory("canary-finalize"), "record.json"), bytes: c.bytes, sha256: c.sha256 },
        source,
        { accounting: !worker, expectedHash: requiredHash(markerName("canary-finalize")) },
    );
    if (!worker) {
        services.accounting(c.value.scheduler.jobId, "canary-finalize");
        services.accounting(c.value.arrayJobId, "canary", 4);
    }
    context = { ...context, canaryGateSha256: c.sha256 };
    if (stage === "smoke") return context;
    const s = storage.read("smoke", null, requiredHash("SMOKE_SHA256"));
    await validateStage(s.value, "smoke", context);
    services.verify(
        "smoke",
        { path: path.join(stageDirectory("smoke"), "record.json"), bytes: s.bytes, sha256: s.sha256 },
        source,
        { accounting: !worker, expectedHash: requiredHash(markerName("smoke")) },
    );
    if (!worker) services.accounting(s.value.scheduler.jobId, "smoke");
    return { ...context, smokeSha256: s.sha256 };
}
export async function executeS1Stage(stage, index, context, services, storage = store) {
    const launches = [],
        launch = (cell, mode) => {
            const value = launchSpec(cell, mode);
            storage.launch(stage, index, value);
            launches.push(value);
        };
    const common = () => stageHeader(stage, context, launches);
    let artifact;
    if (stage === "prepare") {
        const envelope = preparationEnvelope(context, await services.auditSeeds(context.plan));
        // Fail closed on the ENTIRE metadata envelope before API.init or createGame.
        const defs = await services.initialize(context.runtime, context.plan);
        validateGameModes(defs.gameModes, context.plan);
        const observations = [];
        for (const cell of [...context.plan.cases, ...context.plan.canaries, context.plan.smoke]) {
            launch(cell, "zero_update");
            observations.push(await services.zero(cell, defs, context.plan));
        }
        artifact = { ...envelope, complete: true, passed: true, launches, gameModes: defs.gameModes, observations };
    } else if (stage === "canary") {
        const cell = context.plan.canaries[index],
            defs = await services.initialize(context.runtime, context.plan),
            episodes = [];
        for (const mode of ["canary_endpoint_only", "canary_strategic"]) {
            launch(cell, mode);
            episodes.push(await services.episode(cell, mode, defs, context.plan));
        }
        artifact = { ...common(), manifestSha256: context.manifestSha256, assignment: cell, episodes };
    } else if (stage === "canary-finalize") {
        const arrayJobId = services.arrayJobId,
            accounting = await services.accounting(arrayJobId, "canary", 4),
            records = [];
        validateAccounting(accounting, arrayJobId, "canary", 4);
        for (let i = 0; i < 4; i++) {
            const r = storage.read("canary", i);
            await validateStage(r.value, "canary", context, i);
            requireTrue(
                r.value.scheduler.arrayJobId === arrayJobId && r.value.scheduler.jobId === accounting[i].jobId,
                "canary scheduler identity",
            );
            records.push({
                identity: {
                    path: path.join(stageDirectory("canary", i, storage.root), "record.json"),
                    bytes: r.bytes,
                    sha256: r.sha256,
                },
                value: r.value,
            });
        }
        artifact = {
            ...common(),
            manifestSha256: context.manifestSha256,
            configurations: 4,
            advancingEpisodes: 8,
            arrayJobId,
            accounting,
            records,
        };
    } else if (stage === "smoke" || stage === "case") {
        const cell = stage === "smoke" ? context.plan.smoke : context.plan.cases[index],
            mode = stage === "smoke" ? "smoke" : "diagnostic";
        const defs = await services.initialize(context.runtime, context.plan);
        launch(cell, mode);
        const episode = await services.episode(cell, mode, defs, context.plan);
        artifact = {
            ...common(),
            manifestSha256: context.manifestSha256,
            canaryGateSha256: context.canaryGateSha256,
            ...(stage === "case" ? { smokeSha256: context.smokeSha256 } : {}),
            assignment: cell,
            ...(stage === "case" ? { mapSha256: context.plan.maps.find((m) => m.id === cell.mapId).sha256 } : {}),
            episode,
        };
    } else if (stage === "finalize") {
        // This call MUST precede any main-game read. No partial payload or subset path.
        const arrayJobId = services.arrayJobId,
            accounting = await services.accounting(arrayJobId, "case", 200);
        validateAccounting(accounting, arrayJobId, "case", 200);
        const rows = [],
            recordIdentities = [];
        for (let i = 0; i < 200; i++) {
            const r = storage.read("case", i);
            await validateStage(r.value, "case", context, i);
            requireTrue(
                r.value.scheduler.arrayJobId === arrayJobId && r.value.scheduler.jobId === accounting[i].jobId,
                "main scheduler identity",
            );
            rows.push({ assignment: r.value.assignment, episode: r.value.episode });
            recordIdentities.push({
                caseIndex: i,
                jobId: r.value.scheduler.jobId,
                path: path.join(stageDirectory("case", i, storage.root), "record.json"),
                bytes: r.bytes,
                sha256: r.sha256,
            });
        }
        const analysis = await services.analyze(context.plan, rows);
        artifact = {
            ...common(),
            manifestSha256: context.manifestSha256,
            canaryGateSha256: context.canaryGateSha256,
            smokeSha256: context.smokeSha256,
            arrayJobId,
            accounting,
            recordIdentities,
            initializations: 205,
            priorZeroUpdateInitializations: 2015,
            cumulativeZeroUpdateInitializations: 2220,
            canaryEpisodes: 8,
            smokeEpisodes: 1,
            diagnosticEpisodes: 200,
            totalAdvancingEpisodes: 209,
            expectedFinalFiles: 416,
            independentAuditPending: true,
            analysis,
            analysisSha256: hash(JSON.stringify(analysis)),
        };
        await services.assertFilePopulation(false);
    } else throw new Error("S1 unknown stage");
    await validateStage(artifact, stage, context, index);
    await services.assertStable();
    const published = storage.publish(stage, index, artifact);
    if (stage === "finalize") await services.assertFilePopulation(true);
    return published;
}
export function realServices(stage, source, runtime) {
    const initialized = new WeakSet();
    return {
        arrayJobId: process.env.ARRAY_JOB_ID ?? null,
        accounting: schedulerRows,
        auditSeeds: auditFreshSeeds,
        async initialize(boundRuntime, plan) {
            requireTrue(
                process.env.MODE === stage && ["prepare", "canary", "smoke", "case"].includes(stage),
                "game initialization stage",
            );
            schedulerIdentity(stage);
            exact(boundRuntime, runtime, "initialization runtime");
            const mod = (relative) => import(pathToFileURL(path.join(DRIVER, "dist", relative)).href);
            const api = await import(pathToFileURL(fs.realpathSync(CONFIGURED_GAME_API)).href);
            verifyLoadedRuntime(runtime);
            process.env.BASELINE_PACKAGE_ROOT = runtime.externalSupalosa.packageRoot;
            process.env.REQUIRE_EXTERNAL_BASELINE = "true";
            const { loadBaselineFactory } = await mod("benchmark/baselineLoader.js");
            const { createDeployedStrongBotCandidate } = await mod("training/deployedStrongBotCandidate.js");
            const { createInspectableRa2WebBot, loadRa2WebOpponent } = await mod("training/ra2WebOpponentBundle.js");
            const { installSymmetricObservationFirewall } = await mod("training/symmetricObservationFirewall.js");
            const { withSeededOfflineGame } = await mod("benchmark/seededOfflineGame.js");
            const { runStrategicS1Episode } = await mod("training/strategicS1Episode.js");
            await api.cdapi.init(runtime.assets.root);
            const factory = await loadBaselineFactory(path.join(REPO, "packages/chronodivide-bot"));
            requireTrue(
                factory.descriptor.kind === "external-package" &&
                    path.resolve(factory.descriptor.packageRoot) === runtime.externalSupalosa.packageRoot,
                "external factory",
            );
            const advanced = loadRa2WebOpponent(runtime.advanced.freezeRoot, runtime.advanced.opponentId);
            const gameModes = Object.fromEntries(
                plan.maps.map((m) => {
                    requireTrue(api.cdapi.getAvailableGameModes(m.fileName)[0] === 1, "default map mode");
                    return [m.id, 1];
                }),
            );
            const value = {
                api: api.cdapi,
                gameModes,
                withSeededOfflineGame,
                runStrategicS1Episode,
                dependencies: {
                    createCandidate: createDeployedStrongBotCandidate,
                    createBaseline: (name, country) => factory.create(name, country),
                    createAdvanced: (name, country) => createInspectableRa2WebBot(advanced, name, country),
                    installFirewall: installSymmetricObservationFirewall,
                },
            };
            initialized.add(value);
            return value;
        },
        async zero(cell, defs, plan) {
            requireTrue(initialized.has(defs), "uninitialized definitions");
            const bots = createS1Bots(cell, plan, defs.dependencies),
                options = settingsFor(cell, plan, bots, defs.gameModes);
            return defs.withSeededOfflineGame(
                defs.api,
                options,
                cell.requestedEngineSeed,
                rngBindings(bots),
                async (instance) => zeroObservation(cell, plan, bots, instance, options),
            );
        },
        async episode(cell, mode, defs, plan) {
            requireTrue(initialized.has(defs), "uninitialized definitions");
            const bots = createS1Bots(cell, plan, defs.dependencies);
            return defs.runStrategicS1Episode({ api: defs.api, spec: episodeSpec(cell, plan), mode, ...bots });
        },
        analyze: analyzeStrategicS1Population,
        assertStable: () => {
            exact(assertSource(stage), source, "source stability");
            exact(verifyRuntime(), runtime, "runtime stability");
        },
        assertFilePopulation: (complete) => {
            const expected = expectedExecutionFiles().filter(
                (p) => complete || !p.startsWith(stageDirectory("finalize") + "/"),
            );
            exact(executionFiles(), expected, "full exact execution file population");
        },
    };
}
export async function main() {
    const stage = required("MODE"),
        index = process.env.SLURM_ARRAY_TASK_ID === undefined ? null : Number(process.env.SLURM_ARRAY_TASK_ID);
    stageDirectory(stage, index);
    store.reserve(stage, index);
    try {
        const source = assertSource(stage),
            runtime = verifyRuntime(),
            plan = buildStrategicS1Plan(runtime.maps);
        verifySubmission(stage, source, runtime, schedulerIdentity(stage));
        const pure = readPure(source, runtime, { accounting: !["case", "canary"].includes(stage) });
        let context = {
            source,
            runtime,
            plan,
            pure,
            bindings: makeBinding(source, runtime, pure),
            scheduler: schedulerIdentity(stage),
        };
        context = await prerequisites(stage, context);
        const result = await executeS1Stage(stage, index, context, realServices(stage, source, runtime));
        console.log(JSON.stringify({ complete: true, stage, ...result }));
    } catch (error) {
        const location = String(error.stack ?? "")
            .split("\n")
            .filter((l) => l.includes(REPO))
            .map((l) => l.match(/\/nfs\/[^\s)]+:\d+:\d+/)?.[0])
            .filter(Boolean)
            .slice(0, 4);
        store.fail(stage, index, {
            complete: false,
            passed: false,
            technicalOnly: true,
            stage,
            sourceCommit: process.env.SOURCE_COMMIT ?? null,
            jobId: process.env.SLURM_JOB_ID ?? null,
            errorType: String(error.name),
            errorMessageSha256: hash(String(error.message)),
            location,
        });
        console.error(
            "S1 failed closed; inspect outcome-free failure identity/source, never partial competitive logs or payloads.",
        );
        process.exitCode = 1;
    }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))
    main().catch(() => {
        process.exitCode = 1;
    });
