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
    buildMissionNativeCloseoutPolicyV18,
    missionNativeCloseoutPolicyV18Sha256,
} from "./missionNativeCloseoutPolicyV18.js";

export const MISSION_NATIVE_CLOSEOUT_PRODUCTION_PROBE_V1_SCHEMA_VERSION = 1 as const;
export const MISSION_NATIVE_CLOSEOUT_PRODUCTION_PROBE_V1_ENGINE_SEED_BASE = 4_150_000_000 as const;
export const MISSION_NATIVE_CLOSEOUT_PRODUCTION_PROBE_V1_COUNTRIES = [
    Countries.USA,
    Countries.LIBYA,
] as const;

type AssaultProduction = Extract<BuildingEliminationTelemetryEvent, { event: "assault_production" }>;

const requiredPath = (name: string): string => {
    const value = process.env[name];
    if (!value) throw new Error(`${name} is required`);
    return path.resolve(value);
};

const digest = (value: unknown): string => createHash("sha256")
    .update(JSON.stringify(value))
    .digest("hex");

const eventsOf = <T extends BuildingEliminationTelemetryEvent["event"]>(
    telemetry: readonly BuildingEliminationTelemetryEvent[],
    event: T,
): Array<Extract<BuildingEliminationTelemetryEvent, { event: T }>> => telemetry.filter(
    (value): value is Extract<BuildingEliminationTelemetryEvent, { event: T }> => value.event === event,
);

export const validateMissionNativeCloseoutProductionProbeV1Telemetry = (
    telemetry: readonly BuildingEliminationTelemetryEvent[],
    country: Countries,
): void => {
    const production = eventsOf(telemetry, "assault_production") as AssaultProduction[];
    if (production.length === 0) throw new Error(`Missing production state for ${country}`);
    for (const event of production) {
        if (
            event.schemaVersion !== 14 || typeof event.available !== "boolean" ||
            typeof event.credits !== "number" || !Number.isFinite(event.credits) ||
            typeof event.vehicleQueueStatus !== "number" || !Number.isInteger(event.vehicleQueueStatus) ||
            !Array.isArray(event.vehicleQueueItems) || event.currentCount < 0 ||
            event.vehicleQueueItems.some((item) =>
                typeof item.name !== "string" || !Number.isInteger(item.quantity) || item.quantity < 0,
            ) ||
            (country === Countries.USA && event.unitName !== "MTNK") ||
            (country === Countries.LIBYA && event.unitName !== "HTNK")
        ) throw new Error(`Invalid schema-14 production state for ${country}`);
    }
    if (eventsOf(telemetry, "assault_infrastructure").length === 0) {
        throw new Error(`Missing infrastructure state for ${country}`);
    }
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
        throw new Error("Production probe requires the pinned external baseline");
    }
    const mapName = "simple-1v1-no-preview.map";
    if (sha256File(path.join(process.cwd(), "data", mapName)) !== METHOD_V5_EQUIVALENCE_MAP_SHA256) {
        throw new Error("Production probe map bytes drifted");
    }
    const factory = await loadBaselineFactory(path.join(repoRoot, "packages", "chronodivide-bot"));
    const policy = buildMissionNativeCloseoutPolicyV18(true);
    await cdapi.init(path.join(process.cwd(), "data"));
    const rows: Array<Record<string, unknown>> = [];
    for (const [index, country] of MISSION_NATIVE_CLOSEOUT_PRODUCTION_PROBE_V1_COUNTRIES.entries()) {
        const requestedEngineSeed = derivePairedEngineSeed(
            MISSION_NATIVE_CLOSEOUT_PRODUCTION_PROBE_V1_ENGINE_SEED_BASE,
            index,
        );
        const first = await runMissionNativeCloseoutTrace({
            factory,
            mapName,
            country,
            candidateSlot: 0,
            requestedEngineSeed,
            policy,
        });
        const repeat = await runMissionNativeCloseoutTrace({
            factory,
            mapName,
            country,
            candidateSlot: 0,
            requestedEngineSeed,
            policy,
        });
        validateMissionNativeCloseoutProductionProbeV1Telemetry(first.telemetry, country);
        validateMissionNativeCloseoutProductionProbeV1Telemetry(repeat.telemetry, country);
        const firstDigest = traceDigest(first);
        const repeatDigest = traceDigest(repeat);
        const productionTelemetry = eventsOf(first.telemetry, "assault_production");
        const infrastructureTelemetry = eventsOf(first.telemetry, "assault_infrastructure");
        const validationErrors: string[] = [];
        if (firstDigest !== repeatDigest) validationErrors.push("same-seed trace mismatch");
        if (first.quitAttempts.candidate !== 0 || first.quitAttempts.baseline !== 0 ||
            repeat.quitAttempts.candidate !== 0 || repeat.quitAttempts.baseline !== 0) {
            validationErrors.push("resignation attempt");
        }
        rows.push({
            country,
            candidateSlot: 0,
            requestedEngineSeed,
            firstTraceSha256: firstDigest,
            repeatTraceSha256: repeatDigest,
            traceDeterministic: firstDigest === repeatDigest,
            quitAttempts: { first: first.quitAttempts, repeat: repeat.quitAttempts },
            candidateSelfSnapshots: first.snapshots,
            productionTelemetry,
            infrastructureTelemetry,
            observedMaximumTankCount: productionTelemetry.reduce(
                (maximum, event) => Math.max(maximum, event.currentCount),
                0,
            ),
            observedUnitAvailable: productionTelemetry.some(({ available }) => available === true),
            validationErrors,
            passed: validationErrors.length === 0,
            outcomeFree: true,
        });
    }
    const manifest = createExperimentManifest({
        runId: `mission-native-closeout-production-probe-v1-${process.env.SLURM_JOB_ID ?? "local"}`,
        mixDir: path.join(process.cwd(), "data"),
        maps: [mapName],
        effectiveConfig: {
            purpose: "outcome-free-mission-native-closeout-production-probe-v1",
            schemaVersion: MISSION_NATIVE_CLOSEOUT_PRODUCTION_PROBE_V1_SCHEMA_VERSION,
            policyId: missionNativeCloseoutPolicyV18Sha256(policy),
            countries: MISSION_NATIVE_CLOSEOUT_PRODUCTION_PROBE_V1_COUNTRIES,
            candidateSlot: 0,
            freshProcessRepeats: 2,
            maxTicks: MISSION_NATIVE_CLOSEOUT_COMPATIBILITY_MAX_TICKS,
            outcomeInspection: false,
        },
        baseline: factory.descriptor,
        gameSeedBase: MISSION_NATIVE_CLOSEOUT_PRODUCTION_PROBE_V1_ENGINE_SEED_BASE,
    });
    if (
        manifest.scheduler.account !== "pi_jss233" || manifest.source.gitBranch !== "main" ||
        manifest.source.trackedDirty !== false || manifest.software.baseline.kind !== "external-package" ||
        manifest.software.baseline.trackedDirty !== false || rows.length !== 2
    ) throw new Error("Production probe provenance or coverage failed");
    const passed = rows.every((row) => row.passed === true);
    const output = {
        schemaVersion: MISSION_NATIVE_CLOSEOUT_PRODUCTION_PROBE_V1_SCHEMA_VERSION,
        status: passed
            ? "PASS_OUTCOME_FREE_MISSION_NATIVE_CLOSEOUT_PRODUCTION_PROBE_V1"
            : "FAIL_OUTCOME_FREE_MISSION_NATIVE_CLOSEOUT_PRODUCTION_PROBE_V1",
        generatedAt: new Date().toISOString(),
        passed,
        outcomeFree: true,
        gameCount: 4,
        sourceGitCommit: manifest.source.gitCommit,
        scheduler: manifest.scheduler,
        externalBaseline: manifest.software.baseline,
        policyId: missionNativeCloseoutPolicyV18Sha256(policy),
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
            observedMaximumTankCount: row.observedMaximumTankCount,
            observedUnitAvailable: row.observedUnitAvailable,
        })),
    }));
    if (!passed) throw new Error("Production probe failed its deterministic technical contract");
};

const invoked = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (import.meta.url === invoked) main().catch((error) => { console.error(error); process.exitCode = 1; });
