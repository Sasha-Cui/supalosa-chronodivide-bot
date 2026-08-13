import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { CreateOfflineOpts, QueueType, UnitData, cdapi } from "@chronodivide/game-api";
import { Countries } from "@supalosa/chronodivide-bot/dist/bot/logic/common/utils.js";
import { loadBaselineFactory } from "../benchmark/baselineLoader.js";
import { createExperimentManifest } from "../benchmark/provenance.js";
import { derivePairedEngineSeed, withSeededOfflineGame } from "../benchmark/seededOfflineGame.js";
import { sha256File } from "./methodV5PlanRunner.js";
import { METHOD_V5_EQUIVALENCE_MAP_SHA256 } from "./methodV5BaselineEquivalence.js";
import { createTerminalObjectiveCandidate } from "./terminalObjectiveStrategy.js";
import { buildTerminalRaceArms } from "./terminalRacePolicy.js";

export const TERMINAL_RACE_EQUIVALENCE_MAX_TICKS = 1_200 as const;
export const TERMINAL_RACE_EQUIVALENCE_ENGINE_SEED_BASE = 4_140_000_000 as const;

type Factory = Awaited<ReturnType<typeof loadBaselineFactory>>;
type BotType = ReturnType<Factory["create"]>;
type Snapshot = {
    tick: number;
    credits: number;
    units: Array<{ id: number; name: string; x: number; y: number; hitPoints: number }>;
    queues: Array<{ queue: number; payload: unknown }>;
};
type Trace = { candidate: Snapshot[]; opponent: Snapshot[] };

const requiredPath = (name: string): string => {
    const value = process.env[name];
    if (!value) throw new Error(`${name} is required`);
    return path.resolve(value);
};

const snapshot = (bot: BotType, tick: number): Snapshot => {
    if (!bot.lastGameApi || !bot.lastPlayerProduction) throw new Error(`Missing external state at tick ${tick}`);
    const game = bot.lastGameApi;
    return {
        tick,
        credits: game.getPlayerData(bot.name).credits,
        units: game.getVisibleUnits(bot.name, "self")
            .map((id) => game.getUnitData(id))
            .filter((unit): unit is UnitData => !!unit)
            .map((unit) => ({
                id: unit.id,
                name: unit.rules.name,
                x: unit.tile.rx,
                y: unit.tile.ry,
                hitPoints: unit.hitPoints,
            })).sort((left, right) => left.id - right.id),
        queues: [
            QueueType.Structures, QueueType.Armory, QueueType.Infantry,
            QueueType.Vehicles, QueueType.Aircrafts,
        ].map((queue) => ({ queue, payload: bot.lastPlayerProduction?.getQueueData(queue) })),
    };
};

const settings = (
    mapName: string,
    candidate: BotType,
    baseline: BotType,
    candidateSlot: 0 | 1,
): CreateOfflineOpts => ({
    buildOffAlly: false,
    cratesAppear: false,
    credits: 10_000,
    gameMode: cdapi.getAvailableGameModes(mapName)[0],
    gameSpeed: 6,
    mapName,
    mcvRepacks: true,
    shortGame: false,
    superWeapons: false,
    unitCount: 0,
    online: false,
    agents: candidateSlot === 0 ? [candidate, baseline] : [baseline, candidate],
});

const run = async (
    factory: Factory,
    mapName: string,
    country: Countries,
    candidateSlot: 0 | 1,
    requestedEngineSeed: number,
    wrapped: boolean,
): Promise<Trace> => {
    const control = buildTerminalRaceArms().find(({ armId }) => armId === "baseline_control");
    if (!control) throw new Error("Terminal-race baseline_control is unavailable");
    const candidateName = `Candidate_${country}_${candidateSlot}`;
    const opponentName = `Opponent_${country}_${candidateSlot}`;
    const candidate = wrapped
        ? createTerminalObjectiveCandidate(factory, candidateName, country, control.policy, () => {
            throw new Error("Disabled terminal-race control emitted telemetry");
        })
        : factory.create(candidateName, country);
    const opponent = factory.create(opponentName, country);
    const trace: Trace = { candidate: [], opponent: [] };
    await withSeededOfflineGame(
        cdapi,
        settings(mapName, candidate, opponent, candidateSlot),
        requestedEngineSeed,
        [{ agent: candidate, identity: "candidate" }, { agent: opponent, identity: "baseline" }],
        async (game) => {
            for (let tick = 1; tick <= TERMINAL_RACE_EQUIVALENCE_MAX_TICKS; tick += 1) {
                if (game.isFinished()) throw new Error(`Equivalence game ended at tick ${tick}`);
                await game.update();
                if (tick % 300 === 0) {
                    trace.candidate.push(snapshot(candidate, tick));
                    trace.opponent.push(snapshot(opponent, tick));
                }
            }
        },
    );
    return trace;
};

const main = async (): Promise<void> => {
    const repoRoot = path.resolve(process.cwd(), "..", "..");
    const outFile = requiredPath("OUT_FILE");
    if (fs.existsSync(outFile)) throw new Error(`Refusing to overwrite ${outFile}`);
    if (!process.env.BASELINE_PACKAGE_ROOT || process.env.REQUIRE_EXTERNAL_BASELINE !== "true") {
        throw new Error("Terminal-race equivalence requires the pinned external baseline");
    }
    const mapName = "simple-1v1-no-preview.map";
    if (sha256File(path.join(process.cwd(), "data", mapName)) !== METHOD_V5_EQUIVALENCE_MAP_SHA256) {
        throw new Error("Terminal-race equivalence map bytes drifted");
    }
    const factory = await loadBaselineFactory(path.join(repoRoot, "packages", "chronodivide-bot"));
    const control = buildTerminalRaceArms().find(({ armId }) => armId === "baseline_control")!;
    const rows: Array<Record<string, unknown>> = [];
    await cdapi.init(path.join(process.cwd(), "data"));
    let index = 0;
    for (const country of Object.values(Countries)) for (const candidateSlot of [0, 1] as const) {
        const requestedEngineSeed = derivePairedEngineSeed(
            TERMINAL_RACE_EQUIVALENCE_ENGINE_SEED_BASE,
            index++,
        );
        const wrapped = await run(factory, mapName, country, candidateSlot, requestedEngineSeed, true);
        const unwrapped = await run(factory, mapName, country, candidateSlot, requestedEngineSeed, false);
        const equal = JSON.stringify(wrapped) === JSON.stringify(unwrapped);
        if (!equal) throw new Error(`Disabled terminal-race layer drifted for ${country} slot ${candidateSlot}`);
        rows.push({ country, candidateSlot, requestedEngineSeed, wrapped, unwrapped, equal });
    }
    const manifest = createExperimentManifest({
        runId: `terminal-race-equivalence-${process.env.SLURM_JOB_ID ?? "local"}`,
        mixDir: path.join(process.cwd(), "data"),
        maps: [mapName],
        effectiveConfig: {
            purpose: "outcome-free-terminal-race-external-baseline-identity",
            countries: Object.values(Countries),
            reciprocalSlots: [0, 1],
            maxTicks: TERMINAL_RACE_EQUIVALENCE_MAX_TICKS,
            outcomeInspection: false,
        },
        baseline: factory.descriptor,
        gameSeedBase: TERMINAL_RACE_EQUIVALENCE_ENGINE_SEED_BASE,
    });
    if (
        manifest.scheduler.account !== "pi_jss233" || manifest.source.gitBranch !== "main" ||
        manifest.source.trackedDirty !== false || manifest.software.baseline.kind !== "external-package" ||
        manifest.software.baseline.trackedDirty !== false || rows.length !== 18
    ) throw new Error("Terminal-race equivalence provenance or coverage failed");
    const output = {
        schemaVersion: 1,
        status: "PASS_OUTCOME_FREE_TERMINAL_RACE_EXTERNAL_BASELINE_IDENTITY",
        generatedAt: new Date().toISOString(),
        passed: true,
        outcomeFree: true,
        sourceGitCommit: manifest.source.gitCommit,
        scheduler: manifest.scheduler,
        externalBaseline: manifest.software.baseline,
        policyId: control.policyId,
        countryCount: Object.values(Countries).length,
        reciprocalSlotCount: 2,
        gameCount: rows.length * 2,
        maxTicks: TERMINAL_RACE_EQUIVALENCE_MAX_TICKS,
        implementationInvariant: "disabled terminal-race candidate returns baselineFactory.create exactly",
        rows,
    };
    fs.mkdirSync(path.dirname(outFile), { recursive: true, mode: 0o700 });
    fs.writeFileSync(outFile, JSON.stringify(output, null, 2) + "\n", { flag: "wx", mode: 0o600 });
    console.log(JSON.stringify({ outFile, sha256: sha256File(outFile), status: output.status, gameCount: output.gameCount }));
};

const invoked = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (import.meta.url === invoked) main().catch((error) => { console.error(error); process.exitCode = 1; });
