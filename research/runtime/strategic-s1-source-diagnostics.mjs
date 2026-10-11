import fs from "node:fs";
import path from "node:path";
import {
    REPO, STUDY, SHA, STAGES, exact, fields, requireTrue, encode, hash, fileIdentity, writeExclusive,
} from "./strategic-s1-io.mjs";

export const SOURCE_DIAGNOSTICS_ROOT = path.join(STUDY, "startup-source-diagnostics-v1");
export const MAX_SOURCE_DIAGNOSTIC_BYTES = 8 * 1024 * 1024;
const SOURCE_KEYS = [
    "sourceCommit", "programSha256", "scriptSha256", "protocolSha256",
    "configuration", "files", "driverTree", "candidateTree",
];
const CONFIG_KEYS = [
    "cwd", "aiIniOverride", "aiIniCandidates", "configuredGameApiPath", "participantNames",
    "participantRngIdentities", "observationMode", "arbiterEnabled",
];
const unsigned = (v) => Number.isSafeInteger(v) && v >= 0;
const codePath = (v) => typeof v === "string" && path.isAbsolute(v) && path.resolve(v) === v &&
    (v === REPO || v.startsWith(REPO + "/"));
function dataOnly(v, active = new Set()) {
    if (v === null || typeof v !== "object") return;
    requireTrue(!active.has(v), "source diagnostic cycle");
    active.add(v);
    requireTrue(Object.getOwnPropertySymbols(v).length === 0, "source diagnostic symbol");
    for (const d of Object.values(Object.getOwnPropertyDescriptors(v))) {
        requireTrue(Object.hasOwn(d, "value"), "source diagnostic accessor");
        dataOnly(d.value, active);
    }
    active.delete(v);
}
function descriptor(v) {
    fields(v, ["path", "bytes", "sha256"], "source diagnostic descriptor");
    requireTrue(codePath(v.path) && unsigned(v.bytes) && SHA.test(v.sha256), "source diagnostic descriptor value");
}
function tree(v) {
    fields(v, ["root", "files", "bytes", "sha256"], "source diagnostic tree");
    requireTrue(codePath(v.root) && unsigned(v.files) && unsigned(v.bytes) && SHA.test(v.sha256), "source diagnostic tree value");
}
/** Strict metadata allowlist: never serialize arbitrary runtime/environment/game objects. */
export function validateSourceDiagnosticSnapshot(v) {
    dataOnly(v);
    fields(v, SOURCE_KEYS, "source diagnostic source");
    requireTrue(/^[0-9a-f]{40}$/.test(v.sourceCommit) &&
        ["programSha256", "scriptSha256", "protocolSha256"].every((k) => SHA.test(v[k])), "source diagnostic source identity");
    fields(v.configuration, CONFIG_KEYS, "source diagnostic configuration");
    const c = v.configuration;
    requireTrue(codePath(c.cwd) && codePath(c.configuredGameApiPath) &&
        (c.aiIniOverride === null || codePath(c.aiIniOverride)) &&
        typeof c.arbiterEnabled === "boolean" && typeof c.observationMode === "string" &&
        c.observationMode.length <= 128, "source diagnostic configuration values");
    for (const k of ["participantNames", "participantRngIdentities"])
        requireTrue(Array.isArray(c[k]) && c[k].every((s) => typeof s === "string" && s.length <= 128), "source diagnostic participant metadata");
    requireTrue(Array.isArray(c.aiIniCandidates), "source diagnostic AI candidates");
    for (const ai of c.aiIniCandidates) {
        if (ai === null) continue;
        requireTrue(ai && typeof ai === "object" && typeof ai.present === "boolean", "source diagnostic AI presence");
        if (ai.present) {
            fields(ai, ["present", "path", "bytes", "sha256"], "source diagnostic present AI");
            descriptor({path: ai.path, bytes: ai.bytes, sha256: ai.sha256});
        } else {
            fields(ai, ["path", "present"], "source diagnostic absent AI");
            requireTrue(codePath(ai.path), "source diagnostic absent AI path");
        }
    }
    requireTrue(Array.isArray(v.files), "source diagnostic source files");
    v.files.forEach(descriptor);
    tree(v.driverTree);
    tree(v.candidateTree);
    encode(v); // finite, plain, nonlossy JSON; validates cycles/sparse/unsupported data.
}
const pointer = (key) => String(key).replaceAll("~", "~0").replaceAll("/", "~1");
const identity = (v) => {
    const s = JSON.stringify(v);
    return { bytes: Buffer.byteLength(s), sha256: hash(s) };
};
/** Differences describe every mismatching subtree, including key order, not canonical equality. */
export function sourceDiagnosticDifferences(expected, actual) {
    const result = [];
    const walk = (a, b, p) => {
        if (JSON.stringify(a) === JSON.stringify(b)) return;
        const ao = a !== null && typeof a === "object", bo = b !== null && typeof b === "object";
        if (!ao || !bo || Array.isArray(a) !== Array.isArray(b)) {
            result.push({path: p, kind: "value", expected: identity(a), actual: identity(b)});
            return;
        }
        if (Array.isArray(a)) {
            if (a.length !== b.length) result.push({path: p, kind: "array-length", expected: a.length, actual: b.length});
            for (let i = 0; i < Math.max(a.length, b.length); i++) {
                if (i >= a.length || i >= b.length)
                    result.push({path: p + "/" + i, kind: "presence", expectedPresent: i < a.length, actualPresent: i < b.length});
                else walk(a[i], b[i], p + "/" + i);
            }
        } else {
            const ak = Object.keys(a), bk = Object.keys(b);
            if (JSON.stringify(ak) !== JSON.stringify(bk))
                result.push({path: p, kind: "ordered-keys", expected: ak, actual: bk});
            for (const k of new Set([...ak, ...bk])) {
                if (!Object.hasOwn(a, k) || !Object.hasOwn(b, k))
                    result.push({path: p + "/" + pointer(k), kind: "presence", expectedPresent: Object.hasOwn(a, k), actualPresent: Object.hasOwn(b, k)});
                else walk(a[k], b[k], p + "/" + pointer(k));
            }
        }
    };
    walk(expected, actual, "");
    return result;
}
function checkedScheduler(stage, scheduler) {
    fields(scheduler, ["jobId", "arrayJobId", "arrayTaskId", "account", "partition", "cpus", "restarts"], "source diagnostic scheduler");
    const digit = (v) => typeof v === "string" && /^[1-9][0-9]{0,19}$/.test(v);
    requireTrue((stage === "pure" || STAGES.includes(stage)) && digit(scheduler.jobId) &&
        scheduler.account === "pi_jss233" && scheduler.partition === "day" &&
        scheduler.cpus === 1 && scheduler.restarts === 0, "source diagnostic scheduler values");
    if (stage === "case" || stage === "canary")
        requireTrue(digit(scheduler.arrayJobId) && /^(0|[1-9][0-9]*)$/.test(scheduler.arrayTaskId ?? "") &&
            Number(scheduler.arrayTaskId) < (stage === "case" ? 200 : 4), "source diagnostic array values");
    else requireTrue(scheduler.arrayJobId === null && scheduler.arrayTaskId === null, "source diagnostic nonarray");
}
export function makeSourceDiagnostic(expected, actual, stage, scheduler) {
    validateSourceDiagnosticSnapshot(expected);
    validateSourceDiagnosticSnapshot(actual);
    checkedScheduler(stage, scheduler);
    const expectedSerialized = JSON.stringify(expected), actualSerialized = JSON.stringify(actual);
    requireTrue(expectedSerialized !== actualSerialized, "source diagnostic requires mismatch");
    const value = {
        kind: "strategic-s1-startup-source-diagnostic-v1",
        complete: true, technicalOnly: true, accepted: false, initializerEntered: false,
        stage, scheduler: structuredClone(scheduler),
        expected: JSON.parse(expectedSerialized), actual: JSON.parse(actualSerialized),
        expectedSerialized, actualSerialized,
        expectedSerializedIdentity: identity(expected), actualSerializedIdentity: identity(actual),
        expectedOrderedKeys: Object.keys(expected), actualOrderedKeys: Object.keys(actual),
        changedComponents: [
            ...(JSON.stringify(Object.keys(expected)) !== JSON.stringify(Object.keys(actual)) ? ["$orderedKeys"] : []),
            ...[...new Set([...Object.keys(expected), ...Object.keys(actual)])]
                .filter((k) => JSON.stringify(expected[k]) !== JSON.stringify(actual[k])),
        ],
        differences: sourceDiagnosticDifferences(expected, actual),
    };
    requireTrue(value.differences.length > 0, "source diagnostic missing differences");
    const data = encode(value);
    requireTrue(Buffer.byteLength(data) <= MAX_SOURCE_DIAGNOSTIC_BYTES, "source diagnostic byte limit");
    return {value, data};
}
function checkedAncestors(directory) {
    requireTrue(path.isAbsolute(directory) && path.resolve(directory) === directory &&
        directory.startsWith(STUDY + "/") &&
        directory !== path.join(STUDY, "execution-v1") &&
        !directory.startsWith(path.join(STUDY, "execution-v1") + "/"), "source diagnostic confinement");
    let current = directory;
    for (;;) {
        try {
            const s = fs.lstatSync(current);
            requireTrue(s.isDirectory() && !s.isSymbolicLink(), "source diagnostic ancestor");
        } catch (error) {
            if (error.code !== "ENOENT") throw error;
        }
        if (current === path.parse(current).root) break;
        current = path.dirname(current);
    }
}
/** Exclusive directory reservation + no-follow file + directory/file fsync. No retry. */
export function publishSourceDiagnostic(expected, actual, stage, scheduler, root = SOURCE_DIAGNOSTICS_ROOT) {
    const {data} = makeSourceDiagnostic(expected, actual, stage, scheduler);
    checkedAncestors(root);
    const parent = path.join(root, stage), directory = path.join(parent,
        "job-" + scheduler.jobId + "__task-" + (scheduler.arrayTaskId ?? "none"));
    checkedAncestors(directory);
    fs.mkdirSync(parent, {recursive: true, mode: 0o700});
    checkedAncestors(parent);
    fs.mkdirSync(directory, {mode: 0o700}); // EEXIST is intentional even after failure.
    checkedAncestors(directory);
    const file = path.join(directory, "record.json");
    writeExclusive(file, data);
    const stat = fs.lstatSync(file);
    requireTrue(stat.isFile() && !stat.isSymbolicLink(), "source diagnostic regular file");
    exact(fs.readFileSync(file, "utf8"), data, "source diagnostic readback");
    for (const d of [directory, parent, root]) {
        const fd = fs.openSync(d, fs.constants.O_RDONLY | fs.constants.O_DIRECTORY | fs.constants.O_NOFOLLOW);
        try { fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
    }
    return fileIdentity(file);
}
/** Recording failure is subordinate to the original exact-comparison rejection. */
export function preserveSourceMismatch(error, expected, actual, stage, scheduler, root = SOURCE_DIAGNOSTICS_ROOT) {
    try {
        error.startupSourceDiagnostic = publishSourceDiagnostic(expected, actual, stage, scheduler, root);
    } catch (captureError) {
        error.startupSourceDiagnosticFailure = {
            errorType: String(captureError.name), errorMessageSha256: hash(String(captureError.message)),
        };
    }
    return error;
}
export const sourceMismatchFailureFields = (error) => ({
    ...(error.startupSourceDiagnostic ? {startupSourceDiagnostic: error.startupSourceDiagnostic} : {}),
    ...(error.startupSourceDiagnosticFailure ? {startupSourceDiagnosticFailure: error.startupSourceDiagnosticFailure} : {}),
});
