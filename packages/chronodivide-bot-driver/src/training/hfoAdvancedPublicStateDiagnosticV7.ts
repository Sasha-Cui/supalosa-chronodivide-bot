import { ActionsApi, Bot, CreateOfflineOpts, GameApi, ObjectType, OrderType, ProductionApi, QueueType,
    UnitData, cdapi } from "@chronodivide/game-api";
import { Countries } from "@supalosa/chronodivide-bot/dist/bot/logic/common/utils.js";
import { StrongBot } from "@supalosa/chronodivide-bot/dist/bot/strongBot.js";
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { BaselineFactory, InspectableBaselineBot, loadBaselineFactory } from "../benchmark/baselineLoader.js";
import { createExperimentManifest } from "../benchmark/provenance.js";
import { withSeededOfflineGame } from "../benchmark/seededOfflineGame.js";
import { LiteralBuildingEliminationAdjudicator, installLiteralEndpointInstrumentation,
    snapshotCombatantBuildings } from "./literalBuildingEliminationEndpoint.js";
import { RA2WEB_CLIENT_COMMIT, RA2WEB_CLIENT_RELEASE_ID, RA2WEB_FREEZE_MANIFEST_SHA256,
    createInspectableRa2WebBot, loadRa2WebOpponent } from "./ra2WebOpponentBundle.js";

const MAP = { name: "cd_chrono_4_heck_freezes_over_le.map",
    sha256: "e4dfc736a6355e0e68d4681e4d67419516e6bb94549e2d42880c9414e95e2e8d" } as const;
const BASELINE_COMMIT = "165b77a71d0cf5ebd27c65b19d0486bcbae78d0f";
const ADVANCED_SHA256 = "81d8797b6dd1371ba2dcbd79e25df8b42254290c820159e121a82650fd97a143";
export const V7_LEGACY_SELECTION_SHA256 =
    "9e2945997fe49d8f8677acc8287b416408f19e2a4175bd7ff2a53e86fc5b8402" as const;
const SHA256 = /^[0-9a-f]{64}$/;
const WEST = "39,82", EAST = "151,119";
const SNAPSHOT_INTERVAL = 300, SNAPSHOT_HORIZON = 30_000, MAX_UPDATES = 90_000;
export const HFO_ADVANCED_V7_ARMS = ["external_supalosa", "deployed_strongbot"] as const;
export type V7Arm = typeof HFO_ADVANCED_V7_ARMS[number];
export const HFO_ADVANCED_V7_COUNTRIES = [Countries.USA, Countries.KOREA, Countries.FRANCE,
    Countries.GERMANY, Countries.GREAT_BRITAIN, Countries.LIBYA, Countries.IRAQ, Countries.CUBA,
    Countries.RUSSIA] as const;
const ALLIED = new Set<Countries>(HFO_ADVANCED_V7_COUNTRIES.slice(0, 5));
export const HFO_ADVANCED_V7_SPEC = { caseCount: 36, armCount: 2, taskCount: 72,
    snapshotInterval: SNAPSHOT_INTERVAL, snapshotHorizon: SNAPSHOT_HORIZON, maxUpdates: MAX_UPDATES } as const;

type V7Case = { globalCaseIndex: number; populationId: "development"; populationCaseIndex: number;
    countryOrdinal: number; country: Countries; startOrdinal: number; desiredStart: string;
    desiredOppositeStart: string; candidateSlot: 0 | 1; repeatIndex: number; seedOffset: number;
    requestedEngineSeed: number; candidateStart: string; opponentStart: string };
type InspectableCandidate = Bot & { lastGameApi: GameApi | null; lastPlayerActions: ActionsApi | null;
    lastPlayerProduction: ProductionApi | null };
type Winner = "candidate" | "opponent" | "draw";
type ActionBucket = { updateBucket: number; method: string; count: number; firstUpdate: number; lastUpdate: number;
    argumentSha256: string };
type PublicSnapshot = ReturnType<typeof publicSnapshot>;
type DiagnosticResult = { taskIndex: number; armIndex: number; armId: V7Arm; caseIndex: number;
    populationCaseIndex: number; country: Countries; side: "Allied" | "Soviet"; candidateSlot: 0 | 1;
    requestedEngineSeed: number; candidateStart: string; opponentStart: string; updates: number;
    status: string; winner: Winner; publicSnapshots: PublicSnapshot[]; publicTraceSha256: string;
    actionBuckets: ActionBucket[]; actionSha256: string; milestoneUpdates: Record<string, number | null>;
    terminalBuildingCounts: { candidate: number; opponent: number };
    quitAttempts: { candidate: number; baseline: number }; quitForwarded: { candidate: number; baseline: number };
    deterministicRepeat: null | { passed: boolean; publicTraceSha256: string; actionSha256: string;
        status: string; winner: Winner; updates: number } };

const requiredPath = (name: string): string => { const value = process.env[name];
    if (!value) throw new Error(`${name} is required`); return path.resolve(value); };
const requiredText = (name: string, pattern: RegExp): string => { const value = process.env[name];
    if (!value || !pattern.test(value)) throw new Error(`${name} is invalid`); return value; };
const sha256Text = (value: string): string => crypto.createHash("sha256").update(value).digest("hex");
const sha256File = (file: string): string => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const isRecord = (value: unknown): value is Record<string, unknown> =>
    !!value && typeof value === "object" && !Array.isArray(value);
const startKey = (point: { x: number; y: number }): string => `${point.x},${point.y}`;

const sourceIdentity = () => {
    const repo = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim(),
        commit = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
    if (execFileSync("git", ["branch", "--show-current"], { encoding: "utf8" }).trim() !== "main" ||
        execFileSync("git", ["status", "--short", "--untracked-files=no"], { encoding: "utf8" }).trim() ||
        execFileSync("git", ["rev-parse", "fork/main"], { encoding: "utf8" }).trim() !== commit)
        throw new Error("V7 requires clean synchronized main");
    return { repo, commit };
};

const commonInputs = () => {
    if (process.env.SLURM_JOB_ACCOUNT !== "pi_jss233") throw new Error("V7 requires pi_jss233");
    const mixDir = requiredPath("MIX_DIR"), protocolPath = requiredPath("PROTOCOL_PATH"),
        assetManifestPath = requiredPath("ASSET_MANIFEST_PATH"), freezeRoot = requiredPath("RA2WEB_FREEZE_ROOT"),
        protocolSha256 = requiredText("PROTOCOL_SHA256", SHA256),
        assetManifestSha256 = requiredText("ASSET_MANIFEST_SHA256", SHA256);
    if (sha256File(protocolPath) !== protocolSha256 || sha256File(assetManifestPath) !== assetManifestSha256 ||
        sha256File(path.join(mixDir, MAP.name)) !== MAP.sha256) throw new Error("V7 input drifted");
    const manifest = JSON.parse(fs.readFileSync(assetManifestPath, "utf8")) as unknown;
    if (!isRecord(manifest) || manifest.kind !== "private-ra2-snow-runtime" ||
        path.resolve(String(manifest.runtimeDirectory)) !== mixDir) throw new Error("V7 runtime drifted");
    return { mixDir, protocolSha256, assetManifestSha256, freezeRoot };
};

const assertBaseline = (factory: BaselineFactory): void => {
    if (factory.descriptor.kind !== "external-package" || typeof factory.descriptor.packageRoot !== "string")
        throw new Error("V7 baseline is not external");
    const packageRoot = path.resolve(factory.descriptor.packageRoot),
        repo = execFileSync("git", ["-C", packageRoot, "rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
    if (execFileSync("git", ["-C", repo, "rev-parse", "HEAD"], { encoding: "utf8" }).trim() !== BASELINE_COMMIT ||
        execFileSync("git", ["-C", repo, "status", "--short", "--untracked-files=no"], { encoding: "utf8" }).trim() ||
        packageRoot !== path.join(repo, "packages", "chronodivide-bot")) throw new Error("V7 baseline drifted");
};

const loadAdvanced = (root: string) => {
    const loaded = loadRa2WebOpponent(root, "ra2web_advanced_old_priest");
    if (loaded.freezeManifestSha256 !== RA2WEB_FREEZE_MANIFEST_SHA256 || loaded.bundleSha256 !== ADVANCED_SHA256)
        throw new Error("V7 Advanced identity drifted");
    return loaded;
};

const prohibitedSelectionKey = /^(winner|wins|loss|losses|draw|draws|score|defeated|terminal|terminalBuildingCounts)$/i;
export const assertOutcomeFreeSelection = (value: unknown, pathLabel = "selection"): void => {
    if (Array.isArray(value)) return value.forEach((item, index) => assertOutcomeFreeSelection(item, `${pathLabel}[${index}]`));
    if (!isRecord(value)) return;
    for (const [key, child] of Object.entries(value)) {
        if (prohibitedSelectionKey.test(key)) throw new Error(`V7 prohibited selection key ${pathLabel}.${key}`);
        assertOutcomeFreeSelection(child, `${pathLabel}.${key}`);
    }
};

export const extractV7DevelopmentCases = (legacy: unknown): V7Case[] => {
    if (!isRecord(legacy) || legacy.kind !== "hfo-advanced-v6-competitive-selection" ||
        legacy.complete !== true || legacy.passed !== true || legacy.outcomeFree !== true || legacy.updateCount !== 0 ||
        !Array.isArray(legacy.cases) || legacy.cases.length !== 468) throw new Error("V7 legacy selection ineligible");
    assertOutcomeFreeSelection(legacy);
    const cases = (legacy.cases as V7Case[]).filter((row) => row.populationId === "development")
        .sort((left, right) => left.populationCaseIndex - right.populationCaseIndex);
    if (cases.length !== HFO_ADVANCED_V7_SPEC.caseCount ||
        new Set(cases.map((row) => row.populationCaseIndex)).size !== HFO_ADVANCED_V7_SPEC.caseCount ||
        new Set(cases.map((row) => `${row.requestedEngineSeed}:${row.candidateSlot}`)).size !== cases.length ||
        cases.some((row) => row.desiredStart !== WEST || row.desiredOppositeStart !== EAST ||
            row.candidateStart !== WEST || row.opponentStart !== EAST)) throw new Error("V7 development coverage drifted");
    for (const country of HFO_ADVANCED_V7_COUNTRIES) for (const slot of [0, 1] as const)
        if (cases.filter((row) => row.country === country && row.candidateSlot === slot).length !== 2)
            throw new Error(`V7 development balance drifted ${country}:${slot}`);
    return cases;
};

const settings = (candidate: Bot, opponent: Bot, slot: 0 | 1): CreateOfflineOpts => {
    const gameMode = cdapi.getAvailableGameModes(MAP.name)[0]; if (!gameMode) throw new Error("V7 mode unavailable");
    return { buildOffAlly: false, cratesAppear: false, credits: 10_000, gameMode, gameSpeed: 6,
        mapName: MAP.name, mcvRepacks: true, shortGame: false, superWeapons: false, unitCount: 0, online: false,
        agents: slot === 0 ? [candidate, opponent] : [opponent, candidate] };
};

const unitRole = (unit: UnitData): string => {
    if (unit.rules.harvester) return "harvester";
    if (unit.rules.type !== ObjectType.Building) {
        if (unit.rules.name === "DOG" || unit.rules.name === "ADOG") return "dog";
        if (unit.rules.type === ObjectType.Infantry) return "infantry";
        return unit.rules.isSelectableCombatant ? "vehicle_or_air_combatant" : "other_unit";
    }
    if (unit.rules.constructionYard) return "construction_yard";
    if (unit.rules.refinery) return "refinery";
    if (unit.rules.weaponsFactory) return "war_factory";
    if (unit.rules.gdiBarracks || unit.rules.nodBarracks) return "barracks";
    if ((unit.rules as any).baseDefense) return "defense";
    return "other_building";
};

const summarizeUnits = (units: UnitData[]) => {
    const byRule: Record<string, number> = {}, byRole: Record<string, number> = {};
    let hitPoints = 0, approximateCost = 0;
    for (const unit of units) {
        byRule[unit.rules.name] = (byRule[unit.rules.name] ?? 0) + 1;
        const role = unitRole(unit); byRole[role] = (byRole[role] ?? 0) + 1;
        hitPoints += unit.hitPoints; approximateCost += Number((unit.rules as any).cost ?? 0);
    }
    return { total: units.length, hitPoints, approximateCost,
        combatants: units.filter((unit) => !!unit.rules.isSelectableCombatant && !unit.rules.harvester &&
            unit.rules.type !== ObjectType.Building).length,
        buildings: units.filter((unit) => unit.rules.type === ObjectType.Building).length,
        byRole: Object.fromEntries(Object.entries(byRole).sort()), byRule: Object.fromEntries(Object.entries(byRule).sort()) };
};

const queueSnapshot = (production: ProductionApi | null, queue: QueueType) => {
    if (!production) return { available: false, status: null, queued: [], producible: [] };
    const data = production.getQueueData(queue);
    return { available: true, status: String(data.status),
        queued: (data.items ?? []).map((item: any) => ({ name: item.rules?.name ?? null, quantity: item.quantity ?? null })),
        producible: production.getAvailableObjects(queue).map((rule: any) => rule.name).sort() };
};

const centroid = (units: UnitData[]) => units.length === 0 ? null : {
    x: units.reduce((sum, unit) => sum + unit.tile.rx, 0) / units.length,
    y: units.reduce((sum, unit) => sum + unit.tile.ry, 0) / units.length };
const distance = (unit: UnitData, point: { x: number; y: number }) =>
    Math.hypot(unit.tile.rx - point.x, unit.tile.ry - point.y);

const publicSnapshot = (game: GameApi, bot: InspectableCandidate, candidateName: string, opponentName: string) => {
    const own = game.getVisibleUnits(candidateName, "self").map((id) => game.getUnitData(id))
        .filter((unit): unit is UnitData => !!unit).sort((a, b) => a.id - b.id),
        enemy = game.getVisibleUnits(candidateName, "enemy").map((id) => game.getUnitData(id))
            .filter((unit): unit is UnitData => !!unit).sort((a, b) => a.id - b.id),
        ownCombatants = own.filter((unit) => !!unit.rules.isSelectableCombatant && !unit.rules.harvester &&
            unit.rules.type !== ObjectType.Building),
        visibleEnemyCombatants = enemy.filter((unit) => !!unit.rules.isSelectableCombatant && !unit.rules.harvester &&
            unit.rules.type !== ObjectType.Building),
        ownProduction = own.filter((unit) => unit.rules.type === ObjectType.Building &&
            (unit.rules.weaponsFactory || unit.rules.gdiBarracks || unit.rules.nodBarracks)),
        ownStart = game.getPlayerData(candidateName).startLocation,
        opponentStart = game.getPlayerData(opponentName).startLocation,
        regionCounts = { home: ownCombatants.filter((unit) => distance(unit, ownStart) <= 24).length,
            midfield: ownCombatants.filter((unit) => distance(unit, ownStart) > 24 && distance(unit, opponentStart) > 24).length,
            opponentBase: ownCombatants.filter((unit) => distance(unit, opponentStart) <= 24).length },
        threats = Object.fromEntries([8, 16, 24].map((radius) => [String(radius), visibleEnemyCombatants.filter((unit) =>
            ownProduction.some((building) => distance(unit, { x: building.tile.rx, y: building.tile.ry }) <= radius)).length]));
    const core = { update: game.getCurrentTick(), candidateCredits: game.getPlayerData(candidateName).credits,
        opponentCreditsPublic: game.getPlayerData(opponentName).credits, powerCapabilityAvailable: false,
        own: summarizeUnits(own), visibleEnemy: summarizeUnits(enemy), ownCombatantCentroid: centroid(ownCombatants),
        visibleEnemyCombatantCentroid: centroid(visibleEnemyCombatants), ownCombatantRegions: regionCounts,
        visibleThreatsNearProduction: threats,
        queues: { infantry: queueSnapshot(bot.lastPlayerProduction, QueueType.Infantry),
            vehicles: queueSnapshot(bot.lastPlayerProduction, QueueType.Vehicles),
            structures: queueSnapshot(bot.lastPlayerProduction, QueueType.Structures) } };
    return { ...core, publicStateSha256: sha256Text(JSON.stringify(core)) };
};

const installCandidateActionAudit = (bot: InspectableCandidate) => {
    let currentUpdate = 0, attackUpdate: number | null = null;
    const buckets = new Map<string, { count: number; first: number; last: number; hash: crypto.Hash }>(),
        originalStart = bot.onGameStart.bind(bot), attackOrders = new Set<any>([OrderType.Attack, OrderType.AttackMove,
            (OrderType as any).ForceAttack]);
    bot.onGameStart = (game: GameApi) => {
        originalStart(game); const actions = bot.lastPlayerActions as any;
        if (!actions) throw new Error("V7 candidate actions unavailable");
        for (const method of ["queueForProduction", "unqueueFromProduction", "pauseProduction", "resumeProduction",
            "orderUnits", "placeBuilding", "sellUnit"]) if (typeof actions[method] === "function") {
            const original = actions[method].bind(actions);
            actions[method] = (...args: unknown[]) => {
                const observedUpdate = bot.lastGameApi?.getCurrentTick() ?? currentUpdate,
                    updateBucket = Math.floor(observedUpdate / 24) * 24, key = `${updateBucket}:${method}`,
                    bucket = buckets.get(key) ?? { count: 0, first: observedUpdate, last: observedUpdate,
                        hash: crypto.createHash("sha256") };
                bucket.count += 1; bucket.last = observedUpdate; bucket.hash.update(JSON.stringify(args) + "\n");
                buckets.set(key, bucket);
                if (method === "orderUnits" && attackOrders.has(args[1]) && attackUpdate === null) attackUpdate = observedUpdate;
                return original(...args);
            };
        }
    };
    return { setUpdate(value: number) { currentUpdate = value; }, firstAttackUpdate: () => attackUpdate,
        finalize: () => [...buckets.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => ({
            updateBucket: Number(key.split(":")[0]), method: key.slice(key.indexOf(":") + 1), count: value.count,
            firstUpdate: value.first, lastUpdate: value.last, argumentSha256: value.hash.digest("hex") })) };
};

const milestones = (snapshots: PublicSnapshot[], firstAttackUpdate: number | null) => {
    const first = (predicate: (row: PublicSnapshot) => boolean) => snapshots.find(predicate)?.update ?? null;
    let maximumBuildings = snapshots[0]?.own.buildings ?? 0, maximumHitPoints = snapshots[0]?.own.hitPoints ?? 0,
        firstDamage: number | null = null, firstBuildingLoss: number | null = null;
    for (const row of snapshots) {
        if (firstDamage === null && row.own.hitPoints < maximumHitPoints) firstDamage = row.update;
        if (firstBuildingLoss === null && row.own.buildings < maximumBuildings) firstBuildingLoss = row.update;
        maximumBuildings = Math.max(maximumBuildings, row.own.buildings);
        maximumHitPoints = Math.max(maximumHitPoints, row.own.hitPoints);
    }
    return { firstOwnCombatant: first((row) => row.own.combatants > 0),
        firstVisibleEnemy: first((row) => row.visibleEnemy.total > 0), firstVisibleEnemyCombatant:
            first((row) => row.visibleEnemy.combatants > 0), firstOwnDamage: firstDamage,
        firstBuildingLoss, firstAttackOrder: firstAttackUpdate };
};

const createCandidate = (arm: V7Arm, factory: BaselineFactory, name: string, country: Countries): InspectableCandidate => {
    if (arm === "external_supalosa") return factory.create(name, country) as InspectableCandidate;
    return new StrongBot(name, country, [], false) as InspectableCandidate;
};

const runOne = async (arm: V7Arm, caseSpec: V7Case, caseIndex: number, factory: BaselineFactory,
    advanced: ReturnType<typeof loadAdvanced>, repeat: number) => {
    const candidateName = `V7_${arm}_${caseIndex}_${repeat}`, opponentName = `V7_Advanced_${arm}_${caseIndex}_${repeat}`,
        candidate = createCandidate(arm, factory, candidateName, caseSpec.country),
        opponent = createInspectableRa2WebBot(advanced, opponentName, caseSpec.country),
        actionAudit = installCandidateActionAudit(candidate),
        adjudicator = new LiteralBuildingEliminationAdjudicator({ candidate: candidateName, baseline: opponentName }),
        { audit } = installLiteralEndpointInstrumentation({ candidate, baseline: opponent }, adjudicator);
    return withSeededOfflineGame(cdapi, settings(candidate, opponent, caseSpec.candidateSlot), caseSpec.requestedEngineSeed,
        [{ agent: candidate, identity: "candidate" }, { agent: opponent, identity: "opponent" }], async (game) => {
            const api = candidate.lastGameApi; if (!api) throw new Error("V7 candidate GameApi unavailable");
            if (startKey(api.getPlayerData(candidateName).startLocation) !== WEST ||
                startKey(api.getPlayerData(opponentName).startLocation) !== EAST) throw new Error("V7 selected start drifted");
            const snapshots: PublicSnapshot[] = [publicSnapshot(api, candidate, candidateName, opponentName)];
            let updates = 0, terminal: any = null, failure: any = null;
            while (updates < MAX_UPDATES && !terminal && !failure) {
                adjudicator.beginUpdate(api); await game.update(); updates += 1; actionAudit.setUpdate(api.getCurrentTick());
                const stats = game.getPlayerStats(), candidateStats = stats.find((row) => row.name === candidateName),
                    opponentStats = stats.find((row) => row.name === opponentName);
                if (!candidateStats || !opponentStats) throw new Error("V7 statistics missing");
                const endpoint = adjudicator.completeUpdate(api, { finished: game.isFinished(), defeated: {
                    candidate: candidateStats.defeated, baseline: opponentStats.defeated } });
                terminal = endpoint.terminal; failure = endpoint.technicalFailure;
                if (updates <= SNAPSHOT_HORIZON && updates % SNAPSHOT_INTERVAL === 0)
                    snapshots.push(publicSnapshot(api, candidate, candidateName, opponentName));
            }
            if (failure) throw new Error(`V7 endpoint failure ${JSON.stringify(failure)}`);
            if (updates <= SNAPSHOT_HORIZON && snapshots[snapshots.length - 1]?.update !== api.getCurrentTick())
                snapshots.push(publicSnapshot(api, candidate, candidateName, opponentName));
            const actionBuckets = actionAudit.finalize(), buildings = snapshotCombatantBuildings(api,
                { candidate: candidateName, baseline: opponentName }),
                winner: Winner = terminal?.winner === "candidate" ? "candidate" :
                    terminal?.winner === "baseline" ? "opponent" : "draw";
            return { updates, status: terminal?.status ?? "tick_cap_draw", winner, snapshots,
                publicTraceSha256: sha256Text(JSON.stringify(snapshots)), actionBuckets,
                actionSha256: sha256Text(JSON.stringify(actionBuckets)),
                milestoneUpdates: milestones(snapshots, actionAudit.firstAttackUpdate()),
                terminalBuildingCounts: { candidate: buildings.filter((row) => row.owner === candidateName).length,
                    opponent: buildings.filter((row) => row.owner === opponentName).length },
                quitAttempts: { ...audit.attempts }, quitForwarded: { ...audit.forwarded } };
        });
};

const verifySelection = async () => {
    const out = requiredPath("OUT_PATH"), legacyPath = requiredPath("LEGACY_SELECTION_PATH"),
        programPath = requiredPath("PROGRAM_PATH"), programSha256 = requiredText("PROGRAM_SHA256", SHA256),
        inputs = commonInputs();
    if (fs.existsSync(out) || sha256File(programPath) !== programSha256 ||
        sha256File(legacyPath) !== V7_LEGACY_SELECTION_SHA256) throw new Error("V7 verifier drifted");
    const { commit } = sourceIdentity(), legacy = JSON.parse(fs.readFileSync(legacyPath, "utf8")),
        cases = extractV7DevelopmentCases(legacy), advanced = loadAdvanced(inputs.freezeRoot);
    const artifact = { schemaVersion: 1, kind: "hfo-advanced-v7-development-selection",
        status: "PASS_HFO_ADVANCED_V7_DEVELOPMENT_SELECTION", complete: true, passed: true, outcomeFree: true,
        scheduler: { jobId: process.env.SLURM_JOB_ID, account: "pi_jss233" }, sourceCommit: commit, programSha256,
        protocolSha256: inputs.protocolSha256, assetManifestSha256: inputs.assetManifestSha256,
        legacySelectionSha256: V7_LEGACY_SELECTION_SHA256, baselineCommit: BASELINE_COMMIT,
        ra2webClientCommit: RA2WEB_CLIENT_COMMIT, ra2webClientReleaseId: RA2WEB_CLIENT_RELEASE_ID,
        freezeManifestSha256: advanced.freezeManifestSha256, advancedBundleSha256: advanced.bundleSha256,
        ...HFO_ADVANCED_V7_SPEC, selectedCaseCount: cases.length, updateCount: 0, forbiddenOutcomeFields: [], cases };
    fs.mkdirSync(path.dirname(out), { recursive: true, mode: 0o700 });
    fs.writeFileSync(out, JSON.stringify(artifact, null, 2) + "\n", { flag: "wx", mode: 0o600 });
    console.log(JSON.stringify({ status: artifact.status, cases: cases.length }));
};

const loadV7Selection = (file: string, hash: string, inputs: ReturnType<typeof commonInputs>): V7Case[] => {
    if (sha256File(file) !== hash) throw new Error("V7 selection hash drifted");
    const value = JSON.parse(fs.readFileSync(file, "utf8"));
    if (value.kind !== "hfo-advanced-v7-development-selection" || value.complete !== true || value.passed !== true ||
        value.outcomeFree !== true || value.updateCount !== 0 || value.protocolSha256 !== inputs.protocolSha256 ||
        value.assetManifestSha256 !== inputs.assetManifestSha256 || value.legacySelectionSha256 !== V7_LEGACY_SELECTION_SHA256 ||
        value.baselineCommit !== BASELINE_COMMIT || value.ra2webClientCommit !== RA2WEB_CLIENT_COMMIT ||
        value.ra2webClientReleaseId !== RA2WEB_CLIENT_RELEASE_ID || value.freezeManifestSha256 !== RA2WEB_FREEZE_MANIFEST_SHA256 ||
        value.advancedBundleSha256 !== ADVANCED_SHA256 || !Array.isArray(value.cases)) throw new Error("V7 selection ineligible");
    return extractV7DevelopmentCases({ kind: "hfo-advanced-v6-competitive-selection", complete: true, passed: true,
        outcomeFree: true, updateCount: 0, cases: [...value.cases,
            ...Array.from({ length: 432 }, (_, index) => ({ populationId: "sealed-placeholder", index }))] });
};

const suppressQuit = (bot: InspectableCandidate) => {
    const attempts = { value: 0 }, originalStart = bot.onGameStart.bind(bot);
    bot.onGameStart = (game: GameApi) => { originalStart(game); const actions = bot.lastPlayerActions as any;
        if (!actions) throw new Error("V7 smoke actions unavailable"); actions.quitGame = () => { attempts.value += 1; }; };
    return attempts;
};

const runSmoke = async () => {
    const out = requiredPath("OUT_PATH"), programPath = requiredPath("PROGRAM_PATH"),
        programSha256 = requiredText("PROGRAM_SHA256", SHA256), selectionPath = requiredPath("SELECTION_PATH"),
        selectionSha256 = requiredText("SELECTION_SHA256", SHA256), inputs = commonInputs();
    if (fs.existsSync(out) || sha256File(programPath) !== programSha256) throw new Error("V7 smoke assignment drifted");
    const cases = loadV7Selection(selectionPath, selectionSha256, inputs), caseSpec = cases[0],
        { repo, commit } = sourceIdentity(); await cdapi.init(inputs.mixDir);
    const factory = await loadBaselineFactory(path.join(repo, "packages", "chronodivide-bot")); assertBaseline(factory);
    const advanced = loadAdvanced(inputs.freezeRoot), candidateName = "V7SmokeCandidate", opponentName = "V7SmokeAdvanced",
        candidate = createCandidate("external_supalosa", factory, candidateName, caseSpec.country),
        opponent = createInspectableRa2WebBot(advanced, opponentName, caseSpec.country) as InspectableCandidate,
        actionAudit = installCandidateActionAudit(candidate), candidateQuit = suppressQuit(candidate),
        opponentQuit = suppressQuit(opponent);
    const trace = await withSeededOfflineGame(cdapi, settings(candidate, opponent, caseSpec.candidateSlot),
        caseSpec.requestedEngineSeed, [{ agent: candidate, identity: "candidate" },
            { agent: opponent, identity: "opponent" }], async (game) => {
            const api = candidate.lastGameApi; if (!api) throw new Error("V7 smoke GameApi unavailable");
            if (startKey(api.getPlayerData(candidateName).startLocation) !== WEST ||
                startKey(api.getPlayerData(opponentName).startLocation) !== EAST) throw new Error("V7 smoke start drifted");
            const snapshots = [publicSnapshot(api, candidate, candidateName, opponentName)];
            for (let update = 1; update <= 1_200; update += 1) {
                await game.update(); actionAudit.setUpdate(api.getCurrentTick());
                if (game.isFinished()) throw new Error("V7 smoke ended before fixed horizon");
            }
            snapshots.push(publicSnapshot(api, candidate, candidateName, opponentName));
            const actionBuckets = actionAudit.finalize();
            return { updateCount: 1_200, snapshotUpdates: snapshots.map((row) => row.update),
                publicTraceSha256: sha256Text(JSON.stringify(snapshots)), actionSha256: sha256Text(JSON.stringify(actionBuckets)),
                actionBucketCount: actionBuckets.length, suppressedQuitAttempts: candidateQuit.value + opponentQuit.value };
        });
    const artifact = { schemaVersion: 1, kind: "hfo-advanced-v7-outcome-free-smoke",
        status: "PASS_HFO_ADVANCED_V7_OUTCOME_FREE_SMOKE", complete: true, passed: true, outcomeFree: true,
        scheduler: { jobId: process.env.SLURM_JOB_ID, account: "pi_jss233" }, sourceCommit: commit, programSha256,
        protocolSha256: inputs.protocolSha256, assetManifestSha256: inputs.assetManifestSha256, selectionSha256,
        legacySelectionSha256: V7_LEGACY_SELECTION_SHA256, baselineCommit: BASELINE_COMMIT,
        ra2webClientCommit: RA2WEB_CLIENT_COMMIT, ra2webClientReleaseId: RA2WEB_CLIENT_RELEASE_ID,
        freezeManifestSha256: advanced.freezeManifestSha256, advancedBundleSha256: advanced.bundleSha256,
        case: { populationCaseIndex: caseSpec.populationCaseIndex, country: caseSpec.country,
            candidateSlot: caseSpec.candidateSlot, requestedEngineSeed: caseSpec.requestedEngineSeed,
            candidateStart: caseSpec.candidateStart, opponentStart: caseSpec.opponentStart }, trace,
        forbiddenOutcomeFields: [] };
    assertOutcomeFreeSelection(artifact);
    fs.mkdirSync(path.dirname(out), { recursive: true, mode: 0o700 });
    fs.writeFileSync(out, JSON.stringify(artifact, null, 2) + "\n", { flag: "wx", mode: 0o600 });
    console.log(JSON.stringify({ status: artifact.status, trace }));
};

const runCell = async () => {
    const taskIndex = Number(requiredText("TASK_INDEX", /^\d+$/)), out = requiredPath("OUT_PATH"),
        programPath = requiredPath("PROGRAM_PATH"), programSha256 = requiredText("PROGRAM_SHA256", SHA256),
        selectionPath = requiredPath("SELECTION_PATH"), selectionSha256 = requiredText("SELECTION_SHA256", SHA256),
        inputs = commonInputs();
    if (taskIndex < 0 || taskIndex >= HFO_ADVANCED_V7_SPEC.taskCount ||
        process.env.SLURM_ARRAY_TASK_ID !== String(taskIndex) || fs.existsSync(out) ||
        sha256File(programPath) !== programSha256) throw new Error("V7 cell assignment drifted");
    const cases = loadV7Selection(selectionPath, selectionSha256, inputs), armIndex = Math.floor(taskIndex / cases.length),
        caseIndex = taskIndex % cases.length, armId = HFO_ADVANCED_V7_ARMS[armIndex], caseSpec = cases[caseIndex];
    if (!armId || !caseSpec) throw new Error("V7 cell missing");
    const { repo, commit } = sourceIdentity(); await cdapi.init(inputs.mixDir);
    const factory = await loadBaselineFactory(path.join(repo, "packages", "chronodivide-bot")); assertBaseline(factory);
    const advanced = loadAdvanced(inputs.freezeRoot), firstRun = await runOne(armId, caseSpec, caseIndex, factory, advanced, 0),
        repeatRun = caseIndex === 0 ? await runOne(armId, caseSpec, caseIndex, factory, advanced, 1) : null,
        deterministicRepeat = repeatRun ? { passed: firstRun.publicTraceSha256 === repeatRun.publicTraceSha256 &&
            firstRun.actionSha256 === repeatRun.actionSha256 && firstRun.status === repeatRun.status &&
            firstRun.winner === repeatRun.winner && firstRun.updates === repeatRun.updates,
            publicTraceSha256: repeatRun.publicTraceSha256, actionSha256: repeatRun.actionSha256,
            status: repeatRun.status, winner: repeatRun.winner, updates: repeatRun.updates } : null;
    if (deterministicRepeat && !deterministicRepeat.passed) throw new Error("V7 deterministic repeat drifted");
    const result: DiagnosticResult = { taskIndex, armIndex, armId, caseIndex,
        populationCaseIndex: caseSpec.populationCaseIndex, country: caseSpec.country,
        side: ALLIED.has(caseSpec.country) ? "Allied" : "Soviet", candidateSlot: caseSpec.candidateSlot,
        requestedEngineSeed: caseSpec.requestedEngineSeed, candidateStart: caseSpec.candidateStart,
        opponentStart: caseSpec.opponentStart, updates: firstRun.updates, status: firstRun.status, winner: firstRun.winner,
        publicSnapshots: firstRun.snapshots, publicTraceSha256: firstRun.publicTraceSha256,
        actionBuckets: firstRun.actionBuckets, actionSha256: firstRun.actionSha256,
        milestoneUpdates: firstRun.milestoneUpdates, terminalBuildingCounts: firstRun.terminalBuildingCounts,
        quitAttempts: firstRun.quitAttempts, quitForwarded: firstRun.quitForwarded, deterministicRepeat };
    const provenance = createExperimentManifest({ runId: `hfo-advanced-v7-${taskIndex}-${process.env.SLURM_JOB_ID}`,
        mixDir: inputs.mixDir, maps: [MAP.name], effectiveConfig: { taskIndex, armId, caseSpec, selectionSha256,
            snapshotInterval: SNAPSHOT_INTERVAL, snapshotHorizon: SNAPSHOT_HORIZON, maxUpdates: MAX_UPDATES },
        baseline: factory.descriptor, gameSeedBase: caseSpec.requestedEngineSeed });
    const artifact = { schemaVersion: 1, kind: "hfo-advanced-v7-public-state-cell",
        status: "COMPLETE_HFO_ADVANCED_V7_PUBLIC_STATE_CELL", complete: true, taskIndex, armIndex, armId, caseIndex,
        schedulerAccount: "pi_jss233", schedulerJobId: process.env.SLURM_JOB_ID, sourceCommit: commit, programSha256,
        protocolSha256: inputs.protocolSha256, assetManifestSha256: inputs.assetManifestSha256, selectionSha256,
        legacySelectionSha256: V7_LEGACY_SELECTION_SHA256, baselineCommit: BASELINE_COMMIT,
        ra2webClientCommit: RA2WEB_CLIENT_COMMIT, ra2webClientReleaseId: RA2WEB_CLIENT_RELEASE_ID,
        freezeManifestSha256: advanced.freezeManifestSha256, advancedBundleSha256: advanced.bundleSha256,
        result, provenance };
    fs.mkdirSync(path.dirname(out), { recursive: true, mode: 0o700 });
    fs.writeFileSync(out, JSON.stringify(artifact, null, 2) + "\n", { flag: "wx", mode: 0o600 });
    console.log(JSON.stringify({ status: artifact.status, taskIndex, armId, caseIndex, updates: result.updates }));
};

const completedTasks = (job: string) => { const raw = execFileSync("/opt/slurm/current/bin/sacct",
    ["-j", job, "-n", "-P", "-X", "--format=JobID,JobIDRaw,State,ExitCode,Account"], { encoding: "utf8" }),
    tasks = new Map<number, string>(); for (const line of raw.split("\n").filter(Boolean)) {
        const [label, rawId, state, exitCode, account] = line.split("|"), match = new RegExp(`^${job}_(\\d+)$`).exec(label);
        if (match && state === "COMPLETED" && exitCode === "0:0" && account === "pi_jss233") tasks.set(+match[1], rawId); }
    return tasks; };
const median = (values: number[]) => { if (values.length === 0) return null; const sorted = [...values].sort((a, b) => a - b),
    middle = Math.floor(sorted.length / 2); return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2; };
const summarizeArm = (rows: DiagnosticResult[]) => ({ games: rows.length,
    wins: rows.filter((row) => row.winner === "candidate").length,
    draws: rows.filter((row) => row.winner === "draw").length,
    losses: rows.filter((row) => row.winner === "opponent").length,
    medianUpdates: median(rows.map((row) => row.updates)),
    milestoneMedians: Object.fromEntries(Object.keys(rows[0]?.milestoneUpdates ?? {}).map((key) => [key,
        median(rows.map((row) => row.milestoneUpdates[key]).filter((value): value is number => value !== null))])) });

export const actionableWindow = (rows: DiagnosticResult[]) => {
    const losing = rows.filter((row) => row.winner === "opponent"), ticks = [3_600, 4_800, 6_000, 7_200, 8_400, 9_600,
        12_000, 15_000, 18_000];
    const candidates = ticks.map((tick) => { const snapshots = losing.map((row) => {
        const eligible = row.publicSnapshots.filter((snapshot) => snapshot.update <= tick);
        return eligible[eligible.length - 1];
    }).filter((row): row is PublicSnapshot => !!row),
        viable = snapshots.filter((row) => row.own.buildings >= 3 &&
            ((row.own.byRole.war_factory ?? 0) + (row.own.byRole.barracks ?? 0) >= 1) &&
            (row.own.combatants >= 3 || row.candidateCredits >= 500)).length;
        return { tick, losingCasesObserved: snapshots.length, viableCases: viable,
            viableFraction: snapshots.length ? viable / snapshots.length : 0 }; });
    const selected = candidates.find((row) => row.losingCasesObserved >= 18 && row.viableFraction >= 0.75) ?? null;
    return { losingCases: losing.length, candidates, selected, passed: selected !== null };
};

type NumericFeatures = Record<string, number>;
type LabeledFeatureRow = { group: string; label: 0 | 1; features: NumericFeatures };
type Stump = { feature: string; threshold: number; lessOrEqualLabel: 0 | 1; trainingBalancedAccuracy: number };
const CLASSIFICATION_FEATURES = ["candidateCredits", "creditGap", "ownCombatants", "visibleEnemyCombatants",
    "ownBuildings", "ownWarFactories", "ownBarracks", "ownHarvesters", "threat16", "homeCombatants",
    "opponentBaseCombatants"] as const;

const numericFeatures = (snapshot: PublicSnapshot): NumericFeatures => ({
    candidateCredits: snapshot.candidateCredits,
    creditGap: snapshot.candidateCredits - snapshot.opponentCreditsPublic,
    ownCombatants: snapshot.own.combatants,
    visibleEnemyCombatants: snapshot.visibleEnemy.combatants,
    ownBuildings: snapshot.own.buildings,
    ownWarFactories: snapshot.own.byRole.war_factory ?? 0,
    ownBarracks: snapshot.own.byRole.barracks ?? 0,
    ownHarvesters: snapshot.own.byRole.harvester ?? 0,
    threat16: snapshot.visibleThreatsNearProduction["16"] ?? 0,
    homeCombatants: snapshot.ownCombatantRegions.home,
    opponentBaseCombatants: snapshot.ownCombatantRegions.opponentBase,
});

const balancedAccuracy = (labels: number[], predictions: number[]) => {
    const positives = labels.filter((label) => label === 1).length, negatives = labels.length - positives;
    if (positives === 0 || negatives === 0) return null;
    const truePositive = labels.filter((label, index) => label === 1 && predictions[index] === 1).length,
        trueNegative = labels.filter((label, index) => label === 0 && predictions[index] === 0).length;
    return 0.5 * (truePositive / positives + trueNegative / negatives);
};

const predictStump = (stump: Stump, features: NumericFeatures) =>
    features[stump.feature] <= stump.threshold ? stump.lessOrEqualLabel : (1 - stump.lessOrEqualLabel) as 0 | 1;

const fitStump = (rows: LabeledFeatureRow[]): Stump | null => {
    if (!rows.some((row) => row.label === 1) || !rows.some((row) => row.label === 0)) return null;
    let best: Stump | null = null;
    for (const feature of CLASSIFICATION_FEATURES) {
        const values = [...new Set(rows.map((row) => row.features[feature]))].sort((a, b) => a - b),
            thresholds = values.length === 1 ? values : values.slice(0, -1).map((value, index) =>
                (value + values[index + 1]) / 2);
        for (const threshold of thresholds) for (const lessOrEqualLabel of [0, 1] as const) {
            const predictions = rows.map((row) => row.features[feature] <= threshold ? lessOrEqualLabel :
                (1 - lessOrEqualLabel) as 0 | 1), score = balancedAccuracy(rows.map((row) => row.label), predictions);
            if (score === null) continue;
            const candidate = { feature, threshold, lessOrEqualLabel, trainingBalancedAccuracy: score };
            if (!best || score > best.trainingBalancedAccuracy || (score === best.trainingBalancedAccuracy &&
                JSON.stringify(candidate).localeCompare(JSON.stringify(best)) < 0)) best = candidate;
        }
    }
    return best;
};

const groupedStump = (rows: LabeledFeatureRow[]) => {
    const groups = [...new Set(rows.map((row) => row.group))].sort(), predictions: number[] = [], labels: number[] = [],
        foldRecords: Array<{ stump: Stump | null; held: LabeledFeatureRow[] }> = [], selectedFeatures: string[] = [];
    for (const group of groups) {
        const training = rows.filter((row) => row.group !== group), held = rows.filter((row) => row.group === group),
            stump = fitStump(training), fallback = training.filter((row) => row.label === 1).length * 2 >= training.length ? 1 : 0;
        foldRecords.push({ stump, held }); if (stump) selectedFeatures.push(stump.feature);
        labels.push(...held.map((row) => row.label));
        predictions.push(...held.map((row) => stump ? predictStump(stump, row.features) : fallback));
    }
    const observed = balancedAccuracy(labels, predictions), permutationImportance: Record<string, number | null> = {};
    for (const feature of CLASSIFICATION_FEATURES) {
        const permutedLabels: number[] = [], permutedPredictions: number[] = [];
        for (const { stump, held } of foldRecords) {
            const fallback = rows.filter((row) => !held.includes(row) && row.label === 1).length * 2 >= rows.length - held.length ? 1 : 0;
            for (const [index, row] of held.entries()) {
                const features = { ...row.features, [feature]: held[(index + 1) % held.length].features[feature] };
                permutedLabels.push(row.label); permutedPredictions.push(stump ? predictStump(stump, features) : fallback);
            }
        }
        const permuted = balancedAccuracy(permutedLabels, permutedPredictions);
        permutationImportance[feature] = observed === null || permuted === null ? null : observed - permuted;
    }
    return { groups: groups.length, rows: rows.length, positives: labels.filter((label) => label === 1).length,
        negatives: labels.filter((label) => label === 0).length, balancedAccuracy: observed,
        selectedFeatureCounts: Object.fromEntries(CLASSIFICATION_FEATURES.map((feature) =>
            [feature, selectedFeatures.filter((selected) => selected === feature).length])), permutationImportance };
};

export const classificationAnalysis = (rows: DiagnosticResult[]) => {
    const ticks = [1_200, 2_400, 3_600, 4_800, 6_000, 7_200, 8_400, 9_600, 12_000, 15_000, 18_000],
        eligible = rows.filter((row) => row.winner !== "draw"), byTick = ticks.map((tick) => {
            const available = eligible.map((row) => {
                const snapshot = row.publicSnapshots.find((item) => item.update === tick);
                return snapshot ? { row, snapshot } : null;
            }).filter((item): item is { row: DiagnosticResult; snapshot: PublicSnapshot } => !!item),
                countryRows = available.map(({ row, snapshot }) => ({ group: String(row.country),
                    label: row.winner === "candidate" ? 1 as const : 0 as const, features: numericFeatures(snapshot) })),
                slotRows = available.map(({ row, snapshot }) => ({ group: String(row.candidateSlot),
                    label: row.winner === "candidate" ? 1 as const : 0 as const, features: numericFeatures(snapshot) }));
            return { tick, leaveCountryOut: groupedStump(countryRows), leaveSlotOut: groupedStump(slotRows) };
        }), earliestPredictiveTick = byTick.find((row) =>
            (row.leaveCountryOut.balancedAccuracy ?? 0) >= 0.65 &&
            (row.leaveSlotOut.balancedAccuracy ?? 0) >= 0.65 &&
            row.leaveCountryOut.positives >= 3 && row.leaveCountryOut.negatives >= 3)?.tick ?? null;
    return { treeDepth: 1, outcomeJoinedOnlyAfterCompleteAggregate: true, byTick, earliestPredictiveTick };
};

const finalize = () => {
    const root = requiredPath("RESULTS_ROOT"), out = requiredPath("OUT_PATH"),
        arrayJobId = requiredText("ARRAY_JOB_ID", /^\d+$/), programSha256 = requiredText("PROGRAM_SHA256", SHA256),
        cellProgramSha256 = requiredText("CELL_PROGRAM_SHA256", SHA256), selectionSha256 = requiredText("SELECTION_SHA256", SHA256),
        inputs = commonInputs();
    if (fs.existsSync(out)) throw new Error("V7 finalizer output exists"); const commit = sourceIdentity().commit;
    let tasks = new Map<number, string>(); for (let attempt = 0; attempt < 31; attempt += 1) {
        tasks = completedTasks(arrayJobId); if (tasks.size === HFO_ADVANCED_V7_SPEC.taskCount) break;
        if (attempt < 30) execFileSync("sleep", ["2"]); }
    if (tasks.size !== HFO_ADVANCED_V7_SPEC.taskCount) throw new Error(`V7 scheduler incomplete ${tasks.size}/72`);
    const rows: DiagnosticResult[] = [];
    for (let taskIndex = 0; taskIndex < HFO_ADVANCED_V7_SPEC.taskCount; taskIndex += 1) {
        const taskRoot = path.join(root, `task-${String(taskIndex).padStart(3, "0")}`), file = path.join(taskRoot, "cell.json"),
            checksum = fs.readFileSync(path.join(taskRoot, "cell.sha256"), "utf8").trim().split(/\s+/)[0];
        if (sha256File(file) !== checksum) throw new Error(`V7 checksum ${taskIndex}`);
        const cell = JSON.parse(fs.readFileSync(file, "utf8")), armIndex = Math.floor(taskIndex / 36), caseIndex = taskIndex % 36;
        if (cell.kind !== "hfo-advanced-v7-public-state-cell" || cell.complete !== true || cell.taskIndex !== taskIndex ||
            cell.armIndex !== armIndex || cell.armId !== HFO_ADVANCED_V7_ARMS[armIndex] || cell.caseIndex !== caseIndex ||
            String(cell.schedulerJobId) !== tasks.get(taskIndex) || cell.sourceCommit !== commit ||
            cell.programSha256 !== cellProgramSha256 || cell.protocolSha256 !== inputs.protocolSha256 ||
            cell.assetManifestSha256 !== inputs.assetManifestSha256 || cell.selectionSha256 !== selectionSha256 ||
            cell.legacySelectionSha256 !== V7_LEGACY_SELECTION_SHA256 || cell.baselineCommit !== BASELINE_COMMIT ||
            cell.ra2webClientCommit !== RA2WEB_CLIENT_COMMIT || cell.freezeManifestSha256 !== RA2WEB_FREEZE_MANIFEST_SHA256 ||
            cell.advancedBundleSha256 !== ADVANCED_SHA256 || cell.result.quitForwarded?.candidate !== 0 ||
            cell.result.quitForwarded?.baseline !== 0) throw new Error(`V7 cell identity ${taskIndex}`);
        rows.push(cell.result as DiagnosticResult);
    }
    for (const arm of HFO_ADVANCED_V7_ARMS) for (const country of HFO_ADVANCED_V7_COUNTRIES)
        for (const slot of [0, 1] as const) if (rows.filter((row) => row.armId === arm && row.country === country &&
            row.candidateSlot === slot).length !== 2) throw new Error(`V7 final coverage ${arm}:${country}:${slot}`);
    const deterministic = rows.filter((row) => row.caseIndex === 0).map((row) => ({ armId: row.armId,
        repeat: row.deterministicRepeat })), window = actionableWindow(rows), classification = classificationAnalysis(rows),
        passed = deterministic.length === 2 && deterministic.every((row) => row.repeat?.passed === true) && window.passed,
        summaries = Object.fromEntries(HFO_ADVANCED_V7_ARMS.map((arm) => [arm,
            summarizeArm(rows.filter((row) => row.armId === arm))]));
    const compactRows = rows.map((row) => ({ taskIndex: row.taskIndex, armId: row.armId, caseIndex: row.caseIndex,
        populationCaseIndex: row.populationCaseIndex, country: row.country, side: row.side,
        candidateSlot: row.candidateSlot, requestedEngineSeed: row.requestedEngineSeed, updates: row.updates,
        status: row.status, winner: row.winner, publicTraceSha256: row.publicTraceSha256,
        actionSha256: row.actionSha256, milestoneUpdates: row.milestoneUpdates,
        terminalBuildingCounts: row.terminalBuildingCounts, deterministicRepeat: row.deterministicRepeat }));
    const artifact = { schemaVersion: 1, kind: "hfo-advanced-v7-public-state-diagnostic",
        status: passed ? "PASS_HFO_ADVANCED_V7_PUBLIC_STATE_DIAGNOSTIC" : "FAIL_HFO_ADVANCED_V7_PUBLIC_STATE_DIAGNOSTIC",
        complete: true, passed, scheduler: { account: "pi_jss233", arrayJobId,
            taskJobIds: Object.fromEntries([...tasks.entries()]) }, sourceCommit: commit, programSha256,
        cellProgramSha256, protocolSha256: inputs.protocolSha256, assetManifestSha256: inputs.assetManifestSha256,
        selectionSha256, legacySelectionSha256: V7_LEGACY_SELECTION_SHA256, baselineCommit: BASELINE_COMMIT,
        ra2webClientCommit: RA2WEB_CLIENT_COMMIT, ra2webClientReleaseId: RA2WEB_CLIENT_RELEASE_ID,
        freezeManifestSha256: RA2WEB_FREEZE_MANIFEST_SHA256, advancedBundleSha256: ADVANCED_SHA256,
        ...HFO_ADVANCED_V7_SPEC, summaries, deterministic, actionableWindow: window, classification, rows: compactRows };
    fs.mkdirSync(path.dirname(out), { recursive: true, mode: 0o700 });
    fs.writeFileSync(out, JSON.stringify(artifact, null, 2) + "\n", { flag: "wx", mode: 0o600 });
    console.log(JSON.stringify({ status: artifact.status, passed, summaries, selectedWindow: window.selected }));
};

const main = async () => {
    const mode = process.env.MODE;
    if (mode === "verify") return verifySelection();
    if (mode === "smoke") return runSmoke();
    if (mode === "cell") return runCell();
    if (mode === "finalize") return finalize();
    throw new Error("MODE must be verify, smoke, cell, or finalize");
};

if (process.env.MODE && process.env.MODE !== "test")
    void main().catch((error) => { console.error(error); process.exitCode = 1; });
