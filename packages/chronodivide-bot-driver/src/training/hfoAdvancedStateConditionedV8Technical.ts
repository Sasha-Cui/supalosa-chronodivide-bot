import { ActionsApi, Bot, CreateOfflineOpts, GameApi, ObjectType, ProductionApi, QueueType, UnitData, cdapi } from
    "@chronodivide/game-api";
import { Countries } from "@supalosa/chronodivide-bot/dist/bot/logic/common/utils.js";
import { StrongBot } from "@supalosa/chronodivide-bot/dist/bot/strongBot.js";
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { BaselineFactory, InspectableBaselineBot, loadBaselineFactory } from "../benchmark/baselineLoader.js";
import { createExperimentManifest } from "../benchmark/provenance.js";
import { withSeededOfflineGame } from "../benchmark/seededOfflineGame.js";
import { RA2WEB_CLIENT_COMMIT, RA2WEB_CLIENT_RELEASE_ID, RA2WEB_FREEZE_MANIFEST_SHA256,
    createInspectableRa2WebBot, loadRa2WebOpponent } from "./ra2WebOpponentBundle.js";
import { CanonicalV8Policy, V8_DETECTOR_UPDATE, V8_SEARCH_SEEDS, V8_TECHNICAL_FIXTURES, V8InspectableBot,
    decorateWithV8Controller, generateV8InitialPolicies } from "./hfoAdvancedStateConditionedV8Core.js";

const MAP = { name: "cd_chrono_4_heck_freezes_over_le.map",
    sha256: "e4dfc736a6355e0e68d4681e4d67419516e6bb94549e2d42880c9414e95e2e8d" } as const;
const BASELINE_COMMIT = "165b77a71d0cf5ebd27c65b19d0486bcbae78d0f";
const ADVANCED_SHA256 = "81d8797b6dd1371ba2dcbd79e25df8b42254290c820159e121a82650fd97a143";
const SHA256 = /^[0-9a-f]{64}$/;
const STARTS = ["39,82", "151,119", "88,34", "88,157"] as const;
type Start = typeof STARTS[number];
const WEST: Start = "39,82", EAST: Start = "151,119";
const OPPOSITE: Record<Start, Start> = { "39,82": "151,119", "151,119": "39,82",
    "88,34": "88,157", "88,157": "88,34" };
export const V8_COUNTRIES = [Countries.USA, Countries.KOREA, Countries.FRANCE, Countries.GERMANY,
    Countries.GREAT_BRITAIN, Countries.LIBYA, Countries.IRAQ, Countries.CUBA, Countries.RUSSIA] as const;
const ALLIED = new Set<Countries>(V8_COUNTRIES.slice(0, 5));
export const V8_TECHNICAL_TRACE_UPDATES = 9_600 as const;
export const V8_ORIGINAL_PROTOCOL_SHA256 = "186ede4a712c68d2c0324dc350de4de8428f3b52cb55d344224b50934c447f88" as const;
const TRACE_UPDATES = V8_TECHNICAL_TRACE_UPDATES, SNAPSHOT_INTERVAL = 1_200;

type Population = { id: string; seedBase: number; starts: readonly Start[]; casesPerCell: number;
    opponent: "advanced" | "supalosa" | "both" };
export const V8_POPULATIONS: readonly Population[] = [
    { id: "technical", seedBase: 3_100_000_000, starts: [WEST], casesPerCell: 1, opponent: "both" },
    ...[0, 1, 2].map((run) => ({ id: `run-${run}-generation-0`, seedBase: 3_101_000_000 + run * 1_000_000,
        starts: [WEST] as readonly Start[], casesPerCell: 1, opponent: "advanced" as const })),
    ...[0, 1, 2].map((run) => ({ id: `run-${run}-generation-1`, seedBase: 3_104_000_000 + run * 1_000_000,
        starts: [WEST] as readonly Start[], casesPerCell: 2, opponent: "advanced" as const })),
    ...[0, 1, 2].map((run) => ({ id: `run-${run}-generation-2`, seedBase: 3_107_000_000 + run * 1_000_000,
        starts: STARTS, casesPerCell: 1, opponent: "advanced" as const })),
    { id: "championship", seedBase: 3_110_000_000, starts: STARTS, casesPerCell: 2, opponent: "advanced" },
    { id: "replication", seedBase: 3_111_000_000, starts: STARTS, casesPerCell: 5, opponent: "advanced" },
    { id: "adaptive-advanced", seedBase: 3_112_000_000, starts: STARTS, casesPerCell: 5, opponent: "advanced" },
    { id: "adaptive-supalosa", seedBase: 3_113_000_000, starts: STARTS, casesPerCell: 5, opponent: "supalosa" },
];
export const V8_SELECTION_CASE_COUNT = 1_620 as const;
export const V8_TECHNICAL_CASE_COUNT = 18 as const;
export const V8_TECHNICAL_FIXTURE_IDS = Object.keys(V8_TECHNICAL_FIXTURES) as Array<keyof typeof V8_TECHNICAL_FIXTURES>;
type TechnicalArm = { id: string; opponent: "advanced" | "supalosa"; fixture: keyof typeof V8_TECHNICAL_FIXTURES | null;
    decorated: boolean };
export const V8_TECHNICAL_ARMS: readonly TechnicalArm[] = [
    ...V8_TECHNICAL_FIXTURE_IDS.map((fixture) => ({ id: `advanced-${fixture}`, opponent: "advanced" as const,
        fixture, decorated: true })),
    ...V8_TECHNICAL_FIXTURE_IDS.map((fixture) => ({ id: `supalosa-${fixture}`, opponent: "supalosa" as const,
        fixture, decorated: true })),
    { id: "supalosa-control", opponent: "supalosa", fixture: null, decorated: false },
];
export const V8_TECHNICAL_TASK_COUNT = 234 as const;

type V8Case = { globalCaseIndex: number; populationId: string; populationCaseIndex: number; countryOrdinal: number;
    country: Countries; startOrdinal: number; desiredStart: Start; desiredOppositeStart: Start;
    candidateSlot: 0 | 1; repeatIndex: number; seedOffset: number; requestedEngineSeed: number;
    candidateStart: Start; opponentStart: Start; opponent: Population["opponent"] };
type Inspectable = Bot & { name: string; lastGameApi: GameApi | null; lastPlayerActions: ActionsApi | null;
    lastPlayerProduction: ProductionApi | null };
type ActionEvent = { update: number; method: string; argumentSha256: string };

const requiredPath = (name: string) => { const value = process.env[name]; if (!value) throw new Error(`${name} required`);
    return path.resolve(value); };
const requiredText = (name: string, pattern: RegExp) => { const value = process.env[name];
    if (!value || !pattern.test(value)) throw new Error(`${name} invalid`); return value; };
const hashText = (value: string) => crypto.createHash("sha256").update(value).digest("hex");
const hashFile = (file: string) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const isRecord = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);
const startKey = (point: { x: number; y: number }): Start => `${point.x},${point.y}` as Start;

const sourceIdentity = () => { const repo = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim(),
    commit = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
    if (execFileSync("git", ["branch", "--show-current"], { encoding: "utf8" }).trim() !== "main" ||
        execFileSync("git", ["status", "--short", "--untracked-files=no"], { encoding: "utf8" }).trim() ||
        execFileSync("git", ["rev-parse", "fork/main"], { encoding: "utf8" }).trim() !== commit)
        throw new Error("V8 requires clean synchronized main"); return { repo, commit }; };
const commonInputs = () => { if (process.env.SLURM_JOB_ACCOUNT !== "pi_jss233") throw new Error("V8 requires pi_jss233");
    const mixDir = requiredPath("MIX_DIR"), protocolPath = requiredPath("PROTOCOL_PATH"),
        assetManifestPath = requiredPath("ASSET_MANIFEST_PATH"), freezeRoot = requiredPath("RA2WEB_FREEZE_ROOT"),
        protocolSha256 = requiredText("PROTOCOL_SHA256", SHA256), assetManifestSha256 = requiredText("ASSET_MANIFEST_SHA256", SHA256);
    if (hashFile(protocolPath) !== protocolSha256 || hashFile(assetManifestPath) !== assetManifestSha256 ||
        hashFile(path.join(mixDir, MAP.name)) !== MAP.sha256) throw new Error("V8 input drifted");
    const manifest = JSON.parse(fs.readFileSync(assetManifestPath, "utf8"));
    if (!isRecord(manifest) || manifest.kind !== "private-ra2-snow-runtime" ||
        path.resolve(String(manifest.runtimeDirectory)) !== mixDir) throw new Error("V8 runtime drifted");
    return { mixDir, protocolSha256, assetManifestSha256, freezeRoot }; };
const assertBaseline = (factory: BaselineFactory) => { if (factory.descriptor.kind !== "external-package" ||
    typeof factory.descriptor.packageRoot !== "string") throw new Error("V8 baseline external package required");
    const packageRoot = path.resolve(factory.descriptor.packageRoot), repo = execFileSync("git",
        ["-C", packageRoot, "rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
    if (execFileSync("git", ["-C", repo, "rev-parse", "HEAD"], { encoding: "utf8" }).trim() !== BASELINE_COMMIT ||
        execFileSync("git", ["-C", repo, "status", "--short", "--untracked-files=no"], { encoding: "utf8" }).trim() ||
        packageRoot !== path.join(repo, "packages", "chronodivide-bot")) throw new Error("V8 baseline drifted"); };
const loadAdvanced = (root: string) => { const loaded = loadRa2WebOpponent(root, "ra2web_advanced_old_priest");
    if (loaded.bundleSha256 !== ADVANCED_SHA256 || loaded.freezeManifestSha256 !== RA2WEB_FREEZE_MANIFEST_SHA256)
        throw new Error("V8 Advanced drifted"); return loaded; };
const settings = (candidate: Bot, opponent: Bot, slot: 0 | 1): CreateOfflineOpts => ({ buildOffAlly: false,
    cratesAppear: false, credits: 10_000, gameMode: cdapi.getAvailableGameModes(MAP.name)[0], gameSpeed: 6,
    mapName: MAP.name, mcvRepacks: true, shortGame: false, superWeapons: false, unitCount: 0, online: false,
    agents: slot === 0 ? [candidate, opponent] : [opponent, candidate] });

const expectedPopulationCount = (population: Population) => 9 * population.starts.length * 2 * population.casesPerCell;
export const v8PopulationCounts = () => Object.fromEntries(V8_POPULATIONS.map((population) =>
    [population.id, expectedPopulationCount(population)]));
export const v8TechnicalAssignment = (taskIndex: number) => { if (taskIndex < 0 || taskIndex >= V8_TECHNICAL_TASK_COUNT)
    throw new Error("V8 technical task index invalid"); return { armIndex: Math.floor(taskIndex / V8_TECHNICAL_CASE_COUNT),
        caseIndex: taskIndex % V8_TECHNICAL_CASE_COUNT, arm: V8_TECHNICAL_ARMS[Math.floor(taskIndex / V8_TECHNICAL_CASE_COUNT)] }; };

const selectCases = async () => {
    const out = requiredPath("OUT_PATH"), programPath = requiredPath("PROGRAM_PATH"),
        programSha256 = requiredText("PROGRAM_SHA256", SHA256), inputs = commonInputs();
    if (fs.existsSync(out) || hashFile(programPath) !== programSha256) throw new Error("V8 selector assignment drifted");
    const { repo, commit } = sourceIdentity(); await cdapi.init(inputs.mixDir);
    const baseline = await loadBaselineFactory(path.join(repo, "packages", "chronodivide-bot")); assertBaseline(baseline);
    const advanced = loadAdvanced(inputs.freezeRoot), cases: V8Case[] = []; let initializedGameCount = 0;
    for (const population of V8_POPULATIONS) { let populationCaseIndex = 0;
        for (const [countryOrdinal, country] of V8_COUNTRIES.entries()) for (const desiredStart of population.starts) {
            const startOrdinal = STARTS.indexOf(desiredStart);
            for (const candidateSlot of [0, 1] as const) { let selected = 0;
                for (let offset = 0; offset < 100 && selected < population.casesPerCell; offset += 1) {
                    const seed = population.seedBase + 10_000 * countryOrdinal + 1_000 * startOrdinal + 100 * candidateSlot + offset,
                        candidateName = `V8SelectCandidate_${population.id}_${countryOrdinal}_${startOrdinal}_${candidateSlot}_${offset}`,
                        opponentName = `V8SelectOpponent_${population.id}_${countryOrdinal}_${startOrdinal}_${candidateSlot}_${offset}`,
                        candidate = new StrongBot(candidateName, country, [], false), opponent = population.opponent === "supalosa"
                            ? baseline.create(opponentName, country) : createInspectableRa2WebBot(advanced, opponentName, country);
                    const starts = await withSeededOfflineGame(cdapi, settings(candidate, opponent, candidateSlot), seed,
                        [{ agent: candidate, identity: "candidate" }, { agent: opponent, identity: "opponent" }], async () => {
                            const api = candidate.lastGameApi; if (!api) throw new Error("V8 selector API missing"); return {
                                candidateStart: startKey(api.getPlayerData(candidateName).startLocation),
                                opponentStart: startKey(api.getPlayerData(opponentName).startLocation) }; });
                    initializedGameCount += 1;
                    if (starts.candidateStart === desiredStart && starts.opponentStart === OPPOSITE[desiredStart]) {
                        cases.push({ globalCaseIndex: cases.length, populationId: population.id, populationCaseIndex: populationCaseIndex++,
                            countryOrdinal, country, startOrdinal, desiredStart, desiredOppositeStart: OPPOSITE[desiredStart],
                            candidateSlot, repeatIndex: selected, seedOffset: offset, requestedEngineSeed: seed,
                            candidateStart: starts.candidateStart, opponentStart: starts.opponentStart, opponent: population.opponent });
                        selected += 1; }
                }
                if (selected !== population.casesPerCell) throw new Error(`V8 selection incomplete ${population.id}`);
            }
        }
    }
    const counts = v8PopulationCounts();
    if (cases.length !== V8_SELECTION_CASE_COUNT || new Set(cases.map((row) =>
        `${row.requestedEngineSeed}:${row.candidateSlot}`)).size !== cases.length ||
        Object.entries(counts).some(([id, count]) => cases.filter((row) => row.populationId === id).length !== count))
        throw new Error("V8 selection coverage drifted");
    const initialPolicies = Object.fromEntries(V8_SEARCH_SEEDS.map((seed) => [String(seed),
        generateV8InitialPolicies(seed).map((row) => ({ sha256: row.sha256, canonicalJson: row.canonicalJson,
            complexity: row.complexity }))]));
    if (new Set(Object.values(initialPolicies).flat().map((row) => row.sha256)).size !== 96)
        throw new Error("V8 initial policy hash collision");
    const artifact = { schemaVersion: 1, kind: "hfo-advanced-v8-master-selection",
        status: "PASS_HFO_ADVANCED_V8_MASTER_SELECTION", complete: true, passed: true, outcomeFree: true,
        scheduler: { jobId: process.env.SLURM_JOB_ID, account: "pi_jss233" }, sourceCommit: commit, programSha256,
        protocolSha256: inputs.protocolSha256, assetManifestSha256: inputs.assetManifestSha256,
        baselineCommit: BASELINE_COMMIT, ra2webClientCommit: RA2WEB_CLIENT_COMMIT,
        ra2webClientReleaseId: RA2WEB_CLIENT_RELEASE_ID, freezeManifestSha256: advanced.freezeManifestSha256,
        advancedBundleSha256: advanced.bundleSha256, selectedCaseCount: cases.length, initializedGameCount,
        populationCounts: counts, initialPolicies, updateCount: 0, forbiddenOutcomeFields: [], cases };
    fs.mkdirSync(path.dirname(out), { recursive: true, mode: 0o700 });
    fs.writeFileSync(out, JSON.stringify(artifact, null, 2) + "\n", { flag: "wx", mode: 0o600 });
    console.log(JSON.stringify({ status: artifact.status, selected: cases.length, initializedGameCount }));
};

const loadSelection = (file: string, expectedHash: string, inputs: ReturnType<typeof commonInputs>) => {
    if (hashFile(file) !== expectedHash) throw new Error("V8 selection hash drifted");
    const value = JSON.parse(fs.readFileSync(file, "utf8"));
    if (value.kind !== "hfo-advanced-v8-master-selection" || value.complete !== true || value.passed !== true ||
        value.outcomeFree !== true || value.updateCount !== 0 || value.protocolSha256 !== V8_ORIGINAL_PROTOCOL_SHA256 ||
        value.assetManifestSha256 !== inputs.assetManifestSha256 || value.baselineCommit !== BASELINE_COMMIT ||
        value.ra2webClientCommit !== RA2WEB_CLIENT_COMMIT || value.freezeManifestSha256 !== RA2WEB_FREEZE_MANIFEST_SHA256 ||
        value.advancedBundleSha256 !== ADVANCED_SHA256 || !Array.isArray(value.cases) || value.cases.length !== V8_SELECTION_CASE_COUNT)
        throw new Error("V8 selection ineligible");
    return value as { cases: V8Case[]; initialPolicies: Record<string, Array<{ sha256: string; canonicalJson: string }>> };
};

const installActionAudit = (bot: Inspectable) => { const events: ActionEvent[] = [], originalStart = bot.onGameStart.bind(bot);
    bot.onGameStart = (game: GameApi) => { originalStart(game); const actions = bot.lastPlayerActions as any;
        if (!actions) throw new Error("V8 technical actions missing");
        for (const method of ["queueForProduction", "unqueueFromProduction", "pauseProduction", "resumeProduction", "orderUnits"])
            if (typeof actions[method] === "function") { const original = actions[method].bind(actions);
                actions[method] = (...args: unknown[]) => { events.push({ update: bot.lastGameApi?.getCurrentTick() ?? 0,
                    method, argumentSha256: hashText(JSON.stringify(args)) }); return original(...args); }; }
        actions.quitGame = () => undefined;
    };
    return events;
};

const snapshot = (game: GameApi, bot: Inspectable, selfName: string, enemyName: string) => {
    const rows = (relation: "self" | "enemy") => game.getVisibleUnits(selfName, relation).map((id) => game.getUnitData(id))
        .filter((unit): unit is UnitData => !!unit).map((unit) => ({ id: unit.id, rule: unit.rules.name,
            type: unit.rules.type, hp: unit.hitPoints, x: unit.tile.rx, y: unit.tile.ry })).sort((a, b) => a.id - b.id),
        queue = (type: QueueType) => bot.lastPlayerProduction ? { status: String(bot.lastPlayerProduction.getQueueData(type).status),
            items: bot.lastPlayerProduction.getQueueData(type).items.map((item: any) => item.rules?.name ?? null) } : null;
    const core = { update: game.getCurrentTick(), credits: { self: game.getPlayerData(selfName).credits,
        enemyPublic: game.getPlayerData(enemyName).credits }, self: rows("self"), visibleEnemy: rows("enemy"),
        queues: { infantry: queue(QueueType.Infantry), vehicles: queue(QueueType.Vehicles),
            structures: queue(QueueType.Structures) } };
    return { ...core, sha256: hashText(JSON.stringify(core)) };
};

const prohibited = /^(winner|wins|loss|losses|draw|draws|score|defeated|terminal|terminalBuildingCounts|finished)$/i;
const assertOutcomeFree = (value: unknown, label = "root"): void => { if (Array.isArray(value)) return value.forEach((row, index) =>
    assertOutcomeFree(row, `${label}[${index}]`)); if (!isRecord(value)) return; for (const [key, child] of Object.entries(value)) {
        if (prohibited.test(key)) throw new Error(`V8 prohibited field ${label}.${key}`); assertOutcomeFree(child, `${label}.${key}`); } };

const createCandidate = (name: string, country: Countries) => new StrongBot(name, country, [], false) as V8InspectableBot;
const runTrace = async (arm: TechnicalArm, caseSpec: V8Case, caseIndex: number, baseline: BaselineFactory,
    advanced: ReturnType<typeof loadAdvanced>) => {
    const candidateName = `V8TechnicalCandidate_${caseIndex}`, opponentName = `V8TechnicalOpponent_${caseIndex}`,
        rawCandidate = createCandidate(candidateName, caseSpec.country), actionEvents = installActionAudit(rawCandidate as Inspectable),
        decorated = arm.decorated ? decorateWithV8Controller(rawCandidate, opponentName, caseSpec.country,
            V8_TECHNICAL_FIXTURES[arm.fixture!]) : null, candidate = decorated?.bot ?? rawCandidate,
        opponent = (arm.opponent === "advanced" ? createInspectableRa2WebBot(advanced, opponentName, caseSpec.country) :
            baseline.create(opponentName, caseSpec.country)) as Inspectable;
    const opponentActions = installActionAudit(opponent);
    return withSeededOfflineGame(cdapi, settings(candidate, opponent, caseSpec.candidateSlot), caseSpec.requestedEngineSeed,
        [{ agent: candidate, identity: "candidate" }, { agent: opponent, identity: "opponent" }], async (game) => {
            const candidateApi = candidate.lastGameApi, opponentApi = opponent.lastGameApi;
            if (!candidateApi || !opponentApi || startKey(candidateApi.getPlayerData(candidateName).startLocation) !== WEST ||
                startKey(candidateApi.getPlayerData(opponentName).startLocation) !== EAST) throw new Error("V8 technical start/API drifted");
            const candidateSnapshots = [snapshot(candidateApi, candidate as Inspectable, candidateName, opponentName)],
                opponentSnapshots = [snapshot(opponentApi, opponent, opponentName, candidateName)];
            for (let update = 1; update <= TRACE_UPDATES; update += 1) { await game.update();
                if (game.isFinished()) throw new Error("V8 technical trace ended before fixed horizon");
                if (update % SNAPSHOT_INTERVAL === 0) { candidateSnapshots.push(snapshot(candidateApi,
                    candidate as Inspectable, candidateName, opponentName)); opponentSnapshots.push(snapshot(opponentApi,
                    opponent, opponentName, candidateName)); } }
            const ownershipEvents = decorated?.ownershipEvents ?? [], controllerEvents = decorated?.controllerEvents ?? [],
                state = decorated?.state() ?? { update: TRACE_UPDATES, active: false, detected: null,
                    lastProduction: -Infinity, lastAction: -Infinity }, trace = { updateCount: TRACE_UPDATES,
                    candidateSnapshots, opponentSnapshots, candidateTraceSha256: hashText(JSON.stringify(candidateSnapshots)),
                    opponentTraceSha256: hashText(JSON.stringify(opponentSnapshots)),
                    candidateActionSha256: hashText(JSON.stringify(actionEvents)), opponentActionSha256: hashText(JSON.stringify(opponentActions)),
                    ownershipSha256: hashText(JSON.stringify(ownershipEvents)), controllerSha256: hashText(JSON.stringify(controllerEvents)),
                    actionEvents, opponentActions, ownershipEvents, controllerEvents, controllerState: state };
            assertOutcomeFree(trace); return trace;
        });
};

const runTechnical = async () => {
    const taskIndex = Number(requiredText("TASK_INDEX", /^\d+$/)), out = requiredPath("OUT_PATH"),
        programPath = requiredPath("PROGRAM_PATH"), programSha256 = requiredText("PROGRAM_SHA256", SHA256),
        selectionPath = requiredPath("SELECTION_PATH"), selectionSha256 = requiredText("SELECTION_SHA256", SHA256),
        inputs = commonInputs();
    if (process.env.SLURM_ARRAY_TASK_ID !== String(taskIndex) || fs.existsSync(out) || hashFile(programPath) !== programSha256)
        throw new Error("V8 technical assignment drifted");
    const selection = loadSelection(selectionPath, selectionSha256, inputs), cases = selection.cases.filter((row) =>
        row.populationId === "technical").sort((a, b) => a.populationCaseIndex - b.populationCaseIndex),
        assignment = v8TechnicalAssignment(taskIndex), caseSpec = cases[assignment.caseIndex];
    if (cases.length !== V8_TECHNICAL_CASE_COUNT || !caseSpec) throw new Error("V8 technical case missing");
    const { repo, commit } = sourceIdentity(); await cdapi.init(inputs.mixDir);
    const baseline = await loadBaselineFactory(path.join(repo, "packages", "chronodivide-bot")); assertBaseline(baseline);
    const advanced = loadAdvanced(inputs.freezeRoot), first = await runTrace(assignment.arm, caseSpec, assignment.caseIndex,
        baseline, advanced), repeat = assignment.caseIndex === 0 ? await runTrace(assignment.arm, caseSpec,
        assignment.caseIndex, baseline, advanced) : null,
        deterministicRepeat = repeat ? { passed: first.candidateTraceSha256 === repeat.candidateTraceSha256 &&
            first.opponentTraceSha256 === repeat.opponentTraceSha256 && first.candidateActionSha256 === repeat.candidateActionSha256 &&
            first.ownershipSha256 === repeat.ownershipSha256 && first.controllerSha256 === repeat.controllerSha256,
            candidateTraceSha256: repeat.candidateTraceSha256, opponentTraceSha256: repeat.opponentTraceSha256,
            candidateActionSha256: repeat.candidateActionSha256, ownershipSha256: repeat.ownershipSha256,
            controllerSha256: repeat.controllerSha256 } : null;
    if (deterministicRepeat && !deterministicRepeat.passed) throw new Error("V8 technical repeat drifted");
    const artifact = { schemaVersion: 1, kind: "hfo-advanced-v8-technical-cell",
        technicalState: "COMPLETE_HFO_ADVANCED_V8_TECHNICAL_CELL", complete: true, outcomeFree: true,
        taskIndex, armIndex: assignment.armIndex, arm: assignment.arm, caseIndex: assignment.caseIndex,
        schedulerAccount: "pi_jss233", schedulerJobId: process.env.SLURM_JOB_ID, sourceCommit: commit, programSha256,
        protocolSha256: inputs.protocolSha256, assetManifestSha256: inputs.assetManifestSha256, selectionSha256,
        baselineCommit: BASELINE_COMMIT, ra2webClientCommit: RA2WEB_CLIENT_COMMIT,
        ra2webClientReleaseId: RA2WEB_CLIENT_RELEASE_ID, freezeManifestSha256: advanced.freezeManifestSha256,
        advancedBundleSha256: advanced.bundleSha256, case: caseSpec, trace: first, deterministicRepeat,
        forbiddenOutcomeFields: [] };
    assertOutcomeFree(artifact); fs.mkdirSync(path.dirname(out), { recursive: true, mode: 0o700 });
    fs.writeFileSync(out, JSON.stringify(artifact, null, 2) + "\n", { flag: "wx", mode: 0o600 });
    console.log(JSON.stringify({ technicalState: artifact.technicalState, taskIndex, arm: assignment.arm.id }));
};

const completedTasks = (job: string) => { const raw = execFileSync("/opt/slurm/current/bin/sacct",
    ["-j", job, "-n", "-P", "-X", "--format=JobID,JobIDRaw,State,ExitCode,Account"], { encoding: "utf8" }),
    tasks = new Map<number, string>(); for (const line of raw.split("\n").filter(Boolean)) { const [label, rawId, state, exit, account] = line.split("|"),
        match = new RegExp(`^${job}_(\\d+)$`).exec(label); if (match && state === "COMPLETED" && exit === "0:0" &&
            account === "pi_jss233") tasks.set(+match[1], rawId); } return tasks; };

const finalize = () => {
    const root = requiredPath("RESULTS_ROOT"), out = requiredPath("OUT_PATH"), arrayJobId = requiredText("ARRAY_JOB_ID", /^\d+$/),
        programSha256 = requiredText("PROGRAM_SHA256", SHA256), cellProgramSha256 = requiredText("CELL_PROGRAM_SHA256", SHA256),
        selectionSha256 = requiredText("SELECTION_SHA256", SHA256), inputs = commonInputs();
    if (fs.existsSync(out)) throw new Error("V8 technical aggregate exists"); const commit = sourceIdentity().commit;
    let tasks = new Map<number, string>(); for (let attempt = 0; attempt < 31; attempt += 1) { tasks = completedTasks(arrayJobId);
        if (tasks.size === V8_TECHNICAL_TASK_COUNT) break; if (attempt < 30) execFileSync("sleep", ["2"]); }
    if (tasks.size !== V8_TECHNICAL_TASK_COUNT) throw new Error(`V8 technical scheduler ${tasks.size}/234`);
    const rows: any[] = [];
    for (let taskIndex = 0; taskIndex < V8_TECHNICAL_TASK_COUNT; taskIndex += 1) { const assignment = v8TechnicalAssignment(taskIndex),
        taskRoot = path.join(root, `task-${String(taskIndex).padStart(3, "0")}`), file = path.join(taskRoot, "cell.json"),
        expected = fs.readFileSync(path.join(taskRoot, "cell.sha256"), "utf8").trim().split(/\s+/)[0];
        if (hashFile(file) !== expected) throw new Error(`V8 technical checksum ${taskIndex}`); const cell = JSON.parse(fs.readFileSync(file, "utf8"));
        if (cell.kind !== "hfo-advanced-v8-technical-cell" || cell.complete !== true || cell.outcomeFree !== true ||
            cell.taskIndex !== taskIndex || cell.armIndex !== assignment.armIndex || cell.arm.id !== assignment.arm.id ||
            cell.caseIndex !== assignment.caseIndex || String(cell.schedulerJobId) !== tasks.get(taskIndex) ||
            cell.sourceCommit !== commit || cell.programSha256 !== cellProgramSha256 || cell.protocolSha256 !== inputs.protocolSha256 ||
            cell.assetManifestSha256 !== inputs.assetManifestSha256 || cell.selectionSha256 !== selectionSha256 ||
            cell.baselineCommit !== BASELINE_COMMIT || cell.ra2webClientCommit !== RA2WEB_CLIENT_COMMIT ||
            cell.freezeManifestSha256 !== RA2WEB_FREEZE_MANIFEST_SHA256 || cell.advancedBundleSha256 !== ADVANCED_SHA256)
            throw new Error(`V8 technical identity ${taskIndex}`); assertOutcomeFree(cell.trace); rows.push(cell); }
    const controls = new Map(rows.filter((row) => row.arm.id === "supalosa-control").map((row) => [row.caseIndex, row]));
    if (controls.size !== 18) throw new Error("V8 Supalosa controls missing");
    for (const row of rows) {
        const state = row.trace.controllerState, advancedArm = row.arm.opponent === "advanced", control = controls.get(row.caseIndex);
        if (row.caseIndex === 0 && row.deterministicRepeat?.passed !== true) throw new Error(`V8 repeat ${row.arm.id}`);
        if (advancedArm) {
            if (state.detected !== "Advanced" || state.active !== true || !row.trace.controllerEvents.some((event: any) =>
                event.event === "opponent_detected" && event.update === V8_DETECTOR_UPDATE) ||
                !row.trace.controllerEvents.some((event: any) => event.event === "rule_selected"))
                throw new Error(`V8 Advanced activation ${row.taskIndex}`);
            if (row.trace.ownershipEvents.some((event: any) => event.update > V8_DETECTOR_UPDATE && event.phase === "baseline" &&
                (event.ownedQueue || event.ownedCombatantCount > 0) && event.disposition !== "suppressed"))
                throw new Error(`V8 ownership leak ${row.taskIndex}`);
        } else if (row.arm.decorated) {
            if (state.detected !== "Supalosa" || state.active !== false || row.trace.controllerEvents.some((event: any) =>
                event.event === "rule_selected") || row.trace.ownershipEvents.some((event: any) => event.disposition === "suppressed") ||
                !control || row.trace.candidateTraceSha256 !== control.trace.candidateTraceSha256 ||
                row.trace.opponentTraceSha256 !== control.trace.opponentTraceSha256 ||
                row.trace.candidateActionSha256 !== control.trace.candidateActionSha256)
                throw new Error(`V8 Supalosa inactivity ${row.taskIndex}`);
        }
    }
    const fixtureCoverage = Object.fromEntries(V8_TECHNICAL_FIXTURE_IDS.map((fixture) => { const fixtureRows = rows.filter((row) =>
        row.arm.id === `advanced-${fixture}`), activated = fixtureRows.filter((row) => row.trace.controllerEvents.some((event: any) =>
            event.event === "rule_selected")).length, bySide = Object.fromEntries(["Allied", "Soviet"].map((side) => [side,
                fixtureRows.filter((row) => (ALLIED.has(row.case.country) ? "Allied" : "Soviet") === side &&
                    row.trace.controllerEvents.some((event: any) => event.event === "rule_selected")).length])),
            bySlot = Object.fromEntries([0, 1].map((slot) => [String(slot), fixtureRows.filter((row) =>
                row.case.candidateSlot === slot && row.trace.controllerEvents.some((event: any) => event.event === "rule_selected")).length]));
        return [fixture, { cases: fixtureRows.length, activated, bySide, bySlot }]; }));
    const passed = rows.length === V8_TECHNICAL_TASK_COUNT && Object.values(fixtureCoverage).every((value: any) =>
        value.cases === 18 && value.activated === 18 && value.bySide.Allied > 0 && value.bySide.Soviet > 0 &&
        value.bySlot["0"] > 0 && value.bySlot["1"] > 0);
    const artifact = { schemaVersion: 1, kind: "hfo-advanced-v8-technical-gate",
        status: passed ? "PASS_HFO_ADVANCED_V8_TECHNICAL_GATE" : "FAIL_HFO_ADVANCED_V8_TECHNICAL_GATE",
        complete: true, passed, outcomeFree: true, scheduler: { account: "pi_jss233", arrayJobId,
            taskJobIds: Object.fromEntries(tasks) }, sourceCommit: commit, programSha256, cellProgramSha256,
        protocolSha256: inputs.protocolSha256, assetManifestSha256: inputs.assetManifestSha256, selectionSha256,
        baselineCommit: BASELINE_COMMIT, ra2webClientCommit: RA2WEB_CLIENT_COMMIT,
        freezeManifestSha256: RA2WEB_FREEZE_MANIFEST_SHA256, advancedBundleSha256: ADVANCED_SHA256,
        taskCount: rows.length, fixtureCoverage, exactSupalosaPairs: 108, deterministicRepeats: 13,
        forbiddenOutcomeFields: [] };
    assertOutcomeFree(artifact); fs.mkdirSync(path.dirname(out), { recursive: true, mode: 0o700 });
    fs.writeFileSync(out, JSON.stringify(artifact, null, 2) + "\n", { flag: "wx", mode: 0o600 });
    console.log(JSON.stringify({ status: artifact.status, passed, taskCount: rows.length }));
};

const main = async () => { const mode = process.env.MODE;
    if (mode === "select") return selectCases(); if (mode === "technical") return runTechnical();
    if (mode === "finalize") return finalize(); throw new Error("MODE must be select, technical, or finalize"); };
if (process.env.MODE && process.env.MODE !== "test") void main().catch((error) => { console.error(error); process.exitCode = 1; });
