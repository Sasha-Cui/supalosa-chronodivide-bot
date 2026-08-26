import { Bot, CreateOfflineOpts, GameApi, ObjectType, OrderType, UnitData, cdapi } from "@chronodivide/game-api";
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
import { HFO_ADVANCED_V6_ARMS, V6Arm, createV6TechnicalController } from
    "./hfoAdvancedEarlyProductionTechnical.js";
import { createV6VehicleRepairController } from "./hfoAdvancedEarlyProductionRepair.js";
import { selectAdvancedWestTarget } from "./hfoAdvancedDecoratedOptimizerStages.js";
import { LiteralBuildingEliminationAdjudicator, installLiteralEndpointInstrumentation,
    snapshotCombatantBuildings } from "./literalBuildingEliminationEndpoint.js";
import { RA2WEB_CLIENT_COMMIT, RA2WEB_CLIENT_RELEASE_ID, RA2WEB_FREEZE_MANIFEST_SHA256,
    createInspectableRa2WebBot, loadRa2WebOpponent } from "./ra2WebOpponentBundle.js";

const MAP = { name: "cd_chrono_4_heck_freezes_over_le.map",
    sha256: "e4dfc736a6355e0e68d4681e4d67419516e6bb94549e2d42880c9414e95e2e8d" } as const;
const BASELINE_COMMIT = "165b77a71d0cf5ebd27c65b19d0486bcbae78d0f";
const ADVANCED_SHA256 = "81d8797b6dd1371ba2dcbd79e25df8b42254290c820159e121a82650fd97a143";
const SHA256 = /^[0-9a-f]{64}$/;
const STARTS = ["39,82", "151,119", "88,34", "88,157"] as const;
type Start = typeof STARTS[number];
const WEST = STARTS[0], EAST = STARTS[1];
const OPPOSITE: Record<Start, Start> = { "39,82": "151,119", "151,119": "39,82",
    "88,34": "88,157", "88,157": "88,34" };
export const HFO_ADVANCED_V6_COMPETITIVE_COUNTRIES = [Countries.USA, Countries.KOREA, Countries.FRANCE,
    Countries.GERMANY, Countries.GREAT_BRITAIN, Countries.LIBYA, Countries.IRAQ, Countries.CUBA,
    Countries.RUSSIA] as const;
const ALLIED = new Set<Countries>(HFO_ADVANCED_V6_COMPETITIVE_COUNTRIES.slice(0, 5));
export const HFO_ADVANCED_V6_COMPETITIVE_ARMS = ["noop", "infantry_rush", "tank_rush", "dual_rush",
    "tank_production_only", "vehicle_assault"] as const;
export type V6CompetitiveArmId = typeof HFO_ADVANCED_V6_COMPETITIVE_ARMS[number];
type Winner = "first" | "opponent" | "draw";
type Population = { id: "development" | "validation" | "replication"; seedBase: number;
    starts: readonly Start[]; casesPerCell: number };
export const HFO_ADVANCED_V6_COMPETITIVE_POPULATIONS: readonly Population[] = [
    { id: "development", seedBase: 4_278_000_000, starts: [WEST], casesPerCell: 2 },
    { id: "validation", seedBase: 4_279_000_000, starts: STARTS, casesPerCell: 1 },
    { id: "replication", seedBase: 4_280_000_000, starts: STARTS, casesPerCell: 5 },
];
export const HFO_ADVANCED_V6_COMPETITIVE_SPEC = { maxOffsets: 100, maxUpdates: 90_000,
    selectionCaseCount: 468, stage0CaseCount: 36, stage0ArmCount: 6, stage0TaskCount: 216,
    stage1CaseCount: 72, stage2CaseCount: 360, clusterCount: 36, clusterTCritical: 1.68957 } as const;
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
const startKey = (point: { x: number; y: number }): string => `${point.x},${point.y}`;
const sourceIdentity = () => {
    const repo = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim(),
        commit = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
    if (execFileSync("git", ["branch", "--show-current"], { encoding: "utf8" }).trim() !== "main" ||
        execFileSync("git", ["status", "--short", "--untracked-files=no"], { encoding: "utf8" }).trim() ||
        execFileSync("git", ["rev-parse", "fork/main"], { encoding: "utf8" }).trim() !== commit)
        throw new Error("V6 competitive study requires clean synchronized main");
    return { repo, commit };
};
const commonInputs = () => {
    if (process.env.SLURM_JOB_ACCOUNT !== "pi_jss233") throw new Error("V6 competitive study requires pi_jss233");
    const mixDir = requiredPath("MIX_DIR"), protocolPath = requiredPath("PROTOCOL_PATH"),
        assetManifestPath = requiredPath("ASSET_MANIFEST_PATH"), freezeRoot = requiredPath("RA2WEB_FREEZE_ROOT"),
        protocolSha256 = requiredText("PROTOCOL_SHA256", SHA256),
        assetManifestSha256 = requiredText("ASSET_MANIFEST_SHA256", SHA256);
    if (sha256File(protocolPath) !== protocolSha256 || sha256File(assetManifestPath) !== assetManifestSha256 ||
        sha256File(path.join(mixDir, MAP.name)) !== MAP.sha256) throw new Error("V6 competitive input drifted");
    const manifest = JSON.parse(fs.readFileSync(assetManifestPath, "utf8")) as unknown;
    if (!isRecord(manifest) || manifest.kind !== "private-ra2-snow-runtime" ||
        path.resolve(String(manifest.runtimeDirectory)) !== mixDir) throw new Error("V6 competitive runtime drifted");
    return { mixDir, protocolSha256, assetManifestSha256, freezeRoot };
};
const assertBaseline = (factory: BaselineFactory) => {
    if (factory.descriptor.kind !== "external-package" || typeof factory.descriptor.packageRoot !== "string")
        throw new Error("V6 competitive baseline is not external");
    const packageRoot = path.resolve(factory.descriptor.packageRoot),
        repo = execFileSync("git", ["-C", packageRoot, "rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
    if (execFileSync("git", ["-C", repo, "rev-parse", "HEAD"], { encoding: "utf8" }).trim() !== BASELINE_COMMIT ||
        execFileSync("git", ["-C", repo, "status", "--short", "--untracked-files=no"], { encoding: "utf8" }).trim() ||
        packageRoot !== path.join(repo, "packages", "chronodivide-bot")) throw new Error("V6 baseline drifted");
};
const loadAdvanced = (root: string) => { const loaded = loadRa2WebOpponent(root, "ra2web_advanced_old_priest");
    if (loaded.freezeManifestSha256 !== RA2WEB_FREEZE_MANIFEST_SHA256 || loaded.bundleSha256 !== ADVANCED_SHA256)
        throw new Error("V6 Advanced identity drifted"); return loaded; };
const settings = (first: Bot, opponent: Bot, slot: 0 | 1): CreateOfflineOpts => {
    const gameMode = cdapi.getAvailableGameModes(MAP.name)[0]; if (!gameMode) throw new Error("V6 mode unavailable");
    return { buildOffAlly: false, cratesAppear: false, credits: 10_000, gameMode, gameSpeed: 6,
        mapName: MAP.name, mcvRepacks: true, shortGame: false, superWeapons: false, unitCount: 0, online: false,
        agents: slot === 0 ? [first, opponent] : [opponent, first] };
};
const inspectableApi = (bot: { lastGameApi: GameApi | null }) => { if (!bot.lastGameApi)
    throw new Error("V6 competitive API missing"); return bot.lastGameApi; };

const selectCases = async () => {
    const out = requiredPath("OUT_PATH"), programPath = requiredPath("PROGRAM_PATH"),
        programSha256 = requiredText("PROGRAM_SHA256", SHA256), inputs = commonInputs();
    if (fs.existsSync(out) || sha256File(programPath) !== programSha256) throw new Error("V6 selector drifted");
    const { repo, commit } = sourceIdentity(); await cdapi.init(inputs.mixDir);
    const factory = await loadBaselineFactory(path.join(repo, "packages", "chronodivide-bot")); assertBaseline(factory);
    const advanced = loadAdvanced(inputs.freezeRoot), cases: CaseSpec[] = []; let initializedGameCount = 0;
    for (const population of HFO_ADVANCED_V6_COMPETITIVE_POPULATIONS) {
        let populationCaseIndex = 0;
        for (const [countryOrdinal, country] of HFO_ADVANCED_V6_COMPETITIVE_COUNTRIES.entries())
            for (const desiredStart of population.starts) {
                const startOrdinal = STARTS.indexOf(desiredStart);
                for (const slot of [0, 1] as const) { let selected = 0;
                    for (let offset = 0; offset < 100 && selected < population.casesPerCell; offset += 1) {
                        const seed = population.seedBase + 10_000 * countryOrdinal + 1_000 * startOrdinal + 100 * slot + offset,
                            firstName = `V6SelectFirst_${population.id}_${countryOrdinal}_${startOrdinal}_${slot}_${offset}`,
                            opponentName = `V6SelectAdvanced_${population.id}_${countryOrdinal}_${startOrdinal}_${slot}_${offset}`,
                            first = factory.create(firstName, country), opponent = createInspectableRa2WebBot(advanced, opponentName, country);
                        const starts = await withSeededOfflineGame(cdapi, settings(first, opponent, slot), seed,
                            [{ agent: first, identity: "first" }, { agent: opponent, identity: "opponent" }], async () => ({
                                candidateStart: startKey(inspectableApi(first).getPlayerData(firstName).startLocation),
                                opponentStart: startKey(inspectableApi(first).getPlayerData(opponentName).startLocation) }));
                        initializedGameCount += 1;
                        if (starts.candidateStart === desiredStart && starts.opponentStart === OPPOSITE[desiredStart]) {
                            cases.push({ globalCaseIndex: cases.length, populationId: population.id,
                                populationCaseIndex: populationCaseIndex++, countryOrdinal, country, startOrdinal,
                                desiredStart, desiredOppositeStart: OPPOSITE[desiredStart], candidateSlot: slot,
                                repeatIndex: selected, seedOffset: offset, requestedEngineSeed: seed, ...starts }); selected += 1; }
                    }
                    if (selected !== population.casesPerCell) throw new Error(`V6 selection incomplete ${population.id}`);
                }
            }
    }
    const counts = Object.fromEntries(HFO_ADVANCED_V6_COMPETITIVE_POPULATIONS.map((population) =>
        [population.id, cases.filter((row) => row.populationId === population.id).length]));
    if (cases.length !== 468 || new Set(cases.map((row) => `${row.requestedEngineSeed}:${row.candidateSlot}`)).size !== 468 ||
        counts.development !== 36 || counts.validation !== 72 || counts.replication !== 360)
        throw new Error("V6 master selection coverage drifted");
    const artifact = { schemaVersion: 1, kind: "hfo-advanced-v6-competitive-selection",
        status: "PASS_HFO_ADVANCED_V6_COMPETITIVE_SELECTION", complete: true, passed: true, outcomeFree: true,
        scheduler: { jobId: process.env.SLURM_JOB_ID, account: "pi_jss233" }, sourceCommit: commit, programSha256,
        protocolSha256: inputs.protocolSha256, assetManifestSha256: inputs.assetManifestSha256,
        baselineCommit: BASELINE_COMMIT, ra2webClientCommit: RA2WEB_CLIENT_COMMIT,
        ra2webClientReleaseId: RA2WEB_CLIENT_RELEASE_ID, freezeManifestSha256: advanced.freezeManifestSha256,
        advancedBundleSha256: advanced.bundleSha256, ...HFO_ADVANCED_V6_COMPETITIVE_SPEC,
        initializedGameCount, populationCounts: counts, selectedCaseCount: cases.length, updateCount: 0,
        forbiddenOutcomeFields: [], cases };
    fs.mkdirSync(path.dirname(out), { recursive: true, mode: 0o700 });
    fs.writeFileSync(out, JSON.stringify(artifact, null, 2) + "\n", { flag: "wx", mode: 0o600 });
    console.log(JSON.stringify({ status: artifact.status, initializedGameCount, cases: cases.length, counts }));
};
const loadSelection = (file: string, hash: string, inputs: ReturnType<typeof commonInputs>): CaseSpec[] => {
    if (sha256File(file) !== hash) throw new Error("V6 competitive selection hash drifted");
    const value = JSON.parse(fs.readFileSync(file, "utf8")) as any;
    if (value.kind !== "hfo-advanced-v6-competitive-selection" || value.complete !== true || value.passed !== true ||
        value.outcomeFree !== true || value.updateCount !== 0 || value.protocolSha256 !== inputs.protocolSha256 ||
        value.assetManifestSha256 !== inputs.assetManifestSha256 || value.baselineCommit !== BASELINE_COMMIT ||
        value.ra2webClientCommit !== RA2WEB_CLIENT_COMMIT || value.ra2webClientReleaseId !== RA2WEB_CLIENT_RELEASE_ID ||
        value.freezeManifestSha256 !== RA2WEB_FREEZE_MANIFEST_SHA256 || value.advancedBundleSha256 !== ADVANCED_SHA256 ||
        !Array.isArray(value.forbiddenOutcomeFields) || value.forbiddenOutcomeFields.length !== 0 ||
        !Array.isArray(value.cases) || value.cases.length !== 468) throw new Error("V6 selection ineligible");
    return value.cases;
};

const combineOverlays = (...overlays: ExternalBaselineLifecycleOverlay[]): ExternalBaselineLifecycleOverlay => ({
    afterGameStart(game, bot) { for (const overlay of overlays) overlay.afterGameStart?.(game, bot); },
    afterGameTick(game, bot) { for (const overlay of overlays) overlay.afterGameTick?.(game, bot); },
    afterGameEvent(event, bot) { for (const overlay of overlays) overlay.afterGameEvent?.(event, bot); },
});
const attackOnlyOverlay = (firstName: string, opponentName: string): ExternalBaselineLifecycleOverlay => ({
    afterGameTick(game, bot) {
        const update = game.getCurrentTick(); if (update < 7_200 || update % 24 !== 0) return;
        const own = game.getVisibleUnits(firstName, "self").map((id) => game.getUnitData(id))
            .filter((unit): unit is UnitData => !!unit && !!unit.rules.isSelectableCombatant && !unit.rules.harvester &&
                unit.rules.type !== ObjectType.Building && unit.rules.name !== "DOG" && unit.rules.name !== "ADOG")
            .sort((a, b) => a.id - b.id);
        if (own.length < 4 || !bot.lastPlayerActions) return;
        const enemies = game.getVisibleUnits(firstName, "enemy").map((id) => game.getUnitData(id))
            .filter((unit): unit is UnitData => !!unit && !!unit.rules.isSelectableCombatant && !unit.rules.harvester &&
                unit.rules.type !== ObjectType.Building).sort((a, b) => a.id - b.id),
            buildings = game.getVisibleUnits(firstName, "enemy").map((id) => game.getUnitData(id))
                .filter((unit): unit is UnitData => !!unit && unit.rules.type === ObjectType.Building).sort((a, b) => a.id - b.id),
            target = selectAdvancedWestTarget("production_first", own, enemies, buildings);
        if (target) bot.lastPlayerActions.orderUnits(own.map((unit) => unit.id), OrderType.Attack, target.id);
        else { const start = game.getPlayerData(opponentName).startLocation;
            bot.lastPlayerActions.orderUnits(own.map((unit) => unit.id), OrderType.AttackMove, start.x, start.y); }
    },
});
const technicalArm = (id: Exclude<V6CompetitiveArmId, "noop" | "vehicle_assault">): V6Arm => {
    const arm = HFO_ADVANCED_V6_ARMS.find((row) => row.id === id); if (!arm) throw new Error(`Missing V6 arm ${id}`);
    return arm;
};
const westOnlyOverlay = (overlay: ExternalBaselineLifecycleOverlay, firstName: string,
    opponentName: string): ExternalBaselineLifecycleOverlay => {
    let active = false;
    return {
        afterGameStart(game, bot) {
            active = startKey(game.getPlayerData(firstName).startLocation) === WEST &&
                startKey(game.getPlayerData(opponentName).startLocation) === EAST;
            if (active) overlay.afterGameStart?.(game, bot);
        },
        afterGameTick(game, bot) { if (active) overlay.afterGameTick?.(game, bot); },
        afterGameEvent(event, bot) { if (active) overlay.afterGameEvent?.(event, bot); },
    };
};
export const createV6CompetitiveOverlay = (id: V6CompetitiveArmId, country: Countries,
    firstName: string, opponentName: string): ExternalBaselineLifecycleOverlay => {
    if (id === "noop") return {};
    if (id === "vehicle_assault") {
        const repair = createV6VehicleRepairController(true, country, firstName, opponentName);
        return westOnlyOverlay(combineOverlays(repair.overlay, attackOnlyOverlay(firstName, opponentName)),
            firstName, opponentName);
    }
    return westOnlyOverlay(createV6TechnicalController(technicalArm(id), country, firstName, opponentName).overlay,
        firstName, opponentName);
};

const trajectorySnapshot = (game: GameApi, firstName: string, opponentName: string) => {
    const units = game.getAllUnits().map((id) => game.getUnitData(id)).filter((unit): unit is UnitData => !!unit)
        .filter((unit) => unit.owner === firstName || unit.owner === opponentName).map((unit) => ({
            owner: unit.owner === firstName ? "first" : "opponent", rule: unit.rules.name, type: unit.rules.type,
            hitPoints: unit.hitPoints, x: unit.tile.rx, y: unit.tile.ry }))
        .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
    return { update: game.getCurrentTick(), credits: { first: game.getPlayerData(firstName).credits,
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
const stagePopulation = (stage: number): Population["id"] => stage === 0 ? "development" : stage === 1 ? "validation" : "replication";
const loadPrevious = (stage: number): any | null => {
    if (stage === 0) { if (process.env.PREVIOUS_PATH || process.env.PREVIOUS_SHA256) throw new Error("V6 Stage 0 has prior artifact");
        return null; }
    const file = requiredPath("PREVIOUS_PATH"), hash = requiredText("PREVIOUS_SHA256", SHA256);
    if (sha256File(file) !== hash) throw new Error("V6 prior-stage hash drifted");
    const value = JSON.parse(fs.readFileSync(file, "utf8"));
    if (value.kind !== "hfo-advanced-v6-competitive-stage" || value.complete !== true || value.passed !== true ||
        value.stageIndex !== stage - 1 || value.protocolSha256 !== commonInputs().protocolSha256)
        throw new Error("V6 prior stage is ineligible");
    return value;
};
export const v6StageArms = (stage: number, previous: any | null): V6CompetitiveArmId[] => {
    if (stage === 0) return [...HFO_ADVANCED_V6_COMPETITIVE_ARMS];
    if (stage === 1) { const survivors = previous?.survivors as Array<{ id: V6CompetitiveArmId }>;
        if (!Array.isArray(survivors) || survivors.length < 1 || survivors.length > 2) throw new Error("V6 survivors drifted");
        return ["noop", ...survivors.map((row) => row.id)]; }
    const champion = previous?.champion as { id: V6CompetitiveArmId } | null;
    if (!champion || champion.id === "noop") throw new Error("V6 champion drifted");
    return ["noop", champion.id];
};

const runCell = async () => {
    const stage = Number(requiredText("STAGE_INDEX", /^[0-2]$/)), taskIndex = Number(requiredText("TASK_INDEX", /^\d+$/)),
        out = requiredPath("OUT_PATH"), programPath = requiredPath("PROGRAM_PATH"),
        programSha256 = requiredText("PROGRAM_SHA256", SHA256), selectionPath = requiredPath("SELECTION_PATH"),
        selectionSha256 = requiredText("SELECTION_SHA256", SHA256), inputs = commonInputs(), previous = loadPrevious(stage),
        arms = v6StageArms(stage, previous), populationId = stagePopulation(stage), allCases = loadSelection(selectionPath, selectionSha256, inputs),
        cases = allCases.filter((row) => row.populationId === populationId).sort((a, b) => a.populationCaseIndex - b.populationCaseIndex),
        taskCount = arms.length * cases.length;
    if (taskIndex < 0 || taskIndex >= taskCount || process.env.SLURM_ARRAY_TASK_ID !== String(taskIndex) ||
        fs.existsSync(out) || sha256File(programPath) !== programSha256) throw new Error("V6 cell assignment drifted");
    const armIndex = Math.floor(taskIndex / cases.length), caseIndex = taskIndex % cases.length,
        armId = arms[armIndex], caseSpec = cases[caseIndex]; if (!armId || !caseSpec) throw new Error("V6 cell missing");
    const { repo, commit } = sourceIdentity(); await cdapi.init(inputs.mixDir);
    const factory = await loadBaselineFactory(path.join(repo, "packages", "chronodivide-bot")); assertBaseline(factory);
    const advanced = loadAdvanced(inputs.freezeRoot), firstName = `V6CompFirst_${stage}_${caseIndex}`,
        opponentName = `V6CompAdvanced_${stage}_${caseIndex}`, rawFirst = factory.create(firstName, caseSpec.country),
        first = decorateExternalBaselineLifecycle(rawFirst, createV6CompetitiveOverlay(armId, caseSpec.country, firstName, opponentName)),
        opponent = createInspectableRa2WebBot(advanced, opponentName, caseSpec.country),
        adjudicator = new LiteralBuildingEliminationAdjudicator({ candidate: firstName, baseline: opponentName }),
        { audit } = installLiteralEndpointInstrumentation({ candidate: first, baseline: opponent }, adjudicator);
    const result = await withSeededOfflineGame(cdapi, settings(first, opponent, caseSpec.candidateSlot),
        caseSpec.requestedEngineSeed, [{ agent: first, identity: "first" }, { agent: opponent, identity: "opponent" }],
        async (game) => { const gameApi = inspectableApi(first);
            if (startKey(gameApi.getPlayerData(firstName).startLocation) !== caseSpec.desiredStart ||
                startKey(gameApi.getPlayerData(opponentName).startLocation) !== caseSpec.desiredOppositeStart)
                throw new Error("V6 selected start drifted");
            const trajectory = crypto.createHash("sha256"); let lastSnapshot = -1;
            const snap = () => { trajectory.update(JSON.stringify(trajectorySnapshot(gameApi, firstName, opponentName)) + "\n");
                lastSnapshot = gameApi.getCurrentTick(); };
            snap(); let updates = 0, terminal: any = null, failure: any = null;
            while (updates < 90_000 && !terminal && !failure) { adjudicator.beginUpdate(gameApi); await game.update(); updates += 1;
                const stats = game.getPlayerStats(), firstStats = stats.find((row) => row.name === firstName),
                    opponentStats = stats.find((row) => row.name === opponentName);
                if (!firstStats || !opponentStats) throw new Error("V6 statistics missing");
                const endpoint = adjudicator.completeUpdate(gameApi, { finished: game.isFinished(), defeated: {
                    candidate: firstStats.defeated, baseline: opponentStats.defeated } });
                terminal = endpoint.terminal; failure = endpoint.technicalFailure; if (updates % 60 === 0) snap(); }
            if (failure) throw new Error(`V6 endpoint failure ${JSON.stringify(failure)}`);
            if (lastSnapshot !== gameApi.getCurrentTick()) snap();
            const buildings = snapshotCombatantBuildings(gameApi, { candidate: firstName, baseline: opponentName }),
                winner: Winner = terminal?.winner === "candidate" ? "first" : terminal?.winner === "baseline" ? "opponent" : "draw";
            return { stageIndex: stage, taskIndex, armIndex, armId, caseIndex, populationId,
                populationCaseIndex: caseSpec.populationCaseIndex, country: caseSpec.country,
                side: ALLIED.has(caseSpec.country) ? "Allied" : "Soviet", candidateSlot: caseSpec.candidateSlot,
                requestedEngineSeed: caseSpec.requestedEngineSeed, candidateStart: caseSpec.desiredStart,
                opponentStart: caseSpec.desiredOppositeStart, updates, status: terminal?.status ?? "tick_cap_draw", winner,
                trajectorySha256: trajectory.digest("hex"), terminalBuildingCounts: {
                    first: buildings.filter((row) => row.owner === firstName).length,
                    opponent: buildings.filter((row) => row.owner === opponentName).length },
                terminalUnitInventory: inventory(gameApi, firstName, opponentName),
                quitAttempts: { ...audit.attempts }, quitForwarded: { ...audit.forwarded } };
        });
    const provenance = createExperimentManifest({ runId: `hfo-advanced-v6-competitive-${stage}-${taskIndex}-${process.env.SLURM_JOB_ID}`,
        mixDir: inputs.mixDir, maps: [MAP.name], effectiveConfig: { stage, taskIndex, armId, caseSpec, selectionSha256,
            previousSha256: stage === 0 ? null : process.env.PREVIOUS_SHA256 }, baseline: factory.descriptor,
        gameSeedBase: caseSpec.requestedEngineSeed });
    const artifact = { schemaVersion: 1, kind: "hfo-advanced-v6-competitive-cell",
        status: "COMPLETE_HFO_ADVANCED_V6_COMPETITIVE_CELL", complete: true, stageIndex: stage, taskIndex,
        armIndex, armId, caseIndex, schedulerAccount: "pi_jss233", schedulerJobId: process.env.SLURM_JOB_ID,
        sourceCommit: commit, programSha256, protocolSha256: inputs.protocolSha256,
        assetManifestSha256: inputs.assetManifestSha256, selectionSha256,
        previousStageSha256: stage === 0 ? null : requiredText("PREVIOUS_SHA256", SHA256), baselineCommit: BASELINE_COMMIT,
        ra2webClientCommit: RA2WEB_CLIENT_COMMIT, ra2webClientReleaseId: RA2WEB_CLIENT_RELEASE_ID,
        freezeManifestSha256: advanced.freezeManifestSha256, advancedBundleSha256: advanced.bundleSha256, result, provenance };
    fs.mkdirSync(path.dirname(out), { recursive: true, mode: 0o700 });
    fs.writeFileSync(out, JSON.stringify(artifact, null, 2) + "\n", { flag: "wx", mode: 0o600 });
    console.log(JSON.stringify({ status: artifact.status, stage, taskIndex, armId, caseIndex }));
};

const completedTasks = (job: string) => { const raw = execFileSync("/opt/slurm/current/bin/sacct",
    ["-j", job, "-n", "-P", "-X", "--format=JobID,JobIDRaw,State,ExitCode,Account"], { encoding: "utf8" }),
    tasks = new Map<number, string>(); for (const line of raw.split("\n").filter(Boolean)) {
        const [label, rawId, state, exitCode, account] = line.split("|"), match = new RegExp(`^${job}_(\\d+)$`).exec(label);
        if (match && state === "COMPLETED" && exitCode === "0:0" && account === "pi_jss233") tasks.set(+match[1], rawId); }
    return tasks; };
const score = (winner: Winner) => winner === "first" ? 1 : winner === "draw" ? 0.5 : 0;
const sampleSd = (values: number[]) => { const mean = values.reduce((a, b) => a + b, 0) / values.length;
    return Math.sqrt(values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (values.length - 1)); };
const wilsonLower = (wins: number, games: number) => { const z = 1.6448536269514722, p = wins / games, z2 = z * z;
    return (p + z2 / (2 * games) - z * Math.sqrt(p * (1 - p) / games + z2 / (4 * games * games))) /
        (1 + z2 / games); };
const summarize = (rows: any[]) => { const wins = rows.filter((r) => r.winner === "first").length,
    losses = rows.filter((r) => r.winner === "opponent").length, draws = rows.length - wins - losses;
    return { games: rows.length, wins, draws, losses, winRate: wins / rows.length,
        oneSided95WilsonLower: wilsonLower(wins, rows.length) }; };
const exactFields = ["trajectorySha256", "winner", "status", "updates", "terminalBuildingCounts",
    "terminalUnitInventory", "quitAttempts", "quitForwarded"];
const analyze = (rows: any[], controls: any[], tCritical: number) => {
    const byCase = new Map(controls.map((row) => [row.populationCaseIndex, row])), pairs = rows.map((row) => {
        const control = byCase.get(row.populationCaseIndex); if (!control) throw new Error("V6 paired control missing");
        const mismatch = exactFields.filter((field) => JSON.stringify(row[field]) !== JSON.stringify(control[field]));
        return { ...row, difference: score(row.winner) - score(control.winner), exact: mismatch.length === 0, mismatch }; });
    const values = pairs.map((row) => row.difference), mean = values.reduce((a, b) => a + b, 0) / values.length,
        sd = sampleSd(values), lower = mean - tCritical * sd / Math.sqrt(values.length);
    return { overall: summarize(rows), paired: { cases: pairs.length, mean, sampleStandardDeviation: sd, tCritical,
        oneSidedLower: lower, improved: pairs.filter((r) => r.difference > 0).length,
        tied: pairs.filter((r) => r.difference === 0).length,
        worsened: pairs.filter((r) => r.difference < 0).length }, pairs };
};
const strata = (rows: any[], key: string, values: readonly any[]) => Object.fromEntries(values.map((value) =>
    [String(value), summarize(rows.filter((row) => row[key] === value))]));

const finalize = () => {
    const stage = Number(requiredText("STAGE_INDEX", /^[0-2]$/)), root = requiredPath("RESULTS_ROOT"),
        out = requiredPath("OUT_PATH"), arrayJobId = requiredText("ARRAY_JOB_ID", /^\d+$/),
        programSha256 = requiredText("PROGRAM_SHA256", SHA256), selectionSha256 = requiredText("SELECTION_SHA256", SHA256),
        inputs = commonInputs(), previous = loadPrevious(stage), previousStageSha256 = stage === 0 ? null :
            requiredText("PREVIOUS_SHA256", SHA256), arms = v6StageArms(stage, previous), populationId = stagePopulation(stage),
        caseCount = stage === 0 ? 36 : stage === 1 ? 72 : 360, taskCount = arms.length * caseCount,
        cellProgramSha256 = process.env.CELL_PROGRAM_SHA256 ? requiredText("CELL_PROGRAM_SHA256", SHA256) : programSha256;
    if (fs.existsSync(out)) throw new Error("V6 finalizer output exists"); const commit = sourceIdentity().commit;
    let tasks = new Map<number, string>(); for (let i = 0; i < 31; i += 1) { tasks = completedTasks(arrayJobId);
        if (tasks.size === taskCount) break; if (i < 30) execFileSync("sleep", ["2"]); }
    if (tasks.size !== taskCount) throw new Error(`V6 scheduler incomplete ${tasks.size}/${taskCount}`);
    const rows: any[] = [];
    for (let taskIndex = 0; taskIndex < taskCount; taskIndex += 1) { const taskRoot = path.join(root,
        `task-${String(taskIndex).padStart(3, "0")}`), file = path.join(taskRoot, "cell.json");
        if (sha256File(file) !== fs.readFileSync(path.join(taskRoot, "cell.sha256"), "utf8").trim().split(/\s+/)[0])
            throw new Error(`V6 checksum ${taskIndex}`); const cell = JSON.parse(fs.readFileSync(file, "utf8")),
            armIndex = Math.floor(taskIndex / caseCount), caseIndex = taskIndex % caseCount;
        if (cell.kind !== "hfo-advanced-v6-competitive-cell" || cell.complete !== true || cell.stageIndex !== stage ||
            cell.taskIndex !== taskIndex || cell.armIndex !== armIndex || cell.armId !== arms[armIndex] || cell.caseIndex !== caseIndex ||
            String(cell.schedulerJobId) !== tasks.get(taskIndex) || cell.sourceCommit !== commit ||
            cell.programSha256 !== cellProgramSha256 || cell.protocolSha256 !== inputs.protocolSha256 ||
            cell.assetManifestSha256 !== inputs.assetManifestSha256 || cell.selectionSha256 !== selectionSha256 ||
            cell.previousStageSha256 !== previousStageSha256 || cell.baselineCommit !== BASELINE_COMMIT ||
            cell.ra2webClientCommit !== RA2WEB_CLIENT_COMMIT || cell.freezeManifestSha256 !== RA2WEB_FREEZE_MANIFEST_SHA256 ||
            cell.advancedBundleSha256 !== ADVANCED_SHA256 || cell.result.populationId !== populationId ||
            cell.result.quitForwarded?.candidate !== 0 || cell.result.quitForwarded?.baseline !== 0)
            throw new Error(`V6 cell identity ${taskIndex}`); rows.push(cell.result); }
    const controls = rows.filter((row) => row.armId === "noop"), controlSummary = summarize(controls),
        tCritical = stage === 0 ? 1.30621 : stage === 1 ? 1.29359 : 1.64911,
        candidates = arms.slice(1).map((id, declarationIndex) => {
            const candidateRows = rows.filter((row) => row.armId === id), analysis = analyze(candidateRows, controls, tCritical),
                byCountry = strata(candidateRows, "country", HFO_ADVANCED_V6_COMPETITIVE_COUNTRIES),
                bySide = strata(candidateRows, "side", ["Allied", "Soviet"]),
                bySlot = strata(candidateRows, "candidateSlot", [0, 1]),
                byStart = strata(candidateRows, "candidateStart", stage === 0 ? [WEST] : STARTS),
                countrySuperior = Object.values(byCountry).filter((v: any) => v.wins > v.losses).length,
                countryNoninferior = Object.values(byCountry).filter((v: any) => v.wins >= v.losses).length,
                sideSafe = Object.values(bySide).every((v: any) => v.wins > v.losses),
                slotSafe = Object.values(bySlot).every((v: any) => v.wins > v.losses),
                west = byStart[WEST], nonWest = analysis.pairs.filter((pair: any) => pair.candidateStart !== WEST),
                nonWestExpected = stage === 0 ? 0 : stage === 1 ? 54 : 270,
                nonWestExact = stage === 0 || (nonWest.length === nonWestExpected && nonWest.every((pair: any) => pair.exact));
            let clustered = null;
            if (stage === 2) { const rates = HFO_ADVANCED_V6_COMPETITIVE_COUNTRIES.flatMap((country) => STARTS.map((start) =>
                summarize(candidateRows.filter((row) => row.country === country && row.candidateStart === start)).winRate)),
                mean = rates.reduce((a, b) => a + b, 0) / rates.length, sd = sampleSd(rates);
                clustered = { clusterCount: 36, meanWinRate: mean, sampleStandardDeviation: sd,
                    tCritical: 1.68957, oneSided95Lower: mean - 1.68957 * sd / 6 }; }
            const startSafe = stage === 0 || Object.values(byStart).every((v: any) => v.wins > v.losses),
                eligible = analysis.overall.wins > analysis.overall.losses && analysis.paired.mean > 0 &&
                    analysis.paired.oneSidedLower > 0 && (stage !== 0 || analysis.overall.losses < controlSummary.losses) &&
                    sideSafe && slotSafe &&
                    countrySuperior >= 7 && countryNoninferior === 9 && (stage === 0 ||
                        (analysis.overall.oneSided95WilsonLower > 0.5 && west.wins > west.losses &&
                            west.losses < summarize(controls.filter((row) => row.candidateStart === WEST)).losses &&
                            startSafe && nonWestExact && (stage < 2 || (clustered?.oneSided95Lower ?? 0) > 0.5)));
            return { id, declarationIndex, ...analysis, byCountry, bySide, bySlot, byStart,
                countrySuperior, countryNoninferior, sideSafe, slotSafe, startSafe,
                nonWestExactCount: nonWest.filter((pair: any) => pair.exact).length, clustered, eligible };
        });
    const ranked = candidates.slice().sort((a, b) => {
        if (stage === 0) return b.paired.oneSidedLower - a.paired.oneSidedLower || b.overall.winRate - a.overall.winRate ||
            a.overall.losses - b.overall.losses || Math.min(...Object.values(b.byCountry).map((v: any) => v.winRate)) -
            Math.min(...Object.values(a.byCountry).map((v: any) => v.winRate)) || a.declarationIndex - b.declarationIndex;
        return Math.min(...Object.values(b.byStart).map((v: any) => v.winRate)) -
            Math.min(...Object.values(a.byStart).map((v: any) => v.winRate)) ||
            b.paired.oneSidedLower - a.paired.oneSidedLower || b.overall.winRate - a.overall.winRate ||
            a.overall.losses - b.overall.losses ||
            Math.min(...Object.values(b.byCountry).map((v: any) => v.winRate)) -
            Math.min(...Object.values(a.byCountry).map((v: any) => v.winRate)) ||
            a.declarationIndex - b.declarationIndex;
    });
    const survivors = stage === 0 ? ranked.filter((row) => row.eligible).slice(0, 2).map((row) => ({ id: row.id,
        paired: row.paired, overall: row.overall })) : [], champion = stage === 1
        ? (ranked.find((row) => row.eligible) ? { id: ranked.find((row) => row.eligible)!.id,
            paired: ranked.find((row) => row.eligible)!.paired, overall: ranked.find((row) => row.eligible)!.overall } : null)
        : previous?.champion ?? null, passed = stage === 0 ? survivors.length > 0 : stage === 1 ? champion !== null :
            candidates.length === 1 && candidates[0].eligible;
    const artifact = { schemaVersion: 1, kind: "hfo-advanced-v6-competitive-stage",
        status: passed ? `PASS_HFO_ADVANCED_V6_COMPETITIVE_STAGE_${stage}` : `FAIL_HFO_ADVANCED_V6_COMPETITIVE_STAGE_${stage}`,
        complete: true, passed, stageIndex: stage, schedulerAccount: "pi_jss233", arrayJobId,
        finalizerJobId: process.env.SLURM_JOB_ID, sourceCommit: commit, programSha256, cellProgramSha256,
        protocolSha256: inputs.protocolSha256, assetManifestSha256: inputs.assetManifestSha256, selectionSha256,
        previousStageSha256, baselineCommit: BASELINE_COMMIT, ra2webClientCommit: RA2WEB_CLIENT_COMMIT,
        ra2webClientReleaseId: RA2WEB_CLIENT_RELEASE_ID, freezeManifestSha256: RA2WEB_FREEZE_MANIFEST_SHA256,
        advancedBundleSha256: ADVANCED_SHA256, launchedGameCount: rows.length, control: controlSummary,
        candidates, ranking: ranked.map((row) => row.id), survivors, champion,
        schedulerJobIds: [...tasks.values()], rows };
    fs.mkdirSync(path.dirname(out), { recursive: true, mode: 0o700 });
    fs.writeFileSync(out, JSON.stringify(artifact, null, 2) + "\n", { flag: "wx", mode: 0o600 });
    console.log(JSON.stringify({ status: artifact.status, stage, ranking: artifact.ranking,
        survivors: survivors.map((row) => row.id), champion: champion?.id ?? null }));
};
const main = async () => { const mode = requiredText("MODE", /^(select|cell|finalize)$/);
    if (mode === "select") await selectCases(); else if (mode === "cell") await runCell(); else finalize(); };
const invoked = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (import.meta.url === invoked) main().catch((error) => { console.error(error); process.exitCode = 1; });
