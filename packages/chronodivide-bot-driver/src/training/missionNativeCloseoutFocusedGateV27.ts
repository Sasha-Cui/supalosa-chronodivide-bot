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
    buildMissionNativeCloseoutPolicyV27,
    missionNativeCloseoutPolicyV27Sha256,
} from "./missionNativeCloseoutPolicyV27.js";

export const MISSION_NATIVE_CLOSEOUT_FOCUSED_GATE_V27_SCHEMA_VERSION = 1 as const;
export const MISSION_NATIVE_CLOSEOUT_FOCUSED_GATE_V27_ENGINE_SEED_BASE = 4_285_000_000 as const;
export const MISSION_NATIVE_CLOSEOUT_FOCUSED_GATE_V27_COUNTRIES = [Countries.USA, Countries.LIBYA] as const;

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
const expectedNames = (country: Countries): {
    tank: "MTNK" | "HTNK";
    screen: "E1" | "E2";
    factory: "GAWEAP" | "NAWEAP";
    retained: string[];
    retainedWithScreen: string[];
} =>
    country === Countries.USA
        ? {
            tank: "MTNK", screen: "E1", factory: "GAWEAP",
            retained: ["GAWEAP", "MTNK"], retainedWithScreen: ["E1", "GAWEAP", "MTNK"],
        }
        : {
            tank: "HTNK", screen: "E2", factory: "NAWEAP",
            retained: ["HTNK", "NAWEAP"], retainedWithScreen: ["E2", "HTNK", "NAWEAP"],
        };

export const validateMissionNativeCloseoutFocusedGateV27Telemetry = (
    telemetry: readonly BuildingEliminationTelemetryEvent[],
    country: Countries,
): void => {
    const expected = expectedNames(country);
    const reservation = eventsOf(telemetry, "assault_production_reservation");
    const production = eventsOf(telemetry, "assault_production");
    const progress = eventsOf(telemetry, "target_progress");
    const defense = eventsOf(telemetry, "readiness_defense");
    const screen = eventsOf(telemetry, "assault_screen_production");
    const infrastructure = eventsOf(telemetry, "assault_infrastructure");
    const progressive = eventsOf(telemetry, "progressive_blocker_launch");
    const capability = eventsOf(telemetry, "assault_capability_launch");
    const attritional = eventsOf(telemetry, "attritional_blocker_launch");
    const activation = eventsOf(telemetry, "activation_evaluation");
    const activated = eventsOf(telemetry, "activated");
    const handoff = eventsOf(telemetry, "launch_handoff");
    if (reservation.length === 0) throw new Error(`Missing schema-15 reservation for ${country}`);
    for (const event of reservation) {
        const retained = JSON.stringify(event.retainedNames);
        if (
            event.schemaVersion !== 15 || event.currentTankCount < 0 || event.targetTankCount !== 4 ||
            (retained !== JSON.stringify(expected.retained) &&
                retained !== JSON.stringify(expected.retainedWithScreen)) ||
            event.removedRequestNames.some((name) => event.retainedNames.includes(name)) ||
            event.canceledQueueItems.some(({ name, quantity }) =>
                event.retainedNames.includes(name) || !Number.isInteger(quantity) || quantity < 1,
            )
        ) throw new Error(`Invalid schema-15 reservation for ${country}`);
    }
    if (infrastructure.length === 0 || infrastructure.some((event) =>
        event.schemaVersion !== 13 || event.structureName !== expected.factory || event.currentCount < 0,
    )) throw new Error(`Invalid assault infrastructure for ${country}`);
    const firstPhysicalFactory = infrastructure.find((event) => event.currentCount >= 1);
    if (!firstPhysicalFactory) throw new Error(`No physical ${expected.factory} acquisition for ${country}`);
    if (production.length === 0 || production.some((event) =>
        event.schemaVersion !== 14 || event.unitName !== expected.tank ||
        event.queueAwareTargeting !== true || !Number.isInteger(event.queuedCount) ||
        (event.queuedCount ?? -1) < 0,
    )) {
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
    if (screen.length === 0 || screen.some((event) =>
        event.schemaVersion !== 17 || event.unitName !== expected.screen || event.targetCount !== 4 ||
        event.currentCount < 0 || event.readinessOwned !== true ||
        typeof event.factoryCount !== "number" || !Number.isInteger(event.factoryCount) || event.factoryCount < 0 ||
        typeof event.readinessTankCount !== "number" || !Number.isInteger(event.readinessTankCount) ||
        event.readinessTankCount < 0 ||
        event.queueAwareTargeting !== true || !Number.isInteger(event.queuedCount) ||
        (event.queuedCount ?? -1) < 0 ||
        event.factoryTriggerActive !== ((event.factoryCount ?? 0) >= 1) ||
        (event.requested && event.factoryTriggerActive !== true),
    )) throw new Error(`Invalid schema-17 assault screen for ${country}`);
    const firstRequest = screen.find(({ requested }) => requested);
    if (!firstRequest) throw new Error(`No factory-triggered ${expected.screen} request for ${country}`);
    if (firstRequest.tick < firstPhysicalFactory.tick || firstRequest.mainTankPresent) {
        throw new Error(`Screen did not start from the physical factory before the first tank for ${country}`);
    }
    if (!reservation.some((event) =>
        event.tick >= firstPhysicalFactory.tick &&
        JSON.stringify(event.retainedNames) === JSON.stringify(expected.retainedWithScreen),
    )) throw new Error(`Factory-triggered screen was not retained for ${country}`);
    const maximumScreenCount = screen.reduce((maximum, event) => Math.max(maximum, event.currentCount), 0);
    if (maximumScreenCount > 5) throw new Error(`Unbounded ${expected.screen} production for ${country}`);
    if (progressive.some((event) =>
        event.schemaVersion !== 18 || event.targetId < 0 || event.blockerId < 0 ||
        event.compatibleAttackerCount < 2 || event.readinessTankCount < 1 ||
        event.readinessScreenCount < 1 || !Number.isFinite(event.estimatedBlockerRemovalTicks) ||
        !Number.isFinite(event.estimatedRouteClearanceTicks) ||
        !Number.isFinite(event.estimatedForceSurvivalTicks) || event.estimatedBlockerRemovalTicks < 0 ||
        event.estimatedBlockerRemovalTicks > event.estimatedForceSurvivalTicks,
    )) throw new Error(`Invalid schema-18 progressive blocker launch for ${country}`);
    if (capability.length !== 1 || capability.some((event) => {
        const direct = event.launchMode === "direct_building";
        const safeBlocker = event.launchMode === "progressive_blocker" ||
            event.launchMode === "conventional_blocker";
        const attritionalBlocker = event.launchMode === "attritional_blocker";
        const blocker = safeBlocker || attritionalBlocker;
        const survival = event.estimatedForceSurvivalTicks;
        return event.schemaVersion !== 19 || event.targetId < 0 || event.compatibleAttackerCount < 2 ||
            event.readinessTankCount < 1 || event.readinessScreenCount < 1 ||
            event.routeThreatCount < 0 || event.staticRouteThreatCount < 0 ||
            event.staticRouteThreatCount > event.routeThreatCount ||
            event.estimatedBuildingCompletionTicks === null ||
            !Number.isFinite(event.estimatedBuildingCompletionTicks) ||
            event.estimatedBuildingCompletionTicks < 0 ||
            (survival !== null && (!Number.isFinite(survival) || survival < 0)) ||
            (direct && (event.blockerId !== null || event.blockerName !== null ||
                (survival !== null && event.estimatedBuildingCompletionTicks > survival))) ||
            (blocker && (event.blockerId === null || event.blockerName === null ||
                event.estimatedBlockerRemovalTicks === null || survival === null ||
                !Number.isFinite(event.estimatedBlockerRemovalTicks) ||
                event.estimatedBlockerRemovalTicks < 0)) ||
            (safeBlocker && event.estimatedBlockerRemovalTicks !== null && survival !== null &&
                event.estimatedBlockerRemovalTicks > survival) ||
            (!direct && !blocker);
    })) throw new Error(`Invalid schema-19 assault capability launch for ${country}`);
    const attritionalCapability = capability[0].launchMode === "attritional_blocker";
    if ((attritionalCapability && attritional.length !== 1) || (!attritionalCapability && attritional.length !== 0) ||
        attritional.some((event) =>
            event.schemaVersion !== 20 || event.tick !== capability[0].tick ||
            event.targetId !== capability[0].targetId || event.blockerId !== capability[0].blockerId ||
            event.compatibleAttackerCount < 2 || event.readinessTankCount < 1 ||
            event.readinessScreenCount < 1 || !Number.isFinite(event.estimatedBlockerApproachTicks) ||
            !Number.isFinite(event.estimatedBlockerRemovalTicks) ||
            !Number.isFinite(event.estimatedForceSurvivalTicks) ||
            event.estimatedBlockerApproachTicks < 0 ||
            event.estimatedBlockerApproachTicks >= event.estimatedForceSurvivalTicks ||
            event.estimatedBlockerRemovalTicks <= event.estimatedForceSurvivalTicks,
        )) throw new Error(`Invalid schema-20 attritional blocker launch for ${country}`);
    if (activation.length === 0 || activation.some((event) =>
        event.schemaVersion !== 21 || event.compatibleAttackerCount < 0 ||
        event.totalCompatibleAttackerCount < event.compatibleAttackerCount ||
        event.transferCertifiedAttackerCount !== event.compatibleAttackerCount ||
        event.stagedCompatibleAttackerCount < 0 ||
        event.vanguardCompatibleAttackerCount < 0 ||
        event.stagedCompatibleAttackerCount + event.vanguardCompatibleAttackerCount !==
            event.compatibleAttackerCount ||
        event.assaultTankCount < 0 || event.assaultScreenCount < 0 ||
        event.assaultTankCount + event.assaultScreenCount > event.compatibleAttackerCount ||
        event.transferredCapabilityReady !==
            (event.assaultTankCount >= 1 && event.assaultScreenCount >= 1) ||
        !Number.isInteger(event.enemyBuildingCount) || event.enemyBuildingCount < 1 ||
        event.activationScopeLatched !== true
    )) throw new Error(`Invalid schema-21 activation continuity for ${country}`);
    if (activated.length !== 1) throw new Error(`Expected one closeout activation for ${country}`);
    const launchEvaluation = activation.find((event) => event.tick === capability[0].tick);
    if (
        capability[0].tick !== activated[0].tick || capability[0].tick < firstPhysical.tick ||
        launchEvaluation?.schemaVersion !== 21 || launchEvaluation.transferredCapabilityReady !== true ||
        launchEvaluation.assaultTankCount < 1 || launchEvaluation.assaultScreenCount < 1 ||
        launchEvaluation.compatibleAttackerCount !== capability[0].compatibleAttackerCount ||
        launchEvaluation.targetId !== capability[0].targetId ||
        launchEvaluation.blockerId !== capability[0].blockerId ||
        launchEvaluation.phase !== (capability[0].launchMode === "direct_building"
            ? "building_ready"
            : "blocker_ready")
    ) {
        throw new Error(`Activation preceded the combined-arms certificate for ${country}`);
    }
    if (handoff.length === 0 || handoff.some((event) => {
        const classified = [
            ...event.assignedExpectedUnitIds,
            ...event.destroyedExpectedUnitIds,
            ...event.aliveUnassignedExpectedUnitIds,
        ].sort((left, right) => left - right);
        return event.schemaVersion !== 10 ||
            event.expectedStagedUnitIds.length <
                launchEvaluation.assaultTankCount + launchEvaluation.assaultScreenCount ||
            event.assignedExpectedUnitIds.length === 0 || event.aliveUnassignedExpectedUnitIds.length > 0 ||
            classified.length !== event.expectedStagedUnitIds.length ||
            classified.some((value, index) => value !== event.expectedStagedUnitIds[index]);
    })) throw new Error(`Invalid schema-10 launch handoff for ${country}`);
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
        throw new Error("Focused V27 gate requires the pinned external baseline");
    }
    const mapName = "simple-1v1-no-preview.map";
    if (sha256File(path.join(process.cwd(), "data", mapName)) !== METHOD_V5_EQUIVALENCE_MAP_SHA256) {
        throw new Error("Focused V27 gate map bytes drifted");
    }
    const factory = await loadBaselineFactory(path.join(repoRoot, "packages", "chronodivide-bot"));
    const policy = buildMissionNativeCloseoutPolicyV27(true);
    await cdapi.init(path.join(process.cwd(), "data"));
    const rows: Array<Record<string, unknown>> = [];
    for (const [index, country] of MISSION_NATIVE_CLOSEOUT_FOCUSED_GATE_V27_COUNTRIES.entries()) {
        const requestedEngineSeed = derivePairedEngineSeed(
            MISSION_NATIVE_CLOSEOUT_FOCUSED_GATE_V27_ENGINE_SEED_BASE,
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
                validateMissionNativeCloseoutFocusedGateV27Telemetry(trace.telemetry, country);
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
        const screenTelemetry = eventsOf(first.telemetry, "assault_screen_production");
        const infrastructureTelemetry = eventsOf(first.telemetry, "assault_infrastructure");
        const activationTelemetry = eventsOf(first.telemetry, "activation_evaluation");
        const progressiveTelemetry = eventsOf(first.telemetry, "progressive_blocker_launch");
        const capabilityTelemetry = eventsOf(first.telemetry, "assault_capability_launch");
        const attritionalTelemetry = eventsOf(first.telemetry, "attritional_blocker_launch");
        const activatedTelemetry = eventsOf(first.telemetry, "activated");
        const launchHandoffTelemetry = eventsOf(first.telemetry, "launch_handoff");
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
                (maximum, event) => Math.max(maximum, event.schemaVersion === 21 ? event.assaultTankCount : 0), 0,
            ),
            observedMaximumPrelaunchCertificateScreenCount: activationTelemetry.reduce(
                (maximum, event) => Math.max(maximum, event.schemaVersion === 21 ? event.assaultScreenCount : 0), 0,
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
            screenTelemetry,
            infrastructureTelemetry,
            progressiveTelemetry,
            capabilityTelemetry,
            attritionalTelemetry,
            activationTelemetry,
            activatedTelemetry,
            launchHandoffTelemetry,
            observedMaximumScreenCount: screenTelemetry.reduce(
                (maximum, event) => Math.max(maximum, event.currentCount), 0,
            ),
            observedMaximumFactoryCount: infrastructureTelemetry.reduce(
                (maximum, event) => Math.max(maximum, event.currentCount), 0,
            ),
            observedMaximumReadinessTankCount: screenTelemetry.reduce(
                (maximum, event) => Math.max(maximum, event.readinessTankCount ?? 0), 0,
            ),
            firstFactoryTriggeredScreenRequestTick: screenTelemetry.find(({ requested }) => requested)?.tick ?? null,
            candidateSelfSnapshots: first.snapshots,
            validationErrors,
            passed: validationErrors.length === 0,
            outcomeFree: true,
        });
    }
    const manifest = createExperimentManifest({
        runId: `mission-native-closeout-focused-gate-v27-${process.env.SLURM_JOB_ID ?? "local"}`,
        mixDir: path.join(process.cwd(), "data"),
        maps: [mapName],
        effectiveConfig: {
            purpose: "outcome-free-mission-native-closeout-focused-gate-v27",
            schemaVersion: MISSION_NATIVE_CLOSEOUT_FOCUSED_GATE_V27_SCHEMA_VERSION,
            policyId: missionNativeCloseoutPolicyV27Sha256(policy),
            countries: MISSION_NATIVE_CLOSEOUT_FOCUSED_GATE_V27_COUNTRIES,
            candidateSlot: 0,
            freshProcessRepeats: 2,
            maxTicks: MISSION_NATIVE_CLOSEOUT_COMPATIBILITY_MAX_TICKS,
            outcomeInspection: false,
        },
        baseline: factory.descriptor,
        gameSeedBase: MISSION_NATIVE_CLOSEOUT_FOCUSED_GATE_V27_ENGINE_SEED_BASE,
    });
    if (
        manifest.scheduler.account !== "pi_jss233" || manifest.source.gitBranch !== "main" ||
        manifest.source.trackedDirty !== false || manifest.software.baseline.kind !== "external-package" ||
        manifest.software.baseline.trackedDirty !== false || rows.length !== 2
    ) throw new Error("Focused V27 gate provenance or coverage failed");
    const passed = rows.every((row) => row.passed === true);
    const output = {
        schemaVersion: MISSION_NATIVE_CLOSEOUT_FOCUSED_GATE_V27_SCHEMA_VERSION,
        status: passed
            ? "PASS_OUTCOME_FREE_MISSION_NATIVE_CLOSEOUT_FOCUSED_GATE_V27"
            : "FAIL_OUTCOME_FREE_MISSION_NATIVE_CLOSEOUT_FOCUSED_GATE_V27",
        generatedAt: new Date().toISOString(),
        passed,
        outcomeFree: true,
        gameCount: 4,
        sourceGitCommit: manifest.source.gitCommit,
        scheduler: manifest.scheduler,
        externalBaseline: manifest.software.baseline,
        policyId: missionNativeCloseoutPolicyV27Sha256(policy),
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
            physicalScreen: row.observedMaximumScreenCount,
            physicalFactories: row.observedMaximumFactoryCount,
            readinessTanks: row.observedMaximumReadinessTankCount,
            progressiveLaunches: Array.isArray(row.progressiveTelemetry) ? row.progressiveTelemetry.length : 0,
            capabilityLaunches: Array.isArray(row.capabilityTelemetry) ? row.capabilityTelemetry.length : 0,
            attritionalLaunches: Array.isArray(row.attritionalTelemetry) ? row.attritionalTelemetry.length : 0,
            handoffs: Array.isArray(row.launchHandoffTelemetry) ? row.launchHandoffTelemetry.length : 0,
            firstFactoryTriggeredScreenRequestTick: row.firstFactoryTriggeredScreenRequestTick,
        })),
    }));
    if (!passed) throw new Error("Focused V27 gate failed its outcome-blind technical contract");
};

const invoked = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (import.meta.url === invoked) main().catch((error) => { console.error(error); process.exitCode = 1; });
