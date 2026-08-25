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
import { decorateExternalBaselineLifecycle } from "./externalBaselineLifecycleDecorator.js";
import { RA2WEB_CLIENT_COMMIT, RA2WEB_CLIENT_RELEASE_ID, RA2WEB_FREEZE_MANIFEST_SHA256,
    createInspectableRa2WebBot, loadRa2WebOpponent } from "./ra2WebOpponentBundle.js";
import { LiteralBuildingEliminationAdjudicator, installLiteralEndpointInstrumentation,
    snapshotCombatantBuildings } from "./literalBuildingEliminationEndpoint.js";

const MAP = { name: "cd_chrono_4_heck_freezes_over_le.map",
    sha256: "e4dfc736a6355e0e68d4681e4d67419516e6bb94549e2d42880c9414e95e2e8d" } as const;
export const HFO_ADVANCED_V5_COUNTRIES = [Countries.USA, Countries.KOREA, Countries.FRANCE, Countries.GERMANY,
    Countries.GREAT_BRITAIN, Countries.LIBYA, Countries.IRAQ, Countries.CUBA, Countries.RUSSIA] as const;
const STARTS = ["39,82", "151,119", "88,34", "88,157"] as const;
type Start = typeof STARTS[number];
const OPPOSITE: Record<Start, Start> = {
    "39,82": "151,119", "151,119": "39,82", "88,34": "88,157", "88,157": "88,34",
};
const BASELINE_COMMIT = "165b77a71d0cf5ebd27c65b19d0486bcbae78d0f";
const ADVANCED_SHA256 = "81d8797b6dd1371ba2dcbd79e25df8b42254290c820159e121a82650fd97a143";
const SHA256 = /^[0-9a-f]{64}$/;
const ALLIED = new Set<Countries>(HFO_ADVANCED_V5_COUNTRIES.slice(0, 5));
type Winner = "first" | "opponent" | "draw";
type PopulationSpec = { id: string; seedBase: number; starts: readonly Start[]; casesPerCell: number };
export const HFO_ADVANCED_V5_POPULATIONS: readonly PopulationSpec[] = [
    { id: "equivalence", seedBase: 4_265_000_000, starts: STARTS, casesPerCell: 1 },
    ...[0, 1, 2].map((run) => ({ id: `run-${run}-stage-0`, seedBase: 4_266_000_000 + run * 1_000_000,
        starts: [STARTS[0]] as readonly Start[], casesPerCell: 1 })),
    ...[0, 1, 2].map((run) => ({ id: `run-${run}-stage-1`, seedBase: 4_269_000_000 + run * 1_000_000,
        starts: [STARTS[0]] as readonly Start[], casesPerCell: 2 })),
    ...[0, 1, 2].map((run) => ({ id: `run-${run}-stage-2`, seedBase: 4_272_000_000 + run * 1_000_000,
        starts: STARTS, casesPerCell: 1 })),
    { id: "championship", seedBase: 4_275_000_000, starts: STARTS, casesPerCell: 2 },
    { id: "replication", seedBase: 4_276_000_000, starts: STARTS, casesPerCell: 5 },
];
export const HFO_ADVANCED_V5_SPEC = {
    maxOffsets: 100, maxTicks: 90_000, snapshotInterval: 60,
    selectedCaseCount: 954, equivalenceCaseCount: 72, equivalenceArmCount: 2, equivalenceTaskCount: 144,
} as const;
export type AdvancedWestTargetMode = "force_first" | "terminal_race" | "production_first";
export type AdvancedWestDefense = "off" | "compact" | "wide";
export type AdvancedWestCandidate = { defense: AdvancedWestDefense; minTick: number; minCombatants: number;
    combatantAdvantage: number; targetMode: AdvancedWestTargetMode };
const DEFENSES: AdvancedWestDefense[] = ["off", "compact", "wide"];
const TARGET_MODES: AdvancedWestTargetMode[] = ["force_first", "terminal_race", "production_first"];
export const HFO_ADVANCED_V5_CANDIDATES: readonly AdvancedWestCandidate[] = DEFENSES.flatMap((defense) =>
    [7200, 9600, 12000, 14400].flatMap((minTick) => [6, 10, 14].flatMap((minCombatants) =>
        [-12, -4, 4].flatMap((combatantAdvantage) => TARGET_MODES.map((targetMode) =>
            ({ defense, minTick, minCombatants, combatantAdvantage, targetMode }))))));
export const sampledAdvancedWestCandidates = (runIndex: number): AdvancedWestCandidate[] => {
    if (!Number.isInteger(runIndex) || runIndex < 0 || runIndex > 2) throw new Error("Invalid V5 optimizer run");
    return HFO_ADVANCED_V5_CANDIDATES.map((candidate) => ({ candidate,
        hash: crypto.createHash("sha256").update(`advanced-west-v5|${runIndex}|${JSON.stringify(candidate)}`).digest("hex") }))
        .sort((left, right) => left.hash.localeCompare(right.hash)).slice(0, 24).map(({ candidate }) => candidate);
};
type SelectedCase = { globalCaseIndex: number; populationId: string; populationCaseIndex: number;
    countryOrdinal: number; country: Countries; startOrdinal: number; desiredStart: Start;
    desiredOppositeStart: Start; candidateSlot: 0 | 1; repeatIndex: number; seedOffset: number;
    requestedEngineSeed: number; candidateStart: string; opponentStart: string };

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
const inspectableApi = (bot: { lastGameApi: GameApi | null }): GameApi => {
    if (!bot.lastGameApi) throw new Error("V5 GameApi unavailable"); return bot.lastGameApi;
};
const sourceIdentity = () => {
    const repo = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
    const commit = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
    if (execFileSync("git", ["branch", "--show-current"], { encoding: "utf8" }).trim() !== "main" ||
        execFileSync("git", ["status", "--short", "--untracked-files=no"], { encoding: "utf8" }).trim() !== "" ||
        execFileSync("git", ["rev-parse", "fork/main"], { encoding: "utf8" }).trim() !== commit) {
        throw new Error("V5 requires clean synchronized main");
    }
    return { repo, commit };
};
const commonInputs = () => {
    if (process.env.SLURM_JOB_ACCOUNT !== "pi_jss233") throw new Error("V5 requires pi_jss233");
    const mixDir = requiredPath("MIX_DIR"), protocolPath = requiredPath("PROTOCOL_PATH");
    const assetManifestPath = requiredPath("ASSET_MANIFEST_PATH"), freezeRoot = requiredPath("RA2WEB_FREEZE_ROOT");
    const protocolSha256 = requiredText("PROTOCOL_SHA256", SHA256);
    const assetManifestSha256 = requiredText("ASSET_MANIFEST_SHA256", SHA256);
    if (sha256File(protocolPath) !== protocolSha256 || sha256File(assetManifestPath) !== assetManifestSha256 ||
        sha256File(path.join(mixDir, MAP.name)) !== MAP.sha256) throw new Error("V5 input drifted");
    const manifest = JSON.parse(fs.readFileSync(assetManifestPath, "utf8")) as unknown;
    if (!isRecord(manifest) || manifest.kind !== "private-ra2-snow-runtime" ||
        path.resolve(String(manifest.runtimeDirectory)) !== mixDir) throw new Error("V5 runtime drifted");
    return { mixDir, protocolSha256, assetManifestSha256, freezeRoot };
};
const assertExternalBaseline = (factory: BaselineFactory): void => {
    const descriptor = factory.descriptor;
    if (descriptor.kind !== "external-package" || typeof descriptor.packageRoot !== "string")
        throw new Error("V5 baseline is not external");
    const packageRoot = path.resolve(descriptor.packageRoot);
    const repo = execFileSync("git", ["-C", packageRoot, "rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
    const commit = execFileSync("git", ["-C", repo, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
    if (commit !== BASELINE_COMMIT || execFileSync("git", ["-C", repo, "status", "--short", "--untracked-files=no"],
        { encoding: "utf8" }).trim() !== "" || packageRoot !== path.join(repo, "packages", "chronodivide-bot"))
        throw new Error("V5 external baseline drifted");
};
const loadAdvanced = (freezeRoot: string) => {
    const loaded = loadRa2WebOpponent(freezeRoot, "ra2web_advanced_old_priest");
    if (loaded.freezeManifestSha256 !== RA2WEB_FREEZE_MANIFEST_SHA256 || loaded.bundleSha256 !== ADVANCED_SHA256)
        throw new Error("V5 Advanced identity drifted");
    return loaded;
};
const settings = (first: Bot, advanced: Bot, slot: 0 | 1): CreateOfflineOpts => {
    const gameMode = cdapi.getAvailableGameModes(MAP.name)[0]; if (!gameMode) throw new Error("V5 mode unavailable");
    return { buildOffAlly: false, cratesAppear: false, credits: 10_000, gameMode, gameSpeed: 6,
        mapName: MAP.name, mcvRepacks: true, shortGame: false, superWeapons: false, unitCount: 0, online: false,
        agents: slot === 0 ? [first, advanced] : [advanced, first] };
};

const selectCases = async (): Promise<void> => {
    const outputPath = requiredPath("OUT_PATH"), programPath = requiredPath("PROGRAM_PATH");
    const programSha256 = requiredText("PROGRAM_SHA256", SHA256), inputs = commonInputs();
    if (fs.existsSync(outputPath) || sha256File(programPath) !== programSha256) throw new Error("V5 selector drifted");
    const { repo, commit } = sourceIdentity(); await cdapi.init(inputs.mixDir);
    const factory = await loadBaselineFactory(path.join(repo, "packages", "chronodivide-bot"));
    assertExternalBaseline(factory); const advanced = loadAdvanced(inputs.freezeRoot);
    const cases: SelectedCase[] = []; let initializedGameCount = 0;
    for (const population of HFO_ADVANCED_V5_POPULATIONS) {
        let populationCaseIndex = 0;
        for (const [countryOrdinal, country] of HFO_ADVANCED_V5_COUNTRIES.entries()) {
            for (const desiredStart of population.starts) {
                const startOrdinal = STARTS.indexOf(desiredStart);
                for (const candidateSlot of [0, 1] as const) {
                    let selected = 0;
                    for (let seedOffset = 0; seedOffset < HFO_ADVANCED_V5_SPEC.maxOffsets &&
                        selected < population.casesPerCell; seedOffset += 1) {
                        const seed = population.seedBase + 10_000 * countryOrdinal + 1_000 * startOrdinal +
                            100 * candidateSlot + seedOffset;
                        const firstName = `V5SelectFirst_${population.id}_${countryOrdinal}_${startOrdinal}_${candidateSlot}_${seedOffset}`;
                        const advancedName = `V5SelectAdvanced_${population.id}_${countryOrdinal}_${startOrdinal}_${candidateSlot}_${seedOffset}`;
                        const first = factory.create(firstName, country);
                        const opponent = createInspectableRa2WebBot(advanced, advancedName, country);
                        const starts = await withSeededOfflineGame(cdapi, settings(first, opponent, candidateSlot), seed,
                            [{ agent: first, identity: "first" }, { agent: opponent, identity: "opponent" }], async () => ({
                                candidateStart: startKey(inspectableApi(first).getPlayerData(firstName).startLocation),
                                opponentStart: startKey(inspectableApi(first).getPlayerData(advancedName).startLocation),
                            }));
                        initializedGameCount += 1;
                        if (starts.candidateStart === desiredStart && starts.opponentStart === OPPOSITE[desiredStart]) {
                            cases.push({ globalCaseIndex: cases.length, populationId: population.id,
                                populationCaseIndex: populationCaseIndex++, countryOrdinal, country, startOrdinal,
                                desiredStart, desiredOppositeStart: OPPOSITE[desiredStart], candidateSlot,
                                repeatIndex: selected, seedOffset, requestedEngineSeed: seed, ...starts }); selected += 1;
                        }
                    }
                    if (selected !== population.casesPerCell) throw new Error(`V5 selection incomplete ${population.id}`);
                }
            }
        }
    }
    const identities = new Set(cases.map((entry) => `${entry.requestedEngineSeed}:${entry.candidateSlot}`));
    const counts = Object.fromEntries(HFO_ADVANCED_V5_POPULATIONS.map((population) =>
        [population.id, cases.filter((entry) => entry.populationId === population.id).length]));
    if (cases.length !== HFO_ADVANCED_V5_SPEC.selectedCaseCount || identities.size !== cases.length ||
        counts.equivalence !== HFO_ADVANCED_V5_SPEC.equivalenceCaseCount ||
        HFO_ADVANCED_V5_CANDIDATES.length !== 324 || [0, 1, 2].some((run) => sampledAdvancedWestCandidates(run).length !== 24))
        throw new Error("V5 master selection coverage drifted");
    const artifact = { schemaVersion: 1, kind: "hfo-advanced-v5-master-selection",
        status: "PASS_HFO_ADVANCED_V5_MASTER_SELECTION", complete: true, passed: true, outcomeFree: true,
        scheduler: { jobId: process.env.SLURM_JOB_ID, account: "pi_jss233" }, sourceCommit: commit, programSha256,
        protocolSha256: inputs.protocolSha256, assetManifestSha256: inputs.assetManifestSha256,
        baselineCommit: BASELINE_COMMIT, ra2webClientCommit: RA2WEB_CLIENT_COMMIT,
        ra2webClientReleaseId: RA2WEB_CLIENT_RELEASE_ID, freezeManifestSha256: advanced.freezeManifestSha256,
        advancedBundleSha256: advanced.bundleSha256, ...HFO_ADVANCED_V5_SPEC, initializedGameCount,
        populationCounts: counts, updateCount: 0, forbiddenOutcomeFields: [], cases };
    fs.mkdirSync(path.dirname(outputPath), { recursive: true, mode: 0o700 });
    fs.writeFileSync(outputPath, JSON.stringify(artifact, null, 2) + "\n", { flag: "wx", mode: 0o600 });
    console.log(JSON.stringify({ status: artifact.status, cases: cases.length, initializedGameCount }));
};

const loadEquivalenceCases = (selectionPath: string, selectionSha256: string,
    inputs: ReturnType<typeof commonInputs>): SelectedCase[] => {
    if (sha256File(selectionPath) !== selectionSha256) throw new Error("V5 selection hash drifted");
    const selection = JSON.parse(fs.readFileSync(selectionPath, "utf8")) as any;
    if (selection.kind !== "hfo-advanced-v5-master-selection" || selection.complete !== true ||
        selection.passed !== true || selection.outcomeFree !== true || selection.updateCount !== 0 ||
        selection.sourceCommit !== sourceIdentity().commit || selection.protocolSha256 !== inputs.protocolSha256 ||
        selection.assetManifestSha256 !== inputs.assetManifestSha256 || selection.baselineCommit !== BASELINE_COMMIT ||
        selection.ra2webClientCommit !== RA2WEB_CLIENT_COMMIT || selection.freezeManifestSha256 !== RA2WEB_FREEZE_MANIFEST_SHA256 ||
        selection.advancedBundleSha256 !== ADVANCED_SHA256 || !Array.isArray(selection.forbiddenOutcomeFields) ||
        selection.forbiddenOutcomeFields.length !== 0 || !Array.isArray(selection.cases) ||
        selection.cases.length !== HFO_ADVANCED_V5_SPEC.selectedCaseCount) throw new Error("V5 selection ineligible");
    const cases = (selection.cases as SelectedCase[]).filter((entry) => entry.populationId === "equivalence");
    if (cases.length !== HFO_ADVANCED_V5_SPEC.equivalenceCaseCount ||
        cases.some((entry, index) => entry.populationCaseIndex !== index || entry.candidateStart !== entry.desiredStart ||
            entry.opponentStart !== entry.desiredOppositeStart)) throw new Error("V5 equivalence cases drifted");
    return cases;
};

const canonicalSnapshot = (game: GameApi, firstName: string, advancedName: string) => {
    const units = game.getAllUnits().map((id) => game.getUnitData(id)).filter((unit): unit is UnitData => !!unit)
        .filter((unit) => unit.owner === firstName || unit.owner === advancedName).map((unit) => ({
            owner: unit.owner === firstName ? "first" : "opponent", rule: unit.rules.name,
            type: unit.rules.type, hitPoints: unit.hitPoints, x: unit.tile.rx, y: unit.tile.ry,
        })).sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
    return { tick: game.getCurrentTick(), credits: {
        first: game.getPlayerData(firstName).credits, opponent: game.getPlayerData(advancedName).credits }, units,
        buildingCounts: {
            first: units.filter((unit) => unit.owner === "first" && unit.type === ObjectType.Building).length,
            opponent: units.filter((unit) => unit.owner === "opponent" && unit.type === ObjectType.Building).length,
        } };
};
const unitInventory = (game: GameApi, firstName: string, advancedName: string) => {
    const units = game.getAllUnits().map((id) => game.getUnitData(id)).filter((unit): unit is UnitData => !!unit)
        .filter((unit) => unit.owner === firstName || unit.owner === advancedName);
    const summarize = (owner: string) => Object.fromEntries([...new Set(units.filter((unit) => unit.owner === owner)
        .map((unit) => unit.rules.name))].sort().map((name) => [name,
            units.filter((unit) => unit.owner === owner && unit.rules.name === name).length]));
    return { first: summarize(firstName), opponent: summarize(advancedName) };
};

const runEquivalenceCell = async (): Promise<void> => {
    const taskIndex = Number(requiredText("TASK_INDEX", /^\d+$/)), outputPath = requiredPath("OUT_PATH");
    const programPath = requiredPath("PROGRAM_PATH"), programSha256 = requiredText("PROGRAM_SHA256", SHA256);
    const selectionPath = requiredPath("SELECTION_PATH"), selectionSha256 = requiredText("SELECTION_SHA256", SHA256);
    const inputs = commonInputs();
    if (taskIndex < 0 || taskIndex >= HFO_ADVANCED_V5_SPEC.equivalenceTaskCount ||
        process.env.SLURM_ARRAY_TASK_ID !== String(taskIndex) || fs.existsSync(outputPath) ||
        sha256File(programPath) !== programSha256) throw new Error("V5 equivalence cell drifted");
    const cases = loadEquivalenceCases(selectionPath, selectionSha256, inputs);
    const armIndex = Math.floor(taskIndex / HFO_ADVANCED_V5_SPEC.equivalenceCaseCount),
        caseIndex = taskIndex % HFO_ADVANCED_V5_SPEC.equivalenceCaseCount, caseSpec = cases[caseIndex];
    const armId = armIndex === 0 ? "external_supalosa" : "decorated_noop";
    if (!caseSpec || armIndex > 1) throw new Error("V5 equivalence assignment drifted");
    const { repo, commit } = sourceIdentity(); await cdapi.init(inputs.mixDir);
    const factory = await loadBaselineFactory(path.join(repo, "packages", "chronodivide-bot")); assertExternalBaseline(factory);
    const loadedAdvanced = loadAdvanced(inputs.freezeRoot);
    const firstName = `V5EquivalenceFirst_${caseIndex}`, advancedName = `V5EquivalenceAdvanced_${caseIndex}`;
    const rawFirst = factory.create(firstName, caseSpec.country);
    const first = armId === "decorated_noop" ? decorateExternalBaselineLifecycle(rawFirst, {}) : rawFirst;
    const advanced = createInspectableRa2WebBot(loadedAdvanced, advancedName, caseSpec.country);
    const adjudicator = new LiteralBuildingEliminationAdjudicator({ candidate: firstName, baseline: advancedName });
    const { audit } = installLiteralEndpointInstrumentation({ candidate: first, baseline: advanced }, adjudicator);
    const result = await withSeededOfflineGame(cdapi, settings(first, advanced, caseSpec.candidateSlot),
        caseSpec.requestedEngineSeed, [{ agent: first, identity: "first" }, { agent: advanced, identity: "opponent" }],
        async (game) => {
            const api = inspectableApi(first);
            if (startKey(api.getPlayerData(firstName).startLocation) !== caseSpec.desiredStart ||
                startKey(api.getPlayerData(advancedName).startLocation) !== caseSpec.desiredOppositeStart)
                throw new Error("V5 selected start drifted");
            const trajectory = crypto.createHash("sha256"); let lastSnapshotTick = -1;
            const snapshot = () => { trajectory.update(JSON.stringify(canonicalSnapshot(api, firstName, advancedName)) + "\n");
                lastSnapshotTick = api.getCurrentTick(); };
            snapshot(); let updates = 0, terminal: any = null, failure: any = null;
            while (updates < HFO_ADVANCED_V5_SPEC.maxTicks && !terminal && !failure) {
                adjudicator.beginUpdate(api); await game.update(); updates += 1;
                const stats = game.getPlayerStats(), firstStats = stats.find((row) => row.name === firstName),
                    advancedStats = stats.find((row) => row.name === advancedName);
                if (!firstStats || !advancedStats) throw new Error("V5 statistics unavailable");
                const endpoint = adjudicator.completeUpdate(api, { finished: game.isFinished(), defeated: {
                    candidate: firstStats.defeated, baseline: advancedStats.defeated } });
                terminal = endpoint.terminal; failure = endpoint.technicalFailure;
                if (updates % HFO_ADVANCED_V5_SPEC.snapshotInterval === 0) snapshot();
            }
            if (failure) throw new Error(`V5 endpoint failure ${JSON.stringify(failure)}`);
            if (lastSnapshotTick !== api.getCurrentTick()) snapshot();
            const buildings = snapshotCombatantBuildings(api, { candidate: firstName, baseline: advancedName });
            const winner: Winner = terminal?.winner === "candidate" ? "first" :
                terminal?.winner === "baseline" ? "opponent" : "draw";
            return { taskIndex, armIndex, armId, caseIndex, country: caseSpec.country,
                faction: ALLIED.has(caseSpec.country) ? "Allied" : "Soviet", candidateSlot: caseSpec.candidateSlot,
                requestedEngineSeed: caseSpec.requestedEngineSeed, candidateStart: caseSpec.desiredStart,
                opponentStart: caseSpec.desiredOppositeStart, updates, status: terminal?.status ?? "tick_cap_draw", winner,
                trajectorySha256: trajectory.digest("hex"), terminalBuildingCounts: {
                    first: buildings.filter((row) => row.owner === firstName).length,
                    opponent: buildings.filter((row) => row.owner === advancedName).length },
                terminalUnitInventory: unitInventory(api, firstName, advancedName),
                quitAttempts: { ...audit.attempts }, quitForwarded: { ...audit.forwarded } };
        });
    const provenance = createExperimentManifest({ runId: `hfo-advanced-v5-equivalence-${taskIndex}-${process.env.SLURM_JOB_ID}`,
        mixDir: inputs.mixDir, maps: [MAP.name], effectiveConfig: { taskIndex, armIndex, armId, caseSpec,
            selectionSha256, snapshotInterval: HFO_ADVANCED_V5_SPEC.snapshotInterval }, baseline: factory.descriptor,
        gameSeedBase: caseSpec.requestedEngineSeed });
    const artifact = { schemaVersion: 1, kind: "hfo-advanced-v5-equivalence-cell",
        status: "COMPLETE_HFO_ADVANCED_V5_EQUIVALENCE_CELL", complete: true, taskIndex, armIndex, armId, caseIndex,
        schedulerAccount: "pi_jss233", schedulerJobId: process.env.SLURM_JOB_ID, sourceCommit: commit, programSha256,
        protocolSha256: inputs.protocolSha256, assetManifestSha256: inputs.assetManifestSha256, selectionSha256,
        baselineCommit: BASELINE_COMMIT, ra2webClientCommit: RA2WEB_CLIENT_COMMIT,
        ra2webClientReleaseId: RA2WEB_CLIENT_RELEASE_ID, freezeManifestSha256: loadedAdvanced.freezeManifestSha256,
        advancedBundleSha256: loadedAdvanced.bundleSha256, result, provenance };
    fs.mkdirSync(path.dirname(outputPath), { recursive: true, mode: 0o700 });
    fs.writeFileSync(outputPath, JSON.stringify(artifact, null, 2) + "\n", { flag: "wx", mode: 0o600 });
    console.log(JSON.stringify({ status: artifact.status, taskIndex, armId, caseIndex }));
};

const completedTasks = (arrayJobId: string): Map<number, string> => {
    const raw = execFileSync("/opt/slurm/current/bin/sacct",
        ["-j", arrayJobId, "-n", "-P", "-X", "--format=JobID,JobIDRaw,State,ExitCode,Account"], { encoding: "utf8" });
    const tasks = new Map<number, string>();
    for (const line of raw.split("\n").filter(Boolean)) {
        const [label, rawId, state, exitCode, account] = line.split("|");
        const match = new RegExp(`^${arrayJobId}_(\\d+)$`).exec(label);
        if (match && state === "COMPLETED" && exitCode === "0:0" && account === "pi_jss233")
            tasks.set(Number(match[1]), rawId);
    }
    return tasks;
};
const score = (winner: Winner): number => winner === "first" ? 1 : winner === "draw" ? 0.5 : 0;
const finalizeEquivalence = (): void => {
    const root = requiredPath("RESULTS_ROOT"), outputPath = requiredPath("OUT_PATH");
    const arrayJobId = requiredText("ARRAY_JOB_ID", /^\d+$/), programSha256 = requiredText("PROGRAM_SHA256", SHA256);
    const selectionSha256 = requiredText("SELECTION_SHA256", SHA256), inputs = commonInputs();
    const cellProgramSha256 = process.env.CELL_PROGRAM_SHA256 ? requiredText("CELL_PROGRAM_SHA256", SHA256) : programSha256;
    if (fs.existsSync(outputPath)) throw new Error("V5 equivalence finalizer output exists");
    let tasks = new Map<number, string>();
    for (let attempt = 0; attempt < 31; attempt += 1) { tasks = completedTasks(arrayJobId);
        if (tasks.size === HFO_ADVANCED_V5_SPEC.equivalenceTaskCount) break;
        if (attempt < 30) execFileSync("sleep", ["2"]); }
    if (tasks.size !== HFO_ADVANCED_V5_SPEC.equivalenceTaskCount)
        throw new Error(`Only ${tasks.size}/${HFO_ADVANCED_V5_SPEC.equivalenceTaskCount} V5 tasks complete`);
    const rows: any[] = [], sources = new Set<string>(), currentCommit = sourceIdentity().commit;
    for (let taskIndex = 0; taskIndex < HFO_ADVANCED_V5_SPEC.equivalenceTaskCount; taskIndex += 1) {
        const taskRoot = path.join(root, `task-${String(taskIndex).padStart(3, "0")}`);
        const cellPath = path.join(taskRoot, "cell.json"), checksumPath = path.join(taskRoot, "cell.sha256");
        const expectedChecksum = fs.readFileSync(checksumPath, "utf8").trim().split(/\s+/)[0];
        if (sha256File(cellPath) !== expectedChecksum) throw new Error(`V5 equivalence cell ${taskIndex} checksum drifted`);
        const cell = JSON.parse(fs.readFileSync(cellPath, "utf8"));
        const armIndex = Math.floor(taskIndex / HFO_ADVANCED_V5_SPEC.equivalenceCaseCount),
            armId = armIndex === 0 ? "external_supalosa" : "decorated_noop",
            caseIndex = taskIndex % HFO_ADVANCED_V5_SPEC.equivalenceCaseCount;
        if (cell.kind !== "hfo-advanced-v5-equivalence-cell" || cell.complete !== true || cell.taskIndex !== taskIndex ||
            cell.armIndex !== armIndex || cell.armId !== armId || cell.caseIndex !== caseIndex ||
            String(cell.schedulerJobId) !== tasks.get(taskIndex) || cell.programSha256 !== cellProgramSha256 ||
            cell.protocolSha256 !== inputs.protocolSha256 || cell.assetManifestSha256 !== inputs.assetManifestSha256 ||
            cell.selectionSha256 !== selectionSha256 || cell.baselineCommit !== BASELINE_COMMIT ||
            cell.ra2webClientCommit !== RA2WEB_CLIENT_COMMIT || cell.freezeManifestSha256 !== RA2WEB_FREEZE_MANIFEST_SHA256 ||
            cell.ra2webClientReleaseId !== RA2WEB_CLIENT_RELEASE_ID || cell.advancedBundleSha256 !== ADVANCED_SHA256 ||
            cell.sourceCommit !== currentCommit) throw new Error(`V5 equivalence cell ${taskIndex} drifted`);
        sources.add(cell.sourceCommit); rows.push(cell.result);
    }
    if (sources.size !== 1 || !sources.has(currentCommit) || rows.length !== HFO_ADVANCED_V5_SPEC.equivalenceTaskCount ||
        rows.some((row) => row.quitForwarded?.candidate !== 0 || row.quitForwarded?.baseline !== 0))
        throw new Error("V5 equivalence aggregate or resignation suppression drifted");
    const fields = ["trajectorySha256", "winner", "status", "updates", "terminalBuildingCounts",
        "terminalUnitInventory", "quitAttempts", "quitForwarded"];
    const pairs = Array.from({ length: HFO_ADVANCED_V5_SPEC.equivalenceCaseCount }, (_, caseIndex) => {
        const external = rows.find((row) => row.armId === "external_supalosa" && row.caseIndex === caseIndex);
        const decorated = rows.find((row) => row.armId === "decorated_noop" && row.caseIndex === caseIndex);
        if (!external || !decorated) throw new Error(`V5 equivalence pair ${caseIndex} missing`);
        const mismatchedFields = fields.filter((field) => JSON.stringify(external[field]) !== JSON.stringify(decorated[field]));
        return { caseIndex, country: external.country, faction: external.faction, candidateStart: external.candidateStart,
            candidateSlot: external.candidateSlot, externalWinner: external.winner, decoratedWinner: decorated.winner,
            scoreDifference: score(decorated.winner) - score(external.winner), mismatchedFields,
            exact: mismatchedFields.length === 0 };
    });
    const mismatches = pairs.filter((pair) => !pair.exact), differences = pairs.map((pair) => pair.scoreDifference);
    const summarizeDifferences = (subset: typeof pairs) => ({ cases: subset.length,
        mean: subset.reduce((total, row) => total + row.scoreDifference, 0) / subset.length,
        improved: subset.filter((row) => row.scoreDifference > 0).length,
        tied: subset.filter((row) => row.scoreDifference === 0).length,
        worsened: subset.filter((row) => row.scoreDifference < 0).length,
        exact: subset.filter((row) => row.exact).length });
    const byCountry = Object.fromEntries(HFO_ADVANCED_V5_COUNTRIES.map((country) =>
        [country, summarizeDifferences(pairs.filter((row) => row.country === country))]));
    const byStart = Object.fromEntries(STARTS.map((start) =>
        [start, summarizeDifferences(pairs.filter((row) => row.candidateStart === start))]));
    const bySlot = Object.fromEntries([0, 1].map((slot) =>
        [String(slot), summarizeDifferences(pairs.filter((row) => row.candidateSlot === slot))]));
    const passed = mismatches.length === 0 && differences.every((value) => value === 0);
    const artifact = { schemaVersion: 1, kind: "hfo-advanced-v5-equivalence-finalizer",
        status: passed ? "PASS_HFO_ADVANCED_V5_EQUIVALENCE" : "FAIL_HFO_ADVANCED_V5_EQUIVALENCE",
        complete: true, passed, schedulerAccount: "pi_jss233", arrayJobId, finalizerJobId: process.env.SLURM_JOB_ID,
        sourceCommit: [...sources][0], programSha256, cellProgramSha256, protocolSha256: inputs.protocolSha256,
        assetManifestSha256: inputs.assetManifestSha256, selectionSha256, baselineCommit: BASELINE_COMMIT,
        ra2webClientCommit: RA2WEB_CLIENT_COMMIT, ra2webClientReleaseId: RA2WEB_CLIENT_RELEASE_ID,
        freezeManifestSha256: RA2WEB_FREEZE_MANIFEST_SHA256, advancedBundleSha256: ADVANCED_SHA256,
        launchedGameCount: rows.length, exactPairCount: pairs.length - mismatches.length,
        mismatchCount: mismatches.length, overall: summarizeDifferences(pairs), byCountry, byStart, bySlot,
        mismatches, schedulerJobIds: [...tasks.values()], pairs, rows };
    fs.mkdirSync(path.dirname(outputPath), { recursive: true, mode: 0o700 });
    fs.writeFileSync(outputPath, JSON.stringify(artifact, null, 2) + "\n", { flag: "wx", mode: 0o600 });
    console.log(JSON.stringify({ status: artifact.status, exactPairCount: artifact.exactPairCount,
        mismatchCount: artifact.mismatchCount, overall: artifact.overall }));
};

const main = async (): Promise<void> => {
    const mode = requiredText("MODE", /^(select|equivalence-cell|equivalence-finalize)$/);
    if (mode === "select") await selectCases();
    else if (mode === "equivalence-cell") await runEquivalenceCell();
    else finalizeEquivalence();
};
const invoked = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (import.meta.url === invoked) main().catch((error) => { console.error(error); process.exitCode = 1; });
