import path from "node:path";
import {
    PROJECT,
    PROTOCOL_SHA,
    SHA,
    hash,
    encode,
    stageDirectory,
    MAX_MAIN_BYTES,
    exact,
    fields,
    requireTrue,
    assertJsonValue,
    requestFor,
    parseSchedulerRows,
} from "./strategic-s1-io.mjs";
import { expectedLaunches, checkedCell, validateGameModes } from "./strategic-s1-contract.mjs";
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
} from "./strategic-s1-registration.mjs";
import { validateStrategicS1Plan } from "../../packages/chronodivide-bot-driver/dist/training/strategicS1Plan.js";
import {
    validateS1CanaryPair,
    validateS1Smoke,
    validateS1Diagnostic,
} from "../../packages/chronodivide-bot-driver/dist/training/strategicS1Results.js";
export const KINDS = {
    prepare: "strategic-s1-manifest-v1",
    canary: "strategic-s1-canary-task-v1",
    "canary-finalize": "strategic-s1-canary-aggregate-v1",
    smoke: "strategic-s1-smoke-v1",
    case: "strategic-s1-case-v1",
    finalize: "strategic-s1-aggregate-v1",
};
export const digest = (value) => hash(JSON.stringify(value));
export const descriptor = (x) => {
    fields(x, ["path", "bytes", "sha256"], "artifact descriptor");
    requireTrue(
        typeof x.path === "string" &&
            x.path.startsWith("/") &&
            Number.isSafeInteger(x.bytes) &&
            x.bytes > 0 &&
            SHA.test(x.sha256),
        "descriptor values",
    );
};
export const makeBinding = (source, runtime, pure) => ({
    sourceCommit: source.sourceCommit,
    programSha256: source.programSha256,
    scriptSha256: source.scriptSha256,
    protocolSha256: source.protocolSha256,
    sourceBindingSha256: digest(source),
    runtimeBindingSha256: digest(runtime),
    pureSha256: pure.sha256,
});
export function validateBinding(value) {
    fields(value, [
        "sourceCommit",
        "programSha256",
        "scriptSha256",
        "protocolSha256",
        "sourceBindingSha256",
        "runtimeBindingSha256",
        "pureSha256",
    ]);
    requireTrue(
        /^[0-9a-f]{40}$/.test(value.sourceCommit) &&
            value.protocolSha256 === PROTOCOL_SHA &&
            Object.entries(value)
                .filter(([k]) => k !== "sourceCommit")
                .every(([, v]) => SHA.test(v)),
        "stage binding",
    );
}
export function validateScheduler(s, stage, index = null) {
    fields(s, ["jobId", "arrayJobId", "arrayTaskId", "account", "partition", "cpus", "restarts"]);
    requireTrue(
        /^\d+$/.test(s.jobId) && s.account === "pi_jss233" && s.partition === "day" && s.cpus === 1 && s.restarts === 0,
        "stage scheduler",
    );
    if (stage === "case" || stage === "canary")
        requireTrue(/^\d+$/.test(s.arrayJobId) && s.arrayTaskId === String(index), "stage array identity");
    else requireTrue(s.arrayJobId === null && s.arrayTaskId === null, "scalar job identity");
}
export const stageRequest = (stage) => ({ ...requestFor(stage), nodes: 1, gpus: 0, requeue: false });
export const stageHeader = (stage, context, launches) => ({
    kind: KINDS[stage],
    stage,
    complete: true,
    passed: true,
    technicalOnly: !["case", "finalize"].includes(stage),
    bindings: context.bindings,
    scheduler: context.scheduler,
    request: stageRequest(stage),
    launches,
});
const commonKeys = [
    "kind",
    "stage",
    "complete",
    "passed",
    "technicalOnly",
    "bindings",
    "scheduler",
    "request",
    "launches",
];
const extras = {
    prepare: ["source", "runtime", "pure", "plan", "seedAudit", "gameModes", "observations"],
    canary: ["manifestSha256", "assignment", "episodes"],
    "canary-finalize": ["manifestSha256", "configurations", "advancingEpisodes", "arrayJobId", "accounting", "records"],
    smoke: ["manifestSha256", "canaryGateSha256", "assignment", "episode"],
    case: ["manifestSha256", "canaryGateSha256", "smokeSha256", "assignment", "mapSha256", "episode"],
    finalize: [
        "manifestSha256",
        "canaryGateSha256",
        "smokeSha256",
        "arrayJobId",
        "accounting",
        "recordIdentities",
        "initializations",
        "priorZeroUpdateInitializations",
        "cumulativeZeroUpdateInitializations",
        "canaryEpisodes",
        "smokeEpisodes",
        "diagnosticEpisodes",
        "totalAdvancingEpisodes",
        "expectedFinalFiles",
        "independentAuditPending",
        "analysis",
        "analysisSha256",
    ],
};
export function validateSeedAudit(a, plan) {
    fields(a, [
        "kind",
        "complete",
        "passed",
        "technicalOnly",
        "registrationRoot",
        "registrationAfterUtc",
        "discovered",
        "inspectedRegistrationFiles",
        "supportingMetadata",
        "abandonedSelector",
        "od1A1",
        "d1",
        "priorZeroUpdateInitializations",
        "newSeeds",
        "collisions",
        "scope",
    ]);
    requireTrue(
        a.kind === "strategic-s1-registration-audit-v1" &&
            a.complete === true &&
            a.passed === true &&
            a.technicalOnly === true &&
            a.collisions === 0 &&
            a.priorZeroUpdateInitializations === 2015,
        "registration completion",
    );
    exact(a.discovered, permittedRegistrations(), "registration census");
    requireTrue(
        a.registrationRoot === PROJECT && a.registrationAfterUtc === REGISTRATION_AFTER_UTC,
        "census root/time",
    );
    exact(
        a.scope,
        "Registration/certificate/journal metadata only; no competitive payloads opened or engine initialized.",
        "census scope",
    );
    requireTrue(a.inspectedRegistrationFiles.length === 9, "registration count");
    for (const [i, r] of a.inspectedRegistrationFiles.entries()) {
        fields(r, [
            "path",
            "bytes",
            "sha256",
            "definitions",
            "distinctSeeds",
            "minSeed",
            "maxSeed",
            "seedsSha256",
            "collisions",
        ]);
        const expected = REGISTRATIONS[i];
        requireTrue(
            r.path === expected.path &&
                r.sha256 === expected.sha256 &&
                r.definitions === expected.definitions &&
                r.collisions === 0 &&
                Number.isSafeInteger(r.bytes) &&
                r.bytes > 0 &&
                SHA.test(r.seedsSha256) &&
                Number.isSafeInteger(r.distinctSeeds) &&
                r.distinctSeeds > 0 &&
                r.distinctSeeds <= r.definitions &&
                Number.isSafeInteger(r.minSeed) &&
                Number.isSafeInteger(r.maxSeed) &&
                r.minSeed >= 3350000000 &&
                r.maxSeed < 3351000000 &&
                r.minSeed <= r.maxSeed,
            "registration descriptor",
        );
    }
    requireTrue(a.supportingMetadata.length === 3, "supporting metadata count");
    for (const [i, [p, sha]] of [
        [CERT, CERT_SHA],
        [CERT_AUDIT, CERT_AUDIT_SHA],
        [GATE2_RECEIPT, GATE2_RECEIPT_SHA],
    ].entries()) {
        descriptor(a.supportingMetadata[i]);
        requireTrue(
            a.supportingMetadata[i].path === p && a.supportingMetadata[i].sha256 === sha,
            "supporting metadata binding",
        );
    }
    fields(a.abandonedSelector, [
        "jobId",
        "zeroUpdateInitializations",
        "advancingEpisodes",
        "accounting",
        "failure",
        "launchJournal",
        "audit",
    ]);
    exact(
        a.supportingMetadata.map((d) => d.bytes),
        [4399, 585357862, 663],
        "supporting metadata sizes",
    );
    requireTrue(
        a.abandonedSelector.jobId === "26516850" &&
            a.abandonedSelector.zeroUpdateInitializations === 905 &&
            a.abandonedSelector.advancingEpisodes === 0 &&
            a.abandonedSelector.accounting === "26516850|pi_jss233|day|FAILED|1:0|1|0",
        "failed selector history",
    );
    for (const key of ["failure", "launchJournal", "audit"]) descriptor(a.abandonedSelector[key]);
    for (const [key, relative, sha] of [
        [
            "failure",
            "execution-v1/manifest/FAILURE.json",
            "ca726a89c6dcd00635f4eae458aafb53ea6d1fd7f9354b254860b4979aef4a2b",
        ],
        [
            "launchJournal",
            "execution-v1/manifest/COMPLETE",
            "9dd5fe87d5e08e15884a0821dc8a1b41fa6f0578cb6fc7eae9a5a6854b54b9c6",
        ],
        ["audit", "selector-failure-audit-v1.json", "04a7ab8f3c9ce8ceecbacc818e1d38d7ab35453b9318b57756a230d3ad85b7b3"],
    ])
        requireTrue(
            a.abandonedSelector[key].path ===
                path.join(PROJECT, "research-evidence/unified-intent-arbiter-v2/od1", relative) &&
                a.abandonedSelector[key].sha256 === sha,
            "failed selector file binding",
        );
    for (const [key, n, advancing, i] of [
        ["od1A1", 905, 1818, 7],
        ["d1", 205, 627, 8],
    ]) {
        fields(a[key], ["definitions", "zeroUpdateInitializations", "advancingEpisodes", "manifest"]);
        requireTrue(
            a[key].definitions === n &&
                a[key].zeroUpdateInitializations === n &&
                a[key].advancingEpisodes === advancing,
            "prior counts",
        );
        exact(a[key].manifest, a.inspectedRegistrationFiles[i], "prior manifest descriptor");
    }
    const seeds = proposedS1Seeds(plan);
    exact(
        a.newSeeds,
        { count: 205, min: Math.min(...seeds), max: Math.max(...seeds), sha256: digest(seeds) },
        "new seed descriptor",
    );
}
export function expectedZeroObservation(c) {
    return {
        caseIndex: c.caseIndex,
        requestedEngineSeed: c.requestedEngineSeed,
        updates: 0,
        candidateStart: c.candidateStart,
        opponentStart: c.opponentStart,
        candidateCountry: c.country,
        opponentCountry: c.country,
        candidateStartOrdinal: c.candidateStartOrdinal,
        opponentStartOrdinal: c.opponentStartOrdinal,
        candidateSlot: c.candidateSlot,
        agentOrder: c.candidateSlot === 0 ? ["OD1Candidate", "OD1Opponent"] : ["OD1Opponent", "OD1Candidate"],
        slotVerification: "source-bound-agent-order-and-pinned-creator",
        seedVerification: "pinned-date-now-seconds-shim-and-participant-stream-derivation",
    };
}
export function validatePreparation(v, context, beforeInitialization = false) {
    fields(v, [...commonKeys, ...extras.prepare]);
    assertJsonValue(v);
    validateBinding(v.bindings);
    exact(v.bindings, context.bindings, "preparation binding");
    validateScheduler(v.scheduler, "prepare");
    exact(v.request, stageRequest("prepare"), "preparation resources");
    requireTrue(
        v.kind === KINDS.prepare &&
            v.stage === "prepare" &&
            v.technicalOnly === true &&
            v.complete === !beforeInitialization &&
            v.passed === !beforeInitialization,
        "preparation state",
    );
    exact(v.source, context.source, "preparation source");
    exact(v.runtime, context.runtime, "preparation runtime");
    exact(v.pure, context.pure, "preparation pure");
    exact(v.plan, context.plan, "preparation plan");
    validateStrategicS1Plan(v.plan);
    validateSeedAudit(v.seedAudit, v.plan);
    if (beforeInitialization) {
        exact(v.launches, [], "preinit launches");
        exact(v.gameModes, {}, "preinit modes");
        exact(v.observations, [], "preinit observations");
    } else {
        validateGameModes(v.gameModes, v.plan);
        exact(v.launches, expectedLaunches("prepare", v.plan), "selector journal");
        exact(
            v.observations,
            [...v.plan.cases, ...v.plan.canaries, v.plan.smoke].map(expectedZeroObservation),
            "complete zero-update observations",
        );
    }
}
export const preparationEnvelope = (context, seedAudit) => {
    const v = {
        ...stageHeader("prepare", context, []),
        complete: false,
        passed: false,
        source: context.source,
        runtime: context.runtime,
        pure: context.pure,
        plan: context.plan,
        seedAudit,
        gameModes: {},
        observations: [],
    };
    validatePreparation(v, context, true);
    return v;
};
export function validateAccounting(rows, arrayJobId, stage, count) {
    const keys = [
        "label",
        "jobId",
        "state",
        "exitCode",
        "account",
        "partition",
        "cpus",
        "restarts",
        "elapsedSeconds",
        "reqMem",
        "timeLimitMinutes",
        "workDir",
    ];
    requireTrue(Array.isArray(rows), "accounting array");
    rows.forEach((r) => fields(r, keys));
    return parseSchedulerRows(
        rows.map((r) => keys.map((k) => r[k]).join("|")).join("\n") + "\n",
        arrayJobId,
        stage,
        count,
    );
}
export async function validateStage(v, stage, context, index = null) {
    if (stage === "prepare") {
        validatePreparation(v, context);
        return;
    }
    requireTrue(Object.hasOwn(extras, stage), "stage kind");
    fields(v, [...commonKeys, ...extras[stage]]);
    assertJsonValue(v);
    validateBinding(v.bindings);
    exact(v.bindings, context.bindings, "stage binding");
    validateScheduler(v.scheduler, stage, index);
    exact(v.request, stageRequest(stage), "stage resource request");
    requireTrue(
        v.kind === KINDS[stage] &&
            v.stage === stage &&
            v.complete === true &&
            v.passed === true &&
            v.technicalOnly === !["case", "finalize"].includes(stage),
        "stage completion",
    );
    exact(v.launches, expectedLaunches(stage, context.plan, index), "stage launch population");
    requireTrue(v.manifestSha256 === context.manifestSha256, "manifest binding");
    if (stage === "canary") {
        exact(v.assignment, context.plan.canaries[index], "canary assignment");
        validateS1CanaryPair(v.episodes, v.assignment);
    } else if (stage === "canary-finalize") {
        requireTrue(
            v.configurations === 4 && v.advancingEpisodes === 8 && v.records.length === 4,
            "canary aggregate population",
        );
        const accounting = validateAccounting(v.accounting, v.arrayJobId, "canary", 4);
        for (const [i, record] of v.records.entries()) {
            fields(record, ["identity", "value"]);
            descriptor(record.identity);
            const encoded = encode(record.value);
            requireTrue(
                record.identity.path === path.join(stageDirectory("canary", i, context.executionRoot), "record.json") &&
                    record.identity.bytes === Buffer.byteLength(encoded) &&
                    record.identity.bytes <= MAX_MAIN_BYTES &&
                    record.identity.sha256 === hash(encoded),
                "canary embedded record identity",
            );
            await validateStage(record.value, "canary", context, i);
            requireTrue(
                record.value.scheduler.arrayJobId === v.arrayJobId &&
                    record.value.scheduler.jobId === accounting[i].jobId,
                "canary scheduler join",
            );
        }
    } else if (stage === "smoke") {
        requireTrue(v.canaryGateSha256 === context.canaryGateSha256, "canary prerequisite");
        exact(v.assignment, context.plan.smoke, "smoke assignment");
        validateS1Smoke(v.episode, v.assignment);
    } else if (stage === "case") {
        requireTrue(
            v.canaryGateSha256 === context.canaryGateSha256 && v.smokeSha256 === context.smokeSha256,
            "diagnostic prerequisites",
        );
        checkedCell(v.assignment, context.plan);
        exact(v.assignment, context.plan.cases[index], "case assignment");
        requireTrue(v.mapSha256 === context.plan.maps.find((m) => m.id === v.assignment.mapId).sha256, "map binding");
        await validateS1Diagnostic(v.episode, v.assignment);
    } else {
        requireTrue(
            v.canaryGateSha256 === context.canaryGateSha256 &&
                v.smokeSha256 === context.smokeSha256 &&
                v.initializations === 205 &&
                v.priorZeroUpdateInitializations === 2015 &&
                v.cumulativeZeroUpdateInitializations === 2220 &&
                v.canaryEpisodes === 8 &&
                v.smokeEpisodes === 1 &&
                v.diagnosticEpisodes === 200 &&
                v.totalAdvancingEpisodes === 209 &&
                v.expectedFinalFiles === 416 &&
                v.independentAuditPending === true,
            "finalizer counts/prerequisites",
        );
        const accounting = validateAccounting(v.accounting, v.arrayJobId, "case", 200);
        requireTrue(v.recordIdentities.length === 200, "main record population");
        for (const [i, r] of v.recordIdentities.entries()) {
            fields(r, ["caseIndex", "jobId", "path", "bytes", "sha256"]);
            requireTrue(
                r.path === path.join(stageDirectory("case", i, context.executionRoot), "record.json") &&
                    r.bytes <= MAX_MAIN_BYTES,
                "main record path/limit",
            );
            requireTrue(
                r.caseIndex === i &&
                    r.jobId === accounting[i].jobId &&
                    SHA.test(r.sha256) &&
                    Number.isSafeInteger(r.bytes) &&
                    r.bytes > 0,
                "main record identity",
            );
        }
        requireTrue(
            v.analysis.kind === "strategic-s1-population-analysis-v1" &&
                v.analysis.complete === true &&
                v.analysis.policyComparison === false &&
                v.analysis.policySelectionAuthorized === false &&
                v.analysis.independentAudit === false &&
                v.analysis.counts.cases === 200 &&
                v.analysis.counts.endpointReplays === 200 &&
                v.analysis.counts.strategicReplays === 200 &&
                v.analysis.counts.strata === 25 &&
                v.analysis.counts.topologies === 5 &&
                v.analysis.counts.groups === 72 &&
                v.analysis.planSha256 === digest(context.plan) &&
                v.analysisSha256 === digest(v.analysis),
            "complete native analysis binding",
        );
    }
}
