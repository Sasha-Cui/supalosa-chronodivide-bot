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
import { InspectableBaselineBot, loadBaselineFactory } from "../benchmark/baselineLoader.js";
import { createExperimentManifest } from "../benchmark/provenance.js";
import { derivePairedEngineSeed, withSeededOfflineGame } from "../benchmark/seededOfflineGame.js";
import { METHOD_V5_EQUIVALENCE_MAP_SHA256 } from "./methodV5BaselineEquivalence.js";
import { sha256File } from "./methodV5PlanRunner.js";
import {
    PersistentObjectiveCompletionPolicyV4,
    buildPersistentObjectiveCompletionPolicyV4,
    persistentObjectiveCompletionPolicyV4Sha256,
} from "./persistentObjectiveCompletionPolicyV4.js";
import {
    PersistentObjectiveCompletionTelemetry,
    createPersistentObjectiveCompletionCandidate,
    isObjectiveOffensiveMissionName,
} from "./persistentObjectiveCompletionStrategy.js";

export const PERSISTENT_OBJECTIVE_COMPATIBILITY_MAX_TICKS = 5_400 as const;
export const PERSISTENT_OBJECTIVE_COMPATIBILITY_ENGINE_SEED_BASE = 4_290_000_000 as const;
export const PERSISTENT_OBJECTIVE_COMPATIBILITY_RUNS_PER_COUNTRY_SLOT = 4 as const;

type Factory = Awaited<ReturnType<typeof loadBaselineFactory>>;
type ActionTraceRow = { tick: number; args: unknown[] };
type Snapshot = {
    tick: number;
    credits: number;
    units: Array<{ id: number; name: string; x: number; y: number; hitPoints: number }>;
    queues: Array<{ queue: number; payload: unknown }>;
};
type RunTrace = {
    actions: ActionTraceRow[];
    snapshots: Snapshot[];
    quitAttempts: { candidate: number; baseline: number };
    telemetry: PersistentObjectiveCompletionTelemetry[];
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

const run = async (args: {
    factory: Factory;
    mapName: string;
    country: Countries;
    candidateSlot: 0 | 1;
    requestedEngineSeed: number;
    policy: PersistentObjectiveCompletionPolicyV4 | null;
}): Promise<RunTrace> => {
    const { factory, mapName, country, candidateSlot, requestedEngineSeed, policy } = args;
    const telemetry: PersistentObjectiveCompletionTelemetry[] = [];
    const candidate = policy === null
        ? factory.create(`Candidate_${country}_${candidateSlot}`, country)
        : createPersistentObjectiveCompletionCandidate(
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
            for (let tick = 1; tick <= PERSISTENT_OBJECTIVE_COMPATIBILITY_MAX_TICKS; tick += 1) {
                if (game.isFinished()) throw new Error(`Outcome-free compatibility game ended before tick cap at ${tick}`);
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

export const validatePersistentObjectiveCompatibilityExposure = (
    telemetry: readonly PersistentObjectiveCompletionTelemetry[],
    country: Countries,
    slot: 0 | 1,
): void => {
    const active = telemetry.filter(({ phase }) => phase === "building_strike" || phase === "blocker_clear");
    if (active.length === 0) throw new Error(`No objective action for ${country} slot ${slot}`);
    if (!active.some(({ issuedOrder }) => issuedOrder === "attack_building")) {
        throw new Error(`No building-directed action for ${country} slot ${slot}`);
    }
    if (!active.some(({ unitDiagnostics }) => unitDiagnostics.some(({ selected, currentAction }) =>
        selected && (currentAction === "moving" || currentAction === "attacking"),
    ))) throw new Error(`No next-cycle command response for ${country} slot ${slot}`);
    if (!telemetry.some(({ buildingDamageSincePreviousDecision }) => buildingDamageSincePreviousDecision > 0)) {
        throw new Error(`No physical building damage for ${country} slot ${slot}`);
    }
    for (const event of telemetry) {
        if (
            event.schemaVersion !== 2 ||
            event.event !== "objective_completion_decision" ||
            event.informationInterface !== "public_complete_state"
        ) throw new Error(`Persistent objective telemetry identity drifted for ${country} slot ${slot}`);
        if (!Number.isSafeInteger(event.tick) || event.tick < 0) {
            throw new Error(`Persistent objective telemetry tick drifted for ${country} slot ${slot}`);
        }
        if (event.phase === "building_strike" && event.issuedOrder !== "attack_building") {
            throw new Error(`Building phase lacks a building order for ${country} slot ${slot}`);
        }
        if (event.phase === "blocker_clear" && event.issuedOrder !== "attack_blocker") {
            throw new Error(`Blocker phase lacks a blocker order for ${country} slot ${slot}`);
        }
        const selectedIds = new Set(event.selectedAttackerIds);
        const selectedDiagnostics = event.unitDiagnostics.filter(({ selected }) => selected);
        if (selectedDiagnostics.length !== selectedIds.size ||
            selectedDiagnostics.some(({ id }) => !selectedIds.has(id))) {
            throw new Error(`Selected-unit telemetry drifted for ${country} slot ${slot}`);
        }
        if (selectedDiagnostics.some(({ compatible, reachable }) => !compatible || !reachable)) {
            throw new Error(`Incompatible selected attacker for ${country} slot ${slot}`);
        }
        if (!event.terminal && selectedDiagnostics.length > 8) {
            throw new Error(`Multi-building lease exceeded the overall count cap for ${country} slot ${slot}`);
        }
        const selectedLocked = selectedDiagnostics.filter(({ missionLocked }) => missionLocked === true);
        if (!event.terminal && selectedLocked.some(({ missionName }) =>
            !missionName || !isObjectiveOffensiveMissionName(missionName),
        )) {
            throw new Error(`Multi-building lease commandeered a non-offensive locked mission for ${country} slot ${slot}`);
        }
        if (!event.terminal && selectedLocked.length > 6) {
            throw new Error(`Multi-building lease exceeded the locked offensive count cap for ${country} slot ${slot}`);
        }
        if (!event.terminal) {
            const lockedCompatibleByMission = new Map<string, number>();
            const selectedLockedByMission = new Map<string, number>();
            for (const diagnostic of event.unitDiagnostics) {
                if (diagnostic.missionLocked !== true || !diagnostic.missionName || !diagnostic.compatible) continue;
                lockedCompatibleByMission.set(
                    diagnostic.missionName,
                    (lockedCompatibleByMission.get(diagnostic.missionName) ?? 0) + 1,
                );
                if (diagnostic.selected) selectedLockedByMission.set(
                    diagnostic.missionName,
                    (selectedLockedByMission.get(diagnostic.missionName) ?? 0) + 1,
                );
            }
            for (const [missionName, selectedCount] of selectedLockedByMission) {
                const available = lockedCompatibleByMission.get(missionName) ?? 0;
                const limit = Math.min(available, Math.max(3, Math.ceil(available / 2)));
                if (selectedCount > limit) {
                    throw new Error(`Locked offensive mission fraction exceeded for ${country} slot ${slot}`);
                }
            }
            if (
                (event.phase === "building_strike" || event.phase === "blocker_clear") &&
                !event.homeThreatened
            ) {
                const eligibleUnlocked = event.unitDiagnostics.filter((diagnostic) =>
                    diagnostic.compatible && diagnostic.missionLocked !== true &&
                    (!diagnostic.missionName || isObjectiveOffensiveMissionName(diagnostic.missionName)),
                ).length;
                const boundedLocked = Math.min(6, [...lockedCompatibleByMission.entries()]
                    .filter(([missionName]) => isObjectiveOffensiveMissionName(missionName))
                    .reduce((sum, [, available]) =>
                        sum + Math.min(available, Math.max(3, Math.ceil(available / 2))), 0));
                const eligible = eligibleUnlocked + boundedLocked;
                const reserve = Math.min(4, Math.max(0, eligible - 3));
                const available = eligible - reserve;
                const compatible = event.unitDiagnostics.filter(({ compatible }) => compatible).length;
                const expected = available === 0 ? 0 : Math.min(
                    8,
                    Math.min(available, Math.max(3, Math.ceil(compatible / 2))),
                );
                if (selectedDiagnostics.length !== expected) {
                    throw new Error(`Minimum viable detachment arithmetic drifted for ${country} slot ${slot}`);
                }
            }
        }
        if (event.phase === "predecessor_fallback" && event.selectedAttackerIds.length > 0) {
            throw new Error(`Fallback retained an assault lease for ${country} slot ${slot}`);
        }
        for (const diagnostic of event.unitDiagnostics) {
            if (!diagnostic.rulesName || !diagnostic.currentAction) {
                throw new Error(`Incomplete unit diagnostic for ${country} slot ${slot}`);
            }
            if (!diagnostic.compatible && !diagnostic.rejectionReason) {
                throw new Error(`Unexplained rejected attacker for ${country} slot ${slot}`);
            }
        }
    }
};

type CountMap = Record<string, number>;

const increment = (counts: CountMap, key: string, amount = 1): void => {
    counts[key] = (counts[key] ?? 0) + amount;
};

export const summarizePersistentObjectiveCompatibilityTelemetry = (
    telemetry: readonly PersistentObjectiveCompletionTelemetry[],
): Record<string, unknown> => {
    const phaseCounts: CountMap = {};
    const reasonCounts: CountMap = {};
    const selectedActionCounts: CountMap = {};
    const delegatedActionCounts: CountMap = {};
    const rejectionReasonCounts: CountMap = {};
    const targetRulesNameCounts: CountMap = {};
    const blockerRulesNameCounts: CountMap = {};
    const rules = new Map<string, {
        observations: number;
        compatibleObservations: number;
        selectedObservations: number;
        lockedObservations: number;
        selectedWhileLocked: number;
        ordinaryWeaponWithSpecialSecondaryObservations: number;
        selectedActionCounts: CountMap;
        delegatedActionCounts: CountMap;
        rejectionReasonCounts: CountMap;
        missionNameCounts: CountMap;
        selectedMissionNameCounts: CountMap;
        lockedMissionNameCounts: CountMap;
    }>();
    let compatibleObservations = 0;
    let selectedObservations = 0;
    let buildingDamageEvents = 0;
    let buildingDamage = 0;
    let blockerDamageEvents = 0;
    let blockerDamage = 0;
    let routeProgressEvents = 0;
    let routeProgress = 0;
    let ordinaryWeaponWithSpecialSecondaryObservations = 0;
    let selectedOrdinaryWeaponWithSpecialSecondaryObservations = 0;
    let selectedUnitDisappearanceTransitions = 0;
    let selectedUnitDeselectionTransitions = 0;
    let previousSelectedIds = new Set<number>();
    for (const event of telemetry) {
        increment(phaseCounts, event.phase);
        increment(reasonCounts, event.reason);
        if (event.targetRulesName) increment(targetRulesNameCounts, event.targetRulesName);
        if (event.blockerRulesName) increment(blockerRulesNameCounts, event.blockerRulesName);
        const currentIds = new Set(event.unitDiagnostics.map(({ id }) => id));
        const currentSelectedIds = new Set(event.selectedAttackerIds);
        for (const id of previousSelectedIds) {
            if (!currentIds.has(id)) selectedUnitDisappearanceTransitions += 1;
            else if (!currentSelectedIds.has(id)) selectedUnitDeselectionTransitions += 1;
        }
        previousSelectedIds = currentSelectedIds;
        if (event.buildingDamageSincePreviousDecision > 0) buildingDamageEvents += 1;
        buildingDamage += event.buildingDamageSincePreviousDecision;
        if (event.blockerDamageSincePreviousDecision > 0) blockerDamageEvents += 1;
        blockerDamage += event.blockerDamageSincePreviousDecision;
        if (event.routeProgressSincePreviousDecision > 0) routeProgressEvents += 1;
        routeProgress += event.routeProgressSincePreviousDecision;
        for (const diagnostic of event.unitDiagnostics) {
            const row = rules.get(diagnostic.rulesName) ?? {
                observations: 0,
                compatibleObservations: 0,
                selectedObservations: 0,
                lockedObservations: 0,
                selectedWhileLocked: 0,
                ordinaryWeaponWithSpecialSecondaryObservations: 0,
                selectedActionCounts: {},
                delegatedActionCounts: {},
                rejectionReasonCounts: {},
                missionNameCounts: {},
                selectedMissionNameCounts: {},
                lockedMissionNameCounts: {},
            };
            row.observations += 1;
            if (diagnostic.compatible) {
                compatibleObservations += 1;
                row.compatibleObservations += 1;
            }
            if (diagnostic.missionName) increment(row.missionNameCounts, diagnostic.missionName);
            if (diagnostic.missionLocked === true) {
                row.lockedObservations += 1;
                if (diagnostic.missionName) increment(row.lockedMissionNameCounts, diagnostic.missionName);
            }
            if (diagnostic.hasOrdinaryCompatibleWeapon && diagnostic.hasSpecialSecondaryMechanic) {
                ordinaryWeaponWithSpecialSecondaryObservations += 1;
                row.ordinaryWeaponWithSpecialSecondaryObservations += 1;
            }
            if (diagnostic.selected) {
                selectedObservations += 1;
                row.selectedObservations += 1;
                increment(selectedActionCounts, diagnostic.currentAction);
                increment(row.selectedActionCounts, diagnostic.currentAction);
                if (diagnostic.missionLocked === true) row.selectedWhileLocked += 1;
                if (diagnostic.missionName) increment(row.selectedMissionNameCounts, diagnostic.missionName);
                if (diagnostic.hasOrdinaryCompatibleWeapon && diagnostic.hasSpecialSecondaryMechanic) {
                    selectedOrdinaryWeaponWithSpecialSecondaryObservations += 1;
                }
            } else {
                increment(delegatedActionCounts, diagnostic.currentAction);
                increment(row.delegatedActionCounts, diagnostic.currentAction);
            }
            if (diagnostic.rejectionReason) {
                increment(rejectionReasonCounts, diagnostic.rejectionReason);
                increment(row.rejectionReasonCounts, diagnostic.rejectionReason);
            }
            rules.set(diagnostic.rulesName, row);
        }
    }
    return {
        telemetryCount: telemetry.length,
        phaseCounts,
        reasonCounts,
        exactEnemyBuildingCountRange: telemetry.length === 0 ? null : [
            Math.min(...telemetry.map(({ exactEnemyBuildingCount }) => exactEnemyBuildingCount)),
            Math.max(...telemetry.map(({ exactEnemyBuildingCount }) => exactEnemyBuildingCount)),
        ],
        selectedAttackerCountRange: telemetry.length === 0 ? null : [
            Math.min(...telemetry.map(({ selectedAttackerIds }) => selectedAttackerIds.length)),
            Math.max(...telemetry.map(({ selectedAttackerIds }) => selectedAttackerIds.length)),
        ],
        compatibleObservations,
        selectedObservations,
        selectedFractionOfCompatibleObservations: compatibleObservations === 0
            ? 0
            : selectedObservations / compatibleObservations,
        selectedActionCounts,
        delegatedActionCounts,
        rejectionReasonCounts,
        targetRulesNameCounts,
        blockerRulesNameCounts,
        selectedUnitDisappearanceTransitions,
        selectedUnitDeselectionTransitions,
        buildingDamageEvents,
        buildingDamage,
        blockerDamageEvents,
        blockerDamage,
        routeProgressEvents,
        routeProgress,
        ordinaryWeaponWithSpecialSecondaryObservations,
        selectedOrdinaryWeaponWithSpecialSecondaryObservations,
        rules: Object.fromEntries([...rules.entries()].sort(([left], [right]) => left.localeCompare(right))),
    };
};

const main = async (): Promise<void> => {
    const repoRoot = path.resolve(process.cwd(), "..", "..");
    const outFile = requiredPath("OUT_FILE");
    if (fs.existsSync(outFile)) throw new Error(`Refusing to overwrite ${outFile}`);
    if (!process.env.BASELINE_PACKAGE_ROOT || process.env.REQUIRE_EXTERNAL_BASELINE !== "true") {
        throw new Error("Persistent objective compatibility requires the pinned external baseline");
    }
    const mapName = "simple-1v1-no-preview.map";
    if (sha256File(path.join(process.cwd(), "data", mapName)) !== METHOD_V5_EQUIVALENCE_MAP_SHA256) {
        throw new Error("Persistent objective compatibility map bytes drifted");
    }
    const factory = await loadBaselineFactory(path.join(repoRoot, "packages", "chronodivide-bot"));
    const disabledPolicy = buildPersistentObjectiveCompletionPolicyV4({ enabled: false });
    const smokePolicy = buildPersistentObjectiveCompletionPolicyV4({
        terminalMinTick: 0,
        assaultMinTick: 0,
        assaultBuildingCount: 100,
        minimumOwnBuildingsForAssault: 1,
        homeThreatRadius: 0,
        homeReserveRadius: 0,
        maximumLeaseTicks: 20_000,
    });
    const rows: Array<Record<string, unknown>> = [];
    await cdapi.init(path.join(process.cwd(), "data"));
    let index = 0;
    for (const country of Object.values(Countries)) for (const candidateSlot of [0, 1] as const) {
        const requestedEngineSeed = derivePairedEngineSeed(
            PERSISTENT_OBJECTIVE_COMPATIBILITY_ENGINE_SEED_BASE,
            index++,
        );
        const direct = await run({
            factory, mapName, country, candidateSlot, requestedEngineSeed, policy: null,
        });
        const disabled = await run({
            factory, mapName, country, candidateSlot, requestedEngineSeed, policy: disabledPolicy,
        });
        const directDigest = digest({ actions: direct.actions, snapshots: direct.snapshots });
        const disabledDigest = digest({ actions: disabled.actions, snapshots: disabled.snapshots });
        const validationErrors: string[] = [];
        if (directDigest !== disabledDigest) {
            validationErrors.push(`Disabled persistent objective control drifted for ${country} slot ${candidateSlot}`);
        }
        if (disabled.telemetry.length !== 0) {
            validationErrors.push(`Disabled persistent objective control emitted telemetry for ${country} slot ${candidateSlot}`);
        }
        const first = await run({
            factory, mapName, country, candidateSlot, requestedEngineSeed, policy: smokePolicy,
        });
        const repeat = await run({
            factory, mapName, country, candidateSlot, requestedEngineSeed, policy: smokePolicy,
        });
        for (const [label, trace] of [["first", first], ["repeat", repeat]] as const) {
            try {
                validatePersistentObjectiveCompatibilityExposure(trace.telemetry, country, candidateSlot);
            } catch (error) {
                validationErrors.push(`${label}: ${error instanceof Error ? error.message : String(error)}`);
            }
        }
        const firstDigest = digest({ actions: first.actions, snapshots: first.snapshots, telemetry: first.telemetry });
        const repeatDigest = digest({ actions: repeat.actions, snapshots: repeat.snapshots, telemetry: repeat.telemetry });
        if (firstDigest !== repeatDigest) {
            validationErrors.push(`Persistent objective trace was not deterministic for ${country} slot ${candidateSlot}`);
        }
        if (digest(first.actions) === digest(direct.actions)) {
            validationErrors.push(`Persistent objective overlay did not change commands for ${country} slot ${candidateSlot}`);
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
        const diagnostics = first.telemetry.flatMap(({ unitDiagnostics }) => unitDiagnostics);
        rows.push({
            country,
            candidateSlot,
            requestedEngineSeed,
            directExternalTraceSha256: directDigest,
            disabledOverlayTraceSha256: disabledDigest,
            disabledOverlayEquivalent: true,
            enabledRepeatTraceSha256: firstDigest,
            enabledTraceDeterministic: true,
            enabledChangedCommands: true,
            enabledTelemetryCount: first.telemetry.length,
            enabledPhases: [...new Set(first.telemetry.map(({ phase }) => phase))].sort(),
            enabledRulesNames: [...new Set(diagnostics.map(({ rulesName }) => rulesName))].sort(),
            enabledRejectionReasons: [...new Set(diagnostics.flatMap(({ rejectionReason }) =>
                rejectionReason ? [rejectionReason] : [],
            ))].sort(),
            enabledSelectedRulesNames: [...new Set(diagnostics.filter(({ selected }) => selected)
                .map(({ rulesName }) => rulesName))].sort(),
            enabledSelectedActionKinds: [...new Set(diagnostics.filter(({ selected }) => selected)
                .map(({ currentAction }) => currentAction))].sort(),
            enabledOrdinaryWeaponWithSpecialSecondaryObserved: diagnostics.some((diagnostic) =>
                diagnostic.hasOrdinaryCompatibleWeapon && diagnostic.hasSpecialSecondaryMechanic,
            ),
            enabledPreemptiveRouteInterceptionObserved: first.telemetry.some(({ reason }) =>
                reason === "preemptive_route_interception_blocker",
            ),
            enabledTelemetrySummary: summarizePersistentObjectiveCompatibilityTelemetry(first.telemetry),
            repeatTelemetrySummary: summarizePersistentObjectiveCompatibilityTelemetry(repeat.telemetry),
            validationErrors,
            passed: validationErrors.length === 0,
            quitAttempts,
            outcomeInspected: false,
        });
    }
    const manifest = createExperimentManifest({
        runId: `persistent-objective-compatibility-${process.env.SLURM_JOB_ID ?? "local"}`,
        mixDir: path.join(process.cwd(), "data"),
        maps: [mapName],
        effectiveConfig: {
            purpose: "outcome-free-persistent-objective-equivalence-determinism-and-command-exposure",
            disabledPolicyId: persistentObjectiveCompletionPolicyV4Sha256(disabledPolicy),
            smokePolicyId: persistentObjectiveCompletionPolicyV4Sha256(smokePolicy),
            countries: Object.values(Countries),
            reciprocalSlots: [0, 1],
            runsPerCountrySlot: PERSISTENT_OBJECTIVE_COMPATIBILITY_RUNS_PER_COUNTRY_SLOT,
            maxTicks: PERSISTENT_OBJECTIVE_COMPATIBILITY_MAX_TICKS,
            outcomeInspection: false,
        },
        baseline: factory.descriptor,
        gameSeedBase: PERSISTENT_OBJECTIVE_COMPATIBILITY_ENGINE_SEED_BASE,
    });
    if (
        manifest.scheduler.account !== "pi_jss233" || manifest.source.gitBranch !== "main" ||
        manifest.source.trackedDirty !== false || manifest.software.baseline.kind !== "external-package" ||
        manifest.software.baseline.trackedDirty !== false || rows.length !== 18
    ) throw new Error("Persistent objective compatibility provenance or coverage failed");
    const globalValidationErrors: string[] = [];
    if (!rows.some((row) => row.enabledPreemptiveRouteInterceptionObserved === true)) {
        globalValidationErrors.push("No live preemptive route-interception exposure was observed");
    }
    const passed = rows.every((row) => row.passed === true) && globalValidationErrors.length === 0;
    const output = {
        schemaVersion: 6,
        status: passed
            ? "PASS_OUTCOME_FREE_PERSISTENT_OBJECTIVE_COMPATIBILITY_V6"
            : "FAIL_OUTCOME_FREE_PERSISTENT_OBJECTIVE_COMPATIBILITY_V6",
        generatedAt: new Date().toISOString(),
        passed,
        outcomeFree: true,
        sourceGitCommit: manifest.source.gitCommit,
        scheduler: manifest.scheduler,
        externalBaseline: manifest.software.baseline,
        disabledPolicyId: persistentObjectiveCompletionPolicyV4Sha256(disabledPolicy),
        smokePolicyId: persistentObjectiveCompletionPolicyV4Sha256(smokePolicy),
        countryCount: Object.values(Countries).length,
        reciprocalSlotCount: 2,
        gameCount: rows.length * PERSISTENT_OBJECTIVE_COMPATIBILITY_RUNS_PER_COUNTRY_SLOT,
        maxTicks: PERSISTENT_OBJECTIVE_COMPATIBILITY_MAX_TICKS,
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
    if (!passed) throw new Error("Persistent objective compatibility-v6 failed; preserved diagnostic artifact");
};

const invoked = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (import.meta.url === invoked) main().catch((error) => { console.error(error); process.exitCode = 1; });
