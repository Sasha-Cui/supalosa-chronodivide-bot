import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { Countries } from "@supalosa/chronodivide-bot/dist/bot/logic/common/utils.js";
import { BuildingEliminationTelemetryEvent } from
    "@supalosa/chronodivide-bot/dist/bot/logic/mission/missions/buildingEliminationMission.js";
import { sha256File } from "./methodV5PlanRunner.js";
import { validateMissionNativeCloseoutFocusedGateV29Telemetry } from
    "./missionNativeCloseoutFocusedGateV29.js";
import {
    MISSION_NATIVE_CLOSEOUT_ALL_COUNTRY_GATE_V35_COUNTRIES,
    MissionNativeCloseoutAllCountryV35CoverageRow,
    validateMissionNativeCloseoutAllCountryV35Coverage,
    validateMissionNativeCloseoutV35ObjectiveRaceTelemetry,
    validateMissionNativeCloseoutV35ProgressTelemetry,
    validateMissionNativeCloseoutV35QuitAudits,
} from "./missionNativeCloseoutAllCountryGateV35.js";
import {
    buildMissionNativeCloseoutPolicyV35,
    missionNativeCloseoutPolicyV35Sha256,
} from "./missionNativeCloseoutPolicyV35.js";

export const MISSION_NATIVE_CLOSEOUT_V35_R2_INPUT_SHA256 =
    "dc120885b30cf4d82b90cfcbe58fff6ec42c2f247112e53eeaf3c9b7d5409f85" as const;
export const MISSION_NATIVE_CLOSEOUT_V35_R2_INPUT_SOURCE_COMMIT =
    "329bd68913c390cae342df4fe9beaae37f9d79c2" as const;

type StoredRow = MissionNativeCloseoutAllCountryV35CoverageRow & {
    telemetry: BuildingEliminationTelemetryEvent[];
    disabledAdapterEquivalent: boolean;
    enabledTraceDeterministic: boolean;
    enabledChangedCommands: boolean;
    directExternalTraceSha256: string;
    disabledAdapterTraceSha256: string;
    enabledTraceSha256: string;
    enabledRepeatTraceSha256: string;
    quitAttempts: {
        direct: { candidate: number; baseline: number };
        disabled: { candidate: number; baseline: number };
        first: { candidate: number; baseline: number };
        repeat: { candidate: number; baseline: number };
    };
};

type StoredArtifact = {
    gateRevision: string;
    passed: boolean;
    outcomeFree: boolean;
    sourceGitCommit: string;
    scheduler: { account: string; jobId: string };
    externalBaseline: { kind: string; trackedDirty: boolean };
    disabledPolicyId: string;
    enabledPolicyId: string;
    countryCount: number;
    reciprocalSlotCount: number;
    gameCount: number;
    rows: StoredRow[];
};

const requiredPath = (name: string): string => {
    const value = process.env[name];
    if (!value) throw new Error(`${name} is required`);
    return path.resolve(value);
};

export const findForbiddenOutcomeKeys = (value: unknown, prefix = "$", found: string[] = []): string[] => {
    if (Array.isArray(value)) {
        value.forEach((item, index) => findForbiddenOutcomeKeys(item, `${prefix}[${index}]`, found));
    } else if (value !== null && typeof value === "object") {
        for (const [key, item] of Object.entries(value)) {
            if (key.toLowerCase() === "winner" || key.toLowerCase() === "score") found.push(`${prefix}.${key}`);
            findForbiddenOutcomeKeys(item, `${prefix}.${key}`, found);
        }
    }
    return found;
};

const validateRow = (row: StoredRow): string[] => {
    const errors: string[] = [];
    if (
        !row.disabledAdapterEquivalent || row.directExternalTraceSha256 !== row.disabledAdapterTraceSha256 ||
        !row.enabledTraceDeterministic || row.enabledTraceSha256 !== row.enabledRepeatTraceSha256 ||
        !row.enabledChangedCommands
    ) errors.push("stored trace identity or intervention flag failed");
    errors.push(...validateMissionNativeCloseoutV35QuitAudits(
        row.quitAttempts.direct,
        row.quitAttempts.disabled,
        row.quitAttempts.first,
        row.quitAttempts.repeat,
    ));
    try {
        validateMissionNativeCloseoutFocusedGateV29Telemetry(row.telemetry, row.country, {
            productionReservation: "forbidden",
            screenInfrastructure: "required",
            screenProductionEvidence: "sufficient_before_tank",
            productionFocus: "required",
            productionFocusPriority: 10_000,
            exclusiveProductionFocusScheduler: "required",
            allowPredecessorExhaustionDuringRecovery: true,
            allowRepeatedLaunchAfterRecovery: true,
        });
    } catch (error) {
        errors.push(error instanceof Error ? error.message : String(error));
    }
    try {
        validateMissionNativeCloseoutV35ObjectiveRaceTelemetry(row.telemetry);
        validateMissionNativeCloseoutV35ProgressTelemetry(row.telemetry);
    } catch (error) {
        errors.push(error instanceof Error ? error.message : String(error));
    }
    return errors;
};

const main = (): void => {
    const inputFile = requiredPath("INPUT_FILE");
    const outFile = requiredPath("OUT_FILE");
    if (fs.existsSync(outFile)) throw new Error(`Refusing to overwrite ${outFile}`);
    const inputSha256 = sha256File(inputFile);
    if (inputSha256 !== MISSION_NATIVE_CLOSEOUT_V35_R2_INPUT_SHA256) {
        throw new Error(`V35-R2 input checksum drifted: ${inputSha256}`);
    }
    const artifact = JSON.parse(fs.readFileSync(inputFile, "utf8")) as StoredArtifact;
    const forbiddenOutcomeKeys = findForbiddenOutcomeKeys(artifact);
    const globalValidationErrors: string[] = [];
    if (forbiddenOutcomeKeys.length > 0) {
        globalValidationErrors.push(`forbidden outcome keys: ${forbiddenOutcomeKeys.join(", ")}`);
    }
    if (
        artifact.gateRevision !== "V35-R1" || artifact.outcomeFree !== true ||
        artifact.sourceGitCommit !== MISSION_NATIVE_CLOSEOUT_V35_R2_INPUT_SOURCE_COMMIT ||
        artifact.scheduler.account !== "pi_jss233" || artifact.gameCount !== 72 ||
        artifact.countryCount !== 9 || artifact.reciprocalSlotCount !== 2 || artifact.rows.length !== 18 ||
        artifact.externalBaseline.kind !== "external-package" || artifact.externalBaseline.trackedDirty !== false
    ) globalValidationErrors.push("immutable V35-R1 artifact provenance or population drifted");
    const disabledPolicyId = missionNativeCloseoutPolicyV35Sha256(buildMissionNativeCloseoutPolicyV35(false));
    const enabledPolicyId = missionNativeCloseoutPolicyV35Sha256(buildMissionNativeCloseoutPolicyV35(true));
    if (artifact.disabledPolicyId !== disabledPolicyId || artifact.enabledPolicyId !== enabledPolicyId) {
        globalValidationErrors.push("V35 policy identity drifted");
    }
    const expectedCells = MISSION_NATIVE_CLOSEOUT_ALL_COUNTRY_GATE_V35_COUNTRIES.flatMap((country) =>
        ([0, 1] as const).map((candidateSlot) => `${country}:${candidateSlot}`));
    const actualCells = artifact.rows.map(({ country, candidateSlot }) => `${country}:${candidateSlot}`).sort();
    if (JSON.stringify(actualCells) !== JSON.stringify(expectedCells.slice().sort())) {
        globalValidationErrors.push("country-slot population drifted");
    }
    const rows = artifact.rows.map((row) => ({
        country: row.country,
        candidateSlot: row.candidateSlot,
        validationErrors: validateRow(row),
    }));
    for (const row of rows) {
        if (row.validationErrors.length > 0) {
            globalValidationErrors.push(`${row.country} slot ${row.candidateSlot}: ${row.validationErrors.join("; ")}`);
        }
    }
    globalValidationErrors.push(...validateMissionNativeCloseoutAllCountryV35Coverage(
        artifact.rows.map((row) => ({ ...row, passed: true })),
    ));
    const sourceGitCommit = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
    const sourceBranch = execFileSync("git", ["branch", "--show-current"], { encoding: "utf8" }).trim();
    const trackedDirty = execFileSync("git", ["status", "--porcelain=v1", "--untracked-files=no"], {
        encoding: "utf8",
    }).trim() !== "";
    if (
        process.env.SLURM_JOB_ACCOUNT !== "pi_jss233" || sourceBranch !== "main" || trackedDirty
    ) globalValidationErrors.push("V35-R2 validator scheduler or source provenance failed");
    const passed = globalValidationErrors.length === 0;
    const output = {
        schemaVersion: 1,
        gateRevision: "V35-R2",
        status: passed
            ? "PASS_OUTCOME_FREE_MISSION_NATIVE_CLOSEOUT_ALL_COUNTRY_GATE_V35_R2"
            : "FAIL_OUTCOME_FREE_MISSION_NATIVE_CLOSEOUT_ALL_COUNTRY_GATE_V35_R2",
        passed,
        outcomeFree: true,
        sourceGitCommit,
        scheduler: { jobId: process.env.SLURM_JOB_ID ?? null, account: process.env.SLURM_JOB_ACCOUNT ?? null },
        input: {
            file: inputFile,
            sha256: inputSha256,
            sourceGitCommit: artifact.sourceGitCommit,
            originalSchedulerJobId: artifact.scheduler.jobId,
            gameCount: artifact.gameCount,
        },
        disabledPolicyId,
        enabledPolicyId,
        forbiddenOutcomeKeys,
        globalValidationErrors,
        rowValidation: rows,
    };
    fs.mkdirSync(path.dirname(outFile), { recursive: true, mode: 0o700 });
    fs.writeFileSync(outFile, JSON.stringify(output, null, 2) + "\n", { flag: "wx", mode: 0o600 });
    console.log(JSON.stringify({ ...output, sha256: sha256File(outFile) }));
    if (!passed) throw new Error("V35-R2 revalidation failed; preserved complete outcome-free result");
};

const invoked = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (import.meta.url === invoked) {
    try { main(); } catch (error) { console.error(error); process.exitCode = 1; }
}
