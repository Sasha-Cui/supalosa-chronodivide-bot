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
    buildMissionNativeCloseoutPolicyV29,
    missionNativeCloseoutPolicyV29Sha256,
} from "./missionNativeCloseoutPolicyV29.js";

export const MISSION_NATIVE_CLOSEOUT_FOCUSED_GATE_V29_SCHEMA_VERSION = 1 as const;
export const MISSION_NATIVE_CLOSEOUT_FOCUSED_GATE_V29_ENGINE_SEED_BASE = 4_288_000_000 as const;
export const MISSION_NATIVE_CLOSEOUT_FOCUSED_GATE_V29_COUNTRIES = [Countries.USA, Countries.LIBYA] as const;

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
const alliedCountries = new Set<Countries>([
    Countries.USA,
    Countries.KOREA,
    Countries.FRANCE,
    Countries.GERMANY,
    Countries.GREAT_BRITAIN,
]);
const expectedNames = (country: Countries): {
    tank: "MTNK" | "HTNK";
    screen: "E1" | "E2";
    factory: "GAWEAP" | "NAWEAP";
    screenInfrastructure: "GAPILE" | "NAHAND";
    retained: string[];
    retainedWithScreen: string[];
} =>
    alliedCountries.has(country)
        ? {
            tank: "MTNK", screen: "E1", factory: "GAWEAP", screenInfrastructure: "GAPILE",
            retained: ["GAWEAP", "MTNK"], retainedWithScreen: ["E1", "GAWEAP", "MTNK"],
        }
        : {
            tank: "HTNK", screen: "E2", factory: "NAWEAP", screenInfrastructure: "NAHAND",
            retained: ["HTNK", "NAWEAP"], retainedWithScreen: ["E2", "HTNK", "NAWEAP"],
        };

export const validateMissionNativeCloseoutFocusedGateV29Telemetry = (
    telemetry: readonly BuildingEliminationTelemetryEvent[],
    country: Countries,
    profile: {
        productionReservation: "required" | "forbidden";
        screenInfrastructure: "ignored" | "required";
    } = { productionReservation: "required", screenInfrastructure: "ignored" },
): void => {
    const expected = expectedNames(country);
    const reservation = eventsOf(telemetry, "assault_production_reservation");
    const production = eventsOf(telemetry, "assault_production");
    const progress = eventsOf(telemetry, "target_progress");
    const defense = eventsOf(telemetry, "readiness_defense");
    const screen = eventsOf(telemetry, "assault_screen_production");
    const infrastructure = eventsOf(telemetry, "assault_infrastructure");
    const screenInfrastructure = eventsOf(telemetry, "assault_screen_infrastructure");
    const progressive = eventsOf(telemetry, "progressive_blocker_launch");
    const capability = eventsOf(telemetry, "assault_capability_launch");
    const attritional = eventsOf(telemetry, "attritional_blocker_launch");
    const activation = eventsOf(telemetry, "activation_evaluation");
    const activated = eventsOf(telemetry, "activated");
    const handoff = eventsOf(telemetry, "launch_handoff");
    if (profile.productionReservation === "required" && reservation.length === 0) {
        throw new Error(`Missing schema-15 reservation for ${country}`);
    }
    if (profile.productionReservation === "forbidden" && reservation.length !== 0) {
        throw new Error(`Unexpected schema-15 reservation for ${country}`);
    }
    for (const event of profile.productionReservation === "required" ? reservation : []) {
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
    if (profile.screenInfrastructure === "required" && (
        screenInfrastructure.length === 0 || screenInfrastructure.some((event) =>
            event.schemaVersion !== 24 || event.structureName !== expected.screenInfrastructure ||
            event.currentCount < 0,
        ) || !screenInfrastructure.some((event) => event.currentCount >= 1 || event.requested)
    )) throw new Error(`Invalid assault screen infrastructure for ${country}`);
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
    if (progress.some((event) =>
        event.schemaVersion !== 2 || !Number.isFinite(event.hitPoints) || event.hitPoints < 0 ||
        !Number.isFinite(event.previousHitPoints) || event.previousHitPoints < 0 ||
        !Number.isFinite(event.damage) || event.damage < 0 ||
        event.damage !== Math.max(0, event.previousHitPoints - event.hitPoints),
    )) throw new Error(`Invalid physical enemy-building progress for ${country}`);
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
        (event.requested && event.factoryTriggerActive !== true) ||
        (event.requested && event.currentCount + (event.queuedCount ?? 0) >= event.targetCount),
    )) throw new Error(`Invalid schema-17 assault screen for ${country}`);
    const firstRequest = screen.find(({ requested }) => requested);
    if (!firstRequest) throw new Error(`No factory-triggered ${expected.screen} request for ${country}`);
    if (firstRequest.tick < firstPhysicalFactory.tick || firstRequest.mainTankPresent) {
        throw new Error(`Screen did not start from the physical factory before the first tank for ${country}`);
    }
    if (profile.productionReservation === "required" && !reservation.some((event) =>
        event.tick >= firstPhysicalFactory.tick &&
        JSON.stringify(event.retainedNames) === JSON.stringify(expected.retainedWithScreen),
    )) throw new Error(`Factory-triggered screen was not retained for ${country}`);
    if (progressive.some((event) =>
        event.schemaVersion !== 18 || event.targetId < 0 || event.blockerId < 0 ||
        event.compatibleAttackerCount < 2 || event.readinessTankCount < 0 ||
        event.readinessScreenCount < 0 || !Number.isFinite(event.estimatedBlockerRemovalTicks) ||
        !Number.isFinite(event.estimatedRouteClearanceTicks) ||
        !Number.isFinite(event.estimatedForceSurvivalTicks) || event.estimatedBlockerRemovalTicks < 0 ||
        event.estimatedBlockerRemovalTicks > event.estimatedForceSurvivalTicks,
    )) throw new Error(`Invalid schema-18 progressive blocker launch for ${country}`);
    if (capability.length > 1 || capability.some((event) => {
        const direct = event.launchMode === "direct_building";
        const safeBlocker = event.launchMode === "progressive_blocker" ||
            event.launchMode === "conventional_blocker";
        const attritionalBlocker = event.launchMode === "attritional_blocker";
        const blocker = safeBlocker || attritionalBlocker;
        const survival = event.estimatedForceSurvivalTicks;
        return event.schemaVersion !== 19 || event.targetId < 0 || event.compatibleAttackerCount < 1 ||
            event.readinessTankCount < 0 || event.readinessScreenCount < 0 ||
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
            (event.launchMode === "progressive_blocker" &&
                event.estimatedBlockerRemovalTicks !== null && survival !== null &&
                event.estimatedBlockerRemovalTicks > survival) ||
            (!direct && !blocker);
    })) throw new Error(`Invalid schema-19 assault capability launch for ${country}`);
    const attritionalCapability = capability[0]?.launchMode === "attritional_blocker";
    if ((attritionalCapability && attritional.length !== 1) || (!attritionalCapability && attritional.length !== 0) ||
        attritional.some((event) =>
            event.schemaVersion !== 20 || event.tick !== capability[0].tick ||
            event.targetId !== capability[0].targetId || event.blockerId !== capability[0].blockerId ||
            event.compatibleAttackerCount < 2 || event.readinessTankCount < 0 ||
            event.readinessScreenCount < 0 || !Number.isFinite(event.estimatedBlockerApproachTicks) ||
            !Number.isFinite(event.estimatedBlockerRemovalTicks) ||
            !Number.isFinite(event.estimatedForceSurvivalTicks) ||
            event.estimatedBlockerApproachTicks < 0 ||
            event.estimatedBlockerApproachTicks >= event.estimatedForceSurvivalTicks ||
            event.estimatedBlockerRemovalTicks <= event.estimatedForceSurvivalTicks,
        )) throw new Error(`Invalid schema-20 attritional blocker launch for ${country}`);
    if (activation.length === 0 || activation.some((event) => {
        if (event.schemaVersion !== 23) return true;
        const actualCompositionReady = event.assaultTankCount >= 1 && event.assaultScreenCount >= 1;
        const directFromCertificate = event.targetId !== null && event.blockerId === null &&
            event.estimatedBuildingCompletionTicks !== null;
        const routeFromCertificate = event.targetId !== null && event.blockerId !== null &&
            event.estimatedRouteClearanceTicks !== null && event.estimatedForceSurvivalTicks !== null &&
            event.estimatedRouteClearanceTicks <= event.estimatedForceSurvivalTicks;
        const objectiveCompositionReady = event.objectiveFeasibilityBypassesComposition || event.compositionReady;
        const directReady = event.directObjectiveFeasible && objectiveCompositionReady;
        const routeReady = event.completeRouteFeasible && objectiveCompositionReady;
        const preterminalCompositionBlock = event.enemyBuildingCount > 1 &&
            (event.directObjectiveFeasible || event.completeRouteFeasible) && !event.compositionReady;
        return event.compatibleAttackerCount < 0 ||
            event.totalCompatibleAttackerCount < event.compatibleAttackerCount ||
            event.transferCertifiedAttackerCount !== event.compatibleAttackerCount ||
            event.stagedCompatibleAttackerCount < 0 || event.vanguardCompatibleAttackerCount < 0 ||
            event.stagedCompatibleAttackerCount + event.vanguardCompatibleAttackerCount !==
                event.compatibleAttackerCount ||
            event.assaultTankCount < 0 || event.assaultScreenCount < 0 ||
            event.assaultTankCount + event.assaultScreenCount > event.compatibleAttackerCount ||
            !Number.isInteger(event.readinessTankCount) || event.readinessTankCount < 0 ||
            !Number.isInteger(event.readinessScreenCount) || event.readinessScreenCount < 0 ||
            event.transferredCapabilityReady !== actualCompositionReady ||
            event.compositionReady !== event.transferredCapabilityReady ||
            !Number.isInteger(event.enemyBuildingCount) || event.enemyBuildingCount < 1 ||
            event.activationScopeLatched !== true || event.routeThreatCount < 0 ||
            event.activePredecessorCompatibleAttackerCount < 0 ||
            event.activePredecessorCompatibleAttackerCount > event.compatibleAttackerCount ||
            event.partialBlockerLaunchPermitted !== (event.enemyBuildingCount === 1) ||
            event.objectiveFeasibilityBypassesComposition !== (event.enemyBuildingCount === 1) ||
            event.directObjectiveFeasible !== directFromCertificate ||
            event.completeRouteFeasible !== routeFromCertificate ||
            (directReady && event.phase !== "building_ready") ||
            (event.directObjectiveFeasible && !objectiveCompositionReady && event.phase !== "blocked") ||
            (routeReady && event.phase !== "blocker_ready") ||
            (event.completeRouteFeasible && !objectiveCompositionReady && event.phase !== "blocked") ||
            (event.phase === "building_ready" && !directReady) ||
            (event.phase === "blocker_ready" && event.blockerId === null) ||
            (preterminalCompositionBlock && event.activePredecessorCompatibleAttackerCount < 1);
    })) throw new Error(`Invalid schema-23 force-objective arbitration for ${country}`);

    const progressiveCapability = capability[0]?.launchMode === "progressive_blocker";
    if ((progressiveCapability && progressive.length !== 1) || (!progressiveCapability && progressive.length !== 0)) {
        throw new Error(`Progressive launch telemetry mismatch for ${country}`);
    }
    if (capability.length === 0) {
        if (activated.length !== 0 || handoff.length !== 0 || progressive.length !== 0 || attritional.length !== 0) {
            throw new Error(`Launch side effects without a capability launch for ${country}`);
        }
        const blockedDelegation = activation.some((event) => event.schemaVersion === 23 &&
            event.phase === "blocked" && event.enemyBuildingCount > 1 &&
            event.activePredecessorCompatibleAttackerCount > 0 && (
                (event.directObjectiveFeasible || event.completeRouteFeasible) && !event.compositionReady ||
                !event.directObjectiveFeasible && !event.completeRouteFeasible &&
                    !event.partialBlockerLaunchPermitted
            ));
        if (!blockedDelegation) {
            throw new Error(`No blocked preterminal predecessor delegation for ${country}`);
        }
        return;
    }

    if (activated.length !== 1) throw new Error(`Expected one closeout activation for ${country}`);
    const launch = capability[0];
    const launchEvaluation = activation.find((event) => event.tick === launch.tick);
    if (
        launch.tick !== activated[0].tick ||
        launchEvaluation?.schemaVersion !== 23 ||
        launchEvaluation.compatibleAttackerCount !== launch.compatibleAttackerCount ||
        launchEvaluation.targetId !== launch.targetId || launchEvaluation.blockerId !== launch.blockerId ||
        launchEvaluation.phase !== (launch.launchMode === "direct_building"
            ? "building_ready"
            : "blocker_ready") ||
        (launch.launchMode === "direct_building" && !launchEvaluation.directObjectiveFeasible) ||
        (launch.launchMode === "conventional_blocker" && !launchEvaluation.completeRouteFeasible) ||
        (launchEvaluation.enemyBuildingCount > 1 && !launchEvaluation.compositionReady) ||
        ((launch.launchMode === "progressive_blocker" || launch.launchMode === "attritional_blocker") &&
            (!launchEvaluation.partialBlockerLaunchPermitted || launchEvaluation.enemyBuildingCount !== 1 ||
                !launchEvaluation.compositionReady))
    ) {
        throw new Error(`Launch does not match schema-23 force-objective feasibility for ${country}`);
    }
    if (progress.reduce((total, event) => total + event.damage, 0) <= 0) {
        throw new Error(`No physical enemy-building damage after objective-feasible launch for ${country}`);
    }
    if (handoff.length === 0 || handoff.some((event) => {
        const expectedIds = [...event.expectedStagedUnitIds].sort((left, right) => left - right);
        const classified = [
            ...event.assignedExpectedUnitIds,
            ...event.destroyedExpectedUnitIds,
            ...event.aliveUnassignedExpectedUnitIds,
        ].sort((left, right) => left - right);
        return event.schemaVersion !== 10 ||
            event.expectedStagedUnitIds.length !== launchEvaluation.compatibleAttackerCount ||
            event.assignedExpectedUnitIds.length === 0 || event.aliveUnassignedExpectedUnitIds.length > 0 ||
            classified.length !== expectedIds.length ||
            classified.some((value, index) => value !== expectedIds[index]);
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
        throw new Error("Focused V29 gate requires the pinned external baseline");
    }
    const mapName = "simple-1v1-no-preview.map";
    if (sha256File(path.join(process.cwd(), "data", mapName)) !== METHOD_V5_EQUIVALENCE_MAP_SHA256) {
        throw new Error("Focused V29 gate map bytes drifted");
    }
    const factory = await loadBaselineFactory(path.join(repoRoot, "packages", "chronodivide-bot"));
    const policy = buildMissionNativeCloseoutPolicyV29(true);
    await cdapi.init(path.join(process.cwd(), "data"));
    const rows: Array<Record<string, unknown>> = [];
    for (const [index, country] of MISSION_NATIVE_CLOSEOUT_FOCUSED_GATE_V29_COUNTRIES.entries()) {
        const requestedEngineSeed = derivePairedEngineSeed(
            MISSION_NATIVE_CLOSEOUT_FOCUSED_GATE_V29_ENGINE_SEED_BASE,
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
                validateMissionNativeCloseoutFocusedGateV29Telemetry(trace.telemetry, country);
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
                (maximum, event) => Math.max(maximum, event.schemaVersion === 23 ? event.assaultTankCount : 0), 0,
            ),
            observedMaximumPrelaunchCertificateScreenCount: activationTelemetry.reduce(
                (maximum, event) => Math.max(maximum, event.schemaVersion === 23 ? event.assaultScreenCount : 0), 0,
            ),
            objectiveFeasibleEvaluationCount: activationTelemetry.filter((event) =>
                event.schemaVersion === 23 &&
                (event.directObjectiveFeasible || event.completeRouteFeasible),
            ).length,
            preterminalCompositionBlockedEvaluationCount: activationTelemetry.filter((event) =>
                event.schemaVersion === 23 && event.phase === "blocked" && event.enemyBuildingCount > 1 &&
                (event.directObjectiveFeasible || event.completeRouteFeasible) && !event.compositionReady &&
                !event.objectiveFeasibilityBypassesComposition &&
                event.activePredecessorCompatibleAttackerCount > 0,
            ).length,
            firstPreterminalCompositionBlockedTick: activationTelemetry.find((event) =>
                event.schemaVersion === 23 && event.phase === "blocked" && event.enemyBuildingCount > 1 &&
                (event.directObjectiveFeasible || event.completeRouteFeasible) && !event.compositionReady &&
                !event.objectiveFeasibilityBypassesComposition &&
                event.activePredecessorCompatibleAttackerCount > 0,
            )?.tick ?? null,
            blockedDelegatedEvaluationCount: activationTelemetry.filter((event) =>
                event.schemaVersion === 23 && event.phase === "blocked" && event.enemyBuildingCount > 1 &&
                event.activePredecessorCompatibleAttackerCount > 0 && (
                    (event.directObjectiveFeasible || event.completeRouteFeasible) && !event.compositionReady ||
                    !event.directObjectiveFeasible && !event.completeRouteFeasible &&
                        !event.partialBlockerLaunchPermitted
                ),
            ).length,
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
        runId: `mission-native-closeout-focused-gate-v29-${process.env.SLURM_JOB_ID ?? "local"}`,
        mixDir: path.join(process.cwd(), "data"),
        maps: [mapName],
        effectiveConfig: {
            purpose: "outcome-free-mission-native-closeout-focused-gate-v29",
            schemaVersion: MISSION_NATIVE_CLOSEOUT_FOCUSED_GATE_V29_SCHEMA_VERSION,
            policyId: missionNativeCloseoutPolicyV29Sha256(policy),
            countries: MISSION_NATIVE_CLOSEOUT_FOCUSED_GATE_V29_COUNTRIES,
            candidateSlot: 0,
            freshProcessRepeats: 2,
            maxTicks: MISSION_NATIVE_CLOSEOUT_COMPATIBILITY_MAX_TICKS,
            outcomeInspection: false,
        },
        baseline: factory.descriptor,
        gameSeedBase: MISSION_NATIVE_CLOSEOUT_FOCUSED_GATE_V29_ENGINE_SEED_BASE,
    });
    if (
        manifest.scheduler.account !== "pi_jss233" || manifest.source.gitBranch !== "main" ||
        manifest.source.trackedDirty !== false || manifest.software.baseline.kind !== "external-package" ||
        manifest.software.baseline.trackedDirty !== false || rows.length !== 2
    ) throw new Error("Focused V29 gate provenance or coverage failed");
    const coverageErrors: string[] = [];
    if (!rows.some((row) =>
        Array.isArray(row.capabilityTelemetry) && row.capabilityTelemetry.length === 1 &&
        typeof row.observedBuildingDamage === "number" && row.observedBuildingDamage > 0 &&
        typeof row.objectiveFeasibleEvaluationCount === "number" && row.objectiveFeasibleEvaluationCount > 0,
    )) {
        coverageErrors.push("no live objective-feasible launch produced physical building damage");
    }
    if (!rows.some((row) =>
        typeof row.preterminalCompositionBlockedEvaluationCount === "number" &&
        row.preterminalCompositionBlockedEvaluationCount > 0,
    )) {
        coverageErrors.push(
            "no preterminal objective-feasible composition-incomplete force retained active predecessor delegation",
        );
    }
    if (!rows.some((row) => {
        if (!Array.isArray(row.capabilityTelemetry) || row.capabilityTelemetry.length !== 1 ||
            !Array.isArray(row.launchHandoffTelemetry) || row.launchHandoffTelemetry.length === 0 ||
            typeof row.firstPreterminalCompositionBlockedTick !== "number" ||
            typeof row.observedBuildingDamage !== "number" || row.observedBuildingDamage <= 0) return false;
        const launch = row.capabilityTelemetry[0] as { tick?: unknown };
        return typeof launch.tick === "number" && launch.tick > row.firstPreterminalCompositionBlockedTick;
    })) {
        coverageErrors.push("no composition-blocked row subsequently launched, handed off, and damaged a building");
    }
    const passed = rows.every((row) => row.passed === true) && coverageErrors.length === 0;
    const output = {
        schemaVersion: MISSION_NATIVE_CLOSEOUT_FOCUSED_GATE_V29_SCHEMA_VERSION,
        status: passed
            ? "PASS_OUTCOME_FREE_MISSION_NATIVE_CLOSEOUT_FOCUSED_GATE_V29"
            : "FAIL_OUTCOME_FREE_MISSION_NATIVE_CLOSEOUT_FOCUSED_GATE_V29",
        generatedAt: new Date().toISOString(),
        passed,
        outcomeFree: true,
        gameCount: 4,
        sourceGitCommit: manifest.source.gitCommit,
        scheduler: manifest.scheduler,
        externalBaseline: manifest.software.baseline,
        policyId: missionNativeCloseoutPolicyV29Sha256(policy),
        maxTicks: MISSION_NATIVE_CLOSEOUT_COMPATIBILITY_MAX_TICKS,
        coverageErrors,
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
            objectiveFeasibleEvaluations: row.objectiveFeasibleEvaluationCount,
            preterminalCompositionBlockedEvaluations: row.preterminalCompositionBlockedEvaluationCount,
            blockedDelegatedEvaluations: row.blockedDelegatedEvaluationCount,
            firstFactoryTriggeredScreenRequestTick: row.firstFactoryTriggeredScreenRequestTick,
        })),
        coverageErrors,
    }));
    if (!passed) throw new Error("Focused V29 gate failed its outcome-blind technical contract");
};

const invoked = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (import.meta.url === invoked) main().catch((error) => { console.error(error); process.exitCode = 1; });
