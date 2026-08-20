import { Bot, CreateOfflineOpts, GameApi, cdapi } from "@chronodivide/game-api";
import { Countries } from "@supalosa/chronodivide-bot/dist/bot/logic/common/utils.js";
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
import { LiteralBuildingEliminationAdjudicator, installLiteralEndpointInstrumentation,
    snapshotCombatantBuildings } from "./literalBuildingEliminationEndpoint.js";

const MAP = { name: "cd_chrono_4_heck_freezes_over_le.map",
    sha256: "e4dfc736a6355e0e68d4681e4d67419516e6bb94549e2d42880c9414e95e2e8d" } as const;
const COUNTRIES = [Countries.USA, Countries.KOREA, Countries.FRANCE, Countries.GERMANY, Countries.GREAT_BRITAIN,
    Countries.LIBYA, Countries.IRAQ, Countries.CUBA, Countries.RUSSIA] as const;
const BOTTOM = "88,157", TOP = "88,34", SEED_BASE = 4_244_000_000;
const MAX_OFFSETS = 400, CASES_PER_COUNTRY = 2, CASE_COUNT = 18, MAX_TICKS = 90_000;
const TASK_COUNT = 108, SHA256 = /^[0-9a-f]{64}$/;
type Winner = "candidate" | "baseline" | "draw";
type CaseSpec = { caseIndex: number; countryOrdinal: number; country: Countries; seedOffset: number;
    requestedEngineSeed: number; candidateSlot: 0 | 1; candidateStart: string; baselineStart: string };
type Variant = { id: string; botOptions: StrongBotOptions };

const retarget = (mode: "stalled_rotate" | "round_robin" | "top_first" | "split", ticks: number): StrongBotOptions => ({
    hfoBottomRetarget: { enabled: true, minTick: 42_000, minAttackers: 4, maxEnemyBuildings: 6,
        maxEnemyCombatants: 4, orderIntervalTicks: 6, rotationTicks: ticks, stallTicks: ticks, mode },
});
export const HFO_BOTTOM_RETARGET_VARIANTS: readonly Variant[] = [
    { id: "default", botOptions: {} },
    { id: "stalled_rotate_600", botOptions: retarget("stalled_rotate", 600) },
    { id: "stalled_rotate_1200", botOptions: retarget("stalled_rotate", 1_200) },
    { id: "round_robin_600", botOptions: retarget("round_robin", 600) },
    { id: "top_first_600", botOptions: retarget("top_first", 600) },
    { id: "split_buildings", botOptions: retarget("split", 600) },
];

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
    if (!candidate.lastGameApi) throw new Error("Bottom development candidate API unavailable"); return candidate.lastGameApi;
};
const sourceIdentity = () => {
    const repo = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
    const commit = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
    if (execFileSync("git", ["branch", "--show-current"], { encoding: "utf8" }).trim() !== "main" ||
        execFileSync("git", ["status", "--short", "--untracked-files=no"], { encoding: "utf8" }).trim() !== "" ||
        execFileSync("git", ["rev-parse", "fork/main"], { encoding: "utf8" }).trim() !== commit) {
        throw new Error("Bottom development requires clean synchronized main");
    }
    return { repo, commit };
};
const commonInputs = () => {
    if (process.env.SLURM_JOB_ACCOUNT !== "pi_jss233") throw new Error("Bottom development requires pi_jss233");
    const mixDir = requiredPath("MIX_DIR"), protocolPath = requiredPath("PROTOCOL_PATH");
    const assetManifestPath = requiredPath("ASSET_MANIFEST_PATH");
    const protocolSha256 = requiredText("PROTOCOL_SHA256", SHA256);
    const assetManifestSha256 = requiredText("ASSET_MANIFEST_SHA256", SHA256);
    if (sha256File(protocolPath) !== protocolSha256 || sha256File(assetManifestPath) !== assetManifestSha256 ||
        sha256File(path.join(mixDir, MAP.name)) !== MAP.sha256) throw new Error("Bottom development input drifted");
    const manifest = JSON.parse(fs.readFileSync(assetManifestPath, "utf8")) as unknown;
    if (!isRecord(manifest) || manifest.kind !== "private-ra2-snow-runtime" ||
        path.resolve(String(manifest.runtimeDirectory)) !== mixDir) throw new Error("Bottom runtime drifted");
    return { mixDir, protocolPath, protocolSha256, assetManifestSha256 };
};
const settings = (candidate: Bot, baseline: Bot, slot: 0 | 1): CreateOfflineOpts => {
    const gameMode = cdapi.getAvailableGameModes(MAP.name)[0];
    if (!gameMode) throw new Error("Bottom development game mode unavailable");
    return { buildOffAlly: false, cratesAppear: false, credits: 10_000, gameMode, gameSpeed: 6,
        mapName: MAP.name, mcvRepacks: true, shortGame: false, superWeapons: false, unitCount: 0, online: false,
        agents: slot === 0 ? [candidate, baseline] : [baseline, candidate] };
};

const selectCases = async (): Promise<void> => {
    const outputPath = requiredPath("OUT_PATH"), programPath = requiredPath("PROGRAM_PATH");
    const programSha256 = requiredText("PROGRAM_SHA256", SHA256), inputs = commonInputs();
    if (fs.existsSync(outputPath) || sha256File(programPath) !== programSha256) throw new Error("Bottom selection drifted");
    const { repo, commit } = sourceIdentity();
    await cdapi.init(inputs.mixDir);
    const factory = await loadBaselineFactory(path.join(repo, "packages", "chronodivide-bot"));
    const cases: CaseSpec[] = [];
    let initializedGameCount = 0;
    for (const [countryOrdinal, country] of COUNTRIES.entries()) {
        let selected = 0;
        for (let seedOffset = 0; seedOffset < MAX_OFFSETS && selected < CASES_PER_COUNTRY; seedOffset += 1) {
            const requestedEngineSeed = SEED_BASE + countryOrdinal * 1_000 + seedOffset;
            for (const candidateSlot of [0, 1] as const) {
                if (selected >= CASES_PER_COUNTRY) break;
                const candidateName = `BottomSelectCandidate_${countryOrdinal}_${seedOffset}_${candidateSlot}`;
                const baselineName = `BottomSelectBaseline_${countryOrdinal}_${seedOffset}_${candidateSlot}`;
                const candidate = createDeployedStrongBotCandidate(candidateName, country);
                const baseline = factory.create(baselineName, country);
                const starts = await withSeededOfflineGame(cdapi, settings(candidate, baseline, candidateSlot),
                    requestedEngineSeed, [{ agent: candidate, identity: "candidate" }, { agent: baseline, identity: "baseline" }],
                    async () => ({ candidateStart: startKey(candidateApi(candidate).getPlayerData(candidateName).startLocation),
                        baselineStart: startKey(candidateApi(candidate).getPlayerData(baselineName).startLocation) }));
                initializedGameCount += 1;
                if (starts.candidateStart === BOTTOM && starts.baselineStart === TOP) {
                    cases.push({ caseIndex: cases.length, countryOrdinal, country, seedOffset,
                        requestedEngineSeed, candidateSlot, ...starts }); selected += 1;
                }
            }
        }
        if (selected !== CASES_PER_COUNTRY) throw new Error(`Bottom selection incomplete for ${country}`);
    }
    if (cases.length !== CASE_COUNT || new Set(cases.map((entry) =>
        `${entry.countryOrdinal}:${entry.requestedEngineSeed}:${entry.candidateSlot}`)).size !== CASE_COUNT) {
        throw new Error("Bottom selection coverage drifted");
    }
    const artifact = { schemaVersion: 1, kind: "hfo-bottom-outcome-blind-selection",
        status: "PASS_HFO_BOTTOM_SELECTION", complete: true, passed: true, outcomeFree: true,
        scheduler: { jobId: process.env.SLURM_JOB_ID, account: "pi_jss233" }, sourceCommit: commit,
        programSha256, protocolSha256: inputs.protocolSha256, assetManifestSha256: inputs.assetManifestSha256,
        seedBase: SEED_BASE, maxOffsets: MAX_OFFSETS, casesPerCountry: CASES_PER_COUNTRY,
        initializedGameCount, selectedCaseCount: cases.length, updateCount: 0, forbiddenOutcomeFields: [], cases };
    fs.mkdirSync(path.dirname(outputPath), { recursive: true, mode: 0o700 });
    fs.writeFileSync(outputPath, JSON.stringify(artifact, null, 2) + "\n", { flag: "wx", mode: 0o600 });
    console.log(JSON.stringify({ status: artifact.status, initializedGameCount, cases: cases.length }));
};

const loadSelection = (selectionPath: string, selectionSha256: string, inputs: ReturnType<typeof commonInputs>): CaseSpec[] => {
    if (sha256File(selectionPath) !== selectionSha256) throw new Error("Bottom selection hash drifted");
    const selection = JSON.parse(fs.readFileSync(selectionPath, "utf8")) as unknown;
    if (!isRecord(selection) || selection.kind !== "hfo-bottom-outcome-blind-selection" ||
        selection.status !== "PASS_HFO_BOTTOM_SELECTION" || selection.complete !== true || selection.passed !== true ||
        selection.outcomeFree !== true || selection.updateCount !== 0 || selection.selectedCaseCount !== CASE_COUNT ||
        selection.protocolSha256 !== inputs.protocolSha256 || selection.assetManifestSha256 !== inputs.assetManifestSha256 ||
        !Array.isArray(selection.cases) || selection.cases.length !== CASE_COUNT) throw new Error("Bottom selection ineligible");
    return selection.cases as CaseSpec[];
};

const runCell = async (): Promise<void> => {
    const taskIndex = Number(requiredText("TASK_INDEX", /^\d+$/)), outputPath = requiredPath("OUT_PATH");
    const programPath = requiredPath("PROGRAM_PATH"), programSha256 = requiredText("PROGRAM_SHA256", SHA256);
    const selectionPath = requiredPath("SELECTION_PATH"), selectionSha256 = requiredText("SELECTION_SHA256", SHA256);
    const inputs = commonInputs();
    if (taskIndex < 0 || taskIndex >= TASK_COUNT || process.env.SLURM_ARRAY_TASK_ID !== String(taskIndex) ||
        fs.existsSync(outputPath) || sha256File(programPath) !== programSha256) throw new Error("Bottom cell drifted");
    const cases = loadSelection(selectionPath, selectionSha256, inputs);
    const variantIndex = Math.floor(taskIndex / CASE_COUNT), caseIndex = taskIndex % CASE_COUNT;
    const variant = HFO_BOTTOM_RETARGET_VARIANTS[variantIndex], caseSpec = cases[caseIndex];
    if (!variant || !caseSpec || caseSpec.caseIndex !== caseIndex) throw new Error("Bottom cell assignment drifted");
    const { repo, commit } = sourceIdentity();
    await cdapi.init(inputs.mixDir);
    const factory = await loadBaselineFactory(path.join(repo, "packages", "chronodivide-bot"));
    const candidateName = `BottomDevCandidate_${taskIndex}`, baselineName = `BottomDevBaseline_${taskIndex}`;
    const candidate = createDeployedStrongBotCandidate(candidateName, caseSpec.country, {}, variant.botOptions);
    const baseline = factory.create(baselineName, caseSpec.country);
    const adjudicator = new LiteralBuildingEliminationAdjudicator({ candidate: candidateName, baseline: baselineName });
    const { audit } = installLiteralEndpointInstrumentation({ candidate, baseline }, adjudicator);
    const result = await withSeededOfflineGame(cdapi, settings(candidate, baseline, caseSpec.candidateSlot),
        caseSpec.requestedEngineSeed,
        [{ agent: candidate, identity: "candidate" }, { agent: baseline, identity: "baseline" }], async (game) => {
            const gameApi = candidateApi(candidate);
            if (startKey(gameApi.getPlayerData(candidateName).startLocation) !== BOTTOM ||
                startKey(gameApi.getPlayerData(baselineName).startLocation) !== TOP) throw new Error("Bottom start drifted");
            let ticks = 0, terminal: any = null, failure: any = null;
            while (ticks < MAX_TICKS && !terminal && !failure) {
                adjudicator.beginUpdate(gameApi); await game.update(); ticks += 1;
                const stats = game.getPlayerStats(), candidateStats = stats.find((row) => row.name === candidateName);
                const baselineStats = stats.find((row) => row.name === baselineName);
                if (!candidateStats || !baselineStats) throw new Error("Bottom statistics unavailable");
                const endpoint = adjudicator.completeUpdate(gameApi, { finished: game.isFinished(), defeated: {
                    candidate: candidateStats.defeated, baseline: baselineStats.defeated } });
                terminal = endpoint.terminal; failure = endpoint.technicalFailure;
            }
            if (failure) throw new Error(`Bottom endpoint failure ${JSON.stringify(failure)}`);
            if (audit.forwarded.candidate !== 0 || audit.forwarded.baseline !== 0) throw new Error("Bottom resignation forwarded");
            const buildings = snapshotCombatantBuildings(gameApi, { candidate: candidateName, baseline: baselineName });
            const winner: Winner = terminal?.winner ?? "draw";
            return { taskIndex, variantId: variant.id, caseIndex, country: caseSpec.country,
                requestedEngineSeed: caseSpec.requestedEngineSeed, candidateSlot: caseSpec.candidateSlot,
                candidateStart: BOTTOM, baselineStart: TOP, maxTicks: MAX_TICKS, ticks,
                status: terminal?.status ?? "tick_cap_draw", winner,
                terminalBuildingCounts: { candidate: buildings.filter((row) => row.owner === candidateName).length,
                    baseline: buildings.filter((row) => row.owner === baselineName).length },
                quitAttempts: { ...audit.attempts } };
        });
    const provenance = createExperimentManifest({ runId: `hfo-bottom-dev-${taskIndex}-${process.env.SLURM_JOB_ID}`,
        mixDir: inputs.mixDir, maps: [MAP.name], effectiveConfig: { taskIndex, variantIndex, variant,
            caseSpec, selectionSha256, maxTicks: MAX_TICKS }, baseline: factory.descriptor,
        gameSeedBase: caseSpec.requestedEngineSeed });
    const artifact = { schemaVersion: 1, kind: "hfo-bottom-development-cell",
        status: "COMPLETE_HFO_BOTTOM_DEVELOPMENT_CELL", complete: true, taskIndex, variantIndex,
        variantId: variant.id, caseIndex, schedulerAccount: "pi_jss233", schedulerJobId: process.env.SLURM_JOB_ID,
        sourceCommit: commit, programSha256, protocolSha256: inputs.protocolSha256,
        assetManifestSha256: inputs.assetManifestSha256, selectionSha256, result, provenance };
    fs.mkdirSync(path.dirname(outputPath), { recursive: true, mode: 0o700 });
    fs.writeFileSync(outputPath, JSON.stringify(artifact, null, 2) + "\n", { flag: "wx", mode: 0o600 });
    console.log(JSON.stringify({ status: artifact.status, taskIndex, variantId: variant.id, caseIndex }));
};

const summarize = (rows: any[]) => {
    const wins = rows.filter((row) => row.winner === "candidate").length;
    const losses = rows.filter((row) => row.winner === "baseline").length;
    const draws = rows.length - wins - losses, ticks = rows.map((row) => row.ticks).sort((a, b) => a - b);
    const center = Math.floor(ticks.length / 2);
    const statuses = Object.fromEntries([...new Set(rows.map((row) => row.status))].sort()
        .map((status) => [status, rows.filter((row) => row.status === status).length]));
    return { games: rows.length, wins, draws, losses, netWins: wins - losses, winRate: wins / rows.length,
        lossRate: losses / rows.length, medianTicks: ticks.length % 2 ? ticks[center] : (ticks[center - 1] + ticks[center]) / 2,
        statuses };
};
const completedTasks = (arrayJobId: string): Map<number, string> => {
    const raw = execFileSync("/opt/slurm/current/bin/sacct",
        ["-j", arrayJobId, "-n", "-P", "-X", "--format=JobID,JobIDRaw,State,ExitCode,Account"], { encoding: "utf8" });
    const tasks = new Map<number, string>();
    for (const line of raw.split("\n").filter(Boolean)) {
        const [label, rawId, state, exitCode, account] = line.split("|");
        const match = new RegExp(`^${arrayJobId}_(\\d+)$`).exec(label);
        if (match && state === "COMPLETED" && exitCode === "0:0" && account === "pi_jss233") tasks.set(Number(match[1]), rawId);
    }
    return tasks;
};

const finalize = (): void => {
    const root = requiredPath("RESULTS_ROOT"), outputPath = requiredPath("OUT_PATH");
    const arrayJobId = requiredText("ARRAY_JOB_ID", /^\d+$/), programSha256 = requiredText("PROGRAM_SHA256", SHA256);
    const selectionSha256 = requiredText("SELECTION_SHA256", SHA256), inputs = commonInputs();
    if (fs.existsSync(outputPath)) throw new Error("Bottom finalizer exists");
    let tasks = new Map<number, string>();
    for (let attempt = 0; attempt < 31; attempt += 1) {
        tasks = completedTasks(arrayJobId); if (tasks.size === TASK_COUNT) break;
        if (attempt < 30) execFileSync("sleep", ["2"]);
    }
    if (tasks.size !== TASK_COUNT) throw new Error(`Only ${tasks.size}/${TASK_COUNT} bottom tasks complete`);
    const rows: any[] = [], sources = new Set<string>();
    for (let taskIndex = 0; taskIndex < TASK_COUNT; taskIndex += 1) {
        const cell = JSON.parse(fs.readFileSync(path.join(root,
            `task-${String(taskIndex).padStart(3, "0")}`, "cell.json"), "utf8"));
        const variantIndex = Math.floor(taskIndex / CASE_COUNT), caseIndex = taskIndex % CASE_COUNT;
        if (cell.kind !== "hfo-bottom-development-cell" || cell.status !== "COMPLETE_HFO_BOTTOM_DEVELOPMENT_CELL" ||
            cell.complete !== true || cell.taskIndex !== taskIndex || cell.variantIndex !== variantIndex ||
            cell.variantId !== HFO_BOTTOM_RETARGET_VARIANTS[variantIndex].id || cell.caseIndex !== caseIndex ||
            String(cell.schedulerJobId) !== tasks.get(taskIndex) || cell.programSha256 !== programSha256 ||
            cell.protocolSha256 !== inputs.protocolSha256 || cell.assetManifestSha256 !== inputs.assetManifestSha256 ||
            cell.selectionSha256 !== selectionSha256) throw new Error(`Bottom cell ${taskIndex} drifted`);
        sources.add(cell.sourceCommit); rows.push(cell.result);
    }
    if (rows.length !== TASK_COUNT || sources.size !== 1) throw new Error("Bottom aggregate coverage drifted");
    const defaultRows = rows.filter((row) => row.variantId === "default"), defaultSummary = summarize(defaultRows);
    const variants = HFO_BOTTOM_RETARGET_VARIANTS.map((variant, declarationIndex) => {
        const variantRows = rows.filter((row) => row.variantId === variant.id), summary = summarize(variantRows);
        const byCountry = Object.fromEntries(COUNTRIES.map((country) =>
            [country, summarize(variantRows.filter((row) => row.country === country))]));
        const score = (winner: Winner): number => winner === "candidate" ? 1 : winner === "draw" ? 0.5 : 0;
        const paired = variantRows.map((row) => score(row.winner) -
            score(defaultRows.find((entry) => entry.caseIndex === row.caseIndex)?.winner ?? "draw"));
        const pairedMean = paired.reduce((total, value) => total + value, 0) / paired.length;
        const countryNoninferiorityCount = Object.values(byCountry).filter((entry: any) => entry.wins >= entry.losses).length;
        const eligible = summary.wins >= 11 && summary.wins > summary.losses &&
            summary.lossRate < defaultSummary.lossRate && countryNoninferiorityCount >= 7 && pairedMean > 0;
        return { id: variant.id, declarationIndex, summary, byCountry, pairedVersusDefault: {
            meanScoreDifference: pairedMean, improved: paired.filter((value) => value > 0).length,
            tied: paired.filter((value) => value === 0).length, worsened: paired.filter((value) => value < 0).length },
            countryNoninferiorityCount, eligible };
    });
    const ranked = [...variants].sort((left, right) => right.summary.netWins - left.summary.netWins ||
        right.summary.wins - left.summary.wins || left.summary.losses - right.summary.losses ||
        (left.summary.statuses.tick_cap_draw ?? 0) - (right.summary.statuses.tick_cap_draw ?? 0) ||
        left.summary.medianTicks - right.summary.medianTicks || left.declarationIndex - right.declarationIndex);
    const winner = ranked[0], passed = winner.eligible;
    const artifact = { schemaVersion: 1, kind: "hfo-bottom-development-finalizer",
        status: passed ? "ADVANCE_HFO_BOTTOM_RETARGET" : "NO_ELIGIBLE_HFO_BOTTOM_RETARGET",
        complete: true, passed, schedulerAccount: "pi_jss233", arrayJobId,
        finalizerJobId: process.env.SLURM_JOB_ID, sourceCommit: [...sources][0], programSha256,
        protocolSha256: inputs.protocolSha256, assetManifestSha256: inputs.assetManifestSha256,
        selectionSha256, launchedGameCount: rows.length, variants, ranking: ranked.map((entry) => entry.id),
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
