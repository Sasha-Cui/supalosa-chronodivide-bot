import { Bot, CreateOfflineOpts, cdapi } from "@chronodivide/game-api";
import { AttackMissionFactoryTelemetry } from
    "@supalosa/chronodivide-bot/dist/bot/logic/mission/missions/attackMission.js";
import { Countries } from "@supalosa/chronodivide-bot/dist/bot/logic/common/utils.js";
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { loadBaselineFactory } from "../benchmark/baselineLoader.js";
import { createExperimentManifest } from "../benchmark/provenance.js";
import { withSeededOfflineGame } from "../benchmark/seededOfflineGame.js";
import {
    ObjectiveAwareReplacementPriority,
    buildObjectiveAwareReplacementPolicy,
    createObjectiveAwareAttackReplacementCandidate,
    objectiveAwareReplacementPolicySha256,
} from "./objectiveAwareAttackReplacementCandidate.js";
import { buildProgressCertifiedConversionPolicyV5 } from "./progressCertifiedConversionPolicyV5.js";

const COUNTRIES = [
    Countries.USA, Countries.KOREA, Countries.FRANCE, Countries.GERMANY, Countries.GREAT_BRITAIN,
    Countries.LIBYA, Countries.IRAQ, Countries.CUBA, Countries.RUSSIA,
] as const;
const PRIORITIES = ["distance", "strategic", "objective"] as const;
const MAPS = [
    { name: "cd_chrono_offensedefense.map", sha256: "94043927a79a30df9394ac6d6195e0d2926863fdad9c412556d0cc7af409f11a" },
    { name: "cd_chrono_mp25mw.map", sha256: "4b90f4eb66bdc19721b9033a268cbafd1b839ea93ed0ad35d6728485e8a177bf" },
] as const;
const SEED_BASE = 4_227_290_000;
const MAX_TICKS = 12_000;
const SHA256 = /^[0-9a-f]{64}$/;
const fileHash = (filePath: string): string => crypto.createHash("sha256")
    .update(fs.readFileSync(filePath)).digest("hex");
const hash = (value: unknown): string => crypto.createHash("sha256")
    .update(JSON.stringify(value)).digest("hex");
const requiredPath = (name: string): string => {
    const value = process.env[name];
    if (!value) throw new Error(`${name} is required`);
    return path.resolve(value);
};
const requiredText = (name: string, pattern: RegExp): string => {
    const value = process.env[name];
    if (!value || !pattern.test(value)) throw new Error(`${name} is invalid`);
    return value;
};
const isRecord = (value: unknown): value is Record<string, unknown> =>
    !!value && typeof value === "object" && !Array.isArray(value);

const settings = (mapName: string, candidate: Bot, baseline: Bot, slot: 0 | 1): CreateOfflineOpts => {
    const gameMode = cdapi.getAvailableGameModes(mapName)[0];
    if (!gameMode) throw new Error(`No game mode for ${mapName}`);
    return { buildOffAlly: false, cratesAppear: false, credits: 10_000, gameMode, gameSpeed: 6,
        mapName, mcvRepacks: true, shortGame: false, superWeapons: false, unitCount: 0,
        online: false, agents: slot === 0 ? [candidate, baseline] : [baseline, candidate] };
};

const validateEvents = (
    events: readonly AttackMissionFactoryTelemetry[],
    priority: ObjectiveAwareReplacementPriority,
): void => {
    if (events.length === 0) throw new Error(`${priority} replacement created no attack mission`);
    const names = new Set<string>();
    for (const [index, event] of events.entries()) {
        if (event.schemaVersion !== 1 || event.event !== "attack_mission_created" ||
            event.informationBoundary !== "public_complete_state" || event.targetPriority !== priority ||
            !Number.isSafeInteger(event.tick) || event.tick < 0 || !/^attack_\d+$/.test(event.missionName) ||
            names.has(event.missionName) || !isRecord(event.composition) ||
            !isRecord(event.composition.composition) || !Number.isSafeInteger(event.composition.minimumUnits) ||
            !Number.isSafeInteger(event.composition.maximumUnits) || !isRecord(event.target) ||
            !Number.isFinite(event.target.x) || !Number.isFinite(event.target.y) ||
            !Array.isArray(event.forbiddenFieldsEmitted) || event.forbiddenFieldsEmitted.length !== 0 ||
            /(winner|loser|score|outcome|endpoint|resignation|evaluator)/i.test(JSON.stringify(event))) {
            throw new Error(`${priority} replacement telemetry ${index} is invalid`);
        }
        names.add(event.missionName);
    }
};

const runTrace = async (args: {
    factory: Awaited<ReturnType<typeof loadBaselineFactory>>;
    country: Countries;
    countryOrdinal: number;
    slot: 0 | 1;
    mapName: string;
    priority: ObjectiveAwareReplacementPriority;
}): Promise<AttackMissionFactoryTelemetry[]> => {
    const events: AttackMissionFactoryTelemetry[] = [];
    const candidateName = `TargetGateCandidate_${args.countryOrdinal}_${args.slot}_${args.priority}`;
    const baselineName = `TargetGateBaseline_${args.countryOrdinal}_${args.slot}_${args.priority}`;
    const v5 = { ...buildProgressCertifiedConversionPolicyV5(), enabled: false };
    const candidate = createObjectiveAwareAttackReplacementCandidate(
        args.factory, candidateName, args.country, v5,
        buildObjectiveAwareReplacementPolicy(args.priority),
        { v5: () => undefined, attackFactory: (event) => events.push(event) },
    );
    const baseline = args.factory.create(baselineName, args.country);
    const taskIndex = args.countryOrdinal * 2 + args.slot;
    await withSeededOfflineGame(cdapi, settings(args.mapName, candidate, baseline, args.slot),
        SEED_BASE + taskIndex,
        [{ agent: candidate, identity: "candidate" }, { agent: baseline, identity: "baseline" }],
        async (game) => {
            for (let tick = 0; tick < MAX_TICKS && !game.isFinished(); tick += 1) await game.update();
        });
    validateEvents(events, args.priority);
    return events;
};

const cell = async (): Promise<void> => {
    if (process.env.SLURM_JOB_ACCOUNT !== "pi_jss233") throw new Error("Cell requires pi_jss233");
    const taskIndex = Number(requiredText("TASK_INDEX", /^\d+$/));
    const outFile = requiredPath("OUT_FILE");
    const programPath = requiredPath("PROGRAM_PATH");
    const programSha256 = requiredText("PROGRAM_SHA256", SHA256);
    const protocolPath = requiredPath("PROTOCOL_PATH");
    const protocolSha256 = requiredText("PROTOCOL_SHA256", SHA256);
    if (taskIndex < 0 || taskIndex >= 18 || process.env.SLURM_ARRAY_TASK_ID !== String(taskIndex) ||
        fs.existsSync(outFile) || fileHash(programPath) !== programSha256 ||
        fileHash(protocolPath) !== protocolSha256 || !process.env.BASELINE_PACKAGE_ROOT ||
        process.env.REQUIRE_EXTERNAL_BASELINE !== "true") throw new Error("Cell input drifted");
    const repoRoot = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
    const driverRoot = path.join(repoRoot, "packages", "chronodivide-bot-driver");
    const sourceGitCommit = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
    if (execFileSync("git", ["branch", "--show-current"], { encoding: "utf8" }).trim() !== "main" ||
        execFileSync("git", ["status", "--short", "--untracked-files=no"], { encoding: "utf8" }).trim() !== "" ||
        execFileSync("git", ["rev-parse", "fork/main"], { encoding: "utf8" }).trim() !== sourceGitCommit) {
        throw new Error("Cell requires clean pushed main");
    }
    const countryOrdinal = Math.floor(taskIndex / 2);
    const slot = taskIndex % 2 as 0 | 1;
    const country = COUNTRIES[countryOrdinal];
    const map = MAPS[taskIndex % MAPS.length];
    if (fileHash(path.join(driverRoot, "data", map.name)) !== map.sha256) throw new Error("Gate map drifted");
    await cdapi.init(path.join(driverRoot, "data"));
    const factory = await loadBaselineFactory(path.join(repoRoot, "packages", "chronodivide-bot"));
    const manifest = createExperimentManifest({ runId: `target-gate-${taskIndex}-${process.env.SLURM_JOB_ID}`,
        mixDir: path.join(driverRoot, "data"), maps: [map.name], effectiveConfig: { taskIndex, country,
            slot, priorities: PRIORITIES, repeats: 2, seed: SEED_BASE + taskIndex, maxTicks: MAX_TICKS,
            outcomeFieldsWritten: false }, baseline: factory.descriptor, gameSeedBase: SEED_BASE + taskIndex });
    if (manifest.scheduler.account !== "pi_jss233" || manifest.source.gitCommit !== sourceGitCommit ||
        manifest.source.trackedDirty !== false || manifest.software.baseline.kind !== "external-package" ||
        manifest.software.baseline.trackedDirty !== false || manifest.inputs.maps[0]?.sha256 !== map.sha256) {
        throw new Error("Cell provenance failed");
    }
    const priorities = [];
    for (const priority of PRIORITIES) {
        const first = await runTrace({ factory, country, countryOrdinal, slot, mapName: map.name, priority });
        const second = await runTrace({ factory, country, countryOrdinal, slot, mapName: map.name, priority });
        if (JSON.stringify(first) !== JSON.stringify(second)) throw new Error(`${priority} repeat is nondeterministic`);
        priorities.push({ priority, policySha256: objectiveAwareReplacementPolicySha256(
            buildObjectiveAwareReplacementPolicy(priority)), telemetrySha256: hash(first), missionCount: first.length,
            firstCompositionSha256: hash(first[0].composition), firstMissionTick: first[0].tick });
    }
    if (new Set(priorities.map(({ firstCompositionSha256 }) => firstCompositionSha256)).size !== 1 ||
        new Set(priorities.map(({ firstMissionTick }) => firstMissionTick)).size !== 1) {
        throw new Error("Replacement priorities did not receive the same first composition and schedule");
    }
    const artifact = { schemaVersion: 1, kind: "objective-aware-attack-replacement-outcome-blind-cell",
        status: "PASS_OBJECTIVE_AWARE_REPLACEMENT_CELL", complete: true, passed: true, outcomeFree: true,
        taskIndex, country, candidateSlot: slot, map, launchedGameCount: 6, schedulerAccount: "pi_jss233",
        schedulerJobId: process.env.SLURM_JOB_ID, sourceGitCommit, programSha256, protocolSha256,
        priorities, provenance: manifest };
    fs.writeFileSync(outFile, JSON.stringify(artifact, null, 2) + "\n", { flag: "wx", mode: 0o600 });
    console.log(JSON.stringify({ status: artifact.status, taskIndex, missionCounts: priorities.map((p) => p.missionCount) }));
};

const finalize = (): void => {
    if (process.env.SLURM_JOB_ACCOUNT !== "pi_jss233") throw new Error("Controller requires pi_jss233");
    const resultsRoot = requiredPath("RESULTS_ROOT");
    const outFile = requiredPath("OUT_FILE");
    const arrayJobId = requiredText("ARRAY_JOB_ID", /^\d+$/);
    const programSha256 = requiredText("PROGRAM_SHA256", SHA256);
    const protocolSha256 = requiredText("PROTOCOL_SHA256", SHA256);
    if (fs.existsSync(outFile)) throw new Error("Controller output already exists");
    const raw = execFileSync("/opt/slurm/current/bin/sacct",
        ["-j", arrayJobId, "-n", "-P", "-X", "--format=JobID,JobIDRaw,State,ExitCode,Account"],
        { encoding: "utf8" });
    const tasks = new Map<number, string>();
    for (const line of raw.split("\n").filter(Boolean)) {
        const [logical, scheduler, state, exitCode, account] = line.split("|");
        const match = new RegExp(`^${arrayJobId}_(\\d+)$`).exec(logical);
        if (match && state === "COMPLETED" && exitCode === "0:0" && account === "pi_jss233") {
            tasks.set(Number(match[1]), scheduler);
        }
    }
    if (tasks.size !== 18) throw new Error(`Controller found ${tasks.size}/18 successful tasks`);
    const cells: Record<string, unknown>[] = [];
    for (let taskIndex = 0; taskIndex < 18; taskIndex += 1) {
        const filePath = path.join(resultsRoot, `task-${String(taskIndex).padStart(2, "0")}`, "cell.json");
        const value = JSON.parse(fs.readFileSync(filePath, "utf8")) as unknown;
        if (!isRecord(value) || value.kind !== "objective-aware-attack-replacement-outcome-blind-cell" ||
            value.status !== "PASS_OBJECTIVE_AWARE_REPLACEMENT_CELL" || value.passed !== true ||
            value.outcomeFree !== true || value.taskIndex !== taskIndex || value.launchedGameCount !== 6 ||
            value.schedulerAccount !== "pi_jss233" || String(value.schedulerJobId) !== tasks.get(taskIndex) ||
            value.programSha256 !== programSha256 || value.protocolSha256 !== protocolSha256 ||
            !Array.isArray(value.priorities) || value.priorities.length !== 3) {
            throw new Error(`Controller cell ${taskIndex} drifted`);
        }
        cells.push(value);
    }
    const priorityMissionCounts = Object.fromEntries(PRIORITIES.map((priority) => [priority,
        cells.reduce((sum, cell) => sum + Number((cell.priorities as any[])
            .find((row) => row.priority === priority)?.missionCount ?? 0), 0)]));
    const passed = Object.values(priorityMissionCounts).every((count) => count > 0);
    const artifact = { schemaVersion: 1, kind: "objective-aware-attack-replacement-outcome-blind-gate",
        status: passed ? "PASS_OBJECTIVE_AWARE_ATTACK_REPLACEMENT_GATE" :
            "FAIL_OBJECTIVE_AWARE_ATTACK_REPLACEMENT_GATE", complete: true, passed, outcomeFree: true,
        schedulerAccount: "pi_jss233", arrayJobId, controllerJobId: process.env.SLURM_JOB_ID,
        launchedGameCount: 108, countryCount: 9, reciprocalSlotCount: 2, priorities: PRIORITIES,
        sourceGitCommit: cells[0].sourceGitCommit, programSha256, protocolSha256,
        schedulerJobIds: [...tasks.values()].sort((a, b) => Number(a) - Number(b)),
        priorityMissionCounts, cells };
    fs.writeFileSync(outFile, JSON.stringify(artifact, null, 2) + "\n", { flag: "wx", mode: 0o600 });
    console.log(JSON.stringify({ status: artifact.status, priorityMissionCounts }));
    if (!passed) process.exitCode = 2;
};

const main = async (): Promise<void> => {
    const mode = requiredText("MODE", /^(cell|finalize)$/);
    if (mode === "cell") await cell(); else finalize();
};
const invoked = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (import.meta.url === invoked) main().catch((error) => { console.error(error); process.exitCode = 1; });
