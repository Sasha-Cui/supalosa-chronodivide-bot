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
    ContinuousOffenseExperimentPolicy,
    buildContinuousOffenseArms,
    continuousOffenseExperimentPolicySha256,
    validateContinuousOffenseExperimentPolicy,
} from "./continuousOffenseExperimentPolicy.js";
import { createContinuousOffenseExperimentCandidate } from "./continuousOffenseEpisode.js";
import { TerminalObjectiveTelemetry } from "./terminalObjectiveStrategy.js";

// The first gate version stopped at tick 2,400, before the Allied opening had
// produced a compatible combatant. Tick 5,400 remains before the frozen macro
// attack gate at 7,200 while allowing every country to materialize its normal
// opening force; outcomes are still never read.
export const CONTINUOUS_OFFENSE_COMPATIBILITY_MAX_TICKS = 5_400 as const;
export const CONTINUOUS_OFFENSE_COMPATIBILITY_ENGINE_SEED_BASE = 4_170_000_000 as const;

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
    policy: ContinuousOffenseExperimentPolicy | null;
    directExternal: boolean;
}): Promise<RunTrace> => {
    const { factory, mapName, country, candidateSlot, requestedEngineSeed, policy, directExternal } = args;
    const telemetry: TerminalObjectiveTelemetry[] = [];
    const candidate = directExternal
        ? factory.create(`Candidate_${country}_${candidateSlot}`, country)
        : createContinuousOffenseExperimentCandidate(
            factory,
            `Candidate_${country}_${candidateSlot}`,
            country,
            policy!,
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
            for (let tick = 1; tick <= CONTINUOUS_OFFENSE_COMPATIBILITY_MAX_TICKS; tick += 1) {
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

const validateExposure = (telemetry: TerminalObjectiveTelemetry[], country: Countries, slot: 0 | 1): void => {
    const decisions = telemetry.filter(({ event }) => event === "decision" || event === "search_orders");
    const actionable = decisions.filter(({ selectedAttackerIds }) => (selectedAttackerIds?.length ?? 0) > 0);
    if (decisions.length === 0 || actionable.length === 0) {
        throw new Error(`No actionable objective decision for ${country} slot ${slot}`);
    }
    if (!actionable.some(({ decisionKind }) => [
        "building_strike", "terminal_candidate_strike", "blocker_clear", "search",
    ].includes(String(decisionKind)))) {
        throw new Error(`No objective-directed action for ${country} slot ${slot}`);
    }
    if (decisions.some(({ decisionKind }) => decisionKind === "predecessor_fallback")) {
        throw new Error(`Continuous policy fell back to its predecessor for ${country} slot ${slot}`);
    }
    for (const event of decisions) {
        if (
            event.eligibleAttackerCount !== undefined && event.reservedCombatantCount !== undefined &&
            event.reservedCombatantCount !== Math.min(2, event.eligibleAttackerCount)
        ) throw new Error(`Reserve size drifted for ${country} slot ${slot}`);
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
        throw new Error("Continuous-offense compatibility requires the pinned external baseline");
    }
    const mapName = "simple-1v1-no-preview.map";
    if (sha256File(path.join(process.cwd(), "data", mapName)) !== METHOD_V5_EQUIVALENCE_MAP_SHA256) {
        throw new Error("Continuous-offense compatibility map bytes drifted");
    }
    const factory = await loadBaselineFactory(path.join(repoRoot, "packages", "chronodivide-bot"));
    const arms = new Map(buildContinuousOffenseArms().map((arm) => [arm.armId, arm]));
    const external = arms.get("external_baseline_control")!;
    const macroControl = arms.get("macro_champion_control")!;
    const proposedBase = arms.get("macro_route_blockers_full")!;
    const smokeObjectivePolicy = {
        ...proposedBase.policy.objectivePolicy,
        activationBuildingCount: 100,
        activationMinTick: 0,
        requireObservedCountAboveThreshold: false,
        minTick: 0,
    };
    const smokePolicy = validateContinuousOffenseExperimentPolicy({
        ...proposedBase.policy,
        objectivePolicy: smokeObjectivePolicy,
    });
    const rows: Array<Record<string, unknown>> = [];
    await cdapi.init(path.join(process.cwd(), "data"));
    let index = 0;
    for (const country of Object.values(Countries)) for (const candidateSlot of [0, 1] as const) {
        const requestedEngineSeed = derivePairedEngineSeed(CONTINUOUS_OFFENSE_COMPATIBILITY_ENGINE_SEED_BASE, index++);
        const direct = await run({
            factory, mapName, country, candidateSlot, requestedEngineSeed,
            policy: null, directExternal: true,
        });
        const experimentControl = await run({
            factory, mapName, country, candidateSlot, requestedEngineSeed,
            policy: external.policy, directExternal: false,
        });
        const directDigest = digest({ actions: direct.actions, snapshots: direct.snapshots });
        const experimentControlDigest = digest({
            actions: experimentControl.actions,
            snapshots: experimentControl.snapshots,
        });
        if (directDigest !== experimentControlDigest) {
            throw new Error(`External control drifted for ${country} slot ${candidateSlot}`);
        }
        const macro = await run({
            factory, mapName, country, candidateSlot, requestedEngineSeed,
            policy: macroControl.policy, directExternal: false,
        });
        const intervention = await run({
            factory, mapName, country, candidateSlot, requestedEngineSeed,
            policy: smokePolicy, directExternal: false,
        });
        validateExposure(intervention.telemetry, country, candidateSlot);
        const macroActionDigest = digest(macro.actions);
        const interventionActionDigest = digest(intervention.actions);
        if (macroActionDigest === interventionActionDigest) {
            throw new Error(`Objective scheduler did not change commands for ${country} slot ${candidateSlot}`);
        }
        rows.push({
            country,
            candidateSlot,
            requestedEngineSeed,
            externalControlTraceSha256: experimentControlDigest,
            directExternalTraceSha256: directDigest,
            externalControlEquivalent: true,
            macroControlActionTraceSha256: macroActionDigest,
            interventionActionTraceSha256: interventionActionDigest,
            interventionChangedCommands: true,
            interventionTelemetryCount: intervention.telemetry.length,
            interventionDecisionKinds: [...new Set(intervention.telemetry.flatMap(({ decisionKind }) =>
                decisionKind ? [decisionKind] : [],
            ))].sort(),
            interventionMaximumAssignedFraction: Math.max(0, ...intervention.telemetry.map(
                ({ assignedCombatantFraction }) => assignedCombatantFraction ?? 0,
            )),
            interventionMaximumEligibleAttackerCount: Math.max(0, ...intervention.telemetry.map(
                ({ eligibleAttackerCount }) => eligibleAttackerCount ?? 0,
            )),
            interventionMaximumCertifiedAttackerCount: Math.max(0, ...intervention.telemetry.map(
                ({ certifiedAttackerCount }) => certifiedAttackerCount ?? 0,
            )),
            quitAttempts: {
                direct: direct.quitAttempts,
                experimentControl: experimentControl.quitAttempts,
                macro: macro.quitAttempts,
                intervention: intervention.quitAttempts,
            },
            outcomeInspected: false,
        });
    }
    const manifest = createExperimentManifest({
        runId: `continuous-offense-compatibility-${process.env.SLURM_JOB_ID ?? "local"}`,
        mixDir: path.join(process.cwd(), "data"),
        maps: [mapName],
        effectiveConfig: {
            purpose: "outcome-free-continuous-offense-equivalence-and-intervention-exposure",
            externalControlPolicyId: external.policyId,
            macroControlPolicyId: macroControl.policyId,
            proposedPolicyId: proposedBase.policyId,
            smokePolicyId: continuousOffenseExperimentPolicySha256(smokePolicy),
            countries: Object.values(Countries),
            reciprocalSlots: [0, 1],
            runsPerCountrySlot: 4,
            maxTicks: CONTINUOUS_OFFENSE_COMPATIBILITY_MAX_TICKS,
            outcomeInspection: false,
        },
        baseline: factory.descriptor,
        gameSeedBase: CONTINUOUS_OFFENSE_COMPATIBILITY_ENGINE_SEED_BASE,
    });
    if (
        manifest.scheduler.account !== "pi_jss233" || manifest.source.gitBranch !== "main" ||
        manifest.source.trackedDirty !== false || manifest.software.baseline.kind !== "external-package" ||
        manifest.software.baseline.trackedDirty !== false || rows.length !== 18
    ) throw new Error("Continuous-offense compatibility provenance or coverage failed");
    const output = {
        schemaVersion: 1,
        status: "PASS_OUTCOME_FREE_CONTINUOUS_OFFENSE_COMPATIBILITY_AND_EXPOSURE",
        generatedAt: new Date().toISOString(),
        passed: true,
        outcomeFree: true,
        sourceGitCommit: manifest.source.gitCommit,
        scheduler: manifest.scheduler,
        externalBaseline: manifest.software.baseline,
        countryCount: Object.values(Countries).length,
        reciprocalSlotCount: 2,
        gameCount: rows.length * 4,
        maxTicks: CONTINUOUS_OFFENSE_COMPATIBILITY_MAX_TICKS,
        rows,
    };
    fs.mkdirSync(path.dirname(outFile), { recursive: true, mode: 0o700 });
    fs.writeFileSync(outFile, JSON.stringify(output, null, 2) + "\n", { flag: "wx", mode: 0o600 });
    console.log(JSON.stringify({ outFile, sha256: sha256File(outFile), status: output.status, gameCount: output.gameCount }));
};

const invoked = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (import.meta.url === invoked) main().catch((error) => { console.error(error); process.exitCode = 1; });
