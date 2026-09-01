import { Bot, CreateOfflineOpts, GameApi, ObjectType, UnitData, cdapi } from "@chronodivide/game-api";
import { Countries } from "@supalosa/chronodivide-bot/dist/bot/logic/common/utils.js";
import { StrongBot } from "@supalosa/chronodivide-bot/dist/bot/strongBot.js";
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { BaselineFactory, loadBaselineFactory } from "../benchmark/baselineLoader.js";
import { createExperimentManifest } from "../benchmark/provenance.js";
import { withSeededOfflineGame } from "../benchmark/seededOfflineGame.js";
import { LiteralBuildingEliminationAdjudicator, installLiteralEndpointInstrumentation,
    snapshotCombatantBuildings } from "./literalBuildingEliminationEndpoint.js";
import { RA2WEB_CLIENT_COMMIT, RA2WEB_CLIENT_RELEASE_ID, RA2WEB_FREEZE_MANIFEST_SHA256,
    createInspectableRa2WebBot, loadRa2WebOpponent } from "./ra2WebOpponentBundle.js";
import { CanonicalV8Policy, V8_SEARCH_SEEDS, canonicalizeV8Policy, crossoverV8Policy,
    decorateWithV8Controller, mutateV8Policy } from "./hfoAdvancedStateConditionedV8Core.js";

const MAP = { name: "cd_chrono_4_heck_freezes_over_le.map",
    sha256: "e4dfc736a6355e0e68d4681e4d67419516e6bb94549e2d42880c9414e95e2e8d" } as const;
const BASELINE_COMMIT = "165b77a71d0cf5ebd27c65b19d0486bcbae78d0f";
const ADVANCED_SHA256 = "81d8797b6dd1371ba2dcbd79e25df8b42254290c820159e121a82650fd97a143";
const ORIGINAL_PROTOCOL_SHA256 = "186ede4a712c68d2c0324dc350de4de8428f3b52cb55d344224b50934c447f88";
const SHA256 = /^[0-9a-f]{64}$/;
const V8_SELECTION_CASE_COUNT = 1_620;
const V8_COUNTRIES = [Countries.USA, Countries.KOREA, Countries.FRANCE, Countries.GERMANY,
    Countries.GREAT_BRITAIN, Countries.LIBYA, Countries.IRAQ, Countries.CUBA, Countries.RUSSIA] as const;
const MAX_UPDATES = 90_000, T_CRITICAL_90_DF17 = 1.33338;
const ALLIED = new Set<Countries>(V8_COUNTRIES.slice(0, 5));
export const V8_G0_RUN_COUNT = 3 as const;
export const V8_G0_CASE_COUNT = 18 as const;
export const V8_G0_CANDIDATE_COUNT = 32 as const;
export const V8_G0_ARM_COUNT = 34 as const;
export const V8_G0_TASKS_PER_RUN = 612 as const;
export const V8_G0_TASK_COUNT = 1_836 as const;

type Winner = "candidate" | "opponent" | "draw";
type V8Case = { populationId: string; populationCaseIndex: number; country: Countries; candidateSlot: 0 | 1;
    repeatIndex: number; requestedEngineSeed: number; candidateStart: string; opponentStart: string };
type PolicyRow = { sha256: string; canonicalJson: string; complexity: { rules: number; predicates: number;
    nonBaselineActions: number } };
type Selection = { cases: V8Case[]; initialPolicies: Record<string, PolicyRow[]> };
type Arm = { id: "deployed_strongbot" | "external_supalosa" | "policy"; policyIndex: number | null;
    policy: CanonicalV8Policy | null; policyRow: PolicyRow | null };

const requiredPath = (name: string) => { const value = process.env[name]; if (!value) throw new Error(`${name} required`);
    return path.resolve(value); };
const requiredText = (name: string, pattern: RegExp) => { const value = process.env[name];
    if (!value || !pattern.test(value)) throw new Error(`${name} invalid`); return value; };
const hashText = (value: string) => crypto.createHash("sha256").update(value).digest("hex");
const hashFile = (file: string) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const isRecord = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);

const sourceIdentity = () => { const repo = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim(),
    commit = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
    if (execFileSync("git", ["branch", "--show-current"], { encoding: "utf8" }).trim() !== "main" ||
        execFileSync("git", ["status", "--short", "--untracked-files=no"], { encoding: "utf8" }).trim() ||
        execFileSync("git", ["rev-parse", "fork/main"], { encoding: "utf8" }).trim() !== commit)
        throw new Error("V8 G0 requires clean synchronized main"); return { repo, commit }; };
const commonInputs = () => { if (process.env.SLURM_JOB_ACCOUNT !== "pi_jss233") throw new Error("V8 G0 requires pi_jss233");
    const mixDir = requiredPath("MIX_DIR"), protocolPath = requiredPath("PROTOCOL_PATH"),
        assetManifestPath = requiredPath("ASSET_MANIFEST_PATH"), freezeRoot = requiredPath("RA2WEB_FREEZE_ROOT"),
        protocolSha256 = requiredText("PROTOCOL_SHA256", SHA256), assetManifestSha256 = requiredText("ASSET_MANIFEST_SHA256", SHA256);
    if (hashFile(protocolPath) !== protocolSha256 || protocolSha256 !== ORIGINAL_PROTOCOL_SHA256 ||
        hashFile(assetManifestPath) !== assetManifestSha256 || hashFile(path.join(mixDir, MAP.name)) !== MAP.sha256)
        throw new Error("V8 G0 inputs drifted");
    const manifest = JSON.parse(fs.readFileSync(assetManifestPath, "utf8"));
    if (!isRecord(manifest) || manifest.kind !== "private-ra2-snow-runtime" ||
        path.resolve(String(manifest.runtimeDirectory)) !== mixDir) throw new Error("V8 G0 runtime drifted");
    return { mixDir, protocolSha256, assetManifestSha256, freezeRoot }; };
const assertBaseline = (factory: BaselineFactory) => { if (factory.descriptor.kind !== "external-package" ||
    typeof factory.descriptor.packageRoot !== "string") throw new Error("V8 G0 baseline external required");
    const packageRoot = path.resolve(factory.descriptor.packageRoot), repo = execFileSync("git",
        ["-C", packageRoot, "rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
    if (execFileSync("git", ["-C", repo, "rev-parse", "HEAD"], { encoding: "utf8" }).trim() !== BASELINE_COMMIT ||
        execFileSync("git", ["-C", repo, "status", "--short", "--untracked-files=no"], { encoding: "utf8" }).trim())
        throw new Error("V8 G0 baseline drifted"); };
const loadAdvanced = (root: string) => { const loaded = loadRa2WebOpponent(root, "ra2web_advanced_old_priest");
    if (loaded.bundleSha256 !== ADVANCED_SHA256 || loaded.freezeManifestSha256 !== RA2WEB_FREEZE_MANIFEST_SHA256)
        throw new Error("V8 G0 Advanced drifted"); return loaded; };
const settings = (candidate: Bot, opponent: Bot, slot: 0 | 1): CreateOfflineOpts => ({ buildOffAlly: false,
    cratesAppear: false, credits: 10_000, gameMode: cdapi.getAvailableGameModes(MAP.name)[0], gameSpeed: 6,
    mapName: MAP.name, mcvRepacks: true, shortGame: false, superWeapons: false, unitCount: 0, online: false,
    agents: slot === 0 ? [candidate, opponent] : [opponent, candidate] });

const loadSelection = (file: string, expectedHash: string, inputs: ReturnType<typeof commonInputs>): Selection => {
    if (hashFile(file) !== expectedHash) throw new Error("V8 G0 selection hash drifted"); const value = JSON.parse(fs.readFileSync(file, "utf8"));
    if (value.kind !== "hfo-advanced-v8-master-selection" || value.complete !== true || value.passed !== true ||
        value.outcomeFree !== true || value.updateCount !== 0 || value.protocolSha256 !== ORIGINAL_PROTOCOL_SHA256 ||
        value.assetManifestSha256 !== inputs.assetManifestSha256 || value.baselineCommit !== BASELINE_COMMIT ||
        value.ra2webClientCommit !== RA2WEB_CLIENT_COMMIT || value.freezeManifestSha256 !== RA2WEB_FREEZE_MANIFEST_SHA256 ||
        value.advancedBundleSha256 !== ADVANCED_SHA256 || !Array.isArray(value.cases) || value.cases.length !== V8_SELECTION_CASE_COUNT)
        throw new Error("V8 G0 selection ineligible"); return value as Selection; };
const parsePolicy = (row: PolicyRow): CanonicalV8Policy => { const parsed = JSON.parse(row.canonicalJson), policy = canonicalizeV8Policy(parsed);
    if (policy.sha256 !== row.sha256 || JSON.stringify(policy.complexity) !== JSON.stringify(row.complexity))
        throw new Error("V8 G0 policy identity drifted"); return policy; };
export const v8G0Arms = (selection: Selection, runIndex: number): Arm[] => {
    if (runIndex < 0 || runIndex >= 3) throw new Error("V8 G0 run invalid");
    const rows = selection.initialPolicies[String(V8_SEARCH_SEEDS[runIndex])];
    if (!Array.isArray(rows) || rows.length !== 32 || new Set(rows.map((row) => row.sha256)).size !== 32)
        throw new Error("V8 G0 initial policy set invalid");
    return [{ id: "deployed_strongbot", policyIndex: null, policy: null, policyRow: null },
        { id: "external_supalosa", policyIndex: null, policy: null, policyRow: null },
        ...rows.map((row, policyIndex) => ({ id: "policy" as const, policyIndex, policy: parsePolicy(row), policyRow: row }))]; };
export const v8G0Assignment = (taskIndex: number) => { if (taskIndex < 0 || taskIndex >= V8_G0_TASK_COUNT)
    throw new Error("V8 G0 task invalid"); const runIndex = Math.floor(taskIndex / V8_G0_TASKS_PER_RUN),
        local = taskIndex % V8_G0_TASKS_PER_RUN, armIndex = Math.floor(local / V8_G0_CASE_COUNT),
        caseIndex = local % V8_G0_CASE_COUNT; return { runIndex, armIndex, caseIndex }; };

const inventory = (game: GameApi, candidateName: string, opponentName: string) => { const units = game.getAllUnits()
    .map((id) => game.getUnitData(id)).filter((unit): unit is UnitData => !!unit &&
        (unit.owner === candidateName || unit.owner === opponentName));
    const summarize = (owner: string) => Object.fromEntries([...new Set(units.filter((unit) => unit.owner === owner)
        .map((unit) => unit.rules.name))].sort().map((name) => [name, units.filter((unit) => unit.owner === owner &&
            unit.rules.name === name).length])); return { candidate: summarize(candidateName), opponent: summarize(opponentName) }; };
const trajectory = (game: GameApi, candidateName: string, opponentName: string) => game.getAllUnits().map((id) =>
    game.getUnitData(id)).filter((unit): unit is UnitData => !!unit && (unit.owner === candidateName || unit.owner === opponentName))
    .map((unit) => ({ owner: unit.owner === candidateName ? "candidate" : "opponent", rule: unit.rules.name,
        type: unit.rules.type, hp: unit.hitPoints, x: unit.tile.rx, y: unit.tile.ry })).sort((a, b) =>
            JSON.stringify(a).localeCompare(JSON.stringify(b)));

const runCell = async () => {
    const taskIndex = Number(requiredText("TASK_INDEX", /^\d+$/)), out = requiredPath("OUT_PATH"),
        programPath = requiredPath("PROGRAM_PATH"), programSha256 = requiredText("PROGRAM_SHA256", SHA256),
        selectionPath = requiredPath("SELECTION_PATH"), selectionSha256 = requiredText("SELECTION_SHA256", SHA256), inputs = commonInputs();
    if (process.env.SLURM_ARRAY_TASK_ID !== String(taskIndex) || hashFile(programPath) !== programSha256 || fs.existsSync(out))
        throw new Error("V8 G0 assignment drifted");
    const selection = loadSelection(selectionPath, selectionSha256, inputs), assignment = v8G0Assignment(taskIndex),
        populationId = `run-${assignment.runIndex}-generation-0`, cases = selection.cases.filter((row) => row.populationId === populationId)
            .sort((a, b) => a.populationCaseIndex - b.populationCaseIndex), caseSpec = cases[assignment.caseIndex],
        arms = v8G0Arms(selection, assignment.runIndex), arm = arms[assignment.armIndex];
    if (cases.length !== 18 || !caseSpec || !arm) throw new Error("V8 G0 case/arm missing");
    const { repo, commit } = sourceIdentity(); await cdapi.init(inputs.mixDir);
    const baseline = await loadBaselineFactory(path.join(repo, "packages", "chronodivide-bot")); assertBaseline(baseline);
    const advanced = loadAdvanced(inputs.freezeRoot), candidateName = `V8G0Candidate_${assignment.runIndex}_${assignment.caseIndex}`,
        opponentName = `V8G0Advanced_${assignment.runIndex}_${assignment.caseIndex}`;
    let candidate: any, controller: ReturnType<typeof decorateWithV8Controller> | null = null;
    if (arm.id === "external_supalosa") candidate = baseline.create(candidateName, caseSpec.country);
    else { candidate = new StrongBot(candidateName, caseSpec.country, [], false);
        if (arm.policy) { controller = decorateWithV8Controller(candidate, opponentName, caseSpec.country, arm.policy); candidate = controller.bot; } }
    const opponent = createInspectableRa2WebBot(advanced, opponentName, caseSpec.country),
        adjudicator = new LiteralBuildingEliminationAdjudicator({ candidate: candidateName, baseline: opponentName }),
        { audit } = installLiteralEndpointInstrumentation({ candidate, baseline: opponent }, adjudicator);
    const result = await withSeededOfflineGame(cdapi, settings(candidate, opponent, caseSpec.candidateSlot),
        caseSpec.requestedEngineSeed, [{ agent: candidate, identity: "candidate" }, { agent: opponent, identity: "opponent" }],
        async (game) => { const api = candidate.lastGameApi as GameApi | null; if (!api ||
            `${api.getPlayerData(candidateName).startLocation.x},${api.getPlayerData(candidateName).startLocation.y}` !== caseSpec.candidateStart ||
            `${api.getPlayerData(opponentName).startLocation.x},${api.getPlayerData(opponentName).startLocation.y}` !== caseSpec.opponentStart)
            throw new Error("V8 G0 selected start/API drifted");
            const traceHash = crypto.createHash("sha256"); let updates = 0, terminal: any = null, failure: any = null;
            traceHash.update(JSON.stringify(trajectory(api, candidateName, opponentName)) + "\n");
            while (updates < MAX_UPDATES && !terminal && !failure) { adjudicator.beginUpdate(api); await game.update(); updates += 1;
                const stats = game.getPlayerStats(), candidateStats = stats.find((row) => row.name === candidateName),
                    opponentStats = stats.find((row) => row.name === opponentName); if (!candidateStats || !opponentStats)
                        throw new Error("V8 G0 stats missing"); const endpoint = adjudicator.completeUpdate(api,
                            { finished: game.isFinished(), defeated: { candidate: candidateStats.defeated,
                                baseline: opponentStats.defeated } }); terminal = endpoint.terminal; failure = endpoint.technicalFailure;
                if (updates % 60 === 0) traceHash.update(JSON.stringify(trajectory(api, candidateName, opponentName)) + "\n"); }
            if (failure) throw new Error(`V8 G0 endpoint failure ${JSON.stringify(failure)}`);
            const buildings = snapshotCombatantBuildings(api, { candidate: candidateName, baseline: opponentName }),
                winner: Winner = terminal?.winner === "candidate" ? "candidate" : terminal?.winner === "baseline" ? "opponent" : "draw";
            return { runIndex: assignment.runIndex, taskIndex, armIndex: assignment.armIndex, armId: arm.id,
                policyIndex: arm.policyIndex, policySha256: arm.policy?.sha256 ?? null, caseIndex: assignment.caseIndex,
                populationId, populationCaseIndex: caseSpec.populationCaseIndex, country: caseSpec.country,
                side: ALLIED.has(caseSpec.country) ? "Allied" : "Soviet", candidateSlot: caseSpec.candidateSlot,
                requestedEngineSeed: caseSpec.requestedEngineSeed, candidateStart: caseSpec.candidateStart,
                opponentStart: caseSpec.opponentStart, updates, status: terminal?.status ?? "tick_cap_draw", winner,
                trajectorySha256: traceHash.digest("hex"), terminalBuildingCounts: {
                    candidate: buildings.filter((row) => row.owner === candidateName).length,
                    opponent: buildings.filter((row) => row.owner === opponentName).length },
                terminalInventory: inventory(api, candidateName, opponentName), quitAttempts: { ...audit.attempts },
                quitForwarded: { ...audit.forwarded }, controllerAudit: controller ? {
                    ownershipSha256: hashText(JSON.stringify(controller.ownershipEvents)),
                    controllerSha256: hashText(JSON.stringify(controller.controllerEvents)),
                    detector: controller.state().detected, active: controller.state().active,
                    suppressedOwnedCalls: controller.ownershipEvents.filter((event) => event.disposition === "suppressed").length,
                    controllerEvents: controller.controllerEvents.length } : null };
        });
    const provenance = createExperimentManifest({ runId: `hfo-advanced-v8-g0-${taskIndex}-${process.env.SLURM_JOB_ID}`,
        mixDir: inputs.mixDir, maps: [MAP.name], effectiveConfig: { taskIndex, assignment, armId: arm.id,
            policySha256: arm.policy?.sha256 ?? null, caseSpec, selectionSha256 }, baseline: baseline.descriptor,
        gameSeedBase: caseSpec.requestedEngineSeed });
    const artifact = { schemaVersion: 1, kind: "hfo-advanced-v8-generation-0-cell",
        status: "COMPLETE_HFO_ADVANCED_V8_GENERATION_0_CELL", complete: true, taskIndex,
        schedulerAccount: "pi_jss233", schedulerJobId: process.env.SLURM_JOB_ID, sourceCommit: commit, programSha256,
        protocolSha256: inputs.protocolSha256, assetManifestSha256: inputs.assetManifestSha256, selectionSha256,
        baselineCommit: BASELINE_COMMIT, ra2webClientCommit: RA2WEB_CLIENT_COMMIT,
        ra2webClientReleaseId: RA2WEB_CLIENT_RELEASE_ID, freezeManifestSha256: advanced.freezeManifestSha256,
        advancedBundleSha256: advanced.bundleSha256, result, provenance };
    fs.mkdirSync(path.dirname(out), { recursive: true, mode: 0o700 });
    fs.writeFileSync(out, JSON.stringify(artifact, null, 2) + "\n", { flag: "wx", mode: 0o600 });
    console.log(JSON.stringify({ status: artifact.status, taskIndex, run: assignment.runIndex, arm: arm.id }));
};

const completedTasks = (job: string) => { const raw = execFileSync("/opt/slurm/current/bin/sacct",
    ["-j", job, "-n", "-P", "-X", "--format=JobID,JobIDRaw,State,ExitCode,Account"], { encoding: "utf8" }),
    tasks = new Map<number, string>(); for (const line of raw.split("\n").filter(Boolean)) { const [label, rawId, state, exit, account] = line.split("|"),
        match = new RegExp(`^${job}_(\\d+)$`).exec(label); if (match && state === "COMPLETED" && exit === "0:0" &&
            account === "pi_jss233") tasks.set(+match[1], rawId); } return tasks; };
const score = (winner: Winner) => winner === "candidate" ? 1 : winner === "draw" ? 0.5 : 0;
const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;
const sampleSd = (values: number[]) => { const average = mean(values); return Math.sqrt(values.reduce((sum, value) =>
    sum + (value - average) ** 2, 0) / (values.length - 1)); };
const median = (values: number[]) => { if (!values.length) return null; const sorted = [...values].sort((a, b) => a - b),
    m = Math.floor(sorted.length / 2); return sorted.length % 2 ? sorted[m] : (sorted[m - 1] + sorted[m]) / 2; };
const summarize = (rows: any[]) => { const wins = rows.filter((row) => row.winner === "candidate").length,
    losses = rows.filter((row) => row.winner === "opponent").length, draws = rows.length - wins - losses;
    return { games: rows.length, wins, draws, losses, winRate: wins / rows.length,
        scoreRate: mean(rows.map((row) => score(row.winner))),
        medianWinUpdates: median(rows.filter((row) => row.winner === "candidate").map((row) => row.updates)) }; };

export const deriveV8Generation1 = (survivors: any[], runIndex: number, priorHashes: Set<string>) => {
    const parents = survivors.map((row) => row.policy as CanonicalV8Policy), output: CanonicalV8Policy[] = parents.slice(0, 4),
        seen = new Set([...priorHashes, ...output.map((row) => row.sha256)]), seed = V8_SEARCH_SEEDS[runIndex];
    for (let child = 0; child < 8; child += 1) { let attempt = 0, candidate: CanonicalV8Policy;
        do { candidate = mutateV8Policy(parents[child % 8], seed + 1_000 + child * 100 + attempt++); }
        while (seen.has(candidate.sha256) && attempt < 100); if (seen.has(candidate.sha256)) throw new Error("V8 G1 mutation collision");
        seen.add(candidate.sha256); output.push(candidate); }
    for (let child = 0; child < 4; child += 1) { let attempt = 0, candidate: CanonicalV8Policy;
        do { candidate = crossoverV8Policy(parents[child], parents[child + 4], seed + 2_000 + child * 100 + attempt++); }
        while (seen.has(candidate.sha256) && attempt < 100); if (seen.has(candidate.sha256)) throw new Error("V8 G1 crossover collision");
        seen.add(candidate.sha256); output.push(candidate); }
    if (output.length !== 16 || new Set(output.map((row) => row.sha256)).size !== 16) throw new Error("V8 G1 generation invalid");
    return output;
};

const finalize = () => {
    const root = requiredPath("RESULTS_ROOT"), out = requiredPath("OUT_PATH"), arrayJobId = requiredText("ARRAY_JOB_ID", /^\d+$/),
        programSha256 = requiredText("PROGRAM_SHA256", SHA256), cellProgramSha256 = requiredText("CELL_PROGRAM_SHA256", SHA256),
        selectionPath = requiredPath("SELECTION_PATH"), selectionSha256 = requiredText("SELECTION_SHA256", SHA256), inputs = commonInputs();
    if (fs.existsSync(out)) throw new Error("V8 G0 aggregate exists"); const { commit } = sourceIdentity(),
        selection = loadSelection(selectionPath, selectionSha256, inputs);
    let tasks = new Map<number, string>(); for (let attempt = 0; attempt < 31; attempt += 1) { tasks = completedTasks(arrayJobId);
        if (tasks.size === V8_G0_TASK_COUNT) break; if (attempt < 30) execFileSync("sleep", ["2"]); }
    if (tasks.size !== V8_G0_TASK_COUNT) throw new Error(`V8 G0 scheduler ${tasks.size}/${V8_G0_TASK_COUNT}`);
    const rows: any[] = [];
    for (let taskIndex = 0; taskIndex < V8_G0_TASK_COUNT; taskIndex += 1) { const assignment = v8G0Assignment(taskIndex),
        taskRoot = path.join(root, `task-${String(taskIndex).padStart(4, "0")}`), file = path.join(taskRoot, "cell.json"),
        expected = fs.readFileSync(path.join(taskRoot, "cell.sha256"), "utf8").trim().split(/\s+/)[0];
        if (hashFile(file) !== expected) throw new Error(`V8 G0 checksum ${taskIndex}`); const cell = JSON.parse(fs.readFileSync(file, "utf8"));
        if (cell.kind !== "hfo-advanced-v8-generation-0-cell" || cell.complete !== true || cell.taskIndex !== taskIndex ||
            cell.result.runIndex !== assignment.runIndex || cell.result.armIndex !== assignment.armIndex ||
            cell.result.caseIndex !== assignment.caseIndex || String(cell.schedulerJobId) !== tasks.get(taskIndex) ||
            cell.sourceCommit !== commit || cell.programSha256 !== cellProgramSha256 || cell.protocolSha256 !== inputs.protocolSha256 ||
            cell.assetManifestSha256 !== inputs.assetManifestSha256 || cell.selectionSha256 !== selectionSha256 ||
            cell.baselineCommit !== BASELINE_COMMIT || cell.ra2webClientCommit !== RA2WEB_CLIENT_COMMIT ||
            cell.freezeManifestSha256 !== RA2WEB_FREEZE_MANIFEST_SHA256 || cell.advancedBundleSha256 !== ADVANCED_SHA256 ||
            cell.result.quitForwarded?.candidate !== 0 || cell.result.quitForwarded?.baseline !== 0)
            throw new Error(`V8 G0 identity ${taskIndex}`); rows.push(cell.result); }
    const runs = [];
    for (let runIndex = 0; runIndex < 3; runIndex += 1) { const runRows = rows.filter((row) => row.runIndex === runIndex),
        deployed = runRows.filter((row) => row.armId === "deployed_strongbot"), external = runRows.filter((row) => row.armId === "external_supalosa"),
        deployedByCase = new Map(deployed.map((row) => [row.caseIndex, row]));
        if (deployed.length !== 18 || external.length !== 18) throw new Error(`V8 G0 controls ${runIndex}`);
        const initial = v8G0Arms(selection, runIndex).slice(2), candidates = initial.map((arm) => { const candidateRows = runRows.filter((row) =>
            row.policySha256 === arm.policy!.sha256); if (candidateRows.length !== 18) throw new Error("V8 G0 candidate coverage");
            const differences = candidateRows.map((row) => score(row.winner) - score(deployedByCase.get(row.caseIndex).winner)),
                pairedMean = mean(differences), sd = sampleSd(differences), pairedLower = pairedMean - T_CRITICAL_90_DF17 * sd / Math.sqrt(18),
                groupScores = ["Allied", "Soviet"].map((side) => mean(candidateRows.filter((row) => row.side === side)
                    .map((row) => score(row.winner)))).concat([0, 1].map((slot) => mean(candidateRows.filter((row) =>
                        row.candidateSlot === slot).map((row) => score(row.winner))))), summary = summarize(candidateRows);
            return { policySha256: arm.policy!.sha256, policy: arm.policy, summary, minimumSideSlotScore: Math.min(...groupScores),
                paired: { mean: pairedMean, sampleStandardDeviation: sd, tCritical: T_CRITICAL_90_DF17,
                    oneSided90Lower: pairedLower }, complexity: arm.policy!.complexity }; });
        candidates.sort((left, right) => right.minimumSideSlotScore - left.minimumSideSlotScore ||
            right.paired.mean - left.paired.mean || right.paired.oneSided90Lower - left.paired.oneSided90Lower ||
            right.summary.winRate - left.summary.winRate || (left.summary.medianWinUpdates ?? Infinity) -
                (right.summary.medianWinUpdates ?? Infinity) || left.complexity.rules - right.complexity.rules ||
            left.complexity.predicates - right.complexity.predicates || left.complexity.nonBaselineActions -
                right.complexity.nonBaselineActions || left.policySha256.localeCompare(right.policySha256));
        const survivors = candidates.slice(0, 8), priorHashes = new Set(initial.map((arm) => arm.policy!.sha256)),
            generation1 = deriveV8Generation1(survivors, runIndex, priorHashes);
        runs.push({ runIndex, controls: { deployed: summarize(deployed), external: summarize(external) }, candidates,
            survivors: survivors.map((row, rank) => ({ rank, ...row })), generation1: generation1.map((policy, index) =>
                ({ index, sha256: policy.sha256, canonicalJson: policy.canonicalJson, complexity: policy.complexity })) }); }
    const artifact = { schemaVersion: 1, kind: "hfo-advanced-v8-generation-0",
        status: "PASS_HFO_ADVANCED_V8_GENERATION_0", complete: true, passed: true,
        scheduler: { account: "pi_jss233", arrayJobId, taskJobIds: Object.fromEntries(tasks) }, sourceCommit: commit,
        programSha256, cellProgramSha256, protocolSha256: inputs.protocolSha256,
        assetManifestSha256: inputs.assetManifestSha256, selectionSha256, baselineCommit: BASELINE_COMMIT,
        ra2webClientCommit: RA2WEB_CLIENT_COMMIT, freezeManifestSha256: RA2WEB_FREEZE_MANIFEST_SHA256,
        advancedBundleSha256: ADVANCED_SHA256, taskCount: rows.length, runs };
    fs.mkdirSync(path.dirname(out), { recursive: true, mode: 0o700 });
    fs.writeFileSync(out, JSON.stringify(artifact, null, 2) + "\n", { flag: "wx", mode: 0o600 });
    console.log(JSON.stringify({ status: artifact.status, survivors: runs.map((run) => run.survivors.map((row) => row.policySha256)) }));
};

const main = async () => { const mode = process.env.MODE; if (mode === "cell") return runCell();
    if (mode === "finalize") return finalize(); throw new Error("MODE must be cell or finalize"); };
if (process.env.MODE && process.env.MODE !== "test") void main().catch((error) => { console.error(error); process.exitCode = 1; });
