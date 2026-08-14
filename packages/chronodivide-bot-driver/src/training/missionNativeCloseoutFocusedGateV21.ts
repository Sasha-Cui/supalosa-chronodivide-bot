import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { cdapi } from "@chronodivide/game-api";
import { Countries } from "@supalosa/chronodivide-bot/dist/bot/logic/common/utils.js";
import { BuildingEliminationTelemetryEvent } from
    "@supalosa/chronodivide-bot/dist/bot/logic/mission/missions/buildingEliminationMission.js";
import { loadBaselineFactory } from "../benchmark/baselineLoader.js";
import { createExperimentManifest } from "../benchmark/provenance.js";
import { derivePairedEngineSeed } from "../benchmark/seededOfflineGame.js";
import { METHOD_V5_EQUIVALENCE_MAP_SHA256 } from "./methodV5BaselineEquivalence.js";
import { sha256File } from "./methodV5PlanRunner.js";
import {
    MISSION_NATIVE_CLOSEOUT_COMPATIBILITY_MAX_TICKS,
    MissionNativeCloseoutRunTrace,
    runMissionNativeCloseoutTrace,
} from "./missionNativeCloseoutCompatibilityGate.js";
import {
    buildMissionNativeCloseoutPolicyV21,
    missionNativeCloseoutPolicyV21Sha256,
} from "./missionNativeCloseoutPolicyV21.js";

export const MISSION_NATIVE_CLOSEOUT_FOCUSED_GATE_V21_SCHEMA_VERSION = 1 as const;
export const MISSION_NATIVE_CLOSEOUT_FOCUSED_GATE_V21_ENGINE_SEED_BASE = 4_200_000_000 as const;
export const MISSION_NATIVE_CLOSEOUT_FOCUSED_GATE_V21_COUNTRIES = [Countries.USA, Countries.LIBYA] as const;

const requiredPath = (name: string): string => {
    const value = process.env[name];
    if (!value) throw new Error(`${name} is required`);
    return path.resolve(value);
};
const digest = (value: unknown): string => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const eventsOf = <T extends BuildingEliminationTelemetryEvent["event"]>(
    telemetry: readonly BuildingEliminationTelemetryEvent[],
    event: T,
): Array<Extract<BuildingEliminationTelemetryEvent, { event: T }>> => telemetry.filter(
    (value): value is Extract<BuildingEliminationTelemetryEvent, { event: T }> => value.event === event,
);
const expectedNames = (country: Countries): { tank: "MTNK" | "HTNK"; retained: string[] } =>
    country === Countries.USA
        ? { tank: "MTNK", retained: ["GAWEAP", "MTNK"] }
        : { tank: "HTNK", retained: ["HTNK", "NAWEAP"] };

export const validateMissionNativeCloseoutFocusedGateV21Telemetry = (
    telemetry: readonly BuildingEliminationTelemetryEvent[],
    country: Countries,
): void => {
    const expected = expectedNames(country);
    const reservation = eventsOf(telemetry, "assault_production_reservation");
    const production = eventsOf(telemetry, "assault_production");
    const progress = eventsOf(telemetry, "target_progress");
    const defense = eventsOf(telemetry, "readiness_defense");
    if (reservation.length === 0) throw new Error(`Missing schema-15 reservation for ${country}`);
    for (const event of reservation) {
        if (
            event.schemaVersion !== 15 || event.currentTankCount < 0 || event.targetTankCount !== 4 ||
            JSON.stringify(event.retainedNames) !== JSON.stringify(expected.retained) ||
            event.removedRequestNames.some((name) => expected.retained.includes(name)) ||
            event.canceledQueueItems.some(({ name, quantity }) =>
                expected.retained.includes(name) || !Number.isInteger(quantity) || quantity < 1,
            )
        ) throw new Error(`Invalid schema-15 reservation for ${country}`);
    }
    if (production.length === 0 ||
        production.some((event) => event.schemaVersion !== 14 || event.unitName !== expected.tank)) {
        throw new Error(`Invalid assault production for ${country}`);
    }
    const firstPhysical = production.find((event) => event.currentCount >= 1);
    if (!firstPhysical) throw new Error(`No physical ${expected.tank} acquisition for ${country}`);
    if (!production.some((event) => event.tick > firstPhysical.tick)) {
        throw new Error(`Production telemetry did not persist after ${expected.tank} acquisition for ${country}`);
    }
    if (progress.reduce((total, event) => total + event.damage, 0) <= 0) {
        throw new Error(`No physical enemy-building damage for ${country}`);
    }
    if (defense.some((event) =>
        event.schemaVersion !== 16 || event.stagedAttackerCount < 1 ||
        !Number.isFinite(event.distance) || event.distance < 0 || event.distance > 12,
    )) throw new Error(`Invalid schema-16 readiness defense for ${country}`);
};

const traceDigest = (trace: MissionNativeCloseoutRunTrace): string => digest({
    actions: trace.actions,
    snapshots: trace.snapshots,
    telemetry: trace.telemetry,
    quitAttempts: trace.quitAttempts,
});

const main = async (): Promise<void> => {
    const repoRoot = path.resolve(process.cwd(), "..", "..");
    const outFile = requiredPath("OUT_FILE");
    if (fs.existsSync(outFile)) throw new Error(`Refusing to overwrite ${outFile}`);
    if (!process.env.BASELINE_PACKAGE_ROOT || process.env.REQUIRE_EXTERNAL_BASELINE !== "true") {
        throw new Error("Focused V21 gate requires the pinned external baseline");
    }
    const mapName = "simple-1v1-no-preview.map";
    if (sha256File(path.join(process.cwd(), "data", mapName)) !== METHOD_V5_EQUIVALENCE_MAP_SHA256) {
        throw new Error("Focused V21 gate map bytes drifted");
    }
    const factory = await loadBaselineFactory(path.join(repoRoot, "packages", "chronodivide-bot"));
    const policy = buildMissionNativeCloseoutPolicyV21(true);
    await cdapi.init(path.join(process.cwd(), "data"));
    const rows: Array<Record<string, unknown>> = [];
    for (const [index, country] of MISSION_NATIVE_CLOSEOUT_FOCUSED_GATE_V21_COUNTRIES.entries()) {
        const requestedEngineSeed = derivePairedEngineSeed(
            MISSION_NATIVE_CLOSEOUT_FOCUSED_GATE_V21_ENGINE_SEED_BASE,
            index,
        );
        const first = await runMissionNativeCloseoutTrace({
            factory, mapName, country, candidateSlot: 0, requestedEngineSeed, policy,
        });
        const repeat = await runMissionNativeCloseoutTrace({
            factory, mapName, country, candidateSlot: 0, requestedEngineSeed, policy,
        });
        const validationErrors: string[] = [];
        for (const [label, trace] of [["first", first], ["repeat", repeat]] as const) {
            try {
                validateMissionNativeCloseoutFocusedGateV21Telemetry(trace.telemetry, country);
            } catch (error) {
                validationErrors.push(`${label}: ${error instanceof Error ? error.message : String(error)}`);
            }
        }
        const firstDigest = traceDigest(first);
        const repeatDigest = traceDigest(repeat);
        if (firstDigest !== repeatDigest) validationErrors.push("same-seed trace mismatch");
        if (first.quitAttempts.candidate !== 0 || first.quitAttempts.baseline !== 0 ||
            repeat.quitAttempts.candidate !== 0 || repeat.quitAttempts.baseline !== 0) {
            validationErrors.push("resignation attempt");
        }
        const productionTelemetry = eventsOf(first.telemetry, "assault_production");
        const reservationTelemetry = eventsOf(first.telemetry, "assault_production_reservation");
        const progressTelemetry = eventsOf(first.telemetry, "target_progress");
        const defenseTelemetry = eventsOf(first.telemetry, "readiness_defense");
        const activationTelemetry = eventsOf(first.telemetry, "activation_evaluation");
        const firstPhysicalTick = productionTelemetry.find(({ currentCount }) => currentCount >= 1)?.tick ?? null;
        rows.push({
            country,
            candidateSlot: 0,
            requestedEngineSeed,
            firstTraceSha256: firstDigest,
            repeatTraceSha256: repeatDigest,
            traceDeterministic: firstDigest === repeatDigest,
            quitAttempts: { first: first.quitAttempts, repeat: repeat.quitAttempts },
            observedMaximumPhysicalTankCount: productionTelemetry.reduce(
                (maximum, event) => Math.max(maximum, event.currentCount), 0,
            ),
            observedMaximumPrelaunchCertificateTankCount: activationTelemetry.reduce(
                (maximum, event) => Math.max(maximum, event.schemaVersion === 12 ? event.assaultTankCount : 0), 0,
            ),
            observedBuildingDamage: progressTelemetry.reduce((total, event) => total + event.damage, 0),
            firstPhysicalTankTelemetryTick: firstPhysicalTick,
            lastProductionTelemetryTick: productionTelemetry.length > 0
                ? productionTelemetry[productionTelemetry.length - 1].tick
                : null,
            reservationTelemetry,
            productionTelemetry,
            progressTelemetry,
            defenseTelemetry,
            candidateSelfSnapshots: first.snapshots,
            validationErrors,
            passed: validationErrors.length === 0,
            outcomeFree: true,
        });
    }
    const manifest = createExperimentManifest({
        runId: `mission-native-closeout-focused-gate-v21-${process.env.SLURM_JOB_ID ?? "local"}`,
        mixDir: path.join(process.cwd(), "data"),
        maps: [mapName],
        effectiveConfig: {
            purpose: "outcome-free-mission-native-closeout-focused-gate-v21",
            schemaVersion: MISSION_NATIVE_CLOSEOUT_FOCUSED_GATE_V21_SCHEMA_VERSION,
            policyId: missionNativeCloseoutPolicyV21Sha256(policy),
            countries: MISSION_NATIVE_CLOSEOUT_FOCUSED_GATE_V21_COUNTRIES,
            candidateSlot: 0,
            freshProcessRepeats: 2,
            maxTicks: MISSION_NATIVE_CLOSEOUT_COMPATIBILITY_MAX_TICKS,
            outcomeInspection: false,
        },
        baseline: factory.descriptor,
        gameSeedBase: MISSION_NATIVE_CLOSEOUT_FOCUSED_GATE_V21_ENGINE_SEED_BASE,
    });
    if (
        manifest.scheduler.account !== "pi_jss233" || manifest.source.gitBranch !== "main" ||
        manifest.source.trackedDirty !== false || manifest.software.baseline.kind !== "external-package" ||
        manifest.software.baseline.trackedDirty !== false || rows.length !== 2
    ) throw new Error("Focused V21 gate provenance or coverage failed");
    const passed = rows.every((row) => row.passed === true);
    const output = {
        schemaVersion: MISSION_NATIVE_CLOSEOUT_FOCUSED_GATE_V21_SCHEMA_VERSION,
        status: passed
            ? "PASS_OUTCOME_FREE_MISSION_NATIVE_CLOSEOUT_FOCUSED_GATE_V21"
            : "FAIL_OUTCOME_FREE_MISSION_NATIVE_CLOSEOUT_FOCUSED_GATE_V21",
        generatedAt: new Date().toISOString(),
        passed,
        outcomeFree: true,
        gameCount: 4,
        sourceGitCommit: manifest.source.gitCommit,
        scheduler: manifest.scheduler,
        externalBaseline: manifest.software.baseline,
        policyId: missionNativeCloseoutPolicyV21Sha256(policy),
        maxTicks: MISSION_NATIVE_CLOSEOUT_COMPATIBILITY_MAX_TICKS,
        rows,
    };
    fs.mkdirSync(path.dirname(outFile), { recursive: true, mode: 0o700 });
    fs.writeFileSync(outFile, JSON.stringify(output, null, 2) + "\n", { flag: "wx", mode: 0o600 });
    console.log(JSON.stringify({
        outFile,
        sha256: sha256File(outFile),
        status: output.status,
        observed: rows.map((row) => ({
            country: row.country,
            physicalTanks: row.observedMaximumPhysicalTankCount,
            buildingDamage: row.observedBuildingDamage,
            firstPhysicalTick: row.firstPhysicalTankTelemetryTick,
            lastProductionTick: row.lastProductionTelemetryTick,
            defenseEvents: Array.isArray(row.defenseTelemetry) ? row.defenseTelemetry.length : 0,
        })),
    }));
    if (!passed) throw new Error("Focused V21 gate failed its outcome-blind technical contract");
};

const invoked = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (import.meta.url === invoked) main().catch((error) => { console.error(error); process.exitCode = 1; });
