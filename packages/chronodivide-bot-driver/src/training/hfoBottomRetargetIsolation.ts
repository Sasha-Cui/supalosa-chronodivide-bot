import { Bot, CreateOfflineOpts, GameApi, ObjectType, ProductionApi, QueueType, UnitData, cdapi } from "@chronodivide/game-api";
import { Countries } from "@supalosa/chronodivide-bot/dist/bot/logic/common/utils.js";
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { loadBaselineFactory } from "../benchmark/baselineLoader.js";
import { withSeededOfflineGame } from "../benchmark/seededOfflineGame.js";
import { createDeployedStrongBotCandidate, InspectableDeployedStrongBot } from "./deployedStrongBotCandidate.js";
import { LiteralBuildingEliminationAdjudicator, installLiteralEndpointInstrumentation } from "./literalBuildingEliminationEndpoint.js";

const MAP = { name: "cd_chrono_4_heck_freezes_over_le.map",
    sha256: "e4dfc736a6355e0e68d4681e4d67419516e6bb94549e2d42880c9414e95e2e8d" } as const;
const COUNTRIES = [Countries.USA, Countries.KOREA, Countries.FRANCE, Countries.GERMANY, Countries.GREAT_BRITAIN,
    Countries.LIBYA, Countries.IRAQ, Countries.CUBA, Countries.RUSSIA] as const;
const STARTS = ["39,82", "151,119", "88,34", "88,157"] as const;
const OPPOSITE: Record<typeof STARTS[number], typeof STARTS[number]> = {
    "39,82": "151,119", "151,119": "39,82", "88,34": "88,157", "88,157": "88,34",
};
export const HFO_BOTTOM_RETARGET_ISOLATION_SPEC = {
    seedBase: 4_252_000_000, maxOffsets: 400, maxTicks: 24_000, snapshotInterval: 600,
    caseCount: 36, activeCaseCount: 9, inactiveCaseCount: 27,
} as const;
const { seedBase: SEED_BASE, maxOffsets: MAX_OFFSETS, maxTicks: MAX_TICKS,
    snapshotInterval: SNAPSHOT_INTERVAL } = HFO_BOTTOM_RETARGET_ISOLATION_SPEC;
const CASE_COUNT = 36, SHA256 = /^[0-9a-f]{64}$/;
type CaseSpec = { caseIndex: number; countryOrdinal: number; country: Countries; startOrdinal: number;
    desiredStart: string; desiredOppositeStart: string; seedOffset: number; requestedEngineSeed: number;
    candidateSlot: 0 | 1; candidateStart: string; baselineStart: string; expectedActive: boolean };
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
const isRecord = (value: unknown): value is Record<string, unknown> =>
    !!value && typeof value === "object" && !Array.isArray(value);
const startKey = (point: { x: number; y: number }): string => `${point.x},${point.y}`;
const candidateApi = (candidate: InspectableDeployedStrongBot): GameApi => {
    if (!candidate.lastGameApi) throw new Error("Isolation candidate GameApi is unavailable"); return candidate.lastGameApi;
};
export const isHfoBottomRetargetIsolationActive = (desiredStart: string): boolean => desiredStart === "88,157";


const sourceIdentity = () => {
    const repo = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
    const commit = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
    if (execFileSync("git", ["branch", "--show-current"], { encoding: "utf8" }).trim() !== "main" ||
        execFileSync("git", ["status", "--short", "--untracked-files=no"], { encoding: "utf8" }).trim() !== "" ||
        execFileSync("git", ["rev-parse", "fork/main"], { encoding: "utf8" }).trim() !== commit) {
        throw new Error("Isolation gate requires clean synchronized main");
    }
    return { repo, commit };
};

const commonInputs = () => {
    if (process.env.SLURM_JOB_ACCOUNT !== "pi_jss233") throw new Error("Isolation gate requires pi_jss233");
    const mixDir = requiredPath("MIX_DIR"), protocolPath = requiredPath("PROTOCOL_PATH");
    const assetManifestPath = requiredPath("ASSET_MANIFEST_PATH");
    const protocolSha256 = requiredText("PROTOCOL_SHA256", SHA256);
    const assetManifestSha256 = requiredText("ASSET_MANIFEST_SHA256", SHA256);
    if (sha256File(protocolPath) !== protocolSha256 || sha256File(assetManifestPath) !== assetManifestSha256 ||
        sha256File(path.join(mixDir, MAP.name)) !== MAP.sha256) throw new Error("Isolation input drifted");
    const manifest = JSON.parse(fs.readFileSync(assetManifestPath, "utf8")) as unknown;
    if (!isRecord(manifest) || manifest.kind !== "private-ra2-snow-runtime" ||
        path.resolve(String(manifest.runtimeDirectory)) !== mixDir) throw new Error("Isolation runtime drifted");
    return { mixDir, protocolPath, protocolSha256, assetManifestSha256 };
};

const settings = (candidate: Bot, baseline: Bot, slot: 0 | 1): CreateOfflineOpts => {
    const gameMode = cdapi.getAvailableGameModes(MAP.name)[0];
    if (!gameMode) throw new Error("Isolation game mode is unavailable");
    return { buildOffAlly: false, cratesAppear: false, credits: 10_000, gameMode, gameSpeed: 6,
        mapName: MAP.name, mcvRepacks: true, shortGame: false, superWeapons: false, unitCount: 0, online: false,
        agents: slot === 0 ? [candidate, baseline] : [baseline, candidate] };
};

const selectCases = async (): Promise<void> => {
    const outputPath = requiredPath("OUT_PATH"), programPath = requiredPath("PROGRAM_PATH");
    const programSha256 = requiredText("PROGRAM_SHA256", SHA256), inputs = commonInputs();
    if (fs.existsSync(outputPath) || sha256File(programPath) !== programSha256) throw new Error("Isolation selection drifted");
    const { repo, commit } = sourceIdentity();
    await cdapi.init(inputs.mixDir);
    const factory = await loadBaselineFactory(path.join(repo, "packages", "chronodivide-bot"));
    const cases: CaseSpec[] = [];
    let initializedGameCount = 0;
    for (const [countryOrdinal, country] of COUNTRIES.entries()) {
        for (const [startOrdinal, desiredStart] of STARTS.entries()) {
            let selected: CaseSpec | null = null;
            for (let seedOffset = 0; seedOffset < MAX_OFFSETS && !selected; seedOffset += 1) {
                const requestedEngineSeed = SEED_BASE + countryOrdinal * 10_000 + startOrdinal * 1_000 + seedOffset;
                for (const candidateSlot of [0, 1] as const) {
                    const candidateName = `IsolationSelectCandidate_${countryOrdinal}_${startOrdinal}_${seedOffset}_${candidateSlot}`;
                    const baselineName = `IsolationSelectBaseline_${countryOrdinal}_${startOrdinal}_${seedOffset}_${candidateSlot}`;
                    const candidate = createDeployedStrongBotCandidate(candidateName, country);
                    const baseline = factory.create(baselineName, country);
                    const starts = await withSeededOfflineGame(cdapi, settings(candidate, baseline, candidateSlot),
                        requestedEngineSeed,
                        [{ agent: candidate, identity: "candidate" }, { agent: baseline, identity: "baseline" }],
                        async () => ({ candidateStart: startKey(candidateApi(candidate).getPlayerData(candidateName).startLocation),
                            baselineStart: startKey(candidateApi(candidate).getPlayerData(baselineName).startLocation) }));
                    initializedGameCount += 1;
                    if (starts.candidateStart === desiredStart && starts.baselineStart === OPPOSITE[desiredStart]) {
                        selected = { caseIndex: cases.length, countryOrdinal, country, startOrdinal, desiredStart,
                            desiredOppositeStart: OPPOSITE[desiredStart], seedOffset, requestedEngineSeed, candidateSlot,
                            ...starts, expectedActive: isHfoBottomRetargetIsolationActive(desiredStart) };
                        break;
                    }
                }
            }
            if (!selected) throw new Error(`No isolation case for ${country} ${desiredStart}`);
            cases.push(selected);
        }
    }
    if (cases.length !== CASE_COUNT || new Set(cases.map((entry) =>
        `${entry.countryOrdinal}:${entry.startOrdinal}:${entry.requestedEngineSeed}:${entry.candidateSlot}`)).size !== CASE_COUNT ||
        cases.filter((entry) => entry.expectedActive).length !== 9) throw new Error("Isolation selection coverage drifted");
    const artifact = { schemaVersion: 1, kind: "hfo-bottom-retarget-isolation-selection",
        status: "PASS_HFO_BOTTOM_RETARGET_ISOLATION_SELECTION", complete: true, passed: true, outcomeFree: true,
        scheduler: { jobId: process.env.SLURM_JOB_ID, account: "pi_jss233" }, sourceCommit: commit,
        programSha256, protocolSha256: inputs.protocolSha256, assetManifestSha256: inputs.assetManifestSha256,
        seedBase: SEED_BASE, maxOffsets: MAX_OFFSETS, initializedGameCount, updateCount: 0,
        selectedCaseCount: cases.length, activeCaseCount: 9, inactiveCaseCount: 27, forbiddenOutcomeFields: [], cases };
    fs.mkdirSync(path.dirname(outputPath), { recursive: true, mode: 0o700 });
    fs.writeFileSync(outputPath, JSON.stringify(artifact, null, 2) + "\n", { flag: "wx", mode: 0o600 });
    console.log(JSON.stringify({ status: artifact.status, initializedGameCount, cases: cases.length }));
};

const loadSelection = (selectionPath: string, selectionSha256: string, inputs: ReturnType<typeof commonInputs>): CaseSpec[] => {
    if (sha256File(selectionPath) !== selectionSha256) throw new Error("Isolation selection hash drifted");
    const selection = JSON.parse(fs.readFileSync(selectionPath, "utf8")) as unknown;
    if (!isRecord(selection) || selection.kind !== "hfo-bottom-retarget-isolation-selection" ||
        selection.status !== "PASS_HFO_BOTTOM_RETARGET_ISOLATION_SELECTION" || selection.complete !== true ||
        selection.passed !== true || selection.outcomeFree !== true || selection.updateCount !== 0 ||
        selection.selectedCaseCount !== CASE_COUNT || selection.activeCaseCount !== 9 || selection.inactiveCaseCount !== 27 ||
        selection.protocolSha256 !== inputs.protocolSha256 || selection.assetManifestSha256 !== inputs.assetManifestSha256 ||
        !Array.isArray(selection.cases) || selection.cases.length !== CASE_COUNT) throw new Error("Isolation selection is ineligible");
    return selection.cases as CaseSpec[];
};

const ownSnapshot = (game: GameApi, playerName: string, production: ProductionApi | null, tick: number) => {
    if (!production) throw new Error("Isolation production API is unavailable");
    const units = game.getAllUnits().map((id) => game.getUnitData(id)).filter((unit): unit is UnitData => !!unit)
        .filter((unit) => unit.owner === playerName).map((unit) => ({ id: unit.id, name: unit.rules.name,
            type: unit.rules.type === ObjectType.Building ? "building" : "unit", hp: unit.hitPoints,
            x: unit.tile.rx, y: unit.tile.ry })).sort((left, right) => left.id - right.id);
    return { tick, credits: game.getPlayerData(playerName).credits, units,
        queues: [QueueType.Structures, QueueType.Armory, QueueType.Infantry, QueueType.Vehicles, QueueType.Aircrafts]
            .map((queue) => ({ queue, payload: production.getQueueData(queue) })) };
};

const installActionTrace = (candidate: InspectableDeployedStrongBot, rows: ActionRow[]): void => {
    const originalStart = candidate.onGameStart.bind(candidate);
    candidate.onGameStart = (game: GameApi): void => {
        originalStart(game);
        const actions = candidate.lastPlayerActions;
        if (!actions) throw new Error("Isolation actions API is unavailable");
        const originalOrderUnits = actions.orderUnits.bind(actions);
        Object.defineProperty(actions, "orderUnits", { configurable: true, writable: true,
            value: (...args: unknown[]): unknown => {
                rows.push({ tick: game.getCurrentTick(), unitIds: Array.isArray(args[0]) ? [...args[0]] : [],
                    orderType: args[1], args: structuredClone(args) });
                return (originalOrderUnits as (...values: unknown[]) => unknown)(...args);
            } });
    };
};

const runArm = async (args: { factory: Awaited<ReturnType<typeof loadBaselineFactory>>; caseSpec: CaseSpec;
    arm: "disabled" | "exposure_enabled" }) => {
    const { factory, caseSpec, arm } = args;
    const candidateName = `IsolationCandidate_${caseSpec.caseIndex}_${arm}`;
    const baselineName = `IsolationBaseline_${caseSpec.caseIndex}_${arm}`;
    const enabled = arm === "exposure_enabled";
    const candidate = createDeployedStrongBotCandidate(candidateName, caseSpec.country, {}, enabled ? {
        hfoBottomRetarget: { enabled: true, minTick: 0, minAttackers: 0, combatantAdvantage: 0,
            activationStallTicks: 0, maxEnemyBuildings: 999, maxEnemyCombatants: 999,
            orderIntervalTicks: 6, rotationTicks: 600, stallTicks: 600, mode: "stalled_rotate" },
    } : { hfoBottomRetarget: { enabled: false } });
    const baseline = factory.create(baselineName, caseSpec.country);
    const adjudicator = new LiteralBuildingEliminationAdjudicator({ candidate: candidateName, baseline: baselineName });
    const { audit } = installLiteralEndpointInstrumentation({ candidate, baseline }, adjudicator);
    const actions: ActionRow[] = [];
    installActionTrace(candidate, actions);
    const snapshots: unknown[] = [];
    return withSeededOfflineGame(cdapi, settings(candidate, baseline, caseSpec.candidateSlot), caseSpec.requestedEngineSeed,
        [{ agent: candidate, identity: "candidate" }, { agent: baseline, identity: "baseline" }], async (game) => {
            const gameApi = candidateApi(candidate);
            if (startKey(gameApi.getPlayerData(candidateName).startLocation) !== caseSpec.desiredStart ||
                startKey(gameApi.getPlayerData(baselineName).startLocation) !== caseSpec.desiredOppositeStart) {
                throw new Error("Isolation selected start drifted");
            }
            let ticks = 0;
            snapshots.push(ownSnapshot(gameApi, candidateName, candidate.lastPlayerProduction, ticks));
            while (ticks < MAX_TICKS && !game.isFinished()) {
                adjudicator.beginUpdate(gameApi); await game.update(); ticks += 1;
                const stats = game.getPlayerStats(), candidateStats = stats.find((row) => row.name === candidateName);
                const baselineStats = stats.find((row) => row.name === baselineName);
                if (!candidateStats || !baselineStats) throw new Error("Isolation player statistics are unavailable");
                adjudicator.completeUpdate(gameApi, { finished: game.isFinished(), defeated: {
                    candidate: candidateStats.defeated, baseline: baselineStats.defeated } });
                if (ticks % SNAPSHOT_INTERVAL === 0 || game.isFinished()) {
                    snapshots.push(ownSnapshot(gameApi, candidateName, candidate.lastPlayerProduction, ticks));
                }
            }
            if (audit.forwarded.candidate !== 0 || audit.forwarded.baseline !== 0) {
                throw new Error("Isolation gate forwarded a resignation");
            }
            const retargetActivated = (candidate as unknown as { hfoBottomRetargetActivated?: boolean })
                .hfoBottomRetargetActivated === true;
            return { arm, observedTicks: ticks, engineFinished: game.isFinished(),
                suppressedQuitAttempts: { ...audit.attempts }, actionCount: actions.length,
                actionSha256: sha256Value(actions), snapshotCount: snapshots.length,
                snapshotSha256: sha256Value(snapshots), retargetActivated };
        });
};

const runCell = async (): Promise<void> => {
    const taskIndex = Number(requiredText("TASK_INDEX", /^\d+$/)), outputPath = requiredPath("OUT_PATH");
    const programPath = requiredPath("PROGRAM_PATH"), programSha256 = requiredText("PROGRAM_SHA256", SHA256);
    const selectionPath = requiredPath("SELECTION_PATH"), selectionSha256 = requiredText("SELECTION_SHA256", SHA256);
    const inputs = commonInputs();
    if (taskIndex < 0 || taskIndex >= CASE_COUNT || process.env.SLURM_ARRAY_TASK_ID !== String(taskIndex) ||
        fs.existsSync(outputPath) || sha256File(programPath) !== programSha256) throw new Error("Isolation cell drifted");
    const cases = loadSelection(selectionPath, selectionSha256, inputs), caseSpec = cases[taskIndex];
    if (!caseSpec || caseSpec.caseIndex !== taskIndex) throw new Error("Isolation case assignment drifted");
    const { repo, commit } = sourceIdentity();
    await cdapi.init(inputs.mixDir);
    const factory = await loadBaselineFactory(path.join(repo, "packages", "chronodivide-bot"));
    const defaultTrace = await runArm({ factory, caseSpec, arm: "disabled" });
    const winnerTrace = await runArm({ factory, caseSpec, arm: "exposure_enabled" });
    const inactiveEqual = defaultTrace.actionSha256 === winnerTrace.actionSha256 &&
        defaultTrace.snapshotSha256 === winnerTrace.snapshotSha256 &&
        defaultTrace.observedTicks === winnerTrace.observedTicks &&
        defaultTrace.engineFinished === winnerTrace.engineFinished &&
        JSON.stringify(defaultTrace.suppressedQuitAttempts) === JSON.stringify(winnerTrace.suppressedQuitAttempts);
    const passed = caseSpec.expectedActive
        ? !defaultTrace.retargetActivated && winnerTrace.retargetActivated &&
            defaultTrace.actionSha256 !== winnerTrace.actionSha256
        : inactiveEqual && !winnerTrace.retargetActivated;
    const artifact = { schemaVersion: 1, kind: "hfo-bottom-retarget-isolation-cell",
        status: passed ? "PASS_HFO_BOTTOM_RETARGET_ISOLATION_CELL" : "FAIL_HFO_BOTTOM_RETARGET_ISOLATION_CELL",
        complete: true, passed, outcomeFree: true, taskIndex, caseSpec,
        schedulerAccount: "pi_jss233", schedulerJobId: process.env.SLURM_JOB_ID, sourceCommit: commit,
        programSha256, protocolSha256: inputs.protocolSha256, assetManifestSha256: inputs.assetManifestSha256,
        selectionSha256, defaultTrace, winnerTrace, checks: { expectedActive: caseSpec.expectedActive, inactiveEqual,
            actionHashesDiffer: defaultTrace.actionSha256 !== winnerTrace.actionSha256,
            defaultRetargetActivated: defaultTrace.retargetActivated,
            winnerRetargetActivated: winnerTrace.retargetActivated } };
    fs.mkdirSync(path.dirname(outputPath), { recursive: true, mode: 0o700 });
    fs.writeFileSync(outputPath, JSON.stringify(artifact, null, 2) + "\n", { flag: "wx", mode: 0o600 });
    console.log(JSON.stringify({ status: artifact.status, taskIndex, expectedActive: caseSpec.expectedActive }));
    if (!passed) process.exitCode = 2;
};

const terminalTasks = (arrayJobId: string): Map<number, string> => {
    const raw = execFileSync("/opt/slurm/current/bin/sacct",
        ["-j", arrayJobId, "-n", "-P", "-X", "--format=JobID,JobIDRaw,State,ExitCode,Account"], { encoding: "utf8" });
    const tasks = new Map<number, string>();
    for (const line of raw.split("\n").filter(Boolean)) {
        const [label, rawId, state, exitCode, account] = line.split("|");
        const match = new RegExp(`^${arrayJobId}_(\\d+)$`).exec(label);
        const expectedTerminal = (state === "COMPLETED" && exitCode === "0:0") || (state === "FAILED" && exitCode === "2:0");
        if (match && expectedTerminal && account === "pi_jss233") {
            tasks.set(Number(match[1]), rawId);
        }
    }
    return tasks;
};

const finalize = (): void => {
    const root = requiredPath("RESULTS_ROOT"), outputPath = requiredPath("OUT_PATH");
    const arrayJobId = requiredText("ARRAY_JOB_ID", /^\d+$/), programSha256 = requiredText("PROGRAM_SHA256", SHA256);
    const selectionSha256 = requiredText("SELECTION_SHA256", SHA256), inputs = commonInputs();
    const cellProgramSha256 = process.env.CELL_PROGRAM_SHA256
        ? requiredText("CELL_PROGRAM_SHA256", SHA256) : programSha256;
    if (fs.existsSync(outputPath)) throw new Error("Isolation finalizer output exists");
    let tasks = new Map<number, string>();
    for (let attempt = 0; attempt < 31; attempt += 1) {
        tasks = terminalTasks(arrayJobId); if (tasks.size === CASE_COUNT) break;
        if (attempt < 30) execFileSync("sleep", ["2"]);
    }
    if (tasks.size !== CASE_COUNT) throw new Error(`Only ${tasks.size}/${CASE_COUNT} isolation tasks are terminal`);
    const cells: any[] = [], sources = new Set<string>();
    for (let taskIndex = 0; taskIndex < CASE_COUNT; taskIndex += 1) {
        const cell = JSON.parse(fs.readFileSync(path.join(root,
            `task-${String(taskIndex).padStart(2, "0")}`, "cell.json"), "utf8"));
        const expectedStatus = cell.passed === true ? "PASS_HFO_BOTTOM_RETARGET_ISOLATION_CELL" :
            cell.passed === false ? "FAIL_HFO_BOTTOM_RETARGET_ISOLATION_CELL" : null;
        if (cell.kind !== "hfo-bottom-retarget-isolation-cell" || cell.status !== expectedStatus ||
            cell.complete !== true || cell.outcomeFree !== true || cell.taskIndex !== taskIndex ||
            String(cell.schedulerJobId) !== tasks.get(taskIndex) || cell.programSha256 !== cellProgramSha256 ||
            cell.protocolSha256 !== inputs.protocolSha256 || cell.assetManifestSha256 !== inputs.assetManifestSha256 ||
            cell.selectionSha256 !== selectionSha256) throw new Error(`Isolation cell ${taskIndex} drifted`);
        sources.add(cell.sourceCommit); cells.push(cell);
    }
    const active = cells.filter((cell) => cell.caseSpec.expectedActive), inactive = cells.filter((cell) => !cell.caseSpec.expectedActive);
    const countries = new Set(cells.map((cell) => cell.caseSpec.country));
    const starts = new Set(cells.map((cell) => cell.caseSpec.desiredStart));
    const passed = cells.every((cell) => cell.passed === true) && active.length === 9 && inactive.length === 27 &&
        countries.size === 9 && starts.size === 4 && sources.size === 1;
    const artifact = { schemaVersion: 1, kind: "hfo-bottom-retarget-activation-isolation-gate",
        status: passed ? "PASS_HFO_BOTTOM_RETARGET_ACTIVATION_ISOLATION" : "FAIL_HFO_BOTTOM_RETARGET_ACTIVATION_ISOLATION",
        complete: true, passed, outcomeFree: true, schedulerAccount: "pi_jss233", arrayJobId,
        finalizerJobId: process.env.SLURM_JOB_ID, sourceCommit: [...sources][0], programSha256, cellProgramSha256,
        protocolSha256: inputs.protocolSha256, assetManifestSha256: inputs.assetManifestSha256,
        selectionSha256, activeCaseCount: active.length, inactiveCaseCount: inactive.length,
        countryCount: countries.size, startCount: starts.size, schedulerJobIds: [...tasks.values()], cells };
    fs.mkdirSync(path.dirname(outputPath), { recursive: true, mode: 0o700 });
    fs.writeFileSync(outputPath, JSON.stringify(artifact, null, 2) + "\n", { flag: "wx", mode: 0o600 });
    console.log(JSON.stringify({ status: artifact.status, active: active.length, inactive: inactive.length }));
};

const main = async (): Promise<void> => {
    const mode = requiredText("MODE", /^(select|cell|finalize)$/);
    if (mode === "select") await selectCases(); else if (mode === "cell") await runCell(); else finalize();
};
const invoked = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (import.meta.url === invoked) main().catch((error) => { console.error(error); process.exitCode = 1; });
