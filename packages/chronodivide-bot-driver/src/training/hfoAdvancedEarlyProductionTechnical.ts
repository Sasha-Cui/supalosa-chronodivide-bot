import { Bot, CreateOfflineOpts, GameApi, ObjectType, OrderType, QueueStatus, QueueType, TechnoRules, UnitData,
    cdapi } from "@chronodivide/game-api";
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
import { selectAdvancedWestTarget } from "./hfoAdvancedDecoratedOptimizerStages.js";
import { RA2WEB_CLIENT_COMMIT, RA2WEB_CLIENT_RELEASE_ID, RA2WEB_FREEZE_MANIFEST_SHA256,
    InspectableRa2WebBot, createInspectableRa2WebBot, loadRa2WebOpponent } from "./ra2WebOpponentBundle.js";

const MAP = { name: "cd_chrono_4_heck_freezes_over_le.map",
    sha256: "e4dfc736a6355e0e68d4681e4d67419516e6bb94549e2d42880c9414e95e2e8d" } as const;
const BASELINE_COMMIT = "165b77a71d0cf5ebd27c65b19d0486bcbae78d0f";
const ADVANCED_SHA256 = "81d8797b6dd1371ba2dcbd79e25df8b42254290c820159e121a82650fd97a143";
const WEST = "39,82", EAST = "151,119", SHA256 = /^[0-9a-f]{64}$/;
const SNAPSHOT_UPDATES = new Set([0, 1_200, 2_400, 3_600, 4_800, 6_000, 7_200, 8_400, 9_600]);
export const HFO_ADVANCED_V6_COUNTRIES = [Countries.USA, Countries.KOREA, Countries.FRANCE, Countries.GERMANY,
    Countries.GREAT_BRITAIN, Countries.LIBYA, Countries.IRAQ, Countries.CUBA, Countries.RUSSIA] as const;
const ALLIED = new Set<Countries>(HFO_ADVANCED_V6_COUNTRIES.slice(0, 5));
export type V6ArmId = "noop" | "infantry_rush" | "tank_rush" | "dual_rush" |
    "tank_production_only" | "vehicle_focus";
export type V6Arm = { id: V6ArmId; infantry: boolean; tank: boolean; vehicleFocus: boolean;
    attackTick: number | null; minAttackers: number; targetMode: "force_first" | "production_first" };
export const HFO_ADVANCED_V6_ARMS: readonly V6Arm[] = [
    { id: "noop", infantry: false, tank: false, vehicleFocus: false,
        attackTick: null, minAttackers: 0, targetMode: "force_first" },
    { id: "infantry_rush", infantry: true, tank: false, vehicleFocus: false,
        attackTick: 4_800, minAttackers: 4, targetMode: "force_first" },
    { id: "tank_rush", infantry: false, tank: true, vehicleFocus: false,
        attackTick: 6_000, minAttackers: 3, targetMode: "force_first" },
    { id: "dual_rush", infantry: true, tank: true, vehicleFocus: false,
        attackTick: 6_000, minAttackers: 5, targetMode: "force_first" },
    { id: "tank_production_only", infantry: false, tank: true, vehicleFocus: false,
        attackTick: null, minAttackers: 0, targetMode: "force_first" },
    { id: "vehicle_focus", infantry: false, tank: true, vehicleFocus: true,
        attackTick: 7_200, minAttackers: 4, targetMode: "production_first" },
];
export const HFO_ADVANCED_V6_SPEC = {
    seedBase: 4_277_000_000, maxOffsets: 100, traceUpdates: 9_600,
    caseCount: 18, armCount: 6, taskCount: 108, snapshotCount: 9,
} as const;
type CaseSpec = { caseIndex: number; countryOrdinal: number; country: Countries; candidateSlot: 0 | 1;
    repeatIndex: number; seedOffset: number; requestedEngineSeed: number; candidateStart: string; opponentStart: string };
type TechnicalEvent = { event: string; update: number; [key: string]: unknown };
type ActionEvent = { update: number; source: "baseline" | "overlay"; method: string; args: unknown[] };

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
const sourceIdentity = () => {
    const repo = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
    const commit = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
    if (execFileSync("git", ["branch", "--show-current"], { encoding: "utf8" }).trim() !== "main" ||
        execFileSync("git", ["status", "--short", "--untracked-files=no"], { encoding: "utf8" }).trim() !== "" ||
        execFileSync("git", ["rev-parse", "fork/main"], { encoding: "utf8" }).trim() !== commit)
        throw new Error("V6 requires clean synchronized main");
    return { repo, commit };
};
const commonInputs = () => {
    if (process.env.SLURM_JOB_ACCOUNT !== "pi_jss233") throw new Error("V6 requires pi_jss233");
    const mixDir = requiredPath("MIX_DIR"), protocolPath = requiredPath("PROTOCOL_PATH");
    const assetManifestPath = requiredPath("ASSET_MANIFEST_PATH"), freezeRoot = requiredPath("RA2WEB_FREEZE_ROOT");
    const protocolSha256 = requiredText("PROTOCOL_SHA256", SHA256),
        assetManifestSha256 = requiredText("ASSET_MANIFEST_SHA256", SHA256);
    if (sha256File(protocolPath) !== protocolSha256 || sha256File(assetManifestPath) !== assetManifestSha256 ||
        sha256File(path.join(mixDir, MAP.name)) !== MAP.sha256) throw new Error("V6 input drifted");
    const manifest = JSON.parse(fs.readFileSync(assetManifestPath, "utf8")) as unknown;
    if (!isRecord(manifest) || manifest.kind !== "private-ra2-snow-runtime" ||
        path.resolve(String(manifest.runtimeDirectory)) !== mixDir) throw new Error("V6 runtime drifted");
    return { mixDir, protocolSha256, assetManifestSha256, freezeRoot };
};
const assertExternalBaseline = (factory: BaselineFactory): void => {
    if (factory.descriptor.kind !== "external-package" || typeof factory.descriptor.packageRoot !== "string")
        throw new Error("V6 baseline is not external");
    const packageRoot = path.resolve(factory.descriptor.packageRoot),
        repo = execFileSync("git", ["-C", packageRoot, "rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
    if (execFileSync("git", ["-C", repo, "rev-parse", "HEAD"], { encoding: "utf8" }).trim() !== BASELINE_COMMIT ||
        execFileSync("git", ["-C", repo, "status", "--short", "--untracked-files=no"], { encoding: "utf8" }).trim() ||
        packageRoot !== path.join(repo, "packages", "chronodivide-bot")) throw new Error("V6 baseline drifted");
};
const loadAdvanced = (freezeRoot: string) => {
    const loaded = loadRa2WebOpponent(freezeRoot, "ra2web_advanced_old_priest");
    if (loaded.freezeManifestSha256 !== RA2WEB_FREEZE_MANIFEST_SHA256 || loaded.bundleSha256 !== ADVANCED_SHA256)
        throw new Error("V6 Advanced identity drifted");
    return loaded;
};
const settings = (first: Bot, opponent: Bot, slot: 0 | 1): CreateOfflineOpts => {
    const gameMode = cdapi.getAvailableGameModes(MAP.name)[0]; if (!gameMode) throw new Error("V6 mode unavailable");
    return { buildOffAlly: false, cratesAppear: false, credits: 10_000, gameMode, gameSpeed: 6,
        mapName: MAP.name, mcvRepacks: true, shortGame: false, superWeapons: false, unitCount: 0, online: false,
        agents: slot === 0 ? [first, opponent] : [opponent, first] };
};
const inspectableApi = (bot: { lastGameApi: GameApi | null }): GameApi => {
    if (!bot.lastGameApi) throw new Error("V6 GameApi unavailable"); return bot.lastGameApi;
};

const selectCases = async (): Promise<void> => {
    const outputPath = requiredPath("OUT_PATH"), programPath = requiredPath("PROGRAM_PATH"),
        programSha256 = requiredText("PROGRAM_SHA256", SHA256), inputs = commonInputs();
    if (fs.existsSync(outputPath) || sha256File(programPath) !== programSha256) throw new Error("V6 selector drifted");
    const { repo, commit } = sourceIdentity(); await cdapi.init(inputs.mixDir);
    const factory = await loadBaselineFactory(path.join(repo, "packages", "chronodivide-bot")); assertExternalBaseline(factory);
    const advanced = loadAdvanced(inputs.freezeRoot), cases: CaseSpec[] = []; let initializedGameCount = 0;
    for (const [countryOrdinal, country] of HFO_ADVANCED_V6_COUNTRIES.entries()) {
        for (const candidateSlot of [0, 1] as const) {
            let selected = 0;
            for (let seedOffset = 0; seedOffset < HFO_ADVANCED_V6_SPEC.maxOffsets && selected < 1; seedOffset += 1) {
                const seed = HFO_ADVANCED_V6_SPEC.seedBase + 10_000 * countryOrdinal + 100 * candidateSlot + seedOffset;
                const firstName = `V6SelectFirst_${countryOrdinal}_${candidateSlot}_${seedOffset}`,
                    opponentName = `V6SelectAdvanced_${countryOrdinal}_${candidateSlot}_${seedOffset}`;
                const first = factory.create(firstName, country), opponent = createInspectableRa2WebBot(advanced, opponentName, country);
                const starts = await withSeededOfflineGame(cdapi, settings(first, opponent, candidateSlot), seed,
                    [{ agent: first, identity: "first" }, { agent: opponent, identity: "opponent" }], async () => ({
                        candidateStart: startKey(inspectableApi(first).getPlayerData(firstName).startLocation),
                        opponentStart: startKey(inspectableApi(first).getPlayerData(opponentName).startLocation),
                    }));
                initializedGameCount += 1;
                if (starts.candidateStart === WEST && starts.opponentStart === EAST) {
                    cases.push({ caseIndex: cases.length, countryOrdinal, country, candidateSlot, repeatIndex: 0,
                        seedOffset, requestedEngineSeed: seed, ...starts }); selected += 1;
                }
            }
            if (selected !== 1) throw new Error(`V6 selection incomplete ${country} slot ${candidateSlot}`);
        }
    }
    if (cases.length !== HFO_ADVANCED_V6_SPEC.caseCount ||
        new Set(cases.map((row) => `${row.requestedEngineSeed}:${row.candidateSlot}`)).size !== cases.length)
        throw new Error("V6 selection coverage drifted");
    const artifact = { schemaVersion: 1, kind: "hfo-advanced-v6-technical-selection",
        technicalState: "PASS_HFO_ADVANCED_V6_SELECTION", complete: true, passed: true, outcomeFree: true,
        scheduler: { jobId: process.env.SLURM_JOB_ID, account: "pi_jss233" }, sourceCommit: commit, programSha256,
        protocolSha256: inputs.protocolSha256, assetManifestSha256: inputs.assetManifestSha256,
        baselineCommit: BASELINE_COMMIT, ra2webClientCommit: RA2WEB_CLIENT_COMMIT,
        ra2webClientReleaseId: RA2WEB_CLIENT_RELEASE_ID, freezeManifestSha256: advanced.freezeManifestSha256,
        advancedBundleSha256: advanced.bundleSha256, ...HFO_ADVANCED_V6_SPEC, initializedGameCount,
        selectedCaseCount: cases.length, updateCount: 0, forbiddenCompetitiveFields: [], cases };
    fs.mkdirSync(path.dirname(outputPath), { recursive: true, mode: 0o700 });
    fs.writeFileSync(outputPath, JSON.stringify(artifact, null, 2) + "\n", { flag: "wx", mode: 0o600 });
    console.log(JSON.stringify({ technicalState: artifact.technicalState, cases: cases.length, initializedGameCount }));
};

const loadSelection = (selectionPath: string, selectionSha256: string, inputs: ReturnType<typeof commonInputs>): CaseSpec[] => {
    if (sha256File(selectionPath) !== selectionSha256) throw new Error("V6 selection hash drifted");
    const value = JSON.parse(fs.readFileSync(selectionPath, "utf8")) as any;
    if (value.kind !== "hfo-advanced-v6-technical-selection" || value.complete !== true || value.passed !== true ||
        value.outcomeFree !== true || value.updateCount !== 0 || value.protocolSha256 !== inputs.protocolSha256 ||
        value.assetManifestSha256 !== inputs.assetManifestSha256 || value.baselineCommit !== BASELINE_COMMIT ||
        value.ra2webClientCommit !== RA2WEB_CLIENT_COMMIT || value.ra2webClientReleaseId !== RA2WEB_CLIENT_RELEASE_ID ||
        value.freezeManifestSha256 !== RA2WEB_FREEZE_MANIFEST_SHA256 || value.advancedBundleSha256 !== ADVANCED_SHA256 ||
        !Array.isArray(value.forbiddenCompetitiveFields) || value.forbiddenCompetitiveFields.length !== 0 ||
        !Array.isArray(value.cases) || value.cases.length !== HFO_ADVANCED_V6_SPEC.caseCount)
        throw new Error("V6 selection ineligible");
    return value.cases as CaseSpec[];
};

const isCombatant = (unit: UnitData): boolean => !!unit.rules.isSelectableCombatant && !unit.rules.harvester &&
    unit.rules.type !== ObjectType.Building;
const isDog = (unit: UnitData): boolean => unit.rules.name === "DOG" || unit.rules.name === "ADOG";
const visible = (game: GameApi, player: string, relation: "self" | "enemy", filter: (unit: UnitData) => boolean) =>
    game.getVisibleUnits(player, relation).map((id) => game.getUnitData(id))
        .filter((unit): unit is UnitData => !!unit && filter(unit)).sort((left, right) => left.id - right.id);
export const v6UnitNames = (country: Countries) => ALLIED.has(country)
    ? { infantry: "E1", tank: "MTNK" } : { infantry: "E2", tank: "HTNK" };
const queueSnapshot = (production: any, queue: QueueType) => {
    const data = production.getQueueData(queue);
    return { queue, queueStatus: data.status, queuedNames: (data.items ?? []).map((item: any) => item.rules?.name ?? null) };
};
const fixedSnapshot = (game: GameApi, bot: InspectableBaselineBot, country: Countries, firstName: string) => {
    if (!bot.lastPlayerProduction) throw new Error("V6 production unavailable");
    const names = v6UnitNames(country), own = visible(game, firstName, "self", () => true),
        enemy = visible(game, firstName, "enemy", isCombatant);
    const dogs = own.filter(isDog), infantry = own.filter((unit) => unit.rules.type === ObjectType.Infantry && !isDog(unit));
    const tanks = own.filter((unit) => unit.rules.name === names.tank), combatants = own.filter(isCombatant);
    const core = { update: game.getCurrentTick(), ownCredits: game.getPlayerData(firstName).credits,
        intendedUnitCounts: { infantry: own.filter((unit) => unit.rules.name === names.infantry).length,
            tank: tanks.length, combined: own.filter((unit) => unit.rules.name === names.infantry || unit.rules.name === names.tank).length },
        ownCounts: { infantry: infantry.length, tanks: tanks.length, dogs: dogs.length,
            otherCombatants: combatants.filter((unit) => !isDog(unit) && unit.rules.type !== ObjectType.Infantry &&
                unit.rules.name !== names.tank).length,
            harvesters: own.filter((unit) => !!unit.rules.harvester).length,
            productionBuildings: own.filter((unit) => unit.rules.type === ObjectType.Building &&
                (unit.rules.constructionYard || unit.rules.weaponsFactory || unit.rules.gdiBarracks || unit.rules.nodBarracks)).length },
        visibleEnemyCombatants: enemy.length, infantryQueue: queueSnapshot(bot.lastPlayerProduction, QueueType.Infantry),
        vehicleQueue: queueSnapshot(bot.lastPlayerProduction, QueueType.Vehicles),
        publicUnits: [...own.map((unit) => ({ role: "self", id: unit.id, rule: unit.rules.name,
            hitPoints: unit.hitPoints, x: unit.tile.rx, y: unit.tile.ry })),
        ...enemy.map((unit) => ({ role: "visible_enemy", id: unit.id, rule: unit.rules.name,
            hitPoints: unit.hitPoints, x: unit.tile.rx, y: unit.tile.ry }))] };
    return { ...core, publicStateSha256: crypto.createHash("sha256").update(JSON.stringify(core)).digest("hex") };
};

export const createV6TechnicalController = (
    arm: V6Arm,
    country: Countries,
    firstName: string,
    opponentName: string,
) => {
    const telemetry: TechnicalEvent[] = [], actions: ActionEvent[] = []; let update = 0, source: "baseline" | "overlay" = "baseline";
    let lastVehicleCheck = Number.NEGATIVE_INFINITY;
    const overlayCall = <T>(callback: () => T): T => { source = "overlay"; try { return callback(); } finally { source = "baseline"; } };
    const installAudit = (bot: InspectableBaselineBot) => {
        const api = bot.lastPlayerActions as any; if (!api) throw new Error("V6 actions unavailable");
        for (const method of ["queueForProduction", "unqueueFromProduction", "pauseProduction", "resumeProduction", "orderUnits"])
            if (typeof api[method] === "function") {
                const original = api[method].bind(api);
                api[method] = (...args: unknown[]) => { actions.push({ update, source, method, args: structuredClone(args) });
                    return original(...args); };
            }
        api.quitGame = () => { actions.push({ update, source, method: "quitGame_suppressed", args: [] }); };
    };
    const availableRule = (bot: InspectableBaselineBot, queue: QueueType, name: string): TechnoRules | null => {
        const production = bot.lastPlayerProduction; if (!production) throw new Error("V6 production unavailable");
        return production.getAvailableObjects(queue).find((rule: TechnoRules) => rule.name === name) ?? null;
    };
    const maybeIdleQueue = (bot: InspectableBaselineBot, queue: QueueType, intendedName: string) => {
        const production = bot.lastPlayerProduction as any, rule = availableRule(bot, queue, intendedName),
            data = production.getQueueData(queue), available = !!rule;
        telemetry.push({ event: "availability_check", update, queue, intendedName, available, queueStatus: data.status });
        if (!rule || data.status !== QueueStatus.Idle) {
            telemetry.push({ event: "production_attempt_rejected", update, queue, intendedName,
                reason: !rule ? "unavailable" : "queue_not_idle" }); return;
        }
        overlayCall(() => (bot.lastPlayerActions as any).queueForProduction(queue, rule.name, rule.type, 1));
        telemetry.push({ event: "production_mutation_issued", update, queue, intendedName, mutation: "queue" });
    };
    const maybeVehicleFocus = (bot: InspectableBaselineBot, tankName: string) => {
        if (update < 1_800 || update > 7_200 || update < lastVehicleCheck + 600) return;
        lastVehicleCheck = update;
        const production = bot.lastPlayerProduction as any, rule = availableRule(bot, QueueType.Vehicles, tankName),
            data = production.getQueueData(QueueType.Vehicles), current = data.items?.[0]?.rules as TechnoRules | undefined;
        telemetry.push({ event: "availability_check", update, queue: QueueType.Vehicles,
            intendedName: tankName, available: !!rule, queueStatus: data.status });
        if (!rule || data.status !== QueueStatus.Active || !current || current.name === tankName) {
            telemetry.push({ event: "production_attempt_rejected", update, queue: QueueType.Vehicles,
                intendedName: tankName, reason: !rule ? "unavailable" : current?.name === tankName ? "already_intended" : "not_replaceable" });
            return;
        }
        overlayCall(() => {
            (bot.lastPlayerActions as any).unqueueFromProduction(QueueType.Vehicles, current.name, current.type, 1);
            (bot.lastPlayerActions as any).queueForProduction(QueueType.Vehicles, rule.name, rule.type, 1);
        });
        telemetry.push({ event: "production_mutation_issued", update, queue: QueueType.Vehicles,
            intendedName: tankName, mutation: "replace", replacedName: current.name });
    };
    const maybeAttack = (game: GameApi, bot: InspectableBaselineBot) => {
        if (arm.attackTick === null) return;
        const own = visible(game, firstName, "self", (unit) => isCombatant(unit) && !isDog(unit));
        if (update < arm.attackTick || update % 24 !== 0 || own.length < arm.minAttackers) {
            if (update % 24 === 0) telemetry.push({ event: "attack_activation_check", update,
                activated: false, reason: update < arm.attackTick ? "before_window" : own.length < arm.minAttackers ? "insufficient_force" : "off_interval",
                ownCombatants: own.length });
            return;
        }
        const enemies = visible(game, firstName, "enemy", isCombatant),
            buildings = visible(game, firstName, "enemy", (unit) => unit.rules.type === ObjectType.Building),
            target = selectAdvancedWestTarget(arm.targetMode, own, enemies, buildings);
        if (target) overlayCall(() => (bot.lastPlayerActions as any).orderUnits(own.map((unit) => unit.id), OrderType.Attack, target.id));
        else {
            const start = game.getPlayerData(opponentName).startLocation;
            overlayCall(() => (bot.lastPlayerActions as any).orderUnits(own.map((unit) => unit.id), OrderType.AttackMove, start.x, start.y));
        }
        telemetry.push({ event: "attack_order_issued", update, attackerIds: own.map((unit) => unit.id),
            orderType: target ? OrderType.Attack : OrderType.AttackMove,
            targetClass: target ? (target.rules.type === ObjectType.Building ? "building" : "combatant") : "public_opponent_start" });
    };
    const overlay: ExternalBaselineLifecycleOverlay = {
        afterGameStart(game, bot) {
            installAudit(bot); const active = startKey(game.getPlayerData(firstName).startLocation) === WEST &&
                startKey(game.getPlayerData(opponentName).startLocation) === EAST;
            if (!active) throw new Error("V6 overlay outside frozen start");
        },
        afterGameTick(game, bot) {
            update = game.getCurrentTick(); const names = v6UnitNames(country);
            if (arm.id !== "noop" && update >= 1_200 && update <= 8_400 && (update - 1_200) % 90 === 0) {
                if (arm.infantry) maybeIdleQueue(bot, QueueType.Infantry, names.infantry);
                if (arm.tank && !arm.vehicleFocus) maybeIdleQueue(bot, QueueType.Vehicles, names.tank);
            }
            if (arm.vehicleFocus) maybeVehicleFocus(bot, names.tank);
            maybeAttack(game, bot);
        },
    };
    return { overlay, telemetry, actions, setUpdate: (value: number) => { update = value; } };
};
const suppressOpponentQuit = (opponent: InspectableRa2WebBot, total: { value: number }) => {
    const original = opponent.onGameStart.bind(opponent);
    opponent.onGameStart = (game: GameApi) => { original(game); const actions = opponent.lastPlayerActions as any;
        if (!actions) throw new Error("V6 opponent actions unavailable"); actions.quitGame = () => { total.value += 1; }; };
};

const runTrace = async (): Promise<void> => {
    const taskIndex = Number(requiredText("TASK_INDEX", /^\d+$/)), outputPath = requiredPath("OUT_PATH"),
        programPath = requiredPath("PROGRAM_PATH"), programSha256 = requiredText("PROGRAM_SHA256", SHA256),
        selectionPath = requiredPath("SELECTION_PATH"), selectionSha256 = requiredText("SELECTION_SHA256", SHA256),
        inputs = commonInputs();
    if (taskIndex < 0 || taskIndex >= HFO_ADVANCED_V6_SPEC.taskCount ||
        process.env.SLURM_ARRAY_TASK_ID !== String(taskIndex) || fs.existsSync(outputPath) ||
        sha256File(programPath) !== programSha256) throw new Error("V6 trace assignment drifted");
    const cases = loadSelection(selectionPath, selectionSha256, inputs),
        armIndex = Math.floor(taskIndex / HFO_ADVANCED_V6_SPEC.caseCount), caseIndex = taskIndex % HFO_ADVANCED_V6_SPEC.caseCount,
        arm = HFO_ADVANCED_V6_ARMS[armIndex], caseSpec = cases[caseIndex];
    if (!arm || !caseSpec) throw new Error("V6 trace arm drifted");
    const { repo, commit } = sourceIdentity(); await cdapi.init(inputs.mixDir);
    const factory = await loadBaselineFactory(path.join(repo, "packages", "chronodivide-bot")); assertExternalBaseline(factory);
    const loadedAdvanced = loadAdvanced(inputs.freezeRoot), firstName = `V6TraceFirst_${caseIndex}`,
        opponentName = `V6TraceAdvanced_${caseIndex}`, rawFirst = factory.create(firstName, caseSpec.country),
        controller = createV6TechnicalController(arm, caseSpec.country, firstName, opponentName),
        first = decorateExternalBaselineLifecycle(rawFirst, controller.overlay),
        opponent = createInspectableRa2WebBot(loadedAdvanced, opponentName, caseSpec.country), opponentQuitAttempts = { value: 0 };
    suppressOpponentQuit(opponent, opponentQuitAttempts);
    const trace = await withSeededOfflineGame(cdapi, settings(first, opponent, caseSpec.candidateSlot),
        caseSpec.requestedEngineSeed, [{ agent: first, identity: "first" }, { agent: opponent, identity: "opponent" }],
        async (game) => {
            const api = inspectableApi(first), snapshots: any[] = [fixedSnapshot(api, first, caseSpec.country, firstName)];
            let updates = 0, earlyFinish = false;
            while (updates < HFO_ADVANCED_V6_SPEC.traceUpdates) {
                await game.update(); updates += 1; controller.setUpdate(api.getCurrentTick());
                if (game.isFinished()) { earlyFinish = true; break; }
                if (SNAPSHOT_UPDATES.has(updates)) snapshots.push(fixedSnapshot(api, first, caseSpec.country, firstName));
            }
            const traceSha256 = crypto.createHash("sha256").update(JSON.stringify(snapshots)).digest("hex"),
                actionSha256 = crypto.createHash("sha256").update(JSON.stringify(controller.actions)).digest("hex");
            return { taskIndex, armIndex, armId: arm.id, caseIndex, country: caseSpec.country,
                side: ALLIED.has(caseSpec.country) ? "Allied" : "Soviet", candidateSlot: caseSpec.candidateSlot,
                requestedEngineSeed: caseSpec.requestedEngineSeed, updates, expectedUpdates: HFO_ADVANCED_V6_SPEC.traceUpdates,
                earlyFinish, snapshotUpdates: snapshots.map((row) => row.update), snapshots, telemetry: controller.telemetry,
                actionAudit: controller.actions, traceSha256, actionSha256,
                suppressedQuitAttemptsTotal: controller.actions.filter((row) => row.method === "quitGame_suppressed").length +
                    opponentQuitAttempts.value };
        });
    const provenance = createExperimentManifest({ runId: `hfo-advanced-v6-trace-${taskIndex}-${process.env.SLURM_JOB_ID}`,
        mixDir: inputs.mixDir, maps: [MAP.name], effectiveConfig: { taskIndex, armIndex, arm,
            caseSpec, selectionSha256, traceUpdates: HFO_ADVANCED_V6_SPEC.traceUpdates }, baseline: factory.descriptor,
        gameSeedBase: caseSpec.requestedEngineSeed });
    const artifact = { schemaVersion: 1, kind: "hfo-advanced-v6-technical-trace",
        technicalState: "COMPLETE_HFO_ADVANCED_V6_TRACE", complete: true, taskIndex, armIndex, armId: arm.id, caseIndex,
        schedulerAccount: "pi_jss233", schedulerJobId: process.env.SLURM_JOB_ID, sourceCommit: commit, programSha256,
        protocolSha256: inputs.protocolSha256, assetManifestSha256: inputs.assetManifestSha256, selectionSha256,
        baselineCommit: BASELINE_COMMIT, ra2webClientCommit: RA2WEB_CLIENT_COMMIT,
        ra2webClientReleaseId: RA2WEB_CLIENT_RELEASE_ID, freezeManifestSha256: loadedAdvanced.freezeManifestSha256,
        advancedBundleSha256: loadedAdvanced.bundleSha256, trace, provenance };
    fs.mkdirSync(path.dirname(outputPath), { recursive: true, mode: 0o700 });
    fs.writeFileSync(outputPath, JSON.stringify(artifact, null, 2) + "\n", { flag: "wx", mode: 0o600 });
    console.log(JSON.stringify({ technicalState: artifact.technicalState, taskIndex, armId: arm.id, caseIndex,
        updates: trace.updates, earlyFinish: trace.earlyFinish }));
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
const PROHIBITED = new Set(["winner", "loser", "result", "score", "wins", "draws", "losses", "defeated",
    "endpointOrientation", "terminalBuildingCounts"]);
export const v6ProhibitedCompetitivePaths = (value: unknown, prefix = ""): string[] => {
    if (Array.isArray(value)) return value.flatMap((item, index) => v6ProhibitedCompetitivePaths(item, `${prefix}/${index}`));
    if (!isRecord(value)) return [];
    return Object.entries(value).flatMap(([key, child]) => [
        ...(PROHIBITED.has(key) ? [`${prefix}/${key}`] : []),
        ...v6ProhibitedCompetitivePaths(child, `${prefix}/${key}`),
    ]);
};
const intendedCount = (trace: any, arm: V6Arm) => {
    const snapshot = trace.snapshots.find((row: any) => row.update === 9_600);
    if (!snapshot) return null;
    return arm.infantry && arm.tank ? snapshot.intendedUnitCounts.combined :
        arm.infantry ? snapshot.intendedUnitCounts.infantry : snapshot.intendedUnitCounts.tank;
};
const finalize = (): void => {
    const root = requiredPath("RESULTS_ROOT"), outputPath = requiredPath("OUT_PATH"),
        arrayJobId = requiredText("ARRAY_JOB_ID", /^\d+$/), programSha256 = requiredText("PROGRAM_SHA256", SHA256),
        selectionSha256 = requiredText("SELECTION_SHA256", SHA256), inputs = commonInputs(),
        cellProgramSha256 = process.env.CELL_PROGRAM_SHA256 ? requiredText("CELL_PROGRAM_SHA256", SHA256) : programSha256;
    if (fs.existsSync(outputPath)) throw new Error("V6 finalizer output exists");
    const currentCommit = sourceIdentity().commit; let tasks = new Map<number, string>();
    for (let attempt = 0; attempt < 31; attempt += 1) { tasks = completedTasks(arrayJobId);
        if (tasks.size === HFO_ADVANCED_V6_SPEC.taskCount) break; if (attempt < 30) execFileSync("sleep", ["2"]); }
    if (tasks.size !== HFO_ADVANCED_V6_SPEC.taskCount) throw new Error("V6 scheduler coverage incomplete");
    const traces: any[] = [], prohibited: string[] = [];
    for (let taskIndex = 0; taskIndex < HFO_ADVANCED_V6_SPEC.taskCount; taskIndex += 1) {
        const taskRoot = path.join(root, `task-${String(taskIndex).padStart(3, "0")}`),
            tracePath = path.join(taskRoot, "trace.json"), checksumPath = path.join(taskRoot, "trace.sha256");
        if (sha256File(tracePath) !== fs.readFileSync(checksumPath, "utf8").trim().split(/\s+/)[0])
            throw new Error(`V6 trace ${taskIndex} checksum drifted`);
        const cell = JSON.parse(fs.readFileSync(tracePath, "utf8")), armIndex = Math.floor(taskIndex / 18),
            caseIndex = taskIndex % 18, arm = HFO_ADVANCED_V6_ARMS[armIndex];
        if (!arm || cell.kind !== "hfo-advanced-v6-technical-trace" || cell.complete !== true ||
            cell.taskIndex !== taskIndex || cell.armIndex !== armIndex || cell.armId !== arm.id || cell.caseIndex !== caseIndex ||
            String(cell.schedulerJobId) !== tasks.get(taskIndex) || cell.sourceCommit !== currentCommit ||
            cell.programSha256 !== cellProgramSha256 || cell.protocolSha256 !== inputs.protocolSha256 ||
            cell.assetManifestSha256 !== inputs.assetManifestSha256 || cell.selectionSha256 !== selectionSha256 ||
            cell.baselineCommit !== BASELINE_COMMIT || cell.ra2webClientCommit !== RA2WEB_CLIENT_COMMIT ||
            cell.ra2webClientReleaseId !== RA2WEB_CLIENT_RELEASE_ID ||
            cell.freezeManifestSha256 !== RA2WEB_FREEZE_MANIFEST_SHA256 || cell.advancedBundleSha256 !== ADVANCED_SHA256)
            throw new Error(`V6 trace ${taskIndex} identity drifted`);
        prohibited.push(...v6ProhibitedCompetitivePaths(cell).map((entry) => `task-${taskIndex}${entry}`));
        traces.push(cell.trace);
    }
    const noop = traces.filter((row) => row.armId === "noop"), noopByCase = new Map(noop.map((row) => [row.caseIndex, row]));
    const armResults = HFO_ADVANCED_V6_ARMS.map((arm) => {
        const rows = traces.filter((row) => row.armId === arm.id), productionEvents = rows.map((row) =>
            row.telemetry.filter((event: any) => event.event === "production_mutation_issued")),
            availability = rows.map((row) => row.telemetry.some((event: any) => event.event === "availability_check" && event.available)),
            attackCases = rows.map((row) => row.telemetry.some((event: any) => event.event === "attack_order_issued")),
            overlayActions = rows.map((row) => row.actionAudit.filter((event: any) => event.source === "overlay")),
            prohibitedQueueActions = overlayActions.flat().filter((event: any) =>
                ["queueForProduction", "unqueueFromProduction", "pauseProduction", "resumeProduction"].includes(event.method) &&
                ![QueueType.Infantry, QueueType.Vehicles].includes(event.args[0])),
            windowViolations = overlayActions.flat().filter((event: any) => {
                if (event.method === "orderUnits") return arm.attackTick === null || event.update < arm.attackTick;
                if (!["queueForProduction", "unqueueFromProduction", "pauseProduction", "resumeProduction"].includes(event.method))
                    return false;
                return arm.vehicleFocus
                    ? event.update < 1_800 || event.update > 7_200
                    : event.update < 1_200 || event.update > 8_400;
            }),
            traceDifferenceCases = rows.filter((row) => {
                const control = noopByCase.get(row.caseIndex); return control &&
                    (control.traceSha256 !== row.traceSha256 || control.actionSha256 !== row.actionSha256);
            }).length;
        const paired = rows.map((row) => {
            const control = noopByCase.get(row.caseIndex), own = intendedCount(row, arm), base = control ? intendedCount(control, arm) : null;
            return { side: row.side, slot: row.candidateSlot, difference: own === null || base === null ? null : own - base };
        });
        const mean = (subset: typeof paired) => { const values = subset.map((row) => row.difference).filter((v): v is number => v !== null);
            return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null; };
        const mutationCases = productionEvents.filter((events) => events.length > 0).length,
            availabilityCases = availability.filter(Boolean).length, attacks = attackCases.filter(Boolean).length,
            noopClean = arm.id !== "noop" || overlayActions.every((events) => events.length === 0),
            productionActive = !arm.infantry && !arm.tank || availabilityCases >= 16 && mutationCases >= 12,
            attackActive = arm.attackTick === null ? attacks === 0 : attacks >= 12,
            technicallyActive = noopClean && productionActive && attackActive && prohibitedQueueActions.length === 0 &&
                windowViolations.length === 0 &&
                (arm.id === "noop" || traceDifferenceCases >= 12);
        return { id: arm.id, cases: rows.length, availabilityCases, productionMutationCases: mutationCases,
            attackCases: attacks, prohibitedQueueActionCount: prohibitedQueueActions.length,
            windowViolationCount: windowViolations.length,
            traceDifferenceCases, noopOverlayActionCount: arm.id === "noop" ? overlayActions.flat().length : null,
            intendedCountDifference: { overall: mean(paired), Allied: mean(paired.filter((row) => row.side === "Allied")),
                Soviet: mean(paired.filter((row) => row.side === "Soviet")),
                slot0: mean(paired.filter((row) => row.slot === 0)), slot1: mean(paired.filter((row) => row.slot === 1)) },
            technicallyActive };
    });
    const positiveComposition = armResults.some((row) => row.id !== "noop" &&
        (row.intendedCountDifference.overall ?? 0) > 0 && (row.intendedCountDifference.Allied ?? 0) > 0 &&
        (row.intendedCountDifference.Soviet ?? 0) > 0 && (row.intendedCountDifference.slot0 ?? 0) > 0 &&
        (row.intendedCountDifference.slot1 ?? 0) > 0);
    const exactCoverage = HFO_ADVANCED_V6_ARMS.every((arm) => {
        const rows = traces.filter((row) => row.armId === arm.id);
        return rows.length === 18 && new Set(rows.map((row) => row.country)).size === 9 &&
            rows.filter((row) => row.candidateSlot === 0).length === 9 &&
            rows.filter((row) => row.candidateSlot === 1).length === 9;
    });
    const passed = prohibited.length === 0 && traces.length === 108 && exactCoverage &&
        traces.every((row) => row.updates === 9_600 && row.earlyFinish === false && row.snapshots.length === 9) &&
        armResults.every((row) => row.technicallyActive) && positiveComposition;
    const artifact = { schemaVersion: 1, kind: "hfo-advanced-v6-technical-finalizer",
        technicalState: passed ? "PASS_HFO_ADVANCED_V6_TECHNICAL" : "FAIL_HFO_ADVANCED_V6_TECHNICAL",
        complete: true, passed, schedulerAccount: "pi_jss233", arrayJobId,
        finalizerJobId: process.env.SLURM_JOB_ID, sourceCommit: currentCommit, programSha256, cellProgramSha256,
        protocolSha256: inputs.protocolSha256, assetManifestSha256: inputs.assetManifestSha256, selectionSha256,
        baselineCommit: BASELINE_COMMIT, ra2webClientCommit: RA2WEB_CLIENT_COMMIT,
        ra2webClientReleaseId: RA2WEB_CLIENT_RELEASE_ID, freezeManifestSha256: RA2WEB_FREEZE_MANIFEST_SHA256,
        advancedBundleSha256: ADVANCED_SHA256, launchedTraceCount: traces.length,
        prohibitedCompetitiveFieldPaths: prohibited, exactCoverage, positiveComposition, armResults,
        schedulerJobIds: [...tasks.values()], traces };
    fs.mkdirSync(path.dirname(outputPath), { recursive: true, mode: 0o700 });
    fs.writeFileSync(outputPath, JSON.stringify(artifact, null, 2) + "\n", { flag: "wx", mode: 0o600 });
    console.log(JSON.stringify({ technicalState: artifact.technicalState, armResults, positiveComposition }));
};

const main = async (): Promise<void> => {
    const mode = requiredText("MODE", /^(select|trace|finalize)$/);
    if (mode === "select") await selectCases(); else if (mode === "trace") await runTrace(); else finalize();
};
const invoked = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (import.meta.url === invoked) main().catch((error) => { console.error(error); process.exitCode = 1; });
