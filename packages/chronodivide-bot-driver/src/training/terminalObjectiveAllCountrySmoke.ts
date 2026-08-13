import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { ActionsApi, CreateOfflineOpts, GameApi, cdapi } from "@chronodivide/game-api";
import { Countries } from "@supalosa/chronodivide-bot/dist/bot/logic/common/utils.js";
import { InspectableBaselineBot, loadBaselineFactory } from "../benchmark/baselineLoader.js";
import { createExperimentManifest } from "../benchmark/provenance.js";
import { derivePairedEngineSeed, withSeededOfflineGame } from "../benchmark/seededOfflineGame.js";
import { sha256File } from "./methodV5PlanRunner.js";
import { METHOD_V5_EQUIVALENCE_MAP_SHA256 } from "./methodV5BaselineEquivalence.js";
import {
    TerminalObjectiveTelemetry,
    createTerminalObjectiveCandidate,
} from "./terminalObjectiveStrategy.js";
import { buildTerminalObjectiveArms, terminalObjectivePolicySha256 } from "./terminalObjectivePolicy.js";

export const TERMINAL_OBJECTIVE_SMOKE_MAX_TICKS = 2_400 as const;
export const TERMINAL_OBJECTIVE_SMOKE_ENGINE_SEED_BASE = 3_745_000_000 as const;

type Factory = Awaited<ReturnType<typeof loadBaselineFactory>>;

const requiredPath = (name: string): string => {
    const value = process.env[name];
    if (!value) throw new Error(`${name} is required`);
    return path.resolve(value);
};

const suppressQuit = (bot: InspectableBaselineBot): { attempts: number } => {
    const audit = { attempts: 0 };
    const original = bot.onGameStart.bind(bot);
    bot.onGameStart = (game: GameApi): void => {
        original(game);
        if (!bot.lastPlayerActions) throw new Error(`Missing actions for ${bot.name}`);
        Object.defineProperty(bot.lastPlayerActions as ActionsApi, "quitGame", {
            configurable: true,
            writable: true,
            value: (): void => { audit.attempts += 1; },
        });
    };
    return audit;
};

const settings = (
    mapName: string,
    candidate: InspectableBaselineBot,
    baseline: InspectableBaselineBot,
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
): Promise<Record<string, unknown>> => {
    const full = buildTerminalObjectiveArms().find(({ armId }) => armId === "full_sufficient_strike");
    if (!full) throw new Error("Full terminal-objective arm is unavailable");
    const smokePolicy = { ...full.policy, minTick: 0 };
    const telemetry: TerminalObjectiveTelemetry[] = [];
    const candidate = createTerminalObjectiveCandidate(
        factory,
        `Candidate_${country}_${candidateSlot}`,
        country,
        smokePolicy,
        (event) => telemetry.push(event),
    );
    const baseline = factory.create(`Baseline_${country}_${candidateSlot}`, country);
    const candidateQuit = suppressQuit(candidate);
    const baselineQuit = suppressQuit(baseline);
    await withSeededOfflineGame(
        cdapi,
        settings(mapName, candidate, baseline, candidateSlot),
        requestedEngineSeed,
        [{ agent: candidate, identity: "candidate" }, { agent: baseline, identity: "baseline" }],
        async (game) => {
            for (let tick = 1; tick <= TERMINAL_OBJECTIVE_SMOKE_MAX_TICKS; tick += 1) {
                if (game.isFinished()) throw new Error(`All-country smoke ended before tick cap at ${tick}`);
                await game.update();
            }
        },
    );
    if (!telemetry.some(({ event }) => event === "decision" || event === "search_orders")) {
        throw new Error(`Terminal-objective bridge emitted no decision for ${country} slot ${candidateSlot}`);
    }
    if (!candidate.lastGameApi) throw new Error("Candidate game state was not initialized");
    return {
        country,
        candidateSlot,
        requestedEngineSeed,
        policyId: terminalObjectivePolicySha256(smokePolicy),
        maxTicks: TERMINAL_OBJECTIVE_SMOKE_MAX_TICKS,
        telemetryEventTypes: [...new Set(telemetry.map(({ event }) => event))].sort(),
        decisionKinds: [...new Set(telemetry.flatMap(({ decisionKind }) =>
            decisionKind ? [decisionKind] : [],
        ))].sort(),
        telemetryCount: telemetry.length,
        candidateQuitAttempts: candidateQuit.attempts,
        baselineQuitAttempts: baselineQuit.attempts,
        outcomeInspected: false,
    };
};

const main = async (): Promise<void> => {
    const repoRoot = path.resolve(process.cwd(), "..", "..");
    const outFile = requiredPath("OUT_FILE");
    if (fs.existsSync(outFile)) throw new Error(`Refusing to overwrite ${outFile}`);
    if (!process.env.BASELINE_PACKAGE_ROOT || process.env.REQUIRE_EXTERNAL_BASELINE !== "true") {
        throw new Error("Terminal-objective all-country smoke requires the pinned external baseline");
    }
    const mapName = "simple-1v1-no-preview.map";
    if (sha256File(path.join(process.cwd(), "data", mapName)) !== METHOD_V5_EQUIVALENCE_MAP_SHA256) {
        throw new Error("Terminal-objective smoke map bytes drifted");
    }
    const factory = await loadBaselineFactory(path.join(repoRoot, "packages", "chronodivide-bot"));
    const rows: Array<Record<string, unknown>> = [];
    await cdapi.init(path.join(process.cwd(), "data"));
    let index = 0;
    for (const country of Object.values(Countries)) for (const candidateSlot of [0, 1] as const) {
        rows.push(await run(
            factory,
            mapName,
            country,
            candidateSlot,
            derivePairedEngineSeed(TERMINAL_OBJECTIVE_SMOKE_ENGINE_SEED_BASE, index++),
        ));
    }
    const manifest = createExperimentManifest({
        runId: `terminal-objective-smoke-${process.env.SLURM_JOB_ID ?? "local"}`,
        mixDir: path.join(process.cwd(), "data"),
        maps: [mapName],
        effectiveConfig: {
            purpose: "outcome-free-terminal-objective-all-country-live-bridge-smoke",
            countries: Object.values(Countries),
            reciprocalSlots: [0, 1],
            maxTicks: TERMINAL_OBJECTIVE_SMOKE_MAX_TICKS,
            outcomeInspection: false,
        },
        baseline: factory.descriptor,
        gameSeedBase: TERMINAL_OBJECTIVE_SMOKE_ENGINE_SEED_BASE,
    });
    if (
        manifest.scheduler.account !== "pi_jss233" || manifest.source.gitBranch !== "main" ||
        manifest.source.trackedDirty !== false || manifest.software.baseline.kind !== "external-package" ||
        manifest.software.baseline.trackedDirty !== false || rows.length !== 18
    ) throw new Error("Terminal-objective all-country smoke provenance or coverage failed");
    const output = {
        schemaVersion: 1,
        status: "PASS_OUTCOME_FREE_TERMINAL_OBJECTIVE_ALL_COUNTRY_LIVE_BRIDGE_SMOKE",
        generatedAt: new Date().toISOString(),
        passed: true,
        outcomeFree: true,
        sourceGitCommit: manifest.source.gitCommit,
        scheduler: manifest.scheduler,
        externalBaseline: manifest.software.baseline,
        countryCount: Object.values(Countries).length,
        reciprocalSlotCount: 2,
        gameCount: rows.length,
        maxTicks: TERMINAL_OBJECTIVE_SMOKE_MAX_TICKS,
        rows,
    };
    fs.mkdirSync(path.dirname(outFile), { recursive: true, mode: 0o700 });
    fs.writeFileSync(outFile, JSON.stringify(output, null, 2) + "\n", { flag: "wx", mode: 0o600 });
    console.log(JSON.stringify({ outFile, sha256: sha256File(outFile), status: output.status, gameCount: rows.length }));
};

const invoked = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (import.meta.url === invoked) main().catch((error) => { console.error(error); process.exitCode = 1; });
