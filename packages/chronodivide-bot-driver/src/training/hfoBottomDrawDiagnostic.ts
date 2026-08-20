import { Bot, CreateOfflineOpts, GameApi, ObjectType, UnitData, cdapi } from "@chronodivide/game-api";
import { Countries } from "@supalosa/chronodivide-bot/dist/bot/logic/common/utils.js";
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { loadBaselineFactory } from "../benchmark/baselineLoader.js";
import { createExperimentManifest } from "../benchmark/provenance.js";
import { withSeededOfflineGame } from "../benchmark/seededOfflineGame.js";
import { createDeployedStrongBotCandidate, InspectableDeployedStrongBot } from "./deployedStrongBotCandidate.js";
import { LiteralBuildingEliminationAdjudicator, installLiteralEndpointInstrumentation,
    snapshotCombatantBuildings } from "./literalBuildingEliminationEndpoint.js";

const MAP = { name: "cd_chrono_4_heck_freezes_over_le.map",
    sha256: "e4dfc736a6355e0e68d4681e4d67419516e6bb94549e2d42880c9414e95e2e8d" } as const;
const COUNTRY = Countries.USA, ENGINE_SEED = 4_230_000_001, CANDIDATE_SLOT = 1 as const;
const CANDIDATE_START = "88,157", BASELINE_START = "88,34";
const EXPECTED_STATUS = "engine_nonliteral_termination_draw", EXPECTED_TICKS = 59_916;
const MAX_TICKS = 90_000, SNAPSHOT_INTERVAL = 300, TRAJECTORY_INTERVAL = 60;
const SHA256 = /^[0-9a-f]{64}$/;
const DEFENSE = new Set(["NALASR", "NAFLAK", "TESLA", "GAPILL", "NASAM", "ATESLA", "GTGCAN"]);
const POWER = new Set(["NAPOWR", "NAAPWR", "GAPOWR", "GAPOWRUP"]);
type ActionRow = { tick: number; unitIds: number[]; orderType: unknown; args: unknown[] };

const requiredPath = (name: string): string => {
    const value = process.env[name]; if (!value) throw new Error(`${name} is required`); return path.resolve(value);
};
const requiredText = (name: string, pattern: RegExp): string => {
    const value = process.env[name]; if (!value || !pattern.test(value)) throw new Error(`${name} is invalid`); return value;
};
const sha256File = (filePath: string): string =>
    crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
const sha256Value = (value: unknown): string =>
    crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
const startKey = (point: { x: number; y: number }): string => `${point.x},${point.y}`;
const isRecord = (value: unknown): value is Record<string, unknown> =>
    !!value && typeof value === "object" && !Array.isArray(value);

const settings = (candidate: Bot, baseline: Bot): CreateOfflineOpts => {
    const gameMode = cdapi.getAvailableGameModes(MAP.name)[0];
    if (!gameMode) throw new Error("Bottom diagnostic game mode is unavailable");
    return { buildOffAlly: false, cratesAppear: false, credits: 10_000, gameMode, gameSpeed: 6,
        mapName: MAP.name, mcvRepacks: true, shortGame: false, superWeapons: false, unitCount: 0, online: false,
        agents: [baseline, candidate] };
};

const unitsOwnedBy = (game: GameApi, playerName: string): UnitData[] =>
    game.getAllUnits().map((id) => game.getUnitData(id)).filter((unit): unit is UnitData => !!unit)
        .filter((unit) => unit.owner === playerName);
const countNames = (units: UnitData[]): Record<string, number> => {
    const counts = new Map<string, number>();
    for (const unit of units) counts.set(unit.rules.name, (counts.get(unit.rules.name) ?? 0) + 1);
    return Object.fromEntries([...counts.entries()].sort(([left], [right]) => left.localeCompare(right)));
};
const geometry = (units: UnitData[]) => {
    if (units.length === 0) return null;
    const xs = units.map((unit) => unit.tile.rx), ys = units.map((unit) => unit.tile.ry);
    return { centroid: { x: xs.reduce((total, value) => total + value, 0) / xs.length,
        y: ys.reduce((total, value) => total + value, 0) / ys.length },
    bounds: { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) } };
};
const sideSnapshot = (game: GameApi, playerName: string) => {
    const units = unitsOwnedBy(game, playerName);
    const combatants = units.filter((unit) => !!unit.rules.isSelectableCombatant &&
        unit.rules.type !== ObjectType.Building && !unit.rules.harvester);
    const buildings = units.filter((unit) => unit.rules.type === ObjectType.Building);
    return { credits: game.getPlayerData(playerName).credits,
        counts: { units: units.length, combatants: combatants.length,
            harvesters: units.filter((unit) => !!unit.rules.harvester).length, buildings: buildings.length,
            constructionYards: buildings.filter((unit) => !!unit.rules.constructionYard).length,
            barracks: buildings.filter((unit) => !!unit.rules.nodBarracks || !!unit.rules.gdiBarracks).length,
            refineries: buildings.filter((unit) => !!unit.rules.refinery).length,
            warFactories: buildings.filter((unit) => !!unit.rules.weaponsFactory).length,
            defenses: buildings.filter((unit) => DEFENSE.has(unit.rules.name)).length,
            power: buildings.filter((unit) => POWER.has(unit.rules.name)).length },
        unitNames: countNames(units), combatantGeometry: geometry(combatants) };
};

const installActionTrace = (candidate: InspectableDeployedStrongBot, rows: ActionRow[]): void => {
    const originalStart = candidate.onGameStart.bind(candidate);
    candidate.onGameStart = (game: GameApi): void => {
        originalStart(game);
        const actions = candidate.lastPlayerActions;
        if (!actions) throw new Error("Bottom diagnostic actions API is unavailable");
        const originalOrderUnits = actions.orderUnits.bind(actions);
        Object.defineProperty(actions, "orderUnits", { configurable: true, writable: true,
            value: (...args: unknown[]): unknown => {
                rows.push({ tick: game.getCurrentTick(), unitIds: Array.isArray(args[0]) ? [...args[0]] : [],
                    orderType: args[1], args: structuredClone(args) });
                return (originalOrderUnits as (...values: unknown[]) => unknown)(...args);
            } });
    };
};

const main = async (): Promise<void> => {
    if (process.env.SLURM_JOB_ACCOUNT !== "pi_jss233") throw new Error("Bottom diagnostic requires pi_jss233");
    const outputPath = requiredPath("OUT_PATH"), mixDir = requiredPath("MIX_DIR");
    const protocolPath = requiredPath("PROTOCOL_PATH"), protocolSha256 = requiredText("PROTOCOL_SHA256", SHA256);
    const assetManifestPath = requiredPath("ASSET_MANIFEST_PATH");
    const assetManifestSha256 = requiredText("ASSET_MANIFEST_SHA256", SHA256);
    if (fs.existsSync(outputPath) || sha256File(protocolPath) !== protocolSha256 ||
        sha256File(assetManifestPath) !== assetManifestSha256 || sha256File(path.join(mixDir, MAP.name)) !== MAP.sha256) {
        throw new Error("Bottom diagnostic input drifted");
    }
    const assetManifest = JSON.parse(fs.readFileSync(assetManifestPath, "utf8")) as unknown;
    if (!isRecord(assetManifest) || assetManifest.kind !== "private-ra2-snow-runtime" ||
        path.resolve(String(assetManifest.runtimeDirectory)) !== mixDir) throw new Error("Bottom runtime drifted");
    const repo = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
    const sourceCommit = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
    if (execFileSync("git", ["branch", "--show-current"], { encoding: "utf8" }).trim() !== "main" ||
        execFileSync("git", ["status", "--short", "--untracked-files=no"], { encoding: "utf8" }).trim() !== "" ||
        execFileSync("git", ["rev-parse", "fork/main"], { encoding: "utf8" }).trim() !== sourceCommit) {
        throw new Error("Bottom diagnostic source is not clean synchronized main");
    }

    await cdapi.init(mixDir);
    const factory = await loadBaselineFactory(path.join(repo, "packages", "chronodivide-bot"));
    const candidateName = "HfoBottomDrawDiagnosticCandidate", baselineName = "HfoBottomDrawDiagnosticBaseline";
    const candidate = createDeployedStrongBotCandidate(candidateName, COUNTRY);
    const baseline = factory.create(baselineName, COUNTRY);
    const adjudicator = new LiteralBuildingEliminationAdjudicator({ candidate: candidateName, baseline: baselineName });
    const { audit } = installLiteralEndpointInstrumentation({ candidate, baseline }, adjudicator);
    const actions: ActionRow[] = [];
    installActionTrace(candidate, actions);
    const snapshots: unknown[] = [], trajectory: unknown[] = [];
    const thresholds: Record<string, Record<string, number | null>> = {
        candidate: { "8": null, "4": null, "2": null, "1": null },
        baseline: { "8": null, "4": null, "2": null, "1": null },
    };
    const result = await withSeededOfflineGame(cdapi, settings(candidate, baseline), ENGINE_SEED,
        [{ agent: candidate, identity: "candidate" }, { agent: baseline, identity: "baseline" }], async (game) => {
            if (!candidate.lastGameApi) throw new Error("Bottom candidate GameApi is unavailable");
            const gameApi = candidate.lastGameApi;
            if (startKey(gameApi.getPlayerData(candidateName).startLocation) !== CANDIDATE_START ||
                startKey(gameApi.getPlayerData(baselineName).startLocation) !== BASELINE_START) {
                throw new Error("Bottom diagnostic start drifted");
            }
            let ticks = 0, terminal: any = null, failure: any = null;
            const capture = (): void => {
                const visibleEnemy = gameApi.getVisibleUnits(candidateName, "enemy")
                    .map((id) => gameApi.getUnitData(id)).filter((unit): unit is UnitData => !!unit);
                snapshots.push({ tick: ticks, candidate: sideSnapshot(gameApi, candidateName),
                    baseline: sideSnapshot(gameApi, baselineName), candidateVisibleEnemy: {
                        units: visibleEnemy.length,
                        combatants: visibleEnemy.filter((unit) => !!unit.rules.isSelectableCombatant).length,
                        buildings: visibleEnemy.filter((unit) => unit.rules.type === ObjectType.Building).length,
                        names: countNames(visibleEnemy) }, actionCount: actions.length });
            };
            capture();
            while (ticks < MAX_TICKS && !terminal && !failure) {
                adjudicator.beginUpdate(gameApi); await game.update(); ticks += 1;
                const stats = game.getPlayerStats(), candidateStats = stats.find((row) => row.name === candidateName);
                const baselineStats = stats.find((row) => row.name === baselineName);
                if (!candidateStats || !baselineStats) throw new Error("Bottom diagnostic statistics are unavailable");
                const endpoint = adjudicator.completeUpdate(gameApi, { finished: game.isFinished(), defeated: {
                    candidate: candidateStats.defeated, baseline: baselineStats.defeated } });
                terminal = endpoint.terminal; failure = endpoint.technicalFailure;
                const buildings = snapshotCombatantBuildings(gameApi, { candidate: candidateName, baseline: baselineName });
                const counts = { candidate: buildings.filter((row) => row.owner === candidateName).length,
                    baseline: buildings.filter((row) => row.owner === baselineName).length };
                for (const side of ["candidate", "baseline"] as const) {
                    for (const threshold of [8, 4, 2, 1]) {
                        if (thresholds[side][String(threshold)] === null && counts[side] <= threshold) {
                            thresholds[side][String(threshold)] = ticks;
                        }
                    }
                }
                if (ticks % TRAJECTORY_INTERVAL === 0 || terminal || failure) {
                    trajectory.push({ tick: ticks, ...counts });
                    if (trajectory.length > Math.ceil(6_000 / TRAJECTORY_INTERVAL) + 1) trajectory.shift();
                }
                if (ticks % SNAPSHOT_INTERVAL === 0 || terminal || failure) capture();
            }
            if (failure) throw new Error(`Bottom diagnostic endpoint failure ${JSON.stringify(failure)}`);
            const status = terminal?.status ?? "tick_cap_draw";
            if (status !== EXPECTED_STATUS || ticks !== EXPECTED_TICKS || terminal?.winner !== "draw") {
                throw new Error(`Bottom diagnostic failed reproduction: ${status} at ${ticks}`);
            }
            if (audit.forwarded.candidate !== 0 || audit.forwarded.baseline !== 0) {
                throw new Error("Bottom diagnostic forwarded a resignation");
            }
            const candidateCombatants = unitsOwnedBy(gameApi, candidateName)
                .filter((unit) => !!unit.rules.isSelectableCombatant && unit.rules.type !== ObjectType.Building && !unit.rules.harvester);
            const regions = { home: 0, enemy: 0, neither: 0 };
            for (const unit of candidateCombatants) {
                const homeDistance = (unit.tile.rx - 88) ** 2 + (unit.tile.ry - 157) ** 2;
                const enemyDistance = (unit.tile.rx - 88) ** 2 + (unit.tile.ry - 34) ** 2;
                if (homeDistance <= 48 ** 2) regions.home += 1;
                else if (enemyDistance <= 48 ** 2) regions.enemy += 1;
                else regions.neither += 1;
            }
            return { status, ticks, candidateStart: CANDIDATE_START, baselineStart: BASELINE_START,
                terminalCandidateCombatantRegions: regions };
        });
    const finalActionRows = actions.filter((row) => row.tick >= result.ticks - 6_000);
    const provenance = createExperimentManifest({ runId: `hfo-bottom-draw-diagnostic-${process.env.SLURM_JOB_ID}`,
        mixDir, maps: [MAP.name], effectiveConfig: { country: COUNTRY, candidateSlot: CANDIDATE_SLOT,
            engineSeed: ENGINE_SEED, maxTicks: MAX_TICKS, snapshotInterval: SNAPSHOT_INTERVAL },
        baseline: factory.descriptor, gameSeedBase: ENGINE_SEED });
    const artifact = { schemaVersion: 1, kind: "hfo-bottom-simultaneous-draw-diagnostic",
        status: "COMPLETE_HFO_BOTTOM_DRAW_DIAGNOSTIC", complete: true, selectedOutcomeCase: true,
        eligibleForPerformanceEstimation: false, scheduler: { jobId: process.env.SLURM_JOB_ID, account: "pi_jss233" },
        sourceCommit, protocolPath, protocolSha256, assetManifestSha256, result,
        suppressedQuitAttempts: { ...audit.attempts }, thresholds,
        snapshotCount: snapshots.length, snapshotsSha256: sha256Value(snapshots), snapshots,
        finalBuildingTrajectory: trajectory,
        actionCount: actions.length, actionsSha256: sha256Value(actions),
        finalActionCount: finalActionRows.length, finalActionsSha256: sha256Value(finalActionRows), finalActions: finalActionRows,
        provenance };
    fs.mkdirSync(path.dirname(outputPath), { recursive: true, mode: 0o700 });
    fs.writeFileSync(outputPath, JSON.stringify(artifact, null, 2) + "\n", { flag: "wx", mode: 0o600 });
    console.log(JSON.stringify({ status: artifact.status, result, thresholds,
        snapshots: snapshots.length, actions: actions.length, finalActions: finalActionRows.length }));
};

const invoked = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (import.meta.url === invoked) main().catch((error) => { console.error(error); process.exitCode = 1; });
