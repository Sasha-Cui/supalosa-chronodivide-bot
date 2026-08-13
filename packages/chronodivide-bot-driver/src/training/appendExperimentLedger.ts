import fs from "node:fs";
import path from "node:path";

type RecordValue = Record<string, unknown>;
const isRecord = (value: unknown): value is RecordValue =>
    typeof value === "object" && value !== null && !Array.isArray(value);

const exactKeys = (value: RecordValue, expected: readonly string[]): void => {
    const actual = Object.keys(value).sort();
    const wanted = [...expected].sort();
    if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
        throw new Error("Ledger row has an invalid exact schema");
    }
};

const keys = [
    "schemaVersion", "entryId", "recordedAt", "method", "purpose", "outcomeAccessClass",
    "claimEligible", "sourceGitCommit", "sourceRuntimeSha256", "baselineGitCommit",
    "baselineRuntimeSha256", "gameApiRuntimeSha256", "campaignSha256", "policyIdsSha256",
    "inputPopulationSha256", "expectedLaunches", "accountedLaunches", "slurmAccount",
    "arrayJobId", "controllerJobId", "jobIds", "schedulerStates", "technicalFailures",
    "artifactPaths", "artifactSha256", "status", "advancementDecision", "supersedesEntryId",
    "notes",
] as const;

const requirePatternOrNull = (value: unknown, pattern: RegExp, label: string): void => {
    if (value !== null && (typeof value !== "string" || !pattern.test(value))) {
        throw new Error(`${label} is invalid`);
    }
};

export const validateExperimentLedgerRow = (value: unknown): RecordValue => {
    if (!isRecord(value)) throw new Error("Ledger row must be an object");
    exactKeys(value, keys);
    if (value.schemaVersion !== 1 || typeof value.entryId !== "string" || !/^[A-Za-z0-9._-]+$/.test(value.entryId)) {
        throw new Error("Ledger identity is invalid");
    }
    if (typeof value.recordedAt !== "string" || Number.isNaN(Date.parse(value.recordedAt))) {
        throw new Error("Ledger timestamp is invalid");
    }
    if (!new Set([
        "outcome-blind", "permanently-open-technical", "open-training",
        "sealed-development", "sealed-confirmatory",
    ]).has(String(value.outcomeAccessClass))) throw new Error("Ledger outcome-access class is invalid");
    if (typeof value.claimEligible !== "boolean") throw new Error("Ledger claimEligible must be boolean");
    requirePatternOrNull(value.sourceGitCommit, /^[0-9a-f]{40}$/, "sourceGitCommit");
    requirePatternOrNull(value.baselineGitCommit, /^[0-9a-f]{40}$/, "baselineGitCommit");
    for (const field of [
        "sourceRuntimeSha256", "baselineRuntimeSha256", "gameApiRuntimeSha256", "campaignSha256",
        "policyIdsSha256", "inputPopulationSha256",
    ]) requirePatternOrNull(value[field], /^[0-9a-f]{64}$/, field);
    for (const field of ["expectedLaunches", "accountedLaunches", "technicalFailures"]) {
        if (value[field] !== null && (!Number.isSafeInteger(value[field]) || (value[field] as number) < 0)) {
            throw new Error(`${field} must be a nonnegative integer or null`);
        }
    }
    if (!Array.isArray(value.jobIds) || !value.jobIds.every((item) => typeof item === "string" && /^\d+$/.test(item))) {
        throw new Error("Ledger jobIds are invalid");
    }
    if (!isRecord(value.schedulerStates) || !Array.isArray(value.artifactPaths) || !isRecord(value.artifactSha256) ||
        !Array.isArray(value.notes)) throw new Error("Ledger collections are invalid");
    return value;
};

const main = (): void => {
    const ledgerPath = process.env.LEDGER_PATH ? path.resolve(process.env.LEDGER_PATH) : null;
    const rowPath = process.env.ROW_PATH ? path.resolve(process.env.ROW_PATH) : null;
    if (!ledgerPath || !rowPath) throw new Error("LEDGER_PATH and ROW_PATH are required");
    const row = validateExperimentLedgerRow(JSON.parse(fs.readFileSync(rowPath, "utf8")));
    if (fs.existsSync(ledgerPath)) {
        const entries = fs.readFileSync(ledgerPath, "utf8").split("\n").filter(Boolean).map((line) =>
            validateExperimentLedgerRow(JSON.parse(line)),
        );
        if (entries.some(({ entryId }) => entryId === row.entryId)) {
            throw new Error(`Ledger entry ${String(row.entryId)} already exists`);
        }
    }
    fs.mkdirSync(path.dirname(ledgerPath), { recursive: true, mode: 0o700 });
    fs.appendFileSync(ledgerPath, JSON.stringify(row) + "\n", { mode: 0o600 });
    console.log(JSON.stringify({ ledgerPath, entryId: row.entryId }));
};

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
    try { main(); } catch (error) { console.error(error); process.exitCode = 1; }
}
