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
    ProgressCertifiedConversionPolicy,
    buildProgressCertifiedConversionPolicy,
    progressCertifiedConversionPolicySha256,
} from "./progressCertifiedConversionPolicy.js";
import {
    TerminalObjectiveTelemetry,
    createTerminalObjectiveCandidate,
} from "./terminalObjectiveStrategy.js";

export const PROGRESS_CERTIFIED_COMPATIBILITY_MAX_TICKS = 5_400 as const;
export const PROGRESS_CERTIFIED_COMPATIBILITY_ENGINE_SEED_BASE = 4_210_000_000 as const;
export const PROGRESS_CERTIFIED_COMPATIBILITY_RUNS_PER_COUNTRY_SLOT = 4 as const;

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
    telemetry: TerminalObjectiveTelemetry[];
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
    policy: ProgressCertifiedConversionPolicy | null;
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
            for (let tick = 1; tick <= PROGRESS_CERTIFIED_COMPATIBILITY_MAX_TICKS; tick += 1) {
                if (game.isFinished()) throw new Error(`Compatibility game ended before tick cap at ${tick}`);
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

export const validateProgressCertifiedCompatibilityExposure = (
    telemetry: readonly TerminalObjectiveTelemetry[],
    country: Countries,
    slot: 0 | 1,
): void => {
    const decisions = telemetry.filter(({ event }) => event === "decision" || event === "search_orders");
    const actionable = decisions.filter(({ selectedAttackerIds }) => (selectedAttackerIds?.length ?? 0) > 0);
    if (decisions.length === 0 || actionable.length === 0) {
        throw new Error(`No actionable progress-certified decision for ${country} slot ${slot}`);
    }
    if (!actionable.some(({ decisionKind }) => [
        "building_strike", "terminal_candidate_strike", "blocker_clear", "search",
    ].includes(String(decisionKind)))) {
        throw new Error(`No objective-directed progress-certified action for ${country} slot ${slot}`);
    }
    for (const event of decisions) {
        if (
            event.schemaVersion !== 3 ||
            event.mechanism !== "progress_certified_terminal_conversion" ||
            event.informationBoundary !== "public_complete_state"
        ) throw new Error(`Progress-certified telemetry identity drifted for ${country} slot ${slot}`);
        if (
            event.lastPhysicalProgressTick !== undefined &&
            (!Number.isSafeInteger(event.lastPhysicalProgressTick) || event.lastPhysicalProgressTick > event.tick)
        ) throw new Error(`Invalid physical-progress clock for ${country} slot ${slot}`);
        if (
            event.physicalNoProgressTicks !== undefined &&
            (!Number.isSafeInteger(event.physicalNoProgressTicks) || event.physicalNoProgressTicks < 0)
        ) throw new Error(`Invalid physical no-progress interval for ${country} slot ${slot}`);
        if (
            event.decisionKind === "predecessor_fallback" &&
            event.progressDeadlineExpired !== "blocker" && event.progressDeadlineExpired !== "building"
        ) {
            throw new Error(`Unexplained predecessor fallback for ${country} slot ${slot}`);
        }
        if (event.eligibleAttackerCount !== undefined && event.reservedCombatantCount !== undefined) {
            const configuredReserve = event.exactEnemyBuildingCount === 1 ? 0 : 2;
            if (event.reservedCombatantCount !== Math.min(configuredReserve, event.eligibleAttackerCount)) {
                throw new Error(`Dynamic reserve size drifted for ${country} slot ${slot}`);
            }
        }
        if (event.exactEnemyBuildingCount === 1 && event.terminalReserveReleased !== true) {
            throw new Error(`Terminal reserve was not released for ${country} slot ${slot}`);
        }
        const selected = new Set(event.selectedAttackerIds ?? []);
        if ((event.reservedCombatantIds ?? []).some((id) => selected.has(id))) {
            throw new Error(`Reserved combatant was assigned for ${country} slot ${slot}`);
        }
    }
};

const main = async (): Promise<void> => {
    const repoRoot = path.resolve(process.cwd(), "..", "..");
    const outFile = requiredPath("OUT_FILE");
    if (fs.existsSync(outFile)) throw new Error(`Refusing to overwrite ${outFile}`);
    if (!process.env.BASELINE_PACKAGE_ROOT || process.env.REQUIRE_EXTERNAL_BASELINE !== "true") {
        throw new Error("Progress-certified compatibility requires the pinned external baseline");
    }
    const mapName = "simple-1v1-no-preview.map";
    if (sha256File(path.join(process.cwd(), "data", mapName)) !== METHOD_V5_EQUIVALENCE_MAP_SHA256) {
        throw new Error("Progress-certified compatibility map bytes drifted");
    }
    const factory = await loadBaselineFactory(path.join(repoRoot, "packages", "chronodivide-bot"));
    const disabledPolicy = buildProgressCertifiedConversionPolicy({ enabled: false });
    const smokePolicy = buildProgressCertifiedConversionPolicy({
        conversionScope: "guarded_low_building_count",
        activationBuildingCount: 100,
        activationMinTick: 0,
        requireObservedCountAboveThreshold: false,
        minTick: 0,
    });
    const rows: Array<Record<string, unknown>> = [];
    await cdapi.init(path.join(process.cwd(), "data"));
    let index = 0;
    for (const country of Object.values(Countries)) for (const candidateSlot of [0, 1] as const) {
        const requestedEngineSeed = derivePairedEngineSeed(
            PROGRESS_CERTIFIED_COMPATIBILITY_ENGINE_SEED_BASE,
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
        if (directDigest !== disabledDigest) {
            throw new Error(`Disabled progress-certified control drifted for ${country} slot ${candidateSlot}`);
        }
        if (disabled.telemetry.length !== 0) {
            throw new Error(`Disabled progress-certified control emitted telemetry for ${country} slot ${candidateSlot}`);
        }
        const first = await run({
            factory, mapName, country, candidateSlot, requestedEngineSeed, policy: smokePolicy,
        });
        const repeat = await run({
            factory, mapName, country, candidateSlot, requestedEngineSeed, policy: smokePolicy,
        });
        validateProgressCertifiedCompatibilityExposure(first.telemetry, country, candidateSlot);
        validateProgressCertifiedCompatibilityExposure(repeat.telemetry, country, candidateSlot);
        const firstDigest = digest({
            actions: first.actions,
            snapshots: first.snapshots,
            telemetry: first.telemetry,
        });
        const repeatDigest = digest({
            actions: repeat.actions,
            snapshots: repeat.snapshots,
            telemetry: repeat.telemetry,
        });
        if (firstDigest !== repeatDigest) {
            throw new Error(`Progress-certified trace was not deterministic for ${country} slot ${candidateSlot}`);
        }
        if (digest(first.actions) === digest(direct.actions)) {
            throw new Error(`Progress-certified overlay did not change commands for ${country} slot ${candidateSlot}`);
        }
        const quitAttempts = { direct: direct.quitAttempts, disabled: disabled.quitAttempts,
            first: first.quitAttempts, repeat: repeat.quitAttempts };
        if (Object.values(quitAttempts).some(({ candidate, baseline }) => candidate !== 0 || baseline !== 0)) {
            throw new Error(`Compatibility run attempted resignation for ${country} slot ${candidateSlot}`);
        }
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
            enabledDecisionKinds: [...new Set(first.telemetry.flatMap(({ decisionKind }) =>
                decisionKind ? [decisionKind] : [],
            ))].sort(),
            enabledProgressDeadlineKinds: [...new Set(first.telemetry.flatMap(({ progressDeadlineExpired }) =>
                progressDeadlineExpired ? [progressDeadlineExpired] : [],
            ))].sort(),
            enabledTerminalReserveReleaseObserved: first.telemetry.some(
                ({ terminalReserveReleased }) => terminalReserveReleased === true,
            ),
            enabledMaximumAssignedFraction: Math.max(0, ...first.telemetry.map(
                ({ assignedCombatantFraction }) => assignedCombatantFraction ?? 0,
            )),
            enabledMaximumEligibleAttackerCount: Math.max(0, ...first.telemetry.map(
                ({ eligibleAttackerCount }) => eligibleAttackerCount ?? 0,
            )),
            enabledMaximumCertifiedAttackerCount: Math.max(0, ...first.telemetry.map(
                ({ certifiedAttackerCount }) => certifiedAttackerCount ?? 0,
            )),
            quitAttempts,
            outcomeInspected: false,
        });
    }
    const manifest = createExperimentManifest({
        runId: `progress-certified-compatibility-${process.env.SLURM_JOB_ID ?? "local"}`,
        mixDir: path.join(process.cwd(), "data"),
        maps: [mapName],
        effectiveConfig: {
            purpose: "outcome-free-progress-certified-equivalence-determinism-and-exposure",
            disabledPolicyId: progressCertifiedConversionPolicySha256(disabledPolicy),
            smokePolicyId: progressCertifiedConversionPolicySha256(smokePolicy),
            countries: Object.values(Countries),
            reciprocalSlots: [0, 1],
            runsPerCountrySlot: PROGRESS_CERTIFIED_COMPATIBILITY_RUNS_PER_COUNTRY_SLOT,
            maxTicks: PROGRESS_CERTIFIED_COMPATIBILITY_MAX_TICKS,
            outcomeInspection: false,
        },
        baseline: factory.descriptor,
        gameSeedBase: PROGRESS_CERTIFIED_COMPATIBILITY_ENGINE_SEED_BASE,
    });
    if (
        manifest.scheduler.account !== "pi_jss233" || manifest.source.gitBranch !== "main" ||
        manifest.source.trackedDirty !== false || manifest.software.baseline.kind !== "external-package" ||
        manifest.software.baseline.trackedDirty !== false || rows.length !== 18
    ) throw new Error("Progress-certified compatibility provenance or coverage failed");
    const output = {
        schemaVersion: 1,
        status: "PASS_OUTCOME_FREE_PROGRESS_CERTIFIED_COMPATIBILITY",
        generatedAt: new Date().toISOString(),
        passed: true,
        outcomeFree: true,
        sourceGitCommit: manifest.source.gitCommit,
        scheduler: manifest.scheduler,
        externalBaseline: manifest.software.baseline,
        disabledPolicyId: progressCertifiedConversionPolicySha256(disabledPolicy),
        smokePolicyId: progressCertifiedConversionPolicySha256(smokePolicy),
        countryCount: Object.values(Countries).length,
        reciprocalSlotCount: 2,
        gameCount: rows.length * PROGRESS_CERTIFIED_COMPATIBILITY_RUNS_PER_COUNTRY_SLOT,
        maxTicks: PROGRESS_CERTIFIED_COMPATIBILITY_MAX_TICKS,
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
};

const invoked = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (import.meta.url === invoked) main().catch((error) => { console.error(error); process.exitCode = 1; });
