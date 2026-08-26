import { Bot, CreateOfflineOpts, GameApi, ObjectType, OrderType, UnitData, cdapi } from
    "@chronodivide/game-api";
import { Countries } from "@supalosa/chronodivide-bot/dist/bot/logic/common/utils.js";
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { BaselineFactory, InspectableBaselineBot, loadBaselineFactory } from "../benchmark/baselineLoader.js";
import { createExperimentManifest } from "../benchmark/provenance.js";
import { withSeededOfflineGame } from "../benchmark/seededOfflineGame.js";
import { decorateExternalBaselineLifecycle, ExternalBaselineLifecycleOverlay } from
    "./externalBaselineLifecycleDecorator.js";
import { AdvancedWestCandidate, AdvancedWestTargetMode, HFO_ADVANCED_V5_COUNTRIES, HFO_ADVANCED_V5_SPEC,
    sampledAdvancedWestCandidates } from "./hfoAdvancedDecoratedOptimizer.js";
import { LiteralBuildingEliminationAdjudicator, installLiteralEndpointInstrumentation,
    snapshotCombatantBuildings } from "./literalBuildingEliminationEndpoint.js";
import { RA2WEB_CLIENT_COMMIT, RA2WEB_CLIENT_RELEASE_ID, RA2WEB_FREEZE_MANIFEST_SHA256,
    createInspectableRa2WebBot, loadRa2WebOpponent } from "./ra2WebOpponentBundle.js";

const MAP = { name: "cd_chrono_4_heck_freezes_over_le.map",
    sha256: "e4dfc736a6355e0e68d4681e4d67419516e6bb94549e2d42880c9414e95e2e8d" } as const;
const BASELINE_COMMIT = "165b77a71d0cf5ebd27c65b19d0486bcbae78d0f";
const ADVANCED_SHA256 = "81d8797b6dd1371ba2dcbd79e25df8b42254290c820159e121a82650fd97a143";
const MASTER_SELECTION_SHA256 = "5ab1006be7d323d32a75bf0004303a062834827f58f4dee07aec3eac8df04cb0";
const SHA256 = /^[0-9a-f]{64}$/;
const STARTS = ["39,82", "151,119", "88,34", "88,157"] as const;
const WEST = STARTS[0], EAST = STARTS[1];
const ALLIED = new Set<Countries>(HFO_ADVANCED_V5_COUNTRIES.slice(0, 5));
type Winner = "first" | "opponent" | "draw";
type SelectedCase = { populationId: string; populationCaseIndex: number; country: Countries;
    desiredStart: typeof STARTS[number]; desiredOppositeStart: typeof STARTS[number]; candidateSlot: 0 | 1;
    requestedEngineSeed: number; candidateStart: string; opponentStart: string };
export const HFO_ADVANCED_V5_STAGE_DESIGNS = [
    { stageIndex: 0, casesPerRun: 18, candidateCount: 24, survivorCount: 6, armCount: 25, taskCount: 1_350 },
    { stageIndex: 1, casesPerRun: 36, candidateCount: 6, survivorCount: 2, armCount: 7, taskCount: 756 },
    { stageIndex: 2, casesPerRun: 72, candidateCount: 2, survivorCount: 1, armCount: 3, taskCount: 648 },
] as const;
export const advancedWestConfigSha256 = (candidate: AdvancedWestCandidate): string =>
    crypto.createHash("sha256").update(JSON.stringify(candidate)).digest("hex");

const requiredPath = (name: string): string => {
    const value = process.env[name]; if (!value) throw new Error(`${name} is required`); return path.resolve(value);
};
const requiredText = (name: string, pattern: RegExp): string => {
    const value = process.env[name]; if (!value || !pattern.test(value)) throw new Error(`${name} is invalid`); return value;
};
const sha256File = (filePath: string): string =>
    crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
const isRecord = (value: unknown): value is Record<string, unknown> =>
    !!value && typeof value === "object" && !Array.isArray(value);
const startKey = (point: { x: number; y: number }): string => `${point.x},${point.y}`;
const distanceSquared = (left: { tile: { rx: number; ry: number } }, right: { tile: { rx: number; ry: number } }) =>
    (left.tile.rx - right.tile.rx) ** 2 + (left.tile.ry - right.tile.ry) ** 2;
const sourceIdentity = () => {
    const repo = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
    const commit = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
    if (execFileSync("git", ["branch", "--show-current"], { encoding: "utf8" }).trim() !== "main" ||
        execFileSync("git", ["status", "--short", "--untracked-files=no"], { encoding: "utf8" }).trim() !== "" ||
        execFileSync("git", ["rev-parse", "fork/main"], { encoding: "utf8" }).trim() !== commit)
        throw new Error("V5 Stage B requires clean synchronized main");
    return { repo, commit };
};
const commonInputs = () => {
    if (process.env.SLURM_JOB_ACCOUNT !== "pi_jss233") throw new Error("V5 Stage B requires pi_jss233");
    const mixDir = requiredPath("MIX_DIR"), protocolPath = requiredPath("PROTOCOL_PATH");
    const assetManifestPath = requiredPath("ASSET_MANIFEST_PATH"), freezeRoot = requiredPath("RA2WEB_FREEZE_ROOT");
    const protocolSha256 = requiredText("PROTOCOL_SHA256", SHA256),
        assetManifestSha256 = requiredText("ASSET_MANIFEST_SHA256", SHA256);
    if (sha256File(protocolPath) !== protocolSha256 || sha256File(assetManifestPath) !== assetManifestSha256 ||
        sha256File(path.join(mixDir, MAP.name)) !== MAP.sha256) throw new Error("V5 Stage B input drifted");
    const manifest = JSON.parse(fs.readFileSync(assetManifestPath, "utf8")) as unknown;
    if (!isRecord(manifest) || manifest.kind !== "private-ra2-snow-runtime" ||
        path.resolve(String(manifest.runtimeDirectory)) !== mixDir) throw new Error("V5 Stage B runtime drifted");
    return { mixDir, protocolSha256, assetManifestSha256, freezeRoot };
};
const assertExternalBaseline = (factory: BaselineFactory): void => {
    const descriptor = factory.descriptor;
    if (descriptor.kind !== "external-package" || typeof descriptor.packageRoot !== "string")
        throw new Error("V5 Stage B baseline is not external");
    const packageRoot = path.resolve(descriptor.packageRoot);
    const repo = execFileSync("git", ["-C", packageRoot, "rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
    if (execFileSync("git", ["-C", repo, "rev-parse", "HEAD"], { encoding: "utf8" }).trim() !== BASELINE_COMMIT ||
        execFileSync("git", ["-C", repo, "status", "--short", "--untracked-files=no"], { encoding: "utf8" }).trim() ||
        packageRoot !== path.join(repo, "packages", "chronodivide-bot")) throw new Error("V5 baseline drifted");
};
const loadAdvanced = (freezeRoot: string) => {
    const loaded = loadRa2WebOpponent(freezeRoot, "ra2web_advanced_old_priest");
    if (loaded.freezeManifestSha256 !== RA2WEB_FREEZE_MANIFEST_SHA256 || loaded.bundleSha256 !== ADVANCED_SHA256)
        throw new Error("V5 Advanced identity drifted");
    return loaded;
};
const settings = (first: Bot, opponent: Bot, slot: 0 | 1): CreateOfflineOpts => {
    const gameMode = cdapi.getAvailableGameModes(MAP.name)[0]; if (!gameMode) throw new Error("V5 mode unavailable");
    return { buildOffAlly: false, cratesAppear: false, credits: 10_000, gameMode, gameSpeed: 6,
        mapName: MAP.name, mcvRepacks: true, shortGame: false, superWeapons: false, unitCount: 0, online: false,
        agents: slot === 0 ? [first, opponent] : [opponent, first] };
};
const inspectableApi = (bot: InspectableBaselineBot): GameApi => {
    if (!bot.lastGameApi) throw new Error("V5 Stage B GameApi unavailable"); return bot.lastGameApi;
};
const loadMasterSelection = (selectionPath: string, selectionSha256: string,
    inputs: ReturnType<typeof commonInputs>): SelectedCase[] => {
    if (selectionSha256 !== MASTER_SELECTION_SHA256 || sha256File(selectionPath) !== MASTER_SELECTION_SHA256)
        throw new Error("V5 Stage B master selection hash drifted");
    const value = JSON.parse(fs.readFileSync(selectionPath, "utf8")) as any;
    if (value.kind !== "hfo-advanced-v5-master-selection" || value.complete !== true || value.passed !== true ||
        value.outcomeFree !== true || value.updateCount !== 0 || value.protocolSha256 !== inputs.protocolSha256 ||
        value.assetManifestSha256 !== inputs.assetManifestSha256 || value.baselineCommit !== BASELINE_COMMIT ||
        value.ra2webClientCommit !== RA2WEB_CLIENT_COMMIT || value.ra2webClientReleaseId !== RA2WEB_CLIENT_RELEASE_ID ||
        value.freezeManifestSha256 !== RA2WEB_FREEZE_MANIFEST_SHA256 || value.advancedBundleSha256 !== ADVANCED_SHA256 ||
        !Array.isArray(value.forbiddenOutcomeFields) || value.forbiddenOutcomeFields.length !== 0 ||
        !Array.isArray(value.cases) || value.cases.length !== HFO_ADVANCED_V5_SPEC.selectedCaseCount)
        throw new Error("V5 Stage B master selection is ineligible");
    return value.cases as SelectedCase[];
};
const loadPrevious = (stageIndex: number): any | null => {
    if (stageIndex === 0) {
        if (process.env.PREVIOUS_PATH || process.env.PREVIOUS_SHA256) throw new Error("Stage 0 has a previous artifact");
        return null;
    }
    const previousPath = requiredPath("PREVIOUS_PATH"), previousSha256 = requiredText("PREVIOUS_SHA256", SHA256);
    if (sha256File(previousPath) !== previousSha256) throw new Error("V5 previous-stage hash drifted");
    const value = JSON.parse(fs.readFileSync(previousPath, "utf8"));
    if (value.kind !== "hfo-advanced-v5-optimizer-stage" || value.complete !== true || value.passed !== true ||
        value.stageIndex !== stageIndex - 1 || value.protocolSha256 !== commonInputs().protocolSha256 ||
        value.selectionSha256 !== MASTER_SELECTION_SHA256 || !Array.isArray(value.runs) || value.runs.length !== 3)
        throw new Error("V5 previous stage is ineligible");
    return value;
};
const stageCandidates = (stageIndex: number, runIndex: number, previous: any | null): Array<AdvancedWestCandidate | null> => {
    if (stageIndex === 0) return [null, ...sampledAdvancedWestCandidates(runIndex)];
    const run = previous?.runs.find((row: any) => row.runIndex === runIndex);
    const expected = HFO_ADVANCED_V5_STAGE_DESIGNS[stageIndex].candidateCount;
    if (!run || !Array.isArray(run.survivors) || run.survivors.length !== expected)
        throw new Error(`V5 stage ${stageIndex} run ${runIndex} survivors drifted`);
    return [null, ...run.survivors.map((row: any) => row.candidate as AdvancedWestCandidate)];
};

const visibleUnits = (game: GameApi, playerName: string, relation: "self" | "enemy",
    filter: (unit: UnitData) => boolean): UnitData[] => game.getVisibleUnits(playerName, relation)
        .map((id) => game.getUnitData(id)).filter((unit): unit is UnitData => !!unit && filter(unit));
const isCombatant = (unit: UnitData): boolean => !!unit.rules.isSelectableCombatant && !unit.rules.harvester &&
    unit.rules.type !== ObjectType.Building;
const isDog = (unit: UnitData): boolean => unit.rules.name === "DOG" || unit.rules.name === "ADOG";
const isProductionBuilding = (unit: UnitData): boolean => unit.rules.type === ObjectType.Building &&
    (unit.rules.constructionYard || unit.rules.weaponsFactory || unit.rules.gdiBarracks || unit.rules.nodBarracks);
const nearest = (units: UnitData[], references: UnitData[]): UnitData | null => units.slice().sort((left, right) => {
    const leftDistance = references.reduce((best, unit) => Math.min(best, distanceSquared(left, unit)), Infinity);
    const rightDistance = references.reduce((best, unit) => Math.min(best, distanceSquared(right, unit)), Infinity);
    return leftDistance - rightDistance || left.id - right.id;
})[0] ?? null;
export const selectAdvancedWestTarget = (mode: AdvancedWestTargetMode, attackers: UnitData[],
    combatants: UnitData[], buildings: UnitData[]): UnitData | null => {
    const production = buildings.filter(isProductionBuilding);
    if (mode === "terminal_race" && buildings.length === 1) return buildings[0];
    if (mode === "production_first" && production.length > 0) return nearest(production, attackers);
    if (combatants.length > 0) return nearest(combatants, attackers);
    if (production.length > 0) return nearest(production, attackers);
    return nearest(buildings, attackers);
};
export const createAdvancedWestOverlay = (candidate: AdvancedWestCandidate, firstName: string, opponentName: string):
    ExternalBaselineLifecycleOverlay => {
    let active = false;
    return {
        afterGameStart(game) {
            active = startKey(game.getPlayerData(firstName).startLocation) === WEST &&
                startKey(game.getPlayerData(opponentName).startLocation) === EAST;
        },
        afterGameTick(game, bot) {
            const tick = game.getCurrentTick(); if (!active || tick % 24 !== 0) return;
            const actions = bot.lastPlayerActions; if (!actions) throw new Error("V5 overlay actions unavailable");
            const own = visibleUnits(game, firstName, "self", (unit) => isCombatant(unit) && !isDog(unit))
                .sort((left, right) => left.id - right.id);
            const enemies = visibleUnits(game, firstName, "enemy", isCombatant).sort((left, right) => left.id - right.id);
            const buildings = visibleUnits(game, firstName, "enemy", (unit) => unit.rules.type === ObjectType.Building)
                .sort((left, right) => left.id - right.id);
            const defended = new Set<number>();
            if (candidate.defense !== "off" && enemies.length > 0) {
                const radius = candidate.defense === "compact" ? 42 : 60;
                const maximum = candidate.defense === "compact" ? 18 : 36;
                const start = game.getPlayerData(firstName).startLocation;
                const threats = enemies.filter((unit) => (unit.tile.rx - start.x) ** 2 + (unit.tile.ry - start.y) ** 2 <= radius ** 2);
                const threat = threats.sort((left, right) => left.id - right.id)[0];
                if (threat) {
                    const defenders = own.slice().sort((left, right) => distanceSquared(left, threat) -
                        distanceSquared(right, threat) || left.id - right.id).slice(0, maximum);
                    defenders.forEach((unit) => defended.add(unit.id));
                    if (defenders.length > 0) actions.orderUnits(defenders.map((unit) => unit.id), OrderType.Attack, threat.id);
                }
            }
            if (tick < candidate.minTick || own.length < candidate.minCombatants ||
                own.length - enemies.length < candidate.combatantAdvantage) return;
            const attackers = own.filter((unit) => !defended.has(unit.id)); if (attackers.length === 0) return;
            const target = selectAdvancedWestTarget(candidate.targetMode, attackers, enemies, buildings);
            if (target) actions.orderUnits(attackers.map((unit) => unit.id), OrderType.Attack, target.id);
            else {
                const opponentStart = game.getPlayerData(opponentName).startLocation;
                actions.orderUnits(attackers.map((unit) => unit.id), OrderType.AttackMove, opponentStart.x, opponentStart.y);
            }
        },
    };
};

const canonicalSnapshot = (game: GameApi, firstName: string, opponentName: string) => {
    const units = game.getAllUnits().map((id) => game.getUnitData(id)).filter((unit): unit is UnitData => !!unit)
        .filter((unit) => unit.owner === firstName || unit.owner === opponentName).map((unit) => ({
            owner: unit.owner === firstName ? "first" : "opponent", rule: unit.rules.name, type: unit.rules.type,
            hitPoints: unit.hitPoints, x: unit.tile.rx, y: unit.tile.ry,
        })).sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
    return { tick: game.getCurrentTick(), credits: { first: game.getPlayerData(firstName).credits,
        opponent: game.getPlayerData(opponentName).credits }, units };
};
const inventory = (game: GameApi, firstName: string, opponentName: string) => {
    const units = game.getAllUnits().map((id) => game.getUnitData(id)).filter((unit): unit is UnitData => !!unit)
        .filter((unit) => unit.owner === firstName || unit.owner === opponentName);
    const summarize = (owner: string) => Object.fromEntries([...new Set(units.filter((unit) => unit.owner === owner)
        .map((unit) => unit.rules.name))].sort().map((name) => [name,
            units.filter((unit) => unit.owner === owner && unit.rules.name === name).length]));
    return { first: summarize(firstName), opponent: summarize(opponentName) };
};

const runCell = async (): Promise<void> => {
    const stageIndex = Number(requiredText("STAGE_INDEX", /^[0-2]$/)),
        taskIndex = Number(requiredText("TASK_INDEX", /^\d+$/)), outputPath = requiredPath("OUT_PATH");
    const design = HFO_ADVANCED_V5_STAGE_DESIGNS[stageIndex], inputs = commonInputs();
    const programPath = requiredPath("PROGRAM_PATH"), programSha256 = requiredText("PROGRAM_SHA256", SHA256);
    const selectionPath = requiredPath("SELECTION_PATH"), selectionSha256 = requiredText("SELECTION_SHA256", SHA256);
    if (!design || taskIndex < 0 || taskIndex >= design.taskCount || process.env.SLURM_ARRAY_TASK_ID !== String(taskIndex) ||
        fs.existsSync(outputPath) || sha256File(programPath) !== programSha256) throw new Error("V5 stage cell drifted");
    const previous = loadPrevious(stageIndex), runSpan = design.armCount * design.casesPerRun;
    const runIndex = Math.floor(taskIndex / runSpan), withinRun = taskIndex % runSpan,
        armIndex = Math.floor(withinRun / design.casesPerRun), caseIndex = withinRun % design.casesPerRun;
    const configs = stageCandidates(stageIndex, runIndex, previous), candidate = configs[armIndex];
    if (runIndex > 2 || candidate === undefined) throw new Error("V5 stage assignment drifted");
    const cases = loadMasterSelection(selectionPath, selectionSha256, inputs)
        .filter((entry) => entry.populationId === `run-${runIndex}-stage-${stageIndex}`)
        .sort((left, right) => left.populationCaseIndex - right.populationCaseIndex);
    const caseSpec = cases[caseIndex]; if (!caseSpec || cases.length !== design.casesPerRun)
        throw new Error("V5 stage population drifted");
    const { repo, commit } = sourceIdentity(); await cdapi.init(inputs.mixDir);
    const factory = await loadBaselineFactory(path.join(repo, "packages", "chronodivide-bot")); assertExternalBaseline(factory);
    const loadedAdvanced = loadAdvanced(inputs.freezeRoot), configSha256 = candidate ? advancedWestConfigSha256(candidate) : "control";
    const firstName = `V5StageFirst_${stageIndex}_${runIndex}_${caseIndex}`,
        opponentName = `V5StageAdvanced_${stageIndex}_${runIndex}_${caseIndex}`;
    const rawFirst = factory.create(firstName, caseSpec.country);
    const first = decorateExternalBaselineLifecycle(rawFirst,
        candidate ? createAdvancedWestOverlay(candidate, firstName, opponentName) : {});
    const opponent = createInspectableRa2WebBot(loadedAdvanced, opponentName, caseSpec.country);
    const adjudicator = new LiteralBuildingEliminationAdjudicator({ candidate: firstName, baseline: opponentName });
    const { audit } = installLiteralEndpointInstrumentation({ candidate: first, baseline: opponent }, adjudicator);
    const result = await withSeededOfflineGame(cdapi, settings(first, opponent, caseSpec.candidateSlot),
        caseSpec.requestedEngineSeed, [{ agent: first, identity: "first" }, { agent: opponent, identity: "opponent" }],
        async (game) => {
            const api = inspectableApi(first);
            if (startKey(api.getPlayerData(firstName).startLocation) !== caseSpec.desiredStart ||
                startKey(api.getPlayerData(opponentName).startLocation) !== caseSpec.desiredOppositeStart)
                throw new Error("V5 stage selected start drifted");
            const trajectory = crypto.createHash("sha256"); let lastSnapshot = -1;
            const snapshot = () => { trajectory.update(JSON.stringify(canonicalSnapshot(api, firstName, opponentName)) + "\n");
                lastSnapshot = api.getCurrentTick(); };
            snapshot(); let updates = 0, terminal: any = null, failure: any = null;
            while (updates < HFO_ADVANCED_V5_SPEC.maxTicks && !terminal && !failure) {
                adjudicator.beginUpdate(api); await game.update(); updates += 1;
                const stats = game.getPlayerStats(), firstStats = stats.find((row) => row.name === firstName),
                    opponentStats = stats.find((row) => row.name === opponentName);
                if (!firstStats || !opponentStats) throw new Error("V5 stage statistics unavailable");
                const endpoint = adjudicator.completeUpdate(api, { finished: game.isFinished(), defeated: {
                    candidate: firstStats.defeated, baseline: opponentStats.defeated } });
                terminal = endpoint.terminal; failure = endpoint.technicalFailure;
                if (updates % HFO_ADVANCED_V5_SPEC.snapshotInterval === 0) snapshot();
            }
            if (failure) throw new Error(`V5 stage endpoint failure ${JSON.stringify(failure)}`);
            if (lastSnapshot !== api.getCurrentTick()) snapshot();
            const buildings = snapshotCombatantBuildings(api, { candidate: firstName, baseline: opponentName });
            const winner: Winner = terminal?.winner === "candidate" ? "first" :
                terminal?.winner === "baseline" ? "opponent" : "draw";
            return { stageIndex, taskIndex, runIndex, armIndex, caseIndex,
                populationId: caseSpec.populationId, populationCaseIndex: caseSpec.populationCaseIndex,
                configSha256, candidate, country: caseSpec.country, faction: ALLIED.has(caseSpec.country) ? "Allied" : "Soviet",
                candidateSlot: caseSpec.candidateSlot, requestedEngineSeed: caseSpec.requestedEngineSeed,
                candidateStart: caseSpec.desiredStart, opponentStart: caseSpec.desiredOppositeStart, updates,
                status: terminal?.status ?? "tick_cap_draw", winner, trajectorySha256: trajectory.digest("hex"),
                terminalBuildingCounts: { first: buildings.filter((row) => row.owner === firstName).length,
                    opponent: buildings.filter((row) => row.owner === opponentName).length },
                terminalUnitInventory: inventory(api, firstName, opponentName), quitAttempts: { ...audit.attempts },
                quitForwarded: { ...audit.forwarded } };
        });
    const provenance = createExperimentManifest({ runId: `hfo-advanced-v5-stage-${stageIndex}-${taskIndex}-${process.env.SLURM_JOB_ID}`,
        mixDir: inputs.mixDir, maps: [MAP.name], effectiveConfig: { stageIndex, runIndex, armIndex, candidate,
            configSha256, caseSpec, selectionSha256 }, baseline: factory.descriptor,
        gameSeedBase: caseSpec.requestedEngineSeed });
    const artifact = { schemaVersion: 1, kind: "hfo-advanced-v5-optimizer-cell",
        status: "COMPLETE_HFO_ADVANCED_V5_OPTIMIZER_CELL", complete: true, stageIndex, taskIndex, runIndex, armIndex,
        caseIndex, configSha256, schedulerAccount: "pi_jss233", schedulerJobId: process.env.SLURM_JOB_ID,
        sourceCommit: commit, programSha256, protocolSha256: inputs.protocolSha256,
        assetManifestSha256: inputs.assetManifestSha256, selectionSha256, baselineCommit: BASELINE_COMMIT,
        ra2webClientCommit: RA2WEB_CLIENT_COMMIT, ra2webClientReleaseId: RA2WEB_CLIENT_RELEASE_ID,
        freezeManifestSha256: loadedAdvanced.freezeManifestSha256, advancedBundleSha256: loadedAdvanced.bundleSha256,
        result, provenance };
    fs.mkdirSync(path.dirname(outputPath), { recursive: true, mode: 0o700 });
    fs.writeFileSync(outputPath, JSON.stringify(artifact, null, 2) + "\n", { flag: "wx", mode: 0o600 });
    console.log(JSON.stringify({ status: artifact.status, stageIndex, taskIndex, runIndex, armIndex, caseIndex }));
};

const completedTasks = (arrayJobId: string): Map<number, string> => {
    const raw = execFileSync("/opt/slurm/current/bin/sacct",
        ["-j", arrayJobId, "-n", "-P", "-X", "--format=JobID,JobIDRaw,State,ExitCode,Account"], { encoding: "utf8" });
    const tasks = new Map<number, string>();
    for (const line of raw.split("\n").filter(Boolean)) {
        const [label, rawId, state, exitCode, account] = line.split("|"),
            match = new RegExp(`^${arrayJobId}_(\\d+)$`).exec(label);
        if (match && state === "COMPLETED" && exitCode === "0:0" && account === "pi_jss233")
            tasks.set(Number(match[1]), rawId);
    }
    return tasks;
};
const score = (winner: Winner): number => winner === "first" ? 1 : winner === "draw" ? 0.5 : 0;
const sampleSd = (values: number[]): number => {
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
    return Math.sqrt(values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (values.length - 1));
};
const wilsonLower = (wins: number, games: number): number => {
    const z = 1.6448536269514722, p = wins / games, z2 = z * z;
    return (p + z2 / (2 * games) - z * Math.sqrt(p * (1 - p) / games + z2 / (4 * games * games))) /
        (1 + z2 / games);
};
const summarize = (rows: any[]) => {
    const wins = rows.filter((row) => row.winner === "first").length,
        losses = rows.filter((row) => row.winner === "opponent").length, draws = rows.length - wins - losses;
    return { games: rows.length, wins, draws, losses, winRate: wins / rows.length,
        oneSided95WilsonLower: wilsonLower(wins, rows.length) };
};
const exactFields = ["trajectorySha256", "winner", "status", "updates", "terminalBuildingCounts",
    "terminalUnitInventory", "quitAttempts", "quitForwarded"];
const analyze = (candidateRows: any[], controlRows: any[], tCritical: number) => {
    const controlByCase = new Map(controlRows.map((row) => [`${row.populationId}:${row.populationCaseIndex}`, row]));
    const pairs = candidateRows.map((row) => {
        const control = controlByCase.get(`${row.populationId}:${row.populationCaseIndex}`);
        if (!control) throw new Error(`V5 control missing for ${row.populationId}:${row.populationCaseIndex}`);
        const mismatches = exactFields.filter((field) => JSON.stringify(row[field]) !== JSON.stringify(control[field]));
        return { ...row, difference: score(row.winner) - score(control.winner), exact: mismatches.length === 0, mismatches };
    });
    const differences = pairs.map((row) => row.difference), mean = differences.reduce((a, b) => a + b, 0) / differences.length,
        sd = sampleSd(differences), lower = mean - tCritical * sd / Math.sqrt(differences.length);
    return { overall: summarize(candidateRows), paired: { cases: pairs.length, mean, sampleStandardDeviation: sd,
        tCritical, oneSidedLower: lower, improved: pairs.filter((row) => row.difference > 0).length,
        tied: pairs.filter((row) => row.difference === 0).length,
        worsened: pairs.filter((row) => row.difference < 0).length }, pairs };
};
const strata = (rows: any[], key: string, values: readonly any[]) => Object.fromEntries(values.map((value) =>
    [String(value), summarize(rows.filter((row) => row[key] === value))]));

const finalize = (): void => {
    const stageIndex = Number(requiredText("STAGE_INDEX", /^[0-2]$/)), design = HFO_ADVANCED_V5_STAGE_DESIGNS[stageIndex];
    const root = requiredPath("RESULTS_ROOT"), outputPath = requiredPath("OUT_PATH"),
        arrayJobId = requiredText("ARRAY_JOB_ID", /^\d+$/), inputs = commonInputs();
    const programSha256 = requiredText("PROGRAM_SHA256", SHA256), selectionSha256 = requiredText("SELECTION_SHA256", SHA256),
        cellProgramSha256 = process.env.CELL_PROGRAM_SHA256 ? requiredText("CELL_PROGRAM_SHA256", SHA256) : programSha256;
    if (!design || fs.existsSync(outputPath)) throw new Error("V5 stage finalizer drifted");
    const previous = loadPrevious(stageIndex), currentCommit = sourceIdentity().commit;
    let tasks = new Map<number, string>();
    for (let attempt = 0; attempt < 31; attempt += 1) { tasks = completedTasks(arrayJobId);
        if (tasks.size === design.taskCount) break; if (attempt < 30) execFileSync("sleep", ["2"]); }
    if (tasks.size !== design.taskCount) throw new Error(`Only ${tasks.size}/${design.taskCount} V5 stage tasks complete`);
    const rows: any[] = [];
    for (let taskIndex = 0; taskIndex < design.taskCount; taskIndex += 1) {
        const taskRoot = path.join(root, `task-${String(taskIndex).padStart(4, "0")}`),
            cellPath = path.join(taskRoot, "cell.json"), checksumPath = path.join(taskRoot, "cell.sha256");
        if (sha256File(cellPath) !== fs.readFileSync(checksumPath, "utf8").trim().split(/\s+/)[0])
            throw new Error(`V5 stage cell ${taskIndex} checksum drifted`);
        const cell = JSON.parse(fs.readFileSync(cellPath, "utf8"));
        if (cell.kind !== "hfo-advanced-v5-optimizer-cell" || cell.complete !== true || cell.stageIndex !== stageIndex ||
            cell.taskIndex !== taskIndex || String(cell.schedulerJobId) !== tasks.get(taskIndex) ||
            cell.sourceCommit !== currentCommit || cell.programSha256 !== cellProgramSha256 ||
            cell.protocolSha256 !== inputs.protocolSha256 || cell.assetManifestSha256 !== inputs.assetManifestSha256 ||
            cell.selectionSha256 !== selectionSha256 || cell.baselineCommit !== BASELINE_COMMIT ||
            cell.ra2webClientCommit !== RA2WEB_CLIENT_COMMIT || cell.ra2webClientReleaseId !== RA2WEB_CLIENT_RELEASE_ID ||
            cell.freezeManifestSha256 !== RA2WEB_FREEZE_MANIFEST_SHA256 || cell.advancedBundleSha256 !== ADVANCED_SHA256 ||
            cell.result.quitForwarded?.candidate !== 0 || cell.result.quitForwarded?.baseline !== 0)
            throw new Error(`V5 stage cell ${taskIndex} drifted`);
        rows.push(cell.result);
    }
    const previousRows: any[] = previous?.rows ?? [];
    const survivorCount = design.survivorCount, runs = [0, 1, 2].map((runIndex) => {
        const configs = stageCandidates(stageIndex, runIndex, previous), runRows = rows.filter((row) => row.runIndex === runIndex),
            currentControl = runRows.filter((row) => row.configSha256 === "control");
        if (runRows.length !== design.armCount * design.casesPerRun || currentControl.length !== design.casesPerRun)
            throw new Error(`V5 stage ${stageIndex} run ${runIndex} coverage drifted`);
        const candidates = configs.slice(1).map((candidate) => {
            if (!candidate) throw new Error("V5 candidate missing");
            const configSha256 = advancedWestConfigSha256(candidate), current = runRows.filter((row) => row.configSha256 === configSha256);
            let analysis;
            if (stageIndex === 1) {
                const priorCandidate = previousRows.filter((row) => row.runIndex === runIndex && row.configSha256 === configSha256),
                    priorControl = previousRows.filter((row) => row.runIndex === runIndex && row.configSha256 === "control");
                analysis = analyze([...priorCandidate, ...current], [...priorControl, ...currentControl], 1.29773);
            } else analysis = analyze(current, currentControl, stageIndex === 0 ? 1.33338 : 1.29359);
            const row: any = { candidate, configSha256, ...analysis };
            if (stageIndex === 2) {
                const byFaction = strata(current, "faction", ["Allied", "Soviet"]),
                    byStart = strata(current, "candidateStart", STARTS), byCountry = strata(current, "country", HFO_ADVANCED_V5_COUNTRIES),
                    bySlot = strata(current, "candidateSlot", [0, 1]);
                const nonWest = analysis.pairs.filter((pair: any) => pair.candidateStart !== WEST);
                const factionSafe = Object.values(byFaction).every((value: any) => value.wins > value.losses),
                    startNoninferior = Object.values(byStart).filter((value: any) => value.wins >= value.losses).length,
                    startSuperior = Object.values(byStart).filter((value: any) => value.wins > value.losses).length,
                    countryNoninferior = Object.values(byCountry).filter((value: any) => value.wins >= value.losses).length,
                    countrySuperior = Object.values(byCountry).filter((value: any) => value.wins > value.losses).length,
                    slotSafe = Object.values(bySlot).every((value: any) => value.wins > value.losses),
                    nonWestExact = nonWest.length === 54 && nonWest.every((pair: any) => pair.exact);
                row.byFaction = byFaction; row.byStart = byStart; row.byCountry = byCountry; row.bySlot = bySlot;
                row.nonWestExactCount = nonWest.filter((pair: any) => pair.exact).length;
                row.eligible = analysis.overall.wins > analysis.overall.losses &&
                    analysis.overall.oneSided95WilsonLower > 0.5 && analysis.paired.mean > 0 &&
                    analysis.paired.oneSidedLower > 0 && factionSafe && startNoninferior === 4 && startSuperior >= 3 &&
                    countryNoninferior === 9 && countrySuperior >= 7 && slotSafe && nonWestExact;
            }
            return row;
        });
        const ranked = candidates.slice().sort((left, right) => right.paired.oneSidedLower - left.paired.oneSidedLower ||
            right.paired.mean - left.paired.mean || left.overall.losses - right.overall.losses ||
            right.overall.winRate - left.overall.winRate || left.configSha256.localeCompare(right.configSha256));
        const selected = stageIndex === 2 ? ranked.filter((row) => row.eligible).slice(0, 1) : ranked.slice(0, survivorCount);
        return { runIndex, control: summarize(currentControl), candidates, ranking: ranked.map((row) => row.configSha256),
            survivors: selected.map((row) => ({ candidate: row.candidate, configSha256: row.configSha256,
                paired: row.paired, overall: row.overall, eligible: row.eligible ?? null })) };
    });
    const passed = stageIndex < 2 ? runs.every((run) => run.survivors.length === survivorCount) :
        runs.some((run) => run.survivors.length === 1);
    const artifact = { schemaVersion: 1, kind: "hfo-advanced-v5-optimizer-stage",
        status: passed ? `PASS_HFO_ADVANCED_V5_STAGE_${stageIndex}` : `FAIL_HFO_ADVANCED_V5_STAGE_${stageIndex}`,
        complete: true, passed, stageIndex, schedulerAccount: "pi_jss233", arrayJobId,
        finalizerJobId: process.env.SLURM_JOB_ID, sourceCommit: currentCommit, programSha256, cellProgramSha256,
        protocolSha256: inputs.protocolSha256, assetManifestSha256: inputs.assetManifestSha256,
        selectionSha256, baselineCommit: BASELINE_COMMIT, ra2webClientCommit: RA2WEB_CLIENT_COMMIT,
        ra2webClientReleaseId: RA2WEB_CLIENT_RELEASE_ID, freezeManifestSha256: RA2WEB_FREEZE_MANIFEST_SHA256,
        advancedBundleSha256: ADVANCED_SHA256, launchedGameCount: rows.length, runs,
        schedulerJobIds: [...tasks.values()], rows };
    fs.mkdirSync(path.dirname(outputPath), { recursive: true, mode: 0o700 });
    fs.writeFileSync(outputPath, JSON.stringify(artifact, null, 2) + "\n", { flag: "wx", mode: 0o600 });
    console.log(JSON.stringify({ status: artifact.status, stageIndex,
        survivors: runs.map((run) => ({ runIndex: run.runIndex, hashes: run.survivors.map((row) => row.configSha256) })) }));
};

const main = async (): Promise<void> => {
    const mode = requiredText("MODE", /^(cell|finalize)$/); if (mode === "cell") await runCell(); else finalize();
};
const invoked = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (import.meta.url === invoked) main().catch((error) => { console.error(error); process.exitCode = 1; });
