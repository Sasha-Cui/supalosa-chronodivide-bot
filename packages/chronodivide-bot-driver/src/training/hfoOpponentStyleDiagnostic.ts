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
import { createDeployedStrongBotCandidate } from "./deployedStrongBotCandidate.js";
import { RA2WEB_CLIENT_COMMIT, RA2WEB_CLIENT_RELEASE_ID, RA2WEB_FREEZE_MANIFEST_SHA256,
    createInspectableRa2WebBot, loadRa2WebOpponent } from "./ra2WebOpponentBundle.js";
import { LiteralBuildingEliminationAdjudicator, installLiteralEndpointInstrumentation } from
    "./literalBuildingEliminationEndpoint.js";
import { OpponentStyleExample, OpponentStyleLabel, fitOpponentStyleTree,
    groupedOpponentStyleCrossValidation, opponentStyleTreeStats, validateOpponentStyleFeatures } from
    "./opponentStyleTree.js";

const MAP = { name: "cd_chrono_4_heck_freezes_over_le.map",
    sha256: "e4dfc736a6355e0e68d4681e4d67419516e6bb94549e2d42880c9414e95e2e8d" } as const;
export const HFO_OPPONENT_STYLE_COUNTRIES = [Countries.USA, Countries.KOREA, Countries.FRANCE, Countries.GERMANY,
    Countries.GREAT_BRITAIN, Countries.LIBYA, Countries.IRAQ, Countries.CUBA, Countries.RUSSIA] as const;
const STARTS = ["39,82", "151,119", "88,34", "88,157"] as const;
type Start = typeof STARTS[number];
const OPPOSITE: Record<Start, Start> = {
    "39,82": "151,119", "151,119": "39,82", "88,34": "88,157", "88,157": "88,34",
};
const OPPONENTS: readonly OpponentStyleLabel[] = ["supalosa", "advanced"];
const BASELINE_COMMIT = "165b77a71d0cf5ebd27c65b19d0486bcbae78d0f";
const ADVANCED_SHA256 = "81d8797b6dd1371ba2dcbd79e25df8b42254290c820159e121a82650fd97a143";
const SHA256 = /^[0-9a-f]{64}$/;
export const HFO_OPPONENT_STYLE_SPEC = {
    seedBase: 4_263_000_000,
    maxOffsets: 400,
    maxTicks: 3_600,
    snapshotTicks: [300, 600, 900, 1_200, 1_800, 2_400, 3_000, 3_600],
    caseCount: 72,
    opponentCount: 2,
    taskCount: 144,
    maxTreeDepth: 3,
    minLeaf: 5,
} as const;
type CaseSpec = { caseIndex: number; countryOrdinal: number; country: Countries; startOrdinal: number;
    desiredStart: Start; desiredOppositeStart: Start; candidateSlot: 0 | 1; seedOffset: number;
    requestedEngineSeed: number; candidateStart: string; baselineStart: string };

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
const isRecord = (value: unknown): value is Record<string, unknown> =>
    !!value && typeof value === "object" && !Array.isArray(value);
const startKey = (point: { x: number; y: number }): string => `${point.x},${point.y}`;
const inspectableApi = (bot: { lastGameApi: GameApi | null }): GameApi => {
    if (!bot.lastGameApi) throw new Error("Opponent-style GameApi unavailable"); return bot.lastGameApi;
};

const sourceIdentity = () => {
    const repo = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
    const commit = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
    if (execFileSync("git", ["branch", "--show-current"], { encoding: "utf8" }).trim() !== "main" ||
        execFileSync("git", ["status", "--short", "--untracked-files=no"], { encoding: "utf8" }).trim() !== "" ||
        execFileSync("git", ["rev-parse", "fork/main"], { encoding: "utf8" }).trim() !== commit) {
        throw new Error("Opponent-style diagnostic requires clean synchronized main");
    }
    return { repo, commit };
};

const commonInputs = () => {
    if (process.env.SLURM_JOB_ACCOUNT !== "pi_jss233") throw new Error("Opponent-style diagnostic requires pi_jss233");
    const mixDir = requiredPath("MIX_DIR"), protocolPath = requiredPath("PROTOCOL_PATH");
    const assetManifestPath = requiredPath("ASSET_MANIFEST_PATH"), freezeRoot = requiredPath("RA2WEB_FREEZE_ROOT");
    const protocolSha256 = requiredText("PROTOCOL_SHA256", SHA256);
    const assetManifestSha256 = requiredText("ASSET_MANIFEST_SHA256", SHA256);
    if (sha256File(protocolPath) !== protocolSha256 || sha256File(assetManifestPath) !== assetManifestSha256 ||
        sha256File(path.join(mixDir, MAP.name)) !== MAP.sha256) throw new Error("Opponent-style input drifted");
    const manifest = JSON.parse(fs.readFileSync(assetManifestPath, "utf8")) as unknown;
    if (!isRecord(manifest) || manifest.kind !== "private-ra2-snow-runtime" ||
        path.resolve(String(manifest.runtimeDirectory)) !== mixDir) throw new Error("Opponent-style runtime drifted");
    return { mixDir, freezeRoot, protocolSha256, assetManifestSha256 };
};

const settings = (candidate: Bot, opponent: Bot, slot: 0 | 1): CreateOfflineOpts => {
    const gameMode = cdapi.getAvailableGameModes(MAP.name)[0];
    if (!gameMode) throw new Error("Opponent-style game mode unavailable");
    return { buildOffAlly: false, cratesAppear: false, credits: 10_000, gameMode, gameSpeed: 6,
        mapName: MAP.name, mcvRepacks: true, shortGame: false, superWeapons: false, unitCount: 0, online: false,
        agents: slot === 0 ? [candidate, opponent] : [opponent, candidate] };
};

const assertExternalBaseline = (descriptor: unknown): void => {
    if (!isRecord(descriptor) || descriptor.kind !== "external-package" || typeof descriptor.packageRoot !== "string") {
        throw new Error("Opponent-style baseline descriptor drifted");
    }
    const packageRoot = path.resolve(descriptor.packageRoot);
    const repo = execFileSync("git", ["-C", packageRoot, "rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
    const commit = execFileSync("git", ["-C", repo, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
    const status = execFileSync("git", ["-C", repo, "status", "--short", "--untracked-files=no"],
        { encoding: "utf8" }).trim();
    if (commit !== BASELINE_COMMIT || status !== "" || packageRoot !== path.join(repo, "packages", "chronodivide-bot")) {
        throw new Error("Opponent-style external baseline drifted");
    }
};

const loadAdvanced = (freezeRoot: string) => {
    const loaded = loadRa2WebOpponent(freezeRoot, "ra2web_advanced_old_priest");
    if (loaded.freezeManifestSha256 !== RA2WEB_FREEZE_MANIFEST_SHA256 || loaded.bundleSha256 !== ADVANCED_SHA256) {
        throw new Error("Opponent-style Advanced identity drifted");
    }
    return loaded;
};

const selectCases = async (): Promise<void> => {
    const outputPath = requiredPath("OUT_PATH"), programPath = requiredPath("PROGRAM_PATH");
    const programSha256 = requiredText("PROGRAM_SHA256", SHA256), inputs = commonInputs();
    if (fs.existsSync(outputPath) || sha256File(programPath) !== programSha256) throw new Error("Style selection drifted");
    const { repo, commit } = sourceIdentity();
    await cdapi.init(inputs.mixDir);
    const factory = await loadBaselineFactory(path.join(repo, "packages", "chronodivide-bot"));
    assertExternalBaseline(factory.descriptor); const advanced = loadAdvanced(inputs.freezeRoot);
    const cases: CaseSpec[] = []; let initializedGameCount = 0;
    for (const [countryOrdinal, country] of HFO_OPPONENT_STYLE_COUNTRIES.entries()) {
        for (const [startOrdinal, desiredStart] of STARTS.entries()) {
            for (const candidateSlot of [0, 1] as const) {
                let selected: CaseSpec | null = null;
                for (let seedOffset = 0; seedOffset < HFO_OPPONENT_STYLE_SPEC.maxOffsets && !selected; seedOffset += 1) {
                    const requestedEngineSeed = HFO_OPPONENT_STYLE_SPEC.seedBase + countryOrdinal * 100_000 +
                        startOrdinal * 20_000 + candidateSlot * 10_000 + seedOffset;
                    const candidateName = `StyleSelectCandidate_${countryOrdinal}_${startOrdinal}_${candidateSlot}_${seedOffset}`;
                    const baselineName = `StyleSelectBaseline_${countryOrdinal}_${startOrdinal}_${candidateSlot}_${seedOffset}`;
                    const candidate = createDeployedStrongBotCandidate(candidateName, country);
                    const baseline = factory.create(baselineName, country);
                    const starts = await withSeededOfflineGame(cdapi, settings(candidate, baseline, candidateSlot),
                        requestedEngineSeed, [{ agent: candidate, identity: "candidate" },
                            { agent: baseline, identity: "opponent" }], async () => ({
                            candidateStart: startKey(inspectableApi(candidate).getPlayerData(candidateName).startLocation),
                            baselineStart: startKey(inspectableApi(candidate).getPlayerData(baselineName).startLocation) }));
                    initializedGameCount += 1;
                    if (starts.candidateStart === desiredStart && starts.baselineStart === OPPOSITE[desiredStart]) {
                        selected = { caseIndex: cases.length, countryOrdinal, country, startOrdinal, desiredStart,
                            desiredOppositeStart: OPPOSITE[desiredStart], candidateSlot, seedOffset,
                            requestedEngineSeed, ...starts };
                    }
                }
                if (!selected) throw new Error(`Style selection incomplete for ${country} ${desiredStart} ${candidateSlot}`);
                cases.push(selected);
            }
        }
    }
    if (cases.length !== HFO_OPPONENT_STYLE_SPEC.caseCount ||
        new Set(cases.map((entry) => `${entry.requestedEngineSeed}:${entry.candidateSlot}`)).size !== cases.length) {
        throw new Error("Style selection coverage drifted");
    }
    const artifact = { schemaVersion: 1, kind: "hfo-opponent-style-selection",
        status: "PASS_HFO_OPPONENT_STYLE_SELECTION", complete: true, passed: true, outcomeFree: true,
        scheduler: { jobId: process.env.SLURM_JOB_ID, account: "pi_jss233" }, sourceCommit: commit,
        programSha256, protocolSha256: inputs.protocolSha256, assetManifestSha256: inputs.assetManifestSha256,
        baselineCommit: BASELINE_COMMIT, ra2webClientCommit: RA2WEB_CLIENT_COMMIT,
        ra2webClientReleaseId: RA2WEB_CLIENT_RELEASE_ID, freezeManifestSha256: advanced.freezeManifestSha256,
        advancedBundleSha256: advanced.bundleSha256, ...HFO_OPPONENT_STYLE_SPEC,
        initializedGameCount, selectedCaseCount: cases.length, updateCount: 0, forbiddenOutcomeFields: [], cases };
    fs.mkdirSync(path.dirname(outputPath), { recursive: true, mode: 0o700 });
    fs.writeFileSync(outputPath, JSON.stringify(artifact, null, 2) + "\n", { flag: "wx", mode: 0o600 });
    console.log(JSON.stringify({ status: artifact.status, initializedGameCount, cases: cases.length }));
};

const loadSelection = (selectionPath: string, selectionSha256: string,
    inputs: ReturnType<typeof commonInputs>): CaseSpec[] => {
    if (sha256File(selectionPath) !== selectionSha256) throw new Error("Style selection hash drifted");
    const value = JSON.parse(fs.readFileSync(selectionPath, "utf8")) as unknown;
    if (!isRecord(value) || value.kind !== "hfo-opponent-style-selection" ||
        value.status !== "PASS_HFO_OPPONENT_STYLE_SELECTION" || value.complete !== true || value.passed !== true ||
        value.outcomeFree !== true || value.updateCount !== 0 || !Array.isArray(value.forbiddenOutcomeFields) ||
        value.forbiddenOutcomeFields.length !== 0 || value.selectedCaseCount !== HFO_OPPONENT_STYLE_SPEC.caseCount ||
        value.seedBase !== HFO_OPPONENT_STYLE_SPEC.seedBase || value.baselineCommit !== BASELINE_COMMIT ||
        value.freezeManifestSha256 !== RA2WEB_FREEZE_MANIFEST_SHA256 || value.advancedBundleSha256 !== ADVANCED_SHA256 ||
        value.protocolSha256 !== inputs.protocolSha256 || value.assetManifestSha256 !== inputs.assetManifestSha256 ||
        !Array.isArray(value.cases) || value.cases.length !== HFO_OPPONENT_STYLE_SPEC.caseCount) {
        throw new Error("Style selection is ineligible");
    }
    return value.cases as CaseSpec[];
};

const finiteMean = (values: readonly number[]): number => values.length === 0 ? 0 :
    values.reduce((total, value) => total + value, 0) / values.length;
const finiteMedian = (values: readonly number[]): number => {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b), center = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[center] : (sorted[center - 1] + sorted[center]) / 2;
};
const safeRule = (name: string): string => encodeURIComponent(name);

export const publicOpponentStyleFeatures = (game: GameApi, candidateName: string,
    opponentName: string): Record<string, number> => {
    const candidateStart = game.getPlayerData(candidateName).startLocation;
    const units = game.getAllUnits().map((id) => game.getUnitData(id)).filter((unit): unit is UnitData => !!unit)
        .filter((unit) => unit.owner === opponentName);
    const buildings = units.filter((unit) => unit.rules.type === ObjectType.Building);
    const nonBuildings = units.filter((unit) => unit.rules.type !== ObjectType.Building);
    const distances = nonBuildings.map((unit) =>
        (unit.tile.rx - candidateStart.x) ** 2 + (unit.tile.ry - candidateStart.y) ** 2);
    const features: Record<string, number> = {
        credits: game.getPlayerData(opponentName).credits,
        total_buildings: buildings.length,
        total_nonbuildings: nonBuildings.length,
        total_hp: units.reduce((total, unit) => total + unit.hitPoints, 0),
        distance_sq_min: distances.length === 0 ? 0 : Math.min(...distances),
        distance_sq_median: finiteMedian(distances),
        distance_sq_mean: finiteMean(distances),
    };
    for (const radius of [24, 48, 72, 96]) {
        features[`within_${radius}_tiles`] = distances.filter((distance) => distance <= radius * radius).length;
    }
    for (const name of [...new Set(units.map((unit) => unit.rules.name))].sort()) {
        const rule = safeRule(name), named = units.filter((unit) => unit.rules.name === name);
        const namedBuildings = named.filter((unit) => unit.rules.type === ObjectType.Building);
        const namedNonBuildings = named.filter((unit) => unit.rules.type !== ObjectType.Building);
        features[`rules.${rule}.object_count`] = named.length;
        features[`rules.${rule}.hp`] = named.reduce((total, unit) => total + unit.hitPoints, 0);
        features[`rules.${rule}.building_count`] = namedBuildings.length;
        features[`rules.${rule}.nonbuilding_count`] = namedNonBuildings.length;
    }
    const ordered = Object.fromEntries(Object.entries(features).sort(([left], [right]) => left.localeCompare(right)));
    validateOpponentStyleFeatures(ordered);
    return ordered;
};

const runCell = async (): Promise<void> => {
    const taskIndex = Number(requiredText("TASK_INDEX", /^\d+$/)), outputPath = requiredPath("OUT_PATH");
    const programPath = requiredPath("PROGRAM_PATH"), programSha256 = requiredText("PROGRAM_SHA256", SHA256);
    const selectionPath = requiredPath("SELECTION_PATH"), selectionSha256 = requiredText("SELECTION_SHA256", SHA256);
    const inputs = commonInputs();
    if (taskIndex < 0 || taskIndex >= HFO_OPPONENT_STYLE_SPEC.taskCount ||
        process.env.SLURM_ARRAY_TASK_ID !== String(taskIndex) || fs.existsSync(outputPath) ||
        sha256File(programPath) !== programSha256) throw new Error("Style cell drifted");
    const cases = loadSelection(selectionPath, selectionSha256, inputs);
    const opponentIndex = Math.floor(taskIndex / HFO_OPPONENT_STYLE_SPEC.caseCount);
    const caseIndex = taskIndex % HFO_OPPONENT_STYLE_SPEC.caseCount;
    const opponentLabel = OPPONENTS[opponentIndex], caseSpec = cases[caseIndex];
    if (!opponentLabel || !caseSpec || caseSpec.caseIndex !== caseIndex) throw new Error("Style cell assignment drifted");
    const { repo, commit } = sourceIdentity(); await cdapi.init(inputs.mixDir);
    const factory = await loadBaselineFactory(path.join(repo, "packages", "chronodivide-bot"));
    assertExternalBaseline(factory.descriptor); const advanced = loadAdvanced(inputs.freezeRoot);
    const candidateName = `StyleCandidate_${taskIndex}`, opponentName = `StyleOpponent_${taskIndex}`;
    const candidate = createDeployedStrongBotCandidate(candidateName, caseSpec.country);
    const opponent = opponentLabel === "supalosa" ? factory.create(opponentName, caseSpec.country) :
        createInspectableRa2WebBot(advanced, opponentName, caseSpec.country);
    const adjudicator = new LiteralBuildingEliminationAdjudicator({ candidate: candidateName, baseline: opponentName });
    const { audit } = installLiteralEndpointInstrumentation({ candidate, baseline: opponent }, adjudicator);
    const trace = await withSeededOfflineGame(cdapi, settings(candidate, opponent, caseSpec.candidateSlot),
        caseSpec.requestedEngineSeed, [{ agent: candidate, identity: "candidate" },
            { agent: opponent, identity: "opponent" }], async (game) => {
            const gameApi = inspectableApi(candidate);
            if (startKey(gameApi.getPlayerData(candidateName).startLocation) !== caseSpec.desiredStart ||
                startKey(gameApi.getPlayerData(opponentName).startLocation) !== caseSpec.desiredOppositeStart) {
                throw new Error("Style selected start drifted");
            }
            const snapshots: Array<{ tick: number; features: Record<string, number> }> = [];
            for (let tick = 1; tick <= HFO_OPPONENT_STYLE_SPEC.maxTicks; tick += 1) {
                if (game.isFinished()) throw new Error("Style game finished before technical horizon");
                adjudicator.beginUpdate(gameApi); await game.update();
                const stats = game.getPlayerStats(), candidateStats = stats.find((row) => row.name === candidateName);
                const opponentStats = stats.find((row) => row.name === opponentName);
                if (!candidateStats || !opponentStats) throw new Error("Style statistics unavailable");
                const endpoint = adjudicator.completeUpdate(gameApi, { finished: game.isFinished(), defeated: {
                    candidate: candidateStats.defeated, baseline: opponentStats.defeated } });
                if (endpoint.terminal || endpoint.technicalFailure || game.isFinished()) {
                    throw new Error("Style game ended before technical horizon");
                }
                if ((HFO_OPPONENT_STYLE_SPEC.snapshotTicks as readonly number[]).includes(tick)) {
                    snapshots.push({ tick, features: publicOpponentStyleFeatures(gameApi, candidateName, opponentName) });
                }
            }
            if (audit.forwarded.candidate !== 0 || audit.forwarded.baseline !== 0 ||
                snapshots.length !== HFO_OPPONENT_STYLE_SPEC.snapshotTicks.length) {
                throw new Error("Style trace technical contract failed");
            }
            return { updateCount: HFO_OPPONENT_STYLE_SPEC.maxTicks, snapshots,
                featureSequenceSha256: sha256Value(snapshots), suppressedQuitAttempts: { ...audit.attempts } };
        });
    const provenance = createExperimentManifest({ runId: `hfo-style-${taskIndex}-${process.env.SLURM_JOB_ID}`,
        mixDir: inputs.mixDir, maps: [MAP.name], effectiveConfig: { purpose: "outcome-free-opponent-style-trace",
            taskIndex, opponentIndex, opponentLabel, caseSpec, selectionSha256, maxTicks: HFO_OPPONENT_STYLE_SPEC.maxTicks,
            featureInput: "public-game-api-state-only" }, baseline: factory.descriptor,
        gameSeedBase: caseSpec.requestedEngineSeed });
    const artifact = { schemaVersion: 1, kind: "hfo-opponent-style-cell",
        status: "COMPLETE_HFO_OPPONENT_STYLE_CELL", complete: true, passed: true, technicalOnly: true,
        taskIndex, opponentIndex, opponentLabel, caseIndex, caseSpec,
        schedulerAccount: "pi_jss233", schedulerJobId: process.env.SLURM_JOB_ID, sourceCommit: commit,
        programSha256, protocolSha256: inputs.protocolSha256, assetManifestSha256: inputs.assetManifestSha256,
        selectionSha256, baselineCommit: BASELINE_COMMIT, ra2webClientCommit: RA2WEB_CLIENT_COMMIT,
        freezeManifestSha256: advanced.freezeManifestSha256, advancedBundleSha256: advanced.bundleSha256,
        fieldsProvenAbsent: ["winner", "score", "competitive outcome", "terminal building counts"], trace, provenance };
    fs.mkdirSync(path.dirname(outputPath), { recursive: true, mode: 0o700 });
    fs.writeFileSync(outputPath, JSON.stringify(artifact, null, 2) + "\n", { flag: "wx", mode: 0o600 });
    console.log(JSON.stringify({ status: artifact.status, taskIndex, opponentLabel, caseIndex }));
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
    const root = requiredPath("RESULTS_ROOT"), outputPath = requiredPath("OUT_PATH");
    const arrayJobId = requiredText("ARRAY_JOB_ID", /^\d+$/), programSha256 = requiredText("PROGRAM_SHA256", SHA256);
    const selectionSha256 = requiredText("SELECTION_SHA256", SHA256), inputs = commonInputs();
    const cellProgramSha256 = process.env.CELL_PROGRAM_SHA256 ? requiredText("CELL_PROGRAM_SHA256", SHA256) : programSha256;
    if (fs.existsSync(outputPath)) throw new Error("Style finalizer output exists");
    const advanced = loadAdvanced(inputs.freezeRoot); let tasks = new Map<number, string>();
    for (let attempt = 0; attempt < 31; attempt += 1) {
        tasks = completedTasks(arrayJobId); if (tasks.size === HFO_OPPONENT_STYLE_SPEC.taskCount) break;
        if (attempt < 30) execFileSync("sleep", ["2"]);
    }
    if (tasks.size !== HFO_OPPONENT_STYLE_SPEC.taskCount) {
        throw new Error(`Only ${tasks.size}/${HFO_OPPONENT_STYLE_SPEC.taskCount} style tasks complete`);
    }
    const cells: any[] = [], sources = new Set<string>();
    for (let taskIndex = 0; taskIndex < HFO_OPPONENT_STYLE_SPEC.taskCount; taskIndex += 1) {
        const cell = JSON.parse(fs.readFileSync(path.join(root,
            `task-${String(taskIndex).padStart(3, "0")}`, "cell.json"), "utf8"));
        const expectedOpponentIndex = Math.floor(taskIndex / HFO_OPPONENT_STYLE_SPEC.caseCount);
        const expectedCaseIndex = taskIndex % HFO_OPPONENT_STYLE_SPEC.caseCount;
        if (cell.kind !== "hfo-opponent-style-cell" || cell.status !== "COMPLETE_HFO_OPPONENT_STYLE_CELL" ||
            cell.complete !== true || cell.passed !== true || cell.technicalOnly !== true || cell.taskIndex !== taskIndex ||
            cell.opponentIndex !== expectedOpponentIndex || cell.opponentLabel !== OPPONENTS[expectedOpponentIndex] ||
            cell.caseIndex !== expectedCaseIndex || cell.caseSpec.caseIndex !== expectedCaseIndex ||
            String(cell.schedulerJobId) !== tasks.get(taskIndex) || cell.programSha256 !== cellProgramSha256 ||
            cell.protocolSha256 !== inputs.protocolSha256 || cell.assetManifestSha256 !== inputs.assetManifestSha256 ||
            cell.selectionSha256 !== selectionSha256 || cell.baselineCommit !== BASELINE_COMMIT ||
            cell.freezeManifestSha256 !== RA2WEB_FREEZE_MANIFEST_SHA256 ||
            cell.advancedBundleSha256 !== advanced.bundleSha256 || cell.trace.updateCount !== HFO_OPPONENT_STYLE_SPEC.maxTicks ||
            !Array.isArray(cell.trace.snapshots) || cell.trace.snapshots.length !== HFO_OPPONENT_STYLE_SPEC.snapshotTicks.length ||
            sha256Value(cell.trace.snapshots) !== cell.trace.featureSequenceSha256) {
            throw new Error(`Style cell ${taskIndex} drifted`);
        }
        for (const snapshot of cell.trace.snapshots) validateOpponentStyleFeatures(snapshot.features);
        sources.add(cell.sourceCommit); cells.push(cell);
    }
    if (sources.size !== 1 || new Set(cells.map((cell) => `${cell.opponentLabel}:${cell.caseIndex}`)).size !==
        HFO_OPPONENT_STYLE_SPEC.taskCount) throw new Error("Style aggregate coverage drifted");
    const reports = HFO_OPPONENT_STYLE_SPEC.snapshotTicks.map((tick) => {
        const examples: OpponentStyleExample[] = cells.map((cell) => {
            const snapshot = cell.trace.snapshots.find((entry: any) => entry.tick === tick);
            if (!snapshot) throw new Error(`Missing style snapshot ${tick}`);
            return { features: snapshot.features, label: cell.opponentLabel, country: cell.caseSpec.country,
                start: cell.caseSpec.desiredStart, slot: cell.caseSpec.candidateSlot };
        });
        const crossValidation = (["country", "start", "slot"] as const).map((group) =>
            groupedOpponentStyleCrossValidation(examples, group));
        const qualifies = crossValidation.every((report) => report.metrics.accuracy >= 0.95 &&
            report.metrics.balancedAccuracy >= 0.95 && report.metrics.recall.supalosa >= 0.95 &&
            report.metrics.recall.advanced >= 0.95 && report.metrics.oneSided95WilsonLower > 0.90);
        const fullTree = fitOpponentStyleTree(examples, HFO_OPPONENT_STYLE_SPEC.maxTreeDepth,
            HFO_OPPONENT_STYLE_SPEC.minLeaf);
        const featureSchema = [...new Set(examples.flatMap((example) => Object.keys(example.features)))].sort();
        const pairedFeatureDivergenceCount = Array.from({ length: HFO_OPPONENT_STYLE_SPEC.caseCount }, (_, caseIndex) => {
            const first = cells.find((cell) => cell.caseIndex === caseIndex && cell.opponentLabel === "supalosa");
            const second = cells.find((cell) => cell.caseIndex === caseIndex && cell.opponentLabel === "advanced");
            const firstSnapshot = first?.trace.snapshots.find((entry: any) => entry.tick === tick);
            const secondSnapshot = second?.trace.snapshots.find((entry: any) => entry.tick === tick);
            return JSON.stringify(firstSnapshot?.features) !== JSON.stringify(secondSnapshot?.features);
        }).filter(Boolean).length;
        return { tick, qualifies, featureSchema, fullTree, fullTreeStats: opponentStyleTreeStats(fullTree),
            crossValidation, pairedFeatureDivergenceCount };
    });
    const selected = reports.find((report) => report.qualifies) ?? null;
    const passed = selected !== null;
    const artifact = { schemaVersion: 1, kind: "hfo-opponent-style-finalizer",
        status: passed ? "PASS_HFO_OPPONENT_STYLE_DIAGNOSTIC" : "FAIL_HFO_OPPONENT_STYLE_DIAGNOSTIC",
        complete: true, passed, technicalOnly: true, schedulerAccount: "pi_jss233", arrayJobId,
        finalizerJobId: process.env.SLURM_JOB_ID, sourceCommit: [...sources][0], programSha256,
        cellProgramSha256, protocolSha256: inputs.protocolSha256, assetManifestSha256: inputs.assetManifestSha256,
        selectionSha256, baselineCommit: BASELINE_COMMIT, ra2webClientCommit: RA2WEB_CLIENT_COMMIT,
        freezeManifestSha256: advanced.freezeManifestSha256, advancedBundleSha256: advanced.bundleSha256,
        launchedTraceCount: cells.length, selectedTick: selected?.tick ?? null,
        selectedFeatureSchema: selected?.featureSchema ?? null, selectedTree: selected?.fullTree ?? null,
        selectedTreeStats: selected?.fullTreeStats ?? null, reports,
        fieldsProvenAbsent: ["winner", "score", "competitive outcome", "terminal building counts"],
        schedulerJobIds: [...tasks.values()], cellArtifacts: cells.map((cell) => ({ taskIndex: cell.taskIndex,
            schedulerJobId: cell.schedulerJobId, opponentLabel: cell.opponentLabel, caseIndex: cell.caseIndex,
            featureSequenceSha256: cell.trace.featureSequenceSha256 })) };
    fs.mkdirSync(path.dirname(outputPath), { recursive: true, mode: 0o700 });
    fs.writeFileSync(outputPath, JSON.stringify(artifact, null, 2) + "\n", { flag: "wx", mode: 0o600 });
    console.log(JSON.stringify({ status: artifact.status, selectedTick: artifact.selectedTick,
        selectedTreeStats: artifact.selectedTreeStats }));
};

const main = async (): Promise<void> => {
    const mode = requiredText("MODE", /^(select|cell|finalize)$/);
    if (mode === "select") await selectCases(); else if (mode === "cell") await runCell(); else finalize();
};
const invoked = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (import.meta.url === invoked) main().catch((error) => { console.error(error); process.exitCode = 1; });
