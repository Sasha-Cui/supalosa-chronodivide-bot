import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { CreateOfflineOpts, QueueType, UnitData, cdapi } from "@chronodivide/game-api";
import { Countries } from "@supalosa/chronodivide-bot/dist/bot/logic/common/utils.js";
import { loadBaselineFactory } from "../benchmark/baselineLoader.js";
import { createExperimentManifest } from "../benchmark/provenance.js";
import { derivePairedEngineSeed, withSeededOfflineGame } from "../benchmark/seededOfflineGame.js";
import { createMethodV5Candidate } from "./methodV5Closeout.js";
import { buildMethodV5CloseoutArms } from "./methodV5CloseoutPolicies.js";
import { sha256File } from "./methodV5PlanRunner.js";

export const METHOD_V5_EQUIVALENCE_MAX_TICKS = 1_200 as const;
export const METHOD_V5_EQUIVALENCE_ENGINE_SEED_BASE = 3_590_000_000 as const;
export const METHOD_V5_EQUIVALENCE_MAP_SHA256 =
    "bd61bb9ab4412b15895c89188336ab53b03dd20879936b92aaf4418e091cf7fc" as const;

type Factory = Awaited<ReturnType<typeof loadBaselineFactory>>;
type BotType = ReturnType<Factory["create"]>;
type Snapshot = {
    tick: number;
    credits: number;
    units: Array<{ id: number; name: string; x: number; y: number; hitPoints: number }>;
    queues: Array<{ queue: number; payload: unknown }>;
};
type TrialTrace = { candidate: Snapshot[]; opponent: Snapshot[] };

const requiredPath = (name: string): string => {
    const value = process.env[name];
    if (!value) throw new Error(`${name} is required`);
    return path.resolve(value);
};
const snapshot = (bot: BotType, tick: number): Snapshot => {
    if (!bot.lastGameApi || !bot.lastPlayerProduction) throw new Error(`Missing external-bot state at tick ${tick}`);
    const game = bot.lastGameApi;
    const units = game.getVisibleUnits(bot.name, "self")
        .map((id) => game.getUnitData(id)).filter((unit): unit is UnitData => !!unit)
        .map((unit) => ({ id: unit.id, name: unit.rules.name, x: unit.tile.rx, y: unit.tile.ry, hitPoints: unit.hitPoints }))
        .sort((a, b) => a.id - b.id);
    const queues = [QueueType.Structures, QueueType.Armory, QueueType.Infantry, QueueType.Vehicles, QueueType.Aircrafts]
        .map((queue) => ({ queue, payload: bot.lastPlayerProduction?.getQueueData(queue) }));
    return { tick, credits: game.getPlayerData(bot.name).credits, units, queues };
};
const buildSettings = (mapName: string, candidate: BotType, baseline: BotType, candidateSlot: 0 | 1): CreateOfflineOpts => ({
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
const runTrial = async (
    factory: Factory,
    mapName: string,
    country: Countries,
    candidateSlot: 0 | 1,
    requestedEngineSeed: number,
    wrapped: boolean,
): Promise<TrialTrace> => {
    const control = buildMethodV5CloseoutArms().find(({ armId }) => armId === "baseline_control");
    if (!control) throw new Error("Method-v5 baseline control is unavailable");
    const candidateName = `Candidate_${country}_${candidateSlot}`;
    const opponentName = `Opponent_${country}_${candidateSlot}`;
    const candidate = wrapped
        ? createMethodV5Candidate(factory, candidateName, country, control.policy, () => {
            throw new Error("Disabled Method-v5 control emitted policy telemetry");
        })
        : factory.create(candidateName, country);
    const opponent = factory.create(opponentName, country);
    const trace: TrialTrace = { candidate: [], opponent: [] };
    await withSeededOfflineGame(
        cdapi,
        buildSettings(mapName, candidate, opponent, candidateSlot),
        requestedEngineSeed,
        [{ agent: candidate, identity: "candidate" }, { agent: opponent, identity: "baseline" }],
        async (game) => {
            for (let tick = 1; tick <= METHOD_V5_EQUIVALENCE_MAX_TICKS; tick++) {
                if (game.isFinished()) throw new Error(`Method-v5 equivalence game ended at tick ${tick}`);
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
    if (fs.existsSync(outFile)) throw new Error(`Refusing to overwrite Method-v5 equivalence gate ${outFile}`);
    if (!process.env.BASELINE_PACKAGE_ROOT || process.env.REQUIRE_EXTERNAL_BASELINE !== "true") {
        throw new Error("Method-v5 equivalence gate requires the pinned external baseline");
    }
    const mapName = "simple-1v1-no-preview.map";
    if (sha256File(path.join(process.cwd(), "data", mapName)) !== METHOD_V5_EQUIVALENCE_MAP_SHA256) {
        throw new Error("Method-v5 equivalence map bytes drifted");
    }
    const factory = await loadBaselineFactory(path.join(repoRoot, "packages", "chronodivide-bot"));
    const control = buildMethodV5CloseoutArms().find(({ armId }) => armId === "baseline_control");
    if (!control) throw new Error("Method-v5 baseline control is unavailable");
    const rows: Array<Record<string, unknown>> = [];
    await cdapi.init(path.join(process.cwd(), "data"));
    let seedBlockIndex = 0;
    for (const country of Object.values(Countries)) for (const candidateSlot of [0, 1] as const) {
        const requestedEngineSeed = derivePairedEngineSeed(METHOD_V5_EQUIVALENCE_ENGINE_SEED_BASE, seedBlockIndex++);
        const wrapped = await runTrial(factory, mapName, country, candidateSlot, requestedEngineSeed, true);
        const unwrapped = await runTrial(factory, mapName, country, candidateSlot, requestedEngineSeed, false);
        const equal = JSON.stringify(wrapped) === JSON.stringify(unwrapped);
        if (!equal) throw new Error(`Disabled Method-v5 layer drifted for ${country} slot ${candidateSlot}`);
        rows.push({ country, candidateSlot, requestedEngineSeed, snapshotTicks: [300, 600, 900, 1200], wrapped, unwrapped, equal });
    }
    const manifest = createExperimentManifest({
        runId: `method-v6-baseline-equivalence-${process.env.SLURM_JOB_ID ?? "local"}`,
        mixDir: path.join(process.cwd(), "data"),
        maps: [mapName],
        effectiveConfig: {
            purpose: "method-v6-outcome-free-external-baseline-identity",
            countries: Object.values(Countries), reciprocalSlots: [0, 1], maxTicks: METHOD_V5_EQUIVALENCE_MAX_TICKS,
            shortGame: false, endpointAdjudication: false, outcomeInspection: false,
        },
        baseline: factory.descriptor,
        gameSeedBase: METHOD_V5_EQUIVALENCE_ENGINE_SEED_BASE,
    });
    if (
        manifest.scheduler.account !== "pi_jss233" || manifest.source.gitBranch !== "main" ||
        manifest.source.trackedDirty !== false || manifest.software.baseline.kind !== "external-package" ||
        manifest.software.baseline.trackedDirty !== false || rows.length !== 18
    ) throw new Error("Method-v5 equivalence provenance or coverage failed");
    const output = {
        schemaVersion: 1,
        status: "PASS_OUTCOME_FREE_METHOD_V6_EXTERNAL_BASELINE_IDENTITY_GATE",
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
        maxTicks: METHOD_V5_EQUIVALENCE_MAX_TICKS,
        implementationInvariant: "disabled createMethodV5Candidate returns baselineFactory.create without constructing or invoking the closeout strategy",
        rows,
    };
    fs.mkdirSync(path.dirname(outFile), { recursive: true, mode: 0o700 });
    fs.writeFileSync(outFile, JSON.stringify(output, null, 2) + "\n", { flag: "wx", mode: 0o600 });
    console.log(JSON.stringify({ outFile, sha256: sha256File(outFile), status: output.status, gameCount: output.gameCount }));
};

const invoked = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (import.meta.url === invoked) main().catch((error) => { console.error(error); process.exitCode = 1; });
