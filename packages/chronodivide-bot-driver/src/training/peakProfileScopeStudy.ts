import { Bot, CreateOfflineOpts, GameApi, ObjectType, UnitData, cdapi } from "@chronodivide/game-api";
import { Countries } from "@supalosa/chronodivide-bot/dist/bot/logic/common/utils.js";
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { BaselineFactory, loadBaselineFactory } from "../benchmark/baselineLoader.js";
import { createExperimentManifest } from "../benchmark/provenance.js";
import { withSeededOfflineGame } from "../benchmark/seededOfflineGame.js";
import { createDeployedStrongBotCandidate } from "./deployedStrongBotCandidate.js";
import { LiteralBuildingEliminationAdjudicator, installLiteralEndpointInstrumentation,
    snapshotCombatantBuildings } from "./literalBuildingEliminationEndpoint.js";
import { PEAK_PROFILE_ARMS, PeakProfileArm, PeakProfileArmId, createPeakProfileCandidate } from
    "./peakProfilePolicies.js";

const MAP = { name: "cd_2_peak_of_perfection.map",
    sha256: "440715dc154ac10b4b922159824140d40c48990311c6838345b66958f3b3a442" } as const;
const BASELINE_COMMIT = "165b77a71d0cf5ebd27c65b19d0486bcbae78d0f";
const SHA256 = /^[0-9a-f]{64}$/;
const STARTS = ["37,73", "118,73"] as const;
type Start = typeof STARTS[number];
const WEAK = STARTS[0], OPPOSITE: Record<Start, Start> = { "37,73": "118,73", "118,73": "37,73" };
export const PEAK_STUDY_COUNTRIES = [Countries.USA, Countries.KOREA, Countries.FRANCE, Countries.GERMANY,
    Countries.GREAT_BRITAIN, Countries.LIBYA, Countries.IRAQ, Countries.CUBA, Countries.RUSSIA] as const;
const ALLIED = new Set<Countries>(PEAK_STUDY_COUNTRIES.slice(0, 5));
type Winner = "first" | "opponent" | "draw";
type Population = { id: "development" | "replication"; seedBase: number; casesPerCell: number };
export const PEAK_STUDY_POPULATIONS: readonly Population[] = [
    { id: "development", seedBase: 4_281_000_000, casesPerCell: 1 },
    { id: "replication", seedBase: 4_282_000_000, casesPerCell: 5 },
];
export const PEAK_STUDY_SPEC = { maxOffsets: 100, maxUpdates: 90_000, selectionCaseCount: 216,
    developmentCaseCount: 36, developmentArmCount: 6, developmentTaskCount: 216,
    replicationCaseCount: 180, replicationArmCount: 2, replicationTaskCount: 360,
    clusterCount: 18, clusterTCritical: 1.73961 } as const;
type CaseSpec = { globalCaseIndex: number; populationId: Population["id"]; populationCaseIndex: number;
    countryOrdinal: number; country: Countries; startOrdinal: number; desiredStart: Start;
    desiredOppositeStart: Start; candidateSlot: 0 | 1; repeatIndex: number; seedOffset: number;
    requestedEngineSeed: number; candidateStart: string; opponentStart: string };

const requiredPath = (name: string): string => { const value = process.env[name];
    if (!value) throw new Error(`${name} is required`); return path.resolve(value); };
const requiredText = (name: string, pattern: RegExp): string => { const value = process.env[name];
    if (!value || !pattern.test(value)) throw new Error(`${name} is invalid`); return value; };
const sha256File = (filePath: string): string => crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
const isRecord = (value: unknown): value is Record<string, unknown> =>
    !!value && typeof value === "object" && !Array.isArray(value);
const startKey = (point: { x: number; y: number }) => `${point.x},${point.y}`;
const sourceIdentity = () => { const repo = execFileSync("git", ["rev-parse", "--show-toplevel"],
    { encoding: "utf8" }).trim(), commit = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
    if (execFileSync("git", ["branch", "--show-current"], { encoding: "utf8" }).trim() !== "main" ||
        execFileSync("git", ["status", "--short", "--untracked-files=no"], { encoding: "utf8" }).trim() ||
        execFileSync("git", ["rev-parse", "fork/main"], { encoding: "utf8" }).trim() !== commit)
        throw new Error("Peak study requires clean synchronized main"); return { repo, commit }; };
const commonInputs = () => {
    if (process.env.SLURM_JOB_ACCOUNT !== "pi_jss233") throw new Error("Peak study requires pi_jss233");
    const mixDir = requiredPath("MIX_DIR"), protocolPath = requiredPath("PROTOCOL_PATH"),
        assetManifestPath = requiredPath("ASSET_MANIFEST_PATH"), protocolSha256 = requiredText("PROTOCOL_SHA256", SHA256),
        assetManifestSha256 = requiredText("ASSET_MANIFEST_SHA256", SHA256);
    if (sha256File(protocolPath) !== protocolSha256 || sha256File(assetManifestPath) !== assetManifestSha256 ||
        sha256File(path.join(mixDir, MAP.name)) !== MAP.sha256) throw new Error("Peak input drifted");
    const manifest = JSON.parse(fs.readFileSync(assetManifestPath, "utf8")) as unknown;
    if (!isRecord(manifest) || manifest.kind !== "private-ra2-snow-runtime" ||
        path.resolve(String(manifest.runtimeDirectory)) !== mixDir) throw new Error("Peak runtime drifted");
    return { mixDir, protocolSha256, assetManifestSha256 };
};
const assertBaseline = (factory: BaselineFactory) => {
    if (factory.descriptor.kind !== "external-package" || typeof factory.descriptor.packageRoot !== "string")
        throw new Error("Peak baseline is not external");
    const packageRoot = path.resolve(factory.descriptor.packageRoot), repo = execFileSync("git",
        ["-C", packageRoot, "rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
    if (execFileSync("git", ["-C", repo, "rev-parse", "HEAD"], { encoding: "utf8" }).trim() !== BASELINE_COMMIT ||
        execFileSync("git", ["-C", repo, "status", "--short", "--untracked-files=no"], { encoding: "utf8" }).trim() ||
        packageRoot !== path.join(repo, "packages", "chronodivide-bot")) throw new Error("Peak baseline drifted");
};
const settings = (candidate: Bot, opponent: Bot, slot: 0 | 1): CreateOfflineOpts => {
    const gameMode = cdapi.getAvailableGameModes(MAP.name)[0]; if (!gameMode) throw new Error("Peak mode unavailable");
    return { buildOffAlly: false, cratesAppear: false, credits: 10_000, gameMode, gameSpeed: 6,
        mapName: MAP.name, mcvRepacks: true, shortGame: false, superWeapons: false, unitCount: 0, online: false,
        agents: slot === 0 ? [candidate, opponent] : [opponent, candidate] };
};
const gameApi = (bot: { lastGameApi: GameApi | null }) => { if (!bot.lastGameApi) throw new Error("Peak API missing");
    return bot.lastGameApi; };

const selectCases = async () => {
    const out = requiredPath("OUT_PATH"), programPath = requiredPath("PROGRAM_PATH"),
        programSha256 = requiredText("PROGRAM_SHA256", SHA256), inputs = commonInputs();
    if (fs.existsSync(out) || sha256File(programPath) !== programSha256) throw new Error("Peak selector drifted");
    const { repo, commit } = sourceIdentity(); await cdapi.init(inputs.mixDir);
    const factory = await loadBaselineFactory(path.join(repo, "packages", "chronodivide-bot")); assertBaseline(factory);
    const cases: CaseSpec[] = []; let initializedGameCount = 0;
    for (const population of PEAK_STUDY_POPULATIONS) { let populationCaseIndex = 0;
        for (const [countryOrdinal, country] of PEAK_STUDY_COUNTRIES.entries())
            for (const [startOrdinal, desiredStart] of STARTS.entries()) for (const slot of [0, 1] as const) {
                let selected = 0;
                for (let offset = 0; offset < 100 && selected < population.casesPerCell; offset += 1) {
                    const seed = population.seedBase + 10_000 * countryOrdinal + 1_000 * startOrdinal + 100 * slot + offset,
                        candidateName = `PeakSelectCandidate_${population.id}_${countryOrdinal}_${startOrdinal}_${slot}_${offset}`,
                        opponentName = `PeakSelectOpponent_${population.id}_${countryOrdinal}_${startOrdinal}_${slot}_${offset}`,
                        candidate = createDeployedStrongBotCandidate(candidateName, country), opponent = factory.create(opponentName, country);
                    const starts = await withSeededOfflineGame(cdapi, settings(candidate, opponent, slot), seed,
                        [{ agent: candidate, identity: "candidate" }, { agent: opponent, identity: "opponent" }], async () => ({
                            candidateStart: startKey(gameApi(candidate).getPlayerData(candidateName).startLocation),
                            opponentStart: startKey(gameApi(candidate).getPlayerData(opponentName).startLocation) }));
                    initializedGameCount += 1;
                    if (starts.candidateStart === desiredStart && starts.opponentStart === OPPOSITE[desiredStart]) {
                        cases.push({ globalCaseIndex: cases.length, populationId: population.id,
                            populationCaseIndex: populationCaseIndex++, countryOrdinal, country, startOrdinal,
                            desiredStart, desiredOppositeStart: OPPOSITE[desiredStart], candidateSlot: slot,
                            repeatIndex: selected, seedOffset: offset, requestedEngineSeed: seed, ...starts }); selected += 1; }
                }
                if (selected !== population.casesPerCell) throw new Error(`Peak selection incomplete ${population.id}`);
            }
    }
    const counts = Object.fromEntries(PEAK_STUDY_POPULATIONS.map((p) =>
        [p.id, cases.filter((row) => row.populationId === p.id).length]));
    if (cases.length !== 216 || new Set(cases.map((row) => `${row.requestedEngineSeed}:${row.candidateSlot}`)).size !== 216 ||
        counts.development !== 36 || counts.replication !== 180) throw new Error("Peak selection coverage drifted");
    const artifact = { schemaVersion: 1, kind: "peak-profile-scope-selection",
        status: "PASS_PEAK_PROFILE_SCOPE_SELECTION", complete: true, passed: true, outcomeFree: true,
        scheduler: { jobId: process.env.SLURM_JOB_ID, account: "pi_jss233" }, sourceCommit: commit, programSha256,
        protocolSha256: inputs.protocolSha256, assetManifestSha256: inputs.assetManifestSha256,
        baselineCommit: BASELINE_COMMIT, map: MAP, ...PEAK_STUDY_SPEC, initializedGameCount,
        populationCounts: counts, selectedCaseCount: cases.length, updateCount: 0, forbiddenOutcomeFields: [], cases };
    fs.mkdirSync(path.dirname(out), { recursive: true, mode: 0o700 });
    fs.writeFileSync(out, JSON.stringify(artifact, null, 2) + "\n", { flag: "wx", mode: 0o600 });
    console.log(JSON.stringify({ status: artifact.status, initializedGameCount, cases: cases.length, counts }));
};
const loadSelection = (file: string, hash: string, inputs: ReturnType<typeof commonInputs>): CaseSpec[] => {
    if (sha256File(file) !== hash) throw new Error("Peak selection hash drifted");
    const value = JSON.parse(fs.readFileSync(file, "utf8")) as any;
    if (value.kind !== "peak-profile-scope-selection" || value.complete !== true || value.passed !== true ||
        value.outcomeFree !== true || value.updateCount !== 0 || value.protocolSha256 !== inputs.protocolSha256 ||
        value.assetManifestSha256 !== inputs.assetManifestSha256 || value.baselineCommit !== BASELINE_COMMIT ||
        value.map?.sha256 !== MAP.sha256 || !Array.isArray(value.forbiddenOutcomeFields) ||
        value.forbiddenOutcomeFields.length !== 0 || !Array.isArray(value.cases) || value.cases.length !== 216)
        throw new Error("Peak selection ineligible"); return value.cases;
};
const loadPrevious = (stage: number) => {
    if (stage === 0) { if (process.env.PREVIOUS_PATH || process.env.PREVIOUS_SHA256) throw new Error("Peak Stage 0 prior artifact");
        return null; }
    const file = requiredPath("PREVIOUS_PATH"), hash = requiredText("PREVIOUS_SHA256", SHA256);
    if (sha256File(file) !== hash) throw new Error("Peak prior hash drifted"); const value = JSON.parse(fs.readFileSync(file, "utf8"));
    if (value.kind !== "peak-profile-scope-stage" || value.stageIndex !== 0 || value.complete !== true ||
        value.passed !== true || !value.champion) throw new Error("Peak prior stage ineligible"); return value;
};
export const peakStageArms = (stage: number, previous: any): PeakProfileArm[] => {
    if (stage === 0) return [...PEAK_PROFILE_ARMS];
    const champion = PEAK_PROFILE_ARMS.find((row) => row.id === previous?.champion?.id);
    if (!champion || champion.id === "deployed") throw new Error("Peak champion arm drifted");
    return [PEAK_PROFILE_ARMS[0], champion];
};

const trajectorySnapshot = (game: GameApi, candidateName: string, opponentName: string) => {
    const units = game.getAllUnits().map((id) => game.getUnitData(id)).filter((unit): unit is UnitData => !!unit)
        .filter((unit) => unit.owner === candidateName || unit.owner === opponentName).map((unit) => ({
            owner: unit.owner === candidateName ? "candidate" : "opponent", rule: unit.rules.name, type: unit.rules.type,
            hitPoints: unit.hitPoints, x: unit.tile.rx, y: unit.tile.ry })).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
    return { update: game.getCurrentTick(), credits: { candidate: game.getPlayerData(candidateName).credits,
        opponent: game.getPlayerData(opponentName).credits }, units };
};
const inventory = (game: GameApi, candidateName: string, opponentName: string) => {
    const units = game.getAllUnits().map((id) => game.getUnitData(id)).filter((unit): unit is UnitData => !!unit)
        .filter((unit) => unit.owner === candidateName || unit.owner === opponentName), summarize = (owner: string) =>
        Object.fromEntries([...new Set(units.filter((unit) => unit.owner === owner).map((unit) => unit.rules.name))].sort()
            .map((name) => [name, units.filter((unit) => unit.owner === owner && unit.rules.name === name).length]));
    return { candidate: summarize(candidateName), opponent: summarize(opponentName) };
};
const runCell = async () => {
    const stage = Number(requiredText("STAGE_INDEX", /^[01]$/)), taskIndex = Number(requiredText("TASK_INDEX", /^\d+$/)),
        out = requiredPath("OUT_PATH"), programPath = requiredPath("PROGRAM_PATH"),
        programSha256 = requiredText("PROGRAM_SHA256", SHA256), selectionPath = requiredPath("SELECTION_PATH"),
        selectionSha256 = requiredText("SELECTION_SHA256", SHA256), inputs = commonInputs(), previous = loadPrevious(stage),
        arms = peakStageArms(stage, previous), populationId = stage === 0 ? "development" : "replication",
        cases = loadSelection(selectionPath, selectionSha256, inputs).filter((row) => row.populationId === populationId)
            .sort((a, b) => a.populationCaseIndex - b.populationCaseIndex), taskCount = arms.length * cases.length;
    if (taskIndex < 0 || taskIndex >= taskCount || process.env.SLURM_ARRAY_TASK_ID !== String(taskIndex) ||
        fs.existsSync(out) || sha256File(programPath) !== programSha256) throw new Error("Peak cell assignment drifted");
    const armIndex = Math.floor(taskIndex / cases.length), caseIndex = taskIndex % cases.length,
        arm = arms[armIndex], caseSpec = cases[caseIndex]; if (!arm || !caseSpec) throw new Error("Peak cell missing");
    const { repo, commit } = sourceIdentity(); await cdapi.init(inputs.mixDir);
    const factory = await loadBaselineFactory(path.join(repo, "packages", "chronodivide-bot")); assertBaseline(factory);
    const candidateName = `PeakCandidate_${stage}_${caseIndex}`, opponentName = `PeakOpponent_${stage}_${caseIndex}`,
        candidate = createPeakProfileCandidate(arm, candidateName, caseSpec.country), opponent = factory.create(opponentName, caseSpec.country),
        adjudicator = new LiteralBuildingEliminationAdjudicator({ candidate: candidateName, baseline: opponentName }),
        { audit } = installLiteralEndpointInstrumentation({ candidate, baseline: opponent }, adjudicator);
    const result = await withSeededOfflineGame(cdapi, settings(candidate, opponent, caseSpec.candidateSlot),
        caseSpec.requestedEngineSeed, [{ agent: candidate, identity: "candidate" }, { agent: opponent, identity: "opponent" }],
        async (game) => { const api = gameApi(candidate); if (startKey(api.getPlayerData(candidateName).startLocation) !== caseSpec.desiredStart ||
            startKey(api.getPlayerData(opponentName).startLocation) !== caseSpec.desiredOppositeStart) throw new Error("Peak start drifted");
            const trajectory = crypto.createHash("sha256"); let lastSnapshot = -1;
            const snap = () => { trajectory.update(JSON.stringify(trajectorySnapshot(api, candidateName, opponentName)) + "\n");
                lastSnapshot = api.getCurrentTick(); }; snap(); let updates = 0, terminal: any = null, failure: any = null;
            while (updates < 90_000 && !terminal && !failure) { adjudicator.beginUpdate(api); await game.update(); updates += 1;
                const stats = game.getPlayerStats(), c = stats.find((row) => row.name === candidateName),
                    o = stats.find((row) => row.name === opponentName); if (!c || !o) throw new Error("Peak stats missing");
                const endpoint = adjudicator.completeUpdate(api, { finished: game.isFinished(), defeated: {
                    candidate: c.defeated, baseline: o.defeated } }); terminal = endpoint.terminal; failure = endpoint.technicalFailure;
                if (updates % 60 === 0) snap(); }
            if (failure) throw new Error(`Peak endpoint failure ${JSON.stringify(failure)}`); if (lastSnapshot !== api.getCurrentTick()) snap();
            const buildings = snapshotCombatantBuildings(api, { candidate: candidateName, baseline: opponentName }),
                winner: Winner = terminal?.winner === "candidate" ? "first" : terminal?.winner === "baseline" ? "opponent" : "draw";
            return { stageIndex: stage, taskIndex, armIndex, armId: arm.id, caseIndex, populationId,
                populationCaseIndex: caseSpec.populationCaseIndex, country: caseSpec.country,
                side: ALLIED.has(caseSpec.country) ? "Allied" : "Soviet", candidateSlot: caseSpec.candidateSlot,
                requestedEngineSeed: caseSpec.requestedEngineSeed, candidateStart: caseSpec.desiredStart,
                opponentStart: caseSpec.desiredOppositeStart, updates, status: terminal?.status ?? "tick_cap_draw", winner,
                trajectorySha256: trajectory.digest("hex"), terminalBuildingCounts: {
                    candidate: buildings.filter((row) => row.owner === candidateName).length,
                    opponent: buildings.filter((row) => row.owner === opponentName).length },
                terminalUnitInventory: inventory(api, candidateName, opponentName),
                quitAttempts: { ...audit.attempts }, quitForwarded: { ...audit.forwarded } }; });
    const provenance = createExperimentManifest({ runId: `peak-profile-${stage}-${taskIndex}-${process.env.SLURM_JOB_ID}`,
        mixDir: inputs.mixDir, maps: [MAP.name], effectiveConfig: { stage, taskIndex, arm, caseSpec, selectionSha256,
            previousStageSha256: stage === 0 ? null : process.env.PREVIOUS_SHA256 }, baseline: factory.descriptor,
        gameSeedBase: caseSpec.requestedEngineSeed });
    const artifact = { schemaVersion: 1, kind: "peak-profile-scope-cell", status: "COMPLETE_PEAK_PROFILE_SCOPE_CELL",
        complete: true, stageIndex: stage, taskIndex, armIndex, armId: arm.id, caseIndex,
        schedulerAccount: "pi_jss233", schedulerJobId: process.env.SLURM_JOB_ID, sourceCommit: commit, programSha256,
        protocolSha256: inputs.protocolSha256, assetManifestSha256: inputs.assetManifestSha256, selectionSha256,
        previousStageSha256: stage === 0 ? null : requiredText("PREVIOUS_SHA256", SHA256),
        baselineCommit: BASELINE_COMMIT, map: MAP, result, provenance };
    fs.mkdirSync(path.dirname(out), { recursive: true, mode: 0o700 });
    fs.writeFileSync(out, JSON.stringify(artifact, null, 2) + "\n", { flag: "wx", mode: 0o600 });
    console.log(JSON.stringify({ status: artifact.status, stage, taskIndex, armId: arm.id, caseIndex }));
};

const completedTasks = (job: string) => { const raw = execFileSync("/opt/slurm/current/bin/sacct",
    ["-j", job, "-n", "-P", "-X", "--format=JobID,JobIDRaw,State,ExitCode,Account"], { encoding: "utf8" }),
    tasks = new Map<number, string>(); for (const line of raw.split("\n").filter(Boolean)) { const [label, rawId, state, exitCode, account] = line.split("|"),
        match = new RegExp(`^${job}_(\\d+)$`).exec(label); if (match && state === "COMPLETED" && exitCode === "0:0" && account === "pi_jss233") tasks.set(+match[1], rawId); }
    return tasks; };
const score = (winner: Winner) => winner === "first" ? 1 : winner === "draw" ? 0.5 : 0;
const sampleSd = (values: number[]) => { const mean = values.reduce((a, b) => a + b, 0) / values.length;
    return Math.sqrt(values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (values.length - 1)); };
const wilsonLower = (wins: number, games: number) => { const z = 1.6448536269514722, p = wins / games, z2 = z * z;
    return (p + z2 / (2 * games) - z * Math.sqrt(p * (1 - p) / games + z2 / (4 * games * games))) / (1 + z2 / games); };
const summarize = (rows: any[]) => { const wins = rows.filter((r) => r.winner === "first").length,
    losses = rows.filter((r) => r.winner === "opponent").length, draws = rows.length - wins - losses;
    return { games: rows.length, wins, draws, losses, winRate: wins / rows.length,
        oneSided95WilsonLower: wilsonLower(wins, rows.length) }; };
const exactFields = ["trajectorySha256", "winner", "status", "updates", "terminalBuildingCounts",
    "terminalUnitInventory", "quitAttempts", "quitForwarded"];
const analyze = (rows: any[], controls: any[], tCritical: number) => { const byCase = new Map(controls.map((row) => [row.populationCaseIndex, row])),
    pairs = rows.map((row) => { const control = byCase.get(row.populationCaseIndex); if (!control) throw new Error("Peak control missing");
        const mismatch = exactFields.filter((field) => JSON.stringify(row[field]) !== JSON.stringify(control[field]));
        return { ...row, difference: score(row.winner) - score(control.winner), exact: mismatch.length === 0, mismatch }; }),
    values = pairs.map((row) => row.difference), mean = values.reduce((a, b) => a + b, 0) / values.length,
    sd = sampleSd(values); return { overall: summarize(rows), paired: { cases: pairs.length, mean,
        sampleStandardDeviation: sd, tCritical, oneSidedLower: mean - tCritical * sd / Math.sqrt(values.length),
        improved: pairs.filter((r) => r.difference > 0).length, tied: pairs.filter((r) => r.difference === 0).length,
        worsened: pairs.filter((r) => r.difference < 0).length }, pairs }; };
const strata = (rows: any[], key: string, values: readonly any[]) => Object.fromEntries(values.map((value) =>
    [String(value), summarize(rows.filter((row) => row[key] === value))]));
const finalize = () => {
    const stage = Number(requiredText("STAGE_INDEX", /^[01]$/)), root = requiredPath("RESULTS_ROOT"), out = requiredPath("OUT_PATH"),
        arrayJobId = requiredText("ARRAY_JOB_ID", /^\d+$/), programSha256 = requiredText("PROGRAM_SHA256", SHA256),
        selectionSha256 = requiredText("SELECTION_SHA256", SHA256), inputs = commonInputs(), previous = loadPrevious(stage),
        previousStageSha256 = stage === 0 ? null : requiredText("PREVIOUS_SHA256", SHA256), arms = peakStageArms(stage, previous),
        caseCount = stage === 0 ? 36 : 180, taskCount = arms.length * caseCount,
        cellProgramSha256 = process.env.CELL_PROGRAM_SHA256 ? requiredText("CELL_PROGRAM_SHA256", SHA256) : programSha256;
    if (fs.existsSync(out)) throw new Error("Peak finalizer exists"); const commit = sourceIdentity().commit; let tasks = new Map<number, string>();
    for (let i = 0; i < 31; i += 1) { tasks = completedTasks(arrayJobId); if (tasks.size === taskCount) break; if (i < 30) execFileSync("sleep", ["2"]); }
    if (tasks.size !== taskCount) throw new Error(`Peak scheduler ${tasks.size}/${taskCount}`); const rows: any[] = [];
    for (let taskIndex = 0; taskIndex < taskCount; taskIndex += 1) { const taskRoot = path.join(root,
        `task-${String(taskIndex).padStart(3, "0")}`), file = path.join(taskRoot, "cell.json");
        if (sha256File(file) !== fs.readFileSync(path.join(taskRoot, "cell.sha256"), "utf8").trim().split(/\s+/)[0]) throw new Error(`Peak checksum ${taskIndex}`);
        const cell = JSON.parse(fs.readFileSync(file, "utf8")), armIndex = Math.floor(taskIndex / caseCount), caseIndex = taskIndex % caseCount;
        if (cell.kind !== "peak-profile-scope-cell" || cell.complete !== true || cell.stageIndex !== stage || cell.taskIndex !== taskIndex ||
            cell.armIndex !== armIndex || cell.armId !== arms[armIndex].id || cell.caseIndex !== caseIndex || String(cell.schedulerJobId) !== tasks.get(taskIndex) ||
            cell.sourceCommit !== commit || cell.programSha256 !== cellProgramSha256 || cell.protocolSha256 !== inputs.protocolSha256 ||
            cell.assetManifestSha256 !== inputs.assetManifestSha256 || cell.selectionSha256 !== selectionSha256 ||
            cell.previousStageSha256 !== previousStageSha256 || cell.baselineCommit !== BASELINE_COMMIT || cell.map?.sha256 !== MAP.sha256 ||
            cell.result.quitForwarded?.candidate !== 0 || cell.result.quitForwarded?.baseline !== 0) throw new Error(`Peak cell ${taskIndex}`); rows.push(cell.result); }
    const controls = rows.filter((row) => row.armId === "deployed"), controlSummary = summarize(controls),
        tCritical = stage === 0 ? 1.30621 : 1.65341, candidates = arms.slice(1).map((arm, declarationIndex) => {
            const candidateRows = rows.filter((row) => row.armId === arm.id), analysis = analyze(candidateRows, controls, tCritical),
                byStart = strata(candidateRows, "candidateStart", STARTS), bySide = strata(candidateRows, "side", ["Allied", "Soviet"]),
                bySlot = strata(candidateRows, "candidateSlot", [0, 1]), byCountry = strata(candidateRows, "country", PEAK_STUDY_COUNTRIES),
                countrySuperior = Object.values(byCountry).filter((v: any) => v.wins > v.losses).length,
                countryNoninferior = Object.values(byCountry).filter((v: any) => v.wins >= v.losses).length,
                startSafe = Object.values(byStart).every((v: any) => v.wins > v.losses),
                sideSafe = Object.values(bySide).every((v: any) => v.wins > v.losses), slotSafe = Object.values(bySlot).every((v: any) => v.wins > v.losses),
                strongOnly = !arm.historical, weakPairs = analysis.pairs.filter((pair: any) => pair.candidateStart === WEAK),
                weakExact = !strongOnly || weakPairs.every((pair: any) => pair.exact); let clustered = null;
            if (stage === 1) { const rates = PEAK_STUDY_COUNTRIES.flatMap((country) => STARTS.map((start) =>
                summarize(candidateRows.filter((row) => row.country === country && row.candidateStart === start)).winRate)),
                mean = rates.reduce((a, b) => a + b, 0) / rates.length, sd = sampleSd(rates);
                clustered = { clusterCount: 18, meanWinRate: mean, sampleStandardDeviation: sd,
                    tCritical: 1.73961, oneSided95Lower: mean - 1.73961 * sd / Math.sqrt(18) }; }
            const eligible = analysis.overall.wins > analysis.overall.losses && analysis.paired.mean > 0 && analysis.paired.oneSidedLower > 0 &&
                (stage !== 0 || analysis.overall.losses < controlSummary.losses) &&
                startSafe && sideSafe && slotSafe && countrySuperior >= 7 &&
                countryNoninferior === 9 && weakExact && (stage === 0 || (analysis.overall.oneSided95WilsonLower > 0.5 &&
                    (clustered?.oneSided95Lower ?? 0) > 0.5));
            return { ...arm, declarationIndex, ...analysis, byStart, bySide, bySlot, byCountry,
                countrySuperior, countryNoninferior, startSafe, sideSafe, slotSafe,
                weakExactCount: weakPairs.filter((pair: any) => pair.exact).length, clustered, eligible }; });
    const resultFor = (id: PeakProfileArmId) => { const row = candidates.find((candidate) => candidate.id === id);
        return id === "deployed" ? null : row; }, deployedScore = (controlSummary.wins + 0.5 * controlSummary.draws) / controlSummary.games,
        scoreOf = (id: PeakProfileArmId) => { const row = resultFor(id); return row ? (row.overall.wins + 0.5 * row.overall.draws) / row.overall.games : deployedScore; },
        factorialEffects = stage === 0 ? { strategyScopeMainEffect: ((scoreOf("both_both") - scoreOf("bot_both")) +
            (scoreOf("strategy_both") - scoreOf("deployed"))) / 2, botScopeMainEffect: ((scoreOf("both_both") - scoreOf("strategy_both")) +
            (scoreOf("bot_both") - scoreOf("deployed"))) / 2, interaction: scoreOf("both_both") - scoreOf("strategy_both") -
            scoreOf("bot_both") + scoreOf("deployed") } : null,
        ranked = candidates.slice().sort((a, b) => Math.min(...Object.values(b.byStart).map((v: any) => v.winRate)) -
            Math.min(...Object.values(a.byStart).map((v: any) => v.winRate)) || b.paired.oneSidedLower - a.paired.oneSidedLower ||
            b.overall.winRate - a.overall.winRate || a.overall.losses - b.overall.losses ||
            Math.min(...Object.values(b.byCountry).map((v: any) => v.winRate)) - Math.min(...Object.values(a.byCountry).map((v: any) => v.winRate)) ||
            a.declarationIndex - b.declarationIndex), winner = ranked.find((row) => row.eligible) ?? null,
        champion = stage === 0 && winner ? { id: winner.id, overall: winner.overall, paired: winner.paired } : previous?.champion ?? null,
        passed = stage === 0 ? winner !== null : candidates.length === 1 && candidates[0].eligible;
    const artifact = { schemaVersion: 1, kind: "peak-profile-scope-stage",
        status: passed ? `PASS_PEAK_PROFILE_SCOPE_STAGE_${stage}` : `FAIL_PEAK_PROFILE_SCOPE_STAGE_${stage}`,
        complete: true, passed, stageIndex: stage, schedulerAccount: "pi_jss233", arrayJobId,
        finalizerJobId: process.env.SLURM_JOB_ID, sourceCommit: commit, programSha256, cellProgramSha256,
        protocolSha256: inputs.protocolSha256, assetManifestSha256: inputs.assetManifestSha256, selectionSha256,
        previousStageSha256, baselineCommit: BASELINE_COMMIT, map: MAP, launchedGameCount: rows.length,
        control: controlSummary, candidates, factorialEffects, ranking: ranked.map((row) => row.id), champion,
        schedulerJobIds: [...tasks.values()], rows };
    fs.mkdirSync(path.dirname(out), { recursive: true, mode: 0o700 });
    fs.writeFileSync(out, JSON.stringify(artifact, null, 2) + "\n", { flag: "wx", mode: 0o600 });
    console.log(JSON.stringify({ status: artifact.status, stage, ranking: artifact.ranking, champion: champion?.id ?? null, factorialEffects }));
};
const main = async () => { const mode = requiredText("MODE", /^(select|cell|finalize)$/);
    if (mode === "select") await selectCases(); else if (mode === "cell") await runCell(); else finalize(); };
const invoked = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (import.meta.url === invoked) main().catch((error) => { console.error(error); process.exitCode = 1; });
