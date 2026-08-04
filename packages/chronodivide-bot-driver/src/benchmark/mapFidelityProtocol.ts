import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import util from "node:util";

export const MAP_FIDELITY_GATE = "map-fidelity-gate-v1" as const;
export const PINNED_DEBUG_LOGGING = "1" as const;
export const TREE_HASH_ALGORITHM = "sha256(relative_path NUL bytes NUL file_sha256 NUL)" as const;
export const BUNDLE_HASH_ALGORITHM = "sha256(label NUL value NUL), ordered as recorded" as const;
export const MAX_CAPTURED_WARNINGS_PER_SESSION = 100;

export type ConsoleLevel = "debug" | "info" | "log" | "warn" | "error";
export type WarningSeverity = "review" | "fail";
export type WarningCategory =
    | "missing_asset"
    | "unsupported_theater"
    | "invalid_terrain"
    | "invalid_object"
    | "invalid_rules"
    | "invalid_trigger_event"
    | "invalid_waypoint"
    | "parse_warning"
    | "unknown_reference"
    | "other_warning"
    | "engine_error";

export type CapturedWarning = {
    level: ConsoleLevel;
    category: WarningCategory;
    severity: WarningSeverity;
    text: string;
};

export type PhaseWarning = CapturedWarning & { phase: string };
export type SerializedWarning = Omit<PhaseWarning, "text"> & { diagnosticSha256: string };
export type SerializedError = {
    category: WarningCategory;
    name: "captured_error";
    messageSha256: string;
};

export type LoggingDescriptor = {
    debugLogging: typeof PINNED_DEBUG_LOGGING;
    source: "sbatch_pinned";
};

export type ExactFileDescriptor = {
    path: string;
    bytes: number;
    sha256: string;
};

export type TreeEntryDescriptor = {
    path: string;
    bytes: number;
    sha256: string;
};

export type TreeDescriptor = {
    root: string;
    fileCount: number;
    bytes: number;
    sha256: string;
    hashAlgorithm: typeof TREE_HASH_ALGORITHM;
    entries: TreeEntryDescriptor[];
};

export type BundleDescriptor = {
    hashAlgorithm: typeof BUNDLE_HASH_ALGORITHM;
    members: Array<{ label: string; value: string }>;
    sha256: string;
};

export type FidelityScope = "full" | "preflight";
export type ManifestSelection = {
    criterion: string;
    forbiddenCriterion: string;
    roleBlind: true;
    scope: FidelityScope;
    populationFamilyCount: number;
    familyCount: number;
    representativeField: string;
    preflightRule: string | null;
};

export type ProbeCoverage = {
    artifactKind:
        | "infrastructure_fidelity_preflight_probe_not_clearance"
        | "infrastructure_fidelity_full_probe_not_policy_evaluation";
    scope: FidelityScope;
    populationFamilyCount: number;
    runFamilyCount: number;
    fullCoverage: boolean;
    eligibleForFidelityClearance: false;
};

export const WARNING_CATEGORY_SEVERITY: Record<WarningCategory, WarningSeverity> = {
    missing_asset: "fail",
    unsupported_theater: "fail",
    invalid_terrain: "review",
    invalid_object: "review",
    invalid_rules: "review",
    invalid_trigger_event: "review",
    invalid_waypoint: "fail",
    parse_warning: "fail",
    unknown_reference: "review",
    other_warning: "review",
    engine_error: "fail",
};

const WARNING_SIGNAL =
    /\b(?:warn(?:ing)?|invalid|unsupported|unknown|missing|malformed|failed|failure|not found|cannot|could not|unable)\b/i;
const OUTCOME_DIAGNOSTIC = /\b(?:winner|loser|victor(?:y|ious)?|defeat(?:ed)?|credits?|win rate|score rate|score)\b/gi;

export const sanitizeDiagnosticText = (rawText: string): string =>
    rawText.replace(/\s+/g, " ").trim().replace(OUTCOME_DIAGNOSTIC, "[outcome-redacted]").slice(0, 4096);

export const classifyConsoleMessage = (level: ConsoleLevel, rawText: string): CapturedWarning | null => {
    const text = sanitizeDiagnosticText(rawText);
    if (text.length === 0 || (level !== "warn" && level !== "error" && !WARNING_SIGNAL.test(text))) {
        return null;
    }

    let category: WarningCategory;
    if (/\b(?:enoent|missing (?:file|asset)|file .{0,160} not found|asset .{0,160} not found)\b/i.test(text)) {
        category = "missing_asset";
    } else if (/\bunsupported theater\b/i.test(text)) {
        category = "unsupported_theater";
    } else if (/\b(?:terrain|tile|isomap|isometric)\b/i.test(text) && WARNING_SIGNAL.test(text)) {
        category = "invalid_terrain";
    } else if (
        /\b(?:object|unit|building|infantry|vehicle|aircraft|smudge|overlay)\b/i.test(text) &&
        WARNING_SIGNAL.test(text)
    ) {
        category = "invalid_object";
    } else if (/\b(?:rules?\.ini|art\.ini|rule|weapon|warhead|armor)\b/i.test(text) && WARNING_SIGNAL.test(text)) {
        category = "invalid_rules";
    } else if (/\b(?:trigger|event|action|teamtype|taskforce|script)\b/i.test(text) && WARNING_SIGNAL.test(text)) {
        category = "invalid_trigger_event";
    } else if (/\b(?:waypoint|starting point|spawn location)\b/i.test(text) && WARNING_SIGNAL.test(text)) {
        category = "invalid_waypoint";
    } else if (/\b(?:parse|parser|malformed|syntax|invalid section|invalid value)\b/i.test(text)) {
        category = "parse_warning";
    } else if (/\bunknown\b/i.test(text)) {
        category = "unknown_reference";
    } else {
        category = level === "error" ? "engine_error" : "other_warning";
    }

    return {
        level,
        category,
        severity: level === "error" ? "fail" : WARNING_CATEGORY_SEVERITY[category],
        text,
    };
};

/**
 * Captures warning-like console messages for one isolated engine phase and
 * always restores the process-global console methods. The helper deliberately
 * does not forward captured text to stdout/stderr, where raw diagnostics could
 * escape the outcome-redaction boundary.
 */
export const captureConsoleWarnings = async <T>(
    phase: string,
    action: () => Promise<T>,
): Promise<{ value: T | null; error: unknown | null; warnings: PhaseWarning[]; truncated: boolean }> => {
    const levels: ConsoleLevel[] = ["debug", "info", "log", "warn", "error"];
    const originals = new Map<ConsoleLevel, (...args: unknown[]) => void>();
    const warnings: PhaseWarning[] = [];
    let truncated = false;

    for (const level of levels) {
        const original = console[level] as (...args: unknown[]) => void;
        originals.set(level, original);
        console[level] = ((...args: unknown[]) => {
            const classified = classifyConsoleMessage(level, util.format(...args));
            if (!classified) return;
            if (warnings.length < MAX_CAPTURED_WARNINGS_PER_SESSION) warnings.push({ phase, ...classified });
            else truncated = true;
        }) as (typeof console)[typeof level];
    }

    try {
        return { value: await action(), error: null, warnings, truncated };
    } catch (error) {
        return { value: null, error, warnings, truncated };
    } finally {
        for (const level of levels) {
            console[level] = originals.get(level) as (typeof console)[typeof level];
        }
    }
};

export const diagnosticSha256 = (rawText: string): string =>
    createHash("sha256").update(sanitizeDiagnosticText(rawText), "utf8").digest("hex");

export const serializeCapturedWarning = (warning: PhaseWarning): SerializedWarning => {
    const { text, ...allowlisted } = warning;
    return { ...allowlisted, diagnosticSha256: diagnosticSha256(text) };
};

export const serializeCapturedError = (error: unknown): SerializedError => {
    const value = error instanceof Error ? error : new Error(String(error));
    const classified = classifyConsoleMessage("error", value.message);
    return {
        category: classified?.category ?? "engine_error",
        name: "captured_error",
        messageSha256: diagnosticSha256(value.message),
    };
};

export const fatalDiagnosticLine = (error: unknown): string =>
    `${JSON.stringify({
        gate: MAP_FIDELITY_GATE,
        outcomeFree: true,
        fatal: serializeCapturedError(error),
    })}\n`;

const HEX_SHA256 = /^[0-9a-f]{64}$/;

const assertRecord = (value: unknown, label: string): Record<string, unknown> => {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
        throw new Error(`${label} must be an object`);
    }
    return value as Record<string, unknown>;
};

const assertExactKeys = (value: unknown, keys: readonly string[], label: string): Record<string, unknown> => {
    const record = assertRecord(value, label);
    const expected = [...keys].sort();
    const actual = Object.keys(record).sort();
    if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
        throw new Error(`${label} keys must be exactly [${expected.join(", ")}], got [${actual.join(", ")}]`);
    }
    return record;
};

const assertNonnegativeInteger = (value: unknown, label: string): number => {
    if (!Number.isSafeInteger(value) || (value as number) < 0)
        throw new Error(`${label} must be a nonnegative integer`);
    return value as number;
};

const assertSha256 = (value: unknown, label: string): string => {
    if (typeof value !== "string" || !HEX_SHA256.test(value)) throw new Error(`${label} must be a lowercase SHA-256`);
    return value;
};

export const sha256File = (filePath: string): string => {
    const descriptor = fs.statSync(filePath);
    if (!descriptor.isFile()) throw new Error(`Required exact input is not a file: ${filePath}`);
    const digest = createHash("sha256");
    const handle = fs.openSync(filePath, "r");
    const buffer = Buffer.allocUnsafe(1024 * 1024);
    try {
        for (;;) {
            const bytesRead = fs.readSync(handle, buffer, 0, buffer.length, null);
            if (bytesRead === 0) break;
            digest.update(buffer.subarray(0, bytesRead));
        }
    } finally {
        fs.closeSync(handle);
    }
    return digest.digest("hex");
};

export const verifyExactFileDescriptor = (descriptor: ExactFileDescriptor, label: string): string => {
    const record = assertExactKeys(descriptor, ["path", "bytes", "sha256"], label);
    if (typeof record.path !== "string" || !path.isAbsolute(record.path)) {
        throw new Error(`${label}.path must be absolute`);
    }
    const expectedBytes = assertNonnegativeInteger(record.bytes, `${label}.bytes`);
    const expectedSha256 = assertSha256(record.sha256, `${label}.sha256`);
    if (!fs.existsSync(record.path)) throw new Error(`Required exact input is missing: ${record.path}`);
    const stat = fs.statSync(record.path);
    if (!stat.isFile() || stat.size !== expectedBytes)
        throw new Error(`Exact input size/type mismatch for ${record.path}`);
    const actualSha256 = sha256File(record.path);
    if (actualSha256 !== expectedSha256) throw new Error(`Exact input hash mismatch for ${record.path}`);
    return actualSha256;
};

const collectTreeEntries = (root: string): TreeEntryDescriptor[] => {
    const entries: TreeEntryDescriptor[] = [];
    const visit = (directory: string): void => {
        for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
            const absolute = path.join(directory, entry.name);
            if (entry.isDirectory()) {
                visit(absolute);
                continue;
            }
            const stat = fs.statSync(absolute);
            if (!stat.isFile()) continue;
            entries.push({
                path: path.relative(root, absolute).split(path.sep).join("/"),
                bytes: stat.size,
                sha256: sha256File(absolute),
            });
        }
    };
    visit(root);
    return entries.sort((left, right) => (left.path < right.path ? -1 : left.path > right.path ? 1 : 0));
};

export const treeCompositeSha256 = (entries: TreeEntryDescriptor[]): string => {
    const digest = createHash("sha256");
    for (const entry of entries) {
        digest.update(entry.path, "utf8");
        digest.update("\0");
        digest.update(String(entry.bytes), "ascii");
        digest.update("\0");
        digest.update(entry.sha256, "ascii");
        digest.update("\0");
    }
    return digest.digest("hex");
};

export const verifyTreeDescriptor = (descriptor: TreeDescriptor, label: string): string => {
    const record = assertExactKeys(
        descriptor,
        ["root", "fileCount", "bytes", "sha256", "hashAlgorithm", "entries"],
        label,
    );
    if (typeof record.root !== "string" || !path.isAbsolute(record.root) || !fs.statSync(record.root).isDirectory()) {
        throw new Error(`${label}.root must be an existing absolute directory`);
    }
    if (record.hashAlgorithm !== TREE_HASH_ALGORITHM) throw new Error(`${label}.hashAlgorithm is unsupported`);
    const expectedCount = assertNonnegativeInteger(record.fileCount, `${label}.fileCount`);
    const expectedBytes = assertNonnegativeInteger(record.bytes, `${label}.bytes`);
    const expectedSha256 = assertSha256(record.sha256, `${label}.sha256`);
    if (!Array.isArray(record.entries)) throw new Error(`${label}.entries must be an array`);
    const expectedEntries = record.entries.map((entry, index) => {
        const row = assertExactKeys(entry, ["path", "bytes", "sha256"], `${label}.entries[${index}]`);
        if (
            typeof row.path !== "string" ||
            row.path.length === 0 ||
            path.posix.isAbsolute(row.path) ||
            row.path.split("/").includes("..")
        ) {
            throw new Error(`${label}.entries[${index}].path must be a safe relative POSIX path`);
        }
        return {
            path: row.path,
            bytes: assertNonnegativeInteger(row.bytes, `${label}.entries[${index}].bytes`),
            sha256: assertSha256(row.sha256, `${label}.entries[${index}].sha256`),
        };
    });
    const sortedExpected = [...expectedEntries].sort((left, right) =>
        left.path < right.path ? -1 : left.path > right.path ? 1 : 0,
    );
    if (JSON.stringify(expectedEntries) !== JSON.stringify(sortedExpected)) {
        throw new Error(`${label}.entries are not in deterministic path order`);
    }
    if (new Set(expectedEntries.map((entry) => entry.path)).size !== expectedEntries.length) {
        throw new Error(`${label}.entries contain duplicate paths`);
    }
    const actualEntries = collectTreeEntries(record.root);
    const actualBytes = actualEntries.reduce((total, entry) => total + entry.bytes, 0);
    const actualSha256 = treeCompositeSha256(actualEntries);
    if (
        expectedCount !== actualEntries.length ||
        expectedBytes !== actualBytes ||
        expectedSha256 !== actualSha256 ||
        JSON.stringify(expectedEntries) !== JSON.stringify(actualEntries)
    ) {
        throw new Error(`Exact runtime tree mismatch for ${label} (${record.root})`);
    }
    return actualSha256;
};

export const verifyBundleDescriptor = (
    descriptor: BundleDescriptor,
    expectedMembers: Array<{ label: string; value: string }>,
    label: string,
): string => {
    const record = assertExactKeys(descriptor, ["hashAlgorithm", "members", "sha256"], label);
    if (record.hashAlgorithm !== BUNDLE_HASH_ALGORITHM) throw new Error(`${label}.hashAlgorithm is unsupported`);
    if (!Array.isArray(record.members)) throw new Error(`${label}.members must be an array`);
    const members = record.members.map((member, index) => {
        const row = assertExactKeys(member, ["label", "value"], `${label}.members[${index}]`);
        if (
            typeof row.label !== "string" ||
            row.label.length === 0 ||
            typeof row.value !== "string" ||
            row.value.length === 0
        ) {
            throw new Error(`${label}.members[${index}] requires nonempty label and value strings`);
        }
        return { label: row.label, value: row.value };
    });
    if (new Set(members.map((member) => member.label)).size !== members.length) {
        throw new Error(`${label}.members contain duplicate labels`);
    }
    if (JSON.stringify(members) !== JSON.stringify(expectedMembers)) {
        throw new Error(`${label}.members do not bind the required labels and descriptors in order`);
    }
    const digest = createHash("sha256");
    for (const member of members) {
        digest.update(member.label, "utf8");
        digest.update("\0");
        digest.update(member.value, "utf8");
        digest.update("\0");
    }
    const actualSha256 = digest.digest("hex");
    if (actualSha256 !== assertSha256(record.sha256, `${label}.sha256`)) {
        throw new Error(`${label}.sha256 does not match its ordered members`);
    }
    return actualSha256;
};

export const assertPinnedLoggingMode = (descriptor: LoggingDescriptor, environmentValue: string | undefined): void => {
    const record = assertExactKeys(descriptor, ["debugLogging", "source"], "inputs.logging");
    if (record.debugLogging !== PINNED_DEBUG_LOGGING || record.source !== "sbatch_pinned") {
        throw new Error("Manifest logging mode is not the fixed sbatch-pinned mode");
    }
    if (environmentValue !== PINNED_DEBUG_LOGGING) {
        throw new Error(`DEBUG_LOGGING must be exactly ${PINNED_DEBUG_LOGGING}, got ${String(environmentValue)}`);
    }
};

export const deriveProbeCoverage = (
    selection: ManifestSelection,
    requestedFamilyCount: number,
    observedRunCount: number,
): ProbeCoverage => {
    const record = assertExactKeys(
        selection,
        [
            "criterion",
            "forbiddenCriterion",
            "roleBlind",
            "scope",
            "populationFamilyCount",
            "familyCount",
            "representativeField",
            "preflightRule",
        ],
        "manifest.selection",
    );
    if (record.roleBlind !== true || (record.scope !== "full" && record.scope !== "preflight")) {
        throw new Error("Manifest selection must be role-blind and have full or preflight scope");
    }
    for (const key of ["criterion", "forbiddenCriterion", "representativeField"]) {
        if (typeof record[key] !== "string" || (record[key] as string).length === 0) {
            throw new Error(`manifest.selection.${key} must be a nonempty string`);
        }
    }
    const populationFamilyCount = assertNonnegativeInteger(
        record.populationFamilyCount,
        "selection.populationFamilyCount",
    );
    const selectedFamilyCount = assertNonnegativeInteger(record.familyCount, "selection.familyCount");
    const requested = assertNonnegativeInteger(requestedFamilyCount, "requestedFamilyCount");
    const runFamilyCount = assertNonnegativeInteger(observedRunCount, "observedRunCount");
    if (selectedFamilyCount !== requested || requested > populationFamilyCount || runFamilyCount > requested) {
        throw new Error("Selection, requested, run, and population family counts are inconsistent");
    }
    const scope = record.scope as FidelityScope;
    if (
        (scope === "full" && (requested !== populationFamilyCount || record.preflightRule !== null)) ||
        (scope === "preflight" &&
            (requested >= populationFamilyCount ||
                typeof record.preflightRule !== "string" ||
                record.preflightRule.length === 0))
    ) {
        throw new Error("Selection scope, population coverage, and preflight rule are inconsistent");
    }
    return {
        artifactKind:
            scope === "preflight"
                ? "infrastructure_fidelity_preflight_probe_not_clearance"
                : "infrastructure_fidelity_full_probe_not_policy_evaluation",
        scope,
        populationFamilyCount,
        runFamilyCount,
        fullCoverage:
            scope === "full" && requested === populationFamilyCount && runFamilyCount === populationFamilyCount,
        eligibleForFidelityClearance: false,
    };
};

const assertStringArray = (value: unknown, label: string): void => {
    if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string")) {
        throw new Error(`${label} must be an array of strings`);
    }
};

const assertPoint = (value: unknown, label: string, declared: boolean): void => {
    if (value === null && !declared) return;
    const keys = declared ? ["x", "y", "waypoint", "encoded"] : ["x", "y"];
    const point = assertExactKeys(value, keys, label);
    for (const key of keys) assertNonnegativeInteger(point[key], `${label}.${key}`);
};

const assertWarning = (value: unknown, label: string): void => {
    const warning = assertExactKeys(value, ["phase", "level", "category", "severity", "diagnosticSha256"], label);
    if (
        typeof warning.phase !== "string" ||
        !["debug", "info", "log", "warn", "error"].includes(String(warning.level)) ||
        !Object.prototype.hasOwnProperty.call(WARNING_CATEGORY_SEVERITY, String(warning.category)) ||
        (warning.severity !== "review" && warning.severity !== "fail") ||
        typeof warning.diagnosticSha256 !== "string" ||
        !HEX_SHA256.test(warning.diagnosticSha256)
    ) {
        throw new Error(`${label} is not a valid hashed warning record`);
    }
};

const assertErrorRecord = (value: unknown, label: string): void => {
    if (value === null) return;
    const error = assertExactKeys(value, ["category", "name", "messageSha256"], label);
    if (
        !Object.prototype.hasOwnProperty.call(WARNING_CATEGORY_SEVERITY, String(error.category)) ||
        error.name !== "captured_error" ||
        typeof error.messageSha256 !== "string" ||
        !HEX_SHA256.test(error.messageSha256)
    ) {
        throw new Error(`${label} is not a valid hashed error record`);
    }
};

const assertProbeRun = (value: unknown, label: string): void => {
    if (value === null) return;
    const run = assertExactKeys(
        value,
        [
            "order",
            "loaded",
            "initialTick",
            "finalTick",
            "updates",
            "progressedBeyondTickOne",
            "reachedTargetTick",
            "starts",
            "wallTimeMs",
            "warningCaptureTruncated",
            "error",
        ],
        label,
    );
    if (
        !Array.isArray(run.order) ||
        run.order.length !== 2 ||
        run.order.some((identity) => identity !== "alpha" && identity !== "beta") ||
        run.order[0] === run.order[1]
    ) {
        throw new Error(`${label}.order must contain alpha and beta exactly once`);
    }
    for (const key of ["loaded", "progressedBeyondTickOne", "reachedTargetTick", "warningCaptureTruncated"]) {
        if (typeof run[key] !== "boolean") throw new Error(`${label}.${key} must be boolean`);
    }
    for (const key of ["updates", "wallTimeMs"]) assertNonnegativeInteger(run[key], `${label}.${key}`);
    for (const key of ["initialTick", "finalTick"]) {
        if (run[key] !== null) assertNonnegativeInteger(run[key], `${label}.${key}`);
    }
    const starts = assertExactKeys(run.starts, ["alpha", "beta"], `${label}.starts`);
    assertPoint(starts.alpha, `${label}.starts.alpha`, false);
    assertPoint(starts.beta, `${label}.starts.beta`, false);
    assertErrorRecord(run.error, `${label}.error`);
};

const assertReciprocalCheck = (value: unknown, label: string): void => {
    if (value === null) return;
    const check = assertExactKeys(
        value,
        [
            "declaredStartCountValid",
            "forwardStartsDistinct",
            "reverseStartsDistinct",
            "allObservedStartsDeclared",
            "reciprocalPhysicalSlots",
            "failures",
        ],
        label,
    );
    for (const key of [
        "declaredStartCountValid",
        "forwardStartsDistinct",
        "reverseStartsDistinct",
        "allObservedStartsDeclared",
        "reciprocalPhysicalSlots",
    ]) {
        if (typeof check[key] !== "boolean") throw new Error(`${label}.${key} must be boolean`);
    }
    assertStringArray(check.failures, `${label}.failures`);
};

const assertFamilyResult = (value: unknown, label: string): void => {
    const family = assertExactKeys(
        value,
        [
            "familyIndex",
            "familyId",
            "representativeMapPath",
            "mapName",
            "mapBytes",
            "mapSha256",
            "slurmJobId",
            "requestedEngineSeed",
            "targetTick",
            "declaredStartLocations",
            "forward",
            "reverse",
            "reciprocalStartCheck",
            "warnings",
            "failureCategories",
            "reviewCategories",
            "fidelityStatus",
        ],
        label,
    );
    for (const key of ["familyIndex", "mapBytes", "requestedEngineSeed", "targetTick"]) {
        assertNonnegativeInteger(family[key], `${label}.${key}`);
    }
    for (const key of ["familyId", "representativeMapPath", "mapName", "slurmJobId"]) {
        const entry = family[key];
        if (typeof entry !== "string" || entry.length === 0) throw new Error(`${label}.${key} must be nonempty`);
    }
    if (family.mapSha256 !== null) assertSha256(family.mapSha256, `${label}.mapSha256`);
    if (!Array.isArray(family.declaredStartLocations))
        throw new Error(`${label}.declaredStartLocations must be an array`);
    family.declaredStartLocations.forEach((point, index) =>
        assertPoint(point, `${label}.declaredStartLocations[${index}]`, true),
    );
    assertProbeRun(family.forward, `${label}.forward`);
    assertProbeRun(family.reverse, `${label}.reverse`);
    assertReciprocalCheck(family.reciprocalStartCheck, `${label}.reciprocalStartCheck`);
    if (!Array.isArray(family.warnings)) throw new Error(`${label}.warnings must be an array`);
    family.warnings.forEach((warning, index) => assertWarning(warning, `${label}.warnings[${index}]`));
    assertStringArray(family.failureCategories, `${label}.failureCategories`);
    assertStringArray(family.reviewCategories, `${label}.reviewCategories`);
    if (!(["pass", "review", "fail"] as unknown[]).includes(family.fidelityStatus)) {
        throw new Error(`${label}.fidelityStatus is invalid`);
    }
};

/**
 * Runtime allowlist for the private probe artifact. Unknown fields are rejected
 * recursively, so an accidental policy/outcome statistic cannot silently enter
 * the fidelity evidence channel.
 */
export const assertStrictFidelityProbeResult = (value: unknown): void => {
    const result = assertExactKeys(
        value,
        [
            "schemaVersion",
            "gate",
            "outcomeFree",
            "artifactKind",
            "scheduler",
            "manifestPath",
            "manifestSha256",
            "logging",
            "runtimeHashes",
            "scope",
            "populationFamilyCount",
            "runFamilyCount",
            "fullCoverage",
            "eligibleForFidelityClearance",
            "initialization",
            "familyCountRequested",
            "familyCountRun",
            "families",
        ],
        "probe result",
    );
    if (result.schemaVersion !== 1 || result.gate !== MAP_FIDELITY_GATE || result.outcomeFree !== true) {
        throw new Error("Probe result identity markers are invalid");
    }
    const scheduler = assertExactKeys(
        result.scheduler,
        ["jobId", "account", "partition", "qos", "source"],
        "scheduler",
    );
    if (scheduler.account !== "pi_jss233" || scheduler.source !== "scontrol" || typeof scheduler.jobId !== "string") {
        throw new Error("Probe scheduler provenance is invalid");
    }
    const logging = assertExactKeys(result.logging, ["debugLogging", "source"], "logging");
    if (logging.debugLogging !== PINNED_DEBUG_LOGGING || logging.source !== "sbatch_pinned") {
        throw new Error("Probe logging provenance is invalid");
    }
    const runtimeHashes = assertExactKeys(
        result.runtimeHashes,
        [
            "packageLockSha256",
            "gameApiPackageSha256",
            "gameApiRuntimeSha256",
            "compiledProbeSha256",
            "gameApiRuntimeTreeSha256",
            "runtimeDependencyTreeSha256",
            "mixTreeSha256",
            "sourceBundleSha256",
            "runtimeBundleSha256",
        ],
        "runtimeHashes",
    );
    for (const [key, hash] of Object.entries(runtimeHashes)) assertSha256(hash, `runtimeHashes.${key}`);
    if (typeof result.manifestPath !== "string") throw new Error("manifestPath must be a string");
    assertSha256(result.manifestSha256, "manifestSha256");
    const scope = result.scope;
    if (scope !== "full" && scope !== "preflight") throw new Error("Probe scope is invalid");
    const population = assertNonnegativeInteger(result.populationFamilyCount, "populationFamilyCount");
    const run = assertNonnegativeInteger(result.runFamilyCount, "runFamilyCount");
    const requested = assertNonnegativeInteger(result.familyCountRequested, "familyCountRequested");
    const familyCountRun = assertNonnegativeInteger(result.familyCountRun, "familyCountRun");
    if (run !== familyCountRun || run > requested || requested > population)
        throw new Error("Probe family counts are inconsistent");
    const expectedFullCoverage = scope === "full" && requested === population && run === population;
    if (result.fullCoverage !== expectedFullCoverage || result.eligibleForFidelityClearance !== false) {
        throw new Error("Probe coverage/clearance markers are inconsistent");
    }
    const expectedArtifactKind =
        scope === "preflight"
            ? "infrastructure_fidelity_preflight_probe_not_clearance"
            : "infrastructure_fidelity_full_probe_not_policy_evaluation";
    if (result.artifactKind !== expectedArtifactKind) throw new Error("Probe artifact kind does not match its scope");
    const initialization = assertExactKeys(
        result.initialization,
        ["succeeded", "warnings", "warningCaptureTruncated", "error"],
        "initialization",
    );
    if (typeof initialization.succeeded !== "boolean" || typeof initialization.warningCaptureTruncated !== "boolean") {
        throw new Error("Initialization status markers must be boolean");
    }
    if (!Array.isArray(initialization.warnings)) throw new Error("initialization.warnings must be an array");
    initialization.warnings.forEach((warning, index) => assertWarning(warning, `initialization.warnings[${index}]`));
    assertErrorRecord(initialization.error, "initialization.error");
    if (!Array.isArray(result.families) || result.families.length !== run) {
        throw new Error("families length does not match runFamilyCount");
    }
    result.families.forEach((family, index) => assertFamilyResult(family, `families[${index}]`));
};

export type StartLocation = { x: number; y: number };
export type ParticipantStarts = {
    alpha: StartLocation | null;
    beta: StartLocation | null;
};

const startKey = (point: StartLocation): string => `${point.x},${point.y}`;

export type ReciprocalStartCheck = {
    declaredStartCountValid: boolean;
    forwardStartsDistinct: boolean;
    reverseStartsDistinct: boolean;
    allObservedStartsDeclared: boolean;
    reciprocalPhysicalSlots: boolean;
    failures: string[];
};

/**
 * Checks one deterministic physical-slot pair in both participant orders.
 *
 * Forward order is [alpha, beta] and reverse order is [beta, alpha]. A
 * reciprocal engine assignment therefore has forward.alpha == reverse.beta
 * and forward.beta == reverse.alpha. The full declared start list is parsed
 * statically; this check deliberately does not claim dynamic coverage of every
 * start on maps with more than two starting locations.
 */
export const validateReciprocalStarts = (
    forward: ParticipantStarts,
    reverse: ParticipantStarts,
    declaredStarts: StartLocation[],
): ReciprocalStartCheck => {
    const declared = new Set(declaredStarts.map(startKey));
    const allObserved = [forward.alpha, forward.beta, reverse.alpha, reverse.beta];
    const declaredStartCountValid = declared.size >= 2 && declared.size === declaredStarts.length;
    const forwardStartsDistinct =
        forward.alpha !== null && forward.beta !== null && startKey(forward.alpha) !== startKey(forward.beta);
    const reverseStartsDistinct =
        reverse.alpha !== null && reverse.beta !== null && startKey(reverse.alpha) !== startKey(reverse.beta);
    const allObservedStartsDeclared = allObserved.every((point) => point !== null && declared.has(startKey(point)));
    const reciprocalPhysicalSlots =
        forward.alpha !== null &&
        forward.beta !== null &&
        reverse.alpha !== null &&
        reverse.beta !== null &&
        startKey(forward.alpha) === startKey(reverse.beta) &&
        startKey(forward.beta) === startKey(reverse.alpha);

    const failures: string[] = [];
    if (!declaredStartCountValid) failures.push("declared_start_enumeration_invalid");
    if (!forwardStartsDistinct) failures.push("forward_duplicate_or_missing_start");
    if (!reverseStartsDistinct) failures.push("reverse_duplicate_or_missing_start");
    if (!allObservedStartsDeclared) failures.push("observed_start_not_declared");
    if (!reciprocalPhysicalSlots) failures.push("reciprocal_physical_slot_mismatch");

    return {
        declaredStartCountValid,
        forwardStartsDistinct,
        reverseStartsDistinct,
        allObservedStartsDeclared,
        reciprocalPhysicalSlots,
        failures,
    };
};
