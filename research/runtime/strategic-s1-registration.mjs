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
].map(([relative, sha256, definitions]) => ({ path: path.join(EVIDENCE, relative), sha256, definitions }));
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
            ...Array.from({ length: 200 }, (_, i) => 3350120000 + i),
            3350121000,
            3350121001,
            3350121002,
            3350121003,
            3350121100,
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
    for (const prior of REGISTRATIONS.slice(0, -1))
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
    const accounting = execFileSync(
        "/opt/slurm/current/bin/sacct",
        ["-X", "-n", "-P", "-j", "26516850", "--format=JobIDRaw,Account,Partition,State,ExitCode,AllocCPUS,Restarts"],
        { encoding: "utf8" },
    ).trim();
    exact(accounting, "26516850|pi_jss233|day|FAILED|1:0|1|0", "abandoned accounting");
    return {
        kind: "strategic-s1-registration-audit-v1",
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
        priorZeroUpdateInitializations: 2015,
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
