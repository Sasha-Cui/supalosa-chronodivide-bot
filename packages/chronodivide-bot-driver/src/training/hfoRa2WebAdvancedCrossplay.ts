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
import { createDeployedStrongBotCandidate, InspectableDeployedStrongBot } from "./deployedStrongBotCandidate.js";
import { RA2WEB_CLIENT_COMMIT, RA2WEB_CLIENT_RELEASE_ID, RA2WEB_FREEZE_MANIFEST_SHA256,
    createInspectableRa2WebBot, InspectableRa2WebBot, loadRa2WebOpponent } from "./ra2WebOpponentBundle.js";
import { LiteralBuildingEliminationAdjudicator, installLiteralEndpointInstrumentation,
    snapshotCombatantBuildings } from "./literalBuildingEliminationEndpoint.js";

const MAP = { name: "cd_chrono_4_heck_freezes_over_le.map",
    sha256: "e4dfc736a6355e0e68d4681e4d67419516e6bb94549e2d42880c9414e95e2e8d" } as const;
export const HFO_RA2WEB_COUNTRIES = [Countries.USA, Countries.KOREA, Countries.FRANCE, Countries.GERMANY,
    Countries.GREAT_BRITAIN, Countries.LIBYA, Countries.IRAQ, Countries.CUBA, Countries.RUSSIA] as const;
const STARTS = ["39,82", "151,119", "88,34", "88,157"] as const;
type Start = typeof STARTS[number];
const OPPOSITE: Record<Start, Start> = {
    "39,82": "151,119", "151,119": "39,82", "88,34": "88,157", "88,157": "88,34",
};
const ALLIED = new Set<Countries>(HFO_RA2WEB_COUNTRIES.slice(0, 5));
const BASELINE_COMMIT = "165b77a71d0cf5ebd27c65b19d0486bcbae78d0f";
const SHA256 = /^[0-9a-f]{64}$/;
export const HFO_RA2WEB_CROSSPLAY_SPEC = {
    seedBase: 4_261_000_000,
    casesPerCountryStartSlot: 5,
    maxOffsets: 400,
    maxTicks: 90_000,
    countryCount: 9,
    startCount: 4,
    slotCount: 2,
    caseCount: 360,
    armCount: 2,
    taskCount: 720,
    clusterCount: 36,
    clusterTCritical: 1.68957,
    pairedTCritical: 1.64913,
} as const;
type Winner = "first" | "advanced" | "draw";
type ArmId = "candidate_vs_advanced" | "supalosa_vs_advanced";
type CaseSpec = { caseIndex: number; countryOrdinal: number; country: Countries; startOrdinal: number;
    desiredStart: Start; desiredOppositeStart: Start; candidateSlot: 0 | 1; repeatIndex: number;
    seedOffset: number; requestedEngineSeed: number; candidateStart: string; baselineStart: string };

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
const candidateApi = (candidate: InspectableDeployedStrongBot): GameApi => {
    if (!candidate.lastGameApi) throw new Error("Confirmatory candidate API unavailable"); return candidate.lastGameApi;
};
const advancedApi = (advanced: InspectableRa2WebBot): GameApi => {
    if (!advanced.lastGameApi) throw new Error("RA2Web Advanced API unavailable"); return advanced.lastGameApi;
};

const sourceIdentity = () => {
    const repo = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
    const commit = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
    if (execFileSync("git", ["branch", "--show-current"], { encoding: "utf8" }).trim() !== "main" ||
        execFileSync("git", ["status", "--short", "--untracked-files=no"], { encoding: "utf8" }).trim() !== "" ||
        execFileSync("git", ["rev-parse", "fork/main"], { encoding: "utf8" }).trim() !== commit) {
        throw new Error("Confirmatory study requires clean synchronized main");
    }
    return { repo, commit };
};

const commonInputs = () => {
    if (process.env.SLURM_JOB_ACCOUNT !== "pi_jss233") throw new Error("Confirmatory study requires pi_jss233");
    const mixDir = requiredPath("MIX_DIR"), protocolPath = requiredPath("PROTOCOL_PATH");
    const assetManifestPath = requiredPath("ASSET_MANIFEST_PATH");
    const freezeRoot = requiredPath("RA2WEB_FREEZE_ROOT");
    const protocolSha256 = requiredText("PROTOCOL_SHA256", SHA256);
    const assetManifestSha256 = requiredText("ASSET_MANIFEST_SHA256", SHA256);
    if (sha256File(protocolPath) !== protocolSha256 || sha256File(assetManifestPath) !== assetManifestSha256 ||
        sha256File(path.join(mixDir, MAP.name)) !== MAP.sha256) throw new Error("Confirmatory input drifted");
    const manifest = JSON.parse(fs.readFileSync(assetManifestPath, "utf8")) as unknown;
    if (!isRecord(manifest) || manifest.kind !== "private-ra2-snow-runtime" ||
        path.resolve(String(manifest.runtimeDirectory)) !== mixDir) throw new Error("Confirmatory runtime drifted");
    return { mixDir, freezeRoot, protocolSha256, assetManifestSha256 };
};

const settings = (candidate: Bot, baseline: Bot, slot: 0 | 1): CreateOfflineOpts => {
    const gameMode = cdapi.getAvailableGameModes(MAP.name)[0];
    if (!gameMode) throw new Error("Confirmatory game mode unavailable");
    return { buildOffAlly: false, cratesAppear: false, credits: 10_000, gameMode, gameSpeed: 6,
        mapName: MAP.name, mcvRepacks: true, shortGame: false, superWeapons: false, unitCount: 0, online: false,
        agents: slot === 0 ? [candidate, baseline] : [baseline, candidate] };
};

const assertExternalBaseline = (descriptor: unknown): void => {
    if (!isRecord(descriptor) || descriptor.kind !== "external-package" ||
        typeof descriptor.packageRoot !== "string") throw new Error("Confirmatory baseline descriptor drifted");
    const packageRoot = path.resolve(descriptor.packageRoot);
    const repo = execFileSync("git", ["-C", packageRoot, "rev-parse", "--show-toplevel"],
        { encoding: "utf8" }).trim();
    const commit = execFileSync("git", ["-C", repo, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
    const trackedStatus = execFileSync("git", ["-C", repo, "status", "--short", "--untracked-files=no"],
        { encoding: "utf8" }).trim();
    if (commit !== BASELINE_COMMIT || trackedStatus !== "" ||
        packageRoot !== path.join(repo, "packages", "chronodivide-bot")) {
        throw new Error("Confirmatory external baseline drifted");
    }
};

const loadAdvanced = (freezeRoot: string) => {
    const loaded = loadRa2WebOpponent(freezeRoot, "ra2web_advanced_old_priest");
    if (loaded.freezeManifestSha256 !== RA2WEB_FREEZE_MANIFEST_SHA256 ||
        loaded.bundleSha256 !== "81d8797b6dd1371ba2dcbd79e25df8b42254290c820159e121a82650fd97a143" ||
        loaded.descriptor.expectedBuildId !== "ra2web-0.83.1-ai-old-priest-phase258-20260716") {
        throw new Error("RA2Web Advanced identity drifted");
    }
    return loaded;
};

const selectCases = async (): Promise<void> => {
    const outputPath = requiredPath("OUT_PATH"), programPath = requiredPath("PROGRAM_PATH");
    const programSha256 = requiredText("PROGRAM_SHA256", SHA256), inputs = commonInputs();
    if (fs.existsSync(outputPath) || sha256File(programPath) !== programSha256) {
        throw new Error("Confirmatory selection drifted");
    }
    const { repo, commit } = sourceIdentity();
    await cdapi.init(inputs.mixDir);
    const factory = await loadBaselineFactory(path.join(repo, "packages", "chronodivide-bot"));
    assertExternalBaseline(factory.descriptor);
    const advanced = loadAdvanced(inputs.freezeRoot);
    const cases: CaseSpec[] = [];
    let initializedGameCount = 0;
    for (const [countryOrdinal, country] of HFO_RA2WEB_COUNTRIES.entries()) {
        for (const [startOrdinal, desiredStart] of STARTS.entries()) {
            for (const candidateSlot of [0, 1] as const) {
                let selected = 0;
                for (let seedOffset = 0; seedOffset < HFO_RA2WEB_CROSSPLAY_SPEC.maxOffsets &&
                    selected < HFO_RA2WEB_CROSSPLAY_SPEC.casesPerCountryStartSlot; seedOffset += 1) {
                    const requestedEngineSeed = HFO_RA2WEB_CROSSPLAY_SPEC.seedBase + countryOrdinal * 100_000 +
                        startOrdinal * 20_000 + candidateSlot * 10_000 + seedOffset;
                    const candidateName = `ConfirmSelectCandidate_${countryOrdinal}_${startOrdinal}_${candidateSlot}_${seedOffset}`;
                    const baselineName = `ConfirmSelectBaseline_${countryOrdinal}_${startOrdinal}_${candidateSlot}_${seedOffset}`;
                    const candidate = createDeployedStrongBotCandidate(candidateName, country);
                    const baseline = factory.create(baselineName, country);
                    const starts = await withSeededOfflineGame(cdapi, settings(candidate, baseline, candidateSlot),
                        requestedEngineSeed,
                        [{ agent: candidate, identity: "candidate" }, { agent: baseline, identity: "baseline" }],
                        async () => ({ candidateStart: startKey(candidateApi(candidate).getPlayerData(candidateName).startLocation),
                            baselineStart: startKey(candidateApi(candidate).getPlayerData(baselineName).startLocation) }));
                    initializedGameCount += 1;
                    if (starts.candidateStart === desiredStart && starts.baselineStart === OPPOSITE[desiredStart]) {
                        cases.push({ caseIndex: cases.length, countryOrdinal, country, startOrdinal, desiredStart,
                            desiredOppositeStart: OPPOSITE[desiredStart], candidateSlot, repeatIndex: selected,
                            seedOffset, requestedEngineSeed, ...starts });
                        selected += 1;
                    }
                }
                if (selected !== HFO_RA2WEB_CROSSPLAY_SPEC.casesPerCountryStartSlot) {
                    throw new Error(`Confirmatory selection incomplete for ${country} ${desiredStart} slot ${candidateSlot}`);
                }
            }
        }
    }
    const unique = new Set(cases.map((entry) => `${entry.requestedEngineSeed}:${entry.candidateSlot}`));
    const cellCounts = new Map<string, number>();
    for (const entry of cases) {
        const key = `${entry.country}:${entry.desiredStart}:${entry.candidateSlot}`;
        cellCounts.set(key, (cellCounts.get(key) ?? 0) + 1);
    }
    if (cases.length !== HFO_RA2WEB_CROSSPLAY_SPEC.caseCount || unique.size !== cases.length ||
        cellCounts.size !== HFO_RA2WEB_CROSSPLAY_SPEC.countryCount * HFO_RA2WEB_CROSSPLAY_SPEC.startCount *
            HFO_RA2WEB_CROSSPLAY_SPEC.slotCount || [...cellCounts.values()].some((count) =>
            count !== HFO_RA2WEB_CROSSPLAY_SPEC.casesPerCountryStartSlot)) {
        throw new Error("Confirmatory selection coverage drifted");
    }
    const artifact = { schemaVersion: 1, kind: "hfo-ra2web-advanced-crossplay-selection",
        status: "PASS_HFO_RA2WEB_ADVANCED_CROSSPLAY_SELECTION", complete: true, passed: true, outcomeFree: true,
        scheduler: { jobId: process.env.SLURM_JOB_ID, account: "pi_jss233" }, sourceCommit: commit,
        programSha256, protocolSha256: inputs.protocolSha256, assetManifestSha256: inputs.assetManifestSha256,
        baselineCommit: BASELINE_COMMIT, ...HFO_RA2WEB_CROSSPLAY_SPEC, initializedGameCount,
        ra2webClientCommit: RA2WEB_CLIENT_COMMIT, ra2webClientReleaseId: RA2WEB_CLIENT_RELEASE_ID,
        freezeManifestSha256: advanced.freezeManifestSha256, advancedBundleSha256: advanced.bundleSha256,
        selectedCaseCount: cases.length, updateCount: 0, forbiddenOutcomeFields: [], cases };
    fs.mkdirSync(path.dirname(outputPath), { recursive: true, mode: 0o700 });
    fs.writeFileSync(outputPath, JSON.stringify(artifact, null, 2) + "\n", { flag: "wx", mode: 0o600 });
    console.log(JSON.stringify({ status: artifact.status, initializedGameCount, cases: cases.length }));
};

const loadSelection = (selectionPath: string, selectionSha256: string,
    inputs: ReturnType<typeof commonInputs>): CaseSpec[] => {
    if (sha256File(selectionPath) !== selectionSha256) throw new Error("Confirmatory selection hash drifted");
    const selection = JSON.parse(fs.readFileSync(selectionPath, "utf8")) as unknown;
    if (!isRecord(selection) || selection.kind !== "hfo-ra2web-advanced-crossplay-selection" ||
        selection.status !== "PASS_HFO_RA2WEB_ADVANCED_CROSSPLAY_SELECTION" || selection.complete !== true ||
        selection.passed !== true || selection.outcomeFree !== true || selection.updateCount !== 0 ||
        !Array.isArray(selection.forbiddenOutcomeFields) || selection.forbiddenOutcomeFields.length !== 0 ||
        selection.selectedCaseCount !== HFO_RA2WEB_CROSSPLAY_SPEC.caseCount ||
        selection.seedBase !== HFO_RA2WEB_CROSSPLAY_SPEC.seedBase || selection.baselineCommit !== BASELINE_COMMIT ||
        selection.ra2webClientCommit !== RA2WEB_CLIENT_COMMIT ||
        selection.ra2webClientReleaseId !== RA2WEB_CLIENT_RELEASE_ID ||
        selection.freezeManifestSha256 !== RA2WEB_FREEZE_MANIFEST_SHA256 ||
        selection.advancedBundleSha256 !== "81d8797b6dd1371ba2dcbd79e25df8b42254290c820159e121a82650fd97a143" ||
        selection.protocolSha256 !== inputs.protocolSha256 || selection.assetManifestSha256 !== inputs.assetManifestSha256 ||
        !Array.isArray(selection.cases) || selection.cases.length !== HFO_RA2WEB_CROSSPLAY_SPEC.caseCount) {
        throw new Error("Confirmatory selection is ineligible");
    }
    const cases = selection.cases as CaseSpec[];
    const cellCounts = new Map<string, number>();
    for (const entry of cases) {
        if (!STARTS.includes(entry.desiredStart) || entry.baselineStart !== OPPOSITE[entry.desiredStart] ||
            entry.candidateStart !== entry.desiredStart || entry.desiredOppositeStart !== OPPOSITE[entry.desiredStart] ||
            (entry.candidateSlot !== 0 && entry.candidateSlot !== 1)) throw new Error("Confirmatory case drifted");
        const key = `${entry.country}:${entry.desiredStart}:${entry.candidateSlot}`;
        cellCounts.set(key, (cellCounts.get(key) ?? 0) + 1);
    }
    if (cellCounts.size !== HFO_RA2WEB_CROSSPLAY_SPEC.countryCount * HFO_RA2WEB_CROSSPLAY_SPEC.startCount *
        HFO_RA2WEB_CROSSPLAY_SPEC.slotCount || [...cellCounts.values()].some((count) =>
        count !== HFO_RA2WEB_CROSSPLAY_SPEC.casesPerCountryStartSlot)) {
        throw new Error("Confirmatory selection cell balance drifted");
    }
    return cases;
};

const terminalUnitSummary = (game: GameApi, firstName: string, advancedName: string) => {
    const rows = game.getAllUnits().map((id) => game.getUnitData(id)).filter((unit): unit is UnitData => !!unit)
        .filter((unit) => unit.owner === firstName || unit.owner === advancedName);
    const summarize = (owner: string) => {
        const owned = rows.filter((unit) => unit.owner === owner);
        const byName = Object.fromEntries([...new Set(owned.map((unit) => unit.rules.name))].sort()
            .map((name) => [name, owned.filter((unit) => unit.rules.name === name).length]));
        return { total: owned.length, buildings: owned.filter((unit) => unit.rules.type === ObjectType.Building).length,
            nonBuildings: owned.filter((unit) => unit.rules.type !== ObjectType.Building).length, byName };
    };
    return { first: summarize(firstName), advanced: summarize(advancedName) };
};

const runCell = async (): Promise<void> => {
    const taskIndex = Number(requiredText("TASK_INDEX", /^\d+$/)), outputPath = requiredPath("OUT_PATH");
    const programPath = requiredPath("PROGRAM_PATH"), programSha256 = requiredText("PROGRAM_SHA256", SHA256);
    const selectionPath = requiredPath("SELECTION_PATH"), selectionSha256 = requiredText("SELECTION_SHA256", SHA256);
    const inputs = commonInputs();
    if (taskIndex < 0 || taskIndex >= HFO_RA2WEB_CROSSPLAY_SPEC.taskCount ||
        process.env.SLURM_ARRAY_TASK_ID !== String(taskIndex) || fs.existsSync(outputPath) ||
        sha256File(programPath) !== programSha256) throw new Error("RA2Web cross-play cell drifted");
    const cases = loadSelection(selectionPath, selectionSha256, inputs);
    const armIndex = Math.floor(taskIndex / HFO_RA2WEB_CROSSPLAY_SPEC.caseCount);
    const caseIndex = taskIndex % HFO_RA2WEB_CROSSPLAY_SPEC.caseCount;
    const armId: ArmId = armIndex === 0 ? "candidate_vs_advanced" : "supalosa_vs_advanced";
    const caseSpec = cases[caseIndex];
    if (!caseSpec || caseSpec.caseIndex !== caseIndex || armIndex >= HFO_RA2WEB_CROSSPLAY_SPEC.armCount) {
        throw new Error("RA2Web cross-play cell assignment drifted");
    }
    const { repo, commit } = sourceIdentity();
    await cdapi.init(inputs.mixDir);
    const factory = await loadBaselineFactory(path.join(repo, "packages", "chronodivide-bot"));
    assertExternalBaseline(factory.descriptor);
    const loadedAdvanced = loadAdvanced(inputs.freezeRoot);
    const firstName = `CrossplayFirst_${taskIndex}`, advancedName = `CrossplayAdvanced_${taskIndex}`;
    const first = armId === "candidate_vs_advanced"
        ? createDeployedStrongBotCandidate(firstName, caseSpec.country)
        : factory.create(firstName, caseSpec.country);
    const advanced = createInspectableRa2WebBot(loadedAdvanced, advancedName, caseSpec.country);
    const adjudicator = new LiteralBuildingEliminationAdjudicator({ candidate: firstName, baseline: advancedName });
    const { audit } = installLiteralEndpointInstrumentation({ candidate: first, baseline: advanced }, adjudicator);
    const result = await withSeededOfflineGame(cdapi, settings(first, advanced, caseSpec.candidateSlot),
        caseSpec.requestedEngineSeed,
        [{ agent: first, identity: "first" }, { agent: advanced, identity: "advanced" }], async (game) => {
            const gameApi = armId === "candidate_vs_advanced"
                ? candidateApi(first as InspectableDeployedStrongBot) : advancedApi(advanced);
            if (startKey(gameApi.getPlayerData(firstName).startLocation) !== caseSpec.desiredStart ||
                startKey(gameApi.getPlayerData(advancedName).startLocation) !== caseSpec.desiredOppositeStart) {
                throw new Error("RA2Web cross-play selected start drifted");
            }
            let ticks = 0, terminal: any = null, failure: any = null;
            while (ticks < HFO_RA2WEB_CROSSPLAY_SPEC.maxTicks && !terminal && !failure) {
                adjudicator.beginUpdate(gameApi); await game.update(); ticks += 1;
                const stats = game.getPlayerStats(), firstStats = stats.find((row) => row.name === firstName);
                const advancedStats = stats.find((row) => row.name === advancedName);
                if (!firstStats || !advancedStats) throw new Error("RA2Web cross-play statistics unavailable");
                const endpoint = adjudicator.completeUpdate(gameApi, { finished: game.isFinished(), defeated: {
                    candidate: firstStats.defeated, baseline: advancedStats.defeated } });
                terminal = endpoint.terminal; failure = endpoint.technicalFailure;
            }
            if (failure) throw new Error(`RA2Web cross-play endpoint failure ${JSON.stringify(failure)}`);
            if (audit.forwarded.candidate !== 0 || audit.forwarded.baseline !== 0) {
                throw new Error("RA2Web cross-play resignation forwarded");
            }
            const buildings = snapshotCombatantBuildings(gameApi, { candidate: firstName, baseline: advancedName });
            const winner: Winner = terminal?.winner === "candidate" ? "first" :
                terminal?.winner === "baseline" ? "advanced" : "draw";
            return { taskIndex, armIndex, armId, caseIndex, country: caseSpec.country,
                faction: ALLIED.has(caseSpec.country) ? "Allied" : "Soviet", candidateSlot: caseSpec.candidateSlot,
                requestedEngineSeed: caseSpec.requestedEngineSeed, candidateStart: caseSpec.desiredStart,
                advancedStart: caseSpec.desiredOppositeStart, ticks, maxTicks: HFO_RA2WEB_CROSSPLAY_SPEC.maxTicks,
                status: terminal?.status ?? "tick_cap_draw", winner,
                terminalBuildingCounts: { first: buildings.filter((row) => row.owner === firstName).length,
                    advanced: buildings.filter((row) => row.owner === advancedName).length },
                terminalUnits: terminalUnitSummary(gameApi, firstName, advancedName), quitAttempts: { ...audit.attempts } };
        });
    const provenance = createExperimentManifest({ runId: `hfo-ra2web-${taskIndex}-${process.env.SLURM_JOB_ID}`,
        mixDir: inputs.mixDir, maps: [MAP.name], effectiveConfig: { taskIndex, armIndex, armId, caseSpec,
            selectionSha256, maxTicks: HFO_RA2WEB_CROSSPLAY_SPEC.maxTicks,
            advancedBundleSha256: loadedAdvanced.bundleSha256 }, baseline: factory.descriptor,
        gameSeedBase: caseSpec.requestedEngineSeed });
    const artifact = { schemaVersion: 1, kind: "hfo-ra2web-advanced-crossplay-cell",
        status: "COMPLETE_HFO_RA2WEB_ADVANCED_CROSSPLAY_CELL", complete: true, taskIndex, armIndex, armId, caseIndex,
        schedulerAccount: "pi_jss233", schedulerJobId: process.env.SLURM_JOB_ID, sourceCommit: commit,
        programSha256, protocolSha256: inputs.protocolSha256, assetManifestSha256: inputs.assetManifestSha256,
        selectionSha256, baselineCommit: BASELINE_COMMIT, ra2webClientCommit: RA2WEB_CLIENT_COMMIT,
        ra2webClientReleaseId: RA2WEB_CLIENT_RELEASE_ID, freezeManifestSha256: loadedAdvanced.freezeManifestSha256,
        advancedBundleSha256: loadedAdvanced.bundleSha256, result, provenance };
    fs.mkdirSync(path.dirname(outputPath), { recursive: true, mode: 0o700 });
    fs.writeFileSync(outputPath, JSON.stringify(artifact, null, 2) + "\n", { flag: "wx", mode: 0o600 });
    console.log(JSON.stringify({ status: artifact.status, taskIndex, armId, caseIndex }));
};

const wilsonLower = (wins: number, games: number): number => {
    const z = 1.6448536269514722, probability = wins / games, zSquared = z * z;
    return (probability + zSquared / (2 * games) -
        z * Math.sqrt(probability * (1 - probability) / games + zSquared / (4 * games * games))) /
        (1 + zSquared / games);
};
const sampleStandardDeviation = (values: number[]): number => {
    const mean = values.reduce((total, value) => total + value, 0) / values.length;
    return Math.sqrt(values.reduce((total, value) => total + (value - mean) ** 2, 0) / (values.length - 1));
};
const summarize = (rows: any[]) => {
    const wins = rows.filter((row) => row.winner === "first").length;
    const losses = rows.filter((row) => row.winner === "advanced").length;
    const draws = rows.length - wins - losses, ticks = rows.map((row) => row.ticks).sort((a, b) => a - b);
    const center = Math.floor(ticks.length / 2);
    const statuses = Object.fromEntries([...new Set(rows.map((row) => row.status))].sort()
        .map((status) => [status, rows.filter((row) => row.status === status).length]));
    return { games: rows.length, wins, draws, losses, winRate: wins / rows.length,
        lossRate: losses / rows.length, oneSided95WilsonLower: wilsonLower(wins, rows.length),
        medianTicks: ticks.length % 2 ? ticks[center] : (ticks[center - 1] + ticks[center]) / 2, statuses };
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
    const cellProgramSha256 = process.env.CELL_PROGRAM_SHA256
        ? requiredText("CELL_PROGRAM_SHA256", SHA256) : programSha256;
    if (fs.existsSync(outputPath)) throw new Error("RA2Web cross-play finalizer output exists");
    const loadedAdvanced = loadAdvanced(inputs.freezeRoot);
    let tasks = new Map<number, string>();
    for (let attempt = 0; attempt < 31; attempt += 1) {
        tasks = completedTasks(arrayJobId); if (tasks.size === HFO_RA2WEB_CROSSPLAY_SPEC.taskCount) break;
        if (attempt < 30) execFileSync("sleep", ["2"]);
    }
    if (tasks.size !== HFO_RA2WEB_CROSSPLAY_SPEC.taskCount) {
        throw new Error(`Only ${tasks.size}/${HFO_RA2WEB_CROSSPLAY_SPEC.taskCount} cross-play tasks complete`);
    }
    const rows: any[] = [], sources = new Set<string>();
    for (let taskIndex = 0; taskIndex < HFO_RA2WEB_CROSSPLAY_SPEC.taskCount; taskIndex += 1) {
        const cell = JSON.parse(fs.readFileSync(path.join(root,
            `task-${String(taskIndex).padStart(3, "0")}`, "cell.json"), "utf8"));
        const expectedArmIndex = Math.floor(taskIndex / HFO_RA2WEB_CROSSPLAY_SPEC.caseCount);
        const expectedArmId: ArmId = expectedArmIndex === 0 ? "candidate_vs_advanced" : "supalosa_vs_advanced";
        const expectedCaseIndex = taskIndex % HFO_RA2WEB_CROSSPLAY_SPEC.caseCount;
        if (cell.kind !== "hfo-ra2web-advanced-crossplay-cell" ||
            cell.status !== "COMPLETE_HFO_RA2WEB_ADVANCED_CROSSPLAY_CELL" || cell.complete !== true ||
            cell.taskIndex !== taskIndex || cell.armIndex !== expectedArmIndex || cell.armId !== expectedArmId ||
            cell.caseIndex !== expectedCaseIndex || String(cell.schedulerJobId) !== tasks.get(taskIndex) ||
            cell.programSha256 !== cellProgramSha256 || cell.protocolSha256 !== inputs.protocolSha256 ||
            cell.assetManifestSha256 !== inputs.assetManifestSha256 || cell.selectionSha256 !== selectionSha256 ||
            cell.baselineCommit !== BASELINE_COMMIT || cell.ra2webClientCommit !== RA2WEB_CLIENT_COMMIT ||
            cell.freezeManifestSha256 !== RA2WEB_FREEZE_MANIFEST_SHA256 ||
            cell.advancedBundleSha256 !== loadedAdvanced.bundleSha256) {
            throw new Error(`RA2Web cross-play cell ${taskIndex} drifted`);
        }
        sources.add(cell.sourceCommit); rows.push(cell.result);
    }
    const candidateRows = rows.filter((row) => row.armId === "candidate_vs_advanced");
    const supalosaRows = rows.filter((row) => row.armId === "supalosa_vs_advanced");
    if (rows.length !== HFO_RA2WEB_CROSSPLAY_SPEC.taskCount ||
        candidateRows.length !== HFO_RA2WEB_CROSSPLAY_SPEC.caseCount ||
        supalosaRows.length !== HFO_RA2WEB_CROSSPLAY_SPEC.caseCount || sources.size !== 1) {
        throw new Error("RA2Web cross-play aggregate coverage drifted");
    }
    const analyzeArm = (armRows: any[]) => {
        const overall = summarize(armRows);
        const byCountry = Object.fromEntries(HFO_RA2WEB_COUNTRIES.map((country) =>
            [country, summarize(armRows.filter((row) => row.country === country))]));
        const byStart = Object.fromEntries(STARTS.map((start) =>
            [start, summarize(armRows.filter((row) => row.candidateStart === start))]));
        const byFaction = Object.fromEntries(["Allied", "Soviet"].map((faction) =>
            [faction, summarize(armRows.filter((row) => row.faction === faction))]));
        const bySlot = Object.fromEntries([0, 1].map((slot) =>
            [String(slot), summarize(armRows.filter((row) => row.candidateSlot === slot))]));
        const cellSummaries = HFO_RA2WEB_COUNTRIES.flatMap((country) => STARTS.map((start) => ({ country, start,
            ...summarize(armRows.filter((row) => row.country === country && row.candidateStart === start)) })));
        const clusterRates = cellSummaries.map((entry) => entry.winRate);
        const clusterMean = clusterRates.reduce((total, value) => total + value, 0) / clusterRates.length;
        const clusterStandardDeviation = sampleStandardDeviation(clusterRates);
        const clusterLower = clusterMean - HFO_RA2WEB_CROSSPLAY_SPEC.clusterTCritical *
            clusterStandardDeviation / Math.sqrt(clusterRates.length);
        return { overall, byCountry, byStart, byFaction, bySlot, cellSummaries,
            clustered: { clusterCount: clusterRates.length, meanWinRate: clusterMean,
                sampleStandardDeviation: clusterStandardDeviation,
                tCritical: HFO_RA2WEB_CROSSPLAY_SPEC.clusterTCritical, degreesOfFreedom: clusterRates.length - 1,
                oneSided95Lower: clusterLower } };
    };
    const candidate = analyzeArm(candidateRows), supalosa = analyzeArm(supalosaRows);
    const score = (winner: Winner): number => winner === "first" ? 1 : winner === "draw" ? 0.5 : 0;
    const paired = candidateRows.map((row) => score(row.winner) -
        score(supalosaRows.find((entry) => entry.caseIndex === row.caseIndex)?.winner ?? "draw"));
    const pairedMean = paired.reduce((total, value) => total + value, 0) / paired.length;
    const pairedStandardDeviation = sampleStandardDeviation(paired);
    const pairedLower = pairedMean - HFO_RA2WEB_CROSSPLAY_SPEC.pairedTCritical *
        pairedStandardDeviation / Math.sqrt(paired.length);
    const pairedComparison = { meanScoreDifference: pairedMean, sampleStandardDeviation: pairedStandardDeviation,
        tCritical: HFO_RA2WEB_CROSSPLAY_SPEC.pairedTCritical, degreesOfFreedom: paired.length - 1,
        oneSided95Lower: pairedLower, improved: paired.filter((value) => value > 0).length,
        tied: paired.filter((value) => value === 0).length, worsened: paired.filter((value) => value < 0).length };
    const countryWilsonPassCount = Object.values(candidate.byCountry)
        .filter((entry: any) => entry.oneSided95WilsonLower > 0.5).length;
    const superiorCellCount = candidate.cellSummaries.filter((entry) => entry.wins > entry.losses).length;
    const noninferiorCellCount = candidate.cellSummaries.filter((entry) => entry.wins >= entry.losses).length;
    const checks = {
        completeCoverage: rows.length === HFO_RA2WEB_CROSSPLAY_SPEC.taskCount,
        candidateWinsExceedLosses: candidate.overall.wins > candidate.overall.losses,
        candidateWilsonLowerAboveHalf: candidate.overall.oneSided95WilsonLower > 0.5,
        candidateClusterLowerAboveHalf: candidate.clustered.oneSided95Lower > 0.5,
        everyStartWilsonLowerAboveHalf: Object.values(candidate.byStart)
            .every((entry: any) => entry.oneSided95WilsonLower > 0.5),
        bothFactionsWilsonLowerAboveHalf: Object.values(candidate.byFaction)
            .every((entry: any) => entry.oneSided95WilsonLower > 0.5),
        bothSlotsWilsonLowerAboveHalf: Object.values(candidate.bySlot)
            .every((entry: any) => entry.oneSided95WilsonLower > 0.5),
        everyCountryWinsExceedLosses: Object.values(candidate.byCountry).every((entry: any) => entry.wins > entry.losses),
        sevenCountryWilsonBoundsAboveHalf: countryWilsonPassCount >= 7,
        noInferiorCell: noninferiorCellCount === HFO_RA2WEB_CROSSPLAY_SPEC.clusterCount,
        thirtySuperiorCells: superiorCellCount >= 30,
        pairedLowerPositive: pairedLower > 0,
    };
    const passed = Object.values(checks).every(Boolean);
    const artifact = { schemaVersion: 1, kind: "hfo-ra2web-advanced-crossplay-finalizer",
        status: passed ? "PASS_HFO_RA2WEB_ADVANCED_CROSSPLAY" : "FAIL_HFO_RA2WEB_ADVANCED_CROSSPLAY",
        complete: true, passed, schedulerAccount: "pi_jss233", arrayJobId,
        finalizerJobId: process.env.SLURM_JOB_ID, sourceCommit: [...sources][0], programSha256,
        cellProgramSha256, protocolSha256: inputs.protocolSha256, assetManifestSha256: inputs.assetManifestSha256,
        selectionSha256, baselineCommit: BASELINE_COMMIT, ra2webClientCommit: RA2WEB_CLIENT_COMMIT,
        ra2webClientReleaseId: RA2WEB_CLIENT_RELEASE_ID, freezeManifestSha256: loadedAdvanced.freezeManifestSha256,
        advancedBundleSha256: loadedAdvanced.bundleSha256, launchedGameCount: rows.length,
        candidateVsAdvanced: candidate, supalosaVsAdvanced: supalosa, pairedComparison,
        countryWilsonPassCount, superiorCellCount, noninferiorCellCount, checks,
        schedulerJobIds: [...tasks.values()], rows };
    fs.mkdirSync(path.dirname(outputPath), { recursive: true, mode: 0o700 });
    fs.writeFileSync(outputPath, JSON.stringify(artifact, null, 2) + "\n", { flag: "wx", mode: 0o600 });
    console.log(JSON.stringify({ status: artifact.status, candidate: candidate.overall,
        supalosa: supalosa.overall, pairedComparison, checks }));
};

const main = async (): Promise<void> => {
    const mode = requiredText("MODE", /^(select|cell|finalize)$/);
    if (mode === "select") await selectCases(); else if (mode === "cell") await runCell(); else finalize();
};
const invoked = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (import.meta.url === invoked) main().catch((error) => { console.error(error); process.exitCode = 1; });
