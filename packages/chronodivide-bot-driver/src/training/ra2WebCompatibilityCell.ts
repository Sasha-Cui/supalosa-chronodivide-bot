import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
    ActionsApi,
    Bot,
    CreateOfflineOpts,
    GameApi,
    ProductionApi,
    QueueType,
    UnitData,
    cdapi,
} from "@chronodivide/game-api";
import { Countries } from "@supalosa/chronodivide-bot/dist/bot/logic/common/utils.js";
import {
    BaselineFactory,
    InspectableBaselineBot,
    loadBaselineFactory,
} from "../benchmark/baselineLoader.js";
import { createExperimentManifest } from "../benchmark/provenance.js";
import { withSeededOfflineGame } from "../benchmark/seededOfflineGame.js";
import {
    RA2WEB_COMPATIBILITY_COUNTRIES,
    RA2WEB_COMPATIBILITY_ENGINE_SEED_BASE,
    Ra2WebCompatibilityCampaign,
    validateRa2WebCompatibilityCampaign,
} from "./ra2WebCompatibilityCampaign.js";
import {
    InspectableRa2WebBot,
    Ra2WebOpponentId,
    createInspectableRa2WebBot,
    loadRa2WebOpponent,
} from "./ra2WebOpponentBundle.js";
import { sha256File } from "./methodV5PlanRunner.js";

type TraceableBot = Bot & {
    lastGameApi: GameApi | null;
    lastPlayerActions: ActionsApi | null;
    lastPlayerProduction: ProductionApi | null;
};
type ActionTraceRow = { tick: number; args: unknown[] };
type StateSnapshot = {
    tick: number;
    credits: number;
    units: Array<{ id: number; name: string; x: number; y: number; hitPoints: number }>;
    queues: Array<{ queue: number; payload: unknown }>;
};
export type Ra2WebCompatibilityTrace = {
    requestedEngineSeed: number;
    updateCount: number;
    actionCount: number;
    actionTraceSha256: string;
    fixedSnapshotCount: number;
    fixedSnapshotSha256: string;
    technicalTraceSha256: string;
};

const SHA256 = /^[0-9a-f]{64}$/;
const digest = (value: unknown): string => crypto.createHash("sha256")
    .update(JSON.stringify(value))
    .digest("hex");
const runtimeCommitment = (value: unknown): string => digest(value);
const requiredPath = (name: string): string => {
    const value = process.env[name];
    if (!value) throw new Error(`${name} is required`);
    return path.resolve(value);
};
const requiredTaskIndex = (): number => {
    const raw = process.env.SLURM_ARRAY_TASK_ID;
    const value = raw === undefined ? Number.NaN : Number(raw);
    if (!Number.isSafeInteger(value) || value < 0 || value >= 18) {
        throw new Error("SLURM_ARRAY_TASK_ID must select one of 18 RA2Web compatibility cells");
    }
    return value;
};
const readCampaign = (campaignPath: string): Ra2WebCompatibilityCampaign =>
    validateRa2WebCompatibilityCampaign(JSON.parse(fs.readFileSync(campaignPath, "utf8")));

const normalizeActionValue = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(normalizeActionValue);
    if (value && typeof value === "object") {
        const candidate = value as Record<string, unknown>;
        if (
            Number.isSafeInteger(candidate.id) && candidate.rules && typeof candidate.rules === "object" &&
            typeof (candidate.rules as Record<string, unknown>).name === "string"
        ) return { id: candidate.id, name: (candidate.rules as Record<string, unknown>).name };
        return Object.fromEntries(Object.entries(candidate)
            .sort(([left], [right]) => left.localeCompare(right))
            .map(([key, child]) => [key, normalizeActionValue(child)]));
    }
    return value;
};

const installActionTrace = (bot: TraceableBot, trace: ActionTraceRow[]): void => {
    const originalStart = bot.onGameStart.bind(bot);
    bot.onGameStart = (game: GameApi): void => {
        originalStart(game);
        const actions = bot.lastPlayerActions;
        if (!actions) throw new Error(`RA2Web compatibility lacks actions for ${bot.name}`);
        const originalOrderUnits = actions.orderUnits.bind(actions);
        Object.defineProperty(actions, "orderUnits", {
            configurable: true,
            writable: true,
            value: (...args: unknown[]): unknown => {
                trace.push({ tick: game.getCurrentTick(), args: args.map(normalizeActionValue) });
                return (originalOrderUnits as (...values: unknown[]) => unknown)(...args);
            },
        });
    };
};

const snapshot = (bot: TraceableBot, tick: number): StateSnapshot => {
    if (!bot.lastGameApi || !bot.lastPlayerProduction) {
        throw new Error(`RA2Web compatibility lacks candidate state at tick ${tick}`);
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
            }))
            .sort((left, right) => left.id - right.id),
        queues: [
            QueueType.Structures,
            QueueType.Armory,
            QueueType.Infantry,
            QueueType.Vehicles,
            QueueType.Aircrafts,
        ].map((queue) => ({ queue, payload: bot.lastPlayerProduction!.getQueueData(queue) })),
    };
};

const settings = (
    mapName: string,
    candidate: TraceableBot,
    baseline: InspectableBaselineBot,
    candidateSlot: 0 | 1,
): CreateOfflineOpts => {
    const gameMode = cdapi.getAvailableGameModes(mapName)[0];
    if (!gameMode) throw new Error(`No game mode is available for ${mapName}`);
    return {
        buildOffAlly: false,
        cratesAppear: false,
        credits: 10_000,
        gameMode,
        gameSpeed: 6,
        mapName,
        mcvRepacks: true,
        shortGame: false,
        superWeapons: false,
        unitCount: 0,
        online: false,
        agents: candidateSlot === 0 ? [candidate, baseline] : [baseline, candidate],
    };
};

export const runRa2WebCompatibilityTrace = async (args: {
    mapName: string;
    candidate: TraceableBot;
    baseline: InspectableBaselineBot;
    candidateSlot: 0 | 1;
    requestedEngineSeed: number;
    maxTicks: number;
}): Promise<Ra2WebCompatibilityTrace> => {
    const actions: ActionTraceRow[] = [];
    const snapshots: StateSnapshot[] = [];
    installActionTrace(args.candidate, actions);
    installActionTrace(args.baseline as TraceableBot, []);
    return withSeededOfflineGame(
        cdapi,
        settings(args.mapName, args.candidate, args.baseline, args.candidateSlot),
        args.requestedEngineSeed,
        [
            { agent: args.candidate, identity: `candidate:${args.candidate.country}:${args.candidateSlot}` },
            { agent: args.baseline, identity: `baseline:${args.baseline.country}:${1 - args.candidateSlot}` },
        ],
        async (game) => {
            for (let tick = 1; tick <= args.maxTicks; tick += 1) {
                if (game.isFinished()) throw new Error("RA2Web compatibility game ended before fixed horizon");
                await game.update();
                if (game.isFinished()) throw new Error("RA2Web compatibility game ended before fixed horizon");
                if (tick % 300 === 0) snapshots.push(snapshot(args.candidate, tick));
            }
            const trace = {
                requestedEngineSeed: args.requestedEngineSeed,
                updateCount: args.maxTicks,
                actionCount: actions.length,
                actionTraceSha256: digest(actions),
                fixedSnapshotCount: snapshots.length,
                fixedSnapshotSha256: digest(snapshots),
            };
            return { ...trace, technicalTraceSha256: digest(trace) };
        },
    );
};

const main = async (): Promise<void> => {
    const taskIndex = requiredTaskIndex();
    const campaignPath = requiredPath("CAMPAIGN_PATH");
    const outFile = requiredPath("OUT_FILE");
    if (fs.existsSync(outFile)) throw new Error(`Refusing to overwrite ${outFile}`);
    if (!process.env.BASELINE_PACKAGE_ROOT || process.env.REQUIRE_EXTERNAL_BASELINE !== "true") {
        throw new Error("RA2Web compatibility requires exact external Supalosa");
    }
    const campaign = readCampaign(campaignPath);
    const countryOrdinal = Math.floor(taskIndex / 2);
    const candidateSlot = (taskIndex % 2) as 0 | 1;
    const country = campaign.countries[countryOrdinal];
    const requestedEngineSeed = campaign.engineSeedBase + taskIndex;
    const repoRoot = path.resolve(process.cwd(), "..", "..");
    const baselineFactory: BaselineFactory = await loadBaselineFactory(path.join(repoRoot, "packages", "chronodivide-bot"));
    await cdapi.init(path.join(process.cwd(), "data"));

    const run = async (candidate: TraceableBot): Promise<Ra2WebCompatibilityTrace> => {
        const baseline = baselineFactory.create(`RA2WebGateBaseline_${country}_${candidateSlot}`, country);
        return runRa2WebCompatibilityTrace({
            mapName: campaign.mapName,
            candidate,
            baseline,
            candidateSlot,
            requestedEngineSeed,
            maxTicks: campaign.maxTicks,
        });
    };
    const candidateName = `RA2WebGateCandidate_${country}_${candidateSlot}`;
    const exactExternal = await run(baselineFactory.create(candidateName, country));
    const traces: Record<string, {
        first: Ra2WebCompatibilityTrace;
        repeat: Ra2WebCompatibilityTrace;
        deterministic: boolean;
        identicalToExactExternal: boolean;
    }> = {};
    for (const bundle of campaign.bundles) {
        const loaded = loadRa2WebOpponent(campaign.freezeRoot, bundle.opponentId);
        const first = await run(createInspectableRa2WebBot(loaded, candidateName, country));
        const repeat = await run(createInspectableRa2WebBot(loaded, candidateName, country));
        traces[bundle.opponentId] = {
            first,
            repeat,
            deterministic: JSON.stringify(first) === JSON.stringify(repeat),
            identicalToExactExternal: JSON.stringify(first) === JSON.stringify(exactExternal),
        };
    }
    const manifest = createExperimentManifest({
        runId: `ra2web-compatibility-${process.env.SLURM_ARRAY_JOB_ID ?? "local"}-${taskIndex}`,
        mixDir: path.join(process.cwd(), "data"),
        maps: [campaign.mapName],
        effectiveConfig: {
            purpose: "outcome-blind-ra2web-runtime-action-state-compatibility-cell",
            taskIndex,
            countryOrdinal,
            country,
            candidateSlot,
            requestedEngineSeed,
            runKindsPerCell: 7,
            maxTicks: campaign.maxTicks,
            campaignSha256: process.env.CAMPAIGN_SHA256 ?? null,
            opponentSetSha256: campaign.opponentSetSha256,
            outcomeInspection: false,
        },
        baseline: baselineFactory.descriptor,
        gameSeedBase: campaign.engineSeedBase,
    });
    const validationErrors: string[] = [];
    if (
        manifest.scheduler.account !== "pi_jss233" || manifest.source.gitBranch !== "main" ||
        manifest.source.trackedDirty !== false || manifest.source.gitCommit !== campaign.sourceGitCommit ||
        runtimeCommitment(manifest.source.runtimeTrees) !== campaign.sourceRuntimeSha256 ||
        manifest.software.baseline.kind !== "external-package" ||
        manifest.software.baseline.gitCommit !== campaign.externalBaselineGitCommit ||
        manifest.software.baseline.runtimeTree.sha256 !== campaign.externalBaselineRuntimeSha256 ||
        manifest.software.gameApiRuntimeTree.sha256 !== campaign.gameApiRuntimeSha256 ||
        manifest.software.packageLockSha256 !== campaign.packageLockSha256
    ) validationErrors.push("RA2Web compatibility provenance contract failed");
    for (const [opponentId, result] of Object.entries(traces)) {
        if (!result.deterministic) validationErrors.push(`${opponentId} repeat trace diverged`);
        if (result.first.updateCount !== campaign.maxTicks || result.first.fixedSnapshotCount !== 4) {
            validationErrors.push(`${opponentId} trace did not reach the fixed horizon`);
        }
    }
    const output = {
        schemaVersion: 1,
        kind: "ra2web-outcome-blind-compatibility-cell",
        status: validationErrors.length === 0 ? "PASS_RA2WEB_OUTCOME_BLIND_COMPATIBILITY_CELL" : "FAIL_RA2WEB_COMPATIBILITY_CELL",
        passed: validationErrors.length === 0,
        technicalOnly: true,
        taskIndex,
        countryOrdinal,
        country,
        candidateSlot,
        requestedEngineSeed,
        sourceGitCommit: campaign.sourceGitCommit,
        sourceRuntimeSha256: campaign.sourceRuntimeSha256,
        externalBaselineGitCommit: campaign.externalBaselineGitCommit,
        externalBaselineRuntimeSha256: campaign.externalBaselineRuntimeSha256,
        gameApiRuntimeSha256: campaign.gameApiRuntimeSha256,
        packageLockSha256: campaign.packageLockSha256,
        freezeManifestSha256: campaign.freezeManifestSha256,
        opponentSetSha256: campaign.opponentSetSha256,
        mapName: campaign.mapName,
        mapSha256: campaign.mapSha256,
        launchedGameCount: 7,
        exactExternal,
        traces,
        validationErrors,
        scheduler: {
            jobId: process.env.SLURM_JOB_ID ?? null,
            arrayJobId: process.env.SLURM_ARRAY_JOB_ID ?? null,
            taskId: process.env.SLURM_ARRAY_TASK_ID ?? null,
            account: process.env.SLURM_JOB_ACCOUNT ?? null,
        },
        fieldsProvenAbsent: [
            "winner", "score", "competitive disposition", "endpoint orientation",
            "terminal building counts", "resignation-derived label",
        ],
    };
    const forbiddenKey = (value: unknown): string | null => {
        const stack: unknown[] = [value];
        const forbidden = /winner|score|outcome|endpointOrientation|terminalBuilding/i;
        while (stack.length > 0) {
            const item = stack.pop();
            if (Array.isArray(item)) stack.push(...item);
            else if (item && typeof item === "object") {
                for (const [key, child] of Object.entries(item)) {
                    if (forbidden.test(key)) return key;
                    stack.push(child);
                }
            }
        }
        return null;
    };
    const forbidden = forbiddenKey(output);
    if (forbidden) throw new Error(`RA2Web compatibility emitted forbidden key ${forbidden}`);
    if (validationErrors.length > 0) throw new Error(validationErrors.join("; "));
    fs.mkdirSync(path.dirname(outFile), { recursive: true, mode: 0o700 });
    fs.writeFileSync(outFile, JSON.stringify(output, null, 2) + "\n", { flag: "wx", mode: 0o600 });
    console.log(JSON.stringify({ outFile, sha256: sha256File(outFile), status: output.status, taskIndex }));
};

const invoked = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (import.meta.url === invoked) main().catch((error) => { console.error(error); process.exitCode = 1; });
