import {
    ActionsApi,
    Bot,
    CreateOfflineOpts,
    GameApi,
    ObjectType,
    ProductionApi,
    UnitData,
    cdapi,
} from "@chronodivide/game-api";
import { Countries } from "@supalosa/chronodivide-bot/dist/bot/logic/common/utils.js";
import { StrongBot, StrongBotOptions } from "@supalosa/chronodivide-bot/dist/bot/strongBot.js";
import {
    StrongStrategy,
    StrongStrategyOptions,
} from "@supalosa/chronodivide-bot/dist/bot/strategy/strongStrategy.js";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { loadBaselineFactory } from "../benchmark/baselineLoader.js";
import { withSeededOfflineGame } from "../benchmark/seededOfflineGame.js";
import {
    GameFrameAnnotation,
    GameFrameMetadata,
    GameStateFrameRenderer,
} from "../visualisation/gameStateFrameRenderer.js";
import {
    LiteralBuildingEliminationAdjudicator,
    installLiteralEndpointInstrumentation,
    snapshotCombatantBuildings,
} from "./literalBuildingEliminationEndpoint.js";
import { PEAK_PROFILE_ARMS, peakProfileOptions } from "./peakProfilePolicies.js";

const SHA256 = /^[0-9a-f]{64}$/;
const BASELINE_COMMIT = "165b77a71d0cf5ebd27c65b19d0486bcbae78d0f";
const HFO_SOURCE = "f8d5a9961a6e1dd2746cd5c03b6b0793ba73ba02";
const PEAK_SOURCE = "8c73a32a18e04500dc7c52a83264460c01a13f66";
const HFO_MAP = {
    name: "cd_chrono_4_heck_freezes_over_le.map",
    sha256: "e4dfc736a6355e0e68d4681e4d67419516e6bb94549e2d42880c9414e95e2e8d",
};
const PEAK_MAP = {
    name: "cd_2_peak_of_perfection.map",
    sha256: "440715dc154ac10b4b922159824140d40c48990311c6838345b66958f3b3a442",
};
const ACTION_METHODS = [
    "placeBuilding", "sellObject", "sellBuilding", "toggleRepairWrench", "toggleAlliance",
    "pauseProduction", "resumeProduction", "queueForProduction", "unqueueFromProduction",
    "activateSuperWeapon", "orderUnits", "sayAll", "setGlobalDebugText", "setUnitDebugText",
    "quitGame",
] as const;
const PRODUCTION_METHODS = [
    "isAvailableForProduction", "getAvailableObjects", "getQueueTypeForObject", "getQueueData",
] as const;

type ResultRow = Record<string, any>;
type FrameSelection = Record<string, any>;
type MapIdentity = { name: string; sha256: string };
type AuditSummary = { sha256: string; callCount: number; byMethod: Record<string, number> };
type SnapshotHash = { update: number; sha256: string };
type NormalizedEndpoint = {
    winner: "candidate" | "baseline" | "draw";
    status: string;
    updates: number;
    buildingCounts: { candidate: number; opponent: number };
    inventory: { candidate: Record<string, number>; opponent: Record<string, number> };
    quitAttempts: { candidate: number; baseline: number };
    quitForwarded: { candidate: number; baseline: number };
};
type RenderedFrame = {
    category: string;
    policy: string;
    update: number;
    file: string;
    pngSha256: string;
    stateSha256: string;
    bytes: number;
    annotations: GameFrameAnnotation[];
};
type ReplayResult = {
    campaign: "peak" | "hfo";
    policy: string;
    sourceCommit: string;
    map: MapIdentity;
    originalJobId: string;
    requestedEngineSeed: number;
    trajectorySha256: string;
    snapshots: SnapshotHash[];
    endpoint: NormalizedEndpoint;
    audit: AuditSummary;
    history: { update: number; opponentBuildings: number; opponentCombatants: number }[];
    frames: RenderedFrame[];
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
const sha256File = (file: string): string =>
    crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const sha256Text = (value: string): string =>
    crypto.createHash("sha256").update(value).digest("hex");
const startKey = (point: { x: number; y: number }): string => `${point.x},${point.y}`;

const normalizeAuditValue = (value: unknown, depth = 0, seen = new Set<object>()): unknown => {
    if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
        return value;
    }
    if (value === undefined) return "[undefined]";
    if (typeof value === "bigint") return value.toString();
    if (typeof value === "function") return "[function]";
    if (depth >= 3) return "[depth]";
    if (Array.isArray(value)) return value.map((item) => normalizeAuditValue(item, depth + 1, seen));
    if (typeof value === "object") {
        if (seen.has(value)) return "[circular]";
        seen.add(value);
        const record = value as Record<string, unknown>;
        const selected = Object.fromEntries(Object.keys(record).sort().filter((key) =>
            !key.startsWith("_") && typeof record[key] !== "function").slice(0, 24)
            .map((key) => [key, normalizeAuditValue(record[key], depth + 1, seen)]));
        seen.delete(value);
        return selected;
    }
    return String(value);
};

class ApiCallAudit {
    private readonly hash = crypto.createHash("sha256");
    private readonly byMethod = new Map<string, number>();
    private callCount = 0;
    private finished = false;

    install(actions: ActionsApi, production: ProductionApi, tick: () => number): void {
        this.wrap(actions as unknown as Record<string, unknown>, "actions", ACTION_METHODS, tick);
        this.wrap(production as unknown as Record<string, unknown>, "production", PRODUCTION_METHODS, tick);
    }

    finish(): AuditSummary {
        if (this.finished) throw new Error("Replay API audit already finalized");
        this.finished = true;
        return {
            sha256: this.hash.digest("hex"),
            callCount: this.callCount,
            byMethod: Object.fromEntries([...this.byMethod.entries()].sort()),
        };
    }

    private wrap(
        api: Record<string, unknown>,
        namespace: string,
        methods: readonly string[],
        tick: () => number,
    ): void {
        for (const method of methods) {
            const original = api[method];
            if (typeof original !== "function") throw new Error(`Replay API method unavailable: ${namespace}.${method}`);
            Object.defineProperty(api, method, {
                configurable: true,
                writable: true,
                value: (...args: unknown[]) => {
                    const key = `${namespace}.${method}`;
                    this.callCount += 1;
                    this.byMethod.set(key, (this.byMethod.get(key) ?? 0) + 1);
                    this.hash.update(JSON.stringify({
                        tick: tick(),
                        method: key,
                        args: normalizeAuditValue(args),
                    }) + "\n");
                    return (original as (...values: unknown[]) => unknown).apply(api, args);
                },
            });
        }
    }
}

type ReplayInspectableBot = StrongBot & {
    lastGameApi: GameApi | null;
    lastPlayerActions: ActionsApi | null;
    lastPlayerProduction: ProductionApi | null;
};

const createReplayCandidate = (
    name: string,
    country: Countries,
    strategyOptions: StrongStrategyOptions,
    botOptions: StrongBotOptions,
    audit: ApiCallAudit,
): ReplayInspectableBot => {
    class ReplayBot extends StrongBot {
        public lastGameApi: GameApi | null = null;
        public lastPlayerActions: ActionsApi | null = null;
        public lastPlayerProduction: ProductionApi | null = null;

        override onGameStart(game: GameApi): void {
            this.lastGameApi = game;
            this.lastPlayerActions = this.player.actions;
            this.lastPlayerProduction = this.player.production;
            audit.install(this.lastPlayerActions, this.lastPlayerProduction, () => game.getCurrentTick());
            super.onGameStart(game);
        }

        override onGameTick(game: GameApi): void {
            this.lastGameApi = game;
            super.onGameTick(game);
        }
    }
    return new ReplayBot(name, country, [], false, new StrongStrategy(strategyOptions), botOptions);
};

const assertBaseline = (descriptor: any): void => {
    if (descriptor?.kind !== "external-package" || typeof descriptor.packageRoot !== "string") {
        throw new Error("Replay baseline descriptor drifted");
    }
    const packageRoot = path.resolve(descriptor.packageRoot);
    const repo = execFileSync("git", ["-C", packageRoot, "rev-parse", "--show-toplevel"],
        { encoding: "utf8" }).trim();
    if (execFileSync("git", ["-C", repo, "rev-parse", "HEAD"], { encoding: "utf8" }).trim() !== BASELINE_COMMIT ||
        execFileSync("git", ["-C", repo, "status", "--short", "--untracked-files=no"],
            { encoding: "utf8" }).trim() ||
        packageRoot !== path.join(repo, "packages", "chronodivide-bot")) {
        throw new Error("Replay baseline source drifted");
    }
};

const settings = (
    map: MapIdentity,
    candidate: Bot,
    opponent: Bot,
    slot: 0 | 1,
): CreateOfflineOpts => {
    const gameMode = cdapi.getAvailableGameModes(map.name)[0];
    if (!gameMode) throw new Error(`Replay mode unavailable for ${map.name}`);
    return {
        buildOffAlly: false,
        cratesAppear: false,
        credits: 10_000,
        gameMode,
        gameSpeed: 6,
        mapName: map.name,
        mcvRepacks: true,
        shortGame: false,
        superWeapons: false,
        unitCount: 0,
        online: false,
        agents: slot === 0 ? [candidate, opponent] : [opponent, candidate],
    };
};

const trajectorySnapshot = (game: GameApi, candidateName: string, opponentName: string) => {
    const units = game.getAllUnits().map((id) => game.getUnitData(id))
        .filter((unit): unit is UnitData => !!unit)
        .filter((unit) => unit.owner === candidateName || unit.owner === opponentName)
        .map((unit) => ({
            owner: unit.owner === candidateName ? "candidate" : "opponent",
            rule: unit.rules.name,
            type: unit.rules.type,
            hitPoints: unit.hitPoints,
            x: unit.tile.rx,
            y: unit.tile.ry,
        }))
        .sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
    return {
        update: game.getCurrentTick(),
        credits: {
            candidate: game.getPlayerData(candidateName).credits,
            opponent: game.getPlayerData(opponentName).credits,
        },
        units,
    };
};

const inventory = (game: GameApi, candidateName: string, opponentName: string) => {
    const units = game.getAllUnits().map((id) => game.getUnitData(id))
        .filter((unit): unit is UnitData => !!unit)
        .filter((unit) => unit.owner === candidateName || unit.owner === opponentName);
    const summarize = (owner: string) => Object.fromEntries(
        [...new Set(units.filter((unit) => unit.owner === owner).map((unit) => unit.rules.name))].sort()
            .map((name) => [name, units.filter((unit) => unit.owner === owner && unit.rules.name === name).length]),
    );
    return { candidate: summarize(candidateName), opponent: summarize(opponentName) };
};

const publicCounts = (game: GameApi, opponentName: string) => {
    const units = game.getAllUnits().map((id) => game.getUnitData(id))
        .filter((unit): unit is UnitData => !!unit && unit.owner === opponentName);
    return {
        opponentBuildings: units.filter((unit) => unit.rules.type === ObjectType.Building).length,
        opponentCombatants: units.filter((unit) =>
            unit.rules.type !== ObjectType.Building && unit.rules.isSelectableCombatant && !unit.rules.harvester).length,
    };
};

const frameAnnotations = (
    game: GameApi,
    candidateName: string,
    opponentName: string,
    includeStarts: boolean,
): GameFrameAnnotation[] => {
    const units = game.getAllUnits().map((id) => game.getUnitData(id))
        .filter((unit): unit is UnitData => !!unit);
    const buildings = units.filter((unit) =>
        unit.owner === opponentName && unit.rules.type === ObjectType.Building)
        .sort((left, right) => left.id - right.id);
    const candidateCombatants = units.filter((unit) =>
        unit.owner === candidateName && unit.rules.type !== ObjectType.Building &&
        unit.rules.isSelectableCombatant && !unit.rules.harvester);
    const opponentCombatants = units.filter((unit) =>
        unit.owner === opponentName && unit.rules.type !== ObjectType.Building &&
        unit.rules.isSelectableCombatant && !unit.rules.harvester).sort((left, right) => left.id - right.id);
    const annotations: GameFrameAnnotation[] = buildings.slice(0, 3).map((unit, index) => ({
        kind: "opponent_building",
        label: index === 0 ? `Opponent buildings: ${buildings.length}` : "Opponent building",
        unitId: unit.id,
    }));
    const target = buildings[0];
    const distance = (unit: UnitData): number => target ?
        Math.hypot(unit.tile.rx - target.tile.rx, unit.tile.ry - target.tile.ry) : unit.id;
    const candidate = candidateCombatants.slice().sort((left, right) => distance(left) - distance(right) || left.id - right.id)[0];
    if (candidate) annotations.push({ kind: "candidate_force", label: "Candidate combatant", unitId: candidate.id });
    if (opponentCombatants[0]) {
        annotations.push({ kind: "opponent_combatant", label: "Opponent combatant", unitId: opponentCombatants[0].id });
    }
    if (includeStarts) {
        const candidateStart = game.getPlayerData(candidateName).startLocation;
        const opponentStart = game.getPlayerData(opponentName).startLocation;
        annotations.push({ kind: "region", label: "Candidate start", x: candidateStart.x - 2,
            y: candidateStart.y - 2, width: 5, height: 5 });
        annotations.push({ kind: "region", label: "Opponent start", x: opponentStart.x - 2,
            y: opponentStart.y - 2, width: 5, height: 5 });
    }
    return annotations;
};

const normalizeOriginalEndpoint = (row: ResultRow, campaign: "peak" | "hfo"): NormalizedEndpoint => {
    if (campaign === "peak") {
        return {
            winner: row.winner === "first" ? "candidate" : row.winner === "opponent" ? "baseline" : "draw",
            status: row.status,
            updates: row.updates,
            buildingCounts: {
                candidate: row.terminalBuildingCounts.candidate,
                opponent: row.terminalBuildingCounts.opponent,
            },
            inventory: row.terminalUnitInventory,
            quitAttempts: row.quitAttempts,
            quitForwarded: row.quitForwarded,
        };
    }
    return {
        winner: row.winner,
        status: row.status,
        updates: row.ticks,
        buildingCounts: {
            candidate: row.terminalBuildingCounts.candidate,
            opponent: row.terminalBuildingCounts.baseline,
        },
        inventory: {
            candidate: row.terminalUnits.candidate.byName,
            opponent: row.terminalUnits.baseline.byName,
        },
        quitAttempts: row.quitAttempts,
        quitForwarded: { candidate: 0, baseline: 0 },
    };
};

const endpointEqual = (left: NormalizedEndpoint, right: NormalizedEndpoint): boolean =>
    JSON.stringify(left) === JSON.stringify(right);

export const firstDivergenceUpdate = (
    left: SnapshotHash[],
    right: SnapshotHash[],
): number | null => {
    const rightByUpdate = new Map(right.map((row) => [row.update, row.sha256]));
    for (const row of left) {
        const other = rightByUpdate.get(row.update);
        if (other && other !== row.sha256) return row.update;
    }
    return null;
};

export const registeredPeakFrameUpdates = (eventUpdate: number): number[] => {
    if (eventUpdate < 300 || eventUpdate % 60 !== 0) throw new Error("Peak divergence update is not frame eligible");
    return [eventUpdate - 300, eventUpdate, eventUpdate + 600];
};

export const registeredHfoFinalFrameUpdates = (terminalUpdate: number): number[] => {
    if (terminalUpdate < 600) throw new Error("HFO terminal update is not frame eligible");
    return [
        Math.floor((terminalUpdate - 600) / 60) * 60,
        Math.floor((terminalUpdate - 300) / 60) * 60,
        terminalUpdate,
    ];
};

type RunReplayOptions = {
    campaign: "peak" | "hfo";
    policy: string;
    map: MapIdentity;
    country: Countries;
    slot: 0 | 1;
    seed: number;
    candidateStart: string;
    opponentStart: string;
    candidateName: string;
    opponentName: string;
    originalJobId: string;
    originalSource: string;
    expectedTrajectorySha256?: string;
    expectedEndpoint: NormalizedEndpoint;
    strategyOptions: StrongStrategyOptions;
    botOptions: StrongBotOptions;
    renderUpdates: number[];
    framesRoot?: string;
    category: string;
};

const runReplay = async (
    options: RunReplayOptions,
    repo: string,
    mixDir: string,
    baselineFactory: Awaited<ReturnType<typeof loadBaselineFactory>>,
    renderer: GameStateFrameRenderer | null,
): Promise<ReplayResult> => {
    const callAudit = new ApiCallAudit();
    const candidate = createReplayCandidate(options.candidateName, options.country,
        options.strategyOptions, options.botOptions, callAudit);
    const opponent = baselineFactory.create(options.opponentName, options.country);
    const adjudicator = new LiteralBuildingEliminationAdjudicator({
        candidate: options.candidateName,
        baseline: options.opponentName,
    });
    const { audit: quitAudit } = installLiteralEndpointInstrumentation({ candidate, baseline: opponent }, adjudicator);
    const trajectory = crypto.createHash("sha256");
    const snapshots: SnapshotHash[] = [];
    const history: ReplayResult["history"] = [];
    const frames: RenderedFrame[] = [];
    const requestedFrames = new Set(options.renderUpdates);

    const endpoint = await withSeededOfflineGame(
        cdapi,
        settings(options.map, candidate, opponent, options.slot),
        options.seed,
        [
            { agent: candidate, identity: "candidate" },
            { agent: opponent, identity: options.campaign === "peak" ? "opponent" : "baseline" },
        ],
        async (game) => {
            const api = candidate.lastGameApi;
            if (!api) throw new Error("Replay candidate API unavailable");
            if (startKey(api.getPlayerData(options.candidateName).startLocation) !== options.candidateStart ||
                startKey(api.getPlayerData(options.opponentName).startLocation) !== options.opponentStart) {
                throw new Error("Replay selected start drifted");
            }
            const maybeSnapshot = (): void => {
                const snapshot = trajectorySnapshot(api, options.candidateName, options.opponentName);
                const serialized = JSON.stringify(snapshot);
                trajectory.update(serialized + "\n");
                snapshots.push({ update: snapshot.update, sha256: sha256Text(serialized) });
                history.push({ update: snapshot.update, ...publicCounts(api, options.opponentName) });
                if (renderer && requestedFrames.has(snapshot.update)) {
                    if (!options.framesRoot) throw new Error("Replay frames root missing");
                    const annotations = frameAnnotations(api, options.candidateName, options.opponentName,
                        options.campaign === "peak");
                    const metadata: GameFrameMetadata = {
                        category: options.category,
                        map: options.map.name,
                        mapSha256: options.map.sha256,
                        policy: options.policy,
                        country: options.country,
                        candidateStart: options.candidateStart,
                        candidateSlot: options.slot,
                        opponent: `Pinned Supalosa ${BASELINE_COMMIT.slice(0, 12)}`,
                        opponentSha256: BASELINE_COMMIT,
                        requestedEngineSeed: options.seed,
                        originalJobId: options.originalJobId,
                        sourceCommit: options.originalSource,
                        trajectorySha256: options.expectedTrajectorySha256 ?? "hfo-original-schema-without-trajectory",
                        replaySha256: options.expectedTrajectorySha256 ?? "renderer-disabled-replay",
                        status: options.expectedEndpoint.status,
                    };
                    const rendered = renderer.render(api, options.candidateName, options.opponentName,
                        metadata, annotations);
                    const fileName = `${options.policy.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-u${snapshot.update}.png`;
                    const file = path.join(options.framesRoot, fileName);
                    fs.writeFileSync(file, rendered.png, { flag: "wx", mode: 0o600 });
                    frames.push({
                        category: options.category,
                        policy: options.policy,
                        update: snapshot.update,
                        file,
                        pngSha256: rendered.pngSha256,
                        stateSha256: rendered.stateSha256,
                        bytes: rendered.png.length,
                        annotations,
                    });
                }
            };

            maybeSnapshot();
            let updates = 0;
            let terminal: any = null;
            let failure: any = null;
            while (updates < 90_000 && !terminal && !failure) {
                adjudicator.beginUpdate(api);
                await game.update();
                updates += 1;
                const stats = game.getPlayerStats();
                const candidateStats = stats.find((row) => row.name === options.candidateName);
                const opponentStats = stats.find((row) => row.name === options.opponentName);
                if (!candidateStats || !opponentStats) throw new Error("Replay player statistics missing");
                const completed = adjudicator.completeUpdate(api, {
                    finished: game.isFinished(),
                    defeated: {
                        candidate: candidateStats.defeated,
                        baseline: opponentStats.defeated,
                    },
                });
                terminal = completed.terminal;
                failure = completed.technicalFailure;
                if (updates % 60 === 0) maybeSnapshot();
            }
            if (failure) throw new Error(`Replay endpoint failure ${JSON.stringify(failure)}`);
            if (snapshots[snapshots.length - 1]?.update !== api.getCurrentTick()) maybeSnapshot();
            const buildings = snapshotCombatantBuildings(api, {
                candidate: options.candidateName,
                baseline: options.opponentName,
            });
            const terminalInventory = inventory(api, options.candidateName, options.opponentName);
            return {
                winner: terminal?.winner === "candidate" ? "candidate" :
                    terminal?.winner === "baseline" ? "baseline" : "draw",
                status: terminal?.status ?? "tick_cap_draw",
                updates,
                buildingCounts: {
                    candidate: buildings.filter((row) => row.owner === options.candidateName).length,
                    opponent: buildings.filter((row) => row.owner === options.opponentName).length,
                },
                inventory: terminalInventory,
                quitAttempts: { ...quitAudit.attempts },
                quitForwarded: { ...quitAudit.forwarded },
            } as NormalizedEndpoint;
        },
    );
    const trajectorySha256 = trajectory.digest("hex");
    if (options.expectedTrajectorySha256 && trajectorySha256 !== options.expectedTrajectorySha256) {
        throw new Error(`Replay trajectory mismatch for ${options.policy}`);
    }
    if (!endpointEqual(endpoint, options.expectedEndpoint)) {
        throw new Error(`Replay endpoint mismatch for ${options.policy}`);
    }
    if (renderer && frames.length !== requestedFrames.size) {
        throw new Error(`Replay frame coverage mismatch for ${options.policy}`);
    }
    return {
        campaign: options.campaign,
        policy: options.policy,
        sourceCommit: options.originalSource,
        map: options.map,
        originalJobId: options.originalJobId,
        requestedEngineSeed: options.seed,
        trajectorySha256,
        snapshots,
        endpoint,
        audit: callAudit.finish(),
        history,
        frames,
    };
};

const validatePair = (disabled: ReplayResult, enabled: ReplayResult): void => {
    if (disabled.trajectorySha256 !== enabled.trajectorySha256 ||
        !endpointEqual(disabled.endpoint, enabled.endpoint) ||
        disabled.audit.sha256 !== enabled.audit.sha256 ||
        disabled.audit.callCount !== enabled.audit.callCount ||
        JSON.stringify(disabled.audit.byMethod) !== JSON.stringify(enabled.audit.byMethod)) {
        throw new Error(`Renderer noninterference failed for ${disabled.policy}`);
    }
};

const loadSelection = (file: string, expectedSha256: string): any => {
    if (sha256File(file) !== expectedSha256) throw new Error("Frame replay selection hash drifted");
    const value = JSON.parse(fs.readFileSync(file, "utf8"));
    if (value.kind !== "deterministic-game-frame-selection" || value.complete !== true ||
        value.passed !== true || value.rendererExecuted !== false || !Array.isArray(value.selections) ||
        value.selections.length !== 4) throw new Error("Frame replay selection is ineligible");
    return value;
};

const findSelection = (selection: any, category: string): FrameSelection => {
    const matches = selection.selections.filter((row: FrameSelection) => row.category === category);
    if (matches.length !== 1) throw new Error(`Frame selection missing: ${category}`);
    return matches[0];
};

const cellChecksumValid = (file: string): boolean => {
    const declared = fs.readFileSync(path.join(path.dirname(file), "cell.sha256"), "utf8").trim().split(/\s+/)[0];
    return sha256File(file) === declared;
};

const runCell = async (): Promise<void> => {
    if (process.env.SLURM_JOB_ACCOUNT !== "pi_jss233") throw new Error("Frame replay requires pi_jss233");
    const taskIndex = Number(requiredText("TASK_INDEX", /^[0-2]$/));
    if (process.env.SLURM_ARRAY_TASK_ID !== String(taskIndex)) throw new Error("Frame replay task drifted");
    const out = requiredPath("OUT_PATH");
    const framesRoot = requiredPath("FRAMES_ROOT");
    const programPath = requiredPath("PROGRAM_PATH");
    const programSha256 = requiredText("PROGRAM_SHA256", SHA256);
    const rendererPath = requiredPath("RENDERER_PATH");
    const rendererSha256 = requiredText("RENDERER_SHA256", SHA256);
    const selectionPath = requiredPath("SELECTION_PATH");
    const selectionSha256 = requiredText("SELECTION_SHA256", SHA256);
    const protocolPath = requiredPath("FRAME_PROTOCOL_PATH");
    const protocolSha256 = requiredText("FRAME_PROTOCOL_SHA256", SHA256);
    const amendmentPath = requiredPath("FRAME_AMENDMENT_PATH");
    const amendmentSha256 = requiredText("FRAME_AMENDMENT_SHA256", SHA256);
    const mixDir = requiredPath("MIX_DIR");
    const assetManifestPath = requiredPath("ASSET_MANIFEST_PATH");
    const assetManifestSha256 = requiredText("ASSET_MANIFEST_SHA256", SHA256);
    if (fs.existsSync(out) || fs.existsSync(framesRoot) ||
        sha256File(programPath) !== programSha256 || sha256File(rendererPath) !== rendererSha256 ||
        sha256File(protocolPath) !== protocolSha256 || sha256File(amendmentPath) !== amendmentSha256 ||
        sha256File(assetManifestPath) !== assetManifestSha256 ||
        sha256File(path.join(mixDir, HFO_MAP.name)) !== HFO_MAP.sha256 ||
        sha256File(path.join(mixDir, PEAK_MAP.name)) !== PEAK_MAP.sha256) {
        throw new Error("Frame replay input drifted");
    }
    const selection = loadSelection(selectionPath, selectionSha256);
    const repo = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
    const commit = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
    if (execFileSync("git", ["branch", "--show-current"], { encoding: "utf8" }).trim() !== "main" ||
        execFileSync("git", ["status", "--short", "--untracked-files=no"], { encoding: "utf8" }).trim() ||
        execFileSync("git", ["rev-parse", "fork/main"], { encoding: "utf8" }).trim() !== commit) {
        throw new Error("Frame replay requires clean synchronized main");
    }
    for (const category of ["peak_reciprocal", "hfo_final_building", "hfo_tick_cap"]) {
        const selected = findSelection(selection, category);
        if (!cellChecksumValid(selected.cellPath) ||
            (selected.pairedCellPath && !cellChecksumValid(selected.pairedCellPath))) {
            throw new Error(`Frame selected cell checksum drifted: ${category}`);
        }
    }
    await cdapi.init(mixDir);
    const baselineFactory = await loadBaselineFactory(path.join(repo, "packages", "chronodivide-bot"));
    assertBaseline(baselineFactory.descriptor);
    fs.mkdirSync(framesRoot, { recursive: true, mode: 0o700 });
    const renderer = new GameStateFrameRenderer();
    let result: any;

    if (taskIndex === 0) {
        const selected = findSelection(selection, "peak_reciprocal");
        const deployedRow = selected.pairedRow;
        const confirmedRow = selected.row;
        const deployedOptions = peakProfileOptions(PEAK_PROFILE_ARMS[0]);
        const confirmedOptions = peakProfileOptions(PEAK_PROFILE_ARMS[1]);
        const base = {
            campaign: "peak" as const,
            map: PEAK_MAP,
            country: confirmedRow.country as Countries,
            slot: confirmedRow.candidateSlot as 0 | 1,
            seed: confirmedRow.requestedEngineSeed,
            candidateStart: confirmedRow.candidateStart,
            opponentStart: confirmedRow.opponentStart,
            candidateName: `PeakCandidate_1_${confirmedRow.caseIndex}`,
            opponentName: `PeakOpponent_1_${confirmedRow.caseIndex}`,
            category: "Reciprocal Peak macro profile",
        };
        const deployedSpec: RunReplayOptions = {
            ...base,
            policy: "peak-deployed-weak-only",
            originalJobId: selected.pairedSchedulerJobId,
            originalSource: PEAK_SOURCE,
            expectedTrajectorySha256: deployedRow.trajectorySha256,
            expectedEndpoint: normalizeOriginalEndpoint(deployedRow, "peak"),
            strategyOptions: deployedOptions.strategyOptions,
            botOptions: deployedOptions.botOptions,
            renderUpdates: [],
        };
        const confirmedSpec: RunReplayOptions = {
            ...base,
            policy: "peak-confirmed-strategy-both",
            originalJobId: selected.schedulerJobId,
            originalSource: PEAK_SOURCE,
            expectedTrajectorySha256: confirmedRow.trajectorySha256,
            expectedEndpoint: normalizeOriginalEndpoint(confirmedRow, "peak"),
            strategyOptions: confirmedOptions.strategyOptions,
            botOptions: confirmedOptions.botOptions,
            renderUpdates: [],
        };
        const deployedOff = await runReplay(deployedSpec, repo, mixDir, baselineFactory, null);
        const confirmedOff = await runReplay(confirmedSpec, repo, mixDir, baselineFactory, null);
        const divergenceUpdate = firstDivergenceUpdate(deployedOff.snapshots, confirmedOff.snapshots);
        if (divergenceUpdate === null) throw new Error("Peak registered trajectory divergence is absent");
        const frameUpdates = registeredPeakFrameUpdates(divergenceUpdate);
        const deployedOn = await runReplay({ ...deployedSpec, renderUpdates: frameUpdates, framesRoot },
            repo, mixDir, baselineFactory, renderer);
        const confirmedOn = await runReplay({ ...confirmedSpec, renderUpdates: frameUpdates, framesRoot },
            repo, mixDir, baselineFactory, renderer);
        validatePair(deployedOff, deployedOn);
        validatePair(confirmedOff, confirmedOn);
        result = {
            category: "peak_reciprocal",
            selectionSha256: selected.selectionSha256,
            divergenceUpdate,
            frameUpdates,
            disabled: [deployedOff, confirmedOff],
            enabled: [deployedOn, confirmedOn],
            frames: [...deployedOn.frames, ...confirmedOn.frames],
            omitted: false,
        };
    } else {
        const category = taskIndex === 1 ? "hfo_final_building" : "hfo_tick_cap";
        const selected = findSelection(selection, category);
        const row = selected.row;
        const frameUpdates = taskIndex === 1 ?
            registeredHfoFinalFrameUpdates(row.ticks) : [72_000, 81_000, 90_000];
        const replaySpec: RunReplayOptions = {
            campaign: "hfo",
            policy: taskIndex === 1 ? "hfo-confirmed-final-building" : "hfo-confirmed-tick-cap",
            map: HFO_MAP,
            country: row.country as Countries,
            slot: row.candidateSlot as 0 | 1,
            seed: row.requestedEngineSeed,
            candidateStart: row.candidateStart,
            opponentStart: row.baselineStart,
            candidateName: `ConfirmCandidate_${row.caseIndex}`,
            opponentName: `ConfirmBaseline_${row.caseIndex}`,
            originalJobId: selected.schedulerJobId,
            originalSource: HFO_SOURCE,
            expectedEndpoint: normalizeOriginalEndpoint(row, "hfo"),
            strategyOptions: { peakOfPerfectionProfileScope: "weak_only" },
            botOptions: { peakOfPerfectionProfileScope: "weak_only" },
            renderUpdates: [],
            category: taskIndex === 1 ? "Literal final-building elimination" : "HFO tick-cap limitation",
        };
        const disabled = await runReplay(replaySpec, repo, mixDir, baselineFactory, null);
        const clearance = taskIndex === 1 ? disabled.history.find((current, index, rows) => {
            const previous = rows[index - 1];
            return !!previous && previous.opponentCombatants > 0 && current.opponentCombatants === 0 &&
                current.opponentBuildings > 0 && disabled.endpoint.updates - current.update <= 2_400;
        }) : undefined;
        const enabled = await runReplay({ ...replaySpec, renderUpdates: frameUpdates, framesRoot },
            repo, mixDir, baselineFactory, renderer);
        validatePair(disabled, enabled);
        let clearanceEnabled: ReplayResult | null = null;
        let clearanceFrameUpdates: number[] = [];
        if (clearance) {
            clearanceFrameUpdates = [clearance.update - 300, clearance.update,
                Math.min(clearance.update + 600, disabled.endpoint.updates)];
            if (clearanceFrameUpdates[0] < 0 || new Set(clearanceFrameUpdates).size !== 3) {
                throw new Error("HFO force-clearance frame plan is ineligible");
            }
            clearanceEnabled = await runReplay({ ...replaySpec,
                policy: "hfo-confirmed-force-clearance",
                category: "HFO force-clearance transition",
                renderUpdates: clearanceFrameUpdates,
                framesRoot,
            }, repo, mixDir, baselineFactory, renderer);
            validatePair(disabled, clearanceEnabled);
        }
        result = {
            category,
            selectionSha256: selected.selectionSha256,
            frameUpdates,
            disabled,
            enabled,
            clearanceEnabled,
            frames: [...enabled.frames, ...(clearanceEnabled?.frames ?? [])],
            omitted: false,
            forceClearance: taskIndex === 1 ? {
                retained: !!clearance,
                eventUpdate: clearance?.update ?? null,
                frameUpdates: clearanceFrameUpdates,
                reason: clearance ? "registered transition present" : "same selected case has no registered transition",
            } : undefined,
        };
    }

    const artifact = {
        schemaVersion: 1,
        kind: "deterministic-game-frame-replay-cell",
        status: "PASS_DETERMINISTIC_GAME_FRAME_REPLAY_CELL",
        complete: true,
        passed: true,
        taskIndex,
        schedulerAccount: "pi_jss233",
        schedulerJobId: process.env.SLURM_JOB_ID,
        sourceCommit: commit,
        programSha256,
        rendererSha256,
        selectionSha256,
        protocolSha256,
        amendmentSha256,
        assetManifestSha256,
        baselineCommit: BASELINE_COMMIT,
        result,
    };
    fs.writeFileSync(out, JSON.stringify(artifact, null, 2) + "\n", { flag: "wx", mode: 0o600 });
    console.log(JSON.stringify({
        status: artifact.status,
        taskIndex,
        category: result.category,
        frames: result.frames.length,
        forceClearance: result.forceClearance ?? null,
    }));
};

const completedTasks = (arrayJobId: string): Map<number, string> => {
    const raw = execFileSync("/opt/slurm/current/bin/sacct",
        ["-j", arrayJobId, "-n", "-P", "-X", "--format=JobID,JobIDRaw,State,ExitCode,Account"],
        { encoding: "utf8" });
    const tasks = new Map<number, string>();
    for (const line of raw.split("\n").filter(Boolean)) {
        const [label, rawId, state, exitCode, account] = line.split("|");
        const match = new RegExp(`^${arrayJobId}_(\\d+)$`).exec(label);
        if (match && state === "COMPLETED" && exitCode === "0:0" && account === "pi_jss233") {
            tasks.set(Number(match[1]), rawId);
        }
    }
    return tasks;
};

const finalize = (): void => {
    if (process.env.SLURM_JOB_ACCOUNT !== "pi_jss233") throw new Error("Frame finalizer requires pi_jss233");
    const root = requiredPath("RESULTS_ROOT");
    const out = requiredPath("OUT_PATH");
    const arrayJobId = requiredText("ARRAY_JOB_ID", /^\d+$/);
    const programSha256 = requiredText("PROGRAM_SHA256", SHA256);
    const cellProgramSha256 = requiredText("CELL_PROGRAM_SHA256", SHA256);
    const rendererSha256 = requiredText("RENDERER_SHA256", SHA256);
    const selectionSha256 = requiredText("SELECTION_SHA256", SHA256);
    const protocolSha256 = requiredText("FRAME_PROTOCOL_SHA256", SHA256);
    const amendmentSha256 = requiredText("FRAME_AMENDMENT_SHA256", SHA256);
    const assetManifestSha256 = requiredText("ASSET_MANIFEST_SHA256", SHA256);
    const commit = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
    if (fs.existsSync(out)) throw new Error("Frame finalizer output exists");
    let tasks = new Map<number, string>();
    for (let attempt = 0; attempt < 31; attempt += 1) {
        tasks = completedTasks(arrayJobId);
        if (tasks.size === 3) break;
        if (attempt < 30) execFileSync("sleep", ["2"]);
    }
    if (tasks.size !== 3) throw new Error(`Frame replay scheduler ${tasks.size}/3`);
    const cells: any[] = [];
    for (let taskIndex = 0; taskIndex < 3; taskIndex += 1) {
        const taskRoot = path.join(root, `task-${String(taskIndex).padStart(3, "0")}`);
        const file = path.join(taskRoot, "cell.json");
        const declared = fs.readFileSync(path.join(taskRoot, "cell.sha256"), "utf8").trim().split(/\s+/)[0];
        if (sha256File(file) !== declared) throw new Error(`Frame cell checksum ${taskIndex}`);
        const cell = JSON.parse(fs.readFileSync(file, "utf8"));
        if (cell.kind !== "deterministic-game-frame-replay-cell" || cell.complete !== true ||
            cell.passed !== true || cell.taskIndex !== taskIndex ||
            String(cell.schedulerJobId) !== tasks.get(taskIndex) ||
            cell.schedulerAccount !== "pi_jss233" || cell.programSha256 !== cellProgramSha256 ||
            cell.rendererSha256 !== rendererSha256 || cell.selectionSha256 !== selectionSha256 ||
            cell.protocolSha256 !== protocolSha256 || cell.amendmentSha256 !== amendmentSha256 ||
            cell.assetManifestSha256 !== assetManifestSha256 || cell.sourceCommit !== commit ||
            cell.baselineCommit !== BASELINE_COMMIT) {
            throw new Error(`Frame cell identity ${taskIndex}`);
        }
        for (const frame of cell.result.frames) {
            if (sha256File(frame.file) !== frame.pngSha256) throw new Error(`Frame PNG checksum ${frame.file}`);
        }
        cells.push(cell);
    }
    const frames = cells.flatMap((cell) => cell.result.frames);
    const paths = new Set(frames.map((frame: RenderedFrame) => frame.file));
    const forceClearance = cells[1].result.forceClearance;
    const expectedFrameCount = 12 + (forceClearance.retained ? 3 : 0);
    if (frames.length !== expectedFrameCount || paths.size !== expectedFrameCount) {
        throw new Error("Frame manifest coverage drifted");
    }
    const artifact = {
        schemaVersion: 1,
        kind: "deterministic-game-frame-replay-finalizer",
        status: "PASS_DETERMINISTIC_GAME_FRAME_REPLAY",
        complete: true,
        passed: true,
        schedulerAccount: "pi_jss233",
        arrayJobId,
        finalizerJobId: process.env.SLURM_JOB_ID,
        sourceCommit: cells[0].sourceCommit,
        programSha256,
        cellProgramSha256,
        rendererSha256,
        selectionSha256,
        protocolSha256,
        amendmentSha256,
        assetManifestSha256,
        baselineCommit: BASELINE_COMMIT,
        taskCount: 3,
        replayCount: 8 + (forceClearance.retained ? 1 : 0),
        frameCount: frames.length,
        retainedCategories: [
            "peak_reciprocal",
            "hfo_final_building",
            "hfo_tick_cap",
            ...(forceClearance.retained ? ["hfo_force_clearance"] : []),
        ],
        omittedCategories: [
            ...(forceClearance.retained ? [] : [{
                category: "hfo_force_clearance",
                reason: forceClearance.reason,
            }]),
            {
                category: "advanced_transfer",
                reason: "Protocol amendment 1 omits V1.",
            },
        ],
        frames,
        cells: cells.map((cell) => ({
            taskIndex: cell.taskIndex,
            schedulerJobId: cell.schedulerJobId,
            category: cell.result.category,
            result: cell.result,
        })),
    };
    fs.mkdirSync(path.dirname(out), { recursive: true, mode: 0o700 });
    fs.writeFileSync(out, JSON.stringify(artifact, null, 2) + "\n", { flag: "wx", mode: 0o600 });
    console.log(JSON.stringify({
        status: artifact.status,
        replayCount: artifact.replayCount,
        frameCount: artifact.frameCount,
        retainedCategories: artifact.retainedCategories,
        omittedCategories: artifact.omittedCategories,
    }));
};

const main = async (): Promise<void> => {
    const mode = requiredText("MODE", /^(cell|finalize)$/);
    if (mode === "cell") await runCell();
    else finalize();
};

const invoked = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (import.meta.url === invoked) {
    main().catch((error) => {
        console.error(error);
        process.exitCode = 1;
    });
}
