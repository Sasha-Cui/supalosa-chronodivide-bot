import crypto from "node:crypto";
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
import { sha256File } from "./methodV5PlanRunner.js";
import {
    FINISH_ADVANTAGE_COMPOSITE_COMPATIBILITY_AMENDMENT_2_SHA256,
    FINISH_ADVANTAGE_COMPOSITE_COMPATIBILITY_AMENDMENT_3_SHA256,
    FINISH_ADVANTAGE_COMPOSITE_COMPATIBILITY_AMENDMENT_4_SHA256,
    FINISH_ADVANTAGE_COMPOSITE_COMPATIBILITY_AMENDMENT_5_SHA256,
    FINISH_ADVANTAGE_COMPOSITE_COMPATIBILITY_AMENDMENT_SHA256,
    FINISH_ADVANTAGE_COMPOSITE_COMPATIBILITY_CELL_COUNT,
    FINISH_ADVANTAGE_COMPOSITE_COMPATIBILITY_COUNTRIES,
    FINISH_ADVANTAGE_COMPOSITE_COMPATIBILITY_MAP_NAME,
    FINISH_ADVANTAGE_COMPOSITE_COMPATIBILITY_MAP_SHA256,
    FINISH_ADVANTAGE_COMPOSITE_COMPATIBILITY_MAX_TICKS,
    FINISH_ADVANTAGE_COMPOSITE_COMPATIBILITY_PROTOCOL_SHA256,
    FINISH_ADVANTAGE_COMPOSITE_COMPATIBILITY_RUNS_PER_CELL,
    FINISH_ADVANTAGE_COMPOSITE_COMPATIBILITY_SEED_BASE,
    FinishAdvantageCompositeCompatibilityCell,
    selectFinishAdvantageTechnicalGatePolicy,
    summarizeFinishAdvantageCompositeCompatibility,
    validateFinishAdvantageCompatibilityTelemetry,
    validateTerminalBaseRaceCompatibilityTelemetry,
} from "./finishAdvantageCompositeCompatibilityGate.js";
import { createFinishAdvantageCompositeCandidate } from "./finishAdvantageCompositeCandidate.js";
import { buildFinishAdvantagePolicy } from "./finishAdvantagePolicy.js";
import { FinishAdvantageTelemetry } from "./finishAdvantageStrategy.js";
import {
    buildProgressCertifiedConversionPolicyV5,
    progressCertifiedConversionPolicyV5Sha256,
} from "./progressCertifiedConversionPolicyV5.js";
import {
    ProgressCertifiedV5CompatibilityExposure,
    validateProgressCertifiedV5CompatibilityExposure,
} from "./progressCertifiedV5CompatibilityGate.js";
import { TerminalObjectiveTelemetry } from "./terminalObjectiveStrategy.js";
import { TerminalBaseRaceMode } from "./terminalBaseRaceGuard.js";

type Factory = Awaited<ReturnType<typeof loadBaselineFactory>>;
type ActionTraceRow = { tick: number; args: unknown[] };
type Snapshot = {
    tick: number;
    credits: number;
    units: Array<{ id: number; name: string; x: number; y: number; hitPoints: number }>;
    queues: Array<{ queue: number; payload: unknown }>;
};
type RunTrace = {
    terminalBaseRaceMode: TerminalBaseRaceMode;
    actions: ActionTraceRow[];
    snapshots: Snapshot[];
    quitAttempts: { candidate: number; baseline: number };
    v5Telemetry: TerminalObjectiveTelemetry[];
    finishTelemetry: FinishAdvantageTelemetry[];
    executedUpdateCount: number;
};

const requiredPath = (name: string): string => {
    const value = process.env[name];
    if (!value) throw new Error(`${name} is required`);
    return path.resolve(value);
};
const requiredSha256 = (name: string): string => {
    const value = process.env[name];
    if (!value || !/^[0-9a-f]{64}$/.test(value)) throw new Error(`${name} is invalid`);
    return value;
};
const digest = (value: unknown): string => crypto.createHash("sha256")
    .update(JSON.stringify(value)).digest("hex");
const errorMessage = (error: unknown): string => error instanceof Error ? error.message : String(error);

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
        ].map((queue) => ({ queue, payload: bot.lastPlayerProduction!.getQueueData(queue) })),
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
    construction: "direct" | "disabled" | "enabled";
    v5Policy: ReturnType<typeof buildProgressCertifiedConversionPolicyV5>;
    finishPolicy: ReturnType<typeof buildFinishAdvantagePolicy>;
}): Promise<RunTrace> => {
    const { factory, mapName, country, candidateSlot, requestedEngineSeed, construction } = args;
    const v5Telemetry: TerminalObjectiveTelemetry[] = [];
    const finishTelemetry: FinishAdvantageTelemetry[] = [];
    const terminalBaseRaceMode: TerminalBaseRaceMode = construction === "enabled"
        ? "strict_literal_endpoint_base_race"
        : "legacy_v5_ignore_own_base_loss";
    const candidate = construction === "direct"
        ? factory.create(`CompositeCandidate_${country}_${candidateSlot}`, country)
        : createFinishAdvantageCompositeCandidate(
            factory,
            `CompositeCandidate_${country}_${candidateSlot}`,
            country,
            construction === "enabled" ? args.v5Policy : { ...args.v5Policy, enabled: false },
            construction === "enabled" ? args.finishPolicy : { ...args.finishPolicy, enabled: false },
            { terminalBaseRaceMode },
            {
                v5: (event) => v5Telemetry.push(event),
                finishAdvantage: (event) => finishTelemetry.push(event),
            },
        );
    const baseline = factory.create(`CompositeBaseline_${country}_${candidateSlot}`, country);
    const actions: ActionTraceRow[] = [];
    const candidateQuit = { attempts: 0 };
    const baselineQuit = { attempts: 0 };
    installActionTrace(candidate, actions, candidateQuit);
    installActionTrace(baseline, [], baselineQuit);
    const snapshots: Snapshot[] = [];
    let executedUpdateCount = 0;
    await withSeededOfflineGame(
        cdapi,
        settings(mapName, candidate, baseline, candidateSlot),
        requestedEngineSeed,
        [{ agent: candidate, identity: "candidate" }, { agent: baseline, identity: "baseline" }],
        async (game) => {
            for (let update = 1; update <= FINISH_ADVANTAGE_COMPOSITE_COMPATIBILITY_MAX_TICKS; update += 1) {
                if (game.isFinished()) break;
                await game.update();
                executedUpdateCount = update;
                if (update % 300 === 0) snapshots.push(snapshot(candidate, update));
                if (game.isFinished()) break;
            }
        },
    );
    return {
        terminalBaseRaceMode,
        actions,
        snapshots,
        quitAttempts: { candidate: candidateQuit.attempts, baseline: baselineQuit.attempts },
        v5Telemetry,
        finishTelemetry,
        executedUpdateCount,
    };
};

const sameIds = (actual: unknown, expected: readonly number[]): boolean =>
    Array.isArray(actual) && actual.every((id) => Number.isSafeInteger(id)) &&
    actual.slice().sort((left, right) => Number(left) - Number(right)).join(",") ===
        expected.slice().sort((left, right) => left - right).join(",");

export const matchingFinishAdvantageAction = (
    event: FinishAdvantageTelemetry,
    actions: readonly ActionTraceRow[],
): ActionTraceRow | null => actions.find(({ tick, args }) => {
    if (tick !== event.tick || !sameIds(args[0], event.selectedAttackerIds)) return false;
    if (event.issuedOrder === "attack_visible_building") {
        return args[1] === OrderType.Attack && args[2] === event.targetBuildingId;
    }
    if (event.issuedOrder === "approach_exact_unseen_building") {
        return args[1] === OrderType.AttackMove && args[2] === event.targetBuildingCoordinates?.x &&
            args[3] === event.targetBuildingCoordinates?.y;
    }
    if (event.issuedOrder === "attack_visible_blocker") {
        return args[1] === OrderType.Attack && args[2] === event.blockerId;
    }
    if (event.issuedOrder === "approach_exact_unseen_blocker") {
        return args[1] === OrderType.AttackMove && args[2] === event.blockerCoordinates?.x &&
            args[3] === event.blockerCoordinates?.y;
    }
    return false;
}) ?? null;

const traceDigest = (trace: RunTrace, includeTelemetry: boolean): string => digest({
    terminalBaseRaceMode: trace.terminalBaseRaceMode,
    actions: trace.actions,
    snapshots: trace.snapshots,
    quitAttempts: trace.quitAttempts,
    executedUpdateCount: trace.executedUpdateCount,
    ...(includeTelemetry ? {
        v5Telemetry: trace.v5Telemetry,
        finishTelemetry: trace.finishTelemetry,
    } : {}),
});

const validateEnabledRun = (
    trace: RunTrace,
    finishPolicy: ReturnType<typeof buildFinishAdvantagePolicy>,
    country: Countries,
    candidateSlot: 0 | 1,
) => {
    const validationErrors: string[] = [];
    validationErrors.push(...validateTerminalBaseRaceCompatibilityTelemetry(
        trace.v5Telemetry,
        trace.terminalBaseRaceMode,
        buildProgressCertifiedConversionPolicyV5().directCompletionSafetyMarginTicks,
    ));
    for (const [index, event] of trace.finishTelemetry.entries()) {
        validationErrors.push(...validateFinishAdvantageCompatibilityTelemetry(event, finishPolicy)
            .map((error) => `finish telemetry ${index}: ${error}`));
        if (event.issuedOrder !== "none" && !matchingFinishAdvantageAction(event, trace.actions)) {
            validationErrors.push(`finish telemetry ${index} lacks a matching same-tick action`);
        }
    }
    for (const [index, event] of trace.v5Telemetry.entries()) {
        if (
            event.schemaVersion !== 4 || event.mechanism !== "progress_certified_terminal_conversion" ||
            event.informationBoundary !== "public_complete_state"
        ) validationErrors.push(`V5 telemetry ${index} identity drifted`);
        if (
            (event.selectedAttackerIds?.length ?? 0) > 0 &&
            event.exactEnemyBuildingCount !== 1
        ) validationErrors.push(`V5 telemetry ${index} acted outside the exact final-building state`);
    }
    let v5Coverage: ProgressCertifiedV5CompatibilityExposure | null = null;
    const hasV5BuildingOrder = trace.v5Telemetry.some(({ decisionKind }) =>
        decisionKind === "building_strike" || decisionKind === "terminal_candidate_strike",
    );
    if (hasV5BuildingOrder) {
        try {
            v5Coverage = validateProgressCertifiedV5CompatibilityExposure(
                trace.v5Telemetry, trace.actions, country, candidateSlot,
            );
        } catch (error) {
            validationErrors.push(`V5 coverage: ${errorMessage(error)}`);
        }
    }
    const finishOrders = trace.finishTelemetry.filter(({ issuedOrder }) => issuedOrder !== "none");
    const approachTick = new Map<number, number>();
    for (const event of trace.finishTelemetry) {
        if (event.issuedOrder === "approach_exact_unseen_building" && event.targetBuildingId !== null) {
            const prior = approachTick.get(event.targetBuildingId);
            if (prior === undefined || event.tick < prior) approachTick.set(event.targetBuildingId, event.tick);
        }
    }
    const finishVisibleHandoff = trace.finishTelemetry.some((event) =>
        event.issuedOrder === "attack_visible_building" && event.targetBuildingId !== null &&
        (approachTick.get(event.targetBuildingId) ?? Number.POSITIVE_INFINITY) < event.tick,
    );
    return {
        validationErrors,
        finishBuildingOrderWitness: finishOrders.some(({ issuedOrder }) =>
            issuedOrder === "attack_visible_building" || issuedOrder === "approach_exact_unseen_building",
        ),
        irreversibleOrderWitness: finishOrders.some(({ irreversibleCertificate }) => irreversibleCertificate),
        surplusOrderWitness: finishOrders.some(({ irreversibleCertificate }) => !irreversibleCertificate),
        protectedSeparationWitness: finishOrders.some((event) =>
            event.protectedEligibleIds.length + event.additionalReserveIds.length > 0,
        ),
        exactUnseenApproachWitness: finishOrders.some(({ issuedOrder }) =>
            issuedOrder === "approach_exact_unseen_building",
        ) || (v5Coverage?.exactUnseenApproachCount ?? 0) > 0,
        visibleHandoffWitness: finishVisibleHandoff || (v5Coverage?.visibleHandoffCount ?? 0) > 0,
        finishTelemetryCount: trace.finishTelemetry.length,
        v5TelemetryCount: trace.v5Telemetry.length,
        finishOrderCount: finishOrders.length,
        v5Coverage,
        terminalBaseRaceMode: trace.terminalBaseRaceMode,
    };
};

const main = async (): Promise<void> => {
    const repoRoot = path.resolve(process.cwd(), "..", "..");
    const outFile = requiredPath("OUT_FILE");
    const stateAuditFile = requiredPath("STATE_AUDIT_FILE");
    const stateAuditSha256 = requiredSha256("STATE_AUDIT_SHA256");
    const protocolPath = requiredPath("COMPOSITE_GATE_PROTOCOL");
    const amendmentPath = requiredPath("COMPOSITE_GATE_AMENDMENT_1");
    const amendment2Path = requiredPath("COMPOSITE_GATE_AMENDMENT_2");
    const amendment3Path = requiredPath("COMPOSITE_GATE_AMENDMENT_3");
    const amendment4Path = requiredPath("COMPOSITE_GATE_AMENDMENT_4");
    const amendment5Path = requiredPath("COMPOSITE_GATE_AMENDMENT_5");
    if (fs.existsSync(outFile)) throw new Error(`Refusing to overwrite ${outFile}`);
    if (process.env.SLURM_JOB_ACCOUNT !== "pi_jss233") {
        throw new Error("Composite compatibility gate requires Slurm account pi_jss233");
    }
    if (!process.env.BASELINE_PACKAGE_ROOT || process.env.REQUIRE_EXTERNAL_BASELINE !== "true") {
        throw new Error("Composite compatibility gate requires the pinned external baseline");
    }
    if (
        sha256File(stateAuditFile) !== stateAuditSha256 ||
        sha256File(protocolPath) !== FINISH_ADVANTAGE_COMPOSITE_COMPATIBILITY_PROTOCOL_SHA256 ||
        sha256File(amendmentPath) !== FINISH_ADVANTAGE_COMPOSITE_COMPATIBILITY_AMENDMENT_SHA256 ||
        sha256File(amendment2Path) !== FINISH_ADVANTAGE_COMPOSITE_COMPATIBILITY_AMENDMENT_2_SHA256 ||
        sha256File(amendment3Path) !== FINISH_ADVANTAGE_COMPOSITE_COMPATIBILITY_AMENDMENT_3_SHA256 ||
        sha256File(amendment4Path) !== FINISH_ADVANTAGE_COMPOSITE_COMPATIBILITY_AMENDMENT_4_SHA256 ||
        sha256File(amendment5Path) !== FINISH_ADVANTAGE_COMPOSITE_COMPATIBILITY_AMENDMENT_5_SHA256
    ) throw new Error("Composite compatibility evidence commitment drifted");
    const stateAudit = JSON.parse(fs.readFileSync(stateAuditFile, "utf8")) as unknown;
    const selection = selectFinishAdvantageTechnicalGatePolicy(stateAudit, stateAuditSha256);
    const stateAuditRecord = stateAudit as Record<string, unknown>;
    const irreversibleExposedCellCount = Number(stateAuditRecord.irreversibleExposedCellCount);
    if (!Number.isSafeInteger(irreversibleExposedCellCount) || irreversibleExposedCellCount < 0) {
        throw new Error("State-audit irreversible exposure count is invalid");
    }
    const mapName = FINISH_ADVANTAGE_COMPOSITE_COMPATIBILITY_MAP_NAME;
    if (sha256File(path.join(process.cwd(), "data", mapName)) !==
        FINISH_ADVANTAGE_COMPOSITE_COMPATIBILITY_MAP_SHA256) {
        throw new Error("Composite compatibility map bytes drifted");
    }
    const factory = await loadBaselineFactory(path.join(repoRoot, "packages", "chronodivide-bot"));
    const v5Policy = buildProgressCertifiedConversionPolicyV5();
    const finishPolicy = selection.policy;
    await cdapi.init(path.join(process.cwd(), "data"));
    const rows: Array<Record<string, unknown>> = [];
    const coverageRows: FinishAdvantageCompositeCompatibilityCell[] = [];
    let cellIndex = 0;
    for (const country of FINISH_ADVANTAGE_COMPOSITE_COMPATIBILITY_COUNTRIES) {
        for (const candidateSlot of [0, 1] as const) {
            const requestedEngineSeed = FINISH_ADVANTAGE_COMPOSITE_COMPATIBILITY_SEED_BASE + cellIndex++;
            const common = { factory, mapName, country, candidateSlot, requestedEngineSeed, v5Policy, finishPolicy };
            const direct = await run({ ...common, construction: "direct" });
            const disabled = await run({ ...common, construction: "disabled" });
            const first = await run({ ...common, construction: "enabled" });
            const repeat = await run({ ...common, construction: "enabled" });
            const disabledEquivalent = traceDigest(direct, false) === traceDigest(disabled, false) &&
                disabled.v5Telemetry.length === 0 && disabled.finishTelemetry.length === 0;
            const deterministic = traceDigest(first, true) === traceDigest(repeat, true);
            const firstValidation = validateEnabledRun(first, finishPolicy, country, candidateSlot);
            const repeatValidation = validateEnabledRun(repeat, finishPolicy, country, candidateSlot);
            const validationErrors = [
                ...firstValidation.validationErrors.map((error) => `first ${error}`),
                ...repeatValidation.validationErrors.map((error) => `repeat ${error}`),
            ];
            const coverage: FinishAdvantageCompositeCompatibilityCell = {
                country,
                candidateSlot,
                disabledEquivalent,
                deterministic,
                validationErrors,
                finishBuildingOrderWitness: firstValidation.finishBuildingOrderWitness &&
                    repeatValidation.finishBuildingOrderWitness,
                irreversibleOrderWitness: firstValidation.irreversibleOrderWitness &&
                    repeatValidation.irreversibleOrderWitness,
                surplusOrderWitness: firstValidation.surplusOrderWitness && repeatValidation.surplusOrderWitness,
                protectedSeparationWitness: firstValidation.protectedSeparationWitness &&
                    repeatValidation.protectedSeparationWitness,
                exactUnseenApproachWitness: firstValidation.exactUnseenApproachWitness &&
                    repeatValidation.exactUnseenApproachWitness,
                visibleHandoffWitness: firstValidation.visibleHandoffWitness &&
                    repeatValidation.visibleHandoffWitness,
                terminalBaseRaceMode: firstValidation.terminalBaseRaceMode,
            };
            coverageRows.push(coverage);
            rows.push({
                country,
                candidateSlot,
                requestedEngineSeed,
                directTraceSha256: traceDigest(direct, false),
                disabledTraceSha256: traceDigest(disabled, false),
                disabledEquivalent,
                firstTraceSha256: traceDigest(first, true),
                repeatTraceSha256: traceDigest(repeat, true),
                deterministic,
                first: firstValidation,
                repeat: repeatValidation,
                validationErrors,
                competitiveOutcomeInspected: false,
            });
        }
    }
    const population = summarizeFinishAdvantageCompositeCompatibility(
        coverageRows, finishPolicy.multiBuildingMode, irreversibleExposedCellCount,
    );
    const manifest = createExperimentManifest({
        runId: `finish-advantage-composite-compatibility-${process.env.SLURM_JOB_ID ?? "local"}`,
        mixDir: path.join(process.cwd(), "data"),
        maps: [mapName],
        effectiveConfig: {
            purpose: "outcome-free-finish-advantage-composite-compatibility",
            countries: FINISH_ADVANTAGE_COMPOSITE_COMPATIBILITY_COUNTRIES,
            reciprocalSlots: [0, 1],
            runsPerCell: FINISH_ADVANTAGE_COMPOSITE_COMPATIBILITY_RUNS_PER_CELL,
            maxTicks: FINISH_ADVANTAGE_COMPOSITE_COMPATIBILITY_MAX_TICKS,
            stateAuditSha256,
            protocolSha256: FINISH_ADVANTAGE_COMPOSITE_COMPATIBILITY_PROTOCOL_SHA256,
            amendmentSha256: FINISH_ADVANTAGE_COMPOSITE_COMPATIBILITY_AMENDMENT_SHA256,
            amendment2Sha256: FINISH_ADVANTAGE_COMPOSITE_COMPATIBILITY_AMENDMENT_2_SHA256,
            amendment3Sha256: FINISH_ADVANTAGE_COMPOSITE_COMPATIBILITY_AMENDMENT_3_SHA256,
            amendment4Sha256: FINISH_ADVANTAGE_COMPOSITE_COMPATIBILITY_AMENDMENT_4_SHA256,
            amendment5Sha256: FINISH_ADVANTAGE_COMPOSITE_COMPATIBILITY_AMENDMENT_5_SHA256,
            diagnosticMapName: FINISH_ADVANTAGE_COMPOSITE_COMPATIBILITY_MAP_NAME,
            diagnosticMapSha256: FINISH_ADVANTAGE_COMPOSITE_COMPATIBILITY_MAP_SHA256,
            terminalBaseRaceMode: "strict_literal_endpoint_base_race",
            selectedMode: selection.selectedMode,
            selectedMargin: selection.selectedMargin,
            selectedMargins: selection.selectedMargins,
            v5PolicySha256: progressCertifiedConversionPolicyV5Sha256(v5Policy),
            finishPolicySha256: digest(finishPolicy),
            outcomeInspection: false,
        },
        baseline: factory.descriptor,
        gameSeedBase: FINISH_ADVANTAGE_COMPOSITE_COMPATIBILITY_SEED_BASE,
    });
    const validationErrors = population.validationErrors.slice();
    if (
        manifest.scheduler.account !== "pi_jss233" || manifest.source.gitBranch !== "main" ||
        manifest.source.trackedDirty !== false || manifest.software.baseline.kind !== "external-package" ||
        manifest.software.baseline.trackedDirty !== false ||
        rows.length !== FINISH_ADVANTAGE_COMPOSITE_COMPATIBILITY_CELL_COUNT
    ) validationErrors.push("composite compatibility provenance or coverage failed");
    const passed = validationErrors.length === 0;
    const output = {
        schemaVersion: 2,
        kind: "finish-advantage-outcome-free-composite-compatibility-gate",
        status: passed ? "PASS_OUTCOME_FREE_COMPOSITE_COMPATIBILITY" :
            "FAIL_OUTCOME_FREE_COMPOSITE_COMPATIBILITY",
        generatedAt: new Date().toISOString(),
        passed,
        outcomeFree: true,
        sourceGitCommit: manifest.source.gitCommit,
        scheduler: manifest.scheduler,
        externalBaseline: manifest.software.baseline,
        stateAuditFile,
        stateAuditSha256,
        protocolPath,
        protocolSha256: FINISH_ADVANTAGE_COMPOSITE_COMPATIBILITY_PROTOCOL_SHA256,
        amendmentPath,
        amendmentSha256: FINISH_ADVANTAGE_COMPOSITE_COMPATIBILITY_AMENDMENT_SHA256,
        amendment2Path,
        amendment2Sha256: FINISH_ADVANTAGE_COMPOSITE_COMPATIBILITY_AMENDMENT_2_SHA256,
        amendment3Path,
        amendment3Sha256: FINISH_ADVANTAGE_COMPOSITE_COMPATIBILITY_AMENDMENT_3_SHA256,
        amendment4Path,
        amendment4Sha256: FINISH_ADVANTAGE_COMPOSITE_COMPATIBILITY_AMENDMENT_4_SHA256,
        amendment5Path,
        amendment5Sha256: FINISH_ADVANTAGE_COMPOSITE_COMPATIBILITY_AMENDMENT_5_SHA256,
        diagnosticMapName: FINISH_ADVANTAGE_COMPOSITE_COMPATIBILITY_MAP_NAME,
        diagnosticMapSha256: FINISH_ADVANTAGE_COMPOSITE_COMPATIBILITY_MAP_SHA256,
        terminalBaseRaceMode: "strict_literal_endpoint_base_race",
        selectedMode: selection.selectedMode,
        selectedMargin: selection.selectedMargin,
        selectedMargins: selection.selectedMargins,
        v5PolicySha256: progressCertifiedConversionPolicyV5Sha256(v5Policy),
        finishPolicySha256: digest(finishPolicy),
        countryCount: FINISH_ADVANTAGE_COMPOSITE_COMPATIBILITY_COUNTRIES.length,
        reciprocalSlotCount: 2,
        gameCount: rows.length * FINISH_ADVANTAGE_COMPOSITE_COMPATIBILITY_RUNS_PER_CELL,
        maxTicks: FINISH_ADVANTAGE_COMPOSITE_COMPATIBILITY_MAX_TICKS,
        population,
        validationErrors,
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
    if (!passed) throw new Error("Finish-advantage composite compatibility gate failed; artifact preserved");
};

const invoked = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (import.meta.url === invoked) main().catch((error) => { console.error(error); process.exitCode = 1; });
