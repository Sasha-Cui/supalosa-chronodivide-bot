import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import {
    PROJECT,
    hash,
    fileIdentity,
    fileHash,
    json,
    exact,
    requireTrue,
    schedulerIdentity,
} from "./strategic-s1-io.mjs";
import { parseLaunchMarker as parseOd1Journal } from "./unified-intent-v2-od1-io.mjs";
import {
    buildStrategicS1Plan,
    validateStrategicS1Plan,
} from "../../packages/chronodivide-bot-driver/dist/training/strategicS1Plan.js";
import { buildUnifiedIntentD1Plan } from "../../packages/chronodivide-bot-driver/dist/training/unifiedIntentD1Plan.js";
import { buildUnifiedIntentV2OD1Plan as buildOd1 } from "../../packages/chronodivide-bot-driver/dist/training/unifiedIntentV2OD1Plan.js";
import { buildUnifiedIntentV2OD1Plan as buildA1 } from "../../packages/chronodivide-bot-driver/dist/training/unifiedIntentV2OD1A1Plan.js";

const EVIDENCE = path.join(PROJECT, "research-evidence");
export const CERT = path.join(
    EVIDENCE,
    "unified-intent-arbiter-v1/gate-2/seed-certificate-v1-a4/selection-certificate.json",
);
export const CERT_SHA = "f7f7086d32630b1eede7a300a382a9348d60f610c1768c300cb3818f738307fd";
export const CERT_AUDIT = path.join(EVIDENCE, "unified-intent-arbiter-v1/gate-2/seed-audit-v1-a2/seed-audit.json");
export const CERT_AUDIT_SHA = "6e83a8d51597236dbf1fe80d22262b40bfc737dc6234c68a94853af5ddfaf52a";
export const GATE2_RECEIPT = path.join(EVIDENCE, "unified-intent-arbiter-v2/gate-2/manifest-submission-v1.json");
export const GATE2_RECEIPT_SHA = "65012e6fde4c99fcb20fe7f20c360632193fd2f86a0457f07f2d2c160719680a";
export const REGISTRATIONS = [
    [
        "unified-intent-arbiter-v1/gate-2/execution-v1-wrapper-a1-runtime-a1/manifest/manifest.json",
        "e3f952fd9e81b04baaade58f27d26135c768e1d8282de503bd15f15654845508",
        180,
    ],
    [
        "unified-intent-arbiter-v1/gate-3/execution-v1/manifest/manifest.json",
        "19318cb9b9b06dfeb2e86dcdf2ed34cce550c77831c67c12984698341d279c4b",
        900,
    ],
    [
        "unified-intent-arbiter-v1/gate-3/diagnostic-a1/execution-v1/manifest/manifest.json",
        "5250e332699b52fc5408d709f61843b1963ee9a3d185bf9482eb3a12711dcb37",
        72,
    ],
    [
        "unified-intent-arbiter-v1/gate-3/ceiling-150-b1/execution-v1/manifest/manifest.json",
        "e675cb0d326addc59085bd34aa14cfa614a38ae7e2538c27465370737b73bca7",
        900,
    ],
    [
        "unified-intent-arbiter-v1/m2-open-development/execution-v1/manifest/manifest.json",
        "38462b9e788ba5fa7e54bfef52d1348e48dbdcf31b138c62323e2bf2b06c661b",
        900,
    ],
    [
        "unified-intent-arbiter-v1/m2-long-horizon-c1/execution-v1/manifest/manifest.json",
        "3ccf59b85066477cf287bc317af9af6a33d34a7fb25149ea6ca6c48836cd70b8",
        900,
    ],
    [
        "unified-intent-arbiter-v2/gate-2/execution-v1/manifest/manifest.json",
        "66277b66569b5512e6b286758bbd2cf39bc00427e3c2a7d1c18ec1b49e8b2adc",
        900,
    ],
    [
        "unified-intent-arbiter-v2/od1/execution-a1/manifest/record.json",
        "a595d73b1e06c01e4212add30d19083d6260836cf30b2a2d90fd37762ab99b67",
        905,
    ],
    [
        "unified-intent-arbiter-v2/d1/execution-v1/manifest/record.json",
        "b677746ad35715fda936ae23635583fb383f4f0cabc76e6f11516129f19b2aa0",
        205,
    ],
    [
        "strategic-diagnostic-s1/execution-v1/manifest/record.json",
        "3173064311d3abd927c80e87fb7acc5122a9ce06eaa4670e03954eb8696031db",
        205,
    ],
    [
        "strategic-diagnostic-s1-a1/execution-v1/manifest/record.json",
        "b4812ea6ee38088f418f113a9f547aa12490afb873496f4943c889a164112e65",
        205,
    ],
    [
        "strategic-diagnostic-s1-a2/execution-v1/manifest/record.json",
        "690c92ecb86f72be43dffb2301226100c1b340b95e4e07bd16f104ad291b05b4",
        205,
    ],
    [
        "strategic-diagnostic-s1-a3/execution-v1/manifest/record.json",
        "c4d22ac3b218d0ed6dc14034e123211b864d7b2087e1f74f9bea6b67bbc90ee3",
        205,
    ],
].map(([relative, sha256, definitions]) => ({ path: path.join(EVIDENCE, relative), sha256, definitions }));
export const ORIGINAL_S1_ROOT = path.join(EVIDENCE, "strategic-diagnostic-s1");
export const ORIGINAL_S1_SOURCE = "75280dfa87f101a7865921121e1ec6fcf44a3ea5";
export const ORIGINAL_S1_FILES = [
    ["verification-pure-v1.json", 986, "0050ffcecbb371f3f429a089bcdce2fd9a6a01cb03eecd6dfdcba0ef5cdad6de"],
    ["verification-prepare-v1.json", 1017, "99dfe467fcaffcbed6902138e5673fb08a91707ccb534b6efba71b66db89b070"],
    ["execution-v1/manifest/COMPLETE", 27836, "b334df87fe666d285831711e1442fca10786f32edff934eecf7d55c285b8c098"],
    ["canary-failure-review-v1/record.json", 19887, "e166712d4567f71f987f8c9115061a5106abb35d00adb7c838f038c141ce8876"],
    [
        "canary-failure-review-v1/source-evidence.json",
        4738,
        "5e25c7059df2157a5f80ef20beac7992a70fdc814bd05ef4f598983fa3f653de",
    ],
    ["execution-v1/canary/task-00/COMPLETE", 278, "f384d040c131afdf1b835427cac8f8f746ee5f8b9094b2d9e8e6c5f7ee7005ff"],
    [
        "execution-v1/canary/task-00/FAILURE.json",
        895,
        "ce12a6d166149d867c6a9a33dca263d54404c5e1392e11989a72867255ac74a9",
    ],
    ["execution-v1/canary/task-01/COMPLETE", 278, "087f9c4f8b94e9db7432bc84cc39fb00102e49aa53cf531995f10d5d9f9932ea"],
    [
        "execution-v1/canary/task-01/FAILURE.json",
        895,
        "c5a2c1ed6ca0ff154fffdbf47a11a337b3e701200870257c28b1c5aa5a7eb344",
    ],
    ["execution-v1/canary/task-02/COMPLETE", 278, "4148fd720c6a8c6ee363dbc24ccf34c65c8bd848f96b8b0f267db31b3cbd368a"],
    [
        "execution-v1/canary/task-02/FAILURE.json",
        895,
        "7da8bbefbd9707c10680aca93301f7d768e982596e24afa94ef152088312c3fe",
    ],
    ["execution-v1/canary/task-03/COMPLETE", 278, "35a39d6822d5e23275646bfbe31683c2732f669ff25fa34b56fcc7a95be64a7c"],
    [
        "execution-v1/canary/task-03/FAILURE.json",
        895,
        "cef27812efade52a35e10e6454f6b2d1ee3f724a546ec2791d256c67344a00b8",
    ],
].map(([relative, bytes, sha256]) => ({ path: path.join(ORIGINAL_S1_ROOT, relative), bytes, sha256 }));
/** Reconstruct the original plan as immutable metadata; never use it for initialization. */
export function buildOriginalS1Plan(maps) {
    const current = buildStrategicS1Plan(maps);
    return {
        ...current,
        kind: "strategic-diagnostic-s1-plan-v1",
        protocolSha256: "952bca278befb716a25551d022fd3954b9ed999be375d8d9baf1253c53dc5b54",
        cases: current.cases.map((c) => ({ ...c, requestedEngineSeed: 3350120000 + c.caseIndex })),
        canaries: current.canaries.map((c, i) => ({ ...c, requestedEngineSeed: 3350121000 + i })),
        smoke: { ...current.smoke, requestedEngineSeed: 3350121100 },
    };
}
export const originalS1History = (manifest) => ({
    sourceCommit: ORIGINAL_S1_SOURCE,
    selectorJobId: "27735502",
    canaryArrayJobId: "27748007",
    finalizerJobId: "27748008",
    definitions: 205,
    zeroUpdateInitializations: 205,
    consumption: {
        launchAttempts: 8,
        endpointOnlyReturned: 4,
        endpointOnlyUpdatesEach: 3600,
        observedEntered: 4,
        observedCompleted: 0,
        observedAdvancingUpdates: null,
        completedPairs: 0,
        finalizerStarted: false,
        smokeOrMainSubmitted: false,
    },
    manifest,
    evidence: ORIGINAL_S1_FILES,
});
export function validateOriginalS1Metadata(plan, metadata) {
    const expected = buildOriginalS1Plan(plan.maps),
        all = [...expected.cases, ...expected.canaries, expected.smoke];
    requireTrue(
        metadata.kind === "strategic-s1-manifest-v1" &&
            metadata.complete === true &&
            metadata.passed === true &&
            metadata.source?.sourceCommit === ORIGINAL_S1_SOURCE &&
            metadata.scheduler?.jobId === "27735502",
        "original S1 selector identity",
    );
    exact(metadata.plan, expected, "complete consumed original S1 definitions");
    exact(
        metadata.launches,
        all.map((c) => ({
            role: c.role,
            caseIndex: c.caseIndex,
            mode: "zero_update",
            requestedEngineSeed: c.requestedEngineSeed,
            policy: "unchanged_strongbot",
        })),
        "original S1 zero-update launches",
    );
    exact(
        metadata.observations,
        all.map((c) => ({
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
        })),
        "original S1 zero-update observations",
    );
}
function auditOriginalS1(plan, metadata, manifest) {
    validateOriginalS1Metadata(plan, metadata);
    for (const prior of REGISTRATIONS.slice(0, 9))
        requireTrue(
            metadata.seedAudit.inspectedRegistrationFiles.some(
                (r) => r.path === prior.path && r.sha256 === prior.sha256,
            ),
            "original S1 prior-registration chain",
        );
    for (const d of ORIGINAL_S1_FILES) {
        const actual = checkedFile(d.path, d.sha256);
        requireTrue(actual.bytes === d.bytes, "original S1 evidence size");
    }
    const expectedJournal =
        metadata.launches.map((l) => "LAUNCH_S1_V1 " + JSON.stringify(l) + "\n").join("") +
        "COMPLETE_S1_V1 " +
        manifest.sha256 +
        " " +
        manifest.bytes +
        "\n";
    exact(fs.readFileSync(ORIGINAL_S1_FILES[2].path, "utf8"), expectedJournal, "original S1 complete journal");
    const review = json(ORIGINAL_S1_FILES[3].path),
        history = originalS1History(manifest);
    requireTrue(
        review.sourceCommit === ORIGINAL_S1_SOURCE &&
            review.reviewComplete === true &&
            review.canaryGatePassed === false &&
            review.arrayJobId === history.canaryArrayJobId &&
            review.finalizerJobId === history.finalizerJobId,
        "original S1 failure review",
    );
    for (const [k, value] of Object.entries(history.consumption))
        exact(review.consumption[k], value, "original S1 consumption " + k);
    requireTrue(
        review.workers.length === 4 && review.finalizer[2] === "CANCELLED" && review.finalizer[10] === "0",
        "original S1 terminal failure population",
    );
    for (const [i, c] of buildOriginalS1Plan(plan.maps).canaries.entries()) {
        const worker = review.workers[i],
            dir = path.join(ORIGINAL_S1_ROOT, "execution-v1/canary/task-" + String(i).padStart(2, "0"));
        const launches = ["canary_endpoint_only", "canary_strategic"].map((mode) => ({
            role: "canary",
            caseIndex: c.caseIndex,
            mode,
            requestedEngineSeed: c.requestedEngineSeed,
            policy: "unchanged_strongbot",
        }));
        exact(worker.launches, launches, "original canary attempts");
        exact(
            fs.readFileSync(path.join(dir, "COMPLETE"), "utf8"),
            launches.map((l) => "LAUNCH_S1_V1 " + JSON.stringify(l) + "\n").join(""),
            "original failed canary journal",
        );
        const failure = json(path.join(dir, "FAILURE.json"));
        requireTrue(
            failure.complete === false &&
                failure.passed === false &&
                failure.technicalOnly === true &&
                failure.sourceCommit === ORIGINAL_S1_SOURCE &&
                worker.allocation[2] === "FAILED" &&
                worker.allocation[3] === "1:0",
            "original canary failure identity",
        );
        requireTrue(!fs.existsSync(path.join(dir, "record.json")), "original failed canary unexpectedly published");
    }
    return history;
}

export const A1_S1_EVIDENCE = [
    {
        path: "/nfs/roberts/project/pi_jss233/zc362/chrono_divide/research-evidence/strategic-diagnostic-s1-a1/verification-pure-v1.json",
        bytes: 995,
        sha256: "f118a2639a590b6789ae039169fc08a41f218c4d4c1eecc5fca4357bbc05de42",
    },
    {
        path: "/nfs/roberts/project/pi_jss233/zc362/chrono_divide/research-evidence/strategic-diagnostic-s1-a1/verification-prepare-v1.json",
        bytes: 1026,
        sha256: "b04ccdafeded009a764cce06d60ca76c8651b8c78eae68b25f2909b092d78465",
    },
    {
        path: "/nfs/roberts/project/pi_jss233/zc362/chrono_divide/research-evidence/strategic-diagnostic-s1-a1/verification-canary-finalize-v1.json",
        bytes: 1157,
        sha256: "25c2746dc288958fb8adcc853235ff5072fd9bb33234177c9bace55f0f6ae287",
    },
    {
        path: "/nfs/roberts/project/pi_jss233/zc362/chrono_divide/research-evidence/strategic-diagnostic-s1-a1/execution-v1/manifest/COMPLETE",
        bytes: 27836,
        sha256: "f9a9a5dc6e6dcace408679af4fe9272dba0b924e10675e06b2d9da7a2b0ad0ab",
    },
    {
        path: "/nfs/roberts/project/pi_jss233/zc362/chrono_divide/research-evidence/strategic-diagnostic-s1-a1/execution-v1/canary-finalizer/record.json",
        bytes: 19350,
        sha256: "b0cde978c9f2b54aaf8c73fd1b07303fefad307cbdbd64a44fcdca7d0745218e",
    },
    {
        path: "/nfs/roberts/project/pi_jss233/zc362/chrono_divide/research-evidence/strategic-diagnostic-s1-a1/execution-v1/canary-finalizer/COMPLETE",
        bytes: 86,
        sha256: "90e1efec23635a15bc116a07835366709c94b29f5a7ed4119afab85a05b2a877",
    },
    {
        path: "/nfs/roberts/project/pi_jss233/zc362/chrono_divide/research-evidence/strategic-diagnostic-s1-a1/execution-v1/canary/task-00/record.json",
        bytes: 3966,
        sha256: "1f772174c081c2edaf0adebabbd06a307cc5bbcd96980d9505a25cd61ceeeb52",
    },
    {
        path: "/nfs/roberts/project/pi_jss233/zc362/chrono_divide/research-evidence/strategic-diagnostic-s1-a1/execution-v1/canary/task-00/COMPLETE",
        bytes: 363,
        sha256: "91cb1b739538afbf68f54824788bc593b96fc22ddac620a9e18f9e6f3ffc5ea5",
    },
    {
        path: "/nfs/roberts/project/pi_jss233/zc362/chrono_divide/research-evidence/strategic-diagnostic-s1-a1/execution-v1/canary/task-01/record.json",
        bytes: 4026,
        sha256: "39cceff904b77b8b3f4442b077c370c5cfa91a56452322f804e73af83f870a1c",
    },
    {
        path: "/nfs/roberts/project/pi_jss233/zc362/chrono_divide/research-evidence/strategic-diagnostic-s1-a1/execution-v1/canary/task-01/COMPLETE",
        bytes: 363,
        sha256: "a2fdfe9a3a65621463622ca2ac287cfcacfc1737a609825dc308671a96d198da",
    },
    {
        path: "/nfs/roberts/project/pi_jss233/zc362/chrono_divide/research-evidence/strategic-diagnostic-s1-a1/execution-v1/canary/task-02/record.json",
        bytes: 4181,
        sha256: "5469a6c80bb3c1952fbffd96c3ac73e64d471ce45a6ddcbeef543814e754d4ae",
    },
    {
        path: "/nfs/roberts/project/pi_jss233/zc362/chrono_divide/research-evidence/strategic-diagnostic-s1-a1/execution-v1/canary/task-02/COMPLETE",
        bytes: 363,
        sha256: "b4609007fe9a330911ba8bb6e268e375057b54f60d3eafb77dfbf366b99a7f2f",
    },
    {
        path: "/nfs/roberts/project/pi_jss233/zc362/chrono_divide/research-evidence/strategic-diagnostic-s1-a1/execution-v1/canary/task-03/record.json",
        bytes: 3893,
        sha256: "43444bcd9dc18b641ce5872c9391aad60b7783301a8f7bc613f168efc2c40968",
    },
    {
        path: "/nfs/roberts/project/pi_jss233/zc362/chrono_divide/research-evidence/strategic-diagnostic-s1-a1/execution-v1/canary/task-03/COMPLETE",
        bytes: 363,
        sha256: "f2cbda39178dbf38eb8d19e45460c9045bd6cc879cfd8b8bd3b17c639b017baa",
    },
    {
        path: "/nfs/roberts/project/pi_jss233/zc362/chrono_divide/research-evidence/strategic-diagnostic-s1-a1/execution-v1/smoke/FAILURE.json",
        bytes: 899,
        sha256: "4beac350deb13cba8567bae3e5a9683c01d67fe85d1cdd41fbee300346772dc2",
    },
    {
        path: "/nfs/roberts/project/pi_jss233/zc362/chrono_divide/research-evidence/strategic-diagnostic-s1-a1/execution-v1/smoke/COMPLETE",
        bytes: 125,
        sha256: "6ce2adabead1044ac9f4a08ecb0195c70d9954c3e7fa7ef063e51db26abe5c85",
    },
    {
        path: "/nfs/roberts/project/pi_jss233/zc362/chrono_divide/research-evidence/strategic-diagnostic-s1-a1/smoke-failure-review-v1/record.json",
        bytes: 3394,
        sha256: "a923517873ba206b312fa6a7608a426bf45b75691f198435756cc7d4ace822e2",
    },
    {
        path: "/nfs/roberts/project/pi_jss233/zc362/chrono_divide/research-evidence/strategic-diagnostic-s1-a1/smoke-failure-review-v1/source-evidence.json",
        bytes: 3726,
        sha256: "701365caa982c28fa45765bac20f22aba963d65a7bfe1667af94bf4be23c4dd5",
    },
];
export function buildA1S1Plan(maps) {
    const current = buildStrategicS1Plan(maps);
    return {
        ...current,
        kind: "strategic-diagnostic-s1-plan-v2",
        protocolSha256: "9ea76da3bb2ef960dd192f1fdaefde5ad6b5d6378867a22e6b09d49b49682bde",
        cases: current.cases.map((c) => ({ ...c, requestedEngineSeed: 3350130000 + c.caseIndex })),
        canaries: current.canaries.map((c, i) => ({ ...c, requestedEngineSeed: 3350131000 + i })),
        smoke: { ...current.smoke, requestedEngineSeed: 3350131100 },
    };
}
export const a1S1History = (manifest) => ({
    sourceCommit: "9add3dc6a5467dfd523b01e4052c8dbf58527a21",
    selectorJobId: "28018163",
    canaryArrayJobId: "28021488",
    canaryFinalizerJobId: "28021489",
    failedSmokeJobId: "28024266",
    definitions: 205,
    zeroUpdateInitializations: 205,
    completedCanaryEpisodes: 8,
    completedCanaryPairs: 4,
    canaryUpdatesEach: 3600,
    smokeLaunchAttempts: 1,
    smokeSeed: 3350131100,
    smokeAdvancingUpdates: null,
    smokeReturned: false,
    mainSubmitted: false,
    manifest,
    evidence: A1_S1_EVIDENCE,
});
function auditA1S1(plan, metadata, manifest) {
    const expected = buildA1S1Plan(plan.maps),
        all = [...expected.cases, ...expected.canaries, expected.smoke];
    requireTrue(
        metadata.kind === "strategic-s1-manifest-v1" &&
            metadata.complete === true &&
            metadata.passed === true &&
            metadata.source.sourceCommit === "9add3dc6a5467dfd523b01e4052c8dbf58527a21" &&
            metadata.scheduler.jobId === "28018163",
        "A1 S1 selector identity",
    );
    exact(metadata.plan, expected, "complete consumed A1 S1 plan");
    const launches = all.map((c) => ({
        role: c.role,
        caseIndex: c.caseIndex,
        mode: "zero_update",
        requestedEngineSeed: c.requestedEngineSeed,
        policy: "unchanged_strongbot",
    }));
    exact(metadata.launches, launches, "all A1 S1 launches");
    exact(
        metadata.observations,
        all.map((c) => ({
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
        })),
        "all A1 S1 observations",
    );
    for (const prior of REGISTRATIONS.slice(0, 10))
        requireTrue(
            metadata.seedAudit.inspectedRegistrationFiles.some(
                (r) => r.path === prior.path && r.sha256 === prior.sha256,
            ),
            "A1 prior-registration chain",
        );
    for (const d of A1_S1_EVIDENCE) {
        const actual = checkedFile(d.path, d.sha256);
        requireTrue(actual.bytes === d.bytes, "A1 evidence size");
    }
    exact(
        fs.readFileSync(A1_S1_EVIDENCE[3].path, "utf8"),
        launches.map((l) => "LAUNCH_S1_V1 " + JSON.stringify(l) + "\n").join("") +
            "COMPLETE_S1_V1 " +
            manifest.sha256 +
            " " +
            manifest.bytes +
            "\n",
        "A1 selector journal",
    );
    const aggregate = json(A1_S1_EVIDENCE[4].path);
    requireTrue(
        aggregate.complete === true &&
            aggregate.passed === true &&
            aggregate.configurations === 4 &&
            aggregate.advancingEpisodes === 8 &&
            aggregate.arrayJobId === "28021488" &&
            aggregate.scheduler.jobId === "28021489",
        "A1 canary aggregate",
    );
    requireTrue(aggregate.records.length === 4, "A1 complete canary population");
    for (const [i, c] of expected.canaries.entries()) {
        const record = aggregate.records[i].value;
        exact(record.assignment, c, "A1 canary configuration");
        const attempts = ["canary_endpoint_only", "canary_strategic"].map((mode) => ({
            role: "canary",
            caseIndex: c.caseIndex,
            mode,
            requestedEngineSeed: c.requestedEngineSeed,
            policy: "unchanged_strongbot",
        }));
        exact(record.launches, attempts, "A1 canary attempts");
        requireTrue(
            record.episodes.length === 2 &&
                record.episodes.every((e) => e.complete === true && e.technicalPass === true && e.updates === 3600),
            "A1 completed episodes",
        );
    }
    const smokeFolder = path.join(EVIDENCE, "strategic-diagnostic-s1-a1/execution-v1/smoke"),
        smoke = json(path.join(smokeFolder, "FAILURE.json"));
    requireTrue(
        smoke.complete === false &&
            smoke.passed === false &&
            smoke.stage === "smoke" &&
            smoke.jobId === "28024266" &&
            smoke.sourceCommit === "9add3dc6a5467dfd523b01e4052c8dbf58527a21",
        "A1 smoke failure",
    );
    requireTrue(!fs.existsSync(path.join(smokeFolder, "record.json")), "A1 failed smoke publication");
    exact(
        fs.readFileSync(path.join(smokeFolder, "COMPLETE"), "utf8"),
        "LAUNCH_S1_V1 " +
            JSON.stringify({
                role: "smoke",
                caseIndex: 204,
                mode: "smoke",
                requestedEngineSeed: 3350131100,
                policy: "unchanged_strongbot",
            }) +
            "\n",
        "A1 failed smoke launch",
    );
    const review = json(path.join(EVIDENCE, "strategic-diagnostic-s1-a1/smoke-failure-review-v1/record.json"));
    requireTrue(
        review.reviewComplete === true &&
            review.smokeGatePassed === false &&
            review.smokeAdvancingUpdates === null &&
            review.mainSubmitted === false,
        "A1 failure scope",
    );
    return a1S1History(manifest);
}

export const A2_S1_EVIDENCE = [
    {
        path: "/nfs/roberts/project/pi_jss233/zc362/chrono_divide/research-evidence/strategic-diagnostic-s1-a2/verification-pure-v1.json",
        bytes: 1115,
        sha256: "fc453cefd4b0d825eb55c211032fb6d3ac481cb23a1bb4c52d37fb800ad181eb",
    },
    {
        path: "/nfs/roberts/project/pi_jss233/zc362/chrono_divide/research-evidence/strategic-diagnostic-s1-a2/verification-prepare-v1.json",
        bytes: 1146,
        sha256: "ea1f1d587c22be3f600ca164a5ce42fa20aff7481caa2eed9b763df222310853",
    },
    {
        path: "/nfs/roberts/project/pi_jss233/zc362/chrono_divide/research-evidence/strategic-diagnostic-s1-a2/verification-canary-finalize-v1.json",
        bytes: 1157,
        sha256: "0ef6f3c09a09b43eda89643037c2fac4f550e8329861c09251586b4572bba016",
    },
    {
        path: "/nfs/roberts/project/pi_jss233/zc362/chrono_divide/research-evidence/strategic-diagnostic-s1-a2/verification-smoke-v1.json",
        bytes: 1132,
        sha256: "4e3a78fa90854855e627de8dc04d2f30b5eff70db43d7acb3d35afb7a4a78d32",
    },
    {
        path: "/nfs/roberts/project/pi_jss233/zc362/chrono_divide/research-evidence/strategic-diagnostic-s1-a2/execution-v1/manifest/COMPLETE",
        bytes: 27836,
        sha256: "96eba3680a71fcb77aa991c256c81e17920de919d6f9760191efccc6d9cecafd",
    },
    {
        path: "/nfs/roberts/project/pi_jss233/zc362/chrono_divide/research-evidence/strategic-diagnostic-s1-a2/execution-v1/canary-finalizer/record.json",
        bytes: 19350,
        sha256: "be8bb8a27fd6bb02c86f3525cc6e868fd9554d6f8413b40fd2442c235dfaa970",
    },
    {
        path: "/nfs/roberts/project/pi_jss233/zc362/chrono_divide/research-evidence/strategic-diagnostic-s1-a2/execution-v1/canary-finalizer/COMPLETE",
        bytes: 86,
        sha256: "6f42ef2cd9ef99ba173446a9c773459e54b6ae96cb3d0c50b35fb601d58c92f8",
    },
    {
        path: "/nfs/roberts/project/pi_jss233/zc362/chrono_divide/research-evidence/strategic-diagnostic-s1-a2/execution-v1/canary/task-00/record.json",
        bytes: 3966,
        sha256: "60093b2fd19b00e31c61a83170e95ffbbec151788ba3518de2a7d48ac6258f84",
    },
    {
        path: "/nfs/roberts/project/pi_jss233/zc362/chrono_divide/research-evidence/strategic-diagnostic-s1-a2/execution-v1/canary/task-00/COMPLETE",
        bytes: 363,
        sha256: "e26991d3c00f503e40965ca7c9f1c173af0dbef9514223f18843611347ef8047",
    },
    {
        path: "/nfs/roberts/project/pi_jss233/zc362/chrono_divide/research-evidence/strategic-diagnostic-s1-a2/execution-v1/canary/task-01/record.json",
        bytes: 4026,
        sha256: "9dfbdc1c0db74f1fbfb4fc4c7adb8000121d0ec2c08af8ba03021950ea3da206",
    },
    {
        path: "/nfs/roberts/project/pi_jss233/zc362/chrono_divide/research-evidence/strategic-diagnostic-s1-a2/execution-v1/canary/task-01/COMPLETE",
        bytes: 363,
        sha256: "73f7e70f9dacbf641591b421f4da47d0b5858d3ca01d39ee0616569aed3f174c",
    },
    {
        path: "/nfs/roberts/project/pi_jss233/zc362/chrono_divide/research-evidence/strategic-diagnostic-s1-a2/execution-v1/canary/task-02/record.json",
        bytes: 4181,
        sha256: "c62aca8e862986cfb3d2c39a6ee62d5f017645be54096e51f11b96fd0305a304",
    },
    {
        path: "/nfs/roberts/project/pi_jss233/zc362/chrono_divide/research-evidence/strategic-diagnostic-s1-a2/execution-v1/canary/task-02/COMPLETE",
        bytes: 363,
        sha256: "24f0bbce7222a609745b0f9036ef42c2139551e95e6358666ec23021c9b2d0ff",
    },
    {
        path: "/nfs/roberts/project/pi_jss233/zc362/chrono_divide/research-evidence/strategic-diagnostic-s1-a2/execution-v1/canary/task-03/record.json",
        bytes: 3893,
        sha256: "929b9179dd7241e04fba020410cfba0df9f484617f01546b3bae5f0970683a4d",
    },
    {
        path: "/nfs/roberts/project/pi_jss233/zc362/chrono_divide/research-evidence/strategic-diagnostic-s1-a2/execution-v1/canary/task-03/COMPLETE",
        bytes: 363,
        sha256: "25bbd6d4584be3e1436df61d9f85260a50822fcade74e53179beef6de68e96ef",
    },
    {
        path: "/nfs/roberts/project/pi_jss233/zc362/chrono_divide/research-evidence/strategic-diagnostic-s1-a2/execution-v1/smoke/record.json",
        bytes: 2177,
        sha256: "f82511a499ed13264997fb72326105a91f08197be684db95016f0a52d4e9ddc8",
    },
    {
        path: "/nfs/roberts/project/pi_jss233/zc362/chrono_divide/research-evidence/strategic-diagnostic-s1-a2/execution-v1/smoke/COMPLETE",
        bytes: 210,
        sha256: "185e189bad850a39beeccd62c9518f787d731ba046100f672c27dd9128c3b86b",
    },
    {
        path: "/nfs/roberts/project/pi_jss233/zc362/chrono_divide/research-evidence/strategic-diagnostic-s1-a2/main-failure-review-v1/record.json",
        bytes: 603981,
        sha256: "76735f0159943d3ad8bee1d14729b3b110f6f94d98eaab6fc655fc168318c350",
    },
    {
        path: "/nfs/roberts/project/pi_jss233/zc362/chrono_divide/research-evidence/strategic-diagnostic-s1-a2/main-failure-review-v1/source-evidence.json",
        bytes: 4493,
        sha256: "f2d2dc7bcb2b54a4be360f1f80af59a8c47304aeabcb3eebc6858ca326a0ea28",
    },
    {
        path: "/nfs/roberts/project/pi_jss233/zc362/chrono_divide/research-evidence/strategic-diagnostic-s1-a2/main-failure-review-v1/accounting-expanded.txt",
        bytes: 71967,
        sha256: "effb8b8a575a0ed69f6d656c63736576e036d87db3343fe84568dc5dcde92997",
    },
    {
        path: "/nfs/roberts/project/pi_jss233/zc362/chrono_divide/research-evidence/strategic-diagnostic-s1-a2/main-failure-review-v1/cancel-intent.json",
        bytes: 993,
        sha256: "ef3771fb2cb52d285b02ab0cec4aa2a78d4c2259254d62714e8cd6f80dca19a0",
    },
    {
        path: "/nfs/roberts/project/pi_jss233/zc362/chrono_divide/research-evidence/strategic-diagnostic-s1-a2/main-failure-review-v1/cancel-response.json",
        bytes: 85,
        sha256: "7c4c8b778cae5a3334a1bc1049df2f1b0668296db71f536ff9f47bf83fd70bf6",
    },
    {
        path: "/nfs/roberts/project/pi_jss233/zc362/chrono_divide/research-evidence/strategic-diagnostic-s1-a2/main-failure-review-v1/INITIAL_RECONCILIATION.json",
        bytes: 14262,
        sha256: "a1fd35f5e03be4d88f1a76a597580f3189103fa6fbda6ea923216b30df61f806",
    },
    {
        path: "/nfs/roberts/project/pi_jss233/zc362/chrono_divide/research-evidence/strategic-diagnostic-s1-a2/CHECKPOINT_MAIN_FAILED.json",
        bytes: 1805,
        sha256: "d79ccc4357bda4159b9e5491422f55133ef7ec66a3340c4e82d91fed9e1b97d7",
    },
    {
        path: "/nfs/roberts/project/pi_jss233/zc362/chrono_divide/research-evidence/strategic-diagnostic-s1-a2/development/a3-preservation-BbwfZg/PRESERVED.json",
        bytes: 298916,
        sha256: "c6968375bfacea029eb100fbdaa4854163f4b841e2e9861b9cc9df5254d461c1",
    },
    {
        path: "/nfs/roberts/project/pi_jss233/zc362/chrono_divide/research-evidence/strategic-diagnostic-s1-a2/development/a3-preservation-BbwfZg/original-source-runtime.tar.gz",
        bytes: 4908497,
        sha256: "ec9ab8267ced80ce8136f8c18c4875d69e4134fbc4e7db6fb7d5ba7741dd558b",
    },
    {
        path: "/nfs/roberts/project/pi_jss233/zc362/chrono_divide/research-evidence/strategic-diagnostic-s1-a2/development/a3-numeric-contract-v1/NUMERIC_CONTRACT.json",
        bytes: 387094,
        sha256: "cfcd7cbdd3956451d3526b26a33bb1b40f29b7e1f7e67cac339983335ab5da0f",
    },
    {
        path: "/nfs/roberts/project/pi_jss233/zc362/chrono_divide/research-evidence/strategic-diagnostic-s1-a2/development/a3-numeric-contract-v1/CONTROLLER_VERIFIED.json",
        bytes: 312709,
        sha256: "c281fd75a7f547bfc8b843e852e0c5c0c19466285615bc9299d168c7c56c4786",
    },
];

export function buildA2S1Plan(maps) {
    const current = buildStrategicS1Plan(maps);
    return {
        ...current,
        kind: "strategic-diagnostic-s1-plan-v2",
        protocolSha256: "650c29a674350d200f3beac622d3713449732959b5ab0d4ef6d157769d30b018",
        cases: current.cases.map((c) => ({ ...c, requestedEngineSeed: 3350140000 + c.caseIndex })),
        canaries: current.canaries.map((c, i) => ({ ...c, requestedEngineSeed: 3350141000 + i })),
        smoke: { ...current.smoke, requestedEngineSeed: 3350141100 },
    };
}
export const a2S1History = (manifest) => ({
    sourceCommit: "9c9b60cead62d19189e83f479241b6c20ffcf500",
    selectorJobId: "28033147",
    canaryArrayJobId: "28036184",
    canaryFinalizerJobId: "28036185",
    smokeJobId: "28038341",
    mainArrayJobId: "28040514",
    mainFinalizerJobId: "28040515",
    definitions: 205,
    zeroUpdateInitializations: 205,
    completedCanaryEpisodes: 8,
    completedCanaryPairs: 4,
    canaryUpdatesEach: 3600,
    completedSmokeTechnicalEpisodes: 1,
    mainAllocatedCases: 200,
    mainCompletedAllocations: 99,
    mainFailedAllocations: 6,
    mainCancelledAllocations: 95,
    mainLaunchAttempts: 137,
    allMainIdentitiesReserved: true,
    failedOrCancelledAdvancingUpdates: null,
    mainGatePassed: false,
    partialCompetitivePayloadOpened: false,
    manifest,
    evidence: A2_S1_EVIDENCE,
});
export function validateA2S1Metadata(plan, m) {
    const expected = buildA2S1Plan(plan.maps),
        all = [...expected.cases, ...expected.canaries, expected.smoke];
    requireTrue(
        m.kind === "strategic-s1-manifest-v1" &&
            m.complete === true &&
            m.passed === true &&
            m.source.sourceCommit === "9c9b60cead62d19189e83f479241b6c20ffcf500" &&
            m.scheduler.jobId === "28033147",
        "A2 selector identity",
    );
    exact(m.plan, expected, "complete reserved A2 plan");
    const launches = all.map((c) => ({
        role: c.role,
        caseIndex: c.caseIndex,
        mode: "zero_update",
        requestedEngineSeed: c.requestedEngineSeed,
        policy: "unchanged_strongbot",
    }));
    exact(m.launches, launches, "all A2 selector launches");
    exact(
        m.observations,
        all.map((c) => ({
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
        })),
        "all A2 zero observations",
    );
    return { expected, launches };
}
function auditA2S1(plan, m, manifest) {
    const { expected, launches } = validateA2S1Metadata(plan, m),
        base = path.join(EVIDENCE, "strategic-diagnostic-s1-a2");
    for (const prior of REGISTRATIONS.slice(0, 11))
        requireTrue(
            m.seedAudit.inspectedRegistrationFiles.some((d) => d.path === prior.path && d.sha256 === prior.sha256),
            "A2 prior registration chain",
        );
    for (const d of A2_S1_EVIDENCE) {
        const actual = checkedFile(d.path, d.sha256);
        requireTrue(actual.bytes === d.bytes, "A2 evidence bytes");
    }
    exact(
        fs.readFileSync(path.join(base, "execution-v1/manifest/COMPLETE"), "utf8"),
        launches.map((l) => "LAUNCH_S1_V1 " + JSON.stringify(l) + "\n").join("") +
            "COMPLETE_S1_V1 " +
            manifest.sha256 +
            " " +
            manifest.bytes +
            "\n",
        "A2 selector journal",
    );
    const aggregate = json(path.join(base, "execution-v1/canary-finalizer/record.json"));
    requireTrue(
        aggregate.complete === true &&
            aggregate.passed === true &&
            aggregate.arrayJobId === "28036184" &&
            aggregate.scheduler.jobId === "28036185" &&
            aggregate.records.length === 4 &&
            aggregate.advancingEpisodes === 8,
        "A2 complete canary",
    );
    for (const [i, c] of expected.canaries.entries()) {
        const r = aggregate.records[i].value;
        exact(r.assignment, c, "A2 canary assignment");
        requireTrue(
            r.episodes.length === 2 &&
                r.episodes.every((e) => e.complete === true && e.technicalPass === true && e.updates === 3600),
            "A2 canary returns",
        );
    }
    const smoke = json(path.join(base, "execution-v1/smoke/record.json"));
    requireTrue(
        smoke.complete === true &&
            smoke.passed === true &&
            smoke.scheduler.jobId === "28038341" &&
            smoke.episode.kind === "strategic-s1-smoke-technical-v2" &&
            smoke.episode.crossChannelVerified === true,
        "A2 smoke cross channel proof",
    );
    const review = json(path.join(base, "main-failure-review-v1/record.json"));
    requireTrue(
        review.reviewComplete === true &&
            review.mainGatePassed === false &&
            review.scientificResult === false &&
            review.partialCompetitivePayloadsOpened === false &&
            review.launchedIdentities === 137 &&
            review.all200MainIdentitiesReserved === true &&
            review.workerAllocations.length === 200,
        "A2 terminal failure scope",
    );
    const statuses = { COMPLETED: 0, FAILED: 0, CANCELLED: 0 };
    for (const [i, r] of review.workerAllocations.entries()) {
        requireTrue(
            r[0] === "28040514_" + i && r[4] === "pi_jss233" && !["RUNNING", "PENDING", "COMPLETING"].includes(r[2]),
            "A2 all terminal allocations",
        );
        if (r[2] === "COMPLETED") {
            requireTrue(r[3] === "0:0", "A2 completed exit");
            statuses.COMPLETED++;
        } else if (r[2] === "FAILED") {
            requireTrue(r[3] === "1:0", "A2 failure exit");
            statuses.FAILED++;
        } else {
            requireTrue(r[2].startsWith("CANCELLED"), "A2 cancelled state");
            statuses.CANCELLED++;
        }
    }
    exact(statuses, { COMPLETED: 99, FAILED: 6, CANCELLED: 95 }, "A2 full allocation statuses");
    requireTrue(
        review.finalizerAllocation[0] === "28040515" &&
            review.finalizerAllocation[2].startsWith("CANCELLED") &&
            review.finalizerAllocation[10] === "0",
        "A2 unused finalizer",
    );
    requireTrue(!fs.existsSync(path.join(base, "execution-v1/finalizer/record.json")), "A2 finalizer never published");
    // Hash opaque artifacts/logs only. Never parse a partial competitive record.
    for (const d of review.evidence) {
        const actual = checkedFile(d.path, d.sha256);
        requireTrue(actual.bytes === d.bytes, "A2 sealed artifact binding");
    }
    requireTrue(review.journals.length === 137, "A2 full attempted journal population");
    for (const j of review.journals) {
        const p = path.join(base, "execution-v1/cases/task-" + String(j.caseIndex).padStart(4, "0") + "/COMPLETE"),
            actual = checkedFile(p, j.identity.sha256);
        requireTrue(actual.bytes === j.identity.bytes, "A2 journal bytes");
        const l = {
            role: "diagnostic",
            caseIndex: j.caseIndex,
            mode: "diagnostic",
            requestedEngineSeed: 3350140000 + j.caseIndex,
            policy: "unchanged_strongbot",
        };
        exact(j.launches, [l], "A2 consumed main identity");
        requireTrue(
            fs.readFileSync(p, "utf8").startsWith("LAUNCH_S1_V1 " + JSON.stringify(l) + "\n"),
            "A2 durable main launch",
        );
    }
    return a2S1History(manifest);
}

export const A3_S1_EVIDENCE = [
    {
        "path": "/nfs/roberts/project/pi_jss233/zc362/chrono_divide/research-evidence/strategic-diagnostic-s1-a3/verification-pure-v1.json",
        "bytes": 1115,
        "sha256": "0eab891859c13a8baa2ad292c6c9606e9b99d053f54c0682ddf0281a2d223670"
    },
    {
        "path": "/nfs/roberts/project/pi_jss233/zc362/chrono_divide/research-evidence/strategic-diagnostic-s1-a3/verification-prepare-v1.json",
        "bytes": 1146,
        "sha256": "9e4d86a1af7489c5a006abd4398f133c1cbb1780d078cf92415fd05f63e4ad8e"
    },
    {
        "path": "/nfs/roberts/project/pi_jss233/zc362/chrono_divide/research-evidence/strategic-diagnostic-s1-a3/verification-canary-finalize-v1.json",
        "bytes": 1157,
        "sha256": "9746a62e42c9117f7a5e47cdc9ff939d93069094bfd993cff8e80c98e16078b5"
    },
    {
        "path": "/nfs/roberts/project/pi_jss233/zc362/chrono_divide/research-evidence/strategic-diagnostic-s1-a3/verification-smoke-v1.json",
        "bytes": 1132,
        "sha256": "82af663a10543b06e60a6f137a49bdc42d3e9717008bf568d456192c374c931a"
    },
    {
        "path": "/nfs/roberts/project/pi_jss233/zc362/chrono_divide/research-evidence/strategic-diagnostic-s1-a3/execution-v1/manifest/COMPLETE",
        "bytes": 27836,
        "sha256": "4ffffa1ec8a8d2e20116b937257be25ebe88aa6c8d3c328ef7aeb0047c52a239"
    },
    {
        "path": "/nfs/roberts/project/pi_jss233/zc362/chrono_divide/research-evidence/strategic-diagnostic-s1-a3/execution-v1/canary-finalizer/record.json",
        "bytes": 19350,
        "sha256": "c53929b7f05b01e1643d29ccc127b3ca6cee099eaf051c7a1fcfee060259651b"
    },
    {
        "path": "/nfs/roberts/project/pi_jss233/zc362/chrono_divide/research-evidence/strategic-diagnostic-s1-a3/execution-v1/canary-finalizer/COMPLETE",
        "bytes": 86,
        "sha256": "0f6021c13a55aad82d1c71b7a1c2977e8311cb0e72690d7222773da4efec5278"
    },
    {
        "path": "/nfs/roberts/project/pi_jss233/zc362/chrono_divide/research-evidence/strategic-diagnostic-s1-a3/execution-v1/canary/task-00/record.json",
        "bytes": 3966,
        "sha256": "6d100c2061505c92f4d2abf599af3ef89136e1cc5597ac87fd902aae72b4e851"
    },
    {
        "path": "/nfs/roberts/project/pi_jss233/zc362/chrono_divide/research-evidence/strategic-diagnostic-s1-a3/execution-v1/canary/task-00/COMPLETE",
        "bytes": 363,
        "sha256": "77084eab10da949f63ea9e9027f307fbd352b181799c80e8988e9d864744a46b"
    },
    {
        "path": "/nfs/roberts/project/pi_jss233/zc362/chrono_divide/research-evidence/strategic-diagnostic-s1-a3/execution-v1/canary/task-01/record.json",
        "bytes": 4026,
        "sha256": "75da6d9ed3b1c8f3dc6992d87f6c5083f04c58d3f9cb9c556810c50e5306db03"
    },
    {
        "path": "/nfs/roberts/project/pi_jss233/zc362/chrono_divide/research-evidence/strategic-diagnostic-s1-a3/execution-v1/canary/task-01/COMPLETE",
        "bytes": 363,
        "sha256": "3f71342ad36c4e913800e5b134fc2a1b96504998f79dde3810b1c0f107f0243e"
    },
    {
        "path": "/nfs/roberts/project/pi_jss233/zc362/chrono_divide/research-evidence/strategic-diagnostic-s1-a3/execution-v1/canary/task-02/record.json",
        "bytes": 4181,
        "sha256": "b13ac45645dc1463b39882943ec3532f48621613527068e85feac4a324411806"
    },
    {
        "path": "/nfs/roberts/project/pi_jss233/zc362/chrono_divide/research-evidence/strategic-diagnostic-s1-a3/execution-v1/canary/task-02/COMPLETE",
        "bytes": 363,
        "sha256": "ca17f9baa665f3b36cf34b77df9614c8be727d6395b39d936fe49fc6c843d3c7"
    },
    {
        "path": "/nfs/roberts/project/pi_jss233/zc362/chrono_divide/research-evidence/strategic-diagnostic-s1-a3/execution-v1/canary/task-03/record.json",
        "bytes": 3893,
        "sha256": "11a2a59e83385cc628c81e62181bf7b690d6a26df4de5e911743befa293a8564"
    },
    {
        "path": "/nfs/roberts/project/pi_jss233/zc362/chrono_divide/research-evidence/strategic-diagnostic-s1-a3/execution-v1/canary/task-03/COMPLETE",
        "bytes": 363,
        "sha256": "cfb138d92a35842bf2849dc9added739ab2e43ad75a783d5af3596def450f359"
    },
    {
        "path": "/nfs/roberts/project/pi_jss233/zc362/chrono_divide/research-evidence/strategic-diagnostic-s1-a3/execution-v1/smoke/record.json",
        "bytes": 2177,
        "sha256": "54d600c04be336e1f07d72c2d82b7b0ea307e8de2d5f9c38957ed21230995a61"
    },
    {
        "path": "/nfs/roberts/project/pi_jss233/zc362/chrono_divide/research-evidence/strategic-diagnostic-s1-a3/execution-v1/smoke/COMPLETE",
        "bytes": 210,
        "sha256": "f33cdf5346b05743ed74c41d24ffb75f57661911b274b15ed7f25892a41c773d"
    },
    {
        "path": "/nfs/roberts/project/pi_jss233/zc362/chrono_divide/research-evidence/strategic-diagnostic-s1-a3/CHECKPOINT_MAIN_FAILED_V1.json",
        "bytes": 2266,
        "sha256": "a25be5e8438cbd52599bb8a2ee4c541b0c4ced5236be206b3f93fd852ac90551"
    },
    {
        "path": "/nfs/roberts/project/pi_jss233/zc362/chrono_divide/research-evidence/strategic-diagnostic-s1-a3/execution-v1/cases/task-0013/FAILURE.json",
        "bytes": 749,
        "sha256": "765dd754d16059a78f9a9f394b5c79cfafbfea686d4dd0ffe5105f68c509b3cc"
    },
    {
        "path": "/nfs/roberts/project/pi_jss233/zc362/chrono_divide/research-evidence/strategic-diagnostic-s1-a3/development/a4-preservation-v1/original-source-runtime.tar.gz",
        "bytes": 5139744,
        "sha256": "9743742dfe0b4d7cb3d5e84a68cef4b68f716ef7079ae42e6182480b349d6fc1"
    },
    {
        "path": "/nfs/roberts/project/pi_jss233/zc362/chrono_divide/research-evidence/strategic-diagnostic-s1-a3/development/a4-preservation-v1/PRESERVED.json",
        "bytes": 300992,
        "sha256": "3a31ab51f66355a783a1c89dad7b7b40cfe90a2b0744352330298abc4c0a0263"
    },
    {
        "path": "/nfs/roberts/project/pi_jss233/zc362/chrono_divide/research-evidence/strategic-diagnostic-s1-a3/main-failure-review-v1/CONTROLLER_VERIFICATION_FAILURE.json",
        "bytes": 628,
        "sha256": "a858cb80b0b57e1764607b98730e485b76b68ba6965894f335ca61ff27608806"
    },
    {
        "path": "/nfs/roberts/project/pi_jss233/zc362/chrono_divide/research-evidence/strategic-diagnostic-s1-a3/main-failure-review-v1/accounting-expanded.txt",
        "bytes": 49353,
        "sha256": "520b2f39c9194e7505e35bd1ae561091ce7beeed1187bf85a036641751b89aa8"
    },
    {
        "path": "/nfs/roberts/project/pi_jss233/zc362/chrono_divide/research-evidence/strategic-diagnostic-s1-a3/main-failure-review-v1/cancel-intent.json",
        "bytes": 621,
        "sha256": "f16ff14afed91c857e6d965591acb150334d93631458ee82622729f78952badd"
    },
    {
        "path": "/nfs/roberts/project/pi_jss233/zc362/chrono_divide/research-evidence/strategic-diagnostic-s1-a3/main-failure-review-v1/cancel-response.json",
        "bytes": 85,
        "sha256": "7c4c8b778cae5a3334a1bc1049df2f1b0668296db71f536ff9f47bf83fd70bf6"
    },
    {
        "path": "/nfs/roberts/project/pi_jss233/zc362/chrono_divide/research-evidence/strategic-diagnostic-s1-a3/main-failure-review-v1/controller-attempt-source.json",
        "bytes": 5650,
        "sha256": "7aab4c8e13874e40e84bd8cff252c1996553f7ec0bb9bd9d8c9ee55abab4c580"
    },
    {
        "path": "/nfs/roberts/project/pi_jss233/zc362/chrono_divide/research-evidence/strategic-diagnostic-s1-a3/main-failure-review-v1/initial-accounting.txt",
        "bytes": 46845,
        "sha256": "69a12c98ba7d141b70f81991bfb43a13cf0e428fef0373ed02366b6526a959ca"
    },
    {
        "path": "/nfs/roberts/project/pi_jss233/zc362/chrono_divide/research-evidence/strategic-diagnostic-s1-a3/main-failure-review-v1/initial-failures.json",
        "bytes": 536,
        "sha256": "c3e386cb28f4f4df421e597eb3fc70b822d38c9393a33fb03fea1198021687fc"
    },
    {
        "path": "/nfs/roberts/project/pi_jss233/zc362/chrono_divide/research-evidence/strategic-diagnostic-s1-a3/main-failure-review-v1/record.json",
        "bytes": 454003,
        "sha256": "b12988997b7dc07f08aee729ad699aa28bcb68ac4e133045fd8cbbaf8aa0deb6"
    },
    {
        "path": "/nfs/roberts/project/pi_jss233/zc362/chrono_divide/research-evidence/strategic-diagnostic-s1-a3/main-failure-review-v1/source-evidence.json",
        "bytes": 1741,
        "sha256": "6a4219a1efbf4c9f35870a53b6631578066bf901b02e36c3b0801c4707800127"
    },
    {
        "path": "/nfs/roberts/project/pi_jss233/zc362/chrono_divide/research-evidence/strategic-diagnostic-s1-a3/main-failure-review-v1/source-fingerprint-diagnostic-v1/COLLECTED.json",
        "bytes": 1401,
        "sha256": "fab7b44bba87bdcfd7ca44cd2bb3e578128cda39c8775f639d3b21577c3184a4"
    },
    {
        "path": "/nfs/roberts/project/pi_jss233/zc362/chrono_divide/research-evidence/strategic-diagnostic-s1-a3/main-failure-review-v1/source-fingerprint-diagnostic-v1/CONTROLLER_VERIFIED.json",
        "bytes": 3500,
        "sha256": "7b9eff106d98dad8bdf768b1d9c5861065c8f9d4e18931acfb6a3696b11cf5d1"
    },
    {
        "path": "/nfs/roberts/project/pi_jss233/zc362/chrono_divide/research-evidence/strategic-diagnostic-s1-a3/main-failure-review-v1/source-fingerprint-diagnostic-v1/INPUT.json",
        "bytes": 654,
        "sha256": "e3a17e11fd889b1786261442d67003029b109e2df9fae0fc4e08affadfdda58c"
    },
    {
        "path": "/nfs/roberts/project/pi_jss233/zc362/chrono_divide/research-evidence/strategic-diagnostic-s1-a3/main-failure-review-v1/source-fingerprint-diagnostic-v1/PROGRAM.json",
        "bytes": 991,
        "sha256": "d53717054fe4074e5e118b213e9e3b80cfe51f0a9eac2bc9376416efc262f4ad"
    },
    {
        "path": "/nfs/roberts/project/pi_jss233/zc362/chrono_divide/research-evidence/strategic-diagnostic-s1-a3/main-failure-review-v1/source-fingerprint-diagnostic-v1/READY.json",
        "bytes": 653,
        "sha256": "f62128d8ffdbdb3a0a3785edb34deb3c1f42c90ef62e48228af739913f24af8b"
    },
    {
        "path": "/nfs/roberts/project/pi_jss233/zc362/chrono_divide/research-evidence/strategic-diagnostic-s1-a3/main-failure-review-v1/source-fingerprint-diagnostic-v1/STARTED.json",
        "bytes": 5169,
        "sha256": "fb7aa9e5c8d1cfa4dddab21c9af4fbe99fd4ba1194ee3bccc6d78ca56e63a61c"
    },
    {
        "path": "/nfs/roberts/project/pi_jss233/zc362/chrono_divide/research-evidence/strategic-diagnostic-s1-a3/main-failure-review-v1/source-fingerprint-diagnostic-v1/accounting.txt",
        "bytes": 421,
        "sha256": "acd008cfa3c17f0a0bc82b00a8d9b314caf2c973525b9c0b8696f10e341c7257"
    },
    {
        "path": "/nfs/roberts/project/pi_jss233/zc362/chrono_divide/research-evidence/strategic-diagnostic-s1-a3/main-failure-review-v1/source-fingerprint-diagnostic-v1/diagnostic.mjs",
        "bytes": 3717,
        "sha256": "b6db07fc9cd3c2c121d3e6ddb9cd49644cbc2f11742bace24764e8a81dbe9121"
    },
    {
        "path": "/nfs/roberts/project/pi_jss233/zc362/chrono_divide/research-evidence/strategic-diagnostic-s1-a3/main-failure-review-v1/source-fingerprint-diagnostic-v1/diagnostic.sbatch",
        "bytes": 1243,
        "sha256": "656d6b4f8e15f1a177c9dd1efe390556d8eac6cebc4d5af23c8b74e8bfa5048c"
    },
    {
        "path": "/nfs/roberts/project/pi_jss233/zc362/chrono_divide/research-evidence/strategic-diagnostic-s1-a3/main-failure-review-v1/source-fingerprint-diagnostic-v1/initial-scheduler.txt",
        "bytes": 2097,
        "sha256": "d4b90978d9cdda52341f3c3f0f54943a0bb416ef5b6f82a4771344a33bc4d5d6"
    },
    {
        "path": "/nfs/roberts/project/pi_jss233/zc362/chrono_divide/research-evidence/strategic-diagnostic-s1-a3/main-failure-review-v1/source-fingerprint-diagnostic-v1/release-intent.json",
        "bytes": 344,
        "sha256": "877d8461e8337967823304226ad58f59f406803f1725d34cc93ff203e2675076"
    },
    {
        "path": "/nfs/roberts/project/pi_jss233/zc362/chrono_divide/research-evidence/strategic-diagnostic-s1-a3/main-failure-review-v1/source-fingerprint-diagnostic-v1/release-response.json",
        "bytes": 85,
        "sha256": "7c4c8b778cae5a3334a1bc1049df2f1b0668296db71f536ff9f47bf83fd70bf6"
    },
    {
        "path": "/nfs/roberts/project/pi_jss233/zc362/chrono_divide/research-evidence/strategic-diagnostic-s1-a3/main-failure-review-v1/source-fingerprint-diagnostic-v1/slurm-28248902.err",
        "bytes": 0,
        "sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
    },
    {
        "path": "/nfs/roberts/project/pi_jss233/zc362/chrono_divide/research-evidence/strategic-diagnostic-s1-a3/main-failure-review-v1/source-fingerprint-diagnostic-v1/slurm-28248902.out",
        "bytes": 216,
        "sha256": "dab8914cacdbfe9be588701bf282aae13c0dbfe42abb85775374836ff9532ec6"
    },
    {
        "path": "/nfs/roberts/project/pi_jss233/zc362/chrono_divide/research-evidence/strategic-diagnostic-s1-a3/main-failure-review-v1/source-fingerprint-diagnostic-v1/snapshot-0.json",
        "bytes": 380405,
        "sha256": "2c05b256ee64df35c06fc3bb8ae556b9500a81c942099ac00d15e72df263d5ca"
    },
    {
        "path": "/nfs/roberts/project/pi_jss233/zc362/chrono_divide/research-evidence/strategic-diagnostic-s1-a3/main-failure-review-v1/source-fingerprint-diagnostic-v1/snapshot-1.json",
        "bytes": 380405,
        "sha256": "7ebbed6dd7fa9bf8c2bc1b4d58df75f30284168b2dafe212bf9b11354bda3fc5"
    },
    {
        "path": "/nfs/roberts/project/pi_jss233/zc362/chrono_divide/research-evidence/strategic-diagnostic-s1-a3/main-failure-review-v1/source-fingerprint-diagnostic-v1/submission-intent.json",
        "bytes": 1087,
        "sha256": "5baeaa2f1dc0a15e96115624759ea98ac43c7f119afe54ee7a012c7897500a5c"
    },
    {
        "path": "/nfs/roberts/project/pi_jss233/zc362/chrono_divide/research-evidence/strategic-diagnostic-s1-a3/main-failure-review-v1/source-fingerprint-diagnostic-v1/submission-response.json",
        "bytes": 95,
        "sha256": "dbf4ee5067539b1102ca32c5bafed852f737f30c02708a802757b035d90a6959"
    },
    {
        "path": "/nfs/roberts/project/pi_jss233/zc362/chrono_divide/research-evidence/strategic-diagnostic-s1-a3/main-failure-review-v1/source-fingerprint-diagnostic-v1/submission.json",
        "bytes": 1251,
        "sha256": "42e4cd866c91ef29b06488ad055dd91dcc2d6b39d3aec8f62daed613b4916175"
    }
];

export function buildA3S1Plan(maps) {
    const current = buildStrategicS1Plan(maps);
    return {
        ...current,
        kind: "strategic-diagnostic-s1-plan-v3",
        protocolSha356: "859f0468583837456db65a0197ca2524ce370ac8fdaae7ddc95373046ca2c65a",
        cases: current.cases.map((c) => ({ ...c, requestedEngineSeed: 3350150000 + c.caseIndex })),
        canaries: current.canaries.map((c, i) => ({ ...c, requestedEngineSeed: 3350151000 + i })),
        smoke: { ...current.smoke, requestedEngineSeed: 3350151100 },
    };
}
export const a3S1History = (manifest) => ({
    sourceCommit: "8c0b78e2fda3ca42f8051417aa0c272344a494dd",
    selectorJobId: "28219020",
    canaryArrayJobId: "28232168",
    canaryFinalizerJobId: "28232169",
    smokeJobId: "28239838",
    mainArrayJobId: "28245691",
    mainFinalizerJobId: "28245692",
    definitions: 205,
    zeroUpdateInitializations: 205,
    completedCanaryEpisodes: 8,
    completedCanaryPairs: 4,
    canaryUpdatesEach: 3600,
    completedSmokeTechnicalEpisodes: 1,
    mainAllocatedCases: 200,
    mainCompletedAllocations: 13,
    mainFailedAllocations: 1,
    mainCancelledAllocations: 186,
    mainLaunchAttempts: 42,
    allMainIdentitiesReserved: true,
    failedOrCancelledAdvancingUpdates: null,
    failedCase13MainInitialized: false,
    failedCase13SelectorInitialized: true,
    historicalRejectedSourceSnapshotRetained: false,
    historicalCauseKnown: false,
    mainGatePassed: false,
    partialCompetitivePayloadOpened: false,
    manifest,
    evidence: A3_S1_EVIDENCE,
});
export function validateA3S1Metadata(plan, m) {
    const expected = buildA3S1Plan(plan.maps),
        all = [...expected.cases, ...expected.canaries, expected.smoke];
    requireTrue(
        m.kind === "strategic-s1-manifest-v1" &&
            m.complete === true &&
            m.passed === true &&
            m.source.sourceCommit === "8c0b78e2fda3ca42f8051417aa0c272344a494dd" &&
            m.scheduler.jobId === "28219020",
        "A3 selector identity",
    );
    exact(m.plan, expected, "complete reserved A3 plan");
    const launches = all.map((c) => ({
        role: c.role,
        caseIndex: c.caseIndex,
        mode: "zero_update",
        requestedEngineSeed: c.requestedEngineSeed,
        policy: "unchanged_strongbot",
    }));
    exact(m.launches, launches, "all A3 selector launches");
    exact(
        m.observations,
        all.map((c) => ({
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
        })),
        "all A3 zero observations",
    );
    return { expected, launches };
}
export function validateA3MainReview(review) {
    requireTrue(review.kind === "strategic-s1-a3-main-failure-review-v1" && review.reviewComplete === true &&
        review.sourceCommit === "8c0b78e2fda3ca42f8051417aa0c272344a494dd" &&
        review.protocolSha256 === "859f0468583837456db65a0197ca2524ce370ac8fdaae7ddc95373046ca2c65a" &&
        review.mainArrayJobId === "28245691" && review.finalizerJobId === "28245692" &&
        review.mainGatePassed === false && review.scientificResult === false &&
        review.partialCompetitivePayloadsOpened === false && review.all200MainIdentitiesReserved === true &&
        review.all205DefinitionIdentitiesReserved === true && review.failedCase13LaunchAttempt === false &&
        review.failedCase13InitializerOrGameEntered === false && review.failedDifferingSourceFieldKnown === false &&
        review.cancelledAdvancingCountsKnown === false && review.launchedIdentities === 42 &&
        review.originalPolicyChanged === false && review.goldensChanged === false &&
        review.manuscriptChanged === false && review.M2Achieved === false &&
        review.workerAllocations.length === 200 && review.evidence.length === 146 && review.submissions.length === 15,
        "A3 sealed terminal review scope");
    const statuses = {COMPLETED: 0, FAILED: 0, CANCELLED: 0};
    for (const [i, r] of review.workerAllocations.entries()) {
        requireTrue(r.length === 17 && r[0] === "28245691_" + i && r[4] === "pi_jss233" && r[5] === "day" &&
            ["0", "1"].includes(r[6]) && ["0", "1"].includes(r[7]) && r[8] === "8G" && r[9] === "360" &&
            r[13] === "0" && r[14] === "billing=1,cpu=1,mem=8G,node=1" &&
            !/gpu/i.test(r[15]) && r[16] === path.join(PROJECT, "strong-chronodivide-bot"),
            "A3 complete worker accounting resources");
        if (r[2] === "COMPLETED") {
            requireTrue(r[3] === "0:0" && r[6] === "1" && r[7] === "1", "A3 completed exit/resources");
            statuses.COMPLETED++;
        } else if (r[2] === "FAILED") {
            requireTrue(i === 13 && r[1] === "28245818" && r[3] === "1:0" && r[6] === "1" && r[7] === "1",
                "A3 prelaunch failure identity");
            statuses.FAILED++;
        } else {
            requireTrue(r[2].startsWith("CANCELLED"), "A3 all terminal statuses");
            statuses.CANCELLED++;
        }
    }
    exact(statuses, {COMPLETED: 13, FAILED: 1, CANCELLED: 186}, "A3 terminal population");
    exact(review.statusCounts, statuses, "A3 recorded status counts");
    const f = review.finalizerAllocation;
    requireTrue(f.length === 17 && f[0] === "28245692" && f[2] === "CANCELLED by 24761" &&
        f[3] === "0:0" && f[4] === "pi_jss233" && f[5] === "day" && f[6] === "0" && f[7] === "0" &&
        f[8] === "24G" && f[9] === "480" && f[10] === "0" && f[11] === "00:00:00" && f[13] === "0",
        "A3 finalizer never executed");
    requireTrue(review.failures.length === 1 && review.failures[0].caseIndex === 13 &&
        review.failures[0].value.errorMessageSha256 === "e3e486c0e145054faa20762301bf43217ddbbb245ad3d8ed211dbe4366b4bdf0",
        "A3 exact source-drift error identity");
    const seen = new Set();
    requireTrue(review.journals.length === 42, "A3 full journal population");
    for (const j of review.journals) {
        requireTrue(Number.isSafeInteger(j.caseIndex) && j.caseIndex >= 0 && j.caseIndex < 200 &&
            j.caseIndex !== 13 && !seen.has(j.caseIndex) && typeof j.hasPublicationMarker === "boolean", "A3 journal case identity");
        seen.add(j.caseIndex);
        exact(j.launches, [{role: "diagnostic", caseIndex: j.caseIndex, mode: "diagnostic",
            requestedEngineSeed: 3350150000 + j.caseIndex, policy: "unchanged_strongbot"}], "A3 reserved main launch");
    }
    return statuses;
}

function auditA3S1(plan, metadata, manifest) {
    const {expected, launches} = validateA3S1Metadata(plan, metadata),
        base = path.join(EVIDENCE, "strategic-diagnostic-s1-a3");
    for (const prior of REGISTRATIONS.slice(0, 12))
        requireTrue(metadata.seedAudit.inspectedRegistrationFiles.some((d) => d.path === prior.path && d.sha256 === prior.sha256),
            "A3 full prior-registration chain");
    for (const d of A3_S1_EVIDENCE) {
        const actual = checkedFile(d.path, d.sha256);
        requireTrue(actual.bytes === d.bytes, "A3 immutable evidence bytes");
    }
    exact(fs.readFileSync(path.join(base, "execution-v1/manifest/COMPLETE"), "utf8"),
        launches.map((l) => "LAUNCH_S1_V1 " + JSON.stringify(l) + "\n").join("") +
        "COMPLETE_S1_V1 " + manifest.sha256 + " " + manifest.bytes + "\n", "A3 full selector journal");
    for (const stage of ["pure", "prepare", "canary-finalize", "smoke"]) {
        const receipt = json(path.join(base, "verification-" + stage + "-v1.json"));
        requireTrue(receipt.complete === true && receipt.passed === true, "A3 accepted prerequisite receipt");
        if (receipt.audit) {
            const d = checkedFile(receipt.audit.path, receipt.audit.sha256);
            requireTrue(d.bytes === receipt.audit.bytes, "A3 independent prerequisite audit descriptor");
            const program = checkedFile(receipt.audit.program.path, receipt.audit.program.sha256);
            requireTrue(program.bytes === receipt.audit.program.bytes, "A3 independent prerequisite program descriptor");
        }
    }
    const aggregate = json(path.join(base, "execution-v1/canary-finalizer/record.json"));
    requireTrue(aggregate.complete === true && aggregate.passed === true && aggregate.configurations === 4 &&
        aggregate.advancingEpisodes === 8 && aggregate.arrayJobId === "28232168" &&
        aggregate.scheduler.jobId === "28232169" && aggregate.records.length === 4, "A3 complete technical canary");
    for (const [i, c] of expected.canaries.entries()) {
        const r = aggregate.records[i].value;
        exact(r.assignment, c, "A3 canary assignment");
        exact(r.launches, ["canary_endpoint_only", "canary_strategic"].map((mode) => ({
            role: "canary", caseIndex: c.caseIndex, mode, requestedEngineSeed: c.requestedEngineSeed, policy: "unchanged_strongbot",
        })), "A3 technical canary launch identities");
        requireTrue(r.episodes.length === 2 &&
            r.episodes.every((e) => e.complete === true && e.technicalPass === true && e.updates === 3600), "A3 technical canary returns");
    }
    const smoke = json(path.join(base, "execution-v1/smoke/record.json"));
    requireTrue(smoke.complete === true && smoke.passed === true && smoke.scheduler.jobId === "28239838" &&
        smoke.episode.kind === "strategic-s1-smoke-technical-v2" && smoke.episode.crossChannelVerified === true,
        "A3 accepted technical smoke only");
    const review = json(path.join(base, "main-failure-review-v1/record.json"));
    validateA3MainReview(review);
    requireTrue(!fs.existsSync(path.join(base, "execution-v1/finalizer")), "A3 finalizer no execution directory");
    exact(fs.readdirSync(path.join(base, "execution-v1/cases/task-0013")).sort(), ["FAILURE.json"], "A3 task13 prelaunch-only directory");
    exact(json(path.join(base, "execution-v1/cases/task-0013/FAILURE.json")), review.failures[0].value, "A3 exact retained prelaunch failure");
    // All old competitive records and logs remain opaque. Hash descriptors only.
    for (const d of [...review.evidence, ...review.submissions]) {
        const actual = checkedFile(d.path, d.sha256);
        requireTrue(actual.bytes === d.bytes, "A3 sealed opaque artifact/submission");
    }
    for (const j of review.journals) {
        const dir = path.join(base, "execution-v1/cases/task-" + String(j.caseIndex).padStart(4, "0")),
            p = path.join(dir, "COMPLETE"), d = checkedFile(p, j.identity.sha256);
        requireTrue(d.bytes === j.identity.bytes, "A3 launch journal byte binding");
        const prefix = "LAUNCH_S1_V1 " + JSON.stringify(j.launches[0]) + "\n",
            text = fs.readFileSync(p, "utf8");
        if (j.hasPublicationMarker) {
            const opaque = review.evidence.find((d) => d.path === path.join(dir, "record.json"));
            requireTrue(opaque !== undefined, "A3 opaque publication descriptor");
            exact(text, prefix + "COMPLETE_S1_V1 " + opaque.sha256 + " " + opaque.bytes + "\n", "A3 completed journal hash-only binding");
        } else exact(text, prefix, "A3 attempted journal");
    }
    const diagnostic = json(path.join(base, "main-failure-review-v1/source-fingerprint-diagnostic-v1/CONTROLLER_VERIFIED.json"));
    requireTrue(diagnostic.completeReview === true && diagnostic.jobId === "28248902" &&
        diagnostic.node === "c1104u11n01" && diagnostic.currentFingerprintsMatch === true &&
        diagnostic.historicalRejectedSnapshotRecovered === false && diagnostic.historicalDifferingFieldIdentified === false &&
        diagnostic.sourceOrRuntimeEdit === false && diagnostic.gameInitializations === 0 &&
        diagnostic.advancingEpisodes === 0 && diagnostic.registrationCensus === 0 &&
        diagnostic.partialCompetitivePayloadRead === false && diagnostic.formalStudyGate === false, "A3 diagnostic limited scope");
    const freeze = json(path.join(base, "submissions-v1/main/freeze.json"));
    for (const i of [0, 1]) {
        const s = json(path.join(base, "main-failure-review-v1/source-fingerprint-diagnostic-v1/snapshot-" + i + ".json"));
        requireTrue(s.ordinal === i && s.sourceMatchesFreeze === true && s.runtimeMatchesFreeze === true,
            "A3 later source-only snapshot scope");
        exact(s.source, freeze.source, "A3 later source metadata match");
        exact(s.runtime, freeze.runtime, "A3 later runtime metadata match");
    }
    const preserved = json(path.join(base, "development/a4-preservation-v1/PRESERVED.json"));
    requireTrue(preserved.sourceCommit === "8c0b78e2fda3ca42f8051417aa0c272344a494dd" &&
        preserved.sourcePristine === true && preserved.noActiveChronoSourceJobs === true &&
        preserved.sourceFiles.length === 1064 && preserved.runtimeTrees.length === 3 &&
        preserved.opaqueArtifactsOnlyHashed === true && preserved.partialCompetitivePayloadRead === false &&
        preserved.sourceOrRuntimeEdit === false && preserved.gameOrInitializerRerun === false,
        "A3 source/runtime preserved before A4");
    return a3S1History(manifest);
}

export const REGISTRATION_AFTER_UTC = "2026-09-09T06:35:54Z";
export const permittedRegistrations = () => [...REGISTRATIONS.map((r) => r.path), CERT, GATE2_RECEIPT].sort();
export function validateRegistrationScan(discovered) {
    requireTrue(Array.isArray(discovered) && new Set(discovered).size === discovered.length, "duplicate census paths");
    exact(discovered.slice().sort(), permittedRegistrations(), "exact registration census");
}
export function proposedS1Seeds(plan) {
    validateStrategicS1Plan(plan);
    const seeds = [...plan.cases, ...plan.canaries, plan.smoke].map((c) => c.requestedEngineSeed);
    exact(
        seeds,
        [
            ...Array.from({ length: 200 }, (_, i) => 3350160000 + i),
            3350161000,
            3350161001,
            3350161002,
            3350161003,
            3350161100,
        ],
        "prospective seeds",
    );
    return seeds;
}
export function registeredSeeds(metadata, proposed, expectedDefinitions) {
    requireTrue(
        metadata?.complete === true &&
            metadata?.passed === true &&
            Array.isArray(metadata.plan?.cases) &&
            metadata.plan.cases.length > 0,
        "registration schema",
    );
    const p = metadata.plan;
    requireTrue(p.canaries === undefined || Array.isArray(p.canaries), "registered canaries");
    requireTrue(
        p.smoke === undefined || (p.smoke && typeof p.smoke === "object" && !Array.isArray(p.smoke)),
        "registered smoke",
    );
    const seeds = [...p.cases, ...(p.canaries ?? []), ...(p.smoke ? [p.smoke] : [])].map((c) => c.requestedEngineSeed);
    requireTrue(
        seeds.length === expectedDefinitions &&
            seeds.every((s) => Number.isSafeInteger(s) && s >= 3350000000 && s < 3351000000 && !proposed.includes(s)),
        "registered seed collision/schema",
    );
    requireTrue(
        p.tasks === undefined ||
            (Array.isArray(p.tasks) && p.tasks.every((t) => seeds.includes(t.requestedEngineSeed))),
        "registered duplicate tasks",
    );
    return seeds;
}
export function validateHistoricalPlans(plan, a1, d1, failure, journal) {
    const proposed = proposedS1Seeds(plan);
    exact(a1.plan, buildA1(plan.maps), "complete consumed OD1 A1 definitions");
    exact(d1.plan, buildUnifiedIntentD1Plan(plan.maps), "complete consumed D1 definitions");
    requireTrue(
        failure.mode === "prepare" &&
            failure.sourceCommit === "468dae122744505a7c46e3de1b0d13c4fa15d13a" &&
            failure.scheduler?.jobId === "26516850",
        "failed OD1 V1 selector identity",
    );
    const expected = buildOd1(plan.maps),
        all = [...expected.cases, ...expected.canaries, expected.smoke];
    exact(journal, failure.launches, "preserved failed selector journal");
    exact(
        journal,
        all.map((c) => ({
            role: c.role,
            caseIndex: c.caseIndex,
            arm: "disabled",
            mode: "zero_update",
            requestedEngineSeed: c.requestedEngineSeed,
        })),
        "full failed OD1 population",
    );
    requireTrue(
        journal.length === 905 && journal.every((l) => !proposed.includes(l.requestedEngineSeed)),
        "failed-selector collision",
    );
}
const checkedFile = (file, sha256) => {
    const stat = fs.lstatSync(file);
    requireTrue(
        stat.isFile() && !stat.isSymbolicLink() && fileHash(file) === sha256,
        "historical file binding " + file,
    );
    return { path: file, bytes: stat.size, sha256 };
};
/** Called once by the future source-bound CPU Slurm prepare stage, before ANY initializer.
 * Never invoke the slow census interactively. This module has no initialization imports. */
export function auditFreshSeeds(plan) {
    requireTrue(process.env.MODE === "prepare", "registration census is Slurm preparation only");
    schedulerIdentity("prepare");
    const proposed = proposedS1Seeds(plan);
    const certIdentity = checkedFile(CERT, CERT_SHA),
        certificate = json(CERT);
    requireTrue(
        certificate.complete === true &&
            certificate.passed === true &&
            certificate.competitiveFieldsAbsent === true &&
            certificate.selectedBase === 3350000000,
        "seed certificate eligibility",
    );
    exact(certificate.selectedInterval, [3350000000, 3351000000], "certificate interval");
    requireTrue(
        certificate.audit.path === CERT_AUDIT &&
            certificate.audit.sha256 === CERT_AUDIT_SHA &&
            certificate.audit.bytes === 585357862,
        "original supporting audit binding",
    );
    const auditIdentity = checkedFile(CERT_AUDIT, CERT_AUDIT_SHA);
    requireTrue(auditIdentity.bytes === certificate.audit.bytes, "supporting audit bytes");
    const receiptIdentity = checkedFile(GATE2_RECEIPT, GATE2_RECEIPT_SHA);
    const found = execFileSync(
        "/usr/bin/find",
        [
            PROJECT,
            "(",
            "-name",
            "node_modules",
            "-o",
            "-name",
            ".git",
            ")",
            "-prune",
            "-o",
            "(",
            "-type",
            "f",
            "-o",
            "-type",
            "l",
            ")",
            "-newermt",
            "2026-09-09 06:35:54 UTC",
            "(",
            "-iname",
            "*manifest*.json",
            "-o",
            "-iname",
            "*selection*.json",
            "-o",
            "-iname",
            "*reservation*.json",
            "-o",
            "-iname",
            "*plan*.json",
            "-o",
            "-path",
            "*/manifest/record.json",
            ")",
            "-print0",
        ],
        { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 },
    )
        .split("\0")
        .filter(Boolean)
        .sort();
    validateRegistrationScan(found);
    const records = [],
        metadata = [];
    for (const spec of REGISTRATIONS) {
        const identity = checkedFile(spec.path, spec.sha256),
            value = json(spec.path);
        const seeds = registeredSeeds(value, proposed, spec.definitions);
        records.push({
            ...identity,
            definitions: seeds.length,
            distinctSeeds: new Set(seeds).size,
            minSeed: Math.min(...seeds),
            maxSeed: Math.max(...seeds),
            seedsSha256: hash(JSON.stringify(seeds)),
            collisions: 0,
        });
        metadata.push(value);
    }
    // Cross-bind all eight older registrations to the audited D1 registration chain.
    for (const prior of REGISTRATIONS.slice(0, 8))
        requireTrue(
            metadata[8].seedAudit.inspectedRegistrationFiles.some(
                (r) => r.path === prior.path && r.sha256 === prior.sha256,
            ),
            "D1 prior-registration chain",
        );
    const abandoned = path.join(EVIDENCE, "unified-intent-arbiter-v2/od1/execution-v1/manifest");
    const failureFile = path.join(abandoned, "FAILURE.json"),
        journalFile = path.join(abandoned, "COMPLETE");
    const failedAudit = path.join(EVIDENCE, "unified-intent-arbiter-v2/od1/selector-failure-audit-v1.json");
    const failureIdentity = checkedFile(
        failureFile,
        "ca726a89c6dcd00635f4eae458aafb53ea6d1fd7f9354b254860b4979aef4a2b",
    );
    const journalIdentity = checkedFile(
        journalFile,
        "9dd5fe87d5e08e15884a0821dc8a1b41fa6f0578cb6fc7eae9a5a6854b54b9c6",
    );
    const failedAuditIdentity = checkedFile(
        failedAudit,
        "04a7ab8f3c9ce8ceecbacc818e1d38d7ab35453b9318b57756a230d3ad85b7b3",
    );
    requireTrue(!fs.existsSync(path.join(abandoned, "record.json")), "abandoned selector published unexpectedly");
    const failure = json(failureFile),
        journal = parseOd1Journal(fs.readFileSync(journalFile, "utf8"));
    validateHistoricalPlans(plan, metadata[7], metadata[8], failure, journal);
    const originalS1 = auditOriginalS1(plan, metadata[9], records[9]);
    const a1S1 = auditA1S1(plan, metadata[10], records[10]);
    const a2S1 = auditA2S1(plan, metadata[11], records[11]);
    const a3S1 = auditA3S1(plan, metadata[12], records[12]);
    const accounting = execFileSync(
        "/opt/slurm/current/bin/sacct",
        ["-X", "-n", "-P", "-j", "26516850", "--format=JobIDRaw,Account,Partition,State,ExitCode,AllocCPUS,Restarts"],
        { encoding: "utf8" },
    ).trim();
    exact(accounting, "26516850|pi_jss233|day|FAILED|1:0|1|0", "abandoned accounting");
    return {
        kind: "strategic-s1-registration-audit-v2",
        complete: true,
        passed: true,
        technicalOnly: true,
        registrationRoot: PROJECT,
        registrationAfterUtc: REGISTRATION_AFTER_UTC,
        discovered: found,
        inspectedRegistrationFiles: records,
        supportingMetadata: [certIdentity, auditIdentity, receiptIdentity],
        abandonedSelector: {
            jobId: "26516850",
            zeroUpdateInitializations: 905,
            advancingEpisodes: 0,
            accounting,
            failure: failureIdentity,
            launchJournal: journalIdentity,
            audit: failedAuditIdentity,
        },
        od1A1: { definitions: 905, zeroUpdateInitializations: 905, advancingEpisodes: 1818, manifest: records[7] },
        d1: { definitions: 205, zeroUpdateInitializations: 205, advancingEpisodes: 627, manifest: records[8] },
        originalS1,
        a1S1,
        a2S1,
        a3S1,
        priorZeroUpdateInitializations: 2835,
        newSeeds: {
            count: proposed.length,
            min: Math.min(...proposed),
            max: Math.max(...proposed),
            sha256: hash(JSON.stringify(proposed)),
        },
        collisions: 0,
        scope: "Registration/certificate/journal metadata only; no competitive payloads opened or engine initialized.",
    };
}
export { buildStrategicS1Plan };
