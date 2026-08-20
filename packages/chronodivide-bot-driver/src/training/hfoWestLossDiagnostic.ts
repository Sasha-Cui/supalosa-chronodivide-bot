import {
    Bot,
    CreateOfflineOpts,
    GameApi,
    ObjectType,
    ProductionApi,
    QueueType,
    UnitData,
    cdapi,
} from "@chronodivide/game-api";
import { Countries } from "@supalosa/chronodivide-bot/dist/bot/logic/common/utils.js";
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { InspectableBaselineBot, loadBaselineFactory } from "../benchmark/baselineLoader.js";
import { createExperimentManifest } from "../benchmark/provenance.js";
import { withSeededOfflineGame } from "../benchmark/seededOfflineGame.js";
import { createDeployedStrongBotCandidate, InspectableDeployedStrongBot } from "./deployedStrongBotCandidate.js";
import {
    LiteralBuildingEliminationAdjudicator,
    installLiteralEndpointInstrumentation,
    snapshotCombatantBuildings,
} from "./literalBuildingEliminationEndpoint.js";

const MAP = {
    name: "cd_chrono_4_heck_freezes_over_le.map",
    sha256: "e4dfc736a6355e0e68d4681e4d67419516e6bb94549e2d42880c9414e95e2e8d",
} as const;
const COUNTRY = Countries.KOREA;
const CANDIDATE_SLOT = 0 as const;
const ENGINE_SEED = 4_230_000_017;
const MAX_TICKS = 90_000;
const SNAPSHOT_INTERVAL = 300;
const EXPECTED_CANDIDATE_START = "39,82";
const EXPECTED_BASELINE_START = "151,119";
const EXPECTED_STATUS = "baseline_win";
const EXPECTED_TICKS = 9_556;
const CANDIDATE_BEHAVIOR_COMMIT = "5a97e40d4c32752947bb51fad37b3b466becc946";
const SHA256 = /^[0-9a-f]{64}$/;

const DEFENSE_BUILDINGS = new Set(["NALASR", "NAFLAK", "TESLA", "GAPILL", "NASAM", "ATESLA", "GTGCAN"]);
const POWER_BUILDINGS = new Set(["NAPOWR", "NAAPWR", "GAPOWR", "GAPOWRUP"]);

type ActionRow = { tick: number; unitCount: number; orderType: unknown; args: unknown[] };
type SideSnapshot = {
    credits: number;
    defeated: boolean;
    counts: {
        units: number;
        combatants: number;
        harvesters: number;
        buildings: number;
        constructionYards: number;
        barracks: number;
        refineries: number;
        warFactories: number;
        defenses: number;
        power: number;
    };
    unitNames: Record<string, number>;
    combatantGeometry: null | {
        centroid: { x: number; y: number };
        bounds: { minX: number; maxX: number; minY: number; maxY: number };
    };
    queues: Array<{ queue: number; payload: unknown }>;
};

const requiredPath = (name: string): string => {
    const value = process.env[name];
    if (!value) throw new Error(`${name} is required`);
    return path.resolve(value);
};
const requiredText = (name: string, pattern: RegExp): string => {
    const value = process.env[name];
    if (!value || !pattern.test(value)) throw new Error(`${name} is invalid`);
    return value;
};
const sha256File = (filePath: string): string =>
    crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
const sha256Value = (value: unknown): string =>
    crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
const startKey = (point: { x: number; y: number }): string => `${point.x},${point.y}`;

const settings = (candidate: Bot, baseline: Bot): CreateOfflineOpts => {
    const gameMode = cdapi.getAvailableGameModes(MAP.name)[0];
    if (!gameMode) throw new Error("HFO diagnostic game mode is unavailable");
    return {
        buildOffAlly: false,
        cratesAppear: false,
        credits: 10_000,
        gameMode,
        gameSpeed: 6,
        mapName: MAP.name,
        mcvRepacks: true,
        shortGame: false,
        superWeapons: false,
        unitCount: 0,
        online: false,
        agents: [candidate, baseline],
    };
};

const ownUnits = (game: GameApi, playerName: string): UnitData[] =>
    game.getAllUnits().map((id) => game.getUnitData(id)).filter((unit): unit is UnitData => !!unit)
        .filter((unit) => unit.owner === playerName);

const countNames = (units: UnitData[]): Record<string, number> => {
    const counts = new Map<string, number>();
    for (const unit of units) counts.set(unit.rules.name, (counts.get(unit.rules.name) ?? 0) + 1);
    return Object.fromEntries([...counts.entries()].sort(([left], [right]) => left.localeCompare(right)));
};

const geometry = (units: UnitData[]): SideSnapshot["combatantGeometry"] => {
    if (units.length === 0) return null;
    const xs = units.map((unit) => unit.tile.rx), ys = units.map((unit) => unit.tile.ry);
    return {
        centroid: {
            x: xs.reduce((total, value) => total + value, 0) / xs.length,
            y: ys.reduce((total, value) => total + value, 0) / ys.length,
        },
        bounds: { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) },
    };
};

const queueSnapshot = (production: ProductionApi | null): SideSnapshot["queues"] => {
    if (!production) throw new Error("Diagnostic production API is unavailable");
    return [QueueType.Structures, QueueType.Armory, QueueType.Infantry, QueueType.Vehicles, QueueType.Aircrafts]
        .map((queue) => ({ queue, payload: production.getQueueData(queue) }));
};

const sideSnapshot = (
    game: GameApi,
    playerName: string,
    defeated: boolean,
    production: ProductionApi | null,
): SideSnapshot => {
    const units = ownUnits(game, playerName);
    const combatants = units.filter((unit) => !!unit.rules.isSelectableCombatant && unit.rules.type !== ObjectType.Building);
    return {
        credits: game.getPlayerData(playerName).credits,
        defeated,
        counts: {
            units: units.length,
            combatants: combatants.length,
            harvesters: units.filter((unit) => !!unit.rules.harvester).length,
            buildings: units.filter((unit) => unit.rules.type === ObjectType.Building).length,
            constructionYards: units.filter((unit) => !!unit.rules.constructionYard).length,
            barracks: units.filter((unit) => !!unit.rules.nodBarracks || !!unit.rules.gdiBarracks).length,
            refineries: units.filter((unit) => !!unit.rules.refinery).length,
            warFactories: units.filter((unit) => !!unit.rules.weaponsFactory).length,
            defenses: units.filter((unit) => DEFENSE_BUILDINGS.has(unit.rules.name)).length,
            power: units.filter((unit) => POWER_BUILDINGS.has(unit.rules.name)).length,
        },
        unitNames: countNames(units),
        combatantGeometry: geometry(combatants),
        queues: queueSnapshot(production),
    };
};

const installActionTrace = (bot: InspectableDeployedStrongBot, rows: ActionRow[]): void => {
    const originalStart = bot.onGameStart.bind(bot);
    bot.onGameStart = (game: GameApi): void => {
        originalStart(game);
        const actions = bot.lastPlayerActions;
        if (!actions) throw new Error("Candidate actions API is unavailable");
        const originalOrderUnits = actions.orderUnits.bind(actions);
        Object.defineProperty(actions, "orderUnits", {
            configurable: true,
            writable: true,
            value: (...args: unknown[]): unknown => {
                const ids = Array.isArray(args[0]) ? args[0] : [];
                rows.push({ tick: game.getCurrentTick(), unitCount: ids.length, orderType: args[1], args: structuredClone(args) });
                return (originalOrderUnits as (...values: unknown[]) => unknown)(...args);
            },
        });
    };
};

const main = async (): Promise<void> => {
    if (process.env.SLURM_JOB_ACCOUNT !== "pi_jss233") throw new Error("Diagnostic requires pi_jss233");
    const outputPath = requiredPath("OUT_PATH"), mixDir = requiredPath("MIX_DIR");
    const protocolPath = requiredPath("PROTOCOL_PATH"), protocolSha256 = requiredText("PROTOCOL_SHA256", SHA256);
    const assetManifestPath = requiredPath("ASSET_MANIFEST_PATH");
    const assetManifestSha256 = requiredText("ASSET_MANIFEST_SHA256", SHA256);
    if (fs.existsSync(outputPath) || sha256File(protocolPath) !== protocolSha256 ||
        sha256File(assetManifestPath) !== assetManifestSha256) throw new Error("Diagnostic input drifted");

    const repo = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
    const sourceCommit = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
    if (execFileSync("git", ["branch", "--show-current"], { encoding: "utf8" }).trim() !== "main" ||
        execFileSync("git", ["status", "--short", "--untracked-files=no"], { encoding: "utf8" }).trim() !== "" ||
        execFileSync("git", ["rev-parse", "fork/main"], { encoding: "utf8" }).trim() !== sourceCommit) {
        throw new Error("Diagnostic source is not clean synchronized main");
    }
    execFileSync("git", ["diff", "--quiet", CANDIDATE_BEHAVIOR_COMMIT, "--", "packages/chronodivide-bot"]);
    if (sha256File(path.join(mixDir, MAP.name)) !== MAP.sha256) throw new Error("HFO diagnostic map drifted");

    await cdapi.init(mixDir);
    const baselineFactory = await loadBaselineFactory(path.join(repo, "packages", "chronodivide-bot"));
    const candidateName = "HfoWestDiagnosticCandidate", baselineName = "HfoWestDiagnosticBaseline";
    const candidate = createDeployedStrongBotCandidate(candidateName, COUNTRY);
    const baseline = baselineFactory.create(baselineName, COUNTRY) as InspectableBaselineBot;
    const adjudicator = new LiteralBuildingEliminationAdjudicator({ candidate: candidateName, baseline: baselineName });
    const { audit } = installLiteralEndpointInstrumentation({ candidate, baseline }, adjudicator);
    const actions: ActionRow[] = [];
    installActionTrace(candidate, actions);
    const snapshots: unknown[] = [];

    const result = await withSeededOfflineGame(cdapi, settings(candidate, baseline), ENGINE_SEED,
        [{ agent: candidate, identity: "candidate" }, { agent: baseline, identity: "baseline" }], async (game) => {
            if (!candidate.lastGameApi) throw new Error("Candidate game API is unavailable");
            const gameApi = candidate.lastGameApi;
            const candidateStart = startKey(gameApi.getPlayerData(candidateName).startLocation);
            const baselineStart = startKey(gameApi.getPlayerData(baselineName).startLocation);
            if (candidateStart !== EXPECTED_CANDIDATE_START || baselineStart !== EXPECTED_BASELINE_START) {
                throw new Error(`Diagnostic start drifted: ${candidateStart} versus ${baselineStart}`);
            }
            let terminal: any = null, failure: any = null, ticks = 0;
            const capture = (): void => {
                const stats = game.getPlayerStats();
                const candidateStats = stats.find((row) => row.name === candidateName);
                const baselineStats = stats.find((row) => row.name === baselineName);
                if (!candidateStats || !baselineStats) throw new Error("Diagnostic player statistics are unavailable");
                const visibleEnemyUnits = gameApi.getVisibleUnits(candidateName, "enemy")
                    .map((id) => gameApi.getUnitData(id)).filter((unit): unit is UnitData => !!unit);
                snapshots.push({
                    tick: ticks,
                    candidate: sideSnapshot(gameApi, candidateName, candidateStats.defeated, candidate.lastPlayerProduction),
                    baseline: sideSnapshot(gameApi, baselineName, baselineStats.defeated, baseline.lastPlayerProduction),
                    candidateVisibleEnemy: {
                        units: visibleEnemyUnits.length,
                        combatants: visibleEnemyUnits.filter((unit) => !!unit.rules.isSelectableCombatant).length,
                        buildings: visibleEnemyUnits.filter((unit) => unit.rules.type === ObjectType.Building).length,
                        names: countNames(visibleEnemyUnits),
                    },
                    literalBuildingCounts: {
                        candidate: snapshotCombatantBuildings(gameApi, { candidate: candidateName, baseline: baselineName })
                            .filter((row) => row.owner === candidateName).length,
                        baseline: snapshotCombatantBuildings(gameApi, { candidate: candidateName, baseline: baselineName })
                            .filter((row) => row.owner === baselineName).length,
                    },
                    actionCount: actions.length,
                });
            };
            capture();
            while (ticks < MAX_TICKS && !terminal && !failure) {
                adjudicator.beginUpdate(gameApi);
                await game.update();
                ticks += 1;
                const stats = game.getPlayerStats();
                const candidateStats = stats.find((row) => row.name === candidateName);
                const baselineStats = stats.find((row) => row.name === baselineName);
                if (!candidateStats || !baselineStats) throw new Error("Diagnostic player statistics are unavailable");
                const endpoint = adjudicator.completeUpdate(gameApi, { finished: game.isFinished(), defeated: {
                    candidate: candidateStats.defeated, baseline: baselineStats.defeated,
                } });
                terminal = endpoint.terminal;
                failure = endpoint.technicalFailure;
                if (ticks % SNAPSHOT_INTERVAL === 0 || terminal || failure) capture();
            }
            if (failure) throw new Error(`Diagnostic endpoint failure: ${JSON.stringify(failure)}`);
            const status = terminal?.status ?? "tick_cap_draw";
            if (status !== EXPECTED_STATUS || ticks !== EXPECTED_TICKS) {
                throw new Error(`Diagnostic did not reproduce fixed loss: ${status} at ${ticks}`);
            }
            if (audit.forwarded.candidate !== 0 || audit.forwarded.baseline !== 0) {
                throw new Error("Diagnostic forwarded a suppressed resignation");
            }
            return { status, winner: terminal?.winner ?? "draw", ticks, candidateStart, baselineStart };
        });

    const manifest = createExperimentManifest({
        runId: `hfo-west-loss-diagnostic-${process.env.SLURM_JOB_ID}`,
        mixDir,
        maps: [MAP.name],
        effectiveConfig: { country: COUNTRY, candidateSlot: CANDIDATE_SLOT, engineSeed: ENGINE_SEED,
            maxTicks: MAX_TICKS, snapshotInterval: SNAPSHOT_INTERVAL, candidateBehaviorCommit: CANDIDATE_BEHAVIOR_COMMIT },
        baseline: baselineFactory.descriptor,
        gameSeedBase: ENGINE_SEED,
    });
    const artifact = {
        schemaVersion: 1,
        kind: "hfo-west-loss-diagnostic",
        status: "COMPLETE_HFO_WEST_LOSS_DIAGNOSTIC",
        complete: true,
        selectedWorstCase: true,
        eligibleForPerformanceEstimation: false,
        scheduler: { jobId: process.env.SLURM_JOB_ID, account: "pi_jss233" },
        sourceCommit,
        candidateBehaviorCommit: CANDIDATE_BEHAVIOR_COMMIT,
        protocolPath,
        protocolSha256,
        assetManifestSha256,
        result,
        suppressedQuitAttempts: { ...audit.attempts },
        snapshotCount: snapshots.length,
        snapshotsSha256: sha256Value(snapshots),
        snapshots,
        actionCount: actions.length,
        actionsSha256: sha256Value(actions),
        actions,
        provenance: manifest,
    };
    fs.mkdirSync(path.dirname(outputPath), { recursive: true, mode: 0o700 });
    fs.writeFileSync(outputPath, JSON.stringify(artifact, null, 2) + "\n", { flag: "wx", mode: 0o600 });
    console.log(JSON.stringify({ status: artifact.status, result, snapshotCount: snapshots.length,
        actionCount: actions.length, suppressedQuitAttempts: artifact.suppressedQuitAttempts }));
};

const invoked = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (import.meta.url === invoked) main().catch((error) => { console.error(error); process.exitCode = 1; });
