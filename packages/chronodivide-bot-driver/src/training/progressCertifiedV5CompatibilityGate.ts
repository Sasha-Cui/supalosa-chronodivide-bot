import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
    ActionsApi,
    CreateOfflineOpts,
    GameApi,
    OrderType,
    QueueType,
    UnitData,
    cdapi,
} from "@chronodivide/game-api";
import { Countries } from "@supalosa/chronodivide-bot/dist/bot/logic/common/utils.js";
import { InspectableBaselineBot, loadBaselineFactory } from "../benchmark/baselineLoader.js";
import { createExperimentManifest } from "../benchmark/provenance.js";
import { withSeededOfflineGame } from "../benchmark/seededOfflineGame.js";
import { METHOD_V5_EQUIVALENCE_MAP_SHA256 } from "./methodV5BaselineEquivalence.js";
import { sha256File } from "./methodV5PlanRunner.js";
import {
    ProgressCertifiedConversionPolicyV5,
    buildProgressCertifiedConversionPolicyV5,
    progressCertifiedConversionPolicyV5Sha256,
} from "./progressCertifiedConversionPolicyV5.js";
import {
    ObjectiveBuildingOrderMode,
    TerminalObjectiveTelemetry,
    createTerminalObjectiveCandidate,
} from "./terminalObjectiveStrategy.js";

export const PROGRESS_CERTIFIED_V5_COMPATIBILITY_MAX_TICKS = 5_400 as const;
export const PROGRESS_CERTIFIED_V5_COMPATIBILITY_SEED_BASE = 4_294_962_000 as const;
export const PROGRESS_CERTIFIED_V5_COMPATIBILITY_RUNS_PER_CELL = 4 as const;
export const PROGRESS_CERTIFIED_V5_COMPATIBILITY_GATE_REVISION = "V5-C3" as const;
export const PROGRESS_CERTIFIED_V5_COMPATIBILITY_COUNTRIES = [
    Countries.USA,
    Countries.KOREA,
    Countries.FRANCE,
    Countries.GERMANY,
    Countries.GREAT_BRITAIN,
    Countries.LIBYA,
    Countries.IRAQ,
    Countries.CUBA,
    Countries.RUSSIA,
] as const;
export const PROGRESS_CERTIFIED_V5_COMPATIBILITY_CELL_COUNT =
    PROGRESS_CERTIFIED_V5_COMPATIBILITY_COUNTRIES.length * 2;

type Factory = Awaited<ReturnType<typeof loadBaselineFactory>>;
export type ProgressCertifiedV5ActionTraceRow = { tick: number; args: unknown[] };
type Snapshot = {
    tick: number;
    credits: number;
    units: Array<{ id: number; name: string; x: number; y: number; hitPoints: number }>;
    queues: Array<{ queue: number; payload: unknown }>;
};
type RunTrace = {
    actions: ProgressCertifiedV5ActionTraceRow[];
    snapshots: Snapshot[];
    quitAttempts: { candidate: number; baseline: number };
    telemetry: TerminalObjectiveTelemetry[];
    observedTicks: number;
    engineFinishObservedAtTick: number | null;
};

export type ProgressCertifiedV5OrderWitness = {
    tick: number;
    buildingId: number;
    coordinates: { x: number; y: number };
    attackerIds: number[];
    orderMode: ObjectiveBuildingOrderMode;
    actionArgsSha256: string;
};

export type ProgressCertifiedV5CompatibilityExposure = {
    telemetryCount: number;
    buildingDecisionCount: number;
    exactUnseenApproachCount: number;
    visibleHandoffCount: number;
    maximumLastPhysicalProgressTick: number;
    approachWitnesses: ProgressCertifiedV5OrderWitness[];
    visibleHandoffWitnesses: ProgressCertifiedV5OrderWitness[];
};

export type ProgressCertifiedV5CompatibilityCoverageRow = {
    country: Countries;
    candidateSlot: 0 | 1;
    firstCoverage: ProgressCertifiedV5CompatibilityExposure | null;
    repeatCoverage: ProgressCertifiedV5CompatibilityExposure | null;
};

export type ProgressCertifiedV5PopulationCoverage = {
    cellCount: number;
    buildingOrderCellCount: number;
    exactUnseenApproachCellCount: number;
    exactUnseenApproachCountryCount: number;
    exactUnseenApproachFactions: string[];
    exactUnseenApproachSlots: number[];
    visibleHandoffCellCount: number;
    validationErrors: string[];
};

export type ProgressCertifiedV5CompatibilityDiagnostic = {
    telemetryCount: number;
    actionableDecisionCount: number;
    buildingDecisionCount: number;
    decisionKindCounts: Record<string, number>;
    orderModeCounts: Record<string, number>;
    observedByCounts: Record<string, number>;
    candidateOrderTypeCounts: Record<string, number>;
};

export const buildProgressCertifiedV5CompatibilitySmokePolicy =
    (): ProgressCertifiedConversionPolicyV5 => buildProgressCertifiedConversionPolicyV5({
        conversionScope: "guarded_low_building_count",
        terminalForceMode: "direct_building",
        activationBuildingCount: 100,
        activationMinTick: 0,
        requireObservedCountAboveThreshold: false,
        minTick: 0,
    });

const requiredPath = (name: string): string => {
    const value = process.env[name];
    if (!value) throw new Error(`${name} is required`);
    return path.resolve(value);
};

const digest = (value: unknown): string => createHash("sha256")
    .update(JSON.stringify(value))
    .digest("hex");

const snapshot = (bot: InspectableBaselineBot, tick: number): Snapshot => {
    if (!bot.lastGameApi || !bot.lastPlayerProduction) {
        throw new Error(`Missing candidate state at tick ${tick}`);
    }
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
    trace: ProgressCertifiedV5ActionTraceRow[],
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
    policy: ProgressCertifiedConversionPolicyV5 | null;
}): Promise<RunTrace> => {
    const { factory, mapName, country, candidateSlot, requestedEngineSeed, policy } = args;
    const telemetry: TerminalObjectiveTelemetry[] = [];
    const candidate = policy === null
        ? factory.create(`Candidate_${country}_${candidateSlot}`, country)
        : createTerminalObjectiveCandidate(
            factory,
            `Candidate_${country}_${candidateSlot}`,
            country,
            policy,
            (event) => telemetry.push(event),
        );
    const baseline = factory.create(`Baseline_${country}_${candidateSlot}`, country);
    const actions: ProgressCertifiedV5ActionTraceRow[] = [];
    const candidateQuit = { attempts: 0 };
    const baselineQuit = { attempts: 0 };
    installActionTrace(candidate, actions, candidateQuit);
    installActionTrace(baseline, [], baselineQuit);
    const snapshots: Snapshot[] = [];
    let observedTicks = 0;
    let engineFinishObservedAtTick: number | null = null;
    await withSeededOfflineGame(
        cdapi,
        settings(mapName, candidate, baseline, candidateSlot),
        requestedEngineSeed,
        [{ agent: candidate, identity: "candidate" }, { agent: baseline, identity: "baseline" }],
        async (game) => {
            for (let tick = 1; tick <= PROGRESS_CERTIFIED_V5_COMPATIBILITY_MAX_TICKS; tick += 1) {
                if (game.isFinished()) {
                    engineFinishObservedAtTick = game.getCurrentTick();
                    break;
                }
                await game.update();
                observedTicks = tick;
                if (tick % 300 === 0) snapshots.push(snapshot(candidate, tick));
                if (game.isFinished()) {
                    engineFinishObservedAtTick = game.getCurrentTick();
                    break;
                }
            }
        },
    );
    return {
        actions,
        snapshots,
        quitAttempts: { candidate: candidateQuit.attempts, baseline: baselineQuit.attempts },
        telemetry,
        observedTicks,
        engineFinishObservedAtTick,
    };
};

const sameIds = (actual: unknown, expected: readonly number[]): boolean =>
    Array.isArray(actual) && actual.every((id) => Number.isSafeInteger(id)) &&
    actual.slice().sort((left, right) => Number(left) - Number(right)).join(",") ===
        expected.slice().sort((left, right) => left - right).join(",");

const matchingBuildingAction = (
    event: TerminalObjectiveTelemetry,
    actions: readonly ProgressCertifiedV5ActionTraceRow[],
): ProgressCertifiedV5ActionTraceRow | null => {
    const ids = event.selectedAttackerIds ?? [];
    const coordinates = event.selectedBuildingCoordinates;
    return actions.find(({ tick, args }) => {
        if (tick !== event.tick || !sameIds(args[0], ids)) return false;
        if (event.selectedBuildingOrderMode === "attack_visible_building") {
            return args[1] === OrderType.Attack && args[2] === event.selectedBuildingId;
        }
        if (
            event.selectedBuildingOrderMode === "attack_move_exact_unseen_coordinates" ||
            event.selectedBuildingOrderMode === "attack_move_remembered_coordinates"
        ) {
            return args[1] === OrderType.AttackMove &&
                args[2] === coordinates?.x && args[3] === coordinates?.y;
        }
        return args[1] === OrderType.Attack && args[2] === event.selectedBuildingId;
    }) ?? null;
};

const countStrings = (values: readonly string[]): Record<string, number> =>
    values.reduce<Record<string, number>>((counts, value) => ({
        ...counts,
        [value]: (counts[value] ?? 0) + 1,
    }), {});

export const summarizeProgressCertifiedV5CompatibilityDiagnostic = (
    telemetry: readonly TerminalObjectiveTelemetry[],
    actions: readonly ProgressCertifiedV5ActionTraceRow[],
): ProgressCertifiedV5CompatibilityDiagnostic => {
    const decisions = telemetry.filter(({ event }) => event === "decision" || event === "search_orders");
    return {
        telemetryCount: telemetry.length,
        actionableDecisionCount: decisions.filter(
            ({ selectedAttackerIds }) => (selectedAttackerIds?.length ?? 0) > 0,
        ).length,
        buildingDecisionCount: decisions.filter(({ decisionKind }) =>
            decisionKind === "building_strike" || decisionKind === "terminal_candidate_strike",
        ).length,
        decisionKindCounts: countStrings(decisions.map(({ decisionKind }) => String(decisionKind))),
        orderModeCounts: countStrings(decisions.map(
            ({ selectedBuildingOrderMode }) => String(selectedBuildingOrderMode),
        )),
        observedByCounts: countStrings(decisions.map(
            ({ selectedBuildingObservedBy }) => String(selectedBuildingObservedBy),
        )),
        candidateOrderTypeCounts: countStrings(actions.map(({ args }) => String(args[1]))),
    };
};

const witness = (
    event: TerminalObjectiveTelemetry,
    action: ProgressCertifiedV5ActionTraceRow,
): ProgressCertifiedV5OrderWitness => ({
    tick: event.tick,
    buildingId: event.selectedBuildingId!,
    coordinates: event.selectedBuildingCoordinates!,
    attackerIds: (event.selectedAttackerIds ?? []).slice().sort((left, right) => left - right),
    orderMode: event.selectedBuildingOrderMode!,
    actionArgsSha256: digest(action.args),
});

export const validateProgressCertifiedV5CompatibilityExposure = (
    telemetry: readonly TerminalObjectiveTelemetry[],
    actions: readonly ProgressCertifiedV5ActionTraceRow[],
    country: Countries,
    slot: 0 | 1,
): ProgressCertifiedV5CompatibilityExposure => {
    const label = `${country} slot ${slot}`;
    const decisions = telemetry.filter(({ event }) => event === "decision" || event === "search_orders");
    const actionable = decisions.filter(({ selectedAttackerIds }) => (selectedAttackerIds?.length ?? 0) > 0);
    if (decisions.length === 0 || actionable.length === 0) {
        throw new Error(`No actionable V5 progress-certified decision for ${label}`);
    }
    for (const event of telemetry) {
        if (
            event.schemaVersion !== 4 ||
            event.mechanism !== "progress_certified_terminal_conversion" ||
            event.informationBoundary !== "public_complete_state"
        ) throw new Error(`V5 progress-certified telemetry identity drifted for ${label}`);
        if (
            event.lastPhysicalProgressTick !== undefined &&
            (!Number.isSafeInteger(event.lastPhysicalProgressTick) || event.lastPhysicalProgressTick > event.tick)
        ) throw new Error(`Invalid V5 physical-progress clock for ${label}`);
        if (
            event.physicalNoProgressTicks !== undefined &&
            (!Number.isSafeInteger(event.physicalNoProgressTicks) || event.physicalNoProgressTicks < 0)
        ) throw new Error(`Invalid V5 physical no-progress interval for ${label}`);
        if (
            event.decisionKind === "predecessor_fallback" &&
            event.progressDeadlineExpired !== "blocker" && event.progressDeadlineExpired !== "building"
        ) throw new Error(`Unexplained V5 predecessor fallback for ${label}`);
        if (event.eligibleAttackerCount !== undefined && event.reservedCombatantCount !== undefined) {
            const configuredReserve = event.exactEnemyBuildingCount === 1 ? 0 : 2;
            if (event.reservedCombatantCount !== Math.min(configuredReserve, event.eligibleAttackerCount)) {
                throw new Error(`V5 dynamic reserve size drifted for ${label}`);
            }
        }
        if (event.exactEnemyBuildingCount === 1 && event.terminalReserveReleased !== true) {
            throw new Error(`V5 terminal reserve was not released for ${label}`);
        }
        if (event.terminalReserveReleased === true && event.exactEnemyBuildingCount !== 1) {
            throw new Error(`V5 terminal reserve release lacks exact final-building provenance for ${label}`);
        }
        const selected = new Set(event.selectedAttackerIds ?? []);
        if ((event.reservedCombatantIds ?? []).some((id) => selected.has(id))) {
            throw new Error(`V5 reserved combatant was assigned for ${label}`);
        }
    }
    const buildingEvents = decisions.filter(({ decisionKind }) =>
        decisionKind === "building_strike" || decisionKind === "terminal_candidate_strike",
    );
    if (buildingEvents.length === 0) throw new Error(`No V5 building decision for ${label}`);
    const matched = buildingEvents.map((event) => {
        if (
            !Number.isSafeInteger(event.selectedBuildingId) ||
            !event.selectedBuildingCoordinates ||
            !Number.isFinite(event.selectedBuildingCoordinates.x) ||
            !Number.isFinite(event.selectedBuildingCoordinates.y) ||
            !event.selectedBuildingOrderMode ||
            (event.selectedAttackerIds?.length ?? 0) === 0
        ) throw new Error(`Incomplete V5 building-order telemetry for ${label}`);
        if (
            event.selectedBuildingVisible === true &&
            event.selectedBuildingOrderMode !== "attack_visible_building"
        ) throw new Error(`Visible V5 building did not receive direct attack for ${label}`);
        if (
            event.selectedBuildingVisible === false &&
            event.selectedBuildingObservedBy === "public_complete_state" &&
            event.selectedBuildingOrderMode !== "attack_move_exact_unseen_coordinates"
        ) throw new Error(`Exact unseen V5 building did not receive coordinate approach for ${label}`);
        const action = matchingBuildingAction(event, actions);
        if (!action) throw new Error(`V5 building telemetry lacks a matching issued order for ${label}`);
        return { event, action };
    });
    const approaches = matched.filter(({ event }) =>
        event.selectedBuildingVisible === false &&
        event.selectedBuildingObservedBy === "public_complete_state" &&
        event.selectedBuildingOrderMode === "attack_move_exact_unseen_coordinates",
    );
    const firstApproachTickByBuilding = new Map<number, number>();
    for (const { event } of approaches) {
        const prior = firstApproachTickByBuilding.get(event.selectedBuildingId!);
        if (prior === undefined || event.tick < prior) firstApproachTickByBuilding.set(event.selectedBuildingId!, event.tick);
    }
    const handoffs = matched.filter(({ event }) => {
        if (event.selectedBuildingVisible !== true || event.selectedBuildingOrderMode !== "attack_visible_building") {
            return false;
        }
        const approachTick = firstApproachTickByBuilding.get(event.selectedBuildingId!);
        return approachTick !== undefined && event.tick > approachTick;
    });
    return {
        telemetryCount: telemetry.length,
        buildingDecisionCount: buildingEvents.length,
        exactUnseenApproachCount: approaches.length,
        visibleHandoffCount: handoffs.length,
        maximumLastPhysicalProgressTick: Math.max(0, ...telemetry.map(
            ({ lastPhysicalProgressTick }) => lastPhysicalProgressTick ?? 0,
        )),
        approachWitnesses: approaches.map(({ event, action }) => witness(event, action)),
        visibleHandoffWitnesses: handoffs.map(({ event, action }) => witness(event, action)),
    };
};

const ALLIED = new Set<Countries>([
    Countries.USA,
    Countries.KOREA,
    Countries.FRANCE,
    Countries.GERMANY,
    Countries.GREAT_BRITAIN,
]);

export const summarizeProgressCertifiedV5PopulationCoverage = (
    rows: readonly ProgressCertifiedV5CompatibilityCoverageRow[],
): ProgressCertifiedV5PopulationCoverage => {
    const validationErrors: string[] = [];
    const uniqueCells = new Set(rows.map(({ country, candidateSlot }) => `${country}|${candidateSlot}`));
    if (rows.length !== PROGRESS_CERTIFIED_V5_COMPATIBILITY_CELL_COUNT || uniqueCells.size !== rows.length) {
        validationErrors.push("V5-C3 population does not contain 18 unique country-slot cells");
    }
    const complete = rows.filter(({ firstCoverage, repeatCoverage }) =>
        firstCoverage !== null && repeatCoverage !== null,
    );
    if (complete.length !== rows.length) {
        validationErrors.push("V5-C3 population has a cell without validated first and repeat building orders");
    }
    const buildingOrderRows = complete.filter(({ firstCoverage, repeatCoverage }) =>
        firstCoverage!.buildingDecisionCount > 0 && repeatCoverage!.buildingDecisionCount > 0,
    );
    if (buildingOrderRows.length !== rows.length) {
        validationErrors.push("V5-C3 population lacks a matched building order in at least one cell");
    }
    for (const row of complete) {
        if (
            row.firstCoverage!.exactUnseenApproachCount !== row.repeatCoverage!.exactUnseenApproachCount ||
            row.firstCoverage!.visibleHandoffCount !== row.repeatCoverage!.visibleHandoffCount
        ) validationErrors.push(`V5-C3 exposure counts differ for ${row.country} slot ${row.candidateSlot}`);
    }
    const approachRows = complete.filter(({ firstCoverage }) => firstCoverage!.exactUnseenApproachCount > 0);
    const handoffRows = complete.filter(({ firstCoverage }) => firstCoverage!.visibleHandoffCount > 0);
    const approachCountries = new Set(approachRows.map(({ country }) => country));
    const approachFactions = new Set(approachRows.map(({ country }) => ALLIED.has(country) ? "Allied" : "Soviet"));
    const approachSlots = new Set(approachRows.map(({ candidateSlot }) => candidateSlot));
    if (approachRows.length < 4 || approachCountries.size < 4) {
        validationErrors.push("V5-C3 exact-unseen approach exposure is narrower than four cells and countries");
    }
    if (!approachFactions.has("Allied") || !approachFactions.has("Soviet")) {
        validationErrors.push("V5-C3 exact-unseen approach does not cover both factions");
    }
    if (!approachSlots.has(0) || !approachSlots.has(1)) {
        validationErrors.push("V5-C3 exact-unseen approach does not cover both physical slots");
    }
    if (handoffRows.length < 1) {
        validationErrors.push("V5-C3 population lacks a live exact-unseen-to-visible handoff");
    }
    return {
        cellCount: rows.length,
        buildingOrderCellCount: buildingOrderRows.length,
        exactUnseenApproachCellCount: approachRows.length,
        exactUnseenApproachCountryCount: approachCountries.size,
        exactUnseenApproachFactions: [...approachFactions].sort(),
        exactUnseenApproachSlots: [...approachSlots].sort(),
        visibleHandoffCellCount: handoffRows.length,
        validationErrors,
    };
};

const traceDigest = (trace: RunTrace, includeTelemetry: boolean): string => digest({
    actions: trace.actions,
    snapshots: trace.snapshots,
    quitAttempts: trace.quitAttempts,
    observedTicks: trace.observedTicks,
    engineFinishObservedAtTick: trace.engineFinishObservedAtTick,
    ...(includeTelemetry ? { telemetry: trace.telemetry } : {}),
});

const errorMessage = (error: unknown): string => error instanceof Error ? error.message : String(error);

const main = async (): Promise<void> => {
    const repoRoot = path.resolve(process.cwd(), "..", "..");
    const outFile = requiredPath("OUT_FILE");
    if (fs.existsSync(outFile)) throw new Error(`Refusing to overwrite ${outFile}`);
    if (!process.env.BASELINE_PACKAGE_ROOT || process.env.REQUIRE_EXTERNAL_BASELINE !== "true") {
        throw new Error("V5 compatibility requires the pinned external baseline");
    }
    const mapName = "simple-1v1-no-preview.map";
    if (sha256File(path.join(process.cwd(), "data", mapName)) !== METHOD_V5_EQUIVALENCE_MAP_SHA256) {
        throw new Error("V5 compatibility map bytes drifted");
    }
    const factory = await loadBaselineFactory(path.join(repoRoot, "packages", "chronodivide-bot"));
    const disabledPolicy = buildProgressCertifiedConversionPolicyV5({ enabled: false });
    const smokePolicy = buildProgressCertifiedV5CompatibilitySmokePolicy();
    await cdapi.init(path.join(process.cwd(), "data"));
    const rows: Array<Record<string, unknown>> = [];
    const coverageRows: ProgressCertifiedV5CompatibilityCoverageRow[] = [];
    const validationErrors: string[] = [];
    let index = 0;
    for (const country of PROGRESS_CERTIFIED_V5_COMPATIBILITY_COUNTRIES) {
        for (const candidateSlot of [0, 1] as const) {
            const requestedEngineSeed = PROGRESS_CERTIFIED_V5_COMPATIBILITY_SEED_BASE + index++;
            const common = { factory, mapName, country, candidateSlot, requestedEngineSeed };
            const direct = await run({ ...common, policy: null });
            const disabled = await run({ ...common, policy: disabledPolicy });
            const first = await run({ ...common, policy: smokePolicy });
            const repeat = await run({ ...common, policy: smokePolicy });
            const directSha256 = traceDigest(direct, false);
            const disabledSha256 = traceDigest(disabled, false);
            const firstSha256 = traceDigest(first, true);
            const repeatSha256 = traceDigest(repeat, true);
            if (directSha256 !== disabledSha256 || disabled.telemetry.length !== 0) {
                validationErrors.push(`Disabled V5 control drifted for ${country} slot ${candidateSlot}`);
            }
            if (firstSha256 !== repeatSha256) {
                validationErrors.push(`Same-seed V5 traces differ for ${country} slot ${candidateSlot}`);
            }
            if (digest(first.actions) === digest(direct.actions)) {
                validationErrors.push(`V5 did not change commands for ${country} slot ${candidateSlot}`);
            }
            let firstCoverage: ProgressCertifiedV5CompatibilityExposure | null = null;
            let repeatCoverage: ProgressCertifiedV5CompatibilityExposure | null = null;
            try {
                firstCoverage = validateProgressCertifiedV5CompatibilityExposure(
                    first.telemetry, first.actions, country, candidateSlot,
                );
            } catch (error) {
                validationErrors.push(`First ${errorMessage(error)}`);
            }
            try {
                repeatCoverage = validateProgressCertifiedV5CompatibilityExposure(
                    repeat.telemetry, repeat.actions, country, candidateSlot,
                );
            } catch (error) {
                validationErrors.push(`Repeat ${errorMessage(error)}`);
            }
            rows.push({
                country,
                candidateSlot,
                requestedEngineSeed,
                directSha256,
                disabledSha256,
                disabledEquivalent: directSha256 === disabledSha256 && disabled.telemetry.length === 0,
                firstSha256,
                repeatSha256,
                deterministic: firstSha256 === repeatSha256,
                enabledChangedCommands: digest(first.actions) !== digest(direct.actions),
                firstActionTraceSha256: digest(first.actions),
                firstTelemetrySha256: digest(first.telemetry),
                firstBoundary: {
                    observedTicks: first.observedTicks,
                    engineFinishObservedAtTick: first.engineFinishObservedAtTick,
                },
                repeatBoundary: {
                    observedTicks: repeat.observedTicks,
                    engineFinishObservedAtTick: repeat.engineFinishObservedAtTick,
                },
                suppressedQuitAttempts: { first: first.quitAttempts, repeat: repeat.quitAttempts },
                firstDiagnostic: summarizeProgressCertifiedV5CompatibilityDiagnostic(
                    first.telemetry, first.actions,
                ),
                repeatDiagnostic: summarizeProgressCertifiedV5CompatibilityDiagnostic(
                    repeat.telemetry, repeat.actions,
                ),
                firstCoverage,
                repeatCoverage,
                outcomeInspected: false,
            });
            coverageRows.push({ country, candidateSlot, firstCoverage, repeatCoverage });
        }
    }
    const populationCoverage = summarizeProgressCertifiedV5PopulationCoverage(coverageRows);
    validationErrors.push(...populationCoverage.validationErrors);
    const manifest = createExperimentManifest({
        runId: `progress-certified-v5-compatibility-${process.env.SLURM_JOB_ID ?? "local"}`,
        mixDir: path.join(process.cwd(), "data"),
        maps: [mapName],
        effectiveConfig: {
            purpose: "outcome-free-v5-exact-unseen-approach-and-visible-handoff",
            disabledPolicyId: progressCertifiedConversionPolicyV5Sha256(disabledPolicy),
            smokePolicyId: progressCertifiedConversionPolicyV5Sha256(smokePolicy),
            countries: PROGRESS_CERTIFIED_V5_COMPATIBILITY_COUNTRIES,
            reciprocalSlots: [0, 1],
            runsPerCell: PROGRESS_CERTIFIED_V5_COMPATIBILITY_RUNS_PER_CELL,
            maxTicks: PROGRESS_CERTIFIED_V5_COMPATIBILITY_MAX_TICKS,
            engineFinishAccess: "predicate-only-technical-censoring",
            outcomeInspection: false,
        },
        baseline: factory.descriptor,
        gameSeedBase: PROGRESS_CERTIFIED_V5_COMPATIBILITY_SEED_BASE,
    });
    if (
        manifest.scheduler.account !== "pi_jss233" || manifest.source.gitBranch !== "main" ||
        manifest.source.trackedDirty !== false || manifest.software.baseline.kind !== "external-package" ||
        manifest.software.baseline.trackedDirty !== false ||
        rows.length !== PROGRESS_CERTIFIED_V5_COMPATIBILITY_CELL_COUNT
    ) validationErrors.push("V5 compatibility provenance or coverage failed");
    const passed = validationErrors.length === 0;
    const output = {
        schemaVersion: 3,
        gateRevision: PROGRESS_CERTIFIED_V5_COMPATIBILITY_GATE_REVISION,
        status: passed
            ? "PASS_OUTCOME_FREE_PROGRESS_CERTIFIED_V5_COMPATIBILITY_V3"
            : "FAIL_OUTCOME_FREE_PROGRESS_CERTIFIED_V5_COMPATIBILITY_V3",
        generatedAt: new Date().toISOString(),
        passed,
        outcomeFree: true,
        sourceGitCommit: manifest.source.gitCommit,
        scheduler: manifest.scheduler,
        externalBaseline: manifest.software.baseline,
        disabledPolicyId: progressCertifiedConversionPolicyV5Sha256(disabledPolicy),
        smokePolicyId: progressCertifiedConversionPolicyV5Sha256(smokePolicy),
        countryCount: PROGRESS_CERTIFIED_V5_COMPATIBILITY_COUNTRIES.length,
        reciprocalSlotCount: 2,
        gameCount: rows.length * PROGRESS_CERTIFIED_V5_COMPATIBILITY_RUNS_PER_CELL,
        maxTicks: PROGRESS_CERTIFIED_V5_COMPATIBILITY_MAX_TICKS,
        validationErrors,
        populationCoverage,
        rows,
        outcomeFieldsEmitted: [],
    };
    fs.mkdirSync(path.dirname(outFile), { recursive: true, mode: 0o700 });
    fs.writeFileSync(outFile, JSON.stringify(output, null, 2) + "\n", { flag: "wx", mode: 0o600 });
    console.log(JSON.stringify({
        outFile,
        sha256: sha256File(outFile),
        status: output.status,
        gameCount: output.gameCount,
        validationErrorCount: validationErrors.length,
    }));
    if (!passed) throw new Error("V5 outcome-free compatibility gate failed; preserved complete artifact");
};

const invoked = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (import.meta.url === invoked) main().catch((error) => { console.error(error); process.exitCode = 1; });
