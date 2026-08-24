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
import { LiteralBuildingEliminationAdjudicator, installLiteralEndpointInstrumentation,
    snapshotCombatantBuildings } from "./literalBuildingEliminationEndpoint.js";

const MAP = { name: "cd_chrono_4_heck_freezes_over_le.map",
    sha256: "e4dfc736a6355e0e68d4681e4d67419516e6bb94549e2d42880c9414e95e2e8d" } as const;
export const HFO_CONFIRMATORY_COUNTRIES = [Countries.USA, Countries.KOREA, Countries.FRANCE, Countries.GERMANY,
    Countries.GREAT_BRITAIN, Countries.LIBYA, Countries.IRAQ, Countries.CUBA, Countries.RUSSIA] as const;
const STARTS = ["39,82", "151,119", "88,34", "88,157"] as const;
type Start = typeof STARTS[number];
const OPPOSITE: Record<Start, Start> = {
    "39,82": "151,119", "151,119": "39,82", "88,34": "88,157", "88,157": "88,34",
};
const ALLIED = new Set<Countries>(HFO_CONFIRMATORY_COUNTRIES.slice(0, 5));
const BASELINE_COMMIT = "165b77a71d0cf5ebd27c65b19d0486bcbae78d0f";
const SHA256 = /^[0-9a-f]{64}$/;
export const HFO_DEPLOYED_CONFIRMATORY_SPEC = {
    seedBase: 4_260_000_000,
    casesPerCountryStartSlot: 10,
    maxOffsets: 400,
    maxTicks: 90_000,
    countryCount: 9,
    startCount: 4,
    slotCount: 2,
    caseCount: 720,
    clusterCount: 36,
    clusterTCritical: 1.68957,
} as const;
type Winner = "candidate" | "baseline" | "draw";
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
    const protocolSha256 = requiredText("PROTOCOL_SHA256", SHA256);
    const assetManifestSha256 = requiredText("ASSET_MANIFEST_SHA256", SHA256);
    if (sha256File(protocolPath) !== protocolSha256 || sha256File(assetManifestPath) !== assetManifestSha256 ||
        sha256File(path.join(mixDir, MAP.name)) !== MAP.sha256) throw new Error("Confirmatory input drifted");
    const manifest = JSON.parse(fs.readFileSync(assetManifestPath, "utf8")) as unknown;
    if (!isRecord(manifest) || manifest.kind !== "private-ra2-snow-runtime" ||
        path.resolve(String(manifest.runtimeDirectory)) !== mixDir) throw new Error("Confirmatory runtime drifted");
    return { mixDir, protocolSha256, assetManifestSha256 };
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
    const cases: CaseSpec[] = [];
    let initializedGameCount = 0;
    for (const [countryOrdinal, country] of HFO_CONFIRMATORY_COUNTRIES.entries()) {
        for (const [startOrdinal, desiredStart] of STARTS.entries()) {
            for (const candidateSlot of [0, 1] as const) {
                let selected = 0;
                for (let seedOffset = 0; seedOffset < HFO_DEPLOYED_CONFIRMATORY_SPEC.maxOffsets &&
                    selected < HFO_DEPLOYED_CONFIRMATORY_SPEC.casesPerCountryStartSlot; seedOffset += 1) {
                    const requestedEngineSeed = HFO_DEPLOYED_CONFIRMATORY_SPEC.seedBase + countryOrdinal * 100_000 +
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
                if (selected !== HFO_DEPLOYED_CONFIRMATORY_SPEC.casesPerCountryStartSlot) {
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
    if (cases.length !== HFO_DEPLOYED_CONFIRMATORY_SPEC.caseCount || unique.size !== cases.length ||
        cellCounts.size !== HFO_DEPLOYED_CONFIRMATORY_SPEC.countryCount * HFO_DEPLOYED_CONFIRMATORY_SPEC.startCount *
            HFO_DEPLOYED_CONFIRMATORY_SPEC.slotCount || [...cellCounts.values()].some((count) =>
            count !== HFO_DEPLOYED_CONFIRMATORY_SPEC.casesPerCountryStartSlot)) {
        throw new Error("Confirmatory selection coverage drifted");
    }
    const artifact = { schemaVersion: 1, kind: "hfo-deployed-confirmatory-selection",
        status: "PASS_HFO_DEPLOYED_CONFIRMATORY_SELECTION", complete: true, passed: true, outcomeFree: true,
        scheduler: { jobId: process.env.SLURM_JOB_ID, account: "pi_jss233" }, sourceCommit: commit,
        programSha256, protocolSha256: inputs.protocolSha256, assetManifestSha256: inputs.assetManifestSha256,
        baselineCommit: BASELINE_COMMIT, ...HFO_DEPLOYED_CONFIRMATORY_SPEC, initializedGameCount,
        selectedCaseCount: cases.length, updateCount: 0, forbiddenOutcomeFields: [], cases };
    fs.mkdirSync(path.dirname(outputPath), { recursive: true, mode: 0o700 });
    fs.writeFileSync(outputPath, JSON.stringify(artifact, null, 2) + "\n", { flag: "wx", mode: 0o600 });
    console.log(JSON.stringify({ status: artifact.status, initializedGameCount, cases: cases.length }));
};

const loadSelection = (selectionPath: string, selectionSha256: string,
    inputs: ReturnType<typeof commonInputs>): CaseSpec[] => {
    if (sha256File(selectionPath) !== selectionSha256) throw new Error("Confirmatory selection hash drifted");
    const selection = JSON.parse(fs.readFileSync(selectionPath, "utf8")) as unknown;
    if (!isRecord(selection) || selection.kind !== "hfo-deployed-confirmatory-selection" ||
        selection.status !== "PASS_HFO_DEPLOYED_CONFIRMATORY_SELECTION" || selection.complete !== true ||
        selection.passed !== true || selection.outcomeFree !== true || selection.updateCount !== 0 ||
        !Array.isArray(selection.forbiddenOutcomeFields) || selection.forbiddenOutcomeFields.length !== 0 ||
        selection.selectedCaseCount !== HFO_DEPLOYED_CONFIRMATORY_SPEC.caseCount ||
        selection.seedBase !== HFO_DEPLOYED_CONFIRMATORY_SPEC.seedBase || selection.baselineCommit !== BASELINE_COMMIT ||
        selection.protocolSha256 !== inputs.protocolSha256 || selection.assetManifestSha256 !== inputs.assetManifestSha256 ||
        !Array.isArray(selection.cases) || selection.cases.length !== HFO_DEPLOYED_CONFIRMATORY_SPEC.caseCount) {
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
    if (cellCounts.size !== HFO_DEPLOYED_CONFIRMATORY_SPEC.countryCount * HFO_DEPLOYED_CONFIRMATORY_SPEC.startCount *
        HFO_DEPLOYED_CONFIRMATORY_SPEC.slotCount || [...cellCounts.values()].some((count) =>
        count !== HFO_DEPLOYED_CONFIRMATORY_SPEC.casesPerCountryStartSlot)) {
        throw new Error("Confirmatory selection cell balance drifted");
    }
    return cases;
};

const terminalUnitSummary = (game: GameApi, candidateName: string, baselineName: string) => {
    const rows = game.getAllUnits().map((id) => game.getUnitData(id)).filter((unit): unit is UnitData => !!unit)
        .filter((unit) => unit.owner === candidateName || unit.owner === baselineName);
    const summarize = (owner: string) => {
        const owned = rows.filter((unit) => unit.owner === owner);
        const byName = Object.fromEntries([...new Set(owned.map((unit) => unit.rules.name))].sort()
            .map((name) => [name, owned.filter((unit) => unit.rules.name === name).length]));
        return { total: owned.length, buildings: owned.filter((unit) => unit.rules.type === ObjectType.Building).length,
            nonBuildings: owned.filter((unit) => unit.rules.type !== ObjectType.Building).length, byName };
    };
    return { candidate: summarize(candidateName), baseline: summarize(baselineName) };
};

const runCell = async (): Promise<void> => {
    const taskIndex = Number(requiredText("TASK_INDEX", /^\d+$/)), outputPath = requiredPath("OUT_PATH");
    const programPath = requiredPath("PROGRAM_PATH"), programSha256 = requiredText("PROGRAM_SHA256", SHA256);
    const selectionPath = requiredPath("SELECTION_PATH"), selectionSha256 = requiredText("SELECTION_SHA256", SHA256);
    const inputs = commonInputs();
    if (taskIndex < 0 || taskIndex >= HFO_DEPLOYED_CONFIRMATORY_SPEC.caseCount ||
        process.env.SLURM_ARRAY_TASK_ID !== String(taskIndex) || fs.existsSync(outputPath) ||
        sha256File(programPath) !== programSha256) throw new Error("Confirmatory cell drifted");
    const cases = loadSelection(selectionPath, selectionSha256, inputs), caseSpec = cases[taskIndex];
    if (!caseSpec || caseSpec.caseIndex !== taskIndex) throw new Error("Confirmatory cell assignment drifted");
    const { repo, commit } = sourceIdentity();
    await cdapi.init(inputs.mixDir);
    const factory = await loadBaselineFactory(path.join(repo, "packages", "chronodivide-bot"));
    assertExternalBaseline(factory.descriptor);
    const candidateName = `ConfirmCandidate_${taskIndex}`, baselineName = `ConfirmBaseline_${taskIndex}`;
    const candidate = createDeployedStrongBotCandidate(candidateName, caseSpec.country);
    const baseline = factory.create(baselineName, caseSpec.country);
    const adjudicator = new LiteralBuildingEliminationAdjudicator({ candidate: candidateName, baseline: baselineName });
    const { audit } = installLiteralEndpointInstrumentation({ candidate, baseline }, adjudicator);
    const result = await withSeededOfflineGame(cdapi, settings(candidate, baseline, caseSpec.candidateSlot),
        caseSpec.requestedEngineSeed,
        [{ agent: candidate, identity: "candidate" }, { agent: baseline, identity: "baseline" }], async (game) => {
            const gameApi = candidateApi(candidate);
            if (startKey(gameApi.getPlayerData(candidateName).startLocation) !== caseSpec.desiredStart ||
                startKey(gameApi.getPlayerData(baselineName).startLocation) !== caseSpec.desiredOppositeStart) {
                throw new Error("Confirmatory selected start drifted");
            }
            let ticks = 0, terminal: any = null, failure: any = null;
            while (ticks < HFO_DEPLOYED_CONFIRMATORY_SPEC.maxTicks && !terminal && !failure) {
                adjudicator.beginUpdate(gameApi); await game.update(); ticks += 1;
                const stats = game.getPlayerStats(), candidateStats = stats.find((row) => row.name === candidateName);
                const baselineStats = stats.find((row) => row.name === baselineName);
                if (!candidateStats || !baselineStats) throw new Error("Confirmatory statistics unavailable");
                const endpoint = adjudicator.completeUpdate(gameApi, { finished: game.isFinished(), defeated: {
                    candidate: candidateStats.defeated, baseline: baselineStats.defeated } });
                terminal = endpoint.terminal; failure = endpoint.technicalFailure;
            }
            if (failure) throw new Error(`Confirmatory endpoint failure ${JSON.stringify(failure)}`);
            if (audit.forwarded.candidate !== 0 || audit.forwarded.baseline !== 0) {
                throw new Error("Confirmatory resignation forwarded");
            }
            const buildings = snapshotCombatantBuildings(gameApi, { candidate: candidateName, baseline: baselineName });
            const winner: Winner = terminal?.winner ?? "draw";
            return { taskIndex, caseIndex: caseSpec.caseIndex, country: caseSpec.country,
                faction: ALLIED.has(caseSpec.country) ? "Allied" : "Soviet", candidateSlot: caseSpec.candidateSlot,
                requestedEngineSeed: caseSpec.requestedEngineSeed, candidateStart: caseSpec.desiredStart,
                baselineStart: caseSpec.desiredOppositeStart, ticks, maxTicks: HFO_DEPLOYED_CONFIRMATORY_SPEC.maxTicks,
                status: terminal?.status ?? "tick_cap_draw", winner,
                terminalBuildingCounts: { candidate: buildings.filter((row) => row.owner === candidateName).length,
                    baseline: buildings.filter((row) => row.owner === baselineName).length },
                terminalUnits: terminalUnitSummary(gameApi, candidateName, baselineName), quitAttempts: { ...audit.attempts } };
        });
    const provenance = createExperimentManifest({ runId: `hfo-confirmatory-${taskIndex}-${process.env.SLURM_JOB_ID}`,
        mixDir: inputs.mixDir, maps: [MAP.name], effectiveConfig: { taskIndex, caseSpec, selectionSha256,
            maxTicks: HFO_DEPLOYED_CONFIRMATORY_SPEC.maxTicks, candidateOptions: "deployed-defaults" },
        baseline: factory.descriptor, gameSeedBase: caseSpec.requestedEngineSeed });
    const artifact = { schemaVersion: 1, kind: "hfo-deployed-confirmatory-cell",
        status: "COMPLETE_HFO_DEPLOYED_CONFIRMATORY_CELL", complete: true, taskIndex,
        schedulerAccount: "pi_jss233", schedulerJobId: process.env.SLURM_JOB_ID, sourceCommit: commit,
        programSha256, protocolSha256: inputs.protocolSha256, assetManifestSha256: inputs.assetManifestSha256,
        selectionSha256, baselineCommit: BASELINE_COMMIT, result, provenance };
    fs.mkdirSync(path.dirname(outputPath), { recursive: true, mode: 0o700 });
    fs.writeFileSync(outputPath, JSON.stringify(artifact, null, 2) + "\n", { flag: "wx", mode: 0o600 });
    console.log(JSON.stringify({ status: artifact.status, taskIndex }));
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
    const wins = rows.filter((row) => row.winner === "candidate").length;
    const losses = rows.filter((row) => row.winner === "baseline").length;
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
    if (fs.existsSync(outputPath)) throw new Error("Confirmatory finalizer output exists");
    let tasks = new Map<number, string>();
    for (let attempt = 0; attempt < 31; attempt += 1) {
        tasks = completedTasks(arrayJobId); if (tasks.size === HFO_DEPLOYED_CONFIRMATORY_SPEC.caseCount) break;
        if (attempt < 30) execFileSync("sleep", ["2"]);
    }
    if (tasks.size !== HFO_DEPLOYED_CONFIRMATORY_SPEC.caseCount) {
        throw new Error(`Only ${tasks.size}/${HFO_DEPLOYED_CONFIRMATORY_SPEC.caseCount} confirmatory tasks complete`);
    }
    const rows: any[] = [], sources = new Set<string>();
    for (let taskIndex = 0; taskIndex < HFO_DEPLOYED_CONFIRMATORY_SPEC.caseCount; taskIndex += 1) {
        const cell = JSON.parse(fs.readFileSync(path.join(root,
            `task-${String(taskIndex).padStart(3, "0")}`, "cell.json"), "utf8"));
        if (cell.kind !== "hfo-deployed-confirmatory-cell" ||
            cell.status !== "COMPLETE_HFO_DEPLOYED_CONFIRMATORY_CELL" || cell.complete !== true ||
            cell.taskIndex !== taskIndex || String(cell.schedulerJobId) !== tasks.get(taskIndex) ||
            cell.programSha256 !== cellProgramSha256 || cell.protocolSha256 !== inputs.protocolSha256 ||
            cell.assetManifestSha256 !== inputs.assetManifestSha256 || cell.selectionSha256 !== selectionSha256 ||
            cell.baselineCommit !== BASELINE_COMMIT) throw new Error(`Confirmatory cell ${taskIndex} drifted`);
        sources.add(cell.sourceCommit); rows.push(cell.result);
    }
    if (rows.length !== HFO_DEPLOYED_CONFIRMATORY_SPEC.caseCount || sources.size !== 1) {
        throw new Error("Confirmatory aggregate coverage drifted");
    }
    const overall = summarize(rows);
    const byCountry = Object.fromEntries(HFO_CONFIRMATORY_COUNTRIES.map((country) =>
        [country, summarize(rows.filter((row) => row.country === country))]));
    const byStart = Object.fromEntries(STARTS.map((start) =>
        [start, summarize(rows.filter((row) => row.candidateStart === start))]));
    const byFaction = Object.fromEntries(["Allied", "Soviet"].map((faction) =>
        [faction, summarize(rows.filter((row) => row.faction === faction))]));
    const bySlot = Object.fromEntries([0, 1].map((slot) =>
        [String(slot), summarize(rows.filter((row) => row.candidateSlot === slot))]));
    const cellSummaries = HFO_CONFIRMATORY_COUNTRIES.flatMap((country) => STARTS.map((start) => ({ country, start,
        ...summarize(rows.filter((row) => row.country === country && row.candidateStart === start)) })));
    const clusterRates = cellSummaries.map((entry) => entry.winRate);
    const clusterMean = clusterRates.reduce((total, value) => total + value, 0) / clusterRates.length;
    const clusterStandardDeviation = sampleStandardDeviation(clusterRates);
    const clusterLower = clusterMean - HFO_DEPLOYED_CONFIRMATORY_SPEC.clusterTCritical *
        clusterStandardDeviation / Math.sqrt(clusterRates.length);
    const countryWilsonPassCount = Object.values(byCountry)
        .filter((entry: any) => entry.oneSided95WilsonLower > 0.5).length;
    const superiorCellCount = cellSummaries.filter((entry) => entry.wins > entry.losses).length;
    const noninferiorCellCount = cellSummaries.filter((entry) => entry.wins >= entry.losses).length;
    const checks = {
        completeCoverage: rows.length === HFO_DEPLOYED_CONFIRMATORY_SPEC.caseCount,
        pooledWinsExceedLosses: overall.wins > overall.losses,
        pooledWilsonLowerAboveHalf: overall.oneSided95WilsonLower > 0.5,
        clusterLowerAboveHalf: clusterLower > 0.5,
        everyStartWilsonLowerAboveHalf: Object.values(byStart)
            .every((entry: any) => entry.oneSided95WilsonLower > 0.5),
        bothFactionsWilsonLowerAboveHalf: Object.values(byFaction)
            .every((entry: any) => entry.oneSided95WilsonLower > 0.5),
        bothSlotsWilsonLowerAboveHalf: Object.values(bySlot)
            .every((entry: any) => entry.oneSided95WilsonLower > 0.5),
        everyCountryWinsExceedLosses: Object.values(byCountry).every((entry: any) => entry.wins > entry.losses),
        sevenCountryWilsonBoundsAboveHalf: countryWilsonPassCount >= 7,
        noInferiorCell: noninferiorCellCount === HFO_DEPLOYED_CONFIRMATORY_SPEC.clusterCount,
        thirtySuperiorCells: superiorCellCount >= 30,
    };
    const passed = Object.values(checks).every(Boolean);
    const artifact = { schemaVersion: 1, kind: "hfo-deployed-confirmatory-finalizer",
        status: passed ? "PASS_HFO_DEPLOYED_CONFIRMATORY" : "FAIL_HFO_DEPLOYED_CONFIRMATORY",
        complete: true, passed, schedulerAccount: "pi_jss233", arrayJobId,
        finalizerJobId: process.env.SLURM_JOB_ID, sourceCommit: [...sources][0], programSha256,
        cellProgramSha256, protocolSha256: inputs.protocolSha256, assetManifestSha256: inputs.assetManifestSha256,
        selectionSha256, baselineCommit: BASELINE_COMMIT, launchedGameCount: rows.length, overall,
        clustered: { clusterCount: clusterRates.length, meanWinRate: clusterMean, sampleStandardDeviation: clusterStandardDeviation,
            tCritical: HFO_DEPLOYED_CONFIRMATORY_SPEC.clusterTCritical, degreesOfFreedom: clusterRates.length - 1,
            oneSided95Lower: clusterLower },
        byCountry, byStart, byFaction, bySlot, cellSummaries, countryWilsonPassCount,
        superiorCellCount, noninferiorCellCount, checks, schedulerJobIds: [...tasks.values()], rows };
    fs.mkdirSync(path.dirname(outputPath), { recursive: true, mode: 0o700 });
    fs.writeFileSync(outputPath, JSON.stringify(artifact, null, 2) + "\n", { flag: "wx", mode: 0o600 });
    console.log(JSON.stringify({ status: artifact.status, overall, clustered: artifact.clustered, checks }));
};

const main = async (): Promise<void> => {
    const mode = requiredText("MODE", /^(select|cell|finalize)$/);
    if (mode === "select") await selectCases(); else if (mode === "cell") await runCell(); else finalize();
};
const invoked = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (import.meta.url === invoked) main().catch((error) => { console.error(error); process.exitCode = 1; });
