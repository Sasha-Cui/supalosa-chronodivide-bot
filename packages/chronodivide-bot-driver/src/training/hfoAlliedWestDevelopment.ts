import { Bot, CreateOfflineOpts, GameApi, cdapi } from "@chronodivide/game-api";
import { Countries } from "@supalosa/chronodivide-bot/dist/bot/logic/common/utils.js";
import { StrongStrategyOptions } from "@supalosa/chronodivide-bot/dist/bot/strategy/strongStrategy.js";
import { StrongBotOptions } from "@supalosa/chronodivide-bot/dist/bot/strongBot.js";
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { loadBaselineFactory } from "../benchmark/baselineLoader.js";
import { createExperimentManifest } from "../benchmark/provenance.js";
import { withSeededOfflineGame } from "../benchmark/seededOfflineGame.js";
import { createDeployedStrongBotCandidate, InspectableDeployedStrongBot } from "./deployedStrongBotCandidate.js";
import {
    LiteralBuildingEliminationAdjudicator,
    installLiteralEndpointInstrumentation,
    snapshotCombatantBuildings,
} from "./literalBuildingEliminationEndpoint.js";

const MAP = { name: "cd_chrono_4_heck_freezes_over_le.map",
    sha256: "e4dfc736a6355e0e68d4681e4d67419516e6bb94549e2d42880c9414e95e2e8d" } as const;
const COUNTRIES = [Countries.USA, Countries.KOREA, Countries.FRANCE, Countries.GERMANY, Countries.GREAT_BRITAIN] as const;
const WEST_START = "39,82", EAST_START = "151,119";
const MAX_OFFSETS = 400, CASES_PER_COUNTRY = 4;
const CASE_COUNT = 20, TASK_COUNT = 120;
const SHA256 = /^[0-9a-f]{64}$/;
type Winner = "candidate" | "baseline" | "draw";
type CaseSpec = { caseIndex: number; countryOrdinal: number; country: Countries; seedOffset: number;
    requestedEngineSeed: number; candidateSlot: 0 | 1; candidateStart: string; baselineStart: string };
type Variant = { id: string; strategyOptions: StrongStrategyOptions; botOptions?: StrongBotOptions };

export const HFO_ALLIED_WEST_VARIANTS: readonly Variant[] = [
    { id: "default", strategyOptions: {} },
    { id: "rush_tanks", strategyOptions: { strategicPlan: { enabled: true, plan: "rush" } } },
    { id: "rush_infantry", strategyOptions: {
        strategicPlan: { enabled: true, plan: "rush" }, base: { attackCompositionPolicy: "infantry" },
    } },
    { id: "rush_assault", strategyOptions: {
        strategicPlan: { enabled: true, plan: "rush" }, base: { attackCompositionPolicy: "assault" },
    } },
    { id: "antiinf_assault", strategyOptions: {
        strategicPlan: { enabled: true, plan: "otmqAntiInfantry" }, base: { attackCompositionPolicy: "assault" },
    } },
    { id: "rush_assault_pillbox", strategyOptions: {
        strategicPlan: { enabled: true, plan: "rush" },
        base: { attackCompositionPolicy: "assault" },
        staticDefenseBoost: { enabled: true, hfoBottomOnly: false, startTick: 2_700, targetCount: 2,
            priority: 132, placementAnchors: [{ x: 50, y: 91 }, { x: 54, y: 95 }] },
    } },
];


export const HFO_ALLIED_WEST_GUARD_VARIANTS: readonly Variant[] = [
    { id: "default", strategyOptions: {} },
    { id: "rush_tanks", strategyOptions: { strategicPlan: { enabled: true, plan: "rush" } } },
    { id: "hfo_guard_hold_9600", strategyOptions: {}, botOptions: { hfoWestHomeGuard: {
        enabled: true, untilTick: 9_600, radius: 72, orderIntervalTicks: 6,
        engageMinCombatants: 4, engageCombatantAdvantage: 0, alliedOnly: true,
    } } },
    { id: "rush_guard_hold_9600", strategyOptions: {
        strategicPlan: { enabled: true, plan: "rush" },
    }, botOptions: { hfoWestHomeGuard: {
        enabled: true, untilTick: 9_600, radius: 72, orderIntervalTicks: 6,
        engageMinCombatants: 4, engageCombatantAdvantage: 0, alliedOnly: true,
    } } },
    { id: "rush_guard_group_9600", strategyOptions: {
        strategicPlan: { enabled: true, plan: "rush" },
    }, botOptions: { hfoWestHomeGuard: {
        enabled: true, untilTick: 9_600, radius: 72, orderIntervalTicks: 6,
        engageMinCombatants: 4, engageCombatantAdvantage: -4, alliedOnly: true,
    } } },
    { id: "rush_guard_hold_12000", strategyOptions: {
        strategicPlan: { enabled: true, plan: "rush" },
    }, botOptions: { hfoWestHomeGuard: {
        enabled: true, untilTick: 12_000, radius: 72, orderIntervalTicks: 6,
        engageMinCombatants: 4, engageCombatantAdvantage: 0, alliedOnly: true,
    } } },
];

type StudyId = "production_v1" | "guard_v2";
type StudyConfig = { id: StudyId; seedBase: number; maxTicks: number; variants: readonly Variant[] };
const STUDIES: Record<StudyId, StudyConfig> = {
    production_v1: { id: "production_v1", seedBase: 4_240_000_000, maxTicks: 60_000,
        variants: HFO_ALLIED_WEST_VARIANTS },
    guard_v2: { id: "guard_v2", seedBase: 4_241_000_000, maxTicks: 90_000,
        variants: HFO_ALLIED_WEST_GUARD_VARIANTS },
};
const studyConfig = (): StudyConfig => {
    const id = process.env.HFO_WEST_STUDY ?? "production_v1";
    if (id !== "production_v1" && id !== "guard_v2") throw new Error("HFO_WEST_STUDY is invalid");
    return STUDIES[id];
};
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
const candidateApi = (bot: InspectableDeployedStrongBot): GameApi => {
    if (!bot.lastGameApi) throw new Error("Candidate GameApi is unavailable"); return bot.lastGameApi;
};

const sourceIdentity = () => {
    const repo = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
    const commit = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
    if (execFileSync("git", ["branch", "--show-current"], { encoding: "utf8" }).trim() !== "main" ||
        execFileSync("git", ["status", "--short", "--untracked-files=no"], { encoding: "utf8" }).trim() !== "" ||
        execFileSync("git", ["rev-parse", "fork/main"], { encoding: "utf8" }).trim() !== commit) {
        throw new Error("HFO west development requires clean synchronized main");
    }
    return { repo, commit };
};

const settings = (candidate: Bot, baseline: Bot, candidateSlot: 0 | 1): CreateOfflineOpts => {
    const gameMode = cdapi.getAvailableGameModes(MAP.name)[0];
    if (!gameMode) throw new Error("HFO west development game mode is unavailable");
    return { buildOffAlly: false, cratesAppear: false, credits: 10_000, gameMode, gameSpeed: 6,
        mapName: MAP.name, mcvRepacks: true, shortGame: false, superWeapons: false, unitCount: 0, online: false,
        agents: candidateSlot === 0 ? [candidate, baseline] : [baseline, candidate] };
};

const commonInputs = () => {
    if (process.env.SLURM_JOB_ACCOUNT !== "pi_jss233") throw new Error("HFO west development requires pi_jss233");
    const mixDir = requiredPath("MIX_DIR"), protocolPath = requiredPath("PROTOCOL_PATH");
    const assetManifestPath = requiredPath("ASSET_MANIFEST_PATH");
    const protocolSha256 = requiredText("PROTOCOL_SHA256", SHA256);
    const assetManifestSha256 = requiredText("ASSET_MANIFEST_SHA256", SHA256);
    if (sha256File(protocolPath) !== protocolSha256 || sha256File(assetManifestPath) !== assetManifestSha256 ||
        sha256File(path.join(mixDir, MAP.name)) !== MAP.sha256) throw new Error("HFO west development input drifted");
    const assetManifest = JSON.parse(fs.readFileSync(assetManifestPath, "utf8")) as unknown;
    if (!isRecord(assetManifest) || assetManifest.kind !== "private-ra2-snow-runtime" ||
        path.resolve(String(assetManifest.runtimeDirectory)) !== mixDir) throw new Error("Private runtime manifest drifted");
    return { mixDir, protocolPath, protocolSha256, assetManifestPath, assetManifestSha256 };
};

const selectCases = async (): Promise<void> => {
    const outputPath = requiredPath("OUT_PATH"), programPath = requiredPath("PROGRAM_PATH");
    const programSha256 = requiredText("PROGRAM_SHA256", SHA256), inputs = commonInputs();
    const study = studyConfig();
    if (fs.existsSync(outputPath) || sha256File(programPath) !== programSha256) throw new Error("Selection output or program drifted");
    const { repo, commit } = sourceIdentity();
    await cdapi.init(inputs.mixDir);
    const factory = await loadBaselineFactory(path.join(repo, "packages", "chronodivide-bot"));
    const cases: CaseSpec[] = [];
    let initializedGameCount = 0;
    for (const [countryOrdinal, country] of COUNTRIES.entries()) {
        let selectedForCountry = 0;
        for (let seedOffset = 0; seedOffset < MAX_OFFSETS && selectedForCountry < CASES_PER_COUNTRY; seedOffset += 1) {
            const requestedEngineSeed = study.seedBase + countryOrdinal * 1_000 + seedOffset;
            for (const candidateSlot of [0, 1] as const) {
                if (selectedForCountry >= CASES_PER_COUNTRY) break;
                const candidateName = `HfoWestSelectCandidate_${countryOrdinal}_${seedOffset}_${candidateSlot}`;
                const baselineName = `HfoWestSelectBaseline_${countryOrdinal}_${seedOffset}_${candidateSlot}`;
                const candidate = createDeployedStrongBotCandidate(candidateName, country);
                const baseline = factory.create(baselineName, country);
                const starts = await withSeededOfflineGame(cdapi, settings(candidate, baseline, candidateSlot),
                    requestedEngineSeed, [{ agent: candidate, identity: "candidate" }, { agent: baseline, identity: "baseline" }],
                    async () => ({ candidateStart: startKey(candidateApi(candidate).getPlayerData(candidateName).startLocation),
                        baselineStart: startKey(candidateApi(candidate).getPlayerData(baselineName).startLocation) }));
                initializedGameCount += 1;
                if (starts.candidateStart === WEST_START && starts.baselineStart === EAST_START) {
                    cases.push({ caseIndex: cases.length, countryOrdinal, country, seedOffset, requestedEngineSeed,
                        candidateSlot, ...starts });
                    selectedForCountry += 1;
                }
            }
        }
        if (selectedForCountry !== CASES_PER_COUNTRY) throw new Error(`Only selected ${selectedForCountry} cases for ${country}`);
    }
    if (cases.length !== CASE_COUNT || new Set(cases.map((entry) =>
        `${entry.countryOrdinal}:${entry.requestedEngineSeed}:${entry.candidateSlot}`)).size !== CASE_COUNT) {
        throw new Error("Outcome-blind HFO west selection coverage drifted");
    }
    const artifact = { schemaVersion: 1, kind: "hfo-allied-west-outcome-blind-selection",
        status: "PASS_HFO_ALLIED_WEST_SELECTION", complete: true, passed: true, outcomeFree: true,
        scheduler: { jobId: process.env.SLURM_JOB_ID, account: "pi_jss233" }, sourceCommit: commit,
        programSha256, protocolSha256: inputs.protocolSha256, assetManifestSha256: inputs.assetManifestSha256,
        studyId: study.id, seedBase: study.seedBase, maxOffsets: MAX_OFFSETS, casesPerCountry: CASES_PER_COUNTRY,
        initializedGameCount, selectedCaseCount: cases.length, updateCount: 0, forbiddenOutcomeFields: [], cases };
    fs.mkdirSync(path.dirname(outputPath), { recursive: true, mode: 0o700 });
    fs.writeFileSync(outputPath, JSON.stringify(artifact, null, 2) + "\n", { flag: "wx", mode: 0o600 });
    console.log(JSON.stringify({ status: artifact.status, initializedGameCount, selectedCaseCount: cases.length }));
};

const loadSelection = (selectionPath: string, selectionSha256: string, inputs: ReturnType<typeof commonInputs>): CaseSpec[] => {
    if (sha256File(selectionPath) !== selectionSha256) throw new Error("HFO west selection hash drifted");
    const study = studyConfig();
    const selection = JSON.parse(fs.readFileSync(selectionPath, "utf8")) as unknown;
    if (!isRecord(selection) || selection.kind !== "hfo-allied-west-outcome-blind-selection" ||
        selection.status !== "PASS_HFO_ALLIED_WEST_SELECTION" || selection.complete !== true || selection.passed !== true ||
        selection.outcomeFree !== true || selection.updateCount !== 0 || selection.selectedCaseCount !== CASE_COUNT ||
        selection.protocolSha256 !== inputs.protocolSha256 || selection.assetManifestSha256 !== inputs.assetManifestSha256 ||
        selection.studyId !== study.id || selection.seedBase !== study.seedBase ||
        !Array.isArray(selection.cases) || selection.cases.length !== CASE_COUNT) throw new Error("Selection manifest is ineligible");
    return selection.cases as CaseSpec[];
};

const runEpisode = async (args: { factory: Awaited<ReturnType<typeof loadBaselineFactory>>; variant: Variant;
    caseSpec: CaseSpec; taskIndex: number; maxTicks: number }) => {
    const { factory, variant, caseSpec, taskIndex, maxTicks } = args;
    const candidateName = `HfoWestDevCandidate_${taskIndex}`, baselineName = `HfoWestDevBaseline_${taskIndex}`;
    const candidate = createDeployedStrongBotCandidate(
        candidateName, caseSpec.country, variant.strategyOptions, variant.botOptions ?? {});
    const baseline = factory.create(baselineName, caseSpec.country);
    const adjudicator = new LiteralBuildingEliminationAdjudicator({ candidate: candidateName, baseline: baselineName });
    const { audit } = installLiteralEndpointInstrumentation({ candidate, baseline }, adjudicator);
    return withSeededOfflineGame(cdapi, settings(candidate, baseline, caseSpec.candidateSlot), caseSpec.requestedEngineSeed,
        [{ agent: candidate, identity: "candidate" }, { agent: baseline, identity: "baseline" }], async (game) => {
            const gameApi = candidateApi(candidate);
            const candidateStart = startKey(gameApi.getPlayerData(candidateName).startLocation);
            const baselineStart = startKey(gameApi.getPlayerData(baselineName).startLocation);
            if (candidateStart !== WEST_START || baselineStart !== EAST_START) throw new Error("Selected HFO west start drifted");
            let terminal: any = null, failure: any = null, ticks = 0;
            while (ticks < maxTicks && !terminal && !failure) {
                adjudicator.beginUpdate(gameApi); await game.update(); ticks += 1;
                const stats = game.getPlayerStats(), candidateStats = stats.find((row) => row.name === candidateName);
                const baselineStats = stats.find((row) => row.name === baselineName);
                if (!candidateStats || !baselineStats) throw new Error("HFO west development statistics are unavailable");
                const endpoint = adjudicator.completeUpdate(gameApi, { finished: game.isFinished(), defeated: {
                    candidate: candidateStats.defeated, baseline: baselineStats.defeated } });
                terminal = endpoint.terminal; failure = endpoint.technicalFailure;
            }
            if (failure) throw new Error(`HFO west development endpoint failure: ${JSON.stringify(failure)}`);
            if (audit.forwarded.candidate !== 0 || audit.forwarded.baseline !== 0) throw new Error("Resignation was forwarded");
            const buildings = snapshotCombatantBuildings(gameApi, { candidate: candidateName, baseline: baselineName });
            const winner: Winner = terminal?.winner ?? "draw", status = terminal?.status ?? "tick_cap_draw";
            return { taskIndex, variantId: variant.id, caseIndex: caseSpec.caseIndex, country: caseSpec.country,
                countryOrdinal: caseSpec.countryOrdinal, seedOffset: caseSpec.seedOffset,
                requestedEngineSeed: caseSpec.requestedEngineSeed, candidateSlot: caseSpec.candidateSlot,
                candidateStart, baselineStart, maxTicks, ticks, status, winner,
                terminalBuildingCounts: { candidate: buildings.filter((row) => row.owner === candidateName).length,
                    baseline: buildings.filter((row) => row.owner === baselineName).length },
                quitAttempts: { ...audit.attempts } };
        });
};

const runCell = async (): Promise<void> => {
    const taskIndex = Number(requiredText("TASK_INDEX", /^\d+$/));
    const outputPath = requiredPath("OUT_PATH"), programPath = requiredPath("PROGRAM_PATH");
    const selectionPath = requiredPath("SELECTION_PATH"), programSha256 = requiredText("PROGRAM_SHA256", SHA256);
    const selectionSha256 = requiredText("SELECTION_SHA256", SHA256), inputs = commonInputs();
    const study = studyConfig();
    if (taskIndex < 0 || taskIndex >= TASK_COUNT || process.env.SLURM_ARRAY_TASK_ID !== String(taskIndex) ||
        fs.existsSync(outputPath) || sha256File(programPath) !== programSha256) throw new Error("Cell input drifted");
    const cases = loadSelection(selectionPath, selectionSha256, inputs), { repo, commit } = sourceIdentity();
    const variantIndex = Math.floor(taskIndex / CASE_COUNT), caseIndex = taskIndex % CASE_COUNT;
    const variant = study.variants[variantIndex], caseSpec = cases[caseIndex];
    if (!variant || !caseSpec || caseSpec.caseIndex !== caseIndex) throw new Error("Cell assignment drifted");
    await cdapi.init(inputs.mixDir);
    const factory = await loadBaselineFactory(path.join(repo, "packages", "chronodivide-bot"));
    const result = await runEpisode({ factory, variant, caseSpec, taskIndex, maxTicks: study.maxTicks });
    const provenance = createExperimentManifest({ runId: `hfo-allied-west-dev-${taskIndex}-${process.env.SLURM_JOB_ID}`,
        mixDir: inputs.mixDir, maps: [MAP.name], effectiveConfig: { taskIndex, variantIndex, variant,
            caseSpec, selectionSha256, studyId: study.id, maxTicks: study.maxTicks }, baseline: factory.descriptor,
        gameSeedBase: caseSpec.requestedEngineSeed });
    const artifact = { schemaVersion: 1, kind: "hfo-allied-west-development-cell",
        status: "COMPLETE_HFO_ALLIED_WEST_DEVELOPMENT_CELL", complete: true, taskIndex, variantIndex,
        variantId: variant.id, caseIndex, schedulerAccount: "pi_jss233", schedulerJobId: process.env.SLURM_JOB_ID,
        sourceCommit: commit, programSha256, protocolSha256: inputs.protocolSha256,
        assetManifestSha256: inputs.assetManifestSha256, selectionSha256, studyId: study.id, result, provenance };
    fs.mkdirSync(path.dirname(outputPath), { recursive: true, mode: 0o700 });
    fs.writeFileSync(outputPath, JSON.stringify(artifact, null, 2) + "\n", { flag: "wx", mode: 0o600 });
    console.log(JSON.stringify({ status: artifact.status, taskIndex, variantId: variant.id, caseIndex }));
};

const summarize = (rows: any[]) => {
    const wins = rows.filter((row) => row.winner === "candidate").length;
    const losses = rows.filter((row) => row.winner === "baseline").length;
    const draws = rows.length - wins - losses, ticks = rows.map((row) => row.ticks).sort((a, b) => a - b);
    const statuses = Object.fromEntries([...new Set(rows.map((row) => row.status))].sort()
        .map((status) => [status, rows.filter((row) => row.status === status).length]));
    const center = Math.floor(ticks.length / 2);
    return { games: rows.length, wins, draws, losses, netWins: wins - losses, winRate: wins / rows.length,
        lossRate: losses / rows.length, medianTicks: ticks.length % 2 === 0 ? (ticks[center - 1] + ticks[center]) / 2 : ticks[center], statuses };
};

const queryCompletedTasks = (arrayJobId: string): Map<number, string> => {
    const raw = execFileSync("/opt/slurm/current/bin/sacct",
        ["-j", arrayJobId, "-n", "-P", "-X", "--format=JobID,JobIDRaw,State,ExitCode,Account"], { encoding: "utf8" });
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
    if (fs.existsSync(outputPath)) throw new Error("Finalizer output exists");
    let tasks = new Map<number, string>();
    const study = studyConfig();
    for (let attempt = 0; attempt < 31; attempt += 1) {
        tasks = queryCompletedTasks(arrayJobId);
        if (tasks.size === TASK_COUNT) break;
        if (attempt < 30) execFileSync("sleep", ["2"]);
    }
    if (tasks.size !== TASK_COUNT) throw new Error(`Only ${tasks.size}/${TASK_COUNT} task records are complete`);
    const rows: any[] = [], sourceCommits = new Set<string>();
    for (let taskIndex = 0; taskIndex < TASK_COUNT; taskIndex += 1) {
        const cellPath = path.join(root, `task-${String(taskIndex).padStart(3, "0")}`, "cell.json");
        const cell = JSON.parse(fs.readFileSync(cellPath, "utf8"));
        const expectedVariantIndex = Math.floor(taskIndex / CASE_COUNT), expectedCaseIndex = taskIndex % CASE_COUNT;
        if (cell.kind !== "hfo-allied-west-development-cell" ||
            cell.status !== "COMPLETE_HFO_ALLIED_WEST_DEVELOPMENT_CELL" || cell.complete !== true ||
            cell.taskIndex !== taskIndex || cell.variantIndex !== expectedVariantIndex ||
            cell.variantId !== study.variants[expectedVariantIndex].id || cell.caseIndex !== expectedCaseIndex ||
            cell.studyId !== study.id ||
            String(cell.schedulerJobId) !== tasks.get(taskIndex) || cell.programSha256 !== programSha256 ||
            cell.protocolSha256 !== inputs.protocolSha256 || cell.assetManifestSha256 !== inputs.assetManifestSha256 ||
            cell.selectionSha256 !== selectionSha256) throw new Error(`Development cell ${taskIndex} drifted`);
        sourceCommits.add(cell.sourceCommit); rows.push(cell.result);
    }
    if (rows.length !== TASK_COUNT || sourceCommits.size !== 1) throw new Error("Development aggregate coverage drifted");
    const defaultRows = rows.filter((row) => row.variantId === "default");
    const variants = study.variants.map((variant, declarationIndex) => {
        const variantRows = rows.filter((row) => row.variantId === variant.id), summary = summarize(variantRows);
        const byCountry = Object.fromEntries(COUNTRIES.map((country) =>
            [country, summarize(variantRows.filter((row) => row.country === country))]));
        const paired = variantRows.map((row) => {
            const control = defaultRows.find((entry) => entry.caseIndex === row.caseIndex);
            if (!control) throw new Error(`Missing control for case ${row.caseIndex}`);
            const score = (winner: Winner): number => winner === "candidate" ? 1 : winner === "draw" ? 0.5 : 0;
            return score(row.winner) - score(control.winner);
        });
        const countryNoninferiorityCount = Object.values(byCountry).filter((entry: any) => entry.wins >= entry.losses).length;
        const eligible = summary.wins >= 11 && summary.wins > summary.losses && countryNoninferiorityCount >= 4;
        return { id: variant.id, declarationIndex, summary, byCountry, pairedVersusDefault: {
            meanScoreDifference: paired.reduce((total, value) => total + value, 0) / paired.length,
            improved: paired.filter((value) => value > 0).length, tied: paired.filter((value) => value === 0).length,
            worsened: paired.filter((value) => value < 0).length }, countryNoninferiorityCount, eligible };
    });
    const ranked = [...variants].sort((left, right) =>
        right.summary.netWins - left.summary.netWins || right.summary.wins - left.summary.wins ||
        left.summary.losses - right.summary.losses ||
        (left.summary.statuses.tick_cap_draw ?? 0) - (right.summary.statuses.tick_cap_draw ?? 0) ||
        left.summary.medianTicks - right.summary.medianTicks || left.declarationIndex - right.declarationIndex);
    const winner = ranked[0];
    const artifact = { schemaVersion: 1, kind: "hfo-allied-west-development-finalizer",
        status: winner.eligible ? "ADVANCE_HFO_ALLIED_WEST_VARIANT" : "NO_ELIGIBLE_HFO_ALLIED_WEST_VARIANT",
        complete: true, passed: winner.eligible, schedulerAccount: "pi_jss233", arrayJobId,
        finalizerJobId: process.env.SLURM_JOB_ID, sourceCommit: [...sourceCommits][0], programSha256,
        protocolSha256: inputs.protocolSha256, assetManifestSha256: inputs.assetManifestSha256,
        selectionSha256, studyId: study.id, launchedGameCount: rows.length, variants, ranking: ranked.map((entry) => entry.id),
        winner, schedulerJobIds: [...tasks.values()], rows };
    fs.mkdirSync(path.dirname(outputPath), { recursive: true, mode: 0o700 });
    fs.writeFileSync(outputPath, JSON.stringify(artifact, null, 2) + "\n", { flag: "wx", mode: 0o600 });
    console.log(JSON.stringify({ status: artifact.status, ranking: artifact.ranking, winner }));
};

const main = async (): Promise<void> => {
    const mode = requiredText("MODE", /^(select|cell|finalize)$/);
    if (mode === "select") await selectCases(); else if (mode === "cell") await runCell(); else finalize();
};
const invoked = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (import.meta.url === invoked) main().catch((error) => { console.error(error); process.exitCode = 1; });
