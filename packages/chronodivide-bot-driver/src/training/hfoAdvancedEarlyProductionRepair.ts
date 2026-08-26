import { Bot, CreateOfflineOpts, GameApi, ObjectType, QueueStatus, QueueType, TechnoRules, UnitData, cdapi } from
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
import { HFO_ADVANCED_V6_COUNTRIES, v6ProhibitedCompetitivePaths, v6UnitNames } from
    "./hfoAdvancedEarlyProductionTechnical.js";
import { RA2WEB_CLIENT_COMMIT, RA2WEB_CLIENT_RELEASE_ID, RA2WEB_FREEZE_MANIFEST_SHA256,
    InspectableRa2WebBot, createInspectableRa2WebBot, loadRa2WebOpponent } from "./ra2WebOpponentBundle.js";

const MAP = { name: "cd_chrono_4_heck_freezes_over_le.map",
    sha256: "e4dfc736a6355e0e68d4681e4d67419516e6bb94549e2d42880c9414e95e2e8d" } as const;
const BASELINE_COMMIT = "165b77a71d0cf5ebd27c65b19d0486bcbae78d0f";
const ADVANCED_SHA256 = "81d8797b6dd1371ba2dcbd79e25df8b42254290c820159e121a82650fd97a143";
const WEST = "39,82", EAST = "151,119", SHA256 = /^[0-9a-f]{64}$/;
const SNAPSHOTS = new Set([0, 1_200, 2_400, 3_600, 4_800, 6_000, 7_200, 8_400, 9_600]);
const ALLIED = new Set<Countries>(HFO_ADVANCED_V6_COUNTRIES.slice(0, 5));
export const HFO_ADVANCED_V6_REPAIR_ARMS = ["noop", "vehicle_idle_or_replace"] as const;
export const HFO_ADVANCED_V6_REPAIR_SPEC = { seedBase: 4_277_500_000, maxOffsets: 100,
    traceUpdates: 9_600, caseCount: 18, armCount: 2, taskCount: 36, snapshotCount: 9 } as const;
type RepairArm = typeof HFO_ADVANCED_V6_REPAIR_ARMS[number];
type CaseSpec = { caseIndex: number; countryOrdinal: number; country: Countries; candidateSlot: 0 | 1;
    seedOffset: number; requestedEngineSeed: number; candidateStart: string; opponentStart: string };
type Telemetry = { event: string; update: number; [key: string]: unknown };
type ActionEvent = { update: number; source: "baseline" | "overlay"; method: string; args: unknown[] };

const requiredPath = (name: string): string => { const value = process.env[name];
    if (!value) throw new Error(`${name} is required`); return path.resolve(value); };
const requiredText = (name: string, pattern: RegExp): string => { const value = process.env[name];
    if (!value || !pattern.test(value)) throw new Error(`${name} is invalid`); return value; };
const sha256File = (filePath: string): string => crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
const isRecord = (value: unknown): value is Record<string, unknown> =>
    !!value && typeof value === "object" && !Array.isArray(value);
const startKey = (point: { x: number; y: number }): string => `${point.x},${point.y}`;
const sourceIdentity = () => {
    const repo = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim(),
        commit = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
    if (execFileSync("git", ["branch", "--show-current"], { encoding: "utf8" }).trim() !== "main" ||
        execFileSync("git", ["status", "--short", "--untracked-files=no"], { encoding: "utf8" }).trim() !== "" ||
        execFileSync("git", ["rev-parse", "fork/main"], { encoding: "utf8" }).trim() !== commit)
        throw new Error("V6 repair requires clean synchronized main");
    return { repo, commit };
};
const commonInputs = () => {
    if (process.env.SLURM_JOB_ACCOUNT !== "pi_jss233") throw new Error("V6 repair requires pi_jss233");
    const mixDir = requiredPath("MIX_DIR"), protocolPath = requiredPath("PROTOCOL_PATH"),
        assetManifestPath = requiredPath("ASSET_MANIFEST_PATH"), freezeRoot = requiredPath("RA2WEB_FREEZE_ROOT"),
        protocolSha256 = requiredText("PROTOCOL_SHA256", SHA256),
        assetManifestSha256 = requiredText("ASSET_MANIFEST_SHA256", SHA256);
    if (sha256File(protocolPath) !== protocolSha256 || sha256File(assetManifestPath) !== assetManifestSha256 ||
        sha256File(path.join(mixDir, MAP.name)) !== MAP.sha256) throw new Error("V6 repair input drifted");
    const manifest = JSON.parse(fs.readFileSync(assetManifestPath, "utf8")) as unknown;
    if (!isRecord(manifest) || manifest.kind !== "private-ra2-snow-runtime" ||
        path.resolve(String(manifest.runtimeDirectory)) !== mixDir) throw new Error("V6 repair runtime drifted");
    return { mixDir, protocolSha256, assetManifestSha256, freezeRoot };
};
const assertBaseline = (factory: BaselineFactory) => {
    if (factory.descriptor.kind !== "external-package" || typeof factory.descriptor.packageRoot !== "string")
        throw new Error("V6 repair baseline is not external");
    const packageRoot = path.resolve(factory.descriptor.packageRoot),
        repo = execFileSync("git", ["-C", packageRoot, "rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
    if (execFileSync("git", ["-C", repo, "rev-parse", "HEAD"], { encoding: "utf8" }).trim() !== BASELINE_COMMIT ||
        execFileSync("git", ["-C", repo, "status", "--short", "--untracked-files=no"], { encoding: "utf8" }).trim() ||
        packageRoot !== path.join(repo, "packages", "chronodivide-bot")) throw new Error("V6 repair baseline drifted");
};
const loadAdvanced = (root: string) => { const loaded = loadRa2WebOpponent(root, "ra2web_advanced_old_priest");
    if (loaded.freezeManifestSha256 !== RA2WEB_FREEZE_MANIFEST_SHA256 || loaded.bundleSha256 !== ADVANCED_SHA256)
        throw new Error("V6 repair opponent drifted"); return loaded; };
const settings = (first: Bot, opponent: Bot, slot: 0 | 1): CreateOfflineOpts => {
    const gameMode = cdapi.getAvailableGameModes(MAP.name)[0]; if (!gameMode) throw new Error("V6 repair mode unavailable");
    return { buildOffAlly: false, cratesAppear: false, credits: 10_000, gameMode, gameSpeed: 6,
        mapName: MAP.name, mcvRepacks: true, shortGame: false, superWeapons: false, unitCount: 0, online: false,
        agents: slot === 0 ? [first, opponent] : [opponent, first] };
};
const api = (bot: { lastGameApi: GameApi | null }) => { if (!bot.lastGameApi) throw new Error("V6 repair API missing");
    return bot.lastGameApi; };

const select = async () => {
    const out = requiredPath("OUT_PATH"), programPath = requiredPath("PROGRAM_PATH"),
        programSha256 = requiredText("PROGRAM_SHA256", SHA256), inputs = commonInputs();
    if (fs.existsSync(out) || sha256File(programPath) !== programSha256) throw new Error("V6 repair selector drifted");
    const { repo, commit } = sourceIdentity(); await cdapi.init(inputs.mixDir);
    const factory = await loadBaselineFactory(path.join(repo, "packages", "chronodivide-bot")); assertBaseline(factory);
    const advanced = loadAdvanced(inputs.freezeRoot), cases: CaseSpec[] = []; let initializedGameCount = 0;
    for (const [countryOrdinal, country] of HFO_ADVANCED_V6_COUNTRIES.entries()) for (const slot of [0, 1] as const) {
        let selected = false;
        for (let offset = 0; offset < 100 && !selected; offset += 1) {
            const seed = 4_277_500_000 + 10_000 * countryOrdinal + 100 * slot + offset,
                firstName = `V6RepairSelectFirst_${countryOrdinal}_${slot}_${offset}`,
                opponentName = `V6RepairSelectAdvanced_${countryOrdinal}_${slot}_${offset}`,
                first = factory.create(firstName, country), opponent = createInspectableRa2WebBot(advanced, opponentName, country);
            const starts = await withSeededOfflineGame(cdapi, settings(first, opponent, slot), seed,
                [{ agent: first, identity: "first" }, { agent: opponent, identity: "opponent" }], async () => ({
                    candidateStart: startKey(api(first).getPlayerData(firstName).startLocation),
                    opponentStart: startKey(api(first).getPlayerData(opponentName).startLocation) }));
            initializedGameCount += 1;
            if (starts.candidateStart === WEST && starts.opponentStart === EAST) {
                cases.push({ caseIndex: cases.length, countryOrdinal, country, candidateSlot: slot, seedOffset: offset,
                    requestedEngineSeed: seed, ...starts }); selected = true;
            }
        }
        if (!selected) throw new Error(`V6 repair selection incomplete ${country} slot ${slot}`);
    }
    if (cases.length !== 18 || new Set(cases.map((row) => `${row.requestedEngineSeed}:${row.candidateSlot}`)).size !== 18)
        throw new Error("V6 repair coverage drifted");
    const artifact = { schemaVersion: 1, kind: "hfo-advanced-v6-repair-selection",
        technicalState: "PASS_HFO_ADVANCED_V6_REPAIR_SELECTION", complete: true, passed: true, outcomeFree: true,
        scheduler: { jobId: process.env.SLURM_JOB_ID, account: "pi_jss233" }, sourceCommit: commit, programSha256,
        protocolSha256: inputs.protocolSha256, assetManifestSha256: inputs.assetManifestSha256,
        baselineCommit: BASELINE_COMMIT, ra2webClientCommit: RA2WEB_CLIENT_COMMIT,
        ra2webClientReleaseId: RA2WEB_CLIENT_RELEASE_ID, freezeManifestSha256: advanced.freezeManifestSha256,
        advancedBundleSha256: advanced.bundleSha256, ...HFO_ADVANCED_V6_REPAIR_SPEC, initializedGameCount,
        selectedCaseCount: cases.length, updateCount: 0, forbiddenCompetitiveFields: [], cases };
    fs.mkdirSync(path.dirname(out), { recursive: true, mode: 0o700 });
    fs.writeFileSync(out, JSON.stringify(artifact, null, 2) + "\n", { flag: "wx", mode: 0o600 });
    console.log(JSON.stringify({ technicalState: artifact.technicalState, cases: cases.length, initializedGameCount }));
};
const loadSelection = (file: string, hash: string, inputs: ReturnType<typeof commonInputs>): CaseSpec[] => {
    if (sha256File(file) !== hash) throw new Error("V6 repair selection hash drifted");
    const value = JSON.parse(fs.readFileSync(file, "utf8")) as any;
    if (value.kind !== "hfo-advanced-v6-repair-selection" || value.complete !== true || value.passed !== true ||
        value.outcomeFree !== true || value.updateCount !== 0 || value.protocolSha256 !== inputs.protocolSha256 ||
        value.assetManifestSha256 !== inputs.assetManifestSha256 || value.baselineCommit !== BASELINE_COMMIT ||
        value.ra2webClientCommit !== RA2WEB_CLIENT_COMMIT || value.freezeManifestSha256 !== RA2WEB_FREEZE_MANIFEST_SHA256 ||
        value.advancedBundleSha256 !== ADVANCED_SHA256 || !Array.isArray(value.cases) || value.cases.length !== 18)
        throw new Error("V6 repair selection ineligible");
    return value.cases;
};

const visible = (game: GameApi, name: string, relation: "self" | "enemy") => game.getVisibleUnits(name, relation)
    .map((id) => game.getUnitData(id)).filter((unit): unit is UnitData => !!unit).sort((a, b) => a.id - b.id);
const snapshot = (game: GameApi, bot: InspectableBaselineBot, country: Countries, name: string) => {
    if (!bot.lastPlayerProduction) throw new Error("V6 repair production missing");
    const tank = v6UnitNames(country).tank, own = visible(game, name, "self"), enemy = visible(game, name, "enemy"),
        vehicle = bot.lastPlayerProduction.getQueueData(QueueType.Vehicles), core = { update: game.getCurrentTick(),
            ownCredits: game.getPlayerData(name).credits, intendedTankCount: own.filter((unit) => unit.rules.name === tank).length,
            vehicleQueue: { queueStatus: vehicle.status, queuedNames: (vehicle.items ?? []).map((item: any) => item.rules?.name ?? null) },
            publicUnits: [...own.map((unit) => ({ role: "self", id: unit.id, rule: unit.rules.name, hitPoints: unit.hitPoints,
                x: unit.tile.rx, y: unit.tile.ry })), ...enemy.map((unit) => ({ role: "visible_enemy", id: unit.id,
                rule: unit.rules.name, hitPoints: unit.hitPoints, x: unit.tile.rx, y: unit.tile.ry }))] };
    return { ...core, publicStateSha256: crypto.createHash("sha256").update(JSON.stringify(core)).digest("hex") };
};
export const createV6VehicleRepairController = (enabled: boolean, country: Countries, firstName: string,
    opponentName: string) => {
    const telemetry: Telemetry[] = [], actions: ActionEvent[] = []; let update = 0, source: "baseline" | "overlay" = "baseline";
    const overlayCall = <T>(fn: () => T) => { source = "overlay"; try { return fn(); } finally { source = "baseline"; } };
    const overlay: ExternalBaselineLifecycleOverlay = {
        afterGameStart(game, bot) {
            if (startKey(game.getPlayerData(firstName).startLocation) !== WEST ||
                startKey(game.getPlayerData(opponentName).startLocation) !== EAST) throw new Error("V6 repair start drifted");
            const apiActions = bot.lastPlayerActions as any; if (!apiActions) throw new Error("V6 repair actions missing");
            for (const method of ["queueForProduction", "unqueueFromProduction", "pauseProduction", "resumeProduction", "orderUnits"])
                if (typeof apiActions[method] === "function") { const original = apiActions[method].bind(apiActions);
                    apiActions[method] = (...args: unknown[]) => { actions.push({ update, source, method, args: structuredClone(args) });
                        return original(...args); }; }
            apiActions.quitGame = () => { actions.push({ update, source, method: "quitGame_suppressed", args: [] }); };
        },
        afterGameTick(_game, bot) {
            update = _game.getCurrentTick(); if (!enabled || update < 1_200 || update > 8_400) return;
            const production = bot.lastPlayerProduction as any, tankName = v6UnitNames(country).tank,
                rule = production.getAvailableObjects(QueueType.Vehicles)
                    .find((item: TechnoRules) => item.name === tankName) as TechnoRules | undefined,
                queue = production.getQueueData(QueueType.Vehicles), idleCheck = (update - 1_200) % 90 === 0,
                replaceCheck = update >= 1_800 && update <= 7_200 && (update - 1_800) % 600 === 0;
            if (!idleCheck && !replaceCheck) return;
            telemetry.push({ event: "availability_check", update, intendedName: tankName, available: !!rule,
                queueStatus: queue.status });
            if (!rule) { telemetry.push({ event: "production_attempt_rejected", update, reason: "unavailable" }); return; }
            if (idleCheck && queue.status === QueueStatus.Idle) {
                overlayCall(() => (bot.lastPlayerActions as any).queueForProduction(QueueType.Vehicles, rule.name, rule.type, 1));
                telemetry.push({ event: "production_mutation_issued", update, mutation: "queue_idle", intendedName: tankName }); return;
            }
            const current = queue.items?.[0]?.rules as TechnoRules | undefined;
            if (replaceCheck && queue.status === QueueStatus.Active && current && current.name !== tankName) {
                overlayCall(() => { (bot.lastPlayerActions as any).unqueueFromProduction(QueueType.Vehicles,
                    current.name, current.type, 1); (bot.lastPlayerActions as any).queueForProduction(QueueType.Vehicles,
                    rule.name, rule.type, 1); });
                telemetry.push({ event: "production_mutation_issued", update, mutation: "replace_active",
                    intendedName: tankName, replacedName: current.name }); return;
            }
            telemetry.push({ event: "production_attempt_rejected", update, reason: current?.name === tankName
                ? "already_intended" : "queue_not_mutable" });
        },
    };
    return { overlay, telemetry, actions, setUpdate: (value: number) => { update = value; } };
};
const suppressOpponent = (opponent: InspectableRa2WebBot) => { const original = opponent.onGameStart.bind(opponent);
    opponent.onGameStart = (game: GameApi) => { original(game); const actions = opponent.lastPlayerActions as any;
        if (!actions) throw new Error("V6 repair opponent actions missing"); actions.quitGame = () => undefined; }; };

const trace = async () => {
    const taskIndex = Number(requiredText("TASK_INDEX", /^\d+$/)), out = requiredPath("OUT_PATH"),
        programPath = requiredPath("PROGRAM_PATH"), programSha256 = requiredText("PROGRAM_SHA256", SHA256),
        selectionPath = requiredPath("SELECTION_PATH"), selectionSha256 = requiredText("SELECTION_SHA256", SHA256),
        inputs = commonInputs();
    if (taskIndex < 0 || taskIndex >= 36 || process.env.SLURM_ARRAY_TASK_ID !== String(taskIndex) ||
        fs.existsSync(out) || sha256File(programPath) !== programSha256) throw new Error("V6 repair trace drifted");
    const cases = loadSelection(selectionPath, selectionSha256, inputs), armIndex = Math.floor(taskIndex / 18),
        caseIndex = taskIndex % 18, armId = HFO_ADVANCED_V6_REPAIR_ARMS[armIndex], caseSpec = cases[caseIndex];
    if (!armId || !caseSpec) throw new Error("V6 repair assignment drifted");
    const { repo, commit } = sourceIdentity(); await cdapi.init(inputs.mixDir);
    const factory = await loadBaselineFactory(path.join(repo, "packages", "chronodivide-bot")); assertBaseline(factory);
    const advanced = loadAdvanced(inputs.freezeRoot), firstName = `V6RepairFirst_${caseIndex}`,
        opponentName = `V6RepairAdvanced_${caseIndex}`, rawFirst = factory.create(firstName, caseSpec.country),
        controller = createV6VehicleRepairController(armId !== "noop", caseSpec.country, firstName, opponentName),
        first = decorateExternalBaselineLifecycle(rawFirst, controller.overlay),
        opponent = createInspectableRa2WebBot(advanced, opponentName, caseSpec.country); suppressOpponent(opponent);
    const technicalTrace = await withSeededOfflineGame(cdapi, settings(first, opponent, caseSpec.candidateSlot),
        caseSpec.requestedEngineSeed, [{ agent: first, identity: "first" }, { agent: opponent, identity: "opponent" }],
        async (game) => { const gameApi = api(first), snapshots: any[] = [snapshot(gameApi, first, caseSpec.country, firstName)];
            let updates = 0, earlyFinish = false;
            while (updates < 9_600) { await game.update(); updates += 1; controller.setUpdate(gameApi.getCurrentTick());
                if (game.isFinished()) { earlyFinish = true; break; }
                if (SNAPSHOTS.has(updates)) snapshots.push(snapshot(gameApi, first, caseSpec.country, firstName)); }
            return { taskIndex, armIndex, armId, caseIndex, country: caseSpec.country,
                side: ALLIED.has(caseSpec.country) ? "Allied" : "Soviet", candidateSlot: caseSpec.candidateSlot,
                requestedEngineSeed: caseSpec.requestedEngineSeed, updates, expectedUpdates: 9_600, earlyFinish,
                snapshotUpdates: snapshots.map((row) => row.update), snapshots, telemetry: controller.telemetry,
                actionAudit: controller.actions,
                traceSha256: crypto.createHash("sha256").update(JSON.stringify(snapshots)).digest("hex"),
                actionSha256: crypto.createHash("sha256").update(JSON.stringify(controller.actions)).digest("hex") }; });
    const provenance = createExperimentManifest({ runId: `hfo-advanced-v6-repair-${taskIndex}-${process.env.SLURM_JOB_ID}`,
        mixDir: inputs.mixDir, maps: [MAP.name], effectiveConfig: { taskIndex, armId, caseSpec, selectionSha256 },
        baseline: factory.descriptor, gameSeedBase: caseSpec.requestedEngineSeed });
    const artifact = { schemaVersion: 1, kind: "hfo-advanced-v6-repair-trace",
        technicalState: "COMPLETE_HFO_ADVANCED_V6_REPAIR_TRACE", complete: true, taskIndex, armIndex, armId, caseIndex,
        schedulerAccount: "pi_jss233", schedulerJobId: process.env.SLURM_JOB_ID, sourceCommit: commit, programSha256,
        protocolSha256: inputs.protocolSha256, assetManifestSha256: inputs.assetManifestSha256, selectionSha256,
        baselineCommit: BASELINE_COMMIT, ra2webClientCommit: RA2WEB_CLIENT_COMMIT,
        ra2webClientReleaseId: RA2WEB_CLIENT_RELEASE_ID, freezeManifestSha256: advanced.freezeManifestSha256,
        advancedBundleSha256: advanced.bundleSha256, technicalTrace, provenance };
    fs.mkdirSync(path.dirname(out), { recursive: true, mode: 0o700 });
    fs.writeFileSync(out, JSON.stringify(artifact, null, 2) + "\n", { flag: "wx", mode: 0o600 });
    console.log(JSON.stringify({ technicalState: artifact.technicalState, taskIndex, armId, updates: technicalTrace.updates }));
};

const completedTasks = (job: string) => { const raw = execFileSync("/opt/slurm/current/bin/sacct",
    ["-j", job, "-n", "-P", "-X", "--format=JobID,JobIDRaw,State,ExitCode,Account"], { encoding: "utf8" }),
    tasks = new Map<number, string>(); for (const line of raw.split("\n").filter(Boolean)) {
        const [label, rawId, state, exitCode, account] = line.split("|"), match = new RegExp(`^${job}_(\\d+)$`).exec(label);
        if (match && state === "COMPLETED" && exitCode === "0:0" && account === "pi_jss233") tasks.set(+match[1], rawId); }
    return tasks; };
const finalize = () => {
    const root = requiredPath("RESULTS_ROOT"), out = requiredPath("OUT_PATH"), arrayJobId = requiredText("ARRAY_JOB_ID", /^\d+$/),
        programSha256 = requiredText("PROGRAM_SHA256", SHA256), selectionSha256 = requiredText("SELECTION_SHA256", SHA256),
        inputs = commonInputs(), cellProgramSha256 = process.env.CELL_PROGRAM_SHA256
            ? requiredText("CELL_PROGRAM_SHA256", SHA256) : programSha256;
    if (fs.existsSync(out)) throw new Error("V6 repair finalizer exists"); const commit = sourceIdentity().commit;
    let tasks = new Map<number, string>(); for (let i = 0; i < 31; i += 1) { tasks = completedTasks(arrayJobId);
        if (tasks.size === 36) break; if (i < 30) execFileSync("sleep", ["2"]); }
    if (tasks.size !== 36) throw new Error("V6 repair scheduler incomplete");
    const traces: any[] = [], prohibited: string[] = [];
    for (let taskIndex = 0; taskIndex < 36; taskIndex += 1) { const taskRoot = path.join(root,
        `task-${String(taskIndex).padStart(3, "0")}`), file = path.join(taskRoot, "trace.json");
        if (sha256File(file) !== fs.readFileSync(path.join(taskRoot, "trace.sha256"), "utf8").trim().split(/\s+/)[0])
            throw new Error(`V6 repair checksum ${taskIndex}`); const cell = JSON.parse(fs.readFileSync(file, "utf8")),
            armIndex = Math.floor(taskIndex / 18), caseIndex = taskIndex % 18;
        if (cell.kind !== "hfo-advanced-v6-repair-trace" || cell.complete !== true || cell.taskIndex !== taskIndex ||
            cell.armIndex !== armIndex || cell.armId !== HFO_ADVANCED_V6_REPAIR_ARMS[armIndex] || cell.caseIndex !== caseIndex ||
            String(cell.schedulerJobId) !== tasks.get(taskIndex) || cell.sourceCommit !== commit ||
            cell.programSha256 !== cellProgramSha256 || cell.protocolSha256 !== inputs.protocolSha256 ||
            cell.assetManifestSha256 !== inputs.assetManifestSha256 || cell.selectionSha256 !== selectionSha256 ||
            cell.baselineCommit !== BASELINE_COMMIT || cell.ra2webClientCommit !== RA2WEB_CLIENT_COMMIT ||
            cell.freezeManifestSha256 !== RA2WEB_FREEZE_MANIFEST_SHA256 || cell.advancedBundleSha256 !== ADVANCED_SHA256)
            throw new Error(`V6 repair identity ${taskIndex}`);
        prohibited.push(...v6ProhibitedCompetitivePaths(cell).map((p) => `task-${taskIndex}${p}`));
        traces.push(cell.technicalTrace); }
    const noop = traces.filter((row) => row.armId === "noop"), repaired = traces.filter((row) => row.armId !== "noop"),
        controls = new Map(noop.map((row) => [row.caseIndex, row])), availabilityCases = repaired.filter((row) =>
            row.telemetry.some((e: any) => e.event === "availability_check" && e.available)).length,
        mutationCases = repaired.filter((row) => row.telemetry.some((e: any) => e.event === "production_mutation_issued")).length,
        overlay = (row: any) => row.actionAudit.filter((e: any) => e.source === "overlay"),
        noopOverlayActions = noop.flatMap(overlay), repairedActions = repaired.flatMap(overlay),
        attackCount = repairedActions.filter((e: any) => e.method === "orderUnits").length,
        prohibitedActions = repaired.flatMap((row) => overlay(row).filter((event: any) => {
            if (["pauseProduction", "resumeProduction"].includes(event.method)) return true;
            if (!["queueForProduction", "unqueueFromProduction", "orderUnits"].includes(event.method)) return false;
            if (event.method === "orderUnits") return false;
            if (event.args[0] !== QueueType.Vehicles) return true;
            return event.method === "queueForProduction" && event.args[1] !== v6UnitNames(row.country).tank;
        })),
        windowViolations = repairedActions.filter((e: any) => ["queueForProduction", "unqueueFromProduction"].includes(e.method) &&
            (e.update < 1_200 || e.update > 8_400)), traceDifferenceCases = repaired.filter((row) => {
                const control = controls.get(row.caseIndex); return control &&
                    (control.traceSha256 !== row.traceSha256 || control.actionSha256 !== row.actionSha256); }).length,
        mutationTimingViolations = repaired.flatMap((row) => row.telemetry.filter((event: any) => {
            if (event.event !== "production_mutation_issued") return false;
            if (event.mutation === "queue_idle")
                return event.update < 1_200 || event.update > 8_400 || (event.update - 1_200) % 90 !== 0;
            if (event.mutation === "replace_active")
                return event.update < 1_800 || event.update > 7_200 || (event.update - 1_800) % 600 !== 0;
            return true;
        })),
        paired = repaired.map((row) => { const control = controls.get(row.caseIndex), own = row.snapshots.find((s: any) => s.update === 9_600),
            base = control?.snapshots.find((s: any) => s.update === 9_600); return { side: row.side, slot: row.candidateSlot,
                difference: own.intendedTankCount - base.intendedTankCount }; }),
        mean = (rows: any[]) => rows.reduce((sum, row) => sum + row.difference, 0) / rows.length,
        differences = { overall: mean(paired), Allied: mean(paired.filter((r) => r.side === "Allied")),
            Soviet: mean(paired.filter((r) => r.side === "Soviet")), slot0: mean(paired.filter((r) => r.slot === 0)),
            slot1: mean(paired.filter((r) => r.slot === 1)) }, exactCoverage = noop.length === 18 && repaired.length === 18 &&
            new Set(noop.map((r) => r.country)).size === 9 && new Set(repaired.map((r) => r.country)).size === 9 &&
            noop.filter((r) => r.candidateSlot === 0).length === 9 && repaired.filter((r) => r.candidateSlot === 0).length === 9,
        passed = prohibited.length === 0 && exactCoverage && traces.every((r) => r.updates === 9_600 && !r.earlyFinish &&
            r.snapshots.length === 9) && noopOverlayActions.length === 0 && availabilityCases >= 16 && mutationCases >= 12 &&
            attackCount === 0 && prohibitedActions.length === 0 && windowViolations.length === 0 &&
            mutationTimingViolations.length === 0 && traceDifferenceCases >= 12 &&
            differences.overall > 0 && differences.Allied >= 0 && differences.Soviet >= 0 && differences.slot0 >= 0 &&
            differences.slot1 >= 0 && (differences.Allied > 0 || differences.Soviet > 0) &&
            (differences.slot0 > 0 || differences.slot1 > 0);
    const artifact = { schemaVersion: 1, kind: "hfo-advanced-v6-repair-finalizer",
        technicalState: passed ? "PASS_HFO_ADVANCED_V6_REPAIR" : "FAIL_HFO_ADVANCED_V6_REPAIR", complete: true, passed,
        schedulerAccount: "pi_jss233", arrayJobId, finalizerJobId: process.env.SLURM_JOB_ID, sourceCommit: commit,
        programSha256, cellProgramSha256, protocolSha256: inputs.protocolSha256,
        assetManifestSha256: inputs.assetManifestSha256, selectionSha256, baselineCommit: BASELINE_COMMIT,
        ra2webClientCommit: RA2WEB_CLIENT_COMMIT, ra2webClientReleaseId: RA2WEB_CLIENT_RELEASE_ID,
        freezeManifestSha256: RA2WEB_FREEZE_MANIFEST_SHA256, advancedBundleSha256: ADVANCED_SHA256,
        launchedTraceCount: traces.length, prohibitedCompetitiveFieldPaths: prohibited, exactCoverage, availabilityCases,
        mutationCases, noopOverlayActionCount: noopOverlayActions.length, overlayAttackCount: attackCount,
        prohibitedActionCount: prohibitedActions.length, windowViolationCount: windowViolations.length,
        mutationTimingViolationCount: mutationTimingViolations.length,
        traceDifferenceCases, intendedTankCountDifference: differences, schedulerJobIds: [...tasks.values()], traces };
    fs.mkdirSync(path.dirname(out), { recursive: true, mode: 0o700 });
    fs.writeFileSync(out, JSON.stringify(artifact, null, 2) + "\n", { flag: "wx", mode: 0o600 });
    console.log(JSON.stringify({ technicalState: artifact.technicalState, availabilityCases, mutationCases,
        traceDifferenceCases, differences })); };
const main = async () => { const mode = requiredText("MODE", /^(select|trace|finalize)$/);
    if (mode === "select") await select(); else if (mode === "trace") await trace(); else finalize(); };
const invoked = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (import.meta.url === invoked) main().catch((error) => { console.error(error); process.exitCode = 1; });
