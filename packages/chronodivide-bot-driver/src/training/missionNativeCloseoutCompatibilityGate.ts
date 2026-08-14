import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
    ActionsApi,
    CreateOfflineOpts,
    GameApi,
    QueueType,
    UnitData,
    cdapi,
} from "@chronodivide/game-api";
import { Countries } from "@supalosa/chronodivide-bot/dist/bot/logic/common/utils.js";
import { BuildingEliminationTelemetryEvent } from
    "@supalosa/chronodivide-bot/dist/bot/logic/mission/missions/buildingEliminationMission.js";
import { InspectableBaselineBot, loadBaselineFactory } from "../benchmark/baselineLoader.js";
import { createExperimentManifest } from "../benchmark/provenance.js";
import { derivePairedEngineSeed, withSeededOfflineGame } from "../benchmark/seededOfflineGame.js";
import { METHOD_V5_EQUIVALENCE_MAP_SHA256 } from "./methodV5BaselineEquivalence.js";
import { sha256File } from "./methodV5PlanRunner.js";
import { createMissionNativeCloseoutCandidate } from "./missionNativeCloseoutCandidate.js";
import {
    MissionNativeCloseoutPolicyV5,
    buildMissionNativeCloseoutPolicyV5,
    missionNativeCloseoutPolicyV5Sha256,
} from "./missionNativeCloseoutPolicyV5.js";
import { MissionNativeCloseoutPolicyV6 } from "./missionNativeCloseoutPolicyV6.js";
import { MissionNativeCloseoutPolicyV7 } from "./missionNativeCloseoutPolicyV7.js";
import { MissionNativeCloseoutPolicyV8 } from "./missionNativeCloseoutPolicyV8.js";
import { MissionNativeCloseoutPolicyV9 } from "./missionNativeCloseoutPolicyV9.js";
import { MissionNativeCloseoutPolicyV10 } from "./missionNativeCloseoutPolicyV10.js";
import { MissionNativeCloseoutPolicyV11 } from "./missionNativeCloseoutPolicyV11.js";
import { MissionNativeCloseoutPolicyV12 } from "./missionNativeCloseoutPolicyV12.js";
import { MissionNativeCloseoutPolicyV13 } from "./missionNativeCloseoutPolicyV13.js";
import { MissionNativeCloseoutPolicyV14 } from "./missionNativeCloseoutPolicyV14.js";
import { MissionNativeCloseoutPolicyV15 } from "./missionNativeCloseoutPolicyV15.js";

export const MISSION_NATIVE_CLOSEOUT_COMPATIBILITY_MAX_TICKS = 5_400 as const;
export const MISSION_NATIVE_CLOSEOUT_COMPATIBILITY_ENGINE_SEED_BASE = 4_000_000_000 as const;
export const MISSION_NATIVE_CLOSEOUT_COMPATIBILITY_RUNS_PER_COUNTRY_SLOT = 4 as const;

export type MissionNativeCloseoutFactory = Awaited<ReturnType<typeof loadBaselineFactory>>;
type ActionTraceRow = { tick: number; args: unknown[] };
type Snapshot = {
    tick: number;
    credits: number;
    units: Array<{ id: number; name: string; x: number; y: number; hitPoints: number }>;
    queues: Array<{ queue: number; payload: unknown }>;
};
export type MissionNativeCloseoutRunTrace = {
    actions: ActionTraceRow[];
    snapshots: Snapshot[];
    quitAttempts: { candidate: number; baseline: number };
    telemetry: BuildingEliminationTelemetryEvent[];
};

const requiredPath = (name: string): string => {
    const value = process.env[name];
    if (!value) throw new Error(`${name} is required`);
    return path.resolve(value);
};

const digest = (value: unknown): string => createHash("sha256")
    .update(JSON.stringify(value))
    .digest("hex");

const snapshot = (bot: InspectableBaselineBot, tick: number): Snapshot => {
    if (!bot.lastGameApi || !bot.lastPlayerProduction) throw new Error(`Missing candidate state at tick ${tick}`);
    const game = bot.lastGameApi;
    return {
        tick,
        credits: game.getPlayerData(bot.name).credits,
        units: game.getVisibleUnits(bot.name, "self")
            .map((id) => game.getUnitData(id))
            .filter((unit): unit is UnitData => !!unit)
            .map((unit) => ({
                id: unit.id,
                name: unit.rules.name,
                x: unit.tile.rx,
                y: unit.tile.ry,
                hitPoints: unit.hitPoints,
            })).sort((left, right) => left.id - right.id),
        queues: [
            QueueType.Structures,
            QueueType.Armory,
            QueueType.Infantry,
            QueueType.Vehicles,
            QueueType.Aircrafts,
        ].map((queue) => ({ queue, payload: bot.lastPlayerProduction?.getQueueData(queue) })),
    };
};

const installActionTrace = (
    bot: InspectableBaselineBot,
    trace: ActionTraceRow[],
    quitAudit: { attempts: number },
): void => {
    const originalStart = bot.onGameStart.bind(bot);
    bot.onGameStart = (game: GameApi): void => {
        originalStart(game);
        const actions = bot.lastPlayerActions;
        if (!actions) throw new Error(`Missing actions for ${bot.name}`);
        const originalOrderUnits = actions.orderUnits.bind(actions);
        Object.defineProperty(actions, "orderUnits", {
            configurable: true,
            writable: true,
            value: (...args: unknown[]): unknown => {
                trace.push({ tick: game.getCurrentTick(), args: structuredClone(args) });
                return (originalOrderUnits as (...values: unknown[]) => unknown)(...args);
            },
        });
        Object.defineProperty(actions as ActionsApi, "quitGame", {
            configurable: true,
            writable: true,
            value: (): void => { quitAudit.attempts += 1; },
        });
    };
};

const settings = (
    mapName: string,
    candidate: InspectableBaselineBot,
    baseline: InspectableBaselineBot,
    candidateSlot: 0 | 1,
): CreateOfflineOpts => ({
    buildOffAlly: false,
    cratesAppear: false,
    credits: 10_000,
    gameMode: cdapi.getAvailableGameModes(mapName)[0],
    gameSpeed: 6,
    mapName,
    mcvRepacks: true,
    shortGame: false,
    superWeapons: false,
    unitCount: 0,
    online: false,
    agents: candidateSlot === 0 ? [candidate, baseline] : [baseline, candidate],
});

export const runMissionNativeCloseoutTrace = async (args: {
    factory: MissionNativeCloseoutFactory;
    mapName: string;
    country: Countries;
    candidateSlot: 0 | 1;
    requestedEngineSeed: number;
    policy: MissionNativeCloseoutPolicyV5 | MissionNativeCloseoutPolicyV6 | MissionNativeCloseoutPolicyV7 |
        MissionNativeCloseoutPolicyV8 | MissionNativeCloseoutPolicyV9 | MissionNativeCloseoutPolicyV10 |
        MissionNativeCloseoutPolicyV11 | MissionNativeCloseoutPolicyV12 | MissionNativeCloseoutPolicyV13 |
        MissionNativeCloseoutPolicyV14 | MissionNativeCloseoutPolicyV15 | null;
}): Promise<MissionNativeCloseoutRunTrace> => {
    const { factory, mapName, country, candidateSlot, requestedEngineSeed, policy } = args;
    const telemetry: BuildingEliminationTelemetryEvent[] = [];
    const candidate = policy === null
        ? factory.create(`Candidate_${country}_${candidateSlot}`, country)
        : createMissionNativeCloseoutCandidate(
            factory,
            `Candidate_${country}_${candidateSlot}`,
            country,
            policy,
            (event) => telemetry.push(event),
        );
    const baseline = factory.create(`Baseline_${country}_${candidateSlot}`, country);
    const actions: ActionTraceRow[] = [];
    const candidateQuit = { attempts: 0 };
    const baselineQuit = { attempts: 0 };
    installActionTrace(candidate, actions, candidateQuit);
    installActionTrace(baseline, [], baselineQuit);
    const snapshots: Snapshot[] = [];
    await withSeededOfflineGame(
        cdapi,
        settings(mapName, candidate, baseline, candidateSlot),
        requestedEngineSeed,
        [{ agent: candidate, identity: "candidate" }, { agent: baseline, identity: "baseline" }],
        async (game) => {
            for (let tick = 1; tick <= MISSION_NATIVE_CLOSEOUT_COMPATIBILITY_MAX_TICKS; tick += 1) {
                if (game.isFinished()) {
                    throw new Error(`Outcome-free mission-native game ended before tick cap at ${tick}`);
                }
                await game.update();
                if (tick % 300 === 0) snapshots.push(snapshot(candidate, tick));
            }
        },
    );
    return {
        actions,
        snapshots,
        quitAttempts: { candidate: candidateQuit.attempts, baseline: baselineQuit.attempts },
        telemetry,
    };
};

export const validateMissionNativeCloseoutExposure = (
    telemetry: readonly BuildingEliminationTelemetryEvent[],
    country: Countries,
    slot: 0 | 1,
): void => {
    const activated = telemetry.filter((event): event is Extract<BuildingEliminationTelemetryEvent, {
        event: "activated";
    }> => event.event === "activated");
    if (activated.length !== 1) {
        throw new Error(`Expected exactly one native mission activation for ${country} slot ${slot}`);
    }
    if (activated[0].tick < 2_700 || activated[0].reservedCombatants !== 0) {
        throw new Error(`Native mission activation contract drifted for ${country} slot ${slot}`);
    }
    const orders = telemetry.filter((event): event is Extract<BuildingEliminationTelemetryEvent, {
        event: "target_orders";
    }> => event.event === "target_orders");
    if (orders.length === 0 || !orders.some(({ attackerCount }) => attackerCount > 0)) {
        throw new Error(`No mission-owned building order for ${country} slot ${slot}`);
    }
    if (orders.some(({ targets, attackerCount }) => targets.length !== 1 || attackerCount <= 0)) {
        throw new Error(`Native closeout lost single-target full-offense focus for ${country} slot ${slot}`);
    }
    const assignments = telemetry.filter((event): event is Extract<BuildingEliminationTelemetryEvent, {
        event: "assignment_summary";
    }> => event.event === "assignment_summary");
    if (!assignments.some(({ assignedAttackers, targetCount }) => assignedAttackers > 0 && targetCount === 1)) {
        throw new Error(`No native mission assignment exposure for ${country} slot ${slot}`);
    }
    const decisions = telemetry.filter((event): event is Extract<BuildingEliminationTelemetryEvent, {
        event: "engagement_decision";
    }> => event.event === "engagement_decision");
    const allocations = telemetry.filter((event): event is Extract<BuildingEliminationTelemetryEvent, {
        event: "engagement_allocation";
    }> => event.event === "engagement_allocation");
    if (decisions.length === 0) throw new Error(`No engagement decision for ${country} slot ${slot}`);
    for (const decision of decisions) {
        if (decision.schemaVersion !== 3) {
            throw new Error(`Engagement-decision schema drifted for ${country} slot ${slot}`);
        }
        if (decision.phase === "blocker_clear") {
            if (
                decision.reason !== "route_interception_wins" || decision.blockerId === null ||
                decision.routeThreatCount <= 0 || decision.estimatedBuildingCompletionTicks === null ||
                decision.estimatedForceSurvivalTicks === null ||
                decision.estimatedBuildingCompletionTicks <= decision.estimatedForceSurvivalTicks
            ) {
                throw new Error(`Invalid route-blocker certificate for ${country} slot ${slot}`);
            }
        } else if (decision.reason === "building_completion_race") {
            if (
                decision.phase !== "building_strike" || decision.targetId === null ||
                decision.estimatedBuildingCompletionTicks === null ||
                decision.estimatedForceSurvivalTicks === null ||
                decision.estimatedBuildingCompletionTicks > decision.estimatedForceSurvivalTicks
            ) {
                throw new Error(`Invalid building-completion certificate for ${country} slot ${slot}`);
            }
        } else if (decision.reason === "building_in_range") {
            if (decision.phase !== "building_strike" || decision.targetId === null || decision.blockerId !== null) {
                throw new Error(`Invalid in-range building certificate for ${country} slot ${slot}`);
            }
        } else if (decision.reason === "no_route_threat") {
            if (
                decision.phase !== "building_strike" || decision.targetId === null ||
                decision.routeThreatCount !== 0 || decision.blockerId !== null
            ) {
                throw new Error(`Invalid no-route-threat certificate for ${country} slot ${slot}`);
            }
        } else if (decision.reason === "no_compatible_target") {
            if (decision.phase !== "no_compatible_target" || decision.targetId !== null) {
                throw new Error(`Invalid no-compatible-target certificate for ${country} slot ${slot}`);
            }
        } else if (decision.reason === "direct_building") {
            if (decision.phase !== "building_strike" || decision.targetId === null || decision.blockerId !== null) {
                throw new Error(`Invalid direct-building certificate for ${country} slot ${slot}`);
            }
        } else {
            throw new Error(`Unknown engagement certificate for ${country} slot ${slot}`);
        }
    }
    if (allocations.length === 0) {
        throw new Error(`No mission-native engagement allocation for ${country} slot ${slot}`);
    }
    for (const allocation of allocations) {
        if (
            allocation.schemaVersion !== 4 || allocation.assignedAttackerCount <= 0 ||
            allocation.buildingAttackerCount < 1 ||
            allocation.buildingAttackerCount + allocation.blockerAttackerCount !==
                allocation.assignedAttackerCount ||
            allocation.buildingAttackerCount < Math.ceil(allocation.assignedAttackerCount / 2) ||
            allocation.blockerAttackerCount > Math.floor(allocation.assignedAttackerCount / 2) ||
            allocation.blockerAttackerCount > 1 ||
            allocation.inRangeBuildingAttackerCount > allocation.buildingAttackerCount ||
            (allocation.blockerId === null && allocation.blockerAttackerCount !== 0)
        ) {
            throw new Error(`Invalid single-screen allocation for ${country} slot ${slot}`);
        }
    }
    const progress = telemetry.filter((event): event is Extract<BuildingEliminationTelemetryEvent, {
        event: "target_progress";
    }> => event.event === "target_progress");
    if (!progress.some(({ damage }) => damage > 0)) {
        throw new Error(`No physical building damage for ${country} slot ${slot}`);
    }
    if (telemetry.some(({ event }) => event === "sweep_orders" || event === "capability_production")) {
        throw new Error(`Unfrozen native closeout mechanism executed for ${country} slot ${slot}`);
    }
    for (const event of telemetry) {
        if (!Number.isSafeInteger(event.tick) || event.tick < 0) {
            throw new Error(`Native closeout telemetry tick drifted for ${country} slot ${slot}`);
        }
    }
};

export const summarizeMissionNativeCloseoutTelemetry = (
    telemetry: readonly BuildingEliminationTelemetryEvent[],
): Record<string, unknown> => {
    const counts: Record<string, number> = {};
    for (const { event } of telemetry) counts[event] = (counts[event] ?? 0) + 1;
    const orders = telemetry.filter((event): event is Extract<BuildingEliminationTelemetryEvent, {
        event: "target_orders";
    }> => event.event === "target_orders");
    const assignments = telemetry.filter((event): event is Extract<BuildingEliminationTelemetryEvent, {
        event: "assignment_summary";
    }> => event.event === "assignment_summary");
    const progress = telemetry.filter((event): event is Extract<BuildingEliminationTelemetryEvent, {
        event: "target_progress";
    }> => event.event === "target_progress");
    const decisions = telemetry.filter((event): event is Extract<BuildingEliminationTelemetryEvent, {
        event: "engagement_decision";
    }> => event.event === "engagement_decision");
    const allocations = telemetry.filter((event): event is Extract<BuildingEliminationTelemetryEvent, {
        event: "engagement_allocation";
    }> => event.event === "engagement_allocation");
    const numericRange = (values: Array<number | null>): [number, number] | null => {
        const finite = values.filter((value): value is number => value !== null && Number.isFinite(value));
        return finite.length === 0 ? null : [Math.min(...finite), Math.max(...finite)];
    };
    return {
        telemetryCount: telemetry.length,
        eventCounts: counts,
        buildingDamageEvents: progress.filter(({ damage }) => damage > 0).length,
        buildingDamage: progress.reduce((sum, { damage }) => sum + Math.max(0, damage), 0),
        targetIds: [...new Set(orders.flatMap(({ targets }) => targets.flatMap(({ id }) =>
            id === null ? [] : [id],
        )))].sort((left, right) => left - right),
        targetNames: [...new Set(orders.flatMap(({ targets }) => targets.map(({ name }) => name)))].sort(),
        attackerCountRange: orders.length === 0 ? null : [
            Math.min(...orders.map(({ attackerCount }) => attackerCount)),
            Math.max(...orders.map(({ attackerCount }) => attackerCount)),
        ],
        assignedAttackerCountRange: assignments.length === 0 ? null : [
            Math.min(...assignments.map(({ assignedAttackers }) => assignedAttackers)),
            Math.max(...assignments.map(({ assignedAttackers }) => assignedAttackers)),
        ],
        engagementPhases: Object.fromEntries([...new Set(decisions.map(({ phase }) => phase))]
            .sort().map((phase) => [phase, decisions.filter((event) => event.phase === phase).length])),
        engagementReasons: Object.fromEntries([...new Set(decisions.map(({ reason }) => reason))]
            .sort().map((reason) => [reason, decisions.filter((event) => event.reason === reason).length])),
        blockerIds: [...new Set(decisions.flatMap(({ blockerId }) => blockerId === null ? [] : [blockerId]))]
            .sort((left, right) => left - right),
        blockerNames: [...new Set(decisions.flatMap(({ blockerName }) => blockerName === null ? [] : [blockerName]))]
            .sort(),
        estimatedBuildingCompletionTickRange: numericRange(
            decisions.map(({ estimatedBuildingCompletionTicks }) => estimatedBuildingCompletionTicks),
        ),
        estimatedForceSurvivalTickRange: numericRange(
            decisions.map(({ estimatedForceSurvivalTicks }) => estimatedForceSurvivalTicks),
        ),
        earliestRouteThreatInterceptTickRange: numericRange(
            decisions.map(({ earliestRouteThreatInterceptTicks }) => earliestRouteThreatInterceptTicks),
        ),
        buildingAttackerCountRange: allocations.length === 0 ? null : [
            Math.min(...allocations.map(({ buildingAttackerCount }) => buildingAttackerCount)),
            Math.max(...allocations.map(({ buildingAttackerCount }) => buildingAttackerCount)),
        ],
        blockerAttackerCountRange: allocations.length === 0 ? null : [
            Math.min(...allocations.map(({ blockerAttackerCount }) => blockerAttackerCount)),
            Math.max(...allocations.map(({ blockerAttackerCount }) => blockerAttackerCount)),
        ],
        splitAllocationCount: allocations.filter(({ blockerAttackerCount }) => blockerAttackerCount > 0).length,
        pureBuildingAllocationCount: allocations.filter(({ blockerAttackerCount }) => blockerAttackerCount === 0).length,
        preemptedMissions: [...new Set(telemetry.flatMap((event) =>
            event.event === "activated" ? event.preemptedMissions : [],
        ))].sort(),
    };
};

const main = async (): Promise<void> => {
    const repoRoot = path.resolve(process.cwd(), "..", "..");
    const outFile = requiredPath("OUT_FILE");
    if (fs.existsSync(outFile)) throw new Error(`Refusing to overwrite ${outFile}`);
    if (!process.env.BASELINE_PACKAGE_ROOT || process.env.REQUIRE_EXTERNAL_BASELINE !== "true") {
        throw new Error("Mission-native compatibility requires the pinned external baseline");
    }
    const mapName = "simple-1v1-no-preview.map";
    if (sha256File(path.join(process.cwd(), "data", mapName)) !== METHOD_V5_EQUIVALENCE_MAP_SHA256) {
        throw new Error("Mission-native compatibility map bytes drifted");
    }
    const factory = await loadBaselineFactory(path.join(repoRoot, "packages", "chronodivide-bot"));
    const disabledPolicy = buildMissionNativeCloseoutPolicyV5(false);
    const enabledPolicy = buildMissionNativeCloseoutPolicyV5(true);
    const rows: Array<Record<string, unknown>> = [];
    await cdapi.init(path.join(process.cwd(), "data"));
    let index = 0;
    for (const country of Object.values(Countries)) for (const candidateSlot of [0, 1] as const) {
        const requestedEngineSeed = derivePairedEngineSeed(
            MISSION_NATIVE_CLOSEOUT_COMPATIBILITY_ENGINE_SEED_BASE,
            index++,
        );
        const direct = await runMissionNativeCloseoutTrace({
            factory, mapName, country, candidateSlot, requestedEngineSeed, policy: null,
        });
        const disabled = await runMissionNativeCloseoutTrace({
            factory, mapName, country, candidateSlot, requestedEngineSeed, policy: disabledPolicy,
        });
        const directDigest = digest({ actions: direct.actions, snapshots: direct.snapshots });
        const disabledDigest = digest({ actions: disabled.actions, snapshots: disabled.snapshots });
        const validationErrors: string[] = [];
        if (directDigest !== disabledDigest) {
            validationErrors.push(`Disabled mission-native adapter drifted for ${country} slot ${candidateSlot}`);
        }
        if (disabled.telemetry.length !== 0) {
            validationErrors.push(`Disabled mission-native adapter emitted telemetry for ${country} slot ${candidateSlot}`);
        }
        const first = await runMissionNativeCloseoutTrace({
            factory, mapName, country, candidateSlot, requestedEngineSeed, policy: enabledPolicy,
        });
        const repeat = await runMissionNativeCloseoutTrace({
            factory, mapName, country, candidateSlot, requestedEngineSeed, policy: enabledPolicy,
        });
        for (const [label, trace] of [["first", first], ["repeat", repeat]] as const) {
            try {
                validateMissionNativeCloseoutExposure(trace.telemetry, country, candidateSlot);
            } catch (error) {
                validationErrors.push(`${label}: ${error instanceof Error ? error.message : String(error)}`);
            }
        }
        const firstDigest = digest({ actions: first.actions, snapshots: first.snapshots, telemetry: first.telemetry });
        const repeatDigest = digest({ actions: repeat.actions, snapshots: repeat.snapshots, telemetry: repeat.telemetry });
        if (firstDigest !== repeatDigest) {
            validationErrors.push(`Mission-native trace was not deterministic for ${country} slot ${candidateSlot}`);
        }
        if (digest(first.actions) === digest(direct.actions)) {
            validationErrors.push(`Mission-native candidate did not change commands for ${country} slot ${candidateSlot}`);
        }
        const quitAttempts = {
            direct: direct.quitAttempts,
            disabled: disabled.quitAttempts,
            first: first.quitAttempts,
            repeat: repeat.quitAttempts,
        };
        if (Object.values(quitAttempts).some(({ candidate, baseline }) => candidate !== 0 || baseline !== 0)) {
            validationErrors.push(`Compatibility run attempted resignation for ${country} slot ${candidateSlot}`);
        }
        rows.push({
            country,
            candidateSlot,
            requestedEngineSeed,
            directExternalTraceSha256: directDigest,
            disabledAdapterTraceSha256: disabledDigest,
            disabledAdapterEquivalent: directDigest === disabledDigest,
            enabledRepeatTraceSha256: firstDigest,
            enabledTraceDeterministic: firstDigest === repeatDigest,
            enabledChangedCommands: digest(first.actions) !== digest(direct.actions),
            enabledTelemetrySummary: summarizeMissionNativeCloseoutTelemetry(first.telemetry),
            repeatTelemetrySummary: summarizeMissionNativeCloseoutTelemetry(repeat.telemetry),
            validationErrors,
            passed: validationErrors.length === 0,
            quitAttempts,
            outcomeInspected: false,
        });
    }
    const manifest = createExperimentManifest({
        runId: `mission-native-closeout-compatibility-${process.env.SLURM_JOB_ID ?? "local"}`,
        mixDir: path.join(process.cwd(), "data"),
        maps: [mapName],
        effectiveConfig: {
            purpose: "outcome-free-mission-native-single-screen-and-building-damage-v5",
            disabledPolicyId: missionNativeCloseoutPolicyV5Sha256(disabledPolicy),
            enabledPolicyId: missionNativeCloseoutPolicyV5Sha256(enabledPolicy),
            countries: Object.values(Countries),
            reciprocalSlots: [0, 1],
            runsPerCountrySlot: MISSION_NATIVE_CLOSEOUT_COMPATIBILITY_RUNS_PER_COUNTRY_SLOT,
            maxTicks: MISSION_NATIVE_CLOSEOUT_COMPATIBILITY_MAX_TICKS,
            outcomeInspection: false,
        },
        baseline: factory.descriptor,
        gameSeedBase: MISSION_NATIVE_CLOSEOUT_COMPATIBILITY_ENGINE_SEED_BASE,
    });
    if (
        manifest.scheduler.account !== "pi_jss233" || manifest.source.gitBranch !== "main" ||
        manifest.source.trackedDirty !== false || manifest.software.baseline.kind !== "external-package" ||
        manifest.software.baseline.trackedDirty !== false || rows.length !== 18
    ) throw new Error("Mission-native compatibility provenance or coverage failed");
    const globalValidationErrors: string[] = [];
    const targetNames = new Set(rows.flatMap((row) => {
        const summary = row.enabledTelemetrySummary as { targetNames?: unknown } | undefined;
        const names = summary?.targetNames;
        return Array.isArray(names)
            ? names.filter((name): name is string => typeof name === "string")
            : [];
    }));
    if (targetNames.size < 2) globalValidationErrors.push("Native mission exercised fewer than two building types");
    const splitAllocationCount = rows.reduce((sum, row) => {
        const summary = row.enabledTelemetrySummary as { splitAllocationCount?: unknown } | undefined;
        return sum + (typeof summary?.splitAllocationCount === "number" ? summary.splitAllocationCount : 0);
    }, 0);
    const pureBuildingAllocationCount = rows.reduce((sum, row) => {
        const summary = row.enabledTelemetrySummary as { pureBuildingAllocationCount?: unknown } | undefined;
        return sum + (typeof summary?.pureBuildingAllocationCount === "number"
            ? summary.pureBuildingAllocationCount
            : 0);
    }, 0);
    if (splitAllocationCount === 0) {
        globalValidationErrors.push("Native mission never exercised the single-attacker blocker screen");
    }
    if (pureBuildingAllocationCount === 0) {
        globalValidationErrors.push("Native mission never exercised a pure building allocation");
    }
    const retargetedCellCount = rows.filter((row) => {
        const summary = row.enabledTelemetrySummary as {
            eventCounts?: unknown;
            targetIds?: unknown;
        } | undefined;
        const targetStalled = summary?.eventCounts && typeof summary.eventCounts === "object"
            ? (summary.eventCounts as Record<string, unknown>).target_stalled
            : 0;
        const targetIds = summary?.targetIds;
        return typeof targetStalled === "number" && targetStalled > 0 &&
            Array.isArray(targetIds) && targetIds.length > 1;
    }).length;
    if (retargetedCellCount === 0) {
        globalValidationErrors.push("Native mission never exposed a stalled-target identity change");
    }
    const passed = rows.every((row) => row.passed === true) && globalValidationErrors.length === 0;
    const output = {
        schemaVersion: 5,
        status: passed
            ? "PASS_OUTCOME_FREE_MISSION_NATIVE_CLOSEOUT_COMPATIBILITY_V5"
            : "FAIL_OUTCOME_FREE_MISSION_NATIVE_CLOSEOUT_COMPATIBILITY_V5",
        generatedAt: new Date().toISOString(),
        passed,
        outcomeFree: true,
        sourceGitCommit: manifest.source.gitCommit,
        scheduler: manifest.scheduler,
        externalBaseline: manifest.software.baseline,
        disabledPolicyId: missionNativeCloseoutPolicyV5Sha256(disabledPolicy),
        enabledPolicyId: missionNativeCloseoutPolicyV5Sha256(enabledPolicy),
        countryCount: Object.values(Countries).length,
        reciprocalSlotCount: 2,
        gameCount: rows.length * MISSION_NATIVE_CLOSEOUT_COMPATIBILITY_RUNS_PER_COUNTRY_SLOT,
        maxTicks: MISSION_NATIVE_CLOSEOUT_COMPATIBILITY_MAX_TICKS,
        retargetedCellCount,
        globalValidationErrors,
        rows,
    };
    fs.mkdirSync(path.dirname(outFile), { recursive: true, mode: 0o700 });
    fs.writeFileSync(outFile, JSON.stringify(output, null, 2) + "\n", { flag: "wx", mode: 0o600 });
    console.log(JSON.stringify({
        outFile,
        sha256: sha256File(outFile),
        status: output.status,
        gameCount: output.gameCount,
    }));
    if (!passed) throw new Error("Mission-native closeout compatibility-v5 failed; preserved diagnostic artifact");
};

const invoked = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (import.meta.url === invoked) main().catch((error) => { console.error(error); process.exitCode = 1; });
